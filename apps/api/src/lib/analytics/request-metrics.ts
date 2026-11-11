import type { MiddlewareHandler } from "hono";
import { insertApiRequest } from "./analytics.repository";

const KNOWN_ROUTES = new Set([
  "/api/ltaodataservice/v3/BusArrival",
  "/api/ltaodataservice/BusStops",
  "/api/ltaodataservice/BusRoutes",
]);

/** Collapse unknown paths so scanners can't blow up route cardinality. */
const routeLabel = (path: string): string => {
  const trimmed = path.length > 1 ? path.replace(/\/+$/, "") : path;
  return KNOWN_ROUTES.has(trimmed) ? trimmed.replace("/api/ltaodataservice", "") : "other";
};

/**
 * Records status, latency and cache outcome for every /api/* request
 * (except the analytics ingest endpoint itself).
 */
export const requestMetrics = (): MiddlewareHandler => async (c, next) => {
  if (c.req.path.startsWith("/api/analytics")) return next();

  const start = performance.now();
  await next();
  try {
    insertApiRequest({
      ts: Date.now(),
      route: routeLabel(c.req.path),
      method: c.req.method,
      status: c.res.status,
      durationMs: Math.round((performance.now() - start) * 10) / 10,
      cache: c.res.headers.get("x-cache"),
    });
  } catch (error) {
    console.error("Failed to record API metrics:", error);
  }
};
