# Data and Sync — 1.3.0

These instructions describe the prepared source changes. Installed/store packages may use an earlier revision.

## Choose a history mode

The popup calls the modes This device, Both and Community (Data tab, **Where history comes from**).

| Mode | History sources |
| --- | --- |
| **Cloud + Local** (Both) | Available community history and daily observations saved on this device. |
| **Cloud Only** (Community) | Community history; no new local captures. Previously saved local records remain stored. |
| **Local Only** (This device) | Local observations; no new community requests. |

A small card asks you to choose online history or keep it local. Community connections stay off until an online choice. Visit reports start off and can be enabled separately. Updates preserve explicit choices.

History requests send the public ID of the requested profile. On Exodus leaderboards one history request lists the public IDs of the players shown (up to 50). Optional reports, sent only by Classic, send only the viewed player ID; neither sends your session or local history. Connections also expose an IP to receiving infrastructure. See [Privacy](PRIVACY.md).

The independent service collects public data itself. Changing extension settings does not stop that collection or erase its history. Its retention and requests belong in the [service notice](HISTORY-PRIVACY.md), rather than this browser-settings guide.

## Local limits and controls

Saved local profile history has a fixed **90-day window and 25 MB budget**. Cleanup happens while profiles are used, without a background schedule. Oldest data can be removed sooner when the budget fills. Temporary caches use separate limits. Exodus saved pages keep up to 6 profiles and 40 pages for 7 days.

- **Clear history** removes local history, cached community history, derived Playstyle history and Exodus saved pages after confirmation. With Exodus, the Data tab also has a separate Clear for saved pages only, which keeps history. It preserves preferences, report cooldowns, official scores and independent server records. Later use can collect/download new data.
- **Reset settings** restores defaults (including the Classic look), preserves connection/report choices and does not immediately erase history.
- **Remove the extension** clears extension storage. Clear Rhythia site data separately for site caches; this can sign you out.

Mode changes select the appropriate source and invalidate derived history. A temporary community failure can use a short-lived cache; a permanent missing response clears cached community history. Separate local observations can still exist.

Official ranking history supplied by Rhythia is independent of the community modes. Local Only blocks community connections, not the official game API.

## Updating

From 1.2.x, history and settings stay as they are and Classic stays the look until you choose Exodus.

### From 1.1.0

Supported history and settings are migrated. Themes, feature choices and explicit privacy choices are preserved. Obsolete backup configuration, protected-profile lists and custom history limits are removed. Previously exported files remain on your device. Version 1.2.0 has no backup export/import controls.

For server-history requests contact [privacy@shuriel.com](mailto:privacy@shuriel.com). See [Support](SUPPORT.md), [Terms](TERMS.md) and [Privacy](PRIVACY.md).
