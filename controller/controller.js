/**
 * File: controller/controller.gamepad.js
 * @file Gamepad integration placeholder; this file currently contains no implementation.
 * Deps: None.
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
      settingsKB.buttons.fill(0);
      settingsKB.axes.fill(0);
    });
    this.startPolling();
  },
  onKeyboardConnect(event) {
    if (gamepadSupport.kb || event.keyCode !== 70) return;
    gamepadSupport.kb = true;
    document.addEventListener("keydown", tester.updateInputKB);
    document.addEventListener("keyup", tester.updateInputKB);
    tester.updateInputKB(event);
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
      this.gamepads[pad.index] = controllerCustomMapping.mapping.length ? remapGamepad(pad) : pad;
    }
    if (this.kb) this.gamepads[9] = this.gamepadsRaw[9] = settingsKB;
    const changed = Object.keys(previous).join() !== Object.keys(this.gamepads).join() || Object.keys(this.gamepads).some((index) => previous[index]?.id !== this.gamepads[index].id);
    if (changed) {
      tester.updateGamepads(this.gamepads);
      document.dispatchEvent(new CustomEvent("controller-connections", { detail: this.gamepadsRaw }));
    }
  },
  updateDisplay(index) {
    const pad = this.gamepads[index];
    const player = index === 9 ? 9 : index + 1;
    if (!document.getElementById("gamepad-" + player)) return;
    const buttons = [
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
      "touch-pad"
    ];
    buttons.forEach((name, id) => tester.updateButton(pad.buttons[id], player, name, id === 6 || id === 7 ? tester.DIGITAL_THRESHOLD : tester.ANALOGUE_BUTTON_THRESHOLD));
    tester.updateTrigger(pad.buttons[6], player, "button-left-shoulder-bottom");
    tester.updateTrigger(pad.buttons[7], player, "button-right-shoulder-bottom");
    ["up", "down", "left", "right"].forEach((direction, id) => tester.updateStick(pad.buttons[12 + id], direction, player, "arcade-stick"));
    tester.updateAxis(pad.axes[0] ?? 0, pad.axes[1] ?? 0, player, "stick-1");
    tester.updateAxis(pad.axes[2] ?? 0, pad.axes[3] ?? 0, player, "stick-2");
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
  STICK_OFFSET: 20,
  STICK_CURVING: false,
  TRIGGER_DISPLAY_TYPE: 1,
  ANALOGUE_BUTTON_THRESHOLD: 0.25,
  ANALOGUE_STICK_THRESHOLD: 0.25,
  DIGITAL_THRESHOLD: 0.1,
  ROTATE_BOUNDARY: 120,
  keys: new Set(),
  updateGamepads(pads = []) {
    document.querySelectorAll(".controller").forEach((controller) => {
      const player = Number(controller.id.replace("gamepad-", ""));
      controller.classList.toggle("disconnected", !pads[player === 9 ? 9 : player - 1]);
    });
  },
  updateInputKB(event) {
    if (event.type === "keydown") tester.keys.add(event.keyCode);
    else tester.keys.delete(event.keyCode);
    settingsKB.buttons = settingsKB.btns.map((key) => Number(tester.keys.has(key)));
    settingsKB.axes = [0, 1, 2, 3].map((axis) => Number(tester.keys.has(settingsKB.axesBtns[axis * 2 + 1])) - Number(tester.keys.has(settingsKB.axesBtns[axis * 2])));
  },
  updateButton(value, player, name, threshold = this.ANALOGUE_BUTTON_THRESHOLD) {
    document.querySelector(`#gamepad-${player} [data-name="${name}"]`)?.classList.toggle("pressed", buttonValue(value) > threshold);
  },
  updateStick(value, direction, player, name) {
    document.querySelector(`#gamepad-${player} [data-name="${name}"]`)?.classList.toggle(direction, buttonValue(value) > this.ANALOGUE_STICK_THRESHOLD);
  },
  updateTrigger(value, player, name) {
    const trigger = document.querySelector(`#gamepad-${player} [data-name="${name}"]`);
    if (!trigger) return;
    const strength = buttonValue(value);
    trigger.style.opacity = this.TRIGGER_DISPLAY_TYPE ? 1 : strength;
    trigger.style.clipPath = this.TRIGGER_DISPLAY_TYPE ? `inset(${(1 - strength) * 100}% 0 0)` : "none";
  },
  updateAxis(horizontal, vertical, player, name) {
    const stick = document.querySelector(`#gamepad-${player} [data-name="${name}"]`);
    if (!stick) return;
    const active = Math.hypot(horizontal, vertical) >= this.ANALOGUE_STICK_THRESHOLD;
    const x = active ? horizontal * this.STICK_OFFSET : 0;
    const y = active ? vertical * this.STICK_OFFSET : 0;
    stick.style.marginLeft = `${x / 16}rem`;
    stick.style.marginTop = `${y / 16}rem`;
    if (this.STICK_CURVING) stick.style.transform = `rotateX(${-y}deg) rotateY(${x}deg)`;
    const wheel = document.querySelector(`#gamepad-${player} [data-name="${name}-wheel"]`);
    if (wheel) wheel.style.transform = `rotate(${horizontal * this.ROTATE_BOUNDARY}deg)`;
  }
};

// ==========

/**
 * File: controller/controller.js
 * @file Controller configurator integration.
 * Deps: jQuery 4, embedded keyboard settings and Gamepad integration.
 * @author mateus@byuwur.co (Andres Trujillo Mateus)
 */
