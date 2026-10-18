# Privacy — independent player-history service

Updated October 18, 2026. Controls for deletion, stopping further collection and clearing older diagnostics are active and have been checked. A documented legitimate-interest assessment now covers community progress history. Full controller identification and effective information for players remain unresolved; some provider and historical-copy questions also remain open. This notice describes current data handling; the remaining assessments are not a certification of compliance.

Project contact: **Shuriel**, a private operator based in Poland · [contact@shuriel.com](mailto:contact@shuriel.com). Full identification of the person responsible for this service remains to be completed; the project name alone does not provide it.

## What the service does

The service obtains public player data from Rhythia's official API and keeps profile statistics and selected score observations for progress and comparisons. Reimagined is one client; other tools can request a single player's history too. Collection runs independently of extension users. The service is free and noncommercial.

Rhythia controls the original game records. The operator determines the purposes and handling of this separate copy. Public data can still relate to an identifiable person. Capo Games' acceptance of the described API use does not authorize every future use or replace data-protection responsibilities.

## Data and purposes

| Data | Purpose and availability |
| --- | --- |
| Public player ID and last known name, country and avatar | Identify profiles. Public with history; no intentional archive of name, country or avatar changes. |
| Daily statistics and ranks | Progress/comparisons: skill points, global/country rank, play count, squares hit, average accuracy, total scores and average rhythm points where available. Public in an individual player's history. |
| Latest observed ranking position and dates last seen within Top 1000, 3000 and 5000 | Privately choose which profiles to collect and how often. Observing a ranking entry does not itself make an individual profile history public. |
| Selected Standard-mode scores for active Top-1000 players | Up to five results per actual UTC play date: score/player IDs, play time, map reference/title/difficulty/note count, reported rhythm points, speed, misses, pass status, mods and replay link where supplied. Private; not currently exposed by the public history API. Replay files are not downloaded for this history. |
| Score-selection context and capture records | Privately record observed personal-Top-100 score IDs, source lists, selection reasons, previous retained best-score comparisons, estimated weighted points, capture times, available-window coverage and errors. These are bounded observations, not a complete play or replay archive. |
| Monthly personal Top-25 snapshots | Scheduled for eligible active Top-5000 players on the last UTC day of the month. Store references to selected score details, their order, reported points and actual observation time. Private; not currently exposed by the public history API. |
| Last observed game ban status/date and observation time | Privately diagnose availability. No public ban history; a missing profile is not automatically banned. |
| Optional visit reports: viewed player ID, counts and last accepted visit | Discover public profiles. Private; no visitor game account in the report. |
| Connection IP, requested resource, time and response information | Deliver requests, limit abuse and diagnose failures. A short-lived identifier generated from the IP address and viewed profile helps limit repeat reports. Visit-report records do not store the raw IP, but providers and connection logs can still process it. |
| Unexpected API responses and diagnostic details | Privately investigate missing/inconsistent statistics. Copies can contain older public values. |
| Requests and exclusions | Handle rights, document completion and prevent recollection. Private. |

The service does not receive your session, password, friends list or extension preferences. Cloud history reveals the requested profile even without visit reports. Players can be collected without using Reimagined.

Collection uses ranking groups and recent profile discovery. The current UTC schedule checks Top 1000 and a bounded group of recently visited profiles daily, positions 1001-3000 on Monday/Wednesday/Friday, and positions 3001-5000 on Tuesday/Saturday. Promotion is immediate; leaving a ranking group has a seven-day grace period. Profiles that leave Top 5000 can remain in a less frequent collection group for 60 days, checked on the first and third Sunday; afterwards collection stops until they qualify again. Previously admitted profiles with no ranking observation have a transition period. Stopping routine collection does not automatically erase existing history.

On the last UTC day of the month, the schedule also attempts eligible Top-5000 monthly Top-25 captures. This feature was enabled on October 18, 2026; that does not mean a past month-end snapshot exists. Daily selected-score history remains limited to Top 1000. API windows, quotas, errors and unavailable profiles can interrupt or limit all of these observations. If the game API reports that a profile is missing, earlier history is kept. This is separate from a request to remove personal data.

