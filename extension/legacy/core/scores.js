// =============================================
// Reimagined for Rhythia — Score objects, weighting & API mapping
// =============================================

var RhythiaX = RhythiaX || {};

// Keep DOM, API and cache score objects interchangeable. Renderers may add
// derived fields, but these core fields always have the same names/types.
RhythiaX.normalizeScore = function (score) {
  const next = { ...(score || {}) };
  next.scoreId = String(next.scoreId ?? next.id ?? '');
  next.grade = String(next.grade || '?').toUpperCase();
  next.accuracy = next.accuracy === '' || next.accuracy == null ? '—' : String(next.accuracy);
  next.misses = String(next.misses ?? '0');
  const parsedMisses = Number.parseInt(next.misses, 10);
  next.fullCombo = !Number.isNaN(parsedMisses)
    ? parsedMisses === 0
    : (next.fullCombo === true || next.fullCombo === 1);
  next.rpEarned = String(next.rpEarned ?? next.rawRp ?? '0');
  next.weightedRp = String(next.weightedRp ?? '0');
  next.songTitle = String(next.songTitle || next.title || 'Unknown');
  next.artist = String(next.artist || '');
  next.difficulty = String(next.difficulty || '');
  next.speed = RhythiaX.normalizeSpeed(next.speed);
  next.mods = String(next.mods || '--');
  next.notes = String(next.notes ?? '0');
  next.beatmapNotes = next.beatmapNotes === '' || next.beatmapNotes == null ? null : Number(next.beatmapNotes);
  if (!Number.isFinite(next.beatmapNotes) || next.beatmapNotes <= 0) next.beatmapNotes = null;
  next.beatmapDifficulty = next.beatmapDifficulty === '' || next.beatmapDifficulty == null ? null : Number(next.beatmapDifficulty);
  if (!Number.isFinite(next.beatmapDifficulty) || next.beatmapDifficulty < 0) next.beatmapDifficulty = null;
  next.timeAgo = String(next.timeAgo || '');
  next.date = next.date || next.createdAt || next.submittedAt || next.created_at || '';
  next.replayUrl = String(next.replayUrl || next.replay_url || '');
  next.beatmapHash = String(next.beatmapHash || next.hash || next.songId || '');
  next.songId = String(next.songId || next.beatmapHash || '');
  next.beatmapId = String(next.beatmapId || next.mapId || '');
  next.mapper = String(next.mapper || next.ownerUsername || next.author || next.beatmapAuthor || '');
  if (!next.mapper) {
    const mapKey = next.beatmapId || next.songId || next.beatmapHash;
    if (mapKey && RhythiaX.getStoredBeatmapMeta) {
      const meta = RhythiaX.getStoredBeatmapMeta(mapKey);
      if (meta?.ownerUsername) {
        next.mapper = String(meta.ownerUsername).trim();
        next.ownerUsername = next.mapper;
      }
    }
  }
  if (score?.rankIndex !== undefined) next.rankIndex = score.rankIndex;
  if (score?.weightPercent !== undefined) next.weightPercent = score.weightPercent;
  return next;
};

RhythiaX.applyWeightedRanking = function (scores) {
  (scores || []).forEach((score, index) => {
    const rawRp = RhythiaX.parseLocalizedNumber
      ? RhythiaX.parseLocalizedNumber(score.rpEarned)
      : (Number.parseFloat(String(score.rpEarned ?? '').replace(/,/g, '')) || 0);
    const factor = Math.pow(0.97, index);
    score.rankIndex = index + 1;
    score.weightedRp = String(Math.round(rawRp * factor));
    score.weightPercent = Math.round(factor * 100);
  });
  return scores || [];
};

// Recent plays contribute only when that exact submission is in this mode's top 100.
RhythiaX.applyRecentWeightedRanking = function (recentScores, topScores) {
  const topById = new Map((topScores || []).slice(0, 100)
    .filter(score => score.scoreId)
    .map(score => [String(score.scoreId), score]));
  (recentScores || []).forEach(score => {
    const topScore = score.scoreId ? topById.get(String(score.scoreId)) : null;
    score.weightedRp = topScore ? String(topScore.weightedRp ?? '0') : '0';
    score.weightPercent = topScore ? (topScore.weightPercent ?? 0) : 0;
  });
  return recentScores || [];
};

RhythiaX.dedupeScores = function (scores) {
  if (!scores || !scores.length) return [];
  const bestPerMap = new Map();
  const parseNum = value => (RhythiaX.parseLocalizedNumber ? RhythiaX.parseLocalizedNumber(value) : (Number.parseFloat(String(value ?? '').replace(/,/g, '')) || 0));
  scores.forEach(s => {
    const key = s.scoreId || [s.songTitle, s.mods, s.speed, s.difficultyColor].join('|') || 'unknown-score';
    const rp = parseNum(s.rpEarned);
    const existing = bestPerMap.get(key);
    if (!existing || rp > parseNum(existing.rpEarned)) {
      bestPerMap.set(key, s);
    }
  });
  return Array.from(bestPerMap.values());
};

