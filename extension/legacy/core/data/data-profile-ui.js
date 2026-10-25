// =============================================
// Reimagined for Rhythia — profile history deltas (Classic)
// =============================================
// What happens on screen when stored history changes (invalidation and one redraw), and the
// change marks next to the header cards and stat rows. The online history cache is
// core/data/vps-history-cache.js; the history tables are features/statistics/history-tables.js.

var RhythiaX = RhythiaX || {};

function invalidateVisibleHistory(playerId) {
  if (typeof document === 'undefined') return;
  const currentId = RhythiaX.PageRouteContext?.playerId?.() || window.location?.pathname?.match(/\/player\/([^/]+)/)?.[1];
  if (playerId && currentId && String(currentId) !== String(playerId)) return;
  document.querySelectorAll('.rhythiax-history-row, .rhythiax-profile-history-delta, .rhythiax-rank-history-overlay').forEach(node => node.remove());
  document.querySelectorAll('[data-rhythiax-history-rendered]').forEach(node => node.replaceChildren());
  document.querySelectorAll('.rhythiax-stat-row-open, [data-history-key].active').forEach(node => {
    node.classList.remove('rhythiax-stat-row-open', 'active');
    node.setAttribute('aria-expanded', 'false');
  });
  document.querySelectorAll('.rhythiax-playstyle-deck').forEach(node => node._rhythiaxResetHistory?.());
}

// After invalidateVisibleHistory the open profile's history views are drawn again from what
// storage now holds: the header and stat deltas, both history panes and the playstyle deck.
// A short timer makes a burst of storage events draw once. Clear history writes its generation
// first and removes the stored history a moment later, so after a clear the redraw waits for
// that removal (HISTORY_CLEAR_SETTLE_MS at most). Within the cache TTL a redraw reads the stored
// entry and starts no request; an expired entry is fetched once, and what that writes redraws
// other tabs only when it is empty, which they then read from storage: tabs never loop.
const HISTORY_REDRAW_DELAY_MS = 50;
const HISTORY_CLEAR_SETTLE_MS = 2000;
const HISTORY_CLEARED_PREFIXES = ['rhythiaxData:entry:', VPS_HISTORY_CACHE_PREFIX, 'rhythiax_ps_hist_'];
let historyRedrawTimer = null;
let historyClearSettling = false;

function currentHistoryPlayerId() {
  if (typeof window === 'undefined') return '';
  return window.location?.pathname?.match(/^\/player\/(\d+)/)?.[1] || '';
}

function redrawVisibleHistory() {
  const playerId = currentHistoryPlayerId();
  if (!playerId || document.documentElement?.classList?.contains('rhythiax-exodus')) return;
  // A profile still being composed draws its history itself, with the new settings.
  if (String(RhythiaX.profileHistoryContext?.playerId || '') !== playerId) return;
  Promise.resolve(RhythiaX.applyProfileHistoryIndicators?.(playerId)).catch(() => {});
  document.querySelectorAll('.rhythiax-pane-ranking').forEach(pane => {
    Promise.resolve(RhythiaX.renderInlineRankHistory?.(pane, playerId, { redraw: true })).catch(() => {});
  });
  document.querySelectorAll('.rhythiax-pane-stats .rhythiax-history-pane').forEach(pane => {
    Promise.resolve(RhythiaX.renderInlineProgressHistory?.(pane, playerId, { redraw: true })).catch(() => {});
  });
  if (document.querySelector('.rhythiax-playstyle-deck')) RhythiaX.PlaystyleView?.reRender?.();
}

function scheduleVisibleHistoryRedraw(delay = HISTORY_REDRAW_DELAY_MS) {
  if (typeof document === 'undefined' || typeof setTimeout !== 'function') return;
  if (historyRedrawTimer) clearTimeout(historyRedrawTimer);
  historyRedrawTimer = setTimeout(() => {
    historyRedrawTimer = null;
    historyClearSettling = false;
    redrawVisibleHistory();
  }, delay);
}

