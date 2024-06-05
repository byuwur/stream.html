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
	STICK_OFFSET: 25,
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
	DELAY_TIME_MS: 0,
	updateQueue: new Queue(),
	processQueueCall: 0,

	absDiff: function (a, b) {
		return Math.abs(a - b);
	},

	ifDisabledExists: function (type, id, number) {
		return tester.DISABLED_INPUTS[id]?.[type]?.[number] ?? false;
	},

	init: function () {
		tester.updateGamepads();
	},

	showNotSupported: function () {
		document.querySelector("#no-gamepad-support").classList.add("visible");
	},

	updateGamepads: function (gamepads) {
		let padsConnected = false;
		tester.DISABLED_INPUTS = {};
		for (const i in gamepads ?? []) {
			const gamepad = gamepads[i];
			if (pnumber === "") {
				document.getElementById("player-base").querySelector(`option[value="${i}"]`).disabled = false;
				const newRawMap = document.createElement("div");
				newRawMap.innerHTML = document.querySelector(".raw-outputs.template").innerHTML;
				newRawMap.id = `gamepad-map-${i}`;
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

			const el = document.getElementById(`gamepad-${i}`);
			el.querySelector(".quadrant").classList.add(`p${i}`);
			el.classList.remove("disconnected");
			padsConnected = true;
		}
		if (pnumber === "") {
			document.querySelector(".nocon").classList.toggle("visible", !padsConnected);
			document.querySelector(".pselect").classList.toggle("visible", padsConnected);
			document.querySelector(".pselect select").disabled = !padsConnected;
		}
	},

	queueButton: function (value, gamepadId, id) {
		tester.updateQueue.enqueue([Date.now() + tester.DELAY_TIME_MS, tester.updateButton, [jQuery.extend({}, value), gamepadId, id]]);
		tester.processQueue();
	},

	queueStick: function (value, className, gamepadId, id) {
		tester.updateQueue.enqueue([Date.now() + tester.DELAY_TIME_MS, tester.updateStick, [jQuery.extend({}, value), className, gamepadId, id]]);
		tester.processQueue();
	},

	queueTrigger: function (value, gamepadId, id) {
		tester.updateQueue.enqueue([Date.now() + tester.DELAY_TIME_MS, tester.updateTrigger, [jQuery.extend({}, value), gamepadId, id]]);
		tester.processQueue();
	},

	queueTriggerDigital: function (value, gamepadId, id) {
		tester.updateQueue.enqueue([Date.now() + tester.DELAY_TIME_MS, tester.updateTriggerDigital, [jQuery.extend({}, value), gamepadId, id]]);
		tester.processQueue();
	},

	queueAxis: function (value, valueV, gamepadId, stickId) {
		tester.updateQueue.enqueue([Date.now() + tester.DELAY_TIME_MS, tester.updateAxis, [value, valueV, gamepadId, stickId]]);
		tester.processQueue();
	},

	updateButton: function (value, gamepadId, id) {
		const gamepadEl = document.querySelector(`#gamepad-${gamepadId}`);
		const newValue = value.value ?? value;
		const buttonEl = gamepadEl.querySelector(`[data-name="${id}"]`);
		if (buttonEl) buttonEl.classList.toggle("pressed", newValue > tester.ANALOGUE_BUTTON_THRESHOLD);
	},

	updateStick: function (value, className, gamepadId, id) {
		const gamepadEl = document.querySelector(`#gamepad-${gamepadId}`);
		const newValue = value.value ?? value;
		const buttonEl = gamepadEl.querySelector(`[data-name="${id}"]`);
		if (buttonEl) buttonEl.classList.toggle(className, newValue > tester.ANALOGUE_BUTTON_THRESHOLD);
	},

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

	updateTriggerDigital: function (value, gamepadId, id) {
		const gamepadEl = document.querySelector(`#gamepad-${gamepadId}`);
		const newValue = value.value ?? value;
		const buttonEl = gamepadEl.querySelector(`[data-name="${id}"]`);
		if (buttonEl) buttonEl.classList.toggle("pressed", newValue > tester.DIGITAL_THRESHOLD);
	},

	updateAxis: function (value, valueV, gamepadId, stickId) {
		const gamepadEl = document.querySelector(`#gamepad-${gamepadId}`);
		const stickEl = gamepadEl.querySelector(`[data-name="${stickId}"]`);
		if (stickEl) {
			const offsetValH = value * tester.STICK_OFFSET;
			const offsetValV = valueV * tester.STICK_OFFSET;
			stickEl.style.marginLeft = `${offsetValH}px`;
			stickEl.style.marginTop = `${offsetValV}px`;
			if (tester.STICK_CURVING) stickEl.style.transform = `rotateX(${offsetValV * -1}deg) rotateY(${offsetValH}deg)`;
		}
		const stickRotEL = gamepadEl.querySelector(`[data-name="${stickId}-wheel"]`);
		if (stickRotEL) {
			const rotValH = value * tester.ROTATE_BOUNDARY;
			stickRotEL.style.transform = `rotate(${rotValH}deg)`;
		}
	},

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
					if ((tester.MONITOR_TYPE === "remapping" && tester.absDiff(tester.SNAPSHOT.buttons[buttonId].value, newValue) > tester.ANALOGUE_BUTTON_THRESHOLD) || tester.MONITOR_TYPE === "value") document.querySelectorAll("#mapping-config button").forEach((el) => el.dispatchEvent(gpEvent));
				}
			}
		}
	},

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
					if ((tester.MONITOR_TYPE === "remapping" && tester.absDiff(tester.SNAPSHOT.axes[axisId], newValue) > tester.ANALOGUE_BUTTON_THRESHOLD) || tester.MONITOR_TYPE === "value") document.querySelectorAll("#mapping-config button").forEach((el) => el.dispatchEvent(gpEvent));
				}
			}
		}
	},

	processQueue: function () {
		tester.processQueueCall += 1;
		while (tester.updateQueue.peek() && tester.updateQueue.peek()[0] <= Date.now()) {
			const [, updateFunction, args] = tester.updateQueue.dequeue();
			if (updateFunction === tester.updateStick || updateFunction === tester.updateAxis) updateFunction(...args);
			else updateFunction(args[0], args[1], args[2]);
		}
	}
};
