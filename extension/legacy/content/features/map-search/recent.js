// =============================================
// Reimagined for Rhythia — Classic recent searches
// =============================================
// Rhythia's own search (the Search button, or Ctrl K) lists the last 5 players, maps and clans opened from it while
// its box is empty, with Clear. Kept in this browser only (Rhythia's site storage), as in Exodus. Idle while
// Exodus shows the page.

var RhythiaX = RhythiaX || {};

(function () {
  if (RhythiaX.ClassicFindRecent) return;
  const KEY = 'rhythiax_classic_find_recent';
  const MAX = 5;
  const KINDS = { player: ['/player/', 'Player'], beatmap: ['/maps/', 'Map'], clan: ['/clans/', 'Clan'] };
  const esc = value => RhythiaX.escapeHtml(String(value ?? ''));

  function read() {
    try {
      const list = JSON.parse(localStorage.getItem(KEY) || '[]');
      return Array.isArray(list) ? list.filter(x => x && KINDS[x.k] && /^\d{1,9}$/.test(String(x.id))).slice(0, MAX) : [];
    } catch (_) { return []; }
  }
  function remember(item) {
    const list = [item, ...read().filter(x => !(x.k === item.k && String(x.id) === String(item.id)))].slice(0, MAX);
    try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (_) {}
  }

  // A result Rhythia lists: data-value "player-7655" or "beatmap-12974", its name and its picture.
  function itemOf(node) {
    const m = String(node?.getAttribute('data-value') || '').match(/^(player|beatmap|clan)-(\d{1,9})$/);
    if (!m) return null;
    const name = node.querySelector('span:not(:has(img))')?.textContent.trim() || node.textContent.trim();
    const img = node.querySelector('img')?.getAttribute('src') || '';
    return { k: m[1], id: m[2], name: name.slice(0, 120), img: /^https:\/\//.test(img) ? img.slice(0, 600) : '' };
  }

  function draw(root) {
    if (RhythiaX.exodusShowing?.()) return;
    const input = root.querySelector('[cmdk-input]'), sizer = root.querySelector('[cmdk-list-sizer]');
    if (!input || !sizer) return;
    const list = input.value.trim() ? [] : read();
    let box = sizer.querySelector('.rhythiax-find-recent');
    if (!list.length) { box?.remove(); return; }
    if (!box) {
      box = document.createElement('div');
      box.className = 'rhythiax-find-recent';
      sizer.prepend(box);
    }
    box.innerHTML = `<div class="rhythiax-find-recent-head"><span>Recent</span><button type="button" data-find-recent-clear>Clear</button></div>
      ${list.map(x => `<a class="rhythiax-find-recent-item" href="${KINDS[x.k][0]}${esc(x.id)}">${x.img ? `<img src="${esc(x.img)}" alt="">` : '<i></i>'}<span><b>${esc(x.name)}</b><small>${KINDS[x.k][1]}</small></span></a>`).join('')}`;
  }

  // Rhythia's search opens as a popover added to the page; it is drawn into when it opens and as its box changes.
  const observer = new MutationObserver(() => {
    if (RhythiaX.exodusShowing?.()) return;
    const root = document.querySelector('[cmdk-root]');
    if (root && !root.querySelector('.rhythiax-find-recent') && !root.querySelector('[cmdk-input]')?.value.trim()) draw(root);
  });
  function start() {
    if (!document.body) return void document.addEventListener('DOMContentLoaded', start, { once: true });
    observer.observe(document.body, { childList: true, subtree: true });
    document.addEventListener('input', event => {
      const root = event.target.closest?.('[cmdk-root]');
      if (root && event.target.matches('[cmdk-input]')) draw(root);
    }, true);
    // A result opened with a click or with Enter is remembered.
    document.addEventListener('click', event => {
      if (RhythiaX.exodusShowing?.()) return;
      if (event.target.closest('[data-find-recent-clear]')) {
        try { localStorage.removeItem(KEY); } catch (_) {}
        const root = event.target.closest('[cmdk-root]');
        root?.querySelector('.rhythiax-find-recent')?.remove();
        return;
      }
      const item = itemOf(event.target.closest('[cmdk-root] [cmdk-item]'));
      if (item) remember(item);
    }, true);
    document.addEventListener('keydown', event => {
      if (event.key !== 'Enter' || RhythiaX.exodusShowing?.() || !event.target.matches?.('[cmdk-input]')) return;
      const item = itemOf(event.target.closest('[cmdk-root]')?.querySelector('[cmdk-item][data-selected="true"]'));
      if (item) remember(item);
    }, true);
  }
  start();

  RhythiaX.ClassicFindRecent = { read, KEY };
})();
