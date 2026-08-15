// =============================================
// Rhythia X — Time helpers
// =============================================

var RhythiaX = RhythiaX || {};

// ─── Time helpers ────────────────────────────
RhythiaX.parseRelativeTime = function (text) {
  if (!text) return null;
  const t = text.trim().toLowerCase();
  const now = new Date();
  const match = t.match(/(\d+)\s*(second|minute|hour|day|week|month|year)s?\s*ago/);
  if (!match) return null;
  const n = parseInt(match[1]);
  const unit = match[2];
  const d = new Date(now);
  switch (unit) {
    case 'second': d.setSeconds(d.getSeconds() - n); break;
    case 'minute': d.setMinutes(d.getMinutes() - n); break;
    case 'hour':   d.setHours(d.getHours() - n); break;
    case 'day':    d.setDate(d.getDate() - n); break;
    case 'week':   d.setDate(d.getDate() - n * 7); break;
    case 'month':  d.setMonth(d.getMonth() - n); break;
    case 'year':   d.setFullYear(d.getFullYear() - n); break;
  }
  return d;
};

RhythiaX.formatDate = function (d) {
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return '';
  const pad = value => String(value).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

RhythiaX.localDateKey = function (date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
  const pad = value => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

RhythiaX.formatRelativeDate = function (date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
  const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  const units = [
    ['year', 31536000],
    ['month', 2592000],
    ['week', 604800],
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60],
    ['second', 1],
  ];
  const unit = units.find(item => seconds >= item[1]) || units[units.length - 1];
  const count = Math.max(1, Math.floor(seconds / unit[1]));
  return `${count} ${unit[0]}${count === 1 ? '' : 's'} ago`;
};

RhythiaX.formatNumber = function (n) {
  const value = Number(n);
  return Number.isFinite(value) ? value.toLocaleString('en-US') : '0';
};

function cleanStatValueString(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object' && value.nodeType) {
    if (value.querySelector && value.cloneNode && value.querySelector('.rhythiax-profile-history-delta, .rhythiax-history-kind, .rhythiax-history-delta, .rhythiax-history-edited-delta-marker')) {
      const clone = value.cloneNode(true);
      clone.querySelectorAll('.rhythiax-profile-history-delta, .rhythiax-history-kind, .rhythiax-history-delta, .rhythiax-history-edited-delta-marker').forEach(item => item.remove());
      return clone.textContent?.trim() || '';
    }
    return value.textContent?.trim() || '';
  }
  let str = String(value).trim();
  str = str.replace(/\s*[\+\-\=]\s*[\d,\.]+%?$/, '').trim();
  return str;
}

RhythiaX.cleanStatValueString = cleanStatValueString;

// Parse numbers formatted by the site as "1 032", "1 032" or "1,032".
RhythiaX.parseStatNumber = function (value) {
  const cleaned = cleanStatValueString(value);
  const digits = cleaned.replace(/[^0-9]/g, '');
  return digits ? Number(digits) : 0;
};

RhythiaX.parseLocalizedNumber = function (value) {
  const cleaned = cleanStatValueString(value);
  const text = cleaned.replace(/[\s\u00a0]/g, '');
  if (!text) return 0;
  const commaCount = (text.match(/,/g) || []).length;
  const dotCount = (text.match(/\./g) || []).length;
  let normalized = text;
  if (commaCount && dotCount) {
    const decimalSeparator = text.lastIndexOf(',') > text.lastIndexOf('.') ? ',' : '.';
    const groupingSeparator = decimalSeparator === ',' ? '.' : ',';
    normalized = text.replace(new RegExp(`\\${groupingSeparator}`, 'g'), '').replace(decimalSeparator, '.');
  } else if (commaCount || dotCount) {
    const separator = commaCount ? ',' : '.';
    const parts = text.split(separator);
    const isThousandsGrouping = parts.length > 1 && parts.slice(1).every(part => part.length === 3);
    normalized = isThousandsGrouping ? parts.join('') : `${parts.slice(0, -1).join('')}.${parts[parts.length - 1]}`;
  }
  const number = Number.parseFloat(normalized);
  return Number.isFinite(number) ? number : 0;
};

// ─── Compute weeks since a date ───────────────
RhythiaX.weeksSince = function (date) {
  if (!date) return 0;
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  return (Date.now() - date.getTime()) / msPerWeek;
};

// ─── Here since extraction ────────────────────
RhythiaX.extractHereSince = function () {
  // First try: find in sidebar (profile page)
  const sidebar = RhythiaX.qs('.lg\\:col-span-3');
  if (sidebar) {
    const sidebarText = sidebar.textContent;
    const match = sidebarText.match(/Here since:\s*(.+)/i);
    if (match) {
      const date = new Date(match[1]);
      if (!isNaN(date.getTime())) return date;
    }
  }
  // Second try: search all div elements
  const els = RhythiaX.qsa('div');
  for (const el of els) {
    const text = el.textContent.trim();
    const match = text.match(/Here since:\s*(.+)/i);
    if (match) {
      const date = new Date(match[1]);
      if (!isNaN(date.getTime())) return date;
    }
  }
  // Fallback: leaf text nodes with 'Here since'
  const allEls = RhythiaX.qsa('span, p, div');
  for (const el of allEls) {
    if (el.children.length === 0) {
      const text = el.textContent.trim();
      if (text.startsWith('Here since')) {
        const match = text.match(/Here since:\s*(.+)/i);
        if (match) {
          const date = new Date(match[1]);
          if (!isNaN(date.getTime())) return date;
        }
      }
    }
  }
  return null;
};
