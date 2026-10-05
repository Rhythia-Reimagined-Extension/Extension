// =============================================
// Rhythia X — API fetch & cross-verification
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
RhythiaX.getRhythiaAuthToken = function () {
  if (typeof localStorage === 'undefined') return '';
  // 1. Direct legacy session key
  try {
    const legacy = localStorage.getItem('rhythia_auth_session_v1');
    if (legacy && legacy.trim()) return legacy.trim();
  } catch (_) {}

  // 2. Supabase auth token keys (e.g. sb-pfkajngbllcbdzoylrvp-auth-token)
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const parsed = JSON.parse(raw);
        const token = parsed?.access_token || parsed?.session?.access_token || (Array.isArray(parsed) && parsed[0]?.access_token);
        if (typeof token === 'string' && token.length > 10) {
          return token;
        }
      }
    }
  } catch (_) {}

  // 3. Fallback: inspect any non-rhythiax key with access_token
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || key.startsWith('rhythiax')) continue;
      const raw = localStorage.getItem(key);
      if (raw && raw.includes('access_token')) {
        const parsed = JSON.parse(raw);
        const token = parsed?.access_token || parsed?.session?.access_token;
        if (typeof token === 'string' && token.length > 10) {
          return token;
        }
      }
    }
  } catch (_) {}

  return '';
};

// Invalidate score sets cache in memory and sessionStorage
RhythiaX.invalidatePlayerScoreSets = function (playerId) {
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
        fetch('https://production.rhythia.com/api/getUserScores', {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
          signal: request.signal,
          body: JSON.stringify({ id: Number(playerId), limit: 200, session: sessionToken }),
        }),
        fetch('https://production.rhythia.com/api/getPinnedScores', {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
          signal: request.signal,
          body: JSON.stringify({ id: Number(playerId), session: sessionToken }),
        }).catch(() => null),
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

RhythiaX.fetchPlayerScores = async function (playerId, signal) {
  const sets = await RhythiaX.fetchPlayerScoreSets(playerId, signal);
  return sets ? sets.scores : null;
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
      const resp = await fetch('https://production.rhythia.com/api/getProfile', {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
        signal: request.signal,
        body: JSON.stringify({ id: Number(playerId), session: RhythiaX.getRhythiaAuthToken() }),
      });
      if (!resp.ok) return null;
      const data = await resp.json();
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

// ─── Cross-verify card data with API ──────────
RhythiaX.crossVerifyCardsWithApi = function (playerId, scoreSets) {
  if (!validPlayerId(playerId)) return Promise.resolve(new Map());

  // Do not fetch /player/:id/scores again. That route is a client-rendered SPA
  // page, so a content-script fetch can be blocked by CORS or return only the
  // app shell. The REST response and the cards already in the current DOM are
  // the two sources available to this page.
  return Promise.resolve().then(function () {
      var weightedMap = new Map();
      var rankingMap = new Map();
      (scoreSets?.topScores || scoreSets?.scores || []).forEach(function (score) {
        var raw = String(score.weightedRp ?? '').trim();
        var value = /\d/.test(raw)
          ? (RhythiaX.parseLocalizedNumber ? RhythiaX.parseLocalizedNumber(raw) : Number.parseFloat(raw.replace(/,/g, '')))
          : Number.NaN;
        if (score.scoreId && Number.isFinite(value) && value > 0) {
          weightedMap.set(String(score.scoreId), String(value));
          rankingMap.set(String(score.scoreId), {
            rankIndex: score.rankIndex,
            weightPercent: score.weightPercent,
          });
        }
      });

      RhythiaX.findScoreCards().forEach(function (card) {
        var parsed = RhythiaX.parseScoreCard(card);
        var raw = String(parsed.weightedRp ?? '').trim();
        var value = /\d/.test(raw)
          ? (RhythiaX.parseLocalizedNumber ? RhythiaX.parseLocalizedNumber(raw) : Number.parseFloat(raw.replace(/,/g, '')))
          : Number.NaN;
        if (parsed.scoreId && Number.isFinite(value) && value > 0 && !weightedMap.has(String(parsed.scoreId))) {
          weightedMap.set(String(parsed.scoreId), String(value));
        }
      });

      // Feed the verified values back into the score objects used by Stats.
      [scoreSets?.scores, scoreSets?.ratingScores, scoreSets?.topScores, scoreSets?.pinnedScores].forEach(function (scores) {
        (scores || []).forEach(function (score) {
          var weighted = weightedMap.get(String(score.scoreId));
          if (weighted !== undefined) score.weightedRp = weighted;
          var ranking = rankingMap.get(String(score.scoreId));
          if (ranking?.rankIndex !== undefined) score.rankIndex = ranking.rankIndex;
          if (ranking?.weightPercent !== undefined) score.weightPercent = ranking.weightPercent;
        });
      });

      // Now update cards on the current page
      var currentCards = RhythiaX.findScoreCards();
      currentCards.forEach(function (card) {
        var link = card.querySelector('a[href*="/score/"]');
        var idMatch = link ? link.href.match(/\/score\/(\d+)/) : null;
        var sid = idMatch ? idMatch[1] : (card.dataset?.rhythiaxScoreId || '');
        if (!sid || !weightedMap.has(sid)) return;
        var correctRp = weightedMap.get(sid);
        if (!correctRp) return;

        var parsedCorrect = RhythiaX.parseLocalizedNumber ? RhythiaX.parseLocalizedNumber(correctRp) : (Number.parseFloat(String(correctRp || '').replace(/,/g, '')) || 0);
        var formatted = RhythiaX.formatNumber(Math.round(parsedCorrect));

        // Update the modern card's Weighted RP display
        var modernSubVal = card.querySelector('.rhythiax-card-rp-sub-val');
        if (modernSubVal) {
          var cardRanking = rankingMap.get(sid);
          var percent = cardRanking?.weightPercent;
          modernSubVal.textContent = formatted + (percent !== undefined ? ' (' + percent + '%)' : '');
        }

        // Update the card's Weighted RP display (pill in the expanded panel)
        var pills = card.querySelectorAll('.bg-\\[\\#1F2021\\]');
        pills.forEach(function (pill) {
          var labelEl = pill.querySelector('.text-neutral-300');
          var valueEl = pill.querySelector('.text-neutral-100');
          if (labelEl && valueEl && labelEl.textContent.trim() === 'Weighted RP') {
            valueEl.textContent = formatted;
          }
        });
      });
      return weightedMap;
    });
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
      sessionStorage.setItem('rhythiax_user_profile_' + id, JSON.stringify(entry));
    }
  } catch (_) {}
};
