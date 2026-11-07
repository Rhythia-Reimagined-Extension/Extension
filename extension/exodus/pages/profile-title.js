// =============================================
// Reimagined for Rhythia — Exodus profile: title progression
// =============================================
// The Title panel beside About: the player's Rhythia title, how far the next one is, and the way there in one of
// three looks (the popup's Title look, exodus.titleLook): Road, the tilted Rhythia square; Ring; Track, a line.
// Titles follow Rhythia's own rule (getRhythiaTitle on rhythia.com): Expert from 1,500 RP, Candidate Master from
// 2,500, Master from 5,000 up to 10,000, Candidate Grandmaster above that, and Grandmaster for the top 30 with more
// than 10,000 RP. Inactive players have no rank, so they cannot hold Grandmaster; the titles by RP stay.
// When a title was reached comes from Rhythia itself: the RP it rebuilds from the top plays (as its own History
// view does) and its daily rank history (getProfile rank_history). What #30 has comes from the first page of
// the leaderboard, asked only for players past 10,000 RP.
// The panel fills to the player's place the first time it shows. After that it opens where it was last time in
// this browser and moves only by what changed since: RP up or down, each title won or lost turning over with a spin.

var RhythiaX = RhythiaX || {};
RhythiaX.ExodusProfileParts = RhythiaX.ExodusProfileParts || {};

