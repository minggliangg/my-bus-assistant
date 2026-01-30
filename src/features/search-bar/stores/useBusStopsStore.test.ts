import { describe, it, expect, beforeEach, vi } from "vitest";
import useBusStopsStore from "./useBusStopsStore";

describe("useBusStopsStore", () => {
  beforeEach(() => {
    useBusStopsStore.getState().reset();
    vi.restoreAllMocks();
    import.meta.env.VITE_BUS_STOPS_REFRESH_DAYS = "7";
  });

  it("should have initial state", () => {
    const store = useBusStopsStore.getState();
    expect(store.busStops).toEqual([]);
    expect(store.loading).toBe(true);
    expect(store.error).toBeNull();
    expect(store.lastUpdateTimestamp).toBeNull();
    expect(store.isFetching).toBe(false);
    expect(store.retryCount).toBe(0);
    expect(store.isStale).toBe(false);
  });

  it("should search bus stops in store", () => {
    useBusStopsStore.setState({
      busStops: [
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
      ],
      loading: false,
      error: null,
      lastUpdateTimestamp: 1234567890,
      isFetching: false,
      retryCount: 0,
      isStale: false,
    });

    const results = useBusStopsStore.getState().searchBusStops("hotel");
    expect(results).toHaveLength(1);
    expect(results[0].busStopCode).toBe("01012");
    expect(results[0].description).toBe("Hotel Grand Pacific");
  });

  it("should search bus stops case-insensitively", () => {
    useBusStopsStore.setState({
      busStops: [
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
      ],
      loading: false,
      error: null,
      lastUpdateTimestamp: 1234567890,
      isFetching: false,
      retryCount: 0,
      isStale: false,
    });

    const results = useBusStopsStore.getState().searchBusStops("CHURCH");
    expect(results).toHaveLength(1);
    expect(results[0].busStopCode).toBe("01013");
  });

  it("should get bus stop by code", () => {
    useBusStopsStore.setState({
      busStops: [
        {
          busStopCode: "01012",
          roadName: "Victoria St",
          description: "Hotel Grand Pacific",
          latitude: 1.296848,
          longitude: 103.852535,
        },
      ],
      loading: false,
      error: null,
      lastUpdateTimestamp: 1234567890,
      isFetching: false,
      retryCount: 0,
      isStale: false,
    });

    const result = useBusStopsStore.getState().getBusStopByCode("01012");
    expect(result).toBeDefined();
    expect(result?.busStopCode).toBe("01012");
  });

  it("should return undefined for non-existent bus stop code", () => {
    useBusStopsStore.setState({
      busStops: [
        {
          busStopCode: "01012",
          roadName: "Victoria St",
          description: "Hotel Grand Pacific",
          latitude: 1.296848,
          longitude: 103.852535,
        },
      ],
      loading: false,
      error: null,
      lastUpdateTimestamp: 1234567890,
      isFetching: false,
      retryCount: 0,
      isStale: false,
    });

    const result = useBusStopsStore.getState().getBusStopByCode("99999");
    expect(result).toBeUndefined();
  });

  it("should reset state", () => {
    useBusStopsStore.setState({
      busStops: [
        { busStopCode: "01012", roadName: "Test", description: "Test", latitude: 0, longitude: 0 },
      ],
      loading: false,
      error: "Test error",
      lastUpdateTimestamp: 1234567890,
      isFetching: true,
      retryCount: 2,
      isStale: true,
    });

    useBusStopsStore.getState().reset();

    const store = useBusStopsStore.getState();
    expect(store.busStops).toEqual([]);
    expect(store.loading).toBe(true);
    expect(store.error).toBeNull();
    expect(store.lastUpdateTimestamp).toBeNull();
    expect(store.isFetching).toBe(false);
    expect(store.retryCount).toBe(0);
    expect(store.isStale).toBe(false);
  });

  it("should handle empty search results", () => {
    useBusStopsStore.setState({
      busStops: [
        {
          busStopCode: "01012",
          roadName: "Victoria St",
          description: "Hotel Grand Pacific",
          latitude: 1.296848,
          longitude: 103.852535,
        },
      ],
      loading: false,
      error: null,
      lastUpdateTimestamp: 1234567890,
      isFetching: false,
      retryCount: 0,
      isStale: false,
    });

    const results = useBusStopsStore.getState().searchBusStops("nonexistent");
    expect(results).toHaveLength(0);
  });
});
