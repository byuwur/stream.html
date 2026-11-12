/**
 * File: controller/controller.js
 * @file Gamepad polling and renderer settings.
 * Deps: resource.js, editable controller SVGs, and embedded bySettingsKB.
 */

const controllerResourceURL = document.currentScript.src;
const controllerInk = (channels) => {
  const luminance = channels.map((channel) => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return luminance[0] * 0.2126 + luminance[1] * 0.7152 + luminance[2] * 0.0722 > 0.179 ? "#111111" : "#EEEEEE";
};

document.addEventListener("DOMContentLoaded", () => {
  byStream.ready = initControllerResource();
});

async function initControllerResource() {
  initControllerMapping();
  try {
    window.byControllerArtwork = await loadControllerArtwork();
  } catch (error) {
    console.error(error);
    const message = document.createElement("p");
    message.setAttribute("role", "alert");
    message.textContent =
      location.protocol === "file:"
        ? "Controller SVG resources require HTTP/HTTPS. Open this overlay through a local web server or its hosted URL."
        : "Unable to load controller resources. Check the controller SVG files, then reload.";
    document.body.appendChild(message);
    return;
  }
  // ==========
  // ==== RESOURCE DEFINITION ====
  // ==========

  // Defaults, URL constraints, and the field metadata consumed by the optional editor.
  const resource = {
    version: "1.2", // 2026-11-10
    title: "Controller",
    description: "Show gamepad or keyboard input with stock colors or optional custom appearance. Choose a model and full or speedrun layout. Gamepads connect after a button press.",
    preview: [1280, 720],
    urlRequired: ["player", "skin", "customColors"],
    sectionIcons: { Input: "fa-solid fa-gamepad" },
    previewAllow: "autoplay; gamepad *",
    normalizeParameters(values) {
      const color = values.has("controllerColor") && byStream.validParameter(resource.fields, "controllerColor", values.get("controllerColor"));
      const outline = values.has("outlineColor") && byStream.validParameter(resource.fields, "outlineColor", values.get("outlineColor"));
      const width = values.get("outlineWidth");
      const oldWidth = width !== null && width.trim() !== "" && Number.isFinite(Number(width)) && Number(width) >= 0 && Number(width) <= 6;
      if (values.has("customColors") || !(color || outline || oldWidth || values.get("tintControls") === "yes")) return;
      values.set("customColors", "yes");
      if (outline) values.set("customOutlineColor", "yes");
      if (oldWidth) {
        // Older links stored absolute widths against a 1.2-unit default.
        values.set("outlineWidth", String(Math.round(Math.max(0.5, Math.min(2, Number(width) / 1.2)) * 20) / 20));
      }
    },
    fields: {
      player: {
        type: "select",
        default: "1",
        label: "Player Number:",
        section: "Input",
        description: "Choose a gamepad or Keyboard. Keyboard uses J/K/U/I for face buttons and arrows for the left stick; Custom Mapping can use any identified key.",
        options: { 1: "Player 1", 2: "Player 2", 3: "Player 3", 4: "Player 4", 9: "Keyboard" },
        id: "player-input",
        icon: "fa-user"
      },
      skin: {
        type: "select",
        default: "xseries",
        label: "Skin:",
        section: "Input",
        description: "Choose a front-facing controller model or Fight Stick layout.",
        options: Object.fromEntries(Object.entries(byControllerArtwork.skins).map(([id, skin]) => [id, skin.name])),
        id: "skin-input",
        icon: "fa-gamepad"
      },
      layout: { type: "select", default: "full", label: "Layout", section: "Appearance", options: { full: "Full controller", minimal: "Minimal / speedrun" } },
      buttonLabels: { type: "select", default: "icons", label: "Button labels", section: "Appearance", options: { icons: "Hardware symbols", letters: "Button letters", none: "Hidden" } },
      variant: { type: "select", default: "original", label: "Color variant", section: "Appearance", options: { original: "Original / base", ...Object.assign({}, ...Object.values(byControllerArtwork.skins).map((skin) => skin.variants)) }, when: (values) => values.customColors !== "yes" && Object.keys(byControllerArtwork.skins[values.skin]?.variants || {}).length > 0, retainInactive: true },
      customColors: { type: "switch", default: "no", label: "Custom colors", section: "Appearance", description: "Off uses the SVG's stock palette, outlines, and guide symbol.", checkedValue: "yes", uncheckedValue: "no", options: { yes: "On", no: "Off" } },
      controllerColor: { type: "color", default: "#000000", label: "Controller color", section: "Appearance", description: "One body color with flat highlights and shadows; also supplies optional control and outline tints.", maxlength: 9, when: (values) => values.customColors === "yes" && (byControllerArtwork.skins[values.skin]?.shell || values.tintControls === "yes" || values.tintOutlines === "yes"), retainInactive: true },
      tintControls: { type: "switch", default: "no", label: "Tint controls", section: "Appearance", description: "Blend button plastics with the controller color. Rubber sticks, shoulders, and mechanical parts retain their hardware colors.", checkedValue: "yes", uncheckedValue: "no", options: { yes: "Yes", no: "No" }, when: ["customColors", "yes"], retainInactive: true },
      tintOutlines: { type: "switch", default: "no", label: "Tint outlines", section: "Appearance", subsection: "Vector details", checkedValue: "yes", uncheckedValue: "no", options: { yes: "On", no: "Off" }, when: ["customColors", "yes"], retainInactive: true },
      customOutlineColor: { type: "switch", default: "no", label: "Custom outline color", section: "Appearance", subsection: "Vector details", checkedValue: "yes", uncheckedValue: "no", options: { yes: "On", no: "Off" }, when: ["tintOutlines", "no"], retainInactive: true },
      outlineColor: { type: "color", default: "#111111", label: "Outline color", section: "Appearance", subsection: "Vector details", maxlength: 9, when: ["customOutlineColor", "yes"], retainInactive: true },
      outlineWidth: { type: "number", default: 1, label: "Outline thickness (×)", section: "Appearance", subsection: "Vector details", min: 0.5, max: 2, step: 0.05, description: "Multiplies each structural stroke's own SVG width. Filled-path borders and hardware symbols retain their proportions.", when: ["customColors", "yes"], retainInactive: true },
      highlightIntensity: { type: "number", default: 12, label: "Highlights (%)", section: "Appearance", subsection: "Vector details", min: 0, max: 100, when: (values) => values.customColors === "yes" && byControllerArtwork.skins[values.skin]?.highlights, retainInactive: true },
      shadowIntensity: { type: "number", default: 16, label: "Shadows (%)", section: "Appearance", subsection: "Vector details", min: 0, max: 100, when: (values) => values.customColors === "yes" && byControllerArtwork.skins[values.skin]?.shadows, retainInactive: true },
      customGuide: { type: "switch", default: "no", label: "Custom guide button", section: "Appearance", subsection: "Guide button", checkedValue: "yes", uncheckedValue: "no", options: { yes: "On", no: "Off" }, when: (values) => values.customColors === "yes" && byControllerArtwork.skins[values.skin]?.guide, retainInactive: true },
      guideSource: { type: "select", default: "symbol", label: "Logo source", section: "Appearance", subsection: "Guide button", options: { symbol: "Symbol", image: "Image URL" }, when: ["customGuide", "yes"], retainInactive: true },
      guideSymbol: { type: "select", default: "original", label: "Symbol", section: "Appearance", subsection: "Guide button", options: { original: "Original hardware", xbox: "Xbox", playstation: "PlayStation", steam: "Steam", circle: "Circle", diamond: "Diamond", star: "Star" }, when: ["guideSource", "symbol"], retainInactive: true },
      guideImage: { type: "text", default: "", label: "Image URL", section: "Appearance", subsection: "Guide button", description: "HTTPS images, including animated GIFs. Failed images retain the original symbol.", maxlength: 2048, validate: (value) => byStream.safeImage(value) ? value : null, when: ["guideSource", "image"], retainInactive: true },
      guideColorMode: { type: "select", default: "original", label: "Logo color", section: "Appearance", subsection: "Guide button", options: { original: "Original colors", custom: "Custom / monochrome" }, when: ["customGuide", "yes"], retainInactive: true },
      guideColor: { type: "color", default: "#ffffff", label: "Custom logo color", section: "Appearance", subsection: "Guide button", maxlength: 9, when: ["guideColorMode", "custom"], retainInactive: true },
      guideScale: { type: "number", default: 100, label: "Logo scale (%)", section: "Appearance", subsection: "Guide button", min: 50, max: 150, step: 5, when: ["customGuide", "yes"], retainInactive: true },
      guideOffsetX: { type: "number", default: 0, label: "Logo position X (%)", section: "Appearance", subsection: "Guide button", min: -25, max: 25, step: 1, when: ["customGuide", "yes"], retainInactive: true },
      guideOffsetY: { type: "number", default: 0, label: "Logo position Y (%)", section: "Appearance", subsection: "Guide button", min: -25, max: 25, step: 1, when: ["customGuide", "yes"], retainInactive: true },
      screenOpacity: { type: "number", default: 0, label: "Screen opacity (%)", section: "Appearance", subsection: "Screen opening", description: "Set to 0 for a clear opening over your OBS capture. The bezel stays visible.", min: 0, max: 100, when: ["skin", ...Object.values(byControllerArtwork.skins).filter((skin) => skin.screen).map((skin) => skin.id)] },
      deadzone: {
        type: "number",
        default: 5,
        label: "Deadzone (%)",
        section: "Input",
        subsection: "Stick response",
        description: "Ignores stick movement below this threshold.",
        min: 0,
        max: 100,
        id: "deadzone-input",
        icon: "fa-bullseye",
        placeholder: "0 to 100"
      },
      offset: {
        type: "number",
        default: 25,
        label: "Stick Offset: (px)",
        section: "Input",
        subsection: "Stick response",
        description: "Maximum stick travel in source pixels, scaled for the model and compact layout.",
        min: -1000,
        max: Infinity,
        id: "offset-input",
        icon: "fa-up-down-left-right",
        placeholder: "0"
      },
      curve: {
        type: "switch",
        default: "0",
        label: "Enable Stick Curving:",
        section: "Input",
        subsection: "Stick response",
        description: "Set to 1 to enable curved stick movement.",
        options: { 0: "0", 1: "1" },
        id: "curve-input",
        icon: "fa-wave-square",
        checkedValue: "1",
        uncheckedValue: "0"
      },
      strength: {
        type: "switch",
        default: "1",
        label: "Trigger pressure fill",
        section: "Input",
        subsection: "Stick response",
        description: "Proportional fill when enabled. Disabled uses a digital press; existing strength=0 links retain that setting.",
        options: { 0: "0", 1: "1" },
        id: "strength-input",
        icon: "fa-gauge-high",
        checkedValue: "1",
        uncheckedValue: "0"
      },
      rotation: {
        type: "number",
        default: 120,
        label: "Rotation Stop: (deg)",
        section: "Input",
        subsection: "Stick response",
        description: "Maximum steering-wheel rotation in degrees.",
        min: 0,
        max: Infinity,
        id: "rotation-input",
        icon: "fa-rotate",
        placeholder: "0"
      },
      mapping: {
        type: "mapping",
        default: [],
        label: "Custom Mapping",
        section: "Input",
        subsection: "Custom mapping",
        description: "Choose an output, record its input, then apply. Empty bindings keep standard input.",
        validate: bindingSettings,
        id: "mapping-input",
        help: "remap"
      },
      opacity: {
        type: "number",
        default: 100,
        label: "Opacity (%)",
        section: "Appearance",
        description: "Opacity from 0% (transparent) to 100% (opaque).",
        min: 0,
        max: 100,
        id: "opacity-input",
        icon: "fa-circle-half-stroke",
        placeholder: "0 to 100"
      },
      mirror: { type: "switch", default: "no", label: "Mirror artwork", section: "Appearance", checkedValue: "yes", uncheckedValue: "no", options: { yes: "Yes", no: "No" } },
      backgroundColor: { type: "color", default: "#00000000", optional: true, label: "Background", section: "Appearance", maxlength: 80, styleSelector: "body", styleProperty: "background-color" },
      disconnectedTint: {
        type: "color",
        default: "#66000099",
        label: "Disconnected tint",
        section: "Appearance",
        description: "Tint while disconnected. Adjust color transparency to control its strength; transparent disables it.",
        maxlength: 9,
        styleSelector: "#controller-disconnected-tint feFlood",
        styleProperty: "flood-color"
      },
      disconnectedOpacity: {
        type: "number",
        default: 5,
        label: "Disconnected opacity (%)",
        section: "Appearance",
        min: 0,
        max: 100,
        step: "any",
        styleSelector: ".controller",
        styleProperty: "--disconnected-opacity",
        styleValue: (settings) => settings.disconnectedOpacity / 100
      },
      horizontalPosition: {
        type: "number",
        default: 0,
        optional: true,
        label: "Horizontal position (px)",
        description: "Pixel offset from the viewport center.",
        section: "Size & placement",
        min: -2000,
        max: 2000,
        step: "any",
        styleSelector: ".controller",
        styleProperty: "left",
        styleValue: (settings) => `calc(50% + ${settings.horizontalPosition}px)`
      },
      verticalPosition: {
        type: "number",
        default: 0,
        label: "Vertical position (px)",
        section: "Size & placement",
        description: "Pixel offset from the viewport center.",
        min: -2000,
        max: 2000,
        step: "any",
        styleSelector: ".controller",
        styleProperty: "top",
        styleValue: (settings) => `calc(50% + ${settings.verticalPosition}px)`
      },
      fitMargin: { type: "number", default: 16, label: "Fit margin (px)", section: "Size & placement", min: 0, max: 1000, step: "any" },
      ...byStream.placementFields(".controller"),
      ...byStream.filterFields("artworkFilter", "Artwork", ".controller")
    }
  };

  /**
   * Copyright 2012 Google Inc. All Rights Reserved.
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *     http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *
   * @author mwichary@google.com (Marcin Wichary)
   * Improved by [Mateus] byUwUr
   */

  /**
   * Polling publishes controller-input each frame and controller-connections when pads change.
   * Both event details contain raw pads at their browser indices; keyboard input uses slot 9.
   */
  const gamepadSupport = {
    gamepads: [],
    gamepadsRaw: [],
    kb: false,
    ticking: false,
    frame: 0,
    init() {
      window.addEventListener("keydown", this.onKeyboardConnect);
      window.addEventListener("pagehide", this.stopPolling);
      window.addEventListener("pageshow", this.startPolling);
      window.addEventListener("blur", () => {
        tester.keys.clear();
        tester.keyCodes.clear();
        bySettingsKB.keys = [];
        bySettingsKB.buttons.fill(0);
        bySettingsKB.axes.fill(0);
      });
      if (settings.player === "9") this.connectKeyboard();
      this.startPolling();
    },
    onKeyboardConnect(event) {
      if (gamepadSupport.kb || event.keyCode !== 70) return;
      gamepadSupport.connectKeyboard();
      tester.updateInputKB(event);
    },
    connectKeyboard() {
      if (this.kb) return;
      this.kb = true;
      document.addEventListener("keydown", tester.updateInputKB);
      document.addEventListener("keyup", tester.updateInputKB);
      this.pollGamepads();
    },
    startPolling() {
      if (gamepadSupport.ticking) return;
      gamepadSupport.ticking = true;
      gamepadSupport.tick();
    },
    stopPolling() {
      gamepadSupport.ticking = false;
      cancelAnimationFrame(gamepadSupport.frame);
    },
    tick() {
      if (!gamepadSupport.ticking) return;
      gamepadSupport.pollGamepads();
      document.dispatchEvent(new CustomEvent("controller-input", { detail: gamepadSupport.gamepadsRaw }));
      for (const index of Object.keys(gamepadSupport.gamepads)) gamepadSupport.updateDisplay(Number(index));
      gamepadSupport.frame = requestAnimationFrame(gamepadSupport.tick);
    },
    pollGamepads() {
      const previous = this.gamepads;
      const pads = navigator.getGamepads?.() ?? [];
      this.gamepads = [];
      this.gamepadsRaw = [];
      for (const pad of pads) {
        if (!pad || pad.index === 9) continue;
        this.gamepadsRaw[pad.index] = pad;
        this.gamepads[pad.index] = settings.mapping.length ? remapGamepad(pad) : pad;
      }
      if (this.kb) {
        this.gamepadsRaw[9] = bySettingsKB;
        this.gamepads[9] = settings.mapping.length ? remapGamepad(bySettingsKB) : bySettingsKB;
      }
      const changed = Object.keys(previous).join() !== Object.keys(this.gamepads).join() || Object.keys(this.gamepads).some((index) => previous[index]?.id !== this.gamepads[index].id);
      if (changed) {
        tester.updateGamepads(this.gamepads);
        document.dispatchEvent(new CustomEvent("controller-connections", { detail: this.gamepadsRaw }));
      }
    },
    updateDisplay(index) {
      const pad = this.gamepads[index];
      const player = index === 9 ? 9 : index + 1;
      if (tester.player !== player) return;
      const buttons = byControllerArtwork.names;
      buttons.forEach((name, id) => {
        // Two-axis NES adapters can expose the D-pad as axes instead of standard buttons.
        const axis = settings.skin === "nes" && id >= 12 && id <= 15 && pad.buttons[id] === undefined ? [-(pad.axes[1] ?? 0), pad.axes[1] ?? 0, -(pad.axes[0] ?? 0), pad.axes[0] ?? 0][id - 12] : pad.buttons[id];
        tester.updateButton(axis, player, name, id === 6 || id === 7 ? tester.DIGITAL_THRESHOLD : tester.ANALOGUE_BUTTON_THRESHOLD);
      });
      if (settings.skin === "n64") {
        // Standard pads use the right stick for C buttons; custom bindings can override slots 18-21.
        const cButtons = [-(pad.axes[3] ?? 0), pad.axes[3] ?? 0, -(pad.axes[2] ?? 0), pad.axes[2] ?? 0];
        cButtons.forEach((value, id) => tester.updateButton(pad.buttons[18 + id] ?? value, player, byControllerArtwork.names[18 + id], tester.ANALOGUE_STICK_THRESHOLD));
      }
      tester.updateTrigger(pad.buttons[6], player, "button-left-shoulder-bottom");
      tester.updateTrigger(pad.buttons[7], player, "button-right-shoulder-bottom");
      tester.updateAxis(pad.axes[0] ?? 0, pad.axes[1] ?? 0, player, "stick-1", pad.buttons);
      tester.updateAxis(pad.axes[2] ?? 0, pad.axes[3] ?? 0, player, "stick-2", pad.buttons);
    }
  };

  // ==========

  /**
   * File: controller/controller.tester.js
   * @file Controller artwork updates, keyboard state, and raw input capture.
   * Deps: embedded keyboard settings and controller DOM.
   */

  /**
   * Copyright 2012 Google Inc. All Rights Reserved.
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *     http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *
   * @author mwichary@google.com (Marcin Wichary)
   * Improved by [Mateus] byUwUr
   */

  const tester = {
    STICK_OFFSET: resource.fields.offset.default,
    STICK_CURVING: resource.fields.curve.default == "1",
    TRIGGER_DISPLAY_TYPE: Number(resource.fields.strength.default),
    ANALOGUE_BUTTON_THRESHOLD: 0.25,
    ANALOGUE_STICK_THRESHOLD: resource.fields.deadzone.default / 100,
    DIGITAL_THRESHOLD: 0.1,
    ROTATE_BOUNDARY: resource.fields.rotation.default,
    controls: new Map(),
    player: null,
    keys: new Set(),
    keyCodes: new Set(),
    updateGamepads(pads = []) {
      document.querySelectorAll(".controller").forEach((controller) => {
        const player = Number(controller.id.replace("gamepad-", ""));
        controller.classList.toggle("disconnected", !pads[player === 9 ? 9 : player - 1]);
      });
    },
    updateInputKB(event) {
      if (event.type === "keydown" && event.target?.closest?.("input, textarea, select, [contenteditable=true]") && !gamepadSupport.captureKeyboard) return;
      if ((gamepadSupport.captureKeyboard || byStreamOverlay) && (bySettingsKB.btns.includes(event.keyCode) || bySettingsKB.axesBtns.includes(event.keyCode))) event.preventDefault();
      if (event.type === "keydown") {
        tester.keys.add(event.keyCode);
        if (event.code) tester.keyCodes.add(event.code);
      } else {
        tester.keys.delete(event.keyCode);
        tester.keyCodes.delete(event.code);
      }
      bySettingsKB.keys = [...tester.keyCodes];
      bySettingsKB.buttons = bySettingsKB.btns.map((key) => Number(tester.keys.has(key)));
      bySettingsKB.axes = [0, 1, 2, 3].map((axis) => Number(tester.keys.has(bySettingsKB.axesBtns[axis * 2 + 1])) - Number(tester.keys.has(bySettingsKB.axesBtns[axis * 2])));
    },
    updateButton(value, player, name, threshold = this.ANALOGUE_BUTTON_THRESHOLD) {
      const control = this.controls.get(name);
      if (!control || control.node.classList.contains("analog-trigger") || control.node.dataset.stickClick === "no") return;
      const pressed = buttonValue(value) > threshold;
      if (control.pressed === pressed) return;
      control.pressed = pressed;
      control.node.classList.toggle("pressed", pressed);
    },
    updateTrigger(value, player, name) {
      const control = this.controls.get(`${name}-digital`);
      if (!control?.fill) return;
      const value01 = Math.max(0, Math.min(1, buttonValue(value)));
      const pressure = this.TRIGGER_DISPLAY_TYPE ? value01 : Number(value01 > this.DIGITAL_THRESHOLD);
      if (control.pressure === pressure) return;
      control.pressure = pressure;
      const horizontal = control.node.dataset.layout === "minimal";
      const box = control.fillBounds;
      control.fill.setAttribute("x", String(box.x));
      control.fill.setAttribute("y", String(horizontal ? box.y : box.y + box.height * (1 - pressure)));
      control.fill.setAttribute("width", String(horizontal ? box.width * pressure : box.width));
      control.fill.setAttribute("height", String(horizontal ? box.height : box.height * pressure));
    },
    updateAxis(horizontal, vertical, player, name, buttons) {
      const control = this.controls.get(name);
      if (!control) return;
      const stick = control.node;
      // Arcade D-pad input and axes share one position; simultaneous input never doubles travel.
      if (stick.dataset.dpad) {
        const [up, down, left, right] = stick.dataset.dpad.split(" ").map((id) => buttons[Number(id)]?.pressed || buttonValue(buttons[Number(id)]) > this.ANALOGUE_STICK_THRESHOLD);
        if (up || down || left || right) {
          horizontal = Number(right) - Number(left);
          vertical = Number(down) - Number(up);
        }
      }
      const active = Math.hypot(horizontal, vertical) >= this.ANALOGUE_STICK_THRESHOLD;
      const travel = this.STICK_OFFSET * Number(stick.dataset.travelScale || 1) * (stick.dataset.layout === "minimal" ? Number(stick.dataset.compactScale || 1) : 1);
      const magnitude = Math.max(1, Math.hypot(horizontal, vertical));
      const x = active ? horizontal / magnitude * travel : 0;
      const y = active ? vertical / magnitude * travel : 0;
      const wheel = this.controls.get(`${name}-wheel`)?.node;
      const rotation = horizontal * this.ROTATE_BOUNDARY;
      if (wheel && control.rotation !== rotation) {
        control.rotation = rotation;
        wheel.style.transform = `rotate(${rotation}deg)`;
      }
      if (control.x === x && control.y === y) return;
      control.x = x;
      control.y = y;
      stick.style.translate = `${x}px ${y}px`;
      if (control.shaft) {
        const scale = stick.dataset.layout === "minimal" ? Number(stick.dataset.compactScale) : 1;
        control.shaft.setAttribute("x2", String(control.shaft.x1.baseVal.value + x / scale));
        control.shaft.setAttribute("y2", String(control.shaft.y1.baseVal.value + y / scale));
      }
      if (this.STICK_CURVING) stick.style.transform = `rotateX(${active ? -vertical * this.STICK_OFFSET : 0}deg) rotateY(${active ? horizontal * this.STICK_OFFSET : 0}deg)`;
    }
  };

  // ==========

  /**
   * File: controller/controller.js
   * @file Controller parameter validation and gamepad remapping.
   * Deps: Gamepad integration.
   * @author mateus@byuwur.co (Andres Trujillo Mateus)
   */

  /**
   * Parse binding arrays or prior wrapped URLs; invalid JSON leaves settings unchanged.
   * @param {unknown} value Value supplied by the caller.
   * @returns {Array<unknown>|null}
   */
  function bindingSettings(value) {
    const finiteNumber = (value) => ["number", "string"].includes(typeof value) && String(value).trim() !== "" && Number.isFinite(Number(value));
    const validIndex = (value, limit) => finiteNumber(value) && Number.isInteger(Number(value)) && Number(value) >= 0 && Number(value) < limit;
    const validSource = (binding) =>
      binding &&
      (binding.choiceType === "keys"
        ? typeof binding.choice === "string" && /^[A-Za-z][A-Za-z0-9]{0,40}$/.test(binding.choice)
        : ["buttons", "axes"].includes(binding.choiceType) && validIndex(binding.choice, 256) && (binding.choiceOperand === undefined || ["+", "-"].includes(binding.choiceOperand)));
    try {
      const result = JSON.parse(value);
      const bindings = Array.isArray(result) ? result : result?.mapping;
      if (!Array.isArray(bindings) || bindings.length > 64) return null;
      for (const binding of bindings) {
        if (!binding || !["buttons", "axes", "dpad"].includes(binding.targetType) || (binding.disabled !== undefined && typeof binding.disabled !== "boolean")) return null;
        if (binding.targetType !== "dpad" && !validIndex(binding.target, binding.targetType === "buttons" ? byControllerArtwork.names.length : 4)) return null;
        if (binding.disabled) continue;
        if (!validSource(binding) && !validSource(binding.positive) && !validSource(binding.negative)) return null;
        if (binding.axesConfig) {
          const { type, lowValue, highValue } = binding.axesConfig;
          if (!["stick", "trigger"].includes(type) || !finiteNumber(lowValue) || !finiteNumber(highValue) || Number(lowValue) === Number(highValue)) return null;
        }
        if (
          binding.targetType === "dpad" &&
          (!validSource(binding) ||
            binding.choiceType !== "axes" ||
            !["up", "down", "left", "right", "upright", "upleft", "downright", "downleft"].every(
              (direction) => binding.positions?.[direction] !== undefined && binding.positions[direction] !== "" && Number.isFinite(Number(binding.positions[direction]))
            ))
        )
          return null;
      }
      return bindings;
    } catch {
      return null;
    }
  }
  /**
   * Normalize modern GamepadButton objects and numeric legacy/keyboard buttons.
   * @param {GamepadButton|number|undefined} button Raw button state.
   * @returns {number} Analog strength, defaulting to zero.
   */
  function buttonValue(button) {
    return Number(button?.value ?? button?.pressed ?? button ?? 0);
  }
  /**
   * Gamepad properties are browser accessors, so copy their values explicitly.
   * @param {Gamepad} pad Gamepad snapshot whose input values are read.
   * @returns {Object} Plain snapshot of the gamepad ID, index, buttons, and axes.
   */
  function copyGamepad(pad) {
    return {
      id: pad.id,
      index: pad.index,
      buttons: Array.from(pad.buttons, (button) => ({ value: buttonValue(button), pressed: buttonValue(button) > 0.25 })),
      axes: Array.from(pad.axes)
    };
  }
  /**
   * Read one original input, optionally selecting only its positive or negative axis half.
   * @param {Object} binding Captured button or axis source.
   * @param {Gamepad} pad Unmodified controller state.
   * @param {boolean} [fullAxis=false] Calibration and packed hats read raw coordinates before half-axis selection.
   * @returns {number} Input strength; missing sources return zero.
   */
  function sourceValue(binding, pad, fullAxis = false) {
    if (!binding) return 0;
    if (binding.choiceType === "keys") return pad.keys?.includes(binding.choice) ? 1 : 0;
    if (binding.choiceType === "buttons") return buttonValue(pad.buttons[binding.choice]);
    const value = pad.axes[binding.choice] ?? 0;
    if (!fullAxis && binding.choiceOperand === "+") return Math.max(0, value);
    if (!fullAxis && binding.choiceOperand === "-") return Math.max(0, -value);
    return value;
  }
  /**
   * Reads every binding from the original pad; mappings never alter another binding's source.
   * @param {Gamepad} pad Gamepad snapshot whose input values are read.
   * @returns {Object}
   */
  function remapGamepad(pad) {
    const result = copyGamepad(pad);
    for (const binding of settings.mapping) {
      if (!binding || !["buttons", "axes", "dpad"].includes(binding.targetType)) continue;
      if (binding.targetType === "dpad") {
        const value = sourceValue(binding, pad, true);
        const positions = { up: [12], down: [13], left: [14], right: [15], upright: [12, 15], downright: [13, 15], downleft: [13, 14], upleft: [12, 14] };
        for (const id of [12, 13, 14, 15]) result.buttons[id] = { value: 0, pressed: false };
        if (!binding.disabled) {
          for (const [direction, ids] of Object.entries(positions)) {
            if (binding.positions?.[direction] === undefined || Math.abs(value - Number(binding.positions[direction])) > 0.001) continue;
            for (const id of ids) result.buttons[id] = { value: 1, pressed: true };
          }
        }
        continue;
      }
      const target = Number(binding.target);
      if (!Number.isInteger(target) || target < 0 || target >= (binding.targetType === "buttons" ? byControllerArtwork.names.length : 4)) continue;
      let value = 0;
      if (!binding.disabled) {
        value = binding.targetType === "axes" && !binding.axesConfig ? sourceValue(binding.positive, pad) - sourceValue(binding.negative, pad) : sourceValue(binding.choiceType ? binding : binding.positive, pad, !!binding.axesConfig);
        if (binding.axesConfig) {
          const { type, lowValue, highValue } = binding.axesConfig;
          const range = Number(highValue) - Number(lowValue);
          value = range ? (value - Number(lowValue)) / range : 0;
          if (type === "stick") value = value * 2 - 1;
        }
      }
      if (!Number.isFinite(value)) value = 0;
      value = Math.max(binding.targetType === "buttons" ? 0 : -1, Math.min(1, value));
      if (binding.targetType === "axes") result.axes[target] = value;
      else result.buttons[target] = { value, pressed: value > 0.25 };
    }
    return result;
  }

  /**
   * Mount the selected controller artwork and configure its input display.
   * @returns {void}
   */
  let controllerEvents;
  function initController() {
    controllerEvents?.abort();
    controllerEvents = new AbortController();
    const active = document.querySelector(".controller");
    active.id = `gamepad-${settings.player}`;
    const artwork = byControllerArtwork.render(settings.skin, settings.layout, settings.buttonLabels, settings.customColors === "yes" ? "original" : settings.variant);
    active.innerHTML = `<div class="controller-layers">${artwork.markup}</div>`;
    active.classList.add("active");
    active.style.width = `${artwork.width}px`;
    active.style.height = `${artwork.height}px`;
    active.style.opacity = settings.opacity / 100;
    active.style.setProperty("--screen-opacity", settings.screenOpacity / 100);
    customizeControllerAppearance(active, settings);
    for (const indicator of active.querySelectorAll("[data-player]")) {
      indicator.classList.toggle("lit", Number(indicator.dataset.player) === Number(settings.player));
    }
    for (const numeral of active.querySelectorAll("[data-player-number]")) {
      numeral.classList.toggle("lit", Number(numeral.dataset.playerNumber) === Number(settings.player));
    }
    tester.player = Number(settings.player);
    tester.controls.clear();
    for (const node of active.querySelectorAll("[data-name]")) {
      const fillArtwork = node.querySelector(".trigger-active");
      const clip = fillArtwork?.getAttribute("clip-path").slice(5, -1);
      const shaft = active.querySelector(`.fixed-layer[data-for="${node.dataset.input}"] .stick-shaft`);
      tester.controls.set(node.dataset.name, { node, shaft, fillArtwork, fillBounds: triggerBounds(node, fillArtwork), fill: clip ? node.querySelector(`[id="${clip}"] .trigger-fill-rect`) : null });
    }
    active.addEventListener("controller-layout", () => {
      for (const control of tester.controls.values()) {
        control.pressure = undefined;
        control.x = control.y = undefined;
        if (control.fillArtwork) control.fillBounds = triggerBounds(control.node, control.fillArtwork);
      }
      fitController();
    }, { signal: controllerEvents.signal });
    for (const [name, property] of [
      ["offset", "STICK_OFFSET"],
      ["deadzone", "ANALOGUE_STICK_THRESHOLD"],
      ["rotation", "ROTATE_BOUNDARY"]
    ]) {
      tester[property] = name === "deadzone" ? settings[name] / 100 : settings[name];
    }
    tester.TRIGGER_DISPLAY_TYPE = Number(settings.strength);
    tester.STICK_CURVING = settings.curve === "1";

    function fitController() {
      // Layout changes move the cap's rotation center as well as its artwork.
      for (const stick of active.querySelectorAll(".control-layer.stick")) {
        const box = stick.getBBox();
        const viewport = stick.viewBox.baseVal;
        stick.style.transformOrigin = `${box.x + box.width / 2 - viewport.x}px ${box.y + box.height / 2 - viewport.y}px`;
      }
      const margin = settings.fitMargin;
      const scale = Math.max(0, Math.min((innerHeight - margin * 2) / active.offsetHeight, (innerWidth - margin * 2) / active.offsetWidth));
      active.style.transform = `translate(-50%, -50%) scale(${settings.mirror === "yes" ? -scale : scale}, ${scale})`;
    }
    fitController();
    window.addEventListener("resize", fitController, { signal: controllerEvents.signal });
    tester.updateGamepads(gamepadSupport.gamepads);
  }

  // Pressure bounds are authored alongside the complete external trigger silhouette.
  function triggerBounds(node, artwork) {
    if (node.dataset.layout === "full" && node.dataset.pressureFullBounds) {
      const [x, y, width, height] = node.dataset.pressureFullBounds.split(" ").map(Number);
      const outline = parseFloat(getComputedStyle(node.querySelector(".full-geometry .vector-outline")).strokeWidth);
      const inset = Math.min(outline / 2, width / 2, height / 2);
      return { x: x + inset, y: y + inset, width: width - inset * 2, height: height - inset * 2 };
    }
    return artwork?.getBBox();
  }


  const settings = await byStream.initResource(resource, { gamepadSupport, buttonValue, copyGamepad });
  gamepadSupport.init();
  if (byStreamOverlay) initController();
}

/**
 * File: controller/artwork.js (inline section)
 * @file Mount editable SVG documents. Geometry and per-model bindings belong to controllers/<id>.svg.
 */
/**
 * Tint plastic surfaces without changing their geometry, lighting, or independent input filters.
 * @param {HTMLElement} controller Mounted controller.
 * @param {string} color Validated shell color in hexadecimal.
 * @returns {void}
 */
function tintControllerControls(controller, color) {
  let hex = color.replace("#", "");
  if (hex.length <= 4) hex = [...hex].map((digit) => digit + digit).join("");
  const shell = [0, 2, 4].map((offset) => parseInt(hex.slice(offset, offset + 2), 16));
  const surfaces = [...controller.querySelectorAll(".controller-background .control-tint-face"), ...controller.querySelectorAll('.control-layer:not(.stick):not([data-name*="-shoulder-"])')];
  for (const control of surfaces) {
    let surface;
    const faces = control.matches(".control-tint-face") ? [control] : control.querySelectorAll(".button-face, .gcn-face");
    for (const face of faces) {
      if (face.closest(".guide-logo-original")) continue;
      const original = getComputedStyle(face).fill.match(/[\d.]+/g)?.slice(0, 3).map(Number);
      if (!original || original.length !== 3) continue;
      const tinted = original.map((channel, index) => Math.round((channel + shell[index]) / 2));
      face.style.fill = `rgb(${tinted.join(", ")})`;
      surface ||= tinted;
    }
    if (!surface) continue;
    const darken = Math.max(...surface) > 150;
    const ink = `#${surface.map((channel) => Math.round(darken ? channel * 0.62 : channel + (255 - channel) * 0.40).toString(16).padStart(2, "0")).join("")}`;
    for (const marking of control.querySelectorAll(".marking")) {
      for (const node of [marking, ...marking.querySelectorAll("[fill], [stroke]")]) {
        const style = getComputedStyle(node);
        if (style.fill !== "none") node.style.fill = ink;
        if (style.stroke !== "none") node.style.stroke = ink;
        if (node.hasAttribute("fill-opacity")) node.style.fillOpacity = "1";
      }
    }
  }
}

// Each mount starts from the unchanged SVG. Only enabled customization adds overrides.
function customizeControllerAppearance(controller, settings) {
  controller.classList.toggle("custom-colors", settings.customColors === "yes");
  for (const name of ["--controller-color", "--controller-panel", "--controller-socket", "--controller-ink", "--highlight-intensity", "--shadow-intensity"]) controller.style.removeProperty(name);
  if (settings.customColors !== "yes") return;
  let hex = settings.controllerColor.replace("#", "");
  if (hex.length <= 4) hex = [...hex].map((digit) => digit + digit).join("");
  const channels = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const light = channels.reduce((sum, channel) => sum + channel, 0) > 384;
  const panel = channels.map((channel) => Math.round(light ? channel * 0.86 : channel + (255 - channel) * 0.10));
  controller.style.setProperty("--controller-color", settings.controllerColor);
  controller.style.setProperty("--controller-panel", `#${panel.map((channel) => channel.toString(16).padStart(2, "0")).join("")}`);
  controller.style.setProperty("--controller-socket", `#${channels.map((channel) => Math.round(channel * 0.40).toString(16).padStart(2, "0")).join("")}`);
  controller.style.setProperty("--controller-ink", controllerInk(channels));
  controller.style.setProperty("--highlight-intensity", settings.highlightIntensity / 100);
  controller.style.setProperty("--shadow-intensity", settings.shadowIntensity / 100);
  const outline = settings.tintOutlines === "yes" ? `#${channels.map((channel) => Math.round(channel * 0.28).toString(16).padStart(2, "0")).join("")}` : settings.customOutlineColor === "yes" ? settings.outlineColor : null;
  for (const node of controller.querySelectorAll(".vector-outline:not(.control-detail):not(.button-detail)")) {
    if (node.closest("defs, .marking, .hardware-icon, .guide-logo-original")) continue;
    const style = getComputedStyle(node);
    if (style.stroke === "none") continue;
    node.style.strokeWidth = `${parseFloat(style.strokeWidth) * settings.outlineWidth}px`;
    if (outline) node.style.stroke = outline;
  }
  if (settings.tintControls === "yes") tintControllerControls(controller, settings.controllerColor);
  if (settings.customGuide !== "yes") return;
  const slot = controller.querySelector(".guide-logo-slot");
  if (!slot) return;
  if (settings.guideSource === "symbol" && settings.guideSymbol === "original" && settings.guideColorMode === "original" && settings.guideScale === 100 && !settings.guideOffsetX && !settings.guideOffsetY) return;
  const original = slot.querySelector(".guide-logo-original");
  const housing = slot.parentElement.querySelector(".guide-custom-housing");
  const [x, y, width, height] = slot.dataset.logoBounds.split(" ").map(Number);
  const cx = x + width / 2 + width * settings.guideOffsetX / 100;
  const cy = y + height / 2 + height * settings.guideOffsetY / 100;
  const ns = "http://www.w3.org/2000/svg";
  const content = document.createElementNS(ns, "g");
  content.classList.add("guide-logo-custom");
  content.setAttribute("clip-path", `url(${slot.dataset.guideClip})`);
  const reveal = () => {
    original.style.display = "none";
    if (housing) housing.style.display = "inline";
    content.style.visibility = "visible";
  };
  if (settings.guideSource === "image") {
    if (!settings.guideImage || !byStream.safeImage(settings.guideImage)) return;
    const image = document.createElementNS(ns, "image");
    const scale = settings.guideScale / 100;
    image.setAttribute("x", String(cx - width * scale / 2));
    image.setAttribute("y", String(cy - height * scale / 2));
    image.setAttribute("width", String(width * scale));
    image.setAttribute("height", String(height * scale));
    image.setAttribute("preserveAspectRatio", "xMidYMid meet");
    content.style.visibility = "hidden";
    image.addEventListener("load", reveal, { once: true });
    image.addEventListener("error", () => content.remove(), { once: true });
    content.append(image);
    slot.append(content);
    if (settings.guideColorMode === "custom") {
      const filter = document.createElementNS(ns, "filter");
      filter.id = `${slot.id}-image-tint`;
      const flood = document.createElementNS(ns, "feFlood");
      flood.setAttribute("flood-color", settings.guideColor);
      const alpha = document.createElementNS(ns, "feComposite");
      alpha.setAttribute("in2", "SourceAlpha");
      alpha.setAttribute("operator", "in");
      filter.append(flood, alpha);
      slot.closest("svg").querySelector("defs").append(filter);
      image.setAttribute("filter", `url(#${filter.id})`);
    }
    // The image stays mounted through input frames and layout changes, preserving GIF playback.
    image.setAttribute("href", new URL(settings.guideImage, location.href).href);
    return;
  }
  const symbol = settings.guideSymbol === "original" ? byControllerArtwork.guideSymbols[slot.dataset.defaultSymbol] : byControllerArtwork.guideSymbols[settings.guideSymbol];
  if (!symbol) return;
  const artwork = new DOMParser().parseFromString(symbol.markup, "image/svg+xml").documentElement;
  for (const node of [artwork, ...artwork.querySelectorAll("*")]) {
    node.removeAttribute("id");
    if (settings.guideColorMode !== "custom") continue;
    if (node.hasAttribute("fill") && node.getAttribute("fill") !== "none") node.setAttribute("fill", settings.guideColor);
    if (node.hasAttribute("stroke") && node.getAttribute("stroke") !== "none") node.setAttribute("stroke", settings.guideColor);
  }
  const [sx, sy, sw, sh] = symbol.bounds;
  const scale = Math.min(width / sw, height / sh) * settings.guideScale / 100;
  artwork.setAttribute("transform", `translate(${cx} ${cy}) scale(${scale}) translate(${-sx - sw / 2} ${-sy - sh / 2})`);
  content.append(artwork);
  slot.append(content);
  reveal();
}

async function loadControllerArtwork() {
  // Discovery/order only. Names, bindings, geometry, and layouts belong to the SVGs.
  const families = ["nes", "famicom", "snes", "superfamicom", "n64", "gcn", "wii", "wiinunchuk", "wiiclassic", "wiiupro", "wiiu", "joycon", "switchpro", "ps", "ds2", "ds3", "ds4", "ds5", "xbox", "x360", "xone", "xseries", "mastersystem", "genesis", "saturn", "dreamcast", "steam", "steam2", "steamdeck", "turbografx", "playdate", "fgc"];
  const names = [
    "button-1", "button-2", "button-3", "button-4",
    "button-left-shoulder-top", "button-right-shoulder-top",
    "button-left-shoulder-bottom-digital", "button-right-shoulder-bottom-digital",
    "button-select", "button-start", "stick-1", "stick-2",
    "button-dpad-top", "button-dpad-bottom", "button-dpad-left", "button-dpad-right",
    "button-meta", "touch-pad", "button-c-up", "button-c-down", "button-c-left", "button-c-right", "button-mute",
    "trackpad-left", "trackpad-right", "button-grip-left", "button-grip-right",
    "button-grip-left-bottom", "button-grip-right-bottom", "button-aux-1", "button-aux-2",
    "button-left-trigger-click", "button-right-trigger-click", "crank",
    "button-sl-left", "button-sr-left", "button-sl-right", "button-sr-right", "button-volume-down", "button-volume-up"
  ];
  const sources = {}, skins = {}, guideSymbols = {};
  await Promise.all(families.map(async (id) => {
    const response = await fetch(new URL(`./controllers/${id}.svg`, controllerResourceURL), { cache: "no-cache" });
    if (!response.ok) throw new Error(`Unable to load ${id}.svg: ${response.status}`);
    sources[id] = await response.text();
  }));
  for (const id of families) {
    const svg = new DOMParser().parseFromString(sources[id], "image/svg+xml").documentElement;
    if (svg.localName !== "svg" || svg.dataset.controller !== id) throw new Error(`Invalid controller SVG: ${id}`);
    register(svg);
    for (const view of svg.querySelectorAll("view[data-name]")) {
      const variant = svg.cloneNode(true);
      variant.id = variant.dataset.controller = view.id;
      variant.dataset.name = view.dataset.name;
      variant.setAttribute("aria-label", `${view.dataset.name} input display`);
      variant.querySelector("title").textContent = view.dataset.name;
      variant.dataset.fullViewbox = view.getAttribute("viewBox");
      variant.dataset.compactViewbox = view.dataset.compactViewbox;
      variant.setAttribute("viewBox", variant.dataset.fullViewbox);
      variant.querySelectorAll(view.dataset.exclude).forEach((node) => node.remove());
      variant.querySelectorAll("view[data-name]").forEach((node) => node.remove());
      sources[view.id] = new XMLSerializer().serializeToString(variant);
      register(variant);
    }
  }

  // Alternate skins reuse source-authored SVG views and their existing controls.
  function register(svg) {
    const id = svg.dataset.controller;
    const controls = [...svg.querySelectorAll(".control[data-input]")];
    for (const symbol of svg.querySelectorAll("[data-guide-symbol]")) {
      guideSymbols[symbol.dataset.guideSymbol] = { markup: new XMLSerializer().serializeToString(symbol), bounds: symbol.dataset.symbolBounds.split(" ").map(Number) };
    }
    skins[id] = {
      id, name: svg.dataset.name, platform: svg.dataset.platform, screen: !!svg.querySelector(".screen-surface"), guide: !!svg.querySelector(".guide-logo-slot"),
      shell: !!svg.querySelector(".shell-base"), highlights: !!svg.querySelector(".shell-highlight"), shadows: !!svg.querySelector(".shell-shadow"),
      variants: Object.fromEntries([...svg.querySelectorAll("style[data-variant-id]")].map((node) => [node.dataset.variantId, node.dataset.variantName])),
      buttons: controls.filter((node) => !node.dataset.axes && !node.dataset.name.startsWith("button-dpad-")).map((node) => ({ id: Number(node.dataset.input.split(":")[1]), letter: node.dataset.label, analog: node.classList.contains("analog-trigger") })),
      sticks: controls.filter((node) => node.dataset.axes).map((node) => node.dataset.stickClick === "no" ? [] : [Number(node.dataset.input.split(":")[1])]),
      axes: controls.filter((node) => node.dataset.axes).flatMap((node) => node.dataset.axes.split(" ").map(Number)),
      dpad: controls.some((node) => node.dataset.dpad || node.dataset.name.startsWith("button-dpad-"))
    };
  }

  // Move the existing controls. Each SVG root is an independent WebKit filter layer.
  function setLayout(controller, layout) {
    const minimal = layout === "minimal";
    const background = controller.querySelector(".controller-background");
    const viewBox = background.dataset[minimal ? "compactViewbox" : "fullViewbox"];
    for (const svg of controller.querySelectorAll(":scope > svg, .controller-layers > svg")) {
      svg.dataset.layout = layout;
      svg.setAttribute("viewBox", viewBox);
      const position = svg.querySelector(".layout-position");
      if (position) position.setAttribute("transform", minimal ? svg.dataset.compactTransform : svg.dataset.fullTransform || "");
    }
    background.style.visibility = minimal ? "hidden" : "visible";
    const [, , width, height] = viewBox.trim().split(/\s+/).map(Number);
    controller.style.width = `${width}px`;
    controller.style.height = `${height}px`;
    controller.dispatchEvent(new Event("controller-layout"));
    return { width, height };
  }

  function render(id, layout, labels, variant = "original") {
    const svg = new DOMParser().parseFromString(sources[id], "image/svg+xml").documentElement;
    svg.setAttribute("data-labels", labels);
    svg.dataset.variant = Object.hasOwn(skins[id].variants, variant) ? variant : "original";
    const serializer = new XMLSerializer(), rear = [], layers = [];
    const shell = svg.querySelector("#shell");
    // WebKit ignores CSS filter functions on SVG g elements (bugs.webkit.org/246106).
    // Keep one root per interactive control; all inner artwork transforms stay untouched.
    for (const control of [...svg.querySelectorAll(".control[data-name], .fixed-control")]) {
      const layer = svg.cloneNode(false);
      layer.classList.add(control.classList.contains("fixed-control") ? "fixed-layer" : "control-layer", ...control.classList);
      layer.removeAttribute("id");
      for (const attribute of [...control.attributes]) {
        if (attribute.name.startsWith("data-")) layer.setAttribute(attribute.name, attribute.value);
      }
      if (control.classList.contains("fixed-control")) {
        layer.removeAttribute("data-name");
        layer.setAttribute("aria-hidden", "true");
      }
      layer.setAttribute("id", `${id}-${control.id}`);
      if (control.dataset.label) layer.setAttribute("aria-label", control.dataset.label);
      else layer.removeAttribute("aria-label");
      for (const definition of svg.children) {
        if (["defs", "style"].includes(definition.localName)) layer.appendChild(definition.cloneNode(true));
      }
      const face = control.cloneNode(true);
      face.removeAttribute("class");
      face.removeAttribute("id");
      face.removeAttribute("data-name");
      let content = face;
      for (let parent = control.parentElement; parent && parent !== svg; parent = parent.parentElement) {
        const group = parent.cloneNode(false);
        group.removeAttribute("id");
        group.appendChild(content);
        content = group;
      }
      const position = document.createElementNS(svg.namespaceURI, "g");
      position.classList.add("layout-position");
      // Portrait sources are rotated for full mode. Compact coordinates are already horizontal.
      const orientation = control.parentElement.getAttribute("transform") || "";
      if (orientation && control.parentElement.parentElement === svg) {
        content.removeAttribute("transform");
        layer.dataset.fullTransform = orientation;
      }
      position.setAttribute("transform", orientation);
      position.appendChild(content);
      layer.appendChild(position);
      const references = new Map();
      for (const node of layer.querySelectorAll("[id]")) {
        const original = node.id;
        node.id = `${id}-${control.id}-${original}`;
        references.set(original, node.id);
      }
      for (const node of layer.querySelectorAll("*")) {
        for (const attribute of [...node.attributes]) {
          if (attribute.name === "id") continue;
          let value = attribute.value;
          for (const [original, replacement] of references) {
            value = value.replaceAll(`url(#${original})`, `url(#${replacement})`);
            if (value === `#${original}`) value = `#${replacement}`;
          }
          if (value !== attribute.value) node.setAttribute(attribute.name, value);
        }
      }
      // Preserve the SVG's painting order when isolating controls for WebKit filters.
      (shell && (control.compareDocumentPosition(shell) & Node.DOCUMENT_POSITION_FOLLOWING) ? rear : layers).push(layer);
      control.remove();
    }
    svg.classList.add("controller-background");
    svg.querySelectorAll("[data-name]").forEach((node) => node.removeAttribute("data-name"));
    const mount = document.createElement("div");
    mount.append(...rear, svg, ...layers);
    const size = setLayout(mount, layout);
    return { ...size, markup: [...mount.children].map((node) => serializer.serializeToString(node)).join("") };
  }
  return { skins, names, render, setLayout, sources, guideSymbols };
}

/**
 * File: controller/mapping.js
 * @file Controller input mapping editor; the shared configurator owns settings, URLs, and Reset.
 * Deps: controller resource and the optional shared configurator.js.
 */
function initControllerMapping() {
  if (window.byConfigurator)
    window.byConfigurator.configureResource = function ({ settings, gamepadSupport, buttonValue, copyGamepad }, { generateURL, initSelect2 }) {
      const $ = window.jQuery;
      if (!$) return;
      for (const name of ["outlineWidth", "guideScale"]) {
        const input = $(`[name="${name}"]`).attr("type", "range").removeClass("form-control bg-body-secondary border-secondary-subtle rounded-0").addClass("form-range");
        const label = input.closest("label").attr("for", input.attr("id"));
        const output = $("<output class='ms-2 text-body-secondary'></output>").attr("for", input.attr("id")).appendTo(label.find(".field-caption"));
        input.on("input.controllerSlider change.controllerSlider", () => output.text(`${input.val()}${name === "outlineWidth" ? "×" : "%"}`)).triggerHandler("change.controllerSlider");
      }
      function updateVariants() {
        const choices = byControllerArtwork.skins[$("#skin-input").val()]?.variants || {};
        const select = $('[name="variant"]');
        select.find("option").each((_, option) => { option.disabled = option.value !== "original" && !Object.hasOwn(choices, option.value); });
        if (select.find(":selected").prop("disabled")) select.val("original");
      }
      $("#skin-input").on("change.controllerVariants", updateVariants);
      updateVariants();
      const platforms = new Map();
      for (const option of [...document.querySelectorAll("#skin-input option")]) {
        const platform = byControllerArtwork.skins[option.value]?.platform;
        if (!platform) continue;
        if (!platforms.has(platform)) {
          const group = document.createElement("optgroup");
          group.label = platform;
          document.getElementById("skin-input").appendChild(group);
          platforms.set(platform, group);
        }
        platforms.get(platform).appendChild(option);
      }
      const directions = ["up", "down", "left", "right", "upright", "upleft", "downright", "downleft"];
      const buttonNames = [
        "A / Cross",
        "B / Circle",
        "X / Square",
        "Y / Triangle",
        "LB / L1",
        "RB / R1",
        "LT / L2",
        "RT / R2",
        "Select / Back",
        "Start / Options",
        "Left stick click",
        "Right stick click",
        "D-pad up",
        "D-pad down",
        "D-pad left",
        "D-pad right",
        "Guide / PS",
        "Touchpad / Share",
        "C up",
        "C down",
        "C left",
        "C right",
        "Microphone mute"
      ];
      const axisNames = ["Left stick — horizontal", "Left stick — vertical", "Right stick — horizontal", "Right stick — vertical"];
      const section = $(/* HTML */ `
        <section id="remap" hidden>
          <article>
            <p>Choose your input device, add an output, record its input, then apply.</p>
            <div class="d-flex flex-wrap gap-2 align-items-end mb-2">
              <label class="form-label mb-0" for="player-base"
                >Input device
                <select id="player-base" class="form-select" aria-describedby="mapping-status">
                  <option value="">Connect a controller</option>
                </select>
              </label>
              <button type="button" id="mapping-keyboard" class="btn btn-outline-secondary">Use keyboard</button>
            </div>
            <p id="mapping-status" class="small" role="status">Press a controller button to connect it, or choose keyboard.</p>
            <details class="mb-3">
              <summary>Live input readings</summary>
              <output id="mapping-readings" class="d-block small font-monospace text-break py-2"></output>
            </details>
            <div id="mapping-config">
              <div class="d-flex flex-wrap gap-2 mb-3">
                <button type="button" id="prepend-mapping" class="btn btn-outline-primary">Add binding</button>
                <button type="button" id="clear-mappings" class="btn btn-outline-secondary">Clear bindings</button>
                <button type="button" id="cancel-mapping-capture" class="btn btn-outline-warning d-none">Cancel recording</button>
              </div>
              <div id="mappings"></div>
              <p id="mapping-message" class="small" role="status" aria-live="polite"></p>
              <button type="button" id="apply-mapping" class="btn btn-primary">Apply mapping</button>
            </div>
          </article>
        </section>
      `).appendTo("body");
      const initialMapping = JSON.stringify(settings.mapping);
      let capture = null;
      let rowID = 0;
      let dialog;
      const selectedPad = () => {
        const player = Number($("#player-base").val());
        return gamepadSupport.gamepadsRaw[player === 9 ? 9 : player - 1];
      };
      const sourceOf = (value) =>
        value?.choiceType ? { choiceType: value.choiceType, choice: value.choiceType === "keys" ? value.choice : Number(value.choice), ...(value.choiceOperand ? { choiceOperand: value.choiceOperand } : {}) } : null;
      function describe(source) {
        if (!source) return "Record input";
        if (source.choiceType === "keys") return `Key ${source.choice.replace(/^(Key|Digit)/, "")}`;
        return `${source.choiceType === "buttons" ? "Button" : "Axis"} ${source.choice}${source.choiceOperand ? ` ${source.choiceOperand}` : ""}`;
      }
      function message(row, text, error = false) {
        row.find(".map-message").text(text).toggleClass("text-danger", error);
      }
      function cancelCapture(text = "Recording cancelled.") {
        if (!capture) return;
        clearTimeout(capture.timeout);
        const row = capture.row;
        capture = null;
        gamepadSupport.captureKeyboard = false;
        $("#cancel-mapping-capture").addClass("d-none");
        refreshRow(row);
        message(row, text);
      }
      function updateDevices() {
        cancelCapture("Input device changed. Record again when ready.");
        const input = $("#player-base"),
          previous = input.val(),
          pads = gamepadSupport.gamepadsRaw;
        input.empty();
        for (const [index, pad] of Object.entries(pads)) {
          const player = Number(index) === 9 ? 9 : Number(index) + 1;
          if (![1, 2, 3, 4, 9].includes(player)) continue;
          $("<option></option>")
            .val(player)
            .text(player === 9 ? "Keyboard" : `Player ${player} — ${pad.id}`)
            .appendTo(input);
        }
        const preferred = input
          .find("option")
          .toArray()
          .find((option) => option.value === (previous || settings.player));
        if (preferred) input.val(preferred.value);
        if (!input.children().length) $("<option></option>").val("").text("Connect a controller").appendTo(input);
        input.trigger("change.select2");
        $("#mapping-status").text(selectedPad() ? "Choose an output below, then record a button or move a stick. Escape cancels recording." : "Press a controller button to connect it, or choose keyboard.");
        $("#mappings .mapping-row").each((_, row) => refreshRow($(row)));
      }
      function outputButtons() {
        const id = String($("#skin-input").val() || settings.skin),
          skin = byControllerArtwork.skins[id];
        const labels = new Map(skin.buttons.map((button) => [button.id, button.icon || button.letter]));
        if (skin.dpad) for (const i of [12, 13, 14, 15]) labels.set(i, buttonNames[i]);
        for (const i of skin.sticks.flat()) labels.set(i, buttonNames[i]);
        return [...labels].sort(([a], [b]) => a - b);
      }
      function fillTargets(row, selected) {
        const kind = row.find(".mapping-kind").val(),
          target = row.find(".mapping-target").empty();
        const skin = byControllerArtwork.skins[String($("#skin-input").val() || settings.skin)];
        const options = kind === "axes" ? (skin.axes || []).map((id) => [id, axisNames[id]]) : outputButtons();
        if (selected !== undefined && !options.some(([id]) => id === Number(selected))) options.push([Number(selected), `${buttonNames[selected] || `Output ${selected}`} (not shown on this skin)`]);
        options.forEach(([id, name]) =>
          $("<option></option>")
            .val(id)
            .text(name[0]?.toUpperCase() + name.slice(1))
            .appendTo(target)
        );
        target.val(selected ?? options[0]?.[0]);
        row.find(".target-label").toggleClass("d-none", kind === "dpad");
        target.trigger("change.select2");
      }
      function refreshRow(row) {
        const kind = row.find(".mapping-kind").val(),
          pair = kind === "axes" && row.find(".mapping-source-mode").val() === "buttons",
          disabled = row.find(".mapping-disabled").prop("checked");
        row.find(".source-mode-label").toggleClass("d-none", kind !== "axes");
        row.find(".negative-source").toggleClass("d-none", !pair);
        row.find(".calibration").toggleClass("d-none", kind === "dpad" || pair);
        row.find(".hat-positions").toggleClass("d-none", kind !== "dpad");
        row.find(".mapping-record").each((_, button) => {
          const slot = button.dataset.slot;
          const text = slot === "direction" ? row.find(`[data-direction="${button.dataset.direction}"]`).val() || "Record" : describe(row.data(slot));
          $(button)
            .text(text)
            .prop("disabled", disabled || !selectedPad());
        });
        row.find(".positive-caption").text(pair ? "Right / down input" : kind === "axes" ? "Move the stick in either direction" : kind === "dpad" ? "Move the hat to identify its axis" : "Press the input for this output");
      }
      function addRow(binding = {}) {
        const id = ++rowID;
        const row = $(/* HTML */ `
          <div class="mapping-row border rounded p-3 mb-3">
            <div class="d-flex flex-wrap gap-2 align-items-end mb-2">
              <label class="form-label mb-0"
                >Output type<select class="mapping-kind form-select">
                  <option value="buttons">Button</option>
                  <option value="axes">Stick axis</option>
                  <option value="dpad">D-pad hat axis</option>
                </select></label
              >
              <label class="target-label form-label mb-0">Output control<select class="mapping-target form-select"></select></label>
              <button type="button" class="mapping-remove btn btn-outline-danger btn-sm">Remove</button>
            </div>
            <label class="source-mode-label form-label d-block"
              >Input method<select class="mapping-source-mode form-select w-auto">
                <option value="axis">One analog axis</option>
                <option value="buttons">Two buttons or axis halves</option>
              </select></label
            >
            <div class="d-flex flex-wrap gap-3 align-items-end">
              <div>
                <p class="positive-caption small mb-1"></p>
                <button type="button" class="mapping-record btn btn-outline-secondary" data-slot="primary">Record input</button>
              </div>
              <div class="negative-source">
                <p class="small mb-1">Left / up input</p>
                <button type="button" class="mapping-record btn btn-outline-secondary" data-slot="negative">Record input</button>
              </div>
              <label class="form-check form-switch mb-1"><input type="checkbox" class="mapping-disabled form-check-input" role="switch" /> Disable this output</label>
            </div>
            <details class="calibration mt-3">
              <summary>Axis range calibration</summary>
              <p class="small mt-2">For unusual adapters. Leave this off for standard buttons and sticks.</p>
              <label class="form-check form-switch"><input type="checkbox" class="calibration-enabled form-check-input" role="switch" /> Use a custom range</label>
              <div class="d-flex flex-wrap gap-2 mt-2">
                <label class="form-label"
                  >Output range<select class="range-type form-select">
                    <option value="trigger">Button (0 to 1)</option>
                    <option value="stick">Stick (-1 to 1)</option>
                  </select></label
                >
                <label class="form-label">Lowest value<input class="range-low form-control" type="number" step="any" value="-1" /></label>
                <label class="form-label">Highest value<input class="range-high form-control" type="number" step="any" value="1" /></label>
              </div>
            </details>
            <div class="hat-positions row g-2 mt-2"></div>
            <p class="map-message small mb-0 mt-2" role="status" aria-live="polite"></p>
          </div>
        `).attr("data-row", id);
        row.find(".mapping-kind").val(binding.targetType || "buttons");
        fillTargets(row, binding.target);
        row.find(".mapping-source-mode").val(!binding.axesConfig && (binding.positive || binding.negative) ? "buttons" : "axis");
        row.find(".range-type").val(binding.targetType === "axes" ? "stick" : "trigger");
        row.find(".mapping-disabled").prop("checked", !!binding.disabled);
        row.data("primary", sourceOf(binding.choiceType ? binding : binding.positive));
        row.data("negative", sourceOf(binding.negative));
        if (binding.axesConfig) {
          const standard = binding.targetType === "axes" && binding.axesConfig.type === "stick" && Number(binding.axesConfig.lowValue) === -1 && Number(binding.axesConfig.highValue) === 1;
          row.find(".calibration-enabled").prop("checked", !standard);
          row.find(".range-low").val(binding.axesConfig.lowValue);
          row.find(".range-high").val(binding.axesConfig.highValue);
          row.find(".range-type").val(binding.axesConfig.type);
        }
        for (const direction of directions) {
          const group = $("<div class='col-6 col-lg-3'></div>");
          $("<label class='form-label small'></label>")
            .text(direction.replace("right", " right").replace("left", " left"))
            .append(
              $("<input class='form-control' type='number' step='any' />")
                .attr("data-direction", direction)
                .val(binding.positions?.[direction] ?? "")
            )
            .appendTo(group);
          $("<button type='button' class='mapping-record btn btn-outline-secondary btn-sm' data-slot='direction'>Record</button>").attr("data-direction", direction).appendTo(group);
          row.find(".hat-positions").append(group);
        }
        row.appendTo("#mappings");
        if (dialog) row.find("select").each((_, select) => initSelect2(select));
        refreshRow(row);
        return row;
      }
      function loadRows() {
        cancelCapture();
        $("#mappings select.select2-hidden-accessible").each((_, select) => $(select).select2("destroy"));
        $("#mappings").empty();
        let bindings = settings.mapping;
        try {
          const parsed = JSON.parse($("#mapping-input").val());
          const accepted = Array.isArray(parsed) ? parsed : parsed.mapping;
          if (Array.isArray(accepted)) bindings = accepted;
        } catch {
          // Invalid form drafts retain the last validated mapping.
        }
        for (const binding of bindings) addRow(binding);
      }
      function beginCapture(row, button) {
        cancelCapture();
        const pad = selectedPad();
        if (!pad) return message(row, "Connect an input device first.", true);
        const player = $("#player-base").val();
        if ($("#player-input").val() !== player) $("#player-input").val(player).trigger("change");
        const kind = row.find(".mapping-kind").val(),
          pair = kind === "axes" && row.find(".mapping-source-mode").val() === "buttons";
        if (button.dataset.slot === "direction" && row.data("primary")?.choiceType !== "axes") return message(row, "Record the hat axis first.", true);
        capture = { row, button, kind, pair, slot: button.dataset.slot, direction: button.dataset.direction, snapshot: copyGamepad(pad), timeout: setTimeout(() => cancelCapture("Recording timed out. Try again."), 10000) };
        gamepadSupport.captureKeyboard = Number($("#player-base").val()) === 9;
        $(button).text("Listening…");
        $("#cancel-mapping-capture").removeClass("d-none");
        message(
          row,
          capture.slot === "direction" ? `Press and hold the ${capture.direction} direction.` : kind === "axes" && !pair ? "Move the analog stick. Escape cancels." : "Press a button or move the intended control. Escape cancels."
        );
      }
      // Capture starts from the current raw snapshot; releasing an already-held button is never a new binding.
      function sample(type, value, id) {
        if (!capture) return;
        const state = capture,
          threshold = 0.25;
        if (state.kind !== "buttons" && !state.pair && type !== "axes") return;
        const previous = type === "buttons" ? buttonValue(state.snapshot.buttons[id]) : (state.snapshot.axes[id] ?? 0);
        if (type === "buttons" && previous > threshold) {
          if (value <= threshold) state.snapshot.buttons[id] = { value: 0, pressed: false };
          return;
        }
        if (state.slot === "direction") {
          const source = state.row.data("primary");
          if (type !== "axes" || id !== source.choice) return;
          const neutral = state.row.data("hatNeutral") ?? previous;
          if (Math.abs(value - neutral) < 0.001) {
            state.snapshot.axes[id] = value;
            return;
          }
          if (Math.abs(value - previous) <= threshold) return;
          state.row.find(`input[data-direction="${state.direction}"]`).val(value);
        } else {
          if (Math.abs(value) <= threshold || Math.abs(value - previous) <= threshold) return;
          const source = { choiceType: type, choice: id };
          if (type === "axes" && (state.kind === "buttons" || state.pair)) source.choiceOperand = value > 0 ? "+" : "-";
          state.row.data(state.slot, source);
          if (state.kind === "dpad") state.row.data("hatNeutral", state.snapshot.axes[id]);
        }
        cancelCapture("Input recorded. Apply mapping to update the preview.");
      }
      function bindings() {
        const result = [],
          targets = new Set();
        let valid = true;
        $("#mappings .mapping-row").each((_, element) => {
          const row = $(element),
            targetType = row.find(".mapping-kind").val(),
            target = Number(row.find(".mapping-target").val());
          const binding = { targetType, ...(targetType !== "dpad" ? { target } : {}), disabled: row.find(".mapping-disabled").prop("checked") };
          const key = targetType === "dpad" ? "dpad" : `${targetType}:${target}`;
          message(row, "");
          const overlapsHat = targetType === "dpad" ? [12, 13, 14, 15].some((id) => targets.has(`buttons:${id}`)) : targetType === "buttons" && target >= 12 && target <= 15 && targets.has("dpad");
          if (targets.has(key) || overlapsHat) {
            valid = false;
            return message(row, "This output already has a binding. Edit or remove the other row.", true);
          }
          targets.add(key);
          if (!binding.disabled) {
            const primary = row.data("primary"),
              negative = row.data("negative"),
              pair = targetType === "axes" && row.find(".mapping-source-mode").val() === "buttons";
            if (!primary && !(pair && negative)) {
              valid = false;
              return message(row, "Record an input for this output first.", true);
            }
            if (pair) {
              if (primary) binding.positive = primary;
              if (negative) binding.negative = negative;
            } else Object.assign(binding, primary);
            if (targetType === "dpad") {
              binding.positions = {};
              for (const direction of directions) {
                const raw = row.find(`input[data-direction="${direction}"]`).val(),
                  value = Number(raw);
                if (raw === "" || !Number.isFinite(value)) {
                  valid = false;
                  message(row, "Record a value for each of the eight hat directions.", true);
                  return;
                }
                binding.positions[direction] = value;
              }
            } else if (!pair && (targetType === "axes" || row.find(".calibration-enabled").prop("checked"))) {
              const lowValue = targetType === "axes" && !row.find(".calibration-enabled").prop("checked") ? -1 : Number(row.find(".range-low").val());
              const highValue = targetType === "axes" && !row.find(".calibration-enabled").prop("checked") ? 1 : Number(row.find(".range-high").val());
              if (row.find(".range-low").val() === "" || row.find(".range-high").val() === "" || !Number.isFinite(lowValue) || !Number.isFinite(highValue) || lowValue === highValue) {
                valid = false;
                return message(row, "Use two different, finite range values.", true);
              }
              binding.axesConfig = { type: row.find(".calibration-enabled").prop("checked") ? row.find(".range-type").val() : "stick", lowValue, highValue };
              if (binding.choiceType === "axes") delete binding.choiceOperand;
            }
          }
          result.push(binding);
        });
        return valid ? result : null;
      }
      $("#mapping-keyboard").on("click", () => {
        gamepadSupport.connectKeyboard();
        updateDevices();
        $("#player-base").val("9").trigger("change");
      });
      $("#player-base").on("change", () => {
        cancelCapture();
        const player = $("#player-base").val();
        if (player) $("#player-input").val(player).trigger("change");
        $("#mappings .mapping-row").each((_, row) => refreshRow($(row)));
      });
      $("#prepend-mapping").on("click", () => {
        const used = new Set(
          $("#mappings .mapping-row")
            .toArray()
            .filter((row) => $(row).find(".mapping-kind").val() === "buttons")
            .map((row) => Number($(row).find(".mapping-target").val()))
        );
        const target = outputButtons().find(([id]) => !used.has(id))?.[0] ?? 0;
        const row = addRow({ targetType: "buttons", target: Math.max(0, target) });
        row.find(".mapping-target").trigger("focus");
      });
      $("#clear-mappings").on("click", () => {
        cancelCapture();
        $("#mappings select.select2-hidden-accessible").each((_, el) => $(el).select2("destroy"));
        $("#mappings").empty();
        $("#mapping-message").text("Draft cleared. Apply to restore standard input.");
      });
      $("#cancel-mapping-capture").on("click", () => cancelCapture());
      $("#mapping-config").on("click", ".mapping-record", function () {
        beginCapture($(this).closest(".mapping-row"), this);
      });
      $("#mapping-config").on("click", ".mapping-remove", function () {
        cancelCapture();
        const row = $(this).closest(".mapping-row");
        row.find("select.select2-hidden-accessible").each((_, el) => $(el).select2("destroy"));
        row.remove();
      });
      $("#mapping-config").on("change", ".mapping-row :input", function () {
        cancelCapture();
        const row = $(this).closest(".mapping-row");
        if ($(this).hasClass("mapping-kind") || $(this).hasClass("mapping-source-mode")) {
          row.data("primary", null).data("negative", null);
          if ($(this).hasClass("mapping-kind")) fillTargets(row);
        }
        refreshRow(row);
      });
      $("#apply-mapping").on("click", async () => {
        cancelCapture();
        const mapping = bindings();
        if (!mapping) return $("#mapping-message").text("Fix the highlighted bindings. Your applied mapping is unchanged.").addClass("text-danger");
        $("#mapping-input").val(JSON.stringify(mapping));
        if (await generateURL())
          $("#mapping-message")
            .text(mapping.length ? `Applied ${mapping.length} binding${mapping.length === 1 ? "" : "s"}.` : "Standard input restored.")
            .removeClass("text-danger");
      });
      $("#mapping-input").on("change", loadRows);
      $("#skin-input").on("change", () =>
        $("#mappings .mapping-row").each((_, element) => {
          const row = $(element);
          fillTargets(row, row.find(".mapping-target").val());
        })
      );
      // Hidden inputs reflect value changes into their HTML defaults, so restore this widget's opening value.
      // The shared Reset handler generates the URL after this callback restores the field.
      $("form[data-configurator]").on("reset", () =>
        setTimeout(() => {
          $("#mapping-input").val(initialMapping);
          loadRows();
        }, 0)
      );
      $(document).on("controller-connections", updateDevices);
      $(document).on("controller-input", () => {
        const pad = selectedPad();
        if (!pad) return;
        if (dialog?.open || $(dialog).is(":visible"))
          $("#mapping-readings").text(
            `Keys: ${pad.keys?.join(" ") || "none"} | Buttons: ${
              Array.from(pad.buttons, (b, id) => (buttonValue(b) > 0.1 ? `${id}=${buttonValue(b).toFixed(2)}` : ""))
                .filter(Boolean)
                .join(" ") || "none"
            } | Axes: ${Array.from(pad.axes, (value, id) => `${id}=${value.toFixed(2)}`).join(" ")}`
          );
        if (!capture) return;
        pad.buttons.forEach((button, id) => sample("buttons", buttonValue(button), id));
        pad.axes.forEach((value, id) => sample("axes", value, id));
      });
      window.addEventListener(
        "keydown",
        (event) => {
          if (!capture) return;
          if (event.key === "Escape") {
            event.preventDefault();
            event.stopImmediatePropagation();
            cancelCapture();
            return;
          }
          if (!gamepadSupport.captureKeyboard || event.repeat) return;
          if (capture.kind !== "buttons" && !capture.pair) {
            if (bySettingsKB.axesBtns.includes(event.keyCode) && capture.kind === "axes") return;
            event.preventDefault();
            event.stopImmediatePropagation();
            message(capture.row, "Choose two-button input for a stick axis, or a button output for a D-pad direction.", true);
            return;
          }
          event.preventDefault();
          event.stopImmediatePropagation();
          if (!event.code || event.code === "Unidentified") return message(capture.row, "The browser did not identify this key. Try another.", true);
          capture.row.data(capture.slot, { choiceType: "keys", choice: event.code });
          cancelCapture("Key recorded. Apply mapping to update the preview.");
        },
        true
      );
      window.addEventListener("pagehide", () => cancelCapture());
      loadRows();
      updateDevices();
      return {
        initResourceHelp(help, titles) {
          dialog = help;
          titles.remap = "Custom Mapping";
          $("<section data-panel='remap' hidden></section>").append(section.find("article").contents()).appendTo($(help).find("article"));
          section.remove();
          $(help)
            .find('[data-panel="info"]')
            .append(
              /* HTML */ `<p class="small mt-3">
                Controller input is based on <a href="https://github.com/html5rocks/www.html5rocks.com/tree/master/content/tutorials/doodles/gamepad/static/gamepad-tester" target="_blank" rel="noopener">Gamepad.js and Tester.js</a> by
                Marcin Wichary.
              </p>`
            );
          $("<button type='button' data-section='remap' class='btn btn-sm btn-outline-light border-0'><i class='fa-solid fa-gamepad me-2' aria-hidden='true'></i>Custom Mapping</button>").insertBefore($(help).find(".help-close"));
          initSelect2($("#player-base"));
          $("#mappings select").each((_, select) => initSelect2(select));
          $(help).on("close hidden.bs.modal", () => cancelCapture());
        }
      };
    };
}
