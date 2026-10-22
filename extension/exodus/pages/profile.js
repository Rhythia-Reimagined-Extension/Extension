// =============================================
// Reimagined for Rhythia — Exodus profile view
// =============================================
// Ported from the approved v7 mockup. Renders one player into the Exodus shell
// (a shadow root) and returns a handle to tear it down on navigation.

var RhythiaX = RhythiaX || {};

RhythiaX.ExodusApp = function mountExodusProfile(host, D, ctx) {
'use strict';
const R = host.shadowRoot;
const ICONS = RhythiaX.ExodusAssets.titleIcons;
const ac = new AbortController(), sig = {signal: ac.signal};
const U = D.profile;
const SITE = 'https://www.rhythia.com';
const COUNTRY = (() => { try { return new Intl.DisplayNames(['en'], {type: 'region'}).of(U.flag) || U.flag; } catch (e) { return U.flag; } })();
const $ = s => R.querySelector(s);
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt = (n, d = 0) => Number(n || 0).toLocaleString('en-US', {minimumFractionDigits: d, maximumFractionDigits: d});
const sgn = (n, d = 0, u = '') => n > 0 ? `+${fmt(n, d)}${u}` : n < 0 ? `−${fmt(-n, d)}${u}` : '±0' + u;
const tone = n => n > 0 ? 'up' : n < 0 ? 'down' : 'flat';
const ico = id => `<svg class="ico" aria-hidden="true"><use href="#i-${id}"/></svg>`;
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const NOW = new Date(D.fetchedAt).getTime();
const ago = iso => {
  const s = Math.max(0, (NOW - new Date(iso).getTime()) / 1000);
  for (const [sec, n] of [[31536000,'year'],[2592000,'month'],[604800,'week'],[86400,'day'],[3600,'hour'],[60,'minute']])
    if (s >= sec) { const v = Math.floor(s / sec); return `${v} ${n}${v > 1 ? 's' : ''} ago`; }
  return 'just now';
};
const utc = iso => new Date(iso.slice(0, 10) + 'T00:00:00Z');
const isoDay = d => d.toISOString().slice(0, 10);
const dm = iso => utc(iso).toLocaleDateString('en-GB', {day:'numeric', month:'short', timeZone:'UTC'});
const dayName = (iso, o = {weekday:'short', day:'numeric', month:'short'}) => utc(iso).toLocaleDateString('en-GB', {...o, timeZone:'UTC'});
const SPEED = {'1.45':'var(--sp145)','1.35':'var(--sp135)','1.25':'var(--sp125)','1.15':'var(--sp115)','1.00':'var(--sp100)','0.87':'var(--sp087)','0.80':'var(--sp080)','0.75':'var(--sp075)'};
const GRADES = ['SS','S','A','B','C','D'];
const TITLES = [
  {id:'novice', name:'Novice', rp:0, c:'#7ED54F'}, {id:'expert', name:'Expert', rp:1500, c:'#04A0B6'},
  {id:'candidate_master', name:'Candidate Master', short:'Cand. Master', rp:2500, c:'#C26F38'}, {id:'master', name:'Master', rp:5000, c:'#B6463A'},
  {id:'candidate_grandmaster', name:'Candidate Grandmaster', short:'Cand. GM', rp:10000, c:'#A35BC0'}, {id:'grandmaster', name:'Grandmaster', rp:10000, c:'#A3ABB9', top:30},
];
// Rhythia's own badge art. Badges without art are not shown on rhythia.com either.
// Rhythia's badges. Roles read as tags under the name; event badges stay small icons by it.
const SVG = (d, fill = true) => `<svg viewBox="0 0 24 24" aria-hidden="true" style="${fill ? 'fill:currentColor' : 'fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round'}">${d}</svg>`;
const MASK = src => `<i class="mask" style="--m:url('${SITE}${src}')"></i>`;
const ROLE = {
  'Developer': {c: '#3887F5', icon: SVG('<path d="m16 18 6-6-6-6M8 6l-6 6 6 6M14 4l-4 16"/>', false)},
  'Lead Developer': {c: '#3887F5', icon: MASK('/dev.png')},
  'Game Developer': {c: '#3887F5', icon: MASK('/dev.png')},
  'Web Developer': {c: '#3887F5', icon: MASK('/dev.png')},
  'Global Moderator': {c: '#D24242', label: 'Moderator', icon: SVG('<path d="M12 2 4 5v6c0 5.6 3.4 9.5 8 11 4.6-1.5 8-5.4 8-11V5z"/>')},
  'RCT': {c: '#D8970A', label: 'Ranked Curation', tip: 'Ranked Curation Team', icon: SVG('<path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"/>')},
  'MMT': {c: '#8B5CF6', label: 'Map Management', tip: 'Map Management Team', icon: SVG('<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>', false)},
  'Team Ranked': {c: '#D56A3B', icon: SVG('<path d="M7 3h10v5a5 5 0 0 1-10 0zM5 5H2v2a4 4 0 0 0 4 4M19 5h3v2a4 4 0 0 1-4 4M12 13v4M7 21h10M9 17h6"/>', false)},
  'Tester': {c: '#3BBF7D', icon: MASK('/tester.png')},
  'Bug Hunter': {c: '#CFA635', icon: MASK('/bughunter.png')},
  'Content Creator': {c: '#9557CC', icon: SVG('<path d="M3 6h11a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2zm14 4 6-3v10l-6-3z"/>')},
  'Bot': {c: '#E6CF00', tip: 'Bot account managed by Rhythia staff', icon: SVG('<rect x="4" y="8" width="16" height="12" rx="2"/><path d="M12 8V4M9 13v2M15 13v2"/>', false)},
  'Early Bird': {c: '#438BCF', label: 'Early Access', icon: SVG('<path d="M17.5 19H7a5 5 0 1 1 1.2-9.86A6 6 0 0 1 19.5 11a4 4 0 0 1-2 8z"/>')},
  'uwu': {c: '#F472B6', icon: SVG('<path d="M12 5c1.7 0 3.3.4 4.6 1.1L20 3v8c0 5-3.6 9-8 9s-8-4-8-9V3l3.4 3.1C8.7 5.4 10.3 5 12 5z"/>', false)},
};
const EVENT = {
  'The Start of an Era': ['/q.png', 'Badge Hunt 2025: The Start of an Era'], 'New Farm': ['/mario.png', 'Badge Hunt 2025: New Farm'],
  'Spinnin': ['/bug.png', 'Badge Hunt 2025: Spinnin'], 'Old Farm': ['/mario2.png', 'Badge Hunt 2025: Old Farm'],
  'Birb': ['/bird.png', 'Badge Hunt 2025: Bird'], 'Cats!': ['/cat.png', 'Badge Hunt 2025: Cats!'],
  'Badge Hunt 2026: Bronze': ['/hunt-badges/1.%20bronze.png'], 'Badge Hunt 2026: Silver': ['/hunt-badges/2.%20silver.png'],
  'Badge Hunt 2026: Gold': ['/hunt-badges/3.%20gold.png'], 'Badge Hunt 2026: Diamond': ['/hunt-badges/4.%20diamond.png'],
  'Badge Hunt 2026: Platinum': ['/hunt-badges/5.%20platinum.png'], 'Badge Hunt 2026: Difficulty': ['/badge-difficulty.webp'],
  'Badge Hunt 2026: Accuracy': ['/badge-accuracy.webp'], 'Badge Hunt 2026: Time': ['/badge-speed.webp'],
};
// Supporter is Rhythia's "verified" flag; the owner also sees how long it lasts.
function supporterLeft() {
  if (!ctx.owner || !U.verificationDeadline) return '';
  const days = Math.ceil((new Date(U.verificationDeadline) - Date.now()) / 864e5);
  return days <= 0 ? 'Expired' : days >= 365 ? `${Math.round(days / 365)} year${Math.round(days / 365) > 1 ? 's' : ''} left` : days >= 30 ? `${Math.round(days / 30)} month${Math.round(days / 30) > 1 ? 's' : ''} left` : `${days} day${days > 1 ? 's' : ''} left`;
}
const CREATOR_SVG = `<svg viewBox="0 0 512 512" aria-hidden="true"><defs><linearGradient id="cr-g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#c084fc"/><stop offset="1" stop-color="#6b21a8"/></linearGradient></defs><rect x="16" y="16" width="480" height="480" rx="120" fill="url(#cr-g)"/><path fill="#fff" d="M119 74h177c75 0 126 41 126 111 0 48-24 82-67 99l80 118H304l-66-105h-44v105H119V74Zm75 65v95h94c39 0 59-17 59-48 0-31-20-47-59-47h-94Z" transform="translate(40 40) scale(.84)"/></svg>`;

/* ── Data (same rules as the extension) ── */
function prepare(list, weighted) {
  return (list || []).map((s, i) => {
    const notes = s.beatmapNotes || 0, acc = notes ? (notes - s.misses) / notes * 100 : 0;
    const grade = s.misses === 0 && acc >= 100 ? 'SS' : acc >= 98 ? 'S' : acc >= 95 ? 'A' : acc >= 93 ? 'B' : acc >= 90 ? 'C' : 'D';
    const f = Math.pow(0.97, i), m = (D.meta || {})[s.songId] || {};
    return {...s, acc, grade, speedKey: Number(s.speed || 1).toFixed(2), raw: s.awarded_sp || 0,
      weighted: weighted ? Math.round((s.awarded_sp || 0) * f) : null, weight: Math.round(f * 100), pos: i + 1,
      img: m.img || '', thumb: m.thumb || m.img || '', mapper: m.mapper || '', stars: m.stars || 0, fc: s.misses === 0};
  });
}
const MODES = {
  normal: {label:'Lock', icon:'lock.png', top: prepare(D.scores.top, true), recent: prepare(D.scores.lastDay).slice(0, 20), reign: prepare(D.scores.reign), rank: U.position, country: U.country_position, rp: U.skill_points, key: 'position'},
  spin: {label:'Spin', icon:'spincam.png', top: prepare(D.scores.spinTop, true), recent: prepare(D.scores.spinRecent), reign: [], rank: U.spin_position, country: U.spin_country_position, rp: U.spin_skill_points, key: 'spin_position'},
  vr: {label:'VR', icon:'vr.png', top: prepare(D.scores.vrTop, true), recent: prepare(D.scores.vrRecent), reign: [], rank: U.vr_position, country: U.vr_country_position, rp: U.vr_skill_points, key: 'vr_position'},
};
// Pinned scores can be older than every list above, so Rhythia's pin list is kept as well.
const PIN_EXTRA = new Map();
const keepPinned = list => prepare(list).forEach(s => PIN_EXTRA.set(String(s.id), s));
keepPinned(D.pinned);
// Daily community history (Lock). A day stored as 0/null carries the previous value.
const H = D.history.map(d => ({...d}));
for (const k of ['skillPoints','globalRank','countryRank','playCount','squaresHit','avgAccuracy']) {
  H.forEach((d, i) => { if (!d[k] && i) d[k] = H[i - 1][k]; });
  const first = H.find(d => d[k])?.[k];
  if (first) for (const d of H) { if (d[k]) break; d[k] = first; }
}
const DAYS = H.slice(1).map((d, i) => ({date: d.date, plays: d.playCount - H[i].playCount, rp: d.skillPoints - H[i].skillPoints,
  rank: H[i].globalRank - d.globalRank, accD: d.avgAccuracy - H[i].avgAccuracy, sq: d.squaresHit - H[i].squaresHit, t: d}));
const lastActive = [...DAYS].reverse().find(d => d.plays > 0);
// Maps per week, the extension's formula: lifetime plays over weeks since joining.
const weeksSince = (NOW - new Date(U.created_at).getTime()) / 6048e5;
const MPW = weeksSince > 0 ? U.play_count / weeksSince : 0;
const last7 = DAYS.slice(-7).reduce((a, d) => a + d.plays, 0);

// Popup switches shared with the 1.2.x look (shared/settings/schema.js), read once per mount.
const PREFS = RhythiaX.ExodusPrefs || {}, ON = k => PREFS.modules?.[k] !== false;
const STAT_TABS = [['progress','Progress'],['rankings','Rankings'],['playstyle','Playstyle']].filter(([k]) => k === 'playstyle' ? ON('advancedStats') : ON('statHistory'));
const S = {section:'profile', mode:'normal', stat: STAT_TABS[0]?.[0] || 'progress', range:30, metric:'skillPoints', rankMetric:'globalRank',
  act:'plays', gran:'day', selDate: lastActive?.date || H.at(-1).date, cur: (lastActive?.date || H.at(-1).date).slice(0, 7), allScores:false, mod:'', tier:null, viewer: ctx.owner ? 'owner' : 'visitor', pins: (D.pinned || []).map(s => String(s.id)), friend: U.friend_state || 'none', busy: false, items: D.showcase?.items || [], itemsRev: D.showcase?.revision || 0, pinAt:0, editing:false, bio:null, list:'top', q:'', grade:'', speed:'', page:1, view: PREFS.exodus?.scoresView === 'grid' ? 'grid' : 'list'};
// A quiet refresh (fresh data replacing a saved snapshot) keeps where the viewer was.
const VIEW_KEYS = ['section', 'mode', 'stat', 'range', 'metric', 'rankMetric', 'act', 'gran', 'list', 'view', 'rev'];
for (const k of VIEW_KEYS) if (ctx.state?.[k] !== undefined) S[k] = ctx.state[k];
if (S.list === 'pinned' && !S.pins.length) S.list = 'top';
// /player/:id/scores is the same view on its own section, so the URL decides it.
if (ctx.page === 'scores') S.section = 'scores'; else if (S.section === 'scores') S.section = 'profile';
const rangeDays = () => S.range === 0 ? H.length - 1 : Math.min(S.range, H.length - 1);
const win = () => H.slice(-rangeDays() - 1);

function toast(m) { const t = $('#toast'); t.textContent = m; t.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('on'), 2600); }

/* ── Tooltip ── */
const tipEl = $('#tip');
function showTip(t) {
  RhythiaX.ExodusKit.fillTip(tipEl, t.dataset.tip); tipEl.classList.add('on');
  const r = t.getBoundingClientRect(), w = tipEl.offsetWidth, h = tipEl.offsetHeight;
  let x = Math.min(innerWidth - w - 8, Math.max(8, r.left + r.width / 2 - w / 2)), y = r.top - h - 8;
  if (y < 64) y = r.bottom + 8;
  tipEl.style.left = x + 'px'; tipEl.style.top = y + 'px';
}
const hideTip = () => tipEl.classList.remove('on');
R.addEventListener('pointerover', e => { const t = e.target.closest?.('[data-tip]'); t ? showTip(t) : hideTip(); }, sig);
R.addEventListener('focusin', e => { const t = e.target.closest?.('[data-tip]'); t ? showTip(t) : hideTip(); }, sig);
addEventListener('scroll', hideTip, {passive: true, signal: ac.signal});

/* ── Tabs underline slides between tabs ── */
const inkAt = {};
let hmSettled = false;
// One pass per frame for every tab row: all positions are read first, then written, so a redraw
// costs one layout instead of two for each row it touches.
let inkFrame = 0;
function inks() { if (!inkFrame) inkFrame = requestAnimationFrame(placeInks); }
function placeInks() {
  inkFrame = 0;
  const rows = [...R.querySelectorAll('.tabs[data-ink]')].map(t => {
    const sel = t.querySelector('[aria-selected="true"]');
    return sel && {t, ink: t.querySelector('.ink'), x: sel.offsetLeft, w: sel.offsetWidth};
  }).filter(Boolean);
  const ends = endWanted ? [...R.querySelectorAll('.tmap-scroll')].map(el => [el, el.scrollWidth]) : [];
  endWanted = false;
  for (const [el, end] of ends) el.scrollLeft = end;
  for (const {t, ink: had, x, w} of rows) {
    const key = t.dataset.ink, p = inkAt[key], ink = had || t.appendChild(Object.assign(document.createElement('i'), {className: 'ink'}));
    inkAt[key] = {x, w};
    const to = () => { ink.style.transform = `translateX(${x}px)`; ink.style.width = w + 'px'; };
    // A new underline starts where the old one was and slides over on the next frame.
    if (!had && p && !REDUCED && (p.x !== x || p.w !== w)) {
      ink.style.transition = 'none'; ink.style.transform = `translateX(${p.x}px)`; ink.style.width = p.w + 'px';
      requestAnimationFrame(() => { ink.style.transition = ''; to(); });
    } else if (!had || p?.x !== x || p?.w !== w) to();
  }
}

