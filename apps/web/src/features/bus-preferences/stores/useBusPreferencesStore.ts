import { create } from "zustand";
import {
  getBusStopPreferences,
  saveBusStopPreferences,
  getAllBusStopPreferences,
  getGlobalPriorities,
  saveGlobalPriorities,
} from "@/lib/storage/bus-stops-db";
import type {
  BusStopServicePreferences,
  GlobalBusPriorities,
} from "../models/bus-preferences-model";

interface BusPreferencesStore {
  stopPreferences: Record<string, BusStopServicePreferences>;
  globalPriorities: GlobalBusPriorities;
  loading: boolean;
  error: string | null;

  loadAllPreferences: () => Promise<void>;
  loadBusStopPreferences: (busStopCode: string) => Promise<void>;
  hideService: (busStopCode: string, serviceNo: string) => Promise<void>;
  unhideService: (busStopCode: string, serviceNo: string) => Promise<void>;
  reorderServices: (
    busStopCode: string,
    serviceOrder: string[]
  ) => Promise<void>;
  saveStopPreferences: (
    busStopCode: string,
    serviceOrder: string[],
    hiddenServices: string[]
  ) => Promise<void>;
  resetServiceOrder: (busStopCode: string) => Promise<void>;

  loadGlobalPriorities: () => Promise<void>;
  addPriorityService: (serviceNo: string) => Promise<void>;
  removePriorityService: (serviceNo: string) => Promise<void>;
  isPriorityService: (serviceNo: string) => boolean;
  isServiceHidden: (busStopCode: string, serviceNo: string) => boolean;
  getSortedServices: <T extends { serviceNo: string }>(
    busStopCode: string,
    services: T[]
  ) => T[];
}

const DEFAULT_GLOBAL_PRIORITIES: GlobalBusPriorities = {
  prioritizedServices: [],
  updatedAt: 0,
};

