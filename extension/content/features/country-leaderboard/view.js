// Turn country leaderboard flags into lightweight, accessible popovers.
var RhythiaX = RhythiaX || {};

(function () {
  const TRIGGER_SELECTOR = 'a[href]';
  const POPOVER_CLASS = 'rhythiax-country-leaderboard-popover';
  const ACTION_CLASS = 'rhythiax-country-leaderboard-action';
  const CLOSE_DURATION = 180;
  const FALLBACK_NAMES = {
    BR: 'Brazil',
    GB: 'United Kingdom',
    PL: 'Poland',
  };
  let countryNames = null;
  let active = null;
  let popoverSequence = 0;

  try {
    countryNames = typeof Intl.DisplayNames === 'function'
      ? new Intl.DisplayNames(['en'], { type: 'region' })
      : null;
  } catch (_) {
    countryNames = null;
  }

  function countryFromLink(link) {
    if (!link || !link.querySelector('img[src*="/flags/"]')) return null;
    let url;
    try {
      url = new URL(link.getAttribute('href') || '', window.location.href);
    } catch (_) {
      return null;
    }
    if (url.origin !== window.location.origin) return null;
    const match = url.pathname.match(/^\/leaderboards\/([A-Za-z]{2})\/?$/);
    if (!match) return null;
    return match[1].toUpperCase();
  }

  function countryName(code) {
    const name = countryNames?.of(code);
    return name && name !== code ? name : FALLBACK_NAMES[code] || code;
  }

  function setTriggerState(trigger, expanded, popover) {
    trigger.setAttribute('aria-expanded', String(expanded));
    trigger.classList.add('rhythiax-country-leaderboard-trigger');
    trigger.classList.toggle('rhythiax-country-leaderboard-trigger-active', expanded);
    if (popover) {
      trigger.setAttribute('aria-haspopup', 'dialog');
      trigger.setAttribute('aria-controls', popover.id);
    } else {
      trigger.removeAttribute('aria-controls');
    }
  }

  function positionPopover() {
    if (!active) return;
    if (!active.trigger.isConnected || !active.popover.isConnected) {
      closePopover();
      return;
    }
    const triggerRect = active.trigger.getBoundingClientRect();
    const popoverRect = active.popover.getBoundingClientRect();
    const edge = 8;
    const gap = 8;
    const maxLeft = Math.max(edge, window.innerWidth - popoverRect.width - edge);
    const left = Math.min(Math.max(edge, triggerRect.left), maxLeft);
    const belowTop = triggerRect.bottom + gap;
    const aboveTop = triggerRect.top - popoverRect.height - gap;
    const top = belowTop + popoverRect.height <= window.innerHeight - edge || aboveTop < edge
      ? belowTop
      : aboveTop;

    active.popover.style.left = `${Math.round(left)}px`;
    active.popover.style.top = `${Math.round(Math.max(edge, top))}px`;
  }

  function closePopover() {
    if (!active) return;
    const previous = active;
    active = null;
    setTriggerState(previous.trigger, false);
    previous.popover.classList.remove('is-open');
    previous.popover.classList.add('is-closing');
    window.setTimeout(() => previous.popover.remove(), CLOSE_DURATION);
  }

  function createPopover(trigger, code) {
    const name = countryName(code);
    const popover = document.createElement('div');
    const popoverId = `rhythiax-country-leaderboard-${code.toLowerCase()}-${++popoverSequence}`;
    const flag = trigger.querySelector('img');
    const info = document.createElement('div');
    const title = document.createElement('strong');
    const action = document.createElement('a');

    popover.id = popoverId;
    popover.className = POPOVER_CLASS;
    popover.setAttribute('role', 'dialog');
    popover.setAttribute('aria-label', `${name} leaderboard`);

    info.className = 'rhythiax-country-leaderboard-info';
    if (flag?.getAttribute('src')) {
      const flagCopy = document.createElement('img');
      flagCopy.src = flag.getAttribute('src');
      flagCopy.alt = '';
      flagCopy.className = 'rhythiax-country-leaderboard-flag';
      info.appendChild(flagCopy);
    }
    title.textContent = name;
    info.appendChild(title);

    action.className = ACTION_CLASS;
    action.href = `/leaderboards/${code}`;
    action.textContent = 'Open leaderboard';
    action.addEventListener('click', closePopover);

    popover.append(info, action);
    document.body.appendChild(popover);
    active = { trigger, popover };
    setTriggerState(trigger, true, popover);
    positionPopover();
    requestAnimationFrame(() => {
      if (active?.popover === popover) {
        popover.classList.add('is-open');
        action.focus();
      }
    });
  }

  function togglePopover(trigger, code) {
    if (active?.trigger === trigger) {
      closePopover();
      return;
    }
    closePopover();
    createPopover(trigger, code);
  }

  document.addEventListener('click', event => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;

    if (target.closest(`.${ACTION_CLASS}`)) {
      closePopover();
      return;
    }
    if (active?.popover.contains(target)) return;

    const trigger = target.closest(TRIGGER_SELECTOR);
    const code = countryFromLink(trigger);
    if (!code) {
      closePopover();
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    togglePopover(trigger, code);
  }, true);

  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || !active) return;
    event.preventDefault();
    const trigger = active.trigger;
    closePopover();
    trigger.focus();
  }, true);

  window.addEventListener('resize', positionPopover);
  window.addEventListener('scroll', positionPopover, true);
  window.addEventListener('popstate', closePopover);
})();
