# Fix Favorites Not Displaying on App Startup

## Problem
When the app is closed and reopened, the favorites section appears empty initially, but reappears after any user interaction (retrieving a bus stop, finding nearby stops).

## Root Cause
Race condition on app startup between loading favorites and loading bus stops data:

1. In `/home/minggliangg/my-bus-assistant/apps/web/src/routes/__root.tsx`, both `loadFavorites()` and `fetchBusStops()` are called asynchronously in parallel
2. The `FavoriteBusStops` component depends on BOTH stores:
   - Gets favorite codes from `useFavoritesStore`
   - Looks up bus stop details using `getBusStopByCode()` from `useBusStopsStore`
3. If bus stops aren't loaded yet when favorites are ready, `getBusStopByCode()` returns `undefined` and favorites silently don't render (returns `null` at line 44)
4. User interactions trigger re-renders, and by then bus stops are loaded, so favorites appear

## Solution
Add proper loading state handling to the `FavoriteBusStops` component. Show a loading indicator while either store is loading, preventing the race condition from causing empty favorites to appear.

## Implementation Steps

### 1. Update FavoriteBusStops Component
**File:** `/home/minggliangg/my-bus-assistant/apps/web/src/features/favorites/components/FavoriteBusStops.tsx`

**Changes:**

1. Import `Loader2` icon (line 1):
   ```typescript
   import { Star, Loader2 } from "lucide-react";
   ```

2. Subscribe to both stores' loading states (replace lines 19-22):
   ```typescript
   const { favorites, loading: favoritesLoading } = useFavoritesStore(
     useShallow((state) => ({
       favorites: state.favorites,
       loading: state.loading
     }))
   );
   const busStopsLoading = useBusStopsStore((state) => state.loading);
   const getBusStopByCode = useBusStopsStore((state) => state.getBusStopByCode);
   ```

3. Add loading state check (before line 24, before empty state check):
   ```typescript
   // Show loading if favorites are loading OR if we have favorites but can't resolve bus stops yet
   const isLoading = favoritesLoading || (favorites.length > 0 && busStopsLoading);

   if (isLoading) {
     return (
       <div className={cn("min-h-[48px]", className)}>
         <div className="flex items-center gap-2 mb-2">
           <Star className="h-4 w-4 text-muted-foreground" />
           <span className="text-sm font-medium">Favorites</span>
         </div>
         <div className="flex items-center gap-2">
           <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
           <span className="text-xs text-muted-foreground">
             Loading favorites...
           </span>
         </div>
       </div>
     );
   }
   ```

4. Keep existing empty state check (lines 24-32) - no changes
5. Keep existing null check in map (line 44) - provides defense in depth

**Why this works:**
- `favoritesLoading` catches the case where favorites are still loading from IndexedDB
- `favorites.length > 0 && busStopsLoading` catches the race condition where favorites loaded first but bus stops are still loading
- Once both stores finish loading, normal rendering proceeds

### 2. Add Test Cases
**File:** `/home/minggliangg/my-bus-assistant/apps/web/src/features/favorites/components/FavoriteBusStops.test.tsx`

Add these test cases after the existing tests:

```typescript
it("should show loading state when favorites are loading", () => {
  useFavoritesStore.setState({ favorites: [], loading: true });
  useBusStopsStore.setState({
    busStops: [
      {
        busStopCode: "01012",
        roadName: "Victoria St",
        description: "Hotel Grand Pacific",
        latitude: 1.296848,
        longitude: 103.852535,
      },
    ],
    loading: false,
    error: null,
    lastUpdateTimestamp: null,
    isFetching: false,
    retryCount: 0,
    isStale: false,
  });

  render(
    <FavoriteBusStops
      onBusStopSelect={mockOnBusStopSelect}
      selectedBusStopCode={undefined}
    />
  );

  expect(screen.getByText("Loading favorites...")).toBeInTheDocument();
  expect(
    screen.queryByText("Star bus stops to add them to favorites")
  ).not.toBeInTheDocument();
});

it("should show loading state when bus stops are loading but favorites are ready", () => {
  useFavoritesStore.setState({ favorites: ["01012", "01013"], loading: false });
  useBusStopsStore.setState({
    busStops: [],
    loading: true,
    error: null,
    lastUpdateTimestamp: null,
    isFetching: false,
    retryCount: 0,
    isStale: false,
  });

  render(
    <FavoriteBusStops
      onBusStopSelect={mockOnBusStopSelect}
      selectedBusStopCode={undefined}
    />
  );

  expect(screen.getByText("Loading favorites...")).toBeInTheDocument();
  expect(screen.queryByText("Hotel Grand Pacific")).not.toBeInTheDocument();
});

it("should show favorites after both stores finish loading", () => {
  useFavoritesStore.setState({ favorites: ["01012"], loading: false });
  useBusStopsStore.setState({
    busStops: [
      {
        busStopCode: "01012",
        roadName: "Victoria St",
        description: "Hotel Grand Pacific",
        latitude: 1.296848,
        longitude: 103.852535,
      },
    ],
    loading: false,
    error: null,
    lastUpdateTimestamp: null,
    isFetching: false,
    retryCount: 0,
    isStale: false,
  });

  render(
    <FavoriteBusStops
      onBusStopSelect={mockOnBusStopSelect}
      selectedBusStopCode={undefined}
    />
  );

  expect(screen.queryByText("Loading favorites...")).not.toBeInTheDocument();
  expect(screen.getByText("Hotel Grand Pacific")).toBeInTheDocument();
});
```

## Critical Files
- `/home/minggliangg/my-bus-assistant/apps/web/src/features/favorites/components/FavoriteBusStops.tsx` - Main component to modify
- `/home/minggliangg/my-bus-assistant/apps/web/src/features/favorites/components/FavoriteBusStops.test.tsx` - Add test cases

## Verification Plan

### Automated Tests
Run the test suite to verify loading states:
```bash
bun test apps/web/src/features/favorites/components/FavoriteBusStops.test.tsx
```

All tests should pass, including the 3 new loading state tests.

### Manual Testing

1. **Cold start (reproduce the bug):**
   - Open Chrome DevTools → Application → IndexedDB → Delete "my-bus-assistant" database
   - Refresh the app
   - **Expected:** Should see "Loading favorites..." briefly, then favorites appear (if any were set before)
   - **Bug would show:** Empty state message or just blank

2. **Slow network simulation:**
   - Chrome DevTools → Network → Throttling → Slow 3G
   - Add a favorite bus stop
   - Refresh the page
   - **Expected:** Loading state persists for several seconds, then favorites appear
   - **Bug would show:** Empty state, then favorites pop in after interaction

3. **Normal operation:**
   - With cached data, refresh the page
   - **Expected:** Favorites load quickly (loading state may be brief or not visible)
   - Click on other bus stops, add/remove favorites
   - **Expected:** Everything works normally

4. **Empty favorites state:**
   - Remove all favorites
   - **Expected:** See "Star bus stops to add them to favorites" message (not loading)

## Edge Cases Handled
- ✅ Favorites load before bus stops (covered by `favorites.length > 0 && busStopsLoading`)
- ✅ Bus stops load before favorites (covered by `favoritesLoading`)
- ✅ Both loading simultaneously (covered by `favoritesLoading`)
- ✅ Missing bus stop data (defensive null check at line 44)
- ✅ Empty favorites (shows empty state, not loading state)
- ✅ Cached data (loading states managed by stores)