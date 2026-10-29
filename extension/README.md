# Extension layout

Reimagined for Rhythia has two looks, chosen in the popup. Each has its own folder.

| Folder | What it is |
|---|---|
| `exodus/` | Exodus, the experimental redesign. It replaces Rhythia's page with its own, built from Rhythia's API. See `exodus/README.md`. |
| `legacy/` | Classic (folder name: legacy); users see it as Classic in the popup and changelog. It adds to Rhythia's own page, so new things on rhythia.com still show. |
| `shared/` | Files used by more than one of: Exodus, Legacy, the background worker and the popup. |
| `background/` | Files only the background worker loads (see below). |
| `popup/` | The toolbar popup. |
| `background.js` | The background worker: the history settings and community choices (`background/storage-mutation-authority.js`), data migrations, the daily retention sweep, registering the active look (`engines.js`), release notes, player-history requests with this installation's key (`background/vps-access.js`), handing a page to Legacy (`rhythiax-page-free`) and theme CSS. |
| `engines.js` | Which scripts each look loads. The background registers only the active look's (see below). |

## Rules

- `exodus/` and `legacy/` never use each other's files or globals. Both may use `shared/`. One thing is not a
  use: the background loads Classic's pre-paint group (`legacyStart`) under Exodus too (see Loading).
- `shared/` uses neither `exodus/` nor `legacy/`.
- A file goes in `shared/` only when two of the above really load it. Otherwise it belongs to its look, or to
  `background/` when only the background loads it.
- The looks know of each other only through this contract:
  - `html.rhythiax-exodus`: Exodus shows the page. Only Exodus sets it (`exodus/core/shell.js`); the class itself
    is the signal. Legacy normally reads it through its own helper, `RhythiaX.exodusShowing()`
    (`legacy/core/state.js`). Three Legacy files read the class directly: `legacy/core/data/data-profile-ui.js`,
    which is also tested without `state.js`, `legacy/core/bridges/page-api-tap.js`, which runs in the
    page's own world and cannot see Legacy's globals, and `legacy/core/theme-editor.js`, which refuses to open
    while Exodus shows the page.
  - `html[data-rhythiax-exodus-theme]`: the Exodus theme on screen, which the shared notices follow.
  - The message `rhythiax-page-free`: Exodus does not take this page, and the background adds Legacy to the tab.
- While Exodus shows a page, Legacy suspends: it follows no route and builds nothing, takes down what it drew
  over the page, and gives Rhythia's own profile sections back (`data-rhythiax-scores-released` and
  `data-rhythiax-stats-released` on `<html>`). When the class goes, it resumes with one pass over the page.
  Legacy's features follow through `RhythiaX.ClassicIdle` (`isSuspended()`, `onSuspend(fn)`, `onResume(fn)`,
  `legacy/core/state.js`).

## What is in `shared/`

