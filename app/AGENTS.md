# app/

Deployment shells around the FUXA server+client (score 8, distinct packaging domain — nothing else documents how FUXA ships as desktop/headless).

## STRUCTURE

- electron/ — main.js (762L), settings.app.js (95L) + settings.html (254L), project-selection.html (184L), loading.html (53L), package.json, icons/
- headless/ — headless-entry.js (68L)

## WHERE TO LOOK

| Task | Location |
|------|----------|
| Electron lifecycle/IPC | electron/main.js — ipcMain.handle channels; spawns server/main.js as a child process (env userDir + PORT=1881), polls http://localhost:1881 up to 30s, then loadURL |
| App settings | appData fuxa-app/config.json (settings.app.js, settings.html) |
| Splash/pick screens | loading.html (53L, splash while server boots) + project-selection.html (184L) are plain HTML driven by settings.app.js (95L) — no Angular |
| Headless binaries | headless/headless-entry.js — forks server/main.js with userDir=~/fuxa-headless-data; forwards SIGINT/SIGTERM; no HTTP polling |
| Headless bootstrap details | creates ~/fuxa-headless-data if missing (Electron-style); expects the server BUNDLED at app/headless/server/main.js (resolved via __dirname — packaging must place it there); exits 1 if missing; stdio inherit |

## CONVENTIONS

- Commands from app/electron/: `npm start` (electron .), `npm run package` (electron-builder --dir), `npm run dist` (electron-builder).
- Electron pinned at 39.8.10 in app/electron/package.json.
- BrowserWindows load http://localhost:1881 — the bundled server serves the built client; UI and server are one process tree.

## ANTI-PATTERNS

- nodeIntegration:true, contextIsolation:false, sandbox:false are INTENTIONAL (local trusted content) — casual "hardening" can break the app shell.
- Business logic does NOT live here: server behavior → server/, UI → client/. Shells only bootstrap, spawn, and frame.
- No tests; main.js is a 762L hotspot — prefer extracting small modules over growing it.
