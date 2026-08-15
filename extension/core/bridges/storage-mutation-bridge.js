// Client for the background-owned, allowlisted settings mutation authority.
var RhythiaX = RhythiaX || {};

(function () {
  function request(operation, payload) {
    return RhythiaX.RuntimeBridge.sendMessage({ type: 'rhythiax-storage-mutation', operation, payload })
      .then(response => {
        if (!response?.ok) throw new Error(response?.error || 'Storage mutation was rejected.');
        return response.value;
      });
  }

  RhythiaX.StorageMutationBridge = {
    dataSettingsPatch: patch => request('data-settings-patch', { patch }),
    dataSettingsReplace: settings => request('data-settings-replace', { settings }),
    dataSettingsWhitelistAdd: entry => request('data-settings-whitelist-add', { entry }),
    dataSettingsWhitelistRemove: target => request('data-settings-whitelist-remove', { target }),
    backupStatePatch: patch => request('backup-state-patch', { patch }),
    appSettingsPatch: patch => request('app-settings-patch', { patch }),
    appSettingsReplace: settings => request('app-settings-replace', { settings }),
  };
})();
