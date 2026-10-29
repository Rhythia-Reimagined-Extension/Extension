// =============================================
// Reimagined for Rhythia — Exodus score page
// =============================================
// /score/:id: the play, how it stands on its map, Rhythia's replay player (laid over a slot
// by the shell) and what the map file says about the map.

var RhythiaX = RhythiaX || {};

(function () {
'use strict';
const K = () => RhythiaX.ExodusKit;
const {SITE, Data, Kit, esc, cssUrl, fmt, REDUCED, when, ago, fullDate, diff, status, grade, GRADE_C, MODES, mods, av, accTxt, shell, slot, playsHtml, playsNote, REPLAY_SPEEDS, speedLabel, ask, row, morph} = RhythiaX.ExodusKit;

/* ════════════════════ Score ════════════════════ */
function score(host, ctx) {
  const R = host.shadowRoot, ac = new AbortController(), sig = {signal: ac.signal}, $ = s => R.querySelector(s);
  const ui = shell(R, sig);
  const id = ctx.id;
  const S = {d: null, hist: undefined, allowed: false, plays: null, playsErr: '', enter: true, dock: null, live: false, speed: 0};

  function hero(d) {
    // The score as data.js keeps it carries no letter of Rhythia's own; a play marked as failed is F.
    const s = d.score, m = d.map, acc = s.acc ?? 0, g = grade(acc, s.misses, undefined, s.passed === false), [dl, dc] = diff(m?.difficulty ?? s.difficulty);
    const C = 2 * Math.PI * 52, off = C * (1 - Math.min(100, acc) / 100);
    return `<section class="v-hero ${S.enter ? 'enter' : ''}"><div class="v-banner" style="background-image:${cssUrl(m?.art || '')}"></div><div class="container v-hero-in">
      <div class="v-ring" style="--g:${GRADE_C[g]}" data-tip="<b>${accTxt(s.acc)} accuracy</b><small>Grade ${g}</small>">
        <svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="52" class="bg"/><circle cx="60" cy="60" r="52" class="fg" style="stroke-dasharray:${C};stroke-dashoffset:${REDUCED || !S.enter ? off : C};--off:${off}"/></svg>
        <span><b>${esc(g)}</b><small class="num">${accTxt(s.acc)}</small></span></div>
      <div class="v-who">
        <span class="cap">Score</span>
        <h1>${m ? `<a href="/maps/${esc(m.id)}">${esc(s.title || m.title)}</a>` : esc(s.title)}</h1>
        <p class="v-by"><a class="v-player" href="/player/${esc(s.userId)}">${av(d.top.find(x => x.userId === s.userId)?.avatar || d.best?.avatar || '')}${esc(s.username)}</a>
          <span data-tip="<b>${esc(fullDate(s.at))}</b>">${esc(ago(s.at))}</span>${m ? `<span>mapped by <a href="/player/${esc(m.mapperId)}">${esc(m.mapper)}</a></span>` : ''}</p>
        <div class="v-chips"><span class="v-chip" style="--c:${dc}">${dl}</span>${m ? `<span class="v-chip" style="--c:${status(m)[1]}">${status(m)[0]}</span><span class="v-chip plain num">★ ${fmt(m.stars, 2)}</span>` : ''}
          <span class="v-chip plain"><img src="${SITE}/${MODES[d.mode][1]}" alt="">${MODES[d.mode][0]}</span>${s.passed === false ? '<span class="v-chip" style="--c:var(--bad)">Failed</span>' : ''}${mods(s)}</div>
      </div></div>
      <div class="container"><div class="v-kpis">
        <div><small>Accuracy</small><b class="num">${accTxt(s.acc)}</b></div>
        <div><small>Rhythm points</small><b class="num">${fmt(s.rp)}</b></div>
        <div><small>Misses</small><b class="num ${s.misses ? 'bad' : ''}">${fmt(s.misses)}</b></div>
        <div><small>Notes hit</small><b class="num">${fmt(Math.max(0, (s.notes || 0) - (s.misses || 0)))}<span> / ${fmt(s.notes)}</span></b></div>
        <div><small>Speed</small><b class="num">${fmt(s.speed, 2)}×</b></div>
      </div></div></section>`;
  }

  // Where this play stands: its place on the map, the gap to first, and the player's day around it.
  function stands(d) {
    const s = d.score, best = d.best, top = d.top[0], cards = [];
    if (best && best.id === s.id) cards.push(['Place on this map', `<strong class="num">#${fmt(best.place)}</strong><span>of ${fmt(best.total)} players · ${d.mode === 'spin' ? 'Spin' : 'Lock'}</span><p class="cap">This is ${esc(s.username)}’s best on this map.</p>`]);
    else if (best) cards.push(['Place on this map', `<strong class="num">Not their best</strong><span>Their best here is <a href="/score/${esc(best.id)}">#${fmt(best.place)} of ${fmt(best.total)}</a></span><p class="cap">${accTxt(best.acc)} · ${fmt(best.rp)} RP · ${esc(ago(best.at))}</p>`]);
    else cards.push(['Place on this map', `<strong class="num">—</strong><p class="cap">${d.map ? 'Rhythia lists no best score for this player here.' : 'Rhythia did not say which map this is.'}</p>`]);
    if (top) {
      if (top.id === s.id) cards.push(['Against first place', `<strong class="num good">First place</strong>`]);
      else {
        const dRp = (s.rp || 0) - (top.rp || 0), dAcc = (s.acc || 0) - (top.acc || 0);
        cards.push(['Against first place', `<strong class="num">${dRp < 0 ? '−' : '+'}${fmt(Math.abs(dRp))} RP</strong><span>${dAcc < 0 ? '−' : '+'}${fmt(Math.abs(dAcc), 2)}% accuracy, ${fmt(s.misses)} vs ${fmt(top.misses)} misses</span>
          <a class="v-mini" href="/score/${esc(top.id)}">${av(top.avatar)}<b>${esc(top.username)}</b><span class="num">${fmt(top.rp)} RP · ${accTxt(top.acc)}</span></a>`]);
      }
    }
    cards.push(['The day of this play', dayHtml(d)]);
    return `<section class="container v-sec" id="v-stand-sec"><div class="sec-head"><div><h2>How it stands</h2></div></div>
      <div class="v-cards">${cards.map(([h, b]) => `<div class="v-card"><small>${h}</small>${b}</div>`).join('')}</div></section>`;
  }
  // From the community history (Reimagined's VPS), with the same consent as everywhere else.
  function dayHtml(d) {
    if (!S.allowed) return '<strong class="num">—</strong><p class="cap">Turn on community history in the Reimagined popup to see RP and rank around this day.</p>';
    if (S.hist === undefined) return '<div class="skeleton" style="width:70%;height:26px;margin-top:6px"></div><div class="skeleton" style="width:90%;margin-top:10px"></div>';
    if (S.hist === null) return '<strong class="num">—</strong><p class="cap">The community history did not answer.</p>';
    const day = when(d.score.at).toISOString().slice(0, 10), list = S.hist.filter(x => x.skillPoints > 0);
    if (!list.length) return '<strong class="num">—</strong><p class="cap">No history for this player yet.</p>';
    if (day < list[0].date) return `<strong class="num">—</strong><p class="cap">This play is older than the ${list.length} days of history.</p>`;
    const before = [...list].reverse().find(x => x.date < day), after = list.find(x => x.date > day) || list.find(x => x.date === day);
    if (!before || !after) return '<strong class="num">—</strong><p class="cap">Not enough history around this day yet.</p>';
    const dRp = after.skillPoints - before.skillPoints, dRank = (before.globalRank || 0) - (after.globalRank || 0);
    return `<strong class="num ${dRp > .05 ? 'good' : ''}">${dRp >= 0 ? '+' : '−'}${fmt(Math.abs(dRp), 1)} RP</strong>
      <span class="num">#${fmt(before.globalRank)} → #${fmt(after.globalRank)}${dRank ? ` (${dRank > 0 ? '▲' : '▼'} ${fmt(Math.abs(dRank))})` : ''}</span>
      <p class="cap">${esc(before.date)} to ${esc(after.date)}, counting every play that day.</p>`;
  }
  // Watching a replay slower: its own speed change, from the speed the play was set at (a 1.45× play at 0.5× runs
  // at 0.725×). Shown once the replay's controls answer.
  const recorded = () => S.d?.score.speed || 1;
  function speedBar() {
    if (!S.live) return '<div class="v-pbar" id="v-pbar" hidden></div>';
    const rec = recorded();
    return `<div class="v-pbar" id="v-pbar"><span class="cap">Replay speed</span><div class="pills" aria-label="Replay speed">${REPLAY_SPEEDS.map(f => `<button type="button" data-rspeed="${f}" aria-pressed="${Math.abs(S.speed - rec * f) < .005}">${speedLabel(f)}×</button>`).join('')}</div>
      <span class="cap num">Played at ${speedLabel(Number(rec.toFixed(2)))}×</span></div>`;
  }
  function playsSec(d) {
    const body = S.plays ? playsHtml(S.plays, d.score.speed || 1) : S.playsErr ? `<p class="cap">${esc(S.playsErr)}</p>` : '<div class="skeleton" style="height:120px;border-radius:14px"></div>';
    return `<section class="container v-sec" id="v-plays-sec"><div class="sec-head"><div><h2>What the map asks</h2><p class="lede">${playsNote}${d.score.speed !== 1 ? ` Speeds are shown at this play’s ${fmt(d.score.speed, 2)}×.` : ''}</p></div>${d.map ? `<a class="v-more" href="/maps/${esc(d.map.id)}">Map page →</a>` : ''}</div>${body}</section>`;
  }
  function topSec(d) {
    if (!d.top.length) return '';
    const s = d.score, rows = d.top.slice(0, 5);
    const mine = !rows.some(x => x.id === s.id) && d.best?.id === s.id ? d.best : null;
    return `<section class="container v-sec"><div class="sec-head"><div><h2>Top of this map</h2><p class="lede">${d.mode === 'spin' ? 'Spin' : 'Lock'} scores, one per player.</p></div><a class="v-more" href="/maps/${esc(d.map.id)}">Full leaderboard →</a></div>
      <div class="panel v-table">${rows.map((x, i) => row(x, i + 1, x.id === s.id)).join('')}${mine ? `<div class="v-gap">…</div>${row(mine, mine.place, true)}` : ''}</div></section>`;
  }
  function render() {
    const d = S.d;
    if (!d) return;
    morph($('#hero'), hero(d));
    morph($('#body'), `<div class="v-page ${S.enter ? 'enter' : ''}">${stands(d)}
      <section class="container v-sec"><div class="sec-head"><div><h2>Replay</h2></div></div>${slot()}${speedBar()}</section>
      ${playsSec(d)}${topSec(d)}<div style="height:96px"></div></div>`);
    S.dock?.release();
    S.dock = ctx.dock($('#v-dock'));
    if (S.enter && !REDUCED) requestAnimationFrame(() => requestAnimationFrame(() => { const fg = R.querySelector('.v-ring .fg'); if (fg) fg.style.strokeDashoffset = fg.style.getPropertyValue('--off'); }));
  }
  function redraw(sel, html) { morph.outer($(sel), html); S.dock?.refresh(); }
  // Follow the replay: show the speed row once its controls answer, and keep it in step.
  let poll = 0;
  async function watchReplay() {
    const r = await ask('state');
    if (ac.signal.aborted) return;
    const live = Boolean(r.ok) && Boolean(S.d), speed = r.speed || 0;
    if (live !== S.live || Math.abs(speed - S.speed) > .001) { S.live = live; S.speed = speed; const b = $('#v-pbar'); if (b) { morph.outer(b, speedBar()); S.dock?.refresh(); } }
    poll = setTimeout(watchReplay, live ? 1500 : 1000);
  }
  const watchNow = () => { clearTimeout(poll); watchReplay(); };

  async function load() {
    const snap = await Data().pageSnapshot(`score:${id}`).catch(() => null);
    if (ac.signal.aborted) return;
    if (snap) { S.d = snap; render(); }
    else $('#body').innerHTML = '<div class="container v-sk"><div class="skeleton" style="height:200px;border-radius:22px"></div><div class="skeleton" style="height:140px;border-radius:16px;margin-top:24px"></div></div>';
    let d;
    try { d = await Data().scorePage(id, ac.signal); } catch (err) {
      if (ac.signal.aborted) return;
      if (!S.d) $('#body').innerHTML = `<div class="container"><div class="empty" style="padding:120px 0"><b>Could not load this score</b>${esc(err.message)}<div style="margin-top:16px"><button class="btn" type="button" data-native-x>Show Rhythia's page</button></div></div></div>`;
      else ui.toast('Showing the saved score; Rhythia did not answer.');
      return;
    }
    if (ac.signal.aborted) return;
    const was = S.d;
    S.d = d;
    if (was) S.enter = false;
    render();
    S.enter = false;
    // The day around the play, from the community history.
    S.allowed = await Data().historyAllowed().catch(() => false);
    if (S.allowed) { S.hist = await Data().historyOf(d.score.userId, ac.signal).catch(() => null); }
    if (!ac.signal.aborted) redraw('#v-stand-sec', stands(d));
    // The map file: what the map asks.
    if (d.map?.file) {
      try { const m = await Kit().load(d.map.file, ac.signal); S.plays = m.analysis; } catch (err) { if (ac.signal.aborted) return; S.playsErr = `The map file could not be read (${err.message}).`; }
    } else S.playsErr = 'Rhythia did not send the map file.';
    if (!ac.signal.aborted) redraw('#v-plays-sec', playsSec(d));
  }
  R.addEventListener('click', e => {
    if (e.target.closest('[data-native-x]')) return ctx.showNative();
    const sp = e.target.closest('[data-rspeed]');
    if (sp) ask('speed', recorded() * Number(sp.dataset.rspeed)).then(() => setTimeout(watchNow, 120));
  }, sig);
  load();
  watchReplay();

  return {
    state: () => ({}), idle: () => true, relayout() {}, page() {},
    destroy() { ac.abort(); clearTimeout(poll); ui.hide(); S.dock?.release(); },
  };
}

K().page('score', score);
})();
