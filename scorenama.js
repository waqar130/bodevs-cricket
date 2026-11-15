// Reads the BoDevs group from the Scorenama Read API v1 and converts each match into the shape the site was built on
// (the old scorecard app's state.php), so the pages don't need to change. Guide: Scorenama-API-v1-Guide.pdf.
const SCORENAMA_BASE = process.env.SCORENAMA_BASE || "https://scorenama.com/api/v1";
const SCORENAMA_GROUP = process.env.SCORENAMA_GROUP || "7142662p6r2u";
const GROUP_URL = `${SCORENAMA_BASE}/groups/${SCORENAMA_GROUP}`;

async function getJSON(path) {
  const res = await fetch(GROUP_URL + path, { headers: { "User-Agent": "BoDevsCricketSync/2.0", Accept: "application/json" } });
  if (!res.ok) throw new Error(`Scorenama ${res.status} for ${path}`);
  const body = await res.json();
  if (body.apiVersion !== 1) throw new Error(`Scorenama: unexpected apiVersion ${body.apiVersion}`);
  return body;
}

// overs are cricket notation strings: "2.5" is 2 overs and 5 balls
const ballsOf = o => { const [a, b = "0"] = String(o || "0").split("."); return (+a || 0) * 6 + (+b || 0); };
const oversOf = b => `${Math.floor(b / 6)}.${b % 6}`;
const ord = n => n + (["th", "st", "nd", "rd"][(n % 100 > 10 && n % 100 < 14) ? 0 : n % 10 < 4 ? n % 10 : 0] || "th");
const plural = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;
const UP = s => String(s).toUpperCase();
// "Sun 15 Nov · 11:22 PM" in Pakistan time, the format the site reads match dates from
function whenPK(iso) {
  const d = new Date(new Date(iso).getTime() + 5 * 3600e3);
  const day = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getUTCDay()], mon = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][d.getUTCMonth()];
  let h = d.getUTCHours(); const ap = h >= 12 ? "PM" : "AM"; h = h % 12 || 12;
  return `${day} ${d.getUTCDate()} ${mon} · ${h}:${String(d.getUTCMinutes()).padStart(2, "0")} ${ap}`;
}

