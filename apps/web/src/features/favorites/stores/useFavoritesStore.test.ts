import { describe, it, expect, beforeEach, vi } from "vitest";
import useFavoritesStore from "./useFavoritesStore";
import * as busStopsDb from "@/lib/storage/bus-stops-db";
import "fake-indexeddb/auto";

describe("useFavoritesStore", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("should have initial state", () => {
    const store = useFavoritesStore.getState();
    expect(store.favorites).toEqual([]);
    expect(store.loading).toBe(true);
    expect(store.error).toBeNull();
  });

  it("should load favorites from DB", async () => {
    const mockFavorites = ["01012", "01013"];
    vi.spyOn(busStopsDb, "getAllFavorites").mockResolvedValue(mockFavorites);

    await useFavoritesStore.getState().loadFavorites();

    const state = useFavoritesStore.getState();
    expect(state.favorites).toEqual(mockFavorites);
    expect(state.loading).toBe(false);
    expect(state.error).toBeNull();
  });

  it("should add favorite", async () => {
    vi.spyOn(busStopsDb, "addFavorite").mockResolvedValue();
    vi.spyOn(busStopsDb, "getAllFavorites").mockResolvedValue(["01012"]);

    await useFavoritesStore.getState().addFavorite("01012");

    const state = useFavoritesStore.getState();
    expect(state.favorites).toEqual(["01012"]);
    expect(busStopsDb.addFavorite).toHaveBeenCalledWith("01012");
  });

  it("should remove favorite", async () => {
    vi.spyOn(busStopsDb, "removeFavorite").mockResolvedValue();
    vi.spyOn(busStopsDb, "getAllFavorites").mockResolvedValue([]);

    await useFavoritesStore.getState().removeFavorite("01012");

    const state = useFavoritesStore.getState();
    expect(state.favorites).toEqual([]);
    expect(busStopsDb.removeFavorite).toHaveBeenCalledWith("01012");
  });

  it("should check isFavorited", () => {
    useFavoritesStore.setState({ favorites: ["01012", "01013"] });

    const isFavorited1 = useFavoritesStore.getState().isFavorited("01012");
    const isFavorited2 = useFavoritesStore.getState().isFavorited("99999");

    expect(isFavorited1).toBe(true);
    expect(isFavorited2).toBe(false);
  });

  it("should toggle favorite (add when not favorited)", async () => {
    useFavoritesStore.setState({ favorites: [] });

    vi.spyOn(busStopsDb, "addFavorite").mockResolvedValue();
    vi.spyOn(busStopsDb, "getAllFavorites").mockResolvedValue(["01012"]);

    await useFavoritesStore.getState().toggleFavorite("01012");

    const state = useFavoritesStore.getState();
    expect(state.favorites).toEqual(["01012"]);
    expect(busStopsDb.addFavorite).toHaveBeenCalledWith("01012");
  });

  it("should toggle favorite (remove when favorited)", async () => {
    useFavoritesStore.setState({ favorites: ["01012"] });

    vi.spyOn(busStopsDb, "removeFavorite").mockResolvedValue();
    vi.spyOn(busStopsDb, "getAllFavorites").mockResolvedValue([]);

    await useFavoritesStore.getState().toggleFavorite("01012");

    const state = useFavoritesStore.getState();
    expect(state.favorites).toEqual([]);
    expect(busStopsDb.removeFavorite).toHaveBeenCalledWith("01012");
  });

  it("should handle errors", async () => {
    const error = new Error("Database error");
    vi.spyOn(busStopsDb, "getAllFavorites").mockRejectedValue(error);

    await useFavoritesStore.getState().loadFavorites();

    const state = useFavoritesStore.getState();
    expect(state.error).toBe("Database error");
    expect(state.loading).toBe(false);
  });

  it("should clear all favorites", async () => {
    useFavoritesStore.setState({ favorites: ["01012", "01013"] });

    vi.spyOn(busStopsDb, "clearAllFavorites").mockResolvedValue();

    await useFavoritesStore.getState().clearAll();

    const state = useFavoritesStore.getState();
    expect(state.favorites).toEqual([]);
    expect(busStopsDb.clearAllFavorites).toHaveBeenCalled();
  });
});
