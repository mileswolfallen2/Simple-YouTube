/**
 * The popup is now only a mount point: panel.js owns the UI, and it is the same
 * renderer the rail uses in the page. Keeping one implementation is the whole
 * point -- a setting that looks different in the two places is a bug waiting to
 * happen.
 */
(() => {
  'use strict';

  const panel = window.SYT_PANEL.mount(document.getElementById('panel'));

  chrome.storage.onChanged.addListener(() => panel.render());
})();
