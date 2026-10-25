/* BoDevs Cricket extras: Monday digest, season story, partnerships, toss & tactics, phases of play,
   player share cards, prediction game, fixtures, gallery and the live bar.
   Loaded after the main script in index.html; uses its globals (M, P, WEEKS, H, byName, helpers). */

// Links people share should point at the public site, even from the Claude preview.
var SITE_BASE = /waqarahmed\.net$|^localhost$|^127\.0\.0\.1$/.test(location.hostname) ? location.origin : "https://cricket.waqarahmed.net";
const ON_SITE = SITE_BASE === location.origin;   // the server's /api routes only exist on our own host
const isoDay = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const chrono = () => [...M].reverse();             // oldest match first
const upName = new Map();                          // "WAQAR" -> player id, for commentary text
const legalRuns = (c) => { const k = c.badge.kind, mk = String(c.badge.mark), nb = k === "noball" || c.badge.extra === "noball";
  const bat = k === "six" ? 6 : k === "four" ? 4 : /^\d+$/.test(mk) ? +mk : 0;
  if (k === "wide") return { legal: false, bat: 0, conceded: parseInt(mk) || 1, nb: false };
  return { legal: true, bat, conceded: bat + (nb ? 1 : 0), nb };
};
const copyText = (txt, msgEl) => {
  const ok = () => msgEl && (msgEl.textContent = "Copied. Paste it into WhatsApp.");
  const fail = () => { if (!msgEl) return; msgEl.innerHTML = `Copy isn't available here. Select the text and copy it.<textarea class="copybox" readonly rows="8">${esc(txt)}</textarea>`; msgEl.querySelector("textarea").select(); };
  try { navigator.clipboard.writeText(txt).then(ok, fail); } catch { fail(); }
};
const copyCanvas = (canvas, msgEl) => {
  try { navigator.clipboard.write([new ClipboardItem({ "image/png": new Promise(r => canvas.toBlob(r, "image/png")) })])
    .then(() => msgEl.textContent = "Image copied. Paste it into WhatsApp.", () => msgEl.textContent = "Copying images isn't allowed here. Right-click or long-press the image to save it."); }
  catch { msgEl.textContent = "Copying images isn't supported here. Right-click or long-press the image to save it."; }
};
const downloadCanvas = (canvas, name) => { const a = document.createElement("a"); a.href = canvas.toDataURL("image/png"); a.download = name; a.click(); };
const fitFont = (x, t, w, size, weight, fam) => { let s = size; do { x.font = `${weight} ${s}px ${fam}`; s -= 2; } while (x.measureText(t).width > w && s > 14); return s + 2; };
const DISP = '"Big Shoulders Display","Arial Narrow",Impact,sans-serif', MONO = '"IBM Plex Mono",Consolas,monospace', SERIF = 'Newsreader,Georgia,serif';
const CC = { paper: "#f5f5f1", ink: "#141413", muted: "#6e6d67", rule: "#d6d5cd", red: "#d42a1f", t: "#e2601a", f: "#1d5bd0", gold: "#ffd23f" };
async function canvasBase(kicker) {
  await Promise.all(['900 120px "Big Shoulders Display"', '800 60px "Big Shoulders Display"', '600 28px "IBM Plex Mono"', '500 28px "IBM Plex Mono"'].map(f => document.fonts.load(f).catch(() => {})));
  const c = document.createElement("canvas"); c.width = 1080; c.height = 1350; const x = c.getContext("2d");
  x.fillStyle = CC.paper; x.fillRect(0, 0, 1080, 1350); x.fillStyle = "#0d0d0c"; x.fillRect(0, 0, 1080, 150);
  const logo = await loadImg("assets/logo.png"); let lx = 60;
  if (logo) { x.drawImage(logo, 60, 42, logo.width * 66 / logo.height, 66); lx += logo.width * 66 / logo.height + 28; }
  x.fillStyle = CC.paper; x.font = `800 50px ${DISP}`; x.fillText("CRICKET", lx, 95);
  x.textAlign = "right"; x.font = `600 24px ${MONO}`; x.fillText(kicker.toUpperCase(), 1020, 92); x.textAlign = "left";
  x.fillStyle = CC.red; x.fillRect(0, 1220, 1080, 130); x.fillStyle = "#fff"; x.font = `800 44px ${DISP}`; x.fillText("CRICKET.WAQARAHMED.NET", 60, 1278);
  x.font = `500 24px ${MONO}`; x.fillText("SportsX, G-12 Islamabad · Challenge us: 0313 5052165", 60, 1316);
  return { c, x };
}
async function drawPhoto(x, p, X, Y, S) {
  const ph = p?.photo ? await loadImg(p.photo) : null;
  x.fillStyle = p?.tm.key === "f" ? "#dbe6fa" : "#fbe3d3"; x.fillRect(X, Y, S, S);
  if (ph) { const cw = ph.width * 0.8; x.drawImage(ph, ph.width * 0.1, ph.height * 0.06, cw, cw, X, Y, S, S); }
  else { x.fillStyle = p?.tm.key === "f" ? CC.f : CC.t; x.font = `900 ${Math.round(S * .45)}px ${DISP}`; x.textAlign = "center"; x.fillText((p?.full_name || p?.name || "?").split(" ").map(w => w[0]).join("").slice(0, 2), X + S / 2, Y + S * .62); x.textAlign = "left"; }
  x.fillStyle = p?.tm.key === "f" ? CC.f : CC.t; x.fillRect(X, Y + S - 8, S, 8);
}
function shareUI(id, canvas, fname, waText, msgId) {
  const msg = document.getElementById(msgId);
  document.getElementById(id + "Copy").onclick = () => copyCanvas(canvas, msg);
  document.getElementById(id + "Text").onclick = () => copyText(waText, msg);
  const dl = document.getElementById(id + "Dl");
  if (IS_LOCAL || !window.claude?.use) { dl.hidden = false; dl.onclick = () => downloadCanvas(canvas, fname); }
  else Promise.resolve(window.claude.use("downloads")).then(d => { if (!d) return; dl.hidden = false;
    dl.onclick = async () => { const blob = await new Promise(r => canvas.toBlob(r, "image/png")); try { await d.save({ filename: fname, data: blob }); msg.textContent = "Saved."; } catch (e) { if (e?.code !== "declined") msg.textContent = "Saving isn't available here. Right-click or long-press the image instead."; } }; }).catch(() => {});
  document.getElementById(id + "Wa").href = "https://wa.me/?text=" + encodeURIComponent(waText);
}

/* ---------------- milestones reached in a given week (for the digest) ---------------- */
function milestonesIn(Wk) {
  const ids = new Set(Wk.WM.map(m => m.id)), out = [];
  P.forEach(p => {
    const log = [...p.log.values()].sort((a, b) => a.mm.date - b.mm.date || a.mm.id - b.mm.id), tot = { r: 0, w: 0, s: 0, c: 0, m: 0 };
    log.forEach(l => { const before = { ...tot };
      tot.r += l.bat.reduce((a, x) => a + x.r, 0); tot.s += l.bat.reduce((a, x) => a + x.s, 0); tot.w += l.bowl.reduce((a, x) => a + x.w, 0); tot.c += l.c; tot.m++;
      if (ids.has(l.mm.id)) MS.forEach(m => m.k !== "m" && m.steps.forEach(st => { if (before[m.k] < st && tot[m.k] >= st) out.push(`${p.full_name || p.name}: ${st.toLocaleString()} ${m.name}`); })); });
  });
  return out;
}

