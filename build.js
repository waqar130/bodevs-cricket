// Builds the static site into dist/ for GitHub Pages (cricket.waqarahmed.net).
// index.html is written as a page body (it also publishes as a Claude artifact), so wrap it in a full document here.
// Run: node build.js
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const OUT = path.join(ROOT, "dist");
const DOMAIN = "cricket.waqarahmed.net";
const SITE = `https://${DOMAIN}`;

function page() {
  const body = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#0d0d0c">
<link rel="icon" href="tigers.svg" type="image/svg+xml">
<link rel="canonical" href="${SITE}/">
<meta property="og:type" content="website">
<meta property="og:site_name" content="BoDevs Cricket">
<meta property="og:title" content="BoDevs Cricket">
<meta property="og:description" content="Tigers v Falcons box cricket at SportsX, G-12 Islamabad. Every scorecard, every player, played with the Tilde swing ball.">
<meta property="og:url" content="${SITE}/">
<meta property="og:image" content="${SITE}/assets/logo.png">
<meta name="twitter:card" content="summary_large_image">
<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0}img{max-width:100%}[hidden]{display:none!important}</style>
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
  for (const f of ["tigers.svg", "falcons.svg"]) fs.copyFileSync(path.join(ROOT, f), path.join(OUT, f));
  for (const d of ["data", "assets"]) fs.cpSync(path.join(ROOT, d), path.join(OUT, d), { recursive: true });
  fs.writeFileSync(path.join(OUT, "CNAME"), DOMAIN + "\n");
  fs.writeFileSync(path.join(OUT, ".nojekyll"), "");
  console.log(`built dist/ for ${SITE}`);
}

module.exports = { page };
if (require.main === module) build();
