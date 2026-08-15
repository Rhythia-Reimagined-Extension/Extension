// Profile score-tab lifecycle and score-card collection coordination.
var RhythiaX = RhythiaX || {};

(function () {
  const tabPattern = /^(reigning|top|recent) scores$/i;
  const tabTransitionDelay = 150;
  const tabStates = new WeakMap();

  function nextFrame(callback) {
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(callback);
    else window.setTimeout(callback, 16);
  }

  function activeButton(buttons) {
    return buttons.find(button => button.getAttribute('data-rhythiax-active') === 'true'
      || button.getAttribute('aria-pressed') === 'true'
      || button.getAttribute('aria-selected') === 'true'
      || (button.classList.contains('border-b-2') && button.classList.contains('border-white')))
      || buttons[0];
  }

  function installIndicator(buttons) {
    const strip = buttons[0]?.parentElement;
    if (!strip || buttons.some(button => button.parentElement !== strip)) return null;
    strip.classList.add('rhythiax-profile-score-tab-strip');
    let indicator = strip.querySelector(':scope > .rhythiax-profile-score-tab-indicator');
    if (!indicator) {
      indicator = document.createElement('span');
      indicator.className = 'rhythiax-profile-score-tab-indicator';
      indicator.setAttribute('aria-hidden', 'true');
      strip.appendChild(indicator);
    }

    const update = (button, immediate = false) => {
      if (!button?.isConnected) return;
      if (immediate) indicator.style.transition = 'none';
      indicator.style.width = `${button.offsetWidth}px`;
      indicator.style.transform = `translateX(${button.offsetLeft}px)`;
      if (immediate) requestAnimationFrame(() => { indicator.style.transition = ''; });
    };

    const active = activeButton(buttons);
    buttons.forEach(btn => btn.setAttribute('data-rhythiax-active', btn === active ? 'true' : 'false'));
    update(active, true);

    if (window.ResizeObserver && !strip.__rhythiaxResizeObserved) {
      strip.__rhythiaxResizeObserved = true;
      const ro = new ResizeObserver(() => {
        const cur = activeButton(buttons);
        if (cur) update(cur, true);
      });
      ro.observe(strip);
    }

    return { strip, update };
  }

  function prepareEntering(host) {
    const cards = RhythiaX.findScoreCards().filter(card => host.contains(card));
    cards.forEach((card, index) => {
      card.classList.remove('rhythiax-score-tab-leaving');
      card.classList.add('rhythiax-score-tab-entering');
      card.style.setProperty('--rhythiax-score-tab-delay', `${Math.min(index * 22, 160)}ms`);
    });
    window.setTimeout(() => cards.forEach(card => {
      card.classList.remove('rhythiax-score-tab-entering');
      card.style.removeProperty('--rhythiax-score-tab-delay');
    }), 450);
  }

  function profileType(card) {
    const host = RhythiaX.qsa('.rhythiax-profile-score-tabs, .overflow-hidden.rounded-xl.border').find(section => section.contains(card) && RhythiaX.qsa('button', section).some(button => tabPattern.test(button.textContent.trim())));
    const active = host && RhythiaX.qsa('button', host).find(button => tabPattern.test(button.textContent.trim()) && (button.getAttribute('data-rhythiax-active') === 'true' || button.getAttribute('aria-pressed') === 'true' || (button.classList.contains('border-b-2') && button.classList.contains('border-white'))));
    return ({ 'reigning scores': 'reigning', 'top scores': 'top', 'recent scores': 'recent' })[active?.textContent.trim().toLowerCase()] || '';
  }
  function installTabs() {
    RhythiaX.qsa('.overflow-hidden.rounded-xl.border').forEach(host => {
      const buttons = RhythiaX.qsa('button', host).filter(button => tabPattern.test(button.textContent.trim()));
      if (!buttons.length || !host.querySelector(RhythiaX.SCORE_SELECTOR)) return;
      host.classList.add('rhythiax-profile-score-tabs');
      buttons.forEach(button => { button.dataset.rhythiaxProfileScoreTab = button.textContent.trim().toLowerCase(); });
      const indicator = installIndicator(buttons);
      if (indicator) tabStates.set(host, { ...tabStates.get(host), indicator });
    });
    if (RhythiaX.profileScoreTabsInstalled) return;
    RhythiaX.profileScoreTabsInstalled = true;
    document.addEventListener('click', event => {
      const button = event.target.closest?.('button'); if (!button || !tabPattern.test(button.textContent.trim())) return;
      const host = button.closest('.rhythiax-profile-score-tabs'); if (!host) return;
      const buttons = RhythiaX.qsa('button', host).filter(tab => tabPattern.test(tab.textContent.trim()));
      const current = activeButton(buttons);
      if (button === current) return;
      const direction = buttons.indexOf(button) >= buttons.indexOf(current) ? 1 : -1;
      const state = tabStates.get(host) || {};
      buttons.forEach(b => b.setAttribute('data-rhythiax-active', b === button ? 'true' : 'false'));
      host.style.setProperty('--rhythiax-score-tab-direction', direction);
      host.classList.add('rhythiax-profile-score-tabs-switching');
      host.setAttribute('aria-busy', 'true');
      const oldCards = RhythiaX.findScoreCards().filter(card => host.contains(card));
      oldCards.forEach(card => card.classList.add('rhythiax-score-tab-leaving'));
      state.indicator?.update(button);
      window.clearTimeout(state.timer);
      const generation = (state.generation || 0) + 1;
      state.generation = generation;
      const finish = () => {
        if (state.generation !== generation) return;
        window.clearTimeout(state.timer);
        const cards = RhythiaX.findScoreCards().filter(card => host.contains(card));
        cards.forEach(card => { card.classList.remove('rhythiax-redesigned'); card.querySelector('.rhythiax-redesign-wrapper')?.remove(); card.querySelectorAll('[data-rhythiax-original-display]').forEach(child => { child.style.display = child.getAttribute('data-rhythiax-original-display'); child.removeAttribute('data-rhythiax-original-display'); }); });
        RhythiaX.enhanceScoreCards(); RhythiaX.injectAbsoluteDates();
        host.classList.remove('rhythiax-profile-score-tabs-switching'); host.removeAttribute('aria-busy');
        prepareEntering(host);
        state.indicator = installIndicator(RhythiaX.qsa('button', host).filter(tab => tabPattern.test(tab.textContent.trim()))) || state.indicator;
        state.indicator?.update(activeButton(RhythiaX.qsa('button', host).filter(tab => tabPattern.test(tab.textContent.trim()))));
      };
      let frameCount = 0;
      const waitForCollection = () => {
        if (state.generation !== generation) return;
        const cards = RhythiaX.findScoreCards().filter(card => host.contains(card));
        const collectionChanged = cards.length !== oldCards.length || cards.some(card => !oldCards.includes(card));
        if (collectionChanged || frameCount++ >= 10) finish();
        else nextFrame(waitForCollection);
      };
      state.timer = window.setTimeout(finish, tabTransitionDelay);
      nextFrame(waitForCollection);
      tabStates.set(host, state);
    }, true);
    document.addEventListener('click', event => {
      const showMoreBtn = event.target.closest?.('button');
      if (showMoreBtn && /show\s+more|load\s+more/i.test(showMoreBtn.textContent || '')) {
        let attempts = 0;
        const checkNewCards = () => {
          const unenhanced = (RhythiaX.SiteDomBridge?.findScoreCards() || RhythiaX.findScoreCards?.() || []).filter(
            card => !card.classList.contains('rhythiax-redesigned')
          );
          if (unenhanced.length > 0) {
            RhythiaX.enhanceScoreCards?.();
            RhythiaX.injectAbsoluteDates?.();
          } else if (++attempts < 25) {
            window.setTimeout(checkNewCards, 80);
          }
        };
        window.setTimeout(checkNewCards, 50);
      }
    }, true);
  }
  RhythiaX.ScoreCardService = { profileType, installTabs };
})();
