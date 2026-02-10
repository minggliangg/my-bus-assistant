import {
  AutoRefreshControl,
  BusStopArrivalCard,
} from "@/features/bus-arrivals/components";
import { Button } from "@/components/ui/button";
import { FavoriteBusStops } from "@/features/favorites";
import {
  NearbyBusStopsButton,
  NearestBusStopsDialog,
  useNearbyStore,
} from "@/features/nearby-stops";
import { BusStopSearchComboBox } from "@/features/search-bar";
import { useBusStopsStore } from "@/features/search-bar/stores";
import { ThemeToggle } from "@/features/theme";
import { useTutorialStore } from "@/features/tutorial";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { CircleHelp } from "lucide-react";
import { useMemo, useState } from "react";
import { useShallow } from "zustand/react/shallow";

const Home = () => {
  const { busStop } = Route.useSearch();
  const navigate = useNavigate();
  const [dialogOpen, setDialogOpen] = useState(false);
  const startTutorial = useTutorialStore((state) => state.startTutorial);

  const handleBusStopSelect = (code: string | undefined) => {
    navigate({ to: "/", search: { busStop: code }, replace: true });
  };

  const handleNearbyDialogOpen = (open: boolean) => {
    setDialogOpen(open);

    if (open) {
      const busStops = useBusStopsStore.getState().busStops;
      const { requestLocation, findNearestStops } = useNearbyStore.getState();

      requestLocation()
        .then(() => findNearestStops(busStops, 5))
        .catch(() => {});
    }
  };

  const { nearestStops, loadingLocation, locationError, retry, location } =
    useNearbyStore(
      useShallow((state) => ({
        nearestStops: state.nearestStops,
        loadingLocation: state.loadingLocation,
        locationError: state.locationError,
        retry: state.retry,
        location: state.location,
      })),
    );

  const userLocation = useMemo(
    () =>
      location
        ? { latitude: location.latitude, longitude: location.longitude }
        : null,
    [location],
  );

  return (
    <div className="space-y-6">
      <header>
        <div className="flex flex-col gap-3 sm:grid sm:grid-cols-[1fr_auto_1fr] sm:items-start">
          <div className="space-y-1.5 text-center sm:col-start-2">
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              My Bus Assistant
            </h1>
            <p className="text-sm text-muted-foreground">
              Real-time bus arrival information at your fingertips
            </p>
          </div>
          <div className="flex items-center justify-center gap-2 sm:col-start-3 sm:row-start-1 sm:justify-self-end">
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Start tutorial"
              title="Tutorial"
              onClick={() => startTutorial({ force: true })}
            >
              <CircleHelp className="h-4 w-4" />
            </Button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className="flex gap-2 items-start rounded-xl bg-card border p-2 shadow-sm">
        <div className="flex-1 min-w-0">
          <BusStopSearchComboBox
            onBusStopSelect={handleBusStopSelect}
            defaultValue={busStop}
          />
        </div>
        <AutoRefreshControl busStopCode={busStop} />
        <NearbyBusStopsButton onOpenChange={handleNearbyDialogOpen} />
      </div>

      <FavoriteBusStops
        selectedBusStopCode={busStop}
        onBusStopSelect={handleBusStopSelect}
      />

      <BusStopArrivalCard busStopCode={busStop} />

      <NearestBusStopsDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        nearestStops={nearestStops}
        loading={loadingLocation}
        error={locationError}
        userLocation={userLocation}
        onBusStopSelect={(code) => {
          handleBusStopSelect(code);
        }}
        onRetry={retry}
      />

      <footer className="pt-10 pb-6 text-center">
        <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent mb-6" />
        <div className="flex flex-col items-center justify-center gap-2 text-xs text-muted-foreground sm:flex-row sm:gap-4">
          <Link
            to="/about"
            className="hover:text-primary transition-colors hover:underline underline-offset-4"
          >
            About & Attribution
          </Link>
          <span className="hidden text-border sm:inline">•</span>
          <Link
            to="/settings"
            data-tour-id="settings-link"
            className="hover:text-primary transition-colors hover:underline underline-offset-4"
          >
            Settings
          </Link>
          <span className="hidden text-border sm:inline">•</span>
          <a
            href="https://minggliangg.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-primary transition-colors hover:underline underline-offset-4"
          >
            Created by minggliangg
          </a>
        </div>
      </footer>
    </div>
  );
};

export const Route = createFileRoute("/")({
  component: Home,
  validateSearch: (search: Record<string, unknown>) => ({
    busStop: (search.busStop as string) || undefined,
  }),
});
