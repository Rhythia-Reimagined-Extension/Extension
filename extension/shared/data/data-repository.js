// =============================================
// Reimagined for Rhythia — Canonical local data repository
// =============================================

var RhythiaX = RhythiaX || {};
let dataHistoryClearRevision = 0;
const dataRecordRevisions = new WeakMap();
// What each record object was read as: rev, the stored copy's revision (dataRecordRev) at that read, and clear,
// the Clear history generation stored at the same read. A listing keeps its clear too, for the records
// created against it (RhythiaX.registerDataRecord). A commit sends both, so it writes only over the copy this
// context read (RhythiaX.applyDataRecordsCommit).
const dataRecordReads = new WeakMap();
const DATA_HISTORY_CLEAR_KEY = 'rhythiax_history_clear_generation';
const DATA_HISTORY_CLEARED_ERROR = 'Local history was cleared while this update was pending.';
const DATA_READ_ONLY_ERROR = 'Local data is read-only because validation failed; contact support before modifying stored data.';
if (typeof chrome !== 'undefined') chrome.storage?.onChanged?.addListener((changes, area) => {
  if (area === 'local' && changes.rhythiax_history_clear_generation) dataHistoryClearRevision++;
});

// A stored record's revision: its updatedAt, which every commit raises. null when nothing is stored, 0 for a
// copy without a valid time.
function dataRecordRev(stored) {
  if (stored === undefined || stored === null) return null;
  const updatedAt = Number(stored.updatedAt);
  return Number.isFinite(updatedAt) && updatedAt > 0 ? updatedAt : 0;
}

// A Clear history generation as it can be compared after a message copied it: null when none is stored.
function dataClearGeneration(value) {
  return value === undefined || value === null ? null : JSON.stringify(value);
}

// isExtensionValid() comes from data-schema.js, loaded before this file.
function dataStorageGet(keys) {
  return new Promise((resolve, reject) => {
    if (!isExtensionValid()) return resolve({});
    try {
      chrome.storage.local.get(keys, result => {
        const error = chrome.runtime?.lastError;
        if (error) {
          if (error.message?.includes('Extension context invalidated')) return resolve({});
          reject(new Error(error.message));
        } else {
          resolve(result || {});
        }
      });
    } catch (err) {
      if (err.message?.includes('Extension context invalidated')) return resolve({});
      reject(err);
    }
  });
}

function dataStorageSet(values) {
  return new Promise((resolve, reject) => {
    if (!isExtensionValid()) return resolve();
    try {
      chrome.storage.local.set(values, () => {
        const error = chrome.runtime?.lastError;
        if (error) {
          if (error.message?.includes('Extension context invalidated')) return resolve();
          reject(new Error(error.message));
        } else {
          resolve();
        }
      });
    } catch (err) {
      if (err.message?.includes('Extension context invalidated')) return resolve();
      reject(err);
    }
  });
}

function dataStorageRemove(keys) {
  if (!keys.length) return Promise.resolve();
  return new Promise((resolve, reject) => {
    if (!isExtensionValid()) return resolve();
    try {
      chrome.storage.local.remove(keys, () => {
        const error = chrome.runtime?.lastError;
        if (error) {
          if (error.message?.includes('Extension context invalidated')) return resolve();
          reject(new Error(error.message));
        } else {
          resolve();
        }
      });
    } catch (err) {
      if (err.message?.includes('Extension context invalidated')) return resolve();
      reject(err);
    }
  });
}

// Key names only, where the browser can list them (storage.local.getKeys: Chrome 130, recent Firefox), so
// stored theme pictures and videos are not read in. Null when it cannot: the caller then reads everything.
function dataStorageListKeys() {
  const local = chrome.storage.local;
  if (typeof local.getKeys !== 'function') return Promise.resolve(null);
  return new Promise(resolve => {
    const done = keys => resolve(Array.isArray(keys) ? keys : null);
    try {
      const pending = local.getKeys(keys => done(chrome.runtime?.lastError ? null : keys));
      if (pending && typeof pending.then === 'function') pending.then(done, () => resolve(null));
    } catch (_) {
      resolve(null);
    }
  });
}

