// =============================================
// Reimagined for Rhythia — request limits
// =============================================
// Every request the extension sends to Rhythia's API or to the Reimagined VPS goes through
// RhythiaX.Net.fetch, from every open tab together:
//   Rhythia's API          16 a second, at most 8 at once (so a busy second stays near 24, not 32);
//   VPS API                100 a minute, 40 at once (the gateway allows 120 a minute, burst 60);
//   VPS bulk history       16 a minute, 4 at once (gateway: 20 a minute, burst 5);
//   VPS telemetry          25 a minute, 10 at once (gateway: 30 a minute, burst 20).
// Tabs share one budget through a Web Lock and a small record in the site's localStorage.
// A refusal (429) pauses that budget for a while (the gateway asks for a minute). Loaded first by both
// Exodus and the 1.2.x scripts, so it is defined only once.

var RhythiaX = RhythiaX || {};

RhythiaX.Net = RhythiaX.Net || (function () {
  'use strict';

  const BUCKETS = {
    rhythia: { rate: 16, cap: 8 },
    vps: { rate: 100 / 60, cap: 40 },
    bulk: { rate: 16 / 60, cap: 4 },
    telemetry: { rate: 25 / 60, cap: 10 },
  };
  const PAUSE = { rhythia: 2000, vps: 30000, bulk: 60000, telemetry: 60000 };
  const KEY = 'rhythiax_net_';
  const mem = {};

  const bucketOf = url => {
    if (/^https:\/\/production\.rhythia\.com\/api\//.test(url)) return 'rhythia';
    if (/^https:\/\/rhythia\.shuriel\.com\/api\/telemetry\//.test(url)) return 'telemetry';
    if (/^https:\/\/rhythia\.shuriel\.com\/api\/players\/history$/.test(url)) return 'bulk';
    if (/^https:\/\/rhythia\.shuriel\.com\/api\//.test(url)) return 'vps';
    return '';
  };

  function read(name) {
    try { const st = JSON.parse(localStorage.getItem(KEY + name) || 'null'); if (st && typeof st.t === 'number') return st; } catch (_) {}
    return mem[name] || null;
  }
  function write(name, st) {
    mem[name] = st;
    try { localStorage.setItem(KEY + name, JSON.stringify(st)); } catch (_) {}
  }

  // Takes one request from the budget, or says how many milliseconds until there is one.
  function take(name) {
    const b = BUCKETS[name], now = Date.now(), st = read(name);
    const t = st ? Math.min(b.cap, st.t + Math.max(0, now - st.at) / 1000 * b.rate) : b.cap;
    if (t < 1) return Math.ceil((1 - t) / b.rate * 1000);
    write(name, { t: t - 1, at: now });
    return 0;
  }
  // After a refusal: nothing more goes out for this long.
  function pause(name, ms) {
    write(name, { t: 1 - BUCKETS[name].rate * ms / 1000, at: Date.now() });
  }

  const locked = (name, fn) => (navigator.locks?.request ? navigator.locks.request(KEY + name, fn) : Promise.resolve(fn()));
  const aborted = signal => signal?.reason || new DOMException('The request was aborted.', 'AbortError');
  const sleep = (ms, signal) => new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(aborted(signal));
    const t = setTimeout(() => { signal?.removeEventListener('abort', stop); resolve(); }, ms);
    const stop = () => { clearTimeout(t); reject(aborted(signal)); };
    signal?.addEventListener('abort', stop, { once: true });
  });

  async function turn(name, signal) {
    for (;;) {
      if (signal?.aborted) throw aborted(signal);
      const wait = await locked(name, () => take(name)).catch(() => take(name));
      if (!wait) return;
      await sleep(Math.min(wait, 2000), signal);
    }
  }

  async function limitedFetch(url, opts = {}) {
    const name = bucketOf(String(url));
    if (!name) return fetch(url, opts);
    await turn(name, opts.signal);
    // The gateway counts a bulk request against the general API limit too.
    if (name === 'bulk') await turn('vps', opts.signal);
    let res;
    try {
      res = await fetch(url, opts);
    } catch (err) {
      // The VPS's refusal comes without CORS headers and fails like a network error.
      if (name !== 'rhythia' && err?.name !== 'AbortError') pause(name, PAUSE[name]);
      throw err;
    }
    if (res.status === 429) pause(name, PAUSE[name]);
    return res;
  }

  return { fetch: limitedFetch, bucketOf };
})();
