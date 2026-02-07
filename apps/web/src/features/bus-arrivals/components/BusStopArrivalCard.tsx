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
import {
  ArrowLeftRight,
  Bus,
  Layers,
  Loader2,
  MapPin,
} from "lucide-react";
import { memo, useEffect, type ReactNode } from "react";
import { useShallow } from "zustand/react/shallow";
import {
  formatArrivalTime,
  getArrivalInMinutes,
  type BusArrival,
  type BusService,
} from "../models/bus-arrivals-model";
import useBusStore, { type ChangedField } from "../stores/useBusStopStore";
import { getOperatorBadgeColors, getOperatorFullName } from "../utils";

interface BusStopArrivalCardProps {
  busStopCode: string | undefined;
}

export const BusStopArrivalCard = ({
  busStopCode,
}: BusStopArrivalCardProps) => {
  const { busStop, loading, error, changedFields, isStale, isFetching } =
    useBusStore(
      useShallow((state) => ({
        busStop: state.busStop,
        loading: state.loading,
        error: state.error,
        changedFields: state.changedFields,
        isStale: state.isStale,
        isFetching: state.isFetching,
      })),
    );
  const fetchBusArrivals = useBusStore((state) => state.fetchBusArrivals);

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
            <span className="text-xs font-medium">Cached data shown</span>
          </div>
        </CardFooter>
      )}
    </Card>
  );
};

type BusServiceRowProps = {
  service: BusService;
  changedFields: ChangedField[];
};

type ArrivalEntry = {
  arrival: BusArrival;
  index: number;
};

