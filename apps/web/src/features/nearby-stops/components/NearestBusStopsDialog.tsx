import {
  MapPin,
  MapPinOff,
  Clock,
  AlertCircle,
  Loader2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { NearbyBusStop } from "../models/nearby-stops-model";
import { formatDistance } from "../utils/geolocation";

interface NearestBusStopsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nearestStops: NearbyBusStop[];
  loading: boolean;
  error: string | null;
  onBusStopSelect: (code: string) => void;
  onRetry: () => void;
}

export const NearestBusStopsDialog = ({
  open,
  onOpenChange,
  nearestStops,
  loading,
  error,
  onBusStopSelect,
  onRetry,
}: NearestBusStopsDialogProps) => {
  const isPermissionDenied = error?.toLowerCase().includes("permission");

  const handleStopClick = (code: string) => {
    onBusStopSelect(code);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nearest Bus Stops</DialogTitle>
          <DialogDescription>Select a stop to view arrivals</DialogDescription>
        </DialogHeader>

        <div className="min-h-[200px] flex items-center justify-center">
          {loading ? (
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin" />
              <p>Finding nearest stops...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center gap-3 text-center px-4">
              {isPermissionDenied ? (
                <MapPinOff className="h-12 w-12 text-destructive" />
              ) : error.toLowerCase().includes("timeout") ? (
                <Clock className="h-12 w-12 text-muted-foreground" />
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
          ) : nearestStops.length === 0 ? (
            <div className="text-center text-muted-foreground">
              <MapPin className="h-12 w-12 mx-auto mb-3" />
              <p>No bus stops found</p>
            </div>
          ) : (
            <div className="w-full space-y-2 py-2">
              {nearestStops.map((stop) => (
                <button
                  key={stop.busStopCode}
                  onClick={() => handleStopClick(stop.busStopCode)}
                  className={cn(
                    "w-full flex items-start gap-3 p-3 rounded-lg text-left transition-colors hover:bg-accent hover:text-accent-foreground",
                    "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-sm font-bold text-foreground">
                        {stop.busStopCode}
                      </span>
                      <span
                        className={cn(
                          "text-xs font-medium px-2 py-0.5 rounded-full",
                          "bg-primary/10 text-primary",
                        )}
                      >
                        {formatDistance(stop.distance)}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-foreground truncate">
                      {stop.description}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {stop.roadName}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
