// Cloud history and profile discovery.

var RhythiaX = RhythiaX || {};

(function () {
  const VPS_BASE_URL = 'https://rhythia.shuriel.com';
  const DEFAULT_TIMEOUT_MS = 3500;
  const LOG_KEY = 'rhythiax_connection_logs';
  const TELEMETRY_ENABLED_KEY = 'rhythiax_telemetry_enabled';
  const VISIT_COOLDOWN_KEY = 'rhythiax_visit_report_cooldowns';
  const VISIT_COOLDOWN_MS = 5 * 60 * 1000;

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
      if (res?.rhythiaxDataSettings?.communityConsentVersion !== 1) return 'local-only';
      const mode = res?.rhythiaxDataSettings?.syncMode;
      return ['cloud-only', 'hybrid', 'local-only'].includes(mode) ? mode : 'local-only';
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
        chrome.storage.local.get([TELEMETRY_ENABLED_KEY, 'rhythiaxDataSettings'], result => {
          resolve(chrome.runtime?.lastError ? null : result);
        });
      });
      if (!res) return false;
      if (res?.rhythiaxDataSettings?.communityConsentVersion !== 1) return false;
      if (!['cloud-only', 'hybrid'].includes(res?.rhythiaxDataSettings?.syncMode)) return false;
      if (res?.rhythiaxDataSettings?.telemetryEnabled !== undefined) {
        return res.rhythiaxDataSettings.telemetryEnabled === true;
      }
      return res?.[TELEMETRY_ENABLED_KEY] === true;
    } catch (_) {
      return false;
    }
  }

  /**
   * Fetch full daily ranking history for a player from VPS backend.
   * Leverages Cloudflare Edge CDN caching and records latency diagnostics.
   * @param {number|string} playerId
   * @param {Object} [options]
   * @param {AbortSignal} [options.signal]
   * @param {number} [options.timeout]
   * @returns {Promise<{player: Object, history: Array}|null>}
   */
  RhythiaX.fetchVpsPlayerHistory = async function (playerId, options = {}) {
    const id = parseInt(playerId, 10);
    if (isNaN(id) || id <= 0) return null;

    const syncMode = await getSyncMode();
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
    const controller = new AbortController();
    let timeoutId = null;

    if (timeoutMs > 0) {
      timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    }

    if (options.signal) {
      options.signal.addEventListener('abort', () => controller.abort(), { once: true });
    }

    const startTime = performance.now();

    try {
      const url = `${VPS_BASE_URL}/api/player/${id}/history`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        signal: controller.signal
      });

      if (timeoutId) clearTimeout(timeoutId);

      const elapsedMs = Math.round(performance.now() - startTime);
      const elapsedSec = (elapsedMs / 1000).toFixed(2) + 's';

      if (response.status === 404) {
        appendDiagnosticLog({
          timestamp: Date.now(),
          date: nowStr,
          playerId: id,
          username: null,
          visited: `#${id}`,
          latencyMs: elapsedMs,
          timeToReach: elapsedSec,
          status: 'warning',
          statusText: 'Not in DB yet'
        });
        return null;
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
        history: data.history
      };
    } catch (err) {
      if (timeoutId) clearTimeout(timeoutId);
      const isTimeout = err.name === 'AbortError';
      
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
  };

  const reportedVisitsThisSession = new Map();
  const pendingVisitReports = new Set();

  /**
   * Report a profile visit to VPS for crawler auto-discovery (P1 / P2 queue).
   * Respects opt-out telemetry setting and persists the cooldown across reloads.
   * @param {number|string} playerId
   */
  RhythiaX.reportVpsPlayerVisit = async function (playerId) {
    const id = parseInt(playerId, 10);
    if (isNaN(id) || id <= 0) return;

    const enabled = await isTelemetryEnabled();
    if (!enabled) return;

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
      if (!saved) return;
      reportedVisitsThisSession.set(id, now);
      await fetch(`${VPS_BASE_URL}/api/telemetry/visit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: id }),
        keepalive: true
      }).catch(() => {});
    } finally {
      pendingVisitReports.delete(id);
    }
  };
})();
