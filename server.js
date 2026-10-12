// BoDevs Cricket server: serves the magazine and keeps scores fresh by syncing from Scorecard on a timer.
// Runs locally (node server.js -> http://localhost:8765) and on Railway (PORT is set by Railway).
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

// ---- score sync: every 2 minutes on match nights (Sun 10 PM - Mon 3 AM Pakistan time), every 30 minutes otherwise
const SYNC = process.env.SYNC !== "off";
let syncing = false, lastSync = null, lastError = null;
const matchNight = (d = new Date()) => {
  const pk = new Date(d.getTime() + 5 * 3600e3); // Asia/Karachi is UTC+5, no daylight saving
  const day = pk.getUTCDay(), h = pk.getUTCHours();
  return (day === 0 && h >= 22) || (day === 1 && h < 3);
};
async function runSync() {
  if (syncing) return;
  syncing = true;
  try { await sync({ quiet: true }); lastSync = new Date(); lastError = null; }
  catch (e) { lastError = e.message; console.error("sync failed:", e.message); }
  finally { syncing = false; setTimeout(runSync, (matchNight() ? 2 : 30) * 60e3); }
}

function send(res, code, type, body, cache = "no-store") {
  res.writeHead(code, { "Content-Type": type, "Cache-Control": cache, "X-Content-Type-Options": "nosniff" });
  res.end(body);
}

http.createServer((req, res) => {
  let url;
  try { url = decodeURIComponent(new URL(req.url, "http://x").pathname); } catch { return send(res, 400, "text/plain", "Bad request"); }
  if (url === "/" || url === "/index.html") return send(res, 200, TYPES[".html"], page());
  if (url === "/healthz") return send(res, 200, "application/json", JSON.stringify({ ok: true, lastSync, lastError, matchNight: matchNight() }));
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
  if (SYNC) runSync();
});
