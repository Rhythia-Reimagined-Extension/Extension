// =============================================
// Reimagined for Rhythia — Exodus leaderboards
// =============================================
// Rhythia's leaderboard (country, mode, inactive players, pages; all in the URL,
// as on Rhythia) with movement over a day, 7 or 30 days. The day comes from
// Rhythia; 7 and 30 days come from the community history on the Reimagined VPS,
// under the same consent rule as the rest of the extension.

var RhythiaX = RhythiaX || {};

RhythiaX.ExodusBoard = function mountExodusBoard(host, ctx) {
'use strict';

const R = host.shadowRoot;
const ac = new AbortController(), sig = {signal: ac.signal};
const Data = RhythiaX.ExodusData;
const SITE = 'https://www.rhythia.com';
const $ = s => R.querySelector(s);
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt = (n, d = 0) => Number(n || 0).toLocaleString('en-US', {minimumFractionDigits: d, maximumFractionDigits: d});
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const MODES = {normal: ['Lock', 'lock.png', 'rp', 'position', 'change'], spin: ['Spin', 'spincam.png', 'spinRp', 'spinPosition', 'spinChange'], vr: ['VR', 'vr.png', 'vrRp', 'vrPosition', 'vrChange']};
const PERIODS = [['today', 'Today'], ['7d', '7 days'], ['30d', '30 days']];
const CODES = 'AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS XK YE YT ZA ZM ZW'.split(' ');
const NAMES = (() => { try { return new Intl.DisplayNames(['en'], {type: 'region'}); } catch (_) { return null; } })();
const country = c => { try { return NAMES?.of(c) || c; } catch (_) { return c; } };
const COUNTRIES = CODES.map(c => [c, country(c)]).sort((a, b) => a[1].localeCompare(b[1]));
// A supporter's row is Rhythia's supporter card: its background art and the heart.
const SUP_BG = `<picture class="b-supbg" aria-hidden="true"><source media="(min-width: 1024px)" srcset="${SITE}/supporterbg.png"><img src="${SITE}/supporterbg-mobile.png" alt=""></picture>`;
const HEART = `<img class="b-heart" src="${SITE}/supporterheart.png" alt="Rhythia Supporter" data-tip="<b>Rhythia Supporter</b><small>Supports Rhythia’s development</small>">`;
// Rhythia's titles, as its leaderboard shows them next to a name (art in /titles/).
const TITLES = [['candidate_grandmaster', 'Candidate Grandmaster', 10000], ['master', 'Master', 5000], ['candidate_master', 'Candidate Master', 2500], ['expert', 'Expert', 1500], ['novice', 'Novice', 0]];
const titleOf = (rp, pos) => (rp >= 10000 && pos > 0 && pos <= 30 ? ['grandmaster', 'Grandmaster'] : TITLES.find(t => rp >= t[2]));
const titleImg = (rp, pos) => { const [k, l] = titleOf(rp || 0, pos); return `<img class="b-tt" src="${SITE}/titles/${k}.png" alt="${l}" data-tip="<b>${l}</b><small>Rhythia title</small>">`; };
const morph = (el, html) => RhythiaX.ExodusKit.morph(el, html);
// Line icons only: a globe for Global, a chevron, a check for the chosen country.
const GLOBE = '<svg class="b-globe" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3z"/></svg>';
const CHEVRON = '<svg class="b-chev" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';
const CHECK = '<svg class="b-check" viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>';
const flagImg = c => c ? `<img class="b-fl" src="${SITE}/flags/${esc(c)}.svg" alt="" data-code="${esc(c)}">` : GLOBE;

// dq is the query the shown data belongs to; while another one loads, the rows keep their own mode.
const S = {cp: {open: false, q: '', i: -1}, q: parse(), dq: null, period: '', data: null, hist: null, histBusy: false, allowed: false, me: null, loading: false, seq: 0, enter: !ctx.quiet};
const mode = () => (S.dq || S.q).mode;
const wantsHist = q => S.allowed && q.mode === 'normal';

function parse() {
  const m = location.pathname.match(/^\/leaderboards(?:\/([A-Za-z]{2}))?\/?$/), sp = new URLSearchParams(location.search), mode = sp.get('mode');
  return {flag: (m?.[1] || '').toUpperCase(), mode: mode === 'spin' || mode === 'vr' ? mode : 'normal', inactive: sp.get('inactive') === 'true', page: Math.max(1, parseInt(sp.get('page'), 10) || 1)};
}
function urlOf(q) {
  const p = new URLSearchParams();
  if (q.mode !== 'normal') p.set('mode', q.mode);
  if (q.inactive) p.set('inactive', 'true');
  if (q.page > 1) p.set('page', String(q.page));
  const s = p.toString();
  return `/leaderboards${q.flag ? '/' + q.flag : ''}${s ? '?' + s : ''}`;
}
const go = patch => ctx.go(urlOf({...S.q, ...patch}));
// Movement over 7 or 30 days needs the community history, which is Lock only.
const periodOk = p => p === 'today' || (S.allowed && S.q.mode === 'normal');
// Movement for a player whose history is still on its way.
const WAIT = 'wait';
const period = () => periodOk(S.period) ? S.period : 'today';

/* ── Tooltip and toast (same behaviour as the other pages) ── */
const tipEl = $('#tip');
function showTip(t) {
  RhythiaX.ExodusKit.fillTip(tipEl, t.dataset.tip); tipEl.classList.add('on');
  const r = t.getBoundingClientRect(), w = tipEl.offsetWidth, h = tipEl.offsetHeight;
  const x = Math.min(innerWidth - w - 8, Math.max(8, r.left + r.width / 2 - w / 2)); let y = r.top - h - 8;
  if (y < 64) y = r.bottom + 8;
  tipEl.style.left = x + 'px'; tipEl.style.top = y + 'px';
}
const hideTip = () => tipEl.classList.remove('on');
R.addEventListener('pointerover', e => { const t = e.target.closest?.('[data-tip]'); t ? showTip(t) : hideTip(); }, sig);
addEventListener('scroll', hideTip, {passive: true, signal: ac.signal});
function toast(m) { const t = $('#toast'); t.textContent = m; t.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('on'), 2600); }

