import { useState, useEffect } from "react";
import "./App.css";
import { BusStopArrivalCard } from "./features/bus-arrivals/components/BusStopArrivalCard";
import { BusStopSearchComboBox } from "./features/search-bar";
import { useBusStopsStore } from "./features/search-bar/stores";

const App = () => {
  const [selectedBusStopCode, setSelectedBusStopCode] = useState<string>("55281");

  useEffect(() => {
    useBusStopsStore.getState().fetchBusStops();
  }, []);

  const handleBusStopSelect = (code: string) => {
    setSelectedBusStopCode(code);
  };

  return (
    <div className="min-h-screen min-w-[375px] bg-background p-4 sm:p-6">
      <div className="mx-auto max-w-2xl space-y-6">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">My Bus Assistant</h1>
          <p className="text-muted-foreground">
            Real-time bus arrival information at your fingertips
          </p>
        </header>

        <BusStopSearchComboBox
          onBusStopSelect={handleBusStopSelect}
          defaultValue={selectedBusStopCode}
        />

        <BusStopArrivalCard busStopCode={selectedBusStopCode} />
      </div>
    </div>
  );
};

export default App;
