# Privacy — independent player-history service

Updated October 12, 2026. Controls for deletion, stopping further collection and clearing older diagnostics are active and have been checked. Full identification of the person responsible, the legal basis for processing, how players are informed and provider agreements still need to be completed. This notice describes current data handling; the remaining assessments are not a certification of compliance.

Project contact: **Shuriel**, a private operator based in Poland · [contact@shuriel.com](mailto:contact@shuriel.com). Full identification of the person responsible for this service remains to be completed; the project name alone does not provide it.

## What the service does

The service obtains public player data from Rhythia's official API and keeps daily statistics for progress and comparisons. Reimagined is one client; other tools can request a single player's history too. Collection runs independently of extension users. The service is free and noncommercial.

Rhythia controls the original game records. The operator determines the purposes and handling of this separate copy. Public data can still relate to an identifiable person. Capo Games' acceptance of the described API use does not authorize every future use or replace data-protection responsibilities.

## Data and purposes

| Data | Purpose and availability |
| --- | --- |
| Public player ID and last known name, country and avatar | Identify profiles. Public with history; no intentional archive of name, country or avatar changes. |
| Daily statistics and ranks | Progress/comparisons: skill points, global/country rank, play count, squares hit, average accuracy, total scores and average rhythm points where available. Public in an individual player's history. |
| Last observed game ban status/date and observation time | Privately diagnose availability. No public ban history; a missing profile is not automatically banned. |
| Optional visit reports: viewed player ID, counts and last accepted visit | Discover public profiles. Private; no visitor game account in the report. |
| Connection IP, requested resource, time and response information | Deliver requests, limit abuse and diagnose failures. A short-lived identifier generated from the IP address and viewed profile helps limit repeat reports. Visit-report records do not store the raw IP, but providers and connection logs can still process it. |
| Unexpected API responses and diagnostic details | Privately investigate missing/inconsistent statistics. Copies can contain older public values. |
| Requests and exclusions | Handle rights, document completion and prevent recollection. Private. |

The service does not receive your session, password, friends list or extension preferences. Cloud history reveals the requested profile even without visit reports. Players can be collected without using Reimagined.

Active profiles added to the service continue to be checked daily, independently of visit counts. Errors, request limits or unavailable profiles can interrupt collection. If the game API reports that a profile is missing, earlier history is kept. This is separate from a request to remove personal data.

Legitimate interests is being assessed as a possible legal basis for collecting and sharing history: useful progress records and comparisons using limited public game data. The assessment must consider whether the use is necessary and how it affects players, including their expectations, younger players, long retention and public access. It is not complete. How to inform players who do not use Reimagined, or whether an applicable exception can be justified, also remains unresolved. A visitor's opt-in is not the collected player's consent.

## Public access and providers

Individual player histories are public without login. The service does **not offer a bulk database download**. Measures to limit abuse cannot guarantee that recipients will not copy or combine individual histories. Visit reports, IP-related safeguards, private ban observations, diagnostics and records of privacy requests are not public history.

The operator can access records for operation, security and requests. OVHcloud hosts the service; Cloudflare delivers and protects it. OVHcloud email handles new project correspondence; privacy@shuriel.com reaches the same project inbox as contact@shuriel.com. Earlier correspondence remains in Gmail during the transition. Gmail still receives encrypted backup delivery and generic new-mail alerts in the operator's own mailboxes; these alerts do not include the original sender, subject, message contents or attachments. This is consumer Gmail; Google does not offer a processor agreement for that service. History-service Discord alerts use counts and general causes without player identifiers. Older notifications may still contain earlier details.

The extension sends only the requested public player ID and normal connection information for history access, and a viewed player ID if its separate visit-report option is enabled. The service does not receive the extension's local history or game session. Other clients of the public history API also expose their requested player ID and connection information.

