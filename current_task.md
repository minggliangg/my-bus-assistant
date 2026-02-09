# Current Task: Implement Service Worker for Update Management

## Problem
App has PWA assets (manifest.json, icons) but **no service worker**, causing:
- Static assets not being cached
- App updates not being detected or applied
- No offline capability for static resources
- Users stuck on old versions after deployments

## Solution Overview
Add service worker with **stale-while-revalidate (SWR)** strategy and **update notification banner** to properly manage app updates.

---

## Implementation Tasks

### Phase 1: Install & Configure PWA Plugin

- [ ] **Install dependency**: Add `vite-plugin-pwa` to `apps/web/package.json` devDependencies
  ```bash
  cd apps/web && bun add -D vite-plugin-pwa
  ```

- [ ] **Configure Vite**: Update `apps/web/vite.config.ts` with PWA plugin configuration
  - Add `VitePWA` import and plugin to plugins array
  - Configure with `registerType: 'autoUpdate'` (manual update control via banner)
  - Set `devOptions: { enabled: false }` to skip in dev mode
  - Configure workbox with SWR caching strategy
  - Include globPatterns for `**/*.{js,css,html,ico,png,svg,json}`
  - Set includeAssets for all images and manifest

---

### Phase 2: Create Service Worker Update Logic

- [ ] **Create store directory**: `apps/web/src/features/service-worker/stores/`

- [ ] **Create Zustand store**: `apps/web/src/features/service-worker/stores/useServiceWorkerStore.ts`
  - Define state interface: `isUpdateAvailable`, `isUpdateReady`, `isInstalling`
  - Add setters for each state
  - Add `activateUpdate()` method to skip waiting and activate new SW
  - Add `initializeServiceWorker()` method to:
    - Register service worker
    - Listen for `updatefound` event → set `isUpdateAvailable: true`
    - Listen for `controllerchange` event → set `isUpdateReady: true`
    - Handle edge cases (no SW support, errors)

- [ ] **Create barrel file**: `apps/web/src/features/service-worker/stores/index.ts`
  - Export `useServiceWorkerStore`

---

### Phase 3: Create Update Notification Banner

- [ ] **Create components directory**: `apps/web/src/features/service-worker/components/`

- [ ] **Create banner component**: `apps/web/src/features/service-worker/components/UpdateBanner.tsx`
  - Import `useServiceWorkerStore` and existing UI components (Button, Badge, etc.)
  - Create fixed banner at bottom of screen with:
    - Title: "🔄 New version available"
    - Description: "Click to refresh for latest updates"
    - Actions: "Refresh" button (calls `activateUpdate()`) and "Dismiss" button
  - Show only when `isUpdateAvailable` is true
  - Style with existing design system
  - Support dark mode via existing theming
  - Add smooth animations for show/hide
  - Handle dismiss (store preference, auto-reappear on next update)

- [ ] **Create component barrel**: `apps/web/src/features/service-worker/components/index.ts`
  - Export `UpdateBanner`

- [ ] **Create feature barrel**: `apps/web/src/features/service-worker/index.ts`
  - Export all service worker related items

---

### Phase 4: Register Service Worker

- [ ] **Initialize in main.tsx**: Update `apps/web/src/main.tsx`
  - Import `useServiceWorkerStore`
  - Add `useServiceWorkerStore.getState().initializeServiceWorker()` call
  - Place in useEffect or directly after root creation

---

### Phase 5: Integrate Banner in Root Layout

- [ ] **Add banner to root**: Update `apps/web/src/routes/__root.tsx`
  - Import `UpdateBanner` component
  - Add `<UpdateBanner />` before closing root div
  - Ensure it's positioned correctly (above TanStackRouterDevtools)

---

### Phase 6: Testing

- [ ] **Test service worker registration**:
  ```bash
  cd apps/web
  bun build
  bun preview
  ```
  - Open browser DevTools → Application → Service Workers
  - Verify service worker is registered
  - Check scope and status

- [ ] **Test update flow**:
  1. Make a small change (e.g., update version or add console.log)
  2. Build: `bun build`
  3. Serve with preview
  4. Refresh page
  5. Verify update banner appears
  6. Click "Refresh" - page should reload with new version
  7. Verify console shows new version

- [ ] **Test SWR caching**:
  1. Load app and navigate through pages
  2. Go offline (DevTools → Network → Offline)
  3. Refresh page - static assets should load from cache
  4. API calls should fail gracefully (existing behavior)

- [ ] **Test on mobile** (optional but recommended):
  1. Deploy to VPS
  2. Access from mobile browser
  3. Test update flow and offline caching

---

### Phase 7: Deployment to VPS

- [ ] **Build for production**:
  ```bash
  bun build
  ```

- [ ] **Deploy to VPS**:
  - Copy `apps/web/dist/` directory to your VPS
  - Ensure `sw.js` is included in deployment
  - Verify `manifest.json` is copied

- [ ] **Configure server caching** (if using nginx/apache):
  - Set `Cache-Control: no-cache` for `sw.js`
  - Set appropriate caching headers for static assets

- [ ] **Verify production deployment**:
  1. Clear browser cache and reload
  2. Check browser DevTools → Application → Service Workers
  3. Verify service worker registers successfully
  4. Make a change and redeploy
  5. Test update banner appears
  6. Test refresh activates new version

---

### Phase 8: Documentation

- [ ] **Update README.md**:
  - Add "Service Worker & Updates" section
  - Explain how service worker works
  - Describe update flow and user experience
  - Add testing instructions
  - Add deployment notes for VPS
  - Add troubleshooting section

- [ ] **Create feature README**: `apps/web/src/features/service-worker/README.md`
  - Document feature architecture
  - Explain cache strategies
  - Describe how to customize update notifications
  - Provide testing procedures

---

## Technical Specifications

### Cache Strategy

**Static Assets (JS, CSS, HTML)** - StaleWhileRevalidate:
- Serve from cache immediately
- Update in background
- Max 100 entries, 30 days expiration

**API Calls** - NetworkFirst:
- Try network first (10s timeout)
- Fallback to cache for offline
- Max 50 entries, 5 minutes expiration

**Images/Icons** - CacheFirst:
- Serve from cache (rarely change)
- Max 60 entries, 60 days expiration

### Update Flow

1. User visits site
2. Service worker registers
3. Browser checks for new version (on page load, max 24h interval)
4. If update found → Show "Update Available" banner
5. User clicks "Refresh" → Activate new service worker → Reload page
6. New version served

---

## Success Criteria

✅ Service worker registers successfully
✅ Static assets are cached for faster loads
✅ App updates detected automatically after deployment
✅ Update banner appears within 24 hours of deployment
✅ Clicking refresh loads new version instantly
✅ App works offline for cached resources
✅ Console shows no service worker errors
✅ Deployment to VPS is straightforward

---

## Estimated Time

- Phase 1-2: 30-45 minutes
- Phase 3: 30-45 minutes
- Phase 4-5: 15 minutes
- Phase 6 (testing): 30-45 minutes
- Phase 7 (deployment): 15-30 minutes
- Phase 8 (documentation): 15-20 minutes

**Total: 2-3 hours**

---

## Notes

- Service worker will be **skipped in development mode** (devOptions.enabled: false)
- Test with `bun preview` after `bun build` to verify service worker
- Ensure `sw.js` is not cached by your server (no-cache headers)
- Update banner uses existing design system components (Button, Card)
- Banner is non-intrusive (fixed at bottom, dismissible)
- SWR strategy provides optimal balance of freshness and performance
