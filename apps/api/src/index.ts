import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { busArrival } from "./routes/bus-arrival";
import { busStops } from "./routes/bus-stops";

const app = new Hono();

// Middleware
app.use("*", logger());
app.use("*", cors());

// Routes - matching the LTA DataMall API paths
app.route("/api/ltaodataservice/v3/BusArrival", busArrival);
app.route("/api/ltaodataservice/BusStops", busStops);

// Health check
app.get("/health", (c) => {
  return c.json({ status: "ok", timestamp: new Date().toISOString() });
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
