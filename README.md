# byuwur/stream.html

![stream.html preview](prev.jpg)

Free stream overlays for controller input, social popups, and main scenes, plus the presets and assets I use for streaming. Free. Forever.

Open a configurator, adjust the settings, and copy its URL into an OBS Browser source. No account, package install, or build step.

[Open stream.html](https://byuwur.github.io/stream.html/) · [Configurator demo](https://byuwur.github.io/stream.html/configurator.html)

## HTML overlays

| Tool | What it does | Configure online | Local entry point |
| --- | --- | --- | --- |
| Controller | Shows gamepad or keyboard input with Xbox, PlayStation, fight-stick, and GameCube skins. | [Controller form](https://byuwur.github.io/stream.html/controller/) | `controller/index.html` |
| Popup | Cycles through social handles with animated icons and configurable colors, timing, direction, and scale. | [Popup form](https://byuwur.github.io/stream.html/popup/) | `popup/index.html` |
| Main scene | Starting, BRB, ending, and intermission scenes with a title, countdown, branding, social accounts, and schedule. | [Main scene form](https://byuwur.github.io/stream.html/main/) | `main/index.html` |

Each tool uses the same `index.html` for its configurator and overlay, with separate markup and styles for each mode. The homepage lets you choose a tool; the forms provide collapsible sections, live previews, and links to parameter help.

## Use with OBS

1. Open a configurator from the table above.
2. Replace my example branding, text, handles, and media with yours.
3. Adjust settings and check the live preview.
4. Click **Copy URL**.
5. Add an OBS **Browser** source and paste the URL.

Use **1920 × 1080** for the main scene. Size controller and popup sources for your layout. The preview scales the actual overlay without changing its OBS dimensions.

Settings sections start expanded and can collapse independently using their headings. Switches and their labels are clickable. Color defaults and Pickr use HEX, with eight digits for transparency (`#RRGGBBAA`). Theme preference is saved locally; accessibility controls offer text, motion, font, spacing, contrast, and color adjustments.

### Downloaded use

Download `stream.html`, then open a tool's `index.html`. Each tool has one HTML, one JavaScript, and one CSS file, plus its artwork. Keep the whole tool folder and the parent `configurator.js` and `configurator.css`. Shared dependencies load from the pinned SPA.js CDN; internet access is needed for those dependencies and Google Fonts. One HTML file alone is not a complete bundle.

Local configurators generate `file:///.../{tool}/index.html?...` URLs. Paste the complete URL into OBS with **Local file** unchecked. The folder must stay at that path on the viewing computer. Basic overlays do not need a web server.

Configurators need internet for their CDN libraries. Font-enabled renderers also load the shared SPA.js font helper; Main and Popup load animation libraries and optional remote media. Offline use requires saving those dependencies and updating their script URLs. Installed and system fonts need no Google Fonts request. The Controller renderer uses local files and native JavaScript. Local media paths must exist on the viewing computer.

Font controls search a bundled catalog of 350 verified Google Fonts, plus system fonts and custom installed families or CSS stacks. Font names appear in their own typefaces; only selected families and visible dropdown rows request fonts, through the official CSS API with `display=swap`. Supported normal weights share one stylesheet per family per document. Menus adapt to available screen space and open above or below the control automatically. The inline sample and actual overlay preview use the selected family, with system fallbacks if loading fails. Font values remain ordinary URL settings, including when reopening with `#configure` or using Reset.

Overlay animations follow each tool's settings rather than the operating system's reduced-motion preference, keeping previews and OBS output consistent. Explicit Off, None, and Static animation choices still apply where available. Shared `_common.css` and configurator accessibility controls are unchanged.

| Part                | Dependencies                                                                                  |
| ------------------- | --------------------------------------------------------------------------------------------- |
| Shared configurator | jQuery, Bootstrap, Select2, Pickr, Font Awesome, and SPA common styles/helpers.               |
| Controller renderer | Native JavaScript and its controller artwork.                                                 |
| Popup renderer      | Native DOM APIs, GSAP, MorphSVG, and Font Awesome brand icons.                                |
| Main renderer       | Native DOM APIs, GSAP, and Font Awesome brand icons.                                          |

CDN imports use `byuwur/spa.js@v20.1` through jsDelivr. The landing and configurators use jQuery for DOM and events. Configurator dependencies are declared with `data-editor-src` and loaded in order only in editor mode. Renderers use native JavaScript, the shared SPA.js font helper where needed, and GSAP/MorphSVG for Main and Popup; they do not load jQuery or editor widgets.

### Editing an existing URL

- Bare folder and `index.html` URLs open the configurator; URLs with query settings and no hash render the overlay. No `overlay` flag is needed.
- To edit an existing overlay URL, append `#configure`, keeping its settings. Help hashes also open the configurator.
- Both modes use the same `index.html`; no redirect is needed. Replace old `controller.html`, `popup.html`, or `main.html` filenames in OBS URLs with `index.html`, keeping their parameters.
- Hosted navigation and generated overlay URLs use directory paths, such as `controller/?player=1`. Downloaded-file URLs retain `index.html`.
- **Reset** restores the settings loaded when the form opened. Reopen the bare folder URL for bundled defaults.

Settings live in the URL, with no upload or account storage. Use public display information only. The URL fragment opens the editor and help; it is omitted from generated overlay URLs.

Valid URL values override each resource's defaults; missing or invalid values keep them. Empty text clears a field and unknown parameters are ignored. Let the form encode spaces, colors, ampersands, and non-ASCII text. Display text is never executed as HTML.

Invalid form fields stop URL generation and keep the last valid preview. Correct the highlighted fields to enable copying and refresh the preview.

Older per-platform handles, weekday fields, popup account counts, and Popup's `fontSize`/`textYOffset` pixel aliases are ignored. Rebuild those URLs with the account/schedule editors and Popup's rem fields. Main's documented pixel parameters remain supported.

## Controller

![Controller overlay and configurator preview](controller/prev.jpg)

Xbox, PlayStation, fight-stick, and GameCube skins for gamepad or keyboard input. The controller fits the viewport with `0.5rem` vertical margins and respects narrow widths; legacy `scale` is ignored.

Example: [`controller/index.html?player=1&skin=1`](https://byuwur.github.io/stream.html/controller/index.html?player=1&skin=1).

| Parameter            | Meaning                                                                                    |
| -------------------- | ------------------------------------------------------------------------------------------ |
| `player`             | `1` to `4` for gamepads (default `1`), `9` for keyboard.                                   |
| `skin`               | `1` Xbox, `2` PlayStation, `3` fight stick, `4` GameCube.                                  |
| `opacity`            | Display opacity (`0` to `1`).                                                              |
| `offset`, `deadzone` | Stick movement in pixels and deadzone threshold.                                           |
| `strength`           | `0` disables trigger strength meters; controlled by the **Disable Strength Meter** toggle. |
| `curve`              | `1` enables curved stick movement; controlled by the **Enable Stick Curving** toggle.      |
| `rotation`           | Maximum steering-wheel rotation in degrees.                                                |
| `mapping`            | JSON array of bindings from the tool's mapping interface; `[]` keeps standard controls.    |

Press a gamepad button to allow detection, or **F** to activate keyboard input. Keyboard input needs page focus: click the preview in the configurator or use OBS **Interact**. Default keyboard bindings are the explicit `bySettingsKB` object in `controller/index.html`. Detection depends on the browser/OBS runtime and operating system.

Open **Custom Mapping** from the help links to choose a mapping base, capture its raw inputs, and apply bindings. This editor builds the mapping JSON; the resource JavaScript polls input and applies the resulting bindings.

Previous URLs with a `{"mapping":[...]}` wrapper remain supported; newly generated URLs use the binding array directly.

## Popup

![Social popup overlay and configurator preview](popup/prev.jpg)

Add accounts, choose a supported platform and display text, then reorder with the arrows or remove unwanted rows. Multiple accounts can use the same platform.

The searchable Select2 selector offers 90+ platforms supported by the bundled Font Awesome brand font, including Bluesky, Discord, Mastodon, Threads, TikTok, and X. Icons appear in both search results and selected values, with a globe fallback for unavailable glyphs. There is no PNG icon sheet.

| Parameter | Accepted values / purpose |
| --- | --- |
| `mode` | `right` (default) or `left`. |
| `accounts` | Ordered JSON array, up to 100 entries and 20,000 characters total, each with a supported `platform` and plain-text `handle` of up to 160 characters. The form generates and encodes this parameter. Every entry is displayed; `[]` hides the popup. |
| `pauseTime`, `inbetweenPauseTime` | Seconds per account and between animation cycles, `0` to `3600`. |
| `scale` | `0.1` to `5`; scales from the chosen top corner. |
| `iconBoxColor`, `textBoxColor`, `iconColor`, `fontColor` | CSS colors, such as `#400000` or `#FFFFFF80`; defaults use HEX. |
| `primaryFont`, `fontWeight` | Google Fonts or an installed font family; weight `100` to `900` in steps of 100. |
| `fontSizeRem`, `textYOffsetRem` | Text size `0.5` to `6.25` rem (default `4.5`); vertical offset `-6.25` to `6.25` rem. |

Defaults live in `popup/popup.js`: three accounts, five seconds each, with five seconds between cycles. Reset restores the list and order loaded with the form.

Before URL encoding, an account list can look like:

```json
[
  { "platform": "twitch", "handle": "YourChannel" },
  { "platform": "bluesky", "handle": "your.bsky.social" }
]
```

Invalid JSON or unsupported platforms use the defaults. Blank handles keep their slots. The chosen font falls back to Courier, then monospace if unavailable.

## Main scene

![Main scene overlay and configurator preview](main/prev.jpg)

Starting, BRB, ending, and intermission scenes with title, countdown, branding, social accounts, and schedule.

Social accounts use the same platform selector and add, reorder, and remove controls as Popup, with an additional heading per account. Schedule rows use a weekday selector and editable text, with the same controls. Reset restores both lists as loaded.

Example: [`main/index.html?sceneTitle=Starting+soon&tagline=Your+channel&countdownTime=5&displayBranding=no&displaySocial=no`](https://byuwur.github.io/stream.html/main/index.html?sceneTitle=Starting+soon&tagline=Your+channel&countdownTime=5&displayBranding=no&displaySocial=no).

| Parameter | Accepted values / purpose |
| --- | --- |
| `sceneTitle`, `tagline` | Configurable title (up to 300 characters, with line breaks) and subtitle (up to 160). |
| `countdownTime` | Minutes, `0` to `1440`; default `4`. |
| `countdownMessage`, `countdownOverMessage` | Text during and after the countdown. |
| `displayCountdown`, `displayBranding`, `displaySocial`, `displaySchedule` | `yes` or `no`. Branding controls the logo; title and subtitle remain independent. |
| `backgroundColor` | CSS background color behind the scene and its media; defaults to transparent HEX `#00000000`. |
| `primaryFont`, `titleSize`, `subtitleSize` | Font family and title/subtitle sizes (`8` to `200` px). |
| `primaryTextColor`, `subTextColor`, `accentColor`, `frameColor` | CSS colors. |
| `frameWidth` | `0` to `100` px. |
| `logoUrl`, `logoOpacity`, `logoScale` | Optional image URL/path, opacity `0` to `1`, scale `0.1` to `5`. Empty URL uses the default BONYUR logo from `byuwur.github.io`; hide it with `displayBranding=no`. |
| `backgroundType`, `backgroundUrl` | `video` or `image`, plus an optional media URL/path. No background media is bundled in `main/`. |
| `backgroundBlur`, `backgroundOverlayOpacity`, `backgroundOverlay` | Blur `0` to `100` px, tint opacity `0` to `1`, and tint CSS color. |
| `accounts` | Ordered JSON array, up to 100 entries and 20,000 characters total: supported `platform`, plain-text `handle`, and optional `heading` (each text up to 160 characters). Blank handles hide that account; `[]` hides all accounts. |
| `scheduleEntries` | Ordered JSON array, up to 7 entries and 4,000 characters total: `day` (`monday` through `sunday`) and plain-text `text` of up to 160 characters. Entries may repeat a weekday. `[]` hides the schedule. |

Defaults live in `main/main.js`. Valid URL settings apply to the same settings object. Invalid lists retain bundled defaults. Main no longer uses scene presets: old `mode`, `showBG`, and `hideCountdown` parameters are ignored. Configure the title, `backgroundColor`, and `displayCountdown` directly. Social icons share Popup's supported platform list. Automatic follower, donation, and subscriber updates are not connected.

Media fields reference files rather than uploading them. Use public HTTP(S) URLs or paths relative to the resource HTML. Local file URLs require a downloaded overlay; Base64 `data:` URLs are not supported. Fonts must be available on the viewing computer; unavailable choices fall back to Courier, then monospace.

Main's pixel size parameters are converted to rem internally at a root size of 16px. `frameWidth` is available in both the form and URL.

## Program configurations and assets

These folders need their named application or service; they do not use the HTML configurators.

| Folder / file | Contents and use |
| --- | --- |
| `alert-box.streamlabs.com/` | Streamlabs Alert Box custom widget: HTML, CSS, JavaScript, custom-field JSON, and sound. Copy the corresponding pieces into the widget editor; service placeholders need Streamlabs to render. |
| `chat-box.streamlabs.com/` | Streamlabs Chat Box template, styles, script, and custom fields. Configure inside Streamlabs; it is not a standalone chat client. |
| `dashboard.twitch.tv/` | Twitch dashboard alert HTML/CSS template, including Twitch placeholders. Use in the service's custom alert editor. |
| `deckboard.app/` | Deckboard `.boardjson` board exports for OBS, camera, and music controls. Import in Deckboard and adapt scene/source names and local paths. |
| `InputOverlay.OBS/` | Layout JSON and matching image sheets for the OBS Input Overlay plugin. Add them through that plugin; separate from the browser controller. |
| `obs-studio/` | Personal OBS profile, scene collections, plugin settings, and cached application data. Reference material, not a portable clean installation. Back up your settings before selectively importing and replace account settings, devices, and paths. |
| `foobar2000.org/` | Portable foobar2000 files, components, profile, and current-song output. This runs the foobar2000 application, not a browser overlay. |
| `_byuwur.OBS/` | Personal branding, frames, transitions, videos, and editable media projects. |
| `_generic.OBS/` | Other branding/transition media for OBS scenes. |
| `_overlays.OBS/` | Game frames, backgrounds, and decorative overlay media. |
| `_art/` | Placeholder for artwork. |
| `DroidCamDrivers.exe` | Windows driver installer, unrelated to running the HTML overlays. |

Program exports contain personal settings and machine-specific paths. Back up your settings before importing, and replace devices, paths, and account settings. Do not share stream keys, WebSocket passwords, or private widget URLs.

## Development

**Simple is complicated enough.** Keep renderer behavior in the resource, editor behavior in the configurator, and dependencies explicit.

| File                     | Responsibility                                                                                      |
| ------------------------ | --------------------------------------------------------------------------------------------------- |
| `index.html`             | Homepage, tool links, preview backgrounds, and sharing metadata.                                    |
| `configurator.js`        | Shared catalog, generated editor, widgets, URL generation, preview, help, theme, and accessibility. |
| `configurator.css`       | Shared editor styling, including the transparent-preview checkerboard.                              |
| `spa.js@v20.1/_fonts.js` | Shared native font loader and optional picker, loaded once from the pinned jsDelivr CDN.            |
| `configurator.html`      | Working demo with text, number, and HEX color fields and an inline native renderer.                 |
| `{tool}/index.html`      | Overlay markup, explicit dependencies, and one empty configurator container.                        |
| `{tool}/{tool}.js`       | Master field definition, independent page mode, URL parsing, and rendering.                         |
| `{tool}/{tool}.css`      | Resource styling and CSS variable defaults matching the renderer's defaults.                        |

### Resource and configurator contract

Each resource script starts its `DOMContentLoaded` handler with a `resource` object. Its `fields` own public parameter names, defaults, control types, labels, descriptions, and validation. The renderer derives `settings` from those defaults, applies valid query parameters, and publishes `window.byStreamResource = { ...resource, settings, parameterRules: resource.fields }`. Renderer-only values belong in `resource.constants`.

Load the shared SPA.js `_fonts.js` helper where needed, then the resource script before `configurator.js`, with `defer`. The resource decides page mode and mounts its own `overlay-markup` template when query parameters are present without a hash. It renders independently if the configurator is missing. Declare editor scripts with `data-editor-src` instead of `src`; the shared configurator loads them in dependency order only in editor mode. Editor styling starts with `media="not all"`; only the configurator enables it. The resource never builds form controls or calls editor helpers.

The HTML needs just `<div id="configurator"></div>` for the editor. Shared setup generates the toolbar, form sections, live preview, footer, and parameter reference from the published definition. It serializes only declared fields and restores the settings loaded from the URL on Reset. `#configure` reopens an overlay URL for editing.

`byConfigurator` owns shared editor setup and its tool catalog. `byConfigurator.init()` runs after the resource scripts are ready; calling it again preserves the existing form and handlers. Renderers publish their definitions independently and do not depend on this object.

| Field metadata                                | Purpose                                                                                                                                 |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `type`                                        | `text`, `number`, `url`, `textarea`, `select`, `switch`, `color`, `font`, `entries`, or Controller's `mapping`. |
| `default`, `label`, `section`, `description`  | Initial value, visible caption, form group, and parameter help.                                                                         |
| `options`, `labels`                           | Allowed select values and optional human-readable labels keyed by value.                                                                |
| `min`, `max`, `step`, `maxlength`, `validate` | URL and input constraints. A custom validator returns a parsed value or `null`.                                                         |
| `checkedValue`, `uncheckedValue`              | Values serialized by a switch.                                                                                                          |
| `entries`                                     | Ordered-list choices, choice key, text fields, new-entry values, and optional limit; existing resources provide examples.               |

The generator uses jQuery for controls and events with the existing Select2, Pickr, Bootstrap, and Font Awesome integrations. Font-enabled pages load the shared SPA.js `_fonts.js` once, before the resource. Its native `byFont.family(value, fallback)` and `byFont.ready()` work without jQuery; picker methods resolve jQuery and Select2 when the configurator initializes them. Only selected fonts and visible dropdown samples are requested. Font loading supports hosted and `file://` use with internet access, independently of the configurator and SPA runtime; no neighboring SPA.js checkout or duplicate font module is required.

Custom editor behavior belongs in a separate editor-only script loaded after the shared configurator. Controller's `controller/configurator.js` publishes `byConfigurator.configureResource(resource, editor)` for its mapping UI. The hook receives `generateURL` and the existing control helpers, including `initSelect2`, and may return `initResourceHelp` for additional help panels. Keep renderer behavior in the resource script.

### Adding another HTML tool

1. Copy `configurator.html` as the tool's `index.html`. Replace the demo markup, CSS, and inline renderer with your resource script. Change shared import paths from `./` to `../`.
2. Declare the resource's fields, title, description, and preview dimensions in its first object. Keep validation and rendering beside that definition; do not duplicate the form or parameter documentation in HTML.
3. Preserve the `overlay-markup` template, empty configurator container, and dependency order. Add editor-only code only when the shared field types cannot express a control.
4. Add the tool's folder ID, name, plain-text description, icon, category, and `ready` flag to `byConfigurator.catalog.tools` at the start of `configurator.js`. The ID determines its directory URL and `prev.jpg` path; missing previews leave a blank background. The homepage generates its card from one template; every configurator uses the same catalog order. Set `ready: false` while a tool is unfinished, then `ready: true` when it is ready. Renderer setup needs no registration.

Validate settings, encode query parameters, render text safely, and preserve hosted and downloaded-file use. Check JavaScript syntax with `node --check`. Verify bare configurators, generated URLs, `#configure`, Copy URL, Reset, custom controls, and overlays with `configurator.js` unavailable, over HTTP and `file://`. There is no build step or runtime testing dependency.

### Homepage and share previews

The landing generates ready cards from the shared catalog and one HTML template. Folder IDs derive links and prev.jpg; missing previews leave a blank background. The introduction takes one third of desktop width; mobile uses one column.

Search and icon-backed categories filter the catalog, with the category selector on the left and Find your overlay... beside it. Menus adapt to the available viewport and filter-row width.

One result fills the gallery, two or three stack in full-width rows, four use quadrants, five use two above three, and six or more use a scrolling two-column grid. Short viewports allow scrolling.

Titles and icons are larger; responsive padding, left alignment and wrapping keep content within each card.

Hovering or focusing a card activates its action, nudges the text right, rotates the icon and blurs its preview by 0.25rem while retaining the tint.

Sharing metadata uses the static root [prev.jpg](prev.jpg), currently 1920 × 1080. Resource pages use their own preview images. Update the image and its Open Graph/Twitter metadata when changing the presentation; the random browser styling does not generate a new share image.

## License

Project code: [MIT](LICENSE.md), copyright Andrés Trujillo [Mateus] byUwUr. Bundled libraries, applications, and media keep their own licenses.
