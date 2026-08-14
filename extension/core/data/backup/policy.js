// Local backup policy, names, and persisted state.
var RhythiaX = RhythiaX || {};

RhythiaX.DATA_BACKUP_VERSION = 2;
RhythiaX.DATA_BACKUP_SUPPORTED_VERSIONS = [1, 2];
RhythiaX.DATA_BACKUP_FILE_PREFIX = 'rhythia-reimagined';
RhythiaX.DATA_BACKUP_DIRECTORY_NAME = 'Rhythia Reimagined';
RhythiaX.DATA_BACKUP_SUBDIRECTORY_NAME = 'Backups';
RhythiaX.DATA_BACKUP_AUTOMATIC_DIRECTORY_NAME = 'Automatic';
RhythiaX.DATA_BACKUP_MANUAL_DIRECTORY_NAME = 'Manual';
RhythiaX.DATA_BACKUP_RECOVERY_DIRECTORY_NAME = 'Recovery';
RhythiaX.DATA_BACKUP_RECOVERY_TTL_MS = 3 * 24 * 60 * 60 * 1000;
RhythiaX.DATA_BACKUP_LEGACY_STABLE_FILE_NAME = 'rhythiax-stable-backup.json';

function backupPolicyStorageGet(keys) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(keys, result => {
      const error = chrome.runtime.lastError;
      if (error) reject(new Error(error.message));
      else resolve(result || {});
    });
  });
}

function backupPolicyStorageSet(values) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set(values, () => {
      const error = chrome.runtime.lastError;
      if (error) reject(new Error(error.message));
      else resolve();
    });
  });
}

function backupPolicyDefaultState() {
  return {
    status: 'setup-required', folderName: '', automaticFiles: [], manualFiles: [], recoveryFiles: [],
    lastAttemptAt: null, lastSuccessAt: null, lastFingerprint: '', lastError: '',
    recordCount: 0, dailyCount: 0, titleCount: 0, automaticBytes: 0, manualBytes: 0, recoveryBytes: 0,
    fileName: '', bytes: 0,
  };
}

async function backupPolicyGetState() {
  const result = await backupPolicyStorageGet({ [RhythiaX.DATA_BACKUP_STATE_KEY]: backupPolicyDefaultState() });
  return { ...backupPolicyDefaultState(), ...(result[RhythiaX.DATA_BACKUP_STATE_KEY] || {}) };
}

async function backupPolicySaveState(patch) {
  if (RhythiaX.StorageMutationBridge) return RhythiaX.StorageMutationBridge.backupStatePatch(patch);
  return RhythiaX.backupStatePatch(patch);
}

function backupPolicyAppVersion() {
  try { return String(chrome.runtime.getManifest?.().version || 'unknown'); } catch (_) { return 'unknown'; }
}

function backupPolicyAutomaticFileName(slot) {
  const version = `v${backupPolicyAppVersion()}`;
  if (slot === 0) return `${RhythiaX.DATA_BACKUP_FILE_PREFIX}-current-${version}.json`;
  if (slot === 1) return `${RhythiaX.DATA_BACKUP_FILE_PREFIX}-previous-${version}.json`;
  return `${RhythiaX.DATA_BACKUP_FILE_PREFIX}-archive-${slot + 1}-${version}.json`;
}

function backupPolicyIsAutomaticFile(fileName) {
  return /^rhythia-reimagined-(current|previous|archive)-v[^/]+\.json$/.test(String(fileName || ''));
}

function backupPolicyIsManualFile(fileName) {
  return /^rhythia-reimagined-manual-v[^/]+\.json$/.test(String(fileName || ''));
}

function backupPolicyIsRecoveryFile(fileName) {
  return /^rhythia-reimagined-recovery-v[^/]+\.json$/.test(String(fileName || ''));
}

function backupPolicyManualFileName(now = Date.now()) {
  return `${RhythiaX.DATA_BACKUP_FILE_PREFIX}-manual-v${backupPolicyAppVersion()}-${new Date(now).toISOString().replace(/[:.]/g, '-')}.json`;
}

function backupPolicyRecoveryFileName(now = Date.now()) {
  return `${RhythiaX.DATA_BACKUP_FILE_PREFIX}-recovery-v${backupPolicyAppVersion()}-${new Date(now).toISOString().replace(/[:.]/g, '-')}.json`;
}

async function backupPolicyAppSettings() {
  return backupPolicyStorageGet(['rhythiaxModules', 'rhythiaxModuleOptions', 'rhythiaxTheme', 'rhythiaxPopupSize', 'rhythiaxPopupSizeVersion']);
}
