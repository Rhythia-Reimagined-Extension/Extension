// =============================================
// Rhythia Reimagined - Player Compare
// =============================================

var RhythiaX = RhythiaX || {};

(function () {
  const store = RhythiaX.CompareStore;
  const loader = RhythiaX.CompareLoader;
  const metrics = RhythiaX.CompareMetrics;
  const MAX_PLAYERS = store.maxPlayers;
  const TAKEAWAY_TIE_THRESHOLD = 0.04;

  const playerId = loader.playerId;
   const isContextInvalidated = loader.isContextInvalidated;
   const isGenerationCurrent = loader.isGenerationCurrent;
  const currentPlayer = loader.currentPlayer;
  const enrichCurrentComparisonItem = loader.enrichCurrent;
  const readList = () => store.read();
  const updateList = mutator => store.update(mutator);
  const clearComparisonList = () => store.clear();
  let trayCloseTimer = null;

  function icon(path) {
    return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${path}"/></svg>`;
  }

  function compareButton(player) {
    if (!RhythiaX.isModuleEnabled('playerCompare')) return;
    const friendButtons = [...document.querySelectorAll('button')].filter(button => {
      const metadata = [button.textContent, button.getAttribute('aria-label'), button.getAttribute('title')].join(' ').trim();
      return /^(?:add\s+)?friends?\b/i.test(metadata)
        || button.querySelector('svg.lucide-user-round-plus, svg.lucide-users-round');
    });
    const settingsButtons = [...document.querySelectorAll('button')].filter(button => {
      if (/^settings$/i.test(button.getAttribute('aria-label') || '') || /^settings$/i.test(button.getAttribute('title') || '')) return true;
      return [...button.querySelectorAll('img')].some(image => /settings(?:icon)?\.png(?:[?#]|$)/i.test(image.src));
    });
    const friendCounterCandidates = [...document.querySelectorAll('#root div')].filter(element => (
      element.querySelector('svg.lucide-users-round')
      && /^\d+(?:\s+friends?)?$/i.test(element.textContent.trim())
    ));
    const friendCounters = friendCounterCandidates.filter(element => !friendCounterCandidates.some(candidate => candidate !== element && element.contains(candidate)));
    // Rhythia's current profile header exposes only a non-interactive friends
    // counter. Use it as a stable fallback for both desktop and mobile headers.
    const targets = friendButtons.length ? friendButtons : settingsButtons.length ? settingsButtons : friendCounters;
    if (!targets.length) return;
    targets.forEach(target => {
      const anchor = target.parentElement;
      if (!anchor) return;
      if (anchor.querySelector('.rhythiax-compare-profile-button')) return;
      const button = document.createElement('button');
      button.className = 'rhythiax-compare-profile-button';
      button.type = 'button';
       button.innerHTML = `${icon('M8 7h8M8 12h8M8 17h5')}<span>Compare</span>`;
       button.addEventListener('click', event => {
         event.stopPropagation();
         const navigationToken = RhythiaX.navigationToken;
         void (async () => {
          const item = currentPlayer(player);
           const list = await updateList(list => {
             const exists = list.some(entry => entry.id === item.id);
             return exists ? list.filter(entry => entry.id !== item.id) : [...list, item].slice(-MAX_PLAYERS);
           });
           if (navigationToken === RhythiaX.navigationToken && document.contains(button)) {
             renderTray();
             updateButtonStates(list);
           }
        })().catch(error => {
          if (!isContextInvalidated(error)) RhythiaX.captureError(error, 'Compare button action failed');
        });
      });
      // Keep Compare in the same action group, immediately before the native
      // profile action on both own and other-player profiles.
      anchor.insertBefore(button, target);
      updateButtonState(button, playerId());
    });
  }

  async function updateButtonState(button, id) {
    const list = await readList();
    if (!button.isConnected) return;
    const active = list.some(entry => entry.id === String(id));
    applyButtonState(button, active);
  }

  function applyButtonState(button, active) {
    button.classList.toggle('is-active', active);
    button.title = active ? 'Remove from compare' : 'Add player to compare';
    const label = button.querySelector('span');
    if (label) label.textContent = active ? 'Added' : 'Compare';
  }

  function updateButtonStates(list) {
    const active = new Set(list.map(entry => String(entry.id))).has(String(playerId()));
    document.querySelectorAll('.rhythiax-compare-profile-button').forEach(button => {
      applyButtonState(button, active);
    });
  }

  function finishTrayClosing(tray) {
    if (trayCloseTimer) {
      clearTimeout(trayCloseTimer);
      trayCloseTimer = null;
    }
    if (!tray.isConnected) return;
    tray.hidden = true;
    tray.innerHTML = '';
    tray.classList.remove('is-closing');
    tray.setAttribute('aria-hidden', 'true');
  }

  function cancelTrayClosing(tray) {
    if (trayCloseTimer) {
      clearTimeout(trayCloseTimer);
      trayCloseTimer = null;
    }
    tray.hidden = false;
    tray.classList.remove('is-closing');
    tray.removeAttribute('aria-hidden');
  }

  function closeTray(tray) {
    if (tray.hidden || tray.classList.contains('is-closing')) return;
    tray.classList.add('is-closing');
    tray.setAttribute('aria-hidden', 'true');
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      finishTrayClosing(tray);
      return;
    }
    trayCloseTimer = setTimeout(() => finishTrayClosing(tray), 240);
  }

  function replayTrayEntry(tray) {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    tray.style.animation = 'none';
    void tray.offsetWidth;
    tray.style.animation = '';
  }

  function renderTray(keepVisible = false) {
    const navigationToken = RhythiaX.navigationToken;
    if (!RhythiaX.isModuleEnabled('playerCompare')) {
      clearComparisonList();
      document.querySelector('.rhythiax-compare-tray')?.remove();
      document.querySelector('.rhythiax-compare-modal')?.remove();
      return;
    }
    let tray = document.querySelector('.rhythiax-compare-tray');
    if (!tray) {
      tray = document.createElement('aside');
      tray.className = 'rhythiax-compare-tray';
      // Wait for the async list read before showing an empty tray for a frame.
      tray.hidden = true;
      document.body.appendChild(tray);
    }
    readList().then(list => {
      if (navigationToken !== RhythiaX.navigationToken || !tray.isConnected) return;
      const wasHidden = tray.hidden;
      updateButtonStates(list);
       if (!list.length && !keepVisible) {
         closeTray(tray);
         return;
       }
      cancelTrayClosing(tray);
      if (wasHidden) replayTrayEntry(tray);
       tray.innerHTML = '';
       const heading = document.createElement('div');
       heading.className = 'rhythiax-compare-tray-heading';
       heading.innerHTML = `<span>Compare <b>${list.length}/${MAX_PLAYERS}</b></span><div class="rhythiax-compare-tray-actions"><button type="button" data-compare-clear>Clear</button><button type="button" class="rhythiax-compare-tray-close" data-compare-close aria-label="Close compare popup">×</button></div>`;
       heading.querySelector('[data-compare-clear]').addEventListener('click', () => updateList(() => []).then(() => renderTray(true)));
       heading.querySelector('[data-compare-close]').addEventListener('click', () => closeTray(tray));
       tray.appendChild(heading);
       if (!list.length) {
         const empty = document.createElement('p');
         empty.className = 'rhythiax-compare-empty';
         empty.textContent = 'No players selected.';
         tray.appendChild(empty);
         return;
       }
       const chips = document.createElement('div');
      chips.className = 'rhythiax-compare-chips';
      list.forEach(item => {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'rhythiax-compare-chip';
        chip.innerHTML = `<span>${escapeHtml(item.username)}</span><i aria-hidden="true">×</i>`;
        chip.title = 'Remove player';
         chip.addEventListener('click', () => updateList(current => current.filter(entry => entry.id !== item.id)).then(renderTray));
        chips.appendChild(chip);
      });
      tray.appendChild(chips);
      const open = document.createElement('button');
      open.type = 'button';
      open.className = 'rhythiax-compare-open';
      open.textContent = 'Open comparison';
      open.addEventListener('click', () => {
        void openComparison(open).catch(error => {
          if (!isContextInvalidated(error)) RhythiaX.captureError(error, 'Compare modal failed to open');
        });
      });
      tray.appendChild(open);
    });
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
  }

  function number(value) {
    return metrics.number(value);
  }

  function metricValue(player, key, scopedScores = null) {
    const data = player.player || {};
    const scores = scopedScores || player.scoreSets?.scores || [];
    if (key === 'fcRate') {
      const fc = scores.filter(score => score.fullCombo === true || score.grade === 'SS' || number(score.misses) === 0).length;
      return scores.length ? `${fc}/${scores.length} · ${((fc / scores.length) * 100).toFixed(1)}%` : '—';
    }
    if (key === 'globalRank' || key === 'countryRank') {
      const rank = String(data[key] ?? '').replace(/^#+/, '').trim();
      return rank ? `#${rank}` : '—';
    }
    if (key === 'avgAccuracy') {
      const average = averageAccuracy(player);
      return average !== null ? `${average.toFixed(2)}%` : '—';
    }
    if (key === 'weightedAccuracy') {
       const weighted = metrics.weightedMetrics(scores);
       return weighted ? `${weighted.accuracy.toFixed(2)}%` : '—';
    }
    if (key === 'weightedRp') {
      const total = number(data.rp);
      const fallback = scores.reduce((sum, score) => sum + scoreRankValue(score), 0);
      return total > 0 ? RhythiaX.formatNumber(total) : (fallback > 0 ? RhythiaX.formatNumber(fallback) : '—');
    }
    if (key === 'playCount') return data.playCount || '—';
    return '—';
  }

  function sameCountry(profiles) {
    const countries = profiles.map(profile => {
      const data = profile.player || {};
      return String(data.countryCode ?? data.country ?? data.countryName ?? '').trim().toLocaleLowerCase();
    });
    return countries.length > 1 && countries.every(country => country && country === countries[0]);
  }

  async function openComparison(trigger = null) {
    const returnFocus = trigger || (document.activeElement instanceof HTMLElement ? document.activeElement : null);
    const generation = loader.nextGeneration();
    const list = (await readList()).map(enrichCurrentComparisonItem);
    if (!isGenerationCurrent(generation)) return;
    // Load sequentially to avoid bursting several profile API requests at once.
    const profiles = [];
    for (const item of list) {
      let profile = null;
      try {
        profile = await loader.load(item, generation);
      } catch (error) {
        if (!isContextInvalidated(error)) RhythiaX.captureError(error, 'Compare profile load failed');
      }
      if (profile?.scoreSets) profiles.push(profile);
    }
    if (!isGenerationCurrent(generation) || !profiles.length) return;
    document.querySelector('.rhythiax-compare-modal')?.remove();
    const overlay = document.createElement('div');
    overlay.className = 'rhythiax-compare-modal';
     overlay.innerHTML = `<div class="rhythiax-compare-dialog" role="dialog" aria-modal="true" aria-label="Player comparison"><button class="rhythiax-compare-close" aria-label="Close comparison">${icon('M6 6l12 12M18 6L6 18')}</button><button class="rhythiax-compare-info" type="button" aria-label="Weighted metrics information" aria-expanded="false">i</button><aside class="rhythiax-compare-info-popover" hidden><h2>Weighted metrics</h2><dl><div><dt>Comparison</dt><dd>Compared with the equal average of the other players.</dd></div><div><dt>Weighted Accuracy</dt><dd>Accuracy weighted by notes, speed and difficulty.</dd></div><div><dt>Weighted Miss Rate</dt><dd>Misses divided by notes, using the same weights. Lower is better.</dd></div><div><dt>Weighted Speed</dt><dd>Average speed modifier using the same weights.</dd></div><div><dt>Weight formula</dt><dd>Notes × speed factor × difficulty factor.</dd></div></dl><div class="rhythiax-compare-info-options"></div></aside><div class="rhythiax-compare-content"></div></div>`;
     const content = overlay.querySelector('.rhythiax-compare-content');
     const infoOptions = overlay.querySelector('.rhythiax-compare-info-options');
     if (infoOptions) {
       const coverageOption = document.createElement('label');
       coverageOption.className = 'rhythiax-compare-info-option';
       coverageOption.innerHTML = '<input type="checkbox" data-compare-coverage-option="includeUnmatched"><span><strong>Include unmatched in weighted metrics</strong><small>Also include maps that are missing from one or more players</small></span>';
       infoOptions.prepend(coverageOption);
     }
     const coverage = mapPool(profiles, { limit: 0, sortIndex: 0, order: 'weightedRp', unmatched: 'show' });
     const sharedCount = coverage.filter(map => map.entries.every(Boolean)).length;
     const unmatchedCount = coverage.filter(map => map.entries.some(score => !score)).length;
     let includeUnmatchedMaps = false;
     const weightedMetricScores = () => {
       const maps = includeUnmatchedMaps ? coverage : coverage.filter(map => map.entries.every(Boolean));
       return profiles.map((_, profileIndex) => maps.map(map => map.entries[profileIndex]).filter(Boolean));
     };
    const heading = document.createElement('div');
    heading.className = 'rhythiax-compare-title';
    heading.innerHTML = `<div><span>Player Compare</span><small>Shared-map performance and player profile overview</small></div><div class="rhythiax-compare-title-meta">${profiles.length} players selected<br>${sharedCount} shared maps · ${unmatchedCount} unmatched maps</div>`;
    content.appendChild(heading);
    const filters = { sortIndex: 0, query: '', unmatched: 'ignore', minAccuracy: '', maxMisses: '', speed: 'all', order: 'weightedRp', limit: 20 };
     let summary = buildComparisonSummary(profiles, { limit: 100, sortIndex: 0, order: 'weightedRp', unmatched: 'show' }, includeUnmatchedMaps);
    let maps = buildSharedMaps(profiles, filters);
    const overview = document.createElement('section');
    overview.className = 'rhythiax-compare-overview';
     overview.innerHTML = '<div class="rhythiax-compare-section-heading"><h2>Profile metrics</h2><small data-compare-scope-label>Average uses all loaded top scores. Weighted uses matching maps only, with notes, speed and difficulty.</small></div>';
    const metricGrid = document.createElement('div');
    metricGrid.className = 'rhythiax-compare-metrics';
     const renderOverviewMetrics = () => {
       metricGrid.innerHTML = '';
       const scopedScores = weightedMetricScores();
       const scopeLabel = overview.querySelector('[data-compare-scope-label]');
       if (scopeLabel) scopeLabel.textContent = includeUnmatchedMaps
         ? 'Average uses all loaded top scores. Weighted includes matching and unmatched maps, with notes, speed and difficulty.'
         : 'Average uses all loaded top scores. Weighted uses matching maps only, with notes, speed and difficulty.';
        [['WRP', 'weightedRp'], ['Global rank', 'globalRank'], ...(sameCountry(profiles) ? [['Country rank', 'countryRank']] : []), ['Average Accuracy', 'avgAccuracy'], ['Weighted Accuracy', 'weightedAccuracy'], ['FC Rate', 'fcRate'], ['Play Count', 'playCount']].forEach(([label, key]) => {
         const row = document.createElement('div');
         row.className = 'rhythiax-compare-metric';
         row.innerHTML = `<strong>${label}</strong>`;
         profiles.forEach((profile, profileIndex) => {
           const value = document.createElement('span');
           value.innerHTML = `<i>${escapeHtml(profile.username)}</i><b>${escapeHtml(metricValue(profile, key, key === 'weightedAccuracy' ? scopedScores[profileIndex] : null))}</b>`;
           row.appendChild(value);
        });
        metricGrid.appendChild(row);
      });
    };
    renderOverviewMetrics();
    overview.appendChild(metricGrid);
    content.append(overview, summary, maps);
    const infoButton = overlay.querySelector('.rhythiax-compare-info');
    const infoPopover = overlay.querySelector('.rhythiax-compare-info-popover');
    infoButton.addEventListener('click', () => {
      const open = infoPopover.hidden;
      infoPopover.hidden = !open;
      infoButton.setAttribute('aria-expanded', String(open));
    });
      const refresh = () => {
         const nextSummary = buildComparisonSummary(profiles, { limit: 100, sortIndex: 0, order: 'weightedRp', unmatched: 'show' }, includeUnmatchedMaps);
        const nextMaps = buildSharedMaps(profiles, filters);
        summary.replaceWith(nextSummary);
        maps.replaceWith(nextMaps);
        summary = nextSummary;
        maps = nextMaps;
        bindMapFilters();
      };
      overlay.querySelector('[data-compare-coverage-option]')?.addEventListener('change', event => {
        includeUnmatchedMaps = event.target.checked;
        renderOverviewMetrics();
        refresh();
      });
      const bindMapFilters = () => {
        const controls = content.querySelector('.rhythiax-compare-map-filters');
        if (!controls) return;
         controls.querySelector('[aria-label="Sort maps by player"]').addEventListener('change', event => { filters.sortIndex = Number(event.target.value) || 0; refresh(); });
         const search = controls.querySelector('input[type="search"]');
         search.addEventListener('input', event => { filters.query = event.target.value; renderMapSuggestions(controls, profiles, filters); });
         search.addEventListener('change', refresh);
         search.addEventListener('keydown', event => { if (event.key === 'Enter') refresh(); });
         controls.querySelector('[data-filter="unmatched"]').addEventListener('change', event => { filters.unmatched = event.target.value; refresh(); });
         controls.querySelector('[data-filter="limit"]').addEventListener('change', event => { filters.limit = Number(event.target.value) || 20; refresh(); });
         controls.querySelector('[data-filter="minAccuracy"]').addEventListener('change', event => { filters.minAccuracy = event.target.value; refresh(); });
          const maxMissesInput = controls.querySelector('[data-filter="maxMisses"]');
          if (maxMissesInput) maxMissesInput.addEventListener('change', event => { filters.maxMisses = event.target.value; refresh(); });
         controls.querySelector('[data-filter="speed"]').addEventListener('change', event => { filters.speed = event.target.value; refresh(); });
         controls.querySelector('[data-filter="order"]').addEventListener('change', event => { filters.order = event.target.value; refresh(); });
      };
      bindMapFilters();
      const dialog = overlay.querySelector('.rhythiax-compare-dialog');
      const closeBtn = overlay.querySelector('.rhythiax-compare-close');
      let modalClosing = false;
      let modalCloseTimer = null;
      const onModalKeyDown = event => {
        if (event.key === 'Escape') {
          event.preventDefault();
          closeComparison();
          return;
        }
        if (event.key === 'Tab') {
          RhythiaX.trapFocus?.(dialog, event);
        }
      };
      const finishModalClosing = () => {
        if (modalClosing !== true) return;
        if (modalCloseTimer) {
          clearTimeout(modalCloseTimer);
          modalCloseTimer = null;
        }
        document.removeEventListener('keydown', onModalKeyDown, true);
        overlay.remove();
        renderTray();
        if (returnFocus?.isConnected && typeof returnFocus.focus === 'function') {
          returnFocus.focus();
        }
      };
      const closeComparison = () => {
        if (modalClosing) return;
        modalClosing = true;
        loader.reset();
        overlay.setAttribute('aria-hidden', 'true');
        overlay.classList.add('is-closing');
        if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
          finishModalClosing();
          return;
        }
        overlay.addEventListener('animationend', event => {
          if (event.target === overlay) finishModalClosing();
        }, { once: true });
        modalCloseTimer = setTimeout(finishModalClosing, 260);
    };
     closeBtn.addEventListener('click', closeComparison);
     overlay.addEventListener('click', event => { if (event.target === overlay) closeComparison(); });
     document.addEventListener('keydown', onModalKeyDown, true);
     document.body.appendChild(overlay);
     closeBtn.focus();
   }

   function metricDelta(value, average, lowerIsBetter = false, key = '') {
     const delta = lowerIsBetter ? average - value : value - average;
     const threshold = key === 'avgAccuracy' ? 0.005 : 0.001;
     if (Math.abs(delta) < threshold) return '=';
      if (key === 'avgAccuracy' || key === 'weightedAccuracy' || key === 'fcRate') {
        return `${delta > 0 ? '+' : ''}${delta.toFixed(key === 'fcRate' ? 1 : 2)}pp`;
      }
     return `${delta > 0 ? '+' : ''}${RhythiaX.formatNumber(Math.round(delta))}`;
   }

    function scoreNumber(score, key) {
      return metrics.scoreNumber(score, key);
    }

   function clamp(value, min, max) {
     return Math.min(max, Math.max(min, value));
   }

     function weightedMetrics(scores) {
       return metrics.weightedMetrics(scores);
    }

      function scoreRankValue(score) {
       return metrics.scoreRankValue(score);
   }

    function topScores(profile) {
      return metrics.topScores(profile);
    }

  function missingScoreLabel(profile) {
    return 'No matching score';
  }

  function scoreMapKey(score) {
    return metrics.scoreMapKey(score);
  }

    function mapPool(profiles, filters = {}) {
      const sortIndex = Number(filters.sortIndex) || 0;
    const maps = new Map();
    profiles.forEach((profile, profileIndex) => {
      topScores(profile).forEach((score, rank) => {
        const key = scoreMapKey(score);
        if (!key) return;
        if (!maps.has(key)) maps.set(key, { title: score.songTitle, entries: Array(profiles.length).fill(null), ranks: Array(profiles.length).fill(null) });
        const map = maps.get(key);
         const existing = map.entries[profileIndex];
         if (!existing || scoreRankValue(score) > scoreRankValue(existing)) {
           map.entries[profileIndex] = score;
           map.ranks[profileIndex] = rank + 1;
         }
      });
    });
     const selected = [...maps.values()]
         .filter(map => !filters.query || map.title.toLocaleLowerCase().includes(filters.query.trim().toLocaleLowerCase()))
         .filter(map => filters.unmatched !== 'ignore' || map.entries.every(Boolean))
         .filter(map => !filters.minAccuracy || map.entries.filter(Boolean).every(score => {
           const accuracy = scoreNumber(score, 'accuracy');
           return accuracy !== null && accuracy >= Number(filters.minAccuracy);
         }))
         .filter(map => !filters.maxMisses || map.entries.filter(Boolean).every(score => {
           const misses = scoreNumber(score, 'misses');
           return misses !== null && misses <= Number(filters.maxMisses);
         }))
          .filter(map => !filters.speed || filters.speed === 'all' || map.entries.filter(Boolean).every(score => RhythiaX.normalizeSpeed(score.speed) === filters.speed))
        .sort((left, right) => {
           const leftValue = mapSortValue(left.entries[sortIndex], filters.order);
           const rightValue = mapSortValue(right.entries[sortIndex], filters.order);
           return rightValue - leftValue || Math.max(...left.entries.map(scoreRankValue)) - Math.max(...right.entries.map(scoreRankValue));
         });
     const limit = Number(filters.limit);
     const limited = limit > 0 ? selected.slice(0, limit) : selected;
    // A selected map may be outside another player's top 20. It is still the
    // same map, so show that player's API score instead of calling it missing.
    profiles.forEach((profile, profileIndex) => {
       const allByName = new Map();
       topScores(profile).forEach(score => {
         const key = scoreMapKey(score);
         if (key && (!allByName.has(key) || scoreRankValue(score) > scoreRankValue(allByName.get(key)))) allByName.set(key, score);
       });
       limited.forEach(map => {
         if (!map.entries[profileIndex]) map.entries[profileIndex] = allByName.get(scoreMapKey(map));
       });
     });
     return limited;
  }

  function mapSortValue(score, order) {
    if (!score) return -Infinity;
    if (order === 'accuracy') return scoreNumber(score, 'accuracy') ?? -Infinity;
    if (order === 'misses') return -(scoreNumber(score, 'misses') ?? Infinity);
    if (order === 'speed') return scoreNumber(score, 'speed') ?? -Infinity;
    return scoreRankValue(score);
  }

  function averageAccuracy(profile, scopedScores = null) {
    const average = averageScoreValue(scopedScores || topScores(profile), 'accuracy');
    if (average !== null) return average;
    const fallback = number(profile.player?.avgAccuracy);
    return fallback > 0 ? fallback : null;
  }

    function averageScoreValue(scores, key) {
      const values = scores.map(score => scoreNumber(score, key)).filter(value => value !== null);
      return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
    }

    function scoreStats(scores) {
      const list = Array.isArray(scores) ? scores : [];
      const fc = list.filter(score => score.fullCombo === true || score.grade === 'SS' || number(score.misses) === 0).length;
      return { total: list.length, fc };
    }

   function buildComparisonSummary(profiles, filters, includeUnmatched = false) {
     const section = document.createElement('section');
     section.className = 'rhythiax-compare-summary';
     const sharedMaps = mapPool(profiles, { ...filters, limit: 0, query: '', unmatched: includeUnmatched ? 'show' : 'ignore', order: 'weightedRp', sortIndex: 0 });
     const coverageMaps = mapPool(profiles, { limit: 0, query: '', unmatched: 'show', order: 'weightedRp', sortIndex: 0 });
     const unmatchedMaps = coverageMaps.filter(map => map.entries.some(score => !score));
     const sectionHeading = document.createElement('div');
     sectionHeading.className = 'rhythiax-compare-section-heading';
       sectionHeading.innerHTML = `<h2>Player Breakdown</h2><small>${includeUnmatched ? 'Includes unmatched maps' : 'Shared maps only'} (${sharedMaps.length} maps).</small>`;
     section.appendChild(sectionHeading);

     const playerScores = profiles.map((_, index) => sharedMaps.map(map => map.entries[index]).filter(Boolean));
     const playerWeighted = playerScores.map(scores => weightedMetrics(scores));
     const averageOther = (index, key) => {
       const values = playerWeighted.map((metrics, otherIndex) => otherIndex === index ? null : metrics?.[key]).filter(value => Number.isFinite(value));
       return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
     };
     const loadedStats = profiles.map(profile => scoreStats(topScores(profile)));
     const grid = document.createElement('div');
     grid.className = 'rhythiax-compare-summary-grid';

     profiles.forEach((profile, index) => {
       let wins = 0;
       let losses = 0;
       let ties = 0;
       let unmatched = 0;
       sharedMaps.forEach(map => {
         const own = map.entries[index];
         const others = map.entries.filter((score, otherIndex) => otherIndex !== index && score);
         if (!own || !others.length) return;
         const ownValue = scoreRankValue(own);
         const otherAverage = others.reduce((sum, score) => sum + scoreRankValue(score), 0) / others.length;
         const tolerance = Math.max(0.5, otherAverage * 0.001);
         if (ownValue > otherAverage + tolerance) wins++;
         else if (ownValue < otherAverage - tolerance) losses++;
         else ties++;
       });
       unmatchedMaps.forEach(map => {
         if (!map.entries[index] && map.entries.some((score, otherIndex) => otherIndex !== index && score)) unmatched++;
       });

       const card = document.createElement('article');
       card.className = 'rhythiax-compare-summary-card';
       const name = document.createElement('strong');
       name.textContent = profile.username;
       const counts = document.createElement('div');
       counts.className = 'rhythiax-compare-summary-counts';
       [['is-best', `Better in ${wins} maps`], ['is-worse', `Behind in ${losses}`], ['is-equal', `${ties} ties`], ['is-neutral', `Unmatched ${unmatched}`]].forEach(([className, label]) => {
         const item = document.createElement('span');
         item.className = className;
         item.textContent = label;
         counts.appendChild(item);
       });
       card.append(name, counts);

       const traits = document.createElement('dl');
       traits.className = 'rhythiax-compare-summary-traits';
       const addTrait = (label, own, other, options = {}) => {
         if (!Number.isFinite(own) || !Number.isFinite(other)) return;
         const { lowerIsBetter = false, threshold = 0.01, betterLabel = 'Better', worseLabel = 'Behind', detail = '' } = options;
         const delta = own - other;
         const similar = Math.abs(delta) <= threshold;
         const better = lowerIsBetter ? delta < 0 : delta > 0;
         const trait = document.createElement('div');
         trait.className = `rhythiax-compare-trait ${similar ? 'similar' : (better ? 'better' : 'behind')}`;
         trait.innerHTML = `<dt>${label}</dt><dd>${similar ? 'Similar' : (better ? betterLabel : worseLabel)}</dd>${detail ? `<small>${detail}</small>` : ''}`;
         traits.appendChild(trait);
        };
        const ownWeighted = playerWeighted[index];
        const averageSuffix = profiles.length >= 3 ? ' avg' : '';
        const weightedAccuracyAverage = averageOther(index, 'accuracy');
        const weightedMissAverage = averageOther(index, 'missRate');
        const weightedSpeedAverage = averageOther(index, 'speed');
        if (ownWeighted) {
          addTrait('Weighted Accuracy', ownWeighted.accuracy, weightedAccuracyAverage, {
            threshold: 0.05,
             detail: `${ownWeighted.accuracy.toFixed(2)}% vs ${weightedAccuracyAverage?.toFixed(2)}%${averageSuffix}`,
          });
          addTrait('Weighted Miss Rate', ownWeighted.missRate, weightedMissAverage, {
            lowerIsBetter: true,
            threshold: 0.05,
             detail: `${ownWeighted.missRate.toFixed(2)}% vs ${weightedMissAverage?.toFixed(2)}%${averageSuffix}`,
          });
          addTrait('Weighted Speed', ownWeighted.speed, weightedSpeedAverage, {
            threshold: 0.05,
            betterLabel: 'Faster',
            worseLabel: 'Slower',
             detail: `${ownWeighted.speed.toFixed(2)}x vs ${weightedSpeedAverage?.toFixed(2)}x${averageSuffix}`,
          });
       }
       const ownFc = loadedStats[index].total ? loadedStats[index].fc / loadedStats[index].total * 100 : null;
       const otherFcRates = loadedStats.map((stats, otherIndex) => otherIndex === index || !stats.total ? null : stats.fc / stats.total * 100).filter(value => value !== null);
       const otherFcAverage = otherFcRates.length ? otherFcRates.reduce((sum, value) => sum + value, 0) / otherFcRates.length : null;
       const otherFcCounts = loadedStats.map((stats, otherIndex) => otherIndex === index ? null : stats.fc).filter(value => value !== null);
       const averageFcCount = otherFcCounts.length ? otherFcCounts.reduce((sum, value) => sum + value, 0) / otherFcCounts.length : null;
        addTrait('FC Rate', ownFc, otherFcAverage, {
          threshold: 0.1,
          detail: `${loadedStats[index].fc} FCs · ${ownFc?.toFixed(1)}% vs ${averageFcCount?.toFixed(1)} · ${otherFcAverage?.toFixed(1)}%${averageSuffix}`,
        });
       card.appendChild(traits);
       grid.appendChild(card);
     });

      const lead = profiles.map((profile, index) => ({ name: profile.username, wins: sharedMaps.reduce((count, map) => {
        const own = map.entries[index];
        const others = map.entries.filter((score, otherIndex) => otherIndex !== index && score);
        if (!own || !others.length) return count;
        const ownValue = scoreRankValue(own);
        const otherAverage = others.reduce((sum, score) => sum + scoreRankValue(score), 0) / others.length;
        return ownValue > otherAverage + Math.max(0.5, otherAverage * 0.001) ? count + 1 : count;
      }, 0) })).sort((left, right) => right.wins - left.wins);
      const stable = profiles.map((profile, index) => ({ name: profile.username, metric: playerWeighted[index]?.missRate ?? null })).filter(item => item.metric !== null).sort((left, right) => left.metric - right.metric);
      const fastest = profiles.map((profile, index) => ({ name: profile.username, metric: playerWeighted[index]?.speed ?? null })).filter(item => item.metric !== null).sort((left, right) => right.metric - left.metric);
      const stableLeaders = stable.length ? stable.filter(item => item.metric - stable[0].metric <= TAKEAWAY_TIE_THRESHOLD) : [];
      const fastestLeaders = fastest.length ? fastest.filter(item => fastest[0].metric - item.metric <= TAKEAWAY_TIE_THRESHOLD) : [];
      const takeaways = document.createElement('div');
      takeaways.className = 'rhythiax-compare-takeaways';
      const leadWinners = lead.length ? lead.filter(item => item.wins === lead[0].wins) : [];
      const leadNames = leadWinners.map(item => item.name).join(', ');
      const stableNames = stableLeaders.map(item => item.name).join(', ');
      const fastestNames = fastestLeaders.map(item => item.name).join(', ');
      const takeawayMetric = (items, unit) => {
        const values = items.map(item => `${item.metric.toFixed(2)}${unit}`);
        return `Tie: ${values.join(' vs ')}`;
      };
      const addTakeaway = (label, value, description) => {
        const card = document.createElement('article');
        card.className = 'rhythiax-compare-takeaway';
        card.innerHTML = `<h3>${label}</h3><strong>${escapeHtml(value)}</strong><p>${escapeHtml(description)}</p>`;
        takeaways.appendChild(card);
      };
      if (leadWinners.length) addTakeaway('Biggest Lead', leadNames, leadWinners.length > 1 ? `Tie: ${lead[0].wins} shared map wins` : `${lead[0].wins} shared map wins`);
      if (stableLeaders.length) addTakeaway('Most Stable', stableNames, stableLeaders.length > 1 ? takeawayMetric(stableLeaders, '%') : `Weighted miss rate: ${stable[0].metric.toFixed(2)}% (lowest)`);
      if (fastestLeaders.length) addTakeaway('Highest Speed', fastestNames, fastestLeaders.length > 1 ? takeawayMetric(fastestLeaders, 'x') : `Weighted average speed: ${fastest[0].metric.toFixed(2)}x`);
     section.append(grid, takeaways);
     return section;
   }

   function buildSharedMaps(profiles, filters) {
      const section = document.createElement('section');
      section.className = 'rhythiax-compare-maps';
      section.style.setProperty('--rhythiax-compare-player-count', String(profiles.length));
      const title = document.createElement('h3');
      const coverage = mapPool(profiles, { limit: 0, sortIndex: 0, order: 'weightedRp', unmatched: 'show' });
      const sharedCount = coverage.filter(map => map.entries.every(Boolean)).length;
      const unmatchedCount = coverage.filter(map => map.entries.some(score => !score)).length;
      title.innerHTML = `<span>Map Comparison</span><small>Shared score detail · ${sharedCount} shared maps · ${unmatchedCount} unmatched maps</small>`;
     section.appendChild(title);
     const controls = document.createElement('div');
     controls.className = 'rhythiax-compare-map-filters';
     controls.innerHTML = '<div class="rhythiax-compare-control-group"><span class="rhythiax-compare-control-label">View</span><div class="rhythiax-compare-control-fields"><label>Map count<select data-filter="limit" aria-label="Number of maps to compare"><option value="10">10 maps</option><option value="20">20 maps</option><option value="50">50 maps</option><option value="100">100 maps</option></select></label><label>Sort by player<select aria-label="Sort maps by player"></select></label><label>Order<select data-filter="order" aria-label="Map sort order"><option value="weightedRp">WRP</option><option value="accuracy">Accuracy</option><option value="misses">Fewest misses</option><option value="speed">Fastest</option></select></label></div></div><div class="rhythiax-compare-control-group"><span class="rhythiax-compare-control-label">Search Maps</span><div class="rhythiax-compare-control-fields"><label class="rhythiax-compare-search-label"><span class="rhythiax-compare-sr-only">Map name</span><input type="search" placeholder="Search map name..." aria-label="Search for map"><div class="rhythiax-compare-map-suggestions" aria-live="polite"></div></label></div></div><div class="rhythiax-compare-control-group"><span class="rhythiax-compare-control-label">Filters</span><div class="rhythiax-compare-control-fields"><label>Map coverage<select data-filter="unmatched" aria-label="Map coverage filter"><option value="ignore">Shared maps only</option><option value="show">Include unplayed maps</option></select></label><label>Speed<select data-filter="speed" aria-label="Speed filter"><option value="all">All speeds</option></select></label><label>Min accuracy<input data-filter="minAccuracy" type="number" min="0" max="100" step="0.01" placeholder="Any"></label></div></div>';
     section.appendChild(controls);
      const sortSelect = controls.querySelector('[aria-label="Sort maps by player"]');
     profiles.forEach((profile, index) => sortSelect.add(new Option(profile.username, String(index))));
      sortSelect.value = String(filters.sortIndex || 0);
      controls.querySelector('[data-filter="limit"]').value = String(filters.limit || 20);
     controls.querySelector('input[type="search"]').value = filters.query || '';
        controls.querySelector('[data-filter="unmatched"]').value = filters.unmatched || 'ignore';
      controls.querySelector('[data-filter="order"]').value = filters.order || 'weightedRp';
      controls.querySelector('[data-filter="minAccuracy"]').value = filters.minAccuracy || '';
      const maxMissesInput = controls.querySelector('[data-filter="maxMisses"]');
      if (maxMissesInput) maxMissesInput.value = filters.maxMisses || '';
      const speedSelect = controls.querySelector('[data-filter="speed"]');
      RhythiaX.SPEED_ORDER.forEach(speed => speedSelect.add(new Option(`${speed}x`, speed)));
       speedSelect.value = filters.speed || 'all';
       renderMapSuggestions(controls, profiles, filters);
    if (profiles.length < 2) {
      const hint = document.createElement('p');
      hint.textContent = 'Add another player to compare shared scores.';
      section.appendChild(hint);
      return section;
    }
     const shared = mapPool(profiles, filters);
    if (!shared.length) {
      const hint = document.createElement('p');
       hint.textContent = 'No shared maps found in the loaded score sets.';
      section.appendChild(hint);
      return section;
    }
    shared.forEach(map => {
      const row = document.createElement('div');
      row.className = 'rhythiax-compare-map-row';
       const name = document.createElement('strong');
       name.className = 'rhythiax-compare-map-name';
       name.innerHTML = `<span class="rhythiax-compare-map-title">${escapeHtml(map.title)}</span>`;
      row.appendChild(name);
       const values = map.entries.map(score => score ? scoreRankValue(score) : null);
        const validValues = values.filter(value => value !== null);
        const best = validValues.length ? Math.max(...validValues) : 0;
      map.entries.forEach((score, index) => {
        const stat = document.createElement('span');
        stat.className = 'rhythiax-compare-map-stat';
        if (!score) {
           stat.innerHTML = `<i>${escapeHtml(profiles[index].username)}</i><b class="rhythiax-compare-map-missing">${escapeHtml(missingScoreLabel(profiles[index]))}</b><em>—</em><small>—</small>`;
           row.appendChild(stat);
          return;
        }
           const speed = `${RhythiaX.normalizeSpeed(score.speed)}x`;
           const otherValues = values.filter((value, otherIndex) => value !== null && otherIndex !== index);
           const delta = otherValues.length ? metricDelta(scoreRankValue(score), otherValues.reduce((sum, value) => sum + value, 0) / otherValues.length) : '';
           const modPills = String(score.mods || '').split(/[,\s]+/).filter(mod => mod && mod !== '--').map(mod => `<small class="rhythiax-compare-mod-pill">${escapeHtml(mod)}</small>`).join('');
           stat.innerHTML = `<i>${escapeHtml(profiles[index].username)}</i><b class="rhythiax-compare-map-accuracy">${escapeHtml(score.accuracy || '—')}</b><em><span class="rhythiax-compare-speed-pill">${escapeHtml(speed)}</span>${modPills ? ` <span class="rhythiax-compare-mods-separator">|</span> ${modPills}` : ''}</em><small>WRP ${RhythiaX.formatNumber(scoreRankValue(score))} · ${escapeHtml(score.misses || '0')} miss${String(score.misses || '0') === '1' ? '' : 'es'}${delta ? ` · <b class="rhythiax-compare-delta">${delta}</b>` : ''}</small>`;
          if (validValues.length > 1 && scoreRankValue(score) === best && values.filter(value => value === best).length === 1) stat.classList.add('rhythiax-compare-best');
          else if (validValues.length > 1 && scoreRankValue(score) < best) stat.classList.add('rhythiax-compare-worse');
          if (validValues.length > 1 && validValues.every(value => value === values[index]) && values.every(value => value !== null)) {
          stat.classList.remove('rhythiax-compare-best', 'rhythiax-compare-worse');
          stat.classList.add('rhythiax-compare-equal');
   }

         row.appendChild(stat);
      });
      section.appendChild(row);
    });
     return section;
   }

   function renderMapSuggestions(controls, profiles, filters) {
     const target = controls.querySelector('.rhythiax-compare-map-suggestions');
      if (!target) return;
      const query = String(filters.query || '').trim().toLocaleLowerCase();
      if (!query) {
        target.innerHTML = '';
        return;
      }
      const titles = [...new Map(profiles.flatMap(profile => topScores(profile)).map(score => [scoreMapKey(score), score.songTitle])).values()]
       .filter(title => !query || title.toLocaleLowerCase().includes(query)).slice(0, 8);
     target.innerHTML = titles.slice(0, 5).map(title => `<button type="button" data-map-title="${escapeHtml(title)}">${escapeHtml(title)}</button>`).join('');
     target.querySelectorAll('button').forEach(button => button.addEventListener('click', () => {
       filters.query = button.dataset.mapTitle;
       const search = controls.querySelector('input[type="search"]');
       search.value = filters.query;
       search.dispatchEvent(new Event('change'));
     }));
   }

  RhythiaX.CompareView = {
    inject(player) {
      store.clearLegacyStorage();
      if (!RhythiaX.isModuleEnabled('playerCompare')) return;
      compareButton(player);
      renderTray();
    },
  };

})();
