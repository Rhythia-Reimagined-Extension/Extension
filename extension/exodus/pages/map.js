// =============================================
// Reimagined for Rhythia — Exodus map page
// =============================================
// /maps/:id: the map, how it plays (read from the map file), Rhythia's map preview (laid
// over a slot by the shell), its leaderboard per mode and its comments.

var RhythiaX = RhythiaX || {};

(function () {
'use strict';
const K = () => RhythiaX.ExodusKit;
const {SITE, Data, Kit, esc, fmt, REDUCED, ago, fullDate, mmss, diff, status, MODES, mods, av, shell, slot, playsHtml, playsNote, PREVIEW_SPEEDS, ask, row, morph} = RhythiaX.ExodusKit;

/* ════════════════════ Map ════════════════════ */
function map(host, ctx) {
  const R = host.shadowRoot, ac = new AbortController(), sig = {signal: ac.signal}, $ = s => R.querySelector(s);
  const ui = shell(R, sig, ctx);
  const id = ctx.id;
  const S = {d: null, mode: 'normal', me: null, more: false, file: null, fileErr: '', comments: null, enter: true, dock: null, busy: false, posting: false, speed: 0, live: false};

  function hero(m) {
    const [dl, dc] = diff(m.difficulty), [sl, sc] = status(m);
    return `<section class="v-hero map ${S.enter ? 'enter' : ''}"><div class="v-banner" style="background-image:url('${esc(m.art)}')"></div><div class="container v-hero-in">
      <i class="v-cover" style="background-image:url('${esc(m.art)}')"></i>
      <div class="v-who">
        <div class="v-chips"><span class="v-chip" style="--c:${sc}">${sl}</span><span class="v-chip" style="--c:${dc}">${dl}</span>${m.explicit ? '<span class="v-chip" style="--c:var(--bad)">Explicit</span>' : ''}</div>
        <h1>${esc(m.title)}</h1>
        <p class="v-by"><span>Mapped by <a href="/player/${esc(m.mapperId)}">${esc(m.mapper)}</a></span>${m.qualifiedBy ? `<span>Qualified by <a href="/player/${esc(m.qualifiedById)}">${esc(m.qualifiedBy)}</a></span>` : ''}
          <span data-tip="<b>${esc(fullDate(m.created))}</b>">Posted ${esc(ago(m.created))}</span>${m.updated ? `<span data-tip="<b>${esc(fullDate(new Date(m.updated).toISOString()))}</b>">Updated ${esc(ago(new Date(m.updated).toISOString()))}</span>` : ''}</p>
        <div class="v-act"><button class="btn primary" type="button" data-native-click="Download">Download</button><button class="btn" type="button" data-native-click="Copyright Report">Copyright Report</button></div>
      </div></div>
      <div class="container"><div class="v-kpis">
        <div><small>Length</small><b class="num">${mmss(m.length)}</b></div>
        <div><small>Star rating</small><b class="num">★ ${fmt(m.stars, 2)}</b></div>
        <div><small>Plays</small><b class="num">${fmt(m.plays)}</b></div>
        <div><small>Notes</small><b class="num">${fmt(m.notes)}</b></div>
      </div></div></section>`;
  }
  function about(m) {
    const tags = String(m.tags || '').split(/[,\s]+/).filter(Boolean);
    return `<section class="container v-sec v-about"><p class="${m.description ? '' : 'cap'}">${m.description ? esc(m.description).replace(/\n/g, '<br>') : 'No map description.'}</p>${tags.length ? `<div class="v-tagrow">${tags.map(t => `<a class="tag" href="/maps?tags=${encodeURIComponent(t)}">${esc(t)}</a>`).join('')}</div>` : ''}</section>`;
  }
  function playsSec() {
    const a = S.file?.analysis;
    const body = a ? playsHtml(a) + zoneLine(a) : S.fileErr ? `<p class="cap">${esc(S.fileErr)}</p>` : '<div class="skeleton" style="height:150px;border-radius:14px"></div>';
    return `<section class="container v-sec" id="v-plays-sec"><div class="sec-head"><div><h2>How this map plays</h2><p class="lede">${playsNote}</p></div></div>${body}</section>`;
  }
  // The map's parts in order; a click plays the preview from there.
  function zoneLine(a) {
    const end = Math.max(1, a.duration), top = Math.max(1, ...a.curve);
    const pts = a.curve.map((v, i) => `${((i + .5) / a.curve.length * 1000).toFixed(1)},${(60 - v / top * 54).toFixed(1)}`).join(' ');
    return `<div class="v-zl"><svg viewBox="0 0 1000 60" preserveAspectRatio="none" aria-hidden="true"><polygon points="0,60 ${pts} 1000,60"/></svg>
      <div class="v-zr">${a.zones.map(z => `<button type="button" class="k-${z.kind.toLowerCase()}" style="left:${(z.start / end * 100).toFixed(3)}%;width:${Math.max(.15, (z.end - z.start) / end * 100).toFixed(3)}%" data-zone="${z.start}" data-tip="<b>${esc(z.type)} · ${mmss(z.start)}–${mmss(z.end)}</b><small>${fmt(z.nps, 1)} notes/s · ${fmt(z.notes)} notes · click to play the preview from here</small>"></button>`).join('')}</div>
      <div class="v-zt num"><span>0:00</span><span>${mmss(end)}</span></div></div>`;
  }
  // Speeds beyond the preview's own menu (0.75–1.45×), applied through its own speed change.
  function speedBar() {
    if (!S.live) return '<div class="v-pbar" id="v-pbar" hidden></div>';
    return `<div class="v-pbar" id="v-pbar"><span class="cap">Preview speed</span><div class="pills" aria-label="Preview speed">${PREVIEW_SPEEDS.map(v => `<button type="button" data-speed="${v}" aria-pressed="${Math.abs(S.speed - v) < .001}">${v}×</button>`).join('')}</div>
      ${S.speed && !PREVIEW_SPEEDS.some(v => Math.abs(S.speed - v) < .001) ? `<span class="cap num">Now ${fmt(S.speed, 2)}×</span>` : ''}</div>`;
  }
  function boardSec() {
    const d = S.d, list = d.scores, rows = S.more ? list : list.slice(0, 10), t = d.map.trophy, mine = d.mine;
    const pills = `<div class="pills" aria-label="Game mode">${Object.entries(MODES).map(([k, v]) => `<button type="button" aria-pressed="${S.mode === k}" data-mode="${k}"><img src="${SITE}/${v[1]}" alt="">${v[0]}</button>`).join('')}</div>`;
    const trophy = t && S.mode === 'normal' ? `<a class="v-trophy" href="/score/${esc(t.scoreId)}"><small>Trophy owner</small>${av(t.avatar, 'v-av lg')}<div><b>${esc(t.username)}</b>${t.clan ? `<span class="cap">${esc(t.clan.name)}</span>` : ''}</div><span class="num">${fmt(t.rp)} RP</span></a>` : '';
    const me = mine ? `<div class="v-mine"><small>Your best</small>${row(mine, mine.place || 0, true)}<span class="cap">#${fmt(mine.place)} of ${fmt(mine.total)}</span></div>` : '';
    const table = list.length ? `<div class="v-cols" aria-hidden="true"><span>#</span><span>Player</span><span>RP</span><span>Accuracy</span><span>Misses</span><span>Mods</span><span>When</span></div>${rows.map((x, i) => row(x, i + 1, S.me && x.userId === S.me.id)).join('')}`
      : '<div class="empty"><b>No scores yet</b>Nobody has a score in this mode yet.</div>';
    return `<section class="container v-sec" id="v-board-sec"><div class="sec-head"><div><h2>Leaderboard</h2><p class="lede">Everyone’s best on this map, one score per player.</p></div>${pills}</div>
      ${trophy || me ? `<div class="v-top">${trophy}${me}</div>` : ''}
      <div class="panel v-table ${S.busy ? 'busy' : ''}">${table}</div>
      ${list.length > 10 ? `<div class="v-moreb"><button class="btn" type="button" data-more>${S.more ? 'Show less' : `Show all ${fmt(list.length)}`}</button></div>` : ''}</section>`;
  }
  function commentsSec() {
    const c = S.comments, me = S.me;
    const form = me ? `<form class="v-form" id="v-form"><label class="sr" for="v-comment">Your comment</label><textarea id="v-comment" placeholder="Your comment..." rows="3" maxlength="2000"></textarea>
      <div><span class="cap">Markdown is enabled</span><button class="btn primary" type="submit" ${S.posting ? 'disabled' : ''}>${S.posting ? 'Posting…' : 'Post comment'}</button></div></form>`
      : '<div class="v-form out"><span class="cap">Sign in to post a comment.</span><button class="btn" type="button" data-native-click="Sign in">Sign in</button></div>';
    const list = c == null ? '<div class="skeleton" style="height:60px;border-radius:12px"></div>' : !c.length ? '<p class="cap">No comments yet.</p>'
      : c.map(x => `<article class="v-com"><a href="/player/${esc(x.userId)}">${av(x.avatar)}</a><div><header><a href="/player/${esc(x.userId)}"><b>${esc(x.username)}</b></a><span class="cap" data-tip="<b>${esc(fullDate(x.at))}</b>">${esc(ago(x.at))}</span></header><p>${esc(x.text.trim()).replace(/\n/g, '<br>')}</p></div></article>`).join('');
    return `<section class="container v-sec" id="v-com-sec"><div class="sec-head"><div><h2>Comments</h2></div></div>${form}<div class="v-coms">${list}</div></section>`;
  }
  function render() {
    const d = S.d;
    morph($('#hero'), hero(d.map));
    morph($('#body'), `<div class="v-page ${S.enter ? 'enter' : ''}">${about(d.map)}${playsSec()}
      <section class="container v-sec" id="v-preview-sec"><div class="sec-head"><div><h2>Map preview</h2><p class="lede">Rhythia’s preview player. Its mods, settings and zone chart are in its own controls.</p></div></div>${slot()}${speedBar()}</section>
      ${boardSec()}${commentsSec()}<div style="height:96px"></div></div>`);
    S.dock?.release();
    S.dock = ctx.dock($('#v-dock'));
  }
  function redraw(sel, html) { morph.outer($(sel), html); S.dock?.refresh(); }
  // Follow the preview: show the speed bar once its controls answer, and keep it in step with its own menu.
  let poll = 0;
  async function watchPreview() {
    const r = await ask('state');
    if (ac.signal.aborted) return;
    const live = Boolean(r.ok), speed = r.speed || 0;
    if (live !== S.live || Math.abs(speed - S.speed) > .001) { S.live = live; S.speed = speed; const b = $('#v-pbar'); if (b) { morph.outer(b, speedBar()); S.dock?.refresh(); } }
    poll = setTimeout(watchPreview, live ? 1500 : 1000);
  }
  const watchNow = () => { clearTimeout(poll); watchPreview(); };

  async function loadBoard(mode) {
    S.mode = mode; S.busy = true; redraw('#v-board-sec', boardSec());
    try {
      const d = await Data().mapPage(id, mode, S.me?.id || 0, ac.signal, true);
      if (ac.signal.aborted || S.mode !== mode) return;
      S.d = {...S.d, scores: d.scores, mine: d.mine, map: d.map};
    } catch (err) { if (!ac.signal.aborted) ui.toast(`The leaderboard did not load (${err.message}).`); }
    S.busy = false;
    if (!ac.signal.aborted) redraw('#v-board-sec', boardSec());
  }

  async function load() {
    const snap = await Data().pageSnapshot(`map:${id}:normal`).catch(() => null);
    S.me = await Data().signedIn().catch(() => null);
    if (ac.signal.aborted) return;
    if (snap) { S.d = snap; render(); }
    else $('#body').innerHTML = '<div class="container v-sk"><div class="skeleton" style="height:220px;border-radius:22px"></div><div class="skeleton" style="height:160px;border-radius:16px;margin-top:24px"></div></div>';
    let d;
    try { d = await Data().mapPage(id, 'normal', S.me?.id || 0, ac.signal, true); } catch (err) {
      if (ac.signal.aborted) return;
      if (!S.d) $('#body').innerHTML = `<div class="container"><div class="empty" style="padding:120px 0"><b>Could not load this map</b>${esc(err.message)}<div style="margin-top:16px"><button class="btn" type="button" data-native-x>Show Rhythia's page</button></div></div></div>`;
      else ui.toast('Showing the saved map; Rhythia did not answer.');
      return;
    }
    if (ac.signal.aborted) return;
    const was = S.d;
    S.d = d;
    if (!was) render();
    else { S.enter = false; morph($('#hero'), hero(d.map)); redraw('#v-board-sec', boardSec()); }
    S.enter = false;
    Data().comments(id, ac.signal).then(c => { S.comments = c; redraw('#v-com-sec', commentsSec()); }).catch(() => { S.comments = []; redraw('#v-com-sec', commentsSec()); });
    if (!d.map.file) { S.fileErr = 'Rhythia did not give the map file.'; } else {
      try { S.file = await Kit().load(d.map.file, ac.signal); } catch (err) { if (ac.signal.aborted) return; S.fileErr = `The map file could not be read (${err.message}).`; }
    }
    if (ac.signal.aborted) return;
    redraw('#v-plays-sec', playsSec());
  }

  R.addEventListener('click', e => {
    if (e.target.closest('[data-native-x]')) return ctx.showNative();
    const m = e.target.closest('[data-mode]');
    if (m) { if (m.dataset.mode !== S.mode) loadBoard(m.dataset.mode); return; }
    if (e.target.closest('[data-more]')) { S.more = !S.more; redraw('#v-board-sec', boardSec()); return; }
    const sp = e.target.closest('[data-speed]');
    if (sp) { ask('speed', Number(sp.dataset.speed)).then(() => setTimeout(watchNow, 120)); return; }
    const z = e.target.closest('[data-zone]');
    if (z) {
      ask('seek', Math.max(0, Number(z.dataset.zone) - 500), {play: true}).then(r => { if (!r.ok) ui.toast('The preview is still loading. Try again in a moment.'); });
      $('#v-preview-sec')?.scrollIntoView({behavior: REDUCED ? 'auto' : 'smooth', block: 'start'});
    }
  }, sig);
  R.addEventListener('submit', async e => {
    if (e.target.id !== 'v-form') return;
    e.preventDefault();
    const box = $('#v-comment'), text = box.value.trim();
    if (!text) { ui.toast('Make sure to write something before posting!'); return; }
    S.posting = true; e.target.querySelector('button[type="submit"]').disabled = true;
    try {
      await Data().postComment(id, text);
      S.comments = await Data().comments(id, ac.signal).catch(() => S.comments);
      S.posting = false;
      redraw('#v-com-sec', commentsSec());
      ui.toast('Comment posted.');
    } catch (err) {
      S.posting = false;
      const b = e.target.querySelector('button[type="submit"]'); if (b) b.disabled = false;
      ui.toast(`Could not post (${err.message}).`);
    }
  }, sig);
  load();
  watchPreview();

  return {
    state: () => ({}), idle: () => !S.posting, relayout() {}, page() {},
    destroy() { ac.abort(); clearTimeout(poll); ui.hide(); S.dock?.release(); },
  };
}

K().page('map', map);
})();
