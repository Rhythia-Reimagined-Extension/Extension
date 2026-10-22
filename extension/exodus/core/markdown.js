// =============================================
// Reimagined for Rhythia — Exodus Markdown
// =============================================
// The wiki and the changelog are Markdown (Rhythia's own files and entries, and this
// extension's changelog); they are drawn by this small renderer, which keeps to what those
// texts use and the short list of HTML Rhythia allows.

var RhythiaX = RhythiaX || {};

RhythiaX.ExodusMarkdown = (function () {
'use strict';
const {SITE, esc, slugify} = RhythiaX.ExodusKit;

/* ════════════════════ Markdown ════════════════════ */
// The HTML Rhythia's wiki allows, with the attributes each tag may keep.
const TAGS = {
  a: ['href', 'target'], b: [], br: [], code: [], details: [], div: [], em: [], h1: [], h2: [], h3: [], h4: [], hr: [], i: [], kbd: [],
  img: ['alt', 'height', 'loading', 'src', 'width'], li: [], ol: ['start'], p: [], pre: [], s: [], small: [], source: ['media', 'src', 'type'], span: [],
  strong: [], sub: [], summary: [], sup: [], table: [], tbody: [], td: [], th: [], thead: [], tr: [], u: [], ul: [],
  video: ['controls', 'height', 'loop', 'muted', 'playsinline', 'poster', 'preload', 'src', 'width'],
};
const safeUrl = (u, link) => { const m = String(u || '').trim().replace(/[\u0000-\u001F\u007F\s]+/g, '').match(/^([a-z][a-z0-9+.-]*):/i); return !m || (link ? ['http', 'https', 'mailto'] : ['http', 'https']).includes(m[1].toLowerCase()); };
// Wiki pictures live under /wiki/public/src on Rhythia's site.
const asset = u => (/^\/src\//.test(u) ? `${SITE}/wiki/public${u}` : /^\//.test(u) ? SITE + u : u);
function sanitize(html, opts) {
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
  const walk = node => {
    for (const el of [...node.children]) {
      const tag = el.tagName.toLowerCase(), keep = TAGS[tag];
      if (!keep) { el.remove(); continue; }
      for (const a of [...el.attributes]) {
        const n = a.name.toLowerCase();
        if (!(n === 'class' || n.startsWith('aria-') || keep.includes(n))) { el.removeAttribute(a.name); continue; }
        if (['href', 'src', 'poster'].includes(n)) { if (!safeUrl(a.value, n === 'href')) el.removeAttribute(a.name); else el.setAttribute(n, n === 'href' ? a.value : asset(a.value)); }
      }
      if (tag === 'a') opts.link(el);
      if (tag === 'img') el.setAttribute('loading', 'lazy');
      walk(el);
    }
  };
  walk(doc.body);
  return doc.body.innerHTML;
}
function inline(text, opts) {
  const keep = [];
  const hold = h => `\u0000${keep.push(h) - 1}\u0000`;
  let s = String(text).replace(/`([^`]+)`/g, (_, c) => hold(`<code>${esc(c)}</code>`));
  s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g, (_, alt, src) => hold(safeUrl(src) ? `<img src="${esc(asset(src))}" alt="${esc(alt)}" loading="lazy">` : esc(alt)));
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g, (_, label, href) => hold(opts.linkHtml(href, inline(label, opts))));
  s = s.replace(/<br\s*\/?>/gi, () => hold('<br>'));
  s = esc(s)
    .replace(/(^|[\s(])(https?:\/\/[^\s<)]+)/g, (_, pre, url) => `${pre}${opts.linkHtml(url.replace(/&amp;/g, '&'), url)}`)
    .replace(/\*\*([^*]+)\*\*|__([^_]+)__/g, (_, a, b) => `<strong>${a || b}</strong>`)
    .replace(/(^|[^*\w])\*([^*\s][^*]*?)\*(?!\*)|(^|[^_\w])_([^_\s][^_]*?)_(?!\w)/g, (m, p1, a, p2, b) => `${p1 ?? p2 ?? ''}<em>${a || b}</em>`)
    .replace(/~~([^~]+)~~/g, '<s>$1</s>');
  return s.replace(/\u0000(\d+)\u0000/g, (_, i) => keep[Number(i)]);
}
const BOX = {tip: 'Tip', info: 'Info', note: 'Note', warning: 'Warning', caution: 'Warning', danger: 'Danger', important: 'Note', details: 'Details'};
function blocks(lines, opts) {
  const out = [];
  const isStart = l => /^\s*(#{1,6}\s|```|~~~|>|\||(-{3,}|\*{3,})\s*$|[-*+]\s|\d+[.)]\s|<(div|p|img|video|table|details|br)\b)/i.test(l);
  for (let i = 0; i < lines.length;) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    let m;
    if ((m = line.match(/^\s*(`{3,}|~{3,})\s*([\w-]*)/))) {
      const fence = m[1], body = [];
      for (i++; i < lines.length && !lines[i].trim().startsWith(fence); i++) body.push(lines[i]);
      i++;
      out.push(`<pre><code${m[2] ? ` data-lang="${esc(m[2])}"` : ''}>${esc(body.join('\n'))}</code></pre>`);
      continue;
    }
    if ((m = line.match(/^(#{1,6})\s+(.*?)\s*#*\s*$/))) {
      const n = Math.min(4, m[1].length), plain = m[2].replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/[*_`~]/g, '').trim();
      out.push(`<h${n} id="${esc(opts.idPrefix + slugify(plain))}">${inline(m[2], opts)}</h${n}>`);
      i++; continue;
    }
    if (/^\s*(-{3,}|\*{3,})\s*$/.test(line)) { out.push('<hr>'); i++; continue; }
    if (/^\s*>/.test(line)) {
      const body = [];
      for (; i < lines.length && /^\s*>/.test(lines[i]); i++) body.push(lines[i].replace(/^\s*>\s?/, ''));
      const kind = body[0]?.match(/^\[!(\w+)\]\s*$/)?.[1]?.toLowerCase();
      if (kind) {
        const inner = blocks(body.slice(1), opts), label = BOX[kind] || kind[0].toUpperCase() + kind.slice(1);
        out.push(kind === 'details' ? `<details class="md-box details"><summary>${esc(label)}</summary>${inner}</details>` : `<div class="md-box ${esc(BOX[kind] ? kind : 'note')}"><span class="md-box-l">${esc(label)}</span>${inner}</div>`);
      } else out.push(`<blockquote>${blocks(body, opts)}</blockquote>`);
      continue;
    }
    if (/^\s*\|/.test(line) && /^\s*\|?\s*:?-{2,}/.test(lines[i + 1] || '')) {
      const cells = l => l.trim().replace(/^\||\|$/g, '').split(/(?<!\\)\|/).map(c => c.trim().replace(/\\\|/g, '|'));
      const head = cells(line), align = cells(lines[i + 1]).map(c => (/^:-+:$/.test(c) ? 'center' : /-+:$/.test(c) ? 'right' : ''));
      const rows = [];
      for (i += 2; i < lines.length && /^\s*\|/.test(lines[i]); i++) rows.push(cells(lines[i]));
      const td = (tag, c, k) => `<${tag}${align[k] ? ` style="text-align:${align[k]}"` : ''}>${inline(c, opts)}</${tag}>`;
      out.push(`<div class="md-table"><table><thead><tr>${head.map((c, k) => td('th', c, k)).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${head.map((_, k) => td('td', r[k] || '', k)).join('')}</tr>`).join('')}</tbody></table></div>`);
      continue;
    }
    if (/^\s*([-*+]|\d+[.)])\s+/.test(line)) {
      const body = [];
      for (; i < lines.length && (lines[i].trim() === '' ? /^\s+([-*+]|\d+[.)])\s|^\s{2,}\S/.test(lines[i + 1] || '') : (/^\s*([-*+]|\d+[.)])\s+/.test(lines[i]) || /^\s{2,}\S/.test(lines[i]))); i++) body.push(lines[i]);
      out.push(list(body, opts));
      continue;
    }
    if (/^\s*<(div|p|img|video|table|details)\b/i.test(line)) {
      const body = [];
      for (; i < lines.length && lines[i].trim(); i++) body.push(lines[i]);
      out.push(`<div class="md-html">${sanitize(body.join('\n'), opts)}</div>`);
      continue;
    }
    const para = [];
    for (; i < lines.length && lines[i].trim() && !(para.length && isStart(lines[i])); i++) para.push(lines[i].trim());
    out.push(`<p>${inline(para.join('\n'), opts).replace(/\n/g, ' ')}</p>`);
  }
  return out.join('');
}
function list(lines, opts) {
  const indent = l => l.match(/^\s*/)[0].replace(/\t/g, '    ').length;
  const base = indent(lines[0]), ordered = /^\s*\d+[.)]/.test(lines[0]), start = ordered ? parseInt(lines[0], 10) : 1;
  const items = [];
  for (const l of lines) {
    if (indent(l) <= base && /^\s*([-*+]|\d+[.)])\s+/.test(l)) items.push([l.replace(/^\s*([-*+]|\d+[.)])\s+/, '')]);
    else if (items.length) items[items.length - 1].push(l);
  }
  const li = it => {
    const [first, ...rest] = it, sub = rest.filter(l => l.trim());
    const nested = sub.length && /^\s*([-*+]|\d+[.)])\s+/.test(sub[0]) ? list(sub, opts) : sub.length ? `<p>${inline(sub.map(l => l.trim()).join(' '), opts)}</p>` : '';
    const task = first.match(/^\[( |x)\]\s+/i);
    return `<li${task ? ' class="md-task"' : ''}>${task ? `<i class="md-check ${task[1].trim() ? 'on' : ''}" aria-hidden="true"></i>` : ''}${inline(task ? first.slice(task[0].length) : first, opts)}${nested}</li>`;
  };
  return ordered ? `<ol${start !== 1 ? ` start="${start}"` : ''}>${items.map(li).join('')}</ol>` : `<ul>${items.map(li).join('')}</ul>`;
}
// opts.href(href) → {href, internal} lets the wiki turn its relative .md links into wiki pages.
function md(text, opts = {}) {
  const o = {idPrefix: opts.idPrefix || '', href: opts.href || (h => ({href: h}))};
  o.linkHtml = (href, label) => {
    if (!safeUrl(href, true)) return label;
    const r = o.href(href);
    const ext = /^(https?:|mailto:)/i.test(r.href) && !r.href.startsWith(SITE);
    return `<a href="${esc(r.href)}"${ext ? ' target="_blank" rel="noopener noreferrer"' : ''}>${label}</a>`;
  };
  o.link = a => {
    const h = a.getAttribute('href'); if (!h) return;
    const r = o.href(h); a.setAttribute('href', r.href);
    if (/^(https?:|mailto:)/i.test(r.href) && !r.href.startsWith(SITE)) { a.setAttribute('target', '_blank'); a.setAttribute('rel', 'noopener noreferrer'); } else a.removeAttribute('target');
  };
  const src = String(text || '').replace(/\r/g, '').replace(/^---\s*\n[\s\S]*?\n---\s*\n/, '')
    // VitePress boxes (::: tip … :::) read as the same boxes as > [!TIP].
    .replace(/:::\s*([a-zA-Z]+)[^\n]*\n([\s\S]*?)\n:::/g, (_, kind, body) => [`> [!${kind.toUpperCase()}]`, ...body.replace(/^\n+|\n+$/g, '').split('\n').map(l => `> ${l}`)].join('\n'));
  return blocks(src.split('\n'), o);
}


const css = `
.md{color:var(--text-2);line-height:1.7;font-size:15px;overflow-wrap:anywhere}
.md > :first-child{margin-top:0}
.md h1,.md h2,.md h3,.md h4{color:var(--text);line-height:1.25;scroll-margin-top:90px}
.md h1{font-size:26px;margin:30px 0 12px;font-weight:800}
.md h2{font-size:22px;margin:30px 0 10px;font-weight:750}
.md h3{font-size:18px;margin:24px 0 8px;font-weight:700}
.md h4{font-size:15.5px;margin:20px 0 6px;font-weight:700}
.md p{margin:0 0 14px}
.md a{color:var(--accent-2);font-weight:600;text-decoration:underline;text-decoration-color:color-mix(in srgb,var(--accent-2) 40%,transparent);text-underline-offset:3px}
.md a:hover{text-decoration-color:currentColor}
.md strong{color:var(--text)}
.md ul,.md ol{margin:0 0 14px;padding-left:24px}
.md li{margin:4px 0}
.md li > p{margin:4px 0}
.md li::marker{color:var(--muted)}
.md .md-task{list-style:none;margin-left:-20px;display:flex;gap:8px;align-items:baseline}
.md .md-check{flex:none;width:13px;height:13px;border-radius:4px;box-shadow:inset 0 0 0 1.5px var(--muted);transform:translateY(2px)}
.md .md-check.on{background:var(--accent);box-shadow:none}
.md code{padding:1px 6px;border-radius:6px;background:var(--panel-3);color:var(--text);font:500 .88em ui-monospace,SFMono-Regular,Consolas,monospace}
.md pre{margin:0 0 16px;padding:14px 16px;border-radius:12px;background:var(--field);box-shadow:inset 0 0 0 1px var(--line);overflow:auto}
.md pre code{padding:0;background:none;font-size:13px;line-height:1.6}
.md hr{border:0;border-top:1px solid var(--line);margin:24px 0}
.md blockquote{margin:0 0 14px;padding:4px 0 4px 16px;border-left:3px solid var(--line-2)}
.md img{display:block;max-width:100%;height:auto;margin:12px 0;border-radius:10px}
.md video{display:block;max-width:100%;border-radius:10px;margin:12px 0}
.md .md-table{margin:0 0 16px;overflow-x:auto;border-radius:12px;box-shadow:inset 0 0 0 1px var(--line)}
.md table{width:100%;border-collapse:collapse;font-size:14px}
.md th{text-align:left;padding:10px 14px;color:var(--text);font-weight:650;background:var(--panel-2)}
.md td{padding:9px 14px;border-top:1px solid var(--line);vertical-align:top}
.md-box{margin:0 0 16px;padding:12px 16px;border-radius:12px;background:var(--panel);border-left:3px solid var(--c);box-shadow:inset 0 0 0 1px var(--line);--c:var(--muted)}
.md-box.tip{--c:#34d399}.md-box.info,.md-box.note,.md-box.important{--c:#60a5fa}.md-box.warning,.md-box.caution{--c:#f59e0b}.md-box.danger{--c:#f87171}
.md-box-l{display:block;margin-bottom:4px;font-size:11.5px;font-weight:750;letter-spacing:.06em;text-transform:uppercase;color:var(--c)}
.md-box > :last-child{margin-bottom:0}
details.md-box summary{cursor:pointer;font-weight:650;color:var(--text)}
details.md-box[open] summary{margin-bottom:8px}
.md .pattern-row{display:grid;grid-template-columns:160px minmax(0,1fr);gap:18px;align-items:center;margin:0 0 16px}
.md .pattern-row img{margin:0;width:160px}
.md .pattern-row p{margin:0}
`;

return {md, css};
})();
