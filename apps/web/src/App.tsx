import { useState, useEffect, useMemo } from "react";
import "./App.css";
import { BusStopArrivalCard, AutoRefreshControl } from "./features/bus-arrivals/components";
import { BusStopSearchComboBox } from "./features/search-bar";
import { useBusStopsStore } from "./features/search-bar/stores";
import { FavoriteBusStops, useFavoritesStore } from "./features/favorites";
import { NearbyBusStopsButton, NearestBusStopsDialog, useNearbyStore } from "./features/nearby-stops";

const App = () => {
  const [selectedBusStopCode, setSelectedBusStopCode] = useState<string | undefined>(undefined);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    useBusStopsStore.getState().fetchBusStops();
    useFavoritesStore.getState().loadFavorites();
  }, []);

  const handleBusStopSelect = (code: string | undefined) => {
    setSelectedBusStopCode(code);
  };

  const handleNearbyDialogOpen = (open: boolean) => {
    setDialogOpen(open);

    if (open) {
      const busStops = useBusStopsStore.getState().busStops;
      const { requestLocation, findNearestStops } = useNearbyStore.getState();

      requestLocation()
        .then(() => findNearestStops(busStops, 5))
        .catch(() => {});
    }
  };

  const { nearestStops, loadingLocation, locationError, retry, location } = useNearbyStore();

  // Memoize userLocation to prevent unnecessary map re-renders
  const userLocation = useMemo(
    () => (location ? { latitude: location.latitude, longitude: location.longitude } : null),
    [location],
  );

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6">
      <div className="mx-auto max-w-2xl space-y-6">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">My Bus Assistant</h1>
          <p className="text-muted-foreground">
            Real-time bus arrival information at your fingertips
          </p>
        </header>

        <div className="flex gap-2 items-start">
          <div className="flex-1 min-w-0">
            <BusStopSearchComboBox
              onBusStopSelect={handleBusStopSelect}
              defaultValue={selectedBusStopCode}
            />
          </div>
          <AutoRefreshControl busStopCode={selectedBusStopCode} />
          <NearbyBusStopsButton onOpenChange={handleNearbyDialogOpen} />
        </div>

        <FavoriteBusStops
          selectedBusStopCode={selectedBusStopCode}
          onBusStopSelect={handleBusStopSelect}
        />

        <BusStopArrivalCard busStopCode={selectedBusStopCode} />

        <NearestBusStopsDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          nearestStops={nearestStops}
          loading={loadingLocation}
          error={locationError}
          userLocation={userLocation}
          onBusStopSelect={(code) => {
            handleBusStopSelect(code);
          }}
          onRetry={retry}
        />
      </div>
    </div>
  );
};

export default App;
