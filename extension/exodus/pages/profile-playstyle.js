// =============================================
// Reimagined for Rhythia — Exodus profile: playstyle
// =============================================
// The Playstyle pane: momentum and its status guide, the signals, Month in review with the map types from
// the history service, the speed and grade mix of the top plays and the best plays. momentum() and the daily
// history it reads are in pages/profile.js, which makes this part at mount with its context c.

var RhythiaX = RhythiaX || {};
RhythiaX.ExodusProfileParts = RhythiaX.ExodusProfileParts || {};

RhythiaX.ExodusProfileParts.playstyle = function mountProfilePlaystyle(c) {
'use strict';
// What this part takes from pages/profile.js. The daily history can be replaced after mount (fresh data),
// so it is read from c each time: c.H, c.DAYS, c.last7, c.FIRST, c.LAST, c.DAY, c.BREAKS and c.MONTHS.
const {D, U, ac, esc, fmt, cssUrl, sgn, mv, tone, ico, utc, dm, dayName, SPEED, GRADES, prepare, MODES, MPW, S, OWN, WHOSE,
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

// Map types come from the history service (ExodusData.mapStyles, online history only). Saved results show at
// once; the rest are asked for while the tab is open, up to 100 maps a request.
// Each map has one of the first four types; Quantum is on top of that, so it has a row but no part of the bar.
// Their names and tips are the ones both looks use (shared/game-terms.js).
const KIND = RhythiaX.GameTerms.TYPES;
const BAR_KINDS = ['jump', 'stream', 'tech', 'varied'];
const STY = {map: RhythiaX.ExodusData.storedStyles(PLAYS.map(s => s.songId)), started: false, done: 0, total: 0};
const kindOf = s => STY.map.get(s.songId)?.kind;
const isKind = (s, k) => { const st = STY.map.get(s.songId); return Boolean(st) && (k === 'quantum' ? st.quantum : st.kind === k); };
function loadStyles() {
  loadAtlas();
  if (STY.started || S.mode !== 'normal') return;
  STY.started = true;
  const ids = [...new Set(PLAYS.map(s => s.songId))];
  if (ids.every(id => STY.map.has(id))) return;
  let queued = false;
  // Map types also feed the notes of the last 14 days and of the month in review.
  const paint = () => {
    queued = false; if (ac.signal.aborted) return;
    const el = $('#mtypes'); if (el) morph(el, typesSlot());
    const ag = $('#atlasgame'); if (ag) morph(ag, atlasGame());
    const ps = $('#psnotes'), top = MODES[S.mode].top; if (ps && top.length) morph(ps, psNotes(momentum(), Math.min(...top.map(s => s.raw))));
    const mn = $('#mnotes'); if (mn) { const ym = S.rev, from = ym + '-01', to = nextMonth(ym) + '-01'; morph(mn, monthNotes(ym, agg(from, to), PLAYS.filter(s => dayOf(s) >= from && dayOf(s) < to)).map(n => `<li>${n}</li>`).join('')); }
  };
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
    return `<h4>Map types</h4><div class="mt-load" role="status"><span>${S.basic ? 'Reading map files for their types' : 'Asking for map types'} <b class="num">${STY.done} of ${STY.total}</b></span><i style="--p:${Math.round(STY.done / STY.total * 100)}%"></i></div>`;
  }
  if (!known) return `<h4>Map types</h4>${S.offline && !S.basic ? onlineOffer('Map types come from online history: Reimagined’s history service reads each map.') : S.basic ? '<p class="cap">This browser could not read these maps’ files yet.</p>' : '<p class="cap">Reimagined has not read these maps yet. Their types come within a day.</p>'}`;
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
  const approx = all.some(s => STY.map.get(s.songId)?.approximate);
  return `<h4>Map types <span class="cap">· ${mKnown ? `${plural(mKnown, 'map')} played in ${name}` : `top 100, no listed plays in ${name}`}</span>${approx ? ` <span class="cap" data-tip="<b>Approximate</b><small>${RhythiaX.ExodusKit.BASIC_TIP}</small>">· approximate</span>` : ''}</h4>
    ${mix(base.map(([k, l]) => [k, l.length]), color, label, mKnown ? `${mKnown} in ${name}` : `${tKnown} in the top 100`, k => `<br>${KIND[k][1]}`)}
    <div class="mt-rows"><span class="h">Type</span><span class="h">${esc(monthName(ym, {month: 'short'}))}</span><span class="h">Top 100</span><span class="h">Accuracy</span>
      ${rows.map(r => `<span class="k" style="--c:${color(r.k)}" data-tip="<b>${label(r.k)}</b><small>${KIND[r.k][1]}</small>">${label(r.k)}</span><em class="num">${r.m.length || '—'}</em><em class="num">${r.t.length || '—'}</em><em class="num" data-tip="<small>Average accuracy of these maps in ${whose} top 100</small>">${r.t.length ? fmt(avgAcc(r.t), 2) + '%' : '—'}</em>`).join('')}</div>
    ${lines.length ? `<ul class="notes">${lines.map(l => `<li>${l}</li>`).join('')}</ul>` : ''}`;
}

/* ── In your game (Atlas) ── */
// With Atlas paired and "Scores from your game" on (popup, exodus.atlasScores; background/atlas-bridge.js), the
// player's own profile shows their best pass of every map in the game: each map once, so many tries on one kind of
// map do not tip the split, and failed tries and practice from the middle are left out. "Game only" takes the place
// of Map types in Month in review; "With Rhythia" sits under it and adds the top 100 maps not passed in the game.
// The scores come from Atlas on this computer and stay in this browser.
const ATL = {source: atlasSource(), state: 'idle', maps: null, why: ''};
function atlasSource() {
  const P = RhythiaX.ExodusPrefs;
  if (!OWN || P?.modules?.atlasLinks !== true) return 'online';
  const v = P?.exodus?.atlasScores;
  return ['online', 'both', 'game'].includes(v) ? v : 'both';
}
function loadAtlas() {
  if (ATL.source === 'online' || ATL.state !== 'idle' || S.mode !== 'normal') return;
  ATL.state = 'loading';
  const done = r => {
    if (ac.signal.aborted) return;
    ATL.state = r?.ok ? 'done' : 'failed'; ATL.maps = r?.ok ? r.maps : null; ATL.why = r?.why || '';
    const el = $('#atlasgame'); if (el) morph(el, atlasGame());
  };
  try { chrome.runtime.sendMessage({type: 'rhythiax-atlas-scores', name: U.username}).then(done, () => done(null)); } catch (_) { done(null); }
}
function typesSlot() {
  return ATL.source === 'game' ? '<h4>Map types</h4><p class="cap">From your game this time: see In your game below.</p>' : mapTypes();
}
// The maps counted: the game's passes, and with "With Rhythia" the top 100 maps the game has no pass of (or a
// better online play of a map, which then counts instead). A top play is matched by its map's page number.
function atlasMaps() {
  const list = ATL.maps.map(a => ({id: a.id, acc: a.acc, rp: a.rp, stars: a.stars, kind: a.kind, quantum: a.quantum, from: 'game'}));
  if (ATL.source !== 'both') return list;
  const byId = new Map(list.map(x => [x.id, x]));
  for (const t of MODES.normal.top) {
    const pid = Number((D.meta || {})[t.songId]?.mapId);
    if (!Number.isInteger(pid) || pid <= 0) continue;
    const st = STY.map.get(t.songId), x = byId.get(pid);
    if (!x) { const y = {id: pid, acc: t.acc, rp: t.raw, stars: t.stars || null, kind: st?.kind || null, quantum: st?.quantum === true, from: 'rhythia'}; list.push(y); byId.set(pid, y); }
    else {
      if (!x.kind && st?.kind) { x.kind = st.kind; x.quantum = st.quantum === true; }
      if ((t.raw || 0) > (x.rp || 0)) { x.acc = t.acc; x.rp = t.raw; }
    }
  }
  return list;
}
function atlasGame() {
  const head = t => `<div class="panel-head"><h3>In your game <span>· ${t}</span></h3></div>`;
  if (ATL.state !== 'done') {
    const why = ATL.why === 'offline' ? 'Start Atlas to see your scores from the game.' : ATL.why === 'off' ? 'Scores from your game are off in the popup.' : 'Atlas could not read your scores this time.';
    return head('from Atlas') + (ATL.state === 'failed' ? `<p class="cap">${why}</p>` : '<div class="skeleton" style="height:90px;border-radius:12px"></div>');
  }
  const list = atlasMaps();
  if (!list.length) return head('from Atlas') + '<p class="cap">No passes in the game yet.</p>';
  const keys = Object.keys(KIND), color = k => `var(--k-${k})`, label = k => KIND[k][0];
  const known = list.filter(x => BAR_KINDS.includes(x.kind));
  const rows = keys.map(k => [k, list.filter(x => (k === 'quantum' ? x.quantum : x.kind === k))]).filter(([, l]) => l.length);
  const accOf = l => { const a = l.filter(x => x.acc != null); return a.length ? a.reduce((n, x) => n + x.acc, 0) / a.length : null; };
  const fromRhythia = list.filter(x => x.from === 'rhythia').length;
  const lines = [];
  const lead = BAR_KINDS.map(k => [k, known.filter(x => x.kind === k).length]).sort((a, b) => b[1] - a[1])[0];
  if (lead[1]) lines.push(`Most of ${OWN ? 'your' : 'the'} passed maps are <b>${label(lead[0]).toLowerCase()}</b> (${lead[1]} of ${known.length} with a type).`);
  const accs = BAR_KINDS.map(k => [k, known.filter(x => x.kind === k)]).filter(([, l]) => l.length >= 5).map(([k, l]) => [k, accOf(l)]).filter(r => r[1] != null).sort((a, b) => b[1] - a[1]);
  if (accs.length >= 2 && accs[0][1] - accs.at(-1)[1] >= .3) lines.push(`Accuracy is highest on <b>${label(accs[0][0]).toLowerCase()}</b> (${fmt(accs[0][1], 2)}%) and lowest on <b>${label(accs.at(-1)[0]).toLowerCase()}</b> (${fmt(accs.at(-1)[1], 2)}%).`);
  const st = list.map(x => x.stars).filter(v => v != null);
  if (st.length >= 3) lines.push(`Stars from <b>${fmt(Math.min(...st), 2)}</b> to <b>${fmt(Math.max(...st), 2)}</b>, ${fmt(st.reduce((a, b) => a + b, 0) / st.length, 2)} on average.`);
  if (list.length > known.length) lines.push(`${plural(list.length - known.length, 'map')} without a type: Unranked, Approved, or not read yet.`);
  return head(`${plural(list.length, 'map')} passed, each counted once${fromRhythia ? `, ${fromRhythia} of them only in your Rhythia top 100` : ''}`)
    + (known.length ? mix(BAR_KINDS.map(k => [k, known.filter(x => x.kind === k).length]), color, label, `${known.length} with a type`, k => `<br>${KIND[k][1]}`) : '')
    + `<div class="mt-rows"><span class="h">Type</span><span class="h">Maps</span><span class="h">Share</span><span class="h">Accuracy</span>
      ${rows.map(([k, l]) => `<span class="k" style="--c:${color(k)}" data-tip="<b>${label(k)}</b><small>${KIND[k][1]}</small>">${label(k)}</span><em class="num">${l.length}</em><em class="num">${known.length && k !== 'quantum' ? Math.round(l.length / known.length * 100) + '%' : '—'}</em><em class="num" data-tip="<small>Average accuracy of the best pass of these maps</small>">${accOf(l) != null ? fmt(accOf(l), 2) + '%' : '—'}</em>`).join('')}</div>`
    + (lines.length ? `<ul class="notes">${lines.map(l => `<li>${l}</li>`).join('')}</ul>` : '')
    + '<p class="cap">From Atlas on this computer: your best pass of each map. Failed tries and practice don’t count.</p>';
}

// What changed in a period [from, to), from the plays Rhythia still lists: the top plays set in it, on new maps
// or beating a listed play of the same map; the map types whose accuracy moved against the 30 days before; and
// a change of main speed. At most three short lines; a line needs enough plays to say something.
const PCT = .3;
function progress(from, to, when, withBest) {
  const inP = s => dayOf(s) >= from && dayOf(s) < to, pre = addDays(from, -30), inB = s => dayOf(s) >= pre && dayOf(s) < from;
  const label = k => KIND[k][0].toLowerCase(), out = [];
  const tops = MODES.normal.top.filter(inP);
  if (tops.length) {
    const ups = tops.map(s => { const old = PLAYS.filter(p => p.songId === s.songId && p.id !== s.id && p.created_at < s.created_at); return old.length ? {s, gain: s.raw - Math.max(...old.map(p => p.raw))} : null; }).filter(Boolean);
    const known = tops.filter(kindOf), lead = BAR_KINDS.map(k => [k, known.filter(s => isKind(s, k)).length]).sort((a, b) => b[1] - a[1])[0];
    let t = `<b>${tops.length}</b> of the top 100 ${tops.length === 1 ? 'was' : 'were'} set ${when}`;
    if (ups.length) t += `: <b>${tops.length - ups.length}</b> on new maps, <b>${ups.length}</b> beating an earlier play of the same map`;
    if (known.length >= 4 && lead[1] / known.length >= .6) t += `, mostly <b>${label(lead[0])}</b> (${lead[1]} of ${known.length})`;
    out.push(t + '.');
    const big = ups.filter(u => u.gain > 0).sort((a, b) => b.gain - a.gain)[0], best = tops.reduce((m, s) => s.raw > m.raw ? s : m);
    if (big) out.push(`Biggest improvement: <b>${esc(big.s.beatmapTitle)}</b>, <b>${sgn(big.gain)} RP</b> to ${fmt(big.s.raw)} RP.${withBest && best !== big.s ? ` The best new play: <b>${esc(best.beatmapTitle)}</b>, ${fmt(best.raw)} RP at ${best.speedKey}×.` : ''}`);
    else if (withBest) out.push(`The best: <b>${esc(best.beatmapTitle)}</b>, ${fmt(best.raw)} RP at ${best.speedKey}×.`);
  }
  const now = PLAYS.filter(inP), was = PLAYS.filter(inB);
  const moved = BAR_KINDS.map(k => { const a = now.filter(s => isKind(s, k)), b = was.filter(s => isKind(s, k)); return a.length >= 4 && b.length >= 4 ? [k, avgAcc(a), avgAcc(b)] : null; })
    .filter(Boolean).map(([k, a, b]) => ({k, a, b, d: a - b})).sort((x, y) => y.d - x.d);
  const up = moved[0]?.d >= PCT ? moved[0] : null, down = moved.at(-1)?.d <= -PCT ? moved.at(-1) : null;
  const acc = m => `${fmt(m.a, 2)}%, ${m.d > 0 ? 'up' : 'down'} from ${fmt(m.b, 2)}%`;
  if (up && down) out.push(`Better on <b>${label(up.k)}</b> (${acc(up)}) and worse on <b>${label(down.k)}</b> (${acc(down)}), against the 30 days before.`);
  else if (up || down) out.push(`${up ? 'Better' : 'Worse'} on <b>${label((up || down).k)}</b>: accuracy ${acc(up || down)} in the 30 days before.`);
  const main = list => Object.keys(SPEED).map(k => [k, list.filter(s => s.speedKey === k).length]).sort((a, b) => b[1] - a[1])[0];
  if (now.length >= 5 && was.length >= 5) {
    const [n, nc] = main(now), [b] = main(was);
    if (n !== b && nc / now.length >= .4) out.push(`Mostly <b>${n}×</b> now (${nc} of ${plural(now.length, 'play')}), after mostly ${b}× before.`);
  }
  return out;
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
    return `<span class="mcol ${x.plays ? '' : 'zero'}" style="grid-column:${i + 1};--h:${Math.round(x.plays / max * 100)}" data-tip="<b>${dayName(d)}</b><small>${x.plays ? `${plural(x.plays, 'play')} · ${sgn(x.rp, 1)} RP · rank ${mv(x.rank)}` : 'No plays'}</small>"><i></i></span>`;
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
  // What changed in the month comes before its pace: it says more than how busy it was.
  out.push(...progress(from, to, `in ${name}`, true));
  if (a && a.days >= 5) {
    const w = a.plays / a.days * 7, pm = prevMonth(ym), pa = agg(pm + '-01', from), pn = monthName(pm, {month: 'long'});
    const pw = pa && pa.days >= 7 ? pa.plays / pa.days * 7 : null;
    out.push(`About <b>${fmt(w)}</b> plays a week${pw == null ? ` over ${a.days} tracked days` : pw && Math.abs(w / pw - 1) >= .25 ? `, ${w > pw ? 'up' : 'down'} from <b>${fmt(pw)}</b> in ${pn}` : `, about the same as ${pn}`}.`);
    const busy = c.DAYS.filter(d => d.date >= from && d.date < to).reduce((m, d) => d.plays > m.plays ? d : m, {plays: 0});
    if (busy.plays && a.active >= 3) out.push(`Busiest day: <b>${dm(busy.date)}</b>, ${plural(busy.plays, 'play')}${busy.rp ? ` and ${sgn(busy.rp, 1)} RP` : ''}.`);
  }
  if (plays.length >= 5) {
    const top = MODES.normal.top, tried = Object.keys(SPEED).map(k => [k, plays.filter(s => s.speedKey === k).length, top.filter(s => s.speedKey === k).length])
      .filter(([, n, t]) => n >= 3 && n / plays.length >= .25 && t / Math.max(1, top.length) < .1).sort((x, y) => y[1] - x[1])[0];
    if (tried) out.push(`Trying <b>${tried[0]}×</b>: ${tried[1]} of ${plays.length} listed plays, against ${tried[2]} of the top 100.`);
  }
  if (!plays.length && !(a && a.plays)) out.push(`No plays in ${name}.`);
  return out.slice(0, 8);
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
    ${a ? `<div class="mfig">${fig('Plays', fmt(a.plays))}${fig('Active days', `${a.active} of ${a.days}`)}${fig('RP', sgn(a.rp, 1), tone(a.rp))}${fig('Global rank', mv(a.rank), tone(a.rank))}${fig('Avg. accuracy', sgn(a.accD, 2, ' pp'), tone(a.accD))}</div>` : ''}
    <div class="mbody">
      <div>${a ? strip(ym) : ''}<ul class="notes" id="mnotes">${monthNotes(ym, a, plays).map(n => `<li>${n}</li>`).join('')}</ul></div>
      <div id="mtypes">${typesSlot()}</div>
    </div>
  </div>`;
}

// The momentum notes, what changed in the last 14 days (Lock only: the plays listed with a time are Lock's)
// and the lowest counted play.
function psNotes(mo, floor) {
  const last = c.H.at(-1).date, more = S.mode === 'normal' ? progress(addDays(last, -13), addDays(last, 1), 'in the last 14 days') : [];
  return [...mo.notes, ...more, `Lowest counted play: <b>${fmt(floor)} RP</b>. Anything above it raises the total.`].map(n => `<li>${n}</li>`).join('');
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
            <span class="num">#${fmt(last.globalRank)} now · ${mo.delta ? `${mv(mo.delta)} places` : 'no change'}</span></div>
          ${mo.ref ? `<button class="faq-btn" type="button" data-faq aria-expanded="false" aria-controls="faq">${ico('info')}Status guide</button>` : ''}</div>
        <ul class="notes" id="psnotes">${psNotes(mo, floor)}</ul>
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
      ${S.mode === 'normal' ? review() : ''}${S.mode === 'normal' && ATL.source !== 'online' ? `<div class="panel wide" id="atlasgame">${atlasGame()}</div>` : ''}
      <div class="panel"><div class="panel-head"><h3>Speed mix <span>· top ${top.length}</span></h3></div>${mix(speeds, k => SPEED[k], spd, of)}${legend(speeds, k => SPEED[k], spd)}</div>
      <div class="panel"><div class="panel-head"><h3>Grades <span>· top ${top.length}</span></h3></div>${mix(grades, k => `var(--g-${k})`, grd, of)}${legend(grades, k => `var(--g-${k})`, grd)}</div>
    </div>
    <div class="best">${[['Best accuracy', bAcc, `<b>${fmt(bAcc.acc, 2)}%</b>`], ['Top RP play', bRp, `<b>${fmt(bRp.raw)} RP</b>`], ['Most notes', bNotes, `<b>${fmt(bNotes.beatmapNotes)}</b> notes`]].map(([l, s, v]) =>
      `<a class="bcard" href="/score/${encodeURIComponent(s.id)}" style="background-image:${cssUrl(s.img || s.thumb)}"><span class="bg"></span><span class="lab">${l}</span>
        <span class="txt"><strong title="${esc(s.beatmapTitle)}">${esc(s.beatmapTitle)}</strong><em class="num">${v} · ${s.speedKey}×</em></span></a>`).join('')}</div>`;
}

return {playstyle, loadStyles, review, faq, KIND, BAR_KINDS, monthsOf};
};
