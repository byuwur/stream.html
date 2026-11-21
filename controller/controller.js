/**
 * File: controller/controller.js
 * @file Gamepad polling and renderer settings.
 * Deps: resource.js, editable controller SVGs, and embedded bySettingsKB.
 */

const controllerResourceURL = document.currentScript.src;
// These authored plastic surfaces exclude independent sockets, controls, and screen openings.
const controllerShellSelector = '[id$="shell-surfaces"] :is(.shell-base, .shell-panel, .stock-center):not(.socket-base):not(.analog-socket)';

document.addEventListener("DOMContentLoaded", () => {
  byStream.ready = initControllerResource();
});

async function initControllerResource() {
  await byStream.assetsReady;
  try {
    const { values } = await byStream.readURLParameters({ skin: {} });
    // Bare pages expose the complete catalog. Generated overlay URLs select their artwork up front.
    const fixedSkin = location.search.length > 1 && !location.hash && values.getAll("skin").length <= 1;
    window.byControllerArtwork = await loadControllerArtwork(values.get("skin") || "xseries", fixedSkin);
  } catch (error) {
    console.error(error);
    const message = document.createElement("p");
    message.setAttribute("role", "alert");
    message.textContent = location.protocol === "file:" ? "Controller SVG resources require HTTP/HTTPS. Open this overlay through a local web server or its hosted URL." : `${error.message} Check the controller SVG files, then reload.`;
    document.body.appendChild(message);
    return;
  }
  // ===== RESOURCE DEFINITION =====

  // Defaults, URL constraints, and the field metadata consumed by the optional editor.
  const resource = {
    version: "1.10", // 2026-11-20
    title: "Controller",
    description: "Gamepad or keyboard input with 32 controller models.",
    preview: [1280, 720],
    urlRequired: ["player", "skin"],
    sectionOrder: ["General", "Appearance", "Shell", "Guide button", "Screen opening", "Player indicators", "Controller buttons", "Analog sticks", "Input History", "Whole overlay"],
    sectionIcons: { "Input History": "fa-solid fa-clock-rotate-left" },
    previewAllow: "autoplay; gamepad *",
    legacyFields: ["historyAnimation", "customColors", "shellTintColor"],
    /** Migrate retired appearance controls and signed image angles before validating current fields. */
    normalizeParameters(values) {
      byStream.inputHistory.migrateAnimation(values);
      const appearance = values.get("shellAppearance");
      const legacyColors = values.get("customColors");
      // Old color switches and Image + tint links resolve to the new appearance controls.
      if (!appearance && legacyColors !== "no" && (legacyColors === "yes" || (values.has("controllerColor") && !values.has("tintOutlines")))) values.set("shellAppearance", "solid");
      if (appearance === "solid" && legacyColors === "no") values.set("shellAppearance", "off");
      if (appearance === "tint") {
        values.set("shellAppearance", "image");
        values.set("tintControls", "yes");
        if (!values.has("shellTintStrength")) values.set("shellTintStrength", "0");
      }
      if (values.has("shellTintColor")) values.set("controllerColor", values.get("shellTintColor"));
      if (legacyColors !== null && appearance === "image" && !values.has("shellTintStrength")) values.set("shellTintStrength", "0");
      const rotation = Number(values.get("shellRotation"));
      if (rotation < 0 && rotation >= -180) values.set("shellRotation", String(rotation + 360));
      values.delete("customColors");
      values.delete("shellTintColor");
    },
    elements: {
      stage: { label: "Whole overlay", selector: "#controller-overlay", container: true },
      overlay: { label: "Appearance", selector: ".controller" },
      shell: { label: "Shell", box: false, selector: '[id$="shell-surfaces"]', groups: ["Shell texture"] },
      guide: { label: "Guide button", box: false, selector: "[data-guide-symbol]", groups: ["Guide button"] },
      screen: { label: "Screen opening", box: false, selector: ".screen-surface", fields: ["screenOpacity"] },
      indicator: { label: "Player indicators", box: false, selector: ".player-leds-layer", fields: ["showPlayerIndicators"] },
      buttons: { label: "Controller buttons", selector: ".controller .control-layer[data-input]:not([data-axes])", box: false },
      sticks: { label: "Analog sticks", selector: ".controller .control-layer[data-axes]", box: false },
      history: { label: "Input History", selector: ".input-history", motionItem: "historyEntry", premade: true, groups: ["Input History"], when: ["showHistory", "yes"] },
      historyEntry: { label: "History entry", selector: ".history-entry", parent: "history" },
      historyPrompt: { label: "Input prompt", selector: ".history-prompt", parent: "historyEntry", textOverflow: ".history-prompt:not(:has(svg))" },
      historyCount: { label: "Press multiplier", selector: ".history-count", parent: "historyEntry", textOverflow: true }
    },
    fields: {
      source: {
        type: "select",
        default: "browser",
        label: "Input source",
        section: "Input",
        options: { browser: "Browser", helper: "OBS helper (TBD)" },
        description: "Native snapshots require a future OBS helper. Custom mapping capture uses browser input."
      },
      player: {
        type: "select",
        default: "1",
        label: "Player Number:",
        section: "Input",
        description: "Show one player, all slots, or connected inputs.",
        options: {
          1: "Player 1",
          2: "Player 2",
          3: "Player 3",
          4: "Player 4",
          5: "Player 5",
          6: "Player 6",
          7: "Player 7",
          8: "Player 8",
          9: "Keyboard",
          "all-gamepads": "All",
          "all-inputs": "All + Keyboard",
          gamepads: "All connected",
          all: "All connected + Keyboard"
        },
        id: "player-input",
        icon: "fa-user"
      },
      skin: {
        type: "select",
        default: "xseries",
        label: "Skin:",
        section: "Input",
        description: "Controller model or Fight Stick layout.",
        options: Object.fromEntries(Object.entries(byControllerArtwork.skins).map(([id, skin]) => [id, skin.name])),
        id: "skin-input",
        icon: "fa-gamepad"
      },
      layout: { type: "select", default: "full", label: "Layout", section: "Appearance", options: { full: "Full", minimal: "Minimal" } },
      showPlayerIndicators: {
        type: "switch",
        default: "no",
        label: "Player indicators",
        section: "Appearance",
        checkedValue: "yes",
        uncheckedValue: "no",
        options: { yes: "On", no: "Off" },
        styleSelector: ".player-leds-layer, .player-indicator, .player-ring",
        styleProperty: "display",
        styleValue: (settings) => (settings.showPlayerIndicators === "yes" ? "" : "none")
      },
      buttonLabels: { type: "select", default: "icons", label: "Button labels", section: "Appearance", options: { icons: "Hardware symbols", letters: "Button letters", none: "Hidden" } },
      variant: {
        type: "select",
        default: "original",
        label: "Color variant",
        section: "Appearance",
        options: { original: "Default", ...Object.assign({}, ...Object.values(byControllerArtwork.skins).map((skin) => skin.variants)), sequential: "Sequential (all)" },
        when: (values) => Object.keys(byControllerArtwork.skins[values.skin]?.variants || {}).length > 0,
        retainInactive: true
      },
      shellAppearance: {
        type: "select",
        default: "off",
        label: "Shell appearance",
        section: "Appearance",
        subsection: "Shell texture",
        options: { off: "Off", solid: "Solid color", image: "Image" },
        when: (values) => values.layout !== "minimal" && byControllerArtwork.skins[values.skin]?.shell,
        retainInactive: true
      },
      shellImage: {
        image: true,
        type: "text",
        default: "",
        label: "Shell image",
        section: "Appearance",
        subsection: "Shell texture",
        description: "Fits the existing shell surfaces; failed loads keep the solid shell.",
        maxlength: 65536,
        validate: (value) => (value.length <= 65536 && byStream.safeImage(value) ? value : null),
        when: ["shellAppearance", "image"],
        retainInactive: true
      },
      shellFit: {
        type: "select",
        default: "cover",
        label: "Image fit",
        section: "Appearance",
        subsection: "Shell texture",
        options: { cover: "Cover", contain: "Contain", stretch: "Stretch" },
        when: ["shellAppearance", "image"],
        retainInactive: true
      },
      shellPositionX: { type: "number", default: 0, label: "Image position X (%)", section: "Appearance", subsection: "Shell texture", min: -100, max: 100, when: ["shellAppearance", "image"], retainInactive: true },
      shellPositionY: { type: "number", default: 0, label: "Image position Y (%)", section: "Appearance", subsection: "Shell texture", min: -100, max: 100, when: ["shellAppearance", "image"], retainInactive: true },
      shellScale: { type: "number", default: 100, label: "Image scale (%)", section: "Appearance", subsection: "Shell texture", min: 10, max: 500, when: ["shellAppearance", "image"], retainInactive: true },
      shellRotation: { type: "number", default: 0, label: "Image rotation (deg)", section: "Appearance", subsection: "Shell texture", min: 0, max: 360, sliderMax: 360, when: ["shellAppearance", "image"], retainInactive: true },
      shellOpacity: { type: "number", default: 100, label: "Image opacity (%)", section: "Appearance", subsection: "Shell texture", min: 0, max: 100, when: ["shellAppearance", "image"], retainInactive: true },
      controllerColor: {
        type: "color",
        default: "#ffffff",
        label: "Tint color",
        section: "Appearance",
        subsection: "Shell texture",
        maxlength: 9,
        when: (values) => values.shellAppearance === "solid" || (values.shellAppearance === "image" && values.tintControls === "yes") || values.tintOutlines === "yes",
        retainInactive: true
      },
      tintControls: {
        type: "switch",
        default: "no",
        label: "Tint controls",
        section: "Appearance",
        subsection: "Shell texture",
        description: "Subtly tints controls while preserving their colors and markings; also enables image tint.",
        checkedValue: "yes",
        uncheckedValue: "no",
        options: { yes: "Yes", no: "No" },
        when: ["shellAppearance", "solid", "image"],
        retainInactive: true
      },
      shellTintStrength: {
        type: "number",
        default: 100,
        label: "Tint strength (%)",
        section: "Appearance",
        subsection: "Shell texture",
        min: 0,
        max: 100,
        when: (values) => values.shellAppearance === "solid" || (values.shellAppearance === "image" && values.tintControls === "yes"),
        retainInactive: true
      },
      shellBlendMode: {
        type: "select",
        default: "multiply",
        label: "Blend mode",
        section: "Appearance",
        subsection: "Shell texture",
        options: { multiply: "Multiply", overlay: "Overlay", "soft-light": "Soft-light", color: "Color", fill: "Fill" },
        when: (values) => values.shellAppearance === "solid" || (values.shellAppearance === "image" && values.tintControls === "yes"),
        retainInactive: true
      },
      tintOutlines: {
        type: "switch",
        default: "no",
        label: "Tint outlines",
        section: "Appearance",
        subsection: "Vector details",
        checkedValue: "yes",
        uncheckedValue: "no",
        options: { yes: "On", no: "Off" },
        retainInactive: true
      },
      customOutlineColor: {
        type: "switch",
        default: "no",
        label: "Custom outline color",
        section: "Appearance",
        subsection: "Vector details",
        checkedValue: "yes",
        uncheckedValue: "no",
        options: { yes: "On", no: "Off" },
        when: ["tintOutlines", "no"],
        retainInactive: true
      },
      outlineColor: { type: "color", default: "#111111", label: "Outline color", section: "Appearance", subsection: "Vector details", maxlength: 9, when: ["customOutlineColor", "yes"], retainInactive: true },
      outlineWidth: {
        type: "number",
        default: 1,
        label: "Outline thickness (×)",
        section: "Appearance",
        subsection: "Vector details",
        min: 0.5,
        max: 2,
        step: 0.1,
        description: "Scales outlines; hardware symbols and filled borders stay unchanged.",
        retainInactive: true
      },
      highlightIntensity: {
        type: "number",
        default: 12,
        label: "Highlights (%)",
        section: "Appearance",
        subsection: "Vector details",
        min: 0,
        max: 100,
        when: (values) => byControllerArtwork.skins[values.skin]?.highlights,
        retainInactive: true
      },
      shadowIntensity: {
        type: "number",
        default: 16,
        label: "Shadows (%)",
        section: "Appearance",
        subsection: "Vector details",
        min: 0,
        max: 100,
        when: (values) => byControllerArtwork.skins[values.skin]?.shadows,
        retainInactive: true
      },
      pressEffect: { type: "select", default: "invert", label: "Pressed effect", section: "Appearance", subsection: "Input feedback", options: { fill: "Fill", invert: "Invert", depth: "Fill + depth", glow: "Fill + glow" } },
      releaseDuration: { type: "number", default: 100, label: "Smooth release (ms)", section: "Appearance", subsection: "Input feedback", min: 0, max: 500, when: (values) => values.animate !== "no", retainInactive: true },
      customGuide: {
        type: "switch",
        default: "no",
        label: "Custom guide button",
        section: "Appearance",
        subsection: "Guide button",
        checkedValue: "yes",
        uncheckedValue: "no",
        options: { yes: "On", no: "Off" },
        when: (values) => byControllerArtwork.skins[values.skin]?.guide,
        retainInactive: true
      },
      guideSource: { type: "select", default: "symbol", label: "Logo source", section: "Appearance", subsection: "Guide button", options: { symbol: "Symbol", image: "Image URL" }, when: ["customGuide", "yes"], retainInactive: true },
      guideSymbol: {
        type: "select",
        default: "original",
        label: "Symbol",
        section: "Appearance",
        subsection: "Guide button",
        options: { original: "Original hardware", xbox: "Xbox", playstation: "PlayStation", steam: "Steam", circle: "Circle", diamond: "Diamond", star: "Star" },
        when: ["guideSource", "symbol"],
        retainInactive: true
      },
      guideImage: {
        image: true,
        type: "text",
        default: "",
        label: "Image URL",
        section: "Appearance",
        subsection: "Guide button",
        description: "Animated GIFs supported; failed loads keep the original symbol.",
        maxlength: 65536,
        validate: (value) => (value.length <= 65536 && byStream.safeImage(value) ? value : null),
        when: ["guideSource", "image"],
        retainInactive: true
      },
      guideColorMode: {
        type: "select",
        default: "original",
        label: "Logo color",
        section: "Appearance",
        subsection: "Guide button",
        options: { original: "Original colors", tint: "Tint", custom: "Custom / monochrome" },
        when: ["customGuide", "yes"],
        retainInactive: true
      },
      guideColor: { type: "color", default: "#ffffff", label: "Custom logo color", section: "Appearance", subsection: "Guide button", maxlength: 9, when: ["guideColorMode", "custom"], retainInactive: true },
      guideTintColor: { type: "color", default: "#ffffff", label: "Tint color", section: "Appearance", subsection: "Guide button", maxlength: 9, when: ["guideColorMode", "tint"], retainInactive: true },
      guideTintStrength: { type: "number", default: 0, label: "Tint strength (%)", section: "Appearance", subsection: "Guide button", min: 0, max: 100, when: ["guideColorMode", "tint"], retainInactive: true },
      guideBlendMode: {
        type: "select",
        default: "multiply",
        label: "Blend mode",
        section: "Appearance",
        subsection: "Guide button",
        options: { multiply: "Multiply", overlay: "Overlay", "soft-light": "Soft-light", color: "Color", fill: "Fill" },
        when: ["guideColorMode", "tint"],
        retainInactive: true
      },
      guideScale: { type: "number", default: 100, label: "Logo scale (%)", section: "Appearance", subsection: "Guide button", min: 50, max: 150, step: "any", when: ["customGuide", "yes"], retainInactive: true },
      guideOffsetX: { type: "number", default: 0, label: "Logo position X (%)", section: "Appearance", subsection: "Guide button", min: -25, max: 25, step: "any", when: ["customGuide", "yes"], retainInactive: true },
      guideOffsetY: { type: "number", default: 0, label: "Logo position Y (%)", section: "Appearance", subsection: "Guide button", min: -25, max: 25, step: "any", when: ["customGuide", "yes"], retainInactive: true },
      screenOpacity: {
        type: "number",
        default: 0,
        label: "Screen opacity (%)",
        section: "Appearance",
        subsection: "Screen opening",
        description: "0 makes the screen transparent; the bezel stays visible.",
        min: 0,
        max: 100,
        when: [
          "skin",
          ...Object.values(byControllerArtwork.skins)
            .filter((skin) => skin.screen)
            .map((skin) => skin.id)
        ]
      },
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
        description: "Maximum travel in source pixels, scaled to the model and layout.",
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
        description: "On shows trigger pressure; Off shows a digital press.",
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
        description: "Maximum wheel rotation.",
        min: 0,
        max: 360,
        sliderMax: 360,
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
        description: "Record and apply input bindings; empty keeps standard input.",
        validate: bindingSettings,
        id: "mapping-input",
        help: "remap"
      },
      opacity: {
        type: "number",
        default: 100,
        label: "Opacity (%)",
        section: "Appearance",
        description: "0% transparent; 100% opaque.",
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
        description: "Transparency sets tint strength; fully transparent disables it.",
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
        description: "Offset from the viewport center.",
        section: "Size & placement",
        min: -2000,
        max: 2000,
        step: "any",
        styleSelector: ".controller",
        styleProperty: "left",
        styleValue: (settings) => `calc(var(--player-left, 50%) + ${settings.horizontalPosition}px)`
      },
      verticalPosition: {
        type: "number",
        default: 0,
        label: "Vertical position (px)",
        section: "Size & placement",
        description: "Offset from the viewport center.",
        min: -2000,
        max: 2000,
        step: "any",
        styleSelector: ".controller",
        styleProperty: "top",
        styleValue: (settings) => `calc(var(--player-top, 50%) + ${settings.verticalPosition}px)`
      },
      fitMargin: { type: "number", default: 16, label: "Fit margin (px)", section: "Size & placement", min: 0, max: 1000, step: "any" },
      ...byStream.inputHistory.fields(),
      historySticks: {
        type: "switch",
        default: "no",
        label: "Stick direction transitions",
        section: "Input History",
        when: ["showHistory", "yes"],
        retainInactive: true,
        checkedValue: "yes",
        uncheckedValue: "no",
        options: { yes: "On", no: "Off" },
        description: "Records discrete direction changes, without per-frame entries."
      },
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
   * Both event details use player slots 0-7; keyboard input stays in slot 9.
   * A pad's index remains its browser index, independently of its assigned player slot.
   */
  const gamepadSupport = {
    gamepads: [],
    gamepadsRaw: [],
    slots: new Map(),
    connectedCount: 0,
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
      if (["9", "all", "all-inputs"].includes(settings.player)) this.connectKeyboard();
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
      const target = byStreamOverlay ? window : document;
      target.addEventListener("keydown", tester.updateInputKB);
      target.addEventListener("keyup", tester.updateInputKB);
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
      for (const player of tester.controls.keys()) gamepadSupport.updateDisplay(player === 9 ? 9 : player - 1);
      if (history) updateControllerHistory();
      gamepadSupport.frame = requestAnimationFrame(gamepadSupport.tick);
    },
    pollGamepads() {
      this.applyGamepads(Array.from(navigator.getGamepads?.() ?? []).filter((pad) => pad && pad.connected !== false));
    },
    applyGamepads(pads) {
      const previous = this.gamepads;
      for (const [index, slot] of this.slots) {
        if (!pads.some((pad) => pad.index === index && pad.id === previous[slot]?.id)) this.slots.delete(index);
      }
      this.gamepads = [];
      this.gamepadsRaw = [];
      for (const pad of pads) {
        if (!this.slots.has(pad.index)) {
          const free = Array.from({ length: 8 }, (_, slot) => slot).filter((slot) => ![...this.slots.values()].includes(slot));
          // Retain the traditional index + 1 selection when that player is free.
          const slot = free.includes(pad.index) ? pad.index : free[0];
          if (slot === undefined) continue;
          this.slots.set(pad.index, slot);
        }
        const slot = this.slots.get(pad.index);
        this.gamepadsRaw[slot] = pad;
        this.gamepads[slot] = settings.mapping.length ? remapGamepad(pad) : pad;
      }
      this.connectedCount = this.slots.size;
      if (this.kb) {
        this.gamepadsRaw[9] = bySettingsKB;
        this.gamepads[9] = settings.mapping.length ? remapGamepad(bySettingsKB) : bySettingsKB;
      }
      const changed =
        Object.keys(previous).join() !== Object.keys(this.gamepads).join() || Object.keys(this.gamepads).some((index) => previous[index]?.id !== this.gamepads[index].id || previous[index]?.index !== this.gamepads[index].index);
      if (changed) {
        if (byStreamOverlay && ["gamepads", "all"].includes(settings.player)) initController();
        tester.updateGamepads(this.gamepads);
        document.dispatchEvent(new CustomEvent("controller-connections", { detail: this.gamepadsRaw }));
      }
    },
    updateDisplay(index) {
      const pad = this.gamepads[index] || { buttons: [], axes: [] };
      const player = index === 9 ? 9 : index + 1;
      if (!tester.controls.has(player)) return;
      const buttons = byControllerArtwork.names;
      buttons.forEach((name, id) => {
        // Two-axis NES adapters can expose the D-pad as axes instead of standard buttons.
        const axis = digitalValue(pad, id);
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

  // ===== INPUT HISTORY =====
  /** Read the same model-specific digital value for artwork and history from the mapped pad. */
  function digitalValue(pad, id) {
    if (settings.skin === "nes" && id >= 12 && id <= 15 && pad.buttons[id] === undefined) return [-(pad.axes[1] ?? 0), pad.axes[1] ?? 0, -(pad.axes[0] ?? 0), pad.axes[0] ?? 0][id - 12];
    if (settings.skin === "n64" && id >= 18 && id <= 21) return pad.buttons[id] ?? [-(pad.axes[3] ?? 0), pad.axes[3] ?? 0, -(pad.axes[2] ?? 0), pad.axes[2] ?? 0][id - 18];
    return pad.buttons[id];
  }

  /** Resolve a control's digital D-pad override once for both lever painting and direction history. */
  function stickInput(control, x, y, buttons) {
    if (!control.dataset.dpad) return { x, y, digital: false };
    const [up, down, left, right] = control.dataset.dpad.split(" ").map((id) => buttons[Number(id)]?.pressed || buttonValue(buttons[Number(id)]) > tester.ANALOGUE_STICK_THRESHOLD);
    return up || down || left || right ? { x: Number(right) - Number(left), y: Number(down) - Number(up), digital: true } : { x, y, digital: false };
  }

  /** Diff only selected players' mapped inputs, using the existing poll; no second loop/listeners. */
  function updateControllerHistory() {
    for (const [player, controls] of tester.controls) {
      const source = `p${player}`;
      const pad = gamepadSupport.gamepads[player === 9 ? 9 : player - 1];
      const tokens = [];
      if (pad) {
        byControllerArtwork.names.forEach((name, id) => {
          const control = controls.get(name);
          if (!control || control.node.dataset.stickClick === "no") return;
          const threshold = id === 6 || id === 7 ? tester.DIGITAL_THRESHOLD : settings.skin === "n64" && id >= 18 && id <= 21 ? tester.ANALOGUE_STICK_THRESHOLD : tester.ANALOGUE_BUTTON_THRESHOLD;
          if (buttonValue(digitalValue(pad, id)) <= threshold) return;
          const label = control.node.dataset.label || control.node.getAttribute("aria-label") || name;
          tokens.push({
            id: `${source}:${name}`,
            source,
            label,
            prompt: () => controllerHistoryPrompt(control)
          });
        });
        for (const [index, name] of [
          [0, "stick-1"],
          [2, "stick-2"]
        ]) {
          const control = controls.get(name);
          if (!control) continue;
          const { x, y, digital } = stickInput(control.node, pad.axes[index] ?? 0, pad.axes[index + 1] ?? 0, pad.buttons);
          if (!digital && settings.historySticks !== "yes") continue;
          // A neutral band and 8 directions produce discrete transitions instead of an analog log.
          if (Math.hypot(x, y) <= Math.max(0.2, tester.ANALOGUE_STICK_THRESHOLD)) continue;
          const direction = Math.round(Math.atan2(y, x) / (Math.PI / 4));
          const label = ["Left", "Up-left", "Up", "Up-right", "Right", "Down-right", "Down", "Down-left", "Left"][direction + 4];
          tokens.push({
            id: `${source}:${name}:${label}`,
            source,
            label: digital ? label : `${index ? "RS" : "LS"} ${label}`,
            prompt: () => controllerHistoryPrompt(control, direction)
          });
        }
      }
      history.update(source, tokens);
    }
  }

  let historyPromptId = 0;
  /** Copy the visible face only. The mounted skin already provides its styles and static SVG definitions. */
  function controllerHistoryPrompt(control, direction = null) {
    const node = control.node;
    const box = control.historyBounds || node.getBBox();
    if (!box.width || !box.height) return null;
    control.historyBounds = box;
    const prompt = node.cloneNode(false);
    prompt.setAttribute("viewBox", `${box.x - 2} ${box.y - 2} ${box.width + 4} ${box.height + 4}`);
    prompt.removeAttribute("class");
    prompt.removeAttribute("style");
    prompt.removeAttribute("id");
    const face = node.querySelector(".layout-position").cloneNode(true);
    for (const part of face.querySelectorAll("[id]")) part.removeAttribute("id");
    prompt.append(face);
    // Keep the trigger at its recorded pressure when the live control is released.
    if (control.fill) {
      const clip = control.fill.parentNode.cloneNode(true);
      clip.id = `history-pressure-${++historyPromptId}`;
      face.querySelector(".trigger-active").setAttribute("clip-path", `url(#${clip.id})`);
      prompt.append(clip);
    }
    if (direction !== null) {
      const arrow = document.createElementNS(prompt.namespaceURI, "path");
      arrow.setAttribute("d", "M-4 0 H4 M1 -3 L4 0 1 3");
      arrow.setAttribute("fill", "none");
      arrow.setAttribute("stroke", "currentColor");
      arrow.setAttribute("stroke-width", "1.5");
      arrow.setAttribute("transform", `translate(${box.x + box.width / 2} ${box.y + box.height / 2}) rotate(${direction * 45}) scale(${Math.min(box.width, box.height) / 12})`);
      prompt.append(arrow);
    }
    return prompt;
  }

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
    keys: new Set(),
    keyCodes: new Set(),
    updateGamepads(pads = []) {
      const container = document.getElementById("gamepads");
      if (container) container.dataset.gamepadCount = gamepadSupport.connectedCount;
      document.querySelectorAll(".controller").forEach((controller) => {
        const player = Number(controller.id.replace("gamepad-", ""));
        controller.classList.toggle("disconnected", !pads[player === 9 ? 9 : player - 1]);
      });
    },
    updateInputKB(event) {
      if (event.type === "keydown" && (event.isComposing || event.target?.closest?.("input, textarea, select, [contenteditable]:not([contenteditable='false'])")) && !gamepadSupport.captureKeyboard) return;
      if (gamepadSupport.captureKeyboard && (bySettingsKB.btns.includes(event.keyCode) || bySettingsKB.axesBtns.includes(event.keyCode))) event.preventDefault();
      if (event.type === "keydown") {
        tester.keys.add(event.keyCode);
        if (event.code) tester.keyCodes.add(event.code);
      } else {
        tester.keys.delete(event.keyCode);
        tester.keyCodes.delete(event.code);
      }
      tester.updateKeyboardState();
    },
    updateKeyboardState() {
      bySettingsKB.keys = [...tester.keyCodes];
      bySettingsKB.buttons = bySettingsKB.btns.map((key) => Number(tester.keys.has(key)));
      bySettingsKB.axes = [0, 1, 2, 3].map((axis) => Number(tester.keys.has(bySettingsKB.axesBtns[axis * 2 + 1])) - Number(tester.keys.has(bySettingsKB.axesBtns[axis * 2])));
    },
    updateButton(value, player, name, threshold = this.ANALOGUE_BUTTON_THRESHOLD) {
      const control = this.controls.get(player)?.get(name);
      if (!control || control.node.classList.contains("analog-trigger") || control.node.dataset.stickClick === "no") return;
      const pressed = buttonValue(value) > threshold;
      if (control.pressed === pressed) return;
      control.pressed = pressed;
      control.node.classList.toggle("pressed", pressed);
    },
    updateTrigger(value, player, name) {
      const control = this.controls.get(player)?.get(`${name}-digital`);
      if (!control?.fill) return;
      const value01 = Math.max(0, Math.min(1, buttonValue(value)));
      const pressure = this.TRIGGER_DISPLAY_TYPE ? value01 : Number(value01 > this.DIGITAL_THRESHOLD);
      if (control.pressure === pressure) return;
      control.pressure = pressure;
      control.node.classList.toggle("pressed", pressure > 0);
      const horizontal = control.node.dataset.layout === "minimal";
      const box = control.fillBounds;
      control.fill.setAttribute("x", String(box.x));
      control.fill.setAttribute("y", String(horizontal ? box.y : box.y + box.height * (1 - pressure)));
      control.fill.setAttribute("width", String(horizontal ? box.width * pressure : box.width));
      control.fill.setAttribute("height", String(horizontal ? box.height : box.height * pressure));
    },
    updateAxis(horizontal, vertical, player, name, buttons) {
      const control = this.controls.get(player)?.get(name);
      if (!control) return;
      const stick = control.node;
      // Arcade D-pad input and axes share one position; simultaneous input never doubles travel.
      ({ x: horizontal, y: vertical } = stickInput(stick, horizontal, vertical, buttons));
      const active = Math.hypot(horizontal, vertical) >= this.ANALOGUE_STICK_THRESHOLD;
      const travel = this.STICK_OFFSET * Number(stick.dataset.travelScale || 1) * (stick.dataset.layout === "minimal" ? Number(stick.dataset.compactScale || 1) : 1);
      const magnitude = Math.max(1, Math.hypot(horizontal, vertical));
      const x = active ? (horizontal / magnitude) * travel : 0;
      const y = active ? (vertical / magnitude) * travel : 0;
      const wheel = this.controls.get(player)?.get(`${name}-wheel`)?.node;
      const rotation = horizontal * this.ROTATE_BOUNDARY;
      if (wheel && control.rotation !== rotation) {
        control.rotation = rotation;
        wheel.style.transform = `rotate(${rotation}deg)`;
      }
      if (control.x === x && control.y === y) return;
      control.x = x;
      control.y = y;
      stick.style.translate = `calc(${x}px * var(--controller-fit, 1)) calc(${y}px * var(--controller-fit, 1))`;
      if (control.shaft) {
        const scale = stick.dataset.layout === "minimal" ? Number(stick.dataset.compactScale) : 1;
        control.shaft.setAttribute("x2", String(control.shaft.x1.baseVal.value + x / scale));
        control.shaft.setAttribute("y2", String(control.shaft.y1.baseVal.value + y / scale));
      }
      if (this.STICK_CURVING) stick.style.transform = `rotateX(${active ? -vertical * this.STICK_OFFSET : 0}deg) rotateY(${active ? horizontal * this.STICK_OFFSET : 0}deg)`;
    }
  };

  /**
   * File: controller/controller.js
   * @file Controller parameter validation and gamepad remapping.
   * Deps: Gamepad integration.
   * @author mateus@byuwur.co (Andres Trujillo Mateus)
   */

  // ===== CONTROLLER BINDINGS =====
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
        const positions = {
          up: [12],
          down: [13],
          left: [14],
          right: [15],
          upright: [12, 15],
          downright: [13, 15],
          downleft: [13, 14],
          upleft: [12, 14]
        };
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
  // ===== CONTROLLER INITIALIZATION =====
  function initController() {
    changeControllers(renderControllers);
  }

  function renderControllers() {
    controllerEvents?.abort();
    controllerEvents = new AbortController();
    const container = document.getElementById("gamepads");
    let players;
    if (["all-gamepads", "all-inputs"].includes(settings.player)) {
      players = Array.from({ length: settings.player === "all-inputs" ? 9 : 8 }, (_, index) => index + 1);
    } else if (["gamepads", "all"].includes(settings.player)) {
      players = Object.keys(gamepadSupport.gamepads)
        .filter((slot) => slot !== "9" || settings.player === "all")
        .map((slot) => (Number(slot) === 9 ? 9 : Number(slot) + 1));
    } else {
      players = [Number(settings.player)];
    }
    // Connection changes replace the history too, so multiple mounted players never record inputs.
    history?.destroy();
    history = players.length === 1 ? byStream.inputHistory.create(settings, document.getElementById("controller-overlay")) : null;
    container.replaceChildren();
    container.dataset.gamepadCount = gamepadSupport.connectedCount;
    tester.controls.clear();
    const variants = ["original", ...Object.keys(byControllerArtwork.skins[settings.skin].variants)];
    players.forEach((player, index) => mountController(player, index));
    const controllers = [...container.querySelectorAll(".controller")];
    function mountController(player, index) {
      const active = document.createElement("div");
      active.className = "controller active";
      active.setAttribute("data-stream-viewport", "");
      if (settings.mirror === "yes") active.style.scale = "-1 1";
      active.id = `gamepad-${player}`;
      active.setAttribute("aria-label", player === 9 ? "Keyboard" : `Player ${player}`);
      container.append(active);
      const variant = settings.variant === "sequential" ? variants[index % variants.length] : settings.variant;
      const artwork = byControllerArtwork.render(settings.skin, settings.layout, settings.buttonLabels, variant, `p${player}`);
      active.innerHTML = `<div class="controller-layers">${artwork.markup}</div>`;
      active.style.width = `${artwork.width}px`;
      active.style.height = `${artwork.height}px`;
      active.style.opacity = settings.opacity / 100;
      active.style.setProperty("--screen-opacity", settings.screenOpacity / 100);
      customizeControllerAppearance(active, settings);
      if (settings.pressEffect === "invert") prepareInvertedFaces(active);
      customizeControllerShell(active, settings, controllerEvents.signal);
      function updatePlayerIndicators() {
        const litLeds = [[], [1], [2], [3], [4], [1, 4], [2, 4], [3, 4], [1, 3, 4], [1, 2, 3, 4]][player];
        for (const indicator of active.querySelectorAll("[data-player]")) {
          const lamp = Number(indicator.dataset.player);
          const layer = indicator.closest(".player-leds-layer");
          const rotation = layer?.dataset.layout === "full" ? Number(layer.dataset.playerLeds?.split(" ")[3] || 0) : 0;
          // Mirroring reverses horizontal rows; vertical lamps still read from top to bottom.
          const reverse = settings.mirror === "yes" && indicator.classList.contains("player-indicator") && rotation % 180 === 0;
          indicator.classList.toggle("lit", litLeds.includes(reverse ? 5 - lamp : lamp));
        }
      }
      updatePlayerIndicators();
      for (const numeral of active.querySelectorAll("[data-player-number]")) {
        numeral.classList.toggle("lit", Number(numeral.dataset.playerNumber) === player);
      }
      const controls = new Map();
      tester.controls.set(player, controls);
      for (const node of active.querySelectorAll("[data-name]")) {
        const fillArtwork = node.querySelector(".trigger-active");
        const clip = fillArtwork?.getAttribute("clip-path").slice(5, -1);
        const shaft = active.querySelector(`.fixed-layer[data-for="${node.dataset.input}"] .stick-shaft`);
        controls.set(node.dataset.name, {
          node,
          shaft,
          fillArtwork,
          fillBounds: triggerBounds(node, fillArtwork),
          fill: clip ? node.querySelector(`[id="${clip}"] .trigger-fill-rect`) : null
        });
      }
      active.addEventListener(
        "controller-layout",
        () => {
          updatePlayerIndicators();
          customizeControllerShell(active, settings, controllerEvents.signal);
          for (const control of controls.values()) {
            control.historyBounds = null;
            control.pressure = undefined;
            control.x = control.y = undefined;
            if (control.fillArtwork) control.fillBounds = triggerBounds(control.node, control.fillArtwork);
          }
          fitController();
        },
        { signal: controllerEvents.signal }
      );
    }
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
      const viewports = controllers.map((active) => active.querySelector(".controller-background").viewBox.baseVal);
      const columns = Math.max(1, Math.min(controllers.length, Math.ceil(Math.sqrt((controllers.length * innerWidth) / Math.max(1, innerHeight)))));
      const rows = Math.max(1, Math.ceil(controllers.length / columns));
      controllers.forEach((active, index) => {
        const view = viewports[index];
        const cellWidth = innerWidth / columns,
          cellHeight = innerHeight / rows;
        const fit = Math.max(0, Math.min((cellWidth - settings.fitMargin * 2) / view.width, (cellHeight - settings.fitMargin * 2) / view.height));
        const width = view.width * fit,
          height = view.height * fit;
        active.style.width = width + "px";
        active.style.height = height + "px";
        active.style.setProperty("--player-left", Math.round(cellWidth * ((index % columns) + 0.5) - width / 2) + "px");
        active.style.setProperty("--player-top", Math.round(cellHeight * (Math.floor(index / columns) + 0.5) - height / 2) + "px");
        active.style.setProperty("--controller-fit", fit);
        for (const stick of active.querySelectorAll(".control-layer.stick")) {
          const box = stick.getBBox();
          stick.style.transformOrigin = `${(box.x + box.width / 2 - view.x) * fit}px ${(box.y + box.height / 2 - view.y) * fit}px`;
        }
      });
    }
    fitController();
    // Fitting resolves the initial artwork styles before enabling release transitions.
    for (const active of controllers) {
      active.dataset.effect = settings.pressEffect;
      active.style.setProperty("--release", `${settings.releaseDuration}ms`);
    }
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

  // ===== OVERLAY INITIALIZATION =====
  const settings = await byStream.initResource(resource, { gamepadSupport, buttonValue, copyGamepad });
  let history = null;
  const gamepads = document.getElementById("gamepads");
  const changeControllers = byStreamOverlay && byStream.changeItems(gamepads, settings, "overlay", () => gamepads.querySelectorAll(".controller.active"), undefined, gamepads.parentElement);
  if (byStreamOverlay) await byControllerArtwork.loadGuideSymbol(settings);
  if (byStreamOverlay && settings.source === "helper") {
    const events = new AbortController();
    let pads = [];
    function refresh() {
      gamepadSupport.applyGamepads(pads);
      for (const player of tester.controls.keys()) gamepadSupport.updateDisplay(player === 9 ? 9 : player - 1);
      if (history) updateControllerHistory();
    }
    initController();
    byStream.subscribeNative(
      "controller",
      (state) => {
        pads = state?.pads || [];
        refresh();
      },
      events.signal
    );
    byStream.subscribeNative(
      "keyboard",
      (state) => {
        // Bridge physical codes to the existing editable numeric browser defaults. Custom bindings use codes directly.
        const legacy = {
          Tab: 9,
          Escape: 27,
          Space: 32,
          ArrowLeft: 37,
          ArrowUp: 38,
          ArrowRight: 39,
          ArrowDown: 40
        };
        tester.keyCodes = new Set(state?.keys);
        tester.keys.clear();
        for (const code of tester.keyCodes) {
          if (/^Key[A-Z]$|^Digit[0-9]$/.test(code)) tester.keys.add(code.charCodeAt(code.length - 1));
          else if (Object.hasOwn(legacy, code)) tester.keys.add(legacy[code]);
        }
        gamepadSupport.kb = !!state;
        tester.updateKeyboardState();
        refresh();
      },
      events.signal
    );
    window.addEventListener(
      "pagehide",
      (event) => {
        if (!event.persisted) {
          events.abort();
          controllerEvents.abort();
          history?.destroy();
        }
      },
      { signal: events.signal }
    );
  } else {
    gamepadSupport.init();
    if (byStreamOverlay) {
      byStream.preventOverlayInputDefaults();
      initController();
    }
  }
}

/**
 * File: controller/artwork.js (inline section)
 * @file Mount editable SVG documents. Geometry and per-model bindings belong to controllers/<id>.svg.
 */
// ===== CONTROL FEEDBACK AND TINTS =====
function prepareInvertedFaces(controller) {
  for (const control of controller.querySelectorAll(".control-layer:not(.analog-trigger)")) {
    const faces = [...control.querySelectorAll(".button-face, .gcn-face, .button-detail.stock-plastic")].filter((face) => !face.closest("defs, .guide-logo-original"));
    // Some stock guide buttons consist entirely of a painted emblem until a custom housing is enabled.
    if (!faces.some((face) => !face.classList.contains("guide-custom-housing"))) {
      faces.push(...control.querySelectorAll(".guide-logo-original [fill]"));
    }
    for (const face of faces) {
      const fill = getComputedStyle(face).fill;
      if (!CSS.supports("color", fill)) continue;
      face.classList.add("invert-face");
      face.style.setProperty("--inverted-fill", `rgb(from ${fill} calc(255 - r) calc(255 - g) calc(255 - b) / alpha)`);
    }
  }
}

/**
 * Subtly tint control surfaces without changing their markings, lighting, or input filters.
 * @param {HTMLElement} controller Mounted controller.
 * @param {string} color Validated shell color in hexadecimal.
 * @returns {void}
 */
function tintControllerControls(controller, color) {
  let hex = color.replace("#", "");
  if (hex.length <= 4) hex = [...hex].map((digit) => digit + digit).join("");
  const shell = [0, 2, 4].map((offset) => parseInt(hex.slice(offset, offset + 2), 16));
  const surfaces = controller.querySelectorAll(".controller-background .control-tint-face, .control-layer");
  for (const control of surfaces) {
    const faces = control.matches(".control-tint-face") ? [control] : control.querySelectorAll(".button-face, .gcn-face, .button-detail.stock-plastic");
    for (const face of faces) {
      if (face.closest("defs, .guide-logo-original")) continue;
      const original = getComputedStyle(face)
        .fill.match(/[\d.]+/g)
        ?.slice(0, 3)
        .map(Number);
      if (!original || original.length !== 3) continue;
      // Retain most of each hardware color, including the contrasting trigger-pressure fill.
      const tinted = original.map((channel, index) => Math.round(channel * 0.8 + shell[index] * 0.2));
      face.style.fill = `rgb(${tinted.join(", ")})`;
    }
  }
}

/**
 * Build an isolated image/logo tint filter shared by shell and guide customization.
 * @param {string} id Unique filter ID within this controller instance.
 * @param {string} color Validated hexadecimal tint color, including optional alpha.
 * @param {number} strength Tint strength from 0 to 100 percent.
 * @param {string} mode Requested blend mode; unsupported modes use multiply.
 * @returns {SVGFilterElement} Unmounted definition; the caller owns its SVG and lifetime.
 */
function controllerTintFilter(id, color, strength, mode) {
  const ns = "http://www.w3.org/2000/svg";
  const filter = document.createElementNS(ns, "filter");
  filter.id = id;
  filter.setAttribute("x", "0");
  filter.setAttribute("y", "0");
  filter.setAttribute("width", "1");
  filter.setAttribute("height", "1");
  filter.setAttribute("color-interpolation-filters", "sRGB");
  // Blend against an opaque copy, then restore source alpha once so partial tint
  // preserves translucent pixels without including the shell or page background.
  const opaque = document.createElementNS(ns, "feComponentTransfer");
  opaque.setAttribute("in", "SourceGraphic");
  opaque.setAttribute("result", "opaque-image");
  const opacity = document.createElementNS(ns, "feFuncA");
  opacity.setAttribute("type", "linear");
  opacity.setAttribute("slope", "0");
  opacity.setAttribute("intercept", "1");
  opaque.append(opacity);
  const flood = document.createElementNS(ns, "feFlood");
  flood.setAttribute("flood-color", color);
  flood.setAttribute("flood-opacity", strength / 100);
  flood.setAttribute("result", "tint");
  const blend = document.createElementNS(ns, "feBlend");
  blend.setAttribute("in", "tint");
  blend.setAttribute("in2", "opaque-image");
  blend.setAttribute("mode", mode === "fill" ? "normal" : CSS.supports("mix-blend-mode", mode) ? mode : "multiply");
  const alpha = document.createElementNS(ns, "feComposite");
  alpha.setAttribute("in2", "SourceAlpha");
  alpha.setAttribute("operator", "in");
  filter.append(opaque, flood, blend, alpha);
  return filter;
}

/** Apply independent shell colors, vector details, and guide customization to a fresh mount. */
function customizeControllerAppearance(controller, settings) {
  let hex = settings.controllerColor.replace("#", "");
  if (hex.length <= 4) hex = [...hex].map((digit) => digit + digit).join("");
  const channels = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
  controller.style.setProperty("--highlight-intensity", settings.highlightIntensity / 100);
  controller.style.setProperty("--shadow-intensity", settings.shadowIntensity / 100);
  const outline =
    settings.tintOutlines === "yes"
      ? `#${channels
          .map((channel) =>
            Math.round(channel * 0.28)
              .toString(16)
              .padStart(2, "0")
          )
          .join("")}`
      : settings.customOutlineColor === "yes"
        ? settings.outlineColor
        : null;
  for (const node of controller.querySelectorAll(".vector-outline")) {
    if (node.closest("defs, .marking, .hardware-icon, .guide-logo-original")) continue;
    const style = getComputedStyle(node);
    if (style.stroke === "none") continue;
    node.style.strokeWidth = `${parseFloat(style.strokeWidth) * settings.outlineWidth}px`;
    if (outline && !node.matches(".control-detail, .button-detail")) node.style.stroke = outline;
  }
  if (settings.shellAppearance !== "off" && settings.tintControls === "yes") tintControllerControls(controller, settings.controllerColor);
  if (settings.customGuide !== "yes") return;
  const slot = controller.querySelector(".guide-logo-slot");
  if (!slot) return;
  if (settings.guideSource === "symbol" && settings.guideSymbol === "original" && settings.guideColorMode === "original" && settings.guideScale === 100 && !settings.guideOffsetX && !settings.guideOffsetY) return;
  const original = slot.querySelector(".guide-logo-original");
  const housing = slot.parentElement.querySelector(".guide-custom-housing");
  const [x, y, width, height] = slot.dataset.logoBounds.split(" ").map(Number);
  const cx = x + width / 2 + (width * settings.guideOffsetX) / 100;
  const cy = y + height / 2 + (height * settings.guideOffsetY) / 100;
  const ns = "http://www.w3.org/2000/svg";
  const content = document.createElementNS(ns, "g");
  content.classList.add("guide-logo-custom");
  content.setAttribute("clip-path", `url(${slot.dataset.guideClip})`);
  if (settings.guideColorMode === "tint" && settings.guideTintStrength > 0) {
    const filter = controllerTintFilter(`${slot.id}-logo-tint`, settings.guideTintColor, settings.guideTintStrength, settings.guideBlendMode);
    slot.closest("svg").querySelector("defs").append(filter);
    content.setAttribute("filter", `url(#${filter.id})`);
  }
  const reveal = () => {
    original.style.display = "none";
    if (housing) housing.style.display = "inline";
    content.style.visibility = "visible";
    // Stock emblems may sit behind shell cutouts; replacements must cover those cutouts.
    const layer = slot.closest("svg");
    layer.parentElement.insertBefore(layer, layer.parentElement.querySelector(".player-leds-layer"));
  };
  if (settings.guideSource === "image") {
    if (!settings.guideImage || !byStream.safeImage(settings.guideImage)) return;
    const image = document.createElementNS(ns, "image");
    const scale = settings.guideScale / 100;
    image.setAttribute("x", String(cx - (width * scale) / 2));
    image.setAttribute("y", String(cy - (height * scale) / 2));
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
  const scale = (Math.min(width / sw, height / sh) * settings.guideScale) / 100;
  artwork.setAttribute("transform", `translate(${cx} ${cy}) scale(${scale}) translate(${-sx - sw / 2} ${-sy - sh / 2})`);
  content.append(artwork);
  slot.append(content);
  reveal();
}

// ===== SHELL ARTWORK =====
/**
 * Fill only authored shell plastics with a stable SVG texture, leaving strokes and paint order intact.
 * Native pattern fills use the existing paths as their exact clipping geometry, including holes.
 * Each surface maps the same root-space composition back through its own transform; decoding and
 * tint filters are shared within this instance and never recreated during input frames.
 * @param {HTMLElement} controller Freshly mounted controller instance.
 * @param {Object} settings Validated appearance settings; Off/minimal/unsupported models do no work.
 * @param {AbortSignal} signal Aborted when these controller instances are replaced.
 * @returns {void} Keeps original fills until load; failure or timeout retains the solid artwork.
 */
function customizeControllerShell(controller, settings, signal) {
  if (settings.shellAppearance === "off") return;
  const solid = settings.shellAppearance === "solid";
  if (!solid && (!settings.shellImage || !byStream.safeImage(settings.shellImage))) return;
  const svg = controller.querySelector(".controller-background");
  if (svg.dataset.layout === "minimal" || svg.querySelector(".shell-texture-definitions")) return;
  const surfaces = [...svg.querySelectorAll(controllerShellSelector)];
  if (!surfaces.length) return;
  const ns = svg.namespaceURI;
  const definitions = document.createElementNS(ns, "defs");
  definitions.classList.add("shell-texture-definitions");
  const toRoot = svg.getCTM().inverse();
  const boxes = surfaces.flatMap((surface) => {
    const box = surface.getBBox();
    const matrix = toRoot.multiply(surface.getCTM());
    return [
      [box.x, box.y],
      [box.x + box.width, box.y],
      [box.x, box.y + box.height],
      [box.x + box.width, box.y + box.height]
    ].map(([x, y]) => new DOMPoint(x, y).matrixTransform(matrix));
  });
  const x = Math.min(...boxes.map((point) => point.x)),
    y = Math.min(...boxes.map((point) => point.y));
  const width = Math.max(...boxes.map((point) => point.x)) - x,
    height = Math.max(...boxes.map((point) => point.y)) - y;
  if (width <= 0 || height <= 0) return;
  const prefix = `${controller.id}-shell-texture`;
  let filter;
  if ((solid || settings.tintControls === "yes") && settings.shellTintStrength > 0) {
    filter = controllerTintFilter(`${prefix}-tint`, settings.controllerColor, settings.shellTintStrength, settings.shellBlendMode);
    definitions.append(filter);
  }
  let image;
  if (!solid) {
    const composition = document.createElementNS(ns, "g");
    composition.id = prefix;
    image = document.createElementNS(ns, "image");
    image.classList.add("shell-texture-image");
    image.setAttribute("x", x);
    image.setAttribute("y", y);
    image.setAttribute("width", width);
    image.setAttribute("height", height);
    image.setAttribute("preserveAspectRatio", settings.shellFit === "stretch" ? "none" : `xMidYMid ${settings.shellFit === "contain" ? "meet" : "slice"}`);
    image.setAttribute("opacity", settings.shellOpacity / 100);
    const cx = x + width / 2,
      cy = y + height / 2;
    image.setAttribute(
      "transform",
      `translate(${cx + (width * settings.shellPositionX) / 100} ${cy + (height * settings.shellPositionY) / 100}) rotate(${settings.shellRotation}) scale(${settings.shellScale / 100}) translate(${-cx} ${-cy})`
    );
    if (filter) image.setAttribute("filter", `url(#${filter.id})`);
    composition.append(image);
    definitions.append(composition);
  }
  const fills = surfaces.map((surface, index) => {
    const box = surface.getBBox();
    const pattern = document.createElementNS(ns, "pattern");
    pattern.id = `${prefix}-${index}`;
    pattern.setAttribute("patternUnits", "userSpaceOnUse");
    // One tile covers this entire path in its own coordinates, including rotated shell panels.
    pattern.setAttribute("x", box.x);
    pattern.setAttribute("y", box.y);
    pattern.setAttribute("width", box.width);
    pattern.setAttribute("height", box.height);
    pattern.setAttribute("viewBox", `${box.x} ${box.y} ${box.width} ${box.height}`);
    pattern.setAttribute("preserveAspectRatio", "none");
    const base = document.createElementNS(ns, "rect");
    base.setAttribute("x", box.x);
    base.setAttribute("y", box.y);
    base.setAttribute("width", box.width);
    base.setAttribute("height", box.height);
    base.setAttribute("fill", getComputedStyle(surface).fill);
    if (solid && filter) base.setAttribute("filter", `url(#${filter.id})`);
    pattern.append(base);
    if (!solid) {
      const texture = document.createElementNS(ns, "use");
      texture.setAttribute("href", `#${prefix}`);
      const { a, b, c, d, e, f } = toRoot.multiply(surface.getCTM()).inverse();
      texture.setAttribute("transform", `matrix(${a} ${b} ${c} ${d} ${e} ${f})`);
      pattern.append(texture);
    }
    definitions.append(pattern);
    return `url(#${pattern.id})`;
  });
  if (solid) {
    svg.prepend(definitions);
    surfaces.forEach((surface, index) => {
      surface.style.fill = fills[index];
    });
    return;
  }
  let timer;
  /** Release loading callbacks; a failed load leaves every original surface unchanged. */
  function finish(loaded) {
    clearTimeout(timer);
    image.onload = image.onerror = null;
    signal.removeEventListener("abort", abort);
    if (loaded && controller.isConnected && !signal.aborted) {
      surfaces.forEach((surface, index) => {
        surface.style.fill = fills[index];
      });
      controller.dataset.shellTexture = "ready";
    } else {
      definitions.remove();
      controller.dataset.shellTexture = "fallback";
      if (!signal.aborted) console.warn("Controller shell image could not be loaded; using solid shell colors.");
    }
  }
  /** A replaced controller must never receive a delayed texture result. */
  function abort() {
    finish(false);
  }
  image.onload = () => finish(true);
  image.onerror = () => finish(false);
  signal.addEventListener("abort", abort, { once: true });
  timer = setTimeout(() => finish(false), 30000);
  svg.prepend(definitions);
  image.setAttribute("href", new URL(settings.shellImage, location.href).href);
}

// ===== ARTWORK LOADING =====
async function loadControllerArtwork(requiredSkin, fixedSkin) {
  // Discovery/order only. Names, bindings, geometry, and layouts belong to the SVGs.
  const families = [
    "nes",
    "famicom",
    "snes",
    "superfamicom",
    "n64",
    "gcn",
    "wii",
    "wiinunchuk",
    "wiiclassic",
    "wiiupro",
    "wiiu",
    "joycon",
    "switchpro",
    "ps",
    "ds2",
    "ds3",
    "ds4",
    "ds5",
    "xbox",
    "x360",
    "xone",
    "xseries",
    "mastersystem",
    "genesis",
    "saturn",
    "dreamcast",
    "steam",
    "steam2",
    "steamdeck",
    "turbografx",
    "playdate",
    "fgc"
  ];
  const names = [
    "button-1",
    "button-2",
    "button-3",
    "button-4",
    "button-left-shoulder-top",
    "button-right-shoulder-top",
    "button-left-shoulder-bottom-digital",
    "button-right-shoulder-bottom-digital",
    "button-select",
    "button-start",
    "stick-1",
    "stick-2",
    "button-dpad-top",
    "button-dpad-bottom",
    "button-dpad-left",
    "button-dpad-right",
    "button-meta",
    "touch-pad",
    "button-c-up",
    "button-c-down",
    "button-c-left",
    "button-c-right",
    "button-mute",
    "trackpad-left",
    "trackpad-right",
    "button-grip-left",
    "button-grip-right",
    "button-grip-left-bottom",
    "button-grip-right-bottom",
    "button-aux-1",
    "button-aux-2",
    "button-left-trigger-click",
    "button-right-trigger-click",
    "crank",
    "button-sl-left",
    "button-sr-left",
    "button-sl-right",
    "button-sr-right",
    "button-volume-down",
    "button-volume-up"
  ];
  const sources = {},
    skins = {},
    guideSymbols = {},
    failures = {};
  const selected = families.includes(requiredSkin) || ["fgc6", "fgc4"].includes(requiredSkin) ? requiredSkin : "xseries";
  const required = ["fgc6", "fgc4"].includes(selected) ? "fgc" : selected;
  await loadFamilies(fixedSkin ? [required] : families);
  if (!skins[selected])
    throw new Error(`Unable to load controller model ${required}.svg.`, {
      cause: failures[required]
    });

  async function loadFamilies(ids) {
    const responses = await Promise.allSettled(
      ids.map(async (id) => {
        const response = await fetch(new URL(`./controllers/${id}.svg`, controllerResourceURL));
        if (!response.ok) throw new Error(`Unable to load ${id}.svg: ${response.status}`);
        return response.text();
      })
    );
    for (const [index, id] of ids.entries()) {
      try {
        if (responses[index].status === "rejected") throw responses[index].reason;
        sources[id] = responses[index].value;
        const svg = new DOMParser().parseFromString(sources[id], "image/svg+xml").documentElement;
        if (svg.localName !== "svg" || svg.querySelector("parsererror") || svg.dataset.controller !== id || !svg.querySelector(".control[data-input]")) throw new Error(`Invalid controller SVG: ${id}.svg`);
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
      } catch (error) {
        delete sources[id];
        delete skins[id];
        failures[id] = error;
        console.warn(`Controller model unavailable: ${id}.svg`, error);
      }
    }
  }

  async function loadGuideSymbol(settings) {
    const skin = skins[settings.skin];
    if (!skin?.guide || settings.customGuide !== "yes" || settings.guideSource === "image") return;
    const symbol = settings.guideSymbol === "original" ? skin.defaultSymbol : settings.guideSymbol;
    const owner = {
      xbox: "xone",
      circle: "xone",
      diamond: "xone",
      star: "xone",
      playstation: "ds3",
      steam: "steam",
      home: "wii"
    }[symbol];
    if (owner && !guideSymbols[symbol] && !skins[owner] && !failures[owner]) await loadFamilies([owner]);
  }

  // Alternate skins reuse source-authored SVG views and their existing controls.
  function register(svg) {
    const id = svg.dataset.controller;
    const controls = [...svg.querySelectorAll(".control[data-input]")];
    for (const symbol of svg.querySelectorAll("[data-guide-symbol]")) {
      guideSymbols[symbol.dataset.guideSymbol] = {
        markup: new XMLSerializer().serializeToString(symbol),
        bounds: symbol.dataset.symbolBounds.split(" ").map(Number)
      };
    }
    skins[id] = {
      id,
      name: svg.dataset.name,
      platform: svg.dataset.platform,
      screen: !!svg.querySelector(".screen-surface"),
      guide: !!svg.querySelector(".guide-logo-slot"),
      defaultSymbol: svg.querySelector(".guide-logo-slot")?.dataset.defaultSymbol,
      shell: !!svg.querySelector(controllerShellSelector),
      highlights: !!svg.querySelector(".shell-highlight"),
      shadows: !!svg.querySelector(".shell-shadow"),
      variants: Object.fromEntries([...svg.querySelectorAll("style[data-variant-id]")].map((node) => [node.dataset.variantId, node.dataset.variantName])),
      buttons: controls
        .filter((node) => !node.dataset.axes && !node.dataset.name.startsWith("button-dpad-"))
        .map((node) => ({ id: Number(node.dataset.input.split(":")[1]), letter: node.dataset.label, analog: node.classList.contains("analog-trigger") })),
      sticks: controls.filter((node) => node.dataset.axes).map((node) => (node.dataset.stickClick === "no" ? [] : [Number(node.dataset.input.split(":")[1])])),
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
    for (const lamp of controller.querySelectorAll(".player-leds-layer .player-indicator")) {
      lamp.setAttribute("x", String((Number(lamp.dataset.player) - 1) * (minimal ? 15 : 8)));
      lamp.setAttribute("width", minimal ? "5" : "3");
      lamp.setAttribute("height", minimal ? "5" : "3");
    }
    const [, , width, height] = viewBox.trim().split(/\s+/).map(Number);
    controller.style.width = `${width}px`;
    controller.style.height = `${height}px`;
    controller.dispatchEvent(new Event("controller-layout"));
    return { width, height };
  }

  function render(id, layout, labels, variant = "original", instance = "") {
    const svg = new DOMParser().parseFromString(sources[id], "image/svg+xml").documentElement;
    svg.setAttribute("data-labels", labels);
    svg.dataset.variant = Object.hasOwn(skins[id].variants, variant) ? variant : "original";
    const serializer = new XMLSerializer(),
      rear = [],
      layers = [];
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
      (shell && control.compareDocumentPosition(shell) & Node.DOCUMENT_POSITION_FOLLOWING ? rear : layers).push(layer);
      control.remove();
    }
    svg.classList.add("controller-background");
    svg.querySelectorAll("[data-name]").forEach((node) => node.removeAttribute("data-name"));
    const mount = document.createElement("div");
    mount.append(...rear, svg, ...layers);
    // Native lamps and Xbox 360's guide ring replace the shared row in full mode.
    const leds = svg.cloneNode(false);
    leds.removeAttribute("id");
    leds.classList.remove("controller-background");
    leds.classList.add("player-leds-layer");
    leds.setAttribute("aria-hidden", "true");
    const [cx, cy, cw, ch] = svg.dataset.compactViewbox.split(" ").map(Number);
    svg.dataset.compactViewbox = `${cx} ${cy - 8} ${cw} ${ch + 8}`;
    const [lx, ly, scale, rotation = 0] = (svg.dataset.playerLeds || "0 0 1").split(" ").map(Number);
    leds.dataset.fullTransform = `translate(${lx} ${ly}) rotate(${rotation}) scale(${scale})`;
    leds.dataset.compactTransform = `translate(${cx + cw / 2 - 25} ${cy - 6.5})`;
    leds.dataset.nativeLeds = String(id === "x360" || !!svg.querySelector(".player-indicator[data-player]"));
    const lamps = document.createElementNS(svg.namespaceURI, "g");
    lamps.classList.add("layout-position", "player-leds");
    lamps.innerHTML = [1, 2, 3, 4].map((lamp) => `<rect class="player-indicator" data-player="${lamp}" x="${(lamp - 1) * 15}" y="0" width="5" height="5"/>`).join("");
    leds.append(lamps);
    mount.append(leds);
    const size = setLayout(mount, layout);
    // Instances must not share clip paths, masks, filters, or their CSS ID selectors.
    if (instance) {
      const ids = new Map([...mount.querySelectorAll("[id]")].map((node) => [node.id, `${instance}-${node.id}`]));
      for (const node of mount.querySelectorAll("*")) {
        if (node.id) node.id = ids.get(node.id);
        for (const attribute of [...node.attributes]) {
          if (attribute.name === "id") continue;
          let value = attribute.value;
          for (const [original, replacement] of ids) {
            value = value.replaceAll(`url(#${original})`, `url(#${replacement})`);
            if (value === `#${original}`) value = `#${replacement}`;
          }
          if (value !== attribute.value) node.setAttribute(attribute.name, value);
        }
        if (node.localName === "style") node.textContent = node.textContent.replace(/#([\w-]+)/g, (match, name) => (ids.has(name) ? `#${ids.get(name)}` : match));
      }
    }
    return {
      ...size,
      markup: [...mount.children].map((node) => serializer.serializeToString(node)).join("")
    };
  }
  return { skins, names, render, setLayout, sources, guideSymbols, loadGuideSymbol };
}

/** Embedded ephemeral input history; capture and teardown belong to this resource. */
(() => {
  /** Read the retired entry-only switch from saved URLs and JSON. */
  function migrateAnimation(values) {
    const legacy = values.get("historyAnimation");
    values.delete("historyAnimation");
    const effect = values.get("history.entrance");
    if (!["slide", "fade", "none"].includes(legacy) || (effect && effect !== "default")) return;
    values.set("history.entrance", { slide: "default", fade: "fadeIn", none: "none" }[legacy]);
    if (legacy === "fade") {
      if (!values.has("history.entranceDuration")) values.set("history.entranceDuration", "140");
      if (!values.has("history.entranceEasing")) values.set("history.entranceEasing", "ease-out");
    }
    if (!values.has("history.matchExit")) values.set("history.matchExit", "no");
  }

  /** Return ordinary resource fields; no input content enters the settings schema. */
  function fields() {
    const section = "Input History";
    const active = { section, when: ["showHistory", "yes"], retainInactive: true };
    const result = {
      showHistory: {
        type: "switch",
        default: "no",
        label: "Show Input History",
        section,
        description: "Available while exactly one controller is displayed.",
        checkedValue: "yes",
        uncheckedValue: "no",
        options: { yes: "On", no: "Off" },
        when: (settings) => !["all-gamepads", "all-inputs"].includes(settings.player),
        retainInactive: true
      },
      historyStyle: { ...active, type: "select", default: "svg", label: "Prompts", options: { svg: "SVG artwork", text: "Plain text" } },
      historyOrientation: { ...active, type: "select", default: "vertical", label: "Orientation", options: { vertical: "Vertical", horizontal: "Horizontal" } },
      historyOrder: { ...active, type: "select", default: "first", label: "Newest entry", options: { first: "First (top / left)", last: "Last (bottom / right)" } },
      historyGroupWindow: { ...active, type: "number", default: 60, label: "Combination window (ms)", min: 0, max: 250, step: 1 },
      historyAggregate: { ...active, type: "switch", default: "yes", label: "Count consecutive presses", checkedValue: "yes", uncheckedValue: "no", options: { yes: "On", no: "Off" } },
      historyPosition: {
        ...active,
        type: "select",
        default: "bottom-left",
        label: "Position",
        subsection: "Size & placement",
        options: { "top-left": "Top left", "top-right": "Top right", "bottom-left": "Bottom left", "bottom-right": "Bottom right", center: "Center" }
      }
    };
    for (const [name, label, value, min, max] of [
      ["Width", "Width (px)", 0, 0, 3840],
      ["Height", "Height (px)", 0, 0, 2160],
      ["Size", "Prompt / text size (px)", 32, 12, 160],
      ["Scale", "Scale (%)", 100, -500, 500],
      ["X", "Horizontal offset (px)", 0, -3840, 3840],
      ["Y", "Vertical offset (px)", 0, -2160, 2160],
      ["Gap", "Entry spacing (px)", 6, 0, 100],
      ["Padding", "Padding (px)", 8, 0, 100],
      ["Opacity", "Opacity (%)", 100, 0, 100]
    ]) {
      const id = `history${name}`;
      result[id] = {
        ...active,
        type: "number",
        default: value,
        label,
        min,
        max,
        step: "any",
        subsection: "Size & placement"
      };
      if (name === "Width" || name === "Height") {
        const fillOrientation = name === "Width" ? "horizontal" : "vertical";
        result[id].description = `0 fills the parent in ${fillOrientation} history and otherwise fits the entries.`;
        result[`${id}Mode`] = {
          ...active,
          type: "switch",
          default: "auto",
          label: "Fill parent",
          subsection: "Size & placement",
          when: (s) => s.showHistory === "yes" && Number(s[id]) === 0 && s.historyOrientation !== fillOrientation,
          checkedValue: "fill",
          uncheckedValue: "auto",
          options: { fill: "Fill parent", auto: "Automatic" }
        };
      }
    }
    for (const [name, label, value] of [
      ["Color", "Text / symbols", "#EEEEEE"],
      ["Background", "Container background", "#11111166"],
      ["EntryColor", "Entry surface", "#111111CC"],
      ["BorderColor", "Entry outline", "#EEEEEE33"]
    ]) {
      result[`history${name}`] = {
        ...active,
        type: "color",
        default: value,
        label,
        maxlength: 9,
        subsection: "Colors"
      };
    }
    return result;
  }

  /**
   * Mount a history, or return null while disabled. Nothing is persisted or transmitted.
   * @param {Object} settings Validated resource settings.
   * @param {HTMLElement} [parent=document.body] Overlay-owned mount.
   * @returns {Object|null} press/release/update/pulse/clear/destroy; destroy releases observers and frames.
   */
  function create(settings, parent = document.body) {
    if (settings.showHistory !== "yes") return null;
    const position = document.createElement("div");
    position.className = "input-history-position";
    position.dataset.position = settings.historyPosition;
    position.style.translate = `${settings.historyX}px ${settings.historyY}px`;
    const root = document.createElement("div");
    root.className = "input-history";
    root.setAttribute("role", "img");
    root.setAttribute("aria-label", "Recent inputs");
    root.dataset.orientation = settings.historyOrientation;
    root.dataset.order = settings.historyOrder;
    const horizontal = settings.historyOrientation === "horizontal";
    if (settings.historyWidth) root.style.width = settings.historyWidth + "px";
    else if (settings.historyWidthMode === "fill") root.style.width = "100%";
    if (settings.historyHeight) root.style.height = settings.historyHeight + "px";
    else if (settings.historyHeightMode === "fill") root.style.height = "100%";
    const scale = settings.historyScale / 100;
    root.style.maxWidth = `calc((100vw - 32px) / ${Math.abs(scale) || 1})`;
    root.style.maxHeight = `calc((100vh - 32px) / ${Math.abs(scale) || 1})`;
    if (scale !== 1) root.style.transform = `scale(${scale})`;
    root.style.transformOrigin = settings.historyPosition === "center" ? "center" : settings.historyPosition.replace("-", " ");
    root.style.opacity = settings.historyOpacity / 100;
    for (const [name, value] of Object.entries({
      size: `${settings.historySize}px`,
      gap: `${settings.historyGap}px`,
      padding: `${settings.historyPadding}px`,
      ink: settings.historyColor,
      background: settings.historyBackground,
      entry: settings.historyEntryColor,
      border: settings.historyBorderColor
    }))
      root.style.setProperty(`--history-${name}`, value);
    position.append(root);
    parent.append(position);
    // Only active controls and mounted rows are retained. The oldest row is always at rows[0].
    const held = new Map();
    const rows = [];
    const events = new AbortController();
    let frame = 0;
    let disposed = false;

    const animateOut = ["history", "historyEntry.children", "historyPrompt", "historyCount"].some((id) => byStream.elementMotion(settings, id, "exit").name !== "none");

    function playDefault(node, phase) {
      const offset = settings.historyOrder === "first" ? -10 : 10;
      const transform = horizontal ? `translateX(${offset}px)` : `translateY(${offset}px)`;
      return node.animate(
        [
          { filter: "opacity(0)", transform },
          { filter: "opacity(1)", transform: "none" }
        ],
        {
          id: "stream-" + phase,
          duration: 140,
          easing: "ease-out",
          composite: "add",
          direction: phase === "exit" ? "reverse" : "normal",
          fill: phase === "exit" ? "forwards" : "backwards"
        }
      );
    }

    /** Retire displaced rows at their last visible position while new rows take their place in the list. */
    function trim() {
      frame = 0;
      if (!rows.length) return;
      const horizontal = settings.historyOrientation === "horizontal";
      const limit = (horizontal ? root.clientWidth : root.clientHeight) - settings.historyPadding * 2;
      if (limit <= 0 || root.clientHeight <= 0 || root.clientWidth <= 0) return clear();
      const sizes = rows.map((row) => (horizontal ? row.node.offsetWidth : row.node.offsetHeight));
      let used = sizes.reduce((sum, size) => sum + size, 0) + Math.max(0, rows.length - 1) * settings.historyGap;
      while (rows.length > 1 && used > limit + 0.5) {
        used -= sizes.shift() + settings.historyGap;
        const oldest = rows.shift();
        if (oldest.slot) {
          Object.assign(oldest.node.style, oldest.slot, { position: "absolute", zIndex: 1 });
          byStream.removeWithMotion(oldest.node, settings, "history", rows.length, playDefault);
        } else oldest.node.remove();
      }
      if (animateOut) {
        for (const row of rows) {
          const node = row.node;
          row.slot = { left: node.offsetLeft + "px", top: node.offsetTop + "px", width: node.offsetWidth + "px", height: node.offsetHeight + "px" };
        }
      }
    }

    /** Coalesce capacity work rather than measuring on each physical input. */
    function scheduleTrim() {
      if (!frame && !disposed) frame = requestAnimationFrame(trim);
    }

    /** Build only the new prompts, keeping the artwork already visible in a growing combo. */
    function appendPrompts(row, tokens) {
      const prompts = document.createDocumentFragment();
      for (const token of tokens) {
        if (row.ids.has(token.id)) continue;
        row.ids.add(token.id);
        const prompt = settings.historyStyle === "svg" ? token.prompt?.() : null;
        const cap = document.createElement("span");
        cap.className = "history-prompt";
        cap.title = token.label;
        if (prompt) {
          prompt.setAttribute("aria-label", token.label);
          cap.append(prompt);
        } else cap.textContent = token.label;
        prompts.append(cap);
      }
      row.prompts.append(prompts);
      scheduleTrim();
    }

    /** Buttons first seen in the same poll share a timestamp and a single history entry. */
    function record(source, pressed) {
      if (!pressed.length || disposed || document.hidden) return;
      const now = performance.now();
      const last = rows.at(-1);
      const modifiers = [...held.values()].filter((input) => input.modifier && input.source === source);
      const tokens = [...modifiers, ...pressed];
      const previous = last ? [...last.ids] : [];
      const overlap = previous.some((id) => held.has(id));
      const modifierRow = previous.every((id) => held.get(id)?.modifier);
      for (const token of pressed) held.set(token.id, token);
      if (last?.source === source && last.count === 1 && pressed.every((token) => !last.ids.has(token.id)) && ((overlap && now - last.time <= settings.historyGroupWindow) || modifierRow)) {
        appendPrompts(last, tokens);
        return;
      }
      if (settings.historyAggregate === "yes" && last?.source === source && last.ids.size === tokens.length && tokens.every((token) => last.ids.has(token.id))) {
        last.count++;
        last.time = now;
        const count = last.node.querySelector(".history-count");
        count.textContent = `×${last.count}`;
        scheduleTrim();
        return;
      }
      const node = document.createElement("div");
      node.className = "history-entry";
      const prompts = document.createElement("span");
      prompts.className = "history-prompts";
      const count = document.createElement("b");
      count.className = "history-count";
      node.append(prompts, count);
      const row = { node, prompts, ids: new Set(), source, count: 1, time: now };
      appendPrompts(row, tokens);
      rows.push(row);
      if (settings.historyOrder === "first") root.prepend(node);
      else root.append(node);
      if (rows.length === 1) window.byStreamResource.playEntrance?.(root, false);
      byStream.enterListItem(node, settings, "history", animateOut && rows.length > 1, playDefault);
    }

    /** Record an individual press between snapshots. */
    function press(token) {
      if (!held.has(token.id)) record(token.source, [token]);
    }

    /** Release one physical ID; no recorded text or release log is retained. */
    function release(id) {
      held.delete(id);
    }

    /** Diff a source's current digital state using the caller's existing polling loop. */
    function update(source, tokens) {
      const next = new Set(tokens.map((token) => token.id));
      for (const [id, token] of held) if (token.source === source && !next.has(id)) release(id);
      record(
        source,
        tokens.filter((token) => !held.has(token.id))
      );
    }

    /** Record one instantaneous wheel/directional action. */
    function pulse(token) {
      press(token);
      release(token.id);
    }

    /** Remove all displayed and active input data, including pending layout work. */
    function clear() {
      cancelAnimationFrame(frame);
      frame = 0;
      held.clear();
      rows.length = 0;
      for (const animation of root.getAnimations({ subtree: true })) animation.cancel();
      root.replaceChildren();
    }

    /** End this overlay-owned history's lifetime; safe to call more than once. */
    function destroy() {
      if (disposed) return;
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      events.abort();
      held.clear();
      rows.length = 0;
      const exits = window.byStreamResource.playExit?.(root) || [];
      if (exits.length) Promise.allSettled(exits.map((motion) => motion.finished)).then(() => position.remove());
      else position.remove();
    }

    const observer = new ResizeObserver(scheduleTrim);
    observer.observe(root);
    if (settings.source !== "helper") {
      window.addEventListener("blur", () => held.clear(), { signal: events.signal });
      document.addEventListener(
        "visibilitychange",
        () => {
          if (document.hidden) held.clear();
        },
        { signal: events.signal }
      );
    }
    window.addEventListener(
      "pagehide",
      (event) => {
        if (event.persisted) clear();
        else destroy();
      },
      { signal: events.signal }
    );
    return { press, release, update, pulse, clear, destroy };
  }

  byStream.inputHistory = { fields, create, migrateAnimation };
})();
