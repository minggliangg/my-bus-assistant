import { create } from "zustand";
import type { BusStopSearchModel } from "@/features/search-bar/models/bus-stops-model";
import type { NearbyBusStop } from "../models/nearby-stops-model";
import { calculateDistance } from "../utils/geolocation";

const CACHE_DURATION_MS = 5 * 60 * 1000;

interface NearbyStore {
  location: { latitude: number; longitude: number; timestamp: number } | null;
  loadingLocation: boolean;
  locationError: string | null;
  nearestStops: NearbyBusStop[];
  dialogOpen: boolean;
  requestLocation: () => Promise<void>;
  findNearestStops: (busStops: BusStopSearchModel[], count?: number) => void;
  setDialogOpen: (open: boolean) => void;
  retry: () => Promise<void>;
  clearLocation: () => void;
}

const useNearbyStore = create<NearbyStore>((set, get) => ({
  location: null,
  loadingLocation: false,
  locationError: null,
  nearestStops: [],
  dialogOpen: false,

  requestLocation: async () => {
    const state = get();
    const now = Date.now();

    if (state.location && now - state.location.timestamp < CACHE_DURATION_MS) {
      return;
    }

    set({ loadingLocation: true, locationError: null });

    try {
      const position = await new Promise<GeolocationPosition>(
        (resolve, reject) => {
          if (!navigator.geolocation) {
            reject(new Error("Geolocation not supported"));
            return;
          }

          navigator.geolocation.getCurrentPosition(
            resolve,
            reject,
            {
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: CACHE_DURATION_MS,
            },
          );
        },
      );

      set({
        location: {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          timestamp: now,
        },
        loadingLocation: false,
        locationError: null,
      });
    } catch (error) {
      let errorMessage = "Unable to get your location";
      if (error instanceof Error) {
        if (error.name === "PermissionDeniedError") {
          errorMessage = "Location permission denied";
        } else if (error.name === "TimeoutError") {
          errorMessage = "Location request timed out";
        }
      }
      set({
        loadingLocation: false,
        locationError: errorMessage,
      });
      throw error;
    }
  },

  findNearestStops: (busStops: BusStopSearchModel[], count: number = 5) => {
    const state = get();
    if (!state.location) return;

    const stopsWithDistance: NearbyBusStop[] = busStops
      .map((stop) => ({
        ...stop,
        distance: calculateDistance(
          state.location!.latitude,
          state.location!.longitude,
          stop.latitude,
          stop.longitude,
        ),
      }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, count);

    set({ nearestStops: stopsWithDistance });
  },

  setDialogOpen: (open: boolean) => {
    set({ dialogOpen: open });
  },

  retry: async () => {
    set({ locationError: null });
    await get().requestLocation();
  },

  clearLocation: () => {
    set({
      location: null,
      nearestStops: [],
      locationError: null,
    });
  },
}));

export default useNearbyStore;
