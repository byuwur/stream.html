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
 * Modified by Christopher R.
 * Improved by [Mateus] byUwUr
 */
const gamepadSupport = {
  TYPICAL_BUTTON_COUNT: 18,
  TYPICAL_AXIS_COUNT: 4,
  ticking: false,
  kb: false,
  gamepads: [],
  gamepadsRaw: [],
  prevRawGamepadTypes: [],
  prevTimestamps: [],

  init: function () {
    const gamepadSupportAvailable = !!navigator.getGamepads || !!navigator.webkitGetGamepads || !!navigator.webkitGamepads || navigator.userAgent.indexOf("Firefox/") !== -1;
    if (gamepadSupportAvailable) {
      window.addEventListener("gamepadconnected", gamepadSupport.onGamepadConnect);
      window.addEventListener("gamepaddisconnected", gamepadSupport.onGamepadDisconnect);
      window.addEventListener("keydown", gamepadSupport.onKeyboardConnect);
      gamepadSupport.startPolling();
    }
  },

  onKeyboardConnect: function (event) {
    if (!gamepadSupport.kb && event.type === "keydown" && event.keyCode === 70) {
      gamepadSupport.kb = true;
      gamepadSupport.gamepads[9] = settingsKB;
      document.addEventListener("keydown", tester.updateInputKB);
      document.addEventListener("keyup", tester.updateInputKB);
      tester.updateGamepads(gamepadSupport.gamepads);
      gamepadSupport.startPolling();
    }
  },

  onGamepadConnect: function (event) {
    for (const i in allowedPlayers)
      if (!gamepadSupport.gamepads[i] && i != 9) {
        gamepadSupport.gamepads[i] = event.gamepad;
        break;
      }
    tester.updateGamepads(gamepadSupport.gamepads);
    gamepadSupport.startPolling();
  },

  onGamepadDisconnect: function (event) {
    gamepadSupport.gamepads = gamepadSupport.gamepads.filter((g) => g.index !== event.gamepad.index);
    if (gamepadSupport.gamepads.length === 0) gamepadSupport.stopPolling();
    tester.updateGamepads(gamepadSupport.gamepads);
  },

  startPolling: function () {
    if (!gamepadSupport.ticking) {
      gamepadSupport.ticking = true;
      gamepadSupport.tick();
    }
  },

  stopPolling: function () {
    gamepadSupport.ticking = false;
  },

  tick: function () {
    gamepadSupport.pollStatus();
    gamepadSupport.scheduleNextTick();
  },

  scheduleNextTick: function () {
    if (gamepadSupport.ticking) window.requestAnimationFrame(gamepadSupport.tick);
  },

  pollStatus: function () {
    gamepadSupport.pollGamepads();
    for (const i in gamepadSupport.gamepads) {
      const gamepad = gamepadSupport.gamepads[i];
      if (gamepad.timestamp && gamepad.timestamp === gamepadSupport.prevTimestamps[i]) continue;
      gamepadSupport.prevTimestamps[i] = gamepad.timestamp;
      gamepadSupport.updateDisplay(i);
    }
  },

  pollGamepads: function () {
    const rawGamepads = navigator.getGamepads ? navigator.getGamepads() : navigator.webkitGetGamepads();
    if (rawGamepads) {
      gamepadSupport.gamepads = [];
      gamepadSupport.gamepadsRaw = [];
      let gamepadsChanged = false;
      for (let i = 0; i < rawGamepads.length; i++) {
        if (typeof rawGamepads[i] !== gamepadSupport.prevRawGamepadTypes[i]) {
          gamepadsChanged = true;
          gamepadSupport.prevRawGamepadTypes[i] = typeof rawGamepads[i];
        }
        if (rawGamepads[i] && i != 9) {
          gamepadSupport.gamepadsRaw[i] = rawGamepads[i];
          gamepadSupport.gamepads[i] = rawGamepads[i];
          if (controllerCustomMapping?.mapping?.length > 0) {
            const remapObj = $.extend(true, {}, rawGamepads[i]);
            for (let b = 0; b < remapObj.buttons.length; b++) remapObj.buttons[b] = $.extend({}, rawGamepads[i].buttons[b]);

            controllerCustomMapping.mapping.forEach((bindmap) => {
              if (bindmap.disabled && bindmap.targetType !== "dpad") setMapping(bindmap, 0, remapObj);
              else bindWrapper(bindmap, remapObj);
            });
            gamepadSupport.gamepads[i] = remapObj;
          }
        }
        if (gamepadSupport.kb || i == 9) {
          gamepadSupport.gamepads[9] = settingsKB;
          gamepadSupport.gamepadsRaw[9] = settingsKB;
        }
      }
      if (gamepadsChanged) tester.updateGamepads(gamepadSupport.gamepads);
    }
  },

  updateDisplay: function (controllerId) {
    const gamepadId = controllerId != 9 ? parseInt(controllerId) : 9;
    const gamepadId_frontend = gamepadId != 9 ? gamepadId + 1 : 9;

    if (playerNumber === "") {
      const gamepadRaw = gamepadSupport.gamepadsRaw[gamepadId];
      for (const b in gamepadRaw.buttons) tester.updateRawButton(gamepadRaw.buttons[b], gamepadId_frontend, b);
      for (const a in gamepadRaw.axes) tester.updateRawAxis(gamepadRaw.axes[a], gamepadId_frontend, a);
    }

    const gamepad = gamepadSupport.gamepads[gamepadId];

    tester.updateButton(gamepad.buttons[0], gamepadId_frontend, "button-1");
    tester.updateButton(gamepad.buttons[1], gamepadId_frontend, "button-2");
    tester.updateButton(gamepad.buttons[2], gamepadId_frontend, "button-3");
    tester.updateButton(gamepad.buttons[3], gamepadId_frontend, "button-4");

    tester.updateButton(gamepad.buttons[4], gamepadId_frontend, "button-left-shoulder-top");
    tester.updateTrigger(gamepad.buttons[6], gamepadId_frontend, "button-left-shoulder-bottom");
    tester.updateTriggerDigital(gamepad.buttons[6], gamepadId_frontend, "button-left-shoulder-bottom-digital");
    tester.updateButton(gamepad.buttons[5], gamepadId_frontend, "button-right-shoulder-top");
    tester.updateTrigger(gamepad.buttons[7], gamepadId_frontend, "button-right-shoulder-bottom");
    tester.updateTriggerDigital(gamepad.buttons[7], gamepadId_frontend, "button-right-shoulder-bottom-digital");

    tester.updateButton(gamepad.buttons[8], gamepadId_frontend, "button-select");
    tester.updateButton(gamepad.buttons[9], gamepadId_frontend, "button-start");
    tester.updateButton(gamepad.buttons[10], gamepadId_frontend, "stick-1");
    tester.updateButton(gamepad.buttons[11], gamepadId_frontend, "stick-2");

    tester.updateButton(gamepad.buttons[12], gamepadId_frontend, "button-dpad-top");
    tester.updateButton(gamepad.buttons[13], gamepadId_frontend, "button-dpad-bottom");
    tester.updateButton(gamepad.buttons[14], gamepadId_frontend, "button-dpad-left");
    tester.updateButton(gamepad.buttons[15], gamepadId_frontend, "button-dpad-right");
    tester.updateButton(gamepad.buttons[16], gamepadId_frontend, "button-meta");
    tester.updateButton(gamepad.buttons[17], gamepadId_frontend, "touch-pad");

    tester.updateStick(gamepad.buttons[12], "up", gamepadId_frontend, "arcade-stick");
    tester.updateStick(gamepad.buttons[13], "down", gamepadId_frontend, "arcade-stick");
    tester.updateStick(gamepad.buttons[14], "left", gamepadId_frontend, "arcade-stick");
    tester.updateStick(gamepad.buttons[15], "right", gamepadId_frontend, "arcade-stick");

    tester.updateAxis(gamepad.axes[0], gamepad.axes[1], gamepadId_frontend, "stick-1");
    tester.updateAxis(gamepad.axes[2], gamepad.axes[3], gamepadId_frontend, "stick-2");

    let extraButtonId = gamepadSupport.TYPICAL_BUTTON_COUNT;
    while (typeof gamepad.buttons[extraButtonId] !== "undefined") extraButtonId++;
    let extraAxisId = gamepadSupport.TYPICAL_AXIS_COUNT;
    while (typeof gamepad.axes[extraAxisId] !== "undefined") extraAxisId++;
  }
};

