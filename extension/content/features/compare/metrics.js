// Score calculations, direct light metrics, and shared map battle analysis.
var RhythiaX = RhythiaX || {};

(function () {
  const sortedCache = new WeakMap();
  const weightedCache = new WeakMap();

  function number(value) {
    const parsed = RhythiaX.parseLocalizedNumber ? RhythiaX.parseLocalizedNumber(value) : Number.parseFloat(String(value ?? '').replace(/[^0-9.-]/g, ''));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function scoreNumber(score, key) {
    if (!score || score[key] === undefined || score[key] === null || score[key] === '') return null;
    const raw = String(score[key]).trim();
    if (!/[0-9]/.test(raw)) return null;
    const value = RhythiaX.parseLocalizedNumber ? RhythiaX.parseLocalizedNumber(raw) : Number.parseFloat(raw.replace(/,/g, '').replace('%', ''));
    return Number.isFinite(value) ? value : null;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function scoreRankValue(score) {
    const weighted = scoreNumber(score, 'weightedRp');
    const earned = scoreNumber(score, 'rpEarned');
    return weighted > 0 ? weighted : (earned > 0 ? earned : 0);
  }

  function scoreMapKey(score) {
    return String(score?.songTitle || score?.title || '').normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase();
  }

  function topScores(profile) {
    if (sortedCache.has(profile)) return sortedCache.get(profile);
    const scores = (profile.scoreSets?.topScores || profile.scoreSets?.scores || [])
      .filter(score => String(score.songTitle || '').trim())
      .sort((left, right) => scoreRankValue(right) - scoreRankValue(left));
    sortedCache.set(profile, scores);
    return scores;
  }

  function scoreAccuracy(score) {
    const raw = scoreNumber(score, 'accuracy');
    if (raw === null || raw === undefined) return null;
    return (raw > 0 && raw <= 1) ? raw * 100 : raw;
  }

  // --- 4 Direct Light Metrics ---

  function averageAccuracy(scores) {
    if (!Array.isArray(scores) || !scores.length) return null;
    let sum = 0;
    let count = 0;
    scores.forEach(s => {
      const acc = scoreAccuracy(s);
      if (acc !== null && acc > 0) {
        sum += acc;
        count++;
      }
    });
    return count > 0 ? sum / count : null;
  }

  function averageSpeed(scores) {
    if (!Array.isArray(scores) || !scores.length) return null;
    let sum = 0;
    let count = 0;
    scores.forEach(s => {
      const spd = scoreNumber(s, 'speed');
      if (spd !== null && spd > 0) {
        sum += spd;
        count++;
      }
    });
    return count > 0 ? sum / count : null;
  }

  function averageMissRate(scores) {
    if (!Array.isArray(scores) || !scores.length) return null;
    let totalMisses = 0;
    let totalNotes = 0;
    let mapCount = 0;

    scores.forEach(s => {
      const misses = scoreNumber(s, 'misses') ?? 0;
      const notes = scoreNumber(s, 'beatmapNotes') ?? scoreNumber(s, 'notes');
      totalMisses += misses;
      mapCount++;
      if (notes !== null && notes > 0) {
        totalNotes += notes;
      }
    });

    const ratePercent = totalNotes > 0 ? (totalMisses / totalNotes) * 100 : 0;
    const perMap = mapCount > 0 ? totalMisses / mapCount : 0;

    return {
      rate: ratePercent,
      perMap: perMap,
      cleanliness: Math.max(0, 100 - (ratePercent * 15)), // Normalized cleanliness score (100% = FC)
    };
  }

  // Clashes on shared beatmaps
  function analyzeSharedMaps(p1Scores, p2Scores) {
    const p1Map = new Map();
    (p1Scores || []).forEach(score => {
      const key = scoreMapKey(score);
      if (key && !p1Map.has(key)) p1Map.set(key, score);
    });

    const clashes = [];
    let p1Wins = 0;
    let p2Wins = 0;
    let ties = 0;

    (p2Scores || []).forEach(score2 => {
      const key = scoreMapKey(score2);
      if (!key || !p1Map.has(key)) return;

      const score1 = p1Map.get(key);
      const acc1 = scoreAccuracy(score1) ?? 0;
      const acc2 = scoreAccuracy(score2) ?? 0;
      const diff = acc1 - acc2;

      let winner = 'tie';
      if (Math.abs(diff) < 0.001) {
        ties++;
      } else if (diff > 0) {
        winner = 'p1';
        p1Wins++;
      } else {
        winner = 'p2';
        p2Wins++;
      }

      clashes.push({
        title: score1.songTitle || score2.songTitle || 'Beatmap',
        difficulty: scoreNumber(score1, 'beatmapDifficulty') || scoreNumber(score2, 'beatmapDifficulty'),
        bpm: scoreNumber(score1, 'bpm') || scoreNumber(score2, 'bpm'),
        notes: scoreNumber(score1, 'beatmapNotes') || scoreNumber(score2, 'beatmapNotes'),
        p1: {
          accuracy: acc1,
          speed: scoreNumber(score1, 'speed') || 1,
          misses: scoreNumber(score1, 'misses') ?? 0,
          mods: score1.mods || [],
          diff: diff,
          isWinner: winner === 'p1',
        },
        p2: {
          accuracy: acc2,
          speed: scoreNumber(score2, 'speed') || 1,
          misses: scoreNumber(score2, 'misses') ?? 0,
          mods: score2.mods || [],
          diff: -diff,
          isWinner: winner === 'p2',
        },
        winner,
        delta: diff,
      });
    });

    // Sort by absolute delta descending by default
    clashes.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

    return {
      clashes,
      totalShared: clashes.length,
      p1Wins,
      p2Wins,
      ties,
    };
  }

  // Backward compatibility for weightedMetrics (used in player-compare.test.js)
  function weightedMetrics(scores) {
    if (!Array.isArray(scores) || !scores.length) return null;
    if (weightedCache.has(scores)) return weightedCache.get(scores);
    let totalWeight = 0;
    let weightedAccuracy = 0;
    let weightedMissRate = 0;
    let weightedSpeed = 0;
    let totalNotes = 0;
    let maps = 0;

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

    const result = totalWeight > 0 ? {
      accuracy: weightedAccuracy / totalWeight,
      missRate: weightedMissRate / totalWeight,
      speed: weightedSpeed / totalWeight,
      maps,
      notes: totalNotes
    } : null;

    weightedCache.set(scores, result);
    return result;
  }

  RhythiaX.CompareMetrics = {
    number,
    scoreNumber,
    scoreRankValue,
    scoreMapKey,
    topScores,
    averageAccuracy,
    averageSpeed,
    averageMissRate,
    analyzeSharedMaps,
    weightedMetrics,
  };
})();
