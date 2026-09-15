// Headless end-to-end test of the extension. Run: NODE_PATH=$(npm root -g) node tests/e2e.cjs
// Uses Playwright Chromium with a temp profile; never touches the real Chrome.
// Screenshots go to /tmp/momentum-clone-shots/.

const { chromium } = require('playwright');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'extension');
const SHOTS = '/tmp/momentum-clone-shots';
fs.mkdirSync(SHOTS, { recursive: true });

let failures = 0;
function check(name, ok, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${ok ? '' : `  ${detail}`}`);
  if (!ok) failures++;
}

// Uses extension/ as-is when stock.json exists, else a /tmp copy with a fixture stock.json.
function prepareExtension() {
  if (fs.existsSync(path.join(SRC, 'photos/stock.json'))) return SRC;
  const dir = '/tmp/momentum-clone-ext';
  execSync(`rm -rf ${dir} && cp -R "${SRC}" ${dir}`);
  const ids = fs.readdirSync(path.join(dir, 'photos/stock/thumbs')).map((f) => f.replace('.jpg', ''))
    .filter((id) => fs.existsSync(path.join(dir, `photos/stock/${id}.jpg`))).slice(0, 12);
  const json = ids.map((id) => ({ id, file: `photos/stock/${id}.jpg`, thumb: `photos/stock/thumbs/${id}.jpg`,
    location: `Fixture Place ${id}, Canada`, photographer: `Photographer ${id}`, photographerUrl: 'https://example.com/p',
    sourceUrl: `https://example.com/photo/${id}`, license: 'CC BY-SA 4.0' }));
  fs.writeFileSync(path.join(dir, 'photos/stock.json'), JSON.stringify(json));
  console.log(`fixture stock.json with ${ids.length} photos in ${dir}`);
  return dir;
}

async function launch(ext) {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'mc-profile-'));
  return chromium.launchPersistentContext(profile, {
    headless: true, channel: 'chromium', viewport: { width: 1707, height: 890 }, deviceScaleFactor: 1.5,
    // --hide-scrollbars mimics Mac overlay scrollbars so shots compare fairly with Momentum's
    args: [`--disable-extensions-except=${ext}`, `--load-extension=${ext}`, '--hide-scrollbars'],
  });
}

const state = (page) => page.evaluate(() => chrome.storage.local.get(null));
const text = (page, sel) => page.locator(sel).innerText();

async function newTab(ctx, time) {
  const page = await ctx.newPage();
  page.on('console', (m) => m.type() === 'error' && check('no console error', false, m.text()));
  page.on('pageerror', (e) => check('no page error', false, e.message));
  if (time) await page.clock.setFixedTime(new Date(time));
  await page.goto('chrome://newtab');
  await page.waitForSelector('.background-item');
  await page.waitForTimeout(400);
  return page;
}

