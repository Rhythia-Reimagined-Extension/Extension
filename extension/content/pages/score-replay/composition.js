// =============================================
// Rhythia X - Score replay page enhancements
// =============================================

var RhythiaX = RhythiaX || {};

(function () {
  const FULLSCREEN_BUTTON = 'rhythiax-score-replay-fullscreen-button';
  const PLAYBACK_SELECTOR = '[aria-label="Playback position"]';
  const MUSIC_SELECTOR = '[aria-label="Music volume"]';
  const HITSOUND_SELECTOR = '[aria-label="Hitsound volume"]';
  let fullscreenCleanup = null;

  const enterFullscreenIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 3H5a2 2 0 0 0-2 2v3"></path><path d="M21 8V5a2 2 0 0 0-2-2h-3"></path><path d="M3 16v3a2 2 0 0 0 2 2h3"></path><path d="M16 21h3a2 2 0 0 0 2-2v-3"></path></svg>';
  const exitFullscreenIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 3v3a2 2 0 0 1-2 2H3"></path><path d="M21 8h-3a2 2 0 0 1-2-2V3"></path><path d="M3 16h3a2 2 0 0 1 2 2v3"></path><path d="M16 21v-3a2 2 0 0 1 2-2h3"></path></svg>';

  function findScoreReplayPlayer() {
    const playbackControls = RhythiaX.ScoreReplayPageAdapter.queryAll(PLAYBACK_SELECTOR);

    for (const playback of playbackControls) {
      let candidate = playback.parentElement;
      while (candidate && candidate !== document.body) {
        if (
          candidate.querySelector('canvas')
          && candidate.querySelector(PLAYBACK_SELECTOR)
          && candidate.querySelector(MUSIC_SELECTOR)
          && candidate.querySelector(HITSOUND_SELECTOR)
        ) {
          return candidate;
        }
        candidate = candidate.parentElement;
      }
    }

    return null;
  }

  function findControlsBar(player) {
    return RhythiaX.ScoreReplayPageAdapter.queryAll('div', player).find(element => {
      const className = String(element.className || '');
      return className.includes('border-t')
        && className.includes('p-3')
        && element.querySelector(PLAYBACK_SELECTOR)
        && element.querySelector(MUSIC_SELECTOR)
        && element.querySelector(HITSOUND_SELECTOR);
    }) || null;
  }

  function updateFullscreenState(button, player) {
    const active = document.fullscreenElement === player;
    player.classList.toggle('rhythiax-score-replay-fullscreen', active);
    button.setAttribute('aria-label', active ? 'Exit fullscreen' : 'Enter fullscreen');
    button.title = active ? 'Exit fullscreen' : 'Enter fullscreen';
    button.innerHTML = active ? exitFullscreenIcon : enterFullscreenIcon;
  }

  function addFullscreenButton(player, controlsBar) {
    if (controlsBar.querySelector(`.${FULLSCREEN_BUTTON}`)) return true;
    if (typeof player.requestFullscreen !== 'function') return false;
    fullscreenCleanup?.();

    const button = document.createElement('button');
    button.type = 'button';
    button.className = FULLSCREEN_BUTTON;
    button.setAttribute('aria-label', 'Enter fullscreen');
    button.title = 'Enter fullscreen';
    button.innerHTML = enterFullscreenIcon;

    const volumeGroup = [...controlsBar.children].find(child => (
      child.querySelector?.(MUSIC_SELECTOR) && child.querySelector?.(HITSOUND_SELECTOR)
    ));
    (volumeGroup || controlsBar).appendChild(button);

    const onFullscreenChange = () => {
      if (!button.isConnected) {
        fullscreenCleanup?.();
        return;
      }
      updateFullscreenState(button, player);
    };

    fullscreenCleanup = () => {
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      player.classList.remove('rhythiax-score-replay-fullscreen');
      fullscreenCleanup = null;
    };

    button.addEventListener('click', async () => {
      try {
        if (document.fullscreenElement === player) {
          await document.exitFullscreen();
        } else {
          await player.requestFullscreen();
        }
      } catch (error) {
        RhythiaX.log('Score replay fullscreen failed', error);
      }
    });
    document.addEventListener('fullscreenchange', onFullscreenChange);
    updateFullscreenState(button, player);
    return true;
  }

  RhythiaX.injectScoreReplay = function () {
    if (RhythiaX.injected) return true;

    const player = findScoreReplayPlayer();
    if (!player) {
      RhythiaX.log('Score replay player not ready yet');
      return false;
    }

    const controlsBar = findControlsBar(player);
    if (!controlsBar) {
      RhythiaX.log('Score replay controls not ready yet');
      return false;
    }

    if (!addFullscreenButton(player, controlsBar)) {
      RhythiaX.log('Fullscreen API is not available for the score replay player');
      return false;
    }

    RhythiaX.injected = true;
    RhythiaX.log('Score replay fullscreen control injected');
    return true;
  };

  RhythiaX.cleanupScoreReplay = function () {
    fullscreenCleanup?.();
  };

  RhythiaX.ScoreReplayPageComposition = { install() {}, inject: RhythiaX.injectScoreReplay };
})();
