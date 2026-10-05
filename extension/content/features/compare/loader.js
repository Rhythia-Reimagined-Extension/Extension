// Profile hydration and short-lived in-memory cache for player comparison.
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
      username: player?.username || '',
      country: player?.country || '',
      globalRank: player?.globalRank || '',
      countryRank: player?.countryRank || '',
      rp: player?.rp || '',
      playCount: player?.playCount || '',
      squaresHit: player?.squaresHit || '',
      avgAccuracy: player?.avgAccuracy || '',
      avatar: player?.avatar || '',
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
        ...player,
        username: (player.username && player.username !== 'Unknown') ? player.username : (record?.identity?.username || ''),
        country: player.country || record?.identity?.country || '',
        globalRank: player.globalRank || metrics.globalRank || '',
        countryRank: player.countryRank || metrics.countryRank || '',
        rp: player.rp || metrics.rhythmPoints || '',
        playCount: player.playCount || metrics.playCount || '',
        squaresHit: player.squaresHit || metrics.squaresHit || '',
        avgAccuracy: player.avgAccuracy || metrics.avgAccuracy || '',
        avatar: player.avatar || record?.identity?.avatar || '',
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

  function extractProfileAvatarFromDom() {
    if (typeof document === 'undefined') return '';
    const selectors = [
      'div[class*="top-[-80px]"] img',
      'div[class*="left-4 top-3"] img',
      '.rounded-\\[22px\\] img',
      '.rounded-\\[30px\\] img',
      'div.relative.shrink-0 img[src*="user-avatar"]',
      'img[src*="user-avatar"]',
      'img[src*="/user-avatar"]',
    ];
    for (const sel of selectors) {
      try {
        const el = document.querySelector(sel);
        if (el?.src && !el.closest('nav, header, footer')) {
          return el.src;
        }
      } catch (_) {}
    }
    const fallback = document.querySelector('img[src*="user-avatar"], img[src*="/user-avatar"]');
    return fallback?.src || '';
  }

  function extractProfileRankFromDom() {
    if (typeof document === 'undefined') return { globalRank: '', countryRank: '', country: '' };
    let globalRank = '';
    let countryRank = '';
    let country = '';

    const buttons = [...document.querySelectorAll('button, div.rounded-lg, [class*="rounded-"]')];
    for (const btn of buttons) {
      const text = btn.textContent || '';
      if (!globalRank && /\bglobal\b/i.test(text)) {
        if (typeof RhythiaX.extractCleanRankText === 'function') {
          globalRank = RhythiaX.extractCleanRankText(btn);
        } else {
          const match = text.match(/#\s*([0-9,]+)/);
          if (match) globalRank = '#' + match[1].replace(/,/g, '');
        }
      }
      if (!countryRank && /\bcountry\b/i.test(text)) {
        if (typeof RhythiaX.extractCleanRankText === 'function') {
          countryRank = RhythiaX.extractCleanRankText(btn);
        } else {
          const match = text.match(/#\s*([0-9,]+)/);
          if (match) countryRank = '#' + match[1].replace(/,/g, '');
        }
      }
    }

    const flagImg = document.querySelector('img[src*="/flags/"], img[src*=".svg"]');
    if (flagImg) {
      const m = flagImg.src.match(/\/([A-Z]{2})\.svg/i);
      if (m) country = m[1].toUpperCase();
    }

    return { globalRank, countryRank, country };
  }

  RhythiaX.CompareLoader = {
    playerId,
    isContextInvalidated,
    extractAvatar: extractProfileAvatarFromDom,
    extractRank: extractProfileRankFromDom,
    currentPlayer(player) {
      const profile = playerData(player);
      let username = profile.username;
      const ctxPlayer = RhythiaX.profileHistoryContext?.player;
      const fresh = RhythiaX.extractPlayerData?.();
      const domAvatar = extractProfileAvatarFromDom();
      const domRank = extractProfileRankFromDom();

      username = username || ctxPlayer?.username || fresh?.username || '';
      if (!username || username === 'Unknown' || username === 'Unknown player') {
        username = 'Unknown player';
      }

      const avatar = profile.avatar || player?.avatar || ctxPlayer?.avatar || fresh?.avatar || domAvatar || '';
      const globalRank = profile.globalRank || player?.globalRank || ctxPlayer?.globalRank || fresh?.globalRank || domRank.globalRank || '';
      const countryRank = profile.countryRank || player?.countryRank || ctxPlayer?.countryRank || fresh?.countryRank || domRank.countryRank || '';
      const country = profile.country || player?.country || ctxPlayer?.country || fresh?.country || domRank.country || '';

      return {
        id: String(playerId()),
        username,
        avatar,
        globalRank,
        countryRank,
        country,
      };
    },
    async hydrateProfileMeta(item) {
      if (!item?.id) return item;
      const id = String(item.id);
      let avatar = item.avatar || '';
      let globalRank = item.globalRank || '';
      let countryRank = item.countryRank || '';
      let country = item.country || '';
      let username = item.username || '';

      if (String(playerId()) === id) {
        const domAvatar = extractProfileAvatarFromDom();
        const domRank = extractProfileRankFromDom();
        if (domAvatar && !avatar) avatar = domAvatar;
        if (domRank.globalRank && !globalRank) globalRank = domRank.globalRank;
        if (domRank.countryRank && !countryRank) countryRank = domRank.countryRank;
        if (domRank.country && !country) country = domRank.country;
      }

      if (!avatar || !globalRank) {
        try {
          const fetchFn = RhythiaX.RhythiaApiBridge?.fetchUserProfile || RhythiaX.fetchUserProfile;
          if (fetchFn) {
            const u = await fetchFn(id);
            if (u) {
              if (!avatar) avatar = u.avatar_url || u.profile_image || '';
              if (!globalRank && u.position) globalRank = '#' + u.position;
              if (!countryRank && u.country_position) countryRank = '#' + u.country_position;
              if (!country) country = String(u.country || u.flag || '').trim();
              if ((!username || username === 'Unknown') && u.username) username = String(u.username).trim();
            }
          }
        } catch (_) {}
      }

      if (avatar !== item.avatar || globalRank !== item.globalRank || country !== item.country) {
        const updated = { ...item, username, avatar, globalRank, countryRank, country };
        RhythiaX.CompareStore?.updatePlayerMeta?.(id, updated);
        return updated;
      }
      return item;
    },
    enrichCurrent(item) {
      if (String(item?.id || '') !== String(playerId())) return item;
      try {
        const ctxPlayer = RhythiaX.profileHistoryContext?.player;
        const current = ctxPlayer || RhythiaX.extractPlayerData?.();
        const domAvatar = extractProfileAvatarFromDom();
        const domRank = extractProfileRankFromDom();
        if (!current && !domAvatar && !domRank.globalRank) return item;
        const data = playerData(current);
        const player = { ...(item.player || {}) };
        Object.entries(data).forEach(([key, value]) => { if (String(value).trim()) player[key] = value; });
        const resolvedName = (player.username && player.username !== 'Unknown' && player.username !== 'Unknown player')
          ? player.username
          : ((item.username && item.username !== 'Unknown' && item.username !== 'Unknown player') ? item.username : (player.username || item.username));
        return {
          ...item,
          username: resolvedName,
          avatar: current?.avatar || domAvatar || item.avatar || player.avatar || '',
          globalRank: current?.globalRank || domRank.globalRank || item.globalRank || player.globalRank || '',
          countryRank: current?.countryRank || domRank.countryRank || item.countryRank || player.countryRank || '',
          country: current?.country || domRank.country || item.country || player.country || '',
          player,
        };
      } catch (_) {
        return item;
      }
    },
    nextGeneration() { return ++generation; },
    isGenerationCurrent(requestedGeneration) { return requestedGeneration === generation; },
    async load(item, requestedGeneration) {
      const id = String(item.id || '');
      const cached = profiles.get(id);
      if (cached && Date.now() - cached.savedAt < CACHE_TTL) {
        return requestedGeneration === generation ? cached.profile : null;
      }
      const loadKey = `${requestedGeneration}:${id}`;
      if (loads.has(loadKey)) return loads.get(loadKey);

      const load = (async () => {
        const hydrated = { ...item, player: await storedData(item) };
        let scoreSets = null;
        let userProfile = null;
        try {
          const [scoresResult, profileResult] = await Promise.all([
            RhythiaX.RhythiaApiBridge?.fetchPlayerScoreSets(id),
            RhythiaX.RhythiaApiBridge?.fetchUserProfile ? RhythiaX.RhythiaApiBridge.fetchUserProfile(id) : (RhythiaX.fetchUserProfile ? RhythiaX.fetchUserProfile(id) : null),
          ]);
          scoreSets = scoresResult;
          userProfile = profileResult;
        } catch (error) {
          if (!isContextInvalidated(error)) RhythiaX.captureError(error, 'Compare profile load failed');
        }
        if (!hasScoreSets(scoreSets) || requestedGeneration !== generation) return null;
        if (userProfile) {
          if (userProfile.username) {
            hydrated.username = String(userProfile.username).trim();
            hydrated.player.username = hydrated.username;
          }
          if (userProfile.position) {
            hydrated.globalRank = '#' + userProfile.position;
            hydrated.player.globalRank = hydrated.globalRank;
          }
          if (userProfile.country_position) {
            hydrated.countryRank = '#' + userProfile.country_position;
            hydrated.player.countryRank = hydrated.countryRank;
          }
          if (userProfile.flag || userProfile.country) {
            hydrated.country = String(userProfile.flag || userProfile.country).trim();
            hydrated.player.country = hydrated.country;
          }
          if (userProfile.skill_points !== undefined && userProfile.skill_points !== null) {
            hydrated.player.rp = String(userProfile.skill_points);
          }
          if (userProfile.avatar_url || userProfile.profile_image) {
            hydrated.avatar = userProfile.avatar_url || userProfile.profile_image;
            hydrated.player.avatar = hydrated.avatar;
          }
        }

        if (hydrated.username && hydrated.username !== 'Unknown' && hydrated.username !== 'Unknown player') {
          RhythiaX.CompareStore?.healPlayerUsername?.(id, hydrated.username);
        }

        RhythiaX.CompareStore?.updatePlayerMeta?.(id, {
          username: hydrated.username,
          avatar: hydrated.avatar,
          globalRank: hydrated.globalRank,
          countryRank: hydrated.countryRank,
          country: hydrated.country,
        });

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
