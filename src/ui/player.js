/**
 * Our own control bar for the watch-page player.
 *
 * ── what this is, and what it deliberately is not ────────────────────────────
 *
 * This replaces the *chrome* of the player, not the player. The <video> element,
 * the media session, the buffer, the DRM handshake and the caption pipeline all
 * stay exactly where they are, and every control here calls a method on YouTube's
 * own player object. We are driving their player, not reimplementing playback.
 *
 * That is a deliberate constraint, and it is the whole design. Rebuilding playback
 * means reimplementing, badly and incompletely: captions, quality ladders, PiP,
 * playback speed, buffering, live streams, resume points, keyboard shortcuts,
 * Media Session / OS media keys, and the last-position restore. Principle 5 says
 * breaking those is a bug at crash severity, so we do not touch them. Calling
 * setPlaybackRate() and getAvailableQualityLevels() instead means those features
 * keep working forever, even when YouTube changes them, because we never knew
 * about them.
 *
 * What we get for that trade: a control bar that can be shaped to the page, that
 * does not move when YouTube reorganises their markup, and that is not painted in
 * the middle of the ambient light.
 *
 * ── guard rails ─────────────────────────────────────────────────────────────
 *
 *   1. The bar is only mounted when #movie_player exposes a working player API.
 *      No API, no bar -- the stock controls stay and the video still plays.
 *   2. Every call into the player is wrapped. A method that is missing or throws
 *      disables its own control rather than taking the surface down with it.
 *   3. mount() returns an unbind function; boot() holds it and tears the whole
 *      thing down on the first page that is not a watch page, so it cannot be
 *      left orphaned over a different page after a YouTube SPA navigation.
 *   4. Shorts is untouched. ytd-reel-video-renderer runs its own separate player
 *      and this bar has nothing to say about it.
 */
