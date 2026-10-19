# byuwur/stream.html

![stream.html preview](prev.jpg)

Browser overlays for your stream. Configure a tool and copy its URL into OBS. Free. Forever. No account, upload, install, or build step.

[Open stream.html](https://byuwur.github.io/stream.html/) · [Configurator demo](https://byuwur.github.io/stream.html/configurator.html)

## Ready to use

| Tool                                                           | Purpose                                                                         | Local entry point       |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------- | ----------------------- |
| [Controller](https://byuwur.github.io/stream.html/controller/) | Gamepad/keyboard input with Xbox, PlayStation, fight-stick, and GameCube skins. | `controller/index.html` |
| [Social popup](https://byuwur.github.io/stream.html/popup/)    | Animated accounts with 90+ platforms, fonts, colors, and timing.                | `popup/index.html`      |
| [Main scene](https://byuwur.github.io/stream.html/main/)       | Starting/BRB/ending scenes with branding, countdown, accounts, and schedule.    | `main/index.html`       |

Open a tool, adjust its fields, check the preview, then **Copy URL** into an OBS **Browser** source with **Local file** unchecked. Use **1920 × 1080** for Main; size Controller/Popup to your layout.

## Settings stay in the URL

- Bare folder/`index.html` URLs open the editor; query settings without a hash render the overlay.
- Press **F2** to switch between the configurator and its current overlay, or append `#configure` to edit a link. In OBS, use **Interact** first. F2 is ignored in preview frames, with modifiers/repeats, and while typing in overlay controls.
- In the configurator, press **F1** to open **About**.
- Form edits and same-tool URL edits apply after a 250 ms pause via SPA.js's shared `debounce()`, updating the form and preview in place. **Enter** or leaving the changed URL field applies immediately; links to another tool navigate then.
- Editing keeps the browser address unchanged. **Copy URL** shares the current overlay settings. Bare tool URLs resume the saved configuration; explicit query settings take priority, including on reload.
- **Reset** restores the settings, list order, and compression choices from when the page opened, including after direct URL edits.
- Invalid form values keep the last valid preview and stop URL generation. Invalid/unknown URL values retain defaults; empty text clears a field.

The form handles encoding and list add/edit/reorder/remove. Colors use 3/4/6/8 hex digits without `#`, including alpha: `fontColor=fff`, `backgroundColor=00000000`. Runtime restores `#`; older encoded hashes work. Malformed colors pass to CSS; RGB/HSL/named colors are outside the contract.

Fonts include 350 Google families, system fonts, and installed families/CSS stacks. Fonts and visible samples load on demand; OBS needs access to the chosen font or uses the tool's fallback. Theme preference is local; explicit motion Off/None/Static settings apply.

Media fields reference public HTTP(S) URLs or paths relative to the tool HTML. Local file URLs need downloaded use. No uploads or Base64 `data:` media. Keep private information out of shared URLs.

### Keyboard shortcuts

About includes the shortcut reference. Focus the configurator to use these:

| Shortcut            | Action                                          |
| ------------------- | ----------------------------------------------- |
| `F1`                | Open About.                                     |
| `F2`                | Switch between configurator and overlay.        |
| `Alt+Shift+P`       | Open Parameters.                                |
| `Alt+Shift+A`       | Open Advanced options.                          |
| `Alt+Shift+O`       | Open the current overlay in a new tab.          |
| `Alt+Shift+C`       | Copy the overlay URL.                           |
| `Alt+Shift+U`       | Focus and select the overlay URL.               |
| `Alt+Shift+M`       | Open the tool picker.                           |
| `Esc`               | Close the current dialog, popover, or dropdown. |
| `Tab` / `Shift+Tab` | Move between controls.                          |

`F2` switches modes on standalone pages and is ignored inside previews. F3/F4 retain browser actions. Modified or repeated function keys, repeated shortcuts, and IME composition are ignored.

### Shorter URLs

Open **Advanced** from the toolbar gear or footer. Compression is raw DEFLATE plus unpadded Base64url; the panel shows length/savings and keeps the readable URL when shorter.

Form values, expanded sections, and Advanced options are remembered per resource. Only valid form values are saved, using the generated query's chosen compression format and readable fallback. Small configurations use a one-year cookie scoped to the resource folder; larger configurations, blocked cookies, and `file://` copies use local storage. Explicit URL settings and compression formats take priority. Overlays use their URL only; invalid or unavailable storage leaves editing usable.

| Mode            | URL representation                                                                                                  |
| --------------- | ------------------------------------------------------------------------------------------------------------------- |
| All settings    | `?data=<compressed ordinary query string>`; readable parameters alongside it override packed values.                |
| Selected fields | `?accounts=dr:<token>&mode=left`; checked fields compress independently and keep their names. Others stay editable. |

Plain values need no marker. Escape literal text starting with `dr:` or `raw:` as `raw:<original text>`; generated links do this automatically. `#configure` restores compression choices. Invalid compressed fields retain defaults without discarding valid neighbors; Advanced shows a warning.

Whole-query decoding is capped at one MiB. Individual values use the field's UTF-8 text limit, allowing up to four bytes per character, capped at one MiB. Media remains referenced by URL.

Each tool imports [SPA.js v20.6 `_functions.js`](https://cdn.jsdelivr.net/gh/byuwur/spa.js@v20.6/_functions.js) with a regular HTML script tag before `configurator.js`. For offline use, save the helper and update its `src`. These helpers need no jQuery/SPA initialization. Browsers without native raw-DEFLATE support can use readable links.

### Downloaded use

Keep the tool folder plus parent `configurator.js`/`configurator.css`; a single HTML file is not a bundle. Open `{tool}/index.html` and paste its generated `file:///.../index.html?...` URL into OBS with **Local file** unchecked. Keep those paths stable. Hosted links use tool directories.

Pages import jQuery, Popper, Bootstrap, Select2, Pickr, and common assets directly in HTML, pinned to `spa.js@v20.5`. Editor setup runs only in configure mode; renderers use native JavaScript. Main/Popup also use GSAP and Popup uses MorphSVG. Font-enabled pages use native `byFont`. Offline use requires saved CDN dependencies and updated `src`/`href` paths.

### Older URLs

Replace `controller.html`, `popup.html`, or `main.html` with its tool folder, preserving parameters. Rebuild retired settings in the form: Controller `scale`; Popup pixel font/offset aliases, per-platform handles/account counts; Main scene `mode`, `showBG`, `hideCountdown`, and weekday fields.

## Controller

![Controller preview](controller/prev.jpg)

[Example: Player 1, Xbox](https://byuwur.github.io/stream.html/controller/?player=1&skin=1)

| Parameter            | Meaning                                                                             |
| -------------------- | ----------------------------------------------------------------------------------- |
| `player`             | Gamepads `1`–`4` (default `1`); keyboard `9`.                                       |
| `skin`               | `1` Xbox, `2` PlayStation, `3` fight stick, `4` GameCube.                           |
| `opacity`            | `0`–`1`.                                                                            |
| `offset`, `deadzone` | Stick travel in pixels; deadzone threshold.                                         |
| `strength`, `curve`  | `strength=0` disables trigger meters; `curve=1` enables stick curving.              |
| `rotation`           | Maximum steering-wheel rotation in degrees.                                         |
| `mapping`            | Custom Mapping binding array; `[]` uses defaults. Legacy `{"mapping":[...]}` works. |

Press a gamepad button for detection or **F** for keyboard input. Focus the preview/OBS Interact first. Defaults live in `bySettingsKB` in `controller/index.html`; detection depends on browser/OS. **Custom Mapping** chooses a base and captures bindings. Skins fit the viewport with `0.5rem` vertical margins.

## Social popup

![Social popup preview](popup/prev.jpg)

Choose platforms, handles, and order. Repeated platforms are allowed. Brand icons use a globe fallback.

| Parameter                                                | Meaning                                                                                                                         |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `mode`                                                   | `right` (default) or `left`.                                                                                                    |
| `accounts` | Ordered rows, e.g. `[{"platform":"twitch","handle":"/byUwUr"},{"platform":"twitch","handle":"/byUwUr_es"}]`; up to 100 accounts, 160 characters/handle, 20,000 JSON characters. `[]` hides it. |
| `pauseTime`, `inbetweenPauseTime`                        | Seconds/account and between cycles: `0`–`3600`, default `5` each.                                                               |
| `scale`                                                  | `0.1`–`5`, anchored to the selected top corner.                                                                                 |
| `iconBoxColor`, `textBoxColor`, `iconColor`, `fontColor` | Hex colors without `#`.                                                                                                         |
| `primaryFont`, `fontWeight`                              | Family and weight `100`–`900`, step `100`; Courier/monospace fallback.                                                          |
| `fontSizeRem`, `textYOffsetRem`                          | Size `0.5`–`6.25` rem (default `4.5`); offset `-6.25`–`6.25` rem.                                                               |

Invalid JSON/platforms retain the three default accounts; blank handles keep their slots. Font readiness and remeasurement keep animation aligned.

## Main scene

![Main scene preview](main/prev.jpg)

[Example: Starting soon](https://byuwur.github.io/stream.html/main/?sceneTitle=Starting+soon&tagline=Your+channel&countdownTime=5&displayBranding=no&displaySocial=no)

| Parameter | Meaning |
| --- | --- |
| `sceneTitle`, `tagline` | Multiline title up to 300 characters; subtitle up to 160. |
| `countdownTime`, `countdownMessage`, `countdownOverMessage` | Minutes `0`–`1440` (default `4`); during/after messages. |
| `displayCountdown`, `displayBranding`, `displaySocial`, `displaySchedule`, `displayLabels` | `yes`/`no`. Branding hides only the logo. |
| `primaryFont`, `titleSize`, `subtitleSize` | Family and sizes `8`–`200` px; Courier/monospace fallback. |
| `primaryTextColor`, `subTextColor`, `accentColor`, `frameColor`, `contentBackgrounds`, `backgroundColor` | Hex without `#`; background defaults to transparent `00000000`. |
| `frameWidth` | `0`–`100` px. |
| `logoUrl`, `logoOpacity`, `logoScale` | Image URL/path, opacity `0`–`1`, scale `0.1`–`5`. Empty URL uses BONYUR. |
| `backgroundType`, `backgroundUrl` | `video`/`image` and media URL/path; no bundled background media. |
| `backgroundBlur`, `backgroundOverlayOpacity`, `backgroundOverlay` | Blur `0`–`100` px, tint opacity `0`–`1`, tint color. |
| `accounts` | Ordered rows with `platform`, `handle`, and `heading`; platforms may repeat. Up to 100 rows, 160 characters per text field, 20,000 JSON characters. Blank handles/`[]` hide accounts. |
| `scheduleEntries` | Weekday-to-text map, e.g. `{"monday":"Activity"}`; up to seven days, 160 characters/text, 4,000 JSON characters. `{}` hides it. |

Invalid lists retain defaults. Pixels convert to rem at a 16px root. Follower/donation/subscriber labels are editable text, without live service updates.

## Work in progress

The other 19 tools are `ready: false`, hidden pending manual review/testing. Defaults and field documentation live in their local forms.

| Folder                                  | Purpose / limits                                                                                                                              |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `clock`                                 | Digital/analog/flip/minimal; four zones maximum, blank zone/locale follows OBS.                                                               |
| `timer`                                 | Duration/deadline/elapsed/restart; timestamp modes survive reload, restart starts over. No shared pause; milliseconds update at 20 Hz.        |
| `webcam`                                | Decorative frame; does not crop/mask the camera. Circle uses the smaller dimension.                                                           |
| `ticker`, `quotes`                      | Configured message/quotation rotation; no live feeds.                                                                                         |
| `watermark`, `lower-thirds`, `sponsors` | Text/logo/name rotations; no remote triggers or sponsorship service. Missing images leave text.                                               |
| `qr`                                    | Nayuki MIT encoder; 600 characters/1,200 UTF-8 bytes, four-module quiet zone, opaque colors, modules at least 3 px. Scan the final broadcast. |
| `reminder`                              | Timestamp reminders with IANA quiet hours/DST; keep OBS source running.                                                                       |
| `badge`, `hud`                          | Decorative status/viewfinder; no stream-status detection or camera/recording control.                                                         |
| `credits`                               | Scrolling credits/looping; pixels/second speed, reload restarts.                                                                              |
| `schedule`                              | Ordered dated activities; highlights overlaps, exclusive end times, no calendar service.                                                      |
| `info`, `shortcuts`                     | Static cards/key reference; large boards scroll, no keyboard monitoring.                                                                      |
| `effects`                               | CSS particles; maximum 200, low mode 50, Off gives a static pattern.                                                                          |
| `timeline`                              | Timestamp progress; invalid/reversed ranges show an error.                                                                                    |
| `randomizer`                            | Seeded draws can repeat. OBS Interact updates the page URL; restart uses OBS's saved URL. No synchronization.                                 |

Most draft sources start at **960 × 540**; HUD uses **1280 × 720**. Lists allow 40 entries, 160 characters/field, and 8,000 JSON characters unless narrower limits apply. Date pickers use the editor's zone and serialize UTC; direct timestamps need `Z` or an offset. OBS's clock controls timing; generated start timestamps survive reload.

## Development

Shared setup belongs in `configurator.js`; tool definitions/rendering and CSS live in `{tool}/{tool}.js` and `.css`. `configurator.css` owns editor styling; `configurator.html` is the starter. The root `index.html` renders the catalog.

### Resource contract

In an async `DOMContentLoaded` handler, define `resource.fields` with parameter names, types, defaults, labels, sections, descriptions, and constraints. Put renderer-only values in `constants`, then call `await byConfigurator.initResource(resource, integrations?)` before rendering. It decodes/validates URL settings, clones defaults, publishes `window.byStreamResource`/`window.byStreamOverlay`, mounts `overlay-markup` in overlay mode, and resolves to shared settings.

HTML needs `<template id="overlay-markup">...</template>` and `<div id="configurator"></div>`. Declare scripts with `src` and `defer` in dependency order: jQuery before its plugins, Popper before Bootstrap, and `_functions.js` before `configurator.js`. Deferred scripts execute in document order before `DOMContentLoaded`; initialization awaits decoded resource settings. Editor styles start with `data-editor-style media="not all"` and activate only in configure mode.

`byConfigurator.init()` generates controls, preview, and parameter help; repeat calls preserve the form/handlers. Only declared fields enter URLs. `byConfigurator.validParameter(fields, name, value)` and `byConfigurator.applyParameters(fields, settings, values?)` share validation; custom validators return a parsed value or `null`. See the starter and existing resources for field metadata. Controller's `byConfigurator.configureResource(resource, editor)` adds mapping/help panels. Native helpers supply platforms/accounts, dates/zones, image checks, and clock-aligned `watch()` updates that pause while hidden.

Field `options` maps stored IDs to displayed labels.

Binary settings use `type: "switch"` with explicit checked/unchecked values.

Each list uses its declared format directly: simple messages are string arrays, unique pairs are maps such as `{"monday":"Activity"}`, and social accounts or other repeated rows use object arrays. Unsupported formats retain defaults; no format conversion is performed. Map keys must be unique, and integer keys follow JavaScript's numeric ordering.

### Add a tool

1. Copy `configurator.html` into the tool folder; replace demo markup/styles/rendering and change shared imports to `../`.
2. Define fields and initialize the resource before overlay rendering.
3. Register folder ID, name, description, icon, category, and `ready` in `byConfigurator.catalog.tools`. Set `ready: true` after review/testing.

The catalog owns order, cards/count, and navigation; static hosting does not discover folders. IDs determine folder URLs and `prev.jpg`. Update preview images and Open Graph/Twitter metadata together.

### Landing and checks

Search/categories filter ready tools; the responsive gallery supports keyboard focus. Run `node --check` on changed scripts. Check HTTP/`file://`, URL round trips, F2/`#configure`, copy/reset, invalid values, lists, fonts, and keyboard mapping. Confirm overlay mode skips editor initialization. External Playwright/Chrome checks require no repository dependency; QR checks need a decoder. Test OBS and endurance separately.

## Other configurations and assets

| Folder / file                                              | Use                                                                 |
| ---------------------------------------------------------- | ------------------------------------------------------------------- |
| `alert-box.streamlabs.com/`, `chat-box.streamlabs.com/`    | Service widgets: copy HTML/CSS/JS and fields into Streamlabs.       |
| `dashboard.twitch.tv/`, `deckboard.app/`                   | Twitch alert templates and Deckboard exports.                       |
| `InputOverlay.OBS/`                                        | OBS Input Overlay plugin artwork/layouts, separate from Controller. |
| `obs-studio/`, `foobar2000.org/`                           | Personal profiles/configurations; not portable installations.       |
| `_byuwur.OBS/`, `_generic.OBS/`, `_overlays.OBS/`, `_art/` | Branding, transitions, backgrounds, and editable media.             |

Back up before importing. Replace devices, paths, and account settings; keep stream keys, WebSocket passwords, and private widget URLs out of shared exports.

## License

Project code: [MIT](LICENSE.md), copyright Andrés Trujillo [Mateus] byUwUr. Bundled libraries, applications, and media retain their licenses.
