import { act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import useBusStopsStore from "@/features/search-bar/stores/useBusStopsStore";
import useBusRouteStore from "./useBusRouteStore";
import * as busStopsDb from "@/lib/storage/bus-stops-db";

const createDeferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

const makeRouteResponse = (serviceNo: string): Response =>
  ({
    ok: true,
    json: async () => ({
      value: [
        {
          ServiceNo: serviceNo,
          Operator: "SBST",
          Direction: 1,
          StopSequence: 1,
          BusStopCode: "01012",
          Distance: 0,
          WD_FirstBus: "0500",
          WD_LastBus: "2300",
          SAT_FirstBus: "0500",
          SAT_LastBus: "2300",
          SUN_FirstBus: "0600",
          SUN_LastBus: "2300",
        },
      ],
    }),
  }) as Response;

describe("useBusRouteStore", () => {
  beforeEach(() => {
    useBusRouteStore.setState({ route: null, loading: false, error: null });
    useBusStopsStore.setState({
      busStops: [],
      loading: false,
      error: null,
      lastUpdateTimestamp: null,
      isFetching: false,
      retryCount: 0,
      isStale: false,
    });
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("only applies the latest in-flight request result", async () => {
    vi.spyOn(busStopsDb, "getCachedBusRoute").mockResolvedValue(undefined);
    vi.spyOn(busStopsDb, "saveBusRoute").mockResolvedValue();

    const first = createDeferred<Response>();
    const second = createDeferred<Response>();

    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);
      if (url.includes("ServiceNo=10")) return first.promise;
      if (url.includes("ServiceNo=20")) return second.promise;
      return Promise.reject(new Error(`Unexpected URL: ${url}`));
    });

    const firstRequest = useBusRouteStore.getState().fetchRoute("10");
    const secondRequest = useBusRouteStore.getState().fetchRoute("20");

    second.resolve(makeRouteResponse("20"));
    await act(async () => {
      await secondRequest;
    });

    expect(useBusRouteStore.getState().route?.serviceNo).toBe("20");
    expect(useBusRouteStore.getState().loading).toBe(false);

    first.resolve(makeRouteResponse("10"));
    await act(async () => {
      await firstRequest;
    });

    expect(useBusRouteStore.getState().route?.serviceNo).toBe("20");
    expect(useBusRouteStore.getState().error).toBeNull();
    expect(useBusRouteStore.getState().loading).toBe(false);

    fetchMock.mockRestore();
  });

  it("clears stale route when the current request fails", async () => {
    vi.spyOn(busStopsDb, "getCachedBusRoute").mockResolvedValue(undefined);
    vi.spyOn(busStopsDb, "saveBusRoute").mockResolvedValue();

    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(makeRouteResponse("10"))
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
      } as Response);

    await act(async () => {
      await useBusRouteStore.getState().fetchRoute("10");
    });
    expect(useBusRouteStore.getState().route?.serviceNo).toBe("10");

    await act(async () => {
      await useBusRouteStore.getState().fetchRoute("20");
    });

    expect(useBusRouteStore.getState().route).toBeNull();
    expect(useBusRouteStore.getState().error).toBe(
      "Failed to fetch route data (500)",
    );
    expect(useBusRouteStore.getState().loading).toBe(false);

    fetchMock.mockRestore();
  });
});
