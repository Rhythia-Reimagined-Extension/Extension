// Answers Rhythia's own page received for getProfile and getPinnedScores (page-api-tap.js, in the page's
// world). Classic takes a fresh one instead of sending the same request again; an answer still on its way
// is waited for briefly. On that player's page Classic also gives the page a moment to start its own
// request, since both start loading together. Anything else, or anything older, is fetched as before.
var RhythiaX = RhythiaX || {};

RhythiaX.PageApi = (function () {
  'use strict';

  const FRESH_MS = 15000;
  const WAIT_MS = 2500;
  const MAX = 40;
  const seen = new Map();
  const starts = new Map();
  let forgotAt = 0;
  const keyOf = (endpoint, id, signedIn) => `${endpoint}:${Number(id)}:${signedIn ? 1 : 0}`;

  function forget() {
    forgotAt = Date.now();
    for (const entry of seen.values()) entry.waiters.splice(0).forEach(done => done());
    for (const list of starts.values()) list.splice(0).forEach(done => done());
    seen.clear();
  }

  if (typeof document !== 'undefined' && document.addEventListener) {
    document.addEventListener('rhythiax-page-api', event => {
      let d;
      try { d = JSON.parse(event.detail); } catch (_) { return; }
      if (!d || typeof d !== 'object') return;
      if (d.state === 'forget') { forget(); return; }
      if (typeof d.endpoint !== 'string' || !Number.isInteger(d.id) || !['start', 'done', 'failed'].includes(d.state)) return;
      const key = keyOf(d.endpoint, d.id, d.signedIn);
      const entry = seen.get(key) || { waiters: [] };
      entry.at = Date.now();
      entry.state = d.state;
      entry.text = d.state === 'done' && typeof d.text === 'string' ? d.text : null;
      seen.delete(key);
      seen.set(key, entry);
      if (d.state !== 'start') entry.waiters.splice(0).forEach(done => done());
      else (starts.get(key) || []).splice(0).forEach(done => done());
      while (seen.size > MAX) seen.delete(seen.keys().next().value);
    });
  }

  // Waits up to ms for the page to start this request; only on the player's own page, and not right after
  // a change (a pin), when the page does not ask again.
  function pageStarts(key, id, ms) {
    const onPlayer = typeof location !== 'undefined' && new RegExp(`^/player/${Number(id)}(?:/|$)`).test(location.pathname);
    if (!ms || !onPlayer || Date.now() - forgotAt < FRESH_MS) return Promise.resolve();
    return new Promise(done => {
      const list = starts.get(key) || [];
      starts.set(key, list);
      list.push(done);
      setTimeout(() => { const i = list.indexOf(done); if (i >= 0) list.splice(i, 1); if (!list.length) starts.delete(key); done(); }, ms);
    });
  }

  // The page's parsed answer for this request, or null (then the caller fetches it itself).
  async function take(endpoint, id, signedIn, waitForPageMs = 0) {
    const key = keyOf(endpoint, id, signedIn);
    let entry = seen.get(key);
    if (!entry || Date.now() - entry.at > FRESH_MS) {
      await pageStarts(key, id, waitForPageMs);
      entry = seen.get(key);
    }
    if (!entry || Date.now() - entry.at > FRESH_MS) return null;
    if (entry.state === 'start') await new Promise(done => { entry.waiters.push(done); setTimeout(done, WAIT_MS); });
    if (seen.get(key) !== entry || entry.state !== 'done') return null;
    try { return JSON.parse(entry.text); } catch (_) { return null; }
  }

  return { take, forget };
})();
