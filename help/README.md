# Help guide media

The pictures in SwingTribe's help guides: the tutorial films (`*.film.gif`),
the clips (`*.gif`) and the stills (`*.png`). Both apps load them from
GitHub Pages, published by `.github/workflows/pages.yml`:

    https://nerdgr8.github.io/swingtribe-release-media/help/<file>

## Do not edit by hand

The source is `NerdGr8/swingtribe-app`. The films are rendered by
`app-store-submission/store-assets/exploded.mjs`, the stills and clips by
`scripts/build-guide-media.mjs`, and `scripts/sync-help-media.mjs` copies the
lot here. Pages serves each file with a 10 minute cache, so a re-rendered
picture reaches readers within minutes of the sync. A file changed here and
not there is overwritten on the next sync.

## Rules the files keep

- Every GIF is under 1 MB and opens on a clean first frame.
- File names never change once a guide links them. A new picture is a new
  name, or the same name re-rendered; a renamed file breaks every guide and
  email that points at the old one.
- Nothing in `help/` is touched by `build-index.yml`, which reads `pr-*/`
  only. `pages.yml` publishes it beside `banners/`.