/* ── Movement ── */
const daysAgo = n => { const d = new Date(); d.setUTCDate(d.getUTCDate() - n); return d.toISOString().slice(0, 10); };
function move(u) {
  const [, , rpK, , chK] = MODES[mode()], pos = u.rank;
  if (period() === 'today') return {places: u[chK] || 0, rp: null};
  const h = S.hist?.[u.id];
  if (!h) return S.histBusy ? WAIT : null;
  if (!h.length) return null;
  const rankK = S.q.flag ? 'countryRank' : 'globalRank', from = daysAgo(period() === '7d' ? 7 : 30);
  const old = h.find(d => d.date >= from && d[rankK] > 0 && d.skillPoints > 0);
  if (!old || old.date >= daysAgo(0)) return null;
  return {places: pos ? old[rankK] - pos : 0, rp: u[rpK] - old.skillPoints, oldRank: old[rankK], since: old.date};
}
function spark(u) {
  if (!S.hist?.[u.id] && S.histBusy) return '<span class="b-spark wait skeleton" aria-hidden="true"></span>';
  const h = (S.hist?.[u.id] || []).filter(d => d.skillPoints > 0).slice(-31);
  if (h.length < 3) return '<span class="b-spark none" aria-hidden="true"></span>';
  const v = h.map(d => d.skillPoints), lo = Math.min(...v), hi = Math.max(...v), span = hi - lo || 1, W = 84, H = 24;
  const d = v.map((x, i) => `${i ? 'L' : 'M'}${(i * W / (v.length - 1)).toFixed(1)},${(H - 2 - (x - lo) / span * (H - 4)).toFixed(1)}`).join('');
  const gain = v.at(-1) - v[0];
  return `<svg class="b-spark ${gain > 0.5 ? 'up' : gain < -0.5 ? 'down' : ''}" viewBox="0 0 ${W} ${H}" data-tip="<b>${gain >= 0 ? '+' : '−'}${fmt(Math.abs(gain), 1)} RP</b><small>Rhythm points over ${h.length - 1} days</small>"><path d="${d}"/></svg>`;
}
const placesTxt = n => n > 0 ? `▲ ${fmt(n)}` : n < 0 ? `▼ ${fmt(-n)}` : '–';
const scope = () => period() === 'today' ? 'since yesterday' : `in ${period() === '7d' ? '7' : '30'} days`;

/* ── Header ── */
function head() {
  const me = S.me, pos = S.data?.userPosition, m = MODES[S.q.mode];
  const card = me
    ? `<a class="b-me-av" href="/player/${esc(me.id)}" style="background-image:url('${esc(me.avatar_url)}')" aria-label="Your profile"></a>
       <div><small>Your position${S.q.flag ? ` in ${esc(country(S.q.flag))}` : ''} · ${m[0]}</small><strong class="num">${pos ? '#' + fmt(pos) : '—'}</strong>
       ${pos ? `<button class="b-link" type="button" data-mine>Show my page</button>` : '<span class="cap">Not ranked here yet</span>'}</div>`
    : `<p>Please log in to see your position here!</p><button class="btn" type="button" data-native-click="Sign in">Sign in</button>`;
  return `<section class="container b-head">
    <div class="b-title"><img src="${SITE}/mascot.png" alt="" class="b-mascot"><div><span class="cap">Leaderboards</span><h1>Compete and track your performance</h1><p>Compare scores, track your progress, and see where you rank.</p></div></div>
    <aside class="b-me ${me ? '' : 'out'}">${card}</aside>
  </section>`;
}
function bar() {
  const q = S.q;
  return `<div class="container b-bar">
    <div class="b-cp ${S.cp.open ? 'open' : ''}"><button class="b-cp-btn" type="button" data-cp aria-haspopup="listbox" aria-expanded="${S.cp.open}" aria-label="Country: ${q.flag ? esc(country(q.flag)) : 'Global'}">${flagImg(q.flag)}<span>${q.flag ? esc(country(q.flag)) : 'Global'}</span>${CHEVRON}</button>${S.cp.open ? picker() : ''}</div>
    <div class="pills" aria-label="Game mode">${Object.entries(MODES).map(([k, v]) => `<button type="button" aria-pressed="${q.mode === k}" data-mode="${k}"><img src="${SITE}/${v[1]}" alt="">${v[0]}</button>`).join('')}</div>
    <div class="pills" aria-label="Movement period">${PERIODS.map(([k, l]) => `<button type="button" aria-pressed="${period() === k}" data-period="${k}" ${periodOk(k) ? '' : `aria-disabled="true" data-tip="${!S.allowed ? '<b>Community history is off</b><small>Turn it on in the Reimagined popup to see 7 and 30 day movement.</small>' : '<b>Lock only</b><small>Community history follows Lock rhythm points.</small>'}"`}>${l}</button>`).join('')}</div>
    <label class="b-switch"><input type="checkbox" id="b-inactive" ${q.inactive ? 'checked' : ''}><i aria-hidden="true"></i>Include inactive</label>
  </div>`;
}

