/**
 * Ambient light: a glow sampled from the video, behind the player and washed
 * over the page.
 *
 * Two layers, chosen because neither depends on YouTube cooperating:
 *   1. a large box-shadow on #movie_player -- pure CSS, cannot be z-indexed over
 *      or clipped by anything YouTube owns;
 *   2. a fixed full-viewport veil at low opacity with mix-blend-mode: screen,
 *      which needs no cooperation at all, just a pointer-events:none div.
 *
 * Dark theme only. On the light theme the vars are removed and the veil is taken
 * out of the DOM, because a colour wash on white is just a stain.
 */
(() => {
  'use strict';

  const { resolve } = window.SYT_AMBIENT_COLOR;

  const RESAMPLE_MS = 5000;
  const FADE_MS = 1200;

  let veil = null;
  let timer = null;
  let lastKey = null;
  let lastColor = null;

  function currentVideoId() {
    const url = new URL(location.href);
    const v = url.searchParams.get('v');
    if (v) return v;
    const shorts = url.pathname.match(/^\/shorts\/([^/?#]+)/);
    return shorts ? shorts[1] : null;
  }

  function ensureVeil() {
    if (veil) return veil;
    veil = document.createElement('div');
    veil.id = 'syt-ambient-veil';
    veil.style.cssText = [
      'position:fixed',
      'inset:0',
      'z-index:9',
      'pointer-events:none',
      'opacity:0',
      'transition:opacity 1.2s ease',
      'mix-blend-mode:screen',
      'background:radial-gradient(120% 90% at 50% 42%, var(--syt-ambient-rgb) 0%, transparent 68%)'
    ].join(';');
    (document.body || document.documentElement).append(veil);
    return veil;
  }

  function off() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
    const doomed = veil;
    veil = null;
    if (doomed) {
      doomed.style.opacity = '0';
      setTimeout(() => doomed.remove(), FADE_MS);
    }
    const root = document.documentElement;
    root.style.removeProperty('--syt-ambient-rgb');
    root.style.removeProperty('--syt-ambient-glow');
    lastKey = null;
  }

  async function sample(settings) {
    const id = currentVideoId();
    const video = document.querySelector('#movie_player video, video.html5-main-video');
    const rgb = await resolve(id, video, settings.ambientSaturation);
    lastColor = rgb;
    return rgb;
  }

  function paint(settings, rgb) {
    const root = document.documentElement;
    const [r, g, b] = rgb;
    const strength = settings.ambientIntensity / 100;

    root.style.setProperty('--syt-ambient-rgb', `${r} ${g} ${b}`);
    root.style.setProperty(
      '--syt-ambient-glow',
      `0 0 ${settings.ambientSpread * 2}px ${settings.ambientSpread * 0.6}px rgba(${r}, ${g}, ${b}, ${0.16 + strength * 0.5})`
    );

    if (veil) veil.style.opacity = String(0.05 + strength * 0.22);
  }

  async function run() {
    const stored = await chrome.storage.local.get(window.SYT_DEFAULTS);
    const settings = window.SYT_SETTINGS.resolve(stored);

    if (!settings.enabled || !settings.ambient || !settings.isDark) {
      off();
      return;
    }

    const rgb = await sample(settings);
    // The veil has to exist before it can be painted; creating it after would
    // leave it stuck at opacity 0 until the next resample.
    ensureVeil();
    paint(settings, rgb);

    if (timer) clearInterval(timer);
    timer = setInterval(async () => {
      const fresh = await chrome.storage.local.get(window.SYT_DEFAULTS);
      const s = window.SYT_SETTINGS.resolve(fresh);
      if (!s.enabled || !s.ambient || !s.isDark) return off();
      paint(s, await sample(s));
    }, RESAMPLE_MS);
  }

  function start() {
    const key = `${location.pathname}${location.search}`;
    if (key === lastKey) return;
    lastKey = key;
    run();
  }

  /** Re-run even if the URL has not changed -- used when a setting changes. */
  function refresh() {
    run();
  }

  function stop() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
    lastKey = null;
  }

  window.SYT_AMBIENT = { start, stop, refresh, currentVideoId, get lastColor() { return lastColor; } };
})();
