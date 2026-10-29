// =============================================
// Reimagined for Rhythia — Classic Reimagined Search
// =============================================
// On Rhythia's own map list (/maps), a panel under "Explore maps": Reimagined's own search of Ranked and Qualified
// maps on the history service (core/vps-client.js): types, quantum, difficulty, length, title, mapper and
// order, 30 maps a page. Rhythia's own search and list stay as they are. Online history only.

var RhythiaX = RhythiaX || {};

(function () {
  const OPEN_KEY = 'rhythiax_classic_map_search_open';
  const BUCKETS = [['Any', 0, 20], ['Beginner', 0, 3], ['Intermediate', 3, 5], ['Hard', 5, 7], ['Expert', 7, 20]];
  const LENGTHS = [['Any', 0, 0], ['Short', 0, 90], ['Medium', 90, 180], ['Long', 180, 300], ['Marathon', 300, 0]];
  const QUANTUM = [['any', 'Any'], ['without', 'No quantum'], ['only', 'Only quantum']];
  const ORDERS = [['newest', 'Newest'], ['plays', 'Most played'], ['stars', 'Difficulty'], ['length', 'Length']];
  // What Reimagined Search is, until the server's own words (/api/maps/types) are known, and without online history.
  const SEARCH_NOTE = { note: "Reimagined's own search, not Rhythia's.", points: [
    "Ranked and Qualified maps only. Every other map is in Rhythia's map list.",
    "It searches Reimagined's copy of Rhythia's Ranked and Qualified lists, read once a day, so a map ranked or qualified since may be missing and results can differ from Rhythia.",
    "Map types are worked out automatically from each map's file, so some may be wrong."] };
  const esc = value => RhythiaX.escapeHtml(String(value ?? ''));
  const fmt = (v, d = 0) => Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
  const mmss = ms => { const s = Math.round((ms || 0) / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };

  let panel = null, ac = null, seq = 0;
  const S = { open: false, types: undefined, data: null, error: '', busy: false,
    q: { status: 'RANKED', types: [], quantum: 'any', bucket: 0, length: 0, title: '', mapper: '', order: 'newest', reverse: false, page: 1 } };

  // Rhythia's "Explore maps" panel, the one the search sits under.
  function anchor() {
    const heading = [...document.querySelectorAll('#root h1, #root h2, #root h3, #root div, #root span')]
      .find(e => e.childElementCount === 0 && e.textContent.trim() === 'Explore maps');
    let box = heading;
    while (box && box.parentElement && !/rounded/.test(String(box.className))) box = box.parentElement;
    return box && box !== document.body ? box : null;
  }

  function searchOf(q) {
    const [, lo, hi] = BUCKETS[q.bucket], [, lmin, lmax] = LENGTHS[q.length];
    const body = { statuses: q.status === 'BOTH' ? ['RANKED', 'QUALIFIED'] : [q.status], quantum: q.quantum, order: q.order, reverse: q.reverse, page: q.page };
    if (q.types.length) body.types = q.types;
    if (q.bucket) body.stars = { min: lo, max: hi };
    if (lmin || lmax) body.length = { ...(lmin ? { min: lmin } : {}), ...(lmax ? { max: lmax } : {}) };
    if (q.title) body.title = q.title.slice(0, 64);
    if (q.mapper) body.mapper = q.mapper.slice(0, 64);
    return body;
  }

  const group = (label, items, attr, on) => `<div class="rhythiax-msearch-seg" role="group" aria-label="${esc(label)}">${items.map(([k, n]) => `<button type="button" data-${attr}="${esc(k)}" aria-pressed="${on(k)}">${esc(n)}</button>`).join('')}</div>`;
  const typeName = id => S.types?.types?.find(t => t.id === id)?.label || id;

  function card(m) {
    return `<a class="rhythiax-msearch-card" href="/maps/${esc(m.id)}">
      <span class="rhythiax-msearch-art" style="background-image:url(${esc(JSON.stringify(String(m.art || m.thumb || '')))})"></span>
      <span class="rhythiax-msearch-tags"><span>${esc(typeName(m.type))}${m.quantum ? ' · Quantum' : ''}</span><span>★ ${fmt(m.stars, 2)}</span></span>
      <span class="rhythiax-msearch-plate"><b title="${esc(m.title)}">${esc(m.title)}</b><small><span>by ${esc(m.mapper || 'Unknown')}</span><span>${mmss(m.length)}</span><span>${fmt(m.plays)} plays</span></small></span></a>`;
  }

  // Above everything in the panel, with online history or not: whose search this is and what it covers.
  function note() {
    const n = S.types?.points?.length ? S.types : SEARCH_NOTE;
    return `<div class="rhythiax-msearch-note"><p><b>${esc(n.note || SEARCH_NOTE.note)}</b></p><ul>${n.points.map(p => `<li>${esc(p)}</li>`).join('')}</ul></div>`;
  }

  function body() {
    if (S.types === null) {
      return `${note()}<div class="rhythiax-msearch-need"><b>Reimagined Search uses online history</b>
        <p>It runs on Reimagined's history service. Turning it on switches on online history everywhere: the public IDs of the players and maps you view, these filters and an anonymous key go to rhythia.shuriel.com. Rhythia's own search above works without it.</p>
        <button type="button" class="rhythiax-msearch-btn" data-msearch-online>Turn on online history</button></div>`;
    }
    if (S.types === undefined) return `${note()}<p class="rhythiax-msearch-wait">${S.error ? esc(S.error) : 'Loading…'}</p>`;
    const q = S.q, statuses = [...S.types.statuses.map(s => [s.id, s.label]), ['BOTH', 'Both']];
    const results = S.error ? `<p class="rhythiax-msearch-wait">${esc(S.error)}</p>`
      : !S.data ? '<p class="rhythiax-msearch-wait">Loading…</p>'
        : !S.data.maps.length ? '<p class="rhythiax-msearch-wait">No maps found. Try other filters.</p>'
          : `<div class="rhythiax-msearch-grid${S.busy ? ' is-busy' : ''}">${S.data.maps.map(card).join('')}</div>
            ${S.data.pages > 1 ? `<div class="rhythiax-msearch-pager"><button type="button" class="rhythiax-msearch-btn" data-msearch-page="${q.page - 1}" ${q.page <= 1 ? 'disabled' : ''}>Previous</button>
              <span>Page ${fmt(q.page)} of ${fmt(S.data.pages)} · ${fmt(S.data.total)} maps</span>
              <button type="button" class="rhythiax-msearch-btn" data-msearch-page="${q.page + 1}" ${q.page >= S.data.pages ? 'disabled' : ''}>Next</button></div>` : ''}`;
    return `${note()}
      <form class="rhythiax-msearch-row" data-msearch-form>
        <input type="search" name="title" placeholder="Title" value="${esc(q.title)}" autocomplete="off">
        <input type="search" name="mapper" placeholder="Mapper" value="${esc(q.mapper)}" autocomplete="off">
        <button type="submit" class="rhythiax-msearch-btn">Search</button></form>
      <div class="rhythiax-msearch-row">
        ${group('Status', statuses, 'msearch-status', k => q.status === k)}
        ${group('Map type', S.types.types.map(t => [t.id, t.label]), 'msearch-type', k => q.types.includes(k))}
        ${group('Quantum', QUANTUM, 'msearch-quantum', k => q.quantum === k)}</div>
      <div class="rhythiax-msearch-row">
        ${group('Difficulty', BUCKETS.map(([n], i) => [i, n]), 'msearch-bucket', k => q.bucket === Number(k))}
        ${group('Length', LENGTHS.map(([n], i) => [i, n]), 'msearch-length', k => q.length === Number(k))}
        <span class="rhythiax-msearch-order">${group('Order', ORDERS, 'msearch-order', k => q.order === k)}
        <button type="button" class="rhythiax-msearch-btn" data-msearch-reverse aria-label="${q.reverse ? 'Reverse order' : 'Usual order'}">${q.reverse ? '↑' : '↓'}</button></span></div>
      ${results}`;
  }

  function draw() {
    if (!panel) return;
    panel.classList.toggle('is-open', S.open);
    panel.querySelector('[data-msearch-toggle]').setAttribute('aria-expanded', String(S.open));
    const content = panel.querySelector('.rhythiax-msearch-body');
    content.hidden = !S.open;
    if (S.open) content.innerHTML = body();
  }

  async function load() {
    const id = ++seq;
    if (S.types === undefined || S.types === null) {
      S.types = await RhythiaX.fetchVpsMapSearchTypes?.(ac.signal).catch(() => undefined);
      if (id !== seq || !panel) return;
      if (S.types === undefined) { S.error = 'The history service did not answer. Try again in a moment.'; return draw(); }
      if (S.types === null) return draw();
    }
    S.busy = true; S.error = ''; draw();
    try {
      const data = await RhythiaX.fetchVpsMapSearch(searchOf(S.q), ac.signal);
      if (id !== seq || !panel) return;
      // Online history was turned off since the types were read: offer it again.
      if (data === null) S.types = null;
      S.data = data;
    } catch (err) {
      if (id !== seq || !panel || ac.signal.aborted) return;
      S.error = err.message;
    }
    S.busy = false;
    draw();
  }
  const change = patch => { S.q = { ...S.q, ...patch }; load(); };

  function onClick(event) {
    const t = event.target.closest('button');
    if (!t || t.disabled || !panel?.contains(t)) return;
    const d = t.dataset;
    if ('msearchToggle' in d) {
      S.open = !S.open;
      try { localStorage.setItem(OPEN_KEY, S.open ? '1' : '0'); } catch (_) {}
      draw();
      if (S.open && !S.data) load();
      return;
    }
    if ('msearchOnline' in d) {
      t.disabled = true;
      Promise.resolve(RhythiaX.CommunityConsentNotice?.turnOn?.(event)).then(ok => {
        if (!ok) { t.disabled = false; return; }
        S.types = undefined; load();
      });
      return;
    }
    if (d.msearchStatus) return change({ status: d.msearchStatus, page: 1 });
    if (d.msearchType) return change({ types: S.q.types.includes(d.msearchType) ? S.q.types.filter(x => x !== d.msearchType) : [...S.q.types, d.msearchType], page: 1 });
    if (d.msearchQuantum) return change({ quantum: d.msearchQuantum, page: 1 });
    if (d.msearchBucket) return change({ bucket: Number(d.msearchBucket), page: 1 });
    if (d.msearchLength) return change({ length: Number(d.msearchLength), page: 1 });
    if (d.msearchOrder) return change({ order: d.msearchOrder, page: 1 });
    if ('msearchReverse' in d) return change({ reverse: !S.q.reverse, page: 1 });
    if (d.msearchPage) {
      change({ page: Math.max(1, Number(d.msearchPage)) });
      panel.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }
  }
  function onSubmit(event) {
    const form = event.target.closest('[data-msearch-form]');
    if (!form || !panel?.contains(form)) return;
    event.preventDefault();
    change({ title: form.elements.title.value.trim(), mapper: form.elements.mapper.value.trim(), page: 1 });
  }

  RhythiaX.injectMapSearch = function () {
    if (RhythiaX.exodusShowing?.()) return false;
    if (panel?.isConnected) return true;
    const after = anchor();
    if (!after) return false;
    RhythiaX.cleanupMapSearch();
    ac = new AbortController();
    try { S.open = localStorage.getItem(OPEN_KEY) === '1'; } catch (_) { S.open = false; }
    panel = document.createElement('section');
    panel.className = 'rhythiax-msearch';
    panel.innerHTML = `<button type="button" class="rhythiax-msearch-head" data-msearch-toggle aria-expanded="false">
        <span><b>Reimagined Search</b><small>Ranked and Qualified maps by map type, quantum, difficulty and length, searched by Reimagined</small></span>
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></button>
      <div class="rhythiax-msearch-body" hidden></div>`;
    after.insertAdjacentElement('afterend', panel);
    panel.addEventListener('click', onClick, { signal: ac.signal });
    panel.addEventListener('submit', onSubmit, { signal: ac.signal });
    draw();
    if (S.open) load();
    return true;
  };

  RhythiaX.cleanupMapSearch = function () {
    ac?.abort();
    ac = null;
    seq++;
    panel?.remove();
    panel = null;
  };
})();
