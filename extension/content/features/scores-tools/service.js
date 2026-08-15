// Scores-tool state and browser service coordination.
var RhythiaX = RhythiaX || {};

(function () {
  const key = 'rhythiaxScoresView';

  function animate(element, open, immediate, content) {
    if (!element) return;

    const token = (element._rhythiaxCollapseToken || 0) + 1;
    element._rhythiaxCollapseToken = token;
    element.style.height = `${element.getBoundingClientRect().height}px`;
    if (immediate) {
      element.style.height = `${open ? (content || element).scrollHeight : 0}px`;
      return;
    }

    void element.offsetHeight;
    requestAnimationFrame(() => {
      if (element._rhythiaxCollapseToken === token) {
        element.style.height = `${open ? (content || element).scrollHeight : 0}px`;
      }
    });

    const finish = event => {
      if (event.propertyName !== 'height' || element._rhythiaxCollapseToken !== token) return;
      element.removeEventListener('transitionend', finish);
      if (open) element.style.height = 'auto';
    };
    element.addEventListener('transitionend', finish);
  }

  function collapseNativeCard(card, titleText, kind) {
    if (!card || card.dataset.rhythiaxNativeCollapseReady === 'true') return;

    const heading = RhythiaX.qsa('h1, h2, h3, h4, [role="heading"], div[class*="font"]')
      .find(element => element.textContent.trim() === titleText && card.contains(element));
    const nativeHeading = card.firstElementChild?.querySelector('h1, h2, h3, h4, [role="heading"]');
    const existingHeader = (
      (heading?.tagName?.match(/^H[1-6]$/) && card.firstElementChild?.contains(heading))
      || nativeHeading?.textContent.trim() === titleText
    )
      ? card.firstElementChild
      : null;
    const content = existingHeader ? [...card.children].slice(1) : [...card.children];
    if (!content.length) return;

    const header = existingHeader || document.createElement('div');
    if (!existingHeader) {
      header.className = 'rhythiax-scores-collapse-header';
      header.dataset.rhythiaxNativeCollapseInjectedHeader = 'true';
      const title = document.createElement('h3');
      title.textContent = titleText;
      header.appendChild(title);
    } else {
      header.classList.add('rhythiax-scores-collapse-header');
    }

    header.tabIndex = 0;
    header.setAttribute('role', 'button');
    header.setAttribute('aria-expanded', 'false');
    const chevron = document.createElement('span');
    chevron.className = 'rhythiax-scores-collapse-toggle';
    chevron.setAttribute('aria-hidden', 'true');
    chevron.innerHTML = '<span></span><span></span>';
    header.appendChild(chevron);

    const body = document.createElement('div');
    body.className = 'rhythiax-native-collapse-content';
    const bodyInner = document.createElement('div');
    bodyInner.className = 'rhythiax-native-collapse-content-inner';
    content.forEach(element => bodyInner.appendChild(element));
    body.appendChild(bodyInner);

    card.classList.add('rhythiax-scores-collapse-card', 'rhythiax-native-collapse-card', `rhythiax-native-collapse-${kind}`);
    card.appendChild(body);
    if (!existingHeader) card.prepend(header);

    const setOpen = (open, immediate = false) => {
      card.classList.toggle('rhythiax-native-collapse-open', open);
      header.setAttribute('aria-expanded', String(open));
      animate(body, open, immediate, bodyInner);
    };

    header.addEventListener('click', () => setOpen(!card.classList.contains('rhythiax-native-collapse-open')));
    header.addEventListener('keydown', event => {
      if (!['Enter', ' '].includes(event.key) || event.target !== header) return;
      event.preventDefault();
      setOpen(!card.classList.contains('rhythiax-native-collapse-open'));
    });

    card.dataset.rhythiaxNativeCollapseReady = 'true';
    setOpen(false, true);
  }

  // Restore the site's original chart cards before preparing them again. This
  // matters on SPA navigation, where React can retain the same page tree.
  function restoreNativeCollapses() {
    RhythiaX.qsa('[data-rhythiax-native-collapse-ready="true"]').forEach(card => {
      const body = card.querySelector(':scope > .rhythiax-native-collapse-content');
      const header = card.querySelector(':scope > .rhythiax-scores-collapse-header');
      if (body) {
        const bodyInner = body.querySelector(':scope > .rhythiax-native-collapse-content-inner');
        [...(bodyInner?.children || body.children)].forEach(element => card.appendChild(element));
        ['height', 'maxHeight', 'opacity', 'transform', 'transition', 'willChange'].forEach(property => {
          body.style[property] = '';
        });
        body.remove();
      }

      header?.querySelector(':scope > .rhythiax-scores-collapse-toggle')?.remove();
      const legacyInjectedTitle = header?.querySelector(':scope > h3');
      if (legacyInjectedTitle?.textContent.trim() === 'Spin Scores') legacyInjectedTitle.remove();
      if (header?.dataset.rhythiaxNativeCollapseInjectedHeader === 'true') header.remove();
      header?.classList.remove('rhythiax-scores-collapse-header');
      card.classList.remove('rhythiax-native-collapse-open');
      card.classList.remove(
        'rhythiax-scores-collapse-card',
        'rhythiax-native-collapse-card',
        'rhythiax-native-collapse-user-scores-weight',
        'rhythiax-native-collapse-spin-scores'
      );
      delete card.dataset.rhythiaxNativeCollapseReady;
    });
  }

  function prepareNativeCards() {
    const findCard = (titleText, chartSelector) => {
      const heading = RhythiaX.qsa('h1, h2, h3, h4, [role="heading"], div[class*="font"]')
        .find(element => element.textContent.trim() === titleText);
      return heading?.closest('.rounded-xl.border') || RhythiaX.qs(chartSelector)?.closest('.rounded-xl.border');
    };

    collapseNativeCard(findCard('User Scores Weight', '[data-chart="chart-rf"], [data-chart="chart-r10"]'), 'User Scores Weight', 'user-scores-weight');
    collapseNativeCard(findCard('This user is a non spin player.', '[data-chart="chart-r11"]'), 'Spin Scores', 'spin-scores');
  }

  function prepare() {
    restoreNativeCollapses();
    if (!RhythiaX.isScoresPage?.()) return;

    prepareNativeCards();
    // Recharts mounts User Scores Weight after the initial scores DOM is ready.
    // A second pass wraps only late cards; existing cards are left untouched.
    setTimeout(() => {
      if (RhythiaX.isScoresPage?.()) prepareNativeCards();
    }, 500);
  }

  function setView(view) {
    RhythiaX.scoresView = view;
    localStorage.setItem(key, view);

    new Set(RhythiaX.qsa('.rhythiax-score-card').map(card => card.parentElement))
      .forEach(parent => parent?.classList.toggle('rhythiax-scores-grid', view === 'grid'));

    document.querySelectorAll('.rhythiax-scores-view-buttons button').forEach(button => {
      const active = button.dataset.view === view;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
  }

  function configuredView() {
    const pageKey = RhythiaX.isScoresPage?.() ? 'scoresView' : 'playerView';
    const view = RhythiaX.moduleOptionSettings?.scoreCards?.[pageKey];
    if (['list', 'grid'].includes(view)) setView(view);
  }

  RhythiaX.ScoresToolsService = { animate, prepare, restoreNativeCollapses, setView, configuredView, storageKey: key };
})();
