// =============================================
// Rhythia X — Constants
// =============================================

var RhythiaX = RhythiaX || {};

// Synchronously initialize active stats tab from localStorage to prevent layout flash
try {
  const activeStatsTab = (typeof localStorage !== 'undefined' && localStorage.getItem('rhythiax_active_stats_tab')) || 'reimagined';
  if (typeof document !== 'undefined' && document.documentElement) {
    document.documentElement.dataset.rhythiaxStatsTab = activeStatsTab;
  }
} catch (_) {}

// ─── Constants ───────────────────────────────
RhythiaX.GRADE_COLORS = {
  SS: '#FFD700', S: '#00E5FF', A: '#22C55E', B: '#84CC16',
  C: '#9CA3AF', D: '#EF4444', F: '#EF4444',
};
RhythiaX.GRADE_ORDER = ['SS', 'S', 'A', 'B', 'C', 'D', 'F'];

RhythiaX.SCORE_SELECTOR = 'div.relative.py-2, div.relative.overflow-hidden.rounded-lg.border';

RhythiaX.SPEED_ORDER = ['1.45', '1.35', '1.25', '1.15', '1.00', '0.87', '0.80', '0.75'];
RhythiaX.SPEED_COLORS = {
  '1.45': ['#8960E8', '#6D3FD2'],
  '1.35': ['#4E86DF', '#3269C8'],
  '1.25': ['#37C7EF', '#179FC5'],
  '1.15': ['#74B7F3', '#4B9BDC'],
  '1.00': ['#B6AFC5', '#8E889B'],
  '0.87': ['#F6B11A', '#D78E00'],
  '0.80': ['#F47732', '#DF5B16'],
  '0.75': ['#EB4E5C', '#BD3044'],
};

RhythiaX.normalizeSpeed = function (speed) {
  const value = Number.parseFloat(speed);
  return Number.isFinite(value) ? value.toFixed(2) : '1.00';
};
