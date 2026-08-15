// Conflict policy preserves the legacy newer-capture and completeness rules.
(function () {
  var RhythiaX = self.RhythiaX = self.RhythiaX || {};
  const clone = value => RhythiaX.DataTransferSerialization.clone(value);
  const quality = snapshot => snapshot?.status === 'complete' ? 2 : 1;
  const keyFor = snapshot => snapshot?.visitId ? `visit:${snapshot.visitId}` : `id:${snapshot?.id || ''}`;
  function mergeSnapshots(current, incoming) {
    if (current?.kind === 'title' || incoming?.kind === 'title') {
      const rp = incoming?.rp !== null && incoming?.rp !== undefined ? incoming.rp : current?.rp ?? null;
      const globalRank = incoming?.globalRank !== null && incoming?.globalRank !== undefined ? incoming.globalRank : current?.globalRank ?? null;
      const missing = ['rp', 'globalRank'].filter(item => (item === 'rp' ? rp : globalRank) === null);
      return { ...clone(current), capturedAt: Math.max(Number(current?.capturedAt) || 0, Number(incoming?.capturedAt) || 0), status: missing.length ? 'partial' : 'complete', source: 'merged', missing, rp, globalRank, title: incoming?.title || current?.title || '', unavailable: missing.length > 0 };
    }
    const metrics = {};
    RhythiaX.DATA_METRIC_KEYS.forEach(item => { metrics[item] = incoming?.metrics?.[item] !== null && incoming?.metrics?.[item] !== undefined ? incoming.metrics[item] : (current?.metrics?.[item] ?? null); });
    const missing = [...new Set([...(Array.isArray(current?.missing) ? current.missing : []), ...(Array.isArray(incoming?.missing) ? incoming.missing : [])])].filter(item => metrics[item] === null);
    return { ...clone(current), capturedAt: Math.max(Number(current?.capturedAt) || 0, Number(incoming?.capturedAt) || 0), status: missing.length ? 'partial' : 'complete', source: 'merged', missing, metrics };
  }
  function preferSnapshot(current, incoming) {
    if (!current) return incoming; if (!incoming) return current;
    if (quality(current) !== quality(incoming)) return mergeSnapshots(current, incoming);
    const currentTime = Number(current.capturedAt) || 0; const incomingTime = Number(incoming.capturedAt) || 0;
    if (incomingTime !== currentTime) return incomingTime > currentTime ? incoming : current;
    return quality(incoming) >= quality(current) ? incoming : current;
  }
  function mergeOpenDay(current, incoming) {
    if (!current) return clone(incoming); if (!incoming) return clone(current);
    if (String(incoming.date) !== String(current.date)) return String(incoming.date) > String(current.date) ? clone(incoming) : clone(current);
    const captures = new Map();
    [...(current.captures || []), ...(incoming.captures || [])].forEach(snapshot => captures.set(keyFor(snapshot), preferSnapshot(captures.get(keyFor(snapshot)), snapshot)));
    const merged = { ...clone(current), ...clone(incoming), date: current.date, captures: [...captures.values()].sort((left, right) => left.capturedAt - right.capturedAt), lastUpdatedAt: Math.max(Number(current.lastUpdatedAt) || 0, Number(incoming.lastUpdatedAt) || 0) || null };
    if (!incoming.limitOverride && current.limitOverride) merged.limitOverride = current.limitOverride;
    return merged;
  }
  function mergeRecord(current, incoming) {
    const left = RhythiaX.normalizeDataRecord(current, current?.profileId); const right = RhythiaX.normalizeDataRecord(incoming, incoming?.profileId);
    if (!left?.profileId) return right; if (!right?.profileId || left.profileId !== right.profileId) return left;
    const daily = { ...left.history.daily };
    Object.entries(right.history.daily || {}).forEach(([date, snapshot]) => { daily[date] = preferSnapshot(daily[date], snapshot); });
    const today = RhythiaX.localDateKey(new Date());
    if (right.history.openDay?.date && right.history.openDay.date < today) { const captures = right.history.openDay.captures || []; const latest = captures[captures.length - 1]; if (latest) { const closed = { ...clone(latest), kind: 'daily', date: right.history.openDay.date, id: `${right.history.openDay.date}:daily` }; daily[closed.date] = preferSnapshot(daily[closed.date], closed); } right.history.openDay = null; }
    const diagnostics = [...(left.collection.diagnostics || []), ...(right.collection.diagnostics || [])].map(item => RhythiaX.DataTransferSerialization.diagnostic(item)).filter(Boolean).slice(-5);
    return RhythiaX.normalizeDataRecord({ ...left, identity: { username: right.identity.username || left.identity.username, country: right.identity.country || left.identity.country }, updatedAt: Math.max(Number(left.updatedAt) || 0, Number(right.updatedAt) || 0), collection: { ...left.collection, ...right.collection, lastAttemptAt: Math.max(Number(left.collection.lastAttemptAt) || 0, Number(right.collection.lastAttemptAt) || 0) || null, lastSuccessAt: Math.max(Number(left.collection.lastSuccessAt) || 0, Number(right.collection.lastSuccessAt) || 0) || null, diagnostics }, history: { openDay: mergeOpenDay(left.history.openDay, right.history.openDay), daily }, titleProgression: { last: preferSnapshot(left.titleProgression.last, right.titleProgression.last) } }, left.profileId);
  }
  function identityErrors(current, candidate) {
    const left = RhythiaX.normalizeDataRecord(current, current?.profileId); const right = RhythiaX.normalizeDataRecord(candidate, candidate?.profileId); const errors = [];
    if (!left || !right || left.profileId !== right.profileId) errors.push('profileId cannot be changed.');
    const leftDates = Object.keys(left?.history?.daily || {}).sort(); const rightDates = Object.keys(right?.history?.daily || {}).sort();
    if (JSON.stringify(leftDates) !== JSON.stringify(rightDates)) errors.push('daily record dates cannot be changed.');
    leftDates.forEach(date => { const oldPoint = left.history.daily[date]; const newPoint = right.history.daily[date]; if (!newPoint || oldPoint.id !== newPoint.id || oldPoint.date !== newPoint.date || oldPoint.visitId !== newPoint.visitId) errors.push(`daily record identity cannot be changed for ${date}.`); });
    const oldOpen = left?.history?.openDay; const newOpen = right?.history?.openDay;
    if (Boolean(oldOpen) !== Boolean(newOpen) || (oldOpen && oldOpen.date !== newOpen.date)) errors.push('open-day identity cannot be changed.');
    if (oldOpen && newOpen) { const oldCaptures = new Map((oldOpen.captures || []).map(item => [keyFor(item), item])); const newCaptures = new Map((newOpen.captures || []).map(item => [keyFor(item), item])); if (oldCaptures.size !== newCaptures.size || [...oldCaptures.keys()].some(item => !newCaptures.has(item))) errors.push('open-day capture identifiers cannot be changed.'); else oldCaptures.forEach((oldCapture, item) => { const newCapture = newCaptures.get(item); if (oldCapture.id !== newCapture.id || oldCapture.visitId !== newCapture.visitId || oldCapture.date !== newCapture.date) errors.push('open-day capture identity cannot be changed.'); }); }
    const oldTitle = left?.titleProgression?.last; const newTitle = right?.titleProgression?.last;
    if (Boolean(oldTitle) !== Boolean(newTitle) || (oldTitle && (!newTitle || oldTitle.id !== newTitle.id || oldTitle.date !== newTitle.date || oldTitle.visitId !== newTitle.visitId))) errors.push('Title state identity cannot be changed.');
    return [...new Set(errors)];
  }
  RhythiaX.DataTransferConflictPolicy = {
    identityErrors,
    mergeRecords(existingRecords, importedRecords) {
      const merged = new Map((Array.isArray(existingRecords) ? existingRecords : []).map(record => [String(record.profileId), RhythiaX.normalizeDataRecord(record, record.profileId)]));
      const added = []; const updated = [];
      (Array.isArray(importedRecords) ? importedRecords : []).forEach(record => { const id = String(record.profileId); const current = merged.get(id); const next = current ? mergeRecord(current, record) : RhythiaX.normalizeDataRecord(record, id); if (!current) added.push(id); else if (JSON.stringify(current) !== JSON.stringify(next)) updated.push(id); merged.set(id, next); });
      return { records: [...merged.values()].filter(Boolean), added, updated };
    },
  };
}());
