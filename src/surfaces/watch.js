/** The watch page: recommendations, end screens, autoplay, comments. */
(() => {
  'use strict';

  const { LOG, dom, settings, register } = window.SYT;

  /*
   * A hedge, not the mechanism.
   *
   * These were written on the assumption that fullscreen re-renders the related
   * videos into a panel inside the player. The console says otherwise: panel=0 on
   * every fullscreen, while the page column above accounts for all eight elements
   * that get hidden. So in practice the player has no sidebar of its own and this
   * list matches nothing.
   *
   * Kept anyway, and cheap: it is a pure selector list, and if a future player
   * does grow an in-player panel this hides it without another round of guessing.
   * The comment says so, because a comment asserting a panel exists when it does
   * not is how the next person wastes a day on it.
   */
  const FULLSCREEN_SIDEBAR = [
    '.ytp-fullscreen-related',
    '.ytp-related-videos-panel',
    '.ytp-fullscreen-related-content',
    '#player-legacy-desktop-watch-next',
    'ytd-watch-next-secondary-results-renderer.ytp-fullscreen-related-renderer'
  ];

  /*
   * The sidebar, found structurally.
   *
   * This list has been wrong twice. It was ytd-video-renderer inside #secondary,
   * then yt-lockup-view-model in a column that kept neither the old id nor the old
   * children -- and every id-based selector added to it matched nothing, which is
   * why this ran and hid zero elements for weeks.
   *
   * So stop guessing ids. The sidebar is, by definition, the column that holds a
   * list of videos beside the player, so look for that shape: a child of the watch
   * column that is not the player and holds more than one video.
   *
   * Deliberately not measured against the player's position. In fullscreen the
   * player fills the window, so "to the right of the player" describes nothing --
   * and fullscreen is the one moment this function matters most.
   */
  const VIDEOS = 'yt-lockup-view-model, ytd-video-renderer, ytd-compact-video-renderer';

  const STRUCTURAL = new Set(['primary', 'columns', 'purchase', 'panels']);

  const countVideos = (el) => dom.qa(VIDEOS, el).length;

  function sidebarColumn() {
    const host = dom.q('ytd-watch-flexy #columns') || dom.q('ytd-watch-flexy');
    if (host) {
      for (const child of host.children) {
        if (child.id === 'primary' || child.id === 'player') continue;
        if (countVideos(child) >= 2) return child;
      }
    }

    // No sibling column: fall back to walking up from a video, for the layouts
    // that wrap the list one level deeper than the column itself.
    for (const lockup of dom.qa(VIDEOS)) {
      if (lockup.closest('#primary')) continue;
      let el = lockup;
      let parent = el.parentElement;
      while (parent && !STRUCTURAL.has(parent.id) && parent.tagName !== 'YTD-WATCH-FLEXY' && parent.tagName !== 'YTD-APP') {
        el = parent;
        parent = el.parentElement;
      }
      // A single card is also ~400px wide, so width cannot tell it from a column --
      // but a column holds many videos and a card holds exactly one.
      if (el !== lockup && el.getBoundingClientRect().width >= 200 && countVideos(el) >= 2) return el;
    }
    return null;
  }

  /*
   * Fullscreen, as the player reports it.
   *
   * document.fullscreenElement is the only reliable answer when the browser drives
   * it, but YouTube also runs a CSS-only fullscreen that never touches the API, and
   * that is the mode where the sidebar overlaps the video. Accept either.
   */
  function isFullscreen() {
    const player = dom.q('#movie_player');
    if (player) {
      const active = document.fullscreenElement || document.webkitFullscreenElement;
      if (active && (active === player || player.contains(active))) return true;
      if (player.classList.contains('ytp-fullscreen')) return true;
      if (player.hasAttribute('fullscreen')) return true;
    }
    // A different element going fullscreen is not the video going fullscreen.
    return false;
  }

  /*
   * Named containers, used alongside the structural finder below and only while
   * fullscreen. This catches the sidebars that hold no videos at all -- live chat,
   * transcript, podcast -- which the finder above will not recognise.
   */
  const SECONDARY = [
    'ytd-watch-next-secondary-results-renderer',
    'ytd-watch-flexy #secondary',
    'ytd-watch-flexy #secondary-inner',
    // The sidebar is not one element. As well as "up next", the right-hand column
    // can be a live chat, a transcript, an "About this content" panel, or the
    // podcast episode list -- each a different custom element that YouTube swaps
    // in as the page loads. Listing the container plus every one of those is what
    // actually empties the column; listing only the container leaves whichever
    // arrived last still standing.
    'ytd-watch-flexy #panels',
    'ytd-watch-flexy ytd-live-chat-frame',
    'ytd-watch-flexy ytd-engagement-panel-section-list-renderer[target-id*="chat"]',
    'ytd-watch-flexy ytd-engagement-panel-section-list-renderer[target-id*="transcript"]',
    'ytd-watch-flexy ytd-podcast',
    'ytd-watch-flexy #secondary #related'
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
  const SAVE_NOISE = [
    'ytd-watch-metadata ytd-save-to-playlist-renderer',
    'ytd-watch-metadata ytd-save-button-renderer',
    'ytd-watch-metadata .save-button',
    'ytd-watch-metadata [aria-label*="save" i]',
    'ytd-watch-metadata [aria-label*="watch later" i]'
  ];

  const AI_NOISE = [
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

  const MENU = [
    'ytd-watch-metadata ytd-menu-renderer#button',
    'ytd-watch-metadata ytd-menu-renderer',
    // The same "..." as the new yt-* view-model components the related list now
    // uses. A wrong guess here is harmless: it fails feature detection and leaves
    // Save alone.
    'ytd-watch-metadata yt-menu-renderer'
  ];

  // YouTube runs this on every mutation, so an unconditional "unavailable" line
  // buried the console in dozens of identical messages. Say it once.
  let menuWarned = false;

  /*
   * Add our entry to YouTube's own menu, then stop.
   *
   * ytd-menu-renderer exposes menuItems through a Polymer API rather than markup,
   * so there is no element to append to -- the menu renders from that list. The
   * call is feature-detected and wrapped because it is an internal API: if YouTube
   * changes it, this no-ops and logs instead of throwing inside the surface, and
   * Save stays in the action bar. The flag keeps it to one attempt per element, so
   * this is not retried on every mutation.
   *
   * Returns whether Save actually made it into a menu, because the caller hides the
   * original button only on success. Returning nothing here would let a failed move
   * delete Save from the page outright.
   */
  function addSaveToMenu() {
    let added = false;    for (const menu of dom.qa(MENU.join(', '))) {
      if (!menu || menu.dataset.sytSaveInMenu === '1') { added = added || menu?.dataset?.sytSaveInMenu === '1'; continue; }
      const api = typeof menu.api === 'function' ? menu.api() : null;
      const has = api && (typeof api.addMenuItems === 'function' || Array.isArray(menu.menuItems));
      if (!has) {
        menu.dataset.sytSaveInMenu = 'skipped';
        continue;
      }
      menu.dataset.sytSaveInMenu = '1';
      try {
        if (typeof api.addMenuItems === 'function') api.addMenuItems([MENU_ITEM]);
        else menu.set('menuItems', [...(menu.menuItems || []), MENU_ITEM]);
        added = true;
        console.info(LOG, 'watch: moved Save into the "..." menu');
      } catch (err) {
        menu.dataset.sytSaveInMenu = 'skipped';
        console.warn(LOG, 'watch: could not add Save to the menu', err);
      }
    }
    if (!added && !menuWarned) {
      menuWarned = true;
      console.info(LOG, 'watch: menu API unavailable, Save stays in the action bar');
    }
    return added;
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

  /*
   * A button to bring the comments back.
   *
   * Comments are now off by default, which is a behaviour change and not just a
   * default: a thread is an argument with a stranger about something you already
   * watched, and it is the largest block of page below the video. But removing it
   * outright would break a real feature (principle 5), and a setting buried in a
   * panel you have to go and find is not a control -- so it gets a switch in the
   * place the comments would have been.
   *
   * Written to storage rather than to a local variable, so the in-page button and
   * the settings panel can never disagree: core listens for storage changes and
   * re-runs this surface.
   */
  const TOGGLE_ID = 'syt-comments-toggle';

  const TOGGLE_ANCHORS = [
    'ytd-watch-flexy #below-the-fold',
    'ytd-watch-flexy ytd-watch-metadata',
    'ytd-watch-flexy #primary'
  ];

  const TOGGLE_CSS = `
    :host { display: block; margin: 24px 0 8px; }
    .bar {
      display: flex; align-items: center; gap: 12px;
      padding: 12px 0; border-top: 1px solid var(--syt-border, #1c1c20);
      font: 500 14px/20px "Roboto","YouTube Sans",Arial,sans-serif;
      color: var(--syt-text, #f4f4f7);
    }
    .label { letter-spacing: .02em; }
    button {
      appearance: none; cursor: pointer; margin-left: auto;
      padding: 7px 16px; border-radius: 8px;
      border: 1px solid var(--syt-border, #1c1c20);
      background: var(--syt-chip, #16161a); color: inherit;
      font: inherit; font-weight: 500;
    }
    button:hover { background: var(--syt-hover, rgba(255,255,255,.07)); }
    button:focus-visible { outline: 2px solid var(--syt-accent, #ff2d55); outline-offset: 2px; }
  `;

  function mountCommentsToggle() {
    /*
     * Try each anchor in turn rather than joining them into one querySelector.
     * querySelector("a, b, c") returns whichever element comes first in the
     * document, not whichever selector is listed first -- and #primary contains
     * the other two, so the joined query always returned #primary and parked the
     * bar at the bottom of the column, under the description and the recommendation
     * placeholders, instead of directly under the video.
     */
    let anchor = null;
    for (const selector of TOGGLE_ANCHORS) {
      anchor = dom.q(selector);
      if (anchor) break;
    }
    if (!anchor) return;

    // Re-attach if YouTube re-rendered the region out from under us, but never
    // build a second one.
    const existing = document.getElementById(TOGGLE_ID);
    if (existing) {
      if (existing.parentElement !== anchor) anchor.append(existing);
      return;
    }

    const host = document.createElement('div');
    host.id = TOGGLE_ID;
    const shadow = host.attachShadow({ mode: 'open' });

    const style = document.createElement('style');
    style.textContent = TOGGLE_CSS;

    const bar = document.createElement('div');
    bar.className = 'bar';
    bar.innerHTML = '<span class="label"></span>';
    const button = document.createElement('button');
    button.type = 'button';
    bar.append(button);

    const paint = () => {
      const shown = settings.showComments;
      bar.querySelector('.label').textContent = shown ? 'Comments' : 'Comments hidden';
      button.textContent = shown ? 'Hide' : 'Show';
      button.setAttribute('aria-expanded', String(shown));
    };

    button.addEventListener('click', () => {
      // No local state: storage is the single source of truth, and core re-runs
      // this surface on the change, which is what actually shows or hides it.
      chrome.storage.local.set({ showComments: !settings.showComments }).catch((err) => {
        console.warn(LOG, 'watch: could not change the comments setting', err);
      });
    });

    paint();
    shadow.append(style, bar);
    anchor.append(host);
    console.info(LOG, 'watch: added a comments toggle');
  }

  function apply() {
    const full = isFullscreen();
    const hideFull = full && settings.hideFullscreenSidebar;

    /*
     * The sidebar goes away for fullscreen and comes straight back after it.
     *
     * dom.hide/show are idempotent and keyed on a data attribute, so calling both
     * paths every pass is what makes leaving fullscreen restore the column --
     * there is no separate "unfullscreen" path that could drift out of sync.
     */
    const column = sidebarColumn();
    const named = SECONDARY.join(',');
    // In fullscreen, hide both the id-based containers and the column found above.
    // Either alone leaves something: the ids are how a live chat or transcript is
    // found, and those contain no videos, so the structural finder skips them.
    const recs = hideFull
      ? dom.hideAll(named) + (column && dom.hide(column) ? 1 : 0)
      : dom.showAll(named) + (column && dom.show(column) ? 1 : 0);

    const noise = settings.removeDistractions ? dom.hideAll(DISTRACTIONS.join(',')) : dom.showAll(DISTRACTIONS.join(','));
    const comments = dom.hideWhen(COMMENTS.join(','), !settings.showComments);

    // Only ever touched in fullscreen, so leaving it restores the player intact.
    const panel = dom.hideWhen(FULLSCREEN_SIDEBAR.join(','), hideFull);

    // Relocating has to succeed before the original goes away. The AI buttons are
    // not being moved anywhere, so those are just hidden.
    const savedInMenu = addSaveToMenu();
    dom.hideWhen(AI_NOISE.join(','), true);
    if (savedInMenu) dom.hideWhen(SAVE_NOISE.join(','), true);
    else dom.showAll(SAVE_NOISE.join(','));

    // Mounted unconditionally rather than only when the comments are hidden.
    // Gating it on the hidden count meant the bar's existence depended on a stored
    // setting the user could not see, and a watch page where the switch was
    // unreachable was indistinguishable from a broken one. A visible thread with a
    // Hide button above it is normal UI, not clutter.
    mountCommentsToggle();

    seatSubscribe();
    disableAutoplay();

    if (recs || noise || comments || panel) {
      console.info(
        LOG,
        `watch: fullscreen=${full} sidebar=${recs} panel=${panel} distractions=${noise} comments=${comments}`
      );
    }
  }

  register('watch', ['ytd-watch-flexy'], apply);
})();
