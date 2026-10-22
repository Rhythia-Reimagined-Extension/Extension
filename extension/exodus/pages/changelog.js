// =============================================
// Reimagined for Rhythia — Exodus changelog
// =============================================
// /changelog: Rhythia's public and web streams, and this extension's own release notes.

var RhythiaX = RhythiaX || {};

(function () {
'use strict';
const K = () => RhythiaX.ExodusKit;
const {SITE, Data, esc, REDUCED, dropBroken} = RhythiaX.ExodusKit;

/* ════════════════════ Changelog ════════════════════ */
// Rhythia's two streams, and this extension's own release notes (as on the 1.2 Reimagined tab).
const STREAMS = {public: ['Public', '#60a5fa'], web: ['Web', '#a78bfa'], reimagined: ['Reimagined', '#f472b6']};
const longDate = d => (/^\d{4}-\d{2}-\d{2}$/.test(d) ? new Date(`${d}T12:00:00Z`).toLocaleDateString('en-GB', {day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC'}) : d || 'Unreleased');
const reimaginedEntries = () => RhythiaX.Releases.entries().catch(() => []);
function changelog(host, ctx) {
  const R = host.shadowRoot, ac = new AbortController(), sig = {signal: ac.signal}, $ = s => R.querySelector(s);
  const ui = K().shell(R, sig, ctx);
  const S = {route: parse(), lists: {public: null, web: null, reimagined: null}, more: {public: true, web: true}, busy: false, q: '', enter: true, shown: 20};

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
    const {date, entry} = S.route, q = S.q.toLowerCase();
    let list = entries();
    if (date) list = list.filter(e => e.date === date);
    if (entry) list = list.filter(e => e.version === entry);
    if (q) list = list.filter(e => `${e.title || ''} ${e.version || ''} ${plainText(e.markdown)}`.toLowerCase().includes(q));
    return list;
  }
  const latest = t => (S.lists[t] || [])[0]?.date;
  function head() {
    return `<section class="container b-head"><div class="b-title"><img src="${SITE}/like.png" alt="" class="b-mascot"><div><span class="cap">Updates</span><h1>Changelog</h1><p>Track the latest changes to Rhythia across release streams.</p></div></div></section>`;
  }
  function streams() {
    const cur = S.route.type, item = (k, href, label, date, tip) => `<a class="g-stream ${cur === k ? 'on' : ''}" href="${href}" style="--c:${k ? STREAMS[k][1] : 'var(--text-2)'}" ${tip ? `data-tip="${tip}"` : ''}><b>${label}</b><small class="num">${date ? date.replace(/-/g, '.') : '&nbsp;'}</small></a>`;
    return `<div class="g-streams">${item('', '/changelog', 'All', '', '<b>Public and Web</b><small>Rhythia’s two release streams together</small>')}${item('public', '/changelog?stream=public', 'Public', latest('public'))}${item('web', '/changelog?stream=web', 'Web', latest('web'))}${item('reimagined', '/changelog?view=reimagined', 'Reimagined', latest('reimagined'), '<b>Reimagined for Rhythia</b><small>This extension’s own release notes</small>')}</div>`;
  }
  // This extension's notes: "## Featured", "## Fixed" … with the section's icon and colour (shared with the
  // Legacy changelog, shared/releases.js).
  const sections = html => html.replace(/<h2 id="([^"]*)">([^<]+)<\/h2>/g, (m, id, text) => {
    const cat = RhythiaX.Releases.category(text);
    return cat ? `<h4 class="g-cat" id="${id}" data-cat="${cat}"><span class="g-cat-i" aria-hidden="true">${RhythiaX.Releases.ICONS[cat] || ''}</span>${text}</h4>` : m;
  });
  function entryHtml(e) {
    const [label, c] = STREAMS[e.type];
    const md = (text, prefix) => {
      const html = RhythiaX.ExodusMarkdown.md(text, {idPrefix: prefix});
      return `<div class="md ${e.type === 'reimagined' ? 'g-rx' : ''}">${e.type === 'reimagined' ? sections(html) : html}</div>`;
    };
    // An entry split by look (# Exodus / # Legacy in changelog.md) shows each part under its own header,
    // the part for both looks included.
    const notes = e.groups?.some(g => g.engine)
      ? e.groups.map(g => {
        const look = RhythiaX.Releases.LOOKS[g.engine] || RhythiaX.Releases.LOOKS[''], key = g.engine || 'both';
        return `<section class="g-look" data-look="${esc(key)}"><header class="g-look-h"><span class="g-look-i" aria-hidden="true">${look.icon}</span><div><h3>${esc(look.label)}</h3><small>${esc(look.blurb)}</small></div></header>${md(g.content, `g-${e.key}-${key}-`)}</section>`;
      }).join('')
      : md(e.markdown, `g-${e.key}--`);
    return `<article class="g-entry" id="g-${esc(e.key)}"><header><a href="${entryUrl(e)}"><h2>${esc(longDate(e.date))}</h2></a><span class="g-chip" style="--c:${c}">${label}</span>${e.version ? `<span class="g-ver num">${esc(e.version)}${e.title ? ` · ${esc(e.title)}` : ''}</span>` : ''}${e.draft ? '<span class="g-chip g-draft" style="--c:var(--muted)" data-tip="Shown only when the extension is loaded from a folder">Draft</span>' : ''}</header>
      ${notes}</article>`;
  }
  function body() {
    const {type, date, entry} = S.route, need = type === 'reimagined' ? ['reimagined'] : type ? [type] : ['public', 'web'];
    if (need.some(t => S.lists[t] == null)) return Array.from({length: 2}, () => '<div class="g-entry"><div class="skeleton" style="height:22px;width:30%"></div><div class="skeleton" style="height:14px;margin-top:20px"></div><div class="skeleton" style="height:14px;margin-top:10px;width:80%"></div></div>').join('');
    const all = filtered(), list = all.slice(0, S.shown);
    const single = date || entry;
    const more = all.length > S.shown || (!single && !S.q && type !== 'reimagined' && need.some(t => S.more[t]));
    return `${single ? `<a class="c-back" href="${type === 'reimagined' ? '/changelog?view=reimagined' : `/changelog?stream=${type}`}">All ${esc(STREAMS[type][0])} entries</a>` : ''}
      ${list.length ? list.map(entryHtml).join('') : `<div class="empty" style="padding:72px 0"><b>${S.q ? 'Nothing matches this search.' : 'No entries.'}</b></div>`}
      ${more ? `<div class="v-moreb"><button class="btn" type="button" data-older ${S.busy ? 'disabled' : ''}>${S.busy ? 'Loading…' : 'Show older entries'}</button></div>` : ''}`;
  }
  function side() {
    const list = filtered().slice(0, S.shown);
    return list.length > 1 ? `<span class="w-gt">Entries</span>${list.map(e => `<a href="#g-${esc(e.key)}"><i style="--c:${STREAMS[e.type][1]}"></i>${esc(e.version || longDate(e.date))}</a>`).join('')}` : '';
  }
  function render() {
    $('#hero').innerHTML = '';
    $('#body').innerHTML = `<div class="b-page g-page ${S.enter ? 'enter' : ''}">${head()}
      <div class="container v-mbar"><div class="v-mrow">${streams()}<label class="field v-mq g-q"><svg class="ico" aria-hidden="true"><use href="#i-search"/></svg><span class="sr">Search the changelog</span><input id="g-q" type="search" placeholder="Search the changelog" value="${esc(S.q)}" autocomplete="off"></label></div></div>
      <section class="container g-layout"><aside class="w-toc g-side" id="g-side">${side()}</aside><div id="g-body">${body()}</div></section><div style="height:96px"></div></div>`;
    S.enter = false;
  }
  function refresh() {
    if (!$('.g-page')) return render();
    const s = $('.g-streams'); if (s) s.outerHTML = streams();
    $('#g-body').innerHTML = body(); $('#g-side').innerHTML = side();
  }
  async function fetchType(t, skip = 0) {
    const list = await Data().changelog(t, skip, 50, ac.signal);
    S.lists[t] = [...(skip ? S.lists[t] || [] : []), ...list];
    S.more[t] = list.length === 50;
  }
  async function load() {
    const need = S.route.type === 'reimagined' ? ['reimagined'] : S.route.type ? [S.route.type] : ['public', 'web'];
    await Promise.all(['public', 'web'].map(t => (S.lists[t] == null ? fetchType(t).catch(err => { if (!ac.signal.aborted && need.includes(t)) ui.toast(`Failed to load changelog. ${err.message}`); S.lists[t] = []; }) : null)));
    if (ac.signal.aborted) return;
    refresh();
    if (S.lists.reimagined == null) { S.lists.reimagined = await reimaginedEntries(); if (!ac.signal.aborted) refresh(); }
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
  }, sig);
  let typing = 0;
  R.addEventListener('input', e => { if (e.target.id !== 'g-q') return; const v = e.target.value.trim(); clearTimeout(typing); typing = setTimeout(() => { S.q = v; S.shown = 20; $('#g-body').innerHTML = body(); $('#g-side').innerHTML = side(); }, 200); }, sig);

  dropBroken(R, sig);
  render();
  load();

  return {
    state: () => ({}), idle: () => !S.busy, relayout() {},
    page() { const r = parse(); if (JSON.stringify(r) === JSON.stringify(S.route)) return; S.route = r; S.shown = 20; refresh(); scrollTo({top: 0}); },
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
.g-side a i{width:8px;height:8px;flex:none;border-radius:50%;background:var(--c)}
.g-entry{padding:24px 26px;margin-bottom:16px;border-radius:18px;background:var(--panel);box-shadow:inset 0 0 0 1px var(--line);scroll-margin-top:90px}
.g-entry header{display:flex;flex-wrap:wrap;align-items:center;gap:8px 12px;padding-bottom:14px;margin-bottom:16px;border-bottom:1px solid var(--line)}
.g-entry header h2{margin:0;font-size:20px;font-weight:750}
.g-entry header a:hover h2{color:var(--accent-2)}
.g-chip{display:inline-flex;align-items:center;height:24px;padding:0 9px;border-radius:7px;font-size:12px;font-weight:700;color:var(--c);background:color-mix(in srgb,var(--c) 12%,transparent);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--c) 40%,transparent)}
.g-ver{font-size:13px;color:var(--muted);font-weight:600}
.g-look{--lc:#94a3b8}
.g-look[data-look="exodus"]{--lc:#a78bfa}
.g-look[data-look="legacy"]{--lc:#38bdf8}
.g-look + .g-look{margin-top:40px}
.g-look-h{display:flex;align-items:center;gap:14px;padding-bottom:14px;margin-bottom:6px;border-bottom:2px solid color-mix(in srgb,var(--lc) 45%,transparent)}
.g-look-i{display:grid;place-items:center;flex:none;width:42px;height:42px;border-radius:11px;color:var(--lc);background:color-mix(in srgb,var(--lc) 14%,transparent);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--lc) 38%,transparent)}
.g-look-i svg,.g-cat-i svg{width:22px;height:22px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
.g-look-h h3{margin:0;font-size:21px;font-weight:800;line-height:1.2}
.g-look-h small{display:block;margin-top:2px;font-size:13.5px;color:var(--muted)}
.g-rx .g-cat{--cc:var(--muted);display:flex;align-items:center;gap:9px;margin:26px 0 8px;font-size:15px;font-weight:750;color:var(--cc)}
.g-rx .g-cat-i{display:grid;place-items:center;width:28px;height:28px;border-radius:8px;background:color-mix(in srgb,var(--cc) 14%,transparent)}
.g-rx .g-cat-i svg{width:17px;height:17px}
.g-cat[data-cat="featured"]{--cc:#fb7185}
.g-cat[data-cat="added"]{--cc:#38bdf8}
.g-cat[data-cat="improved"]{--cc:#818cf8}
.g-cat[data-cat="changed"]{--cc:#c084fc}
.g-cat[data-cat="fixed"]{--cc:#4ade80}
.g-cat[data-cat="removed"]{--cc:#f87171}
.g-cat[data-cat="notes"]{--cc:#fbbf24}
.g-rx ul{padding-left:0;list-style:none}
.g-rx li{padding:12px 0 12px 16px;margin:0;border-left:2px solid var(--line)}
.g-rx li + li{margin-top:6px}
.g-rx li > strong:first-child{display:block;margin-bottom:2px;font-size:16px;font-weight:750}
[data-variant="lines"] .g-entry{background:none;box-shadow:none;border-radius:0;border-top:1px solid var(--rule);padding:24px 0}
`;

K().page('changelog', changelog, css);
})();
