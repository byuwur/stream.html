# byuwur/stream.html

Free HTML stream overlays, plus separate presets and assets for streaming programs.

The **HTML overlays run in a browser without installation, a build step, or an account**. Open a tool, fill in its form, and copy the generated URL into an OBS Browser source. Each tool stays inside its own folder. The logo/title dropdown switches between tools; it opens on hover, click, or keyboard activation.

## HTML overlays

| Tool | What it does | Configure online | Local entry point |
| --- | --- | --- | --- |
| Controller | Shows gamepad or keyboard input with Xbox, PlayStation, fight-stick, and GameCube skins. | [Controller form](https://byuwur.github.io/stream.html/controller/) | `controller/controller.html` |
| Popup | Cycles through social handles with animated icons and configurable colors, timing, direction, and scale. | [Popup form](https://byuwur.github.io/stream.html/popup/) | `popup/popup.html` |
| Main scene | Starting, BRB, ending, and intermission scenes with a title, countdown, branding, social accounts, and schedule. | [Main scene form](https://byuwur.github.io/stream.html/main/) | `main/main.html` |

`main/` is the scene overlay; there is no separate `scene/` folder. The other folders below contain program presets, widget templates, or media, not standalone HTML tools.

Open the root `index.html` to choose a tool, or open a tool's `index.html` directly to configure it. The local entry points in the table render the overlays for OBS.

### Hosted or downloaded

1. Open a configuration link above. The bundled settings are examples using my branding; replace the text, handles, and media with yours.
2. Use the parameter sidebar and live preview. Checkbox settings appear as toggles; click the switch or its label to change the value. Color fields provide a swatch and HEX input, preserving transparency. The sticky top bar shows the generated URL, with Copy URL and Reset controls.
3. In OBS, add a **Browser** source and paste the URL. Use **1920 x 1080** for the main scene; size the controller and popup sources to fit your layout.

To use a local copy, download this repository through GitHub's **Code > Download ZIP**, extract it, and open the tool's `index.html`. Keep its entire folder, including its HTML, JavaScript, CSS, and images, and keep the shared `configurator.js` in the parent folder. The HTML file alone is not self-contained. No package manager or web server is needed for the basic overlays.

The forms preserve the page's location: a GitHub Pages page generates a GitHub Pages URL, and a local file generates a `file:///.../{resource}.html?...` URL. For a local overlay with parameters, paste that full file URL into the OBS Browser source's **URL** field with **Local file** unchecked. A file URL works only on a machine with that folder at that path.

The configurators load Bootstrap, jQuery, jQuery UI, Popper, Font Awesome, and the SPA common styles and theme helper from `byuwur/spa.php@main` through jsDelivr. Each resource's `index.html` loads the shared root `configurator.js` for common UI behavior and embeds its own initialization, settings, and resource-specific controls. Layout and dialogs use Bootstrap classes without custom CSS; an SVG viewport scales the preview. Use the root `configurator.template.html` as the starting layout for future resources, replacing its placeholders and adapting its embedded initializer. Keep embedded defaults identical in the configurator and overlay pages; no separate configuration scripts are required.

Parameter validation and documentation definitions live beside the renderer in `main.js`, `popup.js`, and `controller.js`. All three configurators provide Info, Use with OBS, and Parameters dialogs; Controller also provides Custom Mapping. The top-right theme toggle saves your preference locally. The preview loads the actual overlay URL and scales it to fit without changing OBS dimensions.

Overlay pages load jQuery from `byuwur/spa.php@main` through jsDelivr. Main also loads GSAP; Popup loads GSAP and MorphSVGPlugin from the same repository, using combined CDN URLs. Downloaded pages require internet for these dependencies, font files, and any remote media. Keep the tool folder together; the pages need no server or installation, but are not offline bundles.

### Configuration and overlay modes

- Each folder's `index.html` is its configurator, with or without query parameters.
- `controller/controller.html`, `popup/popup.html`, and `main/main.html` render only their overlays, including when opened without parameters.
- To edit a generated URL, replace the resource filename with `index.html`, keeping its query parameters. **Reset** restores the values loaded when that form opened; reopen the bare folder URL for the bundled defaults.
- Existing OBS sources using folder URLs must switch to the corresponding resource HTML filename. `overlay=1` and `#obs` are no longer needed to select overlay mode.
- Settings live in the URL. Nothing is uploaded or saved to an account. Use public display information only: URLs are visible and shareable.

For popup and main, validated URL values override the embedded defaults. Missing or invalid values keep the embedded defaults. Empty text values intentionally clear text. Unknown parameters are ignored. Use the form to encode spaces, colors, ampersands, and non-ASCII text correctly; text parameters are displayed as text, not executed as HTML.

## Controller

Example: [`controller/controller.html?player=1&skin=1&scale=0.5`](https://byuwur.github.io/stream.html/controller/controller.html?player=1&skin=1&scale=0.5).

| Parameter | Meaning |
| --- | --- |
| `player` | `1` to `4` for gamepads (default `1`), `9` for keyboard. |
| `skin` | `1` Xbox, `2` PlayStation, `3` fight stick, `4` GameCube. |
| `scale` | Display size multiplier; for example `0.5` for half size. Negative values flip the controller. |
| `opacity` | Display opacity (`0` to `1`). |
| `offset`, `deadzone` | Stick movement in pixels and deadzone threshold. |
| `strength` | `0` disables trigger strength meters; controlled by the **Disable Strength Meter** toggle. |
| `curve` | `1` enables curved stick movement; controlled by the **Enable Stick Curving** toggle. |
| `rotation` | Maximum steering-wheel rotation in degrees. |
| `mapping` | Custom mapping JSON from the tool's mapping interface. |

Press a gamepad button to allow detection. Keyboard input requires focus in the page; in OBS use **Interact**. The default keyboard bindings are embedded in the scripts in `controller/index.html` and `controller/controller.html`. Device availability depends on the browser/OBS runtime and operating system.

## Popup

Example: [`popup/popup.html?mode=left&twitch=YourChannel&youtube=YourChannel&instagram=YourHandle&socialsDisplayed=3&scale=0.5`](https://byuwur.github.io/stream.html/popup/popup.html?mode=left&twitch=YourChannel&youtube=YourChannel&instagram=YourHandle&socialsDisplayed=3&scale=0.5).

| Parameter | Accepted values / purpose |
| --- | --- |
| `mode` | `right` (default) or `left`. |
| `twitch`, `youtube`, `instagram`, `facebook`, `twitter` | Plain-text handles, up to 160 characters each. This is the icon/display order. |
| `socialsDisplayed` | Integer `1` to `5`; displays that many accounts from the start of the list. Blank accounts still occupy their slot. |
| `pauseTime`, `inbetweenPauseTime` | Seconds per account and between animation cycles, `0` to `3600`. |
| `scale` | `0.1` to `5`; scales from the chosen top corner. |
| `iconBoxColor`, `textBoxColor`, `iconColor`, `fontColor` | CSS colors, such as `#400000` or `rgba(255,255,255,1)`. |
| `primaryFont`, `fontWeight` | Font family available on the viewing computer; weight `100` to `900` in steps of 100. |
| `fontSize`, `textYOffset` | Text size `8` to `100` px; vertical offset `-100` to `100` px. |

Defaults are embedded in the scripts in `popup/index.html` and `popup/popup.html`; validated URL parameters apply last. The default animation shows the first three accounts for five seconds each, with five seconds between cycles.

## Main scene

Example: [`main/main.html?mode=start&sceneTitle=Starting+soon&tagline=Your+channel&countdownTime=5&displayBranding=no&displaySocial=no`](https://byuwur.github.io/stream.html/main/main.html?mode=start&sceneTitle=Starting+soon&tagline=Your+channel&countdownTime=5&displayBranding=no&displaySocial=no).

| Parameter | Accepted values / purpose |
| --- | --- |
| `mode` | `start` (default), `brb`, `end`, or `inter`. Unknown modes fall back to `start`. |
| `sceneTitle`, `tagline` | Title (up to 300 characters, with line breaks) and subtitle (up to 160). Explicit text overrides the mode's preset text. |
| `countdownTime` | Minutes, `0` to `1440`; default `4`. |
| `countdownMessage`, `countdownOverMessage` | Text during and after the countdown. |
| `displayCountdown`, `displayBranding`, `displaySocial`, `displaySchedule` | `yes` or `no`. Branding controls the logo; title and subtitle remain independent. |
| `showBG`, `hideCountdown` | `true` or `false`; dark background and forced countdown hiding. Existing `1`/`0`, `yes`/`no`, `t`/`f`, and `y`/`n` values are also accepted. |
| `primaryFont`, `titleSize`, `subtitleSize` | Font family and title/subtitle sizes (`8` to `200` px). |
| `primaryTextColor`, `subTextColor`, `accentColor`, `frameColor` | CSS colors. |
| `frameWidth` | `0` to `100` px. |
| `logoUrl`, `logoOpacity`, `logoScale` | Optional image URL/path, opacity `0` to `1`, scale `0.1` to `5`. Empty URL keeps the bundled logo; hide it with `displayBranding=no`. |
| `backgroundType`, `backgroundUrl` | `video` or `image`, plus an optional media URL/path. No background media is bundled in `main/`. |
| `backgroundBlur`, `backgroundOverlayOpacity`, `backgroundOverlay` | Blur `0` to `100` px, tint opacity `0` to `1`, and tint CSS color. |
| `twitch`, `youtube`, `instagram` | Plain-text social handles; an empty handle hides that account. |
| `twitchHeader`, `youtubeHeader`, `instagramHeader` | Heading for each social account. |
| `monday` through `sunday` | Schedule text for each day; enable with `displaySchedule=yes`. |

Media can use public HTTP(S) URLs or paths relative to the HTML file. Local file URLs work only with a downloaded overlay. These fields reference existing files; they do not upload them. Fonts must be installed on the computer rendering the overlay.

Defaults and mode-specific titles are embedded in the scripts in `main/index.html` and `main/main.html`. Validated URL values apply last. Automatic follower/donation/subscriber updates are not connected in this tool.

## Program configurations and assets

These folders require their named application or service. They do **not** use the overlays' URL forms.

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

Program exports may contain machine-specific paths and personal settings. Do not publish stream keys, WebSocket passwords, or private widget URLs when sharing your own configuration exports.

## Adding another HTML tool

Put the tool in its own folder with an `index.html` configurator, a `{resource}.html` overlay, and its local assets. Start from `configurator.template.html`, embed matching defaults in both HTML pages, and keep parameter rules and rendering in the resource's JavaScript file. Give checkbox controls an `id` and their labels a matching `for` attribute so both remain clickable when styled as switches.

Add its folder, title, and icon to the `tools` list inside `initTools()` in the shared `configurator.js`, and add a link on the root `index.html` landing page. Keep it usable directly from GitHub Pages and an extracted download, with no required build or installation. Generate query parameters and an overlay-only URL, validate parameters, render display text safely, and add the tool's purpose, hosted link, local entry point, and options to this README. Program-specific presets belong in their program folders.

## License

Project code: [MIT](LICENSE.md), copyright Andrés Trujillo [Mateus] byUwUr. Bundled third-party libraries, applications, and media retain their own applicable licenses.
