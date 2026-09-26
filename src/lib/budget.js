/**
 * The Shorts budget.
 *
 * You get N shorts a day. When they are gone you get a walkout and a locked
 * icon until local midnight. The ceiling is a ceiling, not a suggestion, so
 * there is no "are you sure" and no re-arm button -- the only way past it is the
 * clock, or the test cheat code.
 *
 * Loaded in the content script and the panel, so it touches nothing but
 * chrome.storage.local and the local date.
 */
(() => {
  'use strict';

  const { DEFAULTS } = window.SYT_SETTINGS;
  const CHEAT_CODE = '55667';

  function today() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  function tomorrow() {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  function effectiveLimit(settings, day) {
    if (day === tomorrow() && settings.shortsLimitTomorrow > 0) return settings.shortsLimitTomorrow;
    return settings.shortsLimit;
  }

  /**
   * Roll the counters over if the stored day is not today. Tomorrow's allowance
   * applies for exactly one day and then falls back to the standing limit.
   */
  function rollover(settings) {
    const day = today();
    if (settings.shortsDay === day) return { changed: false, settings };

    const patch = { shortsDay: day, shortsUsed: 0 };
    if (settings.shortsDay && settings.shortsDay < day) {
      // A stored day from before today means yesterday's session ended; today's
      // limit is whatever the user set, plus the one-day override if they set one.
      if (settings.shortsLimitTomorrow > 0) patch.shortsLimitTomorrow = 0;
    }
    return { changed: true, settings: { ...settings, ...patch } };
  }

  const budget = {
    CHEAT_CODE,

    async read() {
      const stored = await chrome.storage.local.get(DEFAULTS);
      const { changed, settings } = rollover(stored);
      if (changed) await chrome.storage.local.set({ shortsDay: settings.shortsDay, shortsUsed: settings.shortsUsed, shortsLimitTomorrow: settings.shortsLimitTomorrow });
      return settings;
    },

    /** Today's ceiling, after any one-day override. */
    limit(settings) {
      return effectiveLimit(settings, today());
    },

    remaining(settings) {
      return Math.max(0, budget.limit(settings) - (settings.shortsUsed || 0));
    },

    spent(settings) {
      return (settings.shortsUsed || 0) >= budget.limit(settings);
    },

    /** Count one short. Returns the fresh state so callers can react immediately. */
    async spend() {
      const settings = await budget.read();
      if (budget.spent(settings)) return settings;
      await chrome.storage.local.set({ shortsUsed: (settings.shortsUsed || 0) + 1 });
      return { ...settings, shortsUsed: (settings.shortsUsed || 0) + 1 };
    },

    async grant(extra) {
      await chrome.storage.local.set({ shortsUsed: 0 });
      return budget.read();
    },

    async setLimit(n) {
      const limit = Math.max(0, Math.min(9999, Math.floor(Number(n) || 0)));
      await chrome.storage.local.set({ shortsLimit: limit });
      return budget.read();
    },

    async setTomorrow(n) {
      const limit = Math.max(0, Math.min(9999, Math.floor(Number(n) || 0)));
      await chrome.storage.local.set({ shortsLimitTomorrow: limit });
      return budget.read();
    },

    async unlockCheat(code) {
      if (String(code).trim() !== CHEAT_CODE) return false;
      await chrome.storage.local.set({ cheatUnlocked: true });
      return true;
    }
  };

  window.SYT_BUDGET = budget;
})();
