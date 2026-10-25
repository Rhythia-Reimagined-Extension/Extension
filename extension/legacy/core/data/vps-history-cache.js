// =============================================
// Reimagined for Rhythia — online history cache (Classic)
// =============================================
// The online history of a player, kept in chrome.storage and shared by the tabs, and
// buildMergedRankHistory, which lays it over this device's own days. Data only: what is on
// screen is drawn again by data-profile-ui.js (on a storage change, or when an answer came late)
// and statistics/history-tables.js.

var RhythiaX = RhythiaX || {};

RhythiaX._vpsPlayerHistoryCache = RhythiaX._vpsPlayerHistoryCache || new Map();
const VPS_HISTORY_CACHE_PREFIX = 'rhythiaxVpsHistoryCache:';
// How long an answer is used before the service is asked again. A full history: 30 minutes, since the
// service adds one closed day a day. A short one (recentOnly: the service wanted an installation key and
// had none, so it sent only the last three days): 10 minutes, and only in this tab, since the background
// waits at least as long before it asks for a key again (background/vps-access.js); it is never saved as the
// player's history. Anything else (no history, a failed request, an older copy shown after one): a minute.
// After a failed request a saved full history is still shown until 40 minutes after its answer came (KEEP);
// older copies go when the next one is saved (vpsHistoryCacheAge), and in the background's daily sweep, which
// ages them the same way (background/storage-mutation-authority.js VPS_CACHE_MS).
const VPS_HISTORY_CACHE_TTL_MS = 60 * 1000;
const VPS_HISTORY_CACHE_FRESH_MS = 30 * 60 * 1000;
const VPS_HISTORY_CACHE_RECENT_MS = 10 * 60 * 1000;
const VPS_HISTORY_CACHE_KEEP_MS = 40 * 60 * 1000;
const VPS_HISTORY_CACHE_MAX_ENTRIES = 20;
const VPS_HISTORY_CACHE_MAX_BYTES = 400 * 1024;
let historyCacheRevision = 0;

// The revision moves on when settings or a history clear change what may be shown; a request
// started under an older revision is dropped. Other files read and move it only through here.
RhythiaX.VpsHistoryCache = {
  revision: () => historyCacheRevision,
  bumpRevision() {
    historyCacheRevision++;
  }
};

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

// How old a saved entry is: one that holds history from when its answer came (lastSuccessAt, which a copy
// saved again after a failed request keeps), one without from when it was saved.
function vpsHistoryCacheAge(entry, now) {
  return now - Number(entry?.data ? entry.lastSuccessAt || entry.fetchedAt : entry?.fetchedAt);
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
        const prune = all => {
          const entries = Object.entries(all || {})
            .filter(([key]) => key.startsWith(VPS_HISTORY_CACHE_PREFIX))
            .sort(([, a], [, b]) => Number(b?.fetchedAt || 0) - Number(a?.fetchedAt || 0));
          const obsolete = entries.slice(VPS_HISTORY_CACHE_MAX_ENTRIES)
            .concat(entries.filter(([, value]) => !value || vpsHistoryCacheAge(value, Date.now()) > VPS_HISTORY_CACHE_KEEP_MS))
            .map(([key]) => key);
          if (obsolete.length) chrome.storage.local.remove([...new Set(obsolete)]);
        };
        try {
          // Only the cache's own keys are read where data-repository.js offers that lookup.
          if (typeof RhythiaX.dataStorageGetPrefixed === 'function') {
            Promise.resolve(RhythiaX.dataStorageGetPrefixed(VPS_HISTORY_CACHE_PREFIX)).then(prune).catch(() => {});
          } else {
            chrome.storage.local.get(null, all => {
              if (chrome.runtime?.lastError) return;
              prune(all);
            });
          }
        } catch (_) {}
      });
    } catch (_) { resolve(false); }
  });
}

// Until when a saved entry is used without asking. A full answer is saved with lastSuccessAt equal to
// fetchedAt; an older copy saved again after a failed request keeps the time its answer came.
function vpsHistoryFreshUntil(entry) {
  const fetchedAt = Number(entry?.fetchedAt) || 0;
  const full = Boolean(entry?.data) && Number(entry.lastSuccessAt) === fetchedAt;
  return fetchedAt + (full ? VPS_HISTORY_CACHE_FRESH_MS : VPS_HISTORY_CACHE_TTL_MS);
}

