// Statistics DOM adapters, mount points, and sub-tab switcher.
var RhythiaX = RhythiaX || {};

(function () {
  const domain = RhythiaX.StatisticsDomain;

  function row(label, value, historyKey) {
    const element = document.createElement('div');
    element.className = 'rhythiax-reimagined-metric-card';
    const labelElement = document.createElement('div');
    labelElement.className = 'rhythiax-reimagined-metric-label';
    labelElement.textContent = label;
    const valueElement = document.createElement('div');
    valueElement.className = 'rhythiax-reimagined-metric-value';
    valueElement.textContent = value;
    element.append(labelElement, valueElement);
    if (historyKey) history(element, historyKey);
    return element;
  }

  function history(element, key) {
    if (!RhythiaX.isModuleEnabled('statHistory') || !element || !key || element.dataset.historyKey) return element;
    element.classList.add('rhythiax-history-enabled');
    element.dataset.historyKey = key;
    element.title = 'Click to focus this metric in history log';
    element.tabIndex = 0;
    element.setAttribute('role', 'button');
    element.setAttribute('aria-expanded', 'false');

    const handleFocus = () => {
      const allCards = element.parentElement?.querySelectorAll('.rhythiax-reimagined-metric-card') || [];
      const wasActive = element.classList.contains('active');
      allCards.forEach(c => {
        c.classList.remove('active', 'rhythiax-stat-row-open');
        c.setAttribute('aria-expanded', 'false');
      });
      if (!wasActive) {
        element.classList.add('active', 'rhythiax-stat-row-open');
        element.setAttribute('aria-expanded', 'true');
      }

      // Highlight corresponding column in the unified table and scroll into view if needed
      const tableWrap = document.querySelector('.rhythiax-progress-history-table-wrap');
      const table = tableWrap?.querySelector('table');
      if (table) {
        table.querySelectorAll('.rhythiax-col-focused').forEach(cell => cell.classList.remove('rhythiax-col-focused'));
        if (!wasActive) {
          const colCells = table.querySelectorAll(`.rhythiax-col-${key}`);
          colCells.forEach(cell => cell.classList.add('rhythiax-col-focused'));
          const headerCell = table.querySelector(`th.rhythiax-col-${key}`);
          if (headerCell && tableWrap) {
            const wrapRect = tableWrap.getBoundingClientRect();
            const cellRect = headerCell.getBoundingClientRect();
            if (cellRect.left < wrapRect.left || cellRect.right > wrapRect.right) {
              headerCell.scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' });
            }
          }
        }
      }
    };

    element.addEventListener('click', handleFocus);
    element.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handleFocus();
      }
    });
    return element;
  }

  function values(player, scores, playerRp, ratingScores) {
    const playCount = RhythiaX.parseStatNumber(player.playCount) || scores.length;
    const weighted = RhythiaX.parseLocalizedNumber(playerRp) || RhythiaX.calcWeightedRp(scores);
    const parsedSquaresHit = RhythiaX.parseStatNumber(player.squaresHit);
    const displayedSquaresHit = Number.isFinite(parsedSquaresHit) && parsedSquaresHit > 0
      ? parsedSquaresHit
      : scores.reduce((sum, score) => sum + (parseInt(score.notes, 10) || 0), 0);

    return [
      ['Rhythm Points', RhythiaX.formatNumber(Math.round(weighted)), 'weightedRp'],
      ['AVG Accuracy', domain.averageAccuracy(scores, player) === '—' ? '—' : domain.averageAccuracy(scores, player) + '%', 'avgAccuracy'],
      ['Play Count', RhythiaX.formatNumber(playCount), 'playCount'],
      ['Squares Hit', RhythiaX.formatNumber(displayedSquaresHit), 'squaresHit'],
    ];
  }

  function injectSubTabs(container, scores, player, ratingScores) {
    if (!container) return false;
    let header = container.querySelector('[class*="ProfileSectionHeader"], [class*="-mx-4"], [class*="-mt-4"]') || container.firstElementChild;
    if (!header) return false;

    // Ensure header is flex items-center justify-between
    if (!header.classList.contains('flex')) {
      header.classList.add('flex', 'items-center', 'justify-between');
    }

    let initialStatsTab = 'reimagined';
    try {
      initialStatsTab = localStorage.getItem('rhythiax_active_stats_tab') || 'reimagined';
    } catch (_) {}
    const isInitOfficial = initialStatsTab === 'official';

    let tabs = header.querySelector('.rhythiax-stats-tabs');
    if (!tabs) {
      tabs = document.createElement('div');
      tabs.className = 'rhythiax-stats-tabs inline-flex h-10 items-center gap-0.5 rounded-lg border border-line bg-surface p-1';
      tabs.setAttribute('role', 'group');
      tabs.setAttribute('aria-label', 'Statistics display mode');
      tabs.innerHTML = `
        <button type="button" aria-pressed="${isInitOfficial ? 'true' : 'false'}" class="rhythiax-stats-tab-btn inline-flex h-full min-w-0 items-center justify-center gap-1.5 whitespace-nowrap rounded px-3 font-semibold transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/30 disabled:pointer-events-none disabled:opacity-50 ${isInitOfficial ? 'active bg-white/10 text-white' : 'text-neutral-400'} w-[88px] text-sm" data-tab="official" role="tab" aria-selected="${isInitOfficial ? 'true' : 'false'}">Statistics</button>
        <button type="button" aria-pressed="${!isInitOfficial ? 'true' : 'false'}" class="rhythiax-stats-tab-btn inline-flex h-full min-w-0 items-center justify-center gap-1.5 whitespace-nowrap rounded px-3 font-semibold transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/30 disabled:pointer-events-none disabled:opacity-50 ${!isInitOfficial ? 'active bg-white/10 text-white' : 'text-neutral-400'} w-[88px] text-sm" data-tab="reimagined" role="tab" aria-selected="${!isInitOfficial ? 'true' : 'false'}">Reimagined</button>
      `;
      header.appendChild(tabs);
    }

    // Wrap or isolate native body elements
    let nativeBody = container.querySelector('.rhythiax-native-stats-body');
    if (!nativeBody) {
      nativeBody = document.createElement('div');
      nativeBody.className = 'rhythiax-native-stats-body';
      if (!isInitOfficial) nativeBody.style.display = 'none';
      const childrenToMove = Array.from(container.children).filter(child => child !== header && !child.classList.contains('rhythiax-reimagined-stats-body'));
      childrenToMove.forEach(child => nativeBody.appendChild(child));
      container.appendChild(nativeBody);
    } else {
      nativeBody.style.display = isInitOfficial ? '' : 'none';
    }

    // Create or find Reimagined body
    let reimaginedBody = container.querySelector('.rhythiax-reimagined-stats-body');
    if (!reimaginedBody) {
      reimaginedBody = document.createElement('div');
      reimaginedBody.className = 'rhythiax-reimagined-stats-body';
      reimaginedBody.style.display = isInitOfficial ? 'none' : 'flex';
      container.appendChild(reimaginedBody);
    } else {
      reimaginedBody.style.display = isInitOfficial ? 'none' : 'flex';
    }

    // Sub-navigation bar inside Reimagined
    let subTabs = reimaginedBody.querySelector('.rhythiax-subtabs');
    if (!subTabs) {
      subTabs = document.createElement('div');
      subTabs.className = 'rhythiax-subtabs';
      subTabs.setAttribute('role', 'tablist');
      subTabs.setAttribute('aria-label', 'Reimagined sections');
      subTabs.innerHTML = `
        <button type="button" class="rhythiax-subtab-btn rhythiax-subtab-stats active" data-subtab="stats" role="tab" aria-selected="true">
          <span>Progress</span>
        </button>
        <button type="button" class="rhythiax-subtab-btn rhythiax-subtab-ranking" data-subtab="ranking" role="tab" aria-selected="false">
          <span>Rankings</span>
        </button>
        <button type="button" class="rhythiax-subtab-btn rhythiax-subtab-playstyle" data-subtab="performance" role="tab" aria-selected="false">
          <span>Playstyle</span>
        </button>
      `;
      reimaginedBody.appendChild(subTabs);
    }
    updateSubtabVisibility();

    // Panes
    let statsPane = reimaginedBody.querySelector('.rhythiax-pane-stats, .rhythiax-pane-overview');
    if (!statsPane) {
      statsPane = document.createElement('div');
      statsPane.className = 'rhythiax-subtab-pane rhythiax-pane-stats rhythiax-pane-overview';
      reimaginedBody.appendChild(statsPane);
    } else {
      statsPane.classList.add('rhythiax-pane-stats');
    }

    let rankingPane = reimaginedBody.querySelector('.rhythiax-pane-ranking');
    if (!rankingPane) {
      rankingPane = document.createElement('div');
      rankingPane.className = 'rhythiax-subtab-pane rhythiax-pane-ranking';
      rankingPane.style.display = 'none';
      reimaginedBody.appendChild(rankingPane);
    }

    let performancePane = reimaginedBody.querySelector('.rhythiax-pane-performance');
    if (!performancePane) {
      performancePane = document.createElement('div');
      performancePane.className = 'rhythiax-subtab-pane rhythiax-pane-performance';
      performancePane.style.display = 'none';
      reimaginedBody.appendChild(performancePane);
    }

    // Populate Stats Pane:
    // 1. Metrics grid
    let metricsGrid = statsPane.querySelector('.rhythiax-reimagined-metrics-grid');
    if (!metricsGrid) {
      metricsGrid = document.createElement('div');
      metricsGrid.className = 'rhythiax-reimagined-metrics-grid';
      statsPane.appendChild(metricsGrid);
    }
    const metricItems = values(player, scores, player.rp, ratingScores);
    const effectivePlayCount = RhythiaX.parseStatNumber(player.playCount) || scores.length;
    const hereSince = player?.created_at != null ? new Date(player.created_at)
      : player?.id != null ? null : RhythiaX.extractHereSince();
    metricItems.push(['Maps / Week', domain.mapsPerWeek(effectivePlayCount, hereSince), 'mapsPerWeek']);

    const existingCards = metricsGrid.querySelectorAll('.rhythiax-reimagined-metric-card');
    if (existingCards.length === metricItems.length) {
      metricItems.forEach(([label, val, historyKey], idx) => {
        const card = existingCards[idx];
        const valElem = card.querySelector('.rhythiax-reimagined-metric-value');
        if (valElem) {
          const deltaElem = valElem.querySelector('.rhythiax-profile-history-delta');
          if (valElem.firstChild && valElem.firstChild.nodeType === 3) {
            const currentText = valElem.firstChild.nodeValue.trim();
            if (currentText !== val.trim()) {
              valElem.firstChild.nodeValue = val + (deltaElem ? ' ' : '');
            }
          } else if (!deltaElem) {
            valElem.textContent = val;
          } else {
            valElem.replaceChildren(document.createTextNode(val + ' '), deltaElem);
          }
        }
      });
    } else {
      metricsGrid.replaceChildren();
      metricItems.forEach(item => metricsGrid.appendChild(row(...item)));
    }

    // 2. Full-width dedicated history pane directly below the grid
    let historyPane = statsPane.querySelector('.rhythiax-history-pane');
    if (!historyPane) {
      historyPane = document.createElement('div');
      historyPane.className = 'rhythiax-history-pane open';
      statsPane.appendChild(historyPane);
    } else {
      historyPane.classList.add('open');
    }

    // Performance Profiles Grid
    let perfGrid = performancePane.querySelector('.rhythiax-profiles-grid');
    if (!perfGrid) {
      perfGrid = document.createElement('div');
      perfGrid.className = 'rhythiax-profiles-grid';
      performancePane.appendChild(perfGrid);
    }

    // Sub-tab switching logic
    const switchSubtab = (tabKey) => {
      subTabs.querySelectorAll('.rhythiax-subtab-btn').forEach(btn => {
        const isActive = btn.dataset.subtab === tabKey;
        btn.classList.toggle('active', isActive);
        btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
      });

      statsPane.style.display = (tabKey === 'stats' || tabKey === 'overview') ? '' : 'none';
      rankingPane.style.display = tabKey === 'ranking' ? '' : 'none';
      performancePane.style.display = (tabKey === 'performance' || tabKey === 'tempo' || tabKey === 'rating') ? '' : 'none';

      const activePane = (tabKey === 'stats' || tabKey === 'overview')
        ? statsPane
        : (tabKey === 'ranking' ? rankingPane : performancePane);

      activePane.classList.remove('rhythiax-tab-pane-in');
      void activePane.offsetWidth;
      activePane.classList.add('rhythiax-tab-pane-in');

      if (tabKey === 'ranking' && (!player?.profileMode || player.profileMode === 'normal')) {
        const playerId = player?.id || window.location.pathname.match(/\/player\/([^/]+)/)?.[1];
        if (playerId && (rankingPane.dataset.renderedPlayer !== String(playerId) || !rankingPane.hasChildNodes())) {
          rankingPane.dataset.renderedPlayer = String(playerId);
          RhythiaX.renderInlineRankHistory?.(rankingPane, playerId);
        }
      } else if ((tabKey === 'stats' || tabKey === 'overview') && (!player?.profileMode || player.profileMode === 'normal')) {
        const playerId = player?.id || window.location.pathname.match(/\/player\/([^/]+)/)?.[1];
        if (playerId && (historyPane.dataset.renderedPlayer !== String(playerId) || !historyPane.hasChildNodes())) {
          historyPane.dataset.renderedPlayer = String(playerId);
          RhythiaX.renderInlineProgressHistory?.(historyPane, playerId);
        }
      } else if (tabKey === 'performance' || tabKey === 'tempo' || tabKey === 'rating') {
        const playerId = player?.id || window.location.pathname.match(/\/player\/([^/]+)/)?.[1];
        if (performancePane.dataset.renderedPlayer !== String(playerId) || !performancePane.querySelector('.rhythiax-playstyle-deck')) {
          performancePane.dataset.renderedPlayer = String(playerId);
          if (RhythiaX.PlaystyleView?.render) {
            RhythiaX.PlaystyleView.render(performancePane, { player, scores: ratingScores || scores, ratingScores, playerId });
          } else if (!perfGrid.hasChildNodes()) {
            if (RhythiaX.isModuleOptionEnabled?.('advancedStats', 'tempoProfile') !== false) {
              RhythiaX.injectTempoProfile(ratingScores || scores, perfGrid, 'profile');
            }
            if (RhythiaX.isModuleOptionEnabled?.('advancedStats', 'ratingProfile') !== false) {
              RhythiaX.injectRatingProfile(scores, ratingScores, perfGrid, 'profile');
            }
          }
        }
      }
    };

    subTabs.querySelectorAll('.rhythiax-subtab-btn').forEach(btn => {
      btn.onclick = () => switchSubtab(btn.dataset.subtab);
    });

    // Populate initial Progress history immediately if stats subtab is active
    const activeSubtabBtn = subTabs.querySelector('.rhythiax-subtab-btn.active');
    const initialSubtab = activeSubtabBtn?.dataset?.subtab || 'stats';
    if ((initialSubtab === 'stats' || initialSubtab === 'overview') && (!player?.profileMode || player.profileMode === 'normal')) {
      const playerId = player?.id || window.location.pathname.match(/\/player\/([^/]+)/)?.[1];
      if (playerId) {
        historyPane.dataset.renderedPlayer = String(playerId);
        RhythiaX.renderInlineProgressHistory?.(historyPane, playerId);
      }
    }

    // Tab switching logic (Statistics vs Reimagined)
    const officialBtn = tabs.querySelector('[data-tab="official"]');
    const reimaginedBtn = tabs.querySelector('[data-tab="reimagined"]');

    const switchTab = (activeTab, shouldAnimate = true) => {
      const isOfficial = activeTab === 'official';
      officialBtn.classList.toggle('active', isOfficial);
      officialBtn.setAttribute('aria-selected', isOfficial ? 'true' : 'false');
      officialBtn.setAttribute('aria-pressed', isOfficial ? 'true' : 'false');
      officialBtn.classList.toggle('bg-white/10', isOfficial);
      officialBtn.classList.toggle('text-white', isOfficial);
      officialBtn.classList.toggle('text-neutral-400', !isOfficial);

      reimaginedBtn.classList.toggle('active', !isOfficial);
      reimaginedBtn.setAttribute('aria-selected', isOfficial ? 'false' : 'true');
      reimaginedBtn.setAttribute('aria-pressed', isOfficial ? 'false' : 'true');
      reimaginedBtn.classList.toggle('bg-white/10', !isOfficial);
      reimaginedBtn.classList.toggle('text-white', !isOfficial);
      reimaginedBtn.classList.toggle('text-neutral-400', isOfficial);

      nativeBody.style.display = isOfficial ? '' : 'none';
      reimaginedBody.style.display = isOfficial ? 'none' : 'flex';

      if (shouldAnimate) {
        const targetPane = isOfficial ? nativeBody : reimaginedBody;
        targetPane.classList.remove('rhythiax-tab-pane-in');
        void targetPane.offsetWidth;
        targetPane.classList.add('rhythiax-tab-pane-in');
      }

      if (!isOfficial) {
        const activeSubtabBtn = subTabs.querySelector('.rhythiax-subtab-btn.active');
        const activeSubtab = activeSubtabBtn?.dataset?.subtab || 'stats';
        switchSubtab(activeSubtab);
      }

      try {
        localStorage.setItem('rhythiax_active_stats_tab', activeTab);
        if (typeof document !== 'undefined' && document.documentElement) {
          document.documentElement.dataset.rhythiaxStatsTab = activeTab;
        }
      } catch (_) {}

      if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        chrome.storage.local.set({ rhythiaxActiveStatsTab: activeTab });
      }
    };

    if (!isInitOfficial) {
      const activeSubtabBtn = subTabs.querySelector('.rhythiax-subtab-btn.active');
      const activeSubtab = activeSubtabBtn?.dataset?.subtab || 'stats';
      switchSubtab(activeSubtab);
    }

    officialBtn.onclick = () => switchTab('official');
    reimaginedBtn.onclick = () => switchTab('reimagined');

    // Restore saved tab or sync with storage if changed elsewhere
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      chrome.storage.local.get({ rhythiaxActiveStatsTab: initialStatsTab }, res => {
        if (res?.rhythiaxActiveStatsTab && res.rhythiaxActiveStatsTab !== initialStatsTab) {
          switchTab(res.rhythiaxActiveStatsTab, false);
        }
      });
    }

    return true;
  }

  function injectOfficial(scores, player, ratingScores) {
    const container = RhythiaX.findOfficialStatsContainer();
    if (!container) {
      RhythiaX.log('Official stats container not found');
      return false;
    }
    return injectSubTabs(container, scores, player, ratingScores);
  }

  function buildPanel(player, scores, playerRp, pageType, ratingScores, options = {}) {
    if (!RhythiaX.isModuleEnabled('advancedStats')) {
      const panel = document.createElement('div');
      panel.className = 'rhythiax-stats-panel';
      return panel;
    }
    if (!injectOfficial(scores, player, ratingScores)) return null;
    if (!options.deferProfiles) deferredProfiles(scores, ratingScores, pageType);
    const panel = document.createElement('div');
    panel.className = 'rhythiax-stats-panel';
    return panel;
  }

  function deferredProfiles(scores, ratingScores, pageType) {
    if (!RhythiaX.isModuleEnabled('advancedStats')) return;
    const container = RhythiaX.findOfficialStatsContainer();
    if (!container) return;
    const perfPane = container.querySelector('.rhythiax-pane-performance');
    if (!perfPane) return;
    if (RhythiaX.PlaystyleView?.render) {
      const player = RhythiaX.profileHistoryContext?.player || (typeof RhythiaX.extractPlayerData === 'function' ? RhythiaX.extractPlayerData() : null);
      const playerId = RhythiaX.profileHistoryContext?.playerId || player?.id;
      RhythiaX.PlaystyleView.render(perfPane, { player, scores: ratingScores || scores, ratingScores, playerId });
      return;
    }
    const perfGrid = perfPane.querySelector('.rhythiax-profiles-grid') || perfPane;
    if (!perfGrid.hasChildNodes()) {
      if (RhythiaX.isModuleOptionEnabled('advancedStats', 'tempoProfile')) {
        RhythiaX.injectTempoProfile(ratingScores || scores, perfGrid, pageType || 'profile');
      }
      if (RhythiaX.isModuleOptionEnabled('advancedStats', 'ratingProfile')) {
        RhythiaX.injectRatingProfile(scores, ratingScores, perfGrid, pageType || 'profile');
      }
    }
  }

  function updateSubtabVisibility() {
    const subTabs = document.querySelector('.rhythiax-subtabs');
    if (!subTabs) return;
    const playstyleBtn = subTabs.querySelector('.rhythiax-subtab-playstyle, [data-subtab="performance"]');
    const isPlaystyleEnabled = RhythiaX.isModuleOptionEnabled?.('advancedStats', 'playstyleTab') !== false;
    if (playstyleBtn) {
      playstyleBtn.style.display = isPlaystyleEnabled ? '' : 'none';
      if (!isPlaystyleEnabled && playstyleBtn.classList.contains('active')) {
        const statsBtn = subTabs.querySelector('.rhythiax-subtab-stats, [data-subtab="stats"]');
        statsBtn?.click?.();
      }
    }
    const rankingBtn = subTabs.querySelector('.rhythiax-subtab-ranking, [data-subtab="ranking"]');
    const isNormalProfile = !RhythiaX.profileHistoryContext?.player?.profileMode
      || RhythiaX.profileHistoryContext.player.profileMode === 'normal';
    const isRankingEnabled = isNormalProfile && RhythiaX.isModuleEnabled?.('rankingHistory') !== false;
    if (rankingBtn) {
      rankingBtn.style.display = isRankingEnabled ? '' : 'none';
      if (!isRankingEnabled && rankingBtn.classList.contains('active')) {
        const statsBtn = subTabs.querySelector('.rhythiax-subtab-stats, [data-subtab="stats"]');
        statsBtn?.click?.();
      }
    }
  }

  RhythiaX.StatisticsView = { row, history, injectOfficial, buildPanel, deferredProfiles, updateSubtabVisibility };
})();
