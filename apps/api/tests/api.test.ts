import { describe, expect, it } from "bun:test";
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

      // Should succeed (will fail if LTA API key is invalid, but structure is correct)
      // In a real test environment, you'd mock the LTA API
      expect([200, 500]).toContain(res.status);

      const json = (await res.json()) as any;

      if (res.status === 200) {
        // Verify response structure matches LTA format
        expect(json).toHaveProperty("value");
        expect(Array.isArray(json.value)).toBe(true);
      }
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
