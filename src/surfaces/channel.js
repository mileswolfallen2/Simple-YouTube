/** Channel pages: the @username under the channel name is hidden. */
(() => {
  'use strict';

  const { LOG, dom, register } = window.SYT;

  const CHANNEL_PAGE = 'ytd-browse[page-subtype="channels"]';

  // The handle has moved between #channel-handle, .channel-handle, and the
  // yt-content-header-view-model tree more than once, so match all of them and
  // scope the whole list to the channel page.
  const HANDLES = [
    `${CHANNEL_PAGE} #channel-handle`,
    `${CHANNEL_PAGE} .channel-handle`,
    `${CHANNEL_PAGE} yt-content-header-view-model__metadata .channel-handle`,
    `${CHANNEL_PAGE} ytd-channel-name .channel-handle`
  ];

  function apply() {
    const n = dom.hideAll(HANDLES.join(','));
    if (n) console.info(LOG, `channel: hid ${n} @handle element(s)`);
  }

  register('channel', [CHANNEL_PAGE], apply);
})();
