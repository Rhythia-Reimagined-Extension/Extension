// =============================================
// Reimagined for Rhythia — link with the Atlas app
// =============================================
// Atlas for Rhythia (Shuriel's desktop app) listens on this computer only (ws://127.0.0.1, the first free port of
// PORTS). Pairing is once: the popup's Connect shows a short code, Atlas asks the player with the same code and
// gives back a random token, kept here (TOKEN_KEY, never in backups). Later the background connects by itself
// with the token whenever "Install in Atlas" is on and Atlas runs: at browser start, on a Rhythia page or the
// popup, and every RETRY_MS while it is awake. Connected, "Install in Atlas" goes straight to Atlas instead of
// through the browser's "Open Atlas?" question (shared/atlas-link.js).
//
// Paired, Exodus also asks Atlas which maps are in the game (a map page, a collection page), adds maps to Atlas collections, and shows the player's
// scores from the game (their best pass of each map) on their own profile and on map pages. Those scores are kept
// only in the browser's session storage (SCORES_KEY: gone when the browser closes, never in backups, never sent
// anywhere) and are dropped as soon as the player turns them off, disconnects or turns Install in Atlas off.
//
// It needs no extension permission: a WebSocket to this computer is not a host permission. What goes to Atlas:
// the browser's name, this version, the token, the number of a map or collection the player clicked or opened, the
// numbers of the maps of a collection page they opened, on their own profile with online history the way their top
// compares with players ranked near them (map hashes and numbers only),
// a collection name the player typed, and the player's Rhythia name (to pick their scores in the game's
// database). Nothing else about the player's Rhythia account: no session, token or password.

var RhythiaX = RhythiaX || {};

