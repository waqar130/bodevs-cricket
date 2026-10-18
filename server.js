// BoDevs Cricket server: serves the magazine and keeps scores fresh by syncing from Scorecard on a timer.
// Runs locally (node server.js -> http://localhost:8765) or on any Node host that sets PORT.
// Production: Railway (cricket.waqarahmed.net) runs this server; it syncs scores every Monday at 2:00 AM Pakistan time.
// index.html is written as a page body (it also publishes as a Claude artifact), so build.js wraps it in a full document.
const http = require("http");
const fs = require("fs");
const path = require("path");
const { page } = require("./build");
const { sync, SOURCE } = require("./sync");

const PORT = Number(process.env.PORT) || 8765;
const ROOT = __dirname;
// Predictions live here. On Railway, mount a volume and point STORAGE_DIR at it so they survive redeploys.
const STORAGE = process.env.STORAGE_DIR || path.join(ROOT, "storage");
const TYPES = { ".html": "text/html; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".json": "application/json; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8" };
// Only these are public; source files stay private.
const PUBLIC = [/^\/(tigers|falcons)\.svg$/, /^\/extras\.(js|css)$/, /^\/data\/(cricket|fixtures)\.json$/, /^\/assets\/gallery\/gallery\.json$/, /^\/assets\/[\w./-]+\.(png|jpg|webp|svg)$/];

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
    else schedule(nextSlot());
  } finally { syncing = false; }
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

function send(res, code, type, body, cache = "no-store") {
  res.writeHead(code, { "Content-Type": type, "Cache-Control": cache, "X-Content-Type-Options": "nosniff" });
  res.end(body);
}
const json = (res, code, obj) => send(res, code, "application/json; charset=utf-8", JSON.stringify(obj));

http.createServer((req, res) => {
  let url;
  try { url = decodeURIComponent(new URL(req.url, "http://x").pathname); } catch { return send(res, 400, "text/plain", "Bad request"); }
  if (url === "/" || url === "/index.html") return send(res, 200, TYPES[".html"], page({ site: origin(req) }));
  if (url === "/healthz") return json(res, 200, { ok: true, lastSync, lastError, nextSync });
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
    const isData = /\.(json|js|css)$/.test(url); // revalidate so updates show straight away
    res.writeHead(200, {
      "Content-Type": TYPES[path.extname(file)] || "application/octet-stream",
      "Cache-Control": isData ? "no-cache" : "public, max-age=86400",
      "Last-Modified": st.mtime.toUTCString(),
      "X-Content-Type-Options": "nosniff",
    });
    fs.createReadStream(file).pipe(res);
  });
}).listen(PORT, "0.0.0.0", () => {
  console.log(`BoDevs Cricket running on port ${PORT}${SYNC ? " (score sync on)" : ""} · storage ${STORAGE}`);
  if (SYNC) startSync();
});
