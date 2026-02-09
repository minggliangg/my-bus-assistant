# Service Worker Review Fix Plan

## Scope
This plan addresses the three review findings:

1. `P1`: API runtime cache rule does not match actual `/api/*` requests.
2. `P2`: `autoUpdate` conflicts with manual refresh banner behavior.
3. `P3`: Service worker initialization runs in development even when dev SW is disabled.

## Goals
- Ensure API responses for same-origin `/api/*` endpoints are actually cached by Workbox.
- Align update lifecycle with explicit user-triggered refresh from the banner.
- Remove deterministic dev-time SW registration errors/noise.

## Proposed Changes

### 1) Fix runtime caching URL match (P1)
File: `apps/web/vite.config.ts`

- Replace API cache `urlPattern` from:
  - `^https://api\.` (never matches current app traffic)
- To a same-origin API matcher for proxied backend calls:
  - Function matcher preferred:
    - `({ url }) => url.origin === self.location.origin && url.pathname.startsWith('/api/')`
  - This avoids hard-coding hostnames and works in local/prod origins.

Additional cache tuning:
- Keep `NetworkFirst`.
- Keep `networkTimeoutSeconds` for offline resilience.
- Keep or slightly increase `maxEntries` only if endpoint cardinality requires it.

Acceptance criteria:
- Requests to `/api/ltaodataservice/BusStops`, `/api/ltaodataservice/v3/BusArrival`, and bus routes are placed in `api-cache`.
- On offline simulation (with previously fetched data), cached responses are served.

### 2) Align SW registration mode with manual refresh UX (P2)
File: `apps/web/vite.config.ts`

- Change:
  - `registerType: "autoUpdate"`
- To:
  - `registerType: "prompt"`

Why:
- Manual banner flow expects a waiting worker and explicit activation (`activateUpdate()`).
- `autoUpdate` typically enables immediate activation behavior, bypassing user intent.

Acceptance criteria:
- New SW install sets app state to update-available instead of silently activating.
- Clicking banner `Refresh` triggers activation and reload flow.

### 3) Gate SW initialization in development (P3)
File: `apps/web/src/main.tsx`

- Guard initialization call so it only runs in production:
  - `if (import.meta.env.PROD) { initializeServiceWorker(); }`

Optional hardening (recommended):
File: `apps/web/src/features/service-worker/stores/useServiceWorkerStore.ts`
- Add early return in `initializeServiceWorker` when not production, as a second safety net.

Acceptance criteria:
- In dev (`bun dev`), no attempt to register `/sw.js`.
- Console no longer logs registration failures related to missing dev SW.
- In production build/preview, SW still initializes.

## Execution Order
1. Update `registerType` and runtime cache matcher in `apps/web/vite.config.ts`.
2. Add prod guard in `apps/web/src/main.tsx`.
3. Add optional store-level guard in `useServiceWorkerStore.ts`.
4. Run validation checks and tests.

## Validation Plan

### Local checks
- `bun run --cwd apps/web build`
- `bun run --cwd apps/web test:run`

### Manual functional verification
1. Dev mode
   - Run `bun run --cwd apps/web dev`.
   - Confirm no SW registration errors in console.
2. Production preview
   - Build and preview web app.
   - Open DevTools > Application > Service Workers + Cache Storage.
   - Hit `/api/*` backed pages and verify entries under `api-cache`.
3. Update flow
   - Deploy/build two app versions or simulate SW update.
   - Confirm banner appears for waiting update.
   - Click `Refresh` and verify activation + reload to new assets.
4. Offline behavior
   - After initial online requests, toggle offline.
   - Confirm cached API responses are used where expected.

## Test Coverage Updates (Recommended)
Files to add/update:
- `apps/web/src/features/service-worker/stores/useServiceWorkerStore.test.ts` (new if absent)

Suggested tests:
- Does not initialize/register when not production.
- Sets update flags when `registration.waiting` exists.
- `activateUpdate()` posts `SKIP_WAITING` only when waiting worker exists.

## Risks and Mitigations
- Risk: Too-broad `/api/` matcher could cache non-idempotent endpoints in future.
  - Mitigation: Restrict to `GET` requests in matcher options if POST endpoints are introduced.
- Risk: Manual prompt mode may delay rollout if users dismiss banner.
  - Mitigation: Keep visible persistent banner state until explicit dismiss/refresh; monitor update adoption.

## Definition of Done
- All three findings (P1, P2, P3) are resolved in code.
- Dev console is clean of SW registration errors.
- Manual update banner controls activation in production.
- `/api/*` requests are cached and usable for offline fallback after warm-up.
