// =============================================
// Rhythia X - Rating Profile
// =============================================

var RhythiaX = RhythiaX || {};

RhythiaX.injectRatingProfile = function (scores, ratingScores, target, pageType) {
  const statsContainer = target || RhythiaX.findOfficialStatsContainer();
  if (!statsContainer) return null;

  const source = ratingScores || scores;
  const style = RhythiaX.getProfileStyle ? RhythiaX.getProfileStyle() : 'soft-blocks';
   const container = document.createElement('div');
   container.className = `rhythiax-profile-box rhythiax-profile-style-${style}`;
   const profilesGrid = document.createElement('div');
    profilesGrid.className = `rhythiax-profiles-grid${pageType === 'profile' ? ' rhythiax-profile-page-grid' : ''}`;

  const title = document.createElement('div');
  title.className = 'rhythiax-profile-box-title';
  title.innerHTML = '<span class="rhythiax-profile-box-heading"><svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 256 256" height="1em" width="1em"><path d="M236,208a12,12,0,0,1-12,12H32a12,12,0,0,1-12-12V48a12,12,0,0,1,24,0v99l43.51-43.52a12,12,0,0,1,17,0L128,127l43-43H160a12,12,0,0,1,0-24h40a12,12,0,0,1,12,12v40a12,12,0,0,1-24,0V101l-51.51,51.52a12,12,0,0,1-17,0L96,129,44,181v15H224A12,12,0,0,1,236,208Z"></path></svg><span>Rating Profile</span></span><span class="rhythiax-profile-box-meta"></span>';
  title.querySelector('.rhythiax-profile-box-meta').textContent = `${source.length} rated plays`;
  container.appendChild(title);

  const counts = {};
  RhythiaX.GRADE_ORDER.forEach(grade => counts[grade] = 0);
  source.forEach(score => { if (counts[score.grade] !== undefined) counts[score.grade]++; });
  const total = source.length;

  const breakdown = document.createElement('div');
  breakdown.className = 'rhythiax-profile-list rhythiax-grade-list';
  RhythiaX.GRADE_ORDER.forEach(grade => {
    const count = counts[grade];
    const barPercent = total ? (count / total) * 100 : 0;
    const percent = Math.round(barPercent);
    const color = RhythiaX.GRADE_COLORS[grade] || '#888';
    const item = document.createElement('div');
    item.className = `rhythiax-profile-list-item rhythiax-grade-item active${style === 'profile-surface' ? ' rhythiax-profile-surface-item' : ''}`;
    item.dataset.grade = grade;
    item.tabIndex = 0;
    item.setAttribute('role', 'button');
    item.setAttribute('aria-pressed', 'false');
    item.setAttribute('aria-label', `${grade}: ${count} plays, ${percent}%`);
    item.style.setProperty('--grade-color', color);

    item.innerHTML = `<span class="rhythiax-profile-list-label">${grade}</span><span class="rhythiax-profile-list-track"><i style="width:${barPercent}%"></i></span><span class="rhythiax-profile-list-count">${count} plays</span><span class="rhythiax-profile-list-share">${percent}%</span>`;

    const toggle = () => {
      if (RhythiaX.activeGrades === null || !RhythiaX.activeGrades.has(grade) || RhythiaX.activeGrades.size !== 1) {
        RhythiaX.activeGrades = new Set([grade]);
        document.querySelectorAll('.rhythiax-grade-item').forEach(element => {
          const selected = element.dataset.grade === grade;
          element.classList.toggle('active', selected);
          element.setAttribute('aria-pressed', selected ? 'true' : 'false');
        });
      } else {
        RhythiaX.activeGrades = null;
        document.querySelectorAll('.rhythiax-grade-item').forEach(element => {
          element.classList.add('active');
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
   if (pageType === 'scores' || !statsContainer.parentElement) statsContainer.appendChild(profilesGrid);
   else statsContainer.after(profilesGrid);
   return container;
};
