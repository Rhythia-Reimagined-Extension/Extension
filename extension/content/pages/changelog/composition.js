// =============================================
// Rhythia Reimagined - Changelog page
// =============================================

var RhythiaX = RhythiaX || {};

;(function () {
  'use strict';

  const GITHUB_CHANGELOG_URL = 'https://raw.githubusercontent.com/Rhythia-Reimagined-Extension/Extension/main/changelog.md';
  const VIEW_KEY = 'reimagined';
  const TAB_MARKER = 'data-rhythiax-changelog-tab';
  const PANEL_CLASS = 'rhythiax-changelog-panel';

  let renderFrame = null;
  let entriesPromise = null;
  let changelogEntries = null;
  let loadState = 'idle'; // 'idle' | 'loading' | 'loaded' | 'error'
  let loadError = null;
  let entryLoadAttached = false;
  let clickListenerAttached = false;

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

  const CHANGELOG_CATEGORY_ICONS = {
    featured: '<svg viewBox="0 0 24 24" focusable="false"><path d="m12 2.5 2.2 5.5 5.8 1.8-4.4 4.1 1.2 5.8-4.8-3.1-4.8 3.1 1.2-5.8-4.4-4.1 5.8-1.8L12 2.5Z"></path><path d="M19.5 3.5v3M21 5h-3M4 17v2M5 18H3"></path></svg>',
    added: '<svg viewBox="0 0 24 24" focusable="false"><circle cx="12" cy="12" r="8.5"></circle><path d="M12 7.75v8.5M7.75 12h8.5"></path><path d="m18.5 3.5.4 1 .1.1 1 .4-1 .4-.1.1-.4 1-.4-1-.1-.1-1-.4 1-.4.1-.1.4-1Z"></path></svg>',
    changed: '<svg viewBox="0 0 24 24" focusable="false"><path d="M21 8H7.5a4.5 4.5 0 0 0 0 9H10"></path><path d="m17.5 4.5 3.5 3.5-3.5 3.5"></path><path d="M3 16h13.5a4.5 4.5 0 0 0 0-9H14"></path><path d="m6.5 19.5-3.5-3.5 3.5-3.5"></path></svg>',
    fixed: '<svg viewBox="0 0 24 24" focusable="false"><path d="M12 2.75 19.25 5.5v5.75c0 4.5-3.1 8.4-7.25 10.25-4.15-1.85-7.25-5.75-7.25-10.25V5.5L12 2.75Z"></path><path d="m8.75 11.75 2.25 2.25 4.5-4.5"></path></svg>',
    notes: '<svg viewBox="0 0 24 24" focusable="false"><path d="M6 3.5h9l4 4V20.5a1.5 1.5 0 0 1-1.5 1.5H6a1.5 1.5 0 0 1-1.5-1.5V5A1.5 1.5 0 0 1 6 3.5Z"></path><path d="M15 3.5v4h4M8.5 11.5h7M8.5 15h5M8.5 8h3"></path></svg>',
    removed: '<svg viewBox="0 0 24 24" focusable="false"><circle cx="12" cy="12" r="8.5"></circle><path d="M7.75 12h8.5"></path><path d="m16 8-8 8"></path></svg>',
    experimental: '<svg viewBox="0 0 24 24" focusable="false"><path d="M9 3.5h6M10 3.5v4.5l-5.3 9.2A2 2 0 0 0 6.44 20.2h11.12a2 2 0 0 0 1.74-3l-5.3-9.2V3.5"></path><path d="M7.5 15.5h9M11 11.5a1 1 0 1 0 2 0 1 1 0 0 0-2 0ZM8.5 17.5a.75.75 0 1 0 1.5 0 .75.75 0 0 0-1.5 0Z"></path></svg>',
    improved: '<svg viewBox="0 0 24 24" focusable="false"><path d="M4 18 10.5 11.5 14 15l6-7"></path><path d="M15.5 8H20v4.5"></path><path d="m19 2.5.3.7.7.3-.7.3-.3.7-.3-.7-.7-.3.7-.3.3-.7Z"></path></svg>',
    security: '<svg viewBox="0 0 24 24" focusable="false"><rect x="4.75" y="10" width="14.5" height="10.5" rx="2.5"></rect><path d="M8 10V6.5a4 4 0 0 1 8 0V10M12 13.75v3"></path></svg>',
    deprecated: '<svg viewBox="0 0 24 24" focusable="false"><path d="m12 3 9 16.5H3L12 3Z"></path><path d="M12 9v4.5M12 16.5v.1"></path></svg>',
  };

  const CATEGORY_ALIASES = {
    featured: 'featured',
    highlights: 'featured',
    highlight: 'featured',
    added: 'added',
    new: 'added',
    changed: 'changed',
    change: 'changed',
    changes: 'changed',
    fixed: 'fixed',
    fix: 'fixed',
    fixes: 'fixed',
    notes: 'notes',
    note: 'notes',
    info: 'notes',
    removed: 'removed',
    experimental: 'experimental',
    experiment: 'experimental',
    experiments: 'experimental',
    lab: 'experimental',
    beta: 'experimental',
    improved: 'improved',
    improvements: 'improved',
    performance: 'improved',
    security: 'security',
    deprecated: 'deprecated',
  };

  function normalizeCategory(label) {
    const clean = String(label || '')
      .trim()
      .toLowerCase()
      .replace(/^#+\s*/, '')
      .replace(/[:\-–—]$/, '')
      .trim();
    return CATEGORY_ALIASES[clean] || (CHANGELOG_CATEGORY_ICONS[clean] ? clean : null);
  }

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

  function markdownToHtml(markdown) {
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
    }

    return output.join('');
  }

  function parseFrontmatterBlock(lines, startIndex) {
    if (lines[startIndex].trim() !== '---') return null;
    let endIndex = -1;
    for (let j = startIndex + 1; j < lines.length; j++) {
      if (lines[j].trim() === '---') {
        endIndex = j;
        break;
      }
    }
    if (endIndex === -1) return null;

    const metadata = {};
    for (let k = startIndex + 1; k < endIndex; k++) {
      const fmatch = lines[k].match(/^([a-zA-Z0-9_-]+)\s*:\s*(.*)$/);
      if (fmatch) {
        const key = fmatch[1].toLowerCase().trim();
        let val = fmatch[2].trim().replace(/^["'](.*)["']$/, '$1');
        metadata[key] = val;
      }
    }

    if (metadata.version || metadata.date || metadata.title) {
      return {
        metadata,
        nextIndex: endIndex,
      };
    }
    return null;
  }

  function extractVersionHeader(line) {
    const headingMatch = line.match(/^#{1,3}\s+(.+)$/);
    if (!headingMatch) return null;
    const text = headingMatch[1].trim();

    if (normalizeCategory(text)) return null;
    if (/^changelog$/i.test(text)) return null;

    const versionMatch = text.match(/(?:^|[\s[])v?(\d+\.\d+(?:\.\d+)?(?:-[a-zA-Z0-9.-]+)?)[\])]?/i);
    if (!versionMatch) return null;

    const version = versionMatch[1];
    let title = '';
    let date = '';

    const dateMatch = text.match(/\b(\d{4}[-.]\d{2}[-.]\d{2})\b/);
    if (dateMatch) {
      date = dateMatch[1].replace(/\./g, '-');
    }

    const parts = text.split(/\s+-\s+/);
    if (parts.length === 2) {
      if (/^\d{4}[-.]\d{2}[-.]\d{2}$/.test(parts[1].trim())) {
        date = parts[1].trim().replace(/\./g, '-');
      } else {
        title = parts[1].trim();
      }
    } else if (parts.length >= 3) {
      const last = parts[parts.length - 1].trim();
      if (/^\d{4}[-.]\d{2}[-.]\d{2}$/.test(last)) {
        date = last.replace(/\./g, '-');
        title = parts.slice(1, -1).join(' - ').trim();
      } else {
        title = parts.slice(1).join(' - ').trim();
      }
    }

    return { version, title, date };
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
      const trimmed = line.trim();

      const fm = trimmed === '---' ? parseFrontmatterBlock(lines, i) : null;
      if (fm) {
        flush();
        const meta = fm.metadata;
        current = {
          version: meta.version ? meta.version.replace(/^v/i, '') : '',
          title: meta.title || '',
          date: meta.date ? meta.date.replace(/\./g, '-') : '',
          listed: isEntryListed(meta),
        };
        i = fm.nextIndex;
        continue;
      }

      const verHeader = extractVersionHeader(line);
      if (verHeader) {
        const hasContent = currentContent.some(l => l.trim().length > 0);
        if (current && (!hasContent || current.version === verHeader.version)) {
          if (!current.version) current.version = verHeader.version;
          if (!current.title && verHeader.title) current.title = verHeader.title;
          if (!current.date && verHeader.date) current.date = verHeader.date;
          continue;
        }

        flush();
        current = {
          version: verHeader.version,
          title: verHeader.title,
          date: verHeader.date,
          listed: true,
        };
        continue;
      }

      if (current) {
        if (/^#\s+Rhythia Reimagined(?:\s+v?\d+.*)?$/i.test(trimmed)) {
          continue;
        }
        currentContent.push(line);
      }
    }
    flush();

    const uniqueEntries = [];
    const seenVersions = new Set();
    for (const entry of entries) {
      if (!entry.version || seenVersions.has(entry.version)) continue;
      seenVersions.add(entry.version);
      uniqueEntries.push(entry);
    }

    return uniqueEntries.filter(isEntryListed).sort(compareEntries);
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
    if (!container) return false;
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
      if (!source) return false;
      tab = source.cloneNode(true);
      Array.from(tab.classList)
        .filter(token => token.startsWith('ring-') || token.startsWith('bg-blue-500/'))
        .forEach(token => tab.classList.remove(token));
      tab.setAttribute(TAB_MARKER, 'true');
      tab.href = '/changelog?view=reimagined';
      const barNode = tab.querySelector('div.rounded-full');
      if (barNode) {
        barNode.className = 'mb-2 h-1 w-full rounded-full';
        barNode.style.background = 'var(--rhythiax-accent, #ec4899)';
      }
      const labelNode = Array.from(tab.querySelectorAll('div')).find(node => node.textContent.trim() === 'Public' || node.textContent.trim() === 'Web')
        || tab.querySelector('.text-base, .font-semibold, .font-bold');
      if (labelNode) labelNode.textContent = 'Reimagined';
      container.appendChild(tab);
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
    return `<section class="${PANEL_CLASS}" data-rhythiax-render-key="${escapeHtml(`${entry.version}:${entries.length}`)}">
      ${introMarkup()}
      <div class="rhythiax-changelog-release-nav">
        ${newer ? `<button type="button" class="rhythiax-changelog-arrow" data-rhythiax-entry="${escapeHtml(newer.version)}" aria-label="Newer: ${escapeHtml(formatDate(newer.date))}" title="Newer: ${escapeHtml(formatDate(newer.date))}">&#x2039;</button>` : '<span class="rhythiax-changelog-arrow is-disabled" aria-hidden="true">&#x2039;</span>'}
        <div class="rhythiax-changelog-release-date"><strong>${escapeHtml(formatDate(entry.date))}</strong><span>${escapeHtml(entry.version)}${entry.title ? ` <i>&middot;</i> ${escapeHtml(entry.title)}` : ''}</span></div>
        ${older ? `<button type="button" class="rhythiax-changelog-arrow" data-rhythiax-entry="${escapeHtml(older.version)}" aria-label="Older: ${escapeHtml(formatDate(older.date))}" title="Older: ${escapeHtml(formatDate(older.date))}">&#x203A;</button>` : '<span class="rhythiax-changelog-arrow is-disabled" aria-hidden="true">&#x203A;</span>'}
      </div>
      <article class="rhythiax-changelog-entry">${markdownToHtml(entry.content)}</article>
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

  function attachClickListener() {
    if (clickListenerAttached) return;
    clickListenerAttached = true;
    document.addEventListener('click', handleClick);
  }

  RhythiaX.injectChangelog = function () {
    if (!isChangelogRoute()) return false;
    attachClickListener();
    if (loadState === 'idle' && !entryLoadAttached) {
      entryLoadAttached = true;
      loadEntries();
    }
    const injected = ensureReimaginedTab(changelogEntries || []);
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
    removePanel();
  };

  RhythiaX.ChangelogPageComposition = {
    start() {
      attachClickListener();
      scheduleRender();
    },
    stop() {
      entryLoadAttached = false;
      loadState = 'idle';
      loadError = null;
      entriesPromise = null;
      changelogEntries = null;
      RhythiaX.cleanupChangelog();
      if (clickListenerAttached) {
        document.removeEventListener('click', handleClick);
        clickListenerAttached = false;
      }
    },
    inject: RhythiaX.injectChangelog,
    cleanup: RhythiaX.cleanupChangelog,
    parseChangelogEntries,
    markdownToHtml,
  };
})();
