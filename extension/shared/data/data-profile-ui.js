var RhythiaX = RhythiaX || {};

RhythiaX._vpsPlayerHistoryCache = RhythiaX._vpsPlayerHistoryCache || new Map();
const VPS_HISTORY_CACHE_PREFIX = 'rhythiaxVpsHistoryCache:';
const VPS_HISTORY_CACHE_TTL_MS = 60 * 1000;
const VPS_HISTORY_CACHE_MAX_ENTRIES = 20;
const VPS_HISTORY_CACHE_MAX_BYTES = 400 * 1024;

// Clearing persisted history also invalidates cached responses in open tabs.
if (typeof chrome !== 'undefined') chrome.storage?.onChanged?.addListener((changes, area) => {
  if (area !== 'local') return;
  Object.entries(changes).forEach(([key, change]) => {
    if (key.startsWith(VPS_HISTORY_CACHE_PREFIX) && change.newValue === undefined) {
      RhythiaX._vpsPlayerHistoryCache.delete(Number(key.slice(VPS_HISTORY_CACHE_PREFIX.length)));
    }
  });
});

function readVpsHistoryCache(id) {
  return new Promise(resolve => {
    if (typeof chrome === 'undefined' || !chrome.storage?.local) return resolve(null);
    try {
      const key = `${VPS_HISTORY_CACHE_PREFIX}${id}`;
      chrome.storage.local.get(key, result => {
        resolve(chrome.runtime?.lastError ? null : result?.[key] || null);
      });
    } catch (_) { resolve(null); }
  });
}

function writeVpsHistoryCache(id, data, fetchedAt, lastSuccessAt) {
  if (typeof chrome === 'undefined' || !chrome.storage?.local) return Promise.resolve(false);
  const entry = { fetchedAt, lastSuccessAt, data };
  if (JSON.stringify(entry).length > VPS_HISTORY_CACHE_MAX_BYTES) return Promise.resolve(false);
  return new Promise(resolve => {
    try {
      chrome.storage.local.set({ [`${VPS_HISTORY_CACHE_PREFIX}${id}`]: entry }, () => {
        if (chrome.runtime?.lastError) return resolve(false);
        resolve(true);
        try {
          chrome.storage.local.get(null, all => {
            if (chrome.runtime?.lastError) return;
            const entries = Object.entries(all || {})
              .filter(([key]) => key.startsWith(VPS_HISTORY_CACHE_PREFIX))
              .sort(([, a], [, b]) => Number(b?.fetchedAt || 0) - Number(a?.fetchedAt || 0));
            const obsolete = entries.slice(VPS_HISTORY_CACHE_MAX_ENTRIES)
              .concat(entries.filter(([, value]) => !value || Date.now() - Number(value.fetchedAt) > VPS_HISTORY_CACHE_TTL_MS * 10))
              .map(([key]) => key);
            if (obsolete.length) chrome.storage.local.remove([...new Set(obsolete)]);
          });
        } catch (_) {}
      });
    } catch (_) { resolve(false); }
  });
}

async function getCachedVpsHistory(playerId) {
  const id = Number(playerId);
  if (!Number.isSafeInteger(id) || id <= 0) return null;
  const existing = RhythiaX._vpsPlayerHistoryCache.get(id);
  if (existing && (existing.pending || Date.now() - existing.fetchedAt < VPS_HISTORY_CACHE_TTL_MS)) return existing.promise;
  if (typeof RhythiaX.fetchVpsPlayerHistory !== 'function') return null;
  const state = { pending: true, fetchedAt: 0, promise: null };
  const promise = (async () => {
    const cached = await readVpsHistoryCache(id);
    if (cached && Date.now() - Number(cached.fetchedAt) < VPS_HISTORY_CACHE_TTL_MS) {
      state.fetchedAt = Number(cached.fetchedAt);
      return cached.data;
    }
    const data = await RhythiaX.fetchVpsPlayerHistory(id);
    state.fetchedAt = Date.now();
    const staleData = cached?.data && Date.now() - Number(cached.lastSuccessAt || cached.fetchedAt) < VPS_HISTORY_CACHE_TTL_MS * 10
      ? cached.data : null;
    const usableData = data || staleData;
    await writeVpsHistoryCache(id, usableData, state.fetchedAt, data ? state.fetchedAt : cached?.lastSuccessAt || cached?.fetchedAt);
    return usableData;
  })().catch(() => {
    RhythiaX._vpsPlayerHistoryCache.delete(id);
    return null;
  }).finally(() => {
    state.pending = false;
  });
  state.promise = promise;
  RhythiaX._vpsPlayerHistoryCache.set(id, state);
  return promise;
}

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
  if (!delta) return '—';
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

  // Pixel-perfect centered SVGs in 10x10 viewBox (exact center at 5.0, 5.0)
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

function dataUiProfileIsCurrent(playerId, navigationToken) {
  const routeId = RhythiaX.PageRouteContext?.playerId?.();
  return navigationToken === RhythiaX.navigationToken
    && (!routeId || String(routeId) === String(playerId));
}

RhythiaX.applyProfileHistoryIndicators = async function (playerId, livePoint) {
  if (!playerId) return;
  const navigationToken = RhythiaX.navigationToken;
  if (!dataUiProfileIsCurrent(playerId, navigationToken)) return;
  removeNativeRankDeltas(document);
  const settings = await RhythiaX.getDataSettings();
  const record = settings?.syncMode === 'cloud-only' ? null : await RhythiaX.getDataRecord(playerId);

  let cachedVps = null;
  if (settings?.syncMode !== 'local-only') {
    cachedVps = await getCachedVpsHistory(playerId);
  }
  if (!dataUiProfileIsCurrent(playerId, navigationToken)) return;
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
    const key = dataUiMetricKey(row.dataset.historyKey);
    const valueElement = row.querySelector('.rhythiax-official-stat-value, .rhythiax-stat-value');
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

RhythiaX.refreshOpenStatHistories = async function () {
  const openRows = [...document.querySelectorAll('[data-history-key]')]
    .filter(row => row.nextElementSibling?.classList.contains('rhythiax-history-row'))
    .map(row => ({ row, key: row.dataset.historyKey }));
  openRows.forEach(({ row }) => row.nextElementSibling?.remove());
  await Promise.all(openRows.map(({ row, key }) => RhythiaX.showStatHistory(row, key)));
};

function dataUiHistoryPoints(record, displayMode = 'latestOpenAndClosed') {
  const captures = record?.history?.openDay?.captures || [];
  const open = displayMode === 'firstSnapshotAndClosed'
    ? captures.slice(0, 1)
    : displayMode === 'allSnapshots'
      ? captures.slice().reverse()
      : captures.slice(-1);
  const daily = Object.values(record?.history?.daily || {})
    .sort((left, right) => String(right.date).localeCompare(String(left.date)));
  if (displayMode === 'closedOnly') return daily;
  return [...open.map(point => ({ ...point, kind: 'open' })), ...daily].filter(Boolean);
}

function dataUiFormatValue(key, value) {
  if (value === null || value === undefined || value === '') return '—';
  const number = Number(value);
  if (!Number.isFinite(number)) return String(value);
  if (key === 'avgAccuracy') return `${number.toFixed(2)}%`;
  if (key === 'mapsPerWeek') return number.toFixed(1);
  if (key === 'globalRank' || key === 'countryRank') return `#${RhythiaX.formatNumber(number)}`;
  return RhythiaX.formatNumber(number);
}

function dataUiEscapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);
}

