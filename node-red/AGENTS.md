# node-red/ — FUXA Node-RED node set

Score ~14 (40 files, 19 nodes × js+html pairs, distinct domain: publishable npm package, dual-copy gotcha). Plain ES5 JavaScript.

## STRUCTURE
```
node-red/
└── node-red-contrib-fuxa/   # npm package (v1.0.0, main index.js, 19 nodes in package.json manifest)
    ├── index.js
    └── nodes/               # 19 pairs: fuxa-<name>.js (runtime) + .html (editor UI)
```

Nodes: get-tag · set-tag · get-tag-id · get-tag-daq-settings · set-tag-daq-settings · get-historical-tags · get-daq · get-device · get-device-property · get-alarms · get-history-alarms · ack-alarm · execute-script · emit-event · open-card · set-view · send-message · enable-device · (see nodes/ for full list)

## WHERE TO LOOK
| Task | Location | Notes |
|---|---|---|
| New node | nodes/fuxa-&lt;name&gt;.js + .html + package.json `node-red.nodes` manifest (3 places) | register with `RED.nodes.registerType("<kebab-name>", Ctor)` |
| How nodes reach the runtime | each .js: `this.context().global.get('fuxa')` | injected by server/integrations/node-red/index.js (getTag/setTag/getDaq/getTagId/getHistoricalTags/runScript…) |
| Editor tag datalists | .html files | fetch `/nodered/fuxa/devices` (devices/scripts/views/alarms endpoints in the integration host) |
| The OTHER copy | server/integrations/node-red/node-red-contrib-fuxa/ | **NOT a symlink** — 26 of 38 files differ from this copy; the server loads THAT copy via `nodesDir` |

## CONVENTIONS
- ES5 factory style, no arrow functions, no classes: `function(RED){ function XNode(config){ … } RED.nodes.registerType(...) }`.
- Each runtime .js exports a `function(RED)` registration hook.
- Editor .html pairs with the .js — they ship together; update both for any node change.

## ANTI-PATTERNS
- NEVER edit one copy and assume both are updated — root `node-red/` copy and `server/integrations/node-red/` copy have drifted (12 identical, 26 differing files, verified by diff). The server runs the integration copy; the root copy is the publishable package source.
- No tests exist (`"test": echo error`) — don't assume coverage.
- Don't add ES6+ syntax to node .js files — Node-RED runtime compatibility is ES5-first by convention here.

## NOTES
- The integration host (`server/integrations/node-red/index.js`, 297L) exposes the `fuxa` global and optional sandboxed modules (fs, http, sqlite3, serialport…) to flows; `nodeRedUnsafeModules` setting gates child_process/net — enabling them exposes flows to system modules.
- Docs: docs/HowTo-Node-Red.md (600L) is the user-facing guide.
