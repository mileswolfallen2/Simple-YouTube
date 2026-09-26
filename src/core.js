/**
 * Core runtime. Loaded first, before any surface or UI module.
 *
 * Everything hangs off a single window.SYT global because content scripts in MV3
 * are plain scripts, not modules -- there is no import graph available here.
 */
(() => {
  'use strict';

  const { DEFAULTS, resolve } = window.SYT_SETTINGS;
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
      Object.assign(settings, resolve(stored));
    }
  };

  /* ── dom helpers ────────────────────────────────────────────── */

  /*
   * Selector first, root optional -- the same order as querySelector, and the
   * order nearly every call site already reads in. The root argument exists only
   * for the few places that need to scope a lookup to one element; passing a
   * selector where a root is expected is now impossible to do by accident.
   */
  const dom = {
    q(selector, root) {
      return (root || document).querySelector(selector);
    },

    qa(selector, root) {
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
      return dom.qa(selector, root).filter((el) => dom.hide(el)).length;
    },

    showAll(selector, root) {
      return dom.qa(selector, root).filter((el) => dom.show(el)).length;
    },

    hideWhen(selector, enabled, root) {
      return enabled ? dom.hideAll(selector, root) : dom.showAll(selector, root);
    }
  };

  /* ── page kind ──────────────────────────────────────────────── */

  function pageKind() {
    if (dom.q('ytd-watch-flexy')) return 'watch';
    // Classify by the page's own containers. A ytd-reel-shelf-renderer is a widget
    // embedded in a feed, not the Shorts page: match it here and any home feed
    // carrying one shelf reports itself as "shorts", which misroutes the ambient
    // treatment and can throw the budget walkout over the home page. Hiding the
    // shelf does not help, because we hide with display:none and dom.q() matches
    // hidden nodes by design -- the master switch relies on that.
    if (dom.q('ytd-shorts, ytd-reel-video-renderer, ytd-browse[page-subtype="reels"]')) return 'shorts';
    if (dom.q('ytd-browse[page-subtype="channels"]')) return 'channel';
    if (dom.q('ytd-browse[page-subtype="home"]')) return 'home';
    if (dom.q('ytd-search')) return 'search';
    if (dom.q('ytd-browse[page-subtype="subscriptions"]')) return 'subscriptions';
    if (dom.q('ytd-browse[page-subtype="playlist"], ytd-playlist-page')) return 'playlist';
    if (dom.q('ytd-feed')) return 'feed';
    return 'other';
  }

  /* ── surfaces ───────────────────────────────────────────────── */

  const surfaces = [];

  function register(name, selectors, apply) {
    surfaces.push({ name, selectors, apply });
  }

  function runSurfaces(kind) {
    if (!settings.enabled) {
      // The master switch. Everything the extension hides carries
      // data-syt-hidden, so turning it off is a matter of handing those nodes
      // back.
      let restored = 0;
      for (const el of dom.qa('[data-syt-hidden]')) {
        if (dom.show(el)) restored++;
      }
      if (restored) console.info(LOG, `disabled: restored ${restored} element(s)`);
      return;
    }

    for (const surface of surfaces) {
      if (kind !== 'other' && surface.selectors.length && !surface.selectors.some((s) => dom.q(s))) continue;
      try {
        surface.apply(kind);
      } catch (err) {
        console.error(LOG, `surface "${surface.name}" failed`, err);
      }
    }
  }

  let pending = null;

  function schedule() {
    if (pending) cancelAnimationFrame(pending);
    pending = requestAnimationFrame(() => {
      pending = null;
      const kind = pageKind();
      document.documentElement.setAttribute('data-syt-page', kind);
      runSurfaces(kind);
      measureMasthead();
    });
  }

  /* ── theme ──────────────────────────────────────────────────── */

  function applyTheme() {
    const root = document.documentElement;
    root.setAttribute('data-syt-theme', settings.theme);
    root.setAttribute('data-syt-rail', settings.enabled && !settings.showGuide ? 'on' : 'off');
    for (const [key, value] of Object.entries(settings)) {
      if (key === 'theme' || key.startsWith('ambient') || key === 'isDark' || key === 'ambientForcedOff') continue;
      root.setAttribute(`data-syt-${key.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase())}`, value ? 'on' : 'off');
    }
  }

  /* ── masthead ───────────────────────────────────────────────── */

  /*
   * The rail hangs below the masthead, and the masthead is not 56px everywhere:
   * it is taller on some breakpoints and collapses as you scroll.
   *
   * Measure #masthead-container, not #masthead. The container is the element that
   * actually paints the bar and carries the border underneath it; #masthead sits
   * inside it and is a couple of pixels shorter once the border is counted. Sizing
   * the rail from the inner element left a sliver between the bar and the rail,
   * which showed up as a box sitting exactly in the corner where they meet.
   */
  function measureMasthead() {
    const bar = dom.q('#masthead-container') || dom.q('#masthead, ytd-masthead');
    if (!bar) return;
    const rect = bar.getBoundingClientRect();
    if (!rect.height) return;

    const root = document.documentElement;
    root.style.setProperty('--syt-masthead-h', `${Math.round(rect.height)}px`);
    // The rail is position:fixed, so its offset is viewport-relative. Tracking
    // the bar's live bottom edge rather than its height keeps the join flush
    // while the page scrolls and the bar collapses.
    root.style.setProperty('--syt-rail-top', `${Math.max(0, Math.round(rect.bottom))}px`);
  }

  let scrollPending = null;

  function onScroll() {
    if (scrollPending) return;
    scrollPending = requestAnimationFrame(() => {
      scrollPending = null;
      measureMasthead();
    });
  }

  /* ── boot ───────────────────────────────────────────────────── */

  async function refresh() {
    await storage.load();
    applyTheme();
    schedule();
    window.SYT_AMBIENT?.refresh();
    window.SYT_UI?.rail?.sync();
  }

  async function boot() {
    await storage.load();
    applyTheme();

    // The first page's UI can only mount once <body> exists.
    const mountUI = () => window.SYT_UI?.rail?.mount();
    if (document.body) mountUI();
    else document.addEventListener('DOMContentLoaded', mountUI, { once: true });

    if (storage.available()) {
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area !== 'local') return;
        if (Object.keys(changes).some((k) => k in DEFAULTS)) refresh();
      });
    }

    document.addEventListener('yt-navigate-finish', schedule, true);
    document.addEventListener('yt-page-data-updated', schedule, true);
    window.addEventListener('popstate', schedule);

    /*
     * Entering fullscreen is the one state change that does not go through
     * navigation or a meaningful DOM mutation: the player swaps layout internally
     * and the sidebar that comes with it appears without the observer noticing
     * anything we care about. Listen for it directly, or the fullscreen sidebar
     * survives until the next navigation.
     */
    const onFullscreen = () => {
      // The player settles after the event; one frame of slack is enough and a
      // timer here is cheaper than re-running every surface on every fullscreen
      // toggle notification.
      watchPlayer();
      requestAnimationFrame(schedule);
    };
    document.addEventListener('fullscreenchange', onFullscreen);
    document.addEventListener('webkitfullscreenchange', onFullscreen);

    /*
     * And for the other kind of fullscreen.
     *
     * YouTube also runs a fullscreen that never touches the Fullscreen API: it
     * swaps a class on the player and lets CSS do it. That fires no
     * fullscreenchange, and the observer below watches childList only, so a
     * sidebar that is meant to appear and disappear with fullscreen would be
     * re-evaluated by accident rather than by intent. Watch the player's own
     * attributes instead -- scoped to that one element, because watching
     * attributes across the whole document would re-run every surface on every
     * class change YouTube makes.
     */
    let watchedPlayer = null;
    const playerObserver = new MutationObserver(() => requestAnimationFrame(schedule));
    const watchPlayer = () => {
      const player = document.querySelector('#movie_player');
      if (!player || player === watchedPlayer) return;
      playerObserver.disconnect();
      watchedPlayer = player;
      playerObserver.observe(player, { attributes: true, attributeFilter: ['class', 'fullscreen'] });
    };
    watchPlayer();

    // YouTube's custom events are undocumented and have been renamed before.
    // A debounced observer on the document is the safety net that keeps this
    // working when they do.
    let quiet = null;
    new MutationObserver(() => {
      // YouTube replaces #movie_player when navigating between videos, which
      // would leave the observer above watching a detached element. Re-point it.
      watchPlayer();
      if (quiet) clearTimeout(quiet);
      quiet = setTimeout(schedule, 120);
    }).observe(document.documentElement, { childList: true, subtree: true });

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    window.SYT_UI?.rail?.mount();
    measureMasthead();

    window.addEventListener('syt:open-settings', () => window.SYT_UI?.rail?.openPanel?.());
    window.addEventListener('syt:shorts-changed', () => window.SYT_UI?.rail?.sync());

    schedule();
    window.SYT_AMBIENT?.start();
  }

  window.SYT = {
    DEFAULTS,
    LOG,
    settings,
    storage,
    dom,
    pageKind,
    register,
    schedule,
    boot,
    refresh
  };

  applyTheme();
})();
