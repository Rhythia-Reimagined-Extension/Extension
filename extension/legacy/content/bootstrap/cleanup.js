// =============================================
// Reimagined for Rhythia — Classic's own elements taken off the page before it is built again
// =============================================

var RhythiaX = RhythiaX || {};

// ─── Cleanup stale injected elements ─────────
RhythiaX.cleanupStaleElements = function (preserveCards) {
  RhythiaX.cleanupOfficialStats?.();
  RhythiaX.cleanupFriendsQuickList?.();
  RhythiaX.qsa('.rhythiax-friends-quick-panel').forEach(el => el.remove());
  RhythiaX.qsa('.rhythiax-friends-quick-backdrop').forEach(el => el.remove());
  RhythiaX.qsa('.rhythiax-absolute-date').forEach(el => el.remove());
  if (!preserveCards) {
    RhythiaX.qsa('.rhythiax-stats-panel').forEach(el => el.remove());
    RhythiaX.qsa('.rhythiax-stats-tabs').forEach(el => el.remove());
    RhythiaX.qsa('.rhythiax-reimagined-stats-body').forEach(el => el.remove());
    RhythiaX.qsa('.rhythiax-history-row').forEach(el => el.remove());
  }
  RhythiaX.qsa('.rhythiax-compare-profile-button').forEach(el => el.remove());
  if (RhythiaX.isModuleEnabled && !RhythiaX.isModuleEnabled('playerCompare')) {
    RhythiaX.qsa('.rhythiax-compare-tray').forEach(el => el.remove());
    RhythiaX.CompareView?.cleanupModal?.();
  }
  if (!preserveCards) {
    RhythiaX.TitleProgression?.Service?.cleanup?.();
    RhythiaX.qsa('.rhythiax-title-progression-host').forEach(el => el.remove());
  }
  if (preserveCards) return;
  RhythiaX.ScoreCardService?.resetScoresHub?.();
  RhythiaX.qsa('.rhythiax-card-btn-native-actions').forEach(btn => {
    if (btn._rhythiaxPlaceholder && btn._rhythiaxPlaceholder.parentNode) {
      btn.classList.remove('rhythiax-card-btn', 'rhythiax-card-btn-native-actions');
      btn._rhythiaxPlaceholder.parentNode.insertBefore(btn, btn._rhythiaxPlaceholder);
      btn._rhythiaxPlaceholder.remove();
      delete btn._rhythiaxPlaceholder;
    }
  });
  RhythiaX.qsa('.rhythiax-scores-hub').forEach(el => el.remove());
  RhythiaX.qsa('.rhythiax-native-score-section-hidden').forEach(el => {
    el.classList.remove('rhythiax-native-score-section-hidden');
    el.style.removeProperty('display');
  });
  RhythiaX.qsa('.rhythiax-pinned-scores-section').forEach(el => el.remove());
  RhythiaX.qsa('.rhythiax-profile-crown').forEach(el => el.remove());
  RhythiaX.qsa('.rhythiax-profile-avatar-effect').forEach(el => el.remove());
  RhythiaX.qsa('.rhythiax-profile-avatar-effect-host').forEach(el => el.classList.remove('rhythiax-profile-avatar-effect-host'));
  if (!/^\/player\/255585(?:\/|$)/.test(window.location.pathname)) {
    RhythiaX.qsa('.rhythiax-creator-badge').forEach(el => el.remove());
  }
  RhythiaX.qsa('.rhythiax-score-replay-fullscreen-button').forEach(el => el.remove());
  RhythiaX.qsa('.rhythiax-score-replay-fullscreen').forEach(el => el.classList.remove('rhythiax-score-replay-fullscreen'));

  // Reset ALL injected classes on cards so they can be re-applied
  RhythiaX.qsa('.rhythiax-score-card').forEach(el => {
    if (el.closest('.rhythiax-scores-hub')) return;
    el.classList.remove(
      'rhythiax-score-card', 'rhythiax-podium-gold', 'rhythiax-podium-silver',
      'rhythiax-podium-bronze', 'rhythiax-reigning', 'rhythiax-redesigned'
    );
    // Restore native actions button to its placeholder if moved
    const nativeBtn = el.querySelector('.rhythiax-card-btn-native-actions');
    if (nativeBtn && nativeBtn._rhythiaxPlaceholder && nativeBtn._rhythiaxPlaceholder.parentNode) {
      nativeBtn.classList.remove('rhythiax-card-btn', 'rhythiax-card-btn-native-actions');
      nativeBtn._rhythiaxPlaceholder.parentNode.insertBefore(nativeBtn, nativeBtn._rhythiaxPlaceholder);
      nativeBtn._rhythiaxPlaceholder.remove();
      delete nativeBtn._rhythiaxPlaceholder;
    }
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
