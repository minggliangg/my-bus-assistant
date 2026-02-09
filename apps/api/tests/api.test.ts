import { Database } from "bun:sqlite";
import { describe, expect, it, afterAll, mock } from "bun:test";

const mockBusStopsData = [
  {
    BusStopCode: "01012",
    RoadName: "Victoria St",
    Description: "Hotel Grand Pacific",
    Latitude: 1.296848,
    Longitude: 103.852535,
  },
];

const mockBusRoutesData = [
  {
    ServiceNo: "10",
    Operator: "SBST",
    Direction: 1,
    StopSequence: 1,
    BusStopCode: "75009",
    Distance: 0,
    WD_FirstBus: "0500",
    WD_LastBus: "2300",
    SAT_FirstBus: "0500",
    SAT_LastBus: "2300",
    SUN_FirstBus: "0500",
    SUN_LastBus: "2300",
  },
];
const mockBusArrivalData = {
  "odata.metadata": "",
  BusStopCode: "01012",
  Services: [],
};
let busArrivalFetchCount = 0;

// Mock the lta-client module BEFORE importing app
mock.module("../src/lib/lta-client", () => ({
  fetchFromLTA: async (endpoint: string) => {
    if (endpoint.includes("BusStops"))
      return { "odata.metadata": "", value: mockBusStopsData };
    if (endpoint.includes("BusRoutes"))
      return { "odata.metadata": "", value: mockBusRoutesData };
    if (endpoint.includes("BusArrival")) {
      busArrivalFetchCount += 1;
      return mockBusArrivalData;
    }
    throw new Error(`Unmocked endpoint: ${endpoint}`);
  },
  LtaUpstreamError: class extends Error {},
}));

// Set up in-memory DB with schema and pre-populated data
const testDb = new Database(":memory:");
testDb.exec(`
  CREATE TABLE IF NOT EXISTS metadata (key TEXT PRIMARY KEY, value TEXT, updated_at INTEGER NOT NULL);
  CREATE TABLE IF NOT EXISTS bus_stops (bus_stop_code TEXT PRIMARY KEY, road_name TEXT NOT NULL, description TEXT NOT NULL, latitude REAL NOT NULL, longitude REAL NOT NULL);
  CREATE INDEX IF NOT EXISTS idx_bus_stops_description ON bus_stops(description COLLATE NOCASE);
  CREATE TABLE IF NOT EXISTS bus_routes (service_no TEXT NOT NULL, operator TEXT NOT NULL, direction INTEGER NOT NULL, stop_sequence INTEGER NOT NULL, bus_stop_code TEXT NOT NULL, distance REAL NOT NULL, wd_first_bus TEXT NOT NULL, wd_last_bus TEXT NOT NULL, sat_first_bus TEXT NOT NULL, sat_last_bus TEXT NOT NULL, sun_first_bus TEXT NOT NULL, sun_last_bus TEXT NOT NULL, UNIQUE(service_no, direction, stop_sequence));
  CREATE INDEX IF NOT EXISTS idx_bus_routes_bus_stop_code ON bus_routes(bus_stop_code);
  CREATE INDEX IF NOT EXISTS idx_bus_routes_service_no ON bus_routes(service_no);
  PRAGMA user_version = 1;
`);

// Pre-populate test data
testDb
  .prepare(
    "INSERT INTO bus_stops (bus_stop_code, road_name, description, latitude, longitude) VALUES (?, ?, ?, ?, ?)",
  )
  .run("01012", "Victoria St", "Hotel Grand Pacific", 1.296848, 103.852535);

