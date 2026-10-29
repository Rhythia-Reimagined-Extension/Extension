// =============================================
// Reimagined for Rhythia — Exodus own themes on the page
// =============================================
// What an own theme (shared/exodus-themes.js) does to the page Exodus shows. css() and pictureCss() write the
// CSS it adds to Exodus' shadow root from what ExodusThemes.resolve() returns. create() is the shell's part
// (core/shell.js): the theme in use and its background picture or video, the look painted into the shell,
// and the theme editor (core/theme-editor.js) with saving and removing a theme.

var RhythiaX = RhythiaX || {};

RhythiaX.ExodusOwnTheme = (function () {
  'use strict';

  const { rgbs, mix, imageOk, isVideo, mediaUrl, freeUrl, blobHolder } = RhythiaX.Colour;
  // The climb, drop and miss colours of the built-in looks (core/assets.js), lifted on a light or busy picture.
  const TONES = { dark: { good: '#4ade80', bad: '#f87171', miss: '#fb7185' }, white: { good: '#15803d', bad: '#dc2626', miss: '#e11d48' } };

  // What draws a background of its own behind its text, on every page: text in it keeps no halo (css(), D.bare).
  // Chips that are only a light tint of their colour (.v-chip, .v-tag) are not in it: their text is on the picture.
  // FLOAT_BG have one only in Floating: Lines draws them as outlines, so their text lies on the picture too.
  const FLOAT_BG = ['.panel', '.strip', '.kpi', '.tile', '.faq-item', '.faq-btn', '.sig', '.social', '.pages button[aria-current="page"]', '.ed-pins li',
    '.h-com', '.b-me', '.b-hl', '.v-card', '.v-facts > div', '.v-com', '.c-card', '.g-entry'];
  const OWN_BG = ['.site', '.tip', '.toast', '.menu', 'dialog', '.btn', '.iconbtn', '.pills', '.tabs.seg', '.field', 'input', 'textarea', 'select',
    '.ranks', '.rtag', '.showcase', '.plate', '.faq', '.bcard', '.suggest', '.mods', '.grade', '.ach', '.duelist', '.dpill', '.clash', '.spill',
    '.item', '.online-offer', '.try-card', '.try-tag', '.k-card', '.b-cp-pop', '.v-chip.plain', '.v-mini', '.v-dock',
    '.v-zr', '.v-trophy', '.v-mine', '.v-form', '.v-notice', '.v-owner', '.v-skin', '.v-skbig',
    '.c-chips span', '.c-warn', '.w-res', '.w-entry.on', '.g-stream', '.g-chip', '.g-card', '.g-tag', '.g-v.on', '.s-hero',
    '.s-quote', '.s-cta', '.s-status', '.s-band', '.s-card', '.md code', '.md pre', '.md-box', '.ac-sec', '.ct', '.find-res',
    '.bio code', '.item-x', '.spdc', '.h-stage', '.h-me', '.h-who', '.h-lb-row.me', '.h-rel code', '.h-map', '.h-diff', '.h-star',
    '.b-row.me', '.b-row.sup', '.b-cp-btn', '.b-fl.code', '.v-row.me', '.v-skmeta span', '.v-clrow.me', '.v-mrow2.me', '.v-clrel',
    '.v-clcty span', '.w-navd', '.s-tw', '.md th', '.ac-size', '.ac-plate', '.ac-pick', '.ac-confirm', '.ac-chip'];

  // The CSS this theme adds to Exodus' shadow root. Own themes write every token, built-in ones nothing.
  // R: what ExodusThemes.resolve() returned for the theme.
  function css(R) {
    const { T, D, val, onAccent, imageCss, pageStops, pageBg, video, layer, frame, accentStops, accentBg } = R;
    if (!T.seed) return '';
    const v = val, t = [], r = [];
    const lc = rgbs(v('lineCol')), ls = v('lineS') / 100;
    // See-through panels let a little of the background through.
    const pa = 1 - v('panelClear') / 100, panel = pa < 1 ? `rgba(${rgbs(v('panel'))},${+pa.toFixed(2)})` : v('panel');
    t.push(`--page:${v('page')}`, `--page-rgb:${rgbs(v('page'))}`,
      `--panel:${panel}`, `--panel-2:color-mix(in srgb,${panel},${v('text')} 4%)`, `--panel-3:color-mix(in srgb,${panel},${v('text')} 8%)`, `--ring-bg:${v('panel')}`,
      `--field:${v('field')}`, `--text:${v('text')}`, `--tip-text:${v('text')}`, `--text-2:${v('text2')}`, `--muted:${v('muted')}`,
      `--accent:${v('accent')}`, `--accent-2:color-mix(in srgb,${v('accent')},${D.base === 'white' ? '#000' : '#fff'} 28%)`,
      `--accent-soft:color-mix(in srgb,${v('accent')} 14%,transparent)`, `--on-accent:${onAccent()}`,
      `--glass:${rgbs(v('glass'))}`, `--ink:${lc}`,
      `--rule:rgba(${lc},${ls})`, `--rule-2:rgba(${lc},${Math.min(1, ls * 2)})`, `--line:rgba(${lc},${ls * .6})`, `--line-2:rgba(${lc},${ls * 1.2})`);
    // The page background: the colour or gradient, and over it the picture or video with its blur, darkening and fade.
    // Layers, back to front: the colour or gradient (::before), then the video or the picture (::after). Darkening
    // lets the background show through the picture, so a smaller or turned picture never leaves a dark box.
    // .exo is no stacking context of its own: the bar, its menus and tips must stay above Rhythia's docked player
    // (core/dock.js), which lies outside it. The page's body is see-through instead (backdrop, exodus/boot.css).
    const img = imageCss();
    if (backdrop(R)) {
      r.push(`.exo.exo{background:transparent}.exo::before{content:"";position:fixed;inset:0;z-index:-1;pointer-events:none;background:${pageBg()}}`);
      const b = v('bgBlur'), solid = 100 - v('bgFadeLen');
      const mask = { none: '', bottom: `linear-gradient(to bottom,#000 ${solid}%,transparent)`, top: `linear-gradient(to top,#000 ${solid}%,transparent)`,
        left: `linear-gradient(to left,#000 ${solid}%,transparent)`, right: `linear-gradient(to right,#000 ${solid}%,transparent)`,
        edges: `radial-gradient(ellipse at center,#000 ${Math.max(solid - 10, 0)}%,transparent 72%)` }[v('bgFade')];
      const look = `${v('bgDim') ? `opacity:${+(1 - v('bgDim') / 100).toFixed(2)};` : ''}${b ? `filter:blur(${b}px);` : ''}${mask ? `-webkit-mask-image:${mask};mask-image:${mask};` : ''}`;
      if (img) r.push(`.exo::after{content:"";${layer(b)};z-index:-1;pointer-events:none;background:${img};${look}}`);
      if (video) {
        const f = frame();
        r.push(`.exo > video.ownbg{${layer(b)};object-fit:${({ cover: 'cover', contain: 'contain', stretch: 'fill' })[f.fit]};object-position:${f.x}% ${f.y}%;z-index:-1;pointer-events:none;${look}}`);
      }
    }
    // Frosting behind panels. Lines draws no panel body, so a frost the size of the panel ends flush with its text
    // and looks cut off: there it is a layer of its own that reaches EDGE px past the panel and fades out.
    const frost = v('panelBlur'), pic = Boolean(img || video), lines = T.style === 'lines';
    const PANELS = ':is(.panel,.kpi,.tile,.faq-item,.ach,.duelist,.clash)';
    if (frost && lines && pic) {
      const EDGE = 16, fade = `linear-gradient(to right,transparent,#000 ${EDGE}px,#000 calc(100% - ${EDGE}px),transparent),linear-gradient(transparent,#000 ${EDGE}px,#000 calc(100% - ${EDGE}px),transparent)`;
      r.push(`.exo ${PANELS}{position:relative;isolation:isolate}`,
        `.exo ${PANELS}::before{content:"";position:absolute;inset:-${EDGE}px;z-index:-1;pointer-events:none;-webkit-backdrop-filter:blur(${frost}px);backdrop-filter:blur(${frost}px);`
          + `-webkit-mask-image:${fade};-webkit-mask-composite:source-in;mask-image:${fade};mask-composite:intersect}`,
        `.exo .site .search{-webkit-backdrop-filter:blur(${frost}px);backdrop-filter:blur(${frost}px)}`);
    } else if (frost) r.push(`.exo :is(.panel,.kpi,.tile,.faq-item,.ach,.duelist,.clash,.site .search){-webkit-backdrop-filter:blur(${frost}px);backdrop-filter:blur(${frost}px)}`);
    if (pic) {
      // A frost is drawn only once nothing around it is see-through, so parts that faded in showed theirs late
      // (after .reveal's .7s). Over a picture they only rise into place, and the frost is there with them.
      r.push('@keyframes ownRise{from{transform:translateY(16px)}}@keyframes ownRiseS{from{transform:translateY(5px)}}',
        '.exo .reveal{opacity:1;transition:transform .7s var(--ease)}',
        '.exo .hero :is(.avatar,.who,.ranks,.strip){animation-name:ownRise}',
        `.exo :is(.swap,${PANELS}){animation-name:ownRiseS}.exo .fadein{animation:none}`);
      // Lines draws pills, tabs and fields as outlines: over a picture they get the glass plate the buttons have.
      if (lines) r.push(`.exo :is(.pills,.tabs.seg,.field){background-color:rgba(var(--glass),${v('glassA') / 100});-webkit-backdrop-filter:blur(${v('glassBlur')}px) saturate(1.2);backdrop-filter:blur(${v('glassBlur')}px) saturate(1.2)}`,
        '.exo :is(.pills button:not([aria-pressed="true"]),.pills a,.tabs.seg button:not([aria-selected="true"]),.field){color:var(--text-2)}');
      // Text with no panel behind it, on a picture: links in a colour that reads there, and on a picture too light
      // or busy for that (D.bare), a soft halo of the glass colour hugging the letters, as strong as text there
      // needs. It is set once on the page and inherited, so every page's bare text has it, and taken off again in
      // everything that draws its own background (OWN_BG: buttons, chips, menus, cards; FLOAT_BG: panels in Floating,
      // which in Lines are only outlines with the picture behind their text). Large headings
      // get a wider, lighter halo, small text a tighter one. No boxes: Lines draws no panels behind text.
      const BARE_LINKS = ':is(.v-more,.lede-link,.sec-head .link,.tab-new,.b-link,.bio a,.played em b)';
      if (D.link) r.push(`.exo ${BARE_LINKS}{color:${D.link}}`);
      if (D.bare) {
        const a = D.bare, t = Math.min(.9, .6 + a * .4), w = Math.min(.7, .4 + a * .4), g = x => `rgba(var(--glass),${+x.toFixed(2)})`;
        // Small and thin text gets the closest, darkest halo; on a light theme the halo is light, so only a tight
        // edge, as a wide one would look like a glow.
        const small = D.base === 'white' ? `0 0 2px ${g(t)},0 1px 3px ${g(t)}` : `0 0 2px ${g(t)},0 1px 3px ${g(t)},0 0 10px ${g(w)}`;
        const large = D.base === 'white' ? small : `0 1px 4px ${g(t * .85)},0 0 20px ${g(w)}`;
        const ink = D.base === 'white' ? '#000000' : '#ffffff', tone = TONES[D.base === 'white' ? 'white' : 'dark'];
        const own = (lines ? OWN_BG : [...OWN_BG, ...FLOAT_BG]).join(',');
        r.push(`.exo{text-shadow:${small}}`,
          `.exo :is(${own}){text-shadow:none}`,
          // Coloured text is lifted as the links are, at most 40% of the way to white (black on a light theme): chips,
          // and the climb, drop and miss colours, so an arrow or a number carries the colour while names stay in the
          // text colour.
          `.exo :is(.v-chip:not(.plain),.v-tag){color:color-mix(in srgb,var(--c,var(--text-2)) 60%,${ink})}`,
          `.exo.exo[data-theme]{--good:${mix(tone.good, ink, .35)};--bad:${mix(tone.bad, ink, .35)};--miss:${mix(tone.miss, ink, .35)}}`,
          '.exo :is(.b-hl-who,.b-hl-who b){color:var(--text)}',
          // Headings and the profile's name and its line (which bring a shadow of their own for the banner).
          `.exo :is(h1,h2,.name):not(:is(${own}) *){text-shadow:${large}}`,
          `.exo .meta:not(:is(${own}) *){text-shadow:${small}}`);
      }
    }
    r.push(`.site{background:rgba(${rgbs(v('head'))},${v('headA') / 100});-webkit-backdrop-filter:blur(${v('headBlur')}px);backdrop-filter:blur(${v('headBlur')}px)}`);
    // A hidden banner leaves no empty space (the name, picture and ranks move up under the top bar), or with
    // bannerGap 'keep' its place stays and the page's background shows there.
    const noBanner = s => (v('bannerGap') === 'keep' ? `${s} .hero .banner{visibility:hidden}`
      : `${s} .hero .banner{display:none}${s} .hero .hero-main{margin-top:32px}`);
    if (v('bannerMode') === 'none') r.push(noBanner('.exo'));
    else {
      if (v('bannerMode') === 'mine') r.push(noBanner('.exo:not([data-own])'));
      r.push(`.hero .banner{filter:blur(${v('bannerBlur')}px) opacity(${v('bannerO') / 100})}`);
    }
    r.push(`.ranks,.rtag{background:rgba(var(--glass),${v('glassA') / 100});-webkit-backdrop-filter:blur(${v('glassBlur')}px) saturate(1.2);backdrop-filter:blur(${v('glassBlur')}px) saturate(1.2)}`);
    r.push(`.exo .btn:not(.primary){background:rgba(${rgbs(v('btnBg'))},${v('btnA') / 100});color:${v('btnText')};box-shadow:inset 0 0 0 1px rgba(${rgbs(v('btnLine'))},${v('btnLineA') / 100})}`);
    r.push(`.exo .btn{border-radius:${v('btnR')}px}`);
    if (v('btnSize') === 's') r.push('.exo .btn{height:32px;padding:0 12px;font-size:13px}.exo .btn.mini{height:28px;padding:0 10px}');
    if (v('btnSize') === 'l') r.push('.exo .btn{height:44px;padding:0 20px;font-size:15px}.exo .btn.mini{height:38px;padding:0 15px;font-size:14px}');
    if (accentStops().length > 1) {
      const g = accentBg();
      r.push(`.exo .btn.primary{background:${g}}.exo .btn.primary:hover{background:${g};filter:brightness(1.08)}`,
        // Only the underline of plain tabs: a chosen segment carries text, which would not read on the gradient.
        `.exo .tabs:not(.seg) .ink{background:${g}}`, `.exo .rp b{background:${g};-webkit-background-clip:text;background-clip:text;color:transparent}`);
    }
    return `.exo.exo[data-theme]{${t.join(';')}}\n${r.join('\n')}`;
  }

  // The uploaded picture itself, apart from css(): it is large, so it is written again only when it changes,
  // not on every move of a slider. url: where the page reads it from (shared/colour.js blobHolder): a blob: URL
  // of R.image in Chrome, which draws no data: URL over 2 MB in CSS, and R.image itself in Firefox.
  // A gradient, picture or video drawn behind the page in layers of its own.
  const backdrop = R => R.pageStops().length > 1 || Boolean(R.imageCss()) || Boolean(R.video);
  const hasPicture = R =>Boolean(R.val('bgImg')?.local && !R.video && imageOk(R.image) && !isVideo(R.image));
  function pictureCss(R, url = R.image) {
    return hasPicture(R) ? `.exo.exo{--own-pic:url("${url}")}` : '';
  }

  // ─── The shell's own-theme layer ───
  // env: what it shares with the shell, read each time it is needed: { html, root(), host(), app(), look(), meId(),
  // profileId(), pageKey }. The shell calls create() once, where it sets up own themes; the listeners start then.
  function create(env) {
    const { html, profileId, pageKey: PAGE_KEY } = env;
    // The theme in use, its background image, and while the editor is open, the theme being edited.
    const Themes = RhythiaX.ExodusThemes;
    let ownTheme = null, ownImage = null, ownImageFor = '', previewing = null;
    // The picture the theme editor opened with (or last saved), so a save that changed only colours does not
    // send it again.
    let editorImage = { id: '', image: null };
    const picUrl = blobHolder();

    function applyLook() {
      const root = env.root(), look = env.look();
      const shown = previewing || (ownTheme && { theme: ownTheme, image: ownImageFor === ownTheme.id ? ownImage : null });
      const own = shown ? Themes.resolve(shown.theme, shown.image) : null;
      const theme = own ? own.base : look.theme, style = own ? shown.theme.style : look.style;
      html.dataset.rhythiaxExodusTheme = theme;
      if (own) html.style.setProperty('--rhythiax-exodus-page', own.val('page')); else html.style.removeProperty('--rhythiax-exodus-page');
      html.classList.toggle('rhythiax-exodus-backdrop', Boolean(own && backdrop(own)));
      if (!root) return;
      const exo = root.querySelector('.exo');
      const relayout = exo.dataset.theme !== theme || exo.dataset.variant !== style;
      exo.dataset.theme = theme;
      exo.dataset.variant = style;
      exo.dataset.search = RhythiaX.ExodusPrefs?.exodus?.search === false ? 'off' : 'on';
      root.getElementById('variant').media = style === 'lines' ? 'all' : 'not all';
      root.getElementById('owntheme').textContent = own ? css(own) : '';
      // The picture is large: written only when it changes.
      const pic = own && hasPicture(own) ? pictureCss(own, picUrl(own.image)) : (picUrl(''), ''), picEl = root.getElementById('ownpic');
      if (picEl.textContent.length !== pic.length || picEl.textContent !== pic) picEl.textContent = pic;
      screenShape();
      paintVideo(own, shown?.image);
      if (!previewing) markOwn();
      if (relayout || !previewing) env.app()?.relayout();
    }

    // The screen's height / width, for a turned background picture that must still cover it (shared/colour.js placeLayer).
    function screenShape() {
      env.root()?.querySelector('.exo')?.style.setProperty('--own-ar', (innerHeight / Math.max(1, innerWidth)).toFixed(4));
    }
    addEventListener('resize', screenShape);

    // ─── A theme's background video ───
    // Muted unless the theme turns sound on. Even then it is heard only in the tab in front and only after a
    // click on the page (browsers allow no sound before that), and any other change to muted is undone.
    let bgVideo = null, bgVideoFor = '', bgVideoUrl = '', bgLoud = 0, clicked = false;
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
    function keepQuiet() {
      if (!bgVideo) return;
      const loud = bgLoud > 0 && clicked && !document.hidden;
      if (!loud) { if (!bgVideo.muted) bgVideo.muted = true; return; }
      if (bgVideo.volume !== bgLoud) bgVideo.volume = bgLoud;
      if (bgVideo.muted) bgVideo.muted = false;
    }
    function playOrRest() {
      if (!bgVideo) return;
      keepQuiet();
      if (document.hidden || reducedMotion.matches) bgVideo.pause();
      else bgVideo.play().catch(() => {});
    }
    function paintVideo(own, media) {
      const exo = env.root()?.querySelector('.exo');
      if (!exo || !own?.video) {
        if (bgVideo) { bgVideo.pause(); bgVideo.remove(); bgVideo = null; }
        if (bgVideoUrl) { freeUrl(bgVideoUrl); bgVideoUrl = ''; bgVideoFor = ''; }
        return;
      }
      if (bgVideoFor !== media) {
        if (bgVideoUrl) freeUrl(bgVideoUrl);
        bgVideoUrl = mediaUrl(media);
        bgVideoFor = media;
        if (bgVideo) bgVideo.src = bgVideoUrl;
      }
      if (!bgVideo) {
        bgVideo = document.createElement('video');
        bgVideo.className = 'ownbg';
        bgVideo.muted = true;
        bgVideo.defaultMuted = true;
        bgVideo.loop = true;
        bgVideo.playsInline = true;
        bgVideo.disablePictureInPicture = true;
        bgVideo.setAttribute('aria-hidden', 'true');
        bgVideo.addEventListener('volumechange', keepQuiet);
        bgVideo.src = bgVideoUrl;
      }
      if (exo.firstElementChild !== bgVideo) exo.prepend(bgVideo);
      bgLoud = own.sound();
      playOrRest();
    }
    document.addEventListener('visibilitychange', playOrRest);
    reducedMotion.addEventListener?.('change', playOrRest);
    addEventListener('pointerdown', () => { if (!clicked) { clicked = true; keepQuiet(); } }, { capture: true });

    // The signed-in player's own profile is marked, for themes that show only their own banner.
    function markOwn() {
      const exo = env.root()?.querySelector('.exo'), meId = env.meId();
      if (exo) exo.toggleAttribute('data-own', Boolean(meId) && profileId() === String(meId));
    }

    // The theme picked in the popup, read again whenever the saved themes change.
    function readOwnTheme(result) {
      ownTheme = Themes.active(result);
      try { localStorage.setItem(PAGE_KEY, ownTheme ? Themes.resolve(ownTheme).val('page') : ''); } catch (_) {}
      if (!ownTheme?.image) { ownImage = null; ownImageFor = ''; return; }
      if (ownImageFor === ownTheme.id) return;
      const id = ownTheme.id, key = Themes.imageKey(id);
      chrome.storage.local.get(key, got => {
        if (ownTheme?.id !== id) return;
        ownImage = Themes.imageOk(got?.[key]) ? got[key] : null;
        ownImageFor = id;
        applyLook();
      });
    }

    // The popup's "New theme" and a theme's pencil open the editor on the page Exodus shows.
    async function openEditor(id) {
      const Editor = RhythiaX.ExodusThemeEditor, root = env.root(), host = env.host();
      if (!root || !Editor) return false;
      const got = await chrome.storage.local.get([Themes.LIST_KEY]);
      const theme = id ? Themes.list(got).find(t => t.id === id) || null : null;
      let image = null;
      if (theme?.image) { const key = Themes.imageKey(theme.id); image = (await chrome.storage.local.get(key))[key] || null; }
      editorImage = { id: theme?.id || '', image };
      return Editor.open({
        root, host, theme, image,
        paint: (t, img) => { previewing = { theme: t, image: img }; applyLook(); },
        save: saveTheme,
        remove: removeTheme,
        closed: () => { previewing = null; applyLook(); },
      });
    }

    // One write for the list, the choice and the picture; a picture no longer used is removed.
    async function saveTheme(theme, image) {
      const got = await chrome.storage.local.get([Themes.LIST_KEY]);
      const list = Themes.list(got);
      const at = list.findIndex(t => t.id === theme.id);
      if (at < 0 && list.length >= Themes.MAX_THEMES) throw new Error('full');
      if (at < 0) list.push(theme); else list[at] = theme;
      const set = { [Themes.LIST_KEY]: list, [Themes.ACTIVE_KEY]: theme.id };
      // The picture or video is written only here, under its own key, so tabs are not sent it again on other
      // changes, and only when it is not the one this theme already has.
      const same = editorImage.id === theme.id && editorImage.image === image;
      if (theme.image && Themes.imageOk(image) && !same) set[Themes.imageKey(theme.id)] = image;
      if (theme.image) { ownImage = image; ownImageFor = theme.id; }
      await chrome.storage.local.set(set);
      if (!theme.image) await chrome.storage.local.remove(Themes.imageKey(theme.id));
      editorImage = { id: theme.id, image: theme.image ? image : null };
    }

    async function removeTheme(id) {
      const got = await chrome.storage.local.get([Themes.LIST_KEY, Themes.ACTIVE_KEY]);
      const set = { [Themes.LIST_KEY]: Themes.list(got).filter(t => t.id !== id) };
      if (got[Themes.ACTIVE_KEY] === id) set[Themes.ACTIVE_KEY] = '';
      await chrome.storage.local.set(set);
      await chrome.storage.local.remove(Themes.imageKey(id));
    }

    // The active theme's picture replaced from another tab (either look's editor): the change carries it.
    function pictureChanged(changes) {
      const pic = ownTheme?.image ? Themes.imageKey(ownTheme.id) : '';
      if (pic && pic in changes && changes[pic].newValue !== ownImage) {
        const v = changes[pic].newValue;
        ownImage = Themes.imageOk(v) ? v : null;
        ownImageFor = ownTheme.id;
        applyLook();
      }
    }

    return { applyLook, markOwn, readOwnTheme, openEditor, pictureChanged };
  }

  return { css, pictureCss, create };
})();
