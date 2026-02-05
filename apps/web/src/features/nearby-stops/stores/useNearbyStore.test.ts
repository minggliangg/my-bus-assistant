import type { BusStopSearchModel } from "@/features/search-bar/models/bus-stops-model";
import { beforeEach, describe, expect, it, vi } from "vitest";
import useNearbyStore from "./useNearbyStore";

// Helper to mock geolocation safely
const mockGeolocation = (implementation: Geolocation | undefined) => {
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
    value: implementation ?? navigator.geolocation,
  });
};

describe("useNearbyStore", () => {
  beforeEach(() => {
    useNearbyStore.getState().clearLocation();
    vi.restoreAllMocks();
  });

  it("should have initial state", () => {
    const store = useNearbyStore.getState();
    expect(store.location).toBeNull();
    expect(store.loadingLocation).toBe(false);
    expect(store.locationError).toBeNull();
    expect(store.nearestStops).toEqual([]);
    expect(store.dialogOpen).toBe(false);
  });

  it("should request location successfully", async () => {
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
    });

    await useNearbyStore.getState().requestLocation();

    const state = useNearbyStore.getState();
    expect(state.location).toEqual({
      latitude: 1.296848,
      longitude: 103.852535,
      timestamp: expect.any(Number),
    });
    expect(state.loadingLocation).toBe(false);
    expect(state.locationError).toBeNull();
  });

  it("should handle permission denied error", async () => {
    const mockError = new Error("Permission denied");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mockError as any).name = "PermissionDeniedError";

    mockGeolocation({
      getCurrentPosition: vi.fn((_, error) => error?.(mockError)),
      watchPosition: vi.fn(),
      clearWatch: vi.fn(),
    } as Geolocation);

    await expect(useNearbyStore.getState().requestLocation()).rejects.toThrow();

    const state = useNearbyStore.getState();
    expect(state.locationError).toBe("Location permission denied");
    expect(state.loadingLocation).toBe(false);
  });

  it("should handle timeout error", async () => {
    const mockError = new Error("Timeout");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mockError as any).name = "TimeoutError";

    mockGeolocation({
      getCurrentPosition: vi.fn((_, error) => error?.(mockError)),
      watchPosition: vi.fn(),
      clearWatch: vi.fn(),
    } as Geolocation);

    await expect(useNearbyStore.getState().requestLocation()).rejects.toThrow();

    const state = useNearbyStore.getState();
    expect(state.locationError).toBe("Location request timed out");
    expect(state.loadingLocation).toBe(false);
  });

  it("should handle geolocation not supported", async () => {
    // Mock geolocation to be undefined
    mockGeolocation(undefined);

    await expect(useNearbyStore.getState().requestLocation()).rejects.toThrow();

    const state = useNearbyStore.getState();
    expect(state.locationError).toBe("Unable to get your location");
    expect(state.loadingLocation).toBe(false);
  });

  it("should cache location for 5 minutes", async () => {
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

    const getCurrentPositionSpy = vi.fn((success) =>
      success(mockPosition as GeolocationPosition),
    );

    mockGeolocation({
      getCurrentPosition: getCurrentPositionSpy,
      watchPosition: vi.fn(),
      clearWatch: vi.fn(),
    });

    await useNearbyStore.getState().requestLocation();
    await useNearbyStore.getState().requestLocation();

    expect(getCurrentPositionSpy).toHaveBeenCalledTimes(1);
  });

  it("should refresh location after cache expires", async () => {
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
      timestamp: Date.now() - 6 * 60 * 1000,
    };

    const getCurrentPositionSpy = vi.fn((success) =>
      success(mockPosition as GeolocationPosition),
    );

    mockGeolocation({
      getCurrentPosition: getCurrentPositionSpy,
      watchPosition: vi.fn(),
      clearWatch: vi.fn(),
    });

    useNearbyStore.setState({
      location: {
        latitude: 1.296848,
        longitude: 103.852535,
        timestamp: Date.now() - 6 * 60 * 1000,
      },
    });

    await useNearbyStore.getState().requestLocation();

    expect(getCurrentPositionSpy).toHaveBeenCalledTimes(1);
  });

  it("should find nearest stops", () => {
    const busStops: BusStopSearchModel[] = [
      {
        busStopCode: "01012",
        roadName: "Victoria St",
        description: "Hotel Grand Pacific",
        latitude: 1.296848,
        longitude: 103.852535,
      },
      {
        busStopCode: "01013",
        roadName: "Victoria St",
        description: "St Joseph's Church",
        latitude: 1.297928,
        longitude: 103.853321,
      },
      {
        busStopCode: "01014",
        roadName: "Victoria St",
        description: "Bras Basah Rd",
        latitude: 1.299928,
        longitude: 103.855321,
      },
    ];

    useNearbyStore.setState({
      location: {
        latitude: 1.296,
        longitude: 103.852,
        timestamp: Date.now(),
      },
    });

    useNearbyStore.getState().findNearestStops(busStops, 2);

    const state = useNearbyStore.getState();
    expect(state.nearestStops).toHaveLength(2);
    expect(state.nearestStops[0].busStopCode).toBe("01012");
    expect(state.nearestStops[0].distance).toBeGreaterThan(0);
  });

  it("should not find nearest stops when location is null", () => {
    const busStops: BusStopSearchModel[] = [
      {
        busStopCode: "01012",
        roadName: "Victoria St",
        description: "Hotel Grand Pacific",
        latitude: 1.296848,
        longitude: 103.852535,
      },
    ];

    useNearbyStore.setState({ location: null });

    useNearbyStore.getState().findNearestStops(busStops);

    const state = useNearbyStore.getState();
    expect(state.nearestStops).toHaveLength(0);
  });

  it("should set dialog open state", () => {
    useNearbyStore.getState().setDialogOpen(true);
    expect(useNearbyStore.getState().dialogOpen).toBe(true);

    useNearbyStore.getState().setDialogOpen(false);
    expect(useNearbyStore.getState().dialogOpen).toBe(false);
  });

  it("should retry location request", async () => {
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
    });

    useNearbyStore.setState({ locationError: "Previous error" });

    await useNearbyStore.getState().retry();

    const state = useNearbyStore.getState();
    expect(state.locationError).toBeNull();
    expect(state.location).not.toBeNull();
  });

  it("should clear location", () => {
    useNearbyStore.setState({
      location: {
        latitude: 1.296848,
        longitude: 103.852535,
        timestamp: Date.now(),
      },
      nearestStops: [
        {
          busStopCode: "01012",
          roadName: "Victoria St",
          description: "Hotel Grand Pacific",
          latitude: 1.296848,
          longitude: 103.852535,
          distance: 100,
        },
      ],
      locationError: "Error",
    });

    useNearbyStore.getState().clearLocation();

    const state = useNearbyStore.getState();
    expect(state.location).toBeNull();
    expect(state.nearestStops).toEqual([]);
    expect(state.locationError).toBeNull();
  });
});
