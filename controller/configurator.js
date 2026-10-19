/** Controller-only mapping controls; loaded after the shared configurator. */
window.byConfigurator.configureResource = function ({ settings, gamepadSupport, buttonValue, copyGamepad }, { generateURL, initSelect2 }) {
  if (typeof jQuery === "undefined" && !window.jQuery) return console.error("Init controller/configurator.js FAILED. No jQuery found.");
  const $ = window.jQuery;
  // Mapping markup belongs to this editor extension, never to the overlay renderer.
  $(/* HTML */ `
    <section id="remap" hidden="">
      <article>
        <p id="mapping-status">Press a gamepad button or F for keyboard input.</p>
        <p>
          Mapping base:
          <select id="player-base" title="Player">
            <option value="None" selected="">Select controller</option>
            <option value="1" disabled="">1</option>
            <option value="2" disabled="">2</option>
            <option value="3" disabled="">3</option>
            <option value="4" disabled="">4</option>
            <option value="9" disabled="">KB</option>
          </select>
        </p>
        <div id="output-display">
          <div class="raw-outputs template">
            <div>
              <h3>Axes</h3>
              <ul class="axes"></ul>
            </div>
            <div>
              <h3>Buttons</h3>
              <ul class="buttons"></ul>
            </div>
          </div>
        </div>
        <div id="mapping-config">
          <a href="#" id="prepend-mapping" class="map-control">
            <i class="fa fa-plus-circle"></i>
            Add New Mapping
          </a>
          <div class="template">
            <div class="form-group">
              <div class="map-message"></div>
              <input type="radio" name="targetType" value="buttons" title="Buttons" checked="" />
              <input type="radio" name="targetType" value="axes" title="Axes" />
              <input type="radio" name="targetType" value="dpad" title="D-Pad" />
              <input type="checkbox" class="axes-config" value="false" title="Axes configuration" />
              <select name="buttons" title="Buttons">
                <option title="Button 0" value="0">A/Cross</option>
                <option title="Button 1" value="1">B/Circle</option>
                <option title="Button 2" value="2">X/Square</option>
                <option title="Button 3" value="3">Y/Triangle</option>
                <option title="Button 4" value="4">LB/L1</option>
                <option title="Button 5" value="5">RB/R1</option>
                <option title="Button 6" value="6">LT/L2</option>
                <option title="Button 7" value="7">RT/R2</option>
                <option title="Button 8" value="8">Select/Back</option>
                <option title="Button 9" value="9">Start</option>
                <option title="Button 10" value="10">LS/L3</option>
                <option title="Button 11" value="11">RS/R3</option>
                <option title="Button 12" value="12">D-Pad Up</option>
                <option title="Button 13" value="13">D-Pad Down</option>
                <option title="Button 14" value="14">D-Pad Left</option>
                <option title="Button 15" value="15">D-Pad Right</option>
                <option title="Button 16" value="16">PS Button</option>
                <option title="Button 17" value="17">TouchPad Press</option>
              </select>
              <select name="axes" title="Axes">
                <option title="Axis 0" value="0">LS Horizontal</option>
                <option title="Axis 1" value="1">LS Vertical</option>
                <option title="Axis 2" value="2">RS Horizontal</option>
                <option title="Axis 3" value="3">RS Vertical</option>
              </select>
              <input type="checkbox" class="disable-item" value="true" title="Disable" />
              <button data-tooltip="Positive Axis" data-button="positive" data-button-type="remapping" data-object="">Click to Set</button>
              <button data-tooltip="Negative Axis" data-button="negative" data-button-type="remapping" data-object="">Click to Set</button>
              <a title="Add" href="#" class="fa fa-minus-circle del-config"></a>
              <a title="Remove" href="#" class="fa fa-plus-circle add-config"></a>
              <div class="fix-panel fix-axes">
                <span>Fix Type: </span>
                <select name="fix-type" title="Type">
                  <option value="trigger">Trigger (0 to 1)</option>
                  <option value="stick">Stick (-1 to 1)</option>
                </select>
                <button data-tooltip="Lowest Value" data-button="low-value" data-button-type="value">Click to Set Value</button>
                <button data-tooltip="Highest Value" data-button="high-value" data-button-type="value">Click to Set Value</button>
              </div>
              <ul class="fix-panel fix-dpad">
                <li>
                  <span>Up: </span>
                  <button data-button="up" data-button-type="value">Click to Set Value</button>
                </li>
                <li>
                  <span>Down: </span>
                  <button data-button="down" data-button-type="value">Click to Set Value</button>
                </li>
                <li>
                  <span>Left: </span>
                  <button data-button="left" data-button-type="value">Click to Set Value</button>
                </li>
                <li>
                  <span>Right: </span>
                  <button data-button="right" data-button-type="value">Click to Set Value</button>
                </li>
                <li>
                  <span>Up and Right: </span>
                  <button data-button="upright" data-button-type="value">Click to Set Value</button>
                </li>
                <li>
                  <span>Up and Left: </span>
                  <button data-button="upleft" data-button-type="value">Click to Set Value</button>
                </li>
                <li>
                  <span>Down and Right: </span>
                  <button data-button="downright" data-button-type="value">Click to Set Value</button>
                </li>
                <li>
                  <span>Down and Left: </span>
                  <button data-button="downleft" data-button-type="value">Click to Set Value</button>
                </li>
              </ul>
            </div>
          </div>
          <div id="mappings"></div>
          <div class="button-group">
            <button id="apply-mapping">Apply Mapping</button>
          </div>
        </div>
      </article>
    </section>
  `).appendTo("body");
  const initialMapping = JSON.stringify(settings.mapping);
  let capture = null;
  const disabledInputs = new Set();

  function updateRawControllers(pads) {
    disabledInputs.clear();
    $("#output-display > .raw-outputs:not(.template)").remove();
    const jqBase = $("#player-base");
    const selected = jqBase.val();
    jqBase.find("option").prop("disabled", function () {
      return $(this).val() !== "None";
    });
    for (const [index, pad] of Object.entries(pads)) {
      const player = Number(index) === 9 ? 9 : Number(index) + 1;
      const jqOption = jqBase.find(`option[value="${player}"]`);
      if (!jqOption.length) continue;
      jqOption.prop("disabled", false);
      const jqPanel = $(/* HTML */ `<div class="raw-outputs"></div>`)
        .attr("id", `gamepad-map-${player}`)
        .toggleClass("active", selected === String(player))
        .html($(".raw-outputs.template").html())
        .appendTo("#output-display");
      $(/* HTML */ `<h2></h2>`).text(pad.id).prependTo(jqPanel);
      for (const type of ["buttons", "axes"]) {
        pad[type].forEach((value, id) => {
          const shortname = type === "buttons" ? `B${id}` : `Axis ${id}`;
          $(/* HTML */ `<li></li>`)
            .attr({ "data-shortname": shortname, "data-name": `${type === "buttons" ? "button-" : "axis-"}${id}`, "data-info": JSON.stringify({ id: player, type, number: id }), title: shortname })
            .appendTo(jqPanel.find(`.${type}`));
        });
      }
    }
    if (jqBase.find(":selected").prop("disabled")) jqBase.val("None");
    jqBase.trigger("change.select2");
    const connected = Object.keys(pads).length > 0;
    $("#mapping-status").text(connected ? "Select a controller and capture its inputs below." : "Press a gamepad button or F for keyboard input.");
  }

  function updateRawInput(type, value, player, id) {
    const jqItem = $(`#gamepad-map-${player} [data-name="${type === "buttons" ? "button" : "axis"}-${id}"]`);
    if (!jqItem.length) return;
    jqItem.text(value).css("opacity", 0.6 + Math.abs(value) * 0.4);
    if (!capture || capture.player !== player || disabledInputs.has(`${player}:${type}:${id}`)) return;
    const previous = type === "buttons" ? buttonValue(capture.snapshot.buttons?.[id]) : (capture.snapshot.axes?.[id] ?? 0);
    const threshold = type === "buttons" ? 0.25 : settings.deadzone / 100;
    if (capture.mode !== "value" && Math.abs(previous - value) <= threshold) return;
    const typeName = type === "buttons" ? "Button" : "Axis";
    const config = { choiceType: type, choice: id };
    if (type === "axes") config.choiceOperand = value > 0 ? "+" : "-";
    const detail = { gamepad: player, type, typeName, fullname: `${typeName} ${id}${config.choiceOperand ? ` ${config.choiceOperand}` : ""}`, value, config };
    $(capture.button).trigger("GamepadPressed", [detail]);
  }

  $(document).on("controller-connections", (event) => updateRawControllers(event.originalEvent.detail));
  $(document).on("controller-input", (event) => {
    for (const [index, pad] of Object.entries(event.originalEvent.detail)) {
      const player = Number(index) === 9 ? 9 : Number(index) + 1;
      pad.buttons.forEach((button, id) => updateRawInput("buttons", buttonValue(button), player, id));
      pad.axes.forEach((axis, id) => updateRawInput("axes", axis, player, id));
    }
  });
  updateRawControllers(gamepadSupport.gamepadsRaw);

  let mappingRowID = 0;
  const mappingTemplate = $("#mapping-config .template .form-group");
  const mappingID = $("#mapping-config");

  /** Each cloned row needs a distinct radio group; captures stay attached to that row. */
  function createMapEntry() {
    const newMap = mappingTemplate.clone();
    newMap.find("[type=radio]").attr("name", `targetType-${++mappingRowID}`);
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
    if ($.fn.select2) $(this).parent().find("select.select2-hidden-accessible").select2("destroy");
    $(this).parent().remove();
  });

  mappingID.on("click", ".add-config", function (e) {
    e.preventDefault();
    const newMap = createMapEntry();
    $(this).parent().after(newMap);
  });

  function createUIFromMapping(bindings) {
    $.each(bindings, function (key, value) {
      const currentItem = createMapEntry();
      currentItem.find(`[type=radio][value="${value.targetType}"]`).prop("checked", true);
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
        currentItem.find("[data-button=low-value]").attr("data-value", value.axesConfig.lowValue).text(value.axesConfig.lowValue).data("previous-value", value.axesConfig.lowValue);
        currentItem.find("[data-button=high-value]").attr("data-value", value.axesConfig.highValue).text(value.axesConfig.highValue).data("previous-value", value.axesConfig.highValue);
      }
      for (const side of ["positive", "negative"]) {
        if (value[side]) currentItem.find(`[data-button="${side}"]`).attr("data-object", JSON.stringify(value[side]));
      }
      for (const direction of ["up", "down", "left", "right", "upright", "upleft", "downright", "downleft"]) {
        const position = value.positions?.[direction];
        if (position === undefined) continue;
        currentItem.find(`.fix-dpad [data-button="${direction}"]`).attr("data-value", position).text(position).data("previous-value", position);
      }
      setButtonValues(currentItem);
      currentItem.appendTo("#mappings");
    });
  }

  function setButtonValues(currentItem) {
    currentItem.find('[data-object]:not([data-object=""])').each(function () {
      const dataObject = JSON.parse($(this).attr("data-object"));
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
      $(this).text(displayName).data("previous-value", displayName);
    });
  }

  let cancelCapture;

  /** One capture owns monitoring. Starting another cancels the previous listener and timeout. */
  function buttonCapture(jqButton, mode) {
    cancelCapture?.();
    const player = Number($("#player-base").val());
    const pad = gamepadSupport.gamepadsRaw[player === 9 ? 9 : player - 1];
    if (!pad) return jqButton.text("Please select a mapping base above");
    capture = { player, mode: "remapping", snapshot: copyGamepad(pad), button: jqButton[0] };
    let sampledInput;
    let timeout;
    function finish() {
      clearTimeout(timeout);
      jqButton.off("GamepadPressed.capture").text(jqButton.data("previous-value"));
      capture = null;
      cancelCapture = null;
    }
    jqButton.on("GamepadPressed.capture", (event, input) => {
      if (mode === "value") {
        if (!sampledInput) {
          sampledInput = input.config;
          capture.mode = "value";
          jqButton.text("Please hold for 3 seconds...");
          clearTimeout(timeout);
          timeout = setTimeout(finish, 3000);
        }
        if (input.config.choiceType === sampledInput.choiceType && input.config.choice === sampledInput.choice) {
          jqButton.attr("data-value", input.value).data("previous-value", input.value);
        }
      } else {
        const row = jqButton.closest(".form-group");
        const name = row.find(".axes-config").prop("checked") || row.find('[type="radio"]:checked').val() === "dpad" ? `${input.typeName} ${input.config.choice}` : input.fullname;
        jqButton.attr("data-object", JSON.stringify(input.config)).data("previous-value", name);
        finish();
      }
    });
    cancelCapture = finish;
    timeout = setTimeout(finish, 3000);
  }
  $(window).on("pagehide", () => cancelCapture?.());

  mappingID.on("click", "#mappings button", function () {
    const rootThis = $(this);
    const buttonType = rootThis.attr("data-button-type");
    buttonCapture(rootThis, buttonType);
  });

  /** Return only complete bindings and report missing inputs on their own rows. */
  function createMapping() {
    const mapGroup = $("#mappings .form-group");
    mapGroup.find(".map-message").remove();

    function mapMsg(message, jqThis, type) {
      jqThis.prepend(/* HTML */ `<div class="map-message ${type}"><span>${message}</span></div>`);
    }

    const localMapping = [];

    mapGroup.each(function () {
      const btnDisabled = $(this).find(".disable-item").prop("checked");
      const fixAxes = $(this).find(".axes-config").prop("checked");
      const obtType = $(this).find("[type=radio]:checked").val();
      const obTarget = $(this).find(`select[name=${obtType}]`).val();
      let cInfo = $(this).find("button[data-button=positive]").attr("data-object");
      const sendObj = { targetType: obtType, target: obTarget, disabled: btnDisabled };

      if (btnDisabled) {
        mapMsg("Mapping successfully applied!", $(this), "success");
        localMapping.push(sendObj);
        return true;
      }

      if (obtType !== "dpad" && fixAxes && $(this).find('.fix-axes [data-value]:not([data-value=""])').length === 2) {
        sendObj.axesConfig = {
          type: $(this).find(".fix-axes select").val(),
          lowValue: $(this).find(".fix-axes [data-button=low-value]").attr("data-value"),
          highValue: $(this).find(".fix-axes [data-button=high-value]").attr("data-value")
        };
      } else if (obtType !== "dpad" && fixAxes) {
        mapMsg("Please set both values", $(this), "error");
        return true;
      }

      if (typeof cInfo === "undefined" || cInfo === "") {
        mapMsg("Please select a button/axis to map", $(this), "error");
        return true;
      }
      cInfo = JSON.parse(cInfo);
      if (obtType === "buttons") {
        Object.assign(sendObj, cInfo);
      } else if (obtType === "dpad") {
        if ($(this).find(".fix-dpad [data-value]").length < 8) {
          mapMsg("Please fill in all values", $(this), "error");
          return true;
        }
        Object.assign(sendObj, cInfo);
        const positions = {};
        $(this)
          .find(".fix-dpad [data-value]")
          .each(function () {
            positions[$(this).attr("data-button")] = $(this).attr("data-value");
          });
        sendObj.positions = positions;
      } else if (sendObj.axesConfig) {
        Object.assign(sendObj, cInfo);
      } else {
        const cInfo2 = $(this).find("button[data-button=negative]").attr("data-object") || "{}";
        sendObj.positive = cInfo;
        sendObj.negative = JSON.parse(cInfo2);
      }

      mapMsg("Mapping successfully applied!", $(this), "success");
      localMapping.push(sendObj);
    });

    return localMapping;
  }

  $("#output-display").on("contextmenu", "li", function (e) {
    e.preventDefault();
    const configData = JSON.parse($(this).attr("data-info"));
    $(this).toggleClass("disabled");
    const key = `${configData.id}:${configData.type}:${configData.number}`;
    if (disabledInputs.has(key)) disabledInputs.delete(key);
    else disabledInputs.add(key);
  });

  $("#apply-mapping").on("click", function () {
    $("#mapping-input").val(JSON.stringify(createMapping()));
    generateURL();
    $(document).trigger("mapping-applied");
  });

  $("#player-base").on("change", function () {
    const id = $(this).val();
    $(".raw-outputs").removeClass("active");
    $(`#gamepad-map-${id}`).addClass("active");
  });

  $("#mapping-input").on("change", () => {
    cancelCapture?.();
    if ($.fn.select2) $("#mappings select.select2-hidden-accessible").select2("destroy");
    $("#mappings").empty();
    createUIFromMapping(settings.mapping);
    $("#mapping-config").trigger("change");
  });

  $("form[data-configurator]").on("reset", () =>
    setTimeout(() => {
      $("#mapping-input").val(initialMapping);
      generateURL();
      $("#mapping-input").triggerHandler("change");
    }, 0)
  );

  createUIFromMapping(settings.mapping);

  // Help panels and initial settings

  /**
   * Adds controller credits and mapping controls to the shared help modal.
   * @param {HTMLElement} dialog Help modal.
   * @param {Object<string, string>} titles Help section titles.
   * @param {Function} closeHelp Closes the help modal.
   * @returns {void}
   */
  function initControllerHelp(dialog, titles, closeHelp) {
    const jqMapping = $("#remap article");
    if (jqMapping.length) {
      titles.remap = "Custom Mapping";
      $(
        /* HTML */ `<p>
          Controller input is based on <a href="https://github.com/html5rocks/www.html5rocks.com/tree/master/content/tutorials/doodles/gamepad/static/gamepad-tester" target="_blank" rel="noopener">Gamepad.js and Tester.js</a> by Marcin
          Wichary.
        </p>`
      ).appendTo($(dialog).find('[data-panel="info"]'));
      const jqPanel = $(/* HTML */ `<section data-panel="remap" hidden></section>`).append(jqMapping.contents()).appendTo($(dialog).find("article"));
      jqPanel.find("select").addClass("form-select w-auto");
      jqPanel.find("button").addClass("btn btn-outline-secondary btn-sm");
      jqPanel.find("input").addClass("form-check-input");
      jqPanel.find(".form-group").addClass("d-flex flex-wrap gap-2 align-items-center border rounded p-3 my-3");
      jqPanel.find(".map-message").addClass("w-100 small");
      jqPanel.find(".map-control").addClass("btn btn-outline-primary my-3");
      jqPanel.find(".del-config").text("Remove").addClass("btn btn-outline-danger btn-sm");
      jqPanel.find(".add-config").text("Add").addClass("btn btn-outline-secondary btn-sm");
      jqPanel.find(".form-group > input").each(function () {
        const jqLabel = $(/* HTML */ `<label class="small me-2 d-inline-flex align-items-center gap-2"></label>`);
        if (this.type === "checkbox") {
          jqLabel.addClass("form-switch ps-0");
          $(this).attr("role", "switch");
        }
        const title = $(this).attr("title");
        const icon = { Buttons: "fa-gamepad", Axes: "fa-up-down-left-right", "D-Pad": "fa-up-down-left-right", "Axes configuration": "fa-sliders", Disable: "fa-ban" }[title];
        $(this)
          .wrap(jqLabel)
          .after(
            $(/* HTML */ `<span></span>`)
              .text(title)
              .prepend($(/* HTML */ `<i></i>`).addClass(`fa-solid ${icon} me-1`).attr("aria-hidden", "true"))
          );
      });
      initMappingControls(jqPanel);
      $(/* HTML */ `<button type="button" data-section="remap" class="btn btn-sm btn-outline-light border-0"><i class="fa-solid fa-gamepad me-1" aria-hidden="true"></i>Custom Mapping</button>`).insertBefore($(dialog).find(".help-close"));
      $("#remap").remove();
      $(document).on("mapping-applied", closeHelp);
    }
  }

  /**
   * Keeps mapping controls in sync with edits and controller connection events.
   * @param {jQuery} jqPanel Mapping panel.
   * @returns {void}
   */
  function initMappingControls(jqPanel) {
    function mappingOption(option) {
      if (!option.element) return option.text;
      const name = option.element.parentElement.name;
      const icon = { axes: "fa-up-down-left-right", "fix-type": "fa-sliders" }[name] || "fa-gamepad";
      return $(/* HTML */ `<span></span>`).append($(/* HTML */ `<i></i>`).addClass(`fa-solid ${icon} fa-fw me-2`).attr("aria-hidden", "true"), document.createTextNode(option.text));
    }
    const options = { templateResult: mappingOption, templateSelection: mappingOption };
    initSelect2(jqPanel.find("#player-base"), options);
    jqPanel.find("#mapping-config > .template, .raw-outputs.template").addClass("d-none");
    /**
     * Updates mapping visibility and disabled states from the selected options.
     * @returns {void}
     */
    function updateMappingControls() {
      jqPanel.find("#mappings .form-group").each(function () {
        const jqGroup = $(this);
        jqGroup.find("select").each((_, select) => initSelect2(select, options));
        const type = jqGroup.find('input[type="radio"]:checked').val();
        const fixAxes = jqGroup.find(".axes-config").prop("checked");
        const disabled = jqGroup.find(".disable-item").prop("checked");
        jqGroup.children("select").each(function () {
          $(this)
            .toggleClass("d-none", this.name !== type)
            .next(".select2-container")
            .toggleClass("d-none", this.name !== type);
        });
        jqGroup
          .children("button")
          .eq(1)
          .toggleClass("d-none", type !== "axes" || fixAxes);
        jqGroup
          .find(".axes-config")
          .closest("label")
          .toggleClass("d-none", type === "dpad");
        jqGroup.find(".fix-axes").toggleClass("d-none", !fixAxes || type === "dpad");
        jqGroup.find(".fix-dpad").toggleClass("d-none", type !== "dpad");
        jqGroup.find("button").prop("disabled", disabled);
      });
      jqPanel.find(".raw-outputs").each(function () {
        $(this).toggleClass("d-none", !$(this).hasClass("active"));
      });
      jqPanel.find(".button-group").toggleClass("d-none", !jqPanel.find("#mappings").children().length);
    }
    jqPanel.on("change click", updateMappingControls);
    $(document).on("controller-connections", updateMappingControls);
    updateMappingControls();
  }

  return { initResourceHelp: initControllerHelp };
};
