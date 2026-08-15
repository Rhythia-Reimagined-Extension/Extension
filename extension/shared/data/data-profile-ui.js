// =============================================
// Rhythia X - Profile UI backed by canonical data
// =============================================

var RhythiaX = RhythiaX || {};

function dataUiSnapshot(snapshot) {
  if (!snapshot) return null;
  return snapshot.metrics ? { ...snapshot, ...snapshot.metrics } : { ...snapshot };
}

function dataUiMetricKey(key) {
  return key;
}

function dataUiMetricDelta(key, current, previous) {
  if (current === null || current === undefined || previous === null || previous === undefined) return null;
  const left = Number(current);
  const right = Number(previous);
  if (!Number.isFinite(left) || !Number.isFinite(right)) return null;
  const delta = left - right;
  if (!delta) return '=';
  if (key === 'avgAccuracy') return `${delta > 0 ? '+' : ''}${delta.toFixed(2)}%`;
  if (key === 'mapsPerWeek') return `${delta > 0 ? '+' : ''}${delta.toFixed(1)}`;
  return `${delta > 0 ? '+' : ''}${RhythiaX.formatNumber(delta)}`;
}

function dataUiDeltaClass(delta, rank) {
  if (!delta || delta === '=') return 'neutral';
  const positive = delta[0] === '+';
  return rank ? (positive ? 'negative' : 'positive') : (positive ? 'positive' : 'negative');
}

function dataUiAppendDelta(valueElement, delta, rank = false, edited = false) {
  valueElement.querySelectorAll('.rhythiax-profile-history-delta').forEach(item => item.remove());
  if (delta === null) return;
  const element = document.createElement('small');
  element.className = `rhythiax-profile-history-delta ${dataUiDeltaClass(delta, rank)}`;
  element.textContent = delta;
  if (edited) element.title = 'This value was edited locally';
  valueElement.appendChild(element);
}

function dataUiProfileCard(label) {
  const labelElement = Array.from(document.querySelectorAll('div, span')).find(element => (
    element.textContent.trim().toLowerCase() === label.toLowerCase()
  ));
  return labelElement?.closest('div.min-w-0') || labelElement?.parentElement;
}

function dataUiCurrent(record, livePoint) {
  return dataUiSnapshot(livePoint) || dataUiSnapshot(record?.history?.openDay?.captures?.slice(-1)[0]);
}

function dataUiApplyCard(card, current, reference, key, rank) {
  if (!card || !Object.prototype.hasOwnProperty.call(current || {}, key)) return;
  const valueElement = card.querySelector('button, .text-base, .text-xl, div:last-child');
  if (!valueElement) return;
  const valueContainer = valueElement.closest('.text-base, .text-xl') || valueElement;
  dataUiAppendDelta(valueContainer, dataUiMetricDelta(key, current[key], reference?.[key]), rank);
}

RhythiaX.applyProfileHistoryIndicators = async function (playerId, livePoint) {
  if (!playerId) return;
  const [record, settings] = await Promise.all([
    RhythiaX.getDataRecord(playerId),
    RhythiaX.getDataSettings(),
  ]);
  const current = dataUiCurrent(record, livePoint);
  if (!current) return;
  const rankingReference = dataUiSnapshot(RhythiaX.getDataReferenceSnapshot(record, settings.inlineRankingReference, current));
  document.querySelectorAll('[data-history-key]').forEach(row => {
    const key = dataUiMetricKey(row.dataset.historyKey);
    const valueElement = row.querySelector('.rhythiax-official-stat-value, .rhythiax-stat-value');
    if (!valueElement || !Object.prototype.hasOwnProperty.call(current, key)) return;
    const statsReference = dataUiSnapshot(RhythiaX.getDataReferenceSnapshot(record, settings.inlineStatsReference, current, key));
    dataUiAppendDelta(valueElement, dataUiMetricDelta(key, current[key], statsReference?.[key]), false);
  });
  [['Global', 'globalRank', true], ['Country', 'countryRank', true], ['Rhythm Points', 'rhythmPoints', false]].forEach(([label, key, rank]) => {
    dataUiApplyCard(dataUiProfileCard(label), current, rankingReference, key, rank);
  });
};

RhythiaX.refreshOpenStatHistories = async function () {
  const openRows = [...document.querySelectorAll('[data-history-key]')]
    .filter(row => row.nextElementSibling?.classList.contains('rhythiax-history-row'))
    .map(row => ({ row, key: row.dataset.historyKey }));
  openRows.forEach(({ row }) => row.nextElementSibling?.remove());
  await Promise.all(openRows.map(({ row, key }) => RhythiaX.showStatHistory(row, key)));
};

