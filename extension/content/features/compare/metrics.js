// Score normalization and weighted metric preparation, independent of the DOM.
var RhythiaX = RhythiaX || {};

(function () {
  const weightedCache = new WeakMap();
  const sortedCache = new WeakMap();

  function number(value) {
    const parsed = RhythiaX.parseLocalizedNumber ? RhythiaX.parseLocalizedNumber(value) : Number.parseFloat(String(value ?? '').replace(/[^0-9.-]/g, ''));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function scoreNumber(score, key) {
    if (!score || score[key] === undefined || score[key] === null || score[key] === '') return null;
    const raw = String(score[key]).trim();
    if (!/[0-9]/.test(raw)) return null;
    const value = RhythiaX.parseLocalizedNumber ? RhythiaX.parseLocalizedNumber(raw.replace('%', '')) : Number.parseFloat(raw.replace(/,/g, '').replace('%', ''));
    return Number.isFinite(value) ? value : null;
  }

  function clamp(value, min, max) { return Math.min(max, Math.max(min, value)); }

  function scoreRankValue(score) {
    const weighted = scoreNumber(score, 'weightedRp');
    const earned = scoreNumber(score, 'rpEarned');
    return weighted > 0 ? weighted : (earned > 0 ? earned : 0);
  }

  function weightedMetrics(scores) {
    if (!Array.isArray(scores) || !scores.length) return null;
    if (weightedCache.has(scores)) return weightedCache.get(scores);
    let totalWeight = 0; let weightedAccuracy = 0; let weightedMissRate = 0; let weightedSpeed = 0; let totalNotes = 0; let maps = 0;
    scores.forEach(score => {
      const accuracy = scoreNumber(score, 'accuracy');
      const notes = scoreNumber(score, 'beatmapNotes') ?? scoreNumber(score, 'notes');
      if (accuracy === null || notes === null || notes <= 0) return;
      const speed = scoreNumber(score, 'speed');
      const difficulty = scoreNumber(score, 'beatmapDifficulty');
      const speedMultiplier = speed === null ? 1 : 1 + clamp((speed - 1) / 1.5, 0, 1) * 0.18;
      const difficultyMultiplier = difficulty === null ? 1 : 1 + clamp((difficulty - 1) / 9, 0, 1) * 0.14;
      const weight = notes * speedMultiplier * difficultyMultiplier;
      totalWeight += weight;
      weightedAccuracy += accuracy * weight;
      weightedMissRate += (scoreNumber(score, 'misses') ?? 0) / notes * 100 * weight;
      if (speed !== null) weightedSpeed += speed * weight;
      totalNotes += notes;
      maps++;
    });
    const result = totalWeight > 0 ? { accuracy: weightedAccuracy / totalWeight, missRate: weightedMissRate / totalWeight, speed: weightedSpeed / totalWeight, maps, notes: totalNotes } : null;
    weightedCache.set(scores, result);
    return result;
  }

  function topScores(profile) {
    if (sortedCache.has(profile)) return sortedCache.get(profile);
    const scores = (profile.scoreSets?.topScores || profile.scoreSets?.scores || []).filter(score => String(score.songTitle || '').trim()).sort((left, right) => scoreRankValue(right) - scoreRankValue(left));
    sortedCache.set(profile, scores);
    return scores;
  }

  function scoreMapKey(score) {
    return String(score?.songTitle || score?.title || '').normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase();
  }

  function averageScoreValue(scores, key) {
    const values = scores.map(score => scoreNumber(score, key)).filter(value => value !== null);
    return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
  }

  RhythiaX.CompareMetrics = { number, scoreNumber, scoreRankValue, weightedMetrics, topScores, scoreMapKey, averageScoreValue };
})();
