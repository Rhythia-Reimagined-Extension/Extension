# Exodus

Exodus is the experimental redesign of rhythia.com. It is switched on in the popup (Exodus, off by
default). Everything it needs lives in this folder, apart from these files in `../shared/`:

- `shared/net.js`: shared request limits for Rhythia's API and the VPS, across tabs.
- `shared/settings/schema.js`: the popup's settings, shared with the Legacy look.
- `shared/releases.js`: this extension's release notes.
- `shared/community-consent.js`: the online-history choice card. Exodus redraws the page after a choice.

It does not use anything in `../legacy/`, so Legacy can change without touching Exodus, and the other way round.
See `../README.md` for how the three folders fit together.

## Where Exodus ends

While Exodus is on, a tab loads only Exodus and Legacy's small start files (tokens, anti-flicker CSS and the early changelog script); the rest of Legacy is not loaded (`../engines.js`).
While Exodus shows a page, it puts the class `rhythiax-exodus` on `<html>` (`RhythiaX.Exodus.owns()`), and
Rhythia's own page keeps running underneath, unseen.

On a profile, Rhythia's page is not moved along when Exodus changes the address, because it would load the
same profile a second time. It catches up when one of its own parts is needed: a native button, Settings,
"Show Rhythia's page", Back or Forward, leaving the profiles, or the page going back to Rhythia
(`catchUp()` in `core/shell.js`). Every other page keeps Rhythia's page at the address, since it uses
Rhythia's player or buttons.

When Exodus does not take a page (Rhythia's own page, a page switched off in the popup, or Exodus switched
off), it sends `rhythiax-page-free` to the background once, and the background adds Legacy to that tab.
Legacy then builds the page as on a fresh visit, and stays idle whenever the class comes back.
Exodus never calls into the Legacy scripts.

## Loading

While Exodus is on, the background (`../engines.js`) registers Exodus at `document_start` instead of Legacy,
in this order:

| File | What it is |
|---|---|
| `boot.css` | Hides Rhythia's page before it paints and colours the page while Exodus starts. |
| `../shared/net.js` | `RhythiaX.Net.fetch`. Shared request limits for Rhythia's API and the VPS, across tabs. |
| `../shared/settings/schema.js` | `RhythiaX.SettingsSchema`. Every popup setting, where it is saved and which look uses it. |
| `core/assets.js` | Base CSS, icon sprite and title art, generated from the approved mockup. Do not edit by hand. |
| `core/data.js` | `RhythiaX.ExodusData`. Every request to Rhythia and the VPS, and the saved copies pages paint from. |
| `core/kit.js` | `RhythiaX.ExodusKit`. Shared helpers, `morph()` and the page registry. |
| `core/markdown.js` | The small Markdown renderer used by the wiki and the changelog. |
| `../shared/releases.js` | `RhythiaX.Releases`. This extension's release notes, through the background (see `../README.md`). |
| `core/mapkit.js` | Reads a map file (.sspm or .rhm, only the notes part): what the map is made of. |
| `pages/*.js` | One file per page (see below). |
| `core/account.js` | `RhythiaX.ExodusAccount`. The Settings window the header's gear opens. It saves with Rhythia's own request; image uploads, buying a name change and login changes open Rhythia's window. |
| `core/shell.js` | `RhythiaX.Exodus`. The header, the router, and which page shows at which address. |

`core/bridge.js` runs in the page's own world (`"world": "MAIN"`) at `document_idle`. It reaches
Rhythia's map preview for the speed and seek controls.

## Pages

| File | Addresses |
|---|---|
| `pages/home.js` | `/` |
| `pages/profile.js` | `/player/:id`, `/player/:id/scores` |
| `pages/compare.js` | The profile's Compare window. |
| `pages/board.js` | `/leaderboards`, `/leaderboards/:country` |
| `pages/score.js` | `/score/:id` |
| `pages/map.js` | `/maps/:id` |
| `pages/maps.js` | `/maps` |
| `pages/skins.js` | `/skins` |
| `pages/clans.js` | `/clans`, `/clans/:id` |
| `pages/collections.js` | `/collections`, `/collections/own`, `/collections/:id` |
| `pages/wiki.js` | `/wiki` |
| `pages/changelog.js` | `/changelog` and its streams |
| `pages/support.js` | `/support`. Payment stays in Rhythia's own dialog, and `?paynet=` returns stay with Rhythia. |

### Adding a page

1. Write the view as `function view(host, ctx)`. It returns `{state, idle, relayout, page, destroy}`.
2. Register it with `K().page('name', view, css)`.
3. Give it an address in `viewKey()` in `core/shell.js`.
4. Add the file to the `exodus` group in `../engines.js`.

## Rules every page follows

- **Paint at once, then refresh.** A page paints its saved copy at once, then the fresh answer. Later
  updates go through `morph()`, never a fresh `innerHTML`. That way nothing jumps, flashes or plays
  its entrance again.
- **Pay with Rhythia.** Sign-in, uploads, payments and login changes open Rhythia's own dialogs
  (`ctx.clickNative` or `data-native-click`). The Settings window (`core/account.js`) saves the rest itself and hands these over.
- **Use the shared limiter.** All requests to Rhythia's API and the VPS go through `shared/net.js` (map files and the Home video come from Rhythia's resource host and are capped in `core/mapkit.js` and `core/data.js` instead):
  - Rhythia: 16 a second.
  - VPS: within the gateway's per-address limits.
- **Follow the popup.** `core/shell.js` puts the switches Exodus honours in `RhythiaX.ExodusPrefs`
  (`modules` shared with the Legacy look, `exodus` for its own options) and rebuilds the page when they change.
  A new setting is one entry in `shared/settings/schema.js`, then a read of `RhythiaX.ExodusPrefs` where it applies.
- **Ask for consent.** Community history is only fetched after the same consent the Legacy client asks for.
