/**
 * Bus routes DTOs - matches LTA DataMall API response format
 */

export type BusRouteDTO = {
  ServiceNo: string;
  Operator: string;
  Direction: number;
  StopSequence: number;
  BusStopCode: string;
  Distance: number;
  WD_FirstBus: string;
  WD_LastBus: string;
  SAT_FirstBus: string;
  SAT_LastBus: string;
  SUN_FirstBus: string;
  SUN_LastBus: string;
};

export type BusRoutesDTO = {
  "odata.metadata"?: string;
  value: BusRouteDTO[];
};
