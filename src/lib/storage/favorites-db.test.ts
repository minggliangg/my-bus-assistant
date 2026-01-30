import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  addFavorite,
  removeFavorite,
  getAllFavorites,
  isFavorited,
  clearAllFavorites,
} from "./favorites-db";
import "fake-indexeddb/auto";

describe("favorites-db", () => {
  beforeEach(async () => {
    await clearAllFavorites();
  });

  afterEach(async () => {
    await clearAllFavorites();
  });

  describe("addFavorite", () => {
    it("should add a favorite", async () => {
      await addFavorite("01012");

      const favorites = await getAllFavorites();
      expect(favorites).toEqual(["01012"]);
    });

    it("should handle duplicate adds (idempotent)", async () => {
      await addFavorite("01012");
      await addFavorite("01012");

      const favorites = await getAllFavorites();
      expect(favorites).toEqual(["01012"]);
    });
  });

  describe("removeFavorite", () => {
    it("should remove a favorite", async () => {
      await addFavorite("01012");
      await addFavorite("01013");

      await removeFavorite("01012");

      const favorites = await getAllFavorites();
      expect(favorites).toEqual(["01013"]);
    });

    it("should handle removing non-existent favorite (no error)", async () => {
      await removeFavorite("99999");

      const favorites = await getAllFavorites();
      expect(favorites).toEqual([]);
    });
  });

  describe("getAllFavorites", () => {
    it("should return all favorites ordered by timestamp DESC", async () => {
      await addFavorite("01012");
      await new Promise((resolve) => setTimeout(resolve, 10));
      await addFavorite("01013");

      const favorites = await getAllFavorites();
      expect(favorites).toEqual(["01013", "01012"]);
    });

    it("should return empty array when no favorites", async () => {
      const favorites = await getAllFavorites();
      expect(favorites).toEqual([]);
    });
  });

  describe("isFavorited", () => {
    it("should return true when bus stop is favorited", async () => {
      await addFavorite("01012");

      const favorited = await isFavorited("01012");
      expect(favorited).toBe(true);
    });

    it("should return false when bus stop is not favorited", async () => {
      const favorited = await isFavorited("01012");
      expect(favorited).toBe(false);
    });
  });

  describe("clearAllFavorites", () => {
    it("should clear all favorites", async () => {
      await addFavorite("01012");
      await addFavorite("01013");

      await clearAllFavorites();

      const favorites = await getAllFavorites();
      expect(favorites).toEqual([]);
    });
  });
});
