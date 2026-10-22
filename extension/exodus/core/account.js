// =============================================
// Reimagined for Rhythia — Exodus account settings
// =============================================
// The header's gear opens this window instead of Rhythia's Settings. It opens at once from the
// profile Exodus already holds, reads the fresh profile, name change and login state behind it,
// and saves with the same request Rhythia's window sends (core/data.js, account). Image uploads,
// buying a name change and login changes stay in Rhythia's own window, one click away.

var RhythiaX = RhythiaX || {};

RhythiaX.ExodusAccount = (function () {
  'use strict';

  const SITE = 'https://www.rhythia.com';
  // Rhythia's flag list (its Settings window), in its order; shown sorted by name.
  const COUNTRIES = ['US', 'AE', 'AM', 'AR', 'AT', 'AU', 'AZ', 'BA', 'BB', 'BD', 'BE', 'BG', 'BH', 'BN', 'BO', 'BR', 'BT', 'BW', 'BY', 'CA', 'CH', 'CI', 'CL', 'CN', 'CO', 'CR', 'CU', 'CW', 'CY', 'CZ', 'DE', 'DJ', 'DK', 'DO', 'DZ', 'EC', 'EE', 'EG', 'ES', 'ET', 'FI', 'FJ', 'FO', 'FR', 'GA', 'GB', 'GE', 'GG', 'GH', 'GP', 'GR', 'GT', 'GU', 'GY', 'HK', 'HN', 'HR', 'HU', 'ID', 'IE', 'IL', 'IM', 'IN', 'IQ', 'IR', 'IS', 'IT', 'JE', 'JM', 'JO', 'JP', 'KE', 'KG', 'KH', 'KR', 'KW', 'LB', 'LI', 'LK', 'LT', 'LU', 'LV', 'MA', 'MC', 'MD', 'ME', 'MG', 'MK', 'MM', 'MN', 'MT', 'MU', 'MV', 'MX', 'MY', 'NA', 'NC', 'NG', 'NL', 'NO', 'NP', 'NZ', 'OM', 'PA', 'PE', 'PG', 'PH', 'PK', 'PL', 'PR', 'PS', 'PT', 'PY', 'QA', 'RE', 'RO', 'RS', 'RU', 'SA', 'SD', 'SE', 'SG', 'SI', 'SK', 'SL', 'SN', 'SR', 'SV', 'SY', 'TG', 'TH', 'TN', 'TR', 'TT', 'TW', 'TZ', 'UA', 'UY', 'UZ', 'KZ', 'VE', 'VN', 'XK', 'YE', 'ZA', 'ZW'];
  // Rhythia accepts these social links only, over https.
  const SOCIAL_HOSTS = ['discord.com', 'discord.gg', 't.me', 'telegram.me', 'youtube.com', 'youtu.be', 'twitch.tv', 'x.com', 'twitter.com', 'github.com', 'instagram.com', 'tiktok.com', 'facebook.com', 'steamcommunity.com'];
  const BIO_MAX = 10000;

  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  // The shared sprite (core/assets.js) has search and x; the rest are drawn here.
  const OWN = {
    img: '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-8 8"/>',
    cam: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
    down: '<path d="m6 9 6 6 6-6"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  };
  const ico = id => OWN[id] ? `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true">${OWN[id]}</svg>` : `<svg class="ico" aria-hidden="true"><use href="#i-${id}"/></svg>`;
  const regionName = (() => { try { const n = new Intl.DisplayNames(['en'], { type: 'region' }); return c => n.of(c) || c; } catch (_) { return c => c; } })();
  const flagImg = c => `<img class="ac-flag" src="${SITE}/flags/${esc(c || 'US')}.svg" alt="">`;
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
  const bioOf = raw => String(raw || '').replace(/\n?<!--rhythia-social(?:-2)?:[^>]+-->/gi, '').trimEnd();
  const linksOf = raw => [/<!--rhythia-social:([^>]+)-->/i, /<!--rhythia-social-2:([^>]+)-->/i].map(re => {
    const m = String(raw || '').match(re);
    try { return m ? decodeURIComponent(m[1]) : ''; } catch (_) { return ''; }
  });
  const normalLink = v => {
    const t = String(v || '').trim();
    if (!t) return '';
    try {
      const u = new URL(t), h = u.hostname.toLowerCase().replace(/^www\./, '');
      return u.protocol === 'https:' && SOCIAL_HOSTS.some(d => h === d || h.endsWith(`.${d}`)) ? u.toString() : null;
    } catch (_) { return null; }
  };
  const timeLeft = ms => {
    const d = Math.ceil((ms - Date.now()) / 864e5);
    if (d <= 0) return 'expired';
    if (d >= 365) return `${plural(Math.max(1, Math.round(d / 365)), 'year', 'years')} left`;
    if (d >= 30) return `${plural(Math.max(1, Math.round(d / 30)), 'month', 'months')} left`;
    return `${plural(d, 'day', 'days')} left`;
  };
  const price = p => { try { return new Intl.NumberFormat('en-US', { style: 'currency', currency: p.currency, maximumFractionDigits: 2 }).format(p.amountMinor / 100); } catch (_) { return '$4'; } };

  let S = null;

  // ─── Reading the state ──────
  const privacyAllowed = u => Array.isArray(u?.badges) && (u.badges.includes('Developer') || u.badges.includes('Content Creator'));
  const canFlag = u => u?.can_change_flag ?? true;
  const nameEditable = () => Boolean(S.product && S.product.allowed && (S.product.freeAvailable || S.product.credits > 0));
  function fromUser(u) {
    return { username: u?.username || '', flag: u?.flag || 'US', bio: bioOf(u?.about_me), links: linksOf(u?.about_me),
      spectator: u?.spectator_privacy ?? false, hideOnline: u?.hide_from_online_list ?? false };
  }
  function changes() {
    const b = S.base, d = S.draft, list = [];
    if (nameEditable() && d.username.trim() !== b.username) list.push('username');
    if (canFlag(S.user) && d.flag !== b.flag) list.push('flag');
    if (d.bio.trim() !== b.bio.trim()) list.push('about me');
    if (d.links.map(l => l.trim()).join('\n') !== b.links.join('\n')) list.push('links');
    if (privacyAllowed(S.user) && d.spectator !== b.spectator) list.push('spectator privacy');
    if (privacyAllowed(S.user) && d.hideOnline !== b.hideOnline) list.push('online list');
    return list;
  }

  // ─── Markup ──────
  function supporter(u) {
    const v = u?.verified ? (u.verificationDeadline ? timeLeft(u.verificationDeadline) : 'active') : 'not purchased';
    return `<a href="/support">Supporter</a>: <b>${esc(v)}</b>`;
  }
  function identity(u) {
    return `<div class="ac-banner" style="${u?.profile_image ? `background-image:url('${esc(u.profile_image)}')` : ''}">
        <span class="ac-size">At least 1018 × 205</span>
        <button class="ac-plate" type="button" data-ac="rhythia" data-why="banner">${ico('img')}Change banner</button></div>
      <div class="ac-who"><button class="ac-ava" type="button" data-ac="rhythia" data-why="avatar" aria-label="Change avatar" style="background-image:url('${esc(u?.avatar_url || '')}')"><span>${ico('cam')}</span></button>
        <div><b>${esc(u?.username || '')}</b><small>${supporter(u)} · avatar at least 150 × 150</small></div></div>`;
  }
  function nameHelp() {
    const p = S.product;
    if (S.productError) return `<p class="ac-help">${esc(S.productError)} <button class="ac-link" type="button" data-ac="retry-name">Try again</button></p>`;
    // Two lines and a button, like the usual answer, so nothing below moves when it arrives.
    if (!p) return '<p class="ac-help"><span class="skeleton ac-line-sk" style="width:92%"></span><span class="skeleton ac-line-sk" style="width:60%"></span></p><span class="skeleton ac-btn-sk"></span>';
    let text;
    if (!p.allowed) text = 'Your account cannot change its name.';
    else if (p.freeAvailable) text = p.credits > 0 ? `Your first name change is free. Your ${p.credits === 1 ? 'Name Change item stays' : `${p.credits} Name Change items stay`} in your inventory.` : 'Your first name change is free and needs no item.';
    else if (p.credits > 0) text = `${plural(p.credits, 'Name Change item', 'Name Change items')} in your inventory. Saving a new name uses one.`;
    else text = 'Changing it needs a Name Change item. Your first Supporter purchase includes one.';
    const buy = !nameEditable() && p.canPurchase ? `<button class="btn ac-sm" type="button" data-ac="rhythia" data-why="name">Buy a name change · ${esc(price(p))}</button>` : '';
    return `<p class="ac-help">${esc(text)}</p>${buy}`;
  }
  function flagField() {
    const d = S.draft, allowed = canFlag(S.user), confirm = S.flagAsk;
    if (confirm) {
      return `<div class="ac-confirm" role="alertdialog" aria-label="Change your flag">
        <p>Change your flag from <b>${esc(regionName(d.flag))}</b> to <b>${esc(regionName(confirm))}</b>? Rhythia lets you change it only once.</p>
        <div><button class="btn ac-sm" type="button" data-ac="flag-keep">Keep ${esc(regionName(d.flag))}</button><button class="btn primary ac-sm" type="button" data-ac="flag-yes">Change to ${esc(regionName(confirm))}</button></div></div>`;
    }
    const list = S.flagOpen ? `<div class="ac-pick"><label class="field ac-search">${ico('search')}<input id="ac-flag-q" type="search" placeholder="Search country" autocomplete="off" value="${esc(S.flagQ)}"></label>
        <div class="ac-list" id="ac-flag-list">${flagOptions()}</div></div>` : '';
    const changed = d.flag !== S.base.flag;
    return `<button class="field ac-select" type="button" data-ac="flag-open" ${allowed ? '' : 'disabled'} aria-expanded="${S.flagOpen}">${flagImg(d.flag)}<span>${esc(regionName(d.flag))}</span>${ico(allowed ? 'down' : 'lock')}</button>${list}
      <p class="ac-help">${!allowed ? 'Your flag was already changed once.' : changed ? 'Saved when you press Save changes.' : '<span class="ac-warn">Can be changed once.</span> You’ll be asked to confirm.'}</p>`;
  }
  function flagOptions() {
    const q = S.flagQ.trim().toLowerCase();
    const list = COUNTRIES.map(c => [c, regionName(c)]).sort((a, b) => a[1].localeCompare(b[1]))
      .filter(([c, n]) => !q || n.toLowerCase().includes(q) || c.toLowerCase() === q);
    return list.map(([c, n]) => `<button type="button" data-flag="${c}" class="${c === S.draft.flag ? 'on' : ''}">${flagImg(c)}<span>${esc(n)}</span></button>`).join('')
      || '<p class="ac-help" style="padding:10px">No country found.</p>';
  }
  function loginRows() {
    const l = S.login;
    const manage = '<button class="btn ac-sm" type="button" data-ac="rhythia" data-why="login">Manage login</button>';
    if (S.loginError) return `<div class="ac-row"><span class="ac-tx"><small>${esc(S.loginError)}</small></span>${manage}</div>`;
    if (!l) return '<div class="ac-row"><span class="ac-tx"><span class="skeleton" style="width:180px;display:block"></span><span class="skeleton" style="width:120px;height:10px;display:block;margin-top:8px"></span></span></div>';
    const email = (l.emails || []).find(e => e.is_primary && e.verified_at)?.email || '';
    return `<div class="ac-row"><span class="ac-tx"><b>Username and password</b><small>${l.hasPassword ? `Set up${email ? ` · ${esc(email)}` : ''}` : 'Not set up. You sign in with Discord.'}</small></span><span class="ac-chip ${l.hasPassword ? 'ok' : ''}">${l.hasPassword ? 'On' : 'Off'}</span></div>
      <div class="ac-row"><span class="ac-tx"><b>Discord</b><small>${l.discordLinked ? 'Linked to this profile.' : 'Not linked.'}</small></span><span class="ac-chip ${l.discordLinked ? 'ok' : ''}">${l.discordLinked ? 'Linked' : 'Not linked'}</span></div>
      <div class="ac-row"><span class="ac-tx"><small>Email, password and login changes are confirmed by email, in Rhythia’s own window.</small></span>${manage}</div>`;
  }
  const sw = (key, on, label) => `<button class="ac-sw" type="button" role="switch" aria-checked="${on}" aria-label="${esc(label)}" data-ac-sw="${key}"></button>`;
  function body() {
    const u = S.user, d = S.draft;
    return `<div class="ac-head"><div><h2 id="ac-title">Settings</h2><p>Your profile, flag and privacy on Rhythia.</p></div><button class="iconbtn" type="button" data-ac="close" aria-label="Close">${ico('x')}</button></div>
      <div class="ac-body">
        <div class="ac-ident" id="ac-ident">${identity(u)}</div>
        <section class="ac-sec"><h3>Profile</h3><div class="ac-grid">
          <div class="ac-f"><label for="ac-name">Username</label><div class="ac-name"><input class="field" id="ac-name" maxlength="20" autocomplete="off" value="${esc(d.username)}" ${nameEditable() ? '' : 'disabled'}>${nameEditable() ? '' : ico('lock')}</div><div id="ac-name-help">${nameHelp()}</div></div>
          <div class="ac-f"><span class="ac-l">Flag</span><div id="ac-flag">${flagField()}</div></div>
        </div></section>
        <section class="ac-sec"><h3>About</h3>
          <div class="ac-f"><label for="ac-bio">About me <small class="num" id="ac-bio-n">${d.bio.length.toLocaleString('en-US')} / ${BIO_MAX.toLocaleString('en-US')}</small></label><textarea class="field" id="ac-bio" rows="4" maxlength="${BIO_MAX}">${esc(d.bio)}</textarea></div>
          <div class="ac-grid" style="margin-top:12px">${[0, 1].map(i => `<div class="ac-f"><label for="ac-link-${i}">Link ${i + 1}</label><input class="field" id="ac-link-${i}" type="url" inputmode="url" placeholder="https://${i ? 'github.com/…' : 'discord.gg/…'}" value="${esc(d.links[i])}"></div>`).join('')}</div>
          <p class="ac-help">Discord, Telegram, YouTube, Twitch, X, GitHub, Instagram, TikTok, Facebook or Steam, starting with https://</p>
        </section>
        ${privacyAllowed(u) ? `<section class="ac-sec"><h3>Privacy</h3>
          <div class="ac-row"><span class="ac-tx"><b>Spectator privacy</b><small>Others can’t spectate you, from your next game login.</small></span>${sw('spectator', d.spectator, 'Spectator privacy')}</div>
          <div class="ac-row"><span class="ac-tx"><b>Hide from online list</b><small>You don’t show in the game’s online list, from your next game login.</small></span>${sw('hideOnline', d.hideOnline, 'Hide from online list')}</div>
        </section>` : ''}
        <section class="ac-sec"><h3>Login</h3><div id="ac-login">${loginRows()}</div></section>
      </div>
      <div class="ac-foot"><span class="ac-hint" id="ac-hint"></span><button class="btn" type="button" data-ac="close">Cancel</button><button class="btn primary" type="button" data-ac="save" id="ac-save">Save changes</button></div>`;
  }

  // ─── Small updates, so typing is never interrupted ──────
  const $ = id => S?.dlg.querySelector('#' + id);
  function paintFoot() {
    if (!S) return;
    const save = $('ac-save'), hint = $('ac-hint');
    if (!S.user) { hint.textContent = 'Reading your profile from Rhythia…'; return; }
    const list = changes();
    save.disabled = S.saving || !S.fresh || !list.length;
    save.textContent = S.saving ? 'Saving…' : 'Save changes';
    hint.innerHTML = !S.fresh ? 'Checking your profile on Rhythia…'
      : list.length ? `<b>${plural(list.length, 'change', 'changes')}</b> not saved yet` : '';
  }
  function paintName() {
    const box = $('ac-name-help'), input = $('ac-name');
    if (!box) return;
    box.innerHTML = nameHelp();
    input.disabled = !nameEditable();
    const lock = input.parentElement.querySelector('.ico');
    if (nameEditable()) lock?.remove();
    paintFoot();
  }
  function paintFlag() {
    const box = $('ac-flag');
    if (!box) return;
    box.innerHTML = flagField();
    if (S.flagOpen) { const q = $('ac-flag-q'); q.focus(); q.setSelectionRange(q.value.length, q.value.length); }
    paintFoot();
  }

  // Fresh values replace the opening ones in every field the player has not touched yet.
  function applyFresh(u) {
    const before = S.base;
    S.user = u;
    S.base = fromUser(u);
    for (const k of ['username', 'flag', 'bio', 'spectator', 'hideOnline']) if (S.draft[k] === before[k]) S.draft[k] = S.base[k];
    if (S.draft.links.join('\n') === before.links.join('\n')) S.draft.links = [...S.base.links];
    S.fresh = true;
    $('ac-ident').innerHTML = identity(u);
    if (!S.touched.has('ac-name')) $('ac-name').value = S.draft.username;
    if (!S.touched.has('ac-bio')) { $('ac-bio').value = S.draft.bio; $('ac-bio-n').textContent = `${S.draft.bio.length.toLocaleString('en-US')} / ${BIO_MAX.toLocaleString('en-US')}`; }
    [0, 1].forEach(i => { if (!S.touched.has(`ac-link-${i}`)) $(`ac-link-${i}`).value = S.draft.links[i]; });
    S.dlg.querySelectorAll('[data-ac-sw]').forEach(b => b.setAttribute('aria-checked', String(S.draft[b.dataset.acSw])));
    paintFlag();
    paintName();
  }

  function loadName() {
    S.product = null; S.productError = '';
    paintName();
    const mine = S;
    RhythiaX.ExodusData.account.nameChange().then(p => {
      if (S !== mine) return;
      S.product = p || { allowed: false };
      paintName();
    }).catch(() => { if (S === mine) { S.productError = 'Could not check name change availability.'; paintName(); } });
  }

  // ─── Saving ──────
  async function save() {
    if (!S || S.saving || !S.fresh) return;
    const d = S.draft, b = S.base, u = S.user, list = changes();
    if (!list.length) return;
    // Links are checked only when they were edited; links saved earlier (or by Rhythia) are kept as they are.
    const linksEdited = list.includes('links');
    const links = linksEdited ? d.links.map(normalLink) : d.links.map(l => String(l || '').trim());
    const bad = linksEdited && d.links.find((l, i) => links[i] === null);
    if (bad) { S.toast(`“${bad.trim()}” is not a supported link. Use https:// and one of the listed sites.`); return; }
    const name = d.username.trim();
    if (nameEditable() && !name) { S.toast('Your username cannot be empty.'); return; }
    const profileChanged = list.some(k => ['username', 'flag', 'spectator privacy', 'online list'].includes(k));
    const aboutChanged = list.includes('about me') || list.includes('links');
    S.saving = true;
    paintFoot();
    try {
      if (profileChanged) {
        // Rhythia's own save: the name, avatar and banner always, privacy and flag only when they change.
        const data = { username: nameEditable() ? name : b.username, avatar_url: u.avatar_url || '', profile_image: u.profile_image || '' };
        if (privacyAllowed(u) && d.spectator !== b.spectator) data.spectator_privacy = d.spectator;
        if (privacyAllowed(u) && d.hideOnline !== b.hideOnline) data.hide_from_online_list = d.hideOnline;
        if (canFlag(u) && d.flag !== b.flag) data.flag = d.flag;
        await RhythiaX.ExodusData.account.save(data);
      }
      if (aboutChanged) {
        try {
          await S.saveAbout(d.bio.trim(), links.filter(Boolean));
        } catch (err) {
          throw new Error(profileChanged ? `Your profile was saved, but not your about me: ${err.message}` : err.message);
        }
      }
    } catch (err) {
      if (!S) return;
      S.saving = false;
      paintFoot();
      S.toast(`Could not save: ${err.message}`);
      if (profileChanged) loadName();
      return;
    }
    const done = S;
    close();
    done.toast(list.length === 1 ? `Your ${list[0]} is saved on Rhythia.` : 'Your settings are saved on Rhythia.');
    done.onSaved();
  }

  // ─── Events ──────
  function onClick(e) {
    if (!S) return;
    // A click on the backdrop closes the window, unless something is not saved yet.
    if (e.target === S.dlg) { if (!changes().length) close(); return; }
    const flag = e.target.closest('[data-flag]');
    if (flag) {
      S.flagOpen = false; S.flagQ = '';
      if (flag.dataset.flag !== S.draft.flag) S.flagAsk = flag.dataset.flag;
      paintFlag();
      return;
    }
    const swb = e.target.closest('[data-ac-sw]');
    if (swb) {
      const k = swb.dataset.acSw;
      S.draft[k] = !S.draft[k];
      swb.setAttribute('aria-checked', String(S.draft[k]));
      paintFoot();
      return;
    }
    const t = e.target.closest('[data-ac]');
    if (!t) { if (S.flagOpen && !e.target.closest('.ac-pick')) { S.flagOpen = false; paintFlag(); } return; }
    const act = t.dataset.ac;
    if (act === 'close') close();
    else if (act === 'save') save();
    else if (act === 'retry-name') loadName();
    else if (act === 'flag-open') { S.flagOpen = !S.flagOpen; S.flagQ = ''; paintFlag(); }
    else if (act === 'flag-keep') { S.flagAsk = ''; paintFlag(); }
    else if (act === 'flag-yes') { S.draft.flag = S.flagAsk; S.flagAsk = ''; paintFlag(); }
    else if (act === 'rhythia') {
      // Uploads, purchases and login changes are Rhythia's; anything typed here is kept until the next open.
      const go = S.rhythiaSettings, why = t.dataset.why;
      close();
      go(why);
    }
  }
  function onInput(e) {
    if (!S) return;
    const id = e.target.id, v = e.target.value;
    S.touched.add(id);
    if (id === 'ac-flag-q') { S.flagQ = v; $('ac-flag-list').innerHTML = flagOptions(); return; }
    if (id === 'ac-name') S.draft.username = v;
    else if (id === 'ac-bio') { S.draft.bio = v; $('ac-bio-n').textContent = `${v.length.toLocaleString('en-US')} / ${BIO_MAX.toLocaleString('en-US')}`; }
    else if (/^ac-link-[01]$/.test(id)) S.draft.links[Number(id.slice(-1))] = v;
    paintFoot();
  }
  function onKey(e) {
    if (!S) return;
    if (e.key === 'Escape' && (S.flagOpen || S.flagAsk)) { e.preventDefault(); S.flagOpen = false; S.flagAsk = ''; paintFlag(); return; }
    if (e.key === 'Enter' && e.target.id === 'ac-flag-q') { e.preventDefault(); S.dlg.querySelector('#ac-flag-list [data-flag]')?.click(); }
  }

  function close() {
    if (!S) return;
    const { dlg, ac } = S;
    S = null;
    ac.abort();
    if (dlg.open) dlg.close();
    dlg.innerHTML = '';
  }

  // opts: { dlg, me, toast, saveAbout, rhythiaSettings, onSaved }
  function open(opts) {
    if (S) return;
    const ac = new AbortController();
    const u = opts.me || null;
    S = { ...opts, ac, user: u, base: fromUser(u), draft: fromUser(u), fresh: false, saving: false, product: null, productError: '', login: null, loginError: '',
      flagOpen: false, flagQ: '', flagAsk: '', touched: new Set() };
    const dlg = opts.dlg;
    // Without a kept copy of the profile (rare), the window waits for it instead of showing wrong values.
    dlg.innerHTML = u ? body() : `<div class="ac-head"><div><h2 id="ac-title">Settings</h2><p>Your profile, flag and privacy on Rhythia.</p></div><button class="iconbtn" type="button" data-ac="close" aria-label="Close">${ico('x')}</button></div>
      <div class="ac-body"><div class="skeleton" style="height:150px;border-radius:12px"></div><div class="skeleton" style="width:40%;margin-top:22px"></div><div class="skeleton" style="height:40px;margin-top:22px;border-radius:9px"></div><div class="skeleton" style="height:96px;margin-top:22px;border-radius:9px"></div></div>
      <div class="ac-foot"><span class="ac-hint" id="ac-hint"></span><button class="btn" type="button" data-ac="close">Cancel</button><button class="btn primary" type="button" id="ac-save" disabled>Save changes</button></div>`;
    dlg.showModal();
    dlg.querySelector('.ac-body').scrollTop = 0;
    dlg.addEventListener('click', onClick, { signal: ac.signal });
    dlg.addEventListener('input', onInput, { signal: ac.signal });
    dlg.addEventListener('keydown', onKey, { signal: ac.signal });
    dlg.addEventListener('close', () => { if (S?.dlg === dlg) close(); }, { signal: ac.signal });
    paintFoot();
    const mine = S, A = RhythiaX.ExodusData.account;
    A.profile(ac.signal).then(fresh => {
      if (S !== mine || !fresh) return;
      if (!S.user) {
        S.user = fresh; S.base = fromUser(fresh); S.draft = fromUser(fresh); S.fresh = true;
        dlg.innerHTML = body();
        paintName();
        if (S.login || S.loginError) $('ac-login').innerHTML = loginRows();
        return;
      }
      applyFresh(fresh);
    })
      .catch(err => { if (S === mine) { $('ac-hint').textContent = `Could not read your profile (${err.message}). Close and try again.`; } });
    loadName();
    A.login(ac.signal).then(l => { if (S === mine) { S.login = l; if ($('ac-login')) $('ac-login').innerHTML = loginRows(); } })
      .catch(() => { if (S === mine) { S.loginError = 'Could not check your login. You can still manage it in Rhythia’s window.'; if ($('ac-login')) $('ac-login').innerHTML = loginRows(); } });
  }

  const css = `
dialog.acct{width:min(640px,calc(100vw - 24px));max-height:calc(100vh - 32px);overflow:hidden}
dialog.acct[open]{display:flex;flex-direction:column}
.ac-head{display:flex;align-items:flex-start;gap:12px;padding:18px 22px 14px}
.ac-head h2{margin:0;font-size:18px;font-weight:700}
.ac-head p{margin:2px 0 0;font-size:13px;color:var(--muted)}
.ac-head .iconbtn{margin-left:auto}
.ac-body{flex:1;min-height:0;overflow-y:auto;overscroll-behavior:contain;padding:0 22px 20px;scrollbar-width:thin}
.ac-foot{display:flex;align-items:center;gap:10px;padding:12px 22px;border-top:1px solid var(--line)}
.ac-hint{flex:1;font-size:13px;color:var(--muted)}
.ac-hint b{color:var(--text-2);font-weight:600}
.ac-foot .btn:disabled{opacity:.5;cursor:default;transform:none}
.ac-banner{position:relative;height:150px;border-radius:12px;background:var(--panel-2) center/cover no-repeat}
.ac-size{position:absolute;right:10px;top:10px;padding:2px 8px;border-radius:6px;font-size:11.5px;color:#fff;background:rgba(var(--glass),.6);backdrop-filter:blur(6px)}
.ac-plate{position:absolute;right:10px;bottom:10px;display:inline-flex;align-items:center;gap:7px;height:30px;padding:0 11px;border:0;border-radius:9px;font-size:13px;font-weight:600;color:#fff;background:rgba(var(--glass),.68);box-shadow:inset 0 0 0 1px rgba(255,255,255,.16);backdrop-filter:blur(8px)}
.ac-plate:hover{background:rgba(var(--glass),.85)}
.ac-who{position:relative;display:flex;align-items:flex-end;gap:14px;margin:-40px 0 0 16px}
.ac-who b{display:block;font-size:18px;font-weight:700;line-height:1.25}
.ac-who small{font-size:12.5px;color:var(--muted)}
.ac-who small a{color:var(--text-2);text-decoration:none}
.ac-who small a:hover{color:var(--accent-2)}
.ac-who small b{display:inline;font-size:inherit;font-weight:600;color:var(--text-2)}
.ac-ava{position:relative;flex:none;width:86px;height:86px;padding:0;border:0;border-radius:16px;background:var(--panel-3) center/cover no-repeat;box-shadow:0 0 0 3px var(--dialog)}
.ac-ava span{position:absolute;right:4px;bottom:4px;display:grid;place-items:center;width:26px;height:26px;border-radius:8px;color:#fff;background:rgba(var(--glass),.72);box-shadow:inset 0 0 0 1px rgba(255,255,255,.18)}
.ac-sec{position:relative;margin-top:22px;padding-top:14px}
.ac-sec::before{content:"";position:absolute;left:0;right:0;top:0;height:2px;background:var(--line-2)}
.exo[data-variant="float"] .ac-sec{margin-top:16px;padding:16px;border-radius:14px;background:rgba(var(--ink),.03);box-shadow:inset 0 0 0 1px var(--line)}
.exo[data-variant="float"] .ac-sec::before{display:none}
.ac-sec h3{margin:0 0 12px;font-size:11.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--muted)}
.ac-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px 16px}
.ac-f label,.ac-l{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px;font-size:13px;font-weight:600;color:var(--text-2)}
.ac-f label small{font-weight:400;color:var(--muted)}
.ac-f .field{width:100%;height:40px;font-size:14px}
.ac-f textarea.field{height:auto;min-height:96px;padding:10px 12px;resize:vertical;font:400 14px/1.5 var(--font);color:var(--text)}
.ac-f input.field{padding:0 12px;color:var(--text);font:inherit;font-size:14px;border:0;outline:none}
.ac-f input.field:focus,.ac-f textarea.field:focus{box-shadow:inset 0 0 0 1px var(--accent)}
.ac-f input.field:disabled{color:var(--muted);cursor:not-allowed}
.ac-name{position:relative}
.ac-name .ico{position:absolute;right:12px;top:12px;color:var(--muted)}
.ac-help{margin:6px 0 0;font-size:12.5px;line-height:1.45;color:var(--muted)}
.ac-warn{color:var(--p2-text,#fbbf24);font-weight:600}
.exo[data-theme="white"] .ac-warn{color:#b45309}
.ac-link{padding:0;border:0;background:none;color:var(--accent-2);font:inherit;font-weight:600;cursor:pointer}
.ac-sm{height:32px;padding:0 12px;font-size:13px;margin-top:8px}
.ac-btn-sk{display:block;width:170px;height:32px;margin-top:8px;border-radius:9px}
.ac-line-sk{display:block;height:11px;margin:4px 0 7px}
.ac-select{display:flex;align-items:center;gap:10px;width:100%;padding:0 12px;border:0;text-align:left;color:var(--text);cursor:pointer}
.ac-select span{flex:1}
.ac-select .ico{color:var(--muted)}
.ac-select:disabled{cursor:not-allowed;opacity:.6}
.ac-flag{width:24px;height:16px;flex:none;border-radius:3px;object-fit:cover;box-shadow:0 0 0 1px rgba(0,0,0,.18)}
#ac-flag{position:relative}
.ac-pick{position:absolute;z-index:5;left:0;right:0;top:46px;border-radius:12px;background:var(--dialog);box-shadow:0 0 0 1px var(--line-2),0 18px 40px rgba(0,0,0,calc(.45 * var(--sh)));overflow:hidden}
.ac-search{display:flex;align-items:center;gap:8px;height:40px;margin:6px;padding:0 10px;border-radius:9px}
.ac-search input{flex:1;min-width:0;border:0;background:none;outline:none;color:var(--text);font:inherit;font-size:14px}
.ac-list{max-height:220px;overflow-y:auto;padding:0 6px 6px;scrollbar-width:thin}
.ac-list button{display:flex;align-items:center;gap:10px;width:100%;height:34px;padding:0 8px;border:0;border-radius:8px;background:none;color:var(--text-2);font:inherit;font-size:13.5px;text-align:left;cursor:pointer}
.ac-list button:hover{background:rgba(var(--ink),.06);color:var(--text)}
.ac-list button.on{background:var(--accent-soft);color:var(--text)}
.ac-confirm{padding:12px;border-radius:12px;background:color-mix(in srgb,var(--p2,#f59e0b) 10%,transparent);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--p2,#f59e0b) 40%,transparent)}
.ac-confirm p{margin:0;font-size:13px;line-height:1.45;color:var(--text-2)}
.ac-confirm p b{color:var(--text)}
.ac-confirm div{display:flex;flex-wrap:wrap;gap:8px}
.ac-row{display:flex;align-items:center;gap:14px;padding:10px 0}
.ac-row + .ac-row{border-top:1px solid var(--line)}
.ac-tx{flex:1;min-width:0}
.ac-tx b{display:block;font-size:14px;font-weight:650}
.ac-tx small{display:block;font-size:12.5px;color:var(--muted);overflow-wrap:anywhere}
.ac-row .ac-sm{margin-top:0}
.ac-chip{flex:none;display:inline-flex;align-items:center;gap:6px;height:24px;padding:0 9px;border-radius:999px;font-size:12px;font-weight:600;color:var(--muted);background:rgba(var(--ink),.06)}
.ac-chip.ok{color:var(--text-2)}
.ac-chip.ok::before{content:"";width:7px;height:7px;border-radius:50%;background:var(--good)}
.ac-sw{position:relative;flex:none;width:40px;height:23px;padding:0;border:0;border-radius:999px;background:rgba(var(--ink),.14);box-shadow:inset 0 0 0 1px rgba(var(--ink),.1);cursor:pointer;transition:background-color .2s}
.ac-sw::after{content:"";position:absolute;top:3px;left:3px;width:17px;height:17px;border-radius:50%;background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.3);transition:transform .25s var(--ease)}
.ac-sw[aria-checked="true"]{background:var(--accent);box-shadow:none}
.ac-sw[aria-checked="true"]::after{transform:translateX(17px)}
@media (max-width:560px){.ac-grid{grid-template-columns:1fr}.ac-head,.ac-foot{padding-left:16px;padding-right:16px}.ac-body{padding:0 16px 16px}.ac-hint{display:none}}
`;

  return { open, close, css, isOpen: () => Boolean(S) };
})();
