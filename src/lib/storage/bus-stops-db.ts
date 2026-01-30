import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { BusStopSearchModel } from "@/features/search-bar/models/bus-stops-model";

interface BusStopsDB extends DBSchema {
  busStops: {
    key: string;
    value: BusStopSearchModel;
    indexes: {
      "by-description": string;
      "by-road-name": string;
    };
  };
  metadata: {
    key: string;
    value: { lastUpdateTimestamp: number };
  };
}

const DB_NAME = "my-bus-assistant";
const DB_VERSION = 1;
const BUS_STOPS_STORE = "busStops";
const METADATA_STORE = "metadata";
const LAST_UPDATE_KEY = "bus-stops-last-update";

let db: IDBPDatabase<BusStopsDB> | null = null;

const openDatabase = async (): Promise<IDBPDatabase<BusStopsDB>> => {
  if (db) {
    return db;
  }

  db = await openDB<BusStopsDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(BUS_STOPS_STORE)) {
        const busStopsStore = db.createObjectStore(BUS_STOPS_STORE, {
          keyPath: "busStopCode",
        });
        busStopsStore.createIndex("by-description", "description");
        busStopsStore.createIndex("by-road-name", "roadName");
      }

      if (!db.objectStoreNames.contains(METADATA_STORE)) {
        db.createObjectStore(METADATA_STORE);
      }
    },
  });

  return db;
};

const getAllBusStops = async (): Promise<BusStopSearchModel[]> => {
  const database = await openDatabase();
  return database.getAll(BUS_STOPS_STORE);
};

const saveBusStops = async (stops: BusStopSearchModel[]): Promise<void> => {
  const database = await openDatabase();
  const tx = database.transaction(BUS_STOPS_STORE, "readwrite");

  await Promise.all([
    tx.objectStore(BUS_STOPS_STORE).clear(),
    ...stops.map((stop) => tx.objectStore(BUS_STOPS_STORE).put(stop)),
  ]);

  await tx.done;
};

const appendBusStops = async (stops: BusStopSearchModel[]): Promise<void> => {
  const database = await openDatabase();
  const tx = database.transaction(BUS_STOPS_STORE, "readwrite");
  await Promise.all(
    stops.map((stop) => tx.objectStore(BUS_STOPS_STORE).put(stop))
  );
  await tx.done;
};

const clearBusStopsOnly = async (): Promise<void> => {
  const database = await openDatabase();
  await database.clear(BUS_STOPS_STORE);
};

const getLastUpdate = async (): Promise<number | null> => {
  const database = await openDatabase();
  const metadata = await database.get(METADATA_STORE, LAST_UPDATE_KEY);
  return metadata?.lastUpdateTimestamp ?? null;
};

const setLastUpdate = async (timestamp: number): Promise<void> => {
  const database = await openDatabase();
  await database.put(METADATA_STORE, { lastUpdateTimestamp: timestamp }, LAST_UPDATE_KEY);
};

const getBusStopByCode = async (code: string): Promise<BusStopSearchModel | undefined> => {
  const database = await openDatabase();
  return database.get(BUS_STOPS_STORE, code);
};

const searchByDescription = async (query: string): Promise<BusStopSearchModel[]> => {
  const database = await openDatabase();
  const allStops = await database.getAll(BUS_STOPS_STORE);
  const lowerQuery = query.toLowerCase();

  return allStops.filter((stop) => 
    stop.description.toLowerCase().includes(lowerQuery)
  );
};

const clearAll = async (): Promise<void> => {
  const database = await openDatabase();
  const tx = database.transaction([BUS_STOPS_STORE, METADATA_STORE], "readwrite");

  await Promise.all([
    tx.objectStore(BUS_STOPS_STORE).clear(),
    tx.objectStore(METADATA_STORE).delete(LAST_UPDATE_KEY),
  ]);

  await tx.done;
};

export {
  openDatabase,
  getAllBusStops,
  saveBusStops,
  appendBusStops,
  clearBusStopsOnly,
  getLastUpdate,
  setLastUpdate,
  getBusStopByCode,
  searchByDescription,
  clearAll,
};
