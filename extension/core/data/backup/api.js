// Popup-, worker-, and offscreen-facing backup service API.
RhythiaX.BackupApi = {
  getState: backupPolicyGetState,
  saveState: backupPolicySaveState,
  createStablePayload: backupPayloadCreateStable,
  createManualPayload: backupPayloadCreateManual,
  createRecoveryPayload: backupPayloadCreateRecovery,
  getStableFingerprint: backupPayloadFingerprint,
  writeAutomaticPayload: backupServiceWriteAutomaticPayload,
  runAutomatic: backupServiceRunAutomatic,
  createManual: backupServiceCreateManual,
  createRecovery: backupServiceCreateRecovery,
  getStatus: backupServiceStatus,
  chooseFolder: backupServiceChooseFolder,
  readAutomatic: backupServiceReadAutomatic,
  readRecovery: backupServiceReadRecovery,
  forgetFolder: backupServiceForgetFolder,
  deleteAll: backupServiceDeleteAll,
};
