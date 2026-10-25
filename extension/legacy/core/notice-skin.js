// =============================================
// Reimagined for Rhythia — Classic notice skin
// =============================================
// Classic's colours for the notification stack (shared/notices.js), which builds its sheet from the
// skins registered here. Loaded right before shared/notices.js; it reads only the --rhythiax-* colours
// and html[data-rhythiax-theme] that Classic sets on the root element.

var RhythiaX = RhythiaX || {};

RhythiaX.NoticeSkins = RhythiaX.NoticeSkins || {};
RhythiaX.NoticeSkins.classic = `
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
`;
