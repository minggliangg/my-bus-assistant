export interface BusRouteStop {
  stopSequence: number;
  busStopCode: string;
  busStopName?: string;
  roadName?: string;
  distance: number;
  wdFirstBus: string;
  wdLastBus: string;
  satFirstBus: string;
  satLastBus: string;
  sunFirstBus: string;
  sunLastBus: string;
}

export interface BusRouteDirection {
  direction: number;
  stops: BusRouteStop[];
}

export interface BusServiceRoute {
  serviceNo: string;
  operator: string;
  directions: BusRouteDirection[];
}
