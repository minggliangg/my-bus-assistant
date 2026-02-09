import { Hono } from "hono";
import {
  getAllBusRoutes,
  getBusRoutesCount,
  getBusRoutesPage,
} from "../lib/db/repositories/bus-routes.repository";
import { getMetadata } from "../lib/db/repositories/metadata.repository";

const busRoutes = new Hono();

busRoutes.get("/", (c) => {
  const total = getBusRoutesCount();
  const skipRaw = c.req.query("$skip");
  const topRaw = c.req.query("$top");
  const hasPagingParams = skipRaw !== undefined || topRaw !== undefined;
  const skip = Math.max(0, Number.parseInt(skipRaw ?? "0", 10) || 0);
  const top = Math.max(
    1,
    Math.min(5000, Number.parseInt(topRaw ?? `${total || 1}`, 10) || total || 1),
  );
  const routes = hasPagingParams
    ? getBusRoutesPage(skip, top)
    : getAllBusRoutes();
  const effectiveTop = hasPagingParams ? top : total;
  const hasMore = skip + effectiveTop < total;
  const lastUpdated = getMetadata("bus_routes_last_updated")?.value ?? "never";
  const etag = `W/"busroutes:${total}:${lastUpdated}:${skip}:${effectiveTop}"`;

  if (c.req.header("if-none-match") === etag) {
    return c.body(null, 304);
  }

  c.header("ETag", etag);

  return c.json({
    "odata.metadata":
      "https://datamall2.mytransport.sg/ltaodataservice/$metadata#BusRoutes",
    pagination: {
      total,
      skip,
      top: effectiveTop,
      hasMore,
    },
    value: routes,
  });
});

export { busRoutes };
