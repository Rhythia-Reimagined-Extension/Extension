// =============================================
// Reimagined for Rhythia — Exodus profile: playstyle
// =============================================
// The Playstyle pane: momentum and its status guide, the signals, Month in review with the map types read
// from the map files, the speed and grade mix of the top plays and the best plays. momentum() and the daily
// history it reads are in pages/profile.js, which makes this part at mount with its context c.

var RhythiaX = RhythiaX || {};
RhythiaX.ExodusProfileParts = RhythiaX.ExodusProfileParts || {};

RhythiaX.ExodusProfileParts.playstyle = function mountProfilePlaystyle(c) {
'use strict';
// What this part takes from pages/profile.js. The daily history can be replaced after mount (fresh data),
// so it is read from c each time: c.H, c.DAYS, c.last7, c.FIRST, c.LAST, c.DAY, c.BREAKS and c.MONTHS.
const {D, ac, esc, fmt, cssUrl, sgn, tone, ico, utc, dm, dayName, SPEED, GRADES, prepare, MODES, MPW, S, OWN, WHOSE,
  whose, $, addDays, nextMonth, prevMonth, monthName, agg, TREND, momentum, plural, playsIn, morph} = c;

// The status guide: what each momentum status means, with the player's own numbers (momentum() in pages/profile.js).
const FAQ = [
  ['up', 'Climbing', `${WHOSE} global rank is better than 14 days ago. A gain of 5% of the old rank (at least 3 places) is a <b>Fast climb</b>.`],
  ['down', 'Dropping', `${WHOSE} global rank is worse than 14 days ago. This can happen while RP rises, if nearby players gain more. A <b>Sharp drop</b> uses the same 5% rule.`],
  ['steady', 'Holding steady', `Same rank as 14 days ago. Flagged as stagnation only if ${OWN ? 'you have' : 'they have'} played and RP barely moved.`],
  ['elite', 'Defending top 30', 'Same rank inside the top 30. Slow RP growth is normal there, so it is not flagged.'],
];
const FAQ_ICON = {up: 'up', down: 'down', steady: 'steady', elite: 'shield'};
function faq(mo, last) {
  const ref = mo.ref, move = Math.abs(mo.delta), pctMove = move / ref.globalRank * 100, d3 = Math.abs(mo.d3 || 0);
  const places = n => `${fmt(n)} place${n === 1 ? '' : 's'}`;
  const rankLine = mo.delta
    ? `<b>#${fmt(ref.globalRank)}</b> on ${dm(ref.date)}, <b>#${fmt(last.globalRank)}</b> now: ${places(move)}, <b>${fmt(pctMove, 1)}%</b> of the old rank. ${mo.delta > 0 ? 'A fast climb' : 'A sharp drop'} needs <b>${places(mo.fast)}</b>${move >= mo.fast ? ', so this counts.' : '.'}`
    : `Same rank as on ${dm(ref.date)} (<b>#${fmt(last.globalRank)}</b>).`;
  const burstLine = isFinite(mo.burst) ? ` Last 3 days: ${places(d3)}; a ${mo.d3 < 0 ? 'sudden drop' : 'rank surge'} needs <b>${places(mo.burst)}</b>.` : '';
  const rate = Math.abs(mo.pct * 14 / Math.max(1, mo.days));
  const rpLine = `RP <b>${sgn(mo.gain, 1)}</b> (${sgn(mo.pct, 2, '%')}) in ${mo.days} days. Under 0.5% per 14 days is a low gain, under 0.1% almost flat, so this is <b>${mo.gain < 0 ? 'falling' : rate < .1 ? 'almost flat' : rate < .5 ? 'a low gain' : 'healthy growth'}</b>.`;
  return `<div class="faq" id="faq" role="dialog" aria-label="Playstyle statuses">
    <div class="faq-head"><strong>Playstyle statuses</strong><button class="iconbtn" type="button" data-faq aria-label="Close">${ico('x')}</button></div>
    <div class="faq-grid">${FAQ.map(([k, l, p]) => `<div class="faq-item ${k} ${mo.kind === k ? 'now' : ''}"><span class="tag">${TREND[FAQ_ICON[k]]}${l}${mo.kind === k ? `<em>${OWN ? 'You' : 'Now'}</em>` : ''}</span><p>${p}</p></div>`).join('')}</div>
    <div class="faq-you"><small>${WHOSE} numbers</small><p>${rankLine}${burstLine}</p><p>${rpLine}</p></div>
  </div>`;
}

/* ── Playstyle ── */
// Every Lock play Rhythia still lists with its time: the last 100 and the top 100.
const PLAYS = (() => { const seen = new Set(); return [...prepare(D.scores.lastDay), ...MODES.normal.top].filter(s => s.created_at && !seen.has(s.id) && seen.add(s.id)); })();
const dayOf = s => s.created_at.slice(0, 10);
const avgAcc = list => list.reduce((a, s) => a + s.acc, 0) / list.length;
// How the plays before and after a break compare.
function comeback(b) {
  const back = addDays(b.to, 1), week = playsIn(back, addDays(back, 7));
  const after = PLAYS.filter(s => dayOf(s) >= back && dayOf(s) < addDays(back, 14)), before = PLAYS.filter(s => dayOf(s) < b.from && dayOf(s) >= addDays(b.from, -30));
  const since = Math.round((utc(c.LAST) - utc(back)) / 864e5) + 1;
  let t = `Back on <b>${dm(back)}</b> with <b>${plural(week, 'play')}</b> ${since < 7 ? `in the ${plural(since, 'day')} since` : 'in the first week'}.`;
  if (after.length >= 3 && before.length >= 3) {
    const x = avgAcc(after), y = avgAcc(before), d = x - y;
    t += ` Accuracy <b>${fmt(x, 2)}%</b>, against <b>${fmt(y, 2)}%</b> before the break: ${d <= -.5 ? 'still shaking off the rust' : d >= -.15 ? 'already at the usual level' : 'close to the usual level'}.`;
  }
  return t;
}

// Map types come from each map's notes (ExodusMapKit). Saved results show at once; the rest load
// while the tab is open, four files at a time, and only the notes part of each file is read.
// Each map has one of the first four types; Quantum is on top of that, so it has a row but no part of the bar.
const KIND = {
  jump: ['Jumps', 'Mostly long moves across the grid'],
  stream: ['Streams', 'Mostly short moves at an even speed'],
  tech: ['Techs', 'Mostly short moves at a changing speed'],
  varied: ['Varied', 'No kind of movement leads'],
  quantum: ['Quantum', 'Parts placed off the grid'],
};
const BAR_KINDS = ['jump', 'stream', 'tech', 'varied'];
const STY = {map: RhythiaX.ExodusData.storedStyles(PLAYS.map(s => s.songId)), started: false, done: 0, total: 0};
const kindOf = s => STY.map.get(s.songId)?.kind;
const isKind = (s, k) => { const st = STY.map.get(s.songId); return Boolean(st) && (k === 'quantum' ? st.quantum : st.kind === k); };
function loadStyles() {
  if (STY.started || S.mode !== 'normal') return;
  STY.started = true;
  const ids = [...new Set(PLAYS.map(s => s.songId))];
  if (ids.every(id => STY.map.has(id))) return;
  let queued = false;
  const paint = () => { queued = false; if (ac.signal.aborted) return; const el = $('#mtypes'); if (el) morph(el, mapTypes()); };
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
    return `<h4>Map types</h4><div class="mt-load" role="status"><span>Reading map files <b class="num">${STY.done} of ${STY.total}</b></span><i style="--p:${Math.round(STY.done / STY.total * 100)}%"></i></div>`;
  }
  if (!known) return `<h4>Map types</h4><p class="cap">Could not read the map files.</p>`;
  const keys = Object.keys(KIND), color = k => `var(--k-${k})`, label = k => KIND[k][0];
  const count = list => keys.map(k => [k, list.filter(s => isKind(s, k))]);
  const m = count(month), t = count(top), mKnown = month.filter(kindOf).length, tKnown = top.filter(kindOf).length;
  const base = (mKnown ? m : t).filter(([k]) => BAR_KINDS.includes(k));
  const rows = keys.map((k, i) => ({k, m: m[i][1], t: t[i][1]})).filter(r => r.m.length || r.t.length);
  const lines = [];
  const lead = t.filter(([k]) => BAR_KINDS.includes(k)).sort((a, b) => b[1].length - a[1].length)[0];
  if (lead[1].length) lines.push(`${WHOSE} top 100 is mostly <b>${label(lead[0]).toLowerCase()}</b> (${lead[1].length}).`);
  const accs = t.filter(r => r[1].length >= 5).map(([k, l]) => [k, avgAcc(l)]).sort((a, b) => b[1] - a[1]);
  if (accs.length >= 2 && accs[0][1] - accs.at(-1)[1] >= .3) lines.push(`Accuracy is highest on <b>${label(accs[0][0]).toLowerCase()}</b> (${fmt(accs[0][1], 2)}%) and lowest on <b>${label(accs.at(-1)[0]).toLowerCase()}</b> (${fmt(accs.at(-1)[1], 2)}%).`);
  if (mKnown >= 5 && tKnown) {
    const shift = m.map(([k, l], i) => [k, l.length, l.length / mKnown - t[i][1].length / tKnown, t[i][1].length]).sort((a, b) => b[2] - a[2])[0];
    if (shift[2] >= .2) lines.push(`${name} leans more on <b>${label(shift[0]).toLowerCase()}</b>: ${shift[1]} of ${mKnown} maps, against ${shift[3]} of the top 100.`);
  }
  return `<h4>Map types <span class="cap">· ${mKnown ? `${plural(mKnown, 'map')} played in ${name}` : `top 100, no listed plays in ${name}`}</span></h4>
    ${mix(base.map(([k, l]) => [k, l.length]), color, label, mKnown ? `${mKnown} in ${name}` : `${tKnown} in the top 100`, k => `<br>${KIND[k][1]}`)}
    <div class="mt-rows"><span class="h">Type</span><span class="h">${esc(monthName(ym, {month: 'short'}))}</span><span class="h">Top 100</span><span class="h">Accuracy</span>
      ${rows.map(r => `<span class="k" style="--c:${color(r.k)}" data-tip="<b>${label(r.k)}</b><small>${KIND[r.k][1]}</small>">${label(r.k)}</span><em class="num">${r.m.length || '—'}</em><em class="num">${r.t.length || '—'}</em><em class="num" data-tip="<small>Average accuracy of these maps in ${whose} top 100</small>">${r.t.length ? fmt(avgAcc(r.t), 2) + '%' : '—'}</em>`).join('')}</div>
    ${lines.length ? `<ul class="notes">${lines.map(l => `<li>${l}</li>`).join('')}</ul>` : ''}`;
}

