// Compatibility facade for legacy consumers of the split backup implementation.
var RhythiaX = RhythiaX || {};

RhythiaX.BackupBridge = {
  getLocalBackupState: (...args) => RhythiaX.BackupApi.getState(...args),
  saveLocalBackupState: (...args) => RhythiaX.BackupApi.saveState(...args),
  createStableDataBackup: (...args) => RhythiaX.BackupApi.createStablePayload(...args),
  createManualDataBackup: (...args) => RhythiaX.BackupApi.createManualPayload(...args),
  createRecoveryDataBackup: (...args) => RhythiaX.BackupApi.createRecoveryPayload(...args),
  getStableDataBackupFingerprint: (...args) => RhythiaX.BackupApi.getStableFingerprint(...args),
  writeLocalBackupPayload: (...args) => RhythiaX.BackupApi.writeAutomaticPayload(...args),
  runAutomaticLocalBackup: (...args) => RhythiaX.BackupApi.runAutomatic(...args),
  createManualLocalBackup: (...args) => RhythiaX.BackupApi.createManual(...args),
  createRecoveryBackup: (...args) => RhythiaX.BackupApi.createRecovery(...args),
  getLocalBackupStatus: (...args) => RhythiaX.BackupApi.getStatus(...args),
  chooseLocalBackupFolder: (...args) => RhythiaX.BackupApi.chooseFolder(...args),
  readAutomaticBackup: (...args) => RhythiaX.BackupApi.readAutomatic(...args),
  readRecoveryBackup: (...args) => RhythiaX.BackupApi.readRecovery(...args),
  forgetLocalBackupFolder: (...args) => RhythiaX.BackupApi.forgetFolder(...args),
  deleteLocalBackup: (...args) => RhythiaX.BackupApi.deleteAll(...args),
};

Object.assign(RhythiaX, RhythiaX.BackupBridge, {
  runLocalBackup: (...args) => RhythiaX.BackupBridge.runAutomaticLocalBackup(...args),
  readLocalBackup: () => RhythiaX.BackupBridge.readAutomaticBackup(0),
});
