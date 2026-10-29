// =============================================
// Reimagined for Rhythia - Player Compare: View & UI
// =============================================

var RhythiaX = RhythiaX || {};

(function () {
  const store = RhythiaX.CompareStore;
  const loader = RhythiaX.CompareLoader;
  const metrics = RhythiaX.CompareMetrics;
  const template = RhythiaX.CompareTemplate;
  const MAX_PLAYERS = 2;

  let activeProfilePlayer = null;
  let trayCloseTimer = null;

  // --- Modal Cleanup Helper ---
  let activeModalKeyHandler = null;

  function cleanupModal() {
    if (activeModalKeyHandler) {
      document.removeEventListener('keydown', activeModalKeyHandler);
      activeModalKeyHandler = null;
    }
    document.querySelectorAll('.rhythiax-compare-modal').forEach(el => el.remove());
  }

  function cleanup() {
    cleanupModal();
    if (trayCloseTimer) {
      clearTimeout(trayCloseTimer);
      trayCloseTimer = null;
    }
    document.querySelectorAll('.rhythiax-compare-tray').forEach(el => el.remove());
    document.querySelectorAll('.rhythiax-compare-profile-button').forEach(btn => btn.remove());
    document.querySelectorAll('.rhythiax-compare-modal').forEach(el => el.remove());
  }

  // --- Profile Page Compare Button Injection ---

  function compareButton(player) {
    if (!RhythiaX.isModuleEnabled('playerCompare')) {
      cleanup();
      return;
    }
    if (player) activeProfilePlayer = player;

    const friendButtons = [...document.querySelectorAll('button')].filter(btn => {
      const meta = [btn.textContent, btn.getAttribute('aria-label'), btn.getAttribute('title')].join(' ').trim();
      return /^(?:add\s+)?friends?\b/i.test(meta) || btn.querySelector('svg.lucide-user-round-plus, svg.lucide-users-round');
    });

    const settingsButtons = [...document.querySelectorAll('button')].filter(btn => {
      const label = btn.getAttribute('aria-label') || btn.getAttribute('title') || '';
      return /^settings$/i.test(label) || [...btn.querySelectorAll('img')].some(img => /settings(?:icon)?\.png/i.test(img.src));
    });

    const friendCounterCandidates = [...document.querySelectorAll('#root div, div')].filter(element => (
      element.querySelector('svg.lucide-users-round')
      && /^\d+(?:\s+friends?)?$/i.test(element.textContent.trim())
    ));
    const friendCounters = friendCounterCandidates.filter(element => !friendCounterCandidates.some(candidate => candidate !== element && element.contains(candidate)));

    const targets = friendButtons.length ? friendButtons : (settingsButtons.length ? settingsButtons : friendCounters);
    if (!targets.length) return;

    targets.forEach(target => {
      const parent = target.parentElement;
      if (!parent || parent.querySelector('.rhythiax-compare-profile-button')) return;

      const button = document.createElement('button');
      button.className = 'rhythiax-compare-profile-button';
      button.type = 'button';
      button.innerHTML = '<span>Compare</span>';

      button.addEventListener('click', async event => {
        event.stopPropagation();
        const currentItem = loader.currentPlayer(activeProfilePlayer || player);
        if (!currentItem.id) return;
        const list = await store.update(items => {
          const exists = items.some(entry => entry.id === currentItem.id);
          if (exists) {
            return items.filter(entry => entry.id !== currentItem.id);
          }
          const filtered = items.filter(entry => entry.id !== currentItem.id);
          return [...filtered, currentItem].slice(-MAX_PLAYERS);
        });
        renderTray();
        updateButtonStates(list);
        if (!currentItem.avatar || !currentItem.globalRank) {
          loader.hydrateProfileMeta(currentItem).then(renderTray);
        }
      });

      parent.insertBefore(button, target);
      store.read().then(updateButtonStates);
    });
  }

  function updateButtonStates(list) {
    const currentId = String(loader.playerId());
    const isAdded = (list || []).some(entry => entry.id === currentId);
    document.querySelectorAll('.rhythiax-compare-profile-button').forEach(btn => {
      btn.classList.toggle('is-active', isAdded);
      btn.title = isAdded ? 'Remove from compare' : 'Add to compare';
      const label = btn.querySelector('span');
      if (label) label.textContent = isAdded ? 'Added' : 'Compare';
    });
  }

  // --- Bottom-Right Tray: Proposal B (Segmented Command Bar) ---

  function closeTray(tray) {
    if (!tray || tray.hidden || tray.classList.contains('is-closing')) return;
    tray.classList.add('is-closing');
    if (trayCloseTimer) clearTimeout(trayCloseTimer);
    trayCloseTimer = setTimeout(() => {
      tray.hidden = true;
      tray.classList.remove('is-closing');
      tray.innerHTML = '';
    }, 200);
  }

  function renderTray() {
    if (!RhythiaX.isModuleEnabled('playerCompare')) {
      cleanup();
      return;
    }
    // Never over Exodus: the tray comes back when the page is handed back (below).
    if (RhythiaX.ClassicIdle?.isSuspended?.()) return;

    let tray = document.querySelector('.rhythiax-compare-tray');
    if (!tray) {
      tray = document.createElement('aside');
      tray.className = 'rhythiax-compare-tray';
      tray.hidden = true;
      document.body.appendChild(tray);
    }

    store.read().then(list => {
      if (!tray.isConnected) return;
      updateButtonStates(list);

      if (!list.length) {
        closeTray(tray);
        return;
      }

      if (trayCloseTimer) clearTimeout(trayCloseTimer);
      tray.classList.remove('is-closing');
      tray.hidden = false;
      tray.innerHTML = '';

      // Counter pill (e.g. 1/2 or 2/2)
      const counter = document.createElement('div');
      counter.className = 'rhythiax-tray-counter';
      counter.innerHTML = `<b>${list.length}/${MAX_PLAYERS}</b>`;
      tray.appendChild(counter);

      // Chips cluster
      const chipsCluster = document.createElement('div');
      chipsCluster.className = 'rhythiax-tray-chips';

      list.forEach((item, index) => {
        const chip = document.createElement('div');
        chip.className = 'rhythiax-tray-chip';

        const avatar = document.createElement('div');
        avatar.className = 'rhythiax-tray-avatar';
        avatar.innerHTML = template.getAvatarHtml(item, index === 1);

        const meta = document.createElement('div');
        meta.className = 'rhythiax-tray-meta';
        const rankText = item.globalRank ? (item.globalRank.startsWith('#') ? item.globalRank : '#' + item.globalRank) + ' Global' : '#— Global';
        meta.innerHTML = `<span class="rhythiax-tray-name">${RhythiaX.escapeHtml(item.username)}</span><span class="rhythiax-tray-rank">${RhythiaX.escapeHtml(rankText)}</span>`;

        // Asynchronously hydrate avatar and rank if missing
        if (!item.avatar || !item.globalRank) {
          loader.hydrateProfileMeta(item).then(updated => {
            if (!chip.isConnected || !updated) return;
            if (updated.avatar) avatar.innerHTML = template.getAvatarHtml(updated, index === 1);
            if (updated.globalRank) {
              const rEl = meta.querySelector('.rhythiax-tray-rank');
              if (rEl) rEl.textContent = (updated.globalRank.startsWith('#') ? updated.globalRank : '#' + updated.globalRank) + ' Global';
            }
          });
        }

        const dismissBtn = document.createElement('button');
        dismissBtn.className = 'rhythiax-tray-dismiss-btn';
        dismissBtn.type = 'button';
        dismissBtn.title = `Remove ${item.username}`;
        dismissBtn.setAttribute('aria-label', `Remove ${item.username}`);
        dismissBtn.innerHTML = `<svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
        dismissBtn.addEventListener('click', e => {
          e.stopPropagation();
          store.update(curr => curr.filter(p => p.id !== item.id)).then(renderTray);
        });

        chip.appendChild(avatar);
        chip.appendChild(meta);
        chip.appendChild(dismissBtn);
        chipsCluster.appendChild(chip);
      });

      tray.appendChild(chipsCluster);

      // Launch button without icon (disabled unless 2 distinct players are ready)
      const launchBtn = document.createElement('button');
      launchBtn.type = 'button';
      launchBtn.className = 'rhythiax-tray-launch-btn';
      launchBtn.innerHTML = '<span>Compare</span>';

      const canCompare = list.length >= 2 && String(list[0]?.id) !== String(list[1]?.id);
      if (!canCompare) {
        launchBtn.disabled = true;
        launchBtn.classList.add('is-disabled');
        launchBtn.title = list.length === 1 ? 'Add one more player (1/2)' : 'Add 2 players to compare';
      } else {
        launchBtn.disabled = false;
        launchBtn.classList.remove('is-disabled');
        launchBtn.title = 'Open comparison';
        launchBtn.addEventListener('click', () => openModal());
      }
      tray.appendChild(launchBtn);

      // Close tray button
      const closeBtn = document.createElement('button');
      closeBtn.type = 'button';
      closeBtn.className = 'rhythiax-tray-close-btn';
      closeBtn.title = 'Close tray';
      closeBtn.innerHTML = `<svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
      closeBtn.addEventListener('click', async () => {
        loader.reset();
        cleanupModal();
        await store.clear();
        renderTray();
      });
      tray.appendChild(closeBtn);
    });
  }

  // --- Main Comparison Modal ---

  async function openModal() {
    const list = await store.read();
    if (!list || list.length < 2) return;
    if (String(list[0]?.id) === String(list[1]?.id)) return;

    const generation = loader.nextGeneration();
    const enriched = list.map(loader.enrichCurrent);

    // Fetch full profiles sequentially in memory
    const profiles = [];
    for (const item of enriched) {
      const p = await loader.load(item, generation);
      if (p) profiles.push(p);
    }
    if (profiles.length < 2 || !loader.isGenerationCurrent(generation) || RhythiaX.ClassicIdle?.isSuspended?.()) return;
    if (String(profiles[0].id) === String(profiles[1].id)) return;

    cleanupModal();

    const overlay = document.createElement('div');
    overlay.className = 'rhythiax-compare-modal';

    const p1 = profiles[0];
    const p2 = profiles[1];

    const p1Scores = p1.scoreSets?.scores || [];
    const p2Scores = p2.scoreSets?.scores || [];

    // Direct light metrics
    const p1Acc = metrics.averageAccuracy(p1Scores) ?? 0;
    const p2Acc = metrics.averageAccuracy(p2Scores) ?? 0;
    const p1Spd = metrics.averageSpeed(p1Scores) ?? 1;
    const p2Spd = metrics.averageSpeed(p2Scores) ?? 1;
    const p1Miss = metrics.averageMissRate(p1Scores);
    const p2Miss = metrics.averageMissRate(p2Scores);

    const battle = metrics.analyzeSharedMaps(p1Scores, p2Scores);

    const p1WinsRatio = battle.totalShared > 0 ? battle.p1Wins / battle.totalShared : 0.5;
    const p2WinsRatio = battle.totalShared > 0 ? battle.p2Wins / battle.totalShared : 0.5;

    const p1Coords = template.getDiamondCoords(p1Acc, p1Spd, p1Miss?.cleanliness ?? 95, p1WinsRatio);
    const p2Coords = template.getDiamondCoords(p2Acc, p2Spd, p2Miss?.cleanliness ?? 90, p2WinsRatio);
    const p1More = metrics.moreStats(p1Scores), p2More = metrics.moreStats(p2Scores);
    const model = { p1, p2, p1Acc, p2Acc, p1Spd, p2Spd, p1Miss, p2Miss, battle, p1Coords, p2Coords, p1More, p2More };

    const dialog = document.createElement('div');
    dialog.className = 'rhythiax-compare-dialog';
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');

    let activeRef = 0; // 0 for P1, 1 for P2

    function renderModalHtml() {
      // The shared maps list does not depend on the perspective: a switch keeps its search, filter and sort.
      const listControls = ['#rhythiax-clash-search', '#rhythiax-clash-filter', '#rhythiax-clash-sort']
        .map(selector => [selector, dialog.querySelector(selector)?.value]);

      dialog.innerHTML = template.modalHtml(model, activeRef);

      // Duel card click listeners for perspective switching
      dialog.querySelector('[data-ref-index="0"]')?.addEventListener('click', () => {
        if (activeRef !== 0) {
          activeRef = 0;
          renderModalHtml();
        }
      });
      dialog.querySelector('[data-ref-index="1"]')?.addEventListener('click', () => {
        if (activeRef !== 1) {
          activeRef = 1;
          renderModalHtml();
        }
      });

      listControls.forEach(([selector, value]) => {
        const control = dialog.querySelector(selector);
        if (control && value !== undefined) control.value = value;
      });

      dialog.querySelector('.rhythiax-modal-close-btn')?.addEventListener('click', closeModal);
      dialog.querySelector('#rhythiax-clash-search')?.addEventListener('input', renderClashesList);
      dialog.querySelector('#rhythiax-clash-filter')?.addEventListener('change', renderClashesList);
      dialog.querySelector('#rhythiax-clash-sort')?.addEventListener('change', renderClashesList);

      renderClashesList();
    }

    function renderClashesList() {
      const container = dialog.querySelector('#rhythiax-clashes-container');
      if (!container) return;

      const query = (dialog.querySelector('#rhythiax-clash-search')?.value || '').trim().toLowerCase();
      const filter = dialog.querySelector('#rhythiax-clash-filter')?.value || 'all';
      const sort = dialog.querySelector('#rhythiax-clash-sort')?.value || 'delta';

      container.innerHTML = template.clashesHtml(battle, query, filter, sort);
    }

    function closeModal() {
      if (activeModalKeyHandler) {
        document.removeEventListener('keydown', activeModalKeyHandler);
        activeModalKeyHandler = null;
      }
      overlay.classList.add('is-closing');
      setTimeout(() => overlay.remove(), 180);
    }

    activeModalKeyHandler = function onModalKeyDown(e) {
      if (e.key === 'Escape') closeModal();
    };

    overlay.addEventListener('click', e => {
      if (e.target === overlay) closeModal();
    });
    document.addEventListener('keydown', activeModalKeyHandler);

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    renderModalHtml();
  }

  // --- Public API ---

  RhythiaX.CompareView = {
    inject(player) {
      if (!RhythiaX.isModuleEnabled('playerCompare')) {
        cleanup();
        return;
      }
      compareButton(player);
      renderTray();
    },
    updatePlayer(player) {
      if (player) activeProfilePlayer = player;
    },
    renderTray,
    openComparison: openModal,
    cleanupModal,
    cleanup,
  };

  // The tray and the comparison sit on <body>, above everything: they leave when Exodus takes the page, and the
  // tray (its list is kept for the browser session) comes back when the page is handed back.
  RhythiaX.ClassicIdle?.onSuspend?.(cleanup);
  RhythiaX.ClassicIdle?.onResume?.(() => {
    if (RhythiaX.isModuleEnabled?.('playerCompare')) renderTray();
  });
})();

// The profile page's entry point (core/modules.js, bootstrap/route-observer.js, pages/profile/composition.js):
// the compare button and the tray for this player, or none of Classic's compare elements while the module is off.
RhythiaX.injectPlayerCompare = function (player) {
  if (RhythiaX.isModuleEnabled && !RhythiaX.isModuleEnabled('playerCompare')) {
    RhythiaX.CompareView?.cleanup?.();
    document.querySelectorAll('.rhythiax-compare-profile-button, .rhythiax-compare-tray, .rhythiax-compare-modal').forEach(el => el.remove());
    return;
  }
  if (RhythiaX.CompareView?.updatePlayer && player) {
    RhythiaX.CompareView.updatePlayer(player);
  }
  return RhythiaX.CompareView?.inject(player);
};
