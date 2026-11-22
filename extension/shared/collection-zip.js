// =============================================
// Reimagined for Rhythia — Download all for a collection
// =============================================
// Saves every map of a collection in .zip files, for Exodus' collection page and Classic's (both use it).
// Rhythia's own Download all packs the whole collection into one compressed .zip in the tab's memory: a big
// collection (757 maps, about 4 GB) stops at "Creating zip file: 50%", and it names every file .sspm, while the
// game picks how to read a map by its extension, so a .rhm saved as .sspm is refused when dragged into Rhythia.
// Here each file keeps its own extension (.rhm or .sspm, from its address), files are stored as they are (map
// files are compressed already), and a collection is saved in parts of at most PART_MAX bytes, each saved as soon
// as it is full, so the tab never holds more than one part. Requests go through RhythiaX.Net.fetch (Rhythia's
// budget: its file host included). No DOM but the link that saves a part; no chrome.*.

var RhythiaX = RhythiaX || {};

RhythiaX.CollectionZip = RhythiaX.CollectionZip || (function () {
  'use strict';

  const API = 'https://production.rhythia.com/api/';
  // Bytes in one .zip: below 4 GB (no ZIP64 needed) and small enough for a tab to hold.
  const PART_MAX = 1.5e9;
  // Rhythia answers up to 100 maps a page of a collection.
  const PAGE = 100;
  // Map files fetched at once (RhythiaX.Net keeps every tab within Rhythia's own budget besides).
  const AHEAD = 4;
  // A part's saved link is let go after this long (the download has started by then).
  const LINK_KEEP_MS = 60e3;

  const TABLE = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c >>> 0;
    }
    return t;
  })();
  function crc32(bytes) {
    let c = 0xFFFFFFFF;
    for (let i = 0; i < bytes.length; i++) c = TABLE[(c ^ bytes[i]) & 255] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  }

  // Made on first use, so loading the file needs nothing but plain JavaScript.
  let utf8 = null;
  const encode = text => (utf8 ||= new TextEncoder()).encode(text);
  // A file name Windows, macOS and Linux all accept.
  const safeName = (text, fallback) => String(text || '').replace(/[\\/:*?"<>|\u0000-\u001f]+/g, ' ').replace(/\s+/g, ' ').trim()
    .replace(/[. ]+$/, '').slice(0, 120) || fallback;
  // The map format the game reads, from the file's address.
  const extOf = url => (/\.(rhm|sspm)(?=$|[?#])/i.exec(String(url || '')) || [])[1]?.toLowerCase() || '';

  async function post(name, body, signal) {
    const res = await RhythiaX.Net.fetch(API + name, {
      method: 'POST', headers: { 'Content-Type': 'text/plain;charset=UTF-8' }, body: JSON.stringify(body), signal,
    });
    if (!res.ok) throw new Error(`${name}: HTTP ${res.status}`);
    const json = await res.json();
    if (json?.error) throw new Error(`${name}: ${json.error}`);
    return json;
  }

  // Every map of the collection with a file: {title, file}, in the collection's order, and its title.
  async function listMaps(id, session, signal) {
    const maps = [];
    let title = '', pages = 1;
    for (let page = 1; page <= pages; page++) {
      const r = await post('getCollection', { session: session || '', collection: Number(id), page, itemsPerPage: PAGE }, signal);
      title = title || r.collection?.title || '';
      pages = Math.max(1, Number(r.totalPages) || 1);
      for (const b of r.collection?.beatmaps || []) maps.push({ title: b.title || '', file: b.beatmapFile || '' });
    }
    return { title, maps };
  }

  // One .zip being filled: files stored as they are, names in UTF-8, local headers and the central directory.
  function zipPart() {
    const pieces = [], central = [];
    let offset = 0, count = 0, centralSize = 0;
    const le = (view, at, value, bytes) => (bytes === 2 ? view.setUint16(at, value, true) : view.setUint32(at, value, true));
    return {
      size: () => offset,
      count: () => count,
      add(name, bytes) {
        const nameBytes = encode(name), crc = crc32(bytes), size = bytes.length;
        const local = new DataView(new ArrayBuffer(30));
        le(local, 0, 0x04034b50, 4); le(local, 4, 20, 2); le(local, 6, 0x0800, 2); le(local, 8, 0, 2);
        le(local, 10, 0, 2); le(local, 12, 0x21, 2); le(local, 14, crc, 4); le(local, 18, size, 4); le(local, 22, size, 4);
        le(local, 26, nameBytes.length, 2); le(local, 28, 0, 2);
        const head = new DataView(new ArrayBuffer(46));
        le(head, 0, 0x02014b50, 4); le(head, 4, 20, 2); le(head, 6, 20, 2); le(head, 8, 0x0800, 2); le(head, 10, 0, 2);
        le(head, 12, 0, 2); le(head, 14, 0x21, 2); le(head, 16, crc, 4); le(head, 20, size, 4); le(head, 24, size, 4);
        le(head, 28, nameBytes.length, 2); le(head, 30, 0, 2); le(head, 32, 0, 2); le(head, 34, 0, 2); le(head, 36, 0, 2);
        le(head, 38, 0, 4); le(head, 42, offset, 4);
        // The file goes into a Blob at once, so the browser may keep it outside the page's memory.
        pieces.push(local.buffer, nameBytes, new Blob([bytes]));
        central.push(head.buffer, nameBytes);
        offset += 30 + nameBytes.length + size;
        centralSize += 46 + nameBytes.length;
        count++;
      },
      blob() {
        const end = new DataView(new ArrayBuffer(22));
        le(end, 0, 0x06054b50, 4); le(end, 4, 0, 2); le(end, 6, 0, 2); le(end, 8, count, 2); le(end, 10, count, 2);
        le(end, 12, centralSize, 4); le(end, 16, offset, 4); le(end, 20, 0, 2);
        return new Blob([...pieces, ...central, end.buffer], { type: 'application/zip' });
      },
    };
  }

  function save(blob, name) {
    const url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = name; a.style.display = 'none';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), LINK_KEEP_MS);
  }

  // download({id, session, signal, onStep}) saves the collection and answers {maps, saved, failed, parts}. With
  // maps ([{title, file}]) instead of id, it saves those maps (Exodus' Select) under name.zip.
  // onStep({phase, done, total, part}): phase 'list' (reading the collection), 'files' (done of total maps
  // fetched) or 'save' (part number being saved). failed: titles of the maps whose file could not be fetched.
  async function download({ id, maps: given, title: givenTitle = '', name = '', session = '', signal, onStep = () => {} } = {}) {
    onStep({ phase: 'list', done: 0, total: 0, part: 0 });
    const { title, maps } = given ? { title: givenTitle, maps: given } : await listMaps(id, session, signal);
    const withFile = maps.filter(m => extOf(m.file));
    const failed = maps.filter(m => !extOf(m.file)).map(m => m.title || 'Untitled map');
    const base = name ? safeName(name, 'maps') : `${safeName(title, 'collection')}-collection`;
    const used = new Set();
    const nameFor = m => {
      const stem = safeName(m.title, 'map'), ext = extOf(m.file);
      let name = `${stem}.${ext}`;
      for (let n = 2; used.has(name.toLowerCase()); n++) name = `${stem} (${n}).${ext}`;
      used.add(name.toLowerCase());
      return name;
    };
    const fetchFile = async m => {
      try {
        const res = await RhythiaX.Net.fetch(m.file, { signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return new Uint8Array(await res.arrayBuffer());
      } catch (err) {
        if (err?.name === 'AbortError') throw err;
        return null;
      }
    };

    let part = zipPart(), parts = 0, saved = 0, done = 0;
    const flush = () => {
      if (!part.count()) return;
      parts++;
      onStep({ phase: 'save', done, total: withFile.length, part: parts });
      save(part.blob(), `${base}${parts > 1 || done < withFile.length ? `-part-${parts}` : ''}.zip`);
      part = zipPart();
    };
    onStep({ phase: 'files', done: 0, total: withFile.length, part: 0 });
    // A few files are fetched ahead; each goes into the .zip in the collection's order.
    const queue = withFile.map((m, i) => (i < AHEAD ? fetchFile(m) : null));
    for (let i = 0; i < withFile.length; i++) {
      if (signal?.aborted) throw signal.reason || new DOMException('Aborted', 'AbortError');
      if (i + AHEAD < withFile.length) queue[i + AHEAD] = fetchFile(withFile[i + AHEAD]);
      const bytes = await queue[i];
      queue[i] = null;
      done++;
      if (bytes) {
        if (part.count() && part.size() + bytes.length > PART_MAX) flush();
        part.add(nameFor(withFile[i]), bytes);
        saved++;
      } else failed.push(withFile[i].title || 'Untitled map');
      onStep({ phase: 'files', done, total: withFile.length, part: parts });
    }
    flush();
    return { title, maps: maps.length, saved, failed, parts };
  }

  return { download, extOf, safeName, crc32, zipPart };
})();
