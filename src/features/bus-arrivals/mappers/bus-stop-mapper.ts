import type {
  BusDTO,
  BusServiceDTO,
  BusStopDTO,
} from "../dtos/bus-arrival-dto";
import type {
  BusArrival,
  BusFeature,
  BusLoad,
  BusService,
  BusStop,
  BusType,
} from "../models/bus-arrivals-model";

const mapBusArrival = (dto: BusDTO): BusArrival | null => {
  // Check if EstimatedArrival is empty or not provided (EMPTY_BUS_DTO scenario)
  if (!dto.EstimatedArrival || dto.EstimatedArrival === "") return null;

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
};

const mapBusService = (dto: BusServiceDTO): BusService => ({
  serviceNo: dto.ServiceNo,
  operator: dto.Operator,
  nextBus: mapBusArrival(dto.NextBus),
  nextBus2: mapBusArrival(dto.NextBus2),
  nextBus3: mapBusArrival(dto.NextBus3),
});

export const mapBusStopDtoToModel = (dto: BusStopDTO): BusStop => ({
  busStopCode: dto.BusStopCode,
  services: dto.Services.map(mapBusService),
});
