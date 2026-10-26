# BoDevs Cricket

Magazine-style site for the BoDevs office box-cricket teams, Tassadduq Tigers and Farhan Falcons, who play at SportsX, G-12 Islamabad.

Live at **https://cricket.waqarahmed.net**

## How it works

- `sync.js` pulls every match, the ball-by-ball scorecards and the player list from [Scorecard](https://tassadduq.com/cricket/), plus player photos from bodevs.com and ball photos from tildecricket.com. It writes `data/cricket.json` and `assets/`, and only rewrites the data when scores change.
- `server.js` serves the page and the public files, and syncs scores once a week: **every Monday at 2:00 AM Pakistan time**, after Sunday night's matches. A failed sync retries every 15 minutes (up to 4 tries). After a redeploy it catches up if that week's sync is missing. `/healthz` shows the last and next sync.
- `index.html` is the whole site: cover story, rivalry, rankings, team sheets, team picker, match centre with scorecards, and player pages with rivalries. All stats are computed in the browser from `data/cricket.json`.
- `build.js` wraps `index.html` into a full HTML document (used by the server) and can also build a static copy into `dist/`.

## Pages and data files

- The cover shows the weekly podium: MVP (a second player within 1 point makes it a joint MVP, two at most; level points go to whoever got there first), Impact Player (#2) and Game Changer (#3) on weekly points (runs + 20 per wicket + 10 per catch). Below it, the weekly awards (bowler, safest hands, most improved, rising star, tough week), records set that week, and a Next Sunday card with the prediction countdown, milestone watch and form players.
- The site has six pages, switched by the tabs under the masthead: **This week** (`#home`), **Players**, **Compare**, **Stats**, **Season** and **Club**. Old section links such as `#records` open the right page. Player and match pages are `#<player-slug>` and `#match-<id>`; player pages have sub-pages (`#<player-slug>/batting`, `/bowling`, `/splits`, `/scouting`, `/rivalries`, `/matches`); `/p/<slug>` and `/m/<id>` give WhatsApp link previews.
- `data/fixtures.json` lists matches against outside teams and `assets/gallery/gallery.json` lists match-night photos (`{week: "YYYY-MM-DD" of the Tuesday, src, caption}`). Both sections stay hidden while empty.
- Predictions are saved in `STORAGE_DIR` (default `storage/`; on Railway a volume is mounted at `/app/storage`).
- The server gzips text and answers 304 for unchanged files, so the 870 KB data file costs about 60 KB on a first visit and nothing on a repeat one.

## Seasons

`data/seasons.json` lists the seasons and the match id each one starts from, e.g. `[{"id":"s1","name":"Season 1","from":1}]`. To start Season 2, add `{"id":"s2","name":"Season 2","from":<first match id of the new season>}`. The site then shows the newest season by default, adds a season switcher to the masthead, and keeps an All-time view (`?season=all`). Everything (MVPs, awards, records, player pages) is worked out per season.

## Players

Profiles in `sync.js` (`PROFILES`) set full names, jobs, photos and roles: `captain: true` for the two captains and `keeper: true` for the wicket-keepers (Mazhar and Borni), whose catches count as keeping catches (Golden Gloves, not Safest Hands).

## App

The site installs to a phone's home screen (`manifest.webmanifest`, icons in `assets/icons/`) and `sw.js` keeps the last synced scores readable offline. It fetches from the network first, so scores are never stale when online.

## Run locally

```bash
node server.js
```

Then open http://localhost:8765. To refresh scores by hand: `node sync.js`.

## Deploy

Hosted on Railway (project **bodevs-cricket**). Every push to `main` redeploys automatically. DNS: `cricket` CNAME at Namecheap points to the Railway service.
