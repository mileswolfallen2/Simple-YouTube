/**
 * YouTube's own sidebar.
 *
 * Hidden by default, because our rail replaces it. showGuide inverts this: turn
 * it on and YouTube's guide comes back while the rail stands down, so it is a
 * choice between the two rather than a pile of switches.
 */
(() => {
  'use strict';

  const { dom, settings, register } = window.SYT;

  const RAILS = [
    'ytd-app #guide',
    'tp-yt-app-drawer#guide',
    '#guide-container',
    'ytd-mini-guide-renderer',
    'ytd-app #masthead-container #guide-button'
  ];

  function apply() {
    const n = dom.hideWhen(RAILS.join(','), !settings.showGuide);
    if (n) console.info(window.SYT.LOG, `guide: hid ${n} rail element(s)`);
  }

  register('guide', ['ytd-app', 'ytd-browse', 'ytd-watch-flexy', 'ytd-search'], apply);
})();
