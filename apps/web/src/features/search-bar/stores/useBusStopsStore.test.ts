import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import useBusStopsStore from "./useBusStopsStore";
import * as busStopsDb from "@/lib/storage/bus-stops-db";
import "fake-indexeddb/auto";

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

describe("useBusStopsStore (fetchBusStops)", () => {
  beforeEach(() => {
    useBusStopsStore.getState().reset();
    vi.restoreAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should use cached data if fresh", async () => {
    const mockCachedStops = [
      {
        busStopCode: "01012",
        roadName: "Victoria St",
        description: "Hotel Grand Pacific",
        latitude: 1.296848,
        longitude: 103.852535,
      },
    ];
    const now = Date.now();
    const lastUpdate = now - 2 * 24 * 60 * 60 * 1000;

    vi.spyOn(busStopsDb, "getAllBusStops").mockResolvedValue(mockCachedStops);
    vi.spyOn(busStopsDb, "getLastUpdate").mockResolvedValue(lastUpdate);

    await useBusStopsStore.getState().fetchBusStops();

    const state = useBusStopsStore.getState();
    expect(state.busStops).toEqual(mockCachedStops);
    expect(state.loading).toBe(false);
    expect(state.isStale).toBe(false);
    expect(state.lastUpdateTimestamp).toBe(lastUpdate);
  });

  it("should handle fetch errors and set error state", async () => {
    vi.spyOn(busStopsDb, "getAllBusStops").mockResolvedValue([]);
    vi.spyOn(busStopsDb, "getLastUpdate").mockResolvedValue(null);
    const fetchMock = vi.fn(() =>
      Promise.resolve({
        ok: false,
        status: 500,
      } as Response),
    );
    vi.stubGlobal("fetch", fetchMock);

    const fetchPromise = useBusStopsStore.getState().fetchBusStops();

    await vi.runAllTimersAsync();

    await fetchPromise;

    const state = useBusStopsStore.getState();
    expect(state.error).toBeTruthy();
    expect(state.loading).toBe(false);
    expect(state.retryCount).toBe(3);

    vi.unstubAllGlobals();
  });

  it("should handle network errors", async () => {
    vi.spyOn(busStopsDb, "getAllBusStops").mockResolvedValue([]);
    vi.spyOn(busStopsDb, "getLastUpdate").mockResolvedValue(null);
    const fetchMock = vi.fn(() => Promise.reject(new Error("Network error")));
    vi.stubGlobal("fetch", fetchMock);

    const fetchPromise = useBusStopsStore.getState().fetchBusStops();

    await vi.runAllTimersAsync();

    await fetchPromise;

    const state = useBusStopsStore.getState();
    expect(state.error).toContain("Network error");
    expect(state.loading).toBe(false);

    vi.unstubAllGlobals();
  });
});
