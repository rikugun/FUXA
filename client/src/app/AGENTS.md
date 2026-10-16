# client/src/app/

Single-NgModule app shell + ~35 feature folders (score 15, distinct domain: app-shell map). app.module.ts (516L) manually declares ~100 components — THE registration hotspot.

## STRUCTURE

- Shell: app.module.ts, app.routing.ts, app.component, material.module.ts, auth.guard.ts, header/, sidenav/, home/ (home.component 604L), login/
- Shared underscore layers (imported app-wide via long relative paths): _models/ (plain TS models; hmi.ts = most-imported file in repo, 91 imports), _services/ (16 root-provided @Injectable services incl. ProjectService 1543L), _helpers/ (Utils, 55 statics), _directives/, _config/
- Vendored-in-tree forks (upstream-sync candidates, not house code): gui-helpers/daterangepicker, gui-helpers/mat-select-search, gui-helpers/ngx-uplot (global uPlot), framework/ngx-touch-keyboard
- Editor surface: editor/ (SVG/cards/maps draw editor), device/ (protocol tag editors), device-adapter/ (tag-id mapping)
- Runtime surface: fuxa-view/ (fuxa-view.component 1286L — live view engine used by home/cards-view/maps), gauges/ (widget framework), alarms/, logs-view/, notifications/
- Feature folders: apikeys, ar (AR markers+QR), cards-view (gridster), help, iframe, integrations, lab, language, login, maps (leaflet), paginator, plugins, reports, resources, scripts (CodeMirror), tester, users, view

## WHERE TO LOOK

| Task | Location |
|------|----------|
| Add component | declare in app.module.ts (no standalone conversion) |
| Add route | app.routing.ts — home routes have canActivate AuthGuard COMMENTED OUT intentionally |
| Dialog payload type | each dialog dir exports XxxData interface |
| Realtime device data | IoEventTypes enum in _services/hmi.service |
| Confirm dialog | gui-helpers/confirm-dialog (standard app-wide) |
| Script mode warning | scripts/script.service:126 console.warn TODO (client mode ignores params) |

## CONVENTIONS

- Folders kebab-case, triads *.component.{ts,html,scss}; selectors app-* (vendored forks keep ngx-*/bare prefixes under eslint-disable headers).
- Model files are single lowercase words (_models/hmi.ts, never hmi.model.ts); no tsconfig path aliases — deep relative imports (up to ../../../../../) are normal.
- Enum values are i18n string keys (ChartLegendMode.always = 'chart.legend-always').
- 4-space indent; @ViewChild(x, {static:false}); RxJS teardown mixes destroy$+takeUntil with stored subscription fields.

## ANTI-PATTERNS

- Duplicate exported symbol `Alarm` in BOTH _models/alarm.ts and _models/hmi.ts — import from the exact intended module.
- paginator/paginator-intl.ts:58 typo key 'Ptable.property-paginator-prev-page' (leading P) — known bug, unguarded by tests.
- Don't refactor underscore layers toward Angular style-guide layout — the deviation is intentional and load-bearing.
- Most components use default change detection (only 2 OnPush in device/) — don't assume OnPush.
