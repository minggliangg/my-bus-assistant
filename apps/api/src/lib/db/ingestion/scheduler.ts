import { getMetadata, setMetadata } from "../repositories/metadata.repository";
import { ingestBusStops } from "./bus-stops.ingestion";
import { ingestBusRoutes } from "./bus-routes.ingestion";
import { getBusStopsCount } from "../repositories/bus-stops.repository";
import { getBusRoutesCount } from "../repositories/bus-routes.repository";

const REFRESH_INTERVAL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000; // daily check

let ingestionInProgress = false;
let checkInterval: ReturnType<typeof setInterval> | null = null;

const isStale = (key: string): boolean => {
  const meta = getMetadata(key);
  if (!meta) return true;
  return Date.now() - meta.updated_at > REFRESH_INTERVAL_MS;
};

const markRunning = (resource: "bus_stops" | "bus_routes"): void => {
  setMetadata(`${resource}_ingestion_status`, "running");
};

const markSuccess = (resource: "bus_stops" | "bus_routes"): void => {
  setMetadata(`${resource}_ingestion_status`, "idle");
  setMetadata(`${resource}_last_success_at`, new Date().toISOString());
  setMetadata(`${resource}_last_error`, "");
};

const markFailure = (
  resource: "bus_stops" | "bus_routes",
  error: unknown,
): void => {
  const message = error instanceof Error ? error.message : String(error);
  setMetadata(`${resource}_ingestion_status`, "failed");
  setMetadata(`${resource}_last_failure_at`, new Date().toISOString());
  setMetadata(`${resource}_last_error`, message);
};

const runIngestionIfNeeded = async (): Promise<void> => {
  if (ingestionInProgress) {
    console.log("Ingestion already in progress, skipping...");
    return;
  }

  ingestionInProgress = true;
  try {
    if (isStale("bus_stops_last_updated") || getBusStopsCount() === 0) {
      markRunning("bus_stops");
      try {
        await ingestBusStops();
        markSuccess("bus_stops");
      } catch (error) {
        markFailure("bus_stops", error);
      }
    }

    if (isStale("bus_routes_last_updated") || getBusRoutesCount() === 0) {
      markRunning("bus_routes");
      try {
        await ingestBusRoutes();
        markSuccess("bus_routes");
      } catch (error) {
        markFailure("bus_routes", error);
      }
    }
  } catch (error) {
    console.error("Ingestion error:", error);
  } finally {
    ingestionInProgress = false;
  }
};

export const startScheduler = (): void => {
  if (checkInterval) {
    return;
  }

  // Run on startup
  void runIngestionIfNeeded();

  // Check daily
  checkInterval = setInterval(runIngestionIfNeeded, CHECK_INTERVAL_MS);
};

export const stopScheduler = (): void => {
  if (checkInterval) {
    clearInterval(checkInterval);
    checkInterval = null;
  }
};

export const isIngesting = (): boolean => ingestionInProgress;
export const isSchedulerRunning = (): boolean => checkInterval !== null;
