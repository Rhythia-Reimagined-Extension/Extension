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
  let requestedReimagined = false;
  let requestedEntry = '';

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

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[char]));
  }

  function safeUrl(value) {
    const url = String(value || '').trim();
    return /^https?:\/\//i.test(url) ? url : '#';
  }

  // Section icons and names are shared with the Exodus changelog (shared/releases.js).
  const CHANGELOG_CATEGORY_ICONS = RhythiaX.Releases.ICONS;
  const normalizeCategory = label => RhythiaX.Releases.category(label);

  function inlineMarkdown(value) {
    let html = escapeHtml(value);
    html = html.replace(/^(?:<strong>\[([a-zA-Z0-9\s_-]+)\]<\/strong>|\[([a-zA-Z0-9\s_-]+)\])\s*/i, (match, tag1, tag2) => {
      const rawTag = tag1 || tag2;
      const cat = normalizeCategory(rawTag);
      if (!cat) return match;
      const icon = CHANGELOG_CATEGORY_ICONS[cat];
      return `<span class="rhythiax-changelog-inline-badge" data-rhythiax-category="${cat}">${icon ? `<span class="rhythiax-changelog-inline-icon" aria-hidden="true">${icon}</span>` : ''}<span>${escapeHtml(rawTag)}</span></span> `;
    });
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    html = html.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g, (_, alt, url) => {
      const imageUrl = safeUrl(url);
      return imageUrl === '#' ? '' : `<img src="${escapeHtml(imageUrl)}" alt="${alt}" loading="lazy" decoding="async">`;
    });
    html = html.replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g, (_, label, url) => {
      const linkUrl = safeUrl(url);
      return linkUrl === '#' ? label : `<a href="${escapeHtml(linkUrl)}" target="_blank" rel="noopener noreferrer">${label}</a>`;
    });
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    return html;
  }

  function renderCategoryHeading(label, category, level = 2) {
    const icon = CHANGELOG_CATEGORY_ICONS[category] || '';
    const displayLevel = Math.min(Math.max(level, 2), 4);
    const iconHtml = icon ? `<span class="rhythiax-changelog-category-icon" aria-hidden="true">${icon}</span>` : '';
    return `<h${displayLevel} class="rhythiax-changelog-category-heading" data-rhythiax-category="${escapeHtml(category)}">${iconHtml}<span class="rhythiax-changelog-category-title">${inlineMarkdown(label)}</span></h${displayLevel}>`;
  }

  function renderSectionContent(lines) {
    const output = [];
    let paragraph = [];
    let listType = '';
    let listItems = [];

    function flushParagraph() {
      if (!paragraph.length) return;
      output.push(`<p>${paragraph.map(inlineMarkdown).join('<br>')}</p>`);
      paragraph = [];
    }

    function flushList() {
      if (!listItems.length) return;
      // Keep every entry in the same paragraph layout. A colon in release-note
      // prose should not turn only some entries into separate bold headings.
      output.push(`<${listType}>${listItems.map(item => `<li>${inlineMarkdown(item)}</li>`).join('')}</${listType}>`);
      listItems = [];
      listType = '';
    }

    function flushBlocks() {
      flushParagraph();
      flushList();
    }

    lines.forEach(line => {
      const trimmed = line.trim();
      const unordered = trimmed.match(/^[-+*]\s+(.+)$/);
      const ordered = trimmed.match(/^\d+\.\s+(.+)$/);
      const quote = trimmed.match(/^>\s?(.*)$/);

      if (!trimmed) {
        flushBlocks();
        return;
      }
      if (/^(?:---+|___+|\*\s*\*\s*\*)$/.test(trimmed)) {
        flushBlocks();
        output.push('<hr>');
        return;
      }
      if (unordered || ordered) {
        flushParagraph();
        const nextType = unordered ? 'ul' : 'ol';
        if (listType && listType !== nextType) flushList();
        listType = nextType;
        listItems.push((unordered || ordered)[1]);
        return;
      }
      if (quote) {
        flushBlocks();
        output.push(`<blockquote>${inlineMarkdown(quote[1])}</blockquote>`);
        return;
      }
      flushList();
      paragraph.push(trimmed);
    });

    flushBlocks();
    return output.join('');
  }

  // idPrefix keeps section ids apart when one entry has an Exodus and a Legacy part.
  function markdownToHtml(markdown, idPrefix = '') {
    const lines = String(markdown || '').replace(/\r/g, '').split('\n');
    const sections = [];
    let currentSection = {
      heading: null,
      lines: [],
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      const headingMatch = trimmed.match(/^(#{1,4})\s+(.+)$/);

      if (headingMatch) {
        const level = Math.min(headingMatch[1].length + 1, 4);
        const text = headingMatch[2].trim();
        const category = normalizeCategory(text);

        if (currentSection.heading || currentSection.lines.length > 0) {
          sections.push(currentSection);
        }

        currentSection = {
          heading: { level, text, category },
          lines: [],
        };
      } else {
        currentSection.lines.push(line);
      }
    }

    if (currentSection.heading || currentSection.lines.length > 0) {
      sections.push(currentSection);
    }

    const output = [];

    for (const section of sections) {
      const isMeaningful = section.lines.some(l => {
        const t = l.trim();
        return t && !/^(?:---+|___+|\*\s*\*\s*\*)$/.test(t);
      });

      if (section.heading?.category && !isMeaningful) {
        continue;
      }

      if (section.heading?.category) {
        output.push(`<section class="rhythiax-changelog-section" id="rhythiax-changelog-section-${escapeHtml(idPrefix + section.heading.category)}" data-rhythiax-section="${escapeHtml(section.heading.category)}" data-rhythiax-section-id="${escapeHtml(idPrefix + section.heading.category)}">`);
      }
      if (section.heading) {
        if (section.heading.category) {
          output.push(renderCategoryHeading(section.heading.text, section.heading.category, section.heading.level));
        } else {
          output.push(`<h${section.heading.level}>${inlineMarkdown(section.heading.text)}</h${section.heading.level}>`);
        }
      }

      const contentHtml = renderSectionContent(section.lines);
      if (contentHtml) {
        output.push(contentHtml);
      }
      if (section.heading?.category) output.push('</section>');
    }

    return output.join('');
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
    const publicTab = RhythiaX.ChangelogPageAdapter.query('#root a[href*="/changelog/public"]:not([data-rhythiax-changelog-snapshot])');
    const webTab = RhythiaX.ChangelogPageAdapter.query('#root a[href*="/changelog/web"]:not([data-rhythiax-changelog-snapshot])');
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
    return RhythiaX.ChangelogPageAdapter.queryAll('#root article:not(.rhythiax-changelog-entry):not([data-rhythiax-changelog-snapshot])');
  }

  function removePanel() {
    document.querySelector(`.${PANEL_CLASS}:not([data-rhythiax-changelog-snapshot])`)?.remove();
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
    return '<p class="rhythiax-changelog-note">Unofficial community changelog for the Reimagined for Rhythia extension. Not affiliated with or endorsed by Rhythia or CAPO Games.</p>';
  }

  function stateMarkup(body) {
    return `<article class="rhythiax-changelog-entry is-state"><div class="rhythiax-changelog-empty">${body}</div></article>${noteMarkup()}`;
  }

  function arrow(target, label, glyph) {
    if (!target) return `<span class="rhythiax-changelog-arrow is-disabled" aria-hidden="true">${glyph}</span>`;
    const text = `${label}: ${target.version} (${formatDate(target.date)})`;
    return `<button type="button" class="rhythiax-changelog-arrow" data-rhythiax-entry="${escapeHtml(target.version)}" aria-label="${escapeHtml(text)}" title="${escapeHtml(text)}">${glyph}</button>`;
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
    // An entry split by look shows each part under its own heading, with links to them under the date.
    const groups = entry.groups || [{ engine: '', content: entry.content }];
    const split = groups.some(group => group.engine);
    const lookOf = group => RhythiaX.Releases.LOOKS[group.engine] || RhythiaX.Releases.LOOKS[''];
    const contentHtml = groups.map(group => {
      if (!split) return markdownToHtml(group.content);
      const look = lookOf(group);
      const key = group.engine || 'both';
      return `<section class="rhythiax-changelog-engine" id="rhythiax-changelog-section-look-${escapeHtml(key)}" data-rhythiax-engine="${escapeHtml(key)}"><h3 class="rhythiax-changelog-engine-title"><span class="rhythiax-changelog-engine-icon" aria-hidden="true">${look.icon}</span>${escapeHtml(look.label)}<span class="rhythiax-changelog-engine-blurb">${escapeHtml(look.blurb)}</span></h3>${markdownToHtml(group.content, key + '-')}</section>`;
    }).join('');
    const jump = split ? `<nav class="rhythiax-changelog-jump" aria-label="Parts of this release">${groups.map(group =>
      `<a href="#rhythiax-changelog-section-look-${escapeHtml(group.engine || 'both')}" data-rhythiax-changelog-section-link="look-${escapeHtml(group.engine || 'both')}">${escapeHtml(lookOf(group).label)}</a>`).join('')}</nav>` : '';
    return `<article class="rhythiax-changelog-entry">
        <header class="rhythiax-changelog-head">
          ${arrow(entries[index - 1], 'Newer', '&#x2039;')}
          <div class="rhythiax-changelog-head-text">
            <h2 class="rhythiax-changelog-title">${escapeHtml(entry.title || 'Release notes')}</h2>
            <div class="rhythiax-changelog-meta"><span class="rhythiax-changelog-version">${escapeHtml(entry.version)}</span><span>${escapeHtml(formatDate(entry.date))}</span>${entry.draft ? '<span class="rhythiax-changelog-draft">Draft · only in a copy loaded from a folder</span>' : ''}</div>
            ${jump}
          </div>
          ${arrow(entries[index + 1], 'Older', '&#x203A;')}
        </header>
        <div class="rhythiax-changelog-body">${contentHtml}</div>
      </article>
      ${noteMarkup()}`;
  }

  function panelMarkupKey(entries) {
    if (loadState === 'loading') return 'loading';
    if (loadState === 'error') return `error:${loadError || ''}`;
    if (!entries || !entries.length) return 'empty';
    const entry = currentEntry(entries);
    return entry ? JSON.stringify([entry.version, entry.title, entry.date, entry.content, entries.length, preview]) : 'empty';
  }

  function render(entries = []) {
    ensureReimaginedTab(entries);
    markView();
    if (!isReimaginedView()) {
      removePanel();
      return;
    }
    const articles = officialArticles();
    const host = articles[0]?.parentNode || tabsContainer()?.parentElement;
    if (!host) return;
    let panel = document.querySelector(`.${PANEL_CLASS}:not([data-rhythiax-changelog-snapshot])`);
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
  }

  function scheduleRender() {
    if (renderFrame) return;
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
    const sectionLink = event.target.closest?.('[data-rhythiax-changelog-section-link]');
    if (sectionLink) {
      const section = document.getElementById(`rhythiax-changelog-section-${sectionLink.dataset.rhythiaxChangelogSectionLink}`);
      if (section) {
        event.preventDefault();
        section.scrollIntoView({ block: 'start', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
      }
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
    if (entryButton && document.querySelector(`.${PANEL_CLASS}:not([data-rhythiax-changelog-snapshot])`)) {
      event.preventDefault();
      setView(true, entryButton.dataset.rhythiaxEntry);
    }
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

  function attachClickListener() {
    if (clickListenerAttached) return;
    clickListenerAttached = true;
    document.addEventListener('click', handleClick);
    document.addEventListener('click', leaveReimagined, true);
    window.addEventListener('popstate', handlePopState);
    // Native stream navigation replaces the tabs. Restore our tab in the same
    // mutation checkpoint, before paint, rather than waiting for the page injector.
    tabObserver = new MutationObserver(() => {
      if (!isChangelogRoute()) return;
      const container = tabsContainer();
      if (container && !container.querySelector(`[${TAB_MARKER}]`)) {
        ensureReimaginedTab(changelogEntries || []);
      }
    });
    tabObserver.observe(document.body, { childList: true, subtree: true });
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
    }
    removePanel();
  };

  RhythiaX.ChangelogPageComposition = {
    start() {
      requestedReimagined = isReimaginedView();
      requestedEntry = requestedReimagined ? new URLSearchParams(window.location.search).get('entry') || '' : '';
      attachClickListener();
      scheduleRender();
    },
    stop() {
      tabObserver?.disconnect();
      tabObserver = null;
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
    markdownToHtml,
  };
})();