| File | Loaded by |
|---|---|
| `net.js` | Exodus, Legacy. Request limits for Rhythia's API and the VPS, across tabs. |
| `releases.js` | Exodus, Legacy (changelog). Parses this extension's release notes, which the background reads. |
| `settings/schema.js` | Exodus, popup. Every popup setting. |
| `colour.js` | Exodus, Legacy, popup. `RhythiaX.Colour`: the colour maths both looks' own themes are built from (contrast, mixing, gradients), the check a saved background must pass, how a background picture or video is placed on the screen, and `readMedia()`, which both theme editors use to read a picked file. Loads before `exodus-themes.js` and `classic-themes.js`. |
| `uploads.js` | Exodus, Legacy. `RhythiaX.Uploads`: the last 6 background pictures, GIFs and videos uploaded in either theme editor, kept so a new upload does not lose the one before. Saved as `rhythiaxUploads` (the list, with small thumbnails) and `rhythiaxUpload:<id>` (each file). A theme keeps its own copy of its background, so the list never changes a theme. Loads after `colour.js`. |
| `exodus-themes.js` | Exodus, popup. `RhythiaX.ExodusThemes`: own Exodus themes, with their presets, the colours worked out from a theme, and what may be saved. The popup lists and previews them; the CSS a theme adds to Exodus' page is `exodus/core/own-theme.js`. |
| `classic-themes.js` | Legacy, popup. Own Classic themes, kept simple: background, accent, panels and text, contrast, the profile banner and a background picture, GIF or video. Saved as `rhythiaxClassicThemes`, `rhythiaxClassicCustomTheme` and `rhythiaxClassicThemeImg:<id>`; each theme keeps its `base` (dark or white), which `engines.js` reads to load that stylesheet. Classic paints it in `legacy/core/theme.js` and edits it in `legacy/core/theme-editor.js`. |
| `notices.js` | Exodus, Legacy. The notification stack in the bottom-right corner, drawn in the look and theme on screen. Each look brings its colours as a skin, loaded right before it (`legacy/core/notice-skin.js`, `exodus/core/notice-skin.js`); without one the cards use plain system colours. |
| `community-consent.js` | Exodus, Legacy. The online-history choice card (a notice); each look refreshes its history after a choice (`onChoice`). |
| `consent.js` | Exodus, Legacy, popup, background. The one rule for the player's online-history choice (`RhythiaX.Consent`): whether history requests and profile visit reports are allowed. Callers treat a missing rule as not allowed. |
| `grades.js` | Exodus, Legacy. `RhythiaX.Grades`: the one rule for a score's grade letter. A letter Rhythia supplied is used as it is; otherwise it comes from the accuracy on Rhythia's scale (SS at 100% without a miss, S from 98%, A from 95%, B from 93%, C from 90%, D from 80%), and F below 80% or for a play marked as failed. Each look colours the letters in its own CSS. |
| `app-icon.js` | Exodus, Legacy. `RhythiaX.APP_ICON`: the extension's icon as a data URL (the page cannot load the extension's files), for the Creator of Reimagined badge and Exodus' logo Easter egg. |
| `rhythia-session.js` | Exodus, Legacy. `RhythiaX.RhythiaSession.token()`: who is signed in to Rhythia, read the same way in both looks. Callers treat a missing file as signed out. |
| `data/data-schema.js`, `data/data-migrations.js`, `data/data-repository.js` | Legacy, background. Saved player data and its migrations. The popup also loads `data-schema.js`, for the history settings' defaults and the record key. |

## What is in `background/`

| File | What it is |
|---|---|
| `vps-access.js` | Player-history requests to the VPS (the background end of `shared/net.js`'s history route) with this installation's anonymous key, so the key never reaches the page. |
| `storage-mutation-authority.js` | The one writer of the history settings (`rhythiaxDataSettings`) and of Classic's saved profile history (`data-records-commit`, with a revision check so two tabs never overwrite each other's captures): the popup's settings patches (`data-settings-patch`) and the community choices (`local-only`, `hybrid-no-reports`, `cloud-no-reports`), one at a time. Choosing This device also removes the community history kept on this device. It also runs the retention sweep. |

App settings do not go through the background: the popup writes the look, theme, modules, options and popup
size itself, Legacy's score cards write their list or grid view (`scoreCards.playerView` in
`rhythiaxModuleOptions`, `legacy/content/features/score-cards/store.js`), and Legacy's Exodus intro card switches
Exodus on as the popup does (`rhythiaxExodus`, `legacy/content/features/exodus-intro/notice.js`).

The retention sweep runs when the background starts, at most once a day (`rhythiaxRetentionSweepAt`), after the
data check and never while stored history is read-only. Each look prunes its own copies while it runs; the sweep
removes what the look that wrote a copy would no longer keep or show, also while that look is not in use:

- Legacy's history records (`rhythiaxData:entry:<id>`) not saved for longer than the 90 days kept.
- Exodus' saved home page and leaderboard (`rhythiaxExodusHome`, `rhythiaxExodusBoard`) older than 7 days.
- Legacy's community history copies past their use (`rhythiaxVpsHistoryCache:<id>` after 40 minutes,
  `rhythiax_ps_hist_<id>` after 15).
