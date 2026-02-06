import { createRootRoute, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { useEffect } from "react";
import { useFavoritesStore } from "@/features/favorites";
import { useBusStopsStore } from "@/features/search-bar/stores";
import { useThemeStore } from "@/features/theme";

function RootComponent() {
  useEffect(() => {
    useBusStopsStore.getState().fetchBusStops();
    useFavoritesStore.getState().loadFavorites();
    const cleanupTheme = useThemeStore.getState().initializeTheme();

    return cleanupTheme;
  }, []);

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 text-foreground">
      <div className="mx-auto max-w-2xl">
        <Outlet />
      </div>
      {process.env.NODE_ENV === "development" && <TanStackRouterDevtools />}
    </div>
  );
}

export const Route = createRootRoute({
  component: RootComponent,
});