// One delivery, read from Scorenama's label and commentary line
function parseBall(b) {
  const m = String(b.text).match(/^(.+?) to (.+?), (.*)$/), rest = m ? m[3] : String(b.text), L = String(b.label);
  const wide = /wd$/.test(L) || /^wide/i.test(rest), nb = /^nb/.test(L) || /^no-ball/i.test(rest);
  const bye = rest.match(/(\d+) (leg )?byes?\b/i);
  let bat = 0;
  if (wide || bye) bat = 0;
  else if (nb) bat = +((L.match(/^nb\+(\d+)/) || [])[1] || (rest.match(/(\d+) off the bat/) || [])[1] || 0);
  else bat = +b.runs || 0;
  const wk = rest.match(/OUT, (.+?) (caught|bowled|run out|hit wicket|lbw|stumped)(?: \(([^)]+)\))?/);
  const drop = rest.match(/dropped by ([^,]+)/);
  const byeRuns = bye ? bye[1] * 1 : 0;
  return { conceded: (+b.runs || 0) - byeRuns, bowler: m ? m[1] : null, batter: m ? m[2] : null, rest, label: L, runs: +b.runs || 0, bat, wide, nb, legal: !wide && !nb,
    wideRuns: wide ? (+((L.match(/^(\d+)wd/) || [])[1]) || Math.max(1, +b.runs || 1)) : 0, bye: bye ? { n: +bye[1], leg: !!bye[2] } : null,
    four: bat === 4 && (nb || /FOUR/.test(rest)), six: bat === 6 && (nb || /SIX/.test(rest)),
    out: wk ? { player: wk[1], type: wk[2], fielder: wk[3] || null } : null, drop: drop ? drop[1].trim() : null, over: +b.over };
}
// the old app's ball marker
function badge(x) {
  if (x.out) return x.wide ? { mark: "W", kind: "wicket", extra: "wide" } : { mark: "W", kind: "wicket" };
  if (x.wide) return { mark: x.wideRuns > 1 ? `${x.wideRuns}wd` : "WD", kind: "wide", extra: "wide" };
  if (x.nb) return x.six ? { mark: "6", kind: "six", extra: "noball" } : x.four ? { mark: "4", kind: "four", extra: "noball" } : { mark: x.bat ? String(x.bat) : "NB", kind: "noball", extra: "noball" };
  if (x.six) return { mark: "6", kind: "six" };
  if (x.four) return { mark: "4", kind: "four" };
  if (x.drop) return { mark: x.bat ? String(x.bat) : "•", kind: "drop" };
  return x.bat || x.bye ? { mark: String(x.bat || x.runs), kind: "runs" } : { mark: "•", kind: "dot" };
}
// the old app's commentary line: "MAZHAR TO TASSADDUQ, DROPPED BY ABDULLAH, SIX RUNS"
function ballText(x) {
  const runsWord = r => r === 0 ? "NO RUN" : r === 4 ? "FOUR RUNS" : r === 6 ? "SIX RUNS" : r === 1 ? "1 RUN" : `${r} RUNS`;
  let d;
  if (x.out) { const t = { caught: "CAUGHT", bowled: "BOWLED", "run out": "RUN OUT", "hit wicket": "HIT WICKET", lbw: "LBW", stumped: "STUMPED" }[x.out.type];
    d = x.wide ? `${t} (WIDE)` : x.runs ? `${t}, ${runsWord(x.runs)}` : t; }
  else if (x.wide) d = x.wideRuns > 1 ? `WIDE, ${x.wideRuns} RUNS` : "WIDE";
  else if (x.nb) d = x.bat ? `NO BALL, ${runsWord(x.bat)}` : "NO BALL";
  else if (x.bye) d = `${plural(x.bye.n, x.bye.leg ? "LEG BYE" : "BYE").toUpperCase()}`;
  else d = runsWord(x.bat);
  if (x.drop && !x.out) d = `DROPPED BY ${UP(x.drop)}, ${d}`;
  return `${UP(x.bowler)} TO ${UP(x.batter)}, ${d}`;
}
const outKind = how => /^c /.test(how) ? "caught" : /^b /.test(how) ? "bowled" : /^run out/.test(how) ? "run_out" : /^hit wicket/.test(how) ? "hit_wicket" : /^lbw/.test(how) ? "lbw" : /^st /.test(how) ? "stumped" : "other";

