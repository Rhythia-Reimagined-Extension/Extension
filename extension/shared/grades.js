// =============================================
// Reimagined for Rhythia — grade letters
// =============================================
// The one rule for a score's grade letter, used by Exodus and Classic. A letter Rhythia supplied (sent
// by its API or shown on its own score card) is used as it is. Otherwise the letter comes from the
// accuracy on Rhythia's scale: SS for 100% without a miss, then S, A, B, C and D from the lowest
// accuracies in MIN, and F below D or for a play the API or the page marks as failed. Pass `letter`
// only when Rhythia supplied it and `failed` only when the play is marked as failed. Each look colours
// a letter by its role in its own CSS (Classic --grade-<role>, Exodus --g-<LETTER>).
// No DOM and no chrome.* here: this runs in either look and in tests.

var RhythiaX = RhythiaX || {};

// Both looks can share a tab (Classic added to a page Exodus does not take): defined only once.
RhythiaX.Grades = RhythiaX.Grades || (function () {
  'use strict';

  // Best first. legacy/core/constants.js keeps the same list as RhythiaX.GRADE_ORDER.
  const ORDER = Object.freeze(['SS', 'S', 'A', 'B', 'C', 'D', 'F']);
  // The lowest accuracy (percent) for each letter worked out from accuracy (Rhythia's scale); below MIN.D is F.
  const MIN = Object.freeze({ S: 98, A: 95, B: 93, C: 90, D: 80 });

  // Rhythia's own letter, trimmed and upper-cased, when it is one of ORDER; else ''.
  function supplied(letter) {
    const value = typeof letter === 'string' ? letter.trim().toUpperCase() : '';
    return ORDER.includes(value) ? value : '';
  }

  // The letter for an accuracy in percent and a miss count; '' when the accuracy is not a finite number.
  function fromAccuracy(accuracy, misses) {
    if (!Number.isFinite(accuracy)) return '';
    if ((Number(misses) || 0) === 0 && accuracy >= 100) return 'SS';
    if (accuracy >= MIN.S) return 'S';
    if (accuracy >= MIN.A) return 'A';
    if (accuracy >= MIN.B) return 'B';
    if (accuracy >= MIN.C) return 'C';
    if (accuracy >= MIN.D) return 'D';
    return 'F';
  }

  // Rhythia's letter first, then F for a failed play, then the letter for the accuracy ('' without one).
  function of({ letter, accuracy, misses, failed } = {}) {
    return supplied(letter) || (failed === true ? 'F' : fromAccuracy(accuracy, misses));
  }

  // The colour role of a letter: 'ss', 's', 'a', 'b', 'c', 'd' or 'f'; 'none' for anything else.
  function role(letter) {
    const value = supplied(letter);
    return value ? value.toLowerCase() : 'none';
  }

  return { ORDER, MIN, supplied, fromAccuracy, of, role };
})();
