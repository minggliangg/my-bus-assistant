import { describe, expect, it, afterEach, mock } from "bun:test";

const mockBusStopsResponse = {
  "odata.metadata": "",
  value: [
    {
      BusStopCode: "01012",
      RoadName: "Victoria St",
      Description: "Hotel Grand Pacific",
      Latitude: 1.296848,
      Longitude: 103.852535,
    },
  ],
};

// Mock the lta-client module BEFORE importing app
const ltaMock = mock.module("../src/lib/lta-client", () => ({
  fetchFromLTA: async (endpoint: string) => {
    if (endpoint.includes("BusStops")) return mockBusStopsResponse;
    throw new Error(`Unmocked endpoint: ${endpoint}`);
  },
}));

// Now import app (lta-client will use our mock)
import { app } from "../src/index";

describe("API Server", () => {
  describe("GET /health", () => {
    it("returns ok status", async () => {
      const res = await app.request("/health");
      expect(res.status).toBe(200);

      const json = (await res.json()) as any;
      expect(json.status).toBe("ok");
      expect(json.timestamp).toBeDefined();
    });
  });

  describe("GET /api/ltaodataservice/v3/BusArrival", () => {
    it("returns 400 when BusStopCode is missing", async () => {
      const res = await app.request("/api/ltaodataservice/v3/BusArrival");
      expect(res.status).toBe(400);

      const json = (await res.json()) as any;
      expect(json.error).toBe("BusStopCode is required");
    });

    it("returns 400 for invalid BusStopCode format", async () => {
      const res = await app.request(
        "/api/ltaodataservice/v3/BusArrival?BusStopCode=abc",
      );
      expect(res.status).toBe(400);

      const json = (await res.json()) as any;
      expect(json.error).toBe("Invalid BusStopCode format");
    });
  });

  describe("GET /api/ltaodataservice/BusStops", () => {
    it("returns aggregated bus stops without pagination params", async () => {
      const res = await app.request("/api/ltaodataservice/BusStops");

      expect(res.status).toBe(200);

      const json = (await res.json()) as any;

      expect(json).toHaveProperty("value");
      expect(Array.isArray(json.value)).toBe(true);
      expect(json.value).toEqual(mockBusStopsResponse.value);
    });
  });

  describe("404 handler", () => {
    it("returns 404 for unknown routes", async () => {
      const res = await app.request("/unknown");
      expect(res.status).toBe(404);

      const json = (await res.json()) as any;
      expect(json.error).toBe("Not found");
    });
  });
});
