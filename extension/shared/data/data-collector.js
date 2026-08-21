// =============================================
// Rhythia X - Stats and ranking data collector
// =============================================

var RhythiaX = RhythiaX || {};

function collectorHasValue(value) {
  return value !== undefined && value !== null && String(value).trim() !== '' && String(value).trim() !== '—';
}

function collectorNumber(value) {
  if (!collectorHasValue(value)) return null;
  const parsed = RhythiaX.parseLocalizedNumber
    ? RhythiaX.parseLocalizedNumber(value)
    : Number.parseFloat(String(value).replace(/,/g, '.').replace('%', ''));
  return Number.isFinite(parsed) ? parsed : null;
}

function collectorNonNegative(value) {
  const number = collectorNumber(value);
  return number === null ? null : Math.max(0, number);
}

function collectorNonNegativeInteger(value) {
  if (!collectorHasValue(value)) return null;
  const parsed = RhythiaX.parseStatNumber
    ? RhythiaX.parseStatNumber(value)
    : Number.parseInt(String(value).replace(/[^0-9-]/g, ''), 10);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : null;
}

function collectorScores(scoreSets) {
  return Array.isArray(scoreSets?.scores) ? scoreSets.scores : [];
}

function collectorRatingScores(scoreSets, scores) {
  return Array.isArray(scoreSets?.ratingScores) && scoreSets.ratingScores.length
    ? scoreSets.ratingScores
    : scores;
}

function collectorAccuracy(scores, player) {
  const playerAccuracy = collectorNumber(player?.avgAccuracy);
  const normalizedPlayerAccuracy = RhythiaX.normalizeDataMetricValue
    ? RhythiaX.normalizeDataMetricValue('avgAccuracy', playerAccuracy)
    : playerAccuracy;
  if (normalizedPlayerAccuracy !== null) return normalizedPlayerAccuracy;
  const values = scores.map(score => collectorNumber(score?.accuracy)).filter(value => value !== null);
  if (!values.length) return null;
  const average = Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2));
  return RhythiaX.normalizeDataMetricValue
    ? RhythiaX.normalizeDataMetricValue('avgAccuracy', average)
    : average;
}

function collectorWeeksSince(player) {
  const hereSince = RhythiaX.extractHereSince?.();
  if (!hereSince || typeof RhythiaX.weeksSince !== 'function') return null;
  const weeks = RhythiaX.weeksSince(hereSince);
  return Number.isFinite(weeks) && weeks > 0 ? weeks : null;
}

function collectorMetricRequirements(settings) {
  const required = [];
  if (settings.collectStats) {
    required.push('weightedRp', 'rawRp', 'avgAccuracy', 'fcCount', 'playCount', 'squaresHit', 'mapsPerWeek');
  }
  if (settings.collectRanking) required.push('globalRank', 'countryRank', 'rhythmPoints');
  return [...new Set(required)];
}

function collectorBuildMetrics(player, scores, ratingScores, settings) {
  const metrics = RhythiaX.DATA_METRIC_KEYS.reduce((result, key) => {
    result[key] = null;
    return result;
  }, {});
  const scoreDataAvailable = scores.length > 0;
  const fcSource = ratingScores.length ? ratingScores : scores;
  const weightedRp = collectorNonNegative(player?.rp);
  const playCount = collectorNonNegative(player?.playCount);
  const squaresHit = collectorNonNegative(player?.squaresHit);
  const weeks = collectorWeeksSince(player);

  if (settings.collectStats) {
    metrics.weightedRp = weightedRp;
    const rawRp = scoreDataAvailable && typeof RhythiaX.calcRawUnweightedRp === 'function'
      ? Number(RhythiaX.calcRawUnweightedRp(scores))
      : null;
    metrics.rawRp = Number.isFinite(rawRp) ? Math.max(0, rawRp) : null;
    metrics.avgAccuracy = collectorAccuracy(scores, player);
    metrics.fcCount = scoreDataAvailable
      ? fcSource.filter(score => score?.grade === 'SS' || score?.fullCombo === true || Number.parseInt(score?.misses, 10) === 0).length
      : null;
    metrics.playCount = playCount !== null ? playCount : (scoreDataAvailable ? scores.length : null);
    metrics.squaresHit = squaresHit !== null && squaresHit > 0
      ? squaresHit
      : (scoreDataAvailable ? scores.reduce((sum, score) => sum + (Number.parseInt(score?.notes, 10) || 0), 0) : null);
    const effectivePlayCount = metrics.playCount;
    metrics.mapsPerWeek = weeks !== null && effectivePlayCount !== null
      ? Number((effectivePlayCount / weeks).toFixed(1))
      : null;
  }

  if (settings.collectRanking) {
    metrics.globalRank = collectorNonNegativeInteger(player?.globalRank);
    metrics.countryRank = collectorNonNegativeInteger(player?.countryRank);
    metrics.rhythmPoints = weightedRp;
  }

  return { metrics, scoreDataAvailable };
}