/* ---------------- 1. Monday digest ---------------- */
function digestText(W) {
  const tw = Object.entries(W.tw), pw = P.get(W.pow.id), t = M.filter(m => m.win?.key === "t").length, f = M.filter(m => m.win?.key === "f").length;
  const res = [...W.WM].reverse().map(m => `#${m.id}: ${m.win ? `${m.win.short} won by ${m.margin}` : m.m.status_label}`).join("\n");
  const ms = milestonesIn(W), hot = formData().filter(x => x.trend === "hot").slice(0, 3).map(x => x.p.full_name || x.p.name);
  return [`🏏 BoDevs Cricket · Week of ${weekRange(W)}`, "", res, "",
    tw.length === 2 ? `${W === WEEK ? "This" : "That"} week: ${team(tw[0][0]).short} ${tw[0][1].w}–${tw[1][1].w} ${team(tw[1][0]).short}` : "",
    `Season: Tigers ${t}–${f} Falcons`, "",
    ...W.podium.map(x => `${x.n === 1 ? "⭐" : x.role === "Impact Player" ? "🥈" : "🥉"} ${x.role}: ${pname(x.id)}${x.id === W.pow.id ? ` (${pw?.title || ""})` : ""}: ${x.r} runs, ${x.w} wkt${x.w === 1 ? "" : "s"}, ${x.c} catch${x.c === 1 ? "" : "es"}, ${x.pts} pts`),
    `💥 Best knock: ${pname(W.knock.id)} ${W.knock.r}${W.knock.no ? "*" : ""} (${W.knock.b})`,
    `🎯 Best spell: ${pname(W.spell.id)} ${W.spell.w}/${W.spell.r} (${W.spell.ov} ov)`,
    ms.length ? `🏅 Milestones: ${ms.join(" · ")}` : "",
    hot.length ? `🔥 In form: ${hot.join(", ")}` : "",
    "", `Full scorecards: ${SITE_BASE}`].filter((l, i, a) => l !== "" || a[i - 1] !== "").join("\n");
}
async function drawDigest(W) {
  const { c, x } = await canvasBase(`The Monday digest · Issue ${W.issue}`);
  let y = 230; x.fillStyle = CC.red; x.font = `600 26px ${MONO}`; x.fillText(`WEEK OF ${weekRange(W).toUpperCase()}`, 60, y);
  const p = P.get(W.pow.id); y += 30;
  await drawPhoto(x, p, 60, y, 300);
  const tx = 400, tw = 620; x.fillStyle = CC.red; x.font = `600 26px ${MONO}`; x.fillText(W.joint ? "JOINT MVP OF THE WEEK" : "MVP OF THE WEEK", tx, y + 34);
  x.fillStyle = CC.ink; const nm = (p?.full_name || p?.name || "").toUpperCase(); fitFont(x, nm, tw, 92, 900, DISP); x.fillText(nm, tx, y + 124);
  if (p?.title) { x.fillStyle = CC.red; fitFont(x, p.title.toUpperCase(), tw, 26, 600, MONO); x.fillText(p.title.toUpperCase(), tx, y + 166); }
  const st = [["RUNS", W.pow.r], ["WKTS", W.pow.w], ["SIXES", W.pow.s], ["CT", W.pow.c]];
  st.forEach(([l, v], i) => { const sx = tx + i * 155; x.fillStyle = CC.muted; x.font = `500 22px ${MONO}`; x.fillText(l, sx, y + 230); x.fillStyle = CC.ink; x.font = `900 72px ${DISP}`; x.fillText(String(v), sx, y + 296); });
  y += 350; x.strokeStyle = CC.ink; x.lineWidth = 4; x.beginPath(); x.moveTo(60, y); x.lineTo(1020, y); x.stroke(); y += 50;
  x.fillStyle = CC.muted; x.font = `600 24px ${MONO}`; x.fillText("RESULTS", 60, y); y += 16;
  for (const m of [...W.WM].reverse().slice(0, 4)) { y += 66; x.fillStyle = m.win?.key === "f" ? CC.f : m.win?.key === "t" ? CC.t : CC.ink;
    const t = `#${m.id} ${m.win ? `${m.win.short} won by ${m.margin}` : m.m.status_label}`.toUpperCase(); fitFont(x, t, 960, 54, 800, DISP); x.fillText(t, 60, y); }
  y += 40; x.strokeStyle = CC.rule; x.lineWidth = 2; x.beginPath(); x.moveTo(60, y); x.lineTo(1020, y); x.stroke(); y += 50;
  const lines = [`Best knock: ${pname(W.knock.id)} ${W.knock.r}${W.knock.no ? "*" : ""} (${W.knock.b})`, `Best spell: ${pname(W.spell.id)} ${W.spell.w}/${W.spell.r}`];
  if (W.joint) lines.push(`Joint MVP with ${W.mvps.slice(1).map(x => pname(x.id)).join(" and ")}`);
  const rest = W.podium.filter(x => x.n > 1); if (rest.length) lines.push(rest.map(x => `${x.role}: ${pname(x.id)}`).join(" · "));
  const ms = milestonesIn(W); if (ms.length) lines.push(`Milestone: ${ms[0]}`);
  const t = M.filter(m => m.win?.key === "t").length, f = M.filter(m => m.win?.key === "f").length; lines.push(`Season: Tigers ${t}–${f} Falcons`);
  x.fillStyle = CC.ink; for (const l of lines.slice(0, 4)) { fitFont(x, l, 960, 34, 500, MONO); x.fillText(l, 60, y); y += 54; }
  return c;
}
let dgTok = 0;
async function renderDigest() {
  const el = $("#digestBody"); if (!el || !WEEK) return;
  const W = selW(), tok = ++dgTok, txt = digestText(W);
  $("#digest h2").textContent = W === WEEK ? "This week" : `Issue ${W.issue}`;
  el.innerHTML = `<div class="dg-grid"><div class="dg-copy">
      <p class="label">Ready to paste into the team group</p><pre class="dg-text" id="dgText"></pre>
      <div class="pick-actions"><button type="button" class="btn solid" id="dgText2">Copy text</button><a class="btn" id="dgWa" target="_blank" rel="noopener">Send on WhatsApp ↗</a><button type="button" class="btn" id="dgCopy">Copy image</button><button type="button" class="btn" id="dgDl" hidden>Download image</button></div>
      <p class="label" id="dgMsg"></p></div>
    <img class="card-img dg-img" id="dgImg" alt="Monday digest card for the week of ${esc(weekRange(W))}"></div>`;
  $("#dgText").textContent = txt;
  // draw the image card only once the digest is actually on screen
  await new Promise(res => { const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { io.disconnect(); res(); } }, { rootMargin: "200px" }); io.observe($("#dgImg")); });
  if (tok !== dgTok) return; // a newer week was picked meanwhile
  const c = await drawDigest(W); if (tok !== dgTok) return; $("#dgImg").src = c.toDataURL("image/png");
  // reuse shareUI with this section's ids
  const msg = $("#dgMsg");
  $("#dgText2").onclick = () => copyText(txt, msg); $("#dgCopy").onclick = () => copyCanvas(c, msg); $("#dgWa").href = "https://wa.me/?text=" + encodeURIComponent(txt);
  const dl = $("#dgDl"); const fname = `bodevs-cricket-digest-issue-${W.issue}.png`;
  if (IS_LOCAL || !window.claude?.use) { dl.hidden = false; dl.onclick = () => downloadCanvas(c, fname); }
  else Promise.resolve(window.claude.use("downloads")).then(d => { if (!d) return; dl.hidden = false; dl.onclick = async () => { try { await d.save({ filename: fname, data: await new Promise(r => c.toBlob(r, "image/png")) }); msg.textContent = "Saved."; } catch {} }; }).catch(() => {});
}

