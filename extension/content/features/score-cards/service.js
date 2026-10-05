// ============================================================================
// Rhythia Reimagined — Score Card Service (Scores Hub & Tab Lifecycle)
// ============================================================================

var RhythiaX = RhythiaX || {};

(function () {
  'use strict';

  const DEFAULT_PAGE_SIZE = 20;

  function getSavedPageSize() {
    try {
      if (typeof localStorage !== 'undefined') {
        const val = localStorage.getItem('rhythiax_scores_pagesize');
        if (val === 'all') return 'all';
        const num = Number(val);
        if (num === 20 || num === 50) return num;
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

  let pendingViewSwitch = 0;
  let subTabListenerInstalled = false;
  let modeListenerInstalled = false;

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
        [0, 50, 150, 300].forEach(delay => {
          window.setTimeout(updateScoresHubVisibility, delay);
        });
      }
    }, true);
  }

  function installModeListener() {
    if (modeListenerInstalled) return;
    modeListenerInstalled = true;
    document.addEventListener('click', (e) => {
      const modeBtn = e.target.closest?.('[role="group"][aria-label="Profile score mode"] button');
      if (!modeBtn) return;
      [0, 60, 200].forEach(delay => {
        window.setTimeout(() => {
          const hub = document.querySelector('.rhythiax-scores-hub');
          if (hub) renderScoresHub(hub, hubState.scoreSets);
        }, delay);
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
    installModeListener();
    installSubTabListener();
    hideNativeScoreSections();

    const pinnedSec = findPinnedScoresSection();
    const aboutMeSec = findAboutMeSection();
    const col = (pinnedSec && pinnedSec.parentElement) ||
                (aboutMeSec && aboutMeSec.parentElement) ||
                getProfileColumn();

    if (!col) return null;

    let hub = document.querySelector('.rhythiax-scores-hub');
    if (!hub) {
      hub = document.createElement('div');
      hub.className = 'rhythiax-scores-hub rounded-xl border border-line bg-surface p-4 space-y-4';
    }

    hub.style.setProperty('order', '6', 'important');
    const isProfile = isProfileTabActive();
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
    hideNativeScoreSections();
    updateScoresHubVisibility();

    return hub;
  }

  // --------------------------------------------------------------------------
  // Render Scores Hub Content
  // --------------------------------------------------------------------------
  function populateSearchDatalist(datalist, sets) {
    if (!datalist || !sets) return;
    const seen = new Set();
    const options = [];
    const pools = [
      ...(sets.topScores || []),
      ...(sets.reignScores || []),
      ...(sets.recentScores || []),
      ...(sets.allCardScores || []),
      ...(sets.scores || []),
    ];
    for (const s of pools) {
      const title = s.songTitle || s.beatmapTitle || s.title || s.song_name;
      if (title && !seen.has(title.trim().toLowerCase())) {
        seen.add(title.trim().toLowerCase());
        options.push(title.trim());
      }
      const artist = s.artist || s.songArtist;
      if (artist && !seen.has(artist.trim().toLowerCase())) {
        seen.add(artist.trim().toLowerCase());
        options.push(artist.trim());
      }
      const mapper = s.mapper || s.ownerUsername || s.author || (RhythiaX.ScoreCardDomain?.extractMapper ? RhythiaX.ScoreCardDomain.extractMapper(s) : '');
      if (mapper && !seen.has(mapper.trim().toLowerCase())) {
        seen.add(mapper.trim().toLowerCase());
        options.push(mapper.trim());
      }
      if (options.length >= 120) break;
    }
    const esc = str => String(str).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m]);
    datalist.innerHTML = options.map(val => `<option value="${esc(val)}"></option>`).join('');
  }

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

    sectionHeader.innerHTML = `
      <h2 class="rhythiax-scores-section-title min-w-0 truncate text-base font-bold tracking-wide text-white flex items-center gap-2">
        <svg class="rhythiax-scores-section-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3z"/></svg>
        <span>Scores</span>
      </h2>
      <a class="rhythiax-score-report-btn inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg border font-semibold transition-colors border-line bg-control text-white hover:bg-control-hover h-9 px-3 text-[13px] ml-auto" href="${scoreReportHref}">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="M7 21h10"/><path d="M12 3v18"/><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/></svg>
        <span>Score report</span>
      </a>
    `;

    // 2. Hub Controls Header: Row 1 (Tabs on left, Pagination on right) & Row 2 (Controls & Search)
    let header = container.querySelector(':scope > .rhythiax-scores-hub-header');
    if (!header) {
      header = document.createElement('div');
      sectionHeader.after(header);
    }
    header.className = 'rhythiax-scores-hub-header flex flex-col gap-2.5 w-full';

    // Row 1: Header Top (Tabs & Top Pagination)
    let headerTop = header.querySelector(':scope > .rhythiax-scores-header-top');
    if (!headerTop) {
      headerTop = document.createElement('div');
      headerTop.className = 'rhythiax-scores-header-top flex flex-wrap items-center justify-between gap-2.5 w-full';
      header.appendChild(headerTop);
    }

    const topScoresList = getScoresForTab('top', state.scoreSets);
    const reignScoresList = getScoresForTab('reign', state.scoreSets);
    const recentScoresList = getScoresForTab('recent', state.scoreSets);

    const tabsDef = [
      {
        id: 'top',
        label: isNormalMode ? 'Top scores' : (mode === 'spin' ? 'Spin Top' : 'VR Top'),
        icon: '<path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3z"/>',
        count: sets?.isLoading ? null : topScoresList.length,
      },
      ...(isNormalMode ? [{
        id: 'reign',
        label: 'Reigning scores',
        icon: '<path d="M4 8l4 3 4-6 4 6 4-3-2 10H6L4 8z"/><path d="M7 21h10"/>',
        count: sets?.isLoading ? null : reignScoresList.length,
      }] : []),
      {
        id: 'recent',
        label: isNormalMode ? 'Recent scores' : (mode === 'spin' ? 'Spin Recent' : 'VR Recent'),
        icon: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3.5 2"/>',
        count: sets?.isLoading ? null : recentScoresList.length,
      },
    ];

    // Tabs group: persistent element and buttons inside headerTop
    let tabsContainer = header.querySelector('.rhythiax-scores-tabs');
    if (!tabsContainer) {
      tabsContainer = document.createElement('div');
      tabsContainer.setAttribute('role', 'tablist');
      tabsContainer.setAttribute('aria-label', 'Score categories');
      tabsContainer.className = 'rhythiax-scores-tabs inline-flex h-8 items-center gap-0.5 rounded-lg border border-line bg-surface p-0.5';
      headerTop.appendChild(tabsContainer);
    } else if (tabsContainer.parentElement !== headerTop) {
      headerTop.prepend(tabsContainer);
    }

    const existingTabBtns = Array.from(tabsContainer.querySelectorAll('.rhythiax-scores-tab-btn'));
    const isTabStructureChanged = existingTabBtns.length !== tabsDef.length || existingTabBtns.some((b, i) => b.dataset.tabId !== tabsDef[i].id);

    if (isTabStructureChanged) {
      tabsContainer.innerHTML = '';
      tabsDef.forEach(tab => {
        const isActive = state.activeTab === tab.id;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.setAttribute('role', 'tab');
        btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
        btn.dataset.tabId = tab.id;
        btn.className = `inline-flex h-7 min-w-0 items-center justify-center gap-1.5 whitespace-nowrap rounded px-2.5 font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/30 disabled:pointer-events-none disabled:opacity-50 text-xs rhythiax-scores-tab-btn ${
          isActive ? 'bg-white/10 text-white font-bold rhythiax-tab-active' : 'text-neutral-400 hover:text-white'
        }`;
        btn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${tab.icon}</svg><span>${tab.label}</span><span class="rhythiax-scores-tab-badge ml-1 px-1.5 py-0.5 rounded-full text-[10px] tabular-nums ${isActive ? 'bg-white/15 text-white' : 'bg-white/5 text-neutral-400'}">${tab.count !== null && tab.count !== undefined ? tab.count : '—'}</span>`;
        btn.addEventListener('click', () => {
          if (state.activeTab !== tab.id) {
            state.activeTab = tab.id;
            state.page = 1;
            renderScoresHub(container, state.scoreSets);
          }
        });
        tabsContainer.appendChild(btn);
      });
    } else {
      existingTabBtns.forEach(btn => {
        const tabId = btn.dataset.tabId;
        const tabDef = tabsDef.find(t => t.id === tabId);
        const isActive = state.activeTab === tabId;
        btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
        btn.className = `inline-flex h-7 min-w-0 items-center justify-center gap-1.5 whitespace-nowrap rounded px-2.5 font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/30 disabled:pointer-events-none disabled:opacity-50 text-xs rhythiax-scores-tab-btn ${
          isActive ? 'bg-white/10 text-white font-bold rhythiax-tab-active' : 'text-neutral-400 hover:text-white'
        }`;
        const badge = btn.querySelector('.rhythiax-scores-tab-badge');
        if (badge && tabDef) {
          badge.textContent = tabDef.count !== null && tabDef.count !== undefined ? tabDef.count : '—';
          badge.className = `rhythiax-scores-tab-badge ml-1 px-1.5 py-0.5 rounded-full text-[10px] tabular-nums ${isActive ? 'bg-white/15 text-white' : 'bg-white/5 text-neutral-400'}`;
        }
      });
    }

    // Row 2: Controls Row (PageSize, ViewMode & Search)
    let controlsRow = header.querySelector(':scope > .rhythiax-scores-controls-row');
    if (!controlsRow) {
      controlsRow = document.createElement('div');
      controlsRow.className = 'rhythiax-scores-controls-row rhythiax-scores-controls-right flex flex-wrap items-center justify-between gap-2.5 w-full';
      header.appendChild(controlsRow);
    }

    // Left controls wrapper inside controlsRow
    let controlsLeft = controlsRow.querySelector(':scope > .rhythiax-scores-controls-left');
    if (!controlsLeft) {
      controlsLeft = document.createElement('div');
      controlsLeft.className = 'rhythiax-scores-controls-left flex items-center gap-2';
      controlsRow.prepend(controlsLeft);
    }

    // Page size controls
    let pageSizeWrap = controlsLeft.querySelector('.rhythiax-page-size-group');
    if (!pageSizeWrap) {
      pageSizeWrap = document.createElement('div');
      pageSizeWrap.setAttribute('role', 'group');
      pageSizeWrap.setAttribute('aria-label', 'Page size');
      pageSizeWrap.className = 'rhythiax-page-size-group inline-flex h-8 items-center gap-0.5 rounded-lg border border-line bg-surface p-0.5 text-xs font-semibold';
      pageSizeWrap.innerHTML = `
        <span class="px-1.5 text-xs uppercase tracking-wider text-neutral-400 select-none hidden sm:inline">Show</span>
        <button type="button" data-size="20" class="inline-flex h-7 min-w-0 items-center justify-center gap-1 whitespace-nowrap rounded px-2 font-semibold transition-colors focus-visible:outline-none disabled:pointer-events-none text-xs rhythiax-page-size-btn">20</button>
        <button type="button" data-size="50" class="inline-flex h-7 min-w-0 items-center justify-center gap-1 whitespace-nowrap rounded px-2 font-semibold transition-colors focus-visible:outline-none disabled:pointer-events-none text-xs rhythiax-page-size-btn">50</button>
        <button type="button" data-size="all" class="inline-flex h-7 min-w-0 items-center justify-center gap-1 whitespace-nowrap rounded px-2 font-semibold transition-colors focus-visible:outline-none disabled:pointer-events-none text-xs rhythiax-page-size-btn">All</button>
      `;
      pageSizeWrap.querySelectorAll('.rhythiax-page-size-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const raw = btn.dataset.size;
          const newSize = raw === 'all' ? 'all' : Number(raw);
          if (state.pageSize !== newSize) {
            state.pageSize = newSize;
            state.page = 1;
            savePageSize(newSize);
            renderScoresHub(container, state.scoreSets);
          }
        });
      });
      controlsLeft.appendChild(pageSizeWrap);
    }

    pageSizeWrap.querySelectorAll('.rhythiax-page-size-btn').forEach(btn => {
      const raw = btn.dataset.size;
      const sz = raw === 'all' ? 'all' : Number(raw);
      const isAct = state.pageSize === sz;
      btn.setAttribute('aria-pressed', isAct ? 'true' : 'false');
      btn.className = `inline-flex h-7 min-w-0 items-center justify-center gap-1 whitespace-nowrap rounded px-2 font-semibold transition-colors focus-visible:outline-none disabled:pointer-events-none text-xs rhythiax-page-size-btn ${isAct ? 'bg-white/10 text-white font-bold' : 'text-neutral-400 hover:text-white'}`;
    });

    // View Mode Toggle (List / Grid)
    const currentViewMode = RhythiaX.ScoreCardStore?.getViewMode?.() || 'list';
    container.setAttribute('data-scores-view', currentViewMode);

    let viewModeWrap = controlsLeft.querySelector('.rhythiax-view-mode-group');
    if (!viewModeWrap) {
      viewModeWrap = document.createElement('div');
      viewModeWrap.setAttribute('role', 'group');
      viewModeWrap.setAttribute('aria-label', 'Scores view layout');
      viewModeWrap.className = 'rhythiax-view-mode-group inline-flex h-8 items-center gap-0.5 rounded-lg border border-line bg-surface p-0.5 text-xs font-semibold';
      viewModeWrap.innerHTML = `
        <button type="button" data-view="list" title="List view" class="inline-flex h-7 min-w-0 items-center justify-center gap-1.5 whitespace-nowrap rounded px-2 font-semibold transition-colors focus-visible:outline-none disabled:pointer-events-none text-xs rhythiax-view-mode-btn">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
          <span class="hidden sm:inline">List</span>
        </button>
        <button type="button" data-view="grid" title="Grid view" class="inline-flex h-7 min-w-0 items-center justify-center gap-1.5 whitespace-nowrap rounded px-2 font-semibold transition-colors focus-visible:outline-none disabled:pointer-events-none text-xs rhythiax-view-mode-btn">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
          <span class="hidden sm:inline">Grid</span>
        </button>
      `;
      viewModeWrap.querySelectorAll('.rhythiax-view-mode-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const nextMode = btn.dataset.view;
          if (RhythiaX.ScoreCardStore?.setViewMode) {
            RhythiaX.ScoreCardStore.setViewMode(nextMode);
          }
          renderScoresHub(container, state.scoreSets);
        });
      });
      controlsLeft.appendChild(viewModeWrap);
    }

    viewModeWrap.querySelectorAll('.rhythiax-view-mode-btn').forEach(btn => {
      const isAct = currentViewMode === btn.dataset.view;
      btn.setAttribute('aria-pressed', isAct ? 'true' : 'false');
      btn.className = `inline-flex h-7 min-w-0 items-center justify-center gap-1.5 whitespace-nowrap rounded px-2 font-semibold transition-colors focus-visible:outline-none disabled:pointer-events-none text-xs rhythiax-view-mode-btn ${isAct ? 'bg-white/10 text-white font-bold' : 'text-neutral-400 hover:text-white'}`;
    });

    // Search bar with datalist autocomplete (persistent input)
    let searchWrapper = controlsRow.querySelector('.rhythiax-scores-search-wrapper');
    if (!searchWrapper) {
      searchWrapper = document.createElement('div');
      searchWrapper.className = 'rhythiax-scores-search-wrapper relative flex items-center h-8 min-w-[140px] sm:w-48 ml-auto';
      searchWrapper.innerHTML = `
        <svg class="rhythiax-scores-search-icon absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input type="text" list="rhythiax-scores-search-datalist" class="rhythiax-scores-search-input h-8 w-full rounded-lg border border-line bg-surface pl-8 pr-7 text-xs text-neutral-100 placeholder-neutral-500 focus:border-blue-500 focus:outline-none transition-colors" placeholder="Search map or artist..." autocomplete="off">
        <datalist id="rhythiax-scores-search-datalist"></datalist>
        <button type="button" class="rhythiax-scores-search-clear absolute right-2 top-1/2 -translate-y-1/2 h-5 w-5 flex items-center justify-center text-neutral-400 hover:text-white text-xs" style="display: none;">✕</button>
      `;
      const searchInput = searchWrapper.querySelector('.rhythiax-scores-search-input');
      searchInput.addEventListener('input', (e) => {
        state.searchQuery = e.target.value;
        state.page = 1;
        renderScoresHub(container, state.scoreSets);
      });
      const clearBtn = searchWrapper.querySelector('.rhythiax-scores-search-clear');
      clearBtn.addEventListener('click', () => {
        state.searchQuery = '';
        state.page = 1;
        searchInput.value = '';
        renderScoresHub(container, state.scoreSets);
        searchInput.focus();
      });
      controlsRow.appendChild(searchWrapper);
    }

    const searchInput = searchWrapper.querySelector('.rhythiax-scores-search-input');
    if (searchInput && document.activeElement !== searchInput && searchInput.value !== (state.searchQuery || '')) {
      searchInput.value = state.searchQuery || '';
    }
    const clearBtn = searchWrapper.querySelector('.rhythiax-scores-search-clear');
    if (clearBtn) {
      clearBtn.style.display = state.searchQuery ? 'flex' : 'none';
    }
    const datalist = searchWrapper.querySelector('#rhythiax-scores-search-datalist');
    if (datalist && (!datalist.children || datalist.children.length === 0)) {
      populateSearchDatalist(datalist, state.scoreSets);
    }

    // Helper: generate page numbers with smart ellipsis
    function generatePageList(currentPage, total) {
      if (total <= 7) {
        return Array.from({ length: total }, (_, i) => i + 1);
      }
      if (currentPage <= 4) {
        return [1, 2, 3, 4, 5, '...', total];
      }
      if (currentPage >= total - 3) {
        return [1, '...', total - 4, total - 3, total - 2, total - 1, total];
      }
      return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', total];
    }

    // Helper: create pagination bar with 1 2 3 4 5 and Prev/Next (Right aligned)
    function createPaginationNav(onPageSelect, extraClass = '') {
      const navWrap = document.createElement('div');
      navWrap.className = `rhythiax-scores-pagination-nav inline-flex items-center gap-1 ${extraClass}`;

      // Previous button
      const prevBtn = document.createElement('button');
      prevBtn.type = 'button';
      prevBtn.className = 'h-7 px-2 rounded border border-line bg-surface-raised text-xs font-semibold disabled:opacity-30 disabled:pointer-events-none hover:text-white transition-colors rhythiax-pagination-btn rhythiax-pagination-prev';
      prevBtn.innerHTML = '‹ <span class="hidden sm:inline">Prev</span>';
      prevBtn.title = 'Previous page';
      prevBtn.disabled = state.page <= 1;
      prevBtn.addEventListener('click', () => {
        if (state.page > 1) onPageSelect(state.page - 1);
      });
      navWrap.appendChild(prevBtn);

      // Numbered page buttons
      const pages = generatePageList(state.page, totalPages);
      pages.forEach(p => {
        if (p === '...') {
          const dots = document.createElement('span');
          dots.className = 'px-1 text-xs text-neutral-500 font-mono select-none rhythiax-pagination-dots';
          dots.textContent = '…';
          navWrap.appendChild(dots);
        } else {
          const pageBtn = document.createElement('button');
          pageBtn.type = 'button';
          const isActive = p === state.page;
          pageBtn.className = `min-w-[28px] h-7 px-2 rounded border text-xs font-semibold transition-colors rhythiax-pagination-btn rhythiax-pagination-page ${
            isActive
              ? 'rhythiax-pagination-active font-bold shadow-sm'
              : 'border-line bg-surface-raised text-neutral-300 hover:text-white hover:border-neutral-500'
          }`;
          pageBtn.textContent = String(p);
          pageBtn.title = `Page ${p}`;
          pageBtn.setAttribute('aria-current', isActive ? 'page' : 'false');
          pageBtn.style.pointerEvents = isActive ? 'none' : 'auto';
          pageBtn.addEventListener('click', () => {
            if (p !== state.page) onPageSelect(p);
          });
          navWrap.appendChild(pageBtn);
        }
      });

      // Next button
      const nextBtn = document.createElement('button');
      nextBtn.type = 'button';
      nextBtn.className = 'h-7 px-2 rounded border border-line bg-surface-raised text-xs font-semibold disabled:opacity-30 disabled:pointer-events-none hover:text-white transition-colors rhythiax-pagination-btn rhythiax-pagination-next';
      nextBtn.innerHTML = '<span class="hidden sm:inline">Next</span> ›';
      nextBtn.title = 'Next page';
      nextBtn.disabled = state.page >= totalPages;
      nextBtn.addEventListener('click', () => {
        if (state.page < totalPages) onPageSelect(state.page + 1);
      });
      navWrap.appendChild(nextBtn);

      return navWrap;
    }

    // Top Pagination Bar (stable element on Row 1, aligned to the far right next to tabs)
    const existingTopPagination = header.querySelector('.rhythiax-scores-top-pagination');
    if (existingTopPagination) existingTopPagination.remove();

    if (state.pageSize !== 'all' && totalCount > 0) {
      const topPagination = createPaginationNav((targetPage) => {
        state.page = targetPage;
        renderScoresHub(container, state.scoreSets);
      }, 'rhythiax-scores-top-pagination ml-auto');
      headerTop.appendChild(topPagination);
    }

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
        emptyBox.textContent = state.searchQuery ? 'No scores match your search.' : 'No scores found in this category.';
        listArea.appendChild(emptyBox);
      }
    } else {
      const existingKeys = existingCards.map(c => c._rhythiaxScoreKey || getScoreKey(c._rhythiaxScoreData));
      const newKeys = pageScores.map(getScoreKey);
      const isSameList = !isTabChanged && !isPageChanged && existingKeys.length === newKeys.length && existingKeys.every((k, i) => k && k === newKeys[i]
        && (existingCards[i]._rhythiaxScoreData?.rankIndex ?? null) === pagePositions[i]);

      if (!isSameList) {
        listArea.innerHTML = '';
        pageScores.forEach((scoreData, idx) => {
          const absoluteIndex = pagePositions[idx];
          const card = RhythiaX.ScoreCardView.createCardFromScore(scoreData, absoluteIndex, state.activeTab);
          if (card) {
            card._rhythiaxScoreKey = getScoreKey(scoreData);
            if (isFirstMount || isTabChanged || isPageChanged) {
              card.classList.add('rhythiax-score-card-anim');
              card.style.setProperty('--card-anim-delay', `${Math.min(idx * 22, 220)}ms`);
            }
            listArea.appendChild(card);
          }
        });
      }
    }

    // 4. Pagination Footer (Bottom Spaced: info left, pagination right)
    let paginationArea = container.querySelector(':scope > .rhythiax-scores-pagination');
    if (!paginationArea) {
      paginationArea = document.createElement('div');
      paginationArea.className = 'rhythiax-scores-pagination flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4 text-xs text-neutral-400';
      container.appendChild(paginationArea);
    }
    paginationArea.innerHTML = '';

    if (state.pageSize !== 'all' && totalCount > 0) {
      const pageInfo = document.createElement('span');
      pageInfo.className = 'rhythiax-pagination-info';
      pageInfo.textContent = totalPages > 1
        ? `Showing ${startIndex + 1}–${endIndex} of ${totalCount}`
        : `Total: ${totalCount} ${totalCount === 1 ? 'score' : 'scores'}`;
      paginationArea.appendChild(pageInfo);

      const bottomPagination = createPaginationNav((targetPage) => {
        state.page = targetPage;
        renderScoresHub(container, state.scoreSets);
        container.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 'rhythiax-scores-bottom-pagination');
      paginationArea.appendChild(bottomPagination);
    } else {
      paginationArea.style.display = totalCount > 0 ? 'flex' : 'none';
      paginationArea.innerHTML = `<span>Total: ${totalCount} ${totalCount === 1 ? 'score' : 'scores'}</span>`;
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
      const col = hub?.parentElement || getProfileColumn();
      renderPinnedScoresSection(col, hub, hubState.scoreSets);
    });

    window.addEventListener('rhythiax:scorecard-viewmode-changed', () => {
      const hub = document.querySelector('.rhythiax-scores-hub');
      if (hub) renderScoresHub(hub, hubState.scoreSets);
      const col = hub?.parentElement || getProfileColumn();
      renderPinnedScoresSection(col, hub, hubState.scoreSets);
    });
  }

  function findNativeScoreSections() {
    const result = { reigningSec: null, pinnedSec: null, topSec: null, recentSec: null };
    const headings = document.querySelectorAll('h1, h2, h3, h4');

    for (const h of headings) {
      if (h.closest('.rhythiax-scores-hub') || h.closest('button, .rhythiax-scores-tabs')) continue;
      const text = h.textContent.trim().toLowerCase();
      const card = getSectionCard(h);
      if (!card || card.classList.contains('rhythiax-scores-hub')) continue;

      if (/pinned scores/i.test(text) && !result.pinnedSec) result.pinnedSec = card;
      else if (/reigning scores/i.test(text) && !result.reigningSec) result.reigningSec = card;
      else if (/top scores/i.test(text) && !result.topSec) result.topSec = card;
      else if (/recent scores/i.test(text) && !result.recentSec) result.recentSec = card;
    }
    return result;
  }

  RhythiaX.ScoreCardService = {
    getPinnedScores: () => getEffectivePinnedScores(),
    mountScoresHub,
    resetScoresHub,
    renderScoresHub,
    getScoresForTab,
    getActiveProfileMode,
    getProfileColumn,
    updateScoresHubVisibility,
    findNativeScoreSections,
    profileType: (card) => card?.getAttribute?.('data-rhythiax-score-type') || hubState.activeTab,
  };

  // Backwards compatibility mappings
  RhythiaX.mountScoresHub = mountScoresHub;
  RhythiaX.updateEnhancedScoreCards = mountScoresHub;
})();
