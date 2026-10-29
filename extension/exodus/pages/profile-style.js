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
.rtag{display:inline-flex;align-items:center;gap:6px;height:26px;padding:0 10px 0 8px;border-radius:4px;font:650 12.5px/1 var(--font);letter-spacing:0;color:var(--text);background:rgba(var(--glass),.78);box-shadow:inset 0 0 0 1px var(--rule-2);backdrop-filter:blur(6px);text-shadow:none;transition:background-color .15s,transform .2s var(--ease)}
.rtag:hover{transform:translateY(-1px);background:rgba(var(--glass),.92)}
.rtag svg{color:var(--c)}
.rtag svg,.rtag img,.rtag .mask{width:15px;height:15px;flex:none;object-fit:contain}
.rtag .mask{display:block;background:var(--c);-webkit-mask:var(--m) no-repeat center/contain;mask:var(--m) no-repeat center/contain}
[data-theme="white"] .rtag{background:#fff}
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
.avatar.sup{border:5px solid transparent;background-origin:padding-box,border-box;background-clip:padding-box,border-box;background-size:cover,cover;background-position:center,center}
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
/* Buttons beside the name: a frosted plate like the rank box, never see-through over the banner. They sit on the middle of the name's letters as drawn (pages/profile.js alignName, --name-mid). */
.name-row > .btn:not(.primary){background:rgba(var(--glass),.78);-webkit-backdrop-filter:blur(16px) saturate(1.2);backdrop-filter:blur(16px) saturate(1.2);box-shadow:inset 0 0 0 1px rgba(var(--ink),.12)}
.name-row > .btn:not(.primary):not(:disabled):hover{background:rgba(var(--glass),.92);box-shadow:inset 0 0 0 1px rgba(var(--ink),.2)}
.name-row > .btn,.name .prev-btn{position:relative;top:var(--name-mid,0px)}
.btn.mini{height:32px;padding:0 12px;gap:6px;font-size:13px}
.btn.mini .ico{width:15px;height:15px}
.rtags{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin:12px 0 2px}
.rtag{height:28px}
.rtag.ev{justify-content:center;width:34px;padding:0;color:var(--text-2)}
.rtag.ev img,.rtag.ev svg{width:20px;height:20px}
.rtag.sup{background:linear-gradient(110deg,rgba(244,114,182,.16) 35%,rgba(255,255,255,.2) 50%,rgba(244,114,182,.16) 65%) 0 0/260% 100%,rgba(var(--glass),.78);animation:supShine 5s ease-in-out infinite}
@keyframes supShine{0%,55%{background-position:100% 0,0 0}100%{background-position:-60% 0,0 0}}
.ranks-wrap{display:flex;flex-direction:column;align-items:stretch;gap:10px}
/* On wide screens the rank box is as tall as the avatar, so its top and bottom line up with the avatar's. */
@media (min-width:1001px){.ranks-wrap{align-self:stretch}.ranks-wrap > .ranks{flex:1}}
/* The game mode is a column at the left of the rank box, beside the numbers it switches; the mark slides
   to the chosen mode (pages/profile.js switchMode). */
.ranks{grid-template-columns:auto repeat(3,auto)}
.ranks > .ranks-modes{position:relative;display:flex;flex-direction:column;justify-content:center;align-self:stretch;padding:0 20px 0 18px;border-left:0;border-right:1px solid var(--line-2);text-align:left}
.ranks > .ranks-modes + div{border-left:0}
.ranks-modes button{height:26px;padding:0 0 0 12px;border:0;background:none;color:var(--muted);font:inherit;font-size:13px;font-weight:650;text-align:left;cursor:pointer;transition:color .2s}
.ranks-modes button:hover{color:var(--text-2)}
.ranks-modes button[aria-pressed="true"]{color:var(--text)}
.ranks-modes .mk{position:absolute;left:18px;top:calc(50% - 39px + 5px);width:2px;height:16px;border-radius:2px;background:var(--accent);transform:translateY(calc(var(--i) * 26px));pointer-events:none}
.ranks strong{font-variant-numeric:tabular-nums}
.ranks .rp strong{min-width:9ch}
/* A little smaller on wide screens, so a long line of facts under the name keeps Compare on it. */
@media (min-width:1001px){.ranks{padding:12px 4px}.ranks > div{padding:0 18px}.ranks strong{font-size:26px}.ranks .rp strong{min-width:8ch}.ranks > .ranks-modes{padding:0 16px 0 14px}.ranks-modes .mk{left:14px}}
/* Each number sits over a hidden copy of it in every mode (.rk-sz), so the box is as wide as the widest. */
.ranks > div:not(.ranks-modes){display:grid;align-content:center}
.ranks > div > strong{grid-row:2;grid-column:1}
.rk-sz{grid-row:2;grid-column:1;display:flex;flex-direction:column;height:0;overflow:hidden;visibility:hidden}
.ranks .rk-sz strong{margin-top:0}
/* The country rank opens that country's leaderboard. */
.rk-ct{position:relative}
.rk-ct > :not(.rk-go){position:relative;pointer-events:none}
.rk-go{position:absolute;inset:-10px 6px;border-radius:12px;transition:background-color .15s}
.rk-go:hover,.rk-go:focus-visible{background:rgba(var(--ink),.06)}
.rk-ct:hover .cap{color:var(--accent-2)}
/* "New" beside a section tab after an update (pages/profile-hero.js newTag). */
.tab-new{align-self:center;padding:0 6px;border-radius:5px;font-size:10.5px;font-weight:750;line-height:17px;letter-spacing:.04em;text-transform:uppercase;color:var(--accent-2);background:var(--accent-soft)}
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
@media (max-width:1000px){.hero-main{grid-template-columns:minmax(0,1fr)}.strip{grid-template-columns:repeat(3,minmax(0,1fr))}}
@media (max-width:640px){.strip{grid-template-columns:repeat(2,minmax(0,1fr))}.ranks > .ranks-modes{padding:0 12px 0 0}.ranks-modes .mk{left:0}}
@media (max-width:760px){.ranks{grid-template-columns:auto repeat(3,minmax(0,1fr))}.ranks strong{justify-content:flex-start;align-items:flex-start}.ranks .rp strong{min-width:0}}
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
/* Near this rank: players below (amber), this player (text), players above (accent), as in Compare. One bar
   style and one motion (the bar grows) everywhere in it; nothing in it is clickable. */
.exo{--nb:var(--p2-text);--na:var(--accent)}
#near[hidden]{display:none}
#near:has(> .near-only){margin-top:40px;padding-top:20px}
/* Online history offered where This device leaves a place empty (profile.js onlineOffer). */
.online-offer{display:flex;flex-direction:column;align-items:center;gap:14px;margin-top:6px}
.online-offer > span{max-width:540px;text-wrap:balance;font-size:13.5px;line-height:1.5;color:var(--muted)}
.online-offer .btn{flex:none;color:var(--text);height:36px;padding:0 16px;font-size:13.5px;background:var(--panel-2);box-shadow:inset 0 0 0 1px var(--line-2)}
.online-offer .btn:hover{background:var(--panel-3)}
.online-offer .btn .ico{width:16px;height:16px}
.near-off{padding:28px 16px;text-align:center}
.near-off > b{display:block;color:var(--text);font-size:15px;font-weight:650}
#near:has(> .near-off){margin-top:40px}
.near-only{display:flex;align-items:center;gap:6px;margin:0;font-size:13.5px;color:var(--text-2)}
.near-only b{color:var(--text);font-weight:650}
.near-i{display:inline-flex;color:var(--muted);cursor:help}.near-i svg{width:15px;height:15px}
#near > .panel{margin-top:12px}
.near-stats,.ns,.nt,.nx{padding:18px 20px}
.nt-key{display:flex;flex-wrap:wrap;gap:12px;font-size:12.5px;color:var(--text-2)}
.nt-key span::before{content:"";display:inline-block;width:9px;height:9px;margin-right:6px;border-radius:3px;background:var(--c)}
.nt-key .b{--c:var(--nb)}.nt-key .y{--c:var(--text)}.nt-key .a{--c:var(--na)}
/* The same shapes as on the stat lines: ▲ above, ● this player, ▼ below. */
.nt-key .a::before{border-radius:0;clip-path:polygon(50% 0,100% 100%,0 100%)}.nt-key .b::before{border-radius:0;clip-path:polygon(0 0,100% 0,50% 100%)}.nt-key .y::before{border-radius:50%}
.nt-key .kind::before{width:4px;height:12px;border-radius:0;vertical-align:-1px}
/* The stats in a grid of cells with lines between them, so each one reads on its own. */
.nm-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr))}
.nm{padding:18px 22px;border-top:1px solid var(--line);border-left:1px solid var(--line)}
.nm:nth-child(3n+1){border-left:0;padding-left:0}
.nm:nth-child(3n){padding-right:0}
.nm:nth-child(-n+3){border-top:0;padding-top:4px}
.nm header{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:8px}
.nm header > span:first-child{font-size:13.5px;font-weight:650}
/* The verdict as a chip like the others, its colour in the bar: green or red, the above or below group's colour
   when closer to one of them, the player's own colour (the ● on the line) when the player is the most or least of
   the three on a stat where neither is better, and the quiet text colour when in between. */
