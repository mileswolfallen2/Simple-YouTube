/**
 * The rail: six icons, collapsed to a 56px strip, expanding to 200px on hover or
 * keyboard focus. It replaces YouTube's sidebar rather than deleting navigation --
 * four of the six destinations are finite lists, which is the whole argument.
 *
 * It lives in a shadow root so YouTube's stylesheet cannot reach it and ours
 * cannot leak out, and it is position:fixed so expanding it never reflows the
 * page underneath.
 */
(() => {
  'use strict';

  const ICONS = window.SYT_ICONS;
  const CHEAT = window.SYT_BUDGET.CHEAT_CODE;

  const CSS = `
:host { all: initial; }
*, *::before, *::after { box-sizing: border-box; }

.rail {
  --w: 56px;
  --w-open: 200px;
  --bg: light-dark(#ffffff, #000000);
  --surface: light-dark(#f4f4f5, #0d0d0f);
  --line: light-dark(#e2e2e6, #1c1c20);
  --text: light-dark(#0b0b0d, #f4f4f7);
  --muted: light-dark(#5d5d63, #8e8e98);
  --accent: light-dark(#c8102e, #ff2d55);
  color-scheme: light dark;

  position: fixed;
  top: var(--syt-rail-top, var(--syt-masthead-h, 56px));
  left: 0;
  bottom: 0;
  width: var(--w);
  z-index: 40;
  font-family: "Roboto", "YouTube Sans", Arial, sans-serif;
  transition: width 160ms cubic-bezier(0.2, 0.8, 0.2, 1);
}
.rail:hover, .rail:focus-within { width: var(--w-open); }
.rail[data-theme="light"] { color-scheme: light; }
.rail[data-theme="dark"] { color-scheme: dark; }

.inner {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 6px;
  background: var(--bg);
  /* The right edge runs the full height of the rail so it meets the bar's
     underline cleanly instead of stopping short and leaving a notch. */
  border-right: 1px solid var(--line);
  border-top: 0;
  border-radius: 0;
  overflow: hidden;
}
@media (prefers-reduced-motion: reduce) { .rail { transition: none; } }

.item {
  display: flex;
  align-items: center;
  gap: 14px;
  height: 40px;
  padding: 0 10px;
  border-radius: 10px;
  color: var(--text);
  text-decoration: none;
  white-space: nowrap;
  cursor: pointer;
  border: 0;
  background: transparent;
  font: inherit;
  flex: 0 0 auto;
}
.item:hover, .item:focus-visible { background: var(--surface); }
.item:focus-visible { outline: 2px solid var(--accent); outline-offset: -2px; }
.item svg { width: 22px; height: 22px; flex: 0 0 auto; }
.item .label {
  font-size: 13px;
  font-weight: 500;
  opacity: 0;
  transform: translateX(-4px);
  transition: opacity 120ms ease, transform 120ms ease;
}
.rail:hover .item .label, .rail:focus-within .item .label { opacity: 1; transform: none; }
@media (prefers-reduced-motion: reduce) { .item .label { transition: none; } }

.item .badge {
  margin-left: auto;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  border-radius: 999px;
  background: var(--surface);
  color: var(--muted);
  font-size: 11px;
  font-weight: 600;
  line-height: 20px;
  text-align: center;
  font-variant-numeric: tabular-nums;
}
.item.locked { color: var(--muted); }
.item.locked .badge { background: color-mix(in srgb, var(--accent) 18%, transparent); color: var(--accent); }
.item.locked:hover { cursor: not-allowed; }

.spacer { flex: 1 1 auto; }

.item .cheat {
  width: 110px;
  padding: 4px 8px;
  border: 1px solid var(--line);
  border-radius: 7px;
  background: var(--bg);
  color: var(--text);
  font: inherit;
  font-size: 12px;
}
.item .cheat::placeholder { color: var(--muted); }

.panel-host { display: contents; }
.panel {
  position: fixed;
  left: 60px;
  bottom: 16px;
  width: 320px;
  max-height: min(76vh, 640px);
  overflow: auto;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: var(--bg);
  box-shadow: 0 18px 50px rgba(0, 0, 0, 0.4);
  z-index: 60;
}
.panel[hidden] { display: none; }
`;

  const ITEMS = [
    { id: 'home', icon: 'home', label: 'Home', href: '/' },
    { id: 'shorts', icon: 'shorts', label: 'Shorts', href: '/shorts' },
    { id: 'watchLater', icon: 'watchLater', label: 'Watch later', href: '/playlist?list=WL' },
    { id: 'subscriptions', icon: 'subscriptions', label: 'Subscriptions', href: '/feed/subscriptions' },
    { id: 'history', icon: 'history', label: 'History', href: '/feed/history' }
  ];

  function el(tag, props = {}, kids = []) {
    const node = Object.assign(document.createElement(tag), props);
    for (const kid of [].concat(kids)) if (kid) node.append(kid);
    return node;
  }

  let host = null;
  let root = null;
  let rail = null;
  let panelHost = null;
  let panel = null;
  let panelApi = null;

  function build() {
    host = document.createElement('div');
    host.id = 'syt-rail-host';
    root = host.attachShadow({ mode: 'open' });

    const style = el('style');
    style.textContent = CSS;

    rail = el('div', { className: 'rail' });
    const inner = el('div', { className: 'inner' });
    rail.append(inner);

    for (const item of ITEMS) {
      const a = el('a', { className: 'item', href: item.href });
      a.dataset.id = item.id;
      a.innerHTML = `${ICONS[item.icon]}<span class="label">${item.label}</span>`;
      a.addEventListener('click', (e) => {
        if (a.dataset.locked === '1') {
          e.preventDefault();
          showWalkout();
        }
      });
      inner.append(a);
    }

    inner.append(el('div', { className: 'spacer' }));

    const settingsBtn = el('button', { className: 'item', type: 'button' });
    settingsBtn.dataset.id = 'settings';
    settingsBtn.innerHTML = `${ICONS.settings}<span class="label">Settings</span>`;
    settingsBtn.addEventListener('click', togglePanel);
    inner.append(settingsBtn);

    panelHost = el('div');
    panel = el('div', { className: 'panel', hidden: true });
    panelHost.append(panel);
    rail.append(panelHost);

    root.append(style, rail);
    (document.body || document.documentElement).append(host);

    panelApi = window.SYT_PANEL.mount(panel);
  }

  function togglePanel() {
    if (!panel) return;
    const open = panel.hasAttribute('hidden');
    panel.toggleAttribute('hidden', !open);
    if (open && panelApi) panelApi.render();
  }

  function showWalkout() {
    window.dispatchEvent(new CustomEvent('syt:walkout'));
  }

  /** Swap an item's glyph without assuming the current one is still there. */
  function setIcon(item, svg) {
    const current = item.querySelector('svg');
    if (current) current.outerHTML = svg;
    else item.insertAdjacentHTML('afterbegin', svg);
  }

  /** Reflect settings + today's Shorts budget onto the icons. */
  async function sync() {
    if (!root) return;
    const stored = await chrome.storage.local.get(window.SYT_DEFAULTS);
    const settings = window.SYT_SETTINGS.resolve(stored);
    const budget = await window.SYT_BUDGET.read();

    rail.dataset.theme = settings.theme;
    host.style.display = settings.enabled && !settings.showGuide ? '' : 'none';
    if (host.style.display === 'none') return;

    const shorts = rail.querySelector('[data-id="shorts"]');
    // The rail built its own items a moment ago; if they are not there, we are
    // in a state we do not understand, and throwing from a storage listener
    // helps nobody. Try again on the next pass.
    if (!shorts) return;

    const left = window.SYT_BUDGET.remaining(budget);
    const spent = window.SYT_BUDGET.spent(budget);

    let badge = shorts.querySelector('.badge');
    if (!badge) {
      badge = el('span', { className: 'badge' });
      shorts.append(badge);
    }

    if (spent) {
      shorts.dataset.locked = '1';
      shorts.classList.add('locked');
      setIcon(shorts, ICONS.lock);
      badge.textContent = '0';
      shorts.setAttribute('aria-label', 'Shorts: none left today');
    } else {
      shorts.dataset.locked = '0';
      shorts.classList.remove('locked');
      setIcon(shorts, ICONS.shorts);
      badge.textContent = String(left);
      shorts.setAttribute('aria-label', `Shorts: ${left} left today`);
    }

    if (panelApi) panelApi.render();
  }

  function mount() {
    if (host || !document.body) return;
    build();
    sync();
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local') sync();
    });
    window.addEventListener('syt:shorts-changed', sync);
  }

  window.SYT_UI = window.SYT_UI || {};
  window.SYT_UI.rail = { mount, sync, openPanel: togglePanel, showWalkout, CHEAT };
})();
