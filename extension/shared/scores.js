// =============================================
// Rhythia X — Score extraction & mapping
// =============================================

var RhythiaX = RhythiaX || {};

// Keep DOM, API and cache score objects interchangeable. Renderers may add
// derived fields, but these core fields always have the same names/types.
RhythiaX.normalizeScore = function (score) {
  const next = { ...(score || {}) };
  next.scoreId = String(next.scoreId ?? next.id ?? '');
  next.grade = String(next.grade || '?').toUpperCase();
  next.accuracy = next.accuracy === '' || next.accuracy == null ? '—' : String(next.accuracy);
  next.misses = String(next.misses ?? '0');
  const parsedMisses = Number.parseInt(next.misses, 10);
  next.fullCombo = !Number.isNaN(parsedMisses)
    ? parsedMisses === 0
    : (next.fullCombo === true || next.fullCombo === 1);
  next.rpEarned = String(next.rpEarned ?? next.rawRp ?? '0');
  next.weightedRp = String(next.weightedRp ?? '0');
  next.songTitle = String(next.songTitle || next.title || 'Unknown');
  next.artist = String(next.artist || '');
  next.difficulty = String(next.difficulty || '');
  next.speed = RhythiaX.normalizeSpeed(next.speed);
  next.mods = String(next.mods || '--');
  next.notes = String(next.notes ?? '0');
  next.beatmapNotes = next.beatmapNotes === '' || next.beatmapNotes == null ? null : Number(next.beatmapNotes);
  if (!Number.isFinite(next.beatmapNotes) || next.beatmapNotes <= 0) next.beatmapNotes = null;
  next.beatmapDifficulty = next.beatmapDifficulty === '' || next.beatmapDifficulty == null ? null : Number(next.beatmapDifficulty);
  if (!Number.isFinite(next.beatmapDifficulty) || next.beatmapDifficulty < 0) next.beatmapDifficulty = null;
  next.timeAgo = String(next.timeAgo || '');
  next.date = next.date || next.createdAt || next.submittedAt || next.created_at || '';
  next.replayUrl = String(next.replayUrl || next.replay_url || '');
  next.beatmapHash = String(next.beatmapHash || next.hash || next.songId || '');
  next.songId = String(next.songId || next.beatmapHash || '');
  next.beatmapId = String(next.beatmapId || next.mapId || '');
  next.mapper = String(next.mapper || next.ownerUsername || next.author || next.beatmapAuthor || '');
  if (!next.mapper) {
    const mapKey = next.beatmapId || next.songId || next.beatmapHash;
    if (mapKey && RhythiaX.getStoredBeatmapMeta) {
      const meta = RhythiaX.getStoredBeatmapMeta(mapKey);
      if (meta?.ownerUsername) {
        next.mapper = String(meta.ownerUsername).trim();
        next.ownerUsername = next.mapper;
      }
    }
  }
  if (score?.rankIndex !== undefined) next.rankIndex = score.rankIndex;
  if (score?.weightPercent !== undefined) next.weightPercent = score.weightPercent;
  return next;
};

RhythiaX.applyWeightedRanking = function (scores) {
  (scores || []).forEach((score, index) => {
    const rawRp = RhythiaX.parseLocalizedNumber
      ? RhythiaX.parseLocalizedNumber(score.rpEarned)
      : (Number.parseFloat(String(score.rpEarned ?? '').replace(/,/g, '')) || 0);
    const factor = Math.pow(0.97, index);
    score.rankIndex = index + 1;
    score.weightedRp = String(Math.round(rawRp * factor));
    score.weightPercent = Math.round(factor * 100);
  });
  return scores || [];
};

// Recent plays contribute only when that exact submission is in this mode's top 100.
RhythiaX.applyRecentWeightedRanking = function (recentScores, topScores) {
  const topById = new Map((topScores || []).slice(0, 100)
    .filter(score => score.scoreId)
    .map(score => [String(score.scoreId), score]));
  (recentScores || []).forEach(score => {
    const topScore = score.scoreId ? topById.get(String(score.scoreId)) : null;
    score.weightedRp = topScore ? String(topScore.weightedRp ?? '0') : '0';
    score.weightPercent = topScore ? (topScore.weightPercent ?? 0) : 0;
  });
  return recentScores || [];
};

// ─── Beatmap Metadata Cache & Async Resolver ────────
const BEATMAP_MEMORY_CACHE_MAX_ENTRIES = 512;

// Keep Map callers compatible, including direct writes, while bounding long SPA
// sessions. Hash/id aliases count as separate keys; persistent metadata remains
// available if an alias is evicted from memory.
class BeatmapMemoryCache extends Map {
  get(key) {
    const value = super.get(key);
    if (super.has(key)) {
      super.delete(key);
      super.set(key, value);
    }
    return value;
  }

