// =============================================
// Reimagined for Rhythia — Exodus data layer
// =============================================
// Builds the data Exodus renders from Rhythia's API, the community history and a
// local map art cache, and performs the signed-in player's own actions on Rhythia.

var RhythiaX = RhythiaX || {};

RhythiaX.ExodusData = (function () {
  'use strict';

  const API = 'https://production.rhythia.com/api/';
  const MAP_PREFIX = 'rhythiax_exodus_map_';
  const MAP_TTL = 30 * 864e5;
  const VPS = 'https://rhythia.shuriel.com/api/player/';
  const ACH_KEY = 'rhythiax_exodus_achievements';
  const SNAP_TTL = 7 * 864e5;
  const SNAP_MAX = 6;
  const KEEP = ['top', 'reign', 'stats', 'lastDay', 'spinTop', 'spinRecent', 'spinStats', 'vrTop', 'vrRecent', 'vrStats'];
  const LISTS = ['top', 'lastDay', 'reign', 'spinTop', 'spinRecent', 'vrTop', 'vrRecent'];
  let self = null;

  async function post(name, body, signal) {
    const res = await RhythiaX.Net.fetch(API + name, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
      body: JSON.stringify(body),
      signal,
    });
    if (!res.ok) throw new Error(`${name}: HTTP ${res.status}`);
    const json = await res.json();
    if (json?.error) throw new Error(`${name}: ${json.error}`);
    return json;
  }

  // Rhythia keeps the signed-in session in a Supabase token (older builds used a plain key); both looks read it
  // through shared/rhythia-session.js. Without that file nobody counts as signed in.
  function session() {
    return RhythiaX.RhythiaSession?.token?.() || '';
  }

  // The signed-in player's full profile, if it was read in this tab with the current session.
  const cachedSelf = () => (self && self.session === session() ? self.user : null);
  // The same, but undefined while the session is there and not read yet: null only means signed out.
  const knownSelf = () => (!session() ? null : self && self.session === session() ? self.user : undefined);

  // Which account the session belongs to, as a short hash of the sign-in's account id (of the session itself
  // when it carries none), so a saved copy made for one account is never shown to another.
  const hash = s => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193) >>> 0; return h.toString(36); };
  function viewerTag() {
    const s = session();
    if (!s) return '';
    let sub = '';
    try { sub = JSON.parse(atob(s.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).sub || ''; } catch (_) {}
    return hash(String(sub || s));
  }

  // getProfile with only a session answers with the signed-in player's own profile. undefined when it
  // could not be read: the page then shows neither the player nor a Sign in button.
  async function signedIn(signal) {
    const s = session();
    if (!s) { self = null; return null; }
    if (self?.session === s) return self.user;
    try {
      const user = (await post('getProfile', { session: s }, signal)).user || null;
      self = { session: s, user };
      return user;
    } catch (_) {
      return undefined;
    }
  }

  // field 'file': the map file's address, kept also for maps without art (undefined in entries from before).
  function storedMap(songId, field = 'meta') {
    try {
      const raw = localStorage.getItem(MAP_PREFIX + songId);
      if (!raw) return undefined;
      const entry = JSON.parse(raw);
      if (Date.now() - entry.at > MAP_TTL) return undefined;
      return entry[field];
    } catch (_) {
      return undefined;
    }
  }

  // Map details live in Rhythia's own site storage (about 1 KB each), which Rhythia also needs for its
  // sign-in. Once a day the expired ones go, and only the newest MAP_MAX stay.
  const MAP_MAX = 1000, SWEEP_KEY = 'rhythiax_exodus_map_sweep';
  let swept = false;
  function sweepMaps() {
    try {
      if (Date.now() - Number(localStorage.getItem(SWEEP_KEY) || 0) < 864e5) return;
      localStorage.setItem(SWEEP_KEY, String(Date.now()));
      const keep = [];
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (!k || !k.startsWith(MAP_PREFIX) || k === SWEEP_KEY) continue;
        let at = 0;
        try { at = JSON.parse(localStorage.getItem(k)).at || 0; } catch (_) {}
        if (Date.now() - at > MAP_TTL) localStorage.removeItem(k); else keep.push([at, k]);
      }
      keep.sort((a, b) => b[0] - a[0]).slice(MAP_MAX).forEach(([, k]) => localStorage.removeItem(k));
    } catch (_) {}
  }

  // A map asked for again while its request runs (score art and map types load together) waits for
  // that request instead of sending another; if it was cancelled for the other caller, it asks itself.
  const metaRuns = new Map();
  async function mapMeta(songId, signal) {
    if (!swept) setTimeout(sweepMaps, 3000);
    swept = true;
    const cached = storedMap(songId);
    if (cached !== undefined) return cached;
    const running = metaRuns.get(songId);
    if (running) {
      try { return await running; } catch (err) { if (signal?.aborted) throw err; }
    }
    const run = fetchMeta(songId, signal);
    metaRuns.set(songId, run);
    run.catch(() => {}).finally(() => { if (metaRuns.get(songId) === run) metaRuns.delete(songId); });
    return run;
  }

  async function fetchMeta(songId, signal) {
    let meta = null, file = null;
    try {
      const b = (await post('getBeatmapPageById', { mapId: songId, session: '' }, signal)).beatmap || {};
      file = b.beatmapFile || null;
      if (b.image) {
        const p = b.previewImage || {};
        meta = { img: p.medium || b.image, thumb: p.small || b.image, mapper: b.ownerUsername, stars: b.starRating, mapId: b.id, length: b.length, file: b.beatmapFile };
      }
    } catch (err) {
      if (signal?.aborted) throw err;
      return null;
    }
    try { localStorage.setItem(MAP_PREFIX + songId, JSON.stringify({ at: Date.now(), meta, file })); } catch (_) {}
    return meta;
  }

  async function mapMetaAll(ids, signal) {
    const out = {};
    let next = 0;
    const worker = async () => {
      while (next < ids.length) {
        const id = ids[next++];
        const meta = await mapMeta(id, signal);
        if (meta) out[id] = meta;
      }
    };
    await Promise.all(Array.from({ length: Math.min(8, ids.length) }, worker));
    return out;
  }

  // How each map plays (jumps, streams, techs, varied, and whether it has quantum parts), for the
  // profile's summaries. Only the notes are read (ExodusMapKit.notesOnly), and the result is kept in
  // one small list for a year. The key changes whenever the way types are worked out does, so old
  // types go (1.3.0 kept them under rhythiax_exodus_styles).
  const STYLE_KEY = 'rhythiax_exodus_styles3', STYLE_OLD = ['rhythiax_exodus_styles'];
  const STYLE_DAYS = 365, STYLE_FAIL_DAYS = 7, STYLE_MAX = 800;
  const KINDS = ['stream', 'jump', 'varied', 'tech'];
  const today = () => Math.floor(Date.now() / 864e5);
  try { for (const k of STYLE_OLD) localStorage.removeItem(k); } catch (_) {}
  function readStyles() {
    try { return JSON.parse(localStorage.getItem(STYLE_KEY) || '{}') || {}; } catch (_) { return {}; }
  }
  function writeStyles(list) {
    const keys = Object.keys(list);
    if (keys.length > STYLE_MAX) keys.sort((a, b) => list[a][0] - list[b][0]).slice(0, keys.length - STYLE_MAX).forEach(k => delete list[k]);
    try { localStorage.setItem(STYLE_KEY, JSON.stringify(list)); } catch (_) {}
  }
  // [day, kind, stream %, jump %, quantum 0/1, notes per second × 10, tech %]; kind -1 = unreadable.
  const styleOf = e => (e[1] < 0 ? null : { kind: KINDS[e[1]], stream: e[2] / 100, jump: e[3] / 100, quantum: e[4] === 1, nps: e[5] / 10, tech: (e[6] || 0) / 100 });
  const fresh = e => e && today() - e[0] < (e[1] < 0 ? STYLE_FAIL_DAYS : STYLE_DAYS);

  // Map id -> style (null when the map could not be read). onProgress(done, total) runs as files arrive.
  async function mapStyles(songIds, signal, onProgress) {
    const list = readStyles(), out = new Map(), todo = [];
    for (const id of new Set(songIds)) { if (fresh(list[id])) out.set(id, styleOf(list[id])); else todo.push(id); }
    let next = 0, done = 0, unsaved = 0;
    const save = () => { if (unsaved) { const now = readStyles(); for (const id of todo) if (list[id]) now[id] = list[id]; writeStyles(now); unsaved = 0; } };
    const fileOf = async id => {
      const meta = await mapMeta(id, signal);
      if (meta?.file) return meta.file;
      const file = storedMap(id, 'file');
      return file !== undefined ? file : (await post('getBeatmapPageById', { mapId: id, session: '' }, signal)).beatmap?.beatmapFile;
    };
    const worker = async () => {
      while (next < todo.length) {
        const id = todo[next++];
        let e;
        try {
          const file = await fileOf(id);
          if (!file) throw new Error('No map file');
          if (!/^https:\/\/([a-z0-9-]+\.)*rhythia\.com\//i.test(file)) throw new Error('Map file is not on Rhythia');
          const kit = RhythiaX.ExodusMapKit, a = kit.analyse(await kit.notesOnly(file, signal));
          e = [today(), KINDS.indexOf(kit.kind(a)), Math.round(a.mix.Stream * 100), Math.round(a.mix.Jump * 100), kit.quantum(a) ? 1 : 0, Math.round(a.avgNps * 10), Math.round(a.mix.Tech * 100)];
        } catch (err) {
          if (signal?.aborted) return;
          // Offline, refused (429) or a server error: try again next visit instead of remembering it.
          if (err?.name === 'TypeError' || /HTTP (408|429|5\d\d)/.test(err?.message || '')) { out.set(id, null); done++; onProgress?.(out.size, out.size + todo.length - done); continue; }
          e = [today(), -1, 0, 0, 0, 0, 0];
        }
        list[id] = e; out.set(id, styleOf(e)); done++; unsaved++;
        if (unsaved >= 10) save();
        onProgress?.(out.size, out.size + todo.length - done);
      }
    };
    await Promise.all(Array.from({ length: Math.min(4, todo.length) }, worker));
    save();
    return out;
  }
  const storedStyles = songIds => { const list = readStyles(), out = new Map(); for (const id of songIds) if (fresh(list[id])) out.set(id, styleOf(list[id])); return out; };

  // Community history follows the extension's one consent rule (RhythiaX.Consent, shared/consent.js):
  // only after the current consent version and a cloud or hybrid sync mode. Exodus reads that setting
  // itself and sends the request through RhythiaX.Net, so the page never waits for Classic's scripts.
  function storageGet(keys) {
    return new Promise(resolve => {
      try { chrome.storage.local.get(keys, r => resolve(chrome.runtime?.lastError ? {} : (r || {}))); } catch (_) { resolve({}); }
    });
  }

  // ─── Memory in this tab ──────
  // The answers kept in memory are capped: past the limit the oldest one goes, so a long session
  // across many pages does not keep growing.
  const MEMO_MAX = 20, HIST_MEMO_MAX = 2000;
  function remember(map, key, value, max = MEMO_MAX) {
    map.delete(key);
    map.set(key, value);
    if (map.size > max) map.delete(map.keys().next().value);
  }

  // ─── Saved copies ──────
  // Every saved copy has its own storage key (prefix + id), with a small index beside it (id → when the copy
  // was last saved or found unchanged). chrome.storage tells every open tab and the popup the old and the new
  // value of whatever changed, so one big object of all copies would travel to all of them on every save.
  // A copy that has not changed (its fetch time aside) is not written again: only its time in the index moves,
  // and the copy itself is rewritten at most every six hours, so its own fetch time stays close.
  // Saves from every Rhythia tab take turns through one Web Lock per shelf, so no tab writes the index from a
  // read another tab has already overtaken.
  const REWRITE = 6 * 36e5;
  // chrome.storage may hand an object back with its keys in another order, so copies are compared key-sorted.
  const sorted = v => JSON.stringify(v, (_, x) => (x && typeof x === 'object' && !Array.isArray(x) ? Object.fromEntries(Object.keys(x).sort().map(k => [k, x[k]])) : x));
  const sameCopy = (a, b) => { const plain = d => sorted(d && typeof d === 'object' && !Array.isArray(d) ? { ...d, fetchedAt: 0 } : d); return plain(a) === plain(b); };
  const withLock = (name, fn) => (typeof navigator !== 'undefined' && navigator.locks?.request ? navigator.locks.request(name, fn) : fn());
  // fix(data) (optional) returns a cleaned copy of an entry saved by an earlier version, or null to keep it.
  function shelf(prefix, max, ttl, fix) {
    const INDEX = prefix + 'index', key = id => prefix + id;
    const live = at => Date.now() - at < ttl;
    let queue = Promise.resolve();
    const turn = fn => (queue = queue.then(() => withLock(INDEX, fn)).catch(() => {}));
    // Several copies at once, each with the later of its own time and its index time.
    async function getMany(ids) {
      if (!ids.length) return {};
      const got = await storageGet([INDEX, ...ids.map(key)]), idx = got[INDEX] || {}, out = {};
      for (const id of ids) {
        const e = got[key(id)], at = Math.max(e?.at || 0, idx[id] || 0);
        if (e && live(at)) out[id] = { ...e, at };
      }
      return out;
    }
    const get = async id => (await getMany([String(id)]))[String(id)] || null;
    // entries: [[id, data]]. valid() (optional) is asked again when this save's turn comes, and again once the
    // stored copies are read: false drops the save (what it holds went out of date while it waited).
    function put(entries, valid) {
      if (!entries.length) return queue;
      if (!sweepAsked) { sweepAsked = true; setTimeout(sweepShelves, 5000); }
      return turn(async () => {
        if (valid && !valid()) return;
        const now = Date.now(), got = await storageGet([INDEX, ...entries.map(([id]) => key(id))]);
        if (valid && !valid()) return;
        const idx = { ...(got[INDEX] || {}) }, values = {};
        for (const [id, data] of entries) {
          const old = got[key(id)];
          idx[id] = now;
          if (!(old && now - old.at < REWRITE && sameCopy(old.data, data))) values[key(id)] = { at: now, data };
        }
        const keep = new Set(Object.entries(idx).filter(([, at]) => live(at)).sort((a, b) => b[1] - a[1]).slice(0, max).map(([id]) => id));
        const drop = Object.keys(idx).filter(id => !keep.has(id));
        for (const id of drop) { delete idx[id]; delete values[key(id)]; }
        await chrome.storage.local.set({ ...values, [INDEX]: idx });
        if (drop.length) await chrome.storage.local.remove(drop.map(key));
      });
    }
    // One id, a list of ids, or every indexed id a test accepts.
    function remove(ids) {
      return turn(async () => {
        const idx = { ...((await storageGet([INDEX]))[INDEX] || {}) };
        const gone = typeof ids === 'function' ? Object.keys(idx).filter(ids) : [].concat(ids).map(String);
        if (!gone.length) return;
        for (const id of gone) delete idx[id];
        await chrome.storage.local.set({ [INDEX]: idx });
        await chrome.storage.local.remove(gone.map(key));
      });
    }
    // Copies the index no longer lists (two tabs of an earlier version saving at once) or that expired, and
    // entries an earlier version saved in an older shape.
    function sweep(allKeys) {
      return turn(async () => {
        const idx = { ...((await storageGet([INDEX]))[INDEX] || {}) };
        for (const id of Object.keys(idx)) if (!live(idx[id])) delete idx[id];
        const lost = allKeys.filter(k => k.startsWith(prefix) && k !== INDEX && !(k.slice(prefix.length) in idx));
        const fixed = {};
        if (fix) {
          const got = await storageGet(Object.keys(idx).map(key));
          for (const [k, e] of Object.entries(got)) { const data = e?.data && fix(e.data); if (data) fixed[k] = { ...e, data }; }
        }
        await chrome.storage.local.set({ ...fixed, [INDEX]: idx });
        if (lost.length) await chrome.storage.local.remove(lost);
      });
    }
    return { get, getMany, put, remove, sweep };
  }
  // Once a week, the first time something is saved: the shelves drop what their index lost.
  const SHELF_SWEEP_KEY = 'rhythiax_exodus_shelf_sweep';
  let sweepAsked = false;
  function sweepShelves() {
    try {
      if (Date.now() - Number(localStorage.getItem(SHELF_SWEEP_KEY) || 0) < 7 * 864e5) return;
      // Only the key names are read: a browser without getKeys skips the sweep rather than load every stored
      // value (own-theme pictures and videos among them) into a Rhythia tab.
      const L = chrome.storage.local;
      if (typeof L.getKeys !== 'function') return;
      localStorage.setItem(SHELF_SWEEP_KEY, String(Date.now()));
      Promise.resolve(L.getKeys())
        .then(keys => Promise.all([snaps, pages, hists].map(s => s.sweep(keys)))).catch(() => {});
    } catch (_) {}
  }

  // ─── Community history: the player's choice, and the popup's Clear history ──────
  // Without RhythiaX.Consent nothing is allowed.
  const allowedIn = ds => RhythiaX.Consent?.historyAllowed(ds) === true;
  async function historyAllowed() {
    const { rhythiaxDataSettings: ds } = await storageGet(['rhythiaxDataSettings']);
    return allowedIn(ds);
  }
  // Clear history, or a switch to This device, reaches open tabs here: what this tab keeps goes, answers to
  // requests sent before are neither shown nor saved (histGen), and the shell draws the page again
  // (onHistoryChange). The copies on disk go in the background (background/storage-mutation-authority.js).
  let histGen = 0;
  const historyListeners = [];
  function dropHistory() {
    histGen++;
    histMemo.clear(); histLooked.clear(); histDirty.clear(); clearTimeout(histWrite);
  }
  try {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== 'local') return;
      const ds = changes.rhythiaxDataSettings;
      const why = changes.rhythiax_history_clear_generation ? 'cleared' : ds && allowedIn(ds.oldValue) && !allowedIn(ds.newValue) ? 'off' : '';
      if (!why) return;
      dropHistory();
      for (const fn of historyListeners) { try { fn(why); } catch (_) {} }
    });
  } catch (_) {}

  // A profile's daily history: { list, recent } (recent: the VPS sent only the last days, as it does without a
  // key when keys are required), { list: [] } when there is none or online history is off, or null when it
  // could not be read (offline, refused, slow): the caller then keeps what it had. A full list is reused for
  // three hours (the score page shares it). The wait is capped (maxWait), so a paused budget fails at once.
  const HIST_WAIT = 3500;
  async function history(id, signal) {
    if (!(await historyAllowed())) return { list: [] };
    const hit = histMemo.get(Number(id));
    if (hit && !hit.short && Date.now() - hit.at < HIST_FRESH) return { list: hit.list };
    const gen = histGen;
    let res, body;
    try {
      res = await RhythiaX.Net.fetch(`${VPS}${Number(id)}/history`, { headers: { Accept: 'application/json' }, signal, maxWait: HIST_WAIT });
      if (res.status === 404 || res.status === 410) return { list: [] };
      if (!res.ok) return null;
      body = await res.json();
    } catch (_) {
      return null;
    }
    if (!Array.isArray(body?.history)) return null;
    if (body.recentOnly) return { list: body.history, recent: true };
    if (gen === histGen) remember(histMemo, Number(id), { at: Date.now(), list: body.history }, HIST_MEMO_MAX);
    return { list: body.history };
  }
  // A short answer fills in the days it covers; the older days stay as they were.
  const withRecent = (old, recent) => { const from = recent[0]?.date; return [...(old || []).filter(d => d?.date && (!from || d.date < from)), ...recent]; };

  // Achievements are the same for everyone and rarely change. null when they could not be read.
  async function allAchievements(signal) {
    try {
      const hit = JSON.parse(localStorage.getItem(ACH_KEY) || 'null');
      if (hit && Date.now() - hit.at < 7 * 864e5) return hit.list;
    } catch (_) {}
    try {
      const list = (await post('getAchievements', {}, signal)).achievements || [];
      try { localStorage.setItem(ACH_KEY, JSON.stringify({ at: Date.now(), list })); } catch (_) {}
      return list;
    } catch (_) {
      return null;
    }
  }

  // The last few profiles are kept so a visit can paint at once and refresh quietly. They hold no part of the
  // viewer: who is signed in, and whether this is their own profile, come from the session on every paint, and
  // Rhythia's friend_state (whether the viewer has added this player) is not saved either.
  // Copies from 1.3.0 still carry those; they are left out on reading and cleaned in the weekly sweep.
  const noViewer = d => {
    const friend = d?.profile && typeof d.profile === 'object' && 'friend_state' in d.profile;
    if (!d || !('owner' in d || 'signedIn' in d || friend)) return null;
    const { owner, signedIn, ...rest } = d;
    if (friend) rest.profile = (({ friend_state, ...p }) => p)(d.profile);
    return rest;
  };
  const snaps = shelf('rhythiaxExodusSnap:', SNAP_MAX, SNAP_TTL, noViewer);
  // Under This device the community part of a saved history is not shown: only the last point, Rhythia's own.
  async function snapshot(id) {
    const data = (await snaps.get(id))?.data;
    if (!data) return null;
    const out = noViewer(data) || data;
    if (!(await historyAllowed())) out.history = (out.history || []).slice(-1);
    return out;
  }

  // Data whose requests started before the player changed something must not come back.
  const forgotAt = {};
  const stale = (id, startedAt) => Boolean(forgotAt[id] && startedAt < forgotAt[id]);
  function saveSnapshot(id, data, startedAt, gen) {
    if (stale(id, startedAt) || gen !== histGen) return;
    snaps.put([[id, noViewer(data) || data]], () => gen === histGen);
  }

  // Today's live numbers close the history, so the newest point always matches the profile.
  function withToday(hist, user, stats) {
    const today = new Date().toISOString().slice(0, 10);
    const live = {
      date: today,
      skillPoints: user.skill_points,
      globalRank: user.position,
      countryRank: user.country_position,
      playCount: user.play_count,
      squaresHit: user.squares_hit,
      avgAccuracy: stats?.averageAccuracy ?? hist.at(-1)?.avgAccuracy ?? 0,
      totalScores: stats?.totalScores,
      averageRhythmPoints: stats?.averageRhythmPoints,
    };
    const list = hist.filter(d => d?.date && d.date < today);
    list.push(live);
    return list;
  }

  // A profile: the Rhythia requests its first paint needs, all at once. The community history is not waited
  // for: if it has not answered by the time Rhythia has, the profile comes with the history of the copy it
  // falls back on, and historyLate brings the new one (or null) within HIST_WAIT. A request that failed (pins,
  // showcase, achievements, history) keeps what that copy had instead of standing in as empty, and data with
  // a failed part and nothing to fall back on is shown but not saved. prev: the copy to fall back on when the
  // caller has a newer one than the saved one (the profile on screen, for a refresh after Settings).
  // startedAt: when the requests went out (stale() tells whether the player changed something since).
  async function load(id, signal, prev) {
    const pid = Number(id), s = session(), startedAt = Date.now(), gen = histGen;
    let hist = null, histDone = false;
    // HIST_WAIT is the history request's own maxWait; the timer only covers a limiter that does not know it.
    const histP = Promise.race([history(pid, signal), new Promise(r => setTimeout(r, HIST_WAIT + 1000, null))])
      .then(h => { hist = h || null; histDone = true; return hist; });
    const [prof, scores, pins, , ach, showcase, saved] = await Promise.all([
      post('getProfile', { session: s, id: pid }, signal),
      post('getUserScores', { session: s, id: pid, limit: 100 }, signal),
      post('getPinnedScores', { session: '', id: pid }, signal).catch(() => null),
      signedIn(signal),
      allAchievements(signal),
      post('getProfileShowcase', { session: '', id: pid }, signal).catch(() => null),
      prev !== undefined ? prev : snapshot(pid).catch(() => null),
    ]);
    const user = prof.user;
    if (!user) throw new Error('Player not found');
    const pinned = pins ? pins.pinnedScores || [] : saved?.pinned || [];
    const lost = (!pins && !saved?.pinned) || (!showcase && !saved?.showcase) || (!ach && !saved?.achievements);
    // What is on screen first comes first: pins, then the first page of top plays, then the rest of the Lock
    // lists the profile shows (Recent shows 20). Spin and VR art is asked for when that mode is opened (mapMetaFor).
    const ids = [];
    const add = list => { for (const sc of list || []) if (!ids.includes(sc.songId)) ids.push(sc.songId); };
    add(pinned); add((scores.top || []).slice(0, 10));
    const firstCount = ids.length;
    add(scores.top); add(scores.reign); add((scores.lastDay || []).slice(0, 20));
    const askCount = ids.length;
    for (const k of LISTS) add(scores[k]);
    // Map art already cached paints now; the rest is filled in once it arrives.
    const meta = Object.fromEntries(ids.map(sid => [sid, storedMap(sid)]).filter(([, m]) => m));
    const missing = ids.slice(0, askCount).filter(sid => !(sid in meta));
    // Once the history was cleared or turned off after the requests went out, neither the answer nor the
    // copy read before counts: only today's own numbers are left.
    const histOf = h => (gen !== histGen ? [] : h?.recent ? withRecent(saved?.history, h.list) : h ? h.list : saved?.history || []);
    const build = h => withToday(histOf(h), user, scores.stats);
    const data = {
      fetchedAt: new Date().toISOString(),
      profile: user,
      scores: Object.fromEntries(KEEP.map(k => [k, scores[k]])),
      pinned,
      showcase: showcase ? { revision: showcase.revision || 0, items: Array.isArray(showcase.items) ? showcase.items : [] } : saved?.showcase || { revision: 0, items: [] },
      meta,
      history: build(histDone ? hist : null),
      achievements: ach || saved?.achievements || [],
    };
    const firstIds = ids.slice(0, firstCount);
    const soon = missing.filter(sid => firstIds.includes(sid)), later = missing.filter(sid => !firstIds.includes(sid));
    const metaFirst = soon.length ? mapMetaAll(soon, signal) : null;
    const metaPending = missing.length ? Promise.resolve(metaFirst).then(a => mapMetaAll(later, signal).then(b => ({ ...(a || {}), ...b }))) : null;
    const historyLate = histDone ? null : histP.then(h => (h && gen === histGen ? build(h) : null));
    // Saved once (each save travels to every tab), when the history is in. Map art that arrives later is kept
    // per map (MAP_PREFIX), so the next visit has it without a second save here.
    Promise.resolve(historyLate).then(late => { if (!lost) saveSnapshot(pid, late ? { ...data, history: late } : data, startedAt, gen); });
    return { data, startedAt, metaFirst, metaPending, historyLate };
  }

  // ─── Showcase search (same sources and shapes as Rhythia's own picker) ──────
  const previewOk = u => (u && /^https?:\/\//.test(u) ? u : null);
  async function searchShowcase({ kind, text, page = 1, ownerId, skinType = 'rhs' }, signal) {
    if (kind === 'beatmap') {
      const r = await post('getBeatmaps', { session: '', page, textFilter: text, creator: ownerId }, signal);
      return {
        totalPages: Math.ceil((r.total || 0) / (r.viewPerPage || 50)),
        items: (r.beatmaps || []).map(b => ({
          kind, id: String(b.id), title: b.title || 'Untitled beatmap', creator: b.ownerUsername || 'Unknown creator',
          subtitle: `${(b.starRating || 0).toFixed(2)} ★ · ${b.qualified ? 'Qualified' : b.status || 'Unranked'}`,
          previewUrl: previewOk(b.previewImage?.medium || b.previewImage?.small || b.image),
        })),
      };
    }
    if (kind === 'skin') {
      const r = await post('getSkinAssets', { assetType: skinType, search: text, page, ownerId, itemsPerPage: 12 }, signal);
      return {
        totalPages: r.totalPages || 0,
        items: (r.assets || []).map(a => ({
          kind, id: a.id, title: a.name, creator: a.owner?.username || '', subtitle: `${(a.downloadCount || 0).toLocaleString('en-US')} downloads`,
          previewUrl: previewOk(a.assetType === 'rhs' ? a.previewUrl : a.previewUrl || a.url), skinType: a.assetType, colors: a.colors || undefined,
        })),
      };
    }
    const r = await post('getCollections', { session: '', page, search: text, owner: ownerId, itemsPerPage: 12 }, signal);
    return {
      totalPages: r.totalPages || 0,
      items: (r.collections || []).map(c => ({
        kind, id: String(c.id), title: c.title || 'Untitled collection', creator: c.ownerUsername || '',
        subtitle: `${(c.beatmapCount || 0).toLocaleString('en-US')} beatmaps`, previewUrl: null,
      })),
    };
  }

  // ─── The signed-in player's actions ──────
  function needSession() {
    const s = session();
    if (!s) throw new Error('Sign in to Rhythia first');
    return s;
  }

  // Social links live in about_me as trailing comments, as Rhythia writes them:
  // <!--rhythia-social:URL--> for the first and <!--rhythia-social-2:URL--> for the second.
  function composeAboutMe(bio, links) {
    const tail = links.filter(Boolean).map((l, i) => `<!--rhythia-social${i ? `-${i + 1}` : ''}:${encodeURIComponent(l)}-->`).join('\n');
    return [String(bio || '').trim(), tail].filter(Boolean).join('\n');
  }

  const actions = {
    saveAbout: (bio, links) => post('editAboutMe', { session: needSession(), data: { about_me: composeAboutMe(bio, links) } }),
    setPinned: (scoreId, pinned) => post('setScorePinned', { session: needSession(), scoreId: Number(scoreId), pinned: Boolean(pinned) }),
    addFriend: profileId => post('editProfileFriend', { session: needSession(), profileId: Number(profileId), action: 'add' }),
    // Rhythia answers with status "ok" and the new list, or "supporter_required".
    setShowcase: (expectedRevision, items) => post('setProfileShowcase', {
      session: needSession(), expectedRevision, items: items.map(({ kind, id }) => ({ kind, id: String(id) })),
    }),
  };

  // ─── The signed-in player's settings (core/account.js) ──────
  // The same requests Rhythia's own Settings window sends, so a save there and here mean the same.
  const account = {
    // Always fresh: a save sends the current avatar and banner back, so it must not use an old copy.
    profile: async signal => {
      const s = needSession();
      const user = (await post('getProfile', { session: s }, signal)).user || null;
      self = { session: s, user };
      return user;
    },
    login: signal => post('getOwnAuthSettings', { session: needSession() }, signal),
    // Whether the name can change now: a free first change, Name Change items, or a purchase.
    nameChange: async signal => {
      const res = await RhythiaX.Net.fetch(API + 'purchases', {
        method: 'POST', cache: 'no-store', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'catalog', session: needSession() }), signal,
      });
      const json = await res.json();
      if (json?.error) throw new Error(json.error);
      return (json.products || []).find(p => p.code === 'name_change') || null;
    },
    save: async data => {
      let json;
      try {
        json = await post('editProfile', { session: needSession(), data });
      } catch (err) {
        const m = String(err.message || '').replace(/^editProfile: /, '');
        throw new Error(m.includes('profiles_computedUsername_key') ? 'This username is already taken.'
          : m.includes('Flag must be a valid country code') ? 'That flag is not valid.' : m || 'Rhythia did not save it.');
      }
      if (json && 'success' in json && !json.success) throw new Error('Rhythia did not save it.');
      self = null;
      return json;
    },
  };

  // ─── Home page ──────
  const HOME_KEY = 'rhythiaxExodusHome';
  const slimPlayer = u => ({
    id: u.id, username: u.username, avatar: u.avatar_url, flag: u.flag, verified: Boolean(u.verified),
    rp: u.skill_points, spinRp: u.spin_skill_points, vrRp: u.vr_skill_points,
    position: u.position, spinPosition: u.spin_position, vrPosition: u.vr_position,
    change: u.rank_change, spinChange: u.spin_rank_change, vrChange: u.vr_rank_change,
    clan: u.clans ? { id: u.clans.id, acronym: u.clans.acronym } : null,
  });
  const slimMap = b => ({
    id: b.id, title: b.title, mapper: b.ownerUsername, mapperId: b.owner, stars: b.starRating, difficulty: b.difficulty,
    length: b.length, plays: b.playcount, notes: b.noteCount, created: b.created_at,
    img: b.previewImage?.medium || b.image, thumb: b.previewImage?.small || b.image,
  });

  async function storedHome() {
    const { [HOME_KEY]: hit } = await storageGet([HOME_KEY]);
    return hit && Date.now() - hit.at < SNAP_TTL ? hit.data : null;
  }
  // The saved home page. Its signed-in parts (the rank card, the friends) are shown only to the account they
  // were read for (meTag); anyone else gets them once the fresh page is in.
  async function homeSnapshot() {
    const data = await storedHome();
    if (!data) return null;
    const tag = viewerTag();
    return data.meTag === tag ? data : { ...data, me: tag ? undefined : null, friends: [], meTag: tag };
  }

  // The top ten of one mode; Lock comes with the page, Spin and VR on request.
  async function leaderboard(mode, signal) {
    const r = await post('getLeaderboard', { page: 1, session: session(), spin: mode === 'spin', vr: mode === 'vr' }, signal);
    return (r.leaderboard || []).slice(0, 10).map(slimPlayer);
  }

  const timed = (promise, ms) => Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))]);

  // A part that failed keeps what the saved page had (the signed-in parts only for the same account), and a
  // page with a failed part and nothing to keep in its place is shown but not saved.
  async function loadHome(signal) {
    const s = session(), tag = viewerTag();
    // Rhythia's public stats can take a long time to answer; the page does not wait for them.
    const [stats, online, lock, maps, log, me, friends, prev] = await Promise.all([
      timed(post('getPublicStats', {}, signal), 6000).catch(() => null),
      post('getOnlinePlayers', {}, signal).catch(() => null),
      leaderboard('normal', signal).catch(() => null),
      post('getBeatmaps', { session: '', page: 1, status: 'RANKED' }, signal).catch(() => null),
      post('getChangelog', { type: 'public', skip: 0, limit: 1 }, signal).catch(() => null),
      signedIn(signal),
      s ? post('getFriends', { session: s }, signal).catch(() => null) : { friends: [] },
      storedHome().catch(() => null),
    ]);
    const mine = prev && tag && prev.meTag === tag ? prev : null;
    // As on Rhythia: default "user…" names are left out and the first 70 are listed.
    const players = (online?.players || []).filter(p => p.name && !p.name.toLowerCase().startsWith('user'));
    // Without fresh stats, the last saved ones stand in; without those, their sections stay out.
    const data = {
      fetchedAt: new Date().toISOString(),
      stats: stats ? {
        beatmaps: stats.beatmaps, players: stats.profiles, scores: stats.scores, online: stats.onlineUsers,
        chart: (stats.countChart || []).map(p => ({ t: p.timestamp, v: p.value })),
      } : prev?.stats || null,
      clans: stats ? (stats.topClans || []).map(c => ({ id: c.id, name: c.name, acronym: c.acronym, avatar: c.avatar_url, members: c.member_count, rp: c.total_skill_points })) : prev?.clans || [],
      comments: stats ? (stats.lastComments || []).map(c => ({ user: c.username, userId: c.owner, text: String(c.content || '').trim(), mapId: c.beatmapPage, map: c.beatmapTitle })) : prev?.comments || [],
      online: online ? players.slice(0, 70).map(p => ({ id: p.id, name: p.name, avatar: p.profilePictureUrl })) : prev?.online || [],
      unnamed: online ? Math.max(0, (online.players || []).length - Math.min(70, players.length)) : prev?.unnamed || 0,
      leaderboard: { normal: lock || prev?.leaderboard?.normal || [] },
      maps: maps ? (maps.beatmaps || []).slice(0, 8).map(slimMap) : prev?.maps || [],
      changelog: log ? (Array.isArray(log) && log[0] ? { id: log[0].id, date: log[0].date, markdown: log[0].markdown } : null) : prev?.changelog ?? null,
      // undefined: signed in, but who could not be read.
      me: me ? slimPlayer({ ...me, rank_change: 0 }) : me === null ? null : mine?.me,
      friends: friends ? (friends.friends || []).map(f => ({ id: f.id, username: f.username, avatar: f.avatar_url })) : mine?.friends || [],
      meTag: tag,
    };
    if (me) Object.assign(data.me, { countryPosition: me.country_position, plays: me.play_count });
    const lost = !prev && [online, lock, maps, log].some(x => x == null);
    if (stats && !lost) try { chrome.storage.local.set({ [HOME_KEY]: { at: Date.now(), data } }); } catch (_) {}
    return data;
  }

  // ─── Leaderboards ──────
  const BOARD_KEY = 'rhythiaxExodusBoard';
  const boardMemo = new Map();
  const histMemo = new Map();
  const boardKey = q => [q.flag || '', q.mode, q.inactive ? 1 : 0, q.page].join('|');

  async function boardSnapshot(q) {
    const k = boardKey(q), hit = boardMemo.get(k);
    if (hit && Date.now() - hit.at < 120000) return hit.data;
    const { [BOARD_KEY]: snap } = await storageGet([BOARD_KEY]);
    return snap?.key === k && Date.now() - snap.at < SNAP_TTL && snap.data ? noPosition(snap.data) : null;
  }
  // The viewer's own position is not saved (another account on this browser would see it); 1.3.0 copies
  // that still hold it are read without it.
  const noPosition = ({ userPosition, ...rest }) => rest;

  // One page of Rhythia's leaderboard (50 players) for a mode, country and page.
  async function board(q, signal) {
    const r = await post('getLeaderboard', {
      page: q.page, session: session(), spin: q.mode === 'spin', vr: q.mode === 'vr',
      include_inactive: Boolean(q.inactive), ...(q.flag ? { flag: q.flag } : {}),
    }, signal);
    const data = {
      fetchedAt: new Date().toISOString(), total: r.total || 0, perPage: r.viewPerPage || 50, userPosition: r.userPosition || 0,
      rows: (r.leaderboard || []).map(u => ({ ...slimPlayer(u), plays: u.play_count })),
    };
    const k = boardKey(q);
    remember(boardMemo, k, { at: Date.now(), data });
    try { chrome.storage.local.set({ [BOARD_KEY]: { key: k, at: Date.now(), data: noPosition(data) } }); } catch (_) {}
    return data;
  }

  // Community history for a page of players (same consent rule). The history is daily, so an
  // answer stays good for three hours and is still shown, while a newer one is fetched, for
  // three days (kept across reloads, trimmed to the last 40 days). One request to the VPS's
  // bulk route covers a whole page; where that route is not there yet, players are asked for
  // one by one, within the VPS's limits (shared/net.js); the first refusal stops the rest.
  // A bulk refusal (429) or failure is not followed by one-by-one requests: the server counts
  // players, and fifty single requests would spend the budget it just said was used up.
  // onPart(list) is called with what is known at once and again as more arrives. Cleared or turned off
  // history on the way stops it: nothing more reaches onPart, and the answer is null.
  const HIST_FRESH = 3 * 36e5;
  const HIST_STALE = 3 * 864e5;
  const HIST_MAX = 1500;
  // A short answer (recentOnly: the VPS wanted a key and had none) is kept in this tab only, for ten minutes.
  const RECENT_FRESH = 10 * 60e3;
  // A board's budget waits are capped too, so a paused VPS budget ends the wait at once instead of after it.
  const BOARD_WAIT = 20000;
  const NO_BULK_KEY = 'rhythiax_exodus_no_bulk';
  const trim = list => list.slice(-40).map(d => ({ date: d.date, skillPoints: d.skillPoints, globalRank: d.globalRank, countryRank: d.countryRank }));
  const hists = shelf('rhythiaxExodusHist:', HIST_MAX, HIST_STALE);
  // Only the players asked for are read from storage, each once per tab.
  const histLooked = new Set();
  async function loadHist(ids) {
    const want = ids.filter(id => !histMemo.has(id) && !histLooked.has(id));
    if (!want.length) return;
    if (histLooked.size > 5000) histLooked.clear();
    want.forEach(id => histLooked.add(id));
    const gen = histGen, kept = await hists.getMany(want.map(String));
    if (gen !== histGen) return;
    for (const [id, e] of Object.entries(kept)) if (!histMemo.has(Number(id))) remember(histMemo, Number(id), { at: e.at, list: e.data, short: true }, HIST_MEMO_MAX);
  }
  const freshFor = hit => (hit.recent ? RECENT_FRESH : HIST_FRESH);
  // Only the players fetched since the last save are written; short answers never are.
  let histWrite = 0;
  const histDirty = new Set();
  function keepHist(id) {
    histDirty.add(id);
    clearTimeout(histWrite);
    histWrite = setTimeout(() => {
      const ids = [...histDirty].filter(i => histMemo.has(i) && !histMemo.get(i).recent), gen = histGen;
      histDirty.clear();
      hists.put(ids.map(i => { const e = histMemo.get(i); return [i, e.short ? e.list : trim(e.list)]; }), () => gen === histGen);
    }, 400);
  }
  const noBulk = () => { try { return Number(localStorage.getItem(NO_BULK_KEY)) > Date.now(); } catch (_) { return false; } };
  async function bulkHistory(ids, signal) {
    if (noBulk()) return null;
    let res;
    try {
      res = await RhythiaX.Net.fetch(VPS.replace(/player\/$/, 'players/history'), { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ ids, days: 30 }), signal, maxWait: BOARD_WAIT });
    } catch (err) {
      if (signal?.aborted) throw err;
      return false;
    }
    // Not on this VPS yet: ask one by one, and try the bulk route again in six hours.
    if (res.status === 404 || res.status === 405) { try { localStorage.setItem(NO_BULK_KEY, String(Date.now() + 6 * 36e5)); } catch (_) {} return null; }
    if (!res.ok) return false;
    const body = await res.json().catch(() => null), players = body?.players;
    return players && typeof players === 'object' ? { players, recent: Boolean(body.recentOnly) } : false;
  }
  // What the cache already holds for these players, without asking the VPS.
  async function historiesCached(ids) {
    if (!(await historyAllowed())) return null;
    await loadHist(ids);
    return Object.fromEntries(ids.filter(id => histMemo.has(id)).map(id => { const h = histMemo.get(id); return [id, h.short ? h.list : trim(h.list)]; }));
  }
  async function histories(ids, signal, onPart) {
    if (!(await historyAllowed())) return null;
    await loadHist(ids);
    const out = {}, todo = [], gen = histGen;
    for (const id of ids) {
      const hit = histMemo.get(id);
      if (hit) out[id] = hit.short ? hit.list : trim(hit.list);
      if (!hit || Date.now() - hit.at > freshFor(hit)) todo.push(id);
    }
    onPart?.({ ...out });
    if (!todo.length) return out;
    const got = await bulkHistory(todo.slice(0, 50), signal);
    if (gen !== histGen) return null;
    if (got === false) { onPart?.({ ...out }); return out; }
    if (got) {
      for (const id of todo.slice(0, 50)) {
        const list = trim(got.players[id] || []);
        remember(histMemo, id, { at: Date.now(), list, short: true, recent: got.recent }, HIST_MEMO_MAX);
        out[id] = list;
        if (!got.recent) keepHist(id);
      }
      onPart?.({ ...out });
      return out;
    }
    let next = 0, refused = false, last = 0;
    const worker = async () => {
      while (next < todo.length && !refused) {
        const id = todo[next++];
        let res;
        try {
          res = await RhythiaX.Net.fetch(`${VPS}${Number(id)}/history`, { headers: { Accept: 'application/json' }, signal, maxWait: BOARD_WAIT });
        } catch (err) {
          if (signal?.aborted) throw err;
          refused = true; // the server could not be reached in time; a refusal (429) is a status, handled below
          return;
        }
        if (res.status === 429) { refused = true; return; }
        // Only an answer, or "no history" (404), is kept; a server error is asked again next time.
        const body = res.ok ? await res.json().catch(() => null) : null;
        if (gen !== histGen || !(res.status === 404 || res.status === 410 || Array.isArray(body?.history))) continue;
        const list = body?.history || [], recent = Boolean(body?.recentOnly);
        remember(histMemo, id, recent ? { at: Date.now(), list: trim(list), short: true, recent } : { at: Date.now(), list }, HIST_MEMO_MAX);
        out[id] = trim(list);
        if (!recent) keepHist(id);
        // Redraw at most every half second while answers come in.
        if (Date.now() - last > 500) { last = Date.now(); onPart?.({ ...out }); }
      }
    };
    await Promise.all(Array.from({ length: Math.min(4, todo.length) }, worker));
    if (gen !== histGen) return null;
    onPart?.({ ...out });
    return out;
  }

  // ─── Scores, maps and the map list ──────
  // The last answers are kept (memory, and up to 40 in storage for a week), so a page paints at
  // once from its saved copy and the fresh answer replaces it.
  const PAGES_MAX = 40;
  const pageMemo = new Map();
  const pages = shelf('rhythiaxExodusPage:', PAGES_MAX, SNAP_TTL);
  async function pageSnapshot(key) {
    const hit = pageMemo.get(key);
    if (hit) return hit.data;
    return (await pages.get(key))?.data || null;
  }
  function keepPage(key, data) {
    remember(pageMemo, key, { at: Date.now(), data });
    pages.put([[key, data]]);
    return data;
  }
  // After a change on Rhythia, the copies it made out of date go from memory and from storage.
  function dropPages(test) {
    pageMemo.forEach((_, k) => { if (test(k)) pageMemo.delete(k); });
    pages.remove(test);
  }

  const slimScore = s => ({
    id: s.id, rp: s.awarded_sp, acc: s.accuracy, misses: s.misses, mods: s.mods || [], speed: s.speed || 1, spin: Boolean(s.spin),
    passed: s.passed, at: s.created_at, userId: s.userId, username: s.username, avatar: s.avatar_url, flag: s.flag,
    clan: s.clans ? { id: s.clans.id, name: s.clans.name, acronym: s.clans.acronym } : null, place: s.place, total: s.totalScores,
  });
  const fullMap = b => b && ({
    ...slimMap(b), status: b.status, file: b.beatmapFile, art: b.previewImage?.large || b.imageLarge || b.image, offset: b.offset || 0,
    qualifiedBy: b.qualifiedByUsername, qualifiedById: b.qualifiedBy, updated: b.updated_at, description: b.description || '', tags: b.tags || '',
    explicit: Boolean(b.explicit), hash: b.mapHash, mapperAvatar: b.ownerAvatar, video: b.videoUrl,
    trophy: b.trophyOwner ? { scoreId: b.trophyOwner.scoreId, rp: b.trophyOwner.awardedSp, userId: b.trophyOwner.userId, username: b.trophyOwner.username, avatar: b.trophyOwner.userAvatarUrl, clan: b.trophyOwner.clanName ? { id: b.trophyOwner.clanId, name: b.trophyOwner.clanName, acronym: b.trophyOwner.clanAcronym } : null } : null,
  });

  // One map page: the map, its top 50 for a mode and, for a player, their best there with its place.
  async function mapPage(id, mode = 'normal', userId = 0, signal, keep = !userId) {
    const s = session();
    const r = await post('getBeatmapPage', { id: Number(id), session: userId && s ? s : '', mode, limit: 50, ...(userId ? { user_id: Number(userId) } : {}) }, signal);
    if (!r.beatmap) throw new Error('This map does not exist.');
    const data = { fetchedAt: new Date().toISOString(), map: fullMap(r.beatmap), scores: (r.scores || []).map(slimScore), mine: r.userScore ? slimScore(r.userScore) : null };
    return keep ? keepPage(`map:${id}:${mode}`, data) : data;
  }

  // One score with the map it was played on, the top of that map and the player's best there.
  async function scorePage(id, signal) {
    const r = await post('getScore', { id: Number(id), session: '' }, signal);
    const sc = r.score;
    if (!sc) throw new Error('This score does not exist.');
    const byHash = await post('getBeatmapPageById', { session: '', mapId: sc.beatmapHash, limit: 1 }, signal).catch(() => null);
    const mapId = byHash?.beatmap?.id;
    const mode = sc.spin ? 'spin' : 'normal';
    const page = mapId ? await mapPage(mapId, mode, sc.userId, signal).catch(() => null) : null;
    // A map request that failed leaves the map's part to the saved copy, and such a page is not saved.
    const failed = !byHash || (mapId && !page), prev = failed ? await pageSnapshot(`score:${id}`).catch(() => null) : null;
    const data = {
      fetchedAt: new Date().toISOString(),
      // getScore gives no accuracy; Rhythia's score page works it out from the notes and misses.
      score: { ...slimScore(sc), acc: sc.accuracy ?? (sc.beatmapNotes ? (sc.beatmapNotes - (sc.misses || 0)) / sc.beatmapNotes * 100 : null), notes: sc.beatmapNotes, difficulty: sc.beatmapDifficulty, title: sc.beatmapTitle, hash: sc.beatmapHash, replay: sc.replay_url },
      map: page?.map || fullMap(byHash?.beatmap) || prev?.map || null, top: page?.scores || prev?.top || [], best: page ? page.mine : prev?.best || null, mode,
    };
    return failed ? data : keepPage(`score:${id}`, data);
  }

  // The player's community history around a play (same consent rule as everywhere else). The page waits for
  // it at most HIST_WAIT; a short answer is shown but not kept as the full history.
  async function historyOf(id, signal) {
    if (!(await historyAllowed())) return null;
    const hit = histMemo.get(Number(id));
    if (hit && !hit.short && Date.now() - hit.at < HIST_FRESH) return hit.list;
    const gen = histGen;
    const res = await RhythiaX.Net.fetch(`${VPS}${Number(id)}/history`, { headers: { Accept: 'application/json' }, signal, maxWait: HIST_WAIT }).catch(() => null);
    if (!res || !res.ok) return res?.status === 404 || res?.status === 410 ? [] : null;
    const body = await res.json().catch(() => null);
    if (!Array.isArray(body?.history)) return null;
    if (gen !== histGen) return null;
    if (body.recentOnly) return body.history;
    remember(histMemo, Number(id), { at: Date.now(), list: body.history }, HIST_MEMO_MAX);
    keepHist(Number(id));
    return body.history;
  }

  // Rhythia's map list with its own filters (the same names it keeps in the address).
  const mapsKey = q => `maps:${JSON.stringify(q)}`;
  async function maps(q, signal) {
    const r = await post('getBeatmaps', {
      page: q.page, textFilter: q.filter, authorFilter: q.author, tagsFilter: q.tags, minStars: q.minStars, maxStars: q.maxStars,
      status: q.status, sort: q.sort, sortDirection: q.dir, showExplicit: q.explicit, session: session(),
    }, signal);
    const data = {
      fetchedAt: new Date().toISOString(), total: r.total || 0, perPage: r.viewPerPage || 50,
      maps: (r.beatmaps || []).map(b => ({ ...slimMap(b), status: b.status, qualified: Boolean(b.qualified), explicit: Boolean(b.explicit), tags: b.tags || '', hash: b.mapHash })),
    };
    return keepPage(mapsKey(q), data);
  }
  const mapsSnapshot = q => pageSnapshot(mapsKey(q));

  // Rhythia's skin explorer: rhs packages, cursors, notes, playfield borders and colorsets.
  const SKIN_TYPES = ['rhs', 'cursor', 'note', 'border', 'colorset'];
  const skinsKey = q => `skins:${JSON.stringify(q)}`;
  const skinQuery = (q, type, page, perPage) => ({
    assetType: type, page, itemsPerPage: perPage, sort: q.sort, sortDirection: q.dir,
    ...(q.search ? { search: q.search } : {}), ...(q.owner ? { ownerId: Number(q.owner) } : {}),
  });
  async function skins(q, signal) {
    const r = await post('getSkinAssets', skinQuery(q, q.type, q.page, 24), signal);
    return keepPage(skinsKey(q), { fetchedAt: new Date().toISOString(), total: r.total || 0, perPage: r.itemsPerPage || 24, assets: r.assets || [] });
  }
  const skinsSnapshot = q => pageSnapshot(skinsKey(q));
  // How many of each kind match the same search and uploader, for the counts on the type tabs.
  const countMemo = new Map();
  async function skinCounts(q, signal) {
    const key = JSON.stringify([q.search, q.owner]), hit = countMemo.get(key);
    if (hit && Date.now() - hit.at < 5 * 60e3) return hit.counts;
    const totals = await Promise.all(SKIN_TYPES.map(t => post('getSkinAssets', skinQuery(q, t, 1, 1), signal).then(r => r.total || 0, () => null)));
    const counts = Object.fromEntries(SKIN_TYPES.map((t, i) => [t, totals[i]]));
    remember(countMemo, key, { at: Date.now(), counts });
    return counts;
  }
  async function deleteSkin(assetId) {
    const r = await post('deleteSkinAsset', { session: needSession(), assetId });
    countMemo.clear(); dropPages(k => k.startsWith('skins:'));
    return r;
  }

  // Rhythia's clan leaderboard, with the same names it keeps in the address (mode, q, sort, page).
  const clansKey = q => `clans:${JSON.stringify(q)}`;
  const slimClan = c => ({ id: c.id, rank: c.rank, name: c.name, acronym: c.acronym || '', avatar: c.avatar_url, description: c.description || '', members: c.member_count, rp: c.total_skill_points, trophies: c.trophy_count || 0 });
  async function clans(q, signal) {
    const r = await post('getClans', { page: q.page, mode: q.mode, query: q.q, sort: q.sort }, signal);
    return keepPage(clansKey(q), { fetchedAt: new Date().toISOString(), total: r.totalItems || 0, perPage: r.viewPerPage || 25, clans: (r.clanData || []).map(slimClan) });
  }
  const clansSnapshot = q => pageSnapshot(clansKey(q));

  // One clan: its details, every member (Rhythia pages them by ten) and the first page of its top scores.
  const slimClanScore = s => ({
    id: s.id, rp: s.awarded_sp, misses: s.misses, notes: s.beatmapNotes, acc: s.misses == null || !s.beatmapNotes ? null : (1 - s.misses / s.beatmapNotes) * 100,
    mods: s.mods || [], speed: s.speed || 1, spin: Boolean(s.spin), at: s.created_at, userId: s.userId, username: s.username, avatar: s.userAvatarUrl,
    mapId: s.beatmapPageId, title: s.beatmapTitle, difficulty: s.beatmapDifficulty,
  });
  const slimMember = u => ({ id: u.id, username: u.username, avatar: u.avatar_url, flag: u.flag, rp: u.skill_points || 0, plays: u.play_count || 0, badges: u.badges || [], verified: Boolean(u.verified) });
  async function clanPage(id, mode, signal) {
    const s = session(), ask = (memberPage, scorePage = 1) => post('getClan', { id: Number(id), session: s || '', mode, memberPage, scorePage }, signal);
    const r = await ask(1);
    // A member page that failed leaves the list short: shown, but not saved.
    let short = false;
    const more = await Promise.all(Array.from({ length: Math.min(5, (r.memberTotalPages || 1) - 1) }, (_, i) => ask(i + 2).then(x => x.users || [], () => { short = true; return []; })));
    const data = {
      fetchedAt: new Date().toISOString(), id: r.id, name: r.name, acronym: r.acronym || '', avatar: r.avatar_url, description: r.description || '',
      owner: r.owner, created: r.created_at, mode: r.mode, canInvite: Boolean(r.canInvite), stats: r.stats || {},
      friends: (r.relationships?.friends || []).map(x => x.clan), rivals: (r.relationships?.rivals || []).map(x => x.clan),
      members: [...(r.users || []), ...more.flat()].map(slimMember), memberTotal: r.memberTotal || 0,
      scores: (r.topScores || []).map(slimClanScore), scoreTotal: r.topScoreTotal || 0, scorePages: r.topScoreTotalPages || 1,
    };
    return short ? data : keepPage(`clan:${id}:${mode}`, data);
  }
  const clanSnapshot = (id, mode) => pageSnapshot(`clan:${id}:${mode}`);
  async function clanScores(id, mode, page, signal) {
    const r = await post('getClan', { id: Number(id), session: '', mode, memberPage: 1, scorePage: page }, signal);
    return (r.topScores || []).map(slimClanScore);
  }
  // Where a clan stands on each of the leaderboard's sorts: a search by its name keeps the leaderboard's own rank.
  async function clanRanks(clan, mode, signal) {
    const sorts = ['trophies', 'avg-rp', 'total-rp'];
    const ranks = await Promise.all(sorts.map(sort => post('getClans', { page: 1, mode, query: clan.name, sort }, signal)
      .then(r => (r.clanData || []).find(c => c.id === clan.id)?.rank || null, () => null)));
    return Object.fromEntries(sorts.map((k, i) => [k, ranks[i]]));
  }

  // Community collections: the public list (three maps or more) or a player's own ones.
  const collectionsKey = q => `collections:${JSON.stringify(q)}`;
  async function collections(q, ownerId, signal) {
    const r = await post('getCollections', { itemsPerPage: 30, page: q.page, session: session() || '', search: q.search, ...(ownerId ? { owner: Number(ownerId) } : { minBeatmaps: 3 }) }, signal);
    const list = (r.collections || []).map(c => ({
      id: c.id, title: c.title || '', description: c.description || '', ownerId: c.owner, owner: c.ownerUsername, avatar: c.ownerAvatarUrl,
      maps: c.beatmapCount || 0, spread: (c.starRatingDistribution || []).map(x => x.count || 0), at: c.createdAt,
    }));
    const data = { fetchedAt: new Date().toISOString(), pages: r.totalPages || 1, collections: list };
    return ownerId ? data : keepPage(collectionsKey(q), data);
  }
  const collectionsSnapshot = q => pageSnapshot(collectionsKey(q));
  // One collection with all of its maps (Rhythia pages them by 30; up to 300 are read).
  async function collection(id, signal) {
    const s = session() || '', ask = page => post('getCollection', { session: s, collection: Number(id), page, itemsPerPage: 30 }, signal);
    const r = await ask(1);
    let short = false;
    const more = await Promise.all(Array.from({ length: Math.min(9, (r.totalPages || 1) - 1) }, (_, i) => ask(i + 2).then(x => x.collection?.beatmaps || [], () => { short = true; return []; })));
    const c = r.collection || {};
    const maps = [...(c.beatmaps || []), ...more.flat()].map(b => ({ ...slimMap(b), status: b.status, file: b.beatmapFile, img: b.previewImage?.medium || b.image }));
    const data = {
      fetchedAt: new Date().toISOString(), id: Number(id), title: c.title || '', description: c.description || '', isList: Boolean(c.isList),
      owner: { id: c.owner?.id, username: c.owner?.username, avatar: c.owner?.avatar_url }, count: c.beatmapCount ?? maps.length, maps,
    };
    return short ? data : keepPage(`collection:${id}`, data);
  }
  const collectionSnapshot = id => pageSnapshot(`collection:${id}`);
  // The collection's saved copy still lists the map, so it goes too.
  async function removeFromCollection(id, mapId) {
    const r = await post('deleteCollectionMap', { session: needSession(), collection: Number(id), beatmapPage: Number(mapId) });
    dropPages(k => k === `collection:${id}`);
    return r;
  }

  // Rhythia's changelog streams (public game releases and the website).
  async function changelog(type, skip = 0, limit = 50, signal) {
    const r = await post('getChangelog', { type, skip, limit }, signal);
    return (Array.isArray(r) ? r : []).map(e => ({ id: e.id, type: e.type, date: e.date, markdown: e.markdown || '' }));
  }

  async function comments(mapId, signal) {
    const r = await post('getBeatmapComments', { page: Number(mapId) }, signal);
    return (r.comments || []).map(c => ({ id: c.id, userId: c.owner, username: c.profiles?.username, avatar: c.profiles?.avatar_url, badges: c.profiles?.badges || [], text: String(c.content || ''), at: c.created_at }));
  }
  async function postComment(mapId, content) {
    const s = needSession();
    await post('postBeatmapComment', { session: s, content, page: Number(mapId) });
  }

  async function forget(id) {
    forgotAt[id] = Date.now();
    await snaps.remove(id);
  }

  // Map art for more of a profile's scores (its Spin and VR lists), asked for when they are shown.
  const mapMetaFor = (ids, signal) => mapMetaAll([...new Set(ids)], signal);
  const onHistoryChange = fn => { historyListeners.push(fn); };

  return { load, stale, mapMetaFor, mapStyles, storedStyles, snapshot, forget, post, session, composeAboutMe, actions, account, cachedSelf, knownSelf, viewerTag, searchShowcase, loadHome, homeSnapshot, leaderboard, board, boardSnapshot, histories, historiesCached, historyAllowed, onHistoryChange, signedIn, mapPage, scorePage, pageSnapshot, historyOf, maps, mapsSnapshot, comments, postComment, skins, skinsSnapshot, skinCounts, deleteSkin, clans, clansSnapshot, clanPage, clanSnapshot, clanScores, clanRanks, collections, collectionsSnapshot, collection, collectionSnapshot, removeFromCollection, changelog };
})();
