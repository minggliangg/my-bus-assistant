import type { BusStopDTO } from "@my-bus-assistant/shared";
import { getDb } from "../client";

export const getAllBusStops = (): BusStopDTO[] => {
  return getBusStopsPage(0, getBusStopsCount());
};

export const getBusStopsPage = (skip: number, top: number): BusStopDTO[] => {
  const rows = getDb()
    .query("SELECT * FROM bus_stops LIMIT ? OFFSET ?")
    .all(top, skip) as Array<{
    bus_stop_code: string;
    road_name: string;
    description: string;
    latitude: number;
    longitude: number;
  }>;

  return rows.map((r) => ({
    BusStopCode: r.bus_stop_code,
    RoadName: r.road_name,
    Description: r.description,
    Latitude: r.latitude,
    Longitude: r.longitude,
  }));
};

export const getBusStopsCount = (): number => {
  const row = getDb()
    .query("SELECT COUNT(*) as count FROM bus_stops")
    .get() as { count: number };
  return row.count;
};

export const replaceBusStops = (stops: BusStopDTO[]): void => {
  const db = getDb();
  const tx = db.transaction(() => {
    db.exec(
      "CREATE TABLE IF NOT EXISTS bus_stops_staging AS SELECT * FROM bus_stops WHERE 0",
    );
    db.exec("DELETE FROM bus_stops_staging");

    const insert = db.prepare(
      "INSERT INTO bus_stops_staging (bus_stop_code, road_name, description, latitude, longitude) VALUES (?, ?, ?, ?, ?)",
    );
    for (const s of stops) {
      insert.run(
        s.BusStopCode,
        s.RoadName,
        s.Description,
        s.Latitude,
        s.Longitude,
      );
    }

    db.exec("DELETE FROM bus_stops");
    db.exec("INSERT INTO bus_stops SELECT * FROM bus_stops_staging");
    db.exec("DROP TABLE bus_stops_staging");

    db.query(
      "INSERT OR REPLACE INTO metadata (key, value, updated_at) VALUES (?, ?, ?)",
    ).run("bus_stops_last_updated", new Date().toISOString(), Date.now());
  });

  tx();
};
