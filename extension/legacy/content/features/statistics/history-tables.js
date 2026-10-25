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
    let monLabel = `${pad(mParts[1])}-${pad(mParts[2])}`;
    let sunLabel = `${pad(sParts[1])}-${pad(sParts[2])}`;
    if (format === 'dd-mm-yyyy' || format === 'dd/mm/yyyy') {
      monLabel = `${pad(mParts[2])}-${pad(mParts[1])}`;
      sunLabel = `${pad(sParts[2])}-${pad(sParts[1])}`;
    } else {
      monLabel = `${pad(mParts[1])}-${pad(mParts[2])}`;
      sunLabel = `${pad(sParts[1])}-${pad(sParts[2])}`;
    }
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
    if (format === 'dd-mm-yyyy' || format === 'dd/mm/yyyy') {
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
const HISTORY_RECENT_ONLY_NOTE = 'Only the last 3 days are available without an installation key';
function historyRecentOnlyBadge(recentOnly) {
  return recentOnly
    ? `<span class="rhythiax-cloud-badge" style="display: inline-flex; align-items: center; font-size: 11px; font-weight: 500; color: var(--rhythiax-text-muted, #a1a1aa); margin-left: 8px;" title="${HISTORY_RECENT_ONLY_NOTE}">${HISTORY_RECENT_ONLY_LABEL}</span>`
    : '';
}

function renderRankHistoryTable(container, history, isCloudSynced = false, couldNotReachCloud = false, settings = null, recentOnly = false) {
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

  let currentHorizon = settings?.historyGrouping === 'daily'
    ? (history.length > 7 ? '30d' : '7d')
    : 'weekly';

  const horizonGroup = document.createElement('div');
  horizonGroup.className = 'rhythiax-history-horizon-group';
  horizonGroup.setAttribute('role', 'group');
  horizonGroup.setAttribute('aria-label', 'Ranking history time horizon');
  horizonGroup.innerHTML = `
    <button type="button" class="rhythiax-history-horizon-btn ${currentHorizon === '7d' ? 'active' : ''}" data-horizon="7d">7 Days</button>
    <button type="button" class="rhythiax-history-horizon-btn ${currentHorizon === '30d' ? 'active' : ''}" data-horizon="30d">30 Days</button>
    <button type="button" class="rhythiax-history-horizon-btn ${currentHorizon === 'weekly' ? 'active' : ''}" data-horizon="weekly">Weekly</button>
  `;
  tableHeaderBar.append(tableHeaderLeft, horizonGroup);
  historyInner.appendChild(tableHeaderBar);

  const tableWrap = document.createElement('div');
  tableWrap.className = 'rhythiax-history-table-wrap rhythiax-rank-history-table-wrap';
  const table = document.createElement('table');
  table.className = 'rhythiax-history-table rhythiax-rank-history-table';
  tableWrap.appendChild(table);
  historyInner.appendChild(tableWrap);

  historyRow.appendChild(historyInner);
  wrap.appendChild(historyRow);

  function renderRankRows() {
    if (currentHorizon === 'weekly') {
      tableWrap.classList.toggle('rhythiax-history-scroll-container', history.length > 14);
      table.innerHTML = `<thead><tr><th scope="col">Week</th><th scope="col" class="rhythiax-tar">Global Rank</th><th scope="col" class="rhythiax-tar">Country Rank</th><th scope="col" class="rhythiax-tar">Rhythm Points</th></tr></thead><tbody></tbody>`;
      const body = table.querySelector('tbody');

      const weeks = dataUiGroupPointsByWeek(history);
      weeks.forEach((week, wIdx) => {
        const latestPt = week.points[0];
        const oldestPt = week.points[week.points.length - 1];
        const nextWeek = weeks[wIdx + 1];
        const baselinePt = nextWeek ? nextWeek.points[0] : oldestPt;

        const weekTr = document.createElement('tr');
        weekTr.className = `rhythiax-history-week-header-row ${wIdx === 0 ? 'is-open' : ''}`;

        const dateTd = document.createElement('td');
        dateTd.innerHTML = `
          <svg class="rhythiax-history-week-chevron" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>
          <span class="rhythiax-history-date">${RhythiaX.escapeHtml(week.label)}</span>
          <span class="rhythiax-history-week-count-badge">${week.points.length} ${week.points.length === 1 ? 'day' : 'days'}</span>
        `;
        weekTr.appendChild(dateTd);

        [['globalRank', true, '#'], ['countryRank', true, '#'], ['rhythmPoints', false, '']].forEach(([key, rank, prefix]) => {
          const cell = document.createElement('td');
          cell.className = 'rhythiax-tar';
          const endVal = latestPt.metrics?.[key];
          const change = dataUiMetricDelta(key, endVal, baselinePt?.metrics?.[key]);
          const deltaClass = change ? dataUiDeltaClass(change, rank) : 'neutral';
          const formattedVal = endVal === null || endVal === undefined ? '—' : `${prefix}${RhythiaX.formatNumber(endVal)}`;
          const formattedDelta = change || '—';

          const content = document.createElement('span');
          content.className = 'rhythiax-cell-content';
          const main = document.createElement('strong');
          main.className = 'rhythiax-metric-cell-val';
          main.textContent = formattedVal;
          const small = document.createElement('small');
          small.textContent = formattedDelta;
          small.className = `rhythiax-history-delta rhythiax-history-delta-${deltaClass} rhythiax-rank-history-delta-${deltaClass} ${deltaClass}`;
          content.append(main, small);
          cell.appendChild(content);
          weekTr.appendChild(cell);
        });
        body.appendChild(weekTr);

        const subRows = [];
        week.points.forEach((pt, pIdx) => {
          const prevPt = week.points[pIdx + 1] || nextWeek?.points?.[0];
          const subTr = document.createElement('tr');
          subTr.className = 'rhythiax-history-item rhythiax-history-week-subrow';
          if (wIdx !== 0) subTr.style.display = 'none';

          const subDate = document.createElement('td');
          subDate.innerHTML = `<span class="rhythiax-history-date">${RhythiaX.escapeHtml(formatHistoryDateLabel(pt.date))}</span>`;
          subTr.appendChild(subDate);

          [['globalRank', true, '#'], ['countryRank', true, '#'], ['rhythmPoints', false, '']].forEach(([key, rank, prefix]) => {
            const cell = document.createElement('td');
            cell.className = 'rhythiax-tar';
            const value = pt.metrics?.[key];
            const changeValue = dataUiMetricDelta(key, value, prevPt?.metrics?.[key]);
            const deltaClass = changeValue ? dataUiDeltaClass(changeValue, rank) : 'neutral';
            const formattedVal = value === null || value === undefined ? '—' : `${prefix}${RhythiaX.formatNumber(value)}`;
            const formattedDelta = changeValue || '—';

            const content = document.createElement('span');
            content.className = 'rhythiax-cell-content';
            const main = document.createElement('strong');
            main.className = 'rhythiax-metric-cell-val';
            main.textContent = formattedVal;
            const small = document.createElement('small');
            small.textContent = formattedDelta;
            small.className = `rhythiax-history-delta rhythiax-history-delta-${deltaClass} rhythiax-rank-history-delta-${deltaClass} ${deltaClass}`;
            content.append(main, small);
            cell.appendChild(content);
            subTr.appendChild(cell);
          });

          body.appendChild(subTr);
          subRows.push(subTr);
        });

        weekTr.addEventListener('click', (e) => {
          e.stopPropagation();
          const isOpen = weekTr.classList.toggle('is-open');
          subRows.forEach(sr => sr.style.display = isOpen ? '' : 'none');
        });
      });
      return;
    }

    const limit = currentHorizon === '7d' ? 7 : Math.min(30, history.length);
    const visiblePoints = history.slice(0, limit);

    tableWrap.classList.toggle('rhythiax-history-scroll-container', currentHorizon !== '7d' && history.length > 7);
    table.innerHTML = `<thead><tr><th scope="col">Date</th><th scope="col" class="rhythiax-tar">Global Rank</th><th scope="col" class="rhythiax-tar">Country Rank</th><th scope="col" class="rhythiax-tar">Rhythm Points</th></tr></thead><tbody></tbody>`;
    const body = table.querySelector('tbody');

    visiblePoints.forEach((point, index) => {
      const previous = history[index + 1];
      const row = document.createElement('tr');
      if (!index) row.className = 'rhythiax-rank-history-current';
      const date = document.createElement('td');
      date.innerHTML = `<span class="rhythiax-history-date">${RhythiaX.escapeHtml(formatHistoryDateLabel(point.date))}</span>`;
      row.appendChild(date);
      [['globalRank', true, '#'], ['countryRank', true, '#'], ['rhythmPoints', false, '']].forEach(([key, rank, prefix]) => {
        const cell = document.createElement('td');
        cell.className = 'rhythiax-tar';
        const value = point.metrics?.[key];
        const changeValue = dataUiMetricDelta(key, value, previous?.metrics?.[key]);
        const deltaClass = changeValue ? dataUiDeltaClass(changeValue, rank) : 'neutral';
        const formattedVal = value === null || value === undefined ? '—' : `${prefix}${RhythiaX.formatNumber(value)}`;
        const formattedDelta = changeValue || '—';

        const content = document.createElement('span');
        content.className = 'rhythiax-cell-content';
        const main = document.createElement('strong');
        main.className = 'rhythiax-metric-cell-val';
        main.textContent = formattedVal;
        const small = document.createElement('small');
        small.textContent = formattedDelta;
        small.className = `rhythiax-history-delta rhythiax-history-delta-${deltaClass} rhythiax-rank-history-delta-${deltaClass} ${deltaClass}`;
        content.append(main, small);
        cell.appendChild(content);
        row.appendChild(cell);
      });
      body.appendChild(row);
    });
  }

  renderRankRows();

  horizonGroup.querySelectorAll('.rhythiax-history-horizon-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      currentHorizon = btn.dataset.horizon;
      horizonGroup.querySelectorAll('.rhythiax-history-horizon-btn').forEach(b => {
        b.classList.toggle('active', b === btn);
      });
      renderRankRows();
    });
  });

  container._rhythiaxHistoryRerender = () => renderRankRows();
  wrap._rhythiaxHistoryRerender = () => renderRankRows();
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

