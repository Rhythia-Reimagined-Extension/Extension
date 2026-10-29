# Store review notes — 1.4.0

For store reviewers. Prepared October 29, 2026 for the 1.4.0 upload; 1.3.1 is the version live in the Chrome Web Store and on Firefox Add-ons. This is a review checklist, not a store approval or legal certification.

## Public links

- Extension privacy: https://shuriel.com/policies/reimagined/#privacy
- Extension terms: https://shuriel.com/policies/reimagined/#terms
- Player history privacy: https://shuriel.com/policies/reimagined/history/#privacy
- Release notes: https://github.com/Rhythia-Reimagined-Extension/Extension/blob/main/changelog.md

Check the live policy pages before entering the URL in either store. Chrome's policy field should use https://shuriel.com/policies/reimagined/ and the listing should reference the same notice.

## Reviewer explanation

Reimagined for Rhythia improves how players read and explore Rhythia profiles, scores, maps and progress, with local customization and optional online player history. It has two looks: Classic adds to Rhythia's own pages, and the experimental Exodus (off by default) shows its own pages built from Rhythia's API. With Exodus the user can also act on their own account: edit their profile, pin scores, add and remove friends, set a showcase, wear items and use a Name Change, create and edit collections, invite to or leave a clan, read notifications and answer clan invites, report a player with a reason and note they choose, post map comments, delete skins they shared, and, for Team Ranked members, qualify or veto a map. These are sent only to Rhythia's API when the user acts. Exodus reads the notes part of map files from Rhythia's resource host (HTTP Range requests) to label maps as jumps, streams, techs or varied, and to mark maps that have quantum parts; only that label and a few numbers per map are stored locally. It processes public player IDs, names, scores and page content locally. Official account features read the existing Rhythia session only to communicate with the official game API; the community service never receives it.

Community history is disabled until the user chooses online history. These requests include the requested public player ID and an anonymous installation key issued by the service (random, with no account or browser information), which lets it serve full history and limit automated copying; the key is used only by the extension background and removed in Local Only. With online history, both looks also ask the service for the map types of the maps on a page (up to 100 map identifiers a request), Exodus' Near your rank asks for group figures for the players ranked near the viewed player, and Reimagined Search (a search of Ranked and Qualified maps by map type) sends the search's filters: statuses, types, quantum, stars, length, mapper and title words, explicit, order and page. A search always needs the key. The service does not write the filters to its database or logs. The connection exposes an IP address to the service and its infrastructure providers. Separate optional profile-visit reports are off after the initial choice and identify the viewed public profile, not the visiting game account. Their purpose is to discover public profiles for the shared player-history feature. The service may admit these profiles for independent public-API collection; reports do not guarantee an immediate update. They are not advertising analytics or a general browsing tracker.

The popup and first connection choice disclose this handling and link to the service notice before enabling community connections. Local Only blocks new community requests, including map types, Reimagined Search, Near your rank, reports and online release notes; in Local Only, Reimagined Search and Near your rank show a Turn on online history button instead and send nothing. Official game features can still connect. Downloaded JSON/Markdown and map files are treated as data, not executable code. Profile visit reports are sent only by Classic; the switch is not shown for Exodus.

## Data declarations

PII, authentication information, website content and viewed Rhythia profiles/resources are processed. IP falls under the Chrome dashboard's Location examples; no device GPS is requested. User activity should be explained by selected feature actions and optional viewed-profile reports, not by claiming a global click/keyboard/mouse tracker. Reimagined Search filters are words and choices the user types or picks on the map list, used only to answer the search. No health, financial or private-message feature is present. Local-only processing must still be disclosed.

Storage supports settings, local history, temporary caches and saved connection choices. unlimitedStorage supports the application's 25 MB local-history budget, Exodus saved pages and the pictures and videos of the user's own themes beyond the normal storage.local quota. A theme's picture can be a file of up to 8 MB and its video up to 20 MB (stored as a data: URL, about a third larger), for up to 24 Exodus and 12 Classic themes; a theme's media is removed when the theme is deleted. The theme editors also keep the user's last 6 uploads, each removable from that list. The popup's Data tab can save the settings and own themes of both looks to a file on the user's device and load such a file back; it holds no history and is never uploaded. Application retention remains bounded. Host permissions correspond to Rhythia pages, optional community history and its plain-text release notes. The official Rhythia API (`production.rhythia.com`) is called by the extension's scripts on rhythia.com pages the same way the page calls it, under its normal CORS rules, so it needs no host permission. scripting registers the scripts of the look the user chose (Classic or Exodus) on Rhythia pages, so each tab loads one look; it is used only on rhythia.com and only with files packaged in the extension.

## Permission justifications (Chrome Web Store)

| Permission | Justification |
| --- | --- |
| `storage` | Saves the user's settings, theme and look choice, local player history and cached data on the user's own device. |
| `unlimitedStorage` | Lets the optional local profile history, Exodus saved pages and the pictures and videos of the user's own themes (files up to 8 MB and 20 MB) grow beyond the default quota; the extension limits history to 25 MB, offers Clear history, removes a theme's media when the theme is deleted and keeps at most the last 6 uploads, each removable. |
| `scripting` | Registers and injects the extension's own packaged scripts and styles for the look the user chose (Classic or Exodus) on rhythia.com pages only; no remote code is loaded. |
| `https://www.rhythia.com/*`, `https://rhythia.com/*` | The pages the extension improves: it runs its packaged scripts and styles there and updates open Rhythia tabs when settings change. |
| `https://rhythia.shuriel.com/*` | The optional player-history service: player history, map types, Near your rank, Reimagined Search (a map search) and online release notes; used only after the user chooses online history, never in Local Only. Requests carry a random anonymous key for this installation, issued by the service, with no account, session or browser information in it. |

Single purpose: "Improves how Rhythia player profiles, scores and maps are displayed on rhythia.com, with local customization." Remote code: none; all JavaScript is packaged.

## Manual acceptance still required

Install the actual Chromium and Firefox packages (built with `node tools/build-release.js`). On a fresh Rhythia profile, verify the first connection choice, Local Only before any community request, online history with reports still off, separate report opt-in, mode cancellation, Clear history, SPA profile navigation and online/offline changelog. Then switch to Exodus with Rhythia tabs open, check that it appears without a reload, open a profile's Playstyle (the network log shows Range requests for map files), Clear saved pages, and switch back to Classic. Verify policy/terms links and distinguish an update preserving existing choices from a fresh installation.

New in 1.4.0: with online history, open a top-5,000 player's Scores in Exodus (for example https://www.rhythia.com/player/1542/scores) and check Near your rank; on https://www.rhythia.com/maps check Reimagined Search in both looks (Exodus' tab, Classic's panel under Explore maps) and that its note says it is Reimagined's own search of Ranked and Qualified maps. In Local Only, check that the same places show Turn on online history and that the network log has no request to rhythia.shuriel.com. In the popup's Data tab, save a backup file and load it back.