/* ---------------- 2. Season story (charts) ---------------- */
function renderStory() {
  const el = $("#storyBody"); if (!el) return;
  const ms = chrono(), n = ms.length; if (!n) return;
  let t = 0, f = 0; const pts = ms.map(m => { if (m.win?.key === "t") t++; if (m.win?.key === "f") f++; return { m, t, f }; });
  const W = 900, Hh = 300, L = 40, R = 100, T = 20, B = 46, iw = W - L - R, ih = Hh - T - B, maxY = Math.max(t, f, 1);
  const xs = i => L + (i / n) * iw, ys = v => T + ih - (v / maxY) * ih;
  const weeks = [...WEEKS].reverse();
  // week bands with labels
  let bands = "", gx = 0;
  weeks.forEach((w, wi) => { const start = ms.findIndex(m => m.week === w.WM[0].week), cnt = w.WM.length; if (start < 0) return;
    const x0 = xs(start + .5) - (iw / n) / 2 + (iw / n) / 2, x1 = xs(start + cnt) + 0;
    bands += `<rect x="${xs(start)}" y="${T}" width="${xs(start + cnt) - xs(start)}" height="${ih}" fill="${wi % 2 ? "var(--paper-2)" : "transparent"}"/>
      <text x="${(xs(start) + xs(start + cnt)) / 2}" y="${Hh - 22}" text-anchor="middle" class="ch-ax">W${w.issue}</text>`; });
  let grid = ""; for (let v = 0; v <= maxY; v += Math.max(1, Math.ceil(maxY / 4))) grid += `<line x1="${L}" x2="${L + iw}" y1="${ys(v)}" y2="${ys(v)}" class="ch-grid"/><text x="${L - 8}" y="${ys(v) + 4}" text-anchor="end" class="ch-ax">${v}</text>`;
  const line = k => `M${xs(0)},${ys(0)} ` + pts.map((p, i) => `L${xs(i + 1)},${ys(p[k])}`).join(" ");
  const dots = k => pts.map((p, i) => p.m.win?.key === k ? `<circle cx="${xs(i + 1)}" cy="${ys(p[k])}" r="4.5" fill="var(--${k === "t" ? "tiger" : "falcon"})" stroke="var(--paper)" stroke-width="2"/>` : "").join("");
  const hits = pts.map((p, i) => `<rect class="ch-hit" x="${xs(i + .5)}" y="${T}" width="${iw / n}" height="${ih}" fill="transparent" data-i="${i}"/>`).join("");
  el.innerHTML = `<div class="ch-card"><div class="ch-head"><h3 class="tbl-title">The race, match by match</h3>
      <div class="ch-legend"><span class="t"><i></i>Tigers</span><span class="f"><i></i>Falcons</span></div></div>
    <div class="ch-wrap"><svg viewBox="0 0 ${W} ${Hh}" class="ch" role="img" aria-label="Running wins: Tigers ${t}, Falcons ${f} after ${n} matches">
      ${bands}${grid}
      <path d="${line("f")}" fill="none" stroke="var(--falcon)" stroke-width="2.5"/><path d="${line("t")}" fill="none" stroke="var(--tiger)" stroke-width="2.5"/>
      ${dots("f")}${dots("t")}
      <text x="${xs(n) + 10}" y="${ys(t) + 5}" class="ch-end t">Tigers ${t}</text><text x="${xs(n) + 10}" y="${ys(f) + (Math.abs(ys(f) - ys(t)) < 18 ? 20 : 5)}" class="ch-end f">Falcons ${f}</text>
      <line class="ch-cross" x1="0" x2="0" y1="${T}" y2="${T + ih}" visibility="hidden"/>${hits}</svg>
      <div class="ch-tip" id="raceTip" hidden></div></div>
    <p class="rank-note">Wins added up after each match. Shaded columns mark each week (W = issue number). Dots show who won that match.</p></div>
    <div class="story-weeks" id="storyWeeks"></div>`;
  const svg = el.querySelector("svg.ch"), tip = $("#raceTip"), cross = svg.querySelector(".ch-cross");
  svg.querySelectorAll(".ch-hit").forEach(r => { const show = () => { const p = pts[+r.dataset.i], cx = xs(+r.dataset.i + 1);
      cross.setAttribute("x1", cx); cross.setAttribute("x2", cx); cross.setAttribute("visibility", "visible");
      tip.hidden = false; tip.innerHTML = `<b>#${p.m.id} · ${fmtD(p.m.date, { day: "numeric", month: "short" })}</b>${p.m.win ? `${p.m.win.short} won by ${esc(p.m.margin)}` : esc(p.m.m.status_label)}<br><span class="t">Tigers ${p.t}</span> · <span class="f">Falcons ${p.f}</span>`;
      const box = svg.getBoundingClientRect(); tip.style.left = Math.min(box.width - 190, Math.max(0, cx / W * box.width - 90)) + "px"; };
    r.addEventListener("mouseenter", show); r.addEventListener("click", show);
    r.addEventListener("mouseleave", () => { tip.hidden = true; cross.setAttribute("visibility", "hidden"); }); });
  // weekly columns: runs and sixes as two small charts sharing the week axis, with each week's MVP underneath
  const maxR = Math.max(...weeks.map(w => w.runs)), maxS = Math.max(...weeks.map(w => w.sixes));
  $("#storyWeeks").innerHTML = `<div class="sw-row"><span class="label sw-lab">Runs</span>${weeks.map(w => `<div class="sw-col" title="Issue ${w.issue}: ${w.runs} runs"><span class="sw-v">${w.runs === maxR ? w.runs : ""}</span><i style="height:${Math.round(w.runs / maxR * 100)}%"></i></div>`).join("")}</div>
    <div class="sw-row"><span class="label sw-lab">Sixes</span>${weeks.map(w => `<div class="sw-col six" title="Issue ${w.issue}: ${w.sixes} sixes"><span class="sw-v">${w.sixes === maxS ? w.sixes : ""}</span><i style="height:${Math.round(w.sixes / maxS * 100)}%"></i></div>`).join("")}</div>
    <div class="sw-row mvps"><span class="label sw-lab">MVP</span>${weeks.map(w => { const p = P.get(w.pow.id); return `<a class="sw-mvp" href="${purl(p.id)}" title="Issue ${w.issue} ${w.joint ? "joint MVPs" : "MVP"}: ${w.mvps.map(x => esc(pname(x.id))).join(" & ")}">${miniThumb(p)}<small>W${w.issue}</small><b>${esc(short(p.id))}</b></a>`; }).join("")}</div>`;
}

