export interface BusStopServicePreferences {
  busStopCode: string;
  hiddenServices: string[];
  serviceOrder: string[] | null;
  updatedAt: number;
}

export interface GlobalBusPriorities {
  prioritizedServices: string[];
  updatedAt: number;
}

export const GLOBAL_PRIORITIES_KEY = "global";
