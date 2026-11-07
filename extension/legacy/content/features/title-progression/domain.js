// =============================================
// Reimagined for Rhythia — Title Progression Domain
// Rhythia's title rule, the RP and rank as the profile shows them, and the History chart's points
// =============================================

var RhythiaX = RhythiaX || {};
RhythiaX.TitleProgression = RhythiaX.TitleProgression || {};

(function () {
  'use strict';

  // Rhythia's titles by the rule both looks share (shared/game-terms.js: where each one starts, the title for an RP
  // and rank, the RP to the next one), with Classic's short name and colour for each.
  const { NEXT, isGrandmaster, titleIndex, rpToGo } = RhythiaX.GameTerms;
  const LOOK = {
    novice: { short: 'Novice', c: '#7ED54F' },
    expert: { short: 'Expert', c: '#04A0B6' },
    candidate_master: { short: 'Cand. Master', c: '#C26F38' },
    master: { short: 'Master', c: '#B6463A' },
    candidate_grandmaster: { short: 'Cand. GM', c: '#8A4FA0' },
    grandmaster: { short: 'Grandmaster', c: '#A3ABB9' }
  };
  const TITLES = RhythiaX.GameTerms.TITLES.map(t => ({ ...t, ...LOOK[t.id] }));

  function parseRp(value) {
    const num = RhythiaX.parseLocalizedNumber ? RhythiaX.parseLocalizedNumber(value) : Number(value);
    return Number.isFinite(num) ? Math.max(0, num) : 0;
  }

  function parseRank(value) {
    const num = RhythiaX.parseStatNumber
      ? RhythiaX.parseStatNumber(value)
      : Number.parseInt(String(value || '').replace(/[^0-9]/g, ''), 10);
    return Number.isFinite(num) ? num : 0;
  }

  const formatNumber = n => (RhythiaX.formatNumber ? RhythiaX.formatNumber(n) : Number(n).toLocaleString('en-US'));

  // The stages of the top 30 a Grandmaster climbs through.
  const GRANDMASTER_STAGES = [
    { rank: 30, name: 'Top 30' },
    { rank: 15, name: 'Top 15' },
    { rank: 10, name: 'Top 10' },
    { rank: 5, name: 'Top 5' },
    { rank: 4, name: 'Top 4' },
    { rank: 3, name: 'Top 3' },
    { rank: 2, name: 'Top 2' },
    { rank: 1, name: 'Top Rhythia Player' }
  ];

  // The player's title in short and what comes next, in a few words.
  function getStatusSummary(rp, rank) {
    const i = titleIndex(rp, rank);
    if (i === 5) {
      const nextStage = GRANDMASTER_STAGES.find(stage => stage.rank < rank);
      const places = nextStage ? rank - nextStage.rank : 0;
      return { title: TITLES[5].short, goalText: nextStage ? `${places} ${places === 1 ? 'rank' : 'ranks'} to ${nextStage.name}` : 'Top Rhythia Player' };
    }
    if (i === 4) {
      return { title: TITLES[4].short, goalText: rank > 30 ? `${rank - 30} ranks to Top 30 (Grandmaster)` : 'Climb to Top 30 for Grandmaster' };
    }
    return { title: TITLES[i].short, goalText: `${formatNumber(Math.ceil(rpToGo(i, rp)))} RP to ${TITLES[i + 1].short}` };
  }

  // HISTORY CHART: the height of an RP on the chart (190 at 0 RP, 45 at 10,000).
  function rpToY(val) {
    if (val <= 0) return 190;
    if (val <= 1500) return 190 - (val / 1500) * 35;
    if (val <= 2500) return 155 - ((val - 1500) / 1000) * 30;
    if (val <= 5000) return 125 - ((val - 2500) / 2500) * 40;
    if (val <= 10000) return 85 - ((val - 5000) / 5000) * 40;
    return 45 - Math.min(20, ((val - 10000) / 3000) * 20);
  }

  function formatShortDate(d) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[d.getMonth()]} ${d.getDate()}`;
  }

  // Where each title before Grandmaster sits on the chart: along the account's age and at its RP's height.
  const MILESTONES = [
    { propRatio: 0, y: 190 },
    { propRatio: 0.28, y: 155 },
    { propRatio: 0.42, y: 125 },
    { propRatio: 0.58, y: 85 },
    { propRatio: 0.78, y: 45 }
  ];

  function generateHistoryData(playerData) {
    const rp = parseRp(playerData?.rp);
    const rank = parseRank(playerData?.globalRank);
    const formattedRp = `${formatNumber(Math.round(rp))} RP`;
    const reached = Math.min(4, titleIndex(rp, 0));

    const now = new Date();
    let startDate = null;
    const rawCreated = playerData?.userProfile?.created_at || playerData?.createdAt || playerData?.created_at;
    if (rawCreated) {
      const parsed = new Date(rawCreated);
      if (!Number.isNaN(parsed.getTime())) startDate = parsed;
    }
    if (!startDate) startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    const spanMs = Math.max(14 * 24 * 60 * 60 * 1000, now.getTime() - startDate.getTime());
    const stepMs = spanMs / 6;
    const dateTicks = [];
    for (let i = 0; i <= 6; i++) dateTicks.push(formatShortDate(new Date(startDate.getTime() + i * stepMs)));

    const X_START = 50;
    const X_END = 924;
    const milestones = MILESTONES.slice(0, reached + 1).map((m, k) => {
      const t = TITLES[k];
      const dateStr = formatShortDate(k === 0 ? startDate : new Date(startDate.getTime() + m.propRatio * spanMs));
      const need = k === 4 ? `above ${formatNumber(10000)} RP` : `${formatNumber(t.rp)} RP`;
      return {
        id: t.id,
        title: t.short,
        threshold: t.rp,
        color: t.c,
        x: Math.round(k === 0 ? X_START : X_START + m.propRatio * (X_END - X_START)),
        y: m.y,
        dateStr,
        tooltipText: k === 0 ? `${dateStr}: Started as Novice (0 RP)` : `${dateStr}: Reached ${t.short} (${need})`
      };
    });

    const curDateStr = dateTicks[dateTicks.length - 1];
    const tooltipText = isGrandmaster(rank) && rp > 10000 ? `${curDateStr}: Grandmaster #${rank} (${formattedRp})`
      : rank > 0 ? `${curDateStr}: #${rank} (${formattedRp})` : `${curDateStr}: ${formattedRp}`;
    const currentPoint = {
      id: 'current',
      x: X_END,
      y: Math.round(rpToY(rp) * 10) / 10,
      color: reached === 4 ? '#c084fc' : TITLES[reached].c,
      dateStr: curDateStr,
      tooltipText
    };

    return { dateTicks, milestones, currentPoint };
  }

  RhythiaX.TitleProgression.Domain = {
    TITLES,
    NEXT,
    GRANDMASTER_STAGES,
    titleIndex,
    rpToGo,
    parseRp,
    parseRank,
    isGrandmaster,
    getStatusSummary,
    rpToY,
    generateHistoryData
  };

})();
