// Inline access to the native friends page from the signed-in player's profile.
var RhythiaX = RhythiaX || {};

(function () {
  const triggerSelector = '.rhythiax-friends-quick-trigger';
  const panelSelector = '.rhythiax-friends-quick-panel';
  const OFFICIAL_HOSTS = new Set(['rhythia.com', 'www.rhythia.com']);
  let activeReturnFocus = null;
  let activeTrigger = null;
  let updatePositionHandler = null;
  let closeTimeout = null;
  let panelKeyDownHandler = null;

  function isOwnProfile() {
    const page = document.body.getAttribute('data-rhythiax-page');
    if (page && page !== 'player') return false;
    if (!window.location.pathname.startsWith('/player/')) return false;

    // In Rhythia, any profile that renders a counter with "\d+ friends" is the signed-in player's own profile
    if (getNativeCounter()) return true;

    // Check for any element containing friends counter outside header/nav
    const all = document.querySelectorAll('#root a, #root button, #root div');
    for (const el of all) {
      if (el.closest('.fixed.top-0, nav, header')) continue;
      if (/^\d+\s+friends?$/i.test(el.textContent.trim())) return true;
    }

    if (document.querySelector('button[aria-label*="setting" i], button:has(svg.lucide-settings), button:has(img[src*="settingsicon"])')) {
      return true;
    }
    return false;
  }

  function getNativeCounter() {
    const selector = '#root a, #root button, #root div';
    const candidates = Array.from(document.querySelectorAll(selector)).filter(element => {
      if (element.closest('.fixed.top-0, nav, header')) return false;
      const text = element.textContent.trim();
      if (!/^\d+\s+friends?$/i.test(text)) return false;
      return Boolean(element.querySelector('svg, img'));
    });
    // Inner-most matching element
    return candidates.find(element => !candidates.some(candidate => candidate !== element && element.contains(candidate)));
  }

  function findFriendsTrigger(target) {
    if (!target || typeof target.closest !== 'function') return null;
    // Never intercept clicks inside the quick panel itself
    if (target.closest('.rhythiax-friends-quick-window')) return null;

    // 1. Explicit class added by enhanceOwnFriendsCounter
    const enhanced = target.closest(triggerSelector);
    if (enhanced) return enhanced;

    // 2. Clicked on or inside the native counter
    const nativeCounter = getNativeCounter();
    if (nativeCounter && (target === nativeCounter || nativeCounter.contains(target))) {
      return nativeCounter;
    }

    // 3. Fallback: interactive element whose text strictly matches "\d+ friends"
    const candidate = target.closest('a, button, [role="button"]');
    if (candidate && !candidate.closest('.fixed.top-0, nav, header')) {
      const text = candidate.textContent.trim();
      if (/^\d+\s+friends?$/i.test(text) && candidate.querySelector('svg, img')) {
        return candidate;
      }
    }

    return null;
  }

  function removePositionListeners() {
    if (updatePositionHandler) {
      window.removeEventListener('scroll', updatePositionHandler, true);
      window.removeEventListener('resize', updatePositionHandler);
      updatePositionHandler = null;
    }
  }

  function positionWindow(windowEl, trigger) {
    if (!windowEl) return;
    const panelWidth = 340;
    const margin = 12;

    if (!trigger || !trigger.isConnected) {
      windowEl.style.top = '100px';
      windowEl.style.right = '24px';
      windowEl.style.left = 'auto';
      return;
    }

    const triggerRect = trigger.getBoundingClientRect();
    // Anchor to button container if available (e.g. flex row with settings button)
    const group = trigger.parentElement && trigger.parentElement.matches('.flex, .flex-row, [class*="flex"]')
      ? trigger.parentElement
      : trigger;
    const anchorRect = group.getBoundingClientRect();

    let left, top;
    const spaceRight = window.innerWidth - anchorRect.right;
    const spaceLeft = anchorRect.left;

    // Preference 1: To the right of the profile controls ("na prawo np od profilu")
    if (spaceRight >= panelWidth + margin) {
      left = anchorRect.right + margin;
      top = anchorRect.top;
      const maxTop = window.innerHeight - 440 - margin;
      if (top > maxTop && maxTop > margin) {
        top = maxTop;
      }
    } else if (spaceLeft >= panelWidth + margin) {
      // Preference 2: To the left of the anchor
      left = anchorRect.left - panelWidth - margin;
      top = anchorRect.top;
    } else {
      // Fallback for narrow viewports: drop below trigger
      left = Math.max(margin, Math.min(triggerRect.left, window.innerWidth - panelWidth - margin));
      top = triggerRect.bottom + margin;
    }

    // Viewport clamping
    top = Math.max(margin, Math.min(top, window.innerHeight - 160));
    left = Math.max(margin, Math.min(left, window.innerWidth - panelWidth - margin));

    windowEl.style.top = `${Math.round(top)}px`;
    windowEl.style.left = `${Math.round(left)}px`;
    windowEl.style.right = 'auto';
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
    removePositionListeners();
    panel.remove();
    if (activeReturnFocus?.isConnected && typeof activeReturnFocus.focus === 'function') {
      activeReturnFocus.focus();
    }
    activeReturnFocus = null;
    activeTrigger = null;
  }

  function closePanel() {
    const panel = document.querySelector(panelSelector);
    const trigger = document.querySelector(triggerSelector);
    if (!panel) return;
    panel.style.setProperty('opacity', '0', 'important');
    panel.style.setProperty('pointer-events', 'none', 'important');
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
    if (!value) return '/unkimg.png';
    try {
      const url = new URL(String(value), window.location.origin);
      if (url.protocol === 'https:' || url.protocol === 'http:') {
        return url.href;
      }
      if (String(value).startsWith('/')) return String(value);
      return '/unkimg.png';
    } catch (_) {
      return '/unkimg.png';
    }
  }

  function getRhythiaAuthToken() {
    // 1. Direct legacy session key
    const legacy = localStorage.getItem('rhythia_auth_session_v1');
    if (legacy && legacy.trim()) return legacy.trim();

    // 2. Supabase auth token keys (e.g. sb-pfkajngbllcbdzoylrvp-auth-token)
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key) continue;
        if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
          const raw = localStorage.getItem(key);
          if (!raw) continue;
          const parsed = JSON.parse(raw);
          const token = parsed?.access_token || parsed?.session?.access_token || (Array.isArray(parsed) && parsed[0]?.access_token);
          if (typeof token === 'string' && token.length > 10) {
            return token;
          }
        }
      }
    } catch (_) {}

    // 3. Fallback: inspect any key with access_token
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key || key.startsWith('rhythiax')) continue;
        const raw = localStorage.getItem(key);
        if (raw && raw.includes('access_token')) {
          const parsed = JSON.parse(raw);
          const token = parsed?.access_token || parsed?.session?.access_token;
          if (typeof token === 'string' && token.length > 10) {
            return token;
          }
        }
      }
    } catch (_) {}

    return '';
  }

  async function loadFriends() {
    if (!isOfficialRhythiaOrigin()) throw new Error('Friends are available only on an official Rhythia host');
    const session = getRhythiaAuthToken();
    if (!session) throw new Error('No Rhythia session found. Please make sure you are signed in.');
    const response = await fetch('https://production.rhythia.com/api/getFriends', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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

    const headerTitle = panel.querySelector('.rhythiax-friends-quick-header strong');
    if (headerTitle) {
      headerTitle.textContent = `Friends list (${friends.length})`;
    }

    if (!friends.length) {
      const empty = document.createElement('div');
      empty.className = 'rhythiax-friends-quick-empty';
      empty.innerHTML = `
        <p>You have not added any friends yet.</p>
        <a href="/friends" class="rhythiax-friends-quick-cta-btn">Manage friends on /friends</a>
      `;
      content.appendChild(empty);
      return;
    }
    friends.forEach(friend => {
      const id = String(friend.id || '');
      if (!/^\d+$/.test(id)) return;
      const name = friend.username || 'Unknown player';
      const flag = /^[A-Z]{2}$/i.test(String(friend.flag || '')) ? String(friend.flag).toUpperCase() : '';
      const avatar = avatarUrl(friend.avatar_url || friend.profile_image || '');
      const isOnline = Boolean(friend.is_online);
      const status = isOnline ? 'Online' : 'Offline';

      const card = document.createElement('a');
      card.className = 'rhythiax-friends-quick-card';
      card.href = `/player/${id}`;
      card.setAttribute('title', `View ${name}'s profile`);
      card.addEventListener('click', () => {
        closePanel();
      });

      if (avatar) {
        const avatarImg = document.createElement('img');
        avatarImg.className = 'rhythiax-friends-quick-avatar';
        avatarImg.src = avatar;
        avatarImg.alt = '';
        avatarImg.onerror = () => {
          avatarImg.onerror = null;
          avatarImg.src = '/unkimg.png';
        };
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
      statusSpan.className = `rhythiax-friends-quick-status ${isOnline ? 'is-online' : ''}`.trim();
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
    activeTrigger = trigger;

    const panel = document.createElement('section');
    panel.className = 'rhythiax-friends-quick-panel is-open';
    panel.style.setProperty('background', 'transparent', 'important');
    panel.style.setProperty('background-color', 'transparent', 'important');
    panel.style.setProperty('border', 'none', 'important');
    panel.style.setProperty('box-shadow', 'none', 'important');
    panel.style.setProperty('opacity', '1', 'important');
    panel.style.setProperty('pointer-events', 'auto', 'important');
    panel.innerHTML = '<div class="rhythiax-friends-quick-backdrop" style="background: transparent !important; background-color: transparent !important; border: none !important; box-shadow: none !important; pointer-events: auto !important;"></div><div class="rhythiax-friends-quick-window" role="dialog" aria-modal="true" aria-label="Friends list" style="pointer-events: auto !important; z-index: 2147483647 !important;"><div class="rhythiax-friends-quick-header"><div class="rhythiax-friends-quick-title-wrap"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg><strong>Friends list</strong></div><div class="rhythiax-friends-quick-actions"><a href="/friends" class="rhythiax-friends-quick-extlink" title="Open friends page">/friends &rarr;</a><button type="button" class="rhythiax-friends-quick-close" aria-label="Close friends list">&times;</button></div></div><div class="rhythiax-friends-quick-content" aria-live="polite"><p class="rhythiax-friends-quick-loading">Loading friends...</p></div></div>';
    document.body.appendChild(panel);
    trigger?.setAttribute('aria-expanded', 'true');

    const windowEl = panel.querySelector('.rhythiax-friends-quick-window');
    positionWindow(windowEl, activeTrigger);

    removePositionListeners();
    updatePositionHandler = () => {
      const p = document.querySelector(panelSelector);
      const win = p?.querySelector('.rhythiax-friends-quick-window');
      if (p && win && activeTrigger?.isConnected) {
        positionWindow(win, activeTrigger);
      }
    };
    window.addEventListener('scroll', updatePositionHandler, { passive: true, capture: true });
    window.addEventListener('resize', updatePositionHandler, { passive: true });

    panel.querySelector('.rhythiax-friends-quick-close')?.focus();
    panel.querySelector('.rhythiax-friends-quick-close')?.addEventListener('click', closePanel);
    panel.querySelector('.rhythiax-friends-quick-backdrop')?.addEventListener('click', closePanel);

    panelKeyDownHandler = handlePanelKeyDown;
    document.addEventListener('keydown', panelKeyDownHandler, true);

    const route = window.location.pathname;
    const fetchFriends = () => {
      loadFriends().then(friends => {
        if (!panel.isConnected || window.location.pathname !== route) return;
        renderFriends(panel, friends);
        positionWindow(windowEl, activeTrigger);
      }).catch(error => {
        if (!panel.isConnected || window.location.pathname !== route) return;
        RhythiaX.captureError(error, 'Friends list loading failed');
        const content = panel.querySelector('.rhythiax-friends-quick-content');
        if (content) {
          content.textContent = '';
          const empty = document.createElement('div');
          empty.className = 'rhythiax-friends-quick-empty rhythiax-friends-quick-error';
          empty.innerHTML = `
            <p>Could not load friends list automatically.</p>
            <div class="rhythiax-friends-quick-error-actions">
              <a href="/friends" class="rhythiax-friends-quick-cta-btn">Open /friends</a>
              <button type="button" class="rhythiax-friends-quick-retry-btn">Try again</button>
            </div>
          `;
          empty.querySelector('.rhythiax-friends-quick-retry-btn')?.addEventListener('click', () => {
            content.innerHTML = '<p class="rhythiax-friends-quick-loading">Loading friends...</p>';
            fetchFriends();
          });
          content.appendChild(empty);
          positionWindow(windowEl, activeTrigger);
        }
      });
    };

    fetchFriends();
  }

  RhythiaX.enhanceOwnFriendsCounter = function () {
    if (!isOwnProfile()) return;
    const counter = getNativeCounter();
    if (!counter) return;

    // Neutralize any ancestor link to prevent browser or framework navigation
    const link = counter.closest('a') || (counter.tagName === 'A' ? counter : null);
    if (link) {
      if (link.hasAttribute('href')) {
        link.setAttribute('data-rhythiax-orig-href', link.getAttribute('href') || '/friends');
        link.removeAttribute('href');
      }
      link.setAttribute('role', 'button');
      link.setAttribute('tabindex', '0');
      link.style.cursor = 'pointer';
      if (!link._rhythiaxFriendsBound) {
        link._rhythiaxFriendsBound = true;
        link.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();
          openPanel(link);
        });
      }
    }

    if (!counter.matches(triggerSelector)) {
      counter.classList.add('rhythiax-friends-quick-trigger');
      counter.setAttribute('role', 'button');
      counter.setAttribute('tabindex', '0');
      counter.setAttribute('aria-label', 'Show friends list');
      counter.setAttribute('aria-expanded', 'false');
      counter.style.cursor = 'pointer';
      if (!counter._rhythiaxFriendsBound) {
        counter._rhythiaxFriendsBound = true;
        counter.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();
          openPanel(counter);
        });
      }
    }
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
    removePositionListeners();
    const panels = document.querySelectorAll(panelSelector);
    panels.forEach(p => p.remove());
    const backdrops = document.querySelectorAll('.rhythiax-friends-quick-backdrop');
    backdrops.forEach(b => {
      if (b.isConnected) b.remove();
    });
    const triggers = document.querySelectorAll(triggerSelector);
    triggers.forEach(t => t.setAttribute('aria-expanded', 'false'));
    activeReturnFocus = null;
    activeTrigger = null;
  }

  RhythiaX.cleanupFriendsQuickList = cleanupFriendsQuickList;
  RhythiaX.closeFriendsQuickPanel = closePanel;

  function handleTriggerInteraction(event) {
    const trigger = findFriendsTrigger(event.target);
    if (!trigger) return;

    // Completely halt event propagation so React and browser link handlers never see it
    event.preventDefault();
    event.stopPropagation();
    if (typeof event.stopImmediatePropagation === 'function') {
      event.stopImmediatePropagation();
    }

    openPanel(trigger);
  }

  // Intercept click in CAPTURE phase at window level
  window.addEventListener('click', handleTriggerInteraction, true);

  window.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') {
      const trigger = findFriendsTrigger(event.target);
      if (trigger && (document.activeElement === trigger || trigger.contains(document.activeElement))) {
        event.preventDefault();
        event.stopPropagation();
        if (typeof event.stopImmediatePropagation === 'function') {
          event.stopImmediatePropagation();
        }
        openPanel(trigger);
      }
    }
  }, true);

  window.addEventListener('popstate', cleanupFriendsQuickList);
})();