// The online-history choice itself is redrawn by CommunityConsentNotice.onChoice (below). Whether settings
// hold the consent is shared/consent.js's rule; without it nothing counts as consent.
function isCommunityConsentChoice(change) {
  const given = settings => RhythiaX.Consent?.given?.(settings) === true;
  return Boolean(RhythiaX.CommunityConsentNotice) && !given(change?.oldValue) && given(change?.newValue);
}

// Clearing persisted history also invalidates cached responses in open tabs.
if (typeof chrome !== 'undefined') chrome.storage?.onChanged?.addListener((changes, area) => {
  if (area !== 'local') return;
  if (changes.rhythiaxDataSettings || changes.rhythiax_history_clear_generation) {
    RhythiaX.VpsHistoryCache.bumpRevision();
    RhythiaX._vpsPlayerHistoryCache.clear();
    invalidateVisibleHistory();
    if (changes.rhythiax_history_clear_generation) {
      historyClearSettling = true;
      scheduleVisibleHistoryRedraw(HISTORY_CLEAR_SETTLE_MS);
    } else if (!historyClearSettling && !isCommunityConsentChoice(changes.rhythiaxDataSettings)) {
      scheduleVisibleHistoryRedraw();
    }
  }
  let redraw = false;
  let cleared = false;
  Object.entries(changes).forEach(([key, change]) => {
    if (key.startsWith(VPS_HISTORY_CACHE_PREFIX) && change.newValue === undefined) {
      RhythiaX._vpsPlayerHistoryCache.delete(Number(key.slice(VPS_HISTORY_CACHE_PREFIX.length)));
    }
    if (key.startsWith(VPS_HISTORY_CACHE_PREFIX) && change.newValue?.data === null) {
      const id = Number(key.slice(VPS_HISTORY_CACHE_PREFIX.length));
      // The redraw reads the stored empty entry, not this tab's earlier answer.
      RhythiaX._vpsPlayerHistoryCache.delete(id);
      RhythiaX.PlaystyleLoader?.invalidatePlayer?.(id);
      invalidateVisibleHistory(id);
      if (currentHistoryPlayerId() === String(id)) redraw = true;
    }
    if (historyClearSettling && change.newValue === undefined && HISTORY_CLEARED_PREFIXES.some(prefix => key.startsWith(prefix))) {
      cleared = true;
    }
  });
  // A redraw already waiting covers an emptied entry too.
  if (cleared || (redraw && !historyRedrawTimer)) scheduleVisibleHistoryRedraw();
});

function dataUiSnapshot(snapshot) {
  if (!snapshot) return null;
  return snapshot.metrics ? { ...snapshot, ...snapshot.metrics } : { ...snapshot };
}

function dataUiMetricKey(key) {
  return key;
}

function dataUiMetricDelta(key, current, previous) {
  if (current === null || current === undefined || previous === null || previous === undefined) return null;
  const left = Number(current);
  const right = Number(previous);
  if (!Number.isFinite(left) || !Number.isFinite(right)) return null;
  const delta = left - right;
  // A change too small to show at the shown precision is no change.
  const shown = key === 'avgAccuracy' ? Math.round(delta * 100) : key === 'mapsPerWeek' ? Math.round(delta * 10) : delta;
  if (!shown) return '—';
  if (key === 'globalRank' || key === 'countryRank') {
    // For rank, lower number means higher/better placement (delta < 0 is improvement)
    if (delta < 0) return `▲ ${RhythiaX.formatNumber(Math.abs(delta))}`;
    return `▼ ${RhythiaX.formatNumber(delta)}`;
  }
  if (key === 'avgAccuracy') return `${delta > 0 ? '+' : ''}${delta.toFixed(2)}%`;
  if (key === 'mapsPerWeek') return `${delta > 0 ? '+' : ''}${delta.toFixed(1)}`;
  return `${delta > 0 ? '+' : ''}${RhythiaX.formatNumber(delta)}`;
}

