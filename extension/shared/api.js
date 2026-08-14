// =============================================
// Rhythia X — API fetch & cross-verification
// =============================================

var RhythiaX = RhythiaX || {};

function createApiRequestSignal(parentSignal, timeoutMs = 15000) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  const timer = window.setTimeout(abort, timeoutMs);
  if (parentSignal?.aborted) abort();
  else parentSignal?.addEventListener('abort', abort, { once: true });
  return {
    signal: controller.signal,
    dispose: () => {
      window.clearTimeout(timer);
      parentSignal?.removeEventListener('abort', abort);
    },
  };
}

function validPlayerId(playerId) {
  const id = String(playerId ?? '').trim();
  return /^[1-9]\d{0,15}$/.test(id) && Number.isSafeInteger(Number(id));
}

// ─── Background fetch ─────────────────────────
RhythiaX.fetchPlayerScoreSets = async function (playerId, signal) {
  if (!validPlayerId(playerId)) {
    RhythiaX.error('Refused score API request with an invalid player ID');
    return null;
  }
  const request = createApiRequestSignal(signal);
  try {
    const resp = await fetch('https://production.rhythia.com/api/getUserScores', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
      signal: request.signal,
       body: JSON.stringify({ id: Number(playerId), limit: 200, session: localStorage.getItem('rhythia_auth_session_v1') || '' }),
    });
     if (!resp.ok) { RhythiaX.error('REST API returned an unsuccessful status', { status: resp.status }); return null; }
     const data = await resp.json();
      if (!data || typeof data !== 'object' || Array.isArray(data) || data.error) { RhythiaX.error('REST API returned an invalid or application-error response'); return null; }
    // `top` is the bounded score list used by the profile. `recent` and
    // `lastDay` are auxiliary "last 10" style lists and must not be added to
    // the profile totals. Reigning scores are the one intentional exception:
    // they count when they are outside the bounded top list.
     const asList = value => Array.isArray(value) ? value : [];
     const validEntries = scores => scores.filter(score => score && typeof score === 'object' && !Array.isArray(score));
      const rawTopSource = [data.top, data.topScores, data.scores, data.userScores, data.user_scores, data.results]
        .map(asList)
        .map(validEntries)
        .find(scores => scores.length) || [];
     const rawTop = rawTopSource.slice(0, 200);
    const rawReign = [
       ...validEntries(asList(data.reign)),
       ...validEntries(asList(data.reigning)),
       ...validEntries(asList(data.reining)),
       ...validEntries(asList(data.reignScores)),
    ];
    const topScores = RhythiaX.dedupeScores(RhythiaX.mapApiScores(rawTop));
    const allScores = RhythiaX.dedupeScores(
      RhythiaX.mapApiScores([...rawTop, ...rawReign])
    );
    // Keep both properties for callers/cache compatibility, but make the
    // expanded set the source for every profile statistic.
    return {
      scores: allScores,
      ratingScores: allScores,
      topScores,
      topScoreCount: topScores.length,
       scoreLimit: 200,
    };
  } catch (err) {
    if (err?.name !== 'AbortError') RhythiaX.captureError(err, 'REST fetch failed');
    return null;
  } finally {
    request.dispose();
  }
};

RhythiaX.fetchPlayerScores = async function (playerId, signal) {
  const sets = await RhythiaX.fetchPlayerScoreSets(playerId, signal);
  return sets ? sets.scores : null;
};

RhythiaX.mergeWeightedRp = function (scoreSets, sourceScores) {
  const weightedById = new Map();
  (sourceScores || []).forEach(score => {
    const raw = String(score.weightedRp ?? '').trim();
    const value = /\d/.test(raw)
      ? (RhythiaX.parseLocalizedNumber ? RhythiaX.parseLocalizedNumber(raw) : Number.parseFloat(raw.replace(/,/g, '')))
      : Number.NaN;
    if (score.scoreId && Number.isFinite(value)) {
      weightedById.set(String(score.scoreId), String(value));
    }
  });
  [scoreSets?.scores, scoreSets?.ratingScores].forEach(scores => {
    (scores || []).forEach(score => {
      const weighted = weightedById.get(String(score.scoreId));
      if (weighted !== undefined) score.weightedRp = weighted;
    });
  });
  return scoreSets;
};

// ─── Cross-verify card data with API ──────────
RhythiaX.crossVerifyCardsWithApi = function (playerId, scoreSets) {
  if (!validPlayerId(playerId)) return Promise.resolve(new Map());

  // Do not fetch /player/:id/scores again. That route is a client-rendered SPA
  // page, so a content-script fetch can be blocked by CORS or return only the
  // app shell. The REST response and the cards already in the current DOM are
  // the two sources available to this page.
  return Promise.resolve().then(function () {
      var weightedMap = new Map();
      (scoreSets?.scores || []).forEach(function (score) {
        var raw = String(score.weightedRp ?? '').trim();
        var value = /\d/.test(raw)
          ? (RhythiaX.parseLocalizedNumber ? RhythiaX.parseLocalizedNumber(raw) : Number.parseFloat(raw.replace(/,/g, '')))
          : Number.NaN;
        if (score.scoreId && Number.isFinite(value) && value > 0) {
          weightedMap.set(String(score.scoreId), String(value));
        }
      });

      RhythiaX.findScoreCards().forEach(function (card) {
        var parsed = RhythiaX.parseScoreCard(card);
        var raw = String(parsed.weightedRp ?? '').trim();
        var value = /\d/.test(raw)
          ? (RhythiaX.parseLocalizedNumber ? RhythiaX.parseLocalizedNumber(raw) : Number.parseFloat(raw.replace(/,/g, '')))
          : Number.NaN;
        if (parsed.scoreId && Number.isFinite(value) && value > 0) {
          weightedMap.set(String(parsed.scoreId), String(value));
        }
      });

       // Feed the verified values back into the score objects used by Stats.
      [scoreSets?.scores, scoreSets?.ratingScores].forEach(function (scores) {
        (scores || []).forEach(function (score) {
          var weighted = weightedMap.get(String(score.scoreId));
          if (weighted !== undefined) score.weightedRp = weighted;
        });
      });

       // Now update cards on the current page
      var currentCards = RhythiaX.findScoreCards();
      currentCards.forEach(function (card) {
        var link = card.querySelector('a[href*="/score/"]');
        if (!link) return;
        var idMatch = link.href.match(/\/score\/(\d+)/);
        if (!idMatch) return;
        var sid = idMatch[1];
        if (!weightedMap.has(sid)) return;
        var correctRp = weightedMap.get(sid);
        if (!correctRp) return;

        // Update the card's Weighted RP display (pill in the expanded panel)
        var pills = card.querySelectorAll('.bg-\\[\\#1F2021\\]');
         pills.forEach(function (pill) {
           var labelEl = pill.querySelector('.text-neutral-300');
           var valueEl = pill.querySelector('.text-neutral-100');
           if (labelEl && valueEl && labelEl.textContent.trim() === 'Weighted RP') {
             valueEl.textContent = RhythiaX.formatNumber(Math.round(parseFloat(correctRp)));
           }
          });
        });
        return weightedMap;
       });
};
