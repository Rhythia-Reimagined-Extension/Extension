# Store review notes — 1.3.1

For store reviewers. Prepared October 23, 2026 for the 1.3.1 upload; 1.3.0 is the version live in the Chrome Web Store and on Firefox Add-ons. This is a review checklist, not a store approval or legal certification.

## Public links

- Extension privacy: https://shuriel.com/policies/reimagined/#privacy
- Extension terms: https://shuriel.com/policies/reimagined/#terms
- Player history privacy: https://shuriel.com/policies/reimagined/history/#privacy
- Release notes: https://github.com/Rhythia-Reimagined-Extension/Extension/blob/main/changelog.md

Check the live policy pages before entering the URL in either store. Chrome's policy field should use https://shuriel.com/policies/reimagined/ and the listing should reference the same notice.

## Reviewer explanation

Reimagined for Rhythia improves how players read and explore Rhythia profiles, scores and progress, with local customization and optional online player history. Since 1.3.0 it has two looks: Classic adds to Rhythia's own pages, and the experimental Exodus (off by default) shows its own pages built from Rhythia's API. With Exodus the user can also edit their own profile, pin scores, add friends, set a showcase and edit collections; these are sent only to Rhythia's API when the user acts. Exodus reads the notes part of map files from Rhythia's resource host (HTTP Range requests) to label maps as jumps, streams, tech or varied, and to mark maps that have quantum parts; only that label and a few numbers per map are stored locally. It processes public player IDs, names, scores and page content locally. Official account features read the existing Rhythia session only to communicate with the official game API; the community service never receives it.

Community history is disabled until the user chooses online history. These requests include the requested public player ID and an anonymous installation key issued by the service (random, with no account or browser information), which lets it serve full history and limit automated copying; the key is used only by the extension background and removed in Local Only. The connection exposes an IP address to the service and its infrastructure providers. Separate optional profile-visit reports are off after the initial choice and identify the viewed public profile, not the visiting game account. Their purpose is to discover public profiles for the shared player-history feature. The service may admit these profiles for independent public-API collection; reports do not guarantee an immediate update. They are not advertising analytics or a general browsing tracker.

The popup and first connection choice disclose this handling and link to the service notice before enabling community connections. Local Only blocks new community requests, including reports and online release notes. Official game features can still connect. Downloaded JSON/Markdown and map files are treated as data, not executable code. Profile visit reports are sent only by Classic; the switch is not shown for Exodus.

## Data declarations

PII, authentication information, website content and viewed Rhythia profiles/resources are processed. IP falls under the Chrome dashboard's Location examples; no device GPS is requested. User activity should be explained by selected feature actions and optional viewed-profile reports, not by claiming a global click/keyboard/mouse tracker. No health, financial or private-message feature is present. Local-only processing must still be disclosed.

Storage supports settings, local history, temporary caches and saved connection choices. unlimitedStorage supports the application's 25 MB local-history budget, Exodus saved pages and the pictures and videos of the user's own themes beyond the normal storage.local quota. A theme's picture can be a file of up to 8 MB and its video up to 20 MB (stored as a data: URL, about a third larger), for up to 24 Exodus and 12 Classic themes; a theme's media is removed when the theme is deleted. The theme editors also keep the user's last 6 uploads, each removable from that list. Application retention remains bounded. Host permissions correspond to Rhythia pages, optional community history and its plain-text release notes. The official Rhythia API (`production.rhythia.com`) is called by the extension's scripts on rhythia.com pages the same way the page calls it, under its normal CORS rules, so it needs no host permission. scripting registers the scripts of the look the user chose (Classic or Exodus) on Rhythia pages, so each tab loads one look; it is used only on rhythia.com and only with files packaged in the extension.

## Permission justifications (Chrome Web Store)

| Permission | Justification |
| --- | --- |
| `storage` | Saves the user's settings, theme and look choice, local player history and cached data on the user's own device. |
| `unlimitedStorage` | Lets the optional local profile history, Exodus saved pages and the pictures and videos of the user's own themes (files up to 8 MB and 20 MB) grow beyond the default quota; the extension limits history to 25 MB, offers Clear history, removes a theme's media when the theme is deleted and keeps at most the last 6 uploads, each removable. |
| `scripting` | Registers and injects the extension's own packaged scripts and styles for the look the user chose (Classic or Exodus) on rhythia.com pages only; no remote code is loaded. |
| `https://www.rhythia.com/*`, `https://rhythia.com/*` | The pages the extension improves: it runs its packaged scripts and styles there and updates open Rhythia tabs when settings change. |
| `https://rhythia.shuriel.com/*` | The optional player-history service and online release notes; used only after the user chooses online history, never in Local Only. History requests carry a random anonymous key for this installation, issued by the service, with no account, session or browser information in it. |

Single purpose: "Improves how Rhythia player profiles, scores and maps are displayed on rhythia.com, with local customization." Remote code: none; all JavaScript is packaged.

## Manual acceptance still required

Install the actual Chromium and Firefox packages (built with `node tools/build-release.js`). On a fresh Rhythia profile, verify the first connection choice, Local Only before any community request, online history with reports still off, separate report opt-in, mode cancellation, Clear history, SPA profile navigation and online/offline changelog. Then switch to Exodus with Rhythia tabs open, check that it appears without a reload, open a profile's Playstyle (the network log shows Range requests for map files), Clear saved pages, and switch back to Classic. Verify policy/terms links and distinguish an update preserving existing choices from a fresh installation.
