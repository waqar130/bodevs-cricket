// Pulls every match, scorecard and player from Scorenama (the BoDevs group) into data/cricket.json,
// in the shape the site was built on. Run: node sync.js
const fs = require("fs");
const path = require("path");
const { getJSON, toState, GROUP_URL } = require("./scorenama");

const SOURCE = "https://scorenama.com/g/" + (process.env.SCORENAMA_GROUP || "7142662p6r2u");
const OUT_DIR = path.join(__dirname, "data");
const ASSET_DIR = path.join(__dirname, "assets");

async function get(url, as = "text") {
  const res = await fetch(url, { headers: { "User-Agent": "BoDevsCricketSync/1.0" } });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  return as === "json" ? res.json() : as === "buffer" ? Buffer.from(await res.arrayBuffer()) : res.text();
}

const decode = s => s.replace(/&amp;/g, "&").replace(/&#0?39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim();

// Scorecard name -> BoDevs profile (full name, job, photo on bodevs.com)
const PROFILES = {
  "Waqar":        { full: "Waqar Ahmed",       job: "Senior Project Manager",                     photo: "waqar-min.png", bowl: "fast" },
  "Tassadduq":    { full: "Tassadduq Hussain", job: "Solution Architect & Senior Full-Stack Engineer", photo: "tassadduq-min.png", captain: true, bowl: "spin" },
  "Abdullah":     { full: "Abdullah Ali",      job: "Senior Full-Stack Engineer",                 photo: "abdullah-min.png", bowl: "spin" },
  "Asad":         { full: "M. Asad",           job: "Senior Full-Stack Engineer",                 photo: "asad-min.png", bowl: "fast" },
  "Fawad":        { full: "Favad Nafees",      job: "Motion & Animation Designer",                photo: "favad-min.png", bowl: "spin" },
  "Farhan":       { full: "Farhan Ghafoor",    job: "Co-Founder & Lead Strategist",               photo: "farhan-min.png", captain: true, bowl: "spin" },
  "Saad Zubairi": { full: "Saad Zubairi",      job: "Support Specialist",                         photo: "saad-min.png", bowl: "fast" },
  "Ahsan":        { full: "Ahsan Sajjad",      job: "Technical Partner & Lead Engineer",          photo: "ahsan-min.png", bowl: "spin" },
  "Borni":        { full: "Ali Khan Niazi",    job: "SEO & Content Strategist",                   photo: "ali-niazi-min.png", keeper: true, bowl: "spin" },
  "Qari sb":      { full: "Abdur Rehman",      job: "Senior React Engineer",                      photo: "qari-min.png", bowl: "spin" },
  "Butt Sb":      { full: "Fahd Butt", job: "Head of Sales", ownPhoto: "players/10.webp", bowl: "fast" },
  "Mazhar":       { full: "Mazhar Saleem", job: "Head of Accounts & Finance", ownPhoto: "players/9.webp", keeper: true, bowl: "spin" },
};
const BODEVS = "https://bodevs.com/";

// Tilde ball and playing photos
const TILDE = {
  "yellow-seam.png": "https://tildecricket.com/wp-content/uploads/2026/08/yellow-seam-angle.png",
  "pink-seam.png": "https://tildecricket.com/wp-content/uploads/2026/08/pink-seam-angle.png",
  "yellow-dimple.png": "https://tildecricket.com/wp-content/uploads/2026/08/yellow-dimple-side.png",
  "pink-dimple.png": "https://tildecricket.com/wp-content/uploads/2026/08/pink-dimple-side.png",
  "floodlit-night.jpg": "https://tildecricket.com/wp-content/uploads/2026/09/tilde-hero-floodlit-cricket-night.jpg",
  "box-cricket.jpg": "https://tildecricket.com/wp-content/uploads/2026/09/tilde-box-cricket-caged-ground.jpg",
  "indoor-nets.jpg": "https://tildecricket.com/wp-content/uploads/2026/09/tilde-indoor-nets-astro-turf.jpg",
};

// The site's player ids, kept from before the move to Scorenama (photos and page links use them).
// A new player gets 100 + their Scorenama id, so it never changes between syncs.
const SITE_IDS = { "Tassadduq": 1, "Waqar": 2, "Asad": 3, "Fawad": 4, "Borni": 5, "Farhan": 6, "Saad Zubairi": 7, "Abdullah": 8, "Mazhar": 9, "Butt Sb": 10, "Ahsan": 11, "Qari sb": 12 };

// opts.quiet: no per-item logging. opts.refreshAssets: re-download images even if present (CLI default).
async function sync(opts = {}) {
  const log = opts.quiet ? () => {} : console.log;
  const refresh = opts.refreshAssets ?? !opts.quiet;
  const saveImg = async (file, url) => { if (refresh || !fs.existsSync(file)) fs.writeFileSync(file, await get(url, "buffer")); };
  // Previous file: who we already know, and which team they play for
  const file = path.join(OUT_DIR, "cricket.json");
  let prev = { players: [] }; try { prev = JSON.parse(fs.readFileSync(file, "utf8")); } catch { /* first run */ }
  const known = new Map((prev.players || []).map(p => [p.name, p]));
  // Players and their Scorenama ids
  const sn = (await getJSON("/players")).players || [];
  const idOf = name => SITE_IDS[name] ?? known.get(name)?.id ?? (100 + (sn.find(p => p.name === name)?.id ?? 900));
  const TEAM_IDS = { "Farhan Falcons": 1, "Tassadduq Tigers": 2 }, teamId = name => TEAM_IDS[name] ?? 3;

  // Every match, newest first in the list; each one fetched in full with its balls
  const list = (await getJSON("/matches?limit=200")).matches || [];
  const matches = [], sides = new Map();
  for (const item of list.slice().sort((x, y) => x.number - y.number)) {
    const full = (await getJSON(`/matches/${item.number}?balls=1`)).match;
    if (!full) { console.warn(`match ${item.number}: no data, skipped`); continue; }
    matches.push(toState(full, idOf, teamId));
    // which side each player turned out for, for new players' teams
    for (const k of ["a", "b"]) (full.squads?.[k] || []).forEach(n => { const t = full.teams[k].name, m = sides.get(n) || {}; m[t] = (m[t] || 0) + 1; sides.set(n, m); });
    log(`match ${item.number}: ${full.result?.text || full.status}`);
    await new Promise(r => setTimeout(r, 150)); // gentle on Scorenama
  }

  // Everyone who has played, plus anyone we already had who hasn't yet (e.g. a new signing)
  const names = new Set([...sn.map(p => p.name), ...sides.keys(), ...(prev.players || []).map(p => p.name)]);
  const players = [...names].map(name => { const k = known.get(name), seen = Object.entries(sides.get(name) || {}).sort((x, y) => y[1] - x[1]);
    return { id: idOf(name), name, team: k?.team || seen[0]?.[0] || "" }; }).sort((x, y) => x.id - y.id);
  log(`${players.length} players`);

  // Player photos and profile details from bodevs.com
  fs.mkdirSync(path.join(ASSET_DIR, "players"), { recursive: true });
  for (const p of players) {
    const prof = PROFILES[p.name];
    if (!prof) continue;
    if (prof.full) p.full_name = prof.full;
    if (prof.job) p.job = prof.job;
    if (prof.captain) p.captain = true;
    if (prof.keeper) p.keeper = true;
    if (prof.bowl) p.bowl_style = prof.bowl;   // "fast" or "spin"
    // ownPhoto: a photo kept in assets/ (not on bodevs.com); it is committed to the repo, never downloaded
    if (prof.ownPhoto && fs.existsSync(path.join(ASSET_DIR, prof.ownPhoto))) p.photo = "assets/" + prof.ownPhoto;
    else if (prof.photo) {
      const file = `players/${p.id}${path.extname(prof.photo)}`;
      await saveImg(path.join(ASSET_DIR, file), BODEVS + prof.photo);
      p.photo = "assets/" + file;
    }
  }
  // New players with no profile above: try to match them to the bodevs.com team list by first name
  // (or by the photo's file name, e.g. "Qari sb" -> qari-min.png). Only a single, unused match is taken.
  const unmatched = players.filter(p => !PROFILES[p.name]);
  if (unmatched.length) {
    try {
      const html = await get(BODEVS);
      const team = [...html.matchAll(/<img alt="([^"]+)"[^>]*?data-nimg="fill"[^>]*?srcSet="\/_next\/image\?url=%2F([\w.-]+?)&/g)]
        .map(m => ({ name: decode(m[1]), photo: m[2] })).filter(t => /\.(png|jpe?g|webp)$/.test(t.photo) && !/logo/i.test(t.photo));
      team.forEach(t => { const i = html.indexOf(">" + t.name + "</"), j = i > 0 && html.slice(i, i + 600).match(/<\/(?:h\d|p|span|div)>\s*<(?:p|span|div)[^>]*>([^<]{3,80})</); t.job = j ? decode(j[1]) : ""; });
      const used = new Set(Object.values(PROFILES).map(p => p.photo).filter(Boolean));
      const first = s => String(s).toLowerCase().split(/[\s.]+/).filter(Boolean)[0] || "";
      for (const p of unmatched) {
        const key = first(p.name);
        const hits = team.filter(t => !used.has(t.photo) && (first(t.name) === key || t.photo.toLowerCase().startsWith(key + "-")));
        if (hits.length !== 1) { console.log(`new player "${p.name}": no single bodevs.com match, add a profile in sync.js`); continue; }
        const t = hits[0], file = `players/${p.id}${path.extname(t.photo)}`;
        await saveImg(path.join(ASSET_DIR, file), BODEVS + t.photo);
        Object.assign(p, { full_name: t.name, job: t.job || undefined, photo: "assets/" + file, auto_profile: true });
        used.add(t.photo);
        console.log(`new player "${p.name}": matched to ${t.name} on bodevs.com (check, then add to PROFILES)`);
      }
    } catch (e) { console.warn("bodevs.com team lookup failed:", e.message); }
  }
  log(`${players.filter(p => p.photo).length} player photos`);

  fs.mkdirSync(path.join(ASSET_DIR, "tilde"), { recursive: true });
  for (const [file, url] of Object.entries(TILDE)) {
    await saveImg(path.join(ASSET_DIR, "tilde", file), url);
  }
  log(`${Object.keys(TILDE).length} Tilde photos`);

  fs.mkdirSync(OUT_DIR, { recursive: true });
  // Never replace good data with fewer matches: a source that is down, or has been retired, comes back empty.
  try {
    const prev = JSON.parse(fs.readFileSync(file, "utf8"));
    if (matches.length < (prev.matches || []).length) throw new Error(`refusing to save ${matches.length} matches over the ${prev.matches.length} already stored`);
  } catch (e) { if (String(e.message).startsWith("refusing")) throw e; }
  // Keep the old file (and its timestamp) when nothing changed, so scheduled runs don't commit empty updates.
  try {
    const old = JSON.parse(fs.readFileSync(file, "utf8"));
    if (JSON.stringify({ p: old.players, m: old.matches }) === JSON.stringify({ p: players, m: matches })) {
      log(`no changes (${matches.length} matches)`);
      return { changed: false, matches: matches.length };
    }
  } catch { /* first run or unreadable file: write a fresh one */ }
  const data = { source: SOURCE, synced_at: new Date().toISOString(), players, matches };
  fs.writeFileSync(file + ".tmp", JSON.stringify(data));
  fs.renameSync(file + ".tmp", file); // atomic swap so the server never serves a half-written file
  console.log(`saved data/cricket.json (${matches.length} matches, ${(fs.statSync(file).size / 1024).toFixed(0)} KB)`);
  return { changed: true, matches: matches.length };
}

module.exports = { sync, SOURCE, GROUP_URL };
if (require.main === module) sync().catch(err => { console.error(err.message); process.exit(1); });
