// =============================================
// Reimagined for Rhythia — Exodus wiki
// =============================================
// /wiki: Rhythia's own Markdown articles, read from its site and drawn by core/markdown.js.

var RhythiaX = RhythiaX || {};

(function () {
'use strict';
const K = () => RhythiaX.ExodusKit;
const {SITE, esc, REDUCED, slugify, dropBroken} = RhythiaX.ExodusKit;

/* ════════════════════ Wiki ════════════════════ */
// Rhythia's list of wiki articles lives in its page code; it is read from there (the copy below
// is the list as of October 2026 and is used only if that fails).
const WIKI_FALLBACK = [{"title":"Getting started","items":[{"slug":"faq/installing-the-game","title":"Install Rhythia","description":"Install the game through Steam"},{"slug":"faq/troubleshooting","title":"Fix common issues","description":"Solve launch, crash, and score problems"}]},{"title":"Game • Map library","navigationGroup":"Game","navigationTitle":"Map library","navigationDescription":"Map selection, filters, and collections","items":[{"slug":"game/map-library/map-selection","title":"Map selection","description":"Map list, selected map details, and the top bar"},{"slug":"game/map-library/filters","title":"Sort and filter maps","description":"Sort, group, and filter the map browser"},{"slug":"game/map-library/collections","title":"Collections","description":"Create and manage map collections"}]},{"title":"Game • Workshop","navigationGroup":"Game","navigationTitle":"Workshop","navigationDescription":"Download maps, skins, and skin assets","items":[{"slug":"game/workshop/online-workshop","title":"Online Workshop","description":"Browse maps, skins, and asset downloads"}]},{"title":"Game • Settings","navigationGroup":"Game","navigationTitle":"Settings","navigationDescription":"Game settings and customization","items":[{"slug":"game/settings/game-settings","title":"Game settings","description":"Configure controls, audio, and visuals"},{"slug":"game/settings/system","title":"System","description":"Window, camera, notes, and gameplay settings"},{"slug":"game/settings/online","title":"Online","description":"Overlays, chat, spectators, and workshop access"},{"slug":"game/settings/interface","title":"Interface","description":"Panels, colors, layout, and replay tools"},{"slug":"game/settings/cursor","title":"Cursor","description":"Cursor skin, trail, appearance, and movement"},{"slug":"game/settings/audio","title":"Audio","description":"Output device, hit and miss sounds, timing, and volume"},{"slug":"game/settings/backgrounds","title":"Backgrounds","description":"Background colors, effect layers, bloom, and media"},{"slug":"game/settings/favorites","title":"Favorites","description":"Quickly access your favorite settings"},{"slug":"game/settings/notes","title":"Notes","description":"Browse, build, and import note skins"},{"slug":"game/settings/hit-effects","title":"Hit Effects","description":"Choose and configure note hit effects"},{"slug":"game/settings/borders","title":"Borders","description":"Browse and import border skins"},{"slug":"game/settings/color-sets","title":"Color Sets","description":"Browse, create, and import color palettes"}]},{"title":"Game • Controls","navigationGroup":"Game","navigationTitle":"Game controls","navigationDescription":"Menu and gameplay shortcuts","items":[{"slug":"faq/game-keybinds","title":"Game controls","description":"Menu and gameplay shortcuts"}]},{"title":"Game • Replays","navigationGroup":"Game","navigationTitle":"Replays","navigationDescription":"Watch, inspect, and manage replays","items":[{"slug":"faq/watching-replays","title":"Manage replays","description":"View, delete, import, and export replays"}]},{"title":"Online and ranking","items":[{"slug":"online/rhythia-online","title":"Online play","description":"Submit scores and join multiplayer lobbies"},{"slug":"online/rhythia-points","title":"RP and ranking","description":"Understand weighted RP and player rank"}]},{"title":"Mapping • Editor setup","navigationGroup":"Mapping","navigationTitle":"Editor setup","navigationDescription":"Editor setup and controls","items":[{"slug":"mapping/editor-setup/installing-the-editor","title":"Getting started","description":"Open the Steam editor and prepare your files"},{"slug":"mapping/editor-setup/editor-assets","title":"Editor interface","description":"Tabs, panels, tools, and what they control"},{"slug":"mapping/editor-setup/editor-customization","title":"Controls and workflow","description":"Mouse controls, shortcuts, and saving habits"}]},{"title":"Mapping • Basics","navigationGroup":"Mapping","navigationTitle":"Basics","navigationDescription":"Mapping fundamentals","items":[{"slug":"mapping/basic-mapping/creating-maps","title":"Create your first map","description":"From audio and timing to playtest and export"},{"slug":"mapping/basic-mapping/mapping-aspects","title":"Mapping aspects","description":"Core elements to think about"},{"slug":"mapping/basic-mapping/mapping-patterns","title":"Patterns","description":"Slides, jumps, stacks, and more"}]},{"title":"Mapping • Advanced","navigationGroup":"Mapping","navigationTitle":"Advanced","navigationDescription":"Advanced mapping techniques","items":[{"slug":"mapping/extra-mapping/basic_spacing","title":"Basic spacing","description":"Spacing fundamentals and examples"},{"slug":"mapping/extra-mapping/manual-bpm-timing","title":"Timing a song","description":"Set BPM, offsets, and tempo changes"},{"slug":"mapping/extra-mapping/song_representation","title":"Song representation","description":"Map the music clearly"},{"slug":"mapping/extra-mapping/styles","title":"Styles","description":"Speed, technical, flow, and off-grid design"}]},{"title":"Formatting","items":[{"slug":"markdown-examples","title":"Markdown examples","description":"Supported formatting cheatsheet"}]}];
let wikiSectionsP = null;
function objectLiteralToJson(src) {
  let out = '', inStr = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inStr) { out += c; if (c === '\\') out += src[++i]; else if (c === '"') inStr = false; continue; }
    if (c === '"') { inStr = true; out += c; continue; }
    const m = /^[A-Za-z_$][\w$]*(?=:)/.exec(src.slice(i, i + 64));
    if (m && /[{,]\s*$/.test(out)) { out += `"${m[0]}"`; i += m[0].length - 1; continue; }
    out += c;
  }
  return JSON.parse(out);
}
function wikiSections() {
  return wikiSectionsP ||= (async () => {
    try {
      const src = document.querySelector('script[type="module"][src*="/assets/index-"]')?.src;
      if (!src) throw new Error('no bundle');
      const text = await (await fetch(src)).text();
      const a = text.indexOf('wikiSections=['), b = text.indexOf(',wikiPages=', a);
      if (a < 0 || b < 0) throw new Error('no list');
      const list = objectLiteralToJson(text.slice(a + 'wikiSections='.length, b));
      if (!Array.isArray(list) || !list.every(s => Array.isArray(s.items))) throw new Error('bad list');
      return list;
    } catch (_) { return WIKI_FALLBACK; }
  })();
}
const wikiText = new Map();
function wikiArticle(slug) {
  if (!wikiText.has(slug)) {
    const p = fetch(`/wiki/${slug}.md`).then(r => { if (!r.ok) throw new Error('Wiki entry missing'); return r.text(); });
    p.catch(() => wikiText.delete(slug));
    wikiText.set(slug, p);
  }
  return wikiText.get(slug);
}
const plainText = t => String(t).replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/<[^>]+>/g, ' ').replace(/[#>*_`~|:-]/g, ' ').replace(/\s+/g, ' ').trim();

function wiki(host, ctx) {
  const R = host.shadowRoot, ac = new AbortController(), sig = {signal: ac.signal}, $ = s => R.querySelector(s);
  const ui = K().shell(R, sig, ctx);
  const S = {sections: null, slug: '', text: null, err: '', q: '', index: null, enter: true, seq: 0};
  const pages = () => S.sections.flatMap(s => s.items.map(it => ({...it, section: s})));
  const current = () => pages().find(p => p.slug === S.slug) || pages()[0];
  const slugFromUrl = () => { const p = new URLSearchParams(location.search).get('page') || ''; return pages().some(x => x.slug === p) ? p : pages()[0].slug; };

  // A link in an article: another article (relative .md), a heading in this one, or the web.
  function href(h) {
    if (/^(https?:|mailto:)/i.test(h) || /^\/wiki\/public|^\/src\//.test(h)) return {href: h.startsWith('/') ? SITE + (h.startsWith('/src/') ? '/wiki/public' + h : h) : h};
    const [path, hash = ''] = h.split('#');
    if (!path) return {href: `#w-${hash}`};
    let parts;
    if (path.startsWith('/')) parts = path.replace(/^\/+/, '').split('/');
    else { parts = S.slug.split('/'); parts.pop(); for (const seg of path.split('/')) { if (seg === '..') parts.pop(); else if (seg && seg !== '.') parts.push(seg); } }
    const slug = parts.join('/').replace(/\.md$/, '');
    return pages().some(p => p.slug === slug) ? {href: `/wiki?page=${encodeURIComponent(slug)}${hash ? `#w-${hash}` : ''}`} : {href: SITE + '/' + path};
  }

  function head() {
    return `<section class="container b-head"><div class="b-title"><img src="${SITE}/wiki.png" alt="" class="b-mascot"><div><span class="cap">Wiki</span><h1>Browse Rhythia guides and documentation</h1><p>Find guides for playing, mapping, troubleshooting, and contributing.</p></div></div>
      <aside class="v-maps-links"><a class="btn" href="/credits">Credits</a></aside></section>`;
  }
  function nav() {
    const groups = [];
    for (const s of S.sections) {
      const g = s.navigationGroup || s.title;
      let grp = groups.find(x => x.title === g); if (!grp) groups.push(grp = {title: g, entries: []});
      if (s.navigationTitle) grp.entries.push({title: s.navigationTitle, description: s.navigationDescription, items: s.items});
      else for (const it of s.items) grp.entries.push({title: it.title, description: it.description, items: [it]});
    }
    // On a phone the list folds away under "Choose a guide", so the article comes first.
    const wide = matchMedia('(min-width: 861px)').matches;
    return `<details class="w-navd" ${wide ? 'open' : ''}><summary>Choose a guide<small>${esc(current().title)}</small></summary><nav class="w-nav" aria-label="Wiki page navigation">${groups.map(g => `<div class="w-grp"><span class="w-gt">${esc(g.title)}</span>${g.entries.map(en => {
      const on = en.items.some(it => it.slug === S.slug);
      return `<a class="w-entry ${on ? 'on' : ''}" href="/wiki?page=${encodeURIComponent(en.items[0].slug)}" ${on ? 'aria-current="page"' : ''}><b>${esc(en.title)}</b><small>${esc(en.description || '')}</small></a>
        ${on && en.items.length > 1 ? `<div class="w-sub">${en.items.map(it => `<a href="/wiki?page=${encodeURIComponent(it.slug)}" class="${it.slug === S.slug ? 'on' : ''}">${esc(it.title)}</a>`).join('')}</div>` : ''}`;
    }).join('')}</div>`).join('')}</nav></details>`;
  }
  function article() {
    const p = current(), all = pages(), i = all.findIndex(x => x.slug === p.slug), prev = all[i - 1], next = all[i + 1];
    const group = p.section.navigationGroup ? `${p.section.navigationGroup} · ${p.section.navigationTitle}` : p.section.title;
    let body;
    if (S.err) body = `<div class="empty"><b>This article could not be loaded.</b>${esc(S.err)}</div>`;
    else if (S.text == null) body = '<div class="skeleton" style="height:18px;width:60%"></div><div class="skeleton" style="height:14px;margin-top:16px"></div><div class="skeleton" style="height:14px;margin-top:10px;width:90%"></div>';
    else body = RhythiaX.ExodusMarkdown.md(S.text, {idPrefix: 'w-', href});
    const toc = S.text ? [...S.text.replace(/```[\s\S]*?```/g, '').matchAll(/^##\s+(.+?)\s*$/gm)].map(m => m[1].replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/[*_`~]/g, '').trim()) : [];
    return `<article class="w-art"><header class="w-ah"><span class="cap">${esc(group)}</span><h2>${esc(p.title)}</h2>${p.description ? `<p>${esc(p.description)}</p>` : ''}</header>
      <div class="md">${body}</div>
      <footer class="w-pn">${prev ? `<a href="/wiki?page=${encodeURIComponent(prev.slug)}"><small>Previous</small><b>${esc(prev.title)}</b></a>` : '<span></span>'}${next ? `<a class="nx" href="/wiki?page=${encodeURIComponent(next.slug)}"><small>Next</small><b>${esc(next.title)}</b></a>` : ''}</footer></article>
      ${toc.length > 1 ? `<aside class="w-toc" aria-label="On this page"><span class="w-gt">On this page</span>${toc.map(t => `<a href="#w-${esc(slugify(t))}">${esc(t)}</a>`).join('')}</aside>` : '<aside class="w-toc"></aside>'}`;
  }
  function results() {
    const q = S.q.toLowerCase();
    if (!q) return '';
    if (!S.index) return '<div class="w-res"><p class="cap">Reading the articles…</p></div>';
    const words = q.split(/\s+/).filter(Boolean);
    // Titles that match come first, then whole articles before their sections.
    const rank = e => (words.every(w => e.title.toLowerCase().includes(w)) ? 0 : 2) + (e.section ? 1 : 0);
    const hits = S.index.filter(e => words.every(w => e.text.includes(w))).sort((a, b) => rank(a) - rank(b)).slice(0, 12);
    return `<div class="w-res">${hits.length ? hits.map(h => `<a href="/wiki?page=${encodeURIComponent(h.slug)}${h.section ? `#w-${h.section}` : ''}"><b>${esc(h.title)}</b><small>${h.section ? esc(h.article) : esc(h.description || '')}</small></a>`).join('') : '<p class="cap">No Wiki results found.</p>'}</div>`;
  }
  async function buildIndex() {
    if (S.index || S.indexing) return;
    S.indexing = true;
    const entries = [];
    await Promise.all(pages().map(async p => {
      const t = await wikiArticle(p.slug).catch(() => '');
      entries.push({slug: p.slug, title: p.title, description: p.description, text: `${p.title} ${p.description || ''} ${plainText(t)}`.toLowerCase()});
      for (const part of t.split(/(?=^##\s+)/gm).slice(1)) {
        const title = (part.match(/^##\s+(.+?)\s*$/m)?.[1] || '').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/[*_`~]/g, '').trim();
        if (title) entries.push({slug: p.slug, title, article: p.title, section: slugify(title), text: `${title} ${p.title} ${plainText(part)}`.toLowerCase()});
      }
    }));
    S.index = entries;
    if (!ac.signal.aborted) { const r = $('#w-res'); if (r) r.innerHTML = results(); }
  }
  function render() {
    $('#hero').innerHTML = '';
    $('#body').innerHTML = `<div class="b-page w-page ${S.enter ? 'enter' : ''}">${head()}
      <div class="container v-mbar"><div class="w-find"><label class="field v-mq"><svg class="ico" aria-hidden="true"><use href="#i-search"/></svg><span class="sr">Search the Wiki</span><input id="w-q" type="search" placeholder="Search all Wiki articles and sections..." value="${esc(S.q)}" autocomplete="off"></label><div id="w-res">${results()}</div></div></div>
      <section class="container w-layout"><div id="w-nav">${S.sections ? nav() : ''}</div><div class="w-main" id="w-main">${S.sections ? article() : ''}</div></section><div style="height:96px"></div></div>`;
  }
  async function open(slug, hash = location.hash) {
    const seq = ++S.seq;
    S.slug = slug; S.err = ''; S.text = wikiText.has(slug) ? await wikiArticle(slug).catch(() => null) : null;
    if (seq !== S.seq) return;
    $('#w-nav').innerHTML = nav(); $('#w-main').innerHTML = article();
    if (S.text == null) {
      try { S.text = await wikiArticle(slug); } catch (err) { S.err = err.message; }
      if (seq !== S.seq || ac.signal.aborted) return;
      $('#w-main').innerHTML = article();
    }
    const p = current(); document.title = `${p.title} | Wiki | Rhythia`;
    const target = hash && R.getElementById(decodeURIComponent(hash.slice(1)));
    if (target) target.scrollIntoView({block: 'start'});
    else if (!S.enter) { const top = $('.w-layout'); if (top && top.getBoundingClientRect().top < 0) scrollTo({top: top.getBoundingClientRect().top + scrollY - 90}); }
    S.enter = false;
  }

  R.addEventListener('click', e => {
    // Headings of this article: scroll inside the page instead of changing the address.
    const a = e.target.closest('a[href^="#w-"]');
    if (a) { e.preventDefault(); R.getElementById(decodeURIComponent(a.getAttribute('href').slice(1)))?.scrollIntoView({behavior: REDUCED ? 'auto' : 'smooth', block: 'start'}); return; }
  }, sig);
  R.addEventListener('focusin', e => { if (e.target.id === 'w-q') buildIndex(); }, sig);
  R.addEventListener('input', e => { if (e.target.id !== 'w-q') return; S.q = e.target.value.trim(); buildIndex(); $('#w-res').innerHTML = results(); }, sig);
  R.addEventListener('keydown', e => { if (e.target.id === 'w-q' && e.key === 'Enter') { const first = $('#w-res a'); if (first) { e.preventDefault(); first.click(); } } }, sig);

  dropBroken(R, sig);
  render();
  wikiSections().then(list => {
    if (ac.signal.aborted) return;
    S.sections = list;
    render();
    open(slugFromUrl());
  });

  return {
    state: () => ({}), idle: () => !R.activeElement?.matches?.('input'), relayout() {},
    page() { if (!S.sections) return; const s = slugFromUrl(); if (s !== S.slug) { S.q = ''; const r = $('#w-res'), i = $('#w-q'); if (r) r.innerHTML = ''; if (i) i.value = ''; open(s); } else if (location.hash) R.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView({block: 'start'}); },
    destroy() { ac.abort(); ui.hide(); },
  };
}

const css = `
.w-find{position:relative}
.w-res{position:absolute;left:0;right:0;top:calc(100% + 6px);z-index:30;display:flex;flex-direction:column;max-height:420px;overflow:auto;padding:6px;border-radius:14px;background:var(--dialog);box-shadow:0 0 0 1px var(--line-2),0 20px 60px rgba(0,0,0,calc(.5 * var(--sh)))}
.w-res:empty{display:none}
.w-res a{display:flex;flex-direction:column;padding:8px 12px;border-radius:9px}
.w-res a:hover,.w-res a:focus-visible{background:var(--panel-3)}
.w-res a b{font-weight:650}.w-res a small{font-size:12.5px;color:var(--muted)}
.w-res .cap{margin:8px 12px}
.w-layout{display:grid;grid-template-columns:260px minmax(0,1fr);gap:28px;margin-top:28px;align-items:start}
.w-main{display:grid;grid-template-columns:minmax(0,1fr) 200px;gap:28px;align-items:start}
.w-navd > summary{display:none}
.w-navd{position:sticky;top:84px}
.w-nav{display:flex;flex-direction:column;gap:18px;max-height:calc(100vh - 100px);overflow:auto;padding-right:4px}
.w-gt{display:block;margin:0 0 6px 10px;font-size:11.5px;font-weight:750;letter-spacing:.06em;text-transform:uppercase;color:var(--muted)}
.w-entry{display:flex;flex-direction:column;padding:8px 10px;border-radius:10px;transition:background-color .15s}
.w-entry b{font-size:14px;font-weight:650}
.w-entry small{font-size:12px;color:var(--muted);line-height:1.35}
.w-entry:hover{background:var(--panel-2)}
.w-entry.on{background:var(--accent-soft)}
.w-entry.on b{color:var(--accent-2)}
.w-sub{display:flex;flex-direction:column;margin:4px 0 6px 16px;padding-left:10px;border-left:1px solid var(--line-2)}
.w-sub a{padding:5px 8px;border-radius:7px;font-size:13px;color:var(--text-2)}
.w-sub a:hover{color:var(--text)}
.w-sub a.on{color:var(--accent-2);font-weight:650}
.w-art{min-width:0}
.w-ah{padding-bottom:18px;margin-bottom:22px;border-bottom:1px solid var(--line)}
.w-ah h2{margin:4px 0 0;font-size:30px;font-weight:800;letter-spacing:-.02em}
.w-ah p{margin:6px 0 0;color:var(--muted)}
.w-toc{position:sticky;top:84px;display:flex;flex-direction:column;gap:2px;max-height:calc(100vh - 100px);overflow:auto}
.w-toc a{display:flex;align-items:center;gap:8px;padding:5px 10px;border-radius:7px;font-size:13px;color:var(--text-2)}
.w-toc a:hover{color:var(--text);background:var(--panel-2)}
.w-pn{display:flex;justify-content:space-between;gap:12px;margin-top:40px;padding-top:20px;border-top:1px solid var(--line)}
.w-pn a{display:flex;flex-direction:column;gap:2px;padding:12px 16px;border-radius:12px;box-shadow:inset 0 0 0 1px var(--line);min-width:0}
.w-pn a.nx{text-align:right;margin-left:auto}
.w-pn a small{font-size:12px;color:var(--muted)}
.w-pn a b{font-weight:650}
.w-pn a:hover{box-shadow:inset 0 0 0 1px var(--accent)}
@media (max-width:1100px){.w-main{grid-template-columns:1fr}.w-main .w-toc{display:none}}
@media (max-width:860px){.w-layout,.g-layout{grid-template-columns:1fr}.w-navd{position:static;border-radius:12px;background:var(--panel);box-shadow:inset 0 0 0 1px var(--line)}.w-navd > summary{display:flex;flex-direction:column;padding:12px 16px;cursor:pointer;font-weight:650}.w-navd > summary small{font-weight:500;color:var(--muted)}.w-navd[open] > summary{border-bottom:1px solid var(--line)}.w-nav{max-height:none;padding:12px}.g-side{display:none}.c-grid{grid-template-columns:1fr}.c-hero{grid-template-columns:auto minmax(0,1fr)}.c-hspread{grid-column:1/-1}}
`;

K().page('wiki', wiki, css);
})();
