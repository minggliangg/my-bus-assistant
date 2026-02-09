import type { BusStopsDTO } from "@my-bus-assistant/shared";
import { fetchFromLTA } from "../../lta-client";
import { replaceBusStops } from "../repositories/bus-stops.repository";
import type { BusStopDTO } from "@my-bus-assistant/shared";

const PAGE_SIZE = 500;
const DEFAULT_MAX_PAGES = Number.POSITIVE_INFINITY;

const getMaxPages = (): number => {
  const value = process.env.INGEST_MAX_PAGES_BUS_STOPS;
  if (!value) return DEFAULT_MAX_PAGES;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_MAX_PAGES;
  return parsed;
};

export class IngestionGuardrailError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IngestionGuardrailError";
  }
}

export const fetchAllBusStopsFromLTA = async (): Promise<BusStopDTO[]> => {
  const allBusStops: BusStopDTO[] = [];
  let offset = 0;
  let pageCount = 0;
  const maxPages = getMaxPages();
  let stopReason: "short_page" | "empty_page" | "guardrail_hit" = "empty_page";

  console.log("Fetching all bus stops from LTA DataMall...");

  while (true) {
    if (pageCount >= maxPages) {
      stopReason = "guardrail_hit";
      break;
    }

    const data = await fetchFromLTA<BusStopsDTO>(
      "/ltaodataservice/BusStops",
      { $skip: offset.toString() },
    );

    if (!data.value || data.value.length === 0) {
      stopReason = "empty_page";
      break;
    }

    allBusStops.push(...data.value);
    pageCount++;

    if (data.value.length < PAGE_SIZE) {
      stopReason = "short_page";
      break;
    }

    offset += PAGE_SIZE;
  }

  const summary = {
    endpoint: "/ltaodataservice/BusStops",
    pagesFetched: pageCount,
    recordsFetched: allBusStops.length,
    stopReason,
  };
  console.info(JSON.stringify({ event: "ingestion_summary", ...summary }));

  if (stopReason === "guardrail_hit") {
    throw new IngestionGuardrailError(
      `Guardrail reached for BusStops after ${pageCount} pages while page size remained ${PAGE_SIZE}.`,
    );
  }

  console.log(
    `Completed: fetched ${allBusStops.length} bus stops in ${pageCount} pages`,
  );
  return allBusStops;
};

export const ingestBusStops = async (): Promise<void> => {
  const stops = await fetchAllBusStopsFromLTA();
  replaceBusStops(stops);
  console.log(`Ingested ${stops.length} bus stops into database`);
};
