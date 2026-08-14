// =============================================
// Rhythia Reimagined - Changelog page
// =============================================

var RhythiaX = RhythiaX || {};
RhythiaX.ChangelogPageComposition?.stop?.();

;(function () {
  'use strict';

  const GITHUB_CHANGELOG_URL = 'https://raw.githubusercontent.com/Rhythia-Reimagined-Extension/Extension/main/changelog.md';
  const VIEW_KEY = 'reimagined';
  const TAB_MARKER = 'data-rhythiax-changelog-tab';
  const PANEL_CLASS = 'rhythiax-changelog-panel';
  let observer = null;
  let renderFrame = null;
  let entriesPromise = null;
  let changelogEntries = null;
  let loadState = 'idle'; // 'idle' | 'loading' | 'loaded' | 'error'
  let loadError = null;
  let entryLoadAttached = false;
  let started = false;
  let initialized = false;
  let domReadyListener = null;
  const historyOriginals = {};
  const historyWrappers = {};

  function isChangelogRoute() {
    return /^\/changelog(?:\/|$)/.test(window.location.pathname);
  }

  function isReimaginedView() {
    return isChangelogRoute() && new URLSearchParams(window.location.search).get('view') === VIEW_KEY;
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

  function inlineMarkdown(value) {
    let html = escapeHtml(value);
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

  const CHANGELOG_CATEGORY_ICONS = {
    added: '<svg viewBox="0 0 24 24" focusable="false"><circle cx="12" cy="12" r="8.25"></circle><path d="M12 8v8M8 12h8"></path><path d="m18.5 3.5.55 1.45 1.45.55-1.45.55-.55 1.45-.55-1.45-1.45-.55 1.45-.55.55-1.45Z"></path></svg>',
    changed: '<svg viewBox="0 0 24 24" focusable="false"><path d="M7 7h9.5l-2.6-2.6M17 17H7.5l2.6 2.6"></path><path d="m16.5 4.4 2.2 2.2-2.2 2.2M7.5 14.8l-2.2 2.2 2.2 2.2"></path></svg>',
    fixed: '<svg viewBox="0 0 24 24" focusable="false"><path d="M12 3.25 19 6v5.1c0 4.15-2.7 7.75-7 9.65-4.3-1.9-7-5.5-7-9.65V6l7-2.75Z"></path><path d="m8.7 12 2.15 2.15 4.5-4.5"></path></svg>',
    notes: '<svg viewBox="0 0 24 24" focusable="false"><path d="M6.5 3.75h8l3 3v13.5h-11V3.75Z"></path><path d="M14.5 3.75v3h3M9 11h6M9 14.5h4"></path></svg>',
    removed: '<svg viewBox="0 0 24 24" focusable="false"><circle cx="12" cy="12" r="8.25"></circle><path d="M8 12h8"></path><path d="m16.5 4.4 2.2 2.2-2.2 2.2"></path></svg>',
    improved: '<svg viewBox="0 0 24 24" focusable="false"><path d="M5 17 10 12l3 3 6-7"></path><path d="M15 8h4v4"></path><path d="m18.5 3.5.55 1.45 1.45.55-1.45.55-.55 1.45-.55-1.45-1.45-.55 1.45-.55.55-1.45Z"></path></svg>',
    security: '<svg viewBox="0 0 24 24" focusable="false"><rect x="5.25" y="10" width="13.5" height="10" rx="2"></rect><path d="M8.25 10V7.5a3.75 3.75 0 0 1 7.5 0V10M12 14v2.5"></path></svg>',
    deprecated: '<svg viewBox="0 0 24 24" focusable="false"><path d="m12 3.75 8.25 15H3.75l8.25-15Z"></path><path d="M12 9v4.25M12 16.5v.1"></path></svg>',
  };

  function changelogCategoryHeading(label, level) {
    const category = String(label || '').trim().replace(/:$/, '').toLowerCase();
    const icon = CHANGELOG_CATEGORY_ICONS[category];
    if (!icon) return `<h${level}>${inlineMarkdown(label)}</h${level}>`;
    return `<h${level} class="rhythiax-changelog-category-heading" data-rhythiax-category="${escapeHtml(category)}"><span class="rhythiax-changelog-category-icon" aria-hidden="true">${icon}</span><span>${inlineMarkdown(label)}</span></h${level}>`;
  }

  function markdownToHtml(markdown) {
    const lines = String(markdown || '').replace(/\r/g, '').split('\n');
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
      const heading = trimmed.match(/^(#{1,3})\s+(.+)$/);
      const unordered = trimmed.match(/^[-+*]\s+(.+)$/);
      const ordered = trimmed.match(/^\d+\.\s+(.+)$/);
      const quote = trimmed.match(/^>\s?(.*)$/);

      if (!trimmed) {
        flushBlocks();
        return;
      }
      if (heading) {
        flushBlocks();
        const level = Math.min(heading[1].length + 1, 4);
        output.push(changelogCategoryHeading(heading[2], level));
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

  function parseChangelogEntries(markdown) {
    const normalized = String(markdown || '').replace(/\r/g, '');
    const lines = normalized.split('\n');
    const entries = [];
    let current = null;
    let currentContent = [];

    function flush() {
      if (current) {
        current.content = currentContent.join('\n').trim();
        entries.push(current);
      }
      current = null;
      currentContent = [];
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const match = line.match(/^##\s+(.+)$/);
      if (match) {
        flush();
        const header = match[1].trim();
        const parts = header.split(/\s+-\s+/);
        const version = parts[0]?.trim() || '';
        let title = '';
        let date = '';

        if (parts.length === 2) {
          if (/^\d{4}-\d{2}-\d{2}$/.test(parts[1].trim())) {
            date = parts[1].trim();
          } else {
            title = parts[1].trim();
          }
        } else if (parts.length >= 3) {
          const last = parts[parts.length - 1].trim();
          if (/^\d{4}-\d{2}-\d{2}$/.test(last)) {
            date = last;
            title = parts.slice(1, -1).join(' - ').trim();
          } else {
            title = parts.slice(1).join(' - ').trim();
          }
        }

        current = {
          version,
          title,
          date,
          listed: true,
        };
      } else if (current) {
        currentContent.push(line);
      }
    }
    flush();
    return entries.filter(isEntryListed).sort(compareEntries);
  }

  function isEntryListed(entry) {
    const raw = entry?.listed ?? entry?.metadata?.listed;
    if (raw === undefined || raw === null || raw === '') return true;
    if (typeof raw === 'boolean') return raw;
    const normalized = String(raw).trim().toLowerCase();
    return !['no', 'false', '0', 'off', 'unlisted', 'draft'].includes(normalized);
  }

  function compareEntries(left, right) {
    const dateCompare = String(right.date || '').localeCompare(String(left.date || ''));
    if (dateCompare) return dateCompare;
    return String(right.version || '').localeCompare(String(left.version || ''), undefined, { numeric: true });
  }

  function loadEntries(force = false) {
    if (!force && entriesPromise) return entriesPromise;
    loadState = 'loading';
    loadError = null;
    scheduleRender();

    const timestamp = Date.now();
    const changelogUrl = `${GITHUB_CHANGELOG_URL}?_t=${timestamp}`;

    entriesPromise = fetch(changelogUrl, { cache: 'no-store' })
      .then(response => {
        if (!response.ok) throw new Error(`Changelog request failed: ${response.status}`);
        return response.text();
      })
      .then(markdown => {
        changelogEntries = parseChangelogEntries(markdown);
        loadState = 'loaded';
        loadError = null;
        scheduleRender();
        return changelogEntries;
      })
      .catch(error => {
        console.warn('[Rhythia Reimagined] Changelog could not be loaded.', error);
        changelogEntries = [];
        loadState = 'error';
        loadError = error?.message || 'Failed to load changelog from GitHub.';
        scheduleRender();
        return [];
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

  function ensureReimaginedTab(entries) {
    const container = tabsContainer();
    if (!container) return;
    container.dataset.rhythiaxChangelogTabs = 'true';
    container.style.setProperty('grid-template-columns', 'repeat(3, minmax(0, 1fr))', 'important');
    const active = isReimaginedView();
    container.dataset.rhythiaxChangelogMode = active ? 'reimagined' : 'official';
    container.querySelectorAll(`a:not([${TAB_MARKER}])`).forEach(tab => {
      if (active) {
        tab.style.setProperty('background', 'transparent', 'important');
        tab.style.setProperty('box-shadow', 'none', 'important');
        tab.style.setProperty('border-color', 'transparent', 'important');
      } else {
        tab.style.removeProperty('background');
        tab.style.removeProperty('box-shadow');
        tab.style.removeProperty('border-color');
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
      if (!source) return;
      tab = source.cloneNode(true);
      Array.from(tab.classList)
        .filter(token => token.startsWith('ring-') || token.startsWith('bg-blue-500/'))
        .forEach(token => tab.classList.remove(token));
      tab.setAttribute(TAB_MARKER, 'true');
      tab.href = '/changelog?view=reimagined';
      const labelNode = Array.from(tab.querySelectorAll('div')).find(node => node.textContent.trim() === 'Public');
      if (labelNode) labelNode.textContent = 'Reimagined';
      container.appendChild(tab);
    }
    updateTabDate(tab, entries[0]?.date || '');
    tab.dataset.rhythiaxActive = active ? 'true' : 'false';
    tab.setAttribute('aria-label', 'Reimagined changelog');
    if (active) tab.setAttribute('aria-current', 'page');
    else tab.removeAttribute('aria-current');
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

  function introMarkup() {
    return `<div class="rhythiax-changelog-intro">
      <div class="rhythiax-changelog-intro-mark" aria-hidden="true"><span></span><span></span><span></span></div>
      <div>
        <div class="rhythiax-changelog-kicker">Rhythia Reimagined</div>
        <h2>Extension changelog</h2>
        <p>Track the latest changes, fixes and experiments shipped with Rhythia Reimagined.</p>
      </div>
      <div class="rhythiax-changelog-disclaimer">This is an unofficial community changelog for Rhythia Reimagined. It is not affiliated with or endorsed by Rhythia or CAPO Games.</div>
    </div>`;
  }

  function panelMarkup(entries) {
    if (loadState === 'loading') {
      return `<section class="${PANEL_CLASS}" data-rhythiax-render-key="loading">
        ${introMarkup()}
        <div class="rhythiax-changelog-empty">
          <div class="rhythiax-changelog-spinner" aria-hidden="true"></div>
          <strong>Loading changelog from GitHub...</strong>
          <span>Fetching the latest release notes and updates.</span>
        </div>
      </section>`;
    }

    if (loadState === 'error') {
      return `<section class="${PANEL_CLASS}" data-rhythiax-render-key="error:${escapeHtml(loadError || '')}">
        ${introMarkup()}
        <div class="rhythiax-changelog-empty">
          <div class="rhythiax-changelog-error-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" focusable="false"><circle cx="12" cy="12" r="9"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
          </div>
          <strong>Unable to load changelog</strong>
          <span>Could not fetch latest release notes from GitHub. Check your internet connection.</span>
          <button type="button" class="rhythiax-changelog-retry-btn" data-rhythiax-changelog-retry="true">
            <svg viewBox="0 0 24 24" focusable="false"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"></path><path d="M16 16h5v5"></path></svg>
            <span>Retry</span>
          </button>
        </div>
      </section>`;
    }

    const entry = currentEntry(entries);
    if (!entry) {
      return `<section class="${PANEL_CLASS}" data-rhythiax-render-key="empty">
        ${introMarkup()}
        <div class="rhythiax-changelog-empty">
          <strong>No Reimagined changelog entries yet.</strong>
          <span>No release notes found on GitHub.</span>
        </div>
      </section>`;
    }

    const index = entries.indexOf(entry);
    const newer = entries[index - 1];
    const older = entries[index + 1];
    const timeline = entries.map(item => `<button type="button" class="rhythiax-changelog-timeline-item${item.version === entry.version ? ' is-selected' : ''}" data-rhythiax-entry="${escapeHtml(item.version)}"><span>${escapeHtml(item.version)}</span><small>${escapeHtml(formatDate(item.date, true))}</small></button>`).join('');
    return `<section class="${PANEL_CLASS}" data-rhythiax-render-key="${escapeHtml(`${entry.version}:${entries.length}`)}">
      ${introMarkup()}
      <div class="rhythiax-changelog-release-nav">
        ${newer ? `<button type="button" class="rhythiax-changelog-arrow" data-rhythiax-entry="${escapeHtml(newer.version)}" aria-label="Newer: ${escapeHtml(formatDate(newer.date))}" title="Newer: ${escapeHtml(formatDate(newer.date))}">&#x2039;</button>` : '<span class="rhythiax-changelog-arrow is-disabled" aria-hidden="true">&#x2039;</span>'}
        <div class="rhythiax-changelog-release-date"><strong>${escapeHtml(formatDate(entry.date))}</strong><span>${escapeHtml(entry.version)}${entry.title ? ` <i>&middot;</i> ${escapeHtml(entry.title)}` : ''}</span></div>
        ${older ? `<button type="button" class="rhythiax-changelog-arrow" data-rhythiax-entry="${escapeHtml(older.version)}" aria-label="Older: ${escapeHtml(formatDate(older.date))}" title="Older: ${escapeHtml(formatDate(older.date))}">&#x203A;</button>` : '<span class="rhythiax-changelog-arrow is-disabled" aria-hidden="true">&#x203A;</span>'}
      </div>
      <article class="rhythiax-changelog-entry">${markdownToHtml(entry.content)}</article>
      <nav class="rhythiax-changelog-timeline" aria-label="Reimagined changelog releases">${timeline}</nav>
    </section>`;
  }

  function panelMarkupKey(entries) {
    if (loadState === 'loading') return 'loading';
    if (loadState === 'error') return `error:${loadError || ''}`;
    if (!entries || !entries.length) return 'empty';
    const entry = currentEntry(entries);
    return entry ? `${entry.version}:${entries.length}` : 'empty';
  }

  function render(entries = []) {
    ensureReimaginedTab(entries);
    if (!isReimaginedView()) {
      removePanel();
      return;
    }
    const articles = officialArticles();
    if (!articles.length) return;
    let panel = document.querySelector(`.${PANEL_CLASS}`);
    const markup = panelMarkup(entries);
    const key = panelMarkupKey(entries);
    if (!panel) {
      panel = document.createElement('div');
      articles[0].parentNode.insertBefore(panel, articles[0]);
    }
    if (panel.dataset.rhythiaxRenderKey !== key) {
      panel.outerHTML = markup;
      panel = document.querySelector(`.${PANEL_CLASS}`);
    }
    articles.forEach(article => {
      if (article.dataset.rhythiaxChangelogHidden !== 'true') {
        article.dataset.rhythiaxChangelogHidden = 'true';
        article.dataset.rhythiaxChangelogDisplay = article.style.display || '';
      }
      article.style.setProperty('display', 'none', 'important');
    });
  }

  function scheduleRender() {
    if (!started) return;
    if (renderFrame) return;
    renderFrame = window.requestAnimationFrame(() => {
      renderFrame = null;
      if (!isChangelogRoute()) {
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
      return;
    }
    const entryButton = event.target.closest?.('[data-rhythiax-entry]');
    if (entryButton && document.querySelector(`.${PANEL_CLASS}`)) {
      event.preventDefault();
      setView(true, entryButton.dataset.rhythiaxEntry);
    }
  }

  function patchHistory() {
    ['pushState', 'replaceState'].forEach(method => {
      const original = window.history[method];
      const wrapped = function () {
        const result = original.apply(this, arguments);
        scheduleRender();
        return result;
      };
      historyOriginals[method] = original;
      historyWrappers[method] = wrapped;
      window.history[method] = wrapped;
    });
    window.addEventListener('popstate', scheduleRender);
    window.addEventListener('hashchange', scheduleRender);
  }

  function init() {
    if (!started || initialized) return;
    initialized = true;
    document.addEventListener('click', handleClick);
    patchHistory();
    observer = new MutationObserver(scheduleRender);
    observer.observe(document.body || document.documentElement, { childList: true, subtree: true });
    scheduleRender();
  }

  RhythiaX.ChangelogPageComposition = {
    start() {
      if (started) return;
      started = true;
      if (document.readyState === 'loading') {
        domReadyListener = () => {
          domReadyListener = null;
          init();
        };
        document.addEventListener('DOMContentLoaded', domReadyListener, { once: true });
      }
      else init();
    },
    stop() {
      started = false;
      initialized = false;
      entryLoadAttached = false;
      loadState = 'idle';
      loadError = null;
      entriesPromise = null;
      changelogEntries = null;
      if (renderFrame) window.cancelAnimationFrame(renderFrame);
      renderFrame = null;
      observer?.disconnect();
      observer = null;
      if (domReadyListener) document.removeEventListener('DOMContentLoaded', domReadyListener);
      domReadyListener = null;
      document.removeEventListener('click', handleClick);
      window.removeEventListener('popstate', scheduleRender);
      window.removeEventListener('hashchange', scheduleRender);
      ['pushState', 'replaceState'].forEach(method => {
        if (window.history[method] === historyWrappers[method]) window.history[method] = historyOriginals[method];
      });
    },
  };
})();
