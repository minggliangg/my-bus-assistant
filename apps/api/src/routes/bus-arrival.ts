import type { BusArrivalDTO } from "@my-bus-assistant/shared";
import type { Context } from "hono";
import { Hono } from "hono";
import { LtaUpstreamError, fetchFromLTA } from "../lib/lta-client";

const busArrival = new Hono();
const arrivalCache = new Map<string, { expiresAt: number; data: BusArrivalDTO }>();
const rateLimitStore = new Map<string, number[]>();
const ARRIVAL_CACHE_TTL_MS = Number.parseInt(
  process.env.BUS_ARRIVAL_CACHE_TTL_MS ?? "15000",
  10,
);
const RATE_LIMIT_WINDOW_MS = Number.parseInt(
  process.env.BUS_ARRIVAL_RATE_LIMIT_WINDOW_MS ?? "60000",
  10,
);
const RATE_LIMIT_MAX_REQUESTS = Number.parseInt(
  process.env.BUS_ARRIVAL_RATE_LIMIT_MAX_REQUESTS ?? "60",
  10,
);

const resolveClientIp = (c: Context): string => {
  const forwarded = c.req.header("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const realIp = c.req.header("x-real-ip");
  if (realIp) return realIp;
  return "unknown";
};

const isRateLimited = (ip: string): boolean => {
  const now = Date.now();
  const threshold = now - RATE_LIMIT_WINDOW_MS;
  const requests = rateLimitStore.get(ip) ?? [];
  const recent = requests.filter((ts) => ts > threshold);
  recent.push(now);
  rateLimitStore.set(ip, recent);
  return recent.length > RATE_LIMIT_MAX_REQUESTS;
};

/**
 * GET /api/ltaodataservice/v3/BusArrival
 * Proxies bus arrival data from LTA DataMall
 */
busArrival.get("/", async (c) => {
  const ip = resolveClientIp(c);
  if (isRateLimited(ip)) {
    console.warn(
      JSON.stringify({ event: "rate_limited_request", route: "BusArrival", ip }),
    );
    return c.json({ error: "Too many requests" }, 429);
  }

  const busStopCode = c.req.query("BusStopCode");

  if (!busStopCode) {
    return c.json({ error: "BusStopCode is required" }, 400);
  }

  // Validate bus stop code format (5 digits)
  if (!/^\d{5}$/.test(busStopCode)) {
    return c.json({ error: "Invalid BusStopCode format" }, 400);
  }

  const cached = arrivalCache.get(busStopCode);
  if (cached && cached.expiresAt > Date.now()) {
    console.info(
      JSON.stringify({ event: "bus_arrival_cache_hit", busStopCode, ip }),
    );
    return c.json(cached.data);
  }
  console.info(
    JSON.stringify({ event: "bus_arrival_cache_miss", busStopCode, ip }),
  );

  try {
    const data = await fetchFromLTA<BusArrivalDTO>(
      "/ltaodataservice/v3/BusArrival",
      { BusStopCode: busStopCode },
    );
    arrivalCache.set(busStopCode, {
      data,
      expiresAt: Date.now() + ARRIVAL_CACHE_TTL_MS,
    });
    return c.json(data);
  } catch (error) {
    console.error("BusArrival error:", error);
    if (error instanceof LtaUpstreamError) {
      if (error.status === 429) {
        return c.json(
          { error: "Upstream API rate limited request", retryable: true },
          503,
        );
      }
      if (error.status && error.status >= 400 && error.status < 500) {
        return c.json({ error: "Upstream API rejected request" }, 502);
      }
      return c.json(
        {
          error: "Upstream API unavailable",
          retryable: error.retryable,
        },
        503,
      );
    }
    return c.json({ error: "Failed to fetch bus arrival data" }, 500);
  }
});

export { busArrival };
