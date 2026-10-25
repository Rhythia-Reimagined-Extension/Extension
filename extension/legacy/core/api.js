// =============================================
// Reimagined for Rhythia — Rhythia API requests and the player caches
// =============================================

var RhythiaX = RhythiaX || {};

function createApiRequestSignal(parentSignal, timeoutMs = 15000) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  const timer = window.setTimeout(abort, timeoutMs);
  if (parentSignal?.aborted) abort();
  else parentSignal?.addEventListener('abort', abort, { once: true });
  return {
    signal: controller.signal,
    dispose: () => {
      window.clearTimeout(timer);
      parentSignal?.removeEventListener('abort', abort);
    },
  };
}

function validPlayerId(playerId) {
  const id = String(playerId ?? '').trim();
  return /^[1-9]\d{0,15}$/.test(id) && Number.isSafeInteger(Number(id));
}

function restoreRecentWeightedRp(scoreSets) {
  if (!scoreSets) return scoreSets;
  RhythiaX.applyRecentWeightedRanking(scoreSets.recentScores, scoreSets.topScores);
  RhythiaX.applyRecentWeightedRanking(scoreSets.spinRecentScores, scoreSets.spinTopScores);
  RhythiaX.applyRecentWeightedRanking(scoreSets.vrRecentScores, scoreSets.vrTopScores);
  return scoreSets;
}

// ─── Authentication token resolver ────────────
// Rhythia's signed-in session, read as Exodus reads it (shared/rhythia-session.js); without that file
// nobody is signed in.
RhythiaX.getRhythiaAuthToken = () => RhythiaX.RhythiaSession?.token?.() || '';

// Rhythia's page's own answer for the same request, if it has a fresh one (page-api-bridge.js); else null.
// On that player's page it first gives the page up to waitMs to start the same request.
function pageAnswer(endpoint, playerId, session, waitMs) {
  return RhythiaX.PageApi?.take(endpoint, Number(playerId), Boolean(session), waitMs).catch(() => null) || Promise.resolve(null);
}

// Invalidate score sets cache in memory and sessionStorage
RhythiaX.invalidatePlayerScoreSets = function (playerId) {
  RhythiaX.PageApi?.forget();
  if (!playerId) return;
  const id = String(playerId).trim();
  if (RhythiaX.scoreSetsMemoryCache) {
    RhythiaX.scoreSetsMemoryCache.delete(id);
  }
  try {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem('rhythiax_score_sets_' + id);
    }
  } catch (_) {}
};

// ─── Background fetch ─────────────────────────
RhythiaX.scoreSetsInFlight = RhythiaX.scoreSetsInFlight || new Map();
RhythiaX.userProfileInFlight = RhythiaX.userProfileInFlight || new Map();

