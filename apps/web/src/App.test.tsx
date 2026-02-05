import * as favoritesDb from "@/lib/storage/favorites-db";
import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import useNearbyStore from "./features/nearby-stops/stores/useNearbyStore";
import useBusStopsStore from "./features/search-bar/stores/useBusStopsStore";

const originalMatchMedia = window.matchMedia;

// Helper to mock geolocation safely
const mockGeolocation = (implementation: Geolocation) => {
  // Always restore mocks first to clear any previous spies
  vi.restoreAllMocks();

  // Delete any own property we've added
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (navigator as any).geolocation;
  } catch {
    // Ignore errors
  }

  // Now define a new property with the implementation
  Object.defineProperty(navigator, "geolocation", {
    configurable: true,
    enumerable: true,
    value: implementation,
  });
};

describe("App", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useBusStopsStore.getState().reset();
    useNearbyStore.getState().clearLocation();

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
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  it("renders app title", async () => {
    render(<App />);
    await waitFor(() => {
      expect(screen.getByText("My Bus Assistant")).toBeInTheDocument();
    });
  });

  it("renders app subtitle", async () => {
    render(<App />);
    await waitFor(() => {
      expect(
        screen.getByText(
          "Real-time bus arrival information at your fingertips",
        ),
      ).toBeInTheDocument();
    });
  });

  it("should render Nearby button", async () => {
    render(<App />);
    await waitFor(() => {
      const nearbyButton = screen.getByRole("button", {
        name: "Find nearby bus stops",
      });
      expect(nearbyButton).toBeInTheDocument();
    });
  });

  it("should open dialog when Nearby button is clicked", async () => {
    const user = userEvent.setup();
    vi.spyOn(favoritesDb, "getAllFavorites").mockResolvedValue([]);

    // Mock geolocation to prevent the dialog from hanging
    const mockPosition = {
      coords: {
        latitude: 1.296848,
        longitude: 103.852535,
        accuracy: 10,
        altitude: null,
        altitudeAccuracy: null,
        heading: null,
        speed: null,
      },
      timestamp: Date.now(),
    };

    mockGeolocation({
      getCurrentPosition: vi.fn((success) =>
        success(mockPosition as GeolocationPosition),
      ),
      watchPosition: vi.fn(),
      clearWatch: vi.fn(),
    } as Geolocation);

    render(<App />);

    const nearbyButton = await screen.findByRole("button", {
      name: "Find nearby bus stops",
    });

    await user.click(nearbyButton);

    // Check if the dialog is rendered by looking for its title
    await waitFor(() => {
      expect(screen.getByText("Nearest Bus Stops")).toBeInTheDocument();
    });
  });

  it("should request location when dialog is opened", async () => {
    const user = userEvent.setup();
    vi.spyOn(favoritesDb, "getAllFavorites").mockResolvedValue([]);

    const mockPosition = {
      coords: {
        latitude: 1.296848,
        longitude: 103.852535,
        accuracy: 10,
        altitude: null,
        altitudeAccuracy: null,
        heading: null,
        speed: null,
      },
      timestamp: Date.now(),
    };

    mockGeolocation({
      getCurrentPosition: vi.fn((success) =>
        success(mockPosition as GeolocationPosition),
      ),
      watchPosition: vi.fn(),
      clearWatch: vi.fn(),
    } as Geolocation);

    render(<App />);

    const nearbyButton = await screen.findByRole("button", {
      name: "Find nearby bus stops",
    });

    await user.click(nearbyButton);

    await waitFor(() => {
      expect(useNearbyStore.getState().location).not.toBeNull();
    });
  });

  it("should clean up theme listener on unmount", async () => {
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

    const { unmount } = render(<App />);

    // Wait for initial render to complete
    await waitFor(() => {
      expect(screen.getByText("My Bus Assistant")).toBeInTheDocument();
    });

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalled();
  });
});
