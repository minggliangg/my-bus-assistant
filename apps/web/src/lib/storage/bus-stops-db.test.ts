import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as db from "./bus-stops-db";
import "fake-indexeddb/auto";

describe("bus-stops-db", () => {
  beforeEach(async () => {
    await db.clearAll();
  });

  afterEach(async () => {
    await db.clearAll();
  });

  describe("saveBusStops", () => {
    it("should save bus stops to database", async () => {
      const stops = [
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
      ];

      await db.saveBusStops(stops);

      const allStops = await db.getAllBusStops();
      expect(allStops).toHaveLength(2);
      expect(allStops).toEqual(stops);
    });

    it("should replace existing bus stops", async () => {
      const stops1 = [
        {
          busStopCode: "01012",
          roadName: "Victoria St",
          description: "Hotel Grand Pacific",
          latitude: 1.296848,
          longitude: 103.852535,
        },
      ];

      const stops2 = [
        {
          busStopCode: "01013",
          roadName: "Victoria St",
          description: "St Joseph's Church",
          latitude: 1.297928,
          longitude: 103.853321,
        },
      ];

      await db.saveBusStops(stops1);
      await db.saveBusStops(stops2);

      const allStops = await db.getAllBusStops();
      expect(allStops).toHaveLength(1);
      expect(allStops).toEqual(stops2);
    });
  });

  describe("appendBusStops", () => {
    it("should append bus stops to existing ones", async () => {
      const stops1 = [
        {
          busStopCode: "01012",
          roadName: "Victoria St",
          description: "Hotel Grand Pacific",
          latitude: 1.296848,
          longitude: 103.852535,
        },
      ];

      const stops2 = [
        {
          busStopCode: "01013",
          roadName: "Victoria St",
          description: "St Joseph's Church",
          latitude: 1.297928,
          longitude: 103.853321,
        },
      ];

      await db.appendBusStops(stops1);
      await db.appendBusStops(stops2);

      const allStops = await db.getAllBusStops();
      expect(allStops).toHaveLength(2);
    });

    it("should update existing bus stop codes", async () => {
      const stops1 = [
        {
          busStopCode: "01012",
          roadName: "Victoria St",
          description: "Hotel Grand Pacific",
          latitude: 1.296848,
          longitude: 103.852535,
        },
      ];

      const stops2 = [
        {
          busStopCode: "01012",
          roadName: "Victoria St",
          description: "Updated Description",
          latitude: 1.296848,
          longitude: 103.852535,
        },
      ];

      await db.appendBusStops(stops1);
      await db.appendBusStops(stops2);

      const allStops = await db.getAllBusStops();
      expect(allStops).toHaveLength(1);
      expect(allStops[0].description).toBe("Updated Description");
    });
  });

  describe("clearBusStopsOnly", () => {
    it("should clear only bus stops store", async () => {
      const stops = [
        {
          busStopCode: "01012",
          roadName: "Victoria St",
          description: "Hotel Grand Pacific",
          latitude: 1.296848,
          longitude: 103.852535,
        },
      ];

      await db.appendBusStops(stops);
      await db.setLastUpdate(Date.now());

      await db.clearBusStopsOnly();

      const allStops = await db.getAllBusStops();
      expect(allStops).toHaveLength(0);

      const lastUpdate = await db.getLastUpdate();
      expect(lastUpdate).not.toBeNull();
    });
  });

  describe("getBusStopByCode", () => {
    it("should return bus stop by code", async () => {
      const stops = [
        {
          busStopCode: "01012",
          roadName: "Victoria St",
          description: "Hotel Grand Pacific",
          latitude: 1.296848,
          longitude: 103.852535,
        },
      ];

      await db.appendBusStops(stops);

      const stop = await db.getBusStopByCode("01012");
      expect(stop).toBeDefined();
      expect(stop?.busStopCode).toBe("01012");
    });

    it("should return undefined for non-existent code", async () => {
      const stop = await db.getBusStopByCode("99999");
      expect(stop).toBeUndefined();
    });
  });

  describe("searchByDescription", () => {
    beforeEach(async () => {
      const stops = [
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
          roadName: "Church Street",
          description: "Hotel Grand Pacific",
          latitude: 1.298,
          longitude: 103.854,
        },
      ];

      await db.appendBusStops(stops);
    });

    it("should search bus stops by description", async () => {
      const results = await db.searchByDescription("hotel");
      expect(results).toHaveLength(2);
      expect(results.every((r) => r.description.toLowerCase().includes("hotel"))).toBe(true);
    });

    it("should search case-insensitively", async () => {
      const results = await db.searchByDescription("HOTEL");
      expect(results).toHaveLength(2);
    });

    it("should return empty array for no matches", async () => {
      const results = await db.searchByDescription("nonexistent");
      expect(results).toHaveLength(0);
    });
  });

  describe("clearAll", () => {
    it("should clear all stores", async () => {
      const stops = [
        {
          busStopCode: "01012",
          roadName: "Victoria St",
          description: "Hotel Grand Pacific",
          latitude: 1.296848,
          longitude: 103.852535,
        },
      ];

      await db.appendBusStops(stops);
      await db.setLastUpdate(Date.now());

      await db.clearAll();

      const allStops = await db.getAllBusStops();
      expect(allStops).toHaveLength(0);

      const lastUpdate = await db.getLastUpdate();
      expect(lastUpdate).toBeNull();
    });
  });
});