RhythiaX.fetchPlayerScoreSets = async function (playerId, signal) {
  if (!validPlayerId(playerId)) {
    RhythiaX.error('Refused score API request with an invalid player ID');
    return null;
  }
  const id = String(playerId).trim();
  const cached = RhythiaX.getCachedPlayerScoreSets(id);
  if (cached) return cached;

  if (RhythiaX.scoreSetsInFlight.has(id)) {
    return RhythiaX.scoreSetsInFlight.get(id);
  }

  const fetchPromise = (async () => {
    const request = createApiRequestSignal(signal);
    try {
      const sessionToken = RhythiaX.getRhythiaAuthToken();
      const [scoresResp, pinnedResp] = await Promise.all([
        (RhythiaX.Net?.fetch || fetch)('https://production.rhythia.com/api/getUserScores', {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
          signal: request.signal,
          body: JSON.stringify({ id: Number(playerId), limit: 200, session: sessionToken }),
        }),
        // Rhythia's page asks for the pinned scores too; its answer is used when it has one (page-api-bridge.js).
        pageAnswer('getPinnedScores', playerId, sessionToken, 1000).then(data => data ? { ok: true, json: async () => data } :
          (RhythiaX.Net?.fetch || fetch)('https://production.rhythia.com/api/getPinnedScores', {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
            signal: request.signal,
            body: JSON.stringify({ id: Number(playerId), session: sessionToken }),
          })).catch(() => null),
      ]);
      if (!scoresResp.ok) { RhythiaX.error('REST API returned an unsuccessful status', { status: scoresResp.status }); return null; }
      const data = await scoresResp.json();
      if (!data || typeof data !== 'object' || Array.isArray(data) || data.error) { RhythiaX.error('REST API returned an invalid or application-error response'); return null; }
      // `top` is the bounded score list used by the profile. `recent` and
      // `lastDay` are auxiliary "last 10" style lists and must not be added to
      // the profile totals. Reigning scores are the one intentional exception:
      // they count when they are outside the bounded top list.
      const asList = value => Array.isArray(value) ? value : [];
      const validEntries = scores => scores.filter(score => score && typeof score === 'object' && !Array.isArray(score));
      const rawTopSource = [data.top, data.topScores, data.scores, data.userScores, data.user_scores, data.results]
        .map(asList)
        .map(validEntries)
        .find(scores => scores.length) || [];
      const rawTop = rawTopSource.slice(0, 200);
      const rawReign = [
        ...validEntries(asList(data.reign)),
        ...validEntries(asList(data.reigning)),
        ...validEntries(asList(data.reining)),
        ...validEntries(asList(data.reignScores)),
      ];
      const rawRecent = [
        ...validEntries(asList(data.lastDay)),
        ...validEntries(asList(data.recent)),
        ...validEntries(asList(data.recentScores)),
      ];
      let rawPinned = [];
      if (pinnedResp && pinnedResp.ok) {
        try {
          const pinnedData = await pinnedResp.json();
          if (Array.isArray(pinnedData?.pinnedScores)) {
            rawPinned = validEntries(pinnedData.pinnedScores);
          }
        } catch (_) {}
      }
      const topScores = RhythiaX.dedupeScores(RhythiaX.mapApiScores(rawTop)).map(s => ({ ...s, category: 'top' }));
      const reignScores = RhythiaX.dedupeScores(RhythiaX.mapApiScores(rawReign)).map(s => ({ ...s, isReign: true, category: 'reign' }));
      const recentScores = RhythiaX.dedupeScores(RhythiaX.mapApiScores(rawRecent)).map(s => ({ ...s, isRecent: true, category: 'recent' }));
      const pinnedScores = RhythiaX.dedupeScores(RhythiaX.mapApiScores(rawPinned));
      const spinTopScores = RhythiaX.dedupeScores(RhythiaX.mapApiScores(validEntries(asList(data.spinTop))));
      const spinRecentScores = RhythiaX.dedupeScores(RhythiaX.mapApiScores(validEntries(asList(data.spinRecent))));
      const vrTopScores = RhythiaX.dedupeScores(RhythiaX.mapApiScores(validEntries(asList(data.vrTop))));
      const vrRecentScores = RhythiaX.dedupeScores(RhythiaX.mapApiScores(validEntries(asList(data.vrRecent))));

      // The API order is the canonical Top Scores order used for RP decay.
      RhythiaX.applyWeightedRanking(topScores);

      // Pinned scores: match against topScores to inherit true weighted RP and rank
      pinnedScores.forEach(ps => {
        const topMatch = topScores.find(ts =>
          (ps.scoreId && String(ts.scoreId) === String(ps.scoreId)) ||
          (ps.songId && ts.songId && String(ts.songId) === String(ps.songId) && ts.speed === ps.speed)
        );
        if (topMatch) {
          ps.rankIndex = topMatch.rankIndex;
          ps.weightedRp = topMatch.weightedRp;
          ps.weightPercent = topMatch.weightPercent;
        }
      });

      RhythiaX.applyWeightedRanking(spinTopScores);
      RhythiaX.applyWeightedRanking(vrTopScores);
      const allScores = RhythiaX.dedupeScores([...topScores, ...reignScores]);
      // Keep both properties for callers/cache compatibility, but make the
      // expanded set the source for every profile statistic.
      const result = {
        stats: data.stats && typeof data.stats === 'object' && !Array.isArray(data.stats)
          ? { totalScores: data.stats.totalScores, averageAccuracy: data.stats.averageAccuracy,
              averageRhythmPoints: data.stats.averageRhythmPoints }
          : null,
        scores: allScores,
        ratingScores: allScores,
        topScores,
        reignScores,
        recentScores,
        pinnedScores,
        spinTopScores,
        spinRecentScores,
        vrTopScores,
        vrRecentScores,
        allCardScores: RhythiaX.dedupeScores([...topScores, ...reignScores, ...recentScores, ...pinnedScores, ...spinTopScores, ...spinRecentScores, ...vrTopScores, ...vrRecentScores]),
        topScoreCount: topScores.length,
        scoreLimit: 200,
      };
      restoreRecentWeightedRp(result);
      RhythiaX.setCachedPlayerScoreSets?.(id, result);
      return result;
    } catch (err) {
      if (err?.name !== 'AbortError') RhythiaX.captureError(err, 'REST fetch failed');
      return null;
    } finally {
      request.dispose();
      RhythiaX.scoreSetsInFlight.delete(id);
    }
  })();

  RhythiaX.scoreSetsInFlight.set(id, fetchPromise);
  return fetchPromise;
};

