// =============================================
// Reimagined for Rhythia — Rhythia's title rule and map-type names
// =============================================
// What both looks say the same way: Rhythia's titles (getRhythiaTitle on rhythia.com), the RP to the next one and
// how far along the way a player is, and the names and tips of map types with the whole percentages of a map's
// share bar. Colours, short names, art and layout stay in each look.

var RhythiaX = RhythiaX || {};

RhythiaX.GameTerms = (function () {
  'use strict';

  // Rhythia's titles, lowest first. rp is where each one starts: Master holds 10,000 itself, so Candidate Grandmaster
  // needs more than 10,000 RP, and Grandmaster more than 10,000 RP and a place in the top 30.
  const TITLES = Object.freeze([
    { id: 'novice', name: 'Novice', rp: 0 }, { id: 'expert', name: 'Expert', rp: 1500 },
    { id: 'candidate_master', name: 'Candidate Master', rp: 2500 }, { id: 'master', name: 'Master', rp: 5000 },
    { id: 'candidate_grandmaster', name: 'Candidate Grandmaster', rp: 10000 }, { id: 'grandmaster', name: 'Grandmaster', rp: 10000 },
  ].map(Object.freeze));
  // Where each title after Novice starts.
  const NEXT = Object.freeze([1500, 2500, 5000, 10000]);
  const isGrandmaster = rank => rank > 0 && rank <= 30;
  // The title (0 to 5) for an RP and a global rank.
  const titleIndex = (rp, rank) => (rp < 1500 ? 0 : rp < 2500 ? 1 : rp < 5000 ? 2 : rp <= 10000 ? 3 : isGrandmaster(rank) ? 5 : 4);
  // The RP still needed for the title after title k (Candidate Grandmaster: just over 10,000).
  const rpToGo = (k, rp) => Math.max(0, k === 3 ? Math.max(NEXT[3] - rp, 0.01) : NEXT[k] - rp);
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  // Where a player stands: the title i, how far to the next one u (0 to 1) and whether it is near. Up to Master the
  // way is the RP; from Candidate Grandmaster to the top 30 it is the RP #30 has (p30) when that is known, otherwise
  // the rank, and it stays short of the end until the rank is there.
  function standing(rp, rank, p30) {
    const i = titleIndex(rp, rank);
    let u = 1;
    if (i < 4) u = clamp((rp - TITLES[i].rp) / (NEXT[i] - TITLES[i].rp));
    else if (i === 4) u = p30 > 10000 ? clamp((rp - 10000) / (p30 - 10000), 0, 0.985) : rank > 0 ? clamp(30 / rank, 0, 0.985) : 0;
    const near = i < 4 ? u >= 0.9 : i === 4 && rank > 30 && rank - 30 <= 10;
    return { i, u, near };
  }
  // The way to the next title as a whole percent, cut down rather than rounded so 100% never shows before the title
  // is reached (Master at exactly 10,000 RP is 99%). The small lift keeps 0.29 × 100 from coming out as 28.
  const percent = u => clamp(Math.floor(u * 100 + 1e-9), 0, 99);

  // Map types as the history service names them, each with what it says about a whole map. A map has one of the
  // first four; Quantum comes on top of that.
  const TYPES = Object.freeze({
    jump: ['Jumps', 'Mostly long moves across the grid'], stream: ['Streams', 'Mostly short moves at an even speed'],
    tech: ['Techs', 'Mostly moves that bend or change speed'], varied: ['Varied', 'No kind of movement leads'],
    quantum: ['Quantum', 'Parts placed off the grid'],
  });
  const typeName = k => TYPES[k]?.[0] || '';
  // The kinds of movement a map's notes are shared between, for its share bar.
  const MOVES = Object.freeze({
    jump: ['Jumps', 'Long moves across the grid, spins included'], stream: ['Streams', 'Short moves at an even speed'],
    tech: ['Techs', 'Moves that bend or change speed'],
  });
  // The tags the service gives a map, as [name, tip] for the map's numbers p. The tips name no numbers (the share bar
  // has them), except how long the longest stream lasts.
  const TAGS = Object.freeze({
    jump: p => ['Jumps', p.spin >= (p.jump || 0) / 2 && p.spin > 0 ? 'Long moves across the grid, mostly spins' : 'Long moves across the grid'],
    stream: () => ['Streams', 'Short moves at an even speed'], tech: () => ['Techs', 'Moves that bend or change speed'],
    other: () => ['Varied', 'No kind of movement leads'], quantum: () => ['Quantum', 'Parts placed off the grid'],
    stamina: p => ['Long streams', `The longest stream lasts ${Math.round((p.longestStreamMs || 0) / 1000)} s`],
  });
  // The tag of each map type (the service calls Varied "other").
  const TYPE_TAG = Object.freeze({ jump: 'jump', stream: 'stream', tech: 'tech', varied: 'other' });
  // A map's tags as { k, label, tip }: the service's, or for a map answered without them its type and Quantum.
  const tagsOf = p => (p.tags?.length ? p.tags : [TYPE_TAG[p.kind], p.quantum ? 'quantum' : ''].filter(Boolean))
    .filter(k => TAGS[k]).map(k => { const [label, tip] = TAGS[k](p); return { k, label, tip }; });
  // Whole percentages that add up to 100: the parts left over by rounding go to the largest remainders.
  function wholes(parts) {
    const total = parts.reduce((t, v) => t + v, 0) || 1, raw = parts.map(v => v / total * 100), out = raw.map(Math.floor);
    raw.map((v, i) => [v - out[i], i]).sort((x, y) => y[0] - x[0]).slice(0, 100 - out.reduce((t, v) => t + v, 0)).forEach(([, i]) => { out[i]++; });
    return out;
  }

  return Object.freeze({ TITLES, NEXT, isGrandmaster, titleIndex, rpToGo, standing, percent, TYPES, typeName, MOVES, TAGS, TYPE_TAG, tagsOf, wholes });
})();
