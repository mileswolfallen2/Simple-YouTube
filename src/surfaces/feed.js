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
   * Shorts embedded in the feed.
   *
   * A separate list from SHELVES because this one is a decision rather than a
   * shelf cleanup. A reel shelf is a vertical-video slot wedged between ordinary
   * videos, and it is the most effective attention capture on the home page: you
   * arrive wanting one video and you are holding a slot machine.
   *
   * It was left visible for a while so the budget in shorts.js could count shorts
   * opened from here. That trade is now reversed deliberately -- you cannot spend
   * budget on something you cannot reach, and reaching one took a single swipe.
   * Shorts stay reachable from the rail, where the budget can actually see them.
   */
  const REEL_SHELVES = [
    'ytd-reel-shelf-renderer',
    'ytd-rich-shelf-renderer[is-shorts]',
    'ytd-video-renderer:has(a[href^="/shorts/"])',
    'ytd-rich-item-renderer:has(a[href^="/shorts/"])'
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
      dom.hideAll(REEL_SHELVES.join(',')) +
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
