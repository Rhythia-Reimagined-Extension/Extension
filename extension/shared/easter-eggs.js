// =============================================
// Rhythia Reimagined - search number Easter eggs
// =============================================

;(function () {
  'use strict';

  const EGG_CLASS = 'rhythiax-number-egg';
  const SIXTY_SEVEN_DURATION = 4000;
  const SIXTY_NINE_DURATION = 4000;
  const FOUR_TWENTY_DURATION = 2000;

  function eggType(number) {
    return number === '67' ? 'sixty-seven' : number === '69' ? 'sixty-nine' : 'four-twenty';
  }

  function showSearchEgg(input, number) {
    document.querySelector('.rhythiax-search-egg')?.remove();

    const rect = input.getBoundingClientRect();
    const egg = document.createElement('span');
    egg.className = `rhythiax-search-egg ${EGG_CLASS} ${EGG_CLASS}--${eggType(number)} ${EGG_CLASS}--active`;
    egg.style.left = `${rect.left + rect.width / 2}px`;
    egg.style.top = `${rect.top}px`;
    egg.setAttribute('aria-hidden', 'true');
    if (number === '67') {
      egg.innerHTML = '<span class="rhythiax-number-egg__digit">6</span><span class="rhythiax-number-egg__digit">7</span>';
    } else {
      egg.textContent = number;
    }
    document.body.appendChild(egg);

    const duration = number === '67' ? SIXTY_SEVEN_DURATION
      : number === '69' ? SIXTY_NINE_DURATION : FOUR_TWENTY_DURATION;
    window.setTimeout(() => egg.remove(), duration);
  }

  function init() {
    document.addEventListener('input', event => {
      const input = event.target;
      if (!input.matches?.('input[cmdk-input], input[placeholder*="Search players"]')) return;
      const number = input.value.trim();
      if (/^(67|69|420)$/.test(number)) showSearchEgg(input, number);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
