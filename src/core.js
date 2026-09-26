/**
 * Core runtime. Loaded first, before any surface module.
 *
 * Everything hangs off a single window.SYT global because content scripts in MV3
 * are plain scripts, not modules -- there is no import graph available here.
 */
(() => {
  'use strict';

  const DEFAULTS = {
    enabled: true,
    theme: 'system',
    showGuide: false,
    showRecommendations: false,
    disableAutoplay: true,
    removeDistractions: true,
    showComments: true,
    compact: false
  };

  const LOG = '[syt]';

  /* ── settings ──────────────────────────────────────────────── */

  const settings = { ...DEFAULTS };

  const storage = {
    available() {
      return typeof chrome !== 'undefined' && !!chrome.storage?.local;
    },

    async load() {
      if (!storage.available()) return;
      const stored = await chrome.storage.local.get(DEFAULTS);
      Object.assign(settings, DEFAULTS, stored);
    },

    async set(patch) {
      Object.assign(settings, patch);
      if (!storage.available()) return;
      await chrome.storage.local.set(patch);
    }
  };

  /* ── dom helpers ────────────────────────────────────────────── */

  const dom = {
    q(root, selector) {
      return (root || document).querySelector(selector);
    },

    qa(root, selector) {
      return Array.from((root || document).querySelectorAll(selector));
    },

    /**
     * Hide via inline style. Content-script CSS shares the page's author origin,
     * so YouTube's own rules can out-specify a stylesheet no matter how carefully
     * it is written. An inline !important declaration always wins, and unlike
     * remove() it leaves the node in place for YouTube's bindings.
     */
    hide(el) {
      if (!el || el.dataset.sytHidden === '1') return false;
      el.style.setProperty('display', 'none', 'important');
      el.dataset.sytHidden = '1';
      return true;
    },

    show(el) {
      if (!el || el.dataset.sytHidden !== '1') return false;
      el.style.removeProperty('display');
      delete el.dataset.sytHidden;
      return true;
    },

    hideAll(selector, root) {
      return dom.qa(root, selector).filter(dom.hide).length;
    },

    showAll(selector, root) {
      return dom.qa(root, selector).filter(dom.show).length;
    },

    /** Hide only when enabled, reveal when not. Used by every setting-driven rule. */
    hideWhen(selector, enabled, root) {
      return enabled ? dom.hideAll(selector, root) : dom.showAll(selector, root);
    }
  };

  /* ── page kind ──────────────────────────────────────────────── */

  function pageKind() {
    if (dom.q('ytd-watch-flexy, ytd-watch-flexy[is-fullscreen]')) return 'watch';
    if (dom.q('ytd-reel-shelf-renderer, ytd-shorts')) return 'shorts';
    if (dom.q('ytd-browse[page-subtype="channels"]')) return 'channel';
    if (dom.q('ytd-browse[page-subtype="home"]')) return 'home';
    if (dom.q('ytd-search')) return 'search';
    if (dom.q('ytd-browse[page-subtype="playlist"], ytd-playlist-page')) return 'playlist';
    if (dom.q('ytd-browse[page-subtype="subscriptions"]')) return 'subscriptions';
    if (dom.q('ytd-feed')) return 'feed';
    return 'other';
  }

  /* ── navigation ─────────────────────────────────────────────── */

  /**
   * YouTube is a single-page app: the document loads once and every subsequent
   * navigation swaps content in place. Stylesheets survive navigation, but any
   * inline display:none we applied to nodes that no longer exist does not, and
   * newly created nodes are never seen by a one-shot pass. So every surface is
   * reapplied on navigation.
   */
  const surfaces = [];
  const listeners = new Set();

  function register(name, selectors, apply) {
    surfaces.push({ name, selectors, apply });
  }

  function onPage(fn) {
    listeners.add(fn);
  }

  function runSurfaces(kind) {
    // The master switch. Everything the extension hides carries data-syt-hidden,
    // so turning it off is a matter of handing every one of those nodes back.
    if (!settings.enabled) {
      let restored = 0;
      for (const el of dom.qa(document, '[data-syt-hidden]')) {
        if (dom.show(el)) restored++;
      }
      if (restored) console.info(LOG, `disabled: restored ${restored} element(s)`);
      return;
    }

    for (const surface of surfaces) {
      if (kind !== 'other' && surface.selectors.length && !surface.selectors.some((s) => dom.q(s))) {
        continue;
      }
      try {
        surface.apply(kind);
      } catch (err) {
        console.error(LOG, `surface "${surface.name}" failed`, err);
      }
    }
    for (const fn of listeners) {
      try {
        fn(kind);
      } catch (err) {
        console.error(LOG, 'page listener failed', err);
      }
    }
  }

  let pending = null;

  function schedule(kind) {
    if (pending) cancelAnimationFrame(pending);
    pending = requestAnimationFrame(() => {
      pending = null;
      runSurfaces(kind || pageKind());
    });
  }

  function onNavigate() {
    document.documentElement.setAttribute('data-syt-page', pageKind());
    schedule();
  }

  function watchNavigation() {
    document.addEventListener('yt-navigate-finish', onNavigate, true);
    document.addEventListener('yt-page-data-updated', onNavigate, true);
    window.addEventListener('popstate', onNavigate);

    // YouTube's custom events are undocumented and have been renamed before.
    // A debounced observer on ytd-app is the safety net that keeps the extension
    // working when they do.
    const start = document.documentElement;
    new MutationObserver(() => schedule()).observe(start, { childList: true, subtree: true });
  }

  /* ── theme ──────────────────────────────────────────────────── */

  function applyTheme() {
    const root = document.documentElement;
    root.setAttribute('data-syt-theme', settings.theme);
    for (const [key, value] of Object.entries(settings)) {
      if (key === 'theme') continue;
      root.setAttribute(`data-syt-${key.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase())}`, value ? 'on' : 'off');
    }
  }

  /* ── boot ───────────────────────────────────────────────────── */

  async function boot() {
    await storage.load();
    applyTheme();

    if (storage.available()) {
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area !== 'local') return;
        const patch = {};
        for (const [key, change] of Object.entries(changes)) {
          if (key in DEFAULTS) patch[key] = change.newValue;
        }
        if (Object.keys(patch).length) {
          Object.assign(settings, patch);
          applyTheme();
          schedule();
        }
      });
    }

    onNavigate();
    watchNavigation();
  }

  window.SYT = {
    DEFAULTS,
    LOG,
    settings,
    storage,
    dom,
    pageKind,
    register,
    onPage,
    schedule,
    boot
  };

  // Available immediately for the surface modules, which are evaluated before boot().
  applyTheme();
})();
