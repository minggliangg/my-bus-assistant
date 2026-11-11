import { Database } from "bun:sqlite";
import { afterAll, beforeEach, describe, expect, it, mock } from "bun:test";

mock.module("../src/lib/lta-client", () => ({
  fetchFromLTA: async (endpoint: string) => {
    if (endpoint.includes("BusArrival")) {
      return { "odata.metadata": "", BusStopCode: "01012", Services: [] };
    }
    return { "odata.metadata": "", value: [] };
  },
  LtaUpstreamError: class extends Error {},
}));

const testDb = new Database(":memory:");
mock.module("../src/lib/db/client", () => ({
  getDb: () => testDb,
  resetDb: () => {},
  closeDb: () => {},
}));

const { initSchema } = await import("../src/lib/db/schema");
initSchema(testDb);
testDb
  .prepare(
    "INSERT INTO bus_stops (bus_stop_code, road_name, description, latitude, longitude) VALUES (?, ?, ?, ?, ?)",
  )
  .run("01012", "Victoria St", "Hotel Grand Pacific", 1.29, 103.85);

const { app } = await import("../src/index");
const { analyticsRateLimiter } = await import("../src/routes/analytics");
const { createDashboardApp } = await import("../src/dashboard/dashboard-app");
const { getDashboardStats, pruneAnalytics } = await import(
  "../src/lib/analytics/analytics.repository"
);
const { parseAnalyticsBatch } = await import("../src/lib/analytics/validation");

const ANON = "anon-1234567890";
const SESSION = "sess-1234567890";

const postEvents = (body: unknown, raw?: string) =>
  app.request("/api/analytics/events", {
    method: "POST",
    headers: { "content-type": "text/plain" },
    body: raw ?? JSON.stringify(body),
  });

const countEvents = () =>
  (testDb.query("SELECT COUNT(*) AS n FROM analytics_events").get() as { n: number }).n;

afterAll(() => testDb.close());

beforeEach(() => {
  testDb.exec("DELETE FROM analytics_events; DELETE FROM api_requests;");
  analyticsRateLimiter.reset();
});

describe("schema migration", () => {
  it("upgrades a v1 database to v2 without touching existing tables", () => {
    const db = new Database(":memory:");
    db.exec(`
      CREATE TABLE metadata (key TEXT PRIMARY KEY, value TEXT, updated_at INTEGER NOT NULL);
      INSERT INTO metadata VALUES ('k', 'v', 1);
      PRAGMA user_version = 1;
    `);
    initSchema(db);
    expect((db.query("PRAGMA user_version").get() as any).user_version).toBe(2);
    expect(db.query("SELECT value FROM metadata WHERE key = 'k'").get()).toEqual({ value: "v" });
    expect(() => db.query("SELECT * FROM analytics_events").all()).not.toThrow();
    expect(() => db.query("SELECT * FROM api_requests").all()).not.toThrow();
    db.close();
  });
});

describe("POST /api/analytics/events", () => {
  it("stores a valid batch and returns 204", async () => {
    const res = await postEvents({
      anonId: ANON,
      sessionId: SESSION,
      standalone: true,
      events: [
        { name: "session_start", ts: Date.now() },
        { name: "stop_viewed", ts: Date.now(), stopCode: "01012", source: "search" },
      ],
    });
    expect(res.status).toBe(204);
    expect(countEvents()).toBe(2);
    const row = testDb
      .query("SELECT stop_code, source, standalone FROM analytics_events WHERE name = 'stop_viewed'")
      .get();
    expect(row).toEqual({ stop_code: "01012", source: "search", standalone: 1 });
  });

  it("rejects malformed JSON and bad envelopes", async () => {
    expect((await postEvents(null, "{not json")).status).toBe(400);
    expect((await postEvents({ anonId: "x", sessionId: SESSION, events: [{ name: "page_view" }] })).status).toBe(400);
    expect((await postEvents({ anonId: ANON, sessionId: SESSION, events: [] })).status).toBe(400);
    expect(countEvents()).toBe(0);
  });

  it("rejects oversized bodies", async () => {
    const res = await postEvents(null, "x".repeat(20_000));
    expect(res.status).toBe(413);
  });

  it("rate limits repeated batches from one IP", async () => {
    const body = { anonId: ANON, sessionId: SESSION, events: [{ name: "page_view", ts: Date.now(), path: "/" }] };
    let last = 0;
    for (let i = 0; i < 31; i++) last = (await postEvents(body)).status;
    expect(last).toBe(429);
  });
});

describe("parseAnalyticsBatch", () => {
  const now = 1_700_000_000_000;

  it("drops unknown events and clears invalid optional fields", () => {
    const batch = parseAnalyticsBatch(
      {
        anonId: ANON,
        sessionId: SESSION,
        events: [
          { name: "drop_table", ts: now },
          { name: "stop_viewed", ts: now, stopCode: "<script>", source: "evil", path: "javascript:x" },
        ],
      },
      now,
    );
    expect(batch?.events).toEqual([
      { name: "stop_viewed", ts: now, path: undefined, stopCode: undefined, serviceNo: undefined, source: undefined },
    ]);
  });

  it("replaces implausible client timestamps with server time", () => {
    const batch = parseAnalyticsBatch(
      {
        anonId: ANON,
        sessionId: SESSION,
        events: [
          { name: "page_view", ts: now + 60 * 60 * 1000 },
          { name: "page_view", ts: now - 3 * 24 * 60 * 60 * 1000 },
          { name: "page_view", ts: now - 1000 },
        ],
      },
      now,
    );
    expect(batch?.events.map((e) => e.ts)).toEqual([now, now, now - 1000]);
  });

  it("rejects batches over the size cap", () => {
    const events = Array.from({ length: 51 }, () => ({ name: "page_view", ts: now }));
    expect(parseAnalyticsBatch({ anonId: ANON, sessionId: SESSION, events }, now)).toBeNull();
  });
});