/* ── Reveal on scroll (once) and count-up for first paint ── */
const io = 'IntersectionObserver' in window ? new IntersectionObserver(es => es.forEach(e => {
  if (!e.isIntersecting) return;
  e.target.classList.add('in'); io.unobserve(e.target);
  e.target.querySelectorAll('[data-count]').forEach(countUp);
  setTimeout(() => { hmSettled = true; e.target.querySelectorAll('.hm').forEach(h => h.classList.add('settled')); }, 1600);
}), {rootMargin: '0px 0px -10% 0px'}) : null;
function watch(root) { root.querySelectorAll('.reveal:not(.in)').forEach(el => io && !ctx.quiet ? io.observe(el) : el.classList.add('in')); }
function countUp(el) {
  const to = Number(el.dataset.count), d = Number(el.dataset.d || 0), pre = el.dataset.pre || '', suf = el.dataset.suf || '';
  delete el.dataset.count;
  if (REDUCED || !to) return;
  const t0 = performance.now(), dur = 1100;
  const step = t => { const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 4); el.textContent = pre + fmt(to * e, d) + suf; if (k < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}
const counter = (v, d = 0, pre = '', suf = '') => `<span data-count="${v}" data-d="${d}" data-pre="${pre}" data-suf="${suf}">${pre}${fmt(v, d)}${suf}</span>`;

/* ── Chart (labels in HTML so they never stretch) ── */
function chart(points, {invert = false, f = v => fmt(v), label = '', anim = ''} = {}) {
  if (points.length < 2) return `<div class="empty"><b>Not enough history yet</b>A few more days of play will draw this chart.</div>`;
  const W = 1000, Hh = 230, T = 12, B = 12;
  const vals = points.map(p => p.v), lo = Math.min(...vals), hi = Math.max(...vals), pad = (hi - lo) * .15 || Math.max(1, Math.abs(hi) * .001), a = lo - pad, b = hi + pad;
  const x = i => i * W / (points.length - 1);
  const y = v => invert ? T + (v - a) / (b - a) * (Hh - T - B) : Hh - B - (v - a) / (b - a) * (Hh - T - B);
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.v).toFixed(1)}`).join('');
  const ticks = [lo, (lo + hi) / 2, hi];
  const id = 'g' + Math.random().toString(36).slice(2, 7);
  return `<div class="chart-wrap">${ticks.map(t => `<span class="yl num" style="top:${(y(t) / Hh * 100).toFixed(2)}%">${f(t)}</span>`).join('')}
    <svg class="chart draw ${anim}" viewBox="0 0 ${W} ${Hh}" preserveAspectRatio="none" role="img" aria-label="${esc(label)}">
      <defs><linearGradient id="${id}" x1="0" x2="0" y1="0" y2="1"><stop offset="0" style="stop-color:var(--accent);stop-opacity:.25"/><stop offset="1" style="stop-color:var(--accent);stop-opacity:0"/></linearGradient></defs>
      ${ticks.map(t => `<line class="gl" x1="0" x2="${W}" y1="${y(t)}" y2="${y(t)}"/>`).join('')}
      <path d="${d}L${W},${Hh}L0,${Hh}Z" fill="url(#${id})"/><path class="ln" d="${d}"/>
    </svg></div>
    <div class="xl num"><span>${dm(points[0].d)}</span><span>${dm(points.at(-1).d)} · <b>${f(points.at(-1).v)}</b></span></div>`;
}
const rangePills = () => `<div class="pills" aria-label="Period">${[[7,'7 days'],[30,'30 days'],[0,'All']].map(([k, l]) => `<button type="button" aria-pressed="${S.range === k}" data-range="${k}">${l}</button>`).join('')}</div>`;

/* ── Title ── */
function titleState() {
  const m = MODES.normal, rp = m.rp || 0, rank = m.rank;
  let i = 0; TITLES.slice(0, 5).forEach((t, k) => { if (rp >= t.rp) i = k; });
  if (rp >= 10000 && rank && rank <= 30) i = 5;
  const next = TITLES[i + 1];
  const goal = !next ? 'Highest title reached' : next.top ? `${fmt(rank - 30)} places to the top 30` : `${fmt(next.rp - rp, 0)} RP to go`;
  const prog = !next ? 1 : next.top ? Math.min(1, 30 / rank) : (rp - TITLES[i].rp) / (next.rp - TITLES[i].rp);
  return {i, cur: TITLES[i], next, goal, prog, rp, rank};
}
// A climbing road: each title sits a little higher than the last, so the line only rises.
// Names stay under the emblems. Clicking a title drops its pin with what it takes;
// the "you" marker is kept clear of the emblems and steps back while a pin is open.
function titleMap() {
  const t = titleState(), W = 640, Hh = 256, R = 19;
  const xs = TITLES.map((_, k) => 50 + k * (W - 100) / 5), ys = [210, 186, 172, 142, 128, 92];
  const seg = k => { const mx = (xs[k] + xs[k + 1]) / 2; return [[xs[k], ys[k]], [mx, ys[k]], [mx, ys[k + 1]], [xs[k + 1], ys[k + 1]]]; };
  const lerp = (a, b, u) => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u];
  const split = (P, u) => { const a = lerp(P[0], P[1], u), b = lerp(P[1], P[2], u), c = lerp(P[2], P[3], u), d = lerp(a, b, u), e = lerp(b, c, u); return [P[0], a, d, lerp(d, e, u)]; };
  const dOf = P => `M${P[0]} C${P[1]} ${P[2]} ${P[3]}`;
  const full = `M${xs[0]},${ys[0]}` + TITLES.slice(1).map((_, k) => { const P = seg(k); return ` C${P[1]} ${P[2]} ${P[3]}`; }).join('');
  // Progress maps onto the part of the segment between the two emblem rings.
  const gap = (R + 12) / (xs[1] - xs[0]), u = t.next ? gap + (1 - 2 * gap) * t.prog : 0;
  const part = t.next ? split(seg(t.i), u) : null, pt = part ? part[3] : [xs[t.i], ys[t.i]];
  let road = `<path d="${full}" fill="none" stroke="url(#tm-ahead)" stroke-width="4" stroke-linecap="round" stroke-dasharray="1 8"/>`;
  for (let k = 0; k < t.i; k++) road += `<path d="${dOf(seg(k))}" fill="none" stroke="url(#tm-s${k})" stroke-width="5" stroke-linecap="round"/>`;
  if (part) road += `<path class="prog" d="${dOf(part)}" fill="none" stroke="${t.cur.c}" stroke-width="5" stroke-linecap="round" pathLength="1" stroke-dasharray="1 1" style="--p:1"/>`;
  const grads = TITLES.slice(0, 5).map((tier, k) => `<linearGradient id="tm-s${k}" gradientUnits="userSpaceOnUse" x1="${xs[k]}" x2="${xs[k + 1]}"><stop offset="0" stop-color="${tier.c}"/><stop offset="1" stop-color="${TITLES[k + 1].c}"/></linearGradient>`).join('');
  const shade = c => c === '#A3ABB9' ? 'var(--text)' : c;
  const nodes = TITLES.map((tier, k) => {
    const reached = k <= t.i, now = k === t.i, open = S.tier === k, cx = xs[k], cy = ys[k];
    return `<g class="node ${open ? 'open' : ''}" data-tier="${k}" role="button" tabindex="0" aria-pressed="${open}" aria-label="${tier.name}">
      <circle cx="${cx}" cy="${cy}" r="${R + 14}" fill="transparent"/>
      ${now ? `<circle cx="${cx}" cy="${cy}" r="${R + 10}" fill="${tier.c}" fill-opacity=".14"/>` : ''}
      <circle class="ring" cx="${cx}" cy="${cy}" r="${R + 5}" style="fill:var(--ring-bg);stroke:${reached || open ? tier.c : 'rgba(var(--ink),.16)'}" stroke-width="${now || open ? 2.5 : 1.5}"/>
      <image href="${ICONS[tier.id] || ''}" x="${cx - R}" y="${cy - R}" width="${R * 2}" height="${R * 2}" ${reached ? '' : 'style="filter:grayscale(1);opacity:.5"'}/>
      <text x="${cx}" y="${cy + R + 24}" text-anchor="middle" style="fill:${now ? shade(tier.c) : reached ? 'var(--text-2)' : 'var(--muted)'}">${tier.short || tier.name}</text></g>`;
  }).join('');
  // Pin for the clicked title.
  let callout = '';
  if (S.tier !== null && S.tier !== undefined) {
    const k = S.tier, tier = TITLES[k], cx = xs[k], cy = ys[k], reached = k <= t.i;
    const need = tier.top ? (reached ? 'Top 30 · reached' : `Top 30 global · ${fmt(t.rank - 30)} places to go`)
      : !tier.rp ? 'Starting title' : reached ? `${fmt(tier.rp)} RP · reached` : `${fmt(tier.rp)} RP · ${fmt(tier.rp - t.rp, 0)} to go`;
    const bw = Math.round(Math.max(tier.name.length * 8, need.length * 6.6) + 28), bh = 46;
    const bx = Math.min(W - bw - 2, Math.max(2, cx - bw / 2)), by = cy - R - 22 - bh;
    callout = `<g class="callout"><line x1="${cx}" y1="${cy - R - 6}" x2="${cx}" y2="${by + bh}" stroke="${tier.c}" stroke-width="1.5"/>
      <rect x="${bx}" y="${by}" width="${bw}" height="${bh}" rx="10" style="fill:var(--panel-3)" stroke="${tier.c}" stroke-opacity=".7"/>
      <text x="${bx + 14}" y="${by + 19}" style="fill:${shade(tier.c)};font-weight:700">${tier.name}</text>
      <text class="sub" x="${bx + 14}" y="${by + 35}">${need}</text></g>`;
  }
  let you = '';
  if (t.next) {
    const [px, py] = pt, pw = 64, rx = Math.min(W - pw - 2, Math.max(2, px - pw / 2)), ty = py - 30;
    you = `<g class="pin ${callout ? 'dim' : ''}"><line class="stem" x1="${px}" y1="${py - 6}" x2="${px}" y2="${ty}" stroke="${t.cur.c}" stroke-width="1.5"/>
      <g class="tag"><rect x="${rx}" y="${ty - 24}" width="${pw}" height="24" rx="8" fill="${t.cur.c}"/><text x="${rx + pw / 2}" y="${ty - 7.5}" text-anchor="middle" style="fill:#fff;font-weight:750">#${fmt(t.rank)}</text></g>
      <circle class="head" cx="${px}" cy="${py}" r="6.5" fill="#fff" stroke="${t.cur.c}" stroke-width="3"/></g>`;
  }
  return `<svg class="tmap" viewBox="0 0 ${W} ${Hh}" role="group" aria-label="Title progression: ${esc(t.cur.name)}. ${esc(t.goal)}.">
    <defs>${grads}<linearGradient id="tm-ahead" gradientUnits="userSpaceOnUse" x1="${pt[0]}" x2="${W}"><stop offset="0" style="stop-color:rgb(var(--ink));stop-opacity:.32"/><stop offset="1" style="stop-color:rgb(var(--ink));stop-opacity:.05"/></linearGradient></defs>
    ${road}${nodes}${you}${callout}</svg>`;
}

/* ── Hero ── */
// Rhythia reports friend_state per viewer: "none" until added, then "added".
function friendButton() {
  if (S.friend === 'none') return `<button class="btn primary mini" type="button" data-friend ${S.busy ? 'disabled' : ''}>${ico('user')}Add friend</button>`;
  const label = S.friend === 'added' ? 'Friend added' : S.friend[0].toUpperCase() + S.friend.slice(1);
  return `<button class="btn mini" type="button" disabled>${ico('user')}${esc(label)}</button>`;
}
// Every badge in one row, all the same height: Supporter, Rhythia's roles (icon and name)
// and event badges (their art only, named in the tooltip).
function badgeRow() {
  const out = [];
  if (U.verified) {
    const left = supporterLeft();
    out.push(`<a class="rtag sup" href="/support" style="--c:#f472b6" data-tip="<b>Rhythia Supporter</b><small>${left ? esc(left) + ' · ' : ''}Supports Rhythia’s development</small>"><img src="${SITE}/supporterheart.png" alt="">Supporter</a>`);
  }
  for (const b of U.badges || []) {
    const r = ROLE[b]; if (!r) continue;
    out.push(`<span class="rtag" tabindex="0" style="--c:${r.c}" data-tip="<b>${esc(r.tip || r.label || b)}</b><small>Rhythia role</small>">${r.icon}${esc(r.label || b)}</span>`);
  }
  if (U.id === 255585) out.push(`<span class="rtag ev" tabindex="0" data-tip="<b>Creator of Reimagined</b><small>Made the Reimagined for Rhythia extension</small>">${CREATOR_SVG}</span>`);
  for (const b of (U.badges || []).filter(b => EVENT[b])) out.push(`<span class="rtag ev" tabindex="0" data-tip="<b>${esc(EVENT[b][1] || b)}</b><small>Event badge</small>"><img src="${SITE}${EVENT[b][0]}" alt="${esc(b)}"></span>`);
  return out.length ? `<div class="rtags">${out.join('')}</div>` : '';
}
// Hearts and squares from Rhythia's supporter card, drifting up a supporter's banner.
const SUP_FLOAT = Array.from({length: 10}, (_, i) => `<i class="pf ${i % 3 ? 'h' : 'q'}" style="--x:${(i * 41 + 7) % 100}%;--d:${11 + (i * 7) % 8}s;--w:${-((i * 13) % 17)}s;--s:${.55 + ((i * 5) % 6) / 10}"></i>`).join('');
function hero() {
  const m = MODES[S.mode], lock = S.mode === 'normal';
  const ch = (k, n = 7) => H.length > n ? H.at(-1 - n)[k] - H.at(-1)[k] : 0;
  const r7 = ch('globalRank'), c7 = ch('countryRank'), rp7 = -ch('skillPoints');
  const d = (n, f = 0) => lock && n && ON('statHistory') ? `<span class="d ${tone(n)}" data-tip="Change in the last 7 days">${n > 0 ? '▲' : '▼'} ${fmt(Math.abs(n), f)}</span>` : '';
  const prev = (U.previous_usernames || []).map(p => `${esc(p.username)} <small>until ${new Date(p.changed_at).toLocaleDateString('en-GB', {month:'short', year:'numeric'})}</small>`).join('');
  const pt = U.playTime || 0, h = Math.floor(pt / 3600), mi = Math.floor(pt % 3600 / 60);
  const clanId = U.clans?.id ?? U.clan;
  const joined = new Date(U.created_at);
  return `<section class="hero ${U.verified ? 'is-sup' : ''}" aria-label="Player">
    ${U.profile_image ? `<div class="banner" style="background-image:linear-gradient(180deg,rgba(var(--page-rgb),0) 30%,rgba(var(--page-rgb),.78)),url('${esc(U.profile_image)}')"></div>`
      : `<div class="banner wash"><i style="background-image:url('${esc(U.avatar_url)}')"></i></div>`}
    ${U.verified && !REDUCED ? `<div class="pfs" aria-hidden="true">${SUP_FLOAT}</div>` : ''}
    <div class="container">
      <div class="hero-main">
        <div class="avatar ${U.verified ? 'sup' : ''}" style="background-image:url('${esc(U.avatar_url)}')${U.verified ? ',linear-gradient(135deg,#fbcfe8,#e879f9 30%,#f472b6 55%,#c084fc 80%,#fbcfe8)' : ''}" role="img" aria-label="${esc(U.username)}">${U.is_online ? '<span class="dot" data-tip="Online now"></span>' : ''}${U.verified ? `<a class="sup-heart" href="/support" data-tip="<b>Rhythia Supporter</b><small>Supports Rhythia’s development</small>"><img src="${SITE}/supporterheart.png" alt="Rhythia Supporter"></a>` : ''}</div>
        <div class="who" style="min-width:0">
          <div class="name-row"><h1 class="name">${esc(U.username)}${prev ? `<button class="prev-btn" type="button" aria-label="Previous usernames" data-tip="<b>Previous names</b><small>${esc(prev).replace(/&lt;(\/?)small&gt;/g, '<$1small>')}</small>">${ico('hist')}</button>` : ''}</h1>${S.viewer === 'owner' ? '' : friendButton()}</div>
          ${badgeRow()}
          <div class="meta">
            ${U.flag ? `<span><img class="flag" src="${SITE}/flags/${esc(U.flag)}.svg" alt="">${esc(COUNTRY)}</span>` : ''}
            ${U.clans?.name ? `<a class="clan" href="/clans/${esc(clanId)}">${U.clans.avatar_url ? `<img src="${esc(U.clans.avatar_url)}" alt="">` : ''}${esc(U.clans.name)}</a>` : ''}
            ${S.viewer === 'owner' && ON('friendsList') ? `<button class="friends-btn" type="button" data-friends data-tip="<b>Your friends</b><small>Who they are and who is playing now</small>">${ico('user')}${fmt(U.friend_count)} friends</button>` : `<span tabindex="0" data-tip="<b>${fmt(U.friend_count)} friends</b><small>Rhythia shows a friends list only to its owner</small>">${ico('user')}${fmt(U.friend_count)} friends</span>`}
            ${U.is_online ? '<span class="on">Online</span>' : U.last_active_timestamp ? `<span>Last seen ${ago(new Date(U.last_active_timestamp).toISOString())}</span>` : ''}
          </div>
        </div>
        <div class="ranks-wrap">
          <div class="ranks-head">
            <div class="pills mini" aria-label="Game mode">${Object.entries(MODES).map(([k, v]) => `<button type="button" aria-pressed="${S.mode === k}" data-mode="${k}"><img src="${SITE}/${v.icon}" alt="">${v.label}</button>`).join('')}</div>
            ${ON('playerCompare') ? `<button class="btn mini" type="button" data-compare data-tip="<b>Compare</b><small>Put ${esc(U.username)} side by side with another player</small>">${ico('cmp')}Compare</button>` : ''}
          </div>
          <div class="ranks">
            <div><span class="cap">Global</span><strong class="num">${m.rank ? counter(m.rank, 0, '#') : '—'}${d(r7)}</strong></div>
            <div><span class="cap">${esc(COUNTRY)}</span><strong class="num">${m.country ? counter(m.country, 0, '#') : '—'}${d(c7)}</strong></div>
            <div class="rp"><span class="cap">Rhythm points</span><strong class="num">${counter(m.rp, 2)}${d(rp7, 1)}</strong></div>
          </div>
        </div>
      </div>
      <div class="strip panel">
        <div><small>Playtime</small><b class="num">${h}h ${mi}m</b></div>
        <div><small>Play count</small><b class="num">${counter(U.play_count)}</b></div>
        <div><small>Squares hit</small><b class="num">${counter(U.squares_hit)}</b></div>
        <div data-tip="Lifetime plays divided by weeks since joining<small>${fmt(last7)} plays in the last 7 days</small>"><small>Maps / week</small><b class="num">${fmt(MPW, 1)}</b></div>
        <div><small>Achievements</small><b class="num">${(U.achievements || []).length}<span class="cap"> / ${D.achievements.length}</span></b></div>
        <div data-tip="<b>${esc(joined.toLocaleDateString('en-GB', {day: 'numeric', month: 'long', year: 'numeric'}))}</b><small>${esc(ago(joined.toISOString()))}</small>"><small>Member since</small><b>${esc(joined.toLocaleDateString('en-GB', {month: 'short', year: 'numeric'}))}</b></div>
      </div>
      <div class="hero-bar">
        <div class="tabs" role="tablist" aria-label="Profile sections" data-ink="sections">${[['profile','Profile'],['scores','Scores'],['maps','Maps'],['skins','Skins'],['inventory','Inventory'],['achievements','Achievements']].map(([k, l]) =>
          `<button role="tab" type="button" aria-selected="${S.section === k}" data-section="${k}">${l}</button>`).join('')}</div>
      </div>
    </div>
  </section>`;
}

/* ── Intro ── */
function socialIcon(u) {
  const host = u.replace(/^https?:\/\/(www\.)?/, '').split('/')[0];
  const id = /github/.test(host) ? 'gh' : /youtu/.test(host) ? 'yt' : /twitch/.test(host) ? 'tw' : 'link';
  const name = {gh: 'GitHub', yt: 'YouTube', tw: 'Twitch', link: host}[id];
  return `<a class="social" href="${esc(u)}" target="_blank" rel="noopener" aria-label="${esc(name)}" data-tip="<b>${esc(name)}</b><small>${esc(u.replace(/^https?:\/\/(www\.)?/, ''))}</small>">${ico(id)}</a>`;
}
// Inline profile editor. Rhythia keeps the bio (10,000 characters) and two social links;
// pinned scores are managed here too, as a draft until Save.
const SOCIAL_HELP = 'Discord, Telegram, YouTube, Twitch, X, GitHub, Instagram, TikTok, Facebook or Steam. Links may lead to profiles or communities.';
function edPins() {
  const all = SCORES_ALL(), list = S.draft.pins.map(id => all.find(s => String(s.id) === String(id))).filter(Boolean);
  if (!list.length) return '<li class="ed-none cap">No pinned scores.</li>';
  return list.map((s, i) => `<li><i style="background-image:url('${esc(s.thumb)}')"></i><span title="${esc(s.beatmapTitle)}">${esc(s.beatmapTitle)}<small class="num">${fmt(s.raw)} RP · ${fmt(s.acc, 2)}% · ${s.speedKey}×</small></span>
    <button class="iconbtn" type="button" data-pin-drop="${i}" aria-label="Unpin" data-tip="<b>Unpin</b><small>Applied when you save</small>">${ico('x')}</button></li>`).join('');
}
function editor() {
  const d = S.draft;
  return `<div class="editor">
    <div class="ed-l"><label for="bio-input">About me</label><small class="num" id="bio-count">${fmt(d.bio.length)} / 10,000</small></div>
    <textarea id="bio-input" rows="5" maxlength="10000">${esc(d.bio)}</textarea>
    <div class="ed-l"><span>Social links</span></div>
    <div class="ed-links">${[0, 1].map(i => `<input class="field" id="link-${i}" type="url" inputmode="url" placeholder="https://github.com" aria-label="Social link ${i + 1}" value="${esc(d.links[i] || '')}">`).join('')}</div>
    <p class="cap ed-help">${SOCIAL_HELP}</p>
    <div class="ed-l"><span>Pinned scores</span><small class="num" id="ed-pin-n">${d.pins.length} pinned</small></div>
    <ul class="ed-pins" id="ed-pins">${edPins()}</ul>
    <div class="ed-actions"><button class="btn" type="button" data-bio="cancel">Cancel</button><button class="btn primary" type="button" data-bio="save">Save</button></div></div>`;
}
function refreshEdPins() { $('#ed-pins').innerHTML = edPins(); $('#ed-pin-n').textContent = `${S.draft.pins.length} pinned`; }
// Pinned scores lead the About panel (one at a time, arrows to step); with no pins the top play stands in.
function pinnedScores() { const all = SCORES_ALL(); return S.pins.map(id => all.find(s => String(s.id) === String(id))).filter(Boolean); }
function showcase() {
  const pins = pinnedScores(), top1 = MODES.normal.top[0];
  const s = pins.length ? pins[Math.min(S.pinAt, pins.length - 1)] : top1;
  if (!s) return '';
  const label = pins.length ? `Pinned · ${Math.min(S.pinAt, pins.length - 1) + 1} of ${pins.length}` : 'Top play';
  return `<div class="showcase" style="background-image:url('${esc(s.img || s.thumb)}')"><span class="bg"></span>
      ${pins.length ? `<div class="sc-nav">${pins.length > 1 ? `<button class="iconbtn" type="button" data-pin-step="-1" aria-label="Previous pinned score">‹</button><button class="iconbtn" type="button" data-pin-step="1" aria-label="Next pinned score">›</button>` : ''}${S.viewer === 'owner' ? `<button class="iconbtn" type="button" data-pin="${esc(String(s.id))}" aria-label="Unpin this score" data-tip="<b>Unpin</b><small>Takes it off your profile</small>">${ico('unpin')}</button>` : ''}</div>` : ''}
      <a class="plate" href="/score/${encodeURIComponent(s.id)}"><small>${label}</small><strong>${esc(s.beatmapTitle)}</strong><em class="num"><b>${fmt(s.raw)} RP</b> · ${fmt(s.acc, 2)}% · ${s.speedKey}× · <span style="color:var(--g-${s.grade})">${s.grade}</span></em></a></div>`;
}
// Rhythia renders about_me as Markdown. The usual parts are kept: headings, lists, quotes,
// images, links, bold, italic and code. Everything is escaped first; only http(s)/mailto links.
// Social links are trailing comments: <!--rhythia-social:URL--> and <!--rhythia-social-2:URL-->.
// Only web links are shown: about_me can be written straight through the API, so javascript: or data: may be in it.
const webLink = u => { try { const x = new URL(String(u).trim()); return /^https?:$/.test(x.protocol) ? x.href : ''; } catch (_) { return ''; } };
const socialLinks = raw => [...String(raw || '').matchAll(/<!--rhythia-social(?:-\d+)?:(.*?)-->/g)].map(m => { try { return decodeURIComponent(m[1]); } catch (_) { return m[1]; } }).map(webLink).filter(Boolean);
const bioText = raw => String(raw || '').replace(/<!--[\s\S]*?-->/g, '').split('\n').map(l => l.replace(/\s+$/, '')).join('\n').replace(/\n{3,}/g, '\n\n').trim();
function md(src) {
  const url = u => /^(https?:\/\/|mailto:)[^\s"'<>]+$/i.test(u) ? u : '';
  const inline = line => esc(line)
    .replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (m, alt, u) => /^https?:/i.test(u) && url(u) ? `<img class="md-img" src="${u}" alt="${alt}" loading="lazy">` : m)
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, t, u) => url(u) ? `<a href="${u}" target="_blank" rel="noopener noreferrer">${t}</a>` : m)
    .replace(/(^|[\s(])(https?:\/\/[^\s<]+)/g, (m, pre, u) => `${pre}<a href="${u}" target="_blank" rel="noopener noreferrer">${u}</a>`)
    .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/__([^_]+)__/g, '<b>$1</b>')
    .replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<i>$2</i>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');
  return String(src || '').split('\n').map(raw => {
    const line = raw.replace(/&nbsp;/gi, ' ');
    if (!line.trim()) return '<span class="md-l md-gap"></span>';
    const h = line.match(/^\s*(#{1,6})\s+(.*)$/);
    if (h) return `<span class="md-l md-h${Math.min(h[1].length, 3)}">${inline(h[2])}</span>`;
    const li = line.match(/^(\s*)[-*+]\s+(.*)$/);
    if (li) return `<span class="md-l md-li" style="--ind:${Math.min(3, Math.floor(li[1].length / 2))}">${inline(li[2])}</span>`;
    const q = line.match(/^\s*&gt;\s?(.*)$/) || line.match(/^\s*>\s?(.*)$/);
    if (q) return `<span class="md-l md-q">${inline(q[1])}</span>`;
    return `<span class="md-l">${inline(line)}</span>`;
  }).join('');
}
const SHOWCASE_MAX = 5;
const itemPath = it => `${{beatmap: '/maps/', skin: '/skins/share/', collection: '/collections/'}[it.kind] || '/'}${encodeURIComponent(it.id)}`;
const SKIN_TYPES = {rhs: 'RHS skin', cursor: 'Cursor', note: 'Note', border: 'Border', colorset: 'Colorset'};
const itemKind = it => it.kind === 'beatmap' ? 'Beatmap' : it.kind === 'collection' ? 'Collection' : SKIN_TYPES[it.skinType || 'rhs'] || 'Skin';
function itemPreview(it) {
  if (it.kind === 'skin' && it.skinType === 'colorset' && it.colors?.length) {
    const n = Math.ceil(Math.sqrt(it.colors.length)), m = Math.ceil(it.colors.length / n);
    return `<span class="pv cs"><span style="grid-template-columns:repeat(${n},1fr);aspect-ratio:${n}/${m}">${it.colors.map(c => `<i style="background:${/^#[0-9a-f]{6}$/i.test(c) ? c : '#000'}"></i>`).join('')}</span></span>`;
  }
  const img = it.previewUrl || it.collectionImages?.find(Boolean);
  return img ? `<span class="pv" style="background-image:url('${esc(img)}')"></span>` : `<span class="pv none">${ico(it.kind === 'collection' ? 'list' : 'grid')}</span>`;
}
function showcaseItems() {
  const items = S.items || [], owner = S.viewer === 'owner';
  if (!items.length && !owner) return '';
  return `<div class="items"><div class="items-head"><span>Showcase</span>${owner ? `<small class="num">${items.length} / ${SHOWCASE_MAX}</small>` : ''}</div>
    <div class="items-row">${items.map((it, i) => `<div class="item"><a href="${itemPath(it)}" data-tip="<b>${esc(it.title)}</b><small>${esc(itemKind(it))}${it.creator ? ' · by ' + esc(it.creator) : ''}</small>">${itemPreview(it)}<span class="it">${esc(it.title)}</span><small>${esc(itemKind(it))}</small></a>
      ${owner ? `<button class="iconbtn item-x" type="button" data-item-drop="${i}" aria-label="Remove from showcase">${ico('x')}</button>` : ''}</div>`).join('')}
    ${owner && items.length < SHOWCASE_MAX ? (U.verified
      ? `<button class="item add" type="button" data-item-add><span class="pv none">+</span><span class="it">Add item</span><small>Map, skin or collection</small></button>`
      : `<a class="item add locked" href="/support" data-tip="<b>Supporter perk</b><small>Rhythia Supporters can show up to five maps, skins or collections here</small>"><span class="pv none"><img src="${SITE}/supporterheart.png" alt=""></span><span class="it">Showcase</span><small>Supporter perk</small></a>`) : ''}</div></div>`;
}
async function saveShowcase(next, done) {
  if (S.busy) return;
  S.busy = true;
  try {
    const res = await ctx.actions.setShowcase(S.itemsRev, next);
    if (res?.status === 'supporter_required') { toast('The showcase is a Rhythia Supporter perk.'); return; }
    if (res?.status && res.status !== 'ok') throw new Error(res.status.replace(/_/g, ' '));
    S.items = Array.isArray(res?.items) ? res.items : next;
    S.itemsRev = res?.revision ?? S.itemsRev + 1;
    done?.();
  } catch (err) {
    toast(/HTTP 403/.test(err.message) ? 'The showcase is a Rhythia Supporter perk.' : `Could not update the showcase: ${err.message}`);
  } finally {
    S.busy = false;
  }
  if (!S.editing) refreshIntro();
}
/* Friends: the signed-in player's own list, online first. Rhythia shares it only with its owner. */
let friendsSeq = 0;
async function openFriends() {
  const dlg = $('#pick'), seq = ++friendsSeq;
  dlg.innerHTML = `<div class="cmp-head"><h2>Friends<span class="num">${fmt(U.friend_count)}</span></h2><button class="iconbtn" type="button" data-pick-close aria-label="Close">${ico('x')}</button></div>
    <div class="cmp-body"><div class="fr-list" id="fr-list">${'<div class="fr-row is-load"><i class="av skeleton"></i><span class="skeleton" style="width:40%"></span></div>'.repeat(Math.min(6, U.friend_count || 3))}</div></div>`;
  dlg.classList.add('fr-dlg');
  dlg.addEventListener('close', () => dlg.classList.remove('fr-dlg'), {once: true});
  if (!dlg.open) dlg.showModal();
  const X = RhythiaX.ExodusData, s = X.session();
  try {
    if (!s) throw new Error('Sign in to Rhythia to see your friends.');
    const [fr, on] = await Promise.all([X.post('getFriends', {session: s}), X.post('getOnlinePlayers', {}).catch(() => ({players: []}))]);
    if (seq !== friendsSeq || !dlg.open) return;
    const online = new Set((on.players || []).map(p => String(p.id)));
    const list = (fr.friends || []).map(f => ({...f, on: online.has(String(f.id))})).sort((a, b) => b.on - a.on || String(a.username).localeCompare(String(b.username)));
    const n = list.filter(f => f.on).length;
    $('#fr-list').innerHTML = list.length
      ? `<p class="fr-sum">${n ? `<span class="fr-dot"></span>${n === 1 ? 'One friend is' : `${n} friends are`} playing now` : 'Nobody on your list is playing right now'}</p>`
        + list.map((f, i) => `<a class="fr-row fadein ${f.on ? 'on' : ''}" style="animation-delay:${Math.min(i, 20) * 20}ms" href="/player/${esc(f.id)}"><i class="av" style="background-image:url('${esc(f.avatar_url)}')">${f.on ? '<span class="fr-dot"></span>' : ''}</i><span class="fr-name">${esc(f.username)}${f.flag ? `<img class="flg" src="${SITE}/flags/${esc(f.flag)}.svg" alt="${esc(f.flag)}">` : ''}</span><span class="cap">${f.on ? 'Playing now' : 'Profile'}</span></a>`).join('')
      : '<div class="empty"><b>No friends yet</b>Open a player’s profile and choose Add friend.</div>';
  } catch (e) {
    if (seq === friendsSeq && dlg.open) $('#fr-list').innerHTML = `<div class="empty"><b>Could not load your friends</b>${esc(e.message)}</div>`;
  }
}

/* Picker: Rhythia's own sources (beatmaps, skins, collections), the player's own by default. */
const picker = {kind: 'beatmap', skinType: 'rhs', mine: true, q: '', page: 1, seq: 0, timer: 0, res: null};
function openPicker() {
  const dlg = $('#pick');
  dlg.innerHTML = `<div class="cmp-head"><h2>Add to showcase</h2><button class="iconbtn" type="button" data-pick-close aria-label="Close">${ico('x')}</button></div>
    <div class="cmp-body pick-body">
      <div class="pick-bar"><div class="pills" aria-label="Item type">${[['beatmap', 'Beatmaps'], ['skin', 'Skins'], ['collection', 'Collections']].map(([k, l]) => `<button type="button" aria-pressed="${picker.kind === k}" data-pick-kind="${k}">${l}</button>`).join('')}</div>
        <div class="pills" aria-label="Owner"><button type="button" aria-pressed="${picker.mine}" data-pick-mine="1">Mine</button><button type="button" aria-pressed="${!picker.mine}" data-pick-mine="0">Everyone</button></div>
        ${picker.kind === 'skin' ? `<select class="field" id="pick-skin" aria-label="Skin type">${Object.entries(SKIN_TYPES).map(([k, l]) => `<option value="${k}" ${picker.skinType === k ? 'selected' : ''}>${l}</option>`).join('')}</select>` : ''}</div>
      <label class="field">${ico('search')}<span class="sr">Search</span><input id="pick-q" type="search" placeholder="Search by title" value="${esc(picker.q)}" autocomplete="off"></label>
      <div class="pick-res" id="pick-res"></div></div>`;
  if (!dlg.open) dlg.showModal();
  runPicker();
}
async function runPicker() {
  const box = $('#pick-res'), seq = ++picker.seq; if (!box) return;
  box.innerHTML = '<div class="skeleton" style="margin:16px 4px;width:50%"></div><div class="skeleton" style="margin:10px 4px;width:35%"></div>';
  try {
    const r = await ctx.actions.searchShowcase({kind: picker.kind, text: picker.q.trim(), page: picker.page, ownerId: picker.mine ? U.id : undefined, skinType: picker.skinType});
    if (seq !== picker.seq) return;
    picker.res = r;
    const have = new Set((S.items || []).map(it => it.kind + ':' + it.id));
    box.innerHTML = r.items.length ? `<div class="pick-grid">${r.items.map((it, i) => `<button type="button" class="item" data-pick-item="${i}" ${have.has(it.kind + ':' + it.id) ? 'disabled' : ''}>${itemPreview(it)}<span class="it">${esc(it.title)}</span><small>${esc(it.subtitle || itemKind(it))}</small></button>`).join('')}</div>
      ${r.totalPages > 1 ? `<div class="pager"><span class="num">Page ${picker.page} of ${r.totalPages}</span><div class="pages"><button type="button" data-pick-page="${picker.page - 1}" ${picker.page <= 1 ? 'disabled' : ''} aria-label="Previous page">‹</button><button type="button" data-pick-page="${picker.page + 1}" ${picker.page >= r.totalPages ? 'disabled' : ''} aria-label="Next page">›</button></div></div>` : ''}`
      : `<p class="cap" style="margin:16px 4px">Nothing found${picker.mine ? '. Try “Everyone”.' : '.'}</p>`;
  } catch (e) { if (seq === picker.seq) box.innerHTML = `<p class="cap" style="margin:16px 4px">Search failed (${esc(e.message)}).</p>`; }
}
function intro() {
  const raw = String(U.about_me || '');
  const text = bioText(raw);
  const links = S.links ?? socialLinks(raw);
  const t = titleState();
  // With the title beside it, the showcase gets its own row below both, so a long About never leaves the title column empty.
  const side = ON('titleProgression'), extras = S.editing ? '' : showcaseItems() + showcase(), below = side && extras;
  return `<div class="container reveal" id="intro"><div class="intro ${side ? '' : 'solo'} ${below ? 'has-more' : ''}">
    <section class="panel" aria-labelledby="about-h">
      <div class="about-head"><h3 id="about-h">${S.editing ? 'Edit profile' : 'About'}</h3><div class="socials">${links.map(socialIcon).join('')}${S.viewer === 'owner' && !S.editing ? `<button class="social" type="button" data-edit-bio aria-label="Edit profile" data-tip="<b>Edit profile</b><small>About me, social links and pinned scores</small>">${ico('edit')}</button>` : ''}</div></div>
      ${S.editing ? editor() : `<div class="bio-wrap ${S.bioOpen ? 'open' : ''}"><div class="bio md">${md(S.bio ?? text) || '<span class="cap">No bio yet.</span>'}</div><button class="link bio-more" type="button" data-bio-more hidden>${S.bioOpen ? 'Show less' : 'Show more'}</button></div>${below ? '' : extras}`}
    </section>
    ${ON('titleProgression') ? `<section class="panel" aria-labelledby="title-h">
      <h3 id="title-h">Title</h3>
      <div class="title-head"><img src="${ICONS[t.cur.id] || ''}" alt=""><div><strong style="color:${t.cur.c === '#A3ABB9' ? 'inherit' : t.cur.c}">${esc(t.cur.name)}</strong><span class="cap num">${fmt(t.rp, 2)} RP · #${fmt(t.rank)} global</span></div>
        ${t.next ? `<div class="goal"><span class="cap">Next: ${esc(t.next.name)}</span><b class="num">${esc(t.goal)}</b></div>` : ''}</div>
      <div class="tmap-scroll" id="tmap">${titleMap()}</div>
      <p class="cap tmap-hint">Click a title to see what it takes.</p>
    </section>` : ''}
    ${below ? `<section class="panel intro-more" aria-label="Showcase">${extras}</section>` : ''}
  </div></div>`;
}

/* ── Statistics ── */
function kpi(key, label, value, sub, {sel = S.metric, attr = 'data-metric', selectable = true} = {}) {
  return `<button type="button" class="kpi ${selectable ? 'sel' : ''}" ${selectable ? `${attr}="${key}" aria-pressed="${sel === key}"` : 'disabled'}>
    <small>${label}</small><strong class="num">${value}</strong><span class="num">${sub}</span></button>`;
}
const M = {
  skillPoints: ['Rhythm points', v => fmt(v, 2), v => fmt(v), 1, ' RP'],
  avgAccuracy: ['Avg. accuracy', v => fmt(v, 2) + '%', v => fmt(v, 2) + '%', 2, ' pp'],
  playCount: ['Play count', v => fmt(v), v => fmt(v), 0, ' plays'],
  squaresHit: ['Squares hit', v => fmt(v), v => fmt(v), 0, ''],
};
// Progress shows change in the period as the headline; lifetime totals live in the hero.
function progress(anim) {
  const w = win(), first = w[0], last = w.at(-1), days = w.length - 1, mt = M[S.metric];
  return `<div class="kpis" role="group" aria-label="Choose what the chart shows">${Object.entries(M).map(([k, m]) => {
      const dv = last[k] - first[k];
      return kpi(k, m[0], `<span class="${tone(dv)}">${sgn(dv, m[3], k === 'avgAccuracy' ? ' pp' : '')}</span>`, `${m[1](last[k])} now`);
    }).join('')}</div>
    <div class="chart-panel panel">
      <div class="panel-head"><h3>${mt[0]} <span>· ${S.range === 0 ? `all ${days} days` : `last ${days} days`}</span></h3>${rangePills()}</div>
      ${chart(w.map(d => ({d: d.date, v: d[S.metric]})), {f: mt[2], label: mt[0] + ' over time', anim: anim === 'chart' ? 'quick' : ''})}
    </div>
    <div id="activity">${activity()}</div>`;
}

/* Activity: labelled tiles instead of a heat strip. Days show one month as a calendar,
   weeks show the weeks of that month, months show a year. Arrows step through time,
   so two years of history never makes the page longer. */
const addDays = (s, n) => { const d = utc(s); d.setUTCDate(d.getUTCDate() + n); return isoDay(d); };
const mondayOf = s => addDays(s, -((utc(s).getUTCDay() + 6) % 7));
const nextMonth = ym => { const [y, m] = ym.split('-').map(Number); return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`; };
const prevMonth = ym => { const [y, m] = ym.split('-').map(Number); return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`; };
const isoWeek = s => { const d = utc(s); d.setUTCDate(d.getUTCDate() + 3 - ((d.getUTCDay() + 6) % 7)); const y0 = new Date(Date.UTC(d.getUTCFullYear(), 0, 4)); return 1 + Math.round(((d - y0) / 864e5 - 3 + ((y0.getUTCDay() + 6) % 7)) / 7); };
const monthName = (ym, o = {month: 'long', year: 'numeric'}) => utc(ym + '-01').toLocaleDateString('en-GB', {...o, timeZone: 'UTC'});
const FIRST = DAYS[0]?.date || H[0].date, LAST = H.at(-1).date;
// Scores Rhythia still lists with a timestamp: the recent list plus the top 100.
const SCORES = (() => { const seen = new Set(); return [...MODES.normal.recent, ...MODES.normal.top].filter(s => !seen.has(s.id) && seen.add(s.id)); })();
function agg(from, to) {
  const ds = DAYS.filter(d => d.date >= from && d.date < to);
  if (!ds.length) return null;
  const sum = k => ds.reduce((a, d) => a + d[k], 0), before = H[H.indexOf(ds[0].t) - 1] || ds[0].t, end = ds.at(-1).t;
  return {plays: sum('plays'), rp: sum('rp'), rank: sum('rank'), sq: sum('sq'), active: ds.filter(d => d.plays).length, days: ds.length, end,
    accD: end.avgAccuracy - before.avgAccuracy, country: before.countryRank - end.countryRank,
    scores: SCORES.filter(s => { const k = s.created_at.slice(0, 10); return k >= from && k < to; }).sort((a, b) => b.raw - a.raw)};
}
function period(gran, key) {
  if (gran === 'day') return {from: key, to: addDays(key, 1), title: dayName(key, {weekday: 'long', day: 'numeric', month: 'long'}), sub: ago(key + 'T23:59:00Z')};
  if (gran === 'week') { const end = addDays(key, 6); return {from: key, to: addDays(key, 7), title: `Week ${isoWeek(key)}`, sub: `${dm(key)} – ${dm(end)} ${end.slice(0, 4)}`}; }
  return {from: key + '-01', to: nextMonth(key) + '-01', title: monthName(key), sub: 'Whole month'};
}
const selKey = () => S.gran === 'day' ? S.selDate : S.gran === 'week' ? mondayOf(S.selDate) : S.selDate.slice(0, 7);
const ACT = {
  plays: {label: 'Plays', v: a => a.plays, f: v => v ? `${fmt(v)}<span class="u"> play${v === 1 ? '' : 's'}</span>` : '—', tint: 'var(--accent)'},
  rp: {label: 'RP', v: a => a.rp, f: v => v ? `${sgn(v, 1)}<span class="u"> RP</span>` : '—', tint: 'var(--accent)'},
  rank: {label: 'Rank', v: a => a.rank, f: v => v ? `${sgn(v)}<span class="u"> place${Math.abs(v) === 1 ? '' : 's'}</span>` : '—', tint: 'var(--good)'},
};
function tiles() {
  const m = ACT[S.act], cur = S.gran === 'month' ? S.cur.slice(0, 4) : S.cur;
  let list = [], head = '';
  if (S.gran === 'day') {
    const first = cur + '-01', lead = (utc(first).getUTCDay() + 6) % 7;
    head = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => `<span class="wh">${d}</span>`).join('') + '<span></span>'.repeat(lead);
    for (let d = first; d.slice(0, 7) === cur; d = addDays(d, 1)) list.push({key: d, n: String(utc(d).getUTCDate())});
  } else if (S.gran === 'week') {
    const end = nextMonth(cur) + '-01';
    for (let w = mondayOf(prevMonth(prevMonth(cur)) + '-01'); w < end; w = addDays(w, 7)) list.push({key: w, n: `Week ${isoWeek(w)}`, s: `${dm(w)} – ${dm(addDays(w, 6))}`});
  } else {
    for (let k = 1; k <= 12; k++) { const ym = `${cur}-${String(k).padStart(2, '0')}`; list.push({key: ym, n: monthName(ym, {month: 'short'})}); }
  }
  list.forEach(x => { const p = period(S.gran, x.key); x.a = p.from <= LAST ? agg(p.from, p.to) : null; x.future = p.from > LAST; });
  const max = Math.max(1, ...list.filter(x => x.a).map(x => Math.abs(m.v(x.a))));
  const sel = selKey(), long = S.gran !== 'day';
  return head + list.map(x => {
    if (!x.a) return `<button type="button" class="ct off" disabled><span class="n">${x.n}</span>${x.s ? `<small>${x.s}</small>` : ''}<small>${x.future ? '' : 'Not tracked'}</small></button>`;
    const v = m.v(x.a), lv = v ? Math.min(4, Math.ceil(Math.abs(v) / max * 4)) : 0;
    const tint = S.act === 'rank' && v < 0 ? 'var(--bad)' : m.tint;
    return `<button type="button" class="ct" style="--lv:${lv};--tint:${tint}" data-sel="${x.key}" aria-pressed="${sel === x.key}" data-tip="<b>${esc(period(S.gran, x.key).title)}</b><small>${fmt(x.a.plays)} plays · ${sgn(x.a.rp, 1)} RP · rank ${sgn(x.a.rank)}</small>">
      <span class="n">${x.n}</span>${x.s ? `<small>${x.s}</small>` : ''}<b class="num ${S.act !== 'plays' ? tone(v) : ''}">${m.f(v, true)}</b>${long ? `<small>${x.a.active} of ${x.a.days} day${x.a.days === 1 ? '' : 's'} active</small>` : ''}</button>`;
  }).join('');
}
function activity(anim) {
  const yr = S.cur.slice(0, 4), label = S.gran === 'month' ? yr : S.gran === 'week' ? `${monthName(prevMonth(prevMonth(S.cur)), {month: 'short'})} – ${monthName(S.cur, {month: 'short', year: 'numeric'})}` : monthName(S.cur);
  const canPrev = S.gran === 'month' ? yr > FIRST.slice(0, 4) : S.cur > FIRST.slice(0, 7);
  const canNext = S.gran === 'month' ? yr < LAST.slice(0, 4) : S.cur < LAST.slice(0, 7);
  return `<div class="act">
    <div class="panel">
      <div class="panel-head"><h3>Activity</h3>
        <div class="pills" aria-label="Group by">${[['day','Days'],['week','Weeks'],['month','Months']].map(([k, l]) => `<button type="button" aria-pressed="${S.gran === k}" data-gran="${k}">${l}</button>`).join('')}</div></div>
      <div class="act-bar">
        <div class="stepper"><button class="iconbtn" type="button" data-step="-1" ${canPrev ? '' : 'disabled'} aria-label="Earlier">‹</button><strong>${label}</strong><button class="iconbtn" type="button" data-step="1" ${canNext ? '' : 'disabled'} aria-label="Later">›</button></div>
        <div class="pills" aria-label="Show">${Object.entries(ACT).map(([k, a]) => `<button type="button" aria-pressed="${S.act === k}" data-act="${k}">${a.label}</button>`).join('')}</div>
      </div>
      <div class="cal ${S.gran} ${anim ? 'swap' : ''}">${tiles()}</div>
      <p class="cap act-note">Tracked since ${dm(FIRST)} ${FIRST.slice(0, 4)}. Stronger colour means more ${S.act === 'plays' ? 'plays' : S.act === 'rp' ? 'RP gained' : 'places moved'}.</p>
    </div>
    <div class="panel day ${anim ? 'fadein' : ''}" id="day">${detail()}</div>
  </div>`;
}
function detail() {
  const p = period(S.gran, selKey()), a = agg(p.from, p.to);
  if (!a) return `<h4>${esc(p.title)}</h4><div class="empty"><b>Not tracked</b>History starts on ${dm(FIRST)}.</div>`;
  const t = a.end, cell = (label, val, sub, cls = '') => `<div><dt>${label}</dt><dd class="num">${val}<small class="${cls}">${sub}</small></dd></div>`;
  const n = a.scores.length, shown = S.allScores ? a.scores : a.scores.slice(0, 5);
  return `<h4>${esc(p.title)}</h4><span class="cap">${esc(p.sub)}${S.gran !== 'day' ? ` · ${a.active} of ${a.days} days active` : ''}</span>
    <dl>
      ${cell('Plays', fmt(a.plays), S.gran === 'day' ? (a.plays ? 'that day' : 'no plays') : `${fmt(a.sq)} squares hit`, 'flat')}
      ${cell('Rhythm points', fmt(t.skillPoints, 2), sgn(a.rp, 1), tone(a.rp))}
      ${cell('Global rank', '#' + fmt(t.globalRank), sgn(a.rank), tone(a.rank))}
      ${cell(COUNTRY, '#' + fmt(t.countryRank), sgn(a.country), tone(a.country))}
      ${cell('Avg. accuracy', fmt(t.avgAccuracy, 2) + '%', sgn(a.accD, 2, ' pp'), tone(a.accD))}
      ${S.gran === 'day' ? cell('Squares hit', fmt(a.sq), a.plays ? 'that day' : 'no plays', 'flat') : cell('Active days', `${a.active} of ${a.days}`, 'days with a play', 'flat')}
    </dl>
    <div class="played"><h5>Scores set <span class="num">${n}</span></h5>
      ${n ? `<div class="played-list ${S.allScores && n > 5 ? 'scroll' : ''}">${shown.map(s => `<a href="/score/${encodeURIComponent(s.id)}"><i style="background-image:url('${esc(s.thumb)}')"></i><span title="${esc(s.beatmapTitle)}">${esc(s.beatmapTitle)}<small class="num">${fmt(s.acc, 2)}% · ${s.speedKey}×</small></span><em class="num"><b>${fmt(s.raw)}</b> RP</em></a>`).join('')}</div>
        ${n > 5 ? `<button class="link" type="button" data-all-scores>${S.allScores ? 'Show top 5' : `Show all ${n}`}</button>` : ''}`
      : `<p class="cap" style="margin:0">${a.plays ? 'These plays are no longer in Rhythia’s recent or top lists.' : 'Nothing played in this period.'}</p>`}</div>`;
}

function rankings(anim) {
  const m = MODES[S.mode];
  if (S.mode !== 'normal') {
    const rh = (U.rank_history || []).filter(h => h[m.key]).slice(-(rangeDays() + 1)).map(h => ({d: h.date, v: h[m.key]}));
    return `<div class="kpis">${kpi('g', 'Global rank', m.rank ? '#' + fmt(m.rank) : '—', `${m.label} mode`, {selectable: false})}${kpi('c', COUNTRY, m.country ? '#' + fmt(m.country) : '—', `${m.label} mode`, {selectable: false})}</div>
      <div class="chart-panel panel"><div class="panel-head"><h3>${m.label} global rank</h3>${rangePills()}</div>${chart(rh, {invert: true, f: v => '#' + fmt(v), label: m.label + ' rank', anim: anim === 'chart' ? 'quick' : ''})}</div>`;
  }
  const w = win(), first = w[0], last = w.at(-1), days = w.length - 1;
  const best = Math.min(...w.map(d => d.globalRank)), worst = Math.max(...w.map(d => d.globalRank));
  const opt = {sel: S.rankMetric, attr: 'data-rank-metric'};
  return `<div class="kpis" role="group" aria-label="Choose a ranking to chart">
      ${kpi('globalRank', 'Global rank', '#' + fmt(last.globalRank), `<span class="${tone(first.globalRank - last.globalRank)}">${sgn(first.globalRank - last.globalRank)}</span> in ${days} days`, opt)}
      ${kpi('countryRank', COUNTRY, '#' + fmt(last.countryRank), `<span class="${tone(first.countryRank - last.countryRank)}">${sgn(first.countryRank - last.countryRank)}</span> in ${days} days`, opt)}
      ${kpi('b', 'Best in period', '#' + fmt(best), `lowest #${fmt(worst)}`, {selectable: false})}
      ${kpi('s', 'Spin global', MODES.spin.rank ? '#' + fmt(MODES.spin.rank) : '—', `${fmt(MODES.spin.rp, 1)} RP`, {selectable: false})}
    </div>
    <div class="chart-panel panel"><div class="panel-head"><h3>${S.rankMetric === 'globalRank' ? 'Global rank' : COUNTRY + ' rank'} <span>· ${S.range === 0 ? `all ${days} days` : `last ${days} days`}</span></h3>${rangePills()}</div>
      ${chart(w.map(d => ({d: d.date, v: d[S.rankMetric]})), {invert: true, f: v => '#' + fmt(v), label: 'Rank over time', anim: anim === 'chart' ? 'quick' : ''})}</div>`;
}
// Momentum follows the extension's scout rules: a 14-day rank comparison, "fast" when the
// move is at least 5% of the old rank, a 3-day "burst" at 2%, and RP context notes.
const FAQ = [
  ['up', 'Climbing', 'Your global rank is better than it was 14 days ago. It turns into a <b>Fast climb</b> once the gain reaches 5% of the old rank, and never for fewer than 3 places.'],
  ['down', 'Dropping', 'Your global rank is worse than 14 days ago, even if your RP went up: the players around you gained more. A <b>Sharp drop</b> uses the same 5% rule.'],
  ['steady', 'Holding steady', 'Same rank as 14 days ago. It is only called stagnation when you have been playing and RP has barely moved.'],
  ['elite', 'Defending top 30', 'Same rank while inside the top 30. Slow RP growth is normal up there, so it is not treated as stagnation.'],
];
const FAQ_ICON = {up: 'up', down: 'down', steady: 'steady', elite: 'shield'};
function faq(mo, last) {
  const ref = mo.ref, move = Math.abs(mo.delta), pctMove = move / ref.globalRank * 100, d3 = Math.abs(mo.d3 || 0);
  const places = n => `${fmt(n)} place${n === 1 ? '' : 's'}`;
  const rankLine = mo.delta
    ? `You went from <b>#${fmt(ref.globalRank)}</b> on ${dm(ref.date)} to <b>#${fmt(last.globalRank)}</b>: ${places(move)}, or <b>${fmt(pctMove, 1)}%</b> of your old rank. ${mo.delta > 0 ? 'A fast climb' : 'A sharp drop'} starts at <b>${places(mo.fast)}</b>${move >= mo.fast ? ', so this one counts.' : '.'}`
    : `Your rank is the same as on ${dm(ref.date)} (<b>#${fmt(last.globalRank)}</b>).`;
  const burstLine = isFinite(mo.burst) ? ` Over the last 3 days you moved ${places(d3)}; a ${mo.d3 < 0 ? 'sudden drop' : 'rank surge'} needs <b>${places(mo.burst)}</b>.` : '';
  const rate = Math.abs(mo.pct * 14 / Math.max(1, mo.days));
  const rpLine = `RP changed by <b>${sgn(mo.gain, 1)}</b> (${sgn(mo.pct, 2, '%')}) in ${mo.days} days. Under 0.5% in 14 days is a low gain and under 0.1% is almost flat, so yours is <b>${mo.gain < 0 ? 'falling' : rate < .1 ? 'almost flat' : rate < .5 ? 'a low gain' : 'healthy growth'}</b>.`;
  return `<div class="faq" id="faq" role="dialog" aria-label="Playstyle statuses">
    <div class="faq-head"><strong>Playstyle statuses</strong><button class="iconbtn" type="button" data-faq aria-label="Close">${ico('x')}</button></div>
    <div class="faq-grid">${FAQ.map(([k, l, p]) => `<div class="faq-item ${k} ${mo.kind === k ? 'now' : ''}"><span class="tag">${TREND[FAQ_ICON[k]]}${l}${mo.kind === k ? '<em>You</em>' : ''}</span><p>${p}</p></div>`).join('')}</div>
    <div class="faq-you"><small>Your numbers</small><p>${rankLine}${burstLine}</p><p>${rpLine}</p></div>
  </div>`;
}
const MOMENTUM_HELP = '<b>How momentum is decided</b><small>Global rank today against 14 days ago (7 or 3 if history is shorter). Better rank: Climbing. Worse: Dropping. Same: Holding steady, or Defending top 30 inside the top 30.<br>Fast climb / Sharp drop: a move of at least 5% of the old rank. Rank surge / Sudden drop: at least 2% in 3 days.</small>';
const TREND = {
  up: '<svg viewBox="0 0 24 24" class="ico"><path d="m3 17 6-6 4 4 8-8"/><path d="M14 7h7v7"/></svg>',
  down: '<svg viewBox="0 0 24 24" class="ico"><path d="m3 7 6 6 4-4 8 8"/><path d="M14 17h7v-7"/></svg>',
  steady: '<svg viewBox="0 0 24 24" class="ico"><path d="M3 12h4l3-8 4 16 3-8h4"/></svg>',
  shield: '<svg viewBox="0 0 24 24" class="ico"><path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/></svg>',
};
function momentum() {
  const last = H.at(-1), back = n => H.length > n ? H[H.length - 1 - n] : null;
  const ref = back(14) || back(7) || back(3), b3 = back(3), rank = last.globalRank;
  const r = {kind: 'steady', label: 'Holding steady', icon: TREND.steady, delta: 0, days: 0, flags: [], notes: []};
  if (!ref) { r.label = 'Not enough history'; return r; }
  r.days = H.length - 1 - H.indexOf(ref); r.delta = ref.globalRank - rank;
  if (r.delta > 0) Object.assign(r, {kind: 'up', label: 'Climbing', icon: TREND.up});
  else if (r.delta < 0) Object.assign(r, {kind: 'down', label: 'Dropping', icon: TREND.down});
  else if (rank <= 30) Object.assign(r, {kind: 'elite', label: 'Defending top 30', icon: TREND.shield});
  const fast = Math.max(3, Math.ceil(ref.globalRank * .05)), d3 = b3 ? b3.globalRank - rank : 0, burst = b3 ? Math.max(3, Math.ceil(b3.globalRank * .02)) : Infinity;
  if (Math.abs(d3) >= burst) r.flags.push(d3 > 0 ? 'Rank surge' : 'Sudden drop');
  else if (Math.abs(r.delta) >= fast) r.flags.push(r.delta > 0 ? 'Fast climb' : 'Sharp drop');
  const gain = last.skillPoints - ref.skillPoints, pct = ref.skillPoints ? gain / ref.skillPoints * 100 : 0, scaled = pct * 14 / Math.max(1, r.days);
  const plays = last.playCount - ref.playCount, rpText = `<b>${sgn(gain, 1)} RP</b> (${sgn(pct, 2, '%')}) in ${r.days} days`;
  if (Math.abs(scaled) < .1) r.notes.push(`${plays ? 'Little RP movement despite recent play' : 'Little RP movement'}: ${rpText}.`);
  else if (scaled < .5 && gain > 0) r.notes.push(`Low RP gain: ${rpText}.`);
  else if (gain < 0) r.notes.push(`Total RP is down: ${rpText}.`);
  else if (r.delta < 0) r.notes.push(`RP is growing, but rank is falling: ${rpText}. Players nearby are gaining faster.`);
  else r.notes.push(`RP is growing: ${rpText}.`);
  const newTop = MODES.normal.top.filter(s => NOW - new Date(s.created_at) <= 14 * 864e5).length;
  if (newTop) r.notes.push(`<b>${newTop}</b> of the current top 100 ${newTop === 1 ? 'was' : 'were'} set in the last 14 days.`);
  // Breaks and pace, from the daily history.
  const gap = BREAKS.at(-1);
  if (gap?.open) r.notes.unshift(`No plays for <b>${gap.days} days</b>, since ${dm(gap.from)}.`);
  else if (gap && addDays(gap.to, 1) >= addDays(last.date, -13)) r.notes.unshift(`Back on <b>${dm(addDays(gap.to, 1))}</b> after a <b>${gap.days}-day</b> break.`);
  if (DAYS.length >= 28) {
    const p14 = playsIn(addDays(last.date, -13), addDays(last.date, 1)), p28 = playsIn(addDays(last.date, -27), addDays(last.date, -13));
    if (p28 >= 10 && (p14 <= p28 * .5 || p14 >= p28 * 1.5)) r.notes.push(`<b>${plural(p14, 'play')}</b> in the last 14 days, ${p14 < p28 ? 'down' : 'up'} from <b>${fmt(p28)}</b> in the 14 days before.`);
  }
  r.plays = plays; Object.assign(r, {ref, fast, burst, d3, gain, pct});
  return r;
}
/* ── Playstyle ── */
// Every Lock play Rhythia still lists with its time: the last 100 and the top 100.
const PLAYS = (() => { const seen = new Set(); return [...prepare(D.scores.lastDay), ...MODES.normal.top].filter(s => s.created_at && !seen.has(s.id) && seen.add(s.id)); })();
const DAY = new Map(DAYS.map(d => [d.date, d]));
const dayOf = s => s.created_at.slice(0, 10);
const avgAcc = list => list.reduce((a, s) => a + s.acc, 0) / list.length;
const plural = (n, w) => `${fmt(n)} ${w}${n === 1 ? '' : 's'}`;
const playsIn = (from, to) => DAYS.filter(d => d.date >= from && d.date < to).reduce((a, d) => a + d.plays, 0);
// A break is four or more tracked days in a row without a play.
const BREAKS = (() => {
  const out = []; let run = null;
  for (const d of DAYS) {
    if (!d.plays) { if (run) { run.to = d.date; run.days++; } else run = {from: d.date, to: d.date, days: 1}; continue; }
    if (run && run.days >= 4) out.push(run);
    run = null;
  }
  if (run && run.days >= 4) out.push({...run, open: true});
  return out;
})();
// How the plays before and after a break compare.
function comeback(b) {
  const back = addDays(b.to, 1), week = playsIn(back, addDays(back, 7));
  const after = PLAYS.filter(s => dayOf(s) >= back && dayOf(s) < addDays(back, 14)), before = PLAYS.filter(s => dayOf(s) < b.from && dayOf(s) >= addDays(b.from, -30));
  const since = Math.round((utc(LAST) - utc(back)) / 864e5) + 1;
  let t = `Back on <b>${dm(back)}</b> with <b>${plural(week, 'play')}</b> ${since < 7 ? `in the ${plural(since, 'day')} since` : 'in the first week'}.`;
  if (after.length >= 3 && before.length >= 3) {
    const x = avgAcc(after), y = avgAcc(before), d = x - y;
    t += ` Accuracy <b>${fmt(x, 2)}%</b>, against <b>${fmt(y, 2)}%</b> before the break: ${d <= -.5 ? 'still shaking off the rust' : d >= -.15 ? 'already at the usual level' : 'close to the usual level'}.`;
  }
  return t;
}

