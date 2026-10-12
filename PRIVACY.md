# Privacy — Rhythia Reimagined

Updated October 12, 2026. This notice describes Rhythia Reimagined 1.2.1. Copies available in extension stores may differ while the update is under review. This describes data handling, not a completed legal assessment or store approval.

Maintainer: **Shuriel** · [shurieldev@gmail.com](mailto:shurieldev@gmail.com)

Rhythia Reimagined is an independent fan extension. This notice covers its browser features, data saved in your browser and connections. The independent player-history service has its own [privacy notice](HISTORY-PRIVACY.md). This notice does not cover other projects.

## How data is obtained

While you use Rhythia, the extension reads the displayed page and requests game profiles, scores and related resources to provide its features. It reads the existing game session from Rhythia's browser storage when an official game request needs it. It also records your extension settings, feature choices and local observations of public player statistics. You do not create a separate Reimagined account.

Local processing is still data handling even when nothing is sent to the maintainer. The extension handles Rhythia page content, player identifiers, authentication information and which profiles/resources you request. It does not monitor browsing on unrelated sites.

## Data used in your browser

| Data | Purpose |
| --- | --- |
| Public player ID, name, country and avatar | Identify profiles and players in comparisons. Country is game profile information, not device location. |
| Public scores, statistics, ranks, maps and artwork | Show score cards, history, progression, comparisons and playstyle summaries. |
| Existing Rhythia session and account responses, including friends | Load official game features and carry out score-pinning actions you choose. |
| Settings and saved feature state | Remember themes, enabled features, views and history choices. |
| Local history and temporary caches | Keep daily observations and avoid repeat downloads. |
| Recent connection results | Diagnose history problems; the latest 30 entries can include viewed player ID/name, time, delay and result. |

The extension does not read general browser history or unrelated websites. It does not ask for passwords, payment information, private messages, camera, microphone or screen access. It does not sell data, add advertising trackers or upload local history, scores, friends or preferences to the maintainer.

Your existing game session is used only with the official API at `production.rhythia.com`. It is not copied into extension storage or sent to the community service, GitHub or Discord.

If you enable debug logging, warnings and errors can also appear in your browser's developer console. These logs are not automatically uploaded. Review anything you choose to send with a support request and remove unrelated personal information.

## Connections and your choice

Official Rhythia requests support game features. Images, artwork and requested replays can connect to resource hosts supplied by the game. GitHub receives normal connection information when release notes are downloaded; no game session or local history is attached.

Community connections to `rhythia.shuriel.com` stay off until you choose online history. A history request includes the public ID of the profile you want to see. This reveals the requested profile even with reports off.

**Profile visit reports** are a separate choice and start off. Each report contains only the viewed public player ID. They help discover public profiles for collection, without sending your own game account as the visitor. Connections also expose an IP address to the service and its providers. See the [service notice](HISTORY-PRIVACY.md) for its handling.

**Local Only** stops new community requests, reports and connection checks. Official game features and GitHub release notes can still use the network. Pending community requests are cancelled when connection/reporting choices change; information already sent cannot be recalled.

The connection choice is a control for this extension. It does not authorize collection on behalf of every player, or stop the independent service from obtaining public game data.

## Who receives data

| Recipient | What is sent and why |
| --- | --- |
| Rhythia's official API | Requested player IDs, the existing game session where needed, and actions such as pinning a score that you choose. Rhythia receives the connection information needed to serve these requests. |
| Resource hosts provided by Rhythia | Requests for images, artwork and replays used by the features, plus normal connection information. Their addresses come from the game's resources. |
| GitHub's raw-content service | A request for release notes and normal connection information. No game session, friends list, local history or extension settings are attached. |
| The independent history-service operator, OVHcloud and Cloudflare | With online history enabled: the requested public player ID and connection information, including IP address. With the separate visit-report choice enabled: a report containing the viewed public player ID. The service notice explains storage, safeguards, public history and its other providers. |
| The maintainer and Gmail | Contact information, messages and attachments that you choose to email for support or privacy requests. These are not automatically collected from your browser. |

The extension does not automatically send messages to Discord or publish your settings, friends list or local history. Public player history offered by the independent service comes from its own collection of game data, not an upload of your local history. When you open an external link, that website handles the resulting visit under its own practices.

Official API, community API and release-note requests use HTTPS. The extension does not add its own encryption to browser storage; the storage and clearing controls below describe its actual behaviour.

## Storage and clearing data

Preferences and local history are saved in your browser. Some preferences and map caches are saved with Rhythia's site data, separately from the extension's own data. Some temporary information is kept only while the browser is running. The extension does not sync these records through Chrome Storage Sync or encrypt them separately; your browser and device controls protect them.

Saved settings remain until you change or reset them or remove the relevant browser data. The latest 30 saved connection results have a count limit rather than a fixed day-based expiry. The maintainer cannot remotely read or erase your extension storage; information you email and the service's independently collected records are separate.

Local profile history covers up to **90 days** and uses at most **25 MB**. Older records are cleared while profiles are used and can disappear sooner if the available space fills. Other temporary copies have their own expiry and storage limits; the 90-day period does not cover every browser cache.

**Clear Cache** removes saved local history, downloaded community history and the history used for Playstyle summaries after confirmation. It keeps preferences and the waiting periods between visit reports. It does not remove official game scores or the independent service's records. Open profiles refresh their history display; later use can save or download new data.

Changing a mode keeps saved local records but changes which sources are used. **Reset Settings** preserves connection/report choices and does not itself erase history. Removing the extension clears its extension storage. Clear Rhythia site data separately to remove site caches; this can sign you out.

## Contact and separate records

Email [shurieldev@gmail.com](mailto:shurieldev@gmail.com) for questions. Contact information and messages you send are used to handle the request through Gmail. Do not send passwords, sessions, recovery codes or identity documents.

Requests about independent player history, removal or exclusion are covered by the [history-service notice](HISTORY-PRIVACY.md#requests-and-contact). Official account changes belong to Rhythia; the extension cannot change the game's records or remotely erase other users' browser copies.

Use of extension data is limited to the described features, related support, security and applicable legal requirements, in line with the Chrome Web Store's Limited Use requirements. This does not mean the store has approved this notice. Requested browser permissions also support features that work locally; they do not mean your session is sent to the maintainer.

Material changes are described in the [changelog](changelog.md). See [Data and Sync](DATA-AND-SYNC.md) for controls and [Terms](TERMS.md) for project use.
