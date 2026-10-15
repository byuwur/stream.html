/**
 * File: configurator.js
 * @file Shared native resource setup and jQuery editor, preview, help, theme, and navigation.
 * Editor deps: jQuery 4, Bootstrap 5, Select2, Pickr, and resource parameter rules.
 */

/** Own shared editor setup and navigation. */
(async function (global) {
  global.byConfigurator = global.byConfigurator || {};
  const byConfigurator = global.byConfigurator;
  if (byConfigurator.init) return;
  const root = new URL(".", document.currentScript.src);

  // Native helpers are shared with renderers; editor dependencies load only below.
  /** Validate the declared URL field, retaining the same rules in forms and overlays. */
  function validParameter(fields, name, value) {
    if (!Object.hasOwn(fields, name)) return false;
    const rule = fields[name];
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

  /** Apply valid settings; invalid and unknown values keep the defaults. */
  function applyParameters(fields, settings, values = new URLSearchParams(location.search)) {
    for (const [name, value] of values) {
      if (!Object.hasOwn(fields, name)) continue;
      const rule = fields[name];
      let parsed;
      if (rule.validate) parsed = rule.validate(value);
      else {
        if (!validParameter(fields, name, value)) continue;
        parsed = rule.type === "number" ? Number(value) : value;
      }
      if (parsed === null) continue;
      settings[name] = parsed;
    }
  }

  Object.assign(byConfigurator, { validParameter, applyParameters });

  if (document.getElementById("configurator") && location.search.length > 1 && !location.hash) return;

  try {
    for (const source of document.querySelectorAll("script[data-editor-src]")) {
      await new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = source.dataset.editorSrc;
        script.onload = resolve;
        script.onerror = () => reject(new Error(`Unable to load ${script.src}`));
        document.head.append(script);
      });
    }
  } catch (error) {
    console.error("Unable to load configurator dependencies:", error);
    document.body.textContent = "Unable to load the configurator. Check your internet connection, then reload.";
    return;
  }
  if (typeof jQuery === "undefined" && !global.jQuery) return console.error("Init configurator.js FAILED. No jQuery found.");
  const $ = global.jQuery;

  // ==========
  // ==== SHARED TOOL CATALOG ====
  // ==========

  /** Shared card and navigation metadata; set ready: false to omit an unfinished tool from both. */
  byConfigurator.catalog = {
    // Resolve from this script so links also work in downloaded folders and nested deployments.
    root,
    categories: [
      {
        id: "scenes",
        name: "Scenes & cameras",
        icon: "fa-clapperboard"
      },
      {
        id: "interaction",
        name: "Input & interaction",
        icon: "fa-gamepad"
      },
      {
        id: "time",
        name: "Time & planning",
        icon: "fa-clock"
      },
      {
        id: "branding",
        name: "Branding & socials",
        icon: "fa-tags"
      },
      {
        id: "information",
        name: "Text & information",
        icon: "fa-align-left"
      }
    ],
    tools: [
      {
        id: "controller",
        name: "Controller",
        description: "Gamepad or keyboard. Four skins. Every input on screen.",
        icon: "fa-gamepad",
        category: "interaction",
        ready: true
      },
      {
        id: "popup",
        name: "Social popup",
        description: "Your accounts, one animated popup at a time. Pick from 90+ platforms.",
        icon: "fa-comment",
        category: "branding",
        ready: true
      },
      {
        id: "main",
        name: "Main scene",
        description: "Starting, BRB, ending, and intermission. Make each moment yours.",
        icon: "fa-clapperboard",
        category: "scenes",
        ready: true
      },
      {
        id: "clock",
        name: "Clock",
        description: "Your time, anywhere. Digital, analog, split flap, or beautifully minimal.",
        icon: "fa-clock",
        category: "time",
        ready: false
      },
      {
        id: "timer",
        name: "Timer / Countdown",
        description: "A reload-safe countdown or elapsed timer for your next run.",
        icon: "fa-hourglass-half",
        category: "time",
        ready: false
      },
      {
        id: "webcam",
        name: "Webcam Frame",
        description: "A clean, transparent frame to place above your camera in OBS.",
        icon: "fa-video",
        category: "scenes",
        ready: false
      },
      {
        id: "ticker",
        name: "Ticker",
        description: "News, commands, and reminders in a seamless scrolling strip.",
        icon: "fa-align-left",
        category: "information",
        ready: false
      },
      {
        id: "watermark",
        name: "Watermark",
        description: "A signature for your stream. Text, monogram, or your own logo.",
        icon: "fa-stamp",
        category: "branding",
        ready: false
      },
      {
        id: "lower-thirds",
        name: "Lower Thirds",
        description: "Introduce a guest, a game, or a moment with a broadcast card.",
        icon: "fa-id-card",
        category: "branding",
        ready: false
      },
      {
        id: "qr",
        name: "QR / Link Card",
        description: "A locally generated, scannable link card. Point viewers to something good.",
        icon: "fa-qrcode",
        category: "information",
        ready: false
      },
      {
        id: "reminder",
        name: "Periodic Reminder",
        description: "Gentle automatic reminders, on your schedule.",
        icon: "fa-bell",
        category: "information",
        ready: false
      },
      {
        id: "badge",
        name: "Stream Badge",
        description: "LIVE. AFK. RECORDING. Give the moment a name.",
        icon: "fa-tag",
        category: "branding",
        ready: false
      },
      {
        id: "credits",
        name: "Credits Roll",
        description: "Give your people a proper send-off. Closing credits, made yours.",
        icon: "fa-scroll",
        category: "information",
        ready: false
      },
      {
        id: "schedule",
        name: "Schedule",
        description: "What’s on next? A dated run of show with automatic current-segment highlighting.",
        icon: "fa-calendar-days",
        category: "time",
        ready: false
      },
      {
        id: "sponsors",
        name: "Sponsor Carousel",
        description: "Spotlight public logos and messages, one partner at a time.",
        icon: "fa-handshake",
        category: "branding",
        ready: false
      },
      {
        id: "info",
        name: "Info Board",
        description: "Stream rules, game settings, commands, and the details worth keeping on screen.",
        icon: "fa-circle-info",
        category: "information",
        ready: false
      },
      {
        id: "effects",
        name: "Screen Effects",
        description: "A little atmosphere. Rain, snow, confetti, and floating symbols.",
        icon: "fa-wand-magic-sparkles",
        category: "scenes",
        ready: false
      },
      {
        id: "hud",
        name: "Camera HUD",
        description: "REC, timecode, and a little nostalgia for your camera view.",
        icon: "fa-camera",
        category: "scenes",
        ready: false
      },
      {
        id: "timeline",
        name: "Progress Timeline",
        description: "From a beginning to an ending. Show where you are, and what remains.",
        icon: "fa-bars-progress",
        category: "time",
        ready: false
      },
      {
        id: "randomizer",
        name: "Randomizer",
        description: "Pick a challenge, a game, or your next move. A seed makes every draw reproducible.",
        icon: "fa-shuffle",
        category: "interaction",
        ready: false
      },
      {
        id: "quotes",
        name: "Quote Display",
        description: "A thought, a tip, a little trivia. Keep the good words coming.",
        icon: "fa-quote-left",
        category: "information",
        ready: false
      },
      {
        id: "shortcuts",
        name: "Keyboard Shortcut Sheet",
        description: "Keep the controls in sight. An editable guide, without keyboard monitoring.",
        icon: "fa-keyboard",
        category: "interaction",
        ready: false
      }
    ],
    get availableTools() {
      return this.tools.filter((tool) => tool.ready !== false);
    }
  };

  /** Build the active resource editor once; renderers and the landing need no form. */
  byConfigurator.init = function () {
    const resource = window.byStreamResource;
    const jqHost = $("#configurator");
    if (!jqHost.length || !resource || window.byStreamOverlay || jqHost.find("form[data-configurator]").length) return;
    $("html").addClass("bywr-configurator configure");
    $("body").attr("class", "bg-body text-body m-0");
    $("[data-editor-style]").attr("media", "all").prop("disabled", false);
    $("[data-renderer-style]").prop("disabled", true);
    buildConfigurator(resource, jqHost);
    const jqForm = jqHost.find("form[data-configurator]");
    if (!jqForm.length) return;
    const form = jqForm[0];
    const fields = jqForm.find("[name]").get();
    // Servers resolve directory URLs to the landing page; downloaded files need its filename.
    const homeURL = new URL(location.protocol === "file:" ? "index.html" : ".", byConfigurator.catalog.root).href;
    const { settings, fields: parameterRules } = resource;
    let pendingPreview;

    // ==========
    // ==== GENERATED FORM ====
    // ==========

    /** Build the shared shell and native controls; existing widgets enhance them afterward. */
    function buildConfigurator(resource, jqHost) {
      jqHost.html(/* HTML */ `
        <main id="setup" class="d-flex flex-column vh-100 overflow-hidden">
          <!-- URL toolbar and tool navigation. -->
          <header class="url-toolbar has-overlay light-links d-flex flex-column gap-2 p-2 bg-primary border-bottom sticky-top flex-shrink-0">
            <div class="overlay-vertical-inverted pe-none" aria-hidden="true"></div>
            <div class="d-flex flex-wrap align-items-center justify-content-between gap-2">
              <div class="d-flex align-items-center gap-2">
                <a class="home-link flex-shrink-0" href="./" aria-label="Home">
                  <img src="https://byuwur.github.io/img/logo.png" alt="" />
                </a>
                <div class="tool-switcher position-relative flex-shrink-0 me-2" data-tool="template">
                  <select id="tool-picker" class="form-select rounded-0" aria-label="Choose a tool"></select>
                </div>
              </div>
              <p class="config-credit d-none d-md-block m-0 ms-auto text-end small text-white">
                © ${new Date().getFullYear()}, Made with
                <i class="fa-solid fa-heart text-danger align-middle" role="img" aria-label="love"></i>
                by
                <a href="https://byuwur.co" target="_blank" rel="noopener" class="text-white link-body-emphasis"> BONYUR @byUwUr </a>
              </p>
              <nav class="config-menu d-flex align-items-center gap-2 flex-shrink-0" aria-label="Configurator menu">
                <button id="theme-toggle" class="theme-toggle rounded-0 border border-light text-white" type="button" disabled="" title="Loading theme controls" aria-label="Toggle theme" aria-pressed="true">
                  <span aria-hidden="true">☾︎ ☀︎</span>
                </button>
                <a class="btn btn-sm btn-outline-light text-nowrap" href="https://github.com/byuwur/stream.html" target="_blank" rel="noopener" title="Source code">
                  <i class="fa-brands fa-github me-1" aria-hidden="true"></i>
                  GitHub
                </a>
              </nav>
            </div>
            <div class="d-flex align-items-center gap-2">
              <label class="url-field flex-grow-1 overflow-hidden text-body form-label d-flex flex-column gap-1 w-100 m-0" for="overlay-url">
                <span class="visually-hidden">Overlay URL</span>
                <input id="overlay-url" readonly="" spellcheck="false" class="form-control rounded-0 bg-body-secondary border-secondary-subtle font-monospace small" />
              </label>
              <button id="copy-url" class="btn btn-sm btn-light flex-shrink-0 text-nowrap" type="button">
                <i class="fa-solid fa-copy me-2" aria-hidden="true"></i>
                <span class="copy-label">Copy URL</span>
              </button>
              <button class="btn btn-sm btn-outline-light flex-shrink-0 text-nowrap" type="reset" form="overlay-form">
                <i class="fa-solid fa-arrow-rotate-left me-2" aria-hidden="true"></i>
                Reset
              </button>
            </div>
          </header>
          <div class="setup-layout row g-0 flex-grow-1 flex-column flex-md-row flex-nowrap overflow-auto">
            <!-- Editable settings. -->
            <aside class="settings-panel h-100 flex-shrink-0 col-12 col-md-4 bg-body-tertiary p-3 overflow-y-auto border-end" aria-label="Overlay parameters">
              <h1 class="h4 mb-1"><i class="fa-solid fa-sliders me-2" aria-hidden="true"></i>This is the form.</h1>
              <p class="setup-intro text-body-secondary">Your next overlay starts here. Edit a field and watch the demo preview change.</p>
              <form id="overlay-form" data-configurator="" class="accordion"></form>
            </aside>
            <!-- Scaled view of the actual overlay. -->
            <section class="preview-panel h-100 order-first order-md-last flex-shrink-0 col-12 col-md-8 bg-body p-3 d-flex flex-column gap-2" aria-label="Overlay preview">
              <header class="preview-toolbar d-flex justify-content-between align-items-center small">
                <strong><i class="fa-solid fa-eye me-2" aria-hidden="true"></i>Live preview</strong>
                <a id="preview-url" target="_blank" rel="noopener" class="link-body-emphasis">
                  <i class="fa-solid fa-arrow-up-right-from-square me-2" aria-hidden="true"></i>
                  Open overlay
                </a>
              </header>
              <div id="preview-stage" class="ratio ratio-16x9 flex-grow-1 overflow-hidden border rounded-0 bg-body-secondary">
                <svg id="preview-viewport" viewBox="0 0 1280 720" role="group" aria-label="Scaled overlay preview">
                  <foreignObject width="100%" height="100%">
                    <iframe id="overlay-preview" class="border-0" title="Demo preview"></iframe>
                  </foreignObject>
                </svg>
              </div>
              <!-- Preview update status and reset guidance. -->
              <footer class="preview-footer d-flex flex-wrap justify-content-between gap-2 small text-body-secondary">
                <span id="preview-status">Change a parameter to update the preview.</span>
                <span id="copy-status" role="status"></span>
                <p class="setup-help m-0 ms-auto text-end">Reset restores the settings loaded when you opened this page.</p>
              </footer>
            </section>
          </div>
          <div id="accessibility-preset"></div>
          <!-- Help navigation. -->
          <footer class="config-footer border-top p-2 text-body-secondary flex-shrink-0">
            <nav class="footer-links px-5 text-center" aria-label="Page navigation"></nav>
          </footer>
        </main>
      `);
      const toolID = $("html").attr("data-tool");
      const tool = byConfigurator.catalog.tools.find((tool) => tool.id === toolID);
      jqHost.find(".tool-switcher").attr("data-tool", toolID || "template");
      jqHost
        .find("h1")
        .empty()
        .append(
          $(/* HTML */ `<i></i>`)
            .addClass(`fa-solid ${tool?.icon || "fa-sliders"} me-2`)
            .attr("aria-hidden", "true"),
          $(/* HTML */ `<span></span>`).text(resource.title)
        );
      jqHost.find(".setup-intro").text(resource.description);
      jqHost.find("#preview-viewport").attr("viewBox", `0 0 ${resource.preview.join(" ")}`);
      jqHost.find("#overlay-preview").attr({ title: `${resource.title} preview`, allow: resource.previewAllow || "" });
      const groups = new Map();
      const jqForm = jqHost.find("form");
      for (const [name, field] of Object.entries(resource.fields)) {
        const section = field.section || "Settings";
        if (!groups.has(section)) {
          const id = `section-${groups.size}`;
          const group = $(/* HTML */ `<fieldset class="accordion-item mb-3 border border-secondary-subtle bg-body p-2"></fieldset>`).appendTo(jqForm);
          const heading = $(/* HTML */ `<button class="accordion-button" type="button" data-bs-toggle="collapse" aria-expanded="true"></button>`)
            .attr({ id: `${id}-toggle`, "data-bs-target": `#${id}`, "aria-controls": id })
            .text(section);
          if (resource.sectionIcons?.[section]) heading.prepend($(/* HTML */ `<i></i>`).addClass(`${resource.sectionIcons[section]} me-2`).attr("aria-hidden", "true"));
          $(/* HTML */ `<legend class="float-start w-100 fs-6 fw-semibold border-bottom pb-2 mb-2 text-primary"></legend>`).append(heading).appendTo(group);
          groups.set(
            section,
            $(/* HTML */ `<div class="accordion-collapse collapse show"></div>`)
              .attr({ id, "aria-labelledby": `${id}-toggle` })
              .appendTo(group)
          );
        }
        const container = groups.get(section);
        const label = $(/* HTML */ `<label class="form-label d-flex flex-column gap-1 w-100 mb-3"></label>`).appendTo(container);
        const caption = $(/* HTML */ `<span class="field-caption"></span>`)
          .text(field.label || name)
          .appendTo(label);
        if (field.icon) caption.prepend($(/* HTML */ `<i></i>`).addClass(`fa-solid ${field.icon} fa-fw text-primary me-2`).attr("aria-hidden", "true"));
        let control;
        if (field.type === "select") {
          control = $(/* HTML */ `<select class="form-select"></select>`);
          for (const value of field.options)
            $(/* HTML */ `<option></option>`)
              .val(value)
              .text(field.labels?.[value] || value)
              .appendTo(control);
        } else if (field.type === "textarea") {
          control = $(/* HTML */ `<textarea class="form-control"></textarea>`).attr("rows", field.rows || 3);
        } else {
          control = $(/* HTML */ `<input class="form-control" />`).attr("type", field.type === "number" ? "number" : field.type === "switch" ? "checkbox" : ["entries", "mapping"].includes(field.type) ? "hidden" : "text");
          if (field.type === "number") control.attr("step", field.step || "any");
          if (field.type === "switch") {
            label.addClass("form-switch ps-0");
            control
              .removeClass("form-control")
              .addClass("form-check-input")
              .attr({ role: "switch", value: field.checkedValue ?? 1, "data-unchecked-value": field.uncheckedValue ?? 0 });
          }
        }
        if (field.type !== "switch") control.addClass("rounded-0 bg-body-secondary border-secondary-subtle");
        control.attr({ name, id: field.id || `field-${name}`, "data-title": field.label, "data-description": field.description || "" });
        for (const key of ["min", "max", "maxlength", "placeholder"]) if (field[key] !== undefined && field[key] !== Infinity) control.attr(key, field[key]);
        control.appendTo(label);
        if (field.description) $(/* HTML */ `<small class="text-body-secondary"></small>`).text(field.description).appendTo(label);
        if (field.type === "entries") {
          const editor = $(/* HTML */ `<div class="entry-editor mb-3"></div>`).appendTo(container);
          label.addClass("d-none").appendTo(editor);
          $(/* HTML */ `<div class="entry-list"></div>`).appendTo(editor);
          $(/* HTML */ `<button type="button" class="add-entry btn btn-sm btn-outline-primary w-100"></button>`)
            .text(field.addLabel || "Add entry")
            .appendTo(editor);
        }
        if (field.type === "mapping") $(/* HTML */ `<a href="#remap"></a>`).text("Configure input mapping").appendTo(label);
      }
    }

    // ==========
    // ==== URL GENERATION AND PREVIEW ====
    // ==========
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
      jqForm.find(":checkbox").each(function () {
        const jqField = $(this);
        values.set(this.name, jqField.prop("checked") ? jqField.val() : jqField.attr("data-unchecked-value"));
      });
      byConfigurator.applyParameters(parameterRules, settings, values);
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

    // ==========
    // ==== SELECT2 CONTROLS ====
    // ==========

    /**
     * Enhance existing controls; retain Select2's automatic above/below positioning.
     * @param {HTMLSelectElement} select Native control; its value and events are preserved.
     * @param {Object} [options] Select2 templates and control-specific options.
     */
    function initSelect2(select, options = {}) {
      const jqSelect = $(select);
      if (!$.fn.select2 || jqSelect.data("select2")) return;
      const jqParent = jqSelect.closest(".modal, dialog");
      jqSelect.select2({
        width: "100%",
        dropdownParent: jqParent.length ? jqParent : $("body"),
        dropdownCssClass: "stream-select2-dropdown",
        ...options
      });
      jqSelect.next(".select2-container").addClass("stream-select2");
      jqSelect.off("select2:open.streamSelect2").on("select2:open.streamSelect2", () => {
        const widget = jqSelect.data("select2");
        const fitDropdown = () => {
          const bounds = widget.$container[0].getBoundingClientRect();
          if (bounds.bottom <= 0 || bounds.top >= innerHeight) {
            jqSelect.select2("close");
            return;
          }
          const space = Math.max(bounds.top, innerHeight - bounds.bottom);
          const searchHeight = widget.dropdown.$dropdown.outerHeight() - widget.$results.outerHeight();
          widget.$results.css("max-height", Math.max(0, Math.min(416, space - searchHeight - 12)));
          // Reuse the pinned Select2 adapter so its direction and modal offsets stay in sync.
          widget.dropdown._positionDropdown();
        };
        $(window).on("resize", fitDropdown);
        jqSelect.one("select2:close.streamSelect2", () => $(window).off("resize", fitDropdown));
        fitDropdown();
      });
    }

    /** Connect declared font fields to the shared picker; the form remains authoritative. */
    function initFontPickers() {
      if (!window.byFont || typeof window.byFont.picker !== "function") return;
      fields.forEach((field, index) => {
        if (parameterRules[field.name]?.type !== "font") return;
        fields[index] = byFont.picker(field, {
          initSelect2,
          fallback: field.name === "primaryFont" ? "Courier, monospace" : "system-ui, sans-serif",
          emptyFont: field.name === "primaryFont" ? "Courier New" : "",
          weight: form.elements.fontWeight || 700,
          previewText: "Stream preview · Aa Bb 0123456789"
        });
      });
    }

    // ==========
    // ==== ORDERED ACCOUNT AND SCHEDULE EDITORS ====
    // ==========

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

    const platformIcons = new Map();
    function platformIcon(platform) {
      if (platformIcons.has(platform)) return platformIcons.get(platform);
      const jqIcon = $(/* HTML */ `<i></i>`)
        .addClass(Object.hasOwn(configuratorPlatforms, platform) ? `fa-brands fa-${platform}` : "fa-solid fa-globe")
        .prop("hidden", true)
        .appendTo(form);
      const style = getComputedStyle(jqIcon[0], "::before");
      const supported = style.getPropertyValue("--fa") || !["none", "normal", "", '""'].includes(style.content);
      const classes = supported ? jqIcon.attr("class") : "fa-solid fa-globe";
      jqIcon.remove();
      platformIcons.set(platform, classes);
      return classes;
    }

    function platformOption(option) {
      if (!option.id) return option.text;
      const jqLabel = $(/* HTML */ `<span class="platform-option"></span>`);
      $(/* HTML */ `<i></i>`, { class: `${platformIcon(option.id)} fa-fw me-2`, "aria-hidden": "true" }).appendTo(jqLabel);
      jqLabel.append($(/* HTML */ `<span></span>`).text(option.text));
      return jqLabel;
    }

    /**
     * Edits an ordered list; the resource validates entries and the configurator owns URL generation.
     * @param {string} name Hidden form field holding the serialized list.
     * @param {Array<Object>} entries Initial entries, restored on Reset.
     * @param {Object} options Optional choices/key, text field key/label/type triples, defaults, and row limit.
     */
    function initEntryEditor(name, entries, { choices, choiceKey, textFields, newEntry, limit = 100 }) {
      const jqOutput = $(form.elements[name]);
      const jqSection = jqOutput.closest(".entry-editor");
      const jqEditor = jqSection.find(".entry-list");
      const jqAdd = jqSection.find(".add-entry");
      const initial = entries.map((entry) => ({ ...entry }));
      jqOutput.prop("defaultValue", JSON.stringify(initial));

      function updateIcon(jqRow) {
        jqRow.find(".entry-icon").attr("class", "entry-icon text-primary fa-fw fa-solid fa-calendar-days");
      }
      function addRow(entry) {
        const jqRow = $(/* HTML */ `<div class="entry-row p-2 mb-2 border border-secondary-subtle bg-body-tertiary"></div>`).html(/* HTML */ `
          <div class="d-flex align-items-center gap-1 mb-1">
            <i class="entry-icon" aria-hidden="true"></i>
            <select class="form-select rounded-0 bg-body-secondary border-secondary-subtle flex-grow-1" aria-label="${choiceKey === "platform" ? "Platform" : "Day"}"></select>
            <div class="btn-group flex-shrink-0" role="group" aria-label="Entry controls">
              <button type="button" class="btn btn-sm btn-outline-primary" data-action="up" aria-label="Move entry up" title="Move up">
                <i class="fa-solid fa-arrow-up" aria-hidden="true"></i>
              </button>
              <button type="button" class="btn btn-sm btn-outline-primary" data-action="down" aria-label="Move entry down" title="Move down">
                <i class="fa-solid fa-arrow-down" aria-hidden="true"></i>
              </button>
              <button type="button" class="btn btn-sm btn-outline-primary" data-action="remove" aria-label="Remove entry" title="Remove">
                <i class="fa-solid fa-xmark" aria-hidden="true"></i>
              </button>
            </div>
          </div>
        `);
        const jqSelect = jqRow.find("select");
        if (!choices) jqRow.find("select, .entry-icon").remove();
        if (choiceKey === "platform") jqRow.find(".entry-icon").remove();
        Object.entries(choices || {}).forEach(([value, title]) => $(/* HTML */ `<option></option>`).val(value).text(title).appendTo(jqSelect));
        jqSelect.val(entry[choiceKey]);
        if (choices) updateIcon(jqRow);
        textFields.forEach(([key, title, type = "text"]) => {
          $(/* HTML */ `<input />`, {
            type,
            maxlength: 160,
            "data-field": key,
            "aria-label": title,
            placeholder: title,
            class: "form-control rounded-0 bg-body-secondary border-secondary-subtle mb-1"
          })
            .val(entry[key])
            .appendTo(jqRow);
        });
        jqRow.appendTo(jqEditor);
        if (choiceKey === "platform") {
          initSelect2(jqSelect, { templateResult: platformOption, templateSelection: platformOption });
        } else if (choices) initSelect2(jqSelect);
        return jqRow;
      }
      // Serialize the current row order for validation and URL generation.
      function sync() {
        const jqRows = jqEditor.children();
        const values = jqRows
          .map(function (index) {
            const jqRow = $(this);
            jqRow.find('[data-action="up"]').prop("disabled", index === 0);
            jqRow.find('[data-action="down"]').prop("disabled", index === jqRows.length - 1);
            const entry = choices ? { [choiceKey]: jqRow.find("select").val() } : {};
            jqRow.find("input").each(function () {
              const jqInput = $(this);
              const value = jqInput.val();
              entry[jqInput.data("field")] = value;
            });
            return entry;
          })
          .get();
        jqOutput.val(JSON.stringify(values));
        jqEditor.find("input").each(function () {
          this.setCustomValidity("");
        });
        jqEditor.find("input")[0]?.setCustomValidity(byConfigurator.validParameter(parameterRules, name, jqOutput.val()) ? "" : "List is too large. Shorten text or remove entries.");
        jqAdd.prop("disabled", jqRows.length >= limit);
      }
      function reset() {
        jqEditor.find("select").each(function () {
          if ($(this).data("select2")) $(this).select2("close").select2("destroy");
        });
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
          if (action === "remove") {
            const jqSelect = jqRow.find("select");
            if (jqSelect.data("select2")) jqSelect.select2("close").select2("destroy");
            jqRow.remove();
          } else if (action === "up") jqRow.insertBefore(jqRow.prev());
          else jqRow.insertAfter(jqRow.next());
          sync();
          generateURL();
        });
      jqAdd.on("click", () => {
        if (jqEditor.children().length >= limit) return;
        const jqRow = addRow(newEntry);
        jqRow.find(".select2-selection, select:not(.select2-hidden-accessible), input").first().trigger("focus");
        sync();
        generateURL();
      });
      jqForm.on("reset", () => setTimeout(reset, 0));
      reset();
    }

    // ==========
    // ==== THEME, ACCESSIBILITY, AND COLORS ====
    // ==========

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
        .html(/* HTML */ `
          <aside id="bywr-accessibility" aria-label="Accessibility tools">
            <a href="#" role="button" data-accessibility="accessibilityToggle" aria-controls="bywr-accessibility-buttons" aria-expanded="false" aria-label="Accessibility tools" title="Accessibility tools"
              ><i class="fa-solid fa-universal-access" aria-hidden="true"></i
            ></a>
            <div id="bywr-accessibility-buttons" class="hide" inert>
              ${controls
                .map(
                  ([method, value, title, icon]) =>
                    /* HTML */ `<a href="#" role="button" data-accessibility="${method}" data-value="${value}" aria-label="${title}" title="${title}"><i class="fa-solid fa-${icon}" aria-hidden="true"></i></a>`
                )
                .join("")}
            </div>
          </aside>
        `)
        .on("click", "[data-accessibility]", function (event) {
          event.preventDefault();
          const jqControl = $(this);
          const method = jqControl.data("accessibility");
          byCommon[method](jqControl.data("value"));
          if (method === "accessibilityToggle") {
            const hidden = $("#bywr-accessibility-buttons").hasClass("hide");
            jqControl.attr("aria-expanded", String(!hidden));
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
        const title = `${jqInput.closest("label").text().trim() || input.name} picker`;
        const jqSwatch = $(/* HTML */ `<span class="input-group-text p-1"><span></span></span>`);
        jqInput.wrap(/* HTML */ `<span class="input-group"></span>`).before(jqSwatch);
        jqInput.addClass("font-monospace").attr("placeholder", "#RRGGBB or #RRGGBBAA");
        const picker = Pickr.create({
          el: jqSwatch.children()[0],
          theme: "classic",
          position: "bottom-start",
          default: jqInput.val(),
          defaultRepresentation: "HEX",
          components: { preview: true, opacity: true, hue: true, interaction: { input: true, save: true } }
        });
        $(picker.getRoot().button).attr({ "aria-label": title, title });
        let syncing = false;
        // Pickr can emit change while applying a color or its format.
        function syncPicker() {
          const value = jqInput.val();
          if (!CSS.supports("color", value)) return;
          syncing = true;
          if (picker.setColor(value, true)) {
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
        jqForm.on("reset", () =>
          setTimeout(() => {
            syncPicker();
            picker.hide();
          }, 0)
        );
      }
    }

    // ==========
    // ==== HELP AND TOOL NAVIGATION ====
    // ==========

    /**
     * Builds the Bootstrap help modal and synchronizes its sections with URL hashes.
     * @param {function(HTMLElement, Object<string, string>, Function): void} [initResourceHelp] Adds extra help panels and sections.
     */
    function initHelpDialog(initResourceHelp) {
      const jqDialog = $(/* HTML */ `<div class="config-help modal fade" tabindex="-1" aria-labelledby="help-title"></div>`)
        .html(/* HTML */ `
          <div class="modal-dialog modal-lg modal-dialog-scrollable">
            <div class="modal-content rounded-0">
              <nav class="d-flex flex-wrap align-items-center gap-2 p-3 bg-dark text-white modal-header flex-shrink-0" aria-label="Help sections">
                <a href="https://byuwur.github.io/" target="_blank" rel="noopener" aria-label="[Mateus] byUwUr"><img src="https://byuwur.github.io/img/logo.png" alt="" /></a>
                <button class="btn btn-sm btn-outline-light border-0" type="button" data-section="info"> <i class="fa-solid fa-circle-info me-1" aria-hidden="true"></i>Info </button>
                <button class="btn btn-sm btn-outline-light border-0" type="button" data-section="obs"> <i class="fa-solid fa-desktop me-1" aria-hidden="true"></i>Use with OBS </button>
                <button class="btn btn-sm btn-outline-light border-0" type="button" data-section="params"> <i class="fa-solid fa-file-lines me-1" aria-hidden="true"></i>Parameters </button>
                <button type="button" class="help-close btn btn-sm btn-outline-light border-0 ms-auto fs-4" aria-label="Close help"> &times; </button>
              </nav>
              <header class="p-4 bg-primary text-white flex-shrink-0"><h2 class="h2 m-0" id="help-title"></h2></header>
              <article class="modal-body p-4 overflow-y-auto">
                <section data-panel="info">
                  <p>
                    Made by
                    <a href="https://byuwur.github.io/" target="_blank" rel="noopener" class="link-body-emphasis">[Mateus] byUwUr</a>. Free. Forever.
                  </p>
                  <p>
                    You can <a href="https://streamlabs.com/byuwur" target="_blank" rel="noopener" class="link-body-emphasis">tip</a>,
                    <a href="https://twitch.tv/byuwur" target="_blank" rel="noopener" class="link-body-emphasis">subscribe</a> or <a href="https://paypal.me/byuwur" target="_blank" rel="noopener" class="link-body-emphasis">donate</a>.
                  </p>
                  <p>
                    Download the
                    <a href="https://github.com/byuwur/stream.html" target="_blank" rel="noopener" class="link-body-emphasis">source code</a>
                    to use the overlays locally. Keep each tool's assets together. Libraries and configurator styling load from jsDelivr and require internet access.
                  </p>
                </section>
                <section data-panel="obs" hidden>
                  <ol class="ps-4">
                    <li>Adjust the parameters and check the live preview.</li>
                    <li>Click <strong>Copy URL</strong>.</li>
                    <li>In OBS, add a <strong>Browser</strong> source and paste the link into its <strong>URL</strong> field.</li>
                  </ol>
                  <p class="help-dimensions"></p>
                  <p> For a downloaded overlay, paste the complete <code>file:///</code> URL with <strong>Local file</strong> unchecked. Keep the folder at that location. </p>
                  <p> To edit settings later, append <code>#configure</code> to the overlay URL. Reset restores the settings loaded when you opened the form. </p>
                </section>
                <section data-panel="params" hidden>
                  <p> Settings are stored in the generated URL. Use the documented values below; missing values use the tool's defaults. Use public display information only. </p>
                  <div class="help-parameters"></div>
                </section>
              </article>
            </div>
          </div>
        `)
        .appendTo("body");
      const modal = bootstrap.Modal.getOrCreateInstance(jqDialog[0]);
      const previewSize = $("#preview-viewport")[0].viewBox.baseVal;
      jqDialog.find(".help-dimensions").text(`The preview uses ${previewSize.width} x ${previewSize.height} pixels. Use those source dimensions as a starting point and adjust them to your layout.`);
      const jqParameters = jqDialog.find(".help-parameters");
      const acceptedTypes = {
        color: "CSS color",
        url: "URL or relative asset path",
        font: "Font family or CSS font stack",
        datetime: "Absolute ISO 8601 timestamp",
        timezone: "IANA time zone; empty uses the local zone",
        entries: "Ordered JSON array",
        mapping: "Input mapping JSON array"
      };
      for (const name of Object.keys(parameterRules)) {
        const rule = parameterRules[name] || {};
        const [title, defaultValue, values, example] = [
          rule.label || name,
          typeof rule.default === "object" ? JSON.stringify(rule.default) : (rule.default ?? "Empty"),
          rule.options?.join(", ") || (rule.min !== undefined ? `${rule.min} to ${rule.max}` : acceptedTypes[rule.type] || "Text"),
          $(form.elements.namedItem(name)).val() ?? ""
        ];
        const jqDefinition = $(/* HTML */ `<section class="definition border mb-3 p-3 bg-body-tertiary"></section>`).appendTo(jqParameters);
        $(/* HTML */ `<h3 class="h5 mb-2 d-flex flex-wrap align-items-center gap-2"></h3>`)
          .text(title)
          .append($(/* HTML */ `<code class="d-inline-block bg-secondary-subtle text-primary border p-1"></code>`).text(`${name}=`))
          .appendTo(jqDefinition);
        $(/* HTML */ `<div class="codeblock bg-black text-white border p-2 mb-3 font-monospace text-break lh-lg"></div>`)
          .text(`${location.pathname.split("/").pop() || "index.html"}?${new URLSearchParams({ [name]: example })}`)
          .appendTo(jqDefinition);
        const jqList = $(/* HTML */ `<ul class="list-unstyled mb-0"></ul>`).appendTo(jqDefinition);
        for (const [label, value] of [
          ["Default: ", defaultValue],
          ["Accepted: ", values],
          ["", rule.description]
        ]) {
          $(/* HTML */ `<li class="mb-2 text-break"></li>`).append($(/* HTML */ `<strong></strong>`).text(label), $(/* HTML */ `<span></span>`).text(value)).appendTo(jqList);
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
        if (location.hash !== `#${section}`) location.hash = section;
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
          // Keep imported URLs in editor mode when help closes and the page is reloaded.
          if (titles[location.hash.slice(1)]) history.replaceState(null, "", `${location.pathname + location.search}${location.search.length > 1 ? "#configure" : ""}`);
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

      const jqLinks = $(/* HTML */ `<p class="small m-0"></p>`).appendTo(".footer-links");
      $(/* HTML */ `<a></a>`, { href: homeURL, text: "Home", class: "link-body-emphasis" }).appendTo(jqLinks);
      const sections = { params: "Parameter reference", obs: "Use with OBS", info: "About" };
      Object.entries(titles).forEach(([section, title]) => {
        if (!Object.hasOwn(sections, section)) sections[section] = title;
      });
      Object.entries(sections).forEach(([section, title]) => {
        jqLinks.append(" \u00b7 ");
        $(/* HTML */ `<a></a>`, { href: `#${section}`, text: title, class: "link-body-emphasis" }).appendTo(jqLinks);
      });
      $(document).on("click", 'a[href^="#"]', function (event) {
        const section = $(this).attr("href").slice(1);
        if (!titles[section]) return;
        event.preventDefault();
        $(this).trigger("focus");
        showSection(section);
      });
    }

    // ==========
    // ==== TOOL NAVIGATION ====
    // ==========

    /** Search and navigate the homepage's tool order without adding navigation to overlay settings. */
    function initTools() {
      $(".home-link").attr("href", homeURL);
      const jqSelect = $("#tool-picker").empty();
      if (!jqSelect.length) return;
      $(/* HTML */ `<option></option>`).val("").text("Choose a tool").appendTo(jqSelect);
      byConfigurator.catalog.availableTools.forEach((tool) => {
        $(/* HTML */ `<option></option>`)
          .val(tool.id)
          .text(tool.name)
          .attr({ "data-icon": tool.icon, "data-category": byConfigurator.catalog.categories.find((category) => category.id === tool.category).name })
          .appendTo(jqSelect);
      });
      const current = jqSelect.closest(".tool-switcher").data("tool");
      jqSelect.val(byConfigurator.catalog.availableTools.some((tool) => tool.id === current) ? current : "");

      function toolOption(option) {
        if (!option.id) return option.text;
        const label = $(/* HTML */ `<span></span>`);
        $(/* HTML */ `<i></i>`, { class: `fa-solid ${$(option.element).attr("data-icon")} fa-fw me-2`, "aria-hidden": "true" }).appendTo(label);
        return label.append($(/* HTML */ `<span></span>`, { class: "tool-name", text: option.text }));
      }
      /** Keep categories visible without grouping away the homepage's priority order. */
      function toolResult(option) {
        const label = toolOption(option);
        if (option.id) $(/* HTML */ `<small></small>`, { class: "tool-category", text: $(option.element).attr("data-category") }).appendTo(label);
        return label;
      }
      initSelect2(jqSelect, {
        placeholder: "Choose a tool",
        templateResult: toolResult,
        templateSelection: toolOption
      });
      jqSelect.on("change", () => {
        const value = jqSelect.val();
        if (value && value !== current) {
          location.assign(new URL(`${value}/${location.protocol === "file:" ? "index.html" : ""}`, byConfigurator.catalog.root).href);
        }
      });
    }

    // ==========
    // ==== NATIVE BROWSER SERVICES ====
    // ==========

    /** Serialize public settings, including JSON lists and mappings, into an overlay URL. */
    function settingsURL(settings) {
      const values = Object.entries(settings)
        .filter(([name]) => Object.hasOwn(parameterRules, name))
        .map(([name, value]) => [name, typeof value === "object" ? JSON.stringify(value) : String(value)]);
      const url = new URL(location.href);
      if (url.protocol !== "file:") url.pathname = url.pathname.replace(/\/index\.html$/, "/");
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
      const jqField = $(field);
      const valid = byConfigurator.validParameter(parameterRules, field.name, jqField.val() ?? "");
      field.setCustomValidity(valid ? "" : "Enter a valid value for this setting.");
      // Hidden controls are excluded from native validation, including the account JSON.
      const accepted = field.checkValidity() && valid;
      if (!accepted) {
        const section = jqField.closest(".accordion-collapse")[0];
        if (section) bootstrap.Collapse.getOrCreateInstance(section, { toggle: false }).show();
      }
      return accepted;
    }

    // Resource scripts publish their definitions before this deferred editor runs.
    try {
      $(fields).each(function () {
        const jqField = $(this);
        const value = settings[this.name];
        if (jqField.is(":checkbox")) {
          const checked = String(value) === jqField.val();
          jqField.prop({ defaultChecked: checked, checked });
        } else {
          jqField.val(typeof value === "object" ? JSON.stringify(value) : value);
          if (jqField.is("select"))
            jqField
              .find("option")
              .prop("defaultSelected", function () {
                return this.selected;
              });
          else jqField.prop("defaultValue", jqField.val());
        }
      });

      const editor = {
        generateURL,
        initEntryEditor,
        platforms: configuratorPlatforms,
        initSelect2
      };
      const { initResourceHelp } = byConfigurator.configureResource?.(resource, editor) || {};
      for (const [name, field] of Object.entries(resource.fields)) {
        if (field.entries)
          initEntryEditor(name, settings[name], {
            ...field.entries,
            choices: field.entries.choices === "platforms" ? configuratorPlatforms : field.entries.choices
          });
      }
      initTheme();
      initTools();
      initFontPickers();
      initHelpDialog(initResourceHelp);
      initColorPickers();
      jqForm
        .find("select")
        .each((_, select) => initSelect2(select));
      jqForm
        .on("input change", generateURL)
        .on("submit", (event) => {
          event.preventDefault();
          generateURL();
          form.reportValidity();
        })
        .on("reset", () =>
          setTimeout(() => {
            jqForm.find("select").trigger("change.select2");
            generateURL();
          }, 0)
        );
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
      $("body").text("Unable to load the tool. Check your internet connection and keep its local files together, then reload.");
    }
  };

  // jQuery ready also handles dependencies that finish loading after DOMContentLoaded.
  $(byConfigurator.init);
})(window);
