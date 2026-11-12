// @ts-check

'use strict';

import { detectLang, LANGS } from './core.js';

export const I18N_URL = new URL('../data/i18n.json', import.meta.url).href;

const HTML_LANG = { zh_cn: 'zh-CN', zh_tw: 'zh-Hant', jp: 'ja', en_us: 'en' };

/** @type {Record<string, Record<string, string>>|null} */
let strings = null;
/** @type {string[]} */
let languages = ['zh_cn', 'zh_tw', 'jp', 'en_us'];
let lang = 'zh_cn';

export async function loadI18n() {
  if (!strings) {
    const response = await fetch(I18N_URL);
    if (!response.ok) throw new Error(`i18n ${response.status}`);
    const data = await response.json();
    strings = data.strings || {};
    if (Array.isArray(data.languages)) languages = data.languages;
  }
  return strings;
}

export function resolveLang() {
  const param = (new URLSearchParams(location.search).get('lang') || '').toLowerCase();
  if (languages.includes(param)) return param;
  return detectLang();
}

export function setLang(next) {
  lang = next;
  document.documentElement.lang = HTML_LANG[next] || next;
  applyStatic();
}

/**
 * @param {string} key
 * @param {Record<string, string|number>} [vars]  fills `{name}` placeholders
 */
export function t(key, vars) {
  const entry = strings ? strings[key] : null;
  const text = (entry && (entry[lang] || entry.en_us || entry.zh_cn)) || key;
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (whole, name) => (name in vars ? String(vars[name]) : whole));
}

export function applyStatic(root = document) {
  for (const node of root.querySelectorAll('[data-i18n]')) {
    node.textContent = t(/** @type {HTMLElement} */ (node).dataset.i18n || '');
  }
  for (const node of root.querySelectorAll('[data-i18n-placeholder]')) {
    node.setAttribute('placeholder', t(/** @type {HTMLElement} */ (node).dataset.i18nPlaceholder || ''));
  }
}

const CHECK_SVG = '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8"'
  + ' stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4.5 10.5 8 14l7.5-8"/></svg>';

/**
 * @param {HTMLElement} container  holds `button.lang-trigger` and `.lang-current`
 * @param {string} current  current language key
 * @param {(lang: string) => void} onChange  called with the picked language
 */
export function mountLangPicker(container, current, onChange) {
  const trigger = /** @type {HTMLButtonElement} */ (container.querySelector('.lang-trigger'));
  const currentLabel = /** @type {HTMLElement} */ (container.querySelector('.lang-current'));
  let lang = current;

  const menu = document.createElement('ul');
  menu.className = 'lang-menu';
  menu.setAttribute('role', 'listbox');
  menu.hidden = true;

  /** @type {HTMLElement[]} */
  const items = LANGS.map((item) => {
    const row = document.createElement('li');
    row.setAttribute('role', 'option');
    row.tabIndex = -1;
    row.dataset.lang = item.key;
    row.innerHTML = `<span class="lang-name"></span>${CHECK_SVG}`;
    /** @type {HTMLElement} */ (row.querySelector('.lang-name')).textContent = item.label;
    row.addEventListener('click', () => pick(item.key));
    menu.appendChild(row);
    return row;
  });

  function open(focusCurrent) {
    menu.hidden = false;
    trigger.setAttribute('aria-expanded', 'true');
    if (focusCurrent) {
      const active = items.find((row) => row.dataset.lang === lang) || items[0];
      active.focus();
    }
    document.addEventListener('pointerdown', onOutside, true);
  }

  function close(refocus) {
    menu.hidden = true;
    trigger.setAttribute('aria-expanded', 'false');
    document.removeEventListener('pointerdown', onOutside, true);
    if (refocus) trigger.focus();
  }

  /** @param {PointerEvent} event */
  function onOutside(event) {
    if (!container.contains(/** @type {Node} */ (event.target))) close(false);
  }

  function paint() {
    for (const row of items) {
      const active = row.dataset.lang === lang;
      row.setAttribute('aria-selected', String(active));
      row.classList.toggle('is-active', active);
    }
    currentLabel.textContent = (LANGS.find((item) => item.key === lang) || LANGS[0]).label;
  }

  /** @param {string} next */
  function pick(next) {
    close(true);
    if (next === lang) return;
    lang = next;
    paint();
    onChange(next);
  }

  trigger.addEventListener('click', () => (menu.hidden ? open(true) : close(true)));
  trigger.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      open(true);
    }
  });
  container.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !menu.hidden) {
      event.preventDefault();
      close(true);
    }
  });
  menu.addEventListener('keydown', (event) => {
    const row = /** @type {HTMLElement} */ (document.activeElement);
    const index = items.indexOf(row);
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const step = event.key === 'ArrowDown' ? 1 : -1;
      items[(index + step + items.length) % items.length].focus();
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (row.dataset.lang) pick(row.dataset.lang);
    } else if (event.key === 'Tab') {
      close(false);
    }
  });

  container.appendChild(menu);
  paint();
  return { set(next) { lang = next; paint(); } };
}
