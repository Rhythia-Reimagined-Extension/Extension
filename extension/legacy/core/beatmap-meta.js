// =============================================
// Reimagined for Rhythia — Beatmap details cache
// =============================================
// A map's art, title, length and mapper by its hash or id: a bounded cache in memory, a copy in
// Rhythia's site storage with a daily sweep, and one throttled request per map to Rhythia's API.

var RhythiaX = RhythiaX || {};

// ─── Beatmap Metadata Cache & Async Resolver ────────
const BEATMAP_MEMORY_CACHE_MAX_ENTRIES = 512;

// Keep Map callers compatible, including direct writes, while bounding long SPA
// sessions. Hash/id aliases count as separate keys; persistent metadata remains
// available if an alias is evicted from memory.
class BeatmapMemoryCache extends Map {
  get(key) {
    const value = super.get(key);
    if (super.has(key)) {
      super.delete(key);
      super.set(key, value);
    }
    return value;
  }

  set(key, value) {
    super.delete(key);
    super.set(key, value);
    while (this.size > BEATMAP_MEMORY_CACHE_MAX_ENTRIES) {
      super.delete(this.keys().next().value);
    }
    return this;
  }
}

RhythiaX.beatmapMetaCache = new BeatmapMemoryCache(RhythiaX.beatmapMetaCache);
// Map key -> the request running for it: { key, promise, controller, waiting, held }.
RhythiaX.beatmapInFlight = RhythiaX.beatmapInFlight || new Map();

// Rate-limiting for network beatmap metadata requests (max 8 req/s -> 125ms interval).
// Requests wait in one queue; one whose callers all left is skipped without using a turn,
// so the art of the page on screen is not held up by pages already left.
let lastBeatmapFetchTime = 0;
const BEATMAP_NETWORK_FETCH_INTERVAL_MS = 125;
const beatmapFetchQueue = [];
let beatmapFetchTimer = null;

function throttleBeatmapFetch(signal) {
  return new Promise(resolve => {
    beatmapFetchQueue.push({ resolve, signal });
    pumpBeatmapFetches();
  });
}

function dropAbortedBeatmapFetches() {
  while (beatmapFetchQueue.length && beatmapFetchQueue[0].signal?.aborted) beatmapFetchQueue.shift().resolve(false);
}

function pumpBeatmapFetches() {
  if (beatmapFetchTimer) return;
  dropAbortedBeatmapFetches();
  if (!beatmapFetchQueue.length) return;
  const release = () => {
    beatmapFetchTimer = null;
    syncBeatmapPage();
    dropAbortedBeatmapFetches();
    if (!beatmapFetchQueue.length) return;
    lastBeatmapFetchTime = Date.now();
    beatmapFetchQueue.shift().resolve(true);
    pumpBeatmapFetches();
  };
  const delay = lastBeatmapFetchTime + BEATMAP_NETWORK_FETCH_INTERVAL_MS - Date.now();
  if (delay > 0) beatmapFetchTimer = setTimeout(release, Math.min(delay, BEATMAP_NETWORK_FETCH_INTERVAL_MS));
  else release();
}

// The signal map art asked for by the page on screen passes to resolveBeatmapMeta. It aborts
// once another page is open (RhythiaX.navigationToken changed): right away when the navigation
// handler calls this (bootstrap/lifecycle.js), else at that page's first art request or at the
// next turn of the queue above.
let beatmapPage = null;
RhythiaX.beatmapPageSignal = function () {
  if (typeof AbortController !== 'function') return undefined;
  syncBeatmapPage();
  if (!beatmapPage) beatmapPage = { token: RhythiaX.navigationToken, controller: new AbortController() };
  return beatmapPage.controller.signal;
};

function syncBeatmapPage() {
  if (!beatmapPage || beatmapPage.token === RhythiaX.navigationToken) return;
  beatmapPage.controller.abort();
  beatmapPage = null;
}

// Rhythia answering without the map is remembered for a day. A failed request
// (offline, 429, 5xx, unreadable reply) is kept in this tab only, for a few
// minutes, so one bad moment never hides a map's art for good. Found maps are
// kept for 30 days, as in Exodus. A found map without a time (saved before
// entries had one, or written straight into beatmapMetaCache) stays valid; the
// daily sweep gives a stored one the sweep's time, so it expires 30 days later.
const BEATMAP_NOT_FOUND_TTL_MS = 24 * 60 * 60 * 1000;
const BEATMAP_FAILURE_RETRY_MS = 5 * 60 * 1000;
const BEATMAP_META_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function isExpiredBeatmapEntry(meta) {
  if (meta && !meta.notFound && meta.cachedAt === undefined) return false;
  const age = Date.now() - Number(meta?.cachedAt);
  if (!Number.isFinite(age)) return true;
  if (!meta.notFound) return age > BEATMAP_META_TTL_MS;
  return age > (meta.transient ? BEATMAP_FAILURE_RETRY_MS : BEATMAP_NOT_FOUND_TTL_MS);
}