// What an answer (or a failure, null) leaves for the other tabs, what is shown, and until when this tab
// uses it (state.freshUntil). cached is the saved entry from before the request.
async function settleVpsHistory(id, data, cached, state, revision) {
  const now = Date.now();
  state.freshUntil = now + VPS_HISTORY_CACHE_TTL_MS;
  if (data?.unavailable) {
    RhythiaX.PlaystyleLoader?.invalidatePlayer?.(id);
    invalidateVisibleHistory(id);
    await writeVpsHistoryCache(id, null, now, 0);
    return null;
  }
  // A short answer is shown as one and kept only in this tab; what is saved stays as it was.
  if (data?.recentOnly) {
    state.freshUntil = now + VPS_HISTORY_CACHE_RECENT_MS;
    return { history: data.history, recentOnly: true };
  }
  const staleData = cached?.data && vpsHistoryCacheAge(cached, now) < VPS_HISTORY_CACHE_KEEP_MS ? cached.data : null;
  // A failed request (timeout, 429, 5xx, offline) is not "no history": with no recent copy
  // nothing is saved, and only this tab keeps the miss, for a minute.
  if (!data && !staleData) return null;
  // Only the history is read back, so only the history is kept.
  const usableData = data ? { history: data.history } : staleData;
  if (data) state.freshUntil = now + VPS_HISTORY_CACHE_FRESH_MS;
  await writeVpsHistoryCache(id, usableData, now, data ? now : cached?.lastSuccessAt || cached?.fetchedAt);
  if (revision !== historyCacheRevision) {
    if (typeof chrome !== 'undefined') chrome.storage?.local?.remove(`${VPS_HISTORY_CACHE_PREFIX}${id}`);
    return null;
  }
  return usableData;
}

// An answer that came after the page stopped waiting (fetchVpsPlayerHistory's onLate) is kept like one
// that came in time, and the open profile's history is drawn again with it. "No history" redraws through
// the saved empty entry (the storage listener in data-profile-ui.js).
async function keepLateVpsHistory(id, data, cached, revision) {
  if (revision !== historyCacheRevision) return;
  const state = { pending: false, freshUntil: 0, promise: null };
  const value = await settleVpsHistory(id, data, cached, state, revision);
  if (!value || revision !== historyCacheRevision) return;
  state.promise = Promise.resolve(value);
  RhythiaX._vpsPlayerHistoryCache.set(id, state);
  RhythiaX.PlaystyleLoader?.invalidatePlayer?.(id);
  if (currentHistoryPlayerId() === String(id)) scheduleVisibleHistoryRedraw();
}

async function getCachedVpsHistory(playerId) {
  const id = Number(playerId);
  if (!Number.isSafeInteger(id) || id <= 0) return null;
  const revision = historyCacheRevision;
  const mode = typeof RhythiaX.getVpsSyncMode === 'function' ? await RhythiaX.getVpsSyncMode()
    : typeof RhythiaX.getDataSettings === 'function' ? (await RhythiaX.getDataSettings())?.syncMode : 'hybrid';
  if (mode === 'local-only' || revision !== historyCacheRevision) return null;
  const existing = RhythiaX._vpsPlayerHistoryCache.get(id);
  if (existing && (existing.pending || Date.now() < existing.freshUntil)) return existing.promise;
  if (typeof RhythiaX.fetchVpsPlayerHistory !== 'function') return null;
  const state = { pending: true, freshUntil: 0, promise: null };
  const promise = (async () => {
    const cached = await readVpsHistoryCache(id);
    if (revision !== historyCacheRevision) return null;
    if (cached && Date.now() < vpsHistoryFreshUntil(cached)) {
      state.freshUntil = vpsHistoryFreshUntil(cached);
      return cached.data;
    }
    const data = await RhythiaX.fetchVpsPlayerHistory(id, { withStatus: true, onLate: late => keepLateVpsHistory(id, late, cached, revision) });
    if (revision !== historyCacheRevision) return null;
    return settleVpsHistory(id, data, cached, state, revision);
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

function dataUiDateMinusDays(dateText, days) {
  return RhythiaX.subtractDaysFromDate ? RhythiaX.subtractDaysFromDate(dateText, days) : '';
}

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


RhythiaX.buildMergedRankHistory = buildMergedRankHistory;
RhythiaX.getCachedVpsHistory = getCachedVpsHistory;
