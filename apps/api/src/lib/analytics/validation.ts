import {
  ANALYTICS_EVENT_NAMES,
  ANALYTICS_MAX_EVENTS_PER_BATCH,
  STOP_VIEW_SOURCES,
  type AnalyticsBatchDTO,
  type AnalyticsEventDTO,
} from "@my-bus-assistant/shared";

const ID_RE = /^[A-Za-z0-9_-]{8,64}$/;
const PATH_RE = /^\/[A-Za-z0-9/_\-.%]{0,199}$/;
const STOP_CODE_RE = /^\d{5}$/;
const SERVICE_NO_RE = /^[A-Za-z0-9]{1,6}$/;
const MAX_CLOCK_SKEW_MS = 5 * 60 * 1000;
const MAX_EVENT_AGE_MS = 24 * 60 * 60 * 1000;

const EVENT_NAMES = new Set<string>(ANALYTICS_EVENT_NAMES);
const SOURCES = new Set<string>(STOP_VIEW_SOURCES);

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

const optionalMatch = (v: unknown, re: RegExp): string | undefined =>
  typeof v === "string" && re.test(v) ? v : undefined;

/** Accept the client timestamp only when it's plausible; otherwise use server time. */
const normalizeTs = (v: unknown, now: number): number =>
  typeof v === "number" &&
  Number.isFinite(v) &&
  v <= now + MAX_CLOCK_SKEW_MS &&
  v >= now - MAX_EVENT_AGE_MS
    ? Math.round(v)
    : now;

/**
 * Validates an incoming batch. Returns null when the envelope is invalid.
 * Individual malformed events are dropped; malformed optional fields are cleared.
 */
export const parseAnalyticsBatch = (
  input: unknown,
  now = Date.now(),
): AnalyticsBatchDTO | null => {
  if (!isRecord(input)) return null;
  const { anonId, sessionId, standalone, events } = input;
  if (typeof anonId !== "string" || !ID_RE.test(anonId)) return null;
  if (typeof sessionId !== "string" || !ID_RE.test(sessionId)) return null;
  if (!Array.isArray(events) || events.length === 0) return null;
  if (events.length > ANALYTICS_MAX_EVENTS_PER_BATCH) return null;

  const parsed: AnalyticsEventDTO[] = [];
  for (const raw of events) {
    if (!isRecord(raw) || typeof raw.name !== "string" || !EVENT_NAMES.has(raw.name)) {
      continue;
    }
    parsed.push({
      name: raw.name as AnalyticsEventDTO["name"],
      ts: normalizeTs(raw.ts, now),
      path: optionalMatch(raw.path, PATH_RE),
      stopCode: optionalMatch(raw.stopCode, STOP_CODE_RE),
      serviceNo: optionalMatch(raw.serviceNo, SERVICE_NO_RE),
      source:
        typeof raw.source === "string" && SOURCES.has(raw.source)
          ? (raw.source as AnalyticsEventDTO["source"])
          : undefined,
    });
  }
  if (parsed.length === 0) return null;

  return { anonId, sessionId, standalone: standalone === true, events: parsed };
};
