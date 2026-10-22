// =============================================
// Rhythia X — Score filters
// =============================================

var RhythiaX = RhythiaX || {};

// ─── Score filter (grade + speed) ────────────
RhythiaX.applyScoreFilter = function () {
  const cards = RhythiaX.findScoreCards();
  cards.forEach(card => {
    let grade = card.dataset.rhythiaxGrade;
    let speed = card.dataset.rhythiaxSpeed;

    if (!grade || !speed) {
      try {
        const parsed = RhythiaX.ScoreCardDomain?.parse ? RhythiaX.ScoreCardDomain.parse(card) : null;
        if (parsed?.score) {
          if (!grade && parsed.score.grade) {
            grade = parsed.score.grade;
            card.dataset.rhythiaxGrade = grade;
          }
          if (!speed && parsed.score.speed) {
            speed = RhythiaX.normalizeSpeed(parsed.score.speed);
            card.dataset.rhythiaxSpeed = speed;
          }
        } else if (RhythiaX.parseScoreCard) {
          const score = RhythiaX.parseScoreCard(card);
          if (!grade && score.grade) {
            grade = score.grade;
            card.dataset.rhythiaxGrade = grade;
          }
          if (!speed && score.speed) {
            speed = RhythiaX.normalizeSpeed(score.speed);
            card.dataset.rhythiaxSpeed = speed;
          }
        }
      } catch (_) {}
    }

    grade = grade || '?';
    speed = RhythiaX.normalizeSpeed(speed);

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
