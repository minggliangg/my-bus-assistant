import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { FavoriteToggleButton } from "@/features/favorites";
import { Bus, MapPin } from "lucide-react";
import { DEMO_BUS_STOP } from "../models/demo-bus-stop";

/**
 * A demo bus stop card shown during the tutorial to demonstrate
 * the favorite feature. This is displayed when the tutorial is on
 * the "favorite-stop" step and no bus stop is currently selected.
 */
export const DemoBusStopCard = () => {
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
                {DEMO_BUS_STOP.busStopCode}
              </h3>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <FavoriteToggleButton
              busStopCode={DEMO_BUS_STOP.busStopCode}
              data-tour-id="favorite-stop"
            />
            <div className="flex h-9 items-center rounded-lg bg-primary/5 border border-primary/10 px-3">
              <Bus className="h-4 w-4 text-primary/60 mr-2" />
              <span className="text-sm font-bold text-primary/80">
                {DEMO_BUS_STOP.services.length}
              </span>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="rounded-lg border bg-card p-3 sm:p-4">
          <div className="mb-2 flex flex-wrap items-start gap-2.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-500 text-white">
              <span className="text-sm font-bold">TUT</span>
            </div>
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="text-xs text-muted-foreground truncate">
                SBS Transit
              </span>
            </div>
          </div>
          <div className="pl-1 mt-1">
            <div className="flex items-center justify-between gap-2 py-0.5">
              <span className="text-xl sm:text-2xl font-semibold tabular-nums text-foreground">
                5 min
              </span>
              <div className="flex items-center gap-1.5">
                <div className="bg-emerald-500 text-white text-xs px-2 py-0.5 rounded-md font-medium">
                  Seats
                </div>
                <div className="bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400 text-xs px-1.5 py-0.5 rounded-md font-medium min-w-[80px] flex items-center justify-center gap-1">
                  <Bus className="h-3 w-3" />
                  Single
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
