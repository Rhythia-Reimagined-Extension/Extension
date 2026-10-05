// =============================================
// Rhythia Reimagined — Title Progression Domain
// Mathematical models, cubic bezier curves, prestige configs & progress tracking
// =============================================

var RhythiaX = RhythiaX || {};
RhythiaX.TitleProgression = RhythiaX.TitleProgression || {};

(function () {
  'use strict';

  // 1. WAYPOINTS & CONTROL POINT COORDINATES (960 x 220 arena)
  const WAYPOINTS = [
    { id: 'novice', name: 'Novice', rp: 0, color: '#7ED54F', shortRp: '0 RP', x: 70, y: 145 },
    { id: 'expert', name: 'Expert', rp: 1500, color: '#04A0B6', shortRp: '1.5k RP', x: 234, y: 85 },
    { id: 'candidate_master', name: 'Cand. Master', rp: 2500, color: '#C26F38', shortRp: '2.5k RP', x: 398, y: 145 },
    { id: 'master', name: 'Master', rp: 5000, color: '#B6463A', shortRp: '5k RP', x: 562, y: 85 },
    { id: 'candidate_grandmaster', name: 'Cand. GM', rp: 10000, color: '#8A4FA0', shortRp: '10k RP', x: 726, y: 145 },
    { id: 'grandmaster', name: 'Grandmaster', rp: 10000, color: 'var(--gm-white, #ffffff)', shortRp: 'Top 30', x: 890, y: 85 }
  ];

  // 2. CUBIC BEZIER SEGMENTS S1..S5 (Exact tangents matching 40x40 node exits/entries)
  const SEGMENTS = [
    { p0: { x: 90, y: 145 }, p1: { x: 135, y: 145 }, p2: { x: 169, y: 85 }, p3: { x: 214, y: 85 } },
    { p0: { x: 254, y: 85 }, p1: { x: 299, y: 85 }, p2: { x: 333, y: 145 }, p3: { x: 378, y: 145 } },
    { p0: { x: 418, y: 145 }, p1: { x: 463, y: 145 }, p2: { x: 497, y: 85 }, p3: { x: 542, y: 85 } },
    { p0: { x: 582, y: 85 }, p1: { x: 627, y: 85 }, p2: { x: 661, y: 145 }, p3: { x: 706, y: 145 } },
    { p0: { x: 746, y: 145 }, p1: { x: 791, y: 145 }, p2: { x: 825, y: 85 }, p3: { x: 870, y: 85 } }
  ];

  // 3. DE CASTELJAU SPLIT ALGORITHM (Returns exact point and subdivided left & right cubics)
  function deCasteljau(p0, p1, p2, p3, t) {
    const q0 = { x: p0.x + (p1.x - p0.x) * t, y: p0.y + (p1.y - p0.y) * t };
    const q1 = { x: p1.x + (p2.x - p1.x) * t, y: p1.y + (p2.y - p1.y) * t };
    const q2 = { x: p2.x + (p3.x - p2.x) * t, y: p2.y + (p3.y - p2.y) * t };

    const r0 = { x: q0.x + (q1.x - q0.x) * t, y: q0.y + (q1.y - q0.y) * t };
    const r1 = { x: q1.x + (q2.x - q1.x) * t, y: q1.y + (q2.y - q1.y) * t };

    const s = { x: r0.x + (r1.x - r0.x) * t, y: r0.y + (r1.y - r0.y) * t };

    return {
      point: { x: Math.round(s.x * 10) / 10, y: Math.round(s.y * 10) / 10 },
      subLeft: { p0, p1: q0, p2: r0, p3: s },
      subRight: { p0: s, p1: r1, p2: q2, p3 }
    };
  }

  function pathFromCubic(c) {
    return `M ${c.p0.x.toFixed(1)} ${c.p0.y.toFixed(1)} C ${c.p1.x.toFixed(1)} ${c.p1.y.toFixed(1)}, ${c.p2.x.toFixed(1)} ${c.p2.y.toFixed(1)}, ${c.p3.x.toFixed(1)} ${c.p3.y.toFixed(1)}`;
  }

  // 4. PARSERS FOR RP & RANK
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

  function isGrandmaster(rank) {
    return rank > 0 && rank <= 30;
  }

  // 5. PROGRESS RATIO (0.0 to 1.0) FOR EACH SEGMENT
  function getSegmentProgress(segIndex, rp, rank) {
    if (segIndex === 0) { // Novice -> Expert (0 -> 1500 RP)
      if (rp >= 1500) return 1.0;
      if (rp <= 0) return 0.0;
      return rp / 1500;
    }
    if (segIndex === 1) { // Expert -> Cand. Master (1500 -> 2500 RP)
      if (rp >= 2500) return 1.0;
      if (rp <= 1500) return 0.0;
      return (rp - 1500) / 1000;
    }
    if (segIndex === 2) { // Cand. Master -> Master (2500 -> 5000 RP)
      if (rp >= 5000) return 1.0;
      if (rp <= 2500) return 0.0;
      return (rp - 2500) / 2500;
    }
    if (segIndex === 3) { // Master -> Cand. GM (5000 -> 10000 RP)
      if (rp >= 10000) return 1.0;
      if (rp <= 5000) return 0.0;
      return (rp - 5000) / 5000;
    }
    if (segIndex === 4) { // Cand. GM -> Grandmaster (#400 -> #30)
      if (rp < 10000) return 0.0;
      if (isGrandmaster(rank)) return 1.0;
      const currentRank = rank > 0 ? rank : 400;
      const clamped = Math.min(400, Math.max(30, currentRank));
      return Math.max(0.04, Math.min(0.98, (400 - clamped) / (400 - 30)));
    }
    return 0.0;
  }

  // 6. EXACT MARKER POSITION
  function getMarkerLocation(rp, rank) {
    if (isGrandmaster(rank)) {
      return { x: WAYPOINTS[5].x, y: WAYPOINTS[5].y, isAtNode: true, waypointIndex: 5, rank };
    }
    if (rp >= 10000) {
      const t = getSegmentProgress(4, rp, rank);
      const split = deCasteljau(SEGMENTS[4].p0, SEGMENTS[4].p1, SEGMENTS[4].p2, SEGMENTS[4].p3, t);
      return { x: split.point.x, y: split.point.y, isAtNode: false, segmentIndex: 4, t, rank };
    }
    if (rp === 5000) return { x: WAYPOINTS[3].x, y: WAYPOINTS[3].y, isAtNode: true, waypointIndex: 3 };
    if (rp > 5000) {
      const t = getSegmentProgress(3, rp, rank);
      const split = deCasteljau(SEGMENTS[3].p0, SEGMENTS[3].p1, SEGMENTS[3].p2, SEGMENTS[3].p3, t);
      return { x: split.point.x, y: split.point.y, isAtNode: false, segmentIndex: 3, t };
    }
    if (rp === 2500) return { x: WAYPOINTS[2].x, y: WAYPOINTS[2].y, isAtNode: true, waypointIndex: 2 };
    if (rp > 2500) {
      const t = getSegmentProgress(2, rp, rank);
      const split = deCasteljau(SEGMENTS[2].p0, SEGMENTS[2].p1, SEGMENTS[2].p2, SEGMENTS[2].p3, t);
      return { x: split.point.x, y: split.point.y, isAtNode: false, segmentIndex: 2, t };
    }
    if (rp === 1500) return { x: WAYPOINTS[1].x, y: WAYPOINTS[1].y, isAtNode: true, waypointIndex: 1 };
    if (rp > 1500) {
      const t = getSegmentProgress(1, rp, rank);
      const split = deCasteljau(SEGMENTS[1].p0, SEGMENTS[1].p1, SEGMENTS[1].p2, SEGMENTS[1].p3, t);
      return { x: split.point.x, y: split.point.y, isAtNode: false, segmentIndex: 1, t };
    }
    if (rp === 0) return { x: WAYPOINTS[0].x, y: WAYPOINTS[0].y, isAtNode: true, waypointIndex: 0 };
    const t = getSegmentProgress(0, rp, rank);
    const split = deCasteljau(SEGMENTS[0].p0, SEGMENTS[0].p1, SEGMENTS[0].p2, SEGMENTS[0].p3, t);
    return { x: split.point.x, y: split.point.y, isAtNode: false, segmentIndex: 0, t };
  }

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

  // 7. THE 8 GRANDMASTER PRESTIGE CONFIGURATIONS (White GM + Olympic Podium)
  function getPrestigeConfig(rank) {
    if (rank === 1) {
      return {
        tierName: 'Top Rhythia Player',
        badgeText: '#1',
        pillWidth: 30,
        tierColor: '#fbbf24',
        boxBorder: '#fbbf24',
        boxGlow: '0 0 32px rgba(251, 191, 36, 1), 0 0 8px #ffffff',
        decorationsSvg: `
          <rect x="-22.5" y="-22.5" width="45" height="45" rx="14.5" fill="none" stroke="#fbbf24" stroke-width="2.6" stroke-opacity="0.95" style="filter: drop-shadow(0 0 14px rgba(251, 191, 36, 0.85));"/>
          <g transform="translate(0, -22)" style="filter: drop-shadow(0 2px 8px rgba(251, 191, 36, 0.95));">
            <path d="M -12 1.5 L -14 -8 L -8 -3.5 L -4 -6 L 0 -11.5 L 4 -6 L 8 -3.5 L 14 -8 L 12 1.5 Z" fill="#fbbf24" stroke="#fef08a" stroke-width="1.2" stroke-linejoin="round"/>
            <circle cx="-14" cy="-8" r="1.2" fill="#ffffff"/>
            <circle cx="-4" cy="-6" r="1.0" fill="#ffffff"/>
            <circle cx="0" cy="-11.5" r="1.6" fill="#ffffff"/>
            <circle cx="4" cy="-6" r="1.0" fill="#ffffff"/>
            <circle cx="14" cy="-8" r="1.2" fill="#ffffff"/>
            <polygon points="0,-5.5 2,-3 0,-0.5 -2,-3" fill="#ef4444"/>
          </g>
        `,
        pinNeedleY: { start: -33.5, end: -43, badgeY: -53 },
        desc: 'Mistrz Gry: Królewskie Złoto + Złota Korona Apex'
      };
    }
    if (rank === 2) {
      return {
        tierName: 'Top 2',
        badgeText: '#2',
        pillWidth: 30,
        tierColor: 'var(--silver-color, #e2e8f0)',
        boxBorder: 'var(--silver-border, #e2e8f0)',
        boxGlow: '0 0 26px rgba(226, 232, 240, 0.9), 0 0 6px #ffffff',
        decorationsSvg: `
          <rect x="-22.5" y="-22.5" width="45" height="45" rx="14.5" fill="none" stroke="var(--silver-border, #e2e8f0)" stroke-width="2.3" stroke-opacity="0.9" style="filter: drop-shadow(0 0 10px rgba(226, 232, 240, 0.7));"/>
          <g transform="translate(0, -22)" style="filter: drop-shadow(0 2px 6px rgba(226, 232, 240, 0.8));">
            <path d="M -10 1.5 L -12.5 -8 L -5 -3.5 L 0 -10 L 5 -3.5 L 12.5 -8 L 10 1.5 Z" fill="var(--silver-border, #e2e8f0)" stroke="var(--silver-color, #cbd5e1)" stroke-width="1.1" stroke-linejoin="round"/>
            <circle cx="-12.5" cy="-8" r="1.2" fill="#ffffff"/>
            <circle cx="0" cy="-10" r="1.5" fill="#ffffff"/>
            <circle cx="12.5" cy="-8" r="1.2" fill="#ffffff"/>
            <polygon points="0,-4.5 1.8,-2.5 0,-0.5 -1.8,-2.5" fill="var(--silver-color, #475569)"/>
          </g>
        `,
        pinNeedleY: { start: -32, end: -42, badgeY: -52 },
        desc: 'Podium: Platynowe Srebro + Srebrna Korona SVG'
      };
    }
    if (rank === 3) {
      return {
        tierName: 'Top 3',
        badgeText: '#3',
        pillWidth: 30,
        tierColor: '#cd7f32',
        boxBorder: '#cd7f32',
        boxGlow: '0 0 24px rgba(205, 127, 50, 0.85)',
        decorationsSvg: `
          <rect x="-22.5" y="-22.5" width="45" height="45" rx="14.5" fill="none" stroke="#cd7f32" stroke-width="2.3" stroke-opacity="0.9" style="filter: drop-shadow(0 0 8px rgba(205, 127, 50, 0.7));"/>
          <g transform="translate(0, -22)" style="filter: drop-shadow(0 2px 6px rgba(205, 127, 50, 0.8));">
            <path d="M -10 1.5 L -12 -7.5 L -5 -3 L 0 -9.5 L 5 -3 L 12 -7.5 L 10 1.5 Z" fill="#cd7f32" stroke="#d97706" stroke-width="1.1" stroke-linejoin="round"/>
            <circle cx="-12" cy="-7.5" r="1.2" fill="#fed7aa"/>
            <circle cx="0" cy="-9.5" r="1.4" fill="#ffffff"/>
            <circle cx="12" cy="-7.5" r="1.2" fill="#fed7aa"/>
            <polygon points="0,-4 1.8,-2 0,0 -1.8,-2" fill="#78350f"/>
          </g>
        `,
        pinNeedleY: { start: -31.5, end: -41, badgeY: -51 },
        desc: 'Podium: Szlachetny Brąz + Brązowa Korona SVG'
      };
    }
    if (rank === 4) {
      return {
        tierName: 'Top 4',
        badgeText: '#4',
        pillWidth: 30,
        tierColor: 'var(--gm-white, #ffffff)',
        boxBorder: 'var(--gm-white-border, #f8fafc)',
        boxGlow: '0 0 26px var(--gm-white-glow, rgba(255, 255, 255, 0.9))',
        decorationsSvg: `
          <rect x="-22" y="-22" width="44" height="44" rx="14" fill="none" stroke="var(--gm-white-border, #f8fafc)" stroke-width="2.5" stroke-opacity="1"/>
          <rect x="-27" y="-27" width="54" height="54" rx="17" fill="none" stroke="var(--gm-white-border, #f8fafc)" stroke-width="1.4" stroke-opacity="0.85" style="filter: drop-shadow(0 0 8px var(--gm-white-glow));"/>
          <circle cx="-27" cy="-27" r="1.3" fill="var(--gm-white, #ffffff)"/>
          <circle cx="27" cy="-27" r="1.3" fill="var(--gm-white, #ffffff)"/>
          <circle cx="-27" cy="27" r="1.3" fill="var(--gm-white, #ffffff)"/>
          <circle cx="27" cy="27" r="1.3" fill="var(--gm-white, #ffffff)"/>
          <g transform="translate(0, -22)" style="filter: drop-shadow(0 2px 6px var(--gm-white-glow));">
            <path d="M -8 1 L -10 -7 L -4 -3 L 0 -8.5 L 4 -3 L 10 -7 L 8 1 Z" fill="var(--gm-white-border, #f8fafc)" stroke="var(--gm-white-subtle, #cbd5e1)" stroke-width="1" stroke-linejoin="round"/>
            <circle cx="0" cy="-8.5" r="1.1" fill="var(--gm-white, #ffffff)"/>
          </g>
        `,
        pinNeedleY: { start: -30.5, end: -40, badgeY: -50 },
        desc: 'Wielowarstwowa diamentowa aura + biała korona'
      };
    }
    if (rank === 5) {
      return {
        tierName: 'Top 5',
        badgeText: `#${rank}`,
        pillWidth: 32,
        tierColor: 'var(--gm-white, #ffffff)',
        boxBorder: 'var(--gm-white-border, #f8fafc)',
        boxGlow: '0 0 22px var(--gm-white-glow, rgba(255, 255, 255, 0.85))',
        decorationsSvg: `
          <rect x="-22" y="-22" width="44" height="44" rx="14" fill="none" stroke="var(--gm-white-border, #f8fafc)" stroke-width="2.4" stroke-opacity="0.95"/>
          <rect x="-26.5" y="-26.5" width="53" height="53" rx="17" fill="none" stroke="var(--gm-white-border, #f8fafc)" stroke-width="1.3" stroke-opacity="0.75" style="filter: drop-shadow(0 0 6px var(--gm-white-glow));"/>
          <g transform="translate(0, -22)" style="filter: drop-shadow(0 2px 4px var(--gm-white-glow));">
            <path d="M -6 1 L -8 -5 L -3 -2 L 0 -6 L 3 -2 L 8 -5 L 6 1 Z" fill="var(--gm-white-border, #f8fafc)" stroke="var(--gm-white-subtle, #cbd5e1)" stroke-width="0.8" stroke-linejoin="round"/>
          </g>
        `,
        pinNeedleY: { start: -28, end: -38, badgeY: -48 },
        desc: 'Kryształowa podwójna otoczka + mała biała korona'
      };
    }
    if (rank >= 6 && rank <= 10) {
      return {
        tierName: 'Top 10',
        badgeText: `#${rank}`,
        pillWidth: 36,
        tierColor: 'var(--gm-white, #ffffff)',
        boxBorder: 'var(--gm-white-border, #f8fafc)',
        boxGlow: '0 0 20px var(--gm-white-glow, rgba(255, 255, 255, 0.75))',
        decorationsSvg: `
          <rect x="-22" y="-22" width="44" height="44" rx="14" fill="none" stroke="var(--gm-white-border, #f8fafc)" stroke-width="2.2" stroke-opacity="0.9"/>
          <rect x="-26.5" y="-26.5" width="53" height="53" rx="17" fill="none" stroke="var(--gm-white-border, #f8fafc)" stroke-width="1.1" stroke-dasharray="4 3" stroke-opacity="0.65"/>
        `,
        pinNeedleY: { start: -22.5, end: -34, badgeY: -44 },
        desc: 'Podwójna otoczka (wewnętrzna ramka + orbitalna aureola)'
      };
    }
    if (rank >= 11 && rank <= 15) {
      return {
        tierName: 'Top 15',
        badgeText: `#${rank}`,
        pillWidth: 36,
        tierColor: 'var(--gm-white, #ffffff)',
        boxBorder: 'var(--gm-white-border, #f8fafc)',
        boxGlow: '0 0 16px var(--gm-white-glow, rgba(255, 255, 255, 0.65))',
        decorationsSvg: `
          <rect x="-22.5" y="-22.5" width="45" height="45" rx="14.5" fill="none" stroke="var(--gm-white-border, #f8fafc)" stroke-width="2.6" stroke-opacity="0.9" style="filter: drop-shadow(0 0 6px var(--gm-white-glow));"/>
        `,
        pinNeedleY: { start: -22.5, end: -34, badgeY: -44 },
        desc: 'Grubsza otoczka (wyraźniejsza biała ramka 2.6px)'
      };
    }
    // Top 30 default
    return {
      tierName: 'Top 30',
      badgeText: rank > 0 ? `#${rank}` : '#30',
      pillWidth: 36,
      tierColor: 'var(--gm-white, #ffffff)',
      boxBorder: 'var(--gm-white-border, #f8fafc)',
      boxGlow: '0 0 10px var(--gm-white-glow, rgba(255, 255, 255, 0.45))',
      decorationsSvg: `
        <rect x="-22" y="-22" width="44" height="44" rx="14" fill="none" stroke="var(--gm-white-border, #f8fafc)" stroke-width="1.3" stroke-opacity="0.65"/>
      `,
      pinNeedleY: { start: -22, end: -34, badgeY: -44 },
      desc: 'Mała otoczka (subtelna, pojedyncza biała ramka)'
    };
  }

  // 8. CARD STATUS & GOAL SUMMARY
  function getStatusSummary(rp, rank) {
    const formattedRp = (RhythiaX.formatNumber ? RhythiaX.formatNumber(Math.round(rp)) : Math.round(rp).toLocaleString('en-US')) + ' RP';

    if (isGrandmaster(rank)) {
      const cfg = getPrestigeConfig(rank);
      const nextStage = GRANDMASTER_STAGES.find(stage => stage.rank < rank);
      const places = nextStage ? rank - nextStage.rank : 0;
      const goalText = nextStage
        ? `${places} ${places === 1 ? 'rank' : 'ranks'} to ${nextStage.name}`
        : 'Top Rhythia Player';

      return {
        title: 'Grandmaster',
        badge: `#${rank} Global`,
        goalText,
        dotColor: cfg.tierColor
      };
    }

    if (rp >= 10000) {
      const places = rank > 30 ? rank - 30 : 370;
      return {
        title: 'Cand. GM',
        badge: rank > 0 ? `#${rank} Global` : formattedRp,
        goalText: rank > 30 ? `${places} ranks to Top 30 (Grandmaster)` : 'Climb to Top 30 for Grandmaster',
        dotColor: '#8A4FA0'
      };
    }

    let nextTitle = 'Expert';
    let targetRp = 1500;
    let dotColor = '#7ED54F';

    if (rp >= 5000) {
      nextTitle = 'Cand. GM';
      targetRp = 10000;
      dotColor = '#B6463A';
    } else if (rp >= 2500) {
      nextTitle = 'Master';
      targetRp = 5000;
      dotColor = '#C26F38';
    } else if (rp >= 1500) {
      nextTitle = 'Cand. Master';
      targetRp = 2500;
      dotColor = '#04A0B6';
    }

    const diff = Math.max(0, Math.ceil(targetRp - rp));
    const formattedDiff = RhythiaX.formatNumber ? RhythiaX.formatNumber(diff) : diff.toLocaleString('en-US');

    return {
      title: rp >= 5000 ? 'Master' : rp >= 2500 ? 'Cand. Master' : rp >= 1500 ? 'Expert' : 'Novice',
      badge: formattedRp,
      goalText: `${formattedDiff} RP to ${nextTitle}`,
      dotColor
    };
  }

  // 9. HISTORY CHART LOGIC & PROGRESSION MODEL
  function rpToY(val) {
    if (val <= 0) return 190;
    if (val <= 1500) {
      return 190 - (val / 1500) * 35; // 190 -> 155
    }
    if (val <= 2500) {
      return 155 - ((val - 1500) / 1000) * 30; // 155 -> 125
    }
    if (val <= 5000) {
      return 125 - ((val - 2500) / 2500) * 40; // 125 -> 85
    }
    if (val <= 10000) {
      return 85 - ((val - 5000) / 5000) * 40; // 85 -> 45
    }
    const extra = Math.min(20, ((val - 10000) / 3000) * 20);
    return 45 - extra; // 45 -> 25
  }

  function buildSmoothPath(points) {
    if (!points || points.length === 0) return '';
    if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
    if (points.length === 2) {
      const p0 = points[0];
      const p1 = points[1];
      const midX = (p0.x + p1.x) / 2;
      return `M ${p0.x} ${p0.y} C ${midX} ${p0.y}, ${midX} ${p1.y}, ${p1.x} ${p1.y}`;
    }

    let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[Math.max(0, i - 1)];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[Math.min(points.length - 1, i + 2)];

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
    }
    return d;
  }

  function formatShortDate(d) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[d.getMonth()]} ${d.getDate()}`;
  }

  function generateHistoryData(playerData, scoreSets) {
    const rp = parseRp(playerData?.rp);
    const rank = parseRank(playerData?.globalRank);
    const formattedRp = (RhythiaX.formatNumber ? RhythiaX.formatNumber(Math.round(rp)) : Math.round(rp).toLocaleString('en-US')) + ' RP';

    const now = new Date();
    let startDate = null;
    const rawCreated = playerData?.userProfile?.created_at || playerData?.createdAt || playerData?.created_at;
    if (rawCreated) {
      const parsed = new Date(rawCreated);
      if (!Number.isNaN(parsed.getTime())) startDate = parsed;
    }
    if (!startDate) {
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    }

    const spanMs = Math.max(14 * 24 * 60 * 60 * 1000, now.getTime() - startDate.getTime());
    const stepMs = spanMs / 6;

    // 7 X-axis date labels
    const dateTicks = [];
    for (let i = 0; i <= 6; i++) {
      const tickDate = new Date(startDate.getTime() + i * stepMs);
      dateTicks.push(formatShortDate(tickDate));
    }

    // Milestone definitions matching progression tiers
    const milestoneDefs = [
      { id: 'novice', threshold: 0, title: 'Novice', color: '#7ED54F', propRatio: 0, y: 190 },
      { id: 'expert', threshold: 1500, title: 'Expert', color: '#04A0B6', propRatio: 0.28, y: 155 },
      { id: 'candidate_master', threshold: 2500, title: 'Cand. Master', color: '#C26F38', propRatio: 0.42, y: 125 },
      { id: 'master', threshold: 5000, title: 'Master', color: '#B6463A', propRatio: 0.58, y: 85 },
      { id: 'candidate_grandmaster', threshold: 10000, title: 'Cand. GM', color: '#8A4FA0', propRatio: 0.78, y: 45 }
    ];

    const milestones = [];
    const curvePoints = [];

    const X_START = 50;
    const X_END = 924;

    milestoneDefs.forEach(m => {
      if (rp >= m.threshold) {
        const x = m.threshold === 0 ? X_START : (X_START + m.propRatio * (X_END - X_START));
        const milestoneDate = m.threshold === 0 ? startDate : new Date(startDate.getTime() + m.propRatio * spanMs);
        const dateStr = formatShortDate(milestoneDate);
        const mObj = {
          id: m.id,
          title: m.title,
          threshold: m.threshold,
          color: m.color,
          x: Math.round(x),
          y: m.y,
          dateStr,
          tooltipText: m.threshold === 0
            ? `${dateStr}: Started journey as Novice (0 RP)`
            : `${dateStr}: Promoted to ${m.title} (${(m.threshold).toLocaleString('en-US')} RP)`
        };
        milestones.push(mObj);
        curvePoints.push({ x: mObj.x, y: mObj.y });
      }
    });

    // Current point at x = X_END (924)
    const curY = Math.round(rpToY(rp) * 10) / 10;
    const curDateStr = dateTicks[dateTicks.length - 1];
    let curTooltipText = `${curDateStr}: ${formattedRp}`;
    if (isGrandmaster(rank)) {
      curTooltipText = `${curDateStr}: Grandmaster #${rank} (${formattedRp})`;
    } else if (rank > 0) {
      curTooltipText = `${curDateStr}: #${rank} (${formattedRp})`;
    }

    const currentPoint = {
      id: 'current',
      x: X_END,
      y: curY,
      color: rp >= 10000 ? '#c084fc' : (rp >= 5000 ? '#B6463A' : (rp >= 2500 ? '#C26F38' : (rp >= 1500 ? '#04A0B6' : '#7ED54F'))),
      dateStr: curDateStr,
      tooltipText: curTooltipText
    };
    curvePoints.push({ x: currentPoint.x, y: currentPoint.y });

    // Generate smooth SVG paths
    const pathD = buildSmoothPath(curvePoints);
    const areaD = `${pathD} L ${X_END} 190 L ${X_START} 190 Z`;

    return {
      dateTicks,
      milestones,
      currentPoint,
      pathD,
      areaD
    };
  }

  function isTierUnlocked(tierIndex, rp, rank) {
    if (tierIndex === 0) return true; // Novice (0 RP)
    if (tierIndex === 1) return rp >= 1500; // Expert
    if (tierIndex === 2) return rp >= 2500; // Candidate Master
    if (tierIndex === 3) return rp >= 5000; // Master
    if (tierIndex === 4) return rp >= 10000; // Candidate Grandmaster
    if (tierIndex === 5) return isGrandmaster(rank); // Grandmaster (Top 30)
    return false;
  }

  // Export Domain
  RhythiaX.TitleProgression.Domain = {
    WAYPOINTS,
    GRANDMASTER_STAGES,
    SEGMENTS,
    deCasteljau,
    pathFromCubic,
    parseRp,
    parseRank,
    isGrandmaster,
    isTierUnlocked,
    getSegmentProgress,
    getMarkerLocation,
    getPrestigeConfig,
    getStatusSummary,
    rpToY,
    buildSmoothPath,
    generateHistoryData
  };

})();
