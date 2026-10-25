// ============================================================================
// Reimagined for Rhythia — Score Card Service (Scores Hub & Tab Lifecycle)
// ============================================================================

var RhythiaX = RhythiaX || {};

(function () {
  'use strict';

  // Rhythia's own score sections and sub-tabs (hub-native.js) and the hub's controls (hub-controls.js).
  const Native = RhythiaX.ScoreHubNative;
  const Controls = RhythiaX.ScoreHubControls;

  const DEFAULT_PAGE_SIZE = 10;

  function getSavedPageSize() {
    try {
      if (typeof localStorage !== 'undefined') {
        const val = localStorage.getItem('rhythiax_scores_pagesize');
        if (val === 'all') return 'all';
        const num = Number(val);
        if (num === 10 || num === 20 || num === 50) return num;
      }
    } catch (_) {}
    return DEFAULT_PAGE_SIZE;
  }

  function savePageSize(val) {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('rhythiax_scores_pagesize', String(val));
      }
    } catch (_) {}
  }

  const hubState = {
    activeTab: 'top', // 'top' | 'reign' | 'recent'
    page: 1,
    pageSize: getSavedPageSize(),
    searchQuery: '',
    scoreSets: null,
  };

  let lastRenderedTab = null;
  let lastRenderedPage = null;
  let lastHubContainer = null;
  let lastHubPath = null;

  function resetScoresHub() {
    hubState.activeTab = 'top';
    hubState.page = 1;
    hubState.searchQuery = '';
    hubState.scoreSets = null;
    lastRenderedTab = null;
    lastRenderedPage = null;
    lastHubContainer = null;
    lastHubPath = null;
  }

  function getScoreKey(score) {
    if (!score) return '';
    return String(score.id || score.scoreId || `${score.songTitle || score.beatmapTitle || ''}-${score.speed || 1}-${score.accuracy || ''}-${score.rpEarned || ''}`);
  }

  function getActiveProfileMode() {
    // The SPA can retain the previous mode button while replacing the profile.
    const urlMode = new URLSearchParams(window.location.search).get('mode');
    if (urlMode === 'spin' || urlMode === 'vr') return urlMode;
    return 'normal';
  }

  function getScoresForTab(tab, sets) {
    if (!sets) return [];
    const mode = getActiveProfileMode();
    if (mode === 'spin') {
      if (tab === 'reign') return [];
      if (tab === 'recent') return (sets.spinRecentScores || []).slice(0, 20);
      return sets.spinTopScores || [];
    }
    if (mode === 'vr') {
      if (tab === 'reign') return [];
      if (tab === 'recent') return (sets.vrRecentScores || []).slice(0, 20);
      return sets.vrTopScores || [];
    }
    if (tab === 'reign') return sets.reignScores || [];
    if (tab === 'recent') return (sets.recentScores || []).slice(0, 20);
    return sets.topScores || sets.scores || [];
  }

  function filterScores(scores, query, allSets) {
    const q = String(query || '').trim().toLowerCase();
    if (!q) return scores;
    const matchScore = s => {
      const title = String(s.songTitle || s.beatmapTitle || s.title || s.song_name || '').toLowerCase();
      const artist = String(s.artist || s.songArtist || '').toLowerCase();
      const diff = String(s.difficulty || '').toLowerCase();
      const mods = String(s.mods || '').toLowerCase();
      const mapper = String(s.mapper || s.ownerUsername || s.author || (RhythiaX.ScoreCardDomain?.extractMapper ? RhythiaX.ScoreCardDomain.extractMapper(s) : '')).toLowerCase();
      const hash = String(s.songId || s.beatmapHash || '').toLowerCase();
      return title.includes(q) || artist.includes(q) || diff.includes(q) || mods.includes(q) || mapper.includes(q) || hash.includes(q);
    };

    const matches = (scores || []).filter(matchScore);
    if (matches.length > 0 || !allSets) return matches;

    // Fallback: search across all score pools if not found in current tab
    const fallbackPool = [
      ...(allSets.topScores || []),
      ...(allSets.reignScores || []),
      ...(allSets.recentScores || []),
      ...(allSets.allCardScores || []),
      ...(allSets.scores || []),
    ];
    return RhythiaX.dedupeScores ? RhythiaX.dedupeScores(fallbackPool.filter(matchScore)) : fallbackPool.filter(matchScore);
  }

  // --------------------------------------------------------------------------
  // Mount Scores Hub
  // --------------------------------------------------------------------------
  function mountScoresHub(scoreSets) {
    if (!RhythiaX.isModuleEnabled || !RhythiaX.isModuleEnabled('scoreCards')) {
      document.querySelector('.rhythiax-scores-hub')?.remove();
      return null;
    }

    const sets = scoreSets || RhythiaX.profileHistoryContext?.scoreSets;
    if (!sets) return null;
    Native.installModeListener(hub => renderScoresHub(hub, hubState.scoreSets));
    Native.installSubTabListener();
    Native.hideNativeScoreSections();

    const pinnedSec = Native.findPinnedScoresSection();
    const aboutMeSec = Native.findAboutMeSection();
    const col = (pinnedSec && pinnedSec.parentElement) ||
                (aboutMeSec && aboutMeSec.parentElement) ||
                Native.getProfileColumn();

    if (!col) return null;

    let hub = document.querySelector('.rhythiax-scores-hub');
    if (!hub) {
      hub = document.createElement('div');
      hub.className = 'rhythiax-scores-hub rounded-xl border border-line bg-surface p-4 space-y-4';
    }

    hub.style.setProperty('order', '6', 'important');
    const isProfile = Native.isProfileTabActive();
    hub.style.setProperty('display', isProfile ? 'block' : 'none', 'important');

    if (pinnedSec && pinnedSec.parentElement === col) {
      if (hub.previousElementSibling !== pinnedSec || hub.parentElement !== col) {
        pinnedSec.after(hub);
      }
    } else if (aboutMeSec && aboutMeSec.parentElement === col) {
      if (hub.previousElementSibling !== aboutMeSec || hub.parentElement !== col) {
        aboutMeSec.after(hub);
      }
    } else {
      if (hub.parentElement !== col) {
        col.appendChild(hub);
      }
    }

    renderScoresHub(hub, sets);
    renderPinnedScoresSection(col, hub, sets);
    Native.hideNativeScoreSections();
    Native.updateScoresHubVisibility();

    return hub;
  }

  // --------------------------------------------------------------------------
  // Render Scores Hub Content
  // --------------------------------------------------------------------------
  function renderScoresHub(container, sets, direction = 1) {
    // Search and pagination belong to this visit, not to the lifetime of the SPA.
    const path = window.location.pathname;
    if (container !== lastHubContainer || path !== lastHubPath) resetScoresHub();
    lastHubContainer = container;
    lastHubPath = path;
    hubState.scoreSets = sets || hubState.scoreSets || RhythiaX.profileHistoryContext?.scoreSets || {};
    const state = hubState;
    const mode = getActiveProfileMode();
    const isNormalMode = mode === 'normal';

    if (!isNormalMode && state.activeTab === 'reign') {
      state.activeTab = 'top';
    }

    const allTabScores = getScoresForTab(state.activeTab, state.scoreSets);
    // Card positions belong to the full tab, before search and pagination.
    const scorePositions = new Map(allTabScores.map((score, index) => [score, index + 1]));
    const filtered = filterScores(allTabScores, state.searchQuery, state.scoreSets);

    const totalCount = filtered.length;
    const effectivePageSize = state.pageSize === 'all' ? (totalCount || 1) : state.pageSize;
    const totalPages = Math.max(1, Math.ceil(totalCount / effectivePageSize));
    if (state.page > totalPages) state.page = totalPages;
    if (state.page < 1) state.page = 1;

    const startIndex = (state.page - 1) * effectivePageSize;
    const endIndex = Math.min(totalCount, startIndex + effectivePageSize);
    const pageScores = filtered.slice(startIndex, endIndex);
    const pagePositions = pageScores.map(score => scorePositions.get(score) ?? null);

    // 1. Section Header: Title + Score Report Link
    let sectionHeader = container.querySelector(':scope > .rhythiax-scores-section-header');
    if (!sectionHeader) {
      sectionHeader = document.createElement('div');
      sectionHeader.className = 'rhythiax-scores-section-header flex min-h-[52px] flex-wrap items-center justify-between gap-x-2 border-b border-line px-4 py-2 -mx-4 -mt-4 mb-4';
      container.prepend(sectionHeader);
    }

    const playerId = RhythiaX.PageRouteContext?.playerId?.()
      || RhythiaX.ProfilePageAdapter?.playerId?.()
      || (typeof window !== 'undefined' ? window.location.pathname.match(/\/player\/(\d+)/)?.[1] : '')
      || '';

    const scoreReportHref = playerId ? `/player/${playerId}/scores` : '#';

    RhythiaX.setMarkup(sectionHeader, `
      <h2 class="rhythiax-scores-section-title min-w-0 truncate text-base font-bold tracking-wide text-white flex items-center gap-2">
        <svg class="rhythiax-scores-section-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3z"/></svg>
        <span>Scores</span>
      </h2>
      <a class="rhythiax-score-report-btn inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg border font-semibold transition-colors border-line bg-control text-white hover:bg-control-hover h-9 px-3 text-[13px] ml-auto" href="${scoreReportHref}">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="M7 21h10"/><path d="M12 3v18"/><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/></svg>
        <span>Score report</span>
      </a>
    `);

    // 2. Hub Controls Header (hub-controls.js): tabs, page size, List/Grid, search and the top page bar.
    // They change the hub state only through these callbacks.
    const controls = Controls.render(container, sectionHeader, state, {
      sets, mode, totalCount, totalPages, getScoresForTab,
      onTab: tabId => {
        if (state.activeTab !== tabId) {
          state.activeTab = tabId;
          state.page = 1;
          renderScoresHub(container, state.scoreSets);
        }
      },
      onPageSize: newSize => {
        if (state.pageSize !== newSize) {
          state.pageSize = newSize;
          state.page = 1;
          savePageSize(newSize);
          renderScoresHub(container, state.scoreSets);
        }
      },
      onView: nextMode => {
        if (RhythiaX.ScoreCardStore?.setViewMode) {
          RhythiaX.ScoreCardStore.setViewMode(nextMode);
        }
        renderScoresHub(container, state.scoreSets);
      },
      onSearch: query => {
        state.searchQuery = query;
        state.page = 1;
        renderScoresHub(container, state.scoreSets);
      },
      onPage: targetPage => {
        state.page = targetPage;
        renderScoresHub(container, state.scoreSets);
      },
    });
    const currentViewMode = controls.currentViewMode;

    // 3. Score List Container
    let listArea = container.querySelector(':scope > .rhythiax-scores-list');
    if (!listArea) {
      listArea = document.createElement('div');
      listArea.className = 'rhythiax-scores-list';
      container.appendChild(listArea);
    }
    listArea.className = `rhythiax-scores-list ${currentViewMode === 'grid' ? 'is-grid' : 'space-y-3'}`;

    const existingCards = Array.from(listArea.querySelectorAll(':scope > .rhythiax-score-card'));
    const isFirstMount = existingCards.length === 0;
    const isTabChanged = lastRenderedTab !== state.activeTab;
    const isPageChanged = lastRenderedPage !== state.page;
    lastRenderedTab = state.activeTab;
    lastRenderedPage = state.page;

    if (!pageScores.length) {
      if (sets?.isLoading) {
        listArea.innerHTML = '';
        for (let i = 0; i < 5; i++) {
          const skel = document.createElement('div');
          skel.className = 'rhythiax-skeleton-score-card h-[68px] rounded-xl border border-line bg-surface-raised rhythiax-skeleton';
          listArea.appendChild(skel);
        }
      } else {
        listArea.innerHTML = '';
        const emptyBox = document.createElement('div');
        emptyBox.className = 'py-12 text-center text-sm text-neutral-400';
        emptyBox.textContent = state.searchQuery ? 'No scores match your search.' : 'No scores in this category.';
        listArea.appendChild(emptyBox);
      }
    } else {
      const existingKeys = existingCards.map(c => c._rhythiaxScoreKey || getScoreKey(c._rhythiaxScoreData));
      const newKeys = pageScores.map(getScoreKey);
      const isSameList = !isTabChanged && !isPageChanged && existingKeys.length === newKeys.length && existingKeys.every((k, i) => k && k === newKeys[i]
        && (existingCards[i]._rhythiaxScoreData?.rankIndex ?? null) === pagePositions[i]);

      if (!isSameList) {
        // A card for the same score, position, tab, card style and data is kept as it is (search, a
        // fresh answer that moved a few scores); only the others are drawn.
        const variant = RhythiaX.ScoreCardStore?.getVariant?.() || 'variant_e';
        const reuseKey = (scoreData, position) => {
          let data = '';
          try { data = JSON.stringify(scoreData); } catch (_) { return ''; }
          return `${variant}|${state.activeTab}|${position}|${data}`;
        };
        const reusable = new Map();
        if (!isTabChanged) existingCards.forEach(card => { if (card._rhythiaxReuseKey) reusable.set(card._rhythiaxReuseKey, card); });
        const nextCards = [];
        pageScores.forEach((scoreData, idx) => {
          const absoluteIndex = pagePositions[idx];
          const key = reuseKey(scoreData, absoluteIndex);
          let card = key ? reusable.get(key) : null;
          if (card) {
            reusable.delete(key);
            card.classList.remove('rhythiax-score-card-anim');
          } else {
            card = RhythiaX.ScoreCardView.createCardFromScore(scoreData, absoluteIndex, state.activeTab);
            if (!card) return;
            card._rhythiaxScoreKey = getScoreKey(scoreData);
            card._rhythiaxReuseKey = key;
            if (isFirstMount || isTabChanged || isPageChanged) {
              card.classList.add('rhythiax-score-card-anim');
              card.style.setProperty('--card-anim-delay', `${Math.min(idx * 22, 220)}ms`);
            }
          }
          nextCards.push(card);
        });
        listArea.replaceChildren(...nextCards);
      }
    }

    // 4. Pagination Footer (Bottom Spaced: info left, pagination right)
    let paginationArea = container.querySelector(':scope > .rhythiax-scores-pagination');
    if (!paginationArea) {
      paginationArea = document.createElement('div');
      paginationArea.className = 'rhythiax-scores-pagination flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4 text-xs text-neutral-400';
      container.appendChild(paginationArea);
    }
    if (state.pageSize !== 'all' && totalCount > 0) {
      paginationArea.replaceChildren();
      const pageInfo = document.createElement('span');
      pageInfo.className = 'rhythiax-pagination-info';
      pageInfo.textContent = totalPages > 1
        ? `Showing ${startIndex + 1}–${endIndex} of ${totalCount}`
        : `Total: ${totalCount} ${totalCount === 1 ? 'score' : 'scores'}`;
      paginationArea.appendChild(pageInfo);

      const bottomPagination = controls.createPaginationNav((targetPage) => {
        state.page = targetPage;
        renderScoresHub(container, state.scoreSets);
        container.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 'rhythiax-scores-bottom-pagination');
      paginationArea.appendChild(bottomPagination);
    } else {
      paginationArea.style.display = totalCount > 0 ? 'flex' : 'none';
      RhythiaX.setMarkup(paginationArea, `<span>Total: ${totalCount} ${totalCount === 1 ? 'score' : 'scores'}</span>`);
    }
  }

  // --------------------------------------------------------------------------
  // Pinned Scores Section
  // --------------------------------------------------------------------------
  function getEffectivePinnedScores(sets) {
    const currentSets = sets || hubState.scoreSets || RhythiaX.profileHistoryContext?.scoreSets;
    const apiPinned = currentSets?.pinnedScores || [];

    return Array.isArray(apiPinned) ? apiPinned : [];
  }

  function renderPinnedScoresSection(columnEl, hubEl, sets) {
    const pinnedScores = getEffectivePinnedScores(sets);
    let section = document.querySelector('.rhythiax-pinned-scores-section');

    if (!pinnedScores.length) {
      if (section) section.remove();
      return;
    }

    if (!section) {
      section = document.createElement('div');
      section.className = 'rhythiax-pinned-scores-section rounded-xl border border-line bg-surface p-4 space-y-3';
      section.style.setProperty('order', '5', 'important');
      if (hubEl && hubEl.parentElement) {
        hubEl.parentElement.insertBefore(section, hubEl);
      } else if (columnEl) {
        columnEl.prepend(section);
      }
    }

    const currentViewMode = RhythiaX.ScoreCardStore?.getViewMode?.() || 'list';
    section.setAttribute('data-scores-view', currentViewMode);

    let headerEl = section.querySelector('.rhythiax-pinned-header');
    let listWrap = section.querySelector('.rhythiax-pinned-list');

    if (!headerEl || !listWrap) {
      section.innerHTML = `
        <div class="rhythiax-pinned-header flex items-center justify-between border-b border-line pb-3 mb-2">
          <h2 class="text-base font-bold text-white flex items-center gap-2">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="17" x2="12" y2="22"></line><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V4a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v6.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"></path></svg>
            <span>Pinned scores</span>
          </h2>
          <span class="rhythiax-pinned-count text-xs text-neutral-400 font-semibold">${pinnedScores.length} pinned</span>
        </div>
        <div class="rhythiax-pinned-list ${currentViewMode === 'grid' ? 'is-grid' : 'space-y-3'}"></div>
      `;
      listWrap = section.querySelector('.rhythiax-pinned-list');
    } else {
      const countEl = headerEl.querySelector('.rhythiax-pinned-count');
      if (countEl) countEl.textContent = `${pinnedScores.length} pinned`;
      listWrap.className = `rhythiax-pinned-list ${currentViewMode === 'grid' ? 'is-grid' : 'space-y-3'}`;
    }

    const existingCards = Array.from(listWrap.querySelectorAll(':scope > .rhythiax-score-card'));
    const existingKeys = existingCards.map(c => c._rhythiaxScoreKey || getScoreKey(c._rhythiaxScoreData));
    const newKeys = pinnedScores.map(getScoreKey);

    const isSamePinned = existingKeys.length === newKeys.length && existingKeys.every((k, i) => k && k === newKeys[i]);
    if (isSamePinned) {
      return;
    }

    listWrap.innerHTML = '';
    pinnedScores.forEach(scoreData => {
      const card = RhythiaX.ScoreCardView.createCardFromScore(scoreData, null, 'pinned');
      if (card) {
        card._rhythiaxScoreKey = getScoreKey(scoreData);
        card.setAttribute('data-rhythiax-is-pinned', 'true');
        listWrap.appendChild(card);
      }
    });
  }

  // Listen for pin/unpin events to update the pinned section dynamically
  if (typeof window !== 'undefined') {
    window.addEventListener('rhythiax:pinned-changed', (event) => {
      const { scoreId, isPinned, pinnedScores } = event.detail || {};
      // Cache invalidation does not update the snapshots already used by the UI.
      // Apply the server's complete list after either pinning or unpinning.
      if (Array.isArray(pinnedScores) || (scoreId != null && isPinned === false)) {
        const snapshots = new Set([hubState.scoreSets, RhythiaX.profileHistoryContext?.scoreSets]);
        snapshots.forEach(sets => {
          if (sets) {
            sets.pinnedScores = Array.isArray(pinnedScores) ? pinnedScores : (sets.pinnedScores || []).filter(score =>
              String(score.scoreId || score.id || '') !== String(scoreId));
          }
        });
      }
      const activePinned = getEffectivePinnedScores();
      const pinnedIds = new Set(activePinned.map(score => String(score.scoreId || score.id || '')));
      (document.querySelectorAll?.('.rhythiax-score-card') || []).forEach(card => {
        const data = card._rhythiaxScoreData;
        const id = data?.scoreId || data?.id;
        if (id != null) card.setAttribute('data-rhythiax-is-pinned', String(pinnedIds.has(String(id))));
      });
      const hub = document.querySelector('.rhythiax-scores-hub');
      const col = hub?.parentElement || Native.getProfileColumn();
      renderPinnedScoresSection(col, hub, hubState.scoreSets);
    });

    window.addEventListener('rhythiax:scorecard-viewmode-changed', () => {
      const hub = document.querySelector('.rhythiax-scores-hub');
      if (hub) renderScoresHub(hub, hubState.scoreSets);
      const col = hub?.parentElement || Native.getProfileColumn();
      renderPinnedScoresSection(col, hub, hubState.scoreSets);
    });
  }


  RhythiaX.ScoreCardService = {
    getPinnedScores: () => getEffectivePinnedScores(),
    mountScoresHub,
    resetScoresHub,
    getScoresForTab,
    getActiveProfileMode,
    getProfileColumn: Native.getProfileColumn,
    updateScoresHubVisibility: Native.updateScoresHubVisibility,
    profileType: (card) => card?.getAttribute?.('data-rhythiax-score-type') || hubState.activeTab,
  };

  // What the profile page (pages/profile/composition.js) and the route observer call to build the hub.
  RhythiaX.mountScoresHub = mountScoresHub;
})();
