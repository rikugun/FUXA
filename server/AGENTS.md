# server/ — fuxa-server (runtime + API process)

Score ~17 (own package.json/tsconfig, entry main.js, high centrality). CommonJS JavaScript, no TypeScript sources except one file (see CONVENTIONS). Runs standalone: `npm start` → `node main.js`, port 1881 default, `process.title = 'FUXA'`.

## STRUCTURE
```
server/
├── main.js               # entry: Express bootstrap, settings merge, static routes, CORS, signal handling (620L, highest-change-risk)
├── fuxa.js               # facade: init/start/stop wiring runtime + api
├── settings.default.js   # default settings; copied to _appdata/settings.js on first run
├── paths.js / envParams.js / project.default.json / project.demo.fuxap
├── runtime/              # engine: devices, alarms, jobs, scheduler, storage, scripts, users (own AGENTS.md)
├── api/                  # REST API + auth (own AGENTS.md)
├── integrations/node-red/index.js  # optional Node-RED host; loads its own copy of the fuxa nodes (see node-red/AGENTS.md)
├── test/                 # mocha+chai+sinon; authorization/ = security regression net (9 files, ~1400L)
├── docs/openapi.yaml     # OpenAPI 3.0.3 for all /api/* — update alongside API changes
└── dist/reports.service.js  # tsc output of api/reports/reports.service.ts; required at runtime via ../dist path
```

## WHERE TO LOOK
| Task | Location | Notes |
|---|---|---|
| Add user-facing setting | settings.default.js + main.js `mysettings.json` merge | two-place change; merge is field-by-field `if (mysettings.x)` |
| New REST endpoint | api/&lt;module&gt;/index.js + docs/openapi.yaml + test | auth/limiter changes: expect a `*Security.test.js` in test/authorization/ |
| Node-RED integration | integrations/node-red/index.js | mounts editor at /nodered/, guards via cookie/API key; loads embedded nodes copy via `nodesDir` |
| Test a change | `npm test` (mocha --recursive) | tests use real `app.listen(0)` + raw http, no supertest |
| Debug boot issues | main.js `init-runtime-ok` failsafe | 60s unconditional timeout masks slow runtime init |

## CONVENTIONS
- Data dirs are underscore-prefixed at CWD (not repo): `_appdata` (settings.js + mysettings.json), `_db`, `_pkg`, `_reports`, `_logs`, `_images`, `_widgets`, `_webcam_snapshots`. Relocatable via `-u/--userDir` or `process.env.userDir`.
- Settings layering: `_appdata/settings.js` (code, version-keyed deep merge) then `_appdata/mysettings.json` (JSON, field merge in main.js).
- Client dist resolution: prefers `../client/dist` (monorepo), falls back to `./dist` (packaged).
- Optional heavy deps (swagger, Node-RED) load lazily via try/require and degrade gracefully — never block startup.
- No ES6 classes anywhere in server code: closure constructors `function X() { this.m = fn }` or singleton `var x = module.exports = {}`. Match it.
- Only TS file: `api/reports/reports.service.ts` → compiled to `server/dist/reports.service.js`, required from there. `npm run build` (tsc) exists for it.
- Event-driven decoupling: subsystems talk via injected `events` emitter + `IoEventTypes` strings (runtime/events.js), never direct imports.

## ANTI-PATTERNS
- Do NOT hand-edit `package-lock.json` or `dist/` (generated).
- Do NOT propagate the `"Tocken Expired"` log typo found across api/ modules.
- Do NOT return `err.stack` to clients (reports.service.ts does — known leak, don't copy).
- Never run secure mode with empty/static JWT secret; main.js generates a random one if missing — keep that.
- `/snapshots` must stay JWT-guarded with `Cache-Control: no-store`.

## COMMANDS
```bash
cd server
npm install          # native deps (sqlite3, serialport, fontkit, pdfmake) — environment-sensitive
npm start            # node main.js; flags: -p/--port, -u/--userDir, -?/--help
npm test             # mocha --recursive --timeout 10000
npm run build        # tsc → dist/ (reports.service.ts only)
```