function bindWrapper(bindmap, remapObj) {
  if (bindmap.targetType === "dpad") dpadPOV(bindmap, remapObj);
  else if (bindmap.axesConfig) fixAxes(bindmap, remapObj);
  else setMapping(bindmap, {}, remapObj);
}

function setMapping(stickObj, setValue, remapObj) {
  switch (typeof setValue) {
    case "number":
      if (stickObj.targetType === "axes") remapObj[stickObj.targetType][stickObj.target] = setValue;
      else remapObj[stickObj.targetType][stickObj.target].value = setValue;
      break;
    case "object":
      if (stickObj.targetType === "axes") remapObj[stickObj.targetType][stickObj.target] = stickToButton(stickObj.positive) - stickToButton(stickObj.negative);
      else remapObj[stickObj.targetType][stickObj.target].value = stickToButton(stickObj);
      break;
  }
}

function stickToButton(stickObj) {
  if (stickObj.choiceType === "buttons") return rawGamepads[i].buttons[stickObj.choice].value;
  else {
    const axisVal = rawGamepads[i].axes[stickObj.choice];
    switch (stickObj.choiceOperand) {
      case "+":
        return axisVal > 0 ? axisVal : 0;
      case "-":
        return axisVal < 0 ? Math.abs(axisVal) : 0;
      default:
        return 0;
    }
  }
}

function fixAxes(stickObj, remapObj) {
  if (stickObj.axesConfig.type != "trigger" || stickObj.axesConfig.type != "stick") return;
  const startValue = +stickObj.axesConfig.lowValue;
  const endValue = +stickObj.axesConfig.highValue;
  const isFlipped = endValue < startValue;
  const zeroOffset = startValue * -1;
  let axisVal = choiceValue(stickObj);
  let newValue = (axisVal + zeroOffset) / (endValue + zeroOffset);
  newValue = isFlipped ? 1 - newValue : newValue;
  if (stickObj.axesConfig.type === "stick") newValue = -1 + newValue * 2;
  setMapping(stickObj, newValue, remapObj);
}

function choiceValue(mapObj) {
  switch (mapObj.choiceType) {
    case "":
      return choiceValue(mapObj.positive);
    case "axes":
      return rawGamepads[i].axes[mapObj.choice];
    case "buttons":
      return rawGamepads[i].buttons[mapObj.choice].value;
    default:
      return 0;
  }
}

