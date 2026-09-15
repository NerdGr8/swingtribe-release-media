#!/usr/bin/env node
/**
 * Publishes the clubhouse TV adverts from the app repo's artwork build, as a
 * page an advertising or media provider can be sent.
 *
 *   node scripts/publish-tv.mjs [--app <path to swingtribe-app>]
 *
 * Same shape as publish-golfday.mjs and for the same reason: the manifest
 * below is the single list, the page is generated from it, and a slug the
 * build did not produce fails the run rather than publishing a card that
 * links a 404. The Pages deploy re-checks every link on top of that.
 *
 * Unlike the other packs, each campaign here has a VIDEO as its primary
 * deliverable and the panels as the parts. So a card is a campaign rather
 * than a file, and it carries the loop plus its four stills. A provider
 * wants the loop; a provider who wants to re-cut it wants the stills.
 *
 * Thumbnails are inlined as base64 webp so the page is one file with nothing
 * to load in the right order, and so a thumbnail cannot go stale against the
 * artwork it previews: both are written in the same run.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const sharp = require('sharp');

const argv = process.argv.slice(2);
const appIdx = argv.indexOf('--app');
const APP = path.resolve(appIdx >= 0 ? argv[appIdx + 1] : '../swingtribe-app');
const OUT = path.join(APP, 'design/banners/out');
const DEST = path.resolve('banners/tv');
const THUMB_W = 520;

if (!fs.existsSync(OUT)) {
  console.error(`No artwork build at ${OUT}. Run \`node design/banners/build.mjs\` in the app repo first.`);
  process.exit(1);
}

const CAMPAIGNS = [
  { key: 'organisers', name: 'Golf day organisers', accent: '#037CD5',
    blurb: 'For the company or charity running a day. The whole day in one place: entry, payment, scoring, results.' },
  { key: 'rivalry', name: 'Rivalries', accent: '#48D070',
    blurb: 'For the golfers who already know who owes them a rematch. A season-long record of exactly who beat who.' },
  { key: 'friendlies', name: 'Friendlies', accent: '#33EDD7',
    blurb: 'For the Saturday fourball. Live scoring on all four phones, and nobody doing the card.' },
  { key: 'different', name: 'What makes us different', accent: '#48D070',
    blurb: 'The argument at a glance. The claim, a count of what a scoring app does against what this does, then the consequence. Four panels, 24 seconds.' },
  { key: 'season', name: 'A season, not a round', accent: '#037CD5',
    blurb: 'The same six claims with room to breathe, one per panel. For the screen somebody sits in front of rather than walks past. Seven panels, 42 seconds.' },
];

const TREATMENTS = [
  { key: '', name: 'Editorial', note: 'The calm one. A kicker, a headline and a line of explanation. The safe default for a screen people sit near.' },
  { key: 'bold', name: 'Bold', note: 'The campaign colour fills the screen and one sentence sits on it. For a screen glimpsed on the way past.' },
  { key: 'light', name: 'Light', note: 'A near-white ground. For a bright room: cheap panels crush dark tones in daylight and navy goes flat grey.' },
  { key: 'board', name: 'Leaderboard', note: 'Opens on a live leaderboard, which is the thing golfers were looking at an hour ago. The only look that shows the product.' },
];

const stem = (c, t) => (t ? `${c}-${t}` : c);

fs.mkdirSync(DEST, { recursive: true });

const missing = [];
const files = [];
const cards = [];

for (const t of TREATMENTS) {
  const plates = [];

  for (const c of CAMPAIGNS) {
    const s = stem(c.key, t.key);
    const loop = `tv-${s}-loop.mp4`;
    // Campaigns no longer all have four panels: the season one has seven. The
    // count comes off the build rather than a constant, so adding a panel does
    // not silently drop it from the page.
    const panels = [];
    for (let i = 1; i <= 20; i += 1) {
      const f = `tv-${s}-${String(i).padStart(2, '0')}.png`;
      if (!fs.existsSync(path.join(OUT, f))) break;
      panels.push(f);
    }
    if (!panels.length) missing.push(`tv-${s}-01.png`);

    for (const f of [loop, ...panels]) {
      if (!fs.existsSync(path.join(OUT, f))) missing.push(f);
    }
    plates.push({ c, s, loop, panels });
  }

  cards.push({ t, plates });
}

if (missing.length) {
  console.error('These are named here but the build did not produce them:');
  for (const m of missing) console.error(`  ${m}`);
  console.error('\nRun, in the app repo:');
  console.error('  node design/banners/build.mjs <the tv-* slugs>');
  console.error('  node design/banners/tv-loops.mjs');
  process.exit(1);
}

async function thumb(file) {
  const buf = await sharp(path.join(OUT, file)).resize({ width: THUMB_W }).webp({ quality: 82 }).toBuffer();
  return `data:image/webp;base64,${buf.toString('base64')}`;
}

const copy = (f) => {
  fs.copyFileSync(path.join(OUT, f), path.join(DEST, f));
  files.push(f);
};

const sections = [];

for (const { t, plates } of cards) {
  const rendered = [];
  for (const p of plates) {
    copy(p.loop);
    p.panels.forEach(copy);

    const shots = [];
    for (const panel of p.panels) {
      shots.push(
        `<a class="shot" href="${panel}" title="${panel}"><img loading="lazy" src="${await thumb(panel)}" alt=""></a>`,
      );
    }

    const mb = (fs.statSync(path.join(DEST, p.loop)).size / 1e6).toFixed(1);
    rendered.push(`
      <article class="campaign" style="--accent:${p.c.accent}">
        <header>
          <h3>${p.c.name}</h3>
          <p>${p.c.blurb}</p>
        </header>
        <video controls muted loop playsinline preload="metadata" poster="${p.panels[0]}">
          <source src="${p.loop}" type="video/mp4">
        </video>
        <p class="files">
          <a class="dl" href="${p.loop}" download>Download the loop</a>
          <span class="meta">MP4 &middot; 1920 x 1080 &middot; ${p.panels.length * 6}s &middot; ${mb} MB</span>
        </p>
        <div class="shots">${shots.join('')}</div>
        <p class="meta">${p.panels.length} stills, 1920 x 1080 PNG. Click any one to open it full size.</p>
      </article>`);
  }

  sections.push(`
    <section>
      <div class="sec-head">
        <h2>${t.name}</h2>
        <p>${t.note}</p>
      </div>
      <div class="grid">${rendered.join('')}</div>
    </section>`);
}

const page = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>SwingTribe clubhouse TV adverts</title>
<style>
  :root { color-scheme: light; --navy:#111C4A; --ink:#2E3641; --muted:#667889; --line:#E7EBF0; }
  * { box-sizing:border-box; margin:0; padding:0; }
  body { font:16px/1.55 -apple-system,BlinkMacSystemFont,'Segoe UI',Inter,sans-serif;
         color:var(--ink); background:#F5F7F9; padding:0 0 80px; }
  .wrap { max-width:1280px; margin:0 auto; padding:0 20px; }
  header.top { background:var(--navy); color:#fff; padding:56px 0 48px; margin-bottom:40px; }
  header.top h1 { font-size:clamp(28px,4vw,44px); line-height:1.1; letter-spacing:-0.02em; }
  header.top p { margin-top:16px; max-width:70ch; color:#B0BCC9; font-size:clamp(15px,1.6vw,18px); }
  header.top .note { margin-top:22px; font-size:15px; color:#8696A7; }
  section { margin-bottom:56px; }
  .sec-head { border-top:3px solid var(--navy); padding-top:18px; margin-bottom:24px; }
  .sec-head h2 { font-size:26px; letter-spacing:-0.01em; }
  .sec-head p { color:var(--muted); max-width:78ch; margin-top:6px; }
  .grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(360px,1fr)); gap:24px; }
  .campaign { background:#fff; border:1px solid var(--line); border-radius:16px; padding:20px; }
  .campaign h3 { font-size:19px; letter-spacing:-0.01em; }
  .campaign header p { color:var(--muted); font-size:14.5px; margin-top:6px; }
  video { width:100%; aspect-ratio:16/9; border-radius:10px; background:#000; margin:16px 0 12px; display:block; }
  .files { display:flex; flex-wrap:wrap; align-items:center; gap:12px; margin-bottom:14px; }
  .dl { display:inline-block; background:var(--navy); color:#fff; text-decoration:none; font-weight:600;
        font-size:14px; padding:9px 18px; border-radius:9999px; }
  .dl:hover { background:#037CD5; }
  .meta { color:var(--muted); font-size:13px; }
  .shots { display:grid; grid-template-columns:repeat(auto-fit,minmax(88px,1fr)); gap:8px; margin-bottom:8px; }
  .shot img { width:100%; display:block; border-radius:6px; border:1px solid var(--line); }
  .shot:hover img { border-color:var(--accent); }
  @media (max-width:520px) { .shots { grid-template-columns:repeat(2,1fr); } }
</style>
</head>
<body>
  <header class="top"><div class="wrap">
    <h1>SwingTribe adverts for clubhouse screens</h1>
    <p>Three campaigns in four looks, for a 1920 x 1080 television in a clubhouse, a pro shop or behind a
       registration desk. Each campaign is a 24 second loop plus the four stills it is cut from. Everything is
       downloadable from this page.</p>
    <p class="note">Every campaign's code is its own, so scans can be told apart by campaign.
       Codes are printed into the artwork and cannot be re-pointed afterwards: a change means new files.</p>
  </div></header>
  <div class="wrap">${sections.join('')}</div>
</body>
</html>`;

fs.writeFileSync(path.join(DEST, 'index.html'), page);

// The deploy re-checks links, but failing here names the file instead of
// failing a deploy nobody is watching.
const broken = [...page.matchAll(/(?:href|src)="([^"#:]+)"/g)]
  .map((m) => m[1])
  .filter((h) => !h.startsWith('data:') && !fs.existsSync(path.join(DEST, h)));
if (broken.length) {
  console.error('The page links files that are not in the folder:');
  for (const b of broken) console.error(`  ${b}`);
  process.exit(1);
}

console.log(`published ${files.length} files and ${TREATMENTS.length} sections to ${DEST}`);
