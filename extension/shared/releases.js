// =============================================
// Reimagined for Rhythia — release notes
// =============================================
// This extension's own release notes, for the changelog of both looks. The background reads them
// (background.js, 'rhythiax-releases'): the changelog.md packaged with this version, plus the online
// copy, which wins for the same version. Loaded from a folder (a development install), the local
// file is all there is, drafts included, so a release can be previewed before it is published.
//
// An entry can split its notes by look: a "# Exodus" or "# Classic" heading starts that look's part.
// "# Legacy" also means Classic; the code keeps Classic's folder name, legacy.
// Notes before the first such heading belong to both.
//
// Both changelogs show them the same way: a list of versions beside one release, a switch between the looks
// (sections, forLook; the reader's own look first), sections such as "## Featured" with the same icon
// (category, ICONS), and a list item written "- Title: text" with its title in bold.

var RhythiaX = RhythiaX || {};

RhythiaX.Releases = RhythiaX.Releases || (function () {
  'use strict';

  const ENGINES = { exodus: 'Exodus', legacy: 'Classic' };
  // The name each changelog shows for a look's part (LOOKS[look].label).
  const LOOKS = {
    exodus: { label: ENGINES.exodus },
    legacy: { label: ENGINES.legacy },
  };
  const ICONS = {
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
  const ALIASES = {
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
  // "Featured", "## Fixes:" … → 'featured', 'fixed' …; null for any other heading.
  function category(label) {
    const clean = String(label || '').trim().toLowerCase().replace(/^#+\s*/, '').replace(/[:\-–—]$/, '').trim();
    return ALIASES[clean] || (ICONS[clean] ? clean : null);
  }
  // "- Faster pages: Profiles …" → "- **Faster pages** Profiles …". Only a short title (up to 7 words) counts,
  // and not one that starts like a change ("Added date formats: …"), so plain sentences stay as written.
  const titled = text => text.replace(/^(\s*[-*]\s+)(?!(?:Added|Removed|Fixed|Updated|Replaced|Changed|Reduced|Restored)\b)([A-Z0-9][^:\n*`[\]]{1,48}?):\s+(?=\S)/gm,
    (m, lead, title) => (title.trim().split(/\s+/).length <= 7 ? lead + '**' + title.trim() + '** ' : m));
  const HIDDEN = ['no', 'false', '0', 'off', 'unlisted'];

  // Each release starts with a front matter block (version, date, title, listed), then its notes.
  // listed: draft shows only in a development install.
  function parse(markdown, { drafts = false } = {}) {
    const lines = String(markdown || '').replace(/\r/g, '').split('\n'), out = [];
    let cur = null, body = [];
    const flush = () => { if (cur) out.push({ ...cur, content: body.join('\n').trim(), groups: groups(body) }); cur = null; body = []; };
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim() === '---') {
        const end = lines.findIndex((l, j) => j > i && l.trim() === '---');
        const meta = {};
        if (end > 0) for (const l of lines.slice(i + 1, end)) { const m = l.match(/^([\w-]+)\s*:\s*(.*)$/); if (m) meta[m[1].toLowerCase()] = m[2].trim().replace(/^["'](.*)["']$/, '$1'); }
        if (meta.version || meta.date || meta.title) {
          flush();
          const listed = String(meta.listed ?? '').trim().toLowerCase();
          cur = { version: String(meta.version || '').replace(/^v/i, ''), title: meta.title || '', date: String(meta.date || '').replace(/\./g, '-'),
            draft: listed === 'draft', listed: !HIDDEN.includes(listed) && listed !== 'draft' };
          i = end;
          continue;
        }
      }
      if (!cur) continue;
      // The "## 1.2.1 - Title - date" heading that repeats the front matter is left out.
      if (!body.some(l => l.trim()) && /^#{1,6}\s/.test(lines[i]) && cur.version && lines[i].includes(cur.version)) continue;
      body.push(lines[i]);
    }
    flush();
    return out.filter(e => e.version && (e.listed || (drafts && e.draft)));
  }

  // [{engine: 'exodus' | 'legacy' | '', label, content}] in the order written.
  function groups(lines) {
    const out = [{ engine: '', label: '', lines: [] }];
    for (const line of lines) {
      const m = line.match(/^#\s+(Exodus|Classic|Legacy)\s*$/i);
      const engine = m && (m[1].toLowerCase() === 'exodus' ? 'exodus' : 'legacy');
      if (m) out.push({ engine, label: ENGINES[engine], lines: [] });
      else out[out.length - 1].lines.push(line);
    }
    return out.map(g => ({ engine: g.engine, label: g.label, content: titled(g.lines.join('\n').trim()) })).filter(g => g.content);
  }

  // One release for the version reader of both changelogs: its sections in the usual order, each item with the
  // look it belongs to ('' for both). Sections of the same kind from each look's part are merged, and an item
  // written the same way under Exodus and under Classic is listed once, for both.
  const ORDER = ['featured', 'added', 'changed', 'improved', 'fixed', 'removed', 'security', 'deprecated', 'experimental', 'notes'];
  const LABELS = { featured: 'Featured', added: 'Added', changed: 'Changed', improved: 'Improved', fixed: 'Fixed', removed: 'Removed',
    security: 'Security', deprecated: 'Deprecated', experimental: 'Experimental', notes: 'Notes' };
  function sections(entry) {
    const groups = entry?.groups?.length ? entry.groups : [{ engine: '', content: entry?.content || '' }];
    const map = new Map();
    const section = (key, label) => map.get(key) || map.set(key, { cat: category(key) ? key : '', label, items: [] }).get(key);
    for (const group of groups) {
      let current = null, item = null;
      for (const line of String(group.content || '').split('\n')) {
        const heading = line.match(/^#{1,6}\s+(.+?)\s*$/);
        if (heading) {
          const cat = category(heading[1]);
          current = section(cat || heading[1].toLowerCase(), cat ? LABELS[cat] || heading[1] : heading[1]);
          item = null;
          continue;
        }
        if (!line.trim() || /^(?:---+|___+)$/.test(line.trim())) { item = null; continue; }
        const bullet = line.match(/^[-*+]\s+(.*)$/);
        if (item && !bullet && /^\s/.test(line)) { item.text += ' ' + line.trim(); continue; }
        current = current || section('notes', LABELS.notes);
        item = { text: bullet ? bullet[1].trim() : line.trim(), look: group.engine || '' };
        current.items.push(item);
      }
    }
    const list = [...map.values()].filter(s => s.items.length);
    for (const s of list) {
      const seen = new Map();
      s.items = s.items.filter(i => {
        const twin = seen.get(i.text);
        if (!twin) { seen.set(i.text, i); return true; }
        if (twin.look !== i.look) twin.look = '';
        return false;
      });
    }
    const rank = s => (ORDER.includes(s.cat) ? ORDER.indexOf(s.cat) : ORDER.length - 1.5);
    return list.map((s, i) => ({ s, i })).sort((a, b) => rank(a.s) - rank(b.s) || a.i - b.i).map(x => x.s);
  }
  // The looks a release has its own notes for (['exodus', 'legacy'] or one of them); none before 1.3.0.
  const looksOf = entry => ['exodus', 'legacy'].filter(look => entry?.groups?.some(g => g.engine === look));
  // The sections one look sees ('all' keeps every item), and the empty ones dropped.
  const forLook = (list, look) => list.map(s => ({ ...s, items: s.items.filter(i => look === 'all' || !i.look || i.look === look) })).filter(s => s.items.length);
  // "5 added · 3 changed · 2 fixed" for the header of a release.
  const summary = list => list.filter(s => ['added', 'changed', 'improved', 'fixed', 'removed'].includes(s.cat))
    .map(s => `${s.items.length} ${s.label.toLowerCase()}`).join(' · ');

  // The first list wins for a version it has.
  function merge(primary, secondary) {
    const seen = new Set(), all = [];
    for (const e of [...primary, ...secondary]) if (e?.version && !seen.has(e.version)) { seen.add(e.version); all.push(e); }
    return all.sort((a, b) => String(b.date).localeCompare(String(a.date)) || String(b.version).localeCompare(String(a.version), undefined, { numeric: true }));
  }

  let asked = null;
  // {list, preview}: preview is true in a development install, where only the local file is shown.
  function load() {
    return asked || (asked = Promise.resolve(chrome.runtime.sendMessage({ type: 'rhythiax-releases' }))
      .then(r => {
        if (!r || typeof r.local !== 'string') throw new Error('No release notes');
        const local = parse(r.local, { drafts: r.dev });
        return { preview: Boolean(r.dev), list: r.online ? merge(parse(r.online), local) : merge(local, []) };
      })
      .catch(error => { asked = null; throw error; }));
  }
  const entries = () => load().then(r => r.list);

  return { entries, load, parse, merge, category, sections, looksOf, forLook, summary, ENGINES, LOOKS, ICONS };
})();
