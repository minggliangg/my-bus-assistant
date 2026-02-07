import { Star, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useShallow } from "zustand/react/shallow";
import { useFavoritesStore } from "../stores";
import { useBusStopsStore } from "@/features/search-bar/stores";

interface FavoriteBusStopsProps {
  selectedBusStopCode?: string;
  onBusStopSelect: (busStopCode: string) => void;
  className?: string;
}

export const FavoriteBusStops = ({
  selectedBusStopCode,
  onBusStopSelect,
  className,
}: FavoriteBusStopsProps) => {
  const { favorites, loading: favoritesLoading } = useFavoritesStore(
    useShallow((state) => ({
      favorites: state.favorites,
      loading: state.loading
    }))
  );
  const busStopsLoading = useBusStopsStore((state) => state.loading);
  const getBusStopByCode = useBusStopsStore((state) => state.getBusStopByCode);

  const isLoading = favoritesLoading || (favorites.length > 0 && busStopsLoading);

  if (isLoading) {
    return (
      <div className={cn("min-h-[48px]", className)}>
        <div className="flex items-center gap-2 mb-2">
          <Star className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Favorites</span>
        </div>
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          <span className="text-xs text-muted-foreground">
            Loading favorites...
          </span>
        </div>
      </div>
    );
  }

  if (favorites.length === 0) {
    return (
      <div className={cn("min-h-[48px] flex items-center", className)}>
        <p className="text-xs text-muted-foreground">
          Star bus stops to add them to favorites
        </p>
      </div>
    );
  }

  return (
    <div className={cn("min-h-[48px]", className)}>
      <div className="flex items-center gap-2 mb-2.5">
        <Star className="h-3.5 w-3.5 text-amber-500" />
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Favorites</span>
      </div>

      <div className="flex flex-wrap gap-2">
        {favorites.map((code) => {
          const busStop = getBusStopByCode(code);
          if (!busStop) return null;

          const isSelected = code === selectedBusStopCode;

          return (
            <Badge
              key={code}
              variant={isSelected ? "default" : "outline"}
              className={cn(
                "cursor-pointer transition-all",
                isSelected
                  ? "shadow-md shadow-primary/20"
                  : "hover:shadow-md hover:border-primary/30",
              )}
              onClick={() => onBusStopSelect(code)}
            >
              <span className="truncate max-w-[150px] sm:max-w-[200px]">
                {busStop.description}
              </span>
            </Badge>
          );
        })}
      </div>
    </div>
  );
};
