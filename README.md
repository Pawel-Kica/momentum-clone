# Momentum Lite

New tab with Momentum's clock, greeting and background photo, plus free custom photos. Fully offline.

## Install

1. Open `chrome://extensions`, turn on Developer mode.
2. Load unpacked, pick the `extension/` folder.
3. Open a new tab. After code changes, hit reload on the extension card.

## Photos

- Settings (bottom-left sliders icon) > Photos > Feeds picks the source: Nature photos (bundled, `extension/photos/stock.json`), My photos, or Favorites. Empty feeds fall back to Nature photos.
- Change photo: every new tab, every hour or every day (rolls over at 4:00). Each feed is walked in a saved shuffled order with no repeats until it runs out.
- Add your own with + Add Photo or by dropping images anywhere on the page. They are downscaled to 2560px and kept in IndexedDB, so they survive restarts but live only in this Chrome profile. Hover a tile to edit its location and credit, or delete it.
- Settings, favorites, history and rotation state are in `chrome.storage.local`. Open new tabs stay in sync over a BroadcastChannel.

## Tests

Headless Playwright Chromium with a temp profile, never your real Chrome:

```
NODE_PATH=$(npm root -g) node tests/e2e.cjs
```

Screenshots land in `/tmp/momentum-clone-shots/`.
