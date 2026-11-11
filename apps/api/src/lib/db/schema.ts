import type { Database } from "bun:sqlite";

const SCHEMA_VERSION = 2;

const V1_CORE_TABLES = `
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
`;

const V2_ANALYTICS_TABLES = `
  CREATE TABLE IF NOT EXISTS analytics_events (
    id INTEGER PRIMARY KEY,
    ts INTEGER NOT NULL,
    anon_id TEXT NOT NULL,
    session_id TEXT NOT NULL,
    name TEXT NOT NULL,
    path TEXT,
    stop_code TEXT,
    service_no TEXT,
    source TEXT,
    standalone INTEGER NOT NULL DEFAULT 0
  );

  CREATE INDEX IF NOT EXISTS idx_analytics_events_ts
    ON analytics_events(ts);
  CREATE INDEX IF NOT EXISTS idx_analytics_events_name_ts
    ON analytics_events(name, ts);

  CREATE TABLE IF NOT EXISTS api_requests (
    id INTEGER PRIMARY KEY,
    ts INTEGER NOT NULL,
    route TEXT NOT NULL,
    method TEXT NOT NULL,
    status INTEGER NOT NULL,
    duration_ms REAL NOT NULL,
    cache TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_api_requests_ts
    ON api_requests(ts);
`;

export const initSchema = (db: Database): void => {
  const currentVersion = (
    db.query("PRAGMA user_version").get() as { user_version: number }
  ).user_version;

  if (currentVersion >= SCHEMA_VERSION) return;

  const migrate = db.transaction(() => {
    if (currentVersion < 1) db.exec(V1_CORE_TABLES);
    if (currentVersion < 2) db.exec(V2_ANALYTICS_TABLES);
    db.exec(`PRAGMA user_version = ${SCHEMA_VERSION}`);
  });
  migrate();
};
