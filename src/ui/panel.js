/**
 * The settings panel, mounted in two places: inside the rail in the page, and as
 * the whole browser-toolbar popup. Same renderer, same shadow root, same CSS --
 * so a setting can never look or behave differently depending on where you
 * opened it from.
 *
 * Deliberately standalone: it reads window.SYT_SETTINGS and window.SYT_BUDGET and
 * nothing else, because the popup has no access to the content script's globals.
 */
(() => {
  'use strict';

  const { DEFAULTS } = window.SYT_SETTINGS;
  const CHEAT = window.SYT_BUDGET.CHEAT_CODE;

  const CSS = `
:host { all: initial; }
*, *::before, *::after { box-sizing: border-box; }

.root {
  --bg: light-dark(#ffffff, #000000);
  --surface: light-dark(#f4f4f5, #0d0d0f);
  --elevated: light-dark(#ebebed, #16161a);
  --line: light-dark(#e2e2e6, #212127);
  --text: light-dark(#0b0b0d, #f4f4f7);
  --muted: light-dark(#5d5d63, #8e8e98);
  --accent: light-dark(#c8102e, #ff2d55);
  color-scheme: light dark;

  font-family: "Roboto", "YouTube Sans", Arial, sans-serif;
  font-size: 13px;
  line-height: 1.45;
  color: var(--text);
  background: var(--bg);
  width: 100%;
  min-width: 260px;
}
.root[data-theme="light"] { color-scheme: light; }
.root[data-theme="dark"] { color-scheme: dark; }

header {
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  padding: 12px 14px; border-bottom: 1px solid var(--line);
}
h1 { margin: 0; font-size: 14px; font-weight: 700; letter-spacing: -0.01em; }
h2 {
  margin: 0 0 10px; font-size: 11px; font-weight: 600; text-transform: uppercase;
  letter-spacing: 0.07em; color: var(--muted);
}
.group { padding: 14px; border-bottom: 1px solid var(--line); }
.group:last-of-type { border-bottom: 0; }
.note { margin: 0 0 10px; color: var(--muted); font-size: 11.5px; }
.note.locked { color: var(--accent); }

/* master on/off */
.master { display: flex; align-items: center; gap: 10px; cursor: pointer; }
.master input { position: absolute; opacity: 0; pointer-events: none; }
.master .track {
  position: relative; width: 38px; height: 22px; border-radius: 999px;
  background: var(--line); transition: background 140ms ease; flex: 0 0 auto;
}
.master .track::after {
  content: ""; position: absolute; top: 2px; left: 2px; width: 18px; height: 18px;
  border-radius: 50%; background: #fff; transition: transform 140ms ease;
}
.master input:checked + .track { background: var(--accent); }
.master input:checked + .track::after { transform: translateX(16px); }
.master input:focus-visible + .track { outline: 2px solid var(--accent); outline-offset: 2px; }

/* rows */
.row { display: flex; align-items: center; gap: 10px; padding: 7px 0; cursor: pointer; }
.row > span { flex: 1 1 auto; }
.row.disabled { opacity: 0.4; cursor: not-allowed; }
input[type="checkbox"] {
  appearance: none; flex: 0 0 auto; width: 17px; height: 17px; margin: 0;
  border: 1px solid var(--line); border-radius: 5px; background: var(--surface);
  cursor: pointer; position: relative;
}
input[type="checkbox"]:checked { background: var(--accent); border-color: var(--accent); }
input[type="checkbox"]:checked::after {
  content: ""; position: absolute; left: 5.5px; top: 2px; width: 4px; height: 9px;
  border: solid #fff; border-width: 0 2px 2px 0; transform: rotate(45deg);
}
input[type="checkbox"]:focus-visible, button:focus-visible, input:focus-visible {
  outline: 2px solid var(--accent); outline-offset: 2px;
}

/* segmented */
.segmented {
  display: grid; grid-auto-flow: column; grid-auto-columns: 1fr; gap: 2px;
  padding: 2px; background: var(--elevated); border-radius: 9px;
}
.segmented button {
  padding: 7px 4px; border: 0; border-radius: 7px; background: transparent;
  color: var(--muted); font: inherit; font-weight: 500; cursor: pointer;
}
.segmented button:hover { color: var(--text); }
.segmented button[aria-checked="true"] {
  background: var(--bg); color: var(--text); box-shadow: 0 1px 2px rgba(0,0,0,.14);
}

/* sliders */
.slider { padding: 8px 0; }
.slider header { padding: 0; border: 0; display: block; }
.slider .label { display: flex; justify-content: space-between; gap: 8px; margin-bottom: 6px; }
.slider .value { color: var(--muted); font-variant-numeric: tabular-nums; }
.slider.dim { opacity: 0.4; }
input[type="range"] {
  appearance: none; width: 100%; height: 4px; border-radius: 999px;
  background: var(--line); cursor: pointer;
}
input[type="range"]::-webkit-slider-thumb {
  appearance: none; width: 15px; height: 15px; border-radius: 50%;
  background: var(--text); border: 0; cursor: pointer;
}
input[type="range"]::-moz-range-thumb {
  width: 15px; height: 15px; border-radius: 50%; background: var(--text); border: 0;
}

/* number + cheat */
.field { display: flex; align-items: center; gap: 8px; padding: 6px 0; }
.field label { flex: 1 1 auto; color: var(--muted); }
input[type="number"], input[type="text"] {
  width: 76px; padding: 6px 8px; border: 1px solid var(--line); border-radius: 8px;
  background: var(--surface); color: var(--text); font: inherit;
  font-variant-numeric: tabular-nums; text-align: right;
}
input[type="text"] { text-align: left; }
.cheat { display: flex; gap: 8px; padding-top: 8px; }
.cheat input[type="text"] { flex: 1 1 auto; width: auto; }
button.action {
  padding: 7px 12px; border: 1px solid var(--line); border-radius: 8px;
  background: var(--elevated); color: var(--text); font: inherit; font-weight: 500;
  cursor: pointer; white-space: nowrap;
}
button.action:hover { border-color: var(--muted); }
button.action.primary { background: var(--accent); border-color: var(--accent); color: #fff; }
.meter {
  height: 4px; border-radius: 999px; background: var(--line); overflow: hidden;
  margin: 2px 0 10px;
}
.meter i { display: block; height: 100%; background: var(--accent); }

footer { padding: 12px 14px; color: var(--muted); font-size: 11px; }

@media (prefers-reduced-motion: reduce) {
  .master .track, .master .track::after { transition: none; }
}
`;

  const AMBIENT_SLIDERS = [
    { key: 'ambientIntensity', label: 'Intensity', min: 0, max: 100, step: 1, unit: '%' },
    { key: 'ambientSpread', label: 'Spread', min: 0, max: 400, step: 5, unit: 'px' },
    { key: 'ambientSaturation', label: 'Saturation', min: 0, max: 200, step: 5, unit: '%' }
  ];

  function el(tag, props = {}, kids = []) {
    const node = Object.assign(document.createElement(tag), props);
    for (const kid of [].concat(kids)) node.append(kid);
    return node;
  }

  function mount(host) {
    if (host.shadowRoot) return;
    const root = host.attachShadow({ mode: 'open' });
    const style = el('style');
    style.textContent = CSS;
    const app = el('div', { className: 'root' });
    root.append(style, app);

    let settings = { ...DEFAULTS };

    /* ── render ─────────────────────────────────────────────── */

    function render() {
      const dark = settings.theme !== 'light';
      const ambientOff = !dark || !settings.ambient;
      app.dataset.theme = settings.theme;
      app.replaceChildren();

      /* master */
      const master = el('label', { className: 'master' });
      const masterInput = el('input', { type: 'checkbox' });
      masterInput.checked = settings.enabled;
      masterInput.addEventListener('change', () => commit({ enabled: masterInput.checked }, render));
      master.append(masterInput, el('span', { className: 'track' }), el('span', { textContent: 'Simple YouTube' }));
      const head = el('header', {}, [el('h1', { textContent: 'Simple YouTube' }), master]);
      app.append(head);

      if (!settings.enabled) {
        app.append(
          el('div', { className: 'group' }, [
            el('p', {
              className: 'note',
              textContent: 'Simple YouTube is off. YouTube is exactly as it came.'
            })
          ])
        );
        return;
      }

      /* theme */
      const themeGroup = el('div', { className: 'group' }, [el('h2', { textContent: 'Theme' })]);
      const seg = el('div', { className: 'segmented', role: 'radiogroup' });
      for (const [value, label] of [['dark', 'Dark'], ['light', 'Light'], ['system', 'System']]) {
        const b = el('button', { type: 'button', role: 'radio', textContent: label });
        b.setAttribute('aria-checked', String(settings.theme === value));
        b.addEventListener('click', () => commit({ theme: value }, render));
        seg.append(b);
      }
      themeGroup.append(seg);
      app.append(themeGroup);

      /* ambient */
      const ambient = el('div', { className: 'group' }, [el('h2', { textContent: 'Ambient light' })]);
      ambient.append(
        el('p', {
          className: dark ? 'note' : 'note locked',
          textContent: dark
            ? 'A glow sampled from the video, behind the player. Dark theme only.'
            : 'Ambient light needs the dark theme. Switch to Dark or System to use it.'
        })
      );

      const ambientRow = el('label', { className: dark ? 'row' : 'row disabled' });
      const ambientInput = el('input', { type: 'checkbox' });
      ambientInput.checked = !!settings.ambient;
      ambientInput.disabled = !dark;
      ambientInput.addEventListener('change', () => commit({ ambient: ambientInput.checked }, render));
      ambientRow.append(ambientInput, el('span', { textContent: 'Ambient light' }));
      ambient.append(ambientRow);

      for (const spec of AMBIENT_SLIDERS) {
        const wrap = el('div', { className: ambientOff ? 'slider dim' : 'slider' });
        const value = el('span', { className: 'value', textContent: `${settings[spec.key]}${spec.unit}` });
        const range = el('input', { type: 'range', min: spec.min, max: spec.max, step: spec.step });
        range.value = settings[spec.key];
        range.disabled = ambientOff;
        range.addEventListener('input', () => {
          value.textContent = `${range.value}${spec.unit}`;
        });
        range.addEventListener('change', () => commit({ [spec.key]: Number(range.value) }, null));
        wrap.append(
          el('div', { className: 'label' }, [el('span', { textContent: spec.label }), value]),
          range
        );
        ambient.append(wrap);
      }
      app.append(ambient);

      /* shorts */
      const limit = window.SYT_BUDGET.limit(settings);
      const left = window.SYT_BUDGET.remaining(settings);
      const shorts = el('div', { className: 'group' }, [el('h2', { textContent: 'Shorts' })]);

      const meter = el('div', { className: 'meter' });
      const fill = el('i');
      fill.style.width = `${limit ? Math.min(100, (left / limit) * 100) : 0}%`;
      meter.append(fill);
      shorts.append(el('p', { className: 'note', textContent: `${left} of ${limit} left today.` }), meter);

      // The limit is a ceiling and the counter is a fact about today; they stay
      // independent, so raising the limit cannot erase what you already watched.
      // "Reset used" below is the only thing that touches the counter.
      shorts.append(numberField('Today', settings.shortsLimit, (v) => commit({ shortsLimit: v }, render)));
      shorts.append(numberField('Tomorrow', settings.shortsLimitTomorrow, (v) => commit({ shortsLimitTomorrow: v }, render)));

      const reset = el('button', { className: 'action', type: 'button', textContent: 'Reset used' });
      reset.addEventListener('click', () => commit({ shortsUsed: 0 }, render));
      shorts.append(el('div', { className: 'field' }, [el('label', { textContent: 'Counted so far' }), reset]));

      if (!settings.cheatUnlocked) {
        const input = el('input', { type: 'text', placeholder: 'code', maxLength: 6 });
        const go = el('button', { className: 'action', type: 'button', textContent: 'Unlock' });
        const tryUnlock = async () => {
          if (await window.SYT_BUDGET.unlockCheat(input.value)) commit({ cheatUnlocked: true }, render);
          else input.value = '';
        };
        go.addEventListener('click', tryUnlock);
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') tryUnlock();
        });
        shorts.append(
          el('p', { className: 'note', textContent: 'Testing the limit? Enter the code to set it to anything.' }),
          el('div', { className: 'cheat' }, [input, go])
        );
      } else {
        shorts.append(
          el('p', { className: 'note', textContent: `Test mode on. Today is set to ${settings.shortsLimit}, tomorrow ${settings.shortsLimitTomorrow || settings.shortsLimit}.` })
        );
      }
      app.append(shorts);

      /* page + playback */
      const page = el('div', { className: 'group' }, [el('h2', { textContent: 'Page' })]);
      for (const [key, label] of [
        ['showGuide', 'Use YouTube\u2019s own sidebar'],
        ['showRecommendations', 'Recommended videos on the watch page'],
        ['showComments', 'Comments'],
        ['compact', 'Compact feed spacing']
      ]) {
        page.append(switchRow(key, label, render));
      }
      app.append(page);

      const playback = el('div', { className: 'group' }, [el('h2', { textContent: 'Playback' })]);
      for (const [key, label] of [
        ['disableAutoplay', 'Turn off next-video autoplay'],
        ['removeDistractions', 'Remove end screens, pause overlay, cards']
      ]) {
        playback.append(switchRow(key, label, render));
      }
      app.append(playback);

      app.append(
        el('footer', {
          textContent: 'Nothing leaves your browser. No accounts, no analytics, no network calls.'
        })
      );
    }

    function numberField(label, value, onCommit) {
      const input = el('input', { type: 'number', min: 0, max: 9999 });
      input.value = value;
      const done = () => onCommit(Math.max(0, Math.floor(Number(input.value) || 0)));
      input.addEventListener('change', done);
      return el('div', { className: 'field' }, [el('label', { textContent: label }), input]);
    }

    function switchRow(key, label, rerender) {
      const row = el('label', { className: 'row' });
      const input = el('input', { type: 'checkbox' });
      input.checked = !!settings[key];
      input.addEventListener('change', () => commit({ [key]: input.checked }, rerender));
      row.append(input, el('span', { textContent: label }));
      return row;
    }

    async function commit(patch, rerender) {
      await chrome.storage.local.set(patch);
      // Always re-read rather than patching a local copy: the budget rolls over
      // on its own schedule, and a panel showing yesterday's counter is worse
      // than no panel.
      const stored = await chrome.storage.local.get(DEFAULTS);
      settings = window.SYT_SETTINGS.resolve(stored);
      if (rerender) rerender();
    }

    chrome.storage.local.get(DEFAULTS).then((stored) => {
      settings = window.SYT_SETTINGS.resolve(stored);
      render();
    });

    return { render };
  }

  window.SYT_PANEL = { mount, CHEAT };
})();
