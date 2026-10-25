// The background's one writer of the history settings (rhythiaxDataSettings), loaded only by background.js:
// the popup's settings patches and the community choices of the popup and the Rhythia notice, each in turn, so
// two changes sent at once both stay; choosing This device also removes the community history on this device.
// App settings are not written here: the popup writes the look, theme, modules, options and popup size itself,
// and Classic's score cards their list or grid view (scoreCards.playerView). Also the daily retention sweep.
// It is the one writer of Classic's history records (rhythiaxData:entry:<id>) too: every tab sends its saves
// and removals here (data-records-commit, shared/data/data-repository.js RhythiaX.commitDataRecords), and each
// is written only over the stored copy the tab read, so two tabs never overwrite each other's history. In this
// worker the same writer is reached without a message through RhythiaX.dataRecordsCommitLocal, a global this
// file owns.
var RhythiaX = globalThis.RhythiaX || {};

(function () {
  function isPlainObject(value) {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
  }

  function storageCall(local, method, argument) {
    return new Promise((resolve, reject) => {
      let settled = false;
      const finish = (callback, value) => {
        if (settled) return;
        settled = true;
        callback(value);
      };
      const callback = value => {
        const error = globalThis.chrome?.runtime?.lastError;
        if (error) finish(reject, new Error(error.message || String(error)));
        else finish(resolve, value || {});
      };
      try {
        const result = argument === undefined ? local[method](callback) : local[method](argument, callback);
        if (result && typeof result.then === 'function') result.then(value => finish(resolve, value || {}), error => finish(reject, error));
      } catch (error) {
        finish(reject, error);
      }
    });
  }

  function assertObject(value, label) {
    if (!isPlainObject(value)) throw new Error(`${label} must be an object.`);
  }

  function assertKeys(value, allowed, label) {
    assertObject(value, label);
    const invalid = Object.keys(value).find(key => !allowed.includes(key));
    if (invalid) throw new Error(`${label} contains an unsupported field: ${invalid}.`);
    if (!Object.keys(value).length) throw new Error(`${label} must not be empty.`);
  }

  // Copies of the community history kept on this device, by either look: Exodus' history shelf (with its
  // index), Classic's playstyle history and its community history answers.
  const COMMUNITY_HISTORY_PREFIXES = ['rhythiaxExodusHist:', 'rhythiax_ps_hist_', 'rhythiaxVpsHistoryCache:'];
  // Exodus' saved profiles keep everything but their history.
  const SAVED_PROFILE_PREFIX = 'rhythiaxExodusSnap:';

  // Only the key names when the browser can list them, so stored theme pictures and videos are not read in.
  function storageKeys(local) {
    const all = () => storageCall(local, 'get', null).then(Object.keys);
    if (typeof local.getKeys !== 'function') return all();
    return storageCall(local, 'getKeys').then(keys => (Array.isArray(keys) ? keys : all()), all);
  }

  // Run when the player chooses This device: no community history stays on disk. Saved pages, own themes,
  // the access key and this device's own history are left alone.
  async function purgeCommunityHistory(local) {
    const keys = await storageKeys(local);
    const removed = keys.filter(key => COMMUNITY_HISTORY_PREFIXES.some(prefix => key.startsWith(prefix)));
    const profiles = keys.filter(key => key.startsWith(SAVED_PROFILE_PREFIX) && key !== `${SAVED_PROFILE_PREFIX}index`);
    const stripped = {};
    if (profiles.length) {
      const saved = await storageCall(local, 'get', profiles);
      for (const key of profiles) {
        const entry = saved[key];
        if (!isPlainObject(entry?.data) || !('history' in entry.data)) continue;
        const { history, ...data } = entry.data;
        stripped[key] = { ...entry, data };
      }
    }
    if (Object.keys(stripped).length) await storageCall(local, 'set', stripped);
    if (removed.length) await storageCall(local, 'remove', removed);
    return { removed, stripped: Object.keys(stripped) };
  }

  // ─── Retention sweep ──────
  // Each look prunes its own copies only while it runs: Classic history stayed past its 90 days in a browser
  // that shows Exodus, and Exodus' saved pages stayed once Exodus was switched off. Once a day the background
  // removes what the look that wrote a copy would no longer keep or show. A copy is read, read again just
  // before it goes, and kept when a tab saved it in between (its time moved). The key formats and times are
  // those of the code that writes each copy, named beside it.
  const RETENTION_SWEEP_KEY = 'rhythiaxRetentionSweepAt';
  const RETENTION_SWEEP_EVERY_MS = 24 * 36e5;
  const DAY_MS = 864e5;
  // Exodus' saved home page (it holds the signed-in player and their friends) and its last leaderboard page,
  // { at, data }, shown for 7 days (exodus/core/data.js HOME_KEY, BOARD_KEY, SNAP_TTL).
  const EXODUS_SAVED_PAGES = ['rhythiaxExodusHome', 'rhythiaxExodusBoard'];
  const EXODUS_SAVED_PAGE_MS = 7 * DAY_MS;
  // Exodus' shelves (exodus/core/data.js shelf()): prefix + id holds { at, data }, prefix + 'index' maps each id
  // to when it was last saved, and a copy is shown while the later of the two is within the shelf's time: saved
  // profiles and pages SNAP_TTL, community history HIST_STALE. While Exodus runs it clears them itself.
  const EXODUS_SHELVES = [['rhythiaxExodusSnap:', 7 * DAY_MS], ['rhythiaxExodusPage:', 7 * DAY_MS], ['rhythiaxExodusHist:', 3 * DAY_MS]];
  // Classic's community history copies, which Classic prunes only when it saves the next one:
  // rhythiaxVpsHistoryCache:<id> { fetchedAt, lastSuccessAt }, used for at most 40 minutes after its answer came
  // (legacy/core/data/vps-history-cache.js VPS_HISTORY_CACHE_KEEP_MS), and rhythiax_ps_hist_<id>
  // { version, timestamp }, used for 15 minutes in cache version 4 (legacy/content/features/playstyle/loader.js
  // HISTORY_CACHE_TTL_MS, HISTORY_CACHE_VERSION).
  const VPS_CACHE_PREFIX = 'rhythiaxVpsHistoryCache:';
  const VPS_CACHE_MS = 40 * 60e3;
  const PLAYSTYLE_CACHE_PREFIX = 'rhythiax_ps_hist_';
  const PLAYSTYLE_CACHE_MS = 15 * 60e3;
  const PLAYSTYLE_CACHE_VERSION = 4;

  // Which keys, the time field a save changes, and when a stored copy has expired.
  function retentionRules(now, retentionDays) {
    const recordPrefix = RhythiaX.DATA_STORAGE_ENTRY_PREFIX || 'rhythiaxData:entry:';
    const age = (value, field) => now - Number(value?.[field]);
    return [
      // Classic's history records: every commit (applyDataRecordsCommit, shared/data/data-repository.js) raises updatedAt.
      // A record nothing saved for longer than the retention window holds only days Classic drops itself
      // (legacy/core/data/data-history.js keeps the last 90), so it goes whole. One without a valid time stays.
      { match: key => key.startsWith(recordPrefix), field: 'updatedAt',
        expired: value => Number(value?.updatedAt) > 0 && age(value, 'updatedAt') > retentionDays * DAY_MS },
      { match: key => EXODUS_SAVED_PAGES.includes(key), field: 'at',
        expired: value => !(age(value, 'at') < EXODUS_SAVED_PAGE_MS) },
      // A copy that holds history ages from when its answer came (lastSuccessAt; after a failed request Classic
      // saves it again with a new fetchedAt), one without from when it was saved, as Classic's own prune does
      // (vpsHistoryCacheAge). Every save changes fetchedAt.
      { match: key => key.startsWith(VPS_CACHE_PREFIX), field: 'fetchedAt',
        expired: value => !(age(value, value?.data && Number(value.lastSuccessAt) ? 'lastSuccessAt' : 'fetchedAt') <= VPS_CACHE_MS) },
      { match: key => key.startsWith(PLAYSTYLE_CACHE_PREFIX), field: 'timestamp',
        expired: value => value?.version !== PLAYSTYLE_CACHE_VERSION
          || !(age(value, 'timestamp') >= 0 && age(value, 'timestamp') < PLAYSTYLE_CACHE_MS) },
    ];
  }

  const owns = (object, key) => Object.prototype.hasOwnProperty.call(object, key);

  // Removes what retentionRules and the shelves no longer keep. Returns the keys removed.
  async function removeExpired(local, now) {
    const keys = await storageKeys(local);
    const settingsKey = RhythiaX.DATA_SETTINGS_KEY || 'rhythiaxDataSettings';
    const stored = await storageCall(local, 'get', [settingsKey, 'rhythiaxExodus']);
    const { retentionDays } = RhythiaX.normalizeDataSettings(stored[settingsKey]);
    const removed = [];
    for (const rule of retentionRules(now, retentionDays)) {
      const named = keys.filter(rule.match);
      if (!named.length) continue;
      const first = await storageCall(local, 'get', named);
      const expired = named.filter(key => owns(first, key) && rule.expired(first[key]));
      if (!expired.length) continue;
      const again = await storageCall(local, 'get', expired);
      const gone = expired.filter(key => owns(again, key) && rule.expired(again[key])
        && Object.is(Number(again[key]?.[rule.field]), Number(first[key]?.[rule.field])));
      if (gone.length) {
        await storageCall(local, 'remove', gone);
        removed.push(...gone);
      }
    }
    if (stored.rhythiaxExodus !== true) removed.push(...await removeExpiredShelves(local, keys, now));
    removed.push(...await removeRetiredKeys(local, keys, stored[settingsKey]));
    return removed;
  }

  // 1.1 kept the profile visit report switch apart (rhythiax_telemetry_enabled); the data update copies it into
  // the settings' telemetryEnabled (shared/data/data-migrations.js) and nothing reads it after that. It goes
  // once the settings hold the copy, so a stored choice is never lost.
  const RETIRED_TELEMETRY_KEY = 'rhythiax_telemetry_enabled';
  async function removeRetiredKeys(local, keys, settings) {
    if (!keys.includes(RETIRED_TELEMETRY_KEY) || typeof settings?.telemetryEnabled !== 'boolean') return [];
    await storageCall(local, 'remove', [RETIRED_TELEMETRY_KEY]);
    return [RETIRED_TELEMETRY_KEY];
  }

  // Exodus' shelves while Exodus is off: an id goes, from the index and with its copy, once both its copy's time
  // and its index time are past the shelf's time.
  async function removeExpiredShelves(local, keys, now) {
    const removed = [];
    for (const [prefix, ttl] of EXODUS_SHELVES) {
      const index = `${prefix}index`;
      const named = keys.filter(key => key.startsWith(prefix) && key !== index);
      if (!named.length && !keys.includes(index)) continue;
      const expiredIds = got => {
        const idx = isPlainObject(got[index]) ? got[index] : {};
        const ids = new Set([...Object.keys(idx), ...named.map(key => key.slice(prefix.length))]);
        return [...ids].filter(id => !(now - Math.max(Number(got[prefix + id]?.at) || 0, Number(idx[id]) || 0) < ttl));
      };
      const first = expiredIds(await storageCall(local, 'get', [index, ...named]));
      if (!first.length) continue;
      const got = await storageCall(local, 'get', [index, ...first.map(id => prefix + id)]);
      const wasExpired = new Set(first);
      const gone = expiredIds(got).filter(id => wasExpired.has(id));
      const idx = isPlainObject(got[index]) ? got[index] : null;
      if (idx && gone.some(id => owns(idx, id))) {
        const next = { ...idx };
        for (const id of gone) delete next[id];
        await storageCall(local, 'set', { [index]: next });
      }
      const goneKeys = gone.map(id => prefix + id).filter(key => owns(got, key));
      if (goneKeys.length) {
        await storageCall(local, 'remove', goneKeys);
        removed.push(...goneKeys);
      }
    }
    return removed;
  }

  const READ_ONLY_ERROR = 'Local data is read-only because validation failed; contact support before modifying stored data.';

  function createStorageMutationAuthority(options) {
    const local = options?.local;
    const isReadOnly = options?.isReadOnly || (() => false);
    if (!local) throw new Error('Storage mutation authority requires local storage.');
    let queue = Promise.resolve();

    function enqueue(task) {
      const next = queue.then(() => task(), () => task());
      queue = next.catch(() => {});
      return next;
    }

    async function commit(key, value) {
      await storageCall(local, 'set', { [key]: value });
      return value;
    }

    function mutateDataSettings(kind, payload) {
      const settingsKey = RhythiaX.DATA_SETTINGS_KEY || 'rhythiaxDataSettings';
      const defaults = RhythiaX.DATA_DEFAULT_SETTINGS || {};
      const allowed = Object.keys(defaults);
      return enqueue(async () => {
        await RhythiaX.dataRepositoryReady;
        if (isReadOnly()) throw new Error(READ_ONLY_ERROR);
        const result = await storageCall(local, 'get', { [settingsKey]: defaults });
        const current = RhythiaX.normalizeDataSettings(result[settingsKey]);
        let next;
        if (kind === 'patch') {
          assertKeys(payload.patch, allowed.filter(key => key !== 'communityConsentVersion'), 'Data settings patch');
          next = RhythiaX.normalizeDataSettings({ ...current, ...payload.patch });
        } else if (kind === 'community-consent') {
          // Profile visit reports are never turned on by a choice: the player turns them on in the popup.
          const choices = {
            'cloud-no-reports': { syncMode: 'cloud-only', telemetryEnabled: false },
            'hybrid-no-reports': { syncMode: 'hybrid', telemetryEnabled: false },
            'local-only': { syncMode: 'local-only', telemetryEnabled: false },
          };
          if (typeof payload.choice !== 'string' || !Object.prototype.hasOwnProperty.call(choices, payload.choice)) throw new Error('Unsupported community choice.');
          next = RhythiaX.normalizeDataSettings({
            ...current, ...choices[payload.choice], communityConsentVersion: RhythiaX.COMMUNITY_CONSENT_VERSION,
          });
        } else {
          throw new Error('Unsupported data settings operation.');
        }
        await commit(settingsKey, next);
        // Every way to This device lands here (the popup, the Rhythia notice, a settings patch), so the copies
        // go whether or not a Rhythia tab is open. The choice is saved even if the purge fails.
        if (next.syncMode === 'local-only' && (kind === 'community-consent' || current.syncMode !== 'local-only')) {
          try { await purgeCommunityHistory(local); } catch (error) { console.warn('RhythiaX: community history not removed:', error); }
        }
        return next;
      });
    }

    // A commit of Classic history records from a tab (payload as RhythiaX.applyDataRecordsCommit takes it), in
    // turn with the settings writes and the retention sweep. Resolves what applyDataRecordsCommit resolves.
    function commitDataRecords(payload) {
      return enqueue(async () => {
        await RhythiaX.dataRepositoryReady;
        if (isReadOnly()) throw new Error(READ_ONLY_ERROR);
        if (typeof RhythiaX.applyDataRecordsCommit !== 'function') throw new Error('History records cannot be saved here.');
        return RhythiaX.applyDataRecordsCommit({
          get: keys => storageCall(local, 'get', keys),
          set: values => storageCall(local, 'set', values),
          remove: keys => storageCall(local, 'remove', keys),
        }, payload);
      });
    }
    RhythiaX.dataRecordsCommitLocal = commitDataRecords;

    // Run by background.js when the worker starts; does the work at most once every RETENTION_SWEEP_EVERY_MS
    // (the time of the last run is kept in RETENTION_SWEEP_KEY). Never while stored history is read-only.
    // Resolves { swept: false, reason } or { swept: true, removed: [keys] }.
    function sweepRetention(now = Date.now()) {
      return enqueue(async () => {
        await RhythiaX.dataRepositoryReady;
        if (isReadOnly()) return { swept: false, reason: 'read-only' };
        const last = Number((await storageCall(local, 'get', [RETENTION_SWEEP_KEY]))[RETENTION_SWEEP_KEY]);
        if (Number.isFinite(last) && now - last >= 0 && now - last < RETENTION_SWEEP_EVERY_MS) return { swept: false, reason: 'recent' };
        // Marked first, so a sweep that fails is not tried again on every wake of the worker.
        await storageCall(local, 'set', { [RETENTION_SWEEP_KEY]: now });
        return { swept: true, removed: await removeExpired(local, now) };
      });
    }

    function dispatch(message) {
      return Promise.resolve().then(() => {
        if (message?.type !== 'rhythiax-storage-mutation') throw new Error('Unsupported storage mutation request.');
        switch (message.operation) {
          case 'data-settings-patch': return mutateDataSettings('patch', message.payload || {});
          case 'data-records-commit': return commitDataRecords(message.payload);
          default: throw new Error('Unsupported storage mutation operation.');
        }
      });
    }

    return {
      dispatch,
      dataSettingsPatch: patch => mutateDataSettings('patch', { patch }),
      communityConsent: choice => mutateDataSettings('community-consent', { choice }),
      sweepRetention,
    };
  }

  RhythiaX.createStorageMutationAuthority = createStorageMutationAuthority;
  RhythiaX.purgeCommunityHistory = purgeCommunityHistory;
  if (typeof module !== 'undefined') module.exports = { createStorageMutationAuthority, purgeCommunityHistory };
})();
