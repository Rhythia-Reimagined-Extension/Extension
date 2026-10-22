// =============================================
// Reimagined for Rhythia — Exodus collections
// =============================================
// /collections, /collections/own and /collections/:id.

var RhythiaX = RhythiaX || {};

(function () {
'use strict';
const K = () => RhythiaX.ExodusKit;
const {SITE, Data, esc, fmt, REDUCED, diff, status, pager, spreadHtml, hoursMin, avgStars, morph} = RhythiaX.ExodusKit;

/* ════════════════════ Collections ════════════════════ */
function collections(host, ctx) {
  const R = host.shadowRoot, ac = new AbortController(), sig = {signal: ac.signal}, $ = s => R.querySelector(s);
  const ui = K().shell(R, sig, ctx);
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
      ? `${own ? '<a class="btn" href="/collections">All collections</a>' : '<a class="btn" href="/collections/own">Your collections</a>'}<button class="btn primary" type="button" data-native-click="Create collection">Create collection</button>`
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
    $('#hero').innerHTML = '';
    $('#body').innerHTML = `<div class="b-page v-mpage c-page ${S.enter ? 'enter' : ''}">${head()}<div id="v-mbar">${bar()}</div><section class="container v-sec v-mlist"><div id="c-grid">${grid()}</div><div id="v-mpager">${S.data ? pager(S.q.page, S.data.pages) : ''}</div></section><div style="height:96px"></div></div>`;
  }
  function refresh() {
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

/* ════════════════════ Collection ════════════════════ */
const STATUS_F = [['ALL', 'All maps'], ['RANKED', 'Ranked'], ['UNRANKED', 'Unranked'], ['QUALIFIED', 'Qualified']];
const C_SORTS = [['order', 'Collection order'], ['stars', 'Star rating'], ['length', 'Length'], ['plays', 'Most played']];
function collection(host, ctx) {
  const R = host.shadowRoot, ac = new AbortController(), sig = {signal: ac.signal}, $ = s => R.querySelector(s);
  const ui = K().shell(R, sig, ctx);
  const id = Number(ctx.id);
  const S = {d: null, me: undefined, status: 'ALL', sort: 'order', dir: 'desc', shown: 30, enter: true, seq: 0, removing: 0};

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
    const art = maps.slice(0, 4).map(m => `<i style="background-image:url('${esc(m.img || '')}')"></i>`).join('');
    const acts = [`<button class="btn primary" type="button" data-native-click="Download all" data-tip="<b>Download all</b><small>Rhythia’s own download: one .zip with every map file</small>"><svg class="ico" aria-hidden="true"><use href="#i-dl"/></svg>Download all</button>`];
    if (isOwner()) acts.push('<button class="btn" type="button" data-native-click="Edit collection" data-watch>Edit collection</button>', '<button class="btn danger" type="button" data-native-click="Remove collection" data-watch>Remove collection</button>');
    return `<div class="container c-hero">
        <div class="c-art n${Math.min(4, maps.length)}">${art}</div>
        <div class="v-who"><a class="c-back" href="/collections">Go back to all collections</a>
          <p class="v-by"><a class="v-player" href="/player/${esc(d.owner.id)}">${K().av(d.owner.avatar)}<span>Created by <b>${esc(d.owner.username)}</b></span></a></p>
          <h1>${esc(d.title)}</h1>
          <p class="c-hdesc">${d.description ? esc(d.description) : '<i>No description provided.</i>'}</p>
          <div class="v-chips"><span class="v-chip plain">${d.isList ? 'List layout' : 'Grid layout'}</span><span class="v-chip plain num">${fmt(d.count)} ${d.count === 1 ? 'map' : 'maps'}</span></div>
          <div class="v-act">${acts.join('')}</div></div>
        ${maps.length ? `<div class="c-hspread"><small>Difficulty spread</small>${spreadHtml(counts.slice(0, 14).map((c, i) => c + (i === 13 ? counts.slice(14).reduce((s, x) => s + x, 0) : 0)), true)}</div>` : ''}
      </div>
      ${isOwner() && d.count < 3 ? '<div class="container"><div class="c-warn"><b>Collection visibility warning</b><span>Your collection needs at least <b>3 maps</b> to be publicly visible.</span></div></div>' : ''}
      <div class="container"><div class="v-kpis">
        <div><small>Maps</small><b class="num">${fmt(d.count)}</b></div>
        <div><small>Average stars</small><b class="num">${maps.length ? `★ ${fmt(maps.reduce((s, m) => s + (m.stars || 0), 0) / maps.length, 2)}` : '—'}</b></div>
        <div><small>Ranked</small><b class="num">${fmt(ranked)}<span> of ${fmt(maps.length)}</span></b></div>
        <div data-tip="<b>Playing time</b><small>Every map in the collection, played once at 1×</small>"><small>Playing time</small><b class="num">${hoursMin(total)}</b></div>
      </div></div>`;
  }
  function card(m, i) {
    const [dl, dc] = K().diff(m.difficulty), [sl, sc] = K().status(m), st = statusOf(m);
    const remove = isOwner() ? `<button class="iconbtn c-rm" type="button" data-remove="${esc(m.id)}" aria-label="Remove ${esc(m.title)} from the collection" data-tip="<b>Remove from collection</b>" ${S.removing === m.id ? 'disabled' : ''}><svg class="ico" aria-hidden="true"><use href="#i-x"/></svg></button>` : '';
    if (S.d.isList) return `<div class="c-lrow"><span class="pos num">${fmt(m.order + 1)}</span><a class="h-map" href="/maps/${esc(m.id)}" style="--i:${Math.min(i, 24)}">
      <span class="art" style="background-image:url('${esc(m.img)}')"></span>
      <span class="chips"><span class="h-diff" style="--c:${dc}">${dl}</span><span class="h-star num">★ ${K().fmt(m.stars, 2)}</span></span>
      ${st !== 'RANKED' ? `<span class="v-mflags"><span class="h-diff" style="--c:${sc}">${sl}</span></span>` : ''}
      <span class="plate"><b title="${esc(m.title)}">${esc(m.title)}</b><small><span>by ${esc(m.mapper || 'Unknown')}</span><span class="num">${K().mmss(m.length)}</span><span class="num">${fmt(m.plays)} plays</span></small></span></a>${remove}</div>`;
    return `<div class="c-cell"><a class="h-map" href="/maps/${esc(m.id)}" style="--i:${Math.min(i, 24)}">
      <span class="art" style="background-image:url('${esc(m.img)}')"></span>
      <span class="chips"><span class="h-diff" style="--c:${dc}">${dl}</span><span class="h-star num">★ ${K().fmt(m.stars, 2)}</span></span>
      ${st !== 'RANKED' ? `<span class="v-mflags"><span class="h-diff" style="--c:${sc}">${sl}</span></span>` : ''}
      <span class="plate"><b title="${esc(m.title)}">${esc(m.title)}</b><small><span>by ${esc(m.mapper || 'Unknown')}</span><span class="num">${K().mmss(m.length)}</span><span class="num">${fmt(m.plays)} plays</span></small></span></a>${remove}</div>`;
  }
  function mapsSec() {
    const list = shownMaps(), part = list.slice(0, S.shown);
    return `<section class="container v-sec" id="c-maps"><div class="sec-head"><div><h2>Collection maps</h2><p class="lede">${fmt(list.length)} ${list.length === 1 ? 'item' : 'items'}${S.d.maps.length < S.d.count ? ` · the first ${fmt(S.d.maps.length)} are shown` : ''}</p></div>
        <div class="right"><div class="pills" aria-label="Filter collection maps by status">${STATUS_F.map(([k, l]) => `<button type="button" aria-pressed="${S.status === k}" data-status="${k}">${l}</button>`).join('')}</div>
          <div class="pills" aria-label="Sort">${C_SORTS.map(([k, l]) => `<button type="button" aria-pressed="${S.sort === k}" data-sort="${k}">${l}</button>`).join('')}</div>
          <button class="btn v-dir" type="button" data-dir aria-label="${S.dir === 'desc' ? 'Descending' : 'Ascending'}" data-tip="<b>${S.sort === 'order' ? (S.dir === 'desc' ? 'Collection order' : 'Reversed order') : S.dir === 'desc' ? 'Descending' : 'Ascending'}</b><small>Click to reverse the order</small>"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="${S.dir === 'desc' ? 'M12 5v14M6 13l6 6 6-6' : 'M12 19V5M6 11l6-6 6 6'}"/></svg></button></div></div>
      ${part.length ? `<div class="${S.d.isList ? 'c-list' : 'h-maps c-mgrid'}">${part.map(card).join('')}</div>` : '<div class="empty" style="padding:56px 0"><b>No maps here.</b>Try another filter.</div>'}
      ${list.length > S.shown ? `<div class="v-moreb"><button class="btn" type="button" data-more>Show ${fmt(Math.min(30, list.length - S.shown))} more</button></div>` : ''}</section>`;
  }
  function render() {
    morph($('#hero'), `<section class="v-hero c-h ${S.enter ? 'enter' : ''}"><div class="v-banner" style="background-image:url('${esc(S.d.maps[0]?.img || '')}')"></div>${hero()}</section>`);
    morph($('#body'), `<div class="v-page ${S.enter ? 'enter' : ''}">${mapsSec()}<div style="height:96px"></div></div>`);
    document.title = `${S.d.title} | Rhythia`;
  }
  const redrawMaps = () => morph.outer($('#c-maps'), mapsSec());
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
  // After Rhythia's own dialog (edit, remove) closes, read the collection again.
  let watch = 0;
  function watchDialog() {
    clearInterval(watch);
    let seen = false, ticks = 0;
    watch = setInterval(() => {
      const open = [...document.querySelectorAll('[role="dialog"],[role="alertdialog"]')].some(x => !x.closest('#root'));
      if (open) seen = true;
      if ((seen && !open) || ++ticks > 1200) { clearInterval(watch); if (seen && location.pathname === `/collections/${id}`) load(); }
    }, 500);
  }

  R.addEventListener('click', e => {
    if (e.target.closest('[data-native-x]')) { ctx.showNative(); return; }
    if (e.target.closest('[data-watch]')) { watchDialog(); return; }
    const t = e.target.closest('[data-status],[data-sort],[data-dir],[data-more],[data-remove]');
    if (!t || t.disabled) return;
    const d = t.dataset;
    if (d.status) { S.status = d.status; S.shown = 30; redrawMaps(); return; }
    if (d.sort) { if (d.sort !== S.sort) { S.sort = d.sort; S.dir = 'desc'; S.shown = 30; redrawMaps(); } return; }
    if ('dir' in d) { S.dir = S.dir === 'desc' ? 'asc' : 'desc'; redrawMaps(); return; }
    if ('more' in d) { S.shown += 30; redrawMaps(); return; }
    if (d.remove) { e.preventDefault(); remove(Number(d.remove)); }
  }, sig);

  load();
  Data().signedIn().then(me => { if (ac.signal.aborted) return; S.me = me || null; if (S.d && isOwner()) render(); }).catch(() => { S.me = null; });

  return {
    state: () => ({}), idle: () => !S.removing, relayout() {}, page() {},
    destroy() { ac.abort(); ui.hide(); clearInterval(watch); },
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
@media (max-width:640px){.c-card{grid-template-columns:1fr}.c-spread{height:64px}.c-hero{grid-template-columns:1fr;gap:18px}.c-art{width:112px;height:112px}.md .pattern-row{grid-template-columns:1fr}.g-stream{min-width:0;flex:1 1 40%}.c-lrow{grid-template-columns:32px minmax(0,1fr)}.c-lrow .h-map .plate{width:auto;left:8px;top:auto}.g-entry{padding:18px}}
@media (prefers-reduced-motion:reduce){.c-grid.anim .c-card{animation:none!important}}
`;

K().page('collections', collections, css);
K().page('collection', collection);
})();