- While Exodus is off: Exodus' saved profiles and pages (`rhythiaxExodusSnap:`, `rhythiaxExodusPage:`, 7 days) and
  community history (`rhythiaxExodusHist:`, 3 days).
- The 1.1 visit report switch (`rhythiax_telemetry_enabled`), once the history settings hold its copy
  (`telemetryEnabled`, copied by the 1.1 update in `shared/data/data-migrations.js`, the only reader left).

## What is in `legacy/`

| Path | What it is |
|---|---|
| `main.js` | Classic's start, the last file of its group. |
| `core/` | Classic's base: its page state and idle switch (`state.js`), Rhythia API requests and caches (`api.js`), score objects (`scores.js`) and scores read from Rhythia's page (`score-parse.js`), map details (`beatmap-meta.js`), DOM helpers (`dom.js`, `dom-update.js`), dates (`time.js`), the built-in themes (`theme.js`, `themes/`), the own-theme editor (`theme-editor.js`, opened by the popup's message; it sets no global and closes without saving when Exodus takes the page) and the notice skin. |
| `core/data/` | The tab side of saved profile history, the online-history cache (`vps-history-cache.js`) and the history shown on Rhythia's profile cards (`data-profile-ui.js`). Tabs have no writer for the history settings and no bulk clear of records: those go through the background. |
| `core/bridges/` | See "Bridge" below. |
| `content/bootstrap/` | Start-up and page changes (`route-observer.js`, `lifecycle.js`, `route-context.js`), `cleanup.js` (takes down what Classic drew) and `changelog-early.js` (part of the pre-paint group). |
| `content/features/` | One folder per feature: score cards, statistics, playstyle, compare (`compare/view.js` also sets `RhythiaX.injectPlayerCompare`), title progression, friends, the country leaderboard and the Exodus intro card. |
| `content/features/score-cards/templates/` | One file per score-card style, named like its CSS in `styles/components/score-card/`: `variant-a.js` (A, "Big grade"), `variant-b.js` (B, "Square art"), `variant-c.js` (C, "Compact") and `variant-rows.js` (D "Rhythia row", E "Art behind", F "Table"). The stored values stay `variant_a` to `variant_f`. |
| `content/pages/` | Per page (profile, changelog, score replay): an adapter that finds Rhythia's parts and a composition that puts the features on them. |
| `styles/` | Classic's CSS: `foundation/`, `components/`, `pages/`, `themes/` (one folder per built-in theme), `bridge/` (Rhythia's own markup), `easter-eggs/`, and `built/` (generated, see "Legacy CSS for Rhythia's own markup"). |

## Words used in the code

- **legacy** and **classic** name the same look. `legacy` is its folder and code name (the `engines.js` ids
  `legacy`, `legacy-start` and `legacy-tap`, the look keys in `shared/releases.js`); the popup's settings and CSS
  say `classic`; players see Classic. Neither means old or unused.
- **bridge** names four kinds of file:
  - Scripts that run in the page's own world (`"world": "MAIN"`): `exodus/core/bridge.js` (Rhythia's map
    preview) and `legacy/core/bridges/page-api-tap.js` (passes on two of Rhythia's own API answers).
  - Thin facades over Classic's own functions: `legacy/core/bridges/rhythia-api-bridge.js`
    (`fetchPlayerScoreSets`, `fetchUserProfile`), `data-store-bridge.js` (`getRecord`) and `site-dom-bridge.js`
    (`query`, `queryAll`, `findOfficialStatsContainer`, `findHeaderRankArea`).
  - A messaging client: `legacy/core/bridges/runtime-bridge.js` (messages to the background).
  - The cache of the tapped answers: `legacy/core/bridges/page-api-bridge.js`.

  The CSS in `legacy/styles/bridge/` and `legacy/styles/themes/official-bridge.css` is none of these: it restyles
  Rhythia's own markup (see below).

## Loading

The manifests list no content scripts. `engines.js` holds the file lists and the background registers the
active look's scripts (`chrome.scripting`), so a Rhythia tab loads one look, plus Classic's pre-paint group:

- Under both looks: Classic's pre-paint group (`legacyStart`: `tokens.css`, `anti-flicker.css` and
  `changelog-early.js`), at `document_start`, so a page Exodus gives to Legacy is covered from the first frame.
  Under Exodus it changes nothing on screen: every rule of `anti-flicker.css` on Rhythia's own page is guarded
  by `html:not(.rhythiax-exodus)`.
