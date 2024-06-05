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
			window.addEventListener("gamepadconnected", gamepadSupport.onGamepadConnect, false);
			window.addEventListener("gamepaddisconnected", gamepadSupport.onGamepadDisconnect, false);
			window.addEventListener("keydown", gamepadSupport.onKeyboardConnect, false);
			gamepadSupport.startPolling();
		}
	},

	onKeyboardConnect: function (event) {
		if (!gamepadSupport.kb && event.type === "keydown" && event.key === "f") {
			gamepadSupport.kb = true;
			gamepadSupport.gamepads[9] = settingsKB;
			function kbKeyDown(event) {
				if (settingsKB.buttons.includes(event.key)) console.log(`press ${event.key}=${settingsKB.buttons.indexOf(event.key)}`);
				if (settingsKB.axesBtn.includes(event.key)) console.log(`press ${event.key}=${settingsKB.buttons.indexOf(event.key)}`);
			}
			document.addEventListener("keydown", kbKeyDown, false);
			function kbKeyUp(event) {
				if (settingsKB.buttons.includes(event.key)) console.log(`release ${event.key}=${settingsKB.buttons.indexOf(event.key)}`);
				if (settingsKB.axesBtn.includes(event.key)) console.log(`release ${event.key}=${settingsKB.buttons.indexOf(event.key)}`);
			}
			document.addEventListener("keyup", kbKeyUp, false);
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
					if (controllerRebinds?.mapping?.length > 0) {
						const remapObj = $.extend(true, {}, rawGamepads[i]);
						for (let b = 0; b < remapObj.buttons.length; b++) remapObj.buttons[b] = $.extend({}, rawGamepads[i].buttons[b]);

						controllerRebinds.mapping.forEach((bindmap) => {
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

	updateDisplay: function (gamepadId) {
		if (pnumber === "") {
			const gamepadRaw = gamepadSupport.gamepadsRaw[gamepadId];
			for (const b in gamepadRaw.buttons) tester.updateRawButton(gamepadRaw.buttons[b], gamepadId, b);
			for (const a in gamepadRaw.axes) tester.updateRawAxis(gamepadRaw.axes[a], gamepadId, a);
		}

		const gamepad = gamepadSupport.gamepads[gamepadId];

		tester.updateButton(gamepad.buttons[0], gamepadId, "button-1");
		tester.updateButton(gamepad.buttons[1], gamepadId, "button-2");
		tester.updateButton(gamepad.buttons[2], gamepadId, "button-3");
		tester.updateButton(gamepad.buttons[3], gamepadId, "button-4");

		tester.updateButton(gamepad.buttons[4], gamepadId, "button-left-shoulder-top");
		tester.updateTrigger(gamepad.buttons[6], gamepadId, "button-left-shoulder-bottom");
		tester.updateTriggerDigital(gamepad.buttons[6], gamepadId, "button-left-shoulder-bottom-digital");
		tester.updateButton(gamepad.buttons[5], gamepadId, "button-right-shoulder-top");
		tester.updateTrigger(gamepad.buttons[7], gamepadId, "button-right-shoulder-bottom");
		tester.updateTriggerDigital(gamepad.buttons[7], gamepadId, "button-right-shoulder-bottom-digital");

		tester.updateButton(gamepad.buttons[8], gamepadId, "button-select");
		tester.updateButton(gamepad.buttons[9], gamepadId, "button-start");
		tester.updateButton(gamepad.buttons[10], gamepadId, "stick-1");
		tester.updateButton(gamepad.buttons[11], gamepadId, "stick-2");

		tester.updateButton(gamepad.buttons[12], gamepadId, "button-dpad-top");
		tester.updateButton(gamepad.buttons[13], gamepadId, "button-dpad-bottom");
		tester.updateButton(gamepad.buttons[14], gamepadId, "button-dpad-left");
		tester.updateButton(gamepad.buttons[15], gamepadId, "button-dpad-right");
		tester.updateButton(gamepad.buttons[16], gamepadId, "button-meta");
		tester.updateButton(gamepad.buttons[17], gamepadId, "touch-pad");

		tester.updateStick(gamepad.buttons[12], "up", gamepadId, "arcade-stick");
		tester.updateStick(gamepad.buttons[13], "down", gamepadId, "arcade-stick");
		tester.updateStick(gamepad.buttons[14], "left", gamepadId, "arcade-stick");
		tester.updateStick(gamepad.buttons[15], "right", gamepadId, "arcade-stick");

		tester.updateAxis(gamepad.axes[0], gamepad.axes[1], gamepadId, "stick-1");
		tester.updateAxis(gamepad.axes[2], gamepad.axes[3], gamepadId, "stick-2");

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
