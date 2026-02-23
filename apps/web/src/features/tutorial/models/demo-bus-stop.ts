import type { BusStop } from "@/features/bus-arrivals/models/bus-arrivals-model";

/**
 * Demo bus stop data used during the tutorial to demonstrate
 * the favorite feature when no real bus data is available.
 */
export const DEMO_BUS_STOP: BusStop = {
  busStopCode: "DEMO01",
  services: [
    {
      serviceNo: "TUT",
      operator: "SBST",
      nextBus: {
        estimatedArrival: new Date(Date.now() + 5 * 60000),
        load: "SEA",
        type: "SD",
        feature: "",
        latitude: 0,
        longitude: 0,
        visitNumber: 1,
        originCode: "",
        destinationCode: "",
      },
      nextBus2: null,
      nextBus3: null,
    },
  ],
};