function renderProgressHistoryTable(container, history, isCloudSynced = false, couldNotReachCloud = false, settings = null, recentOnly = false) {
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

  let currentHorizon = settings?.historyGrouping === 'daily'
    ? (history.length > 7 ? '30d' : '7d')
    : 'weekly';

  const horizonGroup = document.createElement('div');
  horizonGroup.className = 'rhythiax-history-horizon-group';
  horizonGroup.setAttribute('role', 'group');
  horizonGroup.setAttribute('aria-label', 'Progress history time horizon');
  horizonGroup.innerHTML = `
    <button type="button" class="rhythiax-history-horizon-btn ${currentHorizon === '7d' ? 'active' : ''}" data-horizon="7d">7 Days</button>
    <button type="button" class="rhythiax-history-horizon-btn ${currentHorizon === '30d' ? 'active' : ''}" data-horizon="30d">30 Days</button>
    <button type="button" class="rhythiax-history-horizon-btn ${currentHorizon === 'weekly' ? 'active' : ''}" data-horizon="weekly">Weekly</button>
  `;
  tableHeaderBar.append(tableHeaderLeft, horizonGroup);
  historyInner.appendChild(tableHeaderBar);

  const tableWrap = document.createElement('div');
  tableWrap.className = 'rhythiax-history-table-wrap rhythiax-progress-history-table-wrap';
  const table = document.createElement('table');
  table.className = 'rhythiax-history-table rhythiax-progress-history-table';
  tableWrap.appendChild(table);
  historyInner.appendChild(tableWrap);

  historyRow.appendChild(historyInner);
  wrap.appendChild(historyRow);

  function createProgressDailyRow(point, previousPoint, isSubRow = false) {
    const tr = document.createElement('tr');
    tr.className = isSubRow ? 'rhythiax-history-item rhythiax-history-week-subrow' : 'rhythiax-history-item';

    const formattedDate = point.date ? formatHistoryDateLabel(point.date) : '—';
    let html = `<td><span class="rhythiax-history-date">${RhythiaX.escapeHtml(formattedDate)}</span></td>`;

    PROGRESS_METRIC_CONFIG.forEach(m => {
      const val = point.metrics?.[m.key];
      const prevVal = previousPoint?.metrics?.[m.key];
      const change = dataUiMetricDelta(m.key, val, prevVal);
      const deltaType = change === null ? 'neutral' : dataUiDeltaClass(change, false);
      const formattedVal = dataUiFormatValue(m.key, val);
      const formattedDelta = change || '—';

      html += `<td class="rhythiax-tar rhythiax-col-${m.key}"><span class="rhythiax-cell-content"><strong class="rhythiax-metric-cell-val">${RhythiaX.escapeHtml(formattedVal)}</strong><small class="rhythiax-history-delta rhythiax-history-delta-${deltaType} ${deltaType}">${RhythiaX.escapeHtml(formattedDelta)}</small></span></td>`;
    });

    tr.innerHTML = html;
    return tr;
  }

  function renderProgressRows() {
    if (!history.length) {
      table.innerHTML = `<thead><tr><th scope="col">Date</th>${PROGRESS_METRIC_CONFIG.map(m => `<th scope="col" class="rhythiax-tar">${m.label}</th>`).join('')}</tr></thead><tbody><tr><td colspan="6" class="rhythiax-history-empty">Progress history starts after the first recorded activity.</td></tr></tbody>`;
      tableWrap.classList.remove('rhythiax-history-scroll-container');
      return;
    }

    if (currentHorizon === 'weekly') {
      tableWrap.classList.toggle('rhythiax-history-scroll-container', history.length > 14);
      table.innerHTML = `
        <thead>
          <tr>
            <th scope="col" class="rhythiax-th-date">Week</th>
            ${PROGRESS_METRIC_CONFIG.map(m => `
              <th scope="col" class="rhythiax-tar rhythiax-col-${m.key}">${m.label}</th>
            `).join('')}
          </tr>
        </thead>
        <tbody></tbody>
      `;
      const tbody = table.querySelector('tbody');
      const weeks = dataUiGroupPointsByWeek(history);

      weeks.forEach((week, wIdx) => {
        const latestPt = week.points[0];
        const oldestPt = week.points[week.points.length - 1];
        const nextWeek = weeks[wIdx + 1];
        const baselinePt = nextWeek ? nextWeek.points[0] : oldestPt;

        const weekTr = document.createElement('tr');
        weekTr.className = `rhythiax-history-week-header-row ${wIdx === 0 ? 'is-open' : ''}`;

        let weekHtml = `
          <td>
            <svg class="rhythiax-history-week-chevron" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>
            <span class="rhythiax-history-date">${RhythiaX.escapeHtml(week.label)}</span>
            <span class="rhythiax-history-week-count-badge">${week.points.length} ${week.points.length === 1 ? 'day' : 'days'}</span>
          </td>
        `;

        PROGRESS_METRIC_CONFIG.forEach(m => {
          const endVal = latestPt.metrics?.[m.key];
          const change = dataUiMetricDelta(m.key, endVal, baselinePt?.metrics?.[m.key]);
          const deltaType = change === null ? 'neutral' : dataUiDeltaClass(change, false);
          const formattedVal = dataUiFormatValue(m.key, endVal);
          const formattedDelta = change || '—';

          weekHtml += `<td class="rhythiax-tar rhythiax-col-${m.key}"><span class="rhythiax-cell-content"><strong class="rhythiax-metric-cell-val">${RhythiaX.escapeHtml(formattedVal)}</strong><small class="rhythiax-history-delta rhythiax-history-delta-${deltaType} ${deltaType}">${RhythiaX.escapeHtml(formattedDelta)}</small></span></td>`;
        });

        weekTr.innerHTML = weekHtml;
        tbody.appendChild(weekTr);

        const subRows = [];
        week.points.forEach((pt, pIdx) => {
          const prevPt = week.points[pIdx + 1] || nextWeek?.points?.[0];
          const subTr = createProgressDailyRow(pt, prevPt, true);
          if (wIdx !== 0) subTr.style.display = 'none';
          tbody.appendChild(subTr);
          subRows.push(subTr);
        });

        weekTr.addEventListener('click', (e) => {
          e.stopPropagation();
          const isOpen = weekTr.classList.toggle('is-open');
          subRows.forEach(sr => sr.style.display = isOpen ? '' : 'none');
        });
      });
      return;
    }

    // Daily modes: 7d or 30d
    const limit = currentHorizon === '7d' ? 7 : Math.min(30, history.length);
    const visiblePoints = history.slice(0, limit);

    tableWrap.classList.toggle('rhythiax-history-scroll-container', currentHorizon === '30d' && history.length > 7);
    table.innerHTML = `
      <thead>
        <tr>
          <th scope="col" class="rhythiax-th-date">Date</th>
          ${PROGRESS_METRIC_CONFIG.map(m => `
            <th scope="col" class="rhythiax-tar rhythiax-col-${m.key}">${m.label}</th>
          `).join('')}
        </tr>
      </thead>
      <tbody></tbody>
    `;
    const tbody = table.querySelector('tbody');

    visiblePoints.forEach((point, i) => {
      tbody.appendChild(createProgressDailyRow(point, history[i + 1]));
    });
  }

  renderProgressRows();

  horizonGroup.querySelectorAll('.rhythiax-history-horizon-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      currentHorizon = btn.dataset.horizon;
      horizonGroup.querySelectorAll('.rhythiax-history-horizon-btn').forEach(b => {
        b.classList.toggle('active', b === btn);
      });
      renderProgressRows();
    });
  });

  container._rhythiaxHistoryRerender = () => renderProgressRows();
  wrap._rhythiaxHistoryRerender = () => renderProgressRows();
  container.setAttribute('data-rhythiax-history-type', 'progress');
  wrap.setAttribute('data-rhythiax-history-type', 'progress');

  container.replaceChildren(wrap);
}

