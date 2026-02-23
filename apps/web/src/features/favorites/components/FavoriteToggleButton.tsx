import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useFavoritesStore } from "../stores";

interface FavoriteToggleButtonProps {
  busStopCode: string;
  className?: string;
  "data-tour-id"?: string;
}

export const FavoriteToggleButton = ({
  busStopCode,
  className,
  "data-tour-id": dataTourId,
}: FavoriteToggleButtonProps) => {
  const { isFavorited, toggleFavorite } = useFavoritesStore();
  const favorited = isFavorited(busStopCode);

  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn("h-9 w-9", className)}
      onClick={() => void toggleFavorite(busStopCode)}
      aria-label={favorited ? "Remove from favorites" : "Add to favorites"}
      data-tour-id={dataTourId}
    >
      <Star
        className={cn(
          "h-5 w-5 transition-colors",
          favorited
            ? "fill-yellow-400 text-yellow-400"
            : "text-muted-foreground hover:text-yellow-400",
        )}
      />
    </Button>
  );
};
