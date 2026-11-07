// =============================================
// Reimagined for Rhythia — A map's page
// =============================================
// How the map plays, from the history service (core/vps-client.js fetchVpsMapPlays), drawn with Rhythia's own
// parts so themes recolour it like the rest of the page: the map type next to Rhythia's RANKED chip, and a
// "How this map plays" section in Rhythia's section style between the Leaderboard and the Map preview (the share
// of jumps, streams and techs and how dense the map is). Online history only: without it the page stays Rhythia's.

var RhythiaX = RhythiaX || {};

RhythiaX.MapPage = (function () {
  'use strict';

  // The names, tips and whole percentages both looks use (shared/game-terms.js): the kinds of movement on the share
  // bar and the map's tags.
  const { MOVES: KIND, tagsOf, wholes } = RhythiaX.GameTerms;
  const MISSING = {
    pending: 'Reimagined has not read this map yet. It is read within a day.',
    queued: 'Reimagined will read this map within a day.',
    full: 'Reimagined is reading many new maps today. Try again tomorrow.',
    missing: 'Rhythia no longer has this map file.',
    unreadable: 'Reimagined could not read this map file.',
  };
  const ICON = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-activity h-[18px] w-[18px] shrink-0 text-white" aria-hidden="true"><path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2"/></svg>';
  const CHIP = 'rhythiax-map-type inline-flex h-[22px] shrink-0 items-center gap-1 whitespace-nowrap rounded-md border px-1.5 text-[11px] font-bold leading-none transition-colors text-white border-neutral-400/55 bg-neutral-700/65';

  const esc = s => (RhythiaX.escapeHtml ? RhythiaX.escapeHtml(String(s)) : String(s).replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`));
  const fmt = (v, d = 0) => Number(v).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });

  // One visit of a map page: its id, the service's answer (undefined while asked) and what is drawn.
  let visit = null;
  const mapId = () => window.location.pathname.match(/^\/maps\/(\d+)/)?.[1] || '';

  function cleanup() {
    visit?.controller?.abort();
    visit = null;
    document.querySelectorAll('.rhythiax-map-type, .rhythiax-map-plays').forEach(el => el.remove());
  }

  function sectionOf(title) {
    const h = [...document.querySelectorAll('h2')].find(el => el.textContent.trim() === title && !el.closest('.rhythiax-map-plays'));
    return h?.closest('.rounded-xl') || null;
  }

  // The type chips beside Rhythia's status chips over the title.
  function drawChips(p) {
    const h1 = document.querySelector('main h1, h1');
    const row = h1?.previousElementSibling;
    if (!row || !row.querySelector('span')) return false;
    const want = p?.state === 'done' || p?.state === 'basic' ? tagsOf(p).filter(t => t.k !== 'stamina') : [];
    const sig = `${p?.state}:${want.map(t => t.k).join(',')}`;
    const have = [...row.querySelectorAll('.rhythiax-map-type')];
    if (have.length === want.length && have.every(el => el.dataset.rxSig === sig)
      && (!have.length || row.lastElementChild === have[have.length - 1])) return true;
    have.forEach(el => el.remove());
    for (const t of want) {
      const chip = document.createElement('span');
      chip.className = `${CHIP} rhythiax-k-${t.k}`;
      chip.dataset.rxSig = sig;
      chip.title = p.state === 'basic'
        ? `${t.label} (approximate): worked out in this browser from the map file, without online history. Online history tells Techs and how the map plays.`
        : `${t.label}: ${t.tip}. Map type worked out by Reimagined.`;
      chip.innerHTML = `<i class="rhythiax-map-type-dot" aria-hidden="true"></i>${esc(t.label.toUpperCase())}`;
      row.appendChild(chip);
    }
    return true;
  }

  function bodyHtml(p) {
    if (p.state !== 'done') return `<p class="text-sm text-neutral-400">${esc(MISSING[p.state] || 'Reimagined has not read this map.')}</p>`;
    const c = p.plays || {}, sh = c.share || { stream: p.stream, jump: p.jump, tech: p.tech };
    const s = { jump: Number(sh.jump) || 0, stream: Number(sh.stream) || 0, tech: Number(sh.tech) || 0 };
    const kinds = Object.keys(KIND).filter(k => s[k] > 0.005);
    const share = Object.fromEntries(wholes(kinds.map(k => s[k])).map((v, i) => [kinds[i], v]));
    const bar = kinds.map(k => `<i class="rhythiax-k-${k}" style="flex:${s[k]}" title="${KIND[k][0]} · ${share[k]}% of the notes. ${KIND[k][1]}."></i>`).join('');
    const legend = kinds.map(k => `<span class="inline-flex items-center gap-1.5" title="${KIND[k][1]}"><i class="rhythiax-map-type-dot rhythiax-k-${k}" aria-hidden="true"></i>${KIND[k][0]} <b class="font-semibold text-white tabular-nums">${share[k]}%</b></span>`).join('');
    const facts = [
      ['Notes per second', p.nps != null ? fmt(p.nps, 1) : '—', ''],
      ['Busiest second', p.peakNps != null ? `${fmt(p.peakNps)} notes` : '—', 'Most notes in any one second'],
      ['Fastest stream', c.fastestStream ? `${fmt(c.fastestStream, 1)} notes/s` : '—', ''],
      ['Longest stream', p.longestStreamMs ? `${fmt(p.longestStreamMs / 1000, 1)} s` : '—', ''],
      ['Off-grid notes', c.offGrid != null ? `${fmt(c.offGrid * 100)}%` : '—', 'Notes away from the 3×3 grid'],
    ];
    return `${kinds.length ? `<div class="rhythiax-map-plays-bar flex h-2 overflow-hidden rounded-[999px] bg-white/[0.08] ring-1 ring-inset ring-white/[0.06]" role="img" aria-label="${kinds.map(k => `${KIND[k][0]} ${share[k]}%`).join(', ')}">${bar}</div>
      <div class="rhythiax-map-plays-legend flex flex-wrap text-xs text-neutral-400">${legend}</div>` : ''}
      <div class="rhythiax-map-plays-facts">${facts.map(([label, value, tip]) => `<div class="rounded-xl border border-line bg-white/[0.03] px-2 py-2 text-center"${tip ? ` title="${esc(tip)}"` : ''}>
        <div class="whitespace-nowrap text-[11px] text-neutral-400">${esc(label)}</div><div class="rhythiax-map-plays-value text-sm font-semibold tabular-nums text-white">${esc(value)}</div></div>`).join('')}</div>`;
  }

  // The section between Rhythia's Leaderboard and Map preview.
  function drawSection(p) {
    const preview = sectionOf('Map preview'), board = sectionOf('Leaderboard');
    const anchor = preview || board;
    if (!anchor?.parentElement) return false;
    let sec = document.querySelector('.rhythiax-map-plays');
    if (!sec) {
      sec = document.createElement('div');
      sec.className = 'rhythiax-map-plays rounded-xl border border-line bg-surface';
    }
    if (preview ? sec.nextElementSibling !== preview : sec.previousElementSibling !== board) {
      if (preview) preview.before(sec); else board.after(sec);
    }
    const html = `<div class="flex min-h-[52px] flex-wrap items-center gap-x-1.5 gap-y-2 border-b border-line px-4 py-2 px-5">${ICON}<h2 class="min-w-0 truncate text-base font-bold tracking-wide text-white">How this map plays</h2>
      <div class="ml-auto flex shrink-0 flex-wrap items-center gap-1.5 "><div class="text-xs text-neutral-500">Shares are by note count</div></div></div>
      <div class="p-5">${bodyHtml(p)}</div>`;
    if (sec._rxHtml !== html) { sec.innerHTML = html; sec._rxHtml = html; }
    return true;
  }

  // false while the page or the answer is not there yet; true once drawn (or when there is nothing to draw).
  function inject() {
    if (RhythiaX.PageRouteContext?.type?.() !== 'map' || RhythiaX.ClassicIdle?.isSuspended?.()) return false;
    const id = mapId();
    if (!id) return true;
    if (visit?.id !== id) {
      cleanup();
      const controller = typeof AbortController === 'function' ? new AbortController() : null;
      visit = { id, controller, plays: undefined };
      const mine = visit;
      Promise.resolve(RhythiaX.resolveBeatmapMeta?.(id, { signal: controller?.signal }))
        .then(meta => (meta?.mapHash ? RhythiaX.fetchVpsMapPlays?.(meta.mapHash, id, controller?.signal) : null))
        .then(p => { if (visit === mine) { mine.plays = p || null; RhythiaX.injected = false; RhythiaX.ContentLifecycle?.queueInject?.(0); } },
          () => { if (visit === mine) mine.plays = null; });
      return false;
    }
    const p = visit.plays;
    if (p === undefined) return false;
    // Online history off, or no answer: Rhythia's page as it is. Map types worked out in this browser: the chips only.
    if (!p || p.state === 'off') return true;
    if (p.state === 'basic') return drawChips(p);
    return drawChips(p) && drawSection(p);
  }

  // Whether what was drawn is still on the page (Rhythia redraws its parts); true when nothing is to be drawn.
  function inPlace() {
    const p = visit?.plays;
    if (!p || p.state === 'off') return true;
    const chipsOk = (p.state !== 'done' && p.state !== 'basic') || Boolean(document.querySelector('.rhythiax-map-type'));
    return chipsOk && (p.state === 'basic' || Boolean(document.querySelector('.rhythiax-map-plays')));
  }

  return { inject, inPlace, cleanup };
})();
