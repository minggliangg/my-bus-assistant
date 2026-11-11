import { Hono } from "hono";
import { insertEventBatch } from "../lib/analytics/analytics.repository";
import { parseAnalyticsBatch } from "../lib/analytics/validation";
import { createRateLimiter, resolveClientIp } from "../lib/rate-limit";

const MAX_BODY_BYTES = 16 * 1024;

export const analyticsRateLimiter = createRateLimiter({
  windowMs: Number.parseInt(process.env.ANALYTICS_RATE_LIMIT_WINDOW_MS ?? "60000", 10),
  maxRequests: Number.parseInt(process.env.ANALYTICS_RATE_LIMIT_MAX_REQUESTS ?? "30", 10),
});

const analytics = new Hono();

/**
 * POST /api/analytics/events
 * Accepts a batch of anonymous usage events. The body is read as text so
 * `navigator.sendBeacon` (text/plain, no CORS preflight) works.
 * Always answers 204 for well-formed requests so clients never retry-loop.
 */
analytics.post("/events", async (c) => {
  if (analyticsRateLimiter.isLimited(resolveClientIp(c))) {
    return c.body(null, 429);
  }

  const declaredLength = Number(c.req.header("content-length") ?? "0");
  if (declaredLength > MAX_BODY_BYTES) return c.body(null, 413);

  const text = await c.req.text();
  if (text.length > MAX_BODY_BYTES) return c.body(null, 413);

  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return c.body(null, 400);
  }

  const batch = parseAnalyticsBatch(json);
  if (!batch) return c.body(null, 400);

  try {
    insertEventBatch(batch);
  } catch (error) {
    console.error("Analytics insert failed:", error);
  }
  return c.body(null, 204);
});

export { analytics };
