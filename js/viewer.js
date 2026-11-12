// @ts-check

'use strict';

import {
  loadManifest, loadAtlasIndex, atlasFor, atlasSrc, baseSrc,
  loadCharacter, releaseUnused, compose, faceView,
  BLINK, LIP, NEGATIVE_PRESETS,
  loadNames, pickName, saveLang,
} from './core.js';
import { loadI18n, resolveLang, setLang, t, mountLangPicker } from './i18n.js';

const SHARE_FLASH_MS = 1500;
const SHARE_FAIL_MS = 2600;

const el = {
  name: document.getElementById('name'),
  current: document.getElementById('current'),
  share: /** @type {HTMLAnchorElement} */ (document.getElementById('share')),
  shareLabel: /** @type {HTMLElement} */ (document.querySelector('#share span')),
  download: /** @type {HTMLButtonElement} */ (document.getElementById('download')),
  lang: document.getElementById('lang'),
  langM: document.getElementById('lang-m'),
  more: /** @type {HTMLButtonElement} */ (document.getElementById('more')),
  morePanel: document.getElementById('more-panel'),
  shareSlot: document.getElementById('slot-share'),
  autoSlot: document.getElementById('slot-auto'),
  fxSlot: document.getElementById('slot-fx'),
  groupAuto: document.getElementById('group-auto'),
  groupFx: document.getElementById('group-fx'),
  barActions: document.querySelector('.bar-actions'),
  controls: document.querySelector('.controls'),
  stage: /** @type {HTMLCanvasElement} */ (document.getElementById('stage')),
  empty: document.getElementById('empty'),
  rail: document.getElementById('rail'),
  railToggle: /** @type {HTMLButtonElement} */ (document.getElementById('rail-toggle')),
  railCount: document.getElementById('rail-count'),
  railBody: document.getElementById('rail-body'),
  eye: document.getElementById('eye'),
  mouth: document.getElementById('mouth'),
  auto: document.getElementById('auto'),
  fx: document.getElementById('fx'),
  live: document.getElementById('live'),
};

const stageCtx = el.stage.getContext('2d', { willReadFrequently: true });

/** @typedef {{id:string, g0:number, g1:number, eye:number, mouth:number, fx:number, auto:{eye:boolean, mouth:boolean}}} State */

/** @type {State} */
const state = { id: '', g0: 0, g1: 0, eye: 0, mouth: 0, fx: 0, auto: { eye: false, mouth: false } };

const manual = { eye: 0, mouth: 0 };

/** @type {any} */
let manifest = null;
/** @type {any} */
let atlas = null;
let renderToken = 0;
let eyeTimer = 0;
let mouthTimer = 0;
let shareTimer = 0;
let lang = 'zh_cn';

let urlLang = '';

/**
 * @param {Partial<State>} change
 * @param {{rail?: boolean, auto?: boolean}} [options]
 */
function patch(change, options = {}) {
  Object.assign(state, change);
  if (!options.auto) {
    if ('eye' in change) manual.eye = state.eye;
    if ('mouth' in change) manual.mouth = state.mouth;
    writeUrl();
  }
  render(options.rail !== false);
}

function readUrl() {
  const params = new URLSearchParams(location.search);
  return {
    id: params.get('id') || '',
    g0: numberOr(params.get('g'), 1) - 1,
    g1: params.get('g2') ? numberOr(params.get('g2'), 1) - 1 : null,
    eye: numberOr(params.get('e'), 0),
    mouth: numberOr(params.get('m'), 0),
    fx: numberOr(params.get('fx'), 0),
  };
}

function writeUrl() {
  const params = new URLSearchParams();
  params.set('id', state.id);
  params.set('g', String(state.g0 + 1));
  if (isDual()) params.set('g2', String(state.g1 + 1));
  params.set('e', String(manual.eye));
  params.set('m', String(manual.mouth));
  if (state.fx) params.set('fx', String(state.fx));
  if (urlLang) params.set('lang', urlLang);
  history.replaceState(null, '', `${location.pathname}?${params}`);
  const url = `${location.origin}${location.pathname}?${params}`;
  el.share.href = url;
  el.share.hidden = false;
}

