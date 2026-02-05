import { cn } from "@/lib/utils";
import { Loader2, PauseCircle, PlayCircle } from "lucide-react";
import { useEffect } from "react";
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
    <button
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
      {isFetching ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : isAutoRefreshEnabled ? (
        <PauseCircle className="h-4 w-4" />
      ) : (
        <PlayCircle className="h-4 w-4" />
      )}
      <span className="hidden text-sm font-medium sm:block">
        {isAutoRefreshEnabled ? "Stop" : "Auto"}
      </span>

      {isFetching && (
        <span className="sr-only">Refreshing...</span>
      )}
    </button>
  );
};
