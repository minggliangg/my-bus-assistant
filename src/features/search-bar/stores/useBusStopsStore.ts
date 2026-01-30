import { create } from "zustand";
import type { BusStopsDTO } from "../dtos/bus-stops-dto";
import { mapBusStopsDtoToModel } from "../mappers/bus-stops-mapper";
import type { BusStopSearchModel } from "../models/bus-stops-model";
import {
  getAllBusStops,
  getLastUpdate,
  saveBusStops,
  setLastUpdate,
} from "@/lib/storage/bus-stops-db";

interface BusStopsStore {
  busStops: BusStopSearchModel[];
  loading: boolean;
  error: string | null;
  lastUpdateTimestamp: number | null;
  isFetching: boolean;
  retryCount: number;
  isStale: boolean;
  fetchBusStops: () => Promise<void>;
  searchBusStops: (query: string) => BusStopSearchModel[];
  getBusStopByCode: (code: string) => BusStopSearchModel | undefined;
  retry: () => Promise<void>;
  reset: () => void;
}

const useBusStopsStore = create<BusStopsStore>((set, get) => {
  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  return {
    busStops: [],
    loading: true,
    error: null,
    lastUpdateTimestamp: null,
    isFetching: false,
    retryCount: 0,
    isStale: false,

    fetchBusStops: async () => {
      const currentState = get();
      if (currentState.isFetching) {
        console.log("Fetch skipped: already in progress");
        return;
      }

      const REFRESH_DAYS = parseInt(
        import.meta.env.VITE_BUS_STOPS_REFRESH_DAYS || "7",
        10,
      );
      const now = Date.now();
      const REFRESH_MS = REFRESH_DAYS * 24 * 60 * 60 * 1000;

      set({ isFetching: true, loading: true, error: null });

      try {
        const cachedStops = await getAllBusStops();
        const lastUpdate = await getLastUpdate();
        const shouldRefresh =
          !lastUpdate || now - lastUpdate > REFRESH_MS;

        if (cachedStops.length > 0 && !shouldRefresh) {
          set({
            busStops: cachedStops,
            loading: false,
            lastUpdateTimestamp: lastUpdate,
            isStale: false,
            isFetching: false,
            retryCount: 0,
          });
          return;
        }

        if (cachedStops.length > 0) {
          set({
            busStops: cachedStops,
            loading: false,
            isStale: true,
          });
        }

        let retryAttempts = 0;
        const maxRetries = 3;
        const backoffDelays = [1000, 2000, 4000];

        while (retryAttempts <= maxRetries) {
          try {
            const response = await fetch("/api/ltaodataservice/BusStops", {
              headers: {
                Accept: "application/json",
              },
            });

            if (!response.ok) {
              const isRetryable =
                response.status >= 500 || response.status === 429;

              if (!isRetryable || retryAttempts === maxRetries) {
                throw new Error(`API Error: ${response.status}`);
              }

              throw new Error(`Retryable error: ${response.status}`);
            }

            const dto: BusStopsDTO = await response.json();
            const busStops = mapBusStopsDtoToModel(dto);

            await saveBusStops(busStops);
            await setLastUpdate(now);

            set({
              busStops,
              loading: false,
              lastUpdateTimestamp: now,
              isStale: false,
              isFetching: false,
              retryCount: 0,
            });

            return;
          } catch (error) {
            retryAttempts++;

            if (retryAttempts > maxRetries) {
              const errorMessage =
                error instanceof Error ? error.message : "Unknown error";
              set({
                error: errorMessage,
                loading: false,
                isFetching: false,
                retryCount: maxRetries,
              });
              return;
            }

            const delay = backoffDelays[Math.min(retryAttempts - 1, 2)];
            console.log(`Retry attempt ${retryAttempts} after ${delay}ms`);
            await sleep(delay);
          }
        }
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : "Unknown error",
          loading: false,
          isFetching: false,
        });
      }
    },

    searchBusStops: (query: string) => {
      const { busStops } = get();
      if (!query.trim()) return busStops.slice(0, 10);

      const lowerQuery = query.toLowerCase().trim();

      return busStops
        .filter((stop) => {
          const matchesCode = stop.busStopCode.toLowerCase().includes(lowerQuery);
          const matchesDescription = stop.description.toLowerCase().includes(lowerQuery);
          const matchesRoadName = stop.roadName.toLowerCase().includes(lowerQuery);
          return matchesCode || matchesDescription || matchesRoadName;
        })
        .slice(0, 10);
    },

    getBusStopByCode: (code: string) => {
      const { busStops } = get();
      return busStops.find((stop) => stop.busStopCode === code);
    },

    retry: async () => {
      set({ retryCount: 0, error: null });
      await get().fetchBusStops();
    },

    reset: () => {
      set({
        busStops: [],
        loading: true,
        error: null,
        lastUpdateTimestamp: null,
        isFetching: false,
        retryCount: 0,
        isStale: false,
      });
    },
  };
});

export default useBusStopsStore;
