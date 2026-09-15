# Momentum clone spec

Source: Momentum 2.27.6, `~/Library/Application Support/Google/Chrome/Default/Extensions/laookkfknpbbblfpciffpaejjkokdgca/2.27.6_0/`. Every value comes from its CSS/JS unless marked "estimated".

Screenshot scale: CSS px = image px / 1.5, not /2. I checked this against known widths: the photo popup is `width:240` and measures ~358 image px, and the settings popup is `width:740` and measures ~1107 image px. At that scale the viewport is ~1707x886 CSS px, so the `max-height:820px` media query does not fire and the clock renders at 9.5rem. That matches the screenshots.

## Architecture (theirs)

- MV3, `chrome_url_overrides.newtab: index.html`, permissions `unlimitedStorage`, `offscreen`, `idle`. CSP `script-src 'self'`.
- Vite build, Vue 2 SFCs (scoped `data-v-*`) on top of legacy Backbone/jQuery/Handlebars "addins". The Photos settings panel is still Handlebars.
- State is synced to `api.momentumdash.com`. Backgrounds, favorites, history and custom uploads live on the server. localStorage and an IndexedDB key/value store (`keyValueDb:*`) act as a cache.
- 25 offline fallback photos ship in `backgrounds/*.jpg` with metadata in `backgrounds/backgrounds.json`.
- For the clone, drop the server: use `chrome.storage.local` for settings and IndexedDB for custom photo blobs.

## Tokens (copy as-is)

```css
:root {
  --font-family: -apple-system, BlinkMacSystemFont, Pretendard, "Helvetica Neue", Helvetica, Arial, sans-serif;
  --font-clock: 500 9.5rem var(--font-family);
  --font-size-greeting: 3.375rem;
  --font-xl: 500 1.5rem var(--font-family);
  --font-l: 500 1.125rem var(--font-family);
  --font-m: 500 1rem var(--font-family);
  --font-s: 400 .875rem var(--font-family);
  --font-s-bold: 500 .875rem var(--font-family);
  --font-xs: 400 .8125rem var(--font-family);
  --font-xs-label: 500 .8125rem var(--font-family);
  --spacing-1: .125rem; --spacing-2: .25rem; --spacing-3: .375rem; --spacing-4: .5625rem;
  --spacing-5: .9375rem; --spacing-6: 1.5rem; --spacing-7: 2.375rem; --spacing-8: 3.875rem;
  --radius-xs: .1875rem; --radius-s: .3125rem; --radius-m: .4375rem; --radius-l: .625rem; --radius-round: 1000rem;
  --app-padding: 21px; --header-height: 55px; --dash-side-margin: 15px; --app-edge-padding: .9375rem;
  --app-dash-padding: calc(var(--spacing-4) + var(--spacing-1)); /* 11px */
  --icon-size-title: 1.25rem;
  /* dark theme (used on the photo dashboard) */
  --color-base: 0 0% 100%;
  --color-text: hsl(var(--color-base));
  --color-stop-1: hsla(var(--color-base) / .07);
  --color-stop-2: hsla(var(--color-base) / .12);
  --color-stop-3: hsla(var(--color-base) / .3);
  --color-stop-4: hsla(var(--color-base) / .5);
  --color-stop-5: hsla(var(--color-base) / .7);
  --color-stop-6: hsla(var(--color-base) / .85);
  --color-bg-base: 0 0% 6%;
  --color-bg: hsl(var(--color-bg-base) / 85%);   /* popups, dropdowns, settings */
  --color-button: hsla(var(--color-base) / .3);
  --color-button-hover: hsla(var(--color-base) / .4);
  --a-curve: ease; --a-fast: .15s;
}
body { color:#fff; font-family:var(--font-family); overflow:hidden; user-select:none;
       text-shadow: 0px 1px 5px rgba(0,0,0,.1); }
.badge { margin-left:4px; padding:2px 3px; background:var(--color-stop-2); border-radius:var(--radius-xs);
         color:var(--color-stop-4); font-size:8px; font-weight:600; text-transform:uppercase; vertical-align:7%; }
```

