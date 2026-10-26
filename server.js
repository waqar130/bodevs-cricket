// BoDevs Cricket server: serves the magazine and keeps scores fresh by syncing from Scorecard on a timer.
// Runs locally (node server.js -> http://localhost:8765) or on any Node host that sets PORT.
// Production: Railway (cricket.waqarahmed.net) runs this server; it syncs scores every Monday at 2:00 AM Pakistan time.
// index.html is written as a page body (it also publishes as a Claude artifact), so build.js wraps it in a full document.
const http = require("http");
const zlib = require("zlib");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { page } = require("./build");
const { sync, SOURCE } = require("./sync");

const PORT = Number(process.env.PORT) || 8765;
const ROOT = __dirname;
// Predictions live here. On Railway, mount a volume and point STORAGE_DIR at it so they survive redeploys.
const STORAGE = process.env.STORAGE_DIR || path.join(ROOT, "storage");
const TYPES = { ".html": "text/html; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".json": "application/json; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".webmanifest": "application/manifest+json" };
// Only these are public; source files stay private.
const PUBLIC = [/^\/(tigers|falcons)\.svg$/, /^\/extras\.(js|css)$/, /^\/data\/(cricket|fixtures|seasons)\.json$/, /^\/(sw\.js|manifest\.webmanifest)$/, /^\/assets\/gallery\/gallery\.json$/, /^\/assets\/[\w./-]+\.(png|jpg|webp|svg)$/];

// ---- score sync: once a week, Monday 2:00 AM Pakistan time (after Sunday night's matches)
const SYNC = process.env.SYNC !== "off";
const PK = 5 * 3600e3;                 // Asia/Karachi is UTC+5, no daylight saving
const RETRY = 15 * 60e3, MAX_RETRIES = 4;
let syncing = false, lastSync = null, lastError = null, nextSync = null;

// Most recent Monday 02:00 PKT at or before `d`, as a UTC Date.
function lastSlot(d = new Date()) {
  const pk = new Date(d.getTime() + PK);
  const slot = new Date(Date.UTC(pk.getUTCFullYear(), pk.getUTCMonth(), pk.getUTCDate() - ((pk.getUTCDay() + 6) % 7), 2));
  if (slot > pk) slot.setUTCDate(slot.getUTCDate() - 7);
  return new Date(slot.getTime() - PK);
}
const nextSlot = (d = new Date()) => new Date(lastSlot(d).getTime() + 7 * 864e5);

function schedule(at) {
  nextSync = at;
  setTimeout(() => runSync(0), Math.max(0, at - Date.now()));
  console.log(`next score sync ${at.toISOString()}`);
}
async function runSync(attempt) {
  if (syncing) return;
  syncing = true;
  try {
    const r = await sync({ quiet: true });
    lastSync = new Date(); lastError = null;
    console.log(`score sync done: ${r.matches} matches${r.changed ? ", new scores" : ", no changes"}`);
    schedule(nextSlot());
  } catch (e) {
    lastError = e.message;
    console.error(`score sync failed (attempt ${attempt + 1}):`, e.message);
    if (attempt + 1 < MAX_RETRIES) { nextSync = new Date(Date.now() + RETRY); setTimeout(() => runSync(attempt + 1), RETRY); }
    else { schedule(nextSlot()); alertSyncFailed(e.message); }
  } finally { syncing = false; }
}
// After the last retry fails: post to ALERT_URL if one is set (an ntfy.sh topic, a Discord or Slack webhook, or any URL that takes a POST).
// The site also shows a "running late" notice by itself once Monday morning passes without new scores.
async function alertSyncFailed(msg) {
  const url = process.env.ALERT_URL; if (!url) return;
  const text = `BoDevs Cricket: the Monday score sync failed after ${MAX_RETRIES} tries (${msg}). The site is showing last week's scores. It will try again next Monday, or redeploy to retry now.`;
  const body = /discord(app)?\.com\/api\/webhooks/.test(url) ? JSON.stringify({ content: text }) : /hooks\.slack\.com/.test(url) ? JSON.stringify({ text }) : text;
  try { await fetch(url, { method: "POST", headers: { "Content-Type": body === text ? "text/plain" : "application/json", Title: "Score sync failed" }, body }); }
  catch (e) { console.error("sync alert failed:", e.message); }
}
// On start (e.g. after a redeploy), catch up if this week's Monday sync hasn't been applied yet.
function startSync() {
  let synced = 0;
  try { synced = Date.parse(JSON.parse(fs.readFileSync(path.join(ROOT, "data", "cricket.json"), "utf8")).synced_at) || 0; } catch {}
  if (synced < lastSlot().getTime()) runSync(0);
  else schedule(nextSlot());
}

