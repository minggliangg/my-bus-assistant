import type { Database } from "bun:sqlite";

const SCHEMA_VERSION = 1;

export const initSchema = (db: Database): void => {
  const currentVersion = db.query("PRAGMA user_version").get() as {
    user_version: number;
  };

  if (currentVersion.user_version >= SCHEMA_VERSION) return;

  db.exec(`
    CREATE TABLE IF NOT EXISTS metadata (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS bus_stops (
      bus_stop_code TEXT PRIMARY KEY,
      road_name TEXT NOT NULL,
      description TEXT NOT NULL,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_bus_stops_description
      ON bus_stops(description COLLATE NOCASE);

    CREATE TABLE IF NOT EXISTS bus_routes (
      service_no TEXT NOT NULL,
      operator TEXT NOT NULL,
      direction INTEGER NOT NULL,
      stop_sequence INTEGER NOT NULL,
      bus_stop_code TEXT NOT NULL,
      distance REAL NOT NULL,
      wd_first_bus TEXT NOT NULL,
      wd_last_bus TEXT NOT NULL,
      sat_first_bus TEXT NOT NULL,
      sat_last_bus TEXT NOT NULL,
      sun_first_bus TEXT NOT NULL,
      sun_last_bus TEXT NOT NULL,
      UNIQUE(service_no, direction, stop_sequence)
    );

    CREATE INDEX IF NOT EXISTS idx_bus_routes_bus_stop_code
      ON bus_routes(bus_stop_code);
    CREATE INDEX IF NOT EXISTS idx_bus_routes_service_no
      ON bus_routes(service_no);

    PRAGMA user_version = ${SCHEMA_VERSION};
  `);
};
