<p align="center">
  <img src="icons/logo.svg" width="96" height="96" alt="Simple YouTube">
</p>

<p align="center">
  <strong>Simple YouTube</strong>
</p>

<p align="center">
  A browser extension that strips YouTube back down to a video player, a list of
  videos, and six icons.
</p>

---

> **Status: working build, loadable from source.** Chromium and Firefox, Manifest V3,
> no build step, no dependencies. Not yet submitted to any store.

---

## The problem

YouTube's current interface is not designed to help you watch a video. It is
designed to keep you on the site, and it is very good at that.

The modern home page is an engagement surface. Invidious, Shorts, and "For You"
feeds are injected into a page whose primary job is to be browsed rather than
watched. Around the video itself there are end-screen cards, autoplay of the next
video, a pause overlay that turns a pause into a menu, a "did you know" shelf, a
mix shelf, a shorts shelf, a shopping shelf, a row of a hundred topic categories
you did not ask for, promoted results dressed up as ordinary ones, and a comment
section that is, structurally, an argument.

None of this is a bug. Each piece is a deliberate, individually reasonable product
decision that adds up to one outcome: maximum time-on-site. The interface competes
with the video for attention, and it is winning.

The result is a site that feels exhausting to use and hard to leave, even when you
enjoy it. That is the part that seems worth fixing.

## What it does

An extension that makes YouTube look and behave like a competent video host, circa
the last time one existed — without pretending the modern site doesn't work.

Not a redesign. Not a theme. An **overhaul**: YouTube's own pages, YouTube's own
player, YouTube's own video URLs, with the interface around the video taken apart
and rebuilt around the video.

### The watch page

- The sidebar stays where it is, so the description and the video keep their usual relationship to it. It disappears only while the video is fullscreen, and comes straight back when you leave.
- No end screens, no pause overlay, no cards, no annotations, no merch or shopping panels.
- No autoplay of the next video. It uses YouTube's own switch, so the setting sticks.
- Comments are hidden, with a **Show** button in the place they would be.
- Subscribe sits against the profile picture instead of at the end of the row.

### The feed

- No topic category chips — not "All / Gaming / Music / Speedcubing / Steam", not any of them.
- No shelves, no mixes, no horizontally scrolling carousels.
- No promoted results, no in-feed ad slots, no shopping units.
- A plain vertical list of videos.

### The rail

YouTube's sidebar is replaced by six icons in a 56px strip that expands on hover or
keyboard focus: **Home, Shorts, Watch later, Subscriptions, History, Settings.**
Four of those six are finite chronological lists, which is the entire argument for
having them.

If you would rather have YouTube's real sidebar back, turn on *Use YouTube's own
sidebar* and the rail stands down.

### Ambient light

A glow sampled from the video, behind the player and washed over the page, in the
spirit of the old "cinematic mode" but tuned by you.

- **Intensity** 0–100, default 35
- **Spread** 0–400px, default 120
- **Saturation** 0–200%, default 120

Dark theme only. On the light theme the controls grey out and say why, because a
colour wash on white is just a stain.

The colour comes from three strategies in order: reading pixels off the `<video>`
element, then the video's thumbnail, then a stable colour derived from the video
ID. The first two can legitimately fail — YouTube serves video and thumbnails
cross-origin, so a canvas read can be blocked outright. The third always works.

### The Shorts budget

The one part of this that is a feature rather than a subtraction.

You get N shorts a day — 10 by default. When they are gone you get a walkout: a
procession of shorts marches off the screen and the rail's Shorts icon becomes a
padlock until local midnight. There is no close button, because a close button is
a loophole.

The budget counts one short per distinct video that actually starts playing, so
scrubbing back through the same one does not spend it. You can set a different
allowance for tomorrow, which applies for exactly one day and then reverts. The
ceiling and the counter are independent: raising the limit never erases what you
already watched today.

For testing, enter **55667** in the Shorts section of the settings panel — or in the
walkout itself — to unlock arbitrary limits.

### Themes

True black (`#000000`) by default, white as an option, or follow the system. On an
OLED panel true black is genuinely off pixels, which is also what lets the ambient
glow read as light rather than as a slightly lighter grey box.

