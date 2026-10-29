# Privacy — Reimagined for Rhythia

Updated October 29, 2026. This notice describes Reimagined for Rhythia 1.4.0, with its Classic and Exodus looks. Copies available in extension stores may differ while the update is under review. This describes data handling, not a completed legal assessment or store approval.

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
| Existing Rhythia session and account responses, including friends | Load official game features and carry out actions you choose: pinning scores, and with Exodus editing your profile and settings, adding and removing friends, setting your showcase, wearing items and using a Name Change, creating and editing collections, inviting players to or leaving a clan, reading notifications and answering clan invites, reporting a player with a reason and note you choose, posting map comments you write, deleting skins you shared, and, for Team Ranked members, qualifying or vetoing a map. These are sent to Rhythia as if made on rhythia.com. |
| Map files (Exodus) | Read only the notes part of the maps in your plays, to tell whether a map is mostly jumps, streams, techs or varied, and whether it has quantum parts. Only that type and a few numbers per map are kept. |
| Saved copies of pages (Exodus) | Open recently visited profiles and pages at once. While you are signed in, they can include your own profile as Rhythia returns it. |
| Settings and saved feature state | Remember themes, enabled features, views and history choices. |
| Own themes | Remember the themes you make, including a background picture or GIF (a file up to 8 MB) or video (up to 20 MB) you choose. A theme and its background stay on this device until you delete the theme. The theme editors also keep your last 6 uploads on this device so you can use one again; each stays until you remove it from that list. |
| Local history and temporary caches | Keep daily observations and avoid repeat downloads. Classic saves new observations only while Rank and stat history is on. |
| Recent connection results | Diagnose history problems; the latest 30 entries can include viewed player ID/name, time, delay and result. |
| Anonymous access key for the history service | With online history chosen: lets the history service serve full history to this installation and limit automated copying. The service issues a random key with no game account, session or browser information in it. It is kept in extension storage, used only by the extension's background (never by Rhythia's pages), renewed about every 20 days and removed when you choose This device. |
| Waiting time for a new access key | After the history service refuses a key request or answers badly, remember until when not to ask again. Only that time is kept, with no account information; it is cleared when the browser closes and when you choose This device. |

The extension does not read general browser history or unrelated websites. It does not ask for passwords, payment information, private messages, camera, microphone or screen access. It does not sell data, add advertising trackers or upload local history, scores, friends or preferences to the maintainer.

Your existing game session is used only with the official API at `production.rhythia.com`. It is not copied into extension storage or sent to the community service or Discord.

## Connections and your choice

Official Rhythia requests support game features. Images, artwork, map files, requested replays and the Exodus Home background video can connect to resource hosts supplied by the game. In Exodus, a picture in a player's About me loads from the site that player linked.

Community connections to `rhythia.shuriel.com` stay off until you choose online history. A history request includes the public ID of the profile you want to see; on Exodus leaderboards one request lists the public IDs of the players shown (up to 50). History requests also carry this installation's anonymous access key; the first one asks the service for it. Near Your Rank on Exodus Scores asks the same way, with the viewed player's public ID and game mode. This reveals the requested profiles even with reports off. With online history chosen, the extension also downloads its release notes from the same service; that request carries no player ID, game session or local history. With online history, both looks also ask the service how the maps on a page play (Exodus: Playstyle, Scores, Compare and the map list; Classic: Playstyle): such a request lists up to 100 map identifiers and carries the access key. In Exodus Playstyle, Scores and Compare, maps the service does not know are still read from Rhythia by your browser; Classic and the map list leave them without a type. Reimagined Search on the map list (a tab in Exodus, a panel in Classic) sends the search's filters (statuses, types, quantum, stars, length, mapper and title words, whether explicit maps are included, order and its direction, and page) with the access key. The service uses them only to answer: they are not written to its database or logs, the same search is answered from its memory for up to 5 minutes, and a short code of each result page stays in its memory until the UTC day ends, to count the key's limit.

**Profile visit reports** are a separate choice, start off and are sent only by Classic. Each report contains only the viewed public player ID. They help discover public profiles for collection, without sending your own game account as the visitor. Connections also expose an IP address to the service and its providers. See the [service notice](HISTORY-PRIVACY.md) for its handling.

**Local Only** ("This device" in the popup) stops new community requests, reports and online release notes; the changelog then shows the copy packaged with the extension. It also removes history already downloaded from the service: Exodus' short rank histories, the history inside Exodus saved pages and Classic's cached player histories. The saved pages themselves, own themes and other local data stay. Official game features can still use the network. New community requests stop as soon as the choice changes; information already sent cannot be recalled.

The connection choice is a control for this extension. It does not authorize collection on behalf of every player, or stop the independent service from obtaining public game data.

## Who receives data

