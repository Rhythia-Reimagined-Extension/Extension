// =============================================
// Reimagined for Rhythia — Exodus kit
// =============================================
// What the Exodus pages share: formatting, Rhythia's difficulty and status names, mod art,
// the tooltip/toast shell, the map-file summary, one score row, a pager, and morph(),
// which brings a part of the page up to date in place instead of drawing it again.
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
const STATUS = {RANKED: ['Ranked', '#60a5fa'], QUALIFIED: ['Qualified', '#a78bfa'], UNRANKED: ['Unranked', 'var(--muted)']};
const status = m => STATUS[m?.qualified && m.status !== 'RANKED' ? 'QUALIFIED' : m?.status] || STATUS.UNRANKED;
const grade = (acc, misses) => misses === 0 && acc >= 100 ? 'SS' : acc >= 98 ? 'S' : acc >= 95 ? 'A' : acc >= 93 ? 'B' : acc >= 90 ? 'C' : 'D';
const GRADE_C = {SS: '#fbbf24', S: '#fcd34d', A: '#86efac', B: '#60a5fa', C: '#c084fc', D: '#f87171'};
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
const av = (url, cls = 'v-av') => `<i class="${cls}" style="background-image:url('${esc(url || '')}')"></i>`;
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

// Tooltip, toast and Rhythia's own links/buttons, the same in every view.
function shell(R, sig, ctx) {
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
  const toast = m => { const t = R.getElementById('toast'); t.textContent = m; t.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('on'), 2600); };
  // Rhythia's Download is a link and its Copyright Report a button; both open Rhythia's own flow.
  const native = label => {
    const el = [...document.querySelectorAll('#root a, #root button')].find(b => (b.getAttribute('aria-label') || b.textContent || '').trim() === label);
    if (el) { el.click(); return true; }
    return false;
  };
  R.addEventListener('click', e => {
    const b = e.target.closest?.('[data-native-click]');
    if (b && !native(b.dataset.nativeClick)) toast('Rhythia is still loading. Try again in a moment.');
  }, sig);
  return {hide, toast, native};
}

// The slot Rhythia's player is laid over, with a note until it is there.
const slot = (label = 'Loading Rhythia’s player…') => `<div class="v-dock" id="v-dock"><span class="cap">${label}</span></div>`;

// What the map file says about the map: tags, the share of each kind, the density line.
const KIND = {Stream: ['Streams', 'Runs of six or more fast notes (150 ms apart or closer at 1×) with an even rhythm'], Jump: ['Jumps', 'Slower notes that move a cell or more'], Other: ['Other', 'Slower notes with small moves']};
function playsHtml(a, speed = 1) {
  if (!a) return '';
  const s = a.share, tags = Kit().style(a), kinds = Object.keys(KIND).filter(k => s[k] > .005);
  const bar = kinds.map(k => `<i class="k-${k.toLowerCase()}" style="flex:${s[k]}" data-tip="<b>${KIND[k][0]} · ${pct(s[k])} of the notes</b><small>${KIND[k][1]}</small>"></i>`).join('');
  const at = speed !== 1 ? ` at ${fmt(speed, 2)}×` : '';
  const facts = [
    ['Notes per second' + at, fmt(a.avgNps * speed, 1), 'Average over the whole map'],
    ['Busiest second' + at, `${fmt(a.peakNps * speed, 0)} notes`, 'Most notes inside any one second'],
    ['Fastest stream' + at, a.fastestStream ? `${fmt(a.fastestStream * speed, 1)} notes/s` : '—', 'The quickest stream section, in notes per second'],
    ['Longest stream', a.longestStream ? `${fmt((a.longestStream.end - a.longestStream.start) / 1000 / speed, 1)} s` : '—', 'The longest unbroken stream section'],
  ];
  return `<div class="v-plays">
    <div class="v-tags">${tags.map(t => `<span class="v-tag k-${t.k}" data-tip="<b>${esc(t.label)}</b><small>${esc(t.tip)}</small>">${esc(t.label)}</span>`).join('')}</div>
    <div class="v-share" aria-label="${kinds.map(k => `${KIND[k][0]} ${pct(s[k])}`).join(', ')}">${bar}</div>
    <div class="v-legend">${kinds.map(k => `<span data-tip="<b>${KIND[k][0]}</b><small>${KIND[k][1]}</small>"><i class="k-${k.toLowerCase()}"></i>${KIND[k][0]} ${pct(s[k])}</span>`).join('')}${a.offGrid >= .005 ? `<span class="v-off" data-tip="<b>Off-grid notes</b><small>Notes away from the positions this map uses for its grid</small>">Off-grid notes ${pct(a.offGrid)}</span>` : ''}</div>
    <div class="v-facts">${facts.map(([l, v, t]) => `<div data-tip="<b>${esc(l)}</b><small>${esc(t)}</small>"><small>${esc(l)}</small><b class="num">${v}</b></div>`).join('')}</div>
  </div>`;
}
const playsNote = 'Read from the map file. Shares count notes; hover a part for how it is decided.';

