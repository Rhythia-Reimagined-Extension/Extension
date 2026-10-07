# Rhythia Reimagined 1.2.0

A fresh look and more useful player profiles for [Rhythia](https://rhythia.com), made by Shuriel.

- Pick Reimagined, Dark, or White themes.
- Explore player stats, playstyle, title progression, and ranking history.
- Compare players and customize score cards.
- Turn individual features on or off in the extension popup.

## Get started

Install from the [Chrome Web Store](https://chromewebstore.google.com/detail/rhythia-reimagined/ekjfnmfocjohkiieakohbnagjcdbfolb), then open Rhythia. Chrome 116+ and compatible Chromium browsers are supported. A separate package is available for testing on Firefox desktop 140+.

This repository contains **1.2.0**. Check the store listing for the version currently available there. See [Installation](INSTALLATION.md) for manual installation and Firefox instructions, or the [changelog](changelog.md) for what's new.

## Your history, your choice

A small card on Rhythia introduces **online history**: see available community ranking history without having to track every profile yourself. Choose **Use online history** to combine it with local records, or **Keep it local**. Profile visit reports are off after this choice and can be enabled separately in the popup.

Community connections start after you confirm your choice. They send public player IDs to `rhythia.shuriel.com`; the service also receives your connection IP. Your Rhythia password and session are never sent there. You can change connection and reporting choices in the popup. Local profile history has fixed limits of 90 days and 25 MB, without protected profiles. Visit reports count at most once per IP and viewed profile per rolling hour; visit statistics are kept for 30 days.

The extension does not upload your scores, friends list, settings, or local history to the community service. A separate crawler builds community history from Rhythia's public API, independently of extension users. Optional visit reports send only the viewed public player ID; the server uses an IP-derived digest for visit deduplication instead of storing raw IPs in telemetry tables. See [Privacy](PRIVACY.md) for infrastructure handling and retention.

## Help and project information

- [Data and Sync](DATA-AND-SYNC.md) — history settings and clearing saved records.
- [Support](SUPPORT.md) — help and bug reports.
- [Privacy](PRIVACY.md) — what data is used and how to request deletion.
- [Security](SECURITY.md) — privately report a security issue.
- [License](LICENSE.md) — reuse and attribution.

This repository contains the public extension source and user documentation.

Rhythia Reimagined is an independent fan project. It is not affiliated with or endorsed by Capo Games or Rhythia.
