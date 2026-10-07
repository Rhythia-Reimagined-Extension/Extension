# Privacy Policy — Rhythia Reimagined 1.2.0

**Effective date:** October 7, 2026<br>
**Maintainer:** Shuriel<br>
**Contact:** [shurieldev@gmail.com](mailto:shurieldev@gmail.com)<br>
**Project:** [Rhythia Reimagined](https://github.com/Rhythia-Reimagined-Extension/Extension)

Rhythia Reimagined is an independent fan extension for [Rhythia](https://rhythia.com). This policy explains the data used for its themes, player statistics, score cards, comparisons, and history.

## Data collection and use

The extension handles data even when it stays on your device. It reads the Rhythia pages you open, requests data from the official game API, and stores the information needed for the features you use. It does not read your browser's general history or pages outside Rhythia.

| Data | Source and purpose | Where it is handled |
| --- | --- | --- |
| Public player identity: player ID, username, profile country, and avatar URL | Rhythia pages and APIs; identify profiles, show comparisons, and display history. A profile country is game profile data, not device geolocation. | Browser caches and local records; independently collected public identities also appear in the community database. |
| Public gameplay and website content: scores, map metadata and artwork, accuracy, play counts, rhythm points, and global/country rankings | Rhythia pages and APIs; calculate statistics and render score cards, progression, and history. | Browser memory, caches, and local history; the community database stores public player statistics and ranking history. |
| Existing Rhythia session token and account-related API responses, including your friends list | Rhythia's site storage and official API; load scores and friends and perform your requested score-pinning actions. | The token is read for official API requests and is not copied into extension storage or sent to the community service. Friends are displayed in the browser. |
| Preferences and local feature state | Your choices; remember themes, enabled features, selected views, comparison players, and history/visit-report settings. | Your browser's extension storage and Rhythia site storage; these settings are not uploaded to the community service. |
| Viewed Rhythia player ID and request timing | Online history requests and separately enabled profile visit reports; retrieve history and prioritize public-profile refreshes. | The community service receives the viewed ID. Local diagnostics keep the latest 30 entries, including player ID/name, time, latency, and result. |
| Connection and operational information: IP address, requested path, time, response status, and browser/referrer information when present | Requests to the community service; deliver responses, maintain logs, and prevent abuse. | Community infrastructure and Cloudflare. IP-derived visit safeguards and raw connection logs have different retention rules below. |
| Email address, correspondence, and agreed account-verification evidence | Information you send when requesting support or exercising privacy rights; answer and verify your request. | The maintainer and communication providers, as explained below. |

Online history requests disclose which Rhythia profile is being viewed even when optional visit reports are off. Turning reports off stops the separate reporting request; **Local Only** stops both kinds of community request.

## Local processing and storage

The extension reads player and score information on Rhythia and from its official game API. It saves your preferences and, when local history is enabled, daily public player statistics in your browser.

Your existing Rhythia session is read locally for official game features, including fetching scores, friends lists, and pinning your scores. It is sent only to the official game API at `production.rhythia.com`. It is not saved by the extension or sent to the community service. The extension does not request passwords, payment details, health information, or private messages.

Browser data uses `chrome.storage.local`, Rhythia's `localStorage` and `sessionStorage`, and temporary memory caches. It does not use Chrome Storage Sync to synchronize records or preferences between devices. Session caches become invalid after five minutes; browser storage entries may remain until replaced or cleared. Some map caches and site preferences have no automatic expiry. Browser storage is protected by your browser and device controls; the extension does not add its own encryption to local records.

Local profile records use a fixed 90-day window (today and the previous 89 local dates) and a 25 MB budget. These limits cannot be changed in the popup. Cleanup runs while you use player profiles, without a background schedule. Oldest history can be removed sooner when the budget fills. Temporary caches use separate limits. The extension also keeps temporary profile, score, and public map caches, selected tabs, and recent connection diagnostics.

## Community history and profile visit reports

A small card on Rhythia asks whether to use online player history and links to this policy. Choose **Use online history** for Cloud + Local, or **Keep it local** for Local Only. Profile visit reports are off after either choice; you can enable them separately in the popup. No community request is sent until you confirm an online choice. The card remains available until you choose, without opening an extra tab or blocking the game. You can change settings later; an update preserves existing explicit settings.

In a cloud mode, the extension sends the public ID of the player whose history you request to `rhythia.shuriel.com`. If reports are enabled, it also sends the viewed player's public ID to help prioritize updates to their public history. Reports do not identify your own Rhythia account as the visitor.

Like any network connection, these requests expose your connection IP to the service and its hosting providers. Your Rhythia session and password, private messages, replays, and browsing outside Rhythia player profiles are not sent to this community service.

The service independently collects public leaderboard and player information, including player IDs, names, avatars, rankings, and statistics, to provide player history. Turning reports off does not stop that independent collection.

## Data sharing and recipients

- **Official Rhythia / Capo Games services:** `production.rhythia.com` receives the player/map identifiers and, for requests that use it, your existing game session token. Rhythia controls its own account data and processing. Loading game-hosted images or requesting replays also connects to the corresponding game resource host.
- **Shuriel's community service:** `rhythia.shuriel.com` receives requested public player IDs, optional visit-report IDs, and connection information. The maintainer operates the service and can access its database and operational logs for the disclosed purposes.
- **Other community-history users:** public player identities and daily player statistics/ranking history are returned by the community history API without requiring a login. They are available to other users and anyone requesting that public endpoint. Visitor IPs, IP-derived safeguards, and visit-report records are not part of the public history response.
- **Cloudflare and community hosting infrastructure providers:** process network traffic and connection information to deliver and protect the service and host its database, logs, and backups. Cloudflare's separate processing is described in its [privacy policy](https://www.cloudflare.com/privacypolicy/).
- **GitHub:** receives normal connection information, including your IP and the requested resource, when the extension downloads release notes from `raw.githubusercontent.com` or you open project/privacy links. The extension does not attach your Rhythia session, local history, or preferences to release-note requests. See [GitHub's privacy statement](https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement).
- **Communication and backup delivery providers:** the maintainer's Gmail mailbox receives support and privacy correspondence. Providers delivering emailed server backups process encrypted backup attachments and delivery metadata; the maintainer receives those copies. When configured, Discord receives server maintenance notifications, which can include public player identifiers and operational error details. See [Google's privacy policy](https://policies.google.com/privacy) and [Discord's privacy policy](https://discord.com/privacy).

Data is not sold, rented, or transferred for advertising, commercial profiling, creditworthiness, or lending. Transfers are limited to delivering the described features, operating and protecting the service, handling a request with your consent, or meeting applicable legal requirements. No separate advertising or third-party analytics SDK is included.

## How long data is kept

- **Local preferences and records:** kept in your browser until you clear them, remove the extension, or the fixed history limits remove older records.
- **Community player records and ranking history:** kept without automatic expiry, until manually deleted.
- **Recent profile visit counts:** kept for 30 UTC dates including today and removed by scheduled cleanup. An outage may delay cleanup.
- **Public player ID and latest reported visit:** removed after 30 days without an accepted visit. They help select profiles for refresh and do not contain the visitor's account or IP.
- **IP-based abuse prevention:** each IP and viewed profile can count once per rolling hour. A keyed cryptographic digest of this pair and its last accepted timestamp are stored separately from player history. Raw IPs are not stored in that table. Expired digests are removed by hourly cleanup, normally within the following hour. These are pseudonymous safeguards, not anonymous visitor analytics. Other admission safeguards use bounded server memory.
- **Operational logs:** the reverse proxy records connection IPs, requested paths, response status, referrers, browser information, and forwarded connection information. Logs rotate as they fill; there is no fixed retention period in days. Application log filtering does not remove IPs from proxy logs.

Cloudflare processes connection information to protect and deliver the service under its own [privacy policy](https://www.cloudflare.com/privacypolicy/). Its separate retention is governed by that provider's policies. Community requests use HTTPS.

Data is used to provide the disclosed features, refresh public history, and protect and operate the service. It is not sold or used for advertising or commercial profiling. The extension does not send separate usage analytics or crash reports.

Encrypted server backups include database records. The community service keeps daily 24h and 72h slots, three rotating weekly copies and monthly copies without automatic expiry. Only weekly and monthly copies are emailed to the maintainer. Deleted records may remain in these recovery copies; restores must reapply deletion requests and telemetry cleanup before serving data. Backup retention is separate from the live database policy.

## Secure handling

Official game API calls, community API requests, and release-note downloads use HTTPS. The community database separates public player history from internal visit safeguards. IP-derived visit keys use a keyed cryptographic digest; this does not remove raw IPs from connection logs. Server backup archives are encrypted before email delivery. Access to internal database records, logs, and backup copies is restricted to operating, securing, and maintaining the service; these records are not returned by the public history endpoint.

## Your controls

Use **Local Only** to stop all extension connections to the community service, including visit reports and connection checks. Official Rhythia features and release-note downloads from GitHub can still use the network.

Use **Clear Cache** to delete all local profile history and cached community history, after an irreversible-action confirmation. It keeps preferences, visit-report cooldowns, official game scores and server history. Cached data may be downloaded again. There is no protected-profile list. **Reset Settings** keeps community connection and reporting choices and does not immediately delete history.

Removing the extension clears its extension storage. Some caches are stored separately on the Rhythia site; clear that site's data through your browser to remove them. This can also sign you out of Rhythia.

Changing a setting or removing the extension does not delete community history. Deleting a community player record also deletes its associated history. Collection can be stopped for a profile while retaining its existing history.

## Requests and contact

For access, correction, deletion, or an objection concerning your player records, email [shurieldev@gmail.com](mailto:shurieldev@gmail.com) with your Rhythia profile link or public player ID and what you want done.

To protect your records from unauthorized changes, the maintainer may ask for proportionate evidence that you control that account. A public profile link alone is not proof. Verification is arranged privately; screen sharing is not mandatory. Do not send passwords, session tokens, recovery codes, identity documents, or unrelated private information. Any agreed live verification is not recorded by the maintainer.

Your email, correspondence, and necessary verification information are used only to handle the request. Verification evidence is deleted when no longer needed. A minimal record of the request and outcome may be retained as needed to document handling, resolve a dispute, or meet legal obligations. Communication providers process correspondence under their own policies.

Where GDPR / RODO applies, requests are handled without undue delay and normally within one month. Any permitted extension or refusal is explained. You retain applicable data protection rights, including the right to complain to a data protection authority.

## Browser permissions

The extension uses storage permissions for preferences and player history. Access to Rhythia and its official API enables game-page features; access to the community service enables history and reports after your choice; GitHub access loads release notes. It does not request access to all websites, camera, microphone, or screen capture.

Firefox's installation prompt describes the types of data used by these features, including official-game authentication information and public website content. These declarations do not mean your password is collected or your session is sent to the community service.

## Limited Use and policy updates

Use of user data follows the Chrome Web Store User Data Policy, including its Limited Use requirements. Data is used only for the disclosed features and related security and reliability. It is not used for personalized advertising, creditworthiness, or lending decisions. Human access is limited to the policy's permitted cases, such as support with consent, security investigations, legal obligations, or aggregated anonymous operational information.

Changes are published here and noted in the [changelog](changelog.md).
