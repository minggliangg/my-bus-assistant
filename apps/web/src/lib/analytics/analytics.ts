import {
  ANALYTICS_ENDPOINT,
  ANALYTICS_MAX_EVENTS_PER_BATCH,
  type AnalyticsBatchDTO,
  type AnalyticsEventDTO,
  type StopViewSource,
} from "@my-bus-assistant/shared";

/**
 * Anonymous, first-party usage analytics.
 *
 * - A random per-browser ID (localStorage) counts unique visitors.
 * - A per-tab session ID (sessionStorage) rotates after 30 minutes idle.
 * - No IPs, locations, search text or personal data are collected.
 * - Disabled outside production builds and when Do Not Track / GPC is set.
 */

const ANON_ID_KEY = "mba_anon_id";
const SESSION_KEY = "mba_session";
const SESSION_IDLE_MS = 30 * 60 * 1000;
const FLUSH_DELAY_MS = 5000;
const MAX_QUEUE = 200;

type TrackInput = Omit<AnalyticsEventDTO, "ts">;

interface AnalyticsDeps {
  enabled: boolean;
  send: (body: string) => void;
  now: () => number;
  local: Pick<Storage, "getItem" | "setItem"> | null;
  session: Pick<Storage, "getItem" | "setItem"> | null;
  isStandalone: () => boolean;
  randomId: () => string;
}

const safeGet = (storage: AnalyticsDeps["local"], key: string): string | null => {
  try {
    return storage?.getItem(key) ?? null;
  } catch {
    return null;
  }
};

const safeSet = (storage: AnalyticsDeps["local"], key: string, value: string) => {
  try {
    storage?.setItem(key, value);
  } catch {
    // Storage unavailable (private mode, blocked) - fall back to in-memory IDs.
  }
};

export const createAnalytics = (deps: AnalyticsDeps) => {
  let queue: AnalyticsEventDTO[] = [];
  let timer: ReturnType<typeof setTimeout> | null = null;
  let memoryAnonId: string | null = null;
  let memorySession: { id: string; lastSeen: number } | null = null;

  const getAnonId = (): string => {
    const stored = safeGet(deps.local, ANON_ID_KEY);
    if (stored) return stored;
    memoryAnonId ??= deps.randomId();
    safeSet(deps.local, ANON_ID_KEY, memoryAnonId);
    return memoryAnonId;
  };

  /** Returns the current session ID, starting a new session if idle too long. */
  const touchSession = (): { id: string; isNew: boolean } => {
    const now = deps.now();
    let current = memorySession;
    const raw = safeGet(deps.session, SESSION_KEY);
    if (raw) {
      try {
        current = JSON.parse(raw) as { id: string; lastSeen: number };
      } catch {
        current = null;
      }
    }
    const isNew = !current || now - current.lastSeen > SESSION_IDLE_MS;
    const next = { id: isNew ? deps.randomId() : current!.id, lastSeen: now };
    memorySession = next;
    safeSet(deps.session, SESSION_KEY, JSON.stringify(next));
    return { id: next.id, isNew };
  };

  const flush = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    if (queue.length === 0) return;
    const { id: sessionId } = touchSession();
    const anonId = getAnonId();
    const standalone = deps.isStandalone();
    while (queue.length > 0) {
      const events = queue.splice(0, ANALYTICS_MAX_EVENTS_PER_BATCH);
      const batch: AnalyticsBatchDTO = { anonId, sessionId, standalone, events };
      try {
        deps.send(JSON.stringify(batch));
      } catch {
        // Analytics must never break the app.
      }
    }
  };

  const track = (event: TrackInput) => {
    if (!deps.enabled) return;
    const now = deps.now();
    const { isNew } = touchSession();
    if (isNew) queue.push({ name: "session_start", ts: now });
    queue.push({ ...event, ts: now });
    if (queue.length > MAX_QUEUE) queue = queue.slice(-MAX_QUEUE);
    timer ??= setTimeout(flush, FLUSH_DELAY_MS);
  };

  return {
    track,
    flush,
    pageView: (path: string) => track({ name: "page_view", path }),
    stopViewed: (stopCode: string, source: StopViewSource) =>
      track({ name: "stop_viewed", stopCode, source }),
    serviceRouteViewed: (serviceNo: string) =>
      track({ name: "service_route_viewed", serviceNo }),
    favoriteAdded: (stopCode: string) => track({ name: "favorite_added", stopCode }),
    favoriteRemoved: (stopCode: string) => track({ name: "favorite_removed", stopCode }),
    nearbyOpened: () => track({ name: "nearby_opened" }),
  };
};

const storageOrNull = (get: () => Storage): Storage | null => {
  try {
    return get();
  } catch {
    return null;
  }
};

const isPrivacySignalSet = (): boolean => {
  if (typeof navigator === "undefined") return false;
  const nav = navigator as Navigator & { globalPrivacyControl?: boolean };
  return nav.doNotTrack === "1" || nav.globalPrivacyControl === true;
};

const sendBatch = (body: string) => {
  // text/plain keeps this a "simple" request (no CORS preflight) and lets
  // sendBeacon deliver it even while the page is being hidden/unloaded.
  const blob = new Blob([body], { type: "text/plain" });
  if (navigator.sendBeacon?.(ANALYTICS_ENDPOINT, blob)) return;
  void fetch(ANALYTICS_ENDPOINT, {
    method: "POST",
    body,
    headers: { "Content-Type": "text/plain" },
    keepalive: true,
  }).catch(() => {});
};

const randomId = (): string =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;

export const analytics = createAnalytics({
  enabled:
    typeof window !== "undefined" &&
    import.meta.env.PROD &&
    import.meta.env.VITE_ANALYTICS_ENABLED !== "false" &&
    !isPrivacySignalSet(),
  send: sendBatch,
  now: () => Date.now(),
  local: typeof window !== "undefined" ? storageOrNull(() => window.localStorage) : null,
  session: typeof window !== "undefined" ? storageOrNull(() => window.sessionStorage) : null,
  isStandalone: () =>
    window.matchMedia?.("(display-mode: standalone)").matches === true ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true,
  randomId,
});

if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") analytics.flush();
  });
  window.addEventListener("pagehide", () => analytics.flush());
}
