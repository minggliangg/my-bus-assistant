import {
  AutoRefreshControl,
  BusStopArrivalCard,
} from "@/features/bus-arrivals/components";
import { FavoriteBusStops } from "@/features/favorites";
import {
  NearbyBusStopsButton,
  NearestBusStopsDialog,
  useNearbyStore,
} from "@/features/nearby-stops";
import { BusStopSearchComboBox } from "@/features/search-bar";
import { useBusStopsStore } from "@/features/search-bar/stores";
import { ThemeToggle } from "@/features/theme";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useShallow } from "zustand/react/shallow";

export const Route = createFileRoute("/")({
  component: Home,
  validateSearch: (search: Record<string, unknown>) => ({
    busStop: (search.busStop as string) || undefined,
  }),
});

function Home() {
  const { busStop } = Route.useSearch();
  const navigate = useNavigate();
  const [dialogOpen, setDialogOpen] = useState(false);

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
      <header className="relative">
        <div className="flex items-start justify-center">
          <div className="space-y-1.5 text-center">
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              My Bus Assistant
            </h1>
            <p className="text-sm text-muted-foreground">
              Real-time bus arrival information at your fingertips
            </p>
          </div>
        </div>
        <div className="absolute right-0 top-0">
          <ThemeToggle />
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
        <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
          <Link
            to="/about"
            className="hover:text-primary transition-colors hover:underline underline-offset-4"
          >
            About & Attribution
          </Link>
          <span className="text-border">•</span>
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
}