function dpadPOV(stickObj, remapObj) {
  function isWithinRange(val, target) {
    return val >= target - 0.001 && val <= target + 0.001;
  }

  const positions = {
    up: 12,
    down: 13,
    left: 14,
    right: 15
  };

  for (const pos in positions) setMapping({ targetType: "buttons", target: positions[pos] }, 0, remapObj);
  if (stickObj.disabled) return;
  const value = choiceValue(stickObj);

  for (const pos in positions) if (isWithinRange(value, stickObj.positions[pos])) setMapping({ targetType: "buttons", target: positions[pos] }, 1, remapObj);

  const diagonals = {
    upright: ["up", "right"],
    downright: ["down", "right"],
    downleft: ["down", "left"],
    upleft: ["up", "left"]
  };

  for (const diag in diagonals)
    if (isWithinRange(value, stickObj.positions[diag]))
      diagonals[diag].forEach((dir) => {
        setMapping({ targetType: "buttons", target: positions[dir] }, 1, remapObj);
      });
}

// ==========

/**
 * File: controller/controller.tester.js
 * @file Controller artwork updates, keyboard state, and raw input capture.
 * Deps: controller.js, controller.keyboard.js, controller DOM.
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
  VISIBLE_THRESHOLD: 0.25,
  STICK_OFFSET: 20,
  STICK_CURVING: 0,
  TRIGGER_DISPLAY_TYPE: 1,
  ANALOGUE_BUTTON_THRESHOLD: 0.25,
  ANALOGUE_STICK_THRESHOLD: 0.25,
  DIGITAL_THRESHOLD: 0.1,
  EVENT_LISTEN: 0,
  MONITOR_ID: "",
  ROTATE_BOUNDARY: 120,
  SNAPSHOT: {},
  MONITOR_TYPE: "",
  DISABLED_INPUTS: {},

  /**
   * Calculates the absolute difference between two input values.
   * @param {number} a First value.
   * @param {number} b Second value.
   * @returns {number} Absolute difference.
   */
  absDiff: function (a, b) {
    return Math.abs(a - b);
  },

  /**
   * Calculates the distance of a stick from its neutral position.
   * @param {number|string} a Horizontal axis value.
   * @param {number|string} b Vertical axis value.
   * @returns {number} Distance from the origin.
   */
  axisDistance: function (a, b) {
    const x = parseFloat(a) * parseFloat(a),
      y = parseFloat(b) * parseFloat(b);
    return Math.sqrt(x + y);
  },

  /**
   * Checks whether an input is disabled for raw mapping capture.
   * @param {string} type Input collection: buttons or axes.
   * @param {number|string} id Gamepad identifier.
   * @param {number|string} number Input index.
   * @returns {boolean} Whether the input is disabled.
   */
  ifDisabledExists: function (type, id, number) {
    return tester.DISABLED_INPUTS[id]?.[type]?.[number] ?? false;
  },

  /**
   * Initializes the controller connection display.
   */
  init: function () {
    tester.updateGamepads();
  },

  /**
   * Refreshes connected-controller artwork and the configurator's raw-input panels.
   * @param {Array<Gamepad>|Object<number, Object>} [gamepads=[]] Connected gamepads, including the keyboard adapter.
   */
  updateGamepads: function (gamepads) {
    let padsConnected = false;
    tester.DISABLED_INPUTS = {};
    for (const index in gamepads ?? []) {
      const i = index != 9 ? parseInt(index) : 9;
      const i_frontend = i != 9 ? i + 1 : 9;
      const gamepad = gamepads[i];
      if (playerNumber === "") {
        document.getElementById("player-base").querySelector(`option[value="${i_frontend}"]`).disabled = false;
        const newRawMap = document.createElement("div");
        newRawMap.innerHTML = document.querySelector(".raw-outputs.template").innerHTML;
        newRawMap.id = `gamepad-map-${i_frontend}`;
        newRawMap.className = "raw-outputs";

        gamepad.buttons.forEach((button, b) => {
          const bEl = document.createElement("li");
          bEl.setAttribute("data-shortname", `B${b}`);
          bEl.setAttribute("data-name", `button-${b}`);
          bEl.setAttribute("data-info", JSON.stringify({ id: i, type: "buttons", number: b }));
          bEl.title = `Button ${b}`;
          newRawMap.querySelector(".buttons").appendChild(bEl);
        });

        gamepad.axes.forEach((axis, a) => {
          const aEl = document.createElement("li");
          aEl.setAttribute("data-shortname", `Axis ${a}`);
          aEl.setAttribute("data-name", `axis-${a}`);
          aEl.setAttribute("data-info", JSON.stringify({ id: i, type: "axes", number: a }));
          aEl.title = `Axis ${a}`;
          newRawMap.querySelector(".axes").appendChild(aEl);
        });

        const nameEl = document.createElement("h2");
        nameEl.innerHTML = gamepad.id;
        newRawMap.insertBefore(nameEl, newRawMap.firstChild);
        document.querySelector("#output-display").appendChild(newRawMap);
      }

      const el = document.getElementById(`gamepad-${i_frontend}`);
      el.querySelector(".quadrant").classList.add(`p${i}`);
      el.classList.remove("disconnected");
      padsConnected = true;
    }
    if (playerNumber === "") {
      document.querySelector(".nocon").classList.toggle("visible", !padsConnected);
      document.querySelector(".pselect").classList.toggle("visible", padsConnected);
      document.querySelector(".pselect select").disabled = !padsConnected;
    }
  },

  /**
   * Updates the keyboard adapter's button and axis state from a keyboard event.
   * @param {KeyboardEvent} event Keydown or keyup event.
   */
  updateInputKB: function (event) {
    const value = event.type === "keydown" ? 1 : 0;
    if (settingsKB.btns.includes(event.keyCode)) {
      const i = settingsKB.btns.indexOf(event.keyCode);
      settingsKB.buttons[i] = value;
    }
    if (settingsKB.axesBtns.includes(event.keyCode)) {
      const axesMap = {
        0: [0, -1], // lsL
        1: [0, 1], // lsR
        2: [1, -1], // lsU
        3: [1, 1], // lsD
        4: [2, -1], // rsL
        5: [2, 1], // rsR
        6: [3, -1], // rsU
        7: [3, 1] // rsD
      };
      const i = settingsKB.axesBtns.indexOf(event.keyCode);
      const [axis, mult] = axesMap[i];
      settingsKB.axes[axis] = value * mult;
    }
  },

  /**
   * Updates a controller button's pressed state using the analogue threshold.
   * @param {number|GamepadButton} value Button reading.
   * @param {number|string} gamepadId Display player identifier.
   * @param {string} id Artwork data-name.
   */
  updateButton: function (value, gamepadId, id) {
    const gamepadEl = document.querySelector(`#gamepad-${gamepadId}`);
    const newValue = value?.value ?? value;
    const buttonEl = gamepadEl.querySelector(`[data-name="${id}"]`);
    if (buttonEl) buttonEl.classList.toggle("pressed", newValue > tester.ANALOGUE_BUTTON_THRESHOLD);
  },

  /**
   * Updates a stick button class using the stick threshold.
   * @param {number|GamepadButton} value Button reading.
   * @param {string} className State class to toggle.
   * @param {number|string} gamepadId Display player identifier.
   * @param {string} id Artwork data-name.
   */
  updateStick: function (value, className, gamepadId, id) {
    const gamepadEl = document.querySelector(`#gamepad-${gamepadId}`);
    const newValue = value.value ?? value;
    const buttonEl = gamepadEl.querySelector(`[data-name="${id}"]`);
    if (buttonEl) buttonEl.classList.toggle(className, newValue > tester.ANALOGUE_STICK_THRESHOLD);
  },

  /**
   * Renders trigger strength as opacity or a clipped height meter.
   * @param {number|GamepadButton} value Trigger reading.
   * @param {number|string} gamepadId Display player identifier.
   * @param {string} id Artwork data-name.
   */
  updateTrigger: function (value, gamepadId, id) {
    const gamepadEl = document.querySelector(`#gamepad-${gamepadId}`);
    const newValue = value.value ?? value;
    const triggerEl = gamepadEl.querySelector(`[data-name="${id}"]`);
    if (!triggerEl) return;
    if (!tester.TRIGGER_DISPLAY_TYPE) triggerEl.style.opacity = newValue;
    else {
      triggerEl.style.opacity = 1;
      const insetValue = `${(-1 + newValue) * -1 * 100 - 0.00001}%`;
      triggerEl.style.clipPath = `inset(${insetValue} 0px 0px 0pc)`;
    }
  },

  /**
   * Updates a trigger's digital pressed state.
   * @param {number|GamepadButton} value Trigger reading.
   * @param {number|string} gamepadId Display player identifier.
   * @param {string} id Artwork data-name.
   */
  updateTriggerDigital: function (value, gamepadId, id) {
    const gamepadEl = document.querySelector(`#gamepad-${gamepadId}`);
    const newValue = value.value ?? value;
    const buttonEl = gamepadEl.querySelector(`[data-name="${id}"]`);
    if (buttonEl) buttonEl.classList.toggle("pressed", newValue > tester.DIGITAL_THRESHOLD);
  },

  /**
   * Applies deadzone, stick travel, curving, and wheel rotation to an axis pair.
   * @param {number} valueH Horizontal axis reading.
   * @param {number} valueV Vertical axis reading.
   * @param {number|string} gamepadId Display player identifier.
   * @param {string} stickId Artwork data-name for the stick.
   */
  updateAxis: function (valueH, valueV, gamepadId, stickId) {
    const gamepadEl = document.querySelector(`#gamepad-${gamepadId}`);
    const stickEl = gamepadEl.querySelector(`[data-name="${stickId}"]`);
    if (stickEl) {
      let offsetValH, offsetValV;
      if (tester.axisDistance(valueH, valueV) >= tester.ANALOGUE_STICK_THRESHOLD) {
        offsetValH = valueH * tester.STICK_OFFSET;
        offsetValV = valueV * tester.STICK_OFFSET;
      } else {
        offsetValH = 0;
        offsetValV = 0;
      }
      stickEl.style.marginLeft = `${offsetValH}px`;
      stickEl.style.marginTop = `${offsetValV}px`;
      if (tester.STICK_CURVING) stickEl.style.transform = `rotateX(${offsetValV * -1}deg) rotateY(${offsetValH}deg)`;
    }
    const stickRotEL = gamepadEl.querySelector(`[data-name="${stickId}-wheel"]`);
    if (stickRotEL) {
      const rotValH = valueH * tester.ROTATE_BOUNDARY;
      stickRotEL.style.transform = `rotate(${rotValH}deg)`;
    }
  },

  /**
   * Updates raw button feedback and emits GamepadPressed while capture is active.
   * @param {number|GamepadButton} value Button reading.
   * @param {number|string} gamepadId Raw-panel player identifier.
   * @param {number} buttonId Button index.
   */
  updateRawButton: function (value, gamepadId, buttonId) {
    const gamepadEl = document.querySelector(`#gamepad-map-${gamepadId}`);
    const newValue = value.value ?? value;
    const buttonEl = gamepadEl.querySelector(`[data-name="button-${buttonId}"]`);
    if (buttonEl) {
      buttonEl.innerHTML = newValue;
      buttonEl.style.opacity = 0.6 + newValue * 0.4;
      if (tester.EVENT_LISTEN) {
        if (tester.MONITOR_ID === gamepadId && !tester.ifDisabledExists("buttons", gamepadId, buttonId)) {
          const gpEvent = new CustomEvent("GamepadPressed", {
            detail: {
              gamepad: gamepadId,
              type: "buttons",
              typeName: "Button",
              fullname: `Button ${buttonId}`,
              value: newValue,
              config: {
                choiceType: "buttons",
                choice: buttonId
              }
            },
            bubbles: true
          });
          if ((tester.MONITOR_TYPE === "remapping" && tester.absDiff(tester.SNAPSHOT.buttons[buttonId].value, newValue) > tester.ANALOGUE_BUTTON_THRESHOLD) || tester.MONITOR_TYPE === "value")
            document.querySelectorAll("#mapping-config button").forEach((el) => el.dispatchEvent(gpEvent));
        }
      }
    }
  },

  /**
   * Updates raw axis feedback and emits GamepadPressed while capture is active.
   * @param {number|Object} value Axis reading, optionally wrapped in a value property.
   * @param {number|string} gamepadId Raw-panel player identifier.
   * @param {number} axisId Axis index.
   */
  updateRawAxis: function (value, gamepadId, axisId) {
    const gamepadEl = document.querySelector(`#gamepad-map-${gamepadId}`);
    const newValue = value.value ?? value;
    const axisEl = gamepadEl.querySelector(`[data-name="axis-${axisId}"]`);
    if (axisEl) {
      axisEl.innerHTML = newValue;
      axisEl.style.opacity = 0.6 + Math.abs(newValue) * 0.4;
      if (tester.EVENT_LISTEN) {
        if (tester.MONITOR_ID === gamepadId && !tester.ifDisabledExists("axes", gamepadId, axisId)) {
          const axisOp = newValue > 0 ? "+" : "-";
          const gpEvent = new CustomEvent("GamepadPressed", {
            detail: {
              gamepad: gamepadId,
              type: "axes",
              typeName: "Axis",
              fullname: `Axis ${axisId} ${axisOp}`,
              value: newValue,
              config: {
                choiceOperand: axisOp,
                choiceType: "axes",
                choice: axisId
              }
            },
            bubbles: true
          });
          if ((tester.MONITOR_TYPE === "remapping" && tester.absDiff(tester.SNAPSHOT.axes[axisId], newValue) > tester.ANALOGUE_STICK_THRESHOLD) || tester.MONITOR_TYPE === "value")
            document.querySelectorAll("#mapping-config button").forEach((el) => el.dispatchEvent(gpEvent));
        }
      }
    }
  }
};

