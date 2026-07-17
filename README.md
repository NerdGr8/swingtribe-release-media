# swingtribe-release-media

Public host for SwingTribe release screenshots used by the **weekly release
email** (the `weekly-release-email` skill in `NerdGr8/swingtribe-app`).

## Why this repo exists

The email builder runs in a sandbox that **can't download private release
assets**, but it **can** read public GitHub files over
`raw.githubusercontent.com`. Hosting screenshots here (public) keeps the app repo
free of image bloat and makes them fetchable at build time.

## Layout

```
pr-<PR_NUMBER>/            one folder per PR
  <image>.jpg             web-sized screenshots (the workflow optimizes these)
  meta.json               optional: titles, captions, which image is the hero
index.json                GENERATED — never edit by hand
```

`meta.json` (all optional):

```json
{
  "title": "Share your round as a card",
  "area": "Sharing",
  "images": {
    "01-share-card.jpg": { "caption": "Shareable round card", "primary": true }
  }
}
```

## How images arrive

- **Auto** — `swingtribe-app`'s `publish-release-media.yml` mirrors a curated
  release's screenshots into `pr-<n>/` here.
- **Curate / override** — add or replace images under `pr-<n>/` directly (drag
  and drop in the GitHub UI, or open a PR), and mark the hero via `meta.json`.

## What the workflow does

On every push under `pr-*/`, `build-index.yml` runs `scripts/optimize-and-index.mjs`:
optimizes images to web-sized JPEG, prunes folders beyond the newest `KEEP_PRS`
(default 60), and regenerates `index.json`. It commits the result with `[skip ci]`
so it never loops. No secrets — it uses this repo's own token.

## Consuming it

The email skill reads:

```
https://raw.githubusercontent.com/NerdGr8/swingtribe-release-media/main/index.json
```

and then fetches each image's `url`.
