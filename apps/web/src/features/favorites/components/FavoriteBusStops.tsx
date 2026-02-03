import { Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
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
  const { favorites } = useFavoritesStore();
  const { getBusStopByCode } = useBusStopsStore();

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
      <div className="flex items-center gap-2 mb-2">
        <Star className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Favorites</span>
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
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => onBusStopSelect(code)}
            >
              <span className="font-mono">{code}</span>
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
