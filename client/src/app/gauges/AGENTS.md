# client/src/app/gauges/

Widget/gauge framework (score 15, distinct domain): registry + SVG shapes + interactive HTML controls + property dialogs. Highest-complexity directory in client/.

## STRUCTURE

- gauges.component.ts — GaugesManager (an @Injectable despite the .component name): static `Gauges` array = THE registry of 22+ gauge classes; gauge identity = SVG attr `type`.startsWith(TypeTag)
- gauge-base/ — GaugeBaseComponent base class with static helpers (bitmask ops, blink timers)
- gauge-property/ — 43 files of flex-* property dialogs (flex-device-tag, flex-auth, flex-event, flex-action, flex-head...) opened by the editor
- shapes/ — SVG-drawn widgets (semaphore, progress...)
- controls/ — 19 interactive controls: html-button/switch/select/input/image/iframe/video/bag/chart/graph/scheduler/table, panel, pipe, slider, value, html-3d (NEW, see below)

## WHERE TO LOOK

| Task | Location |
|------|----------|
| Add a control | new dir under controls/ implementing the static contract, then register in GaugesManager's static Gauges array |
| Static contract | TypeTag, LabelTag, prefixD, getSignals, getDialogType, initElement(gaugeSettings, isView), processValue, detectChange |
| Property dialog | gauge-property/ (dialog component + XxxData payload) |
| Locate widget DOM | prefixD prefix (D-HXC_/D-OXC_) via Utils.searchTreeStartWith |

## CONVENTIONS

- NO @Input()/@Output() — controls are plain classes with static methods; DOM via document.getElementById + `declare var SVG/Raphael` globals.
- Runtime state lives on static fields (PanelComponent.hmi, gaugeStatus.actionRef).
- initElement(gaugeSettings, isView): editor mode (isView=false) renders a placeholder only; view mode initializes for real — implement both paths.
- Wrapper pattern (html-graph/html-scheduler/html-table): tiny static wrapper finds the DOM node, creates the real component via deprecated ComponentFactoryResolver.
- html-3d (branch feat/html-3d-viewer): three.js lazy-imported chunk (import('three') + OrbitControls + GLTFLoader); WebGL fail-counter with limit 8 then permanent placeholder; property dialog three-d-property/; actionTypes rotate-speed/part-visibility/part-color.

## ANTI-PATTERNS

- Don't "modernize" controls with Angular bindings — the SVG-editor integration requires the static contract.
- Empty catch blocks in GaugesManager are intentional: a gauge must never break the whole view.
- html-scheduler (2202L): ALWAYS use server-provided active state (L1421); ViewEncapsulation.None is deliberate.
- pipe/ (446L) uses leak-prone timers — audit before extending it.
