// =============================================
// Reimagined for Rhythia — Classic: Install in Atlas
// =============================================
// With "Install in Atlas" on in the popup (modules.atlasLinks), a link to the Atlas app sits next to Rhythia's own
// Download button on /maps/:id and Download all on /collections/:id, dressed like Rhythia's button beside it. The
// link is built by shared/atlas-link.js and opens Atlas through atlas://; the browser asks first.
//
// It follows Rhythia's page from the route observer (content/bootstrap/route-observer.js processMutations) and the
// module settings (core/modules.js applyModuleSettings), and goes away while Exodus shows the page.

var RhythiaX = RhythiaX || {};

(function () {
  'use strict';
  if (RhythiaX.ClassicAtlasLink || typeof document === 'undefined') return;

  const MARK = 'rhythiax-atlas-link';
  // Rhythia's button or link each page gets the link beside, by its text.
  const PAGES = [
    { kind: 'map', path: /^\/maps\/(\d+)\/?$/, native: 'Download' },
    { kind: 'collection', path: /^\/collections\/(\d+)\/?$/, native: 'Download all' },
  ];

  const remove = () => document.querySelectorAll(`.${MARK}`).forEach(el => el.remove());

  function wanted() {
    if (!RhythiaX.AtlasLink || RhythiaX.isModuleEnabled?.('atlasLinks') !== true) return null;
    if (RhythiaX.exodusShowing?.() || RhythiaX.ClassicIdle?.isSuspended?.()) return null;
    for (const page of PAGES) {
      const id = page.path.exec(location.pathname)?.[1];
      const href = id && RhythiaX.AtlasLink.href(page.kind, id);
      if (href) return { page, href };
    }
    return null;
  }

  function refresh() {
    const want = wanted();
    const current = document.querySelector(`.${MARK}`);
    if (!want) { if (current) remove(); return; }
    // A button on a collection, a link on a map page.
    const native = [...document.querySelectorAll('#root button, #root a')]
      .find(b => !b.classList.contains(MARK) && b.textContent.trim() === want.page.native);
    if (!native) { if (current) remove(); return; }
    if (current && current.getAttribute('href') === want.href && current.previousElementSibling === native) return;
    if (current) remove();
    const link = document.createElement('a');
    // Rhythia's own button classes, so the link matches the row it joins.
    link.className = `${native.className} ${MARK}`;
    link.href = want.href;
    link.title = RhythiaX.AtlasLink.TIP;
    link.textContent = RhythiaX.AtlasLink.LABEL;
    // Marked as Classic's own, so the route observer does not take its insertion for a change of Rhythia's page.
    link.dataset.rhythiaxEnhanced = 'true';
    native.after(link);
  }

  RhythiaX.ClassicIdle?.onSuspend?.(remove);
  RhythiaX.ClassicIdle?.onResume?.(refresh);

  RhythiaX.ClassicAtlasLink = { refresh };
})();
