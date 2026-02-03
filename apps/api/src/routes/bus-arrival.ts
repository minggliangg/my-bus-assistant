import type { BusArrivalDTO } from "@my-bus-assistant/shared";
import { Hono } from "hono";
import { fetchFromLTA } from "../lib/lta-client";

const busArrival = new Hono();

/**
 * GET /api/ltaodataservice/v3/BusArrival
 * Proxies bus arrival data from LTA DataMall
 */
busArrival.get("/", async (c) => {
  const busStopCode = c.req.query("BusStopCode");

  if (!busStopCode) {
    return c.json({ error: "BusStopCode is required" }, 400);
  }

  // Validate bus stop code format (5 digits)
  if (!/^\d{5}$/.test(busStopCode)) {
    return c.json({ error: "Invalid BusStopCode format" }, 400);
  }

  try {
    const data = await fetchFromLTA<BusArrivalDTO>(
      "/ltaodataservice/v3/BusArrival",
      { BusStopCode: busStopCode },
    );
    return c.json(data);
  } catch (error) {
    console.error("BusArrival error:", error);
    return c.json({ error: "Failed to fetch bus arrival data" }, 500);
  }
});

export { busArrival };
