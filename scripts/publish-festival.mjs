#!/usr/bin/env node
/**
 * Publishes the Festival of Golf print and social pack from the app repo's
 * artwork build.
 *
 *   node scripts/publish-festival.mjs [--app <path to swingtribe-app>]
 *
 * Same shape as publish-golfday.mjs and for the same reason: the manifest
 * below is the single list, the page is generated from it, and a slug the
 * build did not produce fails the run rather than publishing a card that
 * links a 404.
 *
 * The clubhouse TV spots are deliberately NOT here. They live on the TV page
 * with every other campaign's loops, because a club choosing what to put on a
 * screen is comparing them against each other, not against a poster. This page
 * links across to it.
 *
 * What makes this pack different from the golf day one is that it carries TWO
 * copy treatments of the same campaign, and the choice between them is still
 * open. So the comparison leads the page rather than being buried per surface:
 * a reader has to be able to answer "which of these two" before they care
 * which aspect ratio it comes in.
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
const DEST = path.resolve('banners/festival');
const THUMB_W = 460;

if (!fs.existsSync(OUT)) {
  console.error(`No artwork build at ${OUT}. Run \`node design/banners/build.mjs 'festival-*'\` in the app repo first.`);
  process.exit(1);
}

// `guides` is the proofing PDF rather than the press one. It is a separate
// kind instead of a flag because the published EXTENSION has to differ too:
// dropping both into the same folder under one name would have the guides
// copy silently overwrite the press copy, which is the one failure here that
// nobody would see until a printer opened the file.
const source = (slug, kind) =>
  kind === 'guides' ? path.join(OUT, `${slug}-guides.pdf`)
    : kind === 'pdf' ? path.join(OUT, `${slug}-print.pdf`)
      : path.join(OUT, `${slug}.png`);
const raster = (slug, kind) =>
  kind === 'png' ? path.join(OUT, `${slug}.png`) : path.join(OUT, `${slug}-preview.png`);
const ext = (kind) => (kind === 'png' ? 'png' : 'pdf');
const published = (slug, kind) => (kind === 'guides' ? `${slug}-guides.pdf` : `${slug}.${ext(kind)}`);

/** The three stories each wave tells, in the order the boards are numbered. */
const STORIES = {
  'festival-qualify': ['Get on the festival table', 'You do not have to be scratch', 'No entry form, no extra round'],
  festival: ['Your next round counts', 'You do not have to be scratch', 'Still not too late'],
  'festival-qualify-v2': ['Be on it before it starts', 'Opens in November, start now', 'First names on the board'],
  'festival-v2': ['One table, every club', 'Somebody is top of it', 'Three months, one winner'],
};

const FORMATS = [
  ['square', 'Square 1:1'],
  ['story', 'Story 9:16'],
  ['portrait', 'Feed 4:5'],
  ['landscape', 'Link 1.91:1'],
];

const socialItems = (wave, formats = FORMATS) =>
  formats.flatMap(([fmt, size]) =>
    STORIES[wave].map((title, i) => [
      `${wave}-social-${fmt}-${String(i + 1).padStart(2, '0')}`,
      title,
      size,
    ]),
  );

const printItems = (wave) => [
  [`${wave}-a4-poster`, 'Club poster', 'A4 210x297mm'],
  [`${wave}-a4-signup`, 'Game sign-up sheet', 'A4 210x297mm, prints light'],
  [`${wave}-rollup-850x2000`, 'Pull-up banner', '850x2000mm'],
  [`${wave}-aframe-900x1200`, 'Course A-frame', '900x1200mm'],
  [`${wave}-banner-2000x1000`, 'Tee banner', '2000x1000mm'],
];