function dataUiDeltaClass(delta, rank) {
  if (!delta || delta === '=' || delta === '—') return 'neutral';
  if (delta.includes('▲')) return 'positive';
  if (delta.includes('▼')) return 'negative';
  const positive = delta[0] === '+';
  return rank ? (positive ? 'negative' : 'positive') : (positive ? 'positive' : 'negative');
}

function dataUiAppendDelta(valueElement, delta, rank = false, edited = false) {
  const existing = valueElement.querySelector('.rhythiax-profile-history-delta');
  if (delta === null) {
    if (existing) existing.remove();
    return;
  }
  const deltaType = dataUiDeltaClass(delta, rank);
  let text = '';
  if (deltaType === 'positive') text = String(delta).replace(/^[▲+]\s*/, '').trim();
  else if (deltaType === 'negative') text = String(delta).replace(/^[▼-]\s*/, '').trim();

  const deltaTitle = edited ? 'This value was edited locally' : (rank ? (deltaType === 'positive' ? `Climbed ${text} rank${text === '1' ? '' : 's'}` : (deltaType === 'negative' ? `Dropped ${text} rank${text === '1' ? '' : 's'}` : 'No change')) : (deltaType === 'positive' ? `+${text}` : (deltaType === 'negative' ? `-${text}` : 'No change')));

  // In-place reconciliation: if element already exists with the same deltaType, update text and title without recreating node
  if (existing && existing.classList.contains(deltaType)) {
    const span = existing.querySelector('span');
    const existingText = (span?.textContent || existing.textContent || '').trim();
    if (existingText === text) {
      if (existing.title !== deltaTitle) existing.title = deltaTitle;
      return;
    }
    if (span) {
      span.textContent = text;
      existing.title = deltaTitle;
      return;
    }
  }

  valueElement.querySelectorAll('.rhythiax-profile-history-delta').forEach(item => item.remove());
  const element = document.createElement('small');
  element.className = `rhythiax-profile-history-delta ${deltaType}`;

  // Arrows centred in a 10x10 viewBox.
  const arrowUpSvg = '<svg class="rhythiax-delta-icon" viewBox="0 0 10 10" fill="currentColor" width="8" height="8" aria-hidden="true"><path d="M5 2.25L8.5 7.75H1.5L5 2.25Z"/></svg>';
  const arrowDownSvg = '<svg class="rhythiax-delta-icon" viewBox="0 0 10 10" fill="currentColor" width="8" height="8" aria-hidden="true"><path d="M5 7.75L1.5 2.25H8.5L5 7.75Z"/></svg>';
  const dashSvg = '<svg class="rhythiax-delta-icon rhythiax-delta-dash-icon" viewBox="0 0 10 10" fill="currentColor" width="8" height="8" aria-hidden="true"><rect x="1.5" y="4.25" width="7" height="1.5" rx="0.75"/></svg>';

  if (deltaType === 'positive') {
    element.innerHTML = `${arrowUpSvg}<span>${text}</span>`;
    element.title = deltaTitle;
  } else if (deltaType === 'negative') {
    element.innerHTML = `${arrowDownSvg}<span>${text}</span>`;
    element.title = deltaTitle;
  } else {
    element.innerHTML = dashSvg;
    element.title = deltaTitle;
  }

  valueElement.appendChild(element);
}

function dataUiProfileCard(label) {
  const targetLabel = label.toLowerCase();
  const headerArea = typeof RhythiaX.findHeaderRankArea === 'function' ? RhythiaX.findHeaderRankArea() : null;
  if (headerArea) {
    const labelElement = Array.from(headerArea.querySelectorAll('div, span, p')).find(element => (
      element.children?.length === 0 && element.textContent?.trim().toLowerCase() === targetLabel
    ));
    if (labelElement) {
      return labelElement.closest('button, div.min-w-0, div.flex, div.rounded-lg, [class*="rounded-"]') || labelElement.parentElement;
    }
  }

  const root = (typeof document !== 'undefined' && typeof document.querySelector === 'function' && document.querySelector('.max-w-\\[1120px\\], .max-w-\\[1100px\\], main')) || (typeof document !== 'undefined' && typeof document.querySelectorAll === 'function' ? document : null);
  if (!root) return null;
  const labelElement = Array.from(root.querySelectorAll('div, span, p')).find(element => {
    if (element.closest('.rhythiax-reimagined-stats-body, .rhythiax-reimagined-metrics-grid, .rhythiax-stats-panel')) return false;
    return element.children?.length === 0 && element.textContent?.trim().toLowerCase() === targetLabel;
  });
  return labelElement?.closest?.('button, div.min-w-0, div.flex, div.rounded-lg, [class*="rounded-"]') || labelElement?.parentElement;
}

