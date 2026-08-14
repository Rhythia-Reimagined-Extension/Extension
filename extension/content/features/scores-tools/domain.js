// Pure score filter, sort, and export serialization helpers.
var RhythiaX = RhythiaX || {};

(function () {
  const defaults = { query: '', sort: 'weightedRp', grade: '', speed: '', fullCombo: false, hasReplay: false, minAccuracy: '', minWeightedRp: '' };
  function number(value) { const parsed = Number.parseFloat(String(value ?? '').replace(/,/g, '').replace('%', '')); return Number.isFinite(parsed) ? parsed : 0; }
  function matches(score, state) { const grades = RhythiaX.activeGrades === null || !RhythiaX.activeGrades.size || RhythiaX.activeGrades.has(score.grade); const speed = RhythiaX.activeSpeed === null || !RhythiaX.activeSpeed || RhythiaX.normalizeSpeed(score.speed) === RhythiaX.activeSpeed; const text = [score.songTitle, score.mods, score.grade].filter(Boolean).join(' ').toLowerCase(); return grades && speed && (!state.query || text.includes(state.query.toLowerCase())) && (!state.grade || score.grade === state.grade) && (!state.speed || RhythiaX.normalizeSpeed(score.speed) === state.speed) && (!state.minAccuracy || score.accuracyValue >= number(state.minAccuracy)) && (!state.minWeightedRp || score.weightedValue >= number(state.minWeightedRp)) && (!state.fullCombo || score.fullCombo) && (!state.hasReplay || score.hasReplay); }
  function compare(left, right, sort) { const key = { weightedRp: 'weightedValue', rawRp: 'rawValue', accuracy: 'accuracyValue', date: 'dateValue', notes: 'notesValue', misses: 'missesValue' }[sort]; const values = sort === 'speed' ? [number(left.speed), number(right.speed)] : [left[key || 'weightedValue'], right[key || 'weightedValue']]; return values[1] - values[0] || String(left.songTitle).localeCompare(String(right.songTitle)); }
  function csv(scores) { const fields = ['scoreId', 'songTitle', 'grade', 'accuracy', 'mods', 'speed', 'notes', 'misses', 'rpEarned', 'weightedRp']; return [fields.join(','), ...scores.map(score => fields.map(field => `"${String(score[field] ?? '').replace(/"/g, '""')}"`).join(','))].join('\n'); }
  RhythiaX.ScoresToolsDomain = { defaults, number, matches, compare, csv };
})();
