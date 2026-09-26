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
    // The three-line menu. Listed several ways because YouTube has moved it
    // between wrappers before: the long descendant chain is the specific one, the
    // bare ids are the fallback for when it stops nesting under ytd-app.
    'ytd-app #masthead-container #guide-button',
    'ytd-masthead #guide-button',
    'ytd-masthead #guide-button tp-yt-paper-icon-button',
    '#guide-button-container'
  ];

  function apply() {
    const n = dom.hideWhen(RAILS.join(','), !settings.showGuide);
    if (n) console.info(window.SYT.LOG, `guide: hid ${n} rail element(s)`);
  }

  register('guide', ['ytd-app', 'ytd-browse', 'ytd-watch-flexy', 'ytd-search'], apply);
})();
