// =============================================
// Reimagined for Rhythia — Exodus collections
// =============================================
// /collections, /collections/own and /collections/:id.

var RhythiaX = RhythiaX || {};

(function () {
'use strict';
const K = () => RhythiaX.ExodusKit;
const {SITE, Data, ATLAS_MARK, esc, cssUrl, fmt, REDUCED, pager, spreadHtml, hoursMin, avgStars, morph} = RhythiaX.ExodusKit;

/* ════════════════════ Collections ════════════════════ */
// Make, change or remove a collection in the shell's dialog, with Rhythia's own fields: a name for a new one;
// name, description and Is List (a ranked list instead of a grid) for one's own; a confirm before removing.
// done(result) runs after Rhythia saved it.
function collectionDialog(R, sig, {kind, d = {}, toast, done}) {
  const {esc} = RhythiaX.ExodusKit, dlg = R.getElementById('cmp');
  const F = {title: d.title || '', description: d.description || '', isList: Boolean(d.isList), busy: false};
  const close = '<button class="iconbtn" type="button" data-cd-close aria-label="Close"><svg class="ico" aria-hidden="true"><use href="#i-x"/></svg></button>';
  const html = () => kind === 'remove'
    ? `<div class="cmp-head"><h2 id="cmp-title">Remove this collection?</h2>${close}</div><div class="cmp-body cd-body"><p>${esc(F.title)} will be removed for good, with its list of maps. The maps stay on Rhythia.</p>
      <div class="cd-acts"><button class="btn" type="button" data-cd-close>Cancel</button><button class="btn danger" type="button" data-cd-ok ${F.busy ? 'disabled' : ''}>${F.busy ? 'Removing…' : 'Remove collection'}</button></div></div>`
    : `<div class="cmp-head"><h2 id="cmp-title">${kind === 'create' ? 'New collection' : 'Edit collection'}</h2>${close}</div>
      <form class="cmp-body cd-body" id="cd-form"><label class="cd-field"><span>Name</span><input id="cd-title" maxlength="100" required value="${esc(F.title)}" autocomplete="off" placeholder="My favourite streams"></label>
      ${kind === 'edit' ? `<label class="cd-field"><span>Description</span><textarea id="cd-desc" rows="4" maxlength="2000">${esc(F.description)}</textarea></label>
      <label class="b-switch cd-switch"><input type="checkbox" id="cd-list" ${F.isList ? 'checked' : ''}><i aria-hidden="true"></i><span>Is List <small class="cap">A ranked list instead of a grid</small></span></label>` : ''}
      <div class="cd-acts"><button class="btn" type="button" data-cd-close>Cancel</button><button class="btn primary" type="submit" ${F.busy ? 'disabled' : ''}>${F.busy ? 'Saving…' : kind === 'create' ? 'Create' : 'Save'}</button></div></form>`;
  const ac = new AbortController(), on = {signal: ac.signal};
  sig?.signal?.addEventListener('abort', () => ac.abort());
  const redraw = () => RhythiaX.ExodusKit.morph(dlg, html());
  async function save() {
    if (F.busy) return;
    if (kind !== 'remove' && !F.title.trim()) { toast('Give the collection a name.'); return; }
    F.busy = true; redraw();
    try {
      const D = RhythiaX.ExodusData;
      const r = kind === 'create' ? await D.createCollection(F.title.trim())
        : kind === 'edit' ? await D.editCollection(d.id, {title: F.title.trim(), description: F.description, isList: F.isList})
        : await D.deleteCollection(d.id);
      dlg.close(); done?.(r);
    } catch (err) {
      F.busy = false; redraw();
      toast(`Could not save: ${String(err.message || '').replace(/^\w+: /, '')}`);
    }
  }
  dlg.addEventListener('click', e => { if (e.target.closest('[data-cd-close]')) dlg.close(); else if (e.target.closest('[data-cd-ok]')) save(); }, on);
  dlg.addEventListener('submit', e => { e.preventDefault(); save(); }, on);
  dlg.addEventListener('input', e => { if (e.target.id === 'cd-title') F.title = e.target.value; if (e.target.id === 'cd-desc') F.description = e.target.value; if (e.target.id === 'cd-list') F.isList = e.target.checked; }, on);
  dlg.addEventListener('close', () => { ac.abort(); dlg.classList.remove('cd-dlg'); }, on);
  dlg.setAttribute('aria-labelledby', 'cmp-title'); dlg.classList.add('cd-dlg');
  dlg.innerHTML = html(); dlg.showModal();
  dlg.querySelector('#cd-title')?.focus();
}

function collections(host, ctx) {
  const R = host.shadowRoot, ac = new AbortController(), sig = {signal: ac.signal}, $ = s => R.querySelector(s);
  const ui = K().shell(R, sig);
  const own = /^\/collections\/own\/?$/.test(location.pathname);
  const S = {q: parse(), data: null, loading: false, seq: 0, enter: true, me: undefined};

  function parse() {
    const p = new URLSearchParams(location.search);
    return {search: (p.get('search') || '').slice(0, 100), page: Math.max(1, parseInt(p.get('page'), 10) || 1)};
  }
  function urlOf(q) {
    const p = new URLSearchParams();
    if (q.search) p.set('search', q.search);
    if (q.page > 1) p.set('page', String(q.page));
    const s = p.toString();
    return `/collections${own ? '/own' : ''}${s ? '?' + s : ''}`;
  }
  const go = patch => ctx.go(urlOf({...S.q, ...patch}));

  function head() {
    const [mascot, cap, h1, p] = own
      ? ['owncollections.png', 'Own Collections', 'Create and organize your map collections', 'Create, organize, and share your personal map collections.']
      : ['collections.png', 'Collections', 'Browse and create community collections', 'Discover community collections and organize your favorite maps.'];
    const acts = S.me === undefined ? '' : S.me
      ? `${own ? '<a class="btn" href="/collections">All collections</a>' : '<a class="btn" href="/collections/own">Your collections</a>'}<button class="btn primary" type="button" data-cd-create>Create collection</button>`
      : '<button class="btn" type="button" data-native-click="Sign in">Sign in</button>';
    return `<section class="container b-head"><div class="b-title"><img src="${SITE}/${mascot}" alt="" class="b-mascot"><div><span class="cap">${cap}</span><h1>${h1}</h1><p>${p}</p></div></div>
      <aside class="v-maps-links" id="c-acts">${acts}</aside></section>`;
  }
  function bar() {
    return `<div class="container v-mbar"><form class="v-mrow" id="c-find"><label class="field v-mq"><svg class="ico" aria-hidden="true"><use href="#i-search"/></svg><span class="sr">Search collections</span><input id="c-q" type="search" maxlength="100" placeholder="Search collections by name, creator or genre..." value="${esc(S.q.search)}" autocomplete="off"></label></form></div>`;
  }
  function grid() {
    const d = S.data;
    if (own && S.me === null) return '<div class="empty" style="padding:72px 0"><b>Sign in to see your collections.</b></div>';
    if (!d) return `<div class="c-grid">${Array.from({length: 8}, () => '<div class="skeleton" style="height:156px;border-radius:16px"></div>').join('')}</div>`;
    if (!d.collections.length) return '<div class="empty" style="padding:72px 0"><b>No collections found</b>Try another search query or create your own collection.</div>';
    return `<div class="c-grid ${S.enter ? 'anim' : ''} ${S.loading ? 'busy' : ''}">${d.collections.map((c, i) => `<a class="c-card" href="/collections/${esc(c.id)}" style="--i:${Math.min(i, 24)}">
      <span class="c-main"><span class="c-by">${K().av(c.avatar)}<span>${esc(c.owner)}</span></span>
        <b class="c-title" title="${esc(c.title)}">${esc(c.title)}</b>
        <span class="c-desc">${c.description ? esc(c.description) : '<i>No description provided.</i>'}</span>
        <span class="c-chips"><span class="num">${fmt(c.maps)} ${c.maps === 1 ? 'map' : 'maps'}</span>${c.maps ? `<span class="num">★ ${fmt(avgStars(c.spread), 2)} avg.</span>` : ''}</span></span>
      ${spreadHtml(c.spread)}</a>`).join('')}</div>`;
  }
  function render() {
    if (ac.signal.aborted) return;
    $('#hero').innerHTML = '';
    $('#body').innerHTML = `<div class="b-page v-mpage c-page ${S.enter ? 'enter' : ''}">${head()}<div id="v-mbar">${bar()}</div><section class="container v-sec v-mlist"><div id="c-grid">${grid()}</div><div id="v-mpager">${S.data ? pager(S.q.page, S.data.pages) : ''}</div></section><div style="height:96px"></div></div>`;
  }
  function refresh() {
    if (ac.signal.aborted) return;
    if (!$('.c-page')) return render();
    morph($('#c-grid'), grid()); morph($('#v-mpager'), S.data ? pager(S.q.page, S.data.pages) : '');
    morph.outer($('.b-head'), head());
  }
  async function load() {
    const seq = ++S.seq, q = {...S.q};
    if (own && !S.me) { refresh(); return; }
    S.loading = true;
    if (!own) { const snap = await Data().collectionsSnapshot(q).catch(() => null); if (seq !== S.seq) return; if (snap) S.data = snap; }
    refresh();
    try {
      const d = await Data().collections(q, own ? S.me.id : 0, ac.signal);
      if (seq !== S.seq) return;
      S.data = d;
    } catch (err) {
      if (seq !== S.seq || ac.signal.aborted) return;
      S.loading = false;
      if (!S.data) { $('#c-grid').innerHTML = `<div class="empty" style="padding:72px 0"><b>Collections could not be loaded.</b>${esc(err.message)}</div>`; return; }
      ui.toast('Showing the saved list; Rhythia did not answer.');
    }
    S.loading = false;
    refresh();
    S.enter = false;
  }

  R.addEventListener('click', e => {
    if (e.target.closest('[data-cd-create]')) { collectionDialog(R, sig, {kind: 'create', toast: ui.toast, done: newId => { ui.toast('Collection created.'); ctx.go(`/collections/${newId}`); }}); return; }
    const t = e.target.closest('[data-page]');
    if (!t || t.disabled) return;
    go({page: Number(t.dataset.page)});
    const el = $('.v-mlist'); if (el && el.getBoundingClientRect().top < 0) scrollTo({top: el.getBoundingClientRect().top + scrollY - 120, behavior: REDUCED ? 'auto' : 'smooth'});
  }, sig);
  let typing = 0;
  R.addEventListener('input', e => {
    if (e.target.id !== 'c-q') return;
    clearTimeout(typing);
    const v = e.target.value.trim();
    typing = setTimeout(() => { if (v !== S.q.search) go({search: v, page: 1}); }, 350);
  }, sig);
  R.addEventListener('submit', e => { if (e.target.id === 'c-find') { e.preventDefault(); clearTimeout(typing); const v = $('#c-q').value.trim(); if (v !== S.q.search) go({search: v, page: 1}); } }, sig);

  render();
  if (!own) load();
  Data().signedIn().then(me => { if (ac.signal.aborted) return; S.me = me || null; if (own) load(); else refresh(); }).catch(() => { S.me = null; if (own) refresh(); });

  return {
    state: () => ({}), idle: () => true, relayout() {},
    page() { const q = parse(); if (urlOf(q) === urlOf(S.q)) return; S.q = q; load(); },
    destroy() { ac.abort(); ui.hide(); clearTimeout(typing); },
  };
}

/* ════════════════════ Download all ════════════════════ */
// Exodus saves the collection itself (shared/collection-zip.js): each map with its own extension, so every file can
// be dragged into Rhythia, in .zip parts of at most 1.5 GB, so a big collection does not stop half way as Rhythia's
// own Download all does. A download goes on when the page is left; coming back to the collection shows it again.
// A collection of more than BIG_COLLECTION maps asks first: map files are about 5 MB each (measured on two
// collections, 2026-11-21).
const BIG_COLLECTION = 150, MB_PER_MAP = 5.5, PART_MB = 1500;
const sizeOf = maps => { const mb = maps * MB_PER_MAP; return mb < 1000 ? `${Math.max(10, Math.round(mb / 10) * 10)} MB` : `${(mb / 1000).toFixed(1)} GB`; };
// Downloads running in this tab, by collection id: {label, watchers}.
const downloads = new Map();
function startDownload(id) {
  if (downloads.has(id)) return;
  const run = {label: 'Reading the collection…', watchers: new Set()};
  const tell = (label, message) => { run.label = label; run.watchers.forEach(fn => fn(label, message)); };
  downloads.set(id, run);
  RhythiaX.CollectionZip.download({id, onStep: st => {
    if (st.phase === 'files') tell(`Downloading ${RhythiaX.ExodusKit.fmt(st.done)} of ${RhythiaX.ExodusKit.fmt(st.total)}…`);
    else if (st.phase === 'save') tell(st.done < st.total || st.part > 1 ? `Saving part ${st.part}…` : 'Saving the .zip…');
  }}).then(r => {
    const fmt = RhythiaX.ExodusKit.fmt, f = r.failed.length;
    const what = !r.saved ? 'No maps could be downloaded.'
      : r.parts > 1 ? `${fmt(r.saved)} maps are in your downloads, in ${r.parts} .zip files.`
      : `The .zip with ${fmt(r.saved)} ${r.saved === 1 ? 'map' : 'maps'} is in your downloads.`;
    return r.saved || f ? `${what}${r.saved && f ? ` ${fmt(f)} ${f === 1 ? 'map' : 'maps'} could not be downloaded.` : ''}` : 'This collection has no maps to download.';
  }, err => `Download all stopped: ${String(err?.message || err).replace(/^\w+: /, '')}`)
    .then(message => { downloads.delete(id); tell('', message); });
}
// Before a big collection: Cancel, or ok() to download anyway.
function downloadDialog(R, sig, {count, ok}) {
  const dlg = R.getElementById('cmp'), {fmt} = RhythiaX.ExodusKit;
  const ac = new AbortController(), on = {signal: ac.signal};
  sig?.signal?.addEventListener('abort', () => ac.abort());
  dlg.innerHTML = `<div class="cmp-head"><h2 id="cmp-title">Download ${fmt(count)} maps?</h2><button class="iconbtn" type="button" data-cd-close aria-label="Close"><svg class="ico" aria-hidden="true"><use href="#i-x"/></svg></button></div>
    <div class="cmp-body cd-body"><p>That is about ${sizeOf(count)}${count * MB_PER_MAP > PART_MB ? `, saved in about ${Math.ceil(count * MB_PER_MAP / PART_MB)} .zip files of up to 1.5 GB` : ''}. It takes a while${count * MB_PER_MAP > PART_MB ? ', and your browser may ask whether this site may download several files' : ''}.</p>
    <div class="cd-acts"><button class="btn" type="button" data-cd-close>Cancel</button><button class="btn primary" type="button" data-cd-ok>Download anyway</button></div></div>`;
  dlg.addEventListener('click', e => { if (e.target.closest('[data-cd-close]')) dlg.close(); else if (e.target.closest('[data-cd-ok]')) { dlg.close(); ok(); } }, on);
  dlg.addEventListener('close', () => { ac.abort(); dlg.classList.remove('cd-dlg'); }, on);
  dlg.setAttribute('aria-labelledby', 'cmp-title'); dlg.classList.add('cd-dlg');
  dlg.showModal();
}

/* ════════════════════ Collection ════════════════════ */
const STATUS_F = [['ALL', 'All maps'], ['RANKED', 'Ranked'], ['UNRANKED', 'Unranked'], ['QUALIFIED', 'Qualified']];
const C_SORTS = [['order', 'Collection order'], ['stars', 'Star rating'], ['length', 'Length'], ['plays', 'Most played']];
// Maps shown at first and added by Show more, rounded up to whole rows of the grid.
const PAGE_MAPS = 30;
function collection(host, ctx) {
  const R = host.shadowRoot, ac = new AbortController(), sig = {signal: ac.signal}, $ = s => R.querySelector(s);
  const ui = K().shell(R, sig);
  const id = Number(ctx.id);
  // Select: several maps of the collection at once (core/kit.js selector), for example into one of your own.
  const sel = K().selector(R, sig, {say: ui.toast, mapsOf: () => S.d?.maps || [], zipName: () => `${S.d?.title || 'collection'} picked`});
  // kinds: map hash -> its type, the ones the history service or this browser already know (null until asked).
  const S = {d: null, me: undefined, status: 'ALL', sort: 'order', dir: 'desc', shown: PAGE_MAPS, enter: true, seq: 0, removing: 0, dl: '', atlas: null, kinds: null};

  const isOwner = () => Boolean(S.me && S.d && S.me.id === S.d.owner.id);
  const statusOf = m => { const s = String(m.status || '').toUpperCase(); return s === 'APPROVED' ? 'RANKED' : ['RANKED', 'QUALIFIED'].includes(s) ? s : 'UNRANKED'; };
  function shownMaps() {
    const list = S.d.maps.map((m, i) => ({...m, order: i})).filter(m => S.status === 'ALL' || statusOf(m) === S.status);
    if (S.sort === 'order') return S.dir === 'desc' ? list : list.reverse();
    const k = {stars: 'stars', length: 'length', plays: 'plays'}[S.sort];
    return list.sort((a, b) => (S.dir === 'desc' ? (b[k] || 0) - (a[k] || 0) : (a[k] || 0) - (b[k] || 0)));
  }
  function hero() {
    const d = S.d, maps = d.maps, counts = Array(18).fill(0);
    for (const m of maps) counts[Math.min(17, Math.max(0, Math.floor(m.stars || 0) - 1))]++;
    const ranked = maps.filter(m => statusOf(m) === 'RANKED').length, total = maps.reduce((s, m) => s + (m.length || 0), 0);
    const art = maps.slice(0, 4).map(m => `<i style="background-image:${cssUrl(m.img || '')}"></i>`).join('');
    const acts = [dlButton()];
    // Install in Atlas (popup, off by default; shared/atlas-link.js): a plain atlas:// link, the browser asks first.
    // Paired and running, Atlas says how many of the maps are in the game, and the link opens the collection there
    // to install the missing ones.
    const atlas = RhythiaX.ExodusPrefs?.modules?.atlasLinks === true && RhythiaX.AtlasLink?.href('collection', id);
    const A = S.atlas, have = A?.ids ? maps.filter(m => A.ids.has(m.id)).length : null;
    if (atlas && have != null) {
      acts.push(have < maps.length
        ? `<a class="btn v-atl" href="${esc(atlas)}" data-tip="<b>Install missing with Atlas</b><small>Opens the collection in Atlas: ${fmt(maps.length - have)} ${maps.length - have === 1 ? 'map is' : 'maps are'} not in your game.</small>">${ATLAS_MARK}Install missing</a>`
        : `<span class="btn v-atl in" data-tip="<b>All in your game</b><small>Atlas found every map in Rhythia on this computer.</small>">${ATLAS_MARK}All in your game</span>`);
    } else if (atlas) acts.push(`<a class="btn" href="${esc(atlas)}" data-tip="<b>${RhythiaX.AtlasLink.LABEL}</b><small>${RhythiaX.AtlasLink.TIP}</small>">${RhythiaX.AtlasLink.LABEL}</a>`);
    if (isOwner()) acts.push('<button class="btn" type="button" data-cd-edit>Edit collection</button>', '<button class="btn danger" type="button" data-cd-remove>Remove collection</button>');
    return `<div class="container c-hero">
        <div class="c-art n${Math.min(4, maps.length)}">${art}</div>
        <div class="v-who"><a class="c-back" href="/collections">Go back to all collections</a>
          <p class="v-by"><a class="v-player" href="/player/${esc(d.owner.id)}">${K().av(d.owner.avatar)}<span>Created by <b>${esc(d.owner.username)}</b></span></a></p>
          <h1>${esc(d.title)}</h1>
          <p class="c-hdesc">${d.description ? esc(d.description) : '<i>No description provided.</i>'}</p>
          <div class="v-chips"><span class="v-chip plain">${d.isList ? 'List layout' : 'Grid layout'}</span><span class="v-chip plain num">${fmt(d.count)} ${d.count === 1 ? 'map' : 'maps'}</span></div>
          <div class="v-act">${acts.join('')}</div></div>
        ${maps.length ? `<div class="c-hspread"><small>Difficulty spread</small>${spreadHtml(counts.slice(0, 14).map((c, i) => c + (i === 13 ? counts.slice(14).reduce((s, x) => s + x, 0) : 0)), true)}${typesHtml(maps)}</div>` : ''}
      </div>
      ${isOwner() && d.count < 3 ? '<div class="container"><div class="c-warn"><b>Collection visibility warning</b><span>Your collection needs at least <b>3 maps</b> to be publicly visible.</span></div></div>' : ''}
      <div class="container"><div class="v-kpis">
        <div><small>Maps</small><b class="num">${fmt(d.count)}</b></div>
        <div><small>Average stars</small><b class="num">${maps.length ? `★ ${fmt(maps.reduce((s, m) => s + (m.stars || 0), 0) / maps.length, 2)}` : '—'}</b></div>
        <div><small>Ranked</small><b class="num">${fmt(ranked)}<span> of ${fmt(maps.length)}</span></b></div>
        ${have != null ? `<div data-tip="<b>In your game</b><small>From Atlas, on this computer</small>"><small>In your game</small><b class="num">${fmt(have)}<span> of ${fmt(maps.length)}</span></b></div>` : ''}
        <div data-tip="<b>Playing time</b><small>Every map played once at 1×</small>"><small>Playing time</small><b class="num">${hoursMin(total)}</b></div>
      </div></div>`;
  }
  // The collection's map types in one bar, from the maps whose type is known (Ranked and Qualified maps the history
  // service has read; no map file is read for it), with the biggest shares and quantum named under it.
  const KIND_CLASS = {jump: 'k-jump', stream: 'k-stream', tech: 'k-tech', varied: 'k-other'};
  // Rhythia's collections give a map's number, not its hash: the history service takes '#<number>' for it.
  const keyOf = m => m.hash || (Number(m.id) > 0 ? `#${m.id}` : '');
  const kindOf = m => (keyOf(m) && S.kinds?.get(keyOf(m))) || null;
  function typesHtml(maps) {
    const known = maps.filter(kindOf);
    if (!known.length) return '';
    const name = k => RhythiaX.GameTerms.typeName(k), pct = n => `${fmt(n / known.length * 100, 0)}%`;
    const parts = Object.keys(KIND_CLASS).map(k => [k, known.filter(m => kindOf(m).kind === k).length]).filter(([, n]) => n).sort((a, b) => b[1] - a[1]);
    const quantum = known.filter(m => kindOf(m).quantum).length;
    const words = [...parts.slice(0, 3).map(([k, n]) => `${name(k)} ${pct(n)}`), ...(quantum ? [`Quantum ${pct(quantum)}`] : [])];
    const of = known.length < maps.length ? ` · ${fmt(known.length)} of ${fmt(maps.length)} maps` : '';
    const tip = known.length < maps.length ? ` data-tip="<b>Map types</b><small>Known for Ranked and Qualified maps that Reimagined has read</small>"` : '';
    return `<small class="c-tlabel"${tip}>Map types${of}</small><span class="c-types" aria-label="Map types: ${esc(words.join(', '))}">${parts.map(([k, n]) => `<i class="${KIND_CLASS[k]}" style="flex-grow:${n}" data-tip="<b>${name(k)}</b><small>${fmt(n)} ${n === 1 ? 'map' : 'maps'} · ${pct(n)}</small>"></i>`).join('')}</span>
      <span class="c-twords">${words.map(w => `<span>${esc(w)}</span>`).join('')}</span>`;
  }
  // Map types the history service or this browser already know (online history; nothing is read from map files).
  async function loadKinds() {
    const hashes = [...new Set((S.d?.maps || []).map(keyOf).filter(Boolean))];
    if (!hashes.length) return;
    const known = await Data().knownStyles(hashes, ac.signal).catch(() => null);
    if (ac.signal.aborted || !known?.size) return;
    S.kinds = known;
    render();
  }
  const typeChip = m => { const k = kindOf(m); return k ? `<span class="h-star" title="Map type, worked out by Reimagined">${esc(RhythiaX.GameTerms.typeName(k.kind))}${k.quantum ? ' · Quantum' : ''}</span>` : ''; };
  function dlButton() {
    return S.dl
      ? `<button class="btn primary" type="button" data-dl-all disabled aria-live="polite" data-tip="<b>Downloading</b><small>Each .zip is saved as soon as it is full</small>"><svg class="ico" aria-hidden="true"><use href="#i-dl"/></svg>${esc(S.dl)}</button>`
      : `<button class="btn primary" type="button" data-dl-all data-tip="<b>Download all</b><small>Every map in .zip files, ready to drag into Rhythia</small>"><svg class="ico" aria-hidden="true"><use href="#i-dl"/></svg>Download all</button>`;
  }
  const redrawDl = () => { const b = $('[data-dl-all]'); if (b) morph.outer(b, dlButton()); };
  // Show a download of this collection, started now or before the page was opened again.
  const onDownload = (label, message) => { if (ac.signal.aborted) return; S.dl = label; redrawDl(); if (message) ui.toast(message); };
  function watchDownload() {
    const run = downloads.get(id);
    if (!run) return;
    run.watchers.add(onDownload);
    ac.signal.addEventListener('abort', () => run.watchers.delete(onDownload));
    S.dl = run.label;
  }
  function download() {
    if (downloads.has(id)) return;
    startDownload(id);
    watchDownload(); redrawDl();
  }
  function card(m, i) {
    const [dl, dc] = K().diff(m.difficulty), [sl, sc] = K().status(m), st = statusOf(m);
    const remove = isOwner() ? `<button class="iconbtn c-rm" type="button" data-remove="${esc(m.id)}" aria-label="Remove ${esc(m.title)} from the collection" data-tip="<b>Remove from collection</b>" ${S.removing === m.id ? 'disabled' : ''}><svg class="ico" aria-hidden="true"><use href="#i-x"/></svg></button>` : '';
    if (S.d.isList) return `<div class="c-lrow"><span class="pos num">${fmt(m.order + 1)}</span><a class="h-map" href="/maps/${esc(m.id)}" style="--i:${Math.min(i, 24)}">
      <span class="art" style="background-image:${cssUrl(m.img)}"></span>
      <span class="chips"><span class="h-diff" style="--c:${dc}">${dl}</span><span class="h-right"><span class="h-star num">★ ${K().fmt(m.stars, 2)}</span>${typeChip(m)}</span></span>
      ${st !== 'RANKED' ? `<span class="v-mflags"><span class="h-diff" style="--c:${sc}">${sl}</span></span>` : ''}
      <span class="plate"><b title="${esc(m.title)}">${esc(m.title)}</b><small><span>by ${esc(m.mapper || 'Unknown')}</span><span class="num">${K().mmss(m.length)}</span><span class="num">${fmt(m.plays)} plays</span></small></span></a>${remove}</div>`;
    return `<div class="c-cell"><a class="h-map" href="/maps/${esc(m.id)}" style="--i:${Math.min(i, 24)}">
      <span class="art" style="background-image:${cssUrl(m.img)}"></span>
      <span class="chips"><span class="h-diff" style="--c:${dc}">${dl}</span><span class="h-right"><span class="h-star num">★ ${K().fmt(m.stars, 2)}</span>${typeChip(m)}</span></span>
      ${st !== 'RANKED' ? `<span class="v-mflags"><span class="h-diff" style="--c:${sc}">${sl}</span></span>` : ''}
      <span class="plate"><b title="${esc(m.title)}">${esc(m.title)}</b><small><span>by ${esc(m.mapper || 'Unknown')}</span><span class="num">${K().mmss(m.length)}</span><span class="num">${fmt(m.plays)} plays</span></small></span></a>${remove}</div>`;
  }
  function mapsSec() {
    const list = shownMaps(), part = list.slice(0, S.shown);
    return `<section class="container v-sec" id="c-maps"><div class="sec-head"><div><h2>Collection maps</h2><p class="lede">${fmt(list.length)} ${list.length === 1 ? 'item' : 'items'}${S.d.maps.length < S.d.count ? ` · the first ${fmt(S.d.maps.length)} are shown` : ''}</p></div>
        <div class="right">${S.d.maps.length ? sel.button() : ''}<div class="pills" aria-label="Filter collection maps by status">${STATUS_F.map(([k, l]) => `<button type="button" aria-pressed="${S.status === k}" data-status="${k}">${l}</button>`).join('')}</div>
          <div class="pills" aria-label="Sort">${C_SORTS.map(([k, l]) => `<button type="button" aria-pressed="${S.sort === k}" data-sort="${k}">${l}</button>`).join('')}</div>
          <button class="btn v-dir" type="button" data-dir aria-label="${S.dir === 'desc' ? 'Descending' : 'Ascending'}" data-tip="<b>${S.sort === 'order' ? (S.dir === 'desc' ? 'Collection order' : 'Reversed order') : S.dir === 'desc' ? 'Descending' : 'Ascending'}</b>"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="${S.dir === 'desc' ? 'M12 5v14M6 13l6 6 6-6' : 'M12 19V5M6 11l6-6 6 6'}"/></svg></button></div></div>
      ${part.length ? `<div class="${S.d.isList ? 'c-list' : 'h-maps c-mgrid'}">${part.map(card).join('')}</div>` : '<div class="empty" style="padding:56px 0"><b>No maps here.</b>Try another filter.</div>'}
      ${list.length > S.shown ? `<div class="v-moreb"><button class="btn" type="button" data-more>Show ${fmt(Math.min(step(), list.length - S.shown))} more</button></div>` : ''}</section>`;
  }
  function render() {
    if (ac.signal.aborted) return;
    morph($('#hero'), `<section class="v-hero c-h ${S.enter ? 'enter' : ''}"><div class="v-banner" style="background-image:${cssUrl(S.d.maps[0]?.img || '')}"></div>${hero()}</section>`);
    morph($('#body'), `<div class="v-page ${S.enter ? 'enter' : ''}">${mapsSec()}<div style="height:96px"></div></div>`);
    document.title = `${S.d.title} | Rhythia`;
    fitRows();
  }
  const redrawMaps = () => { morph.outer($('#c-maps'), mapsSec()); fitRows(); };
  // The grid shows whole rows: as many maps as fill its rows, about 30 at a time (32 with four columns).
  const columns = () => { const g = $('#c-maps .c-mgrid'); return g ? Math.max(1, getComputedStyle(g).gridTemplateColumns.split(' ').filter(Boolean).length) : 1; };
  const step = () => { const c = columns(); return c * Math.ceil(PAGE_MAPS / c); };
  function fitRows() {
    if (!S.d || S.d.isList) return;
    const c = columns(), total = shownMaps().length, want = S.shown < total ? Math.min(total, Math.ceil(S.shown / c) * c) : S.shown;
    // Redrawn when a row is not full, or when Show more would now add a different number.
    const more = $('#c-maps [data-more]'), label = more && `Show ${fmt(Math.min(step(), total - want))} more`;
    if (want !== S.shown || (more && more.textContent.trim() !== label)) { S.shown = want; morph.outer($('#c-maps'), mapsSec()); }
  }
  let resizing = 0;
  addEventListener('resize', () => { cancelAnimationFrame(resizing); resizing = requestAnimationFrame(fitRows); }, sig);
  async function load() {
    const seq = ++S.seq;
    const snap = await Data().collectionSnapshot(id).catch(() => null);
    if (seq !== S.seq) return;
    if (snap) { S.d = snap; render(); } else if (!S.d) $('#hero').innerHTML = '<section class="v-hero"><div class="container v-hero-in"><div class="v-cover skeleton"></div><div class="v-who"><div class="skeleton" style="width:40%;height:34px"></div><div class="skeleton" style="width:25%;margin-top:14px"></div></div></div></section>';
    try {
      const d = await Data().collection(id, ac.signal);
      if (seq !== S.seq) return;
      S.d = d;
    } catch (err) {
      if (seq !== S.seq || ac.signal.aborted) return;
      if (!S.d) { $('#hero').innerHTML = ''; $('#body').innerHTML = `<div class="container"><div class="empty" style="padding:120px 0"><b>Can't find collection</b>${esc(err.message)}<div style="margin-top:16px"><button class="btn" type="button" data-native-x>Show Rhythia's page</button></div></div></div>`; return; }
      ui.toast('Showing the saved collection; Rhythia did not answer.');
    }
    render();
    S.enter = false;
    loadAtlas();
    loadKinds();
  }
  // With Install in Atlas on and Atlas paired: which of the shown maps are in the game.
  async function loadAtlas() {
    if (RhythiaX.ExodusPrefs?.modules?.atlasLinks !== true || !S.d?.maps.length) return;
    let info = null;
    try { info = await chrome.runtime.sendMessage({type: 'rhythiax-atlas-have', ids: S.d.maps.map(m => m.id)}); } catch (_) {}
    if (ac.signal.aborted || !Array.isArray(info?.ids)) return;
    S.atlas = {ids: new Set(info.ids)};
    render();
  }
  async function remove(mapId) {
    const m = S.d.maps.find(x => x.id === mapId); if (!m || S.removing) return;
    S.removing = mapId; redrawMaps();
    try {
      await Data().removeFromCollection(id, mapId);
      S.d = {...S.d, maps: S.d.maps.filter(x => x.id !== mapId), count: Math.max(0, S.d.count - 1)};
      ui.toast(`${m.title} was removed from the collection.`);
    } catch (err) { ui.toast(`Could not remove the map: ${err.message}`); }
    S.removing = 0;
    render();
  }
  R.addEventListener('click', e => {
    if (e.target.closest('[data-native-x]')) { ctx.showNative(); return; }
    if (e.target.closest('[data-dl-all]')) {
      if (S.d && S.d.count > BIG_COLLECTION) downloadDialog(R, sig, {count: S.d.count, ok: download}); else download();
      return;
    }
    const own = {id, title: S.d?.title, description: S.d?.description, isList: S.d?.isList};
    if (e.target.closest('[data-cd-edit]')) { collectionDialog(R, sig, {kind: 'edit', d: own, toast: ui.toast, done: () => { ui.toast('Collection saved.'); load(); }}); return; }
    if (e.target.closest('[data-cd-remove]')) { collectionDialog(R, sig, {kind: 'remove', d: own, toast: ui.toast, done: () => { ui.toast(`${own.title} was removed.`); ctx.go('/collections/own'); }}); return; }
    const t = e.target.closest('[data-status],[data-sort],[data-dir],[data-more],[data-remove]');
    if (!t || t.disabled) return;
    const d = t.dataset;
    if (d.status) { S.status = d.status; S.shown = PAGE_MAPS; redrawMaps(); return; }
    if (d.sort) { if (d.sort !== S.sort) { S.sort = d.sort; S.dir = 'desc'; S.shown = PAGE_MAPS; redrawMaps(); } return; }
    if ('dir' in d) { S.dir = S.dir === 'desc' ? 'asc' : 'desc'; redrawMaps(); return; }
    if ('more' in d) { S.shown += step(); redrawMaps(); return; }
    if (d.remove) { e.preventDefault(); remove(Number(d.remove)); }
  }, sig);

  watchDownload();
  load();
  Data().signedIn().then(me => { if (ac.signal.aborted) return; S.me = me || null; if (S.d && isOwner()) render(); }).catch(() => { S.me = null; });

  return {
    state: () => ({}), idle: () => !S.removing, relayout() {}, page() {},
    destroy() { ac.abort(); ui.hide(); const dl = R.getElementById('cmp'); if (dl?.open) dl.close(); },
  };
}

const css = `
.c-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;transition:opacity .2s}
.c-grid.busy{opacity:.6;transition:opacity .2s .35s}
.c-grid.anim .c-card{animation:hRise .5s var(--ease) both;animation-delay:calc(var(--i) * 25ms)}
.c-card{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:18px;align-items:center;padding:18px 20px;border-radius:16px;background:var(--panel);box-shadow:inset 0 0 0 1px var(--line);transition:box-shadow .15s,background-color .15s}
.c-card:hover{box-shadow:inset 0 0 0 1px var(--line-2);background:var(--panel-2)}
.c-main{display:flex;flex-direction:column;gap:6px;min-width:0}
.c-by{display:inline-flex;align-items:center;gap:8px;font-size:13px;font-weight:600;color:var(--text-2)}
.c-by .v-av{width:22px;height:22px}
.c-title{font-size:17px;font-weight:750;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.c-card:hover .c-title{color:var(--accent-2)}
.c-desc{font-size:13.5px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.c-desc i,.c-hdesc i{font-style:italic}
.c-chips{display:flex;gap:6px;margin-top:4px}
.c-chips span{display:inline-flex;align-items:center;height:22px;padding:0 8px;border-radius:6px;font-size:12px;font-weight:650;color:var(--text-2);background:var(--panel-2);box-shadow:inset 0 0 0 1px var(--line)}
.c-spread{display:flex;align-items:flex-end;gap:3px;height:96px}
.c-spread > span{display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:5px;width:11px;height:100%}
.c-spread i{display:block;width:8px;min-height:0;border-radius:3px;background:var(--c)}
.c-spread em{font-style:normal;font-size:9.5px;color:var(--muted);line-height:1}
.c-spread.big{height:120px;gap:5px}
.c-spread.big > span{width:16px}.c-spread.big i{width:12px}.c-spread.big em{font-size:10.5px}
.c-hero{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:32px;align-items:center}
.c-art{display:grid;grid-template-columns:1fr 1fr;gap:3px;width:150px;height:150px;flex:none;border-radius:22px;overflow:hidden;background:var(--panel-3);box-shadow:0 0 0 1px var(--line-2),0 20px 50px rgba(0,0,0,calc(.35 * var(--sh)))}
.c-art i{background:center/cover}
.c-art.n1 i{grid-column:1/-1;grid-row:1/-1}.c-art.n2 i{grid-row:1/-1}.c-art.n3 i:first-child{grid-row:1/3}
.c-back{display:inline-flex;align-items:center;gap:6px;margin-bottom:10px;font-size:13px;font-weight:650;color:var(--muted)}
.c-back::before{content:"←"}
.c-back:hover{color:var(--text)}
.c-hdesc{margin:10px 0 0;color:var(--text-2);max-width:70ch;overflow-wrap:anywhere}
.c-hspread{display:flex;flex-direction:column;gap:8px}
.c-hspread small{font-size:12.5px;font-weight:600;color:var(--muted)}
.c-hspread .c-tlabel{margin-top:6px}
.c-types{display:flex;gap:2px;height:8px;border-radius:999px;overflow:hidden;background:var(--panel-3)}
.c-types i{display:block;min-width:3px;background:var(--c)}
.c-twords{display:flex;flex-wrap:wrap;gap:2px 0;font-size:12.5px;color:var(--text-2)}
.c-twords span + span::before{content:"·";margin:0 7px;color:var(--muted)}
.c-warn{display:flex;flex-direction:column;gap:2px;margin-top:20px;padding:12px 16px;border-radius:12px;background:var(--panel);box-shadow:inset 0 0 0 1px rgba(250,204,21,.3);font-size:13.5px;color:var(--text-2)}
.c-warn > b{color:var(--text)}
.c-mgrid{grid-template-columns:repeat(auto-fill,minmax(240px,1fr))}
.c-cell,.c-lrow{position:relative}
.c-rm{position:absolute;top:44px;right:10px;width:30px;height:30px;background:rgba(10,11,14,.74);color:#f4f5f7;opacity:0;transition:opacity .15s}
.c-cell:hover .c-rm,.c-lrow:hover .c-rm,.c-rm:focus-visible{opacity:1}
.c-rm:hover{background:rgba(229,72,77,.4)}
.c-list{display:flex;flex-direction:column;gap:10px}
.c-lrow{display:grid;grid-template-columns:48px minmax(0,1fr);gap:12px;align-items:center}
.c-lrow .pos{font-size:16px;font-weight:800;color:var(--muted);text-align:center}
.c-lrow .h-map{aspect-ratio:auto;height:96px}
.c-lrow .h-map .plate{left:auto;right:8px;bottom:8px;top:8px;width:min(60%,520px);justify-content:center}
#c-maps .sec-head .right .pills{min-height:40px;align-items:stretch;flex-wrap:wrap;max-width:100%}
#c-maps .sec-head .right .pills button{height:auto;min-height:34px}
[data-variant="lines"] .c-card{background:none;box-shadow:none;border-radius:0;border-top:1px solid var(--rule)}
[data-variant="lines"] .c-grid{gap:0 28px}
@media (max-width:860px){.c-grid{grid-template-columns:1fr}.c-hero{grid-template-columns:auto minmax(0,1fr)}.c-hspread{grid-column:1/-1}}
@media (max-width:640px){.c-card{grid-template-columns:1fr}.c-spread{height:64px}.c-hero{grid-template-columns:1fr;gap:18px}.c-art{width:112px;height:112px}.c-lrow{grid-template-columns:32px minmax(0,1fr)}.c-lrow .h-map .plate{width:auto;left:8px;top:auto}}
@media (prefers-reduced-motion:reduce){.c-grid.anim .c-card{animation:none!important}}
`;

K().page('collections', collections, css);
K().page('collection', collection);
})();
