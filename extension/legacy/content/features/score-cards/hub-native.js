// ============================================================================
// Reimagined for Rhythia — Scores Hub: Rhythia's own score sections and sub-tabs
// ============================================================================
// Finds Rhythia's own sections on a profile (About me, Pinned, Top, Reigning and Recent scores), hides
// its score lists while the Scores Hub shows them, and follows its Profile/Maps/Skins sub-tabs and score
// mode buttons. No hub state here: the service (service.js) passes what a listener should redraw.

var RhythiaX = RhythiaX || {};

(function () {
  'use strict';

  let subTabListenerInstalled = false;
  let modeListenerInstalled = false;

  function getSectionCard(heading) {
    if (!heading) return null;
    let el = heading.parentElement;
    while (el && el !== document.body && el !== document.documentElement) {
      if (el.classList.contains('rhythiax-scores-hub')) return null;
      if (el.parentElement && (el.parentElement.classList.contains('gap-4') || el.parentElement.classList.contains('flex-col'))) {
        return el;
      }
      if (el.classList.contains('rounded-xl') || el.classList.contains('overflow-hidden')) {
        return el;
      }
      el = el.parentElement;
    }
    return heading.parentElement?.parentElement || null;
  }

  function getProfileColumn() {
    const headings = document.querySelectorAll('h1, h2, h3, h4');
    for (const h of headings) {
      if (h.closest('.rhythiax-scores-hub')) continue;
      const t = h.textContent.trim().toLowerCase();
      if (t.includes('about me') || t.includes('pinned scores') || t.includes('statistics') || t.includes('top scores') || t.includes('reigning scores')) {
        const card = getSectionCard(h);
        if (card && card.parentElement && card.parentElement !== document.body) {
          return card.parentElement;
        }
      }
    }
    const hub = document.querySelector('.rhythiax-scores-hub');
    if (hub && hub.parentElement && !hub.parentElement.closest('.rhythiax-scores-hub')) {
      const p = hub.parentElement;
      if (p.classList.contains('gap-4') || p.classList.contains('flex-col') || p.classList.contains('space-y-4')) {
        return p;
      }
    }
    return document.querySelector('#scores-container') || document.querySelector('#root') || document.body;
  }

  function findPinnedScoresSection() {
    const headings = document.querySelectorAll('h1, h2, h3, h4');
    for (const h of headings) {
      if (h.closest('.rhythiax-scores-hub') || h.closest('button, .rhythiax-scores-tabs')) continue;
      if (/pinned scores/i.test(h.textContent.trim())) {
        return getSectionCard(h);
      }
    }
    return null;
  }

  function findAboutMeSection() {
    const headings = document.querySelectorAll('h1, h2, h3, h4');
    for (const h of headings) {
      if (h.closest('.rhythiax-scores-hub') || h.closest('button, .rhythiax-scores-tabs')) continue;
      if (/about me/i.test(h.textContent.trim())) {
        return getSectionCard(h);
      }
    }
    return null;
  }

  function findSubTabButtons() {
    const allButtons = Array.from(document.querySelectorAll('button, a')).filter(el => {
      if (el.closest('header, footer, nav[aria-label="Main"]')) return false;
      return true;
    });

    const profileBtn = allButtons.find(b => {
      const text = b.textContent.trim().toLowerCase();
      if (text !== 'profile') return false;
      const parent = b.parentElement;
      if (!parent) return false;
      const siblingTexts = Array.from(parent.children).map(c => c.textContent.trim().toLowerCase());
      return siblingTexts.includes('maps') || siblingTexts.includes('skins');
    });

    if (!profileBtn || !profileBtn.parentElement) return [];

    const parent = profileBtn.parentElement;
    return Array.from(parent.children).filter(btn => {
      const text = btn.textContent.trim().toLowerCase();
      return text === 'profile' || text === 'maps' || text === 'skins';
    });
  }

  function isProfileTabActive() {
    const tabs = findSubTabButtons();
    if (!tabs || tabs.length < 2) return true;

    const profileBtn = tabs.find(b => b.textContent.trim().toLowerCase() === 'profile');
    if (!profileBtn) return true;

    const otherActive = tabs.some(b => {
      if (b === profileBtn) return false;
      const cls = b.className || '';
      const cleanCls = cls.replace(/hover:[a-zA-Z0-9_-]+/g, '');
      const ariaSelected = b.getAttribute('aria-selected') === 'true' || b.getAttribute('aria-pressed') === 'true';
      return ariaSelected || cleanCls.includes('border-blue') || (!cleanCls.includes('border-transparent') && cleanCls.includes('text-white'));
    });

    return !otherActive;
  }

  function hideNativeScoreSections() {
    if (!RhythiaX.isModuleEnabled || !RhythiaX.isModuleEnabled('scoreCards')) {
      document.querySelectorAll('.rhythiax-native-score-section-hidden').forEach(el => {
        el.classList.remove('rhythiax-native-score-section-hidden');
        el.style.removeProperty('display');
      });
      return;
    }

    const headings = document.querySelectorAll('h1, h2, h3, h4');
    for (const h of headings) {
      if (h.closest('.rhythiax-scores-hub, .rhythiax-pinned-scores-section')) continue;
      const text = h.textContent.trim().toLowerCase();
      if (/^(reigning|top|recent)\s+scores$/i.test(text) ||
          text === 'top scores' || text === 'reigning scores' || text === 'recent scores' ||
          text.includes('reigning scores') || text.includes('top scores') || text.includes('recent scores')) {
        if (!h.closest('button, .rhythiax-scores-tabs')) {
          const card = getSectionCard(h);
          if (card && !card.classList.contains('rhythiax-scores-hub') && !card.classList.contains('rhythiax-pinned-scores-section')) {
            card.classList.add('rhythiax-native-score-section-hidden');
            card.style.setProperty('display', 'none', 'important');
          }
        }
      }
    }

    // Also hide any section container that hosts native score cards or score skeletons
    const nativeCards = RhythiaX.findScoreCards ? RhythiaX.findScoreCards() : [];
    for (const card of nativeCards) {
      if (card.closest('.rhythiax-scores-hub, .rhythiax-pinned-scores-section')) continue;
      const section = getSectionCard(card);
      if (section && !section.classList.contains('rhythiax-scores-hub') && !section.classList.contains('rhythiax-pinned-scores-section')) {
        section.classList.add('rhythiax-native-score-section-hidden');
        section.style.setProperty('display', 'none', 'important');
      }
    }
  }

  function installSubTabListener() {
    if (subTabListenerInstalled) return;
    subTabListenerInstalled = true;
    document.addEventListener('click', (e) => {
      const tabBtn = e.target.closest?.('button, a');
      if (!tabBtn) return;
      const text = tabBtn.textContent.trim().toLowerCase();
      if (text === 'profile' || text === 'maps' || text === 'skins') {
        updateScoresHubVisibility();
        RhythiaX.afterNativeChange(tabBtn.parentElement, updateScoresHubVisibility);
      }
    }, true);
  }

  // onModeChange(hub) draws the hub again once Rhythia has switched its score mode (Normal, Spin, VR).
  function installModeListener(onModeChange) {
    if (modeListenerInstalled) return;
    modeListenerInstalled = true;
    document.addEventListener('click', (e) => {
      const modeBtn = e.target.closest?.('[role="group"][aria-label="Profile score mode"] button');
      if (!modeBtn) return;
      RhythiaX.afterNativeChange(modeBtn.closest('[role="group"]'), () => {
        const hub = document.querySelector('.rhythiax-scores-hub');
        if (hub) onModeChange(hub);
      });
    }, true);
  }

  function updateScoresHubVisibility() {
    const hub = document.querySelector('.rhythiax-scores-hub');
    const pinned = document.querySelector('.rhythiax-pinned-scores-section');
    const isProfile = isProfileTabActive();

    if (!isProfile) {
      if (hub) hub.style.setProperty('display', 'none', 'important');
      if (pinned) pinned.style.setProperty('display', 'none', 'important');
    } else {
      if (hub) hub.style.setProperty('display', 'block', 'important');
      if (pinned) pinned.style.removeProperty('display');
      hideNativeScoreSections();
    }
  }

  RhythiaX.ScoreHubNative = {
    getProfileColumn,
    findPinnedScoresSection,
    findAboutMeSection,
    isProfileTabActive,
    hideNativeScoreSections,
    installSubTabListener,
    installModeListener,
    updateScoresHubVisibility,
  };
})();