/* ---------------- 3. Partnerships ---------------- */
function buildPartnerships() {
  P.forEach(p => upName.set(p.name.toUpperCase(), p.id));
  const stands = [];
  M.forEach(mm => mm.s.scorecards.forEach(sc => {
    const bl = (sc.commentary || []).filter(c => c.type === "ball").slice().reverse(), fow = [...(sc.fow || [])].sort((a, b) => a.wicket - b.wicket);
    const segs = []; let cur = { faced: new Set(), balls: 0 }, wi = 0;
    for (const c of bl) { const t = String(c.text).match(/^(.+?) TO (.+?), /); if (!t) continue; cur.faced.add(t[2]); if (legalRuns(c).legal) cur.balls++;
      if (c.badge.kind === "wicket") { const fw = fow[wi++]; if (fw) cur.faced.add(fw.player.toUpperCase()); segs.push(cur); cur = { faced: new Set(), balls: 0 }; } }
    segs.push(cur);
    let carry = null, prev = 0;
    segs.forEach((s, i) => {
      const fw = fow[i], runs = (fw ? fw.score : sc.runs) - prev; prev = fw ? fw.score : prev;
      let who = [...s.faced]; if (who.length === 1 && carry && !s.faced.has(carry)) who.push(carry);
      const dism = fw ? fw.player.toUpperCase() : null; carry = who.find(x => x !== dism) || null;
      if (!who.length || (runs <= 0 && !s.balls)) return;
      stands.push({ ids: who.map(n => upName.get(n)).filter(Boolean), runs, balls: s.balls, wkt: i + 1, unbroken: !fw, team: sc.batting_team, mm, ino: sc.innings_no });
    });
  }));
  return stands;
}
function renderPartnerships() {
  const el = $("#partnersBody"); if (!el) return;
  const st = buildPartnerships(), pairName = s => s.ids.length > 1 ? s.ids.map(id => plink(id, short(id))).join(" & ") : `${plink(s.ids[0], short(s.ids[0]))} <span class="label">(last man)</span>`;
  const top = [...st].filter(s => s.ids.length > 1).sort((a, b) => b.runs - a.runs || a.balls - b.balls).slice(0, 10);
  const pairs = new Map(); st.filter(s => s.ids.length === 2).forEach(s => { const k = [...s.ids].sort((a, b) => a - b).join("|"); const e = pairs.get(k) || { ids: [...s.ids].sort((a, b) => a - b), runs: 0, balls: 0, n: 0, best: 0 }; e.runs += s.runs; e.balls += s.balls; e.n++; e.best = Math.max(e.best, s.runs); pairs.set(k, e); });
  const best = [...pairs.values()].sort((a, b) => b.runs - a.runs).slice(0, 10);
  const ord = n => n + (["th", "st", "nd", "rd"][(n % 100 - 20) % 10] || ["th", "st", "nd", "rd"][n % 100] || "th");
  el.innerHTML = `<div class="tables">
    <div><h3 class="tbl-title">Highest stands</h3><div class="tbl-wrap"><table class="data"><thead><tr><th></th><th>Pair</th><th>Runs</th><th>Balls</th><th>Wkt</th><th>Match</th></tr></thead><tbody>
      ${top.map((s, i) => `<tr><td class="rk">${i + 1}</td><td class="nm ${team(s.team).key}"><span class="chip"></span>${pairName(s)}</td><td class="hi">${s.runs}${s.unbroken ? "*" : ""}</td><td>${s.balls}</td><td>${ord(s.wkt)}</td><td><a href="#match-${s.mm.id}-i${s.ino || 1}">#${s.mm.id} · ${fmtD(s.mm.date, { day: "numeric", month: "short" })}</a></td></tr>`).join("")}
    </tbody></table></div></div>
    <div><h3 class="tbl-title">Best pairs</h3><div class="tbl-wrap"><table class="data"><thead><tr><th></th><th>Pair</th><th>Runs</th><th>Stands</th><th>Avg</th><th>Best</th><th>Run rate</th></tr></thead><tbody>
      ${best.map((s, i) => `<tr><td class="rk">${i + 1}</td><td class="nm">${s.ids.map(id => plink(id, short(id))).join(" & ")}</td><td class="hi">${s.runs}</td><td>${s.n}</td><td>${r1(s.runs / s.n)}</td><td>${s.best}</td><td>${s.balls ? r1(s.runs / s.balls * 6) : "–"}</td></tr>`).join("")}
    </tbody></table></div></div></div>
    <p class="rank-note" style="margin-top:12px">Stands are rebuilt from the fall of wickets and the ball-by-ball commentary, and include extras. * = unbroken. "Last man" stands come from games where one batter can carry on alone.</p>`;
}

/* ---------------- 4. Toss & tactics ---------------- */
function renderTactics() {
  const el = $("#tacticsBody"); if (!el) return;
  const done = M.filter(m => m.win);
  const pct = (a, b) => b ? Math.round(a / b * 100) : 0;
  const tossWin = done.filter(m => m.m.toss_winner && m.m.toss_winner === m.win.name).length, tossN = done.filter(m => m.m.toss_winner).length;
  const batFirstWin = done.filter(m => m.m.batting_first === m.win.name).length;
  const choseBat = done.filter(m => m.m.toss_choice === "bat"), choseBowl = done.filter(m => m.m.toss_choice === "bowl");
  const byFmt = ["Test", "One-day"].map(f => { const ms = done.filter(m => m.fmt === f); return { f, n: ms.length, bf: ms.filter(m => m.m.batting_first === m.win.name).length }; }).filter(x => x.n);
  const outs = { t: {}, f: {} };
  M.forEach(m => m.s.scorecards.forEach(sc => sc.batting.forEach(b => { if (!b.out) return; const k = team(sc.batting_team).key; if (!outs[k]) return; outs[k][b.out] = (outs[k][b.out] || 0) + 1; })));
  const lbl = { caught: "Caught", bowled: "Bowled", run_out: "Run out", hit_wicket: "Hit wicket", lbw: "LBW", stumped: "Stumped" };
  const outBar = k => { const o = outs[k], n = Object.values(o).reduce((a, b) => a + b, 0); return `<div class="tc-out ${k}"><b>${k === "t" ? "Tigers" : "Falcons"}</b><div class="outbar">${Object.entries(o).sort((a, b) => b[1] - a[1]).map(([kk, v]) => `<span style="flex:${v}" class="ob-${kk}" title="${lbl[kk] || kk}: ${v}"><b>${lbl[kk] || kk}</b> ${pct(v, n)}%</span>`).join("")}</div></div>`; };
  const tile = (big, unit, line) => `<div class="stat"><div class="big">${big}</div><span class="what">${unit}</span><p>${line}</p></div>`;
  el.innerHTML = `<div class="numbers">
      ${tile(pct(tossWin, tossN) + "%", "toss winners win", `${tossWin} of ${tossN} matches. ${pct(tossWin, tossN) > 55 ? "The coin matters." : pct(tossWin, tossN) < 45 ? "Losing the toss is no bad thing." : "The toss barely matters."}`)}
      ${tile(pct(batFirstWin, done.length) + "%", "won by the side batting first", `${batFirstWin} of ${done.length}. Chasing has won ${done.length - batFirstWin}.`)}
      ${tile(choseBat.length + "–" + choseBowl.length, "chose to bat – chose to bowl", `Choosing to bat won ${choseBat.filter(m => m.m.toss_winner === m.win.name).length} of ${choseBat.length}; choosing to bowl won ${choseBowl.filter(m => m.m.toss_winner === m.win.name).length} of ${choseBowl.length}.`)}
      ${byFmt.map(x => tile(pct(x.bf, x.n) + "%", `${x.f}s won batting first`, `${x.bf} of ${x.n} ${x.f.toLowerCase()} matches.`)).join("")}
    </div>
    <h3 class="tbl-title" style="margin-top:36px">How each side gets out</h3>${outBar("t")}${outBar("f")}`;
}

/* ---------------- 5. Phases of play ---------------- */
function renderPhases() {
  const el = $("#phasesBody"); if (!el) return;
  P.forEach(p => upName.set(p.name.toUpperCase(), p.id));
  const ph = (o, Lm) => { const k = Math.max(1, Math.round(Lm / 3)); return o <= k ? "pp" : o > Lm - k ? "death" : "mid"; };
  const TR = { t: { pp: { r: 0, b: 0 }, mid: { r: 0, b: 0 }, death: { r: 0, b: 0 } }, f: { pp: { r: 0, b: 0 }, mid: { r: 0, b: 0 }, death: { r: 0, b: 0 } } };
  const bat = new Map(), bowl = new Map(); const g = (m, id, z) => { const k = id + "|" + z; if (!m.has(k)) m.set(k, { id, z, r: 0, b: 0, w: 0 }); return m.get(k); };
  M.forEach(mm => mm.s.scorecards.forEach(sc => { const tk = /tiger/i.test(sc.batting_team) ? "t" : /falcon/i.test(sc.batting_team) ? "f" : null;
    (sc.commentary || []).filter(c => c.type === "ball").forEach(c => { const t = String(c.text).match(/^(.+?) TO (.+?), /); if (!t) return;
      const z = ph(parseInt(c.over) || 1, mm.m.overs), lr = legalRuns(c), bw = upName.get(t[1]), bt = upName.get(t[2]);
      if (tk) { TR[tk][z].r += lr.conceded; if (lr.legal) TR[tk][z].b++; }
      if (bt && lr.legal) { const e = g(bat, bt, z); e.r += lr.bat; e.b++; }
      if (bw) { const e = g(bowl, bw, z); e.r += lr.conceded; if (lr.legal) e.b++; if (c.badge.kind === "wicket" && !/RUN OUT/.test(t[0] + c.text)) e.w++; } }); }));
  const Z = [["pp", "Opening overs"], ["mid", "Middle overs"], ["death", "Finishing overs"]], rr = o => o.b ? r1(o.r / o.b * 6) : "–";
  const best = (m, z, score, min) => [...m.values()].filter(e => e.z === z && e.b >= min).sort((a, b) => score(b) - score(a)).slice(0, 3);
  el.innerHTML = `<div class="tbl-wrap"><table class="data ph-tbl"><thead><tr><th>Run rate</th>${Z.map(([, l]) => `<th>${l}</th>`).join("")}</tr></thead><tbody>
      ${["t", "f"].map(k => `<tr class="${k}"><td class="nm"><span class="chip"></span>${k === "t" ? "Tigers" : "Falcons"}</td>${Z.map(([z]) => `<td class="hi">${rr(TR[k][z])}</td>`).join("")}</tr>`).join("")}
    </tbody></table></div>
    <div class="ph-grid">${Z.map(([z, l]) => `<div class="ph-col"><h3 class="tbl-title">${l}</h3>
      <p class="label">Fastest scorers · 20+ balls</p><ol class="ph-list">${best(bat, z, e => e.r / e.b, 20).map(e => `<li>${plink(e.id, short(e.id))}<b>SR ${Math.round(e.r / e.b * 100)}</b><small>${e.r} off ${e.b}</small></li>`).join("") || "<li>Not enough balls yet.</li>"}</ol>
      <p class="label">Tightest bowlers · 4+ overs</p><ol class="ph-list">${best(bowl, z, e => -e.r / e.b, 24).map(e => `<li>${plink(e.id, short(e.id))}<b>${r1(e.r / e.b * 6)} an over</b><small>${e.w} wkts in ${ovs(e.b)} ov</small></li>`).join("") || "<li>Not enough overs yet.</li>"}</ol></div>`).join("")}</div>
    <p class="rank-note" style="margin-top:12px">Each innings is split into thirds by its over limit: the opening overs, the middle and the finishing overs (in a 6-over innings: overs 1–2, 3–4 and 5–6). Team run rates include extras.</p>`;
}

/* ---------------- 6. Player share card (on profiles) ---------------- */
function shareBlockPlayer(p) {
  if (!p.matches) return "";
  return `<h2 class="sec-t">Share</h2><section class="share-wrap">
    <div class="share-copy"><p>A stats card for ${esc(p.full_name || p.name)}, sized for WhatsApp and Instagram, and a link that shows this player's photo when pasted.</p>
      <p class="pl-link"><span class="label">Link</span> <code id="plUrl">${SITE_BASE}/p/${p.slug}</code></p>
      <div class="pick-actions"><button type="button" class="btn solid" id="plText">Copy link</button><a class="btn" id="plWa" target="_blank" rel="noopener">Send on WhatsApp ↗</a><button type="button" class="btn" id="plCopy">Copy image</button><button type="button" class="btn" id="plDl" hidden>Download image</button></div>
      <p class="label" id="plMsg"></p></div>
    <img class="card-img" id="plImg" alt="Stats card for ${esc(p.full_name || p.name)}" data-pid="${p.id}"></section>`;
}
async function drawPlayerCard(p) {
  const { c, x } = await canvasBase(p.tm.short + (p.captain ? " · captain" : ""));
  await drawPhoto(x, p, 60, 210, 400);
  const tx = 500, tw = 520; x.fillStyle = CC.red; x.font = `600 24px ${MONO}`; fitFont(x, (p.title || "").toUpperCase(), tw, 24, 600, MONO); x.fillText((p.title || "").toUpperCase(), tx, 250);
  x.fillStyle = CC.ink; const words = (p.full_name || p.name).toUpperCase().split(" "); let ly = 340;
  const lines = []; let cur = ""; x.font = `900 100px ${DISP}`; words.forEach(w => { const t = cur ? cur + " " + w : w; if (x.measureText(t).width > tw && cur) { lines.push(cur); cur = w; } else cur = t; }); lines.push(cur);
  lines.slice(0, 2).forEach(l => { fitFont(x, l, tw, 100, 900, DISP); x.fillText(l, tx, ly); ly += 96; });
  // honours
  let hx = tx; [["MVP", p.mvpN, CC.ink, CC.gold], ["MOM", p.pomN, CC.gold, CC.ink]].forEach(([l, v, bg, fg]) => { if (!v) return; x.fillStyle = bg; x.fillRect(hx, ly - 30, 150, 64); x.fillStyle = fg; x.font = `800 34px ${DISP}`; x.fillText(`${v} × ${l}`, hx + 14, ly + 14); hx += 166; });
  const B = p.bat, Wb = p.bowl, rows = [["RUNS", B.r.toLocaleString()], ["AVERAGE", r1(B.avg)], ["STRIKE RATE", r1(B.sr)], ["HIGHEST", B.hs ? `${B.hs.r}${B.hs.no ? "*" : ""}` : "–"], ["SIXES", B.s], ["WICKETS", Wb.w], ["ECONOMY", r1(Wb.econ)], ["BEST", Wb.best ? `${Wb.best.w}/${Wb.best.r}` : "–"], ["CATCHES", p.fld.c]];
  let y = 690; x.strokeStyle = CC.ink; x.lineWidth = 4; x.beginPath(); x.moveTo(60, y - 40); x.lineTo(1020, y - 40); x.stroke();
  rows.forEach((r, i) => { const cx = 60 + (i % 3) * 330, cy = y + Math.floor(i / 3) * 160; x.fillStyle = CC.muted; x.font = `500 24px ${MONO}`; x.fillText(r[0], cx, cy); x.fillStyle = CC.ink; x.font = `900 92px ${DISP}`; x.fillText(String(r[1]), cx, cy + 92); });
  x.fillStyle = CC.muted; x.font = `500 24px ${MONO}`; x.fillText(`${p.matches} MATCHES · RANK #${p.kAll || "–"} ALL-ROUNDER`, 60, 1180);
  return c;
}
window.fillPlayerCard = async function (id) {
  const img = $("#plImg"); if (!img || +img.dataset.pid !== id) return; const p = P.get(id);
  const c = await drawPlayerCard(p); img.src = c.toDataURL("image/png");
  const url = `${SITE_BASE}/p/${p.slug}`, msg = $("#plMsg"), txt = `${p.full_name || p.name}, ${p.title}: ${p.bat.r} runs, ${p.bowl.w} wickets, ${p.mvpN} MVP, ${p.pomN} MOM.\n${url}`;
  $("#plText").onclick = () => copyText(url, msg); $("#plCopy").onclick = () => copyCanvas(c, msg); $("#plWa").href = "https://wa.me/?text=" + encodeURIComponent(txt);
  const dl = $("#plDl"), fname = `bodevs-cricket-${p.slug}.png`;
  if (IS_LOCAL || !window.claude?.use) { dl.hidden = false; dl.onclick = () => downloadCanvas(c, fname); }
  else Promise.resolve(window.claude.use("downloads")).then(d => { if (!d) return; dl.hidden = false; dl.onclick = async () => { try { await d.save({ filename: fname, data: await new Promise(r => c.toBlob(r, "image/png")) }); msg.textContent = "Saved."; } catch {} }; }).catch(() => {});
};

