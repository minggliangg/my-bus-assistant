import {
  MapPin,
  MapPinOff,
  AlertCircle,
  Loader2,
  Navigation,
  ChevronRight,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { NearbyBusStop } from "../models/nearby-stops-model";
import { formatDistance } from "../utils/geolocation";
import { useState, useRef, useCallback, Suspense, lazy } from "react";

const Map = lazy(() => import("@/components/ui/map"));

interface NearestBusStopsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nearestStops: NearbyBusStop[];
  loading: boolean;
  error: string | null;
  userLocation: { latitude: number; longitude: number } | null;
  onBusStopSelect: (code: string) => void;
  onRetry: () => void;
}

export const NearestBusStopsDialog = ({
  open,
  onOpenChange,
  nearestStops,
  loading,
  error,
  userLocation,
  onBusStopSelect,
  onRetry,
}: NearestBusStopsDialogProps) => {
  const isPermissionDenied = error?.toLowerCase().includes("permission");
  const [selectedStopCode, setSelectedStopCode] = useState<string | null>(null);
  const listItemRefs = useRef<globalThis.Map<string, HTMLDivElement>>(new globalThis.Map());

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setSelectedStopCode(null);
    }
    onOpenChange(nextOpen);
  };

  const handleViewArrivals = (code: string) => {
    onBusStopSelect(code);
    onOpenChange(false);
  };

  const handleListItemClick = (code: string) => {
    if (selectedStopCode === code) {
      handleViewArrivals(code);
    } else {
      setSelectedStopCode(code);
    }
  };

  const scrollToListItem = useCallback((code: string) => {
    const el = listItemRefs.current.get(code);
    el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, []);

  const handleMarkerClick = (code: string) => {
    setSelectedStopCode(code);
    scrollToListItem(code);
  };

  const setListItemRef = useCallback(
    (code: string, el: HTMLDivElement | null) => {
      if (el) {
        listItemRefs.current.set(code, el);
      } else {
        listItemRefs.current.delete(code);
      }
    },
    [],
  );

  const sortedStops = [...nearestStops].sort(
    (a, b) => a.distance - b.distance,
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle>Nearest Bus Stops</DialogTitle>
          <DialogDescription>Select a stop to view arrivals</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin" />
              <p>Finding nearest stops...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-16">
            <div className="flex flex-col items-center gap-3 text-center px-4">
              {isPermissionDenied ? (
                <MapPinOff className="h-12 w-12 text-destructive" />
              ) : (
                <AlertCircle className="h-12 w-12 text-muted-foreground" />
              )}
              <p className="font-medium">{error}</p>
              {!isPermissionDenied && (
                <Button onClick={onRetry} variant="outline" size="sm">
                  Retry
                </Button>
              )}
              {isPermissionDenied && (
                <p className="text-sm text-muted-foreground">
                  Enable location access in your browser settings
                </p>
              )}
            </div>
          </div>
        ) : nearestStops.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-center text-muted-foreground">
              <MapPin className="h-12 w-12 mx-auto mb-3" />
              <p>No bus stops found</p>
            </div>
          </div>
        ) : (
          <>
            {/* Compact map for spatial context */}
            <div className="relative min-h-[200px] h-[30vh]">
              <Suspense fallback={null}>
                <Map
                  className="rounded-lg"
                  userLocation={userLocation}
                  busStops={nearestStops}
                  onBusStopClick={handleMarkerClick}
                  selectedStopCode={selectedStopCode ?? undefined}
                />
              </Suspense>
            </div>

            {/* Scrollable stop list */}
            <div className="overflow-y-auto max-h-[35vh] border-t border-border">
              {sortedStops.map((stop) => {
                const isSelected = selectedStopCode === stop.busStopCode;
                return (
                  <div
                    key={stop.busStopCode}
                    ref={(el) => setListItemRef(stop.busStopCode, el)}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleListItemClick(stop.busStopCode)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleListItemClick(stop.busStopCode);
                      }
                    }}
                    className={`flex items-center gap-3 px-4 py-3 cursor-pointer border-b border-border last:border-b-0 transition-colors ${
                      isSelected
                        ? "bg-accent"
                        : "hover:bg-muted/50 active:bg-muted"
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-bold">
                          {stop.busStopCode}
                        </span>
                        <span className="text-muted-foreground text-xs">·</span>
                        <span className="text-sm text-muted-foreground truncate">
                          {stop.roadName}
                        </span>
                      </div>
                      <p className="text-sm text-foreground truncate mt-0.5">
                        {stop.description}
                      </p>
                    </div>
                    <Badge
                      variant="secondary"
                      className="shrink-0 text-xs tabular-nums"
                    >
                      <Navigation className="h-3 w-3 mr-1" />
                      {formatDistance(stop.distance)}
                    </Badge>
                    {isSelected ? (
                      <Button
                        size="sm"
                        className="shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewArrivals(stop.busStopCode);
                        }}
                      >
                        View
                      </Button>
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
