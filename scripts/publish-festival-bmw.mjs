#!/usr/bin/env node
/**
 * Publishes the BMW Menlyn Festival of Golf ad pack: the Reel, the Golf TV
 * spot, Instagram and Facebook Stories, the feed carousel, WhatsApp Status
 * cards, the A4 clubhouse poster and the captions.
 *
 *   node scripts/publish-festival-bmw.mjs --src <ad pack out/ folder>
 *
 * Same shape as publish-golfday.mjs and publish-tv.mjs: the manifest below is
 * the single list, the page is generated from it, and a file the build did not
 * produce fails the run rather than publishing a card that links a 404. The
 * Pages deploy re-checks every `class="slug"` link on top of that.
 *
 * The artwork carries BMW Menlyn's official wordmark, supplied by BMW Menlyn,
 * grey on a white band at the bottom left as BMW South Africa's retailer
 * guidelines ask. Do not recolour or move it.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const sharp = require('sharp');

const argv = process.argv.slice(2);
const srcIdx = argv.indexOf('--src');
if (srcIdx < 0) {
  console.error('Usage: node scripts/publish-festival-bmw.mjs --src <path to the ad pack out/ folder>');
  process.exit(1);
}
const SRC = path.resolve(argv[srcIdx + 1]);
const DEST = path.resolve('banners/festival-bmw');
const THUMB_W = 420;

const STORIES = ['One table, every club', 'Your usual comp is your entry', 'You do not have to be scratch', 'Still not too late'];
const KEYS = ['01-cover', '02-your-comp', '03-handicap', '04-join'];

// One entry per card. `file` is published, `thumb` is what the card shows.
const SECTIONS = [
  {
    title: 'Video',
    note: 'The Reel and the Golf TV spot. Both open on a finished cover frame. Music: "2 Hour Delay" by HoliznaCC0, public domain (CC0).',
    cards: [
      { file: 'reel/reel-1080x1920.mp4', thumb: 'reel/reel-cover.png', label: 'Instagram and Facebook Reel', meta: '1080 x 1920, 17 s, 30 fps, music at -14 LUFS', tall: true },
      { file: 'golftv/golftv-festival-30s-1920x1080.mp4', thumb: 'golftv/golftv-cover.png', label: 'Golf TV, with music', meta: '1920 x 1080, 30 s, 25 fps, H.264, -23 LUFS. Golf TV 2026 spec, inside the action safe area' },
      { file: 'golftv/golftv-festival-30s-1920x1080.silent.mp4', thumb: 'golftv/golftv-cover.png', label: 'Golf TV, no audio', meta: '1920 x 1080, 30 s, 25 fps, H.264, no audio track' },
    ],
  },
  {
    title: 'Instagram and Facebook Stories',
    note: '1080 x 1920. The white band clears the reply bar.',
    cards: KEYS.map((k, i) => ({ file: `story/${k}.png`, label: `${i + 1}. ${STORIES[i]}`, meta: '1080 x 1920', tall: true })),
  },
  {
    title: 'Feed and carousel',
    note: '1080 x 1350. Card one works alone; all four make a swipe carousel.',
    cards: KEYS.map((k, i) => ({ file: `feed/${k}.png`, label: `${i + 1}. ${STORIES[i]}`, meta: '1080 x 1350' })),
  },
  {
    title: 'WhatsApp Status',
    note: 'For posting as a Status, never for broadcast. Same stories, with their own code.',
    cards: KEYS.map((k, i) => ({ file: `whatsapp-status/${k}.png`, label: `${i + 1}. ${STORIES[i]}`, meta: '1080 x 1920', tall: true })),
  },
  {
    title: 'Print',
    note: 'A4 clubhouse poster, a vector PDF.',
    cards: [{ file: 'print/poster-a4.pdf', thumb: 'print/poster-a4-preview.png', label: 'A4 poster', meta: '210 x 297 mm, PDF' }],
  },
  {
    title: 'Captions',
    note: 'Instagram, Facebook and WhatsApp Status copy, with the tracked links.',
    cards: [{ file: 'captions.txt', label: 'Captions', meta: 'Plain text' }],
  },
];

// Every file a card publishes or previews has to exist before anything moves.
const missing = [];
for (const s of SECTIONS) for (const c of s.cards) for (const p of [c.file, c.thumb].filter(Boolean)) {
  if (!fs.existsSync(path.join(SRC, p))) missing.push(p);
}
if (missing.length) {
  console.error(`Not in the build at ${SRC}:\n  ${missing.join('\n  ')}`);
  process.exit(1);
}

fs.rmSync(DEST, { recursive: true, force: true });
for (const s of SECTIONS) for (const c of s.cards) {
  fs.mkdirSync(path.dirname(path.join(DEST, c.file)), { recursive: true });
  fs.copyFileSync(path.join(SRC, c.file), path.join(DEST, c.file));
}

async function thumb(c) {
  const p = c.thumb ?? c.file;
  if (!/\.png$/.test(p)) return null;
  const buf = await sharp(path.join(SRC, p)).resize({ width: THUMB_W }).webp({ quality: 78 }).toBuffer();
  return `data:image/webp;base64,${buf.toString('base64')}`;
}

const esc = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;');
let body = '';
for (const s of SECTIONS) {
  body += `<h2>${esc(s.title)}</h2><p class="snote">${esc(s.note)}</p><div class="grid">`;
  for (const c of s.cards) {
    const t = await thumb(c);
    const art = t
      ? `<a href="${c.file}"><img src="${t}" alt="${esc(c.label)}" loading="lazy" decoding="async" class="${c.tall ? 'tall' : ''}"/></a>`
      : `<a href="${c.file}" class="txt">${esc(c.label)}</a>`;
    body += `<div class="p">${art}<div class="cap"><b>${esc(c.label)}</b><span>${esc(c.meta)}</span><a class="slug" href="${c.file}">${c.file}</a></div></div>`;
  }
  body += '</div>';
}

const page = `<!doctype html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>BMW Menlyn Festival of Golf Ads</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=IBM+Plex+Sans:wght@400;500;600&display=swap">
<style>
:root{--paper:#E9EBF1;--plate:#FFF;--ink:#0E1330;--muted:#59618A;--rule:#D2D6E3;--accent:#037CD5}
@media(prefers-color-scheme:dark){:root:not([data-theme=light]){--paper:#080C18;--plate:#121729;--ink:#E6E9F5;--muted:#949CC2;--rule:#242B45;--accent:#57ACF0}}
*{box-sizing:border-box;margin:0;padding:0}
body{background:var(--paper);color:var(--ink);font-family:'IBM Plex Sans',system-ui,sans-serif;padding:32px 20px 80px}
.wrap{max-width:1180px;margin:0 auto}
header{border-bottom:1px solid var(--rule);padding-bottom:22px}
.eyebrow{font-size:12px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--accent)}
h1{font-family:'Space Grotesk',system-ui,sans-serif;font-weight:700;font-size:clamp(28px,4vw,42px);letter-spacing:-.03em;margin-top:6px}
.lede{color:var(--muted);margin-top:10px;max-width:72ch;line-height:1.55}
.note{background:var(--plate);border:1px solid var(--rule);border-left:4px solid #48D070;border-radius:12px;padding:14px 16px;margin:22px 0 4px;line-height:1.55;font-size:14px;max-width:90ch}
h2{font-family:'Space Grotesk',system-ui,sans-serif;font-size:13px;font-weight:700;letter-spacing:.17em;text-transform:uppercase;color:var(--accent);margin:38px 0 6px}
.snote{color:var(--muted);font-size:14px;margin-bottom:14px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:20px}
.p{background:var(--plate);border:1px solid var(--rule);border-radius:14px;overflow:hidden;display:flex;flex-direction:column}
.p img{width:100%;display:block;background:#111C4A}
.p .txt{display:flex;align-items:center;justify-content:center;min-height:160px;font-weight:600;color:var(--accent)}
.cap{padding:10px 12px 12px;display:flex;flex-direction:column;gap:3px;font-size:13px}
.cap span{color:var(--muted)}
.slug{font-family:ui-monospace,Menlo,monospace;font-size:12px;color:var(--accent);word-break:break-all;margin-top:2px}
code{font-size:13px}
</style></head><body><div class="wrap">
<header>
  <p class="eyebrow">Campaign pack &middot; SwingTribe and BMW Menlyn</p>
  <h1>BMW Menlyn Festival of Golf ads</h1>
  <p class="lede">Four short stories that ask golfers to join the BMW Menlyn Festival of Golf tribe in the SwingTribe app: one table across every club, your usual comp is your entry, you do not have to be scratch, and it is still not too late. Click any card for the full-size file.</p>
  <div class="note">Every code opens <code>play.swingtribe.app/t/FLF7SG</code> with its own <code>ref</code> per channel (<code>ad-festival-bmw-reel</code>, <code>-golftv</code>, <code>-story</code>, <code>-feed</code>, <code>-whatsapp</code>, <code>-print</code>), so scans can be told apart. Joining asks each golfer to agree that SwingTribe shares their details with BMW Menlyn, and every piece says so. The BMW Menlyn wordmark is BMW Menlyn's own, supplied by them, and sits grey on white at the bottom left.</div>
</header>
${body}
</div></body></html>`;

fs.writeFileSync(path.join(DEST, 'index.html'), page);
const n = SECTIONS.reduce((a, s) => a + s.cards.length, 0);
console.log(`Published ${n} cards to ${path.relative(process.cwd(), DEST)}/`);
