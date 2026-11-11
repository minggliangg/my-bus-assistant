import type { AnalyticsBatchDTO } from "@my-bus-assistant/shared";
import { getDb } from "../db/client";

/** Singapore time (UTC+8, no DST) for day/hour bucketing. */
const SGT_MODIFIER = "'+8 hours'";
const DAY_EXPR = `strftime('%Y-%m-%d', ts / 1000, 'unixepoch', ${SGT_MODIFIER})`;
const HOUR_EXPR = `CAST(strftime('%H', ts / 1000, 'unixepoch', ${SGT_MODIFIER}) AS INTEGER)`;
const DAY_MS = 24 * 60 * 60 * 1000;
const SGT_OFFSET_MS = 8 * 60 * 60 * 1000;

export const insertEventBatch = (batch: AnalyticsBatchDTO): void => {
  const db = getDb();
  const stmt = db.query(
    `INSERT INTO analytics_events
       (ts, anon_id, session_id, name, path, stop_code, service_no, source, standalone)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  db.transaction(() => {
    for (const e of batch.events) {
      stmt.run(
        e.ts,
        batch.anonId,
        batch.sessionId,
        e.name,
        e.path ?? null,
        e.stopCode ?? null,
        e.serviceNo ?? null,
        e.source ?? null,
        batch.standalone ? 1 : 0,
      );
    }
  })();
};

export const insertApiRequest = (record: {
  ts: number;
  route: string;
  method: string;
  status: number;
  durationMs: number;
  cache: string | null;
}): void => {
  getDb()
    .query(
      `INSERT INTO api_requests (ts, route, method, status, duration_ms, cache)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(
      record.ts,
      record.route,
      record.method,
      record.status,
      record.durationMs,
      record.cache,
    );
};

export const pruneAnalytics = (retentionDays: number): number => {
  const cutoff = Date.now() - retentionDays * DAY_MS;
  const db = getDb();
  const events = db.query("DELETE FROM analytics_events WHERE ts < ?").run(cutoff);
  const requests = db.query("DELETE FROM api_requests WHERE ts < ?").run(cutoff);
  return events.changes + requests.changes;
};

// ---------------------------------------------------------------------------
// Dashboard queries
// ---------------------------------------------------------------------------

export const getRecentEvents = (limit: number) =>
  getDb()
    .query(
      `SELECT e.ts, e.name, e.path, e.stop_code AS stopCode, s.description AS stopDescription,
              e.service_no AS serviceNo, e.source, e.standalone,
              substr(e.anon_id, 1, 6) AS visitor
       FROM analytics_events e
       LEFT JOIN bus_stops s ON s.bus_stop_code = e.stop_code
       ORDER BY e.ts DESC, e.id DESC LIMIT ?`,
    )
    .all(limit) as {
    ts: number;
    name: string;
    path: string | null;
    stopCode: string | null;
    stopDescription: string | null;
    serviceNo: string | null;
    source: string | null;
    standalone: number;
    visitor: string;
  }[];

export interface DashboardStats {
  range: { days: number; from: number; to: number; dayKeys: string[] };
  totals: PeriodTotals;
  previousTotals: PeriodTotals;
  daily: { day: string; visitors: number; sessions: number; stopViews: number }[];
  hourly: { hour: number; stopViews: number }[];
  topStops: { stopCode: string; description: string | null; views: number; visitors: number }[];
  topServices: { serviceNo: string; views: number }[];
  stopSources: { source: string; views: number }[];
  events: { name: string; count: number }[];
  api: {
    daily: { day: string; ok: number; clientError: number; serverError: number }[];
    routes: {
      route: string;
      requests: number;
      errorRate: number;
      p50: number;
      p95: number;
      cacheHitRate: number | null;
    }[];
  };
}

interface PeriodTotals {
  visitors: number;
  sessions: number;
  pageViews: number;
  stopViews: number;
  standaloneShare: number | null;
  apiRequests: number;
  apiServerErrors: number;
}

const percentile = (sorted: number[], p: number): number => {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[Math.max(0, idx)];
};

/** Day keys (YYYY-MM-DD, SGT) for the last `days` days, oldest first. */
const buildDayKeys = (days: number, now: number): string[] => {
  const keys: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    keys.push(new Date(now + SGT_OFFSET_MS - i * DAY_MS).toISOString().slice(0, 10));
  }
  return keys;
};

/** Start of the SGT day `days - 1` days ago, as epoch ms. */
const rangeStart = (days: number, now: number): number => {
  const sgtNow = now + SGT_OFFSET_MS;
  const startOfTodaySgt = sgtNow - (sgtNow % DAY_MS);
  return startOfTodaySgt - (days - 1) * DAY_MS - SGT_OFFSET_MS;
};

const getPeriodTotals = (from: number, to: number): PeriodTotals => {
  const db = getDb();
  const e = db
    .query(
      `SELECT
         COUNT(DISTINCT anon_id) AS visitors,
         COUNT(DISTINCT session_id) AS sessions,
         SUM(name = 'page_view') AS pageViews,
         SUM(name = 'stop_viewed') AS stopViews,
         AVG(CASE WHEN name = 'session_start' THEN standalone END) AS standaloneShare
       FROM analytics_events WHERE ts >= ? AND ts < ?`,
    )
    .get(from, to) as {
    visitors: number;
    sessions: number;
    pageViews: number | null;
    stopViews: number | null;
    standaloneShare: number | null;
  };
  const a = db
    .query(
      `SELECT COUNT(*) AS requests, SUM(status >= 500) AS serverErrors
       FROM api_requests WHERE ts >= ? AND ts < ?`,
    )
    .get(from, to) as { requests: number; serverErrors: number | null };

  return {
    visitors: e.visitors,
    sessions: e.sessions,
    pageViews: e.pageViews ?? 0,
    stopViews: e.stopViews ?? 0,
    standaloneShare: e.standaloneShare,
    apiRequests: a.requests,
    apiServerErrors: a.serverErrors ?? 0,
  };
};