(async () => {
  const ext = prepareExtension();
  const ctx = await launch(ext);
  const photoJpgs = fs.readdirSync(path.join(ext, 'photos/stock')).filter((f) => f.endsWith('.jpg')).slice(0, 2)
    .map((f) => path.join(ext, 'photos/stock', f));

  // 1-2. Background, clock, title
  let page = await newTab(ctx, '2026-09-15T10:35:00');
  check('title is New Tab', (await page.title()) === 'New Tab');
  check('clock 24h', (await text(page, '.clock .time')) === '10:35', await text(page, '.clock .time'));
  check('greeting without name', (await text(page, '.greeting .content')) === 'Good morning.', await text(page, '.greeting .content'));
  const bgColor = await page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor);
  check('dark loading background', bgColor === 'rgb(33, 33, 33)', bgColor);
  const manifest = JSON.parse(fs.readFileSync(path.join(ext, 'manifest.json'), 'utf8'));
  check('manifest icons exist', Object.values(manifest.icons).every((f) => fs.existsSync(path.join(ext, f))));
  // Momentum text scaling: 152/54px, then 144/40px under 820px height
  const sizes = () => page.evaluate(() => [
    getComputedStyle(document.querySelector('.clock .time')).fontSize, getComputedStyle(document.querySelector('.greeting-line')).fontSize].join(' '));
  check('clock/greeting size at 890px', (await sizes()) === '152px 54px', await sizes());
  await page.setViewportSize({ width: 1280, height: 720 });
  check('clock/greeting size at 720px', (await sizes()) === '144px 40px', await sizes());
  await page.setViewportSize({ width: 1707, height: 890 });
  await page.screenshot({ path: `${SHOTS}/01-home-noname.png` });

  // 3. Greeting menu and name editing
  await page.hover('.greeting .content');
  await page.click('.more-btn');
  check('menu has no mantra', !(await page.locator('.menu').innerText()).includes('mantra'));
  await page.click('[data-act="edit"]');
  await page.keyboard.type('Paweł');
  await page.keyboard.press('Enter');
  check('name saved', (await text(page, '.greeting .content')) === 'Good morning, Paweł.', await text(page, '.greeting .content'));
  check('name persisted', (await state(page)).settings.name === 'Paweł');
  await page.dblclick('.greeting .name');
  await page.keyboard.type('Nope');
  await page.keyboard.press('Escape');
  check('Esc reverts name', (await text(page, '.greeting .content')) === 'Good morning, Paweł.');
  await page.dblclick('.greeting .name');
  await page.keyboard.type('   ');
  await page.keyboard.press('Enter');
  check('blank name keeps old', (await text(page, '.greeting .content')) === 'Good morning, Paweł.');
  await page.dblclick('.greeting .name');
  await page.keyboard.type('x'.repeat(80));
  const inputW = await page.locator('input.name').evaluate((el) => el.offsetWidth / parseFloat(getComputedStyle(el).fontSize));
  check('long name input capped at 12em', inputW <= 12.1, inputW);
  await page.keyboard.press('Escape');
  await page.hover('.greeting .content');
  await page.click('.more-btn');
  await page.click('[data-act="include"]');
  check('include name off', (await text(page, '.greeting .content')) === 'Good morning.');
  await page.click('[data-act="include"]');
  await page.mouse.move(1340, 560);
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${SHOTS}/02-greeting-menu.png` });
  await page.mouse.click(300, 300);
  check('menu closes on outside click', !(await page.locator('#greeting').evaluate((el) => el.classList.contains('menu-open'))));

  // 4. Photo popup
  const before = (await state(page)).current.key;
  await page.click('#location');
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${SHOTS}/03-photo-popup.png` });
  const loc = await text(page, '#location');
  check('popup shows location', (await text(page, '.photo-meta-title')) === loc);
  const href = await page.locator('.source-text').getAttribute('href');
  check('photographer links out in new tab', !!href && (await page.locator('.source-text').getAttribute('target')) === '_blank', href);
  await page.click('[data-act="fav"]');
  check('favorite saved', (await state(page)).favorites.includes(before));
  check('favorited reads Unfavorite', (await text(page, '[data-act="fav"]')) === 'Unfavorite');
  // Another open tab must pick up the change, so its own saves don't drop it
  const other = await newTab(ctx);
  await other.click('#location');
  await other.click('[data-act="skip"]');
  await other.click('[data-act="fav"]');
  await page.waitForTimeout(300);
  check('favorites synced across tabs', (await state(page)).favorites.length === 2 && (await text(page, '#location')) === (await text(other, '#location')));
  await other.close();
  await page.click('[data-act="skip"]');
  await page.waitForTimeout(100);
  const afterSkip = (await state(page)).current.key;
  check('skip changes photo', afterSkip !== before, afterSkip);
  check('no PLUS badge', !(await page.locator('.photo-popup').innerText()).includes('PLUS'));
  await page.keyboard.press('Escape');
  check('Esc closes popup', !(await page.locator('.photo-popup').evaluate((el) => el.classList.contains('open'))));

  // Admire mode
  await page.hover('#location');
  await page.waitForTimeout(3300);
  check('admire mode after 3s hover', await page.evaluate(() => document.body.classList.contains('admire')));
  await page.mouse.move(800, 400);
  check('admire mode ends on leave', !(await page.evaluate(() => document.body.classList.contains('admire'))));

  // 5. Settings: Manage photos and Settings both open the Photos tab
  await page.click('#location');
  await page.click('[data-act="settings"]');
  await page.waitForTimeout(300); // innerText is empty while the panel fades in from visibility:hidden
  check('popup Settings opens Photos', (await text(page, '.nav .item.active')) === 'Photos');
  await page.click('[data-tab="general"]');
  await page.keyboard.press('Escape');
  await page.click('#location');
  await page.click('[data-act="manage"]');
  await page.waitForTimeout(300);
  check('settings opens on Photos', (await text(page, '.nav .item.active')) === 'Photos');
  await page.screenshot({ path: `${SHOTS}/04-photos-empty.png` });

  // 6. Upload custom photos (a non-image file is ignored)
  const txtFile = path.join(os.tmpdir(), 'mc-notes.txt');
  fs.writeFileSync(txtFile, 'not an image');
  await page.setInputFiles('.list-add-button input', [...photoJpgs, txtFile]);
  await page.waitForFunction(() => document.querySelectorAll('.tile-list-item').length === 2, null, { timeout: 15000 });
  let s = await state(page);
  check('uploaded photo becomes current', s.current.key.startsWith('custom:'), s.current.key);
  check('default location is file name', (await text(page, '#location')) === path.basename(photoJpgs[0], '.jpg'), await text(page, '#location'));
  const rec = await page.evaluate(async () => {
    const db = await new Promise((r) => { const q = indexedDB.open('momentum-clone'); q.onsuccess = () => r(q.result); });
    const all = await new Promise((r) => { const q = db.transaction('photos').objectStore('photos').getAll(); q.onsuccess = () => r(q.result); });
    const b = await createImageBitmap(all[0].blob);
    const t = await createImageBitmap(all[0].thumb);
    return { n: all.length, full: Math.max(b.width, b.height), thumb: Math.max(t.width, t.height), type: all[0].blob.type };
  });
  check('blobs downscaled to <=2560 / 480 jpeg', rec.n === 2 && rec.full <= 2560 && rec.thumb <= 480 && rec.type === 'image/jpeg', JSON.stringify(rec));
  check('current tile outlined', (await page.locator('.tile-list-item.active').count()) === 1);

  // Edit location
  const first = page.locator('.tile-list-item').first();
  await first.hover();
  await first.locator('[data-act="edit"]').click();
  await page.fill('.edit-photo [data-field="location"]', 'Kraków, Poland');
  await page.fill('.edit-photo [data-field="photographer"]', 'Paweł');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(100);
  const firstKey = await first.getAttribute('data-key');
  if (firstKey === s.current.key) check('edited location shown bottom-left', (await text(page, '#location')) === 'Kraków, Poland', await text(page, '#location'));
  await page.locator('.tile-list-item').nth(1).hover();
  await page.screenshot({ path: `${SHOTS}/05-my-photos.png` });

  // Favorite a custom photo, then delete it: references must go
  await page.click(`.tile-list-item[data-key="${s.current.key}"]`);
  await page.mouse.click(1500, 300); // close settings
  await page.click('#location');
  await page.click('[data-act="fav"]');
  await page.keyboard.press('Escape');
  const delKey = (await state(page)).current.key;
  await page.click('#settings-toggle');
  await page.click('[data-tab="photos"]');
  const tileDel = page.locator(`.tile-list-item[data-key="${delKey}"]`);
  await tileDel.hover();
  await tileDel.locator('[data-act="delete"]').click();
  await page.waitForTimeout(200);
  s = await state(page);
  check('delete removes from favorites/history/current', !s.favorites.includes(delKey) && !s.history.includes(delKey) && s.current.key !== delKey);
  check('one custom tile left', (await page.locator('.tile-list-item').count()) === 1);

  // Nature, Favorites + History tabs
  await page.click('[data-photos-tab="stock"]');
  check('nature tab lists all 100 stock photos', (await page.locator('.tile-list-item').count()) === 100);
  await page.screenshot({ path: `${SHOTS}/06-nature.png` });
  await page.click('[data-photos-tab="favorites"]');
  check('favorites tab lists stock favorites', (await page.locator('.tile-list-item').count()) === s.favorites.length && s.favorites.length === 2);
  await page.click('[data-photos-tab="history"]');
  check('history newest first', (await page.locator('.tile-list-item').first().getAttribute('data-key')) === s.history[0]);
  await page.screenshot({ path: `${SHOTS}/06-history.png` });

  // Feeds: choose My photos, frequency every tab
  await page.click('[data-act="feeds"]');
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${SHOTS}/07-feeds.png` });
  await page.click('[data-feed="custom"]');
  s = await state(page);
  check('feed custom shows custom photo', s.settings.feed === 'custom' && s.current.key.startsWith('custom:'), s.current.key);
  await page.click('[data-frequency="tab"]');
  check('frequency saved', (await state(page)).settings.frequency === 'tab');

  // General settings
  await page.click('[data-tab="general"]');
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${SHOTS}/08-general.png` });
  await page.click('[data-setting="clockVisible"]');
  check('clock hidden', await page.locator('#clock').isHidden());
  await page.click('[data-setting="clockVisible"]');
  await page.click('[data-setting="hour12"]');
  check('12h clock saved', (await state(page)).settings.hour12 === true);
  await page.keyboard.press('Escape');
  check('Esc closes settings', !(await page.locator('#settings').evaluate((el) => el.classList.contains('open'))));
  await page.close();

  // Rotation: 12h afternoon, stock feed without repeats, day persistence and 4:00 rollover
  page = await newTab(ctx, '2026-09-15T14:05:00');
  check('afternoon + 12h', (await text(page, '.clock .time')) === '2:05' && (await text(page, '.greeting .content')) === 'Good afternoon, Paweł.');
  const rot = await page.evaluate(async () => {
    const photos = await import('/js/photos.js');
    const { state, save } = await import('/js/store.js');
    await save({ queues: {}, settings: { ...state.settings, feed: 'stock', frequency: 'day' } });
    const n = photos.stockKeys().length;
    const seen = [];
    for (let i = 0; i < n; i++) { await photos.showNext(); seen.push(state.current.key); }
    await photos.showNext();
    return { n, unique: new Set(seen).size, wrapNoRepeat: state.current.key !== seen[n - 1] };
  });
  check('stock feed cycles without repeats', rot.unique === rot.n && rot.wrapNoRepeat, JSON.stringify(rot));
  const dayKey = (await state(page)).current.key;
  await page.close();
  page = await newTab(ctx, '2026-09-16T03:30:00');
  check('same photo before 4:00 rollover', (await state(page)).current.key === dayKey);
  check('evening at 3:30', (await text(page, '.greeting .content')).startsWith('Good evening'));
  await page.close();
  page = await newTab(ctx, '2026-09-16T04:10:00');
  check('new photo after 4:00', (await state(page)).current.key !== dayKey);

  // Favorites feed falls back to stock when empty; custom feed falls back when no custom photos
  await page.evaluate(async () => {
    const { state, save } = await import('/js/store.js');
    await save({ favorites: [], settings: { ...state.settings, feed: 'favorites' } });
    await (await import('/js/photos.js')).showNext();
  });
  check('empty favorites falls back to stock', (await state(page)).current.key.startsWith('stock:'));

  // Drag and drop upload
  await page.evaluate(async (url) => {
    const blob = await (await fetch(url)).blob();
    const dt = new DataTransfer();
    dt.items.add(new File([blob], 'Dropped Place.jpg', { type: 'image/jpeg' }));
    window.dispatchEvent(new DragEvent('dragenter', { dataTransfer: dt, bubbles: true }));
    document.body.dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true }));
  }, 'photos/stock/' + path.basename(photoJpgs[1]));
  await page.waitForFunction(() => document.getElementById('location').textContent === 'Dropped Place', null, { timeout: 15000 });
  await page.waitForSelector('#settings.open');
  check('drop adds photo and opens Photos', (await text(page, '.nav .item.active')) === 'Photos');

  await page.close();
  await ctx.close();
  console.log(failures ? `\n${failures} failure(s)` : '\nall passed');
  process.exit(failures ? 1 : 0);
})();