// Map types come from each map's notes (ExodusMapKit). Saved results show at once; the rest load
// while the tab is open, four files at a time, and only the notes part of each file is read.
const KIND = {
  stream: ['Streams', 'Mostly runs of fast, evenly spaced notes'],
  jump: ['Jumps', 'Mostly slower notes that move a cell or more'],
  varied: ['Varied', 'No single pattern makes up most of the map'],
  quantum: ['Quantum', 'Many notes sit off the map’s grid'],
};
const STY = {map: RhythiaX.ExodusData.storedStyles(PLAYS.map(s => s.songId)), started: false, done: 0, total: 0};
const kindOf = s => STY.map.get(s.songId)?.kind;
function loadStyles() {
  if (STY.started || S.mode !== 'normal') return;
  STY.started = true;
  const ids = [...new Set(PLAYS.map(s => s.songId))];
  if (ids.every(id => STY.map.has(id))) return;
  let queued = false;
  const paint = () => { queued = false; const el = $('#mtypes'); if (el) morph(el, mapTypes()); };
  const later = () => { if (!queued) { queued = true; setTimeout(paint, 250); } };
  STY.total = ids.length; STY.done = STY.map.size;
  RhythiaX.ExodusData.mapStyles(ids, ac.signal, (done, total) => { STY.done = done; STY.total = total; later(); })
    .then(map => { if (ac.signal.aborted) return; STY.map = map; STY.total = 0; paint(); })
    .catch(() => { STY.total = 0; later(); });
}