// ==========

/**
 * File: controller/controller.js
 * @file Controller URL settings, input remapping, and configurator integration.
 * Deps: jQuery 4, controller.tester.js, controller.keyboard.js, Gamepad integration.
 */

// URL parameter documentation
const parameterRules = {
  player: { options: ["1", "2", "3", "4", "9"], description: "Gamepad number, or 9 for keyboard input. Defaults to player 1." },
  skin: { options: ["1", "2", "3", "4"], description: "Controller artwork: 1 Xbox, 2 PlayStation, 3 fight stick, 4 GameCube. Defaults to Xbox." },
  scale: { description: "Size multiplier; for example 0.5 renders at half size." },
  opacity: { type: "number", min: 0, max: 1, description: "Opacity, from fully transparent to fully opaque." },
  offset: { description: "Maximum stick travel in pixels." },
  deadzone: { type: "number", min: 0, max: 1, description: "Ignores stick movement below this threshold." },
  strength: { options: ["0"], description: "Set to 0 to disable trigger strength meters." },
  curve: { options: ["1"], description: "Set to 1 to enable curved stick movement." },
  rotation: { description: "Maximum steering-wheel rotation in degrees." },
  mapping: { description: "Custom mapping JSON generated by the Custom Mapping tab." }
};

const gamepadHTML = $("#gamepads .template").html();
$(".controller").append(gamepadHTML);
const mappingTemplate = $("#mapping-config .template .form-group");
const mappingID = $("#mapping-config");