function cpItems() {
  const qq = S.cp.q.trim().toLowerCase(), cur = S.q.flag, mine = S.me?.flag;
  const match = ([c, n]) => !qq || n.toLowerCase().includes(qq) || c.toLowerCase() === qq;
  const item = (c, n) => `<button type="button" role="option" class="b-cp-item" aria-selected="${cur === c}" data-flag="${esc(c)}">${flagImg(c)}<span>${esc(n)}</span>${cur === c ? CHECK : ''}</button>`;
  const head = t => `<div class="b-cp-sec">${t}</div>`;
  let out = '';
  if (!qq || 'global'.includes(qq)) out += item('', 'Global');
  if (mine && match([mine, country(mine)])) out += head('Your country') + item(mine, country(mine));
  const all = COUNTRIES.filter(match);
  if (all.length) out += head(qq ? `${all.length} ${all.length === 1 ? 'country' : 'countries'}` : 'All countries') + all.map(([c, n]) => item(c, n)).join('');
  return out || '<p class="cap b-cp-none">No country matches.</p>';
}
function picker() {
  return `<div class="b-cp-pop" role="dialog" aria-label="Choose a country">
    <label class="field b-cp-q"><svg class="ico" aria-hidden="true"><use href="#i-search"/></svg><span class="sr">Search countries</span><input id="b-cp-q" type="search" placeholder="Search countries" autocomplete="off" value="${esc(S.cp.q)}"></label>
    <div class="b-cp-list" role="listbox" id="b-cp-list">${cpItems()}</div></div>`;
}
function openPicker(open) {
  S.cp = {open, q: '', i: -1};
  morph($('#b-bar'), bar());
  if (!open) return;
  $('#b-cp-q')?.focus();
  $('.b-cp-item[aria-selected="true"]')?.scrollIntoView({block: 'center'});
}
function cpMove(step) {
  const items = [...R.querySelectorAll('.b-cp-item')];
  if (!items.length) return;
  S.cp.i = (S.cp.i + step + items.length) % items.length;
  items.forEach((b, i) => b.classList.toggle('on', i === S.cp.i));
  items[S.cp.i].scrollIntoView({block: 'nearest'});
}

