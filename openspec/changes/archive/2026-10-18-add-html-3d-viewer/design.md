# Design

## Context

FUXA 客户端已有一套 DOM-overlay 控件系统（gauges）：每个控件是一个 Angular 组件，以静态成员（`TypeTag`/`LabelTag`/`prefixD`/`getDialogType()`/`initElement()`/`processValue()`）自描述，由 `gauges.component.ts` 的 `GaugesManager` 统一注册分发（`Gauges`/`GaugeWithActions`/`initInEditor` 分支）。视频控件（`svg-ext-own_ctrl-video`）是该模式的标准样板：`initElement()` 在 SVG 元素内注入 HTML 容器与 `<video>`，运行时 `processValue()` 响应变量。`fuxa-editor.min.js` 为预构建产物，不可改动。

proposal.md 中的 B 方案即基于此模式新增一个 `html-3d` 控件。备选路线（在探索阶段已否决）：(a) foreignObject 内嵌 HTML —— min.js 内部对该路径有硬编码处理，风险高；(c) iframe 指向独立 3D 页 —— 域名/端口耦合、无法参与 tag 绑定。

## Goals / Non-Goals

**Goals:**

- 编辑器可绘制 3D 控件、配置模型地址/渲染选项/tag 驱动，全部复用既有属性对话框与上传机制
- 运行视图以 three.js 渲染 glTF/GLB，支持 OrbitControls 交互与自动旋转
- tag 值实时驱动旋转速度、部件可见性、部件颜色
- 切换视图时彻底释放 WebGL 资源，可承受多次往返切换

**Non-Goals:**

- 不改动 `fuxa-editor.min.js`、`svg.js` 运行时、服务端代码
- 不支持 DRACO/KTX2 等压缩纹理模型（glTF/GLB 基础格式即可）
- 不做模型动画时间轴编辑器（播放 glTF 内嵌动画为 P2）
- 不支持同一个画面里超过 ~8 个并发 WebGL 控件（浏览器上下文上限），超出时按序降级为错误占位
- 不做编辑器内的实时 3D 预览（编辑器只显示占位框）

## Decisions

### D1. 控件身份与注册方式 —— 复刻 html-video 的静态成员模式

新组件 `Html3dComponent`（`TypeTag='svg-ext-own_ctrl-3d'`，`LabelTag='Html3d'`，`prefixD='D-OXC_'`），继承 `GaugeBaseComponent`，静态成员 `getDialogType()` 返回新增枚举值 `GaugeDialogType.ThreeD`。注册点：

- `gauges.component.ts`：`Gauges` 数组 + `initInEditor()` 分支（仅刷新占位，不启动渲染）
- `GaugeWithActions`（若提供 `getActions`，支持 start/stop auto-rotate 等动作）
- editor 工具栏 `editor.component.html`：仿 `own_ctrl-video` 按钮加 `own_ctrl-3d` 按钮 + `setMode('own_ctrl-3d')`
- `GaugeDialogType` 枚举新增 `ThreeD`；gauge-property 按现有 Iframe/Video 分支模式新增 3D 分支（模型地址、自动旋转、背景色、相机 FOV、tag 驱动映射）
- 翻译：13 个 `assets/i18n/*.json` 增加 `editor.controls-3d` 等键

**为何不用 iframe 路线**：iframe 需要 `/resources` 之外的额外路由与跨窗口通信驱动 tag，B 方案在本进程内直接读 `GaugesManager` 分发的变量，链路短且与 chart.js（canvas DOM overlay）先例一致。

### D2. 渲染生命周期 —— view 态启动、离开即销毁

`initElement(gs, isView)` 双态语义（与 html-video 相同签名）：

- **编辑器态（isView=false）**：只写占位 DOM（图标 + 控件名），绝不创建 `WebGLRenderer`
- **运行态（isView=true）**：创建 canvas + `WebGLRenderer` + `GLTFLoader`，加载模型，`requestAnimationFrame` 渲染循环
- **销毁**：`static destroy(gaugeSettings)` 释放 renderer（`dispose()` + `forceContextLoss()`）、场景 graph 遍历 `dispose()` 几何体/材质/纹理，取消 rAF。挂在 `fuxa-view` 组件销毁路径上（gauges map 清理处）

