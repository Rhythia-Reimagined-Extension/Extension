// Canonical score-card parsing and display-value preparation.
var RhythiaX = RhythiaX || {};

(function () {
  function parse(card) {
    const score = RhythiaX.parseScoreCard(card);
    const mapTitle = card.querySelector('.truncate span, .whitespace-nowrap span')?.textContent.trim();
    return { score, date: RhythiaX.parseRelativeTime(score.timeAgo), scoreHref: card.querySelector('a[href*="/score/"]')?.getAttribute('href') || '', songTitle: mapTitle || score.songTitle || '' };
  }
  function stats(score) { return [{ label: 'Mods', value: score.mods }, { label: 'Notes', value: RhythiaX.formatNumber(parseInt(score.notes, 10)) }, { label: 'Raw RP', value: RhythiaX.formatNumber(Math.round(parseFloat(score.rpEarned))) }, { label: 'Accuracy', value: score.accuracy }, { label: 'Misses', value: score.misses, isMisses: true }, { label: 'Weighted RP', value: RhythiaX.formatNumber(Math.round(parseFloat(score.weightedRp))) }]; }
  RhythiaX.ScoreCardDomain = { parse, stats };
})();
