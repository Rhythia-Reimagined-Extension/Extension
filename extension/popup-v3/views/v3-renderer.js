function render() {
  const markup = state.route === 'about' ? aboutScreen() : state.route === 'data' ? dataScreen() : state.route === 'profile-detail' ? profileScreen() : state.route === 'overview' ? overview() : state.route.startsWith('module:') ? moduleScreen(state.route.slice(7)) : category(state.route);
  screen.innerHTML = `${markup}${confirmationMarkup()}`;
  const modal = screen.querySelector('[role="dialog"]');
  if (modal) {
    const title = modal.querySelector('h3');
    const description = modal.querySelector('p');
    if (title) { title.id = 'v3-modal-title'; modal.setAttribute('aria-labelledby', title.id); }
    if (description) { description.id = 'v3-modal-description'; modal.setAttribute('aria-describedby', description.id); }
    (modal.querySelector('[data-v3-modal-initial-focus]') || modal.querySelector('button, input, select, textarea, [href]'))?.focus();
  } else if (state.modalReturnFocus?.isConnected) {
    state.modalReturnFocus.focus();
    state.modalReturnFocus = null;
  }
  syncWhitelistActions();
  const popup = document.querySelector('.popup');
  if (popup) { popup.dataset.theme = state.theme; popup.dataset.size = state.size; }
  nav.querySelectorAll('[data-v3-route]').forEach(button => {
    const selected = state.route === 'overview' ? 'overview' : state.route === 'about' ? 'about' : state.route === 'data' || state.route === 'profile-detail' ? 'data' : state.route.startsWith('module:') ? MODULES[state.route.slice(7)]?.category : state.route;
    button.classList.toggle('is-selected', button.dataset.v3Route === selected);
    button.toggleAttribute('aria-current', button.dataset.v3Route === selected);
  });
  syncSizeLabels();
}

function syncSizeLabels() {
  const defaultButton = screen.querySelector('[data-v3-size="default"] small');
  const largeButton = screen.querySelector('[data-v3-size="large"] small');
  if (defaultButton) defaultButton.textContent = '375 x 575';
  if (largeButton) largeButton.textContent = '425 x 600';
}

function syncWhitelistActions() {
  const list = screen.querySelector('.v3-whitelist-list');
  const entries = state.dataSettings?.whitelist || [];
  if (!list || !entries.length) return;
  [...list.querySelectorAll(':scope > span')].forEach((label, index) => {
    const entry = entries[index];
    if (!entry) return;
    const row = document.createElement('div');
    row.className = 'v3-whitelist-entry';
    row.appendChild(label);
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'v3-small-action v3-whitelist-remove';
    remove.dataset.v3WhitelistRemove = String(index);
    remove.textContent = 'Remove';
    remove.setAttribute('aria-label', `Remove ${entry.username || entry.id || 'profile'} from whitelist`);
    row.appendChild(remove);
    list.appendChild(row);
  });
}
