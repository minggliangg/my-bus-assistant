import type { BusStopDTO, BusStopsDTO } from "@my-bus-assistant/shared";
import { Hono } from "hono";
import { fetchFromLTA } from "../lib/lta-client";

const busStops = new Hono();

/**
 * GET /api/ltaodataservice/BusStops
 * Fetches ALL bus stops from LTA DataMall by aggregating paginated results
 * Returns a single response with all bus stops
 */
busStops.get("/", async (c) => {
  try {
    const PAGE_SIZE = 500;
    const MAX_PAGES = 20; // Safety limit
    const allBusStops: BusStopDTO[] = [];
    let offset = 0;
    let pageCount = 0;

    console.log("Fetching all bus stops from LTA DataMall...");

    while (pageCount < MAX_PAGES) {
      const data = await fetchFromLTA<BusStopsDTO>(
        "/ltaodataservice/BusStops",
        { $skip: offset.toString() },
      );

      if (!data.value || data.value.length === 0) {
        break;
      }

      allBusStops.push(...data.value);
      pageCount++;

      console.log(
        `Fetched page ${pageCount}: ${data.value.length} stops (total: ${allBusStops.length})`,
      );

      // If we got fewer results than PAGE_SIZE, we've reached the end
      if (data.value.length < PAGE_SIZE) {
        break;
      }

      offset += PAGE_SIZE;
    }

    console.log(
      `Completed: fetched ${allBusStops.length} bus stops in ${pageCount} pages`,
    );

    return c.json({
      "odata.metadata":
        "https://datamall2.mytransport.sg/ltaodataservice/$metadata#BusStops",
      value: allBusStops,
    });
  } catch (error) {
    console.error("BusStops error:", error);
    return c.json({ error: "Failed to fetch bus stops data" }, 500);
  }
});

export { busStops };