const mix = (rows, color, unit, of, tip = () => '') => `<div class="stack">${rows.filter(r => r[1]).map(([k, n]) => `<i style="flex:${n};background:${color(k)}" data-tip="<b>${unit(k)}</b><small>${n} of ${of}${tip(k)}</small>"></i>`).join('')}</div>`;
const legend = (rows, color, unit) => `<div class="legend">${rows.map(([k, n]) => `<div class="${n ? '' : 'zero'}"><span style="--c:${color(k)}">${unit(k)}</span><em class="num">${n}</em></div>`).join('')}</div>`;

function mapTypes() {
  const ym = S.rev, from = ym + '-01', to = nextMonth(ym) + '-01';
  // Each map counts once in the month, however many times it was played: the split is about which maps.
  const seen = new Set(), month = PLAYS.filter(s => dayOf(s) >= from && dayOf(s) < to && !seen.has(s.songId) && seen.add(s.songId)), top = MODES.normal.top;
  const all = [...month, ...top], known = all.filter(kindOf).length;
  const name = monthName(ym, {month: 'long'});
  if (STY.total && known < all.length) {
    return `<h4>Map types</h4><div class="mt-load" role="status"><span>Reading map files <b class="num">${STY.done} of ${STY.total}</b></span><i style="--p:${Math.round(STY.done / STY.total * 100)}%"></i></div>
      <p class="cap">Only the notes are read, so each map takes a moment once and is remembered after that.</p>`;
  }
  if (!known) return `<h4>Map types</h4><p class="cap">The map files could not be read right now.</p>`;
  const keys = Object.keys(KIND), color = k => `var(--k-${k})`, label = k => KIND[k][0];
  const count = list => keys.map(k => [k, list.filter(s => kindOf(s) === k)]);
  const m = count(month), t = count(top), mKnown = month.filter(kindOf).length, tKnown = top.filter(kindOf).length;
  const base = mKnown ? m : t;
  const rows = keys.map((k, i) => ({k, m: m[i][1], t: t[i][1]})).filter(r => r.m.length || r.t.length);
  const lines = [];
  const lead = t.slice().sort((a, b) => b[1].length - a[1].length)[0];
  if (lead[1].length) lines.push(`Your top 100 is mostly <b>${label(lead[0]).toLowerCase()}</b> (${lead[1].length}).`);
  const accs = t.filter(r => r[1].length >= 5).map(([k, l]) => [k, avgAcc(l)]).sort((a, b) => b[1] - a[1]);
  if (accs.length >= 2 && accs[0][1] - accs.at(-1)[1] >= .3) lines.push(`Accuracy is highest on <b>${label(accs[0][0]).toLowerCase()}</b> (${fmt(accs[0][1], 2)}%) and lowest on <b>${label(accs.at(-1)[0]).toLowerCase()}</b> (${fmt(accs.at(-1)[1], 2)}%).`);
  if (mKnown >= 5 && tKnown) {
    const shift = m.map(([k, l], i) => [k, l.length, l.length / mKnown - t[i][1].length / tKnown, t[i][1].length]).sort((a, b) => b[2] - a[2])[0];
    if (shift[2] >= .2) lines.push(`${name} leans more on <b>${label(shift[0]).toLowerCase()}</b>: ${shift[1]} of ${mKnown} maps, against ${shift[3]} of the top 100.`);
  }
  return `<h4>Map types <span class="cap">· ${mKnown ? `${plural(mKnown, 'map')} played in ${name}` : `top 100, no listed plays in ${name}`}</span></h4>
    ${mix(base.map(([k, l]) => [k, l.length]), color, label, mKnown ? `${mKnown} in ${name}` : `${tKnown} in the top 100`, k => `<br>${KIND[k][1]}`)}
    <div class="mt-rows"><span class="h">Type</span><span class="h">${esc(monthName(ym, {month: 'short'}))}</span><span class="h">Top 100</span><span class="h">Accuracy</span>
      ${rows.map(r => `<span class="k" style="--c:${color(r.k)}" data-tip="<b>${label(r.k)}</b><small>${KIND[r.k][1]}</small>">${label(r.k)}</span><em class="num">${r.m.length || '—'}</em><em class="num">${r.t.length || '—'}</em><em class="num" data-tip="<small>Average accuracy of these maps in your top 100</small>">${r.t.length ? fmt(avgAcc(r.t), 2) + '%' : '—'}</em>`).join('')}</div>
    ${lines.length ? `<ul class="notes">${lines.map(l => `<li>${l}</li>`).join('')}</ul>` : ''}`;
}