The proposed basis is legitimate interests under Article 6(1)(f) GDPR: maintaining community progress records and comparisons using limited public game data. An assessment dated October 18, 2026 documents the purpose, necessity, less intrusive alternatives and effects on players, including younger players, long retention and public access. It supports the stated purpose and bounded data needs, but does not give unconditional clearance for the entire current public service while transparency obligations remain unresolved. How to inform players who do not use Reimagined, or whether an applicable exception can be justified, also remains unresolved. A visitor's opt-in is not the collected player's consent.

## Public access and providers

Individual player histories are public without login. The service does **not offer a bulk database download**. Measures to limit abuse cannot guarantee that recipients will not copy or combine individual histories. Visit reports, IP-related safeguards, ranking-selection records, selected-score and monthly Top-25 records, private ban observations, diagnostics and records of privacy requests are not public history.

The operator can access records for operation, security and requests. OVHcloud hosts the service; Cloudflare delivers and protects it and stores encrypted offsite recovery copies in R2. OVHcloud email handles new project correspondence; privacy@shuriel.com reaches the same project inbox as contact@shuriel.com. Earlier correspondence remains in Gmail during the transition. Gmail still receives encrypted backup delivery and generic new-mail alerts in the operator's own mailboxes; these alerts do not include the original sender, subject, message contents or attachments. This is consumer Gmail; Google does not offer a processor agreement for that service. History-service Discord alerts use counts and general causes without player identifiers. Older notifications may still contain earlier details.

The extension sends only the requested public player ID and normal connection information for history access, and a viewed player ID if its separate visit-report option is enabled. The service does not receive the extension's local history or game session. Other clients of the public history API also expose their requested player ID and connection information.

Some providers process information outside Poland and the European Economic Area. The hosting location does not mean every provider processes information only in Poland. The active OVHcloud account confirms its processing agreement, and Cloudflare's self-service terms incorporate its DPA. These agreements include provisions for covered processing and international transfers; they do not mean that all processing stays in the EEA. The roles and transfer arrangements for remaining recipients are still being assessed. Published information: [OVHcloud processing agreement](https://contract.eu.ovhapis.com/1.0/pdf/OVH_Data_Protection_Agreement-pl.pdf), [Cloudflare DPA](https://www.cloudflare.com/cloudflare-customer-dpa/), [Google consumer-service information](https://support.google.com/policies/answer/9581826?hl=en) and [Discord](https://discord.com/privacy).

Data is not sold or used for advertising, creditworthiness or lending. Later functions with new purposes/data require a separate assessment and updated notice.

## Automated operational summaries

An isolated AI reviewer receives bounded, filtered source-code changes and extracted facts about changes to Rhythia's public website through OpenRouter to a routed model provider. The configured model is Anthropic Claude Haiku; retained production responses identify Google as the inference provider. Routing may change among endpoints meeting the required data-handling settings. It supports operational review; it does not assess players or make decisions about them. Player histories, score records, visit reports, support correspondence, raw request logs, credentials and game sessions are excluded from its intended inputs. Filtering withholds files that match sensitive-data patterns, but cannot guarantee detection of every possible sensitive value.

