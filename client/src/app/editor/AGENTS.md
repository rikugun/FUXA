# client/src/app/editor/

The FUXA draw editor host (score 11, distinct domain: vendored SVG-editor integration). editor.component.ts is 1753L.

## STRUCTURE

13 dialog/panel subdirs: app-settings, card-config, chart-config, client-script-access, editor-views-list, graph-config, layout-property, onboarding-wizard, section-message-dialog, setup, svg-selector, tags-ids-config, view-property — plus the editor.component triad (.ts/.html/.css at dir root) and loose template linkproperty.dialog.html (link properties).

## WHERE TO LOOK

| Task | Location |
|------|----------|
| Editor modes | EditorModeType {SVG, CARDS, MAPS} in editor.component |
| SVG-editor access | ~10 `declare var` globals (Gauge, mysvgcanvas, mysvgeditor, ...) — the vendored svg-editor from assets/lib (see client/AGENTS.md) |
| Tag-id mapping | ../device-adapter/ — DeviceAdapterService (adapter↔device tag ids) |
| Asset config dialogs | chart-config/, graph-config/, card-config/, tags-ids-config/, view-property/ |
| Link properties | linkproperty.dialog.html (loose template, not a component dir) |
| View management | editor-views-list/ (create/organize views); onboarding-wizard/ (first-run flow) |

## CONVENTIONS

- The SVG editor is a global-script library: never import it; canvas operations go through the declared globals' API.
- Dialogs export XxxData interfaces (same pattern as device/).
- Mode-specific toolbars/canvases toggle by EditorModeType, not by routes.

## ANTI-PATTERNS

- Don't reach into svgcanvas internals from feature code outside editor/.
- SVG-editor DOM mutations bypass Angular change detection entirely — don't assume templates react.
- 1753L hotspot: extend via the subdialogs, not by growing editor.component.ts.
