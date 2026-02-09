import type { BusRouteDTO } from "@my-bus-assistant/shared";
import { getDb } from "../client";

export const getBusRoutesByServiceNo = (serviceNo: string): BusRouteDTO[] => {
  const rows = getDb()
    .query(
      "SELECT * FROM bus_routes WHERE service_no = ? ORDER BY direction, stop_sequence",
    )
    .all(serviceNo) as Array<{
    service_no: string;
    operator: string;
    direction: number;
    stop_sequence: number;
    bus_stop_code: string;
    distance: number;
    wd_first_bus: string;
    wd_last_bus: string;
    sat_first_bus: string;
    sat_last_bus: string;
    sun_first_bus: string;
    sun_last_bus: string;
  }>;

  return rows.map((r) => ({
    ServiceNo: r.service_no,
    Operator: r.operator,
    Direction: r.direction,
    StopSequence: r.stop_sequence,
    BusStopCode: r.bus_stop_code,
    Distance: r.distance,
    WD_FirstBus: r.wd_first_bus,
    WD_LastBus: r.wd_last_bus,
    SAT_FirstBus: r.sat_first_bus,
    SAT_LastBus: r.sat_last_bus,
    SUN_FirstBus: r.sun_first_bus,
    SUN_LastBus: r.sun_last_bus,
  }));
};

export const getBusRoutesCount = (): number => {
  const row = getDb()
    .query("SELECT COUNT(*) as count FROM bus_routes")
    .get() as { count: number };
  return row.count;
};

export const replaceBusRoutes = (routes: BusRouteDTO[]): void => {
  const db = getDb();
  const tx = db.transaction(() => {
    db.exec(
      "CREATE TABLE IF NOT EXISTS bus_routes_staging AS SELECT * FROM bus_routes WHERE 0",
    );
    db.exec("DELETE FROM bus_routes_staging");

    const insert = db.prepare(
      `INSERT INTO bus_routes_staging
        (service_no, operator, direction, stop_sequence, bus_stop_code, distance,
         wd_first_bus, wd_last_bus, sat_first_bus, sat_last_bus, sun_first_bus, sun_last_bus)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    for (const r of routes) {
      insert.run(
        r.ServiceNo,
        r.Operator,
        r.Direction,
        r.StopSequence,
        r.BusStopCode,
        r.Distance,
        r.WD_FirstBus,
        r.WD_LastBus,
        r.SAT_FirstBus,
        r.SAT_LastBus,
        r.SUN_FirstBus,
        r.SUN_LastBus,
      );
    }

    db.exec("DELETE FROM bus_routes");
    db.exec("INSERT INTO bus_routes SELECT * FROM bus_routes_staging");
    db.exec("DROP TABLE bus_routes_staging");

    db.query(
      "INSERT OR REPLACE INTO metadata (key, value, updated_at) VALUES (?, ?, ?)",
    ).run("bus_routes_last_updated", new Date().toISOString(), Date.now());
  });

  tx();
};
