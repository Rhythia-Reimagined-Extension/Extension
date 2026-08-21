// File System Access directory layout, file I/O, and automatic rotation.
async function backupFileResolveDirectories(rootHandle, create = true, requestPermission = false) {
  if (!rootHandle) return null;
  let permission = typeof rootHandle.queryPermission === 'function' ? await rootHandle.queryPermission({ mode: 'readwrite' }) : 'granted';
  if (permission !== 'granted' && requestPermission && typeof rootHandle.requestPermission === 'function') permission = await rootHandle.requestPermission({ mode: 'readwrite' });
  if (permission !== 'granted') return { permissionRequired: true, rootHandle };
  const project = await rootHandle.getDirectoryHandle(RhythiaX.DATA_BACKUP_DIRECTORY_NAME, { create });
  const backups = await project.getDirectoryHandle(RhythiaX.DATA_BACKUP_SUBDIRECTORY_NAME, { create });
  const automatic = await backups.getDirectoryHandle(RhythiaX.DATA_BACKUP_AUTOMATIC_DIRECTORY_NAME, { create });
  const manual = await backups.getDirectoryHandle(RhythiaX.DATA_BACKUP_MANUAL_DIRECTORY_NAME, { create });
  const recovery = await backups.getDirectoryHandle(RhythiaX.DATA_BACKUP_RECOVERY_DIRECTORY_NAME, { create });
  return { rootHandle, project, backups, automatic, manual, recovery, folderName: `${rootHandle.name} / ${RhythiaX.DATA_BACKUP_DIRECTORY_NAME} / ${RhythiaX.DATA_BACKUP_SUBDIRECTORY_NAME}` };
}

async function backupFileRead(directory, fileName) {
  const fileHandle = await directory.getFileHandle(fileName, { create: false });
  const file = await fileHandle.getFile();
  return { fileName, file, raw: await file.text() };
}

async function backupFileWrite(directory, fileName, payload) {
  const fileHandle = await directory.getFileHandle(fileName, { create: true });
  const text = JSON.stringify(payload, null, 2);
  const writable = await fileHandle.createWritable();
  try { await writable.write(text); await writable.close(); } catch (error) {
    try { await writable.abort(); } catch (_) { /* best effort */ }
    throw error;
  }
  return { fileName, bytes: text.length };
}

async function backupFileDelete(directory, fileName) {
  try { await directory.removeEntry(fileName); } catch (error) { if (error?.name !== 'NotFoundError') throw error; }
}

async function backupFileList(directory) {
  const files = [];
  if (!directory?.values) return files;
  for await (const handle of directory.values()) {
    if (handle.kind !== 'file') continue;
    try { const file = await handle.getFile(); files.push({ name: handle.name, bytes: file.size, modifiedAt: file.lastModified }); } catch (_) { /* file changed while listing */ }
  }
  return files;
}

async function backupFileReadLegacyStablePayload(directories) {
  const candidates = [directories.backups];
  try { candidates.push(await directories.rootHandle.getDirectoryHandle(RhythiaX.DATA_BACKUP_SUBDIRECTORY_NAME, { create: false })); } catch (_) { /* legacy directory absent */ }
  for (const directory of candidates) {
    try {
      const result = await backupFileRead(directory, RhythiaX.DATA_BACKUP_LEGACY_STABLE_FILE_NAME);
      const preview = await RhythiaX.getDataExportPreview(result.raw);
      if (preview.ok) return preview.payload || JSON.parse(result.raw);
    } catch (_) { /* try next legacy location */ }
  }
  return null;
}

async function backupFileRotateAutomatic(directories, payload, state, copyCount) {
  const newFiles = Array.from({ length: copyCount }, (_, index) => backupPolicyAutomaticFileName(index));
  const diskFiles = (await backupFileList(directories.automatic)).filter(file => backupPolicyIsAutomaticFile(file.name)).map(file => file.name);
  const oldFiles = [...new Set([...(Array.isArray(state.automaticFiles) ? state.automaticFiles : []), ...diskFiles])].filter(backupPolicyIsAutomaticFile);
  const oldPayloads = [];
  for (const oldFile of oldFiles) {
    try { oldPayloads.push({ fileName: oldFile, payload: JSON.parse((await backupFileRead(directories.automatic, oldFile)).raw) }); } catch (_) { /* do not propagate invalid generations */ }
  }
  if (!oldPayloads.length) {
    const legacyPayload = await backupFileReadLegacyStablePayload(directories);
    if (legacyPayload) oldPayloads.push({ fileName: RhythiaX.DATA_BACKUP_LEGACY_STABLE_FILE_NAME, payload: legacyPayload });
  }
  const written = [await backupFileWrite(directories.automatic, newFiles[0], payload)];
  for (let index = 1; index < newFiles.length; index++) {
    const old = oldPayloads[index - 1];
    if (!old) break;
    written.push(await backupFileWrite(directories.automatic, newFiles[index], old.payload));
  }
  const keep = new Set(newFiles);
  for (const oldFile of oldFiles) if (!keep.has(oldFile)) await backupFileDelete(directories.automatic, oldFile);
  return { files: written.map(item => item.fileName), bytes: written.reduce((sum, item) => sum + item.bytes, 0) };
}

async function backupFileCleanupRecovery(directories, state, now = Date.now()) {
  const active = [];
  for (const item of (Array.isArray(state.recoveryFiles) ? state.recoveryFiles : [])) {
    if (Number(item.createdAt) > now - RhythiaX.DATA_BACKUP_RECOVERY_TTL_MS) active.push(item);
    else await backupFileDelete(directories.recovery, item.fileName);
  }
  for (const file of await backupFileList(directories.recovery)) {
    if (!active.some(item => item.fileName === file.name) && file.modifiedAt <= now - RhythiaX.DATA_BACKUP_RECOVERY_TTL_MS) await backupFileDelete(directories.recovery, file.name);
  }
  return active;
}

async function backupFileCleanupManual(directories, stateOrFiles, maxLimit = RhythiaX.DATA_BACKUP_MAX_MANUAL_FILES || 30) {
  const limit = Math.max(1, Number(maxLimit) || 30);
  const rawList = Array.isArray(stateOrFiles) ? stateOrFiles : (stateOrFiles?.manualFiles || []);
  const diskFiles = (await backupFileList(directories.manual)).filter(file => backupPolicyIsManualFile(file.name));
  const fileMap = new Map();
  rawList.forEach(item => {
    if (item && item.fileName && backupPolicyIsManualFile(item.fileName)) {
      fileMap.set(item.fileName, {
        fileName: item.fileName,
        createdAt: Number(item.createdAt) || 0,
        bytes: Number(item.bytes) || 0,
      });
    }
  });
  diskFiles.forEach(file => {
    const existing = fileMap.get(file.name);
    fileMap.set(file.name, {
      fileName: file.name,
      createdAt: existing?.createdAt || file.modifiedAt || 0,
      bytes: file.bytes || existing?.bytes || 0,
    });
  });
  const allFiles = Array.from(fileMap.values());
  allFiles.sort((left, right) => (left.createdAt - right.createdAt) || String(left.fileName).localeCompare(String(right.fileName)));
  const keep = allFiles.slice(-limit);
  const remove = allFiles.slice(0, Math.max(0, allFiles.length - limit));
  for (const item of remove) {
    await backupFileDelete(directories.manual, item.fileName);
  }
  return keep;
}
