// =============================================
// Reimagined for Rhythia — Exodus notifications
// =============================================
// The bell in the header, beside Settings, for a signed-in player: Rhythia's own notification list
// (getNotifications), read the way Rhythia reads it (every minute while the tab is in front, when the tab comes
// back, and when the bell is opened). Clan invites are answered here (Accept, Decline); other notices open their
// page, and those Rhythia marks as dismissible have Mark as read. core/shell.js starts it and tells it who is
// signed in (setMe).

var RhythiaX = RhythiaX || {};

RhythiaX.ExodusNotify = (function () {
  'use strict';

  const Data = () => RhythiaX.ExodusData;
  const K = () => RhythiaX.ExodusKit;
  const EVERY = 60e3;
  const BELL = '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>';
  const ICON = '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/></svg>';
  const CHECK = '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';
  const CROSS = '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>';

  let root = null, opts = {}, me = '', timer = 0, seq = 0;
  const S = { items: [], pending: 0, loading: false, err: '', open: false, busy: '' };
  const $ = id => root?.getElementById(id);

  function bellHtml() {
    const n = S.pending;
    return `<button class="iconbtn nt-bell" type="button" data-notify aria-expanded="${S.open}" aria-label="Notifications${n ? `, ${n} pending` : ''}" data-tip="Notifications">${BELL}${n ? `<span class="nt-count num">${n > 99 ? '99+' : n}</span>` : ''}</button>`;
  }
  function row(x) {
    const {esc, cssUrl} = K(), inv = x.invite, busy = Boolean(S.busy);
    const pic = x.avatarUrl || inv ? `<i class="nt-pic" style="background-image:${cssUrl(x.avatarUrl || inv?.clan?.avatar_url || '')}"></i>` : `<i class="nt-pic none">${ICON}</i>`;
    const act = inv
      ? `<span class="nt-acts"><button class="iconbtn" type="button" data-nt-deny="${esc(inv.id)}" ${busy ? 'disabled' : ''} aria-label="Decline invite from ${esc(inv.clan?.name)}" data-tip="Decline">${CROSS}</button><button class="iconbtn ok" type="button" data-nt-accept="${esc(inv.id)}" ${busy ? 'disabled' : ''} aria-label="Accept invite from ${esc(inv.clan?.name)}" data-tip="Accept">${CHECK}</button></span>`
      : x.dismissible ? `<span class="nt-acts"><button class="btn mini" type="button" data-nt-read="${esc(x.id)}" ${busy ? 'disabled' : ''}>${S.busy === String(x.id) ? 'Saving…' : 'Mark as read'}</button></span>` : '';
    return `<div class="nt-row"><a class="nt-main" href="${esc(/^\/(?![/\\])/.test(x.href || '') ? x.href : '#')}" data-nt-go="${esc(x.id)}">${pic}<span><b>${esc(x.title)}</b><small>${esc(x.message)}</small></span></a>${act}</div>`;
  }
  function popHtml() {
    const {esc, fmt} = K();
    const body = S.err && !S.items.length ? `<div class="nt-empty"><p>${esc(S.err)}</p><button class="btn mini" type="button" data-nt-retry>Try again</button></div>`
      : S.loading && !S.items.length ? '<div class="nt-empty"><p>Loading notifications…</p></div>'
      : !S.items.length ? '<div class="nt-empty"><p>No pending notifications.</p></div>'
      : S.items.map(row).join('') + (S.pending > S.items.length ? `<p class="nt-more">Showing ${fmt(S.items.length)} of ${fmt(S.pending)}. More appear as you clear these.</p>` : '');
    return `<div class="nt-head"><b>Notifications</b><span>${S.pending ? `${fmt(S.pending)} pending` : 'Invites and updates for you'}</span></div><div class="nt-list">${body}</div>`;
  }
  function draw() {
    const slot = $('bell');
    if (!slot) return;
    if (!me) { slot.innerHTML = ''; return; }
    K().morph(slot, bellHtml() + (S.open ? `<div class="nt-pop" id="nt-pop" role="dialog" aria-label="Notifications">${popHtml()}</div>` : ''));
  }

  async function load() {
    if (!me || !Data().session()) return;
    const n = ++seq, who = me;
    S.loading = true; if (S.open) draw();
    try {
      const r = await Data().notes.list();
      if (n !== seq || who !== me) return;
      S.items = r.items; S.pending = r.pending; S.err = '';
    } catch (err) {
      if (n !== seq) return;
      S.err = 'Notifications did not load.';
    }
    S.loading = false;
    draw();
  }
  function schedule() {
    clearInterval(timer);
    if (me) timer = setInterval(() => { if (!document.hidden) load(); }, EVERY);
  }
  function setOpen(open) {
    S.open = open; draw();
    if (open) load();
  }

  async function act(fn, key, done) {
    if (S.busy) return;
    S.busy = key; draw();
    try { await fn(); if (done) opts.toast?.(done); } catch (err) { opts.toast?.(`Could not save: ${String(err.message || '').replace(/^\w+: /, '')}`); }
    S.busy = '';
    await load();
  }
  function onClick(e) {
    const t = e.target.closest?.('[data-notify],[data-nt-go],[data-nt-read],[data-nt-accept],[data-nt-deny],[data-nt-retry]');
    if (!t) { if (S.open && !e.target.closest?.('#nt-pop')) setOpen(false); return; }
    const d = t.dataset;
    if ('notify' in d) return setOpen(!S.open);
    if (d.ntRetry !== undefined) return load();
    if (d.ntAccept || d.ntDeny) {
      const id = d.ntAccept || d.ntDeny, x = S.items.find(i => String(i.invite?.id) === id), name = x?.invite?.clan?.name || 'the clan';
      return act(() => Data().notes.respond(id, d.ntAccept ? 'accept' : 'deny'), id, d.ntAccept ? `Joined ${name}.` : `Declined ${name}.`);
    }
    if (d.ntRead) { e.preventDefault(); return act(() => Data().notes.read(d.ntRead), d.ntRead); }
    if (d.ntGo) {
      // The shell's own link handling opens the page; a dismissible notice is marked as read on the way, as on Rhythia.
      const x = S.items.find(i => String(i.id) === d.ntGo);
      if (x?.dismissible) Data().notes.read(x.id).then(load, () => {});
      setOpen(false);
    }
  }

  // root is the shell's shadow root; o.toast shows a message.
  function start(r, o = {}) {
    root = r; opts = o;
    root.addEventListener('click', onClick);
    root.addEventListener('keydown', e => { if (e.key === 'Escape' && S.open) { setOpen(false); root.querySelector('[data-notify]')?.focus(); } });
    addEventListener('focus', () => { if (me) load(); });
    document.addEventListener('visibilitychange', () => { if (!document.hidden && me) load(); });
  }
  // Who is signed in (an id, or '' when nobody is): the bell shows only for a player.
  function setMe(id) {
    id = String(id || '');
    if (id === me) { draw(); return; }
    me = id; S.items = []; S.pending = 0; S.err = ''; S.open = false; seq++;
    draw(); schedule(); if (me) load();
  }

  const css = `
.site .me .nt-slot{position:relative;display:flex}
.nt-bell{position:relative}
.nt-count{position:absolute;top:-3px;right:-4px;display:grid;place-items:center;min-width:18px;height:18px;padding:0 5px;border-radius:9px;font-size:11px;font-weight:750;line-height:1;color:#fff;background:#e11d48;box-shadow:0 0 0 2px var(--page)}
.nt-pop{position:absolute;top:calc(100% + 12px);right:-46px;z-index:60;width:min(380px,calc(100vw - 24px));border-radius:14px;overflow:hidden;background:var(--dialog);box-shadow:0 0 0 1px var(--line-2),0 16px 40px rgba(0,0,0,.35);animation:ntIn .16s var(--ease)}
@keyframes ntIn{from{opacity:0;transform:translateY(-4px)}}
.nt-head{display:flex;align-items:baseline;justify-content:space-between;gap:12px;padding:14px 16px 12px;border-bottom:1px solid var(--line)}
.nt-head b{font-size:15px;font-weight:750}
.nt-head span{font-size:12.5px;color:var(--muted)}
.nt-list{max-height:min(440px,70vh);overflow:auto;overscroll-behavior:contain}
.nt-row{display:flex;align-items:center;gap:10px;padding:10px 12px 10px 16px;border-bottom:1px solid var(--line)}
.nt-row:last-child{border-bottom:0}
.nt-main{display:flex;align-items:center;gap:12px;flex:1;min-width:0}
.nt-main span{display:flex;flex-direction:column;min-width:0}
.nt-main b{font-size:13.5px;font-weight:650;color:var(--text)}
.nt-main small{font-size:12.5px;line-height:1.4;color:var(--text-2);overflow-wrap:anywhere}
.nt-main:hover b{color:var(--accent-2)}
.nt-pic{flex:none;width:36px;height:36px;border-radius:50%;background:var(--panel-3) center/cover}
.nt-pic.none{display:grid;place-items:center;color:var(--muted)}
.nt-pic.none .ico{width:16px;height:16px}
.nt-acts{display:flex;gap:6px;flex:none}
.nt-acts .iconbtn.ok{color:var(--on-accent);background:var(--accent)}
.nt-empty{display:flex;flex-direction:column;align-items:center;gap:10px;padding:28px 16px;text-align:center;color:var(--muted)}
.nt-empty p{margin:0}
.nt-more{margin:0;padding:10px 16px;font-size:12px;color:var(--muted);border-top:1px solid var(--line)}
@media (prefers-reduced-motion:reduce){.nt-pop{animation:none}}
`;

  return { start, setMe, css };
})();