// ---- data helpers (link previews and predictions read the synced data)
let dataCache = { mtime: 0, data: null };
function data() {
  const file = path.join(ROOT, "data", "cricket.json");
  try {
    const st = fs.statSync(file);
    if (st.mtimeMs !== dataCache.mtime) dataCache = { mtime: st.mtimeMs, data: JSON.parse(fs.readFileSync(file, "utf8")) };
  } catch { return { players: [], matches: [] }; }
  return dataCache.data;
}
const slugify = t => String(t).toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const short = name => /tiger/i.test(name) ? "Tigers" : /falcon/i.test(name) ? "Falcons" : String(name).split(" ").pop();
const origin = req => `${String(req.headers["x-forwarded-proto"] || "http").split(",")[0]}://${req.headers.host}`;

// Link previews: /p/<player-slug> and /m/<match-id> serve the app with that page's title, text and image.
function previewFor(url, req) {
  const site = origin(req), d = data();
  let m;
  if ((m = url.match(/^\/p\/([a-z0-9-]+)\/?$/))) {
    const p = d.players.find(x => slugify(x.full_name || x.name) === m[1] || `player-${x.id}` === m[1]);
    if (!p) return null;
    let r = 0, w = 0, s = 0;
    d.matches.forEach(mm => mm.scorecards.forEach(sc => {
      sc.batting.filter(x => x.id === p.id).forEach(x => { r += x.runs; s += x.sixes; });
      sc.bowling.filter(x => x.id === p.id).forEach(x => { w += x.wickets; });
    }));
    return { site, hash: m[1], url: `${site}/p/${m[1]}`, title: `${p.full_name || p.name} · BoDevs Cricket`,
      description: `${p.team}. ${r.toLocaleString()} runs, ${w} wickets, ${s} sixes. Box cricket at SportsX, G-12 Islamabad.`,
      image: p.photo ? `${site}/${p.photo}` : `${site}/assets/logo.png` };
  }
  if ((m = url.match(/^\/m\/(\d+)\/?$/))) {
    const mm = d.matches.find(x => x.match.id === +m[1]);
    if (!mm) return null;
    const sc = mm.scorecards.map(s => `${short(s.batting_team)} ${s.runs}/${s.wickets} (${s.overs})`).join(", ");
    return { site, hash: `match-${m[1]}`, url: `${site}/m/${m[1]}`, title: `${mm.match.result || mm.match.status_label} · BoDevs Cricket`,
      description: `Match #${m[1]}, ${mm.match.format_label}. ${sc}.`, image: `${site}/assets/logo.png` };
  }
  return null;
}

// ---- live view: only when someone has the page open, at most one fetch every 30 seconds
let liveCache = { at: 0, body: null };
async function live() {
  if (Date.now() - liveCache.at < 30e3 && liveCache.body) return liveCache.body;
  const html = await (await fetch(SOURCE + "index", { headers: { "User-Agent": "BoDevsCricketLive/1.0" } })).text();
  const cards = [...html.matchAll(/match\?id=(\d+)">\s*<div class="card__top">[\s\S]*?badge--([\w-]+)">([^<]*)</g)]
    .map(x => ({ id: +x[1], status: x[2], label: x[3].trim() })).filter(c => c.status !== "completed");
  const matches = [];
  for (const c of cards.slice(0, 3)) {
    let state = null;
    if (!/upcoming|scheduled|not_started/.test(c.status)) {
      try {
        const s = await (await fetch(`${SOURCE}api/state.php?match_id=${c.id}`)).json();
        state = { match: s.match, scorecards: (s.scorecards || []).map(sc => ({ label: sc.label, batting_team: sc.batting_team, runs: sc.runs, wickets: sc.wickets, overs: sc.overs, crr: sc.crr, target: sc.target, need: sc.need, balls_left: sc.balls_left, batting: sc.batting.map(b => ({ name: b.name, runs: b.runs, balls: b.balls, out: !!b.out, at_crease: b.at_crease, on_strike: b.on_strike })), bowling: sc.bowling.map(b => ({ name: b.name, overs: b.overs, runs: b.runs, wickets: b.wickets, current: b.current })) })) };
      } catch { /* show the card without detail */ }
    }
    matches.push({ ...c, state });
  }
  liveCache = { at: Date.now(), body: JSON.stringify({ checked_at: new Date().toISOString(), matches }) };
  return liveCache.body;
}

