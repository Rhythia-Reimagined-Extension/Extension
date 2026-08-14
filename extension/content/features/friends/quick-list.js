// Inline access to the native friends page from the signed-in player's profile.
var RhythiaX = RhythiaX || {};

(function () {
  const triggerSelector = '.rhythiax-friends-quick-trigger';
  const panelSelector = '.rhythiax-friends-quick-panel';
  const OFFICIAL_HOSTS = new Set(['rhythia.com', 'www.rhythia.com']);

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

  function closePanel() {
    const panel = document.querySelector(panelSelector);
    const trigger = document.querySelector(triggerSelector);
    if (!panel) return;
    panel.classList.remove('is-open');
    trigger?.setAttribute('aria-expanded', 'false');
    window.setTimeout(() => panel.remove(), 180);
  }

  function escapeHtml(value) {
    const element = document.createElement('span');
    element.textContent = String(value || '');
    return element.innerHTML;
  }

  function escapeAttribute(value) {
    return escapeHtml(value).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
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
    if (!friends.length) {
      content.innerHTML = '<p class="rhythiax-friends-quick-empty">You have not added any friends yet.</p>';
      return;
    }
    content.innerHTML = friends.map(friend => {
      const name = escapeHtml(friend.username || 'Unknown player');
      const flag = /^[A-Z]{2}$/i.test(String(friend.flag || '')) ? String(friend.flag).toUpperCase() : '';
      const avatar = avatarUrl(friend.avatar_url || friend.profile_image || '');
      const status = friend.is_online ? 'Online' : 'Offline';
      const id = String(friend.id || '');
      if (!/^\d+$/.test(id)) return '';
      return `<a class="rhythiax-friends-quick-card" href="/player/${id}">${avatar ? `<img class="rhythiax-friends-quick-avatar" src="${escapeAttribute(avatar)}" alt="">` : ''}<span class="rhythiax-friends-quick-player"><strong>${name}</strong><small>${flag ? `<img src="/flags/${flag}.svg" alt="${flag}">` : ''}${flag || 'Unknown region'}</small></span><span class="rhythiax-friends-quick-status ${friend.is_online ? 'is-online' : ''}">${status}</span></a>`;
    }).join('');
  }

  function openPanel(trigger) {
    const existing = document.querySelector(panelSelector);
    if (existing) {
      closePanel();
      return;
    }

    const panel = document.createElement('section');
    panel.className = 'rhythiax-friends-quick-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-label', 'Your friends');
    panel.innerHTML = '<div class="rhythiax-friends-quick-backdrop"></div><div class="rhythiax-friends-quick-window"><div class="rhythiax-friends-quick-header"><div><p>Your friends</p><strong>Friends list</strong></div><button type="button" class="rhythiax-friends-quick-close" aria-label="Close friends list">&times;</button></div><div class="rhythiax-friends-quick-content" aria-live="polite"><p class="rhythiax-friends-quick-loading">Loading friends...</p></div></div>';
    document.body.appendChild(panel);
    trigger.setAttribute('aria-expanded', 'true');
    requestAnimationFrame(() => panel.classList.add('is-open'));
    panel.querySelector('.rhythiax-friends-quick-close').focus();
    panel.querySelector('.rhythiax-friends-quick-close').addEventListener('click', closePanel);
    panel.querySelector('.rhythiax-friends-quick-backdrop').addEventListener('click', closePanel);
    const route = window.location.pathname;
    loadFriends().then(friends => {
      if (!panel.isConnected || window.location.pathname !== route) return;
      renderFriends(panel, friends);
    }).catch(error => {
      if (!panel.isConnected || window.location.pathname !== route) return;
      RhythiaX.captureError(error, 'Friends list loading failed');
      const content = panel.querySelector('.rhythiax-friends-quick-content');
      if (content) content.innerHTML = '<p class="rhythiax-friends-quick-empty">Could not load your friends. Please try again.</p>';
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
    trigger.innerHTML = `${counter.querySelector('svg')?.outerHTML || ''}<span>${count}</span>`;
    counter.replaceWith(trigger);
  };

  document.addEventListener('click', event => {
    const trigger = event.target.closest(triggerSelector);
    if (!trigger) return;
    event.preventDefault();
    openPanel(trigger);
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closePanel();
  });
})();