  set(key, value) {
    super.delete(key);
    super.set(key, value);
    while (this.size > BEATMAP_MEMORY_CACHE_MAX_ENTRIES) {
      super.delete(this.keys().next().value);
    }
    return this;
  }
}

RhythiaX.beatmapCache = new BeatmapMemoryCache(RhythiaX.beatmapCache);
RhythiaX.beatmapMetaCache = new BeatmapMemoryCache(RhythiaX.beatmapMetaCache);
RhythiaX.beatmapInFlight = RhythiaX.beatmapInFlight || new Map();

// Rate-limiting for network beatmap metadata requests (max 8 req/s -> 125ms interval)
let lastBeatmapFetchTime = 0;
const BEATMAP_NETWORK_FETCH_INTERVAL_MS = 125;

function throttleBeatmapFetch() {
  const now = Date.now();
  const nextAllowed = Math.max(now, lastBeatmapFetchTime + BEATMAP_NETWORK_FETCH_INTERVAL_MS);
  lastBeatmapFetchTime = nextAllowed;
  const delay = nextAllowed - now;
  return delay > 0 ? new Promise(resolve => setTimeout(resolve, delay)) : Promise.resolve();
}

function cacheNotFoundBeatmap(str, id = null) {
  const notFoundMeta = { id, previewUrl: null, notFound: true, cachedAt: Date.now() };
  RhythiaX.beatmapMetaCache.set(str, notFoundMeta);
  if (id && String(id) !== str) {
    RhythiaX.beatmapMetaCache.set(String(id), notFoundMeta);
  }
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('rhythiax_beatmap_' + str, JSON.stringify(notFoundMeta));
      if (id && String(id) !== str) {
        localStorage.setItem('rhythiax_beatmap_' + String(id), JSON.stringify(notFoundMeta));
      }
    }
  } catch (_) {}
  return notFoundMeta;
}

RhythiaX.getStoredBeatmapMeta = function (mapHashOrId) {
  if (!mapHashOrId) return null;
  const str = String(mapHashOrId).trim();
  if (RhythiaX.beatmapMetaCache.has(str)) return RhythiaX.beatmapMetaCache.get(str);
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('rhythiax_beatmap_' + str) : null;
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        RhythiaX.beatmapMetaCache.set(str, parsed);
        if (parsed.id) RhythiaX.beatmapCache.set(str, Number(parsed.id));
        return parsed;
      }
    }
  } catch (err) {
    console.warn(`could not load background art due to: [could not access localStorage: ${err?.message || err}] (${str})`);
  }
  return null;
};

RhythiaX.resolveBeatmapMeta = async function (mapHashOrId) {
  if (!mapHashOrId) return null;
  const str = String(mapHashOrId).trim();

  // Return immediately if fully cached (either notFound or valid meta with ownerUsername resolved)
  const stored = RhythiaX.getStoredBeatmapMeta(str);
  if (stored) {
    if (stored.notFound) return stored;
    if (stored.ownerUsername !== undefined && (stored.previewUrl !== undefined || stored.id)) return stored;
  }

  // Deduplicate in-flight requests for the same hash/id
  if (RhythiaX.beatmapInFlight.has(str)) {
    return RhythiaX.beatmapInFlight.get(str);
  }

  const fetchPromise = (async () => {
    try {
      const isNum = /^\d+$/.test(str);
      const endpoint = isNum
        ? 'https://production.rhythia.com/api/getBeatmapPage'
        : 'https://production.rhythia.com/api/getBeatmapPageById';
      const body = isNum ? { id: Number(str), session: '' } : { mapId: str, session: '' };

      await throttleBeatmapFetch();

      let res;
      try {
        res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
          body: JSON.stringify(body),
        });
      } catch (networkErr) {
        console.warn(`could not load background art due to: [could not connect with Rhythia: ${networkErr?.message || networkErr}] (${str})`);
        return cacheNotFoundBeatmap(str);
      }

      if (!res.ok) {
        console.warn(`could not load background art due to: [could connect with Rhythia, but server returned HTTP status ${res.status}] (${str})`);
        return cacheNotFoundBeatmap(str);
      }

      let data;
      try {
        data = await res.json();
      } catch (parseErr) {
        console.warn(`could not load background art due to: [could connect with Rhythia, but could not parse response JSON] (${str})`);
        return cacheNotFoundBeatmap(str);
      }

      const b = data?.beatmap;
      if (!b) {
        console.warn(`could not load background art due to: [could connect with Rhythia, but beatmap not found on server] (${str})`);
        return cacheNotFoundBeatmap(str);
      }

      const id = b.id != null ? Number(b.id) : (isNum ? Number(str) : null);
      const previewUrl = b.previewImage?.medium
        || b.previewImage?.small
        || b.previewImage?.large
        || b.image
        || null;

      const meta = {
        id,
        previewUrl,
        title: b.title || null,
        lengthMs: Number(b.length) || null,
        ownerUsername: b.ownerUsername || null,
      };
      RhythiaX.beatmapMetaCache.set(str, meta);
      if (id) {
        RhythiaX.beatmapCache.set(str, id);
        if (String(id) !== str) {
          RhythiaX.beatmapMetaCache.set(String(id), meta);
        }
      }
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('rhythiax_beatmap_' + str, JSON.stringify(meta));
          if (id && String(id) !== str) {
            localStorage.setItem('rhythiax_beatmap_' + String(id), JSON.stringify(meta));
          }
        }
      } catch (saveErr) {
        console.warn(`could not cache background art due to: [could not access or write to localStorage: ${saveErr?.message || saveErr}] (${str})`);
      }

      const returnedSongId = b.songId || data?.scores?.[0]?.songId || null;
      if (returnedSongId && String(returnedSongId) !== str) {
        RhythiaX.beatmapMetaCache.set(String(returnedSongId), meta);
        try {
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem('rhythiax_beatmap_' + String(returnedSongId), JSON.stringify(meta));
          }
        } catch (_) {}
      }
      return meta;
    } catch (err) {
      console.warn(`could not load background art due to: [unexpected error: ${err?.message || err}] (${str})`);
      return cacheNotFoundBeatmap(str);
    } finally {
      RhythiaX.beatmapInFlight.delete(str);
    }
  })();

  RhythiaX.beatmapInFlight.set(str, fetchPromise);
  return fetchPromise;
};

