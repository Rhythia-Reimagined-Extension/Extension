// =============================================
// Rhythia Reimagined - Number Easter eggs (67, 69, 420)
// =============================================

var RhythiaX = RhythiaX || {};

;(function () {
  'use strict';

  const EGG_CLASS = 'rhythiax-number-egg';
  const ACTIVE_CLASS = 'rhythiax-number-egg--active';

  const DURATION = {
    '67': 4000,
    '69': 4000,
    '420': 2000,
  };

  const INTERVALS = {
    '67': 10000,
    '69': 30000,
    '420': 30000,
  };

  const INITIAL_DELAY = 5000;

  let currentPath = typeof window !== 'undefined' && window.location ? window.location.pathname : '';
  let initialTimeoutId = null;
  let observer = null;
  let intervalIds = [];
  let animationTimeoutIds = [];
  let isRunning = false;

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
      if (!textNode || !textNode.isConnected) {
        return;
      }
      const parent = textNode.parentNode;
      if (!parent || !parent.isConnected || parent.closest?.(`.${EGG_CLASS}`) || parent.closest?.('[data-v3-root], [cmdk-root]')) {
        return;
      }
      if (IGNORED_TAGS.has(parent.nodeName)) {
        return;
      }

      const text = textNode.nodeValue;
      if (!text || !/(?:67|69|420)/.test(text)) {
        return;
      }

      const regex = /(67|69|420)/g;
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
                if (/(?:67|69|420)/.test(node?.nodeValue || '')) {
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

      const duration = DURATION[number] || 2000;
      eggs.forEach(egg => {
        if (!egg || !egg.isConnected) return;
        egg.classList.remove(ACTIVE_CLASS);
        void egg.offsetWidth; // Force reflow to restart animation reliably
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
      });
    } catch (_) {}
  }

  function scheduleInitialPulse() {
    if (initialTimeoutId) {
      window.clearTimeout(initialTimeoutId);
      initialTimeoutId = null;
    }
    if (!isRunning) return;
    initialTimeoutId = window.setTimeout(() => {
      initialTimeoutId = null;
      if (!isRunning) return;
      ['67', '69', '420'].forEach(num => triggerEggAnimation(num));
    }, INITIAL_DELAY);
  }

  function handleRouteChange() {
    const newPath = window.location.pathname;
    if (newPath !== currentPath) {
      currentPath = newPath;
      scheduleInitialPulse();
    }
  }

  function startAnimationLoops() {
    scheduleInitialPulse();

    intervalIds.push(
      window.setInterval(() => {
        triggerEggAnimation('67');
      }, INTERVALS['67'])
    );

    intervalIds.push(
      window.setInterval(() => {
        triggerEggAnimation('69');
      }, INTERVALS['69'])
    );

    intervalIds.push(
      window.setInterval(() => {
        triggerEggAnimation('420');
      }, INTERVALS['420'])
    );
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
    if (initialTimeoutId) {
      window.clearTimeout(initialTimeoutId);
      initialTimeoutId = null;
    }
    intervalIds.forEach(id => window.clearInterval(id));
    intervalIds = [];
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

    isRunning = true;
    currentPath = typeof window !== 'undefined' && window.location ? window.location.pathname : '';

    if (document.body || document.documentElement) {
      scanNode(document.body || document.documentElement);
    }

    if (typeof MutationObserver !== 'undefined') {
      observer = new MutationObserver(mutations => {
        if (!isRunning) return;
        try {
          handleRouteChange();
          for (const mutation of mutations) {
            if (mutation.type === 'childList') {
              for (const node of mutation.addedNodes) {
                scanNode(node);
              }
            } else if (mutation.type === 'characterData') {
              scanNode(mutation.target);
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
