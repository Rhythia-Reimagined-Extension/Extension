# Changelog

All notable user-facing changes are documented in this file.

---
version: 1.1.0
date: 2026-08-15
title: UI Modernization & Cleanup
listed: yes
---

## 1.1.0 - UI Modernization & Cleanup - 2026-08-15

## Featured

- Redesigned the Title Progression bar with a modern look and smooth animations.
- Modernized profile score cards with a compact layout, scaled accuracy bar, and a classic view toggle.
- Cleaned and streamlined extension architecture and assets for improved stability and performance.

## Added

- Added an option in popup settings to switch between modern compact score cards and the classic layout.
- Added smooth transition animations when switching between score collections (Reigning, Top, Recent).
- Improved how the Changelog page works and made it update online directly from GitHub instead of offline.

## Improved

- Refreshed Rating Profile and Tempo Profile cards with modern styling and smoother animations.
- Polished profile stats history layout for better readability and spacing.
- Clarified history settings in the popup with clearer guidance.
- Optimized Easter egg handling.

## Changed

- Refined profile score tab buttons with clearer active highlights.
- Advanced Stats now uses Profile Surface as the default layout for Rating Profile and Tempo Profile cards.

## Fixed

- Fixed Title Progression rank tracking not always loading properly on certain profiles.
- Fixed score cards layout compatibility with recent Rhythia site updates.

## Removed

- Removed obsolete score tools and features from the `/scores` page since Rhythia removed direct links to it from player profiles, but full theme styling is still preserved if visited directly.
- Removed legacy Streamslop catalog integration as it didn't provide any meaningful use and slowed down navigation.
- Removed the Rhythia Reimagined badge from the bottom-right corner to keep the interface clean and unobtrusive.
- Removed the old changelog timeline bar for a simpler layout.

## Notes

- Behind the scenes, project files have been reorganized, cleaned up, and moved under the new GitHub organization.
- The full extension source code is now publicly available at [GitHub Extension Repository](https://github.com/Rhythia-Reimagined-Extension/Extension).
- These foundational cleanups will make future updates much easier while improving overall performance and existing features.

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
