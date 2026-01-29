import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { server } from "@/mocks/server";
import useBusStore from "./useBusStopStore";

describe("useBusStopStore", () => {
  beforeEach(() => {
    server.listen({ onUnhandledRequest: "error" });
    // Reset zustand state before each test
    useBusStore.setState({ busStop: null, loading: false, error: null, isAutoRefreshEnabled: false, lastUpdateTimestamp: null });
    vi.useFakeTimers();
    if (typeof localStorage !== 'undefined') {
      if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
    }
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    if (typeof localStorage !== 'undefined') {
      if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
    }
    server.close();
  });

  test("has initial state", () => {
    const { result } = renderHook(() => useBusStore());

    expect(result.current.busStop).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  test("sets loading to true when fetchBusArrivals is called", async () => {
    const { result } = renderHook(() => useBusStore());

    act(() => {
      result.current.fetchBusArrivals("83139");
    });

    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBeNull();

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
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
            NextBus: null,
            NextBus2: null,
            NextBus3: null,
          }],
        }),
      } as Response);

    const { result } = renderHook(() => useBusStore());

    // First fetch with error
    await act(async () => {
      await result.current.fetchBusArrivals("error-first");
    });

    expect(result.current.error).toBe("API Error: 404");

    // Second fetch with success
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

      // Second fetch should succeed even within throttle window
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          BusStopCode: "83139",
          Services: [{
            ServiceNo: "15",
            Operator: "SBST",
            NextBus: null,
            NextBus2: null,
            NextBus3: null,
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

      // Spy on fetch to track calls
      const fetchSpy = vi.spyOn(globalThis, "fetch");

      // Start first fetch
      const firstPromise = act(async () => {
        return result.current.fetchBusArrivals("83139");
      });

      // Try to start second fetch immediately - should be skipped
      await act(async () => {
        result.current.fetchBusArrivals("83139");
      });

      // Fetch should only be called once
      expect(fetchSpy).toHaveBeenCalledTimes(1);

      // Wait for first fetch to complete
      await firstPromise;

      // Now second fetch should work
      await act(async () => {
        result.current.fetchBusArrivals("83139");
      });

      // Fetch should be called twice now
      expect(fetchSpy).toHaveBeenCalledTimes(2);

      fetchSpy.mockRestore();
    });
  });
});