## Principles

The rules a change is reviewed against. When a feature request and a principle
disagree, the principle wins and the request needs a better argument.

1. **The video is the interface.** The player, the title, the channel, the description.
2. **Finite pages beat infinite feeds.** No infinite scroll, no next-video autoplay, no
   end-screen cards. Reaching the bottom of a page is a feature.
3. **Remove by default, opt in explicitly.** The baseline is the simple state.
4. **Advertising is not a feature.** No promoted results, no shopping shelves, no in-feed ads.
5. **The site keeps working.** Accounts, subscriptions, playlists, history, captions,
   quality, keyboard shortcuts, PiP, downloads. Breaking one of those is a bug at
   crash severity.
6. **Accessibility is a floor.** Focus is preserved, shortcuts keep working, nothing a
   screen reader needs gets removed.
7. **No tracking, ever.** No telemetry, no remote config, no network calls. Settings live
   in `chrome.storage.local` and nowhere else.
8. **Reversible.** One switch in the settings panel turns everything off and YouTube
   comes back exactly as it was.

## Installing

There is no store release yet. Load it from source.

**Chromium** (Chrome, Edge, Brave, Arc)

1. Open `chrome://extensions`
2. Turn on **Developer mode**
3. **Load unpacked** → select this folder

**Firefox**

1. Open `about:debugging#/runtime/this-firefox`
2. **Load Temporary Add-on…** → pick `manifest.firefox.json`

Firefox temporary add-ons are cleared when the browser restarts; that is expected
until the add-on is signed.

## Settings

Everything lives in one schema, `src/lib/defaults.js`, which the content script, the
in-page panel, and the browser popup all read — so a setting can never behave
differently depending on where you opened it.

| Setting | Default | What it does |
| --- | --- | --- |
| Simple YouTube | on | Master switch. Off restores YouTube exactly. |
| Theme | Dark | True black, Light (white), or System. |
| Ambient light | on | Dark theme only. |
| — Intensity | 35 | 0–100. |
| — Spread | 120 | 0–400px. |
| — Saturation | 120 | 0–200%. |
| Shorts today | 10 | Daily allowance. The counter is separate. |
| Shorts tomorrow | same | One-day override, self-clearing. 0 means "same as today". |
| Use YouTube's own sidebar | off | Swaps the rail for the real guide. |
| Hide sidebar in fullscreen | on | The watch-page column is hidden while the video is fullscreen, and shown again after. |
| Comments | off | Hidden by default; a **Show** button sits where they would be, on the watch page. |
| Compact feed spacing | off | |
| Next-video autoplay | off | Uses YouTube's own switch so it persists. |
| End screens, pause overlay, cards | removed | |

## Privacy

The extension requests exactly one permission: `storage`. It has no accounts, no
analytics, no remote configuration, and no code that sends data anywhere. Settings
live in `chrome.storage.local` and nowhere else.

The one outbound request in the codebase is the ambient light sampler loading
`i.ytimg.com` for the current video's thumbnail — YouTube's own CDN, for an image
YouTube has already served you, and only when the ambient light is on. It is a
request for a picture, not a request that reports anything about you.

A tool for reducing manipulation is not credible if it is collecting data about you
in the background.

## Known gaps

Stated plainly, because a README that only lists strengths is marketing.

- **The DOM selectors are a standing liability.** They were verified against a real
  watch page in Brave, but YouTube renames things without notice, and each surface
  keeps its selector list in one array at the top of its file for exactly that
  reason. The related-video column has already been rebuilt out from under us once
  — see the roadmap.
- **The ambient colour usually comes from the fallback path.** Canvas reads of the
  video and the thumbnail are both cross-origin and get blocked, so in practice the
  hash-derived colour is doing most of the work. It is stable per video and never
  ugly, but it is not the video's actual dominant colour.
- **Firefox is untested** beyond loading the manifest. The code is the same and the
  manifest is mirrored, but nobody has clicked anything in it.
- **Playlists and Subscriptions** get the shared feed cleanup but no dedicated
  layout of their own yet. History has one; these do not.
