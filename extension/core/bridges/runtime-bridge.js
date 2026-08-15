// RhythiaX runtime boundary for extension-context messaging.
var RhythiaX = RhythiaX || {};

(function () {
  function callChrome(method, context, args) {
    return new Promise((resolve, reject) => {
      let settled = false;
      const finish = (callback, value) => {
        if (settled) return;
        settled = true;
        callback(value);
      };
      const callback = response => {
        const error = chrome.runtime.lastError;
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
      return callChrome(chrome.runtime.sendMessage, chrome.runtime, [message]);
    },
    getActiveTab() {
      return callChrome(chrome.tabs.query, chrome.tabs, [{ active: true, currentWindow: true }])
        .then(tabs => tabs?.[0] || null);
    },
    sendToActiveTab(message) {
      return this.getActiveTab().then(tab => {
        if (!tab?.id) return null;
        return callChrome(chrome.tabs.sendMessage, chrome.tabs, [tab.id, message]);
      });
    },
  };
})();
