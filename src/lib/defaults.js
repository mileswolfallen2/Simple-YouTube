/**
 * The one copy of the settings schema.
 *
 * Loaded in three places -- the content script, the popup, and the in-page panel
 * -- so that adding a setting means editing this file and the UI that renders it,
 * not three hand-maintained DEFAULTS blocks that drift apart.
 */
(() => {
  'use strict';

  const DEFAULTS = {
    // master
    enabled: true,

    // appearance
    theme: 'dark', // 'dark' (true black) | 'light' (white) | 'system'
    compact: false,

    // ambient light, dark theme only
    ambient: true,
    ambientIntensity: 35, // 0-100   opacity of the wash and the player's glow
    ambientSpread: 120, // 0-400   px of glow radius
    ambientSaturation: 120, // 0-200  % vibrance applied to the sampled color

    // shorts budget
    shortsLimit: 10, // today's allowance
    shortsLimitTomorrow: 0, // 0 means "same as today's"
    shortsUsed: 0,
    shortsDay: '', // local YYYY-MM-DD the counters belong to
    cheatUnlocked: false,

    // page
    showGuide: false, // YouTube's own sidebar instead of our rail
    showRecommendations: false,
    showComments: true,

    // playback
    disableAutoplay: true,
    removeDistractions: true
  };

  // Ambient is meaningless on a white page, so it is forced off there rather than
  // left as a switch that silently does nothing.
  const DARK_ONLY = new Set(['ambient', 'ambientIntensity', 'ambientSpread', 'ambientSaturation']);

  function resolve(settings) {
    const s = { ...DEFAULTS, ...settings };
    if (s.theme === 'light') {
      for (const key of DARK_ONLY) s[key] = key === 'ambient' ? false : DEFAULTS[key];
      s.ambientForcedOff = true;
    } else {
      s.ambientForcedOff = false;
    }
    s.isDark = s.theme !== 'light';
    return s;
  }

  window.SYT_DEFAULTS = DEFAULTS;
  window.SYT_SETTINGS = { DEFAULTS, DARK_ONLY, resolve };
})();
