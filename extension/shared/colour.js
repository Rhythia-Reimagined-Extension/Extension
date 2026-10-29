// =============================================
// Reimagined for Rhythia — colour maths and backgrounds
// =============================================
// Loaded by Exodus, Classic and the popup, before the own themes of each look (shared/exodus-themes.js,
// shared/classic-themes.js), which are built from it: contrast and colour mixing, gradients, the check a saved
// background must pass, how a background picture or video is placed on the screen, and reading a file picked
// in either look's theme editor. Nothing here touches the page until readMedia() is called.

var RhythiaX = RhythiaX || {};

RhythiaX.Colour = (function () {
  'use strict';

  // The ways a background gradient can run.
  const DIRS = [['down', 'Down'], ['diag', 'Diagonal'], ['across', 'Across'], ['glow', 'Glow']];

  // ─── Colour maths ───
  const hex = v => { const s = String(v ?? '').trim().toLowerCase(); const m = s.match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/); if (!m) return ''; return '#' + (m[1].length === 3 ? [...m[1]].map(c => c + c).join('') : m[1]); };
  // A colour as typed: #abc, abc, #aabbcc or rgb(1, 2, 3). Anything else is ''.
  function parseColour(v) {
    const h = hex(v);
    if (h) return h;
    const m = String(v ?? '').trim().toLowerCase().match(/^rgba?\(\s*(\d{1,3})[\s,]+(\d{1,3})[\s,]+(\d{1,3})(?:[\s,/]+[\d.]+%?)?\s*\)$/);
    if (!m || m.slice(1).some(n => +n > 255)) return '';
    return '#' + m.slice(1).map(n => (+n).toString(16).padStart(2, '0')).join('');
  }
  const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const rgbs = h => rgb(h).join(',');
  const lum = h => { const [r, g, b] = rgb(h).map(v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }); return .2126 * r + .7152 * g + .0722 * b; };
  const mix = (a, b, t) => { const A = rgb(a), B = rgb(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join(''); };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
  // Contrast on several backgrounds (a gradient's colours) is the worst of them.
  const minRatio = (c, bgs) => Math.min(...bgs.map(b => ratio(c, b)));
  const avg = cs => cs.reduce((a, c, i) => mix(a, c, 1 / (i + 1)));
  // Move a colour toward `to` only as far as needed to reach `target` on every background. When no step gets
  // there (a gradient mixing light and dark), the step that reads best is kept.
  function reach(fg, bgs, target, to) {
    bgs = [].concat(bgs);
    let best = fg, bestR = 0;
    for (let i = 0; i <= 40; i++) { const c = mix(fg, to, i / 40), r = minRatio(c, bgs); if (r >= target) return c; if (r > bestR) { best = c; bestR = r; } }
    return best;
  }
  // Blend a colour toward the background as far as it goes while keeping `target` on every background.
  function soften(fg, bgs, target) {
    const toward = avg(bgs);
    let best = fg;
    for (let t = .02; t < .95; t += .02) { const c = mix(fg, toward, t); if (minRatio(c, bgs) >= target) best = c; else break; }
    return best;
  }
  const inkFor = bgs => (minRatio('#000000', bgs) > minRatio('#ffffff', bgs) ? '#000000' : '#ffffff');
  const gradient = (stops, dir) => (stops.length < 2 ? stops[0]
    : dir === 'glow' ? `radial-gradient(ellipse 90% 75% at 50% 0%,${stops.slice(1).join(',')},${stops[0]} 100%)`
      : `linear-gradient(${({ down: '180deg', diag: '135deg', across: '90deg' })[dir] || '180deg'},${stops.join(',')})`);

  // A theme's own background: a picture or GIF, or a video (played muted unless the theme turns sound on).
  const MEDIA = /^data:(?:image\/(?:png|jpeg|webp|gif)|video\/(?:mp4|webm));base64,[A-Za-z0-9+/]+=*$/;
  const LIMITS = { picture: 8 * 1024 * 1024, video: 20 * 1024 * 1024 };
  const imageOk = url => typeof url === 'string' && MEDIA.test(url);
  const isVideo = url => imageOk(url) && url.startsWith('data:video/');

  // A data: URL's bytes as a Blob, filled in a plain loop (Uint8Array.from with a callback takes seconds on a
  // 20 MB video).
  function blobOf(url) {
    const at = url.indexOf(','), text = atob(url.slice(at + 1)), bytes = new Uint8Array(text.length);
    for (let i = 0; i < text.length; i++) bytes[i] = text.charCodeAt(i);
    return new Blob([bytes], { type: url.slice(5, url.indexOf(';')) });
  }
  // Firefox does not let a content script's page parts load a blob: URL the content script made on rhythia.com
  // ("may not load data from blob:https://www.rhythia.com/…"), so there theme media stay data: URLs, which Firefox
  // draws at any size. Chrome and extension pages use blob: URLs.
  const BLOBS = typeof globalThis.URL?.createObjectURL === 'function'
    && !(/^moz-extension:/.test(globalThis.chrome?.runtime?.getURL?.('') || '') && globalThis.location?.protocol !== 'moz-extension:');
  // A URL the page can load for a data: URL (a blob: URL where blobs load), and freeing it again.
  const mediaUrl = media => (BLOBS ? URL.createObjectURL(blobOf(media)) : media);
  const freeUrl = url => { if (String(url).startsWith('blob:')) URL.revokeObjectURL(url); };
  // Chrome draws no CSS url() longer than 2 MB, which most GIFs (and some pictures) are as data: URLs, so CSS is
  // given a blob: URL of the same bytes. A holder keeps the URL of the last data: URL it was given and frees the
  // one before; '' frees it. Where blob: URLs do not load (Firefox, tests) the data: URL is given back.
  function blobHolder() {
    let from = '', url = '';
    return media => {
      media = media || '';
      if (media === from) return url;
      freeUrl(url);
      from = media;
      url = media ? mediaUrl(media) : '';
      return url;
    };
  }

  // The layer a background picture or video is drawn in (position:fixed), for a frame { fit, zoom, x, y, rot,
  // flip } and a blur in px: centred, large enough that it still covers the screen when turned (--own-ar is the
  // screen's height / width, set on the layer or above it), and a little larger when blurred so the edges stay
  // sharp. Sizes are shares of the screen, so Exodus' smaller page view in its editor keeps them right.
  function placeLayer(f, b = 0) {
    const a = f.rot * Math.PI / 180, c = +Math.abs(Math.cos(a)).toFixed(4), s = +Math.abs(Math.sin(a)).toFixed(4);
    const k = f.fit === 'tile' ? 1 / f.zoom : 1, n = x => +(x * k).toFixed(4), pad = b ? ` + ${b * 4}px` : '';
    const w = s ? `calc(100% * ${n(c)} + 100% * var(--own-ar, .5625) * ${n(s)}${pad})` : `calc(100% * ${n(1)}${pad})`;
    const h = s ? `calc(100% * ${n(c)} + 100% / var(--own-ar, .5625) * ${n(s)}${pad})` : `calc(100% * ${n(1)}${pad})`;
    // Turned and mirrored around the middle; resized around the point (x, y) in the layer's own directions.
    const t = ['translate(-50%,-50%)'];
    if (f.rot) t.push(`rotate(${f.rot}deg)`);
    if (f.flip) t.push('scaleX(-1)');
    if (f.zoom !== 1) t.push(f.fit === 'tile' ? `scale(${f.zoom})` : `translate(${f.x - 50}%,${f.y - 50}%) scale(${f.zoom}) translate(${50 - f.x}%,${50 - f.y}%)`);
    return `position:fixed;left:50%;top:50%;width:${w};height:${h};transform:${t.join(' ')}`;
  }

  // ─── A picture's colours ───
  // From a small copy of a picture (a video's first frame): its average colour, the average of its lightest and
  // of its darkest quarter, and its most vivid colour (null for a grey picture). Rejects when it cannot be drawn.
  async function pictureColours(url) {
    const video = isVideo(url), src = mediaUrl(url);
    try {
      const el = video ? Object.assign(document.createElement('video'), { muted: true, preload: 'auto' }) : new Image();
      await new Promise((resolve, reject) => { el[video ? 'onloadeddata' : 'onload'] = resolve; el.onerror = () => reject(new Error('read')); el.src = src; });
      const N = 48, c = Object.assign(document.createElement('canvas'), { width: N, height: N }), g = c.getContext('2d', { willReadFrequently: true });
      g.drawImage(el, 0, 0, N, N);
      const px = g.getImageData(0, 0, N, N).data, all = [], hues = Array.from({ length: 12 }, () => [0, 0, 0, 0]);
      for (let i = 0; i < px.length; i += 4) {
        if (px[i + 3] < 128) continue;
        const r = px[i], gr = px[i + 1], b = px[i + 2];
        all.push([.2126 * r + .7152 * gr + .0722 * b, r, gr, b]);
        const mx = Math.max(r, gr, b), mn = Math.min(r, gr, b), sat = mx ? (mx - mn) / mx : 0;
        if (sat > .35 && mx > 90) {
          const hue = mx === mn ? 0 : mx === r ? ((gr - b) / (mx - mn) + 6) % 6 : mx === gr ? (b - r) / (mx - mn) + 2 : (r - gr) / (mx - mn) + 4;
          const k = hues[Math.floor(hue * 2) % 12], w = sat * mx / 255;
          k[0] += r * w; k[1] += gr * w; k[2] += b * w; k[3] += w;
        }
      }
      if (!all.length) throw new Error('read');
      all.sort((p, q) => p[0] - q[0]);
      const toHex = (r, gr, b) => '#' + [r, gr, b].map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
      const mean = list => toHex(...[1, 2, 3].map(j => list.reduce((s, p) => s + p[j], 0) / list.length));
      const q = Math.max(1, Math.floor(all.length / 4)), top = hues.reduce((m, k) => (k[3] > m[3] ? k : m));
      return { avg: mean(all), dark: mean(all.slice(0, q)), light: mean(all.slice(-q)), vivid: top[3] > 1 ? toHex(top[0] / top[3], top[1] / top[3], top[2] / top[3]) : null };
    } finally {
      freeUrl(src);
    }
  }

  // ─── Reading a file picked in a theme editor ───
  // GIFs and videos are kept as they are, up to a size; other pictures become JPEG, longest side 2400px.
  // Throws Error('video-size' | 'gif-size' | 'type' | 'read'); each editor tells the player what went wrong.
  const asDataUrl = file => new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error('read'));
    r.readAsDataURL(file);
  });
  async function readMedia(file) {
    const video = /^video\/(mp4|webm)$/.test(file.type);
    if (video || file.type === 'image/gif') {
      if (file.size > LIMITS[video ? 'video' : 'picture']) throw new Error(video ? 'video-size' : 'gif-size');
      const url = await asDataUrl(file);
      if (!imageOk(url)) throw new Error('type');
      return { url, video };
    }
    if (!/^image\/(png|jpeg|webp)$/.test(file.type)) throw new Error('type');
    const src = BLOBS ? URL.createObjectURL(file) : await asDataUrl(file);
    try {
      const img = await new Promise((resolve, reject) => { const i = new Image(); i.onload = () => resolve(i); i.onerror = () => reject(new Error('read')); i.src = src; });
      const k = Math.min(1, 2400 / Math.max(img.naturalWidth, img.naturalHeight)), c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(img.naturalWidth * k)); c.height = Math.max(1, Math.round(img.naturalHeight * k));
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      let q = .86, out = c.toDataURL('image/jpeg', q);
      while (out.length > 3.5e6 && q > .5) { q -= .1; out = c.toDataURL('image/jpeg', q); }
      return { url: out, video: false };
    } finally { freeUrl(src); }
  }

  return { hex, parseColour, rgbs, lum, mix, ratio, minRatio, avg, reach, soften, inkFor, gradient, DIRS, LIMITS, imageOk, isVideo, blobOf, mediaUrl, freeUrl, blobHolder, placeLayer, pictureColours, readMedia };
})();

if (typeof module !== 'undefined') module.exports = RhythiaX.Colour;
