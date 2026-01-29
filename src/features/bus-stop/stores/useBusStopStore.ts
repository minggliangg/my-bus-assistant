import { create } from "zustand";
import { type BusStopDTO } from "../dtos/bus-arrival";
import { type BusStop } from "../models/bus-stop-models";
import { mapBusStopDtoToModel } from "../mappers/bus-stop-mapper";

interface BusStopStore {
  busStop: BusStop | null;
  loading: boolean;
  error: string | null;
  fetchBusArrivals: (busStopCode: string) => Promise<void>;
}

const useBusStore = create<BusStopStore>((set) => ({
  busStop: null,
  loading: false,
  error: null,

  fetchBusArrivals: async (busStopCode: string) => {
    set({ loading: true, error: null });

    try {
      const response = await fetch(
        `/api/ltaodataservice/v3/BusArrival?BusStopCode=${busStopCode}`,
        {
          headers: {
            Accept: "application/json",
          },
        },
      );

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const dto: BusStopDTO = await response.json();
      const busStop = mapBusStopDtoToModel(dto);
      set({ busStop, loading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Unknown error",
        loading: false,
      });
    }
  },
}));

export default useBusStore;
