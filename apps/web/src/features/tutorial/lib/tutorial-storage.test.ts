import { describe, expect, it, vi } from "vitest";
import {
  clearTutorialCompleted,
  loadTutorialCompleted,
  markTutorialCompleted,
  TUTORIAL_COMPLETED_KEY,
} from "./tutorial-storage";

describe("tutorial-storage", () => {
  it("returns false when missing", () => {
    expect(loadTutorialCompleted()).toBe(false);
  });

  it("writes and reads completion state", () => {
    markTutorialCompleted();
    expect(loadTutorialCompleted()).toBe(true);
  });

  it("clears completion state", () => {
    markTutorialCompleted();
    clearTutorialCompleted();
    expect(loadTutorialCompleted()).toBe(false);
  });

  it("handles malformed storage values safely", () => {
    localStorage.setItem(TUTORIAL_COMPLETED_KEY, "not-a-number");
    expect(loadTutorialCompleted()).toBe(false);
  });

  it("returns false when storage throws", () => {
    const getItemSpy = vi
      .spyOn(localStorage, "getItem")
      .mockImplementation(() => {
        throw new Error("blocked");
      });

    expect(loadTutorialCompleted()).toBe(false);
    getItemSpy.mockRestore();
  });
});