// Map details live in Rhythia's own site storage, which Rhythia also needs for its sign-in.
// Each map has up to three keys (hash, id and song id), so the synchronous mapper lookups
// (getStoredBeatmapMeta) find it by any of them. Once a day, a few seconds after the first
// art request of a tab, expired keys go and only the newest BEATMAP_STORAGE_MAX_KEYS stay.
const BEATMAP_STORAGE_PREFIX = 'rhythiax_beatmap_';
const BEATMAP_STORAGE_MAX_KEYS = 1500;
const BEATMAP_SWEEP_KEY = 'rhythiax_beatmaps_swept_at';
const BEATMAP_SWEEP_INTERVAL_MS = 24 * 60 * 60 * 1000;
let beatmapSweepScheduled = false;

function sweepStoredBeatmaps() {
  try {
    if (typeof localStorage === 'undefined' || typeof localStorage.key !== 'function') return;
    const lastSweep = Number(localStorage.getItem(BEATMAP_SWEEP_KEY) || 0);
    const sinceSweep = Date.now() - lastSweep;
    if (sinceSweep >= 0 && sinceSweep < BEATMAP_SWEEP_INTERVAL_MS) return;
    localStorage.setItem(BEATMAP_SWEEP_KEY, String(Date.now()));
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(BEATMAP_STORAGE_PREFIX)) keys.push(key);
    }
    const keep = [];
    keys.forEach(key => {
      let meta = null;
      try { meta = JSON.parse(localStorage.getItem(key)); } catch (_) {}
      if (!meta || typeof meta !== 'object' || isExpiredBeatmapEntry(meta)) {
        localStorage.removeItem(key);
        return;
      }
      if (meta.cachedAt === undefined) {
        meta.cachedAt = Date.now();
        try { localStorage.setItem(key, JSON.stringify(meta)); } catch (_) {}
      }
      keep.push([Number(meta.cachedAt), key]);
    });
    keep.sort((a, b) => b[0] - a[0]).slice(BEATMAP_STORAGE_MAX_KEYS)
      .forEach(([, key]) => localStorage.removeItem(key));
  } catch (_) {}
}

function scheduleBeatmapSweep() {
  if (beatmapSweepScheduled || typeof setTimeout !== 'function') return;
  beatmapSweepScheduled = true;
  setTimeout(sweepStoredBeatmaps, 3000);
}

function rememberBeatmapFailure(str) {
  const previous = RhythiaX.beatmapMetaCache.get(str);
  if (previous && !previous.notFound) return previous;
  const failedMeta = { id: null, previewUrl: null, notFound: true, transient: true, cachedAt: Date.now() };
  RhythiaX.beatmapMetaCache.set(str, failedMeta);
  return failedMeta;
}

function cacheNotFoundBeatmap(str, id = null) {
  const notFoundMeta = { id, previewUrl: null, notFound: true, cachedAt: Date.now() };
  RhythiaX.beatmapMetaCache.set(str, notFoundMeta);
  if (id && String(id) !== str) {
    RhythiaX.beatmapMetaCache.set(String(id), notFoundMeta);
  }
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('rhythiax_beatmap_' + str, JSON.stringify(notFoundMeta));
      if (id && String(id) !== str) {
        localStorage.setItem('rhythiax_beatmap_' + String(id), JSON.stringify(notFoundMeta));
      }
    }
  } catch (_) {}
  return notFoundMeta;
}

RhythiaX.getStoredBeatmapMeta = function (mapHashOrId) {
  if (!mapHashOrId) return null;
  const str = String(mapHashOrId).trim();
  if (RhythiaX.beatmapMetaCache.has(str)) {
    const cached = RhythiaX.beatmapMetaCache.get(str);
    if (!isExpiredBeatmapEntry(cached)) return cached;
    RhythiaX.beatmapMetaCache.delete(str);
  }
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(BEATMAP_STORAGE_PREFIX + str) : null;
    if (raw) {
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object' || isExpiredBeatmapEntry(parsed)) {
        localStorage.removeItem(BEATMAP_STORAGE_PREFIX + str);
        return null;
      }
      RhythiaX.beatmapMetaCache.set(str, parsed);
      return parsed;
    }
  } catch (err) {
    console.warn(`could not load background art due to: [could not access localStorage: ${err?.message || err}] (${str})`);
  }
  return null;
};

// resolveBeatmapMeta(mapHashOrId, { signal }): with a signal, that caller stops waiting when
// it aborts and gets null. Callers asking for the same map share one request, which is
// cancelled only once every caller has left (a caller without a signal always stays). A
// cancelled request saves nothing, so leaving a page never marks a map as missing.
RhythiaX.resolveBeatmapMeta = async function (mapHashOrId, options = {}) {
  if (!mapHashOrId) return null;
  const str = String(mapHashOrId).trim();
  const signal = options?.signal;

  // Return immediately if fully cached (either notFound or valid meta with ownerUsername resolved)
  const stored = RhythiaX.getStoredBeatmapMeta(str);
  if (stored) {
    if (stored.notFound) return stored;
    if (stored.ownerUsername !== undefined && (stored.previewUrl !== undefined || stored.id)) return stored;
  }
  if (signal?.aborted) return null;
  scheduleBeatmapSweep();

  // Deduplicate in-flight requests for the same hash/id
  let request = RhythiaX.beatmapInFlight.get(str);
  if (!request || request.controller?.signal.aborted) request = startBeatmapRequest(str);
  return waitForBeatmapRequest(request, signal);
};

