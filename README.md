# Momentum Clone

A free Chrome new tab that looks just like Momentum: a big clock, "Good morning, Paweł." and a beautiful photo behind it. You can use your own photos, which Momentum only allows on Plus for $4.99 a month, or pick from 100 nature photos that come with it. It works offline and needs no account.

![New tab](docs/screenshots/1-new-tab.jpg)

## Install

1. Clone the repo:
   ```
   git clone git@github.com:Pawel-Kica/momentum-clone.git
   ```
2. In Chrome, go to `chrome://extensions` and turn on **Developer mode** (top right).
3. Click **Load unpacked** and pick the `extension` folder.
4. Open a new tab and you're done!

If you have the real Momentum installed, turn it off, because only one extension can take over the new tab.

## How to use

Click the sliders icon in the bottom-left corner.

**General:** show or hide the clock and greeting, 24-hour clock. Hover the greeting and click "..." to edit your name.

<img src="docs/screenshots/2-general.png" alt="General settings" width="380">

**Photos > My Photos:** click + Add Photo or drop images anywhere on the page. Hover a photo to edit its location or delete it.

<img src="docs/screenshots/3-my-photos.png" alt="My photos" width="380">

**Photos > Settings:** pick where photos come from, how often they change, and how they fit the screen.

<img src="docs/screenshots/4-photo-settings.png" alt="Photo settings" width="380">

Click the location text at the bottom left to favorite the photo or skip to the next one.

## Details

- Feeds: Nature photos, My photos or Favorites. An empty feed falls back to Nature photos.
- Change photo: every new tab, every hour, every 6-12 hours (default, random) or every day (at 4:00). No repeats until the feed runs out.
- Photo fit: Fill screen crops the photo, Fit to screen shows all of it over a blurred copy. Auto (default) fits when filling would crop more than 35%.
- Your photos are shrunk to 2560px and saved in this Chrome profile (IndexedDB). Removing the extension deletes them.
- Nature photos are from Wikimedia Commons, credits in `extension/photos/stock.json`.

## Tests

Headless Playwright Chromium with a temp profile, never your real Chrome:

```
NODE_PATH=$(npm root -g) node tests/e2e.cjs
```

Screenshots land in `/tmp/momentum-clone-shots/`.