function dataUiCurrent(record, livePoint) {
  return dataUiSnapshot(livePoint) || dataUiSnapshot(record?.history?.openDay?.captures?.slice(-1)[0]);
}

function removeNativeRankDeltas(root = document) {
  try {
    const nativeIndicators = root.querySelectorAll('span[title*="Dropped" i], span[title*="Climbed" i], span[title*="ranks" i]');
    nativeIndicators.forEach(el => {
      if (!el.classList.contains('rhythiax-profile-history-delta')) {
        el.remove();
      }
    });
  } catch (_) {}
}
RhythiaX.removeNativeRankDeltas = removeNativeRankDeltas;

function dataUiApplyCard(card, current, reference, key, rank) {
  if (!card || !Object.prototype.hasOwnProperty.call(current || {}, key)) return;
  card.querySelectorAll('.rhythiax-country-delta, .rhythiax-rp-delta').forEach(el => el.remove());
  if (rank) {
    const nativeIndicators = card.querySelectorAll('span[title*="rank" i], span[title*="Rank" i], span[title*="Dropped" i], span[title*="Climbed" i], span[class*="text-red-400"], span[class*="text-green-400"]');
    nativeIndicators.forEach(nativeIndicator => {
      if (!nativeIndicator.classList.contains('rhythiax-profile-history-delta')) {
        nativeIndicator.remove();
      }
    });
  }

  const delta = dataUiMetricDelta(key, current[key], reference?.[key]);
  if (delta === null) {
    card.querySelectorAll('.rhythiax-profile-history-delta').forEach(el => el.remove());
    return;
  }

  // 1. If we already created or converted a .rhythiax-header-card-row in this card, reuse it
  const existingRow = card.querySelector('.rhythiax-header-card-row');
  if (existingRow && card.contains(existingRow) && existingRow !== card) {
    dataUiAppendDelta(existingRow, delta, rank);
    return;
  }

  // 2. If the card has a native flex baseline row (e.g. Global Rank on live Rhythia), normalize it
  const nativeFlexRow = card.querySelector('.flex.items-baseline, [class*="items-baseline"]');
  if (nativeFlexRow && card.contains(nativeFlexRow) && nativeFlexRow !== card) {
    nativeFlexRow.classList.remove('items-baseline');
    nativeFlexRow.classList.add('items-center', 'rhythiax-header-card-row');
    dataUiAppendDelta(nativeFlexRow, delta, rank);
    return;
  }

  // 3. For cards without a flex row (e.g. Country button, Rhythm Points card):
  // Find the primary value element (#14 or 10,590)
  const valueElement = card.querySelector('button, .tabular-nums, [class*="tabular-nums"], .text-base, .text-xl');
  if (valueElement && card.contains(valueElement) && valueElement !== card) {
    const parent = valueElement.parentElement;
    if (parent === card) {
      // Direct child of the card: wrap in a dedicated flex row with gap
      const newRow = document.createElement('div');
      newRow.className = 'rhythiax-header-card-row flex items-center gap-1.5';
      card.insertBefore(newRow, valueElement);
      newRow.appendChild(valueElement);
      dataUiAppendDelta(newRow, delta, rank);
      return;
    }
    // Child of an inner container: make that inner container a proper flex row
    parent.classList.remove('items-baseline');
    parent.classList.add('rhythiax-header-card-row', 'flex', 'items-center', 'gap-1.5');
    dataUiAppendDelta(parent, delta, rank);
    return;
  }

  // Fallback if no specific value element selector matched
  const fallbackContainer = card.querySelector('div:last-child') || card;
  dataUiAppendDelta(fallbackContainer, delta, rank);
}

