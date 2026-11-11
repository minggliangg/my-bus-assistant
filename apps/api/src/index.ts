import { Hono } from "hono";
import { compress } from "hono/compress";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { busArrival } from "./routes/bus-arrival";
import { busStops } from "./routes/bus-stops";
import { busRoutes } from "./routes/bus-routes";
import { getDb } from "./lib/db/client";
import { initSchema } from "./lib/db/schema";
import { startScheduler } from "./lib/db/ingestion/scheduler";
import { isIngesting } from "./lib/db/ingestion/scheduler";
import { getMetadata } from "./lib/db/repositories/metadata.repository";
import { getBusStopsCount } from "./lib/db/repositories/bus-stops.repository";
import { getBusRoutesCount } from "./lib/db/repositories/bus-routes.repository";
import { analytics } from "./routes/analytics";
import { requestMetrics } from "./lib/analytics/request-metrics";
import { pruneAnalytics } from "./lib/analytics/analytics.repository";
import { createDashboardApp } from "./dashboard/dashboard-app";

const app = new Hono();
const ALLOWED_ORIGINS = new Set(
  (process.env.ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
);

// Initialize database
const db = getDb();
initSchema(db);
startScheduler();

// Middleware
app.use("*", logger());
app.use(
  "*",
  cors({
    origin: (origin) => {
      if (!origin) return "";
      if (ALLOWED_ORIGINS.has(origin)) return origin;
      console.warn(
        JSON.stringify({ event: "cors_blocked", origin, path: "unknown" }),
      );
      return "";
    },
  }),
);
app.use("/api/*", requestMetrics());
app.use("/api/*", compress());

// Routes - matching the LTA DataMall API paths
app.route("/api/ltaodataservice/v3/BusArrival", busArrival);
app.route("/api/ltaodataservice/BusStops", busStops);
app.route("/api/ltaodataservice/BusRoutes", busRoutes);
app.route("/api/analytics", analytics);

const getReadiness = () => {
  const busStopsLastUpdated = getMetadata("bus_stops_last_updated");
  const busRoutesLastUpdated = getMetadata("bus_routes_last_updated");
  const busStopsStatus = getMetadata("bus_stops_ingestion_status")?.value ?? "idle";
  const busRoutesStatus = getMetadata("bus_routes_ingestion_status")?.value ?? "idle";
  const busStopsFailed = busStopsStatus === "failed";
  const busRoutesFailed = busRoutesStatus === "failed";
  const staleThresholdMs = 30 * 24 * 60 * 60 * 1000;
  const busStopsStale =
    !busStopsLastUpdated ||
    Date.now() - busStopsLastUpdated.updated_at > staleThresholdMs;
  const busRoutesStale =
    !busRoutesLastUpdated ||
    Date.now() - busRoutesLastUpdated.updated_at > staleThresholdMs;
  const busStopsCount = getBusStopsCount();
  const busRoutesCount = getBusRoutesCount();
  const ready =
    busStopsCount > 0 &&
    busRoutesCount > 0 &&
    !busStopsStale &&
    !busRoutesStale &&
    !busStopsFailed &&
    !busRoutesFailed;

  return {
    ready,
    busStopsLastUpdated,
    busRoutesLastUpdated,
    busStopsStatus,
    busRoutesStatus,
    busStopsCount,
    busRoutesCount,
  };
};

// Liveness check
app.get("/health/live", (c) => {
  return c.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Readiness check
app.get("/health/ready", (c) => {
  const readiness = getReadiness();
  const status = readiness.ready ? "ok" : "degraded";
  return c.json(
    {
      status,
      timestamp: new Date().toISOString(),
      db: {
        busStops: {
          count: readiness.busStopsCount,
          lastUpdated: readiness.busStopsLastUpdated?.value ?? null,
          ingestionStatus: readiness.busStopsStatus,
          lastSuccessAt: getMetadata("bus_stops_last_success_at")?.value ?? null,
          lastFailureAt: getMetadata("bus_stops_last_failure_at")?.value ?? null,
          lastError: getMetadata("bus_stops_last_error")?.value || null,
        },
        busRoutes: {
          count: readiness.busRoutesCount,
          lastUpdated: readiness.busRoutesLastUpdated?.value ?? null,
          ingestionStatus: readiness.busRoutesStatus,
          lastSuccessAt: getMetadata("bus_routes_last_success_at")?.value ?? null,
          lastFailureAt: getMetadata("bus_routes_last_failure_at")?.value ?? null,
          lastError: getMetadata("bus_routes_last_error")?.value || null,
        },
        ingesting: isIngesting(),
      },
    },
    readiness.ready ? 200 : 503,
  );
});

// Health check
app.get("/health", (c) => {
  const readiness = getReadiness();
  const status = readiness.ready ? "ok" : "degraded";
  return c.json({
    status,
    timestamp: new Date().toISOString(),
    db: {
      busStops: {
        count: readiness.busStopsCount,
        lastUpdated: readiness.busStopsLastUpdated?.value ?? null,
        ingestionStatus: readiness.busStopsStatus,
        lastSuccessAt: getMetadata("bus_stops_last_success_at")?.value ?? null,
        lastFailureAt: getMetadata("bus_stops_last_failure_at")?.value ?? null,
        lastError: getMetadata("bus_stops_last_error")?.value || null,
      },
      busRoutes: {
        count: readiness.busRoutesCount,
        lastUpdated: readiness.busRoutesLastUpdated?.value ?? null,
        ingestionStatus: readiness.busRoutesStatus,
        lastSuccessAt: getMetadata("bus_routes_last_success_at")?.value ?? null,
        lastFailureAt: getMetadata("bus_routes_last_failure_at")?.value ?? null,
        lastError: getMetadata("bus_routes_last_error")?.value || null,
      },
      ingesting: isIngesting(),
    },
  });
});

// 404 handler
app.notFound((c) => {
  return c.json({ error: "Not found" }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error("Unhandled error:", err);
  return c.json({ error: "Internal server error" }, 500);
});

const port = parseInt(process.env.PORT || "3001", 10);
// Loopback by default: public traffic arrives via Caddy on 127.0.0.1.
// Set HOST=0.0.0.0 only if something else must reach the API directly.
const hostname = process.env.HOST || "127.0.0.1";

// Analytics retention: prune old rows at startup and daily.
const ANALYTICS_RETENTION_DAYS = parseInt(
  process.env.ANALYTICS_RETENTION_DAYS || "180",
  10,
);
const runAnalyticsPrune = () => {
  try {
    const removed = pruneAnalytics(ANALYTICS_RETENTION_DAYS);
    if (removed > 0) {
      console.info(JSON.stringify({ event: "analytics_pruned", removed }));
    }
  } catch (error) {
    console.error("Analytics prune failed:", error);
  }
};

// Private dashboard: localhost only, exposed to the tailnet via `tailscale serve`.
// Never routed through Caddy / Cloudflare. Not started under `bun test`.
if (process.env.NODE_ENV !== "test") {
  runAnalyticsPrune();
  setInterval(runAnalyticsPrune, 24 * 60 * 60 * 1000).unref();

  if (process.env.DASHBOARD_ENABLED !== "false") {
    const dashboardPort = parseInt(process.env.DASHBOARD_PORT || "3010", 10);
    try {
      Bun.serve({
        hostname: "127.0.0.1",
        port: dashboardPort,
        fetch: createDashboardApp().fetch,
      });
      console.log(
        `📊 Analytics dashboard on http://127.0.0.1:${dashboardPort} (tailnet via tailscale serve)`,
      );
    } catch (error) {
      // e.g. port already taken by another instance (dev vs prod on one host)
      console.warn(`Analytics dashboard not started on port ${dashboardPort}:`, error);
    }
  }
}

console.log(`🚌 Bus Assistant API starting on http://${hostname}:${port}`);

export default {
  hostname,
  port,
  fetch: app.fetch,
};

export { app };