// One column per day; a break is marked under its days.
function strip(ym) {
  const from = ym + '-01', to = nextMonth(ym) + '-01', days = [];
  for (let d = from; d < to; d = addDays(d, 1)) days.push(d);
  const max = Math.max(1, ...days.map(d => DAY.get(d)?.plays || 0));
  const cols = days.map((d, i) => {
    const x = DAY.get(d);
    if (d > LAST) return `<span class="mcol future" style="grid-column:${i + 1}"></span>`;
    if (!x) return `<span class="mcol off" style="grid-column:${i + 1}" data-tip="<b>${dayName(d)}</b><small>Not tracked</small>"><i></i></span>`;
    return `<span class="mcol ${x.plays ? '' : 'zero'}" style="grid-column:${i + 1};--h:${Math.round(x.plays / max * 100)}" data-tip="<b>${dayName(d)}</b><small>${x.plays ? `${plural(x.plays, 'play')} · ${sgn(x.rp, 1)} RP · rank ${sgn(x.rank)}` : 'No plays'}</small>"><i></i></span>`;
  }).join('');
  const labels = days.map((d, i) => (i % 7 === 0 ? `<span class="mday num" style="grid-column:${i + 1}">${i + 1}</span>` : '')).join('');
  const breaks = BREAKS.filter(b => b.from < to && b.to >= from).map(b => {
    const s = days.indexOf(b.from < from ? from : b.from) + 1, e = days.indexOf(b.to >= to ? days.at(-1) : b.to) + 1;
    return `<span class="mbrk" style="grid-column:${s}/${e + 1}" data-tip="<b>${b.open ? 'No plays since ' + dm(b.from) : `Break · ${dm(b.from)} – ${dm(b.to)}`}</b><small>${b.days} days without a play</small>"><b>${b.open ? `${b.days} days so far` : `${b.days}-day break`}</b></span>`;
  }).join('');
  return `<div class="mstrip" style="--n:${days.length}"><div class="mcols">${cols}</div><div class="mlab">${labels}</div>${breaks ? `<div class="mbrks">${breaks}</div>` : ''}</div>`;
}

function monthNotes(ym, a, plays) {
  const from = ym + '-01', to = nextMonth(ym) + '-01', name = monthName(ym, {month: 'long'}), out = [];
  if (!a) out.push(DAYS.length ? `Daily history starts on <b>${dm(FIRST)} ${FIRST.slice(0, 4)}</b>, so ${name} only shows the plays Rhythia still lists.` : 'Without daily history, only the plays Rhythia still lists are counted.');
  for (const b of BREAKS.filter(b => b.from < to && b.to >= from).sort((x, y) => y.days - x.days).slice(0, 2)) {
    out.push(b.open ? `No plays since <b>${dm(b.from)}</b>: <b>${b.days} days</b> so far.` : `A <b>${b.days}-day break</b>, from ${dm(b.from)} to ${dm(b.to)}.`);
    const back = addDays(b.to, 1);
    if (!b.open && back >= from && back < to) out.push(comeback(b));
  }
  if (a && a.days >= 5) {
    const w = a.plays / a.days * 7, pm = prevMonth(ym), pa = agg(pm + '-01', from), pn = monthName(pm, {month: 'long'});
    const pw = pa && pa.days >= 7 ? pa.plays / pa.days * 7 : null;
    out.push(`About <b>${fmt(w)}</b> plays a week${pw == null ? ` over ${a.days} tracked days` : pw && Math.abs(w / pw - 1) >= .25 ? `, ${w > pw ? 'up' : 'down'} from <b>${fmt(pw)}</b> in ${pn}` : `, about the same as ${pn}`}.`);
    const busy = DAYS.filter(d => d.date >= from && d.date < to).reduce((m, d) => d.plays > m.plays ? d : m, {plays: 0});
    if (busy.plays && a.active >= 3) out.push(`Busiest day: <b>${dm(busy.date)}</b>, ${plural(busy.plays, 'play')}${busy.rp ? ` and ${sgn(busy.rp, 1)} RP` : ''}.`);
  }
  const inTop = MODES.normal.top.filter(s => dayOf(s) >= from && dayOf(s) < to);
  if (inTop.length) { const b = inTop.reduce((m, s) => s.raw > m.raw ? s : m); out.push(`<b>${inTop.length}</b> of the top 100 ${inTop.length === 1 ? 'was' : 'were'} set in ${name}. The best: <b>${esc(b.beatmapTitle)}</b>, ${fmt(b.raw)} RP at ${b.speedKey}×.`); }
  if (plays.length >= 5) {
    const top = MODES.normal.top, tried = Object.keys(SPEED).map(k => [k, plays.filter(s => s.speedKey === k).length, top.filter(s => s.speedKey === k).length])
      .filter(([, n, t]) => n >= 3 && n / plays.length >= .25 && t / Math.max(1, top.length) < .1).sort((x, y) => y[1] - x[1])[0];
    if (tried) out.push(`Trying <b>${tried[0]}×</b>: ${tried[1]} of ${plays.length} listed plays, against ${tried[2]} of the top 100.`);
  }
  if (!plays.length && !(a && a.plays)) out.push(`No plays in ${name}.`);
  return out.slice(0, 5);
}

