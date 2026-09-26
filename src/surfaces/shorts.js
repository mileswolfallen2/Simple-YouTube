/**
 * Enforcing the Shorts budget.
 *
 * Counts one short per distinct video that actually starts playing, so scrubbing
 * back through the same short does not spend budget and a short that never plays
 * does not either. The counting is scoped to videos inside a Shorts container --
 * without that check every ordinary watch-page video would spend the budget.
 *
 * When the budget runs out the walkout takes the screen and the player stops.
 */
(() => {
  'use strict';

  const { LOG, dom, pageKind, register } = window.SYT;

  const SHORTS_CONTAINER = 'ytd-reel-video-renderer, ytd-reel-shelf-renderer, ytd-shorts';

  const counted = new Set();
  let walkoutShown = false;

  function onPlay(event) {
    const video = event.target;
    if (!video || video.tagName !== 'VIDEO') return;
    if (!video.closest(SHORTS_CONTAINER)) return;

    const id = window.SYT_AMBIENT?.currentVideoId();
    if (id && counted.has(id)) return;

    window.SYT_BUDGET.read().then((state) => {
      if (window.SYT_BUDGET.spent(state)) {
        video.pause();
        if (!walkoutShown) {
          walkoutShown = true;
          console.info(LOG, `shorts: budget spent (${state.shortsUsed}) -- walkout`);
          window.SYT_UI.walkout?.show();
        }
        return;
      }

      if (id) counted.add(id);
      window.SYT_BUDGET.spend().then(() => {
        window.dispatchEvent(new CustomEvent('syt:shorts-changed'));
      });
    });
  }

  function apply(kind) {
    walkoutShown = false;
    counted.clear();

    if (kind !== 'shorts') {
      // Navigated away from Shorts: the walkout must not follow.
      window.SYT_UI.walkout?.hide();
      return;
    }

    // Returning to a spent budget locks the page immediately rather than letting
    // one more short play first.
    window.SYT_BUDGET.read().then((state) => {
      if (window.SYT_BUDGET.spent(state)) {
        walkoutShown = true;
        window.SYT_UI.walkout?.show();
        for (const video of dom.qa('video')) video.pause();
      }
    });

    if (!document.__sytPlayHooked) {
      document.addEventListener('play', onPlay, true);
      document.__sytPlayHooked = true;
    }
  }

  // Empty selector list means "run on every page" -- the walkout guard has to
  // see the navigations away from Shorts as well as the ones onto them.
  register('shorts', [], apply);
})();
