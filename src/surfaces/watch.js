/** The watch page: recommendations, end screens, autoplay, comments. */
(() => {
  'use strict';

  const { LOG, dom, settings, register } = window.SYT;

  const SECONDARY = [
    'ytd-watch-next-secondary-results-renderer',
    'ytd-watch-flexy #secondary',
    'ytd-watch-flexy #secondary-inner'
  ];

  // Overlays the player puts on top of the video once it ends or on hover.
  const DISTRACTIONS = [
    '.ytp-endscreen-content',
    '.ytp-ce-element',
    '.ytp-pause-overlay',
    '.ytp-cards-teaser',
    '.ytp-iv-player-content',
    '.annotation',
    'ytd-merch-shelf-renderer',
    'ytd-product-list-renderer',
    'ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-macro"]',
    'ytd-video-ads' // in-feed ad slots rendered under the player
  ];

  const COMMENTS = ['ytd-comments', 'ytd-watch-flexy #comments'];

  // YouTube's own autoplay switch, in the player settings menu.
  const AUTONAV = 'ytd-autonav-toggle-button-renderer button';

  function autoplayIsOn(button) {
    if (button.getAttribute('aria-checked') === 'true') return true;
    return /autoplay is on/i.test(button.getAttribute('aria-label') || '');
  }

  /**
   * There is no supported way to turn autoplay off from outside; the only lever is
   * the site's own switch, which persists per account. So we read its state and
   * click it if it is on. Idempotent -- once flipped, the button reads "off" and
   * we never touch it again.
   */
  function disableAutoplay() {
    if (!settings.disableAutoplay) return;
    for (const button of dom.qa(document, AUTONAV)) {
      if (button.dataset.sytAutonav === '1') continue;
      button.dataset.sytAutonav = '1';
      if (autoplayIsOn(button)) {
        button.click();
        console.info(LOG, 'autoplay: disabled via the player switch');
      }
    }
  }

  /**
   * Seat the Subscribe button directly against the profile picture instead of
   * letting YouTube park it at the end of the channel row.
   *
   * The channel row has been restructured at least twice, so this only acts when
   * the two elements actually exist in the same owner renderer, and it re-seats
   * whenever YouTube re-renders the row. Reparenting one leaf custom element
   * inside the row is safe; rewriting the row's markup wholesale is not.
   */
  function seatSubscribe() {
    for (const owner of dom.qa(document, 'ytd-video-owner-renderer')) {
      const avatarHost = dom.q(owner, 'ytd-avatar-renderer, a#avatar, #avatar');
      const sub = dom.q(owner, 'ytd-subscribe-button-renderer, yt-subscribe-button-renderer');
      if (!avatarHost || !sub) continue;

      const avatar = dom.q(avatarHost, '#avatar') || avatarHost;
      const parent = avatar.parentElement;
      if (!parent) continue;
      if (sub.parentElement === parent && sub.previousElementSibling === avatar) {
        owner.dataset.sytSeated = '1';
        continue;
      }
      if (owner.dataset.sytSeated === '1') continue;

      parent.insertBefore(sub, avatar.nextSibling);
      owner.dataset.sytSeated = '1';
      console.info(LOG, 'watch: seated Subscribe against the profile picture');
    }
  }

  function apply() {
    const recs = dom.hideWhen(SECONDARY.join(','), !settings.showRecommendations);
    const noise = settings.removeDistractions ? dom.hideAll(DISTRACTIONS.join(',')) : dom.showAll(DISTRACTIONS.join(','));
    const comments = dom.hideWhen(COMMENTS.join(','), !settings.showComments);

    seatSubscribe();
    disableAutoplay();

    if (recs || noise || comments) {
      console.info(LOG, `watch: recommendations=${recs} distractions=${noise} comments=${comments}`);
    }
  }

  register('watch', ['ytd-watch-flexy'], apply);
})();
