// ============================================================================
// Reimagined for Rhythia — Scores Hub order, filters, map types and Nearby (Classic)
// ============================================================================
// What the hub's list is put through after its search: the filters (grade, mods, speed, map type, and with
// online history how a play stands against the players ranked near this one), then the order. The controls are
// copies of Rhythia's own: the order is the pill row above Rhythia's map list (the chosen pill has a chevron and
// choosing it again turns the order round), Filters opens a panel like Rhythia's Advanced Filters, and each
// filter is Rhythia's dropdown. Map types and Nearby come from Reimagined's history service, the same rules as
// Exodus (pages/profile-scores.js): map types for the maps the service has read, Nearby for the Top list.

var RhythiaX = RhythiaX || {};

(function () {
  'use strict';

  const esc = value => (RhythiaX.escapeHtml ? RhythiaX.escapeHtml(String(value ?? '')) : String(value ?? '').replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`));
  const fmt = (n, d = 0) => Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
  const num = v => (RhythiaX.parseLocalizedNumber ? RhythiaX.parseLocalizedNumber(v) : Number.parseFloat(String(v ?? '').replace(/[,%]/g, ''))) || 0;

  // A play's mods as the cards name them (score-cards/domain.js), without the speed, which has its own filter.
  const modsOf = s => (RhythiaX.ScoreCardDomain?.parseModsList?.(s) || []).filter(m => !/^\d+(\.\d+)?x$/i.test(m));
  const GRADES = ['SS', 'S', 'A', 'B', 'C', 'D', 'F'];
  // Map types by the names both looks use (shared/game-terms.js).
  const KINDS = Object.entries(RhythiaX.GameTerms.TYPES).map(([k, [name]]) => [k, name]);
  const KIND_NAME = Object.fromEntries(KINDS.slice(0, 4));
  const NEAR_SETS = [['above', 'You beat players above'], ['at', 'Between the two groups'], ['below', 'Players below score higher'], ['none', 'Not compared']];
  const NEAR_HINT = {
    above: 'The RP matches or beats the middle player ranked above.',
    at: 'The RP is between the middle players ranked below and above.',
    below: 'The RP is under what the middle player ranked below got.',
    none: 'Fewer than 5 players on each side played the map.',
  };
  const mapKey = s => s.songId || s.beatmapHash || '';
  const time = s => Date.parse(String(s.date || '').replace(/\s*\(.*\)\s*$/, '')) || 0;

  // The order pills, each with what it shows first and, turned round, last. '' keeps the list's own order.
  const ORDERS = [
    { id: '', label: 'Default', first: 'The list’s own order' },
    { id: 'date', label: 'Date', first: 'Newest first', last: 'Oldest first', by: s => time(s) },
    { id: 'acc', label: 'Accuracy', first: 'Highest accuracy first', last: 'Lowest accuracy first', by: s => num(s.accuracy) },
    { id: 'rp', label: 'RP', first: 'Most RP first', last: 'Least RP first', by: s => num(s.rpEarned) },
    { id: 'stars', label: 'Difficulty', first: 'Hardest first', last: 'Easiest first', by: s => RhythiaX.mapStarRating?.(s) || 0 },
    { id: 'near', label: 'Nearby', first: 'Best against players near this rank first', last: 'Most room to improve first', near: true },
  ];

  /* ── What the hub knows besides the scores: map types and the players ranked near ── */
  // basic: without online history, map types are worked out in this browser (shared/map-kinds-basic.js), approximate.
  // kindsFor: the score sets of this visit (the history choice is read once a visit, kindsMode); kindsTried: maps
  // asked for in this visit that got no answer, and when; kindsBusy: the visit whose request is on its way.
  const Data = { starsFor: null, kinds: new Map(), kindsFor: null, kindsMode: null, kindsTried: new Map(), kindsBusy: null, near: null, nearKey: '', nearState: 'idle', nearFailedAt: 0, offline: false, basic: false };
  const BASIC_TIP = 'Approximate: worked out in this browser from the map file, without online history. Online history tells Techs.';
  // A compare request that failed is asked again on the next draw after this long.
  const NEAR_RETRY_MS = 60 * 1000;
  // A map asked for without an answer (the service has not read it, the file could not be read) is asked for again
  // after this long, so a redraw does not ask for it again at once.
  const TRY_AGAIN_MS = 10 * 60 * 1000;
  const triedLately = key => Date.now() - (Data.kindsTried.get(key) || 0) < TRY_AGAIN_MS;
  // Whether every play of this list has its map type or was asked for without one, so the counts are right.
  const kindsKnown = list => (list || []).every(s => !mapKey(s) || Data.kinds.has(mapKey(s)) || triedLately(mapKey(s)));
  // Map types of these plays: the hub asks for the ones on screen, and for the whole list once a map type is chosen
  // (as Exodus' Scores). Only maps not known yet are asked for, one request at a time (vps-client keeps the answers);
  // the page's signal stops the request, and without online history the reading of map files, once the page is left.
  async function loadKinds(sets, scores, redraw, signal) {
    if (!sets || !RhythiaX.fetchVpsMapKinds || signal?.aborted) return;
    if (Data.kindsFor !== sets) { Data.kindsFor = sets; Data.kindsMode = null; Data.kindsTried.clear(); }
    const todo = () => [...new Set((scores || []).map(mapKey).filter(Boolean))].filter(k => !Data.kinds.has(k) && !triedLately(k));
    if (Data.kindsBusy === sets || (Data.kindsMode && (Data.offline || !todo().length))) return;
    Data.kindsBusy = sets;
    let draw = false;
    try {
      if (!Data.kindsMode) {
        const mode = RhythiaX.getVpsSyncMode ? await RhythiaX.getVpsSyncMode() : 'hybrid';
        // On This device nothing from the service is kept or shown: what came before is dropped, as vps-client does.
        // Map types worked out in this browser take their place when the player turned them on.
        const basic = mode === 'local-only' && (await RhythiaX.basicMapKindsOn?.()) === true;
        if (Data.kindsFor !== sets) return;
        if (mode === 'local-only') { Data.kinds.clear(); Data.near = null; Data.nearKey = ''; Data.nearState = 'idle'; }
        Data.kindsMode = mode || 'hybrid';
        Data.basic = basic;
        Data.offline = mode === 'local-only' && !basic;
        draw = true;
      }
      const keys = Data.offline ? [] : todo();
      if (keys.length) {
        const map = await RhythiaX.fetchVpsMapKinds(keys, signal).catch(() => new Map());
        if (Data.kindsFor !== sets) return;
        for (const [k, v] of map) Data.kinds.set(k, v);
        // A map left unread because the page was left is asked for again; one without an answer, later.
        if (!signal?.aborted) { const at = Date.now(); for (const k of keys) if (!Data.kinds.has(k)) Data.kindsTried.set(k, at); }
        draw = true;
      }
    } catch (_) {
      // The history choice could not be read: nothing is asked for this visit.
      if (Data.kindsFor === sets && !Data.kindsMode) { Data.kindsMode = 'unknown'; Data.offline = true; draw = true; }
    } finally {
      if (Data.kindsBusy === sets) Data.kindsBusy = null;
    }
    if (draw && Data.kindsFor === sets && !signal?.aborted) redraw();
  }
  // What the hub says while the map types a chosen type needs are on their way.
  const kindsNote = st => (st.filters?.kind && Data.kindsBusy && Data.kindsBusy === Data.kindsFor && !Data.offline
    ? (Data.basic ? 'Reading map files for their types…' : 'Asking for map types…') : '');
  // The service's compare answer for this player and mode: each play of the top against the middle players
  // ranked just above and below (online history only, players in the top 5,000).
  const CMP_MODE = { normal: 'lock', spin: 'spin', vr: 'vr' };
  function loadNear(playerId, mode, redraw, signal) {
    const key = `${playerId}:${mode}`;
    const retry = Data.nearState === 'failed' && Date.now() - Data.nearFailedAt > NEAR_RETRY_MS;
    if (!playerId || !RhythiaX.fetchVpsCompare || signal?.aborted || (Data.nearKey === key && !retry)) return;
    Data.nearKey = key; Data.near = null; Data.nearState = 'loading';
    const failed = () => { Data.nearState = 'failed'; Data.nearFailedAt = Date.now(); };
    RhythiaX.fetchVpsCompare(playerId, CMP_MODE[mode] || 'lock', signal).then(body => {
      if (Data.nearKey !== key) return;
      // Left unread because the page was left: asked for again on the next visit.
      if (signal?.aborted) { Data.nearKey = ''; Data.nearState = 'idle'; return; }
      const ok = body?.available && body.band?.above && body.band?.below && Array.isArray(body.scores);
      Data.near = ok ? new Map(body.scores.map(x => [String(x.scoreId), x])) : null;
      // No answer at all (the service busy or out of reach): asked for again a minute later.
      if (!body) { failed(); return; }
      Data.nearState = ok ? 'ready' : 'none';
      if (ok) redraw();
    }, () => { if (Data.nearKey === key) failed(); });
  }
  const kindOf = s => Data.kinds.get(mapKey(s)) || null;
  const nearOf = s => (Data.near ? Data.near.get(String(s.scoreId || s.id || '')) || null : null);
  // The share of the players near the rank this play is ahead of, 0 to 1, or null without a place.
  const share = x => (x?.place && x.of > 1 ? (x.of - x.place) / (x.of - 1) : null);

  /* ── The list ── */
  const TESTS = {
    grade: (s, v) => String(s.grade || '').toUpperCase() === v,
    mod: (s, v) => (v === 'none' ? !modsOf(s).length : modsOf(s).includes(v)),
    speed: (s, v) => RhythiaX.normalizeSpeed(s.speed) === v,
    kind: (s, v) => { const k = kindOf(s); return Boolean(k) && (v === 'quantum' ? k.quantum : k.kind === v); },
    near: (s, v) => (v === 'none' ? !nearOf(s)?.place : nearOf(s)?.level === v),
  };
  const nearOn = st => st.activeTab === 'top' && Data.nearState === 'ready';
  const inUse = (st, k) => Boolean(st.filters?.[k]) && (k !== 'near' || nearOn(st)) && (k !== 'kind' || !Data.offline);
  function filter(list, st, skip) {
    for (const k of Object.keys(TESTS)) if (k !== skip && inUse(st, k)) list = list.filter(s => TESTS[k](s, st.filters[k]));
    return list;
  }
  function order(list, st) {
    const o = ORDERS.find(x => x.id === st.sort);
    if (!o || !o.id || (o.near && !nearOn(st))) return list;
    const dir = st.dir === -1 ? -1 : 1;
    // Plays without players near this rank to stand against come last either way, as in Exodus' Scores.
    if (o.near) return list.slice().sort((a, b) => { const x = share(nearOf(a)), y = share(nearOf(b)); return x == null || y == null ? (x == null) - (y == null) : dir * (y - x); });
    return list.slice().sort((a, b) => dir * (o.by(b) - o.by(a)));
  }
  // The searched list through the filters and the order.
  const apply = (list, st) => order(filter(list, st), st);
  const activeCount = st => Object.keys(TESTS).filter(k => inUse(st, k)).length;

  /* ── Rhythia's controls ── */
  const CHEVRON = (cls = 'h-3.5 w-3.5') => `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevron-down ${cls} transition-transform"><path d="m6 9 6 6 6-6"></path></svg>`;
  const PILL = 'inline-flex items-center gap-1 rounded-lg px-2.5 py-1 transition-colors';
  const PILL_ON = `${PILL} bg-white/10 text-white`;
  const PILL_OFF = `${PILL} text-neutral-500 hover:bg-white/5 hover:text-neutral-200`;
  const TRIGGER = 'flex h-9 w-full items-center justify-between gap-2 rounded-lg border border-line bg-control px-3 py-2 text-sm text-white outline-none transition-colors hover:bg-control-hover focus-visible:border-blue-400/40 focus-visible:ring-2 focus-visible:ring-blue-400/20 disabled:cursor-not-allowed disabled:opacity-50';
  const LISTBOX = 'relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-lg border border-line bg-raised text-white shadow-none';
  const OPTION = 'relative flex w-full cursor-default select-none items-center rounded-md px-2 py-1.5 text-sm outline-none transition-colors hover:bg-white/10 data-[state=checked]:hover:bg-blue-500/10 data-[state=checked]:bg-blue-500/10 data-[state=checked]:text-white data-[state=checked]:ring-1 data-[state=checked]:ring-inset data-[state=checked]:ring-blue-400/30 focus:bg-white/10 data-[state=checked]:focus:bg-blue-500/15 data-[disabled]:pointer-events-none data-[disabled]:opacity-50';
  const BUTTON = 'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg border text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:border-blue-400/40 focus-visible:ring-2 focus-visible:ring-blue-400/20 disabled:pointer-events-none disabled:opacity-50 border-line bg-control text-white hover:bg-control-hover';

  // The menus each filter has: its label, what 'all' says, and its choices for this list.
  function menus(st, pool) {
    const grades = GRADES.filter(g => pool.some(s => String(s.grade || '').toUpperCase() === g) || st.filters.grade === g);
    const speeds = [...new Set([...pool.map(s => RhythiaX.normalizeSpeed(s.speed)), ...(st.filters.speed ? [st.filters.speed] : [])])].sort((a, b) => b - a);
    const mods = [...new Set([...pool.flatMap(modsOf), ...(st.filters.mod && st.filters.mod !== 'none' ? [st.filters.mod] : [])])].sort();
    const out = [
      { key: 'grade', label: 'Grade', all: 'All grades', options: grades.map(g => [g, g]) },
      { key: 'mod', label: 'Mods', all: 'All mods', options: [['none', 'No mods'], ...mods.map(k => [k, k])] },
      { key: 'speed', label: 'Speed', all: 'All speeds', options: speeds.map(k => [k, `${k}×`]) },
      { key: 'kind', label: Data.basic ? 'Map type (approximate)' : 'Map type', all: 'All map types', options: Data.basic ? KINDS.filter(([k]) => k !== 'tech') : KINDS, off: Data.offline ? 'Needs online history' : '', counted: kindsKnown(pool) },
    ];
    if (nearOn(st)) out.push({ key: 'near', label: 'Against players near this rank', all: 'All maps', options: NEAR_SETS, hints: NEAR_HINT });
    return out;
  }

  // The panel's dropdowns, drawn from this state; a menu open before a redraw opens again.
  let openKey = '';
  function fieldHtml(m, st, count) {
    const value = st.filters[m.key] || '';
    const chosen = m.options.find(([v]) => v === value);
    const trigger = m.off
      ? `<button type="button" class="${TRIGGER}" disabled title="Map types come from Reimagined’s history service, with online history on."><span class="text-neutral-500">${esc(m.off)}</span>${CHEVRON('h-4 w-4 opacity-50')}</button>`
      : `<button type="button" role="combobox" aria-haspopup="listbox" aria-expanded="${openKey === m.key}" data-state="${openKey === m.key ? 'open' : 'closed'}" data-rx-filter="${m.key}" class="${TRIGGER}${value ? ' rhythiax-filter-on' : ''}"><span class="truncate">${esc(chosen ? chosen[1] : m.all)}</span>${CHEVRON('h-4 w-4 opacity-50')}</button>`;
    const n = m.counted === false ? null : count(m.key);
    const opt = (v, label, hint) => {
      const on = v === value, c = n ? n(v) : null;
      return `<button type="button" role="option" aria-selected="${on}" data-state="${on ? 'checked' : 'unchecked'}" data-rx-value="${esc(v)}" class="${OPTION} rhythiax-filter-option"${hint ? ` title="${esc(hint)}"` : ''}${c === 0 && !on ? ' data-empty="true"' : ''}><span class="truncate">${esc(label)}</span>${c != null ? `<span class="ml-auto pl-3 tabular-nums text-neutral-500 rhythiax-filter-count">${fmt(c)}</span>` : ''}</button>`;
    };
    const list = openKey === m.key && !m.off
      ? `<div role="listbox" class="${LISTBOX} rhythiax-filter-listbox" data-rx-list="${m.key}"><div class="p-1">${opt('', m.all)}${m.options.map(([v, l]) => opt(v, l, m.hints?.[v])).join('')}</div></div>` : '';
    return `<div class="space-y-1 rhythiax-filter-field"><div class="ml-1 text-sm font-semibold text-white rhythiax-filter-label">${esc(m.label)}</div><div class="relative">${trigger}${list}</div></div>`;
  }

  // Draws the Filters button (in the hub's controls row), the panel and the order row. view: { pool (the
  // searched list), onChange() }.
  function render(header, st, view) {
    st.filters = st.filters || {};
    // Difficulty orders by the maps' star ratings: the ones not saved yet are asked for once per list.
    const starsKey = st.sort === 'stars' ? (view.pool || []).map(s => s?.songId || s?.beatmapHash || s?.beatmapId || '').join('|') : null;
    if (starsKey !== null && Data.starsFor !== starsKey) {
      Data.starsFor = starsKey;
      RhythiaX.loadMapStars?.(view.pool).then(found => { if (found && Data.starsFor === starsKey) view.onChange(); });
    }
    const row = header.querySelector(':scope > .rhythiax-scores-controls-row');
    const left = row?.querySelector(':scope > .rhythiax-scores-controls-left');
    if (!left) return;
    const count = key => { const pool = filter(view.pool, st, key); return v => (v === '' ? pool.length : pool.filter(s => TESTS[key](s, v)).length); };
    const ms = menus(st, view.pool);
    const n = activeCount(st);

    let btn = left.querySelector(':scope > .rhythiax-filters-btn');
    if (!btn) {
      btn = document.createElement('button');
      btn.type = 'button';
      left.appendChild(btn);
    }
    btn.className = `${BUTTON} h-8 px-3 text-xs rhythiax-filters-btn${n ? ' is-on' : ''}`;
    btn.setAttribute('aria-expanded', String(Boolean(st.filtersOpen)));
    btn.innerHTML = `Filters${n ? `<span class="rhythiax-filters-count tabular-nums">${n}</span>` : ''}${CHEVRON(`h-4 w-4${st.filtersOpen ? ' rotate-180' : ''}`)}`;

    let panel = header.querySelector(':scope > .rhythiax-scores-filters');
    if (!panel) {
      panel = document.createElement('div');
      panel.setAttribute('role', 'group');
      panel.setAttribute('aria-label', 'Filters');
      row.after(panel);
    }
    panel.className = `rhythiax-scores-filters grid gap-3 rounded-xl border border-line bg-surface p-4 ${ms.length > 4 ? 'rhythiax-filters-5' : 'rhythiax-filters-4'}`;
    panel.hidden = !st.filtersOpen;
    const note = kindsNote(st);
    const panelHtml = ms.map(m => fieldHtml(m, st, count)).join('')
      + (n || note ? `<div class="rhythiax-filters-foot">${note ? `<span class="text-xs text-neutral-500 rhythiax-filters-note" role="status">${esc(note)}</span>` : ''}${n ? '<button type="button" class="text-xs font-semibold text-neutral-400 hover:text-white rhythiax-filters-clear" data-rx-clear>Clear filters</button>' : ''}</div>` : '');
    if (panel._rxHtml !== panelHtml) { panel.innerHTML = panelHtml; panel._rxHtml = panelHtml; }

    let orderRow = header.querySelector(':scope > .rhythiax-scores-order');
    if (!orderRow) {
      orderRow = document.createElement('div');
      orderRow.setAttribute('role', 'group');
      orderRow.setAttribute('aria-label', 'Order');
      header.appendChild(orderRow);
    }
    orderRow.className = 'rhythiax-scores-order flex flex-wrap items-center gap-2 px-1 py-1 text-sm text-neutral-500';
    const shown = ORDERS.filter(o => !o.near || nearOn(st));
    if (!shown.some(o => o.id === st.sort)) st.sort = '';
    orderRow.innerHTML = shown.map(o => {
      const on = (st.sort || '') === o.id, up = on && st.dir === -1;
      const title = o.id ? (up ? o.last : o.first) : o.first;
      return `<button type="button" data-rx-order="${o.id}" aria-pressed="${on}" title="${esc(on && o.id ? `${title}. Choose again to turn the order round.` : title)}" class="${on ? PILL_ON : PILL_OFF} rhythiax-order-pill">${esc(o.label)}${on && o.id ? CHEVRON(`h-3.5 w-3.5${up ? ' rotate-180' : ''}`) : ''}</button>`;
    }).join('');

    header._rxFilters = { st, view };
    live = header;
    if (header.dataset.rxFiltersWired) return;
    header.dataset.rxFiltersWired = 'true';
    const change = () => header._rxFilters.view.onChange();
    header.addEventListener('click', e => {
      const ctx = header._rxFilters, s = ctx.st;
      const t = e.target.closest('[data-rx-order], .rhythiax-filters-btn, [data-rx-filter], [data-rx-value], [data-rx-clear]');
      if (!t || !header.contains(t)) return;
      if (t.matches('.rhythiax-filters-btn')) { s.filtersOpen = !s.filtersOpen; openKey = ''; change(); return; }
      if (t.matches('[data-rx-order]')) {
        const id = t.dataset.rxOrder;
        if (id && s.sort === id) s.dir = s.dir === -1 ? 1 : -1; else { s.sort = id; s.dir = 1; }
        s.page = 1; change(); return;
      }
      if (t.matches('[data-rx-filter]')) { openKey = openKey === t.dataset.rxFilter ? '' : t.dataset.rxFilter; change(); focusChosen(header); return; }
      if (t.matches('[data-rx-value]')) {
        const key = t.closest('[data-rx-list]')?.dataset.rxList;
        if (key) { s.filters[key] = t.dataset.rxValue; s.page = 1; openKey = ''; change(); header.querySelector(`[data-rx-filter="${key}"]`)?.focus(); }
        return;
      }
      if (t.matches('[data-rx-clear]')) { s.filters = {}; s.page = 1; openKey = ''; change(); }
    });
    header.addEventListener('keydown', e => {
      const list = e.target.closest?.('[data-rx-list]');
      if (e.key === 'Escape' && openKey) { const key = openKey; openKey = ''; change(); header.querySelector(`[data-rx-filter="${key}"]`)?.focus(); e.preventDefault(); return; }
      if (!list || !['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) return;
      const opts = [...list.querySelectorAll('[role="option"]')], i = opts.indexOf(e.target);
      const next = e.key === 'Home' ? 0 : e.key === 'End' ? opts.length - 1 : Math.max(0, Math.min(opts.length - 1, i + (e.key === 'ArrowDown' ? 1 : -1)));
      opts[next]?.focus(); e.preventDefault();
    });
  }
  // A click anywhere else closes an open menu of the hub on the page.
  let live = null;
  if (typeof document !== 'undefined') document.addEventListener('pointerdown', e => {
    if (!openKey || !live?.isConnected || e.target.closest?.('.rhythiax-filter-field')) return;
    openKey = ''; live._rxFilters.view.onChange();
  }, true);
  function focusChosen(header) {
    const list = header.querySelector('[data-rx-list]');
    (list?.querySelector('[data-state="checked"]') || list?.querySelector('[role="option"]'))?.focus();
  }

  /* ── On each card: its map type, and on Top how it stands against the players ranked near ── */
  function decorate(card, score, tab) {
    const line = card.querySelector('.rhythiax-sc-meta-line');
    if (!line) return;
    const k = kindOf(score);
    const typeText = k && KIND_NAME[k.kind] ? `${KIND_NAME[k.kind]}${k.quantum ? ' · Quantum' : ''}` : '';
    let type = line.querySelector(':scope > .rhythiax-sc-meta-type');
    if (typeText) {
      if (!type) {
        const sepText = line.querySelector('.rhythiax-sc-meta-sep')?.textContent || '·';
        if (line.children.length) { const sep = document.createElement('span'); sep.className = 'rhythiax-sc-meta-sep rhythiax-sc-meta-type-sep'; sep.textContent = sepText; line.appendChild(sep); }
        type = document.createElement('span');
        type.className = 'rhythiax-sc-meta-type';
        line.appendChild(type);
      }
      type.title = k.approximate ? `Map type. ${BASIC_TIP}` : 'Map type, from Reimagined’s history service';
      type.textContent = typeText;
    } else if (type) { line.querySelector(':scope > .rhythiax-sc-meta-type-sep')?.remove(); type.remove(); }

    const host = line.parentElement;
    let near = host.querySelector(':scope > .rhythiax-sc-near');
    const x = tab === 'top' && Data.nearState === 'ready' ? nearOf(score) : null;
    if (!x?.place) { near?.remove(); return; }
    const others = x.of - 1, beaten = x.of - x.place, a = x.above || {}, b = x.below || {};
    const acc = v => (v == null ? '—' : `${fmt(v, 2)}%`);
    const tip = [`Better than ${fmt(beaten)} of ${fmt(others)} players ranked near this one who have the map in their top`,
      `Above (${fmt(a.players)}): ${fmt(a.rpMedian)} RP · ${acc(a.accMedian)} · ${fmt(a.missesMedian)} misses`,
      `Below (${fmt(b.players)}): ${fmt(b.rpMedian)} RP · ${acc(b.accMedian)} · ${fmt(b.missesMedian)} misses`,
      ...(x.speeds?.length ? [`Most play it at ${x.speeds[0].speed}×`] : [])].join('\n');
    if (!near) { near = document.createElement('div'); near.className = 'rhythiax-sc-near'; host.appendChild(near); }
    const html = `<span class="rhythiax-sc-near-bar"><i style="width:${(beaten / (others || 1) * 100).toFixed(1)}%"></i></span><span>Better than <b>${fmt(beaten)}</b> of ${fmt(others)} nearby</span>`;
    if (near._rxHtml !== html) { near.innerHTML = html; near._rxHtml = html; }
    near.title = tip;
  }

  // The profile's hub has none of this: what a scores page hub drew in it is taken out.
  function strip(hub) {
    hub.querySelectorAll('.rhythiax-scores-order, .rhythiax-scores-filters, .rhythiax-filters-btn, .rhythiax-sc-near, .rhythiax-sc-meta-type, .rhythiax-sc-meta-type-sep').forEach(el => el.remove());
  }

  RhythiaX.ScoreHubFilters = { apply, render, decorate, strip, loadKinds, loadNear, kindsNote, activeCount, _data: Data };
})();
