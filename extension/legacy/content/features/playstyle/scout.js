// =============================================
// Reimagined for Rhythia — Playstyle Feature: Scout Engine
// Rule-based summary (30d) and momentum (14d)
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
      sub: reference ? '#' + rank + ' • ' + (delta > 0 ? '+' : '') + delta + ' ranks in ' + days + 'd' : 'Needs 14 days of history' });
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
    // A couple of plays is not "recent play": the note says so only with real activity.
    result.active14d = result.newTop14d >= 3 || result.playDelta14d >= 5;
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

  function generateScoutingSummary({ player = {}, scores = [], momentum = {}, now = Date.now() }) {
    const top = scores.filter(s => s && !s.isReign && !s.isRecent && s.category !== 'reign' && s.category !== 'recent');
    if (!top.length) return '<p>No top scores yet.</p>';
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
            + RhythiaX.escapeHtml(rate) + ' RP/day</strong> ' + (delta > 0 ? 'gained' : 'lost') + ' on average.');
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
        ? '<a href="/score/' + id + '" title="' + RhythiaX.escapeHtml(fullTitle) + '">' + RhythiaX.escapeHtml(title) + '</a>'
        : '<strong title="' + RhythiaX.escapeHtml(fullTitle) + '">' + RhythiaX.escapeHtml(title) + '</strong>';
      let when = '';
      if (Number.isFinite(peak.timestamp) && peak.timestamp <= now) {
        const age = Math.floor((now - peak.timestamp) / DAY_MS);
        const date = new Date(peak.timestamp).toLocaleDateString('en-GB', { day: 'numeric', month: 'short',
          ...(new Date(peak.timestamp).getFullYear() !== new Date(now).getFullYear() ? { year: 'numeric' } : {}) });
        when = ', set <strong>' + (age === 0 ? 'less than a day ago' : age === 1 ? '1 day ago' : age + ' days ago') + '</strong> (' + RhythiaX.escapeHtml(date) + ')';
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
          sentences.push('The top list is still short, so any strong new score adds to it.');
        } else if (ratio < 0.4 || averageRatio < 0.6) {
          sentences.push('The bottom is far behind the best plays; raising it toward <strong>' + goal + ' RP</strong> adds the most.');
        } else if (ratio < 0.7) {
          sentences.push('Scores above <strong>' + goal + ' RP</strong> would strengthen the bottom plays.');
        } else if (ratio < 0.9) {
          sentences.push('The top list has solid depth; the next step for the bottom plays is <strong>' + goal + ' RP</strong>.');
        } else {
          sentences.push('The top list is very even, so only new personal bests near the top will move it much.');
        }
      }
    }
    const selected = sentences.slice(0, 6);
    return '<p>' + selected.slice(0, 3).join(' ') + '</p>'
      + (selected.length > 3 ? '<p>' + selected.slice(3).join(' ') + '</p>' : '');
  }

  // ─────────────────────────────────────────────
  // Summary for Statistics variant B: what actually happened, from ranked plays (Rhythia's recent
  // scores), the daily history (VPS or this browser) and the top list. Three short paragraphs:
  // the last 14 days, the last 30 days, then the top 100 and what would help most.
  // ─────────────────────────────────────────────
  const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  function buildStory({ now = Date.now(), history = [], recent = [], top = [], rank = null, rp = null, label = '' } = {}) {
    const em = value => '<em>' + RhythiaX.escapeHtml(value) + '</em>';
    const fmt = n => Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 });
    const rpText = n => (n > 0 ? '+' : n < 0 ? '−' : '±') + fmt(Math.abs(n)) + ' RP';
    const dayText = t => { const d = new Date(t); return MONTHS_SHORT[d.getMonth()] + ' ' + d.getDate(); };
    const ago = t => { const days = Math.floor((now - t) / DAY_MS); return days <= 0 ? 'today' : days === 1 ? 'yesterday' : days + ' days ago'; };
    const plural = (n, one, many) => n + ' ' + (n === 1 ? one : many);
    const list = items => items.length <= 1 ? items.join('') : items.slice(0, -1).join(', ') + ' and ' + items[items.length - 1];

    const points = (Array.isArray(history) ? history : [])
      .map(p => ({ t: timestamp(p.timestamp ?? p.date), rank: domain.parseNumber(p.rank ?? p.globalRank), rp: optionalNumber(p.rp ?? p.skillPoints ?? p.weightedRp), plays: optionalNumber(p.playCount) }))
      .filter(p => Number.isFinite(p.t) && p.t <= now)
      .sort((a, b) => b.t - a.t);
    // The value from about `days` ago: the newest point at least that old, or the oldest one we have.
    const at = (days, key) => {
      const usable = points.filter(p => p[key] !== null && p[key] > 0);
      return usable.find(p => now - p.t >= (days - 0.5) * DAY_MS) || usable[usable.length - 1] || null;
    };
    const nowRank = domain.parseNumber(rank) || points.find(p => p.rank > 0)?.rank || 0;
    const nowRp = optionalNumber(rp) ?? points.find(p => p.rp !== null)?.rp ?? null;

    const topIds = new Set(top.map(s => String(s.scoreId ?? s.id ?? '')).filter(Boolean));
    const plays = (Array.isArray(recent) ? recent : [])
      .map(s => ({ t: timestamp(s.date || s.created_at || s.createdAt), id: String(s.scoreId ?? s.id ?? ''), passed: s.passed !== false }))
      .filter(p => Number.isFinite(p.t) && p.t <= now)
      .sort((a, b) => b.t - a.t);
    const oldestPlay = plays[plays.length - 1]?.t ?? now;
    // Rhythia lists the latest ranked plays only; past that, play count history fills in.
    const playsIn = (from, to) => {
      const start = now - from * DAY_MS, end = now - to * DAY_MS;
      if (plays.length < 100 || oldestPlay <= start) return { n: plays.filter(p => p.t > start && p.t <= end).length, exact: true };
      const a = at(from, 'plays'), b = to === 0 ? points.find(p => p.plays !== null) : at(to, 'plays');
      return a && b && b.plays >= a.plays ? { n: b.plays - a.plays, exact: true } : { n: plays.filter(p => p.t > start && p.t <= end).length, exact: false };
    };
    const last14 = playsIn(14, 0), before14 = playsIn(28, 14);
    const lastPlay = plays[0]?.t ?? null;
    // Plays per day in the last 14 days, oldest first: "2 on Oct 6 and 1 on Oct 18".
    const perDay = [];
    plays.filter(p => now - p.t <= 14 * DAY_MS).reverse().forEach(p => {
      const day = dayText(p.t), last = perDay[perDay.length - 1];
      if (last && last.day === day) last.n++; else perDay.push({ day, n: 1 });
    });
    // The longest stretch without ranked plays in the last 14 days.
    let gap = null;
    const marks = [now - 14 * DAY_MS, ...plays.filter(p => now - p.t <= 14 * DAY_MS).map(p => p.t).reverse(), now];
    for (let i = 1; i < marks.length; i++) {
      const days = Math.floor((marks[i] - marks[i - 1]) / DAY_MS) - 1;
      if (days >= 5 && (!gap || days > gap.days)) gap = { days, from: marks[i - 1] + DAY_MS, to: marks[i] - DAY_MS, open: i === marks.length - 1 };
    }
    const range = (a, b) => { const x = new Date(a), y = new Date(b); return dayText(a) + '–' + (x.getMonth() === y.getMonth() ? y.getDate() : dayText(b)); };
    const newTop14 = plays.filter(p => now - p.t <= 14 * DAY_MS && topIds.has(p.id)).length;

    const r14 = at(14, 'rank'), r30 = at(30, 'rank');
    const p14 = at(14, 'rp'), p30 = at(30, 'rp');
    const rankMove = ref => ref && nowRank ? ref.rank - nowRank : null; // positive: climbed
    const rpMove = ref => ref && nowRp !== null ? nowRp - ref.rp : null;
    const span = ref => ref ? Math.round((now - ref.t) / DAY_MS) : 0;
    const rankPath = ref => em('#' + fmt(ref.rank)) + ' → ' + em('#' + fmt(nowRank));

    const paragraphs = [];

    // 1. The last 14 days.
    const days14 = r14 || p14 ? Math.max(span(r14), span(p14)) : 14;
    const period = days14 >= 13 ? 'the last 14 days' : 'the last ' + plural(days14, 'day', 'days');
    const move14 = rankMove(r14), gain14 = rpMove(p14);
    const rankAfter = move14 === null ? '' : move14 < 0 ? 'others moved past: ' + rankPath(r14) + '.'
      : move14 > 0 ? 'you climbed ' + rankPath(r14) + '.' : 'your rank held at ' + em('#' + fmt(nowRank)) + '.';
    let first = '';
    if (last14.n === 0) {
      first = 'No ranked plays in ' + period + (lastPlay ? '; the last one was on ' + em(dayText(lastPlay)) + ', ' + ago(lastPlay) + '.' : '.');
      if (move14 !== null) first += ' Without new RP, ' + rankAfter;
    } else {
      const quiet = before14.exact && before14.n >= 10 && last14.n <= Math.max(3, before14.n * 0.2);
      const playsText = (last14.exact ? '' : 'At least ') + plural(last14.n, 'ranked play', 'ranked plays');
      first = (quiet ? 'Only ' + playsText.charAt(0).toLowerCase() + playsText.slice(1) : playsText) + ' in ' + period
        + (last14.n <= 4 && perDay.length ? ' (' + list(perDay.map(d => d.n + ' on ' + em(d.day))) + ')' : '')
        + (quiet ? ', after ' + em(fmt(before14.n)) + ' in the two weeks before' : '') + '.'
        + (newTop14 ? ' ' + (newTop14 === last14.n && newTop14 > 1 ? 'All of them' : newTop14 === 1 && last14.n === 1 ? 'It' : fmt(newTop14) + ' of them') + ' made your top 100.' : '');
      if (gain14 !== null) {
        const gained = rpText(gain14);
        const pause = gap ? (gap.open ? 'With nothing since ' + em(dayText(gap.from - DAY_MS)) : 'With nothing from ' + em(range(gap.from, gap.to))) : 'With so few plays';
        if (quiet || last14.n <= 3) first += ' ' + pause + ', RP barely moved (' + em(gained) + ')' + (move14 !== null ? ' and ' + rankAfter : '.');
        else if (newTop14 === 0) first += ' None beat an existing top score, so RP barely moved (' + em(gained) + ')' + (move14 !== null ? ' and ' + rankAfter : '.');
        else if (move14 !== null && move14 < 0 && gain14 > 0) first += ' They added ' + em(gained) + ', but players around you gained faster: ' + rankPath(r14) + '.';
        else first += ' They added ' + em(gained) + (move14 !== null ? (move14 > 0 ? ' and took you ' + rankPath(r14) + '.' : ', and ' + rankAfter) : '.');
      }
    }
    paragraphs.push(first);

    // 2. The last 30 days.
    const move30 = rankMove(r30), gain30 = rpMove(p30);
    if (r30 || p30) {
      const days30 = Math.max(span(r30), span(p30));
      const since = days30 >= 28 ? 'Over 30 days' : 'Since ' + dayText(now - days30 * DAY_MS);
      const parts = [];
      if (move30 !== null) parts.push(move30 === 0 ? 'stayed at ' + em('#' + fmt(nowRank)) : 'went from ' + em('#' + fmt(r30.rank)) + ' to ' + em('#' + fmt(nowRank)) + ' (' + (move30 > 0 ? '▲ ' : '▼ ') + fmt(Math.abs(move30)) + ')');
      if (gain30 !== null) parts.push(gain30 > 0 ? 'gained ' + em(fmt(gain30) + ' RP') : gain30 < 0 ? 'lost ' + em(fmt(-gain30) + ' RP') : 'kept the same RP');
      let second = since + ' you ' + list(parts) + '.';
      if (gain30 > 0 && gain14 !== null && p14 && p30 && p14.t < now - 7 * DAY_MS) {
        const earlier = gain30 - gain14;
        if (earlier >= gain30 * 0.75 && gain30 >= 10) second += ' Most of that RP (' + em(rpText(earlier)) + ') came before ' + dayText(p14.t) + '.';
      }
      // Busiest week in the last 30 days, when the ranked play list covers it.
      if (plays.length && (plays.length < 100 || oldestPlay <= now - 30 * DAY_MS)) {
        let best = null;
        for (let start = 30; start >= 7; start--) {
          const n = plays.filter(p => p.t > now - start * DAY_MS && p.t <= now - (start - 7) * DAY_MS).length;
          if (!best || n > best.n) best = { n, from: now - start * DAY_MS };
        }
        if (best && best.n >= 5) second += ' Your busiest week was ' + range(best.from + DAY_MS, best.from + 7 * DAY_MS) + ', with ' + em(fmt(best.n)) + ' ranked plays.';
      }
      const new30 = top.filter(s => { const t = timestamp(s.date || s.created_at || s.createdAt); return Number.isFinite(t) && t <= now && now - t <= 30 * DAY_MS; }).length;
      if (top.length >= 10) second += ' ' + (new30 ? em(fmt(new30)) + ' ' + (new30 === 1 ? 'score' : 'scores') + ' in your top ' + fmt(Math.min(top.length, 100)) + ' ' + (new30 === 1 ? 'is' : 'are') + ' from this time.' : 'None of your top scores are from this time.');
      paragraphs.push(second);
    }

    // 3. The top 100 and what would help most.
    const measured = top.slice(0, 100).filter(s => domain.getScoreRawRp(s) > 0);
    const spread = domain.getRpSpreadStats(measured);
    if (spread.count >= 5) {
      const best = measured.reduce((a, s) => (!a || domain.getScoreRawRp(s) > domain.getScoreRawRp(a) ? s : a), null);
      const bestTime = timestamp(best.date || best.created_at || best.createdAt);
      const title = domain.getScoreTitle(best);
      let third = 'Your best play is ' + em(title.length > 60 ? title.slice(0, 57).trimEnd() + '…' : title) + ' at ' + em(fmt(domain.getScoreRawRp(best)) + ' RP')
        + (Number.isFinite(bestTime) ? ', set ' + ago(bestTime) : '') + '.';
      third += ' Your top ' + fmt(spread.count) + ' averages ' + em(fmt(spread.avgRp) + ' RP') + ' and its lowest score is ' + em(fmt(spread.bottomRp) + ' RP') + '.';
      const ratio = spread.bottomRp / spread.topRp;
      const goal = Math.min(spread.topRp, Math.ceil((ratio < 0.4 ? Math.max(spread.bottomRp * 1.1, spread.topRp * 0.25) : spread.bottomRp * 1.1) / 10) * 10);
      if (spread.count < 25) third += ' The list is still short, so every new score above ' + em(fmt(spread.bottomRp) + ' RP') + ' adds to your total.';
      else if (ratio < 0.9) third += ' New scores above ' + em(fmt(goal) + ' RP') + ' replace your weakest plays, which is the quickest way to add to your total.';
      else third += ' The list is very even, so only new personal bests near the top will move your total much.';
      paragraphs.push(third);
    }

    return { lead: label, paragraphs };
  }

  RhythiaX.PlaystyleScout = {
    buildStory,
    evaluateMomentum,
    evaluateAccuracyTrend,
    evaluateSpeedSummary,
    generateScoutingSummary,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = RhythiaX.PlaystyleScout;
  }
})();