- **Save has not made it into the "…" menu.** YouTube no longer exposes the
  `menuItems` API it used to, so Save sits in the action bar where YouTube put it.
  Nothing is lost; the tidy-up is just not done.

## Roadmap

Ordered by what is actually blocking someone, not by what is most fun to build.
Nothing here is promised; it is a statement of what the next passes are for.

### Now

- **A real logo.** The current mark in `icons/` is a placeholder: a play triangle
  and a rail, chosen because both survive being shrunk to 16px. It is generated
  from one geometry definition by `icons/build-icons.mjs` — edit the shapes there,
  re-run, and the SVG and all four PNGs update together. Chrome will not accept SVG
  for an extension icon, which is why the bitmaps exist at all.
- **Save into the "…" menu.** YouTube dropped the `menuItems` API this relied on.
  The remaining route is injecting a row into the menu popup when it opens, which is
  a worse bargain than the one it replaces: it means writing rows into YouTube's DOM
  and hoping the menu does not restyle. Only worth it if the action bar starts
  feeling genuinely unusable.
- **Firefox.** Load it, click every surface, find what breaks. The manifest is
  mirrored and the code is shared, so this is verification rather than porting.

### Next

- **Playlists and Subscriptions layouts.** History sets the pattern — chronological,
  finite, no shelf chrome. These are the two finite lists the rail still treats as
  ordinary feeds.
- **Selector resilience.** The related-video sidebar hid nothing for weeks because
  `#secondary` stopped existing and the videos became `yt-lockup-view-model`. The
  fix was to stop naming elements and start finding them by shape. That idea should
  be applied to the rest of the surfaces before YouTube renames the next one.
- **Real ambient colour.** Reading the video's actual pixels needs a same-origin
  frame or a permission the extension should not ask for. If there is a clean way,
  this is the setting people would screenshot.

### Later

- **Store packaging.** Icons are in place; screenshots, a store description, and a
  signed Firefox build are not.
- **Per-surface settings.** One schema is shared by the panel and the popup, but
  everything currently applies everywhere. A setting that only makes sense on the
  watch page should say so.

### Not planned

Listed so the absence reads as a decision rather than an oversight.

- **Infinite scroll, "For You" feeds, or autoplay of the next video.** Principle 2.
- **Telemetry, remote configuration, or sync.** Principle 7. Settings stay local.
- **Replacing the YouTube player.** The player stays YouTube's, including the parts
  that are good. The custom control bar is an overlay, never a reimplementation.
- **A redesign.** The pages stay YouTube's pages. Only the interface around the
  video is rebuilt.

## Project structure

```
manifest.json            Chromium (MV3)
manifest.firefox.json    Firefox delta -- keep in sync with the above
icons/                   Logo and generated PNGs (build-icons.mjs)
src/
  lib/defaults.js        The one settings schema
  lib/budget.js          Shorts budget, midnight rollover, cheat code
  core.js                Settings, SPA navigation, DOM helpers
  content.js             Entry point
  surfaces/              One module per page: guide, watch, shorts, channel, feed
  ui/                    Rail, settings panel, walkout
  ambient/               Colour extraction and the glow
  styles/                tokens, layout, surfaces
popup/                   Browser-toolbar mount point for the shared panel
```

## Development

No build step, no `npm install`, no dependencies. Edit a file, hit reload in
`chrome://extensions`, done.

Every content script is a plain script sharing a `window.SYT` global, because MV3
content scripts are not modules and there is no import graph to lean on. The UI
modules use shadow roots so YouTube's stylesheet cannot reach them and theirs
cannot leak out.

Two things worth knowing before you change anything:

- **Hiding is done with inline `display: none !important` from JS, not from the
  stylesheets.** Content-script CSS shares the page's author origin, so YouTube's
  own rules can out-specify ours no matter how they are written. Inline always wins.
  It is also why the master switch can genuinely restore the page: every hidden node
  carries `data-syt-hidden`, so turning it off hands them all back.
- **Do not reparent the player.** Hiding is safe; rewriting the DOM YouTube's own
  bindings hold references to is not.

## License

Copyright (c) 2026 Miles Allen. All rights reserved.

See [`LICENSE.txt`](./LICENSE.txt).