.nm .dpill{gap:7px;height:24px;padding:0 9px;border-radius:4px;font-weight:600;color:var(--text);background:rgba(var(--glass),.55);box-shadow:inset 0 0 0 1px var(--rule-2)}
.nm .dpill{padding-left:0;overflow:hidden}
.nm .dpill::before{content:"";flex:none;align-self:stretch;width:6px;background:var(--c)}
.nm .dpill.up{--c:var(--good)}.nm .dpill.down{--c:var(--bad)}.nm .dpill.near-a{--c:var(--na)}.nm .dpill.near-b{--c:var(--nb)}
.nm .dpill.edge{--c:var(--text)}.nm .dpill.flat{--c:var(--muted);color:var(--text-2)}
.nm-main{display:flex;justify-content:space-between;align-items:flex-end;gap:10px;margin-bottom:10px}
.nm-main > b{font-size:24px;font-weight:750;line-height:1.1}
.nm-others{display:flex;flex-direction:column;align-items:flex-end;gap:2px;font-size:12px;color:var(--muted);white-space:nowrap}
.nm-others b{margin-left:6px;font-size:13px;font-weight:650}
.nm-others .a b{color:var(--na)}.nm-others .b b{color:var(--nb)}
/* One line from the lowest value to the highest; the groups sit over and under it, this player on it. */
.nm-axis{position:relative;height:30px}
.nm-axis::before{content:"";position:absolute;left:0;right:0;top:50%;height:2px;margin-top:-1px;border-radius:2px;background:var(--panel-3)}
.nm-m{position:absolute;top:50%;width:12px;height:10px;margin-left:-6px;transition:left .5s var(--ease)}
.nm-m.a{margin-top:-13px;background:var(--na);clip-path:polygon(50% 0,100% 100%,0 100%)}
.nm-m.b{margin-top:3px;background:var(--nb);clip-path:polygon(0 0,100% 0,50% 100%)}
.nm-m.y{width:14px;height:14px;margin:-7px 0 0 -7px;border-radius:50%;background:var(--text);box-shadow:0 0 0 3px var(--panel)}
.nm-bar,.nl-bar,.nx-bar{display:block;height:6px;border-radius:999px;background:var(--panel-3);overflow:hidden}
.nm-bar i,.nl-bar i,.nx-bar i{display:block;height:100%;border-radius:inherit;transform-origin:left;animation:bar .7s var(--ease) both}
.nx-bar i{background:var(--text-2)}
.ns-bar{height:12px;margin:2px 0 14px}
.ns-bar i.below{background:var(--nb)}.ns-bar i.at{background:var(--panel-3)}.ns-bar i.above{background:var(--na)}
.ns-sets{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}
.ns-sets > div{display:flex;flex-direction:column;gap:2px}
.ns-sets b{font-size:22px;font-weight:750;line-height:1.2}
.ns-sets b small{font-size:13px;font-weight:500;color:var(--muted)}
.ns-sets .below b{color:var(--nb)}.ns-sets .above b{color:var(--na)}
.ns-sets span{font-size:13px;color:var(--text-2)}
.nt .ps-who.below{color:var(--nb)}.nt .ps-who.above{color:var(--na)}
.nx-pair{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:12px}
.nx-pair > .panel{margin-top:0!important}
.nx-row{display:grid;grid-template-columns:minmax(0,1fr) 130px;align-items:center;gap:16px;padding:10px 0;border-top:1px solid var(--line)}
.nx .panel-head + .nx-row{border-top:0}
.nx-t{min-width:0}.nx-t b,.nx-t small{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.nx-t b{font-size:14px;font-weight:650}.nx-t small{font-size:12px;color:var(--muted)}
.nx-n{display:flex;flex-direction:column;gap:4px;font-size:12px;color:var(--muted)}
.nx-n b{color:var(--text)}
/* Near this rank on each top play: the nearby value under this play's, and one bar for the place */
.nd{display:block;margin-top:2px;font-size:11.5px;font-weight:500;color:var(--muted)}
.nl{display:flex;flex-direction:column;gap:5px;min-width:0;cursor:help}
.nl-bar i{background:var(--accent)}
.nl-cap{font-size:12px;color:var(--muted)}.nl-cap b{color:var(--text);font-weight:700}
.nl.none{cursor:default}
.list-panel.near .cols,.list-panel.near .row{grid-template-columns:36px 64px minmax(0,1fr) 44px 92px 64px 64px 88px 150px 40px}
.tile-near{margin-top:14px;padding-top:12px;border-top:1px solid var(--line)}
@media (max-width:1000px){.nm-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.nm,.nm:nth-child(n){border-top:1px solid var(--line);border-left:1px solid var(--line);padding:18px 22px}.nm:nth-child(2n+1){border-left:0;padding-left:0}.nm:nth-child(2n){padding-right:0}.nm:nth-child(-n+2){border-top:0;padding-top:4px}.list-panel.near .cols,.list-panel.near .row{grid-template-columns:32px 56px minmax(0,1fr) 40px 96px 72px 96px 36px}.list-panel.near .row .nl{grid-column:3/-1}}
@media (max-width:640px){.nm-grid,.ns-sets{grid-template-columns:1fr}.nm:nth-child(n){border-left:0;padding:16px 0;border-top:1px solid var(--line)}.nm:first-child{border-top:0;padding-top:4px}.nx-pair,.nx-row{grid-template-columns:1fr}}
@media (prefers-reduced-motion:reduce){.nm-bar i,.nl-bar i,.nx-bar i{animation:none}}
/* The More menu beside Compare and the Report dialog */
.btn.mini.sq{width:32px;padding:0;justify-content:center}
dialog.cmp.rp-dlg{width:min(460px,calc(100vw - 32px))}
.rp-body{display:flex;flex-direction:column;gap:16px}
.rp-body p{margin:0;line-height:1.6;color:var(--text-2)}
.rp-body fieldset{display:flex;flex-direction:column;gap:2px;margin:0;padding:0;border:0}
.rp-body legend{margin-bottom:6px;font-size:13px;font-weight:650}
.rp-opt{display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:9px;cursor:pointer}
.rp-opt:hover{background:var(--panel-2)}
.rp-opt input{accent-color:var(--accent);margin:0}
.rp-note{display:flex;flex-direction:column;gap:6px;font-size:13px;font-weight:650}
.rp-note textarea{resize:vertical;min-height:72px;padding:10px 12px;border:0;border-radius:10px;font:inherit;font-weight:400;color:var(--text);background:var(--field);box-shadow:inset 0 0 0 1px var(--line-2)}
.rp-note textarea:focus{outline:2px solid var(--accent);outline-offset:0}
.rp-acts{display:flex;justify-content:flex-end;gap:8px}
/* Maps, Skins and Inventory (pages/profile-tabs.js); the map tiles and skin cards are the Maps and Skins pages' own */
#ptab{margin-top:48px}
#ptab h2 .cap{font-size:15px;font-weight:500;margin-left:4px}
#ptab .tabs.seg .cap{font-size:12px;margin-left:2px}
#ptab .pager{margin-top:20px}
.pt-empty{padding:72px 16px}
.pt-emptyact{margin-top:16px}
.iv-grid{display:grid;grid-template-columns:minmax(0,1.5fr) minmax(300px,1fr);gap:20px;align-items:start}
.iv-list{display:grid;grid-template-columns:repeat(auto-fill,minmax(128px,1fr));gap:10px;padding:16px}
.iv-item{display:flex;flex-direction:column;min-width:0;padding:0;border:0;border-radius:12px;overflow:hidden;text-align:left;background:var(--panel-2);box-shadow:inset 0 0 0 1px var(--line);transition:box-shadow .15s}
.iv-item.wide{grid-column:span 2}
.iv-item:hover{box-shadow:inset 0 0 0 1px var(--line-2)}
.iv-item[aria-pressed="true"]{box-shadow:inset 0 0 0 2px var(--accent)}
.iv-art{position:relative;display:grid;place-items:center;height:96px;overflow:hidden;background:var(--field)}
.iv-name{padding:8px 10px 10px;font-size:12.5px;font-weight:600;line-height:1.3;color:var(--text-2)}
.iv-on{position:absolute;right:6px;bottom:6px;display:grid;place-items:center;width:20px;height:20px;border-radius:50%;font-size:11px;font-weight:800;color:#052e16;background:var(--good)}
.iv-qty{position:absolute;left:6px;top:6px;padding:0 6px;border-radius:5px;font-size:11.5px;font-weight:700;color:#fff;background:rgba(0,0,0,.6)}
.iv-banner{position:absolute;inset:0;background:var(--panel-3) center/cover no-repeat}
.iv-banner.sup{display:grid;place-items:center;background:linear-gradient(120deg,#5b2a6e,#8a3a74 55%,#3b2a6e)}
.iv-banner.sup img{height:44%;width:auto}
.iv-aa{font-size:34px;font-weight:850;letter-spacing:-.02em;color:var(--accent-2)}
.iv-aa.name{color:var(--accent-2)}
.iv-detail{display:flex;flex-direction:column;gap:0;padding:0;overflow:hidden}
.iv-prev{position:relative;display:grid;place-items:center;height:200px;overflow:hidden;background:var(--field);border-bottom:1px solid var(--line)}
.iv-prev.solo .iv-aa{max-width:90%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:30px}
.iv-plate{position:absolute;left:16px;bottom:16px;display:flex;align-items:center;gap:10px;max-width:calc(100% - 32px);padding:8px 14px 8px 8px;border-radius:12px;background:rgba(10,12,16,.58);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);box-shadow:inset 0 0 0 1px rgba(255,255,255,.08)}
.iv-plate .v-av{width:36px;height:36px}
.iv-plate span{display:flex;flex-direction:column;min-width:0}
.iv-plate b{font-size:15px;font-weight:750;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.iv-plate small{font-size:12px;color:rgba(255,255,255,.75)}
.iv-info{display:flex;flex-direction:column;gap:10px;padding:20px 22px 22px}
.iv-title{display:flex;align-items:baseline;justify-content:space-between;gap:12px}
.iv-title h3{margin:0;font-size:18px;font-weight:750}
.iv-worn{flex:none;font-size:12.5px;font-weight:700;color:var(--good)}
.iv-info .cap{margin:0}
.iv-info .cap a{color:var(--accent-2)}
.iv-desc{margin:0;font-size:14px;line-height:1.55;color:var(--text-2);white-space:pre-wrap;overflow-wrap:anywhere}
.iv-tint{display:flex;flex-direction:column;gap:8px;font-size:13px;font-weight:650}
.iv-tint input{-webkit-appearance:none;appearance:none;width:100%;height:12px;border-radius:999px;background:var(--track);cursor:pointer}
.iv-tint input::-webkit-slider-thumb{-webkit-appearance:none;width:20px;height:20px;border-radius:50%;background:var(--thumb);border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,.4)}
.iv-tint input::-moz-range-thumb{width:16px;height:16px;border-radius:50%;background:var(--thumb);border:2px solid #fff}
.iv-acts{display:flex;gap:8px;padding-top:12px;border-top:1px solid var(--line)}
.iv-acts .btn{flex:1}
.iv-note{font-size:12.5px}
[data-theme="white"] .iv-qty{background:rgba(15,23,42,.7)}
@media (max-width:900px){.iv-grid{grid-template-columns:1fr}}
@media (max-width:560px){.iv-list{grid-template-columns:repeat(2,minmax(0,1fr))}.iv-item.wide{grid-column:span 2}}
`;