// ---- predictions: who wins the week, and who's MVP. Open until Sunday 10 PM Pakistan time.
const PRED_FILE = path.join(STORAGE, "predictions.json");
const readPreds = () => { try { return JSON.parse(fs.readFileSync(PRED_FILE, "utf8")); } catch { return { weeks: {} }; } };
function openWeek(d = new Date()) {
  const pk = new Date(d.getTime() + PK);
  // next Sunday 22:00 PKT at or after now
  const sun = new Date(Date.UTC(pk.getUTCFullYear(), pk.getUTCMonth(), pk.getUTCDate() + ((7 - pk.getUTCDay()) % 7), 22));
  if (sun <= pk) sun.setUTCDate(sun.getUTCDate() + 7);
  const tue = new Date(sun); tue.setUTCDate(tue.getUTCDate() - 5);   // match weeks run Tuesday to Monday
  return { week: tue.toISOString().slice(0, 10), deadline: new Date(sun.getTime() - PK).toISOString() };
}
function savePrediction(body) {
  const d = data(), ids = new Set(d.players.map(p => p.id));
  const player = +body.player, mvp = +body.mvp, winner = String(body.winner || "");
  if (!ids.has(player)) throw new Error("Pick your name from the list.");
  if (!["t", "f", "draw"].includes(winner)) throw new Error("Pick Tigers, Falcons or a draw.");
  if (!ids.has(mvp)) throw new Error("Pick an MVP from the list.");
  const ow = openWeek(), all = readPreds();
  (all.weeks[ow.week] = all.weeks[ow.week] || {})[player] = { winner, mvp, at: new Date().toISOString() };
  fs.mkdirSync(STORAGE, { recursive: true });
  fs.writeFileSync(PRED_FILE + ".tmp", JSON.stringify(all));
  fs.renameSync(PRED_FILE + ".tmp", PRED_FILE);
  return { ok: true, week: ow.week };
}

