/**
 * File: configurator.js
 * @file Shared URL generation, preview, help, theme, navigation, and color-picker controls.
 * Deps: jQuery 4, Bootstrap 5, resource parameter rules and embedded initialization.
 */
// Shared configurator UI. Renderer settings and parameter rules remain owned by each resource.
/**
 * Validates the form, updates its overlay URL, and schedules the preview refresh.
 * @returns {boolean} Whether every field passed validation.
 */
function generateURL() {
  const valid = fields.map(validField).every(Boolean);
  if (!valid) {
    document.getElementById("overlay-url").value = "";
    document.getElementById("preview-url").removeAttribute("href");
    document.getElementById("copy-url").disabled = true;
    updateOverlayPreview(null);
    return false;
  }
  const tool = document.querySelector(".tool-switcher").dataset.tool;
  const url = new URL(`${tool}.html`, window.location.href);
  url.hash = "";
  url.search = new URLSearchParams(new FormData(form)).toString();
  document.getElementById("overlay-url").value = url.href;
  document.getElementById("preview-url").href = url.href;
  document.getElementById("copy-status").textContent = "";
  document.getElementById("copy-url").disabled = false;
  updateOverlayPreview(url.href);
  return true;
}

/**
 * Initializes the shared configurator controls after resource settings and fields are ready.
 * @param {Object} [options={}] Resource-specific help options.
 * @param {Object<string, Array<string>>} [options.parameterDetails={}] Parameter title, default, accepted values, and example.
 * @param {function(HTMLElement, Object<string, string>, Function): void} [options.initResourceHelp] Adds resource-specific help panels.
 */
