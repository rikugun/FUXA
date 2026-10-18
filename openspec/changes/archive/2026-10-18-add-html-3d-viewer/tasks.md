# Tasks

## 1. 依赖与脚手架

- [x] 1.1 在 `client/package.json` 添加 `three` 与 `@types/three` 并安装，验证安装后 `ng build` 成功且产物包含 three 模块
- [x] 1.2 创建 `client/src/app/gauges/controls/html-3d/` 组件骨架（继承 `GaugeBaseComponent`，静态成员 `TypeTag='svg-ext-own_ctrl-3d'`、`LabelTag='Html3d'`、`prefixD='D-OXC_'`、`getDialogType()` 返回新枚举 `GaugeDialogType.ThreeD`），验证 `ng build` 通过

## 2. 编辑器接入

- [x] 2.1 在 `gauges.component.ts` 的 `Gauges` 数组注册 `Html3dComponent`，并在 `initInEditor()` 加对应分支（仅刷新占位、不启动渲染），验证：编辑器中放置 3D 控件后保存/重开画面不报错
- [x] 2.2 在 `editor.component.html` 工具栏仿 `own_ctrl-video` 按钮添加 3D 绘制按钮（material icon + `setMode('own_ctrl-3d')`），验证：编辑器中点击后可在画布拖拽绘制出占位框
- [x] 2.3 在 `gauge-property.component.ts` 的 `GaugeDialogType` 枚举新增 `ThreeD`，并仿 Iframe/Video 分支新增 3D 属性面板分支（模型地址、自动旋转、背景色、相机 FOV、tag 驱动映射），验证：双击 3D 控件能打开属性对话框，保存后 `ga.property` 含新字段
- [x] 2.4 在 13 个 `client/src/assets/i18n/*.json` 添加 `editor.controls-3d` 等新文案键（en/zh-cn 翻译，其余语言同 en），验证：界面语言切换后 tooltip/占位/属性面板文案均正常显示

## 3. 运行时渲染

- [x] 3.1 实现 `initElement(gs, isView)` 双态逻辑：编辑器态只写占位 DOM；运行态动态 import three（lazy chunk），创建 `WebGLRenderer` + `PerspectiveCamera` + `GLTFLoader`，加载 `EndPointApi.resolveUrl(property.options.address)` 指向的 glTF/GLB，验证：view 态画面渲染出模型且尺寸自适应控件区域
- [x] 3.2 实现 OrbitControls 交互（旋转/缩放/平移）与可配置自动旋转（`property.options.autoRotate`），验证：view 态可用鼠标旋转/缩放模型，autoRotate 开启时模型自转
- [x] 3.3 实现错误降级：模型加载失败/超时、地址为空、WebGL 不可用/上下文耗尽（模块级计数器 ≥8 即降级）时渲染统一错误占位（图标 + i18n 文案），验证：故意配错地址/禁用 WebGL 后画面其余控件不受影响
- [x] 3.4 实现 WebGL 资源释放：静态 `destroy()`（`renderer.dispose()` + `forceContextLoss()` + 场景 graph 逐节点 dispose + 取消 rAF）并接入 fuxa-view 销毁路径，验证：反复切换画面 10 次后浏览器 WebGL 上下文计数不增长
- [x] 3.5 实现 `processValue` 与 tag 驱动映射（rotate-speed / part-visibility / part-color，纯函数映射 + 渲染循环按帧应用），验证：模拟 tag 值变化时旋转速度/部件可见性/颜色在下一帧生效

## 4. 集成验证

- [x] 4.1 端到端手测：用仓库内测试资产 `test-assets/3d/Box.glb`（最小几何）与 `test-assets/3d/Duck.glb`（含纹理）上传 /resources → 配置控件 → view 态渲染 → tag 变化驱动旋转/可见性/颜色 → 切换画面释放资源，验证全链路无回归（其余控件类型正常）
- [x] 4.2 `ng build --configuration production` 通过且无新增 build warning，验证 bundle 增量 ≤ ~800KB 且编辑器模式不加载 three chunk（lazy 动态 import 生效）