describe("request metrics", () => {
  it("records API requests with route, status and cache outcome", async () => {
    await app.request("/api/ltaodataservice/v3/BusArrival?BusStopCode=54321");
    await app.request("/api/ltaodataservice/v3/BusArrival?BusStopCode=54321");
    await app.request("/api/does-not-exist");
    const rows = testDb
      .query("SELECT route, status, cache FROM api_requests ORDER BY id")
      .all();
    expect(rows).toEqual([
      { route: "/v3/BusArrival", status: 200, cache: "MISS" },
      { route: "/v3/BusArrival", status: 200, cache: "HIT" },
      { route: "other", status: 404, cache: null },
    ]);
  });

  it("does not record the analytics endpoint itself", async () => {
    await postEvents({ anonId: ANON, sessionId: SESSION, events: [{ name: "page_view", ts: Date.now() }] });
    expect((testDb.query("SELECT COUNT(*) AS n FROM api_requests").get() as any).n).toBe(0);
  });
});

describe("dashboard", () => {
  const dashboard = createDashboardApp({ allowedUsers: "me@example.com" });

  it("rejects requests without a Tailscale identity", async () => {
    expect((await dashboard.request("/")).status).toBe(403);
    expect((await dashboard.request("/api/stats")).status).toBe(403);
  });

  it("rejects Tailscale users not on the allow-list", async () => {
    const res = await dashboard.request("/", { headers: { "Tailscale-User-Login": "someone@else.com" } });
    expect(res.status).toBe(403);
  });

  it("serves the page and stats to an allowed user", async () => {
    const headers = { "Tailscale-User-Login": "Me@Example.com", "Tailscale-User-Name": "<b>Me</b>" };
    const page = await dashboard.request("/", { headers });
    expect(page.status).toBe(200);
    expect(page.headers.get("cache-control")).toBe("no-store");
    const html = await page.text();
    expect(html).toContain("Bus Assistant analytics");
    expect(html).not.toContain("<b>Me</b>");

    expect((await dashboard.request("/api/stats?days=7", { headers })).status).toBe(200);
    expect((await dashboard.request("/api/stats?days=5", { headers })).status).toBe(400);
  });

  it("is not reachable through the public API app", async () => {
    expect((await app.request("/api/stats")).status).toBe(404);
  });
});

describe("getDashboardStats", () => {
  it("aggregates visitors, stops and API metrics", () => {
    const now = Date.now();
    const insert = testDb.prepare(
      `INSERT INTO analytics_events (ts, anon_id, session_id, name, stop_code, service_no, source, standalone)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    insert.run(now, "a1aaaaaaaa", "s1", "session_start", null, null, null, 1);
    insert.run(now, "a1aaaaaaaa", "s1", "stop_viewed", "01012", null, "search", 1);
    insert.run(now, "a1aaaaaaaa", "s1", "stop_viewed", "01012", null, "favorite", 1);
    insert.run(now, "a2aaaaaaaa", "s2", "session_start", null, null, null, 0);
    insert.run(now, "a2aaaaaaaa", "s2", "service_route_viewed", null, "190", null, 0);
    testDb
      .prepare("INSERT INTO api_requests (ts, route, method, status, duration_ms, cache) VALUES (?, ?, ?, ?, ?, ?)")
      .run(now, "/v3/BusArrival", "GET", 503, 120, "MISS");

    const stats = getDashboardStats(7, now);
    expect(stats.daily).toHaveLength(7);
    expect(stats.totals.visitors).toBe(2);
    expect(stats.totals.sessions).toBe(2);
    expect(stats.totals.stopViews).toBe(2);
    expect(stats.totals.standaloneShare).toBe(0.5);
    expect(stats.totals.apiServerErrors).toBe(1);
    expect(stats.daily.at(-1)).toMatchObject({ visitors: 2, sessions: 2, stopViews: 2 });
    expect(stats.topStops[0]).toMatchObject({ stopCode: "01012", description: "Hotel Grand Pacific", views: 2, visitors: 1 });
    expect(stats.topServices).toEqual([{ serviceNo: "190", views: 1 }]);
    expect(stats.api.routes[0]).toMatchObject({ route: "/v3/BusArrival", requests: 1, errorRate: 1, cacheHitRate: 0 });
  });

  it("prunes rows older than the retention window", () => {
    const old = Date.now() - 200 * 24 * 60 * 60 * 1000;
    testDb
      .prepare("INSERT INTO analytics_events (ts, anon_id, session_id, name) VALUES (?, ?, ?, ?)")
      .run(old, "a", "s", "page_view");
    expect(pruneAnalytics(180)).toBe(1);
  });
});