function initConfigurator({ parameterDetails = {}, initResourceHelp } = {}) {
  const root = document.documentElement;
  if (!root.classList.contains("configure")) return;
  initHelpDialog(parameterDetails, initResourceHelp);
  initTools();
  const cdn = "https://cdn.jsdelivr.net/gh/byuwur/spa.php@main/";
  let theme = "dark";
  try {
    const saved = localStorage.getItem("stream.html.theme");
    if (["light", "dark"].includes(saved)) theme = saved;
  } catch (error) {
    /* Storage can be unavailable for local files. */
  }
  root.setAttribute("data-bs-theme", theme);
  const themeButton = document.getElementById("theme-toggle");
  const themeScript = document.createElement("script");
  themeScript.src = cdn + "_common.js";
  themeScript.onload = () => {
    byCommon.toggleTheme(root, { theme, button: themeButton });
    themeButton.disabled = false;
    $(themeButton).on("click", () => {
      const selected = byCommon.toggleTheme(root, { button: themeButton });
      try {
        localStorage.setItem("stream.html.theme", selected);
      } catch (error) {
        /* The toggle still works without persistence. */
      }
    });
  };
  themeScript.onerror = () => {
    themeButton.title = "Theme controls could not load. Reload when connected.";
  };
  document.head.appendChild(themeScript);

  $("#setup input:not([type=checkbox]), #setup textarea").addClass("form-control");
  $("#setup select").addClass("form-select");
  $("#setup fieldset").addClass("mb-4 border-0 p-0");
  $("#setup legend").addClass("fs-6 fw-semibold border-bottom pb-2 mb-3");
  $("#setup label").addClass("form-label small d-flex flex-column gap-2 w-100 mb-3");
  $("#setup .setup-intro, #setup .setup-help").addClass("small text-body-secondary");
  $("#setup h1").addClass("h3 mb-2");
  $("#setup .form-group").addClass("mb-3");
  $('#setup input[type="checkbox"]').each(function () {
    $(this).addClass("form-check-input ms-0 flex-shrink-0").attr("role", "switch");
    $(this).parent().addClass("form-switch d-flex align-items-center justify-content-between gap-2 ps-0");
    $(this).siblings("label").removeClass("mb-3").addClass("mb-0").attr("for", this.id);
  });
  $("#setup .input-unit").addClass("small text-body-secondary");
  $("#setup .url-field").removeClass("mb-3").addClass("m-0 w-100");
  $("#setup .url-field > span").addClass("visually-hidden");
  $("#setup .url-field input").addClass("font-monospace small");
  $("#setup a:not(.dropdown-item)").addClass("link-body-emphasis");
  $(".config-help article a").addClass("link-body-emphasis");
  initColorPickers();
  const frame = document.getElementById("overlay-preview");
  // Matching the overlay's color scheme keeps the browser's iframe canvas transparent.
  frame.style.colorScheme = "normal";
  const checkerboard = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  checkerboard.setAttribute("aria-hidden", "true");
  checkerboard.classList.add("pe-none");
  checkerboard.innerHTML = `<defs>
    <pattern id="preview-checkerboard" width="32" height="32" patternUnits="userSpaceOnUse">
      <rect width="32" height="32" fill="#d8d8d8" />
      <path d="M0 0h16v16H0zM16 16h16v16H16z" fill="#fff" />
    </pattern>
  </defs><rect width="100%" height="100%" fill="url(#preview-checkerboard)" />`;
  $("#preview-stage").prepend(checkerboard);
  const status = document.getElementById("preview-status");
  let pendingPreview;

  /**
   * Debounces iframe navigation; an invalid URL leaves the last valid preview visible.
   * @param {string|null} url Generated overlay URL, or null when validation fails.
   */
  window.updateOverlayPreview = function (url) {
    clearTimeout(pendingPreview);
    if (!url) {
      status.textContent = "Fix the highlighted parameter to update the preview.";
      return;
    }
    status.textContent = "Changes update automatically. Paste the URL into OBS.";
    if (frame.getAttribute("src") === url) return;
    // Wait until typing pauses so animations do not restart on every keystroke.
    pendingPreview = setTimeout(() => {
      frame.src = url;
    }, 300);
  };
  $(window).on("pagehide", () => {
    clearTimeout(pendingPreview);

  });
  $(window).on("pageshow", () => {

    const output = document.getElementById("overlay-url") || document.getElementById("url-gen-url");
    if (output.value) updateOverlayPreview(output.value);
  });
  if (document.getElementById("overlay-form")) {
    $(form).on("input", generateURL);
    $(form).on("change", generateURL);
    $(form).on("submit", (event) => {
      event.preventDefault();
      generateURL();
      form.reportValidity();
    });
    $(form).on("reset", () => setTimeout(generateURL, 0));
    $("#copy-url").on("click", async () => {
      if (!generateURL()) {
        form.reportValidity();
        return;
      }
      const output = document.getElementById("overlay-url");
      try {
        await navigator.clipboard.writeText(output.value);
        document.getElementById("copy-status").textContent = "Copied!";
      } catch (error) {
        output.focus();
        output.select();
        document.getElementById("copy-status").textContent = "Press Ctrl+C (or Command+C) to copy the selected URL.";
      }
    });
    generateURL();
  }
}

/**
 * Adds native color swatches and HEX text fields while preserving existing alpha and reset defaults.
 */
