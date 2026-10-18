// BoDevs Cricket server: serves the magazine and keeps scores fresh by syncing from Scorecard on a timer.
// Runs locally (node server.js -> http://localhost:8765) or on any Node host that sets PORT.
// Production: Railway (cricket.waqarahmed.net) runs this server; it syncs scores every Monday at 2:00 AM Pakistan time.
// index.html is written as a page body (it also publishes as a Claude artifact), so build.js wraps it in a full document.
const http = require("http");
const fs = require("fs");
const path = require("path");
const { page } = require("./build");
const { sync } = require("./sync");

const PORT = Number(process.env.PORT) || 8765;
const ROOT = __dirname;
const TYPES = { ".html": "text/html; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".json": "application/json; charset=utf-8" };
// Only these are public; source files stay private.
const PUBLIC = [/^\/(tigers|falcons)\.svg$/, /^\/data\/cricket\.json$/, /^\/assets\/[\w./-]+\.(png|jpg|svg)$/];

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

function send(res, code, type, body, cache = "no-store") {
  res.writeHead(code, { "Content-Type": type, "Cache-Control": cache, "X-Content-Type-Options": "nosniff" });
  res.end(body);
}

http.createServer((req, res) => {
  let url;
  try { url = decodeURIComponent(new URL(req.url, "http://x").pathname); } catch { return send(res, 400, "text/plain", "Bad request"); }
  if (url === "/" || url === "/index.html") return send(res, 200, TYPES[".html"], page());
  if (url === "/healthz") return send(res, 200, "application/json", JSON.stringify({ ok: true, lastSync, lastError, nextSync }));
  if (!PUBLIC.some(r => r.test(url)) || url.includes("..")) return send(res, 404, "text/plain", "Not found");
  const file = path.join(ROOT, url);
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) return send(res, 404, "text/plain", "Not found");
    const isData = url.startsWith("/data/");
    res.writeHead(200, {
      "Content-Type": TYPES[path.extname(file)] || "application/octet-stream",
      "Cache-Control": isData ? "no-cache" : "public, max-age=86400",
      "Last-Modified": st.mtime.toUTCString(),
      "X-Content-Type-Options": "nosniff",
    });
    fs.createReadStream(file).pipe(res);
  });
}).listen(PORT, "0.0.0.0", () => {
  console.log(`BoDevs Cricket running on port ${PORT}${SYNC ? " (score sync on)" : ""}`);
  if (SYNC) startSync();
});
