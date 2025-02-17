$("#year").text(new Date().getFullYear());

const gamepadHTML = $("#gamepads .template").html();
const menuHTML = $("#modal-template .minimenu").html();
$(".controller").append(gamepadHTML);
$(".modal-container:not(#modal-template) .minimenu").append(menuHTML);
$(".modal-container[id]:not(#modal-template)").each(function () {
	const targetId = "#" + $(this).attr("id");
	$(this).find(`.modal .minimenu a[href=${targetId}]`).closest("li").addClass("selected");
});

const mappingTemplate = $("#mapping-config .template .form-group");
const mappingID = $("#mapping-config");

function createMapEntry() {
	const newMap = mappingTemplate.clone();
	newMap.find("[type=radio]").attr("name", "targetType-" + Date.now());
	newMap.find("[type=radio][value=buttons]").prop("checked", true);
	newMap.find("button").data("previous-value", "Click to Set");
	return newMap;
}

$("#prepend-mapping").click(function (e) {
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

function createMapping() {
	const mapGroup = $("#mappings .form-group");
	mapGroup.find(".map-message").remove();

	function mapMsg(message, jqThis, type) {
		jqThis.prepend(`<div class='map-message ${type}'><span>${message}</span></div>`);
	}

	const localMapping = { mapping: [] };

	mapGroup.each(function () {
		const btnDisabled = $(this).find(".disable-item").prop("checked");
		const fixAxes = $(this).find(".axes-config").prop("checked");
		const obtType = $(this).find("[type=radio]:checked").val();
		const obTarget = $(this).find(`select[name=${obtType}]`).val();
		const cInfo = $(this).find("button[data-button=positive]").attr("data-object");
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
});

$("#export-mapping").on("click", function () {
	$("#map-input").val(JSON.stringify(createMapping())).keyup();
	window.location = "#generate";
});

function getParameterByName(name) {
	const regex = new RegExp("[\\?&]" + name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]") + "=([^&#]*)");
	const results = regex.exec(location.search);
	return results != null ? decodeURIComponent(results[1].replace(/\+/g, " ")) : "";
}

function switchClass(elem, switchWhat, switchTo) {
	$(elem).toggleClass(switchWhat).toggleClass(switchTo);
}

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
const playerNumber = getParameterByName("player");
const skinControl = getParameterByName("skin") !== "" ? allowedControllers[getParameterByName("skin")] : "xbox";
const scaleSize = getParameterByName("scale");
const skinOpacity = getParameterByName("opacity");
const stickOffset = getParameterByName("offset");
const deadzone = getParameterByName("deadzone");
const triggerStrength = getParameterByName("strength");
const stickCurve = getParameterByName("curve");
const rotationStop = getParameterByName("rotation");
const controller = $("#gamepads .controller");
const controllerCustomMapping = bindingSettings(getParameterByName("mapping"));

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

consoleSelect.change(function () {
	const style = $(this).val();
	const previousValue = $(this).data("previous-value");
	switchClass("#gamepads .controller", previousValue, style);
	switchClass(this, previousValue, style);
	$(this).data("previous-value", $(this).val());
});

const bindBase = $("#player-base");
bindBase.data("previous-value", bindBase.val());

bindBase.change(function () {
	const id = $(this).val();
	const previousValue = $(this).data("previous-value");
	switchClass(`#gamepad-map-${id}`, "active", "");
	switchClass(`#gamepad-map-${previousValue}`, "active", "");
	$(this).data("previous-value", $(this).val());
});

const genURL = $("#url-gen-url");
const clipboardAttr = "data-clipboard-text";

function setURL() {
	const params = `?${$.param($("#url-form [name]").serializeObject())}`;
	const url = `https://controller.byuwur.co/${params}`;
	genURL.attr(clipboardAttr, url).attr("title", url).text(params);
	$("#url-gen-full").text(url);
}

$("#url-gen-copy")
	.add(genURL)
	.on("click", function () {
		navigator.clipboard.writeText(genURL.attr(clipboardAttr));
		$("#url-gen-copy").text("Copied!");
	})
	.on("mouseleave focusout", function () {
		$("#url-gen-copy").text("Copy");
	});

$("#url-gen-reset").on("click", () => {
	$("#url-form")[0].reset();
	setURL();
});

$("#url-form").on("keyup change", setURL);

$.fn.serializeObject = function () {
	return this.serializeArray().reduce((obj, { name, value }) => {
		if (value !== "undefined" && value !== "") obj[name] = value;
		return obj;
	}, {});
};

window.onload = function () {
	tester.init();
	gamepadSupport.init();
};
