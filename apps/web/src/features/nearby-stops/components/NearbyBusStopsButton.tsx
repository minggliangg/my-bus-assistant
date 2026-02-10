import { Navigation } from "lucide-react";
import { cn } from "@/lib/utils";
import useNearbyStore from "../stores/useNearbyStore";

interface NearbyBusStopsButtonProps {
  onOpenChange: (open: boolean) => void;
  disabled?: boolean;
  className?: string;
}

export const NearbyBusStopsButton = ({
  onOpenChange,
  disabled = false,
  className,
}: NearbyBusStopsButtonProps) => {
  const { loadingLocation, locationError } = useNearbyStore();

  return (
    <button
      data-tour-id="nearby-stops"
      onClick={() => onOpenChange(true)}
      disabled={disabled}
      className={cn(
        "relative flex h-10 items-center gap-2 rounded-lg px-3 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0",
        locationError
          ? "bg-destructive/10 text-destructive hover:bg-destructive/20"
          : "bg-muted text-muted-foreground hover:bg-muted/80",
        className,
      )}
      aria-label="Find nearby bus stops"
      aria-busy={loadingLocation}
    >
      <Navigation className="h-4 w-4" />
      <span className="hidden text-sm font-medium sm:block">Nearby</span>
    </button>
  );
};