function numberOr(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function record() {
  return (manifest && state.id && manifest.characters[state.id]) || null;
}

function isStatic() {
  const rec = record();
  return Boolean(rec && (!rec.groups || rec.kind === 'static'));
}

function isDual() {
  const rec = record();
  return Boolean(rec && rec.groups2 && rec.offset2);
}

function applyKind() {
  const staticCard = isStatic();
  document.body.dataset.kind = staticCard ? 'static' : 'form';
  el.rail.hidden = staticCard;
}

function fitStage() {
  const wrap = el.stage.parentElement;
  if (!wrap) return;

  const style = getComputedStyle(wrap);
  const padX = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
  const padY = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
  const box = Math.max(120, Math.min(wrap.clientWidth - padX, wrap.clientHeight - padY));
  el.stage.style.width = `${box}px`;
  el.stage.style.height = `${box}px`;
}

function form2Of(rec) {
  return isDual() ? { groups: rec.groups2, offset: rec.offset2, group: state.g1 } : null;
}

async function render(rail = true) {
  const rec = record();
  if (!rec) return;
  applyKind();

  const token = ++renderToken;
  el.stage.classList.add('is-loading');
  const { entry, base, sheet } = await loadCharacter(atlas, state.id);
  if (token !== renderToken) return;

  const staticCard = isStatic();
  const canvas = compose({
    offset: rec.offset,
    groups: rec.groups || [],
    entry,
    base,
    sheet,
    group: staticCard ? 0 : state.g0,
    eye: staticCard ? 0 : state.eye,
    mouth: staticCard ? 0 : state.mouth,
    fx: state.fx,
    form2: staticCard ? null : form2Of(rec),
  });

  stageCtx.clearRect(0, 0, el.stage.width, el.stage.height);
  stageCtx.drawImage(canvas, 0, 0);
  el.stage.classList.remove('is-loading');
  el.empty.hidden = true;

  if (rail && !staticCard) drawRail(rec, entry, base, sheet);
  updateLabels(rec);
}

function drawRail(rec, entry, base, sheet) {
  el.railBody.replaceChildren();
  const dual = Boolean(rec.groups2 && rec.offset2);

  const addCells = (groups, offset, formIndex, selected) => {
    for (let index = 0; index < groups.length; index += 1) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'face';
      button.dataset.form = String(formIndex);
      button.dataset.index = String(index);
      button.setAttribute('aria-current', String(index === selected));
      button.setAttribute('aria-label', dual
        ? `Form ${formIndex} expression ${index + 1}`
        : `Expression ${index + 1}`);

      const canvas = document.createElement('canvas');
      canvas.width = 128;
      canvas.height = 128;
      button.appendChild(canvas);

      const badge = document.createElement('span');
      badge.className = 'no';
      badge.textContent = String(index + 1);
      button.appendChild(badge);

      const thumb = compose({
        offset,
        groups,
        entry,
        base,
        sheet,
        group: index,
        eye: formIndex === 1 ? state.eye : 0,
        mouth: formIndex === 1 ? state.mouth : 0,
        size: 128,
        view: faceView(offset),
      });
      canvas.getContext('2d')?.drawImage(thumb, 0, 0);

      el.railBody.appendChild(button);
    }
  };

  addCells(rec.groups, rec.offset, 1, state.g0);

  if (dual) {
    const separator = document.createElement('div');
    separator.className = 'rail-sep';
    separator.setAttribute('role', 'presentation');
    el.railBody.appendChild(separator);
    addCells(rec.groups2, rec.offset2, 2, state.g1);
  }
}

function pickGroup(index, form = 1) {
  const rec = record();
  if (!rec) return;
  if (form === 2 && rec.groups2) {
    patch({ g1: Math.min(Math.max(index, 0), rec.groups2.length - 1) });
    return;
  }
  patch({ g0: Math.min(Math.max(index, 0), rec.groups.length - 1) });
}

function setSeg(container, value) {
  for (const button of container.querySelectorAll('button')) {
    button.setAttribute('aria-pressed', String(Number(button.dataset.value) === value));
  }
}

function lockSeg(container, locked) {
  container.setAttribute('aria-disabled', String(locked));
  for (const button of container.querySelectorAll('button')) {
    button.disabled = locked;
  }
}

function channelDiff(rec) {
  const g = rec && rec.groups && rec.groups[state.g0];
  return { eye: Boolean(g) && g[0] !== g[1], mouth: Boolean(g) && g[2] !== g[3] };
}

function syncChannelLocks(rec = record()) {
  const diff = channelDiff(rec);
  lockSeg(el.eye, state.auto.eye || !diff.eye);
  lockSeg(el.mouth, state.auto.mouth || !diff.mouth);
}

function wireSeg(container, key) {
  container.addEventListener('click', (event) => {
    const button = /** @type {HTMLElement} */ (event.target).closest('button[data-value]');
    if (!button) return;
    const value = Number(/** @type {HTMLElement} */ (button).dataset.value);
    if (key === 'fx') patch({ fx: state.fx === value ? 0 : value });
    else patch({ [key]: value });
  });
}

function setAuto(key, on) {
  state.auto[key] = on;
  const button = el.auto.querySelector(`button[data-key="${key}"]`);
  button?.setAttribute('aria-checked', String(on));
  if (key === 'eye') {
    window.clearTimeout(eyeTimer);
    if (on) scheduleBlink();
    else patch({ eye: manual.eye });
  } else {
    window.clearTimeout(mouthTimer);
    if (on) scheduleLip();
    else patch({ mouth: manual.mouth });
  }
  syncChannelLocks();
}

