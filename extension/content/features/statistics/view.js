// Statistics DOM adapters and mount points.
var RhythiaX = RhythiaX || {};

(function () {
  const domain = RhythiaX.StatisticsDomain;
  const service = RhythiaX.StatisticsService;
  function row(label, value, historyKey) {
    const element = document.createElement('div'); element.className = 'rhythiax-official-stat-row';
    const labelElement = document.createElement('div'); labelElement.className = 'rhythiax-official-stat-label'; labelElement.textContent = label;
    const valueElement = document.createElement('div'); valueElement.className = 'rhythiax-official-stat-value'; valueElement.textContent = value;
    element.append(labelElement, valueElement); if (historyKey) history(element, historyKey); return element;
  }
  function history(element, key) { if (!RhythiaX.isModuleEnabled('statHistory') || !element || !key || element.dataset.historyKey) return element; element.classList.add('rhythiax-history-enabled'); element.dataset.historyKey = key; element.title = 'Click to view history'; element.addEventListener('click', () => RhythiaX.showStatHistory(element, key)); return element; }
  function separator() { const element = document.createElement('div'); element.style.cssText = 'height:1px;background:var(--rhythiax-border);margin:8px 0;'; return element; }
  function values(player, scores, playerRp, ratingScores) {
    const source = ratingScores || scores; const playCount = RhythiaX.parseStatNumber(player.playCount) || scores.length;
    const weighted = RhythiaX.parseLocalizedNumber(playerRp) || RhythiaX.calcWeightedRp(scores);
    const squaresHit = RhythiaX.parseStatNumber(player.squaresHit);
    const displayedSquaresHit = Number.isFinite(squaresHit)
      ? squaresHit
      : scores.reduce((sum, score) => sum + (parseInt(score.notes, 10) || 0), 0);
    return [['Weighted RP', RhythiaX.formatNumber(Math.round(weighted)), 'weightedRp'], ['Raw RP', RhythiaX.formatNumber(Math.round(RhythiaX.calcRawUnweightedRp(scores))), 'rawRp'], ['AVG Accuracy', domain.averageAccuracy(scores, player) === '—' ? '—' : domain.averageAccuracy(scores, player) + '%', 'avgAccuracy'], ['FC Count', RhythiaX.formatNumber(domain.fullComboCount(source)), 'fcCount'], ['Play Count', RhythiaX.formatNumber(playCount), 'playCount'], ['Squares Hit', RhythiaX.formatNumber(displayedSquaresHit), 'squaresHit']];
  }
  function injectOfficial(scores, player, ratingScores) {
    const container = RhythiaX.SiteDomBridge?.findOfficialStatsContainer() || RhythiaX.findOfficialStatsContainer();
    const space = container?.querySelector('.space-y-3'); if (!space) { RhythiaX.log('Official stats container not found'); return false; }
    space.querySelectorAll(':scope > div').forEach(element => {
      if (element.classList.contains('rhythiax-injected-stats-section')) return;
      const text = element.textContent.trim(); const label = element.children[0]?.textContent?.trim().toLowerCase(); const value = element.children[element.children.length - 1]?.textContent?.trim() || '';
      if (/^Play count/i.test(text) || /^Squares hit/i.test(text) || /^(AVG|Average)\.?\s*(RP|Accuracy)/i.test(text) || /^AG\s+Accuracy/i.test(text)) { if (label === 'play count') player.playCount = RhythiaX.parseStatNumber(value); if (label === 'squares hit') player.squaresHit = RhythiaX.parseStatNumber(value); element.style.display = 'none'; return; }
      const left = element.querySelector('div:first-child') || element.children[0]; const right = element.querySelector('div:last-child') || element.children[1];
      if (/^Rhythm Points/i.test(text) || /^Weighted RP/i.test(text)) { if (left) left.textContent = 'Weighted RP'; history(element, 'weightedRp'); }
      if (left && right) { element.className = 'rhythiax-official-stat-row'; left.className = 'rhythiax-official-stat-label'; right.className = 'rhythiax-official-stat-value'; element.querySelector('.border-t')?.remove(); }
    });
    const first = space.querySelector(':scope > div:first-child'); if (!first) return false;
    const section = document.createElement('div'); section.className = 'rhythiax-injected-stats-section';
    values(player, scores, player.rp, ratingScores).slice(1).forEach(item => section.appendChild(row(...item)));
    section.appendChild(row('Maps / Week', domain.mapsPerWeek(RhythiaX.parseStatNumber(player.playCount), RhythiaX.extractHereSince()), 'mapsPerWeek'));
    first.after(section); return true;
  }
  function sharedPanel(player, scores, playerRp, ratingScores) {
    const panel = document.createElement('div'); panel.className = 'rhythiax-stats-panel'; if (!RhythiaX.isModuleEnabled('advancedStats')) return panel;
    const title = document.createElement('h3'); title.textContent = 'Advanced Stats'; panel.appendChild(title);
    values(player, scores, playerRp, ratingScores).forEach(item => panel.appendChild(row(...item)));
    panel.appendChild(row('Maps / Week', domain.mapsPerWeek(RhythiaX.parseStatNumber(player.playCount) || scores.length, RhythiaX.extractHereSince()), 'mapsPerWeek'));
    if (RhythiaX.isModuleOptionEnabled('advancedStats', 'ratingProfile')) RhythiaX.injectRatingProfile(scores, ratingScores, panel, 'scores');
    if (RhythiaX.isModuleOptionEnabled('advancedStats', 'tempoProfile')) RhythiaX.injectTempoProfile(ratingScores || scores, panel, 'scores');
    return panel;
  }
  function buildPanel(player, scores, playerRp, pageType, ratingScores, options = {}) {
    if (!RhythiaX.isModuleEnabled('advancedStats')) { const panel = document.createElement('div'); panel.className = 'rhythiax-stats-panel'; return panel; }
    if (pageType === 'scores') return sharedPanel(player, scores, playerRp, ratingScores);
    if (pageType === 'profile') { if (!injectOfficial(scores, player, ratingScores)) return null; if (!options.deferProfiles) deferredProfiles(scores, ratingScores, pageType); const panel = document.createElement('div'); panel.className = 'rhythiax-stats-panel'; return panel; }
    return sharedPanel(player, scores, playerRp, ratingScores);
  }
  function deferredProfiles(scores, ratingScores, pageType) { if (!RhythiaX.isModuleEnabled('advancedStats') || pageType !== 'profile') return; if (RhythiaX.isModuleOptionEnabled('advancedStats', 'ratingProfile')) RhythiaX.injectRatingProfile(scores, ratingScores, undefined, 'profile'); if (RhythiaX.isModuleOptionEnabled('advancedStats', 'tempoProfile')) RhythiaX.injectTempoProfile(ratingScores || scores, undefined, 'profile'); }
  RhythiaX.StatisticsView = { row, history, injectOfficial, sharedPanel, buildPanel, deferredProfiles };
})();
