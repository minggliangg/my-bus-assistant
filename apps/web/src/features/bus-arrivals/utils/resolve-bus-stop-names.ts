import useBusStopsStore from "@/features/search-bar/stores/useBusStopsStore";
import type { BusArrival, BusStop } from "../models/bus-arrivals-model";

export const resolveBusStopNames = (busStop: BusStop): BusStop => {
  const getBusStopName = (code: string): string | undefined => {
    if (!code) return undefined;
    const stop = useBusStopsStore.getState().getBusStopByCode(code);
    return stop?.description;
  };

  const enrichArrival = (arrival: BusArrival | null): BusArrival | null => {
    if (!arrival) return null;
    return {
      ...arrival,
      originName: getBusStopName(arrival.originCode),
      destinationName: getBusStopName(arrival.destinationCode),
    };
  };

  return {
    ...busStop,
    services: busStop.services.map((service) => ({
      ...service,
      nextBus: enrichArrival(service.nextBus),
      nextBus2: enrichArrival(service.nextBus2),
      nextBus3: enrichArrival(service.nextBus3),
    })),
  };
};
