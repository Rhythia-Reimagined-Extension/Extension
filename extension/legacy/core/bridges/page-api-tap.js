// Runs in the page's own world, Classic only (engines.js). Rhythia's page loads the profile and the pinned
// scores of the player on screen itself; their answers are handed to Classic (page-api-bridge.js), so Classic
// does not ask the API for the same thing again. Only these two answers are passed on, never the session.
(function () {
  'use strict';
  if (window.__rhythiaxPageApiTap || typeof window.fetch !== 'function') return;
  window.__rhythiaxPageApiTap = true;

  const API = /^https:\/\/production\.rhythia\.com\/api\/([A-Za-z]+)(?:[?#]|$)/;
  const SHARED = new Set(['getProfile', 'getPinnedScores']);
  const original = window.fetch;
  // While Exodus shows the page (html.rhythiax-exodus) Classic is idle, and this world cannot see Classic's state:
  // the class decides. Then no answer is passed on, but 'forget' still is, so nothing Classic kept from before a
  // write is used once the page is handed back.
  const classicIdle = () => document.documentElement?.classList?.contains('rhythiax-exodus') === true;
  // A string detail crosses from the page into the extension in Firefox as well.
  const dispatch = detail => {
    try { document.dispatchEvent(new CustomEvent('rhythiax-page-api', { detail: JSON.stringify(detail) })); } catch (_) {}
  };
  const send = detail => {
    if (detail.state !== 'forget' && classicIdle()) return;
    dispatch(detail);
  };
  // A request whose 'start' went out always ends, so the bridge keeps no 'start' that Classic would wait on
  // after a hand-back. Should Exodus have taken the page meanwhile, it ends as 'failed', without the answer.
  const end = (key, state, text) => dispatch(classicIdle() ? { ...key, state: 'failed' } : { ...key, state, text });

  window.fetch = function (input, init) {
    const result = original.apply(this, arguments);
    try {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : '';
      const endpoint = url.match(API)?.[1];
      // Anything that is not a read may change what the kept answers say.
      if (endpoint && !endpoint.startsWith('get')) send({ state: 'forget' });
      if (SHARED.has(endpoint) && typeof init?.body === 'string' && !classicIdle()) {
        const body = JSON.parse(init.body);
        const key = { endpoint, id: Number(body.id), signedIn: Boolean(body.session) };
        if (Number.isInteger(key.id) && key.id > 0) {
          send({ ...key, state: 'start' });
          result
            .then(res => (res.ok && !classicIdle() ? res.clone().text() : null))
            .then(text => end(key, typeof text === 'string' ? 'done' : 'failed', text), () => end(key, 'failed'));
        }
      }
    } catch (_) {}
    return result;
  };
})();
