// =============================================
// Rhythia Reimagined - Player Compare: View & UI
// =============================================

var RhythiaX = RhythiaX || {};

(function () {
  const store = RhythiaX.CompareStore;
  const loader = RhythiaX.CompareLoader;
  const metrics = RhythiaX.CompareMetrics;
  const MAX_PLAYERS = 2;

  let activeProfilePlayer = null;
  let trayCloseTimer = null;

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>'"]/g, char => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    }[char]));
  }

  function icon(path, size = 16) {
    return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${path}"/></svg>`;
  }

  function getAvatarHtml(player, isP2 = false) {
    const avatarUrl = player?.avatar || player?.player?.avatar || '';
    if (avatarUrl) {
      return `<img src="${escapeHtml(avatarUrl)}" alt="" onerror="this.onerror=null;this.src='/unkimg.png';">`;
    }
    const gradStart = isP2 ? '#60a5fa' : '#c084fc';
    const gradEnd = isP2 ? '#1d4ed8' : '#7c3aed';
    return `<svg viewBox="0 0 100 100">
      <defs>
        <linearGradient id="rhythiax-avatar-${isP2 ? 'p2' : 'p1'}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${gradStart}"/>
          <stop offset="100%" stop-color="${gradEnd}"/>
        </linearGradient>
      </defs>
      <rect width="100" height="100" fill="url(#rhythiax-avatar-${isP2 ? 'p2' : 'p1'})"/>
      <circle cx="50" cy="40" r="18" fill="#ffffff" fill-opacity="0.95"/>
      <path d="M22 84 C24 64 36 58 50 58 C64 58 76 64 78 84 Z" fill="#ffffff" fill-opacity="0.95"/>
    </svg>`;
  }

  function getFlagHtml(country) {
    const c = String(country || '').trim().toUpperCase();
    if (!c) return '';
    if (c === 'PL' || c === 'POLAND') {
      return `<svg viewBox="0 0 16 11" width="16" height="11" style="border-radius:2px;overflow:hidden;border:1px solid currentColor;opacity:0.85;vertical-align:-1px;display:inline-block;margin-right:4px;">
        <rect width="16" height="5.5" fill="#ffffff"/>
        <rect y="5.5" width="16" height="5.5" fill="#dc2626"/>
      </svg>`;
    }
    if (/^[A-Z]{2}$/.test(c)) {
      return `<img src="/flags/${c.toLowerCase()}.svg" alt="${escapeHtml(c)}" style="width:16px;height:11px;border-radius:2px;vertical-align:-1px;display:inline-block;margin-right:4px;" onerror="this.outerHTML='<span style=\\'margin-right:4px;\\'>${escapeHtml(c)}</span>'">`;
    }
    return `<span style="margin-right:4px;">${escapeHtml(c)}</span>`;
  }

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
    if (!RhythiaX.isModuleEnabled('playerCompare') || (RhythiaX.isMasterActive && !RhythiaX.isMasterActive())) {
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
    if (!RhythiaX.isModuleEnabled('playerCompare') || (RhythiaX.isMasterActive && !RhythiaX.isMasterActive())) {
      cleanup();
      return;
    }

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
        avatar.innerHTML = getAvatarHtml(item, index === 1);

        const meta = document.createElement('div');
        meta.className = 'rhythiax-tray-meta';
        const rankText = item.globalRank ? (item.globalRank.startsWith('#') ? item.globalRank : '#' + item.globalRank) + ' Global' : '#— Global';
        meta.innerHTML = `<span class="rhythiax-tray-name">${escapeHtml(item.username)}</span><span class="rhythiax-tray-rank">${escapeHtml(rankText)}</span>`;

        // Asynchronously hydrate avatar and rank if missing
        if (!item.avatar || !item.globalRank) {
          loader.hydrateProfileMeta(item).then(updated => {
            if (!chip.isConnected || !updated) return;
            if (updated.avatar) avatar.innerHTML = getAvatarHtml(updated, index === 1);
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
        launchBtn.title = list.length === 1 ? 'Select another player to compare (1/2)' : 'Select 2 players to compare';
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
    if (profiles.length < 2 || !loader.isGenerationCurrent(generation)) return;
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

    // 4-Axis Diamond Polygon calculation with exact geometric centering
    function getDiamondCoords(acc, spd, clean, winsRatio) {
      const normAcc = Math.max(0.15, Math.min(1, (acc - 85) / 15));
      const normSpd = Math.max(0.15, Math.min(1, (spd - 0.9) / 0.6));
      const normClean = Math.max(0.15, Math.min(1, clean / 100));
      const normWins = Math.max(0.15, Math.min(1, winsRatio));

      const topY = 98 - (normAcc * 64);
      const rightX = 135 + (normSpd * 64);
      const bottomY = 98 + (normClean * 64);
      const leftX = 135 - (normWins * 64);

      return {
        top: { x: 135, y: topY },
        right: { x: rightX, y: 98 },
        bottom: { x: 135, y: bottomY },
        left: { x: leftX, y: 98 },
        points: `135,${topY.toFixed(1)} ${rightX.toFixed(1)},98 135,${bottomY.toFixed(1)} ${leftX.toFixed(1)},98`
      };
    }

    const p1WinsRatio = battle.totalShared > 0 ? battle.p1Wins / battle.totalShared : 0.5;
    const p2WinsRatio = battle.totalShared > 0 ? battle.p2Wins / battle.totalShared : 0.5;

    const p1Coords = getDiamondCoords(p1Acc, p1Spd, p1Miss?.cleanliness ?? 95, p1WinsRatio);
    const p2Coords = getDiamondCoords(p2Acc, p2Spd, p2Miss?.cleanliness ?? 90, p2WinsRatio);

    const dialog = document.createElement('div');
    dialog.className = 'rhythiax-compare-dialog';
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');

    let activeRef = 0; // 0 for P1, 1 for P2

    function renderModalHtml() {
      const isRefP1 = activeRef === 0;

      // Deltas relative to active perspective
      const accDelta = isRefP1 ? (p1Acc - p2Acc) : (p2Acc - p1Acc);
      const spdDelta = isRefP1 ? (p1Spd - p2Spd) : (p2Spd - p1Spd);
      const missDelta = isRefP1 ? ((p1Miss?.rate ?? 0) - (p2Miss?.rate ?? 0)) : ((p2Miss?.rate ?? 0) - (p1Miss?.rate ?? 0));
      const winsDelta = isRefP1 ? (battle.p1Wins - battle.p2Wins) : (battle.p2Wins - battle.p1Wins);

      const accPillText = (accDelta >= 0 ? '+' : '') + accDelta.toFixed(2) + '%';
      const accPillClass = accDelta >= 0 ? 'is-pos' : 'is-neg';

      const spdPillText = (spdDelta >= 0 ? '+' : '') + spdDelta.toFixed(2) + 'x';
      const spdPillClass = spdDelta >= 0 ? 'is-pos' : 'is-neg';

      const missPillText = missDelta <= 0
        ? '-' + Math.abs(missDelta).toFixed(2) + '% Cleaner'
        : '+' + missDelta.toFixed(2) + '% More Misses';
      const missPillClass = missDelta <= 0 ? 'is-pos' : 'is-neg';

      const winsPillText = winsDelta >= 0
        ? '+' + winsDelta + ' Maps Lead'
        : winsDelta + ' Maps Behind';
      const winsPillClass = winsDelta >= 0 ? 'is-pos' : 'is-neg';

      const activeWins = isRefP1 ? battle.p1Wins : battle.p2Wins;
      const betterTitle = `Better in ${activeWins} ${activeWins === 1 ? 'Map' : 'Maps'}`;

      dialog.innerHTML = `
        <!-- Header -->
        <div class="rhythiax-modal-header">
          <div class="rhythiax-modal-headline">
            <h2>Player Comparison</h2>
            <p>${battle.totalShared} shared maps</p>
          </div>
          <div class="rhythiax-modal-actions">
            <button type="button" class="rhythiax-modal-close-btn" aria-label="Close comparison">
              <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
        </div>

        <!-- Duel Arena: Interactive Reference Selection -->
        <div class="rhythiax-duel-arena">
          <!-- Player 1 Card -->
          <div class="rhythiax-duel-card ${isRefP1 ? 'is-reference' : 'is-selectable'}" data-ref-index="0" title="${isRefP1 ? 'Current reference player' : 'Click to compare as ' + escapeHtml(p1.username)}">
            <div class="rhythiax-card-left">
              <div class="rhythiax-card-avatar">
                ${getAvatarHtml(p1, false)}
              </div>
              <div class="rhythiax-card-info">
                <div class="rhythiax-card-name-row">
                  <span class="rhythiax-card-name">${escapeHtml(p1.username)}</span>
                  ${isRefP1
                    ? '<span class="rhythiax-card-perspective-badge">COMPARING AS</span>'
                    : '<span class="rhythiax-card-switch-hint">Click to compare as ' + escapeHtml(p1.username) + '</span>'}
                  ${battle.p1Wins > battle.p2Wins ? `<span class="rhythiax-card-lead-badge">LEAD (${battle.p1Wins})</span>` : ''}
                </div>
                <div class="rhythiax-card-ranks">
                  <span>${escapeHtml(p1.player?.globalRank || p1.globalRank || '#—')} Global</span>
                  <span>·</span>
                  <span>${getFlagHtml(p1.player?.country || p1.country)} Country ${escapeHtml(p1.player?.countryRank || p1.countryRank || '#—')}</span>
                </div>
              </div>
            </div>
            <div class="rhythiax-card-right">
              <div class="rhythiax-card-wins-val">${battle.p1Wins} / ${battle.totalShared}</div>
              <div class="rhythiax-card-wins-lbl">Map Wins</div>
            </div>
          </div>

          <!-- Player 2 Card -->
          <div class="rhythiax-duel-card ${!isRefP1 ? 'is-reference' : 'is-selectable'}" data-ref-index="1" title="${!isRefP1 ? 'Current reference player' : 'Click to compare as ' + escapeHtml(p2.username)}">
            <div class="rhythiax-card-left">
              <div class="rhythiax-card-avatar">
                ${getAvatarHtml(p2, true)}
              </div>
              <div class="rhythiax-card-info">
                <div class="rhythiax-card-name-row">
                  <span class="rhythiax-card-name">${escapeHtml(p2.username)}</span>
                  ${!isRefP1
                    ? '<span class="rhythiax-card-perspective-badge">COMPARING AS</span>'
                    : '<span class="rhythiax-card-switch-hint">Click to compare as ' + escapeHtml(p2.username) + '</span>'}
                  ${battle.p2Wins > battle.p1Wins ? `<span class="rhythiax-card-lead-badge">LEAD (${battle.p2Wins})</span>` : ''}
                </div>
                <div class="rhythiax-card-ranks">
                  <span>${escapeHtml(p2.player?.globalRank || p2.globalRank || '#—')} Global</span>
                  <span>·</span>
                  <span>${getFlagHtml(p2.player?.country || p2.country)} Country ${escapeHtml(p2.player?.countryRank || p2.countryRank || '#—')}</span>
                </div>
              </div>
            </div>
            <div class="rhythiax-card-right">
              <div class="rhythiax-card-wins-val">${battle.p2Wins} / ${battle.totalShared}</div>
              <div class="rhythiax-card-wins-lbl">Map Wins</div>
            </div>
          </div>
        </div>

        <!-- Core Analysis: 4-Axis Diamond Radar + 4 Bento Cards -->
        <div class="rhythiax-core-analysis">
          <!-- 4-Axis Diamond Radar -->
          <div class="rhythiax-radar-box">
            <div class="rhythiax-radar-chart-wrap">
              <svg class="rhythiax-radar-svg" viewBox="0 0 270 195">
                <polygon points="135,34 199,98 135,162 71,98" fill="none" stroke="currentColor" stroke-opacity="0.1" stroke-width="1"/>
                <polygon points="135,56 177,98 135,140 93,98" fill="none" stroke="currentColor" stroke-opacity="0.1" stroke-width="1"/>
                <polygon points="135,77 156,98 135,119 114,98" fill="none" stroke="currentColor" stroke-opacity="0.1" stroke-width="1"/>

                <line x1="135" y1="28" x2="135" y2="168" stroke="currentColor" stroke-opacity="0.12" stroke-dasharray="2,2"/>
                <line x1="65" y1="98" x2="205" y2="98" stroke="currentColor" stroke-opacity="0.12" stroke-dasharray="2,2"/>

                <!-- P2 Polygon & Dots (Sky Blue) -->
                <polygon class="rhythiax-radar-poly-p2" points="${p2Coords.points}"/>
                <circle class="rhythiax-radar-dot-p2" cx="${p2Coords.top.x}" cy="${p2Coords.top.y}" r="3"/>
                <circle class="rhythiax-radar-dot-p2" cx="${p2Coords.right.x}" cy="${p2Coords.right.y}" r="3"/>
                <circle class="rhythiax-radar-dot-p2" cx="${p2Coords.bottom.x}" cy="${p2Coords.bottom.y}" r="3"/>
                <circle class="rhythiax-radar-dot-p2" cx="${p2Coords.left.x}" cy="${p2Coords.left.y}" r="3"/>

                <!-- P1 Polygon & Dots (Amethyst / Violet) -->
                <polygon class="rhythiax-radar-poly-p1" points="${p1Coords.points}"/>
                <circle class="rhythiax-radar-dot-p1" cx="${p1Coords.top.x}" cy="${p1Coords.top.y}" r="3.2"/>
                <circle class="rhythiax-radar-dot-p1" cx="${p1Coords.right.x}" cy="${p1Coords.right.y}" r="3.2"/>
                <circle class="rhythiax-radar-dot-p1" cx="${p1Coords.bottom.x}" cy="${p1Coords.bottom.y}" r="3.2"/>
                <circle class="rhythiax-radar-dot-p1" cx="${p1Coords.left.x}" cy="${p1Coords.left.y}" r="3.2"/>

                <!-- Axis vertex labels - perfectly centered and balanced -->
                <text x="135" y="18" text-anchor="middle" fill="currentColor" font-size="10" font-weight="800" letter-spacing="0.05em">ACCURACY</text>
                <text x="208" y="102" text-anchor="start" fill="currentColor" font-size="10" font-weight="800" letter-spacing="0.05em">SPEED</text>
                <text x="135" y="182" text-anchor="middle" fill="currentColor" font-size="10" font-weight="800" letter-spacing="0.05em">CLEANLINESS</text>
                <text x="63" y="94" text-anchor="end" fill="currentColor" font-size="10" font-weight="800" letter-spacing="0.05em">
                  <tspan x="63" dy="0">MAP</tspan>
                  <tspan x="63" dy="12">WINS</tspan>
                </text>
              </svg>
            </div>

            <div class="rhythiax-radar-legend">
              <span class="rhythiax-radar-p1">● ${escapeHtml(p1.username)}</span>
              <span class="rhythiax-radar-p2">● ${escapeHtml(p2.username)}</span>
            </div>
          </div>

          <!-- 4 Light Direct Metrics Bento Grid -->
          <div class="rhythiax-bento-grid">
            <!-- Metric 1: Average Accuracy -->
            <div class="rhythiax-bento-card">
              <div class="rhythiax-bento-header">
                <span class="rhythiax-bento-title">Average Accuracy</span>
                <span class="rhythiax-bento-pill ${accPillClass}">${accPillText}</span>
              </div>
              <div class="rhythiax-bento-comparison">
                <div class="rhythiax-player-metric">
                  <span class="rhythiax-player-metric-tag">${escapeHtml(p1.username)}</span>
                  <span class="rhythiax-player-metric-val ${p1Acc >= p2Acc ? 'is-leader' : ''}">${p1Acc.toFixed(2)}%</span>
                </div>
                <div class="rhythiax-player-metric" style="text-align:right;">
                  <span class="rhythiax-player-metric-tag">${escapeHtml(p2.username)}</span>
                  <span class="rhythiax-player-metric-val ${p2Acc > p1Acc ? 'is-leader' : ''}">${p2Acc.toFixed(2)}%</span>
                </div>
              </div>
            </div>

            <!-- Metric 2: Average Speed -->
            <div class="rhythiax-bento-card">
              <div class="rhythiax-bento-header">
                <span class="rhythiax-bento-title">Average Speed</span>
                <span class="rhythiax-bento-pill ${spdPillClass}">${spdPillText}</span>
              </div>
              <div class="rhythiax-bento-comparison">
                <div class="rhythiax-player-metric">
                  <span class="rhythiax-player-metric-tag">${escapeHtml(p1.username)}</span>
                  <span class="rhythiax-player-metric-val ${p1Spd >= p2Spd ? 'is-leader' : ''}">${p1Spd.toFixed(2)}x</span>
                </div>
                <div class="rhythiax-player-metric" style="text-align:right;">
                  <span class="rhythiax-player-metric-tag">${escapeHtml(p2.username)}</span>
                  <span class="rhythiax-player-metric-val ${p2Spd > p1Spd ? 'is-leader' : ''}">${p2Spd.toFixed(2)}x</span>
                </div>
              </div>
            </div>

            <!-- Metric 3: Average Miss Rate -->
            <div class="rhythiax-bento-card">
              <div class="rhythiax-bento-header">
                <span class="rhythiax-bento-title">Average Miss Rate</span>
                <span class="rhythiax-bento-pill ${missPillClass}">${missPillText}</span>
              </div>
              <div class="rhythiax-bento-comparison">
                <div class="rhythiax-player-metric">
                  <span class="rhythiax-player-metric-tag">${escapeHtml(p1.username)}</span>
                  <span class="rhythiax-player-metric-val ${(p1Miss?.rate ?? 0) <= (p2Miss?.rate ?? 0) ? 'is-leader' : ''}">${(p1Miss?.rate ?? 0).toFixed(2)}% <small style="font-size:11px;opacity:0.8;">(${(p1Miss?.perMap ?? 0).toFixed(1)}/map)</small></span>
                </div>
                <div class="rhythiax-player-metric" style="text-align:right;">
                  <span class="rhythiax-player-metric-tag">${escapeHtml(p2.username)}</span>
                  <span class="rhythiax-player-metric-val ${(p2Miss?.rate ?? 0) < (p1Miss?.rate ?? 0) ? 'is-leader' : ''}">${(p2Miss?.rate ?? 0).toFixed(2)}% <small style="font-size:11px;opacity:0.8;">(${(p2Miss?.perMap ?? 0).toFixed(1)}/map)</small></span>
                </div>
              </div>
            </div>

            <!-- Metric 4: Better in N Maps -->
            <div class="rhythiax-bento-card">
              <div class="rhythiax-bento-header">
                <span class="rhythiax-bento-title">${betterTitle}</span>
                <span class="rhythiax-bento-pill ${winsPillClass}">${winsPillText}</span>
              </div>
              <div class="rhythiax-bento-comparison">
                <div class="rhythiax-player-metric">
                  <span class="rhythiax-player-metric-tag">${escapeHtml(p1.username)}</span>
                  <span class="rhythiax-player-metric-val ${battle.p1Wins >= battle.p2Wins ? 'is-leader' : ''}">${battle.p1Wins} maps <small style="font-size:11px;opacity:0.8;">(${battle.totalShared ? ((battle.p1Wins/battle.totalShared)*100).toFixed(1) : 0}%)</small></span>
                </div>
                <div class="rhythiax-player-metric" style="text-align:right;">
                  <span class="rhythiax-player-metric-tag">${escapeHtml(p2.username)}</span>
                  <span class="rhythiax-player-metric-val ${battle.p2Wins > battle.p1Wins ? 'is-leader' : ''}">${battle.p2Wins} maps <small style="font-size:11px;opacity:0.8;">(${battle.totalShared ? ((battle.p2Wins/battle.totalShared)*100).toFixed(1) : 0}%)</small></span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Shared Maps -->
        <div>
          <div class="rhythiax-clashes-header">
            <span class="rhythiax-clashes-heading">Shared Maps</span>
            <span class="rhythiax-clashes-count">${battle.totalShared} matching scores</span>
          </div>

          <div class="rhythiax-clashes-toolbar">
            <div class="rhythiax-search-wrap">
              <svg class="rhythiax-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
              <input type="search" class="rhythiax-search-input" id="rhythiax-clash-search" placeholder="Search beatmap title...">
            </div>
            <select class="rhythiax-toolbar-select" id="rhythiax-clash-filter">
              <option value="all">All shared maps (${battle.totalShared})</option>
              <option value="delta">Only maps with score delta</option>
            </select>
            <select class="rhythiax-toolbar-select" id="rhythiax-clash-sort">
              <option value="delta">Sort: Highest Delta</option>
              <option value="acc">Sort: Best Accuracy</option>
              <option value="speed">Sort: Highest Speed</option>
            </select>
          </div>

          <div class="rhythiax-clashes-list" id="rhythiax-clashes-container"></div>
        </div>
      `;

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

      let items = [...battle.clashes];

      if (query) {
        items = items.filter(c => c.title.toLowerCase().includes(query));
      }
      if (filter === 'delta') {
        items = items.filter(c => Math.abs(c.delta) > 0.01);
      }

      if (sort === 'acc') {
        items.sort((a, b) => Math.max(b.p1.accuracy, b.p2.accuracy) - Math.max(a.p1.accuracy, a.p2.accuracy));
      } else if (sort === 'speed') {
        items.sort((a, b) => Math.max(b.p1.speed, b.p2.speed) - Math.max(a.p1.speed, a.p2.speed));
      } else {
        items.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
      }

      if (!items.length) {
        container.innerHTML = `<div style="text-align:center;padding:24px;color:var(--rhythiax-text-muted);">No beatmaps found matching the filter.</div>`;
        return;
      }

      container.innerHTML = items.map(c => {
        const p1Status = c.winner === 'p1' ? 'is-winner' : (c.winner === 'p2' ? 'is-loser' : 'is-tie');
        const p2Status = c.winner === 'p2' ? 'is-winner' : (c.winner === 'p1' ? 'is-loser' : 'is-tie');

        const metaStats = [];
        if (c.difficulty) metaStats.push(`${c.difficulty.toFixed(2)}★`);
        if (c.bpm) metaStats.push(`BPM ${c.bpm}`);
        if (c.notes) metaStats.push(`${c.notes} Notes`);

        const p1Mods = Array.isArray(c.p1.mods) ? c.p1.mods : [];
        const p2Mods = Array.isArray(c.p2.mods) ? c.p2.mods : [];

        return `
          <div class="rhythiax-battle-card">
            <div class="rhythiax-map-meta">
              <span class="rhythiax-map-title">${escapeHtml(c.title)}</span>
              <span class="rhythiax-map-stats">${escapeHtml(metaStats.join(' · '))}</span>
            </div>
            <div class="rhythiax-score-pill ${p1Status}">
              <div class="rhythiax-pill-left">
                <span class="rhythiax-pill-acc">${c.p1.accuracy.toFixed(2)}%</span>
                <span class="rhythiax-pill-badge">${c.p1.speed.toFixed(2)}x</span>
                ${p1Mods.map(m => `<span class="rhythiax-pill-badge">${escapeHtml(m)}</span>`).join('')}
              </div>
              <div class="rhythiax-pill-right">
                <span>${c.p1.misses} ${c.p1.misses === 1 ? 'miss' : 'misses'}</span>
                <b>${c.delta >= 0 ? '+' : ''}${c.delta.toFixed(2)}%</b>
              </div>
            </div>
            <div class="rhythiax-score-pill ${p2Status}">
              <div class="rhythiax-pill-left">
                <span class="rhythiax-pill-acc">${c.p2.accuracy.toFixed(2)}%</span>
                <span class="rhythiax-pill-badge">${c.p2.speed.toFixed(2)}x</span>
                ${p2Mods.map(m => `<span class="rhythiax-pill-badge">${escapeHtml(m)}</span>`).join('')}
              </div>
              <div class="rhythiax-pill-right">
                <span>${c.p2.misses} ${c.p2.misses === 1 ? 'miss' : 'misses'}</span>
                <b>${-c.delta >= 0 ? '+' : ''}${(-c.delta).toFixed(2)}%</b>
              </div>
            </div>
          </div>
        `;
      }).join('');
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
      if (!RhythiaX.isModuleEnabled('playerCompare') || (RhythiaX.isMasterActive && !RhythiaX.isMasterActive())) {
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
})();
