// Backward-compatible score-card entry point. Modular implementation loads first.
var RhythiaX = RhythiaX || {};

RhythiaX.redesignScoreCard = function (card, index) { return RhythiaX.ScoreCardView?.redesign?.(card, index); };
RhythiaX.getProfileScoreType = function (card) {
  if (!card) return '';
  const explicit = card.getAttribute?.('data-rhythiax-score-type') || card.dataset?.rhythiaxScoreType;
  if (explicit) return explicit;
  let p = card.parentElement;
  while (p && p !== document.body) {
    const heading = p.querySelector?.(':scope > h1, :scope > h2, :scope > h3, :scope > h4, :scope > div > h1, :scope > div > h2, :scope > div > h3, :scope > div > h4');
    if (heading) {
      const txt = heading.textContent.toLowerCase();
      if (txt.includes('reign')) return 'reign';
      if (txt.includes('top')) return 'top';
      if (txt.includes('recent')) return 'recent';
      if (txt.includes('pinned')) return 'pinned';
    }
    p = p.parentElement;
  }
  return '';
};
RhythiaX.installProfileScoreTabs = function () { return RhythiaX.ScoreCardService?.mountScoresHub?.(); };
RhythiaX.enhanceScoreCards = function () { return RhythiaX.ScoreCardView?.enhance?.(); };
RhythiaX.unenhanceScoreCards = function () { return RhythiaX.ScoreCardView?.unenhance?.(); };
RhythiaX.updateEnhancedScoreCards = function (scoreSets) { return RhythiaX.ScoreCardService?.mountScoresHub?.(scoreSets); };
RhythiaX.mountScoresHub = function (scoreSets) { return RhythiaX.ScoreCardService?.mountScoresHub?.(scoreSets); };
RhythiaX.createCardFromScore = function (score, index, scoreType) { return RhythiaX.ScoreCardView?.createCardFromScore?.(score, index, scoreType); };
