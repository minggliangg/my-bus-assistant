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
app.use("/api/*", compress());

// Routes - matching the LTA DataMall API paths
app.route("/api/ltaodataservice/v3/BusArrival", busArrival);
app.route("/api/ltaodataservice/BusStops", busStops);
app.route("/api/ltaodataservice/BusRoutes", busRoutes);

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

console.log(`🚌 Bus Assistant API starting on port ${port}`);

export default {
  port,
  fetch: app.fetch,
};

export { app };
