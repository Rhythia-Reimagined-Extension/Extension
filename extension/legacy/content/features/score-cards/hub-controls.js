// ============================================================================
// Reimagined for Rhythia — Scores Hub controls (tabs, page size, List/Grid, search, pages)
// ============================================================================
// Each control is found in the hub's header or created there and wired once; later draws only update
// it. The controls read the hub state and never change it: the service (service.js) passes callbacks
// that do and draw the hub again.

var RhythiaX = RhythiaX || {};

(function () {
  'use strict';

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
    datalist.innerHTML = options.map(val => `<option value="${RhythiaX.escapeHtml(val)}"></option>`).join('');
  }

  // Draws the controls header below the section header (container is the hub, state the hub state).
  // view: { sets, mode, totalCount, totalPages, getScoresForTab(tab, sets), onTab(id), onPageSize(size),
  // onView(mode), onSearch(query), onPage(page) }. Returns the List/Grid mode the list is drawn in and
  // createPaginationNav for this draw's footer.
  function render(container, sectionHeader, state, view) {
    const { sets, mode, totalCount, totalPages, getScoresForTab, onTab, onPageSize, onView, onSearch, onPage } = view;
    const isNormalMode = mode === 'normal';

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
        btn.addEventListener('click', () => onTab(tab.id));
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
        <button type="button" data-size="10" class="inline-flex h-7 min-w-0 items-center justify-center gap-1 whitespace-nowrap rounded px-2 font-semibold transition-colors focus-visible:outline-none disabled:pointer-events-none text-xs rhythiax-page-size-btn">10</button>
        <button type="button" data-size="20" class="inline-flex h-7 min-w-0 items-center justify-center gap-1 whitespace-nowrap rounded px-2 font-semibold transition-colors focus-visible:outline-none disabled:pointer-events-none text-xs rhythiax-page-size-btn">20</button>
        <button type="button" data-size="50" class="inline-flex h-7 min-w-0 items-center justify-center gap-1 whitespace-nowrap rounded px-2 font-semibold transition-colors focus-visible:outline-none disabled:pointer-events-none text-xs rhythiax-page-size-btn">50</button>
        <button type="button" data-size="all" class="inline-flex h-7 min-w-0 items-center justify-center gap-1 whitespace-nowrap rounded px-2 font-semibold transition-colors focus-visible:outline-none disabled:pointer-events-none text-xs rhythiax-page-size-btn">All</button>
      `;
      pageSizeWrap.querySelectorAll('.rhythiax-page-size-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const raw = btn.dataset.size;
          const newSize = raw === 'all' ? 'all' : Number(raw);
          onPageSize(newSize);
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
        btn.addEventListener('click', () => onView(btn.dataset.view));
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
      searchInput.addEventListener('input', (e) => onSearch(e.target.value));
      const clearBtn = searchWrapper.querySelector('.rhythiax-scores-search-clear');
      clearBtn.addEventListener('click', () => {
        searchInput.value = '';
        onSearch('');
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
      const topPagination = createPaginationNav(onPage, 'rhythiax-scores-top-pagination ml-auto');
      headerTop.appendChild(topPagination);
    }

    return { currentViewMode, createPaginationNav };
  }

  RhythiaX.ScoreHubControls = { render };
})();