// The stored entries whose key starts with prefix, and the keys named in also, in one read. A failed read
// rejects, so history that could not be read is never taken for no history.
async function dataStorageEntriesWithPrefix(prefix, also = []) {
  if (!isExtensionValid()) return {};
  const keys = await dataStorageListKeys();
  if (!keys) {
    const all = await dataStorageGet(null);
    return Object.fromEntries(Object.entries(all).filter(([key]) => key.startsWith(prefix) || also.includes(key)));
  }
  const matching = keys.filter(key => typeof key === 'string' && key.startsWith(prefix));
  return matching.length || also.length ? dataStorageGet([...matching, ...also]) : {};
}

// The same lookup for caches (Classic's playstyle and community history copies): a failed read resolves {},
// which leaves nothing to prune.
RhythiaX.dataStorageGetPrefixed = function (prefix) {
  return dataStorageEntriesWithPrefix(String(prefix ?? '')).catch(() => ({}));
};

// Storage is deliberately never reset on install or update. A migration may
// write a new schema, but it must leave the old namespace available until the
// new snapshot has passed validation.
RhythiaX.dataRepositoryReady = typeof RhythiaX.runDataMigrations === 'function'
  ? RhythiaX.runDataMigrations()
  : Promise.resolve();
RhythiaX.dataCanonicalWrite = function (task) {
  const queue = RhythiaX.dataCanonicalWriteQueue || RhythiaX.dataRepositoryReady;
  const next = queue.then(task, task);
  RhythiaX.dataCanonicalWriteQueue = next.catch(() => {});
  return next;
};

function dataEntryKey(profileId) {
  return `${RhythiaX.DATA_STORAGE_ENTRY_PREFIX}${String(profileId || '').trim()}`;
}

// Classic's profile ids are Rhythia's numeric player ids.
const DATA_RECORD_ID_PATTERN = /^\d{1,10}$/;

// The check-and-write behind RhythiaX.commitDataRecords, run by the one writer of Classic's history records
// (background/storage-mutation-authority.js), over store = { get, set, remove } returning promises.
// payload = { put: [{ id, rev, record }], remove: [{ id, rev }], clear }: rev is the stored revision the
// record was read at (null: none was stored), clear the Clear history generation read with it. Nothing is
// written when Clear history ran since (resolves { committed: false, cleared: true }) or when any one stored
// copy is no longer at its rev (resolves { committed: false, conflict: [ids] }). Otherwise every put is saved
// with a new revision above its old one, in one write, the removes go in a second, and it resolves
// { committed: true, revs: { id: updatedAt } }. A malformed payload rejects.
RhythiaX.applyDataRecordsCommit = async function (store, payload) {
  if (!payload || typeof payload !== 'object' || !Array.isArray(payload.put) || !Array.isArray(payload.remove)) {
    throw new Error('A history commit needs put and remove lists.');
  }
  const named = new Set();
  const entryOf = entry => {
    const id = entry && typeof entry === 'object' ? entry.id : undefined;
    if (typeof id !== 'string' || !DATA_RECORD_ID_PATTERN.test(id)) throw new Error('A history commit names an invalid profile id.');
    if (named.has(id)) throw new Error(`A history commit names profile ${id} more than once.`);
    named.add(id);
    if (entry.rev !== null && !(Number.isFinite(entry.rev) && entry.rev >= 0)) throw new Error(`A history commit has an invalid revision for profile ${id}.`);
    return { id, rev: entry.rev };
  };
  const puts = payload.put.map(entry => {
    const checked = entryOf(entry);
    if (!entry.record || typeof entry.record !== 'object' || entry.record.profileId !== checked.id) {
      throw new Error(`A history commit carries a record that is not profile ${checked.id}.`);
    }
    return { ...checked, record: RhythiaX.normalizeDataRecord(entry.record, checked.id) };
  });
  const removes = payload.remove.map(entryOf);
  const entries = [...puts, ...removes];
  if (!entries.length) return { committed: true, revs: {} };
  const stored = await store.get([DATA_HISTORY_CLEAR_KEY, ...entries.map(entry => dataEntryKey(entry.id))]);
  if (dataClearGeneration(stored[DATA_HISTORY_CLEAR_KEY]) !== dataClearGeneration(payload.clear)) return { committed: false, cleared: true };
  const conflict = entries.filter(entry => dataRecordRev(stored[dataEntryKey(entry.id)]) !== entry.rev).map(entry => entry.id);
  if (conflict.length) return { committed: false, conflict };
  const now = Date.now();
  const values = {};
  const revs = {};
  for (const { id, rev, record } of puts) {
    record.updatedAt = Math.max(now, (rev || 0) + 1);
    values[dataEntryKey(id)] = record;
    revs[id] = record.updatedAt;
  }
  if (puts.length) await store.set(values);
  if (removes.length) await store.remove(removes.map(entry => dataEntryKey(entry.id)));
  return { committed: true, revs };
};