// Rhythia's map preview, reached through the page-world bridge (exodus-bridge.js).
const PREVIEW_SPEEDS = [.25, .5, .75, 1, 1.25, 1.5, 1.75, 2];
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

const pager = (p, pages, label) => {
  if (pages <= 1) return '';
  const nums = [...new Set([1, 2, p - 1, p, p + 1, pages - 1, pages])].filter(n => n >= 1 && n <= pages).sort((a, b) => a - b);
  return `<div class="pager"><span class="num">Page ${fmt(p)} of ${fmt(pages)}${label ? ` · ${label}` : ''}</span><div class="pages">
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
  if (a.hasAttribute('data-keep')) return;
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
.v-chip{display:inline-flex;align-items:center;gap:6px;height:26px;padding:0 10px;border-radius:8px;font-size:12.5px;font-weight:700;color:var(--c);background:color-mix(in srgb,var(--c) 12%,transparent);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--c) 40%,transparent)}
.v-chip.plain{--c:var(--text-2);background:var(--panel-2);box-shadow:inset 0 0 0 1px var(--line)}
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
.v-tag{display:inline-flex;align-items:center;height:28px;padding:0 12px;border-radius:9px;font-size:13px;font-weight:700;color:var(--c,var(--text-2));background:color-mix(in srgb,var(--c,var(--text-2)) 12%,transparent);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--c,var(--text-2)) 38%,transparent)}
.k-jump{--c:#f59e0b}.k-stream{--c:#38bdf8}.k-other{--c:#a78bfa}.k-quantum{--c:#34d399}.k-stamina{--c:#fb7185}
.v-off{color:var(--muted)}
.v-pbar{display:flex;align-items:center;flex-wrap:wrap;gap:8px 14px;margin-top:14px}
.v-pbar[hidden]{display:none}
.v-pbar .pills{height:40px;padding:3px;align-items:stretch;flex-wrap:wrap}
.v-pbar .pills button{height:auto;padding:0 11px}
[data-theme="white"] .k-jump{--c:#d97706}[data-theme="white"] .k-stream{--c:#0284c7}[data-theme="white"] .k-other{--c:#7c3aed}[data-theme="white"] .k-quantum{--c:#059669}
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

return {SITE, Data, Kit, esc, fillTip, fmt, pct, REDUCED, when, ago, fullDate, mmss, DIFF, diff, STATUS, status, grade, GRADE_C, MODES, MOD_ART, SPEED_ART, SPEED_C, mods, flag, av, accTxt, shell, slot, KIND, playsHtml, playsNote, PREVIEW_SPEEDS, ask, row, slugify, pager, starC, spreadHtml, hoursMin, dropBroken, avgStars, morph, page, get css() { return css + styles.join(''); }};
})();