RhythiaX.resolveBeatmapId = async function (mapHashOrId) {
  if (!mapHashOrId) return null;
  const str = String(mapHashOrId).trim();
  if (/^\d+$/.test(str)) return Number(str);
  if (RhythiaX.beatmapCache.has(str)) return RhythiaX.beatmapCache.get(str);

  const meta = await RhythiaX.resolveBeatmapMeta(str);
  return meta?.id || null;
};

// ─── Score extraction ────────────────────────
RhythiaX.findMatchingApiScore = function (scoreId, songTitle, speed, rpEarned, scoreType) {
  const ctx = RhythiaX.profileHistoryContext?.scoreSets;
  const candidates = [];
  if (scoreType === 'top' && ctx?.topScores) candidates.push(...ctx.topScores);
  else if (scoreType === 'reigning' && ctx?.reignScores) candidates.push(...ctx.reignScores);
  else if (scoreType === 'recent' && ctx?.recentScores) candidates.push(...ctx.recentScores);

  const fallback = ctx?.allCardScores || ctx?.scores || RhythiaX.lastScoreSets?.scores || [];
  candidates.push(...fallback);
  if (ctx?.recentScores) candidates.push(...ctx.recentScores);
  if (ctx?.reignScores) candidates.push(...ctx.reignScores);
  if (ctx?.topScores) candidates.push(...ctx.topScores);

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

RhythiaX.extractScores = function () {
  const cards = RhythiaX.findScoreCards();
  RhythiaX.log('Found score cards:', cards.length);

  return cards
    .map(RhythiaX.parseScoreCard)
    .filter(RhythiaX.isScoreHydrated);
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

RhythiaX.dedupeScores = function (scores) {
  if (!scores || !scores.length) return [];
  const bestPerMap = new Map();
  const parseNum = value => (RhythiaX.parseLocalizedNumber ? RhythiaX.parseLocalizedNumber(value) : (Number.parseFloat(String(value ?? '').replace(/,/g, '')) || 0));
  scores.forEach(s => {
    const key = s.scoreId || [s.songTitle, s.mods, s.speed, s.difficultyColor].join('|') || 'unknown-score';
    const rp = parseNum(s.rpEarned);
    const existing = bestPerMap.get(key);
    if (!existing || rp > parseNum(existing.rpEarned)) {
      bestPerMap.set(key, s);
    }
  });
  return Array.from(bestPerMap.values());
};

RhythiaX.mapApiScores = function (rawScores) {
  if (!Array.isArray(rawScores)) return [];
  return rawScores.filter(s => s && typeof s === 'object' && !Array.isArray(s)).map(s => {
    let accuracy = '—';
    let accNum = null;
    const noteCount = s.beatmapNotes ?? s.totalNotes ?? s.noteCount;
    const beatmapDifficulty = s.beatmapDifficulty ?? s.beatmap_difficulty ?? s.difficultyRating ?? s.starRating
      ?? (typeof s.difficulty === 'number' ? s.difficulty : undefined);
    const missCount = s.misses ?? s.missCount ?? s.numMisses ?? 0;
    if (s.accuracy !== undefined && s.accuracy !== null) {
      accNum = RhythiaX.parseLocalizedNumber
        ? RhythiaX.parseLocalizedNumber(s.accuracy)
        : Number.parseFloat(String(s.accuracy).replace('%', ''));
      if (Number.isFinite(accNum)) accuracy = accNum.toFixed(2) + '%';
    } else if (noteCount > 0) {
      accNum = noteCount > 0 ? (1 - missCount / noteCount) * 100 : null;
      if (accNum !== null) accuracy = accNum.toFixed(2) + '%';
    }

    let grade = s.grade && typeof s.grade === 'string' ? s.grade.trim().toUpperCase() : '?';
    if (!RhythiaX.GRADE_ORDER.includes(grade)) grade = '?';
    if (grade === '?' && s.passed === false) {
      grade = 'F';
    } else if (grade === '?' && accNum !== null) {
      if (missCount === 0 && accNum >= 100) grade = 'SS';
      else if (accNum >= 98) grade = 'S';
      else if (accNum >= 95) grade = 'A';
      else if (accNum >= 93) grade = 'B';
      else if (accNum >= 90) grade = 'C';
      else if (accNum >= 80) grade = 'D';
      else grade = 'F';
    } else if (grade === '?') {
      grade = s.passed === false ? 'F' : '?';
    }
    const misses = String(s.misses ?? s.missCount ?? s.numMisses ?? 0);
    const pickValue = (...values) => {
      const usable = values.filter(value => value !== undefined && value !== null && value !== '');
      return usable.find(value => {
        const num = RhythiaX.parseLocalizedNumber
          ? RhythiaX.parseLocalizedNumber(value)
          : Number.parseFloat(String(value).replace(',', '.'));
        return Number.isFinite(num) && num !== 0;
      }) ?? usable[0] ?? 0;
    };
    // Raw RP is the unweighted value earned by the play. `awarded_sp` is only
    // a final fallback because some API responses expose weighted gain there.
    const rpEarnedValue = pickValue(s.rawRp, s.raw_rp, s.rpEarned, s.rp_earned, s.awarded_sp, s.awardedSp);
    const rpEarned = String(rpEarnedValue ?? 0);
    const songTitle = s.beatmapTitle || s.songTitle || s.title || s.beatmapName || s.mapName || s.song_name || 'Unknown';
    const scoreId = String(s.id ?? s.scoreId ?? s.score_id ?? '');
    const rawSpeed = s.speed ?? s.speedMultiplier ?? s.speed_multiplier ?? s.multiplier ?? s.modSpeed ?? (/^\d+(?:\.\d+)?x?$/i.test(String(s.mod || '')) ? s.mod : undefined);
    const speed = RhythiaX.normalizeSpeed(rawSpeed);
    const mods = Array.isArray(s.mods)
      ? s.mods.join(', ') || '--'
      : s.mods && typeof s.mods === 'object'
        ? Object.keys(s.mods).filter(k => s.mods[k]).join(', ') || '--'
        : String(s.mods ?? s.modifiers ?? (/^\d+(?:\.\d+)?x?$/i.test(String(s.mod || '')) ? '--' : (s.mod ?? '--')));
    // WRP must be the score's current weighted value. `gainedRp` is a
    // different API field and can represent historical/earned RP.
    const weightedValue = pickValue(s.weightedRp, s.weightedRP, s.weighted_rp, s.weighted_sp, s.weightedSp, s.weightedSP, s.weightedScore, s.weighted_score, s.awarded_weighted_sp, s.awardedWeightedSp, s.awardedWeightedSP, s.weighted, s.gainedWeightedRp, s.gained_weighted_rp, s.score?.weightedRp, s.score?.weighted_rp, s.gainedRp, s.gained_rp, s.score?.gainedRp, s.score?.gained_rp);
    const weightedRp = String(weightedValue ?? 0);
    const fullCombo = s.fullCombo ?? s.full_combo ?? s.isFullCombo;
    return RhythiaX.normalizeScore({
      grade, accuracy, misses, fullCombo, rpEarned, songTitle, scoreId, speed, mods, weightedRp,
      difficulty: s.difficulty || s.difficultyName || s.level || '',
      beatmapNotes: noteCount,
      beatmapDifficulty,
      notes: String(noteCount ?? 0),
      replayUrl: s.replay_url || s.replayUrl || '',
      beatmapHash: s.beatmapHash || s.songId || '',
      songId: s.songId || s.beatmapHash || '',
      beatmapId: s.beatmapId || s.mapId || '',
      mapper: s.mapper || s.ownerUsername || s.author || s.beatmapAuthor || s.creator || '',
      date: s.created_at || s.createdAt || s.date || '',
    });
  });
};