const parameterRules = {
  player: { options: ["1", "2", "3", "4", "9"] },
  skin: { options: ["1", "2", "3", "4"] },
  opacity: { type: "number", min: 0, max: 1 },
  offset: { type: "number", min: 0, max: Infinity },
  deadzone: { type: "number", min: 0, max: 1 },
  strength: { options: ["0"] },
  curve: { options: ["1"] },
  rotation: { type: "number", min: 0, max: Infinity }
};

const allowedControllers = { 1: "xbox", 2: "ps", 3: "fight-stick", 4: "gc" };
const playerNumber = parameterValue("player", "1");
let controllerCustomMapping = bindingSettings(params.get("mapping"));

/** Invalid mapping input leaves the standard gamepad layout active. */
function bindingSettings(value) {
  try {
    const result = JSON.parse(value || '{"mapping":[]}');
    return result && Array.isArray(result.mapping) ? { mapping: result.mapping.filter((binding) => binding && ["buttons", "axes", "dpad"].includes(binding.targetType)) } : { mapping: [] };
  } catch {
    return { mapping: [] };
  }
}
function buttonValue(button) {
  return Number(button?.value ?? button ?? 0);
}
/** Gamepad properties are browser accessors, so copy their values explicitly. */
function copyGamepad(pad) {
  return {
    id: pad.id,
    index: pad.index,
    buttons: Array.from(pad.buttons, (button) => ({ value: buttonValue(button), pressed: buttonValue(button) > 0.25 })),
    axes: Array.from(pad.axes)
  };
}
function sourceValue(binding, pad) {
  if (!binding) return 0;
  if (binding.choiceType === "buttons") return buttonValue(pad.buttons[binding.choice]);
  const value = pad.axes[binding.choice] ?? 0;
  if (binding.choiceOperand === "+") return Math.max(0, value);
  if (binding.choiceOperand === "-") return Math.max(0, -value);
  return value;
}
/** Reads every binding from the original pad; mappings never alter another binding's source. */
function remapGamepad(pad) {
  const result = copyGamepad(pad);
  for (const binding of controllerCustomMapping.mapping) {
    if (!binding || !["buttons", "axes", "dpad"].includes(binding.targetType)) continue;
    if (binding.targetType === "dpad") {
      const value = sourceValue(binding, pad);
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
    if (!Number.isInteger(target) || target < 0 || target >= (binding.targetType === "buttons" ? 18 : 4)) continue;
    let value = 0;
    if (!binding.disabled) {
      value = binding.targetType === "axes" && !binding.axesConfig ? sourceValue(binding.positive, pad) - sourceValue(binding.negative, pad) : sourceValue(binding.choiceType ? binding : binding.positive, pad);
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

function initController() {
  const template = document.getElementById("controller-artwork");
  document.querySelectorAll(".controller").forEach((controller) => {
    controller.append(template.content.cloneNode(true));
    controller.classList.remove("xbox");
    controller.classList.add(allowedControllers[parameterValue("skin", "1")]);
    controller.style.opacity = parameterValue("opacity", 1);
  });
  for (const [name, property] of [
    ["offset", "STICK_OFFSET"],
    ["deadzone", "ANALOGUE_STICK_THRESHOLD"],
    ["rotation", "ROTATE_BOUNDARY"]
  ]) {
    tester[property] = parameterValue(name, tester[property]);
  }
  tester.TRIGGER_DISPLAY_TYPE = params.get("strength") === "0" ? 0 : 1;
  tester.STICK_CURVING = params.get("curve") === "1";
  const active = document.getElementById("gamepad-" + playerNumber);
  active.classList.add("active");
  active.querySelector(".quadrant").classList.add("p" + (playerNumber === "9" ? 9 : Number(playerNumber) - 1));
  function fitController() {
    const margin = parseFloat(getComputedStyle(document.documentElement).fontSize) * 0.5;
    const scale = Math.max(0, Math.min((innerHeight - margin * 2) / active.offsetHeight, innerWidth / active.offsetWidth));
    active.style.transform = `translate(-50%, -50%) scale(${scale})`;
  }
  fitController();
  window.addEventListener("resize", fitController);
  tester.updateGamepads();
}

gamepadSupport.init();
if (streamOverlay) initController();
