import { describe, it, expect } from "vitest";
import type { BusStopSearchModel } from "./bus-stops-model";

describe("BusStopSearchModel", () => {
  it("should have correct structure", () => {
    const busStop: BusStopSearchModel = {
      busStopCode: "01012",
      roadName: "Victoria St",
      description: "Hotel Grand Pacific",
      latitude: 1.296848,
      longitude: 103.852535,
    };

    expect(busStop.busStopCode).toBe("01012");
    expect(busStop.roadName).toBe("Victoria St");
    expect(busStop.description).toBe("Hotel Grand Pacific");
    expect(busStop.latitude).toBe(1.296848);
    expect(busStop.longitude).toBe(103.852535);
  });

  it("should handle empty strings for road name and description", () => {
    const busStop: BusStopSearchModel = {
      busStopCode: "83139",
      roadName: "",
      description: "",
      latitude: 1.316748,
      longitude: 103.900000,
    };

    expect(busStop.roadName).toBe("");
    expect(busStop.description).toBe("");
  });

  it("should handle zero coordinates", () => {
    const busStop: BusStopSearchModel = {
      busStopCode: "55281",
      roadName: "Blk 507",
      description: "Blk 507",
      latitude: 0,
      longitude: 0,
    };

    expect(busStop.latitude).toBe(0);
    expect(busStop.longitude).toBe(0);
  });
});