/* ---------------- 7. Prediction game ---------------- */
let PRED = null;
async function renderPredict() {
  const el = $("#predictBody"); if (!el) return;
  if (!ON_SITE) { el.innerHTML = `<p class="dnb">The prediction game runs on <a href="${SITE_BASE}/#predict" target="_blank" rel="noopener">cricket.waqarahmed.net</a>.</p>`; return; }
  try { PRED = await (await fetch("/api/predictions", { cache: "no-store" })).json(); } catch { el.innerHTML = `<p class="dnb">Predictions are unavailable right now. Try again later.</p>`; return; }
  const ps = [...P.values()].sort((a, b) => (a.full_name || a.name).localeCompare(b.full_name || b.name));
  const opts = ps.map(p => `<option value="${p.id}">${esc(p.full_name || p.name)}</option>`).join("");
  const dl = new Date(PRED.open.deadline), open = Date.now() < dl, who = Object.keys(PRED.weeks[PRED.open.week] || {}).map(id => short(+id));
  let me = ""; try { me = localStorage.getItem("bdc-me") || ""; } catch {}
  // leaderboard from finished weeks
  const pts = new Map(); const add = (id, k, v) => { const e = pts.get(id) || { id, weeks: 0, win: 0, mvp: 0, pts: 0 }; e[k] += v; pts.set(id, e); };
  Object.entries(PRED.weeks).forEach(([wk, entries]) => { const W = WEEKS.find(w => isoDay(w.ws) === wk); if (!W) return;
    const tw = Object.entries(W.tw).map(([n, v]) => ({ k: team(n).key, w: v.w })), tt = tw.find(x => x.k === "t")?.w || 0, ff = tw.find(x => x.k === "f")?.w || 0, actual = tt > ff ? "t" : ff > tt ? "f" : "draw";
    Object.entries(entries).forEach(([pid, v]) => { if (!v.winner) return; add(+pid, "weeks", 1); if (v.winner === actual) { add(+pid, "win", 1); add(+pid, "pts", 1); } if (W.isMvp(+v.mvp)) { add(+pid, "mvp", 1); add(+pid, "pts", 2); } }); });
  const board = [...pts.values()].sort((a, b) => b.pts - a.pts || b.mvp - a.mvp);
  el.innerHTML = `<div class="pick-grid">
    <form class="pred-form" id="predForm">
      <p class="label">${open ? `Open until ${dl.toLocaleString("en-GB", { weekday: "long", hour: "numeric", minute: "2-digit" })}` : "Closed for this week"} · week of ${new Date(PRED.open.week + "T00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</p>
      <label class="cmp-sel"><span class="label">Your name</span><select id="predMe" required><option value="">Choose…</option>${opts}</select></label>
      <fieldset class="pred-win"><legend class="label">Who wins more matches this Sunday?</legend>
        <label class="t"><input type="radio" name="pw" value="t" required> Tigers</label><label class="f"><input type="radio" name="pw" value="f"> Falcons</label><label><input type="radio" name="pw" value="draw"> Level</label></fieldset>
      <label class="cmp-sel"><span class="label">MVP of the week</span><select id="predMvp" required><option value="">Choose…</option>${opts}</select></label>
      <button class="btn solid" type="submit" ${open ? "" : "disabled"}>Save my prediction</button>
      <p class="label" id="predMsg" aria-live="polite"></p>
      <p class="pv-fav">${who.length ? `Predicted so far: ${who.map(esc).join(", ")}. Picks are revealed after the deadline.` : "Nobody has predicted yet this week."}</p>
    </form>
    <div><h3 class="tbl-title">Season leaderboard</h3>${board.length ? `<div class="tbl-wrap"><table class="data"><thead><tr><th></th><th>Player</th><th>Weeks</th><th>Winner right</th><th>MVP right</th><th>Points</th></tr></thead><tbody>
      ${board.map((e, i) => `<tr><td class="rk">${i + 1}</td><td class="nm">${plink(e.id)}</td><td>${e.weeks}</td><td>${e.win}</td><td>${e.mvp}</td><td class="hi">${e.pts}</td></tr>`).join("")}</tbody></table></div>`
      : `<p class="dnb">The table fills in after the first week of predictions is scored on Monday.</p>`}
      <p class="rank-note" style="margin-top:12px">1 point for the right winner of the week, 2 for the right MVP. Scored automatically after the Monday sync.</p></div></div>`;
  if (me) $("#predMe").value = me;
  renderNextSunday();
  $("#predForm").addEventListener("submit", async e => { e.preventDefault(); const msg = $("#predMsg");
    const body = { player: +$("#predMe").value, winner: (el.querySelector('input[name="pw"]:checked') || {}).value, mvp: +$("#predMvp").value };
    try { localStorage.setItem("bdc-me", body.player); } catch {}
    try { const r = await fetch("/api/predictions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Couldn't save."); msg.textContent = "Saved. You can change it until the deadline."; setTimeout(renderPredict, 1200); }
    catch (err) { msg.textContent = err.message; } });
}

