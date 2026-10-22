// Serialized owner for the small set of shared settings mutations.
var RhythiaX = globalThis.RhythiaX || {};

(function () {
  const DATA_SETTINGS_OPERATION = 'data-settings';
  const APP_SETTINGS_OPERATION = 'app-settings';
  const APP_SETTING_KEYS = {
    modules: 'rhythiaxModules',
    moduleOptions: 'rhythiaxModuleOptions',
    theme: 'rhythiaxTheme',
    popupSize: 'rhythiaxPopupSize',
    popupSizeVersion: 'rhythiaxPopupSizeVersion',
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
      const next = queue.then(() => task(), () => task());
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
        await RhythiaX.dataRepositoryReady;
        if (isReadOnly()) throw new Error('Local data is read-only because validation failed; contact support before modifying stored data.');
        const result = await storageCall(local, 'get', { [settingsKey]: defaults });
        const current = RhythiaX.normalizeDataSettings(result[settingsKey]);
        let next;
        if (kind === 'patch') {
          assertKeys(payload.patch, allowed.filter(key => key !== 'communityConsentVersion'), 'Data settings patch');
          next = RhythiaX.normalizeDataSettings({ ...current, ...payload.patch });
        } else if (kind === 'replace') {
          assertKeys(payload.settings, allowed.filter(key => key !== 'communityConsentVersion'), 'Data settings replacement');
          next = RhythiaX.normalizeDataSettings({ ...payload.settings, communityConsentVersion: current.communityConsentVersion });
        } else if (kind === 'community-consent') {
          const choices = {
            'hybrid-reports': { syncMode: 'hybrid', telemetryEnabled: true },
            'cloud-no-reports': { syncMode: 'cloud-only', telemetryEnabled: false },
            'hybrid-no-reports': { syncMode: 'hybrid', telemetryEnabled: false },
            'local-only': { syncMode: 'local-only', telemetryEnabled: false },
          };
          if (typeof payload.choice !== 'string' || !Object.prototype.hasOwnProperty.call(choices, payload.choice)) throw new Error('Unsupported community choice.');
          next = RhythiaX.normalizeDataSettings({
            ...current, ...choices[payload.choice], communityConsentVersion: RhythiaX.COMMUNITY_CONSENT_VERSION,
          });
        } else {
          throw new Error('Unsupported data settings operation.');
        }
        return commit(settingsKey, next);
      });
    }

    function mutateAppSettings(replace, payload) {
      return enqueue(async () => {
        await RhythiaX.dataRepositoryReady;
        if (isReadOnly()) throw new Error('Local data is read-only because validation failed; contact support before modifying stored data.');
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
      communityConsent: choice => mutateDataSettings('community-consent', { choice }),
      appSettingsPatch: patch => mutateAppSettings(false, { patch }),
      appSettingsReplace: settings => mutateAppSettings(true, { settings }),
    };
  }

  RhythiaX.createStorageMutationAuthority = createStorageMutationAuthority;
  if (typeof module !== 'undefined') module.exports = { createStorageMutationAuthority };
})();
