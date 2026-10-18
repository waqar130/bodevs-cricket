# BoDevs Cricket

Magazine-style site for the BoDevs office box-cricket teams, Tassadduq Tigers and Farhan Falcons, who play at SportsX, G-12 Islamabad.

Live at **https://cricket.waqarahmed.net**

## How it works

- `sync.js` pulls every match, the ball-by-ball scorecards and the player list from [Scorecard](https://tassadduq.com/cricket/), plus player photos from bodevs.com and ball photos from tildecricket.com. It writes `data/cricket.json` and `assets/`, and only rewrites the data when scores change.
- `server.js` serves the page and the public files, and syncs scores once a week: **every Monday at 2:00 AM Pakistan time**, after Sunday night's matches. A failed sync retries every 15 minutes (up to 4 tries). After a redeploy it catches up if that week's sync is missing. `/healthz` shows the last and next sync.
- `index.html` is the whole site: cover story, rivalry, rankings, team sheets, team picker, match centre with scorecards, and player pages with rivalries. All stats are computed in the browser from `data/cricket.json`.
- `build.js` wraps `index.html` into a full HTML document (used by the server) and can also build a static copy into `dist/`.

## Run locally

```bash
node server.js
```

Then open http://localhost:8765. To refresh scores by hand: `node sync.js`.

## Deploy

Hosted on Railway (project **bodevs-cricket**). Every push to `main` redeploys automatically. DNS: `cricket` CNAME at Namecheap points to the Railway service.
