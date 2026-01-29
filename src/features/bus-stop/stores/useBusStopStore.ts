import { create } from "zustand";
import { type BusStopDTO } from "../dtos/bus-arrival";
import { mapBusStopDtoToModel } from "../mappers/bus-stop-mapper";
import { type BusStop } from "../models/bus-stop-models";

interface BusStopStore {
  busStop: BusStop | null;
  loading: boolean;
  error: string | null;
  isAutoRefreshEnabled: boolean;
  lastUpdateTimestamp: number | null;
  lastAttemptTimestamp: number | null;
  isFetching: boolean;
  fetchBusArrivals: (busStopCode: string) => Promise<void>;
  toggleAutoRefresh: () => void;
}

const useBusStore = create<BusStopStore>((set) => ({
  busStop: null,
  loading: false,
  error: null,
  isAutoRefreshEnabled: false,
  lastUpdateTimestamp: null,
  lastAttemptTimestamp: null,
  isFetching: false,

  fetchBusArrivals: async (busStopCode: string) => {
    const THROTTLE_INTERVAL_MS = parseInt(import.meta.env.VITE_THROTTLE_INTERVAL_MS || "45000", 10); // Throttle interval from env var (default: 45s)
    const storageKey = `bus-stop-last-update-${busStopCode}`;
    const now = Date.now();

    // Check if already fetching
    const currentState = useBusStore.getState();
    if (currentState.isFetching) {
      console.log("Fetch skipped: already in progress");
      return;
    }

    // Check throttle, but allow retry if last attempt failed
    try {
      const lastUpdateRaw = localStorage.getItem(storageKey);
      const lastUpdate = lastUpdateRaw ? parseInt(lastUpdateRaw, 10) : null;
      const lastAttempt = currentState.lastAttemptTimestamp;

      if (lastUpdate && now - lastUpdate < THROTTLE_INTERVAL_MS) {
        const failedAttemptAfterLastUpdate =
          lastAttempt !== null && lastAttempt > lastUpdate;
        const retryWindowElapsed =
          lastAttempt !== null && now - lastAttempt > 5000;

        if (!(failedAttemptAfterLastUpdate && retryWindowElapsed)) {
          console.log("Fetch throttled: less than 45s since last update");
          return;
        }
      }
    } catch (error) {
      console.warn("Failed to check throttle:", error);
    }

    // Set fetching state and attempt timestamp
    set({ loading: true, error: null, isFetching: true, lastAttemptTimestamp: now });

    try {
      const response = await fetch(
        `/api/ltaodataservice/v3/BusArrival?BusStopCode=${busStopCode}`,
        {
          headers: {
            Accept: "application/json",
          },
        },
      );

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const dto: BusStopDTO = await response.json();
      const busStop = mapBusStopDtoToModel(dto);
      const now = Date.now();

      // Update timestamp after successful fetch
      try {
        localStorage.setItem(storageKey, now.toString());
      } catch (error) {
        console.warn("Failed to save timestamp:", error);
      }

      set({
        busStop,
        loading: false,
        lastUpdateTimestamp: now,
        isFetching: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Unknown error",
        loading: false,
        isFetching: false,
      });
    }
  },

  toggleAutoRefresh: () => {
    set((state) => ({
      isAutoRefreshEnabled: !state.isAutoRefreshEnabled,
    }));
  },
}));

export default useBusStore;
