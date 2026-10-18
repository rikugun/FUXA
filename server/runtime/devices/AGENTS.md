# server/runtime/devices/ — device manager + protocol drivers

Score ~18 (20 dirs, ~9.3k LOC, 17 drivers, high fan-in from runtime + node-red). Driver plugins for PLCs/field protocols; manager is the device CRUD + polling hub.

## STRUCTURE
```
devices/
├── index.js            # manager: init/start/stop, load/update devices, getTagValue/setTagValue, browse… (577L)
├── device.js           # Device factory + DeviceEnum type map + loadPlugin dispatch (626L)
├── device-utils.js     # tagDaqToSave / tagValueCompose / tagRawCalculator — used by 12–14 drivers each
├── template/index.js   # canonical driver skeleton — the contract doc; read before writing a driver
└── <driver>/index.js   # adsclient bacnet ethernetip fuxaserver gpio httprequest melsec modbus(+datatypes)
                        #   mqtt odbc omron-ethernetip opcua redis s7(+datatypes) webcam
```

## WHERE TO LOOK
| Task | Location | Notes |
|---|---|---|
| New device type | DeviceEnum (device.js:567) + loadPlugin if/else (device.js:526) + Device constructor dispatch + new dir | 4-place change, must stay in sync |
| Driver contract | template/index.js + device.js:49-51 | `connect disconnect isConnected polling init load getValue(s) getStatus setValue bindAddDaq getTagProperty` (+ optional browse/readNodeAttribute/…) |
| Tag scaling / dead-band | device-utils.js | shared by all drivers |
| Modbus / S7 data encodings | modbus/datatypes.js, s7/datatypes.js | Datatypes map vs createDatatypes factory — different shapes |
| Tests touching drivers | server/test/devices/ | modbusDatatypes.test.js, omronEthernetip.test.js |

## CONVENTIONS
- **Optional-dep lazy require**: protocol SDKs are NOT in server/package.json. Each driver: `try { X = require(sdk) } catch {}` + fallback `manager.require(sdk)` inside `create()`; both fail → null → manager logs "plugin is missing!" and keeps running. Never add these SDKs as hard deps.
- Drivers are closure constructors `function XClient(data, logger, events, manager, runtime) { this.method = … }` — no classes.
- Events contract: `events.emit('device-status:changed', {id, status})`, `device-value:changed` `{id, values}`; status strings `connect-ok / connect-error / connect-off / connect-busy`.
- `logger.error(msg, true)` — 2nd arg surfaces the message to the frontend.
- ModbusRTU devices sharing a serial `property.address` are grouped in manager `sharedDevices` at load().
- Driver loading uses `loadPlugin` (also called externally by runtime/plugins/index.js:162).

## ANTI-PATTERNS
- Capability guards (`reject('Browse not supported!')` etc.) are intentional — devices lacking a feature must keep rejecting, not throwing.
- `Don't work if PLC will disconnect` (modbus:418, s7:247) — known polling-reconnect limitation; don't assume reconnection works.
- Template type is commented out in DeviceEnum — template/index.js is a doc skeleton, not a live device.
- `isWoking` (sic) in manager exports — keep as-is, client-visible.
- Linear scans in getTagId/getDeviceIdFromTag over all devices per call — known cost, don't add hot-path callers.

## HOTSPOTS
>500L: redis 969, modbus 887, opcua 824, bacnet 783, s7 710, device.js 626, mqtt 617, manager index.js 577. The if/else type dispatch in device.js (constructor + loadPlugin) is the sync-risk concentration.
