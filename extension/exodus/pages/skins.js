// =============================================
// Reimagined for Rhythia — Exodus skins page
// =============================================
// /skins: Rhythia's skin explorer (RHS packages, cursors, notes, borders and colorsets).

var RhythiaX = RhythiaX || {};

(function () {
'use strict';
const K = () => RhythiaX.ExodusKit;
const {SITE, Data, esc, fmt, REDUCED, ago, fullDate, av, shell, pager: pageNumbers, morph} = RhythiaX.ExodusKit;

/* ════════════════════ Skins ════════════════════ */
const SKIN_TYPES = [['rhs', 'RHS', 'RHS skin'], ['cursor', 'Cursors', 'cursor'], ['note', 'Notes', 'note'], ['border', 'Borders', 'border'], ['colorset', 'Colorsets', 'colorset']];
const SKIN_SORTS = [['newest', 'Newest'], ['downloads', 'Downloads']];
const SKIN_NOTICE = 'rhythia_community_skins_notice_v1';
// Cursors, notes and borders are transparent images; the backdrop decides what shows behind them.
const BACKDROPS = [['dark', 'Dark'], ['light', 'Light'], ['check', 'Checkered']];
const shareUrl = id => `https://production.rhythia.com/api/getSkinAssetShare?assetId=${encodeURIComponent(id)}&download=1`;
const bytes = n => n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1048576).toFixed(1)} MB`;
const TRASH = '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/></svg>';
async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch (_) {}
  const t = document.createElement('textarea');
  t.value = text; t.style.cssText = 'position:fixed;left:-9999px;opacity:0';
  document.body.appendChild(t); t.select();
  let ok = false; try { ok = document.execCommand('copy'); } catch (_) {}
  t.remove();
  return ok;
}
// A colorset's values reach a style attribute, so only plain colour tokens pass: #rgb, #rgba, #rrggbb, #rrggbbaa,
// rgb()/rgba()/hsl()/hsla() with numbers only, or a few colour names. Anything else is drawn as an empty swatch.
const COLOR_NAMES = new Set(['black', 'white', 'gray', 'grey', 'silver', 'red', 'maroon', 'orange', 'yellow', 'olive', 'lime', 'green', 'teal', 'cyan', 'aqua', 'blue', 'navy', 'purple', 'magenta', 'fuchsia', 'pink', 'brown', 'transparent']);
const COLOR_FN = /^(?:rgba?|hsla?)\(\s*[-+]?[\d.]+(?:%|deg|turn|rad|grad)?(?:\s*[,\s/]\s*[-+]?[\d.]+%?){2,3}\s*\)$/i;
const cleanColor = c => {
  const s = typeof c === 'string' ? c.trim() : '';
  return s.length <= 64 && (/^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(s) || COLOR_FN.test(s) || COLOR_NAMES.has(s.toLowerCase())) ? s : '';
};
function colorGrid(colors, cls = '') {
  const n = Math.ceil(Math.sqrt(colors.length)), rows = Math.ceil(colors.length / n);
  return `<span class="v-cset ${cls}" style="grid-template-columns:repeat(${n},1fr);aspect-ratio:${n}/${rows}" role="img" aria-label="${colors.length} color preview">${colors.map(raw => { const c = cleanColor(raw); return c ? `<i style="background:${esc(c)}"${cls ? ` data-hex="${esc(c)}" data-tip="<b>${esc(c)}</b><small>Click to copy</small>"` : ''}></i>` : `<i class="bad"${cls ? ' data-tip="<b>Not a colour</b><small>This value is not drawn</small>"' : ''}></i>`; }).join('')}</span>`;
}

function skins(host, ctx) {
  const R = host.shadowRoot, ac = new AbortController(), sig = {signal: ac.signal}, $ = s => R.querySelector(s);
  const ui = shell(R, sig);
  let bg = 'dark'; try { bg = localStorage.getItem('rhythiax_exodus_skins_bg') || 'dark'; } catch (_) {}
  const S = {q: parse(), data: null, counts: null, loading: false, seq: 0, enter: true, ok: noticeOk(), me: null, bg, open: null, confirm: false, deleting: false};
  const dlg = R.getElementById('cmp');

  // The same address as Rhythia's skins page: type, search, sort, sortDirection, page. Exodus adds owner (an uploader's id).
  function parse() {
    const p = new URLSearchParams(location.search), type = p.get('type');
    return {
      type: SKIN_TYPES.some(([k]) => k === type) ? type : 'rhs', search: (p.get('search') || '').slice(0, 100),
      sort: p.get('sort') === 'downloads' ? 'downloads' : 'newest', dir: p.get('sortDirection') === 'asc' ? 'asc' : 'desc',
      page: Math.max(1, parseInt(p.get('page'), 10) || 1), owner: /^\d+$/.test(p.get('owner') || '') ? p.get('owner') : '',
    };
  }
  function urlOf(q) {
    const p = new URLSearchParams();
    if (q.type !== 'rhs') p.set('type', q.type);
    if (q.search) p.set('search', q.search);
    if (q.sort !== 'newest') p.set('sort', q.sort);
    if (q.dir !== 'desc') p.set('sortDirection', q.dir);
    if (q.page > 1) p.set('page', String(q.page));
    if (q.owner) p.set('owner', q.owner);
    const s = p.toString();
    return `/skins${s ? '?' + s : ''}`;
  }
  const go = patch => ctx.go(urlOf({...S.q, ...patch}));
  function noticeOk() {
    try { const v = JSON.parse(localStorage.getItem(SKIN_NOTICE) || 'null'); return v?.version === 1 && v.expiresAt > Date.now(); } catch (_) { return false; }
  }
  const typeOf = k => SKIN_TYPES.find(t => t[0] === k) || SKIN_TYPES[0];
  const canDelete = a => Boolean(S.me && (S.me.id === a.owner.id || (S.me.badges || []).includes('Global Moderator')));
  const findAsset = id => S.data?.assets.find(a => a.id === id);
  const ownerName = () => S.data?.assets[0]?.owner.username || `player ${S.q.owner}`;
  const keepFocus = f => { if (f === 'v-sq') { const i = $('#v-sq'); i?.focus(); i?.setSelectionRange(i.value.length, i.value.length); } };

  function head() {
    return `<section class="container b-head"><div class="b-title"><img src="${SITE}/skins.png" alt="" class="b-mascot"><div><span class="cap">Skins</span><h1>Browse community skins and game assets</h1><p>Discover community skins, colorsets, cursors, notes, and playfield borders.</p></div></div>
      <aside class="v-maps-links"><button class="btn" type="button" data-native-click="Upload asset">Upload asset</button></aside></section>`;
  }
  function bgPills() {
    return `<div class="pills v-bgp" aria-label="Background">${BACKDROPS.map(([k, l]) => `<button type="button" aria-pressed="${S.bg === k}" data-bg="${k}">${l}</button>`).join('')}</div>`;
  }
  function bar() {
    const q = S.q, [, label] = typeOf(q.type), mine = Boolean(S.me) && String(S.me.id) === q.owner;
    return `<div class="container v-mbar">
      <form class="v-mrow" id="v-sfind"><label class="field v-mq"><svg class="ico" aria-hidden="true"><use href="#i-search"/></svg><span class="sr">Search ${esc(label.toLowerCase())}</span><input id="v-sq" type="search" maxlength="100" placeholder="Search ${esc(label.toLowerCase())} by name..." value="${esc(q.search)}" autocomplete="off"></label>
        ${S.me ? `<label class="b-switch"><input type="checkbox" id="v-mine" ${mine ? 'checked' : ''}><i aria-hidden="true"></i><span>Your uploads</span></label>` : ''}
        ${q.owner && !mine ? `<span class="v-owner">Uploads by <b>${esc(ownerName())}</b><button class="iconbtn" type="button" data-clear-owner aria-label="Show every uploader"><svg class="ico" aria-hidden="true"><use href="#i-x"/></svg></button></span>` : ''}</form>
      <div class="v-mrow v-mpills">
        <div class="pills v-buckets" aria-label="Asset type">${SKIN_TYPES.map(([k, l]) => { const n = S.counts?.[k]; return `<button type="button" aria-pressed="${q.type === k}" data-type="${k}"><b>${l}</b><small class="num">${n == null ? '&nbsp;' : fmt(n)}</small></button>`; }).join('')}</div>
        <div class="pills" aria-label="Sort">${SKIN_SORTS.map(([k, l]) => `<button type="button" aria-pressed="${q.sort === k}" data-sort="${k}">${l}</button>`).join('')}</div>
        <button class="btn v-dir" type="button" data-dir aria-label="${q.dir === 'desc' ? 'Descending' : 'Ascending'}" data-tip="<b>${q.dir === 'desc' ? 'Descending' : 'Ascending'}</b>"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="${q.dir === 'desc' ? 'M12 5v14M6 13l6 6 6-6' : 'M12 19V5M6 11l6-6 6 6'}"/></svg></button>
        ${['cursor', 'note', 'border'].includes(q.type) ? bgPills() : ''}
      </div></div>`;
  }
  function art(a, big = false) {
    const t = a.assetType;
    if (t === 'colorset') return Array.isArray(a.colors) && a.colors.length ? colorGrid(a.colors, big ? 'big' : '') : '<span class="v-nopv"><b>Preview unavailable</b></span>';
    const src = t === 'rhs' ? a.previewUrl : a.previewUrl || a.url;
    if (!src) return `<span class="v-nopv"><b>${t === 'rhs' ? 'Preview unavailable' : 'Image unavailable'}</b></span>`;
    return `<img src="${esc(src)}" alt="${esc(a.name)} preview" ${big ? '' : 'loading="lazy"'} data-kind="${t}">`;
  }
  function card(a, i) {
    const n = a.downloadCount;
    return `<article class="v-skin" style="--i:${Math.min(i, 24)}">
      <button class="v-skart ${a.assetType === 'rhs' ? 'wide' : ''} ${a.assetType === 'colorset' ? 'cs' : ''}" type="button" data-open="${esc(a.id)}" aria-label="Open ${esc(a.name)}">${art(a)}</button>
      ${canDelete(a) ? `<button class="iconbtn v-skdel" type="button" data-del="${esc(a.id)}" aria-label="Delete ${esc(a.name)}">${TRASH}</button>` : ''}
      <div class="v-skbody"><h3 title="${esc(a.name)}">${esc(a.name)}</h3>
        <a class="v-skby" href="/player/${esc(a.owner.id)}">${av(a.owner.avatarUrl)}<span>${esc(a.owner.username)}</span></a>
        <div class="v-skmeta"><span class="num">${bytes(a.sizeBytes)}</span><span class="num">${fmt(n)} ${n === 1 ? 'download' : 'downloads'}</span><span data-tip="<b>${esc(fullDate(a.createdAt))}</b>">${esc(ago(a.createdAt))}</span></div>
        <div class="v-skact"><a class="btn" href="${esc(shareUrl(a.id))}" target="_blank" rel="noreferrer"><svg class="ico" aria-hidden="true"><use href="#i-dl"/></svg>Download</a><button class="btn v-sq" type="button" data-copy="${esc(a.id)}" aria-label="Copy share link for ${esc(a.name)}" data-tip="<b>Copy link</b>"><svg class="ico" aria-hidden="true"><use href="#i-link"/></svg></button></div>
      </div></article>`;
  }
  function grid() {
    const d = S.data, [, label, one] = typeOf(S.q.type);
    if (!S.ok) return `<div class="v-notice"><h2>Before you browse community skins</h2>
      <p>Community members upload the skins available here. Rhythia cannot guarantee that every upload is correctly licensed or that its uploader holds all necessary rights.</p>
      <p>Please send any report, including copyright or licensing concerns, to <a href="mailto:support@rhythia.com">support@rhythia.com</a>.</p>
      <p>Rhythia.com is an independent community portal for Rhythia and Sound Space implementations.</p>
      <button class="btn primary" type="button" data-notice>I understand</button></div>`;
    if (!d) return `<div class="v-skins ${S.q.type === 'rhs' ? 'rhs' : ''}">${Array.from({length: 12}, () => `<div class="skeleton" style="height:auto;aspect-ratio:${S.q.type === 'rhs' ? '4/4.1' : '4/5.6'};border-radius:16px"></div>`).join('')}</div>`;
    if (!d.assets.length) return S.q.search || S.q.owner
      ? `<div class="empty" style="padding:72px 0"><b>No ${esc(label.toLowerCase())} found</b>Try a different search.</div>`
      : `<div class="empty" style="padding:72px 0"><b>No ${esc(label.toLowerCase())} yet</b>Be the first to share a ${esc(one)}.</div>`;
    return `<div class="v-skins ${S.q.type === 'rhs' ? 'rhs' : ''} bg-${S.bg} ${S.enter ? 'anim' : ''} ${S.loading ? 'busy' : ''}">${d.assets.map(card).join('')}</div>`;
  }
  function pager() {
    const d = S.data; if (!S.ok || !d || d.total <= d.perPage) return '';
    const [, label] = typeOf(S.q.type);
    return pageNumbers(S.q.page, Math.ceil(d.total / d.perPage), '', {perPage: d.perPage, total: d.total, noun: label.toLowerCase()});
  }

  // One asset, larger: the whole preview, its details, and for colorsets every color.
  const closeBtn = '<button class="iconbtn" type="button" data-close aria-label="Close"><svg class="ico" aria-hidden="true"><use href="#i-x"/></svg></button>';
  function viewer(a) {
    const [, , one] = typeOf(a.assetType), image = ['cursor', 'note', 'border'].includes(a.assetType);
    if (S.confirm) return `<div class="cmp-head"><h2 id="cmp-title">Delete this asset?</h2>${closeBtn}</div>
      <div class="cmp-body v-skconf"><p>${esc(a.name)} will be removed from the explorer and can no longer be downloaded from its current link.</p>
        <div class="v-skact"><button class="btn" type="button" data-unconfirm ${S.deleting ? 'disabled' : ''}>Cancel</button><button class="btn danger" type="button" data-delete="${esc(a.id)}" ${S.deleting ? 'disabled' : ''}>${S.deleting ? 'Deleting…' : 'Delete asset'}</button></div></div>`;
    const facts = [
      ['Type', esc(one[0].toUpperCase() + one.slice(1))], ['File', esc(a.fileName)], ['Size', bytes(a.sizeBytes)],
      ['Downloads', fmt(a.downloadCount)], ['Uploaded', esc(fullDate(a.createdAt))],
      ...(a.assetType === 'colorset' && Array.isArray(a.colors) ? [['Colors', fmt(a.colors.length)]] : []),
      ...(image ? [['Image size', '<span id="v-skdim">—</span>']] : []),
    ];
    return `<div class="cmp-head"><h2 id="cmp-title">${esc(a.name)}</h2>${closeBtn}</div>
      <div class="cmp-body v-skview">
        <div class="v-skbig ${a.assetType} bg-${S.bg}">${art(a, true)}</div>
        <div class="v-skside">
          <a class="v-skby" href="/player/${esc(a.owner.id)}" data-close>${av(a.owner.avatarUrl)}<span>${esc(a.owner.username)}</span></a>
          <dl>${facts.map(([k, v]) => `<div><dt>${k}</dt><dd class="num">${v}</dd></div>`).join('')}</dl>
          ${image ? bgPills() : ''}
          <div class="v-skact col">
            <a class="btn primary" href="${esc(shareUrl(a.id))}" target="_blank" rel="noreferrer"><svg class="ico" aria-hidden="true"><use href="#i-dl"/></svg>Download</a>
            <button class="btn" type="button" data-copy="${esc(a.id)}"><svg class="ico" aria-hidden="true"><use href="#i-link"/></svg>Copy link</button>
            ${a.assetType === 'colorset' && Array.isArray(a.colors) && a.colors.length ? `<button class="btn" type="button" data-copy-colors="${esc(a.id)}">Copy colors</button>` : ''}
            ${String(a.owner.id) !== S.q.owner ? `<button class="btn" type="button" data-owner="${esc(a.owner.id)}">More from ${esc(a.owner.username)}</button>` : ''}
            ${canDelete(a) ? `<button class="btn danger" type="button" data-del="${esc(a.id)}">${TRASH}Delete</button>` : ''}
          </div>
        </div></div>`;
  }
  function openViewer(a, confirm = false) {
    S.open = a; S.confirm = confirm; S.deleting = false;
    dlg.setAttribute('aria-labelledby', 'cmp-title');
    dlg.classList.add('v-skdlg');
    redrawViewer();
    if (!dlg.open) dlg.showModal();
  }
  function redrawViewer() {
    if (!S.open) return;
    dlg.classList.toggle('small', S.confirm);
    dlg.innerHTML = viewer(S.open);
    const img = dlg.querySelector('.v-skbig img'), out = dlg.querySelector('#v-skdim');
    if (!img || !out) return;
    const put = () => { if (img.naturalWidth) out.textContent = `${img.naturalWidth} × ${img.naturalHeight} px`; };
    if (img.complete) put(); else img.addEventListener('load', put, {once: true});
  }
  dlg.addEventListener('close', () => { if (S.open) { S.open = null; dlg.classList.remove('v-skdlg', 'small'); } }, sig);

  function render() {
    $('#hero').innerHTML = '';
    $('#body').innerHTML = `<div class="b-page v-mpage v-skpage ${S.enter ? 'enter' : ''}">${head()}<div id="v-mbar">${bar()}</div><section class="container v-sec v-mlist"><div id="v-mgrid">${grid()}</div><div id="v-mpager">${pager()}</div></section><div style="height:96px"></div></div>`;
  }
  function refresh() {
    if (!$('.v-skpage')) return render();
    const f = R.activeElement?.id;
    morph($('#v-mbar'), bar()); morph($('#v-mgrid'), grid()); morph($('#v-mpager'), pager());
    keepFocus(f);
  }
  async function counts() {
    const q = {...S.q};
    const c = await Data().skinCounts(q, ac.signal).catch(() => null);
    if (!c || q.search !== S.q.search || q.owner !== S.q.owner || !$('#v-mbar')) return;
    S.counts = c;
    const f = R.activeElement?.id;
    morph($('#v-mbar'), bar()); keepFocus(f);
  }
  async function load() {
    const seq = ++S.seq, q = {...S.q};
    S.loading = true;
    const snap = await Data().skinsSnapshot(q).catch(() => null);
    if (seq !== S.seq) return;
    if (snap) S.data = snap;
    refresh();
    try {
      const d = await Data().skins(q, ac.signal);
      if (seq !== S.seq) return;
      S.data = d;
      // Past the last page (after a search or a delete): go to the last one, as Rhythia does.
      const pages = Math.ceil(d.total / d.perPage);
      if (pages > 0 && q.page > pages) { S.loading = false; go({page: pages}); return; }
    } catch (err) {
      if (seq !== S.seq || ac.signal.aborted) return;
      S.loading = false;
      if (!S.data) { $('#v-mgrid').innerHTML = `<div class="empty" style="padding:72px 0"><b>Couldn't load skins</b>${esc(err.message)}<div style="margin-top:14px"><button class="btn" type="button" data-retry>Retry</button></div></div>`; return; }
      ui.toast('Showing the saved list; Rhythia did not answer.');
    }
    S.loading = false;
    refresh();
    S.enter = false;
  }
  async function remove(id) {
    const a = findAsset(id) || S.open;
    if (!a || S.deleting) return;
    S.deleting = true; redrawViewer();
    try {
      await Data().deleteSkin(a.id);
      dlg.close();
      ui.toast(`${a.name} was deleted.`);
      S.counts = null; load(); counts();
    } catch (err) {
      S.deleting = false; redrawViewer();
      ui.toast(`Could not delete: ${err.message}`);
    }
  }
  function setBg(k) {
    S.bg = k; try { localStorage.setItem('rhythiax_exodus_skins_bg', k); } catch (_) {}
    R.querySelectorAll('[data-bg]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.bg === k)));
    R.querySelectorAll('.v-skins, .v-skbig').forEach(el => { el.classList.remove('bg-dark', 'bg-light', 'bg-check'); el.classList.add('bg-' + k); });
  }

  R.addEventListener('click', e => {
    const t = e.target.closest('[data-type],[data-sort],[data-dir],[data-page],[data-notice],[data-open],[data-del],[data-copy],[data-copy-colors],[data-hex],[data-owner],[data-clear-owner],[data-bg],[data-close],[data-unconfirm],[data-delete],[data-retry]');
    if (!t || t.disabled) return;
    const d = t.dataset;
    if (d.type) { if (d.type !== S.q.type) go({type: d.type, page: 1}); return; }
    if (d.sort) { if (d.sort !== S.q.sort) go({sort: d.sort, page: 1}); return; }
    if ('dir' in d) { go({dir: S.q.dir === 'desc' ? 'asc' : 'desc', page: 1}); return; }
    if (d.page) { go({page: Number(d.page)}); const el = $('.v-mlist'); if (el && el.getBoundingClientRect().top < 0) scrollTo({top: el.getBoundingClientRect().top + scrollY - 120, behavior: REDUCED ? 'auto' : 'smooth'}); return; }
    // Same acknowledgement as Rhythia's own (one week), so either page counts.
    if ('notice' in d) { try { localStorage.setItem(SKIN_NOTICE, JSON.stringify({version: 1, expiresAt: Date.now() + 7 * 864e5})); } catch (_) {} S.ok = true; refresh(); return; }
    if ('retry' in d) { load(); return; }
    if (d.bg) { setBg(d.bg); return; }
    if (d.open) { const a = findAsset(d.open); if (a) openViewer(a); return; }
    if (d.del) { const a = findAsset(d.del) || S.open; if (a) openViewer(a, true); return; }
    if ('unconfirm' in d) { S.confirm = false; redrawViewer(); return; }
    if (d.delete) { remove(d.delete); return; }
    if (d.copy) { copyText(shareUrl(d.copy)).then(ok => ui.toast(ok ? 'Share link copied.' : 'Could not copy: the browser blocked clipboard access.')); return; }
    if (d.copyColors) {
      // Only real colours are copied; the values drawn as a neutral swatch are left out.
      const a = findAsset(d.copyColors) || S.open, list = Array.isArray(a?.colors) ? a.colors.map(cleanColor).filter(Boolean) : [];
      if (!list.length) ui.toast('This colorset has no colors to copy.');
      else copyText(list.join('\n')).then(ok => ui.toast(ok ? `${list.length} ${list.length === 1 ? 'color' : 'colors'} copied, one per line.` : 'The browser blocked clipboard access.'));
      return;
    }
    if (d.hex) { copyText(d.hex).then(ok => ui.toast(ok ? `${d.hex} copied.` : 'The browser blocked clipboard access.')); return; }
    if (d.owner) { dlg.close(); go({owner: d.owner, page: 1}); scrollTo({top: 0, behavior: REDUCED ? 'auto' : 'smooth'}); return; }
    if ('clearOwner' in d) { go({owner: '', page: 1}); return; }
    if ('close' in d) dlg.close();
  }, sig);
  // A preview that fails to load shows the same placeholder as one that has none.
  R.addEventListener('error', e => {
    const img = e.target;
    if (img?.tagName !== 'IMG' || !img.dataset.kind || !img.closest('.v-skart, .v-skbig')) return;
    img.outerHTML = `<span class="v-nopv"><b>${img.dataset.kind === 'rhs' ? 'Preview unavailable' : 'Image unavailable'}</b></span>`;
  }, {capture: true, signal: ac.signal});
  let typing = 0;
  R.addEventListener('input', e => {
    if (e.target.id !== 'v-sq') return;
    clearTimeout(typing);
    const v = e.target.value.trim();
    typing = setTimeout(() => { if (v !== S.q.search) go({search: v, page: 1}); }, 350);
  }, sig);
  R.addEventListener('submit', e => {
    if (e.target.id !== 'v-sfind') return;
    e.preventDefault(); clearTimeout(typing);
    const v = $('#v-sq').value.trim(); if (v !== S.q.search) go({search: v, page: 1});
  }, sig);
  R.addEventListener('change', e => {
    if (e.target.id === 'v-mine' && S.me) go({owner: e.target.checked ? String(S.me.id) : '', page: 1});
  }, sig);

  render();
  load(); counts();
  Data().signedIn().then(me => { if (ac.signal.aborted || !me) return; S.me = me; refresh(); }).catch(() => {});

  return {
    state: () => ({}), idle: () => !S.open && !S.deleting, relayout() {},
    page() {
      const q = parse(); if (urlOf(q) === urlOf(S.q)) return;
      const recount = q.search !== S.q.search || q.owner !== S.q.owner;
      S.q = q; if (recount) S.counts = null;
      load(); if (recount) counts();
    },
    destroy() { ac.abort(); ui.hide(); clearTimeout(typing); if (dlg.open) dlg.close(); dlg.classList.remove('v-skdlg', 'small'); },
  };
}

