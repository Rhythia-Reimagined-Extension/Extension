// =============================================
// Reimagined for Rhythia - Changelog page
// =============================================

var RhythiaX = RhythiaX || {};

;(function () {
  'use strict';

  const VIEW_KEY = 'reimagined';
  const TAB_MARKER = 'data-rhythiax-changelog-tab';
  const PANEL_CLASS = 'rhythiax-changelog-panel';

  let renderFrame = null;
  let entriesPromise = null;
  let changelogEntries = null;
  let loadState = 'idle'; // 'idle' | 'loading' | 'loaded' | 'error'
  let loadError = null;
  let preview = false; // a development install: the local changelog.md, drafts included
  let entryLoadAttached = false;
  let clickListenerAttached = false;
  let tabObserver = null;
  let focusTitle = false; // the next render moves focus to the release's title (revealEntry)
  let requestedReimagined = false;
  let requestedEntry = '';
  let look = 'legacy'; // the look whose changes the reader shows: 'legacy' (Classic), 'exodus' or 'all'

  function isChangelogRoute() {
    return /^\/changelog(?:\/|$)/.test(window.location.pathname);
  }

  function isReimaginedView() {
    return isChangelogRoute() && new URLSearchParams(window.location.search).get('view') === VIEW_KEY;
  }

  // The <html> mark that anti-flicker.css reads (set first by bootstrap/changelog-early.js).
  function markView(view = isChangelogRoute() ? (isReimaginedView() ? 'reimagined' : 'official') : '') {
    if (view) document.documentElement.dataset.rhythiaxChangelog = view;
    else delete document.documentElement.dataset.rhythiaxChangelog;
  }

  function safeUrl(value) {
    const url = String(value || '').trim();
    return /^https?:\/\//i.test(url) ? url : '#';
  }

  // Section icons and names are shared with the Exodus changelog (shared/releases.js).
  const CHANGELOG_CATEGORY_ICONS = RhythiaX.Releases.ICONS;
  const normalizeCategory = label => RhythiaX.Releases.category(label);

  function inlineMarkdown(value) {
    let html = RhythiaX.escapeHtml(value);
    html = html.replace(/^(?:<strong>\[([a-zA-Z0-9\s_-]+)\]<\/strong>|\[([a-zA-Z0-9\s_-]+)\])\s*/i, (match, tag1, tag2) => {
      const rawTag = tag1 || tag2;
      const cat = normalizeCategory(rawTag);
      if (!cat) return match;
      const icon = CHANGELOG_CATEGORY_ICONS[cat];
      return `<span class="rhythiax-changelog-inline-badge" data-rhythiax-category="${cat}">${icon ? `<span class="rhythiax-changelog-inline-icon" aria-hidden="true">${icon}</span>` : ''}<span>${RhythiaX.escapeHtml(rawTag)}</span></span> `;
    });
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  // The text is escaped above, so a URL taken from it is already safe inside an attribute.
    html = html.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g, (_, alt, url) => {
      const imageUrl = safeUrl(url);
      return imageUrl === '#' ? '' : `<img src="${imageUrl}" alt="${alt}" loading="lazy" decoding="async">`;
    });
    html = html.replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g, (_, label, url) => {
      const linkUrl = safeUrl(url);
      return linkUrl === '#' ? label : `<a href="${linkUrl}" target="_blank" rel="noopener noreferrer">${label}</a>`;
    });
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    return html;
  }

  // Release notes come from shared/releases.js (the packaged changelog.md and the online copy).
  function loadEntries(force = false) {
    if (!force && entriesPromise) return entriesPromise;
    if (!changelogEntries) loadState = 'loading';
    loadError = null;
    scheduleRender();
    entriesPromise = RhythiaX.Releases.load()
      .then(result => {
        changelogEntries = result.list;
        preview = result.preview;
        loadState = 'loaded';
        scheduleRender();
        return changelogEntries;
      })
      .catch(error => {
        entriesPromise = null;
        if (!changelogEntries) { loadState = 'error'; loadError = String(error?.message || error); }
        scheduleRender();
        return changelogEntries || [];
      });
    return entriesPromise;
  }

  function formatDate(value, compact = false) {
    const date = String(value || '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return date || 'Unreleased';
    return compact ? date.replace(/-/g, '.') : new Date(`${date}T12:00:00Z`).toLocaleDateString('en-US', {
      day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
    });
  }

  function currentEntry(entries) {
    const selected = new URLSearchParams(window.location.search).get('entry');
    return entries.find(entry => entry.version === selected) || entries[0] || null;
  }

  function setView(active, entryVersion = '') {
    requestedReimagined = active;
    requestedEntry = active ? entryVersion : '';
    const url = new URL(window.location.href);
    if (active) {
      url.searchParams.set('view', VIEW_KEY);
      if (entryVersion) url.searchParams.set('entry', entryVersion);
      else url.searchParams.delete('entry');
    } else {
      url.searchParams.delete('view');
      url.searchParams.delete('entry');
    }
    window.history.pushState({}, '', `${url.pathname}${url.search}${url.hash}`);
    markView();
    scheduleRender();
  }

  function tabsContainer() {
    const publicTab = RhythiaX.ChangelogPageAdapter.query('#root a[href*="/changelog/public"]');
    const webTab = RhythiaX.ChangelogPageAdapter.query('#root a[href*="/changelog/web"]');
    if (!publicTab || !webTab || publicTab.parentElement !== webTab.parentElement) return null;
    return publicTab.parentElement;
  }

  function updateTabDate(tab, value) {
    const dateNode = tab.querySelector('[data-rhythiax-changelog-tab-date]')
      || Array.from(tab.querySelectorAll('div')).find(node => /^\d{4}\.\d{2}\.\d{2}$/.test(node.textContent.trim()));
    if (!dateNode) return;
    dateNode.dataset.rhythiaxChangelogTabDate = 'true';
    dateNode.textContent = formatDate(value, true);
  }

  function getTabIndicatorBar(tabNode) {
    if (!tabNode) return null;
    return tabNode.querySelector('.rhythiax-changelog-tab-bar')
      || tabNode.querySelector(':scope > div:first-child')
      || tabNode.querySelector('div[class*="rounded"]');
  }

  function ensureReimaginedTab(entries) {
    // A native stream redirect may finish after the user has already chosen
    // Reimagined. Keep that last choice without starting another route change.
    if (requestedReimagined && isChangelogRoute() && !isReimaginedView()) {
      const url = new URL(window.location.href);
      url.searchParams.set('view', VIEW_KEY);
      if (requestedEntry) url.searchParams.set('entry', requestedEntry);
      window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
    }
    const container = tabsContainer();
    if (!container) return false;
    container.dataset.rhythiaxChangelogTabs = 'true';
    container.style.setProperty('grid-template-columns', 'repeat(3, minmax(0, 1fr))', 'important');
    const active = isReimaginedView();
    container.dataset.rhythiaxChangelogMode = active ? 'reimagined' : 'official';

    container.querySelectorAll(`a:not([${TAB_MARKER}])`).forEach(tab => {
      const bar = getTabIndicatorBar(tab);
      if (active) {
        tab.style.setProperty('background', 'transparent', 'important');
        tab.style.setProperty('box-shadow', 'none', 'important');
        tab.style.setProperty('border-color', 'transparent', 'important');
        if (bar) bar.style.setProperty('opacity', '0.25', 'important');
      } else {
        tab.style.removeProperty('background');
        tab.style.removeProperty('box-shadow');
        tab.style.removeProperty('border-color');
        if (bar) bar.style.removeProperty('opacity');
      }
    });

    const supportCard = document.querySelector('#root a[href="/support"]')
      ?.closest('div[class*="rounded-xl"][class*="bg-[#141116]"]');
    if (supportCard) {
      supportCard.dataset.rhythiaxOfficialSupport = 'true';
      if (active) supportCard.style.setProperty('display', 'none', 'important');
      else supportCard.style.removeProperty('display');
    }

    let tab = container.querySelector(`[${TAB_MARKER}]`);
    if (!tab) {
      const source = container.querySelector('a[href*="/changelog/public"]') || container.querySelector('a');
      if (!source) return false;
      tab = document.createElement('a');
      tab.className = source.className;
      tab.classList.remove('bg-white/10', 'text-white');
      tab.classList.add('text-neutral-400');
      tab.setAttribute(TAB_MARKER, 'true');
      tab.dataset.discover = 'true';
      tab.innerHTML = `
        <div class="h-0.5 w-full rounded-md rhythiax-changelog-tab-bar" style="background: var(--rhythiax-accent, #c084fc);"></div>
        <div class="text-base font-bold">Reimagined</div>
        <div class="text-sm font-light" data-rhythiax-changelog-tab-date="true">2026.09.26</div>
      `;
      container.appendChild(tab);
    }
    const tabUrl = new URL(window.location.href);
    tabUrl.searchParams.set('view', VIEW_KEY);
    tabUrl.searchParams.delete('entry');
    tab.href = `${tabUrl.pathname}${tabUrl.search}`;

    const reimaginedBar = getTabIndicatorBar(tab);
    if (reimaginedBar) {
      reimaginedBar.style.background = 'var(--rhythiax-accent, #c084fc)';
      if (active) {
        reimaginedBar.style.removeProperty('opacity');
      } else {
        reimaginedBar.style.setProperty('opacity', '0.25', 'important');
      }
    }

    if (active) {
      tab.classList.add('bg-white/10', 'text-white');
      tab.classList.remove('text-neutral-400');
    } else {
      tab.classList.remove('bg-white/10', 'text-white');
      tab.classList.add('text-neutral-400');
    }

    updateTabDate(tab, entries[0]?.date || '');
    tab.dataset.rhythiaxActive = active ? 'true' : 'false';
    tab.setAttribute('aria-label', 'Reimagined changelog');
    if (active) tab.setAttribute('aria-current', 'page');
    else tab.removeAttribute('aria-current');
    return true;
  }

  function officialArticles() {
    return RhythiaX.ChangelogPageAdapter.queryAll('#root article:not(.rhythiax-changelog-entry)');
  }

  function removePanel() {
    document.querySelector(`.${PANEL_CLASS}`)?.remove();
    officialArticles().forEach(article => {
      if (article.dataset.rhythiaxChangelogHidden !== 'true') return;
      const display = article.dataset.rhythiaxChangelogDisplay || '';
      if (display) article.style.setProperty('display', display);
      else article.style.removeProperty('display');
      delete article.dataset.rhythiaxChangelogHidden;
      delete article.dataset.rhythiaxChangelogDisplay;
    });
  }

  // Laid out like Rhythia's own changelog entries: the release centred on top, a rule, then plain lists.
  function noteMarkup() {
    return '<p class="rhythiax-changelog-note">Changelog of the unofficial Reimagined for Rhythia extension. Not affiliated with or endorsed by Rhythia or CAPO Games.</p>';
  }

  function stateMarkup(body) {
    return `<article class="rhythiax-changelog-entry is-state"><div class="rhythiax-changelog-empty">${body}</div></article>${noteMarkup()}`;
  }

  // The list of versions beside the release: its number, title and date, and a dot for each look it changes.
  function versionsMarkup(entries, entry) {
    const dots = item => RhythiaX.Releases.looksOf(item).map(key =>
      `<i data-rhythiax-engine="${key}" title="${RhythiaX.escapeHtml(RhythiaX.Releases.LOOKS[key].label)}"></i>`).join('');
    return `<nav class="rhythiax-changelog-versions" aria-label="Versions">${entries.map(item => `<button type="button" class="rhythiax-changelog-v${item === entry ? ' is-on' : ''}" data-rhythiax-entry="${RhythiaX.escapeHtml(item.version)}"${item === entry ? ' aria-current="true"' : ''}><b>${RhythiaX.escapeHtml(item.version)}<span class="rhythiax-changelog-dots">${dots(item)}</span></b><small>${item.title ? `${RhythiaX.escapeHtml(item.title)} · ` : ''}${RhythiaX.escapeHtml(formatDate(item.date, true))}</small></button>`).join('')}</nav>`;
  }

  function step(target, label) {
    if (!target) return '<span></span>';
    return `<button type="button" class="rhythiax-changelog-step" data-rhythiax-entry="${RhythiaX.escapeHtml(target.version)}"><small>${label}</small><b>${RhythiaX.escapeHtml(target.version)}${target.title ? ` · ${RhythiaX.escapeHtml(target.title)}` : ''}</b></button>`;
  }

  function panelInnerMarkup(entries) {
    if (loadState === 'loading') {
      return stateMarkup('<div class="rhythiax-changelog-spinner" aria-hidden="true"></div><strong>Loading release notes…</strong>');
    }

    if (loadState === 'error') {
      return stateMarkup(`<strong>Could not load the release notes.</strong>
          <button type="button" class="rhythiax-changelog-retry-btn" data-rhythiax-changelog-retry="true">
            <svg viewBox="0 0 24 24" focusable="false"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"></path><path d="M16 16h5v5"></path></svg>
            <span>Retry</span>
          </button>`);
    }

    const entry = currentEntry(entries);
    if (!entry) return stateMarkup('<strong>No release notes yet.</strong>');

    const index = entries.indexOf(entry);
    // One look at a time (Classic first), with a switch; an item for both looks is marked so.
    const looks = RhythiaX.Releases.looksOf(entry);
    const shownLook = looks.length ? look : 'all';
    const shown = RhythiaX.Releases.forLook(RhythiaX.Releases.sections(entry), shownLook);
    const summary = RhythiaX.Releases.summary(shown);
    const tag = item => (shownLook === 'all' ? (item.look ? RhythiaX.Releases.LOOKS[item.look].label : '') : !item.look && looks.length ? 'Both looks' : '');
    const itemHtml = item => `<li>${inlineMarkdown(item.text)}${tag(item) ? ` <span class="rhythiax-changelog-tag">${RhythiaX.escapeHtml(tag(item))}</span>` : ''}</li>`;
    const switchHtml = looks.length ? `<div class="rhythiax-changelog-looks" role="group" aria-label="Changes for">${[['legacy', 'Classic'], ['exodus', 'Exodus'], ['all', 'All']].map(([key, label]) =>
      `<button type="button" data-rhythiax-changelog-look="${key}" aria-pressed="${shownLook === key}">${label}</button>`).join('')}</div>` : '';
    const contentHtml = shown.length ? shown.map(section => `<section class="rhythiax-changelog-section" data-rhythiax-section="${RhythiaX.escapeHtml(section.cat)}">
        <h3 class="rhythiax-changelog-category-heading" data-rhythiax-category="${RhythiaX.escapeHtml(section.cat)}">${CHANGELOG_CATEGORY_ICONS[section.cat] ? `<span class="rhythiax-changelog-category-icon" aria-hidden="true">${CHANGELOG_CATEGORY_ICONS[section.cat]}</span>` : ''}<span class="rhythiax-changelog-category-title">${RhythiaX.escapeHtml(section.label)}</span><span class="rhythiax-changelog-count">${section.items.length}</span></h3>
        <ul>${section.items.map(itemHtml).join('')}</ul></section>`).join('')
      : `<div class="rhythiax-changelog-empty"><strong>Nothing changed in ${RhythiaX.escapeHtml(RhythiaX.Releases.LOOKS[shownLook]?.label || shownLook)} in this version.</strong><button type="button" class="rhythiax-changelog-retry-btn" data-rhythiax-changelog-look="all">Show all changes</button></div>`;
    return `<div class="rhythiax-changelog-reader">
        ${versionsMarkup(entries, entry)}
        <article class="rhythiax-changelog-entry">
          <header class="rhythiax-changelog-head">
            <div class="rhythiax-changelog-head-text">
              <h2 class="rhythiax-changelog-title" tabindex="-1">${RhythiaX.escapeHtml(entry.version)}${entry.title ? ` <span>${RhythiaX.escapeHtml(entry.title)}</span>` : ''}</h2>
              <div class="rhythiax-changelog-meta"><span>${RhythiaX.escapeHtml(formatDate(entry.date))}</span>${summary ? `<span>${RhythiaX.escapeHtml(summary)}</span>` : ''}${entry.draft ? '<span class="rhythiax-changelog-draft">Draft · not published</span>' : ''}</div>
            </div>
            ${switchHtml}
          </header>
          <div class="rhythiax-changelog-body">${contentHtml}</div>
          <footer class="rhythiax-changelog-steps">${step(entries[index + 1], 'Older')}${step(entries[index - 1], 'Newer')}</footer>
        </article>
      </div>
      ${noteMarkup()}`;
  }

  function panelMarkupKey(entries) {
    if (loadState === 'loading') return 'loading';
    if (loadState === 'error') return `error:${loadError || ''}`;
    if (!entries || !entries.length) return 'empty';
    const entry = currentEntry(entries);
    return entry ? JSON.stringify([entry.version, entry.title, entry.date, entry.content, entries.map(item => item.version).join(), preview, look]) : 'empty';
  }

  function render(entries = []) {
    const focus = focusTitle;
    focusTitle = false;
    ensureReimaginedTab(entries);
    markView();
    if (!isReimaginedView()) {
      removePanel();
      return;
    }
    const articles = officialArticles();
    const host = articles[0]?.parentNode || tabsContainer()?.parentElement;
    if (!host) return;
    let panel = document.querySelector(`.${PANEL_CLASS}`);
    const key = panelMarkupKey(entries);
    if (!panel) {
      panel = document.createElement('section');
      panel.className = PANEL_CLASS;
      panel.dataset.rhythiaxRenderKey = key;
      panel.innerHTML = panelInnerMarkup(entries);
      host.insertBefore(panel, articles[0] || null);
    } else if (panel.dataset.rhythiaxRenderKey !== key) {
      panel.dataset.rhythiaxRenderKey = key;
      panel.innerHTML = panelInnerMarkup(entries);
    }
    if (panel.parentNode !== host) host.insertBefore(panel, articles[0] || null);
    articles.forEach(article => {
      if (article.dataset.rhythiaxChangelogHidden !== 'true') {
        article.dataset.rhythiaxChangelogHidden = 'true';
        article.dataset.rhythiaxChangelogDisplay = article.style.display || '';
      }
      article.style.setProperty('display', 'none', 'important');
    });
    if (focus) panel.querySelector('.rhythiax-changelog-title')?.focus?.({ preventScroll: true });
  }

  function scheduleRender() {
    // Nothing is drawn while Exodus shows the page; the reader starts again when it is handed back.
    if (renderFrame || RhythiaX.ClassicIdle?.isSuspended?.()) return;
    renderFrame = window.requestAnimationFrame(() => {
      renderFrame = null;
      if (!isChangelogRoute()) {
        markView('');
        removePanel();
        return;
      }
      if (loadState === 'idle' && !entryLoadAttached) {
        entryLoadAttached = true;
        loadEntries();
      }
      render(changelogEntries || []);
    });
  }

  function handleClick(event) {
    const lookButton = event.target.closest?.('[data-rhythiax-changelog-look]');
    if (lookButton) {
      event.preventDefault();
      look = lookButton.dataset.rhythiaxChangelogLook;
      render(changelogEntries || []);
      return;
    }
    const retryBtn = event.target.closest?.('.rhythiax-changelog-retry-btn, [data-rhythiax-changelog-retry]');
    if (retryBtn) {
      event.preventDefault();
      loadEntries(true);
      return;
    }
    const tab = event.target.closest?.(`[${TAB_MARKER}]`);
    if (tab) {
      event.preventDefault();
      setView(true);
      render(changelogEntries || []);
      return;
    }
    const nativeTab = event.target.closest?.('#root [data-rhythiax-changelog-tabs] a:not([data-rhythiax-changelog-tab])');
    if (nativeTab) {
      markView('official');
      const container = tabsContainer();
      if (container) {
        container.dataset.rhythiaxChangelogMode = 'official';
        const rTab = container.querySelector(`[${TAB_MARKER}]`);
        if (rTab) {
          rTab.dataset.rhythiaxActive = 'false';
          rTab.classList.remove('bg-white/10', 'text-white');
          rTab.classList.add('text-neutral-400');
          const rBar = getTabIndicatorBar(rTab);
          if (rBar) rBar.style.setProperty('opacity', '0.25', 'important');
        }
        container.querySelectorAll(`a:not([${TAB_MARKER}])`).forEach(t => {
          t.style.removeProperty('background');
          t.style.removeProperty('box-shadow');
          t.style.removeProperty('border-color');
          const b = getTabIndicatorBar(t);
          if (b) b.style.removeProperty('opacity');
        });
      }
      removePanel();
      if (isReimaginedView()) {
        const url = new URL(window.location.href);
        url.searchParams.delete('view');
        url.searchParams.delete('entry');
        window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
      }
    }
    const entryButton = event.target.closest?.('[data-rhythiax-entry]');
    if (entryButton && document.querySelector(`.${PANEL_CLASS}`)) {
      event.preventDefault();
      setView(true, entryButton.dataset.rhythiaxEntry);
      revealEntry();
    }
  }

  // Rhythia's top bar covers this much of the window (pages/changelog.css keeps the same space clear).
  const TOP_BAR = 80;

  // After a step (Older, Newer) or a version from the list, the release opens at its top rather than where the
  // last one was scrolled to, and its title takes the focus once drawn: the clicked button is replaced with it.
  function revealEntry() {
    const top = document.querySelector(`.${PANEL_CLASS} .rhythiax-changelog-entry`)?.getBoundingClientRect?.().top;
    if (Number.isFinite(top) && (top < TOP_BAR || top > window.innerHeight)) {
      const still = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
      window.scrollBy?.({ top: top - TOP_BAR, behavior: still ? 'auto' : 'smooth' });
    }
    focusTitle = true;
  }

  // Capture phase, before Rhythia's own handler routes: a click on Public or Web drops the
  // Reimagined choice first, so nothing puts ?view=reimagined back while the route changes.
  function leaveReimagined(event) {
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    if (!event.target.closest?.('#root [data-rhythiax-changelog-tabs] > a:not([data-rhythiax-changelog-tab])')) return;
    requestedReimagined = false;
    requestedEntry = '';
    markView('official');
  }

  function handlePopState() {
    requestedReimagined = isReimaginedView();
    requestedEntry = new URLSearchParams(window.location.search).get('entry') || '';
    if (isChangelogRoute()) {
      scheduleRender();
    }
  }

  // Native stream navigation replaces the tabs. Restore our tab in the same mutation checkpoint, before paint,
  // rather than waiting for the page injector. Only on /changelog: injectChangelog starts it when the route is
  // reached, and it stops when the route is left.
  function observeTabs() {
    if (tabObserver || !isChangelogRoute() || typeof MutationObserver === 'undefined') return;
    tabObserver = new MutationObserver(() => {
      if (!isChangelogRoute()) return unobserveTabs();
      const container = tabsContainer();
      if (container && !container.querySelector(`[${TAB_MARKER}]`)) {
        ensureReimaginedTab(changelogEntries || []);
      }
    });
    tabObserver.observe(document.body, { childList: true, subtree: true });
  }

  function unobserveTabs() {
    tabObserver?.disconnect();
    tabObserver = null;
  }

  function attachClickListener() {
    observeTabs();
    if (clickListenerAttached) return;
    clickListenerAttached = true;
    document.addEventListener('click', handleClick);
    document.addEventListener('click', leaveReimagined, true);
    window.addEventListener('popstate', handlePopState);
  }

  RhythiaX.injectChangelog = function () {
    if (!isChangelogRoute()) return false;
    attachClickListener();
    if (loadState === 'idle' && !entryLoadAttached) {
      entryLoadAttached = true;
      loadEntries();
    }
    const injected = ensureReimaginedTab(changelogEntries || []);
    markView();
    if (isReimaginedView()) {
      render(changelogEntries || []);
    } else {
      removePanel();
    }
    if (injected) {
      RhythiaX.injected = true;
    }
    return injected;
  };

  RhythiaX.cleanupChangelog = function () {
    if (renderFrame) window.cancelAnimationFrame(renderFrame);
    renderFrame = null;
    if (isChangelogRoute() && requestedReimagined) {
      scheduleRender();
      return;
    }
    if (!isChangelogRoute()) {
      requestedReimagined = false;
      requestedEntry = '';
      markView('');
      unobserveTabs();
    }
    removePanel();
  };

  RhythiaX.ChangelogPageComposition = {
    start() {
      if (RhythiaX.ClassicIdle?.isSuspended?.()) return;
      requestedReimagined = isReimaginedView();
      requestedEntry = requestedReimagined ? new URLSearchParams(window.location.search).get('entry') || '' : '';
      attachClickListener();
      scheduleRender();
    },
    stop() {
      unobserveTabs();
      focusTitle = false;
      markView('');
      requestedReimagined = false;
      requestedEntry = '';
      entryLoadAttached = false;
      loadState = 'idle';
      loadError = null;
      entriesPromise = null;
      changelogEntries = null;
      RhythiaX.cleanupChangelog();
      if (clickListenerAttached) {
        document.removeEventListener('click', handleClick);
        document.removeEventListener('click', leaveReimagined, true);
        window.removeEventListener('popstate', handlePopState);
        clickListenerAttached = false;
      }
    },
    inject: RhythiaX.injectChangelog,
    cleanup: RhythiaX.cleanupChangelog,
    parseChangelogEntries: markdown => RhythiaX.Releases.parse(markdown),
  };

  // Exodus took the page: the reader and its listeners stop. Handed back, they start as on a fresh visit.
  RhythiaX.ClassicIdle?.onSuspend?.(() => RhythiaX.ChangelogPageComposition.stop());
  RhythiaX.ClassicIdle?.onResume?.(() => RhythiaX.ChangelogPageComposition.start());
})();
