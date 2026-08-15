// =============================================
// Rhythia X - Title Progression memory
// =============================================

var RhythiaX = RhythiaX || {};

function titleDataNumber(value) {
  if (value === undefined || value === null || String(value).trim() === '' || String(value).trim() === '—') return null;
  const number = RhythiaX.parseLocalizedNumber
    ? RhythiaX.parseLocalizedNumber(String(value).replace('%', ''))
    : Number.parseFloat(String(value).replace(',', '.'));
  return Number.isFinite(number) ? number : null;
}

function titleDataRank(value) {
  if (value === undefined || value === null || String(value).trim() === '' || String(value).trim() === '—') return null;
  const number = Number.parseInt(String(value).replace(/[^0-9]/g, ''), 10);
  return Number.isFinite(number) ? number : null;
}

function titleDataName(rp, globalRank) {
  if (globalRank !== null && globalRank > 0 && globalRank <= 30) return 'Grandmaster';
  if (rp >= 10000) return 'Candidate Grandmaster';
  if (rp >= 5000) return 'Master';
  if (rp >= 2500) return 'Candidate Master';
  if (rp >= 1500) return 'Expert';
  return 'Novice';
}

function titleDataSnapshot(player, phase, visitId, source) {
  const capturedAt = Date.now();
  const rp = titleDataNumber(player?.rp);
  const globalRank = titleDataRank(player?.globalRank);
  const missing = ['rp', 'globalRank'].filter(key => (key === 'rp' ? rp : globalRank) === null);
  return {
    id: `${String(visitId || 'title')}:${phase}`,
    visitId: String(visitId || ''),
    kind: 'title',
    phase,
    date: RhythiaX.localDateKey(new Date(capturedAt)),
    capturedAt,
    status: missing.length ? 'partial' : 'complete',
    source: source === 'api' ? 'api' : 'dom',
    missing,
    rp,
    globalRank,
    title: missing.length ? '' : titleDataName(rp, globalRank),
    unavailable: missing.length > 0,
  };
}

function titleDataWrite(task) {
  return RhythiaX.dataCanonicalWrite(task);
}

function titleDataComplete(state) {
  return Boolean(state && state.status === 'complete' && !state.unavailable
    && Number.isFinite(Number(state.rp)) && Number.isFinite(Number(state.globalRank)));
}

async function titleDataSave(profileId, player, state) {
  if (!titleDataComplete(state)) return { saved: false, reason: 'partial-title-state', state };
  const settings = await RhythiaX.getDataSettings();
  if (!settings.collectTitleProgression) return { saved: false, reason: 'title-collection-disabled', state };
  const record = await RhythiaX.getDataRecord(profileId) || RhythiaX.createDataRecord(profileId, player, state.capturedAt);
  record.identity = {
    username: String(player?.username || record.identity?.username || '').trim(),
    country: String(player?.country || player?.countryCode || record.identity?.country || '').trim(),
  };
  record.titleProgression = { last: { ...state, phase: 'last' } };
  record.updatedAt = state.capturedAt;
  const saved = await RhythiaX.saveDataRecord(record);
  return { saved: true, state: saved.titleProgression.last, record: saved };
}

function titleDataInstallExitFallback(visit) {
  if (typeof window === 'undefined' || visit.exitFallbackInstalled) return;
  visit.exitFallbackInstalled = true;
  visit.exitFallback = () => {
    if (visit.exitSaved || !titleDataComplete(visit.initialSnapshot)) return;
    visit.exitSaved = true;
    titleDataWrite(() => titleDataSave(visit.playerId, visit.initialPlayer, visit.initialSnapshot)).catch(error => {
      RhythiaX.captureError(error, 'Title Progression exit fallback failed');
    });
  };
  window.addEventListener('pagehide', visit.exitFallback, { once: true });
}

RhythiaX.beginTitleProgressionVisit = function (playerId, player) {
  if (!playerId) return null;
  const visitId = `${String(playerId)}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const visit = {
    playerId: String(playerId),
    visitId,
    previousReady: null,
    previousState: null,
    previousPlayer: null,
    initialPlayer: null,
    initialSnapshot: null,
    updatedSnapshot: null,
    exitFallbackInstalled: false,
    exitSaved: false,
  };
  visit.previousReady = titleDataWrite(async () => {
    const record = await RhythiaX.getDataRecord(visit.playerId);
    const previous = record?.titleProgression?.last;
    if (!titleDataComplete(previous)) return;
    visit.previousState = previous;
    visit.previousPlayer = {
      ...player,
      rp: previous.rp,
      globalRank: previous.globalRank,
    };
  });
  RhythiaX.activeTitleProgressionVisit = visit;
  return visit;
};

RhythiaX.recordTitleProgressionSnapshot = function (visit, player, phase) {
  if (!visit || !['initial', 'updated'].includes(phase)) return Promise.resolve();
  if (phase === 'initial') {
    if (visit.initialSnapshot) return Promise.resolve(visit.initialSnapshot);
    visit.initialPlayer = { ...(player || {}) };
    visit.initialSnapshot = titleDataSnapshot(player, 'initial', visit.visitId, 'dom');
    titleDataInstallExitFallback(visit);
    // Storage writes cannot be guaranteed to finish during pagehide, so retain
    // a complete initial state as soon as it is available.
    return visit.previousReady
      .then(() => titleDataWrite(() => titleDataSave(visit.playerId, visit.initialPlayer, visit.initialSnapshot)))
      .then(result => {
        if (result?.saved) visit.exitSaved = true;
        return result?.state || visit.initialSnapshot;
      })
      .catch(error => {
        RhythiaX.captureError(error, 'Initial Title Progression persistence failed');
        return visit.initialSnapshot;
      });
  }
  if (visit.updatedSnapshot) return Promise.resolve(visit.updatedSnapshot);
  visit.updatedSnapshot = titleDataSnapshot(player, 'updated', visit.visitId, 'api');
  return visit.previousReady
    .then(() => titleDataWrite(() => titleDataSave(visit.playerId, player, visit.updatedSnapshot)))
    .then(result => result?.state || visit.updatedSnapshot);
};

RhythiaX.getDataTitleProgressionState = async function (profileId) {
  const record = await RhythiaX.getDataRecord(profileId);
  return record?.titleProgression?.last || null;
};
