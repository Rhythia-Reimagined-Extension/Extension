// Inline access to the native friends page from the signed-in player's profile.
var RhythiaX = RhythiaX || {};

(function () {
  const triggerSelector = '.rhythiax-friends-quick-trigger';
  const panelSelector = '.rhythiax-friends-quick-panel';
  const OFFICIAL_HOSTS = new Set(['rhythia.com', 'www.rhythia.com']);
  let activeReturnFocus = null;
  let closeTimeout = null;
  let panelKeyDownHandler = null;

  function isOwnProfile() {
    const ownProfileLink = RhythiaX.qsa('a[href^="/player/"]').find(link => /my profile/i.test(link.textContent || ''));
    const ownPath = ownProfileLink?.getAttribute('href');
    return Boolean(ownPath && ownPath === window.location.pathname);
  }

  function getNativeCounter() {
    const candidates = RhythiaX.qsa('#root div').filter(element => (
      element.querySelector('svg.lucide-users-round')
      && /^\d+\s+friends?$/i.test(element.textContent.trim())
    ));
    // The action bar can also match because the settings icon has no text.
    // Use its innermost matching child so replacing the counter never removes
    // the native profile-settings control beside it.
    return candidates.find(element => !candidates.some(candidate => candidate !== element && element.contains(candidate)));
  }

  function finishClosePanel(panel) {
    if (closeTimeout) {
      clearTimeout(closeTimeout);
      closeTimeout = null;
    }
    if (panelKeyDownHandler) {
      document.removeEventListener('keydown', panelKeyDownHandler, true);
      panelKeyDownHandler = null;
    }
    panel.remove();
    if (activeReturnFocus?.isConnected && typeof activeReturnFocus.focus === 'function') {
      activeReturnFocus.focus();
    }
    activeReturnFocus = null;
  }

  function closePanel() {
    const panel = document.querySelector(panelSelector);
    const trigger = document.querySelector(triggerSelector);
    if (!panel) return;
    panel.classList.remove('is-open');
    trigger?.setAttribute('aria-expanded', 'false');
    if (closeTimeout) {
      clearTimeout(closeTimeout);
    }
    closeTimeout = window.setTimeout(() => finishClosePanel(panel), 180);
  }

  function handlePanelKeyDown(event) {
    const panel = document.querySelector(panelSelector);
    if (!panel) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      closePanel();
      return;
    }
    if (event.key === 'Tab') {
      const windowEl = panel.querySelector('.rhythiax-friends-quick-window') || panel;
      RhythiaX.trapFocus?.(windowEl, event);
    }
  }

  function isOfficialRhythiaOrigin() {
    return window.location.protocol === 'https:' && OFFICIAL_HOSTS.has(window.location.hostname.toLowerCase());
  }

  function avatarUrl(value) {
    try {
      const url = new URL(String(value || ''), window.location.origin);
      return url.protocol === 'https:' && OFFICIAL_HOSTS.has(url.hostname.toLowerCase()) ? url.href : '';
    } catch (_) {
      return '';
    }
  }

  async function loadFriends() {
    if (!isOfficialRhythiaOrigin()) throw new Error('Friends are available only on an official Rhythia host');
    const session = localStorage.getItem('rhythia_auth_session_v1') || '';
    if (!session) throw new Error('No Rhythia session is available');
    const response = await fetch('https://production.rhythia.com/api/getFriends', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
      body: JSON.stringify({ session }),
    });
    if (!response.ok) throw new Error(`Friends request failed: ${response.status}`);
    const data = await response.json();
    if (data.error || !Array.isArray(data.friends)) throw new Error(data.error || 'Invalid friends response');
    return data.friends;
  }

  function renderFriends(panel, friends) {
    const content = panel.querySelector('.rhythiax-friends-quick-content');
    if (!content) return;
    content.textContent = '';
    if (!friends.length) {
      const empty = document.createElement('p');
      empty.className = 'rhythiax-friends-quick-empty';
      empty.textContent = 'You have not added any friends yet.';
      content.appendChild(empty);
      return;
    }
    friends.forEach(friend => {
      const id = String(friend.id || '');
      if (!/^\d+$/.test(id)) return;
      const name = friend.username || 'Unknown player';
      const flag = /^[A-Z]{2}$/i.test(String(friend.flag || '')) ? String(friend.flag).toUpperCase() : '';
      const avatar = avatarUrl(friend.avatar_url || friend.profile_image || '');
      const status = friend.is_online ? 'Online' : 'Offline';

      const card = document.createElement('a');
      card.className = 'rhythiax-friends-quick-card';
      card.href = `/player/${id}`;
      card.addEventListener('click', () => {
        closePanel();
      });

      if (avatar) {
        const avatarImg = document.createElement('img');
        avatarImg.className = 'rhythiax-friends-quick-avatar';
        avatarImg.src = avatar;
        avatarImg.alt = '';
        card.appendChild(avatarImg);
      }

      const playerSpan = document.createElement('span');
      playerSpan.className = 'rhythiax-friends-quick-player';
      const nameStrong = document.createElement('strong');
      nameStrong.textContent = name;
      playerSpan.appendChild(nameStrong);

      const small = document.createElement('small');
      if (flag) {
        const flagImg = document.createElement('img');
        flagImg.src = `/flags/${flag}.svg`;
        flagImg.alt = flag;
        small.appendChild(flagImg);
      }
      small.appendChild(document.createTextNode(flag || 'Unknown region'));
      playerSpan.appendChild(small);

      const statusSpan = document.createElement('span');
      statusSpan.className = `rhythiax-friends-quick-status ${friend.is_online ? 'is-online' : ''}`.trim();
      statusSpan.textContent = status;

      card.append(playerSpan, statusSpan);
      content.appendChild(card);
    });
  }

  function openPanel(trigger) {
    const existing = document.querySelector(panelSelector);
    if (existing) {
      closePanel();
      return;
    }

    activeReturnFocus = trigger || (document.activeElement instanceof HTMLElement ? document.activeElement : null);

    const panel = document.createElement('section');
    panel.className = 'rhythiax-friends-quick-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-label', 'Your friends');
    panel.innerHTML = '<div class="rhythiax-friends-quick-backdrop"></div><div class="rhythiax-friends-quick-window"><div class="rhythiax-friends-quick-header"><div><p>Your friends</p><strong>Friends list</strong></div><button type="button" class="rhythiax-friends-quick-close" aria-label="Close friends list">&times;</button></div><div class="rhythiax-friends-quick-content" aria-live="polite"><p class="rhythiax-friends-quick-loading">Loading friends...</p></div></div>';
    document.body.appendChild(panel);
    trigger?.setAttribute('aria-expanded', 'true');
    requestAnimationFrame(() => panel.classList.add('is-open'));
    panel.querySelector('.rhythiax-friends-quick-close')?.focus();
    panel.querySelector('.rhythiax-friends-quick-close')?.addEventListener('click', closePanel);
    panel.querySelector('.rhythiax-friends-quick-backdrop')?.addEventListener('click', closePanel);

    panelKeyDownHandler = handlePanelKeyDown;
    document.addEventListener('keydown', panelKeyDownHandler, true);

    const route = window.location.pathname;
    loadFriends().then(friends => {
      if (!panel.isConnected || window.location.pathname !== route) return;
      renderFriends(panel, friends);
    }).catch(error => {
      if (!panel.isConnected || window.location.pathname !== route) return;
      RhythiaX.captureError(error, 'Friends list loading failed');
      const content = panel.querySelector('.rhythiax-friends-quick-content');
      if (content) {
        content.textContent = '';
        const empty = document.createElement('p');
        empty.className = 'rhythiax-friends-quick-empty';
        empty.textContent = 'Could not load your friends. Please try again.';
        content.appendChild(empty);
      }
    });
  }

  RhythiaX.enhanceOwnFriendsCounter = function () {
    if (!isOwnProfile()) return;
    const counter = getNativeCounter();
    if (!counter || counter.matches(triggerSelector)) return;

    const count = counter.textContent.trim().match(/^(\d+)/)?.[1];
    if (!count) return;
    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'rhythiax-friends-quick-trigger';
    trigger.setAttribute('aria-label', `Show ${count} friends`);
    trigger.setAttribute('aria-expanded', 'false');
    const svg = counter.querySelector('svg');
    if (svg) {
      trigger.appendChild(svg.cloneNode(true));
    }
    const countSpan = document.createElement('span');
    countSpan.textContent = count;
    trigger.appendChild(countSpan);
    counter.replaceWith(trigger);
  };

  function cleanupFriendsQuickList() {
    if (closeTimeout) {
      clearTimeout(closeTimeout);
      closeTimeout = null;
    }
    if (panelKeyDownHandler) {
      document.removeEventListener('keydown', panelKeyDownHandler, true);
      panelKeyDownHandler = null;
    }
    const panels = document.querySelectorAll(panelSelector);
    panels.forEach(p => p.remove());
    const backdrops = document.querySelectorAll('.rhythiax-friends-quick-backdrop');
    backdrops.forEach(b => {
      if (b.isConnected) b.remove();
    });
    const triggers = document.querySelectorAll(triggerSelector);
    triggers.forEach(t => t.setAttribute('aria-expanded', 'false'));
    activeReturnFocus = null;
  }

  RhythiaX.cleanupFriendsQuickList = cleanupFriendsQuickList;
  RhythiaX.closeFriendsQuickPanel = closePanel;

  document.addEventListener('click', event => {
    const trigger = event.target.closest(triggerSelector);
    if (!trigger) return;
    event.preventDefault();
    openPanel(trigger);
  });

  window.addEventListener('popstate', cleanupFriendsQuickList);
})();