const css = `
.v-skins{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:16px;transition:opacity .2s}
.v-skins.rhs{grid-template-columns:repeat(auto-fill,minmax(260px,1fr))}
.v-skins.busy{opacity:.6;transition:opacity .2s .35s}
.v-skins.anim .v-skin{animation:hRise .5s var(--ease) both;animation-delay:calc(var(--i) * 25ms)}
.v-skin{position:relative;display:flex;flex-direction:column;min-width:0;border-radius:16px;overflow:hidden;background:var(--panel);box-shadow:inset 0 0 0 1px var(--line)}
.v-skart{position:relative;display:grid;place-items:center;width:100%;aspect-ratio:1;padding:0;border:0;border-bottom:1px solid var(--line);overflow:hidden;cursor:zoom-in;background:#08090b}
.v-skart.wide{aspect-ratio:16/9}
.v-skart img{width:100%;height:100%;object-fit:contain;padding:28px;transition:transform .5s var(--ease)}
.v-skart.wide img{object-fit:cover;padding:0}
.v-skart:hover img{transform:scale(1.04)}
.v-skart.cs{padding:20px}
.v-skart .v-cset{width:min(160px,100%)}
.v-skbig{background:#08090b}
.bg-light .v-skart:not(.wide):not(.cs),.v-skbig.bg-light:not(.rhs):not(.colorset){background:#eef0f4}
.bg-check .v-skart:not(.wide):not(.cs),.v-skbig.bg-check:not(.rhs):not(.colorset){background:repeating-conic-gradient(#2a2d35 0 25%,#1a1c22 0 50%) 0 0/20px 20px}
.v-cset{display:grid;gap:1px;width:100%}
.v-cset i{display:block;min-width:0;min-height:0}
.v-cset.big{width:min(420px,100%)}
.v-cset.big i{cursor:copy}
.v-cset.big i:hover{outline:2px solid #fff;outline-offset:-1px}
.v-cset i.bad{background:var(--panel-3)}
.v-cset.big i.bad{cursor:default}
.v-nopv{display:flex;flex-direction:column;align-items:center;gap:4px;padding:0 20px;text-align:center;font-size:13px;color:#a1a7b3}
.v-nopv b{font-weight:650;color:#d3d7de}
.v-nopv small{font-size:12px;color:#7d8491}
.v-skdel{position:absolute;top:10px;right:10px;background:rgba(var(--glass),.75);color:var(--text)}
.v-skdel:hover{background:rgba(229,72,77,.25);color:#fca5a5}
.v-skbody{display:flex;flex-direction:column;gap:8px;padding:14px 16px 16px;min-width:0}
.v-skbody h3{margin:0;font-size:15.5px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.v-skby{display:inline-flex;align-items:center;gap:8px;min-width:0;max-width:100%;font-size:13px;font-weight:600;color:var(--text-2)}
.v-skby span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.v-skby .v-av{width:24px;height:24px}
.v-skby:hover{color:var(--accent-2)}
.v-skmeta{display:flex;flex-wrap:wrap;gap:6px}
.v-skmeta span{display:inline-flex;align-items:center;height:22px;padding:0 8px;border-radius:6px;font-size:12px;font-weight:600;color:var(--text-2);background:var(--panel-2);box-shadow:inset 0 0 0 1px var(--line)}
.v-skact{display:flex;gap:8px;margin-top:4px}
.v-skact .btn{flex:1;min-width:0}
.v-skact .btn.v-sq{flex:none;width:38px;padding:0}
.v-skact.col{flex-direction:column}
.v-skact.col .btn{flex:none;width:100%}
.btn.danger{color:#fca5a5;background:rgba(229,72,77,.12);box-shadow:inset 0 0 0 1px rgba(229,72,77,.35)}
.btn.danger:hover{background:rgba(229,72,77,.22)}
[data-theme="white"] .btn.danger{color:#b91c1c}
dialog.cmp.v-skdlg.small{width:min(520px,calc(100vw - 32px))}
.v-skview{display:grid;grid-template-columns:minmax(0,1fr) 280px;gap:24px;align-items:start}
.v-skbig{display:grid;place-items:center;min-height:320px;border-radius:14px;overflow:hidden;box-shadow:inset 0 0 0 1px var(--line)}
.v-skbig img{display:block;max-width:100%;max-height:calc(100vh - 220px);object-fit:contain}
.v-skbig:not(.rhs) img{padding:32px}
.v-skbig.colorset{padding:28px}
.v-skside{display:flex;flex-direction:column;gap:16px;min-width:0}
.v-skside dl{display:flex;flex-direction:column;margin:0}
.v-skside dl div{display:flex;justify-content:space-between;gap:12px;padding:8px 0;border-bottom:1px solid var(--line);font-size:13.5px}
.v-skside dt{color:var(--muted)}
.v-skside dd{margin:0;text-align:right;font-weight:600;overflow-wrap:anywhere;min-width:0}
.v-skside .v-bgp{align-self:flex-start}
.v-skconf p{margin:0 0 18px;line-height:1.6;color:var(--text-2)}
.v-skconf .v-skact{justify-content:flex-end}
.v-skconf .v-skact .btn{flex:none}
@media (max-width:760px){.v-skview{grid-template-columns:1fr}.v-skbig{min-height:220px}.v-mbar .v-bgp{margin-left:0}.v-skins,.v-skins.rhs{grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:12px}}
@media (prefers-reduced-motion:reduce){.v-skins.anim .v-skin{animation:none!important}}
`;

K().page('skins', skins, css);
})();