RhythiaX.ExodusProfileParts.title = function mountProfileTitle(c) {
'use strict';
const {R, D, ac, U, ICONS, esc, fmt, REDUCED, TITLES, MODES, ACCOUNT, OWN, S} = c;
// Rhythia's rule as both looks have it (shared/game-terms.js): the title for an RP and rank, where each title after
// Novice starts (Candidate Grandmaster above 10,000, not at it), the RP to the next one and how far along it is.
const {titleIndex, NEXT, rpToGo: toGo, percent} = RhythiaX.GameTerms;
const LOOKS = ['road', 'ring', 'track'];
const look = () => (LOOKS.includes(RhythiaX.ExodusPrefs?.exodus?.titleLook) ? RhythiaX.ExodusPrefs.exodus.titleLook : 'road');
const NS = 'http://www.w3.org/2000/svg', TILT = -16;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const ceil = v => fmt(Math.max(0, Math.ceil(v)));
// Grandmaster's colour is a grey; as text it is the text colour.
const ink = t => (t.id === 'grandmaster' ? 'var(--text)' : t.c);
const dm = (t, year) => new Date(t).toLocaleDateString('en-GB', {day: 'numeric', month: 'short', ...(year ? {year: 'numeric'} : {})});
const when = t => dm(t, new Date(t).getFullYear() !== new Date().getFullYear());

/* ── Rhythia's rule ── */
// The RP just over and just under each line.
const over = v => (v === NEXT[3] ? v + .01 : v), under = v => (v === NEXT[3] ? v : v - .01);
const wins = (v, rp) => rp >= over(v);
const RP = () => MODES.normal.rp || 0;
// The rank Rhythia sent; an inactive or excluded player has none, as the hero shows (profile-hero.js).
const RANK = () => MODES.normal.rank || null;
// The first leaderboard page, for what #30, #31 and the place above have: asked once, for players past 10,000 RP.
let board = null, boardAsk = null;
const placeRp = n => board?.find(p => p.position === n)?.rp ?? null;
function askBoard() {
  if (boardAsk || RP() <= 10000) return boardAsk || Promise.resolve();
  boardAsk = RhythiaX.ExodusData.topPlaces('normal', ac.signal).then(list => { board = list; }, () => { board = []; });
  return boardAsk;
}

/* ── The way there: the four RP titles by the RP they need, then Grandmaster's part ── */
const LEGS = [15, 10, 25, 50].map(v => v * .78).concat([22]);
const AT = LEGS.reduce((a, v) => (a.push(a.at(-1) + v), a), [0]);
function standing(rp, rank) {
  const st = RhythiaX.GameTerms.standing(rp, rank, placeRp(30));
  return {...st, pos: st.i === 5 ? 100 : AT[st.i] + LEGS[st.i] * st.u};
}

/* ── Rhythia's history: RP rebuilt from the top plays, and the daily rank ── */
// As rhythia.com does for its History view: the plays in the order they were set, each one joining the weighted
// list (97% a place, down to 5%), then lifted so the last point is today's RP.
const career = (() => {
  const plays = (D.scores.top || []).map(s => ({t: Date.parse(s.created_at), sp: s.awarded_sp || 0})).filter(p => Number.isFinite(p.t)).sort((a, b) => a.t - b.t).slice(-100);
  if (!plays.length) return [];
  const w = [1]; for (let i = 1; i <= plays.length; i++) w.push(w[i - 1] >= .05 ? w[i - 1] * .97 : w[i - 1]);
  const kept = []; let sum = 0;
  const raw = plays.map(p => {
    let lo = 0, hi = kept.length;
    while (lo < hi) { const m = (lo + hi) >> 1; if (p.sp > kept[m]) hi = m; else lo = m + 1; }
    let shift = 0; for (let j = lo; j < kept.length; j++) shift += (w[j + 1] - w[j]) * kept[j];
    sum += shift + w[lo] * p.sp; kept.splice(lo, 0, p.sp);
    return sum;
  });
  const lift = RP() - raw.at(-1);
  return plays.map((p, i) => ({t: p.t, rp: Math.max(0, raw[i] + lift)}));
})();
const ranks = (U.rank_history || []).filter(h => h.position > 0).map(h => ({t: Date.parse(h.date), rank: h.position})).filter(h => Number.isFinite(h.t));
// When a title was reached: {t} (around then), {before: t} when it was already held at the first point Rhythia
// has, or null when that is not known.
function reachedOn(k) {
  if (k === 5) { const i = ranks.findIndex(h => h.rank <= 30); return i < 0 ? null : i === 0 ? {before: ranks[0].t} : {t: ranks[i].t}; }
  if (!career.length) return null;
  const i = k === 0 ? 0 : career.findIndex(p => wins(NEXT[k - 1], p.rp));
  return i < 0 ? null : i === 0 ? {before: career[0].t} : {t: career[i].t};
}
const reachedText = r => (!r ? '' : r.before ? `Held before ${when(r.before)}` : `Reached around ${when(r.t)}`);
// The RP won over the last 30 days (fewer when the daily history is shorter), from the same daily history as the
// Statistics chart, so the two agree. The rebuild above only gives the shape: plays later beaten are not in the top
// list, so its older points come out too low.
function pace() {
  const H = c.H || [], days = Math.min(30, H.length - 1);
  if (days < 1) return null;
  const a = H[H.length - 1 - days].skillPoints, b = H.at(-1).skillPoints;
  return Number.isFinite(a) && Number.isFinite(b) && a > 0 ? {days, rp: b - a} : null;
}

/* ── Words ── */
function goal(rp, rank, st) {
  if (st.i === 5) {
    const up = placeRp(rank - 1);
    return {k: rank === 1 ? 'Number one' : rank <= 3 ? 'Podium finish' : 'Grandmaster', big: `#${rank}`, c: 'var(--text)',
      sm: rank === 1 ? 'The one above the rest' : up ? `#${rank - 1} has ${ceil(up - rp)} RP more` : 'in the world'};
  }
  if (st.i === 4) {
    if (!rank) return {k: ACCOUNT.ban === 'excluded' ? 'Excluded' : 'Inactive', big: 'Not ranked', c: 'var(--muted)', sm: ACCOUNT.ban === 'excluded' ? 'Kept out of the rankings' : 'The next score brings the rank back'};
    const p30 = placeRp(30);
    return {k: `${st.near ? 'Almost there · ' : ''}To Grandmaster`, big: `${fmt(rank - 30)} place${rank - 30 === 1 ? '' : 's'}`, c: st.near ? 'var(--text)' : TITLES[4].c,
      sm: p30 ? `#30 has ${fmt(p30, 0)} RP` : 'to the top 30'};
  }
  const n = TITLES[st.i + 1];
  return {k: `${st.near ? 'Almost there · ' : ''}To ${n.name}`, big: `${ceil(toGo(st.i, rp))} RP`, c: ink(n), sm: `${percent(st.u)}% of the way`};
}
function sentence(rp, rank, st) {
  const g = pace(), gain = g && g.rp >= .5 ? ` Last ${g.days === 1 ? 'day' : `${g.days} days`}: <span class="up">+${fmt(g.rp, 1)} RP</span>.` : '';
  if (!rank && st.i === 4) return `No rank while ${ACCOUNT.ban === 'excluded' ? 'excluded' : 'inactive'}, so Grandmaster waits.${gain}`;
  if (st.i === 5) { const p31 = placeRp(31); return `${p31 ? `#31 is ${ceil(rp - p31)} RP behind.` : 'In the top 30.'}${gain}`; }
  if (st.i === 4) { const p30 = placeRp(30); return `${p30 ? `${ceil(p30 - rp)} RP short of what #30 has.` : `#${fmt(rank)} on the leaderboard.`}${gain}`; }
  return `${TITLES[st.i + 1].name} starts ${st.i === 3 ? 'above' : 'at'} ${fmt(NEXT[st.i])} RP.${gain}`;
}
function facts(k) {
  const t = TITLES[k], rp = RP(), rank = RANK(), st = standing(rp, rank), on = reachedOn(k);
  const need = k === 5 ? 'Top 30, more than 10,000 RP' : k === 0 ? 'Where everyone starts' : k === 4 ? 'More than 10,000 RP' : `${fmt(NEXT[k - 1])} RP`;
  let status;
  if (k < st.i || (k === 5 && st.i === 5)) status = reachedText(on) || 'Reached';
  else if (k === st.i) status = `Your title now${on && !on.before ? ` · since around ${when(on.t)}` : ''}`;
  else if (k === 5) status = rank ? `${fmt(rank - 30)} places to go` : 'Needs a rank';
  else status = `${ceil(toGo(k - 1, rp))} RP to go`;
  return {t, need, status};
}
const tip = k => { const f = facts(k); return `<b>${esc(f.t.name)}</b><small>${esc(f.need)} · ${esc(f.status)}</small>`; };

/* ── Shapes ── */
// The Rhythia square as one path from the top middle, clockwise, and the point a share f (0..1) along it.
const SQ = {x: 40, y: 40, s: 220, r: 66};
const sqPath = ({x, y, s, r}) => `M${x + s / 2},${y} H${x + s - r} A${r},${r} 0 0 1 ${x + s},${y + r} V${y + s - r} A${r},${r} 0 0 1 ${x + s - r},${y + s} H${x + r} A${r},${r} 0 0 1 ${x},${y + s - r} V${y + r} A${r},${r} 0 0 1 ${x + r},${y} Z`;
function sqPoint({x, y, s, r}, f) {
  const side = s - 2 * r, arc = Math.PI * r / 2, parts = [side / 2, arc, side, arc, side, arc, side, arc, side / 2];
  let d = f * parts.reduce((a, b) => a + b, 0);
  const corner = (cx, cy, a0, u) => [cx + r * Math.cos(a0 + u * Math.PI / 2), cy + r * Math.sin(a0 + u * Math.PI / 2)];
  const walk = [
    u => [x + s / 2 + u * side / 2, y], u => corner(x + s - r, y + r, -Math.PI / 2, u), u => [x + s, y + r + u * side],
    u => corner(x + s - r, y + s - r, 0, u), u => [x + s - r - u * side, y + s], u => corner(x + r, y + s - r, Math.PI / 2, u),
    u => [x, y + s - r - u * side], u => corner(x + r, y + r, Math.PI, u), u => [x + r + u * side / 2, y]];
  for (let i = 0; i < parts.length; i++) { if (d <= parts[i] || i === parts.length - 1) return walk[i](clamp(d / parts[i])); d -= parts[i]; }
  return [x + s / 2, y];
}
// The road runs from 3.5% to 96.5% of the loop; the gap between is where it closes at Grandmaster.
const ROAD0 = 3.5, ROADL = 93, along = p => ROAD0 + ROADL * p / 100, GAP = .7;
const LOOP = {
  road: {W: 20, el: 'path', attrs: `d="${sqPath(SQ)}"`, at: p => sqPoint(SQ, along(p) / 100), turn: `rotate(${TILT} 150 150)`, back: -TILT, out: 0},
  ring: {W: 16, el: 'circle', attrs: 'cx="150" cy="150" r="104"', at: p => { const a = along(p) / 100 * 2 * Math.PI; return [150 + 104 * Math.cos(a), 150 + 104 * Math.sin(a)]; }, turn: 'rotate(-90 150 150)', back: 90, out: 29},
};
const TRACK = {Wd: 720, x0: 26, x1: 694, Y: 66, H: 8};
const tx = p => TRACK.x0 + (TRACK.x1 - TRACK.x0) * p / 100;

function nodeXY(lk, k) {
  if (lk === 'track') return [k === 5 ? tx(100) - 6 : tx(AT[k]) + (k ? 0 : 8), 27];
  const L = LOOP[lk]; let [x, y] = L.at(k === 5 ? 100 : AT[k]);
  if (L.out) { const a = Math.atan2(y - 150, x - 150); x = 150 + (104 + L.out) * Math.cos(a); y = 150 + (104 + L.out) * Math.sin(a); }
  return [x, y];
}
// A title on the way: its icon in grey, and in colour from the bottom up as far as it is reached (the next one
// fills as the player gets close).
function node(lk, k, back) {
  const t = TITLES[k], [x, y] = nodeXY(lk, k);
  return `<g class="tnode" data-tier="${k}" role="button" tabindex="0" aria-label="${esc(t.name)}" data-tip="${esc(tip(k))}"${back ? ` transform="rotate(${back} ${x} ${y})"` : ''}>
    <circle cx="${x}" cy="${y}" r="20" fill="transparent"/><g class="spin" data-k="${k}">
    <image href="${ICONS[t.id] || ''}" x="${x - 15}" y="${y - 15}" width="30" height="30" class="off"/>
    <clipPath id="tclip-${k}"><rect x="${x - 16}" y="${y + 16}" width="32" height="0"/></clipPath>
    <image href="${ICONS[t.id] || ''}" x="${x - 15}" y="${y - 15}" width="30" height="30" clip-path="url(#tclip-${k})"/></g></g>`;
}

/* ── The panel ── */
function viz(lk, icon) {
  if (lk === 'track') {
    const {Wd, Y, H} = TRACK;
    const bars = TITLES.slice(0, 5).map((t, k) => `<rect class="bed" x="${tx(AT[k]) + (k ? GAP * 2 : 0)}" y="${Y}" width="${tx(AT[k + 1]) - tx(AT[k]) - GAP * 4}" height="${H}" rx="4"/>`).join('');
    const legs = TITLES.slice(0, 5).map((t, k) => `<rect class="leg" data-k="${k}" x="${tx(AT[k]) + (k ? GAP * 2 : 0)}" y="${Y}" width="0" height="${H}" rx="4" fill="${t.c}"/>`).join('');
    const stems = TITLES.map((t, k) => { const [x] = nodeXY('track', k); return `<line x1="${x}" y1="48" x2="${x}" y2="${Y - 3}" class="stem"/>`; }).join('');
    return `<svg class="tsvg track" viewBox="0 0 ${Wd} 108" role="img" aria-label="Titles on the way">${bars}${legs}${stems}<circle class="head" cy="${Y + H / 2}" r="7" cx="${tx(0)}"/>${TITLES.map((t, k) => node('track', k, 0)).join('')}<text class="tlab num" y="${Y + 34}" text-anchor="middle"></text></svg>`;
  }
  const L = LOOP[lk], shape = a => `<${L.el} ${L.attrs} pathLength="100" fill="none" ${a}/>`;
  const legs = TITLES.slice(0, 5).map((t, k) => shape(`class="leg" data-k="${k}" stroke="${t.c}" stroke-width="${L.W}" stroke-dasharray="0 100" stroke-dashoffset="${-along(AT[k])}"${k ? '' : ' stroke-linecap="round"'}`)).join('');
  const shut = [[ROAD0 + ROADL, 100 - ROAD0 - ROADL], [0, ROAD0]].map(([o, len]) => shape(`class="shut" stroke="${TITLES[5].c}" stroke-width="${L.W}" stroke-dasharray="${len} 100" stroke-dashoffset="${-o}"`)).join('');
  return `<svg class="tsvg loop" viewBox="0 0 300 300" role="img" aria-label="Titles on the way"><g transform="${L.turn}">
    ${shape(`class="bed" stroke-width="${L.W}" stroke-dasharray="${ROADL} 100" stroke-dashoffset="${-ROAD0}" stroke-linecap="round"`)}${legs}${shut}
    <circle class="head" r="7"/>${TITLES.map((t, k) => node(lk, k, L.back)).join('')}</g>
    <g class="cbox"><image href="${icon}" x="118" y="90" width="64" height="64"/></g>
    <text class="crp num" x="150" y="182" text-anchor="middle"></text><text class="csub" x="150" y="201" text-anchor="middle"></text></svg>`;
}
// Rhythia's Grandmaster bar: 27 places from #30 to #4, then three crowns.
function top30(rank, st) {
  if (st.i < 4) return '';
  const gm = st.i === 5, sw = 16, gap = 3.2, x = r => (30 - r) * (sw + gap), total = x(1) + sw;
  const crown = (r, on) => { const a = x(r); return `<path class="c${on ? ` on p${r}` : ''}" data-r="${r}" d="M${a + 1},13 L${a + 2},4 L${a + 5.5},8.5 L${a + 8},2 L${a + 10.5},8.5 L${a + 14},4 L${a + 15},13 Z"/>`; };
  let cells = '';
  for (let r = 30; r >= 1; r--) cells += r <= 3 ? crown(r, gm && r >= rank) : `<rect class="${gm && r >= rank ? 'on' : ''}${gm && r === rank ? ' me' : ''}" data-r="${r}" x="${x(r)}" y="3" width="${sw}" height="10" rx="3"/>`;
  const me = gm ? `<text class="you" x="${x(rank) + sw / 2}" y="-6" text-anchor="middle">#${rank}</text>` : `<text class="you out" x="-10" y="12" text-anchor="end">${rank ? `#${fmt(rank)}` : '—'}</text>`;
  return `<div class="t30"><span class="cap">Top 30</span><svg viewBox="${gm ? -20 : -56} -20 ${total + (gm ? 40 : 58)} 36" aria-label="${gm ? `#${rank} of the top 30` : 'Outside the top 30'}">${me}${cells}</svg></div>`;
}
function cardHtml() {
  if (S.tier == null) return '';
  const k = S.tier, f = facts(k);
  return `<div class="tcard"><img src="${ICONS[f.t.id] || ''}" alt=""><div><b style="color:${ink(f.t)}">${esc(f.t.name)}</b><span class="cap">${esc(f.need)}</span><span class="num">${esc(f.status)}</span></div>${spark(k)}</div>`;
}
// How it went: the RP Rhythia rebuilds, the time at this title in its colour, and the line to the next one.
function spark(k) {
  if (career.length < 3) return '';
  const st = standing(RP(), RANK()), cur = st.i === k && k < 5, g = cur ? TITLES[k + 1] : TITLES[k];
  const th = g.id === 'grandmaster' ? placeRp(30) || 0 : k === 0 && !cur ? 0 : cur ? NEXT[k] : NEXT[k - 1];
  const Wd = 210, Ht = 54, t0 = career[0].t, t1 = Math.max(Date.now(), career.at(-1).t), hi = Math.max(RP(), th) * 1.04 || 1;
  const X = t => (t - t0) / Math.max(1, t1 - t0) * Wd, Y = v => Ht - 2 - v / hi * (Ht - 6);
  const pts = [...career, {t: t1, rp: RP()}].map(p => `${X(p.t).toFixed(1)},${Y(p.rp).toFixed(1)}`);
  const iOf = p => titleIndex(p.rp, 0);
  const a = career.findIndex(p => iOf(p) >= Math.min(k, 4)), b = career.findIndex(p => iOf(p) > Math.min(k, 4));
  const part = a < 0 ? '' : pts.slice(a, b < 0 ? undefined : b + 1).join(' ');
  return `<svg class="tspark" viewBox="0 -6 ${Wd} ${Ht + 22}" aria-hidden="true">
    ${th ? `<line x1="0" x2="${Wd}" y1="${Y(th)}" y2="${Y(th)}" stroke="${g.c}"/><text x="${Wd}" y="${Y(th) - 4}" text-anchor="end">${g.id === 'grandmaster' ? '#30 today' : `${cur ? `${esc(g.short || g.name)} · ` : ''}${fmt(th)} RP`}</text>` : ''}
    <polyline points="${pts.join(' ')}" class="all"/>${part ? `<polyline points="${part}" stroke="${TITLES[k].c}" class="part"/>` : ''}
    <text x="0" y="${Ht + 13}">${esc(when(t0))}</text><text x="${Wd}" y="${Ht + 13}" text-anchor="end">today</text></svg>`;
}

// What the panel shows, as one key: while it is the same, a redraw of the intro leaves the panel as it is.
const keyOf = () => [look(), RP(), RANK(), Math.round(pace()?.rp ?? -1), ACCOUNT.inactive ? 1 : 0, ACCOUNT.ban || '', S.tier ?? '', board ? board.length : '-'].join('|');
function html() {
  const lk = look(), rp = RP(), rank = RANK(), st = standing(rp, rank), t = TITLES[st.i], g = goal(rp, rank, st), out = !rank && (ACCOUNT.inactive || ACCOUNT.ban === 'excluded');
  return `<section class="panel tpanel ${out ? 'out' : ''}" aria-labelledby="title-h" id="title-sec" data-keep="${esc(keyOf())}">
    <h3 id="title-h">Title</h3>
    <div class="title-head"><span class="ticon"><img src="${ICONS[t.id] || ''}" alt=""></span>
      <div class="twho"><strong class="tname" style="color:${ink(t)}">${esc(t.name)}</strong><span class="cap num tsub"><span class="trp">${fmt(rp, 2)} RP</span><span class="tgain"></span><span class="trank">&nbsp;· ${rank ? `#${fmt(rank)} global` : 'not ranked'}</span>${out ? `<span class="tchip">${ACCOUNT.ban === 'excluded' ? 'Excluded' : 'Inactive'}</span>` : ''}<span class="tchip new" hidden>New title</span></span></div>
      <div class="goal"><span class="cap tk">${esc(g.k)}</span><b class="num tbig" style="color:${g.c}">${esc(g.big)}</b><span class="cap num tsm">${esc(g.sm)}</span></div></div>
    <div class="tviz ${lk}">${viz(lk, ICONS[t.id] || '')}<p class="tsay">${sentence(rp, rank, st)}</p></div>
    ${top30(rank, st)}${cardHtml()}
  </section>`;
}

/* ── Drawing a moment of the climb ── */
// The header's goal: what the next title needs from rp.
function words(el, rp, rank, st = standing(rp, rank)) {
  const g = goal(rp, rank, st), big = el.querySelector('.tbig');
  el.querySelector('.tk').textContent = g.k; el.querySelector('.tsm').textContent = g.sm; big.style.color = g.c;
  if (big.textContent !== g.big) big.textContent = g.big;
}
function paint(el, rp, moving, rank = RANK()) {
  const lk = look(), st = standing(rp, rank), q = s => el.querySelector(s), all = s => el.querySelectorAll(s);
  if (lk === 'track') {
    all('.leg').forEach(r => { const k = +r.dataset.k, w = tx(Math.min(AT[k + 1], st.pos)) - tx(AT[k]) - (k ? GAP * 2 : 0) - (st.pos >= AT[k + 1] ? GAP * 2 : 0); r.setAttribute('width', Math.max(0, w)); });
    const hx = tx(Math.min(st.pos, 100)), lab = q('.tlab');
    q('.head').setAttribute('cx', hx);
    if (lab) { lab.setAttribute('x', clamp(hx, 50, TRACK.Wd - 50)); lab.textContent = st.i === 5 ? '' : rank ? `#${fmt(rank)}` : 'not ranked'; lab.style.fill = rank ? ink(TITLES[st.i]) : 'var(--muted)'; }
  } else {
    const L = LOOP[lk];
    // The colours meet under each title's icon, with no gap between them.
    all('.leg').forEach(p => { const k = +p.dataset.k, len = Math.max(0, Math.min(LEGS[k], st.pos - AT[k])) * ROADL / 100; p.setAttribute('stroke-dasharray', `${len} 100`); p.setAttribute('stroke-dashoffset', -along(AT[k])); });
    all('.shut').forEach(p => p.classList.toggle('on', st.i === 5));
    const [x, y] = L.at(Math.min(st.pos, 99.99)), h = q('.head'); h.setAttribute('cx', x); h.setAttribute('cy', y);
    q('.crp').textContent = fmt(rp, 2);
    q('.csub').textContent = rank ? `RP · #${fmt(rank)} global` : 'RP · not ranked';
  }
  const head = q('.head'); head.style.stroke = TITLES[st.i].c; head.classList.toggle('gone', st.i === 5); head.classList.toggle('hollow', !rank && st.i === 4);
  all('.tnode').forEach(n => {
    const k = +n.dataset.tier, reached = k === 5 ? st.i === 5 : k <= st.i, next = k === st.i + 1 || (st.i === 4 && k === 5);
    const f = reached ? 1 : next ? st.u : 0, r = n.querySelector('clipPath rect'), y0 = +r.getAttribute('y') + +r.getAttribute('height');
    r.setAttribute('height', 32 * f); r.setAttribute('y', y0 - 32 * f);
  });
  // A first look keeps the header on where the climb ends; a rank up turns the words over itself.
  if (!el.classList.contains('turning') && !el.classList.contains('first')) words(el, rp, rank, st);
  q('.trp').textContent = `${fmt(rp, 2)} RP`;
  el.classList.toggle('moving', !!moving);
  return st;
}
// The settled panel: the icons in the middle, the header and the words.
function settle(el) {
  const rp = RP(), rank = RANK(), st = paint(el, rp, false), t = TITLES[st.i];
  const cb = el.querySelector('.cbox image'); if (cb) cb.setAttribute('href', ICONS[t.id] || '');
  el.querySelector('.tsay').innerHTML = sentence(rp, rank, st);
}

/* ── The rank up: the title icon spins and turns to the new colour on the way, slowing to a stop ── */
const SPIN = {duration: 2000, easing: 'cubic-bezier(.12,.75,.2,1)'};
function spinTo(box, make, dir = 1) {
  if (!box) return;
  const a = box.lastElementChild, b = make(); box.appendChild(b);
  box.style.transformBox = 'fill-box'; box.style.transformOrigin = 'center';
  box.animate([{transform: 'rotate(0deg) scale(1)'}, {transform: `rotate(${260 * dir}deg) scale(.9)`, offset: .25}, {transform: `rotate(${690 * dir}deg) scale(1.04)`, offset: .75}, {transform: `rotate(${720 * dir}deg) scale(1)`}], SPIN);
  a?.animate([{opacity: 1}, {opacity: 1, offset: .2}, {opacity: 0, offset: .55}, {opacity: 0}], {...SPIN, fill: 'forwards'}).finished.then(() => a.remove(), () => {});
  b.animate([{opacity: 0}, {opacity: 0, offset: .2}, {opacity: 1, offset: .55}, {opacity: 1}], SPIN);
}
// A title lost (down) spins the other way and gets no "New title" chip.
function rankUp(el, k, down = false) {
  const t = TITLES[k], dir = down ? -1 : 1;
  el.classList.add('turning');
  spinTo(el.querySelector('.cbox'), () => { const i = document.createElementNS(NS, 'image'); for (const [a, v] of [['href', ICONS[t.id] || ''], ['x', 118], ['y', 90], ['width', 64], ['height', 64]]) i.setAttribute(a, v); return i; }, dir);
  spinTo(el.querySelector('.ticon'), () => Object.assign(document.createElement('img'), {src: ICONS[t.id] || '', alt: ''}), dir);
  const nd = el.querySelector(`.tnode[data-tier="${k}"] .spin`);
  if (nd) { nd.style.transformBox = 'fill-box'; nd.style.transformOrigin = 'center'; nd.animate([{transform: 'rotate(0deg)'}, {transform: `rotate(${360 * dir}deg)`}], SPIN); }
  // The words turn over at the middle of the spin.
  const nm = el.querySelector('.tname'), tag = el.querySelector('.tchip.new');
  nm.animate([{opacity: 1, transform: 'none'}, {opacity: 0, transform: 'translateY(-30%)', offset: .4}, {opacity: 0, transform: 'translateY(30%)', offset: .45}, {opacity: 1, transform: 'none'}], {duration: 1100, easing: 'ease-in-out'});
  setTimeout(() => {
    nm.textContent = t.name; nm.style.color = ink(t);
    el.classList.remove('turning');
    if (down) return;
    tag.hidden = false; tag.animate([{opacity: 0, transform: 'translateX(-4px)'}, {opacity: 1, transform: 'none'}], {duration: 380, easing: 'cubic-bezier(.22,1,.36,1)'});
    setTimeout(() => tag.animate([{opacity: 1}, {opacity: 0}], {duration: 400}).finished.then(() => { tag.hidden = true; }, () => {}), 3200);
  }, 480);
  if (k === 5 && !down) { const box = el.querySelector('.t30'); if (box) box.classList.add('fill'); }
}

/* ── The climb ── */
// The panel remembers where each player stood the last time it moved in this browser ({rp, rank, at}), for the 60
// players seen last (by at: player IDs are numeric keys, which JavaScript keeps in ascending order). The first look
// fills the way from nothing; after that only what changed moves: RP up or down, and a title won or lost.
const SEEN_KEY = 'rhythiax_exodus_title_seen';
function seen() { try { const all = JSON.parse(localStorage.getItem(SEEN_KEY) || '{}'); return all && typeof all === 'object' ? all : {}; } catch (_) { return {}; } }
// The last record for this player.
function last() {
  const v = seen()[U.id];
  if (!v || typeof v !== 'object' || !Number.isFinite(v.rp) || v.rp < 0) return null;
  return {rp: v.rp, rank: Number.isFinite(v.rank) && v.rank >= 0 ? v.rank : undefined};
}
function remember() {
  try {
    const all = seen(); all[U.id] = {rp: RP(), rank: RANK() || 0, at: Date.now()};
    const old = Object.keys(all).sort((a, b) => (Number(all[a]?.at) || 0) - (Number(all[b]?.at) || 0));
    for (const id of old.slice(0, Math.max(0, old.length - 60))) delete all[id];
    localStorage.setItem(SEEN_KEY, JSON.stringify(all));
  } catch (_) {}
}
const ease = {out: u => 1 - Math.pow(1 - u, 4), inOut: u => (u < .5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2)};
const wait = ms => new Promise(r => setTimeout(r, ms));
function tween(el, a, b, ms, fn, rk = () => RANK()) {
  return new Promise(res => {
    const t0 = performance.now();
    const step = now => { if (ac.signal.aborted || !el.isConnected) return res(false); const u = Math.min(1, (now - t0) / ms), v = a + (b - a) * fn(u); paint(el, v, u < 1, rk(v, u));  u < 1 ? requestAnimationFrame(step) : res(true); };
    requestAnimationFrame(step);
  });
}
// The RP won or lost since the last visit, beside the RP: it slides in and, later, folds away.
function showGain(el, n) {
  const g = el.querySelector('.tgain'), a = Math.abs(n);
  g.textContent = `${n < 0 ? '−' : '+'}${fmt(a, a < 10 ? 2 : 0)}`; g.classList.toggle('down', n < 0);
  g.animate([{opacity: 0, transform: 'translateX(-6px)', maxWidth: '0px'}, {opacity: 1, transform: 'none', maxWidth: '80px'}], {duration: 520, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'both'});
  setTimeout(() => g.animate([{opacity: 1, maxWidth: '80px'}, {opacity: 0, maxWidth: '0px'}], {duration: 600, easing: 'ease-in', fill: 'forwards'}).finished.then(() => { g.textContent = ''; g.getAnimations().forEach(a => a.cancel()); }, () => {}), 4200);
}
const header = (el, t) => {
  el.querySelector('.ticon').replaceChildren(Object.assign(document.createElement('img'), {src: ICONS[t.id] || '', alt: ''}));
  el.querySelector('.cbox image')?.setAttribute('href', ICONS[t.id] || '');
  const nm = el.querySelector('.tname'); nm.textContent = t.name; nm.style.color = ink(t);
};
// What the panel shows before it moves, or null when nothing changed since the last visit.
function plan() {
  const to = RP(), rank = RANK(), end = standing(to, rank), was = last();
  if (!was) {
    // A player who ends in Grandmaster is outside the top 30 on the way there: the rank comes at the end.
    return {first: true, from: 0, to, rank, end, before: end.i === 5 ? 31 : rank};
  }
  const before = was.rank !== undefined ? was.rank : end.i === 5 && was.rp < to ? 31 : rank;
  const start = standing(was.rp, before);
  if (Math.abs(to - was.rp) < .005 && start.i === end.i) return null;
  return {first: false, from: was.rp, to, rank, end, before, startI: start.i};
}
// The start of the move, drawn as soon as the panel mounts so it never shows the end first.
function prepare(el, p) {
  if (p.first) { el.classList.add('first'); header(el, TITLES[p.end.i]); paint(el, 0, false, p.before); return; }
  header(el, TITLES[p.startI]); paint(el, p.from, false, p.before);
  el.querySelector('.tsay').innerHTML = sentence(p.from, p.before, standing(p.from, p.before));
}
let climbing = false;
async function climb(el, p) {
  climbing = true;
  // Saved first, so a reload in the middle does not play the same move again.
  remember();
  try { await climbOnce(el, p); } finally { climbing = false; if (el.isConnected && el.dataset.keep !== keyOf()) c.refreshIntro(); }
}
async function climbOnce(el, p) {
  const {from, to, end, before} = p, rk = () => before;
  if (p.first) {
    // A first look: the header names where it ends, the road and the RP count up to it.
    const ok = await tween(el, 0, to, 2200, ease.out, rk);
    el.classList.remove('first');
    if (ok) settle(el);
    return;
  }
  // Seen before: from where the player was to now, each title won or lost on the way turning over.
  await wait(250);
  if (!el.isConnected || ac.signal.aborted) return;
  const up = to >= from;
  if (Math.abs(to - from) >= .005) showGain(el, to - from);
  // Each title turns where it is won or lost: just over its line going up, just under it going down
  // (Candidate Grandmaster's line is 10,000, held only above it).
  const stops = up ? NEXT.filter(v => !wins(v, from) && wins(v, to)) : NEXT.filter(v => wins(v, from) && !wins(v, to)).reverse();
  let a = from, shown = p.startI;
  for (const b of [...stops, to]) {
    const at = b === to ? b : up ? over(b) : under(b), span = Math.abs(standing(at, before).pos - standing(a, before).pos);
    if (at !== a && !(await tween(el, a, at, 1000 + 1400 * Math.min(1, span / 20), ease.inOut, rk))) return;
    a = at;
    if (b === to) break;
    const k = standing(a, before).i;
    if (k !== shown) { rankUp(el, k, k < shown); shown = k; await wait(SPIN.duration - 150); }
  }
  // A title won or lost by the rank alone (Grandmaster) turns at the end.
  if (end.i !== shown) { paint(el, to, false, p.rank); rankUp(el, end.i, end.i < shown); await wait(SPIN.duration - 150); }
  if (el.isConnected) settle(el);
}

/* ── Mounting ── */
// Marked per page instance: a swap to fresh data keeps the same node when nothing changed, and the new page mounts it again.
let played = false, mounted = null;
function mount() {
  const el = R.getElementById('title-sec');
  if (!el || (mounted && mounted.el === el && mounted.key === keyOf())) return;
  mounted = {el, key: keyOf()};
  settle(el);
  const p = played || REDUCED ? null : plan();
  if (!p) { remember(); return; }
  prepare(el, p);
  const go = () => {
    if (played || ac.signal.aborted) return;
    played = true; climb(el, p);
  };
  // Past 10,000 RP the panel first learns what #30 has, so its words and the road are right from the start.
  const ready = RP() > 10000 && !board ? Promise.race([askBoard(), wait(1500)]) : Promise.resolve();
  // The leaderboard redraws the panel once: before the climb when it came within the wait, after that once nothing moves.
  let redrawn = false;
  const redraw = () => { if (redrawn || ac.signal.aborted || !el.isConnected || el.dataset.keep === keyOf()) return false; redrawn = true; c.refreshIntro(); return true; };
  if (RP() > 10000 && !board) askBoard().then(() => { if (!climbing) redraw(); });
  ready.then(() => {
    if (ac.signal.aborted) return;
    if (board && (redrawn || redraw())) return;
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { io.disconnect(); go(); } }, {threshold: .35});
      io.observe(el); ac.signal.addEventListener('abort', () => io.disconnect(), {once: true});
    } else go();
  });
}
// During the climb the choice waits: the panel is redrawn with it once the climb stops (climb's finally).
function select(k) { S.tier = S.tier === k ? null : k; if (!climbing) c.refreshIntro(); }

// While the panel moves, the page is not idle: fresh data waits to be swapped in until it stops.
return {html, mount, select, busy: () => climbing};
};