| Recipient | What is sent and why |
| --- | --- |
| Rhythia's official API | Requested player IDs, the existing game session where needed, and actions such as pinning a score that you choose. Rhythia receives the connection information needed to serve these requests. |
| Resource hosts provided by Rhythia | Requests for images, artwork, map files, replays and the Home video used by the features, plus normal connection information. Their addresses come from the game's resources. |
| Sites linked in players' About me (Exodus) | When you view a profile whose About me shows a picture, your browser requests it from the site the player linked, with normal connection information. |
| The independent history-service operator, OVHcloud and Cloudflare | With online history enabled: the requested public player ID, map identifiers when asking for map types, Reimagined Search filters, the anonymous access key and connection information, including IP address. With the separate visit-report choice enabled: a report containing the viewed public player ID. With online history enabled, release-note requests also reach the service, without any player ID. The service notice explains storage, safeguards, public history and its other providers. |
| The maintainer and email providers | Contact information, messages and attachments that you choose to email for support or privacy requests. These are not automatically collected from your browser. |

The extension does not automatically send messages to Discord or publish your settings, friends list or local history. Public player history offered by the independent service comes from its own collection of game data, not an upload of your local history. When you open an external link, that website handles the resulting visit under its own practices.

Official API, community API and release-note requests use HTTPS. The extension does not add its own encryption to browser storage; the storage and clearing controls below describe its actual behaviour.

## Storage and clearing data

Preferences and local history are saved in your browser. Some preferences and map caches are saved with Rhythia's site data, separately from the extension's own data. Exodus keeps its look and chosen pages, map details (30 days, at most 1,000 maps), achievements (7 days), the map types it worked out or received from the history service (up to a year, at most 800 maps), the last 5 players, maps and clans you opened from its search (until you clear them there) and request counters there. Classic keeps the last 5 players, maps and clans you opened from Rhythia's own search there too, until you clear them in that search. Some temporary information is kept only while the browser is running. The extension does not sync these records through Chrome Storage Sync or encrypt them separately; your browser and device controls protect them.

Saved settings remain until you change or reset them or remove the relevant browser data. A backup from the popup's Data tab is a file saved on your device with your settings and own themes; it is not uploaded anywhere. The latest 30 saved connection results have a count limit rather than a fixed day-based expiry. The maintainer cannot remotely read or erase your extension storage; information you email and the service's independently collected records are separate.

Local profile history covers up to **90 days** and uses at most **25 MB**. Older records are cleared while profiles are used and can disappear sooner if the available space fills. At most once a day, when the browser starts or the extension wakes up, the extension also removes profile history not updated for 90 days and Exodus' saved Home page and leaderboard after 7 days, even while the look that saved them is not in use. Other temporary copies have their own expiry and storage limits; the 90-day period does not cover every browser cache. Exodus saved pages are separate: up to 6 profiles and 40 pages for 7 days, and short rank histories of up to 1,500 players for 3 days.

**Clear history** removes saved local history, downloaded community history, the history used for Playstyle summaries, Exodus saved pages and the list of recent profile visits after confirmation. It also removes the damaged copies of saved history that Repair set aside; those stay on the device until Clear history. It does not remove data kept with Rhythia's site data. It keeps preferences, own themes, the waiting periods between visit reports and the access key. It does not remove official game scores or the independent service's records. Open profiles refresh their history display; later use can save or download new data.

Changing a mode keeps saved local records but changes which sources are used; This device also removes downloaded history, as described above. **Reset settings** preserves connection/report choices, switches the look back to Classic, turns off the active own theme in both looks (saved own themes are kept, but none is active, so the built-in Reimagined theme is used again) and does not itself erase history. Removing the extension clears its extension storage. Clear Rhythia site data separately to remove site caches; this can sign you out.

## Contact and separate records

Email [contact@shuriel.com](mailto:contact@shuriel.com) for questions. New project correspondence is handled through OVHcloud email. Earlier messages can remain in the former Gmail account during the transition. Generic new-mail alerts may be sent to the operator's own Gmail accounts without the original message's sender, subject, contents or attachments. Do not send passwords, sessions, recovery codes or identity documents.

Requests about independent player history, removal or exclusion are covered by the [history-service notice](HISTORY-PRIVACY.md#requests-and-contact). Official account changes belong to Rhythia; the extension cannot change the game's records or remotely erase other users' browser copies.

Use of extension data is limited to the described features, related support, security and applicable legal requirements, in line with the Chrome Web Store's Limited Use requirements. This does not mean the store has approved this notice. Requested browser permissions also support features that work locally; they do not mean your session is sent to the maintainer.

Material changes are described in the [changelog](changelog.md). See [Data and Sync](DATA-AND-SYNC.md) for controls and [Terms](TERMS.md) for project use.
