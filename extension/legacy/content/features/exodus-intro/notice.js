// Tells Classic players, once, that the experimental Exodus look is out (a card in shared/notices.js).
// "Try Exodus" switches the look, as the popup does; "No thanks" keeps Classic. Either answer, or Exodus
// switched on some other way, is remembered in rhythiaxExodusIntro and the card never comes back.
var RhythiaX = RhythiaX || {};

(function () {
  if (RhythiaX.ExodusIntro || typeof document === 'undefined' || typeof window === 'undefined') return;
  if (window.top && window.top !== window) return;
  if (typeof chrome === 'undefined' || !chrome?.storage?.local || !RhythiaX.Notices) return;

  const ID = 'exodus-intro', SEEN = '1.3.0';
  let card = null;

  function answer(event, tryIt) {
    if (!event.isTrusted) return;
    card.setBusy(true);
    const values = { rhythiaxExodusIntro: SEEN };
    if (tryIt) values.rhythiaxExodus = true;
    chrome.storage.local.set(values, () => {
      if (chrome.runtime.lastError) {
        card.setBusy(false);
        card.setStatus('Not saved. Try again.');
        return;
      }
      card.close(); card = null;
    });
  }

  function check() {
    if (RhythiaX.extensionContextInvalidated) return;
    chrome.storage.local.get({ rhythiaxExodusIntro: null, rhythiaxExodus: false }, got => {
      if (chrome.runtime.lastError || got.rhythiaxExodusIntro === SEEN) return;
      if (got.rhythiaxExodus === true) { chrome.storage.local.set({ rhythiaxExodusIntro: SEEN }); return; }
      if (card) return;
      card = RhythiaX.Notices.show({
        id: ID,
        label: 'Experimental',
        title: 'Try the new Exodus look',
        body: [
          'A redesign of Rhythia’s profiles, scores, maps and leaderboards.',
          'Switch back to Classic any time in the extension popup.',
        ],
        actions: [
          { text: 'Try Exodus', kind: 'primary', run: event => answer(event, true) },
          { text: 'No thanks', run: event => answer(event, false) },
        ],
      });
    });
  }

  // Marks the notice as set up: the check at the top of this file skips a second run in the same tab.
  RhythiaX.ExodusIntro = {};
  chrome.storage.onChanged?.addListener((changes, area) => {
    if (area !== 'local' || !card) return;
    if (changes.rhythiaxExodusIntro?.newValue === SEEN || changes.rhythiaxExodus?.newValue === true) { card.close(); card = null; }
  });
  if (document.body) check();
  else document.addEventListener('DOMContentLoaded', check, { once: true });
})();
