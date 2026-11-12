(function () {
  'use strict';

  const KEY = 'dlportraits-theme';
  const root = document.documentElement;

  /** @type {string|null} */
  let stored = null;
  try {
    stored = localStorage.getItem(KEY);
  } catch {}

  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  if (stored ? stored === 'dark' : prefersDark) root.dataset.theme = 'dark';

  function sync() {
    const dark = root.dataset.theme === 'dark';
    for (const button of document.querySelectorAll('[data-theme-toggle]')) {
      button.setAttribute('aria-checked', String(dark));
    }
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', dark ? '#000000' : '#ffffff');
  }

  document.addEventListener('DOMContentLoaded', () => {
    sync();
    for (const button of document.querySelectorAll('[data-theme-toggle]')) {
      button.addEventListener('click', () => {
        const dark = root.dataset.theme !== 'dark';
        if (dark) root.dataset.theme = 'dark';
        else delete root.dataset.theme;
        try {
          localStorage.setItem(KEY, dark ? 'dark' : 'light');
        } catch {}
        sync();
      });
    }
  });
})();
