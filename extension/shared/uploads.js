// =============================================
// Reimagined for Rhythia — recent background uploads
// =============================================
// The last pictures, GIFs and videos the player uploaded in either look's theme editor, kept so that a new
// upload does not lose the one before: both editors list them and can use one again. A theme keeps its own
// copy of its background (shared/exodus-themes.js, shared/classic-themes.js), so removing an upload from this
// list never changes a theme.
// Saved as chrome.storage.local:
//   rhythiaxUploads         [{ id, name, kind, thumb, sig }], newest first, at most MAX
//   rhythiaxUpload:<id>     the file as a data: URL (shared/colour.js readMedia), under a key of its own so the
//                           list is read and changed without sending the files to every tab
// kind: 'picture' | 'gif' | 'video'; thumb: a small JPEG of the first frame ('' when it could not be drawn);
// sig: the file's length and a hash of it, so the same file uploaded again is kept once.

var RhythiaX = RhythiaX || {};

RhythiaX.Uploads = (function () {
  'use strict';

  const LIST_KEY = 'rhythiaxUploads';
  const FILE_PREFIX = 'rhythiaxUpload:';
  const MAX = 6;
  const THUMB = 160;
  const fileKey = id => FILE_PREFIX + id;
  const area = () => chrome.storage.local;
  const { imageOk, isVideo, mediaUrl, freeUrl } = RhythiaX.Colour;

  const kindOf = media => (isVideo(media) ? 'video' : media.startsWith('data:image/gif') ? 'gif' : 'picture');
  const entryOk = u => Boolean(u) && /^[0-9a-f]{12}$/.test(u.id) && ['picture', 'gif', 'video'].includes(u.kind)
    && typeof u.sig === 'string' && (u.thumb === '' || (typeof u.thumb === 'string' && /^data:image\/jpeg;base64,[A-Za-z0-9+/]+=*$/.test(u.thumb)));
  function list(got) {
    const l = got?.[LIST_KEY];
    return Array.isArray(l) ? l.filter(entryOk).slice(0, MAX).map(u => ({ id: u.id, name: String(u.name || '').slice(0, 80), kind: u.kind, thumb: u.thumb, sig: u.sig })) : [];
  }
  async function read() { return list(await area().get(LIST_KEY)); }

  // The length and an FNV-1a hash of up to 64k evenly spread characters: quick on a 20 MB video.
  function sigOf(media) {
    const step = Math.max(1, Math.floor(media.length / 65536));
    let h = 0x811c9dc5;
    for (let i = 0; i < media.length; i += step) { h ^= media.charCodeAt(i); h = Math.imul(h, 16777619); }
    return `${media.length.toString(36)}.${(h >>> 0).toString(36)}`;
  }
  const newId = () => Array.from(crypto.getRandomValues(new Uint8Array(6)), b => b.toString(16).padStart(2, '0')).join('');

  // The first frame, at most THUMB px on its longer side, as a JPEG; '' when it cannot be drawn within 5 s.
  async function thumbOf(media) {
    const video = isVideo(media);
    let src = '';
    try {
      src = mediaUrl(media);
      const el = video ? Object.assign(document.createElement('video'), { muted: true, preload: 'auto' }) : new Image();
      await Promise.race([
        new Promise((resolve, reject) => { el[video ? 'onloadeddata' : 'onload'] = resolve; el.onerror = reject; el.src = src; }),
        new Promise((_, reject) => setTimeout(reject, 5000)),
      ]);
      const w = video ? el.videoWidth : el.naturalWidth, h = video ? el.videoHeight : el.naturalHeight;
      if (!w || !h) return '';
      const k = Math.min(1, THUMB / Math.max(w, h)), c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(w * k)); c.height = Math.max(1, Math.round(h * k));
      c.getContext('2d').drawImage(el, 0, 0, c.width, c.height);
      return c.toDataURL('image/jpeg', .8);
    } catch (_) {
      return '';
    } finally {
      if (src) freeUrl(src);
    }
  }

  // Keeps a file at the front of the list; the oldest past MAX goes, with its file. The same file again only
  // moves to the front. Returns its entry, or null for something that is not a background file.
  async function add(media, name) {
    if (!imageOk(media)) return null;
    const sig = sigOf(media), all = await read();
    const same = all.find(u => u.sig === sig);
    if (same) {
      if (all[0] !== same) await area().set({ [LIST_KEY]: [same, ...all.filter(u => u !== same)] });
      return same;
    }
    const entry = { id: newId(), name: String(name || '').slice(0, 80), kind: kindOf(media), thumb: await thumbOf(media), sig };
    const next = [entry, ...all];
    await area().set({ [LIST_KEY]: next.slice(0, MAX), [fileKey(entry.id)]: media });
    const gone = next.slice(MAX).map(u => fileKey(u.id));
    if (gone.length) await area().remove(gone);
    return entry;
  }

  // The file of an entry, or null when it is gone.
  async function get(id) {
    const media = (await area().get(fileKey(id)))[fileKey(id)];
    return imageOk(media) ? media : null;
  }

  async function remove(id) {
    await area().set({ [LIST_KEY]: (await read()).filter(u => u.id !== id) });
    await area().remove(fileKey(id));
  }

  return { LIST_KEY, MAX, list, read, add, get, remove, sigOf, fileKey };
})();