Responsive rules:
```css
@media (max-height: 820px) { :root{--font-size-greeting:2.5rem} .clock .time{font-size:9rem} }
@media (max-height: 700px) { html{font-size:90%} }
@media (max-height: 600px) { :root{--font-size-greeting:2.25rem} .clock .time{font-size:8rem} }
@media (max-height: 450px) { .center .clock{display:none} }
```

## Fonts

- The default is the system font. On macOS that means SF Pro via `-apple-system`, which is what the screenshots show. No webfont loads there.
- Bundled fallback: `font/Pretendard-Variable.woff2` (`@font-face{font-family:Pretendard;src:url(/font/Pretendard-Variable.woff2) format("woff2-variations");font-weight:100 900;font-display:swap}`). Copy it only for non-Mac use.
- The other files in `font/` (Geist, Outfit, Fredoka, Bitter, SpaceGrotesk, BricolageGrotesque, GeistMono) back Plus font themes. Not needed.

## Layout

Full-screen CSS grid. Columns are `sidebar | 1fr | sidebar`. Rows are `top | center-above | center | center-below(1fr) | bottom`. For the clone, a flex column centered vertically with a bottom bar pinned to the bottom is enough. The clock sits at roughly 43-55% of viewport height and the greeting follows directly below it.

Each center widget uses a 3-column grid so the text stays centered and the "..." button hangs to its right:
```css
.three-col { display:grid; align-items:center; grid-template-columns:minmax(40px,1fr) minmax(0,auto) minmax(40px,1fr); }
.three-col .left { justify-self:end } .three-col .right { justify-self:start }
```

## Background

```css
.backgrounds { position:absolute; inset:0; z-index:-1; }
.background-item { position:absolute; inset:0; background-position:center center; background-repeat:no-repeat;
  background-size:cover; transform-origin:center; filter:brightness(1) blur(0px); }
.fade-enter-active      { animation: fadein .3s ease-out forwards }  /* first load */
.fade-slow-enter-active { animation: fadein 2s ease-out forwards }   /* switching to a different image */
@keyframes fadein { from{opacity:0} to{opacity:1} }
```
- The body background is `#212121`, the dark loading color. The image fades in on top of it.
- Photo contrast setting maps to brightness: default 1, low .9, high .75.
- Drag-over zooms the background with `scale:1.1` and shows the uploader overlay (see Photos).

### Overlay/vignette (pick one)

1. Fallback path, simplest. Full-screen PNG `docs/icons/overlay-vignette.png` (copied from `assets/png/overlay-vignette-D_W-diHy.png`):
   ```css
   .background-overlay { position:fixed; inset:0; z-index:2; pointer-events:none;
     background-image:url(overlay-vignette.png); background-size:100% 100%; transition:opacity .3s ease-out; }
   ```
2. What Chrome actually renders (anchor positioning supported). There is no vignette. Instead a soft black blurred blob sits behind each text widget, drawn twice:
   ```css
   .scrims-overlay  { opacity:.25; mix-blend-mode:overlay; }
   .scrims-multiply { opacity:.1;  mix-blend-mode:multiply; }
   .shadow { position:absolute; background:#000; filter:blur(40px);
             border-radius:calc(40% + 1.5rem); transition:opacity .5s ease; }
   /* inset relative to the text box: clock -30px on all sides, greeting -15px */
   ```
   For the clone, put a `.shadow` in each layer behind the clock and the greeting, absolutely positioned with those negative insets.

"Admire" mode: hover the bottom-left photo item for 3000ms. All widgets hide and `body.hide-overlay` sets overlay/scrims to opacity 0. Mouseleave or window blur restores them.

## Clock

