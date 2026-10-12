# Store review — 1.2.1

Prepared October 12, 2026. This is a review checklist, not a store approval or legal certification.

## Public links

- Extension privacy: https://shuriel.com/policies/reimagined/#privacy
- Extension terms: https://shuriel.com/policies/reimagined/#terms
- Player history privacy: https://shuriel.com/policies/reimagined/history/#privacy
- Release notes: https://github.com/Rhythia-Reimagined-Extension/Extension/blob/main/changelog.md

Check the live policy pages before entering the URL in either store. Chrome's policy field should use https://shuriel.com/policies/reimagined/ and the listing should reference the same notice.

## Reviewer explanation

Rhythia Reimagined improves how players read and explore Rhythia profiles, scores and progress, with local customization and optional online player history. It processes public player IDs, names, scores and page content locally. Official account features read the existing Rhythia session only to communicate with the official game API; the community service never receives it.

Community history is disabled until the user chooses online history. These requests include the requested public player ID, and the connection exposes an IP address to the service and its infrastructure providers. Separate optional profile-visit reports are off after the initial choice and identify the viewed public profile, not the visiting game account. Their purpose is to discover public profiles for the shared player-history feature. The service may admit these profiles for independent public-API collection; reports do not guarantee an immediate update. They are not advertising analytics or a general browsing tracker.

The popup and first connection choice disclose this handling and link to the service notice before enabling community connections. Local Only blocks new community requests, including reports. Official game features and plain-text GitHub release notes can still connect. Downloaded JSON/Markdown is treated as data, not executable code.

## Data declarations

PII, authentication information, website content and viewed Rhythia profiles/resources are processed. IP falls under the Chrome dashboard's Location examples; no device GPS is requested. User activity should be explained by selected feature actions and optional viewed-profile reports, not by claiming a global click/keyboard/mouse tracker. No health, financial or private-message feature is present. Local-only processing must still be disclosed.

Storage supports settings, local history, temporary caches and saved connection choices. unlimitedStorage supports the application's 25 MB local-history budget beyond the normal storage.local quota; application retention remains bounded. Host permissions correspond to Rhythia pages, the official API, optional community history and GitHub raw release notes.

## Manual acceptance still required

Install the actual Chromium and Firefox packages. On a fresh Rhythia profile, verify the first connection choice, Local Only before any community request, online history with reports still off, separate report opt-in, mode cancellation, Clear Cache, SPA profile navigation and online/offline changelog. Verify policy/terms links and distinguish an update preserving existing choices from a fresh installation.

## Open assessments

The rejection email says the privacy policy omitted necessary collection, handling, storage or sharing information. The expanded policy addresses these explicitly. Purple Nickel also covers prominent disclosure/consent; URL changes alone do not guarantee approval. Before submitting, assess Limited Use for optional profile discovery and the secure-handling requirements, including the browser-storage encryption question. Operator identity, independent-history legal basis and informing non-users, provider arrangements and old copies remain separate open matters. Do not certify these as resolved or submit an appeal claiming the earlier notice was complete without evidence.