- Exodus off: Legacy, at `document_idle`.
- Exodus on: Exodus, at `document_start`. When Exodus does not take a page, it asks the background
  (`rhythiax-page-free`) and Legacy is added to that tab only.
- Switching Exodus on adds it to open Rhythia tabs at once; switching it off hands each page to Legacy.

Legacy loads only the chosen theme's CSS (`THEME_CSS` in `engines.js`): every rule is checked against every
element on each style recalculation, even under another theme's name. A theme switched on in the popup is
added to open tabs at once.

A new content script goes into its group in `engines.js`, not into the manifests.

## Legacy CSS for Rhythia's own markup

`legacy/styles/bridge/native-*.css`, `legacy/styles/themes/`, `legacy/styles/foundation/base.css`,
`legacy/styles/pages/support.css` and `legacy/styles/pages/score-replay.css` restyle Rhythia's Tailwind markup and
select it by substring, e.g. `[class*="text-white"]`. A browser checks such a selector against every element on
every style recalculation, so the extension loads built copies from `legacy/styles/built/` instead, where the last
part of each selector lists Rhythia's exact classes (`.text-white, .text-white/60, …`).

- Edit the sources, never `built/`, then run `node tools/legacy-css/build.js`. The tests fail while `built/` is out of date.
- When Rhythia changes its markup, run `node tools/legacy-css/collect-classes.js` (it reads Rhythia's stylesheets and
  pages), then rebuild. A substring no Rhythia class contains is left out of the built copy until then;
  `node tools/legacy-css/build.js --check` lists the selectors it leaves out. A selector with an unpaired bracket
  or quote stops the build.
- `tools/` and the tests live in the development repository; the public repository has only the extension itself.
  The Firefox source package for review includes `tools/legacy-css/`, so `built/` can be rebuilt from it, and
  `tools/exodus-assets/`, which generates `exodus/core/assets.js`.
- The tests run with `node tests/run.js` (every suite once; `--fast` leaves out the suites that start a browser).
  Where a new test goes is at the top of that file.

## Release notes

`changelog.md` here is the extension's changelog; `../changelog.md` is a copy for the public repository (the tests
check they match). Each entry starts with front matter (`version`, `date`, `title`, `listed`). A `# Exodus` or
`# Classic` heading (`# Legacy` also works) inside an entry starts that look's part; notes before it belong to both.

The background (`background.js`, `rhythiax-releases`) gives both changelogs the packaged file and the online copy,
which wins for the same version. Loaded from a folder (a development install), the extension shows only the local
file, including entries marked `listed: draft`: edit `changelog.md`, reload the extension, and the changelog shows
the draft. A store or packaged install never shows drafts.

The online copy is `https://rhythia.shuriel.com/api/changelog` (`RELEASES_ONLINE` in `background.js`), read only
after the player allowed connections to the history server (Both or Community under "Where history comes from"
in the popup; `../DATA-AND-SYNC.md` also calls them Cloud + Local and Cloud Only); otherwise the packaged file is
all there is. Publish it with `node tools/publish-changelog.js`: it uploads the changelog of a commit
(`--ref`, HEAD by default; a name that is both a branch and a tag must be written `refs/tags/…` or
`refs/heads/…`), only once the newest listed version is tagged (`--force` skips that check), and leaves draft
entries out. The server keeps at most 512 KB, and the gateway limits each address to a few requests a minute.

## Both browsers

`manifest.json` here is for Chromium. Firefox uses `../firefox/manifest.json` with the same files.
When a file the manifests name moves (background scripts, popup, icons), change both manifests. Background
scripts are listed twice, in the same order: `importScripts` at the top of `background.js` (Chrome's manifest
names only `background.js`) and `background.scripts` in `../firefox/manifest.json`, which ends with `background.js`.
