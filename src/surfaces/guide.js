/** Left navigation rail, the slide-out drawer, and the collapsed mini rail. */
(() => {
  'use strict';

  const { dom, settings, register } = window.SYT;

  const RAILS = [
    'ytd-app #guide',
    'tp-yt-app-drawer#guide',
    '#guide-container',
    'ytd-mini-guide-renderer',
    'ytd-app #masthead-container #guide-button' // the hamburger that opens the drawer
  ];

  function apply() {
    const n = dom.hideWhen(RAILS.join(','), !settings.showGuide);
    if (n) console.info(window.SYT.LOG, `guide: hid ${n} rail element(s)`);
  }

  register('guide', ['ytd-app', 'ytd-browse', 'ytd-watch-flexy', 'ytd-search'], apply);
})();
