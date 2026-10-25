// Cloud history and profile discovery.

var RhythiaX = RhythiaX || {};

(function () {
  const VPS_BASE_URL = 'https://rhythia.shuriel.com';
  // How long a page waits for a history answer.
  const DEFAULT_TIMEOUT_MS = 3500;
  // How long a request whose late answer is kept (options.onLate) may take in all, its wait for the request
  // budget included (shared/net.js maxWait): the background gives each of its requests 10 s, and the first
  // request after online history is chosen also asks for the installation key.
  const LATE_ANSWER_MS = 20 * 1000;
  const WAIT_OVER = Symbol('wait over');
  const LOG_KEY = 'rhythiax_connection_logs';
  const VISIT_COOLDOWN_KEY = 'rhythiax_visit_report_cooldowns';
  // The service takes one visit report per player and address an hour; another one within the hour does nothing.
  const VISIT_COOLDOWN_MS = 60 * 60 * 1000;
  let privacyRevision = 0;
  const historyRequests = new Set();
  const visitRequests = new Set();
  const HISTORY_CLEAR_KEY = 'rhythiax_history_clear_generation';
  RhythiaX.getVpsSyncMode = getSyncMode;
  if (typeof chrome !== 'undefined') chrome.storage?.onChanged?.addListener((changes, area) => {
    if (area !== 'local') return;
    if (changes.rhythiaxDataSettings || changes[HISTORY_CLEAR_KEY]) {
      privacyRevision++;
      historyRequests.forEach(controller => controller.abort());
      visitRequests.forEach(controller => controller.abort());
    }
  });

  /**
   * Append an entry to local diagnostic log (last 30 entries).
   * Schema: { date: string, visited: string, timeToReach: string, status: string }
   */
  function appendDiagnosticLog(entry) {
    if (typeof chrome === 'undefined' || !chrome.storage?.local) return;
    try {
      chrome.storage.local.get({ [LOG_KEY]: [] }, res => {
        const list = Array.isArray(res[LOG_KEY]) ? res[LOG_KEY] : [];
        list.unshift(entry);
        if (list.length > 30) list.length = 30; // Cap at 30 entries
        chrome.storage.local.set({ [LOG_KEY]: list });
      });
    } catch (_) {}
  }

  /**
   * Get configured sync mode ('cloud-only' | 'hybrid' | 'local-only').
   * @returns {Promise<string>}
   */
  async function getSyncMode() {
    if (typeof chrome === 'undefined' || !chrome.storage?.local) return 'local-only';
    try {
      const res = await new Promise(resolve => {
        chrome.storage.local.get(['rhythiaxDataSettings'], result => {
          resolve(chrome.runtime?.lastError ? null : result);
        });
      });
      if (!res) return 'local-only';
      // The consent and a mode that goes online (shared/consent.js); anything else stays on this device.
      const settings = res.rhythiaxDataSettings;
      return RhythiaX.Consent?.historyAllowed?.(settings) === true ? settings.syncMode : 'local-only';
    } catch (_) {
      return 'local-only';
    }
  }

  /**
   * Check explicit telemetry opt-in; an absent choice never sends visits.
   * @returns {Promise<boolean>}
   */
  async function isTelemetryEnabled() {
    if (typeof chrome === 'undefined' || !chrome.storage?.local) return false;
    try {
      const res = await new Promise(resolve => {
        chrome.storage.local.get(['rhythiaxDataSettings'], result => {
          resolve(chrome.runtime?.lastError ? null : result);
        });
      });
      if (!res) return false;
      // The choice lives in the data settings; the update from 1.1 copied the old separate switch there.
      return RhythiaX.Consent?.reportsAllowed?.(res.rhythiaxDataSettings) === true;
    } catch (_) {
      return false;
    }
  }

  /**
   * Fetch a player's daily history from the history service (GET /api/player/:id/history). shared/net.js
   * carries the request through the background, which adds this installation's key when it has one. The
   * answer is { player, history }, marked not to be cached on the way (no-store); 404 means the service has
   * no history for the player. While the service requires keys, a request without one gets only the last
   * three days, marked recentOnly. Each request adds one entry to the connection log.
   * The page waits at most options.timeout. Then the request is let go, or, with options.onLate, it may go on
   * for up to LATE_ANSWER_MS, and an answer that comes in that time is passed to onLate.
   * @param {number|string} playerId
   * @param {Object} [options]
   * @param {AbortSignal} [options.signal]
   * @param {number} [options.timeout]
   * @param {boolean} [options.withStatus] {unavailable: true} instead of null when the service has no history
   * @param {Function} [options.onLate]
   * @returns {Promise<{player: Object, history: Array, recentOnly: boolean}|{unavailable: true}|null>}
   */
  RhythiaX.fetchVpsPlayerHistory = async function (playerId, options = {}) {
    const id = parseInt(playerId, 10);
    if (isNaN(id) || id <= 0) return null;
    const revision = privacyRevision;
    const syncMode = await getSyncMode();
    if (revision !== privacyRevision || options.signal?.aborted) return null;
    const nowStr = new Date().toLocaleString();

    if (syncMode === 'local-only') {
      appendDiagnosticLog({
        timestamp: Date.now(),
        date: nowStr,
        playerId: id,
        username: null,
        visited: `#${id}`,
        latencyMs: 0,
        timeToReach: '0.00s',
        status: 'neutral',
        statusText: 'Local Only'
      });
      return null;
    }

    const timeoutMs = options.timeout || DEFAULT_TIMEOUT_MS;
    const onLate = typeof options.onLate === 'function' ? options.onLate : null;
    const controller = new AbortController();
    historyRequests.add(controller);
    const abortFromParent = () => controller.abort();

    if (options.signal) {
      options.signal.addEventListener('abort', abortFromParent, { once: true });
    }

    const answer = requestHistory(id, controller.signal, { revision, nowStr, withStatus: options.withStatus, maxWait: onLate ? LATE_ANSWER_MS : 0 })
      .finally(() => {
        historyRequests.delete(controller);
        options.signal?.removeEventListener('abort', abortFromParent);
      });
    if (!(timeoutMs > 0)) return answer;
    let timeoutId = null;
    const waitOver = new Promise(resolve => { timeoutId = setTimeout(resolve, timeoutMs, WAIT_OVER); });
    let first;
    try {
      first = await Promise.race([answer, waitOver]);
    } finally {
      clearTimeout(timeoutId);
    }
    if (first !== WAIT_OVER) return first;
    // The page stops waiting here. A caller that keeps late answers gets this one when it comes; otherwise
    // the request is let go.
    if (onLate) answer.then(result => (result && revision === privacyRevision ? onLate(result) : null)).catch(() => {});
    else controller.abort();
    return null;
  };

  // One history request and its entry in the connection log. Resolves to what fetchVpsPlayerHistory returns
  // for it, null for a failure.
  async function requestHistory(id, signal, { revision, nowStr, withStatus, maxWait }) {
    const startTime = performance.now();

    try {
      const url = `${VPS_BASE_URL}/api/player/${id}/history`;
      const response = await (RhythiaX.Net?.fetch || fetch)(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        signal,
        ...(maxWait ? { maxWait } : {})
      });

      const elapsedMs = Math.round(performance.now() - startTime);
      const elapsedSec = (elapsedMs / 1000).toFixed(2) + 's';

      if (revision !== privacyRevision || signal.aborted) return null;
      if (response.status === 404 || response.status === 410) {
        appendDiagnosticLog({
          timestamp: Date.now(),
          date: nowStr,
          playerId: id,
          username: null,
          visited: `#${id}`,
          latencyMs: elapsedMs,
          timeToReach: elapsedSec,
          status: 'warning',
          statusText: 'History unavailable'
        });
        return withStatus ? { unavailable: true } : null;
      }

      if (!response.ok) {
        appendDiagnosticLog({
          timestamp: Date.now(),
          date: nowStr,
          playerId: id,
          username: null,
          visited: `#${id}`,
          latencyMs: elapsedMs,
          timeToReach: elapsedSec,
          status: 'error',
          statusText: `HTTP ${response.status}`
        });
        return null;
      }

      const data = await response.json();
      if (revision !== privacyRevision || signal.aborted) return null;
      if (!data || !Array.isArray(data.history)) return null;

      const playerLabel = data.player?.username 
        ? `${data.player.username} (#${id})`
        : `#${id}`;

      appendDiagnosticLog({
        timestamp: Date.now(),
        date: nowStr,
        playerId: id,
        username: data.player?.username || null,
        visited: playerLabel,
        latencyMs: elapsedMs,
        timeToReach: elapsedSec,
        status: 'ok',
        statusText: '200 OK'
      });

      return {
        player: data.player || null,
        history: data.history,
        recentOnly: data.recentOnly === true
      };
    } catch (err) {
      if (revision !== privacyRevision) return null;
      const isTimeout = err.name === 'AbortError' || err.name === 'MaxWaitError';
      
      appendDiagnosticLog({
        timestamp: Date.now(),
        date: nowStr,
        playerId: id,
        username: null,
        visited: `#${id}`,
        latencyMs: null,
        timeToReach: 'Failed',
        status: 'error',
        statusText: isTimeout ? 'Timeout' : 'Network Offline'
      });

      if (typeof RhythiaX.log === 'function') {
        RhythiaX.log(`VPS history fetch skipped for #${id}:`, isTimeout ? 'timeout' : err.message);
      }
      return null;
    }
  }

  const reportedVisitsThisSession = new Map();
  const pendingVisitReports = new Set();

  // Gives back the hour taken for a report that was turned away, unless a newer report replaced it.
  function releaseVisitCooldown(id, at) {
    if (reportedVisitsThisSession.get(id) === at) reportedVisitsThisSession.delete(id);
    return new Promise(resolve => {
      try {
        chrome.storage.local.get({ [VISIT_COOLDOWN_KEY]: {} }, result => {
          const stored = chrome.runtime?.lastError ? null : result?.[VISIT_COOLDOWN_KEY];
          if (!stored || Number(stored[id]) !== at) return resolve();
          const next = { ...stored };
          delete next[id];
          chrome.storage.local.set({ [VISIT_COOLDOWN_KEY]: next }, () => resolve());
        });
      } catch (_) { resolve(); }
    });
  }

  /**
   * Report a profile visit to VPS for crawler auto-discovery (P1 / P2 queue).
   * Respects opt-out telemetry setting. A player is reported at most once an hour (VISIT_COOLDOWN_MS), kept
   * across reloads and tabs; the hour is given back when the service refused the report, was busy or did
   * not answer.
   * @param {number|string} playerId
   */
  RhythiaX.reportVpsPlayerVisit = async function (playerId) {
    const id = parseInt(playerId, 10);
    if (isNaN(id) || id <= 0) return;
    const revision = privacyRevision;
    const enabled = await isTelemetryEnabled();
    if (!enabled || revision !== privacyRevision) return;

    if (pendingVisitReports.has(id)) return;
    pendingVisitReports.add(id);
    try {
      const now = Date.now();
      const sessionAge = now - (reportedVisitsThisSession.get(id) || 0);
      if (sessionAge >= 0 && sessionAge < VISIT_COOLDOWN_MS) return;
      const stored = await new Promise(resolve => {
        if (typeof chrome === 'undefined' || !chrome.storage?.local) return resolve(null);
        try {
          chrome.storage.local.get({ [VISIT_COOLDOWN_KEY]: {} }, result => {
            resolve(chrome.runtime?.lastError ? null : result?.[VISIT_COOLDOWN_KEY] || {});
          });
        } catch (_) { resolve(null); }
      });
      if (!stored) return;
      const storedAge = now - (Number(stored[id]) || 0);
      if (storedAge >= 0 && storedAge < VISIT_COOLDOWN_MS) return;
      const recent = Object.entries(stored)
        .filter(([, at]) => now - Number(at) >= 0 && now - Number(at) < VISIT_COOLDOWN_MS)
        .sort(([, a], [, b]) => Number(b) - Number(a))
        .slice(0, 99);
      const next = Object.fromEntries(recent);
      next[id] = now;
      const saved = await new Promise(resolve => {
        try {
          chrome.storage.local.set({ [VISIT_COOLDOWN_KEY]: next }, () => resolve(!chrome.runtime?.lastError));
        } catch (_) { resolve(false); }
      });
      if (!saved || revision !== privacyRevision || !await isTelemetryEnabled() || revision !== privacyRevision) return;
      reportedVisitsThisSession.set(id, now);
      const controller = new AbortController();
      visitRequests.add(controller);
      let turnedAway = false;
      try {
        const response = await (RhythiaX.Net?.fetch || fetch)(`${VPS_BASE_URL}/api/telemetry/visit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playerId: id }),
          signal: controller.signal
        });
        turnedAway = response?.status === 429 || response?.status === 503;
      } catch (_) {
        turnedAway = true;
      } finally { visitRequests.delete(controller); }
      // A refusal (429), a busy service (503) or no answer at all gives the player's hour back; both answers also
      // pause the report budget for their Retry-After (shared/net.js). Any other answer, an error included,
      // holds the hour, so a failing service is not sent the same report on every visit.
      if (turnedAway && revision === privacyRevision) await releaseVisitCooldown(id, now);
    } finally {
      pendingVisitReports.delete(id);
    }
  };
})();