/* ---------------- 8. Fixtures & challengers ---------------- */
async function renderFixtures() {
  const el = $("#fixturesBody"); if (!el) return; let fx = [];
  try { fx = await (await fetch("data/fixtures.json", { cache: "no-cache" })).json(); } catch {}
  if (!Array.isArray(fx) || !fx.length) { markEmpty("fixtures", true); return; }
  markEmpty("fixtures", false);
  const up = fx.filter(f => f.status !== "played").sort((a, b) => a.date.localeCompare(b.date)), done = fx.filter(f => f.status === "played").sort((a, b) => b.date.localeCompare(a.date));
  const w = done.filter(f => f.result === "won").length, l = done.filter(f => f.result === "lost").length;
  const row = f => `<div class="fx-row"><span class="fx-d">${new Date(f.date + "T00:00").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}</span><b>BoDevs v ${esc(f.opponent)}</b><span>${esc(f.venue || "SportsX, G-12")}${f.format ? " · " + esc(f.format) : ""}</span>${f.status === "played" ? `<span class="fx-r ${f.result}">${esc(f.result || "")} ${esc(f.score || "")}</span>` : `<span class="fx-r up">Upcoming</span>`}</div>`;
  el.innerHTML = `<div class="numbers" style="margin-bottom:24px"><div class="stat lead"><div class="big">${w}–${l}</div><span class="what">record v outside teams</span><p>${done.length} played · ${up.length} coming up</p></div></div>
    ${up.length ? `<h3 class="tbl-title">Coming up</h3>${up.map(row).join("")}` : ""}${done.length ? `<h3 class="tbl-title" style="margin-top:28px">Results</h3>${done.map(row).join("")}` : ""}`;
}

/* ---------------- 9. Gallery ---------------- */
let GALLERY = [];
async function renderGallery() {
  const el = $("#galleryBody"); if (!el) return;
  try { GALLERY = await (await fetch("assets/gallery/gallery.json", { cache: "no-cache" })).json(); } catch { GALLERY = []; }
  if (!Array.isArray(GALLERY) || !GALLERY.length) { markEmpty("gallery", true); return; }
  markEmpty("gallery", false);
  const byWeek = new Map(); GALLERY.forEach(g => { if (!byWeek.has(g.week)) byWeek.set(g.week, []); byWeek.get(g.week).push(g); });
  el.innerHTML = [...byWeek.entries()].sort((a, b) => b[0].localeCompare(a[0])).map(([wk, list]) => { const W = WEEKS.find(w => isoDay(w.ws) === wk);
    return `<div class="gal-week" id="gal-${wk}"><h3 class="tbl-title">${W ? `Issue ${W.issue} · week of ${weekRange(W)}` : wk}</h3><div class="gal-grid">${list.map(g => `<a href="${esc(g.src)}" target="_blank" rel="noopener"><img src="${esc(g.src)}" alt="${esc(g.caption || "Match night at SportsX")}" loading="lazy">${g.caption ? `<span>${esc(g.caption)}</span>` : ""}</a>`).join("")}</div></div>`; }).join("");
  // add a photos link to that week's MVP slide
  WEEKS.forEach(W => { const n = (byWeek.get(isoDay(W.ws)) || []).length, s = document.querySelector(`#mvp-${W.issue} .mvp-week`); if (n && s && !s.querySelector(".gal-link")) s.insertAdjacentHTML("beforeend", ` · <a class="gal-link" href="#gallery">${n} photo${n > 1 ? "s" : ""}</a>`); });
}

/* ---------------- 10. Live bar (only while a match is on, only while the page is open) ---------------- */
let liveTimer = null;
async function checkLive() {
  if (!ON_SITE || document.hidden) return;
  let j; try { j = await (await fetch("/api/live", { cache: "no-store" })).json(); } catch { return; }
  const bar = $("#liveBar"), live = (j.matches || []).filter(m => m.state);
  if (!live.length) { bar.hidden = true; clearInterval(liveTimer); liveTimer = null; return; }
  bar.hidden = false;
  bar.innerHTML = `<div class="wrap">${live.map(m => { const sc = m.state.scorecards || [], cur = sc[sc.length - 1];
    const at = cur ? cur.batting.filter(b => b.at_crease).map(b => `${esc(b.name)} ${b.runs}${b.on_strike ? "*" : ""} (${b.balls})`).join(" · ") : "";
    const bw = cur ? cur.bowling.find(b => b.current) : null;
    return `<a class="live-m" href="https://tassadduq.com/cricket/match?id=${m.id}" target="_blank" rel="noopener"><span class="live-tag"><span class="dot"></span>Live · #${m.id}</span>
      <b>${cur ? `${esc(team(cur.batting_team).short)} ${cur.runs}/${cur.wickets} (${esc(cur.overs)} ov)` : esc(m.label)}</b>
      ${cur && cur.target ? `<span>Need ${cur.need} off ${cur.balls_left} balls</span>` : cur ? `<span>RR ${esc(cur.crr)}</span>` : ""}${at ? `<span>${at}</span>` : ""}${bw ? `<span>${esc(bw.name)} ${bw.wickets}/${bw.runs}</span>` : ""}</a>`; }).join("")}<span class="live-note">Updates every 30 seconds while a match is on</span></div>`;
  if (!liveTimer) liveTimer = setInterval(checkLive, 30e3);
}
document.addEventListener("visibilitychange", () => { if (!document.hidden) checkLive(); });

/* ---------------- section menu ---------------- */
document.addEventListener("click", e => { const m = document.querySelector(".navmenu[open]"); if (m && !m.contains(e.target)) m.open = false; if (e.target.closest(".navmenu a")) document.querySelector(".navmenu").open = false; });

/* ---------------- pages: This week / Players / Stats / Season / Club ---------------- */
const PAGES = [["home", "This week"], ["players", "Players"], ["stats", "Stats"], ["season", "Season"], ["club", "Club"]];
const PAGE_OF = { top: "home", since: "home", weekawards: "home", nextsunday: "home", digest: "home", picker: "home", predict: "home", matches: "home",
  squads: "players", form: "players", milestones: "players", tables: "players", compare: "players",
  records: "stats", partners: "stats", tactics: "stats", phases: "stats", shame: "stats",
  rivalry: "season", story: "season", numbers: "season",
  fixtures: "club", gallery: "club", kit: "club", play: "club" };
