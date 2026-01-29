import type { BusStopDTO, BusServiceDTO, BusDTO } from "../dtos/bus-arrival";
import type {
  BusStop,
  BusService,
  BusArrival,
  BusLoad,
  BusFeature,
  BusType,
} from "../models/bus-stop-models";

function mapBusArrival(dto: BusDTO | null | undefined): BusArrival | null {
  if (!dto || !dto.EstimatedArrival) {
    return null;
  }

  return {
    originCode: dto.OriginCode,
    destinationCode: dto.DestinationCode,
    estimatedArrival: new Date(dto.EstimatedArrival),
    latitude: parseFloat(dto.Latitude) || 0,
    longitude: parseFloat(dto.Longitude) || 0,
    visitNumber: parseInt(dto.VisitNumber, 10) || 0,
    load: (dto.Load as BusLoad) || "SEA",
    feature: (dto.Feature as BusFeature) || "",
    type: (dto.Type as BusType) || "SD",
  };
}

function mapBusService(dto: BusServiceDTO): BusService {
  return {
    serviceNo: dto.ServiceNo,
    operator: dto.Operator,
    nextBus: mapBusArrival(dto.NextBus),
    nextBus2: mapBusArrival(dto.NextBus2),
    nextBus3: mapBusArrival(dto.NextBus3),
  };
}

export function mapBusStopDtoToModel(dto: BusStopDTO): BusStop {
  return {
    busStopCode: dto.BusStopCode,
    services: (dto.Services || []).map(mapBusService),
  };
}
