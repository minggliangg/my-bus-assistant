import type { BusRouteDTO } from "@my-bus-assistant/shared";
import type { BusStopSearchModel } from "@/features/search-bar/models/bus-stops-model";
import type {
  BusServiceRoute,
  BusRouteStop,
  BusRouteDirection,
} from "../models/bus-route-model";

export const mapBusRouteDtosToModel = (
  dtos: BusRouteDTO[],
): BusServiceRoute => {
  if (dtos.length === 0) {
    return { serviceNo: "", operator: "", directions: [] };
  }

  const first = dtos[0];
  const grouped = new Map<number, BusRouteDTO[]>();

  for (const dto of dtos) {
    const existing = grouped.get(dto.Direction);
    if (existing) {
      existing.push(dto);
    } else {
      grouped.set(dto.Direction, [dto]);
    }
  }

  const directions: BusRouteDirection[] = [];
  for (const [direction, items] of grouped) {
    const stops: BusRouteStop[] = items
      .sort((a, b) => a.StopSequence - b.StopSequence)
      .map((dto) => ({
        stopSequence: dto.StopSequence,
        busStopCode: dto.BusStopCode,
        distance: dto.Distance,
        wdFirstBus: dto.WD_FirstBus,
        wdLastBus: dto.WD_LastBus,
        satFirstBus: dto.SAT_FirstBus,
        satLastBus: dto.SAT_LastBus,
        sunFirstBus: dto.SUN_FirstBus,
        sunLastBus: dto.SUN_LastBus,
      }));

    directions.push({ direction, stops });
  }

  directions.sort((a, b) => a.direction - b.direction);

  return {
    serviceNo: first.ServiceNo,
    operator: first.Operator,
    directions,
  };
};

export const enrichRouteWithStopNames = (
  route: BusServiceRoute,
  busStops: BusStopSearchModel[],
): BusServiceRoute => {
  const stopMap = new Map(
    busStops.map((s) => [s.busStopCode, s]),
  );

  return {
    ...route,
    directions: route.directions.map((dir) => ({
      ...dir,
      stops: dir.stops.map((stop) => {
        const info = stopMap.get(stop.busStopCode);
        return {
          ...stop,
          busStopName: info?.description,
          roadName: info?.roadName,
        };
      }),
    })),
  };
};