const BusServiceRow = memo(({ service, changedFields }: BusServiceRowProps) => {
  const arrivalCandidates: ArrivalEntry[] = [service.nextBus, service.nextBus2, service.nextBus3]
    .map((arrival, index) => (arrival ? { arrival, index } : null))
    .filter((entry): entry is ArrivalEntry => Boolean(entry));

  // Check if this service's arrival times have changed
  const hasChanges = changedFields.some(
    (field) => field.serviceNo === service.serviceNo,
  );

  const primaryArrival = arrivalCandidates[0];
  const secondaryArrivals = arrivalCandidates.slice(1);
  const hasRoute =
    primaryArrival?.arrival.originName || primaryArrival?.arrival.destinationName;

  return (
    <div
      className="rounded-lg border bg-card p-3 sm:p-4 space-y-3"
      data-testid={`service-row-${service.serviceNo}`}
    >
      {/* Service Number + Primary Arrival */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
              getOperatorBadgeColors(service.operator),
            )}
          >
            <span className="text-sm font-bold">{service.serviceNo}</span>
          </div>
          {hasChanges && (
            <div className="flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 shrink-0">
              <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-xs text-green-700 font-medium">
                Updated
              </span>
            </div>
          )}
          <span className="text-xs text-muted-foreground truncate">
            {getOperatorFullName(service.operator)}
          </span>
        </div>

        {primaryArrival && (
          <div
            className="flex shrink-0 items-center gap-2"
            data-testid={`primary-arrival-${service.serviceNo}`}
          >
            <span
              className={cn(
                "arrival-time text-2xl font-bold leading-none transition-colors duration-2000 ease-out sm:text-3xl",
                {
                  "text-green-600": changedFields.some(
                    (field) =>
                      field.serviceNo === service.serviceNo &&
                      field.busIndex === primaryArrival.index,
                  ),
                  "text-primary": getArrivalInMinutes(primaryArrival.arrival) <= 1,
                  "text-foreground":
                    getArrivalInMinutes(primaryArrival.arrival) > 1 &&
                    !changedFields.some(
                      (field) =>
                        field.serviceNo === service.serviceNo &&
                        field.busIndex === primaryArrival.index,
                    ),
                },
              )}
            >
              {formatArrivalTime(primaryArrival.arrival)}
            </span>
          </div>
        )}
      </div>

      {/* Route Info */}
      {hasRoute && (
        <div className="flex flex-col items-start gap-1.5 text-xs text-muted-foreground min-w-0 sm:flex-row sm:items-center">
          <span className="truncate shrink min-w-0">
            {primaryArrival?.arrival.originName ?? primaryArrival?.arrival.originCode}
          </span>
          <span className="hidden sm:inline shrink-0">→</span>
          <span className="sm:hidden shrink-0">↓</span>
          <span className="truncate shrink min-w-0">
            {primaryArrival?.arrival.destinationName ??
              primaryArrival?.arrival.destinationCode}
          </span>
        </div>
      )}

      {/* Arrivals */}
      {arrivalCandidates.length === 0 ? (
        <div className="text-sm text-muted-foreground">No arrivals</div>
      ) : (
        <div className="space-y-2">
          {primaryArrival && (
            <div className="flex items-center justify-end gap-1.5 sm:gap-2">
              {getLoadBadge(primaryArrival.arrival.load)}
              {getBusTypeBadge(primaryArrival.arrival.type)}
            </div>
          )}

          {secondaryArrivals.length > 0 && (
            <div
              className="space-y-1"
              data-testid={`secondary-arrivals-${service.serviceNo}`}
            >
              {secondaryArrivals.map((arrivalEntry) => {
                const isChanged = changedFields.some(
                  (field) =>
                    field.serviceNo === service.serviceNo &&
                    field.busIndex === arrivalEntry.index,
                );
                const isArriving = getArrivalInMinutes(arrivalEntry.arrival) <= 1;

                return (
                  <div
                    key={arrivalEntry.index}
                    className="grid grid-cols-2 gap-2 px-0.5 py-1 text-xs sm:text-sm"
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span
                        className={cn(
                          "arrival-time transition-colors duration-2000 ease-out",
                          {
                            "text-green-600 font-semibold": isChanged,
                            "font-semibold text-primary": isArriving && !isChanged,
                            "text-foreground": !isArriving && !isChanged,
                          },
                        )}
                      >
                        {formatArrivalTime(arrivalEntry.arrival)}
                      </span>
                    </div>
                    <div className="flex items-center justify-end gap-1 min-w-0">
                      {getLoadBadge(arrivalEntry.arrival.load, "compact")}
                      {getBusTypeBadge(arrivalEntry.arrival.type, "compact")}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
});

const getLoadBadge = (load: string, size: "default" | "compact" = "default") => {
  const badges: Record<string, { label: string; className: string }> = {
    SEA: {
      label: "Seats",
      className: "bg-green-600 text-white",
    },
    SDA: {
      label: "Standing",
      className: "bg-amber-600 text-white",
    },
    LSD: {
      label: "Limited",
      className: "bg-red-600 text-white",
    },
  };

  const badge = badges[load];
  if (!badge) return null;

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-md font-medium",
        size === "compact" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-xs",
        badge.className,
      )}
    >
      <span className="shrink-0">{badge.label}</span>
    </div>
  );
};

const getBusTypeBadge = (type: string, size: "default" | "compact" = "default") => {
  const busTypes: Record<
    string,
    {
      label: string;
      shortLabel: string;
      icon: ReactNode;
      variant: string;
    }
  > = {
    DD: {
      label: "Double",
      shortLabel: "DD",
      icon: <Layers className="h-3 w-3" />,
      variant:
        "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    },
    SD: {
      label: "Single",
      shortLabel: "SD",
      icon: <Bus className="h-3 w-3" />,
      variant: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
    },
    BD: {
      label: "Bendy",
      shortLabel: "BD",
      icon: <ArrowLeftRight className="h-3 w-3" />,
      variant:
        "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    },
  };

  const busType = busTypes[type];
  if (!busType) return null;

  return (
    <div
      className={cn(
        "flex items-center justify-center gap-1 rounded-md font-medium",
        size === "compact"
          ? "min-w-[62px] px-1 py-0.5 text-[10px] sm:text-[11px]"
          : "min-w-[80px] px-1.5 sm:px-2 py-0.5 text-xs",
        busType.variant,
      )}
    >
      {busType.icon}
      <span className="hidden xs:inline">
        {busType.label}
      </span>
      <span className="xs:hidden">
        {busType.shortLabel}
      </span>
    </div>
  );
};
