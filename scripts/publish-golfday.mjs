#!/usr/bin/env node
/**
 * Republishes the golf day pack from the app repo's artwork build.
 *
 * The pack was published by hand three times before this existed, and by the
 * fourth refresh the gallery page and the files it links had already drifted:
 * a board renamed in `build.mjs` leaves a card pointing at a 404, and a board
 * added leaves no card at all. So the manifest below is the single list, the
 * copy is generated from it, and a slug that no longer exists in the build
 * fails the run rather than publishing a broken link.
 *
 *   node scripts/publish-golfday.mjs [--app <path to swingtribe-app>]
 *
 * Thumbnails are inlined as base64 webp so the page is one file with no
 * asset-loading order to get wrong, and so a thumbnail can never go stale
 * against the artwork it previews: both are written in the same run.
 *
 * A PDF has no raster to thumbnail, so the preview PNG the build already
 * writes next to it (`<slug>-preview.png`) is used instead.
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
const DEST = path.resolve('banners/golfday');
const THUMB_W = 460;

if (!fs.existsSync(OUT)) {
  console.error(`No artwork build at ${OUT}. Run \`node design/banners/build.mjs\` in the app repo first.`);
  process.exit(1);
}

/** slug -> the file the build writes, by kind. */
const source = (slug, kind) =>
  kind === 'pdf' ? path.join(OUT, `${slug}-print.pdf`) : path.join(OUT, `${slug}.png`);
/** slug -> something rasterised we can shrink into a thumbnail. */
const raster = (slug, kind) =>
  kind === 'pdf' ? path.join(OUT, `${slug}-preview.png`) : path.join(OUT, `${slug}.png`);

const SECTIONS = [
  {
    dir: 'print',
    kind: 'pdf',
    heading: 'For golfers, printed',
    items: [
      ['golfday-card-install', 'Table card, side 1', 'A5 148x210mm'],
      ['golfday-card-scoring', 'Table card, side 2', 'A5 148x210mm'],
      ['golfday-poster-attendee', 'Registration poster', 'A4 210x297mm'],
    ],
  },
  {
    dir: 'print',
    kind: 'pdf',
    heading: 'For organisers, printed',
    items: [
      ['golfday-organiser-a4-01', 'Run a golf day, 1 of 2', 'A4 210x297mm'],
      ['golfday-organiser-a4-02', 'Run a golf day, 2 of 2', 'A4 210x297mm'],
    ],
    extra: [
      // Not a `-print.pdf`: Chromium paginates this one itself, so it is
      // written straight out under its own name.
      {
        file: 'golfday-organiser-guide.pdf',
        thumb: 'golfday-organiser-a4-01-preview.png',
        title: 'Both pages, one PDF',
        size: 'True A4, no bleed, prints at home',
      },
    ],
  },
  {
    dir: 'social',
    kind: 'png',
    heading: 'To send the field',
    items: [
      ['golfday-social-story-install', 'Get the app', 'Story 9:16'],
      ['golfday-social-story-scoring', 'Live scoring', 'Story 9:16'],
      ['golfday-social-portrait-install', 'Get the app', 'Feed 4:5'],
      ['golfday-social-portrait-scoring', 'Live scoring', 'Feed 4:5'],
      ['golfday-social-square-install', 'Get the app', 'Square 1:1'],
      ['golfday-social-square-scoring', 'Live scoring', 'Square 1:1'],
      ['golfday-social-landscape-install', 'Get the app', 'Link 1.91:1'],
      ['golfday-social-landscape-scoring', 'Live scoring', 'Link 1.91:1'],
    ],
  },
  {
    dir: 'reels',
    kind: 'png',
    heading: 'For reels, over your own video',
    lede:
      'Drop one over your footage in Instagram, TikTok or CapCut. The three overlays are transparent, so your video ' +
      'shows through; the end card is a full frame to put after the clip. All of them keep clear of the caption strip ' +
      "and the like and share rail, so nothing important sits under the app's own buttons.",
    items: [
      ['golfday-reel-overlay-today', 'Overlay, live scores', '1080x1920 transparent PNG'],
      ['golfday-reel-overlay-leaderboard', 'Overlay, follow the leaderboard', '1080x1920 transparent PNG'],
      ['golfday-reel-lower-third', 'Lower third', '1080x1920 transparent PNG'],
      ['golfday-reel-endcard', 'End card', '1080x1920, goes after the clip'],
    ],
  },
  {
    dir: 'reels',
    kind: 'png',
    heading: 'Scrim overlays, for posting during the round',
    lede:
      'The same idea in a lighter style: type straight on your footage under a soft navy fade, rather than in a panel. ' +
      'Nothing here claims a score or a number, so any of them can go up mid-round without checking anything first.',
    items: [
      ['golfday-reel-scrim-live', 'Live now', 'Scores landing &middot; transparent'],
      ['golfday-reel-scrim-winning', 'Who is winning', 'See the board &middot; transparent'],
      ['golfday-reel-scrim-pin', 'Nearest the pin', 'Prize hole open &middot; transparent'],
      ['golfday-reel-scrim-backnine', 'Back nine', 'Now it turns &middot; transparent'],
      ['golfday-reel-scrim-final', 'Final scores', 'Results are in &middot; transparent'],
    ],
  },
  {
    dir: 'email',
    kind: 'png',
    heading: 'For an email footer',
    items: [
      ['golfday-email-banner', 'Footer banner, with code', '600x200 at 2x'],
      ['golfday-email-strip', 'Footer strip', '600x150 at 2x'],
    ],
  },
];

