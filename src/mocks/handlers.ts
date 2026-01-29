import { http, HttpResponse } from "msw";
import type { BusStopDTO } from "../features/bus-arrivals/dtos/bus-arrival-dto";
import { EMPTY_BUS_DTO } from "../features/bus-arrivals/dtos/bus-arrival-dto";

// Mock API response for bus arrivals
export const mockBusArrivalResponse: BusStopDTO = {
  BusStopCode: "83139",
  Services: [
    {
      ServiceNo: "15",
      Operator: "SBST",
      NextBus: {
        OriginCode: "83139",
        DestinationCode: "96049",
        EstimatedArrival: new Date(Date.now() + 2 * 60000).toISOString(),
        Monitored: 1,
        Latitude: "1.316748",
        Longitude: "103.900000",
        VisitNumber: "1",
        Load: "SEA",
        Feature: "WAB",
        Type: "DD",
      },
      NextBus2: {
        OriginCode: "83139",
        DestinationCode: "96049",
        EstimatedArrival: new Date(Date.now() + 10 * 60000).toISOString(),
        Monitored: 1,
        Latitude: "1.316748",
        Longitude: "103.900000",
        VisitNumber: "2",
        Load: "SDA",
        Feature: "",
        Type: "DD",
      },
      NextBus3: {
        OriginCode: "83139",
        DestinationCode: "96049",
        EstimatedArrival: new Date(Date.now() + 20 * 60000).toISOString(),
        Monitored: 1,
        Latitude: "1.316748",
        Longitude: "103.900000",
        VisitNumber: "3",
        Load: "LSD",
        Feature: "",
        Type: "SD",
      },
    },
    {
      ServiceNo: "66",
      Operator: "SMRT",
      NextBus: {
        OriginCode: "83139",
        DestinationCode: "77009",
        EstimatedArrival: new Date(Date.now() + 1 * 60000).toISOString(),
        Monitored: 1,
        Latitude: "1.316748",
        Longitude: "103.900000",
        VisitNumber: "1",
        Load: "SEA",
        Feature: "",
        Type: "SD",
      },
      NextBus2: {
        OriginCode: "83139",
        DestinationCode: "77009",
        EstimatedArrival: new Date(Date.now() + 8 * 60000).toISOString(),
        Monitored: 1,
        Latitude: "1.316748",
        Longitude: "103.900000",
        VisitNumber: "2",
        Load: "SDA",
        Feature: "",
        Type: "BD",
      },
      NextBus3: EMPTY_BUS_DTO,
    },
  ],
};

// Create a mock response generator that sets the BusStopCode dynamically
function createMockResponse(
  busStopCode: string,
  services: BusStopDTO["Services"],
): BusStopDTO {
  return {
    BusStopCode: busStopCode,
    Services: services,
  };
}

// Mock API response for bus arrivals
function getMockBusArrivalResponse(busStopCode: string): BusStopDTO {
  return createMockResponse(busStopCode, [
    {
      ServiceNo: "15",
      Operator: "SBST",
      NextBus: {
        OriginCode: busStopCode,
        DestinationCode: "96049",
        EstimatedArrival: new Date(Date.now() + 2 * 60000).toISOString(),
        Monitored: 1,
        Latitude: "1.316748",
        Longitude: "103.900000",
        VisitNumber: "1",
        Load: "SEA",
        Feature: "WAB",
        Type: "DD",
      },
      NextBus2: {
        OriginCode: busStopCode,
        DestinationCode: "96049",
        EstimatedArrival: new Date(Date.now() + 10 * 60000).toISOString(),
        Monitored: 1,
        Latitude: "1.316748",
        Longitude: "103.900000",
        VisitNumber: "2",
        Load: "SDA",
        Feature: "",
        Type: "DD",
      },
      NextBus3: {
        OriginCode: busStopCode,
        DestinationCode: "96049",
        EstimatedArrival: new Date(Date.now() + 20 * 60000).toISOString(),
        Monitored: 1,
        Latitude: "1.316748",
        Longitude: "103.900000",
        VisitNumber: "3",
        Load: "LSD",
        Feature: "",
        Type: "SD",
      },
    },
    {
      ServiceNo: "66",
      Operator: "SMRT",
      NextBus: {
        OriginCode: busStopCode,
        DestinationCode: "77009",
        EstimatedArrival: new Date(Date.now() + 1 * 60000).toISOString(),
        Monitored: 1,
        Latitude: "1.316748",
        Longitude: "103.900000",
        VisitNumber: "1",
        Load: "SEA",
        Feature: "",
        Type: "SD",
      },
      NextBus2: {
        OriginCode: busStopCode,
        DestinationCode: "77009",
        EstimatedArrival: new Date(Date.now() + 8 * 60000).toISOString(),
        Monitored: 1,
        Latitude: "1.316748",
        Longitude: "103.900000",
        VisitNumber: "2",
        Load: "SDA",
        Feature: "",
        Type: "BD",
      },
      NextBus3: EMPTY_BUS_DTO,
    },
  ]);
}

// Mock API response for arriving now (≤1 min)
function getMockBusArrivingNowResponse(busStopCode: string): BusStopDTO {
  return createMockResponse(busStopCode, [
    {
      ServiceNo: "15",
      Operator: "SBST",
      NextBus: {
        OriginCode: busStopCode,
        DestinationCode: "96049",
        EstimatedArrival: new Date(Date.now() + 30000).toISOString(),
        Monitored: 1,
        Latitude: "1.316748",
        Longitude: "103.900000",
        VisitNumber: "1",
        Load: "SEA",
        Feature: "",
        Type: "DD",
      },
      NextBus2: EMPTY_BUS_DTO,
      NextBus3: EMPTY_BUS_DTO,
    },
  ]);
}

// Mock API response for empty services
function getMockEmptyServicesResponse(busStopCode: string): BusStopDTO {
  return createMockResponse(busStopCode, []);
}

// Mock API response for API error
export const mockErrorResponse = {
  error: "Invalid bus stop code",
};

export const handlers = [
  // Success response handler
  http.get("/api/ltaodataservice/v3/BusArrival", ({ request }) => {
    const url = new URL(request.url);
    const busStopCode = url.searchParams.get("BusStopCode");

    if (!busStopCode) {
      return HttpResponse.json(
        { error: "BusStopCode is required" },
        { status: 400 },
      );
    }

    // Return different responses based on bus stop code
    if (busStopCode === "83139") {
      return HttpResponse.json(getMockBusArrivalResponse(busStopCode));
    }
    if (busStopCode === "55281") {
      return HttpResponse.json(getMockBusArrivalResponse(busStopCode));
    }
    if (busStopCode === "83138") {
      return HttpResponse.json(getMockBusArrivingNowResponse(busStopCode));
    }
    if (busStopCode === "99999") {
      return HttpResponse.json(getMockEmptyServicesResponse(busStopCode));
    }
    if (busStopCode === "00000") {
      return HttpResponse.json(mockErrorResponse, { status: 400 });
    }
    if (busStopCode === "404") {
      return HttpResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (busStopCode === "500") {
      return HttpResponse.json({ error: "Server error" }, { status: 500 });
    }

    return HttpResponse.json(
      { error: "Unknown bus stop code" },
      { status: 404 },
    );
  }),

  // Network error handler
  http.get("/api/ltaodataservice/v3/BusArrival/network-error", () => {
    return HttpResponse.error();
  }),
];
