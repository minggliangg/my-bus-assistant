const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (ch) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]!,
  );

/**
 * Self-contained, mobile-first dashboard page: no external scripts, fonts or
 * stylesheets. Phone layout is the base (tabbed sections, bottom navigation);
 * wide screens (>= 900px) progressively show every section in a grid.
 * Charts are hand-built SVG following the reference data-viz palette.
 */
export const dashboardHtml = (userName: string) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex, nofollow">
<meta name="theme-color" content="#f9f9f7" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#0d0d0d" media="(prefers-color-scheme: dark)">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Bus Analytics">
<title>Bus Assistant Analytics</title>
<style>
:root {
  color-scheme: light;
  --page: #f9f9f7;
  --surface: #fcfcfb;
  --ink: #0b0b0b;
  --ink-2: #52514e;
  --muted: #898781;
  --grid: #e1e0d9;
  --axis: #c3c2b7;
  --ring: rgba(11,11,11,0.10);
  --good-text: #006300;
  --bad-text: #b42323;
  --s1: #2a78d6;
  --s2: #eb6834;
  --track: #ecebe6;
  --ok: #2a78d6;
  --warning: #fab219;
  --critical: #d03b3b;
  --tap: rgba(11,11,11,0.05);
  --seg-active: #fcfcfb;
}
@media (prefers-color-scheme: dark) {
  :root {
    color-scheme: dark;
    --page: #0d0d0d;
    --surface: #1a1a19;
    --ink: #f0efec;
    --ink-2: #c3c2b7;
    --muted: #898781;
    --grid: #2c2c2a;
    --axis: #383835;
    --ring: rgba(255,255,255,0.10);
    --good-text: #0ca30c;
    --bad-text: #e66767;
    --s1: #3987e5;
    --s2: #d95926;
    --track: #2c2c2a;
    --ok: #3987e5;
    --tap: rgba(255,255,255,0.06);
    --seg-active: #4a4945;
  }
}

/* ---------- base: phone ---------- */
* { box-sizing: border-box; }
html { -webkit-text-size-adjust: 100%; }
body {
  margin: 0; background: var(--page); color: var(--ink);
  font: 15px/1.45 system-ui, -apple-system, "Segoe UI", sans-serif;
  -webkit-tap-highlight-color: transparent;
}
button { font: inherit; color: inherit; }
main {
  max-width: 1180px; margin: 0 auto;
  padding: 0 max(16px, env(safe-area-inset-right)) calc(84px + env(safe-area-inset-bottom)) max(16px, env(safe-area-inset-left));
}

.topbar {
  position: sticky; top: 0; z-index: 5; background: var(--page);
  margin: 0 -16px 12px; padding: calc(10px + env(safe-area-inset-top)) 16px 10px;
  border-bottom: 1px solid var(--ring);
}
.topbar-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 10px; }
h1 { font-size: 17px; margin: 0; font-weight: 650; letter-spacing: -0.01em; }
.sub { color: var(--muted); font-size: 12px; }
.refresh {
  border: 1px solid var(--ring); background: var(--surface); border-radius: 8px;
  min-height: 36px; padding: 0 10px; font-size: 12px; color: var(--ink-2); cursor: pointer; white-space: nowrap;
}
.ranges {
  display: grid; grid-template-columns: repeat(3, 1fr); padding: 3px; gap: 3px;
  background: var(--track); border-radius: 10px;
}
.ranges button {
  min-height: 34px; border: 0; border-radius: 8px; background: transparent; color: var(--ink-2);
  font-size: 13px; cursor: pointer;
}
.ranges button[aria-pressed="true"] { background: var(--seg-active); color: var(--ink); font-weight: 600; box-shadow: 0 1px 2px rgba(0,0,0,0.12); }

.panel { display: none; }
.panel.active { display: block; }
.panel-title { display: none; }
.stack { display: grid; gap: 12px; }

