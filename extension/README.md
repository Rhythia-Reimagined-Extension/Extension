# Extension layout

Reimagined for Rhythia has two looks, chosen in the popup. Each has its own folder.

| Folder | What it is |
|---|---|
| `exodus/` | Exodus, the experimental redesign. It replaces Rhythia's page with its own, built from Rhythia's API. See `exodus/README.md`. |
| `legacy/` | Classic (folder name: legacy), the 1.2.x look; users see it as Classic in the popup and changelog. It adds to Rhythia's own page, so new things on rhythia.com still show. |
| `shared/` | Files used by more than one of: Exodus, Legacy, the background worker and the popup. |
| `popup/` | The toolbar popup. |
| `background.js` | The background worker: storage writes and data migrations. |
| `engines.js` | Which scripts each look loads. The background registers only the active look's (see below). |

## Rules

- `exodus/` and `legacy/` never use each other's files or globals. Both may use `shared/`.
- `shared/` uses neither `exodus/` nor `legacy/`.
- A file goes in `shared/` only when two of the above really load it. Otherwise it belongs to its look.
- While Exodus shows a page (`html.rhythiax-exodus`), Legacy does nothing.

## What is in `shared/`

| File | Loaded by |
|---|---|
| `net.js` | Exodus, Legacy. Request limits for Rhythia's API and the VPS, across tabs. |
| `releases.js` | Exodus, Legacy (changelog). Parses this extension's release notes, which the background reads. |
| `settings/schema.js` | Exodus, popup. Every popup setting. |
| `notices.js` | Exodus, Legacy. The notification stack in the bottom-right corner, drawn in the look and theme on screen. |
| `community-consent.js` | Exodus, Legacy. The online-history choice card (a notice); each look refreshes its history after a choice (`onChoice`). |
| `time.js`, `data/data-schema.js`, `data/data-migrations.js`, `data/data-repository.js` | Legacy, background. Saved player data and its migrations. |
| `data/storage-mutation-bridge.js` | Legacy, background. |
| `data/storage-mutation-authority.js` | Background. |

## Loading

The manifests list no content scripts. `engines.js` holds the file lists and the background registers the
active look's scripts (`chrome.scripting`), so a Rhythia tab loads one look:

- Exodus off: Legacy, at `document_idle`.
- Exodus on: Exodus, at `document_start`. When Exodus does not take a page, it asks the background
  (`rhythiax-page-free`) and Legacy is added to that tab only.
- Switching Exodus on adds it to open Rhythia tabs at once; switching it off hands each page to Legacy.

Legacy loads only the chosen theme's CSS (`THEME_CSS` in `engines.js`): every rule is checked against every
element on each style recalculation, even under another theme's name. A theme switched on in the popup is
added to open tabs at once.

A new content script goes into its group in `engines.js`, not into the manifests.

## Legacy CSS for Rhythia's own markup

`legacy/styles/bridge/native-*.css` and `legacy/styles/themes/` restyle Rhythia's Tailwind markup and select it by
substring, e.g. `[class*="text-white"]`. A browser checks such a selector against every element on every style
recalculation, so the extension loads built copies from `legacy/styles/built/` instead, where the last part of
each selector lists Rhythia's exact classes (`.text-white, .text-white/60, …`).

- Edit the sources, never `built/`, then run `node tools/legacy-css/build.js`. The tests fail while `built/` is out of date.
- When Rhythia changes its markup, run `node tools/legacy-css/collect-classes.js` (it reads Rhythia's stylesheets and
  pages), then rebuild. A substring no Rhythia class contains is left out of the built copy until then.
- `tools/` and the tests live in the development repository; the public repository has only the extension itself.

## Release notes

`changelog.md` here is the extension's changelog; `../changelog.md` is a copy for the public repository (the tests
check they match). Each entry starts with front matter (`version`, `date`, `title`, `listed`). A `# Exodus` or
`# Classic` heading (`# Legacy` also works) inside an entry starts that look's part; notes before it belong to both.

The background (`background.js`, `rhythiax-releases`) gives both changelogs the packaged file and the online copy,
which wins for the same version. Loaded from a folder (a development install), the extension shows only the local
file, including entries marked `listed: draft`: edit `changelog.md`, reload the extension, and the changelog shows
the draft. A store or packaged install never shows drafts.

The online copy is `https://rhythia.shuriel.com/api/changelog` (`RELEASES_ONLINE` in `background.js`), read only
after the player allowed connections to the history server (Both or Community); otherwise the packaged
file is all there is. Publish it with `node tools/publish-changelog.js`: draft entries are left out, the server
keeps at most 512 KB, and the gateway limits each address to a few requests a minute.

## Both browsers

`manifest.json` here is for Chromium. Firefox uses `../firefox/manifest.json` with the same files.
When a file the manifests name moves (background scripts, popup, icons), change both manifests.
