// =============================================
// Reimagined for Rhythia — Exodus clan list and clan page
// =============================================
// /clans (Rhythia's clan leaderboard) and /clans/:id (one clan: members, scores, friends and rivals).

var RhythiaX = RhythiaX || {};

(function () {
'use strict';
const K = () => RhythiaX.ExodusKit;
const {SITE, Data, esc, cssUrl, fmt, pct, REDUCED, ago, fullDate, diff, MODES, mods, flag, av, accTxt, shell, pager: pageNumbers, watchDialog, morph} = RhythiaX.ExodusKit;

/* ════════════════════ Clans ════════════════════ */
const CLAN_SORTS = [['trophies', 'Trophies'], ['avg-rp', 'Avg RP'], ['total-rp', 'Total RP']];
const TROPHY_TIP = '<b>Trophies</b><small>Ranked maps where this clan holds #1 in this mode. Only players active in the last 30 days count.</small>';
const TROPHY = '<svg class="v-trico" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h10v2h3v3a4 4 0 0 1-4 4h-.3A5 5 0 0 1 13 14.9V18h3v3H8v-3h3v-3.1A5 5 0 0 1 8.3 12H8a4 4 0 0 1-4-4V5h3V3Zm0 4H6v1a2 2 0 0 0 1 1.7V7Zm10 0v2.7A2 2 0 0 0 18 8V7h-1Z"/></svg>';
const parseMode = v => (v === 'spin' || v === 'vr' ? v : 'normal');
// Rhythia leaves a clan's average RP out until it has five members.
const avgRp = c => (c.members < 5 ? null : Math.round(c.rp / c.members));
const myClanId = me => Number(me?.clans?.id ?? me?.clan?.id ?? me?.clan) || null;
const clanChip = (url, cls = 'v-clav') => `<i class="${cls}" style="background-image:${cssUrl(url || '')}"></i>`;
function modePills(mode) {
  return `<div class="pills v-modes" aria-label="Clan gamemode">${Object.entries(MODES).map(([k, [l, img]]) => `<button type="button" aria-pressed="${mode === k}" data-mode="${k}"><img src="${SITE}/${img}" alt="">${l}</button>`).join('')}</div>`;
}
// Clan descriptions are written in Markdown and go through the shared reader (core/markdown.js), without pictures.
const richText = t => RhythiaX.ExodusMarkdown.md(String(t || '').trim(), {images: false});

function clans(host, ctx) {
  const R = host.shadowRoot, ac = new AbortController(), sig = {signal: ac.signal}, $ = s => R.querySelector(s);
  const ui = shell(R, sig);
  const S = {q: parse(), data: null, loading: false, seq: 0, enter: true, me: undefined};

  function parse() {
    const p = new URLSearchParams(location.search), sort = p.get('sort');
    return {
      mode: parseMode(p.get('mode')), q: (p.get('q') || '').slice(0, 100),
      sort: CLAN_SORTS.some(([k]) => k === sort) ? sort : 'trophies', page: Math.max(1, parseInt(p.get('page'), 10) || 1),
    };
  }
  function urlOf(q) {
    const p = new URLSearchParams();
    if (q.mode !== 'normal') p.set('mode', q.mode);
    if (q.q) p.set('q', q.q);
    if (q.sort !== 'trophies') p.set('sort', q.sort);
    if (q.page > 1) p.set('page', String(q.page));
    const s = p.toString();
    return `/clans${s ? '?' + s : ''}`;
  }
  const go = patch => ctx.go(urlOf({...S.q, ...patch}));

  function action() {
    if (S.me === undefined) return '';
    const mine = myClanId(S.me);
    if (mine) return `<a class="btn" href="/clans/${mine}">Open my clan</a>`;
    if (S.me) return '<button class="btn primary" type="button" data-native-click="Create clan">Create clan</button>';
    return '<span class="cap v-clin">Please log in to create or manage a clan.</span><button class="btn" type="button" data-native-click="Sign in">Sign in</button>';
  }
  function head() {
    return `<section class="container b-head"><div class="b-title"><img src="${SITE}/winner.png" alt="" class="b-mascot"><div><span class="cap">Clans</span><h1>Clan leaderboards</h1><p>Browse clans, compare trophies, and explore their top players.</p></div></div>
      <aside class="v-maps-links" id="v-clact">${action()}</aside></section>`;
  }
  function bar() {
    const q = S.q;
    return `<div class="container v-mbar"><div class="v-mrow v-mpills">
      ${modePills(q.mode)}
      <form class="field v-mq" id="v-clfind"><svg class="ico" aria-hidden="true"><use href="#i-search"/></svg><span class="sr">Search clans by name or tag</span><input id="v-clq" type="search" maxlength="100" placeholder="Search clans by name or tag..." value="${esc(q.q)}" autocomplete="off"></form>
      <div class="pills" aria-label="Sort clans">${CLAN_SORTS.map(([k, l]) => `<button type="button" aria-pressed="${q.sort === k}" data-sort="${k}">${l}</button>`).join('')}</div>
    </div></div>`;
  }
  function table() {
    const d = S.data, mine = myClanId(S.me);
    const cols = `<div class="v-clcols" aria-hidden="true"><span>#</span><span>Clan</span><span data-tip="${TROPHY_TIP}">Trophies</span><span>Members</span><span>Avg RP</span><span>Total RP</span></div>`;
    if (!d) return `<div class="v-table">${cols}${Array.from({length: 12}, () => '<div class="skeleton" style="height:36px;margin:8px 12px;border-radius:8px"></div>').join('')}</div>`;
    if (!d.clans.length) return '<div class="empty" style="padding:72px 0"><b>No clans found.</b></div>';
    return `<div class="v-table ${S.loading ? 'busy' : ''}">${cols}${d.clans.map(c => { const a = avgRp(c); return `<a class="v-clrow ${c.id === mine ? 'me' : ''}" href="/clans/${esc(c.id)}${S.q.mode !== 'normal' ? `?mode=${S.q.mode}` : ''}">
      <span class="pos num ${c.rank <= 3 ? 'p' + c.rank : ''}">${fmt(c.rank)}</span>
      <span class="who">${clanChip(c.avatar)}<b>${esc(c.name)}</b>${c.acronym ? `<span class="tag">${esc(c.acronym)}</span>` : ''}${c.id === mine ? '<span class="tag you">Your clan</span>' : ''}</span>
      <span class="tr num">${TROPHY}${fmt(c.trophies)}</span><span class="num">${fmt(c.members)}</span>
      <span class="num ${a == null ? 'cap' : ''}" ${a == null ? 'data-tip="<b>Not shown</b><small>Shown from five members</small>"' : ''}>${a == null ? '—' : fmt(a)}</span>
      <span class="num rp">${fmt(Math.round(c.rp))}</span></a>`; }).join('')}</div>`;
  }
  function pager() {
    const d = S.data; if (!d || d.total <= d.perPage) return '';
    return pageNumbers(S.q.page, Math.ceil(d.total / d.perPage), '', {perPage: d.perPage, total: d.total, noun: 'clans'});
  }
  function render() {
    $('#hero').innerHTML = '';
    $('#body').innerHTML = `<div class="b-page v-mpage v-clpage ${S.enter ? 'enter' : ''}">${head()}<div id="v-mbar">${bar()}</div><section class="container v-sec v-mlist"><div id="v-cltab">${table()}</div><div id="v-mpager">${pager()}</div></section><div style="height:96px"></div></div>`;
  }
  function refresh() {
    if (!$('.v-clpage')) return render();
    const f = R.activeElement?.id;
    morph($('#v-mbar'), bar()); morph($('#v-cltab'), table()); morph($('#v-mpager'), pager()); morph($('#v-clact'), action());
    if (f === 'v-clq') { const i = $('#v-clq'); i?.focus(); i?.setSelectionRange(i.value.length, i.value.length); }
  }
  async function load() {
    const seq = ++S.seq, q = {...S.q};
    S.loading = true;
    const snap = await Data().clansSnapshot(q).catch(() => null);
    if (seq !== S.seq) return;
    if (snap) S.data = snap;
    refresh();
    try {
      const d = await Data().clans(q, ac.signal);
      if (seq !== S.seq) return;
      S.data = d;
    } catch (err) {
      if (seq !== S.seq || ac.signal.aborted) return;
      S.loading = false;
      if (!S.data) { $('#v-cltab').innerHTML = `<div class="empty" style="padding:72px 0"><b>Could not load clans.</b>${esc(err.message)}</div>`; return; }
      ui.toast('Showing the saved list; Rhythia did not answer.');
    }
    S.loading = false;
    refresh();
    S.enter = false;
  }

  R.addEventListener('click', e => {
    const t = e.target.closest('[data-mode],[data-sort],[data-page]');
    if (!t || t.disabled) return;
    const d = t.dataset;
    if (d.mode) { if (d.mode !== S.q.mode) go({mode: d.mode, page: 1}); return; }
    if (d.sort) { if (d.sort !== S.q.sort) go({sort: d.sort, page: 1}); return; }
    if (d.page) { go({page: Number(d.page)}); const el = $('.v-mlist'); if (el && el.getBoundingClientRect().top < 0) scrollTo({top: el.getBoundingClientRect().top + scrollY - 120, behavior: REDUCED ? 'auto' : 'smooth'}); }
  }, sig);
  let typing = 0;
  R.addEventListener('input', e => {
    if (e.target.id !== 'v-clq') return;
    clearTimeout(typing);
    const v = e.target.value.trim();
    typing = setTimeout(() => { if (v !== S.q.q) go({q: v, page: 1}); }, 300);
  }, sig);
  R.addEventListener('submit', e => {
    if (e.target.id !== 'v-clfind') return;
    e.preventDefault(); clearTimeout(typing);
    const v = $('#v-clq').value.trim(); if (v !== S.q.q) go({q: v, page: 1});
  }, sig);

  render();
  load();
  Data().signedIn().then(me => { if (ac.signal.aborted) return; S.me = me || null; refresh(); }).catch(() => { S.me = null; });

  return {
    state: () => ({}), idle: () => true, relayout() {},
    page() { const q = parse(); if (urlOf(q) === urlOf(S.q)) return; S.q = q; load(); },
    destroy() { ac.abort(); ui.hide(); clearTimeout(typing); },
  };
}

/* ════════════════════ Clan ════════════════════ */
function clan(host, ctx) {
  const R = host.shadowRoot, ac = new AbortController(), sig = {signal: ac.signal}, $ = s => R.querySelector(s);
  const ui = shell(R, sig);
  const id = Number(ctx.id);
  const S = {mode: parseMode(new URLSearchParams(location.search).get('mode')), d: null, ranks: null, me: undefined, scores: [], scorePage: 1, more: false, enter: true, seq: 0};

  const isOwner = () => Boolean(S.me && S.d && S.me.id === S.d.owner);
  const canInvite = () => Boolean(S.d && (S.d.canInvite || isOwner()));
  const isMember = () => Boolean(S.me && S.d && myClanId(S.me) === S.d.id);

  function actions() {
    const d = S.d; if (!d || !S.me) return '';
    const full = d.stats.totalMembers >= d.stats.memberLimit, out = [];
    // Rhythia's own buttons: its dialogs open above Exodus and do the change.
    if (canInvite()) out.push(full ? '<button class="btn" type="button" disabled data-tip="<b>Clan is full</b>">Clan full</button>' : '<button class="btn primary" type="button" data-native-click="Invite">Invite</button>');
    if (isOwner()) out.push('<button class="btn" type="button" data-native-click="Edit clan">Edit clan</button>', '<button class="btn danger" type="button" data-native-click="Delete clan">Delete clan</button>');
    else if (isMember() && !canInvite()) out.push('<button class="btn danger" type="button" data-native-click="Leave clan">Leave clan</button>');
    if (canInvite()) out.push('<button class="btn" type="button" data-native-x data-tip="<b>Rhythia’s clan page</b><small>Remove members, set friends and rivals</small>">Members and relationships</button>');
    return out.join('');
  }
  function hero() {
    const d = S.d, leader = d.members.find(m => m.id === d.owner), rk = S.ranks;
    const ranks = rk ? [['trophies', 'by trophies'], ['total-rp', 'by total RP'], ['avg-rp', 'by average RP']].filter(([k]) => rk[k]).map(([k, l]) => `<span class="v-chip plain num">#${fmt(rk[k])} ${l}</span>`).join('') : '';
    return `<div class="v-banner" style="background-image:${cssUrl(d.avatar || '')}"></div>
      <div class="container v-hero-in">
        <div class="v-cover" style="background-image:${cssUrl(d.avatar || '')}"></div>
        <div class="v-who"><span class="cap">Clan</span><h1>${esc(d.name)} ${d.acronym ? `<span class="v-acr">[${esc(d.acronym)}]</span>` : ''}</h1>
          <p class="v-by">${leader ? `<span>Clan leader <a href="/player/${esc(leader.id)}">${esc(leader.username)}</a></span>` : ''}<span data-tip="<b>${esc(fullDate(d.created))}</b>">Founded ${esc(ago(d.created))}</span></p>
          <div class="v-chips">${ranks}</div>
          <div class="v-act">${modePills(S.mode)}<span id="v-clacts" class="v-clacts">${actions()}</span></div>
        </div></div>
      <div class="container"><div class="v-kpis">
        <div data-tip="${TROPHY_TIP}"><small>Trophies</small><b class="num v-trk">${TROPHY}${fmt(d.stats.trophyCount)}</b></div>
        <div><small>Total RP</small><b class="num">${fmt(Math.round(d.stats.totalRp || 0))}</b></div>
        <div><small>Average RP</small><b class="num">${fmt(Math.round(d.stats.averageRpPerMember || 0))}</b></div>
        <div><small>Total members</small><b class="num">${fmt(d.stats.totalMembers)}<span> /${fmt(d.stats.memberLimit)}</span></b></div>
        <div ${d.stats.lastActivity ? `data-tip="<b>${esc(fullDate(d.stats.lastActivity))}</b>"` : ''}><small>Last score</small><b>${d.stats.lastActivity ? esc(ago(d.stats.lastActivity)) : '—'}</b></div>
      </div></div>`;
  }
  function relList(list) {
    return list.length ? list.map(c => `<a class="v-clrel" href="/clans/${esc(c.id)}">${clanChip(c.avatar_url)}<b>${esc(c.name)}</b>${c.acronym ? `<span class="tag">${esc(c.acronym)}</span>` : ''}</a>`).join('') : '<p class="cap">None.</p>';
  }
  function aboutSec() {
    const d = S.d;
    return `<section class="container v-sec v-clabout">
      ${d.description.trim() ? `<div class="v-card"><small>Description</small><div class="v-cldesc md">${richText(d.description)}</div></div>` : ''}
      <div class="v-card"><small>Friends</small>${relList(d.friends)}<span class="cap">Friended by ${fmt(d.stats.friendedBy || 0)} ${d.stats.friendedBy === 1 ? 'clan' : 'clans'}</span></div>
      <div class="v-card"><small>Rivals</small>${relList(d.rivals)}<span class="cap">Rivaled by ${fmt(d.stats.rivaledBy || 0)} ${d.stats.rivaledBy === 1 ? 'clan' : 'clans'}</span></div>
    </section>`;
  }
  function membersSec() {
    const d = S.d, total = d.members.reduce((s, m) => s + m.rp, 0) || 1, top = Math.max(...d.members.map(m => m.rp), 1);
    const list = [...d.members].sort((a, b) => b.rp - a.rp);
    const countries = Object.entries(list.reduce((o, m) => { if (m.flag) o[m.flag] = (o[m.flag] || 0) + 1; return o; }, {})).sort((a, b) => b[1] - a[1]);
    const rows = list.map((m, i) => `<a class="v-mrow2 ${S.me && m.id === S.me.id ? 'me' : ''}" href="/player/${esc(m.id)}${S.mode !== 'normal' ? `?mode=${S.mode}` : ''}">
      <span class="pos num ${i < 3 ? 'p' + (i + 1) : ''}">${fmt(i + 1)}</span>
      <span class="who">${flag(m.flag)}${av(m.avatar)}<b>${esc(m.username)}</b>${m.id === d.owner ? '<span class="tag lead">Clan leader</span>' : ''}${S.me && m.id === S.me.id ? '<span class="tag you">You</span>' : ''}</span>
      <span class="rp num">${fmt(m.rp, 2)} <small>RP</small></span>
      <span class="share" data-tip="<b>${pct(m.rp / total, 1)} of the clan’s RP</b><small>Out of ${fmt(Math.round(total))} RP</small>"><i style="width:${(m.rp / top) * 100}%"></i><em class="num">${pct(m.rp / total, 1)}</em></span>
      <span class="num plays">${fmt(m.plays)} <small>plays</small></span></a>`).join('');
    return `<section class="container v-sec" id="v-clmem"><div class="sec-head"><div><h2>Active members</h2><p class="lede">List of members that contribute to this clan.</p></div>
        ${countries.length ? `<div class="v-clcty" aria-label="Countries">${countries.map(([c, n]) => `<span data-tip="<b>${esc(c)}</b><small>${n} ${n === 1 ? 'member' : 'members'}</small>">${flag(c)}<b class="num">${n}</b></span>`).join('')}</div>` : ''}</div>
      ${list.length ? `<div class="v-table">${rows}</div>` : '<div class="empty"><b>No active members found.</b></div>'}</section>`;
  }
  function scoreRow(s, i) {
    const [dl, dc] = diff(s.difficulty);
    return `<a class="v-csrow" href="/score/${esc(s.id)}">
      <span class="pos num ${i < 3 ? 'p' + (i + 1) : ''}">${fmt(i + 1)}</span>
      <span class="who">${av(s.avatar)}<span class="two"><b>${esc(s.username)}</b><small><i class="dot" style="--c:${dc}" data-tip="<b>${dl}</b>"></i>${esc(s.title)}</small></span></span>
      <span class="acc num">${accTxt(s.acc)}</span>${mods(s)}
      <span class="rp num">${fmt(s.rp)} <small>RP</small></span>
      <span class="at" data-tip="<b>${esc(fullDate(s.at))}</b>">${esc(ago(s.at))}</span></a>`;
  }
  function scoresSec() {
    const d = S.d, left = d.scoreTotal - S.scores.length;
    return `<section class="container v-sec" id="v-clsc"><div class="sec-head"><div><h2>Top scores</h2><p class="lede">${fmt(d.scoreTotal)} ${d.scoreTotal === 1 ? 'score' : 'scores'} in ${esc(MODES[S.mode][0])}.</p></div></div>
      ${S.scores.length ? `<div class="v-table">${S.scores.map(scoreRow).join('')}</div>` : '<div class="empty"><b>This clan has no recorded top scores.</b></div>'}
      ${left > 0 ? `<div class="v-moreb"><button class="btn" type="button" data-more-scores ${S.more ? 'disabled' : ''}>${S.more ? 'Loading scores…' : `Show ${fmt(Math.min(left, 10))} more`}</button></div>` : ''}</section>`;
  }
  function render() {
    const d = S.d;
    morph($('#hero'), `<section class="v-hero map ${S.enter ? 'enter' : ''}">${hero()}</section>`);
    morph($('#body'), `<div class="v-page ${S.enter ? 'enter' : ''}">${aboutSec()}${membersSec()}${scoresSec()}<div style="height:96px"></div></div>`);
    document.title = `${d.name} | Rhythia`;
  }
  function skeleton() {
    $('#hero').innerHTML = '<section class="v-hero"><div class="container v-hero-in"><div class="v-cover skeleton"></div><div class="v-who"><div class="skeleton" style="width:40%;height:34px"></div><div class="skeleton" style="width:25%;margin-top:14px"></div></div></div></section>';
    $('#body').innerHTML = '';
  }
  async function load(fresh = false) {
    const seq = ++S.seq, mode = S.mode;
    if (!fresh) {
      const snap = await Data().clanSnapshot(id, mode).catch(() => null);
      if (seq !== S.seq) return;
      if (snap) { S.d = snap; S.scores = snap.scores; S.scorePage = 1; render(); } else if (!S.d) skeleton();
    }
    try {
      const d = await Data().clanPage(id, mode, ac.signal);
      if (seq !== S.seq) return;
      S.d = d; S.scores = d.scores; S.scorePage = 1;
    } catch (err) {
      if (seq !== S.seq || ac.signal.aborted) return;
      if (!S.d) { $('#hero').innerHTML = ''; $('#body').innerHTML = `<div class="container"><div class="empty" style="padding:120px 0"><b>Could not load this clan</b>${esc(err.message)}<div style="margin-top:16px"><button class="btn" type="button" data-native-x>Show Rhythia's page</button></div></div></div>`; return; }
      ui.toast('Showing the saved clan; Rhythia did not answer.');
    }
    render();
    S.enter = false;
    Data().clanRanks(S.d, mode, ac.signal).then(r => { if (seq !== S.seq) return; S.ranks = r; morph($('.v-hero'), hero()); }).catch(() => {});
  }
  async function moreScores() {
    if (S.more || !S.d) return;
    S.more = true; morph.outer($('#v-clsc'), scoresSec());
    const seq = S.seq;
    try {
      const list = await Data().clanScores(id, S.mode, S.scorePage + 1, ac.signal);
      if (seq !== S.seq) return;
      S.scorePage++; S.scores = [...S.scores, ...list.filter(s => !S.scores.some(x => x.id === s.id))];
    } catch (err) { if (!ac.signal.aborted) ui.toast(`Could not load more scores: ${err.message}`); }
    S.more = false;
    morph.outer($('#v-clsc'), scoresSec());
  }

  // After Rhythia's own dialog (invite, edit, leave) closes, read the clan again.
  const dialog = watchDialog(`/clans/${id}`, () => load(true));

  R.addEventListener('click', e => {
    if (e.target.closest('[data-native-x]')) { ctx.showNative(); return; }
    if (e.target.closest('[data-native-click]')) { dialog.start(); return; }
    const t = e.target.closest('[data-mode],[data-more-scores]');
    if (!t || t.disabled) return;
    if (t.dataset.mode) {
      if (t.dataset.mode === S.mode) return;
      ctx.go(`/clans/${id}${t.dataset.mode !== 'normal' ? `?mode=${t.dataset.mode}` : ''}`);
      return;
    }
    if ('moreScores' in t.dataset) moreScores();
  }, sig);

  load();
  Data().signedIn().then(me => { if (ac.signal.aborted) return; S.me = me || null; if (S.d) render(); }).catch(() => { S.me = null; });

  return {
    state: () => ({}), idle: () => !S.more, relayout() {},
    page() { const m = parseMode(new URLSearchParams(location.search).get('mode')); if (m === S.mode) return; S.mode = m; S.ranks = null; load(); },
    destroy() { ac.abort(); ui.hide(); dialog.stop(); },
  };
}

const css = `
.v-modes button img{height:15px}
[data-theme="white"] .v-modes img{filter:invert(1)}
.v-clin{max-width:200px}
.v-trico{width:15px;height:15px;flex:none;fill:#eab308}
.v-clcols,.v-clrow{display:grid;grid-template-columns:52px minmax(0,1fr) 100px 90px 100px 120px;align-items:center;gap:12px}
.v-clcols{padding:10px 12px;font-size:12px;font-weight:600;color:var(--muted);border-bottom:1px solid var(--line)}
.v-clcols span:nth-child(n+3),.v-clrow > span:nth-child(n+3){text-align:right;justify-content:flex-end}
.v-clrow{padding:9px 12px;border-radius:10px;transition:background-color .15s}
.v-clrow + .v-clrow{box-shadow:0 -1px 0 var(--line)}
.v-clrow:hover{background:rgba(var(--ink),.045)}
.v-clrow.me,.v-mrow2.me{background:var(--accent-soft)}
.v-clrow .pos,.v-mrow2 .pos,.v-csrow .pos{font-weight:750;color:var(--muted);text-align:center}
.v-clrow .pos.p1,.v-mrow2 .pos.p1,.v-csrow .pos.p1{color:#e2b43a}.v-clrow .pos.p2,.v-mrow2 .pos.p2,.v-csrow .pos.p2{color:#b6c0cd}.v-clrow .pos.p3,.v-mrow2 .pos.p3,.v-csrow .pos.p3{color:#d08a5c}
.v-clrow .who,.v-mrow2 .who,.v-csrow .who{display:flex;align-items:center;gap:10px;min-width:0}
.v-clrow .who b,.v-mrow2 .who b,.v-csrow .who b{font-weight:650;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.v-clrow .tag,.v-mrow2 .tag,.v-clrel .tag{flex:none;padding:1px 6px;border-radius:5px;font-size:11px;font-weight:700;color:var(--muted);box-shadow:inset 0 0 0 1px var(--line-2)}
.tag.you{color:var(--accent-2);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--accent) 45%,transparent)}
.tag.lead{color:#eab308;box-shadow:inset 0 0 0 1px rgba(234,179,8,.4)}
.v-clrow .tr{display:inline-flex;align-items:center;gap:6px;font-weight:700;color:#facc15}
[data-theme="white"] .v-clrow .tr{color:#a16207}
.v-clrow .rp{font-weight:750}
.v-clav{display:block;width:44px;height:22px;flex:none;border-radius:4px;background:var(--panel-3) center/cover}
.v-acr{font-size:.55em;font-weight:650;color:var(--muted);letter-spacing:0}
.v-act .v-modes{height:40px;align-items:stretch}
.v-act .v-modes button{height:auto}
.v-clacts{display:contents}
.v-trk{display:inline-flex!important;align-items:center;gap:8px;color:#facc15}
.v-trk .v-trico{width:20px;height:20px}
[data-theme="white"] .v-trk{color:#a16207}
.v-clabout{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px}
.v-clabout .v-card{gap:10px}
.v-cldesc{line-height:1.65;color:var(--text-2);overflow-wrap:anywhere}
.v-cldesc a{color:var(--accent-2);font-weight:600}
.v-cldesc a:hover{text-decoration:underline;text-underline-offset:3px}
.v-cldesc > :last-child{margin-bottom:0}
.v-clrel{display:flex;align-items:center;gap:10px;min-width:0;padding:8px 10px;border-radius:10px;background:var(--panel-2)}
.v-clrel b{font-weight:650;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.v-clrel:hover b{color:var(--accent-2)}
[data-variant="lines"] .v-clabout{gap:0}
.v-clcty{display:flex;flex-wrap:wrap;gap:6px}
.v-clcty span{display:inline-flex;align-items:center;gap:6px;height:28px;padding:0 9px;border-radius:8px;background:var(--panel-2);box-shadow:inset 0 0 0 1px var(--line);font-size:12.5px}
.v-mrow2{display:grid;grid-template-columns:44px minmax(0,1fr) 130px minmax(120px,200px) 100px;align-items:center;gap:12px;padding:9px 12px;border-radius:10px;transition:background-color .15s}
.v-mrow2 + .v-mrow2,.v-csrow + .v-csrow{box-shadow:0 -1px 0 var(--line)}
.v-mrow2:hover,.v-csrow:hover{background:rgba(var(--ink),.045)}
.v-mrow2 .rp,.v-csrow .rp{font-weight:750;text-align:right}
.v-mrow2 small,.v-csrow small{font-size:11px;color:var(--muted);font-weight:600}
.v-mrow2 .plays{text-align:right;color:var(--text-2)}
.share{display:flex;align-items:center;gap:10px}
.share i{display:block;height:6px;border-radius:3px;background:var(--accent);min-width:2px}
.share em{font-style:normal;font-size:12.5px;font-weight:650;color:var(--text-2)}
.v-csrow{display:grid;grid-template-columns:44px minmax(0,1fr) 84px 150px 90px 110px;align-items:center;gap:12px;padding:9px 12px;border-radius:10px;transition:background-color .15s}
.v-csrow .two{display:flex;flex-direction:column;min-width:0}
.v-csrow .two small{display:flex;align-items:center;gap:6px;font-size:12.5px;font-weight:500;color:var(--text-2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.v-csrow .dot{width:8px;height:8px;flex:none;border-radius:50%;background:var(--c)}
.v-csrow .acc{text-align:right;font-weight:650}
.v-csrow .mods{justify-self:start}
.v-csrow .at{font-size:12.5px;color:var(--muted);text-align:right}
@media (max-width:1000px){.v-csrow{grid-template-columns:40px minmax(0,1fr) 76px 90px}.v-csrow .mods,.v-csrow .at{display:none}.v-mrow2{grid-template-columns:40px minmax(0,1fr) 110px 120px}.v-mrow2 .plays{display:none}}
@media (max-width:640px){.v-clcols,.v-clrow{grid-template-columns:32px minmax(0,1fr) 64px 80px;gap:8px}.v-clcols span:nth-child(4),.v-clcols span:nth-child(5),.v-clrow > span:nth-child(4),.v-clrow > span:nth-child(5),.v-clrow .tag{display:none}
  .v-mrow2{grid-template-columns:32px minmax(0,1fr) 92px;gap:8px}.v-mrow2 .share,.v-mrow2 .tag,.v-mrow2 .v-flag{display:none}.v-csrow{grid-template-columns:32px minmax(0,1fr) 70px;gap:8px}.v-csrow .acc{display:none}.v-mbar .v-modes{width:100%}.v-mbar .v-modes button{flex:1}}
`;

K().page('clans', clans, css);
K().page('clan', clan);
})();