const useBusPreferencesStore = create<BusPreferencesStore>((set, get) => ({
  stopPreferences: {},
  globalPriorities: DEFAULT_GLOBAL_PRIORITIES,
  loading: true,
  error: null,

  loadAllPreferences: async () => {
    set({ loading: true, error: null });
    try {
      const [allStopPrefs, globalPrefs] = await Promise.all([
        getAllBusStopPreferences(),
        getGlobalPriorities(),
      ]);
      const stopPrefsMap = allStopPrefs.reduce(
        (acc, pref) => {
          acc[pref.busStopCode] = pref;
          return acc;
        },
        {} as Record<string, BusStopServicePreferences>
      );
      set({
        stopPreferences: stopPrefsMap,
        globalPriorities: globalPrefs ?? DEFAULT_GLOBAL_PRIORITIES,
        loading: false,
        error: null,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Unknown error",
        loading: false,
      });
    }
  },

  loadBusStopPreferences: async (busStopCode: string) => {
    try {
      const prefs = await getBusStopPreferences(busStopCode);
      set((state) => ({
        stopPreferences: {
          ...state.stopPreferences,
          [busStopCode]: prefs ?? {
            busStopCode,
            hiddenServices: [],
            serviceOrder: null,
            updatedAt: 0,
          },
        },
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },

  hideService: async (busStopCode: string, serviceNo: string) => {
    try {
      const current = await getBusStopPreferences(busStopCode);
      const prefs: BusStopServicePreferences = {
        busStopCode,
        hiddenServices: [
          ...(current?.hiddenServices ?? []),
          serviceNo,
        ],
        serviceOrder: current?.serviceOrder ?? null,
        updatedAt: Date.now(),
      };
      await saveBusStopPreferences(prefs);
      set((state) => ({
        stopPreferences: {
          ...state.stopPreferences,
          [busStopCode]: prefs,
        },
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },

  unhideService: async (busStopCode: string, serviceNo: string) => {
    try {
      const current = await getBusStopPreferences(busStopCode);
      if (!current) return;
      const prefs: BusStopServicePreferences = {
        busStopCode,
        hiddenServices: current.hiddenServices.filter((s) => s !== serviceNo),
        serviceOrder: current.serviceOrder,
        updatedAt: Date.now(),
      };
      await saveBusStopPreferences(prefs);
      set((state) => ({
        stopPreferences: {
          ...state.stopPreferences,
          [busStopCode]: prefs,
        },
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },

  reorderServices: async (busStopCode: string, serviceOrder: string[]) => {
    try {
      const current = await getBusStopPreferences(busStopCode);
      const prefs: BusStopServicePreferences = {
        busStopCode,
        hiddenServices: current?.hiddenServices ?? [],
        serviceOrder,
        updatedAt: Date.now(),
      };
      await saveBusStopPreferences(prefs);
      set((state) => ({
        stopPreferences: {
          ...state.stopPreferences,
          [busStopCode]: prefs,
        },
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },

  saveStopPreferences: async (busStopCode, serviceOrder, hiddenServices) => {
    try {
      const prefs: BusStopServicePreferences = {
        busStopCode,
        serviceOrder,
        hiddenServices,
        updatedAt: Date.now(),
      };
      await saveBusStopPreferences(prefs);
      set((state) => ({
        stopPreferences: { ...state.stopPreferences, [busStopCode]: prefs },
      }));
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Unknown error" });
    }
  },

  resetServiceOrder: async (busStopCode: string) => {
    try {
      const prefs: BusStopServicePreferences = {
        busStopCode,
        hiddenServices: [],
        serviceOrder: null,
        updatedAt: Date.now(),
      };
      await saveBusStopPreferences(prefs);
      set((state) => ({
        stopPreferences: {
          ...state.stopPreferences,
          [busStopCode]: prefs,
        },
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },

  loadGlobalPriorities: async () => {
    try {
      const prefs = await getGlobalPriorities();
      set({ globalPriorities: prefs ?? DEFAULT_GLOBAL_PRIORITIES });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },

  addPriorityService: async (serviceNo: string) => {
    try {
      const current = await getGlobalPriorities();
      const prioritizedServices = current?.prioritizedServices ?? [];
      if (prioritizedServices.includes(serviceNo)) return;
      const prefs: GlobalBusPriorities = {
        prioritizedServices: [...prioritizedServices, serviceNo],
        updatedAt: Date.now(),
      };
      await saveGlobalPriorities(prefs);
      set({ globalPriorities: prefs });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },

  removePriorityService: async (serviceNo: string) => {
    try {
      const current = await getGlobalPriorities();
      if (!current) return;
      const prefs: GlobalBusPriorities = {
        prioritizedServices: current.prioritizedServices.filter(
          (s) => s !== serviceNo
        ),
        updatedAt: Date.now(),
      };
      await saveGlobalPriorities(prefs);
      set({ globalPriorities: prefs });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },

  isPriorityService: (serviceNo: string) => {
    const { globalPriorities } = get();
    return globalPriorities.prioritizedServices.includes(serviceNo);
  },

  isServiceHidden: (busStopCode: string, serviceNo: string) => {
    const { stopPreferences, globalPriorities } = get();
    if (globalPriorities.prioritizedServices.includes(serviceNo)) {
      return false;
    }
    return stopPreferences[busStopCode]?.hiddenServices.includes(serviceNo) ?? false;
  },

  getSortedServices: <T extends { serviceNo: string }>(
    busStopCode: string,
    services: T[]
  ): T[] => {
    const { stopPreferences, globalPriorities } = get();
    const stopPrefs = stopPreferences[busStopCode];
    const prioritySet = new Set(globalPriorities.prioritizedServices);
    const hiddenSet = new Set(stopPrefs?.hiddenServices ?? []);
    const availableServiceNos = new Set(services.map((s) => s.serviceNo));
    const priorityServices = globalPriorities.prioritizedServices.filter((s) =>
      availableServiceNos.has(s)
    );
    let remainingServices: T[];
    if (stopPrefs?.serviceOrder) {
      const orderedSet = new Set(stopPrefs.serviceOrder);
      const ordered = stopPrefs.serviceOrder
        .filter((s) => availableServiceNos.has(s) && !prioritySet.has(s))
        .map((serviceNo) => services.find((s) => s.serviceNo === serviceNo)!)
        .filter(Boolean);
      const unordered = services.filter(
        (s) =>
          !orderedSet.has(s.serviceNo) &&
          !prioritySet.has(s.serviceNo)
      );
      remainingServices = [...ordered, ...unordered];
    } else {
      remainingServices = services.filter((s) => !prioritySet.has(s.serviceNo));
    }
    remainingServices = remainingServices.filter(
      (s) => !hiddenSet.has(s.serviceNo)
    );
    const priorityServiceObjects = priorityServices
      .map((serviceNo) => services.find((s) => s.serviceNo === serviceNo)!)
      .filter(Boolean);
    return [...priorityServiceObjects, ...remainingServices];
  },
}));

export default useBusPreferencesStore;
