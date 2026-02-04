import type { BusStopSearchModel } from "@/features/search-bar/models/bus-stops-model";

export interface NearbyBusStop extends BusStopSearchModel {
  distance: number;
}