function dataUiHistoryPeriod(dateText, grouping) {
  if (grouping === 'daily') return dateText;
  const match = String(dateText || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return dateText;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  if (grouping === 'monthly') return `${match[1]}-${match[2]}`;
  const day = date.getDay();
  date.setDate(date.getDate() - (day === 0 ? 6 : day - 1));
  return RhythiaX.localDateKey(date);
}

function dataUiGroupHistory(points, grouping) {
  const open = points.filter(point => point.kind === 'open');
  const daily = points.filter(point => point.kind !== 'open');
  if (grouping === 'daily') return [...open, ...daily].filter(Boolean);
  const groups = new Map();
  daily.forEach(point => {
    const period = dataUiHistoryPeriod(point.date, grouping);
    if (!groups.has(period)) groups.set(period, point);
  });
  return [...open, ...groups.values()].filter(Boolean);
}

function dataUiGroupPointsByWeek(points) {
  const weeks = [];
  let currentWeek = null;

  points.forEach((point, idx) => {
    if (!point.date) return;
    const parts = String(point.date).split('-');
    if (parts.length < 3) return;
    const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    const day = d.getDay();
    const mondayDiff = d.getDate() - (day === 0 ? 6 : day - 1);
    const monday = new Date(d);
    monday.setDate(mondayDiff);
    const mondayKey = typeof RhythiaX.localDateKey === 'function'
      ? RhythiaX.localDateKey(monday)
      : `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const sundayKey = typeof RhythiaX.localDateKey === 'function'
      ? RhythiaX.localDateKey(sunday)
      : `${sunday.getFullYear()}-${String(sunday.getMonth() + 1).padStart(2, '0')}-${String(sunday.getDate()).padStart(2, '0')}`;

    const format = (RhythiaX.getDateFormat ? RhythiaX.getDateFormat() : 'yyyy-mm-dd').toLowerCase();
    const pad = v => String(v).padStart(2, '0');
    const mParts = mondayKey.split('-');
    const sParts = sundayKey.split('-');
    let monLabel = `${pad(mParts[1])}-${pad(mParts[2])}`;
    let sunLabel = `${pad(sParts[1])}-${pad(sParts[2])}`;
    if (format === 'dd-mm-yyyy' || format === 'dd/mm/yyyy') {
      monLabel = `${pad(mParts[2])}-${pad(mParts[1])}`;
      sunLabel = `${pad(sParts[2])}-${pad(sParts[1])}`;
    } else {
      monLabel = `${pad(mParts[1])}-${pad(mParts[2])}`;
      sunLabel = `${pad(sParts[1])}-${pad(sParts[2])}`;
    }
    const weekLabel = `${monLabel} > ${sunLabel}`;

    if (!currentWeek || currentWeek.mondayKey !== mondayKey) {
      currentWeek = {
        mondayKey,
        label: weekLabel,
        points: [],
      };
      weeks.push(currentWeek);
    }
    currentWeek.points.push({ ...point, originalIndex: idx });
  });

  return weeks;
}

function formatHistoryDateLabel(dateStr) {
  if (!dateStr || dateStr === '—') return '—';
  try {
    const raw = String(dateStr).trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      return dateStr;
    }
    const parts = raw.split('-');
    const dayNum = parseInt(parts[2], 10);
    const d = new Date(Number(parts[0]), Number(parts[1]) - 1, dayNum);
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const day = !isNaN(d.getTime()) ? days[d.getDay()] : null;
    const format = String(RhythiaX.getDateFormat ? RhythiaX.getDateFormat() : 'yyyy-mm-dd').toLowerCase();
    const pad = v => String(v).padStart(2, '0');
    let formatted = '';
    if (format === 'dd-mm-yyyy' || format === 'dd/mm/yyyy') {
      formatted = `${pad(dayNum)}-${pad(parts[1])}`;
    } else {
      formatted = `${pad(parts[1])}-${pad(dayNum)}`;
    }
    if (day) return `${day}, ${formatted}`;
    return formatted;
  } catch (_) {}
  return dateStr;
}

RhythiaX.showStatHistory = async function (row, historyKey) {
  const playerId = window.location.pathname.match(/\/player\/([^/]+)/)?.[1];
  if (!playerId || !row || !historyKey) return;

  const historyPane = row.closest('.rhythiax-pane-overview')?.querySelector('.rhythiax-history-pane')
    || document.querySelector('.rhythiax-history-pane');

  if (historyPane) {
    const isAlreadyOpen = row.classList.contains('rhythiax-stat-row-open') && historyPane.classList.contains('open');

    // Optimistic UI: Immediately update the active state on all metric cards in this grid
    const allMetrics = row.parentElement?.querySelectorAll('.rhythiax-reimagined-metric-card') || [];
    allMetrics.forEach(card => {
      const isCurrent = card === row;
      card.classList.toggle('rhythiax-stat-row-open', isCurrent && !isAlreadyOpen);
      card.classList.toggle('active', isCurrent && !isAlreadyOpen);
      card.setAttribute('aria-expanded', isCurrent && !isAlreadyOpen ? 'true' : 'false');
    });

    if (isAlreadyOpen) {
      // Close: animate the inner content out, then hide the pane
      const inner = historyPane.querySelector('.rhythiax-history-row-inner');
      if (inner) {
        inner.classList.add('rhythiax-inner-leaving');
        setTimeout(() => {
          historyPane.classList.remove('open');
          historyPane.replaceChildren();
        }, 80);
      } else {
        historyPane.classList.remove('open');
        historyPane.replaceChildren();
      }
      return;
    }
  } else {
    const existing = row.nextElementSibling;
    if (existing?.classList.contains('rhythiax-history-row')) {
      row.classList.remove('rhythiax-stat-row-open', 'active');
      row.setAttribute('aria-expanded', 'false');
      existing.classList.remove('rhythiax-history-row-open');
      existing.classList.add('rhythiax-history-row-closing');
      setTimeout(() => existing.remove(), 180);
      return;
    }
    if (row.nextElementSibling?.classList.contains('rhythiax-history-row-closing')) {
      row.nextElementSibling.remove();
    }
  }

  const settings = await RhythiaX.getDataSettings();
  const record = settings?.syncMode === 'cloud-only' ? null : await RhythiaX.getDataRecord(playerId);
  if (!row.isConnected) return;
  if (historyPane && !row.classList.contains('active')) return;

  let cachedVps = null;
  if (settings?.syncMode !== 'local-only') {
    cachedVps = await getCachedVpsHistory(playerId);
  }

  const key = dataUiMetricKey(historyKey);
  const rawPoints = (settings?.syncMode !== 'local-only' && cachedVps?.history?.length > 0)
    ? buildMergedRankHistory(cachedVps.history, record)
    : dataUiHistoryPoints(record, settings.historyDisplayMode);
  const historyRow = document.createElement('div');
  historyRow.className = 'rhythiax-history-row';

  const historyInner = document.createElement('div');
  historyInner.className = 'rhythiax-history-row-inner';

  const header = document.createElement('div');
  header.className = 'rhythiax-history-header';

  const metricDisplayNames = {
    weightedRp: 'Rhythm Points',
    playCount: 'Play Count',
    squaresHit: 'Squares Hit',
    mapsPerWeek: 'Maps / Week',
    avgAccuracy: 'AVG Accuracy',
  };
  const metricName = metricDisplayNames[historyKey] || historyKey;
  const titleText = `History of ${metricName}`;

  const headerLeft = document.createElement('div');
  headerLeft.className = 'rhythiax-history-header-left';
  headerLeft.innerHTML = `<svg class="rhythiax-history-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"></circle><polyline points="12 7 12 12 15 15"></polyline></svg><div class="rhythiax-history-title-group"><span class="rhythiax-history-title">${titleText}</span><span class="rhythiax-history-subtitle">Recent daily snapshots</span></div>`;

  let currentHorizon = settings?.historyGrouping === 'daily'
    ? (rawPoints.length > 7 ? '30d' : '7d')
    : 'weekly';

  const horizonGroup = document.createElement('div');
  horizonGroup.className = 'rhythiax-history-horizon-group';
  horizonGroup.setAttribute('role', 'group');
  horizonGroup.setAttribute('aria-label', 'History time horizon');
  horizonGroup.innerHTML = `
    <button type="button" class="rhythiax-history-horizon-btn ${currentHorizon === '7d' ? 'active' : ''}" data-horizon="7d">7 Days</button>
    <button type="button" class="rhythiax-history-horizon-btn ${currentHorizon === '30d' ? 'active' : ''}" data-horizon="30d">30 Days</button>
    <button type="button" class="rhythiax-history-horizon-btn ${currentHorizon === 'weekly' ? 'active' : ''}" data-horizon="weekly">Weekly Rollup</button>
  `;

  header.append(headerLeft, horizonGroup);
  historyInner.appendChild(header);

  const tableWrap = document.createElement('div');
  tableWrap.className = 'rhythiax-history-table-wrap';

  const table = document.createElement('table');
  table.className = 'rhythiax-history-table';
  tableWrap.appendChild(table);
  historyInner.appendChild(tableWrap);

  function createDailyRow(point, previousPoint) {
    const tr = document.createElement('tr');
    tr.className = 'rhythiax-history-item';

    const change = dataUiMetricDelta(key, point.metrics?.[key], previousPoint?.metrics?.[key]);
    const deltaType = change === null ? 'neutral' : dataUiDeltaClass(change, false);

    const formattedValue = dataUiFormatValue(key, point.metrics?.[key]);
    const formattedDelta = change || '—';

    tr.innerHTML = `<td><span class="rhythiax-history-date">${dataUiEscapeHtml(formatHistoryDateLabel(point.date))}</span></td><td class="rhythiax-tar"><span class="rhythiax-history-value">${dataUiEscapeHtml(formattedValue)}</span></td><td class="rhythiax-tar"><span class="rhythiax-history-delta rhythiax-history-delta-${deltaType} ${deltaType}">${dataUiEscapeHtml(formattedDelta)}</span></td>`;
    return tr;
  }

  function renderHistoryRows() {
    if (!rawPoints.length) {
      table.innerHTML = `<thead><tr><th scope="col">Date</th><th scope="col" class="rhythiax-tar">Value</th><th scope="col" class="rhythiax-tar">Change</th></tr></thead><tbody><tr><td colspan="3" class="rhythiax-history-empty">History starts after the first saved profile state.</td></tr></tbody>`;
      tableWrap.classList.remove('rhythiax-history-scroll-container');
      return;
    }

    if (currentHorizon === 'weekly') {
      tableWrap.classList.toggle('rhythiax-history-scroll-container', rawPoints.length > 14);
      table.innerHTML = `<thead><tr><th scope="col">Week</th><th scope="col" class="rhythiax-tar">End Value</th><th scope="col" class="rhythiax-tar">Net Change</th></tr></thead><tbody></tbody>`;
      const tbody = table.querySelector('tbody');

      const weeks = dataUiGroupPointsByWeek(rawPoints);
      weeks.forEach((week, wIdx) => {
        const latestPt = week.points[0];
        const oldestPt = week.points[week.points.length - 1];
        const nextWeek = weeks[wIdx + 1];
        const baselinePt = nextWeek ? nextWeek.points[0] : oldestPt;
        const change = dataUiMetricDelta(key, latestPt.metrics?.[key], baselinePt?.metrics?.[key]);
        const deltaType = change === null ? 'neutral' : dataUiDeltaClass(change, false);
        const formattedVal = dataUiFormatValue(key, latestPt.metrics?.[key]);
        const formattedDelta = change || '—';

        const weekTr = document.createElement('tr');
        weekTr.className = `rhythiax-history-week-header-row ${wIdx === 0 ? 'is-open' : ''}`;
        weekTr.innerHTML = `
          <td>
            <svg class="rhythiax-history-week-chevron" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>
            <span class="rhythiax-history-date">${dataUiEscapeHtml(week.label)}</span>
            <span class="rhythiax-history-week-count-badge">${week.points.length}d</span>
          </td>
          <td class="rhythiax-tar"><span class="rhythiax-history-value">${dataUiEscapeHtml(formattedVal)}</span></td>
          <td class="rhythiax-tar"><span class="rhythiax-history-delta rhythiax-history-delta-${deltaType} ${deltaType}">${dataUiEscapeHtml(formattedDelta)}</span></td>
        `;
        tbody.appendChild(weekTr);

        const subRows = [];
        week.points.forEach((pt, pIdx) => {
          const prevPt = week.points[pIdx + 1] || nextWeek?.points?.[0];
          const subTr = createDailyRow(pt, prevPt);
          subTr.classList.add('rhythiax-history-week-subrow');
          if (wIdx !== 0) subTr.style.display = 'none';
          tbody.appendChild(subTr);
          subRows.push(subTr);
        });

        weekTr.addEventListener('click', (e) => {
          e.stopPropagation();
          const isOpen = weekTr.classList.toggle('is-open');
          subRows.forEach(sr => sr.style.display = isOpen ? '' : 'none');
        });
      });
      return;
    }

    // Daily modes: 7d or 30d
    const limit = currentHorizon === '7d' ? 7 : Math.min(30, rawPoints.length);
    const visiblePoints = rawPoints.slice(0, limit);

    tableWrap.classList.toggle('rhythiax-history-scroll-container', currentHorizon === '30d' && rawPoints.length > 7);
    table.innerHTML = `<thead><tr><th scope="col">Date &amp; State</th><th scope="col" class="rhythiax-tar">Value</th><th scope="col" class="rhythiax-tar">Change</th></tr></thead><tbody></tbody>`;
    const tbody = table.querySelector('tbody');

    visiblePoints.forEach((point, i) => {
      tbody.appendChild(createDailyRow(point, rawPoints[i + 1]));
    });
  }

  renderHistoryRows();

  horizonGroup.querySelectorAll('.rhythiax-history-horizon-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      currentHorizon = btn.dataset.horizon;
      horizonGroup.querySelectorAll('.rhythiax-history-horizon-btn').forEach(b => {
        b.classList.toggle('active', b === btn);
      });
      renderHistoryRows();
    });
  });

  historyRow.appendChild(historyInner);
  historyRow._rhythiaxHistoryRerender = () => renderHistoryRows();
  historyRow.setAttribute('data-rhythiax-history-type', 'metric');

  if (historyPane) {
    const wasOpen = historyPane.classList.contains('open');

    if (wasOpen) {
      // Switching metrics: smooth fast crossfade
      const oldInner = historyPane.querySelector('.rhythiax-history-row-inner');
      if (oldInner) {
        oldInner.classList.add('rhythiax-inner-leaving');
      }
      setTimeout(() => {
        historyPane.replaceChildren(historyRow);
        historyInner.classList.add('rhythiax-inner-entering');
        historyRow.classList.add('rhythiax-history-row-open');
      }, 100);
    } else {
      // First open
      historyPane.replaceChildren(historyRow);
      historyInner.classList.add('rhythiax-inner-entering');
      historyRow.classList.add('rhythiax-history-row-open');
      historyPane.classList.add('open');
    }
  } else {
    row.after(historyRow);
    row.classList.add('rhythiax-stat-row-open', 'active');
    row.setAttribute('aria-expanded', 'true');
    requestAnimationFrame(() => historyRow.classList.add('rhythiax-history-row-open'));
  }
};

function dataUiPreviousDate(dateText) {
  return RhythiaX.previousDate ? RhythiaX.previousDate(dateText) : '';
}

function dataUiDateMinusDays(dateText, days) {
  return RhythiaX.subtractDaysFromDate ? RhythiaX.subtractDaysFromDate(dateText, days) : '';
}

RhythiaX.showRankHistory = async function (trigger = null) {
  const returnFocus = trigger || (document.activeElement instanceof HTMLElement ? document.activeElement : null);
  const existing = document.querySelector('.rhythiax-rank-history-overlay');
  if (existing) {
    existing.remove();
    return;
  }
  const playerId = window.location.pathname.match(/\/player\/([^/]+)/)?.[1];
  if (!playerId) return;
  const settings = await RhythiaX.getDataSettings();
  const record = settings?.syncMode === 'cloud-only' ? null : await RhythiaX.getDataRecord(playerId);
  const cloud = settings?.syncMode === 'cloud-only' ? await getCachedVpsHistory(playerId) : null;
  const latestOpen = record?.history?.openDay?.captures?.slice(-1)[0];
  const closedHistory = Object.values(record?.history?.daily || {})
    .sort((left, right) => String(right.date).localeCompare(String(left.date)))
    .map(point => ({ ...point, kind: 'closed' }));
  const history = settings?.syncMode === 'cloud-only'
    ? buildMergedRankHistory(cloud?.history, null)
    : [
      ...(latestOpen ? [{ ...latestOpen, kind: 'open' }] : []),
      ...closedHistory,
    ];
  const overlay = document.createElement('div');
  overlay.className = 'rhythiax-rank-history-overlay';
  const dialog = document.createElement('section');
  dialog.className = 'rhythiax-rank-history-dialog';
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  dialog.setAttribute('aria-label', 'Ranking history');
  const heading = document.createElement('div');
  heading.className = 'rhythiax-rank-history-heading';
  const title = document.createElement('h2');
  title.textContent = 'Ranking history';
  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'rhythiax-rank-history-close';
  close.setAttribute('aria-label', 'Close ranking history');
  close.textContent = '×';
  heading.append(title, close);
  dialog.appendChild(heading);
  const weekly = document.createElement('div');
  weekly.className = 'rhythiax-rank-history-weekly';
  const latest = history[0];
  const previousWeek = latest ? history.find(point => point.date === dataUiDateMinusDays(latest.date, 7)) : null;
  [['Global Rank', 'globalRank', true], ['Country Rank', 'countryRank', true], ['Rhythm Points', 'rhythmPoints', false]].forEach(([label, key, rank]) => {
    const card = document.createElement('div');
    card.className = 'rhythiax-rank-history-weekly-card';
    const current = latest?.metrics?.[key];
    const previous = previousWeek?.metrics?.[key];
    const change = dataUiMetricDelta(key, current, previous);
    const labelSpan = document.createElement('span');
    labelSpan.textContent = label;
    const strong = document.createElement('strong');
    strong.textContent = current === null || current === undefined
      ? '—'
      : `${rank ? '#' : ''}${RhythiaX.formatNumber(current)}`;
    const small = document.createElement('small');
    small.textContent = change ? `${change} this week` : 'No weekly change';
    const deltaClass = change ? dataUiDeltaClass(change, rank) : 'neutral';
    small.className = `rhythiax-rank-history-delta-${deltaClass} ${deltaClass}`;
    card.append(labelSpan, strong, small);
    weekly.appendChild(card);
  });
  dialog.appendChild(weekly);
  const tableWrap = document.createElement('div');
  tableWrap.className = 'rhythiax-rank-history-table-wrap';
  const table = document.createElement('table');
  table.className = 'rhythiax-rank-history-table';
  table.innerHTML = '<thead><tr><th>Date</th><th>Global Rank</th><th>Country Rank</th><th>Rhythm Points</th></tr></thead><tbody></tbody>';
  const body = table.querySelector('tbody');
  history.forEach((point, index) => {
    const previous = history[index + 1];
    const row = document.createElement('tr');
    if (!index) row.className = 'rhythiax-rank-history-current';
    const date = document.createElement('td');
    const dateLabel = document.createElement('span');
    dateLabel.className = 'rhythiax-history-date';
    dateLabel.textContent = point.date || '—';
    date.appendChild(dateLabel);
    row.appendChild(date);
    [['globalRank', true, '#'], ['countryRank', true, '#'], ['rhythmPoints', false, '']].forEach(([key, rank, prefix]) => {
      const cell = document.createElement('td');
      cell.className = 'rhythiax-tar';
      const value = point.metrics?.[key];
      const changeValue = dataUiMetricDelta(key, value, previous?.metrics?.[key]);
      const deltaClass = changeValue ? dataUiDeltaClass(changeValue, rank) : 'neutral';
      const formattedVal = value === null || value === undefined ? '—' : `${prefix}${RhythiaX.formatNumber(value)}`;
      const formattedDelta = changeValue || '—';

      const content = document.createElement('span');
      content.className = 'rhythiax-cell-content';
      const main = document.createElement('strong');
      main.className = 'rhythiax-metric-cell-val';
      main.textContent = formattedVal;
      const change = document.createElement('small');
      change.textContent = formattedDelta;
      change.className = `rhythiax-history-delta rhythiax-history-delta-${deltaClass} rhythiax-rank-history-delta-${deltaClass} ${deltaClass}`;
      content.append(main, change);
      cell.appendChild(content);
      row.appendChild(cell);
    });
    body.appendChild(row);
  });
  tableWrap.appendChild(table);
  dialog.appendChild(tableWrap);
  overlay.appendChild(dialog);

  let isClosing = false;
  const finishClose = () => {
    if (isClosing) return;
    isClosing = true;
    document.removeEventListener('keydown', onDialogKeyDown, true);
    overlay.remove();
    if (returnFocus?.isConnected && typeof returnFocus.focus === 'function') {
      returnFocus.focus();
    }
  };
  const onDialogKeyDown = event => {
    if (event.key === 'Escape') {
      event.preventDefault();
      finishClose();
      return;
    }
    if (event.key === 'Tab') {
      RhythiaX.trapFocus?.(dialog, event);
    }
  };
  document.addEventListener('keydown', onDialogKeyDown, true);
  close.addEventListener('click', finishClose);
  overlay.addEventListener('click', event => { if (event.target === overlay) finishClose(); });
  document.body.appendChild(overlay);
  close.focus();
};

function buildMergedRankHistory(vpsHistory, localRecord) {
  const latestOpen = localRecord?.history?.openDay?.captures?.slice(-1)[0];
  const todayDate = latestOpen?.date || new Date().toISOString().slice(0, 10);
  const map = new Map();

  const contextPlayer = RhythiaX.profileHistoryContext?.player;
  const hereSince = contextPlayer?.created_at != null ? new Date(contextPlayer.created_at)
    : contextPlayer?.id != null ? null : RhythiaX.extractHereSince?.();
  const hereSinceDate = hereSince ? new Date(hereSince) : null;

  // 1. Add closed daily history from local storage
  const localDaily = Object.values(localRecord?.history?.daily || {});
  for (const point of localDaily) {
    if (point?.date) {
      map.set(point.date, {
        date: point.date,
        kind: 'closed',
        source: 'local',
        metrics: point.metrics || point
      });
    }
  }

  // 2. Overlay VPS history (VPS is authoritative for closed daily snapshots)
  if (Array.isArray(vpsHistory)) {
    for (const row of vpsHistory) {
      if (row?.date) {
        const existing = map.get(row.date);
        map.set(row.date, {
          date: row.date,
          kind: 'closed',
          source: 'cloud',
          metrics: {
            ...(existing?.metrics || {}),
            globalRank: row.globalRank ?? existing?.metrics?.globalRank,
            countryRank: row.countryRank ?? existing?.metrics?.countryRank,
            rhythmPoints: row.skillPoints ?? existing?.metrics?.rhythmPoints,
            weightedRp: row.skillPoints ?? existing?.metrics?.weightedRp,
            avgAccuracy: row.avgAccuracy ?? row.avg_accuracy ?? existing?.metrics?.avgAccuracy,
            playCount: row.playCount ?? existing?.metrics?.playCount,
            squaresHit: row.squaresHit ?? existing?.metrics?.squaresHit,
            mapsPerWeek: existing?.metrics?.mapsPerWeek ?? null
          }
        });
      }
    }
  }

  // 3. Overlay live open-day capture for today (Live session takes precedence for today)
  if (latestOpen) {
    const liveDate = latestOpen.date || todayDate;
    const liveMetrics = latestOpen.metrics || latestOpen;
    map.set(liveDate, {
      ...latestOpen,
      date: liveDate,
      kind: 'open',
      source: 'live',
      metrics: {
        ...liveMetrics,
        rhythmPoints: liveMetrics?.rhythmPoints ?? liveMetrics?.weightedRp,
        weightedRp: (liveMetrics?.weightedRp && Number(liveMetrics.weightedRp) > 0)
          ? liveMetrics.weightedRp
          : (liveMetrics?.rhythmPoints ?? liveMetrics?.weightedRp)
      }
    });
  }

  // 4. Calculate rolling 7-day mapsPerWeek from actual play count history
  const chronological = Array.from(map.values()).sort((a, b) => String(a.date).localeCompare(String(b.date)));
  for (let i = 0; i < chronological.length; i++) {
    const pt = chronological[i];
    if (pt.metrics) {
      const curPlay = Number(pt.metrics.playCount);
      if (Number.isFinite(curPlay) && curPlay > 0) {
        let baseline = null;
        const curTime = new Date(pt.date).getTime();
        for (let j = i - 1; j >= 0; j--) {
          const prev = chronological[j];
          const prevPlay = Number(prev?.metrics?.playCount);
          if (Number.isFinite(prevPlay) && prev.date) {
            const days = Math.round((curTime - new Date(prev.date).getTime()) / (1000 * 60 * 60 * 24));
            if (days >= 5 && days <= 9) {
              baseline = prev;
              break;
            }
            if (!baseline && days >= 1) {
              baseline = prev;
            }
          }
        }
        if (baseline) {
          const days = Math.max(1, Math.round((curTime - new Date(baseline.date).getTime()) / (1000 * 60 * 60 * 24)));
          const delta = Math.max(0, curPlay - Number(baseline.metrics.playCount));
          pt.metrics.mapsPerWeek = Number(((delta / days) * 7).toFixed(1));
        } else if (pt.metrics.mapsPerWeek === null || pt.metrics.mapsPerWeek === undefined) {
          if (hereSinceDate && !isNaN(hereSinceDate.getTime())) {
            const diffMs = Math.max(0, new Date(pt.date).getTime() - hereSinceDate.getTime());
            const weeks = diffMs / (1000 * 60 * 60 * 24 * 7);
            if (weeks > 0) {
              pt.metrics.mapsPerWeek = Number((curPlay / weeks).toFixed(1));
            }
          }
        }
      }
    }
  }

  // 5. Return sorted chronologically descending (newest first)
  return Array.from(map.values())
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));
}

function renderRankHistoryTable(container, history, isCloudSynced = false, couldNotReachCloud = false, settings = null) {
  const wrap = document.createElement('div');
  wrap.className = 'rhythiax-inline-rank-history';

  const weekly = document.createElement('div');
  weekly.className = 'rhythiax-rank-history-weekly';
  const latest = history[0];
  const previousWeek = latest ? (
    history.find(point => point.date === dataUiDateMinusDays(latest.date, 7)) ||
    history.find(point => point.date <= dataUiDateMinusDays(latest.date, 5) && point.date >= dataUiDateMinusDays(latest.date, 9)) ||
    (history.length > 1 ? history[history.length - 1] : null)
  ) : null;
  [['Global Rank', 'globalRank', true], ['Country Rank', 'countryRank', true], ['Rhythm Points', 'rhythmPoints', false]].forEach(([label, key, rank]) => {
    const card = document.createElement('div');
    card.className = 'rhythiax-rank-history-weekly-card';
    const current = latest?.metrics?.[key];
    const previous = previousWeek?.metrics?.[key];
    const change = dataUiMetricDelta(key, current, previous);
    const labelSpan = document.createElement('span');
    labelSpan.textContent = label;
    const strong = document.createElement('strong');
    strong.textContent = current === null || current === undefined
      ? '—'
      : `${rank ? '#' : ''}${RhythiaX.formatNumber(current)}`;
    const small = document.createElement('small');
    small.textContent = change ? `${change} this week` : 'No weekly change';
    const deltaClass = change ? dataUiDeltaClass(change, rank) : 'neutral';
    small.className = `rhythiax-rank-history-delta-${deltaClass} ${deltaClass}`;
    card.append(labelSpan, strong, small);
    weekly.appendChild(card);
  });
  wrap.appendChild(weekly);

  const historyRow = document.createElement('div');
  historyRow.className = 'rhythiax-history-row';

  const historyInner = document.createElement('div');
  historyInner.className = 'rhythiax-history-row-inner';

  // Table header bar with title and horizon selector
  const tableHeaderBar = document.createElement('div');
  tableHeaderBar.className = 'rhythiax-history-header';

  const tableHeaderLeft = document.createElement('div');
  tableHeaderLeft.className = 'rhythiax-history-header-left';
  const cloudWarning = couldNotReachCloud
    ? `<span class="rhythiax-cloud-badge rhythiax-cloud-error" style="display: inline-flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 500; color: var(--rhythiax-accent-danger, #f87171); margin-left: 8px;" title="Couldn't reach cloud — using local data">
         <svg style="width: 12px; height: 12px; stroke: currentColor; fill: none; stroke-width: 2;" viewBox="0 0 24 24"><path d="m2 2 20 20"/><path d="M16.72 11.06A5 5 0 0 0 6.54 13"/><path d="M5.66 17.66A7 7 0 0 1 9 5c2.3 0 4.3 1.1 5.5 2.8"/></svg>
         Couldn't reach cloud
       </span>`
    : '';
  tableHeaderLeft.innerHTML = `
    <svg class="rhythiax-history-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:15px;height:15px;flex-shrink:0;">
      <circle cx="12" cy="12" r="9"></circle>
      <polyline points="12 7 12 12 15 15"></polyline>
    </svg>
    <div class="rhythiax-history-title-group">
      <span class="rhythiax-history-title">Rank &amp; Rating Log</span>
      ${cloudWarning}
    </div>
  `;

  let currentHorizon = settings?.historyGrouping === 'daily'
    ? (history.length > 7 ? '30d' : '7d')
    : 'weekly';

  const horizonGroup = document.createElement('div');
  horizonGroup.className = 'rhythiax-history-horizon-group';
  horizonGroup.setAttribute('role', 'group');
  horizonGroup.setAttribute('aria-label', 'Ranking history time horizon');
  horizonGroup.innerHTML = `
    <button type="button" class="rhythiax-history-horizon-btn ${currentHorizon === '7d' ? 'active' : ''}" data-horizon="7d">7 Days</button>
    <button type="button" class="rhythiax-history-horizon-btn ${currentHorizon === '30d' ? 'active' : ''}" data-horizon="30d">30 Days</button>
    <button type="button" class="rhythiax-history-horizon-btn ${currentHorizon === 'weekly' ? 'active' : ''}" data-horizon="weekly">Weekly Rollup</button>
  `;
  tableHeaderBar.append(tableHeaderLeft, horizonGroup);
  historyInner.appendChild(tableHeaderBar);

  const tableWrap = document.createElement('div');
  tableWrap.className = 'rhythiax-history-table-wrap rhythiax-rank-history-table-wrap';
  const table = document.createElement('table');
  table.className = 'rhythiax-history-table rhythiax-rank-history-table';
  tableWrap.appendChild(table);
  historyInner.appendChild(tableWrap);

  historyRow.appendChild(historyInner);
  wrap.appendChild(historyRow);

  function renderRankRows() {
    if (currentHorizon === 'weekly') {
      tableWrap.classList.toggle('rhythiax-history-scroll-container', history.length > 14);
      table.innerHTML = `<thead><tr><th scope="col">Week</th><th scope="col" class="rhythiax-tar">Global Rank</th><th scope="col" class="rhythiax-tar">Country Rank</th><th scope="col" class="rhythiax-tar">Rhythm Points</th></tr></thead><tbody></tbody>`;
      const body = table.querySelector('tbody');

      const weeks = dataUiGroupPointsByWeek(history);
      weeks.forEach((week, wIdx) => {
        const latestPt = week.points[0];
        const oldestPt = week.points[week.points.length - 1];
        const nextWeek = weeks[wIdx + 1];
        const baselinePt = nextWeek ? nextWeek.points[0] : oldestPt;

        const weekTr = document.createElement('tr');
        weekTr.className = `rhythiax-history-week-header-row ${wIdx === 0 ? 'is-open' : ''}`;

        const dateTd = document.createElement('td');
        dateTd.innerHTML = `
          <svg class="rhythiax-history-week-chevron" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>
          <span class="rhythiax-history-date">${dataUiEscapeHtml(week.label)}</span>
          <span class="rhythiax-history-week-count-badge">${week.points.length}d</span>
        `;
        weekTr.appendChild(dateTd);

        [['globalRank', true, '#'], ['countryRank', true, '#'], ['rhythmPoints', false, '']].forEach(([key, rank, prefix]) => {
          const cell = document.createElement('td');
          cell.className = 'rhythiax-tar';
          const endVal = latestPt.metrics?.[key];
          const change = dataUiMetricDelta(key, endVal, baselinePt?.metrics?.[key]);
          const deltaClass = change ? dataUiDeltaClass(change, rank) : 'neutral';
          const formattedVal = endVal === null || endVal === undefined ? '—' : `${prefix}${RhythiaX.formatNumber(endVal)}`;
          const formattedDelta = change || '—';

          const content = document.createElement('span');
          content.className = 'rhythiax-cell-content';
          const main = document.createElement('strong');
          main.className = 'rhythiax-metric-cell-val';
          main.textContent = formattedVal;
          const small = document.createElement('small');
          small.textContent = formattedDelta;
          small.className = `rhythiax-history-delta rhythiax-history-delta-${deltaClass} rhythiax-rank-history-delta-${deltaClass} ${deltaClass}`;
          content.append(main, small);
          cell.appendChild(content);
          weekTr.appendChild(cell);
        });
        body.appendChild(weekTr);

        const subRows = [];
        week.points.forEach((pt, pIdx) => {
          const prevPt = week.points[pIdx + 1] || nextWeek?.points?.[0];
          const subTr = document.createElement('tr');
          subTr.className = 'rhythiax-history-item rhythiax-history-week-subrow';
          if (wIdx !== 0) subTr.style.display = 'none';

          const subDate = document.createElement('td');
          subDate.innerHTML = `<span class="rhythiax-history-date">${dataUiEscapeHtml(formatHistoryDateLabel(pt.date))}</span>`;
          subTr.appendChild(subDate);

          [['globalRank', true, '#'], ['countryRank', true, '#'], ['rhythmPoints', false, '']].forEach(([key, rank, prefix]) => {
            const cell = document.createElement('td');
            cell.className = 'rhythiax-tar';
            const value = pt.metrics?.[key];
            const changeValue = dataUiMetricDelta(key, value, prevPt?.metrics?.[key]);
            const deltaClass = changeValue ? dataUiDeltaClass(changeValue, rank) : 'neutral';
            const formattedVal = value === null || value === undefined ? '—' : `${prefix}${RhythiaX.formatNumber(value)}`;
            const formattedDelta = changeValue || '—';

            const content = document.createElement('span');
            content.className = 'rhythiax-cell-content';
            const main = document.createElement('strong');
            main.className = 'rhythiax-metric-cell-val';
            main.textContent = formattedVal;
            const small = document.createElement('small');
            small.textContent = formattedDelta;
            small.className = `rhythiax-history-delta rhythiax-history-delta-${deltaClass} rhythiax-rank-history-delta-${deltaClass} ${deltaClass}`;
            content.append(main, small);
            cell.appendChild(content);
            subTr.appendChild(cell);
          });

          body.appendChild(subTr);
          subRows.push(subTr);
        });

        weekTr.addEventListener('click', (e) => {
          e.stopPropagation();
          const isOpen = weekTr.classList.toggle('is-open');
          subRows.forEach(sr => sr.style.display = isOpen ? '' : 'none');
        });
      });
      return;
    }

    const limit = currentHorizon === '7d' ? 7 : Math.min(30, history.length);
    const visiblePoints = history.slice(0, limit);

    tableWrap.classList.toggle('rhythiax-history-scroll-container', currentHorizon !== '7d' && history.length > 7);
    table.innerHTML = `<thead><tr><th scope="col">Date</th><th scope="col" class="rhythiax-tar">Global Rank</th><th scope="col" class="rhythiax-tar">Country Rank</th><th scope="col" class="rhythiax-tar">Rhythm Points</th></tr></thead><tbody></tbody>`;
    const body = table.querySelector('tbody');

    visiblePoints.forEach((point, index) => {
      const previous = history[index + 1];
      const row = document.createElement('tr');
      if (!index) row.className = 'rhythiax-rank-history-current';
      const date = document.createElement('td');
      date.innerHTML = `<span class="rhythiax-history-date">${dataUiEscapeHtml(formatHistoryDateLabel(point.date))}</span>`;
      row.appendChild(date);
      [['globalRank', true, '#'], ['countryRank', true, '#'], ['rhythmPoints', false, '']].forEach(([key, rank, prefix]) => {
        const cell = document.createElement('td');
        cell.className = 'rhythiax-tar';
        const value = point.metrics?.[key];
        const changeValue = dataUiMetricDelta(key, value, previous?.metrics?.[key]);
        const deltaClass = changeValue ? dataUiDeltaClass(changeValue, rank) : 'neutral';
        const formattedVal = value === null || value === undefined ? '—' : `${prefix}${RhythiaX.formatNumber(value)}`;
        const formattedDelta = changeValue || '—';

        const content = document.createElement('span');
        content.className = 'rhythiax-cell-content';
        const main = document.createElement('strong');
        main.className = 'rhythiax-metric-cell-val';
        main.textContent = formattedVal;
        const small = document.createElement('small');
        small.textContent = formattedDelta;
        small.className = `rhythiax-history-delta rhythiax-history-delta-${deltaClass} rhythiax-rank-history-delta-${deltaClass} ${deltaClass}`;
        content.append(main, small);
        cell.appendChild(content);
        row.appendChild(cell);
      });
      body.appendChild(row);
    });
  }

  renderRankRows();

  horizonGroup.querySelectorAll('.rhythiax-history-horizon-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      currentHorizon = btn.dataset.horizon;
      horizonGroup.querySelectorAll('.rhythiax-history-horizon-btn').forEach(b => {
        b.classList.toggle('active', b === btn);
      });
      renderRankRows();
    });
  });

  container._rhythiaxHistoryRerender = () => renderRankRows();
  wrap._rhythiaxHistoryRerender = () => renderRankRows();
  container.setAttribute('data-rhythiax-history-type', 'rank');
  wrap.setAttribute('data-rhythiax-history-type', 'rank');

  container.replaceChildren(wrap);
}

RhythiaX.renderInlineRankHistory = async function (container, playerId) {
  if (!container) return;
  const navigationToken = RhythiaX.navigationToken;

  const id = playerId || window.location.pathname.match(/\/player\/([^/]+)/)?.[1];
  if (!id) {
    container.innerHTML = '<div class="rhythiax-rank-history-empty" style="padding: 24px; text-align: center; color: var(--rhythiax-text-muted, #a1a1aa);">Player ID not found.</div>';
    return;
  }

  // 0. Resolve sync mode
  const settings = typeof RhythiaX.getDataSettings === 'function'
    ? await RhythiaX.getDataSettings().catch(() => null)
    : null;
  const syncMode = settings?.syncMode || 'hybrid';

  // 1. Auto-Discovery: Report profile visit to VPS in background (only if not local-only)
  if (syncMode !== 'local-only' && typeof RhythiaX.reportVpsPlayerVisit === 'function') {
    RhythiaX.reportVpsPlayerVisit(id);
  }

  // 2. Fast Path: Render local data immediately if available (0ms delay) - unless cloud-only
  const localRecord = syncMode === 'cloud-only' ? null : await RhythiaX.getDataRecord(id);
  if (!dataUiProfileIsCurrent(id, navigationToken) || container.isConnected === false) return;
  const localHistory = buildMergedRankHistory(null, localRecord);

  let hasRendered = false;
  if (localHistory.length > 0) {
    renderRankHistoryTable(container, localHistory, false, false, settings);
    hasRendered = true;
  } else {
    container.innerHTML = '<div class="rhythiax-rank-history-loading" style="padding: 24px; text-align: center; color: var(--rhythiax-text-muted, #a1a1aa);">Loading ranking history...</div>';
  }

  // If local-only mode, stop here without querying VPS!
  if (syncMode === 'local-only') {
    if (!hasRendered) {
      container.innerHTML = '<div class="rhythiax-rank-history-empty" style="padding: 32px 16px; text-align: center; color: var(--rhythiax-text-muted, #a1a1aa); font-size: 13px;">No local ranking history recorded yet for this player.</div>';
    }
    return;
  }

  // 3. Background Path: Fetch authoritative cloud history from VPS
  try {
    const vpsData = await getCachedVpsHistory(id);
    if (!dataUiProfileIsCurrent(id, navigationToken) || container.isConnected === false) return;

    if (vpsData && Array.isArray(vpsData.history) && vpsData.history.length > 0) {
      const mergedHistory = buildMergedRankHistory(vpsData.history, syncMode === 'cloud-only' ? null : localRecord);
      if (mergedHistory.length > 0) {
        renderRankHistoryTable(container, mergedHistory, true, false, settings);
        return;
      }
    } else if (hasRendered) {
      renderRankHistoryTable(container, localHistory, false, true, settings);
    }
  } catch (err) {
    if (typeof RhythiaX.log === 'function') {
      RhythiaX.log('VPS history fetch failed, using local fallback:', err.message);
    }
    if (hasRendered) {
      renderRankHistoryTable(container, localHistory, false, true, settings);
    }
  }

  // 4. Fallback empty state if neither local nor VPS had records
  if (!hasRendered) {
    container.innerHTML = '<div class="rhythiax-rank-history-empty" style="padding: 32px 16px; text-align: center; color: var(--rhythiax-text-muted, #a1a1aa); font-size: 13px;">No ranking history recorded yet for this player.</div>';
  }
};

const PROGRESS_METRIC_CONFIG = [
  { key: 'weightedRp', label: 'Rhythm Points' },
  { key: 'avgAccuracy', label: 'AVG Accuracy' },
  { key: 'playCount', label: 'Play Count' },
  { key: 'squaresHit', label: 'Squares Hit' },
  { key: 'mapsPerWeek', label: 'Maps / Week' },
];

function renderProgressHistoryTable(container, history, isCloudSynced = false, couldNotReachCloud = false, settings = null) {
  const wrap = document.createElement('div');
  wrap.className = 'rhythiax-inline-progress-history';

  // 1. Update top metric cards with weekly deltas if they are present in the DOM
  const latest = history[0];
  const previousWeek = latest ? (
    history.find(point => point.date === dataUiDateMinusDays(latest.date, 7)) ||
    history.find(point => point.date <= dataUiDateMinusDays(latest.date, 5) && point.date >= dataUiDateMinusDays(latest.date, 9)) ||
    (history.length > 1 ? history[history.length - 1] : null)
  ) : null;

  PROGRESS_METRIC_CONFIG.forEach(m => {
    const card = document.querySelector(`.rhythiax-reimagined-metric-card[data-history-key="${m.key}"]`);
    if (card) {
      let currentVal = latest?.metrics?.[m.key];
      if (m.key === 'weightedRp' && (!currentVal || Number(currentVal) === 0)) {
        currentVal = latest?.metrics?.rhythmPoints ?? currentVal;
      }
      let prevVal = previousWeek?.metrics?.[m.key];
      if (m.key === 'weightedRp' && (!prevVal || Number(prevVal) === 0)) {
        prevVal = previousWeek?.metrics?.rhythmPoints ?? prevVal;
      }
      const change = dataUiMetricDelta(m.key, currentVal, prevVal);
      const valElem = card.querySelector('.rhythiax-reimagined-metric-value');
      if (valElem) {
        if (currentVal !== null && currentVal !== undefined) {
          const txt = (valElem.firstChild?.nodeType === 3 ? valElem.firstChild.nodeValue : valElem.textContent).trim();
          if (txt === '—' || m.key === 'mapsPerWeek') {
            const formatted = dataUiFormatValue(m.key, currentVal);
            const delta = valElem.querySelector('.rhythiax-profile-history-delta');
            if (valElem.firstChild && valElem.firstChild.nodeType === 3) {
              valElem.firstChild.nodeValue = formatted + (delta ? ' ' : '');
            } else if (!delta) {
              valElem.textContent = formatted;
            }
          }
        }
        if (change !== null) {
          dataUiAppendDelta(valElem, change, false);
        } else {
          valElem.querySelectorAll('.rhythiax-profile-history-delta').forEach(el => el.remove());
        }
      }
    }
  });

  const historyRow = document.createElement('div');
  historyRow.className = 'rhythiax-history-row rhythiax-progress-history-row';

  const historyInner = document.createElement('div');
  historyInner.className = 'rhythiax-history-row-inner';

  // Table header bar with title and horizon selector
  const tableHeaderBar = document.createElement('div');
  tableHeaderBar.className = 'rhythiax-history-header';

  const tableHeaderLeft = document.createElement('div');
  tableHeaderLeft.className = 'rhythiax-history-header-left';
  const cloudWarning = couldNotReachCloud
    ? `<span class="rhythiax-cloud-badge rhythiax-cloud-error" style="display: inline-flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 500; color: var(--rhythiax-accent-danger, #f87171); margin-left: 8px;" title="Couldn't reach cloud — using local data">
         <svg style="width: 12px; height: 12px; stroke: currentColor; fill: none; stroke-width: 2;" viewBox="0 0 24 24"><path d="m2 2 20 20"/><path d="M16.72 11.06A5 5 0 0 0 6.54 13"/><path d="M5.66 17.66A7 7 0 0 1 9 5c2.3 0 4.3 1.1 5.5 2.8"/></svg>
         Couldn't reach cloud
       </span>`
    : '';
  tableHeaderLeft.innerHTML = `
    <svg class="rhythiax-history-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:15px;height:15px;flex-shrink:0;">
      <circle cx="12" cy="12" r="9"></circle>
      <polyline points="12 7 12 12 15 15"></polyline>
    </svg>
    <div class="rhythiax-history-title-group">
      <span class="rhythiax-history-title">Progress &amp; Activity Log</span>
      ${cloudWarning}
    </div>
  `;

  let currentHorizon = settings?.historyGrouping === 'daily'
    ? (history.length > 7 ? '30d' : '7d')
    : 'weekly';

  const horizonGroup = document.createElement('div');
  horizonGroup.className = 'rhythiax-history-horizon-group';
  horizonGroup.setAttribute('role', 'group');
  horizonGroup.setAttribute('aria-label', 'Progress history time horizon');
  horizonGroup.innerHTML = `
    <button type="button" class="rhythiax-history-horizon-btn ${currentHorizon === '7d' ? 'active' : ''}" data-horizon="7d">7 Days</button>
    <button type="button" class="rhythiax-history-horizon-btn ${currentHorizon === '30d' ? 'active' : ''}" data-horizon="30d">30 Days</button>
    <button type="button" class="rhythiax-history-horizon-btn ${currentHorizon === 'weekly' ? 'active' : ''}" data-horizon="weekly">Weekly Rollup</button>
  `;
  tableHeaderBar.append(tableHeaderLeft, horizonGroup);
  historyInner.appendChild(tableHeaderBar);

  const tableWrap = document.createElement('div');
  tableWrap.className = 'rhythiax-history-table-wrap rhythiax-progress-history-table-wrap';
  const table = document.createElement('table');
  table.className = 'rhythiax-history-table rhythiax-progress-history-table';
  tableWrap.appendChild(table);
  historyInner.appendChild(tableWrap);

  historyRow.appendChild(historyInner);
  wrap.appendChild(historyRow);

  function createProgressDailyRow(point, previousPoint, isSubRow = false) {
    const tr = document.createElement('tr');
    tr.className = isSubRow ? 'rhythiax-history-item rhythiax-history-week-subrow' : 'rhythiax-history-item';

    const formattedDate = point.date ? formatHistoryDateLabel(point.date) : '—';
    let html = `<td><span class="rhythiax-history-date">${dataUiEscapeHtml(formattedDate)}</span></td>`;

    PROGRESS_METRIC_CONFIG.forEach(m => {
      const val = point.metrics?.[m.key];
      const prevVal = previousPoint?.metrics?.[m.key];
      const change = dataUiMetricDelta(m.key, val, prevVal);
      const deltaType = change === null ? 'neutral' : dataUiDeltaClass(change, false);
      const formattedVal = dataUiFormatValue(m.key, val);
      const formattedDelta = change || '—';

      html += `<td class="rhythiax-tar rhythiax-col-${m.key}"><span class="rhythiax-cell-content"><strong class="rhythiax-metric-cell-val">${dataUiEscapeHtml(formattedVal)}</strong><small class="rhythiax-history-delta rhythiax-history-delta-${deltaType} ${deltaType}">${dataUiEscapeHtml(formattedDelta)}</small></span></td>`;
    });

    tr.innerHTML = html;
    return tr;
  }

  function renderProgressRows() {
    if (!history.length) {
      table.innerHTML = `<thead><tr><th scope="col">Date</th>${PROGRESS_METRIC_CONFIG.map(m => `<th scope="col" class="rhythiax-tar">${m.label}</th>`).join('')}</tr></thead><tbody><tr><td colspan="6" class="rhythiax-history-empty">Progress history starts after the first recorded activity.</td></tr></tbody>`;
      tableWrap.classList.remove('rhythiax-history-scroll-container');
      return;
    }

    if (currentHorizon === 'weekly') {
      tableWrap.classList.toggle('rhythiax-history-scroll-container', history.length > 14);
      table.innerHTML = `
        <thead>
          <tr>
            <th scope="col" class="rhythiax-th-date">Week</th>
            ${PROGRESS_METRIC_CONFIG.map(m => `
              <th scope="col" class="rhythiax-tar rhythiax-col-${m.key}">${m.label}</th>
            `).join('')}
          </tr>
        </thead>
        <tbody></tbody>
      `;
      const tbody = table.querySelector('tbody');
      const weeks = dataUiGroupPointsByWeek(history);

      weeks.forEach((week, wIdx) => {
        const latestPt = week.points[0];
        const oldestPt = week.points[week.points.length - 1];
        const nextWeek = weeks[wIdx + 1];
        const baselinePt = nextWeek ? nextWeek.points[0] : oldestPt;

        const weekTr = document.createElement('tr');
        weekTr.className = `rhythiax-history-week-header-row ${wIdx === 0 ? 'is-open' : ''}`;

        let weekHtml = `
          <td>
            <svg class="rhythiax-history-week-chevron" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>
            <span class="rhythiax-history-date">${dataUiEscapeHtml(week.label)}</span>
            <span class="rhythiax-history-week-count-badge">${week.points.length}d</span>
          </td>
        `;

        PROGRESS_METRIC_CONFIG.forEach(m => {
          const endVal = latestPt.metrics?.[m.key];
          const change = dataUiMetricDelta(m.key, endVal, baselinePt?.metrics?.[m.key]);
          const deltaType = change === null ? 'neutral' : dataUiDeltaClass(change, false);
          const formattedVal = dataUiFormatValue(m.key, endVal);
          const formattedDelta = change || '—';

          weekHtml += `<td class="rhythiax-tar rhythiax-col-${m.key}"><span class="rhythiax-cell-content"><strong class="rhythiax-metric-cell-val">${dataUiEscapeHtml(formattedVal)}</strong><small class="rhythiax-history-delta rhythiax-history-delta-${deltaType} ${deltaType}">${dataUiEscapeHtml(formattedDelta)}</small></span></td>`;
        });

        weekTr.innerHTML = weekHtml;
        tbody.appendChild(weekTr);

        const subRows = [];
        week.points.forEach((pt, pIdx) => {
          const prevPt = week.points[pIdx + 1] || nextWeek?.points?.[0];
          const subTr = createProgressDailyRow(pt, prevPt, true);
          if (wIdx !== 0) subTr.style.display = 'none';
          tbody.appendChild(subTr);
          subRows.push(subTr);
        });

        weekTr.addEventListener('click', (e) => {
          e.stopPropagation();
          const isOpen = weekTr.classList.toggle('is-open');
          subRows.forEach(sr => sr.style.display = isOpen ? '' : 'none');
        });
      });
      return;
    }

    // Daily modes: 7d or 30d
    const limit = currentHorizon === '7d' ? 7 : Math.min(30, history.length);
    const visiblePoints = history.slice(0, limit);

    tableWrap.classList.toggle('rhythiax-history-scroll-container', currentHorizon === '30d' && history.length > 7);
    table.innerHTML = `
      <thead>
        <tr>
          <th scope="col" class="rhythiax-th-date">Date</th>
          ${PROGRESS_METRIC_CONFIG.map(m => `
            <th scope="col" class="rhythiax-tar rhythiax-col-${m.key}">${m.label}</th>
          `).join('')}
        </tr>
      </thead>
      <tbody></tbody>
    `;
    const tbody = table.querySelector('tbody');

    visiblePoints.forEach((point, i) => {
      tbody.appendChild(createProgressDailyRow(point, history[i + 1]));
    });
  }

  renderProgressRows();

  horizonGroup.querySelectorAll('.rhythiax-history-horizon-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      currentHorizon = btn.dataset.horizon;
      horizonGroup.querySelectorAll('.rhythiax-history-horizon-btn').forEach(b => {
        b.classList.toggle('active', b === btn);
      });
      renderProgressRows();
    });
  });

  container._rhythiaxHistoryRerender = () => renderProgressRows();
  wrap._rhythiaxHistoryRerender = () => renderProgressRows();
  container.setAttribute('data-rhythiax-history-type', 'progress');
  wrap.setAttribute('data-rhythiax-history-type', 'progress');

  container.replaceChildren(wrap);
}

RhythiaX.renderInlineProgressHistory = async function (container, playerId) {
  if (!container) return;
  const navigationToken = RhythiaX.navigationToken;

  const id = playerId || window.location.pathname.match(/\/player\/([^/]+)/)?.[1];
  if (!id) {
    container.innerHTML = '<div class="rhythiax-rank-history-empty" style="padding: 24px; text-align: center; color: var(--rhythiax-text-muted, #a1a1aa);">Player ID not found.</div>';
    return;
  }

  container.classList.add('open');

  // 0. Resolve sync mode
  const settings = typeof RhythiaX.getDataSettings === 'function'
    ? await RhythiaX.getDataSettings().catch(() => null)
    : null;
  const syncMode = settings?.syncMode || 'hybrid';

  // 1. Auto-Discovery: Report profile visit to VPS in background (only if not local-only)
  if (syncMode !== 'local-only' && typeof RhythiaX.reportVpsPlayerVisit === 'function') {
    RhythiaX.reportVpsPlayerVisit(id);
  }

  // 2. Fast Path: Render local data immediately if available (0ms delay) - unless cloud-only
  const localRecord = syncMode === 'cloud-only' ? null : await RhythiaX.getDataRecord(id);
  if (!dataUiProfileIsCurrent(id, navigationToken) || container.isConnected === false) return;
  const localHistory = buildMergedRankHistory(null, localRecord);

  let hasRendered = false;
  if (localHistory.length > 0) {
    renderProgressHistoryTable(container, localHistory, false, false, settings);
    hasRendered = true;
  } else {
    container.innerHTML = '<div class="rhythiax-rank-history-loading" style="padding: 24px; text-align: center; color: var(--rhythiax-text-muted, #a1a1aa);">Loading progress history...</div>';
  }

  // If local-only mode, stop here without querying VPS!
  if (syncMode === 'local-only') {
    if (!hasRendered) {
      container.innerHTML = '<div class="rhythiax-rank-history-empty" style="padding: 32px 16px; text-align: center; color: var(--rhythiax-text-muted, #a1a1aa); font-size: 13px;">No local progress history recorded yet for this player.</div>';
    }
    return;
  }

  // 3. Background Path: Fetch authoritative cloud history from VPS
  try {
    const vpsData = await getCachedVpsHistory(id);
    if (!dataUiProfileIsCurrent(id, navigationToken) || container.isConnected === false) return;

    if (vpsData && Array.isArray(vpsData.history) && vpsData.history.length > 0) {
      const mergedHistory = buildMergedRankHistory(vpsData.history, syncMode === 'cloud-only' ? null : localRecord);
      if (mergedHistory.length > 0) {
        renderProgressHistoryTable(container, mergedHistory, true, false, settings);
        return;
      }
    } else if (hasRendered) {
      renderProgressHistoryTable(container, localHistory, false, true, settings);
    }
  } catch (err) {
    if (typeof RhythiaX.log === 'function') {
      RhythiaX.log('VPS progress history fetch failed, using local fallback:', err.message);
    }
    if (hasRendered) {
      renderProgressHistoryTable(container, localHistory, false, true, settings);
    }
  }

  // 4. Fallback empty state if neither local nor VPS had records
  if (!hasRendered) {
    container.innerHTML = '<div class="rhythiax-rank-history-empty" style="padding: 32px 16px; text-align: center; color: var(--rhythiax-text-muted, #a1a1aa); font-size: 13px;">No progress history recorded yet for this player.</div>';
  }
};




RhythiaX.buildMergedRankHistory = buildMergedRankHistory;
RhythiaX.getCachedVpsHistory = getCachedVpsHistory;

RhythiaX.updateAllHistoryTables = function () {
  const rerendered = new Set();
  document.querySelectorAll('[data-rhythiax-history-type], .rhythiax-inline-rank-history, .rhythiax-inline-progress-history, .rhythiax-history-row').forEach(el => {
    if (typeof el._rhythiaxHistoryRerender === 'function' && !rerendered.has(el._rhythiaxHistoryRerender)) {
      rerendered.add(el._rhythiaxHistoryRerender);
      try {
        el._rhythiaxHistoryRerender();
      } catch (err) {
        if (typeof RhythiaX.log === 'function') {
          RhythiaX.log('Failed to rerender history table:', err);
        }
      }
    }
  });

  const activeCard = document.querySelector('.rhythiax-reimagined-metric-card.active, .rhythiax-stat-row-open');
  const key = activeCard?.dataset?.historyKey || activeCard?.dataset?.statKey;
  if (activeCard && key && typeof RhythiaX.showStatHistory === 'function') {
    const existingMetricRow = document.querySelector('.rhythiax-history-row[data-rhythiax-history-type="metric"]');
    if (!existingMetricRow || !rerendered.has(existingMetricRow._rhythiaxHistoryRerender)) {
      RhythiaX.showStatHistory(activeCard, key);
    }
  }
};

if (typeof chrome !== 'undefined' && chrome.storage?.onChanged) {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local' || !changes.rhythiaxModuleOptions) return;
    const oldFmt = changes.rhythiaxModuleOptions.oldValue?.appearance?.dateFormat || changes.rhythiaxModuleOptions.oldValue?.scoreCards?.dateFormat;
    const newFmt = changes.rhythiaxModuleOptions.newValue?.appearance?.dateFormat || changes.rhythiaxModuleOptions.newValue?.scoreCards?.dateFormat;
    if (newFmt && newFmt !== oldFmt) {
      if (typeof RhythiaX.updateAllHistoryTables === 'function') {
        RhythiaX.updateAllHistoryTables();
      }
    }
  });
}

if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
  chrome.runtime.onMessage.addListener(msg => {
    if (msg?.type === 'rhythiax-module-options' || msg?.type === 'rhythiax-date-format') {
      if (typeof RhythiaX.updateAllHistoryTables === 'function') {
        RhythiaX.updateAllHistoryTables();
      }
    }
  });
}