RhythiaX.fetchUserProfile = async function (playerId, signal) {
  if (!validPlayerId(playerId)) {
    return null;
  }
  const id = String(playerId).trim();
  const cached = RhythiaX.getCachedUserProfile(id);
  if (cached) return cached;

  if (RhythiaX.userProfileInFlight.has(id)) {
    return RhythiaX.userProfileInFlight.get(id);
  }

  const fetchPromise = (async () => {
    const request = createApiRequestSignal(signal);
    try {
      const session = RhythiaX.getRhythiaAuthToken();
      let data = await pageAnswer('getProfile', playerId, session, 400);
      if (!data) {
        const resp = await (RhythiaX.Net?.fetch || fetch)('https://production.rhythia.com/api/getProfile', {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
          signal: request.signal,
          body: JSON.stringify({ id: Number(playerId), session }),
        });
        if (!resp.ok) return null;
        data = await resp.json();
      }
      const user = data?.user || null;
      if (user) RhythiaX.setCachedUserProfile?.(id, user);
      return user;
    } catch (err) {
      if (err?.name !== 'AbortError') RhythiaX.captureError(err, 'Profile API fetch failed');
      return null;
    } finally {
      request.dispose();
      RhythiaX.userProfileInFlight.delete(id);
    }
  })();

  RhythiaX.userProfileInFlight.set(id, fetchPromise);
  return fetchPromise;
};

RhythiaX.prefetchPlayerData = function (playerId) {
  if (!validPlayerId(playerId)) return;
  // Exodus loads its own profile data.
  if (RhythiaX.exodusShowing?.()) return;
  const id = String(playerId).trim();
  if (!RhythiaX.getCachedPlayerScoreSets(id) && !RhythiaX.scoreSetsInFlight.has(id)) {
    RhythiaX.fetchPlayerScoreSets(id).catch(() => null);
  }
  if (!RhythiaX.getCachedUserProfile(id) && !RhythiaX.userProfileInFlight.has(id)) {
    RhythiaX.fetchUserProfile(id).catch(() => null);
  }
};

RhythiaX.mergeWeightedRp = function (scoreSets, sourceScores) {
  const weightedById = new Map();
  (sourceScores || []).forEach(score => {
    const raw = String(score.weightedRp ?? '').trim();
    const value = /\d/.test(raw)
      ? (RhythiaX.parseLocalizedNumber ? RhythiaX.parseLocalizedNumber(raw) : Number.parseFloat(raw.replace(/,/g, '')))
      : Number.NaN;
    if (score.scoreId && Number.isFinite(value) && value > 0) {
      weightedById.set(String(score.scoreId), {
        weightedRp: String(value),
        rankIndex: score.rankIndex,
        weightPercent: score.weightPercent,
      });
    }
  });
  [scoreSets?.scores, scoreSets?.ratingScores, scoreSets?.topScores, scoreSets?.pinnedScores].forEach(scores => {
    (scores || []).forEach(score => {
      const verified = weightedById.get(String(score.scoreId));
      if (!verified) return;
      const current = RhythiaX.parseLocalizedNumber
        ? RhythiaX.parseLocalizedNumber(score.weightedRp)
        : Number.parseFloat(String(score.weightedRp ?? '').replace(/,/g, ''));
      if (!Number.isFinite(current) || current <= 0) score.weightedRp = verified.weightedRp;
      if (verified.rankIndex !== undefined) score.rankIndex = verified.rankIndex;
      if (verified.weightPercent !== undefined) score.weightPercent = verified.weightPercent;
    });
  });
  return scoreSets;
};

const PLAYER_MEMORY_CACHE_MAX_ENTRIES = 32;
const PLAYER_MEMORY_CACHE_TTL_MS = 5 * 60 * 1000;

// These caches retain Map semantics for existing callers. Expiration is checked
// only on access/write (no timer), and recent reads protect active profiles from
// eviction without extending the freshness of their API data.
class PlayerMemoryCache extends Map {
  pruneExpired() {
    const now = Date.now();
    for (const [key, entry] of this) {
      if (!entry || !Number.isFinite(entry.time) || now - entry.time >= PLAYER_MEMORY_CACHE_TTL_MS) {
        super.delete(key);
      }
    }
  }

  has(key) {
    this.pruneExpired();
    return super.has(key);
  }

  get(key) {
    this.pruneExpired();
    const entry = super.get(key);
    if (super.has(key)) {
      super.delete(key);
      super.set(key, entry);
    }
    return entry;
  }

  set(key, entry) {
    this.pruneExpired();
    super.delete(key);
    if (!entry || !Number.isFinite(entry.time) || Date.now() - entry.time >= PLAYER_MEMORY_CACHE_TTL_MS) return this;
    super.set(key, entry);
    while (this.size > PLAYER_MEMORY_CACHE_MAX_ENTRIES) {
      super.delete(this.keys().next().value);
    }
    return this;
  }
}

