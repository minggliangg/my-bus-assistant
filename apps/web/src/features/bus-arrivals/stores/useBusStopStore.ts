import { create } from "zustand";
import { type BusArrivalDTO } from "../dtos/bus-arrival-dto";
import { mapBusStopDtoToModel } from "../mappers/bus-stop-mapper";
import {
  formatArrivalTime,
  type BusService,
  type BusStop,
} from "../models/bus-arrivals-model";
import { resolveBusStopNames } from "../utils/resolve-bus-stop-names";

interface ChangedField {
  serviceNo: string;
  busIndex: 0 | 1 | 2; // nextBus, nextBus2, or nextBus3
  changedAt: number; // timestamp
}

interface BusStopStore {
  busStop: BusStop | null;
  selectedBusStopCode: string | null;
  loading: boolean;
  error: string | null;
  isAutoRefreshEnabled: boolean;
  lastUpdateTimestamp: number | null;
  lastAttemptTimestamp: number | null;
  isFetching: boolean;
  changedFields: ChangedField[]; // Track recently changed fields
  isStale: boolean; // Indicates if displayed data is from cache
  fetchBusArrivals: (busStopCode: string) => Promise<void>;
  toggleAutoRefresh: () => void;
  clearChangedFields: () => void; // Cleanup old changes
  reset: () => void; // Reset store to initial state (for testing)
}

// Serialization helpers for localStorage persistence
const serializeBusStop = (busStop: BusStop): string => {
  return JSON.stringify(busStop, (_key, value) => {
    // Convert Date objects to ISO strings
    if (value instanceof Date) {
      return value.toISOString();
    }
    return value;
  });
};

const deserializeBusStop = (json: string): BusStop => {
  return JSON.parse(json, (key, value) => {
    // Convert ISO strings back to Date objects for estimatedArrival fields
    if (
      typeof value === "string" &&
      (key === "estimatedArrival" || key === "nextBusEstimatedArrival") &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)
    ) {
      return new Date(value);
    }
    return value;
  });
};

