# D11: Elasticsearch control error handling

## Changes

- ES status/start require an explicit `success: true`; HTTP 200 alone does not acknowledge successful control. False/missing/malformed acknowledgement becomes an error, never a success notice.
- ES control 5xx, network failures and malformed/non-JSON responses show `ES control không phản hồi, xem log server` (English equivalent available). Proxy HTML and internal diagnostics are not exposed.
- `parseProblem` skips JSON parsing for non-JSON Content-Type, including Cloudflare HTML/plain-text 502. `application/problem+json` remains supported. Auth refresh/retry and cookie/token handling are unchanged.
- Lifecycle errors are separate from settings errors. Retrying repeats the failed ES action, not just settings GET. Stop retries still require confirmation. Language switching updates the error immediately.
- Structured successful output is formatted as text, rendered with React escaping, and never interpreted as a translation key.
- Stop reads authoritative nested settings from the current LifecycleResponse. The previous direct-settings response is supported, but cannot override an explicit `success:false`.

## Verification

- `npm run lint`, `npm run typecheck`, `npm run test`: passed on the shared working tree. Last recorded run: 79 tests / 13 files (includes concurrent work; not a standalone D11 commit).
- Isolated owned frontend snapshot: lint/types passed; 66 tests / 10 files passed; `npm run build` passed, 24 static pages/resources. D11 adds 15 unit regression cases.
- `npm audit --omit=dev`: zero vulnerabilities; no dependencies changed for D11.
- `KG_UI_URL=http://localhost:3210 NODE_PATH=/tmp/kg-browser-check/node_modules node scripts/verify-es-control.mjs`: 28 checks passed, desktop/mobile; zero page exceptions, unmatched API calls or captured axe violations. Checks cover 200+false, HTML/JSON 502, action retry, error language switching, recovery, structured start output and nested stop settings.
- All browser API calls/writes are intercepted synthetic fixtures. This is not a live bridge/backend integration test.
- Build/browser verification uses an isolated copy to avoid rebuilding the other workflow's `.next` directory. Commit/push remains deferred until overlapping frontend work is synchronized.