/**
 * Clones a mapping row with its own radio group and initial capture labels.
 * @returns {jQuery} Detached mapping row.
 */
function createMapEntry() {
  const newMap = mappingTemplate.clone();
  newMap.find("[type=radio]").attr("name", "targetType-" + Date.now());
  newMap.find("[type=radio][value=buttons]").prop("checked", true);
  newMap.find("button").data("previous-value", "Click to Set");
  return newMap;
}

$("#prepend-mapping").on("click", function (e) {
  e.preventDefault();
  const newMap = createMapEntry();
  newMap.prependTo("#mappings");
});

mappingID.on("click", ".del-config", function (e) {
  e.preventDefault();
  $(this).parent().remove();
});

mappingID.on("click", ".add-config", function (e) {
  e.preventDefault();
  const newMap = createMapEntry();
  $(this).parent().after(newMap);
});

/**
 * Appends editable mapping rows from an existing mapping object.
 * @param {Object} mappingObj Object containing a mapping array.
 */
function createUIFromMapping(mappingObj) {
  $.each(mappingObj.mapping, function (key, value) {
    const currentItem = createMapEntry();
    if (value.disabled) {
      currentItem.find(".disable-item").prop("checked", true);
    }
    if (value.choiceType) {
      const dataObj = {
        choiceType: value.choiceType,
        choice: value.choice,
        choiceOperand: value.choiceOperand
      };
      currentItem.find("[data-button=positive]").attr("data-object", JSON.stringify(dataObj));
    }
    if (value.targetType) {
      currentItem.find(`select[name=${value.targetType}]`).val(value.target);
    }
    if (value.axesConfig) {
      currentItem.find(".axes-config").prop("checked", true);
      currentItem.find("select[name=fix-type]").val(value.axesConfig.type);
      currentItem.find("[data-button=low-value]").attr("data-value", value.axesConfig.lowValue).html(value.axesConfig.lowValue).data("previous-value", value.axesConfig.lowValue);
      currentItem.find("[data-button=high-value]").attr("data-value", value.axesConfig.highValue).html(value.axesConfig.highValue).data("previous-value", value.axesConfig.highValue);
    }
    setButtonValues(currentItem, value);
    currentItem.appendTo("#mappings");
  });
}

