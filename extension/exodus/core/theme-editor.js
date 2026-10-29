// =============================================
// Reimagined for Rhythia — Exodus theme editor
// =============================================
// Opened from the popup on a page Exodus shows. The page shrinks left, the editor docks right in its own
// shadow root, and each change is painted on the page through `paint` (at most once a frame, fades off).
// Nothing is saved until "Save theme". Basic and Advanced edit the same theme (shared/exodus-themes.js); each
// value is Auto or set. The dock is updated in place (ExodusKit.morph) so focused fields keep their state.

var RhythiaX = RhythiaX || {};

RhythiaX.ExodusThemeEditor = (function () {
  'use strict';

  const HOST_ID = 'rhythiax-exodus-editor';
  const DOCK = 400;
  const esc = s => RhythiaX.ExodusKit.esc(s);
  const morph = (el, html) => RhythiaX.ExodusKit.morph(el, html);
  // A complete url("…") token, safe inside a style attribute (core/kit.js).
  const cssUrl = x => RhythiaX.ExodusKit.cssUrl(x);
  // The uploaded picture is set once, as --ed-pic on .ed (outside the pane that morph rewrites), and the
  // dock's markup only refers to it: a drag or a slider never rebuilds a string holding the whole file. It is a
  // blob: URL (shared/colour.js blobHolder): Chrome draws no data: URL over 2 MB in CSS.
  const PIC = 'center/cover var(--ed-pic)';
  const cssString = s => '"' + String(s).replace(/[\\"\n\r\f]/g, c => '\\' + c.charCodeAt(0).toString(16) + ' ') + '"';
  function setPicture() {
    if (S.picVar === S.image) return;
    S.picVar = S.image;
    const url = S.picUrl(S.image);
    if (url) S.$('.ed').style.setProperty('--ed-pic', `url(${cssString(url)})`);
    else S.$('.ed').style.removeProperty('--ed-pic');
  }

  const CSS = `
:host{all:initial}
*,*::before,*::after{box-sizing:border-box}
/* Exodus' dark tokens (core/assets.js), under the colours of the theme being edited (paintOwn()). */
.ed{--page:#090a0c;--panel:#111318;--panel-2:#171a20;--panel-3:#1d2028;--field:#0d0f12;--dialog:#0e1014;--tip:#22252d;
  --line:rgba(255,255,255,.06);--line-2:rgba(255,255,255,.12);--text:#f4f5f7;--text-2:#c5cad3;--muted:#8a929f;
  --accent:#60a5fa;--accent-2:#93c5fd;--accent-soft:rgba(96,165,250,.14);--on-accent:#06121f;
  --good:#4ade80;--bad:#f87171;--p2-text:#fcd34d;--p2-soft:rgba(245,158,11,.14);--mk:#e3a72f;--mkink:#1c1400;--ease:cubic-bezier(.2,.7,.2,1);
  color:var(--text);font:400 14px/1.5 "Inter","Segoe UI Variable Text","Segoe UI",system-ui,-apple-system,sans-serif;-webkit-font-smoothing:antialiased}
button,input,textarea{font:inherit;color:inherit}
button{cursor:pointer}
:focus-visible{outline:2px solid var(--accent);outline-offset:2px;border-radius:6px}
.frame{position:fixed;left:0;top:0;right:${DOCK}px;bottom:0;box-shadow:inset 0 0 0 1px rgba(227,167,47,.5);pointer-events:none}
.pill{position:fixed;left:calc((100% - ${DOCK}px) / 2);bottom:18px;transform:translateX(-50%);display:flex;align-items:center;gap:10px;height:40px;padding:0 6px 0 14px;border-radius:11px;background:var(--dialog);box-shadow:0 0 0 1px var(--line-2),0 10px 30px rgba(0,0,0,.45);color:var(--text-2);font-size:13px;font-weight:550;white-space:nowrap;pointer-events:none}
.pill > span{display:inline-flex;align-items:center;gap:8px;padding-right:8px}
.pill > span::before{content:"";flex:none;width:7px;height:7px;border-radius:50%;background:var(--mk)}
.pill b{color:var(--text);font-weight:650}
.pill button{height:28px;padding:0 12px;border:0;border-radius:8px;background:var(--panel-3);color:var(--text);font-size:13px;font-weight:600}
.pill button:hover{background:#262a33}
.ed.placing .pill{pointer-events:auto}
.ed.placing .pill .p-edit,.ed:not(.placing) .pill .p-place{display:none}
.grab{position:fixed;left:0;top:0;right:${DOCK}px;bottom:0;display:none;pointer-events:auto;cursor:grab;touch-action:none}
.grab.on{cursor:grabbing}
.ed.placing .grab{display:block}

/* The dock: a page of its own, with Exodus' panels on it */
.dock{position:fixed;top:0;right:0;bottom:0;width:${DOCK}px;background:var(--page);border-left:1px solid var(--line-2);display:flex;flex-direction:column;pointer-events:auto;animation:dockIn .4s var(--ease) both}
@keyframes dockIn{from{transform:translateX(100%)}}
.dhead{padding:16px 20px 0;display:grid;gap:14px;border-bottom:1px solid var(--line)}
.drow{display:flex;align-items:center;gap:10px}
.drow h2{flex:1;margin:0;font-size:20px;font-weight:750;letter-spacing:-.015em}
.x{width:36px;height:36px;margin-right:-8px;border:0;border-radius:10px;background:none;color:var(--muted);display:grid;place-items:center;transition:background-color .15s,color .15s}
.x:hover{background:var(--panel-3);color:var(--text)}
.dname{width:100%;height:44px;border:0;border-radius:11px;background:var(--field);box-shadow:inset 0 0 0 1px var(--line-2);padding:0 14px;color:var(--text);font-weight:600;font-size:15px;outline:none;transition:box-shadow .15s}
.dname:focus{box-shadow:inset 0 0 0 1px var(--accent)}
.tabs{display:flex;gap:26px}
.tabs button{position:relative;border:0;background:none;padding:6px 0 12px;color:var(--muted);font-weight:600;font-size:15px;transition:color .15s}
.tabs button:hover{color:var(--text-2)}
.tabs button[aria-pressed="true"]{color:var(--text)}
.tabs button[aria-pressed="true"]::after{content:"";position:absolute;left:0;right:0;bottom:-1px;height:2px;border-radius:2px;background:var(--accent)}
.pane{flex:1;overflow:hidden auto;overscroll-behavior:contain;padding:16px 14px 20px;display:grid;grid-template-columns:minmax(0,1fr);align-content:start;gap:14px;scrollbar-width:thin;scrollbar-color:rgba(255,255,255,.12) transparent}
/* Each section is a card with a clear edge and its title over a line, so it reads where one ends and the next begins. */
.card{min-width:0;padding:14px 18px 16px;border-radius:16px;background:var(--panel);box-shadow:inset 0 0 0 1px var(--line-2)}
.card > h3{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:0 -18px 14px;padding:0 18px 12px;border-bottom:1px solid var(--line-2);font-size:16px;font-weight:650;letter-spacing:-.005em}
.card > h3 small{color:var(--muted);font-size:13px;font-weight:500}
.cap{margin:0;color:var(--muted);font-size:13px}
.dfoot{padding:12px 20px 14px;border-top:1px solid var(--line);display:grid;gap:10px}
.state{display:flex;align-items:center;gap:8px;min-height:20px;font-size:13px;color:var(--muted)}
.state.dirty{color:var(--text-2)}
.state.dirty::before{content:"";flex:none;width:7px;height:7px;border-radius:50%;background:var(--mk)}
.state.warn{color:var(--p2-text)}
.more{display:flex;justify-content:center;gap:22px}
.lnk{border:0;background:none;padding:2px 0;color:var(--muted);font-size:13.5px;font-weight:600;transition:color .15s}
.lnk:hover{color:var(--text)}
.more.split{justify-content:flex-start;align-items:center}
.more .del{margin-left:auto}

/* Controls, as .pills and .btn on the page */
/* Every choice readable; the one in use filled and edged in the accent. */
.seg{display:flex;gap:3px;padding:3px;border-radius:11px;background:var(--field);box-shadow:inset 0 0 0 1px var(--line-2)}
.seg button{flex:1;min-width:0;border:0;background:none;height:32px;padding:0 6px;border-radius:8px;color:var(--text-2);font-size:13.5px;font-weight:600;white-space:nowrap;transition:color .15s,background-color .2s}
.seg button:hover{color:var(--text);background:var(--panel-2)}
.seg button[aria-pressed="true"]{background:var(--accent-soft);color:var(--text);box-shadow:inset 0 0 0 1px var(--accent)}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;height:38px;padding:0 16px;border-radius:11px;border:0;background:var(--panel-2);color:var(--text);font-weight:600;font-size:14px;white-space:nowrap;transition:background-color .15s,transform .15s}
.btn:hover{background:var(--panel-3)}
.btn:active{transform:translateY(1px)}
.btn.primary{background:var(--accent);color:var(--on-accent)}
.btn.primary:hover{background:var(--accent-2)}
.btn.big{width:100%;height:42px;font-size:15px}
.btn.wide{width:100%}
.btn[disabled]{opacity:.5;cursor:default;transform:none}
.btn.sm{height:30px;padding:0 12px;border-radius:9px;font-size:13px}
.btn.sm[aria-pressed="true"]{background:var(--panel-3);color:var(--accent-2)}
.btn.danger{background:rgba(248,113,113,.1);color:var(--bad);box-shadow:inset 0 0 0 1px rgba(248,113,113,.32)}
.btn.danger:hover{background:rgba(248,113,113,.18)}
.btn.danger.solid{background:#dc2626;color:#fff;box-shadow:none}
.btn.danger.solid:hover{background:#ef4444}
.btns{display:flex;gap:8px}.btns .btn{flex:1}
.switch{position:relative;flex:none;width:40px;height:24px;padding:0;border:0;border-radius:999px;background:var(--panel-3);box-shadow:inset 0 0 0 1px var(--line-2);transition:background-color .2s}
.switch::after{content:"";position:absolute;top:3px;left:3px;width:18px;height:18px;border-radius:50%;background:var(--text);transition:transform .25s var(--ease)}
.switch[aria-checked="true"]{background:var(--accent);box-shadow:none}
.switch[aria-checked="true"]::after{transform:translateX(16px);background:#fff}

/* One setting per row */
.prop{padding:12px 0;border-top:1px solid var(--line)}
.prop:first-child,h3 + .prop,.cap + .prop,.seg + .prop,.mini + .prop{border-top:0;padding-top:4px}
.prop:last-child{padding-bottom:2px}
.ptop{display:flex;align-items:center;gap:10px;min-height:36px}
.lbl{flex:1;min-width:0;color:var(--text);font-size:14px;font-weight:600}
.pctl{display:flex;align-items:center;gap:8px}
.why{margin-top:6px;color:var(--muted);font-size:13px;line-height:1.45}
.why b{color:var(--text-2);font-weight:600;font-variant-numeric:tabular-nums}
.why.adj{color:var(--text-2)}
.why.bad{color:var(--p2-text)}
.why i{display:inline-block;width:10px;height:10px;margin:0 4px 0 1px;border-radius:3px;vertical-align:-1px;box-shadow:inset 0 0 0 1px var(--line-2)}
.fix{margin-left:8px;height:26px;padding:0 10px;border:0;border-radius:7px;background:var(--p2-soft);color:var(--p2-text);font-size:12.5px;font-weight:650}
.fix:hover{background:rgba(245,158,11,.22)}
.auto{height:28px;padding:0 10px;border:0;border-radius:8px;background:var(--panel-2);color:var(--muted);font-size:12.5px;font-weight:650;transition:background-color .15s,color .15s}
.auto:hover{background:var(--panel-3);color:var(--text)}
.auto[aria-pressed="true"]{background:var(--accent-soft);color:var(--accent-2)}
.colr{display:flex;align-items:center;gap:6px}
.colr input[type=color]{-webkit-appearance:none;appearance:none;width:36px;height:36px;padding:3px;border:0;border-radius:10px;background:var(--field);box-shadow:inset 0 0 0 1px var(--line-2);cursor:pointer}
.colr input[type=color]::-webkit-color-swatch-wrapper{padding:0}
.colr input[type=color]::-webkit-color-swatch{border:0;border-radius:7px}
.colr input[type=color]::-moz-color-swatch{border:0;border-radius:7px}
.hex,.num{height:36px;border:0;border-radius:10px;background:var(--field);box-shadow:inset 0 0 0 1px var(--line-2);padding:0 10px;color:var(--text);outline:none;transition:box-shadow .15s}
.hex{width:96px;font:13px ui-monospace,Consolas,monospace}
.num{width:64px;text-align:right;font-variant-numeric:tabular-nums;-moz-appearance:textfield}
.num::-webkit-inner-spin-button,.num::-webkit-outer-spin-button{-webkit-appearance:none;margin:0}
.hex:focus,.num:focus{box-shadow:inset 0 0 0 1px var(--accent)}
.hex.bad{box-shadow:inset 0 0 0 1px var(--bad)}
.unit{color:var(--muted);font-size:13px;min-width:18px}
.prop input[type=range]{display:block;width:100%;margin:8px 0 2px;accent-color:var(--accent);cursor:pointer}
.prop .seg{margin-top:8px}
.card > .seg{margin-bottom:12px}
.lbl2{display:block;margin:14px 0 0;color:var(--text-2);font-size:13px;font-weight:600}
/* A part of a card with a title of its own, set off by a line. */
.sub{display:block;margin:12px 0 0;padding-top:14px;border-top:1px solid var(--line-2);color:var(--text);font-size:14.5px;font-weight:650}
.sub + .prop{border-top:0;padding-top:4px}

/* Preview of the theme */
.mini{position:relative;height:132px;margin-bottom:14px;border-radius:12px;overflow:hidden;box-shadow:inset 0 0 0 1px var(--line-2)}
.mini .m-head{position:absolute;left:0;right:0;top:0;height:18px}
.mini .m-card{position:absolute;left:16px;right:16px;top:32px;bottom:16px;padding:14px 16px;border-radius:10px;display:grid;align-content:start;gap:7px}
.mini b,.mini span{display:block;height:8px;width:46%;border-radius:4px}
.mini span{height:6px;width:64%}.mini span.s{width:38%}
.mini em{position:absolute;left:16px;bottom:12px;width:64px;height:16px;border-radius:6px}

/* Choices drawn as small pictures */
.presets{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}
.preset{display:grid;gap:6px;padding:5px 5px 7px;border:0;border-radius:11px;background:none;color:var(--text-2);font-size:12.5px;font-weight:600;text-align:center;transition:background-color .15s}
.preset:hover{background:var(--panel-2)}
.preset[aria-pressed="true"]{background:var(--panel-2);color:var(--text);box-shadow:inset 0 0 0 1.5px var(--accent)}
.preset i{display:block;height:34px;border-radius:8px;position:relative;box-shadow:inset 0 0 0 1px var(--line-2)}
.preset i::after{content:"";position:absolute;left:7px;bottom:7px;width:42%;height:5px;border-radius:3px;background:var(--a)}
.styles{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.styles button{display:grid;gap:8px;padding:10px;border:0;border-radius:12px;background:var(--panel-2);color:var(--text-2);font-size:13.5px;font-weight:600;text-align:left;transition:background-color .15s}
.styles button:hover{background:var(--panel-3)}
.styles button[aria-pressed="true"]{color:var(--text);box-shadow:inset 0 0 0 1.5px var(--accent)}
.sdraw{display:grid;gap:5px;height:44px;padding:6px;border-radius:8px;background:var(--field)}
.sdraw i{border-radius:4px}
.sdraw.lines i{border-bottom:1px solid var(--line-2);border-radius:0}
.sdraw.float i{background:var(--panel-3)}
.imgs{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}
.imgs button{aspect-ratio:16/10;border:0;border-radius:10px;padding:0;background:center/cover var(--panel-2);box-shadow:inset 0 0 0 1px var(--line);color:var(--text-2);font-size:13px;font-weight:600}
.imgs button:hover{color:var(--text)}
.imgs button[aria-pressed="true"]{box-shadow:inset 0 0 0 2px var(--accent)}
.imgs .up{background:var(--panel-2);display:grid;place-items:center}
.imgs .up:hover{background:var(--panel-3)}
.file{display:flex;align-items:center;gap:10px;margin-top:10px;color:var(--text-2);font-size:13px}
.ups-l{margin-top:14px;color:var(--text-2);font-size:13px;font-weight:600}
.ups{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:8px}
.upt{position:relative}
.upt .use{display:block;width:100%;aspect-ratio:16/10;border:0;border-radius:10px;padding:0;background:center/cover var(--panel-2);box-shadow:inset 0 0 0 1px var(--line)}
.upt .use[aria-pressed="true"]{box-shadow:inset 0 0 0 2px var(--accent)}
.upt i{position:absolute;left:6px;bottom:6px;padding:1px 6px;border-radius:5px;background:rgba(0,0,0,.62);color:#fff;font-size:11px;font-style:normal;font-weight:650;pointer-events:none}
.upt .rmup{position:absolute;top:4px;right:4px;display:grid;place-items:center;width:22px;height:22px;padding:0;border:0;border-radius:6px;background:rgba(0,0,0,.62);color:#fff;opacity:0;transition:opacity .15s}
.upt:hover .rmup,.upt .rmup:focus-visible{opacity:1}
.file span{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.frompic{width:100%;margin-top:10px;justify-content:flex-start}
.frompic i{flex:none;width:16px;height:16px;border-radius:5px;box-shadow:inset 0 0 0 1px var(--line-2)}
.frompic i + i{margin-left:-6px}
.quick{display:flex;align-items:center;gap:8px}
.quick button{width:28px;height:28px;flex:none;border:0;border-radius:8px;box-shadow:inset 0 0 0 1px var(--line-2)}
.quick button[aria-pressed="true"]{outline:2px solid var(--text);outline-offset:2px}
.quick .colr{margin-left:auto}
.stops{display:grid;gap:8px;margin-top:4px}
.stop{display:flex;align-items:center;gap:8px}
.stop > span{flex:1;color:var(--text);font-size:14px;font-weight:600}
.rm{width:36px;height:36px;flex:none;border:0;border-radius:10px;background:none;color:var(--muted);font-size:18px;transition:background-color .15s,color .15s}
.rm:hover{background:var(--panel-3);color:var(--text)}
.addstop{margin-top:10px;padding:0;border:0;background:none;color:var(--accent-2);font-size:13.5px;font-weight:600}
.addstop:hover{text-decoration:underline;text-underline-offset:3px}
.move{width:100%;margin:2px 0 10px}
.turns{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}

/* Readability */
.verdict{display:flex;align-items:center;gap:10px;min-height:36px;font-size:14px;font-weight:600}
.verdict.low{color:var(--p2-text)}
.checks{display:grid}
.check{display:flex;align-items:center;gap:10px;min-height:38px;font-size:13.5px;border-top:1px solid var(--line)}
.check:first-child{border-top:0}
.check .nm{flex:1;color:var(--text-2)}
.check .r{font-variant-numeric:tabular-nums;color:var(--muted);font-size:13px}
.ok,.lo{flex:none;width:16px;text-align:center;font-size:13px;font-weight:800}
.ok{color:var(--good)}
.lo{color:var(--p2-text)}
.showall{margin-top:6px;padding:0;border:0;background:none;color:var(--muted);font-size:13px;font-weight:600}
.showall:hover{color:var(--text)}

/* Advanced: parts, then one part */
.outl{display:flex;align-items:center;gap:12px;margin-top:12px;padding-top:12px;border-top:1px solid var(--line);font-size:14px;font-weight:600}
.outl span{flex:1}
.parts{margin:0 -8px}
.part{display:flex;align-items:center;gap:12px;width:100%;min-height:56px;padding:8px;border:0;border-radius:10px;background:none;text-align:left;transition:background-color .12s}
.part:hover{background:var(--panel-2)}
.part .pv{flex:none;display:flex;width:46px;height:32px;border-radius:8px;overflow:hidden;box-shadow:inset 0 0 0 1px var(--line-2)}
.part .pv i{flex:1}
.part .tx{flex:1;min-width:0}
.part b{display:block;font-weight:600;font-size:14.5px}
.part small{display:block;color:var(--muted);font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.part .tag{flex:none;padding:2px 8px;border-radius:6px;background:var(--accent-soft);color:var(--accent-2);font-size:12px;font-weight:650}
.part svg{flex:none;width:16px;height:16px;color:var(--muted)}
.chg{display:flex;align-items:center;gap:10px;min-height:44px;border-top:1px solid var(--line)}
.chg:first-of-type{border-top:0}
.chg button.nm{flex:1;min-width:0;padding:0;border:0;background:none;text-align:left;font-size:14px;font-weight:600}
.chg button.nm:hover{color:var(--accent-2)}
.chg span{color:var(--muted);font-size:13px}
.dt-head{position:sticky;top:-16px;z-index:2;display:flex;align-items:center;gap:10px;margin:-16px -14px 0;padding:12px 18px 12px 10px;background:var(--page);border-bottom:1px solid var(--line)}
.back{width:36px;height:36px;flex:none;border:0;border-radius:10px;background:none;display:grid;place-items:center;color:var(--muted);transition:background-color .15s,color .15s}
.back:hover{background:var(--panel-3);color:var(--text)}
.dt-head .tx{flex:1;min-width:0}
.dt-head b{display:block;font-size:17px;font-weight:700}
.dt-head small{display:block;color:var(--muted);font-size:13px}

/* On the page */
.wire{position:fixed;inset:0;width:100%;height:100%;pointer-events:none}
.wire path{fill:none;stroke:var(--mk);stroke-width:1.25}
.wire circle{fill:var(--mk)}
.marks{position:fixed;inset:0;pointer-events:none}
.box{position:absolute;border:1.5px solid var(--mk);border-radius:8px}
.box.all{border:1px dashed rgba(227,167,47,.5)}
.chip{position:absolute;transform:translateY(-100%);margin-top:-5px;padding:3px 8px;border-radius:6px;background:var(--mk);color:var(--mkink);font-size:12px;font-weight:650;white-space:nowrap}
.chip.all{background:var(--dialog);color:var(--text-2);box-shadow:0 0 0 1px var(--line-2)}
/* The dialogs sit outside the dock, in the layer that lets clicks through to the page: they take them back. */
dialog{pointer-events:auto;border:0;border-radius:18px;background:var(--dialog);color:var(--text);padding:20px 22px;width:min(560px,92vw);box-shadow:0 0 0 1px var(--line-2),0 40px 120px rgba(0,0,0,.7)}
dialog::backdrop{background:rgba(0,0,0,.62)}
dialog h3{margin:0 0 4px;font-size:17px;font-weight:700}
dialog pre,dialog textarea{display:block;width:100%;max-height:52vh;overflow:auto;margin:14px 0 0;padding:12px 14px;border:0;border-radius:11px;background:var(--field);box-shadow:inset 0 0 0 1px var(--line);font:12.5px/1.5 ui-monospace,Consolas,monospace;white-space:pre-wrap;word-break:break-all;scrollbar-width:thin;scrollbar-color:rgba(255,255,255,.12) transparent}
dialog textarea{height:240px;resize:vertical;outline:none}
dialog textarea:focus{box-shadow:inset 0 0 0 1px var(--accent)}
.dbtns{display:flex;justify-content:flex-end;gap:8px;margin-top:14px}
.toast{position:fixed;left:calc((100% - ${DOCK}px) / 2);bottom:68px;transform:translateX(-50%);max-width:min(420px,90vw);padding:8px 12px;border-radius:9px;background:var(--tip);box-shadow:0 10px 30px rgba(0,0,0,.5);font-size:13px;line-height:1.4;pointer-events:none;opacity:0;transition:opacity .15s}
.toast.on{opacity:1}
@media (max-width:900px){
  .frame,.pill{display:none}
  .toast{left:50%}
  .dock{top:auto;height:52vh;width:auto;left:0;border-left:0;border-top:1px solid var(--line-2)}
  .wire{display:none}
  .grab{right:0;bottom:52vh}
}
@media (prefers-reduced-motion:reduce){.dock{animation:none}}`;

  const CHEV = '<svg viewBox="0 0 16 16"><path d="M6 4l4 4-4 4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';
  const BACK = '<svg width="16" height="16" viewBox="0 0 16 16"><path d="M10 4L6 8l4 4" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>';
  const CROSS = '<svg width="14" height="14" viewBox="0 0 16 16"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';

  // ─── What each value is ───
  // Ranges: number fields and sliders share these.
  const RANGE = {
    bgBlur: [0, 30, 'px', 'Blur'], bgDim: [0, 90, '%', 'Darken'], bgFadeLen: [10, 90, '%', 'Fade length'], bgVolume: [0, 100, '%', 'Volume'],
    bgZoom: [25, 400, '%', 'Size'], bgX: [0, 100, '%', 'Horizontal'], bgY: [0, 100, '%', 'Vertical'], bgRot: [-180, 180, '°', 'Turn'],
    headA: [0, 100, '%', 'Opacity'], headBlur: [0, 30, 'px', 'Blur behind'], bannerO: [0, 100, '%', 'Opacity'], bannerBlur: [0, 30, 'px', 'Blur'],
    glassA: [0, 100, '%', 'Opacity'], glassBlur: [0, 30, 'px', 'Blur behind plates'], lineS: [0, 40, '%', 'Strength'],
    panelClear: [0, 40, '%', 'See-through'], panelBlur: [0, 40, 'px', 'Blur behind panels'],
    btnA: [0, 100, '%', 'Fill opacity'], btnLineA: [0, 100, '%', 'Border strength'], btnR: [0, 22, 'px', 'Roundness'],
  };
  // A note under a plain setting, only where the control does not explain itself.
  const DESC = {
    bgDim: 'Mixes the background colour over the picture.', bgFade: 'Where the picture fades into the background colour.',
    bgFit: 'Fill covers the screen, Show all fits the whole picture, Stretch distorts it, Tile repeats it.',
    bgZoom: 'Below 100%, the background colour shows around it.', bgX: 'Which part shows, or where a smaller picture sits.', bgY: 'Which part shows, or where a smaller picture sits.',
    bgRot: 'Around the centre of the screen.', bgSound: 'Plays only in the active tab, after your first click on the page.',
    panelClear: 'Up to 40%. Auto lets through only as much as keeps text on panels readable.',
    panelBlur: 'Frosts what is behind panels and cards, so text on them reads over a picture. 0 shows the picture sharp.',
    glassBlur: 'Frosts what is behind the rank box and the tags over the banner.',
    bannerGap: 'Move profile up puts the name and picture right under the top bar. Keep the space leaves the banner’s place empty, so your background shows there.',
  };

  const PARTS = [
    { g: 'bg', group: 'Page', title: 'Background', desc: 'Behind the whole page', sw: ['page'], controls: [
      { t: 'bggrad' }, { t: 'image' }, { t: 'frame', keys: ['bgFit', 'bgFlip'], when: v => v('bgImg')?.local },
      ...['bgZoom', 'bgX', 'bgY', 'bgRot'].map(k => ({ t: 'range', k, when: v => v('bgImg')?.local })),
      { t: 'range', k: 'bgDim', when: v => v('bgImg') }, { t: 'range', k: 'bgBlur', when: v => v('bgImg') },
      { t: 'seg', k: 'bgFade', label: 'Fade', when: v => v('bgImg'), options: [['none', 'None'], ['bottom', 'Bottom'], ['top', 'Top'], ['left', 'Left'], ['right', 'Right'], ['edges', 'Edges']] },
      { t: 'range', k: 'bgFadeLen', when: v => v('bgImg') && v('bgFade') !== 'none' },
      { t: 'seg', k: 'bgSound', label: 'Video sound', when: v => v('bgImg')?.video, options: [['off', 'Off'], ['on', 'On']] },
      { t: 'range', k: 'bgVolume', when: v => v('bgImg')?.video && v('bgSound') === 'on' },
    ] },
    { g: 'header', group: 'Page', title: 'Top bar', desc: 'Logo, pages and search', sw: ['head'], controls: [
      { t: 'color', k: 'head', label: 'Colour' }, { t: 'range', k: 'headA' }, { t: 'range', k: 'headBlur' },
    ] },
    { g: 'banner', group: 'Page', title: 'Profile banners', desc: 'Image at the top of a profile', sw: [], controls: [
      { t: 'seg', k: 'bannerMode', label: 'Show banners', options: [['all', 'Everyone’s'], ['mine', 'Only mine'], ['none', 'None']] },
      { t: 'seg', k: 'bannerGap', label: 'Without a banner', options: [['close', 'Move profile up'], ['keep', 'Keep the space']], when: v => v('bannerMode') !== 'all' },
      { t: 'range', k: 'bannerO', when: v => v('bannerMode') !== 'none' }, { t: 'range', k: 'bannerBlur', when: v => v('bannerMode') !== 'none' },
    ] },
    { g: 'panel', group: 'Surfaces', title: 'Panels and fields', desc: 'Search, tabs, switches and cards', sw: ['panel', 'field'], controls: [
      { t: 'style' }, { t: 'color', k: 'panel', label: 'Panels' },
      { t: 'linesNote', when: v => v('style') === 'lines' },
      { t: 'range', k: 'panelClear', when: v => v('style') === 'float' }, { t: 'range', k: 'panelBlur' },
      { t: 'color', k: 'field', label: 'Fields' },
    ] },
    { g: 'glass', group: 'Surfaces', title: 'Glass plates', desc: 'Rank box and tags over the banner', sw: ['glass'], controls: [
      { t: 'color', k: 'glass', label: 'Tint' }, { t: 'range', k: 'glassA' }, { t: 'range', k: 'glassBlur' },
    ] },
    { g: 'lines', group: 'Surfaces', title: 'Lines', desc: 'Section and column dividers', sw: ['lineCol'], controls: [
      { t: 'color', k: 'lineCol', label: 'Colour' }, { t: 'range', k: 'lineS' },
    ] },
    { g: 'button', group: 'Controls', title: 'Buttons', desc: 'Compare, Lock, Spin and others', sw: ['btnBg', 'btnLine', 'btnText'], controls: [
      { t: 'color', k: 'btnText', label: 'Text' }, { t: 'color', k: 'btnBg', label: 'Fill' }, { t: 'range', k: 'btnA' },
      { t: 'color', k: 'btnLine', label: 'Border' }, { t: 'range', k: 'btnLineA' }, { t: 'range', k: 'btnR' },
      { t: 'seg', k: 'btnSize', label: 'Size', options: [['s', 'Small'], ['m', 'Medium'], ['l', 'Large']] },
    ] },
    { g: 'accent', group: 'Controls', title: 'Accent', desc: 'Add friend, Rhythm points, active tab, links', sw: ['accent'], controls: [
      { t: 'accent' },
    ] },
    { g: 'text', group: 'Text', title: 'Text', desc: 'Names, numbers and labels', sw: ['text', 'text2', 'muted'], controls: [
      { t: 'color', k: 'text', label: 'Main' }, { t: 'color', k: 'text2', label: 'Secondary' }, { t: 'color', k: 'muted', label: 'Quiet' },
    ] },
  ];
  const PART = Object.fromEntries(PARTS.map(p => [p.g, p]));
  const KEYS_OF = Object.fromEntries(PARTS.map(p => [p.g, p.controls.flatMap(c => c.keys || [c.k]).filter(Boolean)]));
  // What each part outlines on the page, and where the line to its settings starts.
  const OUTLINE = {
    header: 'header.site', banner: '.hero .banner', glass: '.ranks,.rtags', panel: '.site .search,.kpi,.tabs.seg,.pills:not(.mini),.field',
    lines: '.strip,.hero-bar,.intro', button: '.btn:not(.primary),.social', accent: '.btn.primary,.rp b,.tabs .ink', text: '.name,.bio,.sec-head h2',
  };
  const MAIN = { header: 'header.site', banner: '.hero .banner', glass: '.ranks', panel: '.site .search', lines: '.strip', button: '[data-compare],.btn:not(.primary),.social', accent: '.btn.primary', text: '.name' };

  // What a point on the page belongs to: { g: part, el } or { fixed, el } for something that keeps its own
  // colour in every theme (rank and title colours, grades, status, pictures, icons, charts).
  const rgbOfHex = h => { const m = /^#([0-9a-f]{6})$/i.exec(String(h).trim()); return m ? [0, 2, 4].map(i => parseInt(m[1].slice(i, i + 2), 16)).join(',') : ''; };
  const rgbOf = c => (String(c).match(/[\d.]+/g) || []).slice(0, 3).map(n => Math.round(+n)).join(',');
  const ownText = el => [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
  function classify(target, y, root) {
    const el = target.nodeType === 1 ? target : target.parentElement;
    if (!el) return { g: 'bg', el: null };
    const c = s => el.closest(s);
    let hit;
    if ((hit = c('.btn.primary,.tabs .ink,.rp'))) return { g: 'accent', el: hit };
    if ((hit = c('.ranks,.rtags'))) return { g: 'glass', el: hit };
    if ((hit = c('.btn,.social,.link'))) return { g: 'button', el: hit };
    if ((hit = c('header.site'))) return c('.search') ? { g: 'panel', el: c('.search') } : { g: 'header', el: hit };
    if ((hit = c('img,svg,canvas'))) return { fixed: true, el: hit };
    if (ownText(el)) {
      const cs = getComputedStyle(root.querySelector('.exo')), col = rgbOf(getComputedStyle(el).color);
      if (['--text', '--text-2', '--muted'].some(v => rgbOfHex(cs.getPropertyValue(v)) === col)) return { g: 'text', el };
      if (rgbOfHex(cs.getPropertyValue('--accent')) === col) return { g: 'accent', el };
      return { fixed: true, el };
    }
    if ((hit = c('.kpi,.pills,.field,.tabs.seg,.search-wrap,.row'))) return { g: 'panel', el: hit };
    if ((hit = c('.strip,.hero-bar,.tabs'))) return { g: 'lines', el: hit };
    const b = root.querySelector('.hero .banner');
    if (b && c('.hero') && y < b.getBoundingClientRect().bottom) return { g: 'banner', el: b };
    if ((hit = c('.intro,.panel'))) return { g: 'lines', el: hit };
    return { g: 'bg', el: null };
  }

  let S = null; // the open editor

  // opts: { root: Exodus' shadow root, host: its element, theme (saved, or null for a new one), image,
  //         paint(theme, image), save(theme, image) → Promise, remove(id) → Promise, closed(saved) }
  function open(opts) {
    if (S) close();
    const TH = RhythiaX.ExodusThemes;
    const T = opts.theme ? structuredClone(opts.theme) : TH.create();
    const isNew = !opts.theme;
    const host = document.createElement('div');
    host.id = HOST_ID;
    // Above everything, the extension's notices (shared/notices.js) included, while it is open.
    host.style.cssText = 'position:fixed;inset:0;z-index:2147483647;pointer-events:none;display:block';
    const sr = host.attachShadow({ mode: 'open' });
    sr.innerHTML = `<style>${CSS}</style><div class="ed">
      <div class="frame"></div><div class="pill"><span class="p-edit"><b>Editing theme</b> Click any part of the page to edit it</span><span class="p-place"><b>Moving picture</b> Drag to move, scroll to resize, Shift + scroll to turn</span><button class="p-place" data-place>Done</button></div><div class="grab"></div>
      <aside class="dock"><div class="dhead">
        <div class="drow"><h2>Theme editor</h2><button class="x" data-cancel title="Close without saving" aria-label="Close without saving">${CROSS}</button></div>
        <input class="dname" maxlength="40" spellcheck="false" aria-label="Theme name">
        <div class="tabs" data-modes><button data-mode="basic">Basic</button><button data-mode="advanced">Advanced</button></div></div>
        <div class="pane"></div>
        <div class="dfoot"><div class="state" data-state></div><button class="btn primary big" data-save>Save theme</button>
          <div class="more${isNew ? '' : ' split'}"><button class="lnk" data-cancel>Cancel</button><button class="lnk" data-reset>Start over</button>${isNew ? '' : '<button class="btn sm danger del" data-delete>Delete theme</button>'}</div></div></aside>
      <svg class="wire"></svg><div class="marks"></div>
      <dialog class="exp"><h3>Theme file</h3><p class="cap">Copy it to share the theme. An uploaded background is not included.</p><pre></pre><form method="dialog" class="dbtns"><button class="btn primary">Close</button></form></dialog>
      <dialog class="imp"><h3>Import a theme</h3><p class="cap">Paste a theme file. It replaces what you have in the editor.</p><textarea spellcheck="false" aria-label="Theme file"></textarea><div class="dbtns"><button class="btn" data-closedlg>Cancel</button><button class="btn primary" data-doimport>Import</button></div></dialog>
      <dialog class="ask"><h3></h3><p class="cap"></p><form method="dialog" class="dbtns"><button class="btn" value="">Cancel</button><button class="btn danger solid" value="yes"></button></form></dialog>
      <div class="toast" id="toast" role="status"></div></div>`;
    document.body.appendChild(host);
    const $ = s => sr.querySelector(s), $$ = s => [...sr.querySelectorAll(s)];
    $('.dname').value = T.name;
    S = { opts, T, TH, host, sr, $, $$, image: opts.image || null, R: null, mode: 'basic', sel: null, selEl: null, hover: null, hotPart: null,
      showAll: false, raf: 0, lastKey: '', leaving: false, start: '', picUrl: RhythiaX.Colour.blobHolder(), uploads: [] };
    S.start = snapshot();
    // No fades on the page while it is edited: every change is painted at once (shell.js).
    opts.root.querySelector('.exo')?.setAttribute('data-editing', '');
    layout(true);
    bind();
    apply();
    loop();
    refreshUploads();
    return true;
  }

  // ─── Page size: Exodus keeps its desktop layout and shrinks next to the editor ───
  function layout(on, s = S) {
    const h = s.opts.host, small = innerWidth <= 900;
    if (!on) { h.style.removeProperty('zoom'); h.style.removeProperty('width'); h.style.removeProperty('padding-bottom'); return; }
    const z = small ? 1 : Math.min(1, (innerWidth - DOCK) / innerWidth);
    h.style.zoom = String(z);
    h.style.width = small ? '' : innerWidth + 'px';
    h.style.paddingBottom = small ? '52vh' : '';
  }
  const stageRect = () => ({ left: 0, top: 0, right: innerWidth <= 900 ? innerWidth : innerWidth - DOCK, bottom: innerWidth <= 900 ? innerHeight * .48 : innerHeight,
    get width() { return this.right - this.left; }, get height() { return this.bottom - this.top; } });

  // ─── Reading and writing values ───
  const val = k => S.R.val(k);
  const isSeed = k => S.TH.SEEDED.includes(k);
  const isDerived = k => S.TH.DERIVED.includes(k);
  // Changing a value sets it (Auto off); the seed holds the Basic choices.
  function write(k, v) {
    if (k === 'style') S.T.style = v;
    else if (isSeed(k)) S.T.seed[k] = v;
    else S.T.manual[k] = v;
  }
  // The editor wears the colours of the theme it edits, which the page shows meanwhile (ExodusThemes resolve().ui()),
  // worked out with "Keep everything readable" on, so a hand-set colour that does not read never makes the editor
  // itself hard to read.
  function paintOwn() {
    const ed = S.$('.ed'), R = S.T.fit === false ? S.TH.resolve({ ...S.T, fit: true }) : S.R;
    if (!ed) return;
    for (const [k, v] of Object.entries(R.ui())) ed.style.setProperty(k, v);
    ed.style.colorScheme = R.base === 'white' ? 'light' : 'dark';
  }
  function apply() {
    S.R = S.TH.resolve(S.T, S.image);
    S.opts.paint(S.T, S.image);
    paintOwn();
    render();
    // An uploaded picture is read again whenever it, its place or the window changes (a moment later).
    const sig = val('bgImg')?.local && S.image ? `${S.image.length}${S.image.slice(-16)}${JSON.stringify(S.R.frame())}${innerWidth}x${innerHeight}` : '';
    if (sig !== S.zonesSig) { S.zonesSig = sig; clearTimeout(S.zonesT); if (sig) S.zonesT = setTimeout(readPicture, 180); }
  }

  // ─── Reading the picture ───
  // The picture (or the video's current frame) is drawn small as it lies on screen and read in 12 areas
  // (shared/exodus-themes.js zonesFrom), for the Auto darkening and the picture's colours.
  function pictureSource() {
    if (S.R.video) { const v = S.opts.root.querySelector('.exo > video.ownbg'); return v?.readyState >= 2 && v.videoWidth ? [v, v.videoWidth, v.videoHeight] : null; }
    if (S.picFor !== S.image) { S.picFor = S.image; S.pic = new Image(); S.pic.onload = () => { if (S) readPicture(); }; S.pic.src = S.image; }
    return S.pic.complete && S.pic.naturalWidth ? [S.pic, S.pic.naturalWidth, S.pic.naturalHeight] : null;
  }
  function readPicture() {
    if (!S || !val('bgImg')?.local || !S.image) return;
    const got = pictureSource();
    if (!got) { clearTimeout(S.zonesT); S.zonesT = setTimeout(readPicture, 400); return; }
    const [src, nw, nh] = got, f = S.R.frame(), W = 64, H = Math.max(2, Math.round(64 * innerHeight / innerWidth)), k = W / innerWidth;
    const a = f.rot * Math.PI / 180, c = Math.abs(Math.cos(a)), s = Math.abs(Math.sin(a)), tile = f.fit === 'tile';
    const bw = (W * c + H * s) / (tile ? f.zoom : 1), bh = (W * s + H * c) / (tile ? f.zoom : 1);
    const cv = Object.assign(document.createElement('canvas'), { width: W, height: H }), g = cv.getContext('2d', { willReadFrequently: true });
    // The same steps as the layer's CSS (shared/colour.js placeLayer): centred, turned, mirrored, resized around (x, y).
    g.translate(W / 2, H / 2);
    g.rotate(a);
    if (f.flip) g.scale(-1, 1);
    if (f.zoom !== 1) {
      if (tile) g.scale(f.zoom, f.zoom);
      else { const fx = (f.x - 50) / 100 * bw, fy = (f.y - 50) / 100 * bh; g.translate(fx, fy); g.scale(f.zoom, f.zoom); g.translate(-fx, -fy); }
    }
    g.translate(-bw / 2, -bh / 2);
    g.beginPath(); g.rect(0, 0, bw, bh); g.clip();
    try {
      if (tile) {
        const p = g.createPattern(src, 'repeat');
        p.setTransform(new DOMMatrix().translate((bw - nw * k) * f.x / 100, (bh - nh * k) * f.y / 100).scale(k));
        g.fillStyle = p; g.fillRect(0, 0, bw, bh);
      } else {
        let dw = bw, dh = bh;
        if (f.fit !== 'stretch') { const m = (f.fit === 'cover' ? Math.max : Math.min)(bw / nw, bh / nh); dw = nw * m; dh = nh * m; }
        g.drawImage(src, (bw - dw) * f.x / 100, (bh - dh) * f.y / 100, dw, dh);
      }
      const r = S.TH.zonesFrom(g.getImageData(0, 0, W, H).data, W, H);
      S.palette = { avg: r.avg, vivid: r.vivid };
      if (JSON.stringify(S.T.manual.bgZones) !== JSON.stringify(r.zones)) { S.T.manual.bgZones = r.zones; apply(); } else render();
    } catch (_) { /* a picture the browser will not read back: the theme keeps its plain darkening */ }
  }
  // The colour picker and sliders send many changes a second: the page is painted once a frame.
  function applySoon() {
    if (S.applyRaf) return;
    S.applyRaf = requestAnimationFrame(() => { if (!S) return; S.applyRaf = 0; apply(); });
  }
  // What the picture was read as (bgZones) follows the picture; it is not a change of its own.
  const snapshot = () => { const { bgZones, ...manual } = S.T.manual; return JSON.stringify([S.$('.dname').value.trim(), S.T.style, S.T.fit, S.T.seed, manual, S.image ? S.image.length + S.image.slice(-24) : '']); };
  const dirty = () => snapshot() !== S.start;
  function showState(warn) {
    const el = S.$('[data-state]');
    el.className = 'state' + (warn ? ' warn' : dirty() ? ' dirty' : '');
    el.textContent = warn || (dirty() ? 'Unsaved changes' : S.opts.theme ? 'No changes' : 'New theme, not saved');
  }

  // ─── Why a value is what it is ───
  const fmt = n => `${n.toFixed(1)} : 1`;
  const chip = c => `<i style="background:${c}"></i>`;
  const CONTRAST_NAME = { soft: 'Soft', normal: 'Normal', high: 'High' };
  function autoWhy(k) {
    const L = S.TH.LEVEL[S.T.seed.contrast], dark = S.R.D.base !== 'white', lines = S.T.style === 'lines';
    return {
      text: `${dark ? 'Light' : 'Dark'} on a ${dark ? 'dark' : 'light'} background, at least ${L.text} : 1.`,
      text2: `Main text mixed toward the background, at least ${L.text2} : 1.`,
      muted: `Mixed further, at least ${L.muted} : 1.`,
      panel: dark ? 'Background, a little lighter.' : 'Background, closer to white.',
      field: dark ? 'Background, a little darker.' : 'White.',
      glass: 'Background colour.', head: 'Background colour.', lineCol: 'Main text colour.',
      lineS: `From ${CONTRAST_NAME[S.T.seed.contrast]} contrast.`,
      btnBg: dark ? 'Background, a little lighter.' : 'White.',
      btnA: lines ? 'No fill in the Lines style.' : 'Filled in the Floating style.',
      btnLine: 'Main text colour.', btnLineA: lines ? 'Thin border in the Lines style.' : 'No border in the Floating style.',
      btnR: lines ? 'From the Lines style.' : 'From the Floating style.', btnText: 'Main text colour, at least 4.5 : 1 on the button.',
      glassA: S.R.D.onPicture?.length ? 'As clear as your picture allows with text at 7 : 1.' : '',
      glassBlur: S.R.D.onPicture?.length ? 'Stronger over a picture.' : '',
      panelClear: S.R.D.onPicture?.length ? (S.R.val('panelClear') ? 'Some of the picture shows through, text stays at 7 : 1.' : 'Solid: the picture is too busy behind panels.') : 'Solid without a picture.',
      panelBlur: S.R.val('panelClear') || S.T.style === 'lines' ? '' : 'Only with see-through panels.',
      bgDim: S.R.D.onPicture?.length ? `${dark ? 'Darkened' : 'Lightened'} just enough for text to read across the picture.${(() => { const c = S.R.checks.find(x => x[0] === 'picture'); return c ? ` Now ${fmt(S.R.checkRatio(c))}.` : ''; })()}` : '',
    }[k] || '';
  }
  // The line under a value: where an Auto value comes from, or how a set value reads.
  // See-through panels need the Floating style and a picture or gradient behind them.
  const linesNote = () => '<div class="prop" id="p-panelClear"><div class="why">See-through panels need the Floating style.</div></div>';
  function whyHtml(k) {
    const R = S.R, c = R.checks.find(x => x[0] === k), raw = R.picked(k);
    if ((k === 'panelClear' || k === 'panelBlur') && !val('bgImg') && !S.T.seed.page2) return '<div class="why">Needs a background picture or gradient.</div>';
    if (raw) return `<div class="why adj">Picked ${chip(raw)}<b>${raw}</b>, shown as ${chip(val(k))}<b>${val(k)}</b> to stay readable.</div>`;
    const ratio = c ? R.checkRatio(c) : 0;
    if (c && ratio < c[4]) return `<div class="why bad">${fmt(ratio)}, hard to read.<button class="fix" data-fix="${k}">Fix</button></div>`;
    if (isDerived(k) && R.isAuto(k)) { const w = `${autoWhy(k)}${c ? ` Now ${fmt(ratio)}.` : ''}`.trim(); return w ? `<div class="why">${w}</div>` : ''; }
    if (isDerived(k)) return `<div class="why">Set by you${c ? `, ${fmt(ratio)} on its background` : ''}.</div>`;
    if (c) return `<div class="why">${fmt(ratio)} on the background.</div>`;
    return DESC[k] ? `<div class="why">${DESC[k]}</div>` : '';
  }
  // Auto for worked-out values; Default for plain settings once changed.
  function stateBtn(k) {
    if (isDerived(k)) return S.R.isAuto(k)
      ? `<button class="auto" data-unlock="${k}" aria-pressed="true" title="Automatic. Click to set it yourself.">Auto</button>`
      : `<button class="auto" data-auto="${k}" aria-pressed="false" title="Back to automatic">Auto</button>`;
    if (!isSeed(k) && k in S.T.manual) return `<button class="auto" data-def="${k}" title="Back to the default">Default</button>`;
    return '';
  }

  // ─── Controls ───
  const colorInput = (k, v, label) => `<span class="colr"><input type="color" data-k="${k}" value="${v}" aria-label="${esc(label)}"><input class="hex" data-k="${k}" value="${v}" spellcheck="false" maxlength="24" aria-label="${esc(label)}, hex or rgb()"></span>`;
  function colorRow(k, label) {
    const v = isSeed(k) ? S.T.seed[k] : val(k);
    return `<div class="prop" id="p-${k}"><div class="ptop"><span class="lbl">${esc(label)}</span><span class="pctl">${stateBtn(k)}${colorInput(k, v, label)}</span></div>${whyHtml(k)}</div>`;
  }
  function rangeRow(k) {
    const [min, max, unit] = RANGE[k], v = val(k), label = k === 'bgDim' && S.R.D.base === 'white' ? 'Lighten' : RANGE[k][3];
    return `<div class="prop" id="p-${k}"><div class="ptop"><span class="lbl">${label}</span><span class="pctl">${stateBtn(k)}<input class="num" type="number" data-k="${k}" min="${min}" max="${max}" step="1" value="${v}" aria-label="${label}"><span class="unit">${unit}</span></span></div>
      <input type="range" data-k="${k}" min="${min}" max="${max}" step="1" value="${v}" aria-label="${label}">${whyHtml(k)}</div>`;
  }
  function segRow(k, label, options) {
    const v = val(k);
    return `<div class="prop" id="p-${k}"><div class="ptop"><span class="lbl">${esc(label)}</span><span class="pctl">${stateBtn(k)}</span></div>
      <div class="seg">${options.map(([o, l]) => `<button data-k="${k}" data-o="${o}" aria-pressed="${v === o}">${l}</button>`).join('')}</div>${whyHtml(k)}</div>`;
  }
  const quickHtml = (k, v) => S.TH.QUICK.map(x => `<button style="background:${x}" data-k="${k}" data-q="${x}" aria-pressed="${x === v}" aria-label="${x}"></button>`).join('');
  const stopRow = (k, label, removable) => `<div class="stop"><span>${label}</span>${colorInput(k, S.T.seed[k], label)}${removable ? `<button class="rm" data-rmstop="${k}" aria-label="Remove this colour">×</button>` : ''}</div>`;
  const mixedNote = () => (S.R.D.mixed ? '<div class="why bad">Light and dark mixed: no text colour reads on both. Use colours closer in brightness.</div>' : '');
  function stopsHtml() {
    const s = S.T.seed;
    return `<div class="prop" id="p-page"><div class="stops">${stopRow('page', 'First colour')}${stopRow('page2', 'Second colour', !s.page3)}${s.page3 ? stopRow('page3', 'Third colour', true) : ''}</div>
      ${s.page3 ? '' : '<button class="addstop" data-addstop>Add a third colour</button>'}
      <span class="lbl2">Direction</span><div class="seg">${S.TH.DIRS.map(([o, l]) => `<button data-dir="${o}" aria-pressed="${s.dir === o}">${l}</button>`).join('')}</div>${mixedNote()}</div>`;
  }
  // Advanced's background colour: one colour or a gradient.
  function backgroundRow() {
    const on = !!S.T.seed.page2;
    return `<div class="seg"><button data-bgmode="solid" aria-pressed="${!on}">One colour</button><button data-bgmode="gradient" aria-pressed="${on}">Gradient</button></div>
      ${on ? stopsHtml() : colorRow('page', 'Colour') + mixedNote()}`;
  }
  function accentWhy() {
    const adjusted = S.R.picked('accent') || S.R.picked('accent2');
    if (adjusted) return `<div class="why adj">Shown as ${chip(S.R.D.accent)}<b>${S.R.D.accent}</b>${S.R.D.accent2 ? ` → ${chip(S.R.D.accent2)}<b>${S.R.D.accent2}</b>` : ''} so it stays readable.</div>`;
    return S.R.checkRatio(S.R.checks.find(c => c[0] === 'accent')) < 3 ? '<div class="why bad">Hard to see on this background.<button class="fix" data-fix="accent">Fix</button></div>' : '';
  }
  function accentRow() {
    const s = S.T.seed, on = !!s.accent2;
    return `<div class="prop" id="p-accent"><div class="quick">${quickHtml('accent', s.accent)}</div><div class="ptop" style="margin-top:10px"><span class="lbl">Colour</span>${colorInput('accent', s.accent, 'Accent')}</div>
      <div class="seg" style="margin-top:12px"><button data-accmode="solid" aria-pressed="${!on}">One colour</button><button data-accmode="gradient" aria-pressed="${on}">Gradient</button></div>
      ${on ? `<div class="stops" style="margin-top:10px">${stopRow('accent2', 'Second colour')}</div>` : ''}${accentWhy()}</div>`;
  }
  // Built-in pictures, then your own file.
  function pictureRow(none) {
    const v = val('bgImg');
    return `<div class="prop" id="p-bgImg"><div class="imgs">${none ? `<button data-img="" aria-pressed="${!v}">None</button>` : ''}
        ${Object.entries(S.TH.SAMPLES).map(([id, css]) => `<button style="background:${css}" data-img="${id}" aria-pressed="${v?.sample === id}" aria-label="Built-in picture ${id}"></button>`).join('')}
        <button class="up" data-up aria-pressed="${!!v?.local}" aria-label="${v?.local ? 'Your file. Add a new one' : 'Upload a picture or video'}"${v?.local && !v.video && S.image ? ` style="background:${PIC}"` : ''}>${v?.local && !v.video && S.image ? '' : v?.video ? 'Video' : 'Upload'}</button></div>
      ${v?.local ? `<div class="file"><span>${esc(v.name || (v.video ? 'Your video' : 'Your picture'))}</span><button class="btn sm" data-up>Add new</button></div>` : '<div class="why">Pictures and GIFs up to 8 MB, MP4 or WebM videos up to 20 MB.</div>'}
      ${v?.local && S.palette?.avg ? `<button class="btn frompic" data-frompic><i style="background:${S.palette.avg}"></i>${S.palette.vivid ? `<i style="background:${S.palette.vivid}"></i>` : ''}Use the picture's colours</button>` : ''}
      ${v?.local && S.T.manual.bgZones ? `<button class="btn frompic" data-readable>Set blur and ${S.R.D.base === 'white' ? 'lightening' : 'darkening'} for readable text</button>
        <div class="why">Picks them from how light and busy the picture is. They stay yours to change below.</div>` : ''}
      ${uploadsHtml()}
      <input type="file" accept="image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm" hidden data-file></div>`;
  }
  // The last uploads, kept on this device (shared/uploads.js): a click uses one again.
  function uploadsHtml() {
    if (!S.uploads.length) return '';
    const im = val('bgImg'), sig = im?.local && S.image ? uploadSig() : '';
    const KIND = { gif: 'GIF', video: 'Video' };
    return `<div class="ups-l">Recent uploads</div><div class="ups">${S.uploads.map(u => `<span class="upt">
        <button class="use" data-upload="${u.id}" aria-pressed="${u.sig === sig}" aria-label="Use ${esc(u.name || 'this upload')}" title="${esc(u.name)}"${u.thumb ? ` style="background-image:${cssUrl(u.thumb)}"` : ''}></button>
        ${KIND[u.kind] ? `<i>${KIND[u.kind]}</i>` : ''}<button class="rmup" data-unupload="${u.id}" aria-label="Remove from recent uploads" title="Remove from recent uploads">${CROSS}</button></span>`).join('')}</div>
      <div class="why">Your last ${RhythiaX.Uploads.MAX} uploads, kept on this device for any theme.</div>`;
  }
  // The signature of the file in use, worked out once per file.
  function uploadSig() {
    if (S.sigFor !== S.image) { S.sigFor = S.image; S.sig = RhythiaX.Uploads.sigOf(S.image); }
    return S.sig;
  }
  function refreshUploads() {
    const mine = S;
    RhythiaX.Uploads.read().then(l => { if (S === mine) { S.uploads = l; render(); } }, () => {});
  }
  // A picked file or a recent upload becomes the background, filling the screen; its colours are read again.
  function useMedia(url, name, video) {
    S.image = url;
    S.T.manual.bgImg = { local: true, name: String(name || '').slice(0, 80), video };
    S.TH.FRAME.forEach(k => { delete S.T.manual[k]; });
    delete S.T.manual.bgZones; S.palette = null;
    apply();
  }
  // A new upload joins the recent uploads, and so does the file it replaced, which may be older than the list.
  async function keepUpload(media, name, old) {
    const mine = S;
    try {
      if (old && old.media !== media) await RhythiaX.Uploads.add(old.media, old.name);
      await RhythiaX.Uploads.add(media, name);
    } catch (_) {
      if (S === mine) toast('Could not keep this file in Recent uploads.');
    }
    refreshUploads();
  }
  // Where an uploaded picture or video sits. Basic shows the move button and the fit; Advanced adds turn and mirror.
  function frameRow(full) {
    const f = S.R.frame(), set = S.TH.FRAME.some(k => k in S.T.manual);
    const fits = [['cover', 'Fill'], ['contain', 'Show all'], ['stretch', 'Stretch'], ...(S.R.video ? [] : [['tile', 'Tile']])];
    return `<div class="prop" id="p-frame"><div class="ptop"><span class="lbl">Position and size</span><span class="pctl">${set ? '<button class="auto" data-framereset title="Fill, centred, not turned">Reset</button>' : ''}</span></div>
      <button class="btn move${S.placing ? ' primary' : ''}" data-place aria-pressed="${Boolean(S.placing)}">${S.placing ? 'Done moving' : 'Move on the page'}</button>
      <div class="seg">${fits.map(([o, l]) => `<button data-k="bgFit" data-o="${o}" aria-pressed="${f.fit === o}">${l}</button>`).join('')}</div>
      ${full ? `<div class="turns"><button class="btn sm" data-turn="-90">↺ Turn left</button><button class="btn sm" data-turn="90">↻ Turn right</button><button class="btn sm" data-flip aria-pressed="${f.flip}">⇋ Mirror</button></div>` : ''}
      <div class="why">${S.placing ? 'Drag to move, scroll to resize, Shift + scroll to turn.' : DESC.bgFit}</div></div>`;
  }
  const STYLE_DRAW = { lines: '<span class="sdraw lines"><i></i><i></i></span>', float: '<span class="sdraw float"><i></i><i></i></span>' };
  function styleRow() {
    return `<div class="prop" id="p-style"><div class="styles">${[['lines', 'Lines'], ['float', 'Floating']].map(([o, l]) => `<button data-k="style" data-o="${o}" aria-pressed="${S.T.style === o}">${STYLE_DRAW[o]}${l}</button>`).join('')}</div></div>`;
  }
  function fitRow() {
    const on = S.T.fit !== false;
    return `<div class="prop" id="p-fit"><div class="ptop"><span class="lbl">Keep text readable</span><button class="switch" data-fit role="switch" aria-checked="${on}" aria-label="Keep text readable"></button></div>
      <div class="why">${on ? 'Colours you pick are adjusted just enough to stay readable.' : 'Colours are used as picked.'}</div></div>`;
  }
  function contrastRow() {
    const c = S.T.seed.contrast;
    return `<div class="prop" id="p-contrast"><div class="ptop"><span class="lbl">Contrast</span></div>
      <div class="seg">${[['soft', 'Soft'], ['normal', 'Normal'], ['high', 'High']].map(([o, l]) => `<button data-contrast="${o}" aria-pressed="${c === o}">${l}</button>`).join('')}</div></div>`;
  }
  const checkOk = c => S.R.checkRatio(c) >= c[4];
  const checkHtml = c => { const ok = checkOk(c);
    return `<div class="check"><span class="${ok ? 'ok' : 'lo'}">${ok ? '✓' : '!'}</span><span class="nm">${c[1]}</span><span class="r">${fmt(S.R.checkRatio(c))}</span>${ok || c[0] === 'onAccent' ? '' : `<button class="fix" data-fix="${c[0]}">Fix</button>`}</div>`; };
  const checksHtml = list => `<div class="checks">${list.map(checkHtml).join('')}</div>`;
  // One line when everything reads well; the problems, each with Fix, when not.
  function readability() {
    const bad = S.R.checks.filter(c => !checkOk(c));
    const head = bad.length ? `<div class="verdict low"><span class="lo">!</span>${bad.length === 1 ? 'One colour is' : `${bad.length} colours are`} hard to read</div>${checksHtml(bad)}`
      : '<div class="verdict"><span class="ok">✓</span>All text is readable</div>';
    return `${head}${S.allChecks ? checksHtml(S.R.checks.filter(checkOk)) : ''}<button class="showall" data-allchecks>${S.allChecks ? 'Hide the checks' : 'Show every check'}</button>`;
  }
  function ctlHtml(c) {
    if (c.when && !c.when(val)) return '';
    if (c.t === 'bggrad') return backgroundRow();
    if (c.t === 'accent') return accentRow();
    if (c.t === 'image') return pictureRow(true);
    if (c.t === 'frame') return frameRow(true);
    if (c.t === 'linesNote') return linesNote();
    if (c.t === 'style') return styleRow();
    if (c.t === 'color') return colorRow(c.k, c.label);
    if (c.t === 'range') return rangeRow(c.k);
    if (c.t === 'seg') return segRow(c.k, c.label, c.options);
    return '';
  }

  // ─── Basic ───
  const presetOn = p => { const s = S.T.seed; return s.page === p.page && s.accent === p.accent && (s.page2 || null) === (p.page2 || null) && (s.accent2 || null) === (p.accent2 || null) && !s.page3; };
  const kindOf = () => (val('bgImg') ? 'picture' : S.T.seed.page2 ? 'gradient' : 'solid');
  // The theme in small: background (with the picture and its darkening), top bar, a panel with three kinds of text and an accent.
  function miniHtml() {
    const R = S.R, im = val('bgImg');
    const pic = im?.sample ? S.TH.SAMPLES[im.sample] : im?.local && !im.video && S.image ? PIC : '';
    const bg = pic ? `linear-gradient(color-mix(in srgb,${val('page')} ${val('bgDim')}%,transparent) 0 0),${pic}` : R.pageBg();
    const card = S.T.style === 'lines' ? `box-shadow:inset 0 0 0 1px color-mix(in srgb,${val('lineCol')} ${val('lineS')}%,transparent)` : `background:${val('panel')}`;
    return `<div class="mini" style="background:${bg}" aria-hidden="true"><i class="m-head" style="background:${val('head')}"></i>
      <div class="m-card" style="${card}"><b style="background:${val('text')}"></b><span style="background:${val('text2')}"></span><span class="s" style="background:${val('muted')}"></span><em style="background:${R.accentBg()}"></em></div></div>`;
  }
  function backgroundCard() {
    const k = kindOf(), im = val('bgImg');
    let body = k === 'solid' ? colorRow('page', 'Colour') + mixedNote() : k === 'gradient' ? stopsHtml() : pictureRow(false);
    if (k === 'picture') {
      body += colorRow('page', 'Page colour');
      if (im?.local) body += frameRow(false);
      body += rangeRow('bgDim') + rangeRow('bgBlur');
      // Over a picture, panels and plates are frosted so text reads (shared/exodus-themes.js derive): set here, not only in Advanced.
      body += '<span class="sub">Over the picture</span>' + rangeRow('panelBlur') + rangeRow('glassBlur');
      if (im?.video) body += segRow('bgSound', 'Video sound', [['off', 'Off'], ['on', 'On']]) + (val('bgSound') === 'on' ? rangeRow('bgVolume') : '');
    }
    return `<section class="card"><h3>Background</h3><div class="seg">${[['solid', 'Colour'], ['gradient', 'Gradient'], ['picture', 'Picture']].map(([o, l]) => `<button data-bgkind="${o}" aria-pressed="${k === o}">${l}</button>`).join('')}</div>${body}</section>`;
  }
  function basicHtml() {
    const G = S.TH.gradient, s = S.T.seed;
    return `<section class="card">${miniHtml()}<div class="presets">${S.TH.PRESETS.map(p => `<button class="preset" data-preset="${p.n}" aria-pressed="${presetOn(p)}"><i style="background:${G([p.page, p.page2].filter(Boolean), p.dir)};--a:${G([p.accent, p.accent2].filter(Boolean), 'across')}"></i>${p.n}</button>`).join('')}</div></section>
      ${backgroundCard()}
      <section class="card"><h3>Accent</h3><div class="prop" id="p-accent"><div class="quick">${quickHtml('accent', s.accent)}</div><div class="ptop" style="margin-top:10px"><span class="lbl">Colour</span>${colorInput('accent', s.accent, 'Accent')}</div>
        ${s.accent2 ? `<div class="stops" style="margin-top:10px">${stopRow('accent2', 'Second colour')}</div>` : ''}${accentWhy()}</div></section>
      <section class="card"><h3>Look</h3>${styleRow()}${contrastRow()}${segRow('bannerMode', 'Profile banners', [['all', 'Everyone’s'], ['mine', 'Only mine'], ['none', 'None']])}</section>
      <section class="card"><h3>Readability</h3>${readability()}${fitRow()}</section>`;
  }

  // ─── Advanced ───
  const setCount = p => KEYS_OF[p.g].filter(k => k in S.T.manual).length;
  function previewHtml(p) {
    if (p.g === 'banner') {
      const url = S.opts.root.querySelector('.hero .banner')?.style.backgroundImage.match(/url\(["']?([^"')]+)/)?.[1] || '';
      return `<span class="pv" style="background:center/cover ${url ? cssUrl(url) : 'none'};opacity:${val('bannerMode') === 'none' ? .25 : 1}"></span>`;
    }
    if (p.g === 'bg') { const im = val('bgImg'); return `<span class="pv" style="background:${im?.sample ? S.TH.SAMPLES[im.sample] : im?.local && !im.video && S.image ? PIC : S.R.pageBg()}"></span>`; }
    if (p.g === 'accent') return `<span class="pv" style="background:${S.R.accentBg()}"></span>`;
    return `<span class="pv">${p.sw.map(k => `<i style="background:${val(k)}"></i>`).join('')}</span>`;
  }
  function partsHtml() {
    const changed = PARTS.filter(setCount);
    let html = `<section class="card"><h3>Parts</h3><p class="cap">Click any part of the page, or choose it below.</p>
      <div class="outl"><span>Outline the parts on the page</span><button class="switch" data-showparts role="switch" aria-checked="${S.showAll}" aria-label="Outline the parts on the page"></button></div></section>`;
    if (changed.length) html += `<section class="card"><h3>Changed <small>${changed.length} of ${PARTS.length}</small></h3>${changed.map(p => { const n = setCount(p);
      return `<div class="chg"><button class="nm" data-open="${p.g}">${p.title}</button><span>${n} ${n === 1 ? 'setting' : 'settings'}</span><button class="btn sm" data-resetpart="${p.g}">Reset</button></div>`; }).join('')}</section>`;
    for (const group of [...new Set(PARTS.map(p => p.group))]) {
      html += `<section class="card"><h3>${group}</h3><div class="parts">${PARTS.filter(p => p.group === group).map(p => { const n = setCount(p);
        return `<button class="part" data-open="${p.g}">${previewHtml(p)}<span class="tx"><b>${p.title}</b><small>${p.desc}</small></span>${n ? `<span class="tag">${n} set</span>` : ''}${CHEV}</button>`; }).join('')}</div></section>`;
    }
    return html + `<section class="card"><h3>Readability</h3>${readability()}${fitRow()}</section>
      <section class="card"><h3>Theme file</h3><div class="btns"><button class="btn" data-export>Export</button><button class="btn" data-import>Import</button></div></section>`;
  }
  const COLOUR_CTL = ['color', 'accent', 'bggrad', 'style'];
  function detailHtml() {
    const p = PART[S.sel], n = setCount(p);
    const card = (h, list) => { const body = list.map(ctlHtml).join(''); return body ? `<section class="card"><h3>${h}</h3>${body}</section>` : ''; };
    return `<div class="dt-head"><button class="back" data-back aria-label="All parts">${BACK}</button>
      <span class="tx" data-title><b>${p.title}</b><small>${p.desc}</small></span>${n ? `<button class="btn sm" data-resetpart="${p.g}">Reset</button>` : ''}</div>
      ${card(p.g === 'bg' ? 'Colour' : p.g === 'panel' ? 'Style and colours' : 'Colours', p.controls.filter(c => COLOUR_CTL.includes(c.t)))}
      ${card(p.g === 'bg' ? 'Picture' : p.g === 'banner' ? 'Banners' : 'Settings', p.controls.filter(c => !COLOUR_CTL.includes(c.t)))}`;
  }

  // ─── Drawing the dock, in place ───
  const view = () => (S.mode === 'basic' ? 'basic' : S.sel ? 'detail:' + S.sel : 'parts');
  // Taking a field out of the panel can blur it, and a blur can ask for another render: that one waits.
  function render() {
    if (S.rendering) { S.renderAgain = true; return; }
    S.rendering = true;
    try { draw1(); } finally { S.rendering = false; }
    if (S.renderAgain) { S.renderAgain = false; queueMicrotask(() => S && render()); }
  }
  function draw1() {
    const v = view(), pane = S.$('.pane');
    setPicture();
    S.$$('[data-modes] button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.mode === S.mode)));
    const html = v === 'basic' ? basicHtml() : v === 'parts' ? partsHtml() : detailHtml();
    // A new view starts at the top; the same view is brought up to date in place.
    if (pane.dataset.view !== v) { pane.dataset.view = v; pane.innerHTML = html; pane.scrollTop = 0; } else morph(pane, html);
    showState();
  }
  function select(g) { S.sel = g; S.selEl = null; S.mode = 'advanced'; render(); }
  // The editor's own #toast, in its shadow root (core/kit.js keeps one timer for it).
  function toast(m) { RhythiaX.ExodusKit.toast(S.sr, m); }
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
  function bind() {
    const { sr, $ } = S;
    const s = () => S.T.seed;
    sr.addEventListener('click', async e => {
      const b = e.target.closest('button');
      if (!b || !S) return;
      const d = b.dataset;
      if (d.mode) { S.mode = d.mode; if (d.mode === 'basic') S.sel = null; render(); return; }
      if ('cancel' in d) { leave(); return; }
      if ('save' in d) { await save(); return; }
      if ('delete' in d) {
        // Answers act only on the editor they belong to, never on one opened later.
        const mine = S;
        if (mine.removing) return;
        const name = $('.dname').value.trim() || mine.T.name;
        if (!await ask(`Delete “${name}”?`, 'The theme and its uploaded background are removed from your themes. This cannot be undone.', 'Delete theme') || S !== mine) return;
        mine.removing = true; b.disabled = true;
        try {
          await mine.opts.remove(mine.T.id);
        } catch (_) {
          if (S !== mine) return;
          mine.removing = false; b.disabled = false;
          toast('Could not delete this theme. Try again.');
          return;
        }
        if (S === mine) close();
        return;
      }
      if ('reset' in d) {
        const mine = S;
        if (!await ask('Start over?', `Every colour, background and part you set here goes back to the default look. This cannot be undone.${mine.opts.theme ? ' The saved theme changes only when you save.' : ''}`, 'Start over') || S !== mine) return;
        S.T.seed = S.TH.seedFrom(S.TH.PRESETS[0]); S.T.manual = {}; S.T.style = 'lines'; S.T.fit = true; S.image = null; apply(); return; }
      if ('export' in d) { const { image, ...t } = { ...S.T }; $('dialog.exp pre').textContent = JSON.stringify({ format: 'rhythiax-theme', version: 1, ...t, name: $('.dname').value.trim() || t.name }, null, 2); $('dialog.exp').showModal(); return; }
      if ('import' in d) { $('dialog.imp textarea').value = ''; $('dialog.imp').showModal(); return; }
      if ('closedlg' in d) { b.closest('dialog').close(); return; }
      if ('doimport' in d) { importTheme(); return; }
      if ('allchecks' in d) { S.allChecks = !S.allChecks; render(); return; }
      if ('showparts' in d) { S.showAll = !S.showAll; render(); return; }
      if ('fit' in d) { S.T.fit = S.T.fit === false; apply(); return; }
      if (d.preset) { const keep = s().contrast; S.T.seed = S.TH.seedFrom(S.TH.PRESETS.find(x => x.n === d.preset), keep); apply(); return; }
      if (d.contrast) { s().contrast = d.contrast; apply(); return; }
      if (d.bgkind) {
        if (d.bgkind === 'picture') { if (!val('bgImg')) { S.T.manual.bgImg = { sample: Object.keys(S.TH.SAMPLES)[0] }; delete S.T.manual.bgZones; } }
        else {
          delete S.T.manual.bgImg; delete S.T.manual.bgZones; S.image = null; S.palette = null;
          if (d.bgkind === 'solid') s().page2 = s().page3 = null; else s().page2 ||= S.TH.mix(s().page, s().accent, S.R.D.base === 'white' ? .15 : .3);
        }
        apply(); if (S.placing && !val('bgImg')?.local) placing(false); return;
      }
      if (d.bgmode) { if (d.bgmode === 'solid') s().page2 = s().page3 = null; else s().page2 ||= S.TH.mix(s().page, s().accent, S.R.D.base === 'white' ? .15 : .3); apply(); return; }
      if ('addstop' in d) { s().page3 = S.TH.mix(s().page2, s().accent, .25); apply(); return; }
      if (d.rmstop) { if (d.rmstop === 'page2') s().page2 = s().page3 = null; else s().page3 = null; apply(); return; }
      if (d.dir) { s().dir = d.dir; apply(); return; }
      if (d.accmode) { s().accent2 = d.accmode === 'solid' ? null : s().accent2 || (s().accent === '#f472b6' ? '#60a5fa' : '#f472b6'); apply(); return; }
      if (d.open) { select(d.open); return; }
      if ('back' in d) { S.sel = null; render(); return; }
      if (d.unlock) { S.T.manual[d.unlock] = val(d.unlock); apply(); S.$(`#p-${d.unlock} .hex, #p-${d.unlock} .num`)?.focus(); return; }
      if (d.auto) { delete S.T.manual[d.auto]; apply(); return; }
      if (d.def) { delete S.T.manual[d.def]; apply(); return; }
      if (d.fix) { fix(d.fix); return; }
      if (d.resetpart) { KEYS_OF[d.resetpart].forEach(k => { delete S.T.manual[k]; }); apply(); return; }
      if ('place' in d) { placing(!S.placing); return; }
      if (d.turn) { const r = val('bgRot') + +d.turn; S.T.manual.bgRot = ((r + 180) % 360 + 360) % 360 - 180; apply(); return; }
      if ('flip' in d) { S.T.manual.bgFlip = val('bgFlip') === 'on' ? 'off' : 'on'; apply(); return; }
      if ('framereset' in d) { S.TH.FRAME.forEach(k => { delete S.T.manual[k]; }); apply(); return; }
      if (d.o) { write(d.k, d.o); apply(); return; }
      if (d.q) { write(d.k, d.q); apply(); return; }
      if ('img' in d) { if (d.img) S.T.manual.bgImg = { sample: d.img }; else { delete S.T.manual.bgImg; S.image = null; } delete S.T.manual.bgZones; S.palette = null; apply(); placing(false); return; }
      if ('frompic' in d && S.palette?.avg) {
        const p = S.TH.fromPicture(S.palette.avg, S.palette.vivid);
        Object.assign(S.T.seed, { page: p.page, page2: null, page3: null }, p.accent ? { accent: p.accent, accent2: null } : {});
        apply();
        toast('Background and accent set from the picture.');
        return;
      }
      // Readable picture settings (ExodusThemes.readablePicture): filled in once, then the player's own.
      if ('readable' in d) {
        const r = S.TH.readablePicture(S.T);
        if (r) {
          Object.assign(S.T.manual, r);
          apply();
          toast(`Blur ${r.bgBlur} px and ${S.R.D.base === 'white' ? 'lighten' : 'darken'} ${r.bgDim}% set for this picture.`);
        }
        return;
      }
      if ('up' in d) S.$('[data-file]')?.click();
      if (d.upload) {
        const mine = S, u = S.uploads.find(x => x.id === d.upload);
        const media = await RhythiaX.Uploads.get(d.upload).catch(() => null);
        if (S !== mine) return;
        if (!media) { toast('That upload is no longer on this device.'); refreshUploads(); return; }
        useMedia(media, u?.name, RhythiaX.Colour.isVideo(media));
        return;
      }
      if (d.unupload) {
        const mine = S, id = d.unupload;
        if (!await ask('Remove this upload?', 'It is removed from Recent uploads on this device. Themes that use it keep their own copy.', 'Remove') || S !== mine) return;
        RhythiaX.Uploads.remove(id).then(refreshUploads, () => toast('Could not remove it. Try again.'));
      }
    });
    sr.addEventListener('input', e => {
      const t = e.target, k = t.dataset.k;
      if (!k || !S) return;
      if (t.type === 'range') write(k, +t.value);
      else if (t.classList.contains('num')) {
        const [min, max] = RANGE[k];
        if (t.value === '' || !Number.isFinite(+t.value)) return;
        write(k, Math.min(max, Math.max(min, Math.round(+t.value))));
      } else if (t.type === 'color') write(k, t.value);
      else if (t.classList.contains('hex')) { const v = S.TH.parseColour(t.value); t.classList.toggle('bad', !v); if (!v) return; write(k, v); }
      applySoon();
    });
    // When a field is let go, it shows the value in use again (a number clamped, a colour as #rrggbb).
    sr.addEventListener('change', async e => {
      const t = e.target;
      if (t.matches('[data-file]')) {
        const f = t.files?.[0];
        t.value = '';
        if (!f) return;
        try {
          // GIFs and videos are kept as they are, up to a size; other pictures become JPEG (shared/colour.js).
          const m = await RhythiaX.Colour.readMedia(f);
          const im = val('bgImg'), old = im?.local && S.image ? { media: S.image, name: im.name } : null;
          useMedia(m.url, f.name, m.video);
          keepUpload(m.url, f.name, old);
        } catch (err) {
          toast(({ 'video-size': 'That video is over 20 MB.', 'gif-size': 'That GIF is over 8 MB.' })[err.message]
            || 'Could not read that file. Use PNG, JPEG, WebP, GIF, MP4 or WebM.');
        }
        return;
      }
      if (t.matches('.hex,.num')) { t.classList.remove('bad'); queueMicrotask(() => S && render()); }
    });
    sr.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.matches('.hex,.num,.dname')) e.target.blur(); });
    $('.dname').addEventListener('input', () => showState());

    // Picking on the page.
    S.pick = e => {
      if (!S) return;
      e.preventDefault(); e.stopPropagation();
      const hit = classify(e.target, e.clientY, S.opts.root);
      if (hit.fixed) { toast('Fixed in every theme, like rank colours, grades and pictures.'); return; }
      select(hit.g);
      S.selEl = hit.el;
    };
    S.move = e => { S.hover = classify(e.target, e.clientY, S.opts.root); };
    S.leave = () => { S.hover = null; };
    S.resize = () => layout(true);
    // Escape already used by something else (the page's search, a dialog on the page or in the dock) is not for the editor.
    S.key = e => {
      if (e.key !== 'Escape' || e.defaultPrevented || !S || S.sr.querySelector('dialog[open]') || S.opts.root.querySelector('dialog[open]')) return;
      if (S.placing) placing(false); else leave();
    };
    S.opts.root.addEventListener('click', S.pick, true);
    S.opts.root.addEventListener('mousemove', S.move);
    S.opts.host.addEventListener('mouseleave', S.leave);
    sr.addEventListener('mouseover', e => { S.hotPart = e.target.closest?.('[data-open]')?.dataset.open || null; });
    addEventListener('resize', S.resize);
    addEventListener('keydown', S.key);
    bindPlacing();
  }

  // ─── Moving the picture on the page ───
  // A layer over the page takes the pointer: drag sets bgX/bgY, wheel bgZoom, Shift + wheel bgRot.
  function placing(on) {
    S.placing = on && Boolean(val('bgImg')?.local);
    S.$('.ed').classList.toggle('placing', S.placing);
    S.hover = null;
    S.drag = null;
    if (S.placing) mediaSize();
    render();
  }
  // The picture's or video's own size in pixels, or null while it is not known yet.
  function mediaSize() {
    if (S.R.video) { const v = S.opts.root.querySelector('.exo > video.ownbg'); return v?.videoWidth ? [v.videoWidth, v.videoHeight] : null; }
    if (!S.image) return null;
    if (S.natFor !== S.image) {
      S.natFor = S.image; S.nat = null;
      const img = new Image();
      img.onload = () => { if (S && S.natFor === img.src) S.nat = [img.naturalWidth, img.naturalHeight]; };
      img.src = S.image;
    }
    return S.nat;
  }
  // bgX/bgY change for a drag of dx, dy screen pixels: the drag in the layer's own axes, divided by the
  // room the picture has to move in.
  function placeBy(dx, dy) {
    const f = S.R.frame(), n = mediaSize() || [innerWidth, innerHeight], tile = f.fit === 'tile';
    const a = f.rot * Math.PI / 180, c = Math.abs(Math.cos(a)), s = Math.abs(Math.sin(a)), k = tile ? f.zoom : 1;
    const bw = (innerWidth * c + innerHeight * s) / k, bh = (innerWidth * s + innerHeight * c) / k;
    let ex = (dx * Math.cos(a) + dy * Math.sin(a)) / k, ey = (dy * Math.cos(a) - dx * Math.sin(a)) / k;
    if (f.flip) ex = -ex;
    let rw = bw, rh = bh;
    if (tile) [rw, rh] = n;
    else if (f.fit !== 'stretch') { const m = (f.fit === 'cover' ? Math.max : Math.min)(bw / n[0], bh / n[1]); rw = n[0] * m; rh = n[1] * m; }
    const z = tile ? 1 : f.zoom, step = (d, b, r) => (Math.abs(b - z * r) < 1 ? 0 : d / (b - z * r) * 100);
    return [step(ex, bw, rw), step(ey, bh, rh)];
  }
  function bindPlacing() {
    const grab = S.$('.grab'), clamp = (v, [lo, hi]) => Math.min(hi, Math.max(lo, Math.round(v)));
    // Painting waits for the next frame, so a fast drag paints once per frame.
    const soon = () => { if (!S.placeRaf) S.placeRaf = requestAnimationFrame(() => { if (!S) return; S.placeRaf = 0; apply(); }); };
    grab.addEventListener('pointerdown', e => {
      e.preventDefault();
      grab.setPointerCapture(e.pointerId);
      grab.classList.add('on');
      S.drag = { x: e.clientX, y: e.clientY, bx: val('bgX'), by: val('bgY') };
    });
    grab.addEventListener('pointermove', e => {
      if (!S?.drag) return;
      const [ax, ay] = placeBy(e.clientX - S.drag.x, e.clientY - S.drag.y);
      S.T.manual.bgX = clamp(S.drag.bx + ax, RANGE.bgX);
      S.T.manual.bgY = clamp(S.drag.by + ay, RANGE.bgY);
      soon();
    });
    const end = () => { if (!S) return; S.drag = null; grab.classList.remove('on'); };
    grab.addEventListener('pointerup', end);
    grab.addEventListener('pointercancel', end);
    grab.addEventListener('wheel', e => {
      e.preventDefault();
      const d = e.deltaY || e.deltaX;
      if (!d) return;
      if (e.shiftKey) S.T.manual.bgRot = clamp(val('bgRot') + Math.sign(d) * 5, RANGE.bgRot);
      else S.T.manual.bgZoom = clamp(val('bgZoom') * (d < 0 ? 1.08 : 1 / 1.08), RANGE.bgZoom);
      soon();
    }, { passive: false });
  }

  // Fix: the least change that makes a value readable on its background.
  function fix(k) {
    const c = S.R.checks.find(x => x[0] === k);
    if (!c) return;
    const bgs = c[3](), to = S.TH.inkFor(bgs);
    // Text on the picture: the darkening goes back to Auto, which is worked out for exactly that.
    if (k === 'picture') delete S.T.manual.bgDim;
    else if (k === 'accent') S.T.seed.accent = S.TH.reach(S.T.seed.accent, bgs, c[4] + .1, to);
    else S.T.manual[k] = S.TH.reach(val(k), bgs, c[4] + .2, to);
    apply();
  }

  // A pasted theme file replaces the theme being edited; it keeps this theme's id, and an uploaded picture is not in the file.
  function importTheme() {
    const dl = S.$('dialog.imp');
    let raw = null;
    try { raw = JSON.parse(dl.querySelector('textarea').value); } catch (_) { /* not JSON */ }
    const t = raw && typeof raw === 'object' && raw.seed ? S.TH.normalize({ ...raw, id: S.T.id, image: false }) : null;
    if (!t) { toast('That is not a theme file.'); return; }
    Object.assign(S.T, { seed: t.seed, manual: t.manual, style: t.style, fit: t.fit });
    S.image = null; S.palette = null;
    S.$('.dname').value = t.name;
    dl.close();
    apply();
    toast('Theme imported. Save it to keep it.');
  }

  // Cancel, the cross and Escape: with unsaved changes, the first press only warns.
  function leave() {
    if (!dirty() || S.leaving) { close(); return; }
    S.leaving = true;
    showState('Unsaved changes. Press again to discard them.');
    S.$$('.lnk[data-cancel]').forEach(b => { b.textContent = 'Discard changes'; });
    const mine = S;
    setTimeout(() => { if (S !== mine) return; S.leaving = false; S.$$('.lnk[data-cancel]').forEach(b => { b.textContent = 'Cancel'; }); showState(); }, 4000);
  }

  async function save() {
    const T = S.T;
    T.name = S.$('.dname').value.replace(/\s+/g, ' ').trim().slice(0, 40) || 'My theme';
    T.image = Boolean(S.image && T.manual.bgImg?.local);
    if (!T.image && T.manual.bgImg?.local) delete T.manual.bgImg;
    const clean = S.TH.normalize(T);
    if (!clean) { toast('Could not save this theme.'); return; }
    const btn = S.$('[data-save]'), mine = S;
    btn.disabled = true;
    try {
      await mine.opts.save(clean, clean.image ? mine.image : null);
    } catch (err) {
      if (S !== mine) return;
      btn.disabled = false;
      toast(err?.message === 'full' ? `You can keep up to ${mine.TH.MAX_THEMES} themes. Delete one first.` : 'Could not save this theme. Try again.');
      return;
    }
    if (S === mine) close(true);
  }

  function close(saved = false) {
    if (!S) return;
    const s = S;
    S = null;
    cancelAnimationFrame(s.raf);
    cancelAnimationFrame(s.placeRaf);
    s.picUrl('');
    cancelAnimationFrame(s.applyRaf);
    clearTimeout(s.zonesT);
    s.opts.root.querySelector('.exo')?.removeAttribute('data-editing');
    s.opts.root.removeEventListener('click', s.pick, true);
    s.opts.root.removeEventListener('mousemove', s.move);
    s.opts.host.removeEventListener('mouseleave', s.leave);
    removeEventListener('resize', s.resize);
    removeEventListener('keydown', s.key);
    layout(false, s);
    s.host.remove();
    s.opts.closed(saved);
  }

  // ─── Outlines, names and the one line, drawn each frame while open ───
  const visible = (r, sr) => r.width && r.bottom > sr.top && r.top < sr.bottom && r.right > sr.left && r.left < sr.right;
  function boxHtml(r, sr, cls = '') {
    const top = Math.max(r.top - 3, sr.top + 1), bottom = Math.min(r.bottom + 3, sr.bottom - 1);
    return `<div class="box ${cls}" style="left:${r.left - 3}px;top:${top}px;width:${r.width + 6}px;height:${Math.max(0, bottom - top)}px"></div>`;
  }
  const chipHtml = (r, sr, text, cls = '') => `<div class="chip ${cls}" style="left:${Math.max(r.left - 3, sr.left + 6)}px;top:${Math.max(r.top - 3, sr.top + 28)}px">${esc(text)}</div>`;
  function loop() {
    if (!S) return;
    draw();
    S.raf = requestAnimationFrame(loop);
  }
  function draw() {
    // Nothing to outline (the usual case while editing): no reading of the page's layout this frame.
    const outlined = S.showAll || S.hover?.fixed || (view() === 'parts' ? S.hotPart : null) || (S.hover?.g && S.hover.g !== S.sel) || (S.sel && view().startsWith('detail'));
    if (!outlined) {
      if (S.lastKey) { S.lastKey = ''; S.$('.marks').innerHTML = ''; S.$('.wire').innerHTML = ''; }
      return;
    }
    const sr = stageRect(), root = S.opts.root;
    let boxes = '', wire = '';
    if (S.showAll) for (const p of PARTS) {
      if (p.g === 'bg') continue;
      const el = root.querySelector(MAIN[p.g]);
      if (!el) continue;
      const r = el.getBoundingClientRect();
      if (!visible(r, sr)) continue;
      const at = p.g === 'banner' ? { left: r.left + r.width * .45, top: r.top + 70 } : r;
      boxes += boxHtml(r, sr, 'all') + chipHtml(at, sr, p.title, 'all');
    }
    const whole = { left: sr.left + 6, top: sr.top + 6, right: sr.right - 6, bottom: sr.bottom - 6, width: sr.width - 12, height: sr.height - 12 };
    const listHover = view() === 'parts' ? S.hotPart : null;
    if (!listHover && S.hover?.fixed && S.hover.el) {
      const r = S.hover.el.getBoundingClientRect();
      if (visible(r, sr)) boxes += boxHtml(r, sr, 'all') + chipHtml(r, sr, 'Fixed colour', 'all');
    }
    const hg = listHover || S.hover?.g;
    if (hg && hg !== S.sel) {
      const verb = listHover ? '' : ' · click to edit';
      if (hg === 'bg') boxes += boxHtml(whole, sr) + chipHtml({ left: sr.left + 6, top: sr.top + 40 }, sr, 'Background' + verb);
      else {
        const els = S.hover?.el && !listHover ? [S.hover.el] : [...root.querySelectorAll(OUTLINE[hg])].slice(0, 12);
        for (const el of els) { const r = el.getBoundingClientRect(); if (visible(r, sr)) boxes += boxHtml(r, sr); }
        const first = els.map(el => el.getBoundingClientRect()).find(r => visible(r, sr));
        if (first) boxes += chipHtml(first, sr, PART[hg].title + verb);
      }
    }
    if (S.sel && view().startsWith('detail')) {
      const head = S.$('[data-title]')?.getBoundingClientRect();
      let r = null;
      if (S.sel === 'bg') r = whole;
      else {
        const el = [S.selEl, root.querySelector(MAIN[S.sel]), ...root.querySelectorAll(OUTLINE[S.sel])].find(x => x && x.isConnected && visible(x.getBoundingClientRect(), sr));
        r = el?.getBoundingClientRect();
      }
      if (r) {
        boxes += boxHtml(r, sr);
        if (head && S.sel !== 'bg' && innerWidth > 900) {
          const sx = Math.min(r.right + 3, sr.right - 40), sy = Math.max(Math.min(r.top + Math.min(r.height / 2, 24), sr.bottom - 10), sr.top + 10);
          const ex = sr.right + 2, ey = head.top + head.height / 2, mx = sr.right - 22;
          const dy = ey - sy, sg = Math.sign(dy) || 1, kk = Math.min(10, Math.abs(dy) / 2);
          wire = `<circle cx="${sx}" cy="${sy}" r="3"/><path d="M${sx},${sy} H${mx - kk} Q${mx},${sy} ${mx},${sy + sg * kk} V${ey - sg * kk} Q${mx},${ey} ${mx + kk},${ey} H${ex}"/>`;
        }
      }
    }
    const key = boxes + wire;
    if (key === S.lastKey) return;
    S.lastKey = key;
    S.$('.marks').innerHTML = boxes;
    S.$('.wire').innerHTML = wire;
  }

  return { open, close: () => close(false) };
})();