.tiles { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.tile, .card { background: var(--surface); border: 1px solid var(--ring); border-radius: 14px; min-width: 0; }
.tile { padding: 12px 14px; }
.tile .label { color: var(--ink-2); font-size: 12px; }
.tile .value { font-size: 24px; font-weight: 650; margin-top: 2px; letter-spacing: -0.01em; }
.tile .delta { font-size: 12px; color: var(--muted); margin-top: 2px; }
.delta .up-good, .delta .down-good { color: var(--good-text); font-weight: 600; }
.delta .up-bad, .delta .down-bad { color: var(--bad-text); font-weight: 600; }

.card { padding: 14px; }
.card h3 { font-size: 15px; font-weight: 600; margin: 0; }
.card .desc { color: var(--ink-2); font-size: 12px; margin: 2px 0 10px; }
.legend { display: flex; flex-wrap: wrap; gap: 6px 14px; font-size: 12px; color: var(--ink-2); margin: 0 0 8px; }
.legend span { display: inline-flex; align-items: center; gap: 6px; }
.key-line { width: 14px; height: 2px; border-radius: 1px; display: inline-block; flex: none; }
.key-box { width: 10px; height: 10px; border-radius: 3px; display: inline-block; flex: none; }
.chart { position: relative; width: 100%; }
.chart svg { display: block; overflow: visible; }
.chart .hit { touch-action: pan-y; cursor: crosshair; outline: none; }
.axis-text { fill: var(--muted); font-size: 11px; font-variant-numeric: tabular-nums; }
.end-label { fill: var(--ink); font-size: 12px; font-weight: 600; }
.hint { color: var(--muted); font-size: 11px; margin-top: 6px; }
.empty { color: var(--muted); font-size: 13px; padding: 20px 0; text-align: center; }

.bars { display: grid; grid-template-columns: minmax(0, 1fr) auto; column-gap: 12px; align-items: baseline; }
.bars .name { min-width: 0; }
.bars .name .t { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block; font-size: 14px; }
.bars .name .m { color: var(--muted); font-size: 11px; }
.bars .num { font-variant-numeric: tabular-nums; font-weight: 600; text-align: right; }
.bars .track { grid-column: 1 / -1; height: 8px; margin: 4px 0 12px; }
.bars .track:last-child { margin-bottom: 0; }
.bars .fill { height: 8px; border-radius: 0 4px 4px 0; background: var(--s1); min-width: 2px; }

.routes { display: grid; gap: 10px; }
.route + .route { border-top: 1px solid var(--grid); padding-top: 10px; }
.route-head { display: flex; justify-content: space-between; gap: 12px; align-items: baseline; }
.route-name { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 13px; overflow-wrap: anywhere; }
.route-head strong { font-variant-numeric: tabular-nums; white-space: nowrap; }
.kv { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin: 8px 0 0; }
.kv div { min-width: 0; }
.kv dt { color: var(--muted); font-size: 11px; }
.kv dd { margin: 0; font-variant-numeric: tabular-nums; font-size: 14px; font-weight: 600; }

.feed { list-style: none; margin: 0; padding: 0; }
.feed-day { color: var(--muted); font-size: 12px; font-weight: 600; padding: 12px 0 4px; }
.feed-day:first-child { padding-top: 0; }
.feed-item { padding: 9px 0; border-bottom: 1px solid var(--grid); }
.feed-item:last-child { border-bottom: 0; }
.feed-main { display: flex; gap: 8px; justify-content: space-between; align-items: baseline; }
.feed-main strong { font-weight: 600; font-size: 14px; }
.feed-main time { color: var(--muted); font-size: 12px; font-variant-numeric: tabular-nums; white-space: nowrap; }
.feed-detail { color: var(--ink-2); font-size: 13px; overflow-wrap: anywhere; }
.feed-meta { color: var(--muted); font-size: 11px; margin-top: 2px; }

details { margin-top: 10px; font-size: 12px; color: var(--ink-2); }
details summary { cursor: pointer; min-height: 32px; display: flex; align-items: center; }
table { width: 100%; border-collapse: collapse; font-size: 13px; }
th { text-align: left; color: var(--ink-2); font-weight: 500; font-size: 12px; padding: 6px 4px; border-bottom: 1px solid var(--grid); }
td { padding: 6px 4px; border-bottom: 1px solid var(--grid); font-variant-numeric: tabular-nums; }
td.r, th.r { text-align: right; }

.tabbar {
  position: fixed; left: 0; right: 0; bottom: 0; z-index: 6;
  display: grid; grid-template-columns: repeat(4, 1fr);
  background: var(--surface); border-top: 1px solid var(--ring);
  padding: 0 env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);
}
.tabbar button {
  min-height: 58px; border: 0; background: transparent; color: var(--muted); cursor: pointer;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px;
  font-size: 11px; font-weight: 500;
}
.tabbar button:active { background: var(--tap); }
.tabbar button[aria-selected="true"] { color: var(--ink); font-weight: 650; }
.tabbar svg { width: 22px; height: 22px; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }

.tooltip {
  position: fixed; pointer-events: none; z-index: 10; background: var(--surface); color: var(--ink);
  border: 1px solid var(--ring); border-radius: 10px; padding: 8px 10px; font-size: 12px;
  box-shadow: 0 6px 20px rgba(0,0,0,0.16); opacity: 0; transition: opacity 80ms; min-width: 120px;
}
.tooltip .tt-title { color: var(--ink-2); margin-bottom: 4px; }
.tooltip .tt-row { display: flex; align-items: center; gap: 8px; }
.tooltip .tt-row strong { font-variant-numeric: tabular-nums; }
.tooltip .tt-row span:last-child { color: var(--ink-2); }
.error { color: var(--bad-text); background: var(--surface); border: 1px solid var(--ring); border-radius: 12px; padding: 10px 14px; margin-bottom: 12px; font-size: 13px; }

