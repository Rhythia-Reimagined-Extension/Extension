# Privacy — independent player-history service

Updated November 7, 2026. This notice explains what the player-history service behind Reimagined keeps about Rhythia players, why, for how long, and how to have it shown, corrected or removed. A few legal questions are still being worked on; they are listed at the end.

Contact: **Shuriel**, a private operator based in Poland · [privacy@shuriel.com](mailto:privacy@shuriel.com) (the same inbox as contact@shuriel.com)

## In short

- The service keeps the public history of Rhythia players' ranks and rhythm points, read from Rhythia's official API, so profiles can show progress over time. It also covers players who do not use Reimagined.
- Its player data comes from public game data. It never gets Rhythia passwords, sign-ins or anything private from a game account.
- It is free and noncommercial: no ads and no selling of data. No decision with legal or similar effects is made about anyone automatically; the only automatic steps are choosing which profiles to read and short blocks against copying.
- Each copy of Reimagined has a random access key so the service can keep fair limits. The key is not linked to a game account or browser, and the service does not store it.
- Write to [privacy@shuriel.com](mailto:privacy@shuriel.com) to see, correct or remove a player's history, or to stop its collection. You do not need to delete your game account.

## What the service keeps

| What | Why, and who can see it |
| --- | --- |
| A player's public ID, last known name, country and avatar | To identify profiles. Shown with the player's history. Older names, countries or avatars are not archived. |
| Daily statistics and ranks: rhythm points, global and country rank, play count, squares hit, accuracy and score totals | Progress over time and comparisons. Anyone can see one player's history. |
| Best-score lists and selected daily scores of ranked players, with basic map details and records of how the scores were picked | Progress and comparisons. Private: comparisons show only group figures (medians and shares) of at least five players ranked near someone, never another player's name, ID or list. |
| Play time, account creation date, ranking positions and summaries of what ranked players play | Private community statistics, and choosing which profiles to read and how often. Not shown unless the operator publishes a summary. |
| A daily copy of Rhythia's public leaderboard: the top 50,000 players in Standard and the top 200 in Spin and VR, with ID, position, rhythm points and country, but no names | Private counts and summaries, such as players new to the leaderboard or rank changes. Not shown by the service. |
| An hourly check of the top 5,000 leaderboard (position, rhythm points and play count), a trial that ended on November 6, 2026 | Testing a lighter way to read profiles. Private, and deleted within 30 days of being read. |
| The last ban status seen, and when | To check why a profile cannot be read. Private and never shown. A missing profile is not taken to be banned. |
| Maps: Rhythia's public map details and lists, including each mapper's public name and ID, and how each map plays, worked out from its file | Reimagined's map features (map types and map search). The notes themselves stay private. A map the service does not know can be asked for from its map page; it is read within a day (at most 300 such maps a day). A few maps are deliberately given a different type, depending on the access key, so copies of the map types can be recognised. |
| Optional visit reports from Reimagined's Classic look: the viewed player's ID and counts | To find public profiles to collect. Private; a report never names the visitor's account. |
| Connection information: IP address, what was asked for, time and the answer | To answer, keep fair limits and stop abuse. Counters are never saved and are cleared at the end of each day, and the seven-day totals used to set future limits no longer name the key or address once the day ends. The operator sees a private report of keys and addresses that hit the limits and can block them. The service's own log keeps only a shortened address. |
| Access keys | To give full history to Reimagined and limit automated copying. Keys are checked, not stored; only a daily count of keys used and issued is kept. |
| Diagnostics: unexpected answers from Rhythia's API | To find and fix collection problems. Private. |
| Requests and exclusions | To handle your requests and make sure a removed player is not collected again. |

The service does not get anyone's game sign-in, friends list or Reimagined settings. Asking for a player's history tells the service which public profile was asked about, even with visit reports off.

## Where it comes from

Player data comes from Rhythia's official public API and the optional visit reports. Connection information, such as the IP address, comes from whoever uses the service. Rhythia keeps the original game records; this service keeps its own copy and decides how it is used. Capo Games has accepted this use of its API, but that does not replace data-protection duties.

The service reads players in Rhythia's top 5,000 every day, and a limited number of profiles recently opened by Reimagined users who turned on visit reports. A player who leaves the top 5,000 is read less often for 60 days, then not at all until they return. Once a day it also copies Rhythia's public leaderboard of the top 50,000 players, and it keeps mappers' public names and IDs with their maps, so map search can find maps by mapper. Stopping the reading does not by itself delete the history, and neither does Rhythia reporting a profile as missing; a removal request does.

## Legal basis