/**
 * Restores captured input names on a mapping row's buttons.
 * @param {jQuery} currentItem Mapping row to update.
 * @param {Object} value Mapping entry associated with the row.
 */
function setButtonValues(currentItem, value) {
  currentItem.find('[data-object]:not([data-object=""])').each(function () {
    const dataObject = $(this).data("object");
    const properNames = {
      axes: "Axis",
      buttons: "Button"
    };
    const displayName =
      currentItem.find(".axes-config").prop("checked") || currentItem.find("input[type=radio][value=dpad]").prop("checked")
        ? `${properNames[dataObject.choiceType]} ${dataObject.choice}`
        : dataObject.choiceOperand
          ? `${properNames[dataObject.choiceType]} ${dataObject.choice} ${dataObject.choiceOperand}`
          : `${properNames[dataObject.choiceType]} ${dataObject.choice}`;
    $(this).html(displayName).data("previous-value", displayName);
  });
}

/**
 * Captures raw input for a mapping button and restores monitoring state after completion or timeout.
 * @param {jQuery} jqThis Capture button.
 * @param {string} mType Capture mode, such as remapping or value.
 */
function buttonCapture(jqThis, mType) {
  const previousVal = jqThis.data("previous-value");
  const basePlayer = $("#player-base").val();
  if (basePlayer === "None") {
    jqThis.html("Please select a mapping base above");
    return;
  }
  tester.EVENT_LISTEN = 1;
  tester.MONITOR_ID = basePlayer;
  tester.MONITOR_TYPE = "remapping";
  tester.SNAPSHOT = $.extend(true, {}, gamepadSupport.gamepadsRaw[basePlayer]);
  for (let b = 0; b < tester.SNAPSHOT.buttons.length; b++) {
    tester.SNAPSHOT.buttons[b] = $.extend({}, gamepadSupport.gamepadsRaw[basePlayer].buttons[b]);
  }

  const eventTimeout = setTimeout(() => {
    tidyUp();
    jqThis.html(previousVal);
  }, 3000);

  /**
   * Stops the current input capture and removes its event listener.
   */
  function tidyUp() {
    tester.EVENT_LISTEN = 0;
    tester.SNAPSHOT = {};
    tester.MONITOR_TYPE = "";
    jqThis.off();
  }

  jqThis.on("GamepadPressed", function (e) {
    const gpEv = e.originalEvent.detail;
    const displayName = jqThis.closest(".form-group").find(".axes-config").prop("checked") || jqThis.closest(".form-group").find("input[type=radio]:checked").val() === "dpad" ? `${gpEv.typeName} ${gpEv.config.choice}` : gpEv.fullname;
    if (basePlayer === gpEv.gamepad) {
      clearTimeout(eventTimeout);
      const configObj = gpEv.config;
      const settingsObject = JSON.stringify(configObj);
      jqThis.off();
      if (mType === "value") {
        tester.MONITOR_TYPE = mType;
        jqThis.html("Please hold for 3 seconds...");
        jqThis.on("GamepadPressed", function (e) {
          const axEv = e.originalEvent.detail;
          if (axEv.config.choiceType === configObj.choiceType && axEv.config.choice === configObj.choice) {
            jqThis.attr("data-value", axEv.value);
            jqThis.data("previous-value", axEv.value);
          }
        });
        setTimeout(() => {
          jqThis.off();
          jqThis.html(jqThis.attr("data-value"));
          tidyUp();
        }, 3000);
      } else {
        jqThis.attr("data-object", settingsObject);
        jqThis.data("previous-value", displayName);
        jqThis.html(displayName);
        tidyUp();
      }
    }
  });
}

