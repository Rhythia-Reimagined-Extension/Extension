// =============================================
// Reimagined for Rhythia — Exodus compare
// =============================================
// The profile's Compare window: this player against another, as in the 1.2 extension (a duel,
// a radar of accuracy, speed, cleanliness and map wins, and every map both have in their top 100),
// plus who is better at what and the map types (streams, jumps…) in each top 100.
// Mounted by pages/profile.js on its player; it owns the shell's #cmp dialog while mounted.

var RhythiaX = RhythiaX || {};

RhythiaX.ExodusCompare = function mountExodusCompare(R, env) {
'use strict';
const {U, MODES, prepare, ico, sgn, tone, hideTip, sig, KIND, BAR_KINDS, OWN} = env;
const {esc, fmt, REDUCED, SITE} = RhythiaX.ExodusKit;
const $ = s => R.querySelector(s);
// A complete url("…") token, safe inside a style attribute (core/kit.js).
const cssUrl = x => RhythiaX.ExodusKit.cssUrl(x);

/* ── Compare (live Rhythia API) — duel, radar and shared-map clashes, as in the extension ── */
// searchSeq and pickSeq: an answer counts only if no newer search or pick (or a close or reopen) came since.
const cmp = {timer: 0, other: null, ref: 0, q: '', filter: 'all', sort: 'delta', shown: 20, sty: new Map(), styAc: null, styDone: 0, styTotal: 0, searchSeq: 0, pickSeq: 0};
const api = (name, body) => RhythiaX.ExodusData.post(name, body);
const gone = () => sig.signal.aborted || !$('#cmp')?.open;
// Leaving the profile stops the map files still being read for the window.
sig.signal.addEventListener('abort', () => cmp.styAc?.abort(), {once: true});
// Suggestions before a search: the signed-in player, the top of the global board, and the players ranked
// just above and just below this profile in Lock (two each side, from Rhythia's leaderboard).
let tops = null, nearby = null;
const tryCard = (p, tag, i) => `<button type="button" class="try-card fadein" style="animation-delay:${i * 40}ms" data-pick="${esc(p.id)}">
  <i class="av" style="background-image:${cssUrl(p.avatar)}"></i>
  <span class="try-who"><b>${esc(p.username)}${p.flag ? `<img class="flg" src="${SITE}/flags/${esc(p.flag)}.svg" alt="${esc(p.flag)}">` : ''}</b>
  <small class="num">${p.position ? `#${fmt(p.position, 0)}` : 'Unranked'}<span> · ${fmt(p.rp, 2)} RP</span></small></span>
  <em class="try-tag">${tag}</em></button>`;
const trySkeleton = n => '<div class="try-card is-load"><i class="av skeleton"></i><span class="try-who"><span class="skeleton" style="width:70%"></span><span class="skeleton" style="width:45%;margin-top:8px"></span></span></div>'.repeat(n);
function tryList() {
  // The signed-in player as the session has it now (the profile may have been drawn before it was read).
  const me = RhythiaX.ExodusData.cachedSelf();
  const mine = me && String(me.id) !== String(U.id) ? [tryCard({id: me.id, username: me.username, avatar: me.avatar_url, flag: me.flag, position: me.position, rp: me.skill_points}, 'You', 0)] : [];
  const top = tops ? tops.filter(p => String(p.id) !== String(U.id)).slice(0, 3).map((p, i) => tryCard(p, p.position === 1 ? 'Global #1' : `Top ${p.position}`, mine.length + i)).join('') : trySkeleton(3);
  const pos = Number(U.position) || 0;
  const near = !pos ? '' : nearby ? (nearby.length ? `<p class="try-h">Near ${OWN ? 'your' : `${esc(U.username)}’s`} rank <span class="num">· #${fmt(pos, 0)}</span></p>
    <div class="try-grid">${nearby.map((p, i) => tryCard(p, p.position < pos ? `${p.position === pos - 1 ? 'Just' : `${pos - p.position}`} above` : `${p.position === pos + 1 ? 'Just' : `${p.position - pos}`} below`, i)).join('')}</div>` : '')
    : `<p class="try-h">Near this rank</p><div class="try-grid">${trySkeleton(4)}</div>`;
  return `<div class="try"><p class="try-h">Try</p><div class="try-grid">${mine.join('')}${top}</div>${near ? `<div class="try-near">${near}</div>` : ''}</div>`;
}
// The leaderboard pages (50 players each) that hold the two places on each side of this profile.
function loadNearby() {
  const pos = Number(U.position) || 0, want = [pos - 2, pos - 1, pos + 1, pos + 2].filter(n => n >= 1);
  if (!pos) { nearby = []; return Promise.resolve(); }
  const pages = [...new Set(want.map(n => Math.ceil(n / 50)))];
  return Promise.all(pages.map(page => api('getLeaderboard', {page, session: RhythiaX.ExodusData.session(), spin: false, vr: false})))
    .then(rs => {
      const rows = rs.flatMap(r => r?.leaderboard || []);
      nearby = want.map(n => rows.find(u => u.position === n)).filter(u => u && String(u.id) !== String(U.id))
        .map(u => ({id: u.id, username: u.username, avatar: u.avatar_url, flag: u.flag, position: u.position, rp: u.skill_points}));
    }, () => { nearby = []; });
}
function showTry() {
  const box = $('#cmp-results'); if (!box) return;
  box.innerHTML = tryList();
  if (tops) { if (!nearby) loadNearby().then(() => { const b = $('#cmp-results'); if (!gone() && b?.querySelector('.try') && !$('#cmp-q')?.value.trim()) b.innerHTML = tryList(); }); return; }
  RhythiaX.ExodusData.leaderboard('normal').then(list => {
    tops = list;
    const b = $('#cmp-results');
    if (!gone() && b?.querySelector('.try') && !$('#cmp-q')?.value.trim()) b.innerHTML = tryList();
  }).catch(() => { tops = []; const b = $('#cmp-results'); if (!gone() && b?.querySelector('.try')) b.innerHTML = tryList(); });
  if (!nearby) loadNearby().then(() => { const b = $('#cmp-results'); if (!gone() && b?.querySelector('.try') && !$('#cmp-q')?.value.trim()) b.innerHTML = tryList(); });
}
function openCompare() {
  const dlg = $('#cmp');
  cmp.searchSeq++; cmp.pickSeq++;
  dlg.innerHTML = `<div class="cmp-head"><h2 id="cmp-title">Compare players</h2><button class="iconbtn" type="button" data-close aria-label="Close">${ico('x')}</button></div>
    <div class="cmp-body" id="cmp-body">
      <label class="field">${ico('search')}<span class="sr">Player</span><input id="cmp-q" type="search" placeholder="Search a player by name" autocomplete="off"></label>
      <div class="results" id="cmp-results"></div>
    </div>`;
  showTry();
  cmp.styAc?.abort();
  dlg.classList.remove('closing'); dlg.classList.add('picking'); dlg.showModal(); $('#cmp-q').focus();
}
function closeCompare() {
  const dlg = $('#cmp');
  cmp.searchSeq++; cmp.pickSeq++; clearTimeout(cmp.timer);
  cmp.styAc?.abort();
  if (REDUCED) return dlg.close();
  dlg.classList.add('closing'); setTimeout(() => { dlg.close(); dlg.classList.remove('closing'); }, 170);
}
async function searchPlayers(q) {
  const box = $('#cmp-results'); if (!box) return;
  const seq = ++cmp.searchSeq;
  if (q.trim().length < 2) { showTry(); return; }
  box.innerHTML = '<div class="skeleton" style="margin:14px 4px;width:40%"></div><div class="skeleton" style="margin:10px 4px;width:28%"></div>';
  try {
    const res = ((await api('enhancedSearch', {text: q.trim(), limit: 8})).users || []).filter(u => String(u.id) !== String(U.id));
    if (seq !== cmp.searchSeq || gone()) return;
    box.innerHTML = res.length ? res.slice(0, 8).map((u, i) => `<button type="button" class="fadein who-row" style="animation-delay:${i * 25}ms" data-pick="${esc(u.id)}"><span class="who-l"><i class="av" style="background-image:${cssUrl(u.avatar_url)}"></i><span>${esc(u.username)}${u.flag ? ` <img class="flg" src="${SITE}/flags/${esc(u.flag)}.svg" alt="${esc(u.flag)}">` : ''}</span></span><span class="cap">Compare →</span></button>`).join('')
      : '<div class="cap" style="padding:14px 4px">No players found.</div>';
  } catch (e) { if (seq === cmp.searchSeq && !gone()) box.innerHTML = `<div class="cap" style="padding:14px 4px">Search failed (${esc(e.message)}).</div>`; }
}
async function pick(id) {
  const body = $('#cmp-body'), seq = ++cmp.pickSeq;
  cmp.searchSeq++; clearTimeout(cmp.timer);
  $('#cmp').classList.remove('picking');
  body.innerHTML = `<div class="duel">${[0, 1].map(() => `<div class="duelist"><span class="av"></span><div class="who"><div class="skeleton" style="width:60%"></div><div class="skeleton" style="width:40%;margin-top:8px"></div></div></div>`).join('')}</div>
    <div class="core"><div class="panel" style="height:260px"></div><div class="cards">${'<div class="panel mcard"><div class="skeleton" style="width:50%"></div><div class="skeleton" style="width:80%;margin-top:22px;height:20px"></div></div>'.repeat(4)}</div></div>`;
  try {
    const [p, sc] = await Promise.all([api('getProfile', {session: '', id: Number(id)}), api('getUserScores', {session: '', id: Number(id), limit: 100})]);
    // Closed, reopened or another player picked meanwhile: this answer is not drawn.
    if (seq !== cmp.pickSeq || gone()) return;
    Object.assign(cmp, {other: {u: p.user, top: prepare(sc.top, true)}, ref: 0, q: '', filter: 'all', sort: 'delta', shown: 20});
    renderCompare(true);
    loadKinds();
  } catch (e) { if (seq === cmp.pickSeq && !gone()) body.innerHTML = `<div class="empty"><b>Could not load this player</b>${esc(e.message)}</div>`; }
}
function battle() {
  const mine = new Map(MODES.normal.top.map(s => [s.songId, s]));
  // The RP Rhythia awarded decides each map: it already weighs accuracy, misses, speed and the map's
  // difficulty, so 98% at 1.45× beats 99.9% at 1.00×. Plain accuracy only settles maps where neither got RP.
  const clashes = cmp.other.top.filter(s => mine.has(s.songId)).map(s => {
    const a = mine.get(s.songId), byRp = a.raw > 0 || s.raw > 0, delta = byRp ? a.raw - s.raw : a.acc - s.acc;
    return {a, b: s, byRp, delta, winner: Math.abs(delta) < (byRp ? .5 : .001) ? 0 : delta > 0 ? 1 : 2};
  });
  return {clashes, w1: clashes.filter(c => c.winner === 1).length, w2: clashes.filter(c => c.winner === 2).length};
}
function profileStats(u, top) {
  const avg = f => top.length ? top.reduce((x, s) => x + f(s), 0) / top.length : 0;
  const notes = top.reduce((x, s) => x + (s.beatmapNotes || 0), 0), misses = top.reduce((x, s) => x + s.misses, 0);
  return {acc: avg(s => s.acc), speed: avg(s => Number(s.speedKey)), miss: notes ? misses / notes * 100 : 0, perMap: top.length ? misses / top.length : 0,
    best: top.reduce((m, s) => !m || s.raw > m.raw ? s : m, null), floor: top.length ? Math.min(...top.map(s => s.raw)) : 0, full: top.length >= 100,
    rank: u.position, rp: u.skill_points, plays: u.play_count, time: u.playTime / 3600, country: u.country_position, flag: u.flag};
}
function model() {
  const o = cmp.other, P = [{u: U, top: MODES.normal.top, c: 'var(--accent)', t: 'var(--accent-2)'}, {u: o.u, top: o.top, c: 'var(--p2)', t: 'var(--p2-text)'}];
  const bt = battle();
  return {o, P, st: P.map(p => profileStats(p.u, p.top)), bt, total: bt.clashes.length, wins: [bt.w1, bt.w2], me: cmp.ref, them: 1 - cmp.ref};
}

/* ── Map types (ExodusMapKit through ExodusData.mapStyles): saved results at once, the rest while the window is open ── */
const NOUN = {jump: ['jumps', 'jump'], stream: ['streams', 'stream'], tech: ['techs', 'tech'], varied: ['varied maps', 'varied']};
const kindOf = s => cmp.sty.get(s.songId)?.kind;
const isKind = (s, k) => cmp.sty.get(s.songId)?.kind === k;
const mean = (l, f) => l.length ? l.reduce((x, s) => x + f(s), 0) / l.length : 0;
function loadKinds() {
  cmp.styAc?.abort();
  const ids = [...new Set([...MODES.normal.top, ...cmp.other.top].map(s => s.songId))];
  cmp.sty = RhythiaX.ExodusData.storedStyles(ids); cmp.styTotal = 0;
  if (ids.every(id => cmp.sty.has(id))) return paintKinds();
  const ac = new AbortController(); cmp.styAc = ac;
  cmp.styDone = cmp.sty.size; cmp.styTotal = ids.length;
  let queued = false;
  const later = () => { if (!queued) { queued = true; setTimeout(() => { queued = false; if (!ac.signal.aborted) paintKinds(); }, 250); } };
  paintKinds();
  RhythiaX.ExodusData.mapStyles(ids, ac.signal, (done, total) => { cmp.styDone = done; cmp.styTotal = total; later(); })
    .then(map => { if (ac.signal.aborted) return; cmp.sty = map; cmp.styTotal = 0; paintKinds(); })
    .catch(() => { if (!ac.signal.aborted) { cmp.styTotal = 0; paintKinds(); } });
}
function paintKinds() {
  const sum = $('#cmp-sum'), sty = $('#cmp-style');
  if (!cmp.other || !sum || !sty) return;
  const m = model(), K = kinds(m);
  sum.outerHTML = summary(m, K); sty.outerHTML = styleBlock(m, K);
}
// Per map type: each player's maps of that type in their top 100, and the shared maps of that type. Only the
// four types a map is (BAR_KINDS): quantum is a mark on top of a type, not a type to compare players on.
// The shared maps decide when there are enough of them; otherwise RP per play does (RP already weighs
// accuracy, misses, speed and difficulty).
function kinds(m) {
  return BAR_KINDS.map(k => {
    const side = m.P.map(p => { const l = p.top.filter(s => isKind(s, k)); return {n: l.length, acc: mean(l, s => s.acc), speed: mean(l, s => +s.speedKey), rp: mean(l, s => s.raw)}; });
    const shared = m.bt.clashes.filter(c => isKind(c.a, k)), w = [shared.filter(c => c.winner === 1).length, shared.filter(c => c.winner === 2).length];
    const on = [0, 1].map(i => ({acc: mean(shared, c => (i ? c.b : c.a).acc), speed: mean(shared, c => +(i ? c.b : c.a).speedKey)}));
    let lead = -1, by = '';
    if (w[0] + w[1] >= 3 && Math.abs(w[0] - w[1]) >= 2) { lead = w[0] > w[1] ? 0 : 1; by = 'wins'; }
    else if (side[0].n >= 3 && side[1].n >= 3 && Math.max(side[0].rp, side[1].rp) >= Math.min(side[0].rp, side[1].rp) * 1.08) { lead = side[0].rp > side[1].rp ? 0 : 1; by = 'rp'; }
    return {k, side, shared: shared.length, w, on, lead, by};
  });
}
// How the leader plays them against the other player: "playing them faster (1.42× vs 1.10×) and more accurately (…)".
const SIMILAR = ' at similar speed and accuracy';
function how(a, b) {
  const pro = [], con = [], sp = `${fmt(a.speed, 2)}× vs ${fmt(b.speed, 2)}×`, ac = `${fmt(a.acc, 2)}% vs ${fmt(b.acc, 2)}%`;
  if (a.speed - b.speed >= .05) pro.push(`faster (${sp})`); else if (b.speed - a.speed >= .05) con.push(`slower (${sp})`);
  if (a.acc - b.acc >= .2) pro.push(`more accurately (${ac})`); else if (b.acc - a.acc >= .2) con.push(`less accurately (${ac})`);
  return pro.length ? ` playing them ${pro.join(' and ')}${con.length ? `, but ${con.join(' and ')}` : ''}` : con.length ? ` even playing them ${con.join(' and ')}` : SIMILAR;
}
function kindWhy(r) {
  const L = r.lead, O = 1 - L, noun = NOUN[r.k][1];
  if (r.by === 'wins') return `Won <b>${r.w[L]} of ${r.w[L] + r.w[O]}</b> shared ${noun} maps,${how(r.on[L], r.on[O])}.`;
  const a = r.side[L], b = r.side[O], h = how(a, b);
  return `<b>${fmt(a.rp)} RP</b> per ${noun} play against ${fmt(b.rp)},${h}${h === SIMILAR ? ', so on harder maps' : ''}.`;
}
// Each line says who leads and why, with both players' own numbers. Map types come first.
function verdicts(m, K) {
  const {st, total, wins} = m, out = [];
  const by = (x, y, min) => Math.abs(x - y) < min ? -1 : x > y ? 0 : 1;
  const ratio = (x, y, r) => Math.max(x, y) >= Math.min(x, y) * r && x !== y ? (x > y ? 0 : 1) : -1;
  const add = (w, title, why) => { if (w >= 0) out.push({who: w, title, why: why(w, 1 - w)}); };
  for (const r of K) add(r.lead, `Stronger on ${NOUN[r.k][0]}`, () => kindWhy(r));
  const ties = total - wins[0] - wins[1];
  add(by(wins[0], wins[1], 1), 'Wins more shared maps', (w, o) => `<b>${wins[w]} of ${total}</b> maps both have in their top 100, against ${wins[o]}${ties ? ` (${ties} even)` : ''}.`);
  add(by(st[0].acc, st[1].acc, .1), 'More accurate', (w, o) => `<b>${fmt(st[w].acc, 2)}%</b> average accuracy on the top 100, against ${fmt(st[o].acc, 2)}%.`);
  add(by(st[0].speed, st[1].speed, .03), 'Plays faster', (w, o) => `<b>${fmt(st[w].speed, 2)}×</b> average speed, against ${fmt(st[o].speed, 2)}×.`);
  add(by(st[1].miss, st[0].miss, .1), 'Misses less', (w, o) => `<b>${fmt(st[w].miss, 2)}%</b> of notes missed, about ${fmt(st[w].perMap)} a map, against ${fmt(st[o].miss, 2)}% (${fmt(st[o].perMap)} a map).`);
  if (st[0].best && st[1].best) add(ratio(st[0].best.raw, st[1].best.raw, 1.03), 'Higher best play',
    (w, o) => `<b>${fmt(st[w].best.raw)} RP</b> on ${esc(st[w].best.beatmapTitle)} at ${st[w].best.speedKey}×, against ${fmt(st[o].best.raw)} RP.`);
  if (st[0].full && st[1].full) add(ratio(st[0].floor, st[1].floor, 1.05), 'Deeper top 100',
    (w, o) => `The 100th play is worth <b>${fmt(st[w].floor)} RP</b>, against ${fmt(st[o].floor)}.`);
  return out;
}
function summary(m, K) {
  const v = verdicts(m, K), order = [m.me, m.them], n = order.map(i => v.filter(x => x.who === i).length);
  // The viewed player's leads first; each point names its leader, so a one-sided duel leaves no empty column.
  const items = order.flatMap(i => v.filter(x => x.who === i));
  return `<div class="panel cmp-sum" id="cmp-sum"><div class="panel-head"><h3>Who is better at what <span>· from both top 100s</span></h3>
      <span class="sum-score num">${order.map((i, j) => `<b style="color:${m.P[i].t}">${esc(m.P[i].u.username)} ${n[j]}</b>`).join('<i>·</i>')}</span></div>
    ${items.length ? `<ul class="sum-list">${items.map(x => { const p = m.P[x.who];
      return `<li style="--pc:${p.c};--pt:${p.t}"><header><b>${x.title}</b><em>${esc(p.u.username)}</em></header><span>${x.why}</span></li>`; }).join('')}</ul>`
      : '<p class="cap">No clear lead either way.</p>'}
    ${cmp.styTotal ? '<p class="cap">Map types are still loading.</p>' : ''}</div>`;
}
function styleBlock(m, K) {
  const head = '<div class="panel-head"><h3>Playstyle <span>· map types in each top 100</span></h3></div>';
  if (cmp.styTotal) return `<div class="panel cmp-style" id="cmp-style">${head}<div class="mt-load" role="status"><span>Reading map files <b class="num">${cmp.styDone} of ${cmp.styTotal}</b></span><i style="--p:${Math.round(cmp.styDone / cmp.styTotal * 100)}%"></i></div></div>`;
  const order = [m.me, m.them], known = m.P.map(p => p.top.filter(kindOf).length);
  if (!known[0] && !known[1]) return `<div class="panel cmp-style" id="cmp-style">${head}<p class="cap">Could not read the map files.</p></div>`;
  const bars = order.map(i => {
    const p = m.P[i], rows = K.map(r => [r.k, r.side[i].n]), main = rows.slice().sort((a, b) => b[1] - a[1])[0];
    return `<div class="ps-row"><span class="ps-who" style="color:${p.t}">${esc(p.u.username)}</span>
      <div class="stack">${rows.filter(r => r[1]).map(([k, n]) => `<i style="flex:${n};background:var(--k-${k})" data-tip="<b>${KIND[k][0]}</b><small>${n} of ${known[i]} maps in ${esc(p.u.username)}’s top 100<br>${KIND[k][1]}</small>"></i>`).join('')}</div>
      <span class="ps-main">${main[1] ? `${main[1] * 2 >= known[i] ? 'Mostly' : 'Most often'} <b>${NOUN[main[0]][0]}</b> · ${main[1]} of ${known[i]}` : '—'}</span></div>`;
  }).join('');
  const cards = K.map(r => {
    const [a, b] = order.map(i => r.side[i]), [pa, pb] = order.map(i => m.P[i]), both = a.n && b.n;
    if (!a.n && !b.n) return `<div class="k-card none" style="--c:var(--k-${r.k})"><header><strong>${KIND[r.k][0]}</strong></header><p>None in either top 100.</p></div>`;
    // Two cells per row; the better one takes its player's colour, and only when both players have maps of this type.
    const pair = (va, vb, f, better) => [[va, vb, a, pa], [vb, va, b, pb]].map(([x, y, side, p]) => {
      const hi = both && better && better(x, y);
      return `<em class="num ${hi ? 'lead' : ''}" style="${hi ? `color:${p.t}` : ''}">${side.n ? f(x) : '—'}</em>`;
    }).join('');
    const row = (label, tip, cells) => `<small data-tip="<small>${tip}</small>">${label}</small>${cells}`;
    const wv = order.map(i => r.w[i]);
    const edge = r.lead < 0 ? '<em class="edge even">Even</em>' : `<em class="edge" style="--pc:${m.P[r.lead].c};--pt:${m.P[r.lead].t}">${esc(m.P[r.lead].u.username)}</em>`;
    return `<div class="k-card" style="--c:var(--k-${r.k})"><header><strong data-tip="<b>${KIND[r.k][0]}</b><small>${KIND[r.k][1]}</small>">${KIND[r.k][0]}</strong>${edge}</header>
      <div class="k-grid"><span></span><span class="h" style="color:${pa.t}">${esc(pa.u.username)}</span><span class="h" style="color:${pb.t}">${esc(pb.u.username)}</span>
        ${row('Maps', 'Maps of this type in each top 100', `<em class="num">${fmt(a.n)}</em><em class="num">${fmt(b.n)}</em>`)}
        ${row('Accuracy', 'Average accuracy on these maps', pair(a.acc, b.acc, x => fmt(x, 2) + '%', (x, y) => x - y >= .1))}
        ${row('Speed', 'Average speed on these maps', pair(a.speed, b.speed, x => fmt(x, 2) + '×', (x, y) => x - y >= .03))}
        ${row('RP / play', 'Average RP of one play on these maps', pair(a.rp, b.rp, x => fmt(x), (x, y) => x >= y * 1.03))}
        ${row('Shared wins', `Maps of this type both have in their top 100 (${r.shared}), and how many each won`, r.shared
          ? [[wv[0], wv[1], pa], [wv[1], wv[0], pb]].map(([x, y, p]) => `<em class="num ${x > y ? 'lead' : ''}" style="${x > y ? `color:${p.t}` : ''}">${x}</em>`).join('') : '<em>—</em><em>—</em>')}
      </div></div>`;
  }).join('');
  const partial = known.some((n, i) => n < m.P[i].top.length);
  return `<div class="panel cmp-style" id="cmp-style">${head}<div class="ps-rows">${bars}</div><div class="k-cards">${cards}</div>
    ${partial ? `<p class="cap">Maps read: ${order.map(i => `${known[i]} of ${m.P[i].top.length} for ${esc(m.P[i].u.username)}`).join(', ')}.</p>` : ''}</div>`;
}

function renderCompare(first) {
  const m = model(), {o, P, st, bt, total, wins, me, them} = m, A = st[me], B = st[them], K = kinds(m);
  // Diamond radar: accuracy (top), speed (right), cleanliness (bottom), map wins (left). Same scaling as the extension.
  const C = {x: 150, y: 116}, R = 76;
  const coords = (s, w) => {
    const n = v => Math.max(.15, Math.min(1, v));
    const acc = n((s.acc - 85) / 15), spd = n((s.speed - .9) / .6), cln = n((100 - s.miss) / 100), win = n(total ? w / total : .5);
    return `${C.x},${C.y - acc * R} ${C.x + spd * R},${C.y} ${C.x},${C.y + cln * R} ${C.x - win * R},${C.y}`;
  };
  const ring = k => `${C.x},${C.y - R * k} ${C.x + R * k},${C.y} ${C.x},${C.y + R * k} ${C.x - R * k},${C.y}`;
  const card = (title, va, vb, fa, delta, dTxt, lowWins = false) => {
    const aLead = lowWins ? va <= vb : va >= vb;
    return `<div class="panel mcard"><header><span>${title}</span><span class="dpill ${tone(delta)}">${dTxt}</span></header>
      <div class="pair"><div><small>${esc(P[me].u.username)}</small><b class="num ${aLead ? 'lead' : ''}" style="${aLead ? `color:${P[me].c}` : ''}">${fa(va)}</b></div>
        <div><small>${esc(P[them].u.username)}</small><b class="num ${!aLead ? 'lead' : ''}" style="${!aLead ? `color:${P[them].c}` : ''}">${fa(vb)}</b></div></div>
      <div class="split"><i style="flex-grow:${lowWins ? (vb || 1) : (va || 0.01)};background:${P[me].c}"></i><i style="flex-grow:${lowWins ? (va || 1) : (vb || 0.01)};background:${P[them].c}"></i></div></div>`;
  };
  const dAcc = A.acc - B.acc, dSpd = A.speed - B.speed, dMiss = B.miss - A.miss, dWin = wins[me] - wins[them];
  const head = $('#cmp-title'); head.innerHTML = `Compare players<span class="num">${total} shared maps</span>`;
  $('#cmp-body').innerHTML = `<div class="duel">${P.map((p, k) => `<button type="button" class="duelist" style="--pc:${p.c}" aria-pressed="${me === k}" data-ref="${k}" ${me === k ? '' : `data-tip="View as ${esc(p.u.username)}"`}>
        <span class="av" style="background-image:${cssUrl(p.u.avatar_url)}"></span>
        <span class="who"><strong>${esc(p.u.username)}${me === k ? '<span class="as">VIEWING AS</span>' : ''}</strong><span class="cap num">#${fmt(st[k].rank)} global · ${fmt(st[k].rp, 1)} RP</span></span>
        <span class="wins"><b class="num">${wins[k]}<span class="cap"> / ${total}</span></b><span class="cap">map wins</span></span></button>`).join('')}</div>
    ${summary(m, K)}
    <div class="core">
      <div class="panel radar"><svg viewBox="0 0 300 232" role="img" aria-label="Radar of accuracy, speed, cleanliness and map wins">
          ${[1, .66, .33].map(k => `<polygon points="${ring(k)}" fill="none" style="stroke:rgba(var(--ink),.08)"/>`).join('')}
          <line x1="${C.x}" y1="${C.y - R - 6}" x2="${C.x}" y2="${C.y + R + 6}" style="stroke:rgba(var(--ink),.08)" stroke-dasharray="2 3"/><line x1="${C.x - R - 6}" y1="${C.y}" x2="${C.x + R + 6}" y2="${C.y}" style="stroke:rgba(var(--ink),.08)" stroke-dasharray="2 3"/>
          <polygon class="p2" points="${coords(st[1], wins[1])}" ${first ? '' : 'style="animation:none"'}/><polygon class="p1" points="${coords(st[0], wins[0])}" ${first ? '' : 'style="animation:none"'}/>
          <text x="${C.x}" y="${C.y - R - 14}" text-anchor="middle">ACCURACY</text><text x="${C.x + R + 12}" y="${C.y + 4}">SPEED</text>
          <text x="${C.x}" y="${C.y + R + 22}" text-anchor="middle">CLEANLINESS</text><text x="${C.x - R - 12}" y="${C.y + 4}" text-anchor="end">WINS</text>
        </svg><div class="key">${P.map(p => `<span style="--pc:${p.c}">${esc(p.u.username)}</span>`).join('')}</div></div>
      <div class="cards">
        ${card('Average accuracy', A.acc, B.acc, v => fmt(v, 2) + '%', dAcc, sgn(dAcc, 2, '%'))}
        ${card('Average speed', A.speed, B.speed, v => fmt(v, 2) + '×', dSpd, sgn(dSpd, 2, '×'))}
        ${card('Miss rate', A.miss, B.miss, v => fmt(v, 2) + '%', dMiss, dMiss >= 0 ? `${fmt(dMiss, 2)}% cleaner` : `${fmt(-dMiss, 2)}% more misses`, true)}
        ${card('Map wins', wins[me], wins[them], v => fmt(v), dWin, dWin >= 0 ? `${dWin} maps ahead` : `${-dWin} maps behind`)}
      </div>
    </div>
    <div class="facts-row">
      ${[['Global rank', s => '#' + fmt(s.rank)], ['Rhythm points', s => fmt(s.rp, 1)], ['Play count', s => fmt(s.plays)], ['Playtime', s => fmt(s.time) + 'h']].map(([l, f]) =>
        `<div class="panel"><small>${l}</small><b class="num"><span style="color:var(--accent-2)">${f(st[0])}</span><i>vs</i><span style="color:var(--p2-text)">${f(st[1])}</span></b></div>`).join('')}
    </div>
    ${styleBlock(m, K)}
    <div class="clash-head"><h3>Shared maps</h3><span class="cap num" data-tip="<b>RP decides each map</b><small>RP already counts accuracy, misses, speed and difficulty</small>">${total} in both top 100s</span></div>
    <div class="clash-tools">
      <label class="field">${ico('search')}<span class="sr">Search shared maps</span><input id="cmp-search" type="search" placeholder="Search beatmap title" value="${esc(cmp.q)}"></label>
      <select class="field" id="cmp-filter" aria-label="Filter"><option value="all" ${cmp.filter === 'all' ? 'selected' : ''}>All shared maps</option><option value="diff" ${cmp.filter === 'diff' ? 'selected' : ''}>Not tied</option><option value="lost" ${cmp.filter === 'lost' ? 'selected' : ''}>Maps ${esc(P[me].u.username)} lost</option></select>
      <select class="field" id="cmp-sort" aria-label="Sort"><option value="delta" ${cmp.sort === 'delta' ? 'selected' : ''}>Biggest difference</option><option value="acc" ${cmp.sort === 'acc' ? 'selected' : ''}>Best accuracy</option><option value="speed" ${cmp.sort === 'speed' ? 'selected' : ''}>Highest speed</option></select>
    </div>
    <div class="clash clash-cols" aria-hidden="true"><span></span><span class="cap">Map</span><span class="cap" style="color:var(--accent-2)">${esc(U.username)}</span><span class="cap" style="color:var(--p2-text)">${esc(o.u.username)}</span><span class="cap" style="text-align:right">${esc(P[me].u.username)} ±</span></div>
    <div class="clashes" id="clashes">${clashList(bt, P)}</div>`;
}
function clashList(bt, P) {
  const me = cmp.ref;
  let items = bt.clashes.slice();
  if (cmp.q) { const q = cmp.q.toLowerCase(); items = items.filter(c => c.a.beatmapTitle.toLowerCase().includes(q)); }
  if (cmp.filter === 'diff') items = items.filter(c => c.winner !== 0);
  if (cmp.filter === 'lost') items = items.filter(c => c.winner === (me === 0 ? 2 : 1));
  items.sort(cmp.sort === 'acc' ? (x, y) => Math.max(y.a.acc, y.b.acc) - Math.max(x.a.acc, x.b.acc)
    : cmp.sort === 'speed' ? (x, y) => Math.max(+y.a.speedKey, +y.b.speedKey) - Math.max(+x.a.speedKey, +x.b.speedKey)
    : (x, y) => Math.abs(y.delta) - Math.abs(x.delta));
  if (!items.length) return '<div class="panel empty">No shared maps match.</div>';
  const pillOf = (s, k, won) => `<div class="spill ${won ? 'win' : ''}" style="--pc:${P[k].c}"><span class="sp-main"><b class="num">${fmt(s.raw)}<small> RP</small></b><small class="num">${fmt(s.acc, 2)}% · ${s.speedKey}×</small></span><small class="num">${s.fc ? 'FC' : `${fmt(s.misses)} miss${s.misses === 1 ? '' : 'es'}`}</small></div>`;
  return items.slice(0, cmp.shown).map((c, i) => {
    const d = me === 0 ? c.delta : -c.delta;
    return `<div class="clash" style="--i:${Math.min(i, 20)}"><span class="thumb" style="background-image:${cssUrl(c.a.thumb)}"></span>
      <div class="t"><strong title="${esc(c.a.beatmapTitle)}">${esc(c.a.beatmapTitle)}</strong><small class="num">${c.a.stars ? `★ ${fmt(c.a.stars, 2)} · ` : ''}${fmt(c.a.beatmapNotes)} notes</small></div>
      ${pillOf(c.a, 0, c.winner === 1)}${pillOf(c.b, 1, c.winner === 2)}
      <span class="delta num ${tone(d)}">${c.byRp ? sgn(d, 0, ' RP') : sgn(d, 2, '%')}</span></div>`;
  }).join('') + (items.length > cmp.shown ? `<div style="text-align:center;margin-top:8px"><button class="btn" type="button" data-more-clashes>Show ${Math.min(20, items.length - cmp.shown)} more · ${items.length - cmp.shown} left</button></div>` : '');
}
const refreshClashes = () => { const o = cmp.other; $('#clashes').innerHTML = clashList(battle(), [{u: U, c: 'var(--accent)'}, {u: o.u, c: 'var(--p2)'}]); };

R.addEventListener('click', e => {
  const t = e.target.closest?.('#cmp [data-close],#cmp [data-pick],#cmp [data-ref],#cmp [data-more-clashes]');
  if (!t || t.disabled) return;
  const d = t.dataset;
  if (t.hasAttribute('data-close')) return closeCompare();
  if (d.pick) return pick(d.pick);
  if (d.ref) { if (cmp.ref !== Number(d.ref)) { cmp.ref = Number(d.ref); hideTip(); renderCompare(false); } return; }
  if (t.hasAttribute('data-more-clashes')) { cmp.shown += 20; refreshClashes(); }
}, sig);
R.addEventListener('input', e => {
  if (e.target.id === 'cmp-q') { clearTimeout(cmp.timer); const v = e.target.value; cmp.timer = setTimeout(() => searchPlayers(v), 250); }
  if (e.target.id === 'cmp-search') { cmp.q = e.target.value; cmp.shown = 20; refreshClashes(); }
}, sig);
R.addEventListener('change', e => {
  if (e.target.id === 'cmp-filter') { cmp.filter = e.target.value; cmp.shown = 20; refreshClashes(); }
  if (e.target.id === 'cmp-sort') { cmp.sort = e.target.value; refreshClashes(); }
}, sig);
$('#cmp').addEventListener('cancel', e => { e.preventDefault(); closeCompare(); }, sig);
$('#cmp').addEventListener('click', e => { if (e.target === e.currentTarget) closeCompare(); }, sig);

return {open: openCompare};
};

// The Compare window's own styles; core/shell.js puts them right after the profile's (pages/profile-style.js).
RhythiaX.ExodusCompare.css = `
.who-row .who-l{display:flex;align-items:center;gap:10px;min-width:0}
.who-row .av{flex:none;width:30px;height:30px;border-radius:50%;background:var(--panel-3) center/cover}
.who-row .flg{width:16px;vertical-align:-2px;margin-left:4px;border-radius:2px}
.try{padding:18px 2px 4px}
.try-h{margin:0 0 10px;font-size:14px;font-weight:650;color:var(--text-2)}
.try-h span{font-weight:500;color:var(--muted)}
.try-near{margin-top:16px}
.try-grid{display:grid;grid-template-columns:minmax(0,1fr);gap:6px}
.try-card{display:flex;align-items:center;gap:12px;min-width:0;padding:10px 14px;border:0;border-radius:14px;background:var(--panel-2);box-shadow:inset 0 0 0 1px var(--line);color:var(--text);text-align:left;transition:background-color .15s,box-shadow .15s,transform .2s var(--ease)}
.try-card:not(.is-load):hover{background:var(--panel-3);box-shadow:inset 0 0 0 1px var(--line-2);transform:translateY(-2px)}
.try-card:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.try-card .av{flex:none;width:40px;height:40px;border-radius:50%;background:var(--panel-3) center/cover;box-shadow:0 0 0 2px var(--line-2)}
.try-who{display:flex;flex-direction:column;min-width:0;flex:1}
.try-who b{display:flex;align-items:center;gap:6px;font-size:15px;font-weight:650;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.try-who .flg{width:16px;border-radius:2px;flex:none}
.try-who small{margin-top:3px;font-size:13px;color:var(--text-2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.try-who small span{color:var(--muted)}
.try-tag{flex:none;align-self:center;padding:3px 8px;border-radius:999px;font-style:normal;font-size:12px;font-weight:650;color:var(--accent-2);background:color-mix(in srgb,var(--accent) 14%,transparent)}
@media (prefers-reduced-motion:reduce){.try-card{transition:none}.try-card:not(.is-load):hover{transform:none}}
/* Compare: one scroll area under the header, a narrow window while picking a player */
dialog.cmp[open]{display:flex;flex-direction:column;overflow:hidden}
dialog.cmp{transition:width .25s var(--ease)}
dialog.cmp.picking{width:min(620px,calc(100vw - 32px))}
/* Compare: who is better at what */
.cmp-sum,.cmp-style{margin-top:12px;padding:18px 20px}
.cmp-sum .panel-head,.cmp-style .panel-head{margin-bottom:14px}
.sum-score{display:flex;align-items:center;gap:8px;font-size:13px}
.sum-score b{font-weight:700}
.sum-score i{font-style:normal;color:var(--muted)}
.sum-list{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:14px 28px;margin:0;padding:0;list-style:none}
.sum-list li{min-width:0;padding-left:12px;box-shadow:inset 2px 0 0 var(--pc);font-size:13.5px;line-height:1.5;color:var(--text-2)}
.sum-list header{display:flex;align-items:baseline;justify-content:space-between;gap:10px;margin-bottom:2px}
.sum-list header b{font-size:14px;font-weight:650;color:var(--text)}
.sum-list header em{flex:none;font-style:normal;font-size:12px;font-weight:700;color:var(--pt)}
.sum-list span b{color:var(--text);font-weight:650}
.cmp-sum > .cap,.cmp-style > .cap{margin:14px 0 0}
/* Compare: playstyle, map types in each top 100 */
.ps-rows{display:flex;flex-direction:column;gap:10px}
.ps-row{display:grid;grid-template-columns:120px minmax(0,1fr) 190px;gap:14px;align-items:center}
.ps-who{font-size:14px;font-weight:650;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ps-row .stack{margin:0;height:12px}
.ps-main{font-size:13px;color:var(--text-2);text-align:right;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ps-main b{color:var(--text);font-weight:650}
.k-cards{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-top:18px}
.k-card{min-width:0;padding:12px 14px 14px;border-radius:12px;background:var(--panel-2);box-shadow:inset 0 0 0 1px var(--line)}
.k-card.none{opacity:.45}
.k-card header{display:flex;align-items:center;justify-content:space-between;gap:8px;min-height:22px;margin-bottom:10px}
.k-card header strong{display:inline-flex;align-items:center;gap:8px;font-size:14px;font-weight:650;white-space:nowrap}
.k-card header strong::before{content:"";width:10px;height:10px;border-radius:3px;background:var(--c)}
.k-card .edge{min-width:0;padding:2px 8px;border-radius:999px;font-style:normal;font-size:11.5px;font-weight:700;color:var(--pt);background:color-mix(in srgb,var(--pc) 15%,transparent);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.k-card .edge.even{color:var(--muted);background:rgba(var(--ink),.06)}
/* The label column never gets narrower than its words, so a number never runs over "Accuracy". */
.k-grid{display:grid;grid-template-columns:minmax(max-content,1fr) auto auto;gap:7px 12px;align-items:baseline;font-size:13px}
.k-grid .h{max-width:72px;font-size:11.5px;font-weight:650;text-align:right;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.k-grid small{font-size:12.5px;color:var(--muted);white-space:nowrap}
.k-grid em{font-style:normal;text-align:right;color:var(--text-2)}
.k-grid em.lead{font-weight:700}
.k-card > p{margin:0;font-size:12.5px;color:var(--muted)}
@media (max-width:1200px){.k-cards{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media (max-width:900px){.k-cards{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media (max-width:760px){.ps-row{grid-template-columns:minmax(0,1fr) auto;gap:6px 12px}.ps-row .stack{grid-column:1/-1;grid-row:2}}
@media (max-width:640px){
  .sum-list{grid-template-columns:minmax(0,1fr)}
  .k-cards{grid-template-columns:minmax(0,1fr)}
}
@media (prefers-reduced-motion:reduce){dialog.cmp{transition:none}}
`;