let CUR_PAGE = null;
function tagPages() {
  Object.entries(PAGE_OF).forEach(([id, p]) => { const el = document.getElementById(id); if (el) el.dataset.page = p; });
  document.querySelector("section.cover")?.setAttribute("data-page", "home");
  document.querySelector(".ticker")?.setAttribute("data-page", "home");
}
function applyPage(p, target) {
  const changed = CUR_PAGE !== p; CUR_PAGE = p;
  document.querySelectorAll("[data-page]").forEach(el => { el.hidden = el.dataset.page !== p || el.dataset.empty === "1"; });
  document.querySelectorAll(".pagetabs a").forEach(a => a.setAttribute("aria-current", a.dataset.p === p ? "page" : "false"));
  if (target) target.scrollIntoView({ block: "start", behavior: changed ? "instant" : "smooth" });
  else if (changed) window.scrollTo({ top: 0, behavior: "instant" });
}
// Called by the main router for every hash that isn't a player or match page.
window.pageRoute = function (hash) {
  const h = String(hash || "").replace(/^#/, "");
  if (!h) return applyPage(CUR_PAGE || "home");
  if (PAGES.some(([k]) => k === h)) return applyPage(h);
  const el = document.getElementById(h), sec = el && (el.dataset.page ? el : el.closest("[data-page]"));
  if (sec) applyPage(sec.dataset.page, el); else if (!CUR_PAGE) applyPage("home");
};
// Empty sections (no fixtures or photos yet) stay hidden, along with their menu links.
function markEmpty(id, empty) {
  const s = document.getElementById(id); if (!s) return;
  if (empty) s.dataset.empty = "1"; else delete s.dataset.empty;
  document.querySelectorAll(`.nm-panel a[href="#${id}"]`).forEach(a => a.hidden = empty);
  if (CUR_PAGE) applyPage(CUR_PAGE);
}

/* ---------------- since last Monday: what changed with this week's sync ---------------- */
// Ratings as they stood before the latest week (same formula as rateAll in index.html; keep the two in step).
function ranksBefore(skip) {
  const g = new Map(), e = id => { if (!g.has(id)) g.set(id, { id, inns: 0, no: 0, r: 0, b: 0, wb: 0, wr: 0, w: 0 }); return g.get(id); };
  let tr = 0, tb = 0;
  M.filter(m => !skip.has(m.id)).forEach(mm => { mm.inns.forEach(i => { tr += i.runs; tb += i.b; });
    mm.s.scorecards.forEach(sc => { sc.batting.forEach(x => { const a = e(x.id); a.inns++; a.r += x.runs; a.b += x.balls; if (!x.out) a.no++; });
      sc.bowling.forEach(x => { const a = e(x.id); a.wb += balls(x.overs); a.wr += x.runs; a.w += x.wickets; }); }); });
  const RR = tb ? tr / tb * 6 : 0, out = new Map();
  g.forEach(a => { const avg = a.inns ? ((a.inns - a.no ? a.r / (a.inns - a.no) : a.r) + a.r / a.inns) / 2 : 0, sr = a.b ? a.r / a.b * 100 : 0;
    const rBat = a.inns >= 3 ? Math.min(999, Math.round(avg * (sr / 100) * 6 * Math.min(1, a.inns / 15))) : 0;
    const econ = a.wb ? a.wr / a.wb * 6 : NaN, rBowl = a.wb >= 36 && econ ? Math.min(999, Math.round(a.w / (a.wb / 6) * 10 * (RR / econ) * 230 * Math.min(1, a.wb / 180))) : 0;
    out.set(a.id, { rBat, rBowl, rAll: Math.round(rBat * rBowl / 1000) }); });
  const rk = {}; ["rBat", "rBowl", "rAll"].forEach(r => { rk[r] = new Map(); [...out.entries()].filter(([, v]) => v[r] > 0).sort((a, b) => b[1][r] - a[1][r]).forEach(([id], i) => rk[r].set(id, i + 1)); });
  return rk;
}
let MOVES = new Map(); // "id|kBat" -> places moved (+ up, - down, "new")
function computeMoves() {
  MOVES = new Map(); if (!WEEK) return [];
  const prev = ranksBefore(new Set(WEEK.WM.map(m => m.id))), list = [];
  [["kBat", "rBat", "batting"], ["kBowl", "rBowl", "bowling"], ["kAll", "rAll", "all-rounder"]].forEach(([k, r, label]) => P.forEach(p => {
    if (!p[k]) return; const before = prev[r].get(p.id);
    const d = before ? before - p[k] : "new"; MOVES.set(p.id + "|" + k, d);
    if (d === "new" || d > 0) list.push({ p, k, label, d, now: p[k] }); }));
  return list.sort((a, b) => (b.d === "new" ? 0 : b.d) - (a.d === "new" ? 0 : a.d));
}
function renderSince() {
  const el = $("#sinceBody"); if (!el || !WEEK) return;
  const W = selW(), now = W === WEEK, moves = computeMoves(), items = [];
  const tw = Object.entries(W.tw);
  W.mvps.forEach(x => items.push(`<a class="sc-item" href="${purl(x.id)}"><span class="sc-k">${W.joint ? "Joint MVP" : "MVP"}</span>${esc(pname(x.id))} ${now ? "is" : "was"} player of the week</a>`));
  if (tw.length === 2) items.push(`<a class="sc-item" href="#digest"><span class="sc-k">Results</span>${team(tw[0][0]).short} ${tw[0][1].w}–${tw[1][1].w} ${team(tw[1][0]).short} ${now ? "this week" : "that week"}</a>`);
  milestonesIn(W).slice(0, 3).forEach(m => { const name = m.split(":")[0], id = [...P.values()].find(p => (p.full_name || p.name) === name)?.id;
    items.push(`<a class="sc-item" href="${id ? purl(id) : "#milestones"}"><span class="sc-k">Milestone</span>${esc(m)}</a>`); });
  // rank moves are measured against today's rankings, so only for the current week
  if (now) moves.filter(m => m.d !== "new").slice(0, 3).forEach(m => items.push(`<a class="sc-item" href="#tables"><span class="sc-k up">▲ ${m.d}</span>${esc(pname(m.p.id))} to #${m.now} in ${m.label}</a>`));
  // debut: the player's first match falls in this week
  const firstIds = new Set(W.WM.map(m => m.id));
  P.forEach(p => { const first = [...p.log.values()].sort((a, b) => a.mm.date - b.mm.date || a.mm.id - b.mm.id)[0]; if (first && firstIds.has(first.mm.id)) items.push(`<a class="sc-item" href="${purl(p.id)}"><span class="sc-k">Debut</span>${esc(pname(p.id))}</a>`); });
  el.innerHTML = `<span class="label sc-lab">${now ? "Since last Monday" : `Issue ${W.issue} · ${esc(weekRange(W))}`}</span><div class="sc-row">${items.join("")}</div>`;
  // rank-change arrows in the rankings lists
  const keys = ["kBat", "kBowl", "kAll"];
  document.querySelectorAll("#rankings .rank-col").forEach((col, ci) => col.querySelectorAll(".rank-list a").forEach(a => {
    const id = BySlug.get(a.getAttribute("href").slice(1)) ?? +(a.getAttribute("href").match(/player-(\d+)/) || [])[1], d = MOVES.get(id + "|" + keys[ci]);
    if (d === undefined || d === 0 || a.querySelector(".mv")) return;
    a.querySelector(".rk-pts")?.insertAdjacentHTML("afterbegin", d === "new" ? `<span class="mv new">New</span>` : `<span class="mv ${d > 0 ? "up" : "down"}" title="${d > 0 ? "Up" : "Down"} ${Math.abs(d)} since last week">${d > 0 ? "▲" : "▼"}${Math.abs(d)}</span>`); }));
}

/* ---------------- weekly awards + records broken ---------------- */
function recordsThisWeek(W) {
  if (typeof RECS === "undefined" || !RECS) return [];
  // one line per category and player; "most runs conceded" is not one to celebrate
  const ids = new Set(W.WM.map(m => m.id)), out = [], seen = new Set();
  ["bat", "bowl"].forEach(tab => RECS[tab].forEach(cat => cat.k !== "exp" && cat.rows.forEach((x, i) => {
    if (ids.has(x.mm.id) && !seen.has(cat.k + x.id)) { seen.add(cat.k + x.id); out.push({ tab, cat, x, i }); }
  })));
  return out.sort((a, b) => a.i - b.i);
}
function renderWeekAwards() {
  const el = $("#weekAwardsBody"); if (!el || !WEEK) return;
  const W = selW(), now = W === WEEK;
  $("#weekawards .kicker").textContent = now ? "Weekly awards" : `Weekly awards · Issue ${W.issue}`;
  $("#weekawards h2").textContent = now ? "The week's honours" : `Honours, week of ${weekRange(W)}`;
  const ids = new Set(W.WM.map(m => m.id)), pod = new Set(W.podium.map(x => x.id));
  const card = (k, p, stat, line) => p ? `<article class="wa-card ${p.tm.key}"><p class="kicker">${k}</p>
    <a class="wa-who" href="${purl(p.id)}">${miniThumb(p)}<b>${esc(pname(p.id))}</b></a><div class="wa-stat">${stat}</div><p class="wa-line">${line}</p></article>` : "";
  // each award goes to a different player, and never to an MVP, who has the cover
  const used = new Set(W.mvps.map(x => x.id)), pick = (list, ok = () => true) => { const x = list.find(e => !used.has(e.id ?? e.e.id) && ok(e)); if (x) used.add(x.id ?? x.e.id); return x; };
  // rising star: best week (60+ points) from someone outside the all-rounder top 5
  const rs = pick(W.ranked, e => (!P.get(e.id)?.kAll || P.get(e.id).kAll > 5) && e.pts >= 60);
  // bowler of the week: most wickets, then the cheapest economy
  const bw = pick(W.ranked.filter(e => e.bb > 0 && e.w > 0).sort((a, b) => b.w - a.w || a.rc / a.bb - b.rc / b.bb));
  const ct = pick(W.ranked.filter(e => e.c > 1).sort((a, b) => b.c - a.c || b.pts - a.pts));
  // most improved: this week's points per match against the player's average before this week (3+ earlier matches)
  const before = id => { const p = P.get(id); if (!p) return null; const l = [...p.log.values()].filter(x => x.mm.date < W.ws); return l.length >= 3 ? l.reduce((a, x) => a + impactOf(x), 0) / l.length : null; };
  const imp = pick(W.ranked.map(e => ({ e, now: e.pts / Math.max(1, e.m.size), was: before(e.id) })).filter(x => x.was !== null && x.now > x.was).sort((a, b) => (b.now - b.was) - (a.now - a.was)));
  // tough week: lowest points per match among regulars (5+ career matches)
  const tw = pick([...W.ranked].filter(e => (P.get(e.id)?.matches || 0) >= 5).sort((a, b) => a.pts / Math.max(1, a.m.size) - b.pts / Math.max(1, b.m.size)));
  const recs = recordsThisWeek(W);
  el.innerHTML = `<div class="wa-grid">
      ${bw ? card("Bowler of the week", P.get(bw.id), `${bw.w}/${bw.rc}`, `in ${ovs(bw.bb)} overs · econ ${r1(bw.rc / bw.bb * 6)}`) : ""}
      ${ct ? card("Safest hands", P.get(ct.id), `${ct.c} catch${ct.c > 1 ? "es" : ""}`, `Most catches ${now ? "this" : "that"} week.`) : ""}
      ${imp ? card("Most improved", P.get(imp.e.id), `+${Math.round(imp.now - imp.was)} pts`, `${Math.round(imp.now)} points a match ${now ? "this" : "that"} week, up from a ${Math.round(imp.was)} average.`) : ""}
      ${rs ? card("Rising star", P.get(rs.id), `${rs.pts} pts`, `${rs.r} runs · ${rs.w} wkt${rs.w === 1 ? "" : "s"} · ${rs.c} ct, from outside the top 5.`) : ""}
      ${tw ? card("Tough week", P.get(tw.id), `${tw.pts} pts`, "Quiet one. Back stronger on Sunday.") : ""}
    </div>
    <h3 class="tbl-title" style="margin-top:34px">${now ? "Records this week" : "Records set that week, still in the top 10"}</h3>
    ${recs.length ? `<ol class="rb-list">${recs.slice(0, 8).map(r => { const p = P.get(r.x.id);
      return `<li class="${p?.tm.key || ""}"><span class="rb-tag ${r.i ? "" : "top"}">${r.i ? `New #${r.i + 1}` : "New record"}</span><a href="#records" data-rt="${r.tab}" data-rc="${r.cat.k}"><b>${esc(r.cat.t)}</b> · ${esc(pname(r.x.id))} · ${r.cat.big(r.x)} <small>${esc(r.cat.unit(r.x))}</small></a></li>`; }).join("")}</ol>`
      : `<p class="dnb">No record-book entries ${now ? "this" : "that"} week.</p>`}
    <p class="rank-note" style="margin-top:12px">Weekly points: runs + 20 per wicket + 10 per catch or run out + 20 for each win he played a part in. The podium on the cover uses the same points.</p>`;
  el.querySelectorAll(".rb-list a").forEach(a => a.addEventListener("click", () => { REC.tab = a.dataset.rt; REC.cat[REC.tab] = a.dataset.rc; renderRecords(); }));
}

/* ---------------- next Sunday ---------------- */
function nextMilestones() {
  const next = [];
  P.forEach(p => { if (!p.matches) return; const tot = { r: p.bat.r, w: p.bowl.w, s: p.bat.s, c: p.fld.c };
    MS.filter(m => m.k !== "m").forEach(m => { const st = m.steps.find(x => x > tot[m.k]); if (st && st - tot[m.k] <= m.near) next.push({ p, m, st, gap: st - tot[m.k], ratio: (st - tot[m.k]) / m.near }); }); });
  return next.sort((a, b) => a.ratio - b.ratio);
}
function nextDeadline() {
  if (PRED?.open?.deadline) return new Date(PRED.open.deadline);
  const now = new Date(), pk = new Date(now.getTime() + 5 * 3600e3), sun = new Date(Date.UTC(pk.getUTCFullYear(), pk.getUTCMonth(), pk.getUTCDate() + ((7 - pk.getUTCDay()) % 7), 22));
  if (sun <= pk) sun.setUTCDate(sun.getUTCDate() + 7); return new Date(sun.getTime() - 5 * 3600e3);
}
let nsTimer = null;
function renderNextSunday() {
  const el = $("#nextSundayBody"); if (!el || !WEEK) return;
  const dl = nextDeadline(), left = () => { const ms = dl - Date.now(); if (ms <= 0) return "Closed for this week"; const d = Math.floor(ms / 864e5), h = Math.floor(ms % 864e5 / 36e5), m = Math.floor(ms % 36e5 / 6e4); return `${d ? d + "d " : ""}${h}h ${m}m`; };
  const entries = PRED ? Object.keys(PRED.weeks[PRED.open.week] || {}).length : null;
  // last week's prediction winner
  let lastWin = "";
  if (PRED) { const wk = isoDay(WEEK.ws), e = PRED.weeks[wk];
    if (e && Object.values(e).some(v => v.winner)) { const tw = Object.entries(WEEK.tw).map(([n, v]) => ({ k: team(n).key, w: v.w })), tt = tw.find(x => x.k === "t")?.w || 0, ff = tw.find(x => x.k === "f")?.w || 0, actual = tt > ff ? "t" : ff > tt ? "f" : "draw";
      const sc = Object.entries(e).filter(([, v]) => v.winner).map(([pid, v]) => ({ pid: +pid, pts: (v.winner === actual ? 1 : 0) + (WEEK.isMvp(+v.mvp) ? 2 : 0) })).sort((a, b) => b.pts - a.pts);
      lastWin = sc[0] && sc[0].pts ? `${sc.filter(x => x.pts === sc[0].pts).map(x => esc(pname(x.pid))).join(", ")} scored ${sc[0].pts} point${sc[0].pts > 1 ? "s" : ""}` : "Nobody scored a point"; }
    else lastWin = "Nobody predicted last week"; }
  const ms = nextMilestones().slice(0, 4), hot = formData().filter(x => x.trend === "hot").slice(0, 3);
  el.innerHTML = `<div class="ns-grid">
    <div class="ns-card ns-pred"><p class="kicker">Prediction game</p><div class="ns-big" id="nsLeft">${left()}</div><p class="ns-line">until picks close, Sunday 10 PM</p>
      <p class="ns-line">${entries === null ? "" : `<b>${entries}</b> prediction${entries === 1 ? "" : "s"} so far.`} ${lastWin ? `Last week: ${lastWin}.` : ""}</p>
      <a class="btn solid" href="#predict">Make your prediction</a></div>
    <div class="ns-card"><p class="kicker">Milestone watch</p>${ms.length ? `<ul class="ns-list">${ms.map(x => `<li>${miniThumb(x.p)}<span>${plink(x.p.id)} needs <b>${x.gap.toLocaleString()}</b> more for ${x.st.toLocaleString()} ${x.m.name}</span></li>`).join("")}</ul>` : `<p class="dnb">Nobody is close to a milestone this week.</p>`}</div>
    <div class="ns-card"><p class="kicker">In form, watch out for</p>${hot.length ? `<ul class="ns-list">${hot.map(x => `<li>${miniThumb(x.p)}<span>${plink(x.p.id)} <b>form ${Math.round(x.form)}</b> <small>(season avg ${Math.round(x.avg)})</small></span></li>`).join("")}</ul>` : `<p class="dnb">Nobody is on a hot streak.</p>`}<a class="btn small" href="#picker" style="margin-top:12px">Pick the sides</a></div>
  </div>`;
  clearInterval(nsTimer); nsTimer = setInterval(() => { const n = $("#nsLeft"); if (n) n.textContent = left(); else clearInterval(nsTimer); }, 60e3);
}

/* ---------------- the week picked in the MVP slider drives the weekly home sections ---------------- */
let SELW = null;
const selW = () => SELW || WEEK;
window.setWeek = i => { const W = WEEKS[i]; if (!W || W === selW()) return; SELW = W; renderSince(); renderWeekAwards(); renderDigest(); };

/* ---------------- run everything after the main render ---------------- */
window.renderExtras = function () {
  renderSince(); renderWeekAwards(); renderNextSunday(); renderStory(); renderPartnerships(); renderTactics(); renderPhases();
  renderDigest(); renderPredict(); renderFixtures(); renderGallery(); checkLive();
};
// show the right page straight away, before the data has loaded
tagPages();
if (!/^#(match-\d|player-\d)/.test(location.hash)) window.pageRoute(location.hash);
if (typeof D !== "undefined" && D && M) window.renderExtras();
