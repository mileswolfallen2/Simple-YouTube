/**
 * The top bar.
 *
 * YouTube's masthead carries a Create button, a notifications bell with an
 * unread-count badge, and the account avatar.
 *
 * The avatar stays: it is how you reach your account, the extension's own
 * settings, and sign-out. Deleting it would strand you on the site, which is
 * principle 5 -- break nothing.
 *
 * Create goes. It is a second path to an upload flow, it is a large target in the
 * middle of a strip that is otherwise navigation, and nobody installed this
 * extension to get there. It is hidden rather than removed, so the route and the
 * keyboard shortcut still work if you want them.
 *
 * The bell stays too, flattened to a plain icon, but its unread count goes. The
 * number is an engagement counter -- it exists to make the unread state feel
 * urgent, and pulling on it is the reflex this extension is built to interrupt.
 * The icon is still there for anyone who genuinely wants notifications.
 */
(() => {
  'use strict';

  const { dom, register } = window.SYT;

  const CREATE = [
    'ytd-masthead #buttons',
    'ytd-masthead ytd-button-renderer#button',
    'ytd-masthead #create',
    'ytd-masthead tp-yt-app-drawer#create'
  ];

  const BADGES = [
    'ytd-notification-topbar-button-renderer .count',
    'ytd-notification-topbar-button-renderer .badge',
    'ytd-notification-topbar-button-renderer yt-badge-shape',
    'ytd-notification-topbar-button-renderer [slot="badge"]',
    'ytd-notification-topbar-button-renderer #badge'
  ];

  function apply() {
    const n = dom.hideWhen(CREATE.join(','), true) + dom.hideWhen(BADGES.join(','), true);
    if (n) console.info(window.SYT.LOG, `masthead: removed ${n} element(s)`);
  }

  // Empty list = run on every page, like the shorts surface. The masthead is
  // present everywhere, so gating it on a page selector would only mean the top
  // bar looks different in one direction of navigation.
  register('masthead', [], apply);
})();
