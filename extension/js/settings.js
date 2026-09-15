// Settings panel: General (widget toggles) and Photos (feeds, My Photos / Nature / Favorites / History grids).

import { state, setSetting, save } from './store.js';
import { icon } from './icons.js';
import { esc, toggle, dismissOnOutside } from './dom.js';
import { getPhoto, exists, customKeys, stockKeys, addFiles, setCurrent, showNext, updateCustom, deleteCustom, toggleFavorite, slotFor } from './photos.js';

const panel = document.getElementById('settings');
const toggleBtn = document.getElementById('settings-toggle');
const ui = { open: false, tab: 'general', photosTab: 'custom', feedsOpen: false, editingId: null };

const FEEDS = [
  ['stock', 'Nature photos', 'See a new photo from the curated nature feed'],
  ['custom', 'My photos', 'Add your own photos and change the photo anytime'],
  ['favorites', 'Favorites', 'Rotate through the photos you marked with a heart'],
];
const FREQUENCIES = [['tab', 'Every new tab'], ['hour', 'Every hour'], ['day', 'Every day']];

// Opens the panel on a tab ("general" | "photos"), optionally on a photos sub-tab.
export function openSettings(tab, photosTab) {
  Object.assign(ui, { open: true, tab, editingId: null }, photosTab && { photosTab });
  renderSettings();
}

export function closeSettings() {
  ui.open = false;
  ui.editingId = null;
  renderSettings();
}

// One settings row with label, description and a right-side control.
const option = (act, label, desc, control, extra = '') =>
  `<div class="option" ${act}><div><div class="option-label">${label}</div><div class="option-description">${desc}</div></div>${control}</div>${extra}`;

function generalPanel() {
  const s = state.settings;
  return `
    <div class="setting-panel">
      <div class="setting-panel-title">General</div>
      <div class="setting-panel-description">Customize your dashboard</div>
      <div class="section">
        <div class="section-header">Apps</div>
        ${option('data-setting="clockVisible"', 'Clock', 'Shows the time in the dashboard center', toggle(s.clockVisible))}
        ${option('data-setting="greetingVisible"', 'Greeting', 'Personalized greeting in the center', toggle(s.greetingVisible))}
        ${option('data-setting="hour12"', '24-hour clock', 'Show 14:30 instead of 2:30', toggle(!s.hour12))}
      </div>
    </div>`;
}

// Thumbnail tile; `actions` are extra buttons shown on hover.
function tile(key, actions = '') {
  const p = getPhoto(key);
  const active = state.current?.key === key ? ' active' : '';
  return `<div class="tile-list-item${active}" data-key="${esc(key)}" title="${esc(p.location || 'Untitled')}">
    <div class="tile-list-image" style="background-image:url('${esc(p.thumb)}')"></div>
    ${actions && `<div class="tile-list-actions">${actions}</div>`}
  </div>`;
}

function tileButton(act, name, title) {
  return `<button class="tile-action" data-act="${act}" title="${title}">${icon(name)}</button>`;
}

// Inline form for a custom photo's location and credit.
function editForm() {
  const p = getPhoto(`custom:${ui.editingId}`);
  if (!p) return '';
  return `
    <div class="section edit-photo">
      <div class="edit-thumb" style="background-image:url('${esc(p.thumb)}')"></div>
      <div class="edit-fields">
        <input data-field="location" placeholder="Location" value="${esc(p.location)}" spellcheck="false">
        <input data-field="photographer" placeholder="Photographer (optional)" value="${esc(p.photographer)}" spellcheck="false">
      </div>
      <div class="edit-actions">
        <button class="button button-neutral" data-act="cancel-edit">Cancel</button>
        <button class="button button-primary" data-act="save-edit">Save</button>
      </div>
    </div>`;
}

function photoGrid() {
  const t = ui.photosTab;
  const empty = (title, desc) =>
    `<div class="settings-empty"><p class="settings-empty-title">${title}</p><p class="settings-empty-description">${desc}</p></div>`;
  let keys;
  let actions;
  if (t === 'custom') {
    keys = customKeys();
    actions = tileButton('edit', 'pencil', 'Edit location') + tileButton('delete', 'x', 'Delete photo');
    if (!keys.length) return empty('Personalize your dashboard with your own photos', 'Drag and drop a photo or click + Add Photo');
  } else if (t === 'stock') {
    keys = stockKeys();
    actions = '';
  } else if (t === 'favorites') {
    keys = state.favorites.filter(exists);
    actions = tileButton('unfavorite', 'x', 'Remove from favorites');
    if (!keys.length) return empty('No favorite photos yet', 'Click the heart icon under a photo caption to start your collection');
  } else {
    keys = state.history.filter(exists);
    actions = '';
    if (!keys.length) return empty('No history yet', 'Photos you have seen will show up here');
  }
  return `${t === 'custom' && ui.editingId ? editForm() : ''}
    <div class="backgrounds-list"><div class="tile-list">${keys.map((k) => tile(k, actions)).join('')}</div></div>`;
}

