// =============================================
// Reimagined for Rhythia — Classic's page state and its idle switch while Exodus shows the page
// =============================================

var RhythiaX = RhythiaX || {};

// ─── State ───────────────────────────────────
RhythiaX.injected = false;
RhythiaX.extensionContextInvalidated = false;
RhythiaX.navigationToken = 0;
RhythiaX.apiAbortController = null;

// ─── Exodus on screen ────────────────────────
// Exodus shows the page while <html> has the class rhythiax-exodus. That class is the one signal Classic
// reads from the other look; it never uses Exodus' globals or files.
RhythiaX.exodusShowing = function () {
  return typeof document !== 'undefined' && document.documentElement?.classList?.contains('rhythiax-exodus') === true;
};

// Classic stays idle while Exodus shows the page. content/bootstrap/route-observer.js suspends and resumes
// it from its watch on that class; each part that keeps its own work (observers, timers, panels on the page)
// stops it in onSuspend and starts it again in onResume, which runs before the page is built again.
RhythiaX.ClassicIdle = (function () {
  let suspended = false;
  const handlers = { suspend: [], resume: [] };
  function run(list) {
    list.forEach(fn => {
      try { fn(); } catch (error) { RhythiaX.captureError?.(error, 'Classic suspend or resume step failed'); }
    });
  }
  return {
    isSuspended: () => suspended,
    onSuspend(fn) { if (typeof fn === 'function') handlers.suspend.push(fn); },
    onResume(fn) { if (typeof fn === 'function') handlers.resume.push(fn); },
    // Called by route-observer.js alone, from its suspend() and resume().
    set(next) {
      if (Boolean(next) === suspended) return false;
      suspended = Boolean(next);
      run(suspended ? handlers.suspend : handlers.resume);
      return true;
    },
  };
})();