const thumb = async (file) => {
  const buf = await sharp(file)
    .flatten({ background: '#111C4A' }) // transparent overlays need a ground to preview against
    .resize({ width: THUMB_W, withoutEnlargement: true })
    .webp({ quality: 72 })
    .toBuffer();
  return `data:image/webp;base64,${buf.toString('base64')}`;
};

const card = (href, title, size, data) => `<figure class="p"><a class="shot" href="${href}">` +
  `<img loading="lazy" src="${data}" alt="${title}"></a>\n` +
  `      <figcaption><b>${title}</b><span class="sz">${size}</span>` +
  `<a class="slug" href="${href}">${href.split('/').pop()}</a></figcaption></figure>`;

const missing = [];
const sections = [];

for (const s of SECTIONS) {
  fs.mkdirSync(path.join(DEST, s.dir), { recursive: true });
  const cards = [];

  for (const [slug, title, size] of s.items) {
    const src = source(slug, s.kind);
    const ras = raster(slug, s.kind);
    if (!fs.existsSync(src) || !fs.existsSync(ras)) {
      missing.push(`${slug} (${fs.existsSync(src) ? 'no preview raster' : 'not built'})`);
      continue;
    }
    const name = `${slug}.${s.kind}`;
    fs.copyFileSync(src, path.join(DEST, s.dir, name));
    cards.push(card(`${s.dir}/${name}`, title, size, await thumb(ras)));
  }

  for (const e of s.extra || []) {
    const src = path.join(OUT, e.file);
    const ras = path.join(OUT, e.thumb);
    if (!fs.existsSync(src) || !fs.existsSync(ras)) {
      missing.push(`${e.file} (not built)`);
      continue;
    }
    fs.copyFileSync(src, path.join(DEST, s.dir, e.file));
    cards.unshift(card(`${s.dir}/${e.file}`, e.title, e.size, await thumb(ras)));
  }

  sections.push(
    `<section><h2>${s.heading}</h2>` +
      (s.lede ? `\n<p class="lede" style="margin:-6px 0 16px">${s.lede}</p>\n` : '') +
      `<div class="grid">${cards.join('')}</div></section>`,
  );
}

if (missing.length) {
  console.error('Boards named in the manifest that the build did not produce:');
  for (const m of missing) console.error('  ' + m);
  process.exit(1);
}

