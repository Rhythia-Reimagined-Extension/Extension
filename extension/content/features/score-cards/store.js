// ============================================================================
// Rhythia Reimagined — Score Card Store (State, Preferences & Pinned Scores)
// ============================================================================

var RhythiaX = RhythiaX || {};

(function () {
  'use strict';

  const STORAGE_KEY_PINNED = 'rhythiax_pinned_scores';
  const STORAGE_KEY_VARIANT = 'rhythiax_scorecard_variant';
  const STORAGE_KEY_VIEWMODE = 'rhythiax_scorecard_viewmode';

  let currentVariant = 'variant_a';
  let currentViewMode = 'list';
  const pendingPins = new Set();

  // --------------------------------------------------------------------------
  // Variant Management
  // --------------------------------------------------------------------------
  function normalizeVariant(v) {
    const str = String(v || '').toLowerCase().trim();
    if (str === 'variant_b' || str === 'eclipse' || str === 'glass_eclipse') return 'variant_b';
    if (str === 'variant_c' || str === 'ribbon' || str === 'pro_ribbon') return 'variant_c';
    return 'variant_a'; // default flagship
  }

  function getVariant() {
    return currentVariant;
  }

  async function saveCardPreference(key, value) {
    const res = await chrome.storage.local.get('rhythiaxModuleOptions');
    const options = res?.rhythiaxModuleOptions || {};
    await chrome.storage.local.set({ rhythiaxModuleOptions: {
      ...options, scoreCards: { ...options.scoreCards, [key]: value }
    } });
  }

  async function setVariant(variant, broadcast = true) {
    currentVariant = normalizeVariant(variant);
    try {
      if (typeof chrome !== 'undefined' && chrome?.storage?.local) {
        await saveCardPreference('cardLayout', currentVariant);
      } else if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY_VARIANT, currentVariant);
      }
    } catch (_) {
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(STORAGE_KEY_VARIANT, currentVariant);
        }
      } catch (__) {}
    }

    if (broadcast && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('rhythiax:scorecard-variant-changed', {
        detail: { variant: currentVariant }
      }));
    }
    return currentVariant;
  }

  // --------------------------------------------------------------------------
  // View Mode Management (List / Grid)
  // --------------------------------------------------------------------------
  function normalizeViewMode(vm) {
    const str = String(vm || '').toLowerCase().trim();
    return str === 'grid' ? 'grid' : 'list';
  }

  function getViewMode() {
    return currentViewMode;
  }

  async function setViewMode(mode, broadcast = true) {
    currentViewMode = normalizeViewMode(mode);
    try {
      if (typeof chrome !== 'undefined' && chrome?.storage?.local) {
        await saveCardPreference('playerView', currentViewMode);
      } else if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY_VIEWMODE, currentViewMode);
      }
    } catch (_) {
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(STORAGE_KEY_VIEWMODE, currentViewMode);
        }
      } catch (__) {}
    }

    if (broadcast && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('rhythiax:scorecard-viewmode-changed', {
        detail: { viewMode: currentViewMode }
      }));
    }
    return currentViewMode;
  }

  // --------------------------------------------------------------------------
  // Pinned Scores Management
  // --------------------------------------------------------------------------
  function getPinnedScores() {
    return RhythiaX.ScoreCardService?.getPinnedScores?.()
      || RhythiaX.profileHistoryContext?.scoreSets?.pinnedScores || [];
  }

  function isPinned(scoreId) {
    return getPinnedScores().some(score => String(score.scoreId || score.id || '') === String(scoreId));
  }

  async function loadPreferences() {
    // Preferences belong to extension storage; pins belong exclusively to Rhythia.
    try {
      if (typeof chrome !== 'undefined' && chrome?.storage?.local) {
        const res = await chrome.storage.local.get(['rhythiaxModuleOptions']);
        const options = res?.rhythiaxModuleOptions?.scoreCards;
        currentVariant = normalizeVariant(options?.cardLayout);
        currentViewMode = normalizeViewMode(options?.playerView);
        await chrome.storage.local.remove(STORAGE_KEY_PINNED);
        if (chrome.storage.sync?.remove) await chrome.storage.sync.remove(STORAGE_KEY_PINNED);
      } else if (typeof localStorage !== 'undefined') {
        currentVariant = normalizeVariant(localStorage.getItem(STORAGE_KEY_VARIANT));
        currentViewMode = normalizeViewMode(localStorage.getItem(STORAGE_KEY_VIEWMODE));
      }
      if (typeof localStorage !== 'undefined') localStorage.removeItem(STORAGE_KEY_PINNED);
    } catch (error) {
      console.warn('RhythiaX: Could not load score card preferences:', error);
    }
    if (typeof window !== 'undefined' && typeof CustomEvent !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new CustomEvent('rhythiax:scorecard-variant-changed', { detail: { variant: currentVariant } }));
      window.dispatchEvent(new CustomEvent('rhythiax:scorecard-viewmode-changed', { detail: { viewMode: currentViewMode } }));
    }
  }

  async function togglePin(scoreData, desiredPinned) {
    if (!scoreData) return false;
    const isOwn = typeof RhythiaX.isOwnProfile === 'function' ? RhythiaX.isOwnProfile() : false;
    if (!isOwn) {
      showToast('You can only pin scores on your own profile', 'error');
      return false;
    }
    const sid = String(scoreData.scoreId || scoreData.id || '');
    if (!sid) return false;

    const previousPinned = isPinned(sid);
    const willPin = typeof desiredPinned === 'boolean' ? desiredPinned : !previousPinned;
    if (pendingPins.size) return previousPinned;
    const profileContext = RhythiaX.profileHistoryContext;
    const playerId = profileContext?.playerId || RhythiaX.ProfilePageAdapter?.playerId?.();

    // Call Rhythia official backend API to persist pin to player account
    const sessionToken = typeof RhythiaX.getRhythiaAuthToken === 'function'
      ? RhythiaX.getRhythiaAuthToken()
      : ((typeof localStorage !== 'undefined' ? localStorage.getItem('rhythia_auth_session_v1') : '') || '');

    if (!sessionToken) {
      showToast('Please sign in to Rhythia to pin scores to your profile', 'error');
      return previousPinned;
    }

    pendingPins.add(sid);
    let pinnedScores;
    try {
      const resp = await fetch('https://production.rhythia.com/api/setScorePinned', {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
        body: JSON.stringify({
          session: sessionToken,
          scoreId: Number(sid) || sid,
          pinned: willPin
        })
      });
      const data = await resp.json().catch(() => null);
      if (!resp.ok || data?.error || !Array.isArray(data?.pinnedScores)) {
        const msg = data?.error || `Pin request failed (${resp.status})`;
        showToast(`Pin failed: ${msg}`, 'error');
        return previousPinned;
      }
      pinnedScores = RhythiaX.dedupeScores(RhythiaX.mapApiScores(data.pinnedScores));
    } catch (err) {
      console.warn('RhythiaX: Pin API request failed:', err);
      showToast('Pin failed: network error', 'error');
      return previousPinned;
    } finally {
      pendingPins.delete(sid);
    }

    if (playerId && typeof RhythiaX.invalidatePlayerScoreSets === 'function') {
      RhythiaX.invalidatePlayerScoreSets(playerId);
    }
    // An API response from a previous profile must not replace the new profile's list.
    if (RhythiaX.profileHistoryContext !== profileContext) return willPin;
    if (RhythiaX.profileHistoryContext?.scoreSets) {
      RhythiaX.profileHistoryContext.scoreSets.pinnedScores = pinnedScores;
    }
    showToast(willPin ? 'Score pinned to profile!' : 'Score unpinned from profile', willPin ? 'success' : 'info');

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('rhythiax:pinned-changed', {
        detail: { scoreId: sid, isPinned: willPin, scoreData, pinnedScores }
      }));
    }
    return willPin;
  }

  // --------------------------------------------------------------------------
  // Modern Toast Notifications
  // --------------------------------------------------------------------------
  function showToast(message, type = 'info') {
    if (typeof document === 'undefined' || !document.body) return;

    let container = document.querySelector('.rhythiax-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'rhythiax-toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `rhythiax-toast rhythiax-toast-${type}`;

    let icon = '';
    if (type === 'success') {
      icon = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#22c55e" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>';
    } else if (type === 'error') {
      icon = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#ef4444" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>';
    } else {
      icon = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#38bdf8" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><circle cx="12" cy="8" r="1"/></svg>';
    }

    toast.innerHTML = icon;
    const label = document.createElement('span');
    label.textContent = String(message ?? '');
    toast.appendChild(label);
    container.appendChild(toast);

    if (typeof requestAnimationFrame !== 'undefined') {
      requestAnimationFrame(() => toast.classList.add('rhythiax-toast-visible'));
    } else {
      toast.classList.add('rhythiax-toast-visible');
    }

    setTimeout(() => {
      toast.classList.remove('rhythiax-toast-visible');
      setTimeout(() => {
        toast.remove();
        if (container && !container.children.length) container.remove();
      }, 250);
    }, 2800);
  }

  // --------------------------------------------------------------------------
  // Storage Change Listener (instant live reload on layout switch in popup)
  // --------------------------------------------------------------------------
  if (typeof chrome !== 'undefined' && chrome?.storage?.onChanged) {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local') {
        if (changes.rhythiaxModuleOptions?.newValue?.scoreCards?.cardLayout) {
          const next = normalizeVariant(changes.rhythiaxModuleOptions.newValue.scoreCards.cardLayout);
          if (next !== currentVariant) {
            currentVariant = next;
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('rhythiax:scorecard-variant-changed', {
                detail: { variant: currentVariant }
              }));
            }
          }
        }
        const oldDateFormat = changes.rhythiaxModuleOptions?.oldValue?.appearance?.dateFormat || changes.rhythiaxModuleOptions?.oldValue?.scoreCards?.dateFormat;
        const newDateFormat = changes.rhythiaxModuleOptions?.newValue?.appearance?.dateFormat || changes.rhythiaxModuleOptions?.newValue?.scoreCards?.dateFormat;
        const oldModIcons = changes.rhythiaxModuleOptions?.oldValue?.scoreCards?.showModIcons;
        const newModIcons = changes.rhythiaxModuleOptions?.newValue?.scoreCards?.showModIcons;
        const oldModText = changes.rhythiaxModuleOptions?.oldValue?.scoreCards?.showModText;
        const newModText = changes.rhythiaxModuleOptions?.newValue?.scoreCards?.showModText;
        if (newDateFormat !== oldDateFormat || newModIcons !== oldModIcons || newModText !== oldModText) {
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('rhythiax:scorecard-variant-changed', {
              detail: { variant: currentVariant }
            }));
          }
        }
        if (changes.rhythiaxModuleOptions?.newValue?.scoreCards?.playerView) {
          const next = normalizeViewMode(changes.rhythiaxModuleOptions.newValue.scoreCards.playerView);
          if (next !== currentViewMode) {
            currentViewMode = next;
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('rhythiax:scorecard-viewmode-changed', {
                detail: { viewMode: currentViewMode }
              }));
            }
          }
        }

      }
    });
  }

  // Initial load
  const ready = loadPreferences();

  RhythiaX.ScoreCardStore = {
    getVariant,
    setVariant,
    getViewMode,
    setViewMode,
    isPinned,
    getPinnedScores,
    togglePin,
    loadPreferences,
    loadPinnedScores: loadPreferences,
    ready,
    showToast,
  };
})();
