// =============================================
// Rhythia X — DOM cleanup
// =============================================

var RhythiaX = RhythiaX || {};

// ─── Cleanup stale injected elements ─────────
RhythiaX.cleanupStaleElements = function (preserveCards) {
  if (!preserveCards) {
    RhythiaX.activeGrades = null;
    RhythiaX.activeSpeed = null;
  }
  RhythiaX.cleanupOfficialStats?.();
  // API refreshes retain the Title Progression card, so its in-flight RP
  // animation must continue rather than being cancelled mid-transition.
  if (!preserveCards) RhythiaX.cleanupRankProgressAnimations?.();
  RhythiaX.cleanupFriendsQuickList?.();
  RhythiaX.qsa('.rhythiax-friends-quick-panel').forEach(el => el.remove());
  RhythiaX.qsa('.rhythiax-friends-quick-backdrop').forEach(el => el.remove());
  RhythiaX.qsa('.rhythiax-absolute-date').forEach(el => el.remove());
  RhythiaX.qsa('.rhythiax-stats-panel').forEach(el => el.remove());
  // Also remove our injected sections from the official stats container
  RhythiaX.qsa('.rhythiax-injected-stats-section').forEach(el => el.remove());
   RhythiaX.qsa('.rhythiax-injected-grade-row').forEach(el => el.remove());
  RhythiaX.qsa('.rhythiax-profiles-grid').forEach(el => el.remove());
  RhythiaX.qsa('.rhythiax-profile-box').forEach(el => el.remove());
  RhythiaX.qsa('.rhythiax-history-row').forEach(el => el.remove());
  if (preserveCards) return;
  RhythiaX.qsa('.rhythiax-profile-crown').forEach(el => el.remove());
  RhythiaX.qsa('.rhythiax-profile-avatar-effect').forEach(el => el.remove());
  RhythiaX.qsa('.rhythiax-profile-avatar-effect-host').forEach(el => el.classList.remove('rhythiax-profile-avatar-effect-host'));
  RhythiaX.qsa('.rhythiax-profile-score-tab-strip').forEach(el => {
    if (el._rhythiaxResizeObserver) {
      el._rhythiaxResizeObserver.disconnect();
      delete el._rhythiaxResizeObserver;
    }
    delete el.__rhythiaxResizeObserved;
  });
  RhythiaX.qsa('.rhythiax-score-replay-fullscreen-button').forEach(el => el.remove());
  RhythiaX.qsa('.rhythiax-score-replay-fullscreen').forEach(el => el.classList.remove('rhythiax-score-replay-fullscreen'));

  // Unwrap accordions without deleting the original page card. API refreshes
  // preserve the existing Title Progression accordion so it is not lost after
  // the new stats are inserted.
  RhythiaX.qsa('.rhythiax-accordion').forEach(el => {
    const body = el.querySelector(':scope > .rhythiax-accordion-body');
    el._rhythiaxAccordionCleanup?.();
    const bodyInner = body?.querySelector(':scope > .rhythiax-accordion-body-inner');
    if (body) {
      // bodyInner retains the original header followed by every original card
      // child, so moving its children restores the pre-wrap hierarchy exactly.
      const children = [...(bodyInner?.children || [])];
      children.forEach(child => {
        if (child.hasAttribute('data-rhythiax-original-header')) {
          child.style.display = child.getAttribute('data-rhythiax-original-display') || '';
          child.removeAttribute('data-rhythiax-original-header');
          child.removeAttribute('data-rhythiax-original-display');
        }
        el.appendChild(child);
      });
      body.remove();
    }
    el.querySelector(':scope > .rhythiax-accordion-header')?.remove();
    if (el.hasAttribute('data-rhythiax-original-overflow')) {
      el.classList.add('overflow-hidden');
      el.removeAttribute('data-rhythiax-original-overflow');
    }
    el.classList.remove('rhythiax-accordion', 'rhythiax-accordion-collapsed', 'rhythiax-accordion-expanded');
    delete el._rhythiaxAccordionCleanup;
  });

  // Reset ALL injected classes on cards so they can be re-applied
  RhythiaX.qsa('.rhythiax-score-card').forEach(el => {
    el.classList.remove(
      'rhythiax-score-card', 'rhythiax-podium-gold', 'rhythiax-podium-silver',
      'rhythiax-podium-bronze', 'rhythiax-reigning', 'rhythiax-redesigned'
    );
    // Clear any injected inner content we added
    const wrapper = el.querySelector('.rhythiax-redesign-wrapper');
    if (wrapper) wrapper.remove();
    el.querySelectorAll('[data-rhythiax-original-display]').forEach(child => {
      child.style.display = child.getAttribute('data-rhythiax-original-display');
      child.removeAttribute('data-rhythiax-original-display');
    });
  });
  RhythiaX.qsa('.rhythiax-expanded-panel').forEach(el => el.classList.remove('rhythiax-expanded-panel'));
};
