// =============================================
// Reimagined for Rhythia — Reading scores from Rhythia's page
// =============================================
// A score card on Rhythia's own page read into a score object (parseScoreCard), filled in from the
// matching score of the API's answer (findMatchingApiScore).

var RhythiaX = RhythiaX || {};

// ─── Score extraction ────────────────────────
RhythiaX.findMatchingApiScore = function (scoreId, songTitle, speed, rpEarned, scoreType) {
  const ctx = RhythiaX.profileHistoryContext?.scoreSets;
  const candidates = [];
  if (scoreType === 'top' && ctx?.topScores) candidates.push(...ctx.topScores);
  else if (scoreType === 'reign' && ctx?.reignScores) candidates.push(...ctx.reignScores);
  else if (scoreType === 'recent' && ctx?.recentScores) candidates.push(...ctx.recentScores);

  const fallback = ctx?.allCardScores || ctx?.scores || [];
  candidates.push(...fallback);
  if (scoreType !== 'recent' && ctx?.recentScores) candidates.push(...ctx.recentScores);
  if (scoreType !== 'reign' && ctx?.reignScores) candidates.push(...ctx.reignScores);
  if (scoreType !== 'top' && ctx?.topScores) candidates.push(...ctx.topScores);

  if (!candidates.length) return null;

  if (scoreId) {
    const byId = candidates.find(s => String(s.scoreId || s.id) === String(scoreId));
    if (byId) return byId;
  }
  const norm = str => String(str || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const targetTitle = norm(songTitle);
  const targetSpeed = RhythiaX.normalizeSpeed(speed);
  const targetRp = Math.round(parseFloat(String(rpEarned || '0').replace(/,/g, '')) || 0);

  return candidates.find(s => {
    const sTitle = norm(s.songTitle || s.beatmapTitle);
    const sSpeed = RhythiaX.normalizeSpeed(s.speed);
    const sRp = Math.round(parseFloat(String(s.rpEarned || s.awarded_sp || '0').replace(/,/g, '')) || 0);
    const speedMatch = !targetSpeed || !sSpeed || targetSpeed === sSpeed;
    const titleMatch = targetTitle && sTitle && (targetTitle.includes(sTitle) || sTitle.includes(targetTitle));
    const rpMatch = targetRp > 0 && sRp > 0 ? Math.abs(targetRp - sRp) <= 3 : true;
    return titleMatch && speedMatch && rpMatch;
  }) || null;
};

RhythiaX.isScoreHydrated = function (score) {
  if (!score || typeof score !== 'object') return false;
  const title = String(score.songTitle || score.title || '').trim();
  const isRealTitle = title && !/^unknown$/i.test(title);
  const scoreId = String(score.scoreId || score.id || '').trim();
  const hasValidScoreId = Boolean(scoreId && scoreId !== '0');
  const rawAcc = String(score.accuracy || '').replace('%', '').trim();
  const hasValidAcc = rawAcc && rawAcc !== '—' && !Number.isNaN(Number(rawAcc));
  const rawRp = String(score.rpEarned || score.rawRp || '0').replace(/,/g, '').trim();
  const hasValidRp = rawRp && rawRp !== '0' && rawRp !== '—' && !Number.isNaN(Number(rawRp));

  // Must have a real song title OR valid score ID, and at least valid accuracy or RP.
  return (isRealTitle || hasValidScoreId) && (hasValidAcc || hasValidRp);
};

RhythiaX.parseScoreCard = function (card) {
    const text = card.textContent;

    let grade = '?';
    const gradeEl = card.querySelector('[style*="color: rgb"]');
    if (gradeEl) {
      const g = gradeEl.textContent.trim();
      if (/^SS$/i.test(g)) grade = 'SS';
      else if (/^[SABCDEF]$/i.test(g)) grade = g;
    }
    card.dataset.rhythiaxGrade = grade;

    let accuracy = '';
    const accMatch = text.match(/(\d+\.?\d*)%/);
    if (accMatch) accuracy = accMatch[1] + '%';

    const link = RhythiaX.qs('a[href*="/score/"]', card);
    const scoreIdFromLink = link?.href?.match(/\/score\/(\d+)/)?.[1] || '';
    let scoreId = scoreIdFromLink;
    const titleEl = card.querySelector ? card.querySelector('.truncate span, .whitespace-nowrap span, span.font-medium, .truncate') : null;
    const songTitle = titleEl?.textContent?.trim()
      || (link && link.textContent && !/^\d+(\.\d+)?%$/.test(link.textContent.trim()) ? link.textContent.trim() : '')
      || 'Unknown';

    let timeAgo = '';
    const timeMatch = text.match(/(\d+\s+(second|minute|hour|day|week|month|year)s?\s+ago)/i);
    if (timeMatch) timeAgo = timeMatch[1];

    let misses = '0';
    const missContainer = card.querySelector('[class*="border-red-"], [class*="bg-red-500"], [class*="border-emerald-"], [class*="bg-emerald-500"]');
    if (missContainer) {
      const isFc = missContainer.className.includes('emerald');
      if (isFc) {
        misses = '0';
      } else {
        const numEl = missContainer.querySelector('[class*="font-semibold"], [class*="text-[12px]"], [class*="text-[13px]"]') || missContainer.lastElementChild;
        const numText = numEl?.textContent?.replace(/[, ]/g, '').trim() || '';
        if (/^\d+$/.test(numText)) misses = numText;
      }
    } else {
      const missBadge = card.querySelector('[class*="bg-red-700"]');
      if (missBadge) {
        const numEl = missBadge.querySelector('[class*="font-semibold"]');
        if (numEl) {
          const numText = numEl.textContent.trim();
          if (/^\d+$/.test(numText)) misses = numText;
        }
      }
      if (misses === '0') {
        const missesMatch = text.match(/(\d{1,3})\s*(?:miss|misses)/i);
        if (missesMatch) misses = missesMatch[1];
      }
    }

    let rpEarned = '0';
    let weightedRp = '0';

    // Joined RP boxes: right box is Raw RP (bg-blue-500/10), left box is Weighted RP (must have weight/wrp text)
    const blueRpBox = card.querySelector('[class*="bg-blue-500"], [class*="border-blue-400"]');
    if (blueRpBox) {
      const blueNum = Array.from(blueRpBox.children)
        .map(el => el.textContent.replace(/[, ]/g, '').trim())
        .find(t => /^\d+(?:\.\d+)?$/.test(t));
      if (blueNum) {
        rpEarned = blueNum;
      }
      const prevBox = blueRpBox.previousElementSibling;
      if (prevBox && /weight|wrp/i.test(prevBox.textContent)) {
        const wNum = Array.from(prevBox.children)
          .map(el => el.textContent.replace(/[, ]/g, '').trim())
          .find(t => /^\d+(?:\.\d+)?$/.test(t));
        if (wNum) {
          weightedRp = wNum;
        }
      }
    }

    if (rpEarned === '0') {
      const rpEarnedMatch = text.match(/RP\s+Earned\s*([\d,]+(?:\.\d+)?)/i);
      if (rpEarnedMatch) {
        rpEarned = rpEarnedMatch[1].replace(/,/g, '');
      } else {
        const rpMatches = [...text.matchAll(/RP\s*([\d,]+(?:\.\d+)?)/gi)];
        for (const m of rpMatches) {
          const before = text.substring(Math.max(0, m.index - 12), m.index);
          if (!/Weighted\s*$/i.test(before)) {
            rpEarned = m[1].replace(/,/g, '');
            break;
          }
        }
      }
    }

    const difficultyColor = card.style.getPropertyValue('--difficulty-color') || '';

    let speed = 1.0;
    let speedIcon = '';
    const detectedMods = [];
    const detectedModItems = [];
    const modImages = card.querySelectorAll('img[src*="/mod"], img[alt*="Speed:"]');
    modImages.forEach(img => {
      const alt = (img.getAttribute('alt') || '').trim();
      const src = (img.getAttribute('src') || '').trim();
      if (alt.startsWith('Speed:') || src.includes('modspeed')) {
        speedIcon = src;
        const speedM = alt.match(/Speed:\s*([\d.]+)x/) || src.match(/modspeed([a-z]+)/);
        if (speedM) {
          if (speedM[1] && /[\d.]+/.test(speedM[1])) {
            speed = parseFloat(speedM[1]);
          } else if (src.includes('plusplusplusplus')) speed = 1.45;
          else if (src.includes('plusplusplus')) speed = 1.35;
          else if (src.includes('plusplus')) speed = 1.25;
          else if (src.includes('plus')) speed = 1.15;
          else if (src.includes('minusminusminus')) speed = 0.75;
          else if (src.includes('minusminus')) speed = 0.80;
          else if (src.includes('minus')) speed = 0.87;
        }
      } else {
        // Universal detection: identify any mod image on Rhythia automatically
        let label = alt;
        if (!label || label.toLowerCase().endsWith('.png') || label.toLowerCase() === 'icon') {
          const m = src.match(/\/mod([a-zA-Z0-9_-]+)\.png/i);
          if (m) {
            label = m[1].replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
          }
        }
        if (/^mirror\s*xy$/i.test(label) || src.includes('mirrorxy')) label = 'Mirror XY';
        else if (/^mirror\s*x$/i.test(label) || src.includes('mirrorx')) label = 'Mirror X';
        else if (/^mirror\s*y$/i.test(label) || src.includes('mirrory')) label = 'Mirror Y';
        else if (/^ghost$/i.test(label) || src.includes('ghost')) label = 'Ghost';
        else if (/^no\s*fail$/i.test(label) || src.includes('nofail')) label = 'No Fail';
        else if (/^sudden\s*death$/i.test(label) || src.includes('suddendeath')) label = 'Sudden Death';
        else if (/^hard\s*rock$/i.test(label) || src.includes('hardrock')) label = 'Hard Rock';
        else if (/^auto\s*restart$/i.test(label) || src.includes('autorestart')) label = 'Auto Restart';
        else if (/^chaos$/i.test(label) || src.includes('chaos')) label = 'Chaos';
        else if (/^360$/i.test(label) || src.includes('360')) label = '360';
        else if (/^vr$/i.test(label) || src.includes('vr')) label = 'VR';
        else if (/^spin$/i.test(label) || src.includes('spin')) label = 'Spin';
        else if (/^flashlight$/i.test(label) || src.includes('flashlight')) label = 'Flashlight';
        else if (/^hidden$/i.test(label) || src.includes('hidden')) label = 'Hidden';
        else if (/^fade$/i.test(label) || src.includes('fade')) label = 'Fade';

        if (label && !detectedMods.includes(label)) {
          detectedMods.push(label);
          detectedModItems.push({
            label,
            iconUrl: src,
            isSpeed: false
          });
        }
      }
    });

    card.dataset.rhythiaxSpeed = RhythiaX.normalizeSpeed(speed);

    const expanded = RhythiaX.findExpandedPanel(card);
    let mods = detectedMods.length > 0 ? detectedMods.join(', ') : '--', notes = '0';

    // Helper: parse pills from an element
    function parsePills(parent) {
      const labelEls = parent.querySelectorAll ? parent.querySelectorAll('.text-neutral-300, [class*="text-neutral-300"]') : [];
      labelEls.forEach(labelEl => {
        const pill = labelEl.closest ? (labelEl.closest('.bg-\\[\\#1F2021\\], [class*="rounded-lg"]') || labelEl.parentElement) : labelEl.parentElement;
        const valueEl = pill ? pill.querySelector('.text-neutral-100, [class*="text-neutral-100"]') : labelEl.nextElementSibling;
        if (!valueEl) return;
        const label = labelEl.textContent.trim();
        const value = valueEl.textContent.trim();
        if (label === 'Mods' && value && value !== '--' && value.toLowerCase() !== 'none' && value.toLowerCase() !== 'no mod') mods = value;
        else if (label === 'Notes') notes = value;
        else if (label === 'Weighted RP' && weightedRp === '0') weightedRp = value;
        else if (label === 'RP Earned' && (!rpEarned || rpEarned === '0')) rpEarned = value;
        else if (label === 'Misses' && (!misses || misses === '0')) misses = value;
      });
    }

    if (expanded) {
      parsePills(expanded);
    }

    // Fallback: scan entire card's textContent if pills weren't found
    if (notes === '0' || weightedRp === '0' || mods === '--') {
      const fullText = card.textContent;
      const notesFallback = fullText.match(/Notes\s*(\d+)/i);
      if (notesFallback && notes === '0') notes = notesFallback[1];
      const weightedFallback = fullText.match(/Weighted\s+RP\s*([\d.]+)/i);
      if (weightedFallback && weightedRp === '0') weightedRp = weightedFallback[1];
      if (mods === '--') {
        const modsFallback = fullText.match(/Mods\s*(\S+)/i);
        if (modsFallback) mods = modsFallback[1];
      }
    }

    const scoreType = card.dataset?.rhythiaxScoreType
      || (RhythiaX.getProfileScoreType ? RhythiaX.getProfileScoreType(card) : (RhythiaX.ScoreCardService?.profileType(card) || ''));

    const mapLink = card.querySelector ? card.querySelector('a[href*="/maps/"]') : null;
    let beatmapId = (card.getAttribute ? card.getAttribute('data-rhythiax-beatmap-id') : null) || card.dataset?.rhythiaxBeatmapId || (mapLink?.getAttribute ? mapLink.getAttribute('href') : mapLink?.href)?.match(/\/maps\/(\d+)/)?.[1] || '';
    let beatmapHash = (card.getAttribute ? card.getAttribute('data-rhythiax-beatmap-hash') : null) || card.dataset?.rhythiaxBeatmapHash || '';
    let songId = (card.getAttribute ? card.getAttribute('data-rhythiax-song-id') : null) || card.dataset?.rhythiaxSongId || '';
    let mapper = (card.getAttribute ? card.getAttribute('data-rhythiax-mapper') : null) || card.dataset?.rhythiaxMapper || '';

    // Enrich with API score data if available (e.g. beatmapNotes, scoreId)
    const apiMatch = RhythiaX.findMatchingApiScore?.(scoreId, songTitle, speed, rpEarned, scoreType);
    if (apiMatch) {
      if ((!notes || notes === '0') && apiMatch.beatmapNotes) notes = String(apiMatch.beatmapNotes);
      if (!scoreId && (apiMatch.id || apiMatch.scoreId)) scoreId = String(apiMatch.id || apiMatch.scoreId);
      if (!beatmapId && (apiMatch.beatmapId || apiMatch.mapId)) beatmapId = String(apiMatch.beatmapId || apiMatch.mapId);
      if (!beatmapHash && (apiMatch.beatmapHash || apiMatch.songId)) beatmapHash = String(apiMatch.beatmapHash || apiMatch.songId);
      if (!songId && (apiMatch.songId || apiMatch.beatmapHash)) songId = String(apiMatch.songId || apiMatch.beatmapHash);
      if (!mapper && (apiMatch.mapper || apiMatch.ownerUsername || apiMatch.author)) mapper = String(apiMatch.mapper || apiMatch.ownerUsername || apiMatch.author);
      if ((!misses || misses === '0') && apiMatch.misses !== undefined && apiMatch.misses !== null && !card.querySelector('[class*="border-emerald-"]')) {
        misses = String(apiMatch.misses);
      }
      if ((!rpEarned || rpEarned === '0') && (apiMatch.awarded_sp || apiMatch.rpEarned)) {
        rpEarned = String(apiMatch.awarded_sp || apiMatch.rpEarned);
      }
      if ((!weightedRp || weightedRp === '0') && apiMatch.weightedRp && apiMatch.weightedRp !== '0') {
        weightedRp = String(apiMatch.weightedRp);
      }
    }

    if (!mapper) {
      const mapKey = beatmapId || songId || beatmapHash;
      if (mapKey && RhythiaX.getStoredBeatmapMeta) {
        const meta = RhythiaX.getStoredBeatmapMeta(mapKey);
        if (meta?.ownerUsername) mapper = String(meta.ownerUsername).trim();
      }
    }

    return RhythiaX.normalizeScore({
      scoreId, grade, accuracy, songTitle, timeAgo, misses, rpEarned,
      ...(grade !== '?' ? { gradeSource: 'page' } : {}),
      weightedRp, notes, mods, difficultyColor, speed, speedIcon, modItems: detectedModItems,
      rankIndex: apiMatch?.rankIndex,
      weightPercent: apiMatch?.weightPercent,
      absoluteDate: RhythiaX.parseRelativeTime(timeAgo),
      element: card,
      expandedElement: expanded,
      beatmapId,
      beatmapHash,
      songId,
      mapper,
    });
  };
