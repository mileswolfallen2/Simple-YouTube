/** Inline SVG for the rail. Stroke-based, 24px grid, currentColor. */
(() => {
  'use strict';

  const svg = (paths, extra = '') =>
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${paths}</svg>`;

  window.SYT_ICONS = {
    home: svg('<path d="M3 10.5 12 3l9 7.5"/><path d="M5.5 9.5V20h13V9.5"/><path d="M9.5 20v-5.5h5V20"/>'),
    shorts: svg('<rect x="3" y="3" width="18" height="18" rx="4.5"/><path d="M10 8.8 15.2 12 10 15.2z" fill="currentColor" stroke="none"/><path d="M3.5 8h3M3.5 12h3M3.5 16h3"/>'),
    watchLater: svg('<circle cx="12" cy="12" r="8.6"/><path d="M12 7.6V12l3 1.8"/>'),
    subscriptions: svg('<path d="M4 8.5h16"/><path d="M6.5 12.5h11"/><path d="M9 16.5h6"/><path d="M10.5 4.5h3"/>'),
    history: svg('<path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1"/><path d="M3.2 4.2v4.2h4.2"/><path d="M12 7.8V12l3 1.8"/>'),
    settings: svg('<circle cx="12" cy="12" r="3"/><path d="M12 2.8v2.4M12 18.8v2.4M21.2 12h-2.4M5.2 12H2.8M18.5 5.5 16.7 7.3M7.3 16.7l-1.8 1.8M18.5 18.5l-1.8-1.8M7.3 7.3 5.5 5.5"/>'),
    lock: svg('<rect x="5" y="10.5" width="14" height="9.5" rx="2"/><path d="M8.2 10.5V8a3.8 3.8 0 0 1 7.6 0v2.5"/>')
  };
})();
