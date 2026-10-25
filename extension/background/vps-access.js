// =============================================
// Reimagined for Rhythia — history server access key (background only)
// =============================================
// The history server serves full player history to installations with an anonymous key: random
// bytes it signs and hands out on request, with nothing about the player, their game session or
// this browser in it. The key stays in chrome.storage.local and is used only here, in the
// background: history requests from Rhythia's pages come here as messages (shared/net.js), so the
// key never reaches a page or its localStorage. It is asked for only once the player has allowed
// the community history connection, and removed when they turn it off.
// Without a key (none issued yet, or the server refuses one for now) the request still goes out. While
// the server requires keys it then answers with the last 3 days only; until then it answers in full,
// within its limits per address. A request the server has not answered within
// TIMEOUT_MS is given up on, and the tab is told the server could not be reached.

var RhythiaX = RhythiaX || {};

RhythiaX.VpsAccess = RhythiaX.VpsAccess || (function () {
  'use strict';

  const BASE = 'https://rhythia.shuriel.com';
  const KEY_URL = BASE + '/api/access/key';
  const STORE = 'rhythiaxVpsAccessKey';
  const HEADER = 'X-Reimagined-Key';
  // The only requests carried: one player's history, or a page of players.
  const ROUTES = [/^https:\/\/rhythia\.shuriel\.com\/api\/player\/\d{1,7}\/history$/, /^https:\/\/rhythia\.shuriel\.com\/api\/players\/history$/];
  const MAX_BODY = 2048;
  const KEY_PATTERN = /^rk1\.[A-Za-z0-9_-]{48}$/;
  // After the server refuses a key: wait at least this long before asking again. The time is kept in
  // chrome.storage.session too, because the worker stops when idle and would otherwise ask again on its
  // next wake. Session storage is cleared when the browser closes and, unlike storage.local, is not open
  // to content scripts by default, so tabs neither read nor hear this.
  const MIN_KEY_BACKOFF_MS = 10 * 60 * 1000;
  const BACKOFF_STORE = 'rhythiaxVpsKeyBackoff';
  // A request the history server has not answered (in full) in this long is given up on.
  const TIMEOUT_MS = 10 * 1000;

  let issuing = null;
  let noKeyUntil = 0;
  // Raised by forget(): a key or a request started before the player turned the connection off is dropped.
  let revision = 0;

  // The player's choice (shared/consent.js, imported before this file); without it nothing is allowed.
  async function allowed() {
    const { rhythiaxDataSettings: ds } = await chrome.storage.local.get('rhythiaxDataSettings');
    return RhythiaX.Consent?.historyAllowed(ds) === true;
  }

  const retryAfterMs = res => {
    const s = Number(res.headers.get('Retry-After'));
    return Number.isFinite(s) && s > 0 ? s * 1000 : 0;
  };

  async function storedKey() {
    const { [STORE]: saved } = await chrome.storage.local.get(STORE);
    if (!saved || !KEY_PATTERN.test(saved.key || '')) return null;
    if (Date.parse(saved.expiresAt) <= Date.now()) return null;
    return saved;
  }

  // One request to the history server, its answer read in full within TIMEOUT_MS. A server that does not
  // answer in time is given up on (the promise rejects), so no tab's request is held for ever.
  async function call(url, init, read) {
    const stop = new AbortController();
    const timer = setTimeout(() => stop.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(url, { ...init, signal: stop.signal });
      return { res, data: await read(res) };
    } finally {
      clearTimeout(timer);
    }
  }

  // The key backoff, from memory or, in a worker that has just started, from session storage.
  async function backoffUntil() {
    const round = revision;
    try {
      const { [BACKOFF_STORE]: until } = (await chrome.storage.session?.get(BACKOFF_STORE)) || {};
      if (round === revision && Number.isFinite(until)) noKeyUntil = Math.max(noKeyUntil, until);
    } catch (_) {}
    return noKeyUntil;
  }
  function backOff(ms) {
    noKeyUntil = Date.now() + ms;
    try { Promise.resolve(chrome.storage.session?.set({ [BACKOFF_STORE]: noKeyUntil })).catch(() => {}); } catch (_) {}
  }

  // One request for a new key at a time, from every tab together.
  function newKey() {
    if (Date.now() < noKeyUntil) return Promise.resolve(null);
    return issuing || (issuing = (async () => {
      const round = revision;
      try {
        if (Date.now() < await backoffUntil()) return null;
        const { res, data } = await call(KEY_URL, { method: 'POST', headers: { Accept: 'application/json' }, cache: 'no-store' },
          r => (r.ok ? r.json() : null));
        if (!res.ok) { backOff(Math.max(MIN_KEY_BACKOFF_MS, retryAfterMs(res))); return null; }
        if (!KEY_PATTERN.test(data?.key || '') || !Date.parse(data.expiresAt) || !Date.parse(data.renewAfter)) { backOff(MIN_KEY_BACKOFF_MS); return null; }
        // The player turned the connection off while the key was on its way: it is not kept.
        if (round !== revision) return null;
        const saved = { key: data.key, expiresAt: data.expiresAt, renewAfter: data.renewAfter };
        await chrome.storage.local.set({ [STORE]: saved });
        return saved;
      } catch (_) {
        backOff(MIN_KEY_BACKOFF_MS);
        return null;
      } finally {
        issuing = null;
      }
    })());
  }

  async function currentKey() {
    const saved = await storedKey();
    if (!saved) return (await newKey())?.key || null;
    // Renewed in the background some days before it ends; the current one keeps working meanwhile.
    if (Date.parse(saved.renewAfter) <= Date.now()) newKey();
    return saved.key;
  }

  async function forget() {
    revision++;
    noKeyUntil = 0;
    await chrome.storage.local.remove(STORE);
    try { await chrome.storage.session?.remove(BACKOFF_STORE); } catch (_) {}
  }

  // The answer ({ res, data: its text }), or null when the server could not be reached in time.
  const send = (url, opts, key) => call(url, {
    method: opts.method,
    headers: { Accept: 'application/json', ...(opts.method === 'POST' ? { 'Content-Type': 'application/json' } : {}), ...(key ? { [HEADER]: key } : {}) },
    body: opts.method === 'POST' ? opts.body : undefined,
    cache: 'no-store',
  }, res => res.text()).catch(() => null);

  // A history request from a Rhythia tab: { url, method, body } → { status, body, retryAfter }, or
  // { error } (with network: true when the history server could not be reached).
  async function historyFetch(request) {
    const url = String(request?.url || '');
    const method = request?.method === 'POST' ? 'POST' : 'GET';
    if (!ROUTES.some(re => re.test(url)) || (method === 'POST') !== url.endsWith('/players/history')) return { error: 'not allowed' };
    if (method === 'POST' && (typeof request.body !== 'string' || request.body.length > MAX_BODY)) return { error: 'not allowed' };
    const round = revision;
    if (!(await allowed())) { await forget(); return { error: 'not allowed' }; }
    const opts = { method, body: request.body };
    let key = await currentKey();
    // The player turned the connection off meanwhile (getting a key can take a request): nothing goes out.
    if (round !== revision) return { error: 'not allowed' };
    let answer = await send(url, opts, key);
    // A key the server no longer accepts (expired, or the server's secret changed): one new try.
    if (answer?.res.status === 401 && key) {
      await chrome.storage.local.remove(STORE);
      key = (await newKey())?.key || null;
      if (round !== revision) return { error: 'not allowed' };
      answer = await send(url, opts, key);
    }
    if (!answer) return { error: 'unreachable', network: true };
    return { status: answer.res.status, body: answer.data, retryAfter: answer.res.headers.get('Retry-After') || '' };
  }

  // Turning the community connection off removes the key with it.
  chrome.storage?.onChanged?.addListener((changes, area) => {
    if (area !== 'local' || !changes.rhythiaxDataSettings) return;
    allowed().then(ok => { if (!ok) forget(); }).catch(() => {});
  });

  return { historyFetch };
})();
