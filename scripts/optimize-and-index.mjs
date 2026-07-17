#!/usr/bin/env node
/**
 * Media repo housekeeping: optimize incoming screenshots to web-sized JPEGs,
 * prune PR folders beyond the newest KEEP, and regenerate index.json (a catalog
 * of pr -> images with public raw URLs, dimensions and shape).
 *
 * Idempotent: already-optimized JPEGs are left untouched, so the workflow that
 * commits the result won't loop. Run from the repo root in CI.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const sharp = require('sharp');

const REPO = process.cwd();
const [OWNER, NAME] = (process.env.GITHUB_REPOSITORY || 'NerdGr8/swingtribe-release-media').split('/');
const BRANCH = process.env.GITHUB_REF_NAME || 'main';
const MAX_W = parseInt(process.env.MAX_W || '1000', 10);
const QUALITY = parseInt(process.env.JPEG_QUALITY || '84', 10);
const KEEP = parseInt(process.env.KEEP_PRS || '60', 10);
const rawBase = `https://raw.githubusercontent.com/${OWNER}/${NAME}/${BRANCH}`;
const IMG = /\.(png|jpe?g|webp)$/i;

const prDirs = fs.readdirSync(REPO, { withFileTypes: true })
  .filter((d) => d.isDirectory() && /^pr-\d+$/.test(d.name))
  .map((d) => d.name)
  .sort((a, b) => parseInt(b.slice(3), 10) - parseInt(a.slice(3), 10)); // newest PR first

// Prune folders beyond the newest KEEP so the repo doesn't grow forever.
for (const dir of prDirs.slice(KEEP)) {
  fs.rmSync(path.join(REPO, dir), { recursive: true, force: true });
  console.log('pruned', dir);
}
const kept = prDirs.slice(0, KEEP).sort((a, b) => parseInt(a.slice(3), 10) - parseInt(b.slice(3), 10));

const prs = {};
for (const dir of kept) {
  const abs = path.join(REPO, dir);
  let meta = {};
  try { meta = JSON.parse(fs.readFileSync(path.join(abs, 'meta.json'), 'utf8')); } catch { /* optional */ }
  const files = fs.readdirSync(abs).filter((f) => IMG.test(f)).sort();
  const images = [];
  for (const f of files) {
    let name = f, src = path.join(abs, f);
    const md = await sharp(src).metadata();
    const oversized = (md.width || 0) > MAX_W;
    if (/\.(png|webp)$/i.test(f) || oversized) {                 // optimize (idempotent: skips right-sized jpg)
      name = f.replace(/\.(png|webp|jpe?g)$/i, '.jpg');
      const out = path.join(abs, name);
      const buf = await sharp(src).resize({ width: Math.min(md.width || MAX_W, MAX_W) }).jpeg({ quality: QUALITY, mozjpeg: true }).toBuffer();
      fs.writeFileSync(out, buf);
      if (name !== f) fs.rmSync(src);                            // drop the original png/webp
      src = out;
    }
    const m2 = await sharp(src).metadata();
    const w = m2.width, h = m2.height;
    const shape = h > w * 1.7 ? 'phone' : h > w * 1.15 ? 'portrait' : w > h * 1.4 ? 'wide' : 'square';
    const im = (meta.images && (meta.images[name] || meta.images[f])) || {};
    images.push({ file: name, url: `${rawBase}/${dir}/${name}`, caption: im.caption || '', primary: !!im.primary, w, h, shape });
  }
  if (!images.length) continue;
  if (!images.some((i) => i.primary)) images[0].primary = true; // default the hero to the first image
  prs[dir.slice(3)] = { title: meta.title || '', area: meta.area || '', images };
}

fs.writeFileSync(path.join(REPO, 'index.json'), JSON.stringify({ repo: `${OWNER}/${NAME}`, branch: BRANCH, prs }, null, 2) + '\n');
console.log('indexed PRs:', Object.keys(prs).join(', ') || '(none)');
