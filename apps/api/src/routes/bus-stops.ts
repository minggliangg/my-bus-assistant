import type { BusStopDTO, BusStopsDTO } from "@my-bus-assistant/shared";
import { Hono } from "hono";
import { fetchFromLTA } from "../lib/lta-client";

const busStops = new Hono();

const PAGE_SIZE = 500;
const MAX_PAGES = 20;
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const REFRESH_THRESHOLD_MS = 24 * 60 * 60 * 1000;

interface BusStopsCache {
  data: BusStopDTO[];
  timestamp: number;
}

const busStopsCache: BusStopsCache = {
  data: [],
  timestamp: 0,
};

let refreshPromise: Promise<void> | null = null;
let refreshTimeout: ReturnType<typeof setTimeout> | null = null;

const fetchAllBusStops = async (): Promise<BusStopDTO[]> => {
  const allBusStops: BusStopDTO[] = [];
  let offset = 0;
  let pageCount = 0;

  console.log("Fetching all bus stops from LTA DataMall...");

  while (pageCount < MAX_PAGES) {
    const data = await fetchFromLTA<BusStopsDTO>("/ltaodataservice/BusStops", {
      $skip: offset.toString(),
    });

    if (!data.value || data.value.length === 0) {
      break;
    }

    allBusStops.push(...data.value);
    pageCount++;

    if (data.value.length < PAGE_SIZE) {
      break;
    }

    offset += PAGE_SIZE;
  }

  console.log(
    `Completed: fetched ${allBusStops.length} bus stops in ${pageCount} pages`,
  );

  return allBusStops;
};

const refreshBusStopsCache = async (): Promise<void> => {
  console.log("Background refreshing bus stops cache...");
  try {
    const freshData = await fetchAllBusStops();
    busStopsCache.data = freshData;
    busStopsCache.timestamp = Date.now();
    console.log("Bus stops cache refreshed successfully");
  } catch (error) {
    console.error("Failed to refresh bus stops cache:", error);
  }
};

const triggerBackgroundRefresh = (): void => {
  if (refreshPromise) return;

  refreshPromise = refreshBusStopsCache().finally(() => {
    refreshPromise = null;
    scheduleBackgroundRefresh();
  });
};

const scheduleBackgroundRefresh = (): void => {
  if (refreshTimeout) clearTimeout(refreshTimeout);

  const cacheAge = Date.now() - busStopsCache.timestamp;
  if (busStopsCache.data.length === 0) return;
  if (cacheAge >= CACHE_TTL_MS) return;

  const delay = Math.max(0, REFRESH_THRESHOLD_MS - cacheAge);
  refreshTimeout = setTimeout(triggerBackgroundRefresh, delay);
};

/**
 * GET /api/ltaodataservice/BusStops
 * Returns cached bus stops if valid, otherwise fetches fresh data
 * Implements 7-day TTL with background refresh
 */
busStops.get("/", async (c) => {
  const now = Date.now();
  const cacheAge = now - busStopsCache.timestamp;

  if (busStopsCache.data.length > 0) {
    if (cacheAge < REFRESH_THRESHOLD_MS) {
      return c.json({
        "odata.metadata":
          "https://datamall2.mytransport.sg/ltaodataservice/$metadata#BusStops",
        value: busStopsCache.data,
        cached: true,
        cacheAgeMs: cacheAge,
      });
    }

    if (cacheAge < CACHE_TTL_MS) {
      console.log(
        `Cache stale (${Math.round(cacheAge / 86400000)} days), serving stale while refreshing...`,
      );
      triggerBackgroundRefresh();
      return c.json({
        "odata.metadata":
          "https://datamall2.mytransport.sg/ltaodataservice/$metadata#BusStops",
        value: busStopsCache.data,
        cached: true,
        cacheAgeMs: cacheAge,
        stale: true,
      });
    }
  }

  if (busStopsCache.data.length > 0) {
    console.log(
      `Cache expired (${Math.round(cacheAge / 86400000)} days), fetching fresh...`,
    );
    try {
      const data = await fetchAllBusStops();
      busStopsCache.data = data;
      busStopsCache.timestamp = now;
      scheduleBackgroundRefresh();
      return c.json({
        "odata.metadata":
          "https://datamall2.mytransport.sg/ltaodataservice/$metadata#BusStops",
        value: data,
        cached: false,
        cacheAgeMs: 0,
      });
    } catch (error) {
      console.error("BusStops refresh error:", error);
      return c.json({
        "odata.metadata":
          "https://datamall2.mytransport.sg/ltaodataservice/$metadata#BusStops",
        value: busStopsCache.data,
        cached: true,
        cacheAgeMs: cacheAge,
        stale: true,
        refreshFailed: true,
      });
    }
  }

  console.log("Cache empty, fetching fresh bus stops data...");
  try {
    const data = await fetchAllBusStops();
    busStopsCache.data = data;
    busStopsCache.timestamp = now;
    scheduleBackgroundRefresh();

    return c.json({
      "odata.metadata":
        "https://datamall2.mytransport.sg/ltaodataservice/$metadata#BusStops",
      value: data,
      cached: false,
      cacheAgeMs: 0,
    });
  } catch (error) {
    console.error("BusStops error:", error);
    return c.json({ error: "Failed to fetch bus stops data" }, 500);
  }
});

export { busStops };
