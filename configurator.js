/**
 * File: configurator.js
 * @file Shared page setup, URL generation, preview, help, theme, and navigation.
 * Editor deps: jQuery 4, Bootstrap 5, Pickr, and resource parameter rules.
 */

document.addEventListener("DOMContentLoaded", () => {
  // Mount the page before resource DOMContentLoaded handlers run.
  const isOverlay = () => location.search.length > 1 && !location.hash;
  const markup = document.getElementById(isOverlay() ? "overlay-markup" : "editor-markup");
  if (markup) {
    window.byStreamOverlay = isOverlay();
    document.documentElement.classList.toggle("bywr-configurator", !byStreamOverlay);
    document.documentElement.classList.toggle("configure", !byStreamOverlay);
    if (byStreamOverlay) document.documentElement.setAttribute("data-overlay", "");
    window.addEventListener("hashchange", () => {
      if (byStreamOverlay !== isOverlay()) location.reload();
    });

    // Only one template becomes live DOM; editor and overlay styles stay separate.
    document.querySelectorAll("[data-editor-style]").forEach((style) => {
      style.disabled = byStreamOverlay;
    });
    document.querySelectorAll("[data-renderer-style]").forEach((style) => {
      style.disabled = !byStreamOverlay;
    });
    document.body.append(markup.content.cloneNode(true));
    document.querySelectorAll("body > template").forEach((template) => template.remove());
    if (!byStreamOverlay) document.body.className = "bg-body text-body m-0";
  }
  const form = document.querySelector("form[data-configurator]");
  if (!form) return;
  const fields = $(form).find("[name]").get();
  let pendingPreview, settings, parameterRules;

  // URL generation
  /**
   * Validates the form, updates its overlay URL, and schedules the preview refresh.
   * @returns {boolean} Whether every field passed validation.
   */
  function generateURL() {
    const valid = fields.map(validField).every(Boolean);
    if (!valid) {
      $("#overlay-url, #url-gen-url").val("");
      $("#preview-url").removeAttr("href");
      $("#copy-url, #url-gen-copy").prop("disabled", true);
      updateOverlayPreview(null);
      return false;
    }
    const values = new FormData(form);
    fields.filter((field) => field.type === "checkbox").forEach((field) => values.set(field.name, field.checked ? field.value : field.dataset.uncheckedValue));
    applyConfiguratorParameters(settings, values);
    const url = settingsURL(settings);
    $("#overlay-url, #url-gen-url").attr("title", url.href).val(url.href);
    $("#preview-url").attr("href", url.href);
    $("#copy-url .copy-label, #url-gen-copy .copy-label").text("Copy URL");
    $("#copy-status").text("");
    $("#copy-url, #url-gen-copy").prop("disabled", false);
    updateOverlayPreview(url.href);
    return true;
  }

  // Keep the last valid preview; wait for typing to pause before restarting its animations.
  function updateOverlayPreview(url) {
    clearTimeout(pendingPreview);
    $("#preview-status").text(url ? "Changes update automatically." : "Fix the highlighted parameter to update the preview.");
    if (url && $("#overlay-preview").attr("src") !== url) {
      pendingPreview = setTimeout(() => $("#overlay-preview").attr("src", url), 300);
    }
  }

  async function copyURL() {
    if (!generateURL()) return form.reportValidity();
    const jqOutput = $("#overlay-url, #url-gen-url");
    try {
      await navigator.clipboard.writeText(jqOutput.val());
      $("#copy-url .copy-label, #url-gen-copy .copy-label, #copy-status").text("Copied!");
    } catch {
      jqOutput.trigger("focus").trigger("select");
      $("#copy-status").text("Press Ctrl+C (or Command+C) to copy the selected URL.");
    }
  }

  // Ordered account and schedule editors

  // Repeated in Popup and Main to avoid a platform file. Keep all three lists in sync.
  const configuratorPlatforms = {
    "500px": "500px",
    artstation: "ArtStation",
    bandcamp: "Bandcamp",
    behance: "Behance",
    bilibili: "Bilibili",
    bitbucket: "Bitbucket",
    blogger: "Blogger",
    bluesky: "Bluesky",
    codepen: "CodePen",
    dailymotion: "Dailymotion",
    deezer: "Deezer",
    delicious: "Delicious",
    dev: "DEV Community",
    deviantart: "DeviantArt",
    digg: "Digg",
    discord: "Discord",
    discourse: "Discourse",
    dribbble: "Dribbble",
    ello: "Ello",
    facebook: "Facebook",
    figma: "Figma",
    flickr: "Flickr",
    foursquare: "Foursquare",
    github: "GitHub",
    gitlab: "GitLab",
    goodreads: "Goodreads",
    "google-scholar": "Google Scholar",
    "google-plus": "Google+",
    guilded: "Guilded",
    "hacker-news": "Hacker News",
    hashnode: "Hashnode",
    houzz: "Houzz",
    instagram: "Instagram",
    itunes: "iTunes",
    keybase: "Keybase",
    "ko-fi": "Ko-fi",
    lastfm: "Last.fm",
    letterboxd: "Letterboxd",
    line: "LINE",
    linkedin: "LinkedIn",
    mastodon: "Mastodon",
    medium: "Medium",
    meetup: "Meetup",
    mixcloud: "Mixcloud",
    mixer: "Mixer",
    napster: "Napster",
    odnoklassniki: "Odnoklassniki",
    orcid: "ORCID",
    patreon: "Patreon",
    periscope: "Periscope",
    pinterest: "Pinterest",
    pixiv: "pixiv",
    "product-hunt": "Product Hunt",
    qq: "QQ",
    quora: "Quora",
    ravelry: "Ravelry",
    reddit: "Reddit",
    renren: "Renren",
    researchgate: "ResearchGate",
    "signal-messenger": "Signal",
    skype: "Skype",
    slack: "Slack",
    snapchat: "Snapchat",
    soundcloud: "SoundCloud",
    spotify: "Spotify",
    "stack-overflow": "Stack Overflow",
    steam: "Steam",
    strava: "Strava",
    stumbleupon: "StumbleUpon",
    telegram: "Telegram",
    "tencent-weibo": "Tencent Weibo",
    threads: "Threads",
    tiktok: "TikTok",
    tumblr: "Tumblr",
    twitch: "Twitch",
    twitter: "Twitter",
    unsplash: "Unsplash",
    viadeo: "Viadeo",
    viber: "Viber",
    vimeo: "Vimeo",
    vine: "Vine",
    vk: "VK",
    weixin: "WeChat",
    weibo: "Weibo",
    whatsapp: "WhatsApp",
    "x-twitter": "X",
    xing: "XING",
    yammer: "Yammer",
    yelp: "Yelp",
    youtube: "YouTube",
    zhihu: "Zhihu"
  };

  /**
   * Edits an ordered list; the resource validates entries and the configurator owns URL generation.
   * @param {string} name Hidden form field holding the serialized list.
   * @param {Array<Object>} entries Initial entries, restored on Reset.
   * @param {Object} options Choice labels/key, text field key/label pairs, new entry defaults, and row limit.
   */
  function initEntryEditor(name, entries, { choices, choiceKey, textFields, newEntry, limit = 100 }) {
    const jqOutput = $(form.elements[name]);
    const jqSection = jqOutput.closest("fieldset");
    const jqEditor = jqSection.find(".entry-list");
    const jqAdd = jqSection.find(".add-entry");
    const initial = entries.map((entry) => ({ ...entry }));
    jqOutput.prop("defaultValue", JSON.stringify(initial));

    function updateIcon(jqRow) {
      const choice = jqRow.find("select").val();
      jqRow.find(".entry-icon").attr("class", "entry-icon text-primary fa-fw " + (choiceKey === "platform" ? "fa-brands fa-" + choice : "fa-solid fa-calendar-days"));
    }
    function addRow(entry) {
      const jqRow = $('<div class="entry-row p-2 mb-2 border border-secondary-subtle bg-body-tertiary">').html(`
        <div class="d-flex align-items-center gap-1 mb-1">
          <i class="entry-icon" aria-hidden="true"></i>
          <select class="form-select rounded-0 bg-body-secondary border-secondary-subtle flex-grow-1" aria-label="${choiceKey === "platform" ? "Platform" : "Day"}"></select>
          <div class="btn-group flex-shrink-0" role="group" aria-label="Entry controls">
            <button type="button" class="btn btn-sm btn-outline-primary" data-action="up" aria-label="Move entry up" title="Move up"><i class="fa-solid fa-arrow-up" aria-hidden="true"></i></button>
            <button type="button" class="btn btn-sm btn-outline-primary" data-action="down" aria-label="Move entry down" title="Move down"><i class="fa-solid fa-arrow-down" aria-hidden="true"></i></button>
            <button type="button" class="btn btn-sm btn-outline-primary" data-action="remove" aria-label="Remove entry" title="Remove"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>
          </div>
        </div>`);
      const jqSelect = jqRow.find("select");
      Object.entries(choices).forEach(([value, title]) => jqSelect.append(new Option(title, value)));
      jqSelect.val(entry[choiceKey]);
      updateIcon(jqRow);
      textFields.forEach(([key, title]) => {
        $("<input>", {
          type: "text",
          maxlength: 160,
          "data-field": key,
          "aria-label": title,
          placeholder: title,
          class: "form-control rounded-0 bg-body-secondary border-secondary-subtle mb-1"
        })
          .val(entry[key])
          .appendTo(jqRow);
      });
      return jqRow.appendTo(jqEditor);
    }
    // Serialize the current row order for validation and URL generation.
    function sync() {
      const jqRows = jqEditor.children();
      const values = jqRows
        .map(function (index) {
          const jqRow = $(this);
          jqRow.find('[data-action="up"]').prop("disabled", index === 0);
          jqRow.find('[data-action="down"]').prop("disabled", index === jqRows.length - 1);
          const entry = { [choiceKey]: jqRow.find("select").val() };
          jqRow.find("input").each(function () {
            entry[$(this).data("field")] = $(this).val();
          });
          return entry;
        })
        .get();
      jqOutput.val(JSON.stringify(values));
      jqEditor.find("input").each(function () {
        this.setCustomValidity("");
      });
      jqEditor.find("input")[0]?.setCustomValidity(validConfiguratorParameter(name, jqOutput.val()) ? "" : "List is too large. Shorten text or remove entries.");
      jqAdd.prop("disabled", jqRows.length >= limit);
    }
    function reset() {
      jqEditor.empty();
      initial.forEach(addRow);
      sync();
    }
    jqEditor
      .on("input change", "input, select", function () {
        if ($(this).is("select")) updateIcon($(this).closest(".entry-row"));
        sync();
      })
      .on("click", "[data-action]", function () {
        const jqRow = $(this).closest(".entry-row");
        const action = $(this).data("action");
        if (action === "remove") jqRow.remove();
        else if (action === "up") jqRow.insertBefore(jqRow.prev());
        else jqRow.insertAfter(jqRow.next());
        sync();
        generateURL();
      });
    jqAdd.on("click", () => {
      if (jqEditor.children().length >= limit) return;
      addRow(newEntry).find("select").trigger("focus");
      sync();
      generateURL();
    });
    $(form).on("reset", () => setTimeout(reset, 0));
    reset();
  }

  // Theme, accessibility, and colors

  /** Theme and accessibility behavior belong to SPA.php's byCommon. */
  function initTheme() {
    let theme = "dark";
    try {
      const saved = localStorage.getItem("stream.html.theme");
      if (["light", "dark"].includes(saved)) theme = saved;
    } catch {
      // Storage can be unavailable for local files.
    }
    $("html").attr("data-bs-theme", theme);
    if (!window.byCommon) {
      $("#theme-toggle").attr("title", "Theme controls could not load. Reload when connected.");
      return;
    }
    const button = $("#theme-toggle")[0];
    byCommon.toggleTheme(document.documentElement, { theme, button });
    initAccessibility();
    $(button)
      .prop("disabled", false)
      .on("click", () => {
        const selected = byCommon.toggleTheme(document.documentElement, { button });
        try {
          localStorage.setItem("stream.html.theme", selected);
        } catch {
          // The toggle still works without persistence.
        }
      });
  }

  /** Builds the shared SPA.php controls; byCommon owns their behavior and state. */
  function initAccessibility() {
    const controls = [
      ["accessibilityText", "plus", "Increase text", "magnifying-glass-plus"],
      ["accessibilityText", "", "Reset text", "magnifying-glass"],
      ["accessibilityText", "minus", "Decrease text", "magnifying-glass-minus"],
      ["accessibilityMotion", "", "Reduce motion", "wind"],
      ["accessibilityDyslexia", "", "Dyslexia font", "font"],
      ["accessibilityWordSpacing", "", "Word spacing", "text-width"],
      ["accessibilityHighlightLinks", "", "Highlight links", "link"],
      ["accessibilityHighContrast", "high-contrast", "High contrast", "circle-half-stroke"],
      ["accessibilityHighContrast", "invertchropia", "Invert colors", "droplet"],
      ["accessibilityHighContrast", "monochropia", "Grayscale", "droplet-slash"],
      ["accessibilityHighContrast", "protanopia", "Protanopia filter", "eye"],
      ["accessibilityHighContrast", "deuteranopia", "Deuteranopia filter", "eye"],
      ["accessibilityHighContrast", "tritanopia", "Tritanopia filter", "eye-low-vision"]
    ];
    $("#accessibility-preset")
      .html(
        `<aside id="bywr-accessibility" aria-label="Accessibility tools">
      <a href="#" role="button" data-accessibility="accessibilityToggle" aria-controls="bywr-accessibility-buttons" aria-expanded="false" aria-label="Accessibility tools" title="Accessibility tools"><i class="fa-solid fa-universal-access" aria-hidden="true"></i></a>
      <div id="bywr-accessibility-buttons" class="hide" inert>${controls.map(([method, value, title, icon]) => `<a href="#" role="button" data-accessibility="${method}" data-value="${value}" aria-label="${title}" title="${title}"><i class="fa-solid fa-${icon}" aria-hidden="true"></i></a>`).join("")}</div>
    </aside>`
      )
      .on("click", "[data-accessibility]", function (event) {
        event.preventDefault();
        byCommon[this.dataset.accessibility](this.dataset.value);
        if (this.dataset.accessibility === "accessibilityToggle") {
          const hidden = $("#bywr-accessibility-buttons").hasClass("hide");
          $(this).attr("aria-expanded", String(!hidden));
          $("#bywr-accessibility-buttons").prop("inert", hidden);
        }
      })
      .on("keydown", "[data-accessibility]", function (event) {
        if (event.key === " ") {
          event.preventDefault();
          $(this).trigger("click");
        }
      });
  }

  /** Keep Pickr, editable CSS colors, and form Reset in sync without discarding alpha. */
  function initColorPickers() {
    for (const input of fields) {
      if (parameterRules[input.name]?.type !== "color") continue;
      const jqInput = $(input);
      const title = (jqInput.closest("label").text().trim() || input.name) + " picker";
      const jqSwatch = $('<span class="input-group-text p-1"><span></span></span>');
      jqInput.wrap('<span class="input-group"></span>').before(jqSwatch);
      jqInput.addClass("font-monospace").attr("placeholder", "#RRGGBB or #RRGGBBAA");
      const picker = Pickr.create({
        el: jqSwatch.children()[0],
        theme: "classic",
        position: "bottom-start",
        default: input.value,
        defaultRepresentation: "HEX",
        components: { preview: true, opacity: true, hue: true, interaction: { input: true, save: true } }
      });
      $(picker.getRoot().button).attr({ "aria-label": title, title });
      let syncing = false;
      // Pickr can emit change while applying a color or its format.
      function syncPicker() {
        if (!CSS.supports("color", input.value)) return;
        syncing = true;
        if (picker.setColor(input.value, true)) {
          picker.setColorRepresentation("HEX");
          picker.applyColor(true);
        }
        syncing = false;
      }
      picker
        .on("init", syncPicker)
        .on("change", (color) => {
          if (syncing) return;
          jqInput.val(color.toHEXA().toString()).trigger("input");
        })
        .on("save", () => picker.hide());
      jqInput.on("input change", syncPicker);
      $(input.form).on("reset", () =>
        setTimeout(() => {
          syncPicker();
          picker.hide();
        }, 0)
      );
    }
  }

  // Help and tool navigation

  /**
   * Builds the Bootstrap help modal and synchronizes its sections with URL hashes.
   * @param {Object<string, Array<string>>} parameterDetails Resource-specific parameter documentation.
   * @param {function(HTMLElement, Object<string, string>, Function): void} [initResourceHelp] Adds extra help panels and sections.
   */
  function initHelpDialog(parameterDetails, initResourceHelp) {
    const jqDialog = $('<div class="config-help modal fade" tabindex="-1" aria-labelledby="help-title">')
      .html(
        `<div class="modal-dialog modal-lg modal-dialog-scrollable"><div class="modal-content rounded-0">
      <nav class="d-flex flex-wrap align-items-center gap-2 p-3 bg-dark text-white modal-header flex-shrink-0" aria-label="Help sections">
        <a href="https://byuwur.github.io/" target="_blank" rel="noopener" aria-label="[Mateus] byUwUr"><img src="https://byuwur.github.io/img/logo.png" alt="" /></a>
        <button class="btn btn-sm btn-outline-light border-0" type="button" data-section="info"><i class="fa-solid fa-circle-info me-1" aria-hidden="true"></i>Info</button>
        <button class="btn btn-sm btn-outline-light border-0" type="button" data-section="obs"><i class="fa-solid fa-desktop me-1" aria-hidden="true"></i>Use with OBS</button>
        <button class="btn btn-sm btn-outline-light border-0" type="button" data-section="params"><i class="fa-solid fa-file-lines me-1" aria-hidden="true"></i>Parameters</button>
        <button type="button" class="help-close btn btn-sm btn-outline-light border-0 ms-auto fs-4" aria-label="Close help">&times;</button>
      </nav>
      <header class="p-4 bg-primary text-white flex-shrink-0"><h2 class="h2 m-0" id="help-title"></h2></header>
      <article class="modal-body p-4 overflow-y-auto">
        <section data-panel="info">
          <p>Made by <a href="https://byuwur.github.io/" target="_blank" rel="noopener" class="link-body-emphasis">[Mateus] byUwUr</a>. Free. Forever.</p>
          <p>You can <a href="https://streamlabs.com/byuwur" target="_blank" rel="noopener" class="link-body-emphasis">tip</a>, <a href="https://twitch.tv/byuwur" target="_blank" rel="noopener" class="link-body-emphasis">subscribe</a> or <a href="https://paypal.me/byuwur" target="_blank" rel="noopener" class="link-body-emphasis">donate</a>.</p>
          <p>Download the <a href="https://github.com/byuwur/stream.html" target="_blank" rel="noopener" class="link-body-emphasis">source code</a> to use the overlays locally. Keep each tool's assets together. Libraries and configurator styling load from jsDelivr and require internet access.</p>
        </section>
        <section data-panel="obs" hidden>
          <ol class="ps-4"><li>Adjust the parameters and check the live preview.</li><li>Click <strong>Copy URL</strong>.</li><li>In OBS, add a <strong>Browser</strong> source and paste the link into its <strong>URL</strong> field.</li></ol>
          <p class="help-dimensions"></p>
          <p>For a downloaded overlay, paste the complete <code>file:///</code> URL with <strong>Local file</strong> unchecked. Keep the folder at that location.</p>
          <p>To edit settings later, append <code>#configure</code> to the overlay URL. Reset restores the settings loaded when you opened the form.</p>
        </section>
        <section data-panel="params" hidden>
          <p>Settings are stored in the generated URL. Use the documented values below; missing values use the tool's defaults. Use public display information only.</p>
          <div class="help-parameters"></div>
        </section>
      </article></div></div>`
      )
      .appendTo("body");
    const modal = bootstrap.Modal.getOrCreateInstance(jqDialog[0]);
    const previewSize = $("#preview-viewport")[0].viewBox.baseVal;
    jqDialog.find(".help-dimensions").text(`The preview uses ${previewSize.width} x ${previewSize.height} pixels. Use those source dimensions as a starting point and adjust them to your layout.`);
    const jqParameters = jqDialog.find(".help-parameters");
    for (const name of new Set([...Object.keys(parameterRules), ...Object.keys(parameterDetails)])) {
      const rule = parameterRules[name] || {};
      const field = form.elements.namedItem(name);
      const [title, defaultValue, values, example] = parameterDetails[name] || [
        field?.dataset.title || field?.labels?.[0]?.querySelector(".field-caption")?.textContent.trim() || name,
        field?.value ?? "Empty",
        rule.options?.join(", ") || (rule.min !== undefined ? rule.min + " to " + rule.max : rule.type === "color" ? "CSS color" : rule.type === "url" ? "URL or relative asset path" : "Any text"),
        field?.value ?? ""
      ];
      const jqDefinition = $('<section class="definition border mb-3 p-3 bg-body-tertiary">').appendTo(jqParameters);
      $('<h3 class="h5 mb-2 d-flex flex-wrap align-items-center gap-2">')
        .text(title)
        .append($('<code class="d-inline-block bg-secondary-subtle text-primary border p-1">').text(name + "="))
        .appendTo(jqDefinition);
      $('<div class="codeblock bg-black text-white border p-2 mb-3 font-monospace text-break lh-lg">')
        .text((location.pathname.split("/").pop() || "index.html") + "?" + new URLSearchParams({ [name]: example }))
        .appendTo(jqDefinition);
      const jqList = $('<ul class="list-unstyled mb-0">').appendTo(jqDefinition);
      for (const [label, value] of [
        ["Default: ", defaultValue],
        ["Accepted: ", values],
        ["", field?.dataset.description]
      ]) {
        $('<li class="mb-2 text-break">').append($("<strong>").text(label), $("<span>").text(value)).appendTo(jqList);
      }
    }

    const titles = { info: "Information", obs: "Use with OBS", params: "Parameters" };
    initResourceHelp?.(jqDialog[0], titles, closeHelp);
    function showSection(section) {
      jqDialog.find("#help-title").text(titles[section]);
      jqDialog.find("[data-panel]").prop("hidden", true).filter(`[data-panel="${section}"]`).prop("hidden", false);
      jqDialog.find("[data-section]").removeClass("active").removeAttr("aria-current").filter(`[data-section="${section}"]`).addClass("active").attr("aria-current", "page");
      jqDialog.find("article").scrollTop(0);
      modal.show();
      if (location.hash !== "#" + section) location.hash = section;
    }
    function closeHelp() {
      modal.hide();
    }
    jqDialog.on("click", "[data-section]", function () {
      showSection($(this).data("section"));
    });
    jqDialog.find(".help-close").on("click", closeHelp);
    jqDialog
      .on("hide.bs.modal", () => {
        if (titles[location.hash.slice(1)]) history.replaceState(null, "", location.pathname + location.search);
      })
      .on("shown.bs.modal", () => {
        if (!titles[location.hash.slice(1)]) closeHelp();
      });
    function syncHelpHash() {
      const section = location.hash.slice(1);
      if (titles[section]) showSection(section);
      else closeHelp();
    }
    $(window).on("hashchange", syncHelpHash);
    syncHelpHash();

    const jqLinks = $('<p class="small m-0">').appendTo(".footer-links");
    const sections = { params: "Parameter reference", obs: "Use with OBS", info: "About" };
    Object.entries(titles).forEach(([section, title]) => {
      if (!Object.hasOwn(sections, section)) sections[section] = title;
    });
    Object.entries(sections).forEach(([section, title], index) => {
      if (index) jqLinks.append(" \u00b7 ");
      $("<a>", { href: "#" + section, text: title, class: "link-body-emphasis" }).appendTo(jqLinks);
    });
    $(document).on("click", 'a[href^="#"]', function (event) {
      const section = $(this).attr("href").slice(1);
      if (!titles[section]) return;
      event.preventDefault();
      $(this).trigger("focus");
      showSection(section);
    });
  }

  /**
   * Enhances the HTML tool menu with active links, hover, focus, and Escape.
   */
  function initTools() {
    const jqSwitcher = $(".tool-switcher");
    const switcher = jqSwitcher[0];
    if (!switcher) return;
    const jqLinks = jqSwitcher.find("nav");
    jqSwitcher.on("toggle", () => jqLinks.toggleClass("d-none", !switcher.open).toggleClass("show", switcher.open));
    const current = new URL(location.href);
    if (current.pathname.endsWith("/")) current.pathname += "index.html";
    jqLinks.find("a").each(function () {
      if (new URL(this.href).pathname === current.pathname) $(this).attr("aria-current", "page").addClass("active");
    });
    jqSwitcher
      .on("mouseenter", () => {
        if (matchMedia("(hover: hover)").matches) switcher.open = true;
      })
      .on("mouseleave", () => {
        if (!switcher.contains(document.activeElement)) switcher.open = false;
      })
      .on("focusout", (event) => {
        if (!switcher.contains(event.relatedTarget)) switcher.open = false;
      })
      .on("keydown", (event) => {
        if (event.key !== "Escape") return;
        event.preventDefault();
        switcher.open = false;
        jqSwitcher.find("summary").trigger("focus");
      });
    $(document).on("click", (event) => {
      if (!switcher.contains(event.target)) switcher.open = false;
    });
  }

  // Native browser services

  // Repeated in resource scripts so each renderer stays in one JS file. Editor names keep the copies independent.
  function validConfiguratorParameter(name, value) {
    if (!Object.hasOwn(parameterRules, name)) return false;
    const rule = parameterRules[name];
    if (rule.validate) return rule.validate(value) !== null;
    if (rule.options && !rule.options.includes(value)) return false;
    if (rule.maxlength && value.length > Number(rule.maxlength)) return false;
    if (rule.type === "number") {
      const number = Number(value);
      if (!value.trim() || !Number.isFinite(number) || number < Number(rule.min) || number > Number(rule.max)) return false;
      if (rule.step && rule.step !== "any") {
        const steps = (number - Number(rule.min)) / Number(rule.step);
        if (Math.abs(steps - Math.round(steps)) > 1e-8) return false;
      }
    }
    if (rule.type === "color" && !CSS.supports("color", value)) return false;
    if (name.endsWith("Url") && value) {
      try {
        const url = new URL(value, location.href);
        if (!["http:", "https:", "file:"].includes(url.protocol) || (url.protocol === "file:" && location.protocol !== "file:") || url.username || url.password) return false;
      } catch {
        return false;
      }
    }
    return true;
  }

  /** Apply validated URL or form values to the declared settings object; invalid values leave it intact. */
  function applyConfiguratorParameters(settings, values) {
    for (const [name, value] of values) {
      if (!Object.hasOwn(parameterRules, name)) continue;
      const rule = parameterRules[name];
      let parsed;
      if (rule.validate) parsed = rule.validate(value);
      else {
        if (!validConfiguratorParameter(name, value)) continue;
        parsed = rule.type === "number" ? Number(value) : value;
      }
      if (parsed === null) continue;
      settings[name] = parsed;
    }
  }

  /** Serialize public settings, including JSON lists and mappings, into an overlay URL. */
  function settingsURL(settings) {
    const values = Object.entries(settings)
      .filter(([name]) => Object.hasOwn(parameterRules, name))
      .map(([name, value]) => [name, typeof value === "object" ? JSON.stringify(value) : String(value)]);
    const url = new URL(location.href);
    if (url.pathname.endsWith("/")) url.pathname += "index.html";
    url.hash = "";
    url.search = new URLSearchParams(values).toString();
    return url;
  }

  /**
   * Sets a field's validation message using the active renderer's parameter rules.
   * @param {HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement} field Named form control.
   * @returns {boolean} Whether the control passes custom and native validation.
   */
  function validField(field) {
    const valid = validConfiguratorParameter(field.name, field.value);
    field.setCustomValidity(valid ? "" : "Enter a valid value for this setting.");
    // Hidden controls are excluded from native validation, including the account JSON.
    const accepted = field.checkValidity() && valid;
    if (!accepted) {
      const section = field.closest(".accordion-collapse");
      if (section) bootstrap.Collapse.getOrCreateInstance(section, { toggle: false }).show();
    }
    return accepted;
  }

  // Run after resource DOMContentLoaded handlers have assigned their settings.
  setTimeout(() => {
    try {
      const resource = window.byStreamResource;
      settings = resource.settings;
      parameterRules = resource.parameterRules;
      $(fields).each(function () {
        const value = settings[this.name];
        if (this.type === "checkbox") this.defaultChecked = this.checked = String(value) === this.value;
        else {
          this.value = typeof value === "object" ? JSON.stringify(value) : value;
          if (this.tagName === "SELECT")
            $(this)
              .find("option")
              .prop("defaultSelected", function () {
                return this.selected;
              });
          else this.defaultValue = this.value;
        }
      });

      const editor = { generateURL, initEntryEditor, platforms: configuratorPlatforms };
      const { parameterDetails = {}, initResourceHelp } = window.byConfigureResource?.(resource, editor) || {};
      initTheme();
      initTools();
      initHelpDialog(parameterDetails, initResourceHelp);
      initColorPickers();
      $(form)
        .on("input change", generateURL)
        .on("submit", (event) => {
          event.preventDefault();
          generateURL();
          form.reportValidity();
        })
        .on("reset", () => setTimeout(generateURL, 0));
      $("#copy-url, #url-gen-copy, #url-gen-url")
        .on("click", copyURL)
        .on("mouseleave focusout", () => $("#copy-url .copy-label, #url-gen-copy .copy-label").text("Copy URL"));
      $(window)
        .on("pagehide", () => clearTimeout(pendingPreview))
        .on("pageshow", () => {
          const url = $("#overlay-url, #url-gen-url").val();
          if (url) updateOverlayPreview(url);
        });
      generateURL();
    } catch (error) {
      console.error("Error loading configurator:", error);
      document.body.textContent = "Unable to load the tool. Check your internet connection and keep its local files together, then reload.";
    }
  }, 0);
});
