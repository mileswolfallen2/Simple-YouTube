<p align="center">
  <strong>Simple YouTube</strong>
</p>

<p align="center">
  A browser extension that strips YouTube back down to a video player and a list of videos.
</p>

---

> **Status: pre-implementation.** There is no extension code in this repository yet.
> This document describes what Simple YouTube is, what it stands for, and where it is
> headed. Nothing here is a feature list for software that exists.

---

## The problem

YouTube's current interface is not designed to help you watch a video. It is designed to
keep you on the site, and it is very good at that.

The modern YouTube home page is an engagement surface. Invidious, Shorts, and "For You"
feeds are injected into a page whose primary job is to be browsed rather than watched.
Around the video itself there are end-screen cards, autoplay of the next video, a pause
overlay that turns a pause into a menu, a "did you know" shelf, a mix shelf, a
shorts shelf, a shopping shelf, promoted results dressed up as ordinary ones, a
notification bell, a "don't miss" strip, and a comment section that is, structurally,
an argument.

None of this is a bug. Each piece is a deliberate, individually reasonable product
decision that adds up to one outcome: maximum time-on-site. The interface competes with
the video for attention, and it is winning.

The result is a site that feels exhausting to use and hard to leave, even when you
enjoy it. That is the part that seems worth fixing.

## What Simple YouTube is

An extension that makes YouTube look and behave like a competent video host, circa the
last time one existed, without pretending the modern site doesn't work.

Not a redesign. Not a theme. An **overhaul**: YouTube's own pages, YouTube's own player,
YouTube's own video URLs, with the interface around the video taken apart and rebuilt
around the video.

## Principles

These are the rules we design against. When a feature request and a principle
disagree, the principle wins and the request needs a better argument.

1. **The video is the interface.** The player, the title, the channel, and the
   description are the page. Everything else is secondary and should look it.

2. **Finite pages beat infinite feeds.** A home page you reach the bottom of is a
   home page you can leave. A feed with no end has no natural stopping point, and
   that is the whole mechanism. No infinite scroll. No autoplay of what comes next.
   No "up next" overlays on the pause screen.

3. **Remove by default, opt in explicitly.** The extension's baseline state is the
   simple one. A person who wants a shelf back can turn that shelf back on. We do not
   ship a module that only makes things busier.

4. **Advertising is not a feature.** No promoted results, no shopping shelves, no
   in-feed ad slots, no masthead units, no "sponsored" videos styled to look organic.
   Pre-roll and mid-roll are the platform's business; the UI around them is ours.

5. **The site keeps working.** This is a layer over YouTube, not a replacement for
   it. Accounts, subscriptions, playlists, history, likes, downloads, captions,
   quality settings, keyboard shortcuts, Picture-in-Picture, and offline playback
   all continue to work. If Simple YouTube breaks a feature, that is a bug with the
   same severity as a crash.

6. **Accessibility is a floor, not a feature.** Focus must remain where it was.
   Keyboard shortcuts must keep working. Nothing may be removed that a screen reader
   user needs in order to operate the page.

7. **No tracking, ever.** No accounts, no analytics, no telemetry, no remote config.
   Settings live in `chrome.storage.local` and nowhere else. The extension makes no
   network requests of its own. A tool for reducing manipulation is not credible if
   it is collecting data about you in the background.

8. **Reversible.** One switch turns the extension off and YouTube comes back exactly
   as it was. The extension holds no state that outlives its own state.

## What it leaves alone

- **The video.** Codecs, quality ladder, HDR, playback speed, captions, transcript.
- **The player controls.** The `ytp-*` control bar is YouTube's and works well.
- **Your account.** Sign-in, subscriptions, watch history, likes, playlists.
- **URLs.** A Simple YouTube video link is a `youtube.com/watch?v=…` link. Bookmarks
  and links shared with other people keep working, forever, with or without us.

## Where it is headed

A rough ordering, not a commitment. The first milestone is the watch page.

| Stage | Scope |
| --- | --- |
| 1 | Watch page. Kill the end screens, the pause overlay, the recommendation sidebar, and autoplay. Make the player the page. |
| 2 | Home page. Remove Shorts, remove "For You," remove the mix and the shelves, remove the in-feed ad slots. What remains is a list of videos. |
| 3 | Search and channel pages. Kill the sidebar, the filter carousel, and the promoted results. |
| 4 | Subscriptions, playlists, and history. A plain chronological list, not a recommendation engine wearing a list's clothes. |
| 5 | Settings. A small, real settings surface for the things a person might legitimately want back. |

Where the platform ships something genuinely better, we will use it. Where it ships
something that only serves the engagement metric, we will not.

## Installing

**Not available yet.** There is no release, and no build to install.

The source is published for review and study. It is not published for redistribution:
the project is currently under the Diskette Labs Temporary Development License, which
grants viewing and inspection rights and reserves modification, forking, and
redistribution. See [`LICENSE.txt`](./LICENSE.txt).

When a build is released, it will be installable from the Chrome Web Store and from
Firefox Add-ons. Until then, see [`CONTRIBUTING.md`](./CONTRIBUTING.md) for how to run
it locally from source.

## Contributing

Read [`CONTRIBUTING.md`](./CONTRIBUTING.md). It covers the project's governance and
contributor permissions, the technical constraints that come with modifying a page
you do not own, and the code conventions.

If you want to help and you are not sure how, the most useful thing you can do is
report a specific piece of clutter with a link to the page and the browser you saw it
on. That is genuinely hard to come by, and it directly determines what gets built.

## Project

- **Organization:** Diskette Labs — https://diskettelabs.com/
- **GitHub:** https://github.com/diskettelabs
- **Contact:** hello@diskettelabs.com
- **Project Heads:** Miles Wolf Allen (Development), Owen VanVooren (Design)

## License

Copyright (c) 2026 Diskette Labs. All rights reserved.

Released under the Diskette Labs Temporary Development License. View, inspect, study,
and run the source; do not modify, fork, redistribute, or relicense it without
permission. Diskette Labs intends to release a future version under an open-source
license, and that release will not retroactively change the terms of this one.

Full text in [`LICENSE.txt`](./LICENSE.txt). Governance and contributor permissions in
[`CONTRIBUTING.md`](./CONTRIBUTING.md).
