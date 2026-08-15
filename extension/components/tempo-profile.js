// =============================================
// Rhythia X - Tempo Profile (Speed Distribution)
// =============================================

var RhythiaX = RhythiaX || {};

RhythiaX.injectTempoProfile = function (scores, target, pageType) {
  const statsContainer = target || RhythiaX.findOfficialStatsContainer();
  if (!statsContainer) return null;

  const style = RhythiaX.getProfileStyle ? RhythiaX.getProfileStyle() : 'profile-surface';
  const metric = RhythiaX.getProfileMetric ? RhythiaX.getProfileMetric() : 'percentage';
  const speedOrder = RhythiaX.SPEED_ORDER;
  const buckets = RhythiaX.getSpeedBuckets(scores);
  const total = scores.length;
  const section = document.createElement('div');
  section.className = `rhythiax-profile-box rhythiax-profile-style-${style} rhythiax-profile-metric-${metric}`;

  const title = document.createElement('div');
  title.className = 'rhythiax-profile-box-title';
  title.innerHTML = '<span class="rhythiax-profile-box-heading"><svg class="rhythiax-profile-box-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 14 4-4"></path><path d="M3.34 19a10 10 0 1 1 17.32 0"></path></svg><span>Tempo Profile</span></span><span class="rhythiax-profile-box-meta"></span>';
  title.querySelector('.rhythiax-profile-box-meta').textContent = `${total} ${total === 1 ? 'play' : 'plays'}`;
  section.appendChild(title);

  const content = document.createElement('div');
  content.className = 'rhythiax-profile-list rhythiax-speed-list';
  content.setAttribute('aria-label', 'Plays grouped by speed modifier');

  speedOrder.forEach((key, index) => {
    const count = buckets[key];
    const percent = total ? Math.round((count / total) * 100) : 0;
    const active = RhythiaX.activeSpeed === key;
    const colors = RhythiaX.SPEED_COLORS[key] || ['#888', '#666'];
    const item = document.createElement('div');
    item.className = `rhythiax-profile-list-item rhythiax-speed-item${active || RhythiaX.activeSpeed === null ? ' active' : ''}${count === 0 ? ' rhythiax-profile-item-empty' : ''}`;
    item.dataset.speedKey = key;
    item.tabIndex = 0;
    item.setAttribute('role', 'button');
    item.setAttribute('aria-pressed', active ? 'true' : 'false');
    item.setAttribute('aria-label', `${key}x: ${count} ${count === 1 ? 'play' : 'plays'}, ${percent}%, click to filter`);
    item.style.setProperty('--speed-color', colors[0]);
    item.style.setProperty('--speed-color-end', colors[1]);
    item.style.setProperty('--item-idx', String(index));

    const barPercent = total ? (count / total) * 100 : 0;
    item.innerHTML = `<span class="rhythiax-profile-list-label">${key}x</span><span class="rhythiax-profile-list-track"><i style="width:${barPercent}%;background:linear-gradient(90deg, ${colors[0]}, ${colors[1]})"></i></span><span class="rhythiax-profile-list-count">${count} ${count === 1 ? 'play' : 'plays'}</span><span class="rhythiax-profile-list-share">${percent}%</span>`;

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
  const gradeSection = statsContainer.querySelector('.rhythiax-injected-grade-row') || statsContainer.querySelector('.rhythiax-profile-box') || RhythiaX.qs('.rhythiax-injected-grade-row') || RhythiaX.qs('.rhythiax-profile-box');
  if (profilesGrid) {
    profilesGrid.classList.add('rhythiax-profile-page-grid');
    profilesGrid.appendChild(section);
  }
  else if (gradeSection && gradeSection.parentElement) gradeSection.after(section);
  else if (statsContainer.parentElement) statsContainer.after(section);
  else statsContainer.appendChild(section);
  return section;
};
