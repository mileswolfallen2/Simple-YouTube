/** Popup: read settings, render them, write changes back. No other logic here. */
(() => {
  'use strict';

  // Kept in sync with DEFAULTS in src/core.js. The popup is a separate document
  // and cannot reach the content script's global, so it carries its own copy.
  const DEFAULTS = {
    enabled: true,
    theme: 'system',
    showGuide: false,
    showRecommendations: false,
    disableAutoplay: true,
    removeDistractions: true,
    showComments: true,
    compact: false
  };

  const store = {
    async load() {
      const stored = await chrome.storage.local.get(DEFAULTS);
      return { ...DEFAULTS, ...stored };
    },
    set(patch) {
      return chrome.storage.local.set(patch);
    }
  };

  function render(settings) {
    document.documentElement.setAttribute('data-syt-theme', settings.theme);

    for (const input of document.querySelectorAll('input[type="checkbox"][data-setting]')) {
      input.checked = !!settings[input.dataset.setting];
    }

    for (const button of document.querySelectorAll('.segmented button[data-setting="theme"]')) {
      button.setAttribute('aria-checked', String(button.dataset.value === settings.theme));
    }
  }

  function wire() {
    document.getElementById('enabled').addEventListener('change', (event) => {
      store.set({ enabled: event.target.checked });
    });

    for (const input of document.querySelectorAll('input[type="checkbox"][data-setting]')) {
      input.addEventListener('change', (event) => {
        store.set({ [event.target.dataset.setting]: event.target.checked });
      });
    }

    for (const button of document.querySelectorAll('.segmented button[data-setting="theme"]')) {
      button.addEventListener('click', async () => {
        const theme = button.dataset.value;
        document.documentElement.setAttribute('data-syt-theme', theme);
        for (const sibling of document.querySelectorAll('.segmented button[data-setting="theme"]')) {
          sibling.setAttribute('aria-checked', String(sibling === button));
        }
        await store.set({ theme });
      });
    }
  }

  (async () => {
    render(await store.load());
    wire();
  })();
})();
