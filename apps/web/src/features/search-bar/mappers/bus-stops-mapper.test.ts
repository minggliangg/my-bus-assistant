import { describe, it, expect } from "vitest";
import { mapBusStopsDtoToModel } from "./bus-stops-mapper";
import type { BusStopsDTO } from "../dtos/bus-stops-dto";

describe("mapBusStopsDtoToModel", () => {
  it("should map DTO to model correctly", () => {
    const dto: BusStopsDTO = {
      "odata.metadata": "",
      value: [
        {
          BusStopCode: "01012",
          RoadName: "Victoria St",
          Description: "Hotel Grand Pacific",
          Latitude: 1.296848,
          Longitude: 103.852535,
        },
      ],
    };

    const result = mapBusStopsDtoToModel(dto);

    expect(result).toHaveLength(1);
    expect(result[0].busStopCode).toBe("01012");
    expect(result[0].roadName).toBe("Victoria St");
    expect(result[0].description).toBe("Hotel Grand Pacific");
    expect(result[0].latitude).toBe(1.296848);
    expect(result[0].longitude).toBe(103.852535);
  });

  it("should handle multiple bus stops", () => {
    const dto: BusStopsDTO = {
      value: [
        {
          BusStopCode: "01012",
          RoadName: "Victoria St",
          Description: "Hotel Grand Pacific",
          Latitude: 1.296848,
          Longitude: 103.852535,
        },
        {
          BusStopCode: "01013",
          RoadName: "Victoria St",
          Description: "St Joseph's Church",
          Latitude: 1.297928,
          Longitude: 103.853321,
        },
      ],
    };

    const result = mapBusStopsDtoToModel(dto);

    expect(result).toHaveLength(2);
    expect(result[0].busStopCode).toBe("01012");
    expect(result[1].busStopCode).toBe("01013");
  });

  it("should handle null/undefined values", () => {
    const dto: BusStopsDTO = {
      value: [
        {
          BusStopCode: "01012",
          RoadName: undefined as unknown as string,
          Description: undefined as unknown as string,
          Latitude: undefined as unknown as number,
          Longitude: undefined as unknown as number,
        },
      ],
    };

    const result = mapBusStopsDtoToModel(dto);

    expect(result).toHaveLength(1);
    expect(result[0].roadName).toBe("");
    expect(result[0].description).toBe("");
    expect(result[0].latitude).toBe(0);
    expect(result[0].longitude).toBe(0);
  });

  it("should filter out items without BusStopCode", () => {
    const dto: BusStopsDTO = {
      value: [
        {
          BusStopCode: "01012",
          RoadName: "Victoria St",
          Description: "Hotel Grand Pacific",
          Latitude: 1.296848,
          Longitude: 103.852535,
        },
        undefined as unknown as BusStopsDTO["value"][0],
        {
          BusStopCode: null as unknown as string,
          RoadName: "Invalid",
          Description: "Invalid",
          Latitude: 0,
          Longitude: 0,
        },
      ],
    };

    const result = mapBusStopsDtoToModel(dto);

    expect(result).toHaveLength(1);
    expect(result[0].busStopCode).toBe("01012");
  });

  it("should handle empty DTO", () => {
    const dto: BusStopsDTO = {
      value: [],
    };

    const result = mapBusStopsDtoToModel(dto);

    expect(result).toHaveLength(0);
  });

  it("should handle null DTO", () => {
    const result = mapBusStopsDtoToModel(null as unknown as BusStopsDTO);

    expect(result).toHaveLength(0);
  });

  it("should handle undefined value", () => {
    const result = mapBusStopsDtoToModel({} as unknown as BusStopsDTO);

    expect(result).toHaveLength(0);
  });

  it("should handle non-array value", () => {
    const result = mapBusStopsDtoToModel({
      value: null as unknown as BusStopsDTO["value"],
    });

    expect(result).toHaveLength(0);
  });

  it("should convert field names to camelCase", () => {
    const dto: BusStopsDTO = {
      value: [
        {
          BusStopCode: "01012",
          RoadName: "Victoria St",
          Description: "Hotel Grand Pacific",
          Latitude: 1.296848,
          Longitude: 103.852535,
        },
      ],
    };

    const result = mapBusStopsDtoToModel(dto);

    expect(result[0].busStopCode).toBe("01012");
    expect("BusStopCode" in result[0]).toBe(false);
    expect("RoadName" in result[0]).toBe(false);
    expect("Description" in result[0]).toBe(false);
  });
});
