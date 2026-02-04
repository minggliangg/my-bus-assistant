import { describe, it, expect, beforeEach, vi } from "vitest";
import { resolveBusStopNames } from "./resolve-bus-stop-names";
import type { BusStop } from "../models/bus-arrivals-model";
import useBusStopsStore from "@/features/search-bar/stores/useBusStopsStore";

describe("resolveBusStopNames", () => {
  const mockGetBusStopByCode = vi.fn();

  beforeEach(() => {
    // Mock the store's getBusStopByCode method
    mockGetBusStopByCode.mockImplementation((code: string) => {
      const mockStops: Record<string, { description: string }> = {
        "15141": { description: "Tampines Int" },
        "15139": { description: "Tampines St 11" },
        "15131": { description: "Tampines Ave 2" },
      };
      return mockStops[code];
    });

    // Mock the store getState method
    useBusStopsStore.getState = vi.fn().mockReturnValue({
      getBusStopByCode: mockGetBusStopByCode,
    });
  });

  it("should resolve origin and destination names from codes", () => {
    const busStop: BusStop = {
      busStopCode: "15141",
      services: [
        {
          serviceNo: "15",
          operator: "SBST",
          nextBus: {
            originCode: "15131",
            destinationCode: "15139",
            estimatedArrival: new Date(Date.now() + 300000),
            latitude: 1.341,
            longitude: 103.931,
            visitNumber: 1,
            load: "SEA",
            feature: "",
            type: "SD",
          },
          nextBus2: null,
          nextBus3: null,
        },
      ],
    };

    const result = resolveBusStopNames(busStop);

    expect(result.services[0].nextBus?.originName).toBe("Tampines Ave 2");
    expect(result.services[0].nextBus?.destinationName).toBe("Tampines St 11");
  });

  it("should return undefined for unknown bus stop codes", () => {
    const busStop: BusStop = {
      busStopCode: "15141",
      services: [
        {
          serviceNo: "15",
          operator: "SBST",
          nextBus: {
            originCode: "99999",
            destinationCode: "88888",
            estimatedArrival: new Date(Date.now() + 300000),
            latitude: 1.341,
            longitude: 103.931,
            visitNumber: 1,
            load: "SEA",
            feature: "",
            type: "SD",
          },
          nextBus2: null,
          nextBus3: null,
        },
      ],
    };

    const result = resolveBusStopNames(busStop);

    expect(result.services[0].nextBus?.originName).toBeUndefined();
    expect(result.services[0].nextBus?.destinationName).toBeUndefined();
  });

  it("should handle null arrivals", () => {
    const busStop: BusStop = {
      busStopCode: "15141",
      services: [
        {
          serviceNo: "15",
          operator: "SBST",
          nextBus: null,
          nextBus2: null,
          nextBus3: null,
        },
      ],
    };

    const result = resolveBusStopNames(busStop);

    expect(result.services[0].nextBus).toBeNull();
    expect(result.services[0].nextBus2).toBeNull();
    expect(result.services[0].nextBus3).toBeNull();
  });

  it("should resolve names for all three bus arrivals", () => {
    const busStop: BusStop = {
      busStopCode: "15141",
      services: [
        {
          serviceNo: "15",
          operator: "SBST",
          nextBus: {
            originCode: "15131",
            destinationCode: "15139",
            estimatedArrival: new Date(Date.now() + 300000),
            latitude: 1.341,
            longitude: 103.931,
            visitNumber: 1,
            load: "SEA",
            feature: "",
            type: "SD",
          },
          nextBus2: {
            originCode: "15139",
            destinationCode: "15131",
            estimatedArrival: new Date(Date.now() + 900000),
            latitude: 1.341,
            longitude: 103.931,
            visitNumber: 2,
            load: "SDA",
            feature: "",
            type: "SD",
          },
          nextBus3: {
            originCode: "15131",
            destinationCode: "15139",
            estimatedArrival: new Date(Date.now() + 1500000),
            latitude: 1.341,
            longitude: 103.931,
            visitNumber: 3,
            load: "LSD",
            feature: "",
            type: "DD",
          },
        },
      ],
    };

    const result = resolveBusStopNames(busStop);

    expect(result.services[0].nextBus?.originName).toBe("Tampines Ave 2");
    expect(result.services[0].nextBus?.destinationName).toBe("Tampines St 11");
    expect(result.services[0].nextBus2?.originName).toBe("Tampines St 11");
    expect(result.services[0].nextBus2?.destinationName).toBe("Tampines Ave 2");
    expect(result.services[0].nextBus3?.originName).toBe("Tampines Ave 2");
    expect(result.services[0].nextBus3?.destinationName).toBe("Tampines St 11");
  });
});
