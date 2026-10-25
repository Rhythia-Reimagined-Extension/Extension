// =============================================
// Reimagined for Rhythia — Exodus profile: scores
// =============================================
// The score lists (pinned, top, reigning and recent) with their search, filters, layouts and pages, the
// score menu, and the Scores page's chart of how the top plays add up to rhythm points.
// pages/profile.js makes this part at mount with its context c and draws what it returns.

var RhythiaX = RhythiaX || {};
RhythiaX.ExodusProfileParts = RhythiaX.ExodusProfileParts || {};

RhythiaX.ExodusProfileParts.scores = function mountProfileScores(c) {
'use strict';
// What this part takes from pages/profile.js.
const {R, U, SITE, esc, fmt, $, cssUrl, ico, ago, SPEED, GRADES, MODES, S, kpi, pinnedScores, SCORES_ALL} = c;

/* ── Scores ── */
const MOD_LABEL = {mirrorxy:'Mirror XY', mirrorx:'Mirror X', mirrory:'Mirror Y', ghost:'Ghost', hardrock:'Hard Rock', nofail:'No Fail', suddendeath:'Sudden Death',
  autorestart:'Auto Restart', chaos:'Chaos', hidden:'Hidden', flashlight:'Flashlight', spin:'Spin', fade:'Fade', vr:'VR', '360':'360', easy:'Easy', perfect:'Perfect'};
const modKey = m => { const k = String(m).toLowerCase().replace(/^mod[_\s-]*/, '').replace(/[\s_-]+/g, ''); return k === 'mirror' ? 'mirrorx' : k; };
// Mirror X + Mirror Y is shown as Mirror XY, as on Rhythia.
const modsOf = s => { const ks = [...new Set((s.mods || []).map(modKey))], x = ks.indexOf('mirrorx'), y = ks.indexOf('mirrory');
  if (x >= 0 && y >= 0) { ks.splice(Math.max(x, y), 1); ks.splice(Math.min(x, y), 1, 'mirrorxy'); } return ks; };
const SPEED_ICON = {'1.45': 'plusplusplusplus', '1.35': 'plusplusplus', '1.25': 'plusplus', '1.15': 'plus', '0.87': 'minus', '0.80': 'minusminus', '0.75': 'minusminusminus'};
const modChips = s => {
  const out = [];
  if (s.speedKey !== '1.00') out.push(`<span class="mc spdc" style="--c:${SPEED[s.speedKey] || 'var(--sp100)'}" data-tip="<b>Speed ${s.speedKey}×</b><small>Mod</small>">${SPEED_ICON[s.speedKey] ? `<img src="${SITE}/modspeed${SPEED_ICON[s.speedKey]}.png" alt="${s.speedKey}×">` : `${s.speedKey}×`}</span>`);
  for (const k of modsOf(s)) { const l = MOD_LABEL[k] || k; out.push(`<span class="mc" data-tip="<b>${esc(l)}</b><small>Mod</small>"><img src="${SITE}/mod${k}.png" alt="${esc(l)}" data-fb="b"></span>`); }
  return out.length ? `<span class="mods">${out.join('')}</span>` : '';
};
const sug = {i: -1, items: []};
const mark = (v, q) => { const i = v.toLowerCase().indexOf(q); return i < 0 ? esc(v) : esc(v.slice(0, i)) + '<mark>' + esc(v.slice(i, i + q.length)) + '</mark>' + esc(v.slice(i + q.length)); };
function suggest(raw) {
  const box = $('#suggest'); if (!box) return;
  const q = raw.trim().toLowerCase();
  const src = filtered().lists[S.list], seen = new Map();
  if (q) for (const s of src) for (const [v, kind] of [[s.beatmapTitle, 'Map'], [s.mapper, 'Mapper']]) {
    if (!v || !v.toLowerCase().includes(q)) continue;
    const k = kind + v; seen.has(k) ? seen.get(k).n++ : seen.set(k, {v, kind, s, n: 1});
  }
  sug.items = [...seen.values()].sort((a, b) => a.v.toLowerCase().indexOf(q) - b.v.toLowerCase().indexOf(q) || b.n - a.n).slice(0, 6);
  sug.i = -1;
  box.hidden = !sug.items.length || (sug.items.length === 1 && sug.items[0].v.toLowerCase() === q);
  box.innerHTML = sug.items.map((o, i) => `<button type="button" role="option" data-suggest="${i}">${o.kind === 'Map' ? `<i style="background-image:${cssUrl(o.s.thumb)}"></i>` : `<i class="who">${ico('user')}</i>`}<span>${mark(o.v, q)}</span><small>${o.kind === 'Map' ? 'Map' : `Mapper · ${o.n} score${o.n > 1 ? 's' : ''}`}</small></button>`).join('');
}
function pickSuggestion(i) {
  const o = sug.items[Number(i)]; if (!o) return;
  S.q = o.v; S.page = 1; const q = $('#q'); q.value = o.v; $('#suggest').hidden = true;
  $('#score-body').innerHTML = scoreBody(true);
}

function row(s, kind, i) {
  const top = kind === 'top';
  return `<div class="row" style="--img:${cssUrl(s.img || s.thumb)};--i:${i}">
    <span class="pos num">${top ? s.pos : ''}</span>
    <span class="thumb" style="background-image:${cssUrl(s.thumb)}"></span>
    <div class="map"><a href="/score/${encodeURIComponent(s.id)}" title="${esc(s.beatmapTitle)}">${esc(s.beatmapTitle)}</a>
      <div class="meta-line">${modChips(s)}${s.mapper ? `<span>by <b>${esc(s.mapper)}</b></span>` : ''}${s.stars ? `<span class="num">★ ${fmt(s.stars, 2)}</span>` : ''}<span>${ago(s.created_at)}</span></div></div>
    <div class="stats">
      <span class="grade ${s.grade === 'SS' ? 'ss' : ''}" style="--c:var(--g-${s.grade})">${s.grade}</span>
      <span class="v num">${fmt(s.acc, 2)}%</span>
      ${s.fc ? '<span class="v fc">FC</span>' : `<span class="v miss num">${fmt(s.misses)}</span>`}
      <span class="v raw num">${fmt(s.raw)}</span>
      ${top ? `<span class="v w num">${fmt(s.weighted)}<small>${s.weight}%</small></span>` : `<span class="v none">—</span>`}
    </div>
    <button class="iconbtn" type="button" aria-label="Score actions" aria-haspopup="menu" data-menu="${s.id}">${ico('more')}</button>
  </div>`;
}
function tile(s, kind, i) {
  return `<article class="tile" style="--i:${i}"><div class="art" style="background-image:${cssUrl(s.img || s.thumb)}">${kind === 'top' ? `<span class="pos num">#${s.pos}</span>` : ''}<span class="grade" style="--c:var(--g-${s.grade})">${s.grade}</span><button class="iconbtn" type="button" aria-label="Score actions" aria-haspopup="menu" data-menu="${s.id}">${ico('more')}</button></div>
    <div class="body"><div class="map"><a href="/score/${encodeURIComponent(s.id)}" title="${esc(s.beatmapTitle)}">${esc(s.beatmapTitle)}</a>
      <div class="meta-line">${modChips(s)}${s.mapper ? `<span>by ${esc(s.mapper)}</span>` : ''}<span>${ago(s.created_at)}</span></div></div>
    <dl><div><dt>Accuracy</dt><dd class="v num">${fmt(s.acc, 2)}%</dd></div><div><dt>Misses</dt><dd class="v ${s.fc ? 'fc' : 'miss'} num">${s.fc ? 'FC' : fmt(s.misses)}</dd></div>
      <div><dt>${kind === 'top' ? 'Weighted' : 'RP'}</dt><dd class="v w num">${fmt(kind === 'top' ? s.weighted : s.raw)}</dd></div></dl></div></article>`;
}
function filtered() {
  const m = MODES[S.mode], lists = {top: m.top, reign: m.reign, recent: m.recent, pinned: S.mode === 'normal' ? pinnedScores() : []};
  let list = lists[S.list];
  if (S.q) { const q = S.q.toLowerCase(); list = list.filter(s => s.beatmapTitle.toLowerCase().includes(q) || s.mapper.toLowerCase().includes(q)); }
  if (S.grade) list = list.filter(s => s.grade === S.grade);
  if (S.speed) list = list.filter(s => s.speedKey === S.speed);
  if (S.mod) list = list.filter(s => S.mod === 'none' ? !(s.mods || []).length : (s.mods || []).some(m => modKey(m) === S.mod));
  return {m, lists, list, total: lists[S.list].length};
}
function scoreBody(anim) {
  const {m, lists, list, total} = filtered();
  const full = S.section === 'scores', per = S.view === 'grid' ? (full ? 18 : 9) : (full ? 25 : 10), pages = Math.max(1, Math.ceil(list.length / per)); S.page = Math.min(S.page, pages);
  const shown = list.slice((S.page - 1) * per, S.page * per);
  const nums = Array.from({length: pages}, (_, i) => i + 1).filter(p => p === 1 || p === pages || Math.abs(p - S.page) <= 1);
  const body = !shown.length ? `<div class="panel empty"><b>${total ? 'No scores match' : `No ${S.list === 'reign' ? 'reigning' : S.list} scores in ${m.label}`}</b>${total ? 'Try clearing the search or filters.' : ''}</div>`
    : S.view === 'grid' ? `<div class="tiles ${anim ? 'anim' : ''}">${shown.map((s, i) => tile(s, S.list, i)).join('')}</div>`
    : `<div class="list-panel panel"><div class="cols" aria-hidden="true"><span>#</span><span></span><span>Map</span><span>Grade</span><span>Accuracy</span><span>Misses</span><span>RP</span><span>${S.list === 'top' ? 'Weighted' : ''}</span><span></span></div>
       <div class="rows ${anim ? 'anim' : ''}">${shown.map((s, i) => row(s, S.list, i)).join('')}</div></div>`;
  return body + (list.length > per ? `<div class="pager"><span class="num">${fmt((S.page - 1) * per + 1)}–${fmt(Math.min(S.page * per, list.length))} of ${fmt(list.length)}</span><div class="pages">
      <button type="button" data-page="${S.page - 1}" ${S.page === 1 ? 'disabled' : ''} aria-label="Previous page">‹</button>
      ${nums.map((p, i) => `${i && p - nums[i - 1] > 1 ? '<span>…</span>' : ''}<button type="button" data-page="${p}" ${p === S.page ? 'aria-current="page"' : ''}>${p}</button>`).join('')}
      <button type="button" data-page="${S.page + 1}" ${S.page === pages ? 'disabled' : ''} aria-label="Next page">›</button></div></div>` : '');
}
function scores(anim) {
  const {m, lists} = filtered();
  // A filter in use always has its option, so the selects never hide it (a restored view, fresh data).
  const speeds = [...new Set([...lists[S.list].map(s => s.speedKey), ...(S.speed ? [S.speed] : [])])].sort((a, b) => b - a);
  const mods = [...new Set([...lists[S.list].flatMap(s => (s.mods || []).map(modKey)), ...(S.mod && S.mod !== 'none' ? [S.mod] : [])])].sort();
  const pins = pinnedScores();
  return `<div class="sec-head">
      <div><h2>${S.section === 'scores' ? 'All scores' : 'Scores'}</h2>${S.section === 'scores' ? ''
        : `<p class="lede">The top 100 count toward RP, each 3% less than the one above. <a class="lede-link" href="/player/${esc(U.id)}/scores">All scores</a></p>`}</div>
      <div class="tabs seg" role="tablist" data-ink="scores">${[...(pins.length ? [['pinned', 'Pinned', pins.length]] : []), ['top','Top', m.top.length], ['reign','Reigning', m.reign.length], ['recent','Recent', m.recent.length]].map(([k, l, n]) =>
        `<button role="tab" type="button" aria-selected="${S.list === k}" data-list="${k}">${l}<span class="n num">${n}</span></button>`).join('')}</div>
    </div>
    <div class="tools">
      <div class="search-wrap"><label class="field">${ico('search')}<span class="sr">Search scores</span><input id="q" type="search" placeholder="Search map, artist or mapper  ( / )" value="${esc(S.q)}" autocomplete="off" role="combobox" aria-controls="suggest" aria-autocomplete="list"></label>
        <div class="suggest" id="suggest" role="listbox" hidden></div></div>
      <select class="field" id="grade" aria-label="Grade"><option value="">All grades</option>${GRADES.map(g => `<option ${S.grade === g ? 'selected' : ''}>${g}</option>`).join('')}</select>
      <select class="field" id="mod" aria-label="Mods"><option value="">All mods</option><option value="none" ${S.mod === 'none' ? 'selected' : ''}>No mods</option>${mods.map(k => `<option value="${k}" ${S.mod === k ? 'selected' : ''}>${esc(MOD_LABEL[k] || k)}</option>`).join('')}</select>
      <select class="field" id="speed" aria-label="Speed"><option value="">All speeds</option>${speeds.map(k => `<option value="${k}" ${S.speed === k ? 'selected' : ''}>${k}×</option>`).join('')}</select>
      <div class="pills" aria-label="Layout"><button type="button" aria-pressed="${S.view === 'list'}" data-view="list" aria-label="List">${ico('list')}</button><button type="button" aria-pressed="${S.view === 'grid'}" data-view="grid" aria-label="Grid">${ico('grid')}</button></div>
    </div>
    <div id="score-body">${scoreBody(anim)}</div>`;
}

/* ── Scores page: how the top plays add up to rhythm points ── */
function rpChart() {
  const m = MODES[S.mode], top = m.top, n = top.length;
  if (n < 2) return `<div class="panel empty"><b>No ${m.label} top plays yet</b></div>`;
  const W = 1000, Hh = 230, T = 12, B = 12, peak = Math.max(...top.map(s => s.raw)) || 1, hi = peak * 1.06;
  const x = i => i * W / (n - 1), y = v => Hh - B - v / hi * (Hh - T - B);
  const path = k => top.map((s, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(s[k]).toFixed(1)}`).join('');
  const ticks = [0, Math.round(peak / 2), Math.round(peak)];
  const sumW = top.reduce((a, s) => a + s.weighted, 0) || 1, top10 = top.slice(0, 10).reduce((a, s) => a + s.weighted, 0), fcs = top.filter(s => s.fc).length, acc = top.reduce((a, s) => a + s.acc, 0) / n;
  const best = top[0], cw = W / n, id = 'rp' + Math.random().toString(36).slice(2, 7);
  return `<div class="sec-head"><div><h2>Top ${n}</h2><p class="lede">Each play counts 3% less than the one above it.</p></div></div>
    <div class="kpis rp-kpis">
      ${kpi('', 'Top 10 share', `${fmt(top10 / sumW * 100, 1)}%`, 'of weighted RP', {selectable: false})}
      ${kpi('', 'Best play', `${fmt(best.raw)} RP`, esc(best.beatmapTitle), {selectable: false})}
      ${kpi('', 'Average accuracy', `${fmt(acc, 2)}%`, `across the top ${n}`, {selectable: false})}
      ${kpi('', 'Full combos', fmt(fcs), `of the top ${n}`, {selectable: false})}
    </div>
    <div class="chart-panel panel">
      <div class="panel-head"><h3>Awarded and weighted RP <span>· by position</span></h3><div class="rp-key"><span>Awarded</span><span class="w">Weighted</span></div></div>
      <div class="chart-wrap">${ticks.map(t => `<span class="yl num" style="top:${(y(t) / Hh * 100).toFixed(2)}%">${fmt(t)}</span>`).join('')}
        <svg class="chart draw rpc" viewBox="0 0 ${W} ${Hh}" preserveAspectRatio="none" role="img" aria-label="Awarded and weighted RP of the top ${n}">
          <defs><linearGradient id="${id}" x1="0" x2="0" y1="0" y2="1"><stop offset="0" style="stop-color:var(--accent);stop-opacity:.22"/><stop offset="1" style="stop-color:var(--accent);stop-opacity:0"/></linearGradient></defs>
          ${ticks.map(t => `<line class="gl" x1="0" x2="${W}" y1="${y(t)}" y2="${y(t)}"/>`).join('')}
          <path d="${path('raw')}L${W},${Hh}L0,${Hh}Z" fill="url(#${id})"/><path class="ln" d="${path('raw')}"/><path class="ln w" d="${path('weighted')}"/>
          ${top.map((s, i) => `<rect class="hit" x="${Math.max(0, x(i) - cw / 2).toFixed(1)}" y="0" width="${cw.toFixed(1)}" height="${Hh}" data-tip="<b>#${s.pos} · ${esc(esc(s.beatmapTitle))}</b><small>${fmt(s.raw)} RP awarded · ${fmt(s.weighted)} weighted (${s.weight}%)</small>"/>`).join('')}
        </svg></div>
      <div class="xl num"><span>#1</span><span>#${n}</span></div>
    </div>`;
}

