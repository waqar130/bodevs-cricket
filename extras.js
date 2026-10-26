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
  const tb = document.getElementById(id + "Text"); if (tb) tb.onclick = () => copyText(waText, msg);
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
// the week's headline: who won the week, by how much
function weekHeadline(W) {
  const tw = Object.entries(W.tw).map(([n, v]) => ({ k: team(n).key, short: team(n).short, ...v }));
  if (tw.length < 2) return { h: `Issue ${W.issue}`, d: "" };
  const [a, b] = tw.sort((x, y) => y.w - x.w || (y.for - y.against) - (x.for - x.against)), rd = a.for - a.against;
  if (a.w === b.w) return { h: `Honours even, ${a.w}–${b.w}`, d: rd ? `The ${esc(rd > 0 ? a.short : b.short)} edge it on runs, +${Math.abs(rd)}.` : "Level on runs too." };
  return { h: `${esc(a.short)} ${b.w ? "win" : "sweep"} the week ${a.w}–${b.w}`, d: `A run difference of ${rd > 0 ? "+" : ""}${rd} for the ${esc(a.short)}.` };
}
function renderDigest() {
  const el = $("#digestBody"); if (!el || !WEEK) return;
  const W = selW(), X = buildXR().raw, ids = new Set(W.WM.map(m => m.id));
  const now = W === WEEK, hd = weekHeadline(W), t = M.filter(m => m.win?.key === "t").length, f = M.filter(m => m.win?.key === "f").length;
  $("#digest h2").textContent = now ? "This week" : `Issue ${W.issue}`;
  const thumb = id => miniThumb(P.get(id)), nm = id => esc(pname(id));
  // results
  const results = [...W.WM].reverse().map(m => `<li><a class="dgr ${m.win?.key || ""}" href="#match-${m.id}"><span class="dgr-id">#${m.id} · ${esc(m.fmt)}</span><b>${m.win ? `${esc(m.win.short)} won` : esc(m.m.status_label)}</b><span class="dgr-m">${m.win ? `by ${esc(m.margin)}` : ""}</span>
    ${(m.poms || []).length ? `<span class="moms">${m.poms.map(x => `<span class="mom-b ${P.get(x.id)?.tm.key || ""}">★ ${m.poms.length > 1 ? "Joint MOM" : "MOM"} · ${esc(short(x.id))}</span>`).join("")}</span>` : ""}</a></li>`).join("");
  // podium
  const pod = W.podium.slice(0, 4).map(x => `<a class="dgp ${P.get(x.id)?.tm.key || ""} ${x.n === 1 ? "top" : ""}" href="${purl(x.id)}">${thumb(x.id)}<span><small>${x.role}</small><b>${nm(x.id)}</b><i>${x.r} runs · ${x.w} wkt${x.w === 1 ? "" : "s"} · ${x.c} ct</i></span><em>${x.pts}<small>pts</small></em></a>`).join("");
  // top performers
  const ob = X.overBat.filter(x => ids.has(x.mm.id)).sort((a, b) => b.r - a.r)[0], six = [...W.ranked].sort((a, b) => b.s - a.s)[0];
  const tiles = [
    W.knock && ["Best knock", `${W.knock.r}${W.knock.no ? "*" : ""}`, `${nm(W.knock.id)} · ${W.knock.b} balls, ${W.knock.s} sixes`],
    W.spell && ["Best spell", `${W.spell.w}/${W.spell.r}`, `${nm(W.spell.id)} · ${W.spell.ov} overs`],
    ob && ["Biggest over", ob.r, `${nm(ob.id)}${ob.bw ? ` off ${esc(short(ob.bw))}` : ""}`],
    six?.s && ["Most sixes", six.s, nm(six.id)],
  ].filter(Boolean).map(([k, v, s]) => `<div class="dgt"><span class="label">${k}</span><b>${v}</b><small>${s}</small></div>`).join("");
  const ms = milestonesIn(W), hot = formData().filter(x => x.trend === "hot").slice(0, 4);
  el.innerHTML = `<div class="dg-main">
      <div class="dg-mast"><span>The Monday digest</span><span>Issue ${W.issue} · ${esc(weekRange(W))}</span></div>
      <h3 class="dg-h">${hd.h}.</h3>
      <p class="dg-d">${hd.d} Season: <b>Tigers ${t}–${f} Falcons</b>.</p>
      <div class="dg-cols"><div>
      <h4 class="dg-k">Results</h4><ul class="dg-res">${results}</ul>
      <h4 class="dg-k">The podium</h4><div class="dg-pod">${pod}</div>
      </div><div>
      <h4 class="dg-k">Top performers</h4><div class="dg-tiles">${tiles}</div>
      ${ms.length ? `<h4 class="dg-k">Milestones</h4><p class="dg-chips">${ms.map(s => `<span>🏅 ${esc(s)}</span>`).join("")}</p>` : ""}
      ${hot.length ? `<h4 class="dg-k">In form</h4><p class="dg-chips">${hot.map(x => `<a href="${purl(x.p.id)}">🔥 ${esc(pname(x.p.id))} <small>form ${Math.round(x.form)}</small></a>`).join("")}</p>` : ""}
      </div></div>
    </div>`;
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
  renderLiveCentre(j);
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
const PAGES = [["live", "Live"], ["home", "This week"], ["players", "Players"], ["compare", "Compare"], ["stats", "Stats"], ["season", "Season"], ["club", "Club"]];
const PAGE_OF = { top: "home", since: "home", weekawards: "home", weeknumbers: "home", nextsunday: "home", digest: "home", picker: "home", predict: "home", matches: "home",
  playershero: "players", squads: "players", underrated: "players", form: "players", milestones: "players", tables: "players", compare: "compare",
  statshero: "stats", records: "stats", streaks: "stats", matchups: "stats", live: "live", archive: "club", getapp: "club", partners: "stats", tactics: "stats", phases: "stats", shame: "stats",
  seasonhero: "season", rivalry: "season", seasonawards: "season", seasonbook: "season", story: "season", numbers: "season",
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
  ["bat", "bowl", "fld"].forEach(tab => RECS[tab].forEach(cat => !["exp", "exs", "sxc", "lost"].includes(cat.k) && cat.rows.forEach((x, i) => {
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
    <p class="rank-note" style="margin-top:12px">Weekly points: runs + 20 per wicket + 10 per catch or run out + 10 for each win he played a part in. The podium on the cover uses the same points.</p>`;
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
  const dl = nextDeadline(), left = () => { const ms = dl - Date.now(); if (ms <= 0) return "Tonight"; const d = Math.floor(ms / 864e5), h = Math.floor(ms % 864e5 / 36e5), m = Math.floor(ms % 36e5 / 6e4); return `${d ? d + "d " : ""}${h}h ${m}m`; };
  const ms = nextMilestones().slice(0, 4), hot = formData().filter(x => x.trend === "hot").slice(0, 3);
  el.innerHTML = `<div class="ns-grid">
    <div class="ns-card ns-pred"><p class="kicker">Next match night</p><div class="ns-big" id="nsLeft">${left()}</div><p class="ns-line">until Sunday night at SportsX, G-12</p>
      <p class="ns-line">Season so far: <b>Tigers ${M.filter(m => m.win?.key === "t").length}–${M.filter(m => m.win?.key === "f").length} Falcons</b>.</p>
      <a class="btn solid" href="#picker">Pick the sides</a></div>
    <div class="ns-card"><p class="kicker">Milestone watch</p>${ms.length ? `<ul class="ns-list">${ms.map(x => `<li>${miniThumb(x.p)}<span>${plink(x.p.id)} needs <b>${x.gap.toLocaleString()}</b> more for ${x.st.toLocaleString()} ${x.m.name}</span></li>`).join("")}</ul>` : `<p class="dnb">Nobody is close to a milestone this week.</p>`}</div>
    <div class="ns-card"><p class="kicker">In form, watch out for</p>${hot.length ? `<ul class="ns-list">${hot.map(x => `<li>${miniThumb(x.p)}<span>${plink(x.p.id)} <b>form ${Math.round(x.form)}</b> <small>(season avg ${Math.round(x.avg)})</small></span></li>`).join("")}</ul>` : `<p class="dnb">Nobody is on a hot streak.</p>`}<a class="btn small" href="#picker" style="margin-top:12px">Pick the sides</a></div>
  </div>`;
  clearInterval(nsTimer); nsTimer = setInterval(() => { const n = $("#nsLeft"); if (n) n.textContent = left(); else clearInterval(nsTimer); }, 60e3);
}

/* ---------------- streaks, clutch, over records and the team record book ---------------- */
const CLOSE_RUNS = 15, CLOSE_WKTS = 3;
// a close match: won by fewer than 15 runs or by 3 wickets or fewer
function isClose(mm) {
  const r = String(mm.m.result || ""), byR = r.match(/by (\d+) run/), byW = r.match(/by (\d+) wicket/);
  return byR ? +byR[1] < CLOSE_RUNS : byW ? +byW[1] <= CLOSE_WKTS : false;
}
function clutchOf(p) {
  let n = 0, won = 0, pts = 0, r = 0, w = 0;
  p.log.forEach(l => { if (!isClose(l.mm)) return; n++; if (l.mm.win && l.mm.win.name === l.team) won++;
    const lr = l.bat.reduce((a, x) => a + x.r, 0), lw = l.bowl.reduce((a, x) => a + x.w, 0); r += lr; w += lw; pts += lr + 20 * lw + 10 * l.c; });
  return { n, won, pts, r, w, per: n ? pts / n : 0 };
}
const XR = { built: null };
function buildXR() {
  if (XR.built) return XR.built;
  const up = new Map([...P.values()].map(q => [q.name.toUpperCase(), q.id]));
  const top = (a, by, n = 5) => [...a].sort(by).slice(0, n);
  // streaks, in match order (each player's log is oldest first)
  const st = { s30: [], wk: [], noduck: [], sixes: [] };
  P.forEach(p => { if (!p.matches) return;
    const best = { s30: { n: 0 }, wk: { n: 0 }, noduck: { n: 0 } }, cur = { s30: 0, wk: 0, noduck: 0 }, from = {};
    const bump = (k, on, mm) => { if (on) { if (!cur[k]) from[k] = mm; cur[k]++; if (cur[k] > best[k].n) best[k] = { n: cur[k], from: from[k], to: mm }; } else cur[k] = 0; };
    p.log.forEach(l => { l.bat.forEach(x => { bump("s30", x.r >= 30, l.mm); bump("noduck", !(x.r === 0 && !x.no), l.mm); });
      if (l.bowl.length) bump("wk", l.bowl.some(x => x.w > 0), l.mm); });
    ["s30", "wk", "noduck"].forEach(k => { if (best[k].n) st[k].push({ id: p.id, ...best[k], live: cur[k] === best[k].n }); });
  });
  // consecutive sixes, over records, from the commentary (oldest ball first)
  const six = new Map(), sixM = new Map(), overBat = [], overBowl = [];
  M.forEach(mm => mm.s.scorecards.forEach(sc => {
    const balls = (sc.commentary || []).filter(c => c.type === "ball").reverse(), run = new Map(), byOver = new Map();
    balls.forEach(c => { const t = String(c.text).match(/^(.+?) TO (.+?), (.*)$/); if (!t) return; const bt = up.get(t[2]), k = c.badge.kind;
      if (!bt || k === "wide" || /^WIDE/.test(t[3])) return;
      const n = k === "six" ? (run.get(bt) || 0) + 1 : 0; run.set(bt, n);
      if (n > (six.get(bt)?.n || 0)) six.set(bt, { id: bt, n, mm });
      if (n >= 2 && n > (sixM.get(mm.id + "|" + bt)?.n || 0)) sixM.set(mm.id + "|" + bt, { id: bt, n, mm });
      const ov = Math.floor(parseFloat(c.over)), key = ov + "|" + bt, e = byOver.get(key) || { id: bt, ov, r: 0, s: 0, b: 0, mm, lbl: sc.label, bw: up.get(t[1]) };
      const mk = String(c.badge.mark); e.r += k === "six" ? 6 : k === "four" ? 4 : /^\d+$/.test(mk) ? +mk : 0; if (k === "six") e.s++; e.b++; byOver.set(key, e); });
    overBat.push(...byOver.values());
    (sc.commentary || []).filter(c => c.type === "over").forEach(c => { const nm = String(c.bowler).replace(/\s+\d+(\.\d+)?-\d+-\d+$/, ""), id = byName.get(nm); if (!id) return;
      overBowl.push({ id, r: parseInt(c.text) || 0, w: +((String(c.text).match(/(\d+) wicket/) || [])[1] || 0), ov: c.over_no, mm }); });
  }));
  st.sixes = [...six.values()].filter(x => x.n >= 2);
  // team records
  const inns = [];
  M.forEach(mm => mm.s.scorecards.forEach((sc, i) => { const last = i === mm.s.scorecards.length - 1, pps = mm.m.players_per_side || 0;
    inns.push({ mm, team: sc.batting_team, r: sc.runs, w: sc.wickets, ov: sc.overs, b: balls(sc.overs), last,
      done: sc.wickets >= pps || balls(sc.overs) >= (mm.m.overs || 0) * 6, chase: last && mm.win && mm.win.name === sc.batting_team }); }));
  const mg = mm => { const r = String(mm.m.result || ""); return { r: +((r.match(/by (\d+) run/) || [])[1] || 0), w: +((r.match(/by (\d+) wicket/) || [])[1] || 0) }; };
  const won = M.filter(m => m.win);
  XR.built = {
    raw: { overBat, overBowl, sixM: [...sixM.values()] },
    clutch: top([...P.values()].filter(p => p.matches).map(p => ({ p, ...clutchOf(p) })).filter(x => x.n >= 2), (a, b) => b.per - a.per),
    closeN: M.filter(isClose).length,
    streaks: [
      { t: "30+ scores in a row", rows: top(st.s30.filter(x => x.n >= 2), (a, b) => b.n - a.n), u: "innings" },
      { t: "Matches in a row with a wicket", note: "Matches he bowled in.", rows: top(st.wk.filter(x => x.n >= 2), (a, b) => b.n - a.n), u: "matches" },
      { t: "Innings without a duck", rows: top(st.noduck, (a, b) => b.n - a.n), u: "innings" },
      { t: "Sixes in a row", note: "Balls faced back to back, wides skipped.", rows: top(st.sixes, (a, b) => b.n - a.n), u: "sixes" },
    ],
    overs: [
      { t: "Most runs by a batter in an over", rows: top(overBat.filter(x => x.r > 0), (a, b) => b.r - a.r || a.b - b.b), big: x => x.r, u: x => `runs off ${x.b} ball${x.b > 1 ? "s" : ""}${x.bw ? ` from ${esc(short(x.bw))}` : ""}` },
      { t: "Most sixes in an over", rows: top(overBat.filter(x => x.s > 1), (a, b) => b.s - a.s || b.r - a.r), big: x => x.s, u: x => `sixes · ${x.r} runs${x.bw ? ` off ${esc(short(x.bw))}` : ""}` },
      { t: "Wicket maidens", note: "Overs with no runs and at least one wicket.", rows: top(overBowl.filter(x => x.r === 0 && x.w > 0), (a, b) => b.w - a.w), big: x => `${x.w}/0`, u: x => `in over ${x.ov}` },
      { t: "Cheapest overs with 2+ wickets", rows: top(overBowl.filter(x => x.w >= 2), (a, b) => b.w - a.w || a.r - b.r), big: x => `${x.w}/${x.r}`, u: x => `in over ${x.ov}` },
    ],
    teams: [
      { t: "Highest totals", rows: top(inns, (a, b) => b.r - a.r), big: x => `${x.r}/${x.w}`, u: x => `in ${x.ov} overs · ${esc(x.mm.fmt)}` },
      { t: "Lowest completed totals", note: "All out, or the full overs batted.", rows: top(inns.filter(x => x.done && !x.chase), (a, b) => a.r - b.r), big: x => `${x.r}/${x.w}`, u: x => `in ${x.ov} overs · ${esc(x.mm.fmt)}` },
      { t: "Best chases", rows: top(inns.filter(x => x.chase), (a, b) => b.r - a.r), big: x => `${x.r}/${x.w}`, u: x => `in ${x.ov} overs · won by ${esc(x.mm.margin)}` },
      { t: "Biggest wins by runs", rows: top(won.filter(m => mg(m).r), (a, b) => mg(b).r - mg(a).r).map(mm => ({ mm, team: mm.win.name })), big: x => mg(x.mm).r, u: x => `runs · ${esc(x.mm.fmt)}` },
      { t: "Biggest wins by wickets", rows: top(won.filter(m => mg(m).w), (a, b) => mg(b).w - mg(a).w || a.inns.at(-1).b - b.inns.at(-1).b).map(mm => ({ mm, team: mm.win.name })), big: x => mg(x.mm).w, u: x => `wickets · ${esc(x.mm.fmt)}` },
      { t: "Closest finishes", rows: top(won.filter(isClose), (a, b) => (mg(a).r || mg(a).w * 3) - (mg(b).r || mg(b).w * 3)).map(mm => ({ mm, team: mm.win.name })), big: x => esc(x.mm.margin), u: () => "" },
    ],
  };
  return XR.built;
}
function renderXR() {
  const el = $("#streaksBody"); if (!el || !M?.length) return;
  const X = buildXR(), when = mm => `<a href="#match-${mm.id}">#${mm.id} · ${fmtD(mm.date, { day: "numeric", month: "short" })}</a>`;
  const who = id => { const p = P.get(id); return p ? `<a class="xr-who" href="${purl(id)}">${miniThumb(p)}<b>${esc(pname(id))}</b></a>` : ""; };
  const tm = name => `<span class="xr-who"><span class="chip ${team(name).key}"></span><b>${esc(team(name).short || name)}</b></span>`;
  const card = (t, note, rows) => `<article class="xr-card"><h3 class="tbl-title">${t}</h3>${note ? `<p class="rank-note">${note}</p>` : ""}${rows.length ? `<ol class="xr-list">${rows.join("")}</ol>` : `<p class="dnb">Nothing yet.</p>`}</article>`;
  const li = (i, left, big, small) => `<li><span class="xr-n">${i + 1}</span>${left}<b class="xr-big">${big}</b><small class="xr-d">${small}</small></li>`;
  el.innerHTML = `
    <h3 class="xr-h">Clutch players</h3>
    <p class="rank-note">Points per match (runs + 20 per wicket + 10 per catch) in the ${X.closeN} close matches: won by under ${CLOSE_RUNS} runs or by ${CLOSE_WKTS} wickets or fewer. Two close matches or more.</p>
    <div class="xr-grid">${card("Best in close matches", "", X.clutch.map((x, i) => li(i, who(x.p.id), Math.round(x.per), `pts a match · ${x.r} runs, ${x.w} wkts · won ${x.won} of ${x.n}`)))}</div>
    <h3 class="xr-h">Streaks</h3>
    <div class="xr-grid">${X.streaks.map(s => card(s.t, s.note, s.rows.map((x, i) => li(i, who(x.id), x.n, `${s.u}${x.live ? ` · <span class="xr-live">still going</span>` : ""} · ${x.from && x.to ? (x.from === x.to ? when(x.to) : `${when(x.from)} to ${when(x.to)}`) : when(x.mm)}`)))).join("")}</div>
    <h3 class="xr-h">Over by over</h3>
    <div class="xr-grid">${X.overs.map(s => card(s.t, s.note, s.rows.map((x, i) => li(i, who(x.id), s.big(x), `${s.u(x)} · ${when(x.mm)}`)))).join("")}</div>
    <h3 class="xr-h">Team record book</h3>
    <div class="xr-grid">${X.teams.map(s => card(s.t, s.note, s.rows.map((x, i) => li(i, tm(x.team), s.big(x), `${s.u(x)}${s.u(x) ? " · " : ""}${when(x.mm)}`)))).join("")}</div>`;
}

/* ---------------- opportunity, value per chance and the underrated list ---------------- */
// how much of the game a player gets: innings batted and bowled, and his share of his side's balls
function oppOf(p) {
  if (p._opp) return p._opp;
  let tBat = 0, tBowl = 0, tFaced = 0, tBowled = 0, impact = 0, pts = 10 * p.fld.ro;
  p.log.forEach(l => {
    l.mm.s.scorecards.forEach(sc => {
      if (sc.batting_team === l.team) { tBat++; tFaced += sc.batting.reduce((a, x) => a + x.balls, 0); }
      if (sc.bowling_team === l.team) { tBowl++; tBowled += sc.bowling.reduce((a, x) => a + balls(x.overs), 0); }
    });
    const r = l.bat.reduce((a, x) => a + x.r, 0), w = l.bowl.reduce((a, x) => a + x.w, 0);
    if (r >= 10 || w > 0 || l.c > 0) impact++;
    pts += r + 20 * w + 10 * l.c;
  });
  const batCh = tBat ? p.bat.inns / tBat : 0, bowlCh = tBowl ? p.bowl.inns / tBowl : 0;
  const faceSh = tFaced ? p.bat.b / tFaced : 0, bowlSh = tBowled ? p.bowl.b / tBowled : 0, involved = p.bat.b + p.bowl.b;
  return p._opp = { batCh, bowlCh, chance: (batCh + bowlCh) / 2, faceSh, bowlSh, share: (faceSh + bowlSh) / 2,
    impact: p.matches ? impact / p.matches : 0, impactN: impact, pts, involved, value: involved ? pts / involved * 10 : 0 };
}
// underrated: below the club's median share of the game, ranked by value per chance
function underratedList() {
  const ps = [...P.values()].filter(p => p.matches >= 5).map(p => ({ p, o: oppOf(p) })).filter(x => x.o.involved >= 30);
  const mv = ps.reduce((a, x) => a + x.o.value, 0) / (ps.length || 1), sh = ps.map(x => x.o.share).sort((a, b) => a - b), ms = sh.length ? sh[Math.floor((sh.length - 1) / 2)] : 0;
  ps.forEach(x => { x.vs = x.o.value / mv; x.under = x.o.share <= ms; });
  return { ps: ps.sort((a, b) => b.o.value - a.o.value), mv, ms };
}
const pct0 = v => Math.round(v * 100) + "%";
function oppBlock(p) {
  if (!p.matches) return "";
  const o = oppOf(p), { mv } = underratedList(), cell = (l, b, sm) => `<div><span class="label">${l}</span><b>${b}</b><small>${sm}</small></div>`;
  return `<h3 class="tbl-title" style="margin-top:28px">Opportunity &amp; value</h3><div class="statgrid">
    ${cell("Chance to bat", pct0(o.batCh), `${p.bat.inns} of ${p.bat.inns + p.bat.dnb} team innings`)}
    ${cell("Chance to bowl", pct0(o.bowlCh), `${p.bowl.inns} of ${p.bowl.inns + p.bowl.dnb} team innings`)}
    ${cell("Share of balls faced", pct0(o.faceSh), "of his side's balls while he played")}
    ${cell("Share of overs bowled", pct0(o.bowlSh), "of his side's overs while he played")}
    ${cell("Impact rate", pct0(o.impact), `${o.impactN} of ${p.matches} matches with 10+ runs, a wicket or a catch`)}
    ${cell("Value per chance", r1(o.value), `points per 10 balls involved · club ${r1(mv)}`)}
  </div>`;
}
function renderUnderrated() {
  const el = $("#underratedBody"); if (!el || !M?.length) return;
  const { ps, mv, ms } = underratedList(), top3 = ps.filter(x => x.under).slice(0, 3);
  el.innerHTML = `${top3.length ? `<div class="ur-grid">${top3.map((x, i) => `<article class="ur-card ${x.p.tm.key}"><p class="kicker">${["Most underrated", "Underrated", "Underrated"][i]}</p>
      <a class="ur-who" href="${purl(x.p.id)}">${miniThumb(x.p)}<b>${esc(pname(x.p.id))}</b></a>
      <div class="ur-big">${r1(x.o.value)}<small>pts per 10 balls</small></div>
      <p class="ur-line">Gets ${pct0(x.o.share)} of his side's balls (club median ${pct0(ms)}) and returns ${x.vs >= 1 ? `${r1(x.vs)}× the club's value per chance` : `${pct0(x.vs)} of the club's value per chance`}.${i ? "" : " The best of anyone on a small share."} Makes an impact in ${pct0(x.o.impact)} of matches.</p></article>`).join("")}</div>` : ""}
    <h3 class="tbl-title" style="margin-top:30px">Everyone: chance and value</h3>
    <div class="tbl-wrap"><table class="data"><thead><tr><th>Player</th><th>M</th><th>Bat chance</th><th>Bowl chance</th><th>Balls faced</th><th>Overs bowled</th><th>Impact rate</th><th>Value</th><th>v club</th></tr></thead><tbody>
    ${ps.map(x => `<tr><td class="nm ${x.p.tm.key}"><span class="chip"></span>${plink(x.p.id, x.p.name)}${x.under && top3.includes(x) ? ` <span class="ur-tag">Underrated</span>` : ""}</td><td>${x.p.matches}</td><td>${pct0(x.o.batCh)}</td><td>${pct0(x.o.bowlCh)}</td><td>${pct0(x.o.faceSh)}</td><td>${pct0(x.o.bowlSh)}</td><td>${pct0(x.o.impact)}</td><td class="hi">${r1(x.o.value)}</td><td>${r1(x.vs)}×</td></tr>`).join("")}
    </tbody></table></div>
    <p class="rank-note" style="margin-top:12px">Value = points (runs + 20 per wicket + 10 per catch or run out) per 10 balls he faced or bowled; the club average is ${r1(mv)}. Balls faced and overs bowled are his share of his side's while he played. Underrated: a share of the game at or below the club median (${pct0(ms)}), ranked by value. Five matches and 30 balls or more.</p>`;
}

/* ---------------- the rivalry: tale of the tape ---------------- */
function renderTape() {
  const host = $("#rival"); if (!host || !M?.length) return;
  let el = $("#tape"); if (!el) { el = document.createElement("div"); el.id = "tape"; host.after(el); }
  const K = ["t", "f"], old = [...M].reverse(), done = M.filter(m => m.win);
  const by = f => Object.fromEntries(K.map(k => [k, f(k)]));
  const wins = by(k => done.filter(m => m.win.key === k));
  const firstBat = m => team(m.s.scorecards[0]?.batting_team || "").key;
  const inns = by(k => M.flatMap(m => m.s.scorecards.filter(sc => team(sc.batting_team).key === k).map(sc => ({ m, sc }))));
  const sum = (a, f) => a.reduce((x, y) => x + f(y), 0);
  const streak = k => { let cur = 0, best = 0; old.forEach(m => { if (!m.win) return; if (m.win.key === k) { cur++; best = Math.max(best, cur); } else cur = 0; }); return { cur, best }; };
  const mg = (m, u) => +((String(m.m.result || "").match(new RegExp(`by (\\d+) ${u}`)) || [])[1] || 0);
  const team_ = k => [...P.values()].filter(p => p.tm.key === k && p.matches);
  const lead = (k, f) => team_(k).sort((a, b) => f(b) - f(a))[0];
  const mvps = by(k => WEEKS.reduce((a, w) => a + w.mvps.filter(x => P.get(x.id)?.tm.key === k).length, 0));
  const toss = by(k => M.filter(m => m.m.toss_winner && team(m.m.toss_winner).key === k));
  const close = by(k => done.filter(m => isClose(m) && m.win.key === k).length);
  const fmts = [...new Set(done.map(m => m.fmt))];
  const ex = by(k => sum(M.flatMap(m => m.s.scorecards.filter(sc => team(sc.bowling_team).key === k)), sc => sc.extras?.total || 0));
  const fld = by(k => team_(k).reduce((a, p) => ({ c: a.c + p.fld.c, d: a.d + p.fld.drop, ro: a.ro + p.fld.ro }), { c: 0, d: 0, ro: 0 }));
  const wk = by(k => sum(inns[k === "t" ? "f" : "t"], x => x.sc.wickets)), conceded = by(k => sum(inns[k === "t" ? "f" : "t"], x => x.sc.runs)), bBalls = by(k => sum(inns[k === "t" ? "f" : "t"], x => balls(x.sc.overs)));
  const pl = (p, v) => p ? `${esc(short(p.id))} <small>${v}</small>` : "–";
  // [label, tigers, falcons, numbers to compare (or null), higher is better]
  const rows = [
    ["Wins", wins.t.length, wins.f.length, [wins.t.length, wins.f.length], 1],
    ...fmts.map(f => [`Wins in ${f}`, wins.t.filter(m => m.fmt === f).length, wins.f.filter(m => m.fmt === f).length, [wins.t.filter(m => m.fmt === f).length, wins.f.filter(m => m.fmt === f).length], 1]),
    ["Wins batting first", ...K.map(k => wins[k].filter(m => firstBat(m) === k).length), K.map(k => wins[k].filter(m => firstBat(m) === k).length), 1],
    ["Wins chasing", ...K.map(k => wins[k].filter(m => firstBat(m) !== k).length), K.map(k => wins[k].filter(m => firstBat(m) !== k).length), 1],
    ["Close matches won", close.t, close.f, [close.t, close.f], 1],
    ["Current winning run", ...K.map(k => streak(k).cur), K.map(k => streak(k).cur), 1],
    ["Longest winning run", ...K.map(k => streak(k).best), K.map(k => streak(k).best), 1],
    ["Biggest win by runs", ...K.map(k => Math.max(0, ...wins[k].map(m => mg(m, "run")))), K.map(k => Math.max(0, ...wins[k].map(m => mg(m, "run")))), 1],
    ["Biggest win by wickets", ...K.map(k => Math.max(0, ...wins[k].map(m => mg(m, "wicket")))), K.map(k => Math.max(0, ...wins[k].map(m => mg(m, "wicket")))), 1],
    ["Tosses won", toss.t.length, toss.f.length, [toss.t.length, toss.f.length], 1],
    ["Won after winning the toss", ...K.map(k => toss[k].filter(m => m.win?.key === k).length), K.map(k => toss[k].filter(m => m.win?.key === k).length), 1],
    ["Runs scored", ...K.map(k => sum(inns[k], x => x.sc.runs).toLocaleString()), K.map(k => sum(inns[k], x => x.sc.runs)), 1],
    ["Run rate", ...K.map(k => r1(sum(inns[k], x => x.sc.runs) / sum(inns[k], x => balls(x.sc.overs)) * 6)), K.map(k => sum(inns[k], x => x.sc.runs) / sum(inns[k], x => balls(x.sc.overs))), 1],
    ["Sixes", ...K.map(k => sum(inns[k], x => sum(x.sc.batting, b => b.sixes))), K.map(k => sum(inns[k], x => sum(x.sc.batting, b => b.sixes))), 1],
    ["Fours", ...K.map(k => sum(inns[k], x => sum(x.sc.batting, b => b.fours))), K.map(k => sum(inns[k], x => sum(x.sc.batting, b => b.fours))), 1],
    ["Highest total", ...K.map(k => { const x = [...inns[k]].sort((a, b) => b.sc.runs - a.sc.runs)[0]; return x ? `${x.sc.runs}/${x.sc.wickets}` : "–"; }), K.map(k => Math.max(0, ...inns[k].map(x => x.sc.runs))), 1],
    ["Average first-innings score", ...K.map(k => { const a = inns[k].filter(x => x.sc.innings_no === 1); return a.length ? Math.round(sum(a, x => x.sc.runs) / a.length) : "–"; }), K.map(k => { const a = inns[k].filter(x => x.sc.innings_no === 1); return a.length ? sum(a, x => x.sc.runs) / a.length : 0; }), 1],
    ["Wickets taken", wk.t, wk.f, [wk.t, wk.f], 1],
    ["Economy", ...K.map(k => r1(conceded[k] / bBalls[k] * 6)), K.map(k => conceded[k] / bBalls[k]), 0],
    ["Extras given away", ex.t, ex.f, [ex.t, ex.f], 0],
    ["Catches", fld.t.c, fld.f.c, [fld.t.c, fld.f.c], 1],
    ["Catch success", ...K.map(k => pct0(fld[k].c / ((fld[k].c + fld[k].d) || 1))), K.map(k => fld[k].c / ((fld[k].c + fld[k].d) || 1)), 1],
    ["Run outs", fld.t.ro, fld.f.ro, [fld.t.ro, fld.f.ro], 1],
    ["Weekly MVPs", mvps.t, mvps.f, [mvps.t, mvps.f], 1],
    ["Men of the Match", ...K.map(k => done.reduce((a, m) => a + (m.poms || []).filter(x => team(x.tm).key === k).length, 0)), K.map(k => done.reduce((a, m) => a + (m.poms || []).filter(x => team(x.tm).key === k).length, 0)), 1],
    ["Top run scorer", ...K.map(k => { const p = lead(k, p => p.bat.r); return pl(p, p?.bat.r); }), null],
    ["Top wicket taker", ...K.map(k => { const p = lead(k, p => p.bowl.w); return pl(p, p?.bowl.w); }), null],
    ["Six king", ...K.map(k => { const p = lead(k, p => p.bat.s); return pl(p, p?.bat.s); }), null],
    ["Safest hands", ...K.map(k => { const p = lead(k, p => p.fld.c); return pl(p, p?.fld.c); }), null],
  ];
  let wt = 0, wf = 0;
  const body = rows.map(([l, a, b, n, hi]) => { const aw = n && n[0] !== n[1] && ((n[0] > n[1]) === !!hi), bw = n && n[0] !== n[1] && !aw; if (aw) wt++; if (bw) wf++;
    return `<div class="cmp-row"><span class="cmp-v ca ${aw ? "win" : ""}">${a}</span><span class="cmp-l">${l}</span><span class="cmp-v cb ${bw ? "win" : ""}">${b}</span></div>`; }).join("");
  el.innerHTML = `<h3 class="tbl-title tape-t">Tale of the tape</h3>
    <div class="cmp-grp tape-h"><span class="ca">Tigers ${wt}</span><b>Categories</b><span class="cb">${wf} Falcons</span></div>
    <div class="cmp-rows">${body}</div>`;
}

/* ---------------- the week in numbers: team of the week, above his usual, overs, drops, stands, rivalry swing ---------------- */
function renderWeekNumbers() {
  const el = $("#weekNumbersBody"); if (!el || !WEEK) return;
  const W = selW(), now = W === WEEK, ids = new Set(W.WM.map(m => m.id)), inW = mm => ids.has(mm.id), X = buildXR().raw;
  const who = id => { const p = P.get(id); return p ? `<a class="xr-who" href="${purl(id)}">${miniThumb(p)}<b>${esc(pname(id))}</b></a>` : ""; };
  const li = (i, left, big, small) => `<li><span class="xr-n">${i + 1}</span>${left}<b class="xr-big">${big}</b><small class="xr-d">${small}</small></li>`;
  const list = rows => rows.length ? `<ol class="xr-list">${rows.join("")}</ol>` : `<p class="dnb">Nothing ${now ? "this" : "that"} week.</p>`;
  const at = mm => `<a href="#match-${mm.id}">#${mm.id}</a>`;
  // team of the week: the top five on weekly points, with the role they played
  const role = e => e.w * 20 > e.r * 1.5 ? "Bowler" : e.r > e.w * 20 * 1.5 ? "Batter" : "All-rounder";
  const xi = W.ranked.slice(0, 5).map(e => ({ e, p: P.get(e.id) })).filter(x => x.p);
  // above his usual: this week's points a match against his season rate (runs + 20 per wicket + 10 per catch)
  const usual = p => { const l = [...p.log.values()]; return l.length ? l.reduce((a, x) => a + x.bat.reduce((s, b) => s + b.r, 0) + 20 * x.bowl.reduce((s, b) => s + b.w, 0) + 10 * x.c, 0) / l.length : 0; };
  const above = W.ranked.map(e => { const p = P.get(e.id), u = p ? usual(p) : 0, wk = (e.r + 20 * e.w + 10 * e.c) / Math.max(1, e.m.size); return { e, p, u, wk, x: u ? wk / u : 0 }; })
    .filter(x => x.p && x.u > 0 && x.x >= 1.2 && x.wk >= 40).sort((a, b) => b.x - a.x).slice(0, 4);
  // overs
  const ob = X.overBowl.filter(x => inW(x.mm)), obat = X.overBat.filter(x => inW(x.mm)), six = X.sixM.filter(x => inW(x.mm));
  const dear = [...ob].sort((a, b) => b.r - a.r)[0], best = [...ob].filter(x => x.w > 0).sort((a, b) => b.w - a.w || a.r - b.r)[0];
  const bigBat = [...obat].sort((a, b) => b.r - a.r)[0], sixer = [...six].sort((a, b) => b.n - a.n)[0];
  const ovRow = (k, x, big, line) => x ? `<li><span class="wn-k">${k}</span>${who(x.id)}<b class="xr-big">${big}</b><small class="xr-d">${line}</small></li>` : "";
  // drops
  const dr = DROPS.filter(d => inW(d.mm)), cost = dr.reduce((a, d) => a + d.r, 0), dear2 = [...dr].sort((a, b) => b.r - a.r)[0];
  const lives = new Map(); dr.forEach(d => lives.set(d.bt, (lives.get(d.bt) || 0) + 1)); const lucky = [...lives].sort((a, b) => b[1] - a[1])[0];
  // stands
  const stands = buildPartnerships().filter(s => inW(s.mm) && s.ids.length > 1).sort((a, b) => b.runs - a.runs || a.balls - b.balls).slice(0, 3);
  // rivalry swing
  const before = M.filter(m => m.date < W.ws && m.win), upTo = M.filter(m => m.date <= W.we && m.win);
  const sc = list => ({ t: list.filter(m => m.win.key === "t").length, f: list.filter(m => m.win.key === "f").length });
  const b0 = sc(before), b1 = sc(upTo), wk = sc(W.WM.filter(m => m.win));
  const rd = Object.entries(W.tw).map(([n, v]) => ({ k: team(n).key, d: v.for - v.against }));
  const wm = weekMore(W, now);
  const H3 = (n, t) => `<h3 class="iw-h"><span>${String(n).padStart(2, "0")}</span>${t}</h3>`;
  const tile = (cls, t, inner) => `<article class="iw-card ${cls}"><h4 class="iw-ck">${t}</h4>${inner}</article>`;
  el.innerHTML = `<div class="iw">
    ${H3(1, "The matches")}${wm.recaps}
    </div><div class="iw-band"><div class="wrap">${H3(2, "Team of the week")}
      <div class="iw-xi">${xi.map((x, i) => `<a class="iw-pl ${x.p.tm.key}" href="${purl(x.p.id)}"><span class="iw-pn">${i + 1}</span><span class="iw-ph">${x.p.photo ? `<img src="${x.p.photo}" alt="" loading="lazy">` : `<b>${esc((x.p.full_name || x.p.name).split(" ").map(w => w[0]).join("").slice(0, 2))}</b>`}</span>
        <span class="iw-role">${role(x.e)}</span><b class="iw-name">${esc(pname(x.p.id))}</b><small>${x.e.r} runs · ${x.e.w} wkt${x.e.w === 1 ? "" : "s"} · ${x.e.c} ct</small><em>${x.e.pts}<small>pts</small></em></a>`).join("")}</div>
    </div></div><div class="iw">
    ${H3(3, "By the numbers")}
    <div class="iw-grid">
      ${tile("swing", "Rivalry swing", `<p class="wn-big">${b0.t}–${b0.f} <span class="wn-arrow">→</span> ${b1.t}–${b1.f}<small>Tigers–Falcons, before and after the week</small></p>
        <p class="wn-line">${wk.t + wk.f ? `The week went ${wk.t > wk.f ? `Tigers ${wk.t}–${wk.f}` : wk.f > wk.t ? `Falcons ${wk.f}–${wk.t}` : `${wk.t}–${wk.f}, honours even`}` : "No results that week"}${rd.length ? `, with a run difference of ${rd.map(x => `${x.d > 0 ? "+" : ""}${x.d} for the ${x.k === "t" ? "Tigers" : "Falcons"}`).find((_, i) => rd[i].d > 0) || "level"}` : ""}.</p>`)}
      ${tile("drops", "Drops", dr.length ? `<p class="wn-big">${dr.length}<small>catches put down, costing ${cost} runs</small></p>
        ${dear2 ? `<p class="wn-line">Costliest: ${plink(dear2.fl)} dropped ${plink(dear2.bt)}${dear2.bw ? (dear2.bw === dear2.fl ? " off his own bowling" : ` off ${plink(dear2.bw)}`) : ""}, who added ${dear2.r} more. ${at(dear2.mm)}</p>` : ""}
        ${lucky && lucky[1] > 1 ? `<p class="wn-line">Lucky charm of the week: ${plink(lucky[0])}, dropped ${lucky[1]} times.</p>` : ""}` : `<p class="dnb">Every chance taken ${now ? "this" : "that"} week.</p>`)}
      ${tile("overs", "Overs of the week", ob.length || obat.length ? `<ol class="xr-list wn-ov">
        ${ovRow("Biggest over", bigBat, bigBat ? bigBat.r : "", bigBat ? `runs off ${bigBat.b} balls${bigBat.bw ? ` from ${esc(short(bigBat.bw))}` : ""} · ${at(bigBat.mm)}` : "")}
        ${ovRow("Best over", best, best ? `${best.w}/${best.r}` : "", best ? `over ${best.ov} · ${at(best.mm)}` : "")}
        ${ovRow("Costliest over", dear, dear ? dear.r : "", dear ? `runs in over ${dear.ov} · ${at(dear.mm)}` : "")}
        ${ovRow("Sixes in a row", sixer, sixer ? sixer.n : "", sixer ? `back to back · ${at(sixer.mm)}` : "")}</ol>` : `<p class="dnb">No ball-by-ball data for this week.</p>`)}
      ${tile("above", "Above his usual", list(above.map((x, i) => li(i, who(x.p.id), r1(x.x) + "×", `${Math.round(x.wk)} pts a match against a usual ${Math.round(x.u)}`))))}
      ${tile("stands", "Best stands", list(stands.map((s, i) => li(i, `<span class="xr-who"><b>${s.ids.map(id => esc(short(id))).join(" & ")}</b></span>`, s.runs + (s.unbroken ? "*" : ""), `off ${s.balls} balls · ${s.wkt}${["st", "nd", "rd"][s.wkt - 1] || "th"} wicket · ${at(s.mm)}`))))}
    </div>
    ${wm.more.replace('<h3 class="xr-h">More from the week</h3>', H3(4, "More from the week"))}`;

  $("#weeknumbers .kicker").textContent = now ? "The week in numbers" : `The week in numbers · Issue ${W.issue}`;
}

/* ---------------- players cover: the squad in numbers and four faces worth knowing ---------------- */
function renderPlayersHero() {
  const el = $("#playersHeroBody"); if (!el || !M?.length) return;
  const ps = [...P.values()].filter(p => p.matches), n = k => ps.filter(p => p.tm.key === k).length;
  const used = new Set(), pick = (label, list, v, u) => { const p = list.find(q => !used.has(q.id)); if (!p) return null; used.add(p.id); return { label, p, v: v(p), u }; };
  const by = f => [...ps].sort((a, b) => f(b) - f(a));
  const F = typeof formData === "function" ? formData().filter(x => x.trend !== "new") : [];
  const stars = [
    F.length && pick("Hottest right now", F.map(x => x.p), p => Math.round(F.find(x => x.p === p).form), "form score"),
    pick("Run machine", by(p => p.bat.r), p => p.bat.r.toLocaleString(), "runs"),
    pick("Wicket taker", by(p => p.bowl.w), p => p.bowl.w, "wickets"),
    pick("Six hitter", by(p => p.bat.s), p => p.bat.s, "sixes")].filter(Boolean);
  const card = s => `<a class="sh-star ${s.p.tm.key}" href="${purl(s.p.id)}"><span class="sh-ph">${s.p.photo ? `<img src="${s.p.photo}" alt="" loading="lazy">` : ""}</span><small>${s.label}</small><b>${esc(pname(s.p.id))}</b><em>${s.v} <i>${s.u}</i></em></a>`;
  el.innerHTML = `<div class="sh-grid"><div class="sh-copy">
      <p class="sh-kicker">The dressing room · ${ps.length} players</p>
      <h2 class="sh-head">The faces behind the numbers.</h2>
      <p class="sh-dek">BoDevs on weekdays, SportsX on Sunday nights. Who's in form, who's underrated and who's closest to the next big number.</p>
      <div class="sh-stats"><div><b>${n("t")}</b><span>Tigers</span></div><div><b>${n("f")}</b><span>Falcons</span></div><div><b>${ps.filter(p => p.keeper).length}</b><span>keepers</span></div>
        <div><b>${ps.filter(p => p.bowl_style === "fast").length}</b><span>pace bowlers</span></div><div><b>${ps.filter(p => p.bowl_style === "spin").length}</b><span>spinners</span></div><div><b>${ps.filter(p => p.captain).length}</b><span>captains</span></div></div>
    </div>
    <div class="sh-stars ph-stars">${stars.map(card).join("")}</div></div>`;
}

/* ---------------- stats cover: the headline records, as big numbers ---------------- */
function renderStatsHero() {
  const el = $("#statsHeroBody"); if (!el || !M?.length || typeof RECS === "undefined" || !RECS) return;
  const X = buildXR().raw, inns = M.flatMap(m => m.s.scorecards), ballsN = inns.reduce((a, sc) => a + (sc.commentary || []).filter(c => c.type === "ball").length, 0);
  const cat = (tab, k) => RECS[tab].find(c => c.k === k), rec = (tab, k, label) => { const c = cat(tab, k), x = c?.rows[0]; return x ? { label, big: c.big(x), unit: c.unit(x), id: x.id, mm: x.mm } : null; };
  const bo = [...X.overBat].sort((a, b) => b.r - a.r)[0], sx = [...X.sixM].sort((a, b) => b.n - a.n)[0];
  const tiles = [rec("bat", "hs", "Highest score"), rec("bat", "f50", "Fastest fifty"), rec("bowl", "bbi", "Best bowling"), rec("bat", "six", "Most sixes in an innings"),
    bo && { label: "Biggest over", big: bo.r, unit: `runs off ${bo.b} balls${bo.bw ? ` from ${esc(short(bo.bw))}` : ""}`, id: bo.id, mm: bo.mm },
    sx && { label: "Sixes in a row", big: sx.n, unit: "back to back", id: sx.id, mm: sx.mm }].filter(Boolean);
  el.innerHTML = `<p class="sh-kicker">The stats desk · ${M.length} matches</p>
    <h2 class="sh-head st-head">Every number, ball by ball.</h2>
    <p class="sh-dek">${ballsN.toLocaleString()} balls in the commentary, turned into records, streaks, matchups and the occasional embarrassment.</p>
    <div class="st-recs">${tiles.map(t => `<a class="st-rec" href="#match-${t.mm.id}"><small>${t.label}</small><b>${t.big}</b><i>${t.unit}</i><span>${esc(pname(t.id))} · #${t.mm.id}</span></a>`).join("")}</div>`;
}

/* ---------------- season cover: the headline, the numbers and the three big award holders ---------------- */
function renderSeasonHero() {
  const el = $("#seasonHeroBody"); if (!el || !M?.length) return;
  if (typeof addUniqueAwards === "function") addUniqueAwards();
  const ms = chrono(), t = M.filter(m => m.win?.key === "t").length, f = M.filter(m => m.win?.key === "f").length;
  const inns = M.flatMap(m => m.s.scorecards), runs = inns.reduce((a, sc) => a + sc.runs, 0), sixes = inns.reduce((a, sc) => a + sc.batting.reduce((x, b) => x + b.sixes, 0), 0), wk = inns.reduce((a, sc) => a + sc.wickets, 0);
  const hi = [...inns].sort((a, b) => b.runs - a.runs)[0], rr = runs / inns.reduce((a, sc) => a + balls(sc.overs), 0) * 6;
  const name = (typeof SEASON !== "undefined" && SEASON === "all") ? "All-time" : ((typeof SEASONS !== "undefined" && SEASONS.find(s => s.id === SEASON)?.name) || "The season");
  const head = t === f ? `All square at ${t}–${f}.` : `${t > f ? "Tigers" : "Falcons"} lead ${Math.max(t, f)}–${Math.min(t, f)}.`;
  // three different faces: go down the headline awards, taking a holder (or joint holder) not already shown
  const used = new Set(), picks = [];
  ["MVP of the season", "Golden Bat", "Golden Ball", "Six King", "Man of the Match", "Safest Hands", "Golden Gloves", "Mr Economy", "Strike Rate King", "Clutch King", "Partnership King", "Run-out King"].some(k => {
    const a = AWARDS.find(x => x.k === k); if (!a?.list.length) return false; const top = a.n(a.list[0]);
    const p = a.list.find(q => a.n(q) === top && !used.has(q.id)); if (p) { used.add(p.id); picks.push([a, p]); } return picks.length === 3; });
  const starOf = ([a, p]) => p ? `<a class="sh-star ${p.tm.key}" href="${purl(p.id)}"><span class="sh-ph">${p.photo ? `<img src="${p.photo}" alt="" loading="lazy">` : ""}</span><small>${esc(a.k)}${a.list.length > 1 && a.n(a.list[1]) === a.n(a.list[0]) ? " (joint)" : ""}</small><b>${esc(pname(p.id))}</b><em>${a.v(p)} <i>${esc(a.n(p) === 1 && a.u1 ? a.u1 : a.u)}</i></em></a>` : "";
  el.innerHTML = `<div class="sh-grid"><div class="sh-copy">
      <p class="sh-kicker">${esc(name)} · ${fmtD(ms[0].date, { day: "numeric", month: "short" })} – ${fmtD(ms.at(-1).date, { day: "numeric", month: "short", year: "numeric" })}</p>
      <h2 class="sh-head">${head}</h2>
      <p class="sh-dek">${M.length} matches at SportsX, G-12: ${runs.toLocaleString()} runs, ${sixes.toLocaleString()} sixes and ${wk} wickets with the Tilde ball.</p>
      <div class="sh-stats"><div><b>${M.length}</b><span>matches</span></div><div><b>${runs.toLocaleString()}</b><span>runs</span></div><div><b>${sixes}</b><span>sixes</span></div><div><b>${wk}</b><span>wickets</span></div><div><b>${r1(rr)}</b><span>runs an over</span></div><div><b>${hi.runs}/${hi.wickets}</b><span>top total · ${esc(team(hi.batting_team).short)}</span></div></div>
    </div>
    <div class="sh-stars">${picks.map(starOf).join("")}</div></div>`;
}

/* ---------------- season awards: every award with its holder and the race behind ---------------- */
function renderSeasonAwards() {
  const el = $("#seasonAwardsBody"); if (!el || typeof AWARDS === "undefined" || !AWARDS.length) return;
  const fmt = (a, x) => a.dec ? r1(x) : Math.round(x).toLocaleString();
  if (typeof addUniqueAwards === "function") addUniqueAwards();
  const card = a => {
    const list = a.list.slice(0, 5), h = list[0]; if (!h) return "";
    const n = a.n(h), second = list[1], gap = second ? Math.abs(n - a.n(second)) : 0, tied = second && gap === 0;
    const lead = !second ? "Only qualifier so far." : tied ? `Level with ${plink(second.id)}.` : `Leads ${plink(second.id)} by ${fmt(a, gap)} ${a.unit}.`;
    const chasing = a.ok ? [...P.values()].filter(p => p.matches && !a.ok(p) && (a.k === "Mr Economy" ? p.bowl.b >= 60 : p.bat.b >= 75))
      .sort((x, y) => a.k === "Mr Economy" ? x.bowl.econ - y.bowl.econ : y.bat.sr - x.bat.sr).slice(0, 2) : [];
    return `<article class="sa-card" id="award-${slugify(a.k)}">
      <p class="kicker">${esc(a.k)}${a.note ? ` <span class="sa-note">(${esc(a.note)})</span>` : ""}</p>
      <a class="sa-holder ${h.tm.key}" href="${purl(h.id)}">${miniThumb(h)}<span><small>${tied ? "Joint holder" : "Holder"}</small><b>${esc(pname(h.id))}</b></span><span class="sa-v">${a.v(h)}<small>${esc(n === 1 && a.u1 ? a.u1 : a.u)}</small></span></a>
      <p class="sa-lead">${lead}</p>
      <ol class="sa-race">${list.slice(1).map((p, i) => `<li><span class="xr-n">${i + 2}</span>${plink(p.id)}<b>${a.v(p)}</b></li>`).join("")}</ol>
      ${chasing.length ? `<p class="sa-chase">Not yet qualified: ${chasing.map(p => `${plink(p.id)} (${esc(a.need(p))}, ${a.k === "Mr Economy" ? r1(p.bowl.econ) + " an over" : Math.round(p.bat.sr) + " SR"})`).join("; ")}.</p>` : ""}
    </article>`;
  };
  // awards by kind
  const GROUPS = [["Honours", ["MVP of the season", "Man of the Match", "Clutch King", "Most Valuable per Ball", "Iron Man"]],
    ["Batting", ["Golden Bat", "Six King", "Strike Rate King", "Powerplay Punisher", "The Wall", "Mr Consistent", "The Finisher", "Over Destroyer", "Partnership King", "The Survivor"]],
    ["Bowling", ["Golden Ball", "Mr Economy", "Death-over Specialist", "Dot-ball Machine", "Comeback Kid"]],
    ["Fielding & keeping", ["Safest Hands", "Golden Gloves", "Run-out King"]]];
  const used = new Set(), groups = GROUPS.map(([g, names]) => { const list = names.map(n => AWARDS.find(a => a.k === n)).filter(Boolean); list.forEach(a => used.add(a)); return [g, list]; });
  const rest = AWARDS.filter(a => !used.has(a)); if (rest.length) groups.push(["More", rest]);
  // milestones across the club: how many have unlocked each, and who leads
  const ps = [...P.values()].filter(p => p.matches), X = buildXR().raw;
  const inns = p => [...p.log.values()].flatMap(l => l.bat), spells = p => [...p.log.values()].flatMap(l => l.bowl);
  const MS2 = [["Half-century", p => inns(p).filter(b => b.r >= 50).length, "fifties"], ["Century", p => inns(p).filter(b => b.r >= 100).length, "hundreds"],
    ["Six machine", p => inns(p).filter(b => b.s >= 5).length, "innings with 5+ sixes"], ["Over destroyer", p => X.overBat.filter(x => x.id === p.id && x.s >= 5).length, "overs with 5+ sixes"],
    ["Finisher", p => inns(p).filter(b => b.r >= 30 && b.no).length, "unbeaten 30+ scores"], ["Three-wicket haul", p => spells(p).filter(b => b.w >= 3).length, "hauls"],
    ["Wicket maiden", p => X.overBowl.filter(x => x.id === p.id && x.r === 0 && x.w > 0).length, "wicket maidens"], ["Safe pair", p => [...p.log.values()].filter(l => l.c >= 3).length, "matches with 3+ catches"],
    ["MVP of the week", p => p.mvpN, "weeks"], ["Man of the Match", p => p.pomN, "matches"]];
  const ONE = {"fifties":"fifty","hundreds":"hundred","innings with 5+ sixes":"innings with 5+ sixes","overs with 5+ sixes":"over with 5+ sixes","unbeaten 30+ scores":"unbeaten 30+ score","hauls":"haul","wicket maidens":"wicket maiden","matches with 3+ catches":"match with 3+ catches","weeks":"week","matches":"match"};
  const msRows = MS2.map(([k, f, u]) => { const got = ps.map(p => ({ p, n: f(p) })).filter(x => x.n > 0).sort((a, b) => b.n - a.n), top = got[0];
    return `<tr><td class="nm">${k}</td><td class="hi">${got.length}<small class="label"> of ${ps.length}</small></td><td>${top ? `${plink(top.p.id)} <small class="label">${top.n} ${top.n === 1 ? (ONE[u] || u) : u}</small>` : "–"}</td><td class="sa-also">${got.slice(1, 4).map(x => `${esc(short(x.p.id))} ${x.n}`).join(" · ") || "–"}</td></tr>`; }).join("");
  el.innerHTML = `${groups.map(([g, list]) => `<h3 class="sa-gh">${g}<span>${list.length} award${list.length === 1 ? "" : "s"}</span></h3><div class="sa-grid">${list.map(card).join("")}</div>`).join("")}
    <h3 class="sa-gh">Milestones<span>across the club</span></h3>
    <div class="tbl-wrap"><table class="data sa-ms"><thead><tr><th>Milestone</th><th>Unlocked by</th><th>Leader</th><th>Next</th></tr></thead><tbody>${msRows}</tbody></table></div>
    <p class="rank-note" style="margin-top:12px">Re-counted after every Monday sync. Each player's trophy cabinet shows the awards he holds and the milestones he has unlocked.</p>`;
}

/* ---------------- shared helpers for the season book, weekly extras and player extras ---------------- */
const mPts = l => l.bat.reduce((a, x) => a + x.r, 0) + 20 * l.bowl.reduce((a, x) => a + x.w, 0) + 10 * l.c;   // match points, as the MVP race counts them
const dShort = d => fmtD(d, { day: "numeric", month: "short" });
const matchLink = mm => `<a href="#match-${mm.id}">#${mm.id} · ${dShort(mm.date)}</a>`;
// order each batter came in, by his first ball faced in the commentary
function battingOrder(sc) {
  if (sc._order) return sc._order;
  const up = new Map([...P.values()].map(q => [q.name.toUpperCase(), q.id])), seen = [];
  (sc.commentary || []).filter(c => c.type === "ball").reverse().forEach(c => { const t = String(c.text).match(/^.+? TO (.+?), /); const id = t && up.get(t[1]); if (id && !seen.includes(id)) seen.push(id); });
  sc.batting.forEach(x => { if (!seen.includes(x.id)) seen.push(x.id); });
  return sc._order = seen;
}

/* ---------------- season book: turning points, months, formats, MVP race, superlatives ---------------- */
function renderSeasonBook() {
  const el = $("#seasonBookBody"); if (!el || !M?.length) return;
  const ms = chrono(), K = { t: "Tigers", f: "Falcons" };
  // 1. turning points
  const tp = []; let t = 0, f = 0, leader = null, run = { k: null, n: 0, from: null }, best = { t: { n: 0 }, f: { n: 0 } };
  ms.forEach(m => { if (!m.win) return; const k = m.win.key; k === "t" ? t++ : f++;
    const now = t > f ? "t" : f > t ? "f" : null;
    if (now && now !== leader) tp.push({ m, txt: leader ? `${K[now]} take the lead, ${Math.max(t, f)}–${Math.min(t, f)}` : `${K[now]} go ahead, ${Math.max(t, f)}–${Math.min(t, f)}` });
    if (!now && leader) tp.push({ m, txt: `All square at ${t}–${f}` });
    leader = now || leader && null;
    if (run.k === k) run.n++; else run = { k, n: 1, from: m }; if (run.n > best[k].n) best[k] = { n: run.n, from: run.from, to: m }; });
  ["t", "f"].forEach(k => { const b = best[k]; if (b.n >= 2) tp.push({ m: b.to, txt: `${K[k]} complete their longest run: ${b.n} wins in a row, from ${matchLink(b.from)}` }); });
  const big = (u) => [...ms].filter(m => m.win && new RegExp(`by \\d+ ${u}`).test(m.m.result || "")).sort((a, b) => +(b.m.result.match(/by (\d+)/)[1]) - +(a.m.result.match(/by (\d+)/)[1]))[0];
  [big("run"), big("wicket")].forEach(m => m && tp.push({ m, txt: `Biggest win: ${m.win.short} by ${esc(m.margin)}` }));
  tp.sort((a, b) => a.m.date - b.m.date || a.m.id - b.m.id);
  // 2. month by month
  const months = new Map(); ms.forEach(m => { const k = m.date.getFullYear() + "-" + String(m.date.getMonth() + 1).padStart(2, "0"); if (!months.has(k)) months.set(k, []); months.get(k).push(m); });
  const monthRows = [...months].map(([k, list]) => { const ids = new Set(list.map(m => m.id)), tot = new Map();
    list.forEach(m => (m.perf || []).forEach(e => { const x = tot.get(e.id) || { id: e.id, r: 0, w: 0 }; x.r += e.r; x.w += e.w; tot.set(e.id, x); }));
    const tr = [...tot.values()].sort((a, b) => b.r - a.r)[0], tw = [...tot.values()].sort((a, b) => b.w - a.w)[0];
    const six = list.reduce((a, m) => a + m.s.scorecards.reduce((x, sc) => x + sc.batting.reduce((y, b) => y + b.sixes, 0), 0), 0);
    const mvps = new Map(); WEEKS.filter(w => w.WM.some(m => ids.has(m.id))).forEach(w => w.mvps.forEach(x => mvps.set(x.id, (mvps.get(x.id) || 0) + 1)));
    const topMvp = [...mvps].sort((a, b) => b[1] - a[1])[0];
    return `<tr><td class="nm">${fmtD(list[0].date, { month: "long" })}</td><td>${list.length}</td><td>${list.filter(m => m.win?.key === "t").length}–${list.filter(m => m.win?.key === "f").length}</td>
      <td>${tr ? `${plink(tr.id, short(tr.id))} ${tr.r}` : "–"}</td><td>${tw && tw.w ? `${plink(tw.id, short(tw.id))} ${tw.w}` : "–"}</td><td>${topMvp ? `${plink(topMvp[0], short(topMvp[0]))} ${topMvp[1]}` : "–"}</td><td>${six}</td></tr>`; });
  // 3. format by format
  const fmts = [...new Set(ms.map(m => m.fmt))].map(fm => { const list = ms.filter(m => m.fmt === fm), inns = list.flatMap(m => m.s.scorecards.map(sc => ({ m, sc })));
    const runs = inns.reduce((a, x) => a + x.sc.runs, 0), balls_ = inns.reduce((a, x) => a + balls(x.sc.overs), 0);
    const bi = inns.flatMap(x => x.sc.batting.map(b => ({ m: x.m, b }))).sort((a, b) => b.b.runs - a.b.runs || a.b.balls - b.b.balls)[0];
    const bs = inns.flatMap(x => x.sc.bowling.map(b => ({ m: x.m, b }))).sort((a, b) => b.b.wickets - a.b.wickets || a.b.runs - b.b.runs)[0];
    const fi = inns.filter(x => x.sc.innings_no === 1);
    return `<tr><td class="nm">${esc(fm)}</td><td>${list.length}</td><td>${list.filter(m => m.win?.key === "t").length}–${list.filter(m => m.win?.key === "f").length}</td><td>${fi.length ? Math.round(fi.reduce((a, x) => a + x.sc.runs, 0) / fi.length) : "–"}</td><td>${r1(runs / balls_ * 6)}</td>
      <td>${bi ? `${plink(bi.b.id, short(bi.b.id))} ${bi.b.runs}${bi.b.out ? "" : "*"} (${bi.b.balls})` : "–"}</td><td>${bs ? `${plink(bs.b.id, short(bs.b.id))} ${bs.b.wickets}/${bs.b.runs}` : "–"}</td></tr>`; });
  // 4. MVP points race, week by week (top 5 by total)
  const wk = [...WEEKS].reverse(), acc = new Map(), series = new Map();
  wk.forEach((w, i) => { w.ranked.forEach(e => acc.set(e.id, (acc.get(e.id) || 0) + e.pts)); acc.forEach((v, id) => { if (!series.has(id)) series.set(id, Array(wk.length).fill(0)); series.get(id)[i] = v; });
    series.forEach((arr, id) => { if (!acc.has(id)) return; arr[i] = acc.get(id); }); });
  series.forEach(arr => { for (let i = 1; i < arr.length; i++) if (!arr[i]) arr[i] = arr[i - 1]; });
  const top5 = [...series].sort((a, b) => b[1].at(-1) - a[1].at(-1)).slice(0, 5), mx = Math.max(1, ...top5.map(x => x[1].at(-1)));
  const CW = 900, CH = 280, L = 44, R = 130, T = 16, B = 34, xs = i => L + (wk.length > 1 ? i / (wk.length - 1) : 0) * (CW - L - R), ys = v => T + (CH - T - B) * (1 - v / mx);
  const pal = ["var(--red)", "var(--ink)", "var(--falcon)", "var(--tiger)", "#1f8a4c"];
  const race = `<svg class="ch" viewBox="0 0 ${CW} ${CH}" role="img" aria-label="Cumulative MVP points, top five">
    ${[0, .25, .5, .75, 1].map(g => `<line class="ch-grid" x1="${L}" x2="${CW - R}" y1="${ys(mx * g)}" y2="${ys(mx * g)}"/><text class="ch-ax" x="${L - 6}" y="${ys(mx * g) + 4}" text-anchor="end">${Math.round(mx * g)}</text>`).join("")}
    ${wk.map((w, i) => `<text class="ch-ax" x="${xs(i)}" y="${CH - 10}" text-anchor="middle">${w.issue}</text>`).join("")}
    ${top5.map(([id, arr], j) => `<polyline fill="none" stroke="${pal[j]}" stroke-width="3" points="${arr.map((v, i) => `${xs(i).toFixed(1)},${ys(v).toFixed(1)}`).join(" ")}"/><text class="ch-end" x="${CW - R + 8}" y="${ys(arr.at(-1)) + 5}" fill="${pal[j]}">${esc(short(id))} ${arr.at(-1)}</text>`).join("")}
  </svg><p class="rank-note">Weekly MVP points (runs + 20 per wicket + 10 per catch or run out + 10 per win he played a part in), added up issue by issue.</p>`;
  // 5. superlatives
  const ps = [...P.values()].filter(p => p.matches);
  const cv = p => { const s = [...p.log.values()].flatMap(l => l.bat.map(b => b.r)); if (s.length < 10) return null; const mean = s.reduce((a, b) => a + b, 0) / s.length; if (mean < 15) return null;
    const sd = Math.sqrt(s.reduce((a, b) => a + (b - mean) ** 2, 0) / s.length); return { p, v: sd / mean, mean, n: s.length }; };
  const steady = ps.map(cv).filter(Boolean).sort((a, b) => a.v - b.v)[0];
  const imp = ps.filter(p => p.matches >= 8).map(p => { const l = [...p.log.values()], h = Math.floor(l.length / 2), a = l.slice(0, h), b = l.slice(h);
    return { p, a: a.reduce((s, x) => s + mPts(x), 0) / a.length, b: b.reduce((s, x) => s + mPts(x), 0) / b.length }; }).sort((x, y) => (y.b - y.a) - (x.b - x.a))[0];
  const deb = ps.map(p => { const l = [...p.log.values()][0]; return l && { p, l, v: mPts(l) }; }).filter(Boolean).sort((a, b) => b.v - a.v)[0];
  const hot = formData().sort((a, b) => b.form - a.form)[0];
  const sup = [
    steady && ["Most consistent batter", steady.p, `${Math.round(steady.mean)} a knock, the steadiest spread of scores over ${steady.n} innings`],
    imp && imp.b > imp.a && ["Most improved", imp.p, `${Math.round(imp.a)} → ${Math.round(imp.b)} points a match, first half of his matches to the second`],
    deb && ["Best debut", deb.p, `${deb.v} points in his first match, ${matchLink(deb.l.mm)}`],
    hot && ["Hottest form now", hot.p, `form ${Math.round(hot.form)} over his last five matches, against a season ${Math.round(hot.avg)}`],
  ].filter(Boolean);
  el.innerHTML = `
    <h3 class="xr-h">Turning points</h3>
    <ol class="tp-list">${tp.map(x => `<li><span class="tp-d">${dShort(x.m.date)}</span><span>${x.txt}</span><a href="#match-${x.m.id}">#${x.m.id}</a></li>`).join("")}</ol>
    <h3 class="xr-h">Month by month</h3>
    <div class="tbl-wrap"><table class="data"><thead><tr><th>Month</th><th>M</th><th>Tigers–Falcons</th><th>Top scorer</th><th>Top wickets</th><th>Weekly MVPs</th><th>6s</th></tr></thead><tbody>${monthRows.join("")}</tbody></table></div>
    <h3 class="xr-h">Format by format</h3>
    <div class="tbl-wrap"><table class="data"><thead><tr><th>Format</th><th>M</th><th>Tigers–Falcons</th><th>Avg 1st inns</th><th>Run rate</th><th>Best innings</th><th>Best spell</th></tr></thead><tbody>${fmts.join("")}</tbody></table></div>
    <h3 class="xr-h">Player of the season race</h3>${race}
    <h3 class="xr-h">Season superlatives</h3>
    <div class="ur-grid">${sup.map(([k, p, line]) => `<article class="ur-card ${p.tm.key}"><p class="kicker">${k}</p><a class="ur-who" href="${purl(p.id)}">${miniThumb(p)}<b>${esc(pname(p.id))}</b></a><p class="ur-line">${line}.</p></article>`).join("")}</div>`;
}

/* ---------------- weekly extras: movers, milestones, recaps, week v last week ---------------- */
function weekMore(W, now) {
  const idx = WEEKS.indexOf(W), prev = WEEKS[idx + 1], ids = new Set(W.WM.map(m => m.id)), X = buildXR().raw;
  // rankings movers (measured against today's rankings, so for the current week)
  let movers = "";
  if (now) { computeMoves(); const L = { kBat: "Batting", kBowl: "Bowling", kAll: "All-rounder" }, list = [];
    MOVES.forEach((d, key) => { const [id, k] = key.split("|"); if (typeof d === "number" && d !== 0) list.push({ id: +id, k, d, now: P.get(+id)?.[k] }); });
    const up = list.filter(x => x.d > 0).sort((a, b) => b.d - a.d).slice(0, 5), down = list.filter(x => x.d < 0).sort((a, b) => a.d - b.d).slice(0, 5);
    const row = x => `<li><span class="mv ${x.d > 0 ? "up" : "down"}">${x.d > 0 ? "▲" : "▼"} ${Math.abs(x.d)}</span>${plink(x.id)} <small>${L[x.k]} #${x.now}</small></li>`;
    movers = `<div class="xr-card"><h3 class="tbl-title">Rankings movers</h3><div class="mvr"><ul>${up.map(row).join("") || "<li class=\"dnb\">No climbers.</li>"}</ul><ul>${down.map(row).join("") || "<li class=\"dnb\">No fallers.</li>"}</ul></div></div>`; }
  // milestones as cards
  const ms = milestonesIn(W).map(s => { const [name, what] = s.split(": "); const p = [...P.values()].find(q => (q.full_name || q.name) === name); return p && { p, what }; }).filter(Boolean);
  const msHtml = `<div class="xr-card"><h3 class="tbl-title">Milestones reached</h3>${ms.length ? `<div class="ms-cards">${ms.map(x => `<a class="ms-card ${x.p.tm.key}" href="${purl(x.p.id)}">${miniThumb(x.p)}<span><b>${esc(x.what)}</b><small>${esc(pname(x.p.id))}</small></span></a>`).join("")}</div>` : `<p class="dnb">None ${now ? "this" : "that"} week.</p>`}</div>`;
  // match recaps
  const recap = mm => { const perf = mm.perf || [], bat = [...perf].sort((a, b) => b.r - a.r)[0], bowl = [...perf].filter(e => e.w).sort((a, b) => b.w - a.w || a.rc - b.rc)[0];
    const ob = X.overBat.filter(x => x.mm === mm).sort((a, b) => b.r - a.r)[0], k = mm.win?.key || "";
    const sides = [mm.m.team_a.name, mm.m.team_b.name].map(n => `<div class="iw-side ${team(n).key} ${mm.win?.name === n ? "won" : ""}"><b>${esc(team(n).short)}</b><span>${mm.inns.filter(i => i.team === n).map(i => `${i.runs}/${i.wk}`).join(" &amp; ")}</span></div>`).join("");
    return `<article class="iw-match ${k}"><a class="iw-mh" href="#match-${mm.id}"><span class="iw-mk">Match #${mm.id} · ${esc(mm.fmt)} · ${fmtD(mm.date, { weekday: "short", day: "numeric", month: "short" })}</span>
      <h4>${mm.win ? `${esc(mm.win.short)} won by ${esc(mm.margin)}` : esc(mm.m.status_label)}</h4></a>
      <div class="iw-score">${sides}</div>
      <p class="iw-dek">${bat ? `<b>${esc(short(bat.id))}</b> top-scored with ${bat.r}${bat.b ? ` off ${bat.b}` : ""}` : ""}${bowl ? `; <b>${esc(short(bowl.id))}</b> took ${bowl.w}/${bowl.rc}.` : "."}</p>
      ${ob && ob.r >= 20 ? `<blockquote class="iw-pull">${esc(short(ob.id))} took ${ob.r} off over ${ob.ov}${ob.bw ? ` from ${esc(short(ob.bw))}` : ""}.<cite>Turning point</cite></blockquote>` : ""}
      ${(mm.poms || []).length ? `<span class="moms">${mm.poms.map(x => `<span class="mom-b ${P.get(x.id)?.tm.key || ""}">★ ${mm.poms.length > 1 ? "Joint MOM" : "MOM"} · ${esc(short(x.id))}</span>`).join("")}</span>` : ""}</article>`; };
  const recaps = `<div class="iw-matches n${W.WM.length}">${[...W.WM].reverse().map(recap).join("")}</div>`;
  // week v last week
  const stat = Wk => { const i = new Set(Wk.WM.map(m => m.id)); return { runs: Wk.runs, sixes: Wk.sixes, wkts: Wk.wkts, extras: Wk.extras, drops: DROPS.filter(d => i.has(d.mm.id)).length, m: Wk.WM.length,
    avg: Math.round(Wk.WM.flatMap(m => m.s.scorecards).reduce((a, sc) => a + sc.runs, 0) / Math.max(1, Wk.WM.flatMap(m => m.s.scorecards).length)) }; };
  let vs = "";
  if (prev) { const a = stat(W), b = stat(prev), rows = [["Matches", "m"], ["Runs", "runs"], ["Average innings", "avg"], ["Sixes", "sixes"], ["Wickets", "wkts"], ["Extras", "extras"], ["Drops", "drops"]];
    vs = `<div class="xr-card"><h3 class="tbl-title">${now ? "This week" : `Issue ${W.issue}`} v issue ${prev.issue}</h3><ul class="wvw">${rows.map(([l, k]) => { const d = a[k] - b[k];
      return `<li><span>${l}</span><b>${a[k]}</b><small class="${d > 0 ? "up" : d < 0 ? "down" : ""}">${d > 0 ? "▲" : d < 0 ? "▼" : "="} ${Math.abs(d) || ""}</small><i>${b[k]}</i></li>`; }).join("")}</ul></div>`; }
  return { recaps, more: `<h3 class="xr-h">More from the week</h3><div class="xr-grid">${movers}${msHtml}${vs}${weekQuiz(W, now)}${onThisDay(W)}</div>` };
}

/* ---------------- player notables: batting, bowling and fielding ---------------- */
function notables(p) {
  const log = [...p.log.values()], X = buildXR().raw, out = { bat: [], bowl: [], fld: [] };
  const tile = (k, big, sub, mm) => `<div class="nt"><span class="label">${k}</span><b>${big}</b><small>${sub}${mm ? ` · ${matchLink(mm)}` : ""}</small></div>`;
  const asBat = [...H.values()].filter(x => x.bat === p.id && P.has(x.bowl)), asBowl = [...H.values()].filter(x => x.bowl === p.id && P.has(x.bat));
  const sr = x => x.b ? x.r / x.b * 100 : 0, ec = x => x.b ? x.r / x.b * 6 : 0;
  // batting: from his scorecard innings (with ball-by-ball timelines)
  const inns = []; log.forEach(l => l.mm.s.scorecards.forEach(sc => { const b = sc.batting.find(x => x.id === p.id); if (!b) return;
    let c = 0, f30 = null, f50 = null; (b.timeline || []).forEach((t, i) => { const r = t.kind === "six" ? 6 : t.kind === "four" ? 4 : /^\d+$/.test(String(t.mark)) ? +t.mark : 0, pr = c; c += r; if (pr < 30 && c >= 30) f30 = i + 1; if (pr < 50 && c >= 50) f50 = i + 1; });
    inns.push({ mm: l.mm, r: b.runs, b: b.balls, no: !b.out, s: b.sixes, f: b.fours, f30, f50 }); }));
  const by = (a, f) => [...a].sort(f)[0], st = x => `${x.r}${x.no ? "*" : ""} (${x.b})`;
  const hs = by(inns, (a, b) => b.r - a.r || a.b - b.b); if (hs) out.bat.push(tile("Highest score", `${hs.r}${hs.no ? "*" : ""}`, `off ${hs.b} balls, ${hs.s} sixes`, hs.mm));
  const fifty = by(inns.filter(x => x.f50), (a, b) => a.f50 - b.f50); if (fifty) out.bat.push(tile("Fastest fifty", `${fifty.f50} balls`, `went on to ${st(fifty)}`, fifty.mm));
  else { const thirty = by(inns.filter(x => x.f30), (a, b) => a.f30 - b.f30); if (thirty) out.bat.push(tile("Fastest thirty", `${thirty.f30} balls`, `went on to ${st(thirty)}`, thirty.mm)); }
  const quick = by(inns.filter(x => x.b >= 10), (a, b) => b.r / b.b - a.r / a.b); if (quick) out.bat.push(tile("Fastest innings", `SR ${Math.round(quick.r / quick.b * 100)}`, `${st(quick)}, 10 balls or more`, quick.mm));
  const sx = by(inns.filter(x => x.s), (a, b) => b.s - a.s || b.r - a.r); if (sx) out.bat.push(tile("Most sixes in an innings", sx.s, st(sx), sx.mm));
  const bo = X.overBat.filter(x => x.id === p.id).sort((a, b) => b.r - a.r)[0]; if (bo) out.bat.push(tile("Biggest over", `${bo.r} runs`, `over ${bo.ov}${bo.bw ? ` off ${esc(short(bo.bw))}` : ""}`, bo.mm));
  const mr = by(log.filter(l => l.bat.length), (a, b) => b.bat.reduce((s, x) => s + x.r, 0) - a.bat.reduce((s, x) => s + x.r, 0));
  if (mr && mr.bat.length > 1) out.bat.push(tile("Most runs in a match", mr.bat.reduce((s, x) => s + x.r, 0), mr.bat.map(x => `${x.r}${x.no ? "*" : ""}`).join(" & "), mr.mm));
  const fav = by(asBat.filter(x => x.b >= MINB), (a, b) => sr(b) - sr(a)); if (fav) out.bat.push(tile("Favourite bowler", esc(short(fav.bowl)), `${fav.r} off ${fav.b}, SR ${Math.round(sr(fav))}`));
  const most = by(asBat, (a, b) => b.r - a.r); if (most && most !== fav) out.bat.push(tile("Most runs against", esc(short(most.bowl)), `${most.r} off ${most.b}`));
  const nem = by(asBat.filter(x => x.outs), (a, b) => b.outs - a.outs || a.r - b.r); if (nem) out.bat.push(tile("Nemesis", esc(short(nem.bowl)), `out ${nem.outs} time${nem.outs > 1 ? "s" : ""} for ${nem.r}`));
  const ducks = inns.filter(x => x.r === 0 && !x.no).length; out.bat.push(tile("Ducks", ducks, ducks ? `${inns.filter(x => x.r === 0 && !x.no && x.b <= 1).length} golden` : "never out for nought"));
  // bowling
  const spells = []; log.forEach(l => l.mm.s.scorecards.forEach(sc => { const b = sc.bowling.find(x => x.id === p.id); if (b) spells.push({ mm: l.mm, w: b.wickets, r: b.runs, b: balls(b.overs), ov: b.overs, d: b.dots, s: b.sixes }); }));
  if (spells.length) {
    const bb = by(spells, (a, b) => b.w - a.w || a.r - b.r); out.bowl.push(tile("Best bowling", `${bb.w}/${bb.r}`, `in ${bb.ov} overs`, bb.mm));
    const bm = by(log.filter(l => l.bowl.length), (a, b) => b.bowl.reduce((s, x) => s + x.w, 0) - a.bowl.reduce((s, x) => s + x.w, 0) || a.bowl.reduce((s, x) => s + x.r, 0) - b.bowl.reduce((s, x) => s + x.r, 0));
    if (bm && bm.bowl.length > 1) out.bowl.push(tile("Best match figures", `${bm.bowl.reduce((s, x) => s + x.w, 0)}/${bm.bowl.reduce((s, x) => s + x.r, 0)}`, bm.bowl.map(x => `${x.w}/${x.r}`).join(" & "), bm.mm));
    const eco = by(spells.filter(x => x.b >= 12), (a, b) => a.r / a.b - b.r / b.b); if (eco) out.bowl.push(tile("Tightest spell", `${r1(eco.r / eco.b * 6)} an over`, `${eco.w}/${eco.r} in ${eco.ov} overs`, eco.mm));
    const dots = by(spells, (a, b) => b.d - a.d); if (dots?.d) out.bowl.push(tile("Most dots in a spell", dots.d, `of ${dots.b} balls, ${dots.w}/${dots.r}`, dots.mm));
    const bo2 = X.overBowl.filter(x => x.id === p.id && x.w).sort((a, b) => b.w - a.w || a.r - b.r)[0]; if (bo2) out.bowl.push(tile("Best over", `${bo2.w}/${bo2.r}`, `over ${bo2.ov}`, bo2.mm));
    const wo = X.overBowl.filter(x => x.id === p.id).sort((a, b) => b.r - a.r)[0]; if (wo) out.bowl.push(tile("Most expensive over", `${wo.r} runs`, `over ${wo.ov}`, wo.mm));
    const bun = by(asBowl.filter(x => x.outs), (a, b) => b.outs - a.outs || a.r - b.r); if (bun) out.bowl.push(tile("Bunny", esc(short(bun.bat)), `${bun.outs} wickets for ${bun.r}`));
    const tight = by(asBowl.filter(x => x.b >= MINB), (a, b) => ec(a) - ec(b)); if (tight) out.bowl.push(tile("Hardest to score off for", esc(short(tight.bat)), `${r1(ec(tight))} an over, ${tight.r} off ${tight.b}`));
    const haul = spells.filter(x => x.w >= 3).length; out.bowl.push(tile("3-wicket hauls", haul, haul ? "spells of three or more" : "best is " + `${bb.w}/${bb.r}`));
  }
  // fielding
  const fx = [...FX.values()].filter(x => x.fld === p.id), cm = by(log, (a, b) => b.c - a.c);
  out.fld.push(tile(p.keeper ? "Catches behind the stumps" : "Catches", p.fld.c, `${r1(p.fld.c / p.matches)} a match`));
  if (cm?.c) out.fld.push(tile("Most catches in a match", cm.c, "", cm.mm));
  out.fld.push(tile("Run outs", p.fld.ro, p.fld.ro ? `${r1(p.fld.ro / p.matches)} a match` : "none yet"));
  const fav2 = by(fx.filter(x => x.c), (a, b) => b.c - a.c); if (fav2) out.fld.push(tile("Catches most often", esc(short(fav2.bat)), `${fav2.c} catch${fav2.c > 1 ? "es" : ""}`));
  const tot = p.fld.c + p.fld.drop; if (tot) out.fld.push(tile("Catch success", `${Math.round(p.fld.c / tot * 100)}%`, `${p.fld.c} taken, ${p.fld.drop} dropped`));
  if (p.drp?.made) out.fld.push(tile("Drops cost", `${p.drp.madeR} runs`, `from ${p.drp.made} dropped catch${p.drp.made > 1 ? "es" : ""}`));
  const grid = a => `<div class="nt-grid">${a.join("")}</div>`;
  return { batting: out.bat.length ? `<h2 class="sec-t">Batting notables</h2>${grid(out.bat)}` : "",
    bowling: `${out.bowl.length ? `<h2 class="sec-t">Bowling notables</h2>${grid(out.bowl)}` : ""}<h2 class="sec-t">Fielding notables</h2>${grid(out.fld)}` };
}

/* ---------------- career tables, by format (batting and bowling) ---------------- */
function careerTables(p) {
  const log = [...p.log.values()]; if (!log.length) return "";
  const fmts = [...new Set(log.map(l => l.mm.fmt))], rows = [...fmts.map(f => [f, log.filter(l => l.mm.fmt === f)]), ["Career", log]];
  const bat = ls => { const e = { m: ls.length, i: 0, no: 0, r: 0, b: 0, hs: null, h: 0, f: 0, t: 0, x4: 0, x6: 0, d0: 0, dnb: 0 };
    ls.forEach(l => l.mm.s.scorecards.forEach(sc => { if (sc.batting_team !== l.team) return; const x = sc.batting.find(y => y.id === p.id); if (!x) { e.dnb++; return; }
      e.i++; if (!x.out) e.no++; e.r += x.runs; e.b += x.balls; e.x4 += x.fours; e.x6 += x.sixes; if (x.runs === 0 && x.out) e.d0++;
      if (x.runs >= 100) e.h++; else if (x.runs >= 50) e.f++; else if (x.runs >= 30) e.t++;
      if (!e.hs || x.runs > e.hs.r || (x.runs === e.hs.r && x.balls < e.hs.b)) e.hs = { r: x.runs, b: x.balls, no: !x.out }; })); return e; };
  const bowl = ls => { const e = { m: ls.length, i: 0, b: 0, r: 0, w: 0, md: 0, d: 0, wd: 0, nb: 0, h3: 0, bbi: null, bbm: null };
    ls.forEach(l => { let mw = 0, mr = 0, any = false; l.mm.s.scorecards.forEach(sc => { const x = sc.bowling.find(y => y.id === p.id); if (!x) return; any = true;
      e.i++; e.b += balls(x.overs); e.r += x.runs; e.w += x.wickets; e.md += x.maidens; e.d += x.dots; e.wd += x.wides; e.nb += x.noballs; if (x.wickets >= 3) e.h3++; mw += x.wickets; mr += x.runs;
      if (!e.bbi || x.wickets > e.bbi.w || (x.wickets === e.bbi.w && x.runs < e.bbi.r)) e.bbi = { w: x.wickets, r: x.runs }; });
      if (any && (!e.bbm || mw > e.bbm.w || (mw === e.bbm.w && mr < e.bbm.r))) e.bbm = { w: mw, r: mr }; }); return e; };
  const d = (a, b, k = 1) => b ? r1(a / b * k) : "–";
  const bt = rows.map(([f, ls]) => { const e = bat(ls); return `<tr class="${f === "Career" ? "tot" : ""}"><td class="nm">${esc(f)}</td><td>${e.m}</td><td>${e.i}</td><td>${e.no}</td><td class="hi">${e.r.toLocaleString()}</td><td>${e.hs ? `${e.hs.r}${e.hs.no ? "*" : ""}` : "–"}</td><td>${d(e.r, e.i - e.no)}</td><td>${e.b}</td><td>${d(e.r, e.b, 100)}</td><td>${e.h}</td><td>${e.f}</td><td>${e.t}</td><td>${e.x4}</td><td>${e.x6}</td><td>${e.d0}</td><td>${e.dnb}</td></tr>`; });
  const bw = rows.map(([f, ls]) => { const e = bowl(ls); return `<tr class="${f === "Career" ? "tot" : ""}"><td class="nm">${esc(f)}</td><td>${e.m}</td><td>${e.i}</td><td>${ovs(e.b)}</td><td>${e.r}</td><td class="hi">${e.w}</td><td>${e.bbi ? `${e.bbi.w}/${e.bbi.r}` : "–"}</td><td>${e.bbm ? `${e.bbm.w}/${e.bbm.r}` : "–"}</td><td>${d(e.r, e.w)}</td><td>${d(e.r, e.b, 6)}</td><td>${d(e.b, e.w)}</td><td>${e.h3}</td><td>${e.md}</td><td>${e.b ? Math.round(e.d / e.b * 100) + "%" : "–"}</td><td>${e.wd}/${e.nb}</td></tr>`; });
  const fl = rows.map(([f, ls]) => { const c = ls.reduce((a, l) => a + l.c, 0), ro = ls.reduce((a, l) => a + l.mm.s.scorecards.reduce((s, sc) => s + (sc.bowling_team === l.team ? (sc.fielding?.runouts || []).filter(x => x.id === p.id).reduce((t, x) => t + (x.count || 1), 0) : 0), 0), 0);
    const dr = ls.reduce((a, l) => a + l.mm.s.scorecards.reduce((s, sc) => s + (sc.bowling_team === l.team ? (sc.fielding?.drops || []).filter(x => x.id === p.id).reduce((t, x) => t + (x.count || 1), 0) : 0), 0), 0);
    return `<tr class="${f === "Career" ? "tot" : ""}"><td class="nm">${esc(f)}</td><td>${ls.length}</td><td class="hi">${c}</td><td>${ro}</td><td>${dr}</td><td>${c + dr ? Math.round(c / (c + dr) * 100) + "%" : "–"}</td><td>${r1(c / ls.length)}</td></tr>`; });
  const tbl = (cols, body) => `<div class="tbl-wrap"><table class="data career"><thead><tr>${cols.map(c => `<th>${c}</th>`).join("")}</tr></thead><tbody>${body.join("")}</tbody></table></div>`;
  return `<h2 class="sec-t">Career statistics</h2>
    <h3 class="tbl-title">Batting</h3>${tbl(["Format", "M", "Inns", "NO", "Runs", "HS", "Avg", "BF", "SR", "100", "50", "30", "4s", "6s", "0", "DNB"], bt)}
    <h3 class="tbl-title" style="margin-top:22px">Bowling</h3>${tbl(["Format", "M", "Inns", "Overs", "Runs", "Wkts", "BBI", "BBM", "Avg", "Econ", "SR", "3w", "Mdns", "Dots", "Wd/Nb"], bw)}
    <h3 class="tbl-title" style="margin-top:22px">Fielding</h3>${tbl(["Format", "M", p.keeper ? "Ct (wk)" : "Ct", "RO", "Drops", "Catch %", "Ct/match"], fl)}
    <p class="rank-note" style="margin-top:8px">30 counts scores of 30 to 49. BBI: best figures in an innings; BBM: best in a match.</p>`;
}

/* ---------------- milestones for the trophy cabinet: unlocked with when, or how close ---------------- */
function milestoneCards(p) {
  const log = [...p.log.values()]; if (!log.length) return { html: "", got: 0, total: 0 };
  const X = buildXR().raw, when = mm => `${fmtD(mm.date, { day: "numeric", month: "short" })}, <a href="#match-${mm.id}">match #${mm.id}</a>`;
  const inns = log.flatMap(l => l.bat.map(b => ({ l, b }))), spells = log.flatMap(l => l.bowl.map(b => ({ l, b })));
  const firstOf = (list, ok) => list.find(ok), bestOf = (list, f) => list.reduce((m, x) => Math.max(m, f(x)), 0);
  const cards = [];
  // a card: unlocked shows the moment it happened, locked shows the best so far and the gap
  const add = (k, hit, big, unit, line, best, need, bestUnit) => cards.push(hit
    ? { on: 1, html: `<article class="pa-card ms on"><p class="kicker">${k}</p><span class="pa-status">★ Unlocked</span><div class="pa-big">${big}</div><div class="aw-unit">${unit}</div><p class="pa-line">${line}</p></article>` }
    : { on: 0, html: `<article class="pa-card ms na"><p class="kicker">${k}</p><span class="pa-status">Not yet</span><div class="pa-big">${best}</div><div class="aw-unit">${bestUnit}</div><p class="pa-line">${need}</p></article>` });
  // batting: the big number is the best (or how many), the line says when it first happened
  const sc = x => `${x.b.r}${x.b.no ? "*" : ""} (${x.b.b})`, n = (c, one, many) => `${c} ${c === 1 ? one : many}`;
  const fifties = inns.filter(x => x.b.r >= 50), hs = inns.reduce((m, x) => !m || x.b.r > m.b.r ? x : m, null), hsr = hs ? hs.b.r : 0;
  add("Half-century", fifties.length, fifties.length, fifties.length === 1 ? "fifty" : "fifties", fifties.length ? `First: ${sc(fifties[0])} on ${when(fifties[0].l.mm)}. Best: ${sc(hs)}.` : "", hsr, `${50 - hsr} short of a first fifty.`, "best score so far");
  const tons = inns.filter(x => x.b.r >= 100);
  // the century card only once a fifty is in the bag, so each locked card points at the next target
  if (fifties.length) add("Century", tons.length, tons.length, tons.length === 1 ? "hundred" : "hundreds", tons.length ? `First: ${sc(tons[0])} on ${when(tons[0].l.mm)}.` : "", hsr, `${100 - hsr} short of a hundred.`, "best score so far");
  const big6 = inns.filter(x => x.b.s >= 5), b6 = inns.reduce((m, x) => !m || x.b.s > m.b.s ? x : m, null), bs = b6 ? b6.b.s : 0;
  add("Six machine", big6.length, bs, "sixes in an innings, his best", big6.length ? `Best in ${sc(b6)} on ${when(b6.l.mm)}. ${n(big6.length, "innings", "innings")} with 5+ sixes.` : "", bs, `${5 - bs} more sixes in one innings for 5.`, "most sixes in an innings");
  const ov = X.overBat.filter(x => x.id === p.id), o5 = ov.filter(x => x.s >= 5), bo = ov.reduce((m, x) => !m || x.s > m.s || (x.s === m.s && x.r > m.r) ? x : m, null), bos = bo ? bo.s : 0;
  add("Over destroyer", o5.length, bos, "sixes in one over, his best", o5.length ? `${bo.r} off the over${bo.bw ? ` from ${esc(short(bo.bw))}` : ""} on ${when(bo.mm)}. ${n(o5.length, "over", "overs")} with 5+ sixes.` : "", bos, `${5 - bos} more sixes in one over for 5.`, "most sixes in an over");
  const fin = inns.filter(x => x.b.r >= 30 && x.b.no), bno = inns.filter(x => x.b.no).reduce((m, x) => !m || x.b.r > m.b.r ? x : m, null);
  add("Finisher", fin.length, fin.length, fin.length === 1 ? "unbeaten 30+" : "unbeaten 30+ scores", fin.length ? `Best: ${sc(bno)} on ${when(bno.l.mm)}. First: ${sc(fin[0])}.` : "", bno ? bno.b.r : 0, "An unbeaten 30 unlocks this.", "best not-out score");
  // bowling
  const hauls = spells.filter(x => x.b.w >= 3), bb = spells.reduce((m, x) => !m || x.b.w > m.b.w || (x.b.w === m.b.w && x.b.r < m.b.r) ? x : m, null);
  if (spells.length) add("Three-wicket haul", hauls.length, bb ? `${bb.b.w}/${bb.b.r}` : "", "best figures", hauls.length ? `${n(hauls.length, "haul", "hauls")}. Best on ${when(bb.l.mm)}.` : "", bb ? `${bb.b.w}/${bb.b.r}` : "–", `${3 - (bb ? bb.b.w : 0)} more wicket${3 - (bb ? bb.b.w : 0) === 1 ? "" : "s"} in a spell for a haul.`, "best figures so far");
  const wms = X.overBowl.filter(x => x.id === p.id && x.r === 0 && x.w > 0).sort((a, b) => a.mm.date - b.mm.date);
  if (spells.length) add("Wicket maiden", wms.length, wms.length, wms.length === 1 ? "wicket maiden" : "wicket maidens", wms.length ? `First: ${wms[0].w}/0 in over ${wms[0].ov} on ${when(wms[0].mm)}.` : "", 0, "A wicket in an over with no runs off it.", "so far");
  // fielding
  const c3 = log.filter(l => l.c >= 3), bc = log.reduce((m, l) => !m || l.c > m.c ? l : m, null), bcc = bc ? bc.c : 0;
  add(p.keeper ? "Safe gloves" : "Safe pair", c3.length, bcc, "catches in a match, his best", c3.length ? `Best on ${when(bc.mm)}. ${n(c3.length, "match", "matches")} with 3+ catches.` : "", bcc, `${3 - bcc} more catch${3 - bcc === 1 ? "" : "es"} in one match for 3.`, "most catches in a match");
  // honours
  const mv = WEEKS.slice().reverse().filter(w => w.isMvp(p.id));
  add("MVP of the week", mv.length, mv.length, mv.length === 1 ? "week" : "weeks", mv.length ? `First: issue ${mv[0].issue}, ${weekRange(mv[0])}.${mv.length > 1 ? ` Latest: issue ${mv.at(-1).issue}.` : ""}` : "", 0, "Top the weekly points to unlock.", "MVPs so far");
  const mom = log.filter(l => (l.mm.poms || []).some(x => x.id === p.id));
  add("Man of the Match", mom.length, mom.length, mom.length === 1 ? "match" : "matches", mom.length ? `First on ${when(mom[0].mm)}. Latest on ${when(mom.at(-1).mm)}.` : "", 0, "The best performance in a match unlocks it.", "so far");
  const on = cards.filter(c => c.on);
  return { html: [...on, ...cards.filter(c => !c.on)].map(c => c.html).join(""), got: on.length, total: cards.length };
}

/* ---------------- player extras: timeline, best and worst, partners, position, teammates, achievements ---------------- */
function playerExtras(p) {
  if (!p.matches) return {};
  const log = [...p.log.values()], X = buildXR().raw, out = {};
  // career timeline by issue
  const wk = [...WEEKS].reverse().map(w => { const ls = log.filter(l => w.WM.some(m => m.id === l.mm.id)); return { w, r: ls.reduce((a, l) => a + l.bat.reduce((s, b) => s + b.r, 0), 0), wk: ls.reduce((a, l) => a + l.bowl.reduce((s, b) => s + b.w, 0), 0), n: ls.length }; });
  const mxr = Math.max(30, ...wk.map(x => x.r)), mxw = Math.max(3, ...wk.map(x => x.wk)), CW = 640, CH = 170, bw = (CW - 40) / wk.length;
  const ms = []; [...WEEKS].reverse().forEach(w => milestonesIn(w).forEach(s => { const [name, what] = s.split(": "); if (name === (p.full_name || p.name)) ms.push({ w, what }); }));
  const tl = `<h2 class="sec-t">Career timeline</h2><div class="fc-wrap"><svg class="fc" viewBox="0 0 ${CW} ${CH}" role="img" aria-label="Runs and wickets each issue">
    ${wk.map((x, i) => { const cx = 20 + i * bw + bw / 2, h = x.r / mxr * 90, hw = x.wk / mxw * 40;
      return `<g><title>Issue ${x.w.issue}: ${x.n ? `${x.r} runs, ${x.wk} wickets` : "did not play"}</title>
      <rect x="${(cx - bw * 0.32).toFixed(1)}" y="${(110 - h).toFixed(1)}" width="${(bw * 0.3).toFixed(1)}" height="${h.toFixed(1)}" class="fc-bar ${p.tm.key}"/>
      <rect x="${(cx + 0.02 * bw).toFixed(1)}" y="${(110 - hw).toFixed(1)}" width="${(bw * 0.3).toFixed(1)}" height="${hw.toFixed(1)}" class="fc-w"/>
      <text x="${cx.toFixed(1)}" y="128" class="fc-m">${x.w.issue}</text>${x.n ? "" : `<text x="${cx.toFixed(1)}" y="104" class="fc-m">–</text>`}</g>`; }).join("")}
    <line x1="20" x2="${CW - 20}" y1="110" y2="110" class="fc-base"/></svg>
    <p class="fc-key"><span><i class="fc-k-bar ${p.tm.key}"></i>Runs</span><span><i class="fc-k-w" style="border-radius:0"></i>Wickets</span><span>by issue</span></p></div>
    ${ms.length ? `<ul class="tl-ms">${ms.map(x => `<li><b>${esc(x.what)}</b> <span>Issue ${x.w.issue}</span></li>`).join("")}</ul>` : ""}`;
  out.overview = dnaRadar(p) + tl;
  out.overviewEnd = careerTables(p);
  // best and worst
  const inns = log.flatMap(l => l.bat.map(b => ({ l, b }))), spells = log.flatMap(l => l.bowl.map(b => ({ l, b })));
  const topI = [...inns].sort((a, b) => b.b.r - a.b.r || a.b.b - b.b.b).slice(0, 5), topS = [...spells].filter(x => x.b.w).sort((a, b) => b.b.w - a.b.w || a.b.r - b.b.r).slice(0, 5);
  const worst = [...log].filter(l => l.bat.length || l.bowl.length).sort((a, b) => mPts(a) - mPts(b) || b.bowl.reduce((s, x) => s + x.r, 0) - a.bowl.reduce((s, x) => s + x.r, 0)).slice(0, 3);
  const lst = (rows) => `<ol class="xr-list">${rows.join("")}</ol>`, li2 = (i, big, small) => `<li><span class="xr-n">${i + 1}</span><b class="xr-big" style="text-align:left">${big}</b><span></span><small class="xr-d">${small}</small></li>`;
  out.matches = `<h2 class="sec-t">Best &amp; worst</h2><div class="xr-grid">
    <div class="xr-card"><h3 class="tbl-title">Top innings</h3>${lst(topI.map((x, i) => li2(i, `${x.b.r}${x.b.no ? "*" : ""} <small>(${x.b.b})</small>`, `${x.b.s} sixes · ${matchLink(x.l.mm)}`)))}</div>
    <div class="xr-card"><h3 class="tbl-title">Top spells</h3>${topS.length ? lst(topS.map((x, i) => li2(i, `${x.b.w}/${x.b.r}`, `${ovs(x.b.b)} overs · ${matchLink(x.l.mm)}`))) : `<p class="dnb">No wickets yet.</p>`}</div>
    <div class="xr-card"><h3 class="tbl-title">Quietest games</h3>${lst(worst.map((l, i) => li2(i, `${mPts(l)} pts`, `${l.bat.map(b => `${b.r}${b.no ? "*" : ""}`).join(" & ") || "dnb"} · ${l.bowl.map(b => `${b.w}/${b.r}`).join(" & ") || "dnb"} · ${matchLink(l.mm)}`)))}</div></div>`;
  // partnership partners
  const st = buildPartnerships().filter(s => s.ids.length > 1 && s.ids.includes(p.id)), pm = new Map();
  st.forEach(s => s.ids.filter(id => id !== p.id).forEach(o => { const e = pm.get(o) || { o, n: 0, r: 0, b: 0, best: 0 }; e.n++; e.r += s.runs; e.b += s.balls; e.best = Math.max(e.best, s.runs); pm.set(o, e); }));
  const partners = [...pm.values()].sort((a, b) => b.r - a.r);
  // batting position
  const pos = new Map(); log.forEach(l => l.mm.s.scorecards.forEach(sc => { if (sc.batting_team !== l.team) return; const i = battingOrder(sc).indexOf(p.id); const b = sc.batting.find(x => x.id === p.id); if (i < 0 || !b) return;
    const e = pos.get(i + 1) || { n: 0, r: 0, b: 0, o: 0 }; e.n++; e.r += b.runs; e.b += b.balls; if (b.out) e.o++; pos.set(i + 1, e); }));
  const nt = notables(p);
  out.bowling = nt.bowling;
  // against pace and against spin
  const ss = styleSplit(p), row = (k, x) => x.b ? `<tr><td class="nm">${STYLE[k]}</td><td>${x.b}</td><td class="hi">${x.r}</td><td>${r1(x.r / x.b * 100)}</td><td>${x.o}</td><td>${x.o ? r1(x.r / x.o) : "–"}</td><td>${x.o ? r1(x.b / x.o) : "–"}</td><td>${x.s}</td><td>${Math.round(x.dots / x.b * 100)}%</td></tr>` : "";
  const avgTxt = ss.fast.o && ss.spin.o ? ` Averages ${r1(ss.spin.r / ss.spin.o)} against spin and ${r1(ss.fast.r / ss.fast.o)} against pace.` : "";
  const ps = ss.fast.b && ss.spin.b ? (() => { const f = ss.fast.r / ss.fast.b * 100, sp = ss.spin.r / ss.spin.b * 100; return (Math.abs(f - sp) < 10 ? "Scores as freely against pace as spin." : `Prefers ${f > sp ? "pace" : "spin"}: strike rate ${r1(Math.max(f, sp))} against ${r1(Math.min(f, sp))}.`) + avgTxt; })() : "";
  const paceSpin = ss.fast.b + ss.spin.b ? `<h2 class="sec-t">Against pace and spin</h2>${ps ? `<p class="ts-verdict">${ps}</p>` : ""}<div class="tbl-wrap"><table class="data"><thead><tr><th>Bowling</th><th>Balls</th><th>Runs</th><th>SR</th><th>Out</th><th>Avg</th><th>Balls/out</th><th>6s</th><th>Dots</th></tr></thead><tbody>${row("fast", ss.fast)}${row("spin", ss.spin)}</tbody></table></div><p class="rank-note" style="margin-top:8px">Fast bowlers: ${[...P.values()].filter(q => q.bowl_style === "fast").map(q => esc(short(q.id))).join(", ")}. Spinners: ${[...P.values()].filter(q => q.bowl_style === "spin").map(q => esc(short(q.id))).join(", ")}.</p>` : "";
  out.batting = `${nt.batting}${paceSpin}<h2 class="sec-t">Batting partners</h2>${partners.length ? `<div class="tbl-wrap"><table class="data"><thead><tr><th>With</th><th>Stands</th><th>Runs</th><th>Avg stand</th><th>Run rate</th><th>Best</th></tr></thead><tbody>${partners.map(e => `<tr><td class="nm ${P.get(e.o)?.tm.key || ""}"><span class="chip"></span>${plink(e.o)}</td><td>${e.n}</td><td class="hi">${e.r}</td><td>${r1(e.r / e.n)}</td><td>${e.b ? r1(e.r / e.b * 6) : "–"}</td><td>${e.best}</td></tr>`).join("")}</tbody></table></div>` : `<p class="dnb">No partnerships yet.</p>`}
    <h2 class="sec-t">By batting position</h2><div class="tbl-wrap"><table class="data"><thead><tr><th>Position</th><th>Inns</th><th>Runs</th><th>Avg</th><th>SR</th></tr></thead><tbody>${[...pos].sort((a, b) => a[0] - b[0]).map(([k, e]) => `<tr><td class="nm">${k === 1 || k === 2 ? `Opener (${k})` : `No. ${k}`}</td><td>${e.n}</td><td class="hi">${e.r}</td><td>${e.o ? r1(e.r / e.o) : "–"}</td><td>${e.b ? r1(e.r / e.b * 100) : "–"}</td></tr>`).join("")}</tbody></table></div>
    <p class="rank-note" style="margin-top:8px">Position is the order he faced his first ball in each innings.</p>`;
  // teammates: win rate with each player on his side
  const tm = new Map(); log.forEach(l => { const won = !!(l.mm.win && l.mm.win.name === l.team); P.forEach(q => { if (q.id === p.id) return; const ql = q.log.get(l.mm.id); if (!ql || ql.team !== l.team) return;
    const e = tm.get(q.id) || { n: 0, w: 0 }; e.n++; if (won) e.w++; tm.set(q.id, e); }); });
  const mates = [...tm].filter(([, e]) => e.n >= 3).sort((a, b) => b[1].w / b[1].n - a[1].w / a[1].n || b[1].n - a[1].n);
  // for each team he has played for, and which suits him
  const ts = teamSplit(p), tk = Object.values(ts).sort((a, b) => b.m - a.m), tn = k => k === "t" ? "Tigers" : "Falcons";
  let verdict = "";
  if (tk.length > 1 && tk.every(x => x.m >= 2)) { const [a, b] = [...tk].sort((x, y) => y.per - x.per), gap = a.per - b.per;
    verdict = gap < 10 ? `Just as good for either side: ${Math.round(a.per)} and ${Math.round(b.per)} points a match.` : `Plays better for the ${tn(a.k)}: ${Math.round(a.per)} points a match against ${Math.round(b.per)} for the ${tn(b.k)}.`; }
  else if (tk.length > 1) { const few = tk.find(x => x.m < 2); verdict = `Only ${few.m} match for the ${tn(few.k)} so far (${Math.round(few.per)} points), against ${Math.round(tk.find(x => x !== few).per)} a match for the ${tn(tk.find(x => x !== few).k)}.`; }
  else if (tk.length === 1) verdict = `Has only played for the ${tn(tk[0].k)} so far. If he switches, this table will compare the two.`;
  const teamTbl = `<h2 class="sec-t">For each team</h2><p class="ts-verdict">${verdict}</p><div class="tbl-wrap"><table class="data"><thead><tr><th>Team</th><th>M</th><th>Won</th><th>Runs</th><th>Avg</th><th>SR</th><th>6s</th><th>Wkts</th><th>Econ</th><th>Ct</th><th>Pts/match</th></tr></thead><tbody>${tk.map(x => `<tr><td class="nm ${x.k}"><span class="chip"></span>${tn(x.k)}</td><td>${x.m}</td><td>${x.won} <small class="label">${Math.round(x.won / x.m * 100)}%</small></td><td>${x.r}</td><td>${x.o ? r1(x.r / x.o) : "–"}</td><td>${x.b ? r1(x.r / x.b * 100) : "–"}</td><td>${x.s}</td><td>${x.w}</td><td>${x.bb ? r1(x.rc / x.bb * 6) : "–"}</td><td>${x.c}</td><td class="hi">${Math.round(x.per)}</td></tr>`).join("")}</tbody></table></div>`;
  out.splits = teamTbl + `<h2 class="sec-t">Best combinations</h2>${mates.length ? `<div class="tbl-wrap"><table class="data"><thead><tr><th>Alongside</th><th>Matches</th><th>Won</th><th>Win %</th></tr></thead><tbody>${mates.map(([id, e]) => `<tr><td class="nm ${P.get(id)?.tm.key || ""}"><span class="chip"></span>${plink(id)}</td><td>${e.n}</td><td>${e.w}</td><td class="hi">${Math.round(e.w / e.n * 100)}%</td></tr>`).join("")}</tbody></table></div><p class="rank-note" style="margin-top:8px">Matches on the same side, three or more together.</p>` : `<p class="dnb">Not enough matches together yet.</p>`}`;
  return out;
}

/* ---------------- unique awards for the trophy cabinet ---------------- */
function addUniqueAwards() {
  if (typeof AWARDS === "undefined" || !AWARDS.length || AWARDS.some(a => a.unique)) return;
  const ps = [...P.values()].filter(p => p.matches), X = buildXR().raw;
  const rank = (score, ok = () => true) => ps.filter(ok).sort((a, b) => score(b) - score(a));
  const stand = new Map(); buildPartnerships().filter(s => s.ids.length > 1).forEach(s => s.ids.forEach(id => stand.set(id, (stand.get(id) || 0) + s.runs)));
  const bigOver = new Map(); X.overBat.forEach(x => bigOver.set(x.id, Math.max(bigOver.get(x.id) || 0, x.r)));
  const finish = p => [...p.log.values()].filter(l => { const sc = l.mm.s.scorecards.at(-1); return l.mm.win && l.mm.win.name === l.team && sc.batting_team === l.team && sc.batting.some(x => x.id === p.id && !x.out); }).length;
  const s30 = p => p.bat.inns ? [...p.log.values()].reduce((a, l) => a + l.bat.filter(b => b.r >= 30).length, 0) / p.bat.inns * 100 : 0;
  const pp = p => scoutData(p).bat.ph[0], death = p => scoutData(p).bowl.ph[2];
  const n = (k, o) => ({ unique: true, k, ...o });
  AWARDS.push(
    ...(ps.some(p => p.keeper) ? [n("Golden Gloves", { note: "wicket-keepers", only: p => p.keeper, list: rank(p => p.fld.c + p.fld.ro, p => p.keeper), n: p => p.fld.c + p.fld.ro, v: p => p.fld.c + p.fld.ro, u: "dismissals behind the stumps", unit: "dismissals" })] : []),
    n("Clutch King", { note: "2+ close matches", need: p => `${clutchOf(p).n} of 2 close matches played`, ok: p => clutchOf(p).n >= 2, list: rank(p => clutchOf(p).per, p => clutchOf(p).n >= 2), n: p => clutchOf(p).per, v: p => Math.round(clutchOf(p).per), u: "points a close match", unit: "points" }),
    n("The Finisher", { list: rank(p => finish(p) * 1000 + p.bat.no, p => finish(p) > 0), n: finish, v: finish, u: "not out in winning chases", u1: "not out in a winning chase", unit: "finishes" }),
    n("Powerplay Punisher", { note: "30+ balls in overs 1–2", need: p => `${pp(p).b} of 30 balls faced in overs 1–2`, ok: p => pp(p).b >= 30, list: rank(p => pp(p).r / pp(p).b, p => pp(p).b >= 30), n: p => pp(p).r / pp(p).b * 100, dec: 1, v: p => Math.round(pp(p).r / pp(p).b * 100), u: "strike rate in overs 1–2", unit: "points" }),
    n("Death-over Specialist", { note: "4+ overs from over 6", need: p => `${ovs(death(p).b)} of 4 overs bowled from over 6`, ok: p => death(p).b >= 24, list: rank(p => -death(p).r / death(p).b, p => death(p).b >= 24), n: p => death(p).r / death(p).b * 6, low: 1, dec: 1, v: p => r1(death(p).r / death(p).b * 6), u: "runs an over from over 6", unit: "runs an over" }),
    n("The Wall", { note: "8+ innings", need: p => `${p.bat.inns} of 8 innings`, ok: p => p.bat.inns >= 8, list: rank(p => p.bat.b / Math.max(1, p.bat.inns - p.bat.no), p => p.bat.inns >= 8), n: p => p.bat.b / Math.max(1, p.bat.inns - p.bat.no), dec: 1, v: p => r1(p.bat.b / Math.max(1, p.bat.inns - p.bat.no)), u: "balls faced per dismissal", unit: "balls" }),
    n("Mr Consistent", { note: "8+ innings", need: p => `${p.bat.inns} of 8 innings`, ok: p => p.bat.inns >= 8, list: rank(s30, p => p.bat.inns >= 8), n: s30, dec: 1, v: p => Math.round(s30(p)) + "%", u: "of innings 30 or more", unit: "points" }),
    n("Dot-ball Machine", { note: "10+ overs", need: p => `${ovs(p.bowl.b)} of 10 overs`, ok: p => p.bowl.b >= 60, list: rank(p => p.bowl.dots / p.bowl.b, p => p.bowl.b >= 60), n: p => p.bowl.dots / p.bowl.b * 100, dec: 1, v: p => Math.round(p.bowl.dots / p.bowl.b * 100) + "%", u: "dot balls bowled", unit: "points" }),
    n("Comeback Kid", { list: rank(p => scoutData(p).bowl.after4 * 100 + p.bowl.w, p => scoutData(p).bowl.after4 > 0), n: p => scoutData(p).bowl.after4, v: p => scoutData(p).bowl.after4, u: "wickets the ball after a boundary", u1: "wicket the ball after a boundary", unit: "wickets" }),
    n("Partnership King", { list: rank(p => stand.get(p.id) || 0, p => stand.get(p.id) > 0), n: p => stand.get(p.id) || 0, v: p => (stand.get(p.id) || 0).toLocaleString(), u: "runs in partnerships", unit: "runs" }),
    n("Over Destroyer", { list: rank(p => bigOver.get(p.id) || 0, p => bigOver.get(p.id) > 0), n: p => bigOver.get(p.id) || 0, v: p => bigOver.get(p.id) || 0, u: "runs in a single over", unit: "runs" }),
    n("Most Valuable per Ball", { note: "60+ balls", need: p => `${oppOf(p).involved} of 60 balls faced or bowled`, ok: p => oppOf(p).involved >= 60, list: rank(p => oppOf(p).value, p => oppOf(p).involved >= 60), n: p => oppOf(p).value, dec: 1, v: p => r1(oppOf(p).value), u: "points per 10 balls", unit: "points" }),
    n("Run-out King", { list: rank(p => p.fld.ro * 100 + p.fld.c, p => p.fld.ro > 0), n: p => p.fld.ro, v: p => p.fld.ro, u: "run outs", u1: "run out", unit: "run outs" }),
    n("Iron Man", { list: rank(p => p.matches * 10000 + p.bat.b + p.bowl.b), n: p => p.matches, v: p => p.matches, u: "matches played", unit: "matches" }),
    n("The Survivor", { list: rank(p => p.drp.lives * 1000 + p.drp.livesR, p => p.drp.lives > 0), n: p => p.drp.lives, v: p => p.drp.lives, u: "lives when dropped", u1: "life when dropped", unit: "lives" }),
  );
}

/* ---------------- scorecard extras: match report, run worm, chase odds ---------------- */
let CHASE = null;
function chaseRows() {
  if (CHASE) return CHASE;
  CHASE = [];
  M.forEach(mm => { if (!mm.win) return; const sc = mm.s.scorecards.at(-1); if (!sc?.target) return; const maxB = (mm.m.overs || 0) * 6, won = mm.win.name === sc.batting_team;
    (sc.commentary || []).filter(c => c.type === "over").forEach(c => { const m = String(c.score).match(/(\d+)\/(\d+)\s*$/); if (!m) return;
      const need = sc.target - +m[1], left = maxB - c.over_no * 6; if (need <= 0 || left <= 0) return; CHASE.push({ need, left, rr: need / left * 6, won, mm }); }); });
  return CHASE;
}
const RRB = [[0, 10, "under 10"], [10, 14, "10–14"], [14, 18, "14–18"], [18, 24, "18–24"], [24, 1e9, "24+"]], LB = [[25, 1e9, "25+ balls left"], [13, 24, "13–24 left"], [1, 12, "1–12 left"]];
function oddsAt(need, left) {
  const rr = need / left * 6, a = RRB.find(b => rr >= b[0] && rr < b[1]), b = LB.find(x => left >= x[0] && left <= x[1]);
  const set = chaseRows().filter(x => x.rr >= a[0] && x.rr < a[1] && x.left >= b[0] && x.left <= b[1]);
  return { n: set.length, w: set.filter(x => x.won).length };
}
function worm(mm) {
  const inns = mm.s.scorecards.map(sc => ({ sc, k: team(sc.batting_team).key, pts: [[0, 0], ...(sc.commentary || []).filter(c => c.type === "over").map(c => { const m = String(c.score).match(/(\d+)\/(\d+)\s*$/); return m ? [c.over_no, +m[1]] : null; }).filter(Boolean).sort((a, b) => a[0] - b[0])] }));
  if (!inns.some(i => i.pts.length > 1)) return "";
  const mo = Math.max(mm.m.overs || 1, ...inns.map(i => i.pts.at(-1)[0])), mr = Math.max(20, ...inns.map(i => Math.max(i.sc.runs, i.pts.at(-1)[1])));
  const W = 640, H = 220, L = 36, R = 16, T = 12, B = 28, xs = o => L + o / mo * (W - L - R), ys = r => T + (H - T - B) * (1 - r / mr);
  const seen = {};
  return `<div class="fc-wrap"><svg class="fc" viewBox="0 0 ${W} ${H}" role="img" aria-label="Runs over by over in each innings">
    ${[0, .5, 1].map(g => `<line class="ch-grid" x1="${L}" x2="${W - R}" y1="${ys(mr * g)}" y2="${ys(mr * g)}"/><text class="ch-ax" x="${L - 6}" y="${ys(mr * g) + 4}" text-anchor="end">${Math.round(mr * g)}</text>`).join("")}
    ${Array.from({ length: mo + 1 }, (_, o) => `<text class="ch-ax" x="${xs(o)}" y="${H - 8}" text-anchor="middle">${o}</text>`).join("")}
    ${inns.map(i => { const second = seen[i.k]; seen[i.k] = 1; return `<polyline fill="none" stroke="var(--${i.k === "t" ? "tiger" : "falcon"})" stroke-width="3"${second ? ` stroke-dasharray="7 5"` : ""} points="${i.pts.map(([o, r]) => `${xs(o).toFixed(1)},${ys(r).toFixed(1)}`).join(" ")}"/>`; }).join("")}
  </svg><p class="fc-key">${inns.map((i, j) => `<span><i style="background:var(--${i.k === "t" ? "tiger" : "falcon"})${j >= 2 ? ";opacity:.6" : ""}"></i>${esc(team(i.sc.batting_team).short)} ${esc(i.sc.label)} · ${i.sc.runs}/${i.sc.wickets}</span>`).join("")}<span>Runs by over</span></p></div>`;
}
function matchExtras(mm) {
  const perf = mm.perf || [], X = buildXR().raw, nm = id => esc(short(id));
  const side = n => perf.filter(e => e.tm === n), topBat = l => [...l].sort((a, b) => b.r - a.r)[0], topBowl = l => [...l].filter(e => e.w).sort((a, b) => b.w - a.w || a.rc - b.rc)[0];
  const lines = [];
  [mm.m.team_a.name, mm.m.team_b.name].forEach(n => { const b = topBat(side(n)), w = topBowl(side(n));
    if (b || w) lines.push(`For the ${esc(team(n).short)}, ${b ? `${nm(b.id)} made ${b.r}${b.b ? ` off ${b.b}` : ""}` : ""}${b && w ? " and " : ""}${w ? `${b && b.id === w.id ? "" : nm(w.id) + " "}took ${w.w}/${w.rc}` : ""}.`); });
  const ob = X.overBat.filter(x => x.mm === mm).sort((a, b) => b.r - a.r)[0];
  if (ob && ob.r >= 18) lines.push(`The over of the match: ${nm(ob.id)} took ${ob.r} off over ${ob.ov}${ob.bw ? ` from ${nm(ob.bw)}` : ""}.`);
  const dr = DROPS.filter(d => d.mm === mm); if (dr.length) { const c = [...dr].sort((a, b) => b.r - a.r)[0]; lines.push(`${dr.length} catch${dr.length > 1 ? "es" : ""} went down${c.r >= 10 ? `; the costliest let ${nm(c.bt)} add ${c.r} more` : ""}.`); }
  const last = mm.s.scorecards.at(-1);
  if (last?.target && mm.win) { const won = mm.win.name === last.batting_team, maxB = (mm.m.overs || 0) * 6, used = balls(last.overs);
    lines.push(won ? `Chasing ${last.target}, the ${esc(team(last.batting_team).short)} got there with ${Math.max(0, maxB - used)} ball${maxB - used === 1 ? "" : "s"} to spare.` : `Chasing ${last.target}, the ${esc(team(last.batting_team).short)} fell ${last.target - 1 - last.runs} short.`); }
  if (mm.poms?.length) lines.push(`${mm.poms.length > 1 ? "Joint players" : "Player"} of the match: ${mm.poms.map(x => nm(x.id)).join(" and ")}.`);
  // chase odds after each over
  let odds = "";
  if (last?.target) { const maxB = (mm.m.overs || 0) * 6;
    const rows = (last.commentary || []).filter(c => c.type === "over").map(c => { const m = String(c.score).match(/(\d+)\/(\d+)\s*$/); if (!m) return null; const need = last.target - +m[1], left = maxB - c.over_no * 6; if (need <= 0 || left <= 0) return null; return { o: c.over_no, need, left, ...oddsAt(need, left) }; }).filter(Boolean).sort((a, b) => a.o - b.o);
    if (rows.length) odds = `<h3 class="tbl-title" style="margin-top:22px">Chase odds</h3><div class="tbl-wrap"><table class="data"><thead><tr><th>After over</th><th>Needed</th><th>Req. rate</th><th>Teams in this spot won</th></tr></thead><tbody>${rows.map(r => `<tr><td>${r.o}</td><td>${r.need} off ${r.left}</td><td>${r1(r.need / r.left * 6)}</td><td class="hi">${r.n ? `${Math.round(r.w / r.n * 100)}% <small class="label">(${r.w} of ${r.n})</small>` : "–"}</td></tr>`).join("")}</tbody></table></div>`; }
  return `<section class="mx"><h2 class="sec-t">Match report</h2><div class="mx-grid"><div class="mx-rep">${lines.map(l => `<p>${l}</p>`).join("")}</div><div>${worm(mm)}</div></div>${odds}</section>`;
}

/* ---------------- Stats page: matchup heatmap, pressure, chase odds ---------------- */
function pressureData() {
  const up = new Map([...P.values()].map(q => [q.name.toUpperCase(), q.id])), bat = new Map(), bowl = new Map();
  const e = (m, id) => { if (!m.has(id)) m.set(id, { id, n: 0, r: 0, o: 0 }); return m.get(id); };
  M.forEach(mm => mm.s.scorecards.forEach(sc => { const dots = new Map(), hit = new Map();
    (sc.commentary || []).filter(c => c.type === "ball").reverse().forEach(c => { const t = String(c.text).match(/^(.+?) TO (.+?), (.*)$/); if (!t) return;
      const bw = up.get(t[1]), bt = up.get(t[2]), k = c.badge.kind, mk = String(c.badge.mark); if (k === "wide" || /^WIDE/.test(t[3])) return;
      const r = k === "six" ? 6 : k === "four" ? 4 : /^\d+$/.test(mk) ? +mk : 0, out = k === "wicket" && !/RUN OUT/.test(t[3]);
      if (bt && (dots.get(bt) || 0) >= 2) { const x = e(bat, bt); x.n++; x.r += r; if (out) x.o++; }
      if (bw && hit.get(bw)) { const x = e(bowl, bw); x.n++; x.r += r; if (out) x.o++; }
      if (bt) dots.set(bt, r === 0 && !out ? (dots.get(bt) || 0) + 1 : 0);
      if (bw) hit.set(bw, k === "six" || k === "four"); }); }));
  return { bat: [...bat.values()].filter(x => x.n >= 10), bowl: [...bowl.values()].filter(x => x.n >= 10) };
}
function renderMatchups() {
  const el = $("#matchupsBody"); if (!el || !M?.length) return;
  const bats = [...P.values()].filter(p => p.bat.b >= 30).sort((a, b) => b.bat.r - a.bat.r), bowls = [...P.values()].filter(p => p.bowl.b >= 36).sort((a, b) => b.bowl.w - a.bowl.w);
  const tot = [...P.values()].reduce((a, p) => ({ r: a.r + p.bat.r, b: a.b + p.bat.b }), { r: 0, b: 0 }), lsr = tot.r / tot.b * 100;
  const cell = (bt, bw) => { if (bt.id === bw.id) return `<td class="hm-x"></td>`; const x = H.get(bt.id + "|" + bw.id);
    if (!x || x.b < 6) return `<td class="hm-n" title="${esc(short(bt.id))} v ${esc(short(bw.id))}: ${x ? x.b : 0} balls">${x ? x.b + "b" : ""}</td>`;
    const sr = x.r / x.b * 100, t = Math.max(-1, Math.min(1, (sr / lsr - 1) / 0.6)), bg = t >= 0 ? `rgba(31,138,76,${(t * .6).toFixed(2)})` : `rgba(212,42,31,${(-t * .6).toFixed(2)})`;
    return `<td style="background:${bg}" title="${esc(short(bt.id))} v ${esc(short(bw.id))}: ${x.r} off ${x.b}, out ${x.outs}"><b>${Math.round(sr)}</b>${x.outs ? `<small>${"•".repeat(Math.min(x.outs, 5))}${x.outs > 5 ? "+" : ""}</small>` : ""}</td>`; };
  const pr = pressureData(), psr = x => x.n ? x.r / x.n * 100 : 0;
  const cr = chaseRows();
  // pace v spin across the club
  const sty = { fast: { b: 0, r: 0, w: 0, dots: 0, s: 0 }, spin: { b: 0, r: 0, w: 0, dots: 0, s: 0 } };
  P.forEach(q => { const t = sty[q.bowl_style]; if (!t) return; t.b += q.bowl.b; t.r += q.bowl.r; t.w += q.bowl.w; t.dots += q.bowl.dots; });
  H.forEach(x => { const t = sty[P.get(x.bowl)?.bowl_style]; if (t) t.s += x.s; });
  const bestV = k => [...P.values()].map(q => ({ q, x: styleSplit(q)[k] })).filter(o => o.x.b >= 30).sort((a, b) => b.x.r / b.x.b - a.x.r / a.x.b)[0];
  const pv = `<h3 class="xr-h">Pace v spin</h3><div class="tbl-wrap"><table class="data"><thead><tr><th>Bowling</th><th>Overs</th><th>Wkts</th><th>Econ</th><th>Avg</th><th>Balls/wkt</th><th>Dots</th><th>6s hit off</th><th>Best batter against</th></tr></thead><tbody>${["fast", "spin"].map(k => { const t = sty[k], bv = bestV(k); return `<tr><td class="nm">${STYLE[k]}</td><td>${ovs(t.b)}</td><td>${t.w}</td><td class="hi">${r1(t.r / t.b * 6)}</td><td>${t.w ? r1(t.r / t.w) : "–"}</td><td>${t.w ? r1(t.b / t.w) : "–"}</td><td>${Math.round(t.dots / t.b * 100)}%</td><td>${t.s}</td><td>${bv ? `${plink(bv.q.id, short(bv.q.id))} <small class="label">SR ${Math.round(bv.x.r / bv.x.b * 100)}</small>` : "–"}</td></tr>`; }).join("")}</tbody></table></div>`;
  const bestAvg = k => [...P.values()].map(q => ({ q, x: styleSplit(q)[k] })).filter(o => o.x.b >= 30 && o.x.o >= 2).sort((a, b) => b.x.r / b.x.o - a.x.r / a.x.o).slice(0, 5);
  const avgList = (k, t) => `<div class="xr-card"><h3 class="tbl-title">${t}</h3><ol class="xr-list">${bestAvg(k).map((o, i) => `<li><span class="xr-n">${i + 1}</span><a class="xr-who" href="${purl(o.q.id)}">${miniThumb(o.q)}<b>${esc(pname(o.q.id))}</b></a><b class="xr-big">${r1(o.x.r / o.x.o)}</b><small class="xr-d">${o.x.r} runs, out ${o.x.o} times · SR ${Math.round(o.x.r / o.x.b * 100)}</small></li>`).join("")}</ol></div>`;
  const avgs = `<div class="xr-grid" style="margin-top:22px">${avgList("fast", "Best average against pace")}${avgList("spin", "Best average against spin")}</div><p class="rank-note">Batting average against each bowling style: 30 balls and 2 dismissals or more.</p>`;
  el.innerHTML = `${pv}${avgs}
    <h3 class="xr-h">Every matchup</h3>
    <p class="rank-note">Batters across, bowlers down. The number is the batter's strike rate against that bowler; green means the batter wins the matchup, red the bowler (against a league ${Math.round(lsr)}). Dots are dismissals. Six balls or more.</p>
    <div class="tbl-wrap hm-wrap"><table class="hm"><thead><tr><th></th>${bats.map(p => `<th><a href="${purl(p.id)}">${esc(short(p.id))}</a></th>`).join("")}</tr></thead>
    <tbody>${bowls.map(bw => `<tr><th><a href="${purl(bw.id)}">${esc(short(bw.id))}</a></th>${bats.map(bt => cell(bt, bw)).join("")}</tr>`).join("")}</tbody></table></div>
    <h3 class="xr-h">Under pressure</h3>
    <div class="xr-grid">
      <div class="xr-card"><h3 class="tbl-title">After two dots in a row</h3><p class="rank-note">How batters respond on the next ball. Ten balls or more.</p>
        <div class="tbl-wrap"><table class="data"><thead><tr><th>Batter</th><th>Balls</th><th>SR</th><th>Usual SR</th><th>Out</th></tr></thead><tbody>${pr.bat.sort((a, b) => psr(b) - psr(a)).map(x => `<tr><td class="nm">${plink(x.id, short(x.id))}</td><td>${x.n}</td><td class="hi">${Math.round(psr(x))}</td><td>${Math.round(P.get(x.id).bat.sr)}</td><td>${x.o}</td></tr>`).join("")}</tbody></table></div></div>
      <div class="xr-card"><h3 class="tbl-title">After being hit for four or six</h3><p class="rank-note">How bowlers respond on the next ball. Ten balls or more.</p>
        <div class="tbl-wrap"><table class="data"><thead><tr><th>Bowler</th><th>Balls</th><th>Wkts</th><th>Wkt %</th><th>Runs/ball</th></tr></thead><tbody>${pr.bowl.sort((a, b) => b.o / b.n - a.o / a.n || a.r / a.n - b.r / b.n).map(x => `<tr><td class="nm">${plink(x.id, short(x.id))}</td><td>${x.n}</td><td>${x.o}</td><td class="hi">${Math.round(x.o / x.n * 100)}%</td><td>${r1(x.r / x.n)}</td></tr>`).join("")}</tbody></table></div></div>
    </div>
    <h3 class="xr-h">Chase odds</h3>
    <p class="rank-note">How often the chasing side won from each spot, taken at the end of every over of every finished chase (${cr.length} spots in ${new Set(cr.map(x => x.mm.id)).size} chases). Scorecards show the odds over by over.</p>
    <div class="tbl-wrap"><table class="data"><thead><tr><th>Required rate</th>${LB.map(b => `<th>${b[2]}</th>`).join("")}</tr></thead><tbody>${RRB.map(a => `<tr><td class="nm">${a[2]} an over</td>${LB.map(b => { const s = cr.filter(x => x.rr >= a[0] && x.rr < a[1] && x.left >= b[0] && x.left <= b[1]); return `<td>${s.length ? `<b>${Math.round(s.filter(x => x.won).length / s.length * 100)}%</b> <small class="label">${s.filter(x => x.won).length}/${s.length}</small>` : "–"}</td>`; }).join("")}</tr>`).join("")}</tbody></table></div>`;
}

/* ---------------- player DNA radar, form tags, comparison share card ---------------- */
function dnaRadar(p) {
  const ps = [...P.values()].filter(q => q.matches >= 5), s30 = q => q.bat.inns ? [...q.log.values()].reduce((a, l) => a + l.bat.filter(b => b.r >= 30).length, 0) / q.bat.inns : 0;
  const axes = [["Power", q => q.bat.b >= 30 ? q.bat.sr : null], ["Six hitting", q => q.bat.b >= 30 ? q.bat.s / q.bat.b : null], ["Consistency", q => q.bat.inns >= 6 ? s30(q) : null],
    ["Control", q => q.bowl.b >= 36 ? -q.bowl.econ : null], ["Wicket taking", q => q.bowl.b >= 36 && q.bowl.w ? -q.bowl.sr : null], ["Fielding", q => (q.fld.c + q.fld.ro) / q.matches], ["Impact", q => oppOf(q).value]];
  const pct = (f) => { const v = f(p); if (v === null) return null; const all = ps.map(f).filter(x => x !== null); if (all.length < 2) return 50; return Math.round(all.filter(x => x < v).length / (all.length - 1) * 100); };
  const vals = axes.map(([l, f]) => ({ l, v: pct(f) })), N = vals.length, C = 150, Rr = 110;
  const pt = (i, r) => { const a = -Math.PI / 2 + i / N * Math.PI * 2; return [C + Math.cos(a) * r, C + Math.sin(a) * r]; };
  const poly = f => vals.map((x, i) => pt(i, Rr * f(x) / 100).map(n => n.toFixed(1)).join(",")).join(" ");
  return `<h2 class="sec-t">Player DNA</h2><div class="dna"><svg class="dna-svg" viewBox="0 0 300 300" role="img" aria-label="Percentile against the club on seven skills">
    ${[25, 50, 75, 100].map(g => `<polygon class="dna-g" points="${vals.map((_, i) => pt(i, Rr * g / 100).map(n => n.toFixed(1)).join(",")).join(" ")}"/>`).join("")}
    ${vals.map((_, i) => { const [x, y] = pt(i, Rr); return `<line class="dna-g" x1="${C}" y1="${C}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}"/>`; }).join("")}
    <polygon class="dna-club" points="${poly(() => 50)}"/><polygon class="dna-me ${p.tm.key}" points="${poly(x => x.v || 0)}"/>
    ${vals.map((x, i) => { const [lx, ly] = pt(i, Rr + 24); return `<text class="dna-l" x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" text-anchor="middle">${x.l}</text>`; }).join("")}
  </svg><ul class="dna-list">${vals.map(x => `<li><span>${x.l}</span><b>${x.v === null ? "–" : x.v}</b><i style="width:${x.v || 0}%"></i></li>`).join("")}</ul></div>
  <p class="rank-note">Percentile against everyone with five matches or more: 100 is the best in the club, 50 (the dashed shape) is the middle. A dash means not enough balls yet.</p>`;
}
function formTag(p) {
  if (!p.matches) return "";
  const f = formData().find(x => x.p.id === p.id), tags = [];
  if (WEEK?.isMvp(p.id)) tags.push(["mvp", "Reigning MVP"]);
  if (f) tags.push(f.trend === "hot" ? ["hot", "On fire"] : f.trend === "cold" ? ["cold", "Searching for form"] : f.trend === "new" ? ["new", "New face"] : ["steady", "Steady form"]);
  return tags.map(([c, t]) => `<span class="pb ftag ${c}">${t}</span>`).join("");
}
async function compareShare(A, B) {
  const host = $("#cmpBody"); if (!host) return; host.querySelector(".cmp-share")?.remove(); if (!A || !B || A.id === B.id) return;
  const sc = [...host.querySelectorAll(".cmp-score b")].map(b => b.textContent), rows = [["Runs", p => p.bat.r], ["Average", p => r1(p.bat.avg)], ["Strike rate", p => Math.round(p.bat.sr)], ["Sixes", p => p.bat.s], ["Wickets", p => p.bowl.w], ["Economy", p => r1(p.bowl.econ)], ["Catches", p => p.fld.c], ["MVP awards", p => p.mvpN]];
  host.insertAdjacentHTML("beforeend", `<div class="cmp-share"><h3 class="tbl-title" style="margin-top:30px">Share this comparison</h3><div class="pick-actions"><button type="button" class="btn solid" id="hhCopy">Copy image</button><a class="btn" id="hhWa" target="_blank" rel="noopener">Send on WhatsApp ↗</a><button type="button" class="btn" id="hhDl" hidden>Download</button></div><p class="label" id="hhMsg"></p><img class="card-img" id="hhImg" alt="Head to head card"></div>`);
  const { c, x } = await canvasBase("Head to head");
  await drawPhoto(x, A, 60, 200, 300); await drawPhoto(x, B, 720, 200, 300);
  x.textAlign = "center"; x.fillStyle = CC.ink; x.font = `900 120px ${DISP}`; x.fillText(`${sc[0] || 0}–${sc[1] || 0}`, 540, 360); x.font = `600 22px ${MONO}`; x.fillStyle = CC.muted; x.fillText("CATEGORIES WON", 540, 400);
  x.font = `800 44px ${DISP}`; x.fillStyle = A.tm.key === "f" ? CC.f : CC.t; x.fillText((A.full_name || A.name).toUpperCase().slice(0, 18), 210, 560); x.fillStyle = B.tm.key === "f" ? CC.f : CC.t; x.fillText((B.full_name || B.name).toUpperCase().slice(0, 18), 870, 560);
  rows.forEach(([l, f], i) => { const y = 640 + i * 68, a = f(A), b = f(B), na = parseFloat(a), nb = parseFloat(b), low = l === "Economy", aw = na !== nb && ((na > nb) !== low), bw = na !== nb && !aw;
    x.fillStyle = i % 2 ? CC.paper : "#ecebe4"; x.fillRect(60, y - 46, 960, 64);
    x.font = `900 46px ${DISP}`; x.fillStyle = aw ? CC.red : CC.ink; x.fillText(String(a), 210, y); x.fillStyle = bw ? CC.red : CC.ink; x.fillText(String(b), 870, y);
    x.font = `600 24px ${MONO}`; x.fillStyle = CC.muted; x.fillText(l.toUpperCase(), 540, y - 6); });
  x.textAlign = "left";
  $("#hhImg").src = c.toDataURL("image/png");
  shareUI("hh", c, `bodevs-${A.slug}-v-${B.slug}.png`, `${pname(A.id)} v ${pname(B.id)}: ${sc[0]}–${sc[1]} across the categories.\n${SITE_BASE}/#compare`, "hhMsg");
}

/* ---------------- weekly: quiz, on this day, MVP poster ---------------- */
function weekQuiz(W, now) {
  const X = buildXR().raw, ids = new Set(W.WM.map(m => m.id)), q = [];
  const six = [...W.ranked].sort((a, b) => b.s - a.s)[0]; if (six?.s) q.push([`Who hit the most sixes ${now ? "this" : "that"} week?`, `${pname(six.id)}, with ${six.s}.`]);
  if (W.spell) q.push([`Who had the best bowling figures in a single spell?`, `${pname(W.spell.id)}: ${W.spell.w}/${W.spell.r} in ${W.spell.ov} overs.`]);
  const ob = X.overBat.filter(x => ids.has(x.mm.id)).sort((a, b) => b.r - a.r)[0]; if (ob) q.push([`What was the most runs one batter took off a single over?`, `${ob.r}, by ${pname(ob.id)} in over ${ob.ov} of match #${ob.mm.id}.`]);
  if (W.knock) q.push([`What was the top score, and how many balls did it take?`, `${W.knock.r}${W.knock.no ? "*" : ""} off ${W.knock.b} by ${pname(W.knock.id)}.`]);
  const qs = q.slice(0, 3), txt = `BoDevs Cricket quiz, issue ${W.issue}\n` + qs.map((x, i) => `${i + 1}. ${x[0]}`).join("\n") + `\nAnswers: ${SITE_BASE}/#weeknumbers`;
  return qs.length ? `<div class="xr-card"><h3 class="tbl-title">Quiz of the week</h3><ol class="qz">${qs.map(x => `<li><p>${esc(x[0])}</p><details><summary>Show answer</summary>${esc(x[1])}</details></li>`).join("")}</ol></div>` : "";
}
function onThisDay(W) {
  const i = WEEKS.indexOf(W), back = [[1, "One week ago"], [4, "Four weeks ago"], [8, "Eight weeks ago"]].map(([n, l]) => [l, WEEKS[i + n]]).filter(x => x[1]);
  if (!back.length) return "";
  return `<div class="xr-card"><h3 class="tbl-title">On this day</h3><ul class="otd">${back.map(([l, w]) => { const tw = Object.entries(w.tw);
    return `<li><span class="tp-d">${l} · issue ${w.issue}</span><p>${w.mvps.map(x => plink(x.id)).join(" & ")} ${w.joint ? "shared" : "was"} MVP${tw.length === 2 ? `; the week went ${esc(team(tw[0][0]).short)} ${tw[0][1].w}–${tw[1][1].w} ${esc(team(tw[1][0]).short)}` : ""}${w.knock ? `; top score ${w.knock.r}${w.knock.no ? "*" : ""} by ${plink(w.knock.id)}` : ""}.</p></li>`; }).join("")}</ul></div>`;
}
// photo cropped to fill a rectangle (portraits sit high in the frame)
async function drawFill(x, p, X, Y, Wd, Ht) {
  const ph = p?.photo ? await loadImg(p.photo) : null;
  x.fillStyle = p?.tm.key === "f" ? "#1d3f86" : "#8a3a10"; x.fillRect(X, Y, Wd, Ht);
  if (ph) { const s = Math.max(Wd / ph.width, Ht / ph.height) * 1.08, w = ph.width * s, h = ph.height * s; x.save(); x.beginPath(); x.rect(X, Y, Wd, Ht); x.clip(); x.drawImage(ph, X + (Wd - w) / 2, Y - h * 0.04, w, h); x.restore(); }
  else { x.fillStyle = "rgba(255,255,255,.85)"; x.font = `900 ${Math.round(Math.min(Wd, Ht) * .35)}px ${DISP}`; x.textAlign = "center"; x.fillText((p?.full_name || p?.name || "?").split(" ").map(w => w[0]).join("").slice(0, 2), X + Wd / 2, Y + Ht / 2 + Math.min(Wd, Ht) * .12); x.textAlign = "left"; }
}
async function drawRound(x, p, cx, cy, r) {
  const ph = p?.photo ? await loadImg(p.photo) : null; x.save(); x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.clip();
  x.fillStyle = p?.tm.key === "f" ? CC.f : CC.t; x.fillRect(cx - r, cy - r, r * 2, r * 2);
  if (ph) { const cw = ph.width * 0.8; x.drawImage(ph, ph.width * 0.1, ph.height * 0.04, cw, cw, cx - r, cy - r, r * 2, r * 2); }
  x.restore(); x.lineWidth = 6; x.strokeStyle = p?.tm.key === "f" ? CC.f : CC.t; x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.stroke();
}
const fitText = (x, t, maxW, size, weight, fam) => { let s = size; x.font = `${weight} ${s}px ${fam}`; while (x.measureText(t).width > maxW && s > 18) { s -= 4; x.font = `${weight} ${s}px ${fam}`; } return s; };
async function drawPoster(W) {
  await Promise.all(['900 160px "Big Shoulders Display"', '800 60px "Big Shoulders Display"', '600 28px "IBM Plex Mono"', '500 28px "IBM Plex Mono"'].map(f => document.fonts.load(f).catch(() => {})));
  const CWd = 1080, CHt = 1920, c = document.createElement("canvas"); c.width = CWd; c.height = CHt; const x = c.getContext("2d");
  const mv = W.mvps.map(z => ({ z, p: P.get(z.id) })).filter(o => o.p), rest = W.podium.filter(z => z.n > 1).slice(0, 2), tw = Object.entries(W.tw);
  x.fillStyle = "#0d0d0c"; x.fillRect(0, 0, CWd, CHt);
  // header: logo, issue
  const logo = await loadImg("assets/logo.png"); if (logo) x.drawImage(logo, 60, 56, logo.width * 60 / logo.height, 60);
  x.textAlign = "right"; x.fillStyle = CC.gold; x.font = `900 64px ${DISP}`; x.fillText(`ISSUE ${W.issue}`, CWd - 60, 108); x.textAlign = "left";
  {
    x.fillStyle = CC.gold; x.font = `900 120px ${DISP}`; x.fillText(W.joint ? "JOINT MVPS" : "MVP OF THE WEEK", 60, 270);
    x.fillStyle = "#bdb7aa"; x.font = `500 28px ${MONO}`; x.fillText(`${weekRange(W).toUpperCase()} · SPORTSX, G-12`, 60, 318);
    // photos
    const PY = 360, PH = 860, gap = 12, pw = (CWd - 120 - gap * (mv.length - 1)) / mv.length;
    for (let i = 0; i < mv.length; i++) { const X = 60 + i * (pw + gap); await drawFill(x, mv[i].p, X, PY, pw, PH);
      const g = x.createLinearGradient(0, PY + PH * .55, 0, PY + PH); g.addColorStop(0, "rgba(13,13,12,0)"); g.addColorStop(1, "rgba(13,13,12,.92)"); x.fillStyle = g; x.fillRect(X, PY + PH * .55, pw, PH * .45);
      x.fillStyle = mv[i].p.tm.key === "f" ? CC.f : CC.t; x.fillRect(X, PY + PH - 12, pw, 12);
      const nm = (mv[i].p.full_name || mv[i].p.name).toUpperCase(), parts = mv.length > 1 ? nm.split(" ") : [nm];
      x.fillStyle = "#fff"; let y = PY + PH - 60 - (parts.length - 1) * 70;
      parts.slice(0, 3).forEach(t => { fitText(x, t, pw - 40, mv.length > 1 ? 76 : 110, 900, DISP); x.fillText(t, X + 24, y); y += 70; });
      x.fillStyle = CC.gold; fitText(x, (mv[i].p.title || "").toUpperCase(), pw - 40, 26, 600, MONO); x.fillText((mv[i].p.title || "").toUpperCase(), X + 24, PY + PH - 60 - (parts.length - 1) * 70 - (mv.length > 1 ? 82 : 116));
    }
    // stats, one strip per MVP
    let SY = PY + PH + 60;
    mv.forEach(({ z, p }) => { const cells = [[z.r, "RUNS"], [z.w, "WKTS"], [z.c + (z.ro || 0), "CT+RO"], [z.pts, "PTS"]];
      if (mv.length > 1) { x.fillStyle = p.tm.key === "f" ? "#7fa6ff" : "#ff9b5e"; x.font = `800 30px ${DISP}`; x.fillText(short(p.id).toUpperCase(), 60, SY - 8); }
      cells.forEach(([v, l], i) => { const X = 60 + i * 245; x.fillStyle = i === 3 ? CC.gold : "#fff"; x.font = `900 ${mv.length > 1 ? 84 : 120}px ${DISP}`; x.fillText(String(v), X, SY + (mv.length > 1 ? 78 : 110));
        x.fillStyle = "#8f8a7f"; x.font = `600 22px ${MONO}`; x.fillText(l, X, SY + (mv.length > 1 ? 108 : 146)); });
      SY += mv.length > 1 ? 150 : 200; });
    // podium
    SY += 10; x.fillStyle = "#2a2926"; x.fillRect(60, SY, CWd - 120, 2); SY += 50;
    for (let i = 0; i < rest.length; i++) { const z = rest[i], p = P.get(z.id); if (!p) continue; const X = 60 + i * 490;
      await drawRound(x, p, X + 56, SY + 56, 56);
      x.fillStyle = CC.red; x.font = `600 22px ${MONO}`; x.fillText(z.role.toUpperCase(), X + 132, SY + 34);
      x.fillStyle = "#fff"; fitText(x, short(p.id).toUpperCase(), 330, 52, 800, DISP); x.fillText(short(p.id).toUpperCase(), X + 132, SY + 84);
      x.fillStyle = "#bdb7aa"; x.font = `500 22px ${MONO}`; x.fillText(`${z.pts} PTS`, X + 132, SY + 114); }
  }
  // result line and footer
  const res = tw.length === 2 ? `${team(tw[0][0]).short} ${tw[0][1].w}–${tw[1][1].w} ${team(tw[1][0]).short}`.toUpperCase() : "";
  x.fillStyle = "#bdb7aa"; x.font = `600 24px ${MONO}`; x.fillText([res, `${W.sixes} SIXES`, `${W.runs} RUNS`].filter(Boolean).join(" · "), 60, CHt - 120);
  x.fillStyle = CC.red; x.fillRect(0, CHt - 84, CWd, 84); x.fillStyle = "#fff"; x.font = `800 40px ${DISP}`; x.fillText("CRICKET.WAQARAHMED.NET", 60, CHt - 30);
  x.textAlign = "right"; x.font = `600 22px ${MONO}`; x.fillText("BODEVS CRICKET", CWd - 60, CHt - 36); x.textAlign = "left";
  return c;
}
let posterTok = 0;
async function renderPoster() {
  const host = $("#digestBody"); if (!host || !WEEK) return;
  let el = $("#posterBox"); if (!el) { el = document.createElement("div"); el.id = "posterBox"; host.after(el); }
  const W = selW(), tok = ++posterTok;
  el.innerHTML = `<div class="pst"><div class="pst-copy"><p class="kicker">MVP poster · Issue ${W.issue}</p><h3 class="pst-h">${W.joint ? "Joint MVPs" : "MVP of the week"}, ready to post</h3>
      <p class="pst-dek">${W.mvps.map(z => `<b>${esc(pname(z.id))}</b>`).join(" & ")}${W.joint ? " share" : " takes"} the week with ${W.pow.pts} points. Sized 9:16 for WhatsApp status and stories.</p>
      <div class="pick-actions"><button type="button" class="btn solid" id="mvppCopy">Copy image</button><a class="btn" id="mvppWa" target="_blank" rel="noopener">Send on WhatsApp ↗</a><button type="button" class="btn" id="mvppDl" hidden>Download</button></div>
      <p class="label" id="mvppMsg"></p></div>
    <div class="pst-frame story"><img id="mvppImg" alt="MVP poster for issue ${W.issue}"><span class="pst-load">Drawing the poster…</span></div></div>`;
  await new Promise(res => { const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { io.disconnect(); res(); } }, { rootMargin: "300px" }); io.observe(el); });
  const c = await drawPoster(W); if (tok !== posterTok || !$("#mvppImg")) return;
  $("#mvppImg").src = c.toDataURL("image/png"); el.querySelector(".pst-load")?.remove();
  shareUI("mvpp", c, `bodevs-mvp-issue-${W.issue}.png`, `${W.joint ? "Joint MVPs" : "MVP"} of the week, issue ${W.issue}: ${W.mvps.map(z => `${pname(z.id)} (${z.pts} pts)`).join(" & ")}.\n${SITE_BASE}`, "mvppMsg");
}

/* ---------------- search: players, matches and sections ("/" opens it) ---------------- */
function initSearch() {
  if ($("#srch")) return;
  const menu = document.querySelector(".mast .navmenu"); if (!menu) return;
  menu.insertAdjacentHTML("beforebegin", `<button type="button" class="srch-btn" id="srchBtn" aria-label="Search players and matches"><span class="srch-i" aria-hidden="true">⌕</span><span class="srch-t">Search</span></button>`);
  document.body.insertAdjacentHTML("beforeend", `<div class="srch" id="srch" hidden role="dialog" aria-label="Search"><div class="srch-box"><input id="srchIn" type="search" placeholder="Player, match #, team or section" autocomplete="off" aria-label="Search"><ul id="srchList"></ul><p class="rank-note">Press / to search from anywhere, Enter to open the first result.</p></div></div>`);
  let all = null; const box = $("#srch"), inp = $("#srchIn"), list = $("#srchList");
  const items = () => [
    ...[...P.values()].filter(p => p.matches).sort((a, b) => b.matches - a.matches).map(p => ({ t: pname(p.id), s: `${p.title || ""} · ${p.tm.short}${p.keeper ? " · keeper" : ""}`, h: purl(p.id), k: `${p.name} ${p.full_name || ""} ${p.title || ""} ${p.tm.short}`.toLowerCase() })),
    ...M.map(m => ({ t: `Match #${m.id}`, s: `${dShort(m.date)} · ${m.win ? `${m.win.short} won by ${m.margin}` : m.m.status_label} · ${m.fmt}`, h: `#match-${m.id}`, k: `#${m.id} match ${m.id} ${m.fmt} ${dShort(m.date)} ${m.m.team_a.name} ${m.m.team_b.name}`.toLowerCase() })),
    ...[...document.querySelectorAll(".navmenu .nm-panel a")].map(a => ({ t: a.textContent, s: "Section", h: a.getAttribute("href"), k: a.textContent.toLowerCase() })),
  ];
  const show = () => { all = all || items(); const q = inp.value.trim().toLowerCase();
    const r = (q ? all.filter(x => q.split(/\s+/).every(w => x.k.includes(w))) : all.slice(0, 8)).slice(0, 12);
    list.innerHTML = r.map(x => `<li><a href="${x.h}"><b>${esc(x.t)}</b><small>${esc(x.s)}</small></a></li>`).join("") || `<li class="dnb">Nothing matches “${esc(inp.value)}”.</li>`; };
  const open = () => { box.hidden = false; inp.value = ""; show(); inp.focus(); }, close = () => { box.hidden = true; };
  $("#srchBtn").onclick = open; inp.oninput = show;
  box.addEventListener("click", e => { if (e.target === box || e.target.closest("a")) close(); });
  inp.addEventListener("keydown", e => { if (e.key === "Enter") { const a = list.querySelector("a"); if (a) { location.hash = a.getAttribute("href"); close(); } } if (e.key === "Escape") close(); });
  document.addEventListener("keydown", e => { if (e.key === "/" && !/input|textarea|select/i.test(document.activeElement?.tagName || "") && box.hidden) { e.preventDefault(); open(); } });
}

/* ---------------- season archive and switcher ---------------- */
function renderArchive() {
  const el = $("#archiveBody"); if (!el) return;
  const list = typeof SEASONS !== "undefined" ? SEASONS : [], cur = typeof SEASON !== "undefined" ? SEASON : null;
  const link = id => `${location.pathname}?season=${id}${location.hash}`;
  if (list.length > 1 && !$("#seasonSel")) {
    document.querySelector(".mast .navmenu")?.insertAdjacentHTML("beforebegin", `<select id="seasonSel" class="season-sel" aria-label="Season">${list.slice().reverse().map(s => `<option value="${s.id}"${s.id === cur ? " selected" : ""}>${esc(s.name)}</option>`).join("")}<option value="all"${cur === "all" ? " selected" : ""}>All-time</option></select>`);
    $("#seasonSel").onchange = e => { try { localStorage.setItem("bdc-season", e.target.value); } catch {} location.href = link(e.target.value); };
  }
  const name = cur === "all" ? "All-time" : list.find(s => s.id === cur)?.name;
  if (name && WEEK && $("#issueNo") && !$("#issueNo").dataset.season) { $("#issueNo").dataset.season = 1; $("#issueNo").textContent = `${name} · ${$("#issueNo").textContent}`; }
  el.innerHTML = list.length ? `<div class="ar-grid">${list.slice().reverse().map((s, i) => `<article class="ar-card ${s.id === cur ? "on" : ""}"><p class="kicker">${s.id === cur ? "Showing now" : i ? "Archive" : "Current season"}</p><h3>${esc(s.name)}</h3><p>${esc(s.note || `From match #${s.from}${s.started ? `, ${s.started}` : ""}`)}</p>${s.id === cur ? "" : `<a class="btn small" href="${link(s.id)}">Open ${esc(s.name)}</a>`}</article>`).join("")}
    <article class="ar-card ${cur === "all" ? "on" : ""}"><p class="kicker">Every season</p><h3>All-time</h3><p>Records, rankings and players across every season together.</p>${cur === "all" ? "" : `<a class="btn small" href="${link("all")}">Open all-time</a>`}</article></div>
    <p class="rank-note" style="margin-top:12px">Each season keeps its own MVPs, awards, records and player pages. A new season starts from the first match of the new year's fixtures.</p>` : `<p class="dnb">Season archive will appear here.</p>`;
}

/* ---------------- live centre (#live) ---------------- */
function renderLiveCentre(j) {
  const el = $("#liveBody"); if (!el) return;
  const live = (j?.matches || []).filter(m => m.state), tab = $("#liveTab"); if (tab) tab.hidden = !live.length;
  if (!live.length) { const last = M[0];
    el.innerHTML = `<div class="lc-off"><p class="kicker">No match on right now</p><p class="lc-big">Match night is Sunday at SportsX, G-12.</p>${last ? `<p class="lc-line">Last result: ${matchLink(last)}: ${last.win ? `${esc(last.win.short)} won by ${esc(last.margin)}` : esc(last.m.status_label)}.</p>` : ""}
      <p class="rank-note">During a match this page shows the score, the batters, the bowler, the last balls and the run worm, refreshed every 30 seconds. A Live tab appears in the menu when a match starts.</p></div>`; return; }
  el.innerHTML = live.map(m => { const sc = m.state.scorecards || [], cur = sc.at(-1); if (!cur) return "";
    const lastFow = (cur.fow || []).at(-1), ps = cur.runs - (lastFow ? lastFow.score : 0), bw = (cur.bowling || []).find(b => b.current);
    const recent = (cur.commentary || []).filter(c => c.type === "ball").slice(0, 12).reverse();
    const fake = { s: { scorecards: sc }, m: { overs: m.state.overs || m.overs || 10 } };
    return `<article class="lc"><p class="kicker"><span class="dot"></span> Live · Match #${m.id}${m.label ? ` · ${esc(m.label)}` : ""}</p>
      <div class="lc-score ${team(cur.batting_team).key}"><b>${esc(team(cur.batting_team).short)} ${cur.runs}/${cur.wickets}</b><span>${esc(cur.overs)} overs · RR ${esc(cur.crr || "")}</span></div>
      ${cur.target ? `<p class="lc-need">Need <b>${cur.need}</b> off <b>${cur.balls_left}</b> balls${cur.balls_left ? ` · required rate ${r1(cur.need / cur.balls_left * 6)}` : ""}${cur.balls_left ? (() => { const o = oddsAt(cur.need, cur.balls_left); return o.n ? ` · teams in this spot won ${Math.round(o.w / o.n * 100)}%` : ""; })() : ""}</p>` : ""}
      <div class="lc-grid"><div><h3 class="tbl-title">At the crease</h3><ul class="lc-list">${(cur.batting || []).filter(b => b.at_crease).map(b => `<li><b>${esc(b.name)}${b.on_strike ? " *" : ""}</b><span>${b.runs} (${b.balls}) · ${b.fours || 0}×4 ${b.sixes || 0}×6</span></li>`).join("")}</ul><p class="lc-line">Partnership: <b>${ps}</b></p></div>
        <div><h3 class="tbl-title">Bowling</h3>${bw ? `<ul class="lc-list"><li><b>${esc(bw.name)}</b><span>${esc(bw.overs)}-${bw.runs}-${bw.wickets} · econ ${esc(bw.econ || "")}</span></li></ul>` : `<p class="dnb">Between overs.</p>`}
        <h3 class="tbl-title" style="margin-top:14px">Last balls</h3><div class="balls lc-balls">${recent.map(c => `<span class="b ${c.badge.kind}" title="${esc(c.text)}">${esc(c.badge.mark)}</span>`).join("")}</div></div></div>
      ${worm(fake)}<p class="lc-line"><a href="https://tassadduq.com/cricket/match?id=${m.id}" target="_blank" rel="noopener">Full ball-by-ball on the scoring site ↗</a></p></article>`; }).join("");
}

/* ---------------- install as an app ---------------- */
let INSTALL = null;
addEventListener("beforeinstallprompt", e => { e.preventDefault(); INSTALL = e; renderGetApp(); });
function renderGetApp() {
  const el = $("#getappBody"); if (!el) return;
  const installed = matchMedia("(display-mode: standalone)").matches, ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  el.innerHTML = `<div class="ga-grid"><div><p class="ga-big">${installed ? "You're using the app." : "One tap from your home screen."}</p>
    <p>Opens full screen like an app, and the last synced scores stay readable without a connection.</p>
    ${INSTALL && !installed ? `<button type="button" class="btn solid" id="installBtn">Install BoDevs Cricket</button>` : ""}</div>
    <div class="ga-steps"><h3 class="tbl-title">${ios ? "On iPhone" : "On Android"}</h3><ol>${ios ? "<li>Open this site in Safari.</li><li>Tap the Share button.</li><li>Choose <b>Add to Home Screen</b>.</li>" : "<li>Open this site in Chrome.</li><li>Tap the menu (⋮).</li><li>Choose <b>Install app</b> or <b>Add to Home screen</b>.</li>"}</ol></div></div>`;
  const b = $("#installBtn"); if (b) b.onclick = async () => { INSTALL.prompt(); await INSTALL.userChoice.catch(() => {}); INSTALL = null; renderGetApp(); };
}

/* ---------------- invite: a richer Play us section ---------------- */
function renderInvite() {
  const box = document.querySelector("#play .wa"); if (!box || $("#invForm")) return;
  const inns = M.flatMap(m => m.s.scorecards), sixes = inns.reduce((a, sc) => a + sc.batting.reduce((x, b) => x + b.sixes, 0), 0);
  const fmts = [...new Set(M.map(m => `${m.fmt} · ${m.m.overs} overs`))].slice(0, 4);
  document.querySelector("#play .back-grid > div").insertAdjacentHTML("beforeend", `<div class="inv-stats">
    <div><b>${M.length}</b><span>matches this season</span></div><div><b>${Math.round(inns.reduce((a, sc) => a + sc.runs, 0) / Math.max(1, inns.length))}</b><span>average innings</span></div>
    <div><b>${sixes.toLocaleString()}</b><span>sixes hit</span></div><div><b>3–5</b><span>players a side</span></div></div>
    <p class="inv-f">Formats we play: ${fmts.map(esc).join(", ")}. Tilde swing balls provided. Sunday nights at SportsX, G-12.</p>`);
  box.querySelector("pre").insertAdjacentHTML("beforebegin", `<form id="invForm" class="inv-form" onsubmit="return false">
    <label><span class="label">Team name</span><input id="invTeam" placeholder="Your team"></label>
    <label><span class="label">Players</span><select id="invN"><option>3</option><option>4</option><option selected>5</option></select></label>
    <label><span class="label">Preferred Sunday</span><input id="invDate" type="date"></label>
    <label><span class="label">Format</span><select id="invFmt"><option>Short, 5 overs</option><option>Test, two innings of 10 overs</option><option>Whatever suits</option></select></label></form>`);
  const upd = () => { const d = $("#invDate").value ? new Date($("#invDate").value + "T12:00").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" }) : "";
    const msg = `Hi BoDevs Cricket! We'd like a challenge match at SportsX, G-12.\nTeam name: ${$("#invTeam").value || ""}\nPlayers: ${$("#invN").value}\nPreferred Sunday: ${d}\nFormat: ${$("#invFmt").value}`;
    $("#waMsg").textContent = msg; $("#challengeBtn").href = "https://wa.me/923135052165?text=" + encodeURIComponent(msg); };
  $("#invForm").addEventListener("input", upd); upd();
}

/* ---------------- home: sticky week bar that follows the slider ---------------- */
function initWeekBar() {
  if ($("#weekBar") || !$("#top")) return;
  // sits right under the cover, so it sticks once the cover has scrolled away
  (document.querySelector(".ticker") || $("#since")).insertAdjacentHTML("afterend", `<div class="weekbar" id="weekBar" data-page="home"><div class="wrap"><button type="button" class="mvp-btn" id="wbPrev">← Newer</button><span id="wbLabel" class="label"></span><button type="button" class="mvp-btn" id="wbNext">Older →</button></div></div>`);
  $("#wbPrev").onclick = () => $("#mvpPrev")?.click(); $("#wbNext").onclick = () => $("#mvpNext")?.click();
  updateWeekBar();
}
function updateWeekBar() {
  const W = selW(), l = $("#wbLabel"); if (!l || !W) return; const i = WEEKS.indexOf(W);
  l.innerHTML = `<b>Issue ${W.issue}</b> · ${esc(weekRange(W))}${W === WEEK ? " · this week" : ""}`;
  $("#wbPrev").disabled = i <= 0; $("#wbNext").disabled = i >= WEEKS.length - 1;
}

/* ---------------- the week picked in the MVP slider drives the weekly home sections ---------------- */
let SELW = null;
const selW = () => SELW || WEEK;
window.setWeek = i => { const W = WEEKS[i]; if (!W || W === selW()) return; SELW = W; renderSince(); renderWeekAwards(); renderWeekNumbers(); renderDigest(); renderPoster(); updateWeekBar(); };

/* ---------------- run everything after the main render ---------------- */
window.renderExtras = function () {
  addUniqueAwards(); initSearch(); initWeekBar();
  renderSince(); renderWeekAwards(); renderWeekNumbers(); renderNextSunday(); renderStory(); renderXR(); renderUnderrated(); renderTape(); renderStatsHero(); renderPlayersHero(); renderSeasonHero(); renderSeasonAwards(); renderSeasonBook(); renderMatchups(); renderArchive(); renderLiveCentre(null); renderGetApp(); renderInvite(); renderPoster();
  if (typeof CMP !== "undefined") compareShare(P.get(CMP.a), P.get(CMP.b)); renderPartnerships(); renderTactics(); renderPhases();
  renderDigest(); renderFixtures(); renderGallery(); checkLive();
};
// show the right page straight away, before the data has loaded
tagPages();
if (!/^#(match-\d|player-\d)/.test(location.hash)) window.pageRoute(location.hash);
if (typeof D !== "undefined" && D && M) window.renderExtras();

// the comparison redraws through drawCompare; add the share card each time
if (typeof drawCompare === "function" && !window._cmpWrapped) { window._cmpWrapped = 1; const _dc = drawCompare; drawCompare = function () { _dc(); compareShare(P.get(CMP.a), P.get(CMP.b)); }; }
