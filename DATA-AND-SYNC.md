# Data and Sync — 1.3.1

For players: how the extension's history settings work, what it keeps on your device and how to clear it. This describes 1.3.1; copies in the stores may be on an earlier version.

## Choose a history mode

The popup calls the modes This device, Both and Community (Data tab, **Where history comes from**).

| Mode | History sources |
| --- | --- |
| **Both** (Cloud + Local) | Available community history and daily observations saved on this device. |
| **Community** (Cloud Only) | Community history; no new local captures. Previously saved local records remain stored. |
| **This device** (Local Only) | Local observations; no new community requests. History already downloaded from the service (Exodus' short rank histories, history inside Exodus saved pages, Classic's cached player histories) is removed; the saved pages themselves, own themes and other local data stay. |

A small card asks you to choose online history or keep it local. Community connections stay off until an online choice. Visit reports start off and can be enabled separately. Updates preserve explicit choices.

History requests send the public ID of the requested profile. On Exodus leaderboards one history request lists the public IDs of the players shown (up to 50). History requests also carry this installation's anonymous access key, which the service issues so it can serve full history and limit copying; This device removes it. Optional reports, sent only by Classic, send only the viewed player ID; neither sends your session or local history. Connections also expose an IP to receiving infrastructure. See [Privacy](PRIVACY.md).

The independent service collects public data itself. Changing extension settings does not stop that collection or erase its history. Its retention and requests belong in the [service notice](HISTORY-PRIVACY.md), rather than this browser-settings guide.

## Local limits and controls

Saved local profile history has a fixed **90-day window and 25 MB budget**. Cleanup happens while profiles are used, and at most once a day when the browser starts or the extension wakes up, even while the look that saved the data is not in use: that daily pass removes profile history not updated for 90 days and Exodus' saved Home page and leaderboard after 7 days. Oldest data can be removed sooner when the budget fills. Temporary caches use separate limits. After the service refuses a key request or answers badly, the extension keeps only the time until which it will not ask for a new key, with no account information, until the browser closes or you choose This device. Exodus saved pages keep up to 6 profiles and 40 pages for 7 days. Own themes keep their background picture (a file up to 8 MB) or video (up to 20 MB) on this device until you delete the theme.

- **Rank and stat history** (Features tab): while it is off, Classic saves no new local history. History already saved is not deleted; Clear history removes it.
- **Clear history** removes local history, cached community history, derived Playstyle history, Exodus saved pages and the list of recent profile visits after confirmation. It also removes the damaged history copies that Repair sets aside, which are kept until then. With Exodus, the Data tab also has a separate Clear for saved pages only, which keeps history. It preserves preferences, own themes, report cooldowns, official scores and independent server records. Later use can collect/download new data.
- **Reset settings** restores defaults (including the Classic look), turns off the active own theme in both looks (saved own themes are kept, but none is active, so the built-in Reimagined theme is used again), preserves connection/report choices and does not immediately erase history.
- **Remove the extension** clears extension storage. Clear Rhythia site data separately for site caches; this can sign you out.

Mode changes select the appropriate source and invalidate derived history. A temporary community failure can use a short-lived cache; a permanent missing response clears cached community history. Separate local observations can still exist.

Official ranking history supplied by Rhythia is independent of the community modes. Local Only blocks community connections, not the official game API.

## Updating

From 1.2.x, history and settings stay as they are and Classic stays the look until you choose Exodus.

### From 1.1.0

Supported history and settings are migrated. Themes, feature choices and explicit privacy choices are preserved. Obsolete backup configuration, protected-profile lists and custom history limits are removed. Previously exported files remain on your device. Version 1.2.0 has no backup export/import controls.

For server-history requests contact [privacy@shuriel.com](mailto:privacy@shuriel.com). See [Support](SUPPORT.md), [Terms](TERMS.md) and [Privacy](PRIVACY.md).