function initColorPickers() {
  const context = document.createElement("canvas").getContext("2d");
  /**
   * Normalizes a supported CSS color to HEX or HEX8 without discarding alpha.
   * @param {string} value CSS color to normalize.
   * @returns {string|null} Uppercase HEX value, or null when canvas cannot normalize it.
   */
  function colorToHex(value) {
    if (!CSS.supports("color", value)) return null;
    context.fillStyle = "#000000";
    context.fillStyle = value;
    const color = context.fillStyle;
    if (/^#[\da-f]{6}$/i.test(color)) return color.toUpperCase();
    const rgba = color.match(/^rgba?\(([^)]+)\)$/);
    if (!rgba) return null;
    const channels = rgba[1].split(",").map(Number);
    const rgb = channels.slice(0, 3).map(channel => Math.round(channel).toString(16).padStart(2, "0")).join("");
    const alpha = channels.length === 4 && channels[3] < 1
      ? Math.round(channels[3] * 255).toString(16).padStart(2, "0")
      : "";
    return ("#" + rgb + alpha).toUpperCase();
  }
  $('#overlay-form input[data-group="colors"]').each(function () {
    const input = this;
    const jqInput = $(input);
    const initial = colorToHex(input.value);
    if (initial) input.value = input.defaultValue = initial;
    const jqPicker = $("<input>", {
      type: "color",
      class: "form-control form-control-color border-0 p-0",
      "aria-label": (jqInput.closest("label").text().trim() || input.name) + " picker"
    });
    const jqSwatch = $("<span>", { class: "input-group-text p-1" }).append(jqPicker);
    jqInput.wrap('<span class="input-group"></span>').before(jqSwatch);
    jqInput.addClass("font-monospace").attr("placeholder", "#RRGGBB or #RRGGBBAA");
    /**
     * Updates the swatch from the current text value without replacing incomplete input.
     */
    function syncPicker() {
      const hex = colorToHex(input.value);
      if (hex) jqPicker.val(hex.slice(0, 7));
    }
    jqPicker.on("input change", () => {
      const previous = colorToHex(input.value);
      input.value = jqPicker.val().toUpperCase() + (previous?.length === 9 ? previous.slice(7) : "");
      jqInput.trigger("input");
    });
    jqInput.on("input", syncPicker).on("change", () => {
      const hex = colorToHex(input.value);
      if (hex) input.value = hex;
      syncPicker();
    });
    $(input.form).on("reset", () => setTimeout(syncPicker, 0));
    syncPicker();
  });
}

/**
 * Builds the Bootstrap help modal and synchronizes its sections with URL hashes.
 * @param {Object<string, Array<string>>} parameterDetails Resource-specific parameter documentation.
 * @param {function(HTMLElement, Object<string, string>, Function): void} [initResourceHelp] Adds extra help panels and sections.
 */
