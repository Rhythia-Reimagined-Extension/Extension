# Data and Sync — 1.2.1

These instructions describe the prepared source changes. Installed/store packages may use an earlier revision.

## Choose a history mode

| Mode | History sources |
| --- | --- |
| **Cloud + Local** | Available community history and daily observations saved on this device. |
| **Cloud Only** | Community history; no new local captures. Previously saved local records remain stored. |
| **Local Only** | Local observations; no new community requests. |

A small card asks you to choose online history or keep it local. Community connections stay off until an online choice. Visit reports start off and can be enabled separately. Updates preserve explicit choices.

History requests send the public ID of the requested profile. Optional reports send only the viewed player ID; neither sends your session or local history. Connections also expose an IP to receiving infrastructure. See [Privacy](PRIVACY.md).

The independent service collects public data itself. Changing extension settings does not stop that collection or erase its history. Its retention and requests belong in the [service notice](HISTORY-PRIVACY.md), rather than this browser-settings guide.

## Local limits and controls

Saved local profile history has a fixed **90-day window and 25 MB budget**. Cleanup happens while profiles are used, without a background schedule. Oldest data can be removed sooner when the budget fills. Temporary caches use separate limits.

- **Clear Cache** removes local history, cached community history and derived Playstyle history after confirmation. It preserves preferences, report cooldowns, official scores and independent server records. Later use can collect/download new data.
- **Reset Settings** restores defaults, preserves connection/report choices and does not immediately erase history.
- **Remove the extension** clears extension storage. Clear Rhythia site data separately for site caches; this can sign you out.

Mode changes select the appropriate source and invalidate derived history. A temporary community failure can use a short-lived cache; a permanent missing response clears cached community history. Separate local observations can still exist.

Official ranking history supplied by Rhythia is independent of the community modes. Local Only blocks community connections, not the official game API.

## Updating from 1.1.0

Supported history and settings are migrated. Themes, feature choices and explicit privacy choices are preserved. Obsolete backup configuration, protected-profile lists and custom history limits are removed. Previously exported files remain on your device. Version 1.2.0 has no backup export/import controls.

For server-history requests contact [shurieldev@gmail.com](mailto:shurieldev@gmail.com). See [Support](SUPPORT.md), [Terms](TERMS.md) and [Privacy](PRIVACY.md).
