// RhythiaX runtime boundary for extension-context messaging.
var RhythiaX = RhythiaX || {};

(function () {
  const browserAPI = (typeof browser !== 'undefined' && browser.runtime)
    ? browser
    : (typeof chrome !== 'undefined' && chrome.runtime ? chrome : null);

  function callChrome(method, context, args) {
    return new Promise((resolve, reject) => {
      let settled = false;
      const finish = (callback, value) => {
        if (settled) return;
        settled = true;
        callback(value);
      };
      const callback = response => {
        const error = (browserAPI?.runtime?.lastError) || (typeof chrome !== 'undefined' && chrome.runtime?.lastError);
        if (error) finish(reject, new Error(error.message));
        else finish(resolve, response);
      };
      try {
        const result = method.apply(context, [...args, callback]);
        if (result && typeof result.then === 'function') result.then(value => finish(resolve, value), error => finish(reject, error));
      } catch (error) {
        finish(reject, error);
      }
    });
  }

  RhythiaX.RuntimeBridge = {
    sendMessage(message) {
      const api = browserAPI || (typeof chrome !== 'undefined' ? chrome : null);
      if (!api?.runtime?.sendMessage) return Promise.reject(new Error('Extension runtime messaging unavailable.'));
      return callChrome(api.runtime.sendMessage, api.runtime, [message]);
    },
    getActiveTab() {
      const api = browserAPI || (typeof chrome !== 'undefined' ? chrome : null);
      if (!api?.tabs?.query) return Promise.resolve(null);
      return callChrome(api.tabs.query, api.tabs, [{ active: true, currentWindow: true }])
        .then(tabs => tabs?.[0] || null);
    },
    sendToActiveTab(message) {
      return this.getActiveTab().then(tab => {
        const api = browserAPI || (typeof chrome !== 'undefined' ? chrome : null);
        if (!tab?.id || !api?.tabs?.sendMessage) return null;
        return callChrome(api.tabs.sendMessage, api.tabs, [tab.id, message]);
      });
    },
  };
})();
