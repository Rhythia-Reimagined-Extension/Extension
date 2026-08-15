// =============================================
// Rhythia X — Debounce helper
// =============================================

var RhythiaX = RhythiaX || {};

// ─── Debounce ─────────────────────────────────
// Classic trailing-edge debounce: only the last call within `wait` ms
// actually runs `fn`. Returns a wrapper function that also exposes
// `.cancel()` so callers can clear a pending invocation (e.g. on teardown).
RhythiaX.debounce = function (fn, wait) {
  let timeoutId = null;

  const debounced = function (...args) {
    const context = this;
    if (timeoutId !== null) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      timeoutId = null;
      fn.apply(context, args);
    }, wait);
  };

  debounced.cancel = function () {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  return debounced;
};