const page = `<title>SwingTribe Golf Day Pack</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=IBM+Plex+Sans:wght@400;500;600&display=swap">
<style>
:root{--paper:#E9EBF1;--plate:#FFF;--ink:#0E1330;--muted:#59618A;--rule:#D2D6E3;--accent:#037CD5;--band:#111C4A}
@media(prefers-color-scheme:dark){:root:not([data-theme=light]){--paper:#080C18;--plate:#121729;--ink:#E6E9F5;--muted:#949CC2;--rule:#242B45;--accent:#57ACF0;--band:#141B33}}
*{box-sizing:border-box;margin:0;padding:0}
body{background:var(--paper);color:var(--ink);font-family:'IBM Plex Sans',system-ui,sans-serif;padding:32px 20px 80px}
.wrap{max-width:1180px;margin:0 auto}
header{border-bottom:1px solid var(--rule);padding-bottom:22px;margin-bottom:10px}
h1{font-family:'Space Grotesk',system-ui,sans-serif;font-weight:700;font-size:clamp(28px,4vw,42px);letter-spacing:-.03em}
.lede{color:var(--muted);margin-top:10px;max-width:62ch;line-height:1.55}
.note{background:var(--plate);border:1px solid var(--rule);border-left:4px solid #48D070;border-radius:12px;padding:14px 16px;margin:24px 0 6px;line-height:1.55;font-size:14px}
h2{font-family:'Space Grotesk',system-ui,sans-serif;font-size:13px;font-weight:700;letter-spacing:.17em;text-transform:uppercase;color:var(--accent);margin:38px 0 16px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:22px}
.p{background:var(--plate);border:1px solid var(--rule);border-radius:14px;overflow:hidden;display:flex;flex-direction:column}
.shot{display:block;background:var(--band)} .shot img{width:100%;height:auto;display:block}
figcaption{padding:12px 13px 14px;display:flex;flex-direction:column;gap:3px;font-size:13px}
.sz{color:var(--muted);font-size:12px}
.slug{font-family:ui-monospace,monospace;font-size:11px;color:var(--accent);text-decoration:none;word-break:break-all;margin-top:4px}
footer{margin-top:56px;padding-top:20px;border-top:1px solid var(--rule);color:var(--muted);font-size:13px;line-height:1.6}
a{color:var(--accent)}
</style>
<div class="wrap">
<header><h1>Golf Day Pack</h1>
<p class="lede">Everything for one golf day, in the four aspect ratios the rest of the artwork uses.
Print the cards and the poster, send the squares and stories to the field the night before, and
paste a footer banner under your own signature. Click any plate for the real file.</p></header>
<div class="note"><b>Tell your field one thing:</b> sign in with the number they entered with. Adding a golfer by phone creates a profile carrying their handicap and their place in
the field, and signing in with the mobile number they gave you is what claims it. A different number gets them an
empty account while their real entry sits unclaimed.</div>
${sections.join('')}
<footer>Print is set for a commercial digital press: 3mm bleed, 8mm safe area. The A5 cards are
two sides of one card. Codes are on the printed and email pieces only, where somebody has a surface
in front of them rather than the phone they would have to scan with. The organiser pages take their
steps from the
<a href="https://swingtribe.app/docs/help/help-run-a-golf-day">Running a Golf Day</a> guide, so the
page and the handout cannot drift apart.<br><a href="../">All SwingTribe artwork</a></footer></div>
`;

fs.writeFileSync(path.join(DEST, 'index.html'), page);

const files = SECTIONS.flatMap((s) => [
  ...s.items.map(([slug]) => `${s.dir}/${slug}.${s.kind}`),
  ...(s.extra || []).map((e) => `${s.dir}/${e.file}`),
]);
const broken = files.filter((f) => !fs.existsSync(path.join(DEST, f)));
if (broken.length) {
  console.error('Cards linking files that are not on disk:', broken.join(', '));
  process.exit(1);
}
console.log(`published ${files.length} files and ${SECTIONS.length} sections to ${DEST}`);
