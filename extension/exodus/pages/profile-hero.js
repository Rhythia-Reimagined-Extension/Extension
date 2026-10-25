// =============================================
// Reimagined for Rhythia — Exodus profile: hero and intro
// =============================================
// The top of the profile (banner, name, badges, ranks and the section tabs) and the intro under it: About
// with the inline editor, the title map, the showcase, and the friends and showcase-picker windows.
// pages/profile.js makes this part at mount with its context c and draws what it returns.

var RhythiaX = RhythiaX || {};
RhythiaX.ExodusProfileParts = RhythiaX.ExodusProfileParts || {};

RhythiaX.ExodusProfileParts.hero = function mountProfileHero(c) {
'use strict';
// What this part takes from pages/profile.js. The daily history can be replaced after mount (fresh data),
// so it is read from c each time: c.H and c.last7.
const {D, ctx, ac, U, ICONS, SITE, esc, fmt, REDUCED, TITLES, COUNTRY, $, cssUrl, tone, ico, ago, MODES, MPW, ON, S,
  counter, toast, pinnedScores, SCORES_ALL, md, bioText, socialLinks, refreshIntro} = c;

// Rhythia's badges: roles are tags under the name, event badges small icons. Badges without art are not shown, as on rhythia.com.
const SVG = (d, fill = true) => `<svg viewBox="0 0 24 24" aria-hidden="true" style="${fill ? 'fill:currentColor' : 'fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round'}">${d}</svg>`;
const MASK = src => `<i class="mask" style="--m:url('${SITE}${src}')"></i>`;
const ROLE = {
  'Developer': {c: '#3887F5', icon: SVG('<path d="m16 18 6-6-6-6M8 6l-6 6 6 6M14 4l-4 16"/>', false)},
  'Lead Developer': {c: '#3887F5', icon: MASK('/dev.png')},
  'Game Developer': {c: '#3887F5', icon: MASK('/dev.png')},
  'Web Developer': {c: '#3887F5', icon: MASK('/dev.png')},
  'Global Moderator': {c: '#D24242', label: 'Moderator', icon: SVG('<path d="M12 2 4 5v6c0 5.6 3.4 9.5 8 11 4.6-1.5 8-5.4 8-11V5z"/>')},
  'RCT': {c: '#D8970A', label: 'Ranked Curation', tip: 'Ranked Curation Team', icon: SVG('<path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"/>')},
  'MMT': {c: '#8B5CF6', label: 'Map Management', tip: 'Map Management Team', icon: SVG('<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>', false)},
  'Team Ranked': {c: '#D56A3B', icon: SVG('<path d="M7 3h10v5a5 5 0 0 1-10 0zM5 5H2v2a4 4 0 0 0 4 4M19 5h3v2a4 4 0 0 1-4 4M12 13v4M7 21h10M9 17h6"/>', false)},
  'Tester': {c: '#3BBF7D', icon: MASK('/tester.png')},
  'Bug Hunter': {c: '#CFA635', icon: MASK('/bughunter.png')},
  'Content Creator': {c: '#9557CC', icon: SVG('<path d="M3 6h11a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2zm14 4 6-3v10l-6-3z"/>')},
  'Bot': {c: '#E6CF00', tip: 'Bot account managed by Rhythia staff', icon: SVG('<rect x="4" y="8" width="16" height="12" rx="2"/><path d="M12 8V4M9 13v2M15 13v2"/>', false)},
  'Early Bird': {c: '#438BCF', label: 'Early Access', icon: SVG('<path d="M17.5 19H7a5 5 0 1 1 1.2-9.86A6 6 0 0 1 19.5 11a4 4 0 0 1-2 8z"/>')},
  'uwu': {c: '#F472B6', icon: SVG('<path d="M12 5c1.7 0 3.3.4 4.6 1.1L20 3v8c0 5-3.6 9-8 9s-8-4-8-9V3l3.4 3.1C8.7 5.4 10.3 5 12 5z"/>', false)},
};
const EVENT = {
  'The Start of an Era': ['/q.png', 'Badge Hunt 2025: The Start of an Era'], 'New Farm': ['/mario.png', 'Badge Hunt 2025: New Farm'],
  'Spinnin': ['/bug.png', 'Badge Hunt 2025: Spinnin'], 'Old Farm': ['/mario2.png', 'Badge Hunt 2025: Old Farm'],
  'Birb': ['/bird.png', 'Badge Hunt 2025: Bird'], 'Cats!': ['/cat.png', 'Badge Hunt 2025: Cats!'],
  'Badge Hunt 2026: Bronze': ['/hunt-badges/1.%20bronze.png'], 'Badge Hunt 2026: Silver': ['/hunt-badges/2.%20silver.png'],
  'Badge Hunt 2026: Gold': ['/hunt-badges/3.%20gold.png'], 'Badge Hunt 2026: Diamond': ['/hunt-badges/4.%20diamond.png'],
  'Badge Hunt 2026: Platinum': ['/hunt-badges/5.%20platinum.png'], 'Badge Hunt 2026: Difficulty': ['/badge-difficulty.webp'],
  'Badge Hunt 2026: Accuracy': ['/badge-accuracy.webp'], 'Badge Hunt 2026: Time': ['/badge-speed.webp'],
};
// Supporter is Rhythia's "verified" flag; the owner also sees how long it lasts.
function supporterLeft() {
  if (!ctx.owner || !U.verificationDeadline) return '';
  const days = Math.ceil((new Date(U.verificationDeadline) - Date.now()) / 864e5);
  return days <= 0 ? 'Expired' : days >= 365 ? `${Math.round(days / 365)} year${Math.round(days / 365) > 1 ? 's' : ''} left` : days >= 30 ? `${Math.round(days / 30)} month${Math.round(days / 30) > 1 ? 's' : ''} left` : `${days} day${days > 1 ? 's' : ''} left`;
}
const CREATOR_SVG = `<svg viewBox="0 0 512 512" aria-hidden="true"><defs><linearGradient id="cr-g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#c084fc"/><stop offset="1" stop-color="#6b21a8"/></linearGradient></defs><rect x="16" y="16" width="480" height="480" rx="120" fill="url(#cr-g)"/><path fill="#fff" d="M119 74h177c75 0 126 41 126 111 0 48-24 82-67 99l80 118H304l-66-105h-44v105H119V74Zm75 65v95h94c39 0 59-17 59-48 0-31-20-47-59-47h-94Z" transform="translate(40 40) scale(.84)"/></svg>`;

/* ── Title ── */
// A player Rhythia lists without a global rank has no place to count to the top 30 from.
function titleState() {
  const m = MODES.normal, rp = m.rp || 0, rank = m.rank || 0;
  let i = 0; TITLES.slice(0, 5).forEach((t, k) => { if (rp >= t.rp) i = k; });
  if (rp >= 10000 && rank && rank <= 30) i = 5;
  const next = TITLES[i + 1];
  const goal = !next ? 'Highest title reached' : next.top ? (rank ? `${fmt(rank - 30)} places to the top 30` : 'Not ranked') : `${fmt(next.rp - rp, 0)} RP to go`;
  const prog = !next ? 1 : next.top ? (rank ? Math.min(1, 30 / rank) : 0) : (rp - TITLES[i].rp) / (next.rp - TITLES[i].rp);
  return {i, cur: TITLES[i], next, goal, prog, rp, rank};
}
// A climbing road: each title sits a little higher than the last, so the line only rises.
// Names stay under the emblems. Clicking a title drops its pin with what it takes;
// the "you" marker is kept clear of the emblems and steps back while a pin is open.
function titleMap() {
  const t = titleState(), W = 640, Hh = 256, R = 19;
  const xs = TITLES.map((_, k) => 50 + k * (W - 100) / 5), ys = [210, 186, 172, 142, 128, 92];
  const seg = k => { const mx = (xs[k] + xs[k + 1]) / 2; return [[xs[k], ys[k]], [mx, ys[k]], [mx, ys[k + 1]], [xs[k + 1], ys[k + 1]]]; };
  const lerp = (a, b, u) => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u];
  const split = (P, u) => { const a = lerp(P[0], P[1], u), b = lerp(P[1], P[2], u), c = lerp(P[2], P[3], u), d = lerp(a, b, u), e = lerp(b, c, u); return [P[0], a, d, lerp(d, e, u)]; };
  const dOf = P => `M${P[0]} C${P[1]} ${P[2]} ${P[3]}`;
  const full = `M${xs[0]},${ys[0]}` + TITLES.slice(1).map((_, k) => { const P = seg(k); return ` C${P[1]} ${P[2]} ${P[3]}`; }).join('');
  // Progress maps onto the part of the segment between the two emblem rings.
  const gap = (R + 12) / (xs[1] - xs[0]), u = t.next ? gap + (1 - 2 * gap) * t.prog : 0;
  const part = t.next ? split(seg(t.i), u) : null, pt = part ? part[3] : [xs[t.i], ys[t.i]];
  let road = `<path d="${full}" fill="none" stroke="url(#tm-ahead)" stroke-width="4" stroke-linecap="round" stroke-dasharray="1 8"/>`;
  for (let k = 0; k < t.i; k++) road += `<path d="${dOf(seg(k))}" fill="none" stroke="url(#tm-s${k})" stroke-width="5" stroke-linecap="round"/>`;
  if (part) road += `<path class="prog" d="${dOf(part)}" fill="none" stroke="${t.cur.c}" stroke-width="5" stroke-linecap="round" pathLength="1" stroke-dasharray="1 1" style="--p:1"/>`;
  const grads = TITLES.slice(0, 5).map((tier, k) => `<linearGradient id="tm-s${k}" gradientUnits="userSpaceOnUse" x1="${xs[k]}" x2="${xs[k + 1]}"><stop offset="0" stop-color="${tier.c}"/><stop offset="1" stop-color="${TITLES[k + 1].c}"/></linearGradient>`).join('');
  const shade = c => c === '#A3ABB9' ? 'var(--text)' : c;
  const nodes = TITLES.map((tier, k) => {
    const reached = k <= t.i, now = k === t.i, open = S.tier === k, cx = xs[k], cy = ys[k];
    return `<g class="node ${open ? 'open' : ''}" data-tier="${k}" role="button" tabindex="0" aria-pressed="${open}" aria-label="${tier.name}">
      <circle cx="${cx}" cy="${cy}" r="${R + 14}" fill="transparent"/>
      ${now ? `<circle cx="${cx}" cy="${cy}" r="${R + 10}" fill="${tier.c}" fill-opacity=".14"/>` : ''}
      <circle class="ring" cx="${cx}" cy="${cy}" r="${R + 5}" style="fill:var(--ring-bg);stroke:${reached || open ? tier.c : 'rgba(var(--ink),.16)'}" stroke-width="${now || open ? 2.5 : 1.5}"/>
      <image href="${ICONS[tier.id] || ''}" x="${cx - R}" y="${cy - R}" width="${R * 2}" height="${R * 2}" ${reached ? '' : 'style="filter:grayscale(1);opacity:.5"'}/>
      <text x="${cx}" y="${cy + R + 24}" text-anchor="middle" style="fill:${now ? shade(tier.c) : reached ? 'var(--text-2)' : 'var(--muted)'}">${tier.short || tier.name}</text></g>`;
  }).join('');
  // Pin for the clicked title.
  let callout = '';
  if (S.tier !== null && S.tier !== undefined) {
    const k = S.tier, tier = TITLES[k], cx = xs[k], cy = ys[k], reached = k <= t.i;
    const need = tier.top ? (reached ? 'Top 30 · reached' : t.rank ? `Top 30 global · ${fmt(t.rank - 30)} places to go` : 'Top 30 global · not ranked')
      : !tier.rp ? 'Starting title' : reached ? `${fmt(tier.rp)} RP · reached` : `${fmt(tier.rp)} RP · ${fmt(tier.rp - t.rp, 0)} to go`;
    const bw = Math.round(Math.max(tier.name.length * 8, need.length * 6.6) + 28), bh = 46;
    const bx = Math.min(W - bw - 2, Math.max(2, cx - bw / 2)), by = cy - R - 22 - bh;
    callout = `<g class="callout"><line x1="${cx}" y1="${cy - R - 6}" x2="${cx}" y2="${by + bh}" stroke="${tier.c}" stroke-width="1.5"/>
      <rect x="${bx}" y="${by}" width="${bw}" height="${bh}" rx="10" style="fill:var(--panel-3)" stroke="${tier.c}" stroke-opacity=".7"/>
      <text x="${bx + 14}" y="${by + 19}" style="fill:${shade(tier.c)};font-weight:700">${tier.name}</text>
      <text class="sub" x="${bx + 14}" y="${by + 35}">${need}</text></g>`;
  }
  let you = '';
  if (t.next) {
    const [px, py] = pt, pw = 64, rx = Math.min(W - pw - 2, Math.max(2, px - pw / 2)), ty = py - 30;
    you = `<g class="pin ${callout ? 'dim' : ''}"><line class="stem" x1="${px}" y1="${py - 6}" x2="${px}" y2="${ty}" stroke="${t.cur.c}" stroke-width="1.5"/>
      ${t.rank ? `<g class="tag"><rect x="${rx}" y="${ty - 24}" width="${pw}" height="24" rx="8" fill="${t.cur.c}"/><text x="${rx + pw / 2}" y="${ty - 7.5}" text-anchor="middle" style="fill:#fff;font-weight:750">#${fmt(t.rank)}</text></g>` : ''}
      <circle class="head" cx="${px}" cy="${py}" r="6.5" fill="#fff" stroke="${t.cur.c}" stroke-width="3"/></g>`;
  }
  return `<svg class="tmap" viewBox="0 0 ${W} ${Hh}" role="group" aria-label="Title progression: ${esc(t.cur.name)}. ${esc(t.goal)}.">
    <defs>${grads}<linearGradient id="tm-ahead" gradientUnits="userSpaceOnUse" x1="${pt[0]}" x2="${W}"><stop offset="0" style="stop-color:rgb(var(--ink));stop-opacity:.32"/><stop offset="1" style="stop-color:rgb(var(--ink));stop-opacity:.05"/></linearGradient></defs>
    ${road}${nodes}${you}${callout}</svg>`;
}

/* ── Hero ── */
// Rhythia reports friend_state per viewer: "none" until added, then "added". Saved copies do not keep it, so
// a page drawn from one shows no button until the fresh data is in (signed out, Add friend asks to sign in).
function friendButton() {
  if (!S.friend) return '';
  if (S.friend === 'none') return `<button class="btn primary mini" type="button" data-friend ${S.busy ? 'disabled' : ''}>${ico('user')}Add friend</button>`;
  const label = S.friend === 'added' ? 'Friend added' : S.friend[0].toUpperCase() + S.friend.slice(1);
  return `<button class="btn mini" type="button" disabled>${ico('user')}${esc(label)}</button>`;
}
// Every badge in one row, all the same height: Supporter, Rhythia's roles (icon and name)
// and event badges (their art only, named in the tooltip).
function badgeRow() {
  const out = [];
  if (U.verified) {
    const left = supporterLeft();
    out.push(`<a class="rtag sup" href="/support" style="--c:#f472b6" data-tip="<b>Rhythia Supporter</b><small>${left ? esc(left) + ' · ' : ''}Supports Rhythia’s development</small>"><img src="${SITE}/supporterheart.png" alt="">Supporter</a>`);
  }
  for (const b of U.badges || []) {
    const r = ROLE[b]; if (!r) continue;
    out.push(`<span class="rtag" tabindex="0" style="--c:${r.c}" data-tip="<b>${esc(r.tip || r.label || b)}</b><small>Rhythia role</small>">${r.icon}${esc(r.label || b)}</span>`);
  }
  if (U.id === 255585) out.push(`<span class="rtag ev" tabindex="0" data-tip="<b>Creator of Reimagined</b><small>Made the Reimagined for Rhythia extension</small>">${CREATOR_SVG}</span>`);
  for (const b of (U.badges || []).filter(b => EVENT[b])) out.push(`<span class="rtag ev" tabindex="0" data-tip="<b>${esc(EVENT[b][1] || b)}</b><small>Event badge</small>"><img src="${SITE}${EVENT[b][0]}" alt="${esc(b)}"></span>`);
  return out.length ? `<div class="rtags">${out.join('')}</div>` : '';
}
// Hearts and squares from Rhythia's supporter card, drifting up a supporter's banner.
const SUP_FLOAT = Array.from({length: 10}, (_, i) => `<i class="pf ${i % 3 ? 'h' : 'q'}" style="--x:${(i * 41 + 7) % 100}%;--d:${11 + (i * 7) % 8}s;--w:${-((i * 13) % 17)}s;--s:${.55 + ((i * 5) % 6) / 10}"></i>`).join('');
function hero() {
  const m = MODES[S.mode], lock = S.mode === 'normal';
  // Change since yesterday, as Classic shows by default: today's live numbers (the last point, core/data.js
  // withToday) against the day before. Without a point for that day no change is shown.
  const dayBefore = date => new Date(Date.parse(date + 'T00:00:00Z') - 864e5).toISOString().slice(0, 10);
  const last = c.H.at(-1), yday = c.H.length > 1 && c.H.at(-2).date === dayBefore(last.date) ? c.H.at(-2) : null;
  const ch = k => (yday ? yday[k] - last[k] : 0);
  const r1 = ch('globalRank'), c1 = ch('countryRank'), rp1 = -ch('skillPoints');
  const d = (n, f = 0) => lock && n && ON('statHistory') ? `<span class="d ${tone(n)}" data-tip="Change since yesterday">${n > 0 ? '▲' : '▼'} ${fmt(Math.abs(n), f)}</span>` : '';
  const prev = (U.previous_usernames || []).map(p => `${esc(p.username)} <small>until ${new Date(p.changed_at).toLocaleDateString('en-GB', {month:'short', year:'numeric'})}</small>`).join('');
  const pt = U.playTime || 0, h = Math.floor(pt / 3600), mi = Math.floor(pt % 3600 / 60);
  const clanId = U.clans?.id ?? U.clan;
  const joined = new Date(U.created_at);
  return `<section class="hero ${U.verified ? 'is-sup' : ''}" aria-label="Player">
    ${U.profile_image ? `<div class="banner" style="background-image:linear-gradient(180deg,rgba(var(--page-rgb),0) 30%,rgba(var(--page-rgb),.78)),${cssUrl(U.profile_image)}"></div>`
      : `<div class="banner wash"><i style="background-image:${cssUrl(U.avatar_url)}"></i></div>`}
    ${U.verified && !REDUCED ? `<div class="pfs" aria-hidden="true">${SUP_FLOAT}</div>` : ''}
    <div class="container">
      <div class="hero-main">
        <div class="avatar ${U.verified ? 'sup' : ''}" style="background-image:${cssUrl(U.avatar_url)}${U.verified ? ',linear-gradient(135deg,#fbcfe8,#e879f9 30%,#f472b6 55%,#c084fc 80%,#fbcfe8)' : ''}" role="img" aria-label="${esc(U.username)}">${U.is_online ? '<span class="dot" data-tip="Online now"></span>' : ''}${U.verified ? `<a class="sup-heart" href="/support" data-tip="<b>Rhythia Supporter</b><small>Supports Rhythia’s development</small>"><img src="${SITE}/supporterheart.png" alt="Rhythia Supporter"></a>` : ''}</div>
        <div class="who" style="min-width:0">
          <div class="name-row"><h1 class="name">${esc(U.username)}${prev ? `<button class="prev-btn" type="button" aria-label="Previous usernames" data-tip="<b>Previous names</b><small>${esc(prev).replace(/&lt;(\/?)small&gt;/g, '<$1small>')}</small>">${ico('hist')}</button>` : ''}</h1>${S.viewer === 'owner' ? '' : friendButton()}</div>
          ${badgeRow()}
          <div class="meta">
            ${U.flag ? `<span><img class="flag" src="${SITE}/flags/${esc(U.flag)}.svg" alt="">${esc(COUNTRY)}</span>` : ''}
            ${U.clans?.name ? `<a class="clan" href="/clans/${esc(clanId)}">${U.clans.avatar_url ? `<img src="${esc(U.clans.avatar_url)}" alt="">` : ''}${esc(U.clans.name)}</a>` : ''}
            ${S.viewer === 'owner' && ON('friendsList') ? `<button class="friends-btn" type="button" data-friends data-tip="<b>Your friends</b><small>See who is online</small>">${ico('user')}${fmt(U.friend_count)} friends</button>` : `<span tabindex="0" data-tip="<b>${fmt(U.friend_count)} friends</b><small>Only the owner can see the list</small>">${ico('user')}${fmt(U.friend_count)} friends</span>`}
            ${U.is_online ? '<span class="on">Online</span>' : U.last_active_timestamp ? `<span>Last seen ${ago(new Date(U.last_active_timestamp).toISOString())}</span>` : ''}
          </div>
        </div>
        <div class="ranks-wrap">
          <div class="ranks-head">
            <div class="pills mini" aria-label="Game mode">${Object.entries(MODES).map(([k, v]) => `<button type="button" aria-pressed="${S.mode === k}" data-mode="${k}"><img src="${SITE}/${v.icon}" alt="">${v.label}</button>`).join('')}</div>
            ${ON('playerCompare') ? `<button class="btn mini" type="button" data-compare data-tip="<b>Compare</b><small>${esc(U.username)} against another player</small>">${ico('cmp')}Compare</button>` : ''}
          </div>
          <div class="ranks">
            <div><span class="cap">Global</span><strong class="num">${m.rank ? counter(m.rank, 0, '#') : '—'}${d(r1)}</strong></div>
            <div><span class="cap">${esc(COUNTRY)}</span><strong class="num">${m.country ? counter(m.country, 0, '#') : '—'}${d(c1)}</strong></div>
            <div class="rp"><span class="cap">Rhythm points</span><strong class="num">${counter(m.rp, 2)}${d(rp1, 1)}</strong></div>
          </div>
        </div>
      </div>
      <div class="strip panel">
        <div><small>Playtime</small><b class="num">${h}h ${mi}m</b></div>
        <div><small>Play count</small><b class="num">${counter(U.play_count)}</b></div>
        <div><small>Squares hit</small><b class="num">${counter(U.squares_hit)}</b></div>
        <div data-tip="Lifetime plays divided by weeks since joining<small>${fmt(c.last7)} plays in the last 7 days</small>"><small>Maps / week</small><b class="num">${fmt(MPW, 1)}</b></div>
        <div><small>Achievements</small><b class="num">${(U.achievements || []).length}<span class="cap"> / ${D.achievements.length}</span></b></div>
        <div data-tip="<b>${esc(joined.toLocaleDateString('en-GB', {day: 'numeric', month: 'long', year: 'numeric'}))}</b><small>${esc(ago(joined.toISOString()))}</small>"><small>Member since</small><b>${esc(joined.toLocaleDateString('en-GB', {month: 'short', year: 'numeric'}))}</b></div>
      </div>
      <div class="hero-bar">
        <div class="tabs" role="tablist" aria-label="Profile sections" data-ink="sections">${[['profile','Profile'],['scores','Scores'],['maps','Maps'],['skins','Skins'],['inventory','Inventory'],['achievements','Achievements']].map(([k, l]) =>
          `<button role="tab" type="button" aria-selected="${S.section === k}" data-section="${k}">${l}</button>`).join('')}</div>
      </div>
    </div>
  </section>`;
}

/* ── Intro ── */
function socialIcon(u) {
  const host = u.replace(/^https?:\/\/(www\.)?/, '').split('/')[0];
  const id = /github/.test(host) ? 'gh' : /youtu/.test(host) ? 'yt' : /twitch/.test(host) ? 'tw' : 'link';
  const name = {gh: 'GitHub', yt: 'YouTube', tw: 'Twitch', link: host}[id];
  return `<a class="social" href="${esc(u)}" target="_blank" rel="noopener" aria-label="${esc(name)}" data-tip="<b>${esc(name)}</b><small>${esc(u.replace(/^https?:\/\/(www\.)?/, ''))}</small>">${ico(id)}</a>`;
}
// Inline profile editor. Rhythia keeps the bio (10,000 characters) and two social links;
// pinned scores are managed here too, as a draft until Save. The links help is the sentence Settings shows
// under its link fields (core/account.js).
const SOCIAL_HELP = 'Discord, Telegram, YouTube, Twitch, X, GitHub, Instagram, TikTok, Facebook or Steam, starting with https://';
function edPins() {
  const all = SCORES_ALL(), list = S.draft.pins.map(id => all.find(s => String(s.id) === String(id))).filter(Boolean);
  if (!list.length) return '<li class="ed-none cap">No pinned scores.</li>';
  return list.map((s, i) => `<li><i style="background-image:${cssUrl(s.thumb)}"></i><span title="${esc(s.beatmapTitle)}">${esc(s.beatmapTitle)}<small class="num">${fmt(s.raw)} RP · ${fmt(s.acc, 2)}% · ${s.speedKey}×</small></span>
    <button class="iconbtn" type="button" data-pin-drop="${i}" aria-label="Unpin" data-tip="<b>Unpin</b><small>Applied when you save</small>">${ico('x')}</button></li>`).join('');
}
function editor() {
  const d = S.draft;
  return `<div class="editor">
    <div class="ed-l"><label for="bio-input">About me</label><small class="num" id="bio-count">${fmt(d.bio.length)} / 10,000</small></div>
    <textarea id="bio-input" rows="5" maxlength="10000">${esc(d.bio)}</textarea>
    <div class="ed-l"><span>Social links</span></div>
    <div class="ed-links">${[0, 1].map(i => `<input class="field" id="link-${i}" type="url" inputmode="url" placeholder="https://github.com" aria-label="Social link ${i + 1}" value="${esc(d.links[i] || '')}">`).join('')}</div>
    <p class="cap ed-help">${SOCIAL_HELP}</p>
    <div class="ed-l"><span>Pinned scores</span><small class="num" id="ed-pin-n">${d.pins.length} pinned</small></div>
    <ul class="ed-pins" id="ed-pins">${edPins()}</ul>
    <div class="ed-actions"><button class="btn" type="button" data-bio="cancel">Cancel</button><button class="btn primary" type="button" data-bio="save">Save</button></div></div>`;
}
function refreshEdPins() { $('#ed-pins').innerHTML = edPins(); $('#ed-pin-n').textContent = `${S.draft.pins.length} pinned`; }
// Pinned scores lead the About panel (one at a time, arrows to step); with no pins the top play stands in.
function showcase() {
  const pins = pinnedScores(), top1 = MODES.normal.top[0];
  const s = pins.length ? pins[Math.min(S.pinAt, pins.length - 1)] : top1;
  if (!s) return '';
  const label = pins.length ? `Pinned · ${Math.min(S.pinAt, pins.length - 1) + 1} of ${pins.length}` : 'Top play';
  return `<div class="showcase" style="background-image:${cssUrl(s.img || s.thumb)}"><span class="bg"></span>
      ${pins.length ? `<div class="sc-nav">${pins.length > 1 ? `<button class="iconbtn" type="button" data-pin-step="-1" aria-label="Previous pinned score">‹</button><button class="iconbtn" type="button" data-pin-step="1" aria-label="Next pinned score">›</button>` : ''}${S.viewer === 'owner' ? `<button class="iconbtn" type="button" data-pin="${esc(String(s.id))}" aria-label="Unpin this score" data-tip="Unpin">${ico('unpin')}</button>` : ''}</div>` : ''}
      <a class="plate" href="/score/${encodeURIComponent(s.id)}"><small>${label}</small><strong>${esc(s.beatmapTitle)}</strong><em class="num"><b>${fmt(s.raw)} RP</b> · ${fmt(s.acc, 2)}% · ${s.speedKey}× · <span style="color:var(--g-${s.grade})">${s.grade}</span></em></a></div>`;
}
const SHOWCASE_MAX = 5;
const itemPath = it => `${{beatmap: '/maps/', skin: '/skins/share/', collection: '/collections/'}[it.kind] || '/'}${encodeURIComponent(it.id)}`;
const SKIN_TYPES = {rhs: 'RHS skin', cursor: 'Cursor', note: 'Note', border: 'Border', colorset: 'Colorset'};
const itemKind = it => it.kind === 'beatmap' ? 'Beatmap' : it.kind === 'collection' ? 'Collection' : SKIN_TYPES[it.skinType || 'rhs'] || 'Skin';
function itemPreview(it) {
  if (it.kind === 'skin' && it.skinType === 'colorset' && it.colors?.length) {
    const n = Math.ceil(Math.sqrt(it.colors.length)), m = Math.ceil(it.colors.length / n);
    return `<span class="pv cs"><span style="grid-template-columns:repeat(${n},1fr);aspect-ratio:${n}/${m}">${it.colors.map(c => `<i style="background:${/^#[0-9a-f]{6}$/i.test(c) ? c : '#000'}"></i>`).join('')}</span></span>`;
  }
  const img = it.previewUrl || it.collectionImages?.find(Boolean);
  return img ? `<span class="pv" style="background-image:${cssUrl(img)}"></span>` : `<span class="pv none">${ico(it.kind === 'collection' ? 'list' : 'grid')}</span>`;
}
function showcaseItems() {
  const items = S.items || [], owner = S.viewer === 'owner';
  if (!items.length && !owner) return '';
  return `<div class="items"><div class="items-head"><span>Showcase</span>${owner ? `<small class="num">${items.length} / ${SHOWCASE_MAX}</small>` : ''}</div>
    <div class="items-row">${items.map((it, i) => `<div class="item"><a href="${itemPath(it)}" data-tip="<b>${esc(it.title)}</b><small>${esc(itemKind(it))}${it.creator ? ' · by ' + esc(it.creator) : ''}</small>">${itemPreview(it)}<span class="it">${esc(it.title)}</span><small>${esc(itemKind(it))}</small></a>
      ${owner ? `<button class="iconbtn item-x" type="button" data-item-drop="${i}" aria-label="Remove from showcase">${ico('x')}</button>` : ''}</div>`).join('')}
    ${owner && items.length < SHOWCASE_MAX ? (U.verified
      ? `<button class="item add" type="button" data-item-add><span class="pv none">+</span><span class="it">Add item</span><small>Map, skin or collection</small></button>`
      : `<a class="item add locked" href="/support" data-tip="<b>Supporter perk</b><small>Supporters can show up to five maps, skins or collections</small>"><span class="pv none"><img src="${SITE}/supporterheart.png" alt=""></span><span class="it">Showcase</span><small>Supporter perk</small></a>`) : ''}</div></div>`;
}
async function saveShowcase(next, done) {
  if (S.busy) return;
  S.busy = true;
  try {
    const res = await ctx.actions.setShowcase(S.itemsRev, next);
    if (res?.status === 'supporter_required') { toast('The showcase is a Rhythia Supporter perk.'); return; }
    if (res?.status && res.status !== 'ok') throw new Error(res.status.replace(/_/g, ' '));
    S.items = Array.isArray(res?.items) ? res.items : next;
    S.itemsRev = res?.revision ?? S.itemsRev + 1;
    if (!ac.signal.aborted) done?.();
  } catch (err) {
    toast(/HTTP 403/.test(err.message) ? 'The showcase is a Rhythia Supporter perk.' : `Could not update the showcase: ${err.message}`);
  } finally {
    S.busy = false;
  }
  // Left while it saved: the next page has its own #intro.
  if (ac.signal.aborted) return;
  if (!S.editing) refreshIntro();
}
/* Friends: the signed-in player's own list, online first. Rhythia shares it only with its owner. */
let friendsSeq = 0;
async function openFriends() {
  const dlg = $('#pick'), seq = ++friendsSeq;
  dlg.innerHTML = `<div class="cmp-head"><h2>Friends<span class="num">${fmt(U.friend_count)}</span></h2><button class="iconbtn" type="button" data-pick-close aria-label="Close">${ico('x')}</button></div>
    <div class="cmp-body"><div class="fr-list" id="fr-list">${'<div class="fr-row is-load"><i class="av skeleton"></i><span class="skeleton" style="width:40%"></span></div>'.repeat(Math.min(6, U.friend_count || 3))}</div></div>`;
  dlg.classList.add('fr-dlg');
  dlg.addEventListener('close', () => dlg.classList.remove('fr-dlg'), {once: true});
  if (!dlg.open) dlg.showModal();
  const X = RhythiaX.ExodusData, s = X.session();
  try {
    if (!s) throw new Error('Sign in to Rhythia to see your friends.');
    const [fr, on] = await Promise.all([X.post('getFriends', {session: s}), X.post('getOnlinePlayers', {}).catch(() => ({players: []}))]);
    if (seq !== friendsSeq || !dlg.open || ac.signal.aborted) return;
    const online = new Set((on.players || []).map(p => String(p.id)));
    const list = (fr.friends || []).map(f => ({...f, on: online.has(String(f.id))})).sort((a, b) => b.on - a.on || String(a.username).localeCompare(String(b.username)));
    const n = list.filter(f => f.on).length;
    $('#fr-list').innerHTML = list.length
      ? `<p class="fr-sum">${n ? `<span class="fr-dot"></span>${n === 1 ? 'One friend is' : `${n} friends are`} playing now` : 'No friends online'}</p>`
        + list.map((f, i) => `<a class="fr-row fadein ${f.on ? 'on' : ''}" style="animation-delay:${Math.min(i, 20) * 20}ms" href="/player/${esc(f.id)}"><i class="av" style="background-image:${cssUrl(f.avatar_url)}">${f.on ? '<span class="fr-dot"></span>' : ''}</i><span class="fr-name">${esc(f.username)}${f.flag ? `<img class="flg" src="${SITE}/flags/${esc(f.flag)}.svg" alt="${esc(f.flag)}">` : ''}</span><span class="cap">${f.on ? 'Playing now' : 'Profile'}</span></a>`).join('')
      : '<div class="empty"><b>No friends yet</b>Open a player’s profile and choose Add friend.</div>';
  } catch (e) {
    if (seq === friendsSeq && dlg.open && !ac.signal.aborted) $('#fr-list').innerHTML = `<div class="empty"><b>Could not load your friends</b>${esc(e.message)}</div>`;
  }
}

/* Picker: Rhythia's own sources (beatmaps, skins, collections), the player's own by default. */
const picker = {kind: 'beatmap', skinType: 'rhs', mine: true, q: '', page: 1, seq: 0, timer: 0, res: null};
function openPicker() {
  const dlg = $('#pick');
  dlg.innerHTML = `<div class="cmp-head"><h2>Add to showcase</h2><button class="iconbtn" type="button" data-pick-close aria-label="Close">${ico('x')}</button></div>
    <div class="cmp-body pick-body">
      <div class="pick-bar"><div class="pills" aria-label="Item type">${[['beatmap', 'Beatmaps'], ['skin', 'Skins'], ['collection', 'Collections']].map(([k, l]) => `<button type="button" aria-pressed="${picker.kind === k}" data-pick-kind="${k}">${l}</button>`).join('')}</div>
        <div class="pills" aria-label="Owner"><button type="button" aria-pressed="${picker.mine}" data-pick-mine="1">Mine</button><button type="button" aria-pressed="${!picker.mine}" data-pick-mine="0">Everyone</button></div>
        ${picker.kind === 'skin' ? `<select class="field" id="pick-skin" aria-label="Skin type">${Object.entries(SKIN_TYPES).map(([k, l]) => `<option value="${k}" ${picker.skinType === k ? 'selected' : ''}>${l}</option>`).join('')}</select>` : ''}</div>
      <label class="field">${ico('search')}<span class="sr">Search</span><input id="pick-q" type="search" placeholder="Search by title" value="${esc(picker.q)}" autocomplete="off"></label>
      <div class="pick-res" id="pick-res"></div></div>`;
  if (!dlg.open) dlg.showModal();
  runPicker();
}
async function runPicker() {
  const box = $('#pick-res'), seq = ++picker.seq; if (!box) return;
  box.innerHTML = '<div class="skeleton" style="margin:16px 4px;width:50%"></div><div class="skeleton" style="margin:10px 4px;width:35%"></div>';
  try {
    const r = await ctx.actions.searchShowcase({kind: picker.kind, text: picker.q.trim(), page: picker.page, ownerId: picker.mine ? U.id : undefined, skinType: picker.skinType});
    if (seq !== picker.seq || ac.signal.aborted) return;
    picker.res = r;
    const have = new Set((S.items || []).map(it => it.kind + ':' + it.id));
    box.innerHTML = r.items.length ? `<div class="pick-grid">${r.items.map((it, i) => `<button type="button" class="item" data-pick-item="${i}" ${have.has(it.kind + ':' + it.id) ? 'disabled' : ''}>${itemPreview(it)}<span class="it">${esc(it.title)}</span><small>${esc(it.subtitle || itemKind(it))}</small></button>`).join('')}</div>
      ${r.totalPages > 1 ? `<div class="pager"><span class="num">Page ${picker.page} of ${r.totalPages}</span><div class="pages"><button type="button" data-pick-page="${picker.page - 1}" ${picker.page <= 1 ? 'disabled' : ''} aria-label="Previous page">‹</button><button type="button" data-pick-page="${picker.page + 1}" ${picker.page >= r.totalPages ? 'disabled' : ''} aria-label="Next page">›</button></div></div>` : ''}`
      : `<p class="cap" style="margin:16px 4px">Nothing found${picker.mine ? '. Try “Everyone”.' : '.'}</p>`;
  } catch (e) { if (seq === picker.seq && !ac.signal.aborted) box.innerHTML = `<p class="cap" style="margin:16px 4px">Search failed (${esc(e.message)}).</p>`; }
}
function intro() {
  const raw = String(U.about_me || '');
  const text = bioText(raw);
  const links = socialLinks(raw);
  const t = titleState();
  // With the title beside it, the showcase gets its own row below both, so a long About never leaves the title column empty.
  const side = ON('titleProgression'), extras = S.editing ? '' : showcaseItems() + showcase(), below = side && extras;
  return `<div class="container reveal" id="intro"><div class="intro ${side ? '' : 'solo'} ${below ? 'has-more' : ''}">
    <section class="panel" aria-labelledby="about-h">
      <div class="about-head"><h3 id="about-h">${S.editing ? 'Edit profile' : 'About'}</h3><div class="socials">${links.map(socialIcon).join('')}${S.viewer === 'owner' && !S.editing ? `<button class="social" type="button" data-edit-bio aria-label="Edit profile" data-tip="<b>Edit profile</b><small>About me, social links and pinned scores</small>">${ico('edit')}</button>` : ''}</div></div>
      ${S.editing ? editor() : `<div class="bio-wrap ${S.bioOpen ? 'open' : ''}"><div class="bio md">${md(text) || '<span class="cap">No bio yet.</span>'}</div><button class="link bio-more" type="button" data-bio-more hidden>${S.bioOpen ? 'Show less' : 'Show more'}</button></div>${below ? '' : extras}`}
    </section>
    ${ON('titleProgression') ? `<section class="panel" aria-labelledby="title-h">
      <h3 id="title-h">Title</h3>
      <div class="title-head"><img src="${ICONS[t.cur.id] || ''}" alt=""><div><strong style="color:${t.cur.c === '#A3ABB9' ? 'inherit' : t.cur.c}">${esc(t.cur.name)}</strong><span class="cap num">${fmt(t.rp, 2)} RP · ${t.rank ? `#${fmt(t.rank)} global` : 'not ranked'}</span></div>
        ${t.next ? `<div class="goal"><span class="cap">Next: ${esc(t.next.name)}</span><b class="num">${esc(t.goal)}</b></div>` : ''}</div>
      <div class="tmap-scroll" id="tmap">${titleMap()}</div>
      <p class="cap tmap-hint">Click a title to see its requirement.</p>
    </section>` : ''}
    ${below ? `<section class="panel intro-more" aria-label="Showcase">${extras}</section>` : ''}
  </div></div>`;
}

return {hero, intro, titleMap, refreshEdPins, SHOWCASE_MAX, saveShowcase, openFriends, picker, openPicker, runPicker};
};
