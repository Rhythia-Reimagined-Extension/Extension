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

  const { rgbs, imageOk, isVideo, blobOf, blobHolder } = RhythiaX.Colour;

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
    const img = imageCss();
    if (pageStops().length > 1 || img || video) {
      r.push(`.exo.exo{background:transparent;isolation:isolate}.exo::before{content:"";position:fixed;inset:0;z-index:-1;pointer-events:none;background:${pageBg()}}`);
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
    r.push(`.ranks,.rtag,.hero .ranks-head .pills,.hero .ranks-head .btn:not(.primary){background:rgba(var(--glass),${v('glassA') / 100});-webkit-backdrop-filter:blur(${v('glassBlur')}px) saturate(1.2);backdrop-filter:blur(${v('glassBlur')}px) saturate(1.2)}`);
    r.push(`.exo .btn:not(.primary),.exo .hero .ranks-head .btn:not(.primary){background:rgba(${rgbs(v('btnBg'))},${v('btnA') / 100});color:${v('btnText')};box-shadow:inset 0 0 0 1px rgba(${rgbs(v('btnLine'))},${v('btnLineA') / 100})}`);
    r.push(`.exo .btn{border-radius:${v('btnR')}px}`);
    if (v('btnSize') === 's') r.push('.exo .btn{height:32px;padding:0 12px;font-size:13px}.exo .btn.mini{height:28px;padding:0 10px}');
    if (v('btnSize') === 'l') r.push('.exo .btn{height:44px;padding:0 20px;font-size:15px}.exo .btn.mini{height:38px;padding:0 15px;font-size:14px}');
    if (accentStops().length > 1) {
      const g = accentBg();
      r.push(`.exo .btn.primary{background:${g}}.exo .btn.primary:hover{background:${g};filter:brightness(1.08)}`,
        `.exo .tabs .ink{background:${g}}`, `.exo .rp b{background:${g};-webkit-background-clip:text;background-clip:text;color:transparent}`);
    }
    return `.exo.exo[data-theme]{${t.join(';')}}\n${r.join('\n')}`;
  }

  // The uploaded picture itself, apart from css(): it is large, so it is written again only when it changes,
  // not on every move of a slider. url: where the page reads it from, the blob: URL of R.image (shared/colour.js
  // blobHolder), as Chrome draws no data: URL over 2 MB in CSS.
  const hasPicture = R => Boolean(R.val('bgImg')?.local && !R.video && imageOk(R.image) && !isVideo(R.image));
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
        if (bgVideoUrl) { URL.revokeObjectURL(bgVideoUrl); bgVideoUrl = ''; bgVideoFor = ''; }
        return;
      }
      if (bgVideoFor !== media) {
        if (bgVideoUrl) URL.revokeObjectURL(bgVideoUrl);
        bgVideoUrl = URL.createObjectURL(blobOf(media));
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
