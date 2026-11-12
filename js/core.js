// @ts-check

'use strict';

const ROOT = new URL('../', import.meta.url).href;

export const CHARACTERS_URL = `${ROOT}data/characters.json`;

export const BASE_ROOT = `${ROOT}img/base`;
export const ATLAS_ROOT = `${ROOT}img/atlas`;
export const THUMB_ROOT = `${ROOT}img/thumb`;

export const LANGS = [
  { key: 'zh_cn', label: '简体中文' },
  { key: 'zh_tw', label: '繁體中文' },
  { key: 'jp', label: '日本語' },
  { key: 'en_us', label: 'English' },
];

export const CANVAS = 1024;

export const BLINK = { minMs: 2000, maxMs: 5000, holdMs: 50 };
export const LIP = { gapMs: 67, holdMs: 100 };

export const NEGATIVE_POWER = 1.57;
export const NEGATIVE_PRESETS = [
  null,
  { key: 'purple', color: [124, 88, 176] },
  { key: 'gray', color: [100, 100, 100] },
];

/** @type {any} */
let characters = null;
/** @type {Promise<any>|null} */
let charactersPromise = null;

export async function loadCharacters() {
  if (!charactersPromise) {
    charactersPromise = fetch(CHARACTERS_URL)
      .then((response) => {
        if (!response.ok) throw new Error(`characters ${response.status}`);
        return response.json();
      })
      .then((data) => {
        characters = data;
        return data;
      });
  }
  return charactersPromise;
}

/** @type {any} */
let manifest = null;
export async function loadManifest() {
  if (!manifest) {
    const data = await loadCharacters();
    manifest = { characters: data.characters };
  }
  return manifest;
}

/** @type {any} */
let atlasIndex = null;
export async function loadAtlasIndex() {
  if (!atlasIndex) {
    const data = await loadCharacters();
    const map = {};
    for (const [id, rec] of Object.entries(data.characters)) {
      if (rec.atlas) map[id] = rec.atlas;
    }
    atlasIndex = { dir: ATLAS_ROOT, characters: map };
  }
  return atlasIndex;
}

export function atlasFor(atlas, id) {
  return (atlas && atlas.characters && atlas.characters[id]) || null;
}

export function baseSrc(id) {
  return `${BASE_ROOT}/${id}.webp`;
}

export function atlasSrc(_atlas, id) {
  return `${ATLAS_ROOT}/${id}.webp`;
}

export function thumbSrc(id) {
  return `${THUMB_ROOT}/${id}.webp`;
}

/** @type {Record<string, Record<string,string>>|null} */
let names = null;

export async function loadNames() {
  if (!names) {
    const data = await loadCharacters();
    names = {};
    for (const [id, rec] of Object.entries(data.characters)) names[id] = rec.names || {};
  }
  return names;
}

export function isStatic(id) {
  const rec = characters && characters.characters[id];
  return Boolean(rec && rec.kind === 'static');
}

export function nameEntry(id) {
  return (names && names[id]) || null;
}

export function pickName(id, lang) {
  const entry = nameEntry(id);
  if (!entry) return '';
  return entry[lang] || '';
}

export function nameIndexText(id) {
  const entry = nameEntry(id);
  if (!entry) return '';
  return LANGS.map((item) => entry[item.key] || '').join(' ').toLowerCase();
}

export const LANG_STORAGE = 'dlportraits-lang';
const LEGACY_LANG_STORAGE = 'lang';

function isLang(value) {
  return Boolean(value) && LANGS.some((item) => item.key === value);
}

export function detectLang() {
  let saved = null;
  try {
    saved = localStorage.getItem(LANG_STORAGE);
    if (isLang(saved)) {
      localStorage.removeItem(LEGACY_LANG_STORAGE);
    } else {
      const legacy = localStorage.getItem(LEGACY_LANG_STORAGE);
      localStorage.removeItem(LEGACY_LANG_STORAGE);
      saved = isLang(legacy) ? legacy : null;
      if (saved) localStorage.setItem(LANG_STORAGE, saved);
    }
  } catch {}
  if (isLang(saved)) return saved;
  const nav = (navigator.language || 'en').toLowerCase();
  if (nav.startsWith('zh')) {
    return /tw|hk|mo|hant/.test(nav) ? 'zh_tw' : 'zh_cn';
  }
  if (nav.startsWith('ja')) return 'jp';
  return 'en_us';
}

