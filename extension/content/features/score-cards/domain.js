// Canonical score-card parsing and display-value preparation.
var RhythiaX = RhythiaX || {};

(function () {
  function parse(card) {
    const score = RhythiaX.parseScoreCard(card);
    const mapTitle = card.querySelector('.truncate span, .whitespace-nowrap span, span.font-medium, .truncate')?.textContent.trim();
    return { score, date: RhythiaX.parseRelativeTime(score.timeAgo), scoreHref: card.querySelector('a[href*="/score/"]')?.getAttribute('href') || '', songTitle: mapTitle || score.songTitle || '' };
  }
  function stats(score) { return [{ label: 'Mods', value: score.mods }, { label: 'Notes', value: RhythiaX.formatNumber(parseInt(score.notes, 10)) }, { label: 'Raw RP', value: RhythiaX.formatNumber(Math.round(parseFloat(score.rpEarned))) }, { label: 'Accuracy', value: score.accuracy }, { label: 'Misses', value: score.misses, isMisses: true }, { label: 'Weighted RP', value: RhythiaX.formatNumber(Math.round(parseFloat(score.weightedRp))) }]; }

  function parseModsList(score) {
    const modsList = [];
    const raw = String(score.mods || '').trim();
    if (raw && raw !== '--' && !/^(nm|none|no mod)$/i.test(raw)) {
      const parts = raw.split(/[,+]/).map(s => s.trim()).filter(Boolean);
      parts.forEach(p => {
        if (!modsList.some(m => m.toLowerCase() === p.toLowerCase())) {
          modsList.push(p);
        }
      });
    }
    const speed = RhythiaX.normalizeSpeed(score.speed);
    if (speed && speed !== '1.00') {
      const speedStr = `${speed}x`;
      if (!modsList.some(m => m.endsWith('x') || m.includes(speed))) {
        modsList.unshift(speedStr);
      }
    }
    return modsList;
  }

  function getAccuracyFillPercent(accString) {
    const match = String(accString || '').match(/([\d.]+)/);
    if (!match) return 0;
    const val = parseFloat(match[1]);
    if (isNaN(val)) return 0;
    if (val >= 100) return 100;
    if (val <= 80) return Math.max(6, Math.round((val / 80) * 12));
    const scaled = 12 + ((val - 80) / 20) * 88;
    return Math.min(100, Math.max(6, Math.round(scaled)));
  }

  RhythiaX.ScoreCardDomain = { parse, stats, parseModsList, getAccuracyFillPercent };
})();
