# Reimagined for Rhythia 1.3.1

A fresh look and more useful player profiles for [Rhythia](https://rhythia.com), made by Shuriel.

- Pick Reimagined, Dark, or White themes, or make your own.
- Explore player stats, playstyle, title progression, and ranking history.
- Compare players and customize score cards.
- Turn individual features on or off in the extension popup.
- Choose Classic, which adds to Rhythia's own pages, or the experimental Exodus look with its own pages.

## Get started

Install from the [Chrome Web Store](https://chromewebstore.google.com/detail/rhythia-reimagined/ekjfnmfocjohkiieakohbnagjcdbfolb), then open Rhythia. Chrome 116+ and compatible Chromium browsers are supported. For Firefox desktop 140+, install from [Firefox Add-ons](https://addons.mozilla.org/firefox/addon/rhythia-reimagined/).

This repository contains **1.3.1**. Check the store listings for the version currently available there. See [Installation](INSTALLATION.md) for manual installation and Firefox instructions, or the [changelog](changelog.md) for what's new.

## Your history, your choice

A small card on Rhythia introduces **online history**: see available community ranking history without having to track every profile yourself. Choose **Use online history** to combine it with local records, or **Keep it local**. Profile visit reports are off after this choice and can be enabled separately in the popup.

Community connections start after you confirm your choice. They send public player IDs and this installation's anonymous access key to `rhythia.shuriel.com`; the service also receives your connection IP. Your Rhythia password and session are never sent there. With online history on, release notes also come from that service. You can change choices in the popup. Local profile history has fixed limits of 90 days and 25 MB. Visit-report handling and service retention are described separately in the [history-service notice](HISTORY-PRIVACY.md).

The extension does not upload scores, friends, settings or local history. An independent service builds player history from Rhythia's public API. Its crawler, database and API are separate from the browser extension. Other projects on the same VPS are outside this project's privacy notices. See [extension Privacy](PRIVACY.md) for browser processing and connections.

Rhythia manages its original accounts; Shuriel handles the independent history copy. Public availability does not make data automatically anonymous. You can contact us about that copy without requesting game-account deletion first; see [requests](HISTORY-PRIVACY.md#requests-and-contact).

This branch prepares the 1.3.1 extension release; it does not mean either store has published the update. Operator identification and legal/provider assessments for independently collected history remain open.

## Help and project information

- [Data and Sync](DATA-AND-SYNC.md) — history settings and clearing saved records.
- [Support](SUPPORT.md) — help and bug reports.
- [Privacy](PRIVACY.md) — what data is used and how to request deletion.
- [History service Privacy](HISTORY-PRIVACY.md) — independent collection, public history and requests; draft.
- [Terms](TERMS.md) — extension and history-service use; draft.
- [Security](SECURITY.md) — privately report a security issue.
- [License](LICENSE.md) — reuse and attribution.

This repository contains the public extension source and user documentation.

Reimagined for Rhythia is an independent fan project. It is not affiliated with or endorsed by Capo Games or Rhythia.
