/**
 * File: controller/mapping.js
 * @file Controller input mapping editor; the shared configurator owns settings, URLs, and Reset.
 * Deps: controller resource and the optional shared configurator.js.
 */
(function initControllerMapping() {
  if (window.byConfigurator)
    window.byConfigurator.configureResource = function ({ settings, fields, gamepadSupport, buttonValue, copyGamepad }, { generateURL, initSelect2 }) {
      const $ = window.jQuery;
      if (!$) return;
      $(/* HTML */ `<button type="button" class="btn btn-sm btn-outline-secondary mb-3">Reset image adjustments</button>`)
        .attr("id", "reset-shell-adjustments")
        .appendTo($('[name="shellOpacity"]').closest(".conditional-field"))
        .on("click", () => {
          for (const name of ["shellFit", "shellPositionX", "shellPositionY", "shellScale", "shellRotation", "shellOpacity", "controllerColor", "shellTintStrength", "shellBlendMode"])
            $(`[name="${name}"]`).val(fields[name].default).trigger("input").trigger("change");
        });
      const initialVariant = settings.variant;
      function updateVariants(value = settings.variant) {
        const variants = byControllerArtwork.skins[$("#skin-input").val()]?.variants || {};
        const choices = { original: "Default", ...variants };
        if (Object.keys(variants).length) choices.sequential = "Sequential (all)";
        const select = $('[name="variant"]');
        select.empty();
        for (const [id, label] of Object.entries(choices)) select.append(new Option(label, id, id === initialVariant, id === value));
        select.val(Object.hasOwn(choices, value) ? value : "original").trigger("change.select2");
      }
      $("#skin-input").on("change.controllerVariants", () => updateVariants());
      // Imports retain explicit palettes; Skin edits preserve Default and Sequential (all).
      $("form[data-configurator]").on("change.controllerVariants", "#skin-input", () => updateVariants(settings.variant === "sequential" ? "sequential" : "original"));
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
      const axisNames = ["Left stick - horizontal", "Left stick - vertical", "Right stick - horizontal", "Right stick - vertical"];
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
          if (player < 1 || player > 9) continue;
          $("<option></option>")
            .val(player)
            .text(player === 9 ? "Keyboard" : `Player ${player} - ${pad.id}`)
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
        $(button).text("Listening...");
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
          updateVariants(initialVariant);
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
                </p>
                <p class="small mt-3">Controller SVGs by <a href="https://mimicrymedia.itch.io/controller-pack" target="_blank" rel="noopener">MimicryMedia</a>.</p>`
            );
          $("<button type='button' data-section='remap' class='btn btn-sm btn-outline-light border-0'><i class='fa-solid fa-gamepad me-2' aria-hidden='true'></i>Custom Mapping</button>").insertBefore($(help).find(".help-close"));
          initSelect2($("#player-base"));
          $("#mappings select").each((_, select) => initSelect2(select));
          $(help).on("close hidden.bs.modal", () => cancelCapture());
        }
      };
    };
})();
