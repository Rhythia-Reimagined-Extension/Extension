// Notifications in the bottom-right corner of Rhythia, with either look. Each one is a card in one stack:
// the first shown sits at the bottom, later ones above it. The stack follows the look on screen: Exodus
// cards when Exodus owns the page (html.rhythiax-exodus, in its theme), Classic cards otherwise (Classic's
// theme from html[data-rhythiax-theme]). Each look's colours are its skin, a string of rules it registers
// in RhythiaX.NoticeSkins before this file runs (legacy/core/notice-skin.js, exodus/core/notice-skin.js);
// a look without one gets plain system colours.
//   RhythiaX.Notices.show({ id, label, title, body: [paragraphs], actions: [{ text, kind, run(event) }], check, link })
//   returns { setStatus(text), setBusy(on), checked(), close() }; actions run only on trusted clicks. check: { text }
//   adds a checkbox under the buttons, read with checked().
var RhythiaX = RhythiaX || {};

(function () {
  if (RhythiaX.Notices || typeof document === 'undefined' || typeof window === 'undefined') return;
  if (window.top && window.top !== window) return;

  const html = document.documentElement;
  let host = null, shadow = null, stack = null, observer = null, sheet = null, built = null;
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
    .check { display: flex; align-items: center; gap: 8px; margin-top: 10px; font-size: 12px; cursor: pointer; user-select: none; }
    .check input { flex: none; width: 14px; height: 14px; margin: 0; cursor: pointer; }
    .status { margin-top: 8px; }
    .status:empty { display: none; }
  `;
  const LOOKS = ['classic', 'exodus'];
  // Readable in either colour scheme without a palette of its own.
  const plain = look => `
    :host([data-look="${look}"]) { color-scheme: light dark; }
    :host([data-look="${look}"]) .note { background: Canvas; color: CanvasText; border: 1px solid GrayText; border-radius: 12px; font: 13px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif; }
    :host([data-look="${look}"]) .label { color: GrayText; }
    :host([data-look="${look}"]) .act { border: 1px solid ButtonBorder; border-radius: 8px; background: ButtonFace; color: ButtonText; }
    :host([data-look="${look}"]) .act.primary { border-color: Highlight; background: Highlight; color: HighlightText; }
    :host([data-look="${look}"]) a { color: LinkText; }
    :host([data-look="${look}"]) .check input { accent-color: Highlight; }
    :host([data-look="${look}"]) :focus-visible { outline: 2px solid Highlight; outline-offset: 2px; }
  `;
  const skinOf = look => { const s = RhythiaX.NoticeSkins?.[look]; return typeof s === 'string' ? s : ''; };

  // The stack's rules: the base, then each look's skin. A skin that registers after the stack was made
  // (Classic added to a tab whose page Exodus gave back) is taken in the next time this runs.
  function restyle() {
    const key = LOOKS.map(look => (skinOf(look) ? look : '')).join();
    if (!sheet || key === built) return;
    built = key;
    const text = css + LOOKS.map(look => skinOf(look) || plain(look)).join('');
    if (typeof sheet.replaceSync === 'function') sheet.replaceSync(text); else sheet.textContent = text;
  }

  // Which look and theme the stack wears: read from the page each time either changes.
  function paint() {
    if (!host) return;
    restyle();
    const exodus = html.classList.contains('rhythiax-exodus');
    host.dataset.look = exodus ? 'exodus' : 'classic';
    const theme = exodus ? html.dataset.rhythiaxExodusTheme : html.getAttribute('data-rhythiax-theme');
    host.dataset.theme = theme === 'white' || theme === 'dark' ? theme : 'reimagined';
  }

  // Rhythia redraws parts of the body; the stack goes back if it was taken out, unless the extension was
  // reloaded or removed under this page (its runtime has no id then).
  function attach() {
    if (!host || !cards.size || !document.body || typeof chrome === 'undefined' || !chrome.runtime?.id) return;
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
      sheet = new CSSStyleSheet(); restyle(); shadow.adoptedStyleSheets = [sheet];
    } else {
      sheet = document.createElement('style'); restyle(); shadow.appendChild(sheet);
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
    restyle();
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
    let box = null;
    if (spec.check) {
      const label = el('label', 'check');
      box = document.createElement('input');
      box.type = 'checkbox';
      label.append(box, document.createTextNode(spec.check.text));
      card.appendChild(label);
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
      checked: () => Boolean(box?.checked),
      close: () => close(id),
    };
    card.handle = handle;
    cards.set(id, card);
    stack.appendChild(card);
    if (document.body) attach();
    else document.addEventListener('DOMContentLoaded', attach, { once: true });
    return handle;
  }

  RhythiaX.Notices = { show };
})();
