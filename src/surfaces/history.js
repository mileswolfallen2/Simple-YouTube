/**
 * Watch history.
 *
 * History is the one page in this extension that is a record rather than a feed,
 * and it should behave like one: finite, chronological, and readable top to bottom.
 * YouTube renders it as a feed-shaped grid, which is the wrong shape for a list
 * of things you already watched, and pads every entry with the context it tracked
 * while you were not looking.
 *
 * The layout lives in CSS (see styles/surfaces.css). What is here is the part that
 * needs a decision: the engagement lines under each title.
 */
(() => {
  'use strict';

  const { LOG, dom, register } = window.SYT;

  /*
   * "Watched from Shorts" and friends.
   *
   * History entries carry a metadata line, and YouTube packs it with the origin of
   * the session -- which surface you came from, whether it followed something else,
   * a recommendation chain. It is a second subject line on a list you are reading
   * for the titles, and it is the same "you might also like" idea arriving again
   * through the back door of a page you visit to find something you already saw.
   *
   * Matched on text rather than on structure, because YouTube has no stable
   * element for it -- it varies the markup by locale and A/B bucket. The time
   * ("Watched 3 hours ago") is on the same node and is worth keeping, so the whole
   * line is rewritten to just the time rather than the line being dropped.
   */
  const ORIGIN_TEXT = /\s*(watched|viewed)\s+from\b[^\d]*/i;

  const METADATA = [
    'ytd-browse[page-subtype="history"] .yt-content-metadata-view-model__metadata',
    'ytd-browse[page-subtype="history"] #metadata-line',
    'ytd-browse[page-subtype="history"] #video-info'
  ];

  /*
   * Strip the origin clause, keep the timestamp.
   *
   * Rewriting the node's text rather than hiding it means the row keeps its
   * height and the timestamps stay aligned, and if the node turns out to be empty
   * afterwards it is removed so no blank line is left behind.
   */
  function stripOrigin() {
    let n = 0;
    for (const el of dom.qa(METADATA.join(','))) {
      if (el.dataset.sytHistory === '1') continue;
      const text = el.textContent || '';
      if (!ORIGIN_TEXT.test(text)) continue;

      el.dataset.sytHistory = '1';
      const cleaned = text.replace(ORIGIN_TEXT, ' ').replace(/\s{2,}/g, ' ').trim();
      if (cleaned) {
        el.textContent = cleaned;
      } else {
        dom.hide(el);
      }
      n += 1;
    }
    return n;
  }

  function apply() {
    const n = stripOrigin();
    if (n) console.info(LOG, `history: stripped ${n} watch-origin line(s)`);
  }

  register('history', ['ytd-browse[page-subtype="history"]'], apply);
})();
