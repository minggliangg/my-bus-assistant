import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { createMemoryHistory, RouterProvider, createRouter } from "@tanstack/react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import useThemeStore from "../features/theme/stores/useThemeStore";
import useBusStopsStore from "../features/search-bar/stores/useBusStopsStore";
import useFavoritesStore from "../features/favorites/stores/useFavoritesStore";
import useTutorialStore from "../features/tutorial/stores/useTutorialStore";
import { clearTutorialCompleted } from "../features/tutorial/lib/tutorial-storage";
import { routeTree } from "../routeTree.gen";
import * as busStopsDb from "@/lib/storage/bus-stops-db";
import "fake-indexeddb/auto";

const originalMatchMedia = window.matchMedia;

describe("Root Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useBusStopsStore.getState().reset();
    useThemeStore.setState({ theme: "system", effectiveTheme: "light" });
    useFavoritesStore.setState({ favorites: [], loading: true, error: null });
    clearTutorialCompleted();
    useTutorialStore.setState({
      isOpen: false,
      currentStepIndex: 0,
      hasCompletedOnce: false,
    });

    vi.stubEnv("VITE_BUS_STOPS_REFRESH_DAYS", "7");

    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: query === "(prefers-color-scheme: dark)",
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })) as unknown as typeof window.matchMedia;

    document.documentElement.classList.remove("dark");
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
    document.documentElement.classList.remove("dark");
    vi.restoreAllMocks();
  });

  describe("Initialization on mount", () => {
    it("should call fetchBusStops on mount", async () => {
      const mockStops = [
        {
          busStopCode: "01012",
          roadName: "Victoria St",
          description: "Hotel Grand Pacific",
          latitude: 1.296848,
          longitude: 103.852535,
        },
      ];

      vi.spyOn(busStopsDb, "getAllBusStops").mockResolvedValue(mockStops);
      vi.spyOn(busStopsDb, "getLastUpdate").mockResolvedValue(Date.now());
      vi.spyOn(busStopsDb, "getAllFavorites").mockResolvedValue([]);

      const history = createMemoryHistory({ initialEntries: ["/"] });
      const router = createRouter({ routeTree, history });

      render(<RouterProvider router={router} />);

      await waitFor(() => {
        expect(busStopsDb.getAllBusStops).toHaveBeenCalled();
      });
    });

    it("should call loadFavorites on mount", async () => {
      const mockFavorites = ["01012", "01013"];

      vi.spyOn(busStopsDb, "getAllBusStops").mockResolvedValue([]);
      vi.spyOn(busStopsDb, "getLastUpdate").mockResolvedValue(Date.now());
      vi.spyOn(busStopsDb, "getAllFavorites").mockResolvedValue(mockFavorites);

      const history = createMemoryHistory({ initialEntries: ["/"] });
      const router = createRouter({ routeTree, history });

      render(<RouterProvider router={router} />);

      await waitFor(() => {
        expect(busStopsDb.getAllFavorites).toHaveBeenCalled();
      });
    });

    it("should call initializeTheme on mount", async () => {
      vi.spyOn(busStopsDb, "getAllBusStops").mockResolvedValue([]);
      vi.spyOn(busStopsDb, "getLastUpdate").mockResolvedValue(Date.now());
      vi.spyOn(busStopsDb, "getAllFavorites").mockResolvedValue([]);

      const initializeThemeSpy = vi.spyOn(useThemeStore.getState(), "initializeTheme");

      const history = createMemoryHistory({ initialEntries: ["/"] });
      const router = createRouter({ routeTree, history });

      render(<RouterProvider router={router} />);

      await waitFor(() => {
        expect(initializeThemeSpy).toHaveBeenCalled();
      });
    });

    it("should apply dark theme when saved theme is dark", async () => {
      const getItemSpy = vi.spyOn(localStorage, "getItem").mockReturnValue("dark");

      vi.spyOn(busStopsDb, "getAllBusStops").mockResolvedValue([]);
      vi.spyOn(busStopsDb, "getLastUpdate").mockResolvedValue(Date.now());
      vi.spyOn(busStopsDb, "getAllFavorites").mockResolvedValue([]);

      const history = createMemoryHistory({ initialEntries: ["/"] });
      const router = createRouter({ routeTree, history });

      render(<RouterProvider router={router} />);

      await waitFor(() => {
        expect(useThemeStore.getState().theme).toBe("dark");
        expect(useThemeStore.getState().effectiveTheme).toBe("dark");
      });

      getItemSpy.mockRestore();
    });

    it("auto-opens tutorial on first visit to /", async () => {
      vi.spyOn(busStopsDb, "getAllBusStops").mockResolvedValue([]);
      vi.spyOn(busStopsDb, "getLastUpdate").mockResolvedValue(Date.now());
      vi.spyOn(busStopsDb, "getAllFavorites").mockResolvedValue([]);

      const history = createMemoryHistory({ initialEntries: ["/"] });
      const router = createRouter({ routeTree, history });

      render(<RouterProvider router={router} />);

      await waitFor(() => {
        expect(
          screen.getByRole("dialog", { name: "Home tutorial" }),
        ).toBeInTheDocument();
      });
    });

    it("does not auto-open tutorial after completion", async () => {
      useTutorialStore.getState().finishTutorial();
      useTutorialStore.setState({ isOpen: false });

      vi.spyOn(busStopsDb, "getAllBusStops").mockResolvedValue([]);
      vi.spyOn(busStopsDb, "getLastUpdate").mockResolvedValue(Date.now());
      vi.spyOn(busStopsDb, "getAllFavorites").mockResolvedValue([]);

      const history = createMemoryHistory({ initialEntries: ["/"] });
      const router = createRouter({ routeTree, history });

      render(<RouterProvider router={router} />);

      await waitFor(() => {
        expect(screen.getByText("My Bus Assistant")).toBeInTheDocument();
      });

      expect(
        screen.queryByRole("dialog", { name: "Home tutorial" }),
      ).not.toBeInTheDocument();
    });
  });

  describe("Initialization works on any route entry", () => {
    it("should initialize when landing on /about route", async () => {
      const mockStops = [
        {
          busStopCode: "01012",
          roadName: "Victoria St",
          description: "Hotel Grand Pacific",
          latitude: 1.296848,
          longitude: 103.852535,
        },
      ];

      vi.spyOn(busStopsDb, "getAllBusStops").mockResolvedValue(mockStops);
      vi.spyOn(busStopsDb, "getLastUpdate").mockResolvedValue(Date.now());
      vi.spyOn(busStopsDb, "getAllFavorites").mockResolvedValue([]);

      const history = createMemoryHistory({ initialEntries: ["/about"] });
      const router = createRouter({ routeTree, history });

      render(<RouterProvider router={router} />);

      await waitFor(() => {
        expect(screen.getByText("About")).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(busStopsDb.getAllBusStops).toHaveBeenCalled();
        expect(busStopsDb.getAllFavorites).toHaveBeenCalled();
      });
    });

    it("should initialize when landing on / route", async () => {
      const mockStops = [
        {
          busStopCode: "01012",
          roadName: "Victoria St",
          description: "Hotel Grand Pacific",
          latitude: 1.296848,
          longitude: 103.852535,
        },
      ];

      vi.spyOn(busStopsDb, "getAllBusStops").mockResolvedValue(mockStops);
      vi.spyOn(busStopsDb, "getLastUpdate").mockResolvedValue(Date.now());
      vi.spyOn(busStopsDb, "getAllFavorites").mockResolvedValue([]);

      const history = createMemoryHistory({ initialEntries: ["/"] });
      const router = createRouter({ routeTree, history });

      render(<RouterProvider router={router} />);

      await waitFor(() => {
        expect(screen.getByText("My Bus Assistant")).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(busStopsDb.getAllBusStops).toHaveBeenCalled();
        expect(busStopsDb.getAllFavorites).toHaveBeenCalled();
      });
    });

    it("should apply saved theme on /about route", async () => {
      const getItemSpy = vi.spyOn(localStorage, "getItem").mockReturnValue("light");

      vi.spyOn(busStopsDb, "getAllBusStops").mockResolvedValue([]);
      vi.spyOn(busStopsDb, "getLastUpdate").mockResolvedValue(Date.now());
      vi.spyOn(busStopsDb, "getAllFavorites").mockResolvedValue([]);

      const history = createMemoryHistory({ initialEntries: ["/about"] });
      const router = createRouter({ routeTree, history });

      render(<RouterProvider router={router} />);

      await waitFor(() => {
        expect(useThemeStore.getState().theme).toBe("light");
        expect(useThemeStore.getState().effectiveTheme).toBe("light");
      });

      getItemSpy.mockRestore();
    });
  });

  describe("Cleanup on unmount", () => {
    it("should remove theme listener on unmount", async () => {
      const removeEventListenerSpy = vi.fn();

      window.matchMedia = vi.fn().mockImplementation(() => ({
        matches: true,
        media: "(prefers-color-scheme: dark)",
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: removeEventListenerSpy,
        dispatchEvent: vi.fn(),
      })) as unknown as typeof window.matchMedia;

      vi.spyOn(busStopsDb, "getAllBusStops").mockResolvedValue([]);
      vi.spyOn(busStopsDb, "getLastUpdate").mockResolvedValue(Date.now());
      vi.spyOn(busStopsDb, "getAllFavorites").mockResolvedValue([]);

      const history = createMemoryHistory({ initialEntries: ["/"] });
      const router = createRouter({ routeTree, history });

      const { unmount } = render(<RouterProvider router={router} />);

      await waitFor(() => {
        expect(screen.getByText("My Bus Assistant")).toBeInTheDocument();
      });

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalled();
    });

    it("should only initialize once even with re-renders", async () => {
      const fetchBusStopsSpy = vi.spyOn(useBusStopsStore.getState(), "fetchBusStops");

      vi.spyOn(busStopsDb, "getAllBusStops").mockResolvedValue([]);
      vi.spyOn(busStopsDb, "getLastUpdate").mockResolvedValue(Date.now());
      vi.spyOn(busStopsDb, "getAllFavorites").mockResolvedValue([]);

      const history = createMemoryHistory({ initialEntries: ["/"] });
      const router = createRouter({ routeTree, history });

      const { rerender } = render(<RouterProvider router={router} />);

      await waitFor(() => {
        expect(screen.getByText("My Bus Assistant")).toBeInTheDocument();
      });

      rerender(<RouterProvider router={router} />);
      rerender(<RouterProvider router={router} />);

      await waitFor(() => {
        expect(fetchBusStopsSpy).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe("Error handling", () => {
    it("should render app when loadFavorites has error", async () => {
      vi.spyOn(busStopsDb, "getAllBusStops").mockResolvedValue([]);
      vi.spyOn(busStopsDb, "getLastUpdate").mockResolvedValue(Date.now());
      vi.spyOn(busStopsDb, "getAllFavorites").mockRejectedValue(new Error("DB Error"));

      const history = createMemoryHistory({ initialEntries: ["/"] });
      const router = createRouter({ routeTree, history });

      render(<RouterProvider router={router} />);

      await waitFor(() => {
        expect(screen.getByText("My Bus Assistant")).toBeInTheDocument();
      });

      await waitFor(() => {
        const state = useFavoritesStore.getState();
        expect(state.error).toBe("DB Error");
        expect(state.loading).toBe(false);
      });
    });
  });

  describe("Tutorial replay and route guard", () => {
    it("reopens from Home tutorial button after completion", async () => {
      useTutorialStore.getState().finishTutorial();
      useTutorialStore.setState({ isOpen: false });

      vi.spyOn(busStopsDb, "getAllBusStops").mockResolvedValue([]);
      vi.spyOn(busStopsDb, "getLastUpdate").mockResolvedValue(Date.now());
      vi.spyOn(busStopsDb, "getAllFavorites").mockResolvedValue([]);

      const history = createMemoryHistory({ initialEntries: ["/"] });
      const router = createRouter({ routeTree, history });

      const user = userEvent.setup();
      render(<RouterProvider router={router} />);

      await user.click(
        await screen.findByRole("button", { name: "Start tutorial" }),
      );

      await waitFor(() => {
        expect(
          screen.getByRole("dialog", { name: "Home tutorial" }),
        ).toBeInTheDocument();
      });
    });

    it("closes tutorial when navigating away from /", async () => {
      vi.spyOn(busStopsDb, "getAllBusStops").mockResolvedValue([]);
      vi.spyOn(busStopsDb, "getLastUpdate").mockResolvedValue(Date.now());
      vi.spyOn(busStopsDb, "getAllFavorites").mockResolvedValue([]);

      const history = createMemoryHistory({ initialEntries: ["/"] });
      const router = createRouter({ routeTree, history });

      render(<RouterProvider router={router} />);

      await waitFor(() => {
        expect(
          screen.getByRole("dialog", { name: "Home tutorial" }),
        ).toBeInTheDocument();
      });

      await router.navigate({ to: "/about" });

      await waitFor(() => {
        expect(screen.getByText("About")).toBeInTheDocument();
      });

      expect(useTutorialStore.getState().isOpen).toBe(false);
    });

    it("reopens from Settings replay button", async () => {
      useTutorialStore.getState().finishTutorial();
      useTutorialStore.setState({ isOpen: false });

      vi.spyOn(busStopsDb, "getAllBusStops").mockResolvedValue([]);
      vi.spyOn(busStopsDb, "getLastUpdate").mockResolvedValue(Date.now());
      vi.spyOn(busStopsDb, "getAllFavorites").mockResolvedValue([]);
      vi.spyOn(busStopsDb, "getBusStopsCount").mockResolvedValue(0);
      vi.spyOn(busStopsDb, "getBusRoutesCount").mockResolvedValue(0);

      const history = createMemoryHistory({ initialEntries: ["/settings"] });
      const router = createRouter({ routeTree, history });
      const user = userEvent.setup();

      render(<RouterProvider router={router} />);

      await waitFor(() => {
        expect(screen.getByText("Settings")).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: "Replay tutorial" }));

      await waitFor(() => {
        expect(screen.getByText("My Bus Assistant")).toBeInTheDocument();
        expect(
          screen.getByRole("dialog", { name: "Home tutorial" }),
        ).toBeInTheDocument();
      });
    });
  });
});
