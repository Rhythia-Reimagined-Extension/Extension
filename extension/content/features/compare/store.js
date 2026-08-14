// Session-backed selection state for the player comparison feature.
var RhythiaX = RhythiaX || {};

(function () {
  const MAX_PLAYERS = 4;
  let mutationQueue = Promise.resolve();

  function normalize(list) {
    return (Array.isArray(list) ? list : []).map(item => ({
      id: String(item?.id || '').trim(),
      username: String(item?.username || 'Unknown player').trim(),
    })).filter(item => item.id).slice(-MAX_PLAYERS);
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
        const next = normalize(await Promise.resolve(mutator(await this.read())));
        await this.write(next);
        return next;
      });
      return mutationQueue;
    },
    clear() {
      return this.write([]);
    },
    clearLegacyStorage() {
      try {
        chrome.storage?.local?.remove?.(['rhythiaxComparePlayers', 'rhythiaxComparePlayers:fallback']);
      } catch (_) {
        // Legacy storage cleanup is best effort.
      }
      try {
        localStorage.removeItem('rhythiaxComparePlayers:fallback');
      } catch (_) {
        // Page storage can be unavailable in a privacy-restricted browser.
      }
    },
  };
})();