function dataUiProfileIsCurrent(playerId, navigationToken, revision) {
  const routeId = RhythiaX.PageRouteContext?.playerId?.();
  return (revision === undefined || revision === RhythiaX.VpsHistoryCache.revision()) && navigationToken === RhythiaX.navigationToken
    && (!routeId || String(routeId) === String(playerId));
}

RhythiaX.applyProfileHistoryIndicators = async function (playerId, livePoint) {
  if (!playerId) return;
  const navigationToken = RhythiaX.navigationToken;
  const revision = RhythiaX.VpsHistoryCache.revision();
  if (!dataUiProfileIsCurrent(playerId, navigationToken, revision)) return;
  removeNativeRankDeltas(document);
  const settings = await RhythiaX.getDataSettings();
  const record = settings?.syncMode === 'cloud-only' ? null : await RhythiaX.getDataRecord(playerId);

  let cachedVps = null;
  if (settings?.syncMode !== 'local-only') {
    cachedVps = await getCachedVpsHistory(playerId);
  }
  if (!dataUiProfileIsCurrent(playerId, navigationToken, revision)) return;
  const cloudHistory = settings?.syncMode === 'cloud-only'
    ? buildMergedRankHistory(cachedVps?.history, null)
    : [];
  const current = dataUiCurrent(record, livePoint) || dataUiSnapshot(cloudHistory[0]);
  if (!current) return;
  let rankingReference = record
    ? dataUiSnapshot(RhythiaX.getDataReferenceSnapshot(record, settings.inlineRankingReference, current))
    : null;

  if (!rankingReference && cachedVps?.history?.length > 0) {
    const sortedVps = [...cachedVps.history].sort((a, b) => String(b.date).localeCompare(String(a.date)));
    const prev = sortedVps.find(p => p.date !== current.date) || sortedVps[0];
    if (prev) {
      rankingReference = {
        date: prev.date,
        globalRank: prev.globalRank,
        countryRank: prev.countryRank,
        rhythmPoints: prev.skillPoints,
        weightedRp: prev.skillPoints,
        playCount: prev.playCount,
        squaresHit: prev.squaresHit
      };
    }
  }

  document.querySelectorAll('[data-history-key]').forEach(row => {
    // The cards of the default Statistics layout show their own change line (statistics/history-view.js).
    if (row.closest('.rhythiax-metrics-v2')) return;
    const key = dataUiMetricKey(row.dataset.historyKey);
    const valueElement = row.querySelector('.rhythiax-reimagined-metric-value, .rhythiax-official-stat-value, .rhythiax-stat-value');
    if (!valueElement || !Object.prototype.hasOwnProperty.call(current, key)) return;
    let statsReference = dataUiSnapshot(RhythiaX.getDataReferenceSnapshot(record, settings.inlineStatsReference, current, key));
    if (!statsReference && rankingReference && Object.prototype.hasOwnProperty.call(rankingReference, key)) {
      statsReference = rankingReference;
    }
    dataUiAppendDelta(valueElement, dataUiMetricDelta(key, current[key], statsReference?.[key]), false);
  });
  [['Global', 'globalRank', true], ['Country', 'countryRank', true], ['Rhythm Points', 'rhythmPoints', false]].forEach(([label, key, rank]) => {
    dataUiApplyCard(dataUiProfileCard(label), current, rankingReference, key, rank);
  });
};

// After the online-history choice, the open profile's history views load again.
RhythiaX.CommunityConsentNotice?.onChoice(() => {
  const playerId = window.location.pathname.match(/^\/player\/(\d+)/)?.[1];
  if (!playerId || RhythiaX.exodusShowing?.()) return;
  RhythiaX._vpsPlayerHistoryCache?.clear();
  // During a clear, the redraw waiting for its removal draws these views.
  if (!historyClearSettling) scheduleVisibleHistoryRedraw();
});
