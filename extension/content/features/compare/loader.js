// Profile hydration and short-lived score-set cache for player comparison.
var RhythiaX = RhythiaX || {};

(function () {
  const CACHE_TTL = 5 * 60 * 1000;
  const profiles = new Map();
  const loads = new Map();
  let generation = 0;

  function playerId() {
       return window.location.pathname.match(/^\/player\/([^/]+)\/?$/)?.[1] || '';
  }

  function isContextInvalidated(error) {
    return /Extension context invalidated/i.test(String(error?.message || error));
  }

  function playerData(player) {
    return {
      username: player?.username || '', country: player?.country || '', globalRank: player?.globalRank || '',
      countryRank: player?.countryRank || '', rp: player?.rp || '', playCount: player?.playCount || '',
      squaresHit: player?.squaresHit || '', avgAccuracy: player?.avgAccuracy || '',
    };
  }

  async function storedData(item) {
    const player = { ...(item.player || {}) };
    if (player.globalRank && player.countryRank && player.country) return player;
    try {
      const record = await RhythiaX.DataStoreBridge?.getRecord(item.id);
      const snapshots = [...(record?.history?.openDay?.captures || []), ...Object.values(record?.history?.daily || {})]
        .sort((left, right) => (Number(left?.capturedAt) || 0) - (Number(right?.capturedAt) || 0));
      const metrics = snapshots[snapshots.length - 1]?.metrics || snapshots[snapshots.length - 1] || {};
      return {
        ...player, country: player.country || record?.identity?.country || '', globalRank: player.globalRank || metrics.globalRank || '',
        countryRank: player.countryRank || metrics.countryRank || '', rp: player.rp || metrics.rhythmPoints || '',
        playCount: player.playCount || metrics.playCount || '', squaresHit: player.squaresHit || metrics.squaresHit || '',
        avgAccuracy: player.avgAccuracy || metrics.avgAccuracy || '',
      };
    } catch (_) {
      return player;
    }
  }

  function hasScoreSets(scoreSets) {
    return Boolean(scoreSets && ((Array.isArray(scoreSets.scores) && scoreSets.scores.length) || (Array.isArray(scoreSets.topScores) && scoreSets.topScores.length)));
  }

  function normalizeScoreSets(scoreSets) {
    if (!scoreSets || (Array.isArray(scoreSets.scores) && scoreSets.scores.length) || !Array.isArray(scoreSets.topScores)) return scoreSets;
    return { ...scoreSets, scores: scoreSets.topScores, ratingScores: scoreSets.ratingScores || scoreSets.topScores };
  }

  RhythiaX.CompareLoader = {
    playerId,
    isContextInvalidated,
    currentPlayer(player) {
      const profile = playerData(player);
      return { id: String(playerId()), username: profile.username || 'Unknown player' };
    },
    enrichCurrent(item) {
      if (String(item?.id || '') !== String(playerId())) return item;
      try {
        const current = RhythiaX.extractPlayerData?.();
        if (!current) return item;
        const data = playerData(current);
        const player = { ...(item.player || {}) };
        Object.entries(data).forEach(([key, value]) => { if (String(value).trim()) player[key] = value; });
        return { ...item, username: player.username || item.username, avatar: current.avatar || item.avatar || '', player };
      } catch (_) {
        return item;
      }
    },
    nextGeneration() { return ++generation; },
    isGenerationCurrent(requestedGeneration) { return requestedGeneration === generation; },
    async load(item, requestedGeneration) {
      const id = String(item.id || '');
      const cached = profiles.get(id);
       if (cached && Date.now() - cached.savedAt < CACHE_TTL) return requestedGeneration === generation ? cached.profile : null;
       const loadKey = `${requestedGeneration}:${id}`;
       if (loads.has(loadKey)) return loads.get(loadKey);
      const load = (async () => {
        const hydrated = { ...item, player: await storedData(item) };
        let scoreSets = null;
        try { scoreSets = await RhythiaX.RhythiaApiBridge?.fetchPlayerScoreSets(id); } catch (error) {
          if (!isContextInvalidated(error)) RhythiaX.captureError(error, 'Compare profile load failed');
        }
        if (!hasScoreSets(scoreSets) || requestedGeneration !== generation) return null;
        const profile = { ...hydrated, scoreSets: normalizeScoreSets(scoreSets) };
        profiles.set(id, { savedAt: Date.now(), profile });
        return profile;
      })();
       loads.set(loadKey, load);
       try { return await load; } finally { loads.delete(loadKey); }
    },
    reset() {
      generation++;
      profiles.clear();
      loads.clear();
    },
  };
})();
