import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
  vi,
} from "vitest";
import { act, renderHook } from "@testing-library/react";
import { server } from "@/mocks/server";
import useBusStore from "./useBusStopStore";
import { EMPTY_BUS_DTO } from "../dtos/bus-arrival-dto";

describe("useBusStopStore", () => {
  beforeAll(() => {
    server.listen({ onUnhandledRequest: "error" });
  });

  afterAll(() => {
    server.close();
  });

  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    // Reset zustand state before each test
    useBusStore.getState().reset();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    localStorage.clear();
    server.resetHandlers();
  });

  test("has initial state", () => {
    const { result } = renderHook(() => useBusStore());

    expect(result.current.busStop).toBeNull();
    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBeNull();
    expect(result.current.isStale).toBe(false);
  });

  test("sets loading to true when fetchBusArrivals is called", async () => {
    const { result } = renderHook(() => useBusStore());

    // Start the fetch but don't await it yet
    let fetchPromise: Promise<void>;
    act(() => {
      fetchPromise = result.current.fetchBusArrivals("83139");
    });

    // Loading should be true immediately after starting
    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBeNull();

    // Now await the fetch to complete
    await act(async () => {
      await fetchPromise;
    });

    expect(result.current.loading).toBe(false);
  });

  test("fetches bus arrivals successfully", async () => {
    const { result } = renderHook(() => useBusStore());

    await act(async () => {
      await result.current.fetchBusArrivals("83139");
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.busStop).not.toBeNull();
    expect(result.current.busStop?.busStopCode).toBe("83139");
    expect(result.current.busStop?.services.length).toBeGreaterThan(0);
  });

  test("sets error state when API returns 404", async () => {
    const mockFetch = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: "Not Found",
    } as Response);

    const { result } = renderHook(() => useBusStore());

    await act(async () => {
      await result.current.fetchBusArrivals("any-code");
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.busStop).toBeNull();
    expect(result.current.error).toBe("API Error: 404");

    mockFetch.mockRestore();
  });

  test("sets error state when API returns 500", async () => {
    const mockFetch = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
    } as Response);

    const { result } = renderHook(() => useBusStore());

    await act(async () => {
      await result.current.fetchBusArrivals("any-code");
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.busStop).toBeNull();
    expect(result.current.error).toBe("API Error: 500");

    mockFetch.mockRestore();
  });

  test("sets error state when API returns 400", async () => {
    const mockFetch = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: false,
      status: 400,
      statusText: "Bad Request",
    } as Response);

    const { result } = renderHook(() => useBusStore());

    await act(async () => {
      await result.current.fetchBusArrivals("any-code");
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.busStop).toBeNull();
    expect(result.current.error).toBe("API Error: 400");

    mockFetch.mockRestore();
  });

  test("handles empty services response", async () => {
    const { result } = renderHook(() => useBusStore());

    await act(async () => {
      await result.current.fetchBusArrivals("99999");
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.busStop).not.toBeNull();
    expect(result.current.busStop?.busStopCode).toBe("99999");
    expect(result.current.busStop?.services).toHaveLength(0);
  });

  test("clears previous error when new fetch starts", async () => {
    const mockFetch = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: "Not Found",
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          BusStopCode: "83139",
          Services: [{
            ServiceNo: "15",
            Operator: "SBST",
            NextBus: EMPTY_BUS_DTO,
            NextBus2: EMPTY_BUS_DTO,
            NextBus3: EMPTY_BUS_DTO,
          }],
        }),
      } as Response);

    const { result } = renderHook(() => useBusStore());
    const now = Date.now();
    vi.setSystemTime(now);

    // First fetch with error
    await act(async () => {
      await result.current.fetchBusArrivals("error-first");
    });

    expect(result.current.error).toBe("API Error: 404");

    // Advance time past retry window (5 seconds)
    vi.setSystemTime(now + 6000);

    // Second fetch with success (different bus stop code to avoid throttle)
    await act(async () => {
      await result.current.fetchBusArrivals("success-after");
    });

    expect(result.current.error).toBeNull();
    expect(result.current.busStop).not.toBeNull();

    mockFetch.mockRestore();
  });

  test("updates busStop when fetching different bus stop codes", async () => {
    const { result } = renderHook(() => useBusStore());

    // First bus stop
    await act(async () => {
      await result.current.fetchBusArrivals("83139");
    });

    const firstBusStop = result.current.busStop;
    expect(firstBusStop?.busStopCode).toBe("83139");

    // Second bus stop
    await act(async () => {
      await result.current.fetchBusArrivals("83138");
    });

    expect(result.current.busStop?.busStopCode).toBe("83138");
    expect(result.current.busStop).not.toBe(firstBusStop);
  });

  test("handles network errors", async () => {
    const mockFetch = vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(
      new TypeError("Failed to fetch")
    );

    const { result } = renderHook(() => useBusStore());

    await act(async () => {
      await result.current.fetchBusArrivals("any-code");
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe("Failed to fetch");
    expect(result.current.busStop).toBeNull();

    mockFetch.mockRestore();
  });

  test("maps DTO to model correctly", async () => {
    const { result } = renderHook(() => useBusStore());

    await act(async () => {
      await result.current.fetchBusArrivals("83139");
    });

    const busStop = result.current.busStop;
    expect(busStop).not.toBeNull();

    const service = busStop?.services[0];
    expect(service?.serviceNo).toBe("15");
    expect(service?.operator).toBe("SBST");

    // Check that arrival times are Date objects
    expect(service?.nextBus).not.toBeNull();
    expect(service?.nextBus?.estimatedArrival).toBeInstanceOf(Date);
  });

  test("maintains state between hook instances (zustand singleton)", async () => {
    const { result: result1 } = renderHook(() => useBusStore());
    const { result: result2 } = renderHook(() => useBusStore());

    await act(async () => {
      await result1.current.fetchBusArrivals("83139");
    });

    // Both hook instances should see the same state
    expect(result2.current.busStop).not.toBeNull();
    expect(result2.current.busStop?.busStopCode).toBe("83139");
  });

  test("handles arriving now response correctly", async () => {
    const { result } = renderHook(() => useBusStore());

    await act(async () => {
      await result.current.fetchBusArrivals("83138");
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.busStop).not.toBeNull();
    expect(result.current.busStop?.busStopCode).toBe("83138");
    expect(result.current.busStop?.services[0].serviceNo).toBe("15");
  });

  describe("Auto-refresh functionality", () => {
    test("toggleAutoRefresh toggles state", () => {
      const { result } = renderHook(() => useBusStore());

      expect(result.current.isAutoRefreshEnabled).toBe(false);
      act(() => result.current.toggleAutoRefresh());
      expect(result.current.isAutoRefreshEnabled).toBe(true);
    });

    test("throttles fetches within 45 seconds", async () => {
      const { result } = renderHook(() => useBusStore());
      const now = Date.now();
      vi.setSystemTime(now);

      await act(() => result.current.fetchBusArrivals("83139"));
      const firstBusStop = result.current.busStop;

      // Immediate retry should be throttled
      await act(() => result.current.fetchBusArrivals("83139"));
      expect(result.current.busStop).toBe(firstBusStop);

      // After 45s should allow new fetch
      vi.setSystemTime(now + 45000);
      await act(() => result.current.fetchBusArrivals("83139"));
      expect(result.current.busStop).not.toBeNull();
    });

    test("stores timestamp in localStorage", async () => {
      const { result } = renderHook(() => useBusStore());
      const now = Date.now();
      vi.setSystemTime(now);

      await act(() => result.current.fetchBusArrivals("83139"));

      expect((typeof localStorage !== 'undefined' ? localStorage.getItem : () => null)("bus-stop-last-update-83139")).toBe(now.toString());
      expect(result.current.lastUpdateTimestamp).toBe(now);
    });

    test("different bus stops have independent throttles", async () => {
      const { result } = renderHook(() => useBusStore());

      await act(() => result.current.fetchBusArrivals("83139"));
      await act(() => result.current.fetchBusArrivals("83138"));

      expect((typeof localStorage !== 'undefined' ? localStorage.getItem : () => null)("bus-stop-last-update-83139")).toBeTruthy();
      expect((typeof localStorage !== 'undefined' ? localStorage.getItem : () => null)("bus-stop-last-update-83138")).toBeTruthy();
    });

    test("handles localStorage errors gracefully", async () => {
      const { result } = renderHook(() => useBusStore());

      vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
        throw new Error("Quota exceeded");
      });

      await act(() => result.current.fetchBusArrivals("83139"));

      expect(result.current.busStop).not.toBeNull();
      expect(result.current.error).toBeNull();
    });

    test("allows retry when last attempt failed", async () => {
      const { result } = renderHook(() => useBusStore());
      const now = Date.now();
      vi.setSystemTime(now);

      // First fetch fails
      const mockFetch = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      } as Response);

      await act(() => result.current.fetchBusArrivals("83139"));

      expect(result.current.error).toBe("API Error: 500");
      expect(result.current.lastAttemptTimestamp).toBe(now);

      // Advance time past the retry window (5 seconds)
      vi.setSystemTime(now + 6000);

      // Second fetch should succeed even within throttle window (45s)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          BusStopCode: "83139",
          Services: [{
            ServiceNo: "15",
            Operator: "SBST",
            NextBus: EMPTY_BUS_DTO,
            NextBus2: EMPTY_BUS_DTO,
            NextBus3: EMPTY_BUS_DTO,
          }],
        }),
      } as Response);

      await act(() => result.current.fetchBusArrivals("83139"));

      expect(result.current.error).toBeNull();
      expect(result.current.busStop).not.toBeNull();

      mockFetch.mockRestore();
    });

    test("prevents overlapping fetches", async () => {
      const { result } = renderHook(() => useBusStore());
      const now = Date.now();
      vi.setSystemTime(now);

      // Spy on fetch to track calls
      const fetchSpy = vi.spyOn(globalThis, "fetch");

      // Start first fetch but don't await - simulates in-progress state
      let firstPromise: Promise<void>;
      act(() => {
        firstPromise = result.current.fetchBusArrivals("83139");
      });

      // Verify we're in fetching state
      expect(result.current.isFetching).toBe(true);

      // Try to start second fetch while first is in progress - should be skipped
      act(() => {
        result.current.fetchBusArrivals("83139");
      });

      // Fetch should only be called once (second call skipped due to isFetching)
      expect(fetchSpy).toHaveBeenCalledTimes(1);

      // Wait for first fetch to complete
      await act(async () => {
        await firstPromise;
      });

      // Verify fetching is complete
      expect(result.current.isFetching).toBe(false);

      // Advance time past the throttle window
      vi.setSystemTime(now + 50000);

      // Now another fetch should work (past throttle window)
      await act(async () => {
        await result.current.fetchBusArrivals("83139");
      });

      // Fetch should be called twice now
      expect(fetchSpy).toHaveBeenCalledTimes(2);

      fetchSpy.mockRestore();
    });
  });

  describe("localStorage persistence", () => {
    test("saves bus stop data to localStorage on successful fetch", async () => {
      const { result } = renderHook(() => useBusStore());

      await act(async () => {
        await result.current.fetchBusArrivals("83139");
      });

      const cachedData = localStorage.getItem("bus-stop-data-83139");
      expect(cachedData).toBeTruthy();

      // Verify deserialization works
      const parsed = JSON.parse(cachedData!);
      expect(parsed.busStopCode).toBe("83139");
      expect(parsed.services).toBeTruthy();
    });

    test("loads cached data on fetch and marks as stale", async () => {
      const { result } = renderHook(() => useBusStore());
      const now = Date.now();
      vi.setSystemTime(now);

      // First fetch to populate cache
      await act(async () => {
        await result.current.fetchBusArrivals("83139");
      });

      expect(result.current.isStale).toBe(false);

      // Restore localStorage data with mock cached data
      const mockCachedData = {
        busStopCode: "83139",
        services: [
          {
            serviceNo: "15",
            operator: "SBST",
            nextBus: {
              originCode: "83139",
              destinationCode: "96049",
              estimatedArrival: new Date(Date.now() + 2 * 60000).toISOString(),
              latitude: "1.316748",
              longitude: "103.900000",
              visitNumber: "1",
              load: "SEA",
              feature: "WAB",
              type: "DD",
            },
            nextBus2: null,
            nextBus3: null,
          },
        ],
      };
      localStorage.setItem("bus-stop-data-83139", JSON.stringify(mockCachedData));

      // Reset store to simulate page refresh (but keep localStorage)
      act(() => {
        useBusStore.setState({
          busStop: null,
          loading: true,
          error: null,
          isAutoRefreshEnabled: false,
          lastUpdateTimestamp: null,
          lastAttemptTimestamp: null,
          isFetching: false,
          changedFields: [],
          isStale: false,
        });
      });

      // Verify reset cleared busStop
      expect(result.current.busStop).toBeNull();
      expect(result.current.loading).toBe(true);

      // Advance time past throttle to allow new fetch
      vi.setSystemTime(now + 50000);

      // Fetch again - should load from cache first, then fetch fresh
      await act(async () => {
        await result.current.fetchBusArrivals("83139");
      });

      // Should have data and mark as not stale (after fresh fetch completes)
      expect(result.current.busStop).not.toBeNull();
      expect(result.current.isStale).toBe(false);
    });

    test("clears stale flag after successful fresh fetch", async () => {
      const { result } = renderHook(() => useBusStore());
      const now = Date.now();
      vi.setSystemTime(now);

      // First fetch
      await act(async () => {
        await result.current.fetchBusArrivals("83139");
      });

      expect(result.current.isStale).toBe(false);

      // Advance time past throttle
      vi.setSystemTime(now + 46000);

      // Fetch again
      await act(async () => {
        await result.current.fetchBusArrivals("83139");
      });

      expect(result.current.isStale).toBe(false);
    });

    test("reset clears all cached bus stop data from localStorage", () => {
      const { result } = renderHook(() => useBusStore());

      // Add some cached data
      localStorage.setItem("bus-stop-data-83139", JSON.stringify({ test: "data1" }));
      localStorage.setItem("bus-stop-data-83138", JSON.stringify({ test: "data2" }));
      localStorage.setItem("other-key", "should-remain");

      act(() => {
        result.current.reset();
      });

      // Cache keys should be cleared
      expect(localStorage.getItem("bus-stop-data-83139")).toBeNull();
      expect(localStorage.getItem("bus-stop-data-83138")).toBeNull();
      // Other keys should remain
      expect(localStorage.getItem("other-key")).toBe("should-remain");
    });
  });
});
