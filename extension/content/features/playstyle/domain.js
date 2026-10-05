// =============================================
// Rhythia X — Playstyle Feature: Domain Logic
// Pure calculations, aggregates & score analytics
// =============================================

var RhythiaX = RhythiaX || {};

(function () {
  const SPEED_KEYS = ['1.45', '1.35', '1.25', '1.15', '1.00', '0.87', '0.80', '0.75'];
  const GRADE_KEYS = ['SS', 'S', 'A', 'B', 'C', 'D'];

  const SPEED_COLORS = {
    '1.45': '#8960E8',
    '1.35': '#4E86DF',
    '1.25': '#37C7EF',
    '1.15': '#74B7F3',
    '1.00': '#B6AFC5',
    '0.87': '#F6B11A',
    '0.80': '#F47732',
    '0.75': '#EB4E5C',
  };

  const GRADE_COLORS = {
    'SS': '#FFD700',
    'S': '#00E5FF',
    'A': '#22C55E',
    'B': '#84CC16',
    'C': '#9CA3AF',
    'D': '#EF4444',
  };

  function parseNumber(value) {
    if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
    const str = String(value ?? '').replace(/#/g, '').replace(/,/g, '').replace(/%/g, '').trim();
    const parsed = Number.parseFloat(str);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function normalizeSpeed(rawSpeed) {
    const val = parseNumber(rawSpeed);
    if (!val) return '1.00';
    let bestKey = '1.00';
    let minDiff = Infinity;
    for (const key of SPEED_KEYS) {
      const diff = Math.abs(parseFloat(key) - val);
      if (diff < minDiff) {
        minDiff = diff;
        bestKey = key;
      }
    }
    return bestKey;
  }

  function getScoreAccuracy(s) {
    if (!s) return 0;
    if (s.accuracy !== undefined && s.accuracy !== null && s.accuracy !== '—') {
      const parsed = parseNumber(s.accuracy);
      if (Number.isFinite(parsed) && parsed > 0) return parsed;
    }
    const notes = parseNumber(s.beatmapNotes ?? s.totalNotes ?? s.notes ?? s.noteCount);
    const misses = parseNumber(s.misses ?? s.missCount ?? 0);
    if (notes > 0) {
      return Math.max(0, (1 - misses / notes) * 100);
    }
    return 0;
  }

  function getScoreGrade(s) {
    if (!s) return 'D';
    const rawGrade = String(s.grade || '').trim().toUpperCase();
    if (GRADE_KEYS.includes(rawGrade)) return rawGrade;
    const acc = getScoreAccuracy(s);
    const misses = parseNumber(s.misses ?? s.missCount ?? 0);
    if (acc >= 100 && misses === 0) return 'SS';
    if (acc >= 98) return 'S';
    if (acc >= 95) return 'A';
    if (acc >= 93) return 'B';
    if (acc >= 90) return 'C';
    return 'D';
  }

  function getScoreRawRp(s) {
    if (!s) return 0;
    const raw = parseNumber(s.awarded_sp ?? s.awardedSp ?? s.rpEarned ?? s.rawRp ?? s.skill_points);
    if (raw > 0) return raw;
    const wrp = parseNumber(s.weightedRp ?? s.rp);
    return wrp > 0 ? wrp : 0;
  }

  function getScoreRp(s) {
    if (!s) return 0;
    const raw = getScoreRawRp(s);
    if (raw > 0) return raw;
    return parseNumber(s.weightedRp ?? s.rp ?? 0);
  }

  function getScoreTitle(s) {
    if (!s) return 'Unknown Beatmap';
    const author = s.songAuthor || s.song_author || s.artist || '';
    const title = s.songTitle || s.song_name || s.beatmapTitle || s.title || s.name || s.songId || 'Unknown Beatmap';
    if (author && !title.toLowerCase().startsWith(author.toLowerCase())) {
      return `${author} - ${title}`;
    }
    return title;
  }

  function getSpeedBuckets(scores = []) {
    const buckets = {};
    for (const key of SPEED_KEYS) buckets[key] = 0;
    for (const score of scores) {
      const key = normalizeSpeed(score.speed);
      if (buckets[key] !== undefined) buckets[key]++;
    }
    return buckets;
  }

  function getGradeBuckets(scores = []) {
    const buckets = {};
    for (const key of GRADE_KEYS) buckets[key] = 0;
    for (const score of scores) {
      const grade = getScoreGrade(score);
      if (buckets[grade] !== undefined) buckets[grade]++;
    }
    return buckets;
  }

  function getFcStats(scores = []) {
    const total = scores.length;
    if (!total) return { count: 0, total: 0, ratio: 0, formatted: '0% Ratio' };
    const count = scores.filter(s => {
      if (getScoreGrade(s) === 'SS') return true;
      if (s.fullCombo === true || s.fullCombo === 1) return true;
      const misses = parseNumber(s.misses ?? s.missCount);
      const hasMissField = (s.misses !== null && s.misses !== undefined) || (s.missCount !== null && s.missCount !== undefined);
      return hasMissField && misses === 0;
    }).length;
    const ratio = Math.round((count / total) * 100);
    return {
      count,
      total,
      ratio,
      formatted: `${ratio}% Ratio`,
      sub: `${count} / ${total} Top Plays`,
    };
  }

  function getChokeStats(scores = []) {
    const nonFcScores = (scores || []).filter(s => {
      if (!s) return false;
      if (s.fullCombo === true || s.fullCombo === 1) return false;
      if (getScoreGrade(s) === 'SS') return false;
      const misses = parseNumber(s.misses ?? s.missCount);
      const hasMissField = (s.misses !== null && s.misses !== undefined) || (s.missCount !== null && s.missCount !== undefined);
      return hasMissField ? misses > 0 : false;
    });

    if (!nonFcScores.length) {
      return { nonFcCount: 0, avgChokeMisses: 0, chokeCount: 0, chokeRate: 0 };
    }

    let totalMisses = 0;
    let chokeCount = 0; // 1 or 2 misses
    for (const s of nonFcScores) {
      const m = parseNumber(s.misses ?? s.missCount);
      totalMisses += m;
      if (m >= 1 && m <= 2) chokeCount++;
    }

    const avgChokeMisses = totalMisses / nonFcScores.length;
    const chokeRate = Math.round((chokeCount / nonFcScores.length) * 100);

    return {
      nonFcCount: nonFcScores.length,
      avgChokeMisses,
      chokeCount,
      chokeRate,
    };
  }

  function formatModLabel(rawMod) {
    if (!rawMod) return '';
    let str = String(rawMod).trim().replace(/^[:\s-]+|[:\s-]+$/g, '');
    const lower = str.toLowerCase();

    if (lower === 'mod_mirror' || lower === 'mirror') return 'Mirror';
    if (lower === 'mod_mirror_x' || lower === 'mirror_x') return 'Mirror X';
    if (lower === 'mod_mirror_y' || lower === 'mirror_y') return 'Mirror Y';
    if (lower === 'mod_mirror_xy' || lower === 'mirror_xy') return 'Mirror XY';
    if (lower === 'mod_ghost' || lower === 'ghost') return 'Ghost';
    if (lower === 'mod_spin' || lower === 'spin') return 'Spin';
    if (lower === 'mod_flashlight' || lower === 'flashlight') return 'Flashlight';
    if (lower === 'mod_hidden' || lower === 'hidden') return 'Hidden';
    if (lower === 'mod_fade' || lower === 'fade') return 'Fade';
    if (lower === 'mod_sudden_death' || lower === 'suddendeath') return 'Sudden Death';
    if (lower === 'mod_perfect' || lower === 'perfect') return 'Perfect';
    if (lower === 'mod_hard_rock' || lower === 'hardrock') return 'Hard Rock';
    if (lower === 'mod_easy' || lower === 'easy') return 'Easy';

    str = str.replace(/^mod_/i, '').replace(/_/g, ' ');
    return str.split(' ')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
  }

  function getMostPlayedMods(scores = [], limit = 4) {
    const counts = {};
    for (const s of scores) {
      // 1. Multiplier mod (only non-standard speeds are mods; 1.00x is standard base speed)
      const spKey = normalizeSpeed(s.speed);
      if (spKey && spKey !== '1.00') {
        const spModLabel = `${spKey}x`;
        counts[spModLabel] = counts[spModLabel] || { count: 0, isSpeed: true, speedKey: spKey, label: spModLabel };
        counts[spModLabel].count++;
      }

      // 2. Extra gameplay mods (Ghost, Mirror, Flashlight, etc.)
      const rawMods = s.mods;
      if (Array.isArray(rawMods)) {
        for (const m of rawMods) {
          const cleanLabel = formatModLabel(m);
          if (cleanLabel && !cleanLabel.includes('x') && !/^\d+(\.\d+)?$/.test(cleanLabel) && cleanLabel.toLowerCase() !== 'none' && cleanLabel !== '--') {
            counts[cleanLabel] = counts[cleanLabel] || { count: 0, isSpeed: false, label: cleanLabel };
            counts[cleanLabel].count++;
          }
        }
      } else if (typeof rawMods === 'string' && rawMods.trim()) {
        const parts = rawMods.split(',').map(m => m.trim().replace(/^[:\s-]+|[:\s-]+$/g, ''));
        for (const m of parts) {
          const cleanLabel = formatModLabel(m);
          if (cleanLabel && !cleanLabel.includes('x') && !/^\d+(\.\d+)?$/.test(cleanLabel) && cleanLabel.toLowerCase() !== 'none' && cleanLabel !== '--') {
            counts[cleanLabel] = counts[cleanLabel] || { count: 0, isSpeed: false, label: cleanLabel };
            counts[cleanLabel].count++;
          }
        }
      }
    }

    return Object.values(counts)
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  function getBestMaps(scores = []) {
    if (!scores.length) {
      return { bestAccuracy: null, topRp: null, mostNotes: null };
    }

    // 1. Best Accuracy: highest acc%, tie-breaker: highest RP
    let bestAccScore = scores[0];
    let maxAcc = getScoreAccuracy(bestAccScore);
    let maxAccRp = getScoreRp(bestAccScore);

    // 2. Top RP Play: highest weighted RP / raw RP
    let topRpScore = scores[0];
    let maxRp = getScoreRp(topRpScore);

    // 3. Most Notes: highest notes / beatmapNotes
    let mostNotesScore = scores[0];
    let maxNotes = parseNumber(mostNotesScore.notes ?? mostNotesScore.beatmapNotes ?? mostNotesScore.totalNotes);

    for (let i = 1; i < scores.length; i++) {
      const s = scores[i];
      const acc = getScoreAccuracy(s);
      const rp = getScoreRp(s);
      const notes = parseNumber(s.notes ?? s.beatmapNotes ?? s.totalNotes);

      // Best Acc
      if (acc > maxAcc || (acc === maxAcc && rp > maxAccRp)) {
        bestAccScore = s;
        maxAcc = acc;
        maxAccRp = rp;
      }

      // Top RP
      if (rp > maxRp) {
        topRpScore = s;
        maxRp = rp;
      }

      // Most Notes
      if (notes > maxNotes) {
        mostNotesScore = s;
        maxNotes = notes;
      }
    }

    const formatMap = (score, kind) => {
      if (!score) return null;
      const fullName = getScoreTitle(score);
      const speed = normalizeSpeed(score.speed);
      const acc = getScoreAccuracy(score).toFixed(2);
      const grade = getScoreGrade(score);
      const rp = Math.round(getScoreRp(score));
      const notes = parseNumber(score.notes ?? score.beatmapNotes ?? score.totalNotes);

      let pill = '';
      if (kind === 'accuracy') {
        pill = `${acc}% ${grade} • ${speed}x`;
      } else if (kind === 'rp') {
        pill = `${rp} RP • ${speed}x`;
      } else if (kind === 'notes') {
        pill = `${notes > 0 ? notes.toLocaleString() : '—'} Notes • ${speed}x`;
      }

      return {
        score,
        name: fullName,
        speed,
        pill,
        kind,
      };
    };

    return {
      bestAccuracy: formatMap(bestAccScore, 'accuracy'),
      topRp: formatMap(topRpScore, 'rp'),
      mostNotes: formatMap(mostNotesScore, 'notes'),
    };
  }

  function getAverageSpeed(scores = []) {
    if (!scores.length) return 1.0;
    const total = scores.reduce((sum, s) => sum + parseNumber(s.speed || 1.0), 0);
    return total / scores.length;
  }

  function getAverageAccuracy(scores = []) {
    const valid = scores.map(getScoreAccuracy).filter(a => a > 0);
    if (!valid.length) return 0;
    return valid.reduce((sum, a) => sum + a, 0) / valid.length;
  }

  function getRpSpreadStats(scores = []) {
    const eligibleScores = scores.filter(s => {
      if (!s) return false;
      if (s.isReign || s.category === 'reign') return false;
      if (s.isRecent || s.category === 'recent') return false;
      return true;
    });

    const pool = eligibleScores.length ? eligibleScores : scores;
    const rps = pool
      .map(s => getScoreRawRp(s))
      .filter(v => typeof v === 'number' && Number.isFinite(v) && v > 0)
      .sort((a, b) => b - a)
      .slice(0, 100);

    const count = rps.length;
    if (!count) {
      return {
        count: 0,
        topRp: 0,
        bottomRp: 0,
        avgRp: 0,
        medianRp: 0,
        top20Rp: 0,
        top20DropPct: 0,
        spread: 0,
        dropPct: 0,
        curveType: 'insufficient',
        label: 'No data',
      };
    }

    const topRp = Math.round(rps[0]);
    const bottomRp = Math.round(rps[count - 1]);
    const sum = rps.reduce((acc, v) => acc + v, 0);
    const avgRp = Math.round(sum / count);
    const medianRp = Math.round(rps[Math.floor(count / 2)]);
    const top20Rp = count >= 20 ? Math.round(rps[19]) : bottomRp;
    const top20DropPct = topRp > 0 ? Math.round((1 - top20Rp / topRp) * 100) : 0;
    const dropPct = topRp > 0 ? Math.round((1 - bottomRp / topRp) * 100) : 0;
    const avgToBottomDropPct = avgRp > 0 ? Math.round((1 - bottomRp / avgRp) * 100) : 0;
    const spread = topRp - bottomRp;

    let curveType = 'progressive';
    let label = 'Progressive Depth';

    if (count < 25) {
      curveType = 'developing';
      label = 'Developing Score Pool';
    } else if (dropPct >= 50 || avgToBottomDropPct >= 28 || (count >= 20 && top20DropPct >= 35)) {
      curveType = 'topHeavy';
      label = 'Top-Heavy Curve';
    } else if (dropPct <= 48 && avgToBottomDropPct <= 25) {
      curveType = 'balanced';
      label = 'Balanced Depth';
    }

    return {
      count,
      topRp,
      bottomRp,
      avgRp,
      medianRp,
      top20Rp,
      top20DropPct,
      spread,
      dropPct,
      avgToBottomDropPct,
      curveType,
      label,
    };
  }

  RhythiaX.PlaystyleDomain = {
    SPEED_KEYS,
    GRADE_KEYS,
    SPEED_COLORS,
    GRADE_COLORS,
    parseNumber,
    normalizeSpeed,
    getSpeedBuckets,
    getGradeBuckets,
    getFcStats,
    getChokeStats,
    formatModLabel,
    getMostPlayedMods,
    getScoreAccuracy,
    getScoreGrade,
    getScoreRp,
    getScoreRawRp,
    getRpSpreadStats,
    getScoreTitle,
    getBestMaps,
    getAverageSpeed,
    getAverageAccuracy,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = RhythiaX.PlaystyleDomain;
  }
})();
