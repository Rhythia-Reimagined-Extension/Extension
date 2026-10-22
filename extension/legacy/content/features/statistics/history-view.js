// Statistics variant B: one value at a time.
// The value row (Progress cards, or the Rankings row built here) shows the change over the chosen range
// and picks what the chart shows. Under the chart, weeks are listed one month at a time.
// Variant A is the older tables in core/data/data-profile-ui.js; the popup's "Statistics variant" picks one.
var RhythiaX = RhythiaX || {};

RhythiaX.HistoryView = (function () {
  'use strict';

  const DAY = 864e5;
  const RANGES = [['7D', 7, '7 days'], ['30D', 30, '30 days'], ['3M', 91, '3 months'], ['All', Infinity, 'all time']];
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const KINDS = {
    progress: {
      title: 'Progress history',
      metrics: [
        { key: 'weightedRp', label: 'Rhythm Points' },
        { key: 'avgAccuracy', label: 'AVG Accuracy' },
        { key: 'playCount', label: 'Play Count' },
        { key: 'squaresHit', label: 'Squares Hit' },
        { key: 'mapsPerWeek', label: 'Maps / Week' },
      ],
    },
    rankings: {
      title: 'Rank history',
      metrics: [
        { key: 'globalRank', label: 'Global Rank' },
        { key: 'countryRank', label: 'Country Rank' },
        { key: 'rhythmPoints', label: 'Rhythm Points' },
      ],
    },
  };

  // Shared by both panes, so switching tabs keeps the range and each tab keeps its value.
  const state = { range: '30D', metric: { progress: 'weightedRp', rankings: 'globalRank' } };

  const isRank = key => key === 'globalRank' || key === 'countryRank';
  const fmtNum = n => (RhythiaX.formatNumber ? RhythiaX.formatNumber(n) : Number(n).toLocaleString('en-US'));
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

  function parseDate(text) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(text || ''));
    return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
  }

  function metricValue(point, key) {
    const metrics = point?.metrics || {};
    let value = metrics[key];
    if (key === 'weightedRp' && (value === null || value === undefined || Number(value) === 0)) value = metrics.rhythmPoints ?? value;
    if (key === 'rhythmPoints' && (value === null || value === undefined)) value = metrics.weightedRp;
    const number = Number(value);
    return value === null || value === undefined || value === '' || !Number.isFinite(number) ? null : number;
  }

  // History (newest first, {date, metrics}) to days with every value filled: a day without a value keeps the last known one.
  function toDays(history, keys) {
    const days = (history || [])
      .map(point => ({ date: point?.date, d: parseDate(point?.date), point }))
      .filter(day => day.d)
      .sort((a, b) => b.d - a.d);
    const last = {};
    for (let i = days.length - 1; i >= 0; i--) {
      const day = days[i];
      day.v = {};
      keys.forEach(key => {
        const value = metricValue(day.point, key);
        if (value !== null) last[key] = value;
        day.v[key] = value ?? last[key] ?? null;
      });
      delete day.point;
    }
    // Days before the first known value take the first known one.
    keys.forEach(key => {
      const first = days.slice().reverse().find(day => day.v[key] !== null)?.v[key] ?? null;
      days.forEach(day => { if (day.v[key] === null) day.v[key] = first; });
    });
    return days;
  }

  const rangeDays = range => (RANGES.find(r => r[0] === range) || RANGES[1])[1];

  // The value a range is measured from: the newest day at least that many days before the latest, or the oldest day.
  function baseFor(days, range) {
    if (!days.length) return null;
    const span = rangeDays(range);
    return days.find(day => (days[0].d - day.d) / DAY >= span - 0.5) || days[days.length - 1];
  }

  function change(key, now, base) {
    if (now === null || now === undefined || base === null || base === undefined) return null;
    const delta = Number(now) - Number(base);
    if (!Number.isFinite(delta)) return null;
    return Math.round(delta * 100) / 100; // RP and accuracy are shown with two decimals
  }

  // 'up' is better: a lower rank number is better.
  function tone(key, delta) {
    if (!delta) return 'neutral';
    const better = isRank(key) ? delta < 0 : delta > 0;
    return better ? 'positive' : 'negative';
  }

  function fmtValue(key, value) {
    if (value === null || value === undefined) return '—';
    if (key === 'avgAccuracy') return `${Number(value).toFixed(2)}%`;
    if (key === 'mapsPerWeek') return Number(value).toFixed(1);
    if (isRank(key)) return `#${fmtNum(value)}`;
    return fmtNum(value);
  }

  function fmtChange(key, delta) {
    if (delta === null || delta === undefined) return '—';
    if (!delta) return '±0';
    if (isRank(key)) return `${delta < 0 ? '▲' : '▼'} ${fmtNum(Math.abs(delta))}`;
    const sign = delta > 0 ? '+' : '−';
    if (key === 'avgAccuracy') return `${sign}${Math.abs(delta).toFixed(2)}%`;
    return `${sign}${fmtNum(Math.abs(delta))}`;
  }

  // Weeks run Monday to Sunday. Each knows its last day, the last day before it and the maps played in it.
  function toWeeks(days) {
    const weeks = [];
    days.forEach(day => {
      const mon = new Date(day.d);
      mon.setDate(mon.getDate() - ((mon.getDay() + 6) % 7));
      let week = weeks[weeks.length - 1];
      if (!week || week.mon.getTime() !== mon.getTime()) weeks.push(week = { mon, end: day, days: 0 });
      week.days++;
    });
    weeks.forEach((week, i) => {
      week.prev = weeks[i + 1]?.end || null;
      week.played = week.prev ? change('playCount', week.end.v.playCount, week.prev.v.playCount) : null;
    });
    return weeks;
  }

  // Months by the month a week ends in, newest first.
  function toMonths(weeks) {
    const months = [];
    weeks.forEach(week => {
      const k = week.end.d.getFullYear() * 12 + week.end.d.getMonth();
      let month = months[months.length - 1];
      if (!month || month.k !== k) months.push(month = { k, d: week.end.d, weeks: [] });
      month.weeks.push(week);
    });
    return months;
  }

  const dayFirst = () => /^dd/.test(String(RhythiaX.getDateFormat?.() || ''));
  const short = d => (dayFirst() ? `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)}` : `${MONTHS[d.getMonth()].slice(0, 3)} ${d.getDate()}`);
  function weekLabel(week) {
    const end = new Date(week.mon);
    end.setDate(end.getDate() + 6);
    const same = end.getMonth() === week.mon.getMonth();
    if (dayFirst()) return same ? `${week.mon.getDate()} – ${short(end)}` : `${short(week.mon)} – ${short(end)}`;
    return same ? `${short(week.mon)} – ${end.getDate()}` : `${short(week.mon)} – ${short(end)}`;
  }

  const ICON_LINE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3v18h18"/><path d="m7 15 4-4 3 3 5-6"/></svg>';

  // ---------- chart ----------
  function drawChart(host, points, key, labelFor) {
    host.replaceChildren();
    if (!points.length) return;
    const svgNs = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNs, 'svg');
    svg.setAttribute('role', 'img');
    const tip = document.createElement('div');
    tip.className = 'rhythiax-hv2-tip';
    host.append(svg, tip);
    const flip = isRank(key);

    const draw = () => {
      const W = host.clientWidth;
      if (!W) return;
      const H = 200, padL = 56, padR = 8, padT = 8, padB = 22;
      const values = points.map(p => p.value).filter(v => v !== null);
      if (!values.length) return;
      let lo = Math.min(...values), hi = Math.max(...values);
      if (key === 'mapsPerWeek') lo = 0;
      if (hi === lo) { hi += key === 'avgAccuracy' ? 0.05 : 1; if (key !== 'mapsPerWeek') lo -= key === 'avgAccuracy' ? 0.05 : 1; }
      const pad = (hi - lo) * 0.1;
      hi += pad;
      if (key !== 'mapsPerWeek') lo -= pad;
      if (flip) lo = Math.max(1, lo);
      const x = i => padL + (points.length < 2 ? (W - padL - padR) / 2 : i * (W - padL - padR) / (points.length - 1));
      const y = v => padT + (flip ? (v - lo) / (hi - lo) : 1 - (v - lo) / (hi - lo)) * (H - padT - padB);
      const raw = (hi - lo) / 3, mag = 10 ** Math.floor(Math.log10(raw));
      let step = [1, 2, 2.5, 5, 10].map(s => s * mag).find(s => s >= raw);
      if (flip) step = Math.max(1, Math.ceil(step));
      const tick = v => {
        if (flip) return `#${fmtNum(Math.round(v))}`;
        if (key === 'avgAccuracy') return `${v.toFixed(step < 0.1 ? 2 : 1)}%`;
        if (v >= 1e6 && step >= 1e5) return `${(v / 1e6).toFixed(1)}M`;
        if (v >= 1e4 && step >= 1e3) return `${(v / 1e3).toFixed(step >= 1e4 ? 0 : 1)}k`;
        return v.toLocaleString('en-US', { maximumFractionDigits: step < 1 ? 1 : 0 });
      };
      let g = '';
      for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) {
        g += `<line class="rhythiax-hv2-grid" x1="${padL}" x2="${W - padR}" y1="${y(v)}" y2="${y(v)}"/><text class="rhythiax-hv2-axis" x="${padL - 8}" y="${y(v) + 4}" text-anchor="end">${esc(tick(v))}</text>`;
      }
      const every = Math.max(1, Math.ceil(points.length / Math.max(2, Math.floor((W - padL) / 72))));
      points.forEach((p, i) => {
        if ((points.length - 1 - i) % every !== 0) return;
        const anchor = points.length > 1 && i === points.length - 1 ? 'end' : points.length > 1 && i === 0 ? 'start' : 'middle';
        g += `<text class="rhythiax-hv2-axis" x="${x(i)}" y="${H - 4}" text-anchor="${anchor}">${esc(labelFor(p, true))}</text>`;
      });
      const line = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.value ?? lo).toFixed(1)}`).join('');
      const id = `rhythiax-hv2-fill-${Math.random().toString(36).slice(2, 8)}`;
      g += `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="rhythiax-hv2-fill-top"/><stop offset="1" class="rhythiax-hv2-fill-bottom"/></linearGradient></defs>`;
      g += `<path d="${line}L${x(points.length - 1)},${H - padB}L${x(0)},${H - padB}Z" fill="url(#${id})"/>`;
      g += `<path class="rhythiax-hv2-line" d="${line}"/>`;
      g += `<line class="rhythiax-hv2-cross" y1="${padT}" y2="${H - padB}" visibility="hidden"/><circle class="rhythiax-hv2-dot" r="4" visibility="hidden"/>`;
      g += `<rect class="rhythiax-hv2-hit" x="${padL}" y="0" width="${Math.max(0, W - padL - padR)}" height="${H}" fill="transparent"/>`;
      svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
      svg.setAttribute('height', String(H));
      svg.innerHTML = g;
      const cross = svg.querySelector('.rhythiax-hv2-cross'), dot = svg.querySelector('.rhythiax-hv2-dot'), hit = svg.querySelector('.rhythiax-hv2-hit');
      hit.addEventListener('pointermove', event => {
        const rect = svg.getBoundingClientRect();
        const i = Math.max(0, Math.min(points.length - 1, Math.round((event.clientX - rect.left - padL) / ((W - padL - padR) / Math.max(1, points.length - 1)))));
        const p = points[i];
        const delta = i ? change(key, p.value, points[i - 1].value) : null;
        cross.setAttribute('x1', x(i)); cross.setAttribute('x2', x(i)); cross.setAttribute('visibility', 'visible');
        dot.setAttribute('cx', x(i)); dot.setAttribute('cy', y(p.value ?? lo)); dot.setAttribute('visibility', 'visible');
        tip.innerHTML = `<span class="rhythiax-hv2-tip-date">${esc(labelFor(p))}</span><strong>${esc(fmtValue(key, p.value))}</strong>${delta !== null && key !== 'mapsPerWeek' ? ` <span class="${tone(key, delta)}">${esc(fmtChange(key, delta))}</span>` : ''}`;
        tip.style.left = `${Math.max(70, Math.min(W - 70, x(i)))}px`;
        tip.style.top = `${y(p.value ?? lo)}px`;
        tip.classList.add('is-visible');
      });
      hit.addEventListener('pointerleave', () => {
        tip.classList.remove('is-visible');
        cross.setAttribute('visibility', 'hidden');
        dot.setAttribute('visibility', 'hidden');
      });
    };
    draw();
    if (typeof ResizeObserver === 'function') {
      let width = host.clientWidth;
      new ResizeObserver(() => { if (host.clientWidth !== width) { width = host.clientWidth; draw(); } }).observe(host);
    }
  }

  // ---------- value row ----------
  function setChange(card, key, days, range) {
    let line = card.querySelector('.rhythiax-metric-change');
    if (!line) {
      line = document.createElement('div');
      line.className = 'rhythiax-metric-change';
      card.appendChild(line);
    }
    const rangeName = (RANGES.find(r => r[0] === range) || RANGES[1])[2];
    if (key === 'mapsPerWeek') {
      line.innerHTML = '<span class="rhythiax-metric-change-per">last 7 days</span>';
      return;
    }
    const base = baseFor(days, range);
    const delta = days.length > 1 ? change(key, days[0].v[key], base?.v[key]) : null;
    // History shorter than the range: say where it starts instead of naming the range.
    const per = base && (days[0].d - base.d) / DAY < rangeDays(range) - 0.5 ? `since ${short(base.d)}` : rangeName;
    line.innerHTML = `<span class="rhythiax-metric-change-value ${tone(key, delta)}">${esc(fmtChange(key, delta))}</span><span class="rhythiax-metric-change-per"> · ${esc(per)}</span>`;
  }

  // Progress cards already show values worked out from scores; history fills the ones still empty and Maps / Week.
  function setCardValue(card, key, value) {
    const valueElement = card.querySelector('.rhythiax-reimagined-metric-value');
    if (!valueElement || value === null || value === undefined) return;
    valueElement.querySelectorAll('.rhythiax-profile-history-delta').forEach(el => el.remove());
    const text = (valueElement.textContent || '').trim();
    if (text === '—' || text === '' || key === 'mapsPerWeek' || card.dataset.hv2Owned === 'true') valueElement.textContent = fmtValue(key, value);
  }

  function buildRankCards(metrics) {
    const grid = document.createElement('div');
    grid.className = 'rhythiax-reimagined-metrics-grid rhythiax-metrics-v2';
    grid.setAttribute('role', 'group');
    grid.setAttribute('aria-label', 'Value shown in the chart');
    metrics.forEach(metric => {
      const card = document.createElement('div');
      card.className = 'rhythiax-reimagined-metric-card rhythiax-history-enabled';
      card.dataset.historyKey = metric.key;
      card.dataset.hv2Owned = 'true';
      card.tabIndex = 0;
      card.setAttribute('role', 'button');
      card.innerHTML = `<div class="rhythiax-reimagined-metric-label">${esc(metric.label)}</div><div class="rhythiax-reimagined-metric-value">—</div>`;
      grid.appendChild(card);
    });
    return grid;
  }

  // Leaves the Progress cards as variant A expects them.
  function clearCards(grid) {
    if (!grid) return;
    grid.classList.remove('rhythiax-metrics-v2');
    grid.querySelectorAll('.rhythiax-metric-change').forEach(el => el.remove());
    grid.querySelectorAll('.rhythiax-reimagined-metric-card').forEach(card => {
      card.classList.remove('active', 'rhythiax-stat-row-open');
      card.removeAttribute('aria-pressed');
      card.setAttribute('aria-expanded', 'false');
    });
  }

  // ---------- pane ----------
  function render(container, { kind, history, grid, couldNotReachCloud = false }) {
    const config = KINDS[kind];
    const keys = Array.from(new Set([...config.metrics.map(m => m.key), 'playCount']));
    const days = toDays(history, keys);
    const weeks = toWeeks(days);
    const months = toMonths(weeks);
    const own = container._rhythiaxHv2 || (container._rhythiaxHv2 = { months: 1 });

    const wrap = document.createElement('div');
    wrap.className = `rhythiax-hv2 rhythiax-inline-${kind === 'rankings' ? 'rank' : 'progress'}-history`;
    wrap.setAttribute('data-rhythiax-history-type', kind === 'rankings' ? 'rank' : 'progress');

    const cards = grid || buildRankCards(config.metrics);
    cards.classList.add('rhythiax-metrics-v2');
    if (!grid) wrap.appendChild(cards);

    const head = document.createElement('div');
    head.className = 'rhythiax-hv2-head';
    const title = document.createElement('div');
    title.className = 'rhythiax-hv2-title';
    const range = document.createElement('div');
    range.className = 'rhythiax-history-horizon-group';
    range.setAttribute('role', 'group');
    range.setAttribute('aria-label', 'Chart range');
    head.append(title, range);

    const chart = document.createElement('div');
    chart.className = 'rhythiax-hv2-chart';
    const list = document.createElement('div');
    list.className = 'rhythiax-hv2-months';
    wrap.append(head, chart, list);

    const metricOf = key => config.metrics.find(m => m.key === key) || config.metrics[0];

    function update() {
      const key = metricOf(state.metric[kind]).key;
      state.metric[kind] = key;

      cards.querySelectorAll('.rhythiax-reimagined-metric-card').forEach(card => {
        const cardKey = card.dataset.historyKey;
        if (!config.metrics.some(m => m.key === cardKey)) return;
        const selected = cardKey === key;
        card.classList.toggle('active', selected);
        card.setAttribute('aria-pressed', selected ? 'true' : 'false');
        card.removeAttribute('aria-expanded');
        if (days.length) {
          setCardValue(card, cardKey, days[0].v[cardKey]);
          setChange(card, cardKey, days, state.range);
        }
      });

      const cloud = couldNotReachCloud ? '<span class="rhythiax-hv2-cloud" title="Couldn\'t reach cloud — using local data">Couldn\'t reach cloud</span>' : '';
      title.innerHTML = `${ICON_LINE}<span>${esc(config.title)}</span><small>${esc(metricOf(key).label)}</small>${cloud}`;
      range.innerHTML = RANGES.map(([name]) => `<button type="button" class="rhythiax-history-horizon-btn${name === state.range ? ' active' : ''}" data-range="${name}" aria-pressed="${name === state.range}">${name}</button>`).join('');

      if (!days.length) {
        chart.replaceChildren();
        list.innerHTML = `<div class="rhythiax-history-empty">${kind === 'rankings' ? 'Rank' : 'Progress'} history starts after the first recorded activity.</div>`;
        return;
      }

      // Days for 7D and 30D, weeks for longer ranges.
      const span = rangeDays(state.range);
      const latest = days[0].d;
      const points = span <= 30
        ? days.filter(day => (latest - day.d) / DAY <= span).reverse().map(day => ({ d: day.d, value: day.v[key] }))
        : weeks.filter(week => (latest - week.end.d) / DAY <= span).reverse().map(week => ({ d: week.end.d, week, value: week.end.v[key] }));
      const labelFor = (p, axis) => (p.week && !axis ? weekLabel(p.week) : short(p.week && axis ? p.week.mon : p.d));
      chart.setAttribute('aria-label', `${metricOf(key).label}, ${state.range}`);
      drawChart(chart, points, key, labelFor);

      const today = new Date();
      const shown = Math.min(own.months, months.length);
      let html = '';
      months.slice(0, shown).forEach(month => {
        const end = month.weeks[0].end;
        const start = month.weeks[month.weeks.length - 1].prev;
        let sum = '';
        if (key === 'mapsPerWeek') {
          const played = start ? change('playCount', end.v.playCount, start.v.playCount) : null;
          if (played !== null) sum = `${fmtNum(played)} ${played === 1 ? 'map' : 'maps'} <span class="rhythiax-hv2-per">played</span>`;
        } else if (start) {
          const delta = change(key, end.v[key], start.v[key]);
          sum = `<span class="${tone(key, delta)}">${esc(fmtChange(key, delta))}</span> <span class="rhythiax-hv2-per">this month</span>`;
        }
        html += `<div class="rhythiax-hv2-month"><div class="rhythiax-hv2-month-head"><span class="rhythiax-hv2-month-name">${MONTHS[month.d.getMonth()]} ${month.d.getFullYear()}</span><span class="rhythiax-hv2-per">${month.weeks.length} ${month.weeks.length === 1 ? 'week' : 'weeks'}</span><span class="rhythiax-hv2-month-sum">${sum}</span></div>`;
        month.weeks.forEach(week => {
          const weekEnd = new Date(week.mon);
          weekEnd.setDate(weekEnd.getDate() + 7);
          const current = weekEnd > today && week === weeks[0];
          const quiet = week.played === 0 && !current;
          const note = week.played === null ? '' : current && !week.played ? 'this week' : quiet ? 'no plays' : `${fmtNum(week.played)} ${week.played === 1 ? 'map' : 'maps'}`;
          const value = key === 'mapsPerWeek' ? (week.played === null ? '—' : fmtNum(week.played)) : fmtValue(key, week.end.v[key]);
          const delta = key === 'mapsPerWeek' || !week.prev ? null : change(key, week.end.v[key], week.prev.v[key]);
          html += `<div class="rhythiax-hv2-week${quiet ? ' is-quiet' : ''}"><span class="rhythiax-hv2-when"><b>${esc(weekLabel(week))}</b>${esc(note)}</span><span class="rhythiax-hv2-value">${esc(value)}</span><span class="rhythiax-hv2-change ${tone(key, delta)}">${delta === null ? '' : esc(fmtChange(key, delta))}</span></div>`;
        });
        html += '</div>';
      });
      const next = months[shown];
      if (next) html += `<button type="button" class="rhythiax-hv2-more" data-more>Show ${MONTHS[next.d.getMonth()]} ${next.d.getFullYear()}</button>`;
      else if (shown > 1) html += `<button type="button" class="rhythiax-hv2-more" data-less>Show only ${MONTHS[months[0].d.getMonth()]}</button>`;
      list.innerHTML = html;
    }

    const select = key => {
      if (!config.metrics.some(m => m.key === key)) return;
      state.metric[kind] = key;
      update();
    };

    range.addEventListener('click', event => {
      const button = event.target.closest('[data-range]');
      if (!button) return;
      event.stopPropagation();
      state.range = button.dataset.range;
      // The other pane follows the range the next time it is drawn.
      document.querySelectorAll('.rhythiax-hv2').forEach(other => other !== wrap && other._rhythiaxHistoryRerender?.());
      update();
    });
    list.addEventListener('click', event => {
      if (event.target.closest('[data-more]')) own.months++;
      else if (event.target.closest('[data-less]')) own.months = 1;
      else return;
      event.stopPropagation();
      update();
    });
    if (!grid) {
      cards.addEventListener('click', event => {
        const card = event.target.closest('.rhythiax-reimagined-metric-card');
        if (card) select(card.dataset.historyKey);
      });
      cards.addEventListener('keydown', event => {
        const card = event.target.closest('.rhythiax-reimagined-metric-card');
        if (card && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); select(card.dataset.historyKey); }
      });
    }

    update();
    wrap._rhythiaxHistoryRerender = update;
    container._rhythiaxHistoryRerender = update;
    container._rhythiaxSelectMetric = select;
    container.setAttribute('data-rhythiax-history-type', kind === 'rankings' ? 'rank' : 'progress');
    container.dataset.rhythiaxHistoryVariant = 'variant_b';
    container.replaceChildren(wrap);
  }

  return { RANGES, KINDS, state, toDays, baseFor, change, tone, fmtValue, fmtChange, toWeeks, toMonths, render, clearCards };
})();
