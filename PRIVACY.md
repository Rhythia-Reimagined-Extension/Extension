# Privacy — Reimagined for Rhythia

Updated October 20, 2026. This notice describes Reimagined for Rhythia 1.3.0, with its Classic and Exodus looks. Copies available in extension stores may differ while the update is under review. This describes data handling, not a completed legal assessment or store approval.

Maintainer: **Shuriel** · [contact@shuriel.com](mailto:contact@shuriel.com)

Reimagined for Rhythia is an independent fan extension. This notice covers its browser features, data saved in your browser and connections. The independent player-history service has its own [privacy notice](HISTORY-PRIVACY.md). This notice does not cover other projects.

The extension has two looks. **Classic** adds its features to Rhythia's own pages. **Exodus** (experimental, off unless you choose it) shows its own pages built from Rhythia's data.

## How data is obtained

While you use Rhythia, the extension reads the displayed page (Classic) or builds its own pages (Exodus) and requests game profiles, scores and related resources to provide its features. It reads the existing game session from Rhythia's browser storage when an official game request needs it. It also records your extension settings, feature choices and local observations of public player statistics. You do not create a separate Reimagined account.

Local processing is still data handling even when nothing is sent to the maintainer. The extension handles Rhythia page content, player identifiers, authentication information and which profiles/resources you request. It does not monitor browsing on unrelated sites.

## Data used in your browser

| Data | Purpose |
| --- | --- |
| Public player ID, name, country and avatar | Identify profiles and players in comparisons. Country is game profile information, not device location. |
| Public scores, statistics, ranks, maps and artwork | Show score cards, history, progression, comparisons and playstyle summaries. |
| Existing Rhythia session and account responses, including friends | Load official game features and carry out actions you choose: pinning scores, and with Exodus editing your profile and settings, adding friends, setting your showcase and editing your collections. |
| Map files (Exodus) | Read only the notes part of the maps in your plays, to tell whether a map is mostly streams, jumps, varied or quantum. Only that type and a few numbers per map are kept. |
| Saved copies of pages (Exodus) | Open recently visited profiles and pages at once. While you are signed in, they can include your own profile as Rhythia returns it. |
| Settings and saved feature state | Remember themes, enabled features, views and history choices. |
| Local history and temporary caches | Keep daily observations and avoid repeat downloads. |
| Recent connection results | Diagnose history problems; the latest 30 entries can include viewed player ID/name, time, delay and result. |

The extension does not read general browser history or unrelated websites. It does not ask for passwords, payment information, private messages, camera, microphone or screen access. It does not sell data, add advertising trackers or upload local history, scores, friends or preferences to the maintainer.

Your existing game session is used only with the official API at `production.rhythia.com`. It is not copied into extension storage or sent to the community service or Discord.

If you enable debug logging, warnings and errors can also appear in your browser's developer console. These logs are not automatically uploaded. Review anything you choose to send with a support request and remove unrelated personal information.

## Connections and your choice

Official Rhythia requests support game features. Images, artwork, map files, requested replays and the Exodus Home background video can connect to resource hosts supplied by the game.

Community connections to `rhythia.shuriel.com` stay off until you choose online history. A history request includes the public ID of the profile you want to see; on Exodus leaderboards one request lists the public IDs of the players shown (up to 50). This reveals the requested profiles even with reports off. With online history chosen, the extension also downloads its release notes from the same service; that request carries no player ID, game session or local history.

**Profile visit reports** are a separate choice, start off and are sent only by Classic. Each report contains only the viewed public player ID. They help discover public profiles for collection, without sending your own game account as the visitor. Connections also expose an IP address to the service and its providers. See the [service notice](HISTORY-PRIVACY.md) for its handling.

**Local Only** ("This device" in the popup) stops new community requests, reports, connection checks and online release notes; the changelog then shows the copy packaged with the extension. Official game features can still use the network. New community requests stop as soon as the choice changes; information already sent cannot be recalled.

