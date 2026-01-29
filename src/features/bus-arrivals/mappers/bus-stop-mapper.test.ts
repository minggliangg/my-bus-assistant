import { describe, expect, test } from "vitest";
import type { BusStopDTO } from "../dtos/bus-arrival-dto";
import { EMPTY_BUS_DTO } from "../dtos/bus-arrival-dto";
import type { BusArrival, BusService } from "../models/bus-arrivals-model";
import { mapBusStopDtoToModel } from "./bus-stop-mapper";

describe("mapBusStopDtoToModel", () => {
  const createMockBusDTO = (overrides = {}) => ({
    OriginCode: "83139",
    DestinationCode: "96049",
    EstimatedArrival: new Date(Date.now() + 5 * 60000).toISOString(),
    Monitored: 1,
    Latitude: "1.316748",
    Longitude: "103.900000",
    VisitNumber: "1",
    Load: "SEA",
    Feature: "WAB",
    Type: "DD",
    ...overrides,
  });

  const createMockServiceDTO = (overrides = {}) => ({
    ServiceNo: "15",
    Operator: "SBST",
    NextBus: createMockBusDTO(),
    NextBus2: createMockBusDTO(),
    NextBus3: createMockBusDTO(),
    ...overrides,
  });

  test("maps all fields correctly", () => {
    const serviceDTO = createMockServiceDTO();
    const dto: BusStopDTO = {
      BusStopCode: "83139",
      Services: [serviceDTO],
    };

    const result = mapBusStopDtoToModel(dto);

    expect(result.busStopCode).toBe("83139");
    expect(result.services).toHaveLength(1);

    const service = result.services[0] as BusService;
    expect(service.serviceNo).toBe("15");
    expect(service.operator).toBe("SBST");

    const nextBus = service.nextBus as BusArrival;
    expect(nextBus.originCode).toBe("83139");
    expect(nextBus.destinationCode).toBe("96049");
    expect(nextBus.latitude).toBe(1.316748);
    expect(nextBus.longitude).toBe(103.9);
    expect(nextBus.visitNumber).toBe(1);
    expect(nextBus.load).toBe("SEA");
    expect(nextBus.feature).toBe("WAB");
    expect(nextBus.type).toBe("DD");
    expect(nextBus.estimatedArrival).toBeInstanceOf(Date);
  });

  test("handles service with only one upcoming bus", () => {
    const serviceDTO = createMockServiceDTO({
      ServiceNo: "15",
      NextBus: createMockBusDTO(),
      NextBus2: EMPTY_BUS_DTO,
      NextBus3: EMPTY_BUS_DTO,
    });
    const dto: BusStopDTO = {
      BusStopCode: "83139",
      Services: [serviceDTO],
    };

    const result = mapBusStopDtoToModel(dto);

    const service = result.services[0] as BusService;
    expect(service.serviceNo).toBe("15");
    expect(service.operator).toBe("SBST");
    expect(service.nextBus).not.toBeNull();
    expect(service.nextBus2).toBeNull();
    expect(service.nextBus3).toBeNull();
  });

  test("handles empty services array (no buses scenario)", () => {
    const dto: BusStopDTO = {
      BusStopCode: "98291",
      Services: [],
    };

    const result = mapBusStopDtoToModel(dto);

    expect(result.busStopCode).toBe("98291");
    expect(result.services).toHaveLength(0);
    expect(result.services).toEqual([]);
  });

  test("converts date strings to Date objects", () => {
    const testDate = "2025-01-15T10:30:00.000Z";
    const busDTO = createMockBusDTO({ EstimatedArrival: testDate });
    const serviceDTO = createMockServiceDTO({ NextBus: busDTO });
    const dto: BusStopDTO = {
      BusStopCode: "83139",
      Services: [serviceDTO],
    };

    const result = mapBusStopDtoToModel(dto);
    const service = result.services[0] as BusService;
    const nextBus = service.nextBus as BusArrival;

    expect(nextBus.estimatedArrival).toBeInstanceOf(Date);
    expect(nextBus.estimatedArrival.toISOString()).toBe(testDate);
  });

  test("handles bus with empty EstimatedArrival", () => {
    const busDTO = createMockBusDTO({ EstimatedArrival: "" });
    const serviceDTO = createMockServiceDTO({ NextBus: busDTO });
    const dto: BusStopDTO = {
      BusStopCode: "83139",
      Services: [serviceDTO],
    };

    const result = mapBusStopDtoToModel(dto);
    const service = result.services[0] as BusService;

    expect(service.nextBus).toBeNull();
  });

  test("handles service with two upcoming buses", () => {
    const serviceDTO = createMockServiceDTO({
      ServiceNo: "66",
      NextBus: createMockBusDTO(),
      NextBus2: createMockBusDTO({ EstimatedArrival: new Date(Date.now() + 10 * 60000).toISOString() }),
      NextBus3: EMPTY_BUS_DTO,
    });
    const dto: BusStopDTO = {
      BusStopCode: "83139",
      Services: [serviceDTO],
    };

    const result = mapBusStopDtoToModel(dto);
    const service = result.services[0] as BusService;

    expect(service.serviceNo).toBe("66");
    expect(service.nextBus).not.toBeNull();
    expect(service.nextBus2).not.toBeNull();
    expect(service.nextBus3).toBeNull();
  });

  test("handles multiple services", () => {
    const dto: BusStopDTO = {
      BusStopCode: "83139",
      Services: [
        createMockServiceDTO({ ServiceNo: "15", Operator: "SBST" }),
        createMockServiceDTO({ ServiceNo: "66", Operator: "SMRT" }),
        createMockServiceDTO({ ServiceNo: "170", Operator: "SMRT" }),
      ],
    };

    const result = mapBusStopDtoToModel(dto);

    expect(result.services).toHaveLength(3);
    expect(result.services[0].serviceNo).toBe("15");
    expect(result.services[0].operator).toBe("SBST");
    expect(result.services[1].serviceNo).toBe("66");
    expect(result.services[1].operator).toBe("SMRT");
    expect(result.services[2].serviceNo).toBe("170");
    expect(result.services[2].operator).toBe("SMRT");
  });

  test("handles missing Load, Feature, Type with defaults", () => {
    const busDTO = createMockBusDTO({
      Load: undefined,
      Feature: undefined,
      Type: undefined,
    });
    const serviceDTO = createMockServiceDTO({ NextBus: busDTO });
    const dto: BusStopDTO = {
      BusStopCode: "83139",
      Services: [serviceDTO],
    };

    const result = mapBusStopDtoToModel(dto);
    const service = result.services[0] as BusService;
    const nextBus = service.nextBus as BusArrival;

    expect(nextBus.load).toBe("SEA");
    expect(nextBus.feature).toBe("");
    expect(nextBus.type).toBe("SD");
  });

  test("parses Latitude and Longitude correctly", () => {
    const busDTO = createMockBusDTO({
      Latitude: "1.316748",
      Longitude: "103.900000",
    });
    const serviceDTO = createMockServiceDTO({ NextBus: busDTO });
    const dto: BusStopDTO = {
      BusStopCode: "83139",
      Services: [serviceDTO],
    };

    const result = mapBusStopDtoToModel(dto);
    const service = result.services[0] as BusService;
    const nextBus = service.nextBus as BusArrival;

    expect(nextBus.latitude).toBe(1.316748);
    expect(nextBus.longitude).toBe(103.9);
  });

  test("handles invalid Latitude and Longitude with fallback to 0", () => {
    const busDTO = createMockBusDTO({
      Latitude: "invalid",
      Longitude: "invalid",
    });
    const serviceDTO = createMockServiceDTO({ NextBus: busDTO });
    const dto: BusStopDTO = {
      BusStopCode: "83139",
      Services: [serviceDTO],
    };

    const result = mapBusStopDtoToModel(dto);
    const service = result.services[0] as BusService;
    const nextBus = service.nextBus as BusArrival;

    expect(nextBus.latitude).toBe(0);
    expect(nextBus.longitude).toBe(0);
  });

  test("parses VisitNumber correctly", () => {
    const busDTO = createMockBusDTO({ VisitNumber: "5" });
    const serviceDTO = createMockServiceDTO({ NextBus: busDTO });
    const dto: BusStopDTO = {
      BusStopCode: "83139",
      Services: [serviceDTO],
    };

    const result = mapBusStopDtoToModel(dto);
    const service = result.services[0] as BusService;
    const nextBus = service.nextBus as BusArrival;

    expect(nextBus.visitNumber).toBe(5);
  });

  test("handles invalid VisitNumber with fallback to 0", () => {
    const busDTO = createMockBusDTO({ VisitNumber: "invalid" });
    const serviceDTO = createMockServiceDTO({ NextBus: busDTO });
    const dto: BusStopDTO = {
      BusStopCode: "83139",
      Services: [serviceDTO],
    };

    const result = mapBusStopDtoToModel(dto);
    const service = result.services[0] as BusService;
    const nextBus = service.nextBus as BusArrival;

    expect(nextBus.visitNumber).toBe(0);
  });

  test("handles API response with empty Services array (no more buses)", () => {
    // This simulates the real API response when there are no buses
    const dto: BusStopDTO = {
      "odata.metadata":
        "https://datamall2.mytransport.sg/ltaodataservice/v3/BusArrival",
      BusStopCode: "98291",
      Services: [],
    };

    const result = mapBusStopDtoToModel(dto);

    expect(result.busStopCode).toBe("98291");
    expect(result.services).toHaveLength(0);
    expect(Array.isArray(result.services)).toBe(true);
  });

  test("handles multiple services with varying bus counts", () => {
    const dto: BusStopDTO = {
      BusStopCode: "83139",
      Services: [
        // Service with only 1 bus
        createMockServiceDTO({
          ServiceNo: "15",
          NextBus: createMockBusDTO({ EstimatedArrival: new Date(Date.now() + 2 * 60000).toISOString() }),
          NextBus2: EMPTY_BUS_DTO,
          NextBus3: EMPTY_BUS_DTO,
        }),
        // Service with 2 buses
        createMockServiceDTO({
          ServiceNo: "66",
          NextBus: createMockBusDTO({ EstimatedArrival: new Date(Date.now() + 1 * 60000).toISOString() }),
          NextBus2: createMockBusDTO({ EstimatedArrival: new Date(Date.now() + 8 * 60000).toISOString() }),
          NextBus3: EMPTY_BUS_DTO,
        }),
        // Service with all 3 buses
        createMockServiceDTO({
          ServiceNo: "170",
          NextBus: createMockBusDTO({ EstimatedArrival: new Date(Date.now() + 3 * 60000).toISOString() }),
          NextBus2: createMockBusDTO({ EstimatedArrival: new Date(Date.now() + 15 * 60000).toISOString() }),
          NextBus3: createMockBusDTO({ EstimatedArrival: new Date(Date.now() + 25 * 60000).toISOString() }),
        }),
      ],
    };

    const result = mapBusStopDtoToModel(dto);

    expect(result.services).toHaveLength(3);

    // Service 15: only 1 bus
    const service1 = result.services[0];
    expect(service1.serviceNo).toBe("15");
    expect(service1.nextBus).not.toBeNull();
    expect(service1.nextBus2).toBeNull();
    expect(service1.nextBus3).toBeNull();

    // Service 66: 2 buses
    const service2 = result.services[1];
    expect(service2.serviceNo).toBe("66");
    expect(service2.nextBus).not.toBeNull();
    expect(service2.nextBus2).not.toBeNull();
    expect(service2.nextBus3).toBeNull();

    // Service 170: all 3 buses
    const service3 = result.services[2];
    expect(service3.serviceNo).toBe("170");
    expect(service3.nextBus).not.toBeNull();
    expect(service3.nextBus2).not.toBeNull();
    expect(service3.nextBus3).not.toBeNull();
  });
});
