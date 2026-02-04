import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import App from "./App";
import useBusStopsStore from "./features/search-bar/stores/useBusStopsStore";
import useNearbyStore from "./features/nearby-stops/stores/useNearbyStore";
import * as favoritesDb from "@/lib/storage/favorites-db";

// Helper to mock geolocation safely
function mockGeolocation(implementation: Geolocation) {
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
}

describe("App", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useBusStopsStore.getState().reset();
    useNearbyStore.getState().clearLocation();
  });

  it("renders app title", () => {
    render(<App />);
    expect(screen.getByText("My Bus Assistant")).toBeInTheDocument();
  });

  it("renders app subtitle", () => {
    render(<App />);
    expect(
      screen.getByText("Real-time bus arrival information at your fingertips"),
    ).toBeInTheDocument();
  });

  it("should render Nearby button", () => {
    render(<App />);
    const nearbyButton = screen.getByRole("button", {
      name: "Find nearby bus stops",
    });
    expect(nearbyButton).toBeInTheDocument();
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
      getCurrentPosition: vi.fn((success) => success(mockPosition as GeolocationPosition)),
      watchPosition: vi.fn(),
      clearWatch: vi.fn(),
    } as Geolocation);

    render(<App />);
    const nearbyButton = screen.getByRole("button", {
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
      getCurrentPosition: vi.fn((success) => success(mockPosition as GeolocationPosition)),
      watchPosition: vi.fn(),
      clearWatch: vi.fn(),
    } as Geolocation);

    render(<App />);
    const nearbyButton = screen.getByRole("button", {
      name: "Find nearby bus stops",
    });

    await user.click(nearbyButton);

    await waitFor(() => {
      expect(useNearbyStore.getState().location).not.toBeNull();
    });
  });
});