```css
.clock .time { font: 500 9.5rem var(--font-family); letter-spacing: -0.25rem; line-height: 1.15;
               white-space: nowrap; cursor: default; text-align:center; margin:0; }
.clock .time .colon { position: relative; top: -.095em; }
```
Markup is `<span class="time"><span class="hours">10</span><span class="colon">:</span><span class="minutes">35</span></span>`.

- 24h is the default (`hour12clock` false). 12h drops the leading zero and shows no AM/PM in the big clock.
- The hour format toggle lives in the clock "..." dropdown as "24-hour clock" with a toggle, and in Settings > General > Formats & Units > "Time format" as `12-hour | 24-hour`.
- The clock's "..." button works like the greeting's, but its dropdown has min-width 230px. That dropdown is out of scope beyond the toggle.
- Update every second, or on minute boundaries.

## Greeting

```css
.greeting { font-weight:500; line-height:normal; text-align:center; margin:0; }
.greeting .content { display:inline; font-size: var(--font-size-greeting); }  /* 54px */
.name-punctuation-no-wrap { white-space:nowrap }
.greeting .name { max-width:min(100%,12em); display:inline-block; border-radius:var(--radius-s);
                  outline:none; overflow:hidden; vertical-align:top; white-space:nowrap; }
```

Text logic:
- Day part: `hour >= 4 && hour < 12` is morning, `12 <= hour < 17` is afternoon, everything else is evening. 4 is `dateRolloverHour`, so 0:00-3:59 counts as evening.
- With a name (and "Include name" on): `Good ${part}, ` + name + `.`. The period is omitted if the name already ends in `.`, `!` or `?`.
- Without a name: `Good ${part}` with no period.
- The content swaps with a `fade` (opacity .5s) when the text changes.

### "..." hover menu

- Button: lucide `ellipsis`, 24px, stroke 2.5px, placed in the right grid column with `margin-left: .5625rem`.
- `opacity:0` by default. Shown on `.greeting:hover` or while the dropdown is open. No transition declared.
- Button hover bg `--color-stop-2`, active bg `--color-stop-1`, round. Padding estimated 4px.
- Opens on click of the button. Double-clicking the greeting text also opens it. Click outside closes it.
- Open/close fade is 75ms opacity.

Dropdown (shared style for both menus):
```css
.dropdown { position:absolute; min-width:max-content; /* measured ~190px wide, estimated */
  background: var(--color-bg); color:#fff; text-shadow:none;
  border-radius: var(--radius-m);              /* 7px for dash dropdowns */
  box-shadow: 0 1px 8px #00000040;
  backdrop-filter: blur(25px) saturate(200%);
  padding: .375rem 0; font-size:.875rem; font-weight:400; max-height:60vh; overflow:auto; }
.dropdown-option { display:flex; align-items:center; gap:.5625rem; padding:.375rem .9375rem; cursor:pointer; }
.dropdown-option:hover { background: var(--color-stop-2); }
.dropdown-option .icon { width:13px; height:13px; opacity:.5; flex-shrink:0; }  /* BaseIcon default 13px, stroke 2px */
.dropdown-option .right { margin-left:auto; display:flex; align-items:center; gap:.125rem; }
.dropdown-divider { height:.0625rem; margin:.25rem 0; background:#fff; opacity:.12; }
```
Position: top-left sits just under the ellipsis, ~7px below. In the screenshot the menu's left edge is about 25px left of the dots (estimated).

Items in order:
1. `message-square-quote` "Show today's mantra". Skip it, or keep it hidden.
2. divider
3. `contact-round` "Include name", with a toggle on the right. Toggles `allowNameInGreeting`.
4. `pencil` "Edit your name". Turns "Include name" on if it was off, closes the menu, starts editing.

### Toggle switch

