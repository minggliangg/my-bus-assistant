import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Clock, MapPin } from "lucide-react";
import { useEffect, useRef } from "react";
import type { BusRouteDirection } from "../models/bus-route-model";

const formatBusTime = (time: string): string => {
  if (!time || time === "-") return "-";
  const h = time.slice(0, 2);
  const m = time.slice(2, 4);
  return `${h}:${m}`;
};

interface ServiceRouteCardProps {
  direction: BusRouteDirection;
  highlightedStopCode?: string;
}

export const ServiceRouteCard = ({ direction, highlightedStopCode }: ServiceRouteCardProps) => {
  const stops = direction.stops;
  const firstStop = stops[0];
  const lastStop = stops[stops.length - 1];
  const highlightRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (highlightedStopCode && highlightRef.current) {
      const timeout = setTimeout(() => {
        highlightRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 300);
      return () => clearTimeout(timeout);
    }
  }, [highlightedStopCode]);

  return (
    <Card className="shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
            {direction.direction}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Direction {direction.direction}
            </span>
            {firstStop && lastStop && (
              <span className="text-sm font-medium text-foreground truncate">
                {firstStop.busStopName ?? firstStop.busStopCode}
                {" → "}
                {lastStop.busStopName ?? lastStop.busStopCode}
              </span>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="relative">
          {stops.map((stop, index) => {
            const isFirst = index === 0;
            const isLast = index === stops.length - 1;
            const isHighlighted = highlightedStopCode === stop.busStopCode;

            return (
              <div
                key={`${stop.busStopCode}-${stop.stopSequence}`}
                ref={isHighlighted ? highlightRef : undefined}
                className={cn(
                  "relative flex gap-3",
                  isHighlighted && "bg-primary/5 rounded-lg -mx-1 px-1",
                )}
              >
                {/* Timeline */}
                <div className="flex flex-col items-center">
                  <div
                    className={cn(
                      "h-3 w-3 shrink-0 rounded-full border-2 z-10",
                      isHighlighted
                        ? "border-primary bg-primary ring-4 ring-primary/20 motion-safe:animate-pulse"
                        : isFirst || isLast
                          ? "border-primary bg-primary"
                          : "border-primary/40 bg-background",
                    )}
                  />
                  {!isLast && (
                    <div className="w-0.5 flex-1 bg-primary/20" />
                  )}
                </div>

                {/* Stop info */}
                <div className={cn("pb-4 min-w-0 flex-1", isLast && "pb-0")}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className={cn(
                        "text-sm font-medium leading-tight",
                        isHighlighted ? "text-primary font-semibold" : "text-foreground",
                      )}>
                        {stop.busStopName ?? stop.busStopCode}
                        {isHighlighted && (
                          <span className="ml-1.5 inline-flex items-center rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                            You are here
                          </span>
                        )}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[11px] text-muted-foreground font-mono">
                          {stop.busStopCode}
                        </span>
                        {stop.roadName && (
                          <>
                            <span className="text-muted-foreground/40">·</span>
                            <span className="text-[11px] text-muted-foreground truncate">
                              {stop.roadName}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <span className="text-[10px] text-muted-foreground/60 shrink-0 tabular-nums mt-0.5">
                      {stop.distance.toFixed(1)} km
                    </span>
                  </div>

                  {/* Bus times - shown for first and last stops, collapsed for others */}
                  {(isFirst || isLast) && (
                    <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5">
                      <BusTimeChip label="WD" first={stop.wdFirstBus} last={stop.wdLastBus} />
                      <BusTimeChip label="SAT" first={stop.satFirstBus} last={stop.satLastBus} />
                      <BusTimeChip label="SUN" first={stop.sunFirstBus} last={stop.sunLastBus} />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-4 flex items-center gap-4 border-t border-dashed pt-3">
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <MapPin className="h-3 w-3" />
            <span>{stops.length} stops</span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>First / Last bus times at terminals</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const BusTimeChip = ({
  label,
  first,
  last,
}: {
  label: string;
  first: string;
  last: string;
}) => (
  <span className="text-[10px] text-muted-foreground">
    <span className="font-medium">{label}</span>{" "}
    <span className="tabular-nums">{formatBusTime(first)}</span>
    <span className="text-muted-foreground/40"> – </span>
    <span className="tabular-nums">{formatBusTime(last)}</span>
  </span>
);