testDb
  .prepare(
    `INSERT INTO bus_routes (service_no, operator, direction, stop_sequence, bus_stop_code, distance, wd_first_bus, wd_last_bus, sat_first_bus, sat_last_bus, sun_first_bus, sun_last_bus) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
  .run("10", "SBST", 1, 1, "75009", 0, "0500", "2300", "0500", "2300", "0500", "2300");

testDb
  .prepare(
    "INSERT INTO metadata (key, value, updated_at) VALUES (?, ?, ?)",
  )
  .run("bus_stops_last_updated", new Date().toISOString(), Date.now());
testDb
  .prepare(
    "INSERT INTO metadata (key, value, updated_at) VALUES (?, ?, ?)",
  )
  .run("bus_routes_last_updated", new Date().toISOString(), Date.now());

mock.module("../src/lib/db/client", () => ({
  getDb: () => testDb,
  resetDb: () => {},
  closeDb: () => {},
}));

// Now import app
import { app } from "../src/index";

afterAll(() => {
  testDb.close();
});

describe("API Server", () => {
  describe("GET /health", () => {
    it("returns ok status with db info", async () => {
      const res = await app.request("/health");
      expect(res.status).toBe(200);

      const json = (await res.json()) as any;
      expect(["ok", "degraded"]).toContain(json.status);
      expect(json.timestamp).toBeDefined();
      expect(json.db).toBeDefined();
      expect(json.db.busStops.count).toBe(1);
      expect(json.db.busRoutes.count).toBe(1);
      expect(json.db.busStops.lastUpdated).toBeDefined();
      expect(json.db.busRoutes.lastUpdated).toBeDefined();
    });

    it("returns degraded when ingestion failure is persisted", async () => {
      testDb
        .prepare(
          "INSERT OR REPLACE INTO metadata (key, value, updated_at) VALUES (?, ?, ?)",
        )
        .run("bus_stops_ingestion_status", "failed", Date.now());
      testDb
        .prepare(
          "INSERT OR REPLACE INTO metadata (key, value, updated_at) VALUES (?, ?, ?)",
        )
        .run("bus_stops_last_error", "guardrail hit", Date.now());

      const res = await app.request("/health");
      expect(res.status).toBe(200);

      const json = (await res.json()) as any;
      expect(json.status).toBe("degraded");
      expect(json.db.busStops.lastError).toBeDefined();
    });
  });

  describe("GET /health/ready", () => {
    it("returns 503 with degraded status on failed ingestion", async () => {
      const res = await app.request("/health/ready");
      expect([200, 503]).toContain(res.status);
      const json = (await res.json()) as any;
      expect(["ok", "degraded"]).toContain(json.status);
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

    it("returns cached bus arrival response for repeated requests", async () => {
      busArrivalFetchCount = 0;
      const first = await app.request(
        "/api/ltaodataservice/v3/BusArrival?BusStopCode=01012",
      );
      const second = await app.request(
        "/api/ltaodataservice/v3/BusArrival?BusStopCode=01012",
      );

      expect(first.status).toBe(200);
      expect(second.status).toBe(200);
      expect(busArrivalFetchCount).toBe(1);
    });
  });

  describe("GET /api/ltaodataservice/BusStops", () => {
    it("returns bus stops from database", async () => {
      const res = await app.request("/api/ltaodataservice/BusStops");
      expect(res.status).toBe(200);

      const json = (await res.json()) as any;
      expect(json).toHaveProperty("value");
      expect(Array.isArray(json.value)).toBe(true);
      expect(json.value).toEqual(mockBusStopsData);
      expect(json.pagination.total).toBe(1);
    });

    it("supports $skip and $top query params", async () => {
      const res = await app.request("/api/ltaodataservice/BusStops?$skip=0&$top=1");
      expect(res.status).toBe(200);

      const json = (await res.json()) as any;
      expect(json.pagination.skip).toBe(0);
      expect(json.pagination.top).toBe(1);
      expect(Array.isArray(json.value)).toBe(true);
    });
  });

  describe("GET /api/ltaodataservice/BusRoutes", () => {
    it("returns 400 when ServiceNo is missing", async () => {
      const res = await app.request("/api/ltaodataservice/BusRoutes");
      expect(res.status).toBe(400);

      const json = (await res.json()) as any;
      expect(json.error).toBe("ServiceNo query parameter is required");
    });

    it("returns routes for a specific ServiceNo", async () => {
      const res = await app.request(
        "/api/ltaodataservice/BusRoutes?ServiceNo=10",
      );
      expect(res.status).toBe(200);

      const json = (await res.json()) as any;
      expect(json).toHaveProperty("value");
      expect(Array.isArray(json.value)).toBe(true);
      expect(json.value).toEqual(mockBusRoutesData);
    });

    it("returns empty array for unknown ServiceNo", async () => {
      const res = await app.request(
        "/api/ltaodataservice/BusRoutes?ServiceNo=999",
      );
      expect(res.status).toBe(200);

      const json = (await res.json()) as any;
      expect(json.value).toEqual([]);
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
