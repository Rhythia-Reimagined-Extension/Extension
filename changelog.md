# Changelog

All notable user-facing changes are documented in this file.

---
version: 1.2.0
date: 2026-10-01
title: Going Online
listed: yes
---

## 1.2.0 - Going Online - 2026-10-01

## Featured

- Back in business: Adapted profiles, stats, score cards, Friends, themes, and session handling to Rhythia's updated website. Finally...
- Going online: Added a connection to my community history server. Instead of relying only on records collected in your own browser, you can also load available ranking history for the top 1,000 players and additional discovered profiles.
- Reimagined Score Cards: Replaced the Modern/Legacy card choices with three new designs and optional background artwork. Rebuilt the profile score browser with search and numbered pages at the top and bottom. Pick your favorite look, then actually find the score you're looking for.
- Reimagined Playstyle: Replaced the separate Rating and Tempo profiles with a Playstyle view: a player summary, standout plays, and speed and accuracy-grade breakdowns with score counts.
- Reimagined Title Progression: Rebuilt the progression view with a map-like layout and title milestones. More fun to look at, more Reimagined...
- Reimagined Compare: Rebuilt the comparison view with clearer stat differences and a layout for 2 players. The previous version allowed 4.
- Reimagined Popup: Replaced the old popup with a simpler layout and reorganized settings. Again... Hopefully this one gets to stay for a while.

## Added

- Added three history source choices for the new server connection: Cloud Only, Cloud + Local, and Local Only.
- Added an online-history setup card and separate controls for using community history and reporting profile visits. Connections start after your choice; visit reporting requires a separate opt-in.
- Added a connection log in the popup for the new history server: viewed profile, request status, and response time. It shows whether that profile's online history loaded, is missing from the server, or could not be reached.
- Added date-format settings: YYYY-MM-DD, MM-DD-YYYY, and DD-MM-YYYY for score cards and history views.

## Improved

- Expanded the existing Rhythia API integration to load profile details, pinned scores, and more score collections. Added shared caching and request deduplication to avoid fetching the same data repeatedly.
- Reworked profile navigation and loading to reduce flickering and unnecessary rebuilds, and to keep late responses and cached records attached to the correct player.
- Reworked White theme contrast, colors, and readability across cards and pages. White theme needed some love too.
- Polished transitions and glowing accents in Dark and Reimagined themes.
- Improved player and mapper name detection, including profile details fetched for Compare.

## Changed

- Reduced the Compare limit from 4 players to 2.
- Replaced configurable local-history retention and storage limits with fixed limits of 90 days and 25 MB. The previous default storage limit was 300 MB.
- Reorganized profile statistics into dedicated history, ranking, and Playstyle views.

## Fixed

- Updated profile detection and RP/rank extraction for Rhythia's changed page layout.
- Restored profile statistics, score-card enhancements, and Friends controls for the updated website.
- Updated authentication handling for Rhythia's changed login system.

## Removed

- Removed the old backup, restore, and JSON import/export tools. Files you already exported stay where you saved them.
- Removed the protected-profile list and its cleanup exceptions, including protection of your own profile.
- Removed the separate saved Title Progression state used by the old progression view.

## Notes

- Online History & Accuracy: Going online came with a few compromises. The new server history covers ranking and RP; online accuracy history isn't ready for 1.2.0 yet. Your local accuracy history still works. I'm working on the online part, but I didn't want to keep the whole update waiting for it. Yet... is the important word here.
- Why only 2 players in Compare? I think 2 is enough to keep the comparison useful and readable. But I'm open to suggestions if you have a reason to compare more.
- A little Playstyle backstory: The old Rating and Tempo profiles weren't telling you as much as I wanted. I almost removed them... Then it struck me: why don't we make them actually useful? So they grew into Playstyle instead.
- And yes, the popup got remade again: The previous versions were either too complicated, hard to read, or just didn't feel right for the extension. We'll see how long this one lasts...
- Community history depends on the records available on the server. Opting into visit reports helps the server discover additional profiles; it doesn't guarantee history for every visited player.
- Updates keep valid local history and privacy choices. Older local history can be cleaned up under the new limits. Clear Cache asks before removing all local profile history and cached online history.
- Local Only disables all outgoing requests to rhythia.shuriel.com.

---
version: 1.1.0
date: 2026-08-21
title: UI Polish & Stability
listed: yes
---

## 1.1.0 - UI Polish & Stability - 2026-08-21

## Featured

- Redesigned the Title Progression bar with smoother animations.
- Reworked profile score cards to be more compact, added a scaled accuracy bar, and added an option to keep using the classic layout.
- Cleaned up unused scripts and old styles to make pages load faster.
- Updated the extension icons.

## Added

