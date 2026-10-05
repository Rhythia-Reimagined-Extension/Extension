# Installation — Rhythia Reimagined 1.2.0

## Chrome and compatible browsers

Use the [Chrome Web Store listing](https://chromewebstore.google.com/detail/rhythia-reimagined/ekjfnmfocjohkiieakohbnagjcdbfolb) and choose **Add to Chrome**, then open [Rhythia](https://rhythia.com). Store installations receive automatic updates.

Chrome 116+ is supported, along with compatible versions of Edge, Brave, Opera, and Opera GX. Check the listing for its published version; this repository contains the 1.2.0 source.

## Manual Chromium installation

1. Download and extract the [public source](https://github.com/Rhythia-Reimagined-Extension/Extension).
2. Open `chrome://extensions/` and enable **Developer mode**.
3. Choose **Load unpacked** and select the downloaded `extension` folder.

## Firefox desktop 140+

The Firefox package uses a separate manifest. There is no signed Firefox installer or published AMO listing supplied with this source release.

For temporary testing, extract the prepared Firefox ZIP, open `about:debugging` → **This Firefox** → **Load Temporary Add-on**, and select its `manifest.json`. The shared source is in `extension/`; `firefox/manifest.json` contains the Firefox-specific manifest.

Temporary add-ons are removed when Firefox closes. Permanent installation requires Mozilla signing. Firefox for Android has not been validated for this release.

## First setup and updates

Open Rhythia after installation or updating. A small card in the corner introduces online history. Choose **Use online history** or **Keep it local**. Profile visit reports start off; you can enable them separately in the popup. No extra setup tab opens, and community connections stay off until you choose. You can change these settings later in the popup.

Firefox also shows a browser data-consent prompt for the extension's features. Your Rhythia session is used only with the official game API, never the community service. See [Privacy](PRIVACY.md).

Updating from 1.1.0 automatically migrates supported saved history and settings. See the [changelog](changelog.md) and [Data and Sync](DATA-AND-SYNC.md).