```css
.toggle-switch { --switch-bg: var(--color-stop-3); --height:17px; width:28px; height:var(--height);
  display:inline-flex; position:relative; flex-shrink:0; align-items:center; transition:all .1s ease;
  border-radius:1000rem; box-shadow: inset 0 0 0 1.5px var(--switch-bg); isolation:isolate; }
.toggle-switch.on { --switch-bg: var(--color-stop-6); background: var(--switch-bg); box-shadow:none; }
.toggle-switch::after { --size:11px; content:""; width:var(--size); height:var(--size); position:absolute; inset:0;
  margin: auto calc((var(--height) - var(--size)) / 1.75); transform: scale(.9090909091);
  transition: all .2s ease; border-radius:1000rem; background: var(--switch-bg); }
.toggle-switch.on::after { transform: translateX(10px) scale(1); background-color: hsl(0 0% 6%); }
/* when the parent row is hovered */
.row:hover .toggle-switch:not(.on) { --switch-bg: var(--color-stop-4); }
.row:hover .toggle-switch.on       { --switch-bg: #fff; }
```

### Name editing

It is not contenteditable. An `<input>` sits absolutely on top of a hidden `<span>` that mirrors the text, so the input auto-sizes to the name.
```html
<span class="name-wrapper"><span class="input-wrapper">
  <input class="name editing" spellcheck="false">
  <span class="name hidden-span">{tempName with spaces as &nbsp;}</span>
</span></span><span>.</span>
```
```css
.greeting .name-wrapper { position:relative; white-space:nowrap; }
.input-wrapper { margin:-5px -2px -8px; padding:5px 2px 8px; position:relative; }
.hidden-span { visibility:hidden; }
input.name { padding:0; position:absolute; inset:0; background:none; color:inherit; font:inherit; }
.greeting .name.editing, .greeting .hidden-span { min-width:2ch; }
.greeting .name.editing { border:none; font-weight:500; text-align:center;
  border-bottom:3px solid white; border-bottom-left-radius:0; border-bottom-right-radius:0; cursor:auto; }
```
Behavior:
- Start editing from the menu, or by double-clicking the name.
- On start, set `tempName = name`, focus the input and select all text. The name also pulses for 1s (skip this).
- Enter (keyup) or blur: trim. If non-empty, save as the display name. If empty, keep the old name. Either way, exit editing.
- Escape (keyup): revert and exit.
- While editing with an empty name the text still reads `Good morning, ` + input + `.`.

## Bottom-left bar

Two dash items sit side by side, pinned bottom-left: the Settings icon, then the photo location text.

Positions measured from the screenshot (estimated): icon center ~37px from the left and ~39px from the bottom; text starts ~72px from the left.

From CSS:
- Bottom-row items use `padding-top: 1.5rem` and `padding-bottom: calc(15px + 11px)`.
- `.app-dash` has `padding: 0 11px`. The first item gets `margin-left:15px` plus matching extra padding.
- Icon wrapper is `height: 1.5rem; display:flex; align-items:center`.

### Settings icon

- Icon `icon/apps/settings` (sliders, 24x24, stroke 2), rendered at `--icon-size: 1.5rem`. Files: `app-settings.svg`, and `app-settings-fill.svg` for when the panel is open.
- Color is `--color-stop-5` (70% white) unless hovered or open, then #fff. Transitions `all .5s ease`. There is no hover background on the icon itself.
- Click toggles the settings panel. Hotkey `,`.

### Photo location

This is the "location mode" item. It shows because text labels are "Always" on.
```css
.photo-info .dash-content { display:flex; align-items:center; gap:.5625rem; color: var(--color-stop-6);
  font: 400 .8125rem var(--font-family); }
.photo-info .dash-content p { margin:0; line-height:1.5rem; white-space:nowrap; cursor:pointer; }
.photo-info .dash-content.location-mode { --pill: 11px; position:relative; margin: calc(-1 * var(--pill));
  padding: var(--pill); transition: color .2s ease; }
.photo-info .dash-content.location-mode:not(.popup-active):hover { color:#fff; }
/* hover pill behind the text */
.app-dash-hover-bg { border-radius: var(--radius-m); }
.app-dash-hover-bg::after { content:""; position:absolute; inset:0; z-index:-1; opacity:0; scale:.95;
  transition: opacity .2s ease, scale .2s ease; border-radius: var(--radius-m);
  background-color: var(--color-stop-1);
  box-shadow: 0 2px 15px rgba(0 0 0 / 20%), inset 0 0 0 1.5px rgba(255 255 255 / 7%);
  backdrop-filter: blur(.5625rem); }
.app-dash-hover-bg:hover::after { opacity:1; scale:1; }
.app-dash-hover-bg.popup-active::after { opacity:0; }
```
- Text is the photo `title`, or "Untitled".
- Open/close is click, not hover. Click toggles the popup, click outside closes it.
- Hovering for 3000ms without clicking triggers admire mode (hide widgets and overlay). Opening the popup cancels the timer.
- Popup transition: `opacity .2s ease` plus `transform .2s ease` from `translateY(3px)`.

