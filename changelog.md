# Changelog

All notable user-facing changes are documented in this file.

---
version: 1.1.0
date: 2026-08-24
title: UI Polish & Stability
listed: yes
---

## 1.1.0 - UI Polish & Stability - 2026-08-24

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
- Removed the old Streamslop catalog integration as it was barely used and slowed down navigation.
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
- See [Installation](INSTALLATION.md) and [Data and Backups](DATA-AND-BACKUPS.md) for usage information.
