export type BusStopDTO = {
  BusStopCode: string;
  RoadName: string;
  Description: string;
  Latitude: number;
  Longitude: number;
};

export type BusStopsDTO = {
  "odata.metadata"?: string;
  value: BusStopDTO[];
};
