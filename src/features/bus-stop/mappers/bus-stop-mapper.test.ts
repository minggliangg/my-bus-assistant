import { describe, expect, test } from "vitest";
import type { BusStopDTO } from "../dtos/bus-arrival";
import type { BusArrival, BusService } from "../models/bus-stop-models";
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

  test("handles missing optional fields", () => {
    const serviceDTO = createMockServiceDTO({
      NextBus: undefined,
      NextBus2: undefined,
      NextBus3: undefined,
    });
    const dto: BusStopDTO = {
      BusStopCode: "83139",
      Services: [serviceDTO],
    };

    const result = mapBusStopDtoToModel(dto);

    const service = result.services[0] as BusService;
    expect(service.serviceNo).toBe("15");
    expect(service.operator).toBe("SBST");
    expect(service.nextBus).toBeNull();
    expect(service.nextBus2).toBeNull();
    expect(service.nextBus3).toBeNull();
  });

  test("handles empty services array", () => {
    const dto: BusStopDTO = {
      BusStopCode: "83139",
      Services: [],
    };

    const result = mapBusStopDtoToModel(dto);

    expect(result.busStopCode).toBe("83139");
    expect(result.services).toHaveLength(0);
  });

  test("handles undefined Services array", () => {
    const dto: BusStopDTO = {
      BusStopCode: "83139",
      Services: undefined,
    };

    const result = mapBusStopDtoToModel(dto);

    expect(result.busStopCode).toBe("83139");
    expect(result.services).toHaveLength(0);
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

  test("handles bus with null EstimatedArrival", () => {
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

  test("handles bus with undefined EstimatedArrival", () => {
    const busDTO = { ...createMockBusDTO(), EstimatedArrival: undefined };
    const serviceDTO = createMockServiceDTO({ NextBus: busDTO });
    const dto: BusStopDTO = {
      BusStopCode: "83139",
      Services: [serviceDTO],
    };

    const result = mapBusStopDtoToModel(dto);
    const service = result.services[0] as BusService;

    expect(service.nextBus).toBeNull();
  });

  test("handles null bus DTO", () => {
    const serviceDTO = createMockServiceDTO({ NextBus: null });
    const dto: BusStopDTO = {
      BusStopCode: "83139",
      Services: [serviceDTO],
    };

    const result = mapBusStopDtoToModel(dto);
    const service = result.services[0] as BusService;

    expect(service.nextBus).toBeNull();
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
});