function initHelpDialog(parameterDetails, initResourceHelp) {
  const dialog = document.createElement("div");
  dialog.className = "config-help modal fade";
  dialog.tabIndex = -1;
  dialog.setAttribute("data-bs-theme", "light");
  dialog.setAttribute("aria-labelledby", "help-title");
  dialog.innerHTML = `<div class="modal-dialog modal-lg modal-dialog-scrollable"><div class="modal-content rounded-0 font-monospace">
		<nav class="d-flex flex-wrap align-items-center gap-2 p-3 bg-dark text-white modal-header flex-shrink-0" aria-label="Help sections">
			<a href="https://byuwur.github.io/" target="_blank" rel="noopener" aria-label="[Mateus] byUwUr"><img src="https://byuwur.github.io/img/logo.png" width="36" height="36" alt="" /></a>
			<button class="btn btn-sm btn-outline-light border-0" type="button" data-section="info">Info</button>
			<button class="btn btn-sm btn-outline-light border-0" type="button" data-section="obs">Use with OBS</button>
			<button class="btn btn-sm btn-outline-light border-0" type="button" data-section="params">Parameters</button>
			<button type="button" class="help-close btn btn-sm btn-outline-light border-0 ms-auto fs-4" aria-label="Close help">&times;</button>
		</nav>
		<header class="p-4 bg-danger text-white flex-shrink-0"><h2 class="h2 m-0" id="help-title"></h2></header>
		<article class="modal-body p-4 overflow-y-auto">
			<section data-panel="info">
				<p>Made by <a href="https://byuwur.github.io/" target="_blank" rel="noopener">[Mateus] byUwUr</a>. Free tools for your stream.</p>
				<p>You can <a href="https://streamlabs.com/byuwur" target="_blank" rel="noopener">tip</a>, <a href="https://twitch.tv/byuwur" target="_blank" rel="noopener">subscribe</a> or <a href="https://paypal.me/byuwur" target="_blank" rel="noopener">donate</a>.</p>
				<p>Download the <a href="https://github.com/byuwur/stream.html" target="_blank" rel="noopener">source code</a> to use the overlays locally. Keep each tool's assets together. Libraries and configurator styling load from jsDelivr and require internet access.</p>
			</section>
			<section data-panel="obs" hidden>
				<ol><li>Adjust the parameters and check the live preview.</li><li>Click <strong>Copy URL</strong>.</li><li>In OBS, add a <strong>Browser</strong> source and paste the link into its <strong>URL</strong> field.</li></ol>
				<p class="help-dimensions"></p>
				<p>For a downloaded overlay, paste the complete <code>file:///</code> URL with <strong>Local file</strong> unchecked. Keep the folder at that location.</p>
				<p>To edit settings later, replace the overlay filename with <code>index.html</code>, keeping the query parameters. Reset restores the settings loaded when you opened the form.</p>
			</section>
			<section data-panel="params" hidden>
				<p>Settings are stored in the generated URL. Use the documented values below; missing values use the tool's defaults. Use public display information only.</p>
				<dl class="help-parameters"></dl>
			</section>
		</article></div></div>`;
  document.body.appendChild(dialog);
  const modal = bootstrap.Modal.getOrCreateInstance(dialog);
  const sectionIcons = { info: "circle-info", obs: "desktop", params: "file-lines" };
  /**
   * Prepends a decorative icon for a help section.
   * @param {HTMLButtonElement} button Section button to decorate.
   */
  function addSectionIcon(button) {
    const icon = document.createElement("i");
    icon.className = "fa-solid fa-" + sectionIcons[button.dataset.section] + " me-1";
    icon.setAttribute("aria-hidden", "true");
    button.prepend(icon);
  }
  dialog.querySelectorAll("[data-section]").forEach(addSectionIcon);
  const preview = document.getElementById("overlay-preview");
  dialog.querySelector(".help-dimensions").textContent = `The preview uses ${preview.width} x ${preview.height} pixels. Use those source dimensions as a starting point and adjust them to your layout.`;
  const parameters = document.createElement("div");
  parameters.className = "help-parameters";
  dialog.querySelector(".help-parameters").replaceWith(parameters);
  for (const [name, rule] of Object.entries(parameterRules)) {
    const field = document.querySelector('#overlay-form [name="' + name + '"]');
    const [title, defaultValue, values, example] = parameterDetails[name] || [field?.closest("label")?.textContent.trim() || name, field?.value || "Empty", rule.options?.join(", ") || (rule.min !== undefined ? rule.min + " to " + rule.max : rule.description), field?.value || ""];
    const definition = document.createElement("section");
    definition.className = "definition border-bottom mb-3 pb-3";
    const heading = document.createElement("h3");
    heading.className = "h4 mb-3";
    heading.textContent = title;
    const key = document.createElement("code");
    key.className = "d-inline-block bg-secondary-subtle text-primary border p-1 ms-2";
    key.textContent = name + "=";
    heading.append(key);
    const code = document.createElement("div");
    code.className = "codeblock bg-black text-white border p-2 mb-3 font-monospace text-break lh-lg";
    code.textContent = configuratorTool + ".html?" + new URLSearchParams({ [name]: example });
    const list = document.createElement("ul");
    list.className = "list-unstyled";
    for (const [label, value] of [["DEFAULT VALUE: ", defaultValue], ["ACCEPTABLE VALUES: ", values], ["", rule.description]]) {
      const item = document.createElement("li");
      const prefix = document.createElement("strong");
      prefix.textContent = label;
      item.append(prefix, value);
      list.append(item);
    }
    definition.append(heading, code, list);
    parameters.append(definition);
  }

  const titles = { info: "Information", obs: "Use with OBS", params: "Parameters" };
  initResourceHelp?.(dialog, titles, closeHelp);

  /**
   * Selects a help panel, resets its scroll, opens the modal, and updates the hash.
   * @param {string} section Key of an existing help section.
   */
  function showSection(section) {
    dialog.querySelector("#help-title").textContent = titles[section];
    dialog.querySelectorAll("[data-panel]").forEach(panel => { panel.hidden = panel.dataset.panel !== section; });
    dialog.querySelectorAll("[data-section]").forEach(button => {
      button.classList.toggle("active", button.dataset.section === section);
      if (button.dataset.section === section) button.setAttribute("aria-current", "page");
      else button.removeAttribute("aria-current");
    });
    dialog.querySelector("article").scrollTop = 0;
    modal.show();
    if (location.hash !== "#" + section) location.hash = section;
  }
  /**
   * Closes the help modal through Bootstrap, retaining its transition and focus handling.
   */
  function closeHelp() { modal.hide(); }
  $(dialog).on("click", "[data-section]", function () { showSection(this.dataset.section); });
  $(dialog).find(".help-close").on("click", closeHelp);
  $(dialog).on("hide.bs.modal", () => {
    if (titles[location.hash.slice(1)]) history.replaceState(null, "", location.pathname + location.search);
  });
  $(dialog).on("shown.bs.modal", () => {
    if (!titles[location.hash.slice(1)]) closeHelp();
  });
  const links = document.createElement("p");
  /**
   * Opens the section selected by the current hash, or closes the modal for other hashes.
   */
  function syncHelpHash() {
    const section = location.hash.slice(1);
    if (titles[section]) showSection(section);
    else closeHelp();
  }
  $(window).on("hashchange", syncHelpHash);
  syncHelpHash();
  links.className = "small m-0";
  for (const [section, title] of Object.entries({ params: "Parameter reference", obs: "Use with OBS", info: "About", ...(titles.remap ? { remap: "Custom Mapping" } : {}) })) {
    if (links.childNodes.length) links.append(" \u00b7 ");
    const link = document.createElement("a");
    link.href = "#" + section;
    link.textContent = title;
    link.addEventListener("click", (event) => {
      event.preventDefault();
      link.focus();
      showSection(section);
    });
    links.appendChild(link);
  }
  $(".footer-links").append(links);
  document.addEventListener("click", (event) => {
    const link = event.target.closest('a[href^="#"]');
    const section = link?.getAttribute("href").slice(1);
    if (!titles[section] || links.contains(link)) return;
    event.preventDefault();
    link.focus();
    showSection(section);
  });

}

