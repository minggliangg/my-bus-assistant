import { create } from "zustand";
import {
  addFavorite,
  removeFavorite,
  getAllFavorites,
  clearAllFavorites,
} from "@/lib/storage/favorites-db";

interface FavoritesStore {
  favorites: string[];
  loading: boolean;
  error: string | null;

  loadFavorites: () => Promise<void>;
  addFavorite: (busStopCode: string) => Promise<void>;
  removeFavorite: (busStopCode: string) => Promise<void>;
  isFavorited: (busStopCode: string) => boolean;
  toggleFavorite: (busStopCode: string) => Promise<void>;
  clearAll: () => Promise<void>;
}

const useFavoritesStore = create<FavoritesStore>((set, get) => ({
  favorites: [],
  loading: true,
  error: null,

  loadFavorites: async () => {
    set({ loading: true, error: null });
    try {
      const favorites = await getAllFavorites();
      set({ favorites, loading: false, error: null });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Unknown error",
        loading: false,
      });
    }
  },

  addFavorite: async (busStopCode: string) => {
    set({ error: null });
    try {
      await addFavorite(busStopCode);
      const favorites = await getAllFavorites();
      set({ favorites, error: null });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },

  removeFavorite: async (busStopCode: string) => {
    set({ error: null });
    try {
      await removeFavorite(busStopCode);
      const favorites = await getAllFavorites();
      set({ favorites, error: null });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },

  isFavorited: (busStopCode: string) => {
    const { favorites } = get();
    return favorites.includes(busStopCode);
  },

  toggleFavorite: async (busStopCode: string) => {
    const { isFavorited } = get();
    if (isFavorited(busStopCode)) {
      await get().removeFavorite(busStopCode);
    } else {
      await get().addFavorite(busStopCode);
    }
  },

  clearAll: async () => {
    set({ error: null });
    try {
      await clearAllFavorites();
      set({ favorites: [], error: null });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
}));

export default useFavoritesStore;
