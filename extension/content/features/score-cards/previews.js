// ============================================================================
// Rhythia Reimagined — Score Card Previews (Artwork & Metadata Resolver)
// ============================================================================

var RhythiaX = RhythiaX || {};

(function () {
  'use strict';

  const pendingPreviews = new WeakMap();

  async function resolveCardPreview(cardEl, beatmapHashOrId, speed = 1) {
    if (!cardEl || !beatmapHashOrId) return;
    const str = String(beatmapHashOrId).trim();
    if (!str) return;

    const request = {};
    const navigationToken = RhythiaX.navigationToken;
    const pathname = window.location.pathname;
    const search = window.location.search;
    pendingPreviews.set(cardEl, request);
    try {
      const meta = await RhythiaX.resolveBeatmapMeta?.(str);
      // Cards are created detached and mounted synchronously by their caller.
      // Check after awaiting, so cached metadata can still update those cards.
      if (!meta || !cardEl.isConnected || pendingPreviews.get(cardEl) !== request
        || navigationToken !== RhythiaX.navigationToken
        || pathname !== window.location.pathname || search !== window.location.search
        || RhythiaX.extensionContextInvalidated
        || (RhythiaX.isMasterActive && !RhythiaX.isMasterActive())) return;

      // 1. Background Art
      if (meta.previewUrl) {
        cardEl.style.setProperty('--card-art-url', `url('${meta.previewUrl}')`);

        const eclipseImg = cardEl.querySelector('.rhythiax-sc-eclipse-img');
        if (eclipseImg) {
          eclipseImg.src = meta.previewUrl;
        }
      }

      // 2. Mapper / Author resolution
      const resolvedMapper = meta.ownerUsername || (RhythiaX.ScoreCardDomain?.extractMapper ? RhythiaX.ScoreCardDomain.extractMapper(meta) : null);
      if (resolvedMapper) {
        const mapperEl = cardEl.querySelector('.rhythiax-sc-meta-mapper');
        if (mapperEl) {
          const strong = mapperEl.querySelector('strong') || document.createElement('strong');
          strong.textContent = resolvedMapper;
          mapperEl.textContent = 'mapped by ';
          mapperEl.appendChild(strong);
        } else {
          const metaLine = cardEl.querySelector('.rhythiax-sc-meta-line');
          if (metaLine && !metaLine.textContent.includes('mapped by')) {
            const newMapEl = document.createElement('span');
            newMapEl.className = 'rhythiax-sc-meta-mapper';
            newMapEl.textContent = 'mapped by ';
            const strong = document.createElement('strong');
            strong.textContent = resolvedMapper;
            newMapEl.appendChild(strong);
            if (metaLine.children.length > 0) {
              const firstSep = document.createElement('span');
              firstSep.className = 'rhythiax-sc-meta-sep';
              firstSep.textContent = '•';
              metaLine.prepend(firstSep);
            }
            metaLine.prepend(newMapEl);
          }
        }

        if (cardEl._rhythiaxScoreData) {
          cardEl._rhythiaxScoreData.mapper = resolvedMapper;
          cardEl._rhythiaxScoreData.ownerUsername = resolvedMapper;
        }
        cardEl.dataset.rhythiaxMapper = resolvedMapper;
        cardEl.setAttribute('data-rhythiax-mapper', resolvedMapper);
        if (cardEl.parentElement?.classList?.contains('rhythiax-card-enhanced-host')) {
          cardEl.parentElement.dataset.rhythiaxMapper = resolvedMapper;
          cardEl.parentElement.setAttribute('data-rhythiax-mapper', resolvedMapper);
        }
      }

      // 4. Mapper / Title link if beatmap ID exists
      if (meta.id) {
        const titleLink = cardEl.querySelector('a.rhythiax-sc-title');
        if (titleLink && (!titleLink.getAttribute('href') || titleLink.getAttribute('href') === '#')) {
          titleLink.href = `/maps/${meta.id}`;
        }
      }
    } catch (_) {
    } finally {
      if (pendingPreviews.get(cardEl) === request) pendingPreviews.delete(cardEl);
    }
  }

  RhythiaX.ScoreCardPreviews = {
    resolveCardPreview,
  };
})();
