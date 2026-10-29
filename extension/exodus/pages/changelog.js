// =============================================
// Reimagined for Rhythia — Exodus changelog
// =============================================
// /changelog: Rhythia's public and web streams, and this extension's own release notes.

var RhythiaX = RhythiaX || {};

(function () {
'use strict';
const K = () => RhythiaX.ExodusKit;
const {SITE, Data, esc, REDUCED, dropBroken, plainText} = RhythiaX.ExodusKit;

/* ════════════════════ Changelog ════════════════════ */
// Rhythia's two streams, and this extension's own release notes (as on the 1.2 Reimagined tab).
const STREAMS = {public: ['Public', '#60a5fa'], web: ['Web', '#a78bfa'], reimagined: ['Reimagined', '#f472b6']};
const longDate = d => (/^\d{4}-\d{2}-\d{2}$/.test(d) ? new Date(`${d}T12:00:00Z`).toLocaleDateString('en-GB', {day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC'}) : d || 'Unreleased');
const reimaginedEntries = () => RhythiaX.Releases.entries().catch(() => []);
function changelog(host, ctx) {
  const R = host.shadowRoot, ac = new AbortController(), sig = {signal: ac.signal}, $ = s => R.querySelector(s);
  const ui = K().shell(R, sig);
  const S = {route: parse(), lists: {public: null, web: null, reimagined: null}, more: {public: true, web: true}, busy: false, q: '', enter: true, shown: 20, look: 'exodus'};

  // /changelog/:type/:date (Rhythia's entry pages), the 1.2 address /changelog?view=reimagined&entry=…, and
  // /changelog?stream=public|web for one stream's list (Rhythia sends /changelog/:type to its latest entry).
  function parse() {
    const p = new URLSearchParams(location.search), m = location.pathname.match(/^\/changelog(?:\/(public|web))?(?:\/(\d{4}-\d{2}-\d{2}))?\/?$/);
    if (p.get('view') === 'reimagined') return {type: 'reimagined', date: '', entry: p.get('entry') || ''};
    const stream = p.get('stream');
    return {type: m?.[1] || (stream === 'public' || stream === 'web' ? stream : ''), date: m?.[2] || '', entry: ''};
  }
  const entryUrl = e => (e.type === 'reimagined' ? `/changelog?view=reimagined&entry=${encodeURIComponent(e.version)}` : `/changelog/${e.type}/${e.date}`);
  function entries() {
    const {type} = S.route;
    const rh = t => (S.lists[t] || []).map(e => ({...e, key: `${t}:${e.id}`}));
    if (type === 'reimagined') return (S.lists.reimagined || []).map(e => ({type: 'reimagined', key: 'r:' + e.version, date: e.date, version: e.version, title: e.title, markdown: e.content, groups: e.groups, draft: e.draft}));
    return (type ? rh(type) : [...rh('public'), ...rh('web')]).sort((a, b) => String(b.date).localeCompare(String(a.date)) || b.id - a.id);
  }
  function filtered() {
    const {date} = S.route, q = S.q.toLowerCase();
    let list = entries();
    if (date) list = list.filter(e => e.date === date);
    if (q) list = list.filter(e => `${e.title || ''} ${e.version || ''} ${plainText(e.markdown || '')}`.toLowerCase().includes(q));
    return list;
  }
  const latest = t => (S.lists[t] || [])[0]?.date;
  function head() {
    return `<section class="container b-head"><div class="b-title"><img src="${SITE}/like.png" alt="" class="b-mascot"><div><span class="cap">Updates</span><h1>Changelog</h1><p>Track the latest changes to Rhythia across release streams.</p></div></div></section>`;
  }
  function streams() {
    const cur = S.route.type, item = (k, href, label, date, tip) => `<a class="g-stream ${cur === k ? 'on' : ''}" href="${href}" style="--c:${k ? STREAMS[k][1] : 'var(--text-2)'}" ${tip ? `data-tip="${tip}"` : ''}><b>${label}</b><small class="num">${date ? date.replace(/-/g, '.') : '&nbsp;'}</small></a>`;
    return `<div class="g-streams">${item('', '/changelog', 'All', '', 'Public and Web')}${item('public', '/changelog?stream=public', 'Public', latest('public'))}${item('web', '/changelog?stream=web', 'Web', latest('web'))}${item('reimagined', '/changelog?view=reimagined', 'Reimagined', latest('reimagined'), '<b>Reimagined for Rhythia</b><small>This extension’s own release notes</small>')}</div>`;
  }
  function entryHtml(e) {
    const [label, c] = STREAMS[e.type];
    return `<article class="g-entry" id="g-${esc(e.key)}"><header><a href="${entryUrl(e)}"><h2>${esc(longDate(e.date))}</h2></a><span class="g-chip" style="--c:${c}">${label}</span></header>
      <div class="md">${RhythiaX.ExodusMarkdown.md(e.markdown, {idPrefix: `g-${e.key}--`})}</div></article>`;
  }

  // This extension's notes: one release at a time beside the list of versions, with a switch between the looks
  // (Exodus first; an item for both looks is marked so). Sections and looks come from shared/releases.js, as in
  // the Classic changelog.
  const REL = () => RhythiaX.Releases;
  const LOOK_C = {exodus: '#a78bfa', legacy: '#38bdf8'};
  const shortDate = d => (/^\d{4}-\d{2}-\d{2}$/.test(d) ? new Date(`${d}T12:00:00Z`).toLocaleDateString('en-GB', {day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC'}) : d || 'Unreleased');
  const current = list => list.find(e => e.version === S.route.entry) || list[0];
  const dots = e => REL().looksOf(e).map(l => `<i style="--c:${LOOK_C[l]}" title="${esc(REL().LOOKS[l].label)}"></i>`).join('');
  function versions() {
    const list = filtered(), cur = current(list);
    return list.length ? `<span class="w-gt">Versions</span>${list.map(e => `<a class="g-v ${e === cur ? 'on' : ''}" href="${entryUrl(e)}"${e === cur ? ' aria-current="page"' : ''}><b class="num">${esc(e.version)}<span class="g-dots">${dots(e)}</span></b><small>${e.title ? `${esc(e.title)} · ` : ''}${esc(shortDate(e.date))}${e.draft ? ' · Draft' : ''}</small></a>`).join('')}` : '';
  }
  // Older and Newer step through every release, not only the ones the search leaves.
  function release(e) {
    const looks = REL().looksOf(e), look = looks.length ? S.look : 'all', shown = REL().forLook(REL().sections(e), look);
    const inline = (text, n) => RhythiaX.ExodusMarkdown.md(text, {idPrefix: `g-${e.key}-${n}-`}).trim().replace(/^<p>([\s\S]*)<\/p>$/, '$1');
    const tag = i => { const t = REL().tagOf(i, look, looks); return t ? `<span class="g-tag" data-look="${i.look || 'both'}">${t}</span>` : ''; };
    // Each change on its own row: a short title over its text when it has one.
    const text = (i, n) => (i.title ? `<b class="g-it">${inline(i.title, n)}</b><span class="g-ib">${inline(i.body, n)}</span>` : `<span class="g-ib">${inline(i.text, n)}</span>`);
    const item = (i, n) => `<li class="g-row"><div class="g-li">${text(i, n)}</div>${tag(i)}</li>`;
    // Featured: a card per item, before the other sections.
    const feat = s => `<section class="g-sec g-feat" data-cat="featured"><h3 class="g-cat"><span class="g-cat-i" aria-hidden="true">${REL().ICONS.featured}</span>${esc(s.label)}</h3>
      <div class="g-cards">${s.items.map(i => `<div class="g-card md">${i.title ? `<h4>${inline(i.title, n)}</h4><p>${inline(i.body, n++)}</p>` : `<p>${inline(i.text, n++)}</p>`}${tag(i)}</div>`).join('')}</div></section>`;
    const sec = s => (s.cat === 'featured' ? feat(s) : `<section class="g-sec" data-cat="${esc(s.cat)}"><h3 class="g-cat"><span class="g-cat-i" aria-hidden="true">${REL().ICONS[s.cat] || ''}</span>${esc(s.label)}<small class="num">${s.items.length}</small></h3><ul class="md">${s.items.map(i => item(i, n++)).join('')}</ul></section>`);
    const sum = REL().summary(shown), all = entries(), at = all.findIndex(x => x.version === e.version), older = all[at + 1], newer = all[at - 1];
    const step = (t, dir) => (t ? `<a href="${entryUrl(t)}" class="g-step ${dir}"><small>${dir === 'older' ? 'Older' : 'Newer'}</small><b class="num">${esc(t.version)}${t.title ? ` · ${esc(t.title)}` : ''}</b></a>` : '<span></span>');
    let n = 0;
    return `<article class="g-entry g-rel${S.anim ? ' in' : ''}" id="g-${esc(e.key)}"><header class="g-rel-h"><div><h2><span class="num">${esc(e.version)}</span>${e.title ? ` <span class="g-rel-t">${esc(e.title)}</span>` : ''}${e.draft ? ' <span class="g-chip g-draft" style="--c:var(--muted)" data-tip="Shown only when the extension is loaded from a folder">Draft</span>' : ''}</h2><p>${esc(longDate(e.date))}${sum ? ` · ${sum}` : ''}</p></div>
        ${looks.length ? `<div class="pills g-looks" role="group" aria-label="Changes for">${[['exodus', 'Exodus'], ['legacy', 'Classic'], ['all', 'All']].map(([k, l]) => `<button type="button" data-look="${k}" aria-pressed="${look === k}">${l}</button>`).join('')}</div>` : ''}</header>
      ${shown.length ? shown.map(sec).join('')
        : `<div class="empty"><b>Nothing changed in ${esc(REL().LOOKS[look]?.label || look)} in this version.</b><div style="margin-top:14px"><button class="btn" type="button" data-look="all">Show all changes</button></div></div>`}
      <footer class="g-rel-f">${step(older, 'older')}${step(newer, 'newer')}</footer></article>`;
  }
  function body() {
    const {type, date} = S.route, need = type === 'reimagined' ? ['reimagined'] : type ? [type] : ['public', 'web'];
    if (need.some(t => S.lists[t] == null)) return Array.from({length: 2}, () => '<div class="g-entry"><div class="skeleton" style="height:22px;width:30%"></div><div class="skeleton" style="height:14px;margin-top:20px"></div><div class="skeleton" style="height:14px;margin-top:10px;width:80%"></div></div>').join('');
    if (type === 'reimagined') {
      const list = filtered();
      return list.length ? release(current(list)) : `<div class="empty" style="padding:72px 0"><b>${S.q ? 'Nothing matches this search.' : 'No entries.'}</b></div>`;
    }
    const all = filtered(), list = all.slice(0, S.shown);
    const single = date;
    const more = all.length > S.shown || (!single && !S.q && need.some(t => S.more[t]));
    return `${single ? `<a class="c-back" href="/changelog?stream=${type}">All ${esc(STREAMS[type][0])} entries</a>` : ''}
      ${list.length ? list.map(entryHtml).join('') : `<div class="empty" style="padding:72px 0"><b>${S.q ? 'Nothing matches this search.' : 'No entries.'}</b></div>`}
      ${more ? `<div class="v-moreb"><button class="btn" type="button" data-older ${S.busy ? 'disabled' : ''}>${S.busy ? 'Loading…' : 'Show older entries'}</button></div>` : ''}`;
  }
  function side() {
    if (S.route.type === 'reimagined') return S.lists.reimagined ? versions() : '';
    const list = filtered().slice(0, S.shown);
    return list.length > 1 ? `<span class="w-gt">Entries</span>${list.map(e => `<a href="#g-${esc(e.key)}"><i style="--c:${STREAMS[e.type][1]}"></i>${esc(e.version || longDate(e.date))}</a>`).join('')}` : '';
  }
  function render() {
    if (ac.signal.aborted) return;
    $('#hero').innerHTML = '';
    $('#body').innerHTML = `<div class="b-page g-page ${S.enter ? 'enter' : ''}">${head()}
      <div class="container v-mbar"><div class="v-mrow">${streams()}<label class="field v-mq g-q"><svg class="ico" aria-hidden="true"><use href="#i-search"/></svg><span class="sr">Search the changelog</span><input id="g-q" type="search" placeholder="Search the changelog" value="${esc(S.q)}" autocomplete="off"></label></div></div>
      <section class="container g-layout"><aside id="g-side">${side()}</aside><div id="g-body">${body()}</div></section><div style="height:96px"></div></div>`;
    S.enter = false;
    layout();
  }
  // The release reader keeps its list of versions on narrow screens too, as a row above the release.
  function layout() {
    const reader = S.route.type === 'reimagined';
    $('.g-layout').classList.toggle('g-reader', reader);
    $('#g-side').className = reader ? 'g-side g-vers' : 'w-toc g-side';
  }
  function refresh() {
    if (ac.signal.aborted) return;
    if (!$('.g-page')) return render();
    const s = $('.g-streams'); if (s) s.outerHTML = streams();
    $('#g-body').innerHTML = body(); $('#g-side').innerHTML = side(); layout();
  }
  async function fetchType(t, skip = 0) {
    const list = await Data().changelog(t, skip, 50, ac.signal);
    S.lists[t] = [...(skip ? S.lists[t] || [] : []), ...list];
    S.more[t] = list.length === 50;
  }
  async function load() {
    const need = S.route.type === 'reimagined' ? ['reimagined'] : S.route.type ? [S.route.type] : ['public', 'web'];
    // Every list is fetched (the stream pills show each one's latest date) and drawn as soon as it is in,
    // so the bundled notes never wait for Rhythia's streams.
    const settled = () => { if (!ac.signal.aborted) refresh(); };
    const notes = S.lists.reimagined == null ? reimaginedEntries().then(list => { S.lists.reimagined = list; settled(); }) : null;
    await Promise.all([notes, ...['public', 'web'].map(t => (S.lists[t] == null ? fetchType(t).catch(err => { if (!ac.signal.aborted && need.includes(t)) ui.toast(`Failed to load changelog. ${err.message}`); S.lists[t] = []; }).then(settled) : null))]);
  }
  async function older() {
    if (S.busy) return;
    if (filtered().length > S.shown) { S.shown += 20; refresh(); return; }
    S.busy = true; refresh();
    const types = S.route.type ? [S.route.type] : ['public', 'web'];
    try { await Promise.all(types.filter(t => S.more[t]).map(t => fetchType(t, S.lists[t].length))); } catch (err) { if (!ac.signal.aborted) ui.toast(`Could not load older entries: ${err.message}`); }
    S.busy = false; S.shown += 20; refresh();
  }

  R.addEventListener('click', e => {
    const a = e.target.closest('a[href^="#g-"]');
    if (a) { e.preventDefault(); R.getElementById(a.getAttribute('href').slice(1))?.scrollIntoView({behavior: REDUCED ? 'auto' : 'smooth', block: 'start'}); return; }
    if (e.target.closest('[data-older]')) older();
    // Only the look switch and the empty state's button; the look tags on items are labels.
    const look = e.target.closest('.g-looks [data-look], .empty [data-look]');
    if (look) { S.look = look.dataset.look; S.anim = true; $('#g-body').innerHTML = body(); S.anim = false; }
  }, sig);
  let typing = 0;
  R.addEventListener('input', e => { if (e.target.id !== 'g-q') return; const v = e.target.value.trim(); clearTimeout(typing); typing = setTimeout(() => { S.q = v; S.shown = 20; $('#g-body').innerHTML = body(); $('#g-side').innerHTML = side(); }, 200); }, sig);

  dropBroken(R, sig);
  render();
  load();

  return {
    state: () => ({}), idle: () => !S.busy, relayout() {},
    page() { const r = parse(); if (JSON.stringify(r) === JSON.stringify(S.route)) return; S.route = r; S.shown = 20; S.look = 'exodus'; S.anim = true; refresh(); S.anim = false; scrollTo({top: 0}); },
    destroy() { ac.abort(); ui.hide(); clearTimeout(typing); },
  };
}

const css = `
.g-streams{display:flex;gap:8px;flex-wrap:wrap}
.g-stream{display:flex;flex-direction:column;align-items:center;justify-content:center;min-width:110px;height:52px;padding:0 14px;border-radius:12px;background:var(--panel);box-shadow:inset 0 0 0 1px var(--line);border-top:3px solid color-mix(in srgb,var(--c) 55%,transparent);transition:background-color .15s}
.g-stream b{font-weight:700}
.g-stream small{font-size:11.5px;color:var(--muted)}
.g-stream:hover{background:var(--panel-2)}
.g-stream.on{background:var(--panel-3);border-top-color:var(--c)}
.g-q{flex:1 1 220px;height:52px}
.g-q input{flex:1;min-width:0;border:0;background:none;color:var(--text);font:inherit;outline:none}
.g-layout{display:grid;grid-template-columns:200px minmax(0,1fr);gap:28px;margin-top:28px;align-items:start}
.g-side a i{width:4px;height:14px;flex:none;border-radius:1px;background:var(--c)}
.g-entry{padding:24px 26px;margin-bottom:16px;border-radius:18px;background:var(--panel);box-shadow:inset 0 0 0 1px var(--line);scroll-margin-top:90px}
.g-entry header{display:flex;flex-wrap:wrap;align-items:center;gap:8px 12px;padding-bottom:14px;margin-bottom:16px;border-bottom:1px solid var(--line)}
.g-entry header h2{margin:0;font-size:20px;font-weight:750}
.g-entry header a:hover h2{color:var(--accent-2)}
.g-chip{display:inline-flex;align-items:center;gap:7px;height:26px;padding:0 10px;border-radius:4px;font-size:12px;font-weight:600;color:var(--text);background:rgba(var(--glass),.55);box-shadow:inset 0 0 0 1px var(--rule-2)}
.g-chip{padding-left:0;overflow:hidden}
.g-chip::before{content:"";flex:none;align-self:stretch;width:6px;background:var(--c)}
.g-reader{grid-template-columns:220px minmax(0,1fr)}
.g-vers{position:sticky;top:84px;display:flex;flex-direction:column;gap:2px;max-height:calc(100vh - 100px);overflow:auto}
.g-v{display:block;padding:8px 10px;border-radius:9px;color:var(--text-2)}
.g-v:hover{background:var(--panel-2);color:var(--text)}
.g-v.on{background:var(--panel-3);color:var(--text)}
.g-v b{display:flex;align-items:center;gap:8px;font-size:14px;font-weight:700}
.g-v small{display:block;margin-top:1px;font-size:12px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.g-dots{display:inline-flex;gap:4px}
.g-dots i{width:4px;height:12px;border-radius:1px;background:var(--c)}
.g-rel-h{justify-content:space-between;align-items:flex-start!important}
.g-rel-h h2{display:flex;flex-wrap:wrap;align-items:center;gap:6px 10px;margin:0;font-size:22px;font-weight:800}
.g-rel-t{font-weight:600;color:var(--text-2)}
.g-rel-h p{margin:4px 0 0;font-size:13.5px;color:var(--muted)}
/* A release: Featured cards first, then each section's changes one per row, a small mark in the section's colour. */
.g-rel.in{animation:exoEnter .45s var(--ease) both}
.g-sec{--cc:var(--muted)}
.g-sec + .g-sec{margin-top:26px}
.g-cat{display:flex;align-items:center;gap:8px;margin:0 0 4px;font-size:15px;font-weight:750;color:var(--text)}
.g-cat-i{display:inline-flex;color:var(--cc)}
.g-cat-i svg{width:17px;height:17px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
.g-cat small{font-size:12px;font-weight:600;color:var(--muted)}
.g-sec[data-cat="featured"]{--cc:#f472b6}
.g-sec[data-cat="added"]{--cc:#38bdf8}
.g-sec[data-cat="improved"]{--cc:#818cf8}
.g-sec[data-cat="changed"]{--cc:#c084fc}
.g-sec[data-cat="fixed"]{--cc:#4ade80}
.g-sec[data-cat="removed"]{--cc:#f87171}
.g-sec[data-cat="notes"]{--cc:#fbbf24}
.g-sec ul{margin:0;padding:0;list-style:none}
.g-sec li.g-row{position:relative;display:flex;align-items:flex-start;gap:14px;margin:0;padding:13px 0 13px 18px;border-top:1px solid var(--line)}
.g-sec li.g-row:first-child{border-top:0}
.g-sec li.g-row::before{content:"";position:absolute;left:1px;top:21px;width:6px;height:6px;border-radius:2px;background:var(--cc)}
.g-li{flex:1;min-width:0}
.g-it{display:block;font-size:15px;font-weight:700;line-height:1.4;color:var(--text)}
.g-ib{display:block;margin-top:3px;font-size:14px;line-height:1.6;color:var(--text-2)}
.g-li > .g-ib:only-child{margin-top:0;font-size:14.5px;color:var(--text)}
.g-cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:12px;margin-top:10px}
.g-card{position:relative;padding:18px 20px;border-radius:14px;background:var(--panel-2);box-shadow:inset 0 0 0 1px var(--line);border-top:3px solid var(--cc)}
.g-card h4{margin:0;font-size:17px;font-weight:750;line-height:1.35;color:var(--text)}
.g-card p{margin:6px 0 0;font-size:14px;line-height:1.6}
.g-card .g-tag{margin:12px 0 0}
.g-tag{display:inline-block;flex:none;margin-top:1px;padding:0 7px;border-radius:6px;font-size:11.5px;font-weight:650;line-height:20px;white-space:nowrap;color:var(--muted);background:var(--panel-3);box-shadow:inset 0 0 0 1px var(--line)}
.g-tag[data-look="exodus"]{color:var(--accent-2)}
@media (prefers-reduced-motion:reduce){.g-rel.in{animation:none}}
.g-rel-f{display:flex;justify-content:space-between;gap:12px;margin-top:24px;padding-top:16px;border-top:1px solid var(--line)}
.g-step{display:flex;flex-direction:column;min-width:0;padding:6px 10px;border-radius:9px}
.g-step:hover{background:var(--panel-2)}
.g-step.newer{align-items:flex-end;text-align:right}
.g-step small{font-size:12px;color:var(--muted)}
.g-step b{font-size:14px;font-weight:700}
/* The entry list hides on narrow screens; the release reader's version row (.g-vers) stays. */
@media (max-width:860px){.g-layout{grid-template-columns:1fr}.w-toc.g-side{display:none}}
@media (max-width:900px){
  .g-reader{grid-template-columns:minmax(0,1fr);gap:16px}
  .g-vers{position:static;flex-direction:row;overflow-x:auto;max-height:none;padding-bottom:4px}
  .g-vers .w-gt{display:none}
  .g-v{flex:none}
}
[data-variant="lines"] .g-entry{background:none;box-shadow:none;border-radius:0;border-top:1px solid var(--rule);padding:24px 0}
@media (max-width:640px){.g-stream{min-width:0;flex:1 1 40%}.g-entry{padding:18px}}
`;

K().page('changelog', changelog, css);
})();
