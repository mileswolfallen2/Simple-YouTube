/**
 * The walkout.
 *
 * When the day's Shorts are gone, a procession of shorts marches off the screen
 * and the icon stays locked until local midnight. It is deliberately not
 * dismissable -- there is no close button, because a close button is a loophole.
 * You leave by navigating away, and the lock follows.
 */
(() => {
  'use strict';

  const CHEAT = window.SYT_BUDGET.CHEAT_CODE;

  const CSS = `
:host { all: initial; }
*, *::before, *::after { box-sizing: border-box; }

.veil {
  --bg: #000000;
  --line: #1c1c20;
  --surface: #0d0d0f;
  --text: #f4f4f7;
  --muted: #8e8e98;
  --accent: #ff2d55;

  position: fixed;
  inset: 0;
  z-index: 2147482000;
  background: var(--bg);
  color: var(--text);
  font-family: "Roboto", "YouTube Sans", Arial, sans-serif;
  display: grid;
  place-items: center;
  text-align: center;
  padding: 24px;
}
.veil[hidden] { display: none; }

.stage { position: relative; height: 120px; width: min(560px, 100%); margin: 0 auto 8px; overflow: hidden; }
.card {
  position: absolute;
  top: 8px;
  left: 0;
  width: 68px;
  height: 108px;
  border-radius: 12px;
  background: var(--surface);
  border: 1px solid var(--line);
  animation: march 3.4s linear forwards;
}
.card::after {
  content: "";
  position: absolute;
  left: 50%; top: 50%;
  width: 0; height: 0;
  margin: -11px 0 0 -8px;
  border-left: 15px solid var(--muted);
  border-top: 11px solid transparent;
  border-bottom: 11px solid transparent;
}
@keyframes march {
  0%   { transform: translateX(105%) translateY(0); opacity: 0; }
  8%   { opacity: 1; }
  50%  { transform: translateX(calc(105% - 50vw)) translateY(-6px); }
  92%  { opacity: 1; }
  100% { transform: translateX(-140px) translateY(0); opacity: 0; }
}
@media (prefers-reduced-motion: reduce) {
  .card { animation: fade 1.2s ease forwards; }
  @keyframes fade { from { opacity: 1; } to { opacity: 0; } }
}

h1 { margin: 0 0 8px; font-size: 22px; font-weight: 700; letter-spacing: -0.02em; }
p { margin: 0 auto 20px; max-width: 42ch; color: var(--muted); font-size: 14px; line-height: 1.55; }
p strong { color: var(--text); }
.actions { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; }
button, input {
  font: inherit; font-size: 13px; border-radius: 9px; cursor: pointer;
}
button { padding: 9px 16px; border: 1px solid var(--line); background: var(--surface); color: var(--text); }
button:hover { border-color: var(--muted); }
button.primary { background: var(--accent); border-color: var(--accent); color: #fff; }
.cheat { margin-top: 22px; display: flex; gap: 8px; justify-content: center; }
.cheat input {
  width: 130px; padding: 8px 10px; text-align: center;
  border: 1px solid var(--line); background: var(--surface); color: var(--text);
  letter-spacing: 0.2em;
}
.hint { margin-top: 10px; font-size: 11px; color: var(--muted); }
`;

  function el(tag, props = {}, kids = []) {
    const node = Object.assign(document.createElement(tag), props);
    for (const kid of [].concat(kids)) if (kid) node.append(kid);
    return node;
  }

  let veil = null;

  function ensure() {
    if (veil) return veil;
    const host = document.createElement('div');
    host.id = 'syt-walkout-host';
    const root = host.attachShadow({ mode: 'open' });
    const style = el('style');
    style.textContent = CSS;
    veil = el('div', { className: 'veil', hidden: true });
    root.append(style, veil);
    (document.body || document.documentElement).append(host);
    return veil;
  }

  function hide() {
    if (veil) veil.hidden = true;
  }

  async function show() {
    const settings = await window.SYT_BUDGET.read();
    const limit = window.SYT_BUDGET.limit(settings);
    const tomorrowLimit = settings.shortsLimitTomorrow > 0 ? settings.shortsLimitTomorrow : limit;

    const node = ensure();
    node.replaceChildren();

    const stage = el('div', { className: 'stage' });
    for (let i = 0; i < 5; i++) {
      const card = el('div', { className: 'card' });
      card.style.animationDelay = `${i * 0.42}s`;
      stage.append(card);
    }

    const actions = el('div', { className: 'actions' });
    const home = el('button', { className: 'primary', type: 'button', textContent: 'Go home' });
    home.addEventListener('click', () => {
      location.href = '/';
    });
    const tomorrow = el('button', { type: 'button', textContent: `Set tomorrow to something else` });
    tomorrow.addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent('syt:open-settings'));
    });
    actions.append(home, tomorrow);

    const cheat = el('div', { className: 'cheat' });
    const input = el('input', { type: 'text', placeholder: '·····', maxLength: 6, 'aria-label': 'Test code' });
    const go = el('button', { type: 'button', textContent: 'Unlock' });
    const attempt = async () => {
      if (await window.SYT_BUDGET.unlockCheat(input.value)) {
        input.value = '';
        hide();
        window.dispatchEvent(new CustomEvent('syt:open-settings'));
      } else {
        input.value = '';
        input.focus();
      }
    };
    go.addEventListener('click', attempt);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') attempt();
    });
    cheat.append(input, go);

    node.append(
      stage,
      el('h1', { textContent: "That's your Shorts for today." }),
      el('p', {
        textContent: `You watched ${limit}. The rail stays locked until midnight. Tomorrow allows ${tomorrowLimit}.`
      }),
      actions,
      cheat,
      el('div', { className: 'hint', textContent: 'Testing the limit? The code unlocks any number.' })
    );

    node.hidden = false;
  }

  window.SYT_UI = window.SYT_UI || {};
  window.SYT_UI.walkout = { show, hide, CHEAT };
  window.addEventListener('syt:walkout', show);
})();
