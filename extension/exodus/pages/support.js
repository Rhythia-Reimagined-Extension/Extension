// =============================================
// Reimagined for Rhythia — Exodus support page
// =============================================
// /support: Rhythia Supporter. Paying stays in Rhythia's own dialog (Paynet).

var RhythiaX = RhythiaX || {};

(function () {
'use strict';
const K = () => RhythiaX.ExodusKit;
const {SITE, Data, esc, fmt, REDUCED} = RhythiaX.ExodusKit;

/* ════════════════════ Support ════════════════════ */
// Rhythia's texts and pictures. Paying stays in Rhythia's own dialog (Paynet), and the page Paynet
// returns to (?paynet=…) is left to Rhythia, which checks the payment.
const PERKS = [
  ['Profile Badge', 'discord.png', '#bd6568', '#a93439', 'Get an exclusive profile badge, special player cards on leaderboards and in the player list, and a supporter icon in the in-game chat.'],
  ['One Free Username Change', 'user.png', '#bc7652', '#b59c59', 'Your first paid Supporter membership includes one Name Change item. It stays available until you use it, even after Supporter expires. For gifts, this bonus goes to the recipient.'],
  ['Profile Showcase', 'select.png', '#4e9560', '#306b42', 'Pin your favorite maps, collections, and skins to your profile to share them with other players.'],
];
const QUOTE_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 11h-4a1 1 0 0 1 -1 -1v-3a1 1 0 0 1 1 -1h3a1 1 0 0 1 1 1v6c0 2.667 -1.333 4.333 -4 5"/><path d="M19 11h-4a1 1 0 0 1 -1 -1v-3a1 1 0 0 1 1 -1h3a1 1 0 0 1 1 1v6c0 2.667 -1.333 4.333 -4 5"/></svg>';
const HEART_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>';
const GIFT_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13"/><path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/><path d="M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5"/></svg>';
// The same rounding as Rhythia's own "… left".
const timeLeft = d => { const t = Math.ceil((new Date(d) - Date.now()) / 864e5); if (t <= 0) return 'expired'; const [n, u] = t >= 365 ? [Math.max(1, Math.round(t / 365)), 'year'] : t >= 30 ? [Math.max(1, Math.round(t / 30)), 'month'] : [t, 'day']; return `${n} ${u}${n === 1 ? '' : 's'} left`; };
// Rhythia's title next to the name, as on its leaderboard (core/kit.js titleOf).
const titleImg = (rp = 0, pos = 0) => { const {id: k, name: l} = K().titleOf(rp, pos); return `<img class="s-ctt" src="${SITE}/titles/${k}.png" alt="${l}" data-tip="<b>${l}</b><small>Rhythia title</small>">`; };
const SUP_NOTE = '<p class="s-note">Each payment adds one month of supporter status to your account or a recipient of your choice.</p>';
function support(host, ctx) {
  const R = host.shadowRoot, ac = new AbortController(), sig = {signal: ac.signal}, $ = s => R.querySelector(s);
  const ui = K().shell(R, sig);
  const S = {me: undefined};
  let io = null, raf = 0, gift = 0;

  // Hearts and squares from Rhythia's supporter card, drifting up the banner.
  const floaters = () => Array.from({length: 14}, (_, i) => `<i class="s-fl ${i % 3 ? 'h' : 'q'}" style="--x:${(i * 37 + 11) % 100}%;--d:${9 + (i * 7) % 8}s;--w:${-((i * 13) % 17)}s;--s:${.6 + ((i * 5) % 7) / 10}"></i>`).join('')
    + Array.from({length: 10}, (_, i) => `<b class="s-tw" style="--x:${(i * 29 + 7) % 96}%;--y:${(i * 41 + 9) % 70}%;--d:${3 + (i * 7) % 4}s;--w:${-((i * 11) % 6)}s"></b>`).join('');
  function status() {
    const me = S.me;
    if (me === undefined) return '';
    if (!me) return SUP_NOTE;
    const dl = me.verified && me.verificationDeadline;
    const until = dl ? new Date(dl).toLocaleDateString('en-US', {year: 'numeric', month: 'long', day: 'numeric'}) : '';
    return `<div class="s-status ${me.verified ? 'on' : ''}">
      <span class="s-sub"><small>Supporter subscription</small><b>${me.verified ? (dl ? esc(timeLeft(dl)) : 'active') : 'not purchased'}</b>${until ? `<em>Expires on ${esc(until)}</em>` : ''}</span>
      ${me.verified ? `<img src="${SITE}/supporterheart.png" alt="Rhythia Supporter" class="s-sheart">` : ''}</div>${SUP_NOTE}`;
  }
  // How a supporter's row looks on the leaderboards, drawn with the signed-in player's own name.
  function preview() {
    const me = S.me;
    if (!me) return '';
    return `<div class="s-card" aria-label="Your player card as a supporter"><picture><source media="(min-width: 1024px)" srcset="${SITE}/supporterbg.png"><img src="${SITE}/supporterbg-mobile.png" alt=""></picture>
      <span class="s-cwho">${me.position ? `<span class="s-cpos num">#${fmt(me.position)}</span>` : ''}${me.flag ? `<img class="s-flag" src="${SITE}/flags/${esc(me.flag)}.svg" alt="${esc(me.flag)}">` : ''}${K().av(me.avatar_url, 's-cav')}<b>${esc(me.username)}</b>${titleImg(me.skill_points, me.position)}</span>
      <span class="s-crp num">${fmt(me.skill_points || 0)} RP</span><img class="s-cheart" src="${SITE}/supporterheart.png" alt="Rhythia Supporter"></div>`;
  }
  function render() {
    $('#hero').innerHTML = `<section class="s-hero" aria-label="Rhythia Supporter"><div class="s-banner" style="background-image:url('${SITE}/supportbanner.png')"></div><div class="s-fls" aria-hidden="true">${floaters()}</div><h1 class="sr">Rhythia Supporter</h1></section>`;
    $('#body').innerHTML = `<div class="s-page">
      <section class="container s-in">
        <figure class="s-quote s-rv">${QUOTE_SVG}<blockquote>
          <p>I started Rhythia to build the game I'd want to play: <strong>no pay-to-win</strong>, no intrusive ads, just the joy of playing. As we grow, those principles stay the same.</p>
          <p><strong>Your support is entirely optional.</strong> It helps keep our servers running, fund community events, and support our small team. Thank you for helping keep Rhythia alive and true to its values.</p>
        </blockquote>${QUOTE_SVG}<figcaption>— The developer of Rhythia</figcaption></figure>
        <section class="s-cta s-rv" style="--rd:80ms">
          <div class="s-ctal"><h2>Become a Supporter</h2><p>Help Rhythia grow and enjoy a few extra perks.</p><div id="s-status">${status()}</div></div>
          <div class="s-ctar"><span class="s-price"><b class="num">$5</b> / month</span>
            <div class="s-btns"><button class="btn s-go" type="button" data-native-click="Support now">${HEART_SVG}Support now</button>
            <button class="btn s-gift" type="button" data-gift>${GIFT_SVG}Gift Supporter</button></div>
            <img class="s-pay" src="${SITE}/payments.png" alt="Supported payment methods" loading="lazy">
            <span class="s-terms"><a href="/payment-terms" target="_blank" rel="noopener">Payment Terms</a> · <a href="/refund-terms" target="_blank" rel="noopener">Refund Terms</a></span></div>
        </section>
        <h2 class="s-ph s-rv">Additional Perks</h2>
        <div class="s-perks">${PERKS.map(([t, img, a, b, p], i) => `<section class="s-perk s-rv" style="--a:${a};--b:${b};--rd:${i * 110}ms">
          <span class="s-band" aria-hidden="true"></span><img class="s-pimg ${i === 2 ? 'lg' : ''}" src="${SITE}/${img}" alt="" loading="lazy">
          <div class="s-ptxt"><h3>${esc(t)}</h3><p>${esc(p)}</p>${i === 0 ? `<div id="s-prev">${preview()}</div>` : ''}</div></section>`).join('')}</div>
      </section><div style="height:96px"></div></div>`;
    reveal();
  }
  function reveal() {
    io?.disconnect();
    const els = [...R.querySelectorAll('.s-rv')];
    if (REDUCED || !('IntersectionObserver' in window)) { els.forEach(el => el.classList.add('in')); return; }
    io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), {rootMargin: '0px 0px -8% 0px'});
    els.forEach(el => io.observe(el));
  }
  // The banner fades a little as the page scrolls past it (it is never moved, so it is never cut).
  if (!REDUCED) addEventListener('scroll', () => {
    if (raf) return;
    raf = requestAnimationFrame(() => { raf = 0; const b = $('.s-banner'); if (b && scrollY < 600) b.style.opacity = (1 - Math.min(scrollY, 500) / 500 * .45).toFixed(3); });
  }, {passive: true, ...sig});
  // Gift: Rhythia's dialog, switched to "For another user". Signed out, Rhythia asks to sign in first.
  R.addEventListener('click', e => {
    if (!e.target.closest('[data-gift]')) return;
    if (!ui.native('Support now')) { ui.toast('Rhythia is still loading. Try again in a moment.'); return; }
    // Signed out (known): Rhythia shows its sign-in prompt. Not known yet: look for the switch anyway; a signed-out
    // player never gets it and the search simply ends.
    if (S.me === null) return;
    const t0 = Date.now();
    clearInterval(gift);
    gift = setInterval(() => {
      const b = [...document.querySelectorAll('[role=dialog] button')].find(x => x.textContent.trim() === 'For another user');
      if (b) { b.click(); clearInterval(gift); setTimeout(() => document.querySelector('[role=dialog] input[placeholder*="username" i]')?.focus(), 60); }
      else if (Date.now() - t0 > 3000) { clearInterval(gift); if (S.me) ui.toast('Choose “For another user” in Rhythia’s dialog to send it as a gift.'); }
    }, 80);
  }, sig);

  render();
  const fill = () => { const st = $('#s-status'), pv = $('#s-prev'); if (st) st.innerHTML = status(); if (pv) pv.innerHTML = preview(); };
  Data().signedIn().then(me => { if (ac.signal.aborted) return; S.me = me || null; fill(); }).catch(() => { S.me = null; fill(); });

  return {
    state: () => ({}), idle: () => true, relayout() {}, page() {},
    destroy() { ac.abort(); ui.hide(); io?.disconnect(); cancelAnimationFrame(raf); clearInterval(gift); },
  };
}

const css = `
.s-hero{position:relative;aspect-ratio:3797/785;max-height:460px;width:100%;overflow:hidden;isolation:isolate;border-bottom:1px solid var(--line);background:#1a0b24}
.s-banner{position:absolute;inset:0;background:center bottom/cover no-repeat;will-change:transform;animation:sBan 1.1s var(--ease) both}
@keyframes sBan{from{opacity:0;scale:1.06}to{opacity:1;scale:1}}
.s-fls{position:absolute;inset:0;pointer-events:none;overflow:hidden}
.s-fl{position:absolute;bottom:-24px;left:var(--x);width:14px;height:14px;opacity:0;scale:var(--s);animation:sFl var(--d) linear var(--w) infinite}
.s-fl.q{border:2px solid rgba(240,190,255,.5);border-radius:4px}
.s-fl.h{background:rgba(240,190,255,.5);-webkit-mask:var(--heart) center/contain no-repeat;mask:var(--heart) center/contain no-repeat}
.s-fls{--heart:url('data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="3"%3E%3Cpath d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/%3E%3C/svg%3E')}
.s-tw{position:absolute;left:var(--x);top:var(--y);width:10px;height:10px;opacity:0;background:#f6d8ff;clip-path:polygon(50% 0,60% 40%,100% 50%,60% 60%,50% 100%,40% 60%,0 50%,40% 40%);filter:drop-shadow(0 0 4px #e9a8ff);animation:sTw var(--d) ease-in-out var(--w) infinite}
@keyframes sTw{0%,100%{opacity:0;scale:.4;rotate:0deg}50%{opacity:.85;scale:1;rotate:45deg}}
.s-hero::after{content:'';position:absolute;inset:auto 0 0;height:45%;pointer-events:none;background:radial-gradient(60% 100% at 50% 100%,rgba(228,92,255,.22),transparent 70%);animation:sGlow 6s ease-in-out infinite}
@keyframes sGlow{0%,100%{opacity:.5}50%{opacity:1}}
@keyframes sFl{0%{opacity:0;transform:translateY(0) rotate(0)}15%{opacity:.8}70%{opacity:.5}100%{opacity:0;transform:translateY(-300px) rotate(40deg)}}
.s-in{display:flex;flex-direction:column;gap:24px;max-width:1100px;margin-top:32px}
.s-rv{opacity:0;transform:translateY(18px);transition:opacity .6s var(--ease) var(--rd,0ms),transform .6s var(--ease) var(--rd,0ms)}
.s-rv.in{opacity:1;transform:none}
.s-quote{position:relative;margin:0;padding:26px 56px 22px;border-radius:18px;background:var(--dialog);box-shadow:inset 0 0 0 1px var(--line-2),0 24px 60px rgba(0,0,0,calc(.4 * var(--sh)))}
.s-quote > svg{position:absolute;width:24px;height:24px;color:var(--muted);opacity:.7}
.s-quote > svg:first-of-type{left:20px;top:22px;rotate:180deg}
.s-quote > svg:last-of-type{right:20px;bottom:52px}
.s-quote blockquote{margin:0;display:flex;flex-direction:column;gap:12px;color:var(--text-2);font-size:16px;line-height:1.65}
.s-quote blockquote p{margin:0}
.s-quote strong{color:var(--text);font-weight:650}
.s-quote figcaption{margin-top:14px;text-align:right;font-size:13.5px;color:var(--muted)}
.s-cta{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:24px;align-items:center;padding:24px 28px;border-radius:18px;background:var(--panel);box-shadow:inset 0 0 0 1px var(--line)}
.s-ctal h2{margin:0;font-size:22px;font-weight:800}
.s-ctal > p{margin:4px 0 0;color:var(--muted);font-size:14.5px}
.s-ctar{display:grid;grid-template-columns:auto auto;align-items:center;justify-items:end;gap:12px 20px}
.s-price{color:var(--muted);font-size:15px;white-space:nowrap}
.s-price b{display:inline-block;font-size:34px;font-weight:800;color:#e45cff;margin-right:2px}
.s-cta.in .s-price b{animation:sPop .6s var(--ease) .35s both}
@keyframes sPop{0%{scale:.6;opacity:0}60%{scale:1.12;opacity:1}100%{scale:1}}
.s-btns{display:flex;gap:8px}
.s-btns .btn{height:46px;padding:0 18px;gap:8px;font-weight:700}
.s-btns svg{width:19px;height:19px;flex:none}
.s-btns .s-go{background:#e45cff;color:#24102e;box-shadow:inset 0 0 0 1px rgba(228,92,255,.4);transition:background-color .15s,transform .2s var(--ease)}
.s-btns .s-go:hover{background:#ec80ff;transform:translateY(-1px)}
.s-go svg{animation:sBeat 1.6s ease-in-out infinite}
@keyframes sBeat{0%,40%,100%{scale:1}10%{scale:1.22}20%{scale:.96}30%{scale:1.14}}
.s-gift{transition:transform .2s var(--ease),box-shadow .15s}
.s-gift:hover{transform:translateY(-1px)}
.s-gift:hover svg{animation:sWig .5s ease-in-out}
@keyframes sWig{25%{rotate:-12deg}75%{rotate:10deg}}
.s-pay{grid-column:1/-1;height:26px;width:auto;opacity:.85}
.s-terms{grid-column:1/-1;font-size:12.5px;color:var(--muted)}
.s-terms a:hover{color:var(--text)}
.s-status{display:flex;align-items:center;gap:14px;margin-top:16px;padding:12px 16px;border-radius:12px;background:var(--panel-2);box-shadow:inset 0 0 0 1px var(--line);width:max-content;max-width:100%}
.s-status.on{background:linear-gradient(90deg,rgba(244,114,182,.14),rgba(232,121,249,.05));box-shadow:inset 0 0 0 1px rgba(232,121,249,.35)}
.s-sub{display:flex;flex-direction:column;gap:1px}
.s-sub small{font-size:12px;color:var(--muted);font-weight:600}
.s-sub b{font-size:16px;font-weight:750}
.s-sub b::first-letter{text-transform:uppercase}
.s-sub em{font-style:normal;font-size:12.5px;color:var(--text-2)}
.s-sheart{height:26px;width:auto;animation:sBeat 2.4s ease-in-out infinite}
.s-note{margin:12px 0 0;font-size:13px;color:var(--muted);max-width:52ch}
.s-ph{margin:24px 0 0;text-align:center;font-size:30px;font-weight:900;letter-spacing:-.01em}
.s-perks{display:flex;flex-direction:column;gap:14px}
.s-perk{position:relative;isolation:isolate;display:flex;align-items:center;min-height:160px;color:#fff}
.s-band{position:absolute;inset:16px 12px 16px 80px;z-index:-1;border-radius:24px;background:linear-gradient(90deg,var(--a),var(--b));clip-path:inset(0 100% 0 0 round 24px);transition:clip-path .8s var(--ease) calc(var(--rd,0ms) + 120ms)}
.s-perk.in .s-band{clip-path:inset(0 0 0 0 round 24px)}
.s-pimg{position:absolute;left:0;top:50%;width:160px;height:160px;object-fit:contain;translate:0 -50%;scale:.5;opacity:0;transition:scale .7s cubic-bezier(.34,1.56,.64,1) calc(var(--rd,0ms) + 260ms),opacity .3s calc(var(--rd,0ms) + 260ms)}
.s-pimg.lg{width:176px;height:176px;left:-8px}
.s-perk.in .s-pimg{scale:1;opacity:1}
.s-band::after{content:'';position:absolute;inset:0;border-radius:inherit;pointer-events:none;background:linear-gradient(105deg,transparent 40%,rgba(255,255,255,.12) 50%,transparent 60%) -150% 0/60% 100% no-repeat;animation:sShine 7s ease-in-out calc(var(--rd,0ms) + 1.2s) infinite}
@keyframes sShine{0%,70%{background-position:-150% 0}100%{background-position:250% 0}}
.s-perk:hover .s-pimg{animation:sBob 1.2s ease-in-out infinite}
@keyframes sBob{0%,100%{transform:translateY(0) rotate(0)}50%{transform:translateY(-6px) rotate(-4deg)}}
.s-ptxt{padding:28px 32px 28px 184px;min-width:0}
.s-ptxt h3{margin:0;font-size:21px;font-weight:900}
.s-ptxt p{margin:4px 0 0;font-size:16.5px;line-height:1.55;color:rgba(255,255,255,.92)}
.s-card{position:relative;display:flex;align-items:center;gap:14px;margin-top:14px;height:56px;padding:0 52px 0 14px;border-radius:14px;overflow:hidden;background:rgba(30,12,40,.35);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);box-shadow:0 0 0 1px rgba(255,255,255,.16),0 10px 28px rgba(60,0,30,.35),0 0 22px rgba(228,92,255,.18);max-width:560px;text-align:left;animation:sCard 5s ease-in-out infinite}
@keyframes sCard{0%,100%{translate:0 0}50%{translate:0 -3px}}
.s-card picture,.s-card picture img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:right;opacity:.82;-webkit-mask:linear-gradient(90deg,rgba(0,0,0,.55),#000 35%);mask:linear-gradient(90deg,rgba(0,0,0,.55),#000 35%)}
.s-card::after{content:'';position:absolute;inset:0;pointer-events:none;background:linear-gradient(105deg,transparent 35%,rgba(255,255,255,.14) 50%,transparent 65%) -150% 0/50% 100% no-repeat;animation:sShine 6s ease-in-out 2s infinite}
.s-cheart{animation:sBeat 2.4s ease-in-out infinite}
.s-cwho{position:relative;display:flex;align-items:center;gap:10px;min-width:0;flex:1}
.s-cwho b{font-size:15px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.s-flag{width:23px;height:16px;border-radius:2px;object-fit:cover;flex:none}
.s-cpos{font-size:14px;font-weight:700;color:rgba(255,255,255,.75);min-width:44px}
.s-ctt{width:20px;height:20px;flex:none;object-fit:contain}
.s-cav{width:32px;height:32px;border-radius:8px;flex:none;background:#2a2b2e center/cover}
.s-crp{position:relative;font-size:13.5px;font-weight:650;color:rgba(255,255,255,.85)}
.s-cheart{position:absolute;right:14px;top:50%;height:24px;translate:0 -50%}
@media (max-width:860px){.s-hero{aspect-ratio:auto;height:220px}.s-cta{grid-template-columns:1fr}.s-ctar{justify-items:start;grid-template-columns:1fr}.s-in{margin-top:24px}}
@media (max-width:640px){.s-hero{aspect-ratio:auto;height:150px}.s-banner{background-size:auto 100%;background-position:58% center}.s-quote{padding:22px 22px 18px 46px}.s-quote > svg:first-of-type{left:14px;top:20px}.s-quote > svg:last-of-type{display:none}.s-cta{padding:20px}.s-btns{flex-direction:column;width:100%}.s-btns .btn{width:100%;justify-content:center}.s-perk{flex-direction:column;min-height:0;padding-top:96px}.s-band{inset:56px 0 0 0}.s-pimg,.s-pimg.lg{left:50%;top:0;width:120px;height:120px;translate:-50% 0}.s-ptxt{padding:28px 20px 22px;text-align:center}.s-card{margin-inline:auto}.s-ph{font-size:24px}}
@media (prefers-reduced-motion:reduce){.s-fls{display:none}.s-banner,.s-go svg,.s-sheart,.s-cta.in .s-price b,.s-perk:hover .s-pimg,.s-hero::after,.s-band::after,.s-card,.s-card::after,.s-cheart{animation:none!important}.s-rv,.s-band,.s-pimg{transition:none!important}}
`;

K().page('support', support, css);
})();
