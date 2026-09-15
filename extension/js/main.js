// Entry point: loads state, renders background + clock, wires drag and drop and the other widgets.

import { state, loadState, subscribe, emit, onOtherTabChange } from './store.js';
import { loadPhotos, ensureCurrent, getPhoto, preloadNext, addFiles, setCurrent } from './photos.js';
import { renderGreeting, tickGreeting } from './greeting.js';
import { initPopup, renderPopup } from './popup.js';
import { initSettings, renderSettings, openSettings } from './settings.js';

const $ = (id) => document.getElementById(id);
let shownKey = null;

// Swaps the background to the current photo: decode first, then fade (0.3s first load, 2s after).
async function renderBackground() {
  const photo = getPhoto(state.current?.key);
  if (!photo || photo.key === shownKey) return;
  const first = shownKey === null;
  shownKey = photo.key;
  const img = new Image();
  img.src = photo.url;
  await img.decode().catch(() => {});
  if (shownKey !== photo.key) return; // a newer switch started meanwhile
  const layer = document.createElement('div');
  layer.className = `background-item ${first ? 'fade' : 'fade-slow'}`;
  layer.style.backgroundImage = `url("${photo.url}")`;
  $('backgrounds').append(layer);
  layer.addEventListener('animationend', () => {
    while ($('backgrounds').firstChild !== layer) $('backgrounds').firstChild.remove();
  });
  preloadNext();
}

// Big center clock; 24h shows hours without a leading zero, like Momentum.
function renderClock() {
  const now = new Date();
  const h = now.getHours();
  const el = $('clock');
  el.hidden = !state.settings.clockVisible;
  el.querySelector('.hours').textContent = state.settings.hour12 ? h % 12 || 12 : h;
  el.querySelector('.minutes').textContent = String(now.getMinutes()).padStart(2, '0');
}

// Bottom-left location text.
function renderLocation() {
  const photo = getPhoto(state.current?.key);
  $('location').textContent = photo ? photo.location || 'Untitled' : '';
}

function renderAll() {
  renderClock();
  renderGreeting();
  renderLocation();
  renderPopup();
  renderSettings();
  renderBackground();
}

// Drop image files anywhere: store them, show the first, open Settings > Photos.
function initDragAndDrop() {
  const hasFiles = (e) => e.dataTransfer?.types.includes('Files');
  let depth = 0;
  const setVisible = (on) => {
    $('uploader').classList.toggle('visible', on);
    document.body.classList.toggle('dragging', on);
  };
  window.addEventListener('dragenter', (e) => {
    if (!hasFiles(e)) return;
    depth += 1;
    setVisible(true);
  });
  window.addEventListener('dragleave', () => {
    depth = Math.max(0, depth - 1);
    if (!depth) setVisible(false);
  });
  window.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = hasFiles(e) ? 'copy' : 'none';
  });
  window.addEventListener('drop', async (e) => {
    e.preventDefault();
    depth = 0;
    setVisible(false);
    const keys = await addFiles([...(e.dataTransfer?.files || [])]);
    if (!keys.length) return;
    await setCurrent(keys[0]);
    openSettings('photos', 'custom');
  });
}

async function boot() {
  await loadState();
  renderClock();
  renderGreeting();
  await loadPhotos();
  await ensureCurrent();
  initPopup();
  initSettings();
  initDragAndDrop();
  subscribe(renderAll);
  renderAll();
  // Keep open tabs in sync so a stale tab never overwrites newer favorites/history.
  onOtherTabChange(async () => {
    await Promise.all([loadState(), loadPhotos()]);
    emit();
  });
  setInterval(() => {
    renderClock();
    tickGreeting();
  }, 1000);
}

boot();