function waitForBeatmapRequest(request, signal) {
  if (!signal) {
    request.held = true;
    return request.promise;
  }
  request.waiting++;
  return new Promise(resolve => {
    let done = false;
    const finish = value => {
      if (done) return;
      done = true;
      request.waiting--;
      signal.removeEventListener('abort', leave);
      resolve(value);
    };
    const leave = () => {
      finish(null);
      if (!request.held && request.waiting === 0) cancelBeatmapRequest(request);
    };
    signal.addEventListener('abort', leave, { once: true });
    request.promise.then(finish, () => finish(null));
  });
}

function cancelBeatmapRequest(request) {
  if (RhythiaX.beatmapInFlight.get(request.key) === request) RhythiaX.beatmapInFlight.delete(request.key);
  request.controller?.abort();
}

function startBeatmapRequest(str) {
  const controller = typeof AbortController === 'function' ? new AbortController() : null;
  const cancelled = () => Boolean(controller?.signal.aborted);
  const request = { key: str, promise: null, controller, waiting: 0, held: false };
  request.promise = (async () => {
    try {
      const isNum = /^\d+$/.test(str);
      const endpoint = isNum
        ? 'https://production.rhythia.com/api/getBeatmapPage'
        : 'https://production.rhythia.com/api/getBeatmapPageById';
      const body = isNum ? { id: Number(str), session: '' } : { mapId: str, session: '' };

      await throttleBeatmapFetch(controller?.signal);
      if (cancelled()) return null;

      let res;
      try {
        res = await (RhythiaX.Net?.fetch || fetch)(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
          body: JSON.stringify(body),
          ...(controller ? { signal: controller.signal } : {}),
        });
      } catch (networkErr) {
        if (cancelled()) return null;
        console.warn(`could not load background art due to: [could not connect with Rhythia: ${networkErr?.message || networkErr}] (${str})`);
        return rememberBeatmapFailure(str);
      }

      if (!res.ok) {
        console.warn(`could not load background art due to: [could connect with Rhythia, but server returned HTTP status ${res.status}] (${str})`);
        return rememberBeatmapFailure(str);
      }

      let data;
      try {
        data = await res.json();
      } catch (parseErr) {
        if (cancelled()) return null;
        console.warn(`could not load background art due to: [could connect with Rhythia, but could not parse response JSON] (${str})`);
        return rememberBeatmapFailure(str);
      }

      const b = data?.beatmap;
      if (!b) {
        console.warn(`could not load background art due to: [could connect with Rhythia, but beatmap not found on server] (${str})`);
        return cacheNotFoundBeatmap(str);
      }

      const id = b.id != null ? Number(b.id) : (isNum ? Number(str) : null);
      const previewUrl = b.previewImage?.medium
        || b.previewImage?.small
        || b.previewImage?.large
        || b.image
        || null;

      const meta = {
        id,
        previewUrl,
        title: b.title || null,
        lengthMs: Number(b.length) || null,
        ownerUsername: b.ownerUsername || null,
        cachedAt: Date.now(),
      };
      RhythiaX.beatmapMetaCache.set(str, meta);
      if (id && String(id) !== str) {
        RhythiaX.beatmapMetaCache.set(String(id), meta);
      }
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(BEATMAP_STORAGE_PREFIX + str, JSON.stringify(meta));
          if (id && String(id) !== str) {
            localStorage.setItem(BEATMAP_STORAGE_PREFIX + String(id), JSON.stringify(meta));
          }
        }
      } catch (saveErr) {
        console.warn(`could not cache background art due to: [could not access or write to localStorage: ${saveErr?.message || saveErr}] (${str})`);
      }

      const returnedSongId = b.songId || data?.scores?.[0]?.songId || null;
      if (returnedSongId && String(returnedSongId) !== str) {
        RhythiaX.beatmapMetaCache.set(String(returnedSongId), meta);
        try {
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem(BEATMAP_STORAGE_PREFIX + String(returnedSongId), JSON.stringify(meta));
          }
        } catch (_) {}
      }
      return meta;
    } catch (err) {
      if (cancelled()) return null;
      console.warn(`could not load background art due to: [unexpected error: ${err?.message || err}] (${str})`);
      return rememberBeatmapFailure(str);
    } finally {
      if (RhythiaX.beatmapInFlight.get(str) === request) RhythiaX.beatmapInFlight.delete(str);
    }
  })();

  RhythiaX.beatmapInFlight.set(str, request);
  return request;
}
