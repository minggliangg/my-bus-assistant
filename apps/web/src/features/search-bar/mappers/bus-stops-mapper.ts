import type { BusStopsDTO } from "../dtos/bus-stops-dto";
import type { BusStopSearchModel } from "../models/bus-stops-model";

export const mapBusStopsDtoToModel = (dto: BusStopsDTO): BusStopSearchModel[] => {
  if (!dto?.value || !Array.isArray(dto.value)) {
    return [];
  }

  return dto.value
    .filter((item) => item?.BusStopCode)
    .map((item) => ({
      busStopCode: item.BusStopCode,
      roadName: item.RoadName || "",
      description: item.Description || "",
      latitude: item.Latitude ?? 0,
      longitude: item.Longitude ?? 0,
    }));
};
