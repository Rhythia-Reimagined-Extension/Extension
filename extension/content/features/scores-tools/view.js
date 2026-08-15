// Scores toolbar DOM and mount lifecycle.
var RhythiaX = RhythiaX || {};

(function () {
  const domain = RhythiaX.ScoresToolsDomain;
  const service = RhythiaX.ScoresToolsService;

  RhythiaX.scoresFilterState = { ...domain.defaults };
  RhythiaX.scoresView = 'list';

  function score(card) {
    const value = RhythiaX.parseScoreCard(card);
    value.fullCombo = value.fullCombo === true || domain.number(value.misses) === 0;
    value.hasReplay = Boolean(
      RhythiaX.SiteDomBridge?.findReplayLink(card) || RhythiaX.findReplayLink(card)
    );

    ['accuracy', 'weightedRp', 'rpEarned', 'notes', 'misses'].forEach(key => {
      value[{ accuracy: 'accuracyValue', weightedRp: 'weightedValue', rpEarned: 'rawValue', notes: 'notesValue', misses: 'missesValue' }[key]] = domain.number(value[key]);
    });
    value.dateValue = value.absoluteDate?.getTime() || 0;
    return value;
  }

  function apply() {
    const state = RhythiaX.scoresFilterState;
    const entries = RhythiaX.qsa('.rhythiax-score-card')
      .map((card, index) => ({ card, score: score(card), index }))
      .sort((left, right) => domain.compare(left.score, right.score, state.sort) || left.index - right.index);

    const groups = new Map();
    entries.forEach(entry => {
      entry.card.style.display = domain.matches(entry.score, state) ? '' : 'none';
      const group = groups.get(entry.card.parentElement) || [];
      group.push(entry.card);
      groups.set(entry.card.parentElement, group);
    });
    groups.forEach((cards, parent) => {
      if (parent) cards.forEach(card => parent.appendChild(card));
    });

    const visible = entries.filter(entry => entry.card.style.display !== 'none').length;
    const count = RhythiaX.qs('.rhythiax-scores-result-count');
    if (count) count.textContent = `${visible} of ${entries.length} scores`;
    service.setView(RhythiaX.scoresView);
  }

  function update(next) {
    RhythiaX.scoresFilterState = { ...RhythiaX.scoresFilterState, ...next };
    apply();
  }

  function action(label, handler, view) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'rhythiax-scores-action';
    button.textContent = label;
    if (view) button.dataset.view = view;
    button.addEventListener('click', handler);
    return button;
  }

  function labeledControl(label, control) {
    const wrapper = document.createElement('label');
    wrapper.className = 'rhythiax-scores-control';
    const caption = document.createElement('span');
    caption.textContent = label;
    wrapper.append(caption, control);
    return wrapper;
  }

  function filterInput(key, label, type, placeholder) {
    const input = document.createElement('input');
    input.type = type;
    input.placeholder = placeholder;
    input.dataset.filterKey = key;
    input.addEventListener('input', () => update({ [key]: input.value.trim() }));
    return labeledControl(label, input);
  }

  function filterSelect(key, label, options) {
    const select = document.createElement('select');
    select.dataset.filterKey = key;
    options.forEach(([value, optionLabel]) => select.add(new Option(optionLabel, value)));
    select.addEventListener('change', () => update({ [key]: select.value }));
    return labeledControl(label, select);
  }

  function checkControl(key, label) {
    const wrapper = document.createElement('label');
    wrapper.className = 'rhythiax-scores-check-control';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = RhythiaX.scoresFilterState[key];
    input.dataset.filterKey = key;
    input.addEventListener('change', () => update({ [key]: input.checked }));
    const text = document.createElement('span');
    text.textContent = label;
    wrapper.append(input, text);
    return wrapper;
  }

  function toolbar() {
    const root = document.createElement('section');
    root.className = 'rhythiax-scores-toolbar';
    root.setAttribute('aria-label', 'Score analysis tools');

    const main = document.createElement('div');
    main.className = 'rhythiax-scores-toolbar-main';

    const heading = document.createElement('div');
    heading.className = 'rhythiax-scores-toolbar-heading';
    heading.innerHTML = '<strong>Score Analysis</strong><span class="rhythiax-scores-result-count"></span>';
    main.appendChild(heading);

    const controls = document.createElement('div');
    controls.className = 'rhythiax-scores-controls';
    controls.append(
      filterInput('query', 'Search', 'search', 'Search scores...'),
      filterInput('minAccuracy', 'Min accuracy', 'number', 'Any'),
      filterInput('minWeightedRp', 'Min weighted RP', 'number', 'Any'),
      filterSelect('sort', 'Sort by', [
        ['weightedRp', 'Weighted RP'], ['rawRp', 'Raw RP'], ['accuracy', 'Accuracy'],
        ['date', 'Date'], ['notes', 'Notes'], ['misses', 'Misses'], ['speed', 'Speed']
      ]),
      filterSelect('grade', 'Grade', [['', 'All grades'], ...RhythiaX.GRADE_ORDER.map(value => [value, value])]),
      filterSelect('speed', 'Speed', [['', 'All speeds'], ...RhythiaX.SPEED_ORDER.map(value => [value, `${value}x`])]),
      checkControl('fullCombo', 'Full combo'),
      checkControl('hasReplay', 'Has replay')
    );
    main.appendChild(controls);

    const actions = document.createElement('div');
    actions.className = 'rhythiax-scores-actions';
    const actionsTitle = document.createElement('div');
    actionsTitle.className = 'rhythiax-scores-actions-title';
    actionsTitle.textContent = 'View';
    const viewButtons = document.createElement('div');
    viewButtons.className = 'rhythiax-scores-view-buttons';
    viewButtons.append(
      action('List', () => service.setView('list'), 'list'),
      action('Grid', () => service.setView('grid'), 'grid')
    );
    const reset = action('Reset filters', () => {
      RhythiaX.scoresFilterState = { ...domain.defaults };
      root.querySelectorAll('[data-filter-key]').forEach(control => {
        if (control.type === 'checkbox') control.checked = domain.defaults[control.dataset.filterKey];
        else control.value = domain.defaults[control.dataset.filterKey] || '';
      });
      apply();
    });
    actions.append(actionsTitle, viewButtons, reset);
    root.append(main, actions);
    return root;
  }

  function inject(options = {}) {
    if (!RhythiaX.isScoresPage?.() || !RhythiaX.isModuleEnabled('scoreCards')) return;
    const cards = RhythiaX.qsa('.rhythiax-score-card');
    if (!cards.length) return;

    if (!RhythiaX.qs('.rhythiax-scores-toolbar')) {
      const host = cards[0].parentElement?.parentElement || cards[0].parentElement;
      host?.insertBefore(toolbar(), host.firstChild);
    }

    if (!['list', 'grid'].includes(RhythiaX.scoresView)) {
      RhythiaX.scoresView = localStorage.getItem(service.storageKey) || 'list';
    }
    service.prepare();

    const hydrate = () => {
      if (document.querySelector('.rhythiax-scores-toolbar')) apply();
    };
    if (options.immediate) hydrate();
    else if (window.requestIdleCallback) window.requestIdleCallback(hydrate, { timeout: 1000 });
    else window.setTimeout(hydrate, 0);
  }

  RhythiaX.ScoresToolsView = { inject, apply };
})();
