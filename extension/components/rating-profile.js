// =============================================
// Rhythia X - Rating Profile
// Note: Active Playstyle feature is in content/features/playstyle/
// =============================================

var RhythiaX = RhythiaX || {};

RhythiaX.injectRatingProfile = function (scores, ratingScores, target, pageType) {
  if (target?.classList?.contains('rhythiax-pane-performance') && RhythiaX.PlaystyleView?.render) {
    const player = RhythiaX.profileHistoryContext?.player || (typeof RhythiaX.extractPlayerData === 'function' ? RhythiaX.extractPlayerData() : null);
    const playerId = RhythiaX.profileHistoryContext?.playerId || player?.id;
    return RhythiaX.PlaystyleView.render(target, { scores: ratingScores || scores, player, playerId });
  }

  const statsContainer = target || RhythiaX.findOfficialStatsContainer();
  if (!statsContainer) return null;

  const source = ratingScores || scores;
  const style = RhythiaX.getProfileStyle ? RhythiaX.getProfileStyle() : 'profile-surface';
  const metric = RhythiaX.getProfileMetric ? RhythiaX.getProfileMetric() : 'percentage';
  const container = document.createElement('div');
  container.className = `rhythiax-profile-box rhythiax-profile-style-${style} rhythiax-profile-metric-${metric}`;

  const title = document.createElement('div');
  title.className = 'rhythiax-profile-box-title';
  title.innerHTML = '<span class="rhythiax-profile-box-heading"><svg class="rhythiax-profile-box-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19V9"></path><path d="M10 19V5"></path><path d="M16 19v-7"></path><path d="M22 19V3"></path></svg><span>Grade Distribution</span></span><span class="rhythiax-profile-box-meta"></span>';
  title.querySelector('.rhythiax-profile-box-meta').textContent = `${source.length} ${source.length === 1 ? 'rated play' : 'rated plays'}`;
  container.appendChild(title);

  const counts = {};
  RhythiaX.GRADE_ORDER.forEach(grade => counts[grade] = 0);
  source.forEach(score => { if (counts[score.grade] !== undefined) counts[score.grade]++; });
  const total = source.length;

  const breakdown = document.createElement('div');
  breakdown.className = 'rhythiax-profile-list rhythiax-grade-list';
  RhythiaX.GRADE_ORDER.forEach((grade, index) => {
    const count = counts[grade];
    const barPercent = total ? (count / total) * 100 : 0;
    const percent = Math.round(barPercent);
    const color = RhythiaX.GRADE_COLORS[grade] || '#888';
    const isFiltered = RhythiaX.activeGrades !== null;
    const isSelected = isFiltered && RhythiaX.activeGrades.has(grade);
    const isActive = isFiltered ? isSelected : true;
    const item = document.createElement('div');
    item.className = `rhythiax-profile-list-item rhythiax-grade-item${isActive ? ' active' : ''}${isFiltered && !isSelected ? ' is-dimmed' : ''}${count === 0 ? ' rhythiax-profile-item-empty' : ''}`;
    item.dataset.grade = grade;
    item.tabIndex = 0;
    item.setAttribute('role', 'button');
    item.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
    item.setAttribute('aria-label', `${grade}: ${count} ${count === 1 ? 'play' : 'plays'}, ${percent}%`);
    item.style.setProperty('--grade-color', color);
    item.style.setProperty('--item-idx', String(index));

    const labelSpan = document.createElement('span');
    labelSpan.className = 'rhythiax-profile-list-label';
    labelSpan.textContent = grade;

    const trackSpan = document.createElement('span');
    trackSpan.className = 'rhythiax-profile-list-track';
    const trackBar = document.createElement('i');
    trackBar.style.width = `${barPercent}%`;
    trackSpan.appendChild(trackBar);

    const countSpan = document.createElement('span');
    countSpan.className = 'rhythiax-profile-list-count';
    countSpan.textContent = `${count} ${count === 1 ? 'play' : 'plays'}`;

    const shareSpan = document.createElement('span');
    shareSpan.className = 'rhythiax-profile-list-share';
    shareSpan.textContent = `${percent}%`;

    item.append(labelSpan, trackSpan, countSpan, shareSpan);

    const toggle = () => {
      if (RhythiaX.activeGrades === null || !RhythiaX.activeGrades.has(grade) || RhythiaX.activeGrades.size !== 1) {
        RhythiaX.activeGrades = new Set([grade]);
        document.querySelectorAll('.rhythiax-grade-item').forEach(element => {
          const selected = element.dataset.grade === grade;
          element.classList.toggle('active', selected);
          element.classList.toggle('is-dimmed', !selected);
          element.setAttribute('aria-pressed', selected ? 'true' : 'false');
        });
      } else {
        RhythiaX.activeGrades = null;
        document.querySelectorAll('.rhythiax-grade-item').forEach(element => {
          element.classList.add('active');
          element.classList.remove('is-dimmed');
          element.setAttribute('aria-pressed', 'false');
        });
      }
      RhythiaX.applyScoreFilter();
    };
    item.addEventListener('click', toggle);
    item.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        toggle();
      }
    });
    breakdown.appendChild(item);
  });
  container.appendChild(breakdown);

  const profilesGrid = RhythiaX.ensureProfilesGrid
    ? RhythiaX.ensureProfilesGrid(statsContainer)
    : (function () {
        let grid = statsContainer.querySelector('.rhythiax-profiles-grid')
          || (statsContainer.parentElement && Array.from(statsContainer.parentElement.children).find(element => element.classList?.contains('rhythiax-profiles-grid')))
          || document.querySelector('.rhythiax-profiles-grid');
        if (!grid) {
          grid = document.createElement('div');
          grid.className = 'rhythiax-profiles-grid rhythiax-profile-page-grid';
          if (!statsContainer.parentElement) statsContainer.appendChild(grid);
          else statsContainer.after(grid);
        } else {
          grid.classList.add('rhythiax-profile-page-grid');
        }
        return grid;
      })();

  if (profilesGrid) {
    profilesGrid.appendChild(container);
  } else if (!statsContainer.parentElement) {
    statsContainer.appendChild(container);
  } else {
    statsContainer.after(container);
  }
  return container;
};

