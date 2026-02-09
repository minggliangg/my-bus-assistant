import { Hono } from "hono";
import {
  getAllBusStops,
  getBusStopsCount,
  getBusStopsPage,
} from "../lib/db/repositories/bus-stops.repository";
import { getMetadata } from "../lib/db/repositories/metadata.repository";

const busStops = new Hono();

busStops.get("/", (c) => {
  const total = getBusStopsCount();
  const skipRaw = c.req.query("$skip");
  const topRaw = c.req.query("$top");
  const hasPagingParams = skipRaw !== undefined || topRaw !== undefined;
  const skip = Math.max(0, Number.parseInt(skipRaw ?? "0", 10) || 0);
  const top = Math.max(
    1,
    Math.min(5000, Number.parseInt(topRaw ?? `${total || 1}`, 10) || total || 1),
  );
  const stops = hasPagingParams ? getBusStopsPage(skip, top) : getAllBusStops();
  const effectiveTop = hasPagingParams ? top : total;
  const hasMore = skip + effectiveTop < total;
  const lastUpdated = getMetadata("bus_stops_last_updated")?.value ?? "never";
  const etag = `W/"busstops:${total}:${lastUpdated}:${skip}:${effectiveTop}"`;

  if (c.req.header("if-none-match") === etag) {
    return c.body(null, 304);
  }

  c.header("ETag", etag);

  return c.json({
    "odata.metadata":
      "https://datamall2.mytransport.sg/ltaodataservice/$metadata#BusStops",
    pagination: {
      total,
      skip,
      top: effectiveTop,
      hasMore,
    },
    value: stops,
  });
});

export { busStops };
