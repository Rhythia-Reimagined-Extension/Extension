// ============================================================================
// Rhythia Reimagined — Score Card Domain (Pure Domain Logic & Formatting)
// ============================================================================

var RhythiaX = RhythiaX || {};

(function () {
  'use strict';

  function parse(card) {
    if (!card) return null;
    const score = RhythiaX.parseScoreCard ? RhythiaX.parseScoreCard(card) : {};
    const titleEl = card.querySelector('.truncate span, .whitespace-nowrap span, span.font-medium, .truncate, .rhythiax-card-title');
    const mapTitle = titleEl?.textContent?.trim() || score.songTitle || '';
    const scoreId = score.scoreId || card.getAttribute('data-rhythiax-score-id') || '';
    const scoreHref = scoreId ? `/score/${scoreId}` : (card.querySelector('a[href*="/score/"]')?.getAttribute('href') || '');
    const mapHref = score.beatmapId ? `/maps/${score.beatmapId}` : (score.beatmapHash ? `/maps/${score.beatmapHash}` : scoreHref);
    const replayUrl = score.replayUrl || RhythiaX.findReplayLink?.(card)?.getAttribute('href') || '';
    const mapper = score.mapper || extractMapper(score) || '';

    return {
      score,
      scoreId,
      date: score.absoluteDate || (RhythiaX.parseRelativeTime ? RhythiaX.parseRelativeTime(score.timeAgo) : score.timeAgo),
      scoreHref,
      mapHref,
      replayUrl,
      songTitle: mapTitle,
      songArtist: score.artist || '',
      mapper,
    };
  }

  function stats(score) {
    const parseNum = value => (RhythiaX.parseLocalizedNumber ? RhythiaX.parseLocalizedNumber(value) : (Number.parseFloat(String(value ?? '').replace(/,/g, '')) || 0));
    return [
      { label: 'Mods', value: score.mods },
      { label: 'Notes', value: RhythiaX.formatNumber ? RhythiaX.formatNumber(parseInt(score.notes, 10)) : score.notes },
      { label: 'Raw RP', value: RhythiaX.formatNumber ? RhythiaX.formatNumber(Math.round(parseNum(score.rpEarned))) : score.rpEarned },
      { label: 'Accuracy', value: score.accuracy },
      { label: 'Misses', value: score.misses, isMisses: true },
      { label: 'Weighted RP', value: RhythiaX.formatNumber ? RhythiaX.formatNumber(Math.round(parseNum(score.weightedRp))) : score.weightedRp }
    ];
  }

  function getGrade(scoreOrAcc, passed = true, misses = 0) {
    if (typeof scoreOrAcc === 'object' && scoreOrAcc !== null) {
      const s = scoreOrAcc;
      const p = s.passed !== false && s.failed !== true;
      const m = parseInt(s.misses, 10) || 0;
      const accVal = RhythiaX.parseLocalizedNumber ? RhythiaX.parseLocalizedNumber(s.accuracy) : parseFloat(String(s.accuracy || '').replace('%', ''));
      return calculateGrade(accVal, p, m, s.fullCombo);
    }
    const accVal = typeof scoreOrAcc === 'number' ? scoreOrAcc : parseFloat(String(scoreOrAcc || '').replace('%', ''));
    return calculateGrade(accVal, passed, misses);
  }

  function calculateGrade(acc, passed, misses, isFc) {
    if (!passed) return 'F';
    const numAcc = Number.isFinite(acc) ? acc : 0;
    const numMiss = Number.isFinite(misses) ? misses : 0;
    const fc = isFc || numMiss === 0;

    if (numAcc >= 100 && fc) return 'SS';
    if (numAcc >= 98.0) return 'S';
    if (numAcc >= 95.0) return 'A';
    if (numAcc >= 90.0) return 'B';
    if (numAcc >= 80.0) return 'C';
    if (numAcc >= 70.0) return 'D';
    return 'D';
  }

  function getGradeColor(grade) {
    const g = String(grade || '').toUpperCase().trim();
    switch (g) {
      case 'SS': return 'var(--grade-ss, #38bdf8)';
      case 'S':  return 'var(--grade-s, #22d3ee)';
      case 'A':  return 'var(--grade-a, #4ade80)';
      case 'B':  return 'var(--grade-b, #a855f7)';
      case 'C':  return 'var(--grade-c, #facc15)';
      case 'D':  return 'var(--grade-d, #f97316)';
      case 'F':  return 'var(--grade-f, #ef4444)';
      default:   return 'var(--grade-a, #4ade80)';
    }
  }

  function getGradeGlow(grade) {
    const g = String(grade || '').toUpperCase().trim();
    switch (g) {
      case 'SS': return 'rgba(56, 189, 248, 0.45)';
      case 'S':  return 'rgba(34, 211, 238, 0.45)';
      case 'A':  return 'rgba(74, 222, 128, 0.45)';
      case 'B':  return 'rgba(168, 85, 247, 0.45)';
      case 'C':  return 'rgba(250, 204, 21, 0.45)';
      case 'D':  return 'rgba(249, 115, 22, 0.45)';
      case 'F':  return 'rgba(239, 68, 68, 0.45)';
      default:   return 'rgba(74, 222, 128, 0.45)';
    }
  }

  function formatDuration(lengthMs, speedMultiplier) {
    const ms = Number(lengthMs);
    if (!Number.isFinite(ms) || ms <= 0) return '';
    let totalSeconds = ms / 1000;
    const speed = parseFloat(speedMultiplier);
    if (Number.isFinite(speed) && speed > 0 && Math.abs(speed - 1.0) > 0.001) {
      totalSeconds = totalSeconds / speed;
    }
    const mins = Math.floor(totalSeconds / 60);
    const secs = Math.floor(totalSeconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }

  function parseModsList(score) {
    if (!score) return [];
    const modsList = [];
    let raw = '';
    if (Array.isArray(score.mods)) {
      raw = score.mods.join(', ');
    } else {
      raw = String(score.mods || '').trim();
    }

    if (raw && raw !== '--' && !/^(nm|none|no mods?)$/i.test(raw)) {
      const parts = raw.split(/[,+]/).map(s => s.trim()).filter(Boolean);
      parts.forEach(p => {
        const key = p.toLowerCase().replace(/^mod[_\s-]*/, '').replace(/[\s-]+/g, '_');
        const labels = {
          mirror: 'Mirror X',
          mirror_x: 'Mirror X',
          mirror_y: 'Mirror Y',
          mirror_xy: 'Mirror XY',
          ghost: 'Ghost',
          hard_rock: 'Hard Rock',
          hardrock: 'Hard Rock',
          no_fail: 'No Fail',
          nofail: 'No Fail',
          sudden_death: 'Sudden Death',
          suddendeath: 'Sudden Death',
          auto_restart: 'Auto Restart',
          autorestart: 'Auto Restart',
          chaos: 'Chaos',
          hidden: 'Hidden',
          flashlight: 'Flashlight',
          spin: 'Spin',
          fade: 'Fade',
          vr: 'VR',
          '360': '360',
          easy: 'Easy',
          perfect: 'Perfect',
        };
        const label = labels[key] || p.replace(/^mod[_\s-]*/i, '').replace(/[_-]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        if (!modsList.some(m => m.toLowerCase() === label.toLowerCase())) modsList.push(label);
      });
    }

    const mirrorX = modsList.findIndex(mod => mod === 'Mirror X');
    const mirrorY = modsList.findIndex(mod => mod === 'Mirror Y');
    if (mirrorX >= 0 && mirrorY >= 0) {
      modsList.splice(Math.max(mirrorX, mirrorY), 1);
      modsList.splice(Math.min(mirrorX, mirrorY), 1, 'Mirror XY');
    }

    const speed = RhythiaX.normalizeSpeed ? RhythiaX.normalizeSpeed(score.speed) : (parseFloat(score.speed) ? `${parseFloat(score.speed).toFixed(2)}` : '');
    if (speed && speed !== '1.00') {
      const speedStr = `${speed}x`;
      if (!modsList.some(m => m.endsWith('x') || m.includes(speed))) {
        modsList.unshift(speedStr);
      }
    }
    return modsList;
  }

  function getSpeedIconUrl(speedValue) {
    if (!speedValue) return null;
    const cleanStr = String(speedValue).toLowerCase().replace(/x$/, '').trim();
    const num = parseFloat(cleanStr);
    if (!Number.isFinite(num) || Math.abs(num - 1.0) < 0.001) return null;

    if (num >= 1.44 && num <= 1.46) return '/modspeedplusplusplusplus.png';
    if (num >= 1.34 && num <= 1.36) return '/modspeedplusplusplus.png';
    if (num >= 1.24 && num <= 1.26) return '/modspeedplusplus.png';
    if (num >= 1.14 && num <= 1.16) return '/modspeedplus.png';
    if (num >= 0.86 && num <= 0.88) return '/modspeedminus.png';
    if (num >= 0.79 && num <= 0.81) return '/modspeedminusminus.png';
    if (num >= 0.74 && num <= 0.76) return '/modspeedminusminusminus.png';

    if (num > 1.0) return '/modspeedplus.png';
    if (num < 1.0) return '/modspeedminus.png';
    return null;
  }

  function getModIconUrl(modLabel) {
    if (!modLabel) return null;
    const clean = String(modLabel).toLowerCase().replace(/^mod[_\s-]*/i, '').replace(/[\s-]+/g, '');
    const iconMap = {
      mirrorxy: '/modmirrorxy.png',
      mirrorx: '/modmirrorx.png',
      mirrory: '/modmirrory.png',
      ghost: '/modghost.png',
      nofail: '/modnofail.png',
      suddendeath: '/modsuddendeath.png',
      hardrock: '/modhardrock.png',
      autorestart: '/modautorestart.png',
      chaos: '/modchaos.png',
      '360': '/mod360.png',
      spin: '/modspin.png',
      flashlight: '/modflashlight.png',
      hidden: '/modhidden.png',
      fade: '/modfade.png',
      vr: '/modvr.png',
      easy: '/modeasy.png',
      perfect: '/modperfect.png',
    };
    return iconMap[clean] || `/mod${clean}.png`;
  }

  function getScoreMods(score) {
    if (!score) return [];

    // If score already has explicit modItems detected from DOM, use them as base
    if (Array.isArray(score.modItems) && score.modItems.length > 0) {
      const items = score.modItems.map(item => {
        const isSpeed = Boolean(item.isSpeed || /^\d+(\.\d+)?x$/i.test(item.label));
        return {
          isSpeed,
          label: item.label,
          iconUrl: item.iconUrl || (isSpeed ? (score.speedIcon || getSpeedIconUrl(item.label)) : getModIconUrl(item.label)),
        };
      });

      const speed = RhythiaX.normalizeSpeed ? RhythiaX.normalizeSpeed(score.speed) : (parseFloat(score.speed) ? `${parseFloat(score.speed).toFixed(2)}` : '');
      if (speed && speed !== '1.00') {
        const speedStr = `${speed}x`;
        if (!items.some(m => m.isSpeed || m.label === speedStr)) {
          items.unshift({
            isSpeed: true,
            label: speedStr,
            iconUrl: score.speedIcon || getSpeedIconUrl(speed),
          });
        }
      }
      return items;
    }

    const rawList = parseModsList(score);
    return rawList.map(item => {
      const isSpeed = /^\d+(\.\d+)?x$/i.test(item);
      return {
        isSpeed,
        label: item,
        iconUrl: isSpeed ? (score.speedIcon || getSpeedIconUrl(item)) : getModIconUrl(item),
      };
    });
  }

  function getAccuracyFillPercent(accString) {
    const match = String(accString || '').match(/([\d.]+)/);
    if (!match) return 0;
    const val = parseFloat(match[1]);
    if (isNaN(val)) return 0;
    if (val >= 100) return 100;
    if (val <= 80) return Math.max(6, Math.round((val / 80) * 12));
    const scaled = 12 + ((val - 80) / 20) * 88;
    return Math.min(100, Math.max(6, Math.round(scaled)));
  }

  function formatScoreDate(rawDate, customFormat) {
    if (!rawDate) return '';
    const format = customFormat || (RhythiaX.getDateFormat ? RhythiaX.getDateFormat() : 'relative');
    const p = String(format || 'relative').toLowerCase();

    // 1. Resolve relative and calendar dates
    let dateObj = rawDate;
    let originalRelative = '';
    if (typeof dateObj === 'string') {
      const trimmed = dateObj.trim();
      if (/^\d+\s+\w+\s+ago$/i.test(trimmed)) {
        originalRelative = trimmed;
      }
      if (/^\d+\s*(second|minute|hour|day|week|month|year)s?\s*ago/i.test(trimmed)) {
        dateObj = RhythiaX.parseRelativeTime ? RhythiaX.parseRelativeTime(trimmed) : null;
      } else {
        dateObj = new Date(trimmed);
      }
    }

    if (p === 'relative') {
      if (originalRelative) return originalRelative;
      if (dateObj instanceof Date && !isNaN(dateObj.getTime())) {
        return RhythiaX.formatRelativeDate ? RhythiaX.formatRelativeDate(dateObj) : '';
      }
      return String(rawDate || '');
    }

    // 2. Format calendar date
    let calDate = '';
    if (RhythiaX.formatDateWithPattern) {
      calDate = RhythiaX.formatDateWithPattern(rawDate, format);
    }
    if (!calDate && dateObj instanceof Date && !isNaN(dateObj.getTime())) {
      const pad = val => String(val).padStart(2, '0');
      const year = dateObj.getFullYear();
      const month = pad(dateObj.getMonth() + 1);
      const day = pad(dateObj.getDate());
      switch (p) {
        case 'mm-dd-yyyy': calDate = `${month}-${day}-${year}`; break;
        case 'dd-mm-yyyy': calDate = `${day}-${month}-${year}`; break;
        case 'yyyy-mm-dd': calDate = `${year}-${month}-${day}`; break;
        case 'mm/dd/yyyy': calDate = `${month}/${day}/${year}`; break;
        case 'dd/mm/yyyy': calDate = `${day}/${month}/${year}`; break;
        case 'yyyy/mm/dd': calDate = `${year}/${month}/${day}`; break;
        default: calDate = `${year}-${month}-${day}`; break;
      }
    }

    const relTime = originalRelative || (dateObj instanceof Date && !isNaN(dateObj.getTime()) && RhythiaX.formatRelativeDate ? RhythiaX.formatRelativeDate(dateObj) : '');
    if (calDate && relTime) {
      return `${calDate} (${relTime})`;
    }
    return calDate || String(rawDate || '');
  }

  function getScoreDateTooltip(rawDate, currentFormatted) {
    if (RhythiaX.getScoreDateTooltip) {
      return RhythiaX.getScoreDateTooltip(rawDate, currentFormatted);
    }
    return '';
  }

  function formatHits(score) {
    if (!score) return { hits: '--', total: '--', formatted: '--', isFc: false };
    const rawTotal = score.beatmapNotes || score.notes;
    const totalNotes = parseInt(rawTotal, 10);
    const misses = parseInt(score.misses, 10) || 0;

    let hitCount = null;
    if (score.squaresHit != null && score.squaresHit !== '') {
      hitCount = parseInt(score.squaresHit, 10);
    } else if (score.squares_hit != null && score.squares_hit !== '') {
      hitCount = parseInt(score.squares_hit, 10);
    } else if (Number.isFinite(totalNotes) && totalNotes > 0) {
      hitCount = Math.max(0, totalNotes - misses);
    }

    const fmt = n => (RhythiaX.formatNumber ? RhythiaX.formatNumber(n) : String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ','));

    if (hitCount != null && Number.isFinite(totalNotes) && totalNotes > 0) {
      const hitStr = fmt(hitCount);
      const totStr = fmt(totalNotes);
      return {
        hits: hitStr,
        total: totStr,
        formatted: `${hitStr} / ${totStr}`,
        isFc: misses === 0
      };
    }

    if (Number.isFinite(totalNotes) && totalNotes > 0) {
      const totStr = fmt(totalNotes);
      return {
        hits: totStr,
        total: totStr,
        formatted: totStr,
        isFc: misses === 0
      };
    }

    return {
      hits: score.notes ? fmt(score.notes) : '--',
      total: '--',
      formatted: score.notes ? fmt(score.notes) : '--',
      isFc: false
    };
  }

  function extractMapper(score) {
    if (!score) return '';
    if (score.mapper) return String(score.mapper).trim();
    if (score.ownerUsername) return String(score.ownerUsername).trim();
    if (score.beatmapAuthor) return String(score.beatmapAuthor).trim();
    if (score.author) return String(score.author).trim();
    if (score.creator) return String(score.creator).trim();

    // 1. Check synchronous beatmap cache first
    const key = score.beatmapId || score.beatmapHash || score.songId || score.hash;
    if (key && RhythiaX.getStoredBeatmapMeta) {
      const meta = RhythiaX.getStoredBeatmapMeta(key);
      if (meta?.ownerUsername) return String(meta.ownerUsername).trim();
    }

    // 2. Fallback: check beatmapHash, songId or hash formatted as "mapper_-_artist_-_title" or "mapper - artist - title"
    const hash = String(score.beatmapHash || score.songId || score.hash || '').trim();
    if (hash) {
      const songTitle = String(score.songTitle || score.title || '').toLowerCase().trim();

      // 1. "mapper_-_artist_-_title" (SSPM underscore convention)
      if (hash.includes('_-_')) {
        const parts = hash.split('_-_');
        // A true mapper prefix in SSPM format must have at least 3 parts: mapper_-_artist_-_title
        if (parts.length >= 3 && parts[0] && parts[0].length >= 2 && !/^\d+$/.test(parts[0])) {
          const candLower = parts[0].toLowerCase();
          // Candidate must not match or be contained in songTitle
          if (!songTitle || (!songTitle.startsWith(candLower) && !songTitle.includes(candLower))) {
            return parts[0].trim();
          }
        }
      }

      // 2. "mapper - artist - title" or "mapper -title" (SSPM/RHM space-hyphen convention)
      const hyphenIdx = hash.indexOf(' -');
      if (hyphenIdx > 1) {
        const potentialMapper = hash.substring(0, hyphenIdx).trim();
        const candLower = potentialMapper.toLowerCase();
        if (potentialMapper.length >= 2 && !/^\d+$/.test(potentialMapper)) {
          // If songTitle starts with the candidate, it's likely "Artist - Title", not a mapper prefix
          if (!songTitle || !songTitle.startsWith(candLower)) {
            return potentialMapper;
          }
          // If there are 3+ parts separated by ' - ', the very first one is the mapper prefix
          const dashParts = hash.split(/\s+-\s*/);
          if (dashParts.length >= 3 && dashParts[0].length >= 2 && !/^\d+$/.test(dashParts[0])) {
            return dashParts[0].trim();
          }
        }
      }
    }
    return '';
  }

  function placeModsBelowMapper(card) {
    const mods = card.querySelector('.rhythiax-sc-mods-wrap, .rhythiax-sc-mod-pill');
    const meta = card.querySelector('.rhythiax-sc-meta-line');
    if (!meta) return;
    const wrap = mods?.classList.contains('rhythiax-sc-mods-wrap') ? mods : document.createElement('div');
    wrap.classList.add('rhythiax-sc-mods-wrap', 'rhythiax-sc-mods-below-mapper');
    if (mods && wrap !== mods) wrap.appendChild(mods);
    if (!mods) {
      const empty = document.createElement('span');
      empty.className = 'rhythiax-sc-no-mods';
      empty.textContent = 'No mods';
      empty.title = 'No mods';
      wrap.appendChild(empty);
    }
    meta.after(wrap);
    wrap.querySelectorAll('.rhythiax-sc-mod-pill').forEach(pill => {
      pill.tabIndex = 0;
      pill.setAttribute('aria-label', pill.title || pill.textContent);
    });
  }

  function handleModIconError(icon, label) {
    const pill = icon.parentElement;
    icon.remove();
    if (!pill) return;
    pill.classList.remove('has-icon', 'icon-only');
    if (!pill.querySelector('.rhythiax-sc-mod-name')) {
      const text = document.createElement('span');
      text.className = 'rhythiax-sc-mod-name';
      text.textContent = label;
      pill.appendChild(text);
    }
  }

  RhythiaX.ScoreCardDomain = {
    placeModsBelowMapper,
    handleModIconError,
    parse,
    stats,
    getGrade,
    getGradeColor,
    getGradeGlow,
    formatDuration,
    formatScoreDate,
    getScoreDateTooltip,
    formatHits,
    extractMapper,
    parseModsList,
    getScoreMods,
    getModIconUrl,
    getSpeedIconUrl,
    getAccuracyFillPercent,
  };
})();
