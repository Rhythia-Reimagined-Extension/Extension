// =============================================
// Reimagined for Rhythia — Exodus profile: statistics
// =============================================
// The Progress and Rankings panes of the profile's Statistics: the charts with their period switch, and the
// activity calendar with the day, week or month picked under it. pages/profile.js draws the tabs above them
// and makes this part at mount with its context c.

var RhythiaX = RhythiaX || {};
RhythiaX.ExodusProfileParts = RhythiaX.ExodusProfileParts || {};

RhythiaX.ExodusProfileParts.stats = function mountProfileStats(c) {
'use strict';
// What this part takes from pages/profile.js. The daily history can be replaced after mount (fresh data),
// so it is read from c each time: c.FIRST and c.LAST.
const {U, esc, fmt, COUNTRY, cssUrl, sgn, tone, ago, utc, dm, dayName, MODES, S, rangeDays, win, kpi, addDays,
  mondayOf, nextMonth, prevMonth, isoWeek, monthName, agg} = c;

/* ── Chart (labels in HTML so they never stretch) ── */
function chart(points, {invert = false, f = v => fmt(v), label = '', anim = ''} = {}) {
  if (points.length < 2) return `<div class="empty"><b>Not enough history yet</b></div>`;
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

/* ── Statistics ── */
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
  list.forEach(x => { const p = period(S.gran, x.key); x.a = p.from <= c.LAST ? agg(p.from, p.to) : null; x.future = p.from > c.LAST; });
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
  const canPrev = S.gran === 'month' ? yr > c.FIRST.slice(0, 4) : S.cur > c.FIRST.slice(0, 7);
  const canNext = S.gran === 'month' ? yr < c.LAST.slice(0, 4) : S.cur < c.LAST.slice(0, 7);
  return `<div class="act">
    <div class="panel">
      <div class="panel-head"><h3>Activity</h3>
        <div class="pills" aria-label="Group by">${[['day','Days'],['week','Weeks'],['month','Months']].map(([k, l]) => `<button type="button" aria-pressed="${S.gran === k}" data-gran="${k}">${l}</button>`).join('')}</div></div>
      <div class="act-bar">
        <div class="stepper"><button class="iconbtn" type="button" data-step="-1" ${canPrev ? '' : 'disabled'} aria-label="Earlier">‹</button><strong>${label}</strong><button class="iconbtn" type="button" data-step="1" ${canNext ? '' : 'disabled'} aria-label="Later">›</button></div>
        <div class="pills" aria-label="Show">${Object.entries(ACT).map(([k, a]) => `<button type="button" aria-pressed="${S.act === k}" data-act="${k}">${a.label}</button>`).join('')}</div>
      </div>
      <div class="cal ${S.gran} ${anim ? 'swap' : ''}">${tiles()}</div>
      <p class="cap act-note">Tracked since ${dm(c.FIRST)} ${c.FIRST.slice(0, 4)}.</p>
    </div>
    <div class="panel day ${anim ? 'fadein' : ''}" id="day">${detail()}</div>
  </div>`;
}
function detail() {
  const p = period(S.gran, selKey()), a = agg(p.from, p.to);
  if (!a) return `<h4>${esc(p.title)}</h4><div class="empty"><b>Not tracked</b>History starts on ${dm(c.FIRST)}.</div>`;
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
      ${n ? `<div class="played-list ${S.allScores && n > 5 ? 'scroll' : ''}">${shown.map(s => `<a href="/score/${encodeURIComponent(s.id)}"><i style="background-image:${cssUrl(s.thumb)}"></i><span title="${esc(s.beatmapTitle)}">${esc(s.beatmapTitle)}<small class="num">${fmt(s.acc, 2)}% · ${s.speedKey}×</small></span><em class="num"><b>${fmt(s.raw)}</b> RP</em></a>`).join('')}</div>
        ${n > 5 ? `<button class="link" type="button" data-all-scores>${S.allScores ? 'Show top 5' : `Show all ${n}`}</button>` : ''}`
      : `<p class="cap" style="margin:0">${a.plays ? 'Rhythia no longer lists these plays.' : 'No plays.'}</p>`}</div>`;
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

return {progress, rankings, activity, detail, period};
};