/* ── Highlights: what moved on this page ── */
function highlights() {
  const rows = S.data?.rows || [];
  if (!rows.length) return '';
  const [, , rpK] = MODES[mode()], all = rows.map(u => ({u, m: move(u)})), moved = all.filter(x => x.m && x.m !== WAIT);
  const waiting = all.filter(x => x.m === WAIT).length;
  // Nothing known yet: placeholders of the same size, so nothing moves when the history comes.
  if (waiting && !moved.length) return `<section class="container b-hls" aria-label="Highlights" aria-busy="true">
    <div class="b-hls-head"><h2>On this page <span>· last ${period() === '7d' ? '7' : '30'} days</span></h2><span class="cap">Loading Reimagined’s community history…</span></div>
    <div class="b-hls-row">${['Biggest climb', 'Biggest drop', 'Most RP gained', 'Closest race'].map(l => `<div class="b-hl"><small>${l}</small><div class="skeleton" style="width:70%;height:26px"></div><div class="skeleton" style="width:55%;height:24px"></div><div class="skeleton" style="width:45%;height:14px"></div></div>`).join('')}</div></section>`;
  const best = moved.filter(x => x.m.places > 0).sort((a, b) => b.m.places - a.m.places)[0];
  const worst = moved.filter(x => x.m.places < 0).sort((a, b) => a.m.places - b.m.places)[0];
  const gain = period() !== 'today' ? moved.filter(x => x.m.rp > 0).sort((a, b) => b.m.rp - a.m.rp)[0] : null;
  let race = null;
  for (let i = 0; i + 1 < rows.length; i++) { const gap = rows[i][rpK] - rows[i + 1][rpK]; if (gap >= 0 && (!race || gap < race.gap)) race = {a: rows[i], b: rows[i + 1], gap}; }
  const who = u => `<a class="b-hl-who" href="/player/${esc(u.id)}"><i style="background-image:url('${esc(u.avatar)}')"></i><b>${esc(u.username)}</b></a>`;
  const card = (label, body, tone = '') => `<div class="b-hl ${tone}"><small>${label}</small>${body}</div>`;
  const none = t => `<p class="cap">${t}</p>`;
  return `<section class="container b-hls" aria-label="Highlights">
    <div class="b-hls-head"><h2>On this page <span>· ${period() === 'today' ? 'since yesterday' : `last ${period() === '7d' ? '7' : '30'} days`}</span></h2>${period() !== 'today' ? `<span class="cap">From Reimagined’s community history${waiting ? ` · ${fmt(waiting)} ${waiting === 1 ? 'player' : 'players'} still loading` : ''}</span>` : ''}</div>
    <div class="b-hls-row">
      ${card('Biggest climb', best ? `${who(best.u)}<strong class="num up">▲ ${fmt(best.m.places)}</strong><span class="num">${best.m.oldRank ? `#${fmt(best.m.oldRank)} → #${fmt(best.u.rank)}` : `Now #${fmt(best.u.rank)}`}</span>` : none('Nobody here climbed.'), 'up')}
      ${card('Biggest drop', worst ? `${who(worst.u)}<strong class="num down">▼ ${fmt(-worst.m.places)}</strong><span class="num">${worst.m.oldRank ? `#${fmt(worst.m.oldRank)} → #${fmt(worst.u.rank)}` : `Now #${fmt(worst.u.rank)}`}</span>` : none('Nobody here dropped.'), 'down')}
      ${period() !== 'today' ? card('Most RP gained', gain ? `${who(gain.u)}<strong class="num">+${fmt(gain.m.rp, 1)}</strong><span class="num">${fmt(gain.u[rpK], 2)} RP now</span>` : none('No RP gained here.')) : ''}
      ${card('Closest race', race ? `<div class="b-race">${who(race.a)}<span>vs</span>${who(race.b)}</div><strong class="num">${fmt(race.gap, 2)} RP</strong><span class="num">between #${fmt(race.a.rank)} and #${fmt(race.b.rank)}</span>` : none('—'))}
    </div>
  </section>`;
}

/* ── Table ── */
function table() {
  const d = S.data, [, , rpK, posK] = MODES[mode()];
  if (!d) return `<div class="b-rows">${Array.from({length: 12}, () => '<div class="b-row sk"><div class="skeleton" style="height:22px;width:100%"></div></div>').join('')}</div>`;
  if (!d.rows.length) return '<div class="empty" style="padding:64px 0"><b>No players here</b>Try another country or include inactive players.</div>';
  // The 30-day column is there from the start when history can come, so the table does not shift.
  const showTrend = S.allowed && mode() === 'normal';
  return `<div class="b-cols ${showTrend ? 'trend' : ''}" aria-hidden="true"><span>#</span><span>${period() === 'today' ? 'Today' : period() === '7d' ? '7 days' : '30 days'}</span><span>Player</span>${showTrend ? '<span>30 days</span>' : ''}<span>Rhythm points</span><span>Play count</span></div>
    <div class="b-rows ${showTrend ? 'trend' : ''} ${S.enter ? 'anim' : ''}">${d.rows.map((u, i) => {
      const m = move(u), pos = u.rank, mine = S.me && String(S.me.id) === String(u.id);
      const mv = m === WAIT ? '<span class="b-mv"><i class="skeleton b-mvsk"></i></span>' : m ? `<span class="b-mv ${m.places > 0 ? 'up' : m.places < 0 ? 'down' : ''}" data-tip="${m.places ? `<b>${m.places > 0 ? 'Up' : 'Down'} ${fmt(Math.abs(m.places))} place${Math.abs(m.places) === 1 ? '' : 's'}</b><small>${scope()}${m.rp != null ? ` · ${m.rp >= 0 ? '+' : '−'}${fmt(Math.abs(m.rp), 1)} RP` : ''}</small>` : `<b>No change</b><small>${scope()}</small>`}">${placesTxt(m.places)}</span>`
        : `<span class="b-mv none" data-tip="<b>No history yet</b><small>Reimagined has not tracked this player long enough</small>">·</span>`;
      return `<a class="b-row ${mine ? 'me' : ''} ${u.verified ? 'sup' : ''}" href="/player/${esc(u.id)}" style="--i:${Math.min(i, 30)}">${u.verified ? SUP_BG : ''}
        <span class="pos num ${pos <= 3 ? 'p' + pos : ''}">${fmt(pos)}</span>${mv}
        <span class="who">${u.flag ? `<img class="b-flag" src="${SITE}/flags/${esc(u.flag)}.svg" alt="${esc(u.flag)}">` : ''}<i class="av" style="background-image:url('${esc(u.avatar)}')"></i><b>${esc(u.username)}</b>${titleImg(u[rpK], u[posK])}${u.clan ? `<span class="tag">${esc(u.clan.acronym)}</span>` : ''}${u.verified ? HEART : ''}</span>
        ${showTrend ? spark(u) : ''}
        <span class="rp num">${fmt(u[rpK], 2)}</span><span class="pc num">${fmt(u.plays)}</span></a>`;
    }).join('')}</div>`;
}
function pager() {
  const d = S.data; if (!d || d.total <= d.perPage) return '';
  const pages = Math.ceil(d.total / d.perPage), p = S.q.page;
  const nums = [...new Set([1, 2, p - 1, p, p + 1, pages - 1, pages])].filter(n => n >= 1 && n <= pages).sort((a, b) => a - b);
  return `<div class="pager"><span class="num">${fmt((p - 1) * d.perPage + 1)}–${fmt(Math.min(p * d.perPage, d.total))} of ${fmt(d.total)}</span><div class="pages">
    <button type="button" data-page="${p - 1}" ${p === 1 ? 'disabled' : ''} aria-label="Previous page">‹</button>
    ${nums.map((n, i) => `${i && n - nums[i - 1] > 1 ? '<span>…</span>' : ''}<button type="button" data-page="${n}" ${n === p ? 'aria-current="page"' : ''}>${fmt(n)}</button>`).join('')}
    <button type="button" data-page="${p + 1}" ${p === pages ? 'disabled' : ''} aria-label="Next page">›</button></div></div>`;
}

/* ── Rendering ── */
function render() {
  $('#hero').innerHTML = '';
  $('#body').innerHTML = `<div class="b-page ${S.enter ? 'enter' : ''}"><div id="b-headw">${head()}</div><div id="b-bar">${bar()}</div><div id="b-hls">${highlights()}</div>
    <section class="container b-table" aria-label="Leaderboard"><div class="panel b-panel ${S.loading ? 'busy' : ''}" id="b-table">${table()}</div><div id="b-pager">${pager()}</div></section><div style="height:96px"></div></div>`;
  // The entrance plays once. Without this, any part redrawn later (the bar when the country list opens) would fade in again.
  if (S.enter) setTimeout(() => $('.b-page')?.classList.remove('enter'), 900);
}
function refresh() {
  if (!$('.b-page')) return render();
  // Brought up to date in place: rows, pictures and running animations stay where they are.
  morph($('#b-headw'), head());
  if (!S.cp.open) morph($('#b-bar'), bar());
  morph($('#b-hls'), highlights());
  const t = $('#b-table'); morph(t, table()); t.classList.toggle('busy', S.loading);
  morph($('#b-pager'), pager());
}

// A place is the order on the page, as on Rhythia: a country or the inactive view has its own ranks.
function ranked(data, q) {
  data.rows.forEach((u, i) => { u.rank = (q.page - 1) * (data.perPage || 50) + i + 1; });
  return data;
}

// Paint the saved copy at once, then the fresh page; the community history follows, from its
// cache at once where it has it.
async function load() {
  const seq = ++S.seq, q = {...S.q};
  S.loading = true;
  const snap = await Data.boardSnapshot(q).catch(() => null);
  if (seq !== S.seq) return;
  if (snap) {
    S.data = ranked(snap, q); S.dq = q;
    if (wantsHist(q)) { S.histBusy = true; S.hist = {...S.hist, ...(await Data.historiesCached(snap.rows.map(u => u.id)).catch(() => null))}; }
    if (seq !== S.seq) return;
  }
  refresh();
  let data;
  try {
    data = await Data.board(q, ac.signal);
  } catch (err) {
    if (seq !== S.seq || ac.signal.aborted) return;
    S.loading = false; S.histBusy = false;
    if (!S.data) { $('#b-table').innerHTML = `<div class="empty" style="padding:64px 0"><b>Could not load the leaderboard</b>${esc(err.message)}<div style="margin-top:14px"><button class="btn" type="button" data-retry>Try again</button></div></div>`; return; }
    refresh(); toast('Showing the saved leaderboard; Rhythia did not answer.');
    return;
  }
  if (seq !== S.seq) return;
  S.data = ranked(data, q); S.dq = q; S.loading = false; S.histBusy = wantsHist(q);
  refresh();
  S.enter = false;
  if (!S.histBusy) return;
  await Data.histories(data.rows.map(u => u.id), ac.signal, part => {
    if (seq !== S.seq) return;
    S.hist = {...S.hist, ...part};
    refresh();
  }).catch(() => null);
  if (seq !== S.seq) return;
  S.histBusy = false;
  refresh();
}

R.addEventListener('click', e => {
  if (S.cp.open && !e.target.closest('.b-cp')) openPicker(false);
  if (e.target.closest('[data-cp]')) return openPicker(!S.cp.open);
  const f = e.target.closest('[data-flag]');
  if (f) { const flag = f.dataset.flag; openPicker(false); if (flag !== S.q.flag) go({flag, page: 1}); return; }
  const t = e.target.closest('[data-mode],[data-period],[data-page],[data-mine],[data-native-click],[data-retry]');
  if (!t || t.disabled) return;
  const d = t.dataset;
  if (d.mode) { if (d.mode !== S.q.mode) go({mode: d.mode, page: 1}); return; }
  if (d.period) {
    if (!periodOk(d.period)) { toast(S.allowed ? 'Movement over days follows Lock only.' : 'Turn on community history in the Reimagined popup to see 7 and 30 day movement.'); return; }
    S.period = d.period; try { localStorage.setItem('rhythiax_exodus_board_period', d.period); } catch (_) {}
    hideTip(); return refresh();
  }
  if (d.page) { go({page: Number(d.page)}); const el = $('.b-table'); if (el && el.getBoundingClientRect().top < 0) scrollTo({top: el.getBoundingClientRect().top + scrollY - 140, behavior: REDUCED ? 'auto' : 'smooth'}); return; }
  if (t.hasAttribute('data-mine')) { const pos = S.data?.userPosition; if (pos) go({page: Math.ceil(pos / (S.data.perPage || 50))}); return; }
  if (t.hasAttribute('data-retry')) return load();
  if (d.nativeClick && !ctx.clickNative(d.nativeClick)) toast('Rhythia is still loading. Try again in a moment.');
}, sig);
R.addEventListener('input', e => {
  if (e.target.id !== 'b-cp-q') return;
  S.cp.q = e.target.value; S.cp.i = -1;
  $('#b-cp-list').innerHTML = cpItems();
}, sig);
R.addEventListener('keydown', e => {
  if (!S.cp.open) return;
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); return cpMove(e.key === 'ArrowDown' ? 1 : -1); }
  if (e.key === 'Enter') { e.preventDefault(); const items = R.querySelectorAll('.b-cp-item'); (items[S.cp.i] || (S.cp.q ? items[0] : null))?.click(); return; }
  if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); openPicker(false); R.querySelector('[data-cp]')?.focus(); }
}, sig);
// A flag Rhythia does not have shows its code instead.
R.addEventListener('error', e => {
  const img = e.target;
  if (img?.tagName !== 'IMG' || !img.classList.contains('b-fl')) return;
  const b = document.createElement('b'); b.className = 'b-fl code'; b.textContent = img.dataset.code || ''; img.replaceWith(b);
}, {capture: true, signal: ac.signal});
R.addEventListener('change', e => {
  if (e.target.id === 'b-inactive') go({inactive: e.target.checked, page: 1});
}, sig);

(async () => {
  const [allowed, me] = await Promise.all([Data.historyAllowed?.() ?? false, Data.signedIn().catch(() => null)]);
  if (ac.signal.aborted) return;
  S.allowed = Boolean(allowed); S.me = me;
  let saved = ''; try { saved = localStorage.getItem('rhythiax_exodus_board_period') || ''; } catch (_) {}
  S.period = PERIODS.some(([k]) => k === saved) ? saved : S.allowed ? '7d' : 'today';
  load();
})();
render();

return {
  state: () => ({}),
  idle: () => true,
  relayout() {},
  // The address changed inside the leaderboard (page, mode, country): load that view.
  page() { const q = parse(); if (urlOf(q) === urlOf(S.q)) return; S.q = q; load(); },
  destroy() { ac.abort(); hideTip(); },
};
};

RhythiaX.ExodusBoard.css = `
.b-head{display:flex;align-items:flex-end;justify-content:space-between;gap:24px;flex-wrap:wrap;padding-top:48px}
.b-title{display:flex;align-items:center;gap:22px;min-width:0}
.b-mascot{width:96px;height:96px;object-fit:contain;flex:none}
.b-title h1{margin:4px 0 0;font-size:clamp(28px,3.4vw,40px);line-height:1.1;font-weight:800;letter-spacing:-.03em}
.b-title p{margin:8px 0 0;font-size:15px;color:var(--muted)}
.b-me{display:flex;align-items:center;gap:14px;min-width:240px;padding:14px 18px;border-radius:16px;background:var(--panel);box-shadow:inset 0 0 0 1px var(--line)}
.b-me.out{flex-direction:column;align-items:flex-start;gap:10px;max-width:280px}
.b-me.out p{margin:0;color:var(--text-2)}
.b-me-av{width:52px;height:52px;border-radius:16px;flex:none;background:var(--panel-3) center/cover}
.b-me small{display:block;font-size:12.5px;color:var(--muted)}
.b-me strong{display:block;font-size:26px;font-weight:800;letter-spacing:-.02em;line-height:1.15}
.b-link{padding:0;border:0;background:none;color:var(--accent-2);font:inherit;font-weight:600;font-size:13px;cursor:pointer}
.b-link:hover{text-decoration:underline;text-underline-offset:3px}
[data-variant="lines"] .b-me{background:none;box-shadow:none;border-left:2px solid var(--rule-2);border-radius:0;padding:4px 0 4px 18px}
.b-bar{position:relative;z-index:20;display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:32px;padding-top:14px;padding-bottom:14px}
.b-bar::before,.b-bar::after{content:"";position:absolute;left:24px;right:24px;height:1px;background:var(--line)}
.b-bar::before{top:0}.b-bar::after{bottom:0}
.b-bar .pills{height:40px;padding:3px;align-items:stretch}
.b-bar .pills button{height:auto}
.b-cp{position:relative}
.b-cp-btn{display:flex;align-items:center;gap:10px;height:40px;min-width:220px;padding:0 12px;border:0;border-radius:10px;background:var(--field);box-shadow:inset 0 0 0 1px var(--line-2);color:var(--text);font:inherit;font-weight:600;text-align:left;cursor:pointer;transition:box-shadow .15s}
.b-cp-btn:hover,.b-cp.open .b-cp-btn{box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--accent) 55%,transparent)}
.b-cp-btn span{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.b-fl{width:22px;height:16px;flex:none;object-fit:cover;border-radius:3px;box-shadow:0 0 0 1px rgba(var(--ink),.08)}
.b-fl.code{display:grid;place-items:center;font-size:9.5px;font-weight:700;color:var(--muted);background:var(--panel-3)}
.b-globe,.b-chev,.b-check{width:18px;height:18px;flex:none;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
.b-globe{width:20px;height:20px;color:var(--accent-2)}
.b-chev{color:var(--muted);transition:transform .2s var(--ease)}
.b-cp.open .b-chev{transform:rotate(180deg)}
.b-check{color:var(--accent-2);margin-left:auto}
.b-cp-pop{position:absolute;z-index:30;top:calc(100% + 6px);left:0;width:300px;padding:8px;border-radius:14px;background:var(--dialog);box-shadow:0 0 0 1px var(--line-2),0 18px 40px rgba(0,0,0,calc(.45 * var(--sh)));animation:exoEnter .2s var(--ease) both}
.b-cp-q{display:flex;align-items:center;gap:8px;height:38px;padding:0 10px}
.b-cp-q input{flex:1;min-width:0;border:0;background:none;color:var(--text);font:inherit;outline:none}
.b-cp-list{max-height:340px;overflow:auto;margin-top:6px;padding-right:2px;scrollbar-width:thin}
.b-cp-sec{padding:10px 10px 4px;font-size:11.5px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--muted)}
.b-cp-item{display:flex;align-items:center;gap:10px;width:100%;height:36px;padding:0 10px;border:0;border-radius:8px;background:none;color:var(--text-2);font:inherit;font-weight:550;text-align:left;cursor:pointer}
.b-cp-item span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.b-cp-item:hover,.b-cp-item.on{background:rgba(var(--ink),.06);color:var(--text)}
.b-cp-item[aria-selected="true"]{color:var(--text);font-weight:650}
.b-cp-none{margin:14px 10px}
.b-bar .pills button[aria-disabled="true"]{opacity:.45}
.b-switch{display:inline-flex;align-items:center;gap:10px;margin-left:auto;font-weight:600;color:var(--text-2);cursor:pointer;user-select:none}
.b-switch input{position:absolute;opacity:0;pointer-events:none}
.b-switch i{position:relative;width:38px;height:22px;border-radius:999px;background:var(--panel-3);box-shadow:inset 0 0 0 1px var(--line-2);transition:background-color .2s}
.b-switch i::after{content:"";position:absolute;top:3px;left:3px;width:16px;height:16px;border-radius:50%;background:var(--text);transition:transform .25s var(--ease)}
.b-switch input:checked + i{background:var(--accent)}
.b-switch input:checked + i::after{transform:translateX(16px);background:#fff}
.b-switch input:focus-visible + i{outline:2px solid var(--accent);outline-offset:2px}
.b-hls{margin-top:28px}
.b-hls-head{display:flex;align-items:baseline;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:12px}
.b-hls-head h2{margin:0;font-size:17px;font-weight:700}
.b-hls-head h2 span{color:var(--muted);font-weight:500}
.b-hls-row{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px}
.b-hl{display:flex;flex-direction:column;gap:6px;min-width:0;padding:16px 18px;border-radius:16px;background:var(--panel);box-shadow:inset 0 0 0 1px var(--line)}
.b-hl > small{font-size:12.5px;font-weight:600;color:var(--muted)}
.b-hl strong{font-size:24px;font-weight:800;letter-spacing:-.02em;line-height:1.1}
.b-hl strong.up{color:var(--good)}.b-hl strong.down{color:var(--bad)}
.b-hl > span{font-size:12.5px;color:var(--text-2)}
.b-hl p{margin:6px 0 0}
.b-hl-who{display:flex;align-items:center;gap:8px;min-width:0;font-size:14px}
.b-hl-who i{width:26px;height:26px;border-radius:50%;flex:none;background:var(--panel-3) center/cover}
.b-hl-who b{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:650}
.b-hl-who:hover b{color:var(--accent-2)}
.b-race{display:flex;align-items:center;gap:8px;min-width:0}
.b-race > span{font-size:12px;color:var(--muted);flex:none}
.b-race .b-hl-who{flex:1 1 0}
[data-variant="lines"] .b-hls-row{gap:0;border-top:1px solid var(--rule);border-bottom:1px solid var(--rule)}
[data-variant="lines"] .b-hl{background:none;box-shadow:none;border-radius:0;border-left:1px solid var(--rule);padding:16px 20px}
[data-variant="lines"] .b-hl:first-child{border-left:0;padding-left:2px}
.b-table{margin-top:28px}
.b-panel{padding:8px 12px;transition:opacity .2s}
.b-panel.busy{opacity:.6;transition:opacity .2s .35s}
.b-cols,.b-row{display:grid;grid-template-columns:52px 64px minmax(0,1fr) 120px 110px;align-items:center;gap:12px}
.b-cols.trend,.b-rows.trend .b-row{grid-template-columns:52px 64px minmax(0,1fr) 96px 120px 110px}
.b-cols{padding:10px 12px;font-size:12px;font-weight:600;color:var(--muted);border-bottom:1px solid var(--line)}
.b-cols span:nth-last-child(-n+2){text-align:right}
.b-row{position:relative;padding:9px 12px;border-radius:10px;transition:background-color .15s}
.b-row + .b-row{box-shadow:0 -1px 0 var(--line)}
.b-row:hover{background:rgba(var(--ink),.045)}
.b-row.me{background:var(--accent-soft)}
.b-row.sup{margin:3px 0;overflow:hidden;color:#fff;background:#141516}
.b-row.sup + .b-row,.b-row + .b-row.sup{box-shadow:none}
.b-row.sup::after{content:"";position:absolute;inset:0;border-radius:10px;box-shadow:inset 0 0 0 2px rgba(192,132,252,.3);pointer-events:none}
.b-row.sup > :not(.b-supbg){position:relative}
.b-row.sup .pc,.b-row.sup .pos:not(.p1):not(.p2):not(.p3){color:rgba(255,255,255,.75)}
.b-row.sup:hover .b-supbg img{filter:brightness(1.12)}
.b-supbg,.b-supbg img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:right;pointer-events:none}
.b-supbg img{transition:filter .15s}
.b-heart{height:20px;width:auto;flex:none;margin-left:2px}
.b-tt{width:20px;height:20px;flex:none;object-fit:contain}
.b-mvsk{display:inline-block;width:34px;height:12px;border-radius:5px;vertical-align:middle}
.b-spark.wait{height:12px;width:72px;border-radius:5px}
.b-row.sk{display:block;padding:14px 12px}
.b-row .pos{font-weight:750;font-size:15px;color:var(--muted);text-align:center}
.b-row .pos.p1{color:#e2b43a}.b-row .pos.p2{color:#b6c0cd}.b-row .pos.p3{color:#d08a5c}
[data-theme="white"] .b-row .pos.p1{color:#b7791f}[data-theme="white"] .b-row .pos.p2{color:#64748b}[data-theme="white"] .b-row .pos.p3{color:#b45309}
.b-mv{font-size:12.5px;font-weight:650;color:var(--muted)}
.b-mv.up{color:var(--good)}.b-mv.down{color:var(--bad)}.b-mv.none{opacity:.5}
.b-row .who{display:flex;align-items:center;gap:9px;min-width:0}
.b-row .who b{font-weight:650;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.b-row .av{width:30px;height:30px;border-radius:50%;flex:none;background:var(--panel-3) center/cover}
.b-flag{width:20px;border-radius:2px;flex:none}
.b-row .tag{flex:none;padding:1px 6px;border-radius:5px;font-size:11px;font-weight:700;color:var(--muted);box-shadow:inset 0 0 0 1px var(--line-2)}
.b-row .rp{text-align:right;font-weight:700}
.b-row .pc{text-align:right;color:var(--text-2)}
.b-spark{display:block;width:84px;height:24px;overflow:visible}
.b-spark path{fill:none;stroke:var(--muted);stroke-width:1.6;stroke-linejoin:round;stroke-linecap:round;vector-effect:non-scaling-stroke}
.b-spark.up path{stroke:var(--good)}.b-spark.down path{stroke:var(--bad)}
.b-spark.none{height:1px;width:40px;background:var(--line-2)}
.b-rows.anim .b-row{animation:hRise .45s var(--ease) both;animation-delay:calc(var(--i) * 18ms)}
.b-rows.anim .b-spark path{stroke-dasharray:200;stroke-dashoffset:200;animation:bDraw 1s var(--ease) .35s forwards}
@keyframes bDraw{to{stroke-dashoffset:0}}
@keyframes hRise{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
.b-page.enter .b-head{animation:exoEnter .6s var(--ease) both}
.b-page.enter .b-bar{animation:exoEnter .6s var(--ease) .08s both}
.b-page.enter .b-hls{animation:exoEnter .6s var(--ease) .16s both}
[data-variant="lines"] .b-panel{padding:0}
@media (max-width:900px){.b-cols.trend,.b-rows.trend .b-row,.b-cols,.b-row{grid-template-columns:40px 52px minmax(0,1fr) 100px}.b-cols span:nth-child(4):not(:last-child),.b-row .b-spark,.b-row .pc,.b-cols span:last-child{display:none}.b-cols.trend span:nth-child(5){display:block}.b-switch{margin-left:0}}
@media (max-width:560px){.b-mascot{display:none}.b-me{width:100%}.b-cp,.b-cp-btn{width:100%}.b-cp-pop{width:100%}.b-cols,.b-row{grid-template-columns:34px 44px minmax(0,1fr) 84px;gap:8px}.b-cols.trend,.b-rows.trend .b-row{grid-template-columns:34px 44px minmax(0,1fr) 84px}.b-row .tag,.b-row .b-flag{display:none}.b-hls-row{grid-template-columns:1fr 1fr}}
@media (prefers-reduced-motion:reduce){.b-rows.anim .b-row,.b-page.enter *{animation:none!important}.b-rows.anim .b-spark path{stroke-dasharray:none;animation:none}}
`;
