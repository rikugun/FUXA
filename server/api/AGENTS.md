# server/api/ — REST API + auth

Score ~16 (16 modules ~3k LOC, own composition root, security-sensitive, tested by test/authorization/). All CommonJS; one TS file (reports.service.ts → compiled to server/dist/).

## STRUCTURE
```
api/
├── index.js        # composition root: Express assembly, rate limiters, 13 sub-routers (389L)
├── jwt-helper.js   # JWT: init/verify/requireAuth/guest tokens; adminGroups [-1, 255]; header x-access-token
├── path-helper.js  # normalizeRelativePath / resolveWithin — path-traversal guard
└── <module>/index.js  # alarms apikeys(+verify-api-or-token) auth command daq diagnose plugins projects reports resources scheduler scripts users
```

## WHERE TO LOOK
| Task | Location | Notes |
|---|---|---|
| Add an API module | new `<module>/index.js` + `init()` in api/index.js + openapi.yaml | `{init(_runtime,_secureFnc,_checkGroupsFnc), app()}` returning Router |
| Endpoint auth | every handler: `checkGroupsFnc(req)` → 403/401 → try/catch | copy an existing module's shape exactly |
| API-key + JWT dual auth | apikeys/verify-api-or-token.js | `x-api-key` header validated against runtime.apiKeys, fallback JWT |
| Cookie/refresh tokens | auth/index.js | parseExpiresToMs, buildAccessToken/buildRefreshToken, setRefreshCookie; targeted by jwtLifecycleSecurity.test.js (358L) |
| Path-traversal surface | resources/index.js (377L) | uses resolveWithin at 2 call sites; recursive fs helpers inline |
| Endpoint docs | server/docs/openapi.yaml (1048L) | source of truth for /api/* shapes — keep in sync |
| Project/view CRUD + lazy views | projects/index.js (299L) | lazy-view opt-in tested by test/api/projectLazyLoading.test.js |

## CONVENTIONS
- Strict module pattern: module-level `runtime/secureFnc/checkGroupsFnc` injected via `init()`; `app()` returns a fresh express Router; route paths are the literal full `/api/<resource>` inside sub-routers.
- Error JSON: `{error: "<snake_case>", message: …}` — codes: unauthorized_error, unexpected_error, not_found, invalid_path, entity.too.large→413.
- Rate limiters mount BEFORE all sub-routers (authLimiter on /signin,/refresh; limiter skips /api/version) — this ordering is asserted by a source-text test (rateLimiterOrderSecurity.test.js). Do not reorder casually.
- Admin check via `authJwt.adminGroups.indexOf(groups)===-1` → 401; `verifyGroups(req)` returns adminGroups[0] when insecure mode or for API keys.
- Style follows file age: older `var`/callbacks/`.then`, newer (verify-api-or-token, tests) const/async-await + 'use strict'.

## ANTI-PATTERNS
- Do NOT propagate the `"Tocken Expired"` log typo present across modules.
- Do NOT log via bare `console.error` for auth errors (jwt-helper does — should be runtime.logger).
- reports.service.ts returns `{error: err.stack}` to clients — leaks internals; never copy, fix opportunistically.
- No commented-out CORS header lines in new code (`// res.header("Access-Control-Allow-Origin", "*")` litters handlers).
- `require('../dist/reports.service')` — dist is build output; run `npm run build` after editing reports.service.ts.
- Handlers compute `groups` redundantly (authorization re-done via adminGroups check) — known duplication.

## NOTES
Security regression net lives in `server/test/authorization/` (9 `*Security.test.js`, ~1400L). Any endpoint/auth change should expect a test there; some tests assert on SOURCE TEXT of api/index.js (mounting order contracts).
