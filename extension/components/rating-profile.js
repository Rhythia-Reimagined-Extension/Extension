// =============================================
// Rhythia X - Rating Profile
// =============================================

var RhythiaX = RhythiaX || {};

RhythiaX.injectRatingProfile = function (scores, ratingScores, target, pageType) {
  const statsContainer = target || RhythiaX.findOfficialStatsContainer();
  if (!statsContainer) return null;

  const source = ratingScores || scores;
  const style = RhythiaX.getProfileStyle ? RhythiaX.getProfileStyle() : 'profile-surface';
  const metric = RhythiaX.getProfileMetric ? RhythiaX.getProfileMetric() : 'percentage';
  const container = document.createElement('div');
  container.className = `rhythiax-profile-box rhythiax-profile-style-${style} rhythiax-profile-metric-${metric}`;
  const profilesGrid = document.createElement('div');
  profilesGrid.className = 'rhythiax-profiles-grid rhythiax-profile-page-grid';

  const title = document.createElement('div');
  title.className = 'rhythiax-profile-box-title';
  title.innerHTML = '<span class="rhythiax-profile-box-heading"><svg class="rhythiax-profile-box-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg><span>Rating Profile</span></span><span class="rhythiax-profile-box-meta"></span>';
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
    const item = document.createElement('div');
    item.className = `rhythiax-profile-list-item rhythiax-grade-item active${count === 0 ? ' rhythiax-profile-item-empty' : ''}`;
    item.dataset.grade = grade;
    item.tabIndex = 0;
    item.setAttribute('role', 'button');
    item.setAttribute('aria-pressed', 'false');
    item.setAttribute('aria-label', `${grade}: ${count} ${count === 1 ? 'play' : 'plays'}, ${percent}%`);
    item.style.setProperty('--grade-color', color);
    item.style.setProperty('--item-idx', String(index));

    item.innerHTML = `<span class="rhythiax-profile-list-label">${grade}</span><span class="rhythiax-profile-list-track"><i style="width:${barPercent}%"></i></span><span class="rhythiax-profile-list-count">${count} ${count === 1 ? 'play' : 'plays'}</span><span class="rhythiax-profile-list-share">${percent}%</span>`;

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
  profilesGrid.appendChild(container);
  if (!statsContainer.parentElement) statsContainer.appendChild(profilesGrid);
  else statsContainer.after(profilesGrid);
  return container;
};
