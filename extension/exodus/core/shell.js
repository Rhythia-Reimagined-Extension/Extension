// =============================================
// Reimagined for Rhythia — Exodus (experimental profile page)
// =============================================
// Runs at document_start. On the home page, the leaderboards, the maps, a map, a score, the skins, the clans, a clan, the collections, a collection, the wiki, the changelog, /player/:id and /player/:id/scores, while the experimental switch is on,
// Exodus takes the page over: Rhythia's React root is hidden by CSS before it
// ever paints, and Exodus renders its own page in a shadow root that sits next
// to #root, outside React's tree, so Rhythia's re-renders cannot touch it.
// Leaving the profile hands the page straight back to Rhythia.

var RhythiaX = RhythiaX || {};

RhythiaX.Exodus = (function () {
  'use strict';

  const MIRROR_KEY = 'rhythiax_exodus';
  const LOOK_KEY = 'rhythiax_exodus_look';
  const PAGES_KEY = 'rhythiax_exodus_pages';
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

  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const profileId = (path = location.pathname) => path.match(/^\/player\/(\d+)(?:\/scores)?\/?$/)?.[1] || '';
  const pageOf = (path = location.pathname) => (/\/scores\/?$/.test(path) ? 'scores' : 'profile');
  const HOME = 'home';
  const BOARD = 'board';
  const isBoard = (path = location.pathname) => /^\/leaderboards(?:\/[A-Za-z]{2})?\/?$/.test(path);
  // Views that load their own data: a score, a map, a clan, a collection ('s', 'm', 'c', 'k' + id) and the pages
  // 'maps', 'skins', 'clans', 'collections', 'collections-own', 'wiki', 'changelog' (all of its addresses) and 'support'.
  const viewKey = (path = location.pathname) => {
    const m = path.match(/^\/(score|maps|clans|collections)\/(\d+)\/?$/);
    if (m) return { score: 's', maps: 'm', clans: 'c', collections: 'k' }[m[1]] + m[2];
    if (/^\/collections\/own\/?$/.test(path)) return 'collections-own';
    // Paynet comes back to /support?paynet=…; Rhythia checks that payment itself.
    if (/^\/support\/?$/.test(path)) return new URLSearchParams(location.search).has('paynet') ? '' : 'support';
    if (/^\/changelog(?:\/(?:public|web)(?:\/\d{4}-\d{2}-\d{2})?)?\/?$/.test(path)) return 'changelog';
    return /^\/(maps|skins|clans|collections|wiki)\/?$/.test(path) ? path.replace(/\//g, '') : '';
  };
  // What Exodus shows at an address: a player (profile or scores), the home page, the leaderboards or a view.
  const routeKey = (path = location.pathname) => (profileId(path) ? 'p' + profileId(path) : path === '/' ? HOME : isBoard(path) ? BOARD : viewKey(path));
  const shownKey = () => (/^\d+$/.test(shownFor) ? 'p' + shownFor : shownFor);
  // Which "Pages Exodus takes over" entry an address belongs to.
  const pageGroup = key => {
    if (!key) return '';
    if (key === HOME) return 'home';
    if (key === BOARD) return 'leaderboards';
    if (/^p\d/.test(key)) return 'profiles';
    if (/^[sm]\d/.test(key) || key === 'maps') return 'maps';
    if (/^c\d/.test(key) || key === 'clans') return 'clans';
    if (/^k\d/.test(key) || key.startsWith('collections')) return 'collections';
    return key;
  };
  const allowed = key => !pages || pages.includes(pageGroup(key));
  const active = () => enabled && Boolean(routeKey()) && allowed(routeKey()) && nativeFor !== location.pathname;

  // ─── Shell ──────────────────────
  function shellMarkup() {
    const A = RhythiaX.ExodusAssets;
    return `<style>${A.css}</style><style>${RhythiaX.ExodusApp?.css || ''}${RhythiaX.ExodusHome?.css || ''}${RhythiaX.ExodusBoard?.css || ''}${RhythiaX.ExodusKit?.css || ''}${RhythiaX.ExodusMarkdown?.css || ''}${RhythiaX.ExodusAccount?.css || ''}
      .exo{min-height:100vh}
      .site .me{display:flex;align-items:center;gap:8px;flex:none}
      .site .me .av{width:30px;height:30px;border-radius:50%;background:center/cover var(--panel-2);box-shadow:0 0 0 1px var(--line-2)}
      .site .native{flex:none}
      .brand .re{margin-top:-5px;background-image:linear-gradient(90deg,rgba(var(--ink),.62) 0 42%,rgba(var(--ink),1) 50%,rgba(var(--ink),.62) 58% 100%)}
      @media (max-width:640px){.site .search .lbl,.site .search kbd{display:none}.site .search{padding:0 10px}}</style>
      <style id="variant" media="${look.style === 'lines' ? 'all' : 'not all'}">${A.linesCss}</style>
      <style>.exo[data-search="off"] .site .search{display:none}</style>
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
    }
    if (host.parentNode !== document.body) document.body.appendChild(host);
    return true;
  }

  function applyLook() {
    html.dataset.rhythiaxExodusTheme = look.theme;
    if (!root) return;
    const exo = root.querySelector('.exo');
    exo.dataset.theme = look.theme;
    exo.dataset.variant = look.style;
    exo.dataset.search = RhythiaX.ExodusPrefs?.exodus?.search === false ? 'off' : 'on';
    root.getElementById('variant').media = look.style === 'lines' ? 'all' : 'not all';
    app?.relayout();
  }

  const GEAR = '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>';
  let meId = '';
  function renderMe(me) {
    const slot = root?.getElementById('me');
    if (!slot) return;
    // Signed in: account settings (core/account.js) and the profile. Signed out: Rhythia's sign-in.
    slot.innerHTML = me
      ? `<button class="iconbtn" type="button" data-account aria-label="Account settings" data-tip="<b>Settings</b><small>Username, flag, about me, privacy and login</small>">${GEAR}</button>
         <a class="av" href="/player/${esc(me.id)}" aria-label="Your profile" data-tip="<b>${esc(me.username)}</b><small>Your profile</small>" style="background-image:url('${esc(me.avatar_url)}')"></a>`
      : me === null ? '<button class="btn" type="button" data-signin>Sign in</button>' : '';
    meId = me?.id || '';
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
    // Only Rhythia's own links: ones the 1.2.x features add are plain anchors and would reload the page.
    const native = [...document.querySelectorAll('#root a[href]')].find(a => a.getAttribute('href') === href && !a.closest('[class*="rhythiax"]'));
    if (enabled && profileId(path) && allowed(routeKey(path)) && nativeFor !== path) { push(href); nativeBehind = true; }
    else if (native) { nativeBehind = false; native.click(); }
    else { nativeBehind = false; push(href); tellRhythia(); }
    // Another page starts at the top; a player's profile and scores keep the scroll.
    const key = routeKey(href.split(/[?#]/)[0]);
    if (key && key !== shownKey()) scrollTo(0, 0);
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
  const fmt = n => Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const mark = (v, q) => { const s = String(v || ''), i = s.toLowerCase().indexOf(q); return i < 0 ? esc(s) : esc(s.slice(0, i)) + '<mark>' + esc(s.slice(i, i + q.length)) + '</mark>' + esc(s.slice(i + q.length)); };
  const FIND_HINT = '<p class="cap" style="margin:12px 8px">Type at least two letters. Results come live from Rhythia.</p>';
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
      const users = (r.users || []).map(u => `<a href="/player/${esc(u.id)}"><i class="round" style="background-image:url('${esc(u.avatar_url)}')"></i><span>${hl(u.username)}<small>Player${u.flag ? ` · <img src="${site}/flags/${esc(u.flag)}.svg" alt="" style="width:14px;vertical-align:-1px"> ${esc(u.flag)}` : ''}</small></span><em>Profile →</em></a>`).join('');
      const maps = (r.beatmaps || []).map(b => `<a href="/maps/${esc(b.id)}"><i style="background-image:url('${esc(b.previewImage?.small || b.image)}')"></i><span>${hl(b.title)}<small>by ${esc(b.ownerUsername)} · ★ ${fmt(b.starRating)}</small></span><em>${esc(String(b.status || '').toLowerCase())}</em></a>`).join('');
      const clans = (r.clans || []).map(c => `<a href="/clans/${esc(c.id)}"><i style="background-image:url('${esc(c.avatar_url)}')"></i><span>${hl(c.name)}<small>Clan · [${esc(c.acronym)}]</small></span><em>Clan →</em></a>`).join('');
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
    let seen = false;
    const watch = new MutationObserver(() => {
      const open = [...document.querySelectorAll('body > [role="dialog"], body > div [role="dialog"]')].some(d => !d.closest('#root'));
      if (open) { seen = true; return; }
      if (!seen) return;
      watch.disconnect();
      refresh();
      setTimeout(refresh, 20000);
    });
    watch.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => { if (!seen) watch.disconnect(); }, 5000);
    return true;
  }

  // Exodus's own Settings window (core/account.js): it opens at once and saves like Rhythia's.
  const HANDOFF = {
    banner: 'Rhythia’s Settings is opening. Click the banner there to change it.',
    avatar: 'Rhythia’s Settings is opening. Click your avatar there to change it.',
    name: 'Rhythia’s Settings is opening. The name change purchase is under Username.',
    login: 'Rhythia’s Settings is opening. Login is at the bottom.',
  };
  function accountSettings() {
    const dlg = root?.getElementById('acct'), A = RhythiaX.ExodusAccount;
    if (!dlg || !meId || !A) { rhythiaSettings(); return; }
    const forgetMe = () => { cache.delete(String(meId)); return RhythiaX.ExodusData.forget(String(meId)); };
    A.open({
      dlg,
      me: RhythiaX.ExodusData.cachedSelf(),
      toast,
      saveAbout: async (bio, links) => { const r = await RhythiaX.ExodusData.actions.saveAbout(bio, links); await forgetMe(); return r; },
      rhythiaSettings: why => { if (HANDOFF[why]) toast(HANDOFF[why]); rhythiaSettings(); },
      onSaved: async () => {
        await forgetMe();
        RhythiaX.ExodusData.signedIn().then(renderMe).catch(() => {});
        if (shownFor === String(meId)) refresh();
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
  function toast(m) {
    const t = root?.getElementById('toast'); if (!t) return;
    t.textContent = m; t.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('on'), 2600);
  }

  // Fresh data for the profile on screen, swapped in quietly where the viewer is.
  async function refresh() {
    const id = shownFor;
    if (!/^\d+$/.test(id) || !app) return;
    cache.delete(id);
    RhythiaX.ExodusData.forget(id);
    let res;
    try { res = await RhythiaX.ExodusData.load(id); } catch (_) { return; }
    if (shownFor !== id || !app || !app.idle()) return;
    remember(id, { at: Date.now(), data: res.data });
    const y = scrollY, state = app.state();
    mount(res.data, { quiet: true, state });
    scrollTo(0, y);
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

  // After a change on Rhythia the kept copies of this profile are out of date.
  function forgetting(fn) {
    return async (...args) => {
      const res = await fn(...args);
      cache.delete(shownFor);
      RhythiaX.ExodusData.forget(shownFor);
      return res;
    };
  }

  function context(D) {
    const a = RhythiaX.ExodusData.actions;
    return {
      owner: D.owner,
      signedIn: D.signedIn,
      actions: { saveAbout: forgetting(a.saveAbout), setPinned: forgetting(a.setPinned), addFriend: forgetting(a.addFriend), setShowcase: forgetting(a.setShowcase), searchShowcase: RhythiaX.ExodusData.searchShowcase },
      showNative,
      // Rhythia's Settings button may not be drawn yet (its page catches up first); rhythiaSettings waits for it.
      openSettings: () => { if (!meId) return openSettings(); rhythiaSettings(); return true; },
      go: navigate,
    };
  }

  function mount(D, opts = {}) {
    app?.destroy();
    app = null;
    renderMe(D.signedIn);
    try {
      app = RhythiaX.ExodusApp(host, structuredClone(D), { ...context(D), page: pageOf(), ...opts });
    } catch (err) {
      console.error('Exodus render failed', err);
      failed(err, shownFor);
    }
  }

  const sameData = (a, b) => {
    const strip = d => JSON.stringify({ ...d, fetchedAt: 0, meta: 0 });
    return Boolean(a && b) && strip(a) === strip(b);
  };

  // Paint at once from memory or the saved snapshot, then swap fresh data in quietly.
  async function show(id) {
    if (shownFor === id && (app || loading)) { app?.page(pageOf()); return; }
    unmountApp();
    shownFor = id;
    const hit = cache.get(id);
    if (hit && Date.now() - hit.at < CACHE_MS) { mount(hit.data); return; }
    const controller = new AbortController();
    loading = controller;
    const current = () => loading === controller && shownFor === id;
    // A short grace period, so a snapshot that arrives quickly never shows the skeleton first.
    const skel = setTimeout(() => { if (current() && !app) skeleton(); }, 350);
    const fresh = RhythiaX.ExodusData.load(id, controller.signal);
    fresh.catch(() => {});
    const snap = await RhythiaX.ExodusData.snapshot(id).catch(() => null);
    if (snap && current() && !app) mount(snap);
    let res;
    try {
      res = await fresh;
      // The map-art waves reject when the page is left; nothing may be listening by then.
      res.metaFirst?.catch(() => {}); res.metaPending?.catch(() => {});
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
    remember(id, { at: Date.now(), data: res.data });
    if (!app) mount(res.data);
    else if (!sameData(snap, res.data) && app.idle()) {
      const y = scrollY, state = app.state();
      mount(res.data, { quiet: true, state });
      scrollTo(0, y);
    }
    // Map art arrives in two waves: what is on screen first, then everything else.
    const mounted = app;
    for (const wave of [res.metaFirst, res.metaPending]) {
      if (!wave) continue;
      const meta = await wave.catch(() => null);
      if (app !== mounted) return;
      if (!meta || !Object.keys(meta).length) continue;
      Object.assign(res.data.meta, meta);
      mounted.updateMeta(meta);
    }
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
    renderMe(D.me ? { id: D.me.id, username: D.me.username, avatar_url: D.me.avatar } : null);
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
    const hit = cache.get(HOME);
    if (hit && Date.now() - hit.at < CACHE_MS) { mountHome(hit.data); return; }
    const controller = new AbortController();
    loading = controller;
    const current = () => loading === controller && shownFor === HOME;
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
    // A copy from the last two minutes is fresh enough; an older one is swapped once the entrance has played.
    if (snap && Date.now() - Date.parse(snap.fetchedAt) < 120000) return;
    await new Promise(r => setTimeout(r, Math.max(0, mountedAt + 1600 - Date.now())));
    if (shownFor !== HOME || !app || !app.idle()) return;
    const y = scrollY, state = app.state();
    mountHome(data, { quiet: true, state });
    scrollTo(0, y);
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

  // ─── Rhythia's own players inside Exodus ──────
  // The map preview and the score replay stay Rhythia's: its page keeps running under Exodus,
  // unseen, and only the player is shown, laid over a slot in the Exodus page (exodus/boot.css).
  const DOCK = 'rhythiax-exodus-dock';
  let dockSlot = null, dockEl = null, dockFrame = 0, dockTimer = 0, dockAt = '';
  const queueDock = () => { if (!dockFrame) dockFrame = requestAnimationFrame(() => { dockFrame = 0; placeDock(); }); };
  const dockMo = new MutationObserver(queueDock);
  const dockRo = new ResizeObserver(queueDock);
  const findPlayer = () => document.querySelector('#root [aria-label="Playback position"]')?.closest('.rounded-xl') || null;
  function setDockEl(el) {
    if (el === dockEl) return;
    if (dockEl) { dockRo.unobserve(dockEl); dockEl.removeAttribute('data-rhythiax-dock'); }
    document.querySelectorAll('[data-rhythiax-dock-chain]').forEach(n => n.removeAttribute('data-rhythiax-dock-chain'));
    dockEl = el;
    if (!el) return;
    el.setAttribute('data-rhythiax-dock', '');
    for (let p = el.parentElement; p && p.id !== 'root'; p = p.parentElement) p.setAttribute('data-rhythiax-dock-chain', '');
    dockRo.observe(el);
  }
  function placeDock() {
    if (!dockSlot?.isConnected) return;
    setDockEl(findPlayer());
    dockSlot.classList.toggle('docked', Boolean(dockEl));
    if (!dockEl) return;
    const r = dockSlot.getBoundingClientRect(), at = `${r.left + scrollX}|${r.top + scrollY}|${r.width}`;
    if (at !== dockAt) {
      dockAt = at;
      html.style.setProperty('--rx-dock-x', `${r.left + scrollX}px`);
      html.style.setProperty('--rx-dock-y', `${r.top + scrollY}px`);
      html.style.setProperty('--rx-dock-w', `${r.width}px`);
    }
    const h = dockEl.offsetHeight;
    if (h && Math.abs(dockSlot.offsetHeight - h) > 1) dockSlot.style.height = `${h}px`;
  }
  function dock(slot) {
    undock();
    dockSlot = slot;
    html.classList.add(DOCK);
    dockMo.observe(document.getElementById('root') || document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    dockRo.observe(slot);
    dockRo.observe(root.getElementById('app'));
    addEventListener('resize', queueDock);
    // Layout can also shift without any size change Exodus can observe; a cheap check covers that.
    dockTimer = setInterval(queueDock, 400);
    placeDock();
    return { release: undock, refresh: queueDock, player: () => dockEl };
  }
  function undock() {
    if (!dockSlot) return;
    dockMo.disconnect();
    dockRo.disconnect();
    removeEventListener('resize', queueDock);
    clearInterval(dockTimer);
    setDockEl(null);
    dockSlot = null;
    html.classList.remove(DOCK);
    dockAt = '';
    for (const k of ['x', 'y', 'w']) html.style.removeProperty(`--rx-dock-${k}`);
  }

  function unmountApp() {
    undock();
    loading?.abort();
    loading = null;
    app?.destroy();
    app = null;
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
    } else {
      if (app || loading) unmountApp();
      catchUp();
      freePage();
    }
  }

  // With Exodus on, the background loads only Exodus (engines.js). Once the settings are known and this
  // page is not Exodus's, the background is told once, and the other look runs in this tab.
  let settled = false, freed = false;
  function freePage() {
    if (!settled || freed) return;
    freed = true;
    try { Promise.resolve(chrome.runtime.sendMessage({ type: 'rhythiax-page-free' })).catch(() => {}); } catch (_) {}
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
    enabled = result.rhythiaxExodus === true && result.rhythiaxMasterActive !== false;
    const theme = THEMES.includes(result.rhythiaxTheme) ? result.rhythiaxTheme : 'reimagined';
    look = { theme, style: result.rhythiaxExodusStyle === 'float' ? 'float' : 'lines' };
    const prefs = {
      modules: Object.fromEntries(['playerCompare', 'statHistory', 'titleProgression', 'advancedStats', 'friendsList'].map(k => [k, X.read(result, `modules.${k}`) !== false])),
      exodus: X.exodusOptions(result),
    };
    RhythiaX.ExodusPrefs = prefs;
    pages = prefs.exodus.pages;
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
    if (changed && app) {
      const y = scrollY;
      unmountApp();
      sync();
      requestAnimationFrame(() => scrollTo(0, y));
      return;
    }
    sync();
  }

  // After the online-history choice, the page on screen is drawn again with (or without) community history.
  RhythiaX.CommunityConsentNotice?.onChoice(() => {
    cache.clear();
    if (!app) return;
    const y = scrollY;
    unmountApp();
    sync();
    requestAnimationFrame(() => scrollTo(0, y));
  });

  const KEYS = { rhythiaxExodus: false, rhythiaxExodusStyle: 'lines', rhythiaxTheme: 'reimagined', rhythiaxMasterActive: true, rhythiaxModules: {}, rhythiaxExodusOptions: {} };
  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    chrome.storage.local.get(KEYS, readSettings);
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== 'local') return;
      if (!Object.keys(KEYS).some(k => k in changes)) return;
      chrome.storage.local.get(KEYS, readSettings);
    });
  }

  // True while Exodus owns the page on screen; other scripts stay out of it while it does.
  return { owns: () => html.classList.contains(ON_CLASS) };
})();
