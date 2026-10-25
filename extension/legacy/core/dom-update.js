// =============================================
// Reimagined for Rhythia — updating the page in place
// =============================================

var RhythiaX = RhythiaX || {};

// Runs fn once, a frame after Rhythia changes something under root (children, class or aria state),
// or after timeoutMs when nothing changes. Used instead of trying again at fixed delays after a click.
RhythiaX.afterNativeChange = function (root, fn, timeoutMs = 1000) {
  if (!root || typeof MutationObserver === 'undefined') { fn(); return; }
  let done = false, frame = false;
  const finish = () => {
    if (done) return;
    done = true;
    observer.disconnect();
    clearTimeout(timer);
    fn();
  };
  const observer = new MutationObserver(() => {
    if (frame) return;
    frame = true;
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(finish);
    else setTimeout(finish, 0);
  });
  observer.observe(root, { subtree: true, childList: true, attributes: true, attributeFilter: ['class', 'aria-selected', 'aria-pressed', 'data-state'] });
  const timer = setTimeout(finish, timeoutMs);
};

// Writes markup into el only when it differs from what was written there last time and the nodes
// written then are still in place. An unchanged render keeps its nodes (focus, hover, open state,
// running animations, listeners on children). Returns true when it wrote.
RhythiaX.setMarkup = function (el, html) {
  if (!el) return false;
  const last = el._rhythiaxMarkup;
  const count = () => el.childNodes?.length ?? 0;
  if (last && last.html === html && last.first === el.firstChild && last.count === count()) return false;
  el.innerHTML = html;
  el._rhythiaxMarkup = { html, first: el.firstChild, count: count() };
  return true;
};
