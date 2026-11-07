// =============================================
// Reimagined for Rhythia — history tables (Classic Statistics, variant A)
// =============================================
// The Rankings and Progress history tables under a profile's Statistics, the one loader that
// fills either pane (this device first, then the online history), and the redraw after a
// date format or Statistics variant change. Variant B is statistics/history-view.js.

var RhythiaX = RhythiaX || {};

function dataUiFormatValue(key, value) {
  if (value === null || value === undefined || value === '') return '—';
  const number = Number(value);
  if (!Number.isFinite(number)) return String(value);
  if (key === 'avgAccuracy') return `${number.toFixed(2)}%`;
  if (key === 'mapsPerWeek') return number.toFixed(1);
  if (key === 'globalRank' || key === 'countryRank') return `#${RhythiaX.formatNumber(number)}`;
  return RhythiaX.formatNumber(number);
}

function dataUiGroupPointsByWeek(points) {
  const weeks = [];
  let currentWeek = null;

  points.forEach((point, idx) => {
    if (!point.date) return;
    const parts = String(point.date).split('-');
    if (parts.length < 3) return;
    const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    const day = d.getDay();
    const mondayDiff = d.getDate() - (day === 0 ? 6 : day - 1);
    const monday = new Date(d);
    monday.setDate(mondayDiff);
    const mondayKey = typeof RhythiaX.localDateKey === 'function'
      ? RhythiaX.localDateKey(monday)
      : `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const sundayKey = typeof RhythiaX.localDateKey === 'function'
      ? RhythiaX.localDateKey(sunday)
      : `${sunday.getFullYear()}-${String(sunday.getMonth() + 1).padStart(2, '0')}-${String(sunday.getDate()).padStart(2, '0')}`;

    const format = (RhythiaX.getDateFormat ? RhythiaX.getDateFormat() : 'yyyy-mm-dd').toLowerCase();
    const pad = v => String(v).padStart(2, '0');
    const mParts = mondayKey.split('-');
    const sParts = sundayKey.split('-');
    // Day first for a day-first date format, otherwise month first.
    const dayFirst = format === 'dd-mm-yyyy';
    const label = parts => (dayFirst ? `${pad(parts[2])}-${pad(parts[1])}` : `${pad(parts[1])}-${pad(parts[2])}`);
    const monLabel = label(mParts), sunLabel = label(sParts);
    const weekLabel = `${monLabel} – ${sunLabel}`;

    if (!currentWeek || currentWeek.mondayKey !== mondayKey) {
      currentWeek = {
        mondayKey,
        label: weekLabel,
        points: [],
      };
      weeks.push(currentWeek);
    }
    currentWeek.points.push({ ...point, originalIndex: idx });
  });

  return weeks;
}

function formatHistoryDateLabel(dateStr) {
  if (!dateStr || dateStr === '—') return '—';
  try {
    const raw = String(dateStr).trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      return dateStr;
    }
    const parts = raw.split('-');
    const dayNum = parseInt(parts[2], 10);
    const d = new Date(Number(parts[0]), Number(parts[1]) - 1, dayNum);
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const day = !isNaN(d.getTime()) ? days[d.getDay()] : null;
    const format = String(RhythiaX.getDateFormat ? RhythiaX.getDateFormat() : 'yyyy-mm-dd').toLowerCase();
    const pad = v => String(v).padStart(2, '0');
    let formatted = '';
    if (format === 'dd-mm-yyyy') {
      formatted = `${pad(dayNum)}-${pad(parts[1])}`;
    } else {
      formatted = `${pad(parts[1])}-${pad(dayNum)}`;
    }
    if (day) return `${day}, ${formatted}`;
    return formatted;
  } catch (_) {}
  return dateStr;
}

// Next to the title when the online part holds only the service's last days (recentOnly): the service gives
// full history to installations with a key. Cloud + Local fills in the older days from this device, so the
// label names the online part. Both layouts use these (history-view.js draws the default one).
const HISTORY_RECENT_ONLY_LABEL = 'Online: last 3 days';
const HISTORY_RECENT_ONLY_NOTE = 'Only the last 3 days could be loaded';
function historyRecentOnlyBadge(recentOnly) {
  return recentOnly
    ? `<span class="rhythiax-cloud-badge" style="display: inline-flex; align-items: center; font-size: 11px; font-weight: 500; color: var(--rhythiax-text-muted, #a1a1aa); margin-left: 8px;" title="${HISTORY_RECENT_ONLY_NOTE}">${HISTORY_RECENT_ONLY_LABEL}</span>`
    : '';
}

// ── The period list both history panes use (Progress and Rankings, Statistics A) ──
// Last 7 days, Weeks or Months. The rows are Rhythia's own list rows (the leaderboard's, numbers centred in their
// columns). A metric shown by its change ('change') has what the period changed first and where it ended under it;
// one shown by its value ('value', ranks and accuracy) has the value first and the change under it; 'plain' has
// the value only. One metric has a bar for its gain next to the others of the same level. Months open into their
// weeks and weeks into their days; a run of days where nothing changed folds into one row; older periods come with
// Show older instead of a box that scrolls. A week belongs to the month and year its Thursday is in. Rows come in
// one after another; a period opened shows its own rows coming in. The last choice in this browser comes back,
// per pane; Weeks the first time.
// cfg: { name ('Progress history'), viewKey, tableClass, metrics: [{ key, label, mode, rank }], valueOf(point, key),
//   bar: { key, gain(p) }, quietKeys, quietText ('No plays'), empty }
const PERIOD_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
function mountPeriodList(history, headerBar, inner, cfg) {
  const HORIZONS = [['last7', 'Last 7 days'], ['weekly', 'Weeks'], ['monthly', 'Months']];
  let currentHorizon = 'weekly';
  try { const saved = localStorage.getItem(cfg.viewKey); if (HORIZONS.some(([id]) => id === saved)) currentHorizon = saved; } catch (_) {}
  const horizonGroup = document.createElement('div');
  horizonGroup.className = 'rhythiax-history-horizon-group';
  horizonGroup.setAttribute('role', 'group');
  horizonGroup.setAttribute('aria-label', `${cfg.name} by`);
  horizonGroup.innerHTML = HORIZONS.map(([id, label]) => `<button type="button" class="rhythiax-history-horizon-btn ${currentHorizon === id ? 'active' : ''}" data-horizon="${id}" aria-pressed="${currentHorizon === id}">${label}</button>`).join('');
  headerBar.appendChild(horizonGroup);

  const tableWrap = document.createElement('div');
  tableWrap.className = 'rhythiax-ph-wrap';
  const table = document.createElement('div');
  table.className = `rhythiax-ph ${cfg.tableClass}`;
  table.style.setProperty('--ph-cols', String(cfg.metrics.length));
  table.setAttribute('role', 'table');
  table.setAttribute('aria-label', cfg.name);
  const more = document.createElement('button');
  more.type = 'button';
  more.className = 'rhythiax-ph-more inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg border text-sm font-semibold transition-colors border-line bg-control text-white hover:bg-control-hover h-9 px-4';
  tableWrap.append(table);
  inner.append(tableWrap, more);

  const esc = value => RhythiaX.escapeHtml(String(value ?? ''));
  const valueOf = cfg.valueOf;
  // A period from its points' places in history (newest first): where it ended, and the point just before it,
  // which its changes are measured from. The oldest period has none, so it shows no change.
  const period = idx => ({ end: history[idx[0]], before: history[idx[idx.length - 1] + 1] || null });
  const gainOf = p => (p.before ? Number(cfg.bar.gain(p)) || 0 : 0);
  const maxGain = periods => Math.max(0, ...periods.map(gainOf));

  function cellsHtml(p, max, withBar) {
    return cfg.metrics.map(m => {
      const value = valueOf(p.end, m.key);
      const delta = p.before ? dataUiMetricDelta(m.key, value, valueOf(p.before, m.key)) : null;
      const cls = delta === null || delta === '—' ? 'neutral' : dataUiDeltaClass(delta, false);
      let main, sub;
      if (m.mode === 'change') {
        main = `<strong class="rhythiax-ph-val is-change ${cls}">${esc(delta === null ? '—' : delta)}</strong>`;
        sub = `<small class="rhythiax-ph-sub">${esc(dataUiFormatValue(m.key, value))}</small>`;
      } else {
        main = `<strong class="rhythiax-ph-val">${esc(dataUiFormatValue(m.key, value))}</strong>`;
        sub = m.mode === 'value' && cls !== 'neutral' ? `<small class="rhythiax-ph-sub ${cls}">${esc(delta)}</small>` : '';
      }
      let bar = '';
      if (withBar && m.key === cfg.bar.key) {
        const gain = gainOf(p);
        bar = `<span class="rhythiax-ph-bar" aria-hidden="true"><i style="width:${gain > 0 && max > 0 ? Math.max(3, Math.round(gain / max * 100)) : 0}%"></i></span>`;
      }
      const line = bar || sub ? `<span class="rhythiax-ph-line">${bar}${sub}</span>` : '';
      return `<span role="cell" class="rhythiax-ph-cell rhythiax-col-${m.key}">${main}${line}</span>`;
    }).join('');
  }

  const CHEVRON = '<svg class="rhythiax-ph-chev" viewBox="0 0 24 24" aria-hidden="true"><polyline points="9 18 15 12 9 6" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const ROW = 'rhythiax-ph-row rounded-lg transition-colors';
  // open: null for a row that does not open.
  function rowHtml({ key = '', label, note = '', p, depth = 0, open = null, max = 0, bar = true }) {
    const toggle = open !== null;
    return `<div role="row" class="${ROW}${toggle ? ' is-toggle' : ''}${open ? ' is-open' : ''}" data-depth="${depth}" data-id="${esc(key || label)}" style="--d:${depth}"${toggle ? ` data-key="${esc(key)}" tabindex="0" aria-expanded="${open}"` : ''}>`
      + `<span role="rowheader" class="rhythiax-ph-when">${toggle ? CHEVRON : ''}<span class="rhythiax-ph-label">${esc(label)}</span>${note ? `<small>${esc(note)}</small>` : ''}</span>`
      + `${cellsHtml(p, max, bar)}</div>`;
  }

  // Days, newest first by their places in history; a run of days where nothing changed is one row.
  const shortDate = date => String(formatHistoryDateLabel(date)).replace(/^[A-Za-z]{3}, /, '');
  const quiet = i => {
    const p = history[i], q = history[i + 1];
    return Boolean(q) && cfg.quietKeys.every(k => Number(valueOf(p, k)) === Number(valueOf(q, k)));
  };
  function dayRows(idx, depth, bar) {
    const max = maxGain(idx.map(i => period([i])));
    let html = '';
    for (let k = 0; k < idx.length;) {
      let j = k;
      if (quiet(idx[k])) while (j + 1 < idx.length && quiet(idx[j + 1])) j++;
      if (j > k) {
        html += `<div role="row" class="${ROW} is-idle" data-depth="${depth}" data-id="idle-${esc(history[idx[k]].date)}" style="--d:${depth}"><span role="rowheader" class="rhythiax-ph-when"><span class="rhythiax-ph-label">${esc(shortDate(history[idx[j]].date))} – ${esc(shortDate(history[idx[k]].date))}</span></span><span role="cell" class="rhythiax-ph-idle">${esc(cfg.quietText)} for ${j - k + 1} days</span></div>`;
        k = j + 1;
        continue;
      }
      html += rowHtml({ label: formatHistoryDateLabel(history[idx[k]].date), p: period([idx[k]]), depth, max, bar });
      k++;
    }
    return html;
  }

  const weeks = dataUiGroupPointsByWeek(history).map(w => {
    const [y, mo, d] = w.mondayKey.split('-').map(Number);
    const thursday = new Date(y, mo - 1, d + 3);
    return {
      key: `w${w.mondayKey}`, label: w.label, idx: w.points.map(pt => pt.originalIndex), year: thursday.getFullYear(),
      month: `${thursday.getFullYear()}-${thursday.getMonth()}`, monthLabel: `${PERIOD_MONTHS[thursday.getMonth()]} ${thursday.getFullYear()}`,
    };
  });
  const months = [];
  weeks.forEach(w => {
    let m = months[months.length - 1];
    if (!m || m.key !== `m${w.month}`) months.push(m = { key: `m${w.month}`, label: w.monthLabel, weeks: [] });
    m.weeks.push(w);
  });
  const open = new Set([weeks[0]?.key, months[0]?.key].filter(Boolean));
  const STEP = { last7: 7, weekly: 8, monthly: 12 };
  const shown = { ...STEP };

  function weekRows(list, depth) {
    const max = maxGain(list.map(w => period(w.idx)));
    return list.map(w => {
      const isOpen = open.has(w.key), n = w.idx.length;
      return rowHtml({ key: w.key, label: w.label, note: `${w.year}${n < 7 ? ` · ${n} ${n === 1 ? 'day' : 'days'}` : ''}`, p: period(w.idx), depth, open: isOpen, max })
        + (isOpen ? dayRows(w.idx, depth + 1, false) : '');
    }).join('');
  }
  function monthRows(list) {
    const max = maxGain(list.map(m => period(m.weeks.flatMap(w => w.idx))));
    return list.map(m => {
      const isOpen = open.has(m.key), n = m.weeks.length;
      return rowHtml({ key: m.key, label: m.label, note: `${n} ${n === 1 ? 'week' : 'weeks'}`, p: period(m.weeks.flatMap(w => w.idx)), open: isOpen, max })
        + (isOpen ? weekRows(m.weeks, 1) : '');
    }).join('');
  }

  // Rows that just appeared slide in one after another, and their bars grow.
  function comeIn(rows) {
    [...rows].forEach((row, i) => {
      row.style.setProperty('--i', String(Math.min(i, 14)));
      row.classList.add('is-in');
    });
  }
  function render() {
    const first = currentHorizon === 'last7' ? 'Day' : currentHorizon === 'monthly' ? 'Month' : 'Week';
    const head = `<div role="row" class="rhythiax-ph-head"><span role="columnheader">${first}</span>${cfg.metrics.map(m => `<span role="columnheader" class="rhythiax-col-${m.key}">${m.label}</span>`).join('')}</div>`;
    more.hidden = true;
    if (!history.length) {
      table.innerHTML = `${head}<div class="rhythiax-history-empty">${esc(cfg.empty)}</div>`;
      return;
    }
    let body = '', total = 0, noun = '';
    if (currentHorizon === 'last7') {
      body = dayRows(history.slice(0, 7).map((_, i) => i), 0, true);
    } else if (currentHorizon === 'monthly') {
      total = months.length; noun = 'months';
      body = monthRows(months.slice(0, shown.monthly));
    } else {
      total = weeks.length; noun = 'weeks';
      body = weekRows(weeks.slice(0, shown.weekly), 0);
    }
    table.innerHTML = head + body;
    // A metric picked in the stat row above (statistics/view.js) keeps its column marked.
    if (table.dataset.focus) table.querySelectorAll(`.rhythiax-col-${table.dataset.focus}`).forEach(cell => cell.classList.add('rhythiax-col-focused'));
    more.hidden = shown[currentHorizon] >= total;
    more.textContent = `Show older ${noun}`;
    comeIn(table.querySelectorAll('.rhythiax-ph-row'));
  }
  render();

  const toggleRow = row => {
    const key = row?.dataset.key;
    if (!key) return;
    const opening = !open.has(key);
    if (opening) open.add(key); else open.delete(key);
    const before = new Set([...table.querySelectorAll('.rhythiax-ph-row')].map(r => r.dataset.id));
    render();
    // Only what the period opened comes in; the rest stays still.
    const rows = [...table.querySelectorAll('.rhythiax-ph-row')];
    rows.forEach(r => r.classList.remove('is-in'));
    if (opening) comeIn(rows.filter(r => !before.has(r.dataset.id)));
    table.querySelector(`.rhythiax-ph-row[data-key="${key}"]`)?.focus?.({ preventScroll: true });
  };
  table.addEventListener('click', e => {
    const row = e.target.closest?.('.rhythiax-ph-row.is-toggle');
    if (!row) return;
    e.stopPropagation();
    toggleRow(row);
  });
  table.addEventListener('keydown', e => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const row = e.target.closest?.('.rhythiax-ph-row.is-toggle');
    if (!row) return;
    e.preventDefault();
    toggleRow(row);
  });
  more.addEventListener('click', e => {
    e.stopPropagation();
    shown[currentHorizon] += STEP[currentHorizon];
    render();
  });
  horizonGroup.querySelectorAll('.rhythiax-history-horizon-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      currentHorizon = btn.dataset.horizon;
      try { localStorage.setItem(cfg.viewKey, currentHorizon); } catch (_) {}
      horizonGroup.querySelectorAll('.rhythiax-history-horizon-btn').forEach(b => {
        b.classList.toggle('active', b === btn);
        b.setAttribute('aria-pressed', String(b === btn));
      });
      render();
    });
  });
  return { render };
}

function renderRankHistoryTable(container, history, couldNotReachCloud = false, recentOnly = false) {
  if (RhythiaX.getStatsVariant?.() === 'variant_b' && RhythiaX.HistoryView) {
    RhythiaX.HistoryView.render(container, { kind: 'rankings', history, couldNotReachCloud, recentOnly });
    return;
  }
  container.dataset.rhythiaxHistoryVariant = 'variant_a';
  const wrap = document.createElement('div');
  wrap.className = 'rhythiax-inline-rank-history';

  const weekly = document.createElement('div');
  weekly.className = 'rhythiax-rank-history-weekly';
  const latest = history[0];
  const previousWeek = latest ? (
    history.find(point => point.date === dataUiDateMinusDays(latest.date, 7)) ||
    history.find(point => point.date <= dataUiDateMinusDays(latest.date, 5) && point.date >= dataUiDateMinusDays(latest.date, 9)) ||
    (history.length > 1 ? history[history.length - 1] : null)
  ) : null;
  [['Global Rank', 'globalRank', true], ['Country Rank', 'countryRank', true], ['Rhythm Points', 'rhythmPoints', false]].forEach(([label, key, rank]) => {
    const card = document.createElement('div');
    card.className = 'rhythiax-rank-history-weekly-card';
    const current = latest?.metrics?.[key];
    const previous = previousWeek?.metrics?.[key];
    const change = dataUiMetricDelta(key, current, previous);
    const labelSpan = document.createElement('span');
    labelSpan.textContent = label;
    const strong = document.createElement('strong');
    strong.textContent = current === null || current === undefined
      ? '—'
      : `${rank ? '#' : ''}${RhythiaX.formatNumber(current)}`;
    const small = document.createElement('small');
    small.textContent = change && change !== '—' ? `${change} this week` : 'No change this week';
    const deltaClass = change ? dataUiDeltaClass(change, rank) : 'neutral';
    small.className = `rhythiax-rank-history-delta-${deltaClass} ${deltaClass}`;
    card.append(labelSpan, strong, small);
    weekly.appendChild(card);
  });
  wrap.appendChild(weekly);

  const historyRow = document.createElement('div');
  historyRow.className = 'rhythiax-history-row';

  const historyInner = document.createElement('div');
  historyInner.className = 'rhythiax-history-row-inner';

  // Table header bar with title and horizon selector
  const tableHeaderBar = document.createElement('div');
  tableHeaderBar.className = 'rhythiax-history-header';

  const tableHeaderLeft = document.createElement('div');
  tableHeaderLeft.className = 'rhythiax-history-header-left';
  const cloudWarning = couldNotReachCloud
    ? `<span class="rhythiax-cloud-badge rhythiax-cloud-error" style="display: inline-flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 500; color: var(--rhythiax-accent-danger, #f87171); margin-left: 8px;" title="Showing this device’s history">
         <svg style="width: 12px; height: 12px; stroke: currentColor; fill: none; stroke-width: 2;" viewBox="0 0 24 24"><path d="m2 2 20 20"/><path d="M16.72 11.06A5 5 0 0 0 6.54 13"/><path d="M5.66 17.66A7 7 0 0 1 9 5c2.3 0 4.3 1.1 5.5 2.8"/></svg>
         Couldn't reach cloud
       </span>`
    : '';
  tableHeaderLeft.innerHTML = `
    <div class="rhythiax-history-title-group">
      <span class="rhythiax-history-title">Rank history</span>
      ${cloudWarning}${historyRecentOnlyBadge(recentOnly)}
    </div>
  `;

  tableHeaderBar.append(tableHeaderLeft);
  historyInner.appendChild(tableHeaderBar);
  historyRow.appendChild(historyInner);
  wrap.appendChild(historyRow);
  // The same list as Progress history: ranks by their value with the places won or lost under them, RP by what
  // it changed; the bar is the places climbed.
  const list = mountPeriodList(history, tableHeaderBar, historyInner, {
    name: 'Rank history', viewKey: 'rhythiax_classic_rank_view', tableClass: 'rhythiax-rank-history-table',
    metrics: [{ key: 'globalRank', label: 'Global Rank', mode: 'value' }, { key: 'countryRank', label: 'Country Rank', mode: 'value' }, { key: 'rhythmPoints', label: 'Rhythm Points', mode: 'change' }],
    valueOf: (pt, key) => pt?.metrics?.[key],
    bar: { key: 'globalRank', gain: p => Number(p.before?.metrics?.globalRank) - Number(p.end?.metrics?.globalRank) },
    quietKeys: ['globalRank', 'countryRank', 'rhythmPoints'], quietText: 'No change', empty: 'Rank history starts after the first recorded day.',
  });
  container._rhythiaxHistoryRerender = () => list.render();
  wrap._rhythiaxHistoryRerender = () => list.render();
  container.setAttribute('data-rhythiax-history-type', 'rank');
  wrap.setAttribute('data-rhythiax-history-type', 'rank');

  container.replaceChildren(wrap);
}

const PROGRESS_METRIC_CONFIG = [
  { key: 'weightedRp', label: 'Rhythm Points' },
  { key: 'avgAccuracy', label: 'AVG Accuracy' },
  { key: 'playCount', label: 'Play Count' },
  { key: 'squaresHit', label: 'Squares Hit' },
  { key: 'mapsPerWeek', label: 'Maps / Week' },
];

function renderProgressHistoryTable(container, history, couldNotReachCloud = false, recentOnly = false) {
  const metricsGrid = container.closest?.('.rhythiax-pane-stats')?.querySelector('.rhythiax-reimagined-metrics-grid');
  if (RhythiaX.getStatsVariant?.() === 'variant_b' && RhythiaX.HistoryView) {
    RhythiaX.HistoryView.render(container, { kind: 'progress', history, grid: metricsGrid, couldNotReachCloud, recentOnly });
    return;
  }
  RhythiaX.HistoryView?.clearCards(metricsGrid);
  container.dataset.rhythiaxHistoryVariant = 'variant_a';
  const wrap = document.createElement('div');
  wrap.className = 'rhythiax-inline-progress-history';

  // 1. Update top metric cards with weekly deltas if they are present in the DOM
  const latest = history[0];
  const previousWeek = latest ? (
    history.find(point => point.date === dataUiDateMinusDays(latest.date, 7)) ||
    history.find(point => point.date <= dataUiDateMinusDays(latest.date, 5) && point.date >= dataUiDateMinusDays(latest.date, 9)) ||
    (history.length > 1 ? history[history.length - 1] : null)
  ) : null;

  PROGRESS_METRIC_CONFIG.forEach(m => {
    const card = document.querySelector(`.rhythiax-reimagined-metric-card[data-history-key="${m.key}"]`);
    if (card) {
      let currentVal = latest?.metrics?.[m.key];
      if (m.key === 'weightedRp' && (!currentVal || Number(currentVal) === 0)) {
        currentVal = latest?.metrics?.rhythmPoints ?? currentVal;
      }
      let prevVal = previousWeek?.metrics?.[m.key];
      if (m.key === 'weightedRp' && (!prevVal || Number(prevVal) === 0)) {
        prevVal = previousWeek?.metrics?.rhythmPoints ?? prevVal;
      }
      const change = dataUiMetricDelta(m.key, currentVal, prevVal);
      const valElem = card.querySelector('.rhythiax-reimagined-metric-value');
      if (valElem) {
        if (currentVal !== null && currentVal !== undefined) {
          const txt = (valElem.firstChild?.nodeType === 3 ? valElem.firstChild.nodeValue : valElem.textContent).trim();
          if (txt === '—' || m.key === 'mapsPerWeek') {
            const formatted = dataUiFormatValue(m.key, currentVal);
            const delta = valElem.querySelector('.rhythiax-profile-history-delta');
            if (valElem.firstChild && valElem.firstChild.nodeType === 3) {
              valElem.firstChild.nodeValue = formatted + (delta ? ' ' : '');
            } else if (!delta) {
              valElem.textContent = formatted;
            }
          }
        }
        if (change !== null) {
          dataUiAppendDelta(valElem, change, false);
        } else {
          valElem.querySelectorAll('.rhythiax-profile-history-delta').forEach(el => el.remove());
        }
      }
    }
  });

  const historyRow = document.createElement('div');
  historyRow.className = 'rhythiax-history-row rhythiax-progress-history-row';

  const historyInner = document.createElement('div');
  historyInner.className = 'rhythiax-history-row-inner';

  // Table header bar with title and horizon selector
  const tableHeaderBar = document.createElement('div');
  tableHeaderBar.className = 'rhythiax-history-header';

  const tableHeaderLeft = document.createElement('div');
  tableHeaderLeft.className = 'rhythiax-history-header-left';
  const cloudWarning = couldNotReachCloud
    ? `<span class="rhythiax-cloud-badge rhythiax-cloud-error" style="display: inline-flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 500; color: var(--rhythiax-accent-danger, #f87171); margin-left: 8px;" title="Showing this device’s history">
         <svg style="width: 12px; height: 12px; stroke: currentColor; fill: none; stroke-width: 2;" viewBox="0 0 24 24"><path d="m2 2 20 20"/><path d="M16.72 11.06A5 5 0 0 0 6.54 13"/><path d="M5.66 17.66A7 7 0 0 1 9 5c2.3 0 4.3 1.1 5.5 2.8"/></svg>
         Couldn't reach cloud
       </span>`
    : '';
  tableHeaderLeft.innerHTML = `
    <div class="rhythiax-history-title-group">
      <span class="rhythiax-history-title">Progress history</span>
      ${cloudWarning}${historyRecentOnlyBadge(recentOnly)}
    </div>
  `;

  tableHeaderBar.append(tableHeaderLeft);
  historyInner.appendChild(tableHeaderBar);
  historyRow.appendChild(historyInner);
  wrap.appendChild(historyRow);
  const rpOf = point => {
    const v = point?.metrics?.weightedRp;
    return v === null || v === undefined || Number(v) === 0 ? (point?.metrics?.rhythmPoints ?? v) : v;
  };
  const list = mountPeriodList(history, tableHeaderBar, historyInner, {
    name: 'Progress history', viewKey: 'rhythiax_classic_progress_view', tableClass: 'rhythiax-progress-history-table',
    metrics: PROGRESS_METRIC_CONFIG.map(m => ({ ...m, mode: m.key === 'avgAccuracy' ? 'value' : m.key === 'mapsPerWeek' ? 'plain' : 'change' })),
    valueOf: (pt, key) => (key === 'weightedRp' ? rpOf(pt) : pt?.metrics?.[key]),
    bar: { key: 'weightedRp', gain: p => Number(rpOf(p.end)) - Number(rpOf(p.before)) },
    quietKeys: ['playCount', 'weightedRp'], quietText: 'No plays', empty: 'Progress history starts after the first recorded activity.',
  });
  container._rhythiaxHistoryRerender = () => list.render();
  wrap._rhythiaxHistoryRerender = () => list.render();
  container.setAttribute('data-rhythiax-history-type', 'progress');
  wrap.setAttribute('data-rhythiax-history-type', 'progress');

  container.replaceChildren(wrap);
}

// What differs between the two history panes: the marker, the table, the open class and the words.
const INLINE_HISTORY_KINDS = {
  rank: { render: renderRankHistoryTable, open: false, noun: 'ranking', failure: 'VPS history fetch failed, using local fallback:' },
  progress: { render: renderProgressHistoryTable, open: true, noun: 'progress', failure: 'VPS progress history fetch failed, using local fallback:' }
};

// This device: what online history adds, under the pane. With nothing to show, a line and a button; under
// history from this browser, one quiet line, left out after Don't show again on the online card
// (shared/community-consent.js). The button is that card's Turn on (Both, without visit reports).
const ONLINE_ICON = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/></svg>';
async function appendOnlineOffer(container, empty) {
  const consent = RhythiaX.CommunityConsentNotice;
  if (!consent?.turnOn || container.isConnected === false) return;
  if (!empty && await consent.offerHidden?.()) return;
  container.querySelector(':scope > .rhythiax-online-offer')?.remove();
  const box = document.createElement('div');
  box.className = empty ? 'rhythiax-online-offer' : 'rhythiax-online-offer quiet';
  const text = document.createElement('span');
  text.textContent = empty
    ? 'Online history fills this with the daily history kept for the top 5,000 players.'
    : 'History from this browser only.';
  const button = document.createElement('button');
  button.type = 'button';
  button.title = 'Turns it on everywhere. Only public player and map IDs, Reimagined Search filters and a random number for this copy of Reimagined go to Reimagined’s history service. More in the privacy policy.';
  button.innerHTML = `${ONLINE_ICON}<span>${empty ? 'Turn on online history' : 'Use online history'}</span>`;
  button.addEventListener('click', async event => {
    button.disabled = true;
    if (!(await consent.turnOn(event))) { button.disabled = false; button.lastChild.textContent = 'Not turned on. Try again'; }
  });
  box.append(text, button);
  container.appendChild(box);
}

async function renderInlineHistory(container, playerId, kind, options = {}) {
  const pane = INLINE_HISTORY_KINDS[kind];
  container.setAttribute('data-rhythiax-history-rendered', kind);
  if (!container) return;
  const navigationToken = RhythiaX.navigationToken;
  const revision = RhythiaX.VpsHistoryCache.revision();

  const id = playerId || window.location.pathname.match(/\/player\/([^/]+)/)?.[1];
  if (!id) {
    container.innerHTML = '<div class="rhythiax-rank-history-empty" style="padding: 24px; text-align: center; color: var(--rhythiax-text-muted, #a1a1aa);">Player ID not found.</div>';
    return;
  }

  if (pane.open) container.classList.add('open');

  // 0. Resolve sync mode
  const settings = typeof RhythiaX.getDataSettings === 'function'
    ? await RhythiaX.getDataSettings().catch(() => null)
    : null;
  const syncMode = settings?.syncMode || 'hybrid';

  // 1. Auto-Discovery: Report profile visit to VPS in background (only if not local-only).
  // A redraw after a settings change is not a visit.
  if (!options?.redraw && syncMode !== 'local-only' && typeof RhythiaX.reportVpsPlayerVisit === 'function') {
    RhythiaX.reportVpsPlayerVisit(id);
  }

  // 2. Fast Path: Render local data immediately if available (0ms delay) - unless cloud-only
  const localRecord = syncMode === 'cloud-only' ? null : await RhythiaX.getDataRecord(id);
  if (!dataUiProfileIsCurrent(id, navigationToken, revision) || container.isConnected === false) return;
  const localHistory = buildMergedRankHistory(null, localRecord);

  let hasRendered = false;
  if (localHistory.length > 0) {
    pane.render(container, localHistory);
    hasRendered = true;
  } else {
    container.innerHTML = `<div class="rhythiax-rank-history-loading" style="padding: 24px; text-align: center; color: var(--rhythiax-text-muted, #a1a1aa);">Loading ${pane.noun} history...</div>`;
  }

  // If local-only mode, stop here without querying VPS!
  if (syncMode === 'local-only') {
    if (!hasRendered) {
      container.innerHTML = `<div class="rhythiax-rank-history-empty" style="padding: 32px 16px 16px; text-align: center; color: var(--rhythiax-text-muted, #a1a1aa); font-size: 13px;">No ${pane.noun} history on this device yet.</div>`;
    }
    await appendOnlineOffer(container, !hasRendered);
    return;
  }

  // 3. Background Path: Fetch authoritative cloud history from VPS
  try {
    const vpsData = await getCachedVpsHistory(id);
    if (!dataUiProfileIsCurrent(id, navigationToken, revision) || container.isConnected === false) return;

    if (vpsData && Array.isArray(vpsData.history) && vpsData.history.length > 0) {
      const mergedHistory = buildMergedRankHistory(vpsData.history, syncMode === 'cloud-only' ? null : localRecord);
      if (mergedHistory.length > 0) {
        pane.render(container, mergedHistory, false, vpsData.recentOnly === true);
        return;
      }
    } else if (hasRendered) {
      pane.render(container, localHistory, true);
    }
  } catch (err) {
    if (typeof RhythiaX.log === 'function') {
      RhythiaX.log(pane.failure, err.message);
    }
    if (hasRendered) {
      pane.render(container, localHistory, true);
    }
  }

  // 4. Fallback empty state if neither local nor VPS had records
  if (!hasRendered) {
    container.innerHTML = `<div class="rhythiax-rank-history-empty" style="padding: 32px 16px; text-align: center; color: var(--rhythiax-text-muted, #a1a1aa); font-size: 13px;">No ${pane.noun} history yet.</div>`;
  }
}

RhythiaX.renderInlineRankHistory = function (container, playerId, options = {}) {
  return renderInlineHistory(container, playerId, 'rank', options);
};

RhythiaX.renderInlineProgressHistory = function (container, playerId, options = {}) {
  return renderInlineHistory(container, playerId, 'progress', options);
};

RhythiaX.updateAllHistoryTables = function () {
  // A changed Statistics variant draws the open panes again from their data.
  const variant = RhythiaX.getStatsVariant?.() || 'variant_a';
  const playerId = window.location.pathname.match(/^\/player\/(\d+)/)?.[1];
  if (playerId && !RhythiaX.exodusShowing?.()) {
    document.querySelectorAll('.rhythiax-pane-ranking, .rhythiax-pane-stats .rhythiax-history-pane').forEach(pane => {
      const drawn = pane.dataset.rhythiaxHistoryVariant;
      if (!drawn || drawn === variant) return;
      pane.dataset.rhythiaxHistoryVariant = variant;
      const render = pane.classList.contains('rhythiax-pane-ranking') ? RhythiaX.renderInlineRankHistory : RhythiaX.renderInlineProgressHistory;
      Promise.resolve(render?.(pane, playerId)).catch(() => {});
    });
    if ([...document.querySelectorAll('.rhythiax-playstyle-deck')].some(deck => deck.dataset.rhythiaxStatsVariant !== variant)) {
      RhythiaX.PlaystyleView?.reRender?.();
    }
  }

  const rerendered = new Set();
  document.querySelectorAll('[data-rhythiax-history-type], .rhythiax-inline-rank-history, .rhythiax-inline-progress-history, .rhythiax-history-row').forEach(el => {
    if (typeof el._rhythiaxHistoryRerender === 'function' && !rerendered.has(el._rhythiaxHistoryRerender)) {
      rerendered.add(el._rhythiaxHistoryRerender);
      try {
        el._rhythiaxHistoryRerender();
      } catch (err) {
        if (typeof RhythiaX.log === 'function') {
          RhythiaX.log('Failed to rerender history table:', err);
        }
      }
    }
  });
};

// A changed date format or Statistics layout reaches updateAllHistoryTables through
// applyLiveUpdates in modules.js, the one listener for module options.