function scheduleBlink() {
  window.clearTimeout(eyeTimer);
  const delay = BLINK.minMs + Math.random() * (BLINK.maxMs - BLINK.minMs);
  eyeTimer = window.setTimeout(() => {
    patch({ eye: 1 }, { rail: false, auto: true });
    eyeTimer = window.setTimeout(() => {
      patch({ eye: 0 }, { rail: false, auto: true });
      if (state.auto.eye) scheduleBlink();
    }, BLINK.holdMs);
  }, delay);
}

function scheduleLip() {
  window.clearTimeout(mouthTimer);
  mouthTimer = window.setTimeout(() => {
    patch({ mouth: 1 }, { rail: false, auto: true });
    mouthTimer = window.setTimeout(() => {
      patch({ mouth: 0 }, { rail: false, auto: true });
      if (state.auto.mouth) scheduleLip();
    }, LIP.holdMs);
  }, LIP.gapMs);
}

function updateLabels(rec) {
  const name = pickName(state.id, lang);
  el.name.textContent = name;
  el.current.textContent = state.id;
  setSeg(el.eye, manual.eye);
  setSeg(el.mouth, manual.mouth);
  setSeg(el.fx, state.fx);
  syncChannelLocks(rec);
  el.download.disabled = false;
  const total = (rec.groups || []).length + (isDual() ? (rec.groups2 || []).length : 0);
  el.railCount.textContent = total ? `${Math.min(state.g0 + 1, total)}/${total}` : '';
}

/**
 * @param {boolean} ok
 */
function flashShare(ok) {
  const text = t(ok ? 'viewer.share.done' : 'viewer.share.failed');
  el.live.textContent = text;
  el.shareLabel.textContent = text;
  el.share.classList.toggle('is-done', ok);
  el.share.classList.toggle('is-failed', !ok);
  window.clearTimeout(shareTimer);
  shareTimer = window.setTimeout(() => {
    el.shareLabel.textContent = t('viewer.share');
    el.share.classList.remove('is-done', 'is-failed');
  }, ok ? SHARE_FLASH_MS : SHARE_FAIL_MS);
}

/**
 * @param {string} text
 */
async function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await Promise.race([
        navigator.clipboard.writeText(text),
        new Promise((resolve, reject) => { window.setTimeout(() => reject(new Error('timeout')), 1000); }),
      ]);
      return true;
    } catch {}
  }
  return legacyCopy(text);
}

/** @param {string} text */
function legacyCopy(text) {
  const area = document.createElement('textarea');
  area.value = text;
  area.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;padding:0;border:0;opacity:0;';
  document.body.appendChild(area);

  const selection = document.getSelection();
  const savedRange = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;

  area.contentEditable = 'true';
  area.readOnly = false;
  try {
    const range = document.createRange();
    range.selectNodeContents(area);
    if (selection) {
      selection.removeAllRanges();
      selection.addRange(range);
    }
    area.setSelectionRange(0, text.length);
  } catch {}

  let ok = false;
  try {
    ok = document.execCommand('copy');
  } catch {
    ok = false;
  }

  document.body.removeChild(area);
  if (selection && savedRange) {
    selection.removeAllRanges();
    selection.addRange(savedRange);
  }
  return ok;
}

function exportName() {
  const suffix = state.fx ? `_${NEGATIVE_PRESETS[state.fx].key}` : '';
  if (isStatic()) return `${state.id}${suffix}.png`;
  const groups = isDual() ? `${state.g0 + 1}-${state.g1 + 1}` : `${state.g0 + 1}`;
  return `${state.id}_g${groups}_e${state.eye}m${state.mouth}${suffix}.png`;
}