function collectorMissingMetrics(metrics, settings) {
  const required = collectorMetricRequirements(settings);
  return required.filter(key => metrics[key] === null);
}

RhythiaX.collectDataSnapshot = function ({
  player,
  scoreSets,
  source = 'dom',
  visitId = '',
  capturedAt = Date.now(),
  settings = RhythiaX.DATA_DEFAULT_SETTINGS,
} = {}) {
  const normalizedSettings = RhythiaX.normalizeDataSettings(settings);
  const scores = collectorScores(scoreSets);
  const ratingScores = collectorRatingScores(scoreSets, scores);
  const built = collectorBuildMetrics(player || {}, scores, ratingScores, normalizedSettings);
  const missing = collectorMissingMetrics(built.metrics, normalizedSettings);
  const timestamp = Number(capturedAt) || Date.now();
  return {
    id: `${String(visitId || 'capture')}:${timestamp}`,
    visitId: String(visitId || ''),
    kind: 'capture',
    date: RhythiaX.localDateKey(new Date(timestamp)),
    capturedAt: timestamp,
    status: source === 'dom' || missing.length ? 'partial' : 'complete',
    source: ['dom', 'api'].includes(source) ? source : 'dom',
    missing,
    metrics: built.metrics,
  };
};

function collectorMergeMetrics(base, supplement) {
  const merged = RhythiaX.DATA_METRIC_KEYS.reduce((result, key) => {
    const baseValue = base?.[key];
    const supplementValue = supplement?.[key];
    result[key] = supplementValue !== null && supplementValue !== undefined
      ? supplementValue
      : (baseValue === undefined ? null : baseValue);
    return result;
  }, {});
  return merged;
}

RhythiaX.mergeDataSnapshots = function (baseSnapshot, supplementSnapshot) {
  if (!baseSnapshot) return supplementSnapshot ? RhythiaX.cloneDataValue(supplementSnapshot) : null;
  if (!supplementSnapshot) return RhythiaX.cloneDataValue(baseSnapshot);
  const base = RhythiaX.normalizeDataSnapshot(baseSnapshot, baseSnapshot.date);
  const supplement = RhythiaX.normalizeDataSnapshot(supplementSnapshot, baseSnapshot.date);
  if (!base) return supplement;
  if (!supplement) return base;
  const mergedMetrics = collectorMergeMetrics(base.metrics, supplement.metrics);
  const missing = [...new Set([
    ...(Array.isArray(base.missing) ? base.missing : []),
    ...(Array.isArray(supplement.missing) ? supplement.missing : []),
  ])].filter(key => mergedMetrics[key] === null);
  return {
    ...base,
    id: base.id,
    visitId: base.visitId || supplement.visitId,
    date: base.date,
    capturedAt: Math.max(base.capturedAt, supplement.capturedAt),
    status: missing.length ? 'partial' : 'complete',
    source: 'merged',
    missing,
    metrics: mergedMetrics,
  };
};

RhythiaX.dataSnapshotHasMetricChange = function (left, right) {
  if (!left || !right) return Boolean(left || right);
  return RhythiaX.DATA_METRIC_KEYS.some(key => {
    const leftValue = left.metrics?.[key] ?? null;
    const rightValue = right.metrics?.[key] ?? null;
    if (leftValue === null && rightValue === null) return false;
    if (leftValue === null || rightValue === null) return true;
    return Number(leftValue) !== Number(rightValue);
  });
};