## Photo popup

App popup, `width:240px`.
- Opens above the bottom bar with its left edge 9px left of the location item (`left: calc(.5625rem * -1)`).
- Measured (estimated): left ~53px, bottom ~79px above the viewport bottom, height ~230px.

```css
.popup { position:absolute; width:240px; background: var(--color-bg); color:#fff; text-shadow:none;
  border-radius: var(--radius-l);                         /* 10px */
  box-shadow: 1px 1px 5px rgba(0,0,0,.3);
  backdrop-filter: blur(25px) saturate(200%); overflow:hidden; display:flex; flex-direction:column; }
.popup-header { height:55px; display:flex; align-items:center; padding-left:21px; }
.popup-header .title-icon { width:1.25rem; height:1.25rem; opacity:.85; margin-right:.5625rem; }  /* app-photo-info.svg */
.popup-header .title { font-size:18px; font-weight:500; white-space:nowrap; }
.popup-body { --dropdown-padding: 21px; margin-top:-.375rem; padding-bottom:.5625rem; }
.photo-meta { margin-bottom:.25rem; }
.photo-meta-title { padding:0 21px; color: var(--color-stop-6); font: 500 .875rem var(--font-family); }
.source-text { display:flex; align-items:center; gap:.375rem; padding:.375rem 21px; color: var(--color-stop-4);
  font: 500 .8125rem var(--font-family); cursor:pointer; transition: color .15s ease; }
.source-text:hover { color:#fff; }
.source-text .icon { width:13px; height:13px; }            /* external-link.svg */
.popup .dropdown-option { font: 400 .875rem var(--font-family); padding:.375rem 21px; }
```
Body in order:
- Location title.
- Photographer (`source`) with an `external-link` icon. Click opens `sourceUrl` in a new tab. If there is no URL, show plain text with no icon.
- divider
- `heart` "Favorite". When the photo is a favorite, it becomes `heart-off` "Unfavorite".
- `redo` "Skip to new photo". Momentum shows a PLUS badge here; drop it. While skipping the label reads "Skipping..." and the icon spins (`animation: spin 1s linear infinite`). There is a 15s safety timeout.
- divider
- `images` "Manage photos". Opens settings on the Photos tab.
- `settings` (gear) "Settings". Also opens settings on the Photos tab.

There is no close button visible in the header in the screenshot.

## Settings panel

App popup, `width:740px` (`max-width: calc(100vw - 14px)`).
```css
.settings-app { position:absolute; width:740px; height: calc(100vh - 150px); max-height:850px;
  display:flex; flex-direction:row; padding:0;
  background: var(--color-bg); backdrop-filter: blur(25px) saturate(200%);
  border-radius: 10px; box-shadow: 1px 1px 5px rgba(0,0,0,.3); overflow:hidden; }
```
- Position: opens upward from the settings icon. Measured left ~10px, top ~63px, bottom ~79px above the viewport bottom (estimated).
- Transition: same slide-up-fade .2s as the photo popup.
- The background shows through heavily. With blur(25px) saturate(200%) the photo reads as a warm dark blur.

### Nav (left)

