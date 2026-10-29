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
// A refusal (429), or a busy answer (503) to a profile visit report, pauses that budget for as long as the
// server asks (Retry-After, at most six hours), or a while when it does not say. Player history goes through
// the background (background/vps-access.js), which adds this installation's key; the page never sees it, and
// without the background it is not sent. Map types (maps/kinds) and the map search (maps/types, maps/search) go
// the same way, in the VPS API budget.
// A caller that would rather fail than wait passes maxWait (ms): when the budget's wait or the answer would
// take longer, the request fails with an Error named MaxWaitError (retryAt: when the budget has a request
// again, when known), and a budget wait that long sends nothing. Loaded first by both Exodus and
// Classic, so it is defined only once.

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
  const MAX_PAUSE = 6 * 3600 * 1000;
  const HISTORY = /^https:\/\/rhythia\.shuriel\.com\/api\/(player\/\d{1,7}\/(history|compare\?mode=(lock|spin|vr))|players\/history|maps\/(kinds|types|search))$/;
  const KEY = 'rhythiax_net_';
  const mem = {};
  // History failures that mean the history server could not be reached (the background says so).
  const unreachable = new WeakSet();

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

  // The caller's maxWait ran out. retryAt (ms since the epoch) is set when the budget said when it has a
  // request again.
  function tooLong(retryAt) {
    const err = new Error('The request would take longer than maxWait.');
    err.name = 'MaxWaitError';
    if (retryAt) err.retryAt = retryAt;
    return err;
  }

  // Waits for this budget's next request. A wait that would end after the deadline fails at once, before
  // anything is sent. A long wait (a pause) is slept in one go rather than polled; MAX_PAUSE caps it, so a
  // damaged record cannot ask for a timer longer than setTimeout holds.
  async function turn(name, signal, deadline = Infinity) {
    for (;;) {
      if (signal?.aborted) throw aborted(signal);
      const wait = await locked(name, () => take(name)).catch(() => take(name));
      if (!wait) return;
      const ms = Math.min(wait, MAX_PAUSE);
      if (Date.now() + ms > deadline) throw tooLong(Date.now() + ms);
      await sleep(ms, signal);
    }
  }

  // A history request carried by the background, answered as a normal Response. An aborted
  // request is let go here; its answer, when it comes, is dropped. A reply without a status fails like
  // fetch (TypeError); only one saying the history server could not be reached counts as a network failure.
  function viaBackground(url, opts) {
    const method = String(opts.method || 'GET').toUpperCase();
    const ask = new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ type: 'rhythiax-vps-history', url, method, body: typeof opts.body === 'string' ? opts.body : undefined }, reply => {
        const lost = chrome.runtime.lastError;
        if (lost || !reply || reply.error || !reply.status) {
          const err = new TypeError('Failed to fetch');
          if (!lost && reply?.network === true) unreachable.add(err);
          return reject(err);
        }
        const headers = { 'Content-Type': 'application/json' };
        if (reply.retryAfter) headers['Retry-After'] = reply.retryAfter;
        resolve(new Response(reply.status === 204 || reply.status === 304 ? null : reply.body, { status: reply.status, headers }));
      });
    });
    const signal = opts.signal;
    if (!signal) return ask;
    if (signal.aborted) return Promise.reject(aborted(signal));
    return new Promise((resolve, reject) => {
      const stop = () => reject(aborted(signal));
      signal.addEventListener('abort', stop, { once: true });
      ask.then(resolve, reject).finally(() => signal.removeEventListener('abort', stop));
    });
  }
  const background = () => typeof chrome !== 'undefined' && typeof chrome.runtime?.sendMessage === 'function' && Boolean(chrome.runtime.id);
  const retryAfterMs = res => {
    const s = Number(res.headers?.get?.('Retry-After'));
    return Number.isFinite(s) && s > 0 ? Math.min(MAX_PAUSE, s * 1000) : 0;
  };

  async function limited(url, opts, deadline) {
    const name = bucketOf(String(url));
    if (!name) return fetch(url, opts);
    // History goes only through the background, which checks the player's choice for each request and adds
    // the key. A script the extension has left (reloaded or updated under it) cannot reach it, so the request
    // is not sent at all, and pauses nothing. Checked before and after the wait.
    const carried = HISTORY.test(String(url));
    if (carried && !background()) throw new TypeError('Failed to fetch');
    await turn(name, opts.signal, deadline);
    // The gateway counts a bulk request against the general API limit too.
    if (name === 'bulk') await turn('vps', opts.signal, deadline);
    if (carried && !background()) throw new TypeError('Failed to fetch');
    let res;
    try {
      res = await (carried ? viaBackground(String(url), opts) : fetch(url, opts));
    } catch (err) {
      // Refusals arrive as a status (the gateway's 429 carries CORS headers, and history comes back from the
      // background with the server's status), so what fails here is a server that could not be reached, the
      // caller's deadline, a script the extension has left, a refusal by the background, a Cloudflare error
      // page or a refused preflight. Such a failure pauses a VPS budget, except an abort or the deadline.
      // History pauses only when the background says the server could not be reached; its other failures
      // (refused there, for example just after the player's choice changed, or no reply at all) pause nothing.
      if (name !== 'rhythia' && err?.name !== 'AbortError' && err?.name !== 'MaxWaitError'
        && (!carried || unreachable.has(err))) pause(name, PAUSE[name]);
      throw err;
    }
    // The report server answers 503 while it is busy: reports then wait as after a refusal; history does not.
    if (res.status === 429 || (name === 'telemetry' && res.status === 503)) pause(name, retryAfterMs(res) || PAUSE[name]);
    return res;
  }

  async function limitedFetch(url, opts = {}) {
    const limit = opts.maxWait == null ? NaN : Number(opts.maxWait);
    if (!Number.isFinite(limit) || limit < 0) return limited(url, opts);
    // maxWait: the caller would rather fail than wait longer than this (ms) for its answer, the budget's
    // wait included. A request already sent is let go like an aborted one; its answer is dropped.
    const outer = opts.signal;
    if (outer?.aborted) throw aborted(outer);
    const rest = { ...opts };
    delete rest.maxWait;
    const ctl = new AbortController();
    const onAbort = () => ctl.abort(aborted(outer));
    outer?.addEventListener('abort', onAbort, { once: true });
    const timer = setTimeout(() => ctl.abort(tooLong()), Math.min(limit, 2147483647));
    try {
      return await limited(url, { ...rest, signal: ctl.signal }, Date.now() + limit);
    } catch (err) {
      // fetch may reject with a plain AbortError; the caller is told it was the deadline.
      throw ctl.signal.aborted && ctl.signal.reason?.name === 'MaxWaitError' ? ctl.signal.reason : err;
    } finally {
      clearTimeout(timer);
      outer?.removeEventListener('abort', onAbort);
    }
  }

  return { fetch: limitedFetch };
})();
