// =============================================
// Rhythia X — Playstyle Feature: History & Data Loader
// Zero-spam cache layer for cloud & local history (up to 30d)
// =============================================

var RhythiaX = RhythiaX || {};

(function () {
  const HISTORY_CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes TTL
  const HISTORY_CACHE_VERSION = 3; // Refresh ranks changed by the old digit-prefix heuristic.
  const _memoryCache = new Map();

  function historyNumber(value) {
    if (value === null || value === undefined || value === '') return null;
    const count = Number(String(value).replace(/[,\s]/g, ''));
    return Number.isFinite(count) && count >= 0 ? count : null;
  }

  function normalizeOfficialHistory(history) {
    if (!Array.isArray(history)) return [];
    return history.map(point => {
      const date = String(point?.date || '');
      const timestamp = /^\d{4}-\d{2}-\d{2}$/.test(date) ? Date.parse(date + 'T00:00:00Z') : NaN;
      const rank = RhythiaX.PlaystyleDomain.parseNumber(point?.position ?? point?.globalRank ?? point?.rank);
      return { date, timestamp, rank };
    }).filter(point => point.rank > 0 && Number.isFinite(point.timestamp)
      && new Date(point.timestamp).toISOString().slice(0, 10) === point.date && point.timestamp <= Date.now())
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  function mergeOfficialHistory(points, official, liveRank) {
    const daily = new Map();
    for (const point of Array.isArray(points) ? points : []) {
      const timestamp = Number(point.timestamp) > 0 ? Number(point.timestamp) : Date.parse(point.date);
      if (!Number.isFinite(timestamp) || timestamp > Date.now()) continue;
      const date = new Date(timestamp).toISOString().slice(0, 10);
      const previous = daily.get(date);
      if (!previous || timestamp > previous.timestamp) daily.set(date, { ...point, date, timestamp });
    }
    for (const point of official) {
      const previous = daily.get(point.date);
      // Official daily ranks fill the longer window; keep RP/accuracy from the
      // cloud/local observation on that date, without copying them across dates.
      daily.set(point.date, { ...previous, ...point });
    }
    return sanitizeHistoryPoints([...daily.values()].sort((a, b) => b.timestamp - a.timestamp), liveRank);
  }

  async function getStorageCache(playerId) {
    if (typeof chrome === 'undefined' || !chrome.storage?.local) return null;
    return new Promise(resolve => {
      const key = `rhythiax_ps_hist_${playerId}`;
      chrome.storage.local.get([key], res => {
        if (chrome.runtime?.lastError || !res?.[key]) {
          resolve(null);
          return;
        }
        const entry = res[key];
        if (entry.version === HISTORY_CACHE_VERSION && Date.now() - (entry.timestamp || 0) < HISTORY_CACHE_TTL_MS) {
          resolve(entry.points || null);
        } else {
          resolve(null); // expired
        }
      });
    });
  }

  function setStorageCache(playerId, points) {
    if (typeof chrome === 'undefined' || !chrome.storage?.local || !Array.isArray(points)) return;
    const key = `rhythiax_ps_hist_${playerId}`;
    try {
      chrome.storage.local.set({
        [key]: {
          version: HISTORY_CACHE_VERSION,
          timestamp: Date.now(),
          points: points.slice(0, 45), // cap at last 45 points to save storage space
        }
      });
    } catch (_) {}
  }

  function extractHistoryFromDom() {
    if (typeof document === 'undefined') return null;
    const rows = document.querySelectorAll('.rhythiax-rank-history-table tbody tr:not(.rhythiax-history-week-header-row)');
    if (!rows || rows.length < 2) return null;
    const points = [];
    const domain = RhythiaX.PlaystyleDomain;
    for (const tr of rows) {
      const dateEl = tr.querySelector('.rhythiax-history-date');
      const valEl = tr.querySelector('.rhythiax-col-globalRank .rhythiax-metric-cell-val, .rhythiax-metric-cell-val, .rhythiax-history-value strong');
      const rpEl = tr.querySelector('.rhythiax-col-rhythmPoints .rhythiax-metric-cell-val');
      const rawText = valEl ? (valEl.textContent || '').replace(/#/g, '').replace(/,/g, '').trim() : '';
      const rankNum = domain ? domain.parseNumber(rawText) : parseInt(rawText.replace(/[^0-9]/g, ''), 10);
      if (rankNum > 0) {
        const dateStr = dateEl?.textContent?.trim() || '';
        const rpNum = rpEl ? (domain ? domain.parseNumber(rpEl.textContent) : parseFloat(rpEl.textContent.replace(/,/g, ''))) : 0;
        points.push({
          date: dateStr,
          timestamp: dateStr ? new Date(dateStr).getTime() || 0 : Date.now(),
          rank: rankNum,
          rp: rpNum > 0 ? rpNum : undefined
        });
      }
    }
    return points.length > 0 ? points : null;
  }

  function getAuthoritativeLiveRank() {
    const domain = RhythiaX.PlaystyleDomain;
    let liveRank = null;
    if (typeof RhythiaX.extractPlayerData === 'function') {
      const p = RhythiaX.extractPlayerData();
      liveRank = domain ? domain.parseNumber(p?.globalRank) : null;
    }
    if (!liveRank && typeof document !== 'undefined') {
      const headerEl = typeof RhythiaX.findHeaderRankArea === 'function' ? RhythiaX.findHeaderRankArea() : null;
      if (headerEl) {
        const cleanRank = typeof RhythiaX.extractCleanRankText === 'function'
          ? RhythiaX.extractCleanRankText(headerEl)
          : null;
        if (cleanRank && domain) liveRank = domain.parseNumber(cleanRank);
      }
    }
    return liveRank;
  }

  function sanitizeHistoryPoints(pts, authoritativeLiveRank) {
    if (!Array.isArray(pts) || !pts.length) return pts;
    const domain = RhythiaX.PlaystyleDomain;
    const live = domain ? domain.parseNumber(authoritativeLiveRank) : null;
    if (!live || live <= 0) return pts;
    const todayStr = new Date().toISOString().slice(0, 10);
    return pts.map(p => {
      let r = domain ? domain.parseNumber(p.rank) : Number(p.rank);
      // Historical ranks are observations, even when they share digits with
      // today's rank. Only today's point may use the authoritative live value.
      if (p.date === todayStr && r !== live) {
        r = live;
      }
      return { ...p, rank: r };
    });
  }

  /**
   * Resolve player history points from cache, VPS cloud, or local storage.
   * Collects up to 30 days of rank & accuracy snapshots.
   * Uses shared VPS caching and a short-lived derived cache across reloads.
   */
  async function resolvePlayerHistory(playerId, profile = {}) {
    // Stored/cloud history is keyed by player and represents Lock only.
    if (profile.profileMode && profile.profileMode !== 'normal') return [];
    const id = parseInt(playerId, 10);
    if (!Number.isSafeInteger(id) || id <= 0) return [];

    const domain = RhythiaX.PlaystyleDomain;
    const matchingProfile = !profile.id || String(profile.id) === String(id);
    const official = matchingProfile ? normalizeOfficialHistory(profile.rankHistory || profile.userProfile?.rank_history) : [];
    const liveRank = (matchingProfile && domain.parseNumber(profile.globalRank || profile.position)) || getAuthoritativeLiveRank();
    const finish = points => mergeOfficialHistory(points, official, liveRank);

    // 1. In-memory session cache (0ms)
    const mem = _memoryCache.get(id);
    if (mem && (Date.now() - mem.timestamp < HISTORY_CACHE_TTL_MS)) {
      return finish(mem.points);
    }

    // 2. Storage cache (0ms, persists across F5)
    const stored = await getStorageCache(id);
    if (stored && Array.isArray(stored) && stored.length > 0) {
      let sanitized = sanitizeHistoryPoints(stored, liveRank);
      if (liveRank && sanitized.length > 0 && sanitized[0].rank !== liveRank) {
        sanitized.unshift({
          date: new Date().toISOString().slice(0, 10),
          timestamp: Date.now(),
          rank: liveRank
        });
      }
      _memoryCache.set(id, { timestamp: Date.now(), points: sanitized });
      if (JSON.stringify(sanitized) !== JSON.stringify(stored)) {
        setStorageCache(id, sanitized);
      }
      return finish(sanitized);
    }

    // 3. Fast DOM fallback if page already rendered ranking history
    const domPoints = extractHistoryFromDom();
    if (domPoints && domPoints.length >= 2) {
      const sanitized = sanitizeHistoryPoints(domPoints, liveRank);
      _memoryCache.set(id, { timestamp: Date.now(), points: sanitized });
      setStorageCache(id, sanitized);
      return finish(sanitized);
    }

    // 4. Resolve via data-profile-ui merged rank history & cached VPS
    try {
      let points = [];

      const localRecord = typeof RhythiaX.getDataRecord === 'function'
        ? await RhythiaX.getDataRecord(id).catch(() => null)
        : null;

      let vpsData = null;
      if (typeof RhythiaX.getCachedVpsHistory === 'function') {
        vpsData = await RhythiaX.getCachedVpsHistory(id).catch(() => null);
      } else if (typeof RhythiaX.fetchVpsPlayerHistory === 'function') {
        vpsData = await RhythiaX.fetchVpsPlayerHistory(id, { timeout: 2500 }).catch(() => null);
      }

      if (typeof RhythiaX.buildMergedRankHistory === 'function') {
        const merged = RhythiaX.buildMergedRankHistory(vpsData?.history, localRecord);
        if (Array.isArray(merged) && merged.length > 0) {
          points = merged.map(p => {
            const m = p.metrics || p;
            const rankVal = m.globalRank ?? m.rank ?? p.globalRank ?? p.rank;
            const accVal = m.avgAccuracy ?? p.avgAccuracy;
            const rpVal = m.weightedRp ?? m.rhythmPoints ?? m.skillPoints ?? p.rp;
            return {
              date: p.date,
              timestamp: p.timestamp || (p.date ? new Date(p.date).getTime() : Date.now()),
              rank: domain ? domain.parseNumber(rankVal) : Number(rankVal),
              avgAccuracy: domain ? domain.parseNumber(accVal) : Number(accVal),
              rp: historyNumber(rpVal),
              playCount: historyNumber(m.playCount ?? p.playCount),
            };
          }).filter(p => p.rank > 0 || p.rp > 0);
        }
      }

      // If buildMergedRankHistory wasn't available, fallback to raw VPS/local
      if (!points.length) {
        let rawHistory = [];
        if (vpsData && Array.isArray(vpsData.history)) {
          rawHistory = vpsData.history;
        } else if (localRecord?.history?.daily) {
          rawHistory = Object.values(localRecord.history.daily);
        }

        points = rawHistory.map(p => {
          const m = p.metrics || p;
          const rankVal = m.globalRank ?? m.rank ?? p.rank ?? p.position;
          const accVal = m.avgAccuracy ?? p.avgAccuracy ?? p.accuracy;
          const rpVal = m.rp ?? m.weightedRp ?? m.rhythmPoints ?? m.skillPoints ?? m.skill_points;
          return {
            date: p.date,
            timestamp: p.timestamp || (p.date ? new Date(p.date).getTime() : Date.now()),
            rank: domain ? domain.parseNumber(rankVal) : Number(rankVal),
            avgAccuracy: domain ? domain.parseNumber(accVal) : Number(accVal),
            rp: historyNumber(rpVal),
            playCount: historyNumber(m.playCount ?? p.playCount),
          };
        }).filter(p => p.rank > 0 || p.rp > 0);
      }

      // Sort newest first
      points.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

      // 5. Prepend or sanitize authoritative live rank if known
      if (liveRank) {
        points = sanitizeHistoryPoints(points, liveRank);
        if (points.length > 0 && points[0].rank !== liveRank) {
          points.unshift({
            date: new Date().toISOString().slice(0, 10),
            timestamp: Date.now(),
            rank: liveRank
          });
        }
      }

      if (points.length > 0) {
        _memoryCache.set(id, { timestamp: Date.now(), points });
        setStorageCache(id, points);
      }

      return finish(points);
    } catch (err) {
      if (typeof RhythiaX.log === 'function') {
        RhythiaX.log('Playstyle history resolution caught non-fatal error:', err.message);
      }
      return finish([]);
    }
  }

  RhythiaX.PlaystyleLoader = {
    resolvePlayerHistory,
    normalizeOfficialHistory,
  };
})();
