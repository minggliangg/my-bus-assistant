import { Hono } from "hono";
import {
  getDashboardStats,
  getRecentEvents,
} from "../lib/analytics/analytics.repository";
import { dashboardHtml } from "./dashboard-page";

const ALLOWED_RANGES = new Set([7, 30, 90]);

const parseAllowedUsers = (raw: string | undefined): Set<string> =>
  new Set(
    (raw ?? "")
      .split(",")
      .map((u) => u.trim().toLowerCase())
      .filter(Boolean),
  );

/**
 * Private analytics dashboard.
 *
 * Security model (defense in depth):
 * 1. The server binds to 127.0.0.1 only, so it is unreachable from the LAN
 *    and is NOT routed by Caddy / the Cloudflare tunnel.
 * 2. It is exposed solely through `tailscale serve`, which only accepts
 *    connections from the tailnet and injects `Tailscale-User-Login`.
 * 3. Requests without that header (or from a login not in
 *    DASHBOARD_ALLOWED_USERS) are rejected.
 */
export const createDashboardApp = (
  options: { allowedUsers?: string } = {},
) => {
  const allowedUsers = parseAllowedUsers(
    options.allowedUsers ?? process.env.DASHBOARD_ALLOWED_USERS,
  );
  const app = new Hono();

  app.use("*", async (c, next) => {
    const login = c.req.header("tailscale-user-login")?.toLowerCase();
    if (!login || (allowedUsers.size > 0 && !allowedUsers.has(login))) {
      return c.text("Forbidden", 403);
    }
    await next();
    c.header("Cache-Control", "no-store");
    c.header("X-Robots-Tag", "noindex, nofollow");
    c.header("X-Frame-Options", "DENY");
    c.header("Referrer-Policy", "no-referrer");
  });

  app.get("/", (c) => {
    c.header(
      "Content-Security-Policy",
      "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
    );
    return c.html(dashboardHtml(c.req.header("tailscale-user-name") ?? ""));
  });

  app.get("/favicon.ico", (c) => c.body(null, 204));

  app.get("/api/stats", (c) => {
    const days = Number.parseInt(c.req.query("days") ?? "7", 10);
    if (!ALLOWED_RANGES.has(days)) {
      return c.json({ error: "days must be one of 7, 30, 90" }, 400);
    }
    return c.json(getDashboardStats(days));
  });

  app.get("/api/recent", (c) => c.json(getRecentEvents(25)));

  return app;
};
