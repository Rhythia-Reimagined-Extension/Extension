// =============================================
// Reimagined for Rhythia — Exodus notice skin
// =============================================
// Exodus' colours for the notification stack (shared/notices.js), which builds its sheet from the
// skins registered here. Loaded right before shared/notices.js; the values copy exodus/core/assets.js
// for each theme (html[data-rhythiax-exodus-theme]), so change both together.

var RhythiaX = RhythiaX || {};

RhythiaX.NoticeSkins = RhythiaX.NoticeSkins || {};
RhythiaX.NoticeSkins.exodus = `
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