The legal basis is legitimate interests (Article 6(1)(f) GDPR): keeping community progress records and comparisons from limited public game data. An assessment dated October 18, 2026 weighs this against the effects on players, including younger players, long keeping and public access. It does not settle everything while players who do not use Reimagined are not yet told directly (see Still being worked on). A visitor turning on online history is not the collected player's consent.

## Who can see or receive it

- **Anyone** can see one player's history, without an account. Full history goes to Reimagined copies with an access key; without a key, only the last three days. There is no bulk download, though limits cannot fully stop someone from copying histories one by one.
- **OVHcloud** hosts the service. **Cloudflare** delivers and protects it and keeps encrypted backups in the EU.
- **Email**: OVHcloud handles mail. Older messages remain in a Gmail account during a transition, and Gmail gets bare new-mail alerts without the sender, subject or contents.
- **Discord**: the operator's alerts use counts and general causes, without player IDs. Some older alerts may still hold earlier details, and Discord keeps messages under its own rules, apart from the service's 14-day cleanup.
- **An AI service** helps review changes to the service's code and to Rhythia's public website. Requests go through OpenRouter to an AI provider it picks, set up so that nothing is kept or used for training. Player histories, scores, visit reports and messages are kept out of what it gets; a filter also removes files that look sensitive, though it cannot catch everything. It makes no decisions about players.

Some providers can process data outside the European Economic Area. OVHcloud and Cloudflare do so under their data-processing terms ([OVHcloud](https://contract.eu.ovhapis.com/1.0/pdf/OVH_Data_Protection_Agreement-pl.pdf), [Cloudflare](https://www.cloudflare.com/cloudflare-customer-dpa/)). Gmail is a consumer service with no such agreement ([Google](https://support.google.com/policies/answer/9581826?hl=en)), Discord follows its own [privacy terms](https://discord.com/privacy), and whether [OpenRouter's terms](https://openrouter.ai/docs/guides/features/zdr) cover this account is still being checked. Data is never sold or used for advertising, credit or lending. A new purpose would need a new assessment and an updated notice.

## Retention

| What | How long |
| --- | --- |
| Player history | While the service runs, reviewed at least once a year; removed when a removal request is granted. |
| Selected daily scores and the scores behind community statistics | Six months. |
| Best-score lists | While a score is on the list, then six months; monthly summaries 24 months. |
| Daily leaderboard copies | 90 days; one copy a week for a year; the first of each month without a set end. |
| Play time | 13 months. The account creation date and the last ban status stay as long as the player's record. |
| Ranking positions | Until a year after the player was last in the top 5,000. |
| Map details | Without a set end. |
| Visit reports | 14 days. |
| Connection counters and temporary blocks | Never saved; cleared at the end of each day. A block lasts at most 4 hours. Blocklist entries stay only while needed to stop the abuse. |
| Diagnostic records | 14 days. |
| Request emails | Until the request is closed, then at most 90 days. A short record of the result is kept for 12 months, and a record that stops collection as long as it is needed. |
| Backups | Encrypted. Automatic copies expire after 31 to 180 days. Copies mailed to Gmail before October 25, 2026 are removed by hand on the same schedule. A removed player stays in backups until those copies go, and a restored backup gets current removals applied before use. |

A specific dispute or legal duty can justify a documented exception. The service's own connection log keeps only the newest entries; older ones are overwritten. Providers keep their own logs under their own rules.

## Requests and contact

Email [privacy@shuriel.com](mailto:privacy@shuriel.com) with a link to the profile or its ID and what you want: to see, correct, remove or limit the data, or to object to its use. You do not need to delete your game account first. For Rhythia's own records, contact Rhythia.

A public link alone does not prove that a profile is yours. If there is reasonable doubt, a simple check is arranged privately; screen sharing is never required. Never send passwords, sign-in data, recovery codes or identity documents. Connection and visit records do not name accounts, so they may not be found by a nickname, and the service does not collect more data just to find them.

Removal first stops further collection, then deletes the player's history, scores, statistics and diagnostics; the player is also left out of the stored leaderboard copies, and a short record keeps them from being collected again. Copies others already made cannot be recalled. Requests are answered within one month as a rule; if more time is needed, you are told why within that month, and a refusal says why. You can also complain to a data-protection authority, such as [UODO](https://uodo.gov.pl/) in Poland.

## Still being worked on

- Completing the identification of the person responsible for the service.
- How to inform players who do not use Reimagined, or whether an exception applies.
- The roles and transfer terms of some providers.
- Reviewing older recovery archives, project copies and earlier mail.

This notice will be updated as these are settled. For data in your browser, see the [extension notice](PRIVACY.md); for using the service, see the [history Terms](HISTORY-TERMS.md).
