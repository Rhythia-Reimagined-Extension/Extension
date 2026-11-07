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
const {R, U, SITE, ac, esc, fmt, onlineOffer, $, cssUrl, ico, ago, SPEED, GRADES, MODES, ACCOUNT, S, kpi, pinnedScores, SCORES_ALL, tone} = c;

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
// The order a list can be shown in; '' keeps Rhythia's (the top by weighted RP, recent plays newest first).
const SORTS = [['', 'Default order'], ['new', 'Newest first'], ['old', 'Oldest first'], ['acc', 'Accuracy: high to low'], ['acclow', 'Accuracy: low to high'], ['rp', 'Most RP'], ['stars', 'Hardest first']];
const SORT_BY = {new: (a, b) => b.created_at.localeCompare(a.created_at), old: (a, b) => a.created_at.localeCompare(b.created_at), acc: (a, b) => b.acc - a.acc,
  acclow: (a, b) => a.acc - b.acc, rp: (a, b) => b.raw - a.raw, stars: (a, b) => b.stars - a.stars,
  room: (a, b) => (nearShare(near(a)) ?? 2) - (nearShare(near(b)) ?? 2), best: (a, b) => (nearShare(near(b)) ?? -1) - (nearShare(near(a)) ?? -1)};
const NEAR_SORTS = [['room', 'Most room to improve'], ['best', 'Best against players near you']];
// Map types from the history service, as Playstyle has them (ExodusData.mapStyles, kept for a year). A list's
// maps are asked for only once a type is chosen; without online history the filter offers it instead.
const KINDS = Object.entries(RhythiaX.GameTerms.TYPES).map(([k, [name]]) => [k, name]);
// tried: maps asked for in the last 10 minutes that got no answer (history off, the service refused or failed), so a
// redraw does not ask for them again at once.
const STY = {map: new Map(), tried: new Map(), busy: false, done: 0, total: 0};
const TRY_AGAIN = 10 * 60 * 1000;
const triedLately = id => Date.now() - (STY.tried.get(id) || 0) < TRY_AGAIN;
const ofKind = (s, k) => { const st = STY.map.get(s.songId); return Boolean(st) && (k === 'quantum' ? st.quantum : st.kind === k); };
function readKinds(list) {
  const Data = RhythiaX.ExodusData, ids = [...new Set(list.map(s => s.songId))];
  for (const [id, st] of Data.storedStyles(ids.filter(id => !STY.map.has(id)))) STY.map.set(id, st);
  const todo = ids.filter(id => !STY.map.has(id) && !triedLately(id));
  if (!todo.length || STY.busy) return;
  STY.busy = true; STY.done = 0; STY.total = todo.length;
  const redraw = () => { const b = $('#score-body'); if (b && S.kind) b.innerHTML = scoreBody(false); };
  Data.mapStyles(todo, ac.signal, (done, total) => { STY.done = done; STY.total = total; redraw(); })
    .then(map => { for (const [id, st] of map) STY.map.set(id, st); }, () => {})
    .finally(() => {
      STY.busy = false;
      if (ac.signal.aborted) return;
      const at = Date.now(); for (const id of todo) if (!STY.map.has(id)) STY.tried.set(id, at);
      redraw();
    });
}
/* ── Players ranked near this one ── */
// The history server's compare answer: players ranked from half the rank above to half again below, each group
// as its middle player (no names), and for every map of the top where this player sits among them. Read once
// per profile and mode, with online history only; the Scores page asks for it.
const CMP = {key: '', data: null, reason: '', busy: false};
const CMP_MODE = {normal: 'lock', spin: 'spin', vr: 'vr'};
const cmpKey = () => `${U.id}:${CMP_MODE[S.mode]}`;
function loadNear() {
  const key = cmpKey();
  if (CMP.key === key || CMP.busy) return;
  CMP.busy = true;
  RhythiaX.ExodusData.compare(U.id, CMP_MODE[S.mode], ac.signal)
    .then(d => { CMP.data = d?.available && d.band?.above && d.band?.below && d.summary ? d : null; CMP.reason = d?.reason || (d ? '' : 'unread'); }, () => { CMP.data = null; CMP.reason = 'unread'; })
    .finally(() => {
      CMP.key = key; CMP.busy = false; if (ac.signal.aborted) return;
      const el = $('#near'); if (el) { el.innerHTML = nearSection(); el.hidden = !el.innerHTML; el.classList.add('in'); }
      c.redrawScores?.();
    });
}
// Only on the Scores page: the profile's own score list keeps its usual cards.
const nearReady = () => S.section === 'scores' && Boolean(CMP.data) && CMP.key === cmpKey() && S.list === 'top';
let nearById = {key: '', map: new Map()};
const near = s => {
  if (!nearReady()) return undefined;
  if (nearById.key !== CMP.key || nearById.data !== CMP.data) nearById = {key: CMP.key, data: CMP.data, map: new Map((CMP.data.scores || []).map(x => [String(x.scoreId), x]))};
  return nearById.map.get(String(s.id));
};
const ordinal = n => { const t = n % 100, u = n % 10; return fmt(n) + (t > 10 && t < 14 ? 'th' : u === 1 ? 'st' : u === 2 ? 'nd' : u === 3 ? 'rd' : 'th'); };
// The share of nearby players this play is ahead of, 0 to 1 (null without a place).
const nearShare = x => (x?.place && x.of > 1 ? (x.of - x.place) / (x.of - 1) : null);
const NEAR_SETS = {below: 'Players below score higher', at: 'Between the two groups', above: 'You beat players above', none: 'Not compared'};
// What each nearby set means, by the history service's rule: the play's RP against the middle player of the
// group ranked just below and just above, on maps at least 5 of each group played.
const NEAR_HINTS = {
  below: own => `${own ? 'Your' : 'This player’s'} RP is under what the middle player ranked below got.`,
  at: own => `${own ? 'Your' : 'This player’s'} RP is between the middle players below and above.`,
  above: own => `${own ? 'Your' : 'This player’s'} RP matches or beats the middle player ranked above.`,
  none: () => 'Fewer than 5 players on each side played the map.',
};
// The filter menus (core/kit.js menuSelect); they fire 'change' on their button, as the selects did.
const MN = RhythiaX.ExodusKit.menuSelect(R, {signal: ac.signal});
// Map type counts only once every play's map type is known (online history on and read), so none reads 0 by mistake.
const kindsKnown = lists => (!S.offline || S.basic) && searched(lists).every(s => STY.map.has(s.songId) || triedLately(s.songId));
// Under a value: the middle player near the rank on the same map (accuracy only at the same speed).
const nearMid = (v, digits, suffix = '') => (v == null ? '' : `<small class="nd">nearby ${fmt(v, digits)}${suffix}</small>`);
const accDelta = (s, x) => nearMid(x?.all?.accMedian, 2, '%');
const missDelta = (s, x) => nearMid(x?.all?.missesMedian, 0);
const rpDelta = (s, x) => nearMid(x?.all?.rpMedian, 0);
// One map: how many players near the rank with this map this play is ahead of, as a bar.
function nearLine(s) {
  const x = near(s);
  if (!x?.place) return '<div class="nl none"><span class="nl-bar"><i style="width:0"></i></span><span class="nl-cap">Too few players nearby</span></div>';
  const others = x.of - 1, beaten = x.of - x.place, a = x.above, b = x.below, acc = v => (v == null ? '—' : `${fmt(v, 2)}%`);
  const tip = `<b>Better than ${fmt(beaten)} of ${fmt(others)} players near ${S.viewer === 'owner' ? 'your' : 'this'} rank</b><small>${fmt(x.place - 1)} of them score higher on this map</small>`
    + `<small>Above (${fmt(a.players)}): ${fmt(a.rpMedian)} RP · ${acc(a.accMedian)} · ${fmt(a.missesMedian)} misses</small>`
    + `<small>Below (${fmt(b.players)}): ${fmt(b.rpMedian)} RP · ${acc(b.accMedian)} · ${fmt(b.missesMedian)} misses</small>`
    + (x.speeds?.length ? `<small>Most play it at ${esc(x.speeds[0].speed)}× (${fmt(x.speeds[0].above + x.speeds[0].below)} of ${fmt(others)})</small>` : '');
  return `<div class="nl" data-tip="${tip}"><span class="nl-bar"><i style="width:${(beaten / (others || 1) * 100).toFixed(1)}%"></i></span>
    <span class="nl-cap num">Better than <b>${fmt(beaten)}</b> of ${fmt(others)}</span></div>`;
}
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
  const top = kind === 'top', nx = top && nearReady() ? near(s) : null;
  return `<div class="row" style="--img:${cssUrl(s.img || s.thumb)};--i:${i}">
    <span class="pos num">${top ? s.pos : ''}</span>
    <span class="thumb" style="background-image:${cssUrl(s.thumb)}"></span>
    <div class="map"><a href="/score/${encodeURIComponent(s.id)}" title="${esc(s.beatmapTitle)}">${esc(s.beatmapTitle)}</a>
      <div class="meta-line">${modChips(s)}${s.mapper ? `<span>by <b>${esc(s.mapper)}</b></span>` : ''}${s.stars ? `<span class="num">★ ${fmt(s.stars, 2)}</span>` : ''}<span>${ago(s.created_at)}</span></div></div>
    <div class="stats">
      <span class="grade ${s.grade === 'SS' ? 'ss' : ''}" style="--c:var(--g-${s.grade})">${s.grade}</span>
      <span class="v num">${fmt(s.acc, 2)}%${nx ? accDelta(s, nx) : ''}</span>
      ${s.fc ? `<span class="v fc">FC${nx ? missDelta(s, nx) : ''}</span>` : `<span class="v miss num">${fmt(s.misses)}${nx ? missDelta(s, nx) : ''}</span>`}
      <span class="v raw num">${fmt(s.raw)}${nx ? rpDelta(s, nx) : ''}</span>
      ${top ? `<span class="v w num">${fmt(s.weighted)}<small>${s.weight}%</small></span>` : `<span class="v none">—</span>`}
      ${top && nearReady() ? nearLine(s) : ''}
    </div>
    <button class="iconbtn" type="button" aria-label="Score actions" aria-haspopup="menu" data-menu="${s.id}">${ico('more')}</button>
  </div>`;
}
function tile(s, kind, i) {
  const nx = kind === 'top' && nearReady() ? near(s) : null;
  return `<article class="tile" style="--i:${i}"><div class="art" style="background-image:${cssUrl(s.img || s.thumb)}">${kind === 'top' ? `<span class="pos num">#${s.pos}</span>` : ''}<span class="grade" style="--c:var(--g-${s.grade})">${s.grade}</span><button class="iconbtn" type="button" aria-label="Score actions" aria-haspopup="menu" data-menu="${s.id}">${ico('more')}</button></div>
    <div class="body"><div class="map"><a href="/score/${encodeURIComponent(s.id)}" title="${esc(s.beatmapTitle)}">${esc(s.beatmapTitle)}</a>
      <div class="meta-line">${modChips(s)}${s.mapper ? `<span>by ${esc(s.mapper)}</span>` : ''}<span>${ago(s.created_at)}</span></div></div>
    <dl><div><dt>Accuracy</dt><dd class="v num">${fmt(s.acc, 2)}%${nx ? accDelta(s, nx) : ''}</dd></div><div><dt>Misses</dt><dd class="v ${s.fc ? 'fc' : 'miss'} num">${s.fc ? 'FC' : fmt(s.misses)}${nx ? missDelta(s, nx) : ''}</dd></div>
      <div><dt>${kind === 'top' && !nx ? 'Weighted' : 'RP'}</dt><dd class="v w num" ${nx ? `data-tip="<b>${fmt(s.weighted)} weighted</b><small>${s.weight}% of ${fmt(s.raw)} RP</small>"` : ''}>${fmt(kind === 'top' && !nx ? s.weighted : s.raw)}${nx ? rpDelta(s, nx) : ''}</dd></div></dl>${kind === 'top' && nearReady() ? `<div class="tile-near">${nearLine(s)}</div>` : ''}</div></article>`;
}
// Each filter as a test of one play, in the order they apply, so a menu can count what each of its choices
// would leave with the other filters kept.
const TESTS = {
  grade: (s, v) => s.grade === v,
  speed: (s, v) => s.speedKey === v,
  mod: (s, v) => (v === 'none' ? !(s.mods || []).length : (s.mods || []).some(m => modKey(m) === v)),
  kind: (s, v) => ofKind(s, v),
  nearSet: (s, v) => (v === 'none' ? !near(s)?.place : near(s)?.level === v),
};
const inUse = k => Boolean(S[k]) && (k !== 'nearSet' || nearReady());
const listsOf = m => ({top: m.top, reign: m.reign, recent: m.recent, pinned: S.mode === 'normal' ? pinnedScores() : []});
function searched(lists) {
  const list = lists[S.list];
  if (!S.q) return list;
  const q = S.q.toLowerCase();
  return list.filter(s => s.beatmapTitle.toLowerCase().includes(q) || s.mapper.toLowerCase().includes(q));
}
// read: ask for the map types the Map type filter needs (counting never does, so it sends nothing).
function applyFilters(list, skip, read) {
  for (const k of Object.keys(TESTS)) {
    if (k === skip || !inUse(k)) continue;
    if (k === 'kind' && read) readKinds(list);
    list = list.filter(s => TESTS[k](s, S[k]));
  }
  return list;
}
// How many plays each value of one filter leaves; '' (all) is every play the other filters leave.
function countsFor(key, lists) {
  const pool = applyFilters(searched(lists), key, false);
  return v => (v === '' ? pool.length : pool.filter(s => TESTS[key](s, v)).length);
}
function filtered() {
  const m = MODES[S.mode], lists = listsOf(m);
  let list = applyFilters(searched(lists), null, true);
  if (SORT_BY[S.sort] && (nearReady() || !NEAR_SORTS.some(([k]) => k === S.sort))) list = list.slice().sort(SORT_BY[S.sort]);
  return {m, lists, list, total: lists[S.list].length};
}
function scoreBody(anim) {
  const {m, lists, list, total} = filtered();
  const full = S.section === 'scores', per = S.view === 'grid' ? (full ? 18 : 9) : (full ? 25 : 10), pages = Math.max(1, Math.ceil(list.length / per)); S.page = Math.min(S.page, pages);
  const shown = list.slice((S.page - 1) * per, S.page * per);
  const nums = Array.from({length: pages}, (_, i) => i + 1).filter(p => p === 1 || p === pages || Math.abs(p - S.page) <= 1);
  const busy = Boolean(S.kind && STY.busy);
  const reading = S.kind && S.offline && !S.basic ? onlineOffer('Map types come from online history: Reimagined’s history service reads each map.')
    : busy ? `<p class="cap kinds-load" role="status">${S.basic ? 'Reading map files for their types' : 'Asking for map types'}: <b class="num">${fmt(STY.done)} of ${fmt(STY.total)}</b></p>`
    : S.kind && S.basic ? `<p class="cap kinds-load" data-tip="<b>Approximate</b><small>${RhythiaX.ExodusKit.BASIC_TIP}</small>">Map types worked out in this browser: approximate, without Techs.</p>` : '';
  const body = !shown.length ? `${reading}<div class="panel empty"><b>${busy ? 'Reading map types…' : total ? 'No scores match' : `No ${S.list === 'reign' ? 'reigning' : S.list} scores in ${m.label}`}</b>${total && !busy ? 'Try clearing the search or filters.' : ''}</div>`
    : S.view === 'grid' ? `${reading}<div class="tiles ${anim ? 'anim' : ''}">${shown.map((s, i) => tile(s, S.list, i)).join('')}</div>`
    : `${reading}<div class="list-panel panel ${nearReady() ? 'near' : ''}"><div class="cols" aria-hidden="true"><span>#</span><span></span><span>Map</span><span>Grade</span><span>Accuracy</span><span>Misses</span><span>RP</span><span>${S.list === 'top' ? 'Weighted' : ''}</span>${nearReady() ? `<span data-tip="<b>Nearby</b><small>The middle player of those ranked near ${S.viewer === 'owner' ? 'you' : 'this player'} who have the map in their top 100</small>">Nearby</span>` : ''}<span></span></div>
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
  const own = S.viewer === 'owner', whose = own ? 'your' : 'this player’s';
  // A filter menu: 'All …' first, then each choice with how many plays it leaves (counted only when known).
  const menu = (key, label, none, options, count = true, id = key) => {
    const n = count ? countsFor(key, lists) : null;
    return MN.html({id, label, none, value: S[key] || '', on: Boolean(S[key]), options: [{value: '', label: none, count: n ? n('') : null}, ...options.map(o => ({...o, count: n ? n(o.value) : null}))]});
  };
  return `<div class="sec-head">
      <div><h2>${S.section === 'scores' ? 'All scores' : 'Scores'}</h2>${S.section === 'scores' ? ''
        : `<p class="lede">The top 100 count toward RP, each 3% less than the one above. <a class="lede-link" href="/player/${esc(U.id)}/scores">All scores</a></p>`}</div>
      <div class="tabs seg" role="tablist" data-ink="scores">${[...(pins.length ? [['pinned', 'Pinned', pins.length]] : []), ['top','Top', m.top.length], ['reign','Reigning', m.reign.length], ['recent','Recent', m.recent.length]].map(([k, l, n]) =>
        `<button role="tab" type="button" aria-selected="${S.list === k}" data-list="${k}">${l}<span class="n num">${n}</span></button>`).join('')}</div>
    </div>
    <div class="tools">
      <div class="search-wrap"><label class="field">${ico('search')}<span class="sr">Search scores</span><input id="q" type="search" placeholder="Search map, artist or mapper  ( / )" value="${esc(S.q)}" autocomplete="off" role="combobox" aria-controls="suggest" aria-autocomplete="list"></label>
        <div class="suggest" id="suggest" role="listbox" hidden></div></div>
      ${MN.html({id: 'sort', label: 'Order', cls: 'sort', value: S.sort || '', options: [...SORTS.map(([value, label]) => ({value, label})), ...(nearReady() ? NEAR_SORTS.map(([value, label], i) => ({value, label, sec: i ? '' : `Against players near ${whose} rank`})) : [])]})}
      <div class="pills" aria-label="Layout"><button type="button" aria-pressed="${S.view === 'list'}" data-view="list" aria-label="List">${ico('list')}</button><button type="button" aria-pressed="${S.view === 'grid'}" data-view="grid" aria-label="Grid">${ico('grid')}</button></div>
    </div>
    <div class="fbar" role="group" aria-label="Filters">
      ${menu('grade', 'Grade', 'All grades', GRADES.map(g => ({value: g, label: g})))}
      ${menu('mod', 'Mods', 'All mods', [{value: 'none', label: 'No mods'}, ...mods.map((k, i) => ({value: k, label: MOD_LABEL[k] || k, sec: i ? '' : 'With'}))])}
      ${menu('speed', 'Speed', 'All speeds', speeds.map(k => ({value: k, label: `${k}×`})))}
      ${menu('kind', 'Map type', 'All map types', KINDS.filter(([value]) => !(S.basic && value === 'tech')).map(([value, label]) => ({value, label})), kindsKnown(lists))}
      ${nearReady() ? menu('nearSet', `Against players near ${whose} rank`, 'All maps nearby', Object.entries(NEAR_SETS).map(([value, label]) => ({value, label, hint: NEAR_HINTS[value](own)})), true, 'nearset') : ''}
      ${S.grade || S.mod || S.speed || S.kind || (S.nearSet && nearReady()) ? '<button class="link" type="button" data-clear-filters>Clear filters</button>' : ''}
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

/* ── Scores page: against players ranked near this one ── */
const KIND_LABEL = Object.fromEntries(KINDS);
// The ranks whose top 100 the history server keeps (its daily and weekly reads).
const NEAR_TOP = 5000;
const mmss = v => `${Math.floor(v / 60)}:${String(Math.round(v % 60)).padStart(2, '0')}`;
// better: 1 when more is better, -1 when less is, 0 when neither. src: 'g' the group numbers, 'p' plays a week.
const METRICS = [
  ['acc', 'Accuracy', v => `${fmt(v, 2)}%`, 1, 'g'],
  ['misses', 'Misses per play', v => fmt(v, 1), -1, 'g'],
  ['rp', 'Average play', v => `${fmt(v)} RP`, 1, 'g'],
  ['best', 'Best play', v => `${fmt(v)} RP`, 1, 'g'],
  ['fcs', 'Full combos', v => fmt(v), 1, 'g'],
  ['pw', 'Plays a week', v => fmt(v, 1), 0, 'p'],
  ['stars', 'Map difficulty', v => `★ ${fmt(v, 2)}`, 0, 'g'],
  ['s145', 'Played at 1.45×', v => `${fmt(v * 100, 0)}%`, 0, 'g'],
  ['secs', 'Map length', mmss, 0, 'g'],
];
const finite = v => v != null && Number.isFinite(Number(v));
function metricOf(d, [k, label, show, better, src]) {
  const g = d.players?.groups || {}, pw = d.playsPerWeek || {};
  const [b, y, a] = ['below', 'you', 'above'].map(w => (src === 'p' ? pw[w] : g[w]?.[k])).map(v => (finite(v) ? Number(v) : null));
  if (y == null || b == null || a == null) return null;
  let state = 'mid';
  if (better) { const ahead = v => (better > 0 ? y > v : y < v), behind = v => (better > 0 ? y < v : y > v); state = ahead(b) && ahead(a) ? 'hi' : behind(b) && behind(a) ? 'lo' : 'mid'; }
  else state = y > b && y > a ? 'more' : y < b && y < a ? 'less' : 'mid';
  // Between the two groups: where on the way from below to above, in thirds; the middle third is In between.
  if (state === 'mid' && a !== b) { const t = (y - b) / (a - b); state = t === 0 ? 'sameB' : t === 1 ? 'sameA' : t < 1 / 3 ? 'nearB' : t > 2 / 3 ? 'nearA' : 'mid'; }
  return {label, show, b, y, a, state};
}
// One stat: the player's own value large, the two groups' values beside it, and all three on one line from the
// lowest to the highest, each its own shape: ▲ the players ranked above (over the line), ● this player (on it),
// ▼ the players below (under it).
function metricBlock(m, who) {
  const lo = Math.min(m.b, m.y, m.a), hi = Math.max(m.b, m.y, m.a);
  const x = v => (hi > lo ? 6 + (v - lo) / (hi - lo) * 88 : 50).toFixed(1);
  const [t, l] = {hi: ['up', 'Better than both'], lo: ['down', 'Worse than both'], more: ['edge', 'Most of the three'], less: ['edge', 'Least of the three'], nearA: ['near-a', 'Closer to above'], nearB: ['near-b', 'Closer to below'], sameA: ['near-a', 'Same as above'], sameB: ['near-b', 'Same as below'], mid: ['flat', 'In between']}[m.state];
  const mark = (k, name, v) => `<i class="nm-m ${k}" style="left:${x(v)}%" data-tip="<b>${name}</b><small>${esc(m.show(v))}</small>"></i>`;
  return `<div class="nm"><header><span>${m.label}</span><span class="dpill ${t}">${l}</span></header>
    <div class="nm-main"><b class="num">${m.show(m.y)}</b><span class="nm-others"><span class="a">Above <b class="num">${m.show(m.a)}</b></span><span class="b">Below <b class="num">${m.show(m.b)}</b></span></span></div>
    <div class="nm-axis">${mark('a', 'Players above', m.a)}${mark('b', 'Players below', m.b)}${mark('y', who, m.y)}</div></div>`;
}
function nearSection() {
  const own = S.viewer === 'owner', who = own ? 'You' : esc(U.username), whose = own ? 'your' : `${esc(U.username)}’s`;
  const head = `<div class="sec-head"><div><h2>Near ${whose} rank</h2><p class="lede">${who} against the players ranked just above and below, in ${MODES[S.mode].label}.</p></div></div>`;
  // No rank because Rhythia took it away (inactive or excluded): one line that says so, and nothing is asked.
  const out = !MODES[S.mode].rank && (ACCOUNT.ban === 'excluded' ? 'excluded' : ACCOUNT.inactive ? 'inactive' : '');
  if (out) return `<p class="near-only"><b>Near ${whose} rank</b> · ${out === 'excluded' ? `${own ? 'Your account is' : 'This account is'} excluded, so it has no rank.`
    : `No rank while ${own ? 'you are' : `${esc(U.username)} is`} inactive: no score in the last 30 days.`}</p>`;
  // Nothing while reading or when the server could not be reached; one line, with more on hover, when there is
  // nobody to compare with yet or online history is off.
  if (CMP.key !== cmpKey()) { loadNear(); return ''; }
  const d = CMP.data;
  if (!d) {
    const name = esc(U.username), line = (text, tip) => `<p class="near-only"><b>Near ${whose} rank</b> · ${text}${tip ? ` <span class="near-i" data-tip="${tip}">${ico('info')}</span>` : ''}</p>`;
    if (CMP.reason === 'off') return `<div class="near-off"><b>Near ${whose} rank</b>${onlineOffer(`${who} against the players ranked just above and below. It needs online history.`)}</div>`;
    if (CMP.reason === 'not_ranked' || CMP.reason === 'unknown') return line(`Shows once ${own ? 'you reach' : `${name} reaches`} the top ${fmt(NEAR_TOP)} in Lock.`,
      `<b>Players near a rank</b><small>They are compared by their top 100, which is kept for the top ${fmt(NEAR_TOP)}.</small>`);
    if (CMP.reason === 'no_scores') return line(`${own ? 'Your' : `${name}’s`} top 100 is read once a day. Check back tomorrow.`,
      `<b>Read once a day</b><small>New players in the top ${fmt(NEAR_TOP)} are added after the next daily read.</small>`);
    return '';
  }
  const b = d.band, m = d.summary, ms = METRICS.map(x => metricOf(d, x)).filter(Boolean);
  const verdict = {ahead: 'Ahead of them', at_level: 'At their level', slightly_behind: 'A little behind', behind: 'Behind them'}[m.verdict];
  const kpis = `<div class="kpis near-kpis">
      ${kpi('', 'Overall', verdict || '—', verdict ? `higher than ${fmt(m.share * 100, 0)}% of them on shared maps` : 'fewer than 10 shared maps', {selectable: false})}
      ${kpi('', 'Players above', `#${fmt(b.above.from)}–${fmt(b.above.to)}`, `${fmt(b.above.players)} players`, {selectable: false})}
      ${kpi('', 'Players below', `#${fmt(b.below.from)}–${fmt(b.below.to)}`, `${fmt(b.below.players)} players`, {selectable: false})}
      ${kpi('', 'Shared maps', `${fmt(m.compared)} of ${fmt(m.scores)}`, 'played by both groups', {selectable: false})}
    </div>`;
  const key = `<div class="nt-key"><span class="a">Above</span><span class="y">${who}</span><span class="b">Below</span></div>`;
  const stats = ms.length ? `<div class="panel near-stats"><div class="panel-head"><h3>Top 100 <span>· ${who.toLowerCase() === 'you' ? 'yours' : `${esc(U.username)}’s`} against theirs</span></h3>${key}</div>
      <div class="nm-grid">${ms.map(x => metricBlock(x, who)).join('')}</div></div>` : '';
  const total = m.below + m.at + m.above || 1;
  const sets = [['below', m.below, `most players below score higher than ${own ? 'you' : 'this player'}`], ['at', m.at, 'between the two groups'], ['above', m.above, `${own ? 'you score' : 'this player scores'} higher than most players above`]];
  const same = `<div class="panel ns"><div class="panel-head"><h3>On the same maps <span>· ${fmt(m.compared)} shared maps</span></h3></div>
      <div class="stack ns-bar">${sets.map(([k, n]) => `<i class="${k}" style="flex-grow:${n || .01}"></i>`).join('')}</div>
      <div class="ns-sets">${sets.map(([k, n, l]) => `<div class="${k}"><b class="num">${fmt(n)} <small>maps · ${fmt(n / total * 100, 0)}%</small></b><span>${l}</span></div>`).join('')}</div></div>`;
  const t = d.mapTypes || {}, kinds = Object.keys(KIND_LABEL).filter(k => t.you?.[k] || t.above?.[k] || t.below?.[k]);
  const typeRow = (w, l) => { const v = t[w] || {}, sum = kinds.reduce((x, k) => x + (v[k] || 0), 0) || 1, main = kinds.slice().sort((x, y) => (v[y] || 0) - (v[x] || 0))[0];
    return `<div class="ps-row"><span class="ps-who ${w}">${l}</span><div class="stack">${kinds.map(k => `<i style="flex-grow:${(v[k] || 0) / sum || .001};background:var(--k-${k})" data-tip="<b>${KIND_LABEL[k]}</b><small>${fmt((v[k] || 0) * 100, 0)}% of the top</small>"></i>`).join('')}</div><span class="ps-main">Mostly <b>${KIND_LABEL[main].toLowerCase()}</b> · ${fmt((v[main] || 0) * 100, 0)}%</span></div>`; };
  const types = kinds.length ? `<div class="panel nt"><div class="panel-head"><h3>Map types <span>· share of each top 100</span></h3><div class="nt-key">${kinds.map(k => `<span class="kind" style="--c:var(--k-${k})">${KIND_LABEL[k]}</span>`).join('')}</div></div>
      <div class="ps-rows">${typeRow('above', 'Above')}${typeRow('you', who)}${typeRow('below', 'Below')}</div></div>` : '';
  const band = b.above.players + b.below.players, short = x => esc(KIND_LABEL[x] || 'Map');
  const mapRow = (title, sub, n, tip) => `<div class="nx-row"><div class="nx-t"><b>${esc(title)}</b><small>${sub}</small></div>
      <div class="nx-n" ${tip ? `data-tip="${tip}"` : ''}><span class="nx-bar"><i style="width:${(n / (band || 1) * 100).toFixed(1)}%"></i></span><span class="num">${n >= 5 ? `<b>${fmt(n)}</b> of ${fmt(band)}` : 'fewer than 5'}</span></div></div>`;
  const theirs = (d.players?.missing || []).map(x => mapRow(x.title, `by ${esc(x.mapper || '—')} · ★ ${fmt(x.stars, 2)} · ${short(x.kind)}`, x.a + x.b, `<b>${fmt(x.b)} below, ${fmt(x.a)} above</b>`)).join('');
  const byId = new Map(MODES[S.mode].top.map(s => [String(s.id), s]));
  const yours = (d.scores || []).map(c => ({c, s: byId.get(String(c.scoreId)), n: c.all?.players || 0})).filter(x => x.s && x.n < band * .2)
    .sort((x, y) => x.n - y.n || x.s.pos - y.s.pos).slice(0, 6)
    .map(({c, s, n}) => mapRow(s.beatmapTitle, `#${s.pos} in ${whose} top · ${short(c.quantum ? 'quantum' : c.kind)}`, n)).join('');
  const lists = theirs || yours ? `<div class="nx-pair">
      ${theirs ? `<div class="panel nx"><div class="panel-head"><h3>Their maps, missing from ${own ? 'yours' : whose + ' top'}</h3><span class="cap">have it in their top 100</span></div>${theirs}</div>` : ''}
      ${yours ? `<div class="panel nx"><div class="panel-head"><h3>${own ? 'Your' : whose} maps they rarely play</h3><span class="cap">have it in their top 100</span></div>${yours}</div>` : ''}</div>` : '';
  return head + kpis + stats + same + types + lists;
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

return {scores, scoreBody, rpChart, nearSection, suggest, pickSuggestion, sug, closeMenu, openMenu};
};
