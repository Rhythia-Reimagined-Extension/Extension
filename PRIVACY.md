# Privacy — Reimagined for Rhythia

Updated November 7, 2026. This notice covers Reimagined for Rhythia 1.5.0 and both of its looks, Classic and Exodus. A store may still show an older copy while an update is under review.

Maintainer: **Shuriel** · [contact@shuriel.com](mailto:contact@shuriel.com)

Reimagined for Rhythia is an independent fan extension; Rhythia does not make it. The optional player-history service has its own [privacy notice](HISTORY-PRIVACY.md).

## In short

- Reimagined works in your browser. Your settings, themes, local history, scores and friends stay on your device; none of it is uploaded to the maintainer.
- Your Rhythia sign-in is used only with Rhythia's own site, the same way rhythia.com uses it. It is never sent anywhere else.
- **Online history** is optional and off until you choose it. With it on, Reimagined asks its history service about the players and maps you open, by their public IDs (the numbers in Rhythia's links), with a random number for this copy of Reimagined so the service can keep fair daily limits. That number says nothing about you, your game account or your browser.
- Like any website, the history service sees your IP address while it answers. It uses it only to answer, keep those limits and stop abuse; the [service notice](HISTORY-PRIVACY.md) says for how long.
- No selling of data, no ads or ad trackers, no reading of other websites. **This device** in the popup turns online history off at any time.

## What stays in your browser

| What | Why |
| --- | --- |
| Public game data you open: players (ID, name, avatar and the country on their game profile), scores, ranks, maps and artwork | To show score cards, progress, comparisons and playstyle. |
| Your Rhythia sign-in | To load Rhythia's own features and do what you ask: pin scores and, in Exodus, edit your profile and settings, add and remove friends, set your showcase, wear items, use a Name Change, edit collections, invite to or leave a clan, read notifications, answer clan invites, report a player, post comments and replies, like or dislike a map, delete skins you shared and, for Team Ranked members, qualify or veto a map. These go to Rhythia as if you did them on rhythia.com. Reimagined does not copy your sign-in into its own storage. |
| Settings and your own themes | To remember your choices, including a picture or video you pick for a theme and your last 6 uploads. They stay until you delete them. |
| Local history and saved pages | To show progress over time and open recent pages at once. Saved pages can include your own profile while you are signed in. |
| Map types | With online history, the history service gives them. Without it, if you turn on Map types without online history (off by default), Reimagined works out an approximate type in your browser from the map files on Rhythia's servers; nothing goes to the history service. Exodus in 1.4.0 and earlier reads these files without that option: on map and score pages, and in Playstyle, Scores and Compare for every map the history service gives no type for. |
| Title memory | For the last 60 profiles you opened in each look, the RP and rank the title panel showed, so it moves only by what changed. |
| Recent connection results | The last 30 (player, time and result), to help find problems with online history. |
| Access key (a random number) | With online history only: lets the service give this copy full history and keep fair limits. Rhythia's pages never see it. It is renewed about every 20 days and removed when you choose This device. If the service turns down a key request, Reimagined notes only when it may ask again; the note is gone when the browser closes or you choose This device. |

Reimagined does not read your browsing history or other websites, and it never asks for passwords, payment details, private messages, your camera, microphone or screen.

## What is sent, and to whom

- **Rhythia.** Requests for the game data the pages show, your sign-in when a feature needs it, and the actions you choose. Pictures, replays and videos load from the addresses Rhythia gives, which can be other companies' servers. In Exodus, a picture in a player's About me loads from the site that player linked. Links to other sites follow those sites' own rules.
- **The history service** (`rhythia.shuriel.com`), only with online history on: the public IDs of the players you open (on Exodus leaderboards, up to 50 at once) and, for Near your rank and Nearby, the game mode; the IDs of the maps on the page you open; the filters of a Reimagined Search; and the access key. So the service learns which public profiles were asked about, even with visit reports off. Search filters are used only to answer: they are never saved in its database or logs, only held briefly to answer repeat searches and count daily limits. The service also sends Reimagined's release notes; that request carries no player ID. OVHcloud hosts the service and Cloudflare delivers and protects it; both see connection information such as your IP address. The [service notice](HISTORY-PRIVACY.md) says what the service keeps, for how long, and who else helps run it.
- **Profile visit reports** are a separate choice, off by default and sent only by Classic. A report holds only the viewed player's public ID, never your own account. Reports point the service to public profiles it can start collecting.
- **The maintainer**, only when you email: your message and what you attach.

Requests to Rhythia and to the history service use HTTPS; a picture in a player's About me loads from whatever address that player gave, which may not be secure. The service's player history comes from its own reading of Rhythia's public data, never from your local history. Turning online history off does not stop the service from collecting public game data, and turning it on is not consent from the players the service collects.

**This device** (Local Only) stops every request to the history service, including reports and online release notes, and removes history downloaded from it. Rhythia's own features keep working. What was already sent cannot be called back.

## Storage and clearing data

- **Clear history** removes local history, downloaded history, Exodus saved pages and the list of recent profile visits. It keeps your settings, own themes and the access key, and does not touch data kept with Rhythia's site data. It deletes nothing on the history service or in your Rhythia account; to have the service remove a player's history, see its [notice](HISTORY-PRIVACY.md#requests-and-contact).
- **Reset settings** brings back the default settings and the Classic look. Your own themes are kept but none is active; your history and your online-history choice stay.
- The popup's Data tab can save your settings and own themes to a file on your device. That file is never uploaded.
- Removing the extension deletes its storage. Some caches are kept with Rhythia's site data; clearing that can sign you out of Rhythia.

Everything here stays on your device and is not synced through your browser account. Profile history covers up to 90 days and at most 25 MB. Exodus saved pages last up to 7 days and short rank histories 3 days. Map details are kept 30 days and map types up to a year (at most 800 maps). Settings, own themes and recent searches stay until you change or clear them, and some short-lived information lasts only until the browser closes. The maintainer cannot see or delete any of it remotely.

## Contact

Email [contact@shuriel.com](mailto:contact@shuriel.com). Mail is handled by OVHcloud; older messages may still sit in a former Gmail account. Never send passwords, sign-in data, recovery codes or identity documents. You can ask what the maintainer holds about you, such as your emails, and have it corrected or deleted, and you can complain to a data-protection authority, such as [UODO](https://uodo.gov.pl/) in Poland. Requests about player history, its removal or stopping its collection are in the [service notice](HISTORY-PRIVACY.md#requests-and-contact). Your Rhythia account itself belongs to Rhythia.

Reimagined uses data only for the features above, their support and security, and what the law requires, in line with the Chrome Web Store's Limited Use rules. Changes to this notice are listed in the [changelog](changelog.md). [Data and Sync](DATA-AND-SYNC.md) explains the controls in more detail, and the [Terms](TERMS.md) cover using the project.