function dataUiHistoryPoints(record, displayMode = 'latestOpenAndClosed') {
  const captures = record?.history?.openDay?.captures || [];
  const open = displayMode === 'firstSnapshotAndClosed'
    ? captures.slice(0, 1)
    : displayMode === 'allSnapshots'
      ? captures.slice().reverse()
      : captures.slice(-1);
  const daily = Object.values(record?.history?.daily || {})
    .sort((left, right) => String(right.date).localeCompare(String(left.date)));
  if (displayMode === 'closedOnly') return daily;
  return [...open.map(point => ({ ...point, kind: 'open' })), ...daily].filter(Boolean);
}

function dataUiFormatValue(key, value) {
  if (value === null || value === undefined || value === '') return '—';
  const number = Number(value);
  if (!Number.isFinite(number)) return String(value);
  if (key === 'avgAccuracy') return `${number.toFixed(2)}%`;
  if (key === 'mapsPerWeek') return number.toFixed(1);
  if (key === 'globalRank' || key === 'countryRank') return `#${RhythiaX.formatNumber(number)}`;
  return RhythiaX.formatNumber(number);
}

function dataUiHistoryPeriod(dateText, grouping) {
  if (grouping === 'daily') return dateText;
  const match = String(dateText || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return dateText;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  if (grouping === 'monthly') return `${match[1]}-${match[2]}`;
  const day = date.getDay();
  date.setDate(date.getDate() - (day === 0 ? 6 : day - 1));
  return RhythiaX.localDateKey(date);
}

function dataUiGroupHistory(points, grouping) {
  const open = points.filter(point => point.kind === 'open');
  const daily = points.filter(point => point.kind !== 'open');
  if (grouping === 'daily') return [...open, ...daily].filter(Boolean);
  const groups = new Map();
  daily.forEach(point => {
    const period = dataUiHistoryPeriod(point.date, grouping);
    if (!groups.has(period)) groups.set(period, point);
  });
  return [...open, ...groups.values()].filter(Boolean);
}

RhythiaX.showStatHistory = async function (row, historyKey) {
  const playerId = window.location.pathname.match(/\/player\/([^/]+)/)?.[1];
  if (!playerId || !row || !historyKey) return;
  const existing = row.nextElementSibling;
  if (existing?.classList.contains('rhythiax-history-row')) {
    existing.classList.remove('rhythiax-history-row-open');
    existing.classList.add('rhythiax-history-row-closing');
    const removeAfterCollapse = event => {
      if (event.target !== existing || event.propertyName !== 'max-height') return;
      existing.removeEventListener('transitionend', removeAfterCollapse);
      existing.remove();
    };
    existing.addEventListener('transitionend', removeAfterCollapse);
    return;
  }
  const [record, settings] = await Promise.all([
    RhythiaX.getDataRecord(playerId),
    RhythiaX.getDataSettings(),
  ]);
  const key = dataUiMetricKey(historyKey);
  const points = dataUiGroupHistory(dataUiHistoryPoints(record, settings.historyDisplayMode), settings.historyGrouping);
  const historyRow = document.createElement('div');
  historyRow.className = 'rhythiax-history-row';
  const title = document.createElement('div');
  title.className = 'rhythiax-history-title';
  title.textContent = `History · ${settings.historyGrouping}`;
  historyRow.appendChild(title);
  points.forEach((point, index) => {
    const item = document.createElement('div');
    item.className = 'rhythiax-history-item';
    const date = document.createElement('span');
    date.className = 'rhythiax-history-date';
    date.textContent = `${point.date || '—'} · ${point.kind === 'open' ? 'open' : 'closed'}`;
    const value = document.createElement('span');
    value.className = 'rhythiax-history-value';
    value.textContent = dataUiFormatValue(key, point.metrics?.[key]);
    const delta = document.createElement('span');
    delta.className = 'rhythiax-history-delta';
    const previous = points[index + 1];
    const change = dataUiMetricDelta(key, point.metrics?.[key], previous?.metrics?.[key]);
    delta.textContent = change || '—';
    delta.classList.add(change === null ? 'rhythiax-history-delta-neutral' : dataUiDeltaClass(change, false));
    item.append(date, value, delta);
    historyRow.appendChild(item);
  });
  if (!points.length) {
    const empty = document.createElement('div');
    empty.className = 'rhythiax-history-item';
    empty.textContent = 'History starts after the first saved profile state.';
    historyRow.appendChild(empty);
  }
  row.after(historyRow);
  historyRow.style.setProperty('--rhythiax-history-height', `${historyRow.scrollHeight + 16}px`);
  requestAnimationFrame(() => historyRow.classList.add('rhythiax-history-row-open'));
};

function dataUiPreviousDate(dateText) {
  const match = String(dateText || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return '';
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  date.setDate(date.getDate() - 1);
  return RhythiaX.localDateKey(date);
}

function dataUiDateMinusDays(dateText, days) {
  let result = dateText;
  for (let index = 0; index < days; index++) result = dataUiPreviousDate(result);
  return result;
}

RhythiaX.showRankHistory = async function () {
  const existing = document.querySelector('.rhythiax-rank-history-overlay');
  if (existing) {
    existing.remove();
    return;
  }
  const playerId = window.location.pathname.match(/\/player\/([^/]+)/)?.[1];
  if (!playerId) return;
  const record = await RhythiaX.getDataRecord(playerId);
  const latestOpen = record?.history?.openDay?.captures?.slice(-1)[0];
  const closedHistory = Object.values(record?.history?.daily || {})
    .sort((left, right) => String(right.date).localeCompare(String(left.date)))
    .map(point => ({ ...point, kind: 'closed' }));
  const history = [
    ...(latestOpen ? [{ ...latestOpen, kind: 'open' }] : []),
    ...closedHistory,
  ];
  const overlay = document.createElement('div');
  overlay.className = 'rhythiax-rank-history-overlay';
  const dialog = document.createElement('section');
  dialog.className = 'rhythiax-rank-history-dialog';
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  const heading = document.createElement('div');
  heading.className = 'rhythiax-rank-history-heading';
  const title = document.createElement('h2');
  title.textContent = 'Ranking history';
  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'rhythiax-rank-history-close';
  close.textContent = '×';
  heading.append(title, close);
  dialog.appendChild(heading);
  const weekly = document.createElement('div');
  weekly.className = 'rhythiax-rank-history-weekly';
  const latest = history[0];
  const previousWeek = latest ? history.find(point => point.date === dataUiDateMinusDays(latest.date, 7)) : null;
  [['Global Rank', 'globalRank', true], ['Country Rank', 'countryRank', true], ['Rhythm Points', 'rhythmPoints', false]].forEach(([label, key, rank]) => {
    const card = document.createElement('div');
    card.className = 'rhythiax-rank-history-weekly-card';
    const current = latest?.metrics?.[key];
    const previous = previousWeek?.metrics?.[key];
    const change = dataUiMetricDelta(key, current, previous);
    card.innerHTML = `<span>Weekly change · ${label}</span><strong>${change || '—'}</strong><small>${change ? `${latest.date} vs ${previousWeek.date}` : 'Not enough history yet'}</small>`;
    weekly.appendChild(card);
  });
  dialog.appendChild(weekly);
  const tableWrap = document.createElement('div');
  tableWrap.className = 'rhythiax-rank-history-table-wrap';
  const table = document.createElement('table');
  table.className = 'rhythiax-rank-history-table';
  table.innerHTML = '<thead><tr><th>Date</th><th>Global Rank</th><th>Country Rank</th><th>Rhythm Points</th></tr></thead><tbody></tbody>';
  const body = table.querySelector('tbody');
  history.forEach((point, index) => {
    const previous = history[index + 1];
    const row = document.createElement('tr');
    if (!index) row.className = 'rhythiax-rank-history-current';
    const date = document.createElement('td');
    date.textContent = `${point.date || '—'} · ${point.kind === 'open' ? 'open' : 'closed'}`;
    row.appendChild(date);
    [['globalRank', true, '#'], ['countryRank', true, '#'], ['rhythmPoints', false, '']].forEach(([key, rank, prefix]) => {
      const cell = document.createElement('td');
      const value = point.metrics?.[key];
      const main = document.createElement('strong');
      main.textContent = value === null || value === undefined ? '—' : `${prefix}${RhythiaX.formatNumber(value)}`;
      const change = document.createElement('small');
      const changeValue = dataUiMetricDelta(key, value, previous?.metrics?.[key]);
      change.textContent = changeValue || '—';
      change.className = `rhythiax-rank-history-delta-${changeValue ? dataUiDeltaClass(changeValue, rank) : 'neutral'}`;
      cell.append(main, change);
      row.appendChild(cell);
    });
    body.appendChild(row);
  });
  tableWrap.appendChild(table);
  dialog.appendChild(tableWrap);
  overlay.appendChild(dialog);
  document.body.appendChild(overlay);
  close.addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', event => { if (event.target === overlay) overlay.remove(); });
};
