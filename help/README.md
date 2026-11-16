# Help guide media

The pictures in SwingTribe's help guides: the tutorial films (`*.film.gif`),
the clips (`*.gif`) and the stills (`*.png`). Both apps load them from here
through jsDelivr:

    https://cdn.jsdelivr.net/gh/NerdGr8/swingtribe-release-media@main/help/<file>

## Do not edit by hand

The source is `NerdGr8/swingtribe-app`. The films are rendered by
`app-store-submission/store-assets/exploded.mjs`, the stills and clips by
`scripts/build-guide-media.mjs`, and `scripts/sync-help-media.mjs` copies the
lot here and purges jsDelivr's cache. A file changed here and not there is
overwritten on the next sync.

## Rules the files keep

- Every GIF is under 1 MB and opens on a clean first frame.
- File names never change once a guide links them. A new picture is a new
  name, or the same name re-rendered; a renamed file breaks every guide and
  email that points at the old one.
- Nothing in `help/` is touched by `build-index.yml` (it reads `pr-*/` only)
  or published by `pages.yml` (it publishes `banners/` only).
