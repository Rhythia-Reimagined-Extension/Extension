# Privacy — Rhythia Reimagined 1.2.0

**Effective date:** October 4, 2026<br>
**Maintainer:** Shuriel<br>
**Contact:** [shurieldev@gmail.com](mailto:shurieldev@gmail.com)<br>
**Project:** [Rhythia Reimagined](https://github.com/Rhythia-Reimagined-Extension/Extension)

Rhythia Reimagined is an independent fan extension for [Rhythia](https://rhythia.com). This policy explains the data used for its themes, player statistics, score cards, comparisons, and history.

## Data used in your browser

The extension reads player and score information on Rhythia and from its official game API. It saves your preferences and, when local history is enabled, daily public player statistics in your browser.

Your existing Rhythia session is read locally for official game features such as friends lists and pinning your scores. It is sent only to the official game API at `production.rhythia.com`. It is not saved by the extension or sent to the community service. The extension does not request passwords, payment details, or private messages.

Local profile records use a fixed 90-day window (today and the previous 89 local dates) and a 25 MB budget. These limits cannot be changed in the popup. Cleanup runs while you use player profiles, without a background schedule. Oldest history can be removed sooner when the budget fills. Temporary caches use separate limits. The extension also keeps temporary profile, score, and public map caches, selected tabs, and recent connection diagnostics.

## Community history and profile visit reports

A small card on Rhythia asks whether to use online player history and links to this policy. Choose **Use online history** for Cloud + Local, or **Keep it local** for Local Only. Profile visit reports are off after either choice; you can enable them separately in the popup. No community request is sent until you confirm an online choice. The card remains available until you choose, without opening an extra tab or blocking the game. You can change settings later; an update preserves existing explicit settings.

In a cloud mode, the extension sends the public ID of the player whose history you request to `rhythia.shuriel.com`. If reports are enabled, it also sends the viewed player's public ID to help prioritize updates to their public history. Reports do not identify your own Rhythia account as the visitor.

Like any network connection, these requests expose your connection IP to the service and its hosting providers. Your Rhythia session and password, private messages, replays, and browsing outside Rhythia player profiles are not sent to this community service.

The service independently collects public leaderboard and player information, including player IDs, names, avatars, rankings, and statistics, to provide player history. Turning reports off does not stop that independent collection.

## How long data is kept

- **Local preferences and records:** kept in your browser until you clear them, remove the extension, or the fixed history limits remove older records.
- **Community player records and ranking history:** kept without automatic expiry, until manually deleted.
- **Recent profile visit counts:** kept for 30 UTC dates including today and removed by scheduled cleanup. An outage may delay cleanup.
- **Public player ID and latest reported visit:** removed after 30 days without an accepted visit. They help select profiles for refresh and do not contain the visitor's account or IP.
- **IP-based abuse prevention:** each IP and viewed profile can count once per rolling hour. A keyed cryptographic digest of this pair and its last accepted timestamp are stored separately from player history. Raw IPs are not stored in that table. Expired digests are removed by hourly cleanup, normally within the following hour. These are pseudonymous safeguards, not anonymous visitor analytics. Other admission safeguards use bounded server memory.
- **Operational logs:** the reverse proxy records connection IPs, requested paths, response status, referrers, browser information, and forwarded connection information. Logs rotate as they fill; there is no fixed retention period in days. Application log filtering does not remove IPs from proxy logs.

Cloudflare processes connection information to protect and deliver the service under its own [privacy policy](https://www.cloudflare.com/privacypolicy/). Its separate retention is governed by that provider's policies. Community requests use HTTPS.

Data is used to provide the disclosed features, refresh public history, and protect and operate the service. It is not sold or used for advertising or commercial profiling. The extension does not send separate usage analytics or crash reports.

Encrypted server backups include database records. Rhythia keeps the existing daily 24h and 72h slots, three rotating weekly copies and monthly copies without automatic expiry. Only weekly and monthly copies are emailed to the maintainer. Deleted records may remain in these recovery copies; restores must reapply deletion requests and telemetry cleanup before serving data. Backup retention is separate from the live database policy.

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