// One column per day; a break is marked under its days.
function strip(ym) {
  const from = ym + '-01', to = nextMonth(ym) + '-01', days = [];
  for (let d = from; d < to; d = addDays(d, 1)) days.push(d);
  const max = Math.max(1, ...days.map(d => c.DAY.get(d)?.plays || 0));
  const cols = days.map((d, i) => {
    const x = c.DAY.get(d);
    if (d > c.LAST) return `<span class="mcol future" style="grid-column:${i + 1}"></span>`;
    if (!x) return `<span class="mcol off" style="grid-column:${i + 1}" data-tip="<b>${dayName(d)}</b><small>Not tracked</small>"><i></i></span>`;
    return `<span class="mcol ${x.plays ? '' : 'zero'}" style="grid-column:${i + 1};--h:${Math.round(x.plays / max * 100)}" data-tip="<b>${dayName(d)}</b><small>${x.plays ? `${plural(x.plays, 'play')} · ${sgn(x.rp, 1)} RP · rank ${sgn(x.rank)}` : 'No plays'}</small>"><i></i></span>`;
  }).join('');
  const labels = days.map((d, i) => (i % 7 === 0 ? `<span class="mday num" style="grid-column:${i + 1}">${i + 1}</span>` : '')).join('');
  const breaks = c.BREAKS.filter(b => b.from < to && b.to >= from).map(b => {
    const s = days.indexOf(b.from < from ? from : b.from) + 1, e = days.indexOf(b.to >= to ? days.at(-1) : b.to) + 1;
    return `<span class="mbrk" style="grid-column:${s}/${e + 1}" data-tip="<b>${b.open ? 'No plays since ' + dm(b.from) : `Break · ${dm(b.from)} – ${dm(b.to)}`}</b><small>${b.days} days without a play</small>"><b>${b.open ? `${b.days} days so far` : `${b.days}-day break`}</b></span>`;
  }).join('');
  return `<div class="mstrip" style="--n:${days.length}"><div class="mcols">${cols}</div><div class="mlab">${labels}</div>${breaks ? `<div class="mbrks">${breaks}</div>` : ''}</div>`;
}

