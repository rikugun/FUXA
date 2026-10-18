# client/

Angular workspace: the FUXA web HMI client (draw editor + runtime views). NgModule-based, no standalone components, no libraries — one app.

## WHERE TO LOOK

| Task | Location |
|------|----------|
| Dev server | `npm start` / `npm run demo` (`-c demo`) / `npm run client` (`-c client`) — always from `client/`; there is NO root package.json |
| Build | `npm run build` (ng build; angular.json configs: production, demo, demodebug, client, clientdebug) |
| Lint | `npm run lint` — eslint; many @angular-eslint rules disabled, unused-imports stays ERROR |
| Dev proxy | proxy.conf.json: /api, /socket.io, /resources, /snapshots, /_images, /_resources → 127.0.0.1:1881 (server must be running) |
| Environments | src/environments/* swapped by -c demo/client (`serverEnabled`, `type`) |
| Vendor globals | src/index.html loads assets/lib scripts (jQuery, svg-editor, svg.js, Raphael, uPlot) BEFORE Angular bootstraps |
| i18n | src/assets/i18n/ — flat dot-namespaced keys; en.json is master (~1887 keys): append every new UI string there first |
| Global styles | src/styles.css (1271L); material.module.ts = Angular Material barrel |

## CONVENTIONS

- All commands run from `client/`, never repo root.
- tsconfig: target ES2022, NO strict mode, fullTemplateTypeCheck without strictTemplates; file is JSONC (has comments).
- Locale files: 13; `ua` (non-ISO Ukrainian) and zh-cn/zh-tw region suffixes are intentional filenames; coverage drift is real (pt/tr/ua ~34% of en keys).
- Validate locales: `jq empty src/assets/i18n/*.json`.
- src/assets/lib/ is VENDORED (svg-editor, jQuery, Raphael, uPlot...) — upstream code, never refactor in place or document internals.

## ANTI-PATTERNS

- Do NOT reintroduce `declare var svgEditor/$` in src/typings.d.ts — commented out on purpose.
- Zero unit tests live in client/ (repo's only tests are server/ mocha). `ng test` target exists but has no specs — don't assume it gates anything.
- Don't hardcode server URLs; go through the proxy paths (/api, /socket.io...).
