/** Home, search, subscriptions: strip the shelves, the category chips, the ads. */
(() => {
  'use strict';

  const { LOG, dom, register } = window.SYT;

  // Horizontally scrolling shelves. Each one is a "you might also like" surface
  // with no end and no reason to exist.
  const SHELVES = [
    'ytd-rich-shelf-renderer',
    'ytd-mix-renderer',
    'ytd-shelf-renderer',
    'ytd-horiz-card-shelf-renderer',
    'ytd-horizontal-card-list-renderer'
  ];

  /*
   * The category chip row: "Your custom feed / All / Gaming / Music /
   * Speedcubing / Steam / ..." -- a hundred topics you did not ask for, sitting
   * above the videos. It is a filter for a feed that should not need filtering.
   * Gone unconditionally; there is no setting to bring it back, because the
   * answer to "which category of algorithmic feed do you want" is none of them.
   */
  const CATEGORIES = [
    'ytd-browse[page-subtype="home"] iron-selector#chips',
    'ytd-browse[page-subtype="home"] ytd-chip-cloud',
    'ytd-browse[page-subtype="home"] #chip-container',
    'ytd-browse[page-subtype="home"] ytd-rich-grid-renderer #chips',
    'ytd-rich-grid-renderer #chips',
    'yt-chip-cloud-renderer',
    'ytd-search #filter-chip-container',
    'ytd-search ytd-chip-cloud',
    'ytd-search #filters'
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
    'ytd-browse[page-subtype="home"] #dismissible'
  ];

  const SEARCH_NOISE = [
    'ytd-horizontal-card-list-renderer',
    'ytd-shelf-renderer'
  ];

  function apply(kind) {
    let n =
      dom.hideAll(SHELVES.join(',')) +
      dom.hideAll(CATEGORIES.join(',')) +
      dom.hideAll(PROMOTED.join(','));

    if (kind === 'search') n += dom.hideAll(SEARCH_NOISE.join(','));

    if (n) console.info(LOG, `${kind}: removed ${n} feed element(s)`);
  }

  register(
    'feed',
    ['ytd-browse[page-subtype="home"]', 'ytd-search', 'ytd-browse[page-subtype="subscriptions"]'],
    apply
  );
})();
