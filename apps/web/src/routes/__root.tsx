import { createRootRoute, Outlet, useRouterState } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { useEffect } from "react";
import { useFavoritesStore } from "@/features/favorites";
import { useBusStopsStore } from "@/features/search-bar/stores";
import { useThemeStore } from "@/features/theme";
import { UpdateBanner } from "@/features/service-worker";
import { HomeTutorialOverlay, useTutorialStore } from "@/features/tutorial";

const RootComponent = () => {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  useEffect(() => {
    useBusStopsStore.getState().fetchBusStops();
    useFavoritesStore.getState().loadFavorites();
    const cleanupTheme = useThemeStore.getState().initializeTheme();
    useTutorialStore.getState().initializeTutorialState();

    return cleanupTheme;
  }, []);

  useEffect(() => {
    if (pathname === "/" && !useTutorialStore.getState().hasCompletedOnce) {
      useTutorialStore.getState().startTutorial();
    }
  }, [pathname]);

  useEffect(() => {
    if (pathname !== "/" && useTutorialStore.getState().isOpen) {
      useTutorialStore.getState().closeTutorial();
    }
  }, [pathname]);

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 text-foreground antialiased">
      <div className="mx-auto max-w-2xl">
        <Outlet />
      </div>
      {pathname === "/" && <HomeTutorialOverlay />}
      {process.env.NODE_ENV === "development" && <TanStackRouterDevtools />}
      <UpdateBanner />
    </div>
  );
}

export const Route = createRootRoute({
  component: RootComponent,
});
