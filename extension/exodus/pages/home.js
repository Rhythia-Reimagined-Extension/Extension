// =============================================
// Reimagined for Rhythia — Exodus home page
// =============================================
// Rhythia's front page in the Exodus look: the gameplay video behind a clear
// headline, live numbers, the newest ranked maps, the leaderboard, clans, who is
// online over the last day, community comments and the latest game release.
// Renders into the shared Exodus shell (header, tooltip, toast) in the shadow root.

var RhythiaX = RhythiaX || {};

RhythiaX.ExodusHome = function mountExodusHome(host, D, ctx) {
'use strict';

const R = host.shadowRoot;
const ac = new AbortController(), sig = {signal: ac.signal};
const {SITE, esc, fmt, diff} = RhythiaX.ExodusKit;
const STEAM = 'https://store.steampowered.com/app/2250500/Rhythia/';
const DISCORD = 'https://discord.com/invite/rhythiagame';
const VIDEO = 'https://static.rhythia.com/output.mp4#t=10';
const $ = s => R.querySelector(s);
const cssUrl = RhythiaX.ExodusKit.cssUrl;
const compact = n => Number(n || 0).toLocaleString('en-US', {notation: 'compact', maximumFractionDigits: 1});
const ico = id => `<svg class="ico" aria-hidden="true"><use href="#i-${id}"/></svg>`;
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const flag = f => f ? `<img class="h-flag" src="${SITE}/flags/${esc(f)}.svg" alt="${esc(f)}">` : '';
const clock = t => new Date(t).toLocaleTimeString('en-GB', {hour: '2-digit', minute: '2-digit'});
const length = ms => { const s = Math.round((ms || 0) / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
const MODES = {normal: ['Lock', 'lock.png', 'rp', 'position', 'change'], spin: ['Spin', 'spincam.png', 'spinRp', 'spinPosition', 'spinChange'], vr: ['VR', 'vr.png', 'vrRp', 'vrPosition', 'vrChange']};
const STEAM_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true" style="fill:currentColor"><path d="M11.98 0C5.67 0 .5 4.86.02 11.04l6.43 2.66a3.38 3.38 0 0 1 1.92-.6h.19l2.86-4.15v-.06a4.53 4.53 0 1 1 4.53 4.53h-.1l-4.08 2.91v.16a3.4 3.4 0 0 1-6.73.68L.44 15.3A12 12 0 1 0 11.98 0ZM7.53 18.2l-1.47-.61a2.55 2.55 0 1 0 1.4-3.49l1.52.63a1.88 1.88 0 1 1-1.45 3.47Zm11.4-9.28a3.02 3.02 0 1 0-6.04 0 3.02 3.02 0 0 0 6.04 0Zm-5.28 0a2.27 2.27 0 1 1 4.54 0 2.27 2.27 0 0 1-4.54 0Z"/></svg>';
const DISCORD_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true" style="fill:currentColor"><path d="M20.32 4.37A19.8 19.8 0 0 0 15.4 2.8a13.8 13.8 0 0 0-.63 1.3 18.4 18.4 0 0 0-5.52 0 13 13 0 0 0-.64-1.3 19.7 19.7 0 0 0-4.93 1.53C.53 9.05-.32 13.6.1 18.1a19.9 19.9 0 0 0 6.04 3.05c.49-.66.92-1.37 1.3-2.1a12.9 12.9 0 0 1-2.05-.98l.5-.39a14.2 14.2 0 0 0 12.2 0l.5.39c-.65.39-1.34.72-2.05.98.37.73.81 1.44 1.3 2.1a19.8 19.8 0 0 0 6.04-3.05c.5-5.2-.84-9.72-3.56-13.73ZM8.02 15.33c-1.18 0-2.16-1.08-2.16-2.42s.96-2.42 2.16-2.42c1.21 0 2.18 1.09 2.16 2.42 0 1.34-.96 2.42-2.16 2.42Zm7.97 0c-1.18 0-2.15-1.08-2.15-2.42s.95-2.42 2.15-2.42c1.21 0 2.18 1.09 2.16 2.42 0 1.34-.95 2.42-2.16 2.42Z"/></svg>';
const HEART_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true" style="fill:currentColor"><path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 2.9 4.5 6.6 4.5c2.2 0 3.6 1.2 4.4 2.5.8-1.3 2.2-2.5 4.4-2.5 3.7 0 5.7 3.9 4.2 7.3C19.5 16.4 12 21 12 21Z"/></svg>';

const S = {lb: ctx.state?.lb || 'normal', allOnline: false};
// A quiet refresh brings fresh data with only the Lock list; Spin and VR lists the old view had loaded come along.
for (const [k, list] of Object.entries(ctx.state?.lists || {})) if (MODES[k] && !D.leaderboard[k] && Array.isArray(list) && list.length) D.leaderboard[k] = list;
const online = new Set(D.online.map(p => String(p.id)));
const friendsOn = D.friends.filter(f => online.has(String(f.id)));
const friendIds = new Set(friendsOn.map(f => String(f.id)));

/* ── Tooltip and toast (core/kit.js, as on the other pages; Rhythia's own buttons are opened below) ── */
const {hide: hideTip} = RhythiaX.ExodusKit.tips(R, sig);
const toast = m => RhythiaX.ExodusKit.toast(R, m);

/* ── Count-up and reveal on scroll ── */
function countUp(el) {
  const to = Number(el.dataset.count), d = Number(el.dataset.d || 0);
  delete el.dataset.count;
  if (REDUCED || ctx.quiet) { el.textContent = fmt(to, d); return; }
  const t0 = performance.now(), dur = 1100;
  const step = t => { const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3); el.textContent = fmt(to * e, d); if (k < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}
const counter = (v, d = 0) => `<span data-count="${v}" data-d="${d}">${fmt(ctx.quiet ? v : 0, d)}</span>`;
const io = 'IntersectionObserver' in window ? new IntersectionObserver(es => es.forEach(e => {
  if (!e.isIntersecting) return;
  e.target.classList.add('in'); io.unobserve(e.target);
  e.target.querySelectorAll('[data-count]').forEach(countUp);
}), {rootMargin: '0px 0px -8% 0px'}) : null;
const watch = root => root.querySelectorAll('.reveal:not(.in)').forEach(el => io && !ctx.quiet ? io.observe(el) : (el.classList.add('in'), el.querySelectorAll('[data-count]').forEach(countUp)));

/* ── Hero ── */
function welcome() {
  const me = D.me;
  if (!me) return `<img class="h-mascot" src="${SITE}/mascot.png" alt="" width="300">`;
  return `<div class="h-me">
      <a class="h-me-av" href="/player/${esc(me.id)}" style="background-image:${cssUrl(me.avatar)}" aria-label="Your profile"></a>
      <small>Welcome back</small><strong>${esc(me.username)}</strong>
      <dl><div><dt>Global</dt><dd class="num">${me.position ? '#' + fmt(me.position) : '—'}</dd></div>
        <div><dt>Country</dt><dd class="num">${me.countryPosition ? '#' + fmt(me.countryPosition) : '—'}</dd></div>
        <div><dt>RP</dt><dd class="num">${fmt(me.rp, 2)}</dd></div></dl>
      <div class="h-me-go"><a class="btn" href="/player/${esc(me.id)}">${ico('user')}Your profile</a><a class="btn" href="/player/${esc(me.id)}/scores">${ico('list')}Your scores</a></div>
      ${friendsOn.length ? `<p class="h-me-fr"><span class="h-dot"></span>${friendsOn.length === 1 ? `${esc(friendsOn[0].username)} is playing now` : `${friendsOn.length} friends are playing now`}</p>` : ''}
    </div>`;
}
function hero() {
  const st = D.stats, peak = st?.chart.length ? Math.max(...st.chart.map(p => p.v)) : st?.online;
  return `<section class="h-hero" aria-label="Rhythia">
    ${RhythiaX.ExodusPrefs?.exodus?.homeVideo === false ? '<div class="h-stage novideo" aria-hidden="true"><i class="h-shade"></i></div>'
      : `<div class="h-stage" aria-hidden="true"><video muted loop playsinline preload="${REDUCED ? 'none' : 'auto'}" ${REDUCED ? '' : 'autoplay'} src="${VIDEO}"></video><i class="h-shade"></i></div>`}
    <div class="container h-grid">
      <div class="h-copy">
        <h1>The most fun rhythm game is now on Steam</h1>
        <p>start playing now!</p>
        <div class="h-cta">
          <a class="btn h-steam" href="${STEAM}" target="_blank" rel="noopener noreferrer">${STEAM_SVG}Buy on Steam</a>
          <button class="btn h-ghost" type="button" data-native-click="Buy with Card" data-tip="<b>Buy with card</b><small>Card, Apple Pay or Google Pay</small>">Buy with card</button>
          ${D.me ? '' : '<button class="btn h-ghost" type="button" data-native-click="Sign in">Sign in</button>'}
          <a class="iconbtn h-round" href="${DISCORD}" target="_blank" rel="noopener noreferrer" aria-label="Rhythia on Discord" data-tip="Discord">${DISCORD_SVG}</a>
          <a class="iconbtn h-round h-love" href="/support" aria-label="Become a Supporter" data-tip="<b>Become a Supporter</b><small>Unlocks the profile showcase</small>">${HEART_SVG}</a>
        </div>
      </div>
      <div class="h-side">${welcome()}</div>
    </div>
  </section>
  ${st ? `<div class="container h-numbers reveal"><div class="kpis">
    <div class="kpi"><small><span class="h-dot"></span>Online now</small><strong class="num">${counter(st.online)}</strong><span class="num">Peak today ${fmt(peak)}</span></div>
    <div class="kpi"><small>Players</small><strong class="num">${counter(st.players)}</strong></div>
    <div class="kpi"><small>Scores submitted</small><strong class="num">${counter(st.scores)}</strong></div>
    <div class="kpi"><small>Beatmaps</small><strong class="num">${counter(st.beatmaps)}</strong></div>
  </div></div>` : '<div class="h-numbers-gap"></div>'}`;
}

/* ── Latest ranked maps ── */
function maps() {
  if (!D.maps.length) return '';
  return `<section class="container section reveal h-sec" aria-labelledby="h-maps">
    <div class="sec-head"><div><h2 id="h-maps">Latest ranked maps</h2></div><a class="h-more" href="/maps">All maps →</a></div>
    <div class="h-maps">${D.maps.map((m, i) => { const [dl, dc] = diff(m.difficulty); return `<a class="h-map" href="/maps/${esc(m.id)}" style="--i:${i}">
        <span class="art" style="background-image:${cssUrl(m.img)}"></span>
        <span class="chips"><span class="h-diff" style="--c:${dc}">${dl}</span><span class="h-star num">★ ${fmt(m.stars, 2)}</span></span>
        <span class="plate"><b title="${esc(m.title)}">${esc(m.title)}</b><small><span>by ${esc(m.mapper || 'Unknown')}</span><span class="num">${length(m.length)}</span><span class="num">${fmt(m.plays)} plays</span></small></span>
      </a>`; }).join('')}</div>
  </section>`;
}

/* ── Leaderboard ── */
function lbRows() {
  const [, , rpK, posK, chK] = MODES[S.lb], list = D.leaderboard[S.lb];
  if (!list) return `<div class="h-lb-load">${Array.from({length: 10}, () => '<div class="skeleton" style="height:22px;margin:13px 0"></div>').join('')}</div>`;
  if (!list.length) return '<div class="empty">No players to show.</div>';
  const me = D.me, meIn = me && list.some(u => String(u.id) === String(me.id));
  const row = (u, i, mine) => {
    const ch = u[chK] || 0, pos = u[posK] || i + 1;
    return `<a class="h-lb-row ${mine ? 'me' : ''}" href="/player/${esc(u.id)}" style="--i:${i}">
      <span class="pos num ${pos <= 3 ? 'p' + pos : ''}">${fmt(pos)}</span>
      <span class="av" style="background-image:${cssUrl(u.avatar)}"></span>
      <span class="who"><b>${esc(u.username)}</b>${flag(u.flag)}${u.clan ? `<span class="tag">${esc(u.clan.acronym)}</span>` : ''}</span>
      <span class="ch num ${ch > 0 ? 'up' : ch < 0 ? 'down' : ''}" ${ch ? `data-tip="${ch > 0 ? 'Up' : 'Down'} ${Math.abs(ch)} since yesterday"` : ''}>${ch > 0 ? '▲ ' + ch : ch < 0 ? '▼ ' + -ch : '–'}</span>
      <span class="rp num">${fmt(u[rpK])}<small> RP</small></span></a>`;
  };
  return list.map((u, i) => row(u, i, me && String(u.id) === String(me.id))).join('')
    + (me && !meIn && S.lb === 'normal' && me.position ? `<div class="h-lb-gap" aria-hidden="true">···</div>${row({...me, change: 0}, 10, true)}` : '');
}
function leaderboard() {
  return `<section class="panel h-lb" aria-labelledby="h-lb">
    <div class="panel-head"><h3 id="h-lb">Leaderboard <span>· top 10</span></h3>
      <div class="pills" aria-label="Game mode">${Object.entries(MODES).map(([k, v]) => `<button type="button" aria-pressed="${S.lb === k}" data-lb="${k}"><img src="${SITE}/${v[1]}" alt="">${v[0]}</button>`).join('')}</div></div>
    <div class="h-lb-list" id="h-lb-list">${lbRows()}</div>
    <a class="h-more h-foot-link" href="/leaderboards">Full leaderboard →</a>
  </section>`;
}
function clans() {
  if (!D.clans.length) return '';
  return `<section class="panel h-clans" aria-labelledby="h-clans"><div class="panel-head"><h3 id="h-clans">Top clans</h3><a class="h-more" href="/clans">All clans →</a></div>
    ${D.clans.map((c, i) => `<a class="h-clan" href="/clans/${esc(c.id)}"><span class="pos num p${i + 1}">${i + 1}</span><span class="av sq" style="background-image:${cssUrl(c.avatar)}"></span>
      <span class="who"><b>${esc(c.name)}</b><small>[${esc(c.acronym)}] · ${fmt(c.members)} members</small></span><span class="rp num" data-tip="${fmt(c.rp, 0)} RP across all members">${compact(c.rp)}<small> RP</small></span></a>`).join('')}
  </section>`;
}

/* ── What's new: the latest game release ── */
function release() {
  const c = D.changelog; if (!c) return '';
  const lines = String(c.markdown || '').split('\n');
  const title = (lines.find(l => /^#{1,3}\s/.test(l)) || 'Latest release').replace(/^#+\s*/, '').replace(/:\s*$/, '');
  const items = lines.filter(l => /^\s*[-*]\s+/.test(l)).map(l => l.replace(/^\s*[-*]\s+/, '').replace(/^Fix\s*-\s*/i, 'Fixed: ')).slice(0, 5);
  const inline = t => esc(t).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
  return `<section class="panel h-rel" aria-labelledby="h-rel"><div class="panel-head"><h3 id="h-rel">What’s new <span>· ${new Date(c.date + 'T00:00:00Z').toLocaleDateString('en-GB', {day: 'numeric', month: 'long', timeZone: 'UTC'})}</span></h3><a class="h-more" href="/changelog">Changelog →</a></div>
    <strong class="h-rel-t">${esc(title)}</strong>
    <ul>${items.map(t => `<li>${inline(t)}</li>`).join('')}</ul></section>`;
}

/* ── Who is playing: the last 24 hours and the names in game ── */
function onlineChart() {
  const pts = D.stats?.chart || [];
  if (pts.length < 2) return '<div class="empty">No data for the last day yet.</div>';
  const W = 1000, Hh = 200, T = 10, B = 10, vals = pts.map(p => p.v), lo = Math.min(...vals), hi = Math.max(...vals);
  const pad = (hi - lo) * .18 || 10, a = Math.max(0, lo - pad), b = hi + pad;
  const x = i => i * W / (pts.length - 1), y = v => Hh - B - (v - a) / (b - a) * (Hh - T - B);
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.v).toFixed(1)}`).join('');
  const iHi = vals.indexOf(hi), iLo = vals.indexOf(lo), step = Math.ceil(pts.length / 48), cw = W / pts.length * step;
  const hits = pts.map((p, i) => i % step ? '' : `<rect class="hit" x="${Math.max(0, x(i) - cw / 2).toFixed(1)}" y="0" width="${cw.toFixed(1)}" height="${Hh}" data-tip="<b>${fmt(p.v)} online</b><small>${clock(p.t)}</small>"/>`).join('');
  return `<div class="h-on-kpis"><div><small>Now</small><b class="num">${fmt(vals.at(-1))}</b></div><div><small>Peak · ${clock(pts[iHi].t)}</small><b class="num">${fmt(hi)}</b></div><div><small>Quietest · ${clock(pts[iLo].t)}</small><b class="num">${fmt(lo)}</b></div></div>
    <div class="chart-wrap">${[lo, Math.round((lo + hi) / 2), hi].map(t => `<span class="yl num" style="top:${(y(t) / Hh * 100).toFixed(2)}%">${fmt(t)}</span>`).join('')}
      <svg class="chart draw h-onc" viewBox="0 0 ${W} ${Hh}" preserveAspectRatio="none" role="img" aria-label="Players online over the last 24 hours">
        <defs><linearGradient id="h-on-g" x1="0" x2="0" y1="0" y2="1"><stop offset="0" style="stop-color:var(--good);stop-opacity:.22"/><stop offset="1" style="stop-color:var(--good);stop-opacity:0"/></linearGradient></defs>
        ${[lo, (lo + hi) / 2, hi].map(t => `<line class="gl" x1="0" x2="${W}" y1="${y(t)}" y2="${y(t)}"/>`).join('')}
        <path d="${d}L${W},${Hh}L0,${Hh}Z" fill="url(#h-on-g)"/><path class="ln" d="${d}"/>${hits}
      </svg></div>
    <div class="xl num"><span>${clock(pts[0].t)}</span><span>${clock(pts[Math.floor(pts.length / 2)].t)}</span><span>Now</span></div>`;
}
function onlineWall() {
  const list = [...D.online].sort((p, q) => friendIds.has(String(q.id)) - friendIds.has(String(p.id)));
  const shown = S.allOnline ? list : list.slice(0, 24);
  return `${shown.map((p, i) => `<a class="h-who ${friendIds.has(String(p.id)) ? 'fr' : ''}" href="/player/${esc(p.id)}" style="--i:${Math.min(i, 24)}" ${friendIds.has(String(p.id)) ? 'data-tip="Your friend"' : ''}><span class="av" style="background-image:${cssUrl(p.avatar)}"></span><span>${esc(p.name)}</span></a>`).join('')}
    <div class="h-who-more">${list.length > 24 ? `<button class="btn" type="button" data-online-all>${S.allOnline ? 'Show fewer' : `Show all ${fmt(list.length)}`}</button>` : ''}${D.unnamed ? `<span class="cap">and ${fmt(D.unnamed)} more players in game</span>` : ''}</div>`;
}
function whoIsPlaying() {
  return `<section class="container section reveal h-sec" aria-labelledby="h-on">
    <div class="sec-head"><div><h2 id="h-on">Who’s playing</h2><p class="lede">${D.stats ? `${fmt(D.stats.online)} in game` : 'Players in game'}${friendsOn.length ? `, ${friendsOn.length === 1 ? 'one of them your friend' : `${friendsOn.length} of them your friends`}` : ''}.</p></div></div>
    <div class="h-on">
      <div class="panel chart-panel h-on-chart"><div class="panel-head"><h3>Players online <span>· last 24 hours</span></h3></div>${onlineChart()}</div>
      <div class="panel h-on-wall"><div class="panel-head"><h3>In game now${friendsOn.length ? ` <span>· friends first</span>` : ''}</h3></div><div class="h-whos" id="h-whos">${onlineWall()}</div></div>
    </div>
  </section>`;
}

/* ── Community: comments and a start for new players ── */
function community() {
  const comments = D.comments.filter(c => c.text).slice(0, 5);
  return `<section class="container section reveal h-sec" aria-labelledby="h-com">
    <div class="h-two">
      <div><div class="sec-head"><div><h2 id="h-com">From the community</h2></div></div>
        <div class="h-comments">${comments.length ? comments.map((c, i) => `<article class="h-com" style="--i:${i}">
          <p>${esc(c.text)}</p>
          <footer><a href="/player/${esc(c.userId)}"><b>${esc(c.user)}</b></a> on <a href="/maps/${esc(c.mapId)}">${esc(c.map)}</a></footer></article>`).join('') : '<div class="empty">No comments yet.</div>'}</div></div>
      <div><div class="sec-head"><div><h2>About</h2></div></div>
        <div class="h-comments">
          <article class="h-com" style="--i:0"><p class="h-about">Rhythia is the standalone hub for a modern yet familiar online rhythm game. View your stats, scores and leaderboards here! Enter a username above to view it, or check out some of the shortcuts below.</p></article>
          <article class="h-com h-wiki" style="--i:1"><p class="h-about">Issues starting? Need help mapping? Visit our Wiki for install guides, online tips, and mapping help.</p><a class="btn" href="/wiki">Go to Wiki</a></article>
        </div></div>
    </div>
  </section>`;
}

/* ── Footer: the same places as Rhythia's own ── */
const FOOT = [
  [['/leaderboards', 'Leaderboards'], ['/clans', 'Clans'], ['/maps', 'Maps'], ['/collections', 'Collections'], ['/skins', 'Skins']],
  [['/wiki', 'Wiki'], ['/maps/criteria', 'Ranking Criteria'], ['/maps/upload', 'Upload a Map'], ['/titles', 'Titles']],
  [['/maps/teamranked', 'Team Ranked'], ['/hunt/2026', 'Badge Hunt 2026'], ['/changelog', 'Changelog'], ['/credits', 'Credits']],
  [['/rules', 'Rules & Punishments'], ['https://github.com/Capo-Games/dmca', 'DMCA / Copyright'], ['/privacy', 'Privacy Notice'], ['/terms', 'Terms of Service'], ['/payment-terms', 'Payment Terms'], ['/refund-terms', 'Refund Terms']],
];
function footer() {
  return `<footer class="h-footer"><div class="container">
    <div class="h-foot-brand"><img src="${SITE}/navlogo.png" alt="Rhythia" width="93" height="30"><p>Maintained by the Rhythia community.<br>Rhythia Steam is property of <a href="https://www.capo.games/" target="_blank" rel="noopener noreferrer">Capo Games</a>.</p>
      <a class="btn" href="${DISCORD}" target="_blank" rel="noopener noreferrer">${DISCORD_SVG}Join the Discord</a></div>
    ${FOOT.map(col => `<nav class="h-foot-col">${col.map(([h, l]) => `<a href="${h}" ${h.startsWith('http') ? 'target="_blank" rel="noopener noreferrer"' : ''}>${l}</a>`).join('')}</nav>`).join('')}
  </div></footer>`;
}

/* ── Rendering ── */
function render() {
  $('#hero').innerHTML = '';
  $('#body').innerHTML = `<div class="h-page ${ctx.quiet ? 'quiet' : 'enter'}">${hero()}${maps()}
    <section class="container section reveal h-sec h-board" aria-label="Rankings and news"><div class="h-cols">${leaderboard()}<div class="h-side-col">${clans()}${release()}</div></div></section>
    ${whoIsPlaying()}${community()}${footer()}</div>`;
  watch($('#body'));
  if (ctx.video) $('.h-stage video')?.replaceWith(ctx.video);
  const v = $('.h-stage video');
  if (v) {
    const shown = () => v.classList.add('on');
    if (v.readyState >= 2) shown(); else v.addEventListener('loadeddata', shown, {once: true, signal: ac.signal});
    v.addEventListener('error', () => $('.h-stage')?.classList.add('novideo'), {once: true, signal: ac.signal});
  }
}
const renderLb = () => { $('#h-lb-list').innerHTML = lbRows(); R.querySelectorAll('[data-lb]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.lb === S.lb))); };

// Loads a mode's list once; also used after a quiet refresh that left the shown mode without one.
const loadingModes = new Set();
async function loadMode(mode) {
  if (D.leaderboard[mode] || loadingModes.has(mode)) return;
  loadingModes.add(mode);
  try {
    D.leaderboard[mode] = await ctx.leaderboard(mode, ac.signal);
  } catch (err) {
    if (ac.signal.aborted) return;
    D.leaderboard[mode] = [];
    toast(`Could not load the ${MODES[mode][0]} leaderboard.`);
  } finally {
    loadingModes.delete(mode);
  }
  if (S.lb === mode) renderLb();
}
function setMode(mode) {
  if (S.lb === mode) return;
  S.lb = mode; renderLb();
  loadMode(mode);
}

R.addEventListener('click', e => {
  const t = e.target.closest('[data-lb],[data-online-all],[data-native-click]');
  if (!t) return;
  if (t.dataset.lb) return setMode(t.dataset.lb);
  if (t.hasAttribute('data-online-all')) { S.allOnline = !S.allOnline; $('#h-whos').innerHTML = onlineWall(); return; }
  if (t.dataset.nativeClick && !ctx.clickNative(t.dataset.nativeClick)) toast('Rhythia is still loading. Try again in a moment.');
}, sig);
// The video only plays while it can be seen.
const vio = 'IntersectionObserver' in window ? new IntersectionObserver(([e]) => { const v = $('.h-stage video'); if (!v || REDUCED) return; e.isIntersecting ? v.play().catch(() => {}) : v.pause(); }) : null;

render();
if ($('.h-hero')) vio?.observe($('.h-hero'));
if (!D.leaderboard[S.lb]) loadMode(S.lb);

return {
  // The Spin and VR lists already loaded, so a quiet refresh does not drop them (the fresh data has only Lock).
  state: () => ({lb: S.lb, lists: Object.fromEntries(['spin', 'vr'].filter(k => Array.isArray(D.leaderboard[k]) && D.leaderboard[k].length).map(k => [k, D.leaderboard[k]]))}),
  idle: () => !R.querySelector('dialog[open]') && !R.activeElement?.matches?.('input, textarea, select'),
  relayout() {},
  page() {},
  destroy() { ac.abort(); io?.disconnect(); vio?.disconnect(); hideTip(); const v = $('.h-stage video'); if (v) { v.pause(); v.removeAttribute('src'); v.load(); } },
};
};

// Home page styles, added to the Exodus shell next to the shared base sheet (core/assets.js).
RhythiaX.ExodusHome.css = `
.h-page{--hh:min(600px,78vh)}
.h-hero{position:relative;min-height:var(--hh);display:flex;align-items:center;color:#f4f5f7;isolation:isolate;overflow:hidden}
.h-stage{position:absolute;inset:0;z-index:-1;background:#07080b}
.h-stage video{display:block;width:100%;height:100%;object-fit:cover;opacity:0;transition:opacity 1.4s ease}
.h-stage video.on{opacity:.6}
.h-stage.novideo{background:radial-gradient(120% 90% at 85% 20%,#1b2a4a 0%,#07080b 60%)}
.h-shade{position:absolute;inset:0;background:linear-gradient(90deg,rgba(7,8,11,.95) 0%,rgba(7,8,11,.8) 36%,rgba(7,8,11,.38) 70%,rgba(7,8,11,.6) 100%),linear-gradient(180deg,rgba(7,8,11,.4) 0%,transparent 28%,transparent 58%,rgb(var(--page-rgb)) 100%)}
.h-grid{position:relative;display:grid;grid-template-columns:minmax(0,1.2fr) minmax(0,.8fr);align-items:center;gap:40px;width:100%;padding-top:56px;padding-bottom:104px}
.h-copy h1{margin:0;max-width:15ch;font-size:clamp(36px,5vw,64px);line-height:1.04;font-weight:800;letter-spacing:-.035em}
.h-copy p{margin:16px 0 0;font-size:20px;font-weight:600;color:#c9cfd8}
.h-about{font-size:15px;line-height:1.6;color:var(--text-2)}
.h-com .h-about{-webkit-line-clamp:unset;display:block;margin:0}
.h-wiki{display:flex;align-items:center;gap:16px}
.h-wiki .btn{flex:none}
.h-cta{display:flex;flex-wrap:wrap;gap:10px;margin-top:30px;align-items:center}
.h-cta .btn{height:48px;padding:0 20px;font-size:15px;border-radius:12px}
.h-cta svg{width:18px;height:18px;flex:none}
.h-cta .btn.h-steam{background:#1b783a;color:#fff;box-shadow:inset 0 0 0 1px rgba(46,204,113,.5)}
.h-cta .btn.h-steam:hover{background:#228f47}
.h-cta .btn.h-ghost{background:rgba(255,255,255,.08);color:#f4f5f7;box-shadow:inset 0 0 0 1px rgba(255,255,255,.18);backdrop-filter:blur(8px)}
.h-cta .btn.h-ghost:hover{background:rgba(255,255,255,.15)}
.h-cta .h-round{width:48px;height:48px;border-radius:12px;color:#e4e8ee;background:rgba(255,255,255,.08);box-shadow:inset 0 0 0 1px rgba(255,255,255,.18)}
.h-cta .h-round:hover{background:rgba(255,255,255,.15);color:#fff}
.h-cta .h-round svg{width:20px;height:20px}
.h-cta .h-love{color:#f9a8d4}
.h-side{display:flex;justify-content:flex-end}
.h-mascot{width:min(300px,100%);height:auto;margin-right:24px;filter:drop-shadow(0 22px 44px rgba(0,0,0,.5))}
.h-me{width:min(360px,100%);padding:26px 24px 22px;border-radius:22px;background:rgba(13,15,19,.86);box-shadow:inset 0 0 0 1px rgba(255,255,255,.12);backdrop-filter:blur(20px);text-align:center}
.h-me-av{display:block;width:84px;height:84px;margin:0 auto 14px;border-radius:26px;background:#1d2028 center/cover;box-shadow:0 0 0 3px rgba(255,255,255,.1)}
.h-me > small{display:block;font-size:13px;color:#9aa3b2}
.h-me > strong{display:block;margin-top:2px;font-size:25px;font-weight:750;letter-spacing:-.02em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.h-me dl{display:grid;grid-template-columns:repeat(3,1fr);margin:18px 0;padding:14px 0;border-top:1px solid rgba(255,255,255,.1);border-bottom:1px solid rgba(255,255,255,.1)}
.h-me dt{font-size:12px;color:#9aa3b2}
.h-me dd{margin:2px 0 0;font-size:17px;font-weight:700}
.h-me-go{display:flex;gap:8px}
.h-me-go .btn{flex:1;height:40px;background:rgba(255,255,255,.08);color:#f4f5f7;box-shadow:inset 0 0 0 1px rgba(255,255,255,.16)}
.h-me-go .btn:hover{background:rgba(255,255,255,.15)}
.h-me-fr{margin:14px 0 0;font-size:13px;color:#c9cfd8}
.h-dot{display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--good);margin-right:7px;vertical-align:1px}
.h-me .h-dot{background:#4ade80}
.h-numbers{position:relative;z-index:2;margin-top:-56px}
.h-numbers .kpis{grid-template-columns:repeat(4,minmax(0,1fr))}
.h-numbers .kpi{cursor:default}
.h-numbers .kpi small{display:flex;align-items:center}
.h-sec{margin-top:80px}
.h-numbers-gap{height:8px}
.h-more{color:var(--accent-2);font-weight:600;white-space:nowrap;font-size:14px}
.h-more:hover{text-decoration:underline;text-underline-offset:3px}
.reveal .h-map,.reveal .h-lb-row,.reveal .h-who,.reveal .h-com{opacity:0}
.reveal.in .h-map{animation:hRise .65s var(--ease) both;animation-delay:calc(var(--i) * 60ms)}
.reveal.in .h-lb-row{animation:hRise .5s var(--ease) both;animation-delay:calc(var(--i) * 35ms + 120ms)}
.reveal.in .h-who{animation:hPop .4s var(--ease) both;animation-delay:calc(var(--i) * 16ms + 160ms)}
.reveal.in .h-com{animation:hRise .55s var(--ease) both;animation-delay:calc(var(--i) * 70ms + 80ms)}
@keyframes hPop{from{opacity:0;transform:scale(.94)}to{opacity:1;transform:none}}
.h-cols{display:grid;grid-template-columns:minmax(0,1.6fr) minmax(0,1fr);gap:20px;align-items:start}
.h-side-col{display:grid;gap:20px}
.h-board .panel,.h-on-wall{padding:20px 22px}
.h-board .panel-head h3,.h-on .panel-head h3{font-size:16px}
.h-lb-row,.h-clan{display:grid;grid-template-columns:34px 36px minmax(0,1fr) auto auto;align-items:center;gap:12px;padding:9px 10px;margin:0 -10px;border-radius:10px;transition:background-color .15s}
.h-clan{grid-template-columns:24px 42px minmax(0,1fr) auto}
.h-lb-row:hover,.h-clan:hover{background:rgba(var(--ink),.05)}
.h-lb-row.me{background:var(--accent-soft)}
.h-board .pos{font-weight:750;font-size:15px;color:var(--muted);text-align:center}
.h-board .pos.p1{color:#e2b43a}.h-board .pos.p2{color:#b6c0cd}.h-board .pos.p3{color:#d08a5c}
[data-theme="white"] .h-board .pos.p1{color:#b7791f}[data-theme="white"] .h-board .pos.p2{color:#64748b}[data-theme="white"] .h-board .pos.p3{color:#b45309}
.h-page .av{width:36px;height:36px;border-radius:50%;background:var(--panel-3) center/cover;flex:none}
.h-page .av.sq{width:42px;height:42px;border-radius:11px}
.h-board .who{display:flex;align-items:center;gap:7px;min-width:0}
.h-board .who b{font-weight:650;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.h-clan .who{flex-direction:column;align-items:flex-start;gap:1px}
.h-board .who small{font-size:12.5px;color:var(--muted)}
.h-flag{width:18px;border-radius:2px;flex:none}
.h-board .tag{flex:none;padding:1px 6px;border-radius:5px;font-size:11px;font-weight:700;letter-spacing:.02em;color:var(--muted);box-shadow:inset 0 0 0 1px var(--line-2)}
.h-board .ch{min-width:44px;text-align:right;font-size:12.5px;font-weight:650;color:var(--muted)}
.h-board .ch.up{color:var(--good)}.h-board .ch.down{color:var(--bad)}
.h-board .rp{min-width:84px;text-align:right;font-weight:700}
.h-board .rp small{font-size:12px;font-weight:550;color:var(--muted)}
.h-lb-gap{text-align:center;color:var(--muted);letter-spacing:.3em;line-height:1;margin:4px 0}
.h-foot-link{display:inline-block;margin-top:14px}
.h-lb .pills img{height:14px}
.h-rel-t{display:block;margin-bottom:10px;font-size:17px;font-weight:700}
.h-rel ul{display:grid;gap:7px;margin:0;padding-left:18px;color:var(--text-2);line-height:1.5}
.h-rel li::marker{color:var(--muted)}
.h-rel code{padding:1px 5px;border-radius:5px;font:500 .9em ui-monospace,Consolas,monospace;background:var(--panel-3)}
.h-on{display:grid;grid-template-columns:minmax(0,1.3fr) minmax(0,1fr);gap:20px;align-items:start}
.h-on .chart-panel{margin-top:0}
.h-on-kpis{display:flex;flex-wrap:wrap;gap:12px 32px;margin:0 0 16px}
.h-on-kpis small{display:block;font-size:12.5px;color:var(--muted)}
.h-on-kpis b{font-size:22px;font-weight:750;letter-spacing:-.01em}
.h-on-kpis div:first-child b{color:var(--good)}
.h-onc .ln{stroke:var(--good)}
.h-onc .hit{fill:transparent}
.h-onc .hit:hover{fill:color-mix(in srgb,var(--good) 12%,transparent)}
.h-whos{display:grid;grid-template-columns:repeat(auto-fill,minmax(148px,1fr));gap:6px}
.h-who{display:flex;align-items:center;gap:9px;min-width:0;padding:5px 12px 5px 5px;border-radius:999px;background:rgba(var(--ink),.035);box-shadow:inset 0 0 0 1px var(--line);font-size:13px;font-weight:600;transition:background-color .15s}
.h-who:hover{background:rgba(var(--ink),.08)}
.h-who > span:last-child{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.h-who .av{width:26px;height:26px}
.h-who.fr{box-shadow:inset 0 0 0 1.5px color-mix(in srgb,var(--good) 60%,transparent)}
.h-who-more{grid-column:1/-1;display:flex;align-items:center;flex-wrap:wrap;gap:8px 14px;margin-top:10px}
.h-two{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:48px}
.h-comments{display:grid;gap:10px}
.h-com{border-radius:14px;background:var(--panel);box-shadow:inset 0 0 0 1px var(--line)}
.h-com{padding:14px 16px}
.h-com p{display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;margin:0 0 6px;font-size:15px;line-height:1.5;overflow-wrap:anywhere}
.h-com footer{font-size:13px;color:var(--muted)}
.h-com footer a{color:var(--text-2);font-weight:600}
.h-com footer a:hover{color:var(--accent-2)}
.h-page .btn svg{width:16px;height:16px}
[data-variant="lines"] .h-com{border-radius:0;background:none;box-shadow:none;border-top:1px solid var(--rule);padding:16px 2px}
.h-footer{margin-top:104px;padding:52px 0 44px;border-top:1px solid var(--line)}
.h-footer .container{display:grid;grid-template-columns:1.5fr repeat(4,minmax(0,1fr));gap:28px}
.h-foot-brand img{display:block;height:30px;width:auto}
.h-foot-brand p{margin:14px 0 18px;font-size:13.5px;line-height:1.6;color:var(--muted)}
.h-foot-brand p a{color:var(--text-2)}
.h-foot-col{display:flex;flex-direction:column;gap:11px;font-size:13.5px}
.h-foot-col a{color:var(--text-2);transition:color .15s}
.h-foot-col a:hover{color:var(--text)}
.h-page.quiet .h-map,.h-page.quiet .h-lb-row,.h-page.quiet .h-who,.h-page.quiet .h-com{opacity:1;animation:none!important}
.h-page.quiet .reveal,.h-page.quiet .draw{transition:none!important;animation:none!important}
.h-page.enter .h-copy h1{animation:exoEnter .75s var(--ease) .12s both}
.h-page.enter .h-copy p{animation:exoEnter .75s var(--ease) .22s both}
.h-page.enter .h-cta{animation:exoEnter .75s var(--ease) .3s both}
.h-page.enter .h-side{animation:exoEnter .9s var(--ease) .28s both}
@media (max-width:1000px){.h-cols,.h-on{grid-template-columns:1fr}.h-footer .container{grid-template-columns:repeat(2,minmax(0,1fr))}.h-foot-brand{grid-column:1/-1}}
@media (max-width:860px){.h-grid{grid-template-columns:1fr;gap:28px;padding-top:40px}.h-side{justify-content:flex-start}.h-mascot{display:none}.h-two{grid-template-columns:1fr}.h-numbers .kpis{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media (max-width:560px){.h-page{--hh:auto}.h-copy p{font-size:15.5px}.h-cta .btn{flex:1 1 auto}.h-lb-row{grid-template-columns:26px 32px minmax(0,1fr) auto}.h-lb-row .ch,.h-board .tag{display:none}.h-page .h-board .av{width:32px;height:32px}}
@media (prefers-reduced-motion:reduce){.h-page.enter *{animation:none!important}.reveal .h-map,.reveal .h-lb-row,.reveal .h-who,.reveal .h-com{opacity:1}}
`;