function photosPanel() {
  const { feed, frequency } = state.settings;
  const tabs = [['custom', 'My Photos'], ['stock', 'Nature'], ['favorites', 'Favorites'], ['history', 'History']];
  const choices = FREQUENCIES.map(([v, label], i) =>
    `${i ? '<span class="options-list-divider"></span>' : ''}<button class="options-list-option${frequency === v ? ' active' : ''}" data-frequency="${v}">${label}</button>`).join('');
  return `
    <div class="setting-panel">
      <div class="panel-header-row">
        <div>
          <div class="setting-panel-title">Photos</div>
          <div class="setting-panel-description">See a new inspiring photo each day</div>
        </div>
        <button class="button button-neutral feeds-button${ui.feedsOpen ? ' open' : ''}" data-act="feeds">${icon('sliders')}<span>Feeds</span>${icon('chevron')}</button>
      </div>
      <div class="collapsible${ui.feedsOpen ? ' open' : ''}"><div>
        <div class="section">
          <div class="section-header">Feeds</div>
          ${FEEDS.map(([v, label, desc]) => option(`data-feed="${v}"`, label, desc, toggle(feed === v))).join('')}
          ${option('', 'Change photo', 'How often a new photo appears', `<div class="options-list-row">${choices}</div>`)}
        </div>
      </div></div>
      <div class="settings-subnav">
        <div class="subnav-tabs">${tabs.map(([v, label]) => `<h4 class="${ui.photosTab === v ? 'active' : ''}" data-photos-tab="${v}">${label}</h4>`).join('')}</div>
        <label class="button button-primary list-add-button">+ Add Photo<input type="file" accept="image/*" multiple></label>
      </div>
      ${photoGrid()}
    </div>`;
}

// Renders the panel, keeping the content scroll position.
export function renderSettings() {
  panel.classList.toggle('open', ui.open);
  toggleBtn.classList.toggle('open', ui.open);
  toggleBtn.innerHTML = icon(ui.open ? 'appSettingsFill' : 'appSettings');
  if (!ui.open && panel.firstChild) return;
  if (panel.querySelector('.edit-photo input:focus')) return; // don't clobber typing
  const scroll = panel.querySelector('.content')?.scrollTop || 0;
  const nav = [['general', 'General'], ['photos', 'Photos']]
    .map(([v, label]) => `<div class="item${ui.tab === v ? ' active' : ''}" data-tab="${v}">${label}</div>`).join('');
  panel.innerHTML = `<nav class="nav">${nav}</nav><div class="content">${ui.tab === 'general' ? generalPanel() : photosPanel()}</div>`;
  panel.querySelector('.content').scrollTop = scroll;
}

// Reads the edit form and saves it.
function saveEdit() {
  const val = (f) => panel.querySelector(`.edit-photo [data-field="${f}"]`).value.trim();
  const id = ui.editingId;
  ui.editingId = null;
  document.activeElement?.blur();
  updateCustom(id, { location: val('location'), photographer: val('photographer') });
}

// Handles every click inside the panel via data attributes.
async function onClick(e) {
  const t = e.target;
  const d = (sel) => t.closest(sel);
  if (d('[data-tab]')) return openSettings(d('[data-tab]').dataset.tab);
  if (d('[data-photos-tab]')) return openSettings('photos', d('[data-photos-tab]').dataset.photosTab);
  if (d('[data-setting]')) {
    const { setting } = d('[data-setting]').dataset;
    return setSetting(setting, !state.settings[setting]);
  }
  if (d('[data-feed]')) {
    const { feed } = d('[data-feed]').dataset;
    if (feed === state.settings.feed) return;
    await save({ settings: { ...state.settings, feed } });
    return showNext();
  }
  if (d('[data-frequency]')) {
    // Keep today's photo; the new frequency applies from the next period.
    const { frequency } = d('[data-frequency]').dataset;
    return save({ settings: { ...state.settings, frequency }, current: state.current && { ...state.current, slot: slotFor(frequency) } });
  }
  const act = d('[data-act]')?.dataset.act;
  const key = d('[data-key]')?.dataset.key;
  if (act === 'feeds') {
    ui.feedsOpen = !ui.feedsOpen;
    d('[data-act]').classList.toggle('open', ui.feedsOpen);
    panel.querySelector('.collapsible').classList.toggle('open', ui.feedsOpen);
    return;
  }
  if (act === 'delete') return deleteCustom(key.slice(7));
  if (act === 'unfavorite') return toggleFavorite(key);
  if (act === 'edit') {
    ui.editingId = key.slice(7);
    renderSettings();
    return panel.querySelector('.edit-photo input')?.focus();
  }
  if (act === 'cancel-edit') {
    ui.editingId = null;
    return renderSettings();
  }
  if (act === 'save-edit') return saveEdit();
  if (key) return setCurrent(key);
}

export function initSettings() {
  toggleBtn.addEventListener('click', () => (ui.open ? closeSettings() : openSettings(ui.tab)));
  panel.addEventListener('click', onClick);
  panel.addEventListener('change', async (e) => {
    if (e.target.type !== 'file') return;
    const keys = await addFiles([...e.target.files]);
    if (keys.length) {
      ui.photosTab = 'custom';
      await setCurrent(keys[0]);
    }
  });
  panel.addEventListener('keydown', (e) => {
    if (!e.target.closest('.edit-photo')) return;
    if (e.key === 'Enter') saveEdit();
    if (e.key === 'Escape') {
      e.stopPropagation();
      ui.editingId = null;
      e.target.blur();
      renderSettings();
    }
  });
  dismissOnOutside(() => [panel, toggleBtn], () => ui.open, closeSettings);
}
