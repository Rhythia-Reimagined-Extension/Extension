// =============================================
// Popup V3 — Native appearance controls (theme + popup size)
// =============================================
// Direct native implementation of theme and popup-size persistence. Writes
// the exact same storage keys the prior popup implementation
// and shared/theme.js (content script on rhythia.com) rely on, and
// applies the required visual side effects:
//   - fill()/applyTheme(): persist `rhythiaxTheme` + notify the active tab.
//   - applyPopupSize(): write the --popup-width/--popup-height CSS vars
//     that actually resize this extension popup window.
// v3-renderer.js already paints `.popup[data-theme]`/`[data-size]` from
// `state.theme`/`state.size` on every render() call, so this file only
// needs to own persistence + the CSS var side effect directly.

const V3_THEME_KEY = 'rhythiaxTheme';
const V3_POPUP_SIZE_KEY = 'rhythiaxPopupSize';
const V3_POPUP_SIZE_VERSION_KEY = 'rhythiaxPopupSizeVersion';
const V3_POPUP_SIZE_VERSION = 3;
const V3_POPUP_SIZES = {
  default: { width: 375, height: 575 },
  // Chrome extension popups are capped at 600px high. Keep the footer inside
  // the native viewport instead of letting Chrome add an outer scrollbar.
  large: { width: 425, height: 600 },
};

function v3SendThemeToActiveTab(theme) {
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    const tab = tabs[0];
    if (tab?.id) chrome.tabs.sendMessage(tab.id, { type: 'rhythiax-theme', theme }).catch(() => {});
  });
}

// Writes the CSS variables that control the
// rendered width/height of this extension popup window.
function v3ApplyPopupSizeVars(name) {
  const selected = V3_POPUP_SIZES[name] ? name : 'default';
  const size = V3_POPUP_SIZES[selected];
  document.documentElement.style.setProperty('--popup-width', `${size.width}px`);
  document.documentElement.style.setProperty('--popup-height', `${size.height}px`);
  return selected;
}

// Persists rhythiaxTheme, pushes an
// immediate update to the active Rhythia tab, and updates V3 state so render() repaints
// `.popup[data-theme]` with the matching palette.
function setV3Theme(themeKey) {
  const presetKey = themeKey === 'reimagined' ? 'rhythia-reimagined' : themeKey;
  const preset = RhythiaX.themePresets[presetKey] ? presetKey : 'rhythia-reimagined';
  const theme = { ...RhythiaX.themePresets[preset] };
  state.theme = preset === 'rhythia-reimagined' ? 'reimagined' : preset;
  chrome.storage.local.set({ [V3_THEME_KEY]: theme });
  v3SendThemeToActiveTab(theme);
  render();
}

// Applies the resize immediately and persists the versioned storage keys so the small ->
// default/large migration read at startup keeps working unmodified).
function setV3PopupSize(name) {
  const selected = v3ApplyPopupSizeVars(name);
  state.size = selected;
  chrome.storage.local.set({ [V3_POPUP_SIZE_KEY]: selected, [V3_POPUP_SIZE_VERSION_KEY]: V3_POPUP_SIZE_VERSION });
  render();
}
