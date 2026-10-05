// Session-backed selection state for the player comparison feature.
var RhythiaX = RhythiaX || {};

(function () {
  const MAX_PLAYERS = 2;
  let mutationQueue = Promise.resolve();

  function normalize(list, max = MAX_PLAYERS) {
    const raw = (Array.isArray(list) ? list : []).map(item => ({
      id: String(item?.id || '').trim(),
      username: String(item?.username || 'Unknown player').trim(),
      avatar: item?.avatar || '',
      globalRank: item?.globalRank || '',
      countryRank: item?.countryRank || '',
      country: item?.country || '',
    })).filter(item => item.id);

    const seen = new Set();
    const uniqueReversed = [];
    for (let i = raw.length - 1; i >= 0; i--) {
      const item = raw[i];
      if (!seen.has(item.id)) {
        seen.add(item.id);
        uniqueReversed.push(item);
      }
    }
    return uniqueReversed.reverse().slice(-max);
  }

  function message(payload) {
    if (typeof chrome === 'undefined' || !RhythiaX.RuntimeBridge?.sendMessage) return Promise.resolve(null);
    return RhythiaX.RuntimeBridge.sendMessage(payload).then(response => response?.ok ? response : null).catch(() => null);
  }

  RhythiaX.CompareStore = {
    maxPlayers: MAX_PLAYERS,
    normalize,
    read() {
      return message({ type: 'rhythiax-compare-list-get' }).then(response => normalize(response?.list));
    },
    write(list) {
      return message({ type: 'rhythiax-compare-list-set', list: normalize(list) });
    },
    update(mutator) {
      mutationQueue = mutationQueue.catch(() => {}).then(async () => {
        const current = await this.read();
        const next = normalize(await Promise.resolve(mutator(current)));
        const isSame = next.length === current.length && next.every((item, i) =>
          item.id === current[i].id &&
          item.username === current[i].username &&
          item.avatar === current[i].avatar &&
          item.globalRank === current[i].globalRank &&
          item.countryRank === current[i].countryRank &&
          item.country === current[i].country
        );
        if (!isSame) {
          await this.write(next);
        }
        return next;
      });
      return mutationQueue;
    },
    clear() {
      return this.update(() => []);
    },
    updatePlayerMeta(id, meta) {
      const cleanId = String(id || '').trim();
      if (!cleanId || !meta) return Promise.resolve();
      return this.update(list => list.map(item => {
        if (item.id !== cleanId) return item;
        return {
          ...item,
          username: (meta.username && meta.username !== 'Unknown' && meta.username !== 'Unknown player') ? meta.username : item.username,
          avatar: meta.avatar || item.avatar || '',
          globalRank: meta.globalRank || item.globalRank || '',
          countryRank: meta.countryRank || item.countryRank || '',
          country: meta.country || item.country || '',
        };
      }));
    },
    healPlayerUsername(id, username) {
      const cleanId = String(id || '').trim();
      const cleanName = String(username || '').trim();
      if (!cleanId || !cleanName || cleanName === 'Unknown' || cleanName === 'Unknown player') {
        return Promise.resolve();
      }
      return this.update(list => list.map(item => {
        if (item.id === cleanId && (!item.username || item.username === 'Unknown' || item.username === 'Unknown player')) {
          return { ...item, username: cleanName };
        }
        return item;
      }));
    },
    clearLegacyStorage() {
      try {
        chrome.storage?.local?.remove?.(['rhythiaxComparePlayers', 'rhythiaxComparePlayers:fallback']);
      } catch (_) {}
      try {
        localStorage.removeItem('rhythiaxComparePlayers:fallback');
      } catch (_) {}
    },
  };
})();
