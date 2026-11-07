// =============================================
// Reimagined for Rhythia — the history service client both looks share
// =============================================
// The history service's map and comparison requests as both looks make them: map types in chunks, the map types
// saved in Rhythia's site storage, how a player's top compares with the players ranked near them, how one map
// plays, and Reimagined Search. Each look passes its own request function (RhythiaX.Net.fetch, so the request
// budgets stay the same) and signal, and keeps its own consent check, memo and wording around these; nothing here
// reads the player's choice.

var RhythiaX = RhythiaX || {};

RhythiaX.VpsClient = RhythiaX.VpsClient || (function () {
  'use strict';

  const API = 'https://rhythia.shuriel.com/api/';
  // How long a request may take in all, its wait for the request budget included (shared/net.js maxWait): no page
  // waits for these, the background gives each of its requests 10 s, and the first request after online history
  // is chosen also asks for this installation's key.
  const WAIT = 20000;
  const SEND_JSON = { 'Content-Type': 'application/json', Accept: 'application/json' };

  // Map types (POST /api/maps/kinds): up to 100 keys a request, in a body under 15,000 characters. Gives back
  // key -> the service's answer for it (null for a map it has not read) for every key it answered. A failed
  // request stops there, and the rest are asked again next time; when the signal was aborted the error is thrown.
  // onChunk(answers of that request, how many answered so far) runs after each answer.
  const KINDS_BATCH = 100, KINDS_BODY = 15000;
  async function kinds(request, keys, signal, onChunk) {
    const out = new Map();
    for (let i = 0; i < keys.length;) {
      const chunk = [];
      for (let size = 12; i < keys.length && chunk.length < KINDS_BATCH && size + JSON.stringify(keys[i]).length < KINDS_BODY; i++) {
        size += JSON.stringify(keys[i]).length + 1;
        chunk.push(keys[i]);
      }
      try {
        const res = await request(API + 'maps/kinds', { method: 'POST', headers: SEND_JSON, body: JSON.stringify({ keys: chunk }), signal, maxWait: WAIT });
        if (!res.ok) break;
        const maps = (await res.json())?.maps || {}, got = new Map();
        for (const key of chunk) { got.set(key, maps[key] || null); out.set(key, maps[key] || null); }
        onChunk?.(got, out.size);
      } catch (err) {
        if (signal?.aborted) throw err;
        break;
      }
    }
    return out;
  }

  // The service's map types are kept in Rhythia's site storage in one list both looks read and write, so a type
  // either look was sent is shown by both, and neither asks again for a year (a map the service has not read: for
  // a day). The oldest go past 800 maps. An entry is [day, kind, stream %, jump %, quantum 0/1, notes per second
  // x 10, tech %]; kind -1 = not read by the service yet.
  const SAVED_KEY = 'rhythiax_exodus_styles5', SAVED_DAYS = 365, SAVED_FAIL_DAYS = 1, SAVED_MAX = 800;
  const KINDS = ['stream', 'jump', 'varied', 'tech'];
  const day = () => Math.floor(Date.now() / 864e5);
  const readSaved = () => { try { return JSON.parse(localStorage.getItem(SAVED_KEY) || '{}') || {}; } catch (_) { return {}; } };
  const fresh = e => Array.isArray(e) && day() - e[0] < (e[1] < 0 ? SAVED_FAIL_DAYS : SAVED_DAYS);
  // An entry as a map's style ({ kind, stream, jump, quantum, nps, tech }), or null for a map not read yet.
  const styleOf = e => (e[1] < 0 || !KINDS[e[1]] ? null : { kind: KINDS[e[1]], stream: e[2] / 100, jump: e[3] / 100, quantum: e[4] === 1, nps: e[5] / 10, tech: (e[6] || 0) / 100 });
  const pct = v => Math.round((Number(v) || 0) * 100);
  const entryOf = s => (s && KINDS.includes(s.kind)
    ? [day(), KINDS.indexOf(s.kind), pct(s.stream), pct(s.jump), s.quantum ? 1 : 0, Math.round((Number(s.nps) || 0) * 10), pct(s.tech)]
    : [day(), -1, 0, 0, 0, 0, 0]);
  // Saves answers as kinds() gives them and returns key -> the entry saved.
  function save(answers) {
    const entries = new Map();
    for (const [key, s] of answers) entries.set(key, entryOf(s));
    if (!entries.size) return entries;
    try {
      const list = readSaved();
      for (const [key, e] of entries) list[key] = e;
      const keys = Object.keys(list);
      if (keys.length > SAVED_MAX) keys.sort((a, b) => list[a][0] - list[b][0]).slice(0, keys.length - SAVED_MAX).forEach(k => delete list[k]);
      localStorage.setItem(SAVED_KEY, JSON.stringify(list));
    } catch (_) {}
    return entries;
  }

  // How a player's current top compares with the players ranked near them (GET /api/player/:id/compare, mode lock,
  // spin or vr): the service's answer, { available: false, reason: 'unknown' } for a player it has no top for, or
  // null when it could not be read. keep(answer) runs only for an answer the service sent, for the look's memo.
  async function compare(request, id, mode, signal, keep) {
    try {
      const res = await request(`${API}player/${id}/compare?mode=${mode}`, { headers: { Accept: 'application/json' }, signal, maxWait: WAIT });
      if (res.status === 404) return { available: false, reason: 'unknown' };
      if (!res.ok) return null;
      const body = await res.json();
      if (!body || typeof body !== 'object') return null;
      keep?.(body);
      return body;
    } catch (_) {
      return null;
    }
  }

  // How one map plays (POST /api/maps/plays with its key, and its number when there is one). Gives back the
  // response: each look reads its status in its own way.
  function plays(request, key, id, signal) {
    const num = Number(id);
    return request(API + 'maps/plays', { method: 'POST', headers: SEND_JSON, body: JSON.stringify(num > 0 ? { key, id: num } : { key }), signal, maxWait: WAIT });
  }

  // What a refusal or a failure of the service means, for each look to say in its own words: an Error whose reason
  // is busy (429: too many requests of this kind for now), key (403: this browser has no access key for the service
  // yet), status (any other answer that is not ok; status says which) or unexpected (an answer of the wrong shape).
  // answer(res) gives back the JSON of an answer that is ok.
  const failed = (reason, status) => Object.assign(new Error(status ? `History service: HTTP ${status}` : 'History service: unexpected answer'), { reason, status });
  async function answer(res) {
    if (res.status === 429) throw failed('busy', 429);
    if (res.status === 403) throw failed('key', 403);
    if (!res.ok) throw failed('status', res.status);
    return res.json();
  }

  // Reimagined Search (Ranked and Qualified maps only): what it filters by, with the note and points shown above its
  // results (GET /api/maps/types), and one page of results for a search the look puts together (POST
  // /api/maps/search). Each gives back the service's answer or throws as answer() does; a request that could not be
  // made throws as the request function did.
  async function searchTypes(request, signal) {
    const body = await answer(await request(API + 'maps/types', { method: 'GET', headers: { Accept: 'application/json' }, signal, maxWait: WAIT }));
    if (!Array.isArray(body?.types) || !Array.isArray(body?.statuses)) throw failed('unexpected');
    return body;
  }
  async function search(request, query, signal) {
    return answer(await request(API + 'maps/search', { method: 'POST', headers: SEND_JSON, body: JSON.stringify(query), signal, maxWait: WAIT }));
  }

  return { API, WAIT, KINDS, kinds, readSaved, fresh, styleOf, save, compare, plays, answer, searchTypes, search };
})();
