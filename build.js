// Wraps index.html into a full HTML document (used by server.js), and can build a static copy into dist/.
// index.html is written as a page body (it also publishes as a Claude artifact), so the document shell lives here.
// Run: node build.js
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const OUT = path.join(ROOT, "dist");
const DOMAIN = "cricket.waqarahmed.net";
const SITE = `https://${DOMAIN}`;

const attr = s => String(s ?? "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

// meta: optional link-preview overrides { title, description, image, url, hash }.
// hash opens that player or match page in the app (e.g. "waqar-ahmed", "match-19").
function page(meta = {}) {
  const body = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
  const site = meta.site || SITE;
  const m = {
    title: "BoDevs Cricket",
    description: "Tigers v Falcons box cricket at SportsX, G-12 Islamabad. Every scorecard, every player, played with the Tilde swing ball.",
    image: `${site}/assets/logo.png`,
    url: `${site}/`,
    ...meta,
  };
  const jump = meta.hash && /^[\w-]+$/.test(meta.hash)
    ? `<script>if(!location.hash)history.replaceState(null,"","/#${meta.hash}")</script>\n` : "";
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#0d0d0c">
<link rel="icon" href="/tigers.svg" type="image/svg+xml">
<link rel="manifest" href="/manifest.webmanifest">
<link rel="apple-touch-icon" href="/assets/icons/icon-192.png">
<meta name="apple-mobile-web-app-capable" content="yes">
<script>if("serviceWorker" in navigator)addEventListener("load",()=>navigator.serviceWorker.register("/sw.js").catch(()=>{}))</script>
<link rel="canonical" href="${attr(m.url)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="BoDevs Cricket">
<meta property="og:title" content="${attr(m.title)}">
<meta property="og:description" content="${attr(m.description)}">
<meta property="og:url" content="${attr(m.url)}">
<meta property="og:image" content="${attr(m.image)}">
<meta name="description" content="${attr(m.description)}">
<meta name="twitter:card" content="summary_large_image">
${meta.hash ? `<base href="/">\n` : ""}${jump}<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0}img{max-width:100%}[hidden]{display:none!important}</style>
</head>
<body>
${body}
</body>
</html>`;
}

function build() {
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, "index.html"), page());
  for (const f of ["tigers.svg", "falcons.svg", "extras.js", "extras.css"]) fs.copyFileSync(path.join(ROOT, f), path.join(OUT, f));
  for (const d of ["data", "assets"]) fs.cpSync(path.join(ROOT, d), path.join(OUT, d), { recursive: true });
  fs.writeFileSync(path.join(OUT, "CNAME"), DOMAIN + "\n");
  fs.writeFileSync(path.join(OUT, ".nojekyll"), "");
  console.log(`built dist/ for ${SITE}`);
}

module.exports = { page, SITE };
if (require.main === module) build();