mappingID.on("click", "#mappings button", function () {
  const rootThis = $(this);
  const buttonType = rootThis.attr("data-button-type");
  buttonCapture(rootThis, buttonType);
});

/**
 * Collects valid mapping rows and displays row-specific validation feedback.
 * @returns {{mapping: Array<Object>}} Mapping object containing accepted entries.
 */
function createMapping() {
  const mapGroup = $("#mappings .form-group");
  mapGroup.find(".map-message").remove();

  /**
   * Prepends validation feedback to a mapping row.
   * @param {string} message Feedback text.
   * @param {jQuery} jqThis Mapping row.
   * @param {string} type Feedback class, such as error or success.
   */
  function mapMsg(message, jqThis, type) {
    jqThis.prepend(`<div class='map-message ${type}'><span>${message}</span></div>`);
  }

  const localMapping = { mapping: [] };

  mapGroup.each(function () {
    const btnDisabled = $(this).find(".disable-item").prop("checked");
    const fixAxes = $(this).find(".axes-config").prop("checked");
    const obtType = $(this).find("[type=radio]:checked").val();
    const obTarget = $(this).find(`select[name=${obtType}]`).val();
    let cInfo = $(this).find("button[data-button=positive]").attr("data-object");
    const sendObj = { targetType: obtType, target: obTarget, disabled: btnDisabled };

    if (btnDisabled) {
      mapMsg("Mapping successfully applied!", $(this), "success");
      localMapping.mapping.push(sendObj);
      return true;
    }

    if (fixAxes && $(this).find('.fix-axes [data-value]:not([data-value=""])').length === 2) {
      sendObj.axesConfig = {
        type: $(this).find(".fix-axes select").val(),
        lowValue: $(this).find(".fix-axes [data-button=low-value]").attr("data-value"),
        highValue: $(this).find(".fix-axes [data-button=high-value]").attr("data-value")
      };
    } else if (fixAxes) {
      mapMsg("Please set both values", $(this), "error");
      return true;
    }

    if (typeof cInfo === "undefined" || cInfo === "") {
      mapMsg("Please select a button/axis to map", $(this), "error");
      return true;
    }
    cInfo = JSON.parse(cInfo);
    if (obtType === "buttons") {
      $.extend(sendObj, cInfo);
    } else if (obtType === "dpad") {
      if ($(this).find(".fix-dpad [data-value]").length < 8) {
        mapMsg("Please fill in all values", $(this), "error");
        return true;
      }
      $.extend(sendObj, cInfo);
      const positions = {};
      $(this)
        .find(".fix-dpad [data-value]")
        .each(function () {
          positions[$(this).attr("data-button")] = $(this).attr("data-value");
        });
      sendObj.positions = positions;
    } else {
      const cInfo2 = $(this).find("button[data-button=negative]").attr("data-object") || "{}";
      sendObj.positive = cInfo;
      sendObj.negative = JSON.parse(cInfo2);
    }

    mapMsg("Mapping successfully applied!", $(this), "success");
    localMapping.mapping.push(sendObj);
  });

  return localMapping;
}

/**
 * Toggles whether a raw input participates in mapping capture.
 * @param {string} type Input collection: buttons or axes.
 * @param {number|string} number Input index.
 * @param {number|string} gamepad Gamepad identifier.
 */
function inputToggle(type, number, gamepad) {
  if (!tester.ifDisabledExists(type, gamepad, number)) {
    tester.DISABLED_INPUTS[gamepad] = tester.DISABLED_INPUTS[gamepad] || {};
    tester.DISABLED_INPUTS[gamepad][type] = tester.DISABLED_INPUTS[gamepad][type] || {};
    tester.DISABLED_INPUTS[gamepad][type][number] = true;
  } else {
    delete tester.DISABLED_INPUTS[gamepad][type][number];
  }
}

$("#output-display").on("contextmenu", "li", function (e) {
  e.preventDefault();
  const configData = JSON.parse($(this).attr("data-info"));
  $(this).toggleClass("disabled");
  inputToggle(configData.type, configData.number, configData.id);
});

$("#apply-mapping").on("click", function () {
  controllerCustomMapping = createMapping();
  $("#mapping-input").val(JSON.stringify(controllerCustomMapping));
  setURL();
  document.dispatchEvent(new Event("mapping-applied"));
});

$("#export-mapping").on("click", function () {
  $("#map-input").val(JSON.stringify(createMapping())).trigger("keyup");
  window.location = "#generate";
});

/**
 * Reads and decodes a query parameter from the current page.
 * @param {string} name Parameter name.
 * @returns {string} Decoded value, or an empty string when absent.
 */
