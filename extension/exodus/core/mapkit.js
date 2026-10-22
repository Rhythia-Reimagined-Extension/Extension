// =============================================
// Reimagined for Rhythia — Exodus map kit
// =============================================
// Reads a Rhythia map file (.sspm v1 and v2, .rhm) and describes how the map plays:
// streams, jumps, off-grid notes and density over time.

var RhythiaX = RhythiaX || {};

RhythiaX.ExodusMapKit = (function () {
  'use strict';

  /* ── Map file ── */
  function parse(buf) {
    const v = new DataView(buf), u8 = new Uint8Array(buf);
    if (v.byteLength < 8 || v.getUint32(0, true) !== 0x6d2b5353) throw new Error('Not a Rhythia map file');
    const version = v.getUint16(4, true);
    if (version === 2) return parseV2(v, u8);
    if (version === 1) return parseV1(v, u8);
    throw new Error(`Map file version ${version} is not supported`);
  }

  function parseV2(v, u8) {
    let o = 10;
    const u16 = () => { const x = v.getUint16(o, true); o += 2; return x; };
    const u32 = () => { const x = v.getUint32(o, true); o += 4; return x; };
    const u64 = () => { const x = Number(v.getBigUint64(o, true)); o += 8; return x; };
    const str = (long = false) => { const n = long ? u32() : u16(); const s = new TextDecoder().decode(u8.subarray(o, o + n)); o += n; return s; };
    o += 20; // hash
    u32(); u32(); // last marker, note count
    const markerCount = u32();
    o += 3; // difficulty, rating
    const hasAudio = u8[o++] === 1;
    o += 2; // cover, requires mod
    const p = {}; for (const k of ['cd', 'cdl', 'audio', 'audioLen', 'cover', 'coverLen', 'defs', 'defsLen', 'markers', 'markersLen']) p[k] = u64();
    const title = (str(), str());
    const audio = hasAudio && p.audio && p.audioLen ? u8.slice(p.audio, p.audio + p.audioLen) : null;
    return {title, notes: markersV2(v, u8, p.defs, p.markers, markerCount), audio};
  }

  // The marker definitions and the markers of a v2 file; offsets are relative to the bytes given.
  function markersV2(v, u8, defsAt, markersAt, markerCount) {
    let o = defsAt;
    const u16 = () => { const x = v.getUint16(o, true); o += 2; return x; };
    const u32 = () => { const x = v.getUint32(o, true); o += 4; return x; };
    const str = () => { const n = u16(); o += n; };
    const defs = [];
    for (let i = 0, n = u8[o++]; i < n; i++) {
      str();
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
        case 8: case 9: o += u16(); return; case 10: case 11: o += u32(); return;
        default: throw new Error('Unknown marker field');
      }
    };
    o = markersAt;
    const notes = [];
    for (let i = 0; i < markerCount; i++) {
      const ms = u32(), type = u8[o++], types = defs[type];
      if (!types) throw new Error('Unknown marker type');
      // As in Rhythia's reader: notes are the first marker type, placed by their first field.
      types.forEach((t, j) => {
        if (type === 0 && j === 0 && t === 7) { const [x, y] = pos(); notes.push([ms, x, y]); } else skip(t);
      });
    }
    notes.sort((a, b) => a[0] - b[0]);
    return notes;
  }

  function parseV1(v, u8) {
    let o = 8;
    const line = () => { let e = o; while (e < u8.length && u8[e] !== 10) e++; const s = new TextDecoder().decode(u8.subarray(o, e)); o = e + 1; return s; };
    line(); const title = line(); line();
    o += 4; const count = v.getUint32(o, true); o += 5;
    const cover = u8[o++];
    if (cover === 2) { o += 8 + Number(v.getBigUint64(o, true)); } else if (cover !== 0) throw new Error('Unsupported cover');
    let audio = null;
    const hasAudio = u8[o++];
    if (hasAudio === 1) { const n = Number(v.getBigUint64(o, true)); o += 8; audio = u8.slice(o, o + n); o += n; } else if (hasAudio !== 0) throw new Error('Unsupported audio');
    const notes = [];
    for (let i = 0; i < count; i++) {
      const ms = v.getUint32(o, true), kind = u8[o + 4]; o += 5;
      if (kind === 0) { notes.push([ms, u8[o], u8[o + 1]]); o += 2; } else { notes.push([ms, v.getFloat32(o, true), v.getFloat32(o + 4, true)]); o += 8; }
    }
    notes.sort((a, b) => a[0] - b[0]);
    return {title, notes, audio};
  }

  // Rhythia's newer .rhm files are zip archives; the notes are JSON in the entry named "map".
  const ZIP = 0x04034b50;
  // Limits, so a broken or hostile file cannot make the page download or unpack too much.
  const PART_MAX = 4 << 20, WHOLE_MAX = 48 << 20, JSON_MAX = 16 << 20;
  async function inflate(raw) {
    const reader = new Blob([raw]).stream().pipeThrough(new DecompressionStream('deflate-raw')).getReader(), parts = [];
    let size = 0;
    for (;;) {
      const {done, value} = await reader.read();
      if (done) break;
      size += value.length;
      if (size > JSON_MAX) { reader.cancel().catch(() => {}); throw new Error('Map file notes are too large'); }
      parts.push(value);
    }
    const out = new Uint8Array(size);
    let at = 0;
    for (const p of parts) { out.set(p, at); at += p.length; }
    return out;
  }
  async function rhm(head, get) {
    const v = head.v, u8 = head.u8;
    for (let o = 0; o + 30 <= v.byteLength && v.getUint32(o, true) === ZIP;) {
      const method = v.getUint16(o + 8, true), size = v.getUint32(o + 18, true), nameLen = v.getUint16(o + 26, true), extra = v.getUint16(o + 28, true);
      const name = new TextDecoder().decode(u8.subarray(o + 30, o + 30 + nameLen)), at = o + 30 + nameLen + extra;
      if (name === 'map') {
        if (!size) throw new Error('Map file entry without a size');
        let raw = at + size <= u8.length ? u8.slice(at, at + size) : null;
        if (!raw) { if (!get) throw new Error('Map file is cut short'); raw = (await get(at, at + size - 1)).u8; }
        if (method === 8) raw = await inflate(raw);
        else if (method !== 0) throw new Error('Unsupported map file compression');
        const notes = (JSON.parse(new TextDecoder().decode(raw)).Notes || []).map(n => [n.Time, n.X, n.Y]);
        return notes.sort((a, b) => a[0] - b[0]);
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

  // Only the notes, read in parts: the header says where they are, so the audio (most of the
  // file) is never downloaded. A server that ignores Range simply sends the whole file.
  async function notesOnly(url, signal) {
    const get = async (a, b) => {
      if (!(b >= a) || b - a + 1 > PART_MAX) throw new Error('Map file part is too large');
      const r = await fetch(url, {headers: {Range: `bytes=${a}-${b}`}, signal});
      if (!r.ok) throw new Error(`Map file: HTTP ${r.status}`);
      // A server that ignores Range sends the whole file: fine for a normal map, not for a huge one.
      if (r.status === 200 && Number(r.headers?.get?.('content-length')) > WHOLE_MAX) { r.body?.cancel?.().catch(() => {}); throw new Error('Map file is too large'); }
      const buf = await r.arrayBuffer();
      return {whole: r.status === 200, buf, v: new DataView(buf), u8: new Uint8Array(buf)};
    };
    const head = await get(0, 1023);
    if (head.whole) return head.v.getUint32(0, true) === ZIP ? rhm(head) : parse(head.buf).notes;
    const v = head.v;
    if (v.byteLength >= 30 && v.getUint32(0, true) === ZIP) return rhm(head, get);
    if (v.byteLength < 8 || v.getUint32(0, true) !== 0x6d2b5353) throw new Error('Not a Rhythia map file');
    const version = v.getUint16(4, true);
    if (version === 2) {
      const markerCount = v.getUint32(38, true), at = k => Number(v.getBigUint64(48 + k * 8, true));
      const defs = at(6), markers = at(8), from = Math.min(defs, markers), to = Math.max(defs + at(7), markers + at(9)) - 1;
      const part = await get(from, to);
      return part.whole ? parse(part.buf).notes : markersV2(part.v, part.u8, defs - from, markers - from, markerCount);
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
    const nv = body.v, notes = [];
    for (let i = 0, p = 0; i < count && p + 7 <= body.u8.length; i++) {
      const ms = nv.getUint32(p, true), kind = body.u8[p + 4]; p += 5;
      if (kind === 0) { notes.push([ms, body.u8[p], body.u8[p + 1]]); p += 2; } else { notes.push([ms, nv.getFloat32(p, true), nv.getFloat32(p + 4, true)]); p += 8; }
    }
    return notes.sort((a, b) => a[0] - b[0]);
  }

  /* ── How the map plays ── */
  // Grid: the positions a map really uses. Many maps stretch the grid (for example −0.15, 1, 2.15
  // instead of 0, 1, 2), so a position counts as on the grid when the map uses it often.
  // Off-grid (quantum) notes are the ones placed anywhere else.
  const LEVEL_SHARE = .03;
  const r2 = v => Math.round(v * 100) / 100;
  function levels(notes, k) {
    const count = new Map();
    for (const n of notes) { const v = r2(n[k]); count.set(v, (count.get(v) || 0) + 1); }
    return new Set([...count].filter(([, c]) => c >= notes.length * LEVEL_SHARE).map(([v]) => v));
  }
  // The distance between neighbouring grid positions, so moves are measured in this map's cells.
  function spacing(xs, ys) {
    const gaps = [];
    for (const set of [xs, ys]) { const v = [...set].sort((a, b) => a - b); for (let i = 1; i < v.length; i++) if (v[i] - v[i - 1] >= .5) gaps.push(v[i] - v[i - 1]); }
    if (!gaps.length) return 1;
    gaps.sort((a, b) => a - b);
    return gaps[gaps.length >> 1];
  }

  // Streams: runs of at least six fast notes (150 ms apart or closer at 1×) with an even rhythm.
  // Jumps: slower notes that move a cell or more. Other: slower notes with small moves.
  const FAST_MS = 150, RUN_MIN = 6, EVEN = .35, JUMP_CELLS = 1;
  function analyse(notes, durationMs) {
    const end = Math.max(durationMs || 0, notes.length ? notes[notes.length - 1][0] : 0);
    if (notes.length < 2) return {notes: notes.length, duration: end, zones: [], share: {Stream: 0, Jump: 0, Other: 0}, offGrid: 0, cell: 1, avgNps: 0, peakNps: 0, curve: [], longestStream: null, fastestStream: 0};
    // Notes at the same moment count as one hit.
    const ev = [];
    for (const n of notes) { const last = ev[ev.length - 1]; if (last && n[0] - last.t < 2) last.n++; else ev.push({t: n[0], x: n[1], y: n[2], n: 1}); }
    const xs = levels(notes, 1), ys = levels(notes, 2), cell = spacing(xs, ys);
    const offGrid = notes.filter(n => !xs.has(r2(n[1])) || !ys.has(r2(n[2]))).length / notes.length;
    const step = ev.slice(1).map((e, i) => ({dt: e.t - ev[i].t, d: Math.hypot(e.x - ev[i].x, e.y - ev[i].y) / cell}));
    const label = step.map(s => (s.dt > FAST_MS && s.d >= JUMP_CELLS ? 'Jump' : 'Other'));
    for (let i = 0; i < step.length;) {
      if (step[i].dt > FAST_MS) { i++; continue; }
      let j = i + 1;
      while (j < step.length && step[j].dt <= FAST_MS && Math.abs(step[j].dt - step[i].dt) <= step[i].dt * EVEN) j++;
      if (j - i >= RUN_MIN - 1) for (let k = i; k < j; k++) label[k] = 'Stream';
      i = j;
    }
    // Sections: each step covers the time between its two notes; a short non-stream bit joins the one before.
    const zones = [];
    for (let i = 0; i < step.length; i++) {
      const z = zones[zones.length - 1];
      if (z && z.kind === label[i]) { z.end = ev[i + 1].t; z.steps++; } else zones.push({kind: label[i], start: ev[i].t, end: ev[i + 1].t, steps: 1});
    }
    for (let i = zones.length - 1; i > 0; i--) {
      const z = zones[i], prev = zones[i - 1];
      if (z.steps < 3 && z.kind !== 'Stream' && prev.kind !== 'Stream') { prev.end = z.end; prev.steps += z.steps; zones.splice(i, 1); }
    }
    for (let i = zones.length - 1; i > 0; i--) if (zones[i].kind === zones[i - 1].kind) { zones[i - 1].end = zones[i].end; zones[i - 1].steps += zones[i].steps; zones.splice(i, 1); }
    let e0 = 0;
    for (const z of zones) {
      while (e0 < ev.length && ev[e0].t < z.start) e0++;
      let n = 0;
      for (let k = e0; k < ev.length && ev[k].t <= z.end; k++) n += ev[k].n;
      z.notes = n; z.nps = n > 1 ? (n - 1) / Math.max(.001, (z.end - z.start) / 1000) : 0; z.type = z.kind;
    }
    // Shares count notes, not time: a fast stream holds many notes in a short time.
    const share = {Stream: 0, Jump: 0, Other: 0};
    label.forEach((k, i) => { share[k] += ev[i + 1].n; });
    for (const k in share) share[k] /= Math.max(1, ev.length - 1 + notes.length - ev.length);
    let peak = 0;
    for (let i = 0, j = 0; i < notes.length; i++) { while (notes[i][0] - notes[j][0] > 1000) j++; peak = Math.max(peak, i - j + 1); }
    const bins = Math.max(1, Math.ceil(end / 500)), curve = new Array(bins).fill(0);
    for (const [t] of notes) curve[Math.min(bins - 1, Math.floor(t / 500))]++;
    const streams = zones.filter(z => z.kind === 'Stream');
    const longest = streams.reduce((m, z) => (!m || z.end - z.start > m.end - m.start ? z : m), null);
    const played = (notes[notes.length - 1][0] - notes[0][0]) / 1000;
    return {
      notes: notes.length, duration: end, zones, share, offGrid, cell,
      avgNps: played > 0 ? notes.length / played : 0, peakNps: peak,
      curve: curve.map((_, i) => ((curve[i - 1] || 0) * .25 + curve[i] * .5 + (curve[i + 1] || 0) * .25) * 2),
      longestStream: longest, fastestStream: streams.reduce((m, z) => Math.max(m, z.nps), 0),
    };
  }

  // Short tags from the numbers.
  function style(a) {
    if (!a || !a.notes) return [];
    const s = a.share, tags = [];
    if (s.Stream >= .55) tags.push({k: 'stream', label: 'Streams', tip: `${Math.round(s.Stream * 100)}% of the notes are in streams`});
    else if (s.Jump >= .55) tags.push({k: 'jump', label: 'Jumps', tip: `${Math.round(s.Jump * 100)}% of the notes are jumps`});
    else tags.push({k: 'other', label: 'Varied', tip: `Notes: streams ${Math.round(s.Stream * 100)}%, jumps ${Math.round(s.Jump * 100)}%, other ${Math.round(s.Other * 100)}%`});
    if (a.offGrid >= .3) tags.push({k: 'quantum', label: 'Quantum', tip: `${Math.round(a.offGrid * 100)}% of the notes sit off the map’s grid`});
    if (a.longestStream && a.longestStream.end - a.longestStream.start >= 15000) tags.push({k: 'stamina', label: 'Long streams', tip: `The longest stream lasts ${Math.round((a.longestStream.end - a.longestStream.start) / 1000)} s`});
    return tags;
  }

  // One word per map for summaries: off-grid maps are Quantum, then the note share decides.
  function kind(a) {
    if (!a || !a.notes) return null;
    if (a.offGrid >= .3) return 'quantum';
    return a.share.Stream >= .55 ? 'stream' : a.share.Jump >= .55 ? 'jump' : 'varied';
  }

  // Reads a map's notes once per page view; the map page and a score page use it.
  const files = new Map();
  function load(url, signal) {
    if (!files.has(url)) {
      const p = notesOnly(url, signal).then(notes => ({notes, analysis: analyse(notes)}));
      p.catch(() => files.delete(url));
      files.set(url, p);
      while (files.size > 3) files.delete(files.keys().next().value);
    }
    return files.get(url);
  }

  return {parse, analyse, style, kind, load, notesOnly};
})();
