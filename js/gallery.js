// @ts-check

'use strict';

import {
  loadManifest, loadNames, pickName, nameIndexText,
  thumbSrc, prefetch, atlasSrc, atlasFor, loadAtlasIndex, saveLang,
} from './core.js';
import { loadI18n, resolveLang, setLang, t, mountLangPicker } from './i18n.js';

const el = {
  q: /** @type {HTMLInputElement} */ (document.getElementById('q')),
  lang: document.getElementById('lang'),
  grid: document.getElementById('grid'),
  empty: document.getElementById('empty'),
  gallery: document.getElementById('gallery'),
};

/** @type {string[]} */
let allIds = [];
/** @type {string[]} */
let filtered = [];
/** @type {any} */
let atlas = null;
let lang = 'zh_cn';

let urlLang = '';

function buildCard(id) {
  const link = document.createElement('a');
  link.className = 'card';
  link.href = `viewer.html?id=${encodeURIComponent(id)}`;
  link.dataset.id = id;

  const img = document.createElement('img');
  img.src = thumbSrc(id);
  img.width = 128;
  img.height = 128;
  img.loading = 'lazy';
  img.decoding = 'async';
  img.alt = '';
  link.appendChild(img);

  const name = pickName(id, lang);
  const label = document.createElement('span');
  label.className = 'name';
  if (name) {
    const cut = name.search(/[（(]/);
    if (cut > 0) {
      const head = document.createElement('span');
      head.className = 'head';
      head.textContent = name.slice(0, cut).trim();
      const tail = document.createElement('span');
      tail.className = 'tail';
      tail.textContent = name.slice(cut).trim();
      label.append(head, tail);
    } else {
      label.textContent = name;
    }
  }
  link.appendChild(label);

  const idLabel = document.createElement('span');
  idLabel.className = 'id';
  idLabel.textContent = id;
  link.appendChild(idLabel);

  link.setAttribute('aria-label', name ? t('gallery.card.label', { name, id }) : id);

  if (atlasFor(atlas, id)) {
    const warm = () => prefetch(atlasSrc(atlas, id));
    link.addEventListener('pointerenter', warm, { passive: true });
    link.addEventListener('focus', warm, { passive: true });
  }

  return link;
}

function matches(id, needle) {
  return id.includes(needle) || nameIndexText(id).includes(needle);
}

function render() {
  const needle = el.q.value.trim().toLowerCase();
  filtered = needle ? allIds.filter((id) => matches(id, needle)) : allIds;

  el.grid.replaceChildren();
  const fragment = document.createDocumentFragment();
  for (const id of filtered) fragment.appendChild(buildCard(id));
  el.grid.appendChild(fragment);

  el.empty.hidden = filtered.length > 0;

  const params = new URLSearchParams();
  if (needle) params.set('q', el.q.value.trim());
  if (urlLang) params.set('lang', urlLang);
  const search = params.toString();
  history.replaceState(null, '', search ? `?${search}` : location.pathname);
}

async function boot() {
  const [, manifest, index] = await Promise.all([
    loadI18n(), loadManifest(), loadAtlasIndex(), loadNames(),
  ]);
  atlas = index;
  allIds = Object.keys(manifest.characters).sort();

  lang = resolveLang();
  setLang(lang);
  mountLangPicker(el.lang, lang, (next) => {
    lang = next;
    saveLang(lang);
    setLang(lang);
    const scroll = el.gallery.scrollTop;
    render();
    el.gallery.scrollTop = scroll;
  });
  const params = new URLSearchParams(location.search);
  urlLang = params.get('lang') || '';
  const seed = params.get('q') || '';
  el.q.value = seed;
  render();

  let debounce = 0;
  el.q.addEventListener('input', () => {
    window.clearTimeout(debounce);
    debounce = window.setTimeout(render, 200);
  });
}

boot();
