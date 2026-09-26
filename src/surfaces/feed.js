/** Home, search, subscriptions: strip the shelves, Shorts, and promoted slots. */
(() => {
  'use strict';

  const { LOG, dom, register } = window.SYT;

  // Horizontally scrolling shelves. Each one is a "you might also like" surface
  // with no end and no reason to exist.
  const SHELVES = [
    'ytd-rich-shelf-renderer',
    'ytd-reel-shelf-renderer',
    'ytd-mix-renderer',
    'ytd-shelf-renderer',
    'ytd-horiz-card-shelf-renderer',
    'ytd-horizontal-card-list-renderer'
  ];

  // Shorts, everywhere it appears.
  const SHORTS = [
    'ytd-reel-video-renderer',
    'ytd-shorts-lockup-view-model',
    'a[href^="/shorts/"]'
  ];

  // Slots that are ads or "For You" recommendations wearing a video's clothes.
  const PROMOTED = [
    'ytd-promoted-video-renderer',
    'ytd-promoted-sparkles-web-renderer',
    'ytd-display-ad-renderer',
    'ytd-in-feed-ad-layout-renderer',
    'ytd-action-companion-ad-renderer',
    'ytd-video-masthead-ad-v3-renderer',
    'ytd-ad-slot-renderer',
    'ytd-rich-grid-renderer ytd-video-renderer[is-shorts]',
    'ytd-browse[page-subtype="home"] #dismissible'
  ];

  const SEARCH_NOISE = [
    'ytd-search #filters',
    'ytd-horizontal-card-list-renderer',
    'ytd-shelf-renderer',
    'ytd-reel-shelf-renderer'
  ];

  function apply(kind) {
    let n = dom.hideAll(SHELVES.join(',')) + dom.hideAll(SHORTS.join(',')) + dom.hideAll(PROMOTED.join(','));

    if (kind === 'search') n += dom.hideAll(SEARCH_NOISE.join(','));

    if (n) console.info(LOG, `${kind}: removed ${n} feed element(s)`);
  }

  register('feed', ['ytd-browse[page-subtype="home"]', 'ytd-search', 'ytd-browse[page-subtype="subscriptions"]'], apply);
})();