const dataRecordsUnavailable = () => ({ committed: false, unavailable: true });
const dataContextGone = error => /Extension context invalidated/i.test(String(error?.message || error || ''));

// Where a commit goes. In the background, to its writer (RhythiaX.dataRecordsCommitLocal, set by
// background/storage-mutation-authority.js); from a tab, to the background as a message. Without extension
// messaging (tests) it is applied here. A tab the extension has left (reloaded or updated under it) writes
// nothing: it cannot reach the background and does not write itself.
function dataRecordsSend(payload) {
  if (typeof RhythiaX.dataRecordsCommitLocal === 'function') return RhythiaX.dataRecordsCommitLocal(payload);
  const runtime = typeof chrome !== 'undefined' ? chrome.runtime : undefined;
  if (typeof runtime?.sendMessage !== 'function') {
    return RhythiaX.applyDataRecordsCommit({ get: dataStorageGet, set: dataStorageSet, remove: dataStorageRemove }, payload);
  }
  if (!runtime.id) return Promise.resolve(dataRecordsUnavailable());
  return new Promise((resolve, reject) => {
    try {
      runtime.sendMessage({ type: 'rhythiax-storage-mutation', operation: 'data-records-commit', payload }, reply => {
        const lost = chrome.runtime?.lastError;
        if (lost) return dataContextGone(lost) ? resolve(dataRecordsUnavailable()) : reject(new Error(lost.message || String(lost)));
        if (reply?.ok !== true) return reject(new Error(String(reply?.error || 'The history save got no answer.')));
        if (!reply.value || typeof reply.value !== 'object') return reject(new Error('The history save got no answer.'));
        resolve(reply.value);
      });
    } catch (error) {
      if (dataContextGone(error)) resolve(dataRecordsUnavailable());
      else reject(error);
    }
  });
}

// A mark of the Clear history this context has seen. RhythiaX.commitDataRecords({ since: mark }) refuses a
// commit once Clear history ran after it: a capture takes it before it reads the page's numbers.
RhythiaX.dataHistoryClearMark = () => dataHistoryClearRevision;

// Saves and removes Classic history records in one step, through the one writer of these records.
// changes = { put: [records], remove: [records], since }: each record as getDataRecord or listDataRecords
// returned it, or created and passed to registerDataRecord; since (optional) from dataHistoryClearMark.
// Resolves { committed: true, revs } (each saved record's updatedAt is then its new revision, and the record
// can be committed again), { committed: false, conflict: [ids] } when another context saved or removed one of
// them since it was read, or { committed: false, unavailable: true } in a tab the extension has left; in both
// of these nothing is written. Rejects while local data is read-only, after a Clear history since the reads,
// and when the writer refuses.
RhythiaX.commitDataRecords = async function (changes = {}) {
  const put = Array.isArray(changes.put) ? changes.put : [];
  const remove = Array.isArray(changes.remove) ? changes.remove : [];
  await RhythiaX.dataRepositoryReady;
  if (RhythiaX.dataStorageReadOnly) throw new Error(DATA_READ_ONLY_ERROR);
  if (!put.length && !remove.length) return { committed: true, revs: {} };
  const records = [...put, ...remove];
  if ((changes.since !== undefined && changes.since !== dataHistoryClearRevision)
    || records.some(record => dataRecordRevisions.has(record) && dataRecordRevisions.get(record) !== dataHistoryClearRevision)) {
    throw new Error(DATA_HISTORY_CLEARED_ERROR);
  }
  const reads = records.map(record => (record && typeof record === 'object' ? dataRecordReads.get(record) : undefined));
  if (reads.some(read => !read)) throw new Error('A history record can be saved only after it was read or registered.');
  const clear = reads[0].clear;
  if (reads.some(read => dataClearGeneration(read.clear) !== dataClearGeneration(clear))) throw new Error(DATA_HISTORY_CLEARED_ERROR);
  const payload = {
    put: put.map((record, index) => {
      const normalized = RhythiaX.normalizeDataRecord(record, record.profileId);
      if (!normalized.profileId) throw new Error('Cannot save data without profileId.');
      return { id: normalized.profileId, rev: reads[index].rev, record: normalized };
    }),
    remove: remove.map((record, index) => ({ id: String(record.profileId || '').trim(), rev: reads[put.length + index].rev })),
    clear,
  };
  const result = await dataRecordsSend(payload);
  if (result?.cleared) throw new Error(DATA_HISTORY_CLEARED_ERROR);
  if (result?.committed) {
    put.forEach((record, index) => {
      const rev = result.revs?.[payload.put[index].id];
      record.updatedAt = rev;
      dataRecordReads.set(record, { rev, clear });
    });
    remove.forEach(record => dataRecordReads.set(record, { rev: null, clear }));
  }
  return result;
};

