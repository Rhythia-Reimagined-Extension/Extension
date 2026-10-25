// =============================================
// Reimagined for Rhythia — Exodus shell
// =============================================
// Runs at document_start. On the home page, the leaderboards, the maps, a map, a score, the skins, the clans, a clan, the collections, a collection, the wiki, the changelog, /player/:id and /player/:id/scores, while the experimental switch is on,
// Exodus takes the page over: Rhythia's React root is hidden by CSS before it
// ever paints, and Exodus renders its own page in a shadow root that sits next
// to #root, outside React's tree, so Rhythia's re-renders cannot touch it.
// Leaving those pages hands the page straight back to Rhythia.

var RhythiaX = RhythiaX || {};

RhythiaX.Exodus = (function () {
  'use strict';

  const MIRROR_KEY = 'rhythiax_exodus';
  const LOOK_KEY = 'rhythiax_exodus_look';
  const PAGES_KEY = 'rhythiax_exodus_pages';
  // An own theme's page colour, so the first paint already has it.
  const PAGE_KEY = 'rhythiax_exodus_page';
  const ON_CLASS = 'rhythiax-exodus';
  const HOST_ID = 'rhythiax-exodus-root';
  const RETURN_ID = 'rhythiax-exodus-return';
  const THEMES = ['reimagined', 'dark', 'white'];
  const NAV = [['/leaderboards', 'Leaderboards'], ['/maps', 'Maps'], ['/skins', 'Skins'], ['/clans', 'Clans'], ['/collections', 'Collections'], ['/wiki', 'Wiki'], ['/changelog', 'Changelog']];
  const CACHE_MS = 120000;
  const html = document.documentElement;

  let enabled = false;
  let look = { theme: 'reimagined', style: 'lines' };
  // Popup settings Exodus follows (shared/settings/schema.js); pages read them from RhythiaX.ExodusPrefs.
  let pages = null;
  let prefsSeen = '';
  let nativeFor = '';
  let host = null;
  let root = null;
  let app = null;
  let shownFor = '';
  let loading = null;
  // Everything the page on screen still has running (its load, map art, a late history, a refresh); leaving
  // the page aborts it.
  let viewAc = null;
  // The profile on screen: the data it was drawn from and whether it was drawn for its owner.
  let drawn = null;
  // Pages shown in this tab, capped like the data layer's memory: past 20 the oldest one goes.
  const cache = new Map();
  const remember = (key, value) => { cache.delete(key); cache.set(key, value); if (cache.size > 20) cache.delete(cache.keys().next().value); };

  // The switch and the look are mirrored in page storage so the first paint already knows them.
  try {
    enabled = localStorage.getItem(MIRROR_KEY) === '1';
    const [theme, style] = String(localStorage.getItem(LOOK_KEY) || '').split('|');
    look = { theme: THEMES.includes(theme) ? theme : 'reimagined', style: style === 'float' ? 'float' : 'lines' };
    const saved = localStorage.getItem(PAGES_KEY);
    if (saved !== null) pages = saved ? saved.split(',') : [];
  } catch (_) {}
  html.dataset.rhythiaxExodusTheme = look.theme;
  try { const page = localStorage.getItem(PAGE_KEY); if (/^#[0-9a-f]{6}$/.test(page || '')) html.style.setProperty('--rhythiax-exodus-page', page); } catch (_) {}

  // Text made safe for markup, the same in every Exodus view (core/kit.js).
  const esc = value => RhythiaX.ExodusKit.esc(value);
  // A complete url("…") token, safe inside a style attribute (core/kit.js).
  const cssUrl = x => RhythiaX.ExodusKit.cssUrl(x);
  // What Exodus shows at an address, and which "Pages Exodus takes over" entry it belongs to (core/routes.js).
  const { profileId, pageOf, HOME, BOARD, isBoard, viewKey, routeKey, pageGroup } = RhythiaX.ExodusRoutes;
  const shownKey = () => (/^\d+$/.test(shownFor) ? 'p' + shownFor : shownFor);
  const allowed = key => !pages || pages.includes(pageGroup(key));
  const active = () => enabled && Boolean(routeKey()) && allowed(routeKey()) && nativeFor !== location.pathname;

  // ─── Shell ──────────────────────
  function shellMarkup() {
    const A = RhythiaX.ExodusAssets;
    return `<style>${A.css}</style><style>${RhythiaX.ExodusApp?.css || ''}${RhythiaX.ExodusCompare?.css || ''}${RhythiaX.ExodusHome?.css || ''}${RhythiaX.ExodusBoard?.css || ''}${RhythiaX.ExodusKit?.css || ''}${RhythiaX.ExodusMarkdown?.css || ''}${RhythiaX.ExodusAccount?.css || ''}
      .exo{min-height:100vh}
      .exo[data-editing],.exo[data-editing] *,.exo[data-editing] *::before,.exo[data-editing] *::after{transition:none!important}
      .site .me{display:flex;align-items:center;gap:8px;flex:none}
      .site .me .av{width:30px;height:30px;border-radius:50%;background:center/cover var(--panel-2);box-shadow:0 0 0 1px var(--line-2)}
      .brand .re{margin-top:-5px;background-image:linear-gradient(90deg,rgba(var(--ink),.62) 0 42%,rgba(var(--ink),1) 50%,rgba(var(--ink),.62) 58% 100%)}
      @media (max-width:640px){.site .search .lbl,.site .search kbd{display:none}.site .search{padding:0 10px}}</style>
      <style id="variant" media="${look.style === 'lines' ? 'all' : 'not all'}">${A.linesCss}</style>
      <style>.exo[data-search="off"] .site .search{display:none}</style>
      <style id="owntheme"></style><style id="ownpic"></style>
      <div class="exo" data-theme="${look.theme}" data-variant="${look.style}" data-search="${RhythiaX.ExodusPrefs?.exodus?.search === false ? 'off' : 'on'}">
      ${A.sprite}
      <header class="site"><div class="container">
        <a class="brand" href="/" aria-label="Reimagined for Rhythia"><img src="https://www.rhythia.com/navlogo.png" alt="" width="93" height="30"><span class="re" aria-hidden="true">reimagined</span></a>
        <nav aria-label="Rhythia">${NAV.map(([href, label]) => `<a href="${href}">${label}</a>`).join('')}</nav>
        <button class="search" type="button" data-find><svg class="ico"><use href="#i-search"/></svg><span class="lbl">Search Rhythia</span><kbd>Ctrl K</kbd></button>
        <span class="me" id="me"></span>
      </div></header>
      <main id="app"><div id="hero"></div><div id="body"></div></main>
      <dialog class="cmp" id="cmp" aria-labelledby="cmp-title"></dialog>
      <div class="toast" id="toast" role="status"></div>
      <div class="tip" id="tip" role="tooltip"></div>
      <dialog class="cmp find" id="find" aria-label="Search Rhythia"></dialog>
      <dialog class="cmp" id="pick" aria-label="Add to showcase"></dialog>
      <dialog class="cmp acct" id="acct" aria-labelledby="ac-title"></dialog>
      </div>`;
  }

  function ensureHost() {
    if (!document.body) return false;
    if (!host) {
      host = document.createElement('div');
      host.id = HOST_ID;
      root = host.attachShadow({ mode: 'open' });
      root.innerHTML = shellMarkup();
      root.addEventListener('click', onShellClick);
      root.addEventListener('input', onShellInput);
      // The settings (and an own theme) can be read before the shell exists: paint them into it now.
      applyLook();
    }
    if (host.parentNode !== document.body) document.body.appendChild(host);
    return true;
  }

  // ─── Own themes (core/own-theme.js) ──────────────────────
  // The theme in use, its background picture or video, and the theme editor. The shell's own state reaches it
  // through getters, read each time it is needed.
  const { applyLook, markOwn, readOwnTheme, openEditor, pictureChanged } = RhythiaX.ExodusOwnTheme.create({
    html, root: () => root, host: () => host, app: () => app, look: () => look, meId: () => meId, profileId, pageKey: PAGE_KEY,
  });

  const GEAR = '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>';
  let meId = '';
  // me: the signed-in player, null when signed out, undefined while that is not known yet (nothing is drawn).
  function renderMe(me) {
    const slot = root?.getElementById('me');
    if (!slot) return;
    const who = me ? `${me.id}|${me.username}|${me.avatar_url}` : String(me);
    if (slot.dataset.who !== who) {
      slot.dataset.who = who;
      // Signed in: account settings (core/account.js) and the profile. Signed out: Rhythia's sign-in.
      slot.innerHTML = me
        ? `<button class="iconbtn" type="button" data-account aria-label="Account settings" data-tip="Settings">${GEAR}</button>
         <a class="av" href="/player/${esc(me.id)}" aria-label="Your profile" data-tip="<b>${esc(me.username)}</b>" style="background-image:${cssUrl(me.avatar_url)}"></a>`
        : me === null ? '<button class="btn" type="button" data-signin>Sign in</button>' : '';
    }
    meId = me?.id || '';
    markOwn();
  }

  // ─── Navigation ──────────────────────
  // Same-tab links go through Rhythia's router so its own state stays right
  // when the page is handed back: its matching link if it has one, else a push.
  // A profile is the exception. Exodus loads it with its own requests, and Rhythia's page under it would
  // load the same profile again, so the address changes without Rhythia's router hearing of it. Rhythia's
  // page catches up (catchUp) once one of its own parts is needed: a native button, Settings,
  // "Show Rhythia's page", or the page going back to Rhythia. Other pages use Rhythia's player and
  // buttons, so they always keep Rhythia's page at the address.
  let nativeBehind = false;
  const push = href => {
    const idx = (history.state?.idx ?? 0) + 1;
    history.pushState({ usr: null, key: Math.random().toString(36).slice(2, 10), idx }, '', href);
  };
  const tellRhythia = () => dispatchEvent(new PopStateEvent('popstate', { state: history.state }));
  function catchUp() {
    if (!nativeBehind) return false;
    nativeBehind = false;
    tellRhythia();
    return true;
  }
  function navigate(href) {
    root?.querySelectorAll('dialog[open]').forEach(dl => dl.close());
    const path = href.split(/[?#]/)[0];
    // Only Rhythia's own links: ones the Classic features add are plain anchors and would reload the page.
    const native = [...document.querySelectorAll('#root a[href]')].find(a => a.getAttribute('href') === href && !a.closest('[class*="rhythiax"]'));
    // Read before the address changes: the route listeners can show the next page during the push itself.
    const was = shownKey();
    if (enabled && profileId(path) && allowed(routeKey(path)) && nativeFor !== path) { push(href); nativeBehind = true; }
    else if (native) { nativeBehind = false; native.click(); }
    else { nativeBehind = false; push(href); tellRhythia(); }
    // Another page starts at the top; a player's profile and scores keep the scroll.
    const key = routeKey(path);
    if (key && key !== was) scrollTo(0, 0);
    sync();
  }

  function onShellClick(e) {
    const a = e.target.closest?.('a[href]');
    if (a && !a.target && !e.defaultPrevented && e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) {
      const href = a.getAttribute('href');
      if (href.startsWith('/')) { e.preventDefault(); navigate(href); return; }
    }
    if (e.target.closest?.('.site [data-account]')) accountSettings();
    if (e.target.closest?.('.site [data-signin]') && !clickNative('Sign in')) toast('Rhythia is still loading. Try again in a moment.');
    if (e.target.closest?.('[data-find]')) openFind();
    // A click on the backdrop closes the search.
    if (e.target.id === 'find' && e.target.tagName === 'DIALOG') e.target.close();
    // A click on the backdrop closes the showcase picker.
    if (e.target.id === 'pick' && e.target.tagName === 'DIALOG') e.target.close();
  }

  // Rhythia's own buttons (Sign in, Buy with Card) open its dialogs, which sit above Exodus.
  function clickNative(label) {
    const find = () => [...document.querySelectorAll('#root button')].find(b => (b.getAttribute('aria-label') || b.textContent || '').trim() === label);
    const late = catchUp(), btn = find();
    if (btn) { btn.click(); return true; }
    if (!late) return false;
    // Rhythia's page was still at an earlier address; it draws the button in a moment.
    const t0 = Date.now();
    const poll = setInterval(() => { const b = find(); b?.click(); if (b || Date.now() - t0 > 4000) clearInterval(poll); }, 150);
    return true;
  }

  // ─── Site search (Ctrl K), part of the header on every Exodus page ──────────────────────
  const fmt = n => RhythiaX.ExodusKit.fmt(n, 2);
  const mark = (v, q) => { const s = String(v || ''), i = s.toLowerCase().indexOf(q); return i < 0 ? esc(s) : esc(s.slice(0, i)) + '<mark>' + esc(s.slice(i, i + q.length)) + '</mark>' + esc(s.slice(i + q.length)); };
  const FIND_HINT = '<p class="cap" style="margin:12px 8px">Type at least two letters.</p>';
  let findTimer = 0, findSeq = 0;
  function openFind() {
    const dlg = root?.getElementById('find');
    if (!dlg || dlg.open) return;
    dlg.innerHTML = `<div class="find-body"><label class="field"><svg class="ico" aria-hidden="true"><use href="#i-search"/></svg><span class="sr">Search Rhythia</span><input id="find-q" type="search" placeholder="Players, maps or clans" autocomplete="off"></label>
      <div class="find-res" id="find-res">${FIND_HINT}</div></div>`;
    dlg.classList.remove('closing');
    dlg.showModal();
    root.getElementById('find-q').focus();
  }
  async function runFind(q) {
    const box = root?.getElementById('find-res'), seq = ++findSeq;
    if (!box) return;
    if (q.trim().length < 2) { box.innerHTML = FIND_HINT; return; }
    box.innerHTML = '<div class="skeleton" style="margin:16px 8px;width:50%"></div><div class="skeleton" style="margin:10px 8px;width:35%"></div>';
    try {
      const r = await RhythiaX.ExodusData.post('enhancedSearch', { text: q.trim(), limit: 5 });
      if (seq !== findSeq) return;
      const lq = q.trim().toLowerCase(), hl = v => mark(v, lq), site = 'https://www.rhythia.com';
      const users = (r.users || []).map(u => `<a href="/player/${esc(u.id)}"><i class="round" style="background-image:${cssUrl(u.avatar_url)}"></i><span>${hl(u.username)}<small>Player${u.flag ? ` · <img src="${site}/flags/${esc(u.flag)}.svg" alt="" style="width:14px;vertical-align:-1px"> ${esc(u.flag)}` : ''}</small></span><em>Profile →</em></a>`).join('');
      const maps = (r.beatmaps || []).map(b => `<a href="/maps/${esc(b.id)}"><i style="background-image:${cssUrl(b.previewImage?.small || b.image)}"></i><span>${hl(b.title)}<small>by ${esc(b.ownerUsername)} · ★ ${fmt(b.starRating)}</small></span><em>${esc(String(b.status || '').toLowerCase())}</em></a>`).join('');
      const clans = (r.clans || []).map(c => `<a href="/clans/${esc(c.id)}"><i style="background-image:${cssUrl(c.avatar_url)}"></i><span>${hl(c.name)}<small>Clan · [${esc(c.acronym)}]</small></span><em>Clan →</em></a>`).join('');
      box.innerHTML = (users ? `<h4>Players</h4>${users}` : '') + (maps ? `<h4>Maps</h4>${maps}` : '') + (clans ? `<h4>Clans</h4>${clans}` : '') || '<p class="cap" style="margin:12px 8px">Nothing found.</p>';
    } catch (e) {
      if (seq === findSeq) box.innerHTML = `<p class="cap" style="margin:12px 8px">Search failed (${esc(e.message)}).</p>`;
    }
  }
  function onShellInput(e) {
    if (e.target.id !== 'find-q') return;
    clearTimeout(findTimer);
    const v = e.target.value;
    findTimer = setTimeout(() => runFind(v), 220);
  }
  addEventListener('keydown', e => {
    if (!html.classList.contains(ON_CLASS)) return;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k' && RhythiaX.ExodusPrefs?.exodus?.search !== false) { e.preventDefault(); openFind(); }
    // Escape closes the search at once instead of first clearing the field.
    const dlg = root?.getElementById('find');
    if (e.key === 'Escape' && dlg?.open) { e.preventDefault(); dlg.close(); }
  });

  function openSettings() {
    catchUp();
    const btn = [...document.querySelectorAll('#root button')].find(b => (b.getAttribute('aria-label') || b.textContent || '').trim() === 'Settings');
    if (!btn) return false;
    btn.click();
    // When the dialog closes, read the profile again: avatar, banner, flag or name may have changed.
    // The later pass catches a picture Rhythia finishes late, on the same profile only.
    let seen = false;
    const watch = new MutationObserver(() => {
      const open = [...document.querySelectorAll('body > [role="dialog"], body > div [role="dialog"]')].some(d => !d.closest('#root'));
      if (open) { seen = true; return; }
      if (!seen) return;
      watch.disconnect();
      const id = shownFor;
      refresh();
      setTimeout(() => { if (shownFor === id) refresh(); }, 20000);
    });
    watch.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => { if (!seen) watch.disconnect(); }, 5000);
    return true;
  }

  // Exodus's own Settings window (core/account.js): it opens at once and saves like Rhythia's.
  const HANDOFF = {
    banner: 'Opening Rhythia’s Settings. Click the banner to change it.',
    avatar: 'Opening Rhythia’s Settings. Click your avatar to change it.',
    name: 'Opening Rhythia’s Settings. Name changes are under Username.',
    login: 'Opening Rhythia’s Settings. Login is at the bottom.',
  };
  function accountSettings() {
    const dlg = root?.getElementById('acct'), A = RhythiaX.ExodusAccount;
    if (!dlg || !meId || !A) { rhythiaSettings(); return; }
    const mine = String(meId), forgetMe = () => { cache.delete(mine); return RhythiaX.ExodusData.forget(mine); };
    A.open({
      dlg,
      me: RhythiaX.ExodusData.cachedSelf(),
      toast,
      saveAbout: async (bio, links) => { const r = await RhythiaX.ExodusData.actions.saveAbout(bio, links); await forgetMe(); return r; },
      rhythiaSettings: why => { if (HANDOFF[why]) toast(HANDOFF[why]); rhythiaSettings(); },
      onSaved: async () => {
        await forgetMe();
        RhythiaX.ExodusData.signedIn().then(renderMe).catch(() => {});
        if (shownFor === mine) refresh();
      },
    });
  }

  // Rhythia's Settings button is on the player's own profile; from anywhere else Exodus goes
  // there first (Rhythia's page keeps rendering under Exodus) and opens it once it is there.
  function rhythiaSettings() {
    if (openSettings()) return;
    if (!meId) return;
    if (profileId() !== String(meId)) navigate(`/player/${meId}`);
    const t0 = Date.now();
    const poll = setInterval(() => { if (openSettings() || Date.now() - t0 > 8000) clearInterval(poll); }, 250);
  }
  // The shell's #toast, with one timer for it whoever shows it (core/kit.js).
  function toast(m) { if (root) RhythiaX.ExodusKit.toast(root, m); }

  // Fresh data for the profile on screen, swapped in quietly where the viewer is (once the page is idle). It
  // stops when the page is left; a community history read in this tab in the last three hours is reused.
  async function refresh() {
    // After a change on this page the copy on screen predates it, so it is no fallback (null: none at all).
    const id = shownFor, view = viewAc, prev = drawn?.changed ? null : drawn?.data;
    if (!/^\d+$/.test(id) || !app || !view) return;
    cache.delete(id);
    RhythiaX.ExodusData.forget(id);
    let res;
    try { res = await loadFresh(id, view, prev); } catch (_) { return; }
    if (view.signal.aborted || shownFor !== id || !app) return;
    settle(id, res, view);
  }

  function showNative() {
    nativeFor = location.pathname;
    catchUp();
    sync();
  }

  function returnButton() {
    let btn = document.getElementById(RETURN_ID);
    const want = enabled && Boolean(routeKey()) && nativeFor === location.pathname;
    if (!want) { btn?.remove(); return; }
    if (!document.body) return;
    if (!btn) {
      btn = document.createElement('button');
      btn.id = RETURN_ID;
      btn.type = 'button';
      btn.textContent = 'Back to Exodus';
      btn.addEventListener('click', () => { nativeFor = ''; sync(); scrollTo(0, 0); });
    }
    if (btn.parentNode !== document.body) document.body.appendChild(btn);
  }

  // ─── Profile loading ──────────────────────
  function skeleton() {
    root.getElementById('hero').innerHTML = `<section class="hero loading" aria-busy="true"><div class="banner wash"></div><div class="container">
      <div class="hero-main"><div class="avatar skeleton" style="border-radius:28px"></div>
        <div class="who" style="flex:1"><div class="skeleton" style="width:min(320px,60%);height:34px;border-radius:10px"></div><div class="skeleton" style="width:min(420px,80%);margin-top:16px"></div></div></div>
      <div class="strip panel"><div class="skeleton" style="width:100%;height:42px;border-radius:10px"></div></div></div></section>`;
    root.getElementById('body').innerHTML = '';
  }

  function failed(err, id) {
    root.getElementById('hero').innerHTML = '';
    root.getElementById('body').innerHTML = `<div class="container"><div class="empty" style="padding:120px 0"><b>Exodus could not load ${id === HOME ? 'the home page' : id === BOARD ? 'the leaderboards' : id === 'maps' ? 'the maps' : id === 'skins' ? 'the skins' : id === 'clans' ? 'the clans' : id.startsWith('collections') ? 'the collections' : id === 'wiki' ? 'the wiki' : id === 'changelog' ? 'the changelog' : id === 'support' ? 'the support page' : id[0] === 'k' ? 'this collection' : id[0] === 'c' ? 'this clan' : id[0] === 's' ? 'this score' : id[0] === 'm' ? 'this map' : 'this profile'}</b>${esc(err?.message || err)}
      <div style="margin-top:16px;display:flex;gap:8px;justify-content:center"><button class="btn primary" type="button" data-retry="${esc(id)}">Try again</button><button class="btn" type="button" data-native>Show Rhythia's page</button></div></div></div>`;
    root.querySelector('[data-retry]').addEventListener('click', () => { cache.delete(id); shownFor = ''; sync(); });
    root.querySelector('.empty [data-native]').addEventListener('click', showNative);
  }

  // After a change on Rhythia the kept copies of this profile (id: the profile the action was for, read before
  // waiting) are out of date.
  // The page on screen then holds the change only in its own state, so it is not redrawn from its data again.
  function forgetting(fn, id) {
    return async (...args) => {
      const res = await fn(...args);
      cache.delete(id);
      RhythiaX.ExodusData.forget(id);
      if (drawn && String(drawn.data.profile?.id) === id) drawn.changed = true;
      return res;
    };
  }
  // An owner's action goes out only while the session is still that owner's (an account switch since the
  // page was drawn would otherwise write to the new account).
  function asOwner(fn, id) {
    return async (...args) => {
      const me = await RhythiaX.ExodusData.signedIn();
      if (me === null) throw new Error('Sign in to Rhythia first');
      if (!me) throw new Error('Could not check who is signed in. Try again.');
      if (String(me.id) !== id) throw new Error('You are signed in as another player now. Reload the page.');
      return fn(...args);
    };
  }

  // Who is signed in comes from the session, never from saved data: a copy saved for one account must not
  // show another account's own tools. Unknown while this tab has not read the session yet (owner tools then
  // appear once it has).
  const viewer = D => {
    const me = RhythiaX.ExodusData.knownSelf();
    return { me, owner: Boolean(me && D.profile && String(me.id) === String(D.profile.id)) };
  };

  function context(D, v) {
    const a = RhythiaX.ExodusData.actions, id = String(D.profile?.id ?? ''), view = viewAc;
    const mine = fn => forgetting(asOwner(fn, id), id);
    return {
      owner: v.owner,
      signedIn: v.me,
      actions: { saveAbout: mine(a.saveAbout), setPinned: mine(a.setPinned), addFriend: forgetting(a.addFriend, id), setShowcase: mine(a.setShowcase), searchShowcase: RhythiaX.ExodusData.searchShowcase },
      // Map art for lists shown later (Spin, VR); it also goes into the data this tab keeps.
      moreMeta: ids => RhythiaX.ExodusData.mapMetaFor(ids, view?.signal).then(meta => { Object.assign(D.meta, meta); return meta; }),
      showNative,
      go: navigate,
    };
  }

  function mount(D, opts = {}) {
    app?.destroy();
    app = null;
    const v = viewer(D);
    renderMe(v.me);
    drawn = { data: D, owner: v.owner };
    try {
      app = RhythiaX.ExodusApp(host, structuredClone(D), { ...context(D, v), page: pageOf(), ...opts });
    } catch (err) {
      console.error('Exodus render failed', err);
      failed(err, shownFor);
    }
  }

  const sameData = (a, b) => {
    const strip = d => JSON.stringify({ ...d, fetchedAt: 0, meta: 0 });
    return Boolean(a && b) && strip(a) === strip(b);
  };

  // Fresh data drawn quietly in place of what is on screen, as soon as the page is idle (nothing open or
  // half-done); only the newest waiting one is drawn, and none once the page is left or once the player has
  // changed something its requests predate (startedAt).
  let swapWant = null, swapTimer = 0;
  function stopSwap() { clearInterval(swapTimer); swapTimer = 0; swapWant = null; }
  function swapIn(key, data, draw, startedAt) {
    swapWant = { key, data, draw, startedAt };
    const tick = () => {
      const want = swapWant;
      if (!want || shownFor !== want.key || !app || (want.startedAt && RhythiaX.ExodusData.stale(want.key, want.startedAt))) { stopSwap(); return; }
      if (!app.idle()) return;
      stopSwap();
      const y = scrollY, state = app.state();
      want.draw(want.data, { quiet: true, state });
      scrollTo(0, y);
    };
    tick();
    if (swapWant && !swapTimer) swapTimer = setInterval(tick, 400);
  }

  // A profile load, asked again when the player changed something while it ran (its answers may predate it).
  async function loadFresh(id, view, prev) {
    for (let i = 0; ; i++) {
      const res = await RhythiaX.ExodusData.load(id, view.signal, prev);
      // The map-art waves reject when the page is left; nothing may be listening by then.
      res.metaFirst?.catch(() => {}); res.metaPending?.catch(() => {});
      if (i >= 2 || !RhythiaX.ExodusData.stale(id, res.startedAt)) return res;
    }
  }

  // Fresh profile data in: kept for this tab, drawn (quietly, when the page on screen differs or was drawn for
  // another viewer), then map art in two waves and a late community history fill it in.
  function settle(id, res, view) {
    // Still older than a change the player made (they kept changing things): drawn only if nothing is.
    const outdated = RhythiaX.ExodusData.stale(id, res.startedAt);
    if (!outdated) remember(id, { at: Date.now(), data: res.data });
    // The session has been read by now: the header follows it at once, the page waits for its swap.
    if (app) renderMe(RhythiaX.ExodusData.knownSelf());
    if (!app) mount(res.data);
    else if (outdated) return;
    else if (!sameData(drawn?.data, res.data) || viewer(res.data).owner !== drawn?.owner) swapIn(id, res.data, mount, res.startedAt);
    else { stopSwap(); drawn.data = res.data; renderMe(RhythiaX.ExodusData.knownSelf()); }
    const live = () => !view.signal.aborted && shownFor === id && app;
    res.historyLate?.then(hist => {
      if (!hist || !live()) return;
      res.data.history = hist;
      app.updateHistory?.(hist);
    }, () => {});
    (async () => {
      for (const wave of [res.metaFirst, res.metaPending]) {
        if (!wave) continue;
        const meta = await wave.catch(() => null);
        if (!live()) return;
        if (!meta || !Object.keys(meta).length) continue;
        Object.assign(res.data.meta, meta);
        app.updateMeta(meta);
      }
    })();
  }

  // Paint at once from memory or the saved snapshot, then swap fresh data in quietly.
  async function show(id) {
    if (shownFor === id && (app || loading)) { app?.page(pageOf()); return; }
    unmountApp();
    shownFor = id;
    const view = new AbortController();
    viewAc = view;
    const current = () => viewAc === view && shownFor === id;
    const hit = cache.get(id);
    if (hit && Date.now() - hit.at < CACHE_MS) {
      mount(hit.data);
      // Drawn for whoever this tab knew; once the session is read, a different owner state draws it again.
      RhythiaX.ExodusData.signedIn(view.signal).then(() => {
        if (!current() || !app || !drawn) return;
        renderMe(RhythiaX.ExodusData.knownSelf());
        if (viewer(drawn.data).owner !== drawn.owner) { if (drawn.changed) reshow(); else swapIn(id, drawn.data, mount); }
      }, () => {});
      return;
    }
    loading = view;
    // A short grace period, so a snapshot that arrives quickly never shows the skeleton first.
    const skel = setTimeout(() => { if (current() && !app) skeleton(); }, 350);
    const fresh = loadFresh(id, view);
    fresh.catch(() => {});
    const snap = await RhythiaX.ExodusData.snapshot(id).catch(() => null);
    if (snap && current() && !app) mount(snap);
    let res;
    try {
      res = await fresh;
    } catch (err) {
      clearTimeout(skel);
      if (!current()) return;
      loading = null;
      if (!app) failed(err, id);
      return;
    }
    clearTimeout(skel);
    if (!current()) return;
    loading = null;
    settle(id, res, view);
  }

  // ─── Home page ──────────────────────
  function homeSkeleton() {
    root.getElementById('hero').innerHTML = '';
    root.getElementById('body').innerHTML = `<div class="h-page"><section class="h-hero" aria-busy="true"><div class="h-stage"><i class="h-shade"></i></div>
      <div class="container h-grid"><div class="h-copy"><div class="skeleton" style="width:140px;height:30px;border-radius:999px"></div>
        <div class="skeleton" style="width:min(520px,90%);height:72px;margin-top:22px;border-radius:14px"></div><div class="skeleton" style="width:min(420px,80%);margin-top:22px"></div></div></div></section></div>`;
  }

  function mountHome(D, opts = {}) {
    // A quiet refresh keeps the playing video instead of starting it again.
    const video = opts.quiet ? root.querySelector('.h-stage video') : null;
    video?.remove();
    app?.destroy();
    app = null;
    // D.me is undefined while who is signed in is not known for this copy (core/data.js homeSnapshot).
    renderMe(D.me ? { id: D.me.id, username: D.me.username, avatar_url: D.me.avatar } : D.me);
    try {
      app = RhythiaX.ExodusHome(host, structuredClone(D), { leaderboard: RhythiaX.ExodusData.leaderboard, clickNative, video, ...opts });
    } catch (err) {
      console.error('Exodus home render failed', err);
      failed(err, HOME);
    }
  }

  // Same as a profile: paint from memory or the saved copy at once, then bring in fresh numbers.
  async function showHome() {
    if (shownFor === HOME && (app || loading)) return;
    unmountApp();
    shownFor = HOME;
    // The kept page holds the signed-in player's parts: it is used only by the same account.
    const hit = cache.get(HOME);
    if (hit && Date.now() - hit.at < CACHE_MS && hit.data.meTag === RhythiaX.ExodusData.viewerTag()) { mountHome(hit.data); return; }
    const controller = new AbortController();
    loading = controller;
    viewAc = controller;
    const current = () => viewAc === controller && shownFor === HOME;
    const skel = setTimeout(() => { if (current() && !app) homeSkeleton(); }, 350);
    const fresh = RhythiaX.ExodusData.loadHome(controller.signal);
    fresh.catch(() => {});
    const snap = await RhythiaX.ExodusData.homeSnapshot().catch(() => null);
    const mountedAt = Date.now();
    if (snap && current() && !app) mountHome(snap);
    let data;
    try {
      data = await fresh;
    } catch (err) {
      clearTimeout(skel);
      if (!current()) return;
      loading = null;
      if (!app) failed(err, HOME);
      return;
    }
    clearTimeout(skel);
    if (!current()) return;
    loading = null;
    remember(HOME, { at: Date.now(), data });
    if (!app) { mountHome(data); return; }
    // A copy from the last two minutes is fresh enough (unless it left out the signed-in parts); an older one
    // is swapped once the entrance has played and the page is idle.
    if (snap && Date.now() - Date.parse(snap.fetchedAt) < 120000 && snap.me !== undefined) return;
    await new Promise(r => setTimeout(r, Math.max(0, mountedAt + 1600 - Date.now())));
    if (!current() || !app) return;
    swapIn(HOME, data, mountHome);
  }

  // ─── Leaderboards: the view loads its own pages as the address changes ──────
  function showBoard() {
    if (shownFor === BOARD && app) { app.page(); return; }
    unmountApp();
    shownFor = BOARD;
    RhythiaX.ExodusData.signedIn().then(me => { if (shownFor === BOARD) renderMe(me); }).catch(() => {});
    try {
      app = RhythiaX.ExodusBoard(host, { go: navigate, clickNative });
    } catch (err) {
      console.error('Exodus leaderboards render failed', err);
      failed(err, BOARD);
    }
  }

  // ─── Scores, maps and the map list ──────
  function showView(key) {
    if (shownFor === key && app) { app.page?.(); return; }
    unmountApp();
    shownFor = key;
    RhythiaX.ExodusData.signedIn().then(me => { if (shownFor === key) renderMe(me); }).catch(() => {});
    // Each page file registers itself in RhythiaX.ExodusPages (exodus/pages/*.js).
    const P = RhythiaX.ExodusPages, name = key.startsWith('collections') ? 'collections' : { s: 'score', m: 'map', c: 'clan', k: 'collection' }[/^[smck]\d/.test(key) ? key[0] : ''] || key;
    try {
      const ctx = { id: key.replace(/^[smck](?=\d)/, ''), go: navigate, clickNative, dock, showNative };
      app = P[name](host, ctx);
    } catch (err) {
      console.error('Exodus view render failed', err);
      failed(err, key);
    }
  }

  // ─── Rhythia's own players inside Exodus (core/dock.js) ──────
  // A page lays Rhythia's player over a slot of its own (ctx.dock); leaving the page releases it.
  function dock(slot) { return RhythiaX.ExodusDock.dock(slot, root.getElementById('app')); }
  function undock() { RhythiaX.ExodusDock.undock(); }

  function unmountApp() {
    undock();
    stopSwap();
    loading?.abort();
    loading = null;
    viewAc?.abort();
    viewAc = null;
    app?.destroy();
    app = null;
    drawn = null;
    shownFor = '';
  }

  // ─── Takeover sync ──────────────────────
  // Exodus only marks the page it owns (ON_CLASS); whatever else runs on Rhythia watches that mark itself.
  function sync() {
    const on = active();
    if (html.classList.contains(ON_CLASS) !== on) html.classList.toggle(ON_CLASS, on);
    returnButton();
    if (on) {
      if (!ensureHost()) return;
      if (profileId()) show(profileId()); else if (isBoard()) showBoard(); else if (viewKey()) showView(viewKey()); else showHome();
      markOwn();
    } else {
      // Leaving Exodus closes the theme editor without saving.
      RhythiaX.ExodusThemeEditor?.close();
      if (app || loading) unmountApp();
      catchUp();
      freePage();
    }
  }

  // With Exodus on, the background loads only Exodus (engines.js). Once the settings are known and this
  // page is not Exodus's, the background is told, and the other look runs in this tab. It is told once; a
  // hand-off it could not do is asked again on the next change of page.
  let settled = false, freed = false, freeing = false;
  function freePage() {
    if (!settled || freed || freeing) return;
    freeing = true;
    let ask;
    try { ask = Promise.resolve(chrome.runtime.sendMessage({ type: 'rhythiax-page-free' })); } catch (_) { ask = Promise.resolve(null); }
    ask.then(reply => { if (reply?.ok) freed = true; }, () => {}).finally(() => { freeing = false; });
  }

  let queued = false;
  function queueSync() {
    if (queued) return;
    queued = true;
    queueMicrotask(() => { queued = false; sync(); });
  }

  // The query counts too: the leaderboards keep their page, mode and filter in it.
  let lastPath = location.pathname + location.search;
  function onRoute() {
    if (location.pathname + location.search === lastPath) return;
    lastPath = location.pathname + location.search;
    if (nativeFor && nativeFor !== location.pathname) nativeFor = '';
    sync();
  }

  new MutationObserver(() => { onRoute(); if (active() && (!host || host.parentNode !== document.body)) queueSync(); })
    .observe(html, { childList: true, subtree: true });
  // Back and Forward reach Rhythia's router as well, so its page is at the address again.
  addEventListener('popstate', e => { if (e.isTrusted) nativeBehind = false; onRoute(); });
  // Fires in the content-script world as soon as the URL changes, before React renders.
  if (window.navigation?.addEventListener) window.navigation.addEventListener('currententrychange', onRoute);
  sync();

  // ─── Settings ──────────────────────
  function readSettings(result) {
    const X = RhythiaX.SettingsSchema;
    enabled = result.rhythiaxExodus === true;
    const theme = THEMES.includes(result.rhythiaxTheme) ? result.rhythiaxTheme : 'reimagined';
    look = { theme, style: result.rhythiaxExodusStyle === 'float' ? 'float' : 'lines' };
    const prefs = {
      modules: Object.fromEntries(['playerCompare', 'statHistory', 'titleProgression', 'advancedStats', 'friendsList'].map(k => [k, X.read(result, `modules.${k}`) !== false])),
      exodus: X.exodusOptions(result),
    };
    RhythiaX.ExodusPrefs = prefs;
    pages = prefs.exodus.pages;
    readOwnTheme(result);
    settled = true;
    try {
      localStorage.setItem(MIRROR_KEY, enabled ? '1' : '0');
      localStorage.setItem(LOOK_KEY, `${look.theme}|${look.style}`);
      localStorage.setItem(PAGES_KEY, pages.join(','));
    } catch (_) {}
    applyLook();
    // A changed feature switch rebuilds the page on screen from its kept copy.
    const seen = JSON.stringify(prefs);
    const changed = prefsSeen && seen !== prefsSeen;
    prefsSeen = seen;
    if (changed && app) { reshow(); return; }
    sync();
  }

  // The page on screen drawn again from the start, where the viewer was.
  function reshow() {
    if (!app) return;
    const y = scrollY;
    unmountApp();
    sync();
    requestAnimationFrame(() => scrollTo(0, y));
  }

  // After the online-history choice, the page on screen is drawn again with (or without) community history.
  RhythiaX.CommunityConsentNotice?.onChoice(() => {
    cache.clear();
    reshow();
  });
  // The popup's Clear history, or a switch to This device: nothing kept in this tab brings the community
  // history back. A profile on screen is drawn again in place without it (no request); a page still loading,
  // or another page, is drawn again from the start.
  RhythiaX.ExodusData.onHistoryChange?.(() => {
    cache.clear();
    if (!app) return;
    if (/^\d+$/.test(shownFor) && drawn && !drawn.changed && !loading) {
      const data = { ...drawn.data, history: (drawn.data.history || []).slice(-1) };
      swapIn(shownFor, data, mount);
      return;
    }
    reshow();
  });

  const KEYS = { rhythiaxExodus: false, rhythiaxExodusStyle: 'lines', rhythiaxTheme: 'reimagined', rhythiaxModules: {}, rhythiaxExodusOptions: {},
    [RhythiaX.ExodusThemes.LIST_KEY]: [], [RhythiaX.ExodusThemes.ACTIVE_KEY]: '' };
  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    chrome.storage.local.get(KEYS, readSettings);
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== 'local') return;
      // The active theme's picture replaced from another tab (core/own-theme.js).
      pictureChanged(changes);
      if (!Object.keys(KEYS).some(k => k in changes)) return;
      chrome.storage.local.get(KEYS, readSettings);
    });
    // The popup asks the tab in front to open the theme editor; it answers whether it could.
    chrome.runtime.onMessage.addListener((message, _sender, reply) => {
      if (message?.type !== 'rhythiax-theme-editor') return undefined;
      if (!active() || !root) { reply({ ok: false }); return undefined; }
      openEditor(typeof message.id === 'string' ? message.id : '').then(ok => reply({ ok: Boolean(ok) }), () => reply({ ok: false }));
      return true;
    });
  }

  // RhythiaX.Exodus only says that Exodus is loaded in this tab. Whether it owns the page on screen is the
  // html.rhythiax-exodus mark (ON_CLASS), which other scripts read from the page themselves.
  return {};
})();
