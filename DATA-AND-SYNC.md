# Data and Sync — 1.2.0

Open the extension popup to choose how player history is saved and displayed.

## Choose a history mode

| Mode | What you get |
| --- | --- |
| **Cloud + Local** | Community ranking history and new daily records saved on this device. |
| **Cloud Only** | Community ranking history, without saving new local history. Existing local records are kept. |
| **Local Only** | History saved on this device, with no connection to the community service. |

A small card appears in the corner of Rhythia until you choose **Use online history** or **Keep it local**. Online history combines cloud and local records. Profile visit reports are off after this choice and can be enabled separately in the popup. Community connections stay off until you choose. Your existing explicit settings are preserved during an update.

**Profile visit reports** tell the community service which public player you visited, helping it keep that player's public history up to date. You can switch reports off and still use cloud history. Your connection IP reaches the service; your Rhythia password and session do not. See [Privacy](PRIVACY.md) for details.

The extension does not upload scores, friends, preferences, or local snapshots to the community database. A separate crawler obtains public player statistics from Rhythia's official API and runs independently of extension users. Online history requests include the requested public player ID; optional visit-report bodies contain only `playerId`. The server uses the connection IP for rate limits and a keyed IP-plus-profile digest for visit deduplication, without storing raw IPs in telemetry tables.

## Local history limits

Local profile records use a fixed **90-day window** (today and the previous 89 local dates) and **25 MB budget**. There are no retention controls or protected profiles. Cleanup runs while profiles are used; older history may be removed sooner when the budget fills. Other temporary caches use separate limits.

Community player history has **no automatic expiry**. It is separate from the records saved in your browser.

## Updating from 1.1.0

The update automatically migrates supported player history and settings. Themes, feature choices and existing privacy choices are preserved. Legacy protected-profile lists and custom retention/storage limits are removed. This also applies to unreleased 1.2.0 development builds. Valid history is migrated first; history exceeding the fixed limits may be removed during use. Old backup settings and obsolete feature state are removed. Backup files you previously exported are left alone; 1.2.0 no longer has backup export or import controls.

## Clear saved records

- **Clear Cache** removes all local profile history and cached community history after confirmation, keeping preferences, reporting cooldowns, official scores and server history. Cached data may be downloaded again.
- **Reset Settings** restores appearance and data defaults without immediately deleting history. It keeps your community connection and reporting choices. Later cleanup follows the restored retention and storage limits.
- **Remove the extension** to clear its extension settings and storage. Rhythia site caches are separate; clearing site data in your browser can also sign you out of the game.

Switching modes or turning reports off does not delete community records or stop the service's independent collection of public leaderboard history. For deletion or to request that collection stops for your player profile, contact [shurieldev@gmail.com](mailto:shurieldev@gmail.com).

Profile reports count once per IP and viewed profile per rolling hour. Leaving a tab open does not periodically add visits. Daily visit counts cover 30 UTC dates; last-visit observations expire after 30 days. No separate extension-activity reporting is used.