/* ── Score menu ── */
function closeMenu() { R.querySelector('.menu')?.remove(); R.querySelectorAll('[data-menu][aria-expanded="true"]').forEach(b => b.setAttribute('aria-expanded', 'false')); }
function openMenu(btn, id) {
  const open = btn.getAttribute('aria-expanded') === 'true';
  closeMenu(); if (open) return;
  const s = SCORES_ALL().find(x => String(x.id) === String(id));
  const r = btn.getBoundingClientRect(), m = document.createElement('div');
  m.className = 'menu'; m.setAttribute('role', 'menu');
  m.innerHTML = `${s ? `<header><strong>${esc(s.beatmapTitle)}</strong><small class="num">${fmt(s.acc, 2)}% · ${s.speedKey}× · ${ago(s.created_at)}</small></header>` : ''}
    <a role="menuitem" href="/score/${encodeURIComponent(id)}">${ico('ext')}Open score page</a>
    ${S.viewer === 'owner' ? `<button role="menuitem" type="button" data-pin="${esc(id)}">${ico('pin')}${S.pins.includes(String(id)) ? 'Unpin from profile' : 'Pin to profile'}</button>` : ''}
    ${s?.replay_url ? `<a role="menuitem" href="${esc(s.replay_url)}" target="_blank" rel="noopener" download>${ico('dl')}Download replay</a>` : ''}`;
  m.style.top = `${r.bottom + scrollY + 6}px`; m.style.left = `${Math.max(12, r.right + scrollX - 250)}px`;
  $('.exo').appendChild(m); btn.setAttribute('aria-expanded', 'true');
  m.querySelector('a,button').focus({preventScroll: true});
}

return {scores, scoreBody, rpChart, suggest, pickSuggestion, sug, closeMenu, openMenu};
};