The connection choice is a control for this extension. It does not authorize collection on behalf of every player, or stop the independent service from obtaining public game data.

## Who receives data

| Recipient | What is sent and why |
| --- | --- |
| Rhythia's official API | Requested player IDs, the existing game session where needed, and actions such as pinning a score that you choose. Rhythia receives the connection information needed to serve these requests. |
| Resource hosts provided by Rhythia | Requests for images, artwork, map files, replays and the Home video used by the features, plus normal connection information. Their addresses come from the game's resources. |
| The independent history-service operator, OVHcloud and Cloudflare | With online history enabled: the requested public player ID and connection information, including IP address. With the separate visit-report choice enabled: a report containing the viewed public player ID. With online history enabled, release-note requests also reach the service, without any player ID. The service notice explains storage, safeguards, public history and its other providers. |
| The maintainer and email providers | Contact information, messages and attachments that you choose to email for support or privacy requests. These are not automatically collected from your browser. |

The extension does not automatically send messages to Discord or publish your settings, friends list or local history. Public player history offered by the independent service comes from its own collection of game data, not an upload of your local history. When you open an external link, that website handles the resulting visit under its own practices.

Official API, community API and release-note requests use HTTPS. The extension does not add its own encryption to browser storage; the storage and clearing controls below describe its actual behaviour.

## Storage and clearing data

Preferences and local history are saved in your browser. Some preferences and map caches are saved with Rhythia's site data, separately from the extension's own data. Exodus keeps its look and chosen pages, map details (30 days, at most 1,000 maps), achievements (7 days), the map types it worked out (up to a year, at most 800 maps) and request counters there. Some temporary information is kept only while the browser is running. The extension does not sync these records through Chrome Storage Sync or encrypt them separately; your browser and device controls protect them.

Saved settings remain until you change or reset them or remove the relevant browser data. The latest 30 saved connection results have a count limit rather than a fixed day-based expiry. The maintainer cannot remotely read or erase your extension storage; information you email and the service's independently collected records are separate.

Local profile history covers up to **90 days** and uses at most **25 MB**. Older records are cleared while profiles are used and can disappear sooner if the available space fills. Other temporary copies have their own expiry and storage limits; the 90-day period does not cover every browser cache. Exodus saved pages are separate: up to 6 profiles and 40 pages for 7 days, and short rank histories of up to 1,500 players for 3 days.

**Clear history** removes saved local history, downloaded community history, the history used for Playstyle summaries and Exodus saved pages after confirmation. It does not remove data kept with Rhythia's site data. It keeps preferences and the waiting periods between visit reports. It does not remove official game scores or the independent service's records. Open profiles refresh their history display; later use can save or download new data.

Changing a mode keeps saved local records but changes which sources are used. **Reset settings** preserves connection/report choices, switches the look back to Classic and does not itself erase history. Removing the extension clears its extension storage. Clear Rhythia site data separately to remove site caches; this can sign you out.

## Contact and separate records

Email [contact@shuriel.com](mailto:contact@shuriel.com) for questions. New project correspondence is handled through OVHcloud email. Earlier messages can remain in the former Gmail account during the transition. Generic new-mail alerts may be sent to the operator's own Gmail accounts without the original message's sender, subject, contents or attachments. Do not send passwords, sessions, recovery codes or identity documents.

Requests about independent player history, removal or exclusion are covered by the [history-service notice](HISTORY-PRIVACY.md#requests-and-contact). Official account changes belong to Rhythia; the extension cannot change the game's records or remotely erase other users' browser copies.

Use of extension data is limited to the described features, related support, security and applicable legal requirements, in line with the Chrome Web Store's Limited Use requirements. This does not mean the store has approved this notice. Requested browser permissions also support features that work locally; they do not mean your session is sent to the maintainer.

Material changes are described in the [changelog](changelog.md). See [Data and Sync](DATA-AND-SYNC.md) for controls and [Terms](TERMS.md) for project use.
