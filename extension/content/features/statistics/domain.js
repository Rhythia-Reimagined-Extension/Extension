// Pure statistics calculations. DOM and feature settings remain in later layers.
var RhythiaX = RhythiaX || {};

(function () {
  function number(value) {
    const parsed = RhythiaX.parseLocalizedNumber
      ? RhythiaX.parseLocalizedNumber(value)
      : Number.parseFloat(String(value ?? '').replace(/,/g, '').replace('%', ''));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  function averageAccuracy(scores, player) {
    const raw = String(player?.avgAccuracy ?? '').trim();
    if (raw) {
      const parsed = number(raw);
      const value = RhythiaX.normalizeDataMetricValue ? RhythiaX.normalizeDataMetricValue('avgAccuracy', parsed) : parsed;
      if (value !== null && value !== undefined) return value.toFixed(2);
    }
    const values = scores.map(score => number(score.accuracy)).filter(value => value > 0);
    return values.length ? (values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2) : '—';
  }
  function fullComboCount(scores) { return scores.filter(score => score.grade === 'SS' || score.fullCombo === true || score.fullCombo === 1 || (score.fullCombo == null && number(score.misses) === 0)).length; }
  function mapsPerWeek(playCount, hereSince) { const weeks = RhythiaX.weeksSince(hereSince); return weeks > 0 && playCount > 0 ? (playCount / weeks).toFixed(1) : '—'; }
  RhythiaX.StatisticsDomain = { number, averageAccuracy, fullComboCount, mapsPerWeek };
})();
