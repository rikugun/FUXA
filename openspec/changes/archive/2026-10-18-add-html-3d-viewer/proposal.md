# Proposal

## Why

FUXA 的 HMI 画面目前只能呈现 2D SVG 图形，而工业场景（泵、机械臂、产线设备） increasingly 需要 3D 模型可视化并受实时数据驱动。FUXA 现有控件系统（`svg-ext-own_ctrl-*` 类型 + 运行时 DOM 注入）已经承载 iframe/video/chart(canvas) 等任意 HTML 控件，three.js 的 WebGL canvas 可沿用同一机制，无需改动预构建的 fuxa-editor.min.js。

## What Changes

- 新增 `html-3d` 控件组件（`TypeTag='svg-ext-own_ctrl-3d'`，id 前缀 `D-OXC_`），`initElement()` 在控件容器内创建 `<canvas>` 并用 three.js `WebGLRenderer` 渲染 glTF/GLB 模型。
- 在 `gauges.component.ts` 注册新控件，并在 editor 工具栏新增绘制按钮（`setMode('own_ctrl-3d')`）。
- 新增控件属性对话框（gauge-property）：模型 URL、自动旋转、背景色、相机视野等。
- 支持现有 tag 绑定机制：`processValue` 数值可驱动 3D 行为（如按值旋转/切换部件可见性/状态着色）。
- `client/package.json` 新增 `three` 依赖（含 `@types/three`）。
- 模型资产经现有 `POST /api/upload` 上传，由 `/resources/` 静态目录托管（无服务端改动）。

不改动 fuxa-editor.min.js、svg.js 运行时、服务端 API —— 全部改动位于 `client/src/app` 与依赖清单。

## Capabilities

### New Capabilities

- `hmi-3d-viewer`: HMI 画面中 3D 模型控件的绘制、运行时渲染与数据驱动行为 —— 涵盖控件创建（编辑器绘制占位）、属性配置（模型来源与渲染选项）、运行时 three.js 渲染生命周期、tag 值驱动的 3D 响应。

### Modified Capabilities

（无 —— 项目尚无既有 specs，此为首个 spec 化能力。）

## Impact

- **代码**：
  - `client/src/app/gauges/controls/html-3d/`（新目录：组件 + 属性面板）
  - `client/src/app/gauges/gauges.component.ts`（控件注册清单）
  - `client/src/app/gauges/gauge-property/`（属性对话框注册）
  - `client/src/app/editor/editor.component.html`（工具栏按钮）+ 翻译 json 文案
- **依赖**：`client/package.json` 新增 `three`、`@types/three`（约 ~600KB tree-shaken 产物增量）。
- **系统**：无服务端改动；资产托管复用 `/api/upload` 与 `/resources` 静态服务。
- **已知约束**（design 阶段细化）：浏览器 WebGL context 每页约 8–16 个上限；panzoom 缩放下 canvas 位图化会模糊；编辑器（非 view）态显示占位而非启动渲染循环。
