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

  /*
   * Save, and the AI row, out of the action bar and into the "..." menu.
   *
   * The action bar is the most valuable strip on the page after the player
   * itself, and it is currently eight targets wide: like, dislike, share,
   * download, save, and the AI cluster YouTube has been adding to it. Save is a
   * once-a-week action sitting beside a once-a-second one, and the AI buttons are
   * a second interface wrapped around the video.
   *
   * Nothing is deleted. The real Save button is only hidden; when you pick the
   * entry in the "..." menu we dispatch a click on the button underneath, so
   * YouTube's own Save-to-playlist dialog opens -- same lists, same "watch later"
   * quick-add, no second implementation to keep in sync with theirs.
   */
  const ROW_NOISE = [
    // Save.
    'ytd-watch-metadata ytd-save-to-playlist-renderer',
    'ytd-watch-metadata ytd-save-button-renderer',
    'ytd-watch-metadata .save-button',
    'ytd-watch-metadata [aria-label*="save" i]',
    'ytd-watch-metadata [aria-label*="watch later" i]',
    // The AI cluster: "Ask", summaries, and the pill that may or may not have
    // shipped by the time you load the page.
    'ytd-watch-metadata ytd-button-renderer[aria-label*="ask" i]',
    'ytd-watch-metadata [aria-label*="ask" i]',
    'ytd-watch-metadata [aria-label*="ai" i]',
    'ytd-watch-metadata ytd-ask-superchat-renderer',
    'ytd-watch-metadata .ask-badge',
    'ytd-watch-metadata #ask-button'
  ];

  const SAVE_TRIGGER =
    'ytd-watch-metadata ytd-save-to-playlist-renderer button, ytd-watch-metadata ytd-save-button-renderer button';

  const MENU_ITEM = {
    text: 'Save to playlist',
    icon: 'bookmark',
    onSelect: () => {
      const button = dom.q(SAVE_TRIGGER);
      if (!button) {
        console.warn(LOG, 'watch: no Save button to hand off to');
        return;
      }
      button.click();
    }
  };

  const MENU = 'ytd-watch-metadata ytd-menu-renderer#button, ytd-watch-metadata ytd-menu-renderer';

  /*
   * Add our entry to YouTube's own menu, then stop.
   *
   * ytd-menu-renderer exposes menuItems through a Polymer API rather than markup,
   * so there is no element to append to -- the menu renders from that list. The
   * call is feature-detected and wrapped because it is an internal API: if YouTube
   * changes it, this no-ops and logs instead of throwing inside the surface, and
   * Save is still reachable from the rail's Watch later icon. The flag keeps it to
   * one attempt per element, so this is not retried on every mutation.
   */
  function addSaveToMenu() {
    for (const menu of dom.qa(MENU)) {
      if (!menu || menu.dataset.sytSaveInMenu === '1') continue;
      const api = typeof menu.api === 'function' ? menu.api() : null;
      const has = api && (typeof api.addMenuItems === 'function' || Array.isArray(menu.menuItems));
      if (!has) {
        menu.dataset.sytSaveInMenu = 'skipped';
        console.info(LOG, 'watch: menu API unavailable, Save stays in the action bar');
        continue;
      }
      menu.dataset.sytSaveInMenu = '1';
      try {
        if (typeof api.addMenuItems === 'function') api.addMenuItems([MENU_ITEM]);
        else menu.set('menuItems', [...(menu.menuItems || []), MENU_ITEM]);
        console.info(LOG, 'watch: moved Save into the "..." menu');
      } catch (err) {
        console.warn(LOG, 'watch: could not add Save to the menu', err);
      }
    }
  }


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
    for (const button of dom.qa(AUTONAV)) {
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
    for (const owner of dom.qa('ytd-video-owner-renderer')) {
      const avatarHost = dom.q('ytd-avatar-renderer, a#avatar, #avatar', owner);
      const sub = dom.q('ytd-subscribe-button-renderer, yt-subscribe-button-renderer', owner);
      if (!avatarHost || !sub) continue;

      const avatar = dom.q('#avatar', avatarHost) || avatarHost;
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

    // Hide the row noise first, then add the menu entry: the entry is only worth
    // adding if the button it hands off to is still on the page.
    dom.hideWhen(ROW_NOISE.join(','), true);
    addSaveToMenu();

    seatSubscribe();
    disableAutoplay();

    if (recs || noise || comments) {
      console.info(LOG, `watch: recommendations=${recs} distractions=${noise} comments=${comments}`);
    }
  }

  register('watch', ['ytd-watch-flexy'], apply);
})();
