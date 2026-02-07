import {
  MapPin,
  MapPinOff,
  AlertCircle,
  Loader2,
  Navigation,
  X,
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
import { useState, useEffect, Suspense, lazy } from "react";

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
  const [selectedStop, setSelectedStop] = useState<NearbyBusStop | null>(null);
  const [showInfoOverlay, setShowInfoOverlay] = useState(true);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setSelectedStop(null);
    }
    onOpenChange(nextOpen);
  };

  const handleStopClick = (code: string) => {
    onBusStopSelect(code);
    onOpenChange(false);
  };

  const handleMarkerClick = (code: string) => {
    const stop = nearestStops.find((s) => s.busStopCode === code);
    if (stop) {
      setSelectedStop(stop);
    }
  };

  const handleSelectStop = () => {
    if (selectedStop) {
      handleStopClick(selectedStop.busStopCode);
    }
  };

  useEffect(() => {
    if (!open || loading || error || nearestStops.length === 0) return;

    const timer = setTimeout(() => {
      setShowInfoOverlay(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, [open, loading, error, nearestStops.length]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle>Nearest Bus Stops</DialogTitle>
          <DialogDescription>Select a stop to view arrivals</DialogDescription>
        </DialogHeader>

        <div className="relative min-h-[400px] h-[50vh]">
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-muted/20">
              <div className="flex flex-col items-center gap-3 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin" />
                <p>Finding nearest stops...</p>
              </div>
            </div>
          ) : error ? (
            <div className="absolute inset-0 flex items-center justify-center bg-muted/20">
              <div className="flex flex-col items-center gap-3 text-center px-4">
                {isPermissionDenied ? (
                  <MapPinOff className="h-12 w-12 text-destructive" />
                ) : error.toLowerCase().includes("timeout") ? (
                  <AlertCircle className="h-12 w-12 text-muted-foreground" />
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
            <div className="absolute inset-0 flex items-center justify-center bg-muted/20">
              <div className="text-center text-muted-foreground">
                <MapPin className="h-12 w-12 mx-auto mb-3" />
                <p>No bus stops found</p>
              </div>
            </div>
          ) : (
            <>
              <Suspense fallback={null}>
                <Map
                  className="rounded-lg"
                  userLocation={userLocation}
                  busStops={nearestStops}
                  onBusStopClick={handleMarkerClick}
                  selectedStopCode={selectedStop?.busStopCode}
                />
              </Suspense>

              {/* Info overlay */}
              {showInfoOverlay && (
                <div className="absolute top-4 left-4 right-4 flex gap-2 transition-opacity duration-500 ease-out">
                  <div className="bg-background/95 backdrop-blur-sm border border-border rounded-lg px-3 py-2 shadow-md">
                    <p className="text-sm font-medium">
                      {nearestStops.length} nearby stop
                      {nearestStops.length !== 1 ? "s" : ""} found
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Click a marker to select
                    </p>
                  </div>
                </div>
              )}

              {/* Selected stop card */}
              {selectedStop && (
                <div className="absolute bottom-4 left-4 right-4">
                  <div className="bg-background/95 backdrop-blur-sm border border-border rounded-lg p-4 shadow-md">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-sm font-bold text-foreground">
                            {selectedStop.busStopCode}
                          </span>
                          <Badge variant="secondary" className="text-xs">
                            <Navigation className="h-3 w-3 mr-1" />
                            {formatDistance(selectedStop.distance)}
                          </Badge>
                        </div>
                        <p className="text-sm font-medium text-foreground truncate">
                          {selectedStop.description}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {selectedStop.roadName}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={handleSelectStop}
                          size="sm"
                          className="shrink-0"
                        >
                          View Arrivals
                        </Button>
                        <Button
                          onClick={() => setSelectedStop(null)}
                          variant="ghost"
                          size="icon"
                          className="shrink-0 h-8 w-8"
                          aria-label="Clear selection"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