/* ---------- enhancement: wide screens show every section ---------- */
@media (min-width: 600px) {
  .tiles { grid-template-columns: repeat(4, 1fr); }
  .tiles.two { grid-template-columns: repeat(2, 1fr); }
}
@media (min-width: 900px) {
  main { padding-bottom: 48px; }
  .tabbar { display: none; }
  .panel, .panel.active { display: block; }
  .panel + .panel { margin-top: 28px; }
  .panel-title { display: block; font-size: 13px; font-weight: 600; color: var(--ink-2); text-transform: uppercase; letter-spacing: 0.04em; margin: 0 0 10px; }
  .topbar { display: flex; align-items: center; justify-content: space-between; gap: 24px; margin-bottom: 20px; }
  .topbar-row { margin: 0; flex: 1; }
  .ranges { width: 300px; }
  h1 { font-size: 20px; }
  .stack { grid-template-columns: repeat(12, 1fr); }
  .stack > * { grid-column: span 12; }
  .stack > .w8 { grid-column: span 8; }
  .stack > .w6 { grid-column: span 6; }
  .stack > .w4 { grid-column: span 4; }
  .card { padding: 16px; }
}
</style>
</head>
<body>
<main>
  <div class="topbar">
    <div class="topbar-row">
      <div>
        <h1>Bus Assistant analytics</h1>
        <div class="sub">Tailnet only${userName ? ` · ${escapeHtml(userName)}` : ""}</div>
      </div>
      <button type="button" class="refresh" id="refresh" aria-label="Refresh now"><span id="updated">Loading…</span></button>
    </div>
    <div class="ranges" role="group" aria-label="Date range">
      <button type="button" data-days="7" aria-pressed="true">7 days</button>
      <button type="button" data-days="30" aria-pressed="false">30 days</button>
      <button type="button" data-days="90" aria-pressed="false">90 days</button>
    </div>
  </div>

  <div id="error" class="error" role="alert" hidden></div>

  <section class="panel" id="panel-usage" data-tab="usage" aria-labelledby="tab-usage">
    <h2 class="panel-title">Usage</h2>
    <div class="stack">
      <div class="tiles" id="tiles-usage"></div>
      <div class="card w8">
        <h3>Daily visitors</h3>
        <p class="desc">Unique anonymous browsers and sessions per day (SGT)</p>
        <div class="legend">
          <span><i class="key-line" style="background:var(--s1)"></i>Visitors</span>
          <span><i class="key-line" style="background:var(--s2)"></i>Sessions</span>
        </div>
        <div class="chart" id="chart-daily"></div>
        <div class="hint">Drag across the chart to see each day</div>
        <details><summary>Show as table</summary><div id="table-daily"></div></details>
      </div>
      <div class="card w4">
        <h3>Events</h3>
        <p class="desc">Everything tracked in the period</p>
        <div id="events"></div>
      </div>
      <div class="card">
        <h3>When people check buses</h3>
        <p class="desc">Stop lookups by hour of day (SGT)</p>
        <div class="chart" id="chart-hourly"></div>
      </div>
    </div>
  </section>

  <section class="panel" id="panel-stops" data-tab="stops" aria-labelledby="tab-stops">
    <h2 class="panel-title">Stops &amp; routes</h2>
    <div class="stack">
      <div class="card w6">
        <h3>Top bus stops</h3>
        <p class="desc">Most viewed stops in the period</p>
        <div id="top-stops"></div>
      </div>
      <div class="card w6">
        <h3>How stops are opened</h3>
        <p class="desc">Source of each bus stop lookup</p>
        <div id="sources"></div>
      </div>
      <div class="card w6">
        <h3>Top service routes</h3>
        <p class="desc">Service route pages opened</p>
        <div id="top-services"></div>
      </div>
    </div>
  </section>

  <section class="panel" id="panel-api" data-tab="api" aria-labelledby="tab-api">
    <h2 class="panel-title">API health</h2>
    <div class="stack">
      <div class="tiles two" id="tiles-api"></div>
      <div class="card w8">
        <h3>API responses per day</h3>
        <p class="desc">5xx usually means LTA DataMall was unavailable</p>
        <div class="legend">
          <span><i class="key-box" style="background:var(--ok)"></i>Success</span>
          <span><i class="key-box" style="background:var(--warning)"></i>⚠ 4xx</span>
          <span><i class="key-box" style="background:var(--critical)"></i>✕ 5xx</span>
        </div>
        <div class="chart" id="chart-api"></div>
      </div>
      <div class="card w4">
        <h3>Endpoints</h3>
        <p class="desc">Latency measured inside the API</p>
        <div id="routes"></div>
      </div>
    </div>
  </section>

  <section class="panel" id="panel-live" data-tab="live" aria-labelledby="tab-live">
    <h2 class="panel-title">Live</h2>
    <div class="stack">
      <div class="card">
        <h3>Recent activity</h3>
        <p class="desc">Latest 25 events · visitor = first 6 chars of the anonymous ID</p>
        <div id="recent"></div>
      </div>
    </div>
  </section>
</main>

