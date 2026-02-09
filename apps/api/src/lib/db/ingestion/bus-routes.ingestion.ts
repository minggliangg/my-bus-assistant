import type { BusRoutesDTO, BusRouteDTO } from "@my-bus-assistant/shared";
import { fetchFromLTA } from "../../lta-client";
import { replaceBusRoutes } from "../repositories/bus-routes.repository";

const PAGE_SIZE = 500;
const DEFAULT_MAX_PAGES = Number.POSITIVE_INFINITY;

const getMaxPages = (): number => {
  const value = process.env.INGEST_MAX_PAGES_BUS_ROUTES;
  if (!value) return DEFAULT_MAX_PAGES;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_MAX_PAGES;
  return parsed;
};

export const fetchAllBusRoutesFromLTA = async (): Promise<BusRouteDTO[]> => {
  const allRoutes: BusRouteDTO[] = [];
  let offset = 0;
  let pageCount = 0;
  const maxPages = getMaxPages();
  let stopReason: "short_page" | "empty_page" | "guardrail_hit" = "empty_page";

  console.log("Fetching all bus routes from LTA DataMall...");

  while (true) {
    if (pageCount >= maxPages) {
      stopReason = "guardrail_hit";
      break;
    }

    const data = await fetchFromLTA<BusRoutesDTO>(
      "/ltaodataservice/BusRoutes",
      { $skip: offset.toString() },
    );

    if (!data.value || data.value.length === 0) {
      stopReason = "empty_page";
      break;
    }

    allRoutes.push(...data.value);
    pageCount++;

    if (data.value.length < PAGE_SIZE) {
      stopReason = "short_page";
      break;
    }

    offset += PAGE_SIZE;
  }

  const summary = {
    endpoint: "/ltaodataservice/BusRoutes",
    pagesFetched: pageCount,
    recordsFetched: allRoutes.length,
    stopReason,
  };
  console.info(JSON.stringify({ event: "ingestion_summary", ...summary }));

  if (stopReason === "guardrail_hit") {
    throw new Error(
      `Guardrail reached for BusRoutes after ${pageCount} pages while page size remained ${PAGE_SIZE}.`,
    );
  }

  console.log(
    `Completed: fetched ${allRoutes.length} bus routes in ${pageCount} pages`,
  );
  return allRoutes;
};

export const ingestBusRoutes = async (): Promise<void> => {
  const routes = await fetchAllBusRoutesFromLTA();
  replaceBusRoutes(routes);
  console.log(`Ingested ${routes.length} bus routes into database`);
};
