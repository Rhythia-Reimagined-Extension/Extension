// =============================================
// Reimagined for Rhythia - Number Easter eggs (67, 69, 420)
// =============================================

var RhythiaX = RhythiaX || {};

;(function () {
  'use strict';

  const EGG_CLASS = 'rhythiax-number-egg';
  const ACTIVE_CLASS = 'rhythiax-number-egg--active';

  // Each number plays for 2 s: first 5-20 s after a page opens, then again every 20-40 s, each on its own timer.
  // The popup's How often (options.easterEggs.frequency): Frequent is twice as often and plays twice in a row,
  // Rare half as often.
  const DURATION = 2000;
  const PACE = {
    frequent: { first: [2500, 10000], again: [10000, 20000], plays: 2 },
    normal: { first: [5000, 20000], again: [20000, 40000], plays: 1 },
    rare: { first: [10000, 40000], again: [40000, 80000], plays: 1 },
  };
  const pace = () => PACE[RhythiaX.moduleOptionSettings?.easterEggs?.frequency] || PACE.normal;
  const NUMBERS = ['67', '69', '420'];
  const between = ([lo, hi]) => lo + Math.random() * (hi - lo);

  let currentPath = typeof window !== 'undefined' && window.location ? window.location.pathname : '';
  let observer = null;
  let timers = {};
  let animationTimeoutIds = [];
  let isRunning = false;

  // A number standing on its own: not part of a bigger number (1,067, 4.20, 6 7) or of a word (S67, x69).
  const IGNORED_TAGS = new Set([
    'SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'INPUT', 'SELECT', 'OPTION', 'CODE', 'PRE', 'SVG', 'PATH'
  ]);

  function eggType(number) {
    return number === '67' ? 'sixty-seven' : number === '69' ? 'sixty-nine' : 'four-twenty';
  }

  function createEggElement(number) {
    const egg = document.createElement('span');
    egg.className = `${EGG_CLASS} ${EGG_CLASS}--${eggType(number)}`;
    egg.dataset.rhythiaxEgg = number;
    if (number === '67') {
      egg.innerHTML = '<span class="rhythiax-number-egg__digit">6</span><span class="rhythiax-number-egg__digit">7</span>';
    } else {
      egg.textContent = number;
    }
    return egg;
  }

  function wrapNumberMatchesInTextNode(textNode) {
    try {
      if (!textNode || textNode.isConnected === false) {
        return;
      }
      const parent = textNode.parentNode;
      if (!parent || parent.isConnected === false || parent.closest?.(`.${EGG_CLASS}`) || parent.closest?.('[cmdk-root]')) {
        return;
      }
      if (IGNORED_TAGS.has(parent.nodeName)) {
        return;
      }

      const text = textNode.nodeValue;
      if (!text || !/(?<![\w,.\-]|\d\s+)(?:67|69|420)(?![\w,.]|\s+\d)/.test(text)) {
        return;
      }

      const regex = /(?<![\w,.\-]|\d\s+)(67|69|420)(?![\w,.]|\s+\d)/g;
      let match;
      let lastIndex = 0;
      const fragment = document.createDocumentFragment();
      let hasReplaced = false;

      while ((match = regex.exec(text)) !== null) {
        const matchStart = match.index;
        const number = match[1];

        const beforeSlice = text.substring(lastIndex, matchStart);
        if (beforeSlice) {
          fragment.appendChild(document.createTextNode(beforeSlice));
        }

        fragment.appendChild(createEggElement(number));

        lastIndex = matchStart + number.length;
        hasReplaced = true;
      }

      if (!hasReplaced) return;

      if (lastIndex < text.length) {
        fragment.appendChild(document.createTextNode(text.substring(lastIndex)));
      }

      if (textNode.parentNode === parent && textNode.isConnected && parent.isConnected) {
        parent.replaceChild(fragment, textNode);
      }
    } catch (_) {}
  }

  function scanNode(root) {
    if (!isRunning || !root || !root.nodeType) return;
    try {
      if (root.nodeType === 3 /* Node.TEXT_NODE */) {
        wrapNumberMatchesInTextNode(root);
        return;
      }

      if (root.nodeType === 1 /* Node.ELEMENT_NODE */) {
        if (IGNORED_TAGS.has(root.nodeName)) return;
        if (root.classList?.contains?.(EGG_CLASS) || root.closest?.(`.${EGG_CLASS}`)) return;
        if (typeof document.createTreeWalker !== 'function') return;

        const SHOW_TEXT = (typeof NodeFilter !== 'undefined' && NodeFilter.SHOW_TEXT) || 4;
        const FILTER_REJECT = (typeof NodeFilter !== 'undefined' && NodeFilter.FILTER_REJECT) || 2;
        const FILTER_ACCEPT = (typeof NodeFilter !== 'undefined' && NodeFilter.FILTER_ACCEPT) || 1;
        const FILTER_SKIP = (typeof NodeFilter !== 'undefined' && NodeFilter.FILTER_SKIP) || 3;

        const walker = document.createTreeWalker(
          root,
          SHOW_TEXT,
          {
            acceptNode(node) {
              try {
                const p = node?.parentNode;
                if (!p || IGNORED_TAGS.has(p.nodeName) || p.closest?.(`.${EGG_CLASS}`)) {
                  return FILTER_REJECT;
                }
                if (/(?<![\w,.\-]|\d\s+)(?:67|69|420)(?![\w,.]|\s+\d)/.test(node?.nodeValue || '')) {
                  return FILTER_ACCEPT;
                }
                return FILTER_SKIP;
              } catch (_) {
                return FILTER_REJECT;
              }
            }
          }
        );

        const nodesToWrap = [];
        let current;
        while ((current = walker.nextNode())) {
          nodesToWrap.push(current);
        }
        for (const node of nodesToWrap) {
          if (node && node.isConnected) {
            wrapNumberMatchesInTextNode(node);
          }
        }
      }
    } catch (_) {}
  }

  function triggerEggAnimation(number) {
    if (!isRunning) return;
    try {
      const eggs = document.querySelectorAll(`.${EGG_CLASS}[data-rhythiax-egg="${number}"]`);
      if (!eggs.length) return;

      const plays = pace().plays, duration = DURATION * plays;
      // Restart the animation in the next frame for all eggs at once, without forcing a layout per egg.
      eggs.forEach(egg => egg.classList.remove(ACTIVE_CLASS));
      requestAnimationFrame(() => requestAnimationFrame(() => eggs.forEach(egg => {
        if (!egg || !egg.isConnected || !isRunning) return;
        egg.style.setProperty('--rhythiax-egg-plays', String(plays));
        egg.classList.add(ACTIVE_CLASS);
        const tid = window.setTimeout(() => {
          try {
            if (egg && egg.isConnected) {
              egg.classList.remove(ACTIVE_CLASS);
            }
          } catch (_) {}
          const idx = animationTimeoutIds.indexOf(tid);
          if (idx !== -1) animationTimeoutIds.splice(idx, 1);
        }, duration);
        animationTimeoutIds.push(tid);
      })));
    } catch (_) {}
  }

  // The next play of one number, after a random gap; a new page starts every number over.
  function schedule(number, which) {
    window.clearTimeout(timers[number]);
    if (!isRunning) return;
    timers[number] = window.setTimeout(() => {
      triggerEggAnimation(number);
      schedule(number, 'again');
    }, between(pace()[which]));
  }

  function scheduleInitialPulse() {
    NUMBERS.forEach(number => schedule(number, 'first'));
  }

  function handleRouteChange() {
    const newPath = window.location.pathname;
    if (newPath !== currentPath) {
      currentPath = newPath;
      scheduleInitialPulse();
    }
  }

  // Added and changed nodes are scanned once per frame, not once per mutation.
  let pendingNodes = new Set();
  let scanFrame = 0;
  function queueScan(node) {
    pendingNodes.add(node);
    if (!scanFrame) scanFrame = requestAnimationFrame(flushScan);
  }
  function flushScan() {
    scanFrame = 0;
    const nodes = pendingNodes;
    pendingNodes = new Set();
    if (!isRunning || RhythiaX.exodusShowing?.()) return;
    for (const node of nodes) {
      // A node inside another queued node is covered by that one's scan.
      let covered = false;
      for (let p = node.parentNode; p && !covered; p = p.parentNode) covered = nodes.has(p);
      if (!covered && node.isConnected) scanNode(node);
    }
  }

  function startAnimationLoops() {
    scheduleInitialPulse();
  }

  function removeEggs() {
    try {
      const eggs = document.querySelectorAll?.(`.${EGG_CLASS}`);
      if (!eggs || !eggs.length) return;
      eggs.forEach(egg => {
        try {
          const text = egg.dataset?.rhythiaxEgg || egg.textContent || '';
          const parent = egg.parentNode;
          if (parent && egg.isConnected && parent.isConnected) {
            parent.replaceChild(document.createTextNode(text), egg);
            parent.normalize?.();
          }
        } catch (_) {}
      });
    } catch (_) {}
  }

  function clearAllTimers() {
    Object.values(timers).forEach(id => window.clearTimeout(id));
    timers = {};
    animationTimeoutIds.forEach(id => window.clearTimeout(id));
    animationTimeoutIds = [];
  }

  function isEasterEggsEnabled() {
    return typeof RhythiaX.isModuleEnabled === 'function'
      ? RhythiaX.isModuleEnabled('easterEggs')
      : true;
  }

  function start() {
    if (isRunning) return;
    if (!isEasterEggsEnabled()) return;
    // Not while Exodus shows the page: the eggs start again when it is handed back (below).
    if (RhythiaX.ClassicIdle?.isSuspended?.()) return;

    isRunning = true;
    currentPath = typeof window !== 'undefined' && window.location ? window.location.pathname : '';

    if (document.body || document.documentElement) {
      scanNode(document.body || document.documentElement);
    }

    if (typeof MutationObserver !== 'undefined') {
      observer = new MutationObserver(mutations => {
        if (!isRunning) return;
        // Exodus draws its own page; Rhythia's, unseen underneath, needs no eggs.
        if (RhythiaX.exodusShowing?.()) return;
        try {
          handleRouteChange();
          for (const mutation of mutations) {
            if (mutation.type === 'childList') {
              for (const node of mutation.addedNodes) {
                queueScan(node);
              }
            } else if (mutation.type === 'characterData') {
              queueScan(mutation.target);
            }
          }
        } catch (_) {}
      });

      const root = document.body || document.documentElement;
      if (root) {
        observer.observe(root, {
          childList: true,
          subtree: true,
          characterData: true,
        });
      }
    }

    if (typeof window !== 'undefined' && window.addEventListener) {
      window.addEventListener('popstate', handleRouteChange);
    }

    startAnimationLoops();
  }

  function stop() {
    isRunning = false;
    if (scanFrame) cancelAnimationFrame(scanFrame);
    scanFrame = 0;
    pendingNodes = new Set();

    if (observer) {
      observer.disconnect();
      observer = null;
    }

    if (typeof window !== 'undefined' && window.removeEventListener) {
      window.removeEventListener('popstate', handleRouteChange);
    }

    clearAllTimers();
    removeEggs();
  }

  RhythiaX.EasterEggs = {
    start,
    stop,
    cleanup: stop,
    scanNode,
    triggerEggAnimation,
    isEnabled: isEasterEggsEnabled,
    isRunning: () => isRunning,
  };

  // Exodus took the page: the observer and the timers stop and Rhythia's numbers get their own text back.
  RhythiaX.ClassicIdle?.onSuspend?.(stop);
  RhythiaX.ClassicIdle?.onResume?.(() => { if (isEasterEggsEnabled()) start(); });

  if (typeof chrome !== 'undefined' && chrome.storage?.onChanged) {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === 'local' && changes.rhythiaxModules) {
        const modules = changes.rhythiaxModules.newValue || {};
        const enabled = modules.easterEggs !== false;
        if (enabled && !isRunning) {
          start();
        } else if (!enabled && isRunning) {
          stop();
        }
      }
    });
  }

  function init() {
    if (isEasterEggsEnabled()) {
      start();
    }
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
      init();
    }
  }
})();
