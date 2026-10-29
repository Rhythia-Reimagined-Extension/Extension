// =============================================
// Reimagined for Rhythia — Exodus kit
// =============================================
// What the Exodus pages share: formatting, Rhythia's difficulty and status names, grades, titles and
// the social-link rule, mod art, the tooltip/toast shell, the watch on Rhythia's own dialogs, the
// map-file summary, one score row, a pager, and morph(), which brings a part of the page up to date in
// place instead of drawing it again. Its CSS holds the rules several pages draw with (page head,
// switch, map tiles, dialogs, the side list).
// Pages register themselves with page(name, view, css); the shell reads them from
// RhythiaX.ExodusPages and puts every page's CSS into its shadow root.

var RhythiaX = RhythiaX || {};

RhythiaX.ExodusKit = (function () {
'use strict';

const SITE = 'https://www.rhythia.com';
const Data = () => RhythiaX.ExodusData;
const Kit = () => RhythiaX.ExodusMapKit;
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt = (n, d = 0) => Number(n || 0).toLocaleString('en-US', {minimumFractionDigits: d, maximumFractionDigits: d});
const pct = (n, d = 0) => `${fmt(n * 100, d)}%`;
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
// Rhythia stores some times without a zone; those are UTC.
const when = iso => { const s = String(iso || ''); return new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(s) ? s : s.replace(' ', 'T') + 'Z'); };
const ago = iso => {
  const s = Math.max(0, (Date.now() - when(iso).getTime()) / 1000);
  for (const [sec, n] of [[31536000, 'year'], [2592000, 'month'], [604800, 'week'], [86400, 'day'], [3600, 'hour'], [60, 'minute']])
    if (s >= sec) { const v = Math.floor(s / sec); return `${v} ${n}${v > 1 ? 's' : ''} ago`; }
  return 'just now';
};
const fullDate = iso => when(iso).toLocaleString('en-GB', {day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'});
const mmss = ms => { const s = Math.max(0, Math.round((ms || 0) / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
// Rhythia's difficulty badges: 1 Easy, 2 Medium, 3 Hard, 5 Tasukete, 0 N/A, anything else Logic.
const DIFF = {0: ['N/A', 'var(--muted)'], 1: ['Easy', '#3bbf7d'], 2: ['Medium', '#d8970a'], 3: ['Hard', '#e5484d'], 5: ['Tasukete', '#cbd5e1']};
const diff = n => DIFF[n] || ['Logic', '#a26bdc'];
const STATUS = {RANKED: ['Ranked', '#60a5fa'], QUALIFIED: ['Qualified', '#a78bfa'], UNRANKED: ['Unranked', 'var(--muted)'], LEGACY: ['Legacy', 'var(--muted)']};
const status = m => STATUS[m?.qualified && m.status !== 'RANKED' ? 'QUALIFIED' : m?.status] || STATUS.UNRANKED;
// A score's grade by the rule both looks share (shared/grades.js): Rhythia's own letter when it sent one,
// F for a play marked as failed, otherwise the letter for the accuracy and misses.
const grade = (acc, misses, letter, failed) => RhythiaX.Grades.of({letter, accuracy: Number(acc), misses, failed});
const GRADE_C = {SS: '#fbbf24', S: '#fcd34d', A: '#86efac', B: '#60a5fa', C: '#c084fc', D: '#b45309', F: '#f87171'};
// Rhythia's titles (art in /titles/), lowest first: the RP each one needs, its colour, a shorter name where
// space is tight. Grandmaster needs a place in the top 30 as well.
const TITLES = [
  {id:'novice', name:'Novice', rp:0, c:'#7ED54F'}, {id:'expert', name:'Expert', rp:1500, c:'#04A0B6'},
  {id:'candidate_master', name:'Candidate Master', short:'Cand. Master', rp:2500, c:'#C26F38'}, {id:'master', name:'Master', rp:5000, c:'#B6463A'},
  {id:'candidate_grandmaster', name:'Candidate Grandmaster', short:'Cand. GM', rp:10000, c:'#A35BC0'}, {id:'grandmaster', name:'Grandmaster', rp:10000, c:'#A3ABB9', top:30},
];
// The title Rhythia shows next to a name: Grandmaster for 10,000 RP and a place from 1 to 30, otherwise the
// highest of the others the RP reaches (undefined for an RP below 0 or not a number).
const titleOf = (rp, position) => (rp >= 10000 && position >= 1 && position <= 30 ? TITLES[5] : TITLES.slice(0, 5).filter(t => rp >= t.rp).pop());
// Rhythia accepts social links to these sites only, over https.
const SOCIAL_HOSTS = Object.freeze(['discord.com', 'discord.gg', 't.me', 'telegram.me', 'youtube.com', 'youtu.be', 'twitch.tv', 'x.com', 'twitter.com', 'github.com', 'instagram.com', 'tiktok.com', 'facebook.com', 'steamcommunity.com']);
// A typed social link as it is saved: '' for a blank one, null when it is not an https link to one of
// SOCIAL_HOSTS (www. left out, subdomains allowed), otherwise the link written out in full.
const socialLink = value => {
  const t = String(value || '').trim();
  if (!t) return '';
  try {
    const u = new URL(t), h = u.hostname.toLowerCase().replace(/^www\./, '');
    return u.protocol === 'https:' && SOCIAL_HOSTS.some(d => h === d || h.endsWith(`.${d}`)) ? u.toString() : null;
  } catch (_) { return null; }
};
const MODES = {normal: ['Lock', 'lock.png'], spin: ['Spin', 'spincam.png'], vr: ['VR', 'vr.png']};
// Rhythia's mod art (as on its score pages). Pitch lock has no art there and is left out as well.
const MOD_ART = {mod_hardrock: ['hardrock', 'Hard Rock'], mod_nofail: ['nofail', 'No Fail'], mod_sudden_death: ['suddendeath', 'Sudden Death'], mod_auto_restart: ['aurorestart', 'Auto Restart'],
  mod_chaos: ['chaos', 'Chaos'], mod_360: ['360', '360'], mod_full_360: ['360', '360'], mod_vr: ['vr', 'Virtual Reality'], mod_spin: ['spin', 'Spin'], spin: ['spin', 'Spin'],
  mod_ghost: ['ghost', 'Ghost'], mod_mirror: ['mirrorx', 'Mirror X'], mod_mirror_y: ['mirrory', 'Mirror Y']};
const SPEED_ART = {'0.75': 'minusminusminus', '0.80': 'minusminus', '0.87': 'minus', '1.15': 'plus', '1.25': 'plusplus', '1.35': 'plusplusplus', '1.45': 'plusplusplusplus'};
const SPEED_C = {'1.45': 'var(--sp145)', '1.35': 'var(--sp135)', '1.25': 'var(--sp125)', '1.15': 'var(--sp115)', '0.87': 'var(--sp087)', '0.80': 'var(--sp080)', '0.75': 'var(--sp075)'};
function mods(s) {
  const out = [], k = Number(s.speed || 1).toFixed(2), list = s.mods || [];
  if (k !== '1.00') out.push(`<span class="mc spdc" style="--c:${SPEED_C[k] || 'var(--sp100)'}" data-tip="<b>Speed ${k}×</b><small>Mod</small>">${SPEED_ART[k] ? `<img src="${SITE}/modspeed${SPEED_ART[k]}.png" alt="${k}×">` : `${k}×`}</span>`);
  const both = list.includes('mod_mirror') && list.includes('mod_mirror_y');
  const keys = list.filter(m => !(both && (m === 'mod_mirror' || m === 'mod_mirror_y'))).filter(m => MOD_ART[m]);
  if (both) keys.push('mirrorxy');
  if (s.spin && !list.includes('mod_spin') && !list.includes('spin')) keys.push('mod_spin');
  for (const m of keys) { const [art, label] = m === 'mirrorxy' ? ['mirrorxy', 'Mirror XY'] : MOD_ART[m]; out.push(`<span class="mc" data-tip="<b>${esc(label)}</b><small>Mod</small>"><img src="${SITE}/mod${art}.png" alt="${esc(label)}"></span>`); }
  return out.length ? `<span class="mods">${out.join('')}</span>` : '<span class="cap">—</span>';
}
const flag = c => c ? `<img class="v-flag" src="${SITE}/flags/${esc(c)}.svg" alt="${esc(c)}">` : '';

// ─── Country picker (leaderboards, map leaderboards) ───
const CODES = 'AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS XK YE YT ZA ZM ZW'.split(' ');
const REGION = (() => { try { return new Intl.DisplayNames(['en'], {type: 'region'}); } catch (_) { return null; } })();
const countryName = c => { try { return REGION?.of(c) || c; } catch (_) { return c; } };
let COUNTRIES = null;
// Line icons only: a globe for Global, a chevron, a check for the chosen country.
const GLOBE = '<svg class="b-globe" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3z"/></svg>';
const CHEVRON = '<svg class="b-chev" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';
const CHECK = '<svg class="b-check" viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>';
const flagImg = c => c ? `<img class="b-fl" src="${SITE}/flags/${esc(c)}.svg" alt="" data-code="${esc(c)}">` : GLOBE;
// Global and every country, searchable, the player's own country first. R: the shadow root; current() and
// mine() give the chosen and the player's country ('' is Global); pick(code) is called with a new choice;
// redraw() repaints the part that holds html(). One picker per page.
function countryPicker(R, {current, mine = () => '', pick, redraw, signal}) {
  let st = {open: false, q: '', i: -1};
  const $ = s => R.querySelector(s);
  function items() {
    COUNTRIES ||= CODES.map(c => [c, countryName(c)]).sort((a, b) => a[1].localeCompare(b[1]));
    const qq = st.q.trim().toLowerCase(), cur = current(), own = mine();
    const match = ([c, n]) => !qq || n.toLowerCase().includes(qq) || c.toLowerCase() === qq;
    const item = (c, n) => `<button type="button" role="option" class="b-cp-item" aria-selected="${cur === c}" data-flag="${esc(c)}">${flagImg(c)}<span>${esc(n)}</span>${cur === c ? CHECK : ''}</button>`;
    const head = t => `<div class="b-cp-sec">${t}</div>`;
    let out = '';
    if (!qq || 'global'.includes(qq)) out += item('', 'Global');
    if (own && match([own, countryName(own)])) out += head('Your country') + item(own, countryName(own));
    const all = COUNTRIES.filter(match);
    if (all.length) out += head(qq ? `${all.length} ${all.length === 1 ? 'country' : 'countries'}` : 'All countries') + all.map(([c, n]) => item(c, n)).join('');
    return out || '<p class="cap b-cp-none">No country matches.</p>';
  }
  function html() {
    const c = current(), label = c ? esc(countryName(c)) : 'Global';
    return `<div class="b-cp ${st.open ? 'open' : ''}"><button class="b-cp-btn" type="button" data-cp aria-haspopup="listbox" aria-expanded="${st.open}" aria-label="Country: ${label}">${flagImg(c)}<span>${label}</span>${CHEVRON}</button>${st.open ? `<div class="b-cp-pop" role="dialog" aria-label="Choose a country">
      <label class="field b-cp-q"><svg class="ico" aria-hidden="true"><use href="#i-search"/></svg><span class="sr">Search countries</span><input id="b-cp-q" type="search" placeholder="Search countries" autocomplete="off" value="${esc(st.q)}"></label>
      <div class="b-cp-list" role="listbox" id="b-cp-list">${items()}</div></div>` : ''}</div>`;
  }
  function open(v) {
    st = {open: v, q: '', i: -1};
    redraw();
    if (!v) return;
    $('#b-cp-q')?.focus();
    $('.b-cp-item[aria-selected="true"]')?.scrollIntoView({block: 'center'});
  }
  function move(step) {
    const list = [...R.querySelectorAll('.b-cp-item')];
    if (!list.length) return;
    st.i = (st.i + step + list.length) % list.length;
    list.forEach((b, i) => b.classList.toggle('on', i === st.i));
    list[st.i].scrollIntoView({block: 'nearest'});
  }
  R.addEventListener('click', e => {
    if (st.open && !e.target.closest('.b-cp')) open(false);
    if (e.target.closest('[data-cp]')) return open(!st.open);
    const f = e.target.closest('.b-cp-item[data-flag]');
    if (f) { const c = f.dataset.flag; open(false); if (c !== current()) pick(c); }
  }, {signal});
  R.addEventListener('input', e => {
    if (e.target.id !== 'b-cp-q') return;
    st.q = e.target.value; st.i = -1;
    $('#b-cp-list').innerHTML = items();
  }, {signal});
  R.addEventListener('keydown', e => {
    if (!st.open) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); return move(e.key === 'ArrowDown' ? 1 : -1); }
    if (e.key === 'Enter') { e.preventDefault(); const list = R.querySelectorAll('.b-cp-item'); (list[st.i] || (st.q ? list[0] : null))?.click(); return; }
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); open(false); $('[data-cp]')?.focus(); }
  }, {signal});
  // A flag Rhythia does not have shows its code instead.
  R.addEventListener('error', e => {
    const img = e.target;
    if (img?.tagName !== 'IMG' || !img.classList.contains('b-fl')) return;
    const b = document.createElement('b'); b.className = 'b-fl code'; b.textContent = img.dataset.code || ''; img.replaceWith(b);
  }, {capture: true, signal});
  return {html, open, get isOpen() { return st.open; }};
}

// A picture's address as a whole CSS url("…") token for a style attribute: escaped for a double-quoted
// CSS string first (backslash, quote, line breaks and other control characters), then for the attribute,
// so no address can close the string and add declarations of its own.
const cssUrl = v => esc(`url("${String(v ?? '').replace(/[\\"]/g, c => '\\' + c).replace(/[\u0000-\u001F\u007F]/g, c => `\\${c.charCodeAt(0).toString(16)} `)}")`);
const av = (url, cls = 'v-av') => `<i class="${cls}" style="background-image:${cssUrl(url || '')}"></i>`;
const accTxt = a => a == null ? '—' : `${fmt(a, 2)}%`;

// Tooltips: data-tip holds <b>…</b><small>…</small>. The browser decodes the attribute, so text that was
// escaped once is markup again; only <b>, <small> and <br> are rebuilt, everything else becomes plain text.
const TIP_TAGS = new Set(['B', 'SMALL', 'BR']);
function fillTip(el, html) {
  const copy = (from, to) => from.childNodes.forEach(n => {
    if (n.nodeType === 3) to.append(n.data);
    else if (n.nodeType === 1 && TIP_TAGS.has(n.tagName)) copy(n, to.appendChild(document.createElement(n.tagName.toLowerCase())));
    else if (n.nodeType === 1) to.append(n.textContent);
  });
  el.replaceChildren();
  copy(new DOMParser().parseFromString(String(html ?? ''), 'text/html').body, el);
}

// Tooltips: shown over anything with data-tip in the shadow root (above it, or below it near the top), gone on scroll.
function tips(R, sig) {
  const tip = R.getElementById('tip');
  const show = t => {
    fillTip(tip, t.dataset.tip); tip.classList.add('on');
    const r = t.getBoundingClientRect(), w = tip.offsetWidth, h = tip.offsetHeight;
    let y = r.top - h - 8; if (y < 64) y = r.bottom + 8;
    tip.style.left = Math.min(innerWidth - w - 8, Math.max(8, r.left + r.width / 2 - w / 2)) + 'px'; tip.style.top = y + 'px';
  };
  const hide = () => tip.classList.remove('on');
  R.addEventListener('pointerover', e => { const t = e.target.closest?.('[data-tip]'); t ? show(t) : hide(); }, sig);
  addEventListener('scroll', hide, {passive: true, ...sig});
  return {hide};
}
// A short message in the shell's #toast. The timer belongs to the toast element, so a message from one part
// of the page is never hidden early by another part's older one.
const toastTimers = new WeakMap();
function toast(R, m) {
  const t = R.getElementById('toast'); t.textContent = m; t.classList.add('on');
  clearTimeout(toastTimers.get(t)); toastTimers.set(t, setTimeout(() => t.classList.remove('on'), 2600));
}

// Tooltip, toast and Rhythia's own links/buttons, the same in every view.
function shell(R, sig) {
  const {hide} = tips(R, sig);
  const say = m => toast(R, m);
  // Rhythia's Download is a link and its Copyright Report a button; both open Rhythia's own flow.
  const native = label => {
    const el = [...document.querySelectorAll('#root a, #root button')].find(b => (b.getAttribute('aria-label') || b.textContent || '').trim() === label);
    if (el) { el.click(); return true; }
    return false;
  };
  R.addEventListener('click', e => {
    const b = e.target.closest?.('[data-native-click]');
    if (b && !native(b.dataset.nativeClick)) say('Rhythia is still loading. Try again in a moment.');
  }, sig);
  return {hide, toast: say, native};
}

// After Rhythia's own dialog (invite, edit, leave, remove) closes over a page, reload() reads the page again
// if the address is still path. start() when a button opens that dialog (a new start replaces the last one),
// stop() when the page goes; the watch gives up after ten minutes.
function watchDialog(path, reload) {
  let watch = 0;
  function start() {
    clearInterval(watch);
    let seen = false, ticks = 0;
    watch = setInterval(() => {
      const open = [...document.querySelectorAll('[role="dialog"],[role="alertdialog"]')].some(x => !x.closest('#root'));
      if (open) seen = true;
      if ((seen && !open) || ++ticks > 1200) { clearInterval(watch); if (seen && location.pathname === path) reload(); }
    }, 500);
  }
  return {start, stop: () => clearInterval(watch)};
}

// The slot Rhythia's player is laid over, with a note until it is there.
const slot = (label = 'Loading Rhythia’s player…') => `<div class="v-dock" id="v-dock"><span class="cap">${label}</span></div>`;

// What the map file says about the map: tags, the share of each kind, the density line.
const KIND = {Jump: ['Jumps', 'Long moves across the grid, spins included'], Stream: ['Streams', 'Short moves at an even speed'], Tech: ['Techs', 'Short moves at a changing speed']};
// Whole percentages that add up to 100: the parts left over by rounding go to the largest remainders.
function wholes(parts) {
  const total = parts.reduce((t, v) => t + v, 0) || 1, raw = parts.map(v => v / total * 100), out = raw.map(Math.floor);
  raw.map((v, i) => [v - out[i], i]).sort((x, y) => y[0] - x[0]).slice(0, 100 - out.reduce((t, v) => t + v, 0)).forEach(([, i]) => out[i]++);
  return out;
}
function playsHtml(a, speed = 1) {
  if (!a) return '';
  const s = a.share, tags = Kit().style(a), kinds = Object.keys(KIND).filter(k => s[k] > .005);
  const p = Object.fromEntries(wholes(kinds.map(k => s[k])).map((v, i) => [kinds[i], `${v}%`]));
  const bar = kinds.map(k => `<i class="k-${k.toLowerCase()}" style="flex:${s[k]}" data-tip="<b>${KIND[k][0]} · ${p[k]} of the notes</b><small>${KIND[k][1]}</small>"></i>`).join('');
  const at = speed !== 1 ? ` at ${fmt(speed, 2)}×` : '';
  const facts = [
    ['Notes per second' + at, fmt(a.avgNps * speed, 1), ''],
    ['Busiest second' + at, `${fmt(a.peakNps * speed, 0)} notes`, 'Most notes in any one second'],
    ['Fastest stream' + at, a.fastestStream ? `${fmt(a.fastestStream * speed, 1)} notes/s` : '—', ''],
    ['Longest stream', a.longestStream ? `${fmt((a.longestStream.end - a.longestStream.start) / 1000 / speed, 1)} s` : '—', ''],
    ['Off-grid notes', pct(a.offGrid), 'Notes away from the 3×3 grid'],
  ];
  return `<div class="v-plays">
    <div class="v-tags">${tags.map(t => `<span class="v-tag k-${t.k}" data-tip="<b>${esc(t.label)}</b><small>${esc(t.tip)}</small>">${esc(t.label)}</span>`).join('')}</div>
    <div class="v-share" aria-label="${kinds.map(k => `${KIND[k][0]} ${p[k]}`).join(', ')}">${bar}</div>
    <div class="v-legend">${kinds.map(k => `<span data-tip="<b>${KIND[k][0]}</b><small>${KIND[k][1]}</small>"><i class="k-${k.toLowerCase()}"></i>${KIND[k][0]} ${p[k]}</span>`).join('')}</div>
    <div class="v-facts">${facts.map(([l, v, t]) => `<div ${t ? `data-tip="<b>${esc(l)}</b><small>${esc(t)}</small>"` : ''}><small>${esc(l)}</small><b class="num">${v}</b></div>`).join('')}</div>
  </div>`;
}
const playsNote = 'Shares are by note count.';

// Rhythia's map preview and score replay, reached through the page-world bridge (core/bridge.js).
// The preview's speeds: half and a quarter speed for slow practice, then the game's own speed mods (SPEED_ART).
const PREVIEW_SPEEDS = [.25, .5, .75, .8, .87, 1, 1.15, 1.25, 1.35, 1.45];
// A replay plays at the speed it was played at; these slow it down from there (a 1.45× play at 0.5× runs at 0.725×).
const REPLAY_SPEEDS = [1, .75, .5];
// A speed as the game writes it: its mods with two decimals (0.80×), others as they are (0.5×).
const speedLabel = v => (Number(v).toFixed(2) in SPEED_ART ? Number(v).toFixed(2) : String(Number(v)));
function ask(op, value, extra = {}) {
  return new Promise(done => {
    const id = Math.random().toString(36).slice(2);
    const on = e => {
      let d; try { d = JSON.parse(String(e.detail)); } catch (_) { return; }
      if (d.id !== id) return;
      document.removeEventListener('rhythiax:exodus-player-state', on); clearTimeout(t); done(d);
    };
    const t = setTimeout(() => { document.removeEventListener('rhythiax:exodus-player-state', on); done({ok: false}); }, 600);
    document.addEventListener('rhythiax:exodus-player-state', on);
    document.dispatchEvent(new CustomEvent('rhythiax:exodus-player', {detail: JSON.stringify({id, op, value, ...extra})}));
  });
}

// One leaderboard row: place, player, RP, accuracy, misses, mods, when. Links to the score.
function row(x, place, me = false) {
  return `<a class="v-row ${me ? 'me' : ''}" href="/score/${esc(x.id)}">
    <span class="pos num ${place <= 3 ? 'p' + place : ''}">${fmt(place)}</span>
    <span class="who">${flag(x.flag)}${av(x.avatar)}<b>${esc(x.username)}</b>${x.clan ? `<span class="tag">${esc(x.clan.acronym)}</span>` : ''}</span>
    <span class="rp num">${fmt(x.rp)} <small>RP</small></span><span class="acc num">${accTxt(x.acc)}</span>
    <span class="mi num ${x.misses ? 'bad' : ''}">${fmt(x.misses)}<small> ✕</small></span>${mods(x)}
    <span class="at" data-tip="<b>${esc(fullDate(x.at))}</b>">${esc(ago(x.at))}</span></a>`;
}

const slugify = t => String(t).toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-');
// Markdown flattened to plain words, for search (the wiki and the changelog).
const plainText = t => String(t).replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/<[^>]+>/g, ' ').replace(/[#>*_`~|:-]/g, ' ').replace(/\s+/g, ' ').trim();

// One map in a grid of map tiles (the map list and a profile's Maps): art, difficulty and stars, the status
// when it is not Ranked, and the title on its plate.
const mapTile = (m, i) => { const [dl, dc] = diff(m.difficulty), [sl, sc] = status(m), flag = m.status !== 'RANKED' || m.qualified; return `<a class="h-map" href="/maps/${esc(m.id)}" style="--i:${Math.min(i, 24)}">
  <span class="art" style="background-image:${cssUrl(m.img)}"></span>
  <span class="chips"><span class="h-diff" style="--c:${dc}">${dl}</span><span class="h-right"><span class="h-star num">★ ${fmt(m.stars, 2)}</span>${m.typeLabel ? `<span class="h-star" title="Map type, worked out by Reimagined">${esc(m.typeLabel)}${m.quantum ? ' · Quantum' : ''}</span>` : ''}</span></span>
  ${flag || m.explicit ? `<span class="v-mflags">${flag ? `<span class="h-diff" style="--c:${sc}">${sl}</span>` : ''}${m.explicit ? '<span class="h-diff" style="--c:var(--bad)">Explicit</span>' : ''}</span>` : ''}
  <span class="plate"><b title="${esc(m.title)}">${esc(m.title)}</b><small><span>by ${esc(m.mapper || 'Unknown')}</span><span class="num">${mmss(m.length)}</span><span class="num">${fmt(m.plays)} plays</span></small></span></a>`; };

// Page numbers under a list. range ({perPage, total, noun}) names the rows shown instead of the page, as the
// leaderboard, maps, clans and skins do: "51–100 of 1,234 maps".
const pager = (p, pages, label, range) => {
  if (pages <= 1) return '';
  const nums = [...new Set([1, 2, p - 1, p, p + 1, pages - 1, pages])].filter(n => n >= 1 && n <= pages).sort((a, b) => a - b);
  const shown = range
    ? `${fmt((p - 1) * range.perPage + 1)}–${fmt(Math.min(p * range.perPage, range.total))} of ${fmt(range.total)}${range.noun ? ` ${esc(range.noun)}` : ''}`
    : `Page ${fmt(p)} of ${fmt(pages)}${label ? ` · ${label}` : ''}`;
  return `<div class="pager"><span class="num">${shown}</span><div class="pages">
    <button type="button" data-page="${p - 1}" ${p === 1 ? 'disabled' : ''} aria-label="Previous page">‹</button>
    ${nums.map((n, i) => `${i && n - nums[i - 1] > 1 ? '<span>…</span>' : ''}<button type="button" data-page="${n}" ${n === p ? 'aria-current="page"' : ''}>${fmt(n)}</button>`).join('')}
    <button type="button" data-page="${p + 1}" ${p === pages ? 'disabled' : ''} aria-label="Next page">›</button></div></div>`;
};
// A star level's colour in the difficulty spread (green for easy maps, through yellow and red, to purple).
const starC = n => (n <= 3 ? '#22c55e' : n <= 5 ? '#eab308' : n <= 7 ? '#ef4444' : n <= 9 ? '#e11d48' : '#c084fc');
function spreadHtml(counts, big = false) {
  const top = Math.max(1, ...counts), last = Math.max(14, counts.reduce((m, c, i) => (c ? i + 1 : m), 0));
  return `<span class="c-spread ${big ? 'big' : ''}" aria-label="Maps by star rating">${Array.from({length: last}, (_, i) => `<span data-tip="<b>★ ${i + 1}–${i + 2}</b><small>${fmt(counts[i] || 0)} ${counts[i] === 1 ? 'map' : 'maps'}</small>"><i style="height:${((counts[i] || 0) / top) * 100}%;--c:${starC(i + 1)}"></i><em>${i + 1}</em></span>`).join('')}</span>`;
}
const hoursMin = ms => { const m = Math.round((ms || 0) / 60000); return m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m} min`; };
// Pictures that no longer load (old Discord links in entries) are left out, as if they were not there.
const dropBroken = (R, sig) => R.addEventListener('error', e => { if (e.target?.tagName === 'IMG' && e.target.closest('.md')) e.target.remove(); }, {capture: true, ...sig});
const avgStars = counts => { const n = counts.reduce((s, c) => s + c, 0); return n ? counts.reduce((s, c, i) => s + c * (i + 1), 0) / n : 0; };

// morph(el, html): brings el's content in line with html in place. Elements that stay keep
// their identity, so pictures do not load again, entrance animations do not play again,
// and focus, typed text and scroll positions stay. Classes that scripts add later
// (reveal, entrance, docking) are kept once an element has them.
const KEEP_CLASSES = ['in', 'enter', 'anim', 'docked', 'settled'];
const sameNode = (a, b) => a.nodeType === b.nodeType && a.nodeName === b.nodeName && (a.nodeType !== 1 || (a.id || '') === (b.id || ''));
function morphChildren(from, to) {
  let a = from.firstChild, b = to.firstChild;
  while (b) {
    const nb = b.nextSibling;
    if (!a) from.appendChild(b);
    else if (sameNode(a, b)) { morphNode(a, b); a = a.nextSibling; }
    else { const na = a.nextSibling; from.replaceChild(b, a); a = na; }
    b = nb;
  }
  while (a) { const na = a.nextSibling; from.removeChild(a); a = na; }
}
function morphNode(a, b) {
  if (a.nodeType !== 1) { if (a.nodeValue !== b.nodeValue) a.nodeValue = b.nodeValue; return; }
  for (const {name, value} of [...b.attributes]) {
    let v = value;
    if (name === 'class') { const kept = KEEP_CLASSES.filter(c => a.classList.contains(c) && !b.classList.contains(c)); if (kept.length) v = `${value} ${kept.join(' ')}`; }
    if (a.getAttribute(name) !== v) a.setAttribute(name, v);
  }
  for (const {name} of [...a.attributes]) {
    if (b.hasAttribute(name) || name === 'open') continue;
    if (name === 'class') { const kept = KEEP_CLASSES.filter(c => a.classList.contains(c)); if (kept.length) { a.setAttribute('class', kept.join(' ')); continue; } }
    a.removeAttribute(name);
  }
  const focused = a.getRootNode().activeElement === a;
  if (a.nodeName === 'INPUT') {
    if (!focused && a.value !== (b.getAttribute('value') ?? '')) a.value = b.getAttribute('value') ?? '';
    a.checked = b.hasAttribute('checked');
    return;
  }
  if (a.nodeName === 'TEXTAREA') { if (!focused) a.value = b.textContent; return; }
  morphChildren(a, b);
  if (a.nodeName === 'SELECT') { const o = [...a.options].find(x => x.hasAttribute('selected')); if (o) a.value = o.value; }
}
function morph(el, html) {
  if (!el) return;
  const t = document.createElement('template');
  t.innerHTML = html;
  morphChildren(el, t.content);
}
// The same for one element and its own markup (what outerHTML = … would replace).
morph.outer = (el, html) => {
  if (!el) return;
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  const n = t.content.firstElementChild;
  if (n && t.content.childNodes.length === 1 && sameNode(el, n)) morphNode(el, n); else el.replaceWith(t.content);
};


const pages = RhythiaX.ExodusPages = RhythiaX.ExodusPages || {};
const styles = [];
const page = (name, view, css) => { pages[name] = view; if (css) styles.push(css); };

const css = `
/* Shared by the list pages: the map tiles (home, maps, collections), the page head and switch (leaderboard,
   maps, clans, skins, collections, wiki, changelog), the dialogs and the side list (wiki, changelog). */
/* A small form or confirm in the shell's #cmp dialog (collections, clans) */
dialog.cmp.cd-dlg{width:min(480px,calc(100vw - 32px))}
.cd-body{display:flex;flex-direction:column;gap:16px}
.cd-body p{margin:0;line-height:1.6;color:var(--text-2)}
.cd-field{display:flex;flex-direction:column;gap:6px;font-size:13px;font-weight:650}
.cd-field input,.cd-field textarea{padding:10px 12px;border:0;border-radius:10px;font:inherit;font-weight:400;color:var(--text);background:var(--field);box-shadow:inset 0 0 0 1px var(--line-2)}
.cd-field textarea{resize:vertical;min-height:90px}
.cd-field input:focus,.cd-field textarea:focus{outline:2px solid var(--accent);outline-offset:0}
.cd-switch span{display:flex;flex-direction:column}
.cd-acts{display:flex;justify-content:flex-end;gap:8px}
.h-maps{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px}
.h-map{position:relative;display:block;aspect-ratio:4/3.2;border-radius:16px;overflow:hidden;background:var(--panel-2);isolation:isolate;box-shadow:inset 0 0 0 1px var(--line);content-visibility:auto;contain-intrinsic-size:auto 240px}
.h-map .art{position:absolute;inset:0;z-index:-1;background:center/cover;transition:transform .7s var(--ease)}
.h-map:hover .art{transform:scale(1.06)}
.h-map .chips{position:absolute;top:10px;left:10px;right:10px;display:flex;justify-content:space-between;gap:6px}
.h-diff,.h-star{display:inline-flex;align-items:center;height:24px;padding:0 9px;border-radius:4px;font-size:12px;font-weight:700;background:rgba(10,11,14,.84);color:#f4f5f7}
.h-diff{gap:7px;box-shadow:inset 0 0 0 1px rgba(255,255,255,.14)}
.h-diff{padding-left:0;overflow:hidden}
.h-diff::before{content:"";flex:none;align-self:stretch;width:6px;background:var(--c)}
.h-map .h-right{display:flex;flex-direction:column;align-items:flex-end;gap:6px;min-width:0}
.h-diff,.h-star{white-space:nowrap}
.h-map .plate{position:absolute;left:8px;right:8px;bottom:8px;display:flex;flex-direction:column;gap:3px;padding:10px 12px;border-radius:11px;background:rgba(10,11,14,.8);color:#f4f5f7}
.h-map .plate b{font-size:14.5px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.h-map .plate small{display:flex;gap:10px;font-size:12px;color:#b8c0cc;white-space:nowrap}
.h-map .plate small span:first-child{min-width:0;overflow:hidden;text-overflow:ellipsis}
@media (max-width:1000px){.h-maps{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media (max-width:560px){.h-maps{grid-template-columns:1fr}}
@keyframes hRise{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
.b-head{display:flex;align-items:flex-end;justify-content:space-between;gap:24px;flex-wrap:wrap;padding-top:48px}
.b-title{display:flex;align-items:center;gap:22px;min-width:0}
.b-mascot{width:96px;height:96px;object-fit:contain;flex:none}
.b-title h1{margin:4px 0 0;font-size:clamp(28px,3.4vw,40px);line-height:1.1;font-weight:800;letter-spacing:-.03em}
.b-title p{margin:8px 0 0;font-size:15px;color:var(--muted)}
.b-switch{display:inline-flex;align-items:center;gap:10px;margin-left:auto;font-weight:600;color:var(--text-2);cursor:pointer;user-select:none}
.b-switch input{position:absolute;opacity:0;pointer-events:none}
.b-switch i{position:relative;width:38px;height:22px;border-radius:999px;background:var(--panel-3);box-shadow:inset 0 0 0 1px var(--line-2);transition:background-color .2s}
.b-switch i::after{content:"";position:absolute;top:3px;left:3px;width:16px;height:16px;border-radius:50%;background:var(--text);transition:transform .25s var(--ease)}
.b-switch input:checked + i{background:var(--accent)}
.b-switch input:checked + i::after{transform:translateX(16px);background:#fff}
.b-switch input:focus-visible + i{outline:2px solid var(--accent);outline-offset:2px}
.b-page.enter .b-head{animation:exoEnter .6s var(--ease) both}
@media (max-width:900px){.b-switch{margin-left:0}}
@media (max-width:560px){.b-mascot{display:none}}
@media (prefers-reduced-motion:reduce){.b-page.enter *{animation:none!important}}
.cmp-head{flex:none}
.cmp-body{flex:1 1 auto;min-height:0;max-height:none;overscroll-behavior:contain}
.cmp-body .radar{justify-content:center}
.w-gt{display:block;margin:0 0 6px 10px;font-size:11.5px;font-weight:750;letter-spacing:.06em;text-transform:uppercase;color:var(--muted)}
.w-toc{position:sticky;top:84px;display:flex;flex-direction:column;gap:2px;max-height:calc(100vh - 100px);overflow:auto}
.w-toc a{display:flex;align-items:center;gap:8px;padding:5px 10px;border-radius:7px;font-size:13px;color:var(--text-2)}
.w-toc a:hover{color:var(--text);background:var(--panel-2)}
/* A failed play's grade (the base sheet has no F) and a brown D, so D does not read as the red of F. */
.exo{--g-F:var(--bad);--g-D:#c2814d}
.exo[data-theme="white"]{--g-D:#9a5b2e}
.brand .re{animation-iteration-count:3}
.v-hero{position:relative;padding:56px 0 0;isolation:isolate;overflow:hidden}
.v-banner{position:absolute;inset:0 0 auto;height:340px;z-index:-1;background:center/cover;opacity:.32;filter:blur(18px) saturate(1.1);transform:scale(1.08);-webkit-mask:linear-gradient(#000 30%,transparent);mask:linear-gradient(#000 30%,transparent)}
.v-hero-in{display:flex;align-items:center;gap:32px;min-width:0}
.v-who{min-width:0;flex:1}
.v-who h1{margin:6px 0 0;font-size:clamp(26px,3.2vw,40px);line-height:1.12;font-weight:800;letter-spacing:-.03em;overflow-wrap:anywhere}
.v-who h1 a:hover{color:var(--accent-2)}
.v-by{display:flex;flex-wrap:wrap;align-items:center;gap:6px 16px;margin:12px 0 0;color:var(--text-2);font-size:14px}
.v-by a{font-weight:650;color:var(--text)}
.v-by a:hover{color:var(--accent-2)}
.v-player{display:inline-flex;align-items:center;gap:8px}
.v-av{display:inline-block;width:28px;height:28px;border-radius:50%;flex:none;background:var(--panel-3) center/cover}
.v-av.lg{width:48px;height:48px;border-radius:14px}
.v-chips{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin-top:14px}
.v-hero.map .v-chips{margin:0}
/* Chips look like the outline buttons: the page text on a quiet plate, the colour only in a bar down the left edge. */
.v-chip{display:inline-flex;align-items:center;gap:8px;height:28px;padding:0 11px;border-radius:4px;font-size:12.5px;font-weight:600;color:var(--text);background:rgba(var(--glass),.55);box-shadow:inset 0 0 0 1px var(--rule-2)}
.v-chip,.v-tag{padding-left:0;overflow:hidden}
.v-chip::before,.v-tag::before{content:"";flex:none;align-self:stretch;width:6px;background:var(--c)}
.v-chip.plain{color:var(--text-2)}
.v-chip.plain{padding-left:11px}
.v-chip.plain::before{display:none}
.v-chip img{width:15px;height:15px;object-fit:contain}
[data-theme="white"] .v-chip img{filter:invert(1)}
.v-cover{width:150px;height:150px;flex:none;border-radius:22px;background:var(--panel-3) center/cover;box-shadow:0 0 0 1px var(--line-2),0 20px 50px rgba(0,0,0,calc(.35 * var(--sh)))}
.v-act{display:flex;flex-wrap:wrap;gap:8px;margin-top:18px}
.v-ring{position:relative;width:150px;height:150px;flex:none}
.v-ring svg{width:100%;height:100%;transform:rotate(-90deg)}
.v-ring circle{fill:none;stroke-width:9}
.v-ring .bg{stroke:var(--panel-3)}
.v-ring .fg{stroke:var(--g);stroke-linecap:round;transition:stroke-dashoffset 1.1s var(--ease)}
.v-ring > span{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center}
.v-ring b{font-size:44px;font-weight:850;line-height:1;color:var(--g);letter-spacing:-.03em}
.v-ring small{margin-top:4px;font-size:13px;color:var(--text-2);font-weight:650}
.v-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));margin-top:32px;border-top:1px solid var(--line);border-bottom:1px solid var(--line)}
.v-kpis > div{padding:16px 20px;border-left:1px solid var(--line)}
.v-kpis > div:first-child{border-left:0;padding-left:2px}
.v-kpis small{display:block;font-size:12.5px;font-weight:600;color:var(--muted)}
.v-kpis b{display:block;margin-top:4px;font-size:24px;font-weight:800;letter-spacing:-.02em}
.v-kpis b span{font-size:14px;font-weight:600;color:var(--muted)}
.v-kpis b.bad,.v-row .bad{color:var(--bad)}
.v-hero.enter .v-hero-in{animation:exoEnter .55s var(--ease) both}
.v-hero.enter .v-kpis{animation:exoEnter .55s var(--ease) .08s both}
.v-page.enter .v-sec{animation:exoEnter .55s var(--ease) both}
.v-page.enter .v-sec:nth-child(2){animation-delay:.06s}.v-page.enter .v-sec:nth-child(3){animation-delay:.12s}
.v-sec{margin-top:52px}
.v-sec .sec-head{margin-bottom:18px}
.v-sec h2{margin:0;font-size:20px;font-weight:750;letter-spacing:-.01em}
.v-more{font-weight:650;color:var(--accent-2);font-size:14px}
.v-more:hover{text-decoration:underline;text-underline-offset:3px}
.v-sk{padding-top:48px}
.v-cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px}
.v-card{display:flex;flex-direction:column;gap:6px;min-width:0;padding:18px 20px;border-radius:16px;background:var(--panel);box-shadow:inset 0 0 0 1px var(--line)}
.v-card > small{font-size:12.5px;font-weight:600;color:var(--muted)}
.v-card strong{font-size:24px;font-weight:800;letter-spacing:-.02em;line-height:1.15}
.v-card strong.good{color:var(--good)}
.v-card > span{font-size:13.5px;color:var(--text-2)}
.v-card > span a{font-weight:650;color:var(--accent-2)}
.v-card p{margin:2px 0 0}
.v-mini{display:flex;align-items:center;gap:8px;margin-top:6px;padding:8px 10px;border-radius:10px;background:var(--panel-2);min-width:0}
.v-mini b{font-weight:650;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.v-mini span{margin-left:auto;font-size:12.5px;color:var(--text-2);white-space:nowrap}
.v-mini:hover b{color:var(--accent-2)}
[data-variant="lines"] .v-cards{gap:0;border-top:1px solid var(--rule);border-bottom:1px solid var(--rule)}
[data-variant="lines"] .v-card{background:none;box-shadow:none;border-radius:0;border-left:1px solid var(--rule)}
[data-variant="lines"] .v-card:first-child{border-left:0;padding-left:2px}
.v-dock{position:relative;display:grid;place-items:center;min-height:240px;aspect-ratio:16/9;border-radius:14px;background:var(--panel-2);box-shadow:inset 0 0 0 1px var(--line)}
.v-dock.docked{aspect-ratio:auto;min-height:0;background:none;box-shadow:none}
.v-dock.docked > span{display:none}
.v-plays{display:flex;flex-direction:column;gap:14px}
.v-tags{display:flex;flex-wrap:wrap;gap:6px}
.v-tag{display:inline-flex;align-items:center;gap:8px;height:30px;padding:0 12px 0 0;border-radius:4px;font-size:13px;font-weight:600;color:var(--text);background:rgba(var(--glass),.55);box-shadow:inset 0 0 0 1px var(--rule-2)}
.k-jump{--c:#f59e0b}.k-stream{--c:#38bdf8}.k-tech{--c:#f472b6}.k-other{--c:#a78bfa}.k-quantum{--c:#34d399}.k-stamina{--c:#818cf8}
.v-pbar{display:flex;align-items:center;flex-wrap:wrap;gap:8px 14px;margin-top:14px}
.v-pbar[hidden]{display:none}
.v-pbar .pills{height:40px;padding:3px;align-items:stretch;flex-wrap:wrap}
.v-pbar .pills button{height:auto;padding:0 11px}
[data-theme="white"] .k-stamina{--c:#4f46e5}[data-theme="white"] .k-jump{--c:#d97706}[data-theme="white"] .k-stream{--c:#0284c7}[data-theme="white"] .k-tech{--c:#db2777}[data-theme="white"] .k-other{--c:#7c3aed}[data-theme="white"] .k-quantum{--c:#059669}
.v-share{display:flex;gap:3px;height:12px;border-radius:6px;overflow:hidden}
.v-share i{display:block;background:var(--c);min-width:3px}
.v-legend{display:flex;flex-wrap:wrap;gap:6px 18px;font-size:13px;font-weight:600;color:var(--text-2)}
.v-legend span{display:inline-flex;align-items:center;gap:7px}
.v-legend i{width:10px;height:10px;border-radius:3px;background:var(--c)}
.v-facts{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px}
.v-facts > div{padding:12px 14px;border-radius:12px;background:var(--panel);box-shadow:inset 0 0 0 1px var(--line)}
.v-facts small{display:block;font-size:12px;font-weight:600;color:var(--muted)}
.v-facts b{display:block;margin-top:3px;font-size:19px;font-weight:800}
[data-variant="lines"] .v-facts > div{background:none;box-shadow:none;border-radius:0;border-left:2px solid var(--rule-2);padding:4px 0 4px 14px}
.v-zl{position:relative;margin-top:16px}
.v-zl svg{display:block;width:100%;height:60px}
.v-zl polygon{fill:var(--muted);opacity:.25}
.v-zr{position:relative;height:14px;margin-top:2px;border-radius:5px;background:var(--panel-2);overflow:hidden}
.v-zr button{position:absolute;top:0;bottom:0;padding:0;border:0;background:var(--c);opacity:.85;cursor:pointer;transition:opacity .15s}
.v-zr button:hover{opacity:1;outline:2px solid var(--text);outline-offset:-2px}
.v-zt{display:flex;justify-content:space-between;margin-top:4px;font-size:11.5px;color:var(--muted)}
.v-about p{margin:0;max-width:80ch;line-height:1.65;color:var(--text-2)}
.v-tagrow{display:flex;flex-wrap:wrap;gap:6px;margin-top:12px}
/* Country picker (countryPicker) */
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
.v-bctl{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.v-bctl .b-cp-btn{min-width:180px;height:36px}
.v-bctl .b-cp-pop{left:auto;right:0}
.v-top{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:12px;margin-bottom:14px}
.v-trophy{display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:6px 14px;padding:14px 18px;border-radius:16px;background:linear-gradient(100deg,rgba(234,179,8,.14),rgba(234,179,8,.03) 60%);box-shadow:inset 0 0 0 1px rgba(234,179,8,.35)}
.v-trophy > small{grid-column:1/-1;font-size:11.5px;font-weight:750;letter-spacing:.05em;text-transform:uppercase;color:#eab308}
.v-trophy b{display:block;font-size:16px;font-weight:750}
.v-trophy > span{font-size:18px;font-weight:800}
.v-trophy:hover b{color:var(--accent-2)}
[data-theme="white"] .v-trophy > small{color:#a16207}
.v-mine{display:flex;flex-direction:column;gap:4px;padding:12px 14px;border-radius:16px;background:var(--panel);box-shadow:inset 0 0 0 1px var(--line)}
.v-mine > small{font-size:12px;font-weight:650;color:var(--muted)}
.v-table{padding:6px 10px;transition:opacity .2s}
.v-table.busy{opacity:.6;transition:opacity .2s .35s}
[data-variant="lines"] .v-table{padding:0}
.v-cols,.v-row{display:grid;grid-template-columns:44px minmax(0,1fr) 84px 84px 64px 150px 110px;align-items:center;gap:12px}
.v-cols{padding:10px 12px;font-size:12px;font-weight:600;color:var(--muted);border-bottom:1px solid var(--line)}
.v-row{position:relative;padding:9px 12px;border-radius:10px;transition:background-color .15s}
.v-row + .v-row{box-shadow:0 -1px 0 var(--line)}
.v-row:hover{background:rgba(var(--ink),.045)}
.v-row.me{background:var(--accent-soft)}
.v-row .pos{font-weight:750;color:var(--muted);text-align:center}
.v-row .pos.p1{color:#e2b43a}.v-row .pos.p2{color:#b6c0cd}.v-row .pos.p3{color:#d08a5c}
.v-row .who{display:flex;align-items:center;gap:9px;min-width:0}
.v-row .who b{font-weight:650;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.v-row .tag{flex:none;padding:1px 6px;border-radius:5px;font-size:11px;font-weight:700;color:var(--muted);box-shadow:inset 0 0 0 1px var(--line-2)}
.v-row .rp{font-weight:750}
.v-row small{font-size:11px;color:var(--muted);font-weight:600}
.v-row .at{font-size:12.5px;color:var(--muted);text-align:right}
.v-row .mods{justify-self:start}
/* Rhythia's mod art carries its own frame, so the icons sit bare: no pill, no tint, no dividers around them. */
.mods{gap:4px;align-items:center;border-radius:0;background:none;overflow:visible}
.mc{padding:0}
.mc + .mc{box-shadow:none}
.spdc:has(img){background:none;padding:0}
.spdc:not(:has(img)){align-self:stretch;padding:0 7px;border-radius:7px}
.v-flag{width:20px;border-radius:2px;flex:none}
.v-gap{padding:2px 12px;color:var(--muted)}
.v-mine .v-row{grid-template-columns:44px minmax(0,1fr) 84px 84px;padding:6px 4px}
.v-mine .v-row > .mi,.v-mine .v-row > .mods,.v-mine .v-row > .at{display:none}
.v-moreb{display:flex;justify-content:center;margin-top:14px}
.v-form{display:flex;flex-direction:column;gap:10px;margin-bottom:18px}
.v-form textarea{width:100%;min-height:90px;padding:12px 14px;border:0;border-radius:12px;background:var(--field);box-shadow:inset 0 0 0 1px var(--line-2);color:var(--text);font:inherit;resize:vertical;outline:none}
.v-form textarea:focus{box-shadow:inset 0 0 0 1px var(--accent)}
.v-form > div{display:flex;align-items:center;justify-content:space-between;gap:12px}
.v-form.out{flex-direction:row;align-items:center;justify-content:space-between;padding:14px 16px;border-radius:12px;background:var(--panel)}
.v-coms{display:flex;flex-direction:column;gap:10px}
.v-com{display:grid;grid-template-columns:auto minmax(0,1fr);gap:12px;padding:14px 16px;border-radius:14px;background:var(--panel);box-shadow:inset 0 0 0 1px var(--line)}
.v-com .v-av{width:36px;height:36px}
.v-com header{display:flex;align-items:baseline;gap:10px}
.v-com header b{font-weight:700}
.v-com header a:hover b{color:var(--accent-2)}
.v-com p{margin:4px 0 0;line-height:1.55;color:var(--text-2);overflow-wrap:anywhere}
[data-variant="lines"] .v-com{background:none;box-shadow:none;border-radius:0;border-top:1px solid var(--rule);padding:14px 0}
.v-maps-links{display:flex;gap:8px}
.v-mbar{display:flex;flex-direction:column;gap:12px;margin-top:32px;padding-top:16px;padding-bottom:16px;position:relative}
.v-mbar::before,.v-mbar::after{content:"";position:absolute;left:24px;right:24px;height:1px;background:var(--line)}
.v-mbar::before{top:0}.v-mbar::after{bottom:0}
.v-mrow{display:flex;flex-wrap:wrap;align-items:center;gap:10px 18px}
.v-mq{flex:1 1 280px;height:42px}
.v-mq input,.v-adv input{flex:1;min-width:0;border:0;background:none;color:var(--text);font:inherit;outline:none}
.v-adv .field{flex:1 1 200px;height:40px}
.v-mbar .b-switch{margin-left:0}
.v-mbar .b-switch span{display:flex;flex-direction:column;line-height:1.2}
.v-mbar .b-switch small{font-size:11.5px;font-weight:500;color:var(--muted)}
.v-mbar .pills{height:auto;min-height:40px;padding:3px;align-items:stretch;flex-wrap:wrap}
.v-mbar .pills button{height:auto;min-height:34px}
.v-mpills{align-items:stretch}
.v-mpills .btn{height:auto}
.v-buckets button{flex-direction:column;gap:0;padding:4px 12px;line-height:1.15}
.v-buckets button b{font-size:13px}
.v-buckets button small{font-size:11px;font-weight:600;opacity:.8}
.v-dir{width:40px;padding:0}
.v-dir svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.v-advb[aria-expanded="true"]{box-shadow:inset 0 0 0 1px var(--accent)}
.v-mlist{margin-top:28px}
.v-mgrid{transition:opacity .2s}
.v-mgrid.busy{opacity:.6;transition:opacity .2s .35s}
.v-mgrid.anim .h-map{animation:hRise .5s var(--ease) both;animation-delay:calc(var(--i) * 25ms)}
.v-mflags{position:absolute;top:40px;left:10px;display:flex;gap:6px}
.v-mview{align-self:flex-start}
.v-msort{display:flex;gap:10px;align-items:stretch}
.v-tmapper{flex:0 1 220px;height:42px}
.v-tmapper input{flex:1;min-width:0;border:0;background:none;color:var(--text);font:inherit;outline:none}
.v-tnote{margin:0;padding:14px 18px;border-radius:12px;background:var(--panel);box-shadow:inset 0 0 0 1px var(--line);color:var(--text-2);font-size:13.5px;line-height:1.55}
.v-tnote p{display:flex;flex-wrap:wrap;align-items:baseline;gap:4px 10px;margin:0 0 6px}
.v-tnote p b{color:var(--text);font-size:14.5px;font-weight:700}
.v-tnote ul{margin:0;padding-left:18px}
.v-tnote li::marker{color:var(--muted)}
.v-thidden{margin:0 0 14px;color:var(--muted);font-size:13px}
.v-tneed{max-width:560px;margin:40px auto;display:flex;flex-direction:column;align-items:center;gap:10px;text-align:center}
.v-tneed b{font-size:17px}
.v-tneed p{margin:0 0 6px;color:var(--muted);font-size:13.5px;line-height:1.55;text-wrap:balance}
.v-tneed .btn{color:var(--text);background:var(--panel-2);box-shadow:inset 0 0 0 1px var(--line-2)}
.v-notice{max-width:680px;margin:24px auto;padding:24px 26px;border-radius:16px;background:var(--panel);box-shadow:inset 0 0 0 1px rgba(251,191,36,.3)}
.v-notice h2{margin:0 0 12px;font-size:21px}
.v-notice p{margin:0 0 10px;color:var(--text-2);line-height:1.6}
.v-notice a{color:var(--accent-2);font-weight:650}
.v-notice .btn{margin-top:10px}
.v-owner{display:inline-flex;align-items:center;gap:6px;height:40px;padding:0 4px 0 14px;border-radius:11px;background:var(--accent-soft);color:var(--text-2);font-size:13.5px}
.v-owner b{color:var(--text)}
.v-owner .iconbtn{width:32px;height:32px}
.v-mbar .v-bgp{margin-left:auto}
@media (max-width:1000px){.v-cols,.v-row{grid-template-columns:40px minmax(0,1fr) 70px 76px 110px}.v-cols span:nth-child(5),.v-cols span:nth-child(7),.v-row .mi,.v-row .at{display:none}}
@media (max-width:640px){.v-hero-in{flex-direction:column;align-items:flex-start;gap:20px}.v-ring,.v-cover{width:112px;height:112px}.v-ring b{font-size:34px}.v-kpis > div{padding:12px 14px}.v-kpis > div:nth-child(odd){border-left:0;padding-left:2px}.v-kpis{grid-template-columns:1fr 1fr}
  .v-cols,.v-row{grid-template-columns:32px minmax(0,1fr) 62px 70px;gap:8px}.v-cols span:nth-child(6),.v-row .mods,.v-row .tag,.v-row .v-flag{display:none}.v-maps-links{width:100%}.v-mrow > *{max-width:100%}.v-buckets{width:100%}.v-buckets button{flex:1 1 auto}}
@media (prefers-reduced-motion:reduce){.v-hero.enter *,.v-page.enter *,.v-mgrid.anim .h-map{animation:none!important}}
`;

return {SITE, Data, Kit, esc, cssUrl, fillTip, fmt, pct, REDUCED, when, ago, fullDate, mmss, diff, status, grade, GRADE_C, TITLES, titleOf, SOCIAL_HOSTS, socialLink, MODES, mods, flag, countryName, countryPicker, av, accTxt, tips, toast, shell, watchDialog, slot, playsHtml, playsNote, PREVIEW_SPEEDS, REPLAY_SPEEDS, speedLabel, ask, row, slugify, plainText, mapTile, pager, spreadHtml, hoursMin, dropBroken, avgStars, morph, page, get css() { return css + styles.join(''); }};
})();
