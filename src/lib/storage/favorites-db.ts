import { openDB, type DBSchema, type IDBPDatabase } from "idb";

interface FavoritesDB extends DBSchema {
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
}

const DB_NAME = "my-bus-assistant";
const DB_VERSION = 2;
const FAVORITES_STORE = "favorites";

let db: IDBPDatabase<FavoritesDB> | null = null;

const openDatabase = async (): Promise<IDBPDatabase<FavoritesDB>> => {
  if (db) {
    return db;
  }

  db = await openDB<FavoritesDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(FAVORITES_STORE)) {
        const favoritesStore = db.createObjectStore(FAVORITES_STORE, {
          keyPath: "busStopCode",
        });
        favoritesStore.createIndex("by-timestamp", "timestamp");
      }
    },
  });

  return db;
};

const addFavorite = async (busStopCode: string): Promise<void> => {
  const database = await openDatabase();
  const timestamp = Date.now();
  await database.put(FAVORITES_STORE, {
    busStopCode,
    timestamp,
    order: 0,
  });
};

const removeFavorite = async (busStopCode: string): Promise<void> => {
  const database = await openDatabase();
  await database.delete(FAVORITES_STORE, busStopCode);
};

const getAllFavorites = async (): Promise<string[]> => {
  const database = await openDatabase();
  const allFavorites = await database.getAll(FAVORITES_STORE);
  return allFavorites
    .sort((a, b) => b.timestamp - a.timestamp)
    .map((fav) => fav.busStopCode);
};

const isFavorited = async (busStopCode: string): Promise<boolean> => {
  const database = await openDatabase();
  const favorite = await database.get(FAVORITES_STORE, busStopCode);
  return favorite !== undefined;
};

const clearAllFavorites = async (): Promise<void> => {
  const database = await openDatabase();
  await database.clear(FAVORITES_STORE);
};

export {
  openDatabase,
  addFavorite,
  removeFavorite,
  getAllFavorites,
  isFavorited,
  clearAllFavorites,
};
