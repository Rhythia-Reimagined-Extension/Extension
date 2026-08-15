// Serialized owner for the small set of shared settings mutations.
var RhythiaX = globalThis.RhythiaX || {};

(function () {
  const DATA_SETTINGS_OPERATION = 'data-settings';
  const BACKUP_STATE_OPERATION = 'backup-state';
  const APP_SETTINGS_OPERATION = 'app-settings';
  const APP_SETTING_KEYS = {
    modules: 'rhythiaxModules',
    moduleOptions: 'rhythiaxModuleOptions',
    theme: 'rhythiaxTheme',
    popupSize: 'rhythiaxPopupSize',
    popupSizeVersion: 'rhythiaxPopupSizeVersion',
  };
  const BACKUP_STATE_DEFAULT = {
    status: 'setup-required', folderName: '', automaticFiles: [], manualFiles: [], recoveryFiles: [],
    lastAttemptAt: null, lastSuccessAt: null, lastFingerprint: '', lastError: '',
    recordCount: 0, dailyCount: 0, titleCount: 0, automaticBytes: 0, manualBytes: 0, recoveryBytes: 0,
    fileName: '', bytes: 0,
  };

  function isPlainObject(value) {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
  }

  function storageCall(local, method, argument) {
    return new Promise((resolve, reject) => {
      let settled = false;
      const finish = (callback, value) => {
        if (settled) return;
        settled = true;
        callback(value);
      };
      const callback = value => {
        const error = globalThis.chrome?.runtime?.lastError;
        if (error) finish(reject, new Error(error.message || String(error)));
        else finish(resolve, value || {});
      };
      try {
        const result = local[method](argument, callback);
        if (result && typeof result.then === 'function') result.then(value => finish(resolve, value || {}), error => finish(reject, error));
      } catch (error) {
        finish(reject, error);
      }
    });
  }

  function assertObject(value, label) {
    if (!isPlainObject(value)) throw new Error(`${label} must be an object.`);
  }

  function assertKeys(value, allowed, label) {
    assertObject(value, label);
    const invalid = Object.keys(value).find(key => !allowed.includes(key));
    if (invalid) throw new Error(`${label} contains an unsupported field: ${invalid}.`);
    if (!Object.keys(value).length) throw new Error(`${label} must not be empty.`);
  }

    function whitelistIdentity(entry) {
      const id = String(entry?.id || entry?.playerId || '').trim();
      const username = String(entry?.username || entry?.name || '').trim();
      if (!id && !username) throw new Error('Whitelist entry requires an id or username.');
      return { id, username, usernameKey: username.toLocaleLowerCase(), addedAt: entry?.addedAt };
  }

  function appValues(payload, replace) {
    assertObject(payload, 'App settings payload');
    const source = replace ? payload.settings : payload.patch;
    assertKeys(source, Object.keys(APP_SETTING_KEYS), replace ? 'App settings replacement' : 'App settings patch');
    return Object.keys(source).reduce((values, key) => {
      values[APP_SETTING_KEYS[key]] = source[key];
      return values;
    }, {});
  }

  function mergeAppPatch(current, values) {
    return Object.keys(values).reduce((next, key) => {
      const value = values[key];
      next[key] = isPlainObject(value) && isPlainObject(current[key])
        ? Object.keys(value).reduce((merged, nestedKey) => {
          merged[nestedKey] = isPlainObject(value[nestedKey]) && isPlainObject(current[key][nestedKey])
            ? { ...current[key][nestedKey], ...value[nestedKey] }
            : value[nestedKey];
          return merged;
        }, { ...current[key] })
        : value;
      return next;
    }, {});
  }

  function createStorageMutationAuthority(options) {
    const local = options?.local;
    const isReadOnly = options?.isReadOnly || (() => false);
    if (!local) throw new Error('Storage mutation authority requires local storage.');
    let queue = Promise.resolve();

    function enqueue(task) {
      const next = queue.then(task, task);
      queue = next.catch(() => {});
      return next;
    }

    async function commit(key, value) {
      await storageCall(local, 'set', { [key]: value });
      return value;
    }

    function mutateDataSettings(kind, payload) {
      const settingsKey = RhythiaX.DATA_SETTINGS_KEY || 'rhythiaxDataSettings';
      const defaults = RhythiaX.DATA_DEFAULT_SETTINGS || {};
      const allowed = Object.keys(defaults);
      return enqueue(async () => {
        if (isReadOnly()) throw new Error('Local data is read-only until a verified backup restore repairs the storage.');
        const result = await storageCall(local, 'get', { [settingsKey]: defaults });
        const current = RhythiaX.normalizeDataSettings(result[settingsKey]);
        let next;
        if (kind === 'patch') {
          assertKeys(payload.patch, allowed.filter(key => key !== 'whitelist'), 'Data settings patch');
          next = RhythiaX.normalizeDataSettings({ ...current, ...payload.patch });
        } else if (kind === 'replace') {
          assertKeys(payload.settings, allowed, 'Data settings replacement');
          next = RhythiaX.normalizeDataSettings(payload.settings);
        } else {
          const entry = whitelistIdentity(kind === 'whitelist-add' ? payload.entry : payload.target);
          const entries = Array.isArray(current.whitelist) ? current.whitelist : [];
          const retained = entries.filter(item => entry.id
            ? String(item?.id || '').trim() !== entry.id
            : String(item?.username || '').trim().toLocaleLowerCase() !== entry.usernameKey);
          next = RhythiaX.normalizeDataSettings({
            ...current,
            whitelist: kind === 'whitelist-add' ? [...retained, { id: entry.id, username: entry.username, addedAt: entry.addedAt }] : retained,
          });
        }
        return commit(settingsKey, next);
      });
    }

    function mutateBackupState(payload) {
      const stateKey = RhythiaX.DATA_BACKUP_STATE_KEY || 'rhythiaxDataBackupState';
      return enqueue(async () => {
        if (isReadOnly()) throw new Error('Local data is read-only until a verified backup restore repairs the storage.');
        assertKeys(payload.patch, Object.keys(BACKUP_STATE_DEFAULT), 'Backup state patch');
        const result = await storageCall(local, 'get', { [stateKey]: BACKUP_STATE_DEFAULT });
        return commit(stateKey, { ...BACKUP_STATE_DEFAULT, ...(result[stateKey] || {}), ...payload.patch });
      });
    }

    function mutateAppSettings(replace, payload) {
      return enqueue(async () => {
        if (isReadOnly()) throw new Error('Local data is read-only until a verified backup restore repairs the storage.');
        const values = appValues(payload, replace);
        const keys = Object.values(APP_SETTING_KEYS);
        const current = replace ? {} : await storageCall(local, 'get', keys);
        const next = replace ? values : mergeAppPatch(current, values);
        await storageCall(local, 'set', next);
        return next;
      });
    }

    function dispatch(message) {
      return Promise.resolve().then(() => {
        if (message?.type !== 'rhythiax-storage-mutation') throw new Error('Unsupported storage mutation request.');
        switch (message.operation) {
          case 'data-settings-patch': return mutateDataSettings('patch', message.payload || {});
          case 'data-settings-replace': return mutateDataSettings('replace', message.payload || {});
          case 'data-settings-whitelist-add': return mutateDataSettings('whitelist-add', message.payload || {});
          case 'data-settings-whitelist-remove': return mutateDataSettings('whitelist-remove', message.payload || {});
          case 'backup-state-patch': return mutateBackupState(message.payload || {});
          case 'app-settings-patch': return mutateAppSettings(false, message.payload || {});
          case 'app-settings-replace': return mutateAppSettings(true, message.payload || {});
          default: throw new Error('Unsupported storage mutation operation.');
        }
      });
    }

    return {
      dispatch,
      dataSettingsPatch: patch => mutateDataSettings('patch', { patch }),
      dataSettingsReplace: settings => mutateDataSettings('replace', { settings }),
      dataSettingsWhitelistAdd: entry => mutateDataSettings('whitelist-add', { entry }),
      dataSettingsWhitelistRemove: target => mutateDataSettings('whitelist-remove', { target }),
      backupStatePatch: patch => mutateBackupState({ patch }),
      appSettingsPatch: patch => mutateAppSettings(false, { patch }),
      appSettingsReplace: settings => mutateAppSettings(true, { settings }),
    };
  }

  RhythiaX.createStorageMutationAuthority = createStorageMutationAuthority;
  if (typeof module !== 'undefined') module.exports = { createStorageMutationAuthority };
})();
