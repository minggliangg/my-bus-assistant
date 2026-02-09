import { Hono } from "hono";
import { getBusRoutesByServiceNo } from "../lib/db/repositories/bus-routes.repository";

const busRoutes = new Hono();

busRoutes.get("/", (c) => {
  const serviceNo = c.req.query("ServiceNo");

  if (!serviceNo) {
    return c.json({ error: "ServiceNo query parameter is required" }, 400);
  }

  const routes = getBusRoutesByServiceNo(serviceNo);

  return c.json({
    "odata.metadata":
      "https://datamall2.mytransport.sg/ltaodataservice/$metadata#BusRoutes",
    value: routes,
  });
});

export { busRoutes };
