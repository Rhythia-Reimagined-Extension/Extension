// =============================================
// Reimagined for Rhythia — Exodus map list
// =============================================
// /maps: Rhythia's map list with the same filters it keeps in the address (All maps), and Reimagined Search
// (?view=type): the history service's own search of Ranked and Qualified maps by type, with online history.

var RhythiaX = RhythiaX || {};

(function () {
'use strict';
const K = () => RhythiaX.ExodusKit;
const {SITE, Data, esc, REDUCED, shell, mapTile, pager: pageNumbers, morph} = RhythiaX.ExodusKit;

/* ════════════════════ Map list ════════════════════ */
const BUCKETS = [['Any', 'All difficulties', 0, 20], ['Beginner', '★ 0–3', 0, 3], ['Intermediate', '★ 3–5', 3, 5], ['Hard', '★ 5–7', 5, 7], ['Expert', '★ 7–20', 7, 20]];
// Rhythia's ranked status choice, with its own names (Qualified maps are waiting to be ranked).
const STATUSES = [['RANKED', 'Ranked'], ['QUALIFIED', 'Qualified'], ['UNRANKED', 'Unranked'], ['LEGACY', 'Legacy']];
const SORTS = [['newest', 'Newest'], ['playCount', 'Most played'], ['starRating', 'Difficulty'], ['length', 'Length']];
// Reimagined Search: the history service's own order names, and length in seconds (0: no bound).
const TYPE_SORTS = [['newest', 'Newest'], ['plays', 'Most played'], ['stars', 'Difficulty'], ['length', 'Length']];
const LENGTHS = [['Any', 'Any length', 0, 0], ['Short', 'Under 1:30', 0, 90], ['Medium', '1:30–3:00', 90, 180], ['Long', '3:00–5:00', 180, 300], ['Marathon', 'Over 5:00', 300, 0]];
const QUANTUM = [['any', 'Any'], ['without', 'No quantum'], ['only', 'Only quantum']];
// Type names for a type the server's list (/api/maps/types) does not name.
const TYPE_NAMES = {jump: 'Jumps', stream: 'Streams', tech: 'Techs', varied: 'Varied'};
const NOTICE = 'rhythia_community_maps_notice_v1';
// What Reimagined Search is, until the server's own words (/api/maps/types) are known, and without online history.
const SEARCH_NOTE = {note: "Reimagined's own search, not Rhythia's.", points: [
  "Ranked and Qualified maps only. Every other map is in Rhythia's map list.",
  "It searches Reimagined's copy of Rhythia's Ranked and Qualified lists, read once a day, so a map ranked or qualified since may be missing and results can differ from Rhythia.",
  "Map types are worked out automatically from each map's file, so some may be wrong."]};

function maps(host, ctx) {
  const R = host.shadowRoot, ac = new AbortController(), sig = {signal: ac.signal}, $ = s => R.querySelector(s);
  const ui = shell(R, sig);
  let explicit = false; try { explicit = localStorage.getItem('rhythiax_exodus_maps_explicit') === '1'; } catch (_) {}
  // types: the search's types, statuses and note (null without online history, undefined until known);
  // mine: the signed-in player's top 100 map ids (null when signed out); kinds: known types of All maps cards.
  const S = {q: parse(), data: null, loading: false, seq: 0, enter: true, adv: false, ok: noticeOk(), types: undefined, mine: undefined, kinds: new Map()};

  // The same address as Rhythia's map list: filter, status, minStars, maxStars, author, tags, sort, sortDirection, page.
  // Reimagined Search adds view=type, types, quantum, minLength, maxLength and notTop.
  function parse() {
    const p = new URLSearchParams(location.search), view = p.get('view') === 'type' ? 'type' : 'all', sort = p.get('sort');
    const sorts = view === 'type' ? TYPE_SORTS : SORTS, statuses = view === 'type' ? ['RANKED', 'QUALIFIED', 'BOTH'] : STATUSES.map(([k]) => k);
    return {
      view, filter: p.get('filter') || '', status: statuses.includes(p.get('status')) ? p.get('status') : 'RANKED',
      minStars: Number(p.get('minStars')) || 0, maxStars: Number(p.get('maxStars')) || 20, author: p.get('author') || '', tags: p.get('tags') || '',
      sort: sorts.some(([k]) => k === sort) ? sort : 'newest', dir: p.get('sortDirection') === 'asc' ? 'asc' : 'desc',
      page: Math.max(1, parseInt(p.get('page'), 10) || 1), explicit,
      types: (p.get('types') || '').split(',').filter(t => /^[a-z]{2,16}$/.test(t)).slice(0, 8),
      quantum: QUANTUM.some(([k]) => k === p.get('quantum')) ? p.get('quantum') : 'any',
      minLength: Math.max(0, Number(p.get('minLength')) || 0), maxLength: Math.max(0, Number(p.get('maxLength')) || 0),
      notTop: p.get('notTop') === '1',
    };
  }
  function urlOf(q) {
    const p = new URLSearchParams();
    if (q.view === 'type') p.set('view', 'type');
    if (q.filter) p.set('filter', q.filter);
    if (q.status !== 'RANKED') p.set('status', q.status);
    if (q.minStars) p.set('minStars', String(q.minStars));
    if (q.maxStars !== 20) p.set('maxStars', String(q.maxStars));
    if (q.author) p.set('author', q.author);
    if (q.view === 'type') {
      if (q.types.length) p.set('types', q.types.join(','));
      if (q.quantum !== 'any') p.set('quantum', q.quantum);
      if (q.minLength) p.set('minLength', String(q.minLength));
      if (q.maxLength) p.set('maxLength', String(q.maxLength));
      if (q.notTop) p.set('notTop', '1');
    } else if (q.tags) p.set('tags', q.tags);
    if (q.sort !== 'newest') p.set('sort', q.sort);
    if (q.dir !== 'desc') p.set('sortDirection', q.dir);
    if (q.page > 1) p.set('page', String(q.page));
    const s = p.toString();
    return `/maps${s ? '?' + s : ''}`;
  }
  const go = patch => ctx.go(urlOf({...S.q, ...patch}));
  // The other tab starts with its own defaults; the title and mapper words stay.
  const switchTo = view => ctx.go(urlOf({...parseDefaults(), view, filter: S.q.filter, author: S.q.author}));
  const parseDefaults = () => ({view: 'all', filter: '', status: 'RANKED', minStars: 0, maxStars: 20, author: '', tags: '', sort: 'newest', dir: 'desc', page: 1, explicit, types: [], quantum: 'any', minLength: 0, maxLength: 0, notTop: false});
  function noticeOk() {
    try { const v = JSON.parse(localStorage.getItem(NOTICE) || 'null'); return v?.version === 1 && v.expiresAt > Date.now(); } catch (_) { return false; }
  }
  const typeName = id => S.types?.types?.find(t => t.id === id)?.label || TYPE_NAMES[id] || '';

  function head() {
    return `<section class="container b-head"><div class="b-title"><img src="${SITE}/maps.png" alt="" class="b-mascot"><div><span class="cap">Maps</span><h1>Browse and install community maps</h1><p>Discover, download, and install community maps.</p></div></div>
      <aside class="v-maps-links"><button class="btn" type="button" data-native-click="Ranking Criteria">Ranking Criteria</button><button class="btn" type="button" data-native-click="Copyright">Copyright</button></aside></section>`;
  }
  const views = () => `<div class="pills v-mview" aria-label="Search">${[['all', 'All maps'], ['type', 'Reimagined Search']].map(([k, l]) => `<button type="button" aria-pressed="${S.q.view === k}" data-view="${k}">${l}</button>`).join('')}</div>`;
  const dirButton = q => `<button class="btn v-dir" type="button" data-dir aria-label="${q.dir === 'desc' ? 'Descending' : 'Ascending'}" data-tip="<b>${q.dir === 'desc' ? 'Descending' : 'Ascending'}</b>"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="${q.dir === 'desc' ? 'M12 5v14M6 13l6 6 6-6' : 'M12 19V5M6 11l6-6 6 6'}"/></svg></button>`;
  const buckets = q => { const b = BUCKETS.findIndex(x => x[2] === q.minStars && x[3] === q.maxStars); return `<div class="pills v-buckets" aria-label="Difficulty">${BUCKETS.map(([l, s], i) => `<button type="button" aria-pressed="${b === i}" data-bucket="${i}"><b>${l}</b><small>${s}</small></button>`).join('')}</div>`; };
  function bar() {
    if (S.q.view === 'type') return typeBar();
    const q = S.q;
    return `<div class="container v-mbar">
      <div class="v-mrow">${views()}</div>
      <form class="v-mrow" id="v-mfind"><label class="field v-mq"><svg class="ico" aria-hidden="true"><use href="#i-search"/></svg><span class="sr">Search maps</span><input id="v-mq" type="search" placeholder="Search by title" value="${esc(q.filter)}" autocomplete="off"></label>
        <label class="b-switch"><input type="checkbox" id="v-explicit" ${q.explicit ? 'checked' : ''}><i aria-hidden="true"></i><span>Show explicit</span></label>
        <button class="btn v-advb" type="button" data-adv aria-expanded="${S.adv || Boolean(q.author || q.tags)}">Advanced Filters</button></form>
      ${S.adv || q.author || q.tags ? `<form class="v-mrow v-adv" id="v-madv"><label class="field"><span class="sr">Mapper</span><input id="v-author" placeholder="Mapper" value="${esc(q.author)}" autocomplete="off"></label><label class="field"><span class="sr">Tags</span><input id="v-tags" placeholder="Tags" value="${esc(q.tags)}" autocomplete="off"></label><button class="btn" type="submit">Apply</button>${q.author || q.tags ? '<button class="btn" type="button" data-clear-adv>Clear</button>' : ''}</form>` : ''}
      <div class="v-mrow v-mpills">
        <div class="pills" aria-label="Ranked status">${STATUSES.map(([k, l]) => `<button type="button" aria-pressed="${q.status === k}" data-status="${k}">${l}</button>`).join('')}</div>
        ${buckets(q)}
        <div class="pills" aria-label="Sort">${SORTS.map(([k, l]) => `<button type="button" aria-pressed="${q.sort === k}" data-sort="${k}">${l}</button>`).join('')}</div>
        ${dirButton(q)}
      </div></div>`;
  }
  // Reimagined Search: the title and mapper, the server's statuses and types, quantum, difficulty, length and order.
  function typeBar() {
    const q = S.q, t = S.types, l = LENGTHS.findIndex(x => x[2] === q.minLength && x[3] === q.maxLength);
    // Without online history only the tabs: the panel below offers it.
    if (t === null) return `<div class="container v-mbar"><div class="v-mrow">${views()}</div>${note()}</div>`;
    const statuses = [...(t?.statuses || [{id: 'RANKED', label: 'Ranked'}, {id: 'QUALIFIED', label: 'Qualified'}]).map(s => [s.id, s.label]), ['BOTH', 'Both']];
    return `<div class="container v-mbar">
      <div class="v-mrow">${views()}</div>
      ${note()}
      <form class="v-mrow" id="v-tfind"><label class="field v-mq"><svg class="ico" aria-hidden="true"><use href="#i-search"/></svg><span class="sr">Title</span><input id="v-mq" type="search" placeholder="Search by title" value="${esc(q.filter)}" autocomplete="off"></label>
        <label class="field v-tmapper"><span class="sr">Mapper</span><input id="v-author" placeholder="Mapper" value="${esc(q.author)}" autocomplete="off"></label>
        <label class="b-switch"><input type="checkbox" id="v-explicit" ${q.explicit ? 'checked' : ''}><i aria-hidden="true"></i><span>Show explicit</span></label>
        ${S.mine ? `<label class="b-switch"><input type="checkbox" id="v-nottop" ${q.notTop ? 'checked' : ''}><i aria-hidden="true"></i><span>Not in my top 100</span></label>` : ''}</form>
      <div class="v-mrow v-mpills">
        <div class="pills" aria-label="Status">${statuses.map(([k, n]) => `<button type="button" aria-pressed="${q.status === k}" data-status="${esc(k)}">${esc(n)}</button>`).join('')}</div>
        ${t?.types?.length ? `<div class="pills" aria-label="Map type">${t.types.map(x => `<button type="button" aria-pressed="${q.types.includes(x.id)}" data-type="${esc(x.id)}">${esc(x.label)}</button>`).join('')}</div>` : ''}
        <div class="pills" aria-label="Quantum">${QUANTUM.map(([k, n]) => `<button type="button" aria-pressed="${q.quantum === k}" data-quantum="${k}">${n}</button>`).join('')}</div>
      </div>
      <div class="v-mrow v-mpills">
        ${buckets(q)}
        <div class="pills v-buckets" aria-label="Length">${LENGTHS.map(([n, s], i) => `<button type="button" aria-pressed="${l === i}" data-length="${i}"><b>${n}</b><small>${s}</small></button>`).join('')}</div>
        <div class="v-msort"><div class="pills" aria-label="Sort">${TYPE_SORTS.map(([k, n]) => `<button type="button" aria-pressed="${q.sort === k}" data-sort="${k}">${n}</button>`).join('')}</div>
        ${dirButton(q)}</div>
      </div></div>`;
  }
  // The maps shown: Reimagined Search leaves out the player's own top 100 when asked. All maps names the types the history
  // service or this browser already know (S.kinds).
  function shown() {
    const d = S.data;
    if (!d) return [];
    const list = S.q.view === 'type' && S.q.notTop && S.mine ? d.maps.filter(m => !S.mine.has(m.hash)) : d.maps;
    return list.map(m => {
      const k = m.type ? null : S.kinds.get(m.hash);
      return {...m, typeLabel: typeName(m.type || k?.kind), quantum: m.type ? m.quantum : k?.quantum === true};
    });
  }
  function grid() {
    const d = S.data;
    if (!S.ok) return `<div class="v-notice"><h2>Before you browse community maps</h2>
      <p>Community members upload the maps available here. Rhythia cannot guarantee that every upload is correctly licensed or that its uploader holds all necessary rights.</p>
      <p>Please send any report, including copyright or licensing concerns, to <a href="mailto:support@rhythia.com">support@rhythia.com</a>.</p>
      <p>Rhythia.com is an independent community portal for Rhythia and Sound Space implementations.</p>
      <button class="btn primary" type="button" data-notice>I understand</button></div>`;
    if (S.q.view === 'type' && S.types === null) return `<div class="v-tneed"><b>Reimagined Search uses online history</b>
      <p>It runs on Reimagined's history service. Turning it on switches on online history everywhere: the public IDs of the players and maps you view, these filters and an anonymous key go to rhythia.shuriel.com. All maps works without it.</p>
      <button class="btn" type="button" data-online>Turn on online history</button></div>`;
    const list = shown();
    if (!d) return `<div class="h-maps v-mgrid">${Array.from({length: 12}, () => '<div class="skeleton" style="aspect-ratio:4/3.2;border-radius:16px"></div>').join('')}</div>`;
    if (!list.length) return `<div class="empty" style="padding:72px 0"><b>No maps found</b>${d.maps.length ? 'Every map on this page is in your top 100.' : 'Try other filters.'}</div>`;
    const hidden = d.maps.length - list.length;
    return `${hidden ? `<p class="v-thidden">${hidden} ${hidden === 1 ? 'map' : 'maps'} from your top 100 not shown on this page.</p>` : ''}<div class="h-maps v-mgrid ${S.enter ? 'anim' : ''} ${S.loading ? 'busy' : ''}">${list.map(mapTile).join('')}</div>`;
  }
  // Under the tabs of Reimagined Search, before its filters, with online history or not: whose search this is, what it covers and how
  // sure its types are (the server's words when known).
  function note() {
    if (S.q.view !== 'type' || !S.ok) return '';
    const n = S.types?.points?.length ? S.types : SEARCH_NOTE;
    return `<div class="v-tnote"><p><b>Reimagined Search</b><span>${esc(n.note || SEARCH_NOTE.note)}</span></p><ul>${n.points.map(p => `<li>${esc(p)}</li>`).join('')}</ul></div>`;
  }
  function pager() {
    const d = S.data; if (!S.ok || !d || d.total <= d.perPage) return '';
    const pages = S.q.view === 'type' ? d.pages : Math.ceil(d.total / d.perPage);
    return pageNumbers(S.q.page, pages, '', {perPage: d.perPage, total: S.q.view === 'type' ? Math.min(d.total, d.pages * d.perPage) : d.total, noun: 'maps'});
  }
  function render() {
    if (ac.signal.aborted) return;
    $('#hero').innerHTML = '';
    $('#body').innerHTML = `<div class="b-page v-mpage ${S.enter ? 'enter' : ''}">${head()}<div id="v-mbar">${bar()}</div><section class="container v-sec v-mlist"><div id="v-mgrid">${grid()}</div><div id="v-mpager">${pager()}</div></section><div style="height:96px"></div></div>`;
  }
  function refresh() {
    if (ac.signal.aborted) return;
    if (!$('.v-mpage')) return render();
    const f = R.activeElement?.id;
    morph($('#v-mbar'), bar()); morph($('#v-mgrid'), grid()); morph($('#v-mpager'), pager());
    if (f === 'v-mq' || f === 'v-author') { const i = $('#' + f); i?.focus(); i?.setSelectionRange(i.value.length, i.value.length); }
  }
  // The search as the history service takes it.
  function searchOf(q) {
    const b = {statuses: q.status === 'BOTH' ? ['RANKED', 'QUALIFIED'] : [q.status], quantum: q.quantum, explicit: q.explicit, order: q.sort, reverse: q.dir === 'asc', page: Math.min(q.page, 40)};
    if (q.types.length) b.types = q.types;
    if (q.minStars || q.maxStars !== 20) b.stars = {min: q.minStars, max: q.maxStars};
    if (q.minLength || q.maxLength) b.length = {...(q.minLength ? {min: q.minLength} : {}), ...(q.maxLength ? {max: q.maxLength} : {})};
    if (q.filter) b.title = q.filter.slice(0, 64);
    if (q.author) b.mapper = q.author.slice(0, 64);
    return b;
  }
  async function load() {
    const seq = ++S.seq, q = {...S.q};
    S.loading = true;
    if (q.view === 'type') {
      // The search has at most 40 pages; a later page in the address shows the last one.
      if (q.page > 40) S.q.page = q.page = 40;
      // Asked every time (it is kept after the first answer), so online history turned off since then shows the offer.
      let typesError = '';
      S.types = await Data().mapSearchTypes(ac.signal).catch(err => { typesError = err?.message || ''; return undefined; });
      if (seq !== S.seq) return;
      if (S.types && S.mine === undefined) S.mine = await Data().myTopMaps(ac.signal).catch(() => null);
      if (seq !== S.seq) return;
      if (S.types === null) { S.data = null; S.loading = false; refresh(); return; }
      if (S.types === undefined) { S.data = null; S.loading = false; refresh(); $('#v-mgrid').innerHTML = `<div class="empty" style="padding:72px 0"><b>The history service did not answer.</b>${esc(/^(Too many|This browser)/.test(typesError) ? typesError : 'Try again in a moment.')}</div>`; return; }
      S.data = null;
      refresh();
      try {
        const d = await Data().mapSearch(searchOf(q), ac.signal);
        if (seq !== S.seq) return;
        S.data = d;
      } catch (err) {
        if (seq !== S.seq || ac.signal.aborted) return;
        S.loading = false;
        $('#v-mgrid').innerHTML = `<div class="empty" style="padding:72px 0"><b>Maps could not be searched.</b>${esc(err.message)}</div>`;
        return;
      }
      S.loading = false;
      refresh();
      S.enter = false;
      return;
    }
    const snap = await Data().mapsSnapshot(q).catch(() => null);
    if (seq !== S.seq) return;
    if (snap) S.data = snap;
    refresh();
    try {
      const d = await Data().maps(q, ac.signal);
      if (seq !== S.seq) return;
      S.data = d;
    } catch (err) {
      if (seq !== S.seq || ac.signal.aborted) return;
      if (!S.data) $('#v-mgrid').innerHTML = `<div class="empty" style="padding:72px 0"><b>Maps could not be loaded.</b>${esc(err.message)}</div>`;
      else ui.toast('Showing the saved list; Rhythia did not answer.');
    }
    S.loading = false;
    refresh();
    S.enter = false;
    // The types already known (online history only; no map file is read), named on the cards once they arrive.
    const ids = (S.data?.maps || []).map(m => m.hash).filter(h => h && !S.kinds.has(h));
    if (!ids.length) return;
    const known = await Data().knownStyles(ids, ac.signal).catch(() => null);
    if (!known?.size || seq !== S.seq) return;
    for (const [id, s] of known) S.kinds.set(id, s);
    morph($('#v-mgrid'), grid());
  }

  R.addEventListener('click', e => {
    const t = e.target.closest('[data-view],[data-status],[data-bucket],[data-length],[data-type],[data-quantum],[data-sort],[data-dir],[data-page],[data-adv],[data-clear-adv],[data-notice],[data-online]');
    if (!t || t.disabled) return;
    const d = t.dataset;
    if (d.view) { if (d.view !== S.q.view) switchTo(d.view); return; }
    if (d.status) { if (d.status !== S.q.status) go({status: d.status, page: 1}); return; }
    if (d.bucket) { const [, , lo, hi] = BUCKETS[Number(d.bucket)]; go({minStars: lo, maxStars: hi, page: 1}); return; }
    if (d.length) { const [, , lo, hi] = LENGTHS[Number(d.length)]; go({minLength: lo, maxLength: hi, page: 1}); return; }
    if (d.type) { const on = S.q.types.includes(d.type); go({types: on ? S.q.types.filter(x => x !== d.type) : [...S.q.types, d.type], page: 1}); return; }
    if (d.quantum) { if (d.quantum !== S.q.quantum) go({quantum: d.quantum, page: 1}); return; }
    if (d.sort) { if (d.sort !== S.q.sort) go({sort: d.sort, page: 1}); return; }
    if ('dir' in d) { go({dir: S.q.dir === 'desc' ? 'asc' : 'desc', page: 1}); return; }
    if (d.page) { go({page: Number(d.page)}); const el = $('.v-mlist'); if (el && el.getBoundingClientRect().top < 0) scrollTo({top: el.getBoundingClientRect().top + scrollY - 120, behavior: REDUCED ? 'auto' : 'smooth'}); return; }
    if ('adv' in d) { S.adv = !S.adv; morph($('#v-mbar'), bar()); if (S.adv) $('#v-author')?.focus(); return; }
    if ('clearAdv' in d) { S.adv = false; go({author: '', tags: '', page: 1}); return; }
    // Same acknowledgement as Rhythia's own (one week), so either page counts.
    if ('notice' in d) { try { localStorage.setItem(NOTICE, JSON.stringify({version: 1, expiresAt: Date.now() + 7 * 864e5})); } catch (_) {} S.ok = true; refresh(); return; }
    if ('online' in d) {
      t.disabled = true;
      Promise.resolve(RhythiaX.CommunityConsentNotice?.turnOn?.(e)).then(ok => {
        if (!ok) { t.disabled = false; ui.toast('Online history not turned on. Try again.'); return; }
        S.types = undefined; load();
      });
    }
  }, sig);
  let typing = 0;
  R.addEventListener('input', e => {
    if (e.target.id !== 'v-mq' && !(e.target.id === 'v-author' && S.q.view === 'type')) return;
    clearTimeout(typing);
    const field = e.target.id === 'v-mq' ? 'filter' : 'author', v = e.target.value.trim();
    typing = setTimeout(() => { if (v !== S.q[field]) go({[field]: v, page: 1}); }, 350);
  }, sig);
  R.addEventListener('submit', e => {
    if (e.target.id === 'v-mfind' || e.target.id === 'v-tfind') {
      e.preventDefault(); clearTimeout(typing);
      const v = $('#v-mq').value.trim(), a = $('#v-author')?.value.trim();
      if (v !== S.q.filter || (e.target.id === 'v-tfind' && a !== S.q.author)) go({filter: v, ...(e.target.id === 'v-tfind' ? {author: a} : {}), page: 1});
    }
    if (e.target.id === 'v-madv') { e.preventDefault(); go({author: $('#v-author').value.trim(), tags: $('#v-tags').value.trim(), page: 1}); }
  }, sig);
  R.addEventListener('change', e => {
    if (e.target.id === 'v-explicit') {
      explicit = e.target.checked; try { localStorage.setItem('rhythiax_exodus_maps_explicit', explicit ? '1' : '0'); } catch (_) {}
      // The address follows back to page 1, so a later sync does not load the old page again.
      const was = parse().page;
      S.q = {...S.q, explicit, page: 1}; load();
      if (was > 1) go({page: 1});
    }
    if (e.target.id === 'v-nottop') go({notTop: e.target.checked});
  }, sig);
  render();
  load();

  return {
    state: () => ({}), idle: () => true, relayout() {},
    page() { const q = parse(); if (urlOf(q) === urlOf(S.q)) return; S.q = q; load(); },
    destroy() { ac.abort(); ui.hide(); clearTimeout(typing); },
  };
}

K().page('maps', maps);
})();