function monthNotes(ym, a, plays) {
  const from = ym + '-01', to = nextMonth(ym) + '-01', name = monthName(ym, {month: 'long'}), out = [];
  if (!a) out.push(c.DAYS.length ? `Daily history starts on <b>${dm(c.FIRST)} ${c.FIRST.slice(0, 4)}</b>, so ${name} only shows the plays Rhythia still lists.` : 'Without daily history, only the plays Rhythia still lists are counted.');
  for (const b of c.BREAKS.filter(b => b.from < to && b.to >= from).sort((x, y) => y.days - x.days).slice(0, 2)) {
    out.push(b.open ? `No plays since <b>${dm(b.from)}</b>: <b>${b.days} days</b> so far.` : `A <b>${b.days}-day break</b>, from ${dm(b.from)} to ${dm(b.to)}.`);
    const back = addDays(b.to, 1);
    if (!b.open && back >= from && back < to) out.push(comeback(b));
  }
  if (a && a.days >= 5) {
    const w = a.plays / a.days * 7, pm = prevMonth(ym), pa = agg(pm + '-01', from), pn = monthName(pm, {month: 'long'});
    const pw = pa && pa.days >= 7 ? pa.plays / pa.days * 7 : null;
    out.push(`About <b>${fmt(w)}</b> plays a week${pw == null ? ` over ${a.days} tracked days` : pw && Math.abs(w / pw - 1) >= .25 ? `, ${w > pw ? 'up' : 'down'} from <b>${fmt(pw)}</b> in ${pn}` : `, about the same as ${pn}`}.`);
    const busy = c.DAYS.filter(d => d.date >= from && d.date < to).reduce((m, d) => d.plays > m.plays ? d : m, {plays: 0});
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

function monthsOf() {
  const first = [c.FIRST, ...PLAYS.map(dayOf)].sort()[0].slice(0, 7), out = [];
  for (let m = first; m <= c.LAST.slice(0, 7); m = nextMonth(m)) out.push(m);
  return out;
}

function review() {
  const ym = S.rev, from = ym + '-01', to = nextMonth(ym) + '-01', i = c.MONTHS.indexOf(ym);
  const a = agg(from, to), plays = PLAYS.filter(s => dayOf(s) >= from && dayOf(s) < to);
  const fig = (label, v, cls = '') => `<div><small>${label}</small><b class="num ${cls}">${v}</b></div>`;
  return `<div class="panel wide mrev" id="mrev">
    <div class="panel-head"><h3>Month in review</h3>
      <div class="stepper"><button class="iconbtn" type="button" data-rev="-1" ${i > 0 ? '' : 'disabled'} aria-label="Earlier month">‹</button><strong>${monthName(ym)}</strong><button class="iconbtn" type="button" data-rev="1" ${i < c.MONTHS.length - 1 ? '' : 'disabled'} aria-label="Later month">›</button></div></div>
    ${a ? `<div class="mfig">${fig('Plays', fmt(a.plays))}${fig('Active days', `${a.active} of ${a.days}`)}${fig('RP', sgn(a.rp, 1), tone(a.rp))}${fig('Global rank', sgn(a.rank), tone(a.rank))}${fig('Avg. accuracy', sgn(a.accD, 2, ' pp'), tone(a.accD))}</div>` : ''}
    <div class="mbody">
      <div>${a ? strip(ym) : ''}<ul class="notes">${monthNotes(ym, a, plays).map(n => `<li>${n}</li>`).join('')}</ul></div>
      <div id="mtypes">${mapTypes()}</div>
    </div>
  </div>`;
}

// Playstyle reads the top 100, so it has no period switch; Month in review has its own.
function playstyle() {
  const top = MODES[S.mode].top;
  if (!top.length) return `<div class="empty"><b>No ${MODES[S.mode].label} scores yet</b>Playstyle needs ranked scores.</div>`;
  const mo = momentum(), last = c.H.at(-1), ref14 = c.H.length > 14 ? c.H.at(-15) : c.H[0];
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
        <ul class="notes">${mo.notes.map(n => `<li>${n}</li>`).join('')}<li>Lowest counted play: <b>${fmt(floor)} RP</b>. Anything above it raises the total.</li></ul>
      </div>
      <div class="panel">
        <div class="sigs">
          ${sig('Main speed', primary[0] + '×', `${primary[1]} of ${of}`, `color:${SPEED[primary[0]]}`)}
          ${sig('Accuracy, 14 days', `<span class="${tone(accMove)}">${sgn(accMove, 2, ' pp')}</span>`, `${fmt(last.avgAccuracy, 2)}% average now`)}
          ${sig('Average play', fmt(avgRp) + ' RP', `across ${of}`)}
          ${sig('Full combos', fmt(top.filter(s => s.fc).length), `in ${of}`, 'color:var(--g-SS)')}
          ${sig('Maps / week', fmt(MPW, 1), `${fmt(c.last7)} played in the last 7 days`)}
          ${sig('Plays, 14 days', fmt(mo.plays || 0), `${fmt((mo.plays || 0) / Math.max(1, mo.days), 1)} a day`)}
        </div>
      </div>
      ${S.mode === 'normal' ? review() : ''}
      <div class="panel"><div class="panel-head"><h3>Speed mix <span>· top ${top.length}</span></h3></div>${mix(speeds, k => SPEED[k], spd, of)}${legend(speeds, k => SPEED[k], spd)}</div>
      <div class="panel"><div class="panel-head"><h3>Grades <span>· top ${top.length}</span></h3></div>${mix(grades, k => `var(--g-${k})`, grd, of)}${legend(grades, k => `var(--g-${k})`, grd)}</div>
    </div>
    <div class="best">${[['Best accuracy', bAcc, `<b>${fmt(bAcc.acc, 2)}%</b>`], ['Top RP play', bRp, `<b>${fmt(bRp.raw)} RP</b>`], ['Most notes', bNotes, `<b>${fmt(bNotes.beatmapNotes)}</b> notes`]].map(([l, s, v]) =>
      `<a class="bcard" href="/score/${encodeURIComponent(s.id)}" style="background-image:${cssUrl(s.img || s.thumb)}"><span class="bg"></span><span class="lab">${l}</span>
        <span class="txt"><strong title="${esc(s.beatmapTitle)}">${esc(s.beatmapTitle)}</strong><em class="num">${v} · ${s.speedKey}×</em></span></a>`).join('')}</div>`;
}

return {playstyle, loadStyles, review, faq, KIND, BAR_KINDS, monthsOf};
};