export const getDashboardStats = (days: number, now = Date.now()): DashboardStats => {
  const db = getDb();
  const from = rangeStart(days, now);
  const to = now + 1;
  const dayKeys = buildDayKeys(days, now);

  const dailyRows = db
    .query(
      `SELECT ${DAY_EXPR} AS day,
              COUNT(DISTINCT anon_id) AS visitors,
              COUNT(DISTINCT session_id) AS sessions,
              SUM(name = 'stop_viewed') AS stopViews
       FROM analytics_events WHERE ts >= ? AND ts < ?
       GROUP BY day`,
    )
    .all(from, to) as { day: string; visitors: number; sessions: number; stopViews: number }[];
  const dailyByDay = new Map(dailyRows.map((r) => [r.day, r]));

  const hourlyRows = db
    .query(
      `SELECT ${HOUR_EXPR} AS hour, COUNT(*) AS stopViews
       FROM analytics_events WHERE name = 'stop_viewed' AND ts >= ? AND ts < ?
       GROUP BY hour`,
    )
    .all(from, to) as { hour: number; stopViews: number }[];
  const hourlyByHour = new Map(hourlyRows.map((r) => [r.hour, r.stopViews]));

  const topStops = db
    .query(
      `SELECT e.stop_code AS stopCode, s.description AS description,
              COUNT(*) AS views, COUNT(DISTINCT e.anon_id) AS visitors
       FROM analytics_events e
       LEFT JOIN bus_stops s ON s.bus_stop_code = e.stop_code
       WHERE e.name = 'stop_viewed' AND e.stop_code IS NOT NULL AND e.ts >= ? AND e.ts < ?
       GROUP BY e.stop_code ORDER BY views DESC LIMIT 10`,
    )
    .all(from, to) as DashboardStats["topStops"];

  const topServices = db
    .query(
      `SELECT service_no AS serviceNo, COUNT(*) AS views
       FROM analytics_events
       WHERE name = 'service_route_viewed' AND service_no IS NOT NULL AND ts >= ? AND ts < ?
       GROUP BY service_no ORDER BY views DESC LIMIT 10`,
    )
    .all(from, to) as DashboardStats["topServices"];

  const stopSources = db
    .query(
      `SELECT COALESCE(source, 'unknown') AS source, COUNT(*) AS views
       FROM analytics_events WHERE name = 'stop_viewed' AND ts >= ? AND ts < ?
       GROUP BY source ORDER BY views DESC`,
    )
    .all(from, to) as DashboardStats["stopSources"];

  const events = db
    .query(
      `SELECT name, COUNT(*) AS count FROM analytics_events
       WHERE ts >= ? AND ts < ? GROUP BY name ORDER BY count DESC`,
    )
    .all(from, to) as DashboardStats["events"];

  const apiDailyRows = db
    .query(
      `SELECT ${DAY_EXPR} AS day,
              SUM(status < 400) AS ok,
              SUM(status >= 400 AND status < 500) AS clientError,
              SUM(status >= 500) AS serverError
       FROM api_requests WHERE ts >= ? AND ts < ? GROUP BY day`,
    )
    .all(from, to) as DashboardStats["api"]["daily"];
  const apiDailyByDay = new Map(apiDailyRows.map((r) => [r.day, r]));

  const routeRows = db
    .query(
      `SELECT route, status, duration_ms AS durationMs, cache
       FROM api_requests WHERE ts >= ? AND ts < ? ORDER BY route`,
    )
    .all(from, to) as { route: string; status: number; durationMs: number; cache: string | null }[];
  const byRoute = new Map<string, typeof routeRows>();
  for (const row of routeRows) {
    const list = byRoute.get(row.route) ?? [];
    list.push(row);
    byRoute.set(row.route, list);
  }
  const routes = [...byRoute.entries()]
    .map(([route, rows]) => {
      const durations = rows.map((r) => r.durationMs).sort((a, b) => a - b);
      const cached = rows.filter((r) => r.cache !== null);
      return {
        route,
        requests: rows.length,
        errorRate: rows.filter((r) => r.status >= 500).length / rows.length,
        p50: percentile(durations, 50),
        p95: percentile(durations, 95),
        cacheHitRate:
          cached.length > 0
            ? cached.filter((r) => r.cache === "HIT").length / cached.length
            : null,
      };
    })
    .sort((a, b) => b.requests - a.requests);

  return {
    range: { days, from, to, dayKeys },
    totals: getPeriodTotals(from, to),
    previousTotals: getPeriodTotals(from - days * DAY_MS, from),
    daily: dayKeys.map((day) => ({
      day,
      visitors: dailyByDay.get(day)?.visitors ?? 0,
      sessions: dailyByDay.get(day)?.sessions ?? 0,
      stopViews: dailyByDay.get(day)?.stopViews ?? 0,
    })),
    hourly: Array.from({ length: 24 }, (_, hour) => ({
      hour,
      stopViews: hourlyByHour.get(hour) ?? 0,
    })),
    topStops,
    topServices,
    stopSources,
    events,
    api: {
      daily: dayKeys.map((day) => ({
        day,
        ok: apiDailyByDay.get(day)?.ok ?? 0,
        clientError: apiDailyByDay.get(day)?.clientError ?? 0,
        serverError: apiDailyByDay.get(day)?.serverError ?? 0,
      })),
      routes,
    },
  };
};
