# stream.HTML

Browser overlays for OBS. Configure a resource, copy its URL, and add it to your scene.

![stream.HTML preview](prev.jpg)

## Index

1. [Quick start](#quick-start)
2. [Try it](#try-it)
3. [Downloads](#downloads)
4. [Resources](#resources)
5. [Shortcuts](#shortcuts)
6. [Options](#options)
7. [Development](#development)
8. [Checks and releases](#checks-and-releases)
9. [Other assets](#other-assets)
10. [Contributing](#contributing)
11. [License](#license)

## Quick start

1. [Choose an overlay](https://stream.byuwur.co/) and configure it in the live preview.
2. Copy the generated overlay URL. In OBS, add a **Browser Source** and paste the URL.
3. To edit it again, open the URL with `#configure`, or choose **Interact** in OBS and press **F2**. **F1** opens About in the configurator.

## Try it

[Open stream.HTML](https://stream.byuwur.co/) · [Try the configurator demo](https://stream.byuwur.co/configurator.html)

Open any resource to edit its fields and preview it. Use 1920 × 1080 for Main and size Controller or Social popup to your OBS layout.

## Downloads

[Latest downloads](https://github.com/byuwur/stream.html/releases/latest) use stable filenames, including `stream.html.controller.standalone.zip`. Choose the format that matches how you run the overlay.

| Tier                               | Contents                                      | Requires                                           |
| ---------------------------------- | --------------------------------------------- | -------------------------------------------------- |
| Original                           | Authored HTML.                                | Repository files and dependencies.                 |
| Online                             | Editor and overlay; CDN assets.               | Published tag and internet.                        |
| Standalone                         | Renderer; embedded JS/CSS.                    | URL settings; CDN artwork for Controller/Keyboard. |
| Bundle                             | Editor and overlay; embedded JS/CSS.          | CDN artwork for Controller/Keyboard.               |
| Standalone ZIP                     | Renderer and SVG artwork.                     | Extract and open index.html.                       |
| Full ZIP                           | Editor, overlay, and SVG artwork.             | Extract and open index.html.                       |
| Standalone embedded [EXPERIMENTAL] | Renderer and SVG artwork in one HTML.         | Open the file directly.                            |
| Full embedded [EXPERIMENTAL]       | Editor, overlay, and SVG artwork in one HTML. | Open the file directly.                            |

For Controller and Keyboard on disk, extract the ZIP with its SVG artwork or use the experimental embedded HTML. Source folders that fetch artwork need HTTP(S). When pasting a generated `file://` URL into OBS, leave **Local file** unchecked. Remote media and optional fonts still need internet access.

## Resources

1. [Keyboard & Mouse](#keyboard--mouse)
2. [Controller](#controller)
3. [Social popup](#social-popup)
4. [Main scene](#main-scene)
5. [Clock](#clock)
6. [Timer / Countdown](#timer--countdown)
7. [Webcam Frame](#webcam-frame)
8. [Ticker](#ticker)
9. [Watermark](#watermark)
10. [Lower Thirds](#lower-thirds)
11. [QR / Link Card](#qr--link-card)
12. [Periodic Reminder](#periodic-reminder)
13. [Stream Badge](#stream-badge)
14. [Credits Roll](#credits-roll)
15. [Schedule](#schedule)
16. [Sponsor Carousel](#sponsor-carousel)
17. [Info Board](#info-board)
18. [Screen Effects](#screen-effects)
19. [Camera HUD](#camera-hud)
20. [Progress Timeline](#progress-timeline)
21. [Randomizer](#randomizer)
22. [Quote Display](#quote-display)
23. [Keyboard Shortcut Sheet](#keyboard-shortcut-sheet)
24. [Now Playing](#now-playing)
25. [Chat](#chat)
26. [Counter](#counter)

TBD resources have usable demos while their live integrations are being defined. Alpha resources are in early testing. Beta resources are in broader testing.

### Keyboard & Mouse

Live keyboard/mouse SVG input and optional ephemeral Input History. **Alpha.**

![Keyboard & Mouse overlay preview](keyboard/prev.jpg)

[Configure Keyboard & Mouse](https://stream.byuwur.co/keyboard/) · [Local entry point](keyboard/index.html) · [Keyboard and input history](#keyboard-and-input-history)

### Controller

Gamepad/keyboard input with 32 controller models, compact layouts, and editable color. **Beta.**

Thanks to [MimicryMedia](https://mimicrymedia.itch.io/controller-pack) for the controller SVGs.

![Controller overlay preview](controller/prev.jpg)

[Configure Controller](https://stream.byuwur.co/controller/) · [Local entry point](controller/index.html) · [Controller settings](#controller-settings)

### Social popup

Animated accounts with 90+ platforms, fonts, colors, and timing. **Beta.**

![Social popup overlay preview](popup/prev.jpg)

[Configure Social popup](https://stream.byuwur.co/popup/) · [Local entry point](popup/index.html) · [Account settings](#social-account-settings)

### Main scene

Starting/BRB/ending scenes with branding, countdown, accounts, and schedule. **Beta.**

![Main scene overlay preview](main/prev.jpg)

[Configure Main scene](https://stream.byuwur.co/main/) · [Local entry point](main/index.html) · [Scene settings](#main-scene-settings)

### Clock

Digital, analog, split-flap, and minimal clocks. **Alpha.**

![Clock overlay preview](clock/prev.jpg)

[Configure Clock](https://stream.byuwur.co/clock/) · [Local entry point](clock/index.html)

### Timer / Countdown

Countdown or elapsed timer with an optional fixed start. **Alpha.**

![Timer / Countdown overlay preview](timer/prev.jpg)

[Configure Timer / Countdown](https://stream.byuwur.co/timer/) · [Local entry point](timer/index.html)

### Webcam Frame

Transparent frame for your camera. **Alpha.**

![Webcam Frame overlay preview](webcam/prev.jpg)

[Configure Webcam Frame](https://stream.byuwur.co/webcam/) · [Local entry point](webcam/index.html)

### Ticker

Scrolling news, commands, and reminders. **Alpha.**

![Ticker overlay preview](ticker/prev.jpg)

[Configure Ticker](https://stream.byuwur.co/ticker/) · [Local entry point](ticker/index.html)

### Watermark

Text, monogram, or logo branding. **Alpha.**

![Watermark overlay preview](watermark/prev.jpg)

[Configure Watermark](https://stream.byuwur.co/watermark/) · [Local entry point](watermark/index.html)

### Lower Thirds

Broadcast cards for guests, games, and moments. **Alpha.**

![Lower Thirds overlay preview](lower-thirds/prev.jpg)

[Configure Lower Thirds](https://stream.byuwur.co/lower-thirds/) · [Local entry point](lower-thirds/index.html)

### QR / Link Card

Locally generated QR code and link card. **Alpha.**

![QR / Link Card overlay preview](qr/prev.jpg)

[Configure QR / Link Card](https://stream.byuwur.co/qr/) · [Local entry point](qr/index.html)

### Periodic Reminder

Automatic reminders on your schedule. **Alpha.**

![Periodic Reminder overlay preview](reminder/prev.jpg)

[Configure Periodic Reminder](https://stream.byuwur.co/reminder/) · [Local entry point](reminder/index.html)

### Stream Badge

LIVE, AFK, recording, and custom labels. **Alpha.**

![Stream Badge overlay preview](badge/prev.jpg)

[Configure Stream Badge](https://stream.byuwur.co/badge/) · [Local entry point](badge/index.html)

### Credits Roll

Closing credits for your community. **Alpha.**

![Credits Roll overlay preview](credits/prev.jpg)

[Configure Credits Roll](https://stream.byuwur.co/credits/) · [Local entry point](credits/index.html)

### Schedule

Dated run of show with current-segment highlighting. **Alpha.**

![Schedule overlay preview](schedule/prev.jpg)

[Configure Schedule](https://stream.byuwur.co/schedule/) · [Local entry point](schedule/index.html)

### Sponsor Carousel

Rotating public logos and messages. **Alpha.**

![Sponsor Carousel overlay preview](sponsors/prev.jpg)

[Configure Sponsor Carousel](https://stream.byuwur.co/sponsors/) · [Local entry point](sponsors/index.html)

### Info Board

Rules, game settings, commands, and other stream details. **Alpha.**

![Info Board overlay preview](info/prev.jpg)

[Configure Info Board](https://stream.byuwur.co/info/) · [Local entry point](info/index.html)

### Screen Effects

Rain, snow, confetti, and floating symbols. **Alpha.**

![Screen Effects overlay preview](effects/prev.jpg)

[Configure Screen Effects](https://stream.byuwur.co/effects/) · [Local entry point](effects/index.html)

### Camera HUD

Recording indicator, timecode, and camera styling. **Alpha.**

![Camera HUD overlay preview](hud/prev.jpg)

[Configure Camera HUD](https://stream.byuwur.co/hud/) · [Local entry point](hud/index.html)

### Progress Timeline

Progress from a starting time to an ending time. **Alpha.**

![Progress Timeline overlay preview](timeline/prev.jpg)

[Configure Progress Timeline](https://stream.byuwur.co/timeline/) · [Local entry point](timeline/index.html)

### Randomizer

Seeded draws for challenges, games, and choices. **Alpha.**

![Randomizer overlay preview](randomizer/prev.jpg)

[Configure Randomizer](https://stream.byuwur.co/randomizer/) · [Local entry point](randomizer/index.html)

### Quote Display

Rotating quotes, tips, and trivia. **Alpha.**

![Quote Display overlay preview](quotes/prev.jpg)

[Configure Quote Display](https://stream.byuwur.co/quotes/) · [Local entry point](quotes/index.html)

### Keyboard Shortcut Sheet

Editable shortcut guide without keyboard monitoring. **Alpha.**

![Keyboard Shortcut Sheet overlay preview](shortcuts/prev.jpg)

[Configure Keyboard Shortcut Sheet](https://stream.byuwur.co/shortcuts/) · [Local entry point](shortcuts/index.html)

### Now Playing

**TBD.** Configure a local track, cover, playback state and timeline. Classic, Compact, Simple, Card and Vinyl share the same settings. Auto accent samples the dominant artwork color and falls back to the manual accent when pixels are unavailable. The demo plays no audio. Windows media sessions require a future OBS helper.

Use **Previous** and **Next** in the Now Playing preview to cycle through your configured track and two sample songs. Enable **Show track buttons on the overlay** to use them in a standalone demo. The Classic demo opens with “Girl Like Me” by PinkPantheress from _Fancy That_, at 0:23 of 2:26. **Cover background → Blurred cover background** is on by default. It tints the artwork behind the track details or across the Card. The demo uses its built-in illustration if the default album cover is unavailable.

![Now Playing demo preview](now-playing/prev.jpg)

[Configure Now Playing](https://stream.byuwur.co/now-playing/) · [Local entry point](now-playing/index.html)

### Chat

**TBD.** Edit local Twitch, YouTube, Kick and TikTok sample messages in stacked, inline or bubble layouts. The intended connection flow uses your platform account directly, without a separate stream.HTML account. Platform authorization and delivery are still to be designed. The four Connect buttons are disabled. Integration mode starts empty. Chat is independent of the native OBS input receiver.

For an OBS custom browser dock, choose **Appearance → OBS dock background** and paste the generated URL into the dock. For example, `/chat/?dockBg=dark` sets the body to `#222`. The default `off` keeps it transparent. Other choices are `black`, `white`, `light`, `slate`, `navy`, and `custom` with a `dockColor` hex value. Panel and message backgrounds have their own controls.

![Chat demo preview](chat/prev.jpg)

[Configure Chat](https://stream.byuwur.co/chat/) · [Local entry point](chat/index.html)

### Counter

**TBD.** Focus the overlay or use OBS Interact. F9 increases and F10 decreases by the configured positive step. Reset defaults to Off. Bind physical codes such as `KeyW` or `F11`. F1 and F2 stay reserved. A held key counts once. Opposing bindings on one press or native snapshot cancel, and a reset press takes priority. Optional bounds clamp the starting value and every change. Reload restores the configured start. Losing focus or native input preserves the number.

![Counter demo preview](counter/prev.jpg)

[Configure Counter](https://stream.byuwur.co/counter/) · [Local entry point](counter/index.html)

## Shortcuts

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

`F2` switches modes when the editor is included and is ignored inside previews. Renderer-only copies show a warning with links to the official hosted editor and repository for F2 or `#configure`; they never load editor dependencies. Modified or repeated function keys, repeated shortcuts, and IME composition are ignored by the configurator shortcuts.

Focused Controller and Keyboard & Mouse overlays cancel browser actions for keyboard and mouse events the page can cancel, including wheel scrolling and mouse shortcuts. Interactive controls keep their normal behavior, and F2 still opens the configurator. In other overlays, F3/F4 retain browser actions.

## Options

1. [URL settings](#url-settings)
2. [Images and upload providers](#images-and-upload-providers)
3. [Keyboard and input history](#keyboard-and-input-history)
4. [Controller settings](#controller-settings)
5. [Social account settings](#social-account-settings)
6. [Main scene settings](#main-scene-settings)
7. [Future input interfaces](#future-input-interfaces)

### Element controls

The form opens with **General** and **Appearance**, followed by the elements in the overlay. Open a text element for its typography, or open **Spacing**, **Transforms**, **Animation in**, or **Animation out** to change how it fits, appears, and disappears. A blank spacing field keeps the resource layout. Zero removes spacing on that side. Negative margins and separate row and column gaps are supported where the element layout allows them.

Generated settings use dotted keys in URLs and JSON, such as `socialHeading.fontSize`, `coverImage.rotateY`, and `coverImage.marginRight`. Older URLs and JSON still load. The parameter reference in each configurator lists its available keys and defaults.

Each text field has a **Text overflow** choice under **Typography**. **Wrap** uses additional lines, **No wrap (clip)** cuts off the line at its edge, and **Ellipsis** marks the cutoff with an ellipsis. Choose **Ticker scroll** to scroll overflowing text independently of other animations. Short text stays still. **Layout default** uses the resource’s formatting. The Now Playing title scrolls by default and uses an ellipsis when Animate is off or the system requests reduced motion. Its title, artist, and album can each use a different mode.

**Animation in** and **Animation out** start **Off**. In Input History they affect each entry. In Main Scene Socials they affect each account card as it rotates through. Quotes, sponsor cards, lower thirds, reminders, ticker messages, and draws animate when their content changes. Headings and controls stay in place. Scroll effects replay as each ticker item or credit line enters and leaves view. Individual parts can also have their own effect. Choose **Default** for built-in motion. [Animate.css effects](https://animate.style/) start at **300 ms** with the **Ease** curve. You can choose another curve, enter a custom cubic Bézier, or adjust the **Travel distance**, which defaults to **10%** of the moving effect's original distance.

Use **Container** to animate a whole collection alongside its items, or **Child elements** to give the direct children of a container a shared effect. An individual child can override that effect. **Hide overlay** and **Show overlay** fade the whole preview out and in over 300 ms, even when animations are off. Showing the overlay also replays its configured entrance effects.

Content panels grow and shrink with their visible content. Maximum dimensions cap the panel, and **Fill width** stretches it within that limit. Under **Appearance → Container resizing**, the duration and curve control both panel resizing and the movement of visible elements when content changes. The defaults are **300 ms** and **Ease**. Set the duration to zero for instant layout changes. When an animated item changes, its outgoing effect finishes first. The container animates its width and height while text, icons, and artwork keep their proportions and spacing. The incoming content enters after the resize finishes. Slide effects default to 10% travel. The playback canvas and artwork keep their source geometry.

**Match animation in and out** starts on. For example, `slideInLeft` pairs with `slideOutLeft` and shares its duration, delay, curve and distance. Turn matching off to choose the exit independently. Exits play when the overlay hides or replaces an element. The **Animate** switch controls motion across the overlay.

For text, choose **Automatic contrast** in Appearance or for an individual element. The renderer compares black and white against a sample of the background behind the text. Main and Now Playing also sample readable background artwork and its tint. When artwork pixels are unavailable, contrast uses the known surface colors. Transparent areas use the usual text color because the browser source cannot sample other OBS sources.

### Future input interfaces

In Now Playing, Counter, Keyboard & Mouse or Controller, explicitly select the **OBS helper (TBD)** source. Browser input remains the default for the input overlays. Controller's custom-mapping editor still captures from browser devices. There is no plugin or network transport in this release.

Deliver packets in the **overlay document** using `byStream.receiveNative(packet)`. It returns `true` after a mounted subscriber accepts a packet, or `false` for an unhandled channel, invalid packet or duplicate/out-of-order sequence. No input is queued or persisted. Start each channel with its full current snapshot after mount or recovery. Retry initial delivery if the renderer is still loading its artwork. Increase the nonnegative safe-integer `seq` on every subsequent packet within that channel. Send a fresh snapshot at least every two seconds, including during silence or pause. Five seconds without valid input releases that channel. Send reset on disconnect or before restarting sequence numbers.

```js
const send = (channel, seq, state) => byStream.receiveNative({ version: 1, channel, seq, state });
send("keyboard", 0, { keys: ["F9"] }); // Baseline only for Counter
send("keyboard", 1, { keys: [] });
send("keyboard", 2, { keys: ["F9"] }); // One increase
send("mouse", 0, { buttons: [0], dx: 0, dy: 0, wheel: 0 });
send("controller", 0, { pads: [{ index: 0, id: "Pad A", buttons: [0, 0.75], axes: [-0.25, 0] }] });
send("media", 0, {
  available: true,
  title: "After the Equinox",
  artist: "Lumen Coast",
  album: "Night Atlas",
  cover: "",
  duration: 214,
  position: 43,
  playback: "playing"
});
send("media", 1, { available: false });
byStream.receiveNative({ version: 1, channel: "reset" });
```

- Keyboard supplies up to 256 unique case-sensitive physical codes (1–40 ASCII alphanumerics starting with a letter). Counter uses rising edges after the first snapshot, including after reset or expiry.
- Mouse supplies unique held DOM button indices 0–4. Movement is in pixels and signed vertical wheel units indicate direction. Each delta is finite and within ±4096. Start with zero deltas and send zeros in heartbeats. A new movement or scroll belongs to exactly one sequence number.
- Controller supplies up to eight distinct indices 0–7, a nonempty device ID of up to 128 characters, up to 64 button pressures from 0 to 1, and up to 32 axes from −1 to 1. Omitting a device disconnects it. Keyboard snapshots can drive Controller's keyboard player.
- Media accepts title, artist and album strings up to 512 characters each. Use an empty string for missing art or text. Cover URLs use the resource image rules and a 65,536-character limit. Duration and position are finite seconds from 0 to 604800. Position clamps to known duration. A duration of zero hides the timeline and times. Each snapshot replaces the track, position and state (`playing`, `paused` or `stopped`). Only playing advances. Stopped, unavailable and expired media use the configured idle display.
- Reset releases all subscribed native channels in that document. It preserves the Counter value. Subscriptions end with their renderer.

Chat's separate same-document interface exists only in **Platform integration (TBD)** mode after mount. `receive` returns true for an accepted message. Invalid messages and duplicate IDs return false. The renderer remembers the latest 256 accepted IDs, keeps at most the configured 1–100 visible rows and measures optional expiration from receipt. `clear()` removes messages, expiry work and remembered IDs.

```js
window.byStreamChat.receive({
  id: "demo-17",
  platform: "twitch",
  name: "MossCircuit",
  text: "Good evening 🌙",
  timestamp: Date.now(),
  color: "#73d1a9",
  avatar: "",
  badges: ["sub"]
});
window.byStreamChat.clear();
```

Use `twitch`, `youtube`, `kick` or `tiktok`. Supply a nonempty ID (128 characters maximum), name (80), nonblank message (1000) and a nonnegative Unix timestamp in integer milliseconds within the JavaScript Date range. Optional fields are a six-digit hex color with leading hash, a validated image URL (up to 65,536 characters) and up to three badges from `mod`, `sub` and `vip`. Text is displayed literally.

### URL settings

Bare URLs open the configurator with saved preferences. Explicit query values take priority. Form, JSON and URL edits update the preview after 250 ms. Press Enter in the URL field to apply it immediately. **Copy URL** shares the current settings.

Compact JSON includes required and changed fields. **Show all fields** includes defaults and conditional fields. Missing keys restore defaults. Invalid edits keep the last valid preview. **Reset** restores the opening configuration. **Advanced → Restore resource defaults** clears saved preferences.

Generated URLs contain changed settings and active `urlRequired` fields. Controller includes `player` and `skin`, Popup includes `accounts`, and Main includes `sceneTitle`. Empty text hides its container. An empty list such as `accounts=[]` removes its items. Clearing a number restores its default. Controller omits the default `shellAppearance=off` and displays the original artwork.

The form handles encoding and list add/edit/reorder/remove. Colors use 3/4/6/8 hex digits without `#`, including alpha: `fontColor=fff`, `backgroundColor=00000000`. Runtime restores `#`; older encoded hashes work. Invalid colors retain defaults; RGB/HSL/named colors are outside the contract.

Timer, Timeline, Reminder and timed Randomizer start on page load. Enable **Use fixed start time** (`useStartTime=yes`) to keep the same timestamp across reloads and shared links, including older links. Timeline otherwise uses `duration` (default 3600 seconds). Timer deadline mode uses its absolute end time and Restart starts on load. Schedule uses calendar dates.

Most sliders and number-field arrows step by one. Type decimals or values outside the slider’s range in the number box, within the field’s limits. Counts require integers, outline multipliers step by 0.1, and Social popup font weight steps by 100. Colors accept HEX and alpha. Fonts can use Google, system or installed families. Every overlay has a transparent canvas. The BONYUR preset restores its card palette. Backdrop blur samples the browser page only. Animate, shadow and glow are independent controls.

#### Shorter URLs

Open **Advanced** from the toolbar gear or footer. Compression is raw DEFLATE plus unpadded Base64url; the panel shows length/savings and keeps the readable URL when shorter.

| Mode            | URL representation                                                                                                  |
| --------------- | ------------------------------------------------------------------------------------------------------------------- |
| All settings    | `?data=<compressed ordinary query string>`; readable parameters alongside it override packed values.                |
| Selected fields | `?accounts=dr:<token>&mode=left`; checked fields compress independently and keep their names. Others stay editable. |

Plain values need no marker. Escape literal text starting with `dr:` or `raw:` as `raw:<original text>`; generated links do this automatically. `#configure` restores compression choices. Invalid compressed fields retain defaults without discarding valid neighbors; Advanced shows a warning.

Whole-query decoding is capped at one MiB. Individual values use the field's UTF-8 text limit, allowing up to four bytes per character, capped at one MiB. Images may also use the bounded Base64 data URIs described above.

#### Older URLs

Replace `controller.html`, `popup.html`, or `main.html` with its tool folder. Rebuild retired settings in the form: Controller `scale`; Popup `fontSizeRem`/`textYOffsetRem` (now `fontSize`/`textYOffset` in pixels), per-platform handles/account counts; Main scene `mode`, `showBG`, `hideCountdown`, and weekday fields.

Current URLs use percentages for opacity, deadzone, and scale: `100` means 100%, and `25` means 25%. Replace older fractional values explicitly; they are not converted. Social accounts use ordered rows so platforms may repeat; Main schedule entries use weekday maps. Unsupported list shapes retain defaults rather than being migrated. The form and Parameters dialog show the current fields and accepted values.

### Images and upload providers

Use **Browse** or drop a PNG, JPEG, WebP or GIF on an image field. GIF animation is preserved. **Manual** accepts a URL, relative path or supported image data URI. **Base64** embeds up to 16 KiB of original data locally. Larger images need a URL. Set `byConfigurator.imageOptions.base64MaxBytes` to change the local limit.

Catbox and GoFile are disabled by default. Choosing a provider applies to the next file. Editing, resetting or removing a field cancels its pending operation. Provider choices stay out of saved settings and links.

#### Hosted upload adapter

`upload_image.php` keeps the standalone upload adapter available for future hosts. All shipped providers are disabled, and the default provider ID is empty. A direct Catbox request is rejected before contacting Catbox. The endpoint accepts multipart POST `fileToUpload` and a provider ID. It validates uploaded-file origin, actual byte size, Fileinfo MIME, dimensions, and a bounded GD decode, then forwards the original file with `CURLFile` to an enabled provider. Upload limits are **8 MiB** and **16 megapixels**. Decoder memory is also bounded by the server's available memory.

Add a future host to the `$providers` array in `image_upload_provider()`. Each definition declares `name`, `enabled`, `endpoint`, `explicit`, the multipart `file` field, fixed `fields`, and a `parse` callback. Set `enabled` to `true` for that host. Its parser extracts an approved HTTPS image URL from the provider's plain-text or JSON response and returns `null` on failure. Successful URLs may use any host, opaque paths, or query parameters. HTTPS and credential-free URLs are checked after parsing. Catbox's disabled definition and parser serve as a reference.

```js
byConfigurator.imageOptions = {
  providers: [{ id: "my-host", name: "My image host" }]
};
```

Provider selection uses the request's `provider`, then `STREAM_UPLOAD_PROVIDER`, then `IMAGE_UPLOAD_DEFAULT_PROVIDER`. Requests cannot enable a disabled host or supply its endpoint, operation, or explicit-error policy. Unknown or disabled request providers return 400. An empty or unavailable server default returns 503. Manual and Base64 continue to work independently of this endpoint.

A provider's `explicit` flag controls public diagnostics. When true, its response body, transport details, and diagnostic header reach the browser's `console.error`. When false or absent, failures return `<provider name> upload failed.` without `X-Upload-Diagnostic`, keeping the HTTP failure status. PHP also records the complete bounded upstream response in its server log.

1. Enable **PHP 8.2+**, **cURL**, **Fileinfo**, and **GD with PNG/JPEG/WebP/GIF support**. Use the system CA trust store, keep TLS verification enabled, and allow outbound HTTPS to the configured host.
2. In Hostinger's PHP settings use `file_uploads=On`, `upload_max_filesize=8M`, `post_max_size=10M` or higher, `max_execution_time=60` or higher, `memory_limit=256M`, `display_errors=Off`, and `log_errors=On`. Disable displayed startup errors too; PHP can reject a request before this script executes. Ensure `upload_tmp_dir` exists and is writable by PHP. The application cannot raise PHP/web-server/proxy request limits; configure those separately to admit an 8 MiB file plus multipart overhead.
3. The limiter defaults to a private `stream-image-<installation hash>` directory under PHP's system temporary directory. It creates the directory with mode `0700` and its locked file with `0600`. If Hostinger's `open_basedir` restricts temporary storage, precreate a private directory **outside the public document root**, owned/writable only by the PHP user, and set the server environment variable `STREAM_UPLOAD_RATE_DIR` to its absolute path. Allow this path in `open_basedir`. Never place it in a downloadable folder. Storage failure/corruption rejects uploads with 503; it never disables limiting.
4. After enabling a host, verify HTTPS and `OPTIONS` (204), a small supported image POST, invalid-file errors, and browser diagnostics. Frontend tests mock the service. Local success does not establish a live provider upload.

The limiter allows **10 POST attempts per client address per 10 minutes**, including invalid attempts. It trusts only `REMOTE_ADDR`; arbitrary forwarded headers cannot evade it. Shared proxies/NAT share a limit. The lock serializes updates, expired entries are removed, and active clients are capped at 4096. A 429 response includes `Retry-After`. Wildcard credential-free CORS supports production, GitHub Pages, localhost, `file://`, and independent copies, including error responses and preflight; CORS is not abuse protection.

For upload failures, inspect **DevTools -> Console**: `console.error` includes the error plus the endpoint, HTTP status, `X-Upload-Diagnostic`, and full response text. Field feedback shows a bounded excerpt; the console retains the complete body received. **Network -> upload_image.php -> Response** also shows the provider's response. `X-Upload-Diagnostic` exposes the cURL error number and upstream HTTP status, for example `transport=0; upstream=412`; failed URL validation adds `response=invalid`. CORS exposes the diagnostic header to independent configurators. Canceled or superseded operations do not log errors or replace the current field value. For local 413 errors check server/application limits; for local 429 wait; for local 503 check extensions/private storage. Provider errors carry their own response text; transport failures need outbound connectivity/TLS checks.

### Keyboard and input history

[Configure Keyboard & Mouse](https://stream.byuwur.co/keyboard/) · [WASD overlay](https://stream.byuwur.co/keyboard/?mode=both&layout=fps)

Choose keyboard, mouse, both or history only. Select a full, compact or gaming layout, filter physical keys by code or group, and assign key labels or action descriptions. **Compact** closes empty rows and columns. Mouse feedback includes buttons, wheel and direction. Input requires focus. An OBS browser source cannot see keys pressed in another application.

Use `imageUrl` with `imageTarget=none|shell|keys|all` to mask a background to the shell, key contours or both. Fit, scale, opacity and tint are independent. Outlines and input feedback stay visible. A failed image falls back to vector artwork.

#### Input history

Keyboard and Controller can show recent presses as icons or text. History is off by default and floats over the device at the selected position. With horizontal history, a width of 0 fills the available width. With vertical history, a height of 0 fills the available height. A zero size on the other axis fits the entries unless **Fill parent** is enabled. **Newest entry** pins the latest press to the selected edge even while the history is partly empty.

Under Input History, **Animation in** plays on each new entry and **Animation out** plays when it is displaced. Simultaneous presses appear side by side (60 ms by default). Keyboard combos show a small `+` between keys. Held modifiers join the next action, and repeated presses show a small multiplier beneath the buttons.

Keyboard history can include every received input or just displayed controls. Controller history requires one displayed player and clears when multiple controllers mount. Focus loss clears held inputs. History stays in memory and records physical controls rather than typed text.

### Controller settings

[Example: Player 1, Xbox One](https://stream.byuwur.co/controller/?player=1&skin=xone)

| Parameter | Meaning |
| --- | --- |
| `player` | Gamepads `1`-`8` (default `1`); keyboard `9`; `all-gamepads` always shows P1-P8 and `all-inputs` adds keyboard. `gamepads` and `all` show only connected inputs without/with keyboard. |
| `skin` | `xseries` Xbox Series (default), `ds5` DualSense, `fgc` Fight Stick (8 buttons), `fgc6` (6 buttons), `fgc4` (4 buttons), `xone` Xbox One, `ds4` DualShock 4, `x360` Xbox 360, `ds3` DualShock 3, `gcn` GameCube, `n64` Nintendo 64, `snes` SNES, `nes` NES. |
| `showPlayerIndicators` | `no` (default) hides player lamps, including Xbox 360 guide segments; `yes` shows them. |
| `layout`, `buttonLabels` | `full` (default) or `minimal`; `icons` (default), `letters`, or `none`. |
| `pressEffect`, `releaseDuration` | Invert (default) reverses the button face color. Smooth release fades the face back over `0`–`500` ms (default `100`) while custom guide artwork keeps its color and detail. Fill uses crimson, Fill + depth shades the edge, and Fill + glow lights the face. Analog triggers retain proportional pressure. Animate Off makes feedback immediate. |
| `variant` | A palette supported by that model, such as PS2 `silver` or `white`; Default (`original`) uses its SVG base palette. The picker lists only that skin's variants. Changing Skin preserves Default and Sequential (all); a named palette resets to Default. Sequential (all) (`sequential`) cycles Default and the available palettes across visible controllers, repeating as needed; a single controller uses Default. Solid shell tint preserves the selected palette. |
| `shellAppearance` | `off` (default) retains the original shell; `solid` tints its authored plastics; `image` applies the shell image. The former Custom colors switch is removed; its saved values migrate. |
| `tintControls` | Default `no`. Adds a 20% tint to control surfaces while retaining markings and input feedback; in Image mode it also enables the shell image tint controls. |
| `disconnectedTint`, `disconnectedOpacity` | Disconnected tint (alpha controls strength; transparent disables it) and opacity `0` to `100`% (default `5`). Connected appearance is unchanged. |
| `controllerColor` | Tint color, initially white. Used by Solid color, image tint, optional control tint, and automatic outline tint. |
| `tintOutlines`, `customOutlineColor`, `outlineColor` | Both switches default to `no`, retaining native stroke colors. Automatic tint derives darker outlines from the shell and takes precedence over an enabled manual color. |
| `outlineWidth` | Structural stroke multiplier, `0.5`-`2` in `0.1` increments, default `1`. Hardware lettering, fine details, and filled borders retain their proportions. |
| `highlightIntensity`, `shadowIntensity` | Independent vector shading intensity, `0`-`100`%; defaults `12` and `16`. |
| `customGuide`, `guideSource` | Eligible system/home buttons retain their original symbol by default. Enable `customGuide=yes` to choose `symbol` or `image`. Replacements paint above the shell, with a button face covering the original emblem's cutout. |
| `guideSymbol`, `guideImage` | Original hardware, Xbox, PlayStation, Steam, circle, diamond, or star; alternatively a safe HTTP(S)/relative PNG, JPEG, WebP, SVG, or animated GIF image URL. Failed images restore the original emblem. |
| `guideColorMode`, `guideColor` | `original` preserves symbol/image colors. `custom` recolors symbols or applies an alpha-preserving monochrome image tint. |
| `guideScale`, `guideOffsetX`, `guideOffsetY` | Scale `50`-`150`% (default `100`), offsets `-25`-`25`% (default `0`). Content preserves aspect ratio and is clipped within the replacement button area. |
| `screenOpacity` | Display interior opacity, `0`-`100`%; default `0` creates an alpha opening while retaining the bezel. |
| `opacity` | `0`-`100`%; default `100`. |
| `offset`, `deadzone` | Stick travel in source pixels, scaled for the fighting stick and compact layouts; deadzone `0`-`100`% (default `5`). |
| `strength`, `curve` | `strength=1` uses proportional trigger filling (default); `strength=0` uses a digital state; `curve=1` enables stick curving. |
| `rotation` | Maximum steering-wheel rotation, `0`-`360` degrees; default `120`. |
| `mapping` | Custom Mapping binding array; `[]` uses defaults. Legacy `{"mapping":[...]}` works. |
| `mirror`, `fitMargin` | Mirror artwork horizontally; viewport fit margin in pixels (default `16`). |
| `horizontalPosition`, `verticalPosition` | Signed pixel offsets from the viewport center; both default to `0`. |

- Nintendo: `nes`, `famicom`, `snes`, `superfamicom`, `n64`, `gcn`, `wii`, `wiinunchuk`, `wiiclassic`, `wiiupro`, `wiiu`, `joycon`, `switchpro`.
- PlayStation: `ps`, `ds2`, `ds3`, `ds4`, `ds5`.
- Xbox: `xbox`, `x360`, `xone`, `xseries`.
- Sega: `mastersystem`, `genesis`, `saturn`, `dreamcast`.
- Steam: `steam` (2015), `steam2` (2026), `steamdeck`.
- Other: `turbografx`, `playdate`, `fgc`, `fgc6`, `fgc4`.

Up to eight gamepads have independent player slots P1-P8; keyboard remains P9 and is excluded from the gamepad count. Existing browser indices 0-7 keep their corresponding player when available; other indices take a free slot. Connected players keep their assignments when another device disconnects. `player=all-gamepads` (All) always shows P1-P8; `player=all-inputs` (All + Keyboard) adds P9. Disconnected slots retain their configured tint and opacity. `player=gamepads` (All connected) shows connected gamepads only; `player=all` (All connected + Keyboard) includes keyboard. All multi-player modes use a responsive grid. Native player lamps keep their geometry and positions. Full layouts use smaller, closely spaced dark squares with a thin black outline and a green glow, placed clear of logos; Joy-Con lamps run vertically between the controllers. Minimal rows retain their existing size and position. Xbox 360 uses its guide ring in full mode and adds the shared row in minimal mode. In full and minimal layouts: P1-P4 light their corresponding lamp, P5 `X--X`, P6 `-X-X`, P7 `--XX`, P8 `X-XX`, and keyboard `XXXX`.

The integration SVGs contain their stock colors and model-specific palette variants. The coordinated palettes are BONYUR (`bonyur`), Arctic (`arctic`), Sakura (`sakura`), Lagoon (`lagoon`), Forest (`forest`), Sunset (`sunset`), Royal (`royal`), Sandstone (`sandstone`), and Cyberpunk (`cyberpunk`). These style shells, panels, and buttons. Fight Stick's three layouts already use BONYUR as Default and offer the other eight palettes on their controls. Every skin has at least nine palettes including Default; existing stock variants remain available. PlayStation, Xbox, Dreamcast, Steam, and Fight Stick themes use matching face-button fills; Genesis and Saturn keep A/B/C together. Xbox theme labels use contrasting light colors. Shell appearance starts Off, preserving the SVG palette. Disabled drafts remain in editor preferences while shared URLs omit inactive controls. Legacy Custom colors and Image + tint settings migrate to the new appearance and tint controls.

| Shell parameter                               | Meaning                                                                                                                                                                            |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `shellAppearance`, `shellImage`               | `off` (default), `solid`, or `image`; safe URL, relative path, or raster data URI. Failed loads retain the authored shell.                                                         |
| `shellFit`                                    | `cover` (default), `contain`, or `stretch`. Contain and transparent images reveal the configured solid shell beneath.                                                              |
| `shellPositionX`, `shellPositionY`            | Offsets as percentages of the model's shell bounds, `-100` to `100`; default `0` centers the image.                                                                                |
| `shellScale`, `shellRotation`, `shellOpacity` | Zoom `10`-`500`%, rotation `0`-`360` degrees, opacity `0`-`100`%; defaults `100`, `0`, `100`. Older negative image angles migrate to equivalent positive angles.                   |
| `controllerColor`, `shellTintStrength`        | Tint color and strength `0`-`100`% (default `100`). Available for Solid color or Image with Tint controls enabled. The retired `shellTintColor` key migrates to `controllerColor`. |
| `shellBlendMode`                              | `multiply` (default), `overlay`, `soft-light`, `color`, or `fill`. Fill applies ordinary color opacity; all modes preserve source alpha.                                           |

The [controller artwork](controller/controllers/) contains the SVGs used by the overlay. Nine angled illustrations serve as references only (`360-A`, `ONEX-A`, `PS4-A`, `PS5-A`, `STEAM2-A`, `SWITCH-A`, `SWITCH-B`, `SWITCHPRO-A`, `SX-A`). Steam Deck and Wii U use horizontal artwork. The Nunchuk front is reconstructed from its angled reference, with indicators for rear controls.

The [Steam hardware specifications](https://www.steamdeck.com/en/tech), [Nintendo Nunchuk controls](https://www.nintendo.co.jp/hardware/wiiu/accessories/nunchuk/index.html), and [GamePad Viewer](https://gamepadviewer.com/) were used as hardware/interaction references. Trackpad clicks can be assigned through Custom Mapping. Rear grips, final-click indicators, rails, volume, and crank activation are omitted from the visual controls; existing saved mappings retain their logical output indices. Browser Gamepad API exposure depends on the device/adapter; touch coordinates, motion, and native crank-angle tracking are not implemented.

**Reset image adjustments** restores fit, placement, opacity, and tint defaults while retaining the image and appearance mode. The ordinary Reset restores the opening configuration. Hidden image controls retain their drafts and are omitted from URLs. Uploaded bytes are never changed for tinting. Ordinary overlay rendering uses the final image URL directly and never calls PHP. Chromium pixel tests cover clipping, transforms, tint, transparency, and multiple instances; actual OBS Browser Source rendering and endurance still require verification in your OBS build.

Guide customization replaces the emblem inside an existing SVG slot without changing its binding or housing. `guideColorMode=original|tint|custom` keeps original colors, blends a tint, or applies the existing monochrome color. Tint uses independent `guideTintColor` (default white), `guideTintStrength` (0-100%, default 0), and `guideBlendMode` (`multiply`, `overlay`, `soft-light`, `color`, or `fill`), preserving the logo's transparency. Guide tint works independently of shell tint. Fill uses tint strength as ordinary color opacity. SVG image URLs load as images rather than injected markup. Animated GIFs stay mounted through input frames and direct layout switching; Chromium tests verify changing rendered frames. Verify playback in your OBS build separately.

Controller requires HTTP/HTTPS because browsers block fetching editable SVG resources from `file://`. No build step is needed. Tests in `__tests__/resources.cjs` cover control isolation, palettes, trigger pressure, alpha openings, layout reuse, and rendered-pixel inversion in Chromium, Firefox, and WebKit. Unavailable engines are explicitly skipped locally and fail in CI; WebKit testing does not establish OBS or Safari behavior on Apple hardware.

Choose **Keyboard** for automatic keyboard input; **F** also connects the keyboard for input detection. **Custom Mapping** shows connected devices, model-specific outputs, and recording controls. Add a binding, choose the output, select **Record input**, press the input, then **Apply mapping**. Keyboard capture accepts any identified key (`choiceType: "keys"` with its physical `KeyboardEvent.code`); older button/axis keyboard bindings still work. Escape or **Cancel recording** cancels the capture. Incomplete or duplicate bindings keep the applied mapping unchanged. Clear the binding draft and apply to restore standard input; Reset restores the opening configuration. Axis ranges and packed D-pad hats remain available for unusual adapters. DualSense microphone mute has its own output (`22`); bind it through Custom Mapping when an adapter exposes that input at a different raw index. N64 C buttons use the right stick on standard pads, with custom mapping targets 18-21 for dedicated C buttons. Skins fit the viewport automatically. Appearance controls retain background, opacity, scale, tilt, offsets, and artwork filters.

### Social account settings

Choose platforms, handles, and order. Repeated platforms are allowed. Brand icons use a globe fallback.

| Parameter | Meaning |
| --- | --- |
| `mode` | `right` (default) or `left`. |
| `accounts` | Ordered rows, e.g. `[{"platform":"twitch","handle":"/byUwUr"},{"platform":"twitch","handle":"/byUwUr_es"}]`; up to 100 accounts, 160 characters/handle, 20,000 JSON characters. `[]` hides it. |
| `pauseTime`, `inbetweenPauseTime` | Seconds/account and between cycles: `0`-`3600`, default `3` each. |
| `animationSpeed` | Playback speed `0`-`500`%; `100` is normal and `0` pauses animation. |
| `scale` | `-500`-`500`%, anchored to the selected top corner; `100` keeps the original size. |
| `iconBoxColor`, `textBoxColor`, `iconColor`, `fontColor` | Hex colors without `#`; defaults use deep red `#600`, off-white `#eee`, and translucent charcoal. |
| `primaryFont`, `fontWeight` | Font family and weight `100`-`900`, step `100` (default `600`); Courier/monospace fallback. |
| `fontSize`, `textYOffset` | Size `8`-`100` px (default `48`); offset `-100`-`100` px. |
| `opacity`, `cornerInset`, `textPadding` | Optional opacity `0`-`100`%, signed corner inset on both axes, and horizontal text padding in pixels. |

Invalid JSON/platforms retain the two byUwUr default accounts; blank handles keep their slots. Font readiness and remeasurement keep animation aligned. Separate account-name and icon typography, text-box borders/shadows, placement, and filters are available in the form.

### Main scene settings

Countdown, Social accounts, Schedule, and Event labels each select a corner. Cards sharing a corner reserve their scaled dimensions and flow side by side or stacked with shared spacing/inset controls. Each component owns its Placement, typography, surfaces, and effects subsections; redundant fixed-side position fields are removed. Background tint has an independent toggle, color, strength, and Multiply/Overlay/Soft-light/Color/Fill blend mode.

[Example: Starting soon](https://stream.byuwur.co/main/?sceneTitle=Starting+soon&tagline=Your+channel&countdownTime=5&displayBranding=no&displaySocial=no)

| Parameter | Meaning |
| --- | --- |
| `sceneTitle`, `tagline` | Multiline title up to 300 characters; subtitle up to 160. |
| `countdownTime`, `countdownMessage`, `countdownOverMessage` | Minutes `0`-`1440` (default `4`); during/after messages. |
| `countdownFormat` | `stopwatch` (total minutes/seconds, default), `clock`, `hours`, `units`, or total `seconds`. |
| `displayCountdown`, `displayBranding`, `displaySocial`, `displaySchedule`, `displayLabels` | `yes`/`no` toggles. Branding hides only the logo. |
| `primaryFont`, `titleSize`, `subtitleSize` | Font family and sizes `8`-`200` px; Courier/monospace fallback. |
| `primaryTextColor`, `subTextColor`, `accentColor`, `frameColor`, `contentBackgrounds`, `backgroundColor` | Hex without `#`; background defaults to transparent `00000000`, accent and frame to dark crimson `440000` at 8 px. |
| `frameWidth`, `frameInset` | Border thickness `0`-`100` px (default `6`); optional signed inset in pixels. |
| `logoUrl`, `logoOpacity`, `logoScale` | Image URL/path (default `https://byuwur.github.io/img/logo.png`), opacity `0`-`100`% (default `4`), scale `-500`-`500`% (default `100`). |
| `displayBackground`, `backgroundType`, `backgroundUrl`, `backgroundScale` | Media toggle (Off by default), `image`/`video`, media URL/path, and scale `-500`-`500`%. Enable the toggle to show media; the default URL is the BONYUR logo. |
| `backgroundBlur`, `backgroundOverlayOpacity`, `backgroundOverlay` | Blur `0`-`100` px, tint opacity `0`-`100`%, tint color. |
| `accounts` | Ordered rows with `platform`, `handle`, and `heading`; platforms may repeat. Up to 100 rows, 160 characters per text field, 20,000 JSON characters. Blank handles/`[]` hide accounts. |
| `scheduleEntries` | Weekday-to-text map, e.g. `{"monday":"Activity"}`; up to seven days, 160 characters/text, 4,000 JSON characters. `{}` hides it. |
| `animationSpeed` | Social animation speed `0`-`500`%; `100` is normal and `0` pauses animation. |

Invalid lists retain defaults. Individual controls cover title/subtitle, countdown and completion text, social names/icons, schedule text, event headings, card surfaces, and scene filters. Each visible section has its own positioning or scale controls where applicable. Follower/donation/subscriber labels are editable text, without live service updates.

## Development

Declare visual parts in the resource's `elements` map, with a stable camelCase ID, label, renderer selector and optional parent. Shared field factories supply the typography, spacing, transforms, contrast and entrance controls. List any additional content or behavior fields under their owning element. Use `when` for availability, `box: false` for internal SVG geometry and `gap: true` for a flex or grid container. Resources with sibling background artwork can declare `contrastLayers` in paint order.

1. [Resource contract](#resource-contract)
2. [Add a tool](#add-a-tool)
3. [Dependencies and local files](#dependencies-and-local-files)

Define overlay fields and rendering in `resource.js` and each tool’s resource script. Use `configurator.html` as the editor template. The catalog and settings UI live in `configurator.js`. Keep jQuery, Select2 and other editor-only dependencies in the host.

### Resource contract

In an async `DOMContentLoaded` handler, await `byStream.assetsReady`, then define `resource.fields` with parameter names, types, defaults, labels, sections, descriptions, and constraints. Put renderer-only values in `constants`, then call `await byStream.initResource(resource, integrations?)` before rendering. It decodes/validates URL settings, clones defaults, publishes `window.byStreamResource`/`window.byStreamOverlay`, mounts `overlay-markup` in overlay mode, and resolves to shared settings. Resource scripts use `byStream` and never require `byConfigurator`.

Declare a nonempty `resource.urlRequired` array of field names retained in generated links while active, including when they use defaults. Keep at least one required field unconditional so default links stay in overlay mode. This keeps overlay URLs query-based without emitting unrelated defaults. Include timestamps or scheduled entries whose initial values must survive reloads. Other values are compared against `field.default`; object/array order is preserved, and equivalent hex color spellings compare as the same color. Declare concrete valid defaults directly.

`byStream.settingsURL(resource, settings)` builds the same readable URL for editor actions and native resource interactions, including after importing a compressed URL.

HTML needs `<template id="overlay-markup">...</template>`. The optional editor uses `<div id="configurator"></div>` and an inert `<template id="configurator-assets">` containing its styles and scripts. Load `../resources.css` before the resource stylesheet and mark both links with `data-renderer-style`. Declare local renderer scripts with `src` and `defer` in dependency order: `resource.js`, then the resource script. Declare `_functions.min.js` in the shared external asset group; resource initialization awaits `byStream.assetsReady`. Keep fonts and renderer libraries outside the configurator section. Shared imports stay available in both modes; renderer-only imports (including GSAP/MorphSVG where required) load in overlay mode. Controller mapping UI stays in the editor-only `controller/mapping.js`; `controller/controller.js` applies URL mappings independently in overlay mode. The shared runtime loads editor imports only in configure mode, in their declared order: jQuery before its plugins, Popper before Bootstrap, and `configurator.js` before any resource-specific editor adapter. Settings initialization waits for these imports so saved preferences remain available. Editor styles start with `data-editor-style media="not all"` and activate only in configure mode. Overlay mode never requests these imports. Standalone packaging can omit the existing optional configurator section; no bundler is part of this loading path.

`byConfigurator.init()` generates controls, preview, and parameter help; repeat calls preserve the form/handlers. Only declared fields enter URLs. `byStream.validParameter(fields, name, value)` and `byStream.applyParameters(fields, settings, values?)` share validation; custom validators return a parsed value or `null`. See the starter and existing resources for field metadata. Controller's `byConfigurator.configureResource(resource, editor)` adds mapping/help panels. Native helpers supply platforms/accounts, dates/zones, image checks, and clock-aligned `watch()` updates that pause while hidden.

The runtime exposes `byStream.ready`, the same promise returned by `initResource()`. Before initialization, the optional configurator attaches `byStream.prepareResource(resource)` to read editor preferences and choose its input query. The runtime calls that hook only in configure mode; overlays always read their URL alone. The editor awaits `ready` and reads transport warnings/compression choices from `byStreamResource.urlParameters`. Neither preferences nor editor startup changes the native initializer.

Define valid defaults in `resource.fields`. Resource dimensions and offsets use pixels. Maximum width or height of zero means automatic sizing. Mark fields with `zeroIsDefault` when clearing them or entering zero should restore their declared default. Keep optional text empty. Use explicit Off values for optional features.

Use `subsection` and `when` for conditional fields. Inactive fields keep editor drafts and stay out of generated URLs. Use `retainInactive` for accepted values that need to survive. Declare styles with `styleSelector`, `styleProperty` and `styleUnit` or `styleValue(settings)`. Use `normalizeParameters(values)` for legacy inputs before validation.

Shared `dateTimeFields()` and `dateTimeFormatter()` helpers support presets such as `yyyy/MM/dd`, `dd/MM/yyyy`, `HH:mm`, and `hh:mm:ss a`. Numeric dates use the Gregorian calendar; month names follow the locale. `timezone`, `timezones`, and `locale` field types use searchable Select2 controls with UTC offsets or language/region labels; extra-zone selection preserves order and allows up to three zones. `durationFormats` and `formatDuration()` format elapsed seconds without wrapping total-minute/second modes at midnight. Rotating resources use `changeItems()` to play Animation out on the outgoing item before showing its replacement with Animation in. These helpers remain in the shared framework for resources to opt into.

Each list uses its declared format directly: simple messages are string arrays, unique pairs are maps such as `{"monday":"Activity"}`, and social accounts or other repeated rows use object arrays. Unsupported formats retain defaults; no format conversion is performed. Map keys must be unique, and integer keys follow JavaScript's numeric ordering.

### Add a tool

1. Copy `configurator.html` into the tool folder; replace demo markup/styles/rendering and change shared imports to `../`.
2. Define fields and initialize the resource before overlay rendering.
3. Register folder ID, name, description, icon, category, `status`, and `ready` in `byConfigurator.catalog.tools`. Use `status: "Alpha"` for early testing or `status: "Beta"` for broader testing. Set `ready: true` to publish it in the catalog after review/testing; availability and release status are separate.

The catalog owns order, cards/count, navigation, and displayed release status; static hosting does not discover folders. Keep the status table above in sync with the catalog. IDs determine folder URLs and `prev.jpg`. Update preview images and Open Graph/Twitter metadata together.

### Dependencies and local files

For a local overlay, keep the tool folder, parent `resource.js` and `resources.css`, and renderer dependencies. Include `configurator.js` and `configurator.css` for editing. Serve Controller over HTTP(S) so it can fetch its SVGs. For file-compatible tools, open `{tool}/index.html` and paste its generated `file://` URL into OBS with **Local file** unchecked. Keep the directory structure intact. See [download formats](#downloads) for packaged alternatives.

The landing page starts its CSS batch with `defer: false` during head parsing and declares JavaScript with ordered `<script src defer>` tags. `resource.js` owns `byStream.SPA_VERSION = "v20.17"`, overriding each asset group's `data-spa-version` fallback. External JSON asset groups declare their repository URL in `data-source`. Resource pages declare shared helpers/fonts in `#shared-assets`, renderer-only libraries in `#resource-assets`, and editor groups in `script[data-load]` inside `#configurator-assets`. Local editor styles and scripts use explicit `<link>` and `<script src defer>` tags together after the external import group, so local overrides follow SPA assets. SPA.js `_load.min.js` loads these CSS/JS arrays into the head in dependency order; `byStream.assetsReady` resolves before resource initialization. Renderer-only libraries load only in overlay mode; configurators and renderers both load the shared imports. Editor setup runs only in configure mode; renderer application code uses vanilla JavaScript. Main/Popup also use GSAP and Popup uses MorphSVG. Font-enabled pages use native `byFont`. Offline use requires saved CDN dependencies and updated `src`/`href` paths.

## Checks and releases

Check out SPA.js `v20.17` beside this repository or set `SPA_ASSETS_ROOT` to that checkout. Use Node.js 22+ for the browser checks. The upload checks use PHP with cURL, Fileinfo and GD.

```sh
npm --prefix .github ci --ignore-scripts
node .github/node_modules/playwright/cli.js install chromium
export STREAM_CORE_ONLY=1
export NODE_PATH="$PWD/.github/node_modules"
npm --prefix .github test
npm --prefix .github run test:configurator
php -l upload_image.php
node --test __tests__/upload-php.cjs
```

Omit `STREAM_CORE_ONLY` to include appearance checks. [CI](.github/workflows/tests.yml) checks resource startup, URL settings, input and configurators in Chromium, Firefox and WebKit by default. PHP upload checks run once. Manual runs can target one browser or include extended appearance checks.

Build and test a local release preview:

```sh
node .github/scripts/build.mjs --tag v0.0.0-ci
npm --prefix .github run release:test
```

Review the HTML, ZIPs, manifest and checksums in `dist/assets/`. Only a pushed version tag publishes. The pinned SPA.js dependency must be published before refreshing release hashes. [Release workflow](.github/workflows/release.yml)

### Release tooling

| Command | Purpose and outputs |
| --- | --- |
| `npm --prefix .github run release:build -- --tag v10` | Build all resource formats, ZIPs, the [EXPERIMENTAL] embedded Controller, release notes, manifest, and checksums in `dist/assets/`. |
| `npm --prefix .github run release:test` | Check the generated inventory, artwork, browser startup, and publication safeguards with a mocked GitHub API. |
| `npm --prefix .github run release:experiment` | Run `.github/tests/controller-experiment.mjs` against the generated embedded HTML and Controller ZIP, then write local performance diagnostics to `dist/experimental/report.json`. |
| `node .github/scripts/build.mjs --tag v10 --update-dependencies` | Refresh pinned dependency hashes for review during an intentional dependency update. |
| `node .github/scripts/build.mjs --check` | Validate the pushed tag and commit in the Actions release environment. |
| `node .github/scripts/build.mjs --publish` | Upload and publish the tested `dist/assets/` inventory using the Actions release context and token. |

Inspect `dist/assets/RELEASE_NOTES.md`, `manifest.json`, `SHA256SUMS`, and the HTML/ZIP files in `dist/assets/`. The manifest records every distribution, source dependency, size, and SHA-256. Browser checks initialize every portable distribution and exercise shared URL/editor behavior once per format. Online browser tests serve the future tag's project files from the checkout; they do not assert that an unpublished tag already exists on jsDelivr. Bundled browser tests block external application libraries, including Font Awesome, and test HTTP and downloaded-file entry points.

Pinned remote application dependencies and CSS assets are integrity-checked against `.github/scripts/release-dependencies.json` and cached outside the repository. After deliberately changing CDN imports, run `node .github/scripts/build.mjs --tag v10 --update-dependencies`, review the lock changes, and rerun both suites. Do not refresh the lock to conceal an unexpected change to an existing pinned dependency. Required missing dependencies fail the build. New ordinary resources need no release list or download-table edits; register any new dynamically constructed asset paths in the `config.dynamicDependencies` object in `.github/scripts/build.mjs`. Module scripts require explicit import-graph support before distribution; current resources use classic scripts.

For embedded project JavaScript and CSS, the builder prefers jsDelivr's generated `.min` files pinned to the exact source commit. Edited files and unavailable CDN copies use the current local esbuild pipeline. Generated CDN bytes are cached with checksums and recorded in the manifest. CSS bundling embeds its required assets. Controller and Keyboard artwork loaders are rewritten before minification for embedded files and ZIP file-mode fallback. Pinned SPA.js downloads can fall back to `SPA_ASSETS_ROOT` or the sibling `spa.js` checkout when local bytes match the dependency lock.

#### Experimental embedded editions

Every build generates `controller.standalone.embedded.html`, `controller.full.embedded.html`, `keyboard.standalone.embedded.html`, and `keyboard.full.embedded.html` in `dist/assets/`. Full editions include the configurator; standalone editions contain the renderer only. All four embed their original SVG artwork and work directly from disk. The release suite checks HTTP, downloaded HTML, extracted ZIPs, and full-edition configurator switching on `file://`.

```sh
node .github/scripts/build.mjs --tag v10
npm --prefix .github run release:experiment
```

The build writes diagnostic sizes to `dist/experimental/sizes.json`. `release:experiment` derives sizes from the release HTML and ZIP and writes fresh `sizes.json` and `report.json` diagnostics in `dist/experimental/`. It checks downloaded `file://` rendering, model artwork, customization, synthetic gamepad input, and keyboard input, comparing startup, DOM parsing, artwork-rendering time, and JavaScript heap with the packaged HTTP version. SVG bytes are preserved rather than minified separately. Browser heap figures exclude native SVG allocations; OBS compatibility remains unverified.

## Other assets

| Folder / file                                              | Use                                                                 |
| ---------------------------------------------------------- | ------------------------------------------------------------------- |
| `alert-box.streamlabs.com/`, `chat-box.streamlabs.com/`    | Service widgets: copy HTML/CSS/JS and fields into Streamlabs.       |
| `dashboard.twitch.tv/`, `deckboard.app/`                   | Twitch alert templates and Deckboard exports.                       |
| `InputOverlay.OBS/`                                        | OBS Input Overlay plugin artwork/layouts, separate from Controller. |
| `obs-studio/`, `foobar2000.org/`                           | Personal profiles/configurations; not portable installations.       |
| `_byuwur.OBS/`, `_generic.OBS/`, `_overlays.OBS/`, `_art/` | Branding, transitions, backgrounds, and editable media.             |

Back up before importing. Replace devices, paths, and account settings; keep stream keys, WebSocket passwords, and private widget URLs out of shared exports.

## Contributing

[Contributing guide](CONTRIBUTING.md) · [Report an issue](https://github.com/byuwur/stream.html/issues) · [DeepWiki](https://deepwiki.com/byuwur/stream.html)

## License

[MIT](LICENSE.md), copyright Andrés Trujillo [Mateus] byUwUr. Bundled libraries, applications, and media retain their licenses.

Keyboard/mouse artwork in `keyboard/keys/`: [Input Prompts by Kenney](https://kenney.nl/assets/input-prompts), [Creative Commons CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/). Original SVG assets are preserved; layout composition and dynamic colors are applied at runtime.
