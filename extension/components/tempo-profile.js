// =============================================
// Rhythia X - Tempo Profile (Speed Distribution)
// =============================================

var RhythiaX = RhythiaX || {};

RhythiaX.injectTempoProfile = function (scores, target, pageType) {
  const statsContainer = target || RhythiaX.findOfficialStatsContainer();
  if (!statsContainer) return null;

  const style = RhythiaX.getProfileStyle ? RhythiaX.getProfileStyle() : 'soft-blocks';
  const speedOrder = RhythiaX.SPEED_ORDER;
  const buckets = RhythiaX.getSpeedBuckets(scores);
  const total = scores.length;
  const section = document.createElement('div');
  section.className = `rhythiax-profile-box rhythiax-profile-style-${style}`;

  const title = document.createElement('div');
  title.className = 'rhythiax-profile-box-title';
  title.innerHTML = '<span class="rhythiax-profile-box-heading"><svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 256 256" height="1em" width="1em"><path d="M236,208a12,12,0,0,1-12,12H32a12,12,0,0,1-12-12V48a12,12,0,0,1,24,0v99l43.51-43.52a12,12,0,0,1,17,0L128,127l43-43H160a12,12,0,0,1,0-24h40a12,12,0,0,1,12,12v40a12,12,0,0,1-24,0V101l-51.51,51.52a12,12,0,0,1-17,0L96,129,44,181v15H224A12,12,0,0,1,236,208Z"></path></svg><span>Tempo Profile</span></span><span class="rhythiax-profile-box-meta"></span>';
  title.querySelector('.rhythiax-profile-box-meta').textContent = `${total} plays`;
  section.appendChild(title);

  const content = document.createElement('div');
  content.className = 'rhythiax-profile-list rhythiax-speed-list';
  content.setAttribute('aria-label', 'Plays grouped by speed modifier');

  speedOrder.forEach(key => {
    const count = buckets[key];
    const percent = total ? Math.round((count / total) * 100) : 0;
    const active = RhythiaX.activeSpeed === key;
    const colors = RhythiaX.SPEED_COLORS[key] || ['#888', '#666'];
    const item = document.createElement('div');
    item.className = `rhythiax-profile-list-item rhythiax-speed-item${style === 'profile-surface' ? ' rhythiax-profile-surface-item' : ''}${active || RhythiaX.activeSpeed === null ? ' active' : ''}`;
    item.dataset.speedKey = key;
    item.tabIndex = 0;
    item.setAttribute('role', 'button');
    item.setAttribute('aria-pressed', active ? 'true' : 'false');
    item.setAttribute('aria-label', `${key}x: ${count} plays, ${percent}%, click to filter`);
    item.style.setProperty('--speed-color', colors[0]);

    const barPercent = total ? (count / total) * 100 : 0;
    item.innerHTML = `<span class="rhythiax-profile-list-label">${key}x</span><span class="rhythiax-profile-list-track"><i style="width:${barPercent}%;background:linear-gradient(90deg, ${colors[0]}, ${colors[1]})"></i></span><span class="rhythiax-profile-list-count">${count} plays</span><span class="rhythiax-profile-list-share">${percent}%</span>`;

    const toggle = () => {
      RhythiaX.activeSpeed = RhythiaX.activeSpeed === key ? null : key;
      document.querySelectorAll('.rhythiax-speed-item').forEach(element => {
        const selected = RhythiaX.activeSpeed === element.dataset.speedKey;
        const show = RhythiaX.activeSpeed === null || selected;
        element.classList.toggle('active', show);
        element.classList.toggle('is-dimmed', !show);
        element.setAttribute('aria-pressed', selected ? 'true' : 'false');
        const bar = element.querySelector('.rhythiax-profile-list-track i');
        if (bar) bar.style.filter = RhythiaX.activeSpeed === null ? '' : (selected ? 'brightness(1.2) saturate(1.1)' : 'opacity(.3)');
      });
      RhythiaX.applyScoreFilter();
    };
    item.addEventListener('click', toggle);
    item.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        toggle();
      }
    });
    content.appendChild(item);
  });
  section.appendChild(content);

    let profilesGrid = statsContainer.querySelector('.rhythiax-profiles-grid')
      || (statsContainer.parentElement && Array.from(statsContainer.parentElement.children).find(element => element.classList.contains('rhythiax-profiles-grid')));
    if (!profilesGrid && pageType === 'scores') {
      profilesGrid = document.createElement('div');
      profilesGrid.className = 'rhythiax-profiles-grid';
      statsContainer.appendChild(profilesGrid);
    }
   const gradeSection = statsContainer.querySelector('.rhythiax-injected-grade-row') || statsContainer.querySelector('.rhythiax-profile-box') || RhythiaX.qs('.rhythiax-injected-grade-row') || RhythiaX.qs('.rhythiax-profile-box');
    if (profilesGrid) {
      profilesGrid.classList.toggle('rhythiax-profile-page-grid', pageType === 'profile');
      profilesGrid.appendChild(section);
    }
   else if (gradeSection && gradeSection.parentElement) gradeSection.after(section);
   else if (statsContainer.parentElement) statsContainer.after(section);
  else statsContainer.appendChild(section);
  return section;
};
