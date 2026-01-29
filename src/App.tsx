import "./App.css";
import { BusStopCard } from "./features/bus-stop/components/BusStopCard";

const App = () => {
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-2xl space-y-6">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">
            My Bus Assistant
          </h1>
          <p className="text-muted-foreground">
            Real-time bus arrival information at your fingertips
          </p>
        </header>

        <BusStopCard busStopCode="83139" />
      </div>
    </div>
  );
};

export default App;
