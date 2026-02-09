import { ServiceRouteCard, useBusRouteStore } from "@/features/bus-routes";
import {
  getOperatorBadgeColors,
  getOperatorFullName,
} from "@/features/bus-arrivals/utils";
import { ThemeToggle } from "@/features/theme";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Link, useParams, useSearch } from "@tanstack/react-router";
import { ArrowLeft, Loader2, Route as RouteIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import {
  Card,
  CardContent,
} from "@/components/ui/card";

export function ServiceRoutePage() {
  const { serviceNo } = useParams({ from: "/service/$serviceNo" });
  const { fromStop } = useSearch({ from: "/service/$serviceNo" });

  const { route, loading, error } = useBusRouteStore(
    useShallow((state) => ({
      route: state.route,
      loading: state.loading,
      error: state.error,
    })),
  );
  const fetchRoute = useBusRouteStore((state) => state.fetchRoute);

  useEffect(() => {
    fetchRoute(serviceNo);
  }, [serviceNo, fetchRoute]);

  // Find which direction contains the fromStop, default to 1
  const initialDirection = useMemo(() => {
    if (!fromStop || !route) return 1;
    const match = route.directions.find((dir) =>
      dir.stops.some((s) => s.busStopCode === fromStop),
    );
    return match?.direction ?? 1;
  }, [fromStop, route]);

  const [activeDirection, setActiveDirection] = useState<number>(initialDirection);

  // Sync activeDirection when initialDirection changes (e.g. route data loads)
  useEffect(() => {
    setActiveDirection(initialDirection);
  }, [initialDirection]);

  const activeDir = route?.directions.find((d) => d.direction === activeDirection);
  const hasMultipleDirections = route && route.directions.length > 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="relative">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            search={{ busStop: fromStop }}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border bg-card text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div
              className={cn(
                "flex h-11 w-11 shrink-0 items-center justify-center rounded-full",
                route
                  ? getOperatorBadgeColors(route.operator)
                  : "bg-primary text-primary-foreground",
              )}
            >
              <span className="text-sm font-bold">{serviceNo}</span>
            </div>
            <div className="flex flex-col min-w-0">
              <h1 className="text-xl font-bold text-foreground tracking-tight">
                Bus {serviceNo}
              </h1>
              {route && (
                <p className="text-xs text-muted-foreground">
                  {getOperatorFullName(route.operator)}
                </p>
              )}
            </div>
          </div>
        </div>
        <div className="absolute right-0 top-0">
          <ThemeToggle />
        </div>
      </header>

      {/* Content */}
      {loading && (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      )}

      {error && (
        <Card className="border-destructive">
          <CardContent className="py-6">
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {!loading && !error && route && route.directions.length === 0 && (
        <Card>
          <CardContent className="py-6">
            <p className="text-sm text-muted-foreground text-center">
              No route data available for this service
            </p>
          </CardContent>
        </Card>
      )}

      {/* Direction toggle */}
      {!loading && !error && route && hasMultipleDirections && (
        <div className="flex rounded-lg border bg-muted p-1 gap-1">
          {route.directions.map((dir) => {
            const first = dir.stops[0];
            const last = dir.stops[dir.stops.length - 1];
            const label = first && last
              ? `${first.busStopName ?? first.busStopCode} → ${last.busStopName ?? last.busStopCode}`
              : `Direction ${dir.direction}`;
            const isActive = dir.direction === activeDirection;

            return (
              <Button
                key={dir.direction}
                variant={isActive ? "default" : "ghost"}
                size="sm"
                className={cn(
                  "flex-1 text-xs truncate h-auto py-1.5 px-2",
                  !isActive && "text-muted-foreground",
                )}
                onClick={() => setActiveDirection(dir.direction)}
              >
                {label}
              </Button>
            );
          })}
        </div>
      )}

      {/* Active direction card */}
      {!loading && !error && route && activeDir && (
        <div key={activeDirection} className="animate-in fade-in duration-200">
          <ServiceRouteCard
            direction={activeDir}
            highlightedStopCode={fromStop}
          />
        </div>
      )}

      {/* Footer */}
      <footer className="pt-4 pb-6 text-center">
        <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent mb-6" />
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <RouteIcon className="h-3 w-3" />
          <span>Route data is cached locally for faster access</span>
        </div>
      </footer>
    </div>
  );
}