```css
.nav { width:210px; flex-shrink:0; overflow-y:auto; display:flex; flex-direction:column; padding:1.5rem 0; }
.nav .item { padding:.375rem 1.5rem; font: 500 1rem var(--font-family); line-height:1.2; cursor:pointer; }
.nav .item:not(.active) { color: var(--color-stop-4); }
.nav .item:not(.active):hover { color: var(--color-stop-5); }
.nav .item:not(.active):hover:active, .nav .item.active { color:#fff; }
```
Clone items: General, Photos. Momentum also lists Focus Mode, Calendar, Tasks, Mantras, Quotes, Links & Bookmarks, Balance, Help, and bottom buttons. Skip all of those.

### Content (right)

```css
.content { flex-grow:1; overflow-y:auto; scrollbar-gutter:stable; }
.setting-panel { padding: 1.5rem 1.5rem calc(2.375rem + .5625rem) calc(1.5rem - .5625rem); display:flex; flex-direction:column; }
.setting-panel-title { font: 500 1.5rem var(--font-family); }
.setting-panel-description { padding-top:.125rem; color: var(--color-stop-5); font: 400 .875rem var(--font-family); }
.section { position:relative; margin-top:1.5rem; padding:.5625rem 0; border-radius: var(--radius-m); background: var(--color-stop-1); }
.section-header { position:relative; display:flex; align-items:center; justify-content:space-between;
  margin-bottom:.375rem; padding:.375rem .9375rem; font: 500 19px var(--font-family); }
.section-header::after { content:""; height:1px; position:absolute; left:.9375rem; right:.9375rem; bottom:0; background: var(--color-stop-2); }
.option { display:flex; align-items:center; justify-content:space-between; gap:.375rem; margin:0 .375rem;
  padding: calc(.5625rem + .25rem) .9375rem; border-radius: var(--radius-m); cursor:pointer; }
.option:hover { background: var(--color-stop-1); }
.option:hover:active { background: var(--color-stop-2); }
.option-label { font: 500 1rem var(--font-family); }
.option:has(.toggle-switch:not(.on)) .option-label { color: var(--color-stop-5); }
.option-description { margin-top:.125rem; color: var(--color-stop-4); font: 400 .875rem var(--font-family); text-wrap:balance; }
/* choice list like "12-hour | 24-hour" */
.options-list-row { display:flex; align-items:center; }
.options-list-option { font-size:.75rem; font-weight:700; }
.options-list-option label { padding:.25rem .375rem; cursor:pointer; }
.options-list-option .text { opacity:.5 } .options-list-option label:hover .text { opacity:.7 }
.options-list-option input:checked + label .text { opacity:1 }
.options-list-divider { width:.0625rem; margin:0 .3rem; align-self:stretch; opacity:.3; background:#fff; }
```

### General (clone subset)

- Header "General", description "Customize your dashboard".
- Section "Apps":
  - "Clock", description "Shows the time in the dashboard center", toggle `clockVisible`.
  - "Greeting", description "Personalized greeting in the center", toggle `greetingVisible`.
- Section "Formats & Units":
  - "Time format", choices `12-hour | 24-hour`.

### Photos

- Header row: title "Photos", description "See a new inspiring photo each day".
- Right of the header, a "Feeds" button: `.button.button-neutral`, `sliders-horizontal` icon + "Feeds" + 16px chevron `M6 9L12 15L18 9`.
  ```css
  .button { padding: .5625rem 1.5rem; border:none; border-radius:1000rem; font: 500 .875rem var(--font-family); line-height:normal; color:#fff; cursor:pointer; }
  .button-neutral { background: var(--color-stop-2); } .button-neutral:hover { background: hsla(0 0% 100% / .2); } .button-neutral:active { background: var(--color-stop-3); }
  .settings .button { --h-padding: .9375rem; }   /* Feeds pill: measured ~125x38px, estimated */
  ```