const SECTIONS = [
  {
    dir: 'compare',
    kind: 'png',
    heading: 'Start here: two ways to say it',
    lede:
      'The same campaign, the same dates, the same QR, argued from opposite ends. <b>V1 removes the friction</b>: nothing to ' +
      'sign up for, no extra round, points off your own handicap. <b>V2 supplies the stake</b>: one Order of Merit across every ' +
      'club taking part, and a name at the top of it from the first week. Both go through the identical layout code, so a ' +
      'side by side isolates the words and nothing else. Top row is V1, bottom row is V2.',
    items: [...socialItems('festival', [['square', 'V1 &middot; Square 1:1']]),
            ...socialItems('festival-v2', [['square', 'V2 &middot; Square 1:1']])],
  },
  {
    dir: 'print',
    kind: 'pdf',
    heading: 'October qualifiers, printed',
    lede:
      'On the wall before 1 October, so this is the wave with a production deadline. The sign-up sheet is the one light ' +
      'board in the set: a sheet somebody fills in with a pen has to print on a club machine without drinking a cartridge, ' +
      'and ruled lines on navy come back grey.',
    items: printItems('festival-qualify'),
  },
  {
    dir: 'print',
    kind: 'pdf',
    heading: 'Festival of Golf, printed',
    lede: 'Goes up for 1 November and stays up to the end of January.',
    items: printItems('festival'),
  },
  {
    dir: 'print',
    kind: 'pdf',
    heading: 'V2 printed, the two boards that carry an argument',
    lede:
      'Only the poster and the pull-up get a V2. Those are the surfaces with a headline, a sub line, three steps and a call ' +
      'to action. The tee banner and the A-frame are one line read at twenty paces and the sign-up sheet is a form with ' +
      'ruled rows, so a second treatment of those would be a second file saying the same thing.',
    items: [
      ['festival-qualify-v2-a4-poster', 'Club poster, October (V2)', 'A4 210x297mm'],
      ['festival-qualify-v2-rollup-850x2000', 'Pull-up, October (V2)', '850x2000mm'],
      ['festival-v2-a4-poster', 'Club poster, festival (V2)', 'A4 210x297mm'],
      ['festival-v2-rollup-850x2000', 'Pull-up, festival (V2)', '850x2000mm'],
    ],
  },
  {
    dir: 'proofing',
    kind: 'guides',
    heading: 'Proofing copies, internal only',
    lede:
      'The same print boards with the bleed, the safe area and the binding drawn on top. For checking a layout before ' +
      'it goes out. <b>Never send one of these to a printer</b>: the guides are ink.',
    items: [
      ['festival-qualify-a4-poster', 'Club poster, October', 'A4 with guides'],
      ['festival-qualify-a4-signup', 'Sign-up sheet, October', 'A4 with guides'],
      ['festival-qualify-rollup-850x2000', 'Pull-up, October', '850x2000mm with guides'],
      ['festival-a4-poster', 'Club poster, festival', 'A4 with guides'],
      ['festival-a4-signup', 'Sign-up sheet, festival', 'A4 with guides'],
      ['festival-rollup-850x2000', 'Pull-up, festival', '850x2000mm with guides'],
    ],
  },
  {
    dir: 'social',
    kind: 'png',
    heading: 'October qualifiers, social',
    items: socialItems('festival-qualify'),
  },
  {
    dir: 'social',
    kind: 'png',
    heading: 'Festival of Golf, social',
    items: socialItems('festival'),
  },
  {
    dir: 'social',
    kind: 'png',
    heading: 'October qualifiers, social (V2)',
    items: socialItems('festival-qualify-v2'),
  },
  {
    dir: 'social',
    kind: 'png',
    heading: 'Festival of Golf, social (V2)',
    items: socialItems('festival-v2'),
  },
];

const thumb = async (file) => {
  const buf = await sharp(file)
    .flatten({ background: '#111C4A' })
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
    const name = published(slug, s.kind);
    fs.copyFileSync(src, path.join(DEST, s.dir, name));
    cards.push(card(`${s.dir}/${name}`, title, size, await thumb(ras)));
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
  console.error("\nRun, in the app repo:\n  node design/banners/build.mjs 'festival-*'");
  process.exit(1);
}

const page = `<title>SwingTribe Festival of Golf Pack</title>
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
.lede{color:var(--muted);margin-top:10px;max-width:70ch;line-height:1.55}
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
<header><h1>Festival of Golf</h1>
<p class="lede">One Order of Merit across every club taking part, running <b>1 November to 31 January</b>, with
qualifying games through <b>October</b> for anyone who wants a head start. Two waves, because a board saying
"from 1 November" is wrong on a wall in October and a board saying "qualifying is on" is wrong in December.
Click any plate for the real file.</p></header>
<div class="note"><b>The clubhouse TV spots are on the <a href="../tv/">TV page</a></b>, with every other campaign's
loops, because a club choosing what to put on a screen is comparing them against each other rather than against a
poster. Sixteen 30-second loops: both waves, both treatments, four looks each.</div>
<div class="note" style="border-left-color:#33EDD7"><b>October is deliberately not a gate.</b> A golfer can join at
any point up to the close, so the October wave sells a head start and never a deadline: "qualify or miss out" would
be false. Nothing in the pack promises an in-app standings screen either, because there is no cross-club standings
surface today and a printed QR hanging in a clubhouse for four months cannot be re-pointed.</div>
${sections.join('')}
<footer>Print is set for a commercial digital press: 3mm bleed, 8mm safe area on the large formats. The
proofing copies with the guides drawn on are in the section above, and are internal only.
Every board is generated by <code>design/banners/build.mjs</code> in the app repo, so do not edit one here by hand: the next run overwrites it. The dates live in four constants and a guard
fails the build if the prose stops matching them.<br><a href="../">All SwingTribe artwork</a></footer></div>
`;

fs.writeFileSync(path.join(DEST, 'index.html'), page);

const files = SECTIONS.flatMap((s) => s.items.map(([slug]) => `${s.dir}/${published(slug, s.kind)}`));
const broken = files.filter((f) => !fs.existsSync(path.join(DEST, f)));
if (broken.length) {
  console.error('Cards linking files that are not on disk:', broken.join(', '));
  process.exit(1);
}
console.log(`published ${files.length} files and ${SECTIONS.length} sections to ${DEST}`);
