// =============================================
// Reimagined for Rhythia — Exodus map list
// =============================================
// /maps: Rhythia's map list with the same filters it keeps in the address.

var RhythiaX = RhythiaX || {};

(function () {
'use strict';
const K = () => RhythiaX.ExodusKit;
const {SITE, Data, esc, fmt, REDUCED, mmss, diff, status, shell, pager, morph} = RhythiaX.ExodusKit;

/* ════════════════════ Map list ════════════════════ */
const BUCKETS = [['Any', 'All difficulties', 0, 20], ['Beginner', '★ 0–3', 0, 3], ['Intermediate', '★ 3–5', 3, 5], ['Hard', '★ 5–7', 5, 7], ['Expert', '★ 7–20', 7, 20]];
const SORTS = [['newest', 'Newest'], ['playCount', 'Most played'], ['starRating', 'Difficulty'], ['length', 'Length']];
const NOTICE = 'rhythia_community_maps_notice_v1';

function maps(host, ctx) {
  const R = host.shadowRoot, ac = new AbortController(), sig = {signal: ac.signal}, $ = s => R.querySelector(s);
  const ui = shell(R, sig, ctx);
  let explicit = false; try { explicit = localStorage.getItem('rhythiax_exodus_maps_explicit') === '1'; } catch (_) {}
  const S = {q: parse(), data: null, loading: false, seq: 0, enter: true, adv: false, ok: noticeOk()};

  // The same address as Rhythia's map list: filter, status, minStars, maxStars, author, tags, sort, sortDirection, page.
  function parse() {
    const p = new URLSearchParams(location.search), sort = p.get('sort');
    return {
      filter: p.get('filter') || '', status: p.get('status') === 'UNRANKED' ? 'UNRANKED' : 'RANKED',
      minStars: Number(p.get('minStars')) || 0, maxStars: Number(p.get('maxStars')) || 20, author: p.get('author') || '', tags: p.get('tags') || '',
      sort: SORTS.some(([k]) => k === sort) ? sort : 'newest', dir: p.get('sortDirection') === 'asc' ? 'asc' : 'desc',
      page: Math.max(1, parseInt(p.get('page'), 10) || 1), explicit,
    };
  }
  function urlOf(q) {
    const p = new URLSearchParams();
    if (q.filter) p.set('filter', q.filter);
    if (q.status !== 'RANKED') p.set('status', q.status);
    if (q.minStars) p.set('minStars', String(q.minStars));
    if (q.maxStars !== 20) p.set('maxStars', String(q.maxStars));
    if (q.author) p.set('author', q.author);
    if (q.tags) p.set('tags', q.tags);
    if (q.sort !== 'newest') p.set('sort', q.sort);
    if (q.dir !== 'desc') p.set('sortDirection', q.dir);
    if (q.page > 1) p.set('page', String(q.page));
    const s = p.toString();
    return `/maps${s ? '?' + s : ''}`;
  }
  const go = patch => ctx.go(urlOf({...S.q, ...patch}));
  function noticeOk() {
    try { const v = JSON.parse(localStorage.getItem(NOTICE) || 'null'); return v?.version === 1 && v.expiresAt > Date.now(); } catch (_) { return false; }
  }

  function head() {
    return `<section class="container b-head"><div class="b-title"><img src="${SITE}/maps.png" alt="" class="b-mascot"><div><span class="cap">Maps</span><h1>Browse and install community maps</h1><p>Discover, download, and install community maps.</p></div></div>
      <aside class="v-maps-links"><button class="btn" type="button" data-native-click="Ranking Criteria">Ranking Criteria</button><button class="btn" type="button" data-native-click="Copyright">Copyright</button></aside></section>`;
  }
  function bar() {
    const q = S.q, b = BUCKETS.findIndex(x => x[2] === q.minStars && x[3] === q.maxStars);
    return `<div class="container v-mbar">
      <form class="v-mrow" id="v-mfind"><label class="field v-mq"><svg class="ico" aria-hidden="true"><use href="#i-search"/></svg><span class="sr">Search maps</span><input id="v-mq" type="search" placeholder="Search by title" value="${esc(q.filter)}" autocomplete="off"></label>
        <label class="b-switch"><input type="checkbox" id="v-ranked" ${q.status === 'RANKED' ? 'checked' : ''}><i aria-hidden="true"></i><span>Gives RP<small>Show ranked maps only</small></span></label>
        <label class="b-switch"><input type="checkbox" id="v-explicit" ${q.explicit ? 'checked' : ''}><i aria-hidden="true"></i><span>Show explicit<small>Include explicit maps</small></span></label>
        <button class="btn v-advb" type="button" data-adv aria-expanded="${S.adv || Boolean(q.author || q.tags)}">Advanced Filters</button></form>
      ${S.adv || q.author || q.tags ? `<form class="v-mrow v-adv" id="v-madv"><label class="field"><span class="sr">Mapper</span><input id="v-author" placeholder="Mapper" value="${esc(q.author)}" autocomplete="off"></label><label class="field"><span class="sr">Tags</span><input id="v-tags" placeholder="Tags" value="${esc(q.tags)}" autocomplete="off"></label><button class="btn" type="submit">Apply</button>${q.author || q.tags ? '<button class="btn" type="button" data-clear-adv>Clear</button>' : ''}</form>` : ''}
      <div class="v-mrow v-mpills">
        <div class="pills v-buckets" aria-label="Difficulty">${BUCKETS.map(([l, s, lo, hi], i) => `<button type="button" aria-pressed="${b === i}" data-bucket="${i}"><b>${l}</b><small>${s}</small></button>`).join('')}</div>
        <div class="pills" aria-label="Sort">${SORTS.map(([k, l]) => `<button type="button" aria-pressed="${q.sort === k}" data-sort="${k}">${l}</button>`).join('')}</div>
        <button class="btn v-dir" type="button" data-dir aria-label="${q.dir === 'desc' ? 'Descending' : 'Ascending'}" data-tip="<b>${q.dir === 'desc' ? 'Descending' : 'Ascending'}</b><small>Click to reverse the order</small>"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="${q.dir === 'desc' ? 'M12 5v14M6 13l6 6 6-6' : 'M12 19V5M6 11l6-6 6 6'}"/></svg></button>
      </div></div>`;
  }
  function grid() {
    const d = S.data;
    if (!S.ok) return `<div class="v-notice"><h2>Before you browse community maps</h2>
      <p>Community members upload the maps available here. Rhythia cannot guarantee that every upload is correctly licensed or that its uploader holds all necessary rights.</p>
      <p>Please send any report, including copyright or licensing concerns, to <a href="mailto:support@rhythia.com">support@rhythia.com</a>.</p>
      <p>Rhythia.com is an independent community portal for Rhythia and Sound Space implementations.</p>
      <button class="btn primary" type="button" data-notice>I understand</button></div>`;
    if (!d) return `<div class="h-maps v-mgrid">${Array.from({length: 12}, () => '<div class="skeleton" style="aspect-ratio:4/3.2;border-radius:16px"></div>').join('')}</div>`;
    if (!d.maps.length) return '<div class="empty" style="padding:72px 0"><b>No maps found</b>Try other filters.</div>';
    return `<div class="h-maps v-mgrid ${S.enter ? 'anim' : ''} ${S.loading ? 'busy' : ''}">${d.maps.map((m, i) => { const [dl, dc] = diff(m.difficulty), [sl, sc] = status(m); return `<a class="h-map" href="/maps/${esc(m.id)}" style="--i:${Math.min(i, 24)}">
        <span class="art" style="background-image:url('${esc(m.img)}')"></span>
        <span class="chips"><span class="h-diff" style="--c:${dc}">${dl}</span><span class="h-star num">★ ${fmt(m.stars, 2)}</span></span>
        ${m.status !== 'RANKED' || m.explicit ? `<span class="v-mflags">${m.status !== 'RANKED' ? `<span class="h-diff" style="--c:${sc}">${sl}</span>` : ''}${m.explicit ? '<span class="h-diff" style="--c:var(--bad)">Explicit</span>' : ''}</span>` : ''}
        <span class="plate"><b title="${esc(m.title)}">${esc(m.title)}</b><small><span>by ${esc(m.mapper || 'Unknown')}</span><span class="num">${mmss(m.length)}</span><span class="num">${fmt(m.plays)} plays</span></small></span></a>`; }).join('')}</div>`;
  }
  function pager() {
    const d = S.data; if (!S.ok || !d || d.total <= d.perPage) return '';
    const pages = Math.ceil(d.total / d.perPage), p = S.q.page;
    const nums = [...new Set([1, 2, p - 1, p, p + 1, pages - 1, pages])].filter(n => n >= 1 && n <= pages).sort((a, b) => a - b);
    return `<div class="pager"><span class="num">${fmt((p - 1) * d.perPage + 1)}–${fmt(Math.min(p * d.perPage, d.total))} of ${fmt(d.total)} maps</span><div class="pages">
      <button type="button" data-page="${p - 1}" ${p === 1 ? 'disabled' : ''} aria-label="Previous page">‹</button>
      ${nums.map((n, i) => `${i && n - nums[i - 1] > 1 ? '<span>…</span>' : ''}<button type="button" data-page="${n}" ${n === p ? 'aria-current="page"' : ''}>${fmt(n)}</button>`).join('')}
      <button type="button" data-page="${p + 1}" ${p === pages ? 'disabled' : ''} aria-label="Next page">›</button></div></div>`;
  }
  function render() {
    $('#hero').innerHTML = '';
    $('#body').innerHTML = `<div class="b-page v-mpage ${S.enter ? 'enter' : ''}">${head()}<div id="v-mbar">${bar()}</div><section class="container v-sec v-mlist"><div id="v-mgrid">${grid()}</div><div id="v-mpager">${pager()}</div></section><div style="height:96px"></div></div>`;
  }
  function refresh() {
    if (!$('.v-mpage')) return render();
    const f = R.activeElement?.id;
    morph($('#v-mbar'), bar()); morph($('#v-mgrid'), grid()); morph($('#v-mpager'), pager());
    if (f === 'v-mq') { const i = $('#v-mq'); i?.focus(); i?.setSelectionRange(i.value.length, i.value.length); }
  }
  async function load() {
    const seq = ++S.seq, q = {...S.q};
    S.loading = true;
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
  }

  R.addEventListener('click', e => {
    const t = e.target.closest('[data-bucket],[data-sort],[data-dir],[data-page],[data-adv],[data-clear-adv],[data-notice]');
    if (!t || t.disabled) return;
    const d = t.dataset;
    if (d.bucket) { const [, , lo, hi] = BUCKETS[Number(d.bucket)]; go({minStars: lo, maxStars: hi, page: 1}); return; }
    if (d.sort) { if (d.sort !== S.q.sort) go({sort: d.sort, page: 1}); return; }
    if ('dir' in d) { go({dir: S.q.dir === 'desc' ? 'asc' : 'desc', page: 1}); return; }
    if (d.page) { go({page: Number(d.page)}); const el = $('.v-mlist'); if (el && el.getBoundingClientRect().top < 0) scrollTo({top: el.getBoundingClientRect().top + scrollY - 120, behavior: REDUCED ? 'auto' : 'smooth'}); return; }
    if ('adv' in d) { S.adv = !S.adv; morph($('#v-mbar'), bar()); if (S.adv) $('#v-author')?.focus(); return; }
    if ('clearAdv' in d) { S.adv = false; go({author: '', tags: '', page: 1}); return; }
    // Same acknowledgement as Rhythia's own (one week), so either page counts.
    if ('notice' in d) { try { localStorage.setItem(NOTICE, JSON.stringify({version: 1, expiresAt: Date.now() + 7 * 864e5})); } catch (_) {} S.ok = true; refresh(); }
  }, sig);
  let typing = 0;
  R.addEventListener('input', e => {
    if (e.target.id !== 'v-mq') return;
    clearTimeout(typing);
    const v = e.target.value.trim();
    typing = setTimeout(() => { if (v !== S.q.filter) go({filter: v, page: 1}); }, 350);
  }, sig);
  R.addEventListener('submit', e => {
    if (e.target.id === 'v-mfind') { e.preventDefault(); clearTimeout(typing); const v = $('#v-mq').value.trim(); if (v !== S.q.filter) go({filter: v, page: 1}); }
    if (e.target.id === 'v-madv') { e.preventDefault(); go({author: $('#v-author').value.trim(), tags: $('#v-tags').value.trim(), page: 1}); }
  }, sig);
  R.addEventListener('change', e => {
    if (e.target.id === 'v-ranked') go({status: e.target.checked ? 'RANKED' : 'UNRANKED', page: 1});
    if (e.target.id === 'v-explicit') {
      explicit = e.target.checked; try { localStorage.setItem('rhythiax_exodus_maps_explicit', explicit ? '1' : '0'); } catch (_) {}
      S.q = {...S.q, explicit, page: 1}; load();
    }
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