Provider routing requires zero data retention and disallows data collection for model training. Input/output logging and external observability broadcasts are disabled in the checked workspace. Request restrictions are separate from account-wide defaults and do not independently verify provider behaviour. OpenRouter publishes a standard DPA through its Terms; its application to this individual noncommercial account is still being clarified. Local review jobs/results normally expire after 14 days; current sanitized source baselines are replaced as source changes. Published administrative summaries and Discord notices have separate retention. Provider information is available from [OpenRouter](https://openrouter.ai/docs/guides/features/zdr). This does not introduce AI processing of collected player statistics.

## Retention

Operational reports about collection progress, API structure and general failures are sent to administrative Discord channels. They do not contain raw game responses, player identifiers or game sessions. Infrastructure alerts separately describe resource usage, watched project-file metadata and SSH logins; SSH alerts may include the administrative account, source IP address and authentication method. Discord messages have separate provider retention and are not automatically deleted by the history service's 14-day diagnostic cleanup. See [Discord's privacy information](https://discord.com/privacy).

| Records | How long they are kept |
| --- | --- |
| Player history | No automatic expiry while the service is provided. Continued need is reviewed at least annually and when the purpose or scope changes; history is erased when a removal request is granted. |
| Selected daily scores, capture records and the latest personal-Top-100 reference | A six-calendar-month cutoff, using the UTC play/observation date and hourly cleanup. Unreferenced shared map metadata is also removed. |
| Monthly Top-25 snapshots and referenced score details | Snapshots are removed when their month is earlier than the UTC calendar month twelve months before the current month. Score details remain while referenced by a retained monthly snapshot; unreferenced details are cleaned up. This can retain an older play that remains in a later personal top list. |
| Ranking-selection records | Until their last Top-5000 observation is more than 365 days old, with hourly cleanup; also erased for a granted removal request. |
| Last private ban observation | Kept with the player record and removed when that record is erased. |
| Visit counts and last-visit observations | Counts cover the current and previous 13 days, measured in UTC; last-visit observations are kept for 14 days. Automatic cleanup applies to these records, separately from provider and connection logs. |
| Identifier used to limit repeat visit reports | Used for a rolling hour, then normally removed within the following hour. |
| Identifiable diagnostic responses/files and detailed collection logs | 14 days, including details marked to keep visible. Summary alerts omit player IDs. This period applies to the service's diagnostic records, not every infrastructure log. |
| Request correspondence | As needed to handle the request, then at most 90 days after actual closure. Verification material is removed sooner when no longer needed. This policy must also be applied manually in the mailbox. |
| Minimal completion record | Case number, player ID, dates, scope and result: 12 months after closure. |
| Record preventing further collection | Only the player ID, exclusion date and case number, while needed to prevent collection from starting again. This is kept separately from the completion record. |

A specific dispute or legal requirement can justify a limited, documented and reviewed exception. An open case is not a reason to keep correspondence forever. Retention of connection logs and records held by providers remains unresolved separately; the service's 14-day diagnostic period does not cover every infrastructure log.

New routine backups omit visit reports and diagnostic responses. They keep profile history, retained score/monthly/ranking records and the information needed to respect requests to stop collection. Local routine rotation keeps two daily copies, two copies from the every-three-days schedule, three weekly copies and three monthly copies. Named encrypted manual daily copies expire after 31 days; named deployment database recovery copies after 180 days. This narrow automatic rule does not include unknown archives, frozen research material or source/log archives.

Encrypted recovery copies are also uploaded to Cloudflare R2. Verified R2 lifecycle rules expire daily copies after 31 days, weekly after 90 days, and monthly and legacy history copies after 180 days. A 30-day bucket lock prevents earlier deletion; lifecycle processing is asynchronous, so these are configured expiry periods rather than an exact deletion timestamp. Weekly/monthly encrypted copies can additionally be delivered to the operator's Gmail accounts until the existing scheduled switch-off on October 25, 2026 at 12:00 UTC. Mailed backup retention is checked manually: 31 days for daily, 90 for weekly and 180 for monthly copies. Local rotation does not delete R2 objects or email attachments. **Unclassified recovery archives, older project copies and earlier correspondence still require separate review.** Encryption protects these copies but does not erase them. If a backup is recovered, current removal requests and cleanup must be applied before records become available again. Copies held by other tools or browsers cannot be remotely recalled.

## Requests and contact

Email [privacy@shuriel.com](mailto:privacy@shuriel.com) with a profile link/ID and the request. You can ask about access, correction, erasure, restriction or objection, as applicable. You do not need to delete the original account first. Contact Rhythia separately for its records.

A public link alone does not prove account control. When there is reasonable doubt, proportionate verification is arranged privately. Screen sharing is not mandatory and is not recorded by the operator. Do not send passwords, tokens, recovery codes, identity documents or unrelated personal information.

The erasure process first stops further collection, then removes the service's active player, profile history, selected-score/monthly records, ranking-selection records and diagnostics and records the result. If cleanup is incomplete, the request remains unfinished. A later verified return request starts new history from zero. Blocking a profile because of an operational problem is separate and does not itself erase history. History responses ask browsers and other clients not to keep temporary cached copies. Previously cached responses and other copies are assessed separately; this cannot remotely delete copies already obtained by others.

For connection/visit requests, provide information that helps locate records. Reports do not include your account and cannot necessarily be found by nickname. We do not collect additional identity information solely to identify otherwise unidentifiable records.

Requests are handled without undue delay, normally within one month. A permitted extension is explained within that first month; refusals include reasons and complaint information. You can complain to a data-protection authority, including [UODO](https://uodo.gov.pl/). Not every right applies to every basis; public API access is not a substitute for assessing a request.

The notice will be updated when the remaining assessments are completed. For data used in your browser see [extension Privacy](PRIVACY.md); for service use see [history Terms](HISTORY-TERMS.md).
