import "./App.css";
import { BusStopCard } from "./features/bus-stop/components/BusStopCard";

const App = () => (
  <div className="min-h-screen min-w-[375px] bg-background p-4 sm:p-6">
    <div className="mx-auto max-w-2xl space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">My Bus Assistant</h1>
        <p className="text-muted-foreground">
          Real-time bus arrival information at your fingertips
        </p>
      </header>

      <BusStopCard busStopCode="55281" />
    </div>
  </div>
);

export default App;
