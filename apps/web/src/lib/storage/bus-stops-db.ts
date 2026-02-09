import { deleteDB, openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { BusStopSearchModel } from "@/features/search-bar/models/bus-stops-model";

interface BusRouteCacheEntry {
  serviceNo: string;
  data: string;
  timestamp: number;
}

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
  favorites: {
    key: string;
    value: {
      busStopCode: string;
      timestamp: number;
      order: number;
    };
    indexes: {
      "by-timestamp": number;
    };
  };
  busRoutes: {
    key: string;
    value: BusRouteCacheEntry;
  };
}

const DB_NAME = "my-bus-assistant";
const DB_VERSION = 3;
const BUS_STOPS_STORE = "busStops";
const METADATA_STORE = "metadata";
const LAST_UPDATE_KEY = "bus-stops-last-update";

let db: IDBPDatabase<BusStopsDB> | null = null;

const createDatabase = (database: IDBPDatabase<BusStopsDB>) => {
  if (!database.objectStoreNames.contains(BUS_STOPS_STORE)) {
    const busStopsStore = database.createObjectStore(BUS_STOPS_STORE, {
      keyPath: "busStopCode",
    });
    busStopsStore.createIndex("by-description", "description");
    busStopsStore.createIndex("by-road-name", "roadName");
  }

  if (!database.objectStoreNames.contains(METADATA_STORE)) {
    database.createObjectStore(METADATA_STORE);
  }

  if (!database.objectStoreNames.contains("favorites")) {
    const favoritesStore = database.createObjectStore("favorites", {
      keyPath: "busStopCode",
    });
    favoritesStore.createIndex("by-timestamp", "timestamp");
  }

  if (!database.objectStoreNames.contains("busRoutes")) {
    database.createObjectStore("busRoutes", {
      keyPath: "serviceNo",
    });
  }
};

const openDatabase = async (): Promise<IDBPDatabase<BusStopsDB>> => {
  if (db) {
    return db;
  }

  try {
    db = await openDB<BusStopsDB>(DB_NAME, DB_VERSION, {
      upgrade(database) {
        createDatabase(database);
      },
      blocked() {
        db?.close();
        db = null;
      },
    });
  } catch (error) {
    // If upgrade fails (e.g. corrupted DB), delete and recreate from scratch
    console.warn("IndexedDB open failed, deleting and recreating:", error);
    db = null;
    await deleteDB(DB_NAME);
    db = await openDB<BusStopsDB>(DB_NAME, DB_VERSION, {
      upgrade(database) {
        createDatabase(database);
      },
    });
  }

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

const getCachedBusRoute = async (serviceNo: string): Promise<BusRouteCacheEntry | undefined> => {
  const database = await openDatabase();
  return database.get("busRoutes", serviceNo);
};

const saveBusRoute = async (serviceNo: string, data: string, timestamp: number): Promise<void> => {
  const database = await openDatabase();
  await database.put("busRoutes", { serviceNo, data, timestamp });
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

const addFavorite = async (busStopCode: string): Promise<void> => {
  const database = await openDatabase();
  const timestamp = Date.now();
  await database.put("favorites", {
    busStopCode,
    timestamp,
    order: 0,
  });
};

const removeFavorite = async (busStopCode: string): Promise<void> => {
  const database = await openDatabase();
  await database.delete("favorites", busStopCode);
};

const getAllFavorites = async (): Promise<string[]> => {
  const database = await openDatabase();
  const allFavorites = await database.getAll("favorites");
  return allFavorites
    .sort((a, b) => b.timestamp - a.timestamp)
    .map((fav) => fav.busStopCode);
};

const clearAllFavorites = async (): Promise<void> => {
  const database = await openDatabase();
  await database.clear("favorites");
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
  getCachedBusRoute,
  saveBusRoute,
  clearAll,
  addFavorite,
  removeFavorite,
  getAllFavorites,
  clearAllFavorites,
};