RhythiaX.mapApiScores = function (rawScores) {
  if (!Array.isArray(rawScores)) return [];
  return rawScores.filter(s => s && typeof s === 'object' && !Array.isArray(s)).map(s => {
    let accuracy = '—';
    let accNum = null;
    const noteCount = s.beatmapNotes ?? s.totalNotes ?? s.noteCount;
    const beatmapDifficulty = s.beatmapDifficulty ?? s.beatmap_difficulty ?? s.difficultyRating ?? s.starRating
      ?? (typeof s.difficulty === 'number' ? s.difficulty : undefined);
    const missCount = s.misses ?? s.missCount ?? s.numMisses ?? 0;
    if (s.accuracy !== undefined && s.accuracy !== null) {
      accNum = RhythiaX.parseLocalizedNumber
        ? RhythiaX.parseLocalizedNumber(s.accuracy)
        : Number.parseFloat(String(s.accuracy).replace('%', ''));
      if (Number.isFinite(accNum)) accuracy = accNum.toFixed(2) + '%';
    } else if (noteCount > 0) {
      accNum = noteCount > 0 ? (1 - missCount / noteCount) * 100 : null;
      if (accNum !== null) accuracy = accNum.toFixed(2) + '%';
    }

    const letter = RhythiaX.Grades.supplied(s.grade);
    // Only a letter Rhythia sent is marked as its own; the one worked out below is not (ScoreCardDomain.getGrade).
    const gradeSource = letter ? 'api' : undefined;
    // Rhythia's letter, else F for a failed play, else the letter for the accuracy (shared/grades.js);
    // '?' without an accuracy.
    const grade = RhythiaX.Grades.of({ letter, accuracy: accNum, misses: missCount, failed: s.passed === false }) || '?';
    const misses = String(s.misses ?? s.missCount ?? s.numMisses ?? 0);
    const pickValue = (...values) => {
      const usable = values.filter(value => value !== undefined && value !== null && value !== '');
      return usable.find(value => {
        const num = RhythiaX.parseLocalizedNumber
          ? RhythiaX.parseLocalizedNumber(value)
          : Number.parseFloat(String(value).replace(',', '.'));
        return Number.isFinite(num) && num !== 0;
      }) ?? usable[0] ?? 0;
    };
    // Raw RP is the unweighted value earned by the play. `awarded_sp` is only
    // a final fallback because some API responses expose weighted gain there.
    const rpEarnedValue = pickValue(s.rawRp, s.raw_rp, s.rpEarned, s.rp_earned, s.awarded_sp, s.awardedSp);
    const rpEarned = String(rpEarnedValue ?? 0);
    const songTitle = s.beatmapTitle || s.songTitle || s.title || s.beatmapName || s.mapName || s.song_name || 'Unknown';
    const scoreId = String(s.id ?? s.scoreId ?? s.score_id ?? '');
    const rawSpeed = s.speed ?? s.speedMultiplier ?? s.speed_multiplier ?? s.multiplier ?? s.modSpeed ?? (/^\d+(?:\.\d+)?x?$/i.test(String(s.mod || '')) ? s.mod : undefined);
    const speed = RhythiaX.normalizeSpeed(rawSpeed);
    const mods = Array.isArray(s.mods)
      ? s.mods.join(', ') || '--'
      : s.mods && typeof s.mods === 'object'
        ? Object.keys(s.mods).filter(k => s.mods[k]).join(', ') || '--'
        : String(s.mods ?? s.modifiers ?? (/^\d+(?:\.\d+)?x?$/i.test(String(s.mod || '')) ? '--' : (s.mod ?? '--')));
    // WRP must be the score's current weighted value. `gainedRp` is a
    // different API field and can represent historical/earned RP.
    const weightedValue = pickValue(s.weightedRp, s.weightedRP, s.weighted_rp, s.weighted_sp, s.weightedSp, s.weightedSP, s.weightedScore, s.weighted_score, s.awarded_weighted_sp, s.awardedWeightedSp, s.awardedWeightedSP, s.weighted, s.gainedWeightedRp, s.gained_weighted_rp, s.score?.weightedRp, s.score?.weighted_rp, s.gainedRp, s.gained_rp, s.score?.gainedRp, s.score?.gained_rp);
    const weightedRp = String(weightedValue ?? 0);
    const fullCombo = s.fullCombo ?? s.full_combo ?? s.isFullCombo;
    return RhythiaX.normalizeScore({
      grade, accuracy, misses, fullCombo, rpEarned, songTitle, scoreId, speed, mods, weightedRp,
      ...(gradeSource ? { gradeSource } : {}),
      difficulty: s.difficulty || s.difficultyName || s.level || '',
      beatmapNotes: noteCount,
      beatmapDifficulty,
      notes: String(noteCount ?? 0),
      replayUrl: s.replay_url || s.replayUrl || '',
      beatmapHash: s.beatmapHash || s.songId || '',
      songId: s.songId || s.beatmapHash || '',
      beatmapId: s.beatmapId || s.mapId || '',
      mapper: s.mapper || s.ownerUsername || s.author || s.beatmapAuthor || s.creator || '',
      date: s.created_at || s.createdAt || s.date || '',
    });
  });
};
