// =============================================
// Rhythia X — Score extraction & mapping
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
  next.fullCombo = next.fullCombo === true || next.fullCombo === 1 || Number.parseInt(next.misses, 10) === 0;
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
  next.date = next.date || next.createdAt || next.submittedAt || '';
  return next;
};

// ─── Score extraction ────────────────────────
RhythiaX.extractScores = function () {
  const cards = RhythiaX.findScoreCards();
  RhythiaX.log('Found score cards:', cards.length);

  return cards.map(RhythiaX.parseScoreCard);
};

RhythiaX.parseScoreCard = function (card) {
    const text = card.textContent;

    let grade = '?';
    const gradeEl = card.querySelector('[style*="color: rgb"]');
    if (gradeEl) {
      const g = gradeEl.textContent.trim();
      if (/^SS$/i.test(g)) grade = 'SS';
      else if (/^[SABCDEF]$/i.test(g)) grade = g;
    }
    card.dataset.rhythiaxGrade = grade;

    let accuracy = '';
    const accMatch = text.match(/(\d+\.?\d*)%/);
    if (accMatch) accuracy = accMatch[1] + '%';

    const link = RhythiaX.qs('a[href*="/score/"]', card);
    const scoreId = link?.href?.match(/\/score\/(\d+)/)?.[1] || '';
    const titleEl = card.querySelector('.truncate span, .whitespace-nowrap span, span.font-medium, .truncate');
    const songTitle = titleEl?.textContent?.trim()
      || (link && !/^\d+(\.\d+)?%$/.test(link.textContent.trim()) ? link.textContent.trim() : '')
      || 'Unknown';

    let timeAgo = '';
    const timeMatch = text.match(/(\d+\s+(second|minute|hour|day|week|month|year)s?\s+ago)/i);
    if (timeMatch) timeAgo = timeMatch[1];

    let misses = '0';
    const missBadge = card.querySelector('[class*="bg-red-700"]');
    if (missBadge) {
      const numEl = missBadge.querySelector('[class*="font-semibold"]');
      if (numEl) {
        const numText = numEl.textContent.trim();
        if (/^\d+$/.test(numText)) misses = numText;
      }
    }
    if (misses === '0') {
      const missesMatch = text.match(/(\d{1,3})\s*(?:miss|misses)/i);
      if (missesMatch) misses = missesMatch[1];
    }

    let rpEarned = '0';
    // Match "RP Earned" specifically first, then fall back to any RP
    // that is NOT "Weighted RP" (to avoid scraping the wrong value).
    const rpEarnedMatch = text.match(/RP\s+Earned\s*([\d,]+(?:\.\d+)?)/i);
    if (rpEarnedMatch) {
      rpEarned = rpEarnedMatch[1].replace(/,/g, '');
    } else {
      // Fallback: find all RP occurrences, skip "Weighted RP"
      const rpMatches = [...text.matchAll(/RP\s*([\d,]+(?:\.\d+)?)/gi)];
      for (const m of rpMatches) {
        const before = text.substring(Math.max(0, m.index - 12), m.index);
        if (!/Weighted\s*$/i.test(before)) {
          rpEarned = m[1].replace(/,/g, '');
          break;
        }
      }
    }

    const difficultyColor = card.style.getPropertyValue('--difficulty-color') || '';

    let speed = 1.0;
    const speedImg = card.querySelector('img[alt*="Speed:"]');
    if (speedImg) {
      const speedM = speedImg.alt.match(/Speed:\s*([\d.]+)x/);
      if (speedM) speed = parseFloat(speedM[1]);
    }
    card.dataset.rhythiaxSpeed = RhythiaX.normalizeSpeed(speed);

    const expanded = RhythiaX.findExpandedPanel(card);
    let mods = '--', notes = '0', weightedRp = '0';

    // Helper: parse pills from an element
    function parsePills(parent) {
      const labelEls = parent.querySelectorAll ? parent.querySelectorAll('.text-neutral-300, [class*="text-neutral-300"]') : [];
      labelEls.forEach(labelEl => {
        const pill = labelEl.closest ? (labelEl.closest('.bg-\\[\\#1F2021\\], [class*="rounded-lg"]') || labelEl.parentElement) : labelEl.parentElement;
        const valueEl = pill ? pill.querySelector('.text-neutral-100, [class*="text-neutral-100"]') : labelEl.nextElementSibling;
        if (!valueEl) return;
        const label = labelEl.textContent.trim();
        const value = valueEl.textContent.trim();
        if (label === 'Mods') mods = value;
        else if (label === 'Notes') notes = value;
        else if (label === 'Weighted RP') weightedRp = value;
        else if (label === 'RP Earned' && (!rpEarned || rpEarned === '0')) rpEarned = value;
        else if (label === 'Misses' && (!misses || misses === '0')) misses = value;
      });
    }

    if (expanded) {
      parsePills(expanded);
    }

    // Fallback: scan entire card's textContent if pills weren't found
    if (notes === '0' || weightedRp === '0' || mods === '--') {
      const fullText = card.textContent;
      // Notes is always digits
      const notesFallback = fullText.match(/Notes\s*(\d+)/i);
      if (notesFallback && notes === '0') notes = notesFallback[1];
      // Weighted RP is digits with optional decimal — only from the actual Weighted RP label
      const weightedFallback = fullText.match(/Weighted\s+RP\s*([\d.]+)/i);
      if (weightedFallback && weightedRp === '0') weightedRp = weightedFallback[1];
      // Mods fallback — look for something like "1.35x" or "NM" or "HD"
      if (mods === '--') {
        const modsFallback = fullText.match(/Mods\s*(\S+)/i);
        if (modsFallback) mods = modsFallback[1];
      }
    }

    return RhythiaX.normalizeScore({
      scoreId, grade, accuracy, songTitle, timeAgo, misses, rpEarned,
      weightedRp, notes, mods, difficultyColor, speed,
      absoluteDate: RhythiaX.parseRelativeTime(timeAgo),
      element: card,
      expandedElement: expanded,
    });
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

    let grade = s.grade && typeof s.grade === 'string' ? s.grade.trim().toUpperCase() : '?';
    if (!RhythiaX.GRADE_ORDER.includes(grade)) grade = '?';
    if (grade === '?' && s.passed === false) {
      grade = 'F';
    } else if (grade === '?' && accNum !== null) {
      if (missCount === 0 && accNum >= 100) grade = 'SS';
      else if (accNum >= 98) grade = 'S';
      else if (accNum >= 95) grade = 'A';
      else if (accNum >= 93) grade = 'B';
      else if (accNum >= 90) grade = 'C';
      else if (accNum >= 80) grade = 'D';
      else grade = 'F';
    } else if (grade === '?') {
      grade = s.passed === false ? 'F' : '?';
    }
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
      difficulty: s.difficulty || s.difficultyName || s.level || '',
      beatmapNotes: noteCount,
      beatmapDifficulty,
      notes: String(noteCount ?? 0),
    });
  });
};
