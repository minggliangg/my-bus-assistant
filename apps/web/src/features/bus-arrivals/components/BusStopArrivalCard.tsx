import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { FavoriteToggleButton } from "@/features/favorites";
import { cn } from "@/lib/utils";
import { ArrowUpDown, Bus, Clock, Loader2, MapPin, Users } from "lucide-react";
import { useEffect } from "react";
import {
  formatArrivalTime,
  getArrivalInMinutes,
  type BusService,
} from "../models/bus-arrivals-model";
import useBusStore, { type ChangedField } from "../stores/useBusStopStore";

interface BusStopArrivalCardProps {
  busStopCode: string | undefined;
}

export const BusStopArrivalCard = ({
  busStopCode,
}: BusStopArrivalCardProps) => {
  const {
    busStop,
    loading,
    error,
    fetchBusArrivals,
    isFetching,
    changedFields,
    isStale,
  } = useBusStore();

  useEffect(() => {
    if (busStopCode) {
      fetchBusArrivals(busStopCode);
    }
  }, [busStopCode, fetchBusArrivals]);

  // Show empty state when no bus stop is selected
  if (!busStopCode) {
    return (
      <Card>
        <CardContent className="py-12">
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <MapPin />
              </EmptyMedia>
              <EmptyTitle>No bus stop selected</EmptyTitle>
              <EmptyDescription>
                Search and select a bus stop to view arrival times
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </CardContent>
      </Card>
    );
  }

  // Only show loading spinner for initial load (no existing data)
  if (loading && !busStop) {
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

  if (!busStop) {
    return (
      <Card>
        <CardContent className="py-6">
          <p className="text-sm text-muted-foreground text-center">
            No bus stop data available
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 flex-1">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <MapPin className="h-6 w-6 text-primary" />
            </div>
            <div className="flex flex-col text-left">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Bus Stop
              </p>
              <h3 className="text-lg font-bold text-foreground">
                {busStop.busStopCode}
              </h3>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <FavoriteToggleButton busStopCode={busStop.busStopCode} />
            <div className="flex h-9 items-center rounded-lg bg-muted px-3">
              <Bus className="h-4 w-4 text-muted-foreground mr-2" />
              <span className="text-sm font-semibold">
                {busStop.services.length}
              </span>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {busStop.services.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No services available
          </p>
        ) : (
          busStop.services.map((service) => (
            <BusServiceRow
              key={service.serviceNo}
              service={service}
              changedFields={changedFields}
            />
          ))
        )}
      </CardContent>

      {isStale && !isFetching && (
        <CardFooter className="pt-0">
          <div className="flex w-full items-center justify-end gap-2 border-t pt-4 text-amber-700 dark:text-amber-400">
            <Clock className="h-4 w-4" />
            <span className="text-xs font-medium">Cached data shown</span>
          </div>
        </CardFooter>
      )}
    </Card>
  );
};

const BusServiceRow = ({
  service,
  changedFields,
}: {
  service: BusService;
  changedFields: ChangedField[];
}) => {
  const arrivals = [service.nextBus, service.nextBus2, service.nextBus3].filter(
    Boolean,
  );

  // Check if this service's arrival times have changed
  const hasChanges = changedFields.some(
    (field) => field.serviceNo === service.serviceNo,
  );

  const firstArrival = service.nextBus || service.nextBus2 || service.nextBus3;
  const hasRoute = firstArrival?.originName || firstArrival?.destinationName;

  return (
    <div className="rounded-lg border bg-card p-3 sm:p-4 space-y-3">
      {/* Service Number */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <span className="text-sm font-bold">{service.serviceNo}</span>
          </div>
          {hasChanges && (
            <div className="flex items-center gap-1 rounded-full bg-green-100 px-2 py-1">
              <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-xs text-green-700 font-medium">
                Updated
              </span>
            </div>
          )}
          <span className="text-xs text-muted-foreground">
            {service.operator}
          </span>
        </div>
      </div>

      {/* Route Info */}
      {hasRoute && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span>{firstArrival?.originName ?? firstArrival?.originCode}</span>
          <span>→</span>
          <span>{firstArrival?.destinationName ?? firstArrival?.destinationCode}</span>
        </div>
      )}

      {/* Arrivals */}
      {arrivals.length === 0 ? (
        <div className="text-sm text-muted-foreground">No arrivals</div>
      ) : (
        <div className="space-y-2">
          {arrivals.map((arrival, index) => {
            if (!arrival) return null;

            // Check if this specific bus arrival has changed
            const isChanged = changedFields.some(
              (field) =>
                field.serviceNo === service.serviceNo &&
                field.busIndex === index,
            );

            const minutes = getArrivalInMinutes(arrival);
            const isArriving = minutes <= 1;

            return (
              <div key={index} className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-2 min-w-0">
                  <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span
                    className={cn(
                      "arrival-time transition-colors duration-2000 ease-out",
                      {
                        "text-green-600": isChanged,
                        "font-semibold": isChanged,
                        "font-semibold text-primary": isArriving && !isChanged,
                        "text-foreground": !isArriving && !isChanged,
                      },
                    )}
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