function getParameterByName(name) {
  const regex = new RegExp("[\\?&]" + name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]") + "=([^&#]*)");
  const results = regex.exec(location.search);
  return results != null ? decodeURIComponent(results[1].replace(/\+/g, " ")) : "";
}

/**
 * Toggles both supplied classes on the matched elements.
 * @param {string|Element|jQuery} elem Elements or selector.
 * @param {string} switchWhat First class to toggle.
 * @param {string} switchTo Second class to toggle.
 */
function switchClass(elem, switchWhat, switchTo) {
  $(elem).toggleClass(switchWhat).toggleClass(switchTo);
}

/**
 * Parses custom mapping JSON; absent input produces an empty mapping.
 * @param {string} paramData Serialized mapping.
 * @returns {Object|undefined} Parsed mapping, or undefined after logging a parse error.
 */
function bindingSettings(paramData) {
  try {
    return JSON.parse(paramData || `{"mapping":[]}`);
  } catch (e) {
    console.error("Unable to parse mapping object.", e);
  }
}

const allowedPlayers = [1, 2, 3, 4, 9]; // P1, P2, P3, P4, KB
const allowedControllers = {
  1: "xbox",
  2: "ps",
  3: "fight-stick",
  4: "gc"
};
const playerNumber = document.documentElement.hasAttribute("data-overlay") ? (allowedPlayers.includes(Number(getParameterByName("player"))) ? getParameterByName("player") : "1") : "";
const skinControl = getParameterByName("skin") !== "" ? allowedControllers[getParameterByName("skin")] : "xbox";
const scaleSize = getParameterByName("scale");
const skinOpacity = getParameterByName("opacity");
const stickOffset = getParameterByName("offset");
const deadzone = getParameterByName("deadzone");
const triggerStrength = getParameterByName("strength");
const stickCurve = getParameterByName("curve");
const rotationStop = getParameterByName("rotation");
const controller = $("#gamepads .controller");
let controllerCustomMapping = bindingSettings(getParameterByName("mapping"));

if (playerNumber !== "" && allowedPlayers.includes(parseInt(playerNumber))) {
  $(".hide-me").remove();
  $("#gamepad-" + playerNumber).toggleClass("active");
  if (skinControl) switchClass("#gamepads .controller", "xbox", skinControl);
  $("html, body").css({
    cssText: "background: transparent !important; overflow: hidden;"
  });
  controller.addClass("half").css({
    transform: `scale(${scaleSize}) translate(-50%,-50%)`,
    "transform-origin": "0 0"
  });
} else {
  $(".hide-me").removeClass("hide-me");
  $("body").addClass("main-content");
  document.documentElement.classList.add("configure");
  if (controllerCustomMapping) createUIFromMapping(controllerCustomMapping);
}
if (skinOpacity) controller.css("opacity", skinOpacity);
if (stickOffset) tester.STICK_OFFSET = parseInt(stickOffset);
if (deadzone) tester.ANALOGUE_STICK_THRESHOLD = parseFloat(deadzone);
if (triggerStrength && triggerStrength == 0) tester.TRIGGER_DISPLAY_TYPE = parseInt(triggerStrength);
if (stickCurve == 1) tester.STICK_CURVING = parseInt(stickCurve);
if (rotationStop) tester.ROTATE_BOUNDARY = parseFloat(rotationStop);

$(".pselect .player").on("change", function () {
  const value = $(this).val();
  const player = $(".player option:selected").text();
  $(".controller").removeClass("active");
  $(`#${value}`).addClass("active");
  $(document).attr("title", player ? `Controller - P${player}` : "Controller");
});

const consoleSelect = $(".console");
consoleSelect.data("previous-value", $("#cselect").val()).toggleClass($("#cselect").val());

consoleSelect.on("change", function () {
  const style = $(this).val();
  const previousValue = $(this).data("previous-value");
  switchClass("#gamepads .controller", previousValue, style);
  switchClass(this, previousValue, style);
  $(this).data("previous-value", $(this).val());
});

const bindBase = $("#player-base");
bindBase.data("previous-value", bindBase.val());

bindBase.on("change", function () {
  const id = $(this).val();
  const previousValue = $(this).data("previous-value");
  switchClass(`#gamepad-map-${id}`, "active", "");
  switchClass(`#gamepad-map-${previousValue}`, "active", "");
  $(this).data("previous-value", $(this).val());
});

const genURL = $("#url-gen-url");
const clipboardAttr = "data-clipboard-text";

/**
 * Serializes the controller form and updates the URL output, copy value, and live preview.
 */
function setURL() {
  const params = `?${$.param($("#url-form [name]").serializeObject())}`;
  const target = new URL("controller.html", window.location.href);
  target.hash = "";
  target.search = params;
  const url = target.href;
  genURL.attr(clipboardAttr, url).attr("title", url).val(url);
  $("#url-gen-full").text(url);
  $("#preview-url").attr("href", url);
  $("#copy-status").text("");
  if (window.updateOverlayPreview) updateOverlayPreview(url);
}

$("#url-gen-copy")
  .add(genURL)
  .on("click", async function () {
    try {
      await navigator.clipboard.writeText(genURL.attr(clipboardAttr));
      $("#url-gen-copy").text("Copied!");
    } catch (error) {
      genURL[0].focus();
      genURL[0].select();
      $("#copy-status").text("Press Ctrl+C / Command+C to copy.");
    }
  })
  .on("mouseleave focusout", function () {
    $("#url-gen-copy").text("Copy URL");
  });

$("#url-gen-reset").on("click", () => {
  $("#url-form")[0].reset();
  setURL();
});

$("#url-form").on("input change", setURL);

/**
 * Serializes named form controls into an object, omitting empty values.
 * @this {jQuery} Form controls or their containing form.
 * @returns {Object<string, string>} Last serialized value for each name.
 */
$.fn.serializeObject = function () {
  return this.serializeArray().reduce((obj, { name, value }) => {
    if (value !== "undefined" && value !== "") obj[name] = value;
    return obj;
  }, {});
};

setURL();

window.onload = function () {
  tester.init();
  gamepadSupport.init();
};
