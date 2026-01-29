export type BusDTO = {
  OriginCode: string;
  DestinationCode: string;
  EstimatedArrival: string;
  Monitored: number;
  Latitude: string;
  Longitude: string;
  VisitNumber: string;
  Load: string;
  Feature: string;
  Type: string;
};

export type BusServiceDTO = {
  ServiceNo: string;
  Operator: string;
  NextBus?: BusDTO;
  NextBus2?: BusDTO;
  NextBus3?: BusDTO;
};

export type BusStopDTO = {
  "odata.metadata"?: string;
  BusStopCode: string;
  Services?: BusServiceDTO[];
};
