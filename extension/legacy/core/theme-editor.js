// =============================================
// Reimagined for Rhythia — Classic theme editor
// =============================================
// Panel opened from the popup to edit an own Classic theme (shared/classic-themes.js). Changes are previewed
// through RhythiaX.ClassicLook (legacy/core/theme.js) and stored only on Save. The panel is redrawn only when
// its structure changes; typing and dragging update the page and notes in place, once a frame.

var RhythiaX = RhythiaX || {};

(function () {
  'use strict';

  const HOST_ID = 'rhythiax-classic-editor';
  // Classic's one HTML escape (legacy/core/constants.js).
  const esc = s => RhythiaX.escapeHtml(s);

  // Built like one of Rhythia's cards (rounded-xl, border-line, bg-surface), with Classic's sub-tabs, stat labels
  // and tab groups. Classic's --rhythiax-* tokens come from the page, so the panel follows the theme being edited;
  // its own surfaces stay solid (--ed-bg, --ed-inner) even when the theme's panels are see-through.
  const CSS = `
:host{all:initial}
*,*::before,*::after{box-sizing:border-box}
.ed{--line:var(--rhythiax-border,rgba(255,255,255,.1));--line-2:var(--rhythiax-border-strong,rgba(255,255,255,.2));--fg:var(--rhythiax-text-strong,#fff);--muted:var(--rhythiax-text-muted,#9ca3af);
  --accent:var(--rhythiax-accent,#c084fc);--inner:var(--ed-inner,#252239);--tint:color-mix(in srgb,var(--fg) 5%,transparent);--tint-2:color-mix(in srgb,var(--fg) 10%,transparent);
  position:fixed;top:72px;right:16px;bottom:16px;width:360px;display:flex;flex-direction:column;
  background:var(--ed-bg,#1b1a24);color:var(--rhythiax-text,#fff);border:1px solid var(--line);border-radius:12px;
  box-shadow:var(--ed-shadow,0 10px 25px rgba(0,0,0,.25));font:14px/1.45 var(--ed-font,system-ui,-apple-system,"Segoe UI",sans-serif);
  -webkit-font-smoothing:antialiased;overflow:hidden;pointer-events:auto}
button,input,textarea{font:inherit;color:inherit}
button{cursor:pointer}
:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.head{padding:16px 20px 0;display:grid;gap:12px;border-bottom:1px solid var(--line)}
.row{display:flex;align-items:center;gap:8px}
.title{flex:1;display:flex;align-items:center;gap:8px;font-size:16px;font-weight:700;letter-spacing:.025em;color:var(--fg)}
.title svg{width:18px;height:18px;color:var(--muted)}
.x{width:30px;height:30px;margin-right:-6px;border-radius:8px;border:0;background:none;display:grid;place-items:center;color:var(--muted);font-size:14px}
.x:hover{color:var(--fg);background:var(--tint)}
.name,.hex,.num{border-radius:8px;border:1px solid var(--line);background:var(--inner);outline:none;transition:border-color .15s ease}
.name{width:100%;height:38px;padding:0 12px;font-weight:600;font-size:14px;color:var(--fg)}
.name:focus,.hex:focus,.num:focus{border-color:var(--accent);box-shadow:0 0 0 2px var(--rhythiax-accent-soft,rgba(192,132,252,.2))}
.tabs{display:flex;margin:0 -12px}
.tabs button{position:relative;height:38px;padding:6px 12px 9px;border:0;background:none;color:var(--muted);font-size:13px;font-weight:600;transition:color .15s ease}
.tabs button:hover{color:var(--fg)}
.tabs button[aria-pressed="true"]{color:var(--fg)}
.tabs button[aria-pressed="true"]::after{content:"";position:absolute;left:12px;right:12px;bottom:-1px;height:2px;border-radius:2px;background:var(--accent)}
.body{flex:1;overflow:hidden auto;overscroll-behavior:contain;padding:4px 20px 18px;scrollbar-width:thin}
/* Each section is a box with a clear edge and its title over a line, so it reads where one ends and the next begins. */
.sec{margin-top:14px;padding:12px 14px 4px;border:1px solid var(--line-2);border-radius:10px;background:var(--tint)}
h4{margin:0 -14px 10px;padding:0 14px 10px;border-bottom:1px solid var(--line-2);font-size:14px;font-weight:700;color:var(--fg)}
.mini{position:relative;height:120px;margin-bottom:12px;border-radius:8px;border:1px solid var(--line);overflow:hidden}
.mini .m-nav{position:absolute;left:0;right:0;top:0;height:16px}
.mini .m-card{position:absolute;left:14px;right:14px;top:28px;bottom:12px;padding:12px 14px;border-radius:8px;border:1px solid rgba(128,128,128,.25);display:grid;align-content:start;gap:7px}
.mini b,.mini span{display:block;height:8px;width:44%;border-radius:4px}
.mini span{height:6px;width:62%}
.mini em{position:absolute;left:14px;bottom:10px;width:58px;height:16px;border-radius:5px}
.presets{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}
.preset{padding:5px 5px 6px;border-radius:8px;border:1px solid var(--line);background:color-mix(in srgb,var(--fg) 3%,transparent);font-size:12px;font-weight:600;text-align:left;color:var(--muted);transition:border-color .15s ease,color .15s ease}
.preset:hover{border-color:var(--line-2);color:var(--fg)}
.preset i{display:block;height:26px;margin-bottom:5px;border-radius:5px;position:relative;box-shadow:inset 0 0 0 1px rgba(128,128,128,.25)}
.preset i::after{content:"";position:absolute;left:6px;bottom:6px;width:45%;height:4px;border-radius:2px;background:var(--a)}
.preset[aria-pressed="true"]{border-color:var(--accent);color:var(--fg);background:color-mix(in srgb,var(--accent) 10%,transparent)}
.prop{padding:10px 0}
.prop + .prop{border-top:1px solid color-mix(in srgb,var(--fg) 6%,transparent)}
.top{display:flex;align-items:center;gap:8px;min-height:32px}
.lbl{flex:1;font-weight:600;color:var(--fg)}
.note{margin-top:6px;color:var(--muted);font-size:13px}
.note:empty{display:none}
.note.bad{color:var(--rhythiax-warning,#eab308)}
.note i{display:inline-block;width:10px;height:10px;margin:0 3px 0 1px;border-radius:2px;vertical-align:-1px;box-shadow:inset 0 0 0 1px rgba(128,128,128,.5)}
input[type=color]{-webkit-appearance:none;appearance:none;width:32px;height:32px;padding:2px;border-radius:8px;border:1px solid var(--line-2);background:none;cursor:pointer}
input[type=color]::-webkit-color-swatch-wrapper{padding:0}
input[type=color]::-webkit-color-swatch{border:0;border-radius:5px}
input[type=color]::-moz-color-swatch{border:0;border-radius:5px}
.hex,.num{height:32px;padding:0 8px;font-size:13px;color:var(--fg)}
.hex{width:90px;font-family:ui-monospace,SFMono-Regular,Consolas,monospace}
.hex.bad{border-color:var(--rhythiax-danger,#ef4444)}
.num{width:58px;text-align:right;font-variant-numeric:tabular-nums;-moz-appearance:textfield}
.num::-webkit-inner-spin-button,.num::-webkit-outer-spin-button{-webkit-appearance:none;margin:0}
.unit{width:18px;color:var(--muted);font-size:13px}
input[type=range]{display:block;width:100%;margin:8px 0 0;accent-color:var(--accent);cursor:pointer}
.auto{height:28px;padding:0 10px;border-radius:6px;border:1px solid var(--line);background:var(--inner);color:var(--muted);font-size:12px;font-weight:600}
.auto:hover{color:var(--fg)}
.auto[aria-pressed="true"]{border-color:var(--line-2);background:var(--tint-2);color:var(--fg)}
.seg{display:flex;gap:3px;padding:4px;border-radius:8px;border:1px solid var(--line-2);background:var(--inner)}
.prop .seg{margin-top:8px}
.sec > .seg{margin-bottom:6px}
/* Every choice readable; the one in use filled and edged in the accent. */
.seg button{flex:1;height:30px;border:0;border-radius:5px;background:none;color:color-mix(in srgb,var(--fg) 82%,transparent);font-size:14px;font-weight:600;transition:color .15s ease,background-color .15s ease}
.seg button:hover{color:var(--fg);background:var(--tint)}
.seg button[aria-pressed="true"]{background:color-mix(in srgb,var(--accent) 16%,transparent);color:var(--fg);box-shadow:inset 0 0 0 1px var(--accent)}
.quick{display:flex;align-items:center;gap:7px}
.quick button{width:26px;height:26px;flex:none;border-radius:6px;border:0;box-shadow:inset 0 0 0 1px rgba(128,128,128,.4)}
.quick button[aria-pressed="true"]{outline:2px solid var(--fg);outline-offset:2px}

.act{min-height:36px;padding:7px 12px;border-radius:8px;border:1px solid var(--line);background:var(--tint);font-size:14px;font-weight:600;color:var(--fg);transition:background-color .15s ease,border-color .15s ease}
.act:hover:not(:disabled){background:var(--tint-2);border-color:var(--line-2)}
.act.primary{border-color:transparent;background:var(--accent);color:var(--on-accent,#fff)}
.act.primary:hover:not(:disabled){background:var(--accent);filter:brightness(1.1)}
.act:disabled{opacity:.6;cursor:wait}
.act.wide{width:100%}
.acts{display:flex;gap:6px}
.acts .act{flex:1}
.file{margin-bottom:8px;font-weight:600;color:var(--fg);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ups-l{margin-top:12px;font-size:13px;font-weight:600;color:var(--fg)}
.ups{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-top:6px}
.upt{position:relative}
.upt .use{display:block;width:100%;aspect-ratio:16/10;padding:0;border:1px solid var(--line);border-radius:8px;background:center/cover var(--tint)}
.upt .use:hover{border-color:var(--line-2)}
.upt .use[aria-pressed="true"]{border-color:var(--accent);box-shadow:inset 0 0 0 1px var(--accent)}
.upt i{position:absolute;left:5px;bottom:5px;padding:0 5px;border-radius:4px;background:rgba(0,0,0,.62);color:#fff;font-size:11px;font-style:normal;font-weight:600;pointer-events:none}
.upt .rmup{position:absolute;top:3px;right:3px;width:20px;height:20px;padding:0;border:0;border-radius:5px;background:rgba(0,0,0,.62);color:#fff;font-size:11px;line-height:20px;opacity:0;transition:opacity .15s ease}
.upt:hover .rmup,.upt .rmup:focus-visible{opacity:1}
.verdict{display:flex;align-items:center;gap:8px;font-weight:600;color:var(--fg)}
.verdict b{flex:none;width:16px;text-align:center;color:#22c55e}
.verdict.low,.verdict.low b{color:var(--rhythiax-warning,#eab308)}
.checks{display:grid;gap:6px}
.check{display:flex;flex-direction:column;padding:8px 12px;border-radius:8px;border:1px solid var(--line);background:var(--tint)}
.check small{font-size:11px;font-weight:600;letter-spacing:.025em;text-transform:uppercase;color:var(--muted)}
.check span{display:flex;justify-content:space-between;align-items:baseline;font-weight:700;color:var(--fg);font-variant-numeric:tabular-nums}
.check em{font-style:normal;font-size:12px;font-weight:600;color:#22c55e}
.check.low em{color:var(--rhythiax-warning,#eab308)}
.foot{padding:14px 20px 16px;border-top:1px solid var(--line);display:grid;gap:10px}
.state{font-size:13px;color:var(--muted)}
.state:empty{display:none}
.state.warn{color:var(--rhythiax-warning,#eab308)}
.links{display:flex;justify-content:center;gap:18px}
.lnk{border:0;background:none;padding:0;color:var(--muted);font-size:13px;font-weight:600}
.lnk:hover{color:var(--fg)}
.links.split{justify-content:flex-start;align-items:center}
.links .del{margin-left:auto}
.act.sm{min-height:30px;padding:4px 12px;font-size:13px}
.act.danger{--bad:var(--rhythiax-danger,#ef4444);color:var(--bad);border-color:color-mix(in srgb,var(--bad) 40%,transparent);background:color-mix(in srgb,var(--bad) 10%,transparent)}
.act.danger:hover:not(:disabled){background:color-mix(in srgb,var(--bad) 18%,transparent);border-color:color-mix(in srgb,var(--bad) 60%,transparent)}
.act.danger.solid{border-color:transparent;background:var(--bad);color:#fff}
.act.danger.solid:hover:not(:disabled){background:var(--bad);filter:brightness(1.1)}
.marks{position:fixed;inset:0;pointer-events:none}
.marks i{position:absolute;border:1.5px dashed var(--rhythiax-accent,#c084fc);border-radius:14px}
dialog{width:min(520px,92vw);padding:20px;border-radius:12px;border:1px solid var(--line);background:var(--ed-bg,#1b1a24);color:var(--fg);box-shadow:var(--ed-shadow,0 10px 25px rgba(0,0,0,.25))}
dialog::backdrop{background:rgba(0,0,0,.5)}
dialog h3{margin:0 0 4px;font-size:16px;font-weight:700;letter-spacing:.025em}
dialog p{margin:0;color:var(--muted);font-size:13px}
dialog pre,dialog textarea{display:block;width:100%;max-height:50vh;overflow:auto;margin:12px 0 0;padding:10px 12px;border-radius:8px;border:1px solid var(--line);background:var(--inner);color:var(--fg);font:12.5px/1.5 ui-monospace,Consolas,monospace;white-space:pre-wrap;word-break:break-all}
dialog textarea{height:220px;resize:vertical;outline:none}
.dbtns{display:flex;justify-content:flex-end;gap:8px;margin-top:12px}
@media (max-width:700px){.ed{top:auto;left:8px;right:8px;bottom:8px;width:auto;height:55vh}}`;

  const RANGE = { bgZoom: [25, 400, '%', 'Size'], bgX: [0, 100, '%', 'Horizontal'], bgY: [0, 100, '%', 'Vertical'], bgDim: [0, 90, '%', 'Darken'], bgBlur: [0, 30, 'px', 'Blur'],
    panelClear: [0, 40, '%', 'See-through'], panelBlur: [0, 40, 'px', 'Blur behind'] };
  const PALETTE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3a9 9 0 1 0 0 18c1 0 1.6-.8 1.6-1.7 0-.4-.2-.8-.4-1.1-.3-.3-.4-.7-.4-1.1 0-.9.7-1.6 1.6-1.6H16a5 5 0 0 0 5-5c0-4.1-4-7.5-9-7.5Z"/><circle cx="7.5" cy="11" r="1"/><circle cx="10.5" cy="7.5" r="1"/><circle cx="15" cy="7.5" r="1"/></svg>';
  // Rhythia's cards on the page, outlined while the pointer is on the Panels section.
  const CARDS = '#root [class*="rounded-xl"][class*="border"]';

  let S = null; // the open editor

  // ─── Opening ───
  async function open(id) {
    const CT = RhythiaX.ClassicThemes, X = RhythiaX.Colour, area = chrome.storage.local;
    const got = await area.get([CT.LIST_KEY]);
    const saved = id ? CT.list(got).find(t => t.id === id) || null : null;
    const media = saved?.image ? (await area.get(CT.imageKey(saved.id)))[CT.imageKey(saved.id)] || null : null;
    close();
    const T = saved ? structuredClone(saved) : CT.create();
    const host = document.createElement('div');
    host.id = HOST_ID;
    host.style.cssText = 'position:fixed;inset:0;z-index:2147483647;pointer-events:none;display:block';
    // Rhythia's own font, which :host{all:initial} would otherwise drop.
    if (document.body) host.style.setProperty('--ed-font', getComputedStyle(document.body).fontFamily);
    // Closed, and only real input counts (bind()): the page's own scripts cannot reach in to change, save or
    // delete a theme.
    const sr = host.attachShadow({ mode: 'closed' });
    sr.innerHTML = `<style>${CSS}</style><div class="marks"></div><div class="ed" role="dialog" aria-label="Theme editor">
      <div class="head"><div class="row"><span class="title">${PALETTE}Theme editor</span><button class="x" data-cancel aria-label="Close without saving" title="Close without saving">✕</button></div>
        <input class="name" maxlength="40" spellcheck="false" aria-label="Theme name">
        <div class="tabs"><button data-tab="basic">Basic</button><button data-tab="advanced">Advanced</button></div></div>
      <div class="body"></div>
      <div class="foot"><div class="state"></div><button class="act primary wide" data-save>Save theme</button>
        <div class="links${saved ? ' split' : ''}"><button class="lnk" data-cancel>Cancel</button>${saved ? '<button class="act sm danger del" data-delete>Delete theme</button>' : ''}</div></div>
      <input type="file" accept="image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm" hidden data-file>
      <dialog class="exp"><h3>Theme file</h3><p>Copy it to share the theme. A background picture is not included.</p><pre></pre><form method="dialog" class="dbtns"><button class="act primary">Close</button></form></dialog>
      <dialog class="imp"><h3>Import a theme</h3><p>Paste a theme file. It replaces what you have in the editor.</p><textarea spellcheck="false" aria-label="Theme file"></textarea><div class="dbtns"><button class="act" data-closedlg>Cancel</button><button class="act primary" data-doimport>Import</button></div></dialog>
      <dialog class="ask"><h3></h3><p></p><form method="dialog" class="dbtns"><button class="act" value="">Cancel</button><button class="act danger solid" value="yes"></button></form></dialog></div>`;
    document.documentElement.appendChild(host);
    S = { CT, X, T, saved, media, host, sr, $: s => sr.querySelector(s), tab: 'basic', start: '', leaving: false, picUrl: X.blobHolder(), uploads: [] };
    S.$('.name').value = T.name;
    S.start = snapshot();
    bind();
    paint();
    render();
    refreshUploads();
    return true;
  }

  // ─── Painting the page, and the notes that depend on it ───
  function paint() {
    // The last result goes back in: the background file is checked once, not on every frame of a drag.
    S.R = S.CT.resolve(S.T, S.media, S.R);
    // A theme that turns from dark to light (or back) needs that stylesheet in this tab (engines.js).
    if (S.R.base !== S.base) { S.base = S.R.base; chrome.runtime.sendMessage({ type: 'rhythiax-theme-css', theme: S.base }).catch(() => {}); }
    RhythiaX.ClassicLook?.preview(S.T, S.media);
    // The picture is set once per change, as --ed-pic on the panel (outside the part render() redraws); the
    // preview only refers to it (miniBg), so a drag never rebuilds a style holding the whole file. It is a blob:
    // URL (shared/colour.js blobHolder): Chrome draws no data: URL over 2 MB in CSS.
    const pic = S.R.picture ? S.media : null;
    if (S.pic !== pic) {
      S.pic = pic;
      const url = S.picUrl(pic);
      if (url) S.$('.ed').style.setProperty('--ed-pic', `url("${url}")`); else S.$('.ed').style.removeProperty('--ed-pic');
    }
    // Text on the accent (Save theme): whichever of black or white reads better, as on the page.
    const st = S.sr.host.style;
    st.setProperty('--on-accent', S.R.tokens.onAccent === '#000000' ? '#0a0a0a' : '#ffffff');
    st.setProperty('--ed-bg', S.R.solid.surface);
    st.setProperty('--ed-inner', S.R.solid.inner);
    st.setProperty('--ed-shadow', S.R.base === 'dark' ? '0 10px 25px rgba(0,0,0,.25)' : '0 1px 3px rgba(15,23,42,.05),0 8px 28px rgba(15,23,42,.12)');
  }
  const chip = c => `<i style="background:${c}"></i>`;
  const ratio = n => `${n.toFixed(1)} : 1`;
  function noteOf(k) {
    const R = S.R, tk = R.tokens;
    if (k === 'page2') return R.mixed ? 'No text colour reads well on both. Pick two colours closer in brightness.' : '';
    if (k === 'accent') return R.picked.accent ? `Shown as ${chip(tk.accent)}${tk.accent} to stay readable.` : '';
    if (k === 'text') return R.picked.text ? `Shown as ${chip(tk.text)}${tk.text} to stay readable.` : '';
    if (k === 'panelClear') return S.T.bg || S.T.page2 ? '' : 'Needs a gradient or a background picture.';
    if (k === 'page' && S.T.bg) return 'Shows around the picture. Panels, menus and text are worked out from it.';
    return '';
  }
  // The theme in small: the background (with the picture), Rhythia's top bar, a card with text and the accent.
  function miniBg() {
    const T = S.T;
    return S.R.picture ? `linear-gradient(color-mix(in srgb,${T.page} ${T.bgDim}%,transparent) 0 0),var(--ed-pic) ${T.bgX}% ${T.bgY}%/cover` : S.X.gradient([T.page, T.page2].filter(Boolean), T.dir);
  }
  function miniHtml() {
    const R = S.R, tk = R.tokens;
    return `<i class="m-nav" style="background:${R.solid.surface}"></i><div class="m-card" style="background:${R.solid.surface}"><b style="background:${tk.text}"></b><span style="background:${tk.textMuted}"></span><em style="background:${tk.accent}"></em></div>`;
  }
  function verdictHtml() {
    const bad = S.R.checks.filter(c => c.ratio < c.min);
    return bad.length ? `<div class="verdict low"><b>!</b>Hard to read: ${bad.map(c => c.label.toLowerCase()).join(', ')}</div>` : '<div class="verdict"><b>✓</b>All text is readable</div>';
  }
  const checksHtml = () => S.R.checks.map(c => `<div class="check${c.ratio < c.min ? ' low' : ''}"><small>${c.label}</small><span>${ratio(c.ratio)}<em>${c.ratio >= c.min ? 'Readable' : `Needs ${c.min} : 1`}</em></span></div>`).join('');
  // Brings the notes, preview, checks and Auto buttons up to date without drawing the panel again.
  function refresh() {
    for (const el of S.sr.querySelectorAll('[data-note]')) { el.innerHTML = noteOf(el.dataset.note); el.classList.toggle('bad', el.dataset.note === 'page2' && S.R.mixed); }
    for (const k of ['panel', 'text']) {
      const b = S.sr.querySelector(`[data-auto="${k}"]`);
      if (b) b.setAttribute('aria-pressed', String(!S.T[k]));
      const v = S.T[k] || (k === 'panel' ? S.R.solid.surface : S.R.tokens.text);
      for (const inp of S.sr.querySelectorAll(`[data-k="${k}"]`)) if (inp !== S.sr.activeElement) inp.value = v;
    }
    const mini = S.$('.mini'), v = S.$('[data-verdict]'), c = S.$('.checks');
    if (mini) { mini.innerHTML = miniHtml(); mini.style.background = miniBg(); }
    if (v) v.innerHTML = verdictHtml();
    if (c) c.innerHTML = checksHtml();
    for (const p of S.sr.querySelectorAll('[data-preset]')) { const q = S.CT.PRESETS.find(x => x.n === p.dataset.preset); p.setAttribute('aria-pressed', String(q.page === S.T.page && q.accent === S.T.accent && !S.T.page2)); }
    for (const q of S.sr.querySelectorAll('[data-q]')) q.setAttribute('aria-pressed', String(q.dataset.q === S.T.accent));
    showState();
  }

  // ─── The panel ───
  const colour = (k, v, label) => `<input type="color" data-k="${k}" value="${v}" aria-label="${label}"><input class="hex" data-k="${k}" value="${v}" spellcheck="false" maxlength="24" aria-label="${label}, as #rrggbb or rgb()">`;
  function colourRow(k, label, auto) {
    const v = auto ? S.T[k] || (k === 'panel' ? S.R.solid.surface : S.R.tokens.text) : S.T[k];
    return `<div class="prop"><div class="top"><span class="lbl">${label}</span>${auto ? `<button class="auto" data-auto="${k}" aria-pressed="${!S.T[k]}" title="Follow the background">Auto</button>` : ''}${colour(k, v, label)}</div>
      <div class="note" data-note="${k}">${noteOf(k)}</div></div>`;
  }
  function rangeRow(k) {
    const [min, max, unit, label] = RANGE[k], v = S.T[k];
    return `<div class="prop"><div class="top"><span class="lbl">${label}</span><input class="num" type="number" data-k="${k}" min="${min}" max="${max}" value="${v}" aria-label="${label}"><span class="unit">${unit}</span></div>
      <input type="range" data-k="${k}" min="${min}" max="${max}" value="${v}" aria-label="${label}"><div class="note" data-note="${k}">${noteOf(k)}</div></div>`;
  }
  const seg = (k, options) => `<div class="seg">${options.map(([o, l]) => `<button data-k="${k}" data-o="${o}" aria-pressed="${S.T[k] === o}">${l}</button>`).join('')}</div>`;
  const segRow = (k, label, options) => `<div class="prop"><div class="top"><span class="lbl">${label}</span></div>${seg(k, options)}</div>`;
  // Picture is chosen before a file is: S.wantPicture keeps the Picture choice open until then.
  const kindOf = () => (S.T.bg || S.wantPicture ? 'picture' : S.T.page2 ? 'gradient' : 'solid');
  // The last uploads, kept on this device (shared/uploads.js): a click uses one again.
  function uploadsHtml() {
    if (!S.uploads.length) return '';
    const sig = S.T.bg && S.media ? uploadSig() : '';
    const KIND = { gif: 'GIF', video: 'Video' };
    return `<div class="ups-l">Recent uploads</div><div class="ups">${S.uploads.map(u => `<span class="upt">
        <button class="use" data-upload="${u.id}" aria-pressed="${u.sig === sig}" aria-label="Use ${esc(u.name || 'this upload')}" title="${esc(u.name)}"${u.thumb ? ` style="background-image:url('${u.thumb}')"` : ''}></button>
        ${KIND[u.kind] ? `<i>${KIND[u.kind]}</i>` : ''}<button class="rmup" data-unupload="${u.id}" aria-label="Remove from recent uploads" title="Remove from recent uploads">✕</button></span>`).join('')}</div>
      <div class="note">Your last ${RhythiaX.Uploads.MAX} uploads, kept on this device for any theme.</div>`;
  }
  // The signature of the file in use, worked out once per file.
  function uploadSig() {
    if (S.sigFor !== S.media) { S.sigFor = S.media; S.sig = RhythiaX.Uploads.sigOf(S.media); }
    return S.sig;
  }
  function refreshUploads() {
    const mine = S;
    RhythiaX.Uploads.read().then(l => { if (S === mine) { S.uploads = l; render(); } }, () => {});
  }
  // A picked file or a recent upload becomes the background, filling the screen, centred.
  function useMedia(url, name, video) {
    S.media = url;
    S.T.bg = { local: true, name: String(name || '').slice(0, 80), video };
    Object.assign(S.T, { bgFit: 'cover', bgZoom: 100, bgX: 50, bgY: 50 });
    paint();
    render();
    pictureTheme(url);
  }
  // The page colour, accent and darkening taken from the picture (shared/classic-themes.js fromPicture): done
  // when a picture is added, and again from its button.
  async function pictureTheme(url) {
    const mine = S;
    let colours;
    try { colours = await S.X.pictureColours(url); } catch (_) { if (S === mine) toast("Couldn't read the picture's colours."); return; }
    if (S !== mine || S.media !== url) return;
    Object.assign(S.T, S.CT.fromPicture(S.T, colours));
    paint();
    render();
  }
  // A new upload joins the recent uploads, and so does the file it replaced, which may be older than the list.
  async function keepUpload(media, name, old) {
    const mine = S;
    try {
      if (old && old.media !== media) await RhythiaX.Uploads.add(old.media, old.name);
      await RhythiaX.Uploads.add(media, name);
    } catch (_) {
      if (S === mine) toast("Couldn't keep this file in Recent uploads.");
    }
    refreshUploads();
  }
  function backgroundSec() {
    const T = S.T, k = kindOf(), bg = T.bg;
    let body = '';
    if (k === 'solid') body = colourRow('page', 'Colour');
    if (k === 'gradient') body = `<div class="prop"><div class="top"><span class="lbl">First colour</span>${colour('page', T.page, 'First colour')}</div></div>
      <div class="prop"><div class="top"><span class="lbl">Second colour</span>${colour('page2', T.page2, 'Second colour')}</div>${seg('dir', S.CT.DIRS)}<div class="note${S.R.mixed ? ' bad' : ''}" data-note="page2">${noteOf('page2')}</div></div>`;
    if (k === 'picture') {
      body = `<div class="prop">${bg ? `<div class="file">${esc(bg.name || (bg.video ? 'Your video' : 'Your picture'))}</div>` : ''}
        <div class="acts"><button class="act" data-up>${bg ? 'Add new' : 'Upload a picture or video'}</button>${bg ? '<button class="act" data-remove>Remove</button>' : ''}</div>
        <div class="note">${bg?.video ? 'Videos play muted. ' : ''}Image or GIF up to 8 MB, MP4 or WebM up to 20 MB.</div>${uploadsHtml()}</div>`
        + (bg && S.media ? '<div class="prop"><button class="act wide" data-frompic>Use the picture&#39;s colours</button><div class="note">Sets the page colour, accent and darkening from the picture. Done for you when you add one.</div></div>' : '')
        + colourRow('page', 'Page colour');
      if (bg) body += segRow('bgFit', 'Fit', [['cover', 'Fill screen'], ['contain', 'Fit inside']]) + rangeRow('bgDim') + rangeRow('bgBlur');
    }
    return `<div class="sec"><h4>Background</h4><div class="seg">${[['solid', 'Colour'], ['gradient', 'Gradient'], ['picture', 'Picture']].map(([o, l]) => `<button data-bgkind="${o}" aria-pressed="${k === o}">${l}</button>`).join('')}</div>${body}</div>`;
  }
  function basicHtml() {
    const T = S.T, CT = S.CT;
    return `<div class="sec"><div class="mini" aria-hidden="true" style='background:${miniBg()}'>${miniHtml()}</div>
        <div class="presets">${CT.PRESETS.map(p => `<button class="preset" data-preset="${p.n}" aria-pressed="${p.page === T.page && p.accent === T.accent && !T.page2}"><i style="background:${p.page};--a:${p.accent}"></i>${p.n}</button>`).join('')}</div></div>
      ${backgroundSec()}
      <div class="sec"><h4>Accent</h4><div class="quick">${CT.QUICK.map(q => `<button style="background:${q}" data-q="${q}" aria-pressed="${q === T.accent}" aria-label="${q}"></button>`).join('')}</div>
        <div class="top" style="margin-top:10px"><span class="lbl">Colour</span>${colour('accent', T.accent, 'Accent')}</div>
        <div class="note" data-note="accent">${noteOf('accent')}</div></div>
      <div class="sec"><h4>Look</h4>${segRow('contrast', 'Contrast', [['soft', 'Soft'], ['normal', 'Normal'], ['high', 'High']])}${segRow('banner', 'Profile banner', [['show', 'Show'], ['hide', 'Hide']])}${S.T.banner === 'hide' ? segRow('bannerGap', 'Without the banner', [['close', 'Move profile up'], ['keep', 'Keep the space']]) + '<div class="note">Move profile up leaves only room for the picture and badges. Keep the space leaves the banner&#39;s place empty, so your background shows there.</div>' : ''}</div>
      <div class="sec"><h4>Readability</h4><div data-verdict>${verdictHtml()}</div></div>`;
  }
  function advancedHtml() {
    const bg = S.T.bg;
    return `<div class="sec" data-hl="cards"><h4>Panels</h4>${colourRow('panel', 'Colour', true)}${rangeRow('panelClear')}${rangeRow('panelBlur')}</div>
      <div class="sec"><h4>Text</h4>${colourRow('text', 'Colour', true)}</div>
      ${bg ? `<div class="sec"><h4>Background picture</h4>${['bgZoom', 'bgX', 'bgY'].map(k => rangeRow(k)).join('')}</div>` : ''}
      <div class="sec"><h4>Readability</h4><div class="checks">${checksHtml()}</div></div>
      <div class="sec"><h4>Theme file</h4><div class="acts"><button class="act" data-export>Export</button><button class="act" data-import>Import</button></div></div>`;
  }
  function render() {
    const body = S.$('.body'), top = body.scrollTop;
    for (const b of S.sr.querySelectorAll('[data-tab]')) b.setAttribute('aria-pressed', String(b.dataset.tab === S.tab));
    body.innerHTML = S.tab === 'basic' ? basicHtml() : advancedHtml();
    body.scrollTop = top;
    S.$('.marks').innerHTML = '';
    S.hl = false;
    showState();
  }
  // Outlines Rhythia's cards on the page, the part the Panels settings change.
  function outline(on) {
    S.$('.marks').innerHTML = on ? [...document.querySelectorAll(CARDS)].map(el => el.getBoundingClientRect())
      .filter(r => r.width && r.bottom > 0 && r.top < innerHeight).slice(0, 16)
      .map(r => `<i style="left:${r.left - 3}px;top:${r.top - 3}px;width:${r.width + 6}px;height:${r.height + 6}px"></i>`).join('') : '';
  }

  // ─── State, saving and leaving ───
  const snapshot = () => JSON.stringify([S.$('.name').value.trim(), S.T, S.media ? S.media.length + S.media.slice(-24) : '']);
  function showState(warn) {
    const el = S.$('.state'), dirty = snapshot() !== S.start;
    el.className = 'state' + (warn ? ' warn' : '');
    el.textContent = warn || (dirty ? 'Unsaved changes' : S.saved ? '' : 'Not saved yet');
  }
  async function save() {
    const CT = S.CT, area = chrome.storage.local;
    S.T.name = S.$('.name').value.replace(/\s+/g, ' ').trim().slice(0, 40) || 'My theme';
    const T = CT.normalize({ ...S.T, image: Boolean(S.T.bg && S.media) });
    if (!T) return toast("Couldn't save this theme.");
    const btn = S.$('[data-save]');
    btn.disabled = true;
    try {
      const list = CT.list(await area.get([CT.LIST_KEY]));
      const at = list.findIndex(t => t.id === T.id);
      if (at < 0 && list.length >= CT.MAX_THEMES) throw new Error('full');
      if (at < 0) list.push(T); else list[at] = T;
      // The picture or video goes under its own key, so tabs are not sent it again on other changes.
      const set = { [CT.LIST_KEY]: list, [CT.ACTIVE_KEY]: T.id };
      if (T.image) set[CT.imageKey(T.id)] = S.media;
      await area.set(set);
      if (!T.image) await area.remove(CT.imageKey(T.id));
      close();
    } catch (err) {
      btn.disabled = false;
      toast(err?.message === 'full' ? `Up to ${CT.MAX_THEMES} themes. Delete one first.` : "Couldn't save. Try again.");
    }
  }
  async function remove() {
    const CT = S.CT, area = chrome.storage.local, id = S.T.id;
    const got = await area.get([CT.LIST_KEY, CT.ACTIVE_KEY]);
    const set = { [CT.LIST_KEY]: CT.list(got).filter(t => t.id !== id) };
    if (got[CT.ACTIVE_KEY] === id) set[CT.ACTIVE_KEY] = '';
    await area.set(set);
    await area.remove(CT.imageKey(id));
    close();
  }
  // A theme file is the theme without its id and picture; a pasted one keeps this theme's id.
  function exportTheme() {
    const { id, bg, image, base, ...t } = S.T;
    S.$('dialog.exp pre').textContent = JSON.stringify({ format: 'rhythiax-classic-theme', version: 1, ...t, name: S.$('.name').value.trim() || t.name }, null, 2);
    S.$('dialog.exp').showModal();
  }
  function importTheme() {
    const dl = S.$('dialog.imp');
    let raw = null;
    try { raw = JSON.parse(dl.querySelector('textarea').value); } catch (_) { /* not JSON */ }
    const t = raw && typeof raw === 'object' && raw.page ? S.CT.normalize({ ...raw, id: S.T.id, image: false }) : null;
    if (!t) { toast('That is not a Classic theme file.'); return; }
    S.T = t; S.media = null; S.wantPicture = false;
    S.$('.name').value = t.name;
    dl.close();
    paint();
    render();
    toast('Theme imported. Save it to keep it.');
  }
  // With unsaved changes, the first Cancel (or Escape) only warns.
  function leave() {
    if (snapshot() === S.start || S.leaving) { close(); return; }
    S.leaving = true;
    showState('Press Cancel again to discard changes.');
    setTimeout(() => { if (S) { S.leaving = false; showState(); } }, 4000);
  }
  function close() {
    if (!S) return;
    removeEventListener('keydown', S.key);
    cancelAnimationFrame(S.raf);
    S.picUrl('');
    S.host.remove();
    S = null;
    RhythiaX.ClassicLook?.endPreview();
  }
  const toast = m => showState(m);
  // Asks before a step that cannot be undone; true only when the player confirms (Cancel and Escape say no).
  function ask(title, text, yes) {
    const dlg = S.$('dialog.ask');
    dlg.querySelector('h3').textContent = title;
    dlg.querySelector('p').textContent = text;
    dlg.querySelector('[value="yes"]').textContent = yes;
    dlg.returnValue = '';
    dlg.showModal();
    return new Promise(done => dlg.addEventListener('close', () => done(dlg.returnValue === 'yes'), { once: true }));
  }

  // ─── Events ───
  // Only the player's own input is acted on: an event a page script makes (isTrusted false) is ignored, as in
  // shared/notices.js.
  function bind() {
    const { sr } = S;
    const NUM = S.CT.NUMBERS;
    sr.addEventListener('click', async e => {
      if (!e.isTrusted) return;
      const b = e.target.closest('button');
      if (!b || !S) return;
      const d = b.dataset, T = S.T;
      if ('cancel' in d) return leave();
      if ('save' in d) return save();
      if ('delete' in d) {
        // The answer acts only on the editor it belongs to, never on one opened later.
        const mine = S, name = S.$('.name').value.trim() || T.name;
        if (!await ask(`Delete “${name}”?`, 'The theme and its background picture are removed from your themes. This cannot be undone.', 'Delete theme') || S !== mine) return;
        b.disabled = true;
        return remove().catch(() => { if (S === mine) { b.disabled = false; toast("Couldn't delete this theme. Try again."); } });
      }
      if (d.tab) { S.tab = d.tab; render(); S.$('.body').scrollTop = 0; return; }
      if (d.upload) {
        const mine = S, u = S.uploads.find(x => x.id === d.upload);
        const media = await RhythiaX.Uploads.get(d.upload).catch(() => null);
        if (S !== mine) return;
        if (!media) { toast('That upload is no longer on this device.'); refreshUploads(); return; }
        return useMedia(media, u?.name, S.X.isVideo(media));
      }
      if ('frompic' in d) return pictureTheme(S.media);
      if (d.unupload) {
        const mine = S, id = d.unupload;
        if (!await ask('Remove this upload?', 'It is removed from Recent uploads on this device. Themes that use it keep their own copy.', 'Remove') || S !== mine) return;
        return RhythiaX.Uploads.remove(id).then(refreshUploads, () => toast("Couldn't remove it. Try again."));
      }
      if ('export' in d) return exportTheme();
      if ('import' in d) { S.$('dialog.imp textarea').value = ''; S.$('dialog.imp').showModal(); return; }
      if ('closedlg' in d) { b.closest('dialog').close(); return; }
      if ('doimport' in d) return importTheme();
      if (d.preset) { const p = S.CT.PRESETS.find(x => x.n === d.preset); T.page = p.page; T.page2 = null; T.accent = p.accent; T.panel = null; T.text = null; }
      else if (d.bgkind) {
        S.wantPicture = d.bgkind === 'picture';
        if (d.bgkind !== 'picture') { T.bg = null; S.media = null; T.page2 = d.bgkind === 'solid' ? null : T.page2 || S.X.mix(T.page, T.accent, S.R.base === 'white' ? .15 : .3); }
      }
      else if (d.q) T.accent = d.q;
      else if (d.auto) { if (T[d.auto]) T[d.auto] = null; else T[d.auto] = d.auto === 'panel' ? S.R.solid.surface : S.R.tokens.text; }
      else if (d.o) T[d.k] = d.o;
      else if ('up' in d) { S.$('[data-file]').click(); return; }
      else if ('remove' in d) { T.bg = null; S.media = null; }
      else return;
      paint();
      render();
    });
    sr.addEventListener('input', e => {
      if (!e.isTrusted) return;
      const t = e.target, k = t.dataset.k, T = S?.T;
      if (!k || !S) return;
      if (t.type === 'range' || t.classList.contains('num')) {
        const [lo, hi] = NUM[k];
        if (t.value === '' || !Number.isFinite(+t.value)) return;
        T[k] = Math.min(hi, Math.max(lo, Math.round(+t.value)));
        for (const other of sr.querySelectorAll(`[data-k="${k}"]`)) if (other !== t) other.value = T[k];
      } else {
        const v = S.X.parseColour(t.value);
        t.classList.toggle('bad', !v);
        if (!v) return;
        T[k] = v;
        for (const other of sr.querySelectorAll(`[data-k="${k}"]`)) if (other !== t) other.value = v;
      }
      // The colour picker and sliders send many changes a second: the page is painted once a frame.
      if (!S.raf) S.raf = requestAnimationFrame(() => { if (!S) return; S.raf = 0; paint(); refresh(); });
    });
    // A field let go shows the value in use (a number in range, a colour as #rrggbb).
    sr.addEventListener('change', async e => {
      if (!e.isTrusted) return;
      const t = e.target;
      if (t.matches('[data-file]')) {
        const f = t.files?.[0];
        t.value = '';
        if (!f) return;
        try {
          // GIFs and videos kept as they are, other pictures scaled down to JPEG (shared/colour.js).
          const m = await RhythiaX.Colour.readMedia(f);
          const old = S.T.bg && S.media ? { media: S.media, name: S.T.bg.name } : null;
          useMedia(m.url, f.name, m.video);
          keepUpload(m.url, f.name, old);
        } catch (err) {
          toast(({ 'video-size': 'Video is over 20 MB.', 'gif-size': 'GIF is over 8 MB.' })[err.message]
            || "Couldn't read that file. Use PNG, JPEG, WebP, GIF, MP4 or WebM.");
        }
        return;
      }
      if (t.matches('.hex,.num')) { t.classList.remove('bad'); t.value = S.T[t.dataset.k] || t.value; refresh(); }
    });
    sr.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.matches('.hex,.num,.name')) e.target.blur(); });
    sr.addEventListener('mouseover', e => { const on = Boolean(e.target.closest?.('[data-hl]')); if (on !== S.hl) { S.hl = on; outline(on); } });
    S.$('.ed').addEventListener('mouseleave', () => { if (S.hl) { S.hl = false; outline(false); } });
    S.$('.name').addEventListener('input', () => showState());
    S.key = e => { if (e.isTrusted && e.key === 'Escape' && !S.sr.querySelector('dialog[open]')) leave(); };
    addEventListener('keydown', S.key);
  }

  // The popup asks the active tab; Classic answers only when it owns the page.
  try {
    chrome.runtime?.onMessage?.addListener((message, sender, reply) => {
      if (message?.type !== 'rhythiax-classic-theme-editor') return false;
      if (!RhythiaX.ClassicThemes || document.documentElement.classList.contains('rhythiax-exodus')) { reply({ ok: false }); return false; }
      open(message.id || '').then(ok => reply({ ok }), () => reply({ ok: false }));
      return true;
    });
  } catch (error) {
    if (!/Extension context invalidated/i.test(String(error?.message || error))) throw error;
  }

  // The panel sits on <html>, above the page: it closes, without saving, when Exodus takes the page
  // (RhythiaX.ClassicIdle, legacy/core/state.js), and the preview goes with it.
  RhythiaX.ClassicIdle?.onSuspend?.(close);
})();
