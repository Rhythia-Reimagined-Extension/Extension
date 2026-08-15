// =============================================
// Rhythia Reimagined - Number Easter eggs (67, 69, 420)
// =============================================

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
    const parent = textNode.parentNode;
    if (!parent || parent.closest?.(`.${EGG_CLASS}`) || parent.closest?.('[data-v3-root], [cmdk-root]')) {
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

    parent.replaceChild(fragment, textNode);
  }

  function scanNode(root) {
    if (!root || !root.nodeType) return;
    if (root.nodeType === Node.TEXT_NODE) {
      wrapNumberMatchesInTextNode(root);
      return;
    }

    if (root.nodeType === Node.ELEMENT_NODE) {
      if (IGNORED_TAGS.has(root.nodeName)) return;
      if (root.classList?.contains(EGG_CLASS) || root.closest?.(`.${EGG_CLASS}`)) return;

      const walker = document.createTreeWalker(
        root,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode(node) {
            const p = node.parentNode;
            if (!p || IGNORED_TAGS.has(p.nodeName) || p.closest?.(`.${EGG_CLASS}`)) {
              return NodeFilter.FILTER_REJECT;
            }
            if (/(?:67|69|420)/.test(node.nodeValue)) {
              return NodeFilter.FILTER_ACCEPT;
            }
            return NodeFilter.FILTER_SKIP;
          }
        }
      );

      const nodesToWrap = [];
      let current;
      while ((current = walker.nextNode())) {
        nodesToWrap.push(current);
      }
      for (const node of nodesToWrap) {
        wrapNumberMatchesInTextNode(node);
      }
    }
  }

  function triggerEggAnimation(number) {
    const eggs = document.querySelectorAll(`.${EGG_CLASS}[data-rhythiax-egg="${number}"]`);
    if (!eggs.length) return;

    const duration = DURATION[number] || 2000;
    eggs.forEach(egg => {
      egg.classList.remove(ACTIVE_CLASS);
      void egg.offsetWidth; // Force reflow to restart animation reliably
      egg.classList.add(ACTIVE_CLASS);
      window.setTimeout(() => {
        egg.classList.remove(ACTIVE_CLASS);
      }, duration);
    });
  }

  function startAnimationLoops() {
    // Immediate first pulse for any initially visible numbers after slight render settle
    window.setTimeout(() => {
      ['67', '69', '420'].forEach(num => triggerEggAnimation(num));
    }, 1000);

    // 67: every 10 seconds
    window.setInterval(() => {
      triggerEggAnimation('67');
    }, INTERVALS['67']);

    // 69: every 30 seconds
    window.setInterval(() => {
      triggerEggAnimation('69');
    }, INTERVALS['69']);

    // 420: every 30 seconds
    window.setInterval(() => {
      triggerEggAnimation('420');
    }, INTERVALS['420']);
  }

  function init() {
    scanNode(document.body);

    const observer = new MutationObserver(mutations => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          for (const node of mutation.addedNodes) {
            scanNode(node);
          }
        } else if (mutation.type === 'characterData') {
          scanNode(mutation.target);
        }
      }
    });

    observer.observe(document.body || document.documentElement, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    startAnimationLoops();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