- Added an option in popup settings to switch between compact score cards and the classic layout.
- Added smooth transitions when switching tabs between Reigning, Top, and Recent scores.
- Added a toggle in popup settings to turn off Easter eggs if you don't want them.
- The in-page Changelog now pulls update notes directly from GitHub so they're always current.

## Improved

- Stat history on profiles now shows the last 7 entries with a "Show more" button so it doesn't stretch the page.
- Switching themes is now instant without page stutter.
- Improved spacing and number formatting in stats history.
- Polished Rating and Tempo Profile cards with better contrast and layout.
- You can now press Escape to close popups and modals.

## Changed

- Clearer highlights on active score collection tabs.
- Advanced Stats now uses the new card layout for Rating and Tempo profiles by default.
- Removed unnecessary browser permissions.

## Fixed

- Fixed broken numbers and calculations caused by commas and thousand separators.
- Fixed green/red change colors (+/-) in stat history looking wrong on certain themes.
- Fixed contrast and readability issues on White and Reimagined themes.
- Fixed daily stat history skipping entries when days roll over at midnight.
- Fixed Title Progression rank not loading on some profiles.
- Fixed score cards breaking after recent Rhythia website updates.
- Fixed score filters (grade/speed) resetting when loading more scores or switching tabs.
- Fixed backup files not restoring saved settings.
- Fixed profile and friends list sometimes failing to load on first visit.

## Removed

- Removed old tools from the `/scores` page since Rhythia no longer links to it from profiles (theme styling is still kept if you visit it directly).
- Removed the old external catalog integration as it was barely used and slowed down navigation.
- Removed the extension badge in the bottom-right corner to keep the screen clean.
- Removed the old changelog timeline bar for a simpler layout.
- Removed unused background scripts and old CSS files.

## Notes

- Behind the scenes, the project was reorganized, cleaned up, and moved to the new GitHub organization.
- Your saved settings and profile history won't be lost with this update.
- The extension source code is open at [GitHub Extension Repository](https://github.com/Rhythia-Reimagined-Extension/Extension).

---
version: 1.0.1
date: 2026-08-09
title: Release Fixes
listed: yes
---

## 1.0.1 - Release Fixes - 2026-08-09

## Fixed

- Watch Replay and Download Replay work reliably again from score cards.
- Score cards no longer show controls that do not apply to the current score.
- Profile history and Title Progression now stay in sync after profile updates.
- Score cards and statistics panels open, close, and resize correctly.
- The home promo video now fills the available space across all themes.
- The changelog and About page now keep their layout and colors consistent across themes.
- Player Compare no longer shows an empty panel during profile loading.
- Score-tab transitions between Reigning, Top, and Recent Scores now animate correctly without briefly showing unstyled cards.

## Changed

- Related statistics panels now use the same compact layout and start collapsed.
- Score-card arrows, headings, and contrast are easier to read.
- The extension requests less browser access while profile and friend features continue to work normally.
- Changelog categories now have clear visual icons.
- About links are grouped into Extension & Feedback and Community & Project sections.
- The current extension version is shown once in the popup instead of being repeated in About.
- Privacy is now linked from the popup footer.
- Country flags show full country names and direct leaderboard links.
- In Player Compare, Clear removes all selected players without closing the panel. Use × to close it.

## Notes

- This is a focused post-release update for score cards, profiles, progression, and Player Compare. Saved profile data and settings remain unchanged.
- The official [Chrome Web Store listing](https://chromewebstore.google.com/detail/rhythia-reimagined/ekjfnmfocjohkiieakohbnagjcdbfolb) is now available for installation.

---
version: 1.0.0
date: 2026-08-06
title: Initial release
listed: yes
---

## 1.0.0 - Initial release - 2026-08-06

## Added

- Added a customizable popup where features, themes, and display preferences can be managed in one place.
- Added Reimagined, Dark, and White themes.
- Added a richer profile overview with progression, performance trends, ranking history, and daily history.
- Added clearer score cards with the details that matter at a glance, including accuracy, mods, notes, RP, misses, dates, and replay actions.
- Added tools for searching, sorting, comparing, copying, and exporting scores.
- Added player comparison and extra map and performance insights.
- Added local history management, profile protection, backups, restore, and offline data import and export.
- Added the Reimagined changelog with release navigation and grouped release notes.

## Changed

- Reworked profile and score pages to make important information easier to scan, with collapsible sections and flexible layouts.

## Fixed

- This was the first release, so no earlier user-facing issues were included here.

## Notes

- The first release of Rhythia Reimagined. The main features can be enabled or disabled from the extension popup, so the experience can stay as focused or as feature-rich as you prefer.
- See [Installation](INSTALLATION.md) and [Data and Sync](DATA-AND-SYNC.md) for current usage information. This 1.0.0 entry describes backup features available at that release.