// What differs between the two history panes: the marker, the table, the open class and the words.
const INLINE_HISTORY_KINDS = {
  rank: { render: renderRankHistoryTable, open: false, noun: 'ranking', failure: 'VPS history fetch failed, using local fallback:' },
  progress: { render: renderProgressHistoryTable, open: true, noun: 'progress', failure: 'VPS progress history fetch failed, using local fallback:' }
};

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
    pane.render(container, localHistory, false, false, settings);
    hasRendered = true;
  } else {
    container.innerHTML = `<div class="rhythiax-rank-history-loading" style="padding: 24px; text-align: center; color: var(--rhythiax-text-muted, #a1a1aa);">Loading ${pane.noun} history...</div>`;
  }

  // If local-only mode, stop here without querying VPS!
  if (syncMode === 'local-only') {
    if (!hasRendered) {
      container.innerHTML = `<div class="rhythiax-rank-history-empty" style="padding: 32px 16px; text-align: center; color: var(--rhythiax-text-muted, #a1a1aa); font-size: 13px;">No ${pane.noun} history on this device yet.</div>`;
    }
    return;
  }

  // 3. Background Path: Fetch authoritative cloud history from VPS
  try {
    const vpsData = await getCachedVpsHistory(id);
    if (!dataUiProfileIsCurrent(id, navigationToken, revision) || container.isConnected === false) return;

    if (vpsData && Array.isArray(vpsData.history) && vpsData.history.length > 0) {
      const mergedHistory = buildMergedRankHistory(vpsData.history, syncMode === 'cloud-only' ? null : localRecord);
      if (mergedHistory.length > 0) {
        pane.render(container, mergedHistory, true, false, settings, vpsData.recentOnly === true);
        return;
      }
    } else if (hasRendered) {
      pane.render(container, localHistory, false, true, settings);
    }
  } catch (err) {
    if (typeof RhythiaX.log === 'function') {
      RhythiaX.log(pane.failure, err.message);
    }
    if (hasRendered) {
      pane.render(container, localHistory, false, true, settings);
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
