// =============================================
// Reimagined for Rhythia — Exodus profile view
// =============================================
// Renders one player into the Exodus shell (a shadow root) and returns a handle
// to tear it down on navigation. This file holds the data, the view state (S), the rendering and the
// events; the markup of each area comes from a part file made at mount (pages/profile-hero.js,
// profile-stats.js, profile-playstyle.js and profile-scores.js, see "The parts" below).

var RhythiaX = RhythiaX || {};

RhythiaX.ExodusApp = function mountExodusProfile(host, D, ctx) {
'use strict';
const R = host.shadowRoot;
const ICONS = RhythiaX.ExodusAssets.titleIcons;
const ac = new AbortController(), sig = {signal: ac.signal};
const U = D.profile;
// The helpers every Exodus view shares (core/kit.js).
const {SITE, esc, fmt, REDUCED, TITLES} = RhythiaX.ExodusKit;
const COUNTRY = (() => { try { return new Intl.DisplayNames(['en'], {type: 'region'}).of(U.flag) || U.flag; } catch (e) { return U.flag; } })();
const $ = s => R.querySelector(s);
// A complete url("…") token, safe inside a style attribute (core/kit.js).
const cssUrl = x => RhythiaX.ExodusKit.cssUrl(x);
const sgn = (n, d = 0, u = '') => n > 0 ? `+${fmt(n, d)}${u}` : n < 0 ? `−${fmt(-n, d)}${u}` : '±0' + u;
const tone = n => n > 0 ? 'up' : n < 0 ? 'down' : 'flat';
const ico = id => `<svg class="ico" aria-hidden="true"><use href="#i-${id}"/></svg>`;
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
// Grade letters in their order, from the one grade rule both looks share (shared/grades.js).
const GRADES = RhythiaX.Grades.ORDER;

/* ── Data (same rules as the extension) ── */
function prepare(list, weighted) {
  return (list || []).map((s, i) => {
    const notes = s.beatmapNotes || 0, acc = notes ? (notes - s.misses) / notes * 100 : 0;
    const grade = RhythiaX.Grades.of({letter: s.grade, accuracy: acc, misses: s.misses, failed: s.passed === false});
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
// Map art for Spin and VR is asked for only once that mode is opened (core/data.js loads Lock's at once).
const metaAsked = new Set(['normal']);
function wantMeta(mode) {
  if (metaAsked.has(mode) || !ctx.moreMeta || !MODES[mode]) return;
  metaAsked.add(mode);
  const ids = [...MODES[mode].top, ...MODES[mode].recent].filter(s => !s.img).map(s => s.songId);
  if (ids.length) ctx.moreMeta(ids).then(meta => { if (!ac.signal.aborted && meta && Object.keys(meta).length) updateMeta(meta); }, () => {});
}
// Pinned scores can be older than every list above, so Rhythia's pin list is kept as well.
const PIN_EXTRA = new Map();
const keepPinned = list => prepare(list).forEach(s => PIN_EXTRA.set(String(s.id), s));
keepPinned(D.pinned);
// Daily community history (Lock). A day stored as 0/null carries the previous value. It can arrive after the
// first paint (updateHistory), so everything worked out from it is set again then.
function fillHistory(list) {
  const H = list.map(d => ({...d}));
  for (const k of ['skillPoints','globalRank','countryRank','playCount','squaresHit','avgAccuracy']) {
    H.forEach((d, i) => { if (!d[k] && i) d[k] = H[i - 1][k]; });
    const first = H.find(d => d[k])?.[k];
    if (first) for (const d of H) { if (d[k]) break; d[k] = first; }
  }
  return H;
}
const daysOf = H => H.slice(1).map((d, i) => ({date: d.date, plays: d.playCount - H[i].playCount, rp: d.skillPoints - H[i].skillPoints,
  rank: H[i].globalRank - d.globalRank, accD: d.avgAccuracy - H[i].avgAccuracy, sq: d.squaresHit - H[i].squaresHit, t: d}));
let H = fillHistory(D.history);
let DAYS = daysOf(H);
let lastActive = [...DAYS].reverse().find(d => d.plays > 0);
// Maps per week, the extension's formula: lifetime plays over weeks since joining.
const weeksSince = (NOW - new Date(U.created_at).getTime()) / 6048e5;
const MPW = weeksSince > 0 ? U.play_count / weeksSince : 0;
let last7 = DAYS.slice(-7).reduce((a, d) => a + d.plays, 0);

// Popup switches shared with the Classic look (shared/settings/schema.js), read once per mount.
const PREFS = RhythiaX.ExodusPrefs || {}, ON = k => PREFS.modules?.[k] !== false;
const STAT_TABS = [['progress','Progress'],['rankings','Rankings'],['playstyle','Playstyle']].filter(([k]) => k === 'playstyle' ? ON('advancedStats') : ON('statHistory'));
const S = {section:'profile', mode:'normal', stat: STAT_TABS[0]?.[0] || 'progress', range:30, metric:'skillPoints', rankMetric:'globalRank',
  act:'plays', gran:'day', selDate: lastActive?.date || H.at(-1).date, cur: (lastActive?.date || H.at(-1).date).slice(0, 7), allScores:false, mod:'', tier:null, viewer: ctx.owner ? 'owner' : 'visitor', pins: (D.pinned || []).map(s => String(s.id)), friend: U.friend_state || (ctx.signedIn === null ? 'none' : ''), busy: false, items: D.showcase?.items || [], itemsRev: D.showcase?.revision || 0, pinAt:0, editing:false, list:'top', q:'', grade:'', speed:'', page:1, view: PREFS.exodus?.scoresView === 'grid' ? 'grid' : 'list'};
// Copy speaks to the owner as "you"; on anyone else's profile it names the player.
const OWN = S.viewer === 'owner', WHO = OWN ? 'You' : esc(U.username), WHOSE = OWN ? 'Your' : `${WHO}’s`, whose = OWN ? 'your' : WHOSE;
// A quiet refresh (fresh data replacing a saved snapshot) keeps where the viewer was.
const VIEW_KEYS = ['section', 'mode', 'stat', 'range', 'metric', 'rankMetric', 'act', 'gran', 'list', 'view', 'rev', 'q', 'grade', 'mod', 'speed', 'page'];
for (const k of VIEW_KEYS) if (ctx.state?.[k] !== undefined) S[k] = ctx.state[k];
if (S.list === 'pinned' && !S.pins.length) S.list = 'top';
// /player/:id/scores is the same view on its own section, so the URL decides it.
if (ctx.page === 'scores') S.section = 'scores'; else if (S.section === 'scores') S.section = 'profile';
const rangeDays = () => S.range === 0 ? H.length - 1 : Math.min(S.range, H.length - 1);
const win = () => H.slice(-rangeDays() - 1);

function toast(m) { RhythiaX.ExodusKit.toast(R, m); }

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

/* ── The player's text and pinned scores (the intro, the editor and the actions use them) ── */
// The pinned scores in pin order, from every list this profile has.
function pinnedScores() { const all = SCORES_ALL(); return S.pins.map(id => all.find(s => String(s.id) === String(id))).filter(Boolean); }
// Rhythia renders about_me as Markdown, pictures from any address included. It is drawn by core/markdown.js
// as a player's text: raw HTML stays text and single line breaks are kept.
// Social links are trailing comments: <!--rhythia-social:URL--> and <!--rhythia-social-2:URL-->.
// Only web links are shown: about_me can be written straight through the API, so javascript: or data: may be in it.
const webLink = u => { try { const x = new URL(String(u).trim()); return /^https?:$/.test(x.protocol) ? x.href : ''; } catch (_) { return ''; } };
const socialLinks = raw => [...String(raw || '').matchAll(/<!--rhythia-social(?:-\d+)?:(.*?)-->/g)].map(m => { try { return decodeURIComponent(m[1]); } catch (_) { return m[1]; } }).map(webLink).filter(Boolean);
const bioText = raw => String(raw || '').replace(/<!--[\s\S]*?-->/g, '').split('\n').map(l => l.replace(/\s+$/, '')).join('\n').replace(/\n{3,}/g, '\n\n').trim();
const md = text => RhythiaX.ExodusMarkdown.md(String(text || '').replace(/&nbsp;/gi, ' '), {images: 'all'});

// A figure in a row of figures; a selectable one picks what the chart under it shows. Statistics and the
// Scores page both use it.
function kpi(key, label, value, sub, {sel = S.metric, attr = 'data-metric', selectable = true} = {}) {
  return `<button type="button" class="kpi ${selectable ? 'sel' : ''}" ${selectable ? `${attr}="${key}" aria-pressed="${sel === key}"` : 'disabled'}>
    <small>${label}</small><strong class="num">${value}</strong><span class="num">${sub}</span></button>`;
}

/* ── Dates and the daily history, shared by the statistics and playstyle parts ── */
const addDays = (s, n) => { const d = utc(s); d.setUTCDate(d.getUTCDate() + n); return isoDay(d); };
const mondayOf = s => addDays(s, -((utc(s).getUTCDay() + 6) % 7));
const nextMonth = ym => { const [y, m] = ym.split('-').map(Number); return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`; };
const prevMonth = ym => { const [y, m] = ym.split('-').map(Number); return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`; };
const isoWeek = s => { const d = utc(s); d.setUTCDate(d.getUTCDate() + 3 - ((d.getUTCDay() + 6) % 7)); const y0 = new Date(Date.UTC(d.getUTCFullYear(), 0, 4)); return 1 + Math.round(((d - y0) / 864e5 - 3 + ((y0.getUTCDay() + 6) % 7)) / 7); };
const monthName = (ym, o = {month: 'long', year: 'numeric'}) => utc(ym + '-01').toLocaleDateString('en-GB', {...o, timeZone: 'UTC'});
let FIRST = DAYS[0]?.date || H[0].date, LAST = H.at(-1).date;
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

// Momentum follows the extension's scout rules: a 14-day rank comparison, "fast" when the
// move is at least 5% of the old rank, a 3-day "burst" at 2%, and RP context notes.
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

// Each tracked day by its date, plays counted over days, and the breaks in the history.
let DAY = new Map(DAYS.map(d => [d.date, d]));
const plural = (n, w) => `${fmt(n)} ${w}${n === 1 ? '' : 's'}`;
const playsIn = (from, to) => DAYS.filter(d => d.date >= from && d.date < to).reduce((a, d) => a + d.plays, 0);
// A break is four or more tracked days in a row without a play.
function breaksOf(DAYS) {
  const out = []; let run = null;
  for (const d of DAYS) {
    if (!d.plays) { if (run) { run.to = d.date; run.days++; } else run = {from: d.date, to: d.date, days: 1}; continue; }
    if (run && run.days >= 4) out.push(run);
    run = null;
  }
  if (run && run.days >= 4) out.push({...run, open: true});
  return out;
}
let BREAKS = breaksOf(DAYS);
// A community history that arrived after the first paint: every part worked out from it is set again, and
// the day the activity panel opens on follows it unless the viewer picked another.
function setHistory(list) {
  const was = lastActive?.date || H.at(-1).date;
  D.history = list;
  H = fillHistory(list); DAYS = daysOf(H); lastActive = [...DAYS].reverse().find(d => d.plays > 0);
  last7 = DAYS.slice(-7).reduce((a, d) => a + d.plays, 0);
  FIRST = DAYS[0]?.date || H[0].date; LAST = H.at(-1).date;
  DAY = new Map(DAYS.map(d => [d.date, d])); BREAKS = breaksOf(DAYS); MONTHS = monthsOf();
  if (S.selDate === was) S.selDate = lastActive?.date || LAST;
  if (S.cur === was.slice(0, 7)) S.cur = S.selDate.slice(0, 7);
  if (!MONTHS.includes(S.rev)) S.rev = MONTHS.at(-1);
}

// The Statistics section: its tabs and the pane of the open one (pages/profile-stats.js and profile-playstyle.js).
function statistics(anim) {
  const pane = S.mode !== 'normal' && S.stat === 'progress'
    ? `<div class="empty"><b>Daily history covers Lock only</b>See Rankings or Playstyle for ${MODES[S.mode].label}.</div>`
    : {progress, rankings, playstyle}[S.stat](anim);
  return `<div class="sec-head">
      <div><h2>Statistics</h2></div>
      <div class="tabs seg" role="tablist" data-ink="stats">${STAT_TABS.map(([k, l]) =>
        `<button role="tab" type="button" aria-selected="${S.stat === k}" data-stat="${k}">${l}</button>`).join('')}</div>
    </div><div class="pane ${anim === 'pane' ? 'swap' : ''}">${pane}</div>`;
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
    toast(pinned ? 'Unpinned from your profile.' : 'Pinned to your profile.');
  } catch (err) {
    toast(`Could not ${pinned ? 'unpin' : 'pin'} the score: ${err.message}`);
  } finally {
    S.busy = false;
  }
  // Left while it saved: the toast still says how it went, but the next page is not drawn over.
  if (ac.signal.aborted) return;
  if (!S.editing) refreshIntro();
  renderScores(false);
}
async function addFriend() {
  if (S.busy) return;
  if (!RhythiaX.ExodusData.session()) return toast('Sign in to Rhythia to add friends.');
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
  if (!ac.signal.aborted) renderHero();
}
// Bio and links are one about_me write; pins removed in the editor are unpinned one by one.
async function saveProfile(btn) {
  if (S.busy) return;
  const dr = S.draft, cur = aboutParts();
  const bio = dr.bio.trim(), typed = dr.links.map(l => l.trim()).filter(Boolean).slice(0, 2);
  // Links are checked only when they were edited, as in Settings: links saved earlier (or by Rhythia) stay as they are.
  const linksEdited = typed.join('\n') !== cur.links.join('\n');
  // Rhythia takes only the social links core/kit.js lists, over https (the same rule as core/account.js).
  const socialLink = l => RhythiaX.ExodusKit.socialLink(l);
  const bad = linksEdited && typed.find(l => !socialLink(l));
  if (bad) return toast(`“${bad}” is not a supported link. Use https:// and one of the listed sites.`);
  const links = linksEdited ? typed.map(socialLink) : typed;
  const aboutChanged = bio !== cur.text || links.join('\n') !== cur.links.join('\n');
  const dropped = S.pins.filter(id => !dr.pins.includes(id));
  S.busy = true; btn.disabled = true; btn.textContent = 'Saving…';
  try {
    if (aboutChanged) {
      await ctx.actions.saveAbout(bio, links);
      U.about_me = RhythiaX.ExodusData.composeAboutMe(bio, links);
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
    if (!ac.signal.aborted) { btn.disabled = false; btn.textContent = 'Save'; }
    return;
  } finally {
    S.busy = false;
  }
  if (ac.signal.aborted) return;
  refreshIntro(); renderScores(false);
}

/* ── The parts: pages/profile-hero.js, profile-stats.js, profile-playstyle.js and profile-scores.js ── */
// Each part is made once per mount from this context. What never changes after mount is passed as it is;
// the daily history and what is worked out from it are set again when fresh history arrives (setHistory),
// so the parts read those through getters and always see the current ones.
const c = {R, D, ctx, ac, U, ICONS, SITE, esc, fmt, REDUCED, TITLES, COUNTRY, $, cssUrl, sgn, tone, ico, ago, utc, dm,
  dayName, SPEED, GRADES, prepare, MODES, MPW, ON, S, OWN, WHOSE, whose, rangeDays, win, toast, counter, pinnedScores,
  md, bioText, socialLinks, kpi, addDays, mondayOf, nextMonth, prevMonth, isoWeek, monthName, agg, TREND, momentum,
  plural, playsIn, morph, SCORES_ALL, refreshIntro,
  get H() { return H; }, get DAYS() { return DAYS; }, get last7() { return last7; }, get FIRST() { return FIRST; },
  get LAST() { return LAST; }, get DAY() { return DAY; }, get BREAKS() { return BREAKS; },
  get MONTHS() { return MONTHS; }};
const parts = RhythiaX.ExodusProfileParts;
const {hero, intro, titleMap, refreshEdPins, SHOWCASE_MAX, saveShowcase, openFriends, picker, openPicker, runPicker} = parts.hero(c);
const {progress, rankings, activity, detail, period} = parts.stats(c);
const {playstyle, loadStyles, review, faq, KIND, BAR_KINDS, monthsOf} = parts.playstyle(c);
const {scores, scoreBody, rpChart, suggest, pickSuggestion, sug, closeMenu, openMenu} = parts.scores(c);
let MONTHS = monthsOf();
if (!MONTHS.includes(S.rev)) S.rev = MONTHS.at(-1);

/* ── Compare: pages/compare.js ── */
const compare = RhythiaX.ExodusCompare(R, {U, MODES, prepare, ico, sgn, tone, hideTip, sig, KIND, BAR_KINDS});

/* ── Events ── */
function toggleFaq(force) {
  const old = $('#faq'), btn = $('.faq-btn'), open = force ?? !old;
  old?.remove(); btn?.setAttribute('aria-expanded', String(open && !!btn));
  if (open && btn) btn.closest('.panel').insertAdjacentHTML('beforeend', faq(momentum(), H.at(-1)));
}
R.addEventListener('click', e => {
  if (!e.target.closest('.menu,[data-menu]')) closeMenu();
  if ($('#faq') && !e.target.closest('#faq,[data-faq]')) toggleFaq(false);
  const t = e.target.closest('[data-section],[data-mode],[data-stat],[data-rev],[data-range],[data-metric],[data-rank-metric],[data-act],[data-gran],[data-step],[data-sel],[data-all-scores],[data-suggest],[data-tier],[data-pin],[data-pin-step],[data-pin-drop],[data-faq],[data-edit-bio],[data-bio],[data-list],[data-view],[data-page],[data-menu],[data-compare],[data-friend],[data-friends],[data-native],[data-item-add],[data-item-drop],[data-pick-close],[data-pick-kind],[data-pick-mine],[data-pick-item],[data-pick-page],[data-bio-more]');
  if (!t || t.disabled) return;
  const d = t.dataset;
  if (t.hasAttribute('data-compare')) { closeMenu(); return compare.open(); }
  if (d.menu) return openMenu(t, d.menu);
  if (d.section) { if (S.section === d.section) return; return setSection(d.section, true); }
  if (d.mode) { if (S.mode === d.mode) return; S.mode = d.mode; S.page = 1; S.speed = ''; S.mod = ''; wantMeta(S.mode); renderHero(); renderStats('pane'); renderRp(); return renderScores(true); }
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
      S.draft = {bio: text, links: socialLinks(raw), pins: [...S.pins]};
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
  if (d.list) { if (S.list === d.list) return; S.list = d.list; S.page = 1; S.speed = ''; S.mod = ''; return renderScores(true); }
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
  // '/' jumps to the score search, but never takes the key from a field, a shortcut or anything outside
  // this page (Rhythia's own dialogs, the theme editor).
  const onPage = tgt === document.body || tgt === document.documentElement || e.composedPath().includes(host);
  if (e.key === '/' && onPage && !e.ctrlKey && !e.metaKey && !e.altKey && !tgt.isContentEditable && !tgt.closest?.('input, textarea, select, [contenteditable]')) { const q = $('#q'); if (q) { e.preventDefault(); q.focus(); } }
}, sig);
addEventListener('resize', () => inks(), sig);
R.addEventListener('error', e => {
  const img = e.target;
  if (img?.tagName !== 'IMG' || !img.dataset.fb) return;
  const el = document.createElement('b');
  el.textContent = img.alt; img.replaceWith(el);
}, {capture: true, signal: ac.signal});
R.addEventListener('mousedown', e => { if (e.target.closest('#suggest')) e.preventDefault(); }, sig);
R.addEventListener('load', e => { if (e.target?.closest?.('.bio')) foldBio(); }, {capture: true, signal: ac.signal});
addEventListener('resize', foldBio, sig);
R.addEventListener('focusout', e => { if (e.target.id === 'q') setTimeout(() => { const b = $('#suggest'); if (b && R.activeElement?.id !== 'q') b.hidden = true; }, 120); }, sig);
R.addEventListener('focusin', e => { if (e.target.id === 'q' && e.target.value) suggest(e.target.value); }, sig);
// Map art that arrived after the first paint: fill it into every score and redraw quietly.
function updateMeta(meta) {
  if (ac.signal.aborted) return;
  D.meta = {...D.meta, ...meta};
  for (const s of SCORES_ALL()) {
    const m = meta[s.songId];
    if (m) Object.assign(s, {img: m.img || '', thumb: m.thumb || m.img || '', mapper: m.mapper || '', stars: m.stars || 0});
  }
  if (!S.editing) refreshIntro();
  if (!R.querySelector('#stats .faq')) renderStats();
  if (!R.activeElement?.closest?.('#scores')) renderScores(false);
}
renderHero(!ctx.quiet); renderBody(); soft = false;
if (!ctx.quiet) $('#hero .hero')?.classList.add('enter');
wantMeta(S.mode);
return {
  state: () => Object.fromEntries(VIEW_KEYS.map(k => [k, S[k]])),
  // Safe to swap in fresh data only while nothing is open or half-done.
  idle: () => !S.editing && !S.busy && !R.querySelector('dialog[open], .menu, #faq') && !R.activeElement?.matches?.('input, textarea, select'),
  relayout: () => inks(),
  // The address moved between the profile and its scores page: switch in place, no reload.
  page(p) { const sec = p === 'scores' ? 'scores' : S.section === 'scores' ? 'profile' : S.section; if (sec !== S.section) setSection(sec, false); },
  updateMeta,
  // The community history came after the first paint (core/data.js load): the parts drawn from it are redrawn
  // in place, so an open dialog or a half-typed search stays as it is.
  updateHistory(list) {
    if (ac.signal.aborted || !Array.isArray(list) || !list.length) return;
    setHistory(list);
    renderHero();
    if (!R.querySelector('#stats .faq')) renderStats();
  },
  destroy() {
    ac.abort(); io?.disconnect(); closeMenu(); hideTip();
    R.querySelectorAll('dialog[open]').forEach(dl => dl.close());
  },
};
};