async function download() {
  if (!record()) return;
  const blob = await new Promise((resolve) => el.stage.toBlob(resolve, 'image/png'));
  if (!blob) return;
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = exportName();
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function selectCharacter(id, seed = {}) {
  const rec = manifest.characters[id];
  if (!rec) {
    el.empty.hidden = false;
    el.current.textContent = id;
    return;
  }
  state.id = id;
  const staticCard = !rec.groups || rec.kind === 'static';
  state.g0 = staticCard ? 0 : Math.min(Math.max(seed.g0 ?? 0, 0), rec.groups.length - 1);
  state.g1 = rec.groups2
    ? Math.min(Math.max(seed.g1 ?? state.g0, 0), rec.groups2.length - 1)
    : 0;
  state.eye = seed.eye === 1 ? 1 : 0;
  state.mouth = seed.mouth === 1 ? 1 : 0;
  state.fx = [0, 1, 2].includes(seed.fx ?? 0) ? seed.fx : 0;
  manual.eye = state.eye;
  manual.mouth = state.mouth;

  el.empty.hidden = true;
  el.download.disabled = false;
  writeUrl();
  render();
}

const mqMobile = window.matchMedia('(max-width: 700px)');
/** @type {{actions: Element[], controls: Element[]}} */
const homeOrder = { actions: [], controls: [] };

/** @type {(open: boolean) => void} */
let setMore = () => {};

let mobilePlaced = null;

function layoutForViewport() {
  const mobile = mqMobile.matches;
  if (mobile === mobilePlaced) return;
  mobilePlaced = mobile;
  if (mobile) {
    el.shareSlot.prepend(el.share);
    el.autoSlot.append(el.groupAuto);
    el.fxSlot.append(el.groupFx);
    return;
  }
  for (const node of homeOrder.actions) el.barActions.append(node);
  for (const node of homeOrder.controls) el.controls.append(node);
}

function wireMorePanel() {
  /** @param {boolean} open */
  setMore = (open) => {
    el.morePanel.hidden = !open;
    el.more.setAttribute('aria-expanded', String(open));
    if (open) document.addEventListener('pointerdown', onOutside, true);
    else document.removeEventListener('pointerdown', onOutside, true);
  };
  /** @param {PointerEvent} event */
  function onOutside(event) {
    const node = /** @type {Node} */ (event.target);
    if (!el.morePanel.contains(node) && !el.more.contains(node)) setMore(false);
  }
  el.more.addEventListener('click', () => setMore(el.morePanel.hidden));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !el.morePanel.hidden) {
      event.preventDefault();
      setMore(false);
      el.more.focus();
    }
  });
}

function closeRail() {
  if (el.rail.dataset.open !== 'true') return;
  el.rail.dataset.open = 'false';
  el.railToggle.setAttribute('aria-expanded', 'false');
}

async function boot() {
  const params = new URLSearchParams(location.search);
  urlLang = params.get('lang') || '';
  await loadI18n();
  lang = resolveLang();
  setLang(lang);

  function onLangPick(next) {
    lang = next;
    saveLang(lang);
    setLang(lang);
    for (const picker of pickers) picker.set(lang);
    const rec = record();
    if (rec) updateLabels(rec);
    else el.name.textContent = t('viewer.loading');
  }

  const pickers = [
    mountLangPicker(el.lang, lang, onLangPick),
    mountLangPicker(el.langM, lang, onLangPick),
  ];
  wireMorePanel();
  homeOrder.actions = [...el.barActions.children];
  homeOrder.controls = [...el.controls.children];
  layoutForViewport();
  mqMobile.addEventListener('change', layoutForViewport);

  window.addEventListener('resize', layoutForViewport);
  el.railToggle.addEventListener('click', () => {
    const open = el.rail.dataset.open !== 'true';
    el.rail.dataset.open = String(open);
    el.railToggle.setAttribute('aria-expanded', String(open));
  });

  document.addEventListener('pointerdown', (event) => {
    const node = /** @type {Node} */ (event.target);
    if (el.rail.dataset.open === 'true' && !el.rail.contains(node)) closeRail();
  }, true);
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeRail();
  });
  el.name.textContent = t('viewer.loading');
  [manifest, atlas] = await Promise.all([loadManifest(), loadAtlasIndex(), loadNames()]);

  wireSeg(el.eye, 'eye');
  wireSeg(el.mouth, 'mouth');
  wireSeg(el.fx, 'fx');
  el.auto.addEventListener('click', (event) => {
    const button = /** @type {HTMLElement} */ (event.target).closest('button[data-key]');
    if (!button) return;
    const key = /** @type {HTMLElement} */ (button).dataset.key;
    setAuto(key, !state.auto[key]);
  });
  el.download.addEventListener('click', download);
  el.share.addEventListener('click', async (event) => {
    event.preventDefault();
    flashShare(await copyText(el.share.href));
  });
  el.railBody.addEventListener('click', (event) => {
    const button = /** @type {HTMLElement} */ (event.target).closest('button[data-index]');
    if (!button) return;
    pickGroup(Number(/** @type {HTMLElement} */ (button).dataset.index),
      Number(/** @type {HTMLElement} */ (button).dataset.form));
    closeRail();
  });
  window.addEventListener('resize', fitStage);
  if (typeof ResizeObserver === 'function') {
    new ResizeObserver(fitStage).observe(el.stage.parentElement);
  }

  const seed = readUrl();
  const fallback = Object.keys(manifest.characters).sort()[0];
  selectCharacter(seed.id && manifest.characters[seed.id] ? seed.id : fallback, seed);
  fitStage();
}

boot();