const MONTHS = (() => {
  const first = [FIRST, ...PLAYS.map(dayOf)].sort()[0].slice(0, 7), out = [];
  for (let m = first; m <= LAST.slice(0, 7); m = nextMonth(m)) out.push(m);
  return out;
})();
if (!MONTHS.includes(S.rev)) S.rev = MONTHS.at(-1);
function review() {
  const ym = S.rev, from = ym + '-01', to = nextMonth(ym) + '-01', i = MONTHS.indexOf(ym);
  const a = agg(from, to), plays = PLAYS.filter(s => dayOf(s) >= from && dayOf(s) < to);
  const fig = (label, v, cls = '') => `<div><small>${label}</small><b class="num ${cls}">${v}</b></div>`;
  return `<div class="panel wide mrev" id="mrev">
    <div class="panel-head"><h3>Month in review</h3>
      <div class="stepper"><button class="iconbtn" type="button" data-rev="-1" ${i > 0 ? '' : 'disabled'} aria-label="Earlier month">‹</button><strong>${monthName(ym)}</strong><button class="iconbtn" type="button" data-rev="1" ${i < MONTHS.length - 1 ? '' : 'disabled'} aria-label="Later month">›</button></div></div>
    ${a ? `<div class="mfig">${fig('Plays', fmt(a.plays))}${fig('Active days', `${a.active} of ${a.days}`)}${fig('RP', sgn(a.rp, 1), tone(a.rp))}${fig('Global rank', sgn(a.rank), tone(a.rank))}${fig('Avg. accuracy', sgn(a.accD, 2, ' pp'), tone(a.accD))}</div>` : ''}
    <div class="mbody">
      <div>${a ? strip(ym) : ''}<ul class="notes">${monthNotes(ym, a, plays).map(n => `<li>${n}</li>`).join('')}</ul>
        <p class="cap">From the daily history and the plays Rhythia still lists (your last 100 and top 100).</p></div>
      <div id="mtypes">${mapTypes()}</div>
    </div>
  </div>`;
}

// Playstyle reads the top 100, so it has no period switch; Month in review has its own.
function playstyle() {
  const top = MODES[S.mode].top;
  if (!top.length) return `<div class="empty"><b>No ${MODES[S.mode].label} scores yet</b>Playstyle needs ranked scores.</div>`;
  const mo = momentum(), last = H.at(-1), ref14 = H.length > 14 ? H.at(-15) : H[0];
  const count = (f, keys) => keys.map(k => [k, top.filter(s => f(s) === k).length]);
  const speeds = count(s => s.speedKey, Object.keys(SPEED)), grades = count(s => s.grade, GRADES);
  const primary = speeds.slice().sort((a, b) => b[1] - a[1])[0];
  const avgRp = top.reduce((a, s) => a + s.raw, 0) / top.length, floor = Math.min(...top.map(s => s.raw));
  const accMove = last.avgAccuracy - ref14.avgAccuracy;
  const best = f => top.reduce((a, b) => f(b) > f(a) ? b : a);
  const bAcc = best(s => s.acc), bRp = best(s => s.raw), bNotes = best(s => s.beatmapNotes);
  const of = `the top ${top.length}`, spd = k => k + '×', grd = k => k;
  const sig = (label, value, sub, style = '') => `<div class="sig"><small>${label}</small><b class="num" style="${style}">${value}</b><span>${sub}</span></div>`;
  return `<div class="ps">
      <div class="panel">
        <div class="mom ${mo.kind}"><span class="mom-ico">${mo.icon}</span>
          <div><small>Momentum · last ${mo.days} days</small><strong>${mo.label}${mo.flags.map(f => `<em>${f}</em>`).join('')}</strong>
            <span class="num">#${fmt(last.globalRank)} now · ${mo.delta ? `${sgn(mo.delta)} places` : 'no change'}</span></div>
          ${mo.ref ? `<button class="faq-btn" type="button" data-faq aria-expanded="false" aria-controls="faq">${ico('info')}Status guide</button>` : ''}</div>
        <ul class="notes">${mo.notes.map(n => `<li>${n}</li>`).join('')}<li>The lowest counted play is worth <b>${fmt(floor)} RP</b>. Any new play above that raises the total.</li></ul>
      </div>
      <div class="panel">
        <div class="sigs">
          ${sig('Main speed', primary[0] + '×', `${primary[1]} of ${of}`, `color:${SPEED[primary[0]]}`)}
          ${sig('Accuracy, 14 days', `<span class="${tone(accMove)}">${sgn(accMove, 2, ' pp')}</span>`, `${fmt(last.avgAccuracy, 2)}% average now`)}
          ${sig('Average play', fmt(avgRp) + ' RP', `across ${of}`)}
          ${sig('Full combos', fmt(top.filter(s => s.fc).length), `in ${of}`, 'color:var(--g-SS)')}
          ${sig('Maps / week', fmt(MPW, 1), `${fmt(last7)} played in the last 7 days`)}
          ${sig('Plays, 14 days', fmt(mo.plays || 0), `${fmt((mo.plays || 0) / Math.max(1, mo.days), 1)} a day`)}
        </div>
      </div>
      ${S.mode === 'normal' ? review() : ''}
      <div class="panel"><div class="panel-head"><h3>Speed mix <span>· top ${top.length}</span></h3></div>${mix(speeds, k => SPEED[k], spd, of)}${legend(speeds, k => SPEED[k], spd)}</div>
      <div class="panel"><div class="panel-head"><h3>Grades <span>· top ${top.length}</span></h3></div>${mix(grades, k => `var(--g-${k})`, grd, of)}${legend(grades, k => `var(--g-${k})`, grd)}</div>
    </div>
    <div class="best">${[['Best accuracy', bAcc, `<b>${fmt(bAcc.acc, 2)}%</b>`], ['Top RP play', bRp, `<b>${fmt(bRp.raw)} RP</b>`], ['Most notes', bNotes, `<b>${fmt(bNotes.beatmapNotes)}</b> notes`]].map(([l, s, v]) =>
      `<a class="bcard" href="/score/${encodeURIComponent(s.id)}" style="background-image:url('${esc(s.img || s.thumb)}')"><span class="bg"></span><span class="lab">${l}</span>
        <span class="txt"><strong title="${esc(s.beatmapTitle)}">${esc(s.beatmapTitle)}</strong><em class="num">${v} · ${s.speedKey}×</em></span></a>`).join('')}</div>`;
}
function statistics(anim) {
  const pane = S.mode !== 'normal' && S.stat === 'progress'
    ? `<div class="empty"><b>Daily history follows Lock mode</b>Open Rankings or Playstyle for ${MODES[S.mode].label}.</div>`
    : {progress, rankings, playstyle}[S.stat](anim);
  return `<div class="sec-head">
      <div><h2>Statistics</h2><p class="lede">Daily history kept by Reimagined for Rhythia, plus what the top 100 says about your play.</p></div>
      <div class="tabs seg" role="tablist" data-ink="stats">${STAT_TABS.map(([k, l]) =>
        `<button role="tab" type="button" aria-selected="${S.stat === k}" data-stat="${k}">${l}</button>`).join('')}</div>
    </div><div class="pane ${anim === 'pane' ? 'swap' : ''}">${pane}</div>`;
}

/* ── Scores ── */
const MOD_LABEL = {mirrorxy:'Mirror XY', mirrorx:'Mirror X', mirrory:'Mirror Y', mirrorxy:'Mirror XY', ghost:'Ghost', hardrock:'Hard Rock', nofail:'No Fail', suddendeath:'Sudden Death',
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
const modIcons = s => (s.mods || []).map(m => { const k = modKey(m), l = MOD_LABEL[k] || k; return `<img class="mod" src="${SITE}/mod${k}.png" alt="${esc(l)}" data-tip="<b>${esc(l)}</b><small>Mod</small>" data-fb="modtxt">`; }).join('');
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
  box.innerHTML = sug.items.map((o, i) => `<button type="button" role="option" data-suggest="${i}">${o.kind === 'Map' ? `<i style="background-image:url('${esc(o.s.thumb)}')"></i>` : `<i class="who">${ico('user')}</i>`}<span>${mark(o.v, q)}</span><small>${o.kind === 'Map' ? 'Map' : `Mapper · ${o.n} score${o.n > 1 ? 's' : ''}`}</small></button>`).join('');
}
function pickSuggestion(i) {
  const o = sug.items[Number(i)]; if (!o) return;
  S.q = o.v; S.page = 1; const q = $('#q'); q.value = o.v; $('#suggest').hidden = true;
  $('#score-body').innerHTML = scoreBody(true);
}

function row(s, kind, i) {
  const top = kind === 'top';
  return `<div class="row" style="--img:url('${esc(s.img || s.thumb)}');--i:${i}">
    <span class="pos num">${top ? s.pos : ''}</span>
    <span class="thumb" style="background-image:url('${esc(s.thumb)}')"></span>
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
  return `<article class="tile" style="--i:${i}"><div class="art" style="background-image:url('${esc(s.img || s.thumb)}')">${kind === 'top' ? `<span class="pos num">#${s.pos}</span>` : ''}<span class="grade" style="--c:var(--g-${s.grade})">${s.grade}</span><button class="iconbtn" type="button" aria-label="Score actions" aria-haspopup="menu" data-menu="${s.id}">${ico('more')}</button></div>
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
  const body = !shown.length ? `<div class="panel empty"><b>${total ? 'No scores match' : `No ${S.list === 'reign' ? 'reigning' : S.list} scores in ${m.label}`}</b>${total ? 'Clear the search or filters to see everything.' : ''}</div>`
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
  const speeds = [...new Set(lists[S.list].map(s => s.speedKey))].sort((a, b) => b - a);
  const mods = [...new Set(lists[S.list].flatMap(s => (s.mods || []).map(modKey)))].sort();
  const pins = pinnedScores();
  return `<div class="sec-head">
      <div><h2>${S.section === 'scores' ? 'All scores' : 'Scores'}</h2><p class="lede">${S.section === 'scores' ? 'Pinned, top, reigning and recent plays, with search and filters.'
        : `The top 100 count toward RP, each worth 3% less than the one above. <a class="lede-link" href="/player/${esc(U.id)}/scores">Open the scores page</a>`}</p></div>
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
  if (n < 2) return `<div class="panel empty"><b>No ${m.label} top plays yet</b>Ranked ${m.label} plays will be listed here.</div>`;
  const W = 1000, Hh = 230, T = 12, B = 12, peak = Math.max(...top.map(s => s.raw)) || 1, hi = peak * 1.06;
  const x = i => i * W / (n - 1), y = v => Hh - B - v / hi * (Hh - T - B);
  const path = k => top.map((s, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(s[k]).toFixed(1)}`).join('');
  const ticks = [0, Math.round(peak / 2), Math.round(peak)];
  const sumW = top.reduce((a, s) => a + s.weighted, 0) || 1, top10 = top.slice(0, 10).reduce((a, s) => a + s.weighted, 0), fcs = top.filter(s => s.fc).length, acc = top.reduce((a, s) => a + s.acc, 0) / n;
  const best = top[0], cw = W / n, id = 'rp' + Math.random().toString(36).slice(2, 7);
  return `<div class="sec-head"><div><h2>Top ${n}</h2><p class="lede">Each play counts 3% less than the one above it. Together they make the rhythm points.</p></div></div>
    <div class="kpis rp-kpis">
      ${kpi('', 'Top 10 share', `${fmt(top10 / sumW * 100, 1)}%`, 'of the weighted RP, from the best 10', {selectable: false})}
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

function achievements() {
  const got = new Set(U.achievements || []);
  return `<div class="container section reveal" style="margin-top:48px"><div class="sec-head"><div class="left"><h2>Achievements</h2></div><div class="right"><span class="cap num">${got.size} of ${D.achievements.length} unlocked</span></div></div>
    <div class="ach-grid">${D.achievements.map(a => `<div class="ach ${got.has(a.slug) ? '' : 'locked'}"><img src="${esc(a.image_url)}" alt="" loading="lazy"><div><strong>${esc(a.name)}</strong><small>${esc(a.description)}</small></div></div>`).join('')}</div></div>`;
}

/* ── Rendering: each part redraws on its own, so a click only moves what it changed ── */
// Redraws that nobody asked to animate (fresh data, map art) go through morph(): the elements stay,
// so entrance animations, chart drawing and pictures do not start again and the page does not jump.
// A click that should animate (a new tab, a new chart range) still draws fresh.
const morph = RhythiaX.ExodusKit.morph;
const put = (el, html, anim) => { if (anim) el.innerHTML = html; else morph(el, html); };
let soft = Boolean(ctx.quiet); // only the first paint of a quiet refresh morphs the whole body
function renderHero(first) {
  put($('#hero'), hero(), first);
  const h = $('#hero .hero');
  if (first) h.querySelectorAll('[data-count]').forEach(countUp);
  else { h.classList.add('settled'); h.querySelectorAll('[data-count]').forEach(el => delete el.dataset.count); }
  inks($('#hero'));
}
const renderAct = anim => { $('#activity').innerHTML = activity(anim); };
let endWanted = false;
const toEnd = () => { endWanted = true; inks(); }; // the title map scrolls to its end in the same pass as the underlines
// Map types start loading before the pane is drawn, so it opens on their progress, not on "could not be read".
function renderStats(anim) { const el = $('#stats'); if (!el) return; if (S.stat === 'playstyle') loadStyles(); put(el, statistics(anim), anim); inks(el); toEnd(); }
function renderScores(anim, keepFocus) {
  const el = $('#scores'); if (!el) return;
  if (keepFocus) { $('#score-body').innerHTML = scoreBody(false); return; }
  put(el, scores(anim), anim); inks(el);
}
const settleTitle = () => R.querySelector('#tmap .tmap')?.classList.add('settled');
function refreshIntro() { const el = $('#intro'); if (!el) return; el.classList.add('in'); morph.outer(el, intro()); settleTitle(); toEnd(); foldBio(); }
// A bio taller than the fold shows Show more; pictures in it can change that once they load.
function foldBio() {
  const w = $('.bio-wrap'); if (!w) return;
  const bio = w.querySelector('.bio'), long = S.bioOpen || bio.scrollHeight > bio.clientHeight + 4;
  w.classList.toggle('long', long); w.querySelector('.bio-more').hidden = !long;
}
const SCORES_ALL = () => [...Object.values(MODES).flatMap(m => [...m.top, ...m.recent, ...m.reign]), ...PIN_EXTRA.values()];
function renderBody() {
  let html;
  if (S.section === 'profile') html = intro() + `${STAT_TABS.length ? '<section class="container section reveal" id="stats" aria-label="Statistics"></section>' : ''}<section class="container section reveal" id="scores" aria-label="Scores"></section>`;
  else if (S.section === 'scores') html = `<section class="container section reveal" id="rp" aria-label="Top plays"></section><section class="container section reveal" id="scores" aria-label="Scores"></section>`;
  else if (S.section === 'achievements') html = achievements();
  else html = `<div class="container reveal"><div class="empty" style="padding:96px 0"><b>${S.section[0].toUpperCase() + S.section.slice(1)}</b>This tab is not part of Exodus yet.<div style="margin-top:14px"><button class="btn" type="button" data-native>Open it in Rhythia’s view</button></div></div></div>`;
  put($('#body'), html + '<div style="height:96px"></div>', !soft);
  renderStats(); renderRp(); renderScores();
  watch($('#body')); toEnd(); foldBio();
}
function renderRp() { const el = $('#rp'); if (el) put(el, rpChart()); }
// Profile and Scores are two addresses on Rhythia; the other tabs stay on the profile's.
function setSection(sec, push) {
  S.section = sec; S.page = 1; hideTip();
  renderHero(); renderBody();
  const path = `/player/${U.id}${sec === 'scores' ? '/scores' : ''}`;
  if (push && location.pathname.replace(/\/$/, '') !== path) ctx.go?.(path);
}

/* ── Actions on Rhythia (signed-in player) ── */
const aboutParts = () => {
  const raw = String(U.about_me || '');
  return {text: bioText(raw),
    links: socialLinks(raw)};
};
// setScorePinned answers with the full pin list, which becomes the truth here.
function applyPins(list) {
  keepPinned(list);
  S.pins = list.map(s => String(s.id));
  S.pinAt = Math.max(0, Math.min(S.pinAt, S.pins.length - 1));
  if (S.list === 'pinned' && !S.pins.length) S.list = 'top';
}
async function togglePin(id) {
  if (S.busy) return;
  const pinned = S.pins.includes(id);
  S.busy = true;
  try {
    const res = await ctx.actions.setPinned(id, !pinned);
    if (Array.isArray(res?.pinnedScores)) applyPins(res.pinnedScores);
    else { S.pins = pinned ? S.pins.filter(p => p !== id) : [id, ...S.pins]; S.pinAt = 0; }
    toast(pinned ? 'Unpinned from your profile.' : 'Pinned to your profile. Everyone visiting now sees it.');
  } catch (err) {
    toast(`Could not ${pinned ? 'unpin' : 'pin'} the score: ${err.message}`);
  } finally {
    S.busy = false;
  }
  if (!S.editing) refreshIntro();
  renderScores(false);
}
async function addFriend() {
  if (S.busy) return;
  if (!ctx.signedIn) return toast('Sign in to Rhythia to add friends.');
  S.busy = true; renderHero();
  try {
    await ctx.actions.addFriend(U.id);
    S.friend = 'added'; U.friend_count = (U.friend_count || 0) + 1;
    toast(`${U.username} is now on your friends list.`);
  } catch (err) {
    toast(`Could not add ${U.username}: ${err.message}`);
  } finally {
    S.busy = false;
  }
  renderHero();
}
// Bio and links are one about_me write; pins removed in the editor are unpinned one by one.
async function saveProfile(btn) {
  if (S.busy) return;
  const dr = S.draft, cur = aboutParts();
  const bio = dr.bio.trim(), links = dr.links.map(l => l.trim()).filter(Boolean).slice(0, 2);
  const bad = links.find(l => !/^https?:\/\/[^\s/]+\.[^\s]+$/i.test(l));
  if (bad) return toast(`“${bad}” is not a full link. Start it with https://`);
  const aboutChanged = bio !== cur.text || links.join('\n') !== cur.links.join('\n');
  const dropped = S.pins.filter(id => !dr.pins.includes(id));
  S.busy = true; btn.disabled = true; btn.textContent = 'Saving…';
  try {
    if (aboutChanged) {
      await ctx.actions.saveAbout(bio, links);
      U.about_me = RhythiaX.ExodusData.composeAboutMe(bio, links);
      S.bio = null; S.links = null;
    }
    for (const id of dropped) {
      const res = await ctx.actions.setPinned(id, false);
      if (Array.isArray(res?.pinnedScores)) applyPins(res.pinnedScores);
      else applyPins(SCORES_ALL().filter(s => S.pins.includes(String(s.id)) && String(s.id) !== id));
    }
    S.editing = false;
    toast(aboutChanged || dropped.length ? 'Profile saved on Rhythia.' : 'Nothing changed.');
  } catch (err) {
    toast(`Could not save: ${err.message}`);
    btn.disabled = false; btn.textContent = 'Save';
    return;
  } finally {
    S.busy = false;
  }
  refreshIntro(); renderScores(false);
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

