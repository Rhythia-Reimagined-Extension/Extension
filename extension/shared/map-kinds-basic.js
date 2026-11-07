// =============================================
// Reimagined for Rhythia — map types without online history
// =============================================
// When a player chose This device and turned on "Map types without online history" (popup, rhythiaxMapKindsOffline),
// both looks work out a map's type here, in the browser, from Rhythia's own map file: Jumps, Streams or Varied, and
// whether it has quantum parts. These are the public 1.4.0 rules (the map is read in pieces of 16 moves), named a
// little more carefully: a main kind needs 55% of the notes and a lead of 25 points, and a map whose moves keep
// changing speed is Varied, since only Reimagined's history service tells Techs. Measured against the service on
// 4,657 maps (6 Nov 2026): the same type on 86%, Varied on 12%, another type on 2%, a stream never called a jump.
// Types worked out here are kept apart from the service's (their own key) and are always shown as approximate.
// Both looks load this file: it is defined once a page, so a page Exodus hands to Classic keeps its queue and rest.

var RhythiaX = RhythiaX || {};

RhythiaX.MapKindsBasic = RhythiaX.MapKindsBasic || (function () {
  'use strict';

  /* ── The map file: only the notes ([ms, x, y]), read in parts so the audio is never downloaded ── */
  const SSPM = 0x6d2b5353, ZIP = 0x04034b50;
  // Limits, so a broken or hostile file cannot make the page download or unpack too much.
  const PART_MAX = 4 << 20, WHOLE_MAX = 48 << 20, JSON_MAX = 16 << 20;
  const onRhythia = url => /^https:\/\/([a-z0-9-]+\.)*rhythia\.com\//i.test(String(url || ''));
  const byTime = notes => notes.sort((a, b) => a[0] - b[0]);

  // The marker definitions and the markers of a v2 file; offsets are relative to the bytes given.
  function markersV2(v, u8, defsAt, markersAt, markerCount) {
    let o = defsAt;
    const u16 = () => { const x = v.getUint16(o, true); o += 2; return x; };
    const u32 = () => { const x = v.getUint32(o, true); o += 4; return x; };
    const defs = [];
    for (let i = 0, n = u8[o++]; i < n; i++) {
      const nameLen = u16(); o += nameLen;
      const types = []; for (let j = 0, m = u8[o++]; j < m; j++) types.push(u8[o++]);
      if (u8[o++] !== 0) throw new Error('Broken marker definitions');
      defs.push(types);
    }
    const pos = () => {
      const kind = u8[o++];
      if (kind === 0) { const x = u8[o], y = u8[o + 1]; o += 2; return [x, y]; }
      if (kind === 1) { const x = v.getFloat32(o, true), y = v.getFloat32(o + 4, true); o += 8; return [x, y]; }
      throw new Error('Broken note position');
    };
    const skip = t => {
      switch (t) {
        case 0: return;
        case 1: o += 1; return; case 2: o += 2; return; case 3: o += 4; return; case 4: o += 8; return;
        case 5: o += 4; return; case 6: o += 8; return; case 7: pos(); return;
        // A text or bytes field: its length, then that many bytes (the length is read before o moves on).
        case 8: case 9: { const n = u16(); o += n; return; } case 10: case 11: { const n = u32(); o += n; return; }
        default: throw new Error('Unknown marker field');
      }
    };
    o = markersAt;
    const notes = [];
    for (let i = 0; i < markerCount; i++) {
      const ms = u32(), type = u8[o++], types = defs[type];
      if (!types) throw new Error('Unknown marker type');
      // As in Rhythia's reader: notes are the first marker type, placed by their first field.
      types.forEach((t, j) => { if (type === 0 && j === 0 && t === 7) { const [x, y] = pos(); notes.push([ms, x, y]); } else skip(t); });
    }
    return byTime(notes);
  }
  // A whole .sspm file (a server that ignored the Range request sent all of it).
  function wholeSspm(buf) {
    const v = new DataView(buf), u8 = new Uint8Array(buf);
    if (v.byteLength < 8 || v.getUint32(0, true) !== SSPM) throw new Error('Not a Rhythia map file');
    const version = v.getUint16(4, true);
    if (version === 2) {
      const at = k => Number(v.getBigUint64(48 + k * 8, true));
      return markersV2(v, u8, at(6), at(8), v.getUint32(38, true));
    }
    if (version !== 1) throw new Error(`Map file version ${version} is not supported`);
    let o = 8;
    for (let i = 0; i < 3; i++) { while (o < u8.length && u8[o] !== 10) o++; o++; }
    o += 4; const count = v.getUint32(o, true); o += 5;
    const cover = u8[o++];
    if (cover === 2) o += 8 + Number(v.getBigUint64(o, true)); else if (cover !== 0) throw new Error('Unsupported cover');
    const audio = u8[o++];
    if (audio === 1) o += 8 + Number(v.getBigUint64(o, true)); else if (audio !== 0) throw new Error('Unsupported audio');
    return v1Notes(v, u8, o, count);
  }
  function v1Notes(v, u8, o, count) {
    const notes = [];
    for (let i = 0; i < count && o + 7 <= u8.length; i++) {
      const ms = v.getUint32(o, true), kind = u8[o + 4]; o += 5;
      if (kind === 0) { notes.push([ms, u8[o], u8[o + 1]]); o += 2; } else { notes.push([ms, v.getFloat32(o, true), v.getFloat32(o + 4, true)]); o += 8; }
    }
    return byTime(notes);
  }

  async function readAll(stream, max, tooLarge) {
    const reader = stream.getReader(), parts = [];
    let size = 0;
    for (;;) {
      const {done, value} = await reader.read();
      if (done) break;
      size += value.length;
      if (size > max) { reader.cancel().catch(() => {}); throw new Error(tooLarge); }
      parts.push(value);
    }
    const out = new Uint8Array(size);
    let at = 0;
    for (const p of parts) { out.set(p, at); at += p.length; }
    return out;
  }
  // Rhythia's newer .rhm files are zip archives; the notes are JSON in the entry named "map".
  async function rhm(head, get) {
    const v = head.v, u8 = head.u8;
    for (let o = 0; o + 30 <= v.byteLength && v.getUint32(o, true) === ZIP;) {
      const method = v.getUint16(o + 8, true), size = v.getUint32(o + 18, true), nameLen = v.getUint16(o + 26, true), extra = v.getUint16(o + 28, true);
      const name = new TextDecoder().decode(u8.subarray(o + 30, o + 30 + nameLen)), at = o + 30 + nameLen + extra;
      if (name === 'map') {
        if (!size) throw new Error('Map file entry without a size');
        let raw = at + size <= u8.length ? u8.slice(at, at + size) : null;
        if (!raw) { if (!get) throw new Error('Map file is cut short'); raw = (await get(at, at + size - 1)).u8; }
        if (method === 8) raw = await readAll(new Blob([raw]).stream().pipeThrough(new DecompressionStream('deflate-raw')), JSON_MAX, 'Map file notes are too large');
        else if (method !== 0) throw new Error('Unsupported map file compression');
        return byTime((JSON.parse(new TextDecoder().decode(raw)).Notes || []).map(n => [n.Time, n.X, n.Y]));
      }
      // Entries are stored one after another; the next header is only read if it is in the bytes we have.
      o = at + size;
      if (o + 30 > v.byteLength) {
        if (!get) break;
        const next = await get(o, o + 1023);
        return rhm({v: next.v, u8: next.u8}, (a, b) => get(o + a, o + b));
      }
    }
    throw new Error('No notes in the map file');
  }

  async function notesOnly(url, signal) {
    if (!onRhythia(url)) throw new Error('Map file is not on Rhythia');
    const get = async (a, b) => {
      if (!(b >= a) || b - a + 1 > PART_MAX) throw new Error('Map file part is too large');
      // Through the extension's budget for Rhythia (shared/net.js), shared with its API requests and every tab.
      const r = await (RhythiaX.Net?.fetch || fetch)(url, {headers: {Range: `bytes=${a}-${b}`}, signal});
      if (!r.ok) throw Object.assign(new Error(`Map file: HTTP ${r.status}`), {status: r.status});
      // A server that ignores Range sends the whole file: fine for a normal map, not for a huge one.
      const whole = r.status === 200, max = whole ? WHOLE_MAX : b - a + 1, tooLarge = whole ? 'Map file is too large' : 'Map file part is too large';
      if (Number(r.headers?.get?.('content-length')) > max) { r.body?.cancel?.().catch(() => {}); throw new Error(tooLarge); }
      const u8 = r.body?.getReader ? await readAll(r.body, max, tooLarge) : new Uint8Array(await r.arrayBuffer());
      if (u8.length > max) throw new Error(tooLarge);
      return {whole, buf: u8.buffer, v: new DataView(u8.buffer), u8};
    };
    const head = await get(0, 1023);
    if (head.whole) return head.v.getUint32(0, true) === ZIP ? rhm(head) : wholeSspm(head.buf);
    const v = head.v;
    if (v.byteLength >= 30 && v.getUint32(0, true) === ZIP) return rhm(head, get);
    if (v.byteLength < 8 || v.getUint32(0, true) !== SSPM) throw new Error('Not a Rhythia map file');
    const version = v.getUint16(4, true);
    if (version === 2) {
      const markerCount = v.getUint32(38, true), at = k => Number(v.getBigUint64(48 + k * 8, true));
      const defs = at(6), markers = at(8), from = Math.min(defs, markers), to = Math.max(defs + at(7), markers + at(9)) - 1;
      // Up to 1 KB more than the header says: some editors write the marker block a few bytes short (map 18759: 6 bytes,
      // so its last note was cut). Markers are read by their count, so the extra bytes are never taken for notes.
      const part = await get(from, Math.min(to + 1024, from + PART_MAX - 1));
      return part.whole ? wholeSspm(part.buf) : markersV2(part.v, part.u8, defs - from, markers - from, markerCount);
    }
    if (version !== 1) throw new Error(`Map file version ${version} is not supported`);
    // v1: three text lines, the note count, the cover, then the audio and the notes.
    const u8 = head.u8;
    let o = 8;
    for (let i = 0; i < 3; i++) { while (o < u8.length && u8[o] !== 10) o++; o++; }
    if (o + 32 > u8.length) throw new Error('Map file header is too long');
    o += 4; const count = v.getUint32(o, true); o += 5;
    const cover = u8[o++];
    if (cover === 2) o += 8 + Number(v.getBigUint64(o, true)); else if (cover !== 0) throw new Error('Unsupported cover');
    const mid = await get(o, o + 8);
    let n0 = o + 1;
    if (mid.u8[0] === 1) n0 = o + 9 + Number(mid.v.getBigUint64(1, true)); else if (mid.u8[0] !== 0) throw new Error('Unsupported audio');
    const body = await get(n0, n0 + count * 13 - 1);
    return v1Notes(body.v, body.u8, 0, count);
  }

  /* ── How the map plays, in short ── */
  // Grid: the three positions per axis the map uses most (many maps stretch the 3×3 grid). Off-grid (quantum)
  // notes are the ones placed anywhere else.
  const LEVEL_SHARE = .03;
  const r2 = v => Math.round(v * 100) / 100;
  function levels(notes, k) {
    const count = new Map();
    for (const n of notes) { const v = r2(n[k]); count.set(v, (count.get(v) || 0) + 1); }
    return new Set([...count].filter(([, c]) => c >= notes.length * LEVEL_SHARE).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([v]) => v));
  }
  // The distance between neighbouring grid positions, so moves are measured in this map's cells.
  function spacing(xs, ys) {
    const gaps = [];
    for (const set of [xs, ys]) { const v = [...set].sort((a, b) => a - b); for (let i = 1; i < v.length; i++) if (v[i] - v[i - 1] >= .5) gaps.push(v[i] - v[i - 1]); }
    if (!gaps.length) return 1;
    gaps.sort((a, b) => a - b);
    const cell = gaps[gaps.length >> 1];
    return cell >= .9 && cell <= 1.2 ? cell : 1;
  }
  // Pieces of 16 moves: jump when moves are mostly longer than 1.3 cells, uneven when short moves keep changing
  // speed, stream when they are short and even. Slow pieces (intros, breaks) are left out unless most of the map
  // is slow. mix: the share of the counted notes in each kind; quantum: the share in off-grid pieces.
  const PIECE = 16, PIECE_MIN = 6, FAR = 1.3, UNEVEN = .1, OFF_PIECE = .5, SLOW_NPS = 5;
  const median = a => { if (!a.length) return 0; const b = [...a].sort((x, y) => x - y); return b[b.length >> 1]; };
  function analyse(notes) {
    if (!notes || notes.length < 2) return {notes: notes ? notes.length : 0, mix: {Stream: 0, Jump: 0, Uneven: 0}, quantum: 0};
    const ev = [];
    for (const n of notes) { const last = ev[ev.length - 1]; if (last && n[0] - last.t < 2) last.n++; else ev.push({t: n[0], x: n[1], y: n[2], n: 1}); }
    const xs = levels(notes, 1), ys = levels(notes, 2), cell = spacing(xs, ys);
    const step = ev.slice(1).map((e, i) => {
      const p = ev[i], d = Math.hypot(e.x - p.x, e.y - p.y) / cell;
      return {d, v: d / Math.max(10, e.t - p.t), off: !xs.has(r2(e.x)) || !ys.has(r2(e.y)), n: e.n};
    });
    const mix = {Stream: 0, Jump: 0, Uneven: 0}, all = {Stream: 0, Jump: 0, Uneven: 0};
    let total = 0, fast = 0, offFast = 0, offAll = 0;
    for (let i = 0; i < step.length;) {
      let j = Math.min(step.length, i + PIECE);
      if (step.length - j < PIECE_MIN) j = step.length;
      const c = step.slice(i, j), dist = median(c.filter(s => s.d > .3).map(s => s.d));
      const speed = [];
      for (let k = 1; k < c.length; k++) if (c[k].d > .3 && c[k - 1].d > .3) speed.push(Math.abs(Math.log(c[k].v / c[k - 1].v)));
      const kind = dist >= FAR ? 'Jump' : median(speed) >= UNEVEN ? 'Uneven' : 'Stream';
      const n = c.reduce((s, x) => s + x.n, 0), off = c.filter(s => s.off).length / c.length >= OFF_PIECE;
      const slow = (j - i) / Math.max(.001, (ev[j].t - ev[i].t) / 1000) < SLOW_NPS;
      all[kind] += n; total += n; offAll += off ? n : 0;
      if (!slow) { mix[kind] += n; fast += n; offFast += off ? n : 0; }
      i = j;
    }
    const useAll = fast < total * .3, counted = useAll ? total : fast;
    for (const k in mix) mix[k] = (useAll ? all[k] : mix[k]) / Math.max(1, counted);
    return {notes: notes.length, mix, quantum: (useAll ? offAll : offFast) / Math.max(1, counted)};
  }

  // The map's type: jump or stream with 55% of the notes and a lead of 25 points, otherwise varied (uneven parts
  // leading count as varied too). quantum: 20% of the notes in off-grid parts.
  const MAIN = .55, LEAD = .25, UNEVEN_LEADS = .4, QUANTUM = .2;
  function kind(a) {
    if (!a || !a.notes) return null;
    const m = a.mix, order = ['Jump', 'Stream', 'Uneven'].sort((x, y) => m[y] - m[x]);
    if (order[0] === 'Uneven' && m.Uneven >= UNEVEN_LEADS) return 'varied';
    return order[0] !== 'Uneven' && m[order[0]] >= MAIN && m[order[0]] - m[order[1]] >= LEAD ? order[0].toLowerCase() : 'varied';
  }
  const quantum = a => Boolean(a && a.notes && a.quantum >= QUANTUM);

  /* ── What this browser worked out (Rhythia's site storage, apart from the service's types) ── */
  // [day, kind (0 jump, 1 stream, 2 varied, -1 the file could not be read), quantum 0/1]; a year, a day after a failure.
  const STORE_KEY = 'rhythiax_map_kinds_basic', KINDS = ['jump', 'stream', 'varied'], DAYS = 365, FAIL_DAYS = 1, MAX = 800;
  const today = () => Math.floor(Date.now() / 864e5);
  const readStore = () => { try { const v = JSON.parse(localStorage.getItem(STORE_KEY) || '{}'); return v && typeof v === 'object' ? v : {}; } catch (_) { return {}; } };
  const fresh = e => Array.isArray(e) && today() - e[0] < (e[1] < 0 ? FAIL_DAYS : DAYS);
  const entryOf = e => (e[1] < 0 || !KINDS[e[1]] ? null : {kind: KINDS[e[1]], quantum: e[2] === 1, approximate: true});
  function writeStore(entries) {
    if (!entries.size) return;
    try {
      const list = readStore();
      for (const [id, e] of entries) list[id] = e;
      const keys = Object.keys(list);
      if (keys.length > MAX) keys.sort((a, b) => list[a][0] - list[b][0]).slice(0, keys.length - MAX).forEach(k => delete list[k]);
      localStorage.setItem(STORE_KEY, JSON.stringify(list));
    } catch (_) {}
  }
  // The types already worked out for these maps (id -> {kind, quantum, approximate}); maps that could not be read are left out.
  function stored(ids) {
    const list = readStore(), out = new Map();
    for (const id of new Set(ids)) { const e = list[id]; if (fresh(e) && entryOf(e)) out.set(id, entryOf(e)); }
    return out;
  }

  /* ── The setting ── */
  const SETTING = 'rhythiaxMapKindsOffline';
  let setting = null;
  async function enabled() {
    if (setting !== null) return setting;
    try {
      const got = await new Promise(resolve => chrome.storage.local.get([SETTING], r => resolve(chrome.runtime?.lastError ? {} : r || {})));
      setting = got[SETTING] === true;
    } catch (_) { setting = false; }
    return setting;
  }
  try {
    // Turned off: the maps still waiting are not read.
    chrome.storage.onChanged.addListener((changes, area) => { if (area === 'local' && changes[SETTING]) { setting = changes[SETTING].newValue === true; pump(); } });
  } catch (_) {}

  /* ── Reading maps, gently ── */
  // In the order they were asked for, at most two maps at once and a new one every 400 ms. Each is two or three
  // requests for parts of its file (and one for its page when its details are not saved), all through the
  // extension's budget for Rhythia (shared/net.js: 16 a second from every tab together, its API requests
  // included). A refusal or a server error stops all reading for 10 minutes, in every tab of the site.
  const AT_ONCE = 2, GAP_MS = 400, REST_MS = 10 * 60 * 1000, REST_KEY = 'rhythiax_map_kinds_basic_rest';
  let active = 0, lastStart = 0, timer = null;
  const waiting = [];
  const restUntil = () => { try { return Number(localStorage.getItem(REST_KEY)) || 0; } catch (_) { return 0; } };
  function rest() { try { localStorage.setItem(REST_KEY, String(Date.now() + REST_MS)); } catch (_) {} }
  // A map's turn: true when it may be read now, false when it is not read (the page was left, the setting was
  // turned off, or the reading rests).
  function slot(signal) {
    return new Promise(resolve => {
      waiting.push({resolve, signal});
      signal?.addEventListener?.('abort', pump, {once: true});
      pump();
    });
  }
  function pump() {
    const resting = Date.now() < restUntil();
    for (let i = waiting.length - 1; i >= 0; i--) {
      if (resting || setting === false || waiting[i].signal?.aborted) waiting.splice(i, 1)[0].resolve(false);
    }
    if (timer || !waiting.length || active >= AT_ONCE) return;
    const wait = lastStart + GAP_MS - Date.now();
    if (wait > 0) { timer = setTimeout(() => { timer = null; pump(); }, wait); return; }
    active++; lastStart = Date.now();
    waiting.shift().resolve(true);
    pump();
  }
  // A map asked for by two pages at once is read once.
  const reading = new Map();
  function readOne(id, fileOf, signal) {
    if (reading.has(id)) return reading.get(id);
    const run = (async () => {
      if (!(await slot(signal))) return undefined;
      try {
        const file = await fileOf(id, signal);
        if (!file) return [today(), -1, 0];
        const a = analyse(await notesOnly(file, signal));
        const k = kind(a);
        return k ? [today(), KINDS.indexOf(k), quantum(a) ? 1 : 0] : [today(), -1, 0];
      } catch (err) {
        if (signal?.aborted || err?.name === 'AbortError') return undefined;
        // Offline, refused or a server error: nothing is kept, and a refusal or server error rests the reading.
        if (err?.status === 429 || err?.status >= 500 || /HTTP (429|5\d\d)/.test(err?.message || '')) { rest(); return undefined; }
        if (err?.name === 'TypeError' || err?.status === 408) return undefined;
        return [today(), -1, 0];
      } finally {
        active--;
        pump();
      }
    })();
    reading.set(id, run);
    run.finally(() => { if (reading.get(id) === run) reading.delete(id); });
    return run;
  }
  // The types of these maps (id -> {kind, quantum, approximate}): saved ones at once, the rest read from their map
  // files when the setting is on. fileOf(id, signal) gives a map's file address on Rhythia (each look asks Rhythia
  // its own way). onProgress(done, total) runs after each map.
  async function kinds(ids, {signal, fileOf, onProgress} = {}) {
    const out = new Map(), todo = [];
    // With the setting off, nothing is shown, saved types included.
    if (!(await enabled())) return out;
    const list = readStore();
    for (const id of new Set(ids)) {
      if (typeof id !== 'string' && typeof id !== 'number') continue;
      const e = list[id];
      if (fresh(e)) { if (entryOf(e)) out.set(id, entryOf(e)); } else todo.push(id);
    }
    if (!todo.length || typeof fileOf !== 'function') return out;
    const known = out.size, total = known + todo.length, done = new Map();
    let finished = 0;
    await Promise.all(todo.map(id => readOne(id, fileOf, signal).then(e => {
      finished++;
      if (e) { done.set(id, e); if (entryOf(e)) out.set(id, entryOf(e)); }
      if (done.size >= 10) { writeStore(done); done.clear(); }
      onProgress?.(known + finished, total);
    })));
    writeStore(done);
    return out;
  }

  return {notesOnly, analyse, kind, quantum, stored, kinds, enabled, STORE_KEY, SETTING};
})();
