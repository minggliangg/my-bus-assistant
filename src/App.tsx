import { useEffect } from "react";
import "./App.css";
import { BusStopArrivalCard } from "./features/bus-arrivals/components/BusStopArrivalCard";
import { useBusStopsStore } from "./features/search-bar/stores";

const App = () => {
  useEffect(() => {
    useBusStopsStore.getState().fetchBusStops();
  }, []);

  return (
    <div className="min-h-screen min-w-[375px] bg-background p-4 sm:p-6">
      <div className="mx-auto max-w-2xl space-y-6">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">My Bus Assistant</h1>
          <p className="text-muted-foreground">
            Real-time bus arrival information at your fingertips
          </p>
        </header>

        <BusStopArrivalCard busStopCode="55281" />
      </div>
    </div>
  );
};

export default App;