/* ── Compare: pages/compare.js ── */
const compare = RhythiaX.ExodusCompare(R, {U, MODES, prepare, ico, esc, fmt, sgn, tone, REDUCED, SITE, hideTip, sig, me: ctx.signedIn});

/* ── Events ── */
function toggleFaq(force) {
  const old = $('#faq'), btn = $('.faq-btn'), open = force ?? !old;
  old?.remove(); btn?.setAttribute('aria-expanded', String(open && !!btn));
  if (open && btn) btn.closest('.panel').insertAdjacentHTML('beforeend', faq(momentum(), H.at(-1)));
}
R.addEventListener('click', e => {
  if (!e.target.closest('.menu,[data-menu]')) closeMenu();
  if ($('#faq') && !e.target.closest('#faq,[data-faq]')) toggleFaq(false);
  const t = e.target.closest('[data-section],[data-mode],[data-stat],[data-rev],[data-range],[data-metric],[data-rank-metric],[data-act],[data-gran],[data-step],[data-sel],[data-all-scores],[data-suggest],[data-tier],[data-pin],[data-pin-step],[data-pin-drop],[data-faq],[data-edit-bio],[data-bio],[data-list],[data-view],[data-page],[data-menu],[data-toast],[data-compare],[data-friend],[data-friends],[data-native],[data-settings],[data-item-add],[data-item-drop],[data-pick-close],[data-pick-kind],[data-pick-mine],[data-pick-item],[data-pick-page],[data-bio-more]');
  if (!t || t.disabled) return;
  const d = t.dataset;
  if (d.toast) { closeMenu(); return toast(d.toast); }
  if (t.hasAttribute('data-compare')) { closeMenu(); return compare.open(); }
  if (d.menu) return openMenu(t, d.menu);
  if (d.section) { if (S.section === d.section) return; return setSection(d.section, true); }
  if (d.mode) { if (S.mode === d.mode) return; S.mode = d.mode; S.page = 1; S.speed = ''; renderHero(); renderStats('pane'); renderRp(); return renderScores(true); }
  if (d.stat) { if (S.stat === d.stat) return; S.stat = d.stat; return renderStats('pane'); }
  if (d.rev) {
    const i = MONTHS.indexOf(S.rev) + Number(d.rev); if (!MONTHS[i]) return;
    S.rev = MONTHS[i]; morph.outer($('#mrev'), review());
    // The same nodes are kept (focus stays on the arrow), so the month's entrance is replayed by hand.
    if (!REDUCED) $('#mrev').querySelectorAll('.mbody,.mcols,.stack').forEach(el => { el.style.animation = 'none'; el.offsetWidth; el.style.animation = ''; });
    return;
  }
  if (d.range) { S.range = Number(d.range); return renderStats('chart'); }
  if (d.metric) { S.metric = d.metric; return renderStats('chart'); }
  if (d.rankMetric) { S.rankMetric = d.rankMetric; return renderStats('chart'); }
  if (d.act) { S.act = d.act; return renderAct(); }
  if (d.gran) { if (S.gran === d.gran) return; S.gran = d.gran; S.cur = S.selDate.slice(0, 7); S.allScores = false; return renderAct(true); }
  if (d.step) { const n = Number(d.step); if (S.gran === 'month') S.cur = `${Number(S.cur.slice(0, 4)) + n}${S.cur.slice(4)}`; else for (let k = 0; k < (S.gran === 'week' ? 3 : 1); k++) S.cur = n > 0 ? nextMonth(S.cur) : prevMonth(S.cur); return renderAct(true); }
  if (d.sel) {
    const p = period(S.gran, d.sel), ds = DAYS.filter(x => x.date >= p.from && x.date < p.to);
    S.selDate = S.gran === 'day' ? d.sel : ([...ds].reverse().find(x => x.plays) || ds.at(-1) || {date: p.from}).date; S.allScores = false;
    R.querySelectorAll('.cal [aria-pressed="true"]').forEach(x => x.setAttribute('aria-pressed', 'false')); t.setAttribute('aria-pressed', 'true');
    const box = $('#day'); box.innerHTML = detail(); box.classList.remove('fadein'); box.offsetWidth; box.classList.add('fadein'); return;
  }
  if (t.hasAttribute('data-all-scores')) { S.allScores = !S.allScores; $('#day').innerHTML = detail(); return; }
  if (d.suggest !== undefined) return pickSuggestion(d.suggest);
  if (d.tier !== undefined) { const k = Number(d.tier); S.tier = S.tier === k ? null : k; hideTip(); const box = $('#tmap'); box.innerHTML = titleMap(); box.firstElementChild.classList.add('settled'); return; }
  if (t.hasAttribute('data-native')) return ctx.showNative();
  if (t.hasAttribute('data-friend')) return addFriend();
  if (t.hasAttribute('data-friends')) return openFriends();
  if (t.hasAttribute('data-settings')) { if (!ctx.openSettings()) toast('Rhythia’s settings are not ready yet. Try again in a moment.'); return; }
  if (t.hasAttribute('data-item-add')) { picker.q = ''; picker.page = 1; return openPicker(); }
  if (d.itemDrop !== undefined) { const next = S.items.filter((_, i) => i !== Number(d.itemDrop)); return saveShowcase(next, () => toast('Removed from your showcase.')); }
  if (t.hasAttribute('data-pick-close')) return $('#pick').close();
  if (d.pickKind) { picker.kind = d.pickKind; picker.page = 1; return openPicker(); }
  if (d.pickMine) { picker.mine = d.pickMine === '1'; picker.page = 1; return openPicker(); }
  if (d.pickPage) { picker.page = Number(d.pickPage); return runPicker(); }
  if (d.pickItem !== undefined) {
    const it = picker.res?.items[Number(d.pickItem)]; if (!it) return;
    return saveShowcase([...S.items, it].slice(0, SHOWCASE_MAX), () => { $('#pick').close(); toast(`${it.title} is now in your showcase.`); });
  }
  if (d.pin) { closeMenu(); return togglePin(String(d.pin)); }
  if (d.pinStep) { const n = pinnedScores().length; S.pinAt = (S.pinAt + Number(d.pinStep) + n) % n; return refreshIntro(); }
  if (t.hasAttribute('data-faq')) { toggleFaq(); return; }
  if (t.hasAttribute('data-bio-more')) { S.bioOpen = !S.bioOpen; const w = $('.bio-wrap'); w.classList.toggle('open', S.bioOpen); t.textContent = S.bioOpen ? 'Show less' : 'Show more'; if (!S.bioOpen) w.scrollIntoView({block: 'nearest', behavior: REDUCED ? 'auto' : 'smooth'}); return; }
  if (t.hasAttribute('data-edit-bio')) {
    if (!S.editing) {
      const raw = String(U.about_me || ''), text = bioText(raw);
      S.draft = {bio: S.bio ?? text, links: [...(S.links ?? socialLinks(raw))], pins: [...S.pins]};
      S.editing = true; refreshIntro();
    }
    const box = $('#intro'); if (!t.closest('#intro')) scrollTo({top: box.getBoundingClientRect().top + scrollY - 76, behavior: REDUCED ? 'auto' : 'smooth'});
    const ta = $('#bio-input'); ta.focus({preventScroll: true}); ta.setSelectionRange(ta.value.length, ta.value.length); return;
  }
  if (d.pinDrop !== undefined) { S.draft.pins.splice(Number(d.pinDrop), 1); return refreshEdPins(); }
  if (d.bio) {
    if (d.bio === 'save') return saveProfile(t);
    S.editing = false; refreshIntro(); return renderScores(false);
  }
  if (d.list) { if (S.list === d.list) return; S.list = d.list; S.page = 1; S.speed = ''; return renderScores(true); }
  if (d.view) { S.view = d.view; S.page = 1; return renderScores(true); }
  if (d.page) { S.page = Number(d.page); $('#score-body').innerHTML = scoreBody(true); const el = $('#scores'); scrollTo({top: el.getBoundingClientRect().top + scrollY - 72, behavior: REDUCED ? 'auto' : 'smooth'}); }
}, sig);
R.addEventListener('input', e => {
  if (e.target.id === 'bio-input') { S.draft.bio = e.target.value; $('#bio-count').textContent = `${fmt(e.target.value.length)} / 10,000`; }
  if (/^link-[01]$/.test(e.target.id)) S.draft.links[Number(e.target.id.slice(5))] = e.target.value;
  if (e.target.id === 'q') { S.q = e.target.value; S.page = 1; renderScores(false, true); suggest(e.target.value); }
  if (e.target.id === 'pick-q') { clearTimeout(picker.timer); picker.q = e.target.value; picker.page = 1; picker.timer = setTimeout(runPicker, 250); }
}, sig);
R.addEventListener('change', e => {
  if (e.target.id === 'speed') { S.speed = e.target.value; S.page = 1; $('#score-body').innerHTML = scoreBody(true); }
  if (e.target.id === 'mod') { S.mod = e.target.value; S.page = 1; $('#score-body').innerHTML = scoreBody(true); }
  if (e.target.id === 'grade') { S.grade = e.target.value; S.page = 1; $('#score-body').innerHTML = scoreBody(true); }
  if (e.target.id === 'pick-skin') { picker.skinType = e.target.value; picker.page = 1; runPicker(); }
}, sig);
document.addEventListener('keydown', e => {
  if (!host.isConnected) return;
  const tgt = e.composedPath()[0] || e.target;
  if (tgt.closest?.('.tmap .node') && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); tgt.closest('.node').dispatchEvent(new MouseEvent('click', {bubbles: true})); return; }
  if (tgt.id === 'q' && !$('#suggest').hidden) {
    const btns = [...R.querySelectorAll('#suggest button')];
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); sug.i = (sug.i + (e.key === 'ArrowDown' ? 1 : -1) + btns.length) % btns.length; btns.forEach((b, i) => b.classList.toggle('on', i === sug.i)); return; }
    if (e.key === 'Enter' && sug.i >= 0) { e.preventDefault(); return pickSuggestion(sug.i); }
    if (e.key === 'Escape') { $('#suggest').hidden = true; return; }
  }
  if (e.key === 'Escape') { closeMenu(); if ($('#faq')) toggleFaq(false); }
  if (e.key === '/' && !/INPUT|SELECT/.test(R.activeElement?.tagName)) { const q = $('#q'); if (q) { e.preventDefault(); q.focus(); } }
}, sig);
addEventListener('resize', () => inks(), sig);
R.addEventListener('error', e => {
  const img = e.target;
  if (img?.tagName !== 'IMG' || !img.dataset.fb) return;
  const el = document.createElement(img.dataset.fb === 'modtxt' ? 'span' : 'b');
  if (img.dataset.fb === 'modtxt') el.className = 'modtxt';
  el.textContent = img.alt; img.replaceWith(el);
}, {capture: true, signal: ac.signal});
R.addEventListener('mousedown', e => { if (e.target.closest('#suggest')) e.preventDefault(); }, sig);
R.addEventListener('load', e => { if (e.target?.closest?.('.bio')) foldBio(); }, {capture: true, signal: ac.signal});
addEventListener('resize', foldBio, sig);
R.addEventListener('focusout', e => { if (e.target.id === 'q') setTimeout(() => { const b = $('#suggest'); if (b && R.activeElement?.id !== 'q') b.hidden = true; }, 120); }, sig);
R.addEventListener('focusin', e => { if (e.target.id === 'q' && e.target.value) suggest(e.target.value); }, sig);
renderHero(!ctx.quiet); renderBody(); soft = false;
if (!ctx.quiet) $('#hero .hero')?.classList.add('enter');
return {
  state: () => Object.fromEntries(VIEW_KEYS.map(k => [k, S[k]])),
  // Safe to swap in fresh data only while nothing is open or half-done.
  idle: () => !S.editing && !S.busy && !R.querySelector('dialog[open], .menu, #faq') && !R.activeElement?.matches?.('input, textarea, select'),
  relayout: () => inks(),
  // The address moved between the profile and its scores page: switch in place, no reload.
  page(p) { const sec = p === 'scores' ? 'scores' : S.section === 'scores' ? 'profile' : S.section; if (sec !== S.section) setSection(sec, false); },
  // Map art that arrived after the first paint: fill it into every score and redraw quietly.
  updateMeta(meta) {
    D.meta = {...D.meta, ...meta};
    for (const s of SCORES_ALL()) {
      const m = meta[s.songId];
      if (m) Object.assign(s, {img: m.img || '', thumb: m.thumb || m.img || '', mapper: m.mapper || '', stars: m.stars || 0});
    }
    if (!S.editing) refreshIntro();
    if (!R.querySelector('#stats .faq')) renderStats();
    if (!R.activeElement?.closest?.('#scores')) renderScores(false);
  },
  destroy() {
    ac.abort(); io?.disconnect(); closeMenu(); hideTip();
    R.querySelectorAll('dialog[open]').forEach(dl => dl.close());
  },
};
};

