// Sole V3 startup point after all ordered global providers have loaded.
window.RhythiaX = window.RhythiaX || {};
window.RhythiaX.PopupV3 = window.RhythiaX.PopupV3 || {};
const version = document.getElementById("version");
const manifest = globalThis.chrome?.runtime?.getManifest?.();
if (version && manifest?.version) {
  version.textContent = `v${manifest.version} - Release Fixes`;
}

if (!window.RhythiaX.PopupV3.started) {
  window.RhythiaX.PopupV3.started = true;
  window.RhythiaX.PopupV3.start?.();
}
