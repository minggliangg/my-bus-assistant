import { create } from "zustand";
import { type BusStopDTO } from "../dtos/bus-arrival-dto";
import { mapBusStopDtoToModel } from "../mappers/bus-stop-mapper";
import {
  formatArrivalTime,
  type BusService,
  type BusStop,
} from "../models/bus-arrivals-model";

interface ChangedField {
  serviceNo: string;
  busIndex: 0 | 1 | 2; // nextBus, nextBus2, or nextBus3
  changedAt: number; // timestamp
}

interface BusStopStore {
  busStop: BusStop | null;
  loading: boolean;
  error: string | null;
  isAutoRefreshEnabled: boolean;
  lastUpdateTimestamp: number | null;
  lastAttemptTimestamp: number | null;
  isFetching: boolean;
  changedFields: ChangedField[]; // Track recently changed fields
  fetchBusArrivals: (busStopCode: string) => Promise<void>;
  toggleAutoRefresh: () => void;
  clearChangedFields: () => void; // Cleanup old changes
  reset: () => void; // Reset store to initial state (for testing)
}

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
    loading: false,
    error: null,
    isAutoRefreshEnabled: false,
    lastUpdateTimestamp: null,
    lastAttemptTimestamp: null,
    isFetching: false,
    changedFields: [],

    fetchBusArrivals: async (busStopCode: string) => {
      const THROTTLE_INTERVAL_MS = parseInt(
        import.meta.env.VITE_THROTTLE_INTERVAL_MS || "45000",
        10,
      ); // Throttle interval from env var (default: 45s)
      const storageKey = `bus-stop-last-update-${busStopCode}`;
      const now = Date.now();

      // Get current state
      const currentState = get();
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
      set({
        loading: true,
        error: null,
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

        const dto: BusStopDTO = await response.json();
        const busStop = mapBusStopDtoToModel(dto);
        const now = Date.now();

        // Compare with previous data to detect changes
        const changedFields = currentState.busStop
          ? compareBusArrivals(currentState.busStop.services, busStop.services)
          : [];

        // Cleanup old changes before adding new ones
        const existingChanges = currentState.changedFields;
        const updatedChanges =
          cleanupOldChanges(existingChanges).concat(changedFields);

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
          changedFields: updatedChanges,
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
      set({
        busStop: null,
        loading: false,
        error: null,
        isAutoRefreshEnabled: false,
        lastUpdateTimestamp: null,
        lastAttemptTimestamp: null,
        isFetching: false,
        changedFields: [],
      });
    },
  };
});

export type { ChangedField };
export default useBusStore;