// ---- visitor counts: totals only. No cookies and no IP addresses are kept: a visitor is counted once a day
// through a one-way hash of (a salt that changes daily + IP + browser), and yesterday's hashes are thrown away.
const VISITS_FILE = path.join(STORAGE, "visits.json");
const VIEW_KINDS = new Set(["home", "players", "compare", "stats", "season", "club", "live", "player", "match"]);
const EVENTS = new Set(["install_shown", "install_click", "installed", "app_open"]);
let visits = (() => { try { return JSON.parse(fs.readFileSync(VISITS_FILE, "utf8")); } catch { return { days: {} }; } })(), visitsDirty = false;
let salt = { day: "", key: "" }, seenToday = new Set();
const pkDay = () => new Date(Date.now() + PK).toISOString().slice(0, 10);
function countHit(req, body) {
  const day = pkDay();
  if (salt.day !== day) { salt = { day, key: crypto.randomBytes(16).toString("hex") }; seenToday = new Set(); }
  const d = visits.days[day] = visits.days[day] || { views: {}, visitors: 0, events: {} };
  const ip = String(req.headers["x-forwarded-for"] || req.socket.remoteAddress || "").split(",")[0].trim();
  const who = crypto.createHash("sha256").update(salt.key + ip + (req.headers["user-agent"] || "")).digest("base64url").slice(0, 16);
  if (!seenToday.has(who)) { seenToday.add(who); d.visitors++; }
  if (VIEW_KINDS.has(body.p)) d.views[body.p] = (d.views[body.p] || 0) + 1;
  if (EVENTS.has(body.e)) d.events[body.e] = (d.events[body.e] || 0) + 1;
  visitsDirty = true;
}
setInterval(() => {
  if (!visitsDirty) return; visitsDirty = false;
  try { fs.mkdirSync(STORAGE, { recursive: true }); fs.writeFileSync(VISITS_FILE + ".tmp", JSON.stringify(visits)); fs.renameSync(VISITS_FILE + ".tmp", VISITS_FILE); }
  catch (e) { console.error("visits save failed:", e.message); }
}, 30e3).unref();
function visitsPage() {
  const days = Object.keys(visits.days).sort().reverse().slice(0, 60), sum = (f, ds = days) => ds.reduce((a, k) => a + f(visits.days[k]), 0);
  const kinds = [...VIEW_KINDS], last7 = days.slice(0, 7), last30 = days.slice(0, 30);
  const views = d => Object.values(d.views).reduce((a, b) => a + b, 0), ev = k => d => d.events[k] || 0;
  const row = k => { const d = visits.days[k]; return `<tr><td>${k}</td><td><b>${d.visitors}</b></td><td>${views(d)}</td>${kinds.map(x => `<td>${d.views[x] || ""}</td>`).join("")}<td>${d.events.install_click || ""}</td><td>${d.events.installed || ""}</td><td>${d.events.app_open || ""}</td></tr>`; };
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Visitors · BoDevs Cricket</title>
<style>:root{--ink:#141413;--paper:#f5f5f1;--rule:#d9d6cc;--muted:#6b6862;--red:#d42a1f}@media(prefers-color-scheme:dark){:root{--ink:#f3efe6;--paper:#141413;--rule:#3a3935;--muted:#a9a49a}}
body{margin:0;background:var(--paper);color:var(--ink);font:15px/1.5 system-ui,sans-serif;padding:24px 16px}main{max-width:1100px;margin:0 auto}h1{font-size:40px;line-height:1;margin:0 0 6px;text-transform:uppercase;letter-spacing:-.01em}p{color:var(--muted);margin:0 0 20px}
.k{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin:0 0 24px}.k div{border-top:4px solid var(--ink);padding-top:8px}.k b{display:block;font-size:34px;line-height:1.1}.k span{font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:var(--muted)}
.t{overflow-x:auto}table{border-collapse:collapse;width:100%;font-variant-numeric:tabular-nums}th,td{padding:6px 8px;border-bottom:1px solid var(--rule);text-align:right;white-space:nowrap}th:first-child,td:first-child{text-align:left}th{font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted)}</style></head>
<body><main><h1>Visitors</h1><p>Totals only: no cookies, no IP addresses. Days are Pakistan time. <a href="/">Back to the site</a></p>
<div class="k"><div><b>${sum(d => d.visitors, last7)}</b><span>visitors, last 7 days</span></div><div><b>${sum(views, last7)}</b><span>page views, last 7 days</span></div><div><b>${sum(d => d.visitors, last30)}</b><span>visitors, last 30 days</span></div>
<div><b>${sum(ev("installed"))}</b><span>app installs</span></div><div><b>${sum(ev("app_open"), last7)}</b><span>opened from the app, 7 days</span></div></div>
<div class="t"><table><thead><tr><th>Day</th><th>Visitors</th><th>Views</th>${kinds.map(x => `<th>${x}</th>`).join("")}<th>Install taps</th><th>Installs</th><th>App opens</th></tr></thead><tbody>${days.map(row).join("") || `<tr><td colspan="${kinds.length + 6}">No visits counted yet.</td></tr>`}</tbody></table></div></main></body></html>`;
}

// gzip text responses for browsers that accept it (the page, data and scripts shrink to a fraction)
const acceptsGzip = res => /\bgzip\b/.test(res.req?.headers["accept-encoding"] || "");
const COMPRESSIBLE = /^(text\/|application\/json|image\/svg)/;
function send(res, code, type, body, cache = "no-store", extra = {}) {
  const headers = { "Content-Type": type, "Cache-Control": cache, "X-Content-Type-Options": "nosniff", "Vary": "Accept-Encoding", ...extra };
  if (COMPRESSIBLE.test(type) && acceptsGzip(res) && Buffer.byteLength(body) > 1024) { body = zlib.gzipSync(body); headers["Content-Encoding"] = "gzip"; }
  res.writeHead(code, headers);
  res.end(body);
}
const gzCache = new Map(); // file -> { mtime, raw, gz }
const json = (res, code, obj) => send(res, code, "application/json; charset=utf-8", JSON.stringify(obj));

http.createServer((req, res) => {
  let url;
  try { url = decodeURIComponent(new URL(req.url, "http://x").pathname); } catch { return send(res, 400, "text/plain", "Bad request"); }
  if (url === "/" || url === "/index.html") return send(res, 200, TYPES[".html"], page({ site: origin(req) }));
  if (url === "/healthz") {
    const synced_at = data().synced_at || null, stale = !synced_at || Date.parse(synced_at) < lastSlot().getTime();
    return json(res, 200, { ok: !stale, synced_at, stale, lastSync, lastError, nextSync });
  }
  if (url === "/api/hit" && req.method === "POST") {
    let raw = "";
    req.on("data", c => { raw += c; if (raw.length > 300) req.destroy(); });
    req.on("end", () => { try { countHit(req, JSON.parse(raw || "{}")); } catch {} res.writeHead(204); res.end(); });
    return;
  }
  if (url === "/visits") return send(res, 200, TYPES[".html"], visitsPage());
  if (url.startsWith("/p/") || url.startsWith("/m/")) {
    const meta = previewFor(url, req);
    return meta ? send(res, 200, TYPES[".html"], page(meta)) : send(res, 404, "text/plain", "Not found");
  }
  if (url === "/api/live") {
    return live().then(b => send(res, 200, "application/json; charset=utf-8", b)).catch(() => json(res, 502, { error: "The scoring site didn't answer." }));
  }
  if (url === "/api/predictions") {
    if (req.method === "GET") {
      // Picks for the open week stay secret until the deadline; only who has predicted is shown.
      const open = openWeek(), weeks = readPreds().weeks;
      if (weeks[open.week] && new Date() < new Date(open.deadline))
        weeks[open.week] = Object.fromEntries(Object.entries(weeks[open.week]).map(([pid, v]) => [pid, { at: v.at }]));
      return json(res, 200, { open, weeks });
    }
    if (req.method === "POST") {
      let raw = "";
      req.on("data", c => { raw += c; if (raw.length > 2000) req.destroy(); });
      req.on("end", () => {
        try {
          const body = JSON.parse(raw || "{}");
          if (new Date() > new Date(openWeek().deadline)) throw new Error("Predictions for this week are closed.");
          json(res, 200, savePrediction(body));
        } catch (e) { json(res, 400, { error: e.message }); }
      });
      return;
    }
    return json(res, 405, { error: "Method not allowed" });
  }
  if (!PUBLIC.some(r => r.test(url)) || url.includes("..")) return send(res, 404, "text/plain", "Not found");
  const file = path.join(ROOT, url);
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) return send(res, 404, "text/plain", "Not found");
    const type = TYPES[path.extname(file)] || "application/octet-stream";
    const isData = /\.(json|js|css)$/.test(url); // revalidate so updates show straight away
    const lastMod = st.mtime.toUTCString();
    // ETag from the file contents: deploys give every file the same mtime, so dates can't tell versions apart
    let c = gzCache.get(file);
    if (!c || c.mtime !== st.mtimeMs || c.size !== st.size) { const raw = fs.readFileSync(file);
      c = { mtime: st.mtimeMs, size: st.size, raw, etag: `"${crypto.createHash("sha1").update(raw).digest("base64url").slice(0, 16)}"`, gz: COMPRESSIBLE.test(type) ? zlib.gzipSync(raw, { level: 9 }) : null }; gzCache.set(file, c); }
    const headers = { "Content-Type": type, "Cache-Control": isData ? "no-cache" : "public, max-age=86400", "ETag": c.etag, "Last-Modified": lastMod, "X-Content-Type-Options": "nosniff", "Vary": "Accept-Encoding" };
    // unchanged since the browser's copy: answer 304 with no body
    if (req.headers["if-none-match"] === c.etag) { res.writeHead(304, headers); return res.end(); }
    if (c.gz) {
      if (acceptsGzip(res)) { headers["Content-Encoding"] = "gzip"; res.writeHead(200, headers); return res.end(c.gz); }
      res.writeHead(200, headers); return res.end(c.raw);
    }
    res.writeHead(200, headers);
    res.end(c.raw);
  });
}).listen(PORT, "0.0.0.0", () => {
  console.log(`BoDevs Cricket running on port ${PORT}${SYNC ? " (score sync on)" : ""} · storage ${STORAGE}`);
  if (SYNC) startSync();
});
