var RhythiaX = RhythiaX || {};

(function () {
  if (RhythiaX.CommunityConsentNotice || typeof document === 'undefined' || typeof window === 'undefined') return;
  if (!['https://rhythia.com', 'https://www.rhythia.com'].includes(window.location?.origin)) return;
  if (window.top && window.top !== window) return;
  if (typeof chrome === 'undefined' || !chrome?.runtime?.sendMessage || !chrome?.storage?.local) return;

  let host = null, shadow = null, observer = null, pending = false, busy = false;
  const css = `
    :host { all: initial; position: fixed; right: 18px; bottom: 18px; z-index: 2147483646; width: min(300px, calc(100vw - 36px)); color-scheme: dark; }
    * { box-sizing: border-box; }
    .card { max-height: calc(100dvh - 36px); overflow: auto; padding: 14px; background: #191c28; color: #eef0f8; border: 1px solid #52576f; border-radius: 14px; box-shadow: 0 8px 32px #0006; font: 13px/1.5 system-ui, sans-serif; }
    h2 { font-size: 17px; line-height: 1.3; margin: 0 0 8px; }
    p { margin: 0 0 10px; }
    .actions { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    button { padding: 10px 8px; font: 600 12px/1.3 system-ui, sans-serif; color: #f5f5ff; background: #5147ad; border: 1px solid #8c82eb; border-radius: 8px; cursor: pointer; }
    button.local { background: #292d40; border-color: #646b8c; }
    button:hover:not(:disabled) { filter: brightness(1.15); }
    button:focus-visible, input:focus-visible, a:focus-visible { outline: 3px solid #b9b3ff; outline-offset: 3px; }
    button:disabled { opacity: .6; cursor: wait; }
    a { color: #b9b3ff; font-size: 11px; display: inline-block; margin-top: 10px; text-decoration: none; }
    a:hover { text-decoration: underline; }
    .status { margin-top: 8px; color: #f3bfba; }
    .status:empty { display: none; }
  `;

  function remove() {
    host?.remove();
    observer?.disconnect(); observer = null;
  }

  function refreshHistory() {
    const playerId = window.location.pathname.match(/^\/player\/(\d+)/)?.[1];
    if (!playerId) return;
    RhythiaX._vpsPlayerHistoryCache?.clear();
    Promise.resolve(RhythiaX.applyProfileHistoryIndicators?.(playerId)).catch(() => {});
    document.querySelectorAll('.rhythiax-pane-ranking').forEach(pane => {
      Promise.resolve(RhythiaX.renderInlineRankHistory?.(pane, playerId)).catch(() => {});
    });
    document.querySelectorAll('.rhythiax-pane-stats .rhythiax-history-pane').forEach(pane => {
      Promise.resolve(RhythiaX.renderInlineProgressHistory?.(pane, playerId)).catch(() => {});
    });
  }

  async function choose(event, local) {
    if (!event.isTrusted || busy || !pending) return;
    busy = true;
    shadow.querySelectorAll('button, input').forEach(element => { element.disabled = true; });
    try {
      const choice = local ? 'local-only' : 'hybrid-no-reports';
      const response = await chrome.runtime.sendMessage({ type: 'rhythiax-community-consent', choice });
      if (!response?.ok) throw new Error('Your choice could not be saved. Please try again.');
      pending = false;
      remove();
      refreshHistory();
    } catch (_) {
      shadow.querySelector('.status').textContent = 'Your choice could not be saved. Please try again.';
      shadow.querySelectorAll('button, input').forEach(element => { element.disabled = false; });
    } finally {
      busy = false;
      shadow.querySelectorAll('button, input').forEach(element => { element.disabled = false; });
    }
  }

  function mount() {
    if (!pending || !document.body || RhythiaX.extensionContextInvalidated) return;
    if (!host) {
      host = document.createElement('div');
      host.id = 'rhythiax-community-choice';
      shadow = host.attachShadow({ mode: 'closed' });
      shadow.innerHTML = `<section class="card" role="region" aria-label="Reimagined online history">
        <h2>Use online player history?</h2>
        <p>See shared history alongside your local records.</p>
        <div class="actions"><button type="button" class="online">Use online history</button><button type="button" class="local">Keep it local</button></div>
        <div class="status" role="status" aria-live="polite"></div>
        <a href="https://github.com/Rhythia-Reimagined-Extension/Extension/blob/main/PRIVACY.md" target="_blank" rel="noreferrer">Privacy policy</a>
      </section>`;
      if (typeof CSSStyleSheet === 'function' && 'adoptedStyleSheets' in shadow) {
        const sheet = new CSSStyleSheet(); sheet.replaceSync(css); shadow.adoptedStyleSheets = [sheet];
      } else {
        const style = document.createElement('style'); style.textContent = css; shadow.prepend(style);
      }
      shadow.querySelector('.online').addEventListener('click', event => choose(event, false));
      shadow.querySelector('.local').addEventListener('click', event => choose(event, true));
    }
    if (!host.isConnected) document.body.appendChild(host);
    if (!observer && typeof MutationObserver === 'function') {
      observer = new MutationObserver(() => mount());
      observer.observe(document.documentElement, { childList: true, subtree: true });
    }
  }

  async function refresh() {
    try {
      await RhythiaX.dataRepositoryReady;
      if (RhythiaX.dataStorageReadOnly || RhythiaX.extensionContextInvalidated) return;
      const result = await new Promise(resolve => chrome.storage.local.get('rhythiaxDataSettings', result => {
        resolve(chrome.runtime.lastError ? null : result);
      }));
      if (!result) return;
      const settings = result?.rhythiaxDataSettings || {};
      const wasPending = pending;
      pending = settings.communityConsentVersion !== 1;
      if (pending) mount();
      else { remove(); if (wasPending) refreshHistory(); }
    } catch (_) { /* A failed read never enables community connections. */ }
  }

  RhythiaX.CommunityConsentNotice = { refresh };
  chrome.storage.onChanged?.addListener((changes, area) => {
    if (area === 'local' && changes.rhythiaxDataSettings) refresh();
  });
  if (document.body) refresh();
  else document.addEventListener('DOMContentLoaded', refresh, { once: true });
})();