- Clicking Feeds expands a collapsible section, height transition `.3s` and content opacity `.3s`, chevron rotates 180deg.
  - Section header "Feeds".
  - Option "Momentum Photos", description "See a daily photo from our curated feed", toggle.
  - Option "My Photos", description "Add your own photos and change the photo anytime", toggle. Momentum shows PLUS here; drop it.
  - For the clone, "Momentum Photos" can be your stock feed.
- Subnav with tabs and the add button:
  ```css
  .settings-subnav { margin: 1.5rem -21px 0; padding: 0 21px 12px; display:flex; align-items:center; justify-content:space-between; }
  .settings-subnav h4 { margin:0; padding:12px 0; font-size:.8125rem; font-weight:600; text-transform:uppercase; white-space:nowrap; cursor:pointer; opacity:.6; }
  .settings-subnav h4 + h4 { padding-left:24px; }   /* 12px after + 12px before each tab */
  .settings-subnav h4:hover { opacity:.8 } .settings-subnav h4.active { opacity:1 }
  .list-add-button { min-width: calc(6.25rem + 1.5rem); text-align:center; white-space:nowrap; }
  ```
  - The screenshot tabs look ~14px (estimated) because the old `.settings h4{font-size:.875rem}` also applies. Use .875rem, 600, uppercase.
  - Tabs are MY PHOTOS, FAVORITES, HISTORY.
  - "+ Add Photo" is a primary `.button` with a hidden `<input type="file" multiple>` stretched over it (`position:absolute; opacity:0; z-index:2`).
  - Its color is the dark-navy pill in the screenshot, ~hsl(225 40% 30%) (estimated). The source uses `--color-button` tinted by the theme/photo accent. Hover darkens via `--color-button-hover`.
- Thumbnail grid:
  ```css
  .backgrounds-list { padding:2px; }
  .tile-list { display:grid; grid-gap:15px; grid-template-columns: repeat(4, 1fr); }
  .tile-list-item { height:70px; position:relative; cursor:pointer; overflow:hidden; transition: opacity .2s ease; }
  .tile-list-item::before, .tile-list-image { position:absolute; inset:0; }
  .tile-list-item::before { z-index:1; opacity:0; background:#fff; }
  .tile-list-item:hover::before { opacity:.2; }
  .tile-list-image { background: var(--color-stop-2) 50% 50% / cover no-repeat; border-radius: var(--radius-xs); }
  .tile-list-item:hover .tile-list-image { opacity:.8; }
  .tile-list-item.active { box-shadow: inset 0 0 0 1px #32cd32, 0 0 0 2px #32cd32; }   /* current photo, limegreen */
  .tile-list-actions { position:absolute; top:0; right:0; display:none; color:#fff; text-shadow:0 0 15px #000; }
  .tile-list-item:hover .tile-list-actions, .tile-list-item.active .tile-list-actions { display:inline-flex; }
  .tile-list-item.uploading { opacity:.4; pointer-events:none; }
  ```
  The screenshot tiles render ~87px tall, which suggests they may stretch with aspect ratio in this version. `aspect-ratio:16/10` matches it (estimated).
- Empty state:
  ```css
  .settings-empty { padding: 3.875rem 0; text-align:center; }
  .settings-empty-title { margin:0 0 6px; opacity:.85; font-size:1.125rem; font-weight:600; text-wrap:balance; }
  .settings-empty-description { margin:0; opacity:.7; font-size:.9375rem; text-wrap:balance; }
  ```
  - My Photos: title "Personalize your dashboard with your own photos", description "Drag and drop a photo or click + Add Photo".
  - Favorites: title "No favorite photos yet", description "Click the heart icon under a photo caption to start your collection".
- Clicking a tile makes it the active background.
- Skip the footer "Submit your photos" CTA.

### Drag and drop anywhere on the dashboard

