# server/runtime/ — FUXA runtime engine

Score ~20 (42 files ~11k LOC, 12 subdirs, high symbol density, only consumer is fuxa.js/main.js). All CommonJS, no classes (see server/AGENTS.md for stack-wide rules).

## STRUCTURE
```
runtime/
├── index.js            # `runtime` singleton: init chain, all socket.io handlers (759L)
├── events.js           # events.create() + IoEventTypes string enum — the decoupling backbone
├── utils.js / logger.js
├── project/            # project CRUD + views (index.js 1240L) + prjstorage
├── devices/            # device manager + 17 protocol drivers (own AGENTS.md)
├── scheduler/          # scheduler-service.js 1609L (node-schedule) + storage
├── storage/            # daqstorage dispatch + backends: sqlite/, influxdb/, questdb/, tdengine/ + calculator
├── alarms/ · notificator/ (nodemailer) · jobs/ (reports, image-generator, fonts) · scripts/ (msm.js) · users/ · apikeys/ · plugins/ (npm-runtime-service)
```

## WHERE TO LOOK
| Task | Location | Notes |
|---|---|---|
| Subsystem init order | index.js `init()` | sequential promise chain: daqstorage → schedulerStorage → schedulerService → plugins → apiKeys → users → project → devices — order matters |
| Add cross-module signal | events.js IoEventTypes | dash- and colon-separated names mixed (`device-status` vs `scheduler:updated`) |
| DAQ history queries | storage/daqstorage.js | dispatches to backend by settings; each backend exports `create()` |
| User scripts | scripts/msm.js | compiles frontend code strings via `new module.constructor()`; `console` replaced to emit `script-console` events |
| Reports / PDF | jobs/report.js + jobs/fonts/ | canvas-to-image unsupported on node (TODO at :226/:234) |
| Device protocol work | devices/AGENTS.md | |

## CONVENTIONS
- Pattern per domain: `index.js` facade manager + `<x>storage.js` persistence (`init(settings, log)` / `close()`).
- Factory split: stateful managers expose `create()` (alarms, jobs, notificator, scripts, storage backends); stateless singletons expose `init(...)`.
- Cross-module communication only via injected `events` emitter — direct requires between domains are the exception (plugins + project reach `../devices/device`).
- Mixed async: `.then()` chains (bluebird-era) dominate; new code may use async/await — follow the file's existing style.
- camelCase filenames; known exception `apiKeysStorage.js`.

## ANTI-PATTERNS
- Don't add classes, ES modules, or TypeScript here — sources are CommonJS JS with closure/singletons throughout.
- Don't rename `isWoking` (devices manager export, pre-existing typo) — client-visible API surface.
- events.js IoEventTypes changes ripple into devices/ and client/ — grep both before editing.
- Known stray `console.log` debug lines (index.js:545, notificator/index.js:331) — don't copy the pattern.
- daqstorage.js has a commented `require('./daqnode')` referencing a nonexistent module — dead, leave it.

## HOTSPOTS
>500L: scheduler/scheduler-service.js (1609), project/index.js (1240), index.js (759), alarms/index.js (714), storage/sqlite/index.js (699). Complexity concentrates in scheduler (scheduling + triggers + notifications) and sqlite backend (retention).
