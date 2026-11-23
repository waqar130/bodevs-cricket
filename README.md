# BoDevs Cricket

Magazine-style site for the BoDevs office box-cricket teams, Tassadduq Tigers and Farhan Falcons, who play at SportsX, G-12 Islamabad.

Live at **https://cricket.waqarahmed.net**

## How it works

- `sync.js` pulls every match, the ball-by-ball scorecards and the player list from the [Scorenama Read API v1](https://scorenama.com/api/v1) for the BoDevs group (`SCORENAMA_BASE` and `SCORENAMA_GROUP` override the defaults), plus player photos from bodevs.com and ball photos from tildecricket. `scorenama.js` converts each Scorenama match into the shape the site was first built on (the old scorecard app), so the pages read it unchanged. The site keeps its own player ids (photos and links use them); new players get 100 + their Scorenama id.
- A sync never replaces stored data with fewer matches, so if Scorenama is down the site keeps showing the last good copy (and the running-late notice appears).
- The live centre (`/api/live`) reads Scorenama's live matches on demand, at most every 30 seconds.com. It writes `data/cricket.json` and `assets/`, and only rewrites the data when scores change.
- `server.js` serves the page and the public files, and syncs scores once a week: **every Monday at 2:00 AM Pakistan time**, after Sunday night's matches. A failed sync retries every 15 minutes (up to 4 tries). After a redeploy it catches up if that week's sync is missing. `/healthz` shows the last and next sync.
- `index.html` is the whole site: cover story, rivalry, rankings, team sheets, team picker, match centre with scorecards, and player pages with rivalries. All stats are computed in the browser from `data/cricket.json`.
- `build.js` wraps `index.html` into a full HTML document (used by the server) and can also build a static copy into `dist/`.

## Pages and data files

- The cover shows the weekly podium: MVP (a second player within 10 points makes it a joint MVP, two at most; level points go to whoever got there first), Impact Player (#2) and Game Changer (#3) on weekly points (1 a run, a runs bonus of runs × strike rate ÷ 1000 and a speed bonus of strike rate ÷ 10 (10+ balls faced), plus a shot bonus equal to its runs (a 2 +2, a four +4, a six +6; a six straight after a six +7), +1 more for a six straight after two dots, a streak bonus for sixes in a row (+1 for 3, +3 for 4, +5 for 5, +10 for 6), −1 a dot ball faced, −1 more for each dot straight after a dot; 40 a wicket (+5 more straight after being hit for six), +10 a maiden, sixes conceded back to back cost more each time (2nd in a row −2, 3rd −4, 4th −6, 5th −8, 6th −10), the week's economy minus his own, for every over he bowled (week 12, he goes 14 over 5 overs: −2 × 5 = −10), 12 minus the week's strike rate (balls a wicket: 8.4 is +4) and 30 minus the week's average (runs a wicket: 21 is +9), never below 0, +1 a dot ball bowled, +1 more for each dot straight after a dot, −1 a wide or no-ball, +10 for each 2nd, 3rd and 4th wicket in a spell; 10 a catch (+5 more if the batter had 20+, +5 more again if 40+, +5 for the keeper, +5 for caught and bowled, +5 for each catch after the first in a match), +5 for safe hands (2+ catches in the week, no drops), 15 a run out, −5 a dropped catch (−5 more if it went for six)). Below it, the weekly awards (bowler, safest hands, most improved, rising star, tough week), records set that week, and a Next Sunday card with the prediction countdown, milestone watch and form players.
- The site has six pages, switched by the tabs under the masthead: **This week** (`#home`), **Players**, **Compare**, **Stats**, **Season** and **Club**. Old section links such as `#records` open the right page. Player and match pages are `#<player-slug>` and `#match-<id>`; player pages have sub-pages (`#<player-slug>/batting`, `/bowling`, `/splits`, `/scouting`, `/rivalries`, `/matches`); `/p/<slug>` and `/m/<id>` give WhatsApp link previews.
- `data/fixtures.json` lists matches against outside teams and `assets/gallery/gallery.json` lists match-night photos (`{week: "YYYY-MM-DD" of the Tuesday, src, caption}`). Both sections stay hidden while empty.
- Predictions are saved in `STORAGE_DIR` (default `storage/`; on Railway a volume is mounted at `/app/storage`).
- Visitor counts are saved there too (`visits.json`) and shown at `/visits`: page views, daily visitors, install taps, installs and app opens. Totals only; no cookies, and no IP addresses are stored (a visitor is counted once a day through a hash with a salt that changes daily).
- If the Monday sync still fails after its retries, the server posts a message to `ALERT_URL` when that variable is set: an ntfy.sh topic URL, a Discord or Slack webhook, or any URL that accepts a POST. Whatever happens, the site shows a "running late" notice from 9 AM Monday (Pakistan time) until new scores arrive. `/healthz` reports `stale: true` in the same case.
- The server gzips text and answers 304 for unchanged files, so the 870 KB data file costs about 60 KB on a first visit and nothing on a repeat one.

## Seasons

`data/seasons.json` lists the seasons and the match id each one starts from, e.g. `[{"id":"s1","name":"Season 1","from":1}]`. To start Season 2, add `{"id":"s2","name":"Season 2","from":<first match id of the new season>}`. The site then shows the newest season by default, adds a season switcher to the masthead, and keeps an All-time view (`?season=all`). Everything (MVPs, awards, records, player pages) is worked out per season.

## Players

Profiles in `sync.js` (`PROFILES`) set full names, jobs, photos and roles: `captain: true` for the two captains, `bowl: "fast"` or `"spin"` for bowling style, and `keeper: true` for the wicket-keepers (Mazhar and Borni), whose catches count as keeping catches (Golden Gloves, not Safest Hands).

## App

The site installs to a phone's home screen (`manifest.webmanifest`, icons in `assets/icons/`) and `sw.js` keeps the last synced scores readable offline. It fetches from the network first, so scores are never stale when online.

## Run locally

```bash
node server.js
```

Then open http://localhost:8765. To refresh scores by hand: `node sync.js`.

## Deploy

Hosted on Railway (project **bodevs-cricket**). Every push to `main` redeploys automatically. DNS: `cricket` CNAME at Namecheap points to the Railway service.