export function saveLang(lang) {
  try {
    localStorage.setItem(LANG_STORAGE, lang);
  } catch {}
}

const bitmaps = new Map();
const retained = new Set();

export function image(src) {
  let pending = bitmaps.get(src);
  if (!pending) {
    pending = fetch(src)
      .then((response) => (response.ok ? response.blob() : null))
      .then((blob) => (blob ? createImageBitmap(blob) : null))
      .catch(() => null);
    bitmaps.set(src, pending);
  }
  return pending;
}

export function prefetch(src) {
  if (bitmaps.has(src)) return;
  fetch(src, { priority: 'low' }).catch(() => {});
}

export function retain(...sources) {
  for (const src of sources) if (src) retained.add(src);
}

export function releaseUnused(keep = []) {
  const alive = new Set(keep);
  for (const src of retained) if (!alive.has(src)) retained.delete(src);
  for (const src of Array.from(bitmaps.keys())) {
    if (alive.has(src) || retained.has(src)) continue;
    bitmaps.delete(src);
  }
}

export async function loadCharacter(atlas, id) {
  const entry = atlasFor(atlas, id);
  const base = await image(baseSrc(id));
  const sheet = entry ? await image(atlasSrc(atlas, id)) : null;
  retain(baseSrc(id), entry ? atlasSrc(atlas, id) : null);
  return { entry, base, sheet };
}

/**
 * @param {object} input
 * @param {number[]} input.offset      [x, y, cell]
 * @param {number[][]} input.groups    [[face0, face1, mouth0, mouth1], ...]
 * @param {{cell:number, cols:number, count:number}|null} input.entry
 * @param {ImageBitmap|null} input.base
 * @param {ImageBitmap|null} input.sheet
 * @param {number} input.group         0-based
 * @param {{groups:number[][], offset:number[], group:number}} [input.form2]
 * @param {{x:number, y:number, side:number}} [input.view]  renders only that sub-rect (face thumbnails)
 */
export function compose({
  offset, groups, entry, base, sheet, group, eye, mouth,
  fx = 0, size = CANVAS, form2 = null, view = null,
}) {
  const canvas = new OffscreenCanvas(size, size);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return canvas;

  const window_ = view || { x: 0, y: 0, side: CANVAS };
  const scale = size / window_.side;
  ctx.setTransform(scale, 0, 0, scale, -window_.x * scale, -window_.y * scale);

  if (base) ctx.drawImage(base, 0, 0);

  const draw = (colors, formOffset) => {
    if (!entry || !sheet) return;
    const cell = entry.cell;
    for (const color of colors) {
      if (color == null || color < 0 || color >= entry.count) continue;
      const sx = (color % entry.cols) * cell;
      const sy = Math.floor(color / entry.cols) * cell;
      ctx.drawImage(sheet, sx, sy, cell, cell, formOffset[0], formOffset[1], cell, cell);
    }
  };

  const main = groups && groups[group];
  if (main) draw([main[eye], main[2 + mouth]], offset);
  if (form2 && form2.groups[form2.group]) {
    const other = form2.groups[form2.group];
    draw([other[0], other[2]], form2.offset);
  }

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (fx) applyNegative(ctx, fx);
  return canvas;
}

export function faceView(offset) {
  return { x: offset[0], y: offset[1], side: offset[2] };
}

const luts = new Map();

function negativeLut(index) {
  let lut = luts.get(index);
  if (lut) return lut;
  const preset = NEGATIVE_PRESETS[index];
  if (!preset) return null;
  lut = [0, 1, 2].map((channel) => {
    const bias = NEGATIVE_POWER * preset.color[channel];
    const table = new Uint8ClampedArray(256);
    for (let value = 0; value < 256; value += 1) {
      table[value] = bias - (NEGATIVE_POWER - 1) * value;
    }
    return table;
  });
  luts.set(index, lut);
  return lut;
}

export function applyNegative(ctx, index) {
  const lut = negativeLut(index);
  if (!lut) return;
  const { width, height } = ctx.canvas;
  const image = ctx.getImageData(0, 0, width, height);
  const data = image.data;
  const [red, green, blue] = lut;
  for (let i = 0; i < data.length; i += 4) {
    data[i] = red[data[i]];
    data[i + 1] = green[data[i + 1]];
    data[i + 2] = blue[data[i + 2]];
  }
  ctx.putImageData(image, 0, 0);
}