// The profile's own styles (the base comes from core/assets.js, the approved mockup).
RhythiaX.ExodusApp.css = `
.loading .hero-main{min-height:150px}
@keyframes exoEnter{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
@keyframes exoFade{from{opacity:0}to{opacity:1}}
.hero.enter .banner{animation:exoFade .7s ease both}
.hero.enter .hero-main{animation:exoEnter .55s var(--ease) both}
.hero.enter .strip{animation:exoEnter .55s var(--ease) .07s both}
.hero.enter .hero-bar{animation:exoEnter .55s var(--ease) .14s both}
.loading .skeleton{animation-duration:1.4s}
@media (min-width:1001px){.intro{grid-template-columns:minmax(0,1fr) minmax(0,1fr)}}
.intro.solo{grid-template-columns:minmax(0,1fr)}
.bio{font-size:16px;line-height:1.7;max-width:68ch}
.rtags{display:flex;flex-wrap:wrap;gap:6px;margin:12px 0 2px}
.rtag{display:inline-flex;align-items:center;gap:6px;height:26px;padding:0 10px 0 8px;border-radius:8px;font:650 12.5px/1 var(--font);letter-spacing:0;color:var(--c);background:rgba(var(--glass),.78);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--c) 40%,transparent);backdrop-filter:blur(6px);text-shadow:none;transition:background-color .15s,transform .2s var(--ease)}
.rtag:hover{transform:translateY(-1px);background:color-mix(in srgb,var(--c) 16%,rgba(var(--glass),.9))}
.rtag svg,.rtag img,.rtag .mask{width:15px;height:15px;flex:none;object-fit:contain}
.rtag .mask{display:block;background:currentColor;-webkit-mask:var(--m) no-repeat center/contain;mask:var(--m) no-repeat center/contain}
.rtag.sup{color:#f9a8d4}
[data-theme="white"] .rtag{background:#fff;color:color-mix(in srgb,var(--c) 78%,#0f172a)}
[data-theme="white"] .rtag.sup{color:#db2777}
.items{margin:0 0 22px}
.items-head{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:10px;font-size:13px;font-weight:600;color:var(--muted)}
.items-row{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px}
.item{position:relative;display:flex;flex-direction:column;gap:2px;min-width:0;padding:0;border:0;background:none;text-align:left;color:inherit;font:inherit;cursor:pointer}
.item > a{display:flex;flex-direction:column;gap:2px;min-width:0}
.item .pv{display:grid;place-items:center;aspect-ratio:1;border-radius:10px;background:var(--panel-3) center/cover;box-shadow:inset 0 0 0 1px var(--line);transition:transform .2s var(--ease)}
.item:hover .pv{transform:translateY(-2px)}
.item .pv.none{color:var(--muted);font-size:26px}
.item .pv.none .ico{width:26px;height:26px}
.item .pv.cs{background:#08090b;padding:16%}
.item .pv.cs > span{display:grid;width:100%;gap:1px}
.item .it{margin-top:5px;font-size:12.5px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.item small{font-size:11.5px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.item.add .pv{background:none;box-shadow:none;outline:1.5px dashed var(--line-2);outline-offset:-1.5px}
.item.add:hover .pv{outline-color:var(--accent);color:var(--accent)}
.item-x{position:absolute;top:6px;right:6px;width:26px;height:26px;opacity:0;background:rgba(var(--glass),.88);transition:opacity .15s}
.item:hover .item-x,.item-x:focus-visible{opacity:1}
@media (hover:none){.item-x{opacity:1}}
.pick-body{display:flex;flex-direction:column;gap:12px}
.pick-bar{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.pick-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(128px,1fr));gap:14px;max-height:52vh;overflow:auto;padding:2px}
.pick-grid .item[disabled]{opacity:.4;cursor:default}
@media (max-width:640px){.items-row{grid-template-columns:repeat(3,minmax(0,1fr))}}
.avatar.sup{border:3px solid transparent;background-origin:padding-box,border-box;background-clip:padding-box,border-box;background-size:cover,cover;background-position:center,center}
.sup-heart{position:absolute;left:-8px;bottom:-8px;display:grid;place-items:center;width:30px;height:30px;border-radius:50%;background:#2a0f22;box-shadow:0 0 0 3px var(--page),inset 0 0 0 1.5px #f472b6;transition:transform .2s var(--ease)}
.sup-heart:hover{transform:scale(1.08)}
.sup-heart img{width:17px;height:auto}
[data-theme="white"] .sup-heart{background:#fff}
.item.locked .pv img{width:28px;opacity:.85}
.item.locked .pv{outline-color:color-mix(in srgb,#f472b6 45%,transparent)}
.who-row .who-l{display:flex;align-items:center;gap:10px;min-width:0}
.who-row .av{flex:none;width:30px;height:30px;border-radius:50%;background:var(--panel-3) center/cover}
.who-row .flg{width:16px;vertical-align:-2px;margin-left:4px;border-radius:2px}
.try{padding:18px 2px 4px}
.try-h{margin:0 0 10px;font-size:14px;font-weight:650;color:var(--text-2)}
.try-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:10px}
.try-card{display:flex;align-items:center;gap:12px;min-width:0;padding:12px 14px;border:0;border-radius:14px;background:var(--panel-2);box-shadow:inset 0 0 0 1px var(--line);color:var(--text);text-align:left;transition:background-color .15s,box-shadow .15s,transform .2s var(--ease)}
.try-card:not(.is-load):hover{background:var(--panel-3);box-shadow:inset 0 0 0 1px var(--line-2);transform:translateY(-2px)}
.try-card:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.try-card .av{flex:none;width:44px;height:44px;border-radius:50%;background:var(--panel-3) center/cover;box-shadow:0 0 0 2px var(--line-2)}
.try-who{display:flex;flex-direction:column;min-width:0;flex:1}
.try-who b{display:flex;align-items:center;gap:6px;font-size:15px;font-weight:650;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.try-who .flg{width:16px;border-radius:2px;flex:none}
.try-who small{margin-top:3px;font-size:13px;color:var(--text-2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.try-who small span{color:var(--muted)}
.try-tag{flex:none;align-self:flex-start;padding:3px 8px;border-radius:999px;font-style:normal;font-size:12px;font-weight:650;color:var(--accent-2);background:color-mix(in srgb,var(--accent) 14%,transparent)}
@media (prefers-reduced-motion:reduce){.try-card{transition:none}.try-card:not(.is-load):hover{transform:none}}
@media (prefers-reduced-motion:reduce){.hero.enter .banner,.hero.enter .hero-main,.hero.enter .strip,.hero.enter .hero-bar{animation:none}}
.bio.md{white-space:normal}
.lede-link{color:var(--accent-2);font-weight:600;margin-left:4px;white-space:nowrap}
.lede-link:hover{text-decoration:underline;text-underline-offset:2px}
.rp-kpis{margin-bottom:12px}
#rp.section{margin-top:40px;padding-top:0;border-top:0}
#rp.section::before{display:none}
.rp-kpis .kpi > span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rpc .ln.w{stroke:var(--text-2);stroke-width:1.8;stroke-dasharray:5 4}
.rpc .hit{fill:transparent}
.rpc .hit:hover{fill:color-mix(in srgb,var(--accent) 12%,transparent)}
.rp-key{display:flex;gap:16px;font-size:13px;font-weight:600;color:var(--text-2)}
.rp-key span::before{content:"";display:inline-block;width:14px;height:0;margin-right:7px;vertical-align:middle;border-top:2.4px solid var(--accent)}
.rp-key .w::before{border-top:1.8px dashed var(--text-2)}
.md-l{display:block;min-height:1em}
.md-gap{min-height:.75em}
.md-li{position:relative;padding-left:calc(18px + var(--ind) * 18px)}
.md-li::before{content:"";position:absolute;left:calc(var(--ind) * 18px + 5px);top:.78em;width:5px;height:5px;border-radius:50%;background:var(--muted)}
.md-q{padding-left:12px;box-shadow:inset 2px 0 0 var(--line-2);color:var(--text-2)}
.bio code{font:500 .88em ui-monospace,Consolas,monospace;padding:1px 5px;border-radius:5px;background:var(--panel-3)}
.md-h1{font-size:1.35em;font-weight:750;line-height:1.3;margin:.15em 0 .2em}
.md-h2{font-size:1.18em;font-weight:700;margin:.1em 0 .15em}
.md-h3{font-weight:700;margin-top:.1em}
.md-img{display:block;max-width:100%;max-height:260px;margin:10px 0;border-radius:12px}
.bio a{color:var(--accent-2);text-decoration:underline;text-underline-offset:2px}
.hero-main{grid-template-columns:120px minmax(0,1fr) auto}
.name-row{display:flex;align-items:center;gap:12px 16px;flex-wrap:wrap}
.btn.mini{height:32px;padding:0 12px;gap:6px;font-size:13px}
.btn.mini .ico{width:15px;height:15px}
.rtags{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin:12px 0 2px}
.rtag{height:28px}
.rtag.ev{justify-content:center;width:34px;padding:0;color:var(--text-2)}
.rtag.ev img,.rtag.ev svg{width:20px;height:20px}
.rtag.sup{background:linear-gradient(110deg,rgba(244,114,182,.16) 35%,rgba(255,255,255,.2) 50%,rgba(244,114,182,.16) 65%) 0 0/260% 100%,rgba(var(--glass),.78);animation:supShine 5s ease-in-out infinite}
@keyframes supShine{0%,55%{background-position:100% 0,0 0}100%{background-position:-60% 0,0 0}}
.ranks-wrap{display:flex;flex-direction:column;align-items:stretch;gap:10px}
.ranks-head{display:flex;align-items:center;justify-content:flex-end;gap:8px}
.pills.mini{height:32px;padding:2px;align-items:stretch}
.pills.mini button{height:auto;padding:0 10px;font-size:13px}
.pills.mini img{height:14px}
.hero .ranks-head .pills,.hero .ranks-head .btn:not(.primary){background:rgba(var(--glass),.82);box-shadow:inset 0 0 0 1px var(--line-2),0 6px 20px rgba(0,0,0,calc(.28 * var(--sh)));-webkit-backdrop-filter:blur(14px) saturate(1.4);backdrop-filter:blur(14px) saturate(1.4)}
.hero .ranks-head .btn:not(.primary):hover{background:rgba(var(--glass),.95)}
.hero .ranks-head .pills button{color:var(--text-2)}
.hero .ranks-head .pills button:hover,.hero .ranks-head .pills button[aria-pressed="true"]{color:var(--text)}
.hero .ranks-head .pills button[aria-pressed="true"]{background:var(--panel-3)}
.hero .ranks-head .pills img{opacity:.9}
.friends-btn{display:inline-flex;align-items:center;gap:7px;padding:0;border:0;background:none;color:inherit;font:inherit;text-shadow:inherit;cursor:pointer;border-radius:6px}
.friends-btn:hover{color:var(--text);text-decoration:underline;text-underline-offset:3px}
.friends-btn:focus-visible{outline:2px solid var(--accent);outline-offset:3px}
#pick.fr-dlg{width:min(520px,calc(100vw - 32px))}
.fr-list{display:flex;flex-direction:column;gap:2px}
.fr-sum{display:flex;align-items:center;gap:8px;margin:0 0 10px;font-size:14px;color:var(--text-2)}
.fr-row{display:flex;align-items:center;gap:12px;padding:8px 10px;border-radius:12px;color:var(--text);transition:background-color .15s}
a.fr-row:hover{background:var(--panel-2)}
.fr-row .av{position:relative;flex:none;width:36px;height:36px;border-radius:50%;background:var(--panel-3) center/cover}
.fr-row .av .fr-dot{position:absolute;right:-1px;bottom:-1px;box-shadow:0 0 0 2.5px var(--dialog)}
.fr-name{flex:1;min-width:0;display:flex;align-items:center;gap:6px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.fr-name .flg{width:16px;border-radius:2px}
.fr-row.on .cap{color:var(--good)}
.fr-dot{display:inline-block;width:9px;height:9px;border-radius:50%;background:var(--good)}
.strip{grid-template-columns:repeat(6,minmax(0,1fr))}
.strip > div{padding:0 20px}
.hero-bar{min-height:49px}
.avatar.sup{background-size:cover,220% 220%;animation:supRing 5s ease-in-out infinite alternate}
/* A settled hero stops its entrance animations, but a supporter's ring and floating hearts keep going. */
.hero.settled .avatar.sup{animation:supRing 5s ease-in-out infinite alternate!important}
.hero.settled .pf{animation:pfUp var(--d) linear var(--w) infinite!important}
@keyframes supRing{from{background-position:center,0% 0%}to{background-position:center,100% 100%}}
.pfs{position:absolute;left:0;right:0;top:0;height:300px;overflow:hidden;pointer-events:none;-webkit-mask:linear-gradient(transparent,#000 30%,#000 70%,transparent);mask:linear-gradient(transparent,#000 30%,#000 70%,transparent)}
.pf{position:absolute;bottom:-20px;left:var(--x);width:13px;height:13px;opacity:0;scale:var(--s);animation:pfUp var(--d) linear var(--w) infinite}
.pf.q{border:2px solid rgba(240,190,255,.45);border-radius:4px}
.pf.h{background:rgba(240,190,255,.45);-webkit-mask:var(--heart) center/contain no-repeat;mask:var(--heart) center/contain no-repeat}
.pfs{--heart:url('data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="3"%3E%3Cpath d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/%3E%3C/svg%3E')}
@keyframes pfUp{0%{opacity:0;transform:translateY(0) rotate(0)}15%{opacity:.7}75%{opacity:.4}100%{opacity:0;transform:translateY(-320px) rotate(40deg)}}
.intro{align-items:start}
.spill .sp-main{display:flex;flex-direction:column;gap:1px;line-height:1.2}
.spill .sp-main b small{font-size:11.5px;font-weight:650;color:inherit;opacity:.7}
.intro.has-more .bio-wrap{margin-bottom:0}
.intro-more{grid-column:1/-1;display:grid!important;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:0 36px;align-items:end}
.intro-more > :only-child{grid-column:1/-1}
.intro-more .items{margin:0}
.intro-more .showcase{margin-top:0}
[data-variant="lines"] .intro.has-more{align-items:stretch}
[data-variant="lines"] .intro.has-more > .panel:nth-child(2){padding-right:0;border-left:1px solid var(--rule)}
[data-variant="lines"] .intro.has-more > .intro-more{padding:24px 0 30px;border-left:0;border-top:1px solid var(--rule)}
@media (max-width:1000px){.intro-more{grid-template-columns:minmax(0,1fr);gap:20px}
  [data-variant="lines"] .intro.has-more > .panel:nth-child(2){padding:24px 0;border-left:0;border-top:1px solid var(--rule)}}
.bio-wrap{position:relative;margin-bottom:24px}
.bio-wrap .bio{margin-bottom:0}
.bio-wrap:not(.open) .bio{max-height:320px;overflow:hidden}
.bio-wrap.long:not(.open) .bio{-webkit-mask:linear-gradient(#000 72%,transparent);mask:linear-gradient(#000 72%,transparent)}
.bio-more{margin-top:8px;font-size:13.5px;font-weight:650}
.section{margin-top:56px;padding-top:32px;border-top:1px solid var(--line-2)}
.sec-head h2{font-size:24px}
.sec-head{margin-bottom:18px}
.kpis{gap:10px}
.kpi{padding:12px 16px 14px;border-radius:14px}
.kpi small{font-size:12.5px}
.kpi strong{font-size:22px;margin-top:4px}
.kpi > span{font-size:12.5px}
.chart{height:170px}
.chart-panel{padding:18px 20px}
.mods{height:30px}
.mc img{width:22px;height:22px}
.spdc{font-size:12px}
@media (max-width:1000px){.hero-main{grid-template-columns:minmax(0,1fr)}.ranks-head{justify-content:flex-start}.strip{grid-template-columns:repeat(3,minmax(0,1fr))}}
@media (max-width:640px){.strip{grid-template-columns:repeat(2,minmax(0,1fr))}.ranks-head{flex-wrap:wrap}.ranks-head .pills{flex:1}.ranks-head .pills button{flex:1;justify-content:center}}
@media (prefers-reduced-motion:reduce){.avatar.sup,.rtag.sup,.hero.settled .avatar.sup,.hero.settled .pf{animation:none!important}}
/* Playstyle: bars draw left to right as one piece; Month in review */
.exo{--k-stream:#38bdf8;--k-jump:#f59e0b;--k-varied:#a78bfa;--k-quantum:#34d399}
.exo[data-theme="white"]{--k-stream:#0284c7;--k-jump:#d97706;--k-varied:#7c3aed;--k-quantum:#059669}
.reveal.in .stack i{animation:none}
.reveal.in .stack,.reveal.in .mcols{animation:sweep .9s var(--ease) both}
@keyframes sweep{from{clip-path:inset(0 100% 0 0)}to{clip-path:inset(0 0 0 0)}}
.ps .wide{grid-column:1/-1}
.mfig{display:flex;flex-wrap:wrap;gap:10px 36px;margin:0 0 22px}
.mfig small{display:block;font-size:12.5px;color:var(--muted);font-weight:550}
.mfig b{display:block;font-size:20px;font-weight:750;letter-spacing:-.01em}
.mbody{display:grid;grid-template-columns:minmax(0,1.25fr) minmax(0,1fr);gap:0 36px;animation:fade .25s ease both}
.mbody > div + div{border-left:1px solid var(--line);padding-left:36px}
.mbody .notes{margin-top:18px}
.mbody .cap{margin:14px 0 0}
.mcols,.mlab,.mbrks{display:grid;grid-template-columns:repeat(var(--n),minmax(0,1fr));column-gap:3px}
.mcols{height:96px;align-items:end}
.mcol{height:100%;display:flex;align-items:flex-end}
.mcol i{display:block;width:100%;height:max(3px,calc(var(--h) * 1%));border-radius:3px 3px 2px 2px;background:var(--accent);transition:filter .15s}
.mcol.zero i{height:3px;background:rgba(var(--ink),.18)}
.mcol.off i{height:3px;background:repeating-linear-gradient(90deg,rgba(var(--ink),.18) 0 2px,transparent 2px 4px)}
.mcol:hover i{filter:brightness(1.25)}
.mlab{margin-top:6px;font-size:11.5px;color:var(--muted)}
.mday{grid-row:1;white-space:nowrap}
.mbrks{margin-top:4px}
.mbrk{grid-row:1;border-top:2px dashed rgba(var(--ink),.32);padding-top:3px;text-align:center;font-size:12px;color:var(--text-2);white-space:nowrap}
.mbrk b{font-weight:650}
#mtypes h4{margin:0 0 12px;font-size:15px;font-weight:650}
#mtypes h4 .cap{font-weight:500}
#mtypes .stack{margin:4px 0 16px}
.mt-rows{display:grid;grid-template-columns:minmax(0,1fr) auto auto auto;gap:9px 22px;align-items:baseline;font-size:14px}
.mt-rows .h{font-size:12px;color:var(--muted);font-weight:550}
.mt-rows .h:not(:first-child),.mt-rows em{text-align:right}
.mt-rows .k{display:inline-flex;align-items:center;gap:8px;font-weight:650;justify-self:start}
.mt-rows .k::before{content:"";width:10px;height:10px;border-radius:3px;background:var(--c)}
.mt-rows em{font-style:normal;color:var(--text-2)}
#mtypes .notes{margin-top:16px}
.mt-load{display:flex;flex-direction:column;gap:9px;font-size:14px;color:var(--text-2);margin-top:4px}
.mt-load i{display:block;height:6px;border-radius:999px;background:rgba(var(--ink),.08);position:relative;overflow:hidden}
.mt-load i::after{content:"";position:absolute;inset:0 auto 0 0;width:var(--p);background:var(--accent);border-radius:inherit;transition:width .3s var(--ease)}
@media (max-width:1000px){
  .mbody{grid-template-columns:1fr;gap:22px}
  .mbody > div + div{border-left:0;padding-left:0;border-top:1px solid var(--line);padding-top:20px}
  .mfig{gap:10px 24px}
  .mfig b{font-size:17px}
}
/* Lines tells left and right panels apart by position; Month in review spans both, so the two after it swap back. */
@media (min-width:1001px){
  [data-variant="lines"] .ps > .wide{padding:26px 0 28px;border-left:0}
  [data-variant="lines"] .ps > .wide + .panel{padding:26px 32px 28px 0;border-left:0}
  [data-variant="lines"] .ps > .wide + .panel + .panel{padding:26px 0 28px 32px;border-left:1px solid var(--rule)}
}
@media (prefers-reduced-motion:reduce){.reveal.in .stack,.reveal.in .mcols,.mbody{animation:none}}
`;
