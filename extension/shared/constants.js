// =============================================
// Rhythia X — Constants
// =============================================

var RhythiaX = RhythiaX || {};

// ─── Constants ───────────────────────────────
RhythiaX.GRADE_COLORS = {
  SS: '#FFD700', S: '#00E5FF', A: '#22C55E', B: '#84CC16',
  C: '#9CA3AF', D: '#EF4444', F: '#EF4444',
};
RhythiaX.GRADE_ORDER = ['SS', 'S', 'A', 'B', 'C', 'D', 'F'];

// Grade background colors (darker, more muted for the strip)
RhythiaX.GRADE_BG = {
  SS: 'rgba(255, 215, 0, 0.2)',
  S: 'rgba(0, 229, 255, 0.18)',
  A: 'rgba(34, 197, 94, 0.18)',
  B: 'rgba(132, 204, 22, 0.14)',
  C: 'rgba(156, 163, 175, 0.12)',
  D: 'rgba(239, 68, 68, 0.15)',
  F: 'rgba(239, 68, 68, 0.15)',
};

RhythiaX.GRADE_STRIP_COLORS = {
  SS: '#FFD700',
  S: '#00E5FF',
  A: '#22C55E',
  B: '#84CC16',
  C: '#6B7280',
  D: '#DC2626',
  F: '#DC2626',
};

RhythiaX.SCORE_SELECTOR = 'div.relative.py-2';

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
