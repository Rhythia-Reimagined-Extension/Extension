// =============================================
// Reimagined for Rhythia — Exodus flair
// =============================================
// Small motion that belongs to no single page, started by core/shell.js once its shadow root exists:
// - Easter eggs (popup switch "Easter eggs", RhythiaX.ExodusPrefs.modules.easterEggs), as in Classic
//   (legacy/core/easter-eggs.js): a 67, 69 or 420 standing on its own plays for 2 s, first 5-20 s after a page
//   opens, then every 20-40 s, each number on its own timer. The number is wrapped only while it plays and
//   given back as plain text after, so the pages' own redraws never meet the wrapper.
// - The logo: every 10 s a 1 in 4 chance that Rhythia's logo turns into Reimagined's for 4 s, at most once a minute
//   (Normal; How often in the popup changes all three).
// - Supporter hearts beat: the one on a profile's avatar steadily, the ones on the leaderboard each at its own
//   random 1-10 s, so a page of supporters does not beat in step. Not an Easter egg: always on.
// Nothing moves with reduced motion, in a hidden tab, or while Exodus does not show the page.

var RhythiaX = RhythiaX || {};

RhythiaX.ExodusFlair = (function () {
  'use strict';

  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const NUMBERS = ['67', '69', '420'];
  // The popup's How often (options.easterEggs.frequency, RhythiaX.ExodusPrefs.eggs): Frequent is twice as often and
  // plays twice as long, Rare half as often.
  const PACE = {
    frequent: { first: [2500, 10000], again: [10000, 20000], plays: 2, chance: 0.5, shown: 8000, rest: 30000 },
    normal: { first: [5000, 20000], again: [20000, 40000], plays: 1, chance: 0.25, shown: 4000, rest: 60000 },
    rare: { first: [10000, 40000], again: [40000, 80000], plays: 1, chance: 0.125, shown: 4000, rest: 120000 },
  };
  const pace = () => PACE[RhythiaX.ExodusPrefs?.eggs] || PACE.normal;
  const PLAY = 2000, LOGO_EVERY = 10000;
  const ALONE = /(?<![\w,.\-]|\d\s+)(67|69|420)(?![\w,.]|\s+\d)/g;
  const SKIP = 'script,style,textarea,input,select,option,code,pre,svg,[contenteditable],.fx-egg,dialog:not([open])';
  const between = ([lo, hi]) => lo + Math.random() * (hi - lo);

  let root = null, timers = {}, logoTimer = 0, heartTimer = 0, lastLogo = 0, path = '';
  const eggsOn = () => RhythiaX.ExodusPrefs?.modules?.easterEggs !== false;
  const showing = () => document.documentElement.classList.contains('rhythiax-exodus') && !document.hidden;

  // ─── Number eggs ───
  function wrap(number) {
    const body = root?.getElementById('body');
    if (!body) return [];
    const walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT, {
      acceptNode: n => (n.parentElement?.closest(SKIP) || !n.nodeValue.includes(number) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
    });
    const nodes = []; let n;
    while ((n = walker.nextNode())) nodes.push(n);
    const eggs = [];
    for (const node of nodes) {
      const text = node.nodeValue, parts = [];
      let last = 0;
      for (const m of text.matchAll(ALONE)) {
        if (m[1] !== number) continue;
        parts.push(text.slice(last, m.index));
        const egg = document.createElement('span');
        egg.className = `fx-egg fx-${number}`;
        egg.dataset.text = number;
        egg.innerHTML = number === '67' ? '<i>6</i><i>7</i>' : number;
        parts.push(egg); eggs.push(egg);
        last = m.index + number.length;
      }
      if (!parts.length) continue;
      parts.push(text.slice(last));
      node.replaceWith(...parts.filter(p => p !== ''));
    }
    return eggs;
  }
  function unwrap(eggs) {
    for (const egg of eggs) {
      if (!egg.isConnected) continue;
      const parent = egg.parentNode;
      egg.replaceWith(egg.dataset.text);
      parent.normalize();
    }
  }
  function play(number) {
    if (!eggsOn() || !showing()) return;
    const eggs = wrap(number), plays = pace().plays;
    if (!eggs.length) return;
    eggs.forEach(e => e.style.setProperty('--fx-plays', String(plays)));
    requestAnimationFrame(() => eggs.forEach(e => e.classList.add('on')));
    setTimeout(() => unwrap(eggs), PLAY * plays + 100);
  }
  function schedule(number, which) {
    clearTimeout(timers[number]);
    timers[number] = setTimeout(() => { play(number); schedule(number, 'again'); }, between(pace()[which]));
  }

  // ─── The logo ───
  function logoTick() {
    const P = pace();
    if (!eggsOn() || !showing() || Date.now() - lastLogo < P.rest || Math.random() >= P.chance) return;
    const brand = root?.querySelector('.site .brand');
    if (!brand || !RhythiaX.APP_ICON) return;
    if (!brand.querySelector('.fx-alt')) brand.insertAdjacentHTML('beforeend', `<span class="fx-alt" aria-hidden="true"><img src="${RhythiaX.APP_ICON}" alt=""><b>Reimagined</b></span>`);
    lastLogo = Date.now();
    brand.classList.add('fx-swap');
    setTimeout(() => brand.classList.remove('fx-swap'), P.shown);
  }

  // ─── Supporter hearts ───
  const next = new WeakMap();
  const BEAT = [{transform: 'scale(1)'}, {transform: 'scale(1.22)', offset: .15}, {transform: 'scale(1)', offset: .32}, {transform: 'scale(1.14)', offset: .48}, {transform: 'scale(1)', offset: .7}, {transform: 'scale(1)'}];
  function heartTick() {
    if (!showing()) return;
    const now = performance.now();
    root?.querySelectorAll('.sup-heart img, .b-heart').forEach(h => {
      const steady = h.parentElement?.classList.contains('sup-heart');
      if (!next.has(h)) { next.set(h, now + (steady ? 600 : between([0, 10000]))); return; }
      if (now < next.get(h)) return;
      h.animate(BEAT, {duration: 900, easing: 'ease-out'});
      next.set(h, now + (steady ? 1700 : between([1000, 10000])));
    });
  }

  function onRoute() {
    if (location.pathname === path) return;
    path = location.pathname;
    NUMBERS.forEach(n => schedule(n, 'first'));
  }

  function start(shadowRoot) {
    if (root || REDUCED) return;
    root = shadowRoot;
    onRoute();
    // The address is checked each second: a new page starts the numbers' first timers over, as in Classic.
    setInterval(onRoute, 1000);
    logoTimer = setInterval(logoTick, LOGO_EVERY);
    heartTimer = setInterval(heartTick, 250);
  }

  const css = `
.fx-egg{display:inline-block;position:relative;white-space:nowrap}
.fx-67 i{display:inline-block;font-style:normal}
.fx-67.on i{animation:fx67 2s ease-in-out var(--fx-plays,1)}
.fx-67.on i + i{animation-direction:reverse}
@keyframes fx67{0%,50%,100%{transform:none}12.5%,62.5%{transform:translateY(-.24em)}37.5%,87.5%{transform:translateY(.24em)}}
.fx-69,.fx-420{transition:color .3s var(--ease)}
.fx-69.on{color:#f472b6}
.fx-69.on::before,.fx-69.on::after{content:"\\2665";position:absolute;left:50%;top:-.9em;font-size:.6em;line-height:1;color:#f472b6;pointer-events:none;animation:fxHeart 2s ease-out var(--fx-plays,1) both}
.fx-69.on::before{margin-left:-.9em;font-size:.48em;animation-delay:.15s}
@keyframes fxHeart{0%{opacity:0;transform:translate(-50%,.2em) scale(.6)}20%{opacity:1}100%{opacity:0;transform:translate(-50%,-1em) scale(1.05)}}
.fx-420.on{color:#4ade80;animation:fx420 2s var(--ease) var(--fx-plays,1)}
@keyframes fx420{0%,100%{transform:none}30%{transform:translateY(-.12em) rotate(-4deg)}60%{transform:translateY(-.06em) rotate(3deg)}}
.site .brand{position:relative}
.site .brand > img,.site .brand > .re{transition:opacity .5s var(--ease),transform .6s var(--ease),filter .5s var(--ease)}
.fx-alt{position:absolute;left:50%;top:0;height:30px;display:flex;align-items:center;gap:6px;white-space:nowrap;pointer-events:none;
  opacity:0;transform:translate(-50%,8px);filter:blur(4px);transition:opacity .5s var(--ease),transform .6s var(--ease),filter .5s var(--ease)}
.fx-alt img{width:26px;height:26px}
.fx-alt b{font-size:16px;font-weight:800;letter-spacing:-.01em;color:var(--text)}
.fx-swap > img,.fx-swap > .re{opacity:0;transform:translateY(-8px);filter:blur(4px)}
.fx-swap .fx-alt{opacity:1;transform:translate(-50%,0);filter:none}
`;

  return { start, css };
})();
