# client/src/app/device/

Device + tag configuration UI (score 16 >15): 67 files, ~8.2k LOC, one tag-property editor per protocol.

## STRUCTURE

- device.component.ts — host of device-list + device-map; device config import/export
- device-list/, device-map/ (555L), device-property/ (611L template: protocol-conditional forms)
- topic-property/ — MQTT topics; defines MqttPayload/MqttPayloadItem inline
- tag-options/, device-tag-selection/
- tag-property/tag-property.service.ts (659L) — THE protocol-dispatch hub: editTagProperty<Proto>() opens the right dialog
- tag-property/tag-property-edit-<proto>/ — 13 editors: adsclient, bacnet, ethernetip, gpio, internal, melsec, modbus, opcua, redis (+redis-scan), s7, server, webapi, webcam

## WHERE TO LOOK

| Task | Location |
|------|----------|
| Add a protocol | new tag-property-edit-<proto>/ dir + wire into TagPropertyService; tag-type enums + DevicesUtils live in _models/device.ts (1106L) |
| File import flows | hidden `<input type=file>` clicked by DOM id (document.getElementById), not ViewChild refs |
| Tag tree UIs | gui-helpers/treetable (bacnet/opcua/webapi editors) |

## CONVENTIONS

- Dialog payload types XxxData; Material reactive forms via UntypedFormBuilder; i18n via translate pipe + LanguageService.
- eslint-disable component-class-suffix headers atop device.component/device-list — leave them.

## ANTI-PATTERNS

- tag-property-edit-webcam has DUPLICATE selector 'app-tag-property-edit-internal' (collides with the real internal editor) — known latent bug.
- device.component.ts onFileChangeListener is @Deprecated → use onDevTplChangeListener(event, isTemplate).
- Only tag-options and device-list use OnPush — default change detection everywhere else.
- No tests in scope; device-map (555L) and topic-property (451L) are near-threshold hotspots — change carefully.
