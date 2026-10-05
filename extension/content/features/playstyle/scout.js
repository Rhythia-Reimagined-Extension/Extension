// =============================================
// Rhythia X — Playstyle Feature: Scout Engine
// Rule-based summary (30d) and momentum (14d)
// Pure SVG vectors, zero unicode emojis, rich analytical summaries
// =============================================

var RhythiaX = RhythiaX || {};

(function () {
  const domain = (typeof RhythiaX !== 'undefined' && RhythiaX.PlaystyleDomain)
    ? RhythiaX.PlaystyleDomain
    : (typeof require !== 'undefined' ? require('./domain.js') : null);

  const DAY_MS = 86400000;

  function timestamp(value) {
    if (value === null || value === undefined || value === '') return NaN;
    const number = Number(value);
    return Number.isFinite(number) ? number : Date.parse(value);
  }

  function historyWindow(points, days, now) {
    return points.filter(p => Math.abs((now - p.timestamp) / DAY_MS - days) <= (days === 30 ? 3 : days === 3 ? 1 : 2))
      .sort((a, b) => Math.abs(now - a.timestamp - days * DAY_MS) - Math.abs(now - b.timestamp - days * DAY_MS))[0];
  }

  function optionalNumber(value) {
    if (value === null || value === undefined || value === '') return null;
    const parsed = Number(String(value).replace(/[,\s%#]/g, ''));
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
  }

  function evaluateMomentum(currentRank, historyPoints = [], now = Date.now(), liveRp = null, activity = {}) {
    const history = (Array.isArray(historyPoints) ? historyPoints : [])
      .map(p => ({ ...p, timestamp: timestamp(p.timestamp ?? p.date), rank: domain.parseNumber(p.rank ?? p.globalRank),
        rp: optionalNumber(p.rp ?? p.skillPoints ?? p.weightedRp), playCount: optionalNumber(p.playCount) }))
      .filter(p => Number.isFinite(p.timestamp) && p.timestamp <= now)
      .sort((a, b) => b.timestamp - a.timestamp);
    const ranks = history.filter(p => p.rank > 0);
    const rank = domain.parseNumber(currentRank) || ranks[0]?.rank || 0;
    const points = {};
    const result = { status: 'steady', iconType: 'activity', badge: 'Holding Steady', label: 'Holding Steady',
      currentRank: rank, isElite: rank > 0 && rank <= 30, context: '', contextKind: '', daysUnchanged: 0 };
    for (const days of [3, 7, 14, 30]) {
      const point = historyWindow(ranks, days, now);
      points[days] = point;
      result['has' + days + 'd'] = !!point;
      result['delta' + days + 'd'] = point ? point.rank - rank : 0;
      result['days' + days + 'd'] = point ? Math.round((now - point.timestamp) / DAY_MS) : 0;
    }
    let earliest = now;
    for (const p of ranks) {
      if (p.rank !== rank || earliest - p.timestamp > 2 * DAY_MS) break;
      earliest = p.timestamp;
    }
    result.daysUnchanged = Math.floor((now - earliest) / DAY_MS);
    const reference = points[14] || points[7] || points[3];
    const delta = reference ? reference.rank - rank : 0;
    const days = reference ? Math.round((now - reference.timestamp) / DAY_MS) : 0;
    Object.assign(result, { rankDelta: delta, oldestRank: reference?.rank || rank, comparisonDays: days,
      sub: reference ? '#' + rank + ' • ' + (delta > 0 ? '+' : '') + delta + ' ranks in ' + days + 'd' : 'Need a 14-day rank comparison' });
    if (!reference) {
      result.badge = result.label = 'Not Enough History';
    } else if (delta > 0) {
      Object.assign(result, { status: 'win', iconType: 'trendingUp', badge: 'Climbing', label: 'Climbing' });
    } else if (delta < 0) {
      Object.assign(result, { status: 'loss', iconType: 'trendingDown', badge: 'Dropping', label: 'Dropping' });
    } else if (result.isElite) {
      Object.assign(result, { status: 'elite', iconType: 'shield', badge: 'Defending Top 30', label: 'Defending Top 30' });
    }
    result.fastThreshold = reference ? Math.max(3, Math.ceil(reference.rank * 0.05)) : 0;
    result.isFast = !!reference && Math.abs(delta) >= result.fastThreshold;
    result.burstThreshold = points[3] ? Math.max(3, Math.ceil(points[3].rank * 0.02)) : 0;
    result.isBurst = !!points[3] && Math.abs(result.delta3d) >= result.burstThreshold;

    const rpPoints = history.filter(p => p.rp !== null);
    const suppliedRp = optionalNumber(liveRp);
    const latestRp = rpPoints[0];
    const currentRp = suppliedRp !== null ? suppliedRp : (latestRp && now - latestRp.timestamp <= 2 * DAY_MS ? latestRp.rp : null);
    const currentRpTimestamp = suppliedRp !== null ? now : latestRp?.timestamp;
    for (const span of [7, 14, 30]) {
      const point = historyWindow(rpPoints, span, now);
      const elapsed = point && currentRp !== null ? (currentRpTimestamp - point.timestamp) / DAY_MS : 0;
      const available = elapsed >= (span === 30 ? 25 : span === 14 ? 11 : 4);
      result['hasRp' + span + 'd'] = available;
      result['rpDays' + span + 'd'] = available ? elapsed : 0;
      result['rpDelta' + span + 'd'] = available ? currentRp - point.rp : 0;
      result['rpGainPct' + span + 'd'] = available && point.rp > 0 ? (currentRp - point.rp) / point.rp * 100 : null;
    }
    const top = (activity.scores || []).filter(p => p && !p.isReign && !p.isRecent && p.category !== 'reign' && p.category !== 'recent');
    result.newTop14d = top.filter(p => {
      const time = timestamp(p.date || p.created_at || p.createdAt);
      return Number.isFinite(time) && time <= now && now - time <= 14 * DAY_MS;
    }).length;
    const playPoints = history.filter(p => p.playCount !== null);
    const playReference = historyWindow(playPoints, 14, now);
    const suppliedPlays = optionalNumber(activity.playCount);
    const latestPlays = playPoints[0];
    const currentPlays = suppliedPlays !== null ? suppliedPlays : (latestPlays && now - latestPlays.timestamp <= 2 * DAY_MS ? latestPlays.playCount : null);
    result.playDelta14d = currentPlays !== null && playReference && currentPlays >= playReference.playCount ? currentPlays - playReference.playCount : null;
    result.active14d = result.newTop14d > 0 || result.playDelta14d > 0;
    result.rpProgress = 'unknown';
    const notes = [];
    if (result.isBurst) {
      notes.push((result.delta3d > 0 ? 'Rank surge: +' : 'Sudden drop: ') + Math.abs(result.delta3d) + ' places in ' + result.days3d + 'd.');
    } else if (result.isFast) {
      notes.push((delta > 0 ? 'Fast climb: +' : 'Sharp drop: ') + Math.abs(delta) + ' places in ' + days + 'd.');
    }
    if (result.hasRp14d) {
      const gain = result.rpDelta14d;
      const percent = result.rpGainPct14d;
      const scaled = percent === null ? null : percent * 14 / result.rpDays14d;
      const flat = scaled !== null && Math.abs(scaled) < 0.1;
      const low = scaled !== null && scaled >= 0.1 && scaled < 0.5;
      const rpText = (gain > 0 ? '+' : '') + Number(gain.toFixed(2)) + ' RP'
        + (percent !== null ? ' (' + (percent > 0 ? '+' : '') + percent.toFixed(2) + '%)' : '') + ' in ' + Math.round(result.rpDays14d) + 'd';
      result.rpProgress = flat ? 'flat' : gain < 0 ? 'loss' : low ? 'low' : 'growing';
      if (reference && delta === 0 && !result.isElite && flat && result.active14d) {
        result.contextKind = 'stagnation';
        notes.push('Active, but making little RP progress: ' + rpText + '.');
      } else if (result.status === 'elite') {
        notes.push(rpText + '.');
      } else if (low) {
        notes.push('Low RP gain: ' + rpText + '.');
      } else if (flat) {
        notes.push((result.active14d ? 'Little RP movement despite recent play: ' : 'Little RP movement: ') + rpText + '.');
      } else if (gain < 0) {
        notes.push('Total RP is down: ' + rpText + '.');
      } else if (delta < 0) {
        notes.push('RP is growing, but rank is falling: ' + rpText + '.');
      } else if (reference && delta === 0) {
        notes.push('RP is growing while rank holds: ' + rpText + '.');
      } else {
        notes.push(rpText + '.');
      }
    }
    if (result.newTop14d > 0) notes.push(result.newTop14d + ' current top ' + (result.newTop14d === 1 ? 'score was' : 'scores were') + ' set in the last 14d.');
    result.context = notes.slice(0, 2).join(' ');
    return result;
  }

  function evaluateAccuracyTrend(scores = [], historyPoints = [], now = Date.now()) {
    const currentAvg = domain.getAverageAccuracy(scores);
    const points = (Array.isArray(historyPoints) ? historyPoints : [])
      .map(p => ({ ...p, timestamp: timestamp(p.timestamp ?? p.date), avgAccuracy: domain.parseNumber(p.avgAccuracy ?? p.accuracy) }))
      .filter(p => Number.isFinite(p.timestamp) && p.timestamp <= now && p.avgAccuracy > 0 && p.avgAccuracy <= 100);
    const reference = historyWindow(points, 30, now) || historyWindow(points, 7, now);
    if (!currentAvg || !reference) return { delta: 0, formatted: '—', sub: 'No accuracy history yet', isPositive: true, hasHistory: false };
    const days = Math.round((now - reference.timestamp) / DAY_MS);
    const rawDelta = currentAvg - reference.avgAccuracy;
    const delta = Math.abs(rawDelta) <= 0.05 ? 0 : rawDelta;
    return {
      delta, formatted: (delta > 0 ? '+' : '') + delta.toFixed(2) + ' pp',
      sub: 'Average accuracy vs ' + days + 'd ago', isPositive: delta >= 0, hasHistory: true, days,
    };
  }

  function evaluateSpeedSummary(scores = []) {
    const buckets = domain ? domain.getSpeedBuckets(scores) : {};
    let dominantSpeed = '1.00';
    let maxCount = -1;
    for (const [key, count] of Object.entries(buckets)) {
      if (count > maxCount) {
        maxCount = count;
        dominantSpeed = key;
      }
    }

    const total = scores.length || 0;
    const pct = total > 0 ? Math.round((maxCount / total) * 100) : 0;
    const value = `${dominantSpeed}x`;
    const sub = total > 0 ? `Primary • ${pct}% of plays` : 'Standard tempo';

    const color = domain?.SPEED_COLORS?.[dominantSpeed] || '#B6AFC5';

    return {
      dominantSpeed,
      value,
      sub,
      color,
    };
  }

  function getAccuracyTier(accNum) {
    if (accNum >= 99.5) return 'excellent';
    if (accNum >= 99.0) return 'very good';
    if (accNum >= 98.0) return 'good';
    return '';
  }

  function formatAccuracyTrendText(delta, formattedAcc, avgAcc) {
    const fAcc = formattedAcc || `${delta > 0 ? '+' : ''}${Number(delta || 0).toFixed(2)}%`;
    const accStr = avgAcc && avgAcc !== '—' ? `, averaging <strong>${avgAcc}%</strong>` : '';
    if (Math.abs(delta) <= 0.05) {
      return `held steady (${fAcc}${accStr})`;
    }
    if (delta < -0.05 && delta >= -0.30) {
      return `held relatively steady with a slight dip (${fAcc}${accStr})`;
    }
    if (delta < -0.30) {
      return `cooled (${fAcc}${accStr})`;
    }
    if (delta > 0.05 && delta <= 0.30) {
      return `improved slightly (${fAcc}${accStr})`;
    }
    return `improved (${fAcc}${accStr})`;
  }

  function formatSpeedDescription(dominantSpeedKey, dominantPct) {
    const topSpeed = `${dominantSpeedKey}x`;
    if (dominantSpeedKey === '1.00') {
      return `standard <strong>1.00x maps (${dominantPct}% of plays)</strong>`;
    }
    const speedNum = parseFloat(dominantSpeedKey);
    if (speedNum >= 1.35) {
      return `high-speed <strong>${topSpeed} maps (${dominantPct}% of plays)</strong>`;
    }
    if (speedNum > 1.00) {
      return `fast-paced <strong>${topSpeed} maps (${dominantPct}% of plays)</strong>`;
    }
    return `down-tempo <strong>${topSpeed} maps (${dominantPct}% of plays)</strong>`;
  }

  function formatAccuracyDescription(avgAccNum, avgAcc, accTrend) {
    const accTier = getAccuracyTier(avgAccNum);
    const tierPrefix = accTier ? `${accTier} ` : '';
    const baseStr = `${tierPrefix}<strong>${avgAcc}% accuracy</strong>`;

    const delta = accTrend?.delta || 0;
    const formatted = accTrend?.formatted || '';

    if (Math.abs(delta) <= 0.05) {
      return `${baseStr}, holding steady over 30 days`;
    }
    if (delta > 0.30) {
      return `${baseStr}, gaining <strong class="rhythiax-text-win">${formatted}</strong> over 30 days`;
    }
    if (delta > 0.05) {
      return `${baseStr}, up <strong class="rhythiax-text-win">${formatted}</strong> over 30 days`;
    }
    if (delta >= -0.30) {
      return `${baseStr}, with a slight 30-day dip (<strong class="rhythiax-text-loss">${formatted}</strong>)`;
    }
    return `${baseStr}, cooling by <strong class="rhythiax-text-loss">${Math.abs(delta).toFixed(2)}%</strong> over 30 days`;
  }

  function formatFcDescription(fc) {
    if (!fc || fc.ratio <= 0) return '';
    const mapWord = fc.count === 1 ? 'FC' : 'FCs';
    return ` and a <strong>${fc.ratio}% FC rate</strong> (${fc.count} ${mapWord})`;
  }

  function formatRpSpreadText(stats) {
    if (!stats || !stats.count || stats.count < 5) return '';

    const avgStr = `<strong>${stats.avgRp} RP</strong>`;
    const peakStr = `<strong>${stats.topRp}</strong>`;
    const floorStr = `<strong>${stats.bottomRp}</strong>`;

    if (stats.curveType === 'topHeavy') {
      return `Top plays average ${avgStr} (peak ${peakStr}, floor ${floorStr}). High peak scores, but bottom plays need to go higher.`;
    }

    if (stats.curveType === 'developing') {
      return `Top plays average ${avgStr} across ${stats.count} scores (peak ${peakStr}, floor ${floorStr}).`;
    }

    // balanced or progressive
    return `Top plays average ${avgStr} (peak ${peakStr}, floor ${floorStr}) with balanced score depth.`;
  }

  function evaluateScoutAdvice({
    player,
    scores = [],
    momentum = {},
    accTrend = {},
    speedSummary = {},
    dominantSpeedKey = '1.00',
    dominantPct = 0,
    avgAccNum = 0,
    fc = {},
    rpSpread = {},
    chokeStats = {},
  }) {
    const totalScores = scores.length || 0;
    const status = momentum.status || 'steady';
    const effectiveRank = domain ? domain.parseNumber(player?.globalRank || player?.position) : null;
    const speedNum = parseFloat(dominantSpeedKey) || 1.0;
    const isDownTempo = speedNum < 0.99;
    const isStandard = Math.abs(speedNum - 1.0) < 0.05;
    const isMildUpTempo = Math.abs(speedNum - 1.15) < 0.05;
    const isHighSpeed = speedNum >= 1.20;

    // 1. DROPPING / LEADERBOARD DECAY
    if (status === 'loss' || (momentum.delta30d && momentum.delta30d <= -4) || (momentum.rankDelta && momentum.rankDelta <= -4)) {
      if (isHighSpeed && avgAccNum > 0 && avgAccNum < 96.5) {
        return `Scaling back speed to prioritize clean <strong>98%+ S-ranks</strong> will immediately halt the drop and yield more RP than low-accuracy clears.`;
      }
      if (isMildUpTempo && avgAccNum > 0 && avgAccNum < 96.5) {
        return `Stepping back to standard 1.00x to secure clean <strong>98%+ S-ranks</strong> will stop the slide and build more reliable rank progress.`;
      }
      if (chokeStats?.chokeRate >= 45 && fc?.ratio <= 20) {
        return `Converting frequent <strong>1–2 miss chokes</strong> on familiar charts into full combos will quickly halt the drop and reclaim lost ranks.`;
      }
      if (rpSpread?.curveType === 'topHeavy' && rpSpread?.bottomRp > 0) {
        return `Overwriting bottom top plays (<strong>~${rpSpread.bottomRp} RP floor</strong>) with cleaner runs is the easiest, lowest-effort way to stop leaderboard decay.`;
      }
      const floorStr = rpSpread?.bottomRp > 0 ? ` (<strong>~${rpSpread.bottomRp}+ RP</strong>)` : '';
      return `Overwriting bottom top plays${floorStr} with cleaner runs is the quickest way to stop the drop and stabilize rank.`;
    }

    // 2. REBOUND
    if (momentum.delta30d <= -10 && momentum.delta7d >= 3) {
      return `Cleaning up lowest top plays will help cement this rebound and lock in solid rank gains.`;
    }

    // 3. STAGNATION / PLATEAU
    if (status === 'alert' || (momentum.daysUnchanged && momentum.daysUnchanged >= 10)) {
      if (rpSpread?.curveType === 'topHeavy' && rpSpread?.bottomRp > 0) {
        return `Refreshing bottom plays (<strong>~${rpSpread.bottomRp} RP</strong>) has the highest immediate upside to jumpstart upward momentum.`;
      }
      if (isStandard && avgAccNum >= 98.5) {
        const rankDisplay = effectiveRank || momentum.currentRank ? ` around #${effectiveRank || momentum.currentRank}` : '';
        return `Plateaued${rankDisplay}. Accuracy on 1.00x is near peak—experimenting with <strong>1.15x speed multipliers</strong> is the key to breaking past this plateau.`;
      }
      return `Pushing 1–2 new personal bests or cleaning up B/A-rank scores into <strong>S-ranks</strong> will restart your climb.`;
    }

    // 4. DOWN-TEMPO (< 1.00x, e.g. 0.87x, 0.80x, 0.75x)
    if (isDownTempo) {
      if (avgAccNum > 0 && avgAccNum < 96.0) {
        return `Focusing on rhythm consistency on lower-difficulty charts will build the fundamental timing needed to stabilize accuracy.`;
      }
      if (avgAccNum >= 97.5) {
        return `Shows solid control on down-tempo charts; transitioning towards <strong>standard 1.00x speed</strong> will significantly expand your RP potential.`;
      }
    }

    // 5. SPEED OVERREACH (Playing high speed with low acc)
    if (isHighSpeed && avgAccNum > 0 && avgAccNum < 96.5) {
      return `Pushing fast tempo (<strong>${dominantSpeedKey}x</strong>), but sub-96.5% accuracy is penalizing RP yield. Scaling back speed to secure <strong>98%+ S-ranks</strong> will generate far higher RP than low-accuracy clears.`;
    }
    if (isMildUpTempo && avgAccNum > 0 && avgAccNum < 96.5) {
      return `Stepping back to standard 1.00x to secure clean <strong>98%+ S-ranks</strong> will yield more consistent RP than pushing 1.15x with shaky accuracy.`;
    }

    // 6. ACCURACY SATURATION ON 1.00x (Needs speed scaling)
    if (isStandard && dominantPct >= 45 && avgAccNum >= 98.8) {
      return `Near-flawless accuracy on 1.00x maps has reached saturation. Stepping into <strong>1.15x or 1.25x speed multipliers</strong> is your next major RP ceiling breaker.`;
    }

    // 7. 1.00x ACCURACY REFINEMENT (Playing 1.00x but acc has room to improve)
    if (isStandard && avgAccNum > 0 && avgAccNum < 97.5) {
      return `Standard 1.00x maps scale heavily on accuracy. Polishing familiar charts from 95–97% into clean <strong>98.5%+ S-ranks</strong> will yield faster rank gains than forcing harder clears.`;
    }

    // 8. CHOKE ARTIST (High acc, but low FC rate due to 1-2 miss chokes)
    if (avgAccNum >= 97.5 && fc?.ratio <= 18 && totalScores >= 10 && chokeStats?.chokeRate >= 45) {
      return `High raw accuracy with an <strong>${fc.ratio}% FC rate</strong> indicates runs are ending on isolated 1–2 miss chokes. Practicing ending consistency on slightly shorter charts to lock in full combos will unlock immediate RP jumps.`;
    }

    // 9. TOP-HEAVY SCORE POOL (Big dropoff from peak to floor)
    if (rpSpread?.curveType === 'topHeavy' && rpSpread?.bottomRp > 0) {
      return `Large gap between peak (<strong>${rpSpread.topRp} RP</strong>) and floor (<strong>${rpSpread.bottomRp} RP</strong>)—re-farming your bottom 15–20 top plays is the fastest, lowest-effort rank boost.`;
    }

    // 10. DEVELOPING POOL (<25 plays)
    if (totalScores < 25) {
      return `Score pool is still developing (${totalScores} top plays). Filling out your top 50 score slots with clean passes will generate rapid, compounding rank increases.`;
    }

    // 11. CLIMBING / BALANCED CEILING PUSH
    if (status === 'win' || (rpSpread?.curveType === 'balanced' && avgAccNum >= 98.0)) {
      const peakDisplay = rpSpread?.topRp ? ` beyond <strong>${rpSpread.topRp} RP</strong>` : '';
      return `Balanced score depth across top plays; focus on challenging higher star difficulty ratings to raise your peak ceiling${peakDisplay}.`;
    }

    // 12. GENERAL DEFAULT
    return `Focusing on clean rhythm accuracy and consistent combo streaks on core maps will steadily lift your RP floor.`;
  }

  function generateScoutingSummary({ player = {}, scores = [], momentum = {}, now = Date.now() }) {
    const top = scores.filter(s => s && !s.isReign && !s.isRecent && s.category !== 'reign' && s.category !== 'recent');
    if (!top.length) return '<p>No top scores yet.</p>';
    const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
    const entries = top.map(score => ({ score, timestamp: timestamp(score.date || score.created_at || score.createdAt) }));
    const dated = entries.filter(e => Number.isFinite(e.timestamp) && e.timestamp <= now);
    const recent = dated.filter(e => now - e.timestamp <= 30 * DAY_MS);
    const sentences = [];
    const rank = domain.parseNumber(player.globalRank || player.position || momentum.currentRank);

    if (momentum.has30d && rank > 0) {
      const delta = momentum.delta30d;
      const days = momentum.days30d;
      const period = days === 30 ? 'Over the last 30 days' : 'Since ' + days + ' days ago';
      sentences.push(delta === 0
        ? period + ', global rank is still <strong>#' + rank + '</strong>.'
        : period + ', global rank moved <strong>' + (delta > 0 ? 'up' : 'down') + ' ' + Math.abs(delta) + ' places</strong>, from #' + (rank + delta) + ' to <strong>#' + rank + '</strong>.');
    } else if (momentum.has7d && rank > 0) {
      const delta = momentum.delta7d;
      sentences.push('Currently <strong>#' + rank + ' globally</strong>, ' + (delta === 0 ? 'unchanged' : (delta > 0 ? 'up ' : 'down ') + Math.abs(delta) + ' places')
        + ' since ' + momentum.days7d + ' days ago.');
    } else if (rank > 0) {
      sentences.push('Currently <strong>#' + rank + ' globally</strong>.');
    }

    const hasRp = momentum.hasRp30d || momentum.hasRp14d || momentum.hasRp7d;
    if (hasRp) {
      const delta = momentum.hasRp30d ? momentum.rpDelta30d : momentum.hasRp14d ? momentum.rpDelta14d : momentum.rpDelta7d;
      const days = momentum.hasRp30d ? momentum.rpDays30d : momentum.hasRp14d ? momentum.rpDays14d : momentum.rpDays7d;
      if (Number.isFinite(delta) && days > 0) {
        const amount = Math.abs(delta).toFixed(0);
        const daily = Math.abs(delta) / days;
        const rate = daily > 0 && daily < 0.01 ? '<0.01' : daily.toFixed(daily < 1 ? 2 : 1).replace(/\.?0+$/, '');
        sentences.push(delta === 0
          ? 'Total RP has stayed flat over the recorded <strong>' + Math.round(days) + ' days</strong>.'
          : 'Total RP is <strong>' + (delta > 0 ? 'up ' : 'down ') + amount + '</strong> over <strong>' + Math.round(days) + ' days</strong> — about <strong>'
            + escape(rate) + ' RP/day</strong> ' + (delta > 0 ? 'gained' : 'lost') + ' on average.');
      }
    }

    const mapKey = score => score.beatmapHash || score.songId || score.beatmapId || '';
    const allMapsKnown = recent.length && recent.every(e => mapKey(e.score));
    const maps = allMapsKnown ? new Set(recent.map(e => String(mapKey(e.score)))).size : 0;
    const mapText = maps ? ', across <strong>' + maps + ' map' + (maps === 1 ? '' : 's') + '</strong>' : '';
    if (dated.length === top.length) {
      sentences.push(recent.length
        ? '<strong>' + recent.length + ' of the current top ' + top.length + '</strong> scores were set in the last 30 days' + mapText + '.'
        : 'None of the current top ' + top.length + ' scores were set in the last 30 days.');
    } else if (recent.length) {
      sentences.push('Among scores with known dates, <strong>' + recent.length + '</strong> current top scores were set in the last 30 days' + mapText + '.');
    }

    // RP depth is measured over the current top 100, using unweighted score RP.
    // Missing raw RP must never turn heavily decayed weighted RP into a fake bottom.
    const rpSource = top.slice(0, 100);
    const measured = rpSource.filter(s => [s.rawRp, s.rpEarned, s.awarded_sp, s.awardedSp, s.skill_points]
      .some(value => domain.parseNumber(value) > 0));
    const spread = domain.getRpSpreadStats(measured);
    const completeRp = measured.length === rpSource.length;
    const peak = entries.reduce((best, entry) => {
      const raw = measured.includes(entry.score) ? domain.getScoreRawRp(entry.score) : 0;
      return !best || raw > best.rp ? { ...entry, rp: raw } : best;
    }, null);
    if (peak && peak.rp > 0) {
      const fullTitle = domain.getScoreTitle(peak.score);
      const title = fullTitle.length > 72 ? fullTitle.slice(0, 69).trimEnd() + '…' : fullTitle;
      const id = String(peak.score.scoreId ?? peak.score.id ?? '');
      const label = /^[1-9][0-9]*$/.test(id)
        ? '<a href="/score/' + id + '" title="' + escape(fullTitle) + '">' + escape(title) + '</a>'
        : '<strong title="' + escape(fullTitle) + '">' + escape(title) + '</strong>';
      let when = '';
      if (Number.isFinite(peak.timestamp) && peak.timestamp <= now) {
        const age = Math.floor((now - peak.timestamp) / DAY_MS);
        const date = new Date(peak.timestamp).toLocaleDateString('en-GB', { day: 'numeric', month: 'short',
          ...(new Date(peak.timestamp).getFullYear() !== new Date(now).getFullYear() ? { year: 'numeric' } : {}) });
        when = ', set <strong>' + (age === 0 ? 'less than a day ago' : age === 1 ? '1 day ago' : age + ' days ago') + '</strong> (' + escape(date) + ')';
      }
      sentences.push('The top play is ' + label + when + '.');
    }

    if (spread.count >= 5) {
      sentences.push(completeRp
        ? 'Across the current top ' + spread.count + ', <strong>Average RP is ' + spread.avgRp + '</strong>, <strong>Bottom RP is ' + spread.bottomRp
          + '</strong> and <strong>Top RP is ' + spread.topRp + '</strong>.'
        : 'Across <strong>' + spread.count + '</strong> top scores with raw RP available, the average is <strong>' + spread.avgRp + ' RP</strong>; the lowest measured score is <strong>' + spread.bottomRp + ' RP</strong>.');
      if (completeRp) {
        const ratio = spread.bottomRp / spread.topRp;
        const averageRatio = spread.avgRp / spread.topRp;
        const goal = Math.min(spread.topRp, Math.ceil((ratio < 0.4 ? Math.max(spread.bottomRp * 1.1, spread.topRp * 0.25) : spread.bottomRp * 1.1) / 10) * 10);
        if (spread.count < 25) {
          sentences.push('The top list is still small; add more strong scores alongside improving the bottom plays.');
        } else if (ratio < 0.4 || averageRatio < 0.6) {
          sentences.push('The bottom is far behind the best plays; try to raise it toward <strong>' + goal + ' RP</strong> before chasing another big peak.');
        } else if (ratio < 0.7) {
          sentences.push('There is room to strengthen the bottom plays; try to bring them toward <strong>' + goal + ' RP</strong>.');
        } else if (ratio < 0.9) {
          sentences.push('The top list already has solid depth; keep nudging the bottom plays toward <strong>' + goal + ' RP</strong> alongside new peaks.');
        } else {
          sentences.push('The top list is very even; new personal bests can help lift the whole range.');
        }
      }
    }
    const selected = sentences.slice(0, 6);
    return '<p>' + selected.slice(0, 3).join(' ') + '</p>'
      + (selected.length > 3 ? '<p>' + selected.slice(3).join(' ') + '</p>' : '');
  }

  RhythiaX.PlaystyleScout = {
    evaluateMomentum,
    evaluateAccuracyTrend,
    evaluateSpeedSummary,
    evaluateScoutAdvice,
    generateScoutingSummary,
    getAccuracyTier,
    formatAccuracyTrendText,
    formatRpSpreadText,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = RhythiaX.PlaystyleScout;
  }
})();
