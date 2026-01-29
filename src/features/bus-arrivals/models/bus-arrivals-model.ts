// Domain models - application-friendly types with proper typing

export type BusLoad = "SEA" | "SDA" | "LSD";
export type BusFeature = "WAB" | "";
export type BusType = "SD" | "DD" | "BD";

export interface BusArrival {
  originCode: string;
  destinationCode: string;
  estimatedArrival: Date;
  latitude: number;
  longitude: number;
  visitNumber: number;
  load: BusLoad;
  feature: BusFeature;
  type: BusType;
}

export interface BusService {
  serviceNo: string;
  operator: string;
  nextBus: BusArrival | null;
  nextBus2: BusArrival | null;
  nextBus3: BusArrival | null;
}

export interface BusStop {
  busStopCode: string;
  services: BusService[];
}

// Computed properties helper
export const getArrivalInMinutes = (arrival: BusArrival): number => {
  const now = new Date();
  const diff = arrival.estimatedArrival.getTime() - now.getTime();
  return Math.max(0, Math.round(diff / 60000));
};

export const formatArrivalTime = (arrival: BusArrival): string => {
  const minutes = getArrivalInMinutes(arrival);
  if (minutes === 0) return "Arr";
  if (minutes === 1) return "1 min";
  return `${minutes} mins`;
};

export const isArriving = (
  arrival: BusArrival,
  withinMinutes: number = 5,
): boolean => getArrivalInMinutes(arrival) <= withinMinutes;

export const getBusLoadLabel = (load: BusLoad): string => {
  const labels: Record<BusLoad, string> = {
    SEA: "Seats Available",
    SDA: "Standing Available",
    LSD: "Limited Standing",
  };
  return labels[load];
};