(() => {
  'use strict';

  const { LOG, dom, settings, pageKind, register } = window.SYT;

  const HOST_ID = 'syt-player-bar';
  const HIDE_AFTER = 2600;

  /* The player object, or null. #movie_player is itself the API surface. */
  function player() {
    const el = dom.q('#movie_player');
    if (!el || typeof el.getPlayerState !== 'function') return null;
    return el;
  }

  /**
   * Call a player method without letting it break the bar.
   *
   * Every optional capability in here is one YouTube could remove, and a
   * throw inside a control would stop the surface before the rest of the bar was
   * even built. Report instead of propagate.
   */
  function call(p, method, ...args) {
    if (typeof p[method] !== 'function') {
      console.warn(LOG, `player: ${method}() unavailable, leaving YouTube's control in place`);
      return undefined;
    }
    try {
      return p[method](...args);
    } catch (err) {
      console.warn(LOG, `player: ${method}() threw`, err);
      return undefined;
    }
  }

  const fmt = (s) => {
    if (!isFinite(s) || s < 0) s = 0;
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = Math.floor(s % 60);
    return h
      ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
      : `${m}:${String(sec).padStart(2, '0')}`;
  };

  const CSS = `
    :host { position: absolute; inset: auto 0 0 0; z-index: 30; }
    .bar {
      display: flex; align-items: center; gap: 10px;
      padding: 10px 14px 12px;
      background: linear-gradient(transparent, rgba(0, 0, 0, 0.72) 55%);
      color: #fff;
      font: 500 13px/1.2 "Roboto","YouTube Sans",Arial,sans-serif;
      transition: opacity 200ms ease;
    }
    :host([hidden]) .bar { opacity: 0; pointer-events: none; }

    /* scrubber */
    .track {
      position: relative; flex: 1 1 auto; height: 18px;
      display: flex; align-items: center; cursor: pointer; touch-action: none;
    }
    .rail { position: relative; height: 4px; width: 100%; border-radius: 2px; background: rgba(255,255,255,.28); overflow: hidden; }
    .buffer { position: absolute; inset: 0 auto 0 0; background: rgba(255,255,255,.45); width: 0; }
    .played { position: absolute; inset: 0 auto 0 0; background: var(--syt-accent, #ff2d55); width: 0; }
    .knob {
      position: absolute; top: 50%; width: 13px; height: 13px; margin: -6.5px 0 0 -6.5px;
      border-radius: 50%; background: var(--syt-accent, #ff2d55);
      transform: scale(0); transition: transform 120ms ease;
    }
    .track:hover .knob, .track:focus-visible .knob { transform: scale(1); }
    .track:focus-visible { outline: 2px solid var(--syt-accent, #ff2d55); outline-offset: 4px; border-radius: 4px; }

    button {
      appearance: none; background: none; border: 0; padding: 0; cursor: pointer;
      color: inherit; display: grid; place-items: center; width: 34px; height: 34px;
      border-radius: 8px; font: inherit;
    }
    button:hover { background: rgba(255,255,255,.14); }
    button:focus-visible { outline: 2px solid #fff; outline-offset: -2px; }
    button[disabled] { opacity: .35; cursor: default; }
    button svg { width: 22px; height: 22px; }

    .time { font-variant-numeric: tabular-nums; white-space: nowrap; opacity: .9; }
    .spacer { flex: 0 0 4px; }
    .vol { width: 84px; accent-color: var(--syt-accent, #ff2d55); }

    /* menus */
    .menu {
      position: absolute; bottom: 52px; right: 14px; min-width: 176px;
      background: rgba(24, 24, 26, .97); border: 1px solid rgba(255,255,255,.14);
      border-radius: 10px; padding: 6px; display: none; flex-direction: column; gap: 2px;
    }
    .menu[data-open] { display: flex; }
    .menu button { width: 100%; height: 32px; justify-content: start; padding: 0 10px; border-radius: 6px; }
    .menu button[aria-checked="true"]::after { content: "✓"; margin-left: auto; opacity: .9; }

    .caption { font-weight: 700; font-size: 15px; }
  `;

  const ico = (paths) =>
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;

  const ICONS = {
    play: ico('<path d="M8 5.5 19 12 8 18.5z" fill="currentColor"/>'),
    pause: ico('<path d="M9 5.5v13M15 5.5v13" stroke-width="2.2"/>'),
    volume: ico('<path d="M4 9.5h3.2L12 5.6v12.8L7.2 14.5H4z" fill="currentColor"/><path d="M15.6 9.4a3.6 3.6 0 0 1 0 5.2M18.2 7a7 7 0 0 1 0 10"/>'),
    muted: ico('<path d="M4 9.5h3.2L12 5.6v12.8L7.2 14.5H4z" fill="currentColor"/><path d="m16.2 9.8 4.4 4.4M20.6 9.8l-4.4 4.4"/>'),
    gear: ico('<circle cx="12" cy="12" r="3"/><path d="M12 3v2.4M12 18.6V21M21 12h-2.4M5.4 12H3M18.4 5.6l-1.7 1.7M7.3 16.7l-1.7 1.7M18.4 18.4l-1.7-1.7M7.3 7.3 5.6 5.6"/>'),
    cc: ico('<rect x="2.8" y="5" width="18.4" height="14" rx="3"/><path d="M10 10.2a2.6 2.6 0 1 0 0 3.6M17.6 10.2a2.6 2.6 0 1 0 0 3.6"/>'),
    pip: ico('<rect x="2.8" y="4.5" width="18.4" height="15" rx="3"/><rect x="12.4" y="11.4" width="7" height="6" rx="1.4" fill="currentColor"/>'),
    expand: ico('<path d="M9 4.5H4.5V9M15 4.5h4.5V9M9 19.5H4.5V15M15 19.5h4.5V15"/>'),
    collapse: ico('<path d="M4.5 9H9V4.5M19.5 9H15V4.5M4.5 15H9v4.5M19.5 15H15v4.5"/>')
  };

  function build(p) {
    const host = document.createElement('div');
    host.id = HOST_ID;
    const shadow = host.attachShadow({ mode: 'open' });

    const style = document.createElement('style');
    style.textContent = CSS;

    const bar = document.createElement('div');
    bar.className = 'bar';

    // play/pause
    const playBtn = document.createElement('button');
    playBtn.type = 'button';
    playBtn.title = 'Play';
    playBtn.innerHTML = ICONS.play;

    // scrubber
    const track = document.createElement('div');
    track.className = 'track';
    track.setAttribute('role', 'slider');
    track.setAttribute('tabindex', '0');
    track.setAttribute('aria-label', 'Seek');
    track.innerHTML = '<div class="rail"><div class="buffer"></div><div class="played"></div></div><div class="knob"></div>';
    const played = track.querySelector('.played');
    const buffered = track.querySelector('.buffer');
    const knob = track.querySelector('.knob');

    const time = document.createElement('span');
    time.className = 'time';

    // volume
    const volBtn = document.createElement('button');
    volBtn.type = 'button';
    volBtn.title = 'Mute';
    volBtn.innerHTML = ICONS.volume;
    const vol = document.createElement('input');
    vol.className = 'vol';
    vol.type = 'range';
    vol.min = '0';
    vol.max = '100';
    vol.title = 'Volume';

    const capBtn = document.createElement('button');
    capBtn.type = 'button';
    capBtn.className = 'caption';
    capBtn.title = 'Subtitles';
    capBtn.textContent = 'CC';

    const pipBtn = document.createElement('button');
    pipBtn.type = 'button';
    pipBtn.title = 'Picture in picture';
    pipBtn.innerHTML = ICONS.pip;

    const fsBtn = document.createElement('button');
    fsBtn.type = 'button';
    fsBtn.title = 'Fullscreen';
    fsBtn.innerHTML = ICONS.expand;

    const gearBtn = document.createElement('button');
    gearBtn.type = 'button';
    gearBtn.title = 'Speed and quality';
    gearBtn.innerHTML = ICONS.gear;

    // menu
    const menu = document.createElement('div');
    menu.className = 'menu';

    bar.append(playBtn, track, time, volBtn, vol, document.createElement('span'), capBtn, pipBtn, gearBtn, fsBtn);
    shadow.append(style, bar, menu);

    // ── state ────────────────────────────────────────────────────────────────
    let scrubbing = false;
    let hideTimer = null;

    function sync() {
      const state = call(p, 'getPlayerState');
      // 1 = PLAYING, 3 = BUFFERING, 5 = VIDEO_CUED
      const playing = state === 1;
      playBtn.innerHTML = playing ? ICONS.pause : ICONS.play;
      playBtn.title = playing ? 'Pause' : 'Play';

      const dur = call(p, 'getDuration') || 0;
      const now = scrubbing ? Number(track.dataset.pos || 0) : call(p, 'getCurrentTime') || 0;
      const pct = dur ? Math.min(100, (now / dur) * 100) : 0;
      played.style.width = `${pct}%`;
      knob.style.left = `${pct}%`;

      const loaded = call(p, 'getVideoLoadedFraction') || 0;
      buffered.style.width = `${Math.min(100, loaded * 100)}%`;

      time.textContent = dur ? `${fmt(now)} / ${fmt(dur)}` : fmt(now);
      track.setAttribute('aria-valuemin', '0');
      track.setAttribute('aria-valuemax', String(Math.round(dur)));
      track.setAttribute('aria-valuenow', String(Math.round(now)));
      track.setAttribute('aria-valuetext', `${fmt(now)} of ${fmt(dur)}`);

      const muted = call(p, 'isMuted');
      volBtn.innerHTML = muted ? ICONS.muted : ICONS.volume;
      volBtn.title = muted ? 'Unmute' : 'Mute';
      const v = call(p, 'getVolume');
      if (isFinite(v)) vol.value = String(Math.round(v * 100));

      // Fullscreen is a document-level fact, not a player one.
      const fs = document.fullscreenElement || document.webkitFullscreenElement;
      fsBtn.innerHTML = fs ? ICONS.collapse : ICONS.expand;
      fsBtn.title = fs ? 'Exit fullscreen' : 'Fullscreen';

      const hasVideo = typeof p.getVideoData === 'function';
      if (hasVideo) {
        const vd = call(p, 'getVideoData') || {};
        const caps = Array.isArray(vd.captions) ? vd.captions : [];
        capBtn.disabled = caps.length === 0;
      }
    }

    // ── behaviour ────────────────────────────────────────────────────────────
    playBtn.addEventListener('click', () => {
      if (call(p, 'getPlayerState') === 1) call(p, 'pauseVideo');
      else call(p, 'playVideo');
      sync();
    });

    function seekFromEvent(ev) {
      const r = track.getBoundingClientRect();
      const ratio = Math.min(1, Math.max(0, (ev.clientX - r.left) / r.width));
      const dur = call(p, 'getDuration') || 0;
      if (!dur) return;
      const pos = ratio * dur;
      track.dataset.pos = String(pos);
      played.style.width = `${ratio * 100}%`;
      knob.style.left = `${ratio * 100}%`;
      time.textContent = `${fmt(pos)} / ${fmt(dur)}`;
    }

    track.addEventListener('pointerdown', (ev) => {
      scrubbing = true;
      track.setPointerCapture(ev.pointerId);
      seekFromEvent(ev);
    });
    track.addEventListener('pointermove', (ev) => scrubbing && seekFromEvent(ev));
    const endScrub = (ev) => {
      if (!scrubbing) return;
      scrubbing = false;
      try { track.releasePointerCapture(ev.pointerId); } catch { /* already released */ }
      call(p, 'seekTo', Number(track.dataset.pos || 0), true);
    };
    track.addEventListener('pointerup', endScrub);
    track.addEventListener('pointercancel', endScrub);

    // Keyboard on the scrubber, because a slider you can only drag is not a slider.
    track.addEventListener('keydown', (ev) => {
      const dur = call(p, 'getDuration') || 0;
      if (!dur) return;
      const now = call(p, 'getCurrentTime') || 0;
      const step = ev.shiftKey ? 30 : 5;
      const to = { ArrowRight: now + step, ArrowLeft: now - step, Home: 0, End: dur - 0.5 }[ev.key];
      if (to === undefined) return;
      ev.preventDefault();
      call(p, 'seekTo', Math.min(dur, Math.max(0, to)), true);
      sync();
    });

    volBtn.addEventListener('click', () => {
      if (call(p, 'isMuted')) call(p, 'unMute');
      else call(p, 'mute');
      sync();
    });
    vol.addEventListener('input', () => {
      call(p, 'setVolume', Number(vol.value) / 100);
      call(p, 'unMute');
    });

    capBtn.addEventListener('click', () => {
      call(p, 'setOption', 'captions', 'track');
      call(p, 'toggleCaptions');
    });

    pipBtn.addEventListener('click', () => {
      // Defer by a task: the PiP spec rejects a request made during a user
      // gesture that the browser does not consider user-initiated, and ours is
      // dispatched from a listener inside our own shadow tree.
      setTimeout(() => {
        const v = dom.q('#movie_player video');
        if (v && v.requestPictureInPicture) v.requestPictureInPicture().catch((e) => console.warn(LOG, 'player: PiP refused', e.message));
        else call(p, 'togglePictureInPicture');
      }, 0);
    });

    fsBtn.addEventListener('click', () => {
      const fs = document.fullscreenElement || document.webkitFullscreenElement;
      if (fs) {
        (document.exitFullscreen || document.webkitExitFullscreen).call(document);
      } else {
        const el = dom.q('#movie_player');
        const req = el.requestFullscreen || el.webkitRequestFullscreen;
        if (req) req.call(el);
      }
    });

    // speed + quality, read straight off the player
    function buildMenu() {
      menu.textContent = '';
      const rates = call(p, 'getAvailablePlaybackRates');
      const levels = call(p, 'getAvailableQualityLevels');
      const current = call(p, 'getPlaybackQuality');

      if (Array.isArray(rates) && rates.length) {
        const head = document.createElement('div');
        head.style.cssText = 'padding:4px 10px;font-size:11px;opacity:.6;text-transform:uppercase;letter-spacing:.06em';
        head.textContent = 'Speed';
        menu.append(head);
        for (const r of rates) {
          const b = document.createElement('button');
          b.type = 'button';
          b.textContent = r === 1 ? 'Normal' : `${r}×`;
          b.setAttribute('aria-checked', String((call(p, 'getPlaybackRate') || 1) === r));
          b.addEventListener('click', () => {
            call(p, 'setPlaybackRate', r);
            buildMenu();
            sync();
          });
          menu.append(b);
        }
      }

      if (Array.isArray(levels) && levels.length) {
        const head = document.createElement('div');
        head.style.cssText = 'padding:8px 10px 4px;font-size:11px;opacity:.6;text-transform:uppercase;letter-spacing:.06em';
        head.textContent = 'Quality';
        menu.append(head);
        for (const q of levels) {
          const b = document.createElement('button');
          b.type = 'button';
          b.textContent = q;
          b.setAttribute('aria-checked', String(current === q));
          b.addEventListener('click', () => {
            call(p, 'setPlaybackQuality', q);
            buildMenu();
          });
          menu.append(b);
        }
      }
    }

    gearBtn.addEventListener('click', () => {
      if (menu.hasAttribute('data-open')) {
        menu.removeAttribute('data-open');
      } else {
        buildMenu();
        menu.setAttribute('data-open', '');
      }
      show();
    });
    document.addEventListener('click', (ev) => {
      if (menu.hasAttribute('data-open') && !menu.contains(ev.target) && !gearBtn.contains(ev.target)) {
        menu.removeAttribute('data-open');
      }
    });
    track.addEventListener('pointerdown', () => menu.removeAttribute('data-open'));

    // auto-hide, the way a player is supposed to behave
    function show() {
      host.removeAttribute('hidden');
      if (hideTimer) clearTimeout(hideTimer);
      hideTimer = setTimeout(() => {
        const state = call(p, 'getPlayerState');
        // Do not hide mid-pause: you cannot find the pause button if it leaves.
        if (state !== 1 && !menu.hasAttribute('data-open')) return;
        host.setAttribute('hidden', '');
      }, HIDE_AFTER);
    }
    const playerEl = dom.q('#movie_player');
    for (const ev of ['mousemove', 'pointermove', 'focusin']) {
      playerEl?.addEventListener(ev, show);
    }
    bar.addEventListener('pointerenter', show);
    show();

    const tick = setInterval(sync, 250);
    sync();

    return {
      el: host,
      unbind() {
        clearInterval(tick);
        if (hideTimer) clearTimeout(hideTimer);
        host.remove();
      }
    };
  }

  function mount() {
    if (pageKind() !== 'watch') return;
    if (!player()) return;
    if (document.getElementById(HOST_ID)) return;
    const built = build(player());
    if (!built) return;
    // Appended to <body>, not to #movie_player: the player is a Web Component and
    // appending a light-DOM child to one puts it in the wrong place, and it is
    // re-created on every video anyway.
    document.body.append(built.el);
    // Sit above the ambient veil, which is now at the top of the stack.
    built.el.style.zIndex = '2147483001';
    console.info(LOG, 'player: our control bar is up');
  }

  function unmount() {
    const host = document.getElementById(HOST_ID);
    if (host) {
      host.remove();
      console.info(LOG, 'player: control bar removed');
    }
  }

  /*
   * Registered with no selectors so this runs on every page, in both directions.
   *
   * Gating on ytd-watch-flexy would mean the surface stops running the moment you
   * leave a watch page -- and a bar that only mounts and never unmounts follows
   * you to the home page, sitting over a page with no video on it. Checking
   * pageKind here and tearing down in the same pass is what makes it a
   * control bar rather than a stray element with a 250ms interval still running.
   */
  function reconcile() {
    if (settings.enabled && pageKind() === 'watch' && player()) mount();
    else unmount();
  }

  register('player', [], reconcile);
})();
