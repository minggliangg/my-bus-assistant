import { useState, useEffect } from "react";
import "./App.css";
import { BusStopArrivalCard, AutoRefreshControl } from "./features/bus-arrivals/components";
import { BusStopSearchComboBox } from "./features/search-bar";
import { useBusStopsStore } from "./features/search-bar/stores";
import { FavoriteBusStops, useFavoritesStore } from "./features/favorites";

const App = () => {
  const [selectedBusStopCode, setSelectedBusStopCode] = useState<string | undefined>(undefined);

  useEffect(() => {
    useBusStopsStore.getState().fetchBusStops();
    useFavoritesStore.getState().loadFavorites();
  }, []);

  const handleBusStopSelect = (code: string | undefined) => {
    setSelectedBusStopCode(code);
  };

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
        </div>

        <FavoriteBusStops
          selectedBusStopCode={selectedBusStopCode}
          onBusStopSelect={handleBusStopSelect}
        />

        <BusStopArrivalCard busStopCode={selectedBusStopCode} />
      </div>
    </div>
  );
};

export default App;
