// =============================================
// Reimagined for Rhythia — Exodus profile styles
// =============================================
// The profile view's CSS, kept apart from its logic in pages/profile.js. It loads right after that file and
// hangs on its mount function as RhythiaX.ExodusApp.css, where core/shell.js reads it into the shadow root.
// The Compare window's rules are in pages/compare.js, the rules every dialog shares in core/kit.js.

var RhythiaX = RhythiaX || {};

// The profile's own styles (the base comes from core/assets.js, the approved mockup).
RhythiaX.ExodusApp.css = `
.loading .hero-main{min-height:150px}
@keyframes exoEnter{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
@keyframes exoFade{from{opacity:0}to{opacity:1}}
.hero.enter .banner{animation:exoFade .7s ease both}
.hero.enter .hero-main{animation:exoEnter .55s var(--ease) both}
.hero.enter .strip{animation:exoEnter .55s var(--ease) .07s both}
.hero.enter .hero-bar{animation:exoEnter .55s var(--ease) .14s both}
.loading .skeleton{animation-duration:1.4s}
@media (min-width:1001px){.intro{grid-template-columns:minmax(0,1fr) minmax(0,1fr)}}
.intro.solo{grid-template-columns:minmax(0,1fr)}
.bio{font-size:16px;line-height:1.7;max-width:68ch}
.rtags{display:flex;flex-wrap:wrap;gap:6px;margin:12px 0 2px}
.rtag{display:inline-flex;align-items:center;gap:6px;height:26px;padding:0 10px 0 8px;border-radius:8px;font:650 12.5px/1 var(--font);letter-spacing:0;color:var(--c);background:rgba(var(--glass),.78);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--c) 40%,transparent);backdrop-filter:blur(6px);text-shadow:none;transition:background-color .15s,transform .2s var(--ease)}
.rtag:hover{transform:translateY(-1px);background:color-mix(in srgb,var(--c) 16%,rgba(var(--glass),.9))}
.rtag svg,.rtag img,.rtag .mask{width:15px;height:15px;flex:none;object-fit:contain}
.rtag .mask{display:block;background:currentColor;-webkit-mask:var(--m) no-repeat center/contain;mask:var(--m) no-repeat center/contain}
.rtag.sup{color:#f9a8d4}
[data-theme="white"] .rtag{background:#fff;color:color-mix(in srgb,var(--c) 78%,#0f172a)}
[data-theme="white"] .rtag.sup{color:#db2777}
.items{margin:0 0 22px}
.items-head{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:10px;font-size:13px;font-weight:600;color:var(--muted)}
.items-row{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px}
.item{position:relative;display:flex;flex-direction:column;gap:2px;min-width:0;padding:0;border:0;background:none;text-align:left;color:inherit;font:inherit;cursor:pointer}
.item > a{display:flex;flex-direction:column;gap:2px;min-width:0}
.item .pv{display:grid;place-items:center;aspect-ratio:1;border-radius:10px;background:var(--panel-3) center/cover;box-shadow:inset 0 0 0 1px var(--line);transition:transform .2s var(--ease)}
.item:hover .pv{transform:translateY(-2px)}
.item .pv.none{color:var(--muted);font-size:26px}
.item .pv.none .ico{width:26px;height:26px}
.item .pv.cs{background:#08090b;padding:16%}
.item .pv.cs > span{display:grid;width:100%;gap:1px}
.item .it{margin-top:5px;font-size:12.5px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.item small{font-size:11.5px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.item.add .pv{background:none;box-shadow:none;outline:1.5px dashed var(--line-2);outline-offset:-1.5px}
.item.add:hover .pv{outline-color:var(--accent);color:var(--accent)}
.item-x{position:absolute;top:6px;right:6px;width:26px;height:26px;opacity:0;background:rgba(var(--glass),.88);transition:opacity .15s}
.item:hover .item-x,.item-x:focus-visible{opacity:1}
@media (hover:none){.item-x{opacity:1}}
.pick-body{display:flex;flex-direction:column;gap:12px}
.pick-bar{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.pick-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(128px,1fr));gap:14px;max-height:52vh;overflow:auto;padding:2px}
.pick-grid .item[disabled]{opacity:.4;cursor:default}
@media (max-width:640px){.items-row{grid-template-columns:repeat(3,minmax(0,1fr))}}
.avatar.sup{border:3px solid transparent;background-origin:padding-box,border-box;background-clip:padding-box,border-box;background-size:cover,cover;background-position:center,center}
.sup-heart{position:absolute;left:-8px;bottom:-8px;display:grid;place-items:center;width:30px;height:30px;border-radius:50%;background:#2a0f22;box-shadow:0 0 0 3px var(--page),inset 0 0 0 1.5px #f472b6;transition:transform .2s var(--ease)}
.sup-heart:hover{transform:scale(1.08)}
.sup-heart img{width:17px;height:auto}
[data-theme="white"] .sup-heart{background:#fff}
.item.locked .pv img{width:28px;opacity:.85}
.item.locked .pv{outline-color:color-mix(in srgb,#f472b6 45%,transparent)}
@media (prefers-reduced-motion:reduce){.hero.enter .banner,.hero.enter .hero-main,.hero.enter .strip,.hero.enter .hero-bar{animation:none}}
.bio.md{white-space:normal}
.lede-link{color:var(--accent-2);font-weight:600;margin-left:4px;white-space:nowrap}
.lede-link:hover{text-decoration:underline;text-underline-offset:2px}
.rp-kpis{margin-bottom:12px}
#rp.section{margin-top:40px;padding-top:0;border-top:0}
#rp.section::before{display:none}
.rp-kpis .kpi > span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rpc .ln.w{stroke:var(--text-2);stroke-width:1.8;stroke-dasharray:5 4}
.rpc .hit{fill:transparent}
.rpc .hit:hover{fill:color-mix(in srgb,var(--accent) 12%,transparent)}
.rp-key{display:flex;gap:16px;font-size:13px;font-weight:600;color:var(--text-2)}
.rp-key span::before{content:"";display:inline-block;width:14px;height:0;margin-right:7px;vertical-align:middle;border-top:2.4px solid var(--accent)}
.rp-key .w::before{border-top:1.8px dashed var(--text-2)}
/* The bio is drawn by core/markdown.js; these keep it as compact as a profile's About needs. */
.bio.md p,.bio.md ul,.bio.md ol,.bio.md blockquote,.bio.md pre{margin:0 0 .75em}
.bio.md > :last-child{margin-bottom:0}
.bio.md ul,.bio.md ol{padding-left:22px}
.bio.md li{margin:2px 0}
.bio.md blockquote{padding:0 0 0 12px;border-left:0;box-shadow:inset 2px 0 0 var(--line-2);color:var(--text-2)}
.bio.md blockquote p{margin:0}
.bio.md h1,.bio.md h2,.bio.md h3,.bio.md h4{margin:.15em 0 .3em;scroll-margin-top:0}
.bio.md h1{font-size:1.35em;font-weight:750;line-height:1.3}
.bio.md h2{font-size:1.18em;font-weight:700}
.bio.md h3,.bio.md h4{font-size:1em;font-weight:700}
.bio code{font:500 .88em ui-monospace,Consolas,monospace;padding:1px 5px;border-radius:5px;background:var(--panel-3)}
.bio.md img{display:block;max-width:100%;max-height:260px;margin:10px 0;border-radius:12px}
.bio a{color:var(--accent-2);text-decoration:underline;text-underline-offset:2px}
.hero-main{grid-template-columns:120px minmax(0,1fr) auto}
.name-row{display:flex;align-items:center;gap:12px 16px;flex-wrap:wrap}
.name-row>.btn{position:relative;top:5px}
@media (max-width:760px){.name-row>.btn{top:3px}}
.btn.mini{height:32px;padding:0 12px;gap:6px;font-size:13px}
.btn.mini .ico{width:15px;height:15px}
.rtags{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin:12px 0 2px}
.rtag{height:28px}
.rtag.ev{justify-content:center;width:34px;padding:0;color:var(--text-2)}
.rtag.ev img,.rtag.ev svg{width:20px;height:20px}
.rtag.sup{background:linear-gradient(110deg,rgba(244,114,182,.16) 35%,rgba(255,255,255,.2) 50%,rgba(244,114,182,.16) 65%) 0 0/260% 100%,rgba(var(--glass),.78);animation:supShine 5s ease-in-out infinite}
@keyframes supShine{0%,55%{background-position:100% 0,0 0}100%{background-position:-60% 0,0 0}}
.ranks-wrap{display:flex;flex-direction:column;align-items:stretch;gap:10px}
.ranks-head{display:flex;align-items:center;justify-content:flex-end;gap:8px}
.pills.mini{height:32px;padding:2px;align-items:stretch}
.pills.mini button{height:auto;padding:0 10px;font-size:13px}
.pills.mini img{height:14px}
.hero .ranks-head .pills,.hero .ranks-head .btn:not(.primary){background:rgba(var(--glass),.82);box-shadow:inset 0 0 0 1px var(--line-2),0 6px 20px rgba(0,0,0,calc(.28 * var(--sh)));-webkit-backdrop-filter:blur(14px) saturate(1.4);backdrop-filter:blur(14px) saturate(1.4)}
.hero .ranks-head .btn:not(.primary):hover{background:rgba(var(--glass),.95)}
.hero .ranks-head .pills button{color:var(--text-2)}
.hero .ranks-head .pills button:hover,.hero .ranks-head .pills button[aria-pressed="true"]{color:var(--text)}
.hero .ranks-head .pills button[aria-pressed="true"]{background:var(--panel-3)}
.hero .ranks-head .pills img{opacity:.9}
.friends-btn{display:inline-flex;align-items:center;gap:7px;padding:0;border:0;background:none;color:inherit;font:inherit;text-shadow:inherit;cursor:pointer;border-radius:6px}
.friends-btn:hover{color:var(--text);text-decoration:underline;text-underline-offset:3px}
.friends-btn:focus-visible{outline:2px solid var(--accent);outline-offset:3px}
#pick.fr-dlg{width:min(520px,calc(100vw - 32px))}
.fr-list{display:flex;flex-direction:column;gap:2px}
.fr-sum{display:flex;align-items:center;gap:8px;margin:0 0 10px;font-size:14px;color:var(--text-2)}
.fr-row{display:flex;align-items:center;gap:12px;padding:8px 10px;border-radius:12px;color:var(--text);transition:background-color .15s}
a.fr-row:hover{background:var(--panel-2)}
.fr-row .av{position:relative;flex:none;width:36px;height:36px;border-radius:50%;background:var(--panel-3) center/cover}
.fr-row .av .fr-dot{position:absolute;right:-1px;bottom:-1px;box-shadow:0 0 0 2.5px var(--dialog)}
.fr-name{flex:1;min-width:0;display:flex;align-items:center;gap:6px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.fr-name .flg{width:16px;border-radius:2px}
.fr-row.on .cap{color:var(--good)}
.fr-dot{display:inline-block;width:9px;height:9px;border-radius:50%;background:var(--good)}
.strip{grid-template-columns:repeat(6,minmax(0,1fr))}
.strip > div{padding:0 20px}
.hero-bar{min-height:49px}
.avatar.sup{background-size:cover,220% 220%;animation:supRing 5s ease-in-out infinite alternate}
/* A settled hero stops its entrance animations, but a supporter's ring and floating hearts keep going. */
.hero.settled .avatar.sup{animation:supRing 5s ease-in-out infinite alternate!important}
.hero.settled .pf{animation:pfUp var(--d) linear var(--w) infinite!important}
@keyframes supRing{from{background-position:center,0% 0%}to{background-position:center,100% 100%}}
.pfs{position:absolute;left:0;right:0;top:0;height:300px;overflow:hidden;pointer-events:none;-webkit-mask:linear-gradient(transparent,#000 30%,#000 70%,transparent);mask:linear-gradient(transparent,#000 30%,#000 70%,transparent)}
.pf{position:absolute;bottom:-20px;left:var(--x);width:13px;height:13px;opacity:0;scale:var(--s);animation:pfUp var(--d) linear var(--w) infinite}
.pf.q{border:2px solid rgba(240,190,255,.45);border-radius:4px}
.pf.h{background:rgba(240,190,255,.45);-webkit-mask:var(--heart) center/contain no-repeat;mask:var(--heart) center/contain no-repeat}
.pfs{--heart:url('data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="3"%3E%3Cpath d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/%3E%3C/svg%3E')}
@keyframes pfUp{0%{opacity:0;transform:translateY(0) rotate(0)}15%{opacity:.7}75%{opacity:.4}100%{opacity:0;transform:translateY(-320px) rotate(40deg)}}
.intro{align-items:start}
.spill .sp-main{display:flex;flex-direction:column;gap:1px;line-height:1.2}
.spill .sp-main b small{font-size:11.5px;font-weight:650;color:inherit;opacity:.7}
.intro.has-more .bio-wrap{margin-bottom:0}
.intro-more{grid-column:1/-1;display:grid!important;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:0 36px;align-items:end}
.intro-more > :only-child{grid-column:1/-1}
.intro-more .items{margin:0}
.intro-more .showcase{margin-top:0}
[data-variant="lines"] .intro.has-more{align-items:stretch}
[data-variant="lines"] .intro.has-more > .panel:nth-child(2){padding-right:0;border-left:1px solid var(--rule)}
[data-variant="lines"] .intro.has-more > .intro-more{padding:24px 0 30px;border-left:0;border-top:1px solid var(--rule)}
@media (max-width:1000px){.intro-more{grid-template-columns:minmax(0,1fr);gap:20px}
  [data-variant="lines"] .intro.has-more > .panel:nth-child(2){padding:24px 0;border-left:0;border-top:1px solid var(--rule)}}
.bio-wrap{position:relative;margin-bottom:24px}
.bio-wrap .bio{margin-bottom:0}
.bio-wrap:not(.open) .bio{max-height:320px;overflow:hidden}
.bio-wrap.long:not(.open) .bio{-webkit-mask:linear-gradient(#000 72%,transparent);mask:linear-gradient(#000 72%,transparent)}
.bio-more{margin-top:8px;font-size:13.5px;font-weight:650}
.section{margin-top:56px;padding-top:32px;border-top:1px solid var(--line-2)}
.sec-head h2{font-size:24px}
.sec-head{margin-bottom:18px}
.kpis{gap:10px}
.kpi{padding:12px 16px 14px;border-radius:14px}
.kpi small{font-size:12.5px}
.kpi strong{font-size:22px;margin-top:4px}
.kpi > span{font-size:12.5px}
.chart{height:170px}
.chart-panel{padding:18px 20px}
.mods{height:30px}
.mc img{width:22px;height:22px}
.spdc{font-size:12px}
@media (max-width:1000px){.hero-main{grid-template-columns:minmax(0,1fr)}.ranks-head{justify-content:flex-start}.strip{grid-template-columns:repeat(3,minmax(0,1fr))}}
@media (max-width:640px){.strip{grid-template-columns:repeat(2,minmax(0,1fr))}.ranks-head{flex-wrap:wrap}.ranks-head .pills{flex:1}.ranks-head .pills button{flex:1;justify-content:center}}
@media (prefers-reduced-motion:reduce){.avatar.sup,.rtag.sup,.hero.settled .avatar.sup,.hero.settled .pf{animation:none!important}}
/* Playstyle: bars draw left to right as one piece; Month in review */
.exo{--k-stream:#38bdf8;--k-jump:#f59e0b;--k-tech:#f472b6;--k-varied:#a78bfa;--k-quantum:#34d399}
.exo[data-theme="white"]{--k-stream:#0284c7;--k-jump:#d97706;--k-tech:#db2777;--k-varied:#7c3aed;--k-quantum:#059669}
.reveal.in .stack i{animation:none}
.reveal.in .stack,.reveal.in .mcols{animation:sweep .9s var(--ease) both}
@keyframes sweep{from{clip-path:inset(0 100% 0 0)}to{clip-path:inset(0 0 0 0)}}
.ps .wide{grid-column:1/-1}
.mfig{display:flex;flex-wrap:wrap;gap:10px 36px;margin:0 0 22px}
.mfig small{display:block;font-size:12.5px;color:var(--muted);font-weight:550}
.mfig b{display:block;font-size:20px;font-weight:750;letter-spacing:-.01em}
.mbody{display:grid;grid-template-columns:minmax(0,1.25fr) minmax(0,1fr);gap:0 36px;animation:fade .25s ease both}
.mbody > div + div{border-left:1px solid var(--line);padding-left:36px}
.mbody .notes{margin-top:18px}
.mbody .cap{margin:14px 0 0}
.mcols,.mlab,.mbrks{display:grid;grid-template-columns:repeat(var(--n),minmax(0,1fr));column-gap:3px}
.mcols{height:96px;align-items:end}
.mcol{height:100%;display:flex;align-items:flex-end}
.mcol i{display:block;width:100%;height:max(3px,calc(var(--h) * 1%));border-radius:3px 3px 2px 2px;background:var(--accent);transition:filter .15s}
.mcol.zero i{height:3px;background:rgba(var(--ink),.18)}
.mcol.off i{height:3px;background:repeating-linear-gradient(90deg,rgba(var(--ink),.18) 0 2px,transparent 2px 4px)}
.mcol:hover i{filter:brightness(1.25)}
.mlab{margin-top:6px;font-size:11.5px;color:var(--muted)}
.mday{grid-row:1;white-space:nowrap}
.mbrks{margin-top:4px}
.mbrk{grid-row:1;border-top:2px dashed rgba(var(--ink),.32);padding-top:3px;text-align:center;font-size:12px;color:var(--text-2);white-space:nowrap}
.mbrk b{font-weight:650}
#mtypes h4{margin:0 0 12px;font-size:15px;font-weight:650}
#mtypes h4 .cap{font-weight:500}
#mtypes .stack{margin:4px 0 16px}
.mt-rows{display:grid;grid-template-columns:minmax(0,1fr) auto auto auto;gap:9px 22px;align-items:baseline;font-size:14px}
.mt-rows .h{font-size:12px;color:var(--muted);font-weight:550}
.mt-rows .h:not(:first-child),.mt-rows em{text-align:right}
.mt-rows .k{display:inline-flex;align-items:center;gap:8px;font-weight:650;justify-self:start}
.mt-rows .k::before{content:"";width:10px;height:10px;border-radius:3px;background:var(--c)}
.mt-rows em{font-style:normal;color:var(--text-2)}
#mtypes .notes{margin-top:16px}
.mt-load{display:flex;flex-direction:column;gap:9px;font-size:14px;color:var(--text-2);margin-top:4px}
.mt-load i{display:block;height:6px;border-radius:999px;background:rgba(var(--ink),.08);position:relative;overflow:hidden}
.mt-load i::after{content:"";position:absolute;inset:0 auto 0 0;width:var(--p);background:var(--accent);border-radius:inherit;transition:width .3s var(--ease)}
@media (max-width:1000px){
  .mbody{grid-template-columns:1fr;gap:22px}
  .mbody > div + div{border-left:0;padding-left:0;border-top:1px solid var(--line);padding-top:20px}
  .mfig{gap:10px 24px}
  .mfig b{font-size:17px}
}
/* Lines tells left and right panels apart by position; Month in review spans both, so the two after it swap back. */
@media (min-width:1001px){
  [data-variant="lines"] .ps > .wide{padding:26px 0 28px;border-left:0}
  [data-variant="lines"] .ps > .wide + .panel{padding:26px 32px 28px 0;border-left:0}
  [data-variant="lines"] .ps > .wide + .panel + .panel{padding:26px 0 28px 32px;border-left:1px solid var(--rule)}
}
@media (prefers-reduced-motion:reduce){.reveal.in .stack,.reveal.in .mcols,.mbody{animation:none}}
`;
