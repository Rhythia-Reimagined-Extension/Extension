// =============================================
// Reimagined for Rhythia — Install in Atlas
// =============================================
// Atlas for Rhythia is Shuriel's desktop app. When a player turns on "Install in Atlas" in the popup
// (modules.atlasLinks, off by default), map and collection pages show a link that opens Atlas through its own
// atlas:// address. The browser asks before it opens the app, and Atlas asks again before it installs anything.
//
// Paired with Atlas in the popup (background/atlas-bridge.js), a click goes straight to Atlas instead: the map
// installs at once, a collection opens in Atlas, and the link says so for a moment. Not connected, or a click a
// script made rather than the player, the plain link works as before.
//
// The link carries only the public number of the map or collection; nothing about the player or their account goes
// to Atlas. It is a plain link, so it needs no extension permission: adding a permission would make Chrome switch
// the extension off on update until the player turns it on again.
//
// Loaded by Exodus (pages/map.js, pages/collections.js) and Classic (content/features/atlas-link/button.js).

var RhythiaX = RhythiaX || {};

RhythiaX.AtlasLink = (function () {
  'use strict';

  const KINDS = ['map', 'collection'];
  const LABEL = 'Install in Atlas';
  const TIP = 'Opens the Atlas app on this computer. Your browser asks first.';
  const SHAPE = /^atlas:\/\/install\/(map|collection)\/(\d{1,10})$/;
  const SAY_MS = 2500;

  // atlas://install/<map|collection>/<id>, or '' for anything else. Atlas reads the same shape (1 to 10 digits).
  function href(kind, id) {
    const n = Number(id);
    return KINDS.includes(kind) && Number.isInteger(n) && n > 0 && n < 1e10 ? `atlas://install/${kind}/${n}` : '';
  }

  // Whether the background is connected to Atlas, asked when the page opens and when it is shown again.
  let connected = false;
  function ask() {
    try {
      chrome.runtime.sendMessage({ type: 'rhythiax-atlas-status' })
        .then(s => { connected = s?.state === 'connected'; }, () => { connected = false; });
    } catch (_) { connected = false; }
  }

  function say(link, text) {
    const label = link.dataset.rhythiaxAtlasLabel || link.textContent;
    link.dataset.rhythiaxAtlasLabel = label;
    link.textContent = text;
    clearTimeout(link.rhythiaxAtlasTimer);
    link.rhythiaxAtlasTimer = setTimeout(() => { link.textContent = label; }, SAY_MS);
  }

  function clicked(e) {
    const link = e.target?.closest?.('a[href]');
    const m = link && SHAPE.exec(link.getAttribute('href'));
    if (!m || !connected || !e.isTrusted || e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey) return;
    e.preventDefault();
    e.stopPropagation();
    const [, kind, id] = m;
    chrome.runtime.sendMessage({ type: 'rhythiax-atlas-install', kind, id: Number(id) }).then(answer => {
      if (!answer?.ok && !answer?.text) { connected = false; location.href = href(kind, id); return; }
      if (!answer.ok) { say(link, 'Atlas: ' + answer.text); return; }
      if (kind === 'collection') say(link, 'Opened in Atlas');
      else say(link, answer.queued ? 'Sent to Atlas' : answer.already ? 'Already in your game' : 'Sent to Atlas');
    }, () => { connected = false; location.href = href(kind, id); });
  }

  // Once per tab, even when both looks load this file.
  if (typeof document !== 'undefined' && typeof chrome !== 'undefined' && chrome.runtime?.sendMessage && !RhythiaX.atlasClicks) {
    RhythiaX.atlasClicks = true;
    document.addEventListener('click', clicked, true);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) ask(); });
    ask();
  }

  return { LABEL, TIP, href };
})();