const loadCachedBusStop = (busStopCode: string): BusStop | null => {
  try {
    const cacheKey = `bus-stop-data-${busStopCode}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      return deserializeBusStop(cached);
    }
  } catch (error) {
    console.warn("Failed to load cached bus stop data:", error);
  }
  return null;
};

const saveBusStopToCache = (busStopCode: string, busStop: BusStop): void => {
  try {
    const cacheKey = `bus-stop-data-${busStopCode}`;
    const serialized = serializeBusStop(busStop);
    localStorage.setItem(cacheKey, serialized);
  } catch (error) {
    console.warn("Failed to save bus stop data to cache:", error);
  }
};

const useBusStore = create<BusStopStore>((set, get) => {
  // Helper to compare bus arrivals and detect changes
  const compareBusArrivals = (
    oldServices: BusService[],
    newServices: BusService[],
  ): ChangedField[] => {
    const changes: ChangedField[] = [];
    const now = Date.now();

    for (const newService of newServices) {
      const oldService = oldServices.find(
        (s) => s.serviceNo === newService.serviceNo,
      );

      if (!oldService) {
        // New service appeared - mark all buses as changed
        changes.push(
          { serviceNo: newService.serviceNo, busIndex: 0, changedAt: now },
          { serviceNo: newService.serviceNo, busIndex: 1, changedAt: now },
          { serviceNo: newService.serviceNo, busIndex: 2, changedAt: now },
        );
        continue;
      }

      // Compare each bus arrival
      const oldBuses = [
        oldService.nextBus,
        oldService.nextBus2,
        oldService.nextBus3,
      ];
      const newBuses = [
        newService.nextBus,
        newService.nextBus2,
        newService.nextBus3,
      ];

      for (let i = 0; i < 3; i++) {
        const oldTime = oldBuses[i] ? formatArrivalTime(oldBuses[i]!) : null;
        const newTime = newBuses[i] ? formatArrivalTime(newBuses[i]!) : null;

        if (oldTime !== newTime) {
          changes.push({
            serviceNo: newService.serviceNo,
            busIndex: i as 0 | 1 | 2,
            changedAt: now,
          });
        }
      }
    }

    return changes;
  };

  // Helper to cleanup old changes
  const cleanupOldChanges = (changedFields: ChangedField[]): ChangedField[] => {
    const now = Date.now();
    const MAX_AGE_MS = 3000; // 3 seconds
    return changedFields.filter((field) => now - field.changedAt < MAX_AGE_MS);
  };

  return {
    busStop: null,
    selectedBusStopCode: null,
    loading: true,
    error: null,
    isAutoRefreshEnabled: false,
    lastUpdateTimestamp: null,
    lastAttemptTimestamp: null,
    isFetching: false,
    changedFields: [],
    isStale: false,

    fetchBusArrivals: async (busStopCode: string) => {
      const THROTTLE_INTERVAL_MS = parseInt(
        import.meta.env.VITE_THROTTLE_INTERVAL_MS || "30000",
        10,
      );
      const storageKey = `bus-stop-last-update-${busStopCode}`;
      const now = Date.now();

      const currentState = get();

      // [1] Prevent overlapping fetches
      if (currentState.isFetching) {
        console.log("Fetch skipped: already in progress");
        return;
      }

      // [2] Track selected bus stop code
      set({ selectedBusStopCode: busStopCode });

      // [3] ALWAYS load cached data for the selected stop
      const cachedBusStop = loadCachedBusStop(busStopCode);

      if (cachedBusStop) {
        // Show cached data immediately
        set({
          busStop: cachedBusStop,
          loading: false,
          error: null,
          isStale: true,
        });
      } else {
        // No cache, clear previous data and show loading
        set({
          busStop: null,
          loading: true,
          error: null,
          isStale: false,
        });
      }

      // [4] Check throttle for API fetch
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
            console.log("Fetch throttled: less than 30s since last update");
            // Keep cached data visible with stale indicator
            set({
              loading: false,
              isStale: cachedBusStop !== null,
            });
            return;
          }
        }
      } catch (error) {
        console.warn("Failed to check throttle:", error);
      }

      // [5] Proceed with API fetch (not throttled)
      set({
        loading: true,
        isFetching: true,
        lastAttemptTimestamp: now,
      });

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

        const dto: BusArrivalDTO = await response.json();
        const mappedBusStop = mapBusStopDtoToModel(dto);
        const busStop = resolveBusStopNames(mappedBusStop);
        const now = Date.now();

        const changedFields = currentState.busStop
          ? compareBusArrivals(currentState.busStop.services, busStop.services)
          : [];

        const existingChanges = currentState.changedFields;
        const updatedChanges =
          cleanupOldChanges(existingChanges).concat(changedFields);

        try {
          localStorage.setItem(storageKey, now.toString());
        } catch (error) {
          console.warn("Failed to save timestamp:", error);
        }

        saveBusStopToCache(busStopCode, busStop);

        set({
          busStop,
          loading: false,
          lastUpdateTimestamp: now,
          isFetching: false,
          changedFields: updatedChanges,
          isStale: false,
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

    clearChangedFields: () => {
      set({ changedFields: [] });
    },

    reset: () => {
      // Clear all cached bus stop data from localStorage
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key?.startsWith("bus-stop-data-")) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach((key) => localStorage.removeItem(key));
      } catch (error) {
        console.warn("Failed to clear cached bus stop data:", error);
      }

      set({
        busStop: null,
        selectedBusStopCode: null,
        loading: true,
        error: null,
        isAutoRefreshEnabled: false,
        lastUpdateTimestamp: null,
        lastAttemptTimestamp: null,
        isFetching: false,
        changedFields: [],
        isStale: false,
      });
    },
  };
});

export type { ChangedField };
export default useBusStore;
