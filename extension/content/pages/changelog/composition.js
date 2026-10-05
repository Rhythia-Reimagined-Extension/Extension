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
  let tabObserver = null;
  let viewTransition = null;
  let requestedReimagined = false;
  let requestedEntry = '';

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

      if (section.heading?.category) {
        output.push(`<section class="rhythiax-changelog-section" id="rhythiax-changelog-section-${escapeHtml(section.heading.category)}" data-rhythiax-section="${escapeHtml(section.heading.category)}">`);
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

  const BUNDLED_CHANGELOG_MARKDOWN = `# Changelog

All notable user-facing changes are documented in this file.

---
version: 1.2.0
date: 2026-10-01
title: Going Online
listed: yes
---

## 1.2.0 - Going Online - 2026-10-01

## Featured

- Back in business: Adapted profiles, stats, score cards, Friends, themes, and session handling to Rhythia's updated website. Finally...
- Going online: Added a connection to my community history server. Instead of relying only on records collected in your own browser, you can also load available ranking history for the top 1,000 players and additional discovered profiles.
- Reimagined Score Cards: Replaced the Modern/Legacy card choices with three new designs and optional background artwork. Rebuilt the profile score browser with search and numbered pages at the top and bottom. Pick your favorite look, then actually find the score you're looking for.
- Reimagined Playstyle: Replaced the separate Rating and Tempo profiles with a Playstyle view: a player summary, standout plays, and speed and accuracy-grade breakdowns with score counts.
- Reimagined Title Progression: Rebuilt the progression view with a map-like layout and title milestones. More fun to look at, more Reimagined...
- Reimagined Compare: Rebuilt the comparison view with clearer stat differences and a layout for 2 players. The previous version allowed 4.
- Reimagined Popup: Replaced the old popup with a simpler layout and reorganized settings. Again... Hopefully this one gets to stay for a while.

## Added

- Added three history source choices for the new server connection: Cloud Only, Cloud + Local, and Local Only.
- Added an online-history setup card and separate controls for using community history and reporting profile visits. Connections start after your choice; visit reporting requires a separate opt-in.
- Added a connection log in the popup for the new history server: viewed profile, request status, and response time. It shows whether that profile's online history loaded, is missing from the server, or could not be reached.
- Added date-format settings: YYYY-MM-DD, MM-DD-YYYY, and DD-MM-YYYY for score cards and history views.

## Improved

- Expanded the existing Rhythia API integration to load profile details, pinned scores, and more score collections. Added shared caching and request deduplication to avoid fetching the same data repeatedly.
- Reworked profile navigation and loading to reduce flickering and unnecessary rebuilds, and to keep late responses and cached records attached to the correct player.
- Reworked White theme contrast, colors, and readability across cards and pages. White theme needed some love too.
- Polished transitions and glowing accents in Dark and Reimagined themes.
- Improved player and mapper name detection, including profile details fetched for Compare.

## Changed

- Reduced the Compare limit from 4 players to 2.
- Replaced configurable local-history retention and storage limits with fixed limits of 90 days and 25 MB. The previous default storage limit was 300 MB.
- Reorganized profile statistics into dedicated history, ranking, and Playstyle views.

## Fixed

- Updated profile detection and RP/rank extraction for Rhythia's changed page layout.
- Restored profile statistics, score-card enhancements, and Friends controls for the updated website.
- Updated authentication handling for Rhythia's changed login system.

## Removed

- Removed the old backup, restore, and JSON import/export tools. Files you already exported stay where you saved them.
- Removed the protected-profile list and its cleanup exceptions, including protection of your own profile.
- Removed the separate saved Title Progression state used by the old progression view.

## Notes

- Online History & Accuracy: Going online came with a few compromises. The new server history covers ranking and RP; online accuracy history isn't ready for 1.2.0 yet. Your local accuracy history still works. I'm working on the online part, but I didn't want to keep the whole update waiting for it. Yet... is the important word here.
- Why only 2 players in Compare? I think 2 is enough to keep the comparison useful and readable. But I'm open to suggestions if you have a reason to compare more.
- A little Playstyle backstory: The old Rating and Tempo profiles weren't telling you as much as I wanted. I almost removed them... Then it struck me: why don't we make them actually useful? So they grew into Playstyle instead.
- And yes, the popup got remade again: The previous versions were either too complicated, hard to read, or just didn't feel right for the extension. We'll see how long this one lasts...
- Community history depends on the records available on the server. Opting into visit reports helps the server discover additional profiles; it doesn't guarantee history for every visited player.
- Updates keep valid local history and privacy choices. Older local history can be cleaned up under the new limits. Clear Cache asks before removing all local profile history and cached online history.
- Local Only disables all outgoing requests to rhythia.shuriel.com.

---
version: 1.1.0
date: 2026-08-21
title: UI Polish & Stability
listed: yes
---

## 1.1.0 - UI Polish & Stability - 2026-08-21

## Featured

- Redesigned the Title Progression bar with smoother animations.
- Reworked profile score cards to be more compact, added a scaled accuracy bar, and added an option to keep using the classic layout.
- Cleaned up unused scripts and old styles to make pages load faster.
- Updated the extension icons.

## Added

- Added an option in popup settings to switch between compact score cards and the classic layout.
- Added smooth transitions when switching tabs between Reigning, Top, and Recent scores.
- Added a toggle in popup settings to turn off Easter eggs if you don't want them.
- The in-page Changelog now pulls update notes directly from GitHub so they're always current.

## Improved

- Stat history on profiles now shows the last 7 entries with a "Show more" button so it doesn't stretch the page.
- Switching themes is now instant without page stutter.
- Improved spacing and number formatting in stats history.
- Polished Rating and Tempo Profile cards with better contrast and layout.
- You can now press Escape to close popups and modals.

## Changed

- Clearer highlights on active score collection tabs.
- Advanced Stats now uses the new card layout for Rating and Tempo profiles by default.
- Removed unnecessary browser permissions.

## Fixed

- Fixed broken numbers and calculations caused by commas and thousand separators.
- Fixed green/red change colors (+/-) in stat history looking wrong on certain themes.
- Fixed contrast and readability issues on White and Reimagined themes.
- Fixed daily stat history skipping entries when days roll over at midnight.
- Fixed Title Progression rank not loading on some profiles.
- Fixed score cards breaking after recent Rhythia website updates.
- Fixed score filters (grade/speed) resetting when loading more scores or switching tabs.
- Fixed backup files not restoring saved settings.
- Fixed profile and friends list sometimes failing to load on first visit.

## Removed

- Removed old tools from the \`/scores\` page since Rhythia no longer links to it from profiles (theme styling is still kept if you visit it directly).
- Removed the old external catalog integration as it was barely used and slowed down navigation.
- Removed the extension badge in the bottom-right corner to keep the screen clean.
- Removed the old changelog timeline bar for a simpler layout.
- Removed unused background scripts and old CSS files.

## Notes

- Behind the scenes, the project was reorganized, cleaned up, and moved to the new GitHub organization.
- Your saved settings and profile history won't be lost with this update.
- The extension source code is open at [GitHub Extension Repository](https://github.com/Rhythia-Reimagined-Extension/Extension).

---
version: 1.0.1
date: 2026-08-09
title: Release Fixes
listed: yes
---

## 1.0.1 - Release Fixes - 2026-08-09

## Fixed

- Watch Replay and Download Replay work reliably again from score cards.
- Score cards no longer show controls that do not apply to the current score.
- Profile history and Title Progression now stay in sync after profile updates.
- Score cards and statistics panels open, close, and resize correctly.
- The home promo video now fills the available space across all themes.
- The changelog and About page now keep their layout and colors consistent across themes.
- Player Compare no longer shows an empty panel during profile loading.
- Score-tab transitions between Reigning, Top, and Recent Scores now animate correctly without briefly showing unstyled cards.

## Changed

- Related statistics panels now use the same compact layout and start collapsed.
- Score-card arrows, headings, and contrast are easier to read.
- The extension requests less browser access while profile and friend features continue to work normally.
- Changelog categories now have clear visual icons.
- About links are grouped into Extension & Feedback and Community & Project sections.
- The current extension version is shown once in the popup instead of being repeated in About.
- Privacy is now linked from the popup footer.
- Country flags show full country names and direct leaderboard links.
- In Player Compare, Clear removes all selected players without closing the panel. Use × to close it.

## Notes

- This is a focused post-release update for score cards, profiles, progression, and Player Compare. Saved profile data and settings remain unchanged.
- The official [Chrome Web Store listing](https://chromewebstore.google.com/detail/rhythia-reimagined/ekjfnmfocjohkiieakohbnagjcdbfolb) is now available for installation.

---
version: 1.0.0
date: 2026-08-06
title: Initial release
listed: yes
---

## 1.0.0 - Initial release - 2026-08-06

## Added

- Added a customizable popup where features, themes, and display preferences can be managed in one place.
- Added Reimagined, Dark, and White themes.
- Added a richer profile overview with progression, performance trends, ranking history, and daily history.
- Added clearer score cards with the details that matter at a glance, including accuracy, mods, notes, RP, misses, dates, and replay actions.
- Added tools for searching, sorting, comparing, copying, and exporting scores.
- Added player comparison and extra map and performance insights.
- Added local history management, profile protection, backups, restore, and offline data import and export.
- Added the Reimagined changelog with release navigation and grouped release notes.

## Changed

- Reworked profile and score pages to make important information easier to scan, with collapsible sections and flexible layouts.

## Fixed

- This was the first release, so no earlier user-facing issues were included here.

## Notes

- The first release of Rhythia Reimagined. The main features can be enabled or disabled from the extension popup, so the experience can stay as focused or as feature-rich as you prefer.
- See [Installation](INSTALLATION.md) and [Data and Sync](DATA-AND-SYNC.md) for current usage information. This 1.0.0 entry describes backup features available at that release.
`;

  function mergeChangelogEntries(primary, secondary) {
    const combined = [...(primary || [])];
    const seen = new Set(combined.map(e => e.version));
    for (const item of (secondary || [])) {
      if (item && item.version && !seen.has(item.version)) {
        combined.push(item);
        seen.add(item.version);
      }
    }
    return combined.filter(isEntryListed).sort(compareEntries);
  }

  function loadEntries(force = false) {
    if (!force && entriesPromise) return entriesPromise;

    // Immediately seed from bundled changelog so current release entries are available instantly
    if (!changelogEntries || !changelogEntries.length) {
      changelogEntries = parseChangelogEntries(BUNDLED_CHANGELOG_MARKDOWN);
    }
    loadState = 'loaded';
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
        const remoteEntries = parseChangelogEntries(markdown);
        const bundledEntries = parseChangelogEntries(BUNDLED_CHANGELOG_MARKDOWN);
        // Online entries override the bundled copy of the same release, including its date.
        changelogEntries = mergeChangelogEntries(remoteEntries, bundledEntries);
        loadState = 'loaded';
        loadError = null;
        scheduleRender();
        return changelogEntries;
      })
      .catch(error => {
        console.warn('[Rhythia Reimagined] Remote changelog fetch fallback to bundled.', error);
        if (!changelogEntries || !changelogEntries.length) {
          changelogEntries = parseChangelogEntries(BUNDLED_CHANGELOG_MARKDOWN);
        }
        loadState = 'loaded';
        loadError = null;
        scheduleRender();
        return changelogEntries;
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

  function endViewTransition() {
    const transition = viewTransition;
    if (!transition) return;
    viewTransition = null;
    transition.observer.disconnect();
    clearTimeout(transition.timeout);
    cancelAnimationFrame(transition.frame);
    transition.host.style.minHeight = transition.minHeight;
    transition.host.style.position = transition.position;
    transition.overlay.remove();
    transition.tabOverlay.remove();
    window.removeEventListener('wheel', transition.cancelScroll);
    window.removeEventListener('touchmove', transition.cancelScroll);
    if (transition.preserveScroll && isChangelogRoute()) {
      const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      window.scrollTo({ top: Math.min(transition.scrollY, maxScroll), behavior: 'instant' });
    }
  }

  function beginViewTransition(event) {
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    const tab = event.target.closest?.('#root [data-rhythiax-changelog-tabs] > a');
    const tabs = tabsContainer();
    if (!tab || !tabs || !isChangelogRoute()) return;
    const reimagined = tab.hasAttribute(TAB_MARKER);
    if (!reimagined) {
      requestedReimagined = false;
      requestedEntry = '';
    }
    if (reimagined && isReimaginedView()) return;
    endViewTransition();
    const panel = document.querySelector(`.${PANEL_CLASS}:not([data-rhythiax-changelog-snapshot])`);
    const outgoing = isReimaginedView() && panel ? [panel] : officialArticles();
    if (!outgoing.length) return;
    const contentHost = tabs.parentElement;
    const host = document.getElementById('root');
    if (!host || !contentHost || outgoing.some(node => node.parentElement !== contentHost)) return;
    const hostRect = host.getBoundingClientRect();
    const firstRect = outgoing[0].getBoundingClientRect();
    const overlay = document.createElement('div');
    overlay.className = 'rhythiax-changelog-transition';
    overlay.setAttribute('aria-hidden', 'true');
    overlay.inert = true;
    overlay.style.top = `${firstRect.top - hostRect.top + host.scrollTop}px`;
    overlay.style.left = `${firstRect.left - hostRect.left}px`;
    overlay.style.right = 'auto';
    overlay.style.width = `${firstRect.width}px`;
    outgoing.forEach(node => {
      const clone = node.cloneNode(true);
      clone.setAttribute('data-rhythiax-changelog-snapshot', 'true');
      clone.querySelectorAll('[id]').forEach(child => child.removeAttribute('id'));
      clone.removeAttribute('id');
      [clone, ...clone.querySelectorAll('article')].forEach(article => {
        if (article.tagName === 'ARTICLE') article.setAttribute('data-rhythiax-changelog-snapshot', 'true');
      });
      overlay.appendChild(clone);
    });
    const tabRect = tabs.getBoundingClientRect();
    const tabOverlay = document.createElement('div');
    tabOverlay.className = 'rhythiax-changelog-transition';
    tabOverlay.setAttribute('aria-hidden', 'true');
    tabOverlay.inert = true;
    tabOverlay.style.top = `${tabRect.top - hostRect.top + host.scrollTop}px`;
    tabOverlay.style.left = `${tabRect.left - hostRect.left}px`;
    tabOverlay.style.right = 'auto';
    tabOverlay.style.width = `${tabRect.width}px`;
    const tabSnapshot = tabs.cloneNode(true);
    [tabSnapshot, ...tabSnapshot.querySelectorAll('*')].forEach(node => {
      node.removeAttribute('id');
      node.setAttribute('data-rhythiax-changelog-snapshot', 'true');
    });
    tabOverlay.appendChild(tabSnapshot);
    const transition = { host, overlay, tabOverlay, minHeight: host.style.minHeight, position: host.style.position, scrollY: window.scrollY, preserveScroll: true, frame: null, observer: null, timeout: null };
    transition.cancelScroll = () => { transition.preserveScroll = false; };
    window.addEventListener('wheel', transition.cancelScroll, { passive: true });
    window.addEventListener('touchmove', transition.cancelScroll, { passive: true });
    const targetPath = new URL(tab.href, location.href).pathname;
    function checkReady() {
      if (viewTransition !== transition) return;
      if (!host.isConnected || !isChangelogRoute()) return endViewTransition();
      if (transition.preserveScroll && window.scrollY !== transition.scrollY) {
        window.scrollTo({ top: transition.scrollY, behavior: 'instant' });
      }
      const ready = reimagined
        ? isReimaginedView() && document.querySelector(`.${PANEL_CLASS}:not([data-rhythiax-changelog-snapshot])`)
        : !isReimaginedView() && location.pathname.startsWith(`${targetPath}/`) && tabsContainer()?.querySelector(`[${TAB_MARKER}]`) && officialArticles().some(article => article.textContent.trim().length > 80);
      if (!ready || transition.frame) return;
      transition.frame = requestAnimationFrame(() => {
        transition.frame = null;
        endViewTransition();
      });
    }
    transition.observer = new MutationObserver(checkReady);
    viewTransition = transition;
    host.style.position = 'relative';
    host.style.minHeight = `${hostRect.height}px`;
    host.appendChild(overlay);
    host.appendChild(tabOverlay);
    transition.observer.observe(host, { childList: true, subtree: true, characterData: true });
    transition.timeout = setTimeout(endViewTransition, 2500);
    requestAnimationFrame(checkReady);
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

  function panelInnerMarkup(entries) {
    if (loadState === 'loading') {
      return `${introMarkup()}
        <div class="rhythiax-changelog-empty">
          <div class="rhythiax-changelog-spinner" aria-hidden="true"></div>
          <strong>Loading changelog from GitHub...</strong>
          <span>Fetching the latest release notes and updates.</span>
        </div>`;
    }

    if (loadState === 'error') {
      return `${introMarkup()}
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
        </div>`;
    }

    const entry = currentEntry(entries);
    if (!entry) {
      return `${introMarkup()}
        <div class="rhythiax-changelog-empty">
          <strong>No Reimagined changelog entries yet.</strong>
          <span>No release notes found on GitHub.</span>
        </div>`;
    }

    const index = entries.indexOf(entry);
    const newer = entries[index - 1];
    const older = entries[index + 1];
    const contentHtml = markdownToHtml(entry.content);
    const categories = [...contentHtml.matchAll(/data-rhythiax-section="([^"]+)">([\s\S]*?)<\/section>/g)].map(match => ({ category: match[1], count: (match[2].match(/<li>/g) || []).length }));
    const contentsNav = categories.map(({ category, count }) => {
      const label = category.charAt(0).toUpperCase() + category.slice(1);
      return `<a href="#rhythiax-changelog-section-${escapeHtml(category)}" data-rhythiax-changelog-section-link="${escapeHtml(category)}"><span>${escapeHtml(label)}</span> <span class="rhythiax-changelog-section-count">(${count})</span></a>`;
    }).join('');
    return `${introMarkup()}
      <div class="rhythiax-changelog-release-nav">
        ${newer ? `<button type="button" class="rhythiax-changelog-arrow" data-rhythiax-entry="${escapeHtml(newer.version)}" aria-label="Newer: ${escapeHtml(formatDate(newer.date))}" title="Newer: ${escapeHtml(formatDate(newer.date))}">&#x2039;</button>` : '<span class="rhythiax-changelog-arrow is-disabled" aria-hidden="true">&#x2039;</span>'}
        <div class="rhythiax-changelog-release-date"><span class="rhythiax-changelog-release-version">${escapeHtml(entry.version)}</span><strong>${escapeHtml(entry.title || 'Release notes')}</strong><span class="rhythiax-changelog-release-meta">${escapeHtml(formatDate(entry.date))}</span></div>
        ${older ? `<button type="button" class="rhythiax-changelog-arrow" data-rhythiax-entry="${escapeHtml(older.version)}" aria-label="Older: ${escapeHtml(formatDate(older.date))}" title="Older: ${escapeHtml(formatDate(older.date))}">&#x203A;</button>` : '<span class="rhythiax-changelog-arrow is-disabled" aria-hidden="true">&#x203A;</span>'}
      </div>
      <div class="rhythiax-changelog-reading-layout">
        <nav class="rhythiax-changelog-contents" aria-label="Release note categories"><span>In this release</span>${contentsNav}</nav>
        <article class="rhythiax-changelog-entry">${contentHtml}</article>
      </div>`;
  }

  function panelMarkupKey(entries) {
    if (loadState === 'loading') return 'loading';
    if (loadState === 'error') return `error:${loadError || ''}`;
    if (!entries || !entries.length) return 'empty';
    const entry = currentEntry(entries);
    return entry ? JSON.stringify([entry.version, entry.title, entry.date, entry.content, entries.length]) : 'empty';
  }

  function render(entries = []) {
    ensureReimaginedTab(entries);
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
    document.addEventListener('click', beginViewTransition, true);
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
      endViewTransition();
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
      requestedReimagined = false;
      requestedEntry = '';
      endViewTransition();
      entryLoadAttached = false;
      loadState = 'idle';
      loadError = null;
      entriesPromise = null;
      changelogEntries = null;
      RhythiaX.cleanupChangelog();
      if (clickListenerAttached) {
        document.removeEventListener('click', handleClick);
        document.removeEventListener('click', beginViewTransition, true);
        window.removeEventListener('popstate', handlePopState);
        clickListenerAttached = false;
      }
    },
    inject: RhythiaX.injectChangelog,
    cleanup: RhythiaX.cleanupChangelog,
    parseChangelogEntries,
    markdownToHtml,
  };
})();