RhythiaX.getDataSettings = async function () {
  await RhythiaX.dataRepositoryReady;
  const result = await dataStorageGet({ [RhythiaX.DATA_SETTINGS_KEY]: RhythiaX.DATA_DEFAULT_SETTINGS });
  const settings = RhythiaX.normalizeDataSettings(result[RhythiaX.DATA_SETTINGS_KEY]);
  return RhythiaX.Consent?.given(settings) === true
    ? settings : { ...settings, syncMode: 'local-only', telemetryEnabled: false };
};

RhythiaX.getDataRecord = async function (profileId) {
  const revision = dataHistoryClearRevision;
  await RhythiaX.dataRepositoryReady;
  const id = String(profileId || '').trim();
  if (!id) return null;
  const result = await dataStorageGet([dataEntryKey(id), DATA_HISTORY_CLEAR_KEY]);
  const record = result[dataEntryKey(id)];
  if (!record || revision !== dataHistoryClearRevision) return null;
  const normalized = RhythiaX.normalizeDataRecord(record, id);
  dataRecordRevisions.set(normalized, revision);
  dataRecordReads.set(normalized, { rev: dataRecordRev(record), clear: result[DATA_HISTORY_CLEAR_KEY] ?? null });
  return normalized;
};

// One record, as RhythiaX.commitDataRecords. Resolves the saved copy, or null in a tab the extension has left;
// rejects with code 'conflict' when another context changed the stored record since it was read.
RhythiaX.saveDataRecord = async function (record) {
  await RhythiaX.dataRepositoryReady;
  if (RhythiaX.dataStorageReadOnly) throw new Error(DATA_READ_ONLY_ERROR);
  const normalized = RhythiaX.normalizeDataRecord(record, record?.profileId);
  if (!normalized.profileId) throw new Error('Cannot save data without profileId.');
  const result = await RhythiaX.commitDataRecords({ put: [record] });
  if (result.conflict) {
    throw Object.assign(new Error(`The history of profile ${normalized.profileId} changed since it was read.`), { code: 'conflict' });
  }
  if (!result.committed) return null;
  normalized.updatedAt = record.updatedAt;
  return normalized;
};

RhythiaX.listDataRecords = async function () {
  const revision = dataHistoryClearRevision;
  await RhythiaX.dataRepositoryReady;
  const prefix = RhythiaX.DATA_STORAGE_ENTRY_PREFIX;
  const stored = await dataStorageEntriesWithPrefix(prefix, [DATA_HISTORY_CLEAR_KEY]);
  const clear = stored[DATA_HISTORY_CLEAR_KEY] ?? null;
  const records = revision !== dataHistoryClearRevision ? [] : Object.entries(stored)
    .filter(([key, value]) => key.startsWith(prefix) && value && typeof value === 'object')
    .map(([key, value]) => {
      const record = RhythiaX.normalizeDataRecord(value, key.slice(prefix.length));
      dataRecordRevisions.set(record, revision);
      dataRecordReads.set(record, { rev: dataRecordRev(value), clear });
      return record;
    })
    .filter(record => record.profileId);
  // The list keeps the revision too, for records created against it (RhythiaX.registerDataRecord).
  dataRecordRevisions.set(records, revision);
  dataRecordReads.set(records, { rev: null, clear });
  return records;
};

// A record created for a profile the listing did not have joins that listing: Clear history between the
// listing and the save then drops it like the listed records, instead of saving history again. It is saved
// as new, so a copy another context stored in the meantime makes its commit a conflict.
RhythiaX.registerDataRecord = function (record, records) {
  if (!record || typeof record !== 'object') return record;
  dataRecordRevisions.set(record, records && dataRecordRevisions.has(records) ? dataRecordRevisions.get(records) : dataHistoryClearRevision);
  const listing = records && typeof records === 'object' ? dataRecordReads.get(records) : undefined;
  if (listing) dataRecordReads.set(record, { rev: null, clear: listing.clear });
  return record;
};
