// =============================================
// Rhythia X — Stats calculations
// =============================================

var RhythiaX = RhythiaX || {};

// ─── Weighted RP calculation ────────────────
// Simply sums the weighted RP values from scores (scraped from page or API).
// No client-side math — the page/API already computes this correctly.
RhythiaX.calcWeightedRp = function (scores) {
  if (!scores.length) return 0;
  const deduped = RhythiaX.dedupeScores(scores);
  if (!deduped.length) return 0;
   return deduped.reduce((sum, s) => sum + (RhythiaX.parseLocalizedNumber
     ? RhythiaX.parseLocalizedNumber(s.weightedRp)
     : (parseFloat(s.weightedRp) || 0)), 0);
};

RhythiaX.calcRawUnweightedRp = function (scores) {
  if (!scores.length) return 0;
  const deduped = RhythiaX.dedupeScores(scores);
  return deduped.reduce((sum, s) => sum + (RhythiaX.parseLocalizedNumber
    ? RhythiaX.parseLocalizedNumber(s.rpEarned)
    : (parseFloat(s.rpEarned) || 0)), 0);
};

// Debug: log grade distribution after mapping
RhythiaX._logGradeDist = function (scores) {
  const dist = {};
  scores.forEach(s => { dist[s.grade] = (dist[s.grade] || 0) + 1; });
  RhythiaX.log('Grade distribution:', dist);
};

RhythiaX.getSpeedBuckets = function (scores) {
  const buckets = {};
  RhythiaX.SPEED_ORDER.forEach(key => { buckets[key] = 0; });
  scores.forEach(score => {
    const speed = RhythiaX.normalizeSpeed(score.speed);
    const closest = RhythiaX.SPEED_ORDER.reduce((best, key) =>
      Math.abs(Number(key) - Number(speed)) < Math.abs(Number(best) - Number(speed)) ? key : best
    );
    buckets[closest]++;
  });
  return buckets;
};
