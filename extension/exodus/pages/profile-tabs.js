// =============================================
// Reimagined for Rhythia — Exodus profile: Maps, Skins and Inventory
// =============================================
// The profile's Maps, Skins and Inventory tabs, read with the same requests as Rhythia's own tabs: the
// player's uploaded maps by status, their skin uploads by kind, and their items with what they wear (the
// owner can equip, take off and tint a name colour here). pages/profile.js draws the tab row and calls
// html() and open() when one of these tabs is shown.

var RhythiaX = RhythiaX || {};
RhythiaX.ExodusProfileParts = RhythiaX.ExodusProfileParts || {};

RhythiaX.ExodusProfileParts.tabs = function mountProfileTabs(c) {
'use strict';
const {R, U, ctx, ac, esc, fmt, REDUCED, SITE, S, OWN, WHOSE, $, cssUrl, toast} = c;
const Data = () => RhythiaX.ExodusData;
const {mapTile, pager, av, morph} = RhythiaX.ExodusKit;
const Cards = () => RhythiaX.ExodusSkinCards;
const sig = {signal: ac.signal};

// Each tab keeps what it showed, so going back to it paints at once.
const T = {
  maps: {status: '', page: 1, data: null, busy: false, seq: 0},
  skins: {type: 'rhs', page: 1, data: null, counts: null, busy: false, seq: 0, picked: false},
  inv: {data: null, err: '', sel: null, hue: null, saving: '', seq: 0},
};
// A page number button of these tabs; the profile's own [data-page] belongs to its score list.
const tabPager = (p, pages, range) => pager(p, pages, '', range).replace(/data-page=/g, 'data-tpage=');
const segs = (key, list, cur, attr) => `<div class="tabs seg" role="tablist" data-ink="${key}">${list.map(([k, l, n]) =>
  `<button role="tab" type="button" aria-selected="${cur === k}" ${attr}="${esc(k)}">${l}${n == null ? '' : ` <span class="num cap">${fmt(n)}</span>`}</button>`).join('')}</div>`;
const skeleton = (n, ratio) => Array.from({length: n}, () => `<div class="skeleton" style="height:auto;aspect-ratio:${ratio};border-radius:16px"></div>`).join('');

/* ── Maps ── */
// Rhythia's own filter on this tab: All maps, Ranked, Qualified (waiting to be ranked) and Unranked.
const MAP_STATUS = [['', 'All maps'], ['RANKED', 'Ranked'], ['QUALIFIED', 'Qualified'], ['UNRANKED', 'Unranked']];
function mapsBody() {
  const t = T.maps, d = t.data;
  if (!d) return `<div class="h-maps v-mgrid">${skeleton(8, '4/3.2')}</div>`;
  if (!d.maps.length) {
    const what = t.status ? `${MAP_STATUS.find(x => x[0] === t.status)[1].toLowerCase()} maps` : 'maps';
    return `<div class="empty pt-empty"><b>No ${what} yet</b>${OWN ? (t.status ? 'None of your uploads has this status.' : 'Maps you upload to Rhythia show here.') : `${esc(U.username)} has not uploaded any ${what}.`}${OWN && !t.status ? '<div class="pt-emptyact"><a class="btn" href="/maps/upload">Upload a map</a></div>' : ''}</div>`;
  }
  return `<div class="h-maps v-mgrid ${t.anim ? 'anim' : ''} ${t.busy ? 'busy' : ''}">${d.maps.map(mapTile).join('')}</div>${tabPager(t.page, Math.ceil(d.total / d.perPage), {perPage: d.perPage, total: d.total, noun: 'maps'})}`;
}
function mapsHtml() {
  const d = T.maps.data, n = d ? ` <span class="cap num">${fmt(d.total)}</span>` : '';
  return `<div class="sec-head"><div><h2>${OWN ? 'Your maps' : 'Maps'}${n}</h2><p class="lede">${OWN ? 'Maps you uploaded to Rhythia.' : `Maps ${esc(U.username)} uploaded to Rhythia.`}</p></div>
    <div class="right">${segs('pmaps', MAP_STATUS, T.maps.status, 'data-pm-status')}</div></div><div id="pt-body">${mapsBody()}</div>`;
}
async function loadMaps() {
  const t = T.maps, seq = ++t.seq, {status, page} = t;
  const snap = await Data().playerMapsSnapshot(U.id, status, page).catch(() => null);
  if (seq !== t.seq || ac.signal.aborted) return;
  if (snap) t.data = snap;
  t.busy = Boolean(t.data); draw();
  try {
    const d = await Data().playerMaps(U.id, status, page, ac.signal);
    if (seq !== t.seq) return;
    t.data = d;
  } catch (err) {
    if (seq !== t.seq || ac.signal.aborted) return;
    if (!t.data) t.data = {total: 0, perPage: 50, maps: [], failed: err.message};
    toast(snap ? 'Showing the saved maps; Rhythia did not answer.' : `The maps did not load (${err.message}).`);
  }
  t.busy = false; draw(); t.anim = false;
}

/* ── Skins ── */
function skinsBody() {
  const t = T.skins, d = t.data, types = Cards()?.TYPES || [], one = (types.find(x => x[0] === t.type) || ['', '', 'asset'])[2];
  if (!Cards()) return '<div class="empty pt-empty"><b>Skins are switched off</b>Turn the Skins page on in the popup to see them here.</div>';
  if (!d) return `<div class="v-skins ${t.type === 'rhs' ? 'rhs' : ''}">${skeleton(4, t.type === 'rhs' ? '4/4.1' : '4/5.6')}</div>`;
  if (!d.assets.length) return `<div class="empty pt-empty"><b>No ${esc(one)}s shared</b>${OWN ? `Skins you share on Rhythia show here.<div class="pt-emptyact"><a class="btn" href="/skins">Share a ${esc(one)}</a></div>` : `${esc(U.username)} has not shared any ${esc(one)}s.`}</div>`;
  return `<div class="v-skins ${t.type === 'rhs' ? 'rhs' : ''} ${t.anim ? 'anim' : ''} ${t.busy ? 'busy' : ''}">${d.assets.map((a, i) => Cards().card(a, i, {open: false, by: false})).join('')}</div>${tabPager(t.page, Math.ceil(d.total / d.perPage), {perPage: d.perPage, total: d.total, noun: 'uploads'})}`;
}
function skinsHtml() {
  const t = T.skins, types = (Cards()?.TYPES || []).map(([k, l]) => [k, l, t.counts?.[k]]);
  const all = t.counts ? Object.values(t.counts).reduce((a, n) => a + (n || 0), 0) : null;
  return `<div class="sec-head"><div><h2>${OWN ? 'Your skins' : 'Skins'}${all == null ? '' : ` <span class="cap num">${fmt(all)}</span>`}</h2><p class="lede">${OWN ? 'Skins and game assets you shared.' : `Skins and game assets ${esc(U.username)} shared.`}</p></div>
    <div class="right">${segs('pskins', types, t.type, 'data-ps-type')}<a class="btn mini" href="/skins?owner=${esc(U.id)}${t.type === 'rhs' ? '' : `&type=${esc(t.type)}`}">Open in Skins</a></div></div><div id="pt-body">${skinsBody()}</div>`;
}
async function loadSkins() {
  const t = T.skins, seq = ++t.seq, {type, page} = t;
  if (!Cards()) return draw();
  const snap = await Data().playerSkinsSnapshot(U.id, type, page).catch(() => null);
  if (seq !== t.seq || ac.signal.aborted) return;
  if (snap) t.data = snap;
  t.busy = Boolean(t.data); draw();
  try {
    const d = await Data().playerSkins(U.id, type, page, ac.signal);
    if (seq !== t.seq) return;
    t.data = d;
  } catch (err) {
    if (seq !== t.seq || ac.signal.aborted) return;
    if (!t.data) t.data = {total: 0, perPage: 12, assets: []};
    toast(snap ? 'Showing the saved skins; Rhythia did not answer.' : `The skins did not load (${err.message}).`);
  }
  t.busy = false; draw(); t.anim = false;
}
// The counts on the kind tabs. Opened on an empty RHS list, the tab moves to the first kind the player shared.
async function skinCounts() {
  const t = T.skins;
  if (t.counts || !Cards()) return;
  const counts = await Data().skinCounts({search: '', owner: String(U.id)}, ac.signal).catch(() => null);
  if (!counts || ac.signal.aborted) return;
  t.counts = counts;
  const first = (Cards().TYPES || []).find(([k]) => counts[k] > 0)?.[0];
  if (!t.picked && !counts[t.type] && first && first !== t.type) { t.type = first; t.page = 1; t.data = null; t.anim = true; loadSkins(); }
  else draw();
}

/* ── Inventory ── */
// Rhythia's name-colour tint: a hue (0–360) made into a soft colour, and a saved colour back into its hue.
const TINT_LO = 80, TINT_HI = 207, TINT_DEFAULT = 210;
function tint(hue) {
  const n = (hue % 360 + 360) % 360;
  const ch = u => { const d = (u + n / 60) % 6, m = Math.max(0, Math.min(d, 4 - d, 1)); return Math.round(TINT_HI - (TINT_HI - TINT_LO) * m).toString(16).padStart(2, '0'); };
  return `#${ch(5)}${ch(3)}${ch(1)}`.toUpperCase();
}
function hueOf(hex) {
  if (!/^#[0-9a-f]{6}$/i.test(hex || '')) return TINT_DEFAULT;
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16), hi = Math.max(r, g, b), span = hi - Math.min(r, g, b);
  return span === 0 ? TINT_DEFAULT : ((hi === r ? (g - b) / span : hi === g ? (b - r) / span + 2 : (r - g) / span + 4) * 60 + 360) % 360;
}
const TINT_TRACK = `linear-gradient(to right, ${[0, 60, 120, 180, 240, 300, 360].map(tint).join(', ')})`;
const goodColor = v => (/^#[0-9a-f]{6}$/i.test(v || '') ? v : '');
const worn = (inv, it) => Boolean(it?.slot && inv.equipables?.[it.slot]?.itemId === it.id);
// An item's picture. A banner shows its art (or, for the Supporter banner, Rhythia's supporter heart on its
// colours); a name colour shows Aa in that colour; a Name Change shows Aa.
function itemArt(it, inv, big = false) {
  if (it.slot === 'banner') {
    const pos = Number(it.bannerStyle?.thumbnailPositionX);
    const at = Number.isFinite(pos) ? `${Math.max(0, Math.min(100, pos))}% 50%` : '50% 50%';
    return it.imageUrl ? `<span class="iv-banner" style="background-image:${cssUrl(it.imageUrl)};background-position:${at}"></span>`
      : `<span class="iv-banner ${it.bannerEffect === 'supporter' ? 'sup' : 'plain'}">${it.bannerEffect === 'supporter' ? `<img src="${SITE}/supporterheart.png" alt="">` : ''}</span>`;
  }
  if (it.slot === 'nameColor') {
    const own = OWN && big && T.inv.hue != null ? tint(T.inv.hue) : goodColor(inv.equipables?.nameColor?.color) || tint(TINT_DEFAULT);
    return `<span class="iv-aa" style="color:${own}">${big ? esc(U.username) : 'Aa'}</span>`;
  }
  return `<span class="iv-aa name">Aa</span>`;
}
// How a banner sits behind the player in the game: the art with the name and avatar on a frosted plate.
function bannerPreview(it) {
  const rank = U.position ? `#${fmt(U.position)}` : '';
  return `<div class="iv-prev">${itemArt(it, T.inv.data)}<span class="iv-plate">${av(U.avatar_url, 'v-av')}<span><b>${esc(U.username)}</b>${rank ? `<small class="num">${rank} · ${fmt(U.skill_points)} RP</small>` : ''}</span></span></div>`;
}
function invHtml() {
  const t = T.inv, inv = t.data;
  if (t.err && !inv) return `<div class="sec-head"><div><h2>Inventory</h2></div></div><div class="empty pt-empty"><b>The inventory did not load</b>${esc(t.err)}<div class="pt-emptyact"><button class="btn" type="button" data-inv-retry>Try again</button></div></div>`;
  if (!inv) return `<div class="sec-head"><div><h2>Inventory</h2></div></div><div class="iv-grid"><div class="skeleton" style="height:320px;border-radius:16px"></div><div class="skeleton" style="height:320px;border-radius:16px"></div></div>`;
  const items = inv.items, count = items.reduce((a, it) => a + (Number(it.quantity) || 0), 0);
  const head = `<div class="sec-head"><div><h2>${OWN ? 'Your items' : `${WHOSE} items`} <span class="cap num">${fmt(count)}</span></h2><p class="lede">Items come from achievements, titles, game events and Supporter.</p></div></div>`;
  if (!items.length) return `${head}<div class="empty pt-empty"><b>${OWN ? 'Your inventory is empty' : 'This inventory is empty'}</b>${OWN ? 'Items you receive show here.' : `${esc(U.username)} has no items yet.`}</div>`;
  const sel = items.find(it => it.id === t.sel) || items[0];
  const tiles = items.map(it => `<button type="button" class="iv-item ${it.slot === 'banner' ? 'wide' : ''}" data-inv-item="${esc(it.id)}" aria-pressed="${it.id === sel.id}">
      <span class="iv-art">${itemArt(it, inv)}${worn(inv, it) ? '<span class="iv-on" data-tip="<b>Equipped</b>">✓</span>' : ''}${it.quantity > 1 ? `<span class="iv-qty num">×${fmt(it.quantity)}</span>` : ''}</span>
      <span class="iv-name">${esc(it.name)}</span></button>`).join('');
  return `${head}<div class="iv-grid"><div class="panel iv-list">${tiles}</div><div class="panel iv-detail" id="iv-detail">${detail(sel, inv)}</div></div>`;
}
function detail(it, inv) {
  const t = T.inv, on = worn(inv, it), saving = Boolean(t.saving);
  const tinted = it.slot === 'nameColor' && OWN ? tint(t.hue ?? hueOf(inv.equipables?.nameColor?.color)) : '';
  const changed = it.slot === 'nameColor' && on && tinted !== goodColor(inv.equipables?.nameColor?.color)?.toUpperCase();
  const art = it.slot === 'banner' ? bannerPreview(it) : `<div class="iv-prev solo">${itemArt(it, inv, true)}</div>`;
  const author = it.slot === 'banner' && it.imageUrl && !it.bannerEffect && it.authorName
    ? ` · Art by ${/^https:\/\//.test(it.authorUrl || '') ? `<a href="${esc(it.authorUrl)}" target="_blank" rel="noopener noreferrer">${esc(it.authorName)}</a>` : esc(it.authorName)}` : '';
  const kind = it.slot === 'banner' ? 'Banner' : it.slot === 'nameColor' ? 'Name colour' : it.id === 'name-change' ? 'Name change' : 'Item';
  const acts = [];
  if (OWN && it.id === 'name-change') acts.push('<button class="btn primary" type="button" data-inv-name>Change name</button>');
  if (OWN && it.slot && (!on || changed)) acts.push(`<button class="btn primary" type="button" data-inv-equip ${saving ? 'disabled' : ''}>${t.saving === 'equip' ? 'Saving…' : on ? 'Save colour' : 'Equip'}</button>`);
  if (OWN && on) acts.push(`<button class="btn" type="button" data-inv-unequip ${saving ? 'disabled' : ''}>${t.saving === 'unequip' ? 'Saving…' : 'Unequip'}</button>`);
  return `${art}<div class="iv-info">
      <div class="iv-title"><h3>${esc(it.name)}</h3>${on ? '<span class="iv-worn">✓ Equipped</span>' : ''}</div>
      <p class="cap">${kind} · Quantity ${fmt(it.quantity)}${author}</p>
      ${it.description ? `<p class="iv-desc">${esc(it.description)}</p>` : ''}
      ${OWN && it.slot === 'nameColor' ? `<label class="iv-tint"><span>Tint <span class="cap num" id="iv-hex">${tinted}</span></span><input type="range" id="iv-tint" min="0" max="360" step="1" value="${Math.round(t.hue ?? hueOf(inv.equipables?.nameColor?.color))}" style="--track:${TINT_TRACK};--thumb:${tinted}" ${saving ? 'disabled' : ''} aria-label="Tint"></label>` : ''}
      ${acts.length ? `<div class="iv-acts">${acts.join('')}</div>` : ''}
      ${it.slot === 'banner' ? '<p class="cap iv-note">Banners show behind your name in the game.</p>' : it.slot === 'nameColor' ? '<p class="cap iv-note">The colour of your name in the game’s chat.</p>' : ''}
    </div>`;
}
async function loadInv() {
  const t = T.inv, seq = ++t.seq;
  t.err = ''; draw();
  try {
    const inv = await Data().inventory(U.id, ac.signal);
    if (seq !== t.seq) return;
    t.data = inv; t.hue = null;
  } catch (err) {
    if (seq !== t.seq || ac.signal.aborted) return;
    t.err = err.message;
  }
  draw();
}
async function equip(off) {
  const t = T.inv, inv = t.data, it = inv?.items.find(x => x.id === t.sel) || inv?.items[0];
  if (!it?.slot || t.saving || !ctx.actions?.equip) return;
  t.saving = off ? 'unequip' : 'equip'; redrawDetail();
  const color = it.slot === 'nameColor' ? tint(t.hue ?? hueOf(inv.equipables?.nameColor?.color)) : undefined;
  try {
    const next = await ctx.actions.equip(it.slot, off ? null : it.id, color);
    if (ac.signal.aborted) return;
    t.data = next; t.hue = null;
    toast(off ? `${it.name} taken off.` : it.slot === 'nameColor' ? 'Name colour saved.' : `${it.name} equipped.`);
  } catch (err) {
    toast(`Could not save: ${err.message}`);
  } finally {
    t.saving = '';
  }
  if (!ac.signal.aborted) draw();
}
const redrawDetail = () => { const el = $('#iv-detail'), inv = T.inv.data; if (el && inv) morph(el, detail(inv.items.find(x => x.id === T.inv.sel) || inv.items[0], inv)); };

/* ── Drawing and events ── */
const HTML = {maps: mapsHtml, skins: skinsHtml, inventory: invHtml};
const has = sec => sec in HTML;
// The open tab's section, drawn again in place.
function draw() {
  const el = $('#ptab');
  if (!el || !has(S.section)) return;
  morph(el, HTML[S.section]());
  c.inks?.();
}
const html = sec => `<section class="container section reveal" id="ptab" aria-label="${esc(sec)}">${HTML[sec]()}</section>`;
// A tab was opened: what it has is shown at once and refreshed.
function open(sec) {
  if (sec === 'maps') { T.maps.anim = !T.maps.data; loadMaps(); }
  if (sec === 'skins') { T.skins.anim = !T.skins.data; loadSkins(); skinCounts(); }
  if (sec === 'inventory') loadInv();
}
const toTop = () => { const el = $('#ptab'); if (el && el.getBoundingClientRect().top < 0) scrollTo({top: el.getBoundingClientRect().top + scrollY - 72, behavior: REDUCED ? 'auto' : 'smooth'}); };

R.addEventListener('click', e => {
  if (!has(S.section)) return;
  const b = e.target.closest('[data-pm-status],[data-ps-type],[data-tpage],[data-copy],[data-inv-item],[data-inv-equip],[data-inv-unequip],[data-inv-name],[data-inv-retry]');
  if (!b || b.disabled || !b.closest('#ptab')) return;
  const d = b.dataset;
  if ('pmStatus' in d) { if (d.pmStatus === T.maps.status) return; T.maps.status = d.pmStatus; T.maps.page = 1; T.maps.anim = true; return loadMaps(); }
  if ('psType' in d) { if (d.psType === T.skins.type) return; T.skins.type = d.psType; T.skins.page = 1; T.skins.picked = true; T.skins.data = null; T.skins.anim = true; return loadSkins(); }
  if (d.tpage) {
    const t = S.section === 'maps' ? T.maps : T.skins;
    t.page = Number(d.tpage); t.anim = true; toTop();
    return S.section === 'maps' ? loadMaps() : loadSkins();
  }
  if (d.copy) { Cards()?.copyText(Cards().shareUrl(d.copy)).then(ok => toast(ok ? 'Share link copied.' : 'Could not copy: the browser blocked clipboard access.')); return; }
  if (d.invItem) { if (T.inv.sel === d.invItem) return; T.inv.sel = d.invItem; T.inv.hue = null; R.querySelectorAll('[data-inv-item]').forEach(x => x.setAttribute('aria-pressed', String(x.dataset.invItem === d.invItem))); return redrawDetail(); }
  if ('invEquip' in d) return equip(false);
  if ('invUnequip' in d) return equip(true);
  if ('invName' in d) return ctx.account ? ctx.account() : toast('Open Settings in the header to change your name.');
  if ('invRetry' in d) return loadInv();
}, sig);
// Dragging the tint updates the preview and the slider's thumb without drawing the panel again.
R.addEventListener('input', e => {
  if (e.target.id !== 'iv-tint') return;
  T.inv.hue = Number(e.target.value);
  const col = tint(T.inv.hue);
  e.target.style.setProperty('--thumb', col);
  const hex = $('#iv-hex'); if (hex) hex.textContent = col;
  const aa = R.querySelector('#iv-detail .iv-aa'); if (aa) aa.style.color = col;
}, sig);
R.addEventListener('change', e => { if (e.target.id === 'iv-tint') redrawDetail(); }, sig);

return {has, html, open};
};
