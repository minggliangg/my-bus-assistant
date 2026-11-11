import type { Context } from "hono";

export const resolveClientIp = (c: Context): string => {
  const cfIp = c.req.header("cf-connecting-ip");
  if (cfIp) return cfIp;
  const forwarded = c.req.header("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const realIp = c.req.header("x-real-ip");
  if (realIp) return realIp;
  return "unknown";
};

/**
 * Sliding-window in-memory rate limiter. Stale keys are pruned periodically
 * so the map can't grow without bound under a flood of distinct IPs.
 */
export const createRateLimiter = (options: {
  windowMs: number;
  maxRequests: number;
}) => {
  const store = new Map<string, number[]>();
  let lastPrune = Date.now();

  const prune = (now: number) => {
    const threshold = now - options.windowMs;
    for (const [key, timestamps] of store) {
      if (timestamps[timestamps.length - 1] <= threshold) store.delete(key);
    }
    lastPrune = now;
  };

  return {
    isLimited(key: string): boolean {
      const now = Date.now();
      if (now - lastPrune > options.windowMs) prune(now);
      const threshold = now - options.windowMs;
      const recent = (store.get(key) ?? []).filter((ts) => ts > threshold);
      recent.push(now);
      store.set(key, recent);
      return recent.length > options.maxRequests;
    },
    reset() {
      store.clear();
    },
  };
};
