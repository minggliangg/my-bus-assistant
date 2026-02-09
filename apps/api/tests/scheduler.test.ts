import { afterEach, describe, expect, it, mock } from "bun:test";

mock.module("../src/lib/db/repositories/metadata.repository", () => ({
  getMetadata: () => null,
  setMetadata: () => {},
}));

mock.module("../src/lib/db/repositories/bus-stops.repository", () => ({
  getBusStopsCount: () => 1,
}));

mock.module("../src/lib/db/repositories/bus-routes.repository", () => ({
  getBusRoutesCount: () => 1,
}));

mock.module("../src/lib/db/ingestion/bus-stops.ingestion", () => ({
  ingestBusStops: async () => {},
}));

mock.module("../src/lib/db/ingestion/bus-routes.ingestion", () => ({
  ingestBusRoutes: async () => {},
}));

import {
  isSchedulerRunning,
  startScheduler,
  stopScheduler,
} from "../src/lib/db/ingestion/scheduler";

afterEach(() => {
  stopScheduler();
});

describe("scheduler idempotency", () => {
  it("does not create duplicate intervals on repeated start", () => {
    startScheduler();
    expect(isSchedulerRunning()).toBe(true);

    startScheduler();
    expect(isSchedulerRunning()).toBe(true);
  });

  it("stop is safe to call repeatedly", () => {
    stopScheduler();
    stopScheduler();
    expect(isSchedulerRunning()).toBe(false);
  });
});
