// =============================================
// Reimagined for Rhythia — Exodus compare
// =============================================
// The profile's Compare window: this player against another, as in the 1.2 extension (a duel,
// a radar of accuracy, speed, cleanliness and map wins, and every map both have in their top 100).
// Mounted by pages/profile.js on its player; it owns the shell's #cmp dialog while mounted.

var RhythiaX = RhythiaX || {};

RhythiaX.ExodusCompare = function mountExodusCompare(R, env) {
'use strict';
const {U, MODES, prepare, ico, esc, fmt, sgn, tone, REDUCED, SITE, hideTip, sig, me} = env;
const $ = s => R.querySelector(s);

/* ── Compare (live Rhythia API) — duel, radar and shared-map clashes, as in the extension ── */
const cmp = {timer: 0, other: null, ref: 0, q: '', filter: 'all', sort: 'delta', shown: 20};
const api = (name, body) => RhythiaX.ExodusData.post(name, body);
// Suggestions before a search: the signed-in player, then the top of the global board.
let tops = null;
const tryCard = (p, tag, i) => `<button type="button" class="try-card fadein" style="animation-delay:${i * 40}ms" data-pick="${esc(p.id)}">
  <i class="av" style="background-image:url('${esc(p.avatar)}')"></i>
  <span class="try-who"><b>${esc(p.username)}${p.flag ? `<img class="flg" src="${SITE}/flags/${esc(p.flag)}.svg" alt="${esc(p.flag)}">` : ''}</b>
  <small class="num">${p.position ? `#${fmt(p.position, 0)}` : 'Unranked'}<span> · ${fmt(p.rp, 2)} RP</span></small></span>
  <em class="try-tag">${tag}</em></button>`;
const trySkeleton = n => '<div class="try-card is-load"><i class="av skeleton"></i><span class="try-who"><span class="skeleton" style="width:70%"></span><span class="skeleton" style="width:45%;margin-top:8px"></span></span></div>'.repeat(n);
function tryList() {
  const mine = me && String(me.id) !== String(U.id) ? [tryCard({id: me.id, username: me.username, avatar: me.avatar_url, flag: me.flag, position: me.position, rp: me.skill_points}, 'You', 0)] : [];
  const top = tops ? tops.filter(p => String(p.id) !== String(U.id)).slice(0, 3).map((p, i) => tryCard(p, p.position === 1 ? 'Global #1' : `Top ${p.position}`, mine.length + i)).join('') : trySkeleton(3);
  return `<div class="try"><p class="try-h">Try</p><div class="try-grid">${mine.join('')}${top}</div></div>`;
}
function showTry() {
  const box = $('#cmp-results'); if (!box) return;
  box.innerHTML = tryList();
  if (tops) return;
  RhythiaX.ExodusData.leaderboard('normal').then(list => {
    tops = list;
    const b = $('#cmp-results');
    if (b?.querySelector('.try') && !$('#cmp-q')?.value.trim()) b.innerHTML = tryList();
  }).catch(() => { tops = []; const b = $('#cmp-results'); if (b?.querySelector('.try')) b.innerHTML = tryList(); });
}
function openCompare() {
  const dlg = $('#cmp');
  dlg.innerHTML = `<div class="cmp-head"><h2 id="cmp-title">Compare players</h2><button class="iconbtn" type="button" data-close aria-label="Close">${ico('x')}</button></div>
    <div class="cmp-body" id="cmp-body">
      <label class="field">${ico('search')}<span class="sr">Player</span><input id="cmp-q" type="search" placeholder="Search a player by name" autocomplete="off"></label>
      <div class="results" id="cmp-results"></div>
    </div>`;
  showTry();
  dlg.classList.remove('closing'); dlg.showModal(); $('#cmp-q').focus();
}
function closeCompare() {
  const dlg = $('#cmp');
  if (REDUCED) return dlg.close();
  dlg.classList.add('closing'); setTimeout(() => { dlg.close(); dlg.classList.remove('closing'); }, 170);
}
async function searchPlayers(q) {
  const box = $('#cmp-results'); if (!box) return;
  if (q.trim().length < 2) { showTry(); return; }
  box.innerHTML = '<div class="skeleton" style="margin:14px 4px;width:40%"></div><div class="skeleton" style="margin:10px 4px;width:28%"></div>';
  try {
    const res = ((await api('enhancedSearch', {text: q.trim(), limit: 8})).users || []).filter(u => String(u.id) !== String(U.id));
    box.innerHTML = res.length ? res.slice(0, 8).map((u, i) => `<button type="button" class="fadein who-row" style="animation-delay:${i * 25}ms" data-pick="${esc(u.id)}"><span class="who-l"><i class="av" style="background-image:url('${esc(u.avatar_url)}')"></i><span>${esc(u.username)}${u.flag ? ` <img class="flg" src="${SITE}/flags/${esc(u.flag)}.svg" alt="${esc(u.flag)}">` : ''}</span></span><span class="cap">Compare →</span></button>`).join('')
      : '<div class="cap" style="padding:14px 4px">No players found.</div>';
  } catch (e) { box.innerHTML = `<div class="cap" style="padding:14px 4px">Search failed (${esc(e.message)}).</div>`; }
}
async function pick(id) {
  const body = $('#cmp-body');
  body.innerHTML = `<div class="duel">${[0, 1].map(() => `<div class="duelist"><span class="av"></span><div class="who"><div class="skeleton" style="width:60%"></div><div class="skeleton" style="width:40%;margin-top:8px"></div></div></div>`).join('')}</div>
    <div class="core"><div class="panel" style="height:260px"></div><div class="cards">${'<div class="panel mcard"><div class="skeleton" style="width:50%"></div><div class="skeleton" style="width:80%;margin-top:22px;height:20px"></div></div>'.repeat(4)}</div></div>`;
  try {
    const [p, sc] = await Promise.all([api('getProfile', {session: '', id: Number(id)}), api('getUserScores', {session: '', id: Number(id), limit: 100})]);
    Object.assign(cmp, {other: {u: p.user, top: prepare(sc.top, true)}, ref: 0, q: '', filter: 'all', sort: 'delta', shown: 20});
    renderCompare(true);
  } catch (e) { body.innerHTML = `<div class="empty"><b>Could not load this player</b>${esc(e.message)}</div>`; }
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
    rank: u.position, rp: u.skill_points, plays: u.play_count, time: u.playTime / 3600, country: u.country_position, flag: u.flag};
}
function renderCompare(first) {
  const o = cmp.other, P = [{u: U, top: MODES.normal.top, c: 'var(--accent)'}, {u: o.u, top: o.top, c: 'var(--p2)'}];
  const st = P.map(p => profileStats(p.u, p.top)), bt = battle(), total = bt.clashes.length, wins = [bt.w1, bt.w2];
  const me = cmp.ref, them = 1 - me, A = st[me], B = st[them];
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
  $('#cmp-body').innerHTML = `<div class="duel">${P.map((p, k) => `<button type="button" class="duelist" style="--pc:${p.c}" aria-pressed="${me === k}" data-ref="${k}" ${me === k ? '' : `data-tip="View the comparison as ${esc(p.u.username)}"`}>
        <span class="av" style="background-image:url('${esc(p.u.avatar_url)}')"></span>
        <span class="who"><strong>${esc(p.u.username)}${me === k ? '<span class="as">VIEWING AS</span>' : ''}</strong><span class="cap num">#${fmt(st[k].rank)} global · ${fmt(st[k].rp, 1)} RP</span></span>
        <span class="wins"><b class="num">${wins[k]}<span class="cap"> / ${total}</span></b><span class="cap">map wins</span></span></button>`).join('')}</div>
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
    <div class="clash-head"><h3>Shared maps</h3><span class="cap num" data-tip="<b>RP decides each map</b><small>RP already counts accuracy, misses, speed and difficulty, so a faster play can win with lower accuracy</small>">RP decides each map · ${total} in both top 100s</span></div>
    <div class="clash-tools">
      <label class="field">${ico('search')}<span class="sr">Search shared maps</span><input id="cmp-search" type="search" placeholder="Search beatmap title" value="${esc(cmp.q)}"></label>
      <select class="field" id="cmp-filter" aria-label="Filter"><option value="all" ${cmp.filter === 'all' ? 'selected' : ''}>All shared maps</option><option value="diff" ${cmp.filter === 'diff' ? 'selected' : ''}>Only maps with a different result</option><option value="lost" ${cmp.filter === 'lost' ? 'selected' : ''}>Maps ${esc(P[me].u.username)} lost</option></select>
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
    return `<div class="clash" style="--i:${Math.min(i, 20)}"><span class="thumb" style="background-image:url('${esc(c.a.thumb)}')"></span>
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
