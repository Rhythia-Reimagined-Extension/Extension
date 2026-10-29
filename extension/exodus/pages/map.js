// =============================================
// Reimagined for Rhythia — Exodus map page
// =============================================
// /maps/:id: the map, how it plays (read from the map file), Rhythia's map preview (laid
// over a slot by the shell), its leaderboard per mode and its comments.

var RhythiaX = RhythiaX || {};

(function () {
'use strict';
const K = () => RhythiaX.ExodusKit;
const {SITE, Data, Kit, esc, cssUrl, fmt, REDUCED, ago, fullDate, mmss, diff, status, MODES, countryName, countryPicker, av, shell, slot, playsHtml, playsNote, PREVIEW_SPEEDS, speedLabel, ask, row, morph} = RhythiaX.ExodusKit;

/* ════════════════════ Map ════════════════════ */
function map(host, ctx) {
  const R = host.shadowRoot, ac = new AbortController(), sig = {signal: ac.signal}, $ = s => R.querySelector(s);
  const ui = shell(R, sig);
  const id = ctx.id;
  // The country comes from the address as on Rhythia (/maps/1?country=PL); '' is Global.
  const askCountry = (new URLSearchParams(location.search).get('country') || '').toUpperCase();
  const S = {d: null, mode: 'normal', country: /^[A-Z]{2}$/.test(askCountry) ? askCountry : '', me: null, more: false, file: null, fileErr: '', comments: null, enter: true, dock: null, busy: false, posting: false, speed: 0, live: false};

  const cp = countryPicker(R, {current: () => S.country, mine: () => S.me?.flag || '', pick: c => loadBoard(S.mode, c), redraw: () => redraw('#v-board-sec', boardSec()), signal: ac.signal});

  function hero(m) {
    const [dl, dc] = diff(m.difficulty), [sl, sc] = status(m);
    return `<section class="v-hero map ${S.enter ? 'enter' : ''}"><div class="v-banner" style="background-image:${cssUrl(m.art)}"></div><div class="container v-hero-in">
      <i class="v-cover" style="background-image:${cssUrl(m.art)}"></i>
      <div class="v-who">
        <div class="v-chips"><span class="v-chip" style="--c:${sc}">${sl}</span><span class="v-chip" style="--c:${dc}">${dl}</span>${m.explicit ? '<span class="v-chip" style="--c:var(--bad)">Explicit</span>' : ''}</div>
        <h1>${esc(m.title)}</h1>
        <p class="v-by"><span>Mapped by <a href="/player/${esc(m.mapperId)}">${esc(m.mapper)}</a></span>${m.qualifiedBy ? `<span>Qualified by <a href="/player/${esc(m.qualifiedById)}">${esc(m.qualifiedBy)}</a></span>` : ''}
          <span data-tip="<b>${esc(fullDate(m.created))}</b>">Posted ${esc(ago(m.created))}</span>${m.updated ? `<span data-tip="<b>${esc(fullDate(new Date(m.updated).toISOString()))}</b>">Updated ${esc(ago(new Date(m.updated).toISOString()))}</span>` : ''}</p>
        <div class="v-act"><button class="btn primary" type="button" data-native-click="Download">Download</button>${S.me ? '<button class="btn" type="button" data-collect>Add to collection</button>' : ''}<button class="btn" type="button" data-native-click="Copyright Report">Copyright Report</button></div>
      </div></div>
      <div class="container"><div class="v-kpis">
        <div><small>Length</small><b class="num">${mmss(m.length)}</b></div>
        <div><small>Star rating</small><b class="num">★ ${fmt(m.stars, 2)}</b></div>
        <div><small>Plays</small><b class="num">${fmt(m.plays)}</b></div>
        <div><small>Notes</small><b class="num">${fmt(m.notes)}</b></div>
      </div></div></section>`;
  }
  // A qualified map is ranked RANK_DAYS after it was qualified unless a mapper vetoes it (Rhythia's own rule and
  // countdown); a veto takes it out of Qualified, and Rhythia lists the vetos with their reasons.
  const RANK_DAYS = 7;
  function rankAt(m) {
    const t = m.qualified && m.qualifiedAt && m.status !== 'RANKED' && m.status !== 'APPROVED' ? Date.parse(m.qualifiedAt) : NaN;
    return Number.isFinite(t) ? t + RANK_DAYS * 864e5 : null;
  }
  function countdown(ms) {
    if (ms <= 0) return 'any moment now';
    const d = Math.floor(ms / 864e5), h = Math.floor(ms % 864e5 / 36e5), min = Math.floor(ms % 36e5 / 6e4);
    return d ? `${d} day${d === 1 ? '' : 's'} ${h} h` : h ? `${h} h ${min} min` : `${Math.max(1, min)} min`;
  }
  function rankSec(m) {
    const at = rankAt(m), vetos = m.status !== 'RANKED' ? m.vetos || [] : [];
    // Team Ranked members qualify a map here, and veto one in the queue, as on Rhythia.
    const team = (S.me?.badges || []).includes('Team Ranked') && m.status !== 'RANKED' && m.status !== 'APPROVED';
    const tr = !team ? '' : at ? '<div class="v-team"><span class="cap">Team Ranked</span><button class="btn danger" type="button" data-tr="veto">Veto map</button></div>'
      : `<div class="panel v-rank"><div><span class="cap">Team Ranked</span><b>Not qualified</b><p class="cap">Qualified maps get into ranked after ${RANK_DAYS} days if no other mapper vetoes them in the meantime.</p></div><button class="btn primary" type="button" data-tr="qualify">Qualify</button></div>`;
    if (!at && !vetos.length && !tr) return '<section class="container v-sec v-ranksec" id="v-rank-sec" hidden></section>';
    const queue = at ? `<div class="panel v-rank"><div><span class="cap">Qualified</span><b>Ranked in <span id="v-rank-left" class="num">${countdown(at - Date.now())}</span></b>
        <p class="cap">Qualified <span data-tip="<b>${esc(fullDate(m.qualifiedAt))}</b>">${esc(ago(m.qualifiedAt))}</span>${m.qualifiedBy ? ` by <a href="/player/${esc(m.qualifiedById)}">${esc(m.qualifiedBy)}</a>` : ''}. Qualified maps get into ranked after ${RANK_DAYS} days if no other mapper vetoes them in the meantime.</p></div>
        <span class="v-rank-at" data-tip="<b>${esc(fullDate(new Date(at).toISOString()))}</b><small>Your time</small>"><small>Ranked on</small><b>${esc(new Date(at).toLocaleDateString('en-GB', {day: 'numeric', month: 'short'}))}</b><small class="num">${esc(new Date(at).toLocaleTimeString('en-GB', {hour: '2-digit', minute: '2-digit'}))}</small></span></div>` : '';
    const veto = vetos.length ? `<div class="panel v-vetos"><h3>Vetos</h3>${vetos.map(v => `<div class="v-veto"><p><b>Veto from ${v.userId != null ? `<a href="/player/${esc(v.userId)}">${esc(v.username || 'Team Ranked')}</a>` : esc(v.username || 'Team Ranked')}</b>${v.at ? ` <span class="cap" data-tip="<b>${esc(fullDate(v.at))}</b>">${esc(ago(v.at))}</span>` : ''}</p><p>${esc(v.reason || 'No reason provided.')}</p></div>`).join('')}</div>` : '';
    return `<section class="container v-sec v-ranksec" id="v-rank-sec">${at ? queue + tr : tr}${veto}</section>`;
  }
  function about(m) {
    const tags = String(m.tags || '').split(/[,\s]+/).filter(Boolean);
    return `${rankSec(m)}<section class="container v-sec v-about"><p class="${m.description ? '' : 'cap'}">${m.description ? esc(m.description).replace(/\n/g, '<br>') : 'No map description.'}</p>${tags.length ? `<div class="v-tagrow">${tags.map(t => `<a class="tag" href="/maps?tags=${encodeURIComponent(t)}">${esc(t)}</a>`).join('')}</div>` : ''}</section>`;
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
      <div class="v-zr">${a.zones.map(z => `<button type="button" class="k-${z.kind.toLowerCase()}" style="left:${(z.start / end * 100).toFixed(3)}%;width:${Math.max(.15, (z.end - z.start) / end * 100).toFixed(3)}%" data-zone="${z.start}" data-tip="<b>${esc(z.type)} · ${mmss(z.start)}–${mmss(z.end)}</b><small>${fmt(z.nps, 1)} notes/s · ${fmt(z.notes)} notes · click to play from here</small>"></button>`).join('')}</div>
      <div class="v-zt num"><span>0:00</span><span>${mmss(end)}</span></div></div>`;
  }
  // The game's speed mods and, below them, half and a quarter speed, applied through the preview's own speed change.
  // Its own menu offers 0.75–1.45×.
  function speedBar() {
    if (!S.live) return '<div class="v-pbar" id="v-pbar" hidden></div>';
    return `<div class="v-pbar" id="v-pbar"><span class="cap">Preview speed</span><div class="pills" aria-label="Preview speed">${PREVIEW_SPEEDS.map(v => `<button type="button" data-speed="${v}" aria-pressed="${Math.abs(S.speed - v) < .001}">${speedLabel(v)}×</button>`).join('')}</div>
      ${S.speed && !PREVIEW_SPEEDS.some(v => Math.abs(S.speed - v) < .001) ? `<span class="cap num">Now ${fmt(S.speed, 2)}×</span>` : ''}</div>`;
  }
  function boardSec() {
    const d = S.d, list = d.scores, rows = S.more ? list : list.slice(0, 10), t = d.map.trophy, mine = d.mine;
    const pills = `<div class="pills" aria-label="Game mode">${Object.entries(MODES).map(([k, v]) => `<button type="button" aria-pressed="${S.mode === k}" data-mode="${k}"><img src="${SITE}/${v[1]}" alt="">${v[0]}</button>`).join('')}</div>`;
    const trophy = t && S.mode === 'normal' && !S.country ? `<a class="v-trophy" href="/score/${esc(t.scoreId)}"><small>Trophy owner</small>${av(t.avatar, 'v-av lg')}<div><b>${esc(t.username)}</b>${t.clan ? `<span class="cap">${esc(t.clan.name)}</span>` : ''}</div><span class="num">${fmt(t.rp)} RP</span></a>` : '';
    const me = mine ? `<div class="v-mine"><small>Your best</small>${row(mine, mine.place || 0, true)}<span class="cap">#${fmt(mine.place)} of ${fmt(mine.total)}</span></div>` : '';
    const table = list.length ? `<div class="v-cols" aria-hidden="true"><span>#</span><span>Player</span><span>RP</span><span>Accuracy</span><span>Misses</span><span>Mods</span><span>When</span></div>${rows.map((x, i) => row(x, i + 1, S.me && x.userId === S.me.id)).join('')}`
      : `<div class="empty"><b>No scores yet</b>${S.country ? 'No one from this country has played this mode here.' : ''}</div>`;
    return `<section class="container v-sec" id="v-board-sec"><div class="sec-head"><div><h2>Leaderboard</h2><p class="lede">One score per player${S.country ? ` from ${esc(countryName(S.country))}` : ''}.</p></div><div class="v-bctl">${pills}${cp.html()}</div></div>
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
      <section class="container v-sec" id="v-preview-sec"><div class="sec-head"><div><h2>Map preview</h2></div></div>${slot()}${speedBar()}</section>
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

  async function loadBoard(mode, country = S.country) {
    S.mode = mode; S.country = country; S.busy = true; redraw('#v-board-sec', boardSec());
    try {
      const d = await Data().mapPage(id, mode, S.me?.id || 0, ac.signal, !country, country);
      if (ac.signal.aborted || S.mode !== mode || S.country !== country) return;
      S.d = {...S.d, scores: d.scores, mine: d.mine, map: d.map};
    } catch (err) { if (!ac.signal.aborted) ui.toast(`The leaderboard did not load (${err.message}).`); }
    S.busy = false;
    if (!ac.signal.aborted) redraw('#v-board-sec', boardSec());
  }

  async function load() {
    const snap = await Data().pageSnapshot(`map:${id}:normal`).catch(() => null);
    S.me = await Data().signedIn().catch(() => null);
    if (ac.signal.aborted) return;
    // A saved page is the Global board: shown faded while a country's board loads.
    if (snap) { S.d = snap; S.busy = Boolean(S.country); render(); }
    else $('#body').innerHTML = '<div class="container v-sk"><div class="skeleton" style="height:220px;border-radius:22px"></div><div class="skeleton" style="height:160px;border-radius:16px;margin-top:24px"></div></div>';
    let d;
    try { d = await Data().mapPage(id, 'normal', S.me?.id || 0, ac.signal, !S.country, S.country); } catch (err) {
      if (ac.signal.aborted) return;
      if (!S.d) $('#body').innerHTML = `<div class="container"><div class="empty" style="padding:120px 0"><b>Could not load this map</b>${esc(err.message)}<div style="margin-top:16px"><button class="btn" type="button" data-native-x>Show Rhythia's page</button></div></div></div>`;
      else { ui.toast('Showing the saved map; Rhythia did not answer.'); if (S.busy) { S.busy = false; S.country = ''; redraw('#v-board-sec', boardSec()); } }
      return;
    }
    if (ac.signal.aborted) return;
    const was = S.d;
    S.d = d; S.busy = false;
    if (!was) render();
    else { S.enter = false; morph($('#hero'), hero(d.map)); redraw('#v-rank-sec', rankSec(d.map)); redraw('#v-board-sec', boardSec()); }
    S.enter = false;
    Data().comments(id, ac.signal).then(c => { S.comments = c; redraw('#v-com-sec', commentsSec()); }).catch(() => { S.comments = []; redraw('#v-com-sec', commentsSec()); });
    if (!d.map.file) { S.fileErr = 'Rhythia did not send the map file.'; } else {
      try { S.file = await Kit().load(d.map.file, ac.signal); } catch (err) { if (ac.signal.aborted) return; S.fileErr = `The map file could not be read (${err.message}).`; }
    }
    if (ac.signal.aborted) return;
    redraw('#v-plays-sec', playsSec());
  }

  // Add to collection: the signed-in player's collections in the shell's dialog, as Rhythia's own picker lists them.
  const dlg = R.getElementById('cmp');
  const closeBtn = '<button class="iconbtn" type="button" data-close aria-label="Close"><svg class="ico" aria-hidden="true"><use href="#i-x"/></svg></button>';
  let picking = null;
  function pickHtml() {
    const p = picking, list = p.list;
    const body = p.err ? `<p class="cap">${esc(p.err)}</p>` : !list ? '<div class="skeleton" style="height:120px;border-radius:12px"></div>'
      : !list.length ? '<div class="empty"><b>You have no collections yet</b>Make one on your collections page, then add maps to it.</div>'
      : `<div class="v-colls">${list.map(x => `<button type="button" class="v-coll" data-coll="${esc(x.id)}" ${p.busy ? 'disabled' : ''}><b>${esc(x.title)}</b><span class="cap num">${p.busy === String(x.id) ? 'Adding…' : `${fmt(x.maps)} ${x.maps === 1 ? 'map' : 'maps'}`}</span></button>`).join('')}</div>`;
    return `<div class="cmp-head"><h2 id="cmp-title">Add to collection</h2>${closeBtn}</div><div class="cmp-body"><p class="cap v-collmap">${esc(S.d.map.title)}</p>${body}<p class="v-collnew"><a href="/collections/own" data-close>Your collections</a></p></div>`;
  }
  const redrawPick = () => { if (picking && dlg.open) morph(dlg, pickHtml()); };
  function openPick() {
    picking = {list: null, err: '', busy: ''};
    dlg.setAttribute('aria-labelledby', 'cmp-title'); dlg.classList.add('v-colldlg');
    dlg.innerHTML = pickHtml(); dlg.showModal();
    Data().ownCollections(ac.signal).then(list => { if (picking) { picking.list = list; redrawPick(); } }, err => { if (picking) { picking.err = `Your collections did not load (${err.message}).`; redrawPick(); } });
  }
  async function addTo(cid) {
    const x = picking?.list?.find(c => String(c.id) === cid);
    if (!x || picking.busy) return;
    picking.busy = cid; redrawPick();
    try {
      await Data().addToCollection(cid, id);
      dlg.close(); ui.toast(`Added to ${x.title}.`);
    } catch (err) {
      if (picking) { picking.busy = ''; redrawPick(); }
      ui.toast(`Could not add it (${err.message.replace(/^addCollectionMap: /, '')}).`);
    }
  }
  dlg.addEventListener('close', () => { if (picking) { picking = null; dlg.classList.remove('v-colldlg'); } if (team) { team = null; dlg.classList.remove('cd-dlg'); } }, sig);
  // Qualify (a confirm) and Veto (a reason) for Team Ranked.
  let team = null;
  function teamHtml() {
    const q = team.kind === 'qualify';
    return `<div class="cmp-head"><h2 id="cmp-title">${q ? 'Qualify this map?' : 'Veto this map?'}</h2>${closeBtn}</div><form class="cmp-body cd-body" id="tr-form">
      <p>${q ? `${esc(S.d.map.title)} moves to ranked after ${RANK_DAYS} days unless another mapper vetoes it.` : `${esc(S.d.map.title)} leaves Qualified. Say why, so the mapper can fix it.`}</p>
      ${q ? '' : `<label class="cd-field"><span>Reason</span><textarea id="tr-reason" rows="4" maxlength="2000" required>${esc(team.reason)}</textarea></label>`}
      <div class="cd-acts"><button class="btn" type="button" data-close>Cancel</button><button class="btn ${q ? 'primary' : 'danger'}" type="submit" ${team.busy ? 'disabled' : ''}>${team.busy ? 'Saving…' : q ? 'Qualify' : 'Submit veto'}</button></div></form>`;
  }
  function openTeam(kind) {
    team = {kind, reason: '', busy: false};
    dlg.setAttribute('aria-labelledby', 'cmp-title'); dlg.classList.add('cd-dlg');
    dlg.innerHTML = teamHtml(); dlg.showModal(); dlg.querySelector('#tr-reason')?.focus();
  }
  async function teamSave() {
    if (!team || team.busy) return;
    const reason = team.reason.trim();
    if (team.kind === 'veto' && !reason) { ui.toast('Add a reason for the veto.'); return; }
    team.busy = true; morph(dlg, teamHtml());
    const kind = team.kind;
    try {
      if (kind === 'qualify') await Data().qualifyMap(id); else await Data().vetoMap(id, reason);
      dlg.close();
      ui.toast(kind === 'qualify' ? 'Map qualified. It is in the queue now.' : 'Veto applied. The map is no longer qualified.');
      load();
    } catch (err) {
      if (team) { team.busy = false; morph(dlg, teamHtml()); }
      ui.toast(`Could not ${kind}: ${String(err.message || '').replace(/^\w+: /, '')}`);
    }
  }
  dlg.addEventListener('submit', e => { if (e.target.id === 'tr-form') { e.preventDefault(); teamSave(); } }, sig);
  dlg.addEventListener('input', e => { if (e.target.id === 'tr-reason' && team) team.reason = e.target.value; }, sig);
  // The countdown to ranked moves on every minute.
  const tick = setInterval(() => { const el = $('#v-rank-left'), at = S.d && rankAt(S.d.map); if (el && at) el.textContent = countdown(at - Date.now()); }, 30e3);

  R.addEventListener('click', e => {
    if (e.target.closest('[data-native-x]')) return ctx.showNative();
    if (e.target.closest('[data-collect]')) return openPick();
    const trb = e.target.closest('[data-tr]');
    if (trb) return openTeam(trb.dataset.tr);
    const co = e.target.closest('[data-coll]');
    if (co && !co.disabled) return addTo(co.dataset.coll);
    if (e.target.closest('#cmp [data-close]')) { dlg.close(); return; }
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
    state: () => ({}), idle: () => !S.posting && !picking && !team, relayout() {}, page() {},
    destroy() { ac.abort(); clearTimeout(poll); clearInterval(tick); ui.hide(); S.dock?.release(); if (dlg.open) dlg.close(); dlg.classList.remove('v-colldlg'); },
  };
}

const css = `
.v-ranksec{display:grid;gap:12px;margin-top:28px}
.v-rank{display:flex;align-items:center;justify-content:space-between;gap:24px;padding:20px 24px}
.v-rank > div{display:flex;flex-direction:column;gap:4px;min-width:0}
.v-rank > div > b{font-size:20px;font-weight:750}
.v-rank #v-rank-left{color:var(--accent-2)}
.v-rank p{margin:2px 0 0;max-width:72ch;line-height:1.55}
.v-rank p a{color:var(--accent-2)}
.v-rank-at{display:flex;flex-direction:column;align-items:flex-end;flex:none;padding-left:24px;border-left:1px solid var(--line);cursor:help}
.v-rank-at small{font-size:12px;color:var(--muted)}
.v-rank-at b{font-size:18px;font-weight:750}
.v-team{display:flex;align-items:center;justify-content:flex-end;gap:12px}
.v-vetos{padding:20px 24px;box-shadow:inset 0 0 0 1px rgba(229,72,77,.3)}
.v-vetos h3{margin:0 0 10px;font-size:15px;font-weight:750;color:var(--bad)}
.v-veto{padding:12px 0;border-top:1px solid var(--line)}
.v-veto p{margin:0;line-height:1.55;color:var(--text-2);overflow-wrap:anywhere}
.v-veto p + p{margin-top:4px}
.v-veto a{color:var(--accent-2)}
dialog.cmp.v-colldlg{width:min(480px,calc(100vw - 32px))}
.v-collmap{margin:0 0 12px}
.v-colls{display:flex;flex-direction:column;gap:6px;max-height:50vh;overflow:auto}
.v-coll{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 14px;border:0;border-radius:10px;text-align:left;background:var(--panel-2);box-shadow:inset 0 0 0 1px var(--line)}
.v-coll:hover:not(:disabled){box-shadow:inset 0 0 0 1px var(--accent)}
.v-coll b{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:650}
.v-collnew{margin:14px 0 0;font-size:13px}
.v-collnew a{color:var(--accent-2)}
@media (max-width:640px){.v-rank{flex-direction:column;align-items:flex-start}.v-rank-at{align-items:flex-start;padding:12px 0 0;border-left:0;border-top:1px solid var(--line);width:100%}}
`;

K().page('map', map, css);
})();
