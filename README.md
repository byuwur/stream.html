# byuwur/stream.html

**HTML resources for your stream overlays.**

Test it out at:

-   [byuwur.co/\_stream.html/controller/index.html](https://byuwur.co/_stream.html/controller/index.html) or [controller.byuwur.co](https://controller.byuwur.co)
-   [byuwur.co/\_stream.html/popup/index.html](https://byuwur.co/_stream.html/popup/index.html)
-   [byuwur.co/\_stream.html/main/index.html](https://byuwur.co/_stream.html/main/index.html)

## Overview

This project is designed to provide various overlay options for live streaming using OBS (Open Broadcaster Software). The setup includes three distinct HTML overlays, each serving different purposes during a live stream. The project also includes configuration files and JavaScript libraries that support dynamic content and interactive features.

## Project Structure

-   **\*.html**: The main HTML file that can be used as a base for other custom overlays.
-   **config/**: Contains JavaScript files with configuration options for different scenarios like starting, pausing, and ending the stream.
-   **css/**: Contains stylesheets that enhance the visual design of the overlays.
-   **img/**: Contains images used in the overlays, such as logos, backgrounds, and icons.
-   **js/**: JavaScript files that manage the functionality of the overlays, including popups, gamepad controls, and animations.
-   **txt/**: Text files that may be used for dynamic content such as recent followers, donations, or subscribers.

## HTML Overlays

### 1. Controller `controller/index.html`

-   **Purpose**:
    -   This overlay is designed to be used as a controller input viewer for your stream.
-   **Usage**:
    -   Add `controller/index.html` as a browser source in OBS.
    -   Remember explore the search params to configure your overlay.
    -   It automatically detects your Xinput devices.
    -   Configure keyboard bindings through `controller.keyboard.js` in the `controller/config/` directory.
-   Try it out at [controller.byuwur.co](https://controller.byuwur.co).

### 2. Popup Scene `popup/index.html`

-   **Purpose**:
    -   The `popup/index.html` overlay is designed for displaying social media popups during the stream.
-   **Usage**:
    -   Add `popup/index.html` as a browser source in OBS.
    -   Configure popup behavior and appearance through the `popup.settings.js` in the `popup/config/` directory.

### 3. Main Scene `main/index.html`

-   **Purpose**:
    -   This overlay serves as the primary stream interface. It is designed to display the main content during the stream, such as the live feed, branding elements, and dynamic content like social media handles, recent donations, or followers.
-   **Usage**:
    -   Add `main/index.html` as a browser source in OBS.
    -   Configure the settings through the `main.settings.js` file in the `main/config/` directory to match your brand and stream requirements.
    -   Note that there also exists more JS config files such as `main.start.js`, `main.end.js`... These files inherit its properties from `main.settings.js`.
    -   Remember that you can trigger each mode `(start, end, brb, inter)` including the parameter in `main/index.html` (e.g. `main/index.html?mode=start`).

## Configuration Files

### `controller.keyboard.js`

-   **Purpose**: Defines keyboard controls for interacting with the `controller/index.html` overlay.
-   **Key Configurations**:

    -   `buttons`: Array mapping keys to specific functions like Start, Stop, Pause, etc.
    -   `axes`: Controls the axes for different movements or actions.

-   **Key Configurations**:
    -   `backgroundType`: Choose between a video or image background.
    -   `logoOpacity` & `logoScale`: Adjust the visibility and size of your logo.
    -   `countdownTime`: Set the countdown duration before the stream starts.
    -   `social`: Customize social media handles and headers displayed during the stream.

### `popup.settings.js`

-   **Purpose**: This file handles the settings for popups within the `popup/index.html` overlay.
-   **Key Configurations**:
    -   `pauseTime`: Duration each popup stays visible on screen.
    -   `iconBoxColor` & `textBoxColor`: Customize the appearance of the popup notifications.
    -   `values`: List of social media handles displayed in the popups.

### `main.settings.js`

-   **Purpose**: This file contains the common settings for the `main/index.html` overlay, such as background settings, colors, fonts, countdown timers, and social media details. This also includes its variations: `main.start.js`, `main.end.js`...

## Usage with OBS

1. **Setup OBS**: Ensure you have OBS installed and configured to stream to your preferred platform.
2. **Add Overlays**:
    - Add `main/index.html`, `popup/index.html`, and `controller/index.html` as browser sources in OBS based on the roles you want them to serve during the stream.
    - Each HTML file should be added as a separate browser source.
3. **Configure Settings**:
    - Edit the JavaScript files within the `config/` directories to match your branding, schedule, and preferences.
    - Adjust colors, fonts, and other elements as needed in the `main.settings.js` (and/or its variants) and `popup.settings.js` files.
4. **Go Live**: Once everything is set up and tested, start streaming with your fully customized overlays.

## License

MIT (c) Andrés Trujillo [Mateus] byUwUr
