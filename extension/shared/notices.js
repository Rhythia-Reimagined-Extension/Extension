// Notifications in the bottom-right corner of Rhythia, with either look. Each one is a card in one stack:
// the first shown sits at the bottom, later ones above it. The stack follows the look on screen: Exodus
// cards when Exodus owns the page (html.rhythiax-exodus, in its theme), Classic cards otherwise (Classic's
// palette, which legacy/core/theme.js writes on the root element).
//   RhythiaX.Notices.show({ id, label, title, body: [paragraphs], actions: [{ text, kind, run(event) }], link })
//   returns { setStatus(text), setBusy(on), close() }; actions run only on trusted clicks.
var RhythiaX = RhythiaX || {};

(function () {
  if (RhythiaX.Notices || typeof document === 'undefined' || typeof window === 'undefined') return;
  if (window.top && window.top !== window) return;

  const html = document.documentElement;
  let host = null, shadow = null, stack = null, observer = null;
  const cards = new Map();
  const css = `
    :host { all: initial; position: fixed; right: 18px; bottom: 18px; z-index: 2147483646; width: min(320px, calc(100vw - 36px)); }
    * { box-sizing: border-box; }
    .stack { display: flex; flex-direction: column-reverse; gap: 10px; max-height: calc(100dvh - 36px); overflow: auto; overscroll-behavior: contain; scrollbar-width: none; }
    .note { position: relative; flex: none; padding: 16px; animation: in .22s cubic-bezier(.2,.7,.2,1); }
    .note.out { animation: out .16s ease forwards; }
    @keyframes in { from { opacity: 0; transform: translateY(10px); } }
    @keyframes out { to { opacity: 0; transform: translateY(6px); } }
    @media (prefers-reduced-motion: reduce) { .note, .note.out { animation: none; } }
    .label { display: block; margin: 0 0 6px; font-size: 11px; font-weight: 600; letter-spacing: .06em; text-transform: uppercase; }
    h2 { margin: 0 0 8px; font-size: 16px; line-height: 1.3; font-weight: 700; }
    p { margin: 0 0 8px; }
    .actions { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 12px; }
    .actions.one { grid-template-columns: 1fr; }
    button { font: inherit; cursor: pointer; }
    .act { min-height: 36px; padding: 8px 10px; font-size: 13px; font-weight: 600; line-height: 1.25; }
    .act:disabled { opacity: .6; cursor: wait; }
    a { display: inline-block; margin-top: 10px; font-size: 12px; text-decoration: none; }
    a:hover { text-decoration: underline; }
    .status { margin-top: 8px; }
    .status:empty { display: none; }

    /* Classic: the active Classic theme's colours, with the Reimagined preset as fallback. */
    :host([data-look="classic"]) { color-scheme: dark; }
    :host([data-look="classic"][data-theme="white"]) { color-scheme: light; }
    :host([data-look="classic"]) .note {
      background: var(--rhythiax-surface, #1a1226); color: var(--rhythiax-text, #faf5ff);
      border: 1.5px solid var(--rhythiax-border-strong, rgba(216,180,254,.22)); border-radius: var(--rhythiax-radius, 16px);
      box-shadow: 0 16px 40px rgba(0,0,0,.45); font: 13px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif;
    }
    :host([data-look="classic"][data-theme="white"]) .note { box-shadow: 0 8px 28px rgba(15,23,42,.14); }
    :host([data-look="classic"]) .label { color: var(--rhythiax-accent, #c084fc); }
    :host([data-look="classic"]) p { color: var(--rhythiax-text-muted, #c4b5d8); }
    :host([data-look="classic"]) h2 { color: var(--rhythiax-text-strong, #faf5ff); }
    :host([data-look="classic"]) .act { border-radius: 9px; border: 1.5px solid var(--rhythiax-border-strong, rgba(216,180,254,.22)); background: var(--rhythiax-inner-surface, #221634); color: var(--rhythiax-text, #faf5ff); }
    :host([data-look="classic"]) .act.primary { border-color: transparent; background: var(--rhythiax-accent, #c084fc); color: var(--rhythiax-page-bg, #120b1c); }
    :host([data-look="classic"][data-theme="white"]) .act.primary { background: #6d28d9; color: #fff; }
    :host([data-look="classic"]) .act:hover:not(:disabled) { filter: brightness(1.12); }
    :host([data-look="classic"]) a { color: var(--rhythiax-accent, #c084fc); }
    :host([data-look="classic"][data-theme="white"]) a { color: #6d28d9; }
    :host([data-look="classic"]) .status { color: var(--rhythiax-danger, #ef4444); }
    :host([data-look="classic"]) :focus-visible { outline: 2px solid var(--rhythiax-accent, #c084fc); outline-offset: 2px; }

    /* Exodus: the same palette as exodus/core/assets.js for each theme. */
    :host([data-look="exodus"]) {
      color-scheme: dark; --panel: #111318; --panel-2: #171a20; --panel-3: #1d2028; --line-2: rgba(255,255,255,.12);
      --text: #f4f5f7; --text-2: #c5cad3; --muted: #8a929f; --accent: #60a5fa; --accent-2: #93c5fd; --on-accent: #06121f; --bad: #f87171; --sh: rgba(0,0,0,.5);
    }
    :host([data-look="exodus"][data-theme="reimagined"]) {
      --panel: #151021; --panel-2: #1c162b; --panel-3: #251e38; --line-2: rgba(205,180,255,.16);
      --text: #f6f2fd; --text-2: #d0c7e2; --muted: #968aad; --accent: #c084fc; --accent-2: #d8b4fe; --on-accent: #1d0b33;
    }
    :host([data-look="exodus"][data-theme="white"]) {
      color-scheme: light; --panel: #fff; --panel-2: #f2f4f7; --panel-3: #e8ebf0; --line-2: rgba(15,23,42,.15);
      --text: #0f172a; --text-2: #334155; --muted: #64748b; --accent: #2563eb; --accent-2: #1d4ed8; --on-accent: #fff; --bad: #dc2626; --sh: rgba(15,23,42,.16);
    }
    :host([data-look="exodus"]) .note {
      background: var(--panel); color: var(--text); border: 1px solid var(--line-2); border-radius: 14px;
      box-shadow: 0 12px 32px var(--sh); font: 400 13px/1.5 "Inter", "Segoe UI Variable Text", "Segoe UI", system-ui, -apple-system, sans-serif;
      -webkit-font-smoothing: antialiased;
    }
    :host([data-look="exodus"]) .label { color: var(--muted); }
    :host([data-look="exodus"]) h2 { font-weight: 600; letter-spacing: -.01em; }
    :host([data-look="exodus"]) p { color: var(--text-2); }
    :host([data-look="exodus"]) .act { border: 0; border-radius: 10px; background: var(--panel-2); color: var(--text); transition: background-color .15s; }
    :host([data-look="exodus"]) .act:hover:not(:disabled) { background: var(--panel-3); }
    :host([data-look="exodus"]) .act.primary { background: var(--accent); color: var(--on-accent); }
    :host([data-look="exodus"]) .act.primary:hover:not(:disabled) { background: var(--accent-2); }
    :host([data-look="exodus"]) a { color: var(--accent); }
    :host([data-look="exodus"]) .status { color: var(--bad); }
    :host([data-look="exodus"]) :focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
  `;

  // Which look and theme the stack wears: read from the page each time either changes.
  function paint() {
    if (!host) return;
    const exodus = html.classList.contains('rhythiax-exodus');
    host.dataset.look = exodus ? 'exodus' : 'classic';
    const theme = exodus ? html.dataset.rhythiaxExodusTheme : html.getAttribute('data-rhythiax-theme');
    host.dataset.theme = theme === 'white' || theme === 'dark' ? theme : 'reimagined';
  }

  // Rhythia redraws parts of the body; the stack goes back if it was taken out.
  function attach() {
    if (!host || !cards.size || !document.body || RhythiaX.extensionContextInvalidated) return;
    if (!host.isConnected) document.body.appendChild(host);
    if (!observer && typeof MutationObserver === 'function') {
      observer = new MutationObserver(records => {
        if (records.some(r => r.type === 'attributes')) paint();
        if (!host.isConnected) attach();
      });
      observer.observe(html, { attributes: true, attributeFilter: ['class', 'data-rhythiax-exodus-theme', 'data-rhythiax-theme'] });
      observer.observe(document.body, { childList: true });
    }
  }

  function ensureHost() {
    if (host) return true;
    const node = document.createElement('div');
    if (typeof node.attachShadow !== 'function') return false;
    host = node;
    host.id = 'rhythiax-notices';
    shadow = host.attachShadow({ mode: 'closed' });
    if (typeof CSSStyleSheet === 'function' && 'adoptedStyleSheets' in shadow) {
      const sheet = new CSSStyleSheet(); sheet.replaceSync(css); shadow.adoptedStyleSheets = [sheet];
    } else {
      const style = document.createElement('style'); style.textContent = css; shadow.appendChild(style);
    }
    stack = document.createElement('div');
    stack.className = 'stack';
    shadow.appendChild(stack);
    paint();
    return true;
  }

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function close(id) {
    const card = cards.get(id);
    if (!card) return;
    cards.delete(id);
    const remove = () => {
      card.remove();
      if (!cards.size) { host?.remove(); observer?.disconnect(); observer = null; }
    };
    const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (still || !card.isConnected) return remove();
    card.classList.add('out');
    card.addEventListener('animationend', remove, { once: true });
    setTimeout(remove, 300);
  }

  function show(spec) {
    const id = String(spec.id);
    if (cards.has(id)) return cards.get(id).handle;
    // Without Shadow DOM there is nowhere to draw it safely, and nothing is shown.
    if (!ensureHost()) return { setStatus() {}, setBusy() {}, close() {} };
    const card = el('section', 'note');
    card.setAttribute('role', 'region');
    card.setAttribute('aria-label', spec.title);
    if (spec.label) card.appendChild(el('span', 'label', spec.label));
    card.appendChild(el('h2', '', spec.title));
    for (const line of spec.body || []) card.appendChild(el('p', '', line));
    const buttons = [];
    if (spec.actions?.length) {
      const row = el('div', spec.actions.length === 1 ? 'actions one' : 'actions');
      for (const action of spec.actions) {
        const button = el('button', `act ${action.kind || ''}`.trim(), action.text);
        button.type = 'button';
        button.addEventListener('click', event => { if (event.isTrusted && !button.disabled) action.run(event); });
        row.appendChild(button);
        buttons.push(button);
      }
      card.appendChild(row);
    }
    const status = el('div', 'status');
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    card.appendChild(status);
    if (spec.link) {
      const a = el('a', '', spec.link.text);
      a.href = spec.link.href; a.target = '_blank'; a.rel = 'noreferrer';
      card.appendChild(a);
    }
    const handle = {
      setStatus: text => { status.textContent = text || ''; },
      setBusy: on => { for (const b of buttons) b.disabled = Boolean(on); },
      close: () => close(id),
    };
    card.handle = handle;
    cards.set(id, card);
    stack.appendChild(card);
    if (document.body) attach();
    else document.addEventListener('DOMContentLoaded', attach, { once: true });
    return handle;
  }

  RhythiaX.Notices = { show, close, has: id => cards.has(String(id)) };
})();