Some providers process information outside Poland and the European Economic Area. The hosting location does not mean every provider processes information only in Poland. OVHcloud and Cloudflare publish processing agreements for covered customer data; those documents do not establish which terms apply to the operator's active accounts. Each provider's role, agreements and safeguards for international transfers must be verified for the final notice. Published information: [OVHcloud processing agreement](https://contract.eu.ovhapis.com/1.0/pdf/OVH_Data_Protection_Agreement-pl.pdf), [Cloudflare DPA](https://www.cloudflare.com/cloudflare-customer-dpa/), [Google consumer-service information](https://support.google.com/policies/answer/9581826?hl=en) and [Discord](https://discord.com/privacy).

Data is not sold or used for advertising, creditworthiness or lending. Later functions with new purposes/data require a separate assessment and updated notice.

## Retention

| Records | How long they are kept |
| --- | --- |
| Player history | No automatic expiry while the service is provided. Continued need must be reviewed; history is erased when a removal request is granted. |
| Last private ban observation | Kept with the player record and removed when that record is erased. |
| Visit counts and last-visit observations | Counts cover the current and previous 13 days, measured in UTC; last-visit observations are kept for 14 days. Automatic cleanup applies to these records, separately from provider and connection logs. |
| Identifier used to limit repeat visit reports | Used for a rolling hour, then normally removed within the following hour. |
| Identifiable diagnostic responses/files and detailed collection logs | 14 days, including details marked to keep visible. Summary alerts omit player IDs. This period applies to the service's diagnostic records, not every infrastructure log. |
| Request correspondence | As needed to handle the request, then at most 90 days after actual closure. Verification material is removed sooner when no longer needed. This policy must also be applied manually in the mailbox. |
| Minimal completion record | Case number, player ID, dates, scope and result: 12 months after closure. |
| Record preventing further collection | Only the player ID, exclusion date and case number, while needed to prevent collection from starting again. This is kept separately from the completion record. |

A specific dispute or legal requirement can justify a limited, documented and reviewed exception. An open case is not a reason to keep correspondence forever. Retention of connection logs and records held by providers remains unresolved separately; the service's 14-day diagnostic period does not cover every infrastructure log.

New routine backups omit visit reports and diagnostic responses. They keep the information needed to protect history and respect requests to stop collection. **Existing recovery archives, copies made before service updates and emailed backups can still contain older records; their retention remains unresolved.** Encryption protects these copies but does not erase them. If a backup is recovered, current removal requests and cleanup must be applied before records become available again. Copies held by other tools or browsers cannot be remotely recalled.

## Requests and contact

Email [privacy@shuriel.com](mailto:privacy@shuriel.com) with a profile link/ID and the request. You can ask about access, correction, erasure, restriction or objection, as applicable. You do not need to delete the original account first. Contact Rhythia separately for its records.

A public link alone does not prove account control. When there is reasonable doubt, proportionate verification is arranged privately. Screen sharing is not mandatory and is not recorded by the operator. Do not send passwords, tokens, recovery codes, identity documents or unrelated personal information.

The erasure process first stops further collection, then removes the service's active player, history and diagnostic records and records the result. If cleanup is incomplete, the request remains unfinished. A later verified return request starts new history from zero. Blocking a profile because of an operational problem is separate and does not itself erase history. History responses ask browsers and other clients not to keep temporary cached copies. Previously cached responses and other copies are assessed separately; this cannot remotely delete copies already obtained by others.

For connection/visit requests, provide information that helps locate records. Reports do not include your account and cannot necessarily be found by nickname. We do not collect additional identity information solely to identify otherwise unidentifiable records.

Requests are handled without undue delay, normally within one month. A permitted extension is explained within that first month; refusals include reasons and complaint information. You can complain to a data-protection authority, including [UODO](https://uodo.gov.pl/). Not every right applies to every basis; public API access is not a substitute for assessing a request.

The notice will be updated when the remaining assessments are completed. For data used in your browser see [extension Privacy](PRIVACY.md); for service use see [history Terms](HISTORY-TERMS.md).