- Listeners: `window` dragenter, dragleave, dragover and `document.body` dragover, drop.
- dragover: `dropEffect = 'copy'` if `dataTransfer.types` includes `Files`, otherwise `none`.
- dragenter with Files: show the overlay and set the background `scale:1.1`.
- dragleave on `document` or the original target: hide the overlay and reset scale.
- drop: accept only when some file matches `/\.(gif|jpg|jpeg|tiff|png)$/i`. Upload the files, set the first one active, then open Settings > Photos.
```css
.background-uploader { position:absolute; inset:0; z-index:1000000; display:flex; align-items:center; justify-content:center;
  opacity:0; transition: all .15s ease; background:#00000080; font-size:2rem; pointer-events:none; }
.background-uploader.visible { opacity:1; backdrop-filter: blur(10px); }
```
Overlay text: "Drop to upload backgrounds".

## Photo data, rotation, storage

Bundled item shape (`backgrounds/backgrounds.json`):
```json
{ "id":"f72e...", "filename":"backgrounds/f72e....jpg", "title":"Above Ho Chi Minh City, Vietnam",
  "source":"Kien Do", "sourceUrl":"https://unsplash.com/kiendo",
  "widgetColor":{"hsla":"hsla(188, 43%, 27%, 0.95)","bodyTextColor":"#fff"} }
```
Server items also carry `_id`, `forDate` ("YYYY-MM-DD"), `is_favorite`, `is_custom`, `thumbnail_url`, `preview_url`, `width`/`height`.

Rotation is daily, not per tab:
- The feed collection is keyed by date string. `getActiveItem()` returns `collection.get(getDateString())`.
- `getDateString()` subtracts a day when the hour is before 4, so the photo changes at 4:00 local.
- Every new tab that day shows the same photo.
- "Skip" asks the server for a replacement for today.
- Offline fallback picks randomly from the 25 bundled photos, excluding recently used fallbacks and recent history, then caches the choice in localStorage.
- Image load timeout is 4000ms before falling back.

Favorites, history and custom photos are all server-side in Momentum:
- `backgrounds/favorites` sorted by `last_updated` desc.
- History is past daily items, reverse sort, newest first.
- Custom uploads go to `settings/background/backgrounds`, then `POST settings/background/active` with `custom_background_id`. Locally the model keeps the `File` and reads a thumbnail via `FileReader.readAsDataURL`.

Suggested clone storage:
- `chrome.storage.local`:
  - `settings: {clockVisible, greetingVisible, hour12clock, allowNameInGreeting, displayname, feedStock, feedCustom}`.
  - `history: [{date:"YYYY-MM-DD", photoId}]`, newest first. Append once per day.
  - `favorites: [photoId]`.
  - `activeOverride: {date, photoId}`, set by skip or by clicking a tile.
- IndexedDB store `customPhotos`: `{id, blob, title:"", source:"", addedAt}`. Render with `URL.createObjectURL(blob)`.
- Active photo for the day: the override if its date is today, else the history entry for today, else pick a new one from the enabled feeds (custom and/or stock) avoiding the last N, and write it to history.

## Icons in `docs/icons/`

All are 24x24 viewBox using `currentColor`. They are Lucide unless noted.

- `app-settings.svg`, `app-settings-fill.svg`: bottom-left sliders icon (Momentum custom), outline and open state.
- `app-photo-info.svg`, `app-photo-info-fill.svg`: image icon for the popup header "Photo" (Momentum custom).
- `heart.svg`, `heart-off.svg`: Favorite / Unfavorite.
- `redo.svg`: Skip to new photo.
- `images.svg`: Manage photos.
- `settings.svg`: gear, Settings item.
- `external-link.svg`: photographer link.
- `ellipsis.svg`: "..." toggle. Momentum renders it with stroke 2.5px and a 1.05 normalize scale.
- `pencil.svg`, `contact-round.svg`, `message-square-quote.svg`: greeting menu.
- `sliders-horizontal.svg`: Feeds button.
- `chevron-down.svg`, `plus.svg`, `x.svg`, `image.svg`: utility.
- `overlay-vignette.png`: fallback vignette overlay.

Lucide icons render with `fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"`. In the dropdowns they are 13px at 50% opacity; the popup header icon is 20px at 85% opacity.