// One Scorenama match -> the old state.php object. idOf(name) gives the site's player id, teamId(name) the team's.
function toState(sm, idOf, teamId) {
  const A = sm.teams.a.name, B = sm.teams.b.name, other = t => t === A ? B : A, maxB = (sm.overs || 0) * 6;
  const scorecards = (sm.scorecards || []).slice().sort((a, b) => a.number - b.number).map(sc => {
    const balls = (sc.balls || []).map(parseBall), bowlingTeam = other(sc.battingTeam);
    const legalN = balls.filter(x => x.legal).length || ballsOf(sc.overs);
    const ent = (map, k, init) => { if (!map.has(k)) map.set(k, init()); return map.get(k); };
    // per batter and bowler, from the balls
    const bt = new Map(), bw = new Map(), catches = new Map(), runouts = new Map(), drops = new Map(), lives = new Map();
    const bump = (map, k) => map.set(k, (map.get(k) || 0) + 1);
    balls.forEach(x => {
      const mk = badge(x);
      if (x.batter && !x.wide) { const e = ent(bt, x.batter, () => ({ dots: 0, ones: 0, twos: 0, threes: 0, timeline: [] }));
        e.timeline.push(mk); if (x.legal && !x.bat && !x.out && !x.bye) e.dots++; if (x.bat === 1) e.ones++; if (x.bat === 2) e.twos++; if (x.bat === 3) e.threes++; }
      if (x.bowler) { const e = ent(bw, x.bowler, () => ({ dots: 0, fours: 0, sixes: 0, wicket_list: [], spell: new Map() }));
        if (x.legal && x.conceded === 0) e.dots++; if (x.four) e.fours++; if (x.six) e.sixes++;
        if (x.out && x.out.type !== "run out") e.wicket_list.push(x.out.player);
        ent(e.spell, x.over, () => []).push(mk); }
      if (x.out?.type === "caught" && x.out.fielder) bump(catches, x.out.fielder);
      if (x.out?.type === "run out" && x.out.fielder) bump(runouts, x.out.fielder);
      if (x.drop) { bump(drops, x.drop); if (x.batter) bump(lives, x.batter); }
    });
    const fowBy = new Map((sc.fallOfWickets || []).map(f => [f.player, f]));
    const batting = (sc.batting || []).map(r => { const e = bt.get(r.player) || { dots: 0, ones: 0, twos: 0, threes: 0, timeline: [] }, out = r.status === "out";
      return { id: idOf(r.player), name: r.player, runs: r.runs, balls: r.balls, fours: r.fours, sixes: r.sixes, dots: e.dots, ones: e.ones, twos: e.twos, threes: e.threes,
        sr: r.balls ? (r.runs / r.balls * 100).toFixed(1) : "0.0", how: r.howOut || (out ? "out" : "not out"), out: out ? outKind(r.howOut || "") : null,
        out_over: out ? fowBy.get(r.player)?.overs || null : null, lives: lives.get(r.player) || 0, timeline: e.timeline, on_strike: false, at_crease: false }; });
    const bowling = (sc.bowling || []).map(r => { const e = bw.get(r.player) || { dots: 0, fours: 0, sixes: 0, wicket_list: [], spell: new Map() };
      return { id: idOf(r.player), name: r.player, overs: r.overs, maidens: r.maidens || 0, runs: r.runs, wickets: r.wickets, econ: ballsOf(r.overs) ? (r.runs / ballsOf(r.overs) * 6).toFixed(1) : "0.0",
        dots: e.dots, wides: r.wides || 0, noballs: r.noBalls || 0, fours: e.fours, sixes: e.sixes, wicket_list: e.wicket_list,
        spell: [...e.spell].map(([over, b]) => ({ over, balls: b })) }; });
    const list = map => [...map].map(([name, count]) => ({ id: idOf(name), name, count }));
    // commentary, newest first: each over's summary, then its balls
    const commentary = [], byOver = new Map();
    balls.forEach((x, i) => ent(byOver, x.over, () => []).push({ x, i }));
    let runsSoFar = 0, wktsSoFar = 0, legalSoFar = 0; const fig = new Map(), summaries = [];
    [...byOver.keys()].sort((a, b) => a - b).forEach(o => {
      let r = 0, w = 0, k = 0; const items = [];
      byOver.get(o).forEach(({ x }) => {
        r += x.runs; if (x.out) w++; if (x.legal) { k++; legalSoFar++; }
        const f = ent(fig, x.bowler, () => ({ b: 0, r: 0, w: 0 })); if (x.legal) f.b++; f.r += x.conceded; if (x.out && x.out.type !== "run out") f.w++;
        const row = x.out && (sc.batting || []).find(y => y.player === x.out.player);
        items.push({ type: "ball", over: `${o}.${x.legal ? k : Math.max(1, k)}`, badge: badge(x), text: ballText(x),
          detail: x.out ? { how: row?.howOut || x.out.type, stats: row ? `${row.runs} (${row.balls}b ${row.fours}×4 ${row.sixes}×6)` : "" } : null });
      });
      runsSoFar += r; wktsSoFar += byOver.get(o).filter(({ x }) => x.out).length;
      const last = byOver.get(o).at(-1).x, f = fig.get(last.bowler);
      summaries.push({ over: { type: "over", over_no: o, text: plural(r, "run") + (w ? ", " + plural(w, "wicket") : ""), score: `${sc.battingTeam} ${runsSoFar}/${wktsSoFar}`,
        crr: legalSoFar ? (runsSoFar / legalSoFar * 6).toFixed(1) : "0.0", bowler: `${last.bowler} ${oversOf(f.b)}-${f.r}-${f.w}` }, items });
    });
    summaries.reverse().forEach(s => { commentary.push(s.over, ...s.items.reverse()); });
    const lastFow = (sc.fallOfWickets || []).at(-1);
    return {
      innings_no: sc.number, label: ord(sc.number), status: sc.status || (sm.status === "completed" ? "completed" : "live"),
      batting_team: sc.battingTeam, bowling_team: bowlingTeam, runs: sc.runs, wickets: sc.wickets, overs: sc.overs,
      crr: legalN ? (sc.runs / legalN * 6).toFixed(1) : "0.0", rrr: sc.target ? (Math.max(0, sc.target - sc.runs) / Math.max(1, maxB - legalN) * 6).toFixed(1) : null,
      target: sc.target ?? null, need: sc.target ? Math.max(0, sc.target - sc.runs) : null, balls_left: Math.max(0, maxB - legalN),
      extras: { wide: sc.extras?.wides || 0, noball: sc.extras?.noBalls || 0, bye: sc.extras?.byes || 0, legbye: sc.extras?.legByes || 0, total: sc.extras?.total || 0 },
      partnership: { runs: sc.runs - (lastFow?.runs || 0), balls: Math.max(0, legalN - ballsOf(lastFow?.overs)) },
      // squad members who didn't bat: they still played (a keeper may not bat or take a catch)
      batting, yet_to_bat: (sm.squads?.[sm.teams.a.name === sc.battingTeam ? "a" : "b"] || []).filter(n => !(sc.batting || []).some(r => r.player === n)), bowling,
      fow: (sc.fallOfWickets || []).map(f => ({ wicket: f.wicket, score: f.runs, player: f.player, over: f.overs })),
      fielding: { catches: list(catches), runouts: list(runouts), drops: list(drops) }, commentary };
  });
  const st = sm.status === "completed" ? ["completed", "Completed"] : sm.status === "innings_break" ? ["live", "Innings break"] : ["live", "Live"];
  const win = sm.result?.winner || null, lose = win ? other(win) : null, first = sm.battingFirst || scorecards[0]?.batting_team || null;
  const team = n => n ? { id: teamId(n), name: n } : null;
  const match = {
    id: sm.number, status: st[0], status_label: st[1], format: sm.inningsPerSide === 2 ? "test" : "oneday", format_label: sm.inningsPerSide === 2 ? "Test" : "One-day",
    overs: sm.overs, players_per_side: Math.max(sm.squads?.a?.length || 0, sm.squads?.b?.length || 0), squad_a: sm.squads?.a?.length || 0, squad_b: sm.squads?.b?.length || 0, both_count: 0,
    team_a: team(A), team_b: team(B), batting_first_id: first ? teamId(first) : null, batting_first: first,
    toss_winner_id: sm.toss ? teamId(sm.toss.winner) : null, toss_winner: sm.toss?.winner || null, toss_choice: sm.toss?.chose || null,
    when: whenPK(sm.date), date: sm.date, result: sm.result?.text || null, winner: team(win), loser: team(lose),
    scorenama_url: sm.url, awards: sm.awards || [] };
  const i1 = scorecards[0], cur = scorecards.at(-1);
  return { match, first_innings: i1 ? { team: i1.batting_team, runs: i1.runs, wickets: i1.wickets, overs: i1.overs } : null, scorecards,
    innings: cur ? { innings_no: cur.innings_no, label: cur.label, batting_team: team(cur.batting_team), bowling_team: team(cur.bowling_team), total_runs: cur.runs, wickets: cur.wickets,
      legal_balls: maxB - cur.balls_left, overs: cur.overs, overs_limit: sm.overs, status: cur.status } : null };
}

module.exports = { getJSON, toState, parseBall, ballsOf, GROUP_URL, SCORENAMA_BASE, SCORENAMA_GROUP, whenPK };
