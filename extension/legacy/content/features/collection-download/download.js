// =============================================
// Reimagined for Rhythia — Classic: Download all on a collection
// =============================================
// Rhythia's own Download all button on /collections/:id saves the collection through shared/collection-zip.js
// instead of Rhythia's code: each map keeps its own extension, so every file can be dragged into Rhythia, and a big
// collection comes in .zip parts of at most 1.5 GB instead of stopping half way. The steps show in a Classic notice
// card (shared/notices.js). A collection of more than BIG_COLLECTION maps asks first. Nothing happens while Exodus
// shows the page or Classic is idle.

var RhythiaX = RhythiaX || {};

(function () {
  'use strict';
  if (RhythiaX.ClassicCollectionDownload || typeof document === 'undefined') return;

  // Map files are about 5 MB each (measured on two collections, 2026-11-21); parts hold up to 1.5 GB.
  const BIG_COLLECTION = 150, MB_PER_MAP = 5.5, PART_MB = 1500;
  // The finished card stays this long.
  const DONE_MS = 10e3;
  const running = new Set();
  const fmt = n => Number(n || 0).toLocaleString('en-US');
  const sizeOf = maps => { const mb = maps * MB_PER_MAP; return mb < 1000 ? `${Math.max(10, Math.round(mb / 10) * 10)} MB` : `${(mb / 1000).toFixed(1)} GB`; };

  async function countOf(id) {
    const res = await RhythiaX.Net.fetch('https://production.rhythia.com/api/getCollection', {
      method: 'POST', headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
      body: JSON.stringify({ session: '', collection: id, page: 1, itemsPerPage: 1 }),
    });
    const json = res.ok ? await res.json() : null;
    return Number(json?.collection?.beatmapCount) || 0;
  }

  function run(id, card) {
    running.add(id);
    card.setBusy(true);
    card.setStatus('Reading the collection…');
    RhythiaX.CollectionZip.download({ id, onStep: st => {
      if (st.phase === 'files') card.setStatus(`Downloading ${fmt(st.done)} of ${fmt(st.total)}…`);
      else if (st.phase === 'save') card.setStatus(st.done < st.total || st.part > 1 ? `Saving part ${st.part}…` : 'Saving the .zip…');
    } }).then(r => {
      const f = r.failed.length;
      if (!r.saved && !f) return 'This collection has no maps to download.';
      const what = !r.saved ? 'No maps could be downloaded.'
        : r.parts > 1 ? `${fmt(r.saved)} maps are in your downloads, in ${r.parts} .zip files.`
        : `The .zip with ${fmt(r.saved)} ${r.saved === 1 ? 'map' : 'maps'} is in your downloads.`;
      return `${what}${r.saved && f ? ` ${fmt(f)} ${f === 1 ? 'map' : 'maps'} could not be downloaded.` : ''}`;
    }, err => `Download all stopped: ${String(err?.message || err).replace(/^\w+: /, '')}`).then(message => {
      running.delete(id);
      card.setStatus(message);
      setTimeout(() => card.close(), DONE_MS);
    });
  }

  async function start(id) {
    if (running.has(id) || !RhythiaX.Notices || !RhythiaX.CollectionZip) return;
    const count = await countOf(id).catch(() => 0);
    const big = count > BIG_COLLECTION, parts = Math.ceil(count * MB_PER_MAP / PART_MB);
    let card = null;
    card = RhythiaX.Notices.show({
      id: `collection-download-${id}`,
      label: 'Download all',
      title: big ? `Download ${fmt(count)} maps?` : 'Downloading the collection',
      body: big
        ? [`That is about ${sizeOf(count)}${parts > 1 ? `, saved in about ${parts} .zip files of up to 1.5 GB` : ''}. It takes a while${parts > 1 ? ', and your browser may ask whether this site may download several files' : ''}.`,
          'Every map keeps its own file type, so each one can be dragged into Rhythia.']
        : ['Every map keeps its own file type, so each one can be dragged into Rhythia.'],
      actions: big
        ? [{ text: 'Download', kind: 'primary', run: () => run(id, card) }, { text: 'Cancel', run: () => card.close() }]
        : [{ text: 'Hide', run: () => card.close() }],
    });
    if (!big) run(id, card);
  }

  // Before Rhythia's own handler: a click on its Download all button on a collection page.
  window.addEventListener('click', event => {
    const id = Number(/^\/collections\/(\d+)\/?$/.exec(location.pathname)?.[1]);
    if (!id || !event.isTrusted || RhythiaX.exodusShowing?.() || RhythiaX.ClassicIdle?.isSuspended?.()) return;
    const button = event.target.closest?.('#root button');
    if (!button || button.textContent.trim() !== 'Download all') return;
    event.preventDefault();
    event.stopImmediatePropagation();
    start(id);
  }, true);

  RhythiaX.ClassicCollectionDownload = { start };
})();
