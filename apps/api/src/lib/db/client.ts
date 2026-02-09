import { Database } from "bun:sqlite";
import { join } from "path";
import { mkdirSync } from "fs";

let db: Database | null = null;

const DB_DIR = join(import.meta.dir, "../../../../data");
const DB_PATH = join(DB_DIR, "bus-assistant.db");

export const getDb = (): Database => {
  if (db) return db;

  mkdirSync(DB_DIR, { recursive: true });

  db = new Database(DB_PATH);
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA synchronous = NORMAL");
  db.exec("PRAGMA cache_size = -64000");
  db.exec("PRAGMA busy_timeout = 5000");

  return db;
};

/** Reset DB connection — used in tests */
export const resetDb = (testDb?: Database): void => {
  if (db && db !== testDb) {
    db.close();
  }
  db = testDb ?? null;
};

export const closeDb = (): void => {
  if (db) {
    db.close();
    db = null;
  }
};
