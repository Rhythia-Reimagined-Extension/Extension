// =============================================
// Rhythia X — Accordion (Title Progression)
// =============================================

var RhythiaX = RhythiaX || {};

// ─── Wrap Title Progression in accordion ──────
// @param {number|string} [rp] — current RP value (optional, falls back to DOM)
// @param {number|string} [globalRank] — global rank, used for Grandmaster
RhythiaX.wrapTitleProgression = function (rp, globalRank) {
  if (!RhythiaX.isModuleEnabled('titleProgression')) return;
  // Broad search for any element whose trimmed text equals "title progression"
  const candidates = RhythiaX.qsa('h2, h3, h4, div, span, p');
  let titleEl = null;
  for (const el of candidates) {
    // Only check leaf-ish elements (no nested children with their own text blocks)
    const txt = (el.textContent || '').trim();
    if (txt.toLowerCase() === 'title progression') {
      titleEl = el;
      break;
    }
  }
  if (!titleEl) {
    RhythiaX.log('Title Progression heading not found');
    return;
  }
  if (titleEl.closest('.rhythiax-accordion')) return;
  RhythiaX.log('Found Title Progression element:', titleEl.tagName, titleEl.className);

  // Walk up to find the outer card container (has overflow-hidden + rounded + border)
  let outerCard = titleEl.parentElement;
  let safety = 0;
  while (outerCard && safety < 8) {
    const cls = outerCard.className || '';
    if (/overflow-hidden/.test(cls) && /rounded/i.test(cls) && /border/i.test(cls)) break;
    outerCard = outerCard.parentElement;
    safety++;
  }
  if (!outerCard || safety >= 8) {
    RhythiaX.log('Could not find outer card container for Title Progression');
    return;
  }

  // The site changed this row from flex-wrap to flex-nowrap and added the
  // Progress/History switch. Resolve it from the heading instead of relying
  // on the old utility-class combination.
  let headerRow = null;
  for (let node = titleEl; node && node !== outerCard; node = node.parentElement) {
    const className = String(node.className || '');
    if (/justify-between/.test(className) && /border-b/.test(className)) {
      headerRow = node;
      break;
    }
  }
  headerRow = headerRow || outerCard.querySelector('.flex-wrap.items-center.justify-between, .flex-nowrap.items-center.justify-between');
  if (!headerRow) {
    RhythiaX.log('Could not find header row in Title Progression card');
    return;
  }

  // Remove overflow-hidden so the accordion body isn't clipped, but remember
  // whether it was actually present for an exact cleanup restore.
  const hadOverflowHidden = outerCard.classList.contains('overflow-hidden');
  outerCard.classList.remove('overflow-hidden');
  if (hadOverflowHidden) outerCard.setAttribute('data-rhythiax-original-overflow', 'true');

  // Keep the original React-managed node. Cloning this row copies the visual
  // markup but loses the Progress/History event handlers from the site.
  const originalHeader = headerRow;
  originalHeader.setAttribute('data-rhythiax-original-header', 'true');
  originalHeader.setAttribute('data-rhythiax-original-display', originalHeader.style.display || '');

  // The collapsed accordion is the compact Title Progression summary. When
  // it opens, show the useful native history chart directly instead of a
  // second nested Title Progression header with another pair of tabs.
  const historyButton = Array.from(originalHeader.querySelectorAll('button')).find(button => (
    button.textContent.trim().toLowerCase() === 'history'
  ));
  if (historyButton?.getAttribute('aria-pressed') !== 'true') historyButton?.click();
  originalHeader.style.display = 'none';

  // Get current RP — prefer passed value, then sidebar-scoped DOM search, then global fallback
  let currentRp = RhythiaX.parseLocalizedNumber(rp);
  if (currentRp === 0) {
    const sidebar = RhythiaX.qs('.lg\\:col-span-3');
    const rpEl = sidebar ? sidebar.querySelector('[class*="text-4xl"]') : null;
    if (rpEl) {
      currentRp = RhythiaX.parseLocalizedNumber(rpEl.textContent);
    }
    // Fallback: scan sidebar text for "RP" label + value
    if (currentRp === 0 && sidebar) {
      const lines = sidebar.textContent.split('\n').map(function (l) { return l.trim(); }).filter(Boolean);
      for (var i = 0; i < lines.length; i++) {
        if (lines[i] === 'RP' && i + 1 < lines.length) {
          currentRp = RhythiaX.parseLocalizedNumber(lines[i + 1]);
          break;
        }
      }
    }
    // The updated profile keeps Rhythm Points in the official Stats rows.
    if (currentRp === 0) {
      const statsBox = RhythiaX.findOfficialStatsContainer?.();
      const rpRow = statsBox && RhythiaX.qsa('.space-y-3 > div', statsBox).find(row => (
        row.children[0]?.textContent?.trim().toLowerCase() === 'rhythm points'
        || row.children[0]?.textContent?.trim().toLowerCase() === 'weighted rp'
      ));
      const value = rpRow?.children?.[rpRow.children.length - 1]?.textContent;
      if (value) currentRp = RhythiaX.parseLocalizedNumber(value);
    }
  }
  RhythiaX.log('wrapTitleProgression: currentRp =', currentRp);

  // Create clickable accordion header
  const accordionHeader = document.createElement('div');
  accordionHeader.className = 'rhythiax-accordion-header';
  accordionHeader.tabIndex = 0;
  accordionHeader.setAttribute('role', 'button');
  accordionHeader.setAttribute('aria-expanded', 'false');

  // ── Top row: title + arrow ──
  const headerTopRow = document.createElement('div');
  headerTopRow.style.cssText = 'display:flex;align-items:center;justify-content:space-between;width:100%;';

  const headerLeft = document.createElement('div');
  headerLeft.className = 'flex items-center gap-1.5';

  const originalIcon = headerRow.querySelector('svg');
  if (originalIcon) headerLeft.appendChild(originalIcon.cloneNode(true));

  const titleSpan = document.createElement('span');
  titleSpan.className = 'rhythiax-accordion-title';
  titleSpan.textContent = 'Title Progression';
  headerLeft.appendChild(titleSpan);

  const arrowSpan = document.createElement('span');
  arrowSpan.className = 'rhythiax-accordion-arrow';
  // Lucide-style chevron-right — rotated 90deg on expand to become chevron-down
  arrowSpan.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>';

  headerTopRow.appendChild(headerLeft);
  headerTopRow.appendChild(arrowSpan);

  accordionHeader.appendChild(headerTopRow);

  // ── Rank path mini-bar (visible only when collapsed) ──
  const rankPathBar = RhythiaX.buildRankProgressBar(currentRp, globalRank);
  if (rankPathBar) accordionHeader.appendChild(rankPathBar);

  // ── Assemble ──
  // Insert the injected header beside the native row. The remaining original
  // children are moved as an ordered sequence below, preserving their exact
  // card hierarchy for cleanup.
  headerRow.parentElement.insertBefore(accordionHeader, headerRow);

  // Everything remaining inside outerCard becomes the collapsible body
  const body = document.createElement('div');
  body.className = 'rhythiax-accordion-body';
  const bodyInner = document.createElement('div');
  bodyInner.className = 'rhythiax-accordion-body-inner';
  body.appendChild(bodyInner);
  Array.from(outerCard.children)
    .filter(child => child !== accordionHeader)
    .forEach(child => bodyInner.appendChild(child));

  outerCard.appendChild(accordionHeader);
  outerCard.appendChild(body);

  // Add accordion classes on the outerCard itself
  outerCard.classList.add('rhythiax-accordion', 'rhythiax-accordion-collapsed');

  function animateBody(open) {
    body.removeEventListener('transitionend', body._rhythiaxTransitionEnd);
    window.cancelAnimationFrame(body._rhythiaxAnimationFrame);
    const animationToken = (body._rhythiaxAnimationToken || 0) + 1;
    body._rhythiaxAnimationToken = animationToken;
    const currentHeight = body.getBoundingClientRect().height;
    const targetHeight = open ? bodyInner.scrollHeight : 0;
    body.style.height = `${currentHeight}px`;
    body.offsetHeight;
    body._rhythiaxAnimationFrame = requestAnimationFrame(() => { body.style.height = `${targetHeight}px`; });
    const finish = event => {
      if (event.propertyName !== 'height' || body._rhythiaxAnimationToken !== animationToken) return;
      body.removeEventListener('transitionend', finish);
      if (body._rhythiaxTransitionEnd === finish) body._rhythiaxTransitionEnd = null;
      if (open) body.style.height = 'auto';
    };
    body._rhythiaxTransitionEnd = finish;
    body.addEventListener('transitionend', finish);
  }

  // Toggle
  let isCollapsed = true;
  accordionHeader.addEventListener('click', (e) => {
    e.stopPropagation();
    isCollapsed = !isCollapsed;
    animateBody(!isCollapsed);
    outerCard.classList.toggle('rhythiax-accordion-collapsed', isCollapsed);
    outerCard.classList.toggle('rhythiax-accordion-expanded', !isCollapsed);
    arrowSpan.style.transform = isCollapsed ? '' : 'rotate(90deg)';
    accordionHeader.setAttribute('aria-expanded', String(!isCollapsed));
    // When expanding, force Recharts to re-measure (container was display:none)
    if (!isCollapsed) {
      // Use rAF to ensure DOM has reflowed, then trigger resize
      outerCard._rhythiaxResizeFrame = requestAnimationFrame(function () {
        outerCard._rhythiaxResizeFrame = requestAnimationFrame(function () {
          window.dispatchEvent(new Event('resize'));
        });
      });
    }
  });
  accordionHeader.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      accordionHeader.click();
    }
  });
  outerCard._rhythiaxAccordionCleanup = function () {
    body.removeEventListener('transitionend', body._rhythiaxTransitionEnd);
    window.cancelAnimationFrame(body._rhythiaxAnimationFrame);
    window.cancelAnimationFrame(outerCard._rhythiaxResizeFrame);
    body._rhythiaxTransitionEnd = null;
  };
};
