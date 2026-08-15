// =============================================
// Rhythia X — Score filters
// =============================================

var RhythiaX = RhythiaX || {};

// ─── Score filter (grade + speed) ────────────
RhythiaX.applyScoreFilter = function () {
  const cards = RhythiaX.findScoreCards();
  cards.forEach(card => {
    const grade = card.dataset.rhythiaxGrade || '?';
    const speed = RhythiaX.normalizeSpeed(card.dataset.rhythiaxSpeed);

    // Grade filter
    const gradeVisible = RhythiaX.activeGrades === null || RhythiaX.activeGrades.has(grade);
    // Speed filter
    const speedVisible = RhythiaX.activeSpeed === null || RhythiaX.activeSpeed === speed;

    if (gradeVisible && speedVisible) {
      card.style.display = '';
    } else {
      card.style.display = 'none';
    }
  });
};