**替代方案**：单例 renderer 共享多控件 —— 复杂度高（scissor test 多视口）且与既有控件生命周期模型不符，拒绝。

### D2.1 控件尺寸变化（初始挂载后）同步

gauges 控件挂载后，min.js 侧只设置初始 width/height；后续控件框被拖拽缩放时，min.js 通过 MutationObserver 监听 SVG foreignObject 尺寸属性变化并回写 DOM 容器（已有实现，见 min.js 源码 16 行 mysvgcanvas 初始化区）。3D 控件沿用同一机制：**ResizeObserver** 监听自身容器，`renderer.setSize()` + `camera.aspect` 更新。无需新增跨层通信。

### D2.2 WebGL 上下文数量防御

浏览器单页 WebGL 上下文上限约 8–16 个。防御：

1. 模块级计数器：创建 renderer 前检查已激活数量，≥8 时该控件降级为错误占位（与 spec "WebGL 不可用降级" 场景一致）
2. `forceContextLoss()` 确保切换视图后上下文真正归还
3. 组件自身再做 `WebGLRenderer` 创建 try/catch —— 异常同样走错误占位

### D3. 模型加载与资产托管 —— 复用 /resources 上传托管

模型经既有 `POST /api/upload` 上传（main.js:246,413），由 `/resources/` 静态服务托管。控件属性存相对地址（如 `/resources/robot.glb`），运行时 `EndPointApi.resolveUrl()` 解析为绝对地址（与 html-video 的 `resolveUrl` 用法一致）。GLTFLoader 解析失败（缺失/格式错）→ 错误占位。

**为何不新建 /models 目录或路由**：上传/托管链路已存在且被视频/图片控件验证，零服务端改动。

### D4. tag 值驱动 —— processValue + 声明式映射

`static processValue(ga, svgele, sig)` 接收 `GaugesManager` 分发的变量（与 html-video 相同入口）。属性结构（存在 `ga.property`）：

```ts
property: {
  variableId: string;            // 主绑定变量
  options: { address, autoRotate, bgColor, fov, camera: 'perspective'|'iso' }
  actions: [{ variableId, action: 'rotate-speed'|'part-visibility'|'part-color', part?: string,
              mappings: [{ min, max, value?, color?, visible? }] }]
}
```

映射评估为纯函数：每次 `processValue` 将原始值映射为目标参数写入渲染控制器；渲染循环按帧采样应用，天然合帧（多个变量同帧到达不会多次重建场景）。

**为何不用 zone.js 轮询**：既有架构事件驱动（`hmiService.onVariableChanged` → GaugesManager → processValue），无需引入轮询。

### D5. 依赖引入 —— three + @types/three

`client/package.json` 增加 `three` 与 `@types/three`（devDependencies）。tree-shaken 导入（`import * as THREE from 'three'` 或具名导入 + `three/examples/jsm/loaders/GLTFLoader`、`three/examples/jsm/controls/OrbitControls`）。Angular CLI 构建按需打包，预计主 chunk 增量 ~600KB min（glTF loader + OrbitControls + core）。

**为何不用 iframe 指向 CDN three.js**：见 D1 iframe 否决理由，另加离线工业环境无法访问 CDN。

### D6. 降级与错误占位 —— 统一 HTML 占位组件

所有失败路径（模型加载失败、WebGL 不可用/耗尽、地址为空未配置）渲染同一个占位 `<div>`（图标 + 消息），文案进 i18n。占位样式与既有控件错误提示一致。

## Risks / Trade-offs

- **[浏览器 WebGL 上下文上限]** → 模块级计数器 + 超限降级占位（D2.2）；spec 已将 ">8 并发"列为 Non-Goal
- **[three.js 体积 ~600KB]** → 仅导入用到的模块；懒加载：three 主模块走 Angular lazy chunk（动态 import），编辑器态完全不动 3D 代码
- **[panzoom 缩放导致 canvas 位图模糊]** → view 态渲染分辨率按 `devicePixelRatio` 补偿（renderer.setPixelRatio）
- **[大模型内存占用]** → 离开视图即全量 dispose（D2）；加载超时（如 30s）视为失败走错误占位
30s）视为失败走错误占位