RhythiaX.AtlasBridge = (function () {
  'use strict';

  // Atlas listens on the same ports, in the same order (Atlas src-tauri/src/bridge.rs PORTS).
  const PORTS = [47231, 47232, 47233];
  const TOKEN_KEY = 'rhythiaxAtlasToken';
  const RETRY_MS = 20 * 1000;
  const PING_MS = 20 * 1000;
  const ANSWER_MS = 5000;
  const OPEN_MS = 3000;
  // No 0/O or 1/I: the player compares the code by eye.
  const CODE_LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const SCORES_KEY = 'rhythiaxAtlasScores';
  const SCORES_MS = 10 * 60 * 1000;
  const SCORES_WAIT_MS = 30 * 1000;
  // Answers larger than this are not Atlas' (the scores of 100,000 maps are about 15 MB).
  const MAX_ANSWER = 24 * 1024 * 1024;
  const KINDS = ['jump', 'stream', 'tech', 'varied'];
  const STATUSES = ['RANKED', 'APPROVED', 'UNRANKED'];

  let ws = null;
  let state = 'off'; // off | unpaired | pairing | waiting | connected | denied
  let code = '';
  let note = '';
  let atlas = '';
  let busy = false;
  let retryTimer = null;
  let pingTimer = null;
  let paired = false; // a token is kept
  const waiting = new Map(); // map or collection id -> resolve of install()
  let rid = 0;
  const asking = new Map(); // request number -> resolve of request()
  let memo = null; // the scores last read: { name, at, maps }

  const browserName = () => {
    const ua = navigator.userAgent;
    if (/Firefox\//.test(ua)) return 'firefox';
    if (/Edg\//.test(ua)) return 'edge';
    if (/OPR\//.test(ua)) return 'opera';
    if (navigator.brave) return 'brave';
    return 'chrome';
  };

  async function settings() {
    const got = await chrome.storage.local.get(['rhythiaxModules', 'rhythiaxExodusOptions', TOKEN_KEY]);
    const token = typeof got[TOKEN_KEY] === 'string' && /^[0-9a-f]{64}$/.test(got[TOKEN_KEY]) ? got[TOKEN_KEY] : '';
    paired = Boolean(token);
    // exodus.atlasScores in shared/settings/schema.js: 'online' keeps the game's scores out.
    const source = ['online', 'both', 'game'].includes(got.rhythiaxExodusOptions?.atlasScores) ? got.rhythiaxExodusOptions.atlasScores : 'both';
    return { on: got.rhythiaxModules?.atlasLinks === true, token, scores: source !== 'online' };
  }

  async function dropScores() {
    memo = null;
    try { await chrome.storage.session?.remove(SCORES_KEY); } catch (_) {}
  }

  function stop() {
    clearTimeout(retryTimer);
    clearInterval(pingTimer);
    retryTimer = pingTimer = null;
    if (ws) { const old = ws; ws = null; try { old.close(); } catch (_) {} }
    for (const done of waiting.values()) done({ ok: false });
    waiting.clear();
    for (const done of asking.values()) done(null);
    asking.clear();
  }

  function later() {
    clearTimeout(retryTimer);
    retryTimer = setTimeout(wake, RETRY_MS);
  }

  // Opens the first port Atlas answers on and says hello; resolves when the socket closes or fails.
  function open(hello) {
    return new Promise(resolve => {
      let i = 0;
      const next = () => {
        if (i >= PORTS.length) { resolve(false); return; }
        const port = PORTS[i++];
        let sock;
        try { sock = new WebSocket(`ws://127.0.0.1:${port}`); } catch (_) { next(); return; }
        let opened = false, failed = false;
        const fail = () => { if (opened || failed) return; failed = true; clearTimeout(timer); try { sock.close(); } catch (_) {} next(); };
        // A port that neither opens nor fails in time counts as closed.
        const timer = setTimeout(fail, OPEN_MS);
        sock.onopen = () => {
          if (failed) return;
          opened = true;
          clearTimeout(timer);
          ws = sock;
          sock.send(JSON.stringify(hello));
          resolve(true);
        };
        sock.onerror = fail;
        sock.onmessage = e => heard(e.data);
        sock.onclose = () => {
          if (!opened) return;
          if (ws === sock) { ws = null; closed(); }
        };
      };
      next();
    });
  }

  function heard(data) {
    let m;
    const text = String(data);
    if (text.length > MAX_ANSWER) return;
    try { m = JSON.parse(text); } catch (_) { return; }
    if (Number.isInteger(m?.rid) && asking.has(m.rid)) {
      const done = asking.get(m.rid);
      asking.delete(m.rid);
      done(m);
      return;
    }
    if (m?.t === 'welcome') {
      paired = true;
      if (typeof m.token === 'string' && /^[0-9a-f]{64}$/.test(m.token)) chrome.storage.local.set({ [TOKEN_KEY]: m.token }).catch(() => {});
      state = 'connected';
      code = note = '';
      atlas = String(m.atlas || '').slice(0, 20);
      clearInterval(pingTimer);
      // Messages keep the background awake while connected.
      pingTimer = setInterval(() => { try { ws?.send('{"t":"ping"}'); } catch (_) {} }, PING_MS);
    } else if (m?.t === 'session-ask') {
      // Sign in with Reimagined in Atlas (or Atlas renewing it): the sign-in of an open rhythia.com tab.
      session().then(r => { if (!r.ok && r.missing) { try { ws?.send('{"t":"session-missing"}'); } catch (_) {} } });
    } else if (m?.t === 'pending') {
      state = 'pairing';
    } else if (m?.t === 'unpaired') {
      chrome.storage.local.remove(TOKEN_KEY).catch(() => {});
      paired = false;
      state = 'unpaired';
      note = 'Atlas no longer knows this browser (the pairing was removed in Atlas). Press Connect to pair again.';
      stop();
      dropScores();
    } else if (m?.t === 'denied') {
      state = 'denied';
      note = String(m.text || '').slice(0, 200);
      code = '';
      stop();
    } else if (['installed', 'opened', 'error'].includes(m?.t) && waiting.has(m.id)) {
      const done = waiting.get(m.id);
      waiting.delete(m.id);
      done({ ok: m.t !== 'error', answer: m.t, text: String(m.text || '').slice(0, 200), queued: m.queued, already: m.already });
    }
  }

  function closed() {
    clearInterval(pingTimer);
    pingTimer = null;
    for (const done of waiting.values()) done({ ok: false });
    waiting.clear();
    for (const done of asking.values()) done(null);
    asking.clear();
    // Atlas closed, or the pairing stopped half way: the next try finds out which (wake).
    state = 'waiting';
    code = '';
    later();
  }

  // Connects when it should and is not connected yet. Called often; cheap when there is nothing to do.
  async function wake() {
    if (busy || ws) return status();
    busy = true;
    try {
      const { on, token } = await settings();
      if (!on) { state = 'off'; stop(); return status(); }
      if (!token) { if (state !== 'denied') state = 'unpaired'; return status(); }
      const reached = await open({ t: 'hello', v: 1, browser: browserName(), version: chrome.runtime.getManifest().version, token });
      if (!reached) { state = 'waiting'; later(); }
    } catch (_) {
      later();
    } finally {
      busy = false;
    }
    return status();
  }

  // The popup's Connect: a new code, then Atlas asks the player.
  async function pair() {
    const { on } = await settings();
    if (!on) return { ...status(), note: 'Turn on Install in Atlas first.' };
    stop();
    const bytes = crypto.getRandomValues(new Uint8Array(4));
    code = [...bytes].map(b => CODE_LETTERS[b % CODE_LETTERS.length]).join('');
    note = '';
    state = 'pairing';
    const reached = await open({ t: 'hello', v: 1, browser: browserName(), version: chrome.runtime.getManifest().version, code });
    if (!reached) { state = 'waiting'; code = ''; note = 'Atlas is not running. Start it, then press Connect again.'; }
    return status();
  }

  // Disconnect: connected, Atlas drops the pairing too (otherwise it stays listed there until Connect replaces it).
  async function forget() {
    if (state === 'connected' && ws) { try { ws.send('{"t":"forget"}'); } catch (_) {} }
    await chrome.storage.local.remove(TOKEN_KEY);
    paired = false;
    stop();
    await dropScores();
    state = 'unpaired';
    code = note = '';
    return status();
  }

  // A click on "Install in Atlas" in a Rhythia tab.
  function install(kind, id) {
    const n = Number(id);
    if (state !== 'connected' || !ws || !['map', 'collection'].includes(kind) || !Number.isInteger(n) || n <= 0 || n >= 1e10) {
      return Promise.resolve({ ok: false });
    }
    return new Promise(resolve => {
      const timer = setTimeout(() => { waiting.delete(n); resolve({ ok: false }); }, ANSWER_MS);
      waiting.set(n, answer => { clearTimeout(timer); resolve(answer); });
      try { ws.send(JSON.stringify({ t: 'install', kind, id: n })); } catch (_) { waiting.delete(n); clearTimeout(timer); resolve({ ok: false }); }
    });
  }

  // A question to Atlas with a number its answer repeats; null when not connected, on no answer or (unless
  // withErrors) a refusal.
  function request(msg, ms = ANSWER_MS, withErrors = false) {
    if (state !== 'connected' || !ws) return Promise.resolve(null);
    const r = rid = (rid % 1e6) + 1;
    return new Promise(resolve => {
      const timer = setTimeout(() => { asking.delete(r); resolve(null); }, ms);
      asking.set(r, m => { clearTimeout(timer); resolve(m && (withErrors || m.t !== 'error') ? m : null); });
      try { ws.send(JSON.stringify({ ...msg, rid: r })); } catch (_) { asking.delete(r); clearTimeout(timer); resolve(null); }
    });
  }

  const num = (v, min, max) => (typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max ? v : null);
  const short = (v, max) => (typeof v === 'string' ? v.slice(0, max) : null);
  // Atlas' answer checked like any other outside data: known fields, types and sizes only.
  function cleanPass(x) {
    const id = num(x?.id, 1, 1e10);
    if (!Number.isInteger(id)) return null;
    return {
      id,
      rp: num(x.rp, 0, 1e5),
      acc: num(x.acc, 0, 100),
      miss: Number.isInteger(x.miss) && x.miss >= 0 ? x.miss : null,
      at: short(x.at, 40),
      speed: num(x.speed, 0.1, 10),
      mods: Array.isArray(x.mods) ? x.mods.filter(m => typeof m === 'string').slice(0, 20).map(m => m.slice(0, 40)) : [],
      n: Number.isInteger(x.n) && x.n > 0 ? x.n : 1,
      stars: num(x.stars, 0, 100),
      status: STATUSES.includes(x.status) ? x.status : null,
      kind: KINDS.includes(x.kind) ? x.kind : null,
      quantum: x.quantum === true,
    };
  }

  // The player's best pass of each map in the game: { ok, maps, at } or { ok: false, why }. Kept for SCORES_MS,
  // so pages opened one after another ask Atlas once.
  async function scores(name) {
    const who = String(name || '').trim().slice(0, 100), key = who.toLowerCase();
    if (!who) return { ok: false, why: 'name' };
    const set = await settings();
    if (!set.on || !set.token) return { ok: false, why: 'off' };
    if (!set.scores) { await dropScores(); return { ok: false, why: 'off' }; }
    let kept = memo;
    if (!kept) { try { kept = (await chrome.storage.session?.get(SCORES_KEY))?.[SCORES_KEY] || null; } catch (_) {} }
    const mine = kept && kept.name === key && Array.isArray(kept.maps) ? kept : null;
    if (mine && Date.now() - mine.at < SCORES_MS) return { ok: true, maps: mine.maps, at: mine.at };
    if (state !== 'connected') await wake();
    const m = await request({ t: 'scores', name: who }, SCORES_WAIT_MS);
    if (m?.t !== 'scores' || !Array.isArray(m.maps)) {
      return mine ? { ok: true, maps: mine.maps, at: mine.at } : { ok: false, why: state === 'connected' ? 'failed' : 'offline' };
    }
    const maps = m.maps.slice(0, 100000).map(cleanPass).filter(Boolean);
    memo = { name: key, at: Date.now(), maps };
    try { await chrome.storage.session?.set({ [SCORES_KEY]: memo }); } catch (_) {}
    return { ok: true, maps, at: memo.at };
  }

  // A map page: whether the map is in the game and the player's best pass of it (when scores are on).
  async function mapInfo(id, name) {
    const n = Number(id);
    const out = { paired, connected: state === 'connected', inGame: null, best: null };
    if (!Number.isInteger(n) || n <= 0 || n >= 1e10 || state !== 'connected') return out;
    const h = await request({ t: 'have', ids: [n] });
    if (h?.t === 'have' && Array.isArray(h.ids)) out.inGame = h.ids.includes(n);
    if (name) {
      const s = await scores(name);
      if (s.ok) out.best = s.maps.find(x => x.id === n) || null;
    }
    return out;
  }

  // Which of these maps are in the game (a collection page): { paired, connected, ids } with ids null when Atlas
  // could not be asked. Asked 300 at a time (Atlas' MAX_HAVE), at most 3,000 maps.
  async function inGame(list) {
    const want = [...new Set((Array.isArray(list) ? list : []).map(Number).filter(n => Number.isInteger(n) && n > 0 && n < 1e10))].slice(0, 3000);
    const out = { paired, connected: state === 'connected', ids: null };
    if (!out.connected) return out;
    const found = [];
    for (let i = 0; i < want.length; i += 300) {
      const part = want.slice(i, i + 300);
      const h = await request({ t: 'have', ids: part });
      if (h?.t !== 'have' || !Array.isArray(h.ids)) return out;
      found.push(...h.ids.filter(n => part.includes(n)));
    }
    out.ids = found;
    return out;
  }

  // Near your rank for Atlas: the player's own top as the history service compares it with players ranked near
  // them, by map hash (place among them, how many, the group's level, the middle player's RP and accuracy). No
  // names, no keys. Atlas keeps it in memory only. { ok, kept } or { ok: false }.
  const NEAR_LEVELS = ['below', 'at', 'above'];
  async function near(list) {
    if (state !== 'connected' || !Array.isArray(list)) return { ok: false };
    const maps = list.slice(0, 200).map(x => {
      const hash = typeof x?.hash === 'string' && /^[0-9a-f]{64}$/i.test(x.hash) ? x.hash.toLowerCase() : null;
      const of = Number.isInteger(x?.of) && x.of >= 2 && x.of <= 1e5 ? x.of : null;
      const place = Number.isInteger(x?.place) && of && x.place >= 1 && x.place <= of ? x.place : null;
      if (!hash || !place) return null;
      return { hash, place, of, level: NEAR_LEVELS.includes(x.level) ? x.level : null, rpMid: num(x.rpMid, 0, 1e5), accMid: num(x.accMid, 0, 100) };
    }).filter(Boolean);
    const m = await request({ t: 'near', maps });
    return m?.t === 'near' ? { ok: true, kept: num(m.kept, 0, 200) ?? 0 } : { ok: false };
  }

  // The Atlas collections, for "Add to an Atlas collection": [{ id, name, maps }] or null.
  async function collections() {
    const m = await request({ t: 'collections' });
    if (m?.t !== 'collections' || !Array.isArray(m.list)) return null;
    return m.list.slice(0, 500).map(c => ({ id: num(c?.id, 1, 1e9), name: short(c?.name, 80) || '', maps: num(c?.maps, 0, 1e6) || 0 }))
      .filter(c => Number.isInteger(c.id));
  }

  // Adds a map to an Atlas collection (by id, or by a name, made when it does not exist): { ok, name, added } or { ok: false }.
  async function collect(msg) {
    const id = Number(msg?.id), cid = Number(msg?.collection);
    if (!Number.isInteger(id) || id <= 0 || id >= 1e10) return { ok: false };
    const name = typeof msg?.name === 'string' ? msg.name.trim().slice(0, 80) : '';
    const ask = { t: 'collect', id, title: String(msg?.title || '').slice(0, 300), mapper: String(msg?.mapper || '').slice(0, 100) };
    if (Number.isInteger(cid) && cid > 0) ask.collection = cid; else if (name) ask.name = name; else return { ok: false };
    const m = await request(ask);
    return m?.t === 'collected' ? { ok: true, name: short(m.name, 80) || name, added: m.added === true } : { ok: false };
  }

  const status = () => ({ state, code, note, atlas, paired });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    const m = changes.rhythiaxModules;
    if (m && m.oldValue?.atlasLinks !== m.newValue?.atlasLinks) { stop(); state = 'off'; dropScores(); wake(); }
    const o = changes.rhythiaxExodusOptions;
    if (o && o.newValue?.atlasScores === 'online' && o.oldValue?.atlasScores !== 'online') dropScores();
  });
  chrome.runtime.onStartup?.addListener(() => { wake(); });
  wake();

  // Sign in with Reimagined, asked by Atlas over the paired connection (session-ask): the Rhythia sign-in of
  // an open rhythia.com tab, read there by shared/rhythia-session.js, sent to Atlas once. Atlas asks only after
  // the player clicked Sign in with Reimagined there, or to renew that sign-in, and keeps it in the Windows
  // password store; nothing is kept here. { ok, name } or { ok: false, why, missing }.
  async function session() {
    if (state !== 'connected') return { ok: false, why: 'Atlas is not connected.' };
    const tabs = await chrome.tabs.query({ url: ['https://www.rhythia.com/*', 'https://rhythia.com/*'] }).catch(() => []);
    for (const tab of tabs) {
      let value = '';
      try {
        await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['shared/rhythia-session.js'] });
        const [got] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: () => (typeof RhythiaX !== 'undefined' && RhythiaX.RhythiaSession?.token?.()) || '' });
        value = typeof got?.result === 'string' ? got.result : '';
      } catch (_) { continue; }
      if (value.length < 40 || value.length > 2560 || value.split('.').length !== 3) continue;
      const m = await request({ t: 'session', session: value }, ANSWER_MS * 2, true);
      value = '';
      if (m?.t === 'signed-in') return { ok: true, name: short(m.name, 60) || '' };
      return { ok: false, why: short(m?.text, 200) || 'Atlas did not answer.' };
    }
    return { ok: false, missing: true, why: 'Open rhythia.com in a tab and sign in there first.' };
  }

  // "Install missing" on a map list: Atlas asks in its own window (at most 100 maps, one page). { ok, maps }.
  async function installList(list) {
    const ids = [...new Set((Array.isArray(list) ? list : []).map(Number).filter(n => Number.isInteger(n) && n > 0 && n < 1e10))].slice(0, 100);
    if (!ids.length || state !== 'connected') return { ok: false };
    const m = await request({ t: 'install-list', ids });
    return m?.t === 'asked' ? { ok: true, maps: num(m.maps, 0, 100) ?? 0 } : { ok: false };
  }

  return { wake, pair, forget, install, installList, status, scores, mapInfo, inGame, near, collections, collect, session, PORTS };
})();
