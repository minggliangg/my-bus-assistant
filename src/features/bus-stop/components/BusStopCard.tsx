import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  ArrowUpDown,
  Bus,
  Clock,
  Loader2,
  MapPin,
  PauseCircle,
  PlayCircle,
  Users,
} from "lucide-react";
import { useEffect } from "react";
import {
  formatArrivalTime,
  getArrivalInMinutes,
  type BusService,
} from "../models/bus-stop-models";
import useBusStore from "../stores/useBusStopStore";

interface BusStopCardProps {
  busStopCode: string;
}

export function BusStopCard({ busStopCode }: BusStopCardProps) {
  const {
    busStop,
    loading,
    error,
    fetchBusArrivals,
    isAutoRefreshEnabled,
    isFetching,
    toggleAutoRefresh,
  } = useBusStore();

  useEffect(() => {
    fetchBusArrivals(busStopCode);
  }, [busStopCode, fetchBusArrivals]);

  const THROTTLE_INTERVAL_MS = parseInt(
    import.meta.env.VITE_THROTTLE_INTERVAL_MS || "45000",
    10,
  );
  const AUTO_REFRESH_INTERVAL_MS = THROTTLE_INTERVAL_MS + 1000;

  // Auto-refresh interval
  useEffect(() => {
    if (!isAutoRefreshEnabled) return;

    const intervalId = setInterval(() => {
      fetchBusArrivals(busStopCode);
    }, AUTO_REFRESH_INTERVAL_MS); // Add a small buffer to avoid throttling drift

    return () => clearInterval(intervalId);
  }, [isAutoRefreshEnabled, busStopCode, fetchBusArrivals, AUTO_REFRESH_INTERVAL_MS]);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="py-6">
          <p className="text-sm text-destructive">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!busStop) return null;

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <MapPin className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Bus Stop
              </p>
              <h3 className="text-xl font-bold tracking-tight">
                {busStop.busStopCode}
              </h3>
            </div>
          </div>
          <div className="flex items-center gap-3 sm:flex-col sm:items-end sm:gap-1">
            <div className="flex h-9 items-center rounded-lg bg-muted px-3">
              <Bus className="h-4 w-4 text-muted-foreground mr-2" />
              <span className="text-sm font-semibold">
                {busStop.services.length}
              </span>
            </div>
            <p className="text-xs text-muted-foreground whitespace-nowrap">
              {busStop.services.length === 1 ? "service" : "services"}
            </p>
          </div>
        </div>

        <CardAction>
          <button
            onClick={toggleAutoRefresh}
            disabled={isFetching}
            className={cn(
              "flex h-9 items-center gap-2 rounded-lg px-3 transition-colors disabled:opacity-50",
              isAutoRefreshEnabled
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "bg-muted text-muted-foreground hover:bg-muted/80",
            )}
            aria-label={
              isAutoRefreshEnabled ? "Stop auto-refresh" : "Start auto-refresh"
            }
          >
            {isFetching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isAutoRefreshEnabled ? (
              <PauseCircle className="h-4 w-4" />
            ) : (
              <PlayCircle className="h-4 w-4" />
            )}
            <span className="text-sm font-medium">
              {isFetching ? "Refreshing..." : isAutoRefreshEnabled ? "Stop" : "Auto"}
            </span>
          </button>
        </CardAction>
      </CardHeader>

      <CardContent className="space-y-3">
        {busStop.services.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No services available
          </p>
        ) : (
          busStop.services.map((service) => (
            <BusServiceRow key={service.serviceNo} service={service} />
          ))
        )}
      </CardContent>
    </Card>
  );
}

const BusServiceRow = ({ service }: { service: BusService }) => {
  const arrivals = [service.nextBus, service.nextBus2, service.nextBus3].filter(
    Boolean,
  );

  return (
    <div className="rounded-lg border bg-card p-3 sm:p-4 space-y-3">
      {/* Service Number */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <span className="text-sm font-bold">{service.serviceNo}</span>
          </div>
          <span className="text-xs text-muted-foreground">
            {service.operator}
          </span>
        </div>
      </div>

      {/* Arrivals */}
      {arrivals.length === 0 ? (
        <div className="text-sm text-muted-foreground">No arrivals</div>
      ) : (
        <div className="space-y-2">
          {arrivals.map((arrival, index) => {
            if (!arrival) return null;

            const minutes = getArrivalInMinutes(arrival);
            const isArriving = minutes <= 1;

            return (
              <div key={index} className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-2 min-w-0">
                  <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span
                    className={
                      isArriving
                        ? "font-semibold text-primary truncate"
                        : "text-foreground truncate"
                    }
                  >
                    {formatArrivalTime(arrival)}
                  </span>
                </div>

                <div className="flex items-center justify-end gap-1.5 min-w-0">
                  <Users className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground shrink-0">
                    {getLoadBadge(arrival.load)}
                  </span>
                  {getBusTypeBadge(arrival.type)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const getLoadBadge = (load: string): string => {
  const badges: Record<string, string> = {
    SEA: "Seats",
    SDA: "Standing",
    LSD: "Limited",
  };
  return badges[load] || load;
};

const getBusTypeBadge = (type: string) => {
  const busTypes: Record<
    string,
    { label: string; icon: React.ReactNode; variant: string }
  > = {
    DD: {
      label: "Double",
      icon: <Bus className="h-3 w-3" />,
      variant:
        "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    },
    SD: {
      label: "Single",
      icon: <Bus className="h-3 w-3" />,
      variant: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
    },
    BD: {
      label: "Bendy",
      icon: <ArrowUpDown className="h-3 w-3" />,
      variant:
        "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    },
  };

  const busType = busTypes[type];
  if (!busType) return null;

  return (
    <div
      className={`flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ${busType.variant}`}
    >
      {busType.icon}
      <span>{busType.label}</span>
    </div>
  );
};