<nav class="tabbar" role="tablist" aria-label="Sections">
  <button type="button" role="tab" id="tab-usage" data-tab="usage" aria-controls="panel-usage">
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4v16h16"/><path d="M8 15l3.5-4 3 3L19 8"/></svg>Usage
  </button>
  <button type="button" role="tab" id="tab-stops" data-tab="stops" aria-controls="panel-stops">
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>Stops
  </button>
  <button type="button" role="tab" id="tab-api" data-tab="api" aria-controls="panel-api">
    <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="4" width="17" height="7" rx="2"/><rect x="3.5" y="13" width="17" height="7" rx="2"/><path d="M7.5 7.5h.01M7.5 16.5h.01"/></svg>API
  </button>
  <button type="button" role="tab" id="tab-live" data-tab="live" aria-controls="panel-live">
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12h4l3-8 4 16 3-8h4"/></svg>Live
  </button>
</nav>
<div class="tooltip" id="tooltip" role="status" aria-live="polite"></div>

<script>
(() => {
  "use strict";
  const NS = "http://www.w3.org/2000/svg";
  const TABS = ["usage", "stops", "api", "live"];
  const nf = new Intl.NumberFormat("en-SG");
  const cf = new Intl.NumberFormat("en-SG", { notation: "compact", maximumFractionDigits: 1 });
  const pct = (v) => v == null ? "—" : (v * 100).toFixed(v < 0.1 && v > 0 ? 1 : 0) + "%";
  const num = (v) => v >= 10000 ? cf.format(v) : nf.format(v);
  const ms = (v) => v >= 1000 ? (v / 1000).toFixed(1) + " s" : Math.round(v) + " ms";
  const dayLabel = (key) => {
    const [y, m, d] = key.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-SG", { day: "numeric", month: "short", timeZone: "UTC" });
  };
  const EVENT_LABELS = {
    session_start: "Session started", page_view: "Page view", stop_viewed: "Bus stop viewed",
    service_route_viewed: "Service route viewed", favorite_added: "Favorite added",
    favorite_removed: "Favorite removed", nearby_opened: "Nearby stops opened",
  };
  const SOURCE_LABELS = { search: "Search", favorite: "Favorites", nearby: "Nearby map", link: "Direct link / reload", unknown: "Unknown" };

  let days = 7;
  let stats = null;
  let recent = null;
  let lastLoaded = null;

  // ---------- DOM helpers (data text always goes through textContent) ----------
  const h = (tag, attrs, ...children) => {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (k === "class") el.className = v; else if (k === "style") el.style.cssText = v; else el.setAttribute(k, v);
    }
    for (const c of children) if (c != null) el.append(c instanceof Node ? c : String(c));
    return el;
  };
  const s = (tag, attrs, parent) => {
    const el = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs || {})) el.setAttribute(k, v);
    if (parent) parent.appendChild(el);
    return el;
  };
  const mount = (id, node) => document.getElementById(id).replaceChildren(node);
  const empty = (text = "No data yet for this period") => h("div", { class: "empty" }, text);
  const cssVar = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

  // ---------- tooltip (mouse: follows hover; touch: stays until tapping elsewhere) ----------
  const tip = document.getElementById("tooltip");
  let tipOwner = null;
  const showTip = (owner, x, y, title, rows) => {
    tipOwner = owner;
    tip.replaceChildren(h("div", { class: "tt-title" }, title));
    for (const r of rows) {
      const key = r.color ? h("i", { class: r.box ? "key-box" : "key-line", style: "background:" + r.color }) : null;
      tip.append(h("div", { class: "tt-row" }, key, h("strong", {}, r.value), h("span", {}, r.label)));
    }
    tip.style.opacity = "1";
    const w = tip.offsetWidth, hgt = tip.offsetHeight;
    tip.style.left = Math.max(8, Math.min(window.innerWidth - w - 8, x - w / 2)) + "px";
    // Above the finger/cursor so a thumb never covers it.
    tip.style.top = Math.max(8, y - hgt - 24) + "px";
  };
  const hideTip = () => { tip.style.opacity = "0"; tipOwner && tipOwner.onHide && tipOwner.onHide(); tipOwner = null; };
  document.addEventListener("pointerdown", (e) => { if (tipOwner && !tipOwner.el.contains(e.target)) hideTip(); });
  window.addEventListener("scroll", () => { if (tipOwner) hideTip(); }, { passive: true });

  // ---------- scales ----------
  const niceMax = (max, ticks = 4) => {
    if (max <= 0) return { max: ticks, step: 1 };
    const raw = max / ticks;
    const mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const step = Math.max(1, [1, 2, 5, 10].map((m) => m * mag).find((st) => st >= raw));
    return { max: Math.ceil(max / step) * step, step };
  };
  const drawYAxis = (svg, m, w, innerH, scale) => {
    for (let v = 0; v <= scale.max; v += scale.step) {
      const y = m.t + innerH - (v / scale.max) * innerH;
      s("line", { x1: m.l, x2: w - m.r, y1: y, y2: y, stroke: v === 0 ? "var(--axis)" : "var(--grid)", "stroke-width": 1 }, svg);
      s("text", { x: m.l - 6, y: y + 4, "text-anchor": "end", class: "axis-text" }, svg).textContent = num(v);
    }
  };
  /** Every n-th label so ticks never collide: ~1 label per minGap px. */
  const tickStep = (count, innerW, minGap) => Math.max(1, Math.ceil(count / Math.max(2, Math.floor(innerW / minGap))));
  const colPath = (x, y, w, hgt) => {
    if (hgt <= 0) return "";
    const r = Math.min(4, w / 2, hgt);
    return "M" + x + "," + (y + hgt) + "V" + (y + r) + "Q" + x + "," + y + " " + (x + r) + "," + y +
      "H" + (x + w - r) + "Q" + (x + w) + "," + y + " " + (x + w) + "," + (y + r) + "V" + (y + hgt) + "Z";
  };

  // ---------- line chart ----------
  const lineChart = (id, labels, series) => {
    const host = document.getElementById(id);
    const w = host.clientWidth;
    if (!w) return; // hidden tab; rendered when shown
    if (series.every((sr) => sr.values.every((v) => v === 0))) return host.replaceChildren(empty());
    const wide = w >= 520;
    const H = wide ? 230 : 190;
    const m = { t: 12, r: wide ? 84 : 10, b: 24, l: 34 };
    const innerW = w - m.l - m.r, innerH = H - m.t - m.b;
    const scale = niceMax(Math.max(...series.flatMap((sr) => sr.values)));
    const n = labels.length;
    const x = (i) => m.l + (n === 1 ? innerW / 2 : (i / (n - 1)) * innerW);
    const y = (v) => m.t + innerH - (v / scale.max) * innerH;
    const svg = s("svg", { width: w, height: H, role: "img", "aria-label": "Daily visitors and sessions line chart" });
    drawYAxis(svg, m, w, innerH, scale);

    // Always label first and last day; fill between without collisions.
    const step = tickStep(n, innerW, wide ? 72 : 64);
    labels.forEach((l, i) => {
      const isEdge = i === 0 || i === n - 1;
      if (!isEdge && (i % step !== 0 || n - 1 - i < step * 0.6)) return;
      const anchor = i === 0 ? "start" : i === n - 1 ? "end" : "middle";
      s("text", { x: x(i), y: H - 5, "text-anchor": anchor, class: "axis-text" }, svg).textContent = dayLabel(l);
    });

    const first = series[0];
    s("path", { d: "M" + x(0) + "," + y(0) + first.values.map((v, i) => "L" + x(i) + "," + y(v)).join("") + "L" + x(n - 1) + "," + y(0) + "Z", fill: first.color, "fill-opacity": 0.1 }, svg);

    const ends = [];
    for (const sr of series) {
      s("path", { d: sr.values.map((v, i) => (i ? "L" : "M") + x(i) + "," + y(v)).join(""), fill: "none", stroke: sr.color, "stroke-width": 2, "stroke-linejoin": "round", "stroke-linecap": "round" }, svg);
      s("circle", { cx: x(n - 1), cy: y(sr.values[n - 1]), r: 4, fill: sr.color, stroke: "var(--surface)", "stroke-width": 2 }, svg);
      ends.push({ y: y(sr.values[n - 1]), text: sr.name + " " + num(sr.values[n - 1]) });
    }
    // Direct end labels only when there's room and they don't collide; legend + tooltip otherwise.
    if (wide && (ends.length < 2 || Math.abs(ends[0].y - ends[1].y) >= 16)) {
      for (const e of ends) s("text", { x: x(n - 1) + 10, y: e.y + 4, class: "end-label" }, svg).textContent = e.text;
    }

    const cross = s("line", { y1: m.t, y2: m.t + innerH, stroke: "var(--axis)", "stroke-width": 1, opacity: 0 }, svg);
    const dots = series.map((sr) => s("circle", { r: 5, fill: sr.color, stroke: "var(--surface)", "stroke-width": 2, opacity: 0 }, svg));
    // Hit area extends past the plot so edge days are easy to reach with a thumb.
    const hit = s("rect", { x: 0, y: 0, width: w, height: H, fill: "transparent", tabindex: 0, class: "hit" }, svg);
    const owner = { el: svg, onHide: () => { cross.setAttribute("opacity", 0); dots.forEach((d) => d.setAttribute("opacity", 0)); } };
    let focusIdx = n - 1;
    const showAt = (i, cx, cy) => {
      cross.setAttribute("x1", x(i)); cross.setAttribute("x2", x(i)); cross.setAttribute("opacity", 1);
      dots.forEach((d, si) => { d.setAttribute("cx", x(i)); d.setAttribute("cy", y(series[si].values[i])); d.setAttribute("opacity", 1); });
      showTip(owner, cx, cy, dayLabel(labels[i]), series.map((sr) => ({ color: sr.color, value: num(sr.values[i]), label: sr.name })));
    };
    const fromEvent = (e) => {
      const r = svg.getBoundingClientRect();
      const i = Math.max(0, Math.min(n - 1, Math.round(((e.clientX - r.left - m.l) / innerW) * (n - 1))));
      showAt(i, r.left + x(i), r.top + m.t);
    };
    hit.addEventListener("pointerdown", fromEvent);
    hit.addEventListener("pointermove", fromEvent);
    hit.addEventListener("pointerleave", (e) => { if (e.pointerType === "mouse") hideTip(); });
    hit.addEventListener("blur", hideTip);
    hit.addEventListener("keydown", (e) => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      focusIdx = Math.max(0, Math.min(n - 1, focusIdx + (e.key === "ArrowRight" ? 1 : -1)));
      const r = svg.getBoundingClientRect();
      showAt(focusIdx, r.left + x(focusIdx), r.top + m.t);
      e.preventDefault();
    });
    host.replaceChildren(svg);
  };

  // ---------- column chart (single series or stacked) ----------
  const columnChart = (id, labels, stacks, opts) => {
    const host = document.getElementById(id);
    const w = host.clientWidth;
    if (!w) return;
    const totals = labels.map((_, i) => stacks.reduce((sum, st) => sum + st.values[i], 0));
    if (totals.every((t) => t === 0)) return host.replaceChildren(empty());
    const H = w >= 520 ? 220 : 180;
    const m = { t: 18, r: 4, b: 24, l: 34 };
    const innerW = w - m.l - m.r, innerH = H - m.t - m.b;
    const scale = niceMax(Math.max(...totals));
    const band = innerW / labels.length;
    // Leave >= 2px surface gap between neighbours; cap at 24px.
    const colW = Math.max(1, Math.min(24, band - 2));
    const svg = s("svg", { width: w, height: H, role: "img", "aria-label": opts.ariaLabel });
    drawYAxis(svg, m, w, innerH, scale);
    const maxIdx = totals.indexOf(Math.max(...totals));
    const step = opts.tickEvery || tickStep(labels.length, innerW, opts.minTickGap || 56);
    const owner = { el: svg, onHide: () => {} };

    labels.forEach((label, i) => {
      const cx = m.l + band * i + band / 2;
      let base = m.t + innerH;
      const visible = stacks.filter((st) => st.values[i] > 0);
      visible.forEach((st, si) => {
        const gap = si > 0 ? 2 : 0;
        const segH = Math.max(0, (st.values[i] / scale.max) * innerH - gap);
        const yTop = base - gap - segH;
        if (si === visible.length - 1) s("path", { d: colPath(cx - colW / 2, yTop, colW, segH), fill: st.color }, svg);
        else s("rect", { x: cx - colW / 2, y: yTop, width: colW, height: segH, fill: st.color }, svg);
        base = yTop;
      });
      if (opts.labelMax && i === maxIdx) {
        s("text", { x: cx, y: base - 5, "text-anchor": "middle", class: "end-label" }, svg).textContent = num(totals[i]);
      }
      if (i % step === 0) {
        s("text", { x: cx, y: H - 5, "text-anchor": "middle", class: "axis-text" }, svg).textContent = opts.tickLabel(label, i);
      }
    });

    const hit = s("rect", { x: m.l, y: 0, width: innerW, height: H, fill: "transparent", tabindex: 0, class: "hit" }, svg);
    let focusIdx = maxIdx;
    const showAt = (i) => {
      const r = svg.getBoundingClientRect();
      showTip(owner, r.left + m.l + band * i + band / 2, r.top + m.t, opts.tooltipTitle(labels[i], i),
        stacks.map((st) => ({ color: st.color, box: true, value: num(st.values[i]), label: st.name })));
    };
    const fromEvent = (e) => {
      const r = svg.getBoundingClientRect();
      showAt(Math.max(0, Math.min(labels.length - 1, Math.floor((e.clientX - r.left - m.l) / band))));
    };
    hit.addEventListener("pointerdown", fromEvent);
    hit.addEventListener("pointermove", fromEvent);
    hit.addEventListener("pointerleave", (e) => { if (e.pointerType === "mouse") hideTip(); });
    hit.addEventListener("blur", hideTip);
    hit.addEventListener("keydown", (e) => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      focusIdx = Math.max(0, Math.min(labels.length - 1, focusIdx + (e.key === "ArrowRight" ? 1 : -1)));
      showAt(focusIdx);
      e.preventDefault();
    });
    host.replaceChildren(svg);
  };

  // ---------- bar list ----------
  const barList = (id, rows) => {
    if (rows.length === 0) return mount(id, empty());
    const max = Math.max(...rows.map((r) => r.value));
    const wrap = h("div", { class: "bars" });
    for (const r of rows) {
      wrap.append(
        h("div", { class: "name" }, h("span", { class: "t", title: r.label }, r.label), r.meta ? h("span", { class: "m" }, r.meta) : null),
        h("div", { class: "num" }, num(r.value)),
        h("div", { class: "track" }, h("div", { class: "fill", style: "width:" + (max ? (r.value / max) * 100 : 0) + "%" })),
      );
    }
    mount(id, wrap);
  };

  // ---------- tiles ----------
  const tile = (label, value, current, previous, opts = {}) => {
    let delta = null;
    if (opts.showDelta !== false && previous != null && current != null) {
      if (previous === 0) delta = h("div", { class: "delta" }, current > 0 ? "New this period" : "No change");
      else {
        const change = (current - previous) / previous;
        const up = change > 0;
        const good = opts.upIsGood === false ? !up : up;
        const cls = change === 0 ? "" : (up ? "up-" : "down-") + (good ? "good" : "bad");
        delta = h("div", { class: "delta" },
          h("span", { class: cls }, (up ? "▲ " : change < 0 ? "▼ " : "") + Math.abs(change * 100).toFixed(0) + "%"),
          " vs prev " + days + "d");
      }
    } else if (opts.note) {
      delta = h("div", { class: "delta" }, opts.note);
    }
    return h("div", { class: "tile" }, h("div", { class: "label" }, label), h("div", { class: "value" }, value), delta);
  };

  // ---------- render ----------
  const renderStats = () => {
    if (!stats) return;
    const T = stats.totals, P = stats.previousTotals;
    document.getElementById("tiles-usage").replaceChildren(
      tile("Visitors", num(T.visitors), T.visitors, P.visitors),
      tile("Sessions", num(T.sessions), T.sessions, P.sessions),
      tile("Stop lookups", num(T.stopViews), T.stopViews, P.stopViews),
      tile("Installed app", pct(T.standaloneShare), null, null, { showDelta: false, note: "of sessions" }),
    );
    const errRate = T.apiRequests ? T.apiServerErrors / T.apiRequests : null;
    const prevErrRate = P.apiRequests ? P.apiServerErrors / P.apiRequests : null;
    document.getElementById("tiles-api").replaceChildren(
      tile("API requests", num(T.apiRequests), T.apiRequests, P.apiRequests),
      tile("5xx error rate", pct(errRate), errRate, prevErrRate, { upIsGood: false }),
    );

    const s1 = cssVar("--s1"), s2 = cssVar("--s2");
    const labels = stats.daily.map((d) => d.day);
    lineChart("chart-daily", labels, [
      { name: "Visitors", color: s1, values: stats.daily.map((d) => d.visitors) },
      { name: "Sessions", color: s2, values: stats.daily.map((d) => d.sessions) },
    ]);
    const t = h("table");
    t.append(h("thead", {}, h("tr", {}, h("th", {}, "Day"), h("th", { class: "r" }, "Visitors"), h("th", { class: "r" }, "Sessions"), h("th", { class: "r" }, "Lookups"))));
    const tb = h("tbody");
    for (const d of stats.daily.slice().reverse()) {
      tb.append(h("tr", {}, h("td", {}, dayLabel(d.day)), h("td", { class: "r" }, num(d.visitors)), h("td", { class: "r" }, num(d.sessions)), h("td", { class: "r" }, num(d.stopViews))));
    }
    t.append(tb);
    mount("table-daily", t);

    columnChart("chart-hourly", stats.hourly.map((x) => x.hour), [{ name: "Stop lookups", color: s1, values: stats.hourly.map((x) => x.stopViews) }], {
      ariaLabel: "Stop lookups by hour of day",
      labelMax: true,
      tickEvery: 3,
      tickLabel: (hr) => String(hr).padStart(2, "0"),
      tooltipTitle: (hr) => String(hr).padStart(2, "0") + ":00–" + String(hr).padStart(2, "0") + ":59",
    });

    columnChart("chart-api", labels, [
      { name: "Success", color: cssVar("--ok"), values: stats.api.daily.map((d) => d.ok) },
      { name: "4xx", color: cssVar("--warning"), values: stats.api.daily.map((d) => d.clientError) },
      { name: "5xx", color: cssVar("--critical"), values: stats.api.daily.map((d) => d.serverError) },
    ], {
      ariaLabel: "API responses per day by outcome",
      minTickGap: 60,
      tickLabel: (d) => dayLabel(d),
      tooltipTitle: (d) => dayLabel(d),
    });

    barList("events", stats.events.map((r) => ({ label: EVENT_LABELS[r.name] || r.name, value: r.count })));
    barList("top-stops", stats.topStops.map((r) => ({
      label: r.description || "Unknown stop",
      meta: r.stopCode + " · " + num(r.visitors) + (r.visitors === 1 ? " visitor" : " visitors"),
      value: r.views,
    })));
    barList("top-services", stats.topServices.map((r) => ({ label: "Service " + r.serviceNo, value: r.views })));
    barList("sources", stats.stopSources.map((r) => ({ label: SOURCE_LABELS[r.source] || r.source, value: r.views })));

    if (stats.api.routes.length === 0) mount("routes", empty());
    else {
      const list = h("div", { class: "routes" });
      for (const r of stats.api.routes) {
        const kv = (k, v) => h("div", {}, h("dt", {}, k), h("dd", {}, v));
        list.append(h("div", { class: "route" },
          h("div", { class: "route-head" }, h("span", { class: "route-name" }, r.route), h("strong", {}, num(r.requests) + " req")),
          h("dl", { class: "kv" }, kv("p50", ms(r.p50)), kv("p95", ms(r.p95)), kv("5xx", pct(r.errorRate)), kv("Cache", pct(r.cacheHitRate))),
        ));
      }
      mount("routes", list);
    }
  };

  const renderRecent = () => {
    if (!recent) return;
    if (recent.length === 0) return mount("recent", empty("No events recorded yet"));
    const dayFmt = (ts) => new Date(ts).toLocaleDateString("en-SG", { timeZone: "Asia/Singapore", weekday: "short", day: "numeric", month: "short" });
    const timeFmt = (ts) => new Date(ts).toLocaleTimeString("en-SG", { timeZone: "Asia/Singapore", hour: "numeric", minute: "2-digit" });
    const list = h("ol", { class: "feed" });
    let currentDay = null;
    for (const r of recent) {
      const day = dayFmt(r.ts);
      if (day !== currentDay) { currentDay = day; list.append(h("li", { class: "feed-day" }, day)); }
      const detail = r.stopCode
        ? (r.stopDescription ? r.stopDescription + " (" + r.stopCode + ")" : r.stopCode)
        : r.serviceNo ? "Service " + r.serviceNo : r.name === "page_view" ? r.path || "" : "";
      const meta = [r.source ? "via " + (SOURCE_LABELS[r.source] || r.source) : null, "visitor " + r.visitor, r.standalone ? "installed app" : "browser"].filter(Boolean).join(" · ");
      list.append(h("li", { class: "feed-item" },
        h("div", { class: "feed-main" }, h("strong", {}, EVENT_LABELS[r.name] || r.name), h("time", { datetime: new Date(r.ts).toISOString() }, timeFmt(r.ts))),
        detail ? h("div", { class: "feed-detail" }, detail) : null,
        h("div", { class: "feed-meta" }, meta),
      ));
    }
    mount("recent", list);
  };

  const render = () => { renderStats(); renderRecent(); };

  // ---------- tabs (phone) ----------
  const setTab = (name, push) => {
    if (!TABS.includes(name)) name = "usage";
    document.querySelectorAll(".panel").forEach((p) => p.classList.toggle("active", p.dataset.tab === name));
    document.querySelectorAll(".tabbar button").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.tab === name)));
    if (push) history.replaceState(null, "", "#" + name);
    hideTip();
    renderStats(); // charts need a visible container to measure
  };
  document.querySelectorAll(".tabbar button").forEach((b) => b.addEventListener("click", () => { setTab(b.dataset.tab, true); window.scrollTo({ top: 0 }); }));
  window.addEventListener("hashchange", () => setTab(location.hash.slice(1), false));

  // ---------- data ----------
  const updatedEl = document.getElementById("updated");
  const relTime = () => {
    if (!lastLoaded) return;
    const mins = Math.floor((Date.now() - lastLoaded) / 60000);
    updatedEl.textContent = mins < 1 ? "Updated just now" : "Updated " + mins + "m ago";
  };
  const load = async () => {
    const errorEl = document.getElementById("error");
    updatedEl.textContent = "Refreshing…";
    try {
      const [statsRes, recentRes] = await Promise.all([fetch("api/stats?days=" + days), fetch("api/recent")]);
      if (!statsRes.ok || !recentRes.ok) throw new Error("HTTP " + statsRes.status + "/" + recentRes.status);
      stats = await statsRes.json();
      recent = await recentRes.json();
      render();
      errorEl.hidden = true;
      lastLoaded = Date.now();
      relTime();
    } catch (err) {
      errorEl.textContent = "Couldn't load analytics: " + err.message;
      errorEl.hidden = false;
      updatedEl.textContent = "Retry";
    }
  };

  document.querySelectorAll(".ranges button").forEach((btn) => btn.addEventListener("click", () => {
    days = Number(btn.dataset.days);
    document.querySelectorAll(".ranges button").forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));
    load();
  }));
  document.getElementById("refresh").addEventListener("click", load);
  let lastWidth = window.innerWidth, resizeTimer;
  window.addEventListener("resize", () => {
    if (window.innerWidth === lastWidth) return; // ignore mobile URL-bar height changes
    lastWidth = window.innerWidth;
    clearTimeout(resizeTimer); resizeTimer = setTimeout(renderStats, 150);
  });
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", renderStats);
  // Refresh when returning to the tab/app; poll gently while visible.
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && (!lastLoaded || Date.now() - lastLoaded > 30000)) load();
  });
  setInterval(() => { if (document.visibilityState === "visible") load(); }, 60000);
  setInterval(relTime, 30000);

  setTab(location.hash.slice(1), false);
  load();
})();
</script>
</body>
</html>`;