RhythiaX.scoreSetsMemoryCache = new PlayerMemoryCache(RhythiaX.scoreSetsMemoryCache);
RhythiaX.userProfileMemoryCache = new PlayerMemoryCache(RhythiaX.userProfileMemoryCache);

// The same entries also live in the tab's sessionStorage, so a reload can paint at once.
// That storage is small and shared with Rhythia, so before each write the cache's expired
// entries go and at most PLAYER_MEMORY_CACHE_MAX_ENTRIES of the newest stay. Only keys with
// the cache's own prefix are read. An entry is written as {"data":...,"time":N}, so its time
// is read from the end of the text without parsing the whole score list.
function sessionPlayerCacheTime(raw) {
  if (typeof raw !== 'string') return NaN;
  const tail = raw.slice(-40).match(/"time":(\d+)\}$/);
  if (tail) return Number(tail[1]);
  try {
    const time = JSON.parse(raw)?.time;
    return Number.isFinite(time) ? time : NaN;
  } catch (_) {
    return NaN;
  }
}

function pruneSessionPlayerCache(prefix, id) {
  if (typeof sessionStorage.key !== 'function') return;
  const now = Date.now();
  const keys = [];
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (key && key.startsWith(prefix) && key !== prefix + id) keys.push(key);
  }
  const fresh = [];
  keys.forEach(key => {
    const time = sessionPlayerCacheTime(sessionStorage.getItem(key));
    if (!Number.isFinite(time) || now - time >= PLAYER_MEMORY_CACHE_TTL_MS) sessionStorage.removeItem(key);
    else fresh.push([time, key]);
  });
  fresh.sort((a, b) => b[0] - a[0]).slice(PLAYER_MEMORY_CACHE_MAX_ENTRIES - 1)
    .forEach(([, key]) => sessionStorage.removeItem(key));
}

RhythiaX.getCachedPlayerScoreSets = function (playerId) {
  if (!playerId) return null;
  const id = String(playerId).trim();
  const memoryEntry = RhythiaX.scoreSetsMemoryCache.get(id);
  if (memoryEntry) return restoreRecentWeightedRp(memoryEntry.data);
  try {
    const raw = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('rhythiax_score_sets_' + id) : null;
    if (raw) {
      const entry = JSON.parse(raw);
      if (entry && Number.isFinite(entry.time) && Date.now() - entry.time < PLAYER_MEMORY_CACHE_TTL_MS) {
        RhythiaX.scoreSetsMemoryCache.set(id, entry);
        return restoreRecentWeightedRp(entry.data);
      }
      sessionStorage.removeItem('rhythiax_score_sets_' + id);
    }
  } catch (_) {}
  return null;
};

RhythiaX.setCachedPlayerScoreSets = function (playerId, data) {
  if (!playerId || !data) return;
  const id = String(playerId).trim();
  const entry = { data, time: Date.now() };
  RhythiaX.scoreSetsMemoryCache.set(id, entry);
  try {
    if (typeof sessionStorage !== 'undefined') {
      pruneSessionPlayerCache('rhythiax_score_sets_', id);
      sessionStorage.setItem('rhythiax_score_sets_' + id, JSON.stringify(entry));
    }
  } catch (_) {}
};

RhythiaX.getCachedUserProfile = function (playerId) {
  if (!playerId) return null;
  const id = String(playerId).trim();
  const memoryEntry = RhythiaX.userProfileMemoryCache.get(id);
  if (memoryEntry) return memoryEntry.data;
  try {
    const raw = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('rhythiax_user_profile_' + id) : null;
    if (raw) {
      const entry = JSON.parse(raw);
      if (entry && Number.isFinite(entry.time) && Date.now() - entry.time < PLAYER_MEMORY_CACHE_TTL_MS) {
        RhythiaX.userProfileMemoryCache.set(id, entry);
        return entry.data;
      }
      sessionStorage.removeItem('rhythiax_user_profile_' + id);
    }
  } catch (_) {}
  return null;
};

RhythiaX.setCachedUserProfile = function (playerId, data) {
  if (!playerId || !data) return;
  const id = String(playerId).trim();
  const entry = { data, time: Date.now() };
  RhythiaX.userProfileMemoryCache.set(id, entry);
  try {
    if (typeof sessionStorage !== 'undefined') {
      pruneSessionPlayerCache('rhythiax_user_profile_', id);
      sessionStorage.setItem('rhythiax_user_profile_' + id, JSON.stringify(entry));
    }
  } catch (_) {}
};