/**
 * Builds the tool menu and handles hover, focus, outside clicks, and Escape.
 */
function initTools() {
  const jqSwitcher = $(".tool-switcher");
  const switcher = jqSwitcher[0];
  if (!switcher) return;
  const tools = [
    { folder: "controller", title: "Controller", icon: "gamepad" },
    { folder: "popup", title: "Popup", icon: "comment" },
    { folder: "main", title: "Main scene", icon: "clapperboard" }
  ];
  const base = new URL("../", location.href);
  const jqLinks = jqSwitcher.find("nav");
  tools.forEach(({ folder, title, icon }) => {
    const jqLink = $("<a>", { href: new URL(`${folder}/index.html`, base).href, text: title, class: "dropdown-item py-2" });
    jqLink.prepend($("<i>", { class: `fa-solid fa-${icon} fa-fw me-2`, "aria-hidden": "true" }));
    if (folder === switcher.dataset.tool) jqLink.attr("aria-current", "page").addClass("active");
    jqLinks.append(jqLink);
  });
  jqSwitcher.on("mouseenter", () => {
    if (matchMedia("(hover: hover)").matches) switcher.open = true;
  }).on("mouseleave", () => {
    if (!switcher.contains(document.activeElement)) switcher.open = false;
  }).on("focusout", event => {
    if (!switcher.contains(event.relatedTarget)) switcher.open = false;
  }).on("keydown", event => {
    if (event.key !== "Escape") return;
    event.preventDefault();
    switcher.open = false;
    jqSwitcher.find("summary").trigger("focus");
  });
  $(document).on("click", event => {
    if (!switcher.contains(event.target)) switcher.open = false;
  });
}

const configuratorTool = document.querySelector(".tool-switcher").dataset.tool;
let form, fields;

/**
 * Sets a field's validation message using the active renderer's parameter rules.
 * @param {HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement} field Named form control.
 * @returns {boolean} Whether the control passes custom and native validation.
 */
function validField(field) {
  field.setCustomValidity(validParameter(field.name, field.value) ? "" : "Enter a valid value for this setting.");
  return field.checkValidity();
}

/**
 * Loads a classic script before resolving so callers can initialize its globals in order.
 * @param {string} src Script URL relative to the current document.
 * @returns {Promise<Event>} Resolves on load; rejects on a script loading error.
 */
function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}
