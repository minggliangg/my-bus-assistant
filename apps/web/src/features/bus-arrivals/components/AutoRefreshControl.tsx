import { cn } from "@/lib/utils";
import { PauseCircle, PlayCircle, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import useBusStore from "../stores/useBusStopStore";

interface AutoRefreshControlProps {
  busStopCode: string | undefined;
}

export const AutoRefreshControl = ({
  busStopCode,
}: AutoRefreshControlProps) => {
  const { isAutoRefreshEnabled, isFetching } = useBusStore(
    useShallow((state) => ({
      isAutoRefreshEnabled: state.isAutoRefreshEnabled,
      isFetching: state.isFetching,
    }))
  );
  const toggleAutoRefresh = useBusStore((state) => state.toggleAutoRefresh);

  const lastUpdateTimestamp = useBusStore((state) => state.lastUpdateTimestamp);
  const fetchBusArrivals = useBusStore((state) => state.fetchBusArrivals);

  const COOLDOWN_MS = 30000;

  const [currentTime, setCurrentTime] = useState(Date.now);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => clearInterval(intervalId);
  }, []);

  const canManualRefresh = lastUpdateTimestamp !== null && currentTime - lastUpdateTimestamp >= COOLDOWN_MS;

  const handleManualRefresh = () => {
    if (busStopCode && canManualRefresh && !isFetching) {
      fetchBusArrivals(busStopCode, { force: true });
    }
  };

  const THROTTLE_INTERVAL_MS = parseInt(
    import.meta.env.VITE_THROTTLE_INTERVAL_MS || "30000",
    10,
  );
  const AUTO_REFRESH_INTERVAL_MS = THROTTLE_INTERVAL_MS + 1000;

  // Auto-refresh interval
  useEffect(() => {
    if (!isAutoRefreshEnabled || !busStopCode) return;

    const intervalId = setInterval(() => {
      if (busStopCode) {
        useBusStore.getState().fetchBusArrivals(busStopCode);
      }
    }, AUTO_REFRESH_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [
    isAutoRefreshEnabled,
    busStopCode,
    AUTO_REFRESH_INTERVAL_MS,
  ]);

  return (
    <>
      <button
        data-tour-id="manual-refresh"
        onClick={handleManualRefresh}
        disabled={!canManualRefresh || isFetching || !busStopCode}
        className={cn(
          "relative flex h-10 items-center gap-2 rounded-lg px-3 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0",
          "bg-muted text-muted-foreground hover:bg-muted/80",
        )}
        aria-label="Refresh bus arrivals"
        aria-busy={isFetching}
      >
        <RefreshCw
          className={cn("h-4 w-4", isFetching && "animate-spin")}
        />
      </button>
      <button
        data-tour-id="auto-refresh"
        onClick={toggleAutoRefresh}
        disabled={isFetching || !busStopCode}
        className={cn(
          "relative flex h-10 items-center gap-2 rounded-lg px-3 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0",
          isAutoRefreshEnabled
            ? "bg-primary text-primary-foreground hover:bg-primary/90"
            : "bg-muted text-muted-foreground hover:bg-muted/80",
        )}
        aria-label={
          isAutoRefreshEnabled ? "Stop auto-refresh" : "Start auto-refresh"
        }
        aria-busy={isFetching}
      >
        {isAutoRefreshEnabled ? (
          <PauseCircle className="h-4 w-4" />
        ) : (
          <PlayCircle className="h-4 w-4" />
        )}
        <span className="hidden text-sm font-medium sm:block">
          {isAutoRefreshEnabled ? "Stop" : "Auto"}
        </span>
      </button>
    </>
  );
};
