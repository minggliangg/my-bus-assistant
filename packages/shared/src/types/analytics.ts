/**
 * Analytics contract between the web client and the API.
 *
 * Events are anonymous: the client sends a random per-browser ID and a
 * per-tab session ID. No IP addresses or personal data are stored.
 */

export const ANALYTICS_EVENT_NAMES = [
  "session_start",
  "page_view",
  "stop_viewed",
  "service_route_viewed",
  "favorite_added",
  "favorite_removed",
  "nearby_opened",
] as const;

export type AnalyticsEventName = (typeof ANALYTICS_EVENT_NAMES)[number];

/** Where a bus stop selection came from. */
export const STOP_VIEW_SOURCES = [
  "search",
  "favorite",
  "nearby",
  "link",
] as const;

export type StopViewSource = (typeof STOP_VIEW_SOURCES)[number];

export interface AnalyticsEventDTO {
  name: AnalyticsEventName;
  /** Client timestamp (ms since epoch). The server clamps implausible values. */
  ts: number;
  path?: string;
  stopCode?: string;
  serviceNo?: string;
  source?: StopViewSource;
}

export interface AnalyticsBatchDTO {
  anonId: string;
  sessionId: string;
  /** True when running as an installed PWA. */
  standalone: boolean;
  events: AnalyticsEventDTO[];
}

export const ANALYTICS_MAX_EVENTS_PER_BATCH = 50;
export const ANALYTICS_ENDPOINT = "/api/analytics/events";
