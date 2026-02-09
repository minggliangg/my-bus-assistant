import { create } from "zustand";
import type { BusRoutesDTO } from "@my-bus-assistant/shared";
import { getCachedBusRoute, saveBusRoute } from "@/lib/storage/bus-stops-db";
import { useBusStopsStore } from "@/features/search-bar/stores";
import type { BusServiceRoute } from "../models/bus-route-model";
import {
  enrichRouteWithStopNames,
  mapBusRouteDtosToModel,
} from "../mappers/bus-route-mapper";

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

interface BusRouteStore {
  route: BusServiceRoute | null;
  loading: boolean;
  error: string | null;
  fetchRoute: (serviceNo: string) => Promise<void>;
}

let latestRequestId = 0;

const useBusRouteStore = create<BusRouteStore>((set) => ({
  route: null,
  loading: false,
  error: null,

  fetchRoute: async (serviceNo: string) => {
    const requestId = ++latestRequestId;
    const isCurrentRequest = () => requestId === latestRequestId;

    if (isCurrentRequest()) {
      set({ loading: true, error: null, route: null });
    }

    try {
      // Check IndexedDB cache
      const cached = await getCachedBusRoute(serviceNo);
      const busStops = useBusStopsStore.getState().busStops;

      if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
        const route = JSON.parse(cached.data) as BusServiceRoute;
        const enriched = enrichRouteWithStopNames(route, busStops);
        if (isCurrentRequest()) {
          set({ route: enriched, loading: false });
        }
        return;
      }

      // Fetch from API
      const response = await fetch(
        `/api/ltaodataservice/BusRoutes?ServiceNo=${encodeURIComponent(serviceNo)}`,
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch route data (${response.status})`);
      }

      const data: BusRoutesDTO = await response.json();
      const route = mapBusRouteDtosToModel(data.value);
      const enriched = enrichRouteWithStopNames(route, busStops);

      // Save to cache
      await saveBusRoute(serviceNo, JSON.stringify(route), Date.now());

      if (isCurrentRequest()) {
        set({ route: enriched, loading: false });
      }
    } catch (err) {
      if (isCurrentRequest()) {
        set({
          error: err instanceof Error ? err.message : "Failed to fetch route",
          loading: false,
          route: null,
        });
      }
    }
  },
}));

export default useBusRouteStore;
