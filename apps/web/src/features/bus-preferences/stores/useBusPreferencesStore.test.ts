import { beforeEach, describe, expect, it, vi } from "vitest";
import useBusPreferencesStore from "./useBusPreferencesStore";
import * as busStopsDb from "@/lib/storage/bus-stops-db";

describe("useBusPreferencesStore", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    useBusPreferencesStore.setState({
      stopPreferences: {},
      globalPriorities: { prioritizedServices: [], updatedAt: 0 },
      loading: true,
      error: null,
    });
  });

  it("saves stop preferences with service order and hidden services", async () => {
    const saveSpy = vi.spyOn(busStopsDb, "saveBusStopPreferences").mockResolvedValue();

    await useBusPreferencesStore
      .getState()
      .saveStopPreferences("01012", ["10", "14", "2"], ["14"]);

    expect(saveSpy).toHaveBeenCalledWith({
      busStopCode: "01012",
      serviceOrder: ["10", "14", "2"],
      hiddenServices: ["14"],
      updatedAt: expect.any(Number),
    });

    const prefs = useBusPreferencesStore.getState().stopPreferences["01012"];
    expect(prefs).toMatchObject({
      busStopCode: "01012",
      serviceOrder: ["10", "14", "2"],
      hiddenServices: ["14"],
    });
    expect(typeof prefs.updatedAt).toBe("number");
  });

  it("overwrites existing preferences for a stop", async () => {
    vi.spyOn(busStopsDb, "saveBusStopPreferences").mockResolvedValue();

    useBusPreferencesStore.setState({
      stopPreferences: {
        "01012": {
          busStopCode: "01012",
          serviceOrder: ["14", "10"],
          hiddenServices: ["14"],
          updatedAt: 1000,
        },
      },
    });

    await useBusPreferencesStore
      .getState()
      .saveStopPreferences("01012", ["10", "14", "2"], []);

    const prefs = useBusPreferencesStore.getState().stopPreferences["01012"];
    expect(prefs.serviceOrder).toEqual(["10", "14", "2"]);
    expect(prefs.hiddenServices).toEqual([]);
  });

  it("sets error when saving stop preferences fails", async () => {
    vi.spyOn(busStopsDb, "saveBusStopPreferences").mockRejectedValue(new Error("DB fail"));

    await useBusPreferencesStore
      .getState()
      .saveStopPreferences("01012", ["10", "14", "2"], ["14"]);

    expect(useBusPreferencesStore.getState().error).toBe("DB fail");
  });
});
