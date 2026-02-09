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
import { memo, useEffect, useState, type ReactNode } from "react";
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

const formatRelativeTime = (timestamp: number, now: number = Date.now()): string => {
  const seconds = Math.floor((now - timestamp) / 1000);
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.floor(minutes / 60)}h ago`;
};

export const BusStopArrivalCard = ({
  busStopCode,
}: BusStopArrivalCardProps) => {
  const { busStop, loading, error, changedFields, isStale, isFetching, lastUpdateTimestamp } =
    useBusStore(
      useShallow((state) => ({
        busStop: state.busStop,
        loading: state.loading,
        error: state.error,
        changedFields: state.changedFields,
        isStale: state.isStale,
        isFetching: state.isFetching,
        lastUpdateTimestamp: state.lastUpdateTimestamp,
      })),
    );
  const fetchBusArrivals = useBusStore((state) => state.fetchBusArrivals);

  const [currentTime, setCurrentTime] = useState(Date.now);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => clearInterval(intervalId);
  }, []);

  const relativeTime = lastUpdateTimestamp ? formatRelativeTime(lastUpdateTimestamp, currentTime) : null;

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
    <Card className="shadow-md">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 flex-1">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
              <MapPin className="h-6 w-6 text-primary" />
            </div>
            <div className="flex flex-col text-left">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Bus Stop
              </p>
              <h3 className="text-lg font-bold text-foreground tracking-tight">
                {busStop.busStopCode}
              </h3>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <FavoriteToggleButton busStopCode={busStop.busStopCode} />
            <div className="flex h-9 items-center rounded-lg bg-primary/5 border border-primary/10 px-3">
              <Bus className="h-4 w-4 text-primary/60 mr-2" />
              <span className="text-sm font-bold text-primary/80">
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

      {(relativeTime || (isStale && !isFetching)) && (
        <CardFooter className="pt-0">
          <div className="flex w-full items-center justify-between border-t border-dashed pt-4">
            {relativeTime && (
              <span className="text-xs text-muted-foreground">
                Updated {relativeTime}
              </span>
            )}
            {isStale && !isFetching && (
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 ml-auto">
                <div className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                <span className="text-xs font-medium">Cached data shown</span>
              </div>
            )}
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

const ArrivalRow = ({
  arrivalEntry,
  serviceNo,
  changedFields,
  isPrimary,
}: {
  arrivalEntry: ArrivalEntry;
  serviceNo: string;
  changedFields: ChangedField[];
  isPrimary: boolean;
}) => {
  const isChanged = changedFields.some(
    (field) =>
      field.serviceNo === serviceNo &&
      field.busIndex === arrivalEntry.index,
  );
  const isArriving = getArrivalInMinutes(arrivalEntry.arrival) <= 1;
  const size = isPrimary ? "default" as const : "compact" as const;

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2",
        isPrimary ? "py-0.5" : "py-0.5",
      )}
      data-testid={isPrimary ? `primary-arrival-${serviceNo}` : undefined}
    >
      <span
        className={cn(
          "arrival-time font-semibold tabular-nums transition-colors duration-2000 ease-out",
          isPrimary ? "text-xl sm:text-2xl" : "text-sm",
          {
            "text-green-600": isChanged,
            "text-primary": isArriving && !isChanged,
            "text-foreground": !isArriving && !isChanged,
          },
        )}
      >
        {formatArrivalTime(arrivalEntry.arrival)}
      </span>
      <div className="flex items-center gap-1.5">
        {getLoadBadge(arrivalEntry.arrival.load, size)}
        {getBusTypeBadge(arrivalEntry.arrival.type, size)}
      </div>
    </div>
  );
};

const BusServiceRow = memo(({ service, changedFields }: BusServiceRowProps) => {
  const arrivalCandidates: ArrivalEntry[] = [service.nextBus, service.nextBus2, service.nextBus3]
    .map((arrival, index) => (arrival ? { arrival, index } : null))
    .filter((entry): entry is ArrivalEntry => Boolean(entry));

  const hasChanges = changedFields.some(
    (field) => field.serviceNo === service.serviceNo,
  );

  const primaryArrival = arrivalCandidates[0];
  const secondaryArrivals = arrivalCandidates.slice(1);
  const hasRoute =
    primaryArrival?.arrival.originName || primaryArrival?.arrival.destinationName;

  return (
    <div
      className="rounded-lg border bg-card p-3 sm:p-4 transition-colors hover:border-primary/20"
      data-testid={`service-row-${service.serviceNo}`}
    >
      {/* Header: Service badge + operator + updated indicator */}
      <div
        className="mb-2 flex flex-wrap items-start gap-2.5"
        data-testid={`service-header-${service.serviceNo}`}
      >
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
            getOperatorBadgeColors(service.operator),
          )}
        >
          <span className="text-sm font-bold">{service.serviceNo}</span>
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="text-xs text-muted-foreground truncate">
            {getOperatorFullName(service.operator)}
          </span>
          {hasRoute && (
            <span
              className="text-[11px] leading-snug text-muted-foreground/70 whitespace-normal break-words"
              data-testid={`service-route-${service.serviceNo}`}
            >
              {primaryArrival?.arrival.originName ?? primaryArrival?.arrival.originCode}
              {" → "}
              {primaryArrival?.arrival.destinationName ?? primaryArrival?.arrival.destinationCode}
            </span>
          )}
        </div>
        {hasChanges && (
          <div
            className="flex shrink-0 items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 dark:bg-green-900/30 sm:ml-auto"
            data-testid={`service-updated-${service.serviceNo}`}
          >
            <div className="h-1.5 w-1.5 bg-green-500 rounded-full animate-pulse" />
            <span className="text-[10px] text-green-700 dark:text-green-400 font-medium">
              Updated
            </span>
          </div>
        )}
      </div>

      {/* Arrival rows - each row has time + badges together */}
      {arrivalCandidates.length === 0 ? (
        <div className="text-sm text-muted-foreground pl-1 mt-1">No arrivals</div>
      ) : (
        <div className="pl-1 mt-1 space-y-1" data-testid={secondaryArrivals.length > 0 ? `secondary-arrivals-${service.serviceNo}` : undefined}>
          {arrivalCandidates.map((entry, i) => (
            <ArrivalRow
              key={entry.index}
              arrivalEntry={entry}
              serviceNo={service.serviceNo}
              changedFields={changedFields}
              isPrimary={i === 0}
            />
          ))}
        </div>
      )}
    </div>
  );
});

const getLoadBadge = (load: string, size: "default" | "compact" = "default") => {
  const badges: Record<string, { label: string; dotColor: string; className: string }> = {
    SEA: {
      label: "Seats",
      dotColor: "bg-emerald-500",
      className: "bg-emerald-500 text-white dark:bg-emerald-600",
    },
    SDA: {
      label: "Standing",
      dotColor: "bg-amber-500",
      className: "bg-amber-500 text-white dark:bg-amber-600",
    },
    LSD: {
      label: "Limited",
      dotColor: "bg-rose-500",
      className: "bg-rose-500 text-white dark:bg-rose-600",
    },
  };

  const badge = badges[load];
  if (!badge) return null;

  return (
    <>
      {/* Dot indicator below xs breakpoint */}
      <div
        className={cn(
          "xs:hidden h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-background",
          badge.dotColor,
        )}
        role="img"
        aria-label={badge.label}
        title={badge.label}
      />
      {/* Full badge at xs and above */}
      <div
        className={cn(
          "hidden xs:flex items-center justify-center rounded-md font-medium",
          size === "compact" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-xs",
          badge.className,
        )}
      >
        <span className="shrink-0">{badge.label}</span>
      </div>
    </>
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
