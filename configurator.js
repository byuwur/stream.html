/**
 * File: configurator.js
 * @file Optional editor, preview, help, theme, saved preferences, and tool catalog.
 * Dependencies: resource.js, jQuery 4, Bootstrap 5, Select2, Pickr, and SPA.js helpers.
 * Native settings, field factories, validation, and overlay startup belong to resource.js.
 * Removing this script leaves resource rendering functional.
 *
 * File map: overlay editing shortcut; preferences and the query preparation hook;
 * field icons and catalog; generated form and JSON editor; URL/preview updates and widgets;
 * help/navigation; conditional validation and editor startup.
 */
(function (global) {
  global.byConfigurator = global.byConfigurator || {};
  const byConfigurator = global.byConfigurator;
  if (byConfigurator.initialized) return;
  byConfigurator.VERSION = "8.2"; // 2026-10-20
  const root = new URL(".", document.currentScript.src);

  // F2 belongs to the optional editor; native overlays do not need this script or its dependencies.
  if (document.getElementById("configurator") && location.search.length > 1 && !location.hash) {
    global.addEventListener("keydown", (event) => {
      // Preview frames must never navigate into a nested configurator.
      if (global !== global.top) return;
      if (event.key !== "F2" || event.repeat || event.defaultPrevented || event.ctrlKey || event.altKey || event.metaKey || event.shiftKey) return;
      if (event.target?.isContentEditable || event.target?.matches?.("input, textarea, select")) return;
      event.preventDefault();
      location.hash = "configure";
    });
    byConfigurator.initialized = true;
    return;
  }

  const byStream = global.byStream;
  const { readURLParameters, settingsURL, fieldEnabled, parseLocale, parseZone } = byStream;
  let parameterError = "";
  let compressedFields = new Set();
  const preferencePath = new URL(".", location.href).pathname;
  const preferenceKey = `stream.html.settings.${encodeURIComponent(preferencePath)}`;
  let savedPreferences = { query: "", advanced: null, collapsed: [] };

  /**
   * Read this resource's editor preferences, validating stored UI state against its fields.
   * Local storage takes precedence over cookies because it also holds oversized/file:// saves.
   * Values remain encoded in query until initResource() passes them through URL validation.
   * @param {ResourceFields} fields Declared resource fields and their validation metadata.
   * @returns {{query: string, advanced: {enabled: boolean, scope: string, fields: Array<string>}|null, collapsed: Array<string>}} Accepted editor preferences, or empty preferences when neither storage location is valid.
   */
  function readPreferences(fields) {
    const candidates = [];
    try {
      candidates.push(localStorage.getItem(preferenceKey));
    } catch {}
    if (location.protocol !== "file:") {
      try {
        candidates.push(decodeURIComponent(global.get_cookie(preferenceKey) || "null"));
      } catch {}
    }
    for (const value of candidates) {
      try {
        const saved = JSON.parse(value);
        if (!saved || typeof saved.query !== "string") continue;
        // Drop saved UI references to fields that this resource no longer declares.
        const advanced = saved.advanced;
        return {
          query: saved.query,
          advanced:
            advanced && typeof advanced.enabled === "boolean" && ["all", "selected"].includes(advanced.scope) && Array.isArray(advanced.fields)
              ? { enabled: advanced.enabled, scope: advanced.scope, fields: advanced.fields.filter((name) => typeof name === "string" && Object.hasOwn(fields, name)) }
              : null,
          collapsed: Array.isArray(saved.collapsed) ? saved.collapsed.filter((section) => typeof section === "string") : []
        };
      } catch {
        // Ignore invalid saved data and try the other storage location.
      }
    }
    return { query: "", advanced: null, collapsed: [] };
  }

  /**
   * Supply saved editor settings before native URL validation without changing the runtime initializer.
   * @param {ResourceDefinition} resource Resource whose fields constrain saved preferences.
   * @returns {string} Explicit query, or the saved query for a bare editor URL.
   */
  byStream.prepareResource = function (resource) {
    savedPreferences = readPreferences(resource.fields);
    return location.search || savedPreferences.query;
  };

  if (typeof global.jQuery !== "function") {
    console.error("Unable to load configurator dependencies: jQuery is unavailable.");
    document.body.textContent = "Unable to load the configurator. Check your internet connection, then reload.";
    return;
  }
  const $ = global.jQuery;

  /**
   * Measure changed containers together, interpolate their heights, then restore natural sizing.
   * Bootstrap retains height ownership during collapse transitions; newer measurements supersede old ones.
   * @param {Map<HTMLElement, number>} containers Open containers mapped to their heights before content changes.
   * @returns {void}
   */
  function resizeContainers(containers) {
    const targets = [...containers].map(([element, previousHeight]) => ({ container: $(element), previousHeight })).filter(({ container }) => container.is(":visible") && !container.closest(".collapsing").length);
    targets.forEach(({ container }) => container.removeData("heightEffect").removeClass("motion-resize").css("height", ""));
    const changed = targets.map((target) => ({ ...target, height: target.container[0].getBoundingClientRect().height })).filter(({ height, previousHeight }) => Math.abs(height - previousHeight) >= 0.5);
    if (!changed.length) return;
    changed.forEach(({ container, previousHeight }) => container.css("height", `${previousHeight.toFixed(2)}px`));
    void changed[0].container[0].offsetHeight;
    changed.forEach(({ container, height }) => container.addClass("motion-resize").css("height", `${height.toFixed(2)}px`));
    changed.forEach(({ container }) => {
      const animations = container[0].getAnimations().filter((item) => item.transitionProperty === "height");
      const effect = Promise.allSettled(animations.map((item) => item.finished)).then(() => {
        if (container.data("heightEffect") !== effect) return;
        container.removeData("heightEffect").removeClass("motion-resize").css("height", "");
      });
      container.data("heightEffect", effect);
    });
  }

  /**
   * Slide and fade one surface through the same batch path used for conditional fields.
   * @param {HTMLElement|jQuery} element One panel, menu, or conditional field wrapper.
   * @param {boolean} visible Requested final visibility.
   * @returns {Promise<boolean>} Whether this request completed rather than being superseded.
   */
  function setVisible(element, visible) {
    return setVisibility([[element, visible]]);
  }

  /**
   * Separate reads from writes so sibling fields share one container resize and animation start.
   * Departing content becomes inert immediately; each surface retains its own latest-request cleanup.
   * @param {Array<[HTMLElement|jQuery, boolean]>} changes Surfaces paired with their requested visibility.
   * @returns {Promise<boolean>} Whether every request completed without being superseded.
   */
  function setVisibility(changes) {
    const targets = [];
    const pending = [];
    const containers = new Map();
    for (const [element, visible] of changes) {
      const target = $(element);
      if (!target.length) {
        pending.push(Promise.resolve(false));
        continue;
      }
      const showing = !target.prop("hidden") && !target.hasClass("animate__fadeOut");
      if (showing === visible) {
        const effect = target.data("visibilityEffect");
        if (effect) pending.push(effect);
        continue;
      }
      const container = target.parent().closest(".subsection-collapse.show, .accordion-collapse.show, .modal-content, .entry-list")[0];
      if (visible && container && !containers.has(container)) containers.set(container, container.getBoundingClientRect().height);
      targets.push({ target, visible, container, height: visible ? 0 : target[0].getBoundingClientRect().height });
    }
    if (!targets.length) return Promise.all(pending).then((results) => results.every(Boolean));
    targets.forEach(({ target, visible, height }) => {
      target.css("block-size", visible ? "" : `${height.toFixed(2)}px`);
      target.off(".fieldReveal").removeClass("motion-enter animate__animated animate__fadeIn animate__fadeOut").toggleClass("motion-enter", visible).prop({ hidden: false, inert: !visible });
    });
    void targets[0].target[0].offsetWidth;
    targets.forEach(({ target, visible }) => target.addClass(`animate__animated animate__${visible ? "fadeIn" : "fadeOut"}`));
    resizeContainers(containers);
    const animations = targets.flatMap(({ target, visible }) => target[0].getAnimations().filter((item) => item.animationName === (visible ? "fadeIn" : "fadeOut")));
    const finished = Promise.allSettled(animations.map((item) => item.finished)).then(() => {
      const current = targets.filter((item) => item.target.data("visibilityEffect") === item.effect);
      const heights = new Map();
      current.forEach(({ visible, container }) => {
        if (!visible && container && !heights.has(container)) heights.set(container, container.getBoundingClientRect().height);
      });
      current.forEach((item) => {
        item.target.prop("hidden", !item.visible).css("block-size", "").removeClass("motion-enter animate__animated animate__fadeIn animate__fadeOut").removeData("visibilityEffect");
        item.finished = true;
      });
      resizeContainers(heights);
    });
    targets.forEach((item) => {
      item.effect = finished.then(() => item.finished === true);
      item.target.data("visibilityEffect", item.effect);
      pending.push(item.effect);
    });
    return Promise.all(pending).then((results) => results.every(Boolean));
  }

  /**
   * Keep feedback text visible until its exit finishes; a newer message cancels that exit.
   * @param {HTMLElement|jQuery|string} element Feedback element or selector.
   * @param {string} message Text to display; empty text hides the feedback.
   * @returns {void}
   */
  function setMessage(element, message) {
    const target = $(element);
    if (message) target.text(message);
    setVisible(target, !!message).then((finished) => {
      if (finished && target.prop("hidden")) target.text("");
    });
  }

  /**
   * Animate Select2's reused dropdown before opening or detaching it.
   * Native selection and positioning remain owned by Select2; one pending exit is allowed per control.
   * @param {HTMLSelectElement|jQuery} select An initialized Select2 control.
   * @returns {void} Binds once; destroyed/replaced widgets cannot complete an old exit.
   */
  byConfigurator.initSelect2Motion = function (select) {
    const jqSelect = $(select);
    if (!jqSelect.data("select2") || jqSelect.data("select2Motion")) return;
    jqSelect.data("select2Motion", true);
    let finishClosing = false;
    jqSelect
      .on("select2:open.streamMotion", () => {
        const dropdown = jqSelect.data("select2").dropdown.$dropdown;
        // Select2 reuses a detached node; replay entry after it has positioned the dropdown.
        dropdown.prop("hidden", true);
        setVisible(dropdown, true);
      })
      .on("select2:closing.streamMotion", (event) => {
        if (finishClosing) return;
        event.preventDefault();
        const widget = jqSelect.data("select2");
        const dropdown = widget.dropdown.$dropdown;
        if (dropdown.prop("inert")) return;
        setVisible(dropdown, false).then((finished) => {
          if (!finished || jqSelect.data("select2") !== widget) return;
          finishClosing = true;
          jqSelect.select2("close");
          finishClosing = false;
          dropdown.prop({ hidden: false, inert: false });
        });
      });
  };

  /**
   * Explicit resource icons take priority; shared controls use their property or purpose.
   * @param {string} name Field or item identifier.
   * @param {Partial<ResourceField>} [field={}] Metadata whose icon, type, and label guide the fallback.
   * @returns {string} Font Awesome icon class selected from explicit metadata or the shared field rules.
   */
  function fieldIcon(name, field = {}) {
    if (field.icon) return field.icon;
    const properties = {
      "font-size": "fa-text-height",
      "font-family": "fa-font",
      "font-weight": "fa-bold",
      "font-style": "fa-italic",
      "text-transform": "fa-font",
      "letter-spacing": "fa-text-width",
      "line-height": "fa-arrows-up-down",
      opacity: "fa-circle-half-stroke",
      "background-color": "fa-fill-drip",
      "border-width": "fa-border-all",
      "border-style": "fa-border-all",
      "border-color": "fa-palette",
      "border-radius": "fa-square",
      padding: "fa-compress",
      "padding-inline": "fa-compress",
      gap: "fa-arrows-left-right-to-line",
      order: "fa-arrow-down-short-wide",
      width: "fa-arrows-left-right",
      "max-width": "fa-arrows-left-right",
      height: "fa-arrows-up-down",
      "max-height": "fa-arrows-up-down",
      left: "fa-arrow-left",
      right: "fa-arrow-right",
      top: "fa-arrow-up",
      bottom: "fa-arrow-down",
      "margin-inline": "fa-arrows-left-right",
      rotate: "fa-rotate",
      scale: "fa-expand",
      "transform-origin": "fa-bullseye",
      "flex-direction": "fa-up-down-left-right",
      "flex-wrap": "fa-layer-group",
      "justify-content": "fa-align-center",
      "align-items": "fa-align-center",
      "animation-duration": "fa-clock",
      "animation-delay": "fa-hourglass-half",
      "animation-iteration-count": "fa-repeat"
    };
    if (properties[field.styleProperty]) return properties[field.styleProperty];
    const types = { color: "fa-palette", font: "fa-font", datetime: "fa-calendar-days", timezone: "fa-earth-americas", timezones: "fa-earth-americas", locale: "fa-language", entries: "fa-list", mapping: "fa-gamepad" };
    if (types[field.type]) return types[field.type];
    for (const [pattern, icon] of [
      [/url|image|logo/i, "fa-image"],
      [/icon|symbol|separator/i, "fa-icons"],
      [/heading|title/i, "fa-heading"],
      [/account|handle|platform/i, "fa-at"],
      [/keyboard|keys|shortcut/i, "fa-keyboard"],
      [/button/i, "fa-hand-pointer"],
      [/date|weekday|schedule/i, "fa-calendar-days"],
      [/time|duration|pause|delay|interval|hour|seconds|quiet/i, "fa-clock"],
      [/color|gradient|hue|tint/i, "fa-palette"],
      [/opacity|strength/i, "fa-circle-half-stroke"],
      [/shadow|glow|blur/i, "fa-cloud"],
      [/font|weight|text|label|message|content|closing/i, "fa-font"],
      [/width|horizontal|offsetx|left|right/i, "fa-arrows-left-right"],
      [/height|vertical|offsety|top|bottom/i, "fa-arrows-up-down"],
      [/position|offset|placement|anchor/i, "fa-up-down-left-right"],
      [/size|radius|padding|margin|distance|length/i, "fa-ruler"],
      [/angle|rotate|tilt/i, "fa-rotate"],
      [/scale|zoom/i, "fa-expand"],
      [/speed|curve|ease/i, "fa-gauge-high"],
      [/animation|motion|pulse|effect|transition/i, "fa-wand-magic-sparkles"],
      [/loop|repeat|cycle/i, "fa-repeat"],
      [/layout|composition|align|style|mode|shape/i, "fa-layer-group"],
      [/show|display|visible/i, "fa-eye"],
      [/count|number|seed|round|density/i, "fa-hashtag"],
      [/name|player/i, "fa-user"]
    ])
      if (pattern.test(name)) return icon;
    return { switch: "fa-toggle-on", select: "fa-list", number: "fa-sliders", text: "fa-font", textarea: "fa-align-left" }[field.type] || "fa-sliders";
  }

  // ==========
  // ==== SHARED TOOL CATALOG ====
  // ==========

  /** Shared card, navigation, and release status metadata; only ready: true tools are published. */
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
        status: "Beta",
        ready: true
      },
      {
        id: "popup",
        name: "Social popup",
        description: "Your accounts, one animated popup at a time. Pick from 90+ platforms.",
        icon: "fa-comment",
        category: "branding",
        status: "Beta",
        ready: true
      },
      {
        id: "main",
        name: "Main scene",
        description: "Starting, BRB, ending, and intermission. Make each moment yours.",
        icon: "fa-clapperboard",
        category: "scenes",
        status: "Beta",
        ready: true
      },
      {
        id: "clock",
        name: "Clock",
        description: "Your time, anywhere. Digital, analog, split flap, or beautifully minimal.",
        icon: "fa-clock",
        category: "time",
        status: "Alpha",
        ready: true
      },
      {
        id: "timer",
        name: "Timer / Countdown",
        description: "A reload-safe countdown or elapsed timer for your next run.",
        icon: "fa-hourglass-half",
        category: "time",
        status: "Alpha",
        ready: true
      },
      {
        id: "webcam",
        name: "Webcam Frame",
        description: "A clean, transparent frame to place above your camera in OBS.",
        icon: "fa-video",
        category: "scenes",
        status: "Alpha",
        ready: true
      },
      {
        id: "ticker",
        name: "Ticker",
        description: "News, commands, and reminders in a seamless scrolling strip.",
        icon: "fa-align-left",
        category: "information",
        status: "Alpha",
        ready: true
      },
      {
        id: "watermark",
        name: "Watermark",
        description: "A signature for your stream. Text, monogram, or your own logo.",
        icon: "fa-stamp",
        category: "branding",
        status: "Alpha",
        ready: true
      },
      {
        id: "lower-thirds",
        name: "Lower Thirds",
        description: "Introduce a guest, a game, or a moment with a broadcast card.",
        icon: "fa-id-card",
        category: "branding",
        status: "Alpha",
        ready: true
      },
      {
        id: "qr",
        name: "QR / Link Card",
        description: "A locally generated, scannable link card. Point viewers to something good.",
        icon: "fa-qrcode",
        category: "information",
        status: "Alpha",
        ready: true
      },
      {
        id: "reminder",
        name: "Periodic Reminder",
        description: "Gentle automatic reminders, on your schedule.",
        icon: "fa-bell",
        category: "information",
        status: "Alpha",
        ready: true
      },
      {
        id: "badge",
        name: "Stream Badge",
        description: "LIVE. AFK. RECORDING. Give the moment a name.",
        icon: "fa-tag",
        category: "branding",
        status: "Alpha",
        ready: true
      },
      {
        id: "credits",
        name: "Credits Roll",
        description: "Give your people a proper send-off. Closing credits, made yours.",
        icon: "fa-scroll",
        category: "information",
        status: "Alpha",
        ready: true
      },
      {
        id: "schedule",
        name: "Schedule",
        description: "What’s on next? A dated run of show with automatic current-segment highlighting.",
        icon: "fa-calendar-days",
        category: "time",
        status: "Alpha",
        ready: true
      },
      {
        id: "sponsors",
        name: "Sponsor Carousel",
        description: "Spotlight public logos and messages, one partner at a time.",
        icon: "fa-handshake",
        category: "branding",
        status: "Alpha",
        ready: true
      },
      {
        id: "info",
        name: "Info Board",
        description: "Stream rules, game settings, commands, and the details worth keeping on screen.",
        icon: "fa-circle-info",
        category: "information",
        status: "Alpha",
        ready: true
      },
      {
        id: "effects",
        name: "Screen Effects",
        description: "A little atmosphere. Rain, snow, confetti, and floating symbols.",
        icon: "fa-wand-magic-sparkles",
        category: "scenes",
        status: "Alpha",
        ready: true
      },
      {
        id: "hud",
        name: "Camera HUD",
        description: "REC, timecode, and a little nostalgia for your camera view.",
        icon: "fa-camera",
        category: "scenes",
        status: "Alpha",
        ready: true
      },
      {
        id: "timeline",
        name: "Progress Timeline",
        description: "From a beginning to an ending. Show where you are, and what remains.",
        icon: "fa-bars-progress",
        category: "time",
        status: "Alpha",
        ready: true
      },
      {
        id: "randomizer",
        name: "Randomizer",
        description: "Pick a challenge, a game, or your next move. A seed makes every draw reproducible.",
        icon: "fa-shuffle",
        category: "interaction",
        status: "Alpha",
        ready: true
      },
      {
        id: "quotes",
        name: "Quote Display",
        description: "A thought, a tip, a little trivia. Keep the good words coming.",
        icon: "fa-quote-left",
        category: "information",
        status: "Alpha",
        ready: true
      },
      {
        id: "shortcuts",
        name: "Keyboard Shortcut Sheet",
        description: "Keep the controls in sight. An editable guide, without keyboard monitoring.",
        icon: "fa-keyboard",
        category: "interaction",
        status: "Alpha",
        ready: true
      }
    ],
    get availableTools() {
      return this.tools.filter((tool) => tool.ready === true);
    }
  };

  // ==========
  // ==== RESOURCE EDITOR LIFECYCLE ====
  // ==========

  /**
   * Build the active resource editor once after initResource() publishes validated settings.
   * The DOM controls own pending form edits; settings holds the last accepted resource values.
   * JSON and URL drafts temporarily take precedence for actions. Landing/overlay pages never build this form.
   * @returns {void}
   */
  byConfigurator.init = function () {
    const resource = window.byStreamResource;
    const jqHost = $("#configurator");
    if (!jqHost.length || !resource || window.byStreamOverlay || jqHost.find("form[data-configurator]").length) return;
    // Switch styles before measuring widgets; renderer styles must not affect the editor shell.
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
    // One revision invalidates queued edits and in-flight compression or URL decoding.
    let urlGeneration = 0;
    let acceptedGeneration = -1;
    let preparedJSON = { overrides: "{}", all: "{}" };
    // Keep typed URL drafts authoritative for Copy, Open, and F2.
    let urlEdited = false;
    let jsonEdited = false;
    let previewURL = "";
    const jsonInput = $("#settings-json")[0];

    // ==========
    // ==== GENERATED FORM ====
    // ==========

    /**
     * Build the shell and native controls directly from resource.fields insertion order.
     * Sections/subsections group their first appearance; resource declarations keep related fields contiguous.
     * Widgets enhance these same controls afterward. Conditional list wrappers include the whole editor.
     * @param {ResourceDefinition} resource Resource metadata, field definitions, defaults, and current settings.
     * @param {jQuery} jqHost jQuery wrapper for the configurator host.
     * @returns {void}
     */
    function buildConfigurator(resource, jqHost) {
      jqHost.html(/* HTML */ `
        <main id="setup" class="animate__animated animate__fadeIn d-flex flex-column vh-100 overflow-hidden">
          <!-- URL toolbar and tool navigation. -->
          <header class="url-toolbar has-overlay light-links d-flex flex-column gap-2 p-2 bg-primary border-bottom sticky-top flex-shrink-0">
            <div class="overlay-vertical-inverted pe-none" aria-hidden="true"></div>
            <div class="d-flex flex-wrap align-items-center justify-content-between gap-2">
              <div class="d-flex align-items-center gap-2">
                <a class="home-link flex-shrink-0" href="./" aria-label="stream.html home">
                  <img src="https://byuwur.github.io/stream.html/stream.html.png" alt="" />
                </a>
                <div class="tool-switcher position-relative flex-shrink-0 me-2" data-tool="template">
                  <select id="tool-picker" class="form-select rounded-0" aria-label="Choose a tool" aria-keyshortcuts="Alt+Shift+M"></select>
                </div>
              </div>
              <p class="config-credit d-none d-md-block m-0 ms-auto text-end small text-white">
                © ${new Date().getFullYear()}, Made with
                <i class="fa-solid fa-heart text-danger align-middle" role="img" aria-label="love"></i>
                by
                <a href="https://byuwur.co" target="_blank" rel="noopener" class="text-white link-body-emphasis"> BONYUR @byUwUr </a>
              </p>
              <nav class="config-menu d-flex align-items-center gap-2 flex-shrink-0 ms-auto ms-lg-0" aria-label="Configurator menu">
                <button id="theme-toggle" class="theme-toggle rounded-0 border border-light text-white" type="button" disabled="" title="Loading theme controls" aria-label="Toggle theme" aria-pressed="true">
                  <span aria-hidden="true">☾︎ ☀︎</span>
                </button>
                <a class="btn btn-sm btn-outline-light text-nowrap" href="https://github.com/byuwur/stream.html" target="_blank" rel="noopener" title="Source code">
                  <i class="fa-brands fa-github me-1" aria-hidden="true"></i>
                  GitHub
                </a>
                <a class="portfolio-link d-inline-flex align-items-center" href="https://byuwur.co" target="_blank" rel="noopener" aria-label="Visit BONYUR's portfolio" title="BONYUR @byUwUr">
                  <img src="https://byuwur.github.io/img/logo.png" alt="" />
                </a>
              </nav>
            </div>
            <div class="d-flex align-items-center gap-2">
              <label class="url-field flex-grow-1 overflow-hidden text-body form-label d-flex flex-column gap-1 w-100 m-0" for="overlay-url">
                <span class="visually-hidden">Overlay URL</span>
                <input
                  id="overlay-url"
                  type="url"
                  spellcheck="false"
                  autocomplete="off"
                  class="form-control rounded-0 bg-body-secondary border-secondary-subtle font-monospace small"
                  aria-keyshortcuts="Alt+Shift+U"
                  aria-describedby="copy-status"
                  title="URL edits apply after typing pauses. Press Enter or leave the field to apply immediately." />
              </label>
              <button id="copy-url" class="btn btn-sm btn-light flex-shrink-0 text-nowrap" type="button" aria-keyshortcuts="Alt+Shift+C">
                <i class="fa-solid fa-copy me-2" aria-hidden="true"></i>
                <span class="copy-label">Copy URL</span>
              </button>
              <button class="btn btn-sm btn-outline-light flex-shrink-0 text-nowrap" type="reset" form="overlay-form">
                <i class="fa-solid fa-arrow-rotate-left me-2" aria-hidden="true"></i>
                Reset
              </button>
              <button
                id="advanced-options"
                class="btn btn-sm btn-outline-light flex-shrink-0"
                type="button"
                data-section="advanced"
                data-bs-toggle="tooltip"
                data-bs-placement="bottom"
                data-bs-fallback-placements='["bottom"]'
                title="Advanced options"
                aria-label="Advanced options"
                aria-keyshortcuts="Alt+Shift+A"
                aria-controls="config-help"
                aria-haspopup="dialog">
                <i class="fa-solid fa-gear" aria-hidden="true"></i>
              </button>
            </div>
          </header>
          <div class="setup-layout row g-0 flex-grow-1 flex-column flex-md-row flex-nowrap overflow-auto">
            <!-- Editable settings. -->
            <aside class="settings-panel d-flex flex-column position-relative h-100 flex-shrink-0 col-12 col-md-4 bg-body-tertiary overflow-y-auto border-end" aria-label="Overlay parameters">
              <div class="settings-toolbar flex-shrink-0 sticky-top bg-body-tertiary border-bottom p-3">
                <div class="d-flex align-items-center justify-content-between gap-2">
                  <div class="btn-group btn-group-sm" role="group" aria-label="Settings editor">
                    <button class="btn btn-outline-primary active" type="button" data-settings-view="form" aria-pressed="true" aria-controls="overlay-form">Form</button>
                    <button class="btn btn-outline-secondary" type="button" data-settings-view="json" aria-pressed="false" aria-controls="settings-json-panel">JSON</button>
                  </div>
                  <div class="d-grid">
                    <div id="form-actions" class="motion-layer d-flex gap-2">
                      <button class="btn btn-sm btn-outline-secondary" type="button" data-expand-sections="true" data-bs-toggle="tooltip" title="Expand All" aria-label="Expand All">
                        <i class="fa-solid fa-angles-down" aria-hidden="true"></i>
                      </button>
                      <button class="btn btn-sm btn-outline-secondary" type="button" data-expand-sections="false" data-bs-toggle="tooltip" title="Collapse All" aria-label="Collapse All">
                        <i class="fa-solid fa-angles-up" aria-hidden="true"></i>
                      </button>
                    </div>
                    <button id="copy-json" class="motion-layer btn btn-sm btn-outline-secondary" type="button" hidden><i class="fa-solid fa-copy me-2" aria-hidden="true"></i>Copy</button>
                  </div>
                </div>
                <label id="json-options" class="form-switch d-flex align-items-center justify-content-between gap-3 ps-0 mt-3 mb-0" hidden>
                  <span><i class="fa-solid fa-list-check text-primary me-2" aria-hidden="true"></i>Show all fields</span>
                  <input id="json-all-fields" class="form-check-input fs-4 m-0 flex-shrink-0" type="checkbox" role="switch" />
                </label>
              </div>
              <div class="settings-content d-flex flex-column flex-grow-1 p-3">
                <h1 class="h4 flex-shrink-0 mb-1"><i class="fa-solid fa-sliders me-2" aria-hidden="true"></i>This is the form.</h1>
                <p class="setup-intro flex-shrink-0 text-body-secondary">Your next overlay starts here. Edit a field and watch the demo preview change.</p>
                <div class="settings-editors d-grid flex-grow-1 position-relative">
                  <form id="overlay-form" data-configurator="" class="settings-editor accordion"></form>
                  <div id="settings-json-panel" class="settings-editor" hidden>
                    <label class="visually-hidden" for="settings-json">Overlay settings JSON</label>
                    <textarea id="settings-json" class="form-control rounded-0 bg-body-secondary font-monospace" rows="20" maxlength="1048576" spellcheck="false" wrap="off" aria-describedby="json-error json-status"></textarea>
                    <p id="json-error" class="small text-danger mt-2 mb-0" role="status" hidden></p>
                    <p id="json-status" class="small text-body-secondary mt-2 mb-0" role="status" hidden></p>
                  </div>
                </div>
              </div>
            </aside>
            <!-- Scaled view of the actual overlay. -->
            <section class="preview-panel h-100 order-first order-md-last col-12 col-md bg-body p-3 d-flex flex-column gap-2" aria-label="Overlay preview">
              <header class="preview-toolbar d-flex justify-content-between align-items-center small">
                <strong><i class="fa-solid fa-eye me-2" aria-hidden="true"></i>Live preview</strong>
                <a id="preview-url" target="_blank" rel="noopener" class="link-body-emphasis" aria-keyshortcuts="Alt+Shift+O">
                  <i class="fa-solid fa-arrow-up-right-from-square me-2" aria-hidden="true"></i>
                  Open overlay
                </a>
              </header>
              <div id="preview-stage" class="ratio ratio-16x9 flex-grow-1 overflow-hidden border rounded-0 bg-body-secondary">
                <svg id="preview-viewport" viewBox="0 0 1280 720" role="group" aria-label="Scaled overlay preview">
                  <foreignObject width="100%" height="100%">
                    <iframe id="overlay-preview" class="border-0 w-100 h-100 bg-transparent" title="Demo preview"></iframe>
                  </foreignObject>
                </svg>
              </div>
              <!-- Preview update status and reset guidance. -->
              <footer class="preview-footer d-flex flex-wrap justify-content-between gap-2 small text-body-secondary">
                <span id="preview-status">Change a parameter to update the preview.</span>
                <span id="copy-status" role="status" hidden></span>
                <p class="setup-help m-0 ms-auto text-end">Reset restores the settings loaded when you opened this page.</p>
              </footer>
            </section>
          </div>
          <div id="bywr-accessibility" class="uncolor-links bottom-0 flex-column-reverse">
            <a href="#" id="accessibility-toggle" role="button" aria-expanded="false" data-bs-toggle="tooltip" title="Accessibility tools" aria-label="Accessibility tools" aria-controls="bywr-accessibility-buttons">
              <i class="fa-solid fa-universal-access" aria-hidden="true"></i>
            </a>
            <div id="bywr-accessibility-buttons" hidden>
              <a href="javascript:byCommon.accessibilityText('plus');" role="button" data-bs-toggle="tooltip" title="Increase text" aria-label="Increase text">
                <i class="fa-solid fa-magnifying-glass-plus" aria-hidden="true"></i>
              </a>
              <a href="javascript:byCommon.accessibilityText();" role="button" data-bs-toggle="tooltip" title="Reset text" aria-label="Reset text">
                <i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i>
              </a>
              <a href="javascript:byCommon.accessibilityText('minus');" role="button" data-bs-toggle="tooltip" title="Decrease text" aria-label="Decrease text">
                <i class="fa-solid fa-magnifying-glass-minus" aria-hidden="true"></i>
              </a>
              <a href="javascript:byCommon.accessibilityMotion();" role="button" data-bs-toggle="tooltip" title="Reduce motion" aria-label="Reduce motion">
                <i class="fa-solid fa-wind" aria-hidden="true"></i>
              </a>
              <a href="javascript:byCommon.accessibilityDyslexia();" role="button" data-bs-toggle="tooltip" title="Dyslexia font" aria-label="Dyslexia font">
                <i class="fa-solid fa-font" aria-hidden="true"></i>
              </a>
              <a href="javascript:byCommon.accessibilityWordSpacing();" role="button" data-bs-toggle="tooltip" title="Word spacing" aria-label="Word spacing">
                <i class="fa-solid fa-text-width" aria-hidden="true"></i>
              </a>
              <a href="javascript:byCommon.accessibilityHighlightLinks();" role="button" data-bs-toggle="tooltip" title="Highlight links" aria-label="Highlight links">
                <i class="fa-solid fa-link" aria-hidden="true"></i>
              </a>
              <a href="javascript:byCommon.accessibilityHighContrast();" role="button" data-bs-toggle="tooltip" title="High contrast" aria-label="High contrast">
                <i class="fa-solid fa-circle-half-stroke" aria-hidden="true"></i>
              </a>
              <a href="javascript:byCommon.accessibilityHighContrast('invertchropia');" role="button" data-bs-toggle="tooltip" title="Invert colors" aria-label="Invert colors">
                <i class="fa-solid fa-droplet" aria-hidden="true"></i>
              </a>
              <a href="javascript:byCommon.accessibilityHighContrast('monochropia');" role="button" data-bs-toggle="tooltip" title="Grayscale" aria-label="Grayscale">
                <i class="fa-solid fa-droplet-slash" aria-hidden="true"></i>
              </a>
              <a href="javascript:byCommon.accessibilityHighContrast('protanopia');" role="button" data-bs-toggle="tooltip" title="Protanopia filter" aria-label="Protanopia filter">
                <i class="fa-solid fa-eye" aria-hidden="true"></i>
              </a>
              <a href="javascript:byCommon.accessibilityHighContrast('deuteranopia');" role="button" data-bs-toggle="tooltip" title="Deuteranopia filter" aria-label="Deuteranopia filter">
                <i class="fa-solid fa-eye-slash" aria-hidden="true"></i>
              </a>
              <a href="javascript:byCommon.accessibilityHighContrast('tritanopia');" role="button" data-bs-toggle="tooltip" title="Tritanopia filter" aria-label="Tritanopia filter">
                <i class="fa-solid fa-eye-low-vision" aria-hidden="true"></i>
              </a>
            </div>
          </div>
          <!-- Help navigation. -->
          <footer class="config-footer d-flex flex-column flex-lg-row align-items-center gap-2 border-top p-2 text-body-secondary flex-shrink-0">
            <small class="config-info text-nowrap opacity-75">
              <!-- <a href="https://github.com/byuwur/stream.html" target="_blank" rel="noopener noreferrer">stream.html</a> · -->configurator v${byConfigurator.VERSION} · resource v${resource.version}
              <!-- · <a href="https://byuwur.co" target="_blank" rel="noopener noreferrer">@byUwUr</a> -->
            </small>
            <nav class="footer-links flex-grow-1 px-5 text-center" aria-label="Page navigation"></nav>
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
      if (tool?.status) jqHost.find("h1").append($(/* HTML */ `<span class="resource-status badge rounded-pill border fw-normal align-middle ms-2"></span>`).text(tool.status));
      jqHost.find(".setup-intro").text(resource.description);
      jqHost.find("#preview-viewport").attr("viewBox", `0 0 ${resource.preview.join(" ")}`);
      jqHost.find("#overlay-preview").attr({ title: `${resource.title} preview`, allow: resource.previewAllow || "" });
      // Create groups on first use instead of sorting; resource declaration order is the display order.
      const groups = new Map();
      const subsections = new Map();
      const jqForm = jqHost.find("form");
      for (const [name, field] of Object.entries(resource.fields)) {
        const section = field.section || "Settings";
        if (!groups.has(section)) {
          const id = `section-${groups.size}`;
          const collapsed = savedPreferences.collapsed.includes(section);
          const group = $(/* HTML */ `<section class="accordion-item mb-3 border border-secondary-subtle bg-body"></section>`).attr("aria-labelledby", `${id}-toggle`).appendTo(jqForm);
          const heading = $(/* HTML */ `<button class="accordion-button p-3 fs-6 fw-semibold text-primary bg-transparent" type="button" data-bs-toggle="collapse" aria-expanded="true"></button>`)
            .attr({ id: `${id}-toggle`, "data-bs-target": `#${id}`, "aria-controls": id, "aria-expanded": String(!collapsed) })
            .toggleClass("collapsed", collapsed)
            .text(section);
          heading.prepend(
            $(/* HTML */ `<i></i>`)
              .addClass(`${resource.sectionIcons?.[section] || `fa-solid ${fieldIcon(section)}`} me-2`)
              .attr("aria-hidden", "true")
          );
          $(/* HTML */ `<h2 class="accordion-header fs-6 m-0"></h2>`).append(heading).appendTo(group);
          const content = $(/* HTML */ `<div class="accordion-collapse collapse show"></div>`)
            .attr({ id, "aria-labelledby": `${id}-toggle`, "data-config-section": section })
            .toggleClass("show", !collapsed)
            .appendTo(group);
          // Padding belongs inside the collapsing element so its closed height can reach zero.
          groups.set(section, $(/* HTML */ `<div class="accordion-body p-3"></div>`).appendTo(content));
        }
        let container = groups.get(section);
        if (field.subsection) {
          const key = `${section}:${field.subsection}`;
          if (!subsections.has(key)) {
            const id = `subsection-${subsections.size}`;
            const subsection = $(/* HTML */ `<section class="field-subsection border-top mt-3"></section>`).attr("aria-labelledby", `${id}-toggle`).appendTo(container);
            const heading = $(/* HTML */ `<button class="accordion-button collapsed px-0 py-2 fs-6 fw-medium text-primary bg-transparent" type="button" data-bs-toggle="collapse" aria-expanded="false"></button>`)
              .attr({ id: `${id}-toggle`, "data-bs-target": `#${id}`, "aria-controls": id })
              .text(field.subsection)
              .prepend(
                $(/* HTML */ `<i></i>`)
                  .addClass(`fa-solid ${fieldIcon(field.subsection)} fa-fw me-2`)
                  .attr("aria-hidden", "true")
              );
            $(/* HTML */ `<h3 class="accordion-header fs-6 m-0"></h3>`).append(heading).appendTo(subsection);
            const content = $(/* HTML */ `<div class="subsection-collapse collapse"></div>`)
              .attr({ id, "aria-labelledby": `${id}-toggle`, "data-config-subsection": field.subsection })
              .appendTo(subsection);
            subsections.set(key, $(/* HTML */ `<div class="pt-2 pb-1"></div>`).appendTo(content));
          }
          container = subsections.get(key);
        }
        const label = $(/* HTML */ `<label class="config-field form-label d-flex flex-column gap-1 w-100 mb-3"></label>`).appendTo(container);
        const caption = $(/* HTML */ `<span class="field-caption small"></span>`)
          .text(field.label || name)
          .appendTo(label);
        caption.prepend(
          $(/* HTML */ `<i></i>`)
            .addClass(`fa-solid ${fieldIcon(name, field)} fa-fw text-primary me-2`)
            .attr("aria-hidden", "true")
        );
        let control;
        if (field.type === "select") {
          control = $(/* HTML */ `<select class="form-select"></select>`);
          for (const [value, title] of Object.entries(field.options)) $(/* HTML */ `<option></option>`).val(value).text(title).appendTo(control);
        } else if (["textarea", "timezones"].includes(field.type)) {
          control = $(/* HTML */ `<textarea class="form-control"></textarea>`).attr("rows", field.rows || 3);
        } else {
          control = $(/* HTML */ `<input class="form-control" />`).attr("type", field.type === "number" ? "number" : field.type === "switch" ? "checkbox" : ["entries", "mapping"].includes(field.type) ? "hidden" : "text");
          if (field.type === "number") control.attr("step", field.step || "any");
          if (field.type === "switch") {
            label.addClass("form-switch ps-0");
            control
              .removeClass("form-control")
              .addClass("form-check-input fs-4 m-0 flex-shrink-0")
              .attr({ role: "switch", value: field.checkedValue ?? 1, "data-unchecked-value": field.uncheckedValue ?? 0 });
          }
        }
        if (field.type !== "switch") control.addClass("rounded-0 bg-body-secondary border-secondary-subtle");
        // These named controls remain the serialization source even when widgets replace their UI.
        control.attr({ name, id: field.id || `field-${name}`, "data-title": field.label, "data-description": field.description || "" });
        for (const key of ["min", "max", "maxlength", "placeholder"]) if (field[key] !== undefined && field[key] !== Infinity) control.attr(key, field[key]);
        if (field.optional && !field.placeholder) control.attr("placeholder", field.default === "" ? "Off" : String(field.default));
        control.appendTo(label);
        if (field.type === "switch") caption.add(control).wrapAll(/* HTML */ `<span class="d-flex align-items-center justify-content-between gap-3"></span>`);
        if (field.description) $(/* HTML */ `<small class="text-body-secondary"></small>`).text(field.description).appendTo(label);
        if (field.type === "entries") {
          const editor = $(/* HTML */ `<div class="config-field entry-editor mb-3"></div>`).appendTo(container);
          label.removeClass("config-field").appendTo(editor);
          $(/* HTML */ `<div class="entry-list"></div>`).appendTo(editor);
          $(/* HTML */ `<button type="button" class="add-entry btn btn-sm btn-outline-primary w-100"></button>`)
            .text(field.addLabel || "Add entry")
            .prepend(/* HTML */ `<i class="fa-solid fa-plus me-2" aria-hidden="true"></i>`)
            .appendTo(editor);
        }
        if (field.type === "mapping") $(/* HTML */ `<a href="#remap"></a>`).text("Configure input mapping").appendTo(label);
        if (field.when) (field.type === "entries" ? label.closest(".entry-editor") : label).wrap(/* HTML */ `<div class="conditional-field"></div>`);
      }
    }

    // ==========
    // ==== URL GENERATION AND PREVIEW ====
    // ==========
    /**
     * Validate the active form/JSON input and update its overlay URL and preview.
     * Commit accepted values to settings, build a sparse readable URL, then optionally compress it.
     * Publish/save only the latest generation; slower async work must not replace newer edits or drafts.
     * @param {boolean} [keepURLDraft=false] Preserve the URL text during automatic application.
     * @returns {Promise<boolean>} Whether the latest URL was generated from valid fields.
     */
    async function generateURL(keepURLDraft = false) {
      // JSON is another input surface for the same controls, never a separate settings store.
      let jsonValid = true;
      if (jsonEdited) {
        const values = readJSONParameters();
        jsonValid = values !== null;
        if (jsonValid) loadSettings(values);
      }
      // Restoring a value can emit change events; capture the revision after those handlers finish.
      fields.forEach(restoreEmptyField);
      const generation = ++urlGeneration;
      // Event handlers can pass a jQuery event; only explicit true preserves the draft.
      urlEdited = keepURLDraft === true;
      $("#overlay-url")[0].setCustomValidity("");
      syncFieldVisibility();
      // Check every field so all invalid sections are revealed, rather than stopping at the first.
      const valid = fields.map(validField).every(Boolean) && jsonValid;
      if (!valid) {
        $("#overlay-url").val("");
        $("#preview-url").removeAttr("href");
        $("#copy-url").prop("disabled", true);
        $("#url-summary").text("Fix the highlighted parameter to generate a URL.");
        updateOverlayPreview(null);
        return false;
      }
      const values = new URLSearchParams();
      for (const input of fields) {
        const value = input.type === "checkbox" ? (input.checked ? input.value : input.dataset.uncheckedValue) : input.value;
        values.set(input.name, value);
      }
      byStream.applyParameters(parameterRules, settings, values);
      // Always derive compression from the same sparse readable URL used by ordinary links.
      const readableURL = settingsURL(resource, settings);
      let url = readableURL;
      let summary = `${url.href.length.toLocaleString()} characters. Parameters remain readable.`;
      const scope = $('input[name="compression-scope"]:checked').val();
      const selected = $("[data-compress-field]:checked")
        .map((_, input) => input.value)
        .get()
        .filter((name) => readableURL.searchParams.has(name));
      if ($("#short-url").prop("checked") && scope === "selected" && !selected.length) {
        summary = `${url.href.length.toLocaleString()} characters. Select a field included in the URL to compress.`;
      } else if ($("#short-url").prop("checked")) {
        $("#copy-url").prop("disabled", true);
        $("#url-summary").text("Generating a shorter URL...");
        try {
          const shorterURL = new URL(readableURL);
          if (scope === "selected") {
            for (const name of selected) {
              const value = readableURL.searchParams.get(name);
              const text = value.startsWith("raw:") ? value.slice(4) : value;
              shorterURL.searchParams.set(name, `dr:${await global.compress_url_data(text)}`);
            }
          } else {
            const compressed = await global.compress_url_data(readableURL.search.slice(1));
            shorterURL.search = new URLSearchParams({ data: compressed }).toString();
          }
          shorterURL.search = shorterURL.search.replace(/=(dr|raw)%3A/g, "=$1:");
          if (shorterURL.href.length < readableURL.href.length) {
            url = shorterURL;
            const saving = Math.round((1 - url.href.length / readableURL.href.length) * 100);
            summary = `${url.href.length.toLocaleString()} characters · ${saving}% shorter.`;
            summary += scope === "selected" ? ` ${selected.length} ${selected.length === 1 ? "field" : "fields"} compressed; other parameters stay readable.` : " Required fields and overrides are included.";
          } else summary = `${url.href.length.toLocaleString()} characters. The readable URL is already shorter.`;
        } catch (error) {
          console.warn("Unable to shorten the overlay URL:", error);
          summary = `Shorter URLs are unavailable. Using the readable URL (${url.href.length.toLocaleString()} characters).`;
        }
      }
      // Compression can finish out of order; only the latest edit may publish or save its URL.
      if (generation !== urlGeneration) return false;
      savePreferences(url.search.slice(1));
      if (!urlEdited) $("#overlay-url").val(url.href);
      $("#url-summary").text(summary);
      $("#preview-url").attr("href", url.href);
      $("#copy-url .copy-label").text("Copy URL");
      setMessage("#copy-status", "");
      $("#copy-url").prop("disabled", false);
      prepareJSON();
      acceptedGeneration = generation;
      updateOverlayPreview(url.href);
      syncJSON();
      return true;
    }

    /**
     * Validate the complete JSON draft before changing any controls or accepted settings.
     * Use resource field IDs and native values; missing keys reset to resource defaults when loaded.
     * @returns {URLSearchParams|null} Validated field values, or null with an error beside the editor.
     */
    function readJSONParameters() {
      let error = "";
      let values;
      try {
        if (jsonInput.value.length > jsonInput.maxLength) throw new Error("Keep settings JSON under 1 MiB.");
        const data = JSON.parse(jsonInput.value);
        if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("Enter a JSON object with setting IDs as keys.");
        values = new URLSearchParams();
        for (const [name, value] of Object.entries(data)) {
          if (!Object.hasOwn(parameterRules, name)) throw new Error(`Unknown setting: ${name}.`);
          const rule = parameterRules[name];
          const text = typeof value === "object" ? JSON.stringify(value) : String(value);
          if (value === null || (typeof value === "object" && typeof rule.default !== "object") || !byStream.validParameter(parameterRules, name, text)) {
            throw new Error(`Invalid value for ${rule.label || name} (${name}).`);
          }
          values.set(name, text);
        }
      } catch (failure) {
        error = failure.message;
      }
      jsonInput.setCustomValidity(error);
      $(jsonInput).toggleClass("is-invalid", !!error).attr("aria-invalid", String(!!error));
      setMessage("#json-error", error);
      return error ? null : values;
    }

    /**
     * Prepare both JSON views with each accepted URL; switching views never serializes settings.
     * URL default comparison excludes required anchors while preserving native values and list order.
     * @returns {void}
     */
    function prepareJSON() {
      const overrides = settingsURL({ ...resource, urlRequired: [] }, settings).searchParams;
      const entries = Object.keys(parameterRules).map((name) => [name, settings[name]]);
      preparedJSON = {
        overrides: JSON.stringify(Object.fromEntries(entries.filter(([name]) => overrides.has(name))), null, 2),
        all: JSON.stringify(Object.fromEntries(entries), null, 2)
      };
    }

    /**
     * Display prepared JSON without overwriting an active draft or its caret.
     * @returns {void}
     */
    function syncJSON() {
      if (jsonEdited) return;
      jsonInput.value = preparedJSON[$("#json-all-fields").prop("checked") ? "all" : "overrides"];
      jsonInput.setCustomValidity("");
      $(jsonInput).removeClass("is-invalid").attr("aria-invalid", "false");
      setMessage("#json-error", "");
    }

    function reportEditorValidity() {
      if (jsonEdited && !jsonInput.checkValidity()) jsonInput.reportValidity();
      else form.reportValidity();
    }

    // Editing is debounced before URL generation; keep the last valid preview on invalid input.
    function updateOverlayPreview(url) {
      $("#preview-status").text(url ? "Changes update automatically." : "Fix the highlighted parameter to update the preview.");
      if (url && previewURL !== url) {
        // Preview refreshes must not add steps to browser Back/Forward navigation.
        $("#overlay-preview")[0].contentWindow.location.replace(url);
        previewURL = url;
      }
    }

    /**
     * Validate the URL draft and allowed protocol; sameResourceURL() decides whether to import it here.
     * @returns {URL|null} Accepted URL, or null after marking the URL input invalid.
     */
    function readEditorURL() {
      const input = $("#overlay-url")[0];
      input.setCustomValidity("");
      try {
        const url = new URL(input.value);
        if (!byStream.safeImage(url.href)) throw new Error("Invalid overlay URL");
        return url;
      } catch {
        input.setCustomValidity("Enter a complete HTTP(S) overlay URL, or a local file URL when using downloaded tools.");
        return null;
      }
    }

    /**
     * Hosted folder and index.html links share an editor; file URLs retain their exact paths.
     * @param {URL} url Parsed overlay URL.
     * @returns {boolean} Whether the URL resolves to this resource on the current origin.
     */
    function sameResourceURL(url) {
      const pathname = (path) => (location.protocol === "file:" ? path : path.replace(/\/index\.html$/, "/"));
      return url.origin === location.origin && pathname(url.pathname) === pathname(location.pathname);
    }

    /**
     * Apply same-tool URLs in place; opening another tool requires Enter or a field change.
     * Rebuild from resource defaults so omitted fields reset, while preserving this page's opening Reset baseline.
     * @param {boolean} [automatic=false] Suppress partial-input errors and preserve the focused draft.
     * @returns {Promise<boolean|undefined>} The resulting asynchronous value.
     */
    async function applyEditedURL(automatic = false) {
      if (!urlEdited) return;
      const url = readEditorURL();
      if (!url) {
        if (!automatic) $("#overlay-url")[0].reportValidity();
        return;
      }
      if (!sameResourceURL(url)) {
        if (automatic) {
          setMessage("#copy-status", "Press Enter or leave the field to open another tool.");
          return;
        }
        url.hash = "configure";
        location.assign(url.href);
        return;
      }
      const generation = ++urlGeneration;
      const parameters = await readURLParameters(parameterRules, url.search);
      if (generation !== urlGeneration) return;
      // Omitted parameters reset to defaults instead of inheriting values from the previous form.
      jsonEdited = false;
      loadSettings(parameters.values);
      loadCompressionOptions(url.search, url.search ? parameters.compressedFields : new Set());
      $("#url-load-error").text(parameters.error).prop("hidden", !parameters.error);
      return generateURL(automatic);
    }

    /**
     * Resolve action targets from the typed URL, or regenerate from the form when no draft is active.
     * @returns {Promise<URL|null>} The resulting asynchronous value.
     */
    async function currentOverlayURL() {
      // Copy/Open must honor a typed URL draft instead of silently regenerating the old form URL.
      if (urlEdited) {
        const draft = readEditorURL();
        if (draft && sameResourceURL(draft) && !(await applyEditedURL())) return null;
      } else if (urlGeneration !== acceptedGeneration && !(await generateURL())) {
        reportEditorValidity();
        return null;
      }
      const url = readEditorURL();
      if (!url) {
        $("#overlay-url")[0].reportValidity();
        return null;
      }
      url.hash = "";
      return url;
    }

    /**
     * Resolve drafts/validation before copying; select the URL for manual copy if clipboard access fails.
     * @returns {Promise<void>}
     */
    async function copyURL() {
      const url = await currentOverlayURL();
      if (!url) return;
      const jqOutput = $("#overlay-url");
      jqOutput.val(url.href);
      try {
        await navigator.clipboard.writeText(url.href);
        $("#copy-url .copy-label").text("Copied!");
        setMessage("#copy-status", "Copied!");
      } catch {
        jqOutput.trigger("focus").trigger("select");
        setMessage("#copy-status", "Press Ctrl+C (or Command+C) to copy the selected URL.");
      }
    }

    // ==========
    // ==== SELECT2 CONTROLS ====
    // ==========

    /**
     * Enhance existing controls; retain Select2's automatic above/below positioning.
     * @param {HTMLSelectElement|jQuery} select Native control or its jQuery wrapper; its value and events are preserved.
     * @param {Object} [options] Select2 templates and control-specific options.
     * @returns {void} Enhances the existing control in place; repeated initialization is ignored.
     */
    function initSelect2(select, options = {}) {
      const jqSelect = $(select);
      if (!$.fn.select2 || jqSelect.data("select2")) return;
      const jqParent = jqSelect.closest(".modal, dialog");
      jqSelect.select2({
        width: "100%",
        dropdownParent: jqParent.length ? jqParent : $("body"),
        selectionCssClass: "bg-body-secondary border border-secondary-subtle rounded-0 h-auto",
        dropdownCssClass: "stream-select2-dropdown bg-body-secondary text-body border border-secondary-subtle rounded-0",
        ...options
      });
      byConfigurator.initSelect2Motion(jqSelect);
      jqSelect.next(".select2-container").addClass("stream-select2");
      jqSelect.off("select2:open.streamSelect2").on("select2:open.streamSelect2", () => {
        const widget = jqSelect.data("select2");
        /**
         * Keep the open Select2 dropdown within the visible viewport.
         * @returns {void}
         */
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
        jqSelect.one("select2:closing.streamSelect2", () => $(window).off("resize", fitDropdown));
        fitDropdown();
      });
    }

    /**
     * Connect declared font fields to the shared picker; the form remains authoritative.
     * @returns {void}
     */
    function initFontPickers() {
      if (!window.byFont || typeof window.byFont.picker !== "function") return;
      fields.forEach((field, index) => {
        if (parameterRules[field.name]?.type !== "font") return;
        // The picker may replace the original node; later validation must use the replacement control.
        fields[index] = byFont.picker(field, {
          initSelect2,
          fallback: '"Courier New", Courier, monospace',
          emptyFont: parameterRules[field.name].default,
          weight: form.elements.fontWeight || 700,
          previewText: "Stream preview · Aa Bb 0123456789"
        });
        const empty = [...fields[index].options].find((option) => option.value === "");
        if (empty) {
          if (parameterRules[field.name].default === "") empty.text = "Off";
          else empty.remove();
          $(fields[index]).trigger("change.select2");
        }
      });
    }

    // ==========
    // ==== ORDERED LIST AND MAP EDITORS ====
    // ==========

    const platformIcons = new Map();
    /**
     * Build a platform icon, falling back to a globe when its Font Awesome glyph is unavailable.
     * @param {string} platform Supported social platform identifier.
     * @returns {jQuery} jQuery wrapper for the affected elements.
     */
    function platformIcon(platform) {
      if (platformIcons.has(platform)) return platformIcons.get(platform);
      const jqIcon = $(/* HTML */ `<i></i>`)
        .addClass(Object.hasOwn(byStream.platforms, platform) ? `fa-brands fa-${platform}` : "fa-solid fa-globe")
        .prop("hidden", true)
        .appendTo(form);
      // Probe the loaded Font Awesome CSS; known platforms may lack a glyph in that version.
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
     * Edit rows while preserving the resource's declared JSON shape in one hidden field.
     * Initial data selects map versus array; newEntry selects string versus object rows for arrays.
     * Maps require unique keys, and visible row order becomes serialized data order.
     * The resource validates the final value; this widget owns editing and serialization only.
     * @param {string} name Hidden form field holding the serialized list.
     * @param {Object|Array<Object|string>} entries Initial map or array, restored on Reset.
     * @param {Object} options Optional choices/key, text field key/label/type triples, defaults, and row limit.
     * @param {Object<string, string>} options.choices Stored choice IDs mapped to their displayed labels.
     * @param {string} options.choiceKey Entry property that stores the chosen ID.
     * @param {Array<Array<string>>} options.textFields Entry property names paired with their labels.
     * @param {Object} options.newEntry Initial value for a newly added entry.
     * @param {number} [options.limit=100] Maximum number of accepted entries.
     * @returns {void}
     */
    function initEntryEditor(name, entries, { choices, choiceKey, textFields, newEntry, limit = 100 }) {
      const jqOutput = $(form.elements[name]);
      const jqSection = jqOutput.closest(".entry-editor");
      const jqEditor = jqSection.find(".entry-list");
      const jqAdd = jqSection.find(".add-entry");
      // Keep the opening value separate from editable rows so Reset can rebuild it without mutation.
      const initial = structuredClone(entries);
      const map = !Array.isArray(initial);
      const strings = typeof newEntry === "string";
      jqOutput.prop("defaultValue", JSON.stringify(initial));

      /**
       * Append one editable entry row and bind its changes to the canonical serialized field.
       * @param {unknown} entry One entry in the declared content format.
       * @returns {jQuery} The appended editor row.
       */
      function addRow(entry) {
        const jqRow = $(/* HTML */ `<div class="entry-row p-2 mb-2 border border-secondary-subtle bg-body-tertiary"></div>`).html(/* HTML */ `
          <div class="d-flex align-items-center gap-1 mb-1">
            <i class="entry-icon text-primary fa-fw fa-solid fa-calendar-days" aria-hidden="true"></i>
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
        jqSelect.val(map ? entry[0] : entry[choiceKey]);
        textFields.forEach(([key, title, type = "text"], index) => {
          const value = map ? entry[choices ? 1 : index] : strings ? entry : entry[key];
          const input = $(/* HTML */ `<input />`, {
            type,
            step: type === "datetime-local" ? "1" : undefined,
            maxlength: 160,
            "data-field": key,
            "aria-label": title,
            placeholder: title,
            class: "form-control rounded-0 bg-body-secondary border-secondary-subtle"
          })
            .val(type === "datetime-local" ? localTimestamp(value) : value)
            .appendTo(jqRow);
          input.wrap(/* HTML */ `<span class="input-group mb-1"></span>`);
          $(/* HTML */ `<span class="input-group-text"></span>`)
            .append(
              $(/* HTML */ `<i></i>`)
                .addClass(`fa-solid ${fieldIcon(key, { type })} fa-fw`)
                .attr("aria-hidden", "true")
            )
            .insertBefore(input);
        });
        jqRow.appendTo(jqEditor);
        if (choiceKey === "platform") {
          initSelect2(jqSelect, { templateResult: platformOption, templateSelection: platformOption });
        } else if (choices) initSelect2(jqSelect);
        jqRow.prop("hidden", true);
        setVisible(jqRow, true);
        return jqRow;
      }
      // Serialize the current row order for validation and URL generation.
      /**
       * Synchronize the enhanced control with its canonical input value.
       * @returns {void}
       */
      function sync() {
        const jqRows = jqEditor.children(":not([inert])");
        // Serialize DOM order back into the original map, string-array, or object-array shape.
        const values = jqRows.get().map((row, index) => {
          const jqRow = $(row);
          jqRow.find('[data-action="up"]').prop("disabled", index === 0);
          jqRow.find('[data-action="down"]').prop("disabled", index === jqRows.length - 1);
          if (map)
            return [
              ...(choices ? [jqRow.find("select").val()] : []),
              ...jqRow
                .find("input")
                .get()
                .map((input) => input.value)
            ];
          if (strings) return jqRow.find("input").val();
          const entry = choices ? { [choiceKey]: jqRow.find("select").val() } : {};
          jqRow.find("input").each(function () {
            const jqInput = $(this);
            const value = jqInput.val();
            entry[jqInput.data("field")] = jqInput.is('[type="datetime-local"]') && value ? utcTimestamp(value) : value;
          });
          return entry;
        });
        // Repeated platform rows are valid arrays; duplicate map keys would silently erase earlier rows.
        const duplicate = map && new Set(values.map(([key]) => key)).size !== values.length;
        jqOutput.val(duplicate ? "" : JSON.stringify(map ? Object.fromEntries(values) : values));
        jqRows.find("input").each(function () {
          this.setCustomValidity("");
        });
        jqRows.find("input")[0]?.setCustomValidity(duplicate ? "Use a different key for each row." : byStream.validParameter(parameterRules, name, jqOutput.val()) ? "" : "Invalid list. Check the entries or remove rows.");
        jqAdd.prop("disabled", jqRows.length >= limit);
      }
      function reset(entries = initial) {
        const height = jqEditor[0].getBoundingClientRect().height;
        // Bypass the deferred exit during destruction so Select2 releases its positioning listeners.
        jqEditor.find("select").each(function () {
          if ($(this).data("select2")) $(this).off(".streamMotion").select2("close").select2("destroy");
        });
        jqEditor.empty();
        (map ? Object.entries(entries) : entries).forEach(addRow);
        sync();
        resizeContainers(new Map([[jqEditor[0], height]]));
      }
      jqEditor.on("input change", "input, select", sync).on("click", "[data-action]", function () {
        const jqRow = $(this).closest(".entry-row");
        const action = $(this).data("action");
        if (action === "remove") {
          jqRow.find("input, select, button").prop("disabled", true);
          setVisible(jqRow, false).then((finished) => {
            if (!finished) return;
            const jqSelect = jqRow.find("select");
            if (jqSelect.data("select2")) jqSelect.off(".streamMotion").select2("close").select2("destroy");
            jqRow.remove();
            sync();
          });
        } else if (action === "up") jqRow.insertBefore(jqRow.prevAll(":not([inert])").first());
        else jqRow.insertAfter(jqRow.nextAll(":not([inert])").first());
        sync();
        generateURL();
      });
      jqAdd.on("click", () => {
        if (jqEditor.children(":not([inert])").length >= limit) return;
        const jqRow = addRow(newEntry);
        jqRow.find(".select2-selection, select:not(.select2-hidden-accessible), input").first().trigger("focus");
        sync();
        generateURL();
      });
      // Native Reset restores controls after its event; rebuild rows on the next task.
      jqForm.on("reset", () => setTimeout(reset, 0));
      jqOutput.on("change", () => reset(settings[name]));
      reset();
    }

    // ==========
    // ==== APPEARANCE, TIMESTAMP, AND REGIONAL WIDGETS ====
    // ==========

    /**
     * Convert the datetime-local editor value to the absolute UTC string stored in settings.
     * @param {string} value Raw form or URL value to validate or format.
     * @returns {string} Absolute ISO timestamp, or an empty string when the local input is invalid.
     */
    function utcTimestamp(value) {
      const date = new Date(value);
      return Number.isFinite(date.getTime()) ? date.toISOString() : "";
    }

    /**
     * Convert an absolute timestamp to this computer's wall time for datetime-local controls.
     * @param {string} value Raw form or URL value to validate or format.
     * @returns {string} Local datetime-local text, or an empty string for an invalid timestamp.
     */
    function localTimestamp(value) {
      const date = new Date(value);
      if (!Number.isFinite(date.getTime())) return "";
      return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 19);
    }

    /**
     * Presets reuse ordinary field changes, including validation and URL generation.
     * @returns {void}
     */
    function initAppearancePresets() {
      const jqLabel = $(/* HTML */ `<label class="config-field form-label d-flex flex-column gap-1 w-100 mb-3"></label>`).prependTo(jqForm.find('[data-config-section="Appearance"]').children(".accordion-body"));
      $(/* HTML */ `<span class="field-caption small"></span>`).text("Appearance preset").prepend($(/* HTML */ `<i class="fa-solid fa-palette fa-fw text-primary me-2" aria-hidden="true"></i>`)).appendTo(jqLabel);
      const jqSelect = $(/* HTML */ `<select class="form-select rounded-0 bg-body-secondary border-secondary-subtle"></select>`).appendTo(jqLabel);
      for (const [value, title] of [
        ["", "Custom"],
        ["studio", "Studio"],
        ["minimal", "Minimal"],
        ["light", "Light ink"]
      ])
        $(/* HTML */ `<option></option>`).val(value).text(title).appendTo(jqSelect);
      const presets = {
        studio: { backgroundColor: "#202020E6", textColor: "#FFFFFF", accentColor: "#D9D9D9" },
        minimal: { backgroundColor: "#00000000", textColor: "#FFFFFF", accentColor: "#D9D9D9" },
        light: { backgroundColor: "#FFFFFFE6", textColor: "#202020", accentColor: "#404040" }
      };
      jqSelect.on("change", () => {
        for (const [name, value] of Object.entries(presets[jqSelect.val()] || {})) {
          const field = form.elements[name];
          if (!field) continue;
          $(field).val(value).trigger("change");
        }
      });
      jqForm.on("input", (event) => {
        if (event.target !== jqSelect[0]) jqSelect.val("").trigger("change.select2");
      });
    }

    /**
     * Native pickers use the editor computer's zone and serialize absolute UTC timestamps.
     * @param {Array<string>} names Field names to initialize.
     * @returns {void}
     */
    function initTimestampFields(names) {
      for (const name of names) {
        const jqField = $(form.elements[name]);
        if (!jqField.length) continue;
        const initial = jqField.val();
        const title = jqField.closest("label").find(".field-caption").text() || name;
        // The visible picker uses local wall time; the named hidden input keeps absolute UTC for URLs.
        jqField.attr({ type: "hidden", "data-title": title });
        const jqPicker = $(/* HTML */ `<input type="datetime-local" step="1" required />`)
          .attr({ class: `${jqField.attr("class")} timestamp-picker`, "aria-label": title })
          .insertBefore(jqField);
        const jqNote = $(/* HTML */ `<small class="text-body-secondary"></small>`).text("Choose in this computer’s time zone. The URL stores an absolute time.").insertAfter(jqPicker);
        const jqNow = $(/* HTML */ `<button type="button" class="btn btn-sm btn-outline-primary align-self-start"></button>`)
          .text("Use current time")
          .prepend($(/* HTML */ `<i class="fa-solid fa-clock me-2" aria-hidden="true"></i>`))
          .attr("aria-label", `Use current time for ${title}`)
          .insertAfter(jqNote);
        const sync = () => jqPicker.val(localTimestamp(jqField.val()));
        jqField.on("change", sync);
        jqPicker.on("input", () => jqField.val(utcTimestamp(jqPicker.val())).trigger("input"));
        jqNow.on("click", () => {
          jqField.val(new Date().toISOString());
          sync();
          jqField.trigger("input");
        });
        // Restore hidden defaults before native Reset and the shared URL refresh.
        jqForm.on("reset", () => {
          jqField.val(initial);
          sync();
        });
        sync();
        jqPicker.prop("defaultValue", jqPicker.val());
      }
    }

    const localeCodes = `af-ZA am-ET ar-AE ar-BH ar-DZ ar-EG ar-IQ ar-JO ar-KW ar-LB ar-LY ar-MA ar-OM ar-QA ar-SA ar-SD ar-SY ar-TN ar-YE
      as-IN az-AZ be-BY bg-BG bn-BD bn-IN bo-CN bs-BA ca-ES cs-CZ cy-GB da-DK de-AT de-CH de-DE de-LI de-LU
      el-CY el-GR en-AU en-CA en-GB en-GH en-HK en-IE en-IN en-KE en-NG en-NZ en-PH en-PK en-SG en-US en-ZA
      es-AR es-BO es-CL es-CO es-CR es-CU es-DO es-EC es-ES es-GQ es-GT es-HN es-MX es-NI es-PA es-PE es-PR es-PY es-SV es-US es-UY es-VE
      et-EE eu-ES fa-IR fi-FI fil-PH fo-FO fr-BE fr-CA fr-CH fr-FR fr-LU ga-IE gl-ES gu-IN ha-NG he-IL hi-IN hr-HR hu-HU hy-AM
      id-ID ig-NG is-IS it-CH it-IT ja-JP ka-GE kk-KZ km-KH kn-IN ko-KR ky-KG lo-LA lt-LT lv-LV mk-MK ml-IN mn-MN mr-IN ms-MY mt-MT my-MM
      nb-NO ne-NP nl-BE nl-NL nn-NO or-IN pa-IN pl-PL ps-AF pt-AO pt-BR pt-MZ pt-PT ro-MD ro-RO ru-RU si-LK sk-SK sl-SI so-SO sq-AL
      sr-Cyrl-RS sr-Latn-RS sv-FI sv-SE sw-KE sw-TZ ta-IN ta-LK te-IN th-TH tr-TR uk-UA ur-PK uz-UZ vi-VN yo-NG zh-CN zh-HK zh-SG zh-TW zu-ZA`.split(/\s+/);
    const regionalChoices = new Map();

    /**
     * Keep IANA identifiers and locale tags in URLs; descriptions belong only to the picker.
     * @param {string} value Raw form or URL value to validate or format.
     * @param {string} locale Locale tag, or whether to declare the locale field.
     * @returns {string}
     */
    function regionalLabel(value, locale) {
      if (locale) {
        const description = new Intl.DisplayNames("en", { type: "language", languageDisplay: "standard" }).of(new Intl.Locale(value).baseName).replace(/\s\((.*)\)$/, " - $1");
        return `${value} (${description})`;
      }
      const offset = new Intl.DateTimeFormat("en", { timeZone: value, timeZoneName: "longOffset" }).formatToParts().find((part) => part.type === "timeZoneName").value;
      return `${value} (${offset === "GMT" ? "+00:00" : offset.replace("GMT", "")})`;
    }

    /**
     * Enhance a hidden canonical field with a searchable zone, locale, or multi-zone Select2 control.
     * The hidden field owns serialization; labels are display-only and Reset/imports resynchronize the picker.
     * Multi-zone selection preserves the user's selection order and stores it as newline-separated IDs.
     * @param {string} name Field or item identifier.
     * @returns {void}
     */
    function initRegionalField(name) {
      const jqField = $(form.elements[name]);
      if (!jqField.length || jqField.next("[data-regional-picker]").length) return;
      const locale = parameterRules[name].type === "locale";
      const multiple = parameterRules[name].type === "timezones";
      const validate = locale ? parseLocale : parseZone;
      const placeholder = multiple ? "Choose up to three time zones" : locale ? "Browser locale" : "OBS computer time zone";
      // Build display labels once per picker kind; URLs still contain only the original locale/zone IDs.
      if (!regionalChoices.has(locale)) {
        const codes = locale
          ? [...navigator.languages, ...localeCodes]
          : ["UTC", Intl.DateTimeFormat().resolvedOptions().timeZone, ...(Intl.supportedValuesOf?.("timeZone") || ["America/Bogota", "America/New_York", "Europe/London", "Asia/Tokyo"])];
        regionalChoices.set(
          locale,
          [...new Set(codes)].sort().map((value) => [value, regionalLabel(value, locale)])
        );
      }
      const jqSelect = $(/* HTML */ `<select class="form-select rounded-0 bg-body-secondary border-secondary-subtle"></select>`)
        .attr({ id: `${jqField.attr("id")}-picker`, "data-regional-picker": name, "aria-label": parameterRules[name].label })
        .prop("multiple", multiple)
        .insertAfter(jqField);
      if (!multiple) jqSelect.append(new Option(placeholder, ""));
      for (const [value, label] of regionalChoices.get(locale)) jqSelect.append(new Option(label, value));
      jqField.prop("hidden", true);

      /**
       * Synchronize the enhanced control with its canonical input value.
       * @returns {void}
       */
      const sync = () => {
        const values = multiple ? jqField.val().split("\n").filter(Boolean) : [jqField.val()];
        for (const value of values) {
          let option = [...jqSelect[0].options].find((option) => option.value === value);
          if (!option) {
            option = new Option(regionalLabel(value, locale), value);
            jqSelect.append(option);
          }
          // DOM order controls the order of Select2's multiple selections.
          if (multiple) jqSelect.append(option);
        }
        jqSelect.val(multiple ? values : values[0]).trigger("change.select2");
      };
      jqField.on("change", sync);
      jqSelect.on("change", (event) => {
        event.stopPropagation();
        let value = jqSelect.val();
        if (multiple) {
          // Keep surviving selections in their prior order, then append newly selected zones.
          const selected = value || [];
          const previous = jqField
            .val()
            .split("\n")
            .filter((zone) => selected.includes(zone));
          value = [...previous, ...selected.filter((zone) => !previous.includes(zone))].join("\n");
        }
        jqField.val(value).trigger("change");
      });
      initSelect2(jqSelect, {
        placeholder,
        allowClear: true,
        maximumSelectionLength: multiple ? 3 : 0,
        tags: true,
        createTag: ({ term }) => {
          const value = validate(term.trim());
          return value ? { id: value, text: regionalLabel(value, locale) } : null;
        }
      });
      jqForm.on("reset", () => setTimeout(sync, 0));
      sync();
    }

    // ==========
    // ==== THEME, ACCESSIBILITY, AND COLORS ====
    // ==========

    /**
     * Persist the editor preference; byCommon applies the theme and button state.
     * @returns {void}
     */
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

    /**
     * Keep Pickr, editable hex colors, and form Reset in sync without discarding alpha.
     * @returns {void}
     */
    function initColorPickers() {
      for (const input of fields) {
        if (parameterRules[input.name]?.type !== "color") continue;
        const jqInput = $(input);
        const title = `${jqInput.closest("label").text().trim() || input.name} picker`;
        const jqSwatch = $(/* HTML */ `<span class="input-group-text p-1"><span></span></span>`);
        jqInput.wrap(/* HTML */ `<span class="input-group"></span>`).before(jqSwatch);
        const optional = parameterRules[input.name].optional;
        jqInput.addClass("font-monospace").attr("placeholder", optional && !parameterRules[input.name].default ? "Off" : parameterRules[input.name].default);
        const picker = Pickr.create({
          el: jqSwatch.children()[0],
          theme: "classic",
          position: "bottom-start",
          default: parameterRules[input.name].default || "#FFFFFF",
          defaultRepresentation: "HEX",
          components: { preview: true, opacity: true, hue: true, interaction: { input: true, save: true, clear: !!optional } }
        });
        $(picker.getRoot().button).attr({ "aria-label": title, title });
        let syncing = false;
        // Pickr can emit change while applying a color or its format.
        /**
         * Reflect the canonical color value in the Pickr widget without creating a separate settings value.
         * @returns {void}
         */
        function syncPicker() {
          const text = jqInput.val();
          const value = optional && !text ? null : `#${text.replace(/^#/, "")}`;
          // Programmatic picker updates must not feed back into a new canonical input change.
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
            if (syncing || !color) return;
            jqInput.val(color.toHEXA().toString()).trigger("input");
          })
          .on("save", () => picker.hide())
          .on("clear", () => {
            if (optional) jqInput.val("").trigger("input");
          });
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
    // ==== EDITOR PREFERENCES AND COMPRESSION ====
    // ==========

    /**
     * Persist UI state with the last valid generated query unless a new valid query is supplied.
     * @param {string} [query=savedPreferences.query] Query string or query data for this operation.
     * @returns {void}
     */
    function savePreferences(query = savedPreferences.query) {
      // Section/compression edits reuse the last accepted query, never an invalid in-progress form.
      savedPreferences = {
        query,
        advanced: {
          enabled: $("#short-url").prop("checked"),
          scope: $('input[name="compression-scope"]:checked').val(),
          fields: $("[data-compress-field]:checked")
            .map((_, input) => input.value)
            .get()
        },
        collapsed: jqForm
          .find(".accordion-collapse:not(.show)")
          .map((_, section) => section.dataset.configSection)
          .get()
      };
      const value = JSON.stringify(savedPreferences);
      // Scope cookies to the tool folder; a root cookie for every tool would enlarge all requests.
      const cookie = `${preferenceKey}=${encodeURIComponent(value)};max-age=31536000;path=${preferencePath}`;
      try {
        if (location.protocol !== "file:" && cookie.length <= 4000) {
          document.cookie = cookie;
          if (global.get_cookie(preferenceKey) === encodeURIComponent(value)) {
            try {
              // Reads prefer local storage; discard that fallback only after verifying the cookie.
              localStorage.removeItem(preferenceKey);
            } catch {}
            return;
          }
        }
      } catch {
        // Try local storage when cookies are unavailable.
      }
      try {
        localStorage.setItem(preferenceKey, value);
      } catch {}
    }

    /**
     * Show compression controls for the selected mode without changing any resource field values.
     * @returns {void}
     */
    function syncCompressionOptions() {
      setVisible($("#compression-options"), $("#short-url").prop("checked"));
      setVisible($("#compression-selection"), $('input[name="compression-scope"]:checked').val() === "selected");
    }

    /**
     * Restore the link's compression format or saved preferences; capture Reset defaults only at startup.
     * @param {string} search Encoded query string to decode.
     * @param {Set<string>} selected Field names using individual URL compression.
     * @param {boolean} [saveDefaults=false] Also replace the native Reset baseline.
     * @returns {void}
     */
    function loadCompressionOptions(search, selected, saveDefaults = false) {
      const all = new URLSearchParams(search).has("data");
      // A compressed URL declares its own format; otherwise restore this resource's preference.
      const saved = !all && !selected.size ? savedPreferences.advanced : null;
      $("#short-url").prop("checked", !$("#short-url").prop("disabled") && (saved ? saved.enabled : all || selected.size > 0));
      $('input[name="compression-scope"]').each(function () {
        this.checked = this.value === (saved ? saved.scope : all || !selected.size ? "all" : "selected");
      });
      $("[data-compress-field]").each(function () {
        const rule = parameterRules[this.value];
        this.checked = saved ? saved.fields.includes(this.value) : selected.size ? selected.has(this.value) : typeof rule.default === "object" && rule.default !== null;
      });
      if (saveDefaults)
        $('#short-url, input[name="compression-scope"], [data-compress-field]').each(function () {
          this.defaultChecked = this.checked;
        });
      syncCompressionOptions();
    }

    // ==========
    // ==== HELP DIALOG AND PARAMETER REFERENCE ====
    // ==========

    /**
     * Build one help modal, generate parameter documentation, and bind editor shortcuts/hash navigation.
     * Shared panels come from this file; resource integrations may extend the modal through initResourceHelp.
     * @param {function(HTMLElement, Object<string, string>, Function): void} [initResourceHelp] Adds extra help panels and sections.
     * @returns {void}
     */
    function initHelpDialog(initResourceHelp) {
      const jqDialog = $(/* HTML */ `<div id="config-help" class="config-help modal fade" tabindex="-1" aria-labelledby="help-title"></div>`)
        .html(/* HTML */ `
          <div class="modal-dialog modal-lg modal-dialog-scrollable">
            <div class="modal-content rounded-0">
              <nav class="d-flex flex-wrap align-items-center gap-2 p-3 bg-dark text-white modal-header flex-shrink-0" aria-label="Configurator sections">
                <a href="https://byuwur.github.io/" target="_blank" rel="noopener" aria-label="[Mateus] byUwUr"><img src="https://byuwur.github.io/img/logo.png" alt="" /></a>
                <button class="btn btn-sm btn-outline-light border-0" type="button" data-section="info" aria-keyshortcuts="F1"><i class="fa-solid fa-circle-info me-1" aria-hidden="true"></i>About</button>
                <button class="btn btn-sm btn-outline-light border-0" type="button" data-section="obs"><i class="fa-solid fa-desktop me-1" aria-hidden="true"></i>Use with OBS</button>
                <button class="btn btn-sm btn-outline-light border-0" type="button" data-section="params" aria-keyshortcuts="Alt+Shift+P"><i class="fa-solid fa-file-lines me-1" aria-hidden="true"></i>Parameters</button>
                <button class="btn btn-sm btn-outline-light border-0" type="button" data-section="advanced" aria-keyshortcuts="Alt+Shift+A"><i class="fa-solid fa-gear me-1" aria-hidden="true"></i>Advanced</button>
                <button type="button" class="help-close btn btn-sm btn-outline-light border-0 ms-auto fs-4" aria-label="Close dialog">&times;</button>
              </nav>
              <header class="help-heading bg-primary px-3 px-md-4 py-3 text-white flex-shrink-0"><h2 class="h2 m-0" id="help-title"></h2></header>
              <article class="modal-body d-grid align-content-start p-3 p-md-4 overflow-y-auto">
                <section data-panel="info">
                  <p>
                    Made by
                    <a href="https://byuwur.github.io/" target="_blank" rel="noopener"><img class="inline-logo" src="https://byuwur.github.io/img/favicon.png" alt="" />[Mateus] byUwUr</a>. Free. Forever.
                  </p>
                  <p>
                    You can <a href="https://streamlabs.com/byuwur" target="_blank" rel="noopener"><i class="fa-solid fa-hand-holding-heart" aria-hidden="true"></i>tip</a>,
                    <a href="https://twitch.tv/byuwur" target="_blank" rel="noopener"><i class="fa-brands fa-twitch" aria-hidden="true"></i>subscribe</a> or
                    <a href="https://paypal.me/byuwur" target="_blank" rel="noopener"><i class="fa-brands fa-paypal" aria-hidden="true"></i>donate</a>.
                  </p>
                  <p>
                    Download the
                    <a href="https://github.com/byuwur/stream.html" target="_blank" rel="noopener"><i class="fa-brands fa-github" aria-hidden="true"></i>source code</a>
                    to use the overlays locally. Keep each tool's assets together. Libraries and configurator styling load from jsDelivr and require internet access.
                  </p>
                  <section class="mt-4 pt-3 border-top border-secondary-subtle" aria-labelledby="keyboard-shortcuts-title">
                    <h3 id="keyboard-shortcuts-title" class="h5 mb-3"><i class="fa-solid fa-keyboard me-2" aria-hidden="true"></i>Keyboard shortcuts</h3>
                    <div class="table-responsive">
                      <table class="table table-sm align-middle mb-2" aria-labelledby="keyboard-shortcuts-title">
                        <thead>
                          <tr>
                            <th scope="col">Shortcut</th>
                            <th scope="col">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <th scope="row" class="fw-normal text-nowrap"><kbd>F1</kbd></th>
                            <td>Open About and this shortcut reference</td>
                          </tr>
                          <tr>
                            <th scope="row" class="fw-normal text-nowrap"><kbd>F2</kbd></th>
                            <td>Switch between configurator and overlay mode</td>
                          </tr>
                          <tr>
                            <th scope="row" class="fw-normal text-nowrap"><kbd>Alt</kbd> + <kbd>Shift</kbd> + <kbd>P</kbd></th>
                            <td>Open Parameters</td>
                          </tr>
                          <tr>
                            <th scope="row" class="fw-normal text-nowrap"><kbd>Alt</kbd> + <kbd>Shift</kbd> + <kbd>A</kbd></th>
                            <td>Open Advanced options</td>
                          </tr>
                          <tr>
                            <th scope="row" class="fw-normal text-nowrap"><kbd>Alt</kbd> + <kbd>Shift</kbd> + <kbd>O</kbd></th>
                            <td>Open the current overlay in a new tab</td>
                          </tr>
                          <tr>
                            <th scope="row" class="fw-normal text-nowrap"><kbd>Alt</kbd> + <kbd>Shift</kbd> + <kbd>C</kbd></th>
                            <td>Copy the overlay URL</td>
                          </tr>
                          <tr>
                            <th scope="row" class="fw-normal text-nowrap"><kbd>Alt</kbd> + <kbd>Shift</kbd> + <kbd>U</kbd></th>
                            <td>Focus and select the overlay URL</td>
                          </tr>
                          <tr>
                            <th scope="row" class="fw-normal text-nowrap"><kbd>Alt</kbd> + <kbd>Shift</kbd> + <kbd>M</kbd></th>
                            <td>Open the tool picker</td>
                          </tr>
                          <tr>
                            <th scope="row" class="fw-normal text-nowrap"><kbd>Esc</kbd></th>
                            <td>Close the current dialog, popover, or dropdown</td>
                          </tr>
                          <tr>
                            <th scope="row" class="fw-normal text-nowrap"><kbd>Tab</kbd> / <kbd>Shift</kbd> + <kbd>Tab</kbd></th>
                            <td>Move between controls</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    <p class="small text-body-secondary mb-0">Focus the configurator to use its shortcuts.</p>
                  </section>
                </section>
                <section data-panel="obs" hidden>
                  <ol class="ps-4">
                    <li class="mb-3">Adjust the parameters and check the live preview.</li>
                    <li class="mb-3">Click <strong>Copy URL</strong>.</li>
                    <li class="mb-3">In OBS, add a <strong>Browser</strong> source and paste the link into its <strong>URL</strong> field.</li>
                  </ol>
                  <p class="help-dimensions"></p>
                  <p>For a downloaded overlay, paste the complete <code>file:///</code> URL with <strong>Local file</strong> unchecked. Keep the folder at that location.</p>
                  <p>To edit settings later, focus the overlay and press <kbd>F2</kbd>, or append <code>#configure</code> to its URL.</p>
                </section>
                <section data-panel="params" hidden>
                  <p>Settings are stored in the generated URL. Use the documented values below; missing values use the tool's defaults. Use public display information only.</p>
                  <p>Colors use 3, 4, 6, or 8 hex digits without <code>#</code>; malformed colors are left to the browser.</p>
                  <div class="help-parameters"></div>
                </section>
                <section data-panel="advanced" hidden>
                  <h3 class="h5 mb-3">URL options</h3>
                  <div class="form-check form-switch d-flex align-items-center gap-3 p-0 mb-2">
                    <input id="short-url" class="form-check-input fs-4 float-none m-0 flex-shrink-0" type="checkbox" role="switch" aria-describedby="short-url-help url-summary" />
                    <label class="form-check-label fw-semibold" for="short-url"><i class="fa-solid fa-compress fa-fw me-2" aria-hidden="true"></i>Shorter URL</label>
                  </div>
                  <fieldset id="compression-options" class="border-0 p-0 m-0 mb-4" hidden>
                    <legend class="fs-6 fw-semibold mb-2">
                      What to compress
                      <button
                        id="compression-help"
                        class="btn btn-sm border-0 text-body-secondary p-1 ms-1"
                        type="button"
                        data-bs-toggle="popover"
                        data-bs-placement="bottom"
                        data-bs-title="Compression options"
                        data-bs-content="All settings uses one data parameter. Selected fields keep their parameter names and get a dr: compressed value. Unchecked fields remain directly editable in the URL. Readable parameters added to an all-settings link override its stored settings."
                        aria-label="How compression options work">
                        <i class="fa-solid fa-circle-info" aria-hidden="true"></i>
                      </button>
                    </legend>
                    <div class="d-flex flex-wrap gap-3 mb-3">
                      <label class="d-flex align-items-center gap-2"><input class="form-check-input m-0" type="radio" name="compression-scope" value="all" /><i class="fa-solid fa-compress" aria-hidden="true"></i>All settings</label>
                      <label class="d-flex align-items-center gap-2"
                        ><input class="form-check-input m-0" type="radio" name="compression-scope" value="selected" /><i class="fa-solid fa-list-check" aria-hidden="true"></i>Selected fields</label
                      >
                    </div>
                    <div id="compression-selection" hidden>
                      <label class="form-label w-100" for="compression-search"
                        ><i class="fa-solid fa-magnifying-glass fa-fw me-2" aria-hidden="true"></i>Find a field
                        <input id="compression-search" type="search" class="form-control mt-1" placeholder="Search by label or parameter" />
                      </label>
                      <div id="compression-field-list" class="compression-fields overflow-auto border p-3"></div>
                      <p id="compression-empty" class="small mt-2 mb-0" hidden>No matching fields.</p>
                    </div>
                  </fieldset>
                  <p id="url-summary" class="fw-semibold mb-3" role="status" aria-live="polite"></p>
                  <aside class="p-3 bg-body-tertiary border-start border-3 border-primary" aria-label="Edit a saved overlay">
                    <p class="fw-semibold mb-1"><i class="fa-solid fa-keyboard me-2" aria-hidden="true"></i>Edit a saved overlay</p>
                    <p class="mb-0">Focus the overlay and press <kbd>F2</kbd>, or append <code>#configure</code> to its URL.</p>
                  </aside>
                  <p id="url-load-error" class="text-danger mt-3 mb-0" role="alert" hidden></p>
                  <div class="border-top mt-4 pt-4">
                    <h3 class="h5 mb-2">Resource defaults</h3>
                    <p>Restore every setting for this resource and clear its saved configuration.</p>
                    <button id="restore-defaults" class="btn btn-outline-danger" type="button"><i class="fa-solid fa-rotate-left me-2" aria-hidden="true"></i>Restore resource defaults</button>
                  </div>
                </section>
              </article>
            </div>
          </div>
        `)
        .appendTo("body");
      const modal = bootstrap.Modal.getOrCreateInstance(jqDialog[0]);
      const helpButton = $("#compression-help");
      const popover = typeof global.Popper?.createPopper === "function" ? bootstrap.Popover.getOrCreateInstance(helpButton[0], { trigger: "focus", container: jqDialog[0], animation: false }) : null;
      if (!popover) helpButton.removeAttr("data-bs-toggle").attr("title", helpButton.attr("data-bs-content"));
      helpButton.on("keydown", (event) => {
        if (event.key !== "Escape" || !popover || !helpButton.attr("aria-describedby")) return;
        event.stopPropagation();
        popover.hide();
      });
      let helpTrigger;
      let helpOpen = false;
      const groups = new Map();
      // Build compression choices from the same field metadata as the form, preserving its groups.
      Object.entries(parameterRules).forEach(([name, rule], index) => {
        const section = rule.section || "Settings";
        if (!groups.has(section)) {
          const group = $(/* HTML */ `<fieldset class="border-0 p-0 m-0 mb-3"></fieldset>`).appendTo("#compression-field-list");
          $(/* HTML */ `<legend class="fs-6 fw-semibold mb-2"></legend>`).text(section).appendTo(group);
          groups.set(section, group);
        }
        const label = $(/* HTML */ `<label class="compression-field d-flex align-items-start gap-2 mb-2"></label>`).appendTo(groups.get(section));
        $(/* HTML */ `<input class="form-check-input float-none m-0 mt-1 flex-shrink-0" type="checkbox" data-compress-field />`)
          .attr({ id: `compress-field-${index}`, value: name })
          .appendTo(label);
        const caption = $(/* HTML */ `<span class="text-break"></span>`)
          .text(rule.label || name)
          .prepend(
            $(/* HTML */ `<i></i>`)
              .addClass(`fa-solid ${fieldIcon(name, rule)} fa-fw me-2`)
              .attr("aria-hidden", "true")
          )
          .appendTo(label);
        $(/* HTML */ `<code class="d-block small"></code>`).text(name).appendTo(caption);
      });
      jqDialog.on("change", '#short-url, input[name="compression-scope"], [data-compress-field]', () => {
        syncCompressionOptions();
        savePreferences();
        generateURL();
      });
      // Factory reset clears persisted state and reloads; normal form Reset keeps the opening baseline.
      $("#restore-defaults").on("click", () => {
        urlGeneration++;
        try {
          localStorage.removeItem(preferenceKey);
        } catch {}
        try {
          document.cookie = `${preferenceKey}=;max-age=0;path=${preferencePath}`;
        } catch {}
        const url = new URL(location.href);
        url.search = "";
        url.hash = "configure";
        history.replaceState(null, "", url);
        location.reload();
      });
      $("#compression-search").on("input", function () {
        const term = this.value.trim().toLowerCase();
        $(".compression-field").each(function () {
          this.hidden = !this.textContent.toLowerCase().includes(term);
        });
        for (const group of groups.values())
          group.prop(
            "hidden",
            group
              .find(".compression-field")
              .get()
              .every((label) => label.hidden)
          );
        $("#compression-empty").prop(
          "hidden",
          [...groups.values()].some((group) => !group.prop("hidden"))
        );
      });
      if (typeof CompressionStream !== "function" || typeof DecompressionStream !== "function") {
        $("#short-url").prop({ checked: false, disabled: true });
        $("#short-url-help").append(" Shorter URLs are not supported by this browser.");
      }
      loadCompressionOptions(location.search, compressedFields, true);
      if (parameterError) $("#url-load-error").text(parameterError).prop("hidden", false);
      $("#advanced-options").on("click", () => {
        bootstrap.Tooltip.getInstance($("#advanced-options")[0])?.hide();
        showSection("advanced");
      });
      jqHost.find('.settings-toolbar [data-bs-toggle="tooltip"]').attr({ "data-bs-placement": "bottom", "data-bs-fallback-placements": '["bottom"]' });
      jqHost.find('#bywr-accessibility [data-bs-toggle="tooltip"]').attr({ "data-bs-placement": "left", "data-bs-fallback-placements": '["left"]' });
      if (typeof global.Popper?.createPopper === "function") byCommon.initBootstrap({ tooltipsOnly: true, root: jqHost[0] });
      else $("#advanced-options").removeAttr("data-bs-toggle");
      const previewSize = $("#preview-viewport")[0].viewBox.baseVal;
      jqDialog.find(".help-dimensions").text(`The preview uses ${previewSize.width} x ${previewSize.height} pixels. Use those source dimensions as a starting point and adjust them to your layout.`);
      // Generate defaults, constraints, and examples from live rules so help stays aligned with resources.
      const jqParameters = jqDialog.find(".help-parameters");
      const acceptedTypes = {
        color: "Hex color: 3, 4, 6, or 8 digits; omit # in URLs",
        url: "URL or relative asset path",
        font: "Font family or CSS font stack",
        datetime: "Absolute ISO 8601 timestamp",
        timezone: "IANA time zone; empty uses the local zone",
        timezones: "Up to three IANA time zones, separated by newlines",
        locale: "BCP 47 locale tag; empty uses the browser locale",
        entries: "JSON matching this field's default structure",
        mapping: "Input mapping JSON array"
      };
      for (const name of Object.keys(parameterRules)) {
        const rule = parameterRules[name] || {};
        const [title, defaultValue, values, example] = [
          rule.label || name,
          rule.type === "color" ? String(rule.default).replace(/^#/, "") : typeof rule.default === "object" ? JSON.stringify(rule.default) : (rule.default ?? "Empty"),
          (rule.options && Object.keys(rule.options).join(", ")) || (rule.min !== undefined ? `${rule.min} to ${rule.max}` : acceptedTypes[rule.type] || "Text"),
          rule.type === "color" ? String($(form.elements.namedItem(name)).val()).replace(/^#/, "") : ($(form.elements.namedItem(name)).val() ?? "")
        ];
        const jqDefinition = $(/* HTML */ `<section class="definition border mb-3 p-3 bg-body-tertiary"></section>`).appendTo(jqParameters);
        $(/* HTML */ `<h3 class="h5 mb-2 d-flex flex-wrap align-items-center gap-2"></h3>`)
          .text(title)
          .prepend(
            $(/* HTML */ `<i></i>`)
              .addClass(`fa-solid ${fieldIcon(name, rule)} fa-fw`)
              .attr("aria-hidden", "true")
          )
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

      const titles = { info: "About", obs: "Use with OBS", params: "Parameters", advanced: "Advanced options" };
      initResourceHelp?.(jqDialog[0], titles, closeHelp);
      jqDialog.find('[data-panel="info"]').append(/* HTML */ `
        <section class="small mt-4 pt-3 border-top border-secondary-subtle" aria-labelledby="release-contributions-title">
          <h3 id="release-contributions-title" class="h6 mb-3"><i class="fa-brands fa-github me-2" aria-hidden="true"></i>Early access &amp; contributions</h3>
          <p>
            <i class="fa-solid fa-triangle-exclamation me-1" aria-hidden="true"></i>
            All overlays are prerelease. Alpha means early testing; Beta means broader testing. Features may change, and bugs are expected. Try your setup before going live.
          </p>
          <p class="mb-0">
            Help improve stream.html on GitHub:
            <a href="https://github.com/byuwur/stream.html/pulls" target="_blank" rel="noopener"><i class="fa-solid fa-code-pull-request me-1" aria-hidden="true"></i>contribute a pull request</a> or
            <a href="https://github.com/byuwur/stream.html/issues" target="_blank" rel="noopener"><i class="fa-solid fa-bug me-1" aria-hidden="true"></i>report an issue</a>. Bug reports, ideas, and fixes are welcome.
          </p>
        </section>
      `);
      jqDialog.find("[data-panel]").addClass("motion-layer");
      let helpSectionGeneration = 0;
      /**
       * Open the requested help panel and synchronize the navigation hash.
       * @param {string} section Section identifier or label.
       * @returns {Promise<void>} Resolves after selecting the requested page or a newer request supersedes it.
       */
      async function showSection(section) {
        if (jqDialog.hasClass("show") && jqDialog.find('[data-section][aria-current="page"]').data("section") === section) return;
        const generation = ++helpSectionGeneration;
        popover?.hide();
        // Switching tabs in an open dialog must not replace the element that should regain focus.
        if (!jqDialog.hasClass("show")) helpTrigger = document.activeElement;
        jqDialog.find("#help-title").text(titles[section]);
        jqDialog.find("[data-section]").removeClass("active").removeAttr("aria-current").filter(`[data-section="${section}"]`).addClass("active").attr("aria-current", "page");
        if (location.hash !== `#${section}`) location.hash = section;
        const panels = jqDialog.find("[data-panel]");
        if (!jqDialog.hasClass("show")) {
          panels.prop({ hidden: true, inert: true }).filter(`[data-panel="${section}"]`).prop({ hidden: false, inert: false });
          modal.show();
          return;
        }
        // Exit before entering so text from different help pages never overlaps.
        await Promise.all(
          panels
            .filter(`[data-panel!="${section}"]`)
            .get()
            .map((panel) => setVisible(panel, false))
        );
        if (generation !== helpSectionGeneration || !jqDialog.hasClass("show")) return;
        jqDialog.find("article").scrollTop(0);
        setVisible(panels.filter(`[data-panel="${section}"]`), true);
      }
      function closeHelp() {
        modal.hide();
      }
      jqDialog.on("click", "[data-section]", function () {
        showSection($(this).data("section"));
      });
      $(document).on("keydown", async (event) => {
        if (event.originalEvent?.repeat || event.originalEvent?.isComposing || event.isDefaultPrevented() || event.ctrlKey || event.metaKey) return;
        if (event.key === "F1" && !event.altKey && !event.shiftKey) {
          event.preventDefault();
          showSection("info");
          return;
        }
        if (event.key === "F2" && !event.altKey && !event.shiftKey) {
          if (global !== global.top) return;
          event.preventDefault();
          const url = await currentOverlayURL();
          if (!url) return;
          if (!url.search) {
            // Overlay mode requires a query; bare tool links otherwise reopen the editor.
            url.search = sameResourceURL(url) && savedPreferences.query ? savedPreferences.query : settingsURL(resource, Object.fromEntries(Object.entries(parameterRules).map(([name, rule]) => [name, rule.default]))).search;
          }
          location.assign(url.href);
          return;
        }
        if (!event.altKey || !event.shiftKey || !["KeyP", "KeyA", "KeyO", "KeyC", "KeyU", "KeyM"].includes(event.code)) return;
        event.preventDefault();
        switch (event.code) {
          case "KeyP":
            showSection("params");
            return;
          case "KeyA":
            showSection("advanced");
            return;
          case "KeyO":
            if ($("#copy-url").prop("disabled")) return urlEdited ? $("#overlay-url")[0].reportValidity() : reportEditorValidity();
            $("#preview-url")[0].click();
            return;
          case "KeyC":
            await copyURL();
            return;
        }
        const focusControl = () => {
          if (event.code === "KeyU") $("#overlay-url").trigger("focus").trigger("select");
          else if ($("#tool-picker").data("select2")) $("#tool-picker").select2("open");
          else $("#tool-picker").trigger("focus");
        };
        if (helpOpen) {
          // Bootstrap ignores hide() during opening; retry after shown, then move focus after hidden.
          jqDialog.one("shown.bs.modal", closeHelp).one("hidden.bs.modal", () => {
            jqDialog.off("shown.bs.modal", closeHelp);
            focusControl();
          });
          closeHelp();
        } else focusControl();
      });
      jqDialog.find(".help-close").on("click", closeHelp);
      jqDialog
        .on("show.bs.modal", () => {
          helpOpen = true;
        })
        .on("hidden.bs.modal", () => {
          helpOpen = false;
          if (helpTrigger?.isConnected) helpTrigger.focus();
        })
        .on("hide.bs.modal", () => {
          popover?.hide();
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
      jqDialog.find(".modal-header [data-section]").each((_, tab) => {
        const section = tab.dataset.section;
        jqLinks.append(" \u00b7 ");
        $(/* HTML */ `<a></a>`, { href: `#${section}`, text: section === "params" ? "Parameter reference" : tab.textContent.trim(), class: "link-body-emphasis" }).appendTo(jqLinks);
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

    /**
     * Search and navigate the homepage's tool order without adding navigation to overlay settings.
     * @returns {void}
     */
    function initTools() {
      $(".home-link").attr("href", homeURL);
      const jqSelect = $("#tool-picker").empty();
      if (!jqSelect.length) return;
      $(/* HTML */ `<option></option>`).val("").text("Choose a tool").appendTo(jqSelect);
      byConfigurator.catalog.availableTools.forEach((tool) => {
        $(/* HTML */ `<option></option>`)
          .val(tool.id)
          .text(`${tool.name} (${tool.status})`)
          .attr({ "data-name": tool.name, "data-status": tool.status, "data-icon": tool.icon, "data-category": byConfigurator.catalog.categories.find((category) => category.id === tool.category).name })
          .appendTo(jqSelect);
      });
      const current = jqSelect.closest(".tool-switcher").data("tool");
      jqSelect.val(byConfigurator.catalog.availableTools.some((tool) => tool.id === current) ? current : "");

      function toolOption(option) {
        if (!option.id) return option.text;
        const label = $(/* HTML */ `<span></span>`);
        const title = $(/* HTML */ `<span class="d-inline-flex align-items-center mw-100"></span>`).appendTo(label);
        $(/* HTML */ `<i></i>`, { class: `fa-solid ${$(option.element).attr("data-icon")} fa-fw flex-shrink-0 me-2`, "aria-hidden": "true" }).appendTo(title);
        title.append(
          $(/* HTML */ `<span></span>`, { class: "tool-name text-truncate", text: $(option.element).attr("data-name") }),
          $(/* HTML */ `<span class="resource-status badge rounded-pill border fw-normal align-middle flex-shrink-0 ms-2"></span>`).text($(option.element).attr("data-status"))
        );
        return label;
      }
      /**
       * Keep categories visible without grouping away the homepage's priority order.
       * @param {Object} option Select2 option data.
       * @returns {jQuery|string}
       */
      function toolResult(option) {
        const label = toolOption(option);
        if (option.id) $(/* HTML */ `<small></small>`, { class: "tool-category", text: $(option.element).attr("data-category") }).appendTo(label);
        return label;
      }
      initSelect2(jqSelect, {
        placeholder: "Choose a tool",
        selectionCssClass: "bg-transparent border border-light rounded-0 h-auto",
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
    // ==== EDITOR MOTION, FIELD VISIBILITY AND VALIDATION ====
    // ==========

    /**
     * Reveal visible field groups with the library fade and a short horizontal transition.
     * One layout read starts the whole batch; completed effects remove their temporary classes.
     * @param {HTMLElement|jQuery} container Newly opened group or conditional field wrapper.
     * @returns {void}
     */
    function revealFields(container) {
      const controls = $(container)
        .find(".config-field")
        .addBack(".config-field")
        .filter(function () {
          // A closed group can briefly have dimensions while editor styles are still loading.
          return $(this).is(":visible") && !$(this).parents("[hidden], [inert], .collapse:not(.show)").length;
        });
      if (!controls.length) return;
      controls.off(".fieldReveal").removeClass("animate__animated animate__fadeIn").addClass("motion-enter");
      void controls[0].offsetWidth;
      controls.addClass("animate__animated animate__fadeIn").on("animationend.fieldReveal animationcancel.fieldReveal", function (event) {
        if (event.target !== this) return;
        // A replay can cancel an earlier effect; a hidden field needs cleanup instead.
        if (event.type === "animationcancel" && $(this).is(":visible")) return;
        $(this).off(".fieldReveal").removeClass("motion-enter animate__animated animate__fadeIn");
      });
    }

    /**
     * Expand or collapse either group type, applying the latest request after an active transition.
     * @param {HTMLElement} element Section or subsection collapse container.
     * @param {boolean} expanded Requested final state.
     * @returns {void}
     */
    function setExpanded(element, expanded) {
      const collapse = bootstrap.Collapse.getOrCreateInstance(element, { toggle: false });
      const apply = () => {
        $(element).off(".settingsExpand");
        collapse[expanded ? "show" : "hide"]();
      };
      $(element).off(".settingsExpand");
      if (element.classList.contains("collapsing")) $(element).one("shown.bs.collapse.settingsExpand hidden.bs.collapse.settingsExpand", apply);
      else apply();
    }

    /**
     * Use the shared when rules to disable and hide inactive fields and their descendants.
     * Controls retain drafts for re-enabling; applyParameters() resets their effective renderer values.
     * @returns {void}
     */
    function syncFieldVisibility() {
      // Availability follows current form drafts; settings still contains the last accepted values.
      const values = Object.fromEntries(fields.map((input) => [input.name, input.type === "checkbox" ? (input.checked ? input.value : input.dataset.uncheckedValue) : input.value]));
      const changes = [];
      for (const input of fields) {
        if (!parameterRules[input.name].when) continue;
        input.disabled = !fieldEnabled(parameterRules, values, input.name);
        $(input).siblings(".timestamp-picker, [data-regional-picker]").prop("disabled", input.disabled);
        const wrapper = $(input).closest(".conditional-field");
        changes.push([wrapper, !input.disabled]);
      }
      // Hide empty headings too, so disabled descendants do not leave blank groups in the form.
      jqForm.find(".field-subsection, [data-config-section]").each((_, container) => {
        const empty = !$(container)
          .find("[name]")
          .toArray()
          .some((input) => !input.disabled);
        const target = $(container).is("[data-config-section]") ? $(container).closest(".accordion-item") : $(container);
        changes.push([target, !empty]);
      });
      setVisibility(changes);
    }

    /**
     * Restore a cleared canonical control from resource defaults, then resynchronize its widgets.
     * Incomplete numeric input (such as a minus sign) is invalid input, not a request to reset.
     * List/mapping editors own their hidden values, including empty sentinels for invalid drafts.
     * @param {HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement} field Named form control.
     * @returns {void}
     */
    function restoreEmptyField(field) {
      if (field.value !== "" || field.type === "checkbox" || field.validity.badInput) return;
      const rule = parameterRules[field.name];
      if (["entries", "mapping"].includes(rule.type)) return;
      const value = rule.default;
      const text = typeof value === "object" ? JSON.stringify(value) : String(value);
      if (text === "") return;
      // Imported/custom defaults may not exist in a picker's initial option list.
      if (field.tagName === "SELECT" && ![...field.options].some((option) => option.value === text)) field.add(new Option(text, text));
      $(field).val(text).trigger("change");
    }

    /**
     * Sets a field's validation message using the active renderer's parameter rules.
     * @param {HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement} field Named form control.
     * @returns {boolean} Whether the control passes custom and native validation.
     */
    function validField(field) {
      if (field.disabled) {
        // A hidden dependent field must not keep an earlier error active or block URL generation.
        field.setCustomValidity("");
        return true;
      }
      const jqField = $(field);
      const valid = byStream.validParameter(parameterRules, field.name, jqField.val() ?? "");
      field.setCustomValidity(valid ? "" : "Enter a valid value for this setting.");
      // Hidden controls are excluded from native validation, including the account JSON.
      const accepted = field.checkValidity() && valid;
      if (!accepted) {
        jqField.parents(".accordion-collapse, .subsection-collapse").each((_, group) => setExpanded(group, true));
      }
      return accepted;
    }

    /**
     * Update existing controls; URL imports preserve the opening Reset baseline.
     * Only startup passes saveDefaults=true; later imports must not overwrite native defaultValue/defaultChecked.
     * @param {ResourceSettings} values Accepted settings to reflect in the existing form controls.
     * @param {boolean} [saveDefaults=false] Capture initial values as native Reset defaults.
     * @returns {void}
     */
    function setFields(values, saveDefaults = false) {
      $(fields).each(function () {
        const jqField = $(this);
        const value = values[this.name];
        if (jqField.is(":checkbox")) {
          const checked = String(value) === jqField.val();
          jqField.prop("checked", checked);
          if (saveDefaults) jqField.prop("defaultChecked", checked);
        } else {
          if (parameterRules[this.name].type === "font" && jqField.is("select") && ![...this.options].some((option) => option.value === value)) this.add(new Option(value, value));
          jqField.val(typeof value === "object" ? JSON.stringify(value) : value);
          // Imports update current values; only initial setup may change the native Reset baseline.
          if (!saveDefaults) return;
          if (jqField.is("select"))
            jqField.find("option").prop("defaultSelected", function () {
              return this.selected;
            });
          else jqField.prop("defaultValue", jqField.val());
        }
      });
    }

    // ==========
    // ==== EDITOR STARTUP AND EVENT HANDLERS ====
    // ==========

    /**
     * Replace settings from defaults plus an imported URL/JSON object, retaining widget lifetimes and Reset.
     * @param {URLSearchParams} values Validated/imported raw values; runtime rules resolve their effective values.
     * @returns {void}
     */
    function loadSettings(values) {
      const loaded = { ...resource.constants, ...Object.fromEntries(Object.entries(parameterRules).map(([name, field]) => [name, structuredClone(field.default)])) };
      byStream.applyParameters(parameterRules, loaded, values);
      Object.assign(settings, loaded);
      setFields(settings);
      // Widget handlers observe the replacement without bubbling a generation for every field.
      $(fields).each((_, field) => $(field).triggerHandler("change"));
    }

    // Capture Reset defaults before widgets replace controls, then enhance fields and bind edits once.
    try {
      setFields(settings, true);

      // Resource editor extensions reuse these services instead of creating separate widget/URL lifecycles.
      const editor = {
        generateURL,
        initEntryEditor,
        initAppearancePresets,
        initTimestampFields,
        initTimeZoneField: initRegionalField,
        platforms: byStream.platforms,
        initSelect2
      };
      const { initResourceHelp } = byConfigurator.configureResource?.(resource, editor) || {};
      for (const [name, field] of Object.entries(resource.fields)) {
        if (field.entries)
          initEntryEditor(name, settings[name], {
            ...field.entries,
            choices: field.entries.choices === "platforms" ? byStream.platforms : field.entries.choices
          });
        if (["timezone", "timezones", "locale"].includes(field.type)) initRegionalField(name);
      }
      if (resource.presets) initAppearancePresets();
      initTimestampFields(Object.keys(resource.fields).filter((name) => resource.fields[name].type === "datetime"));
      $("#accessibility-toggle").on("click", function (event) {
        event.preventDefault();
        const menu = $("#bywr-accessibility-buttons");
        const visible = menu.prop("hidden") || menu.hasClass("animate__fadeOut");
        setVisible(menu, visible);
        $(this).attr("aria-expanded", String(visible));
      });
      initTheme();
      initTools();
      initFontPickers();
      initHelpDialog(initResourceHelp);
      initColorPickers();
      jqForm.find("select").each((_, select) => initSelect2(select));
      // View requests also supersede earlier clicks while asynchronous validation is pending.
      let settingsViewGeneration = 0;
      // All editing surfaces share a revision so queued work cannot overwrite a newer draft.
      const generateURLDebounced = global.debounce((generation) => {
        if (generation === urlGeneration) generateURL();
      });
      const applyURLDebounced = global.debounce((generation) => {
        if (generation === urlGeneration) applyEditedURL(true);
      });
      $("[data-settings-view]").on("click", async function () {
        const generation = ++settingsViewGeneration;
        if ($(this).attr("aria-pressed") === "true") return;
        const valid = await currentOverlayURL();
        if (generation !== settingsViewGeneration) return;
        if (!valid) return reportEditorValidity();
        const json = this.dataset.settingsView === "json";
        jsonEdited = false;
        syncJSON();
        $("[data-settings-view]").removeClass("active btn-outline-primary").addClass("btn-outline-secondary").attr("aria-pressed", "false");
        $(this).removeClass("btn-outline-secondary").addClass("active btn-outline-primary").attr("aria-pressed", "true");
        const outgoing = json ? form : $("#settings-json-panel")[0];
        const incoming = json ? $("#settings-json-panel")[0] : form;
        setVisible(outgoing, false);
        jqHost.find(".settings-panel").toggleClass("json-view", json);
        setVisible($("#form-actions"), !json);
        $("#copy-json, #json-options").each((_, element) => setVisible(element, json));
        setVisible(incoming, true);
        if (!json) revealFields(jqForm);
        setMessage("#json-status", "");
      });
      $("[data-expand-sections]").on("click", function () {
        const expand = this.dataset.expandSections === "true";
        jqForm.find(".accordion-collapse").each((_, group) => {
          const applySubsections = () =>
            $(group)
              .find(".subsection-collapse")
              .each((_, subsection) => setExpanded(subsection, expand));
          $(group).off(".expandSubsections");
          // Expand children after the parent reaches auto height so neither transition clips the other.
          if (expand && (!group.classList.contains("show") || group.classList.contains("collapsing"))) {
            $(group).on("shown.bs.collapse.expandSubsections", function (event) {
              if (event.target !== group) return;
              $(group).off(".expandSubsections");
              applySubsections();
            });
          } else applySubsections();
          setExpanded(group, expand);
        });
      });
      $("#json-all-fields").on("change", async function () {
        const checked = this.checked;
        if (!(await currentOverlayURL())) {
          this.checked = !checked;
          return reportEditorValidity();
        }
        jsonEdited = false;
        syncJSON();
      });
      $(jsonInput)
        .on("input", (event) => {
          jsonEdited = true;
          urlEdited = false;
          setMessage("#json-status", "");
          const generation = ++urlGeneration;
          if (!event.originalEvent?.isComposing) generateURLDebounced(generation);
        })
        .on("compositionstart", () => urlGeneration++)
        .on("compositionend", () => generateURLDebounced(++urlGeneration))
        .on("change", async () => {
          if (!(await generateURL()) || document.activeElement === jsonInput) return;
          // Reformat only after leaving the editor; typing must preserve its draft and caret.
          jsonEdited = false;
          syncJSON();
        });
      $("#copy-json").on("click", async () => {
        if (!(await currentOverlayURL())) return;
        try {
          await navigator.clipboard.writeText(jsonInput.value);
          setMessage("#json-status", "Copied!");
        } catch {
          $(jsonInput).trigger("focus").trigger("select");
          setMessage("#json-status", "Press Ctrl+C (or Command+C) to copy the selected JSON.");
        }
      });
      jqForm
        .on("focusout", "[name]", function () {
          if (parameterRules[this.name]) restoreEmptyField(this);
        })
        .on("change", syncFieldVisibility)
        .on("show.bs.collapse hide.bs.collapse", ".accordion-collapse, .subsection-collapse", function (event) {
          if (event.target === this) $(this).removeData("heightEffect").removeClass("motion-resize");
        })
        .on("show.bs.collapse", ".accordion-collapse, .subsection-collapse", function (event) {
          if (event.target !== this) return;
          // Bootstrap makes the content visible after show; begin field feedback before the next paint.
          requestAnimationFrame(() => revealFields(this));
        })
        .on("shown.bs.collapse hidden.bs.collapse", ".accordion-collapse", () => savePreferences())
        .on("input change", (event) => {
          urlEdited = false;
          jsonEdited = false;
          const generation = ++urlGeneration;
          if (!event.originalEvent?.isComposing) generateURLDebounced(generation);
        })
        .on("compositionstart", () => urlGeneration++)
        .on("compositionend", () => generateURLDebounced(++urlGeneration))
        .on("submit", (event) => {
          event.preventDefault();
          generateURL();
          form.reportValidity();
        })
        .on("reset", () => {
          jsonEdited = false;
          urlEdited = false;
          urlGeneration++;
          setTimeout(() => {
            jqForm.find("select").trigger("change.select2");
            $('#short-url, input[name="compression-scope"], [data-compress-field]').each(function () {
              this.checked = this.defaultChecked;
            });
            if ($("#short-url").prop("disabled")) $("#short-url").prop("checked", false);
            $("#compression-search").val("").trigger("input");
            $("#short-url").trigger("change");
          }, 0);
        });
      $("#copy-url")
        .on("click", copyURL)
        .on("mouseleave focusout", () => $("#copy-url .copy-label").text("Copy URL"));
      $("#overlay-url")
        .on("input", function (event) {
          urlEdited = true;
          jsonEdited = false;
          urlGeneration++;
          const url = readEditorURL();
          if (url) url.hash = "";
          $("#preview-url").attr("href", url?.href || null);
          $("#copy-url").prop("disabled", !url);
          setMessage("#copy-status", url ? "URL changes apply after typing pauses." : "Enter a complete overlay URL.");
          if (!event.originalEvent?.isComposing) applyURLDebounced(urlGeneration);
        })
        .on("compositionstart", () => urlGeneration++)
        .on("compositionend", () => applyURLDebounced(urlGeneration))
        .on("change", () => applyEditedURL())
        .on("keydown", (event) => {
          if (event.key !== "Enter" || event.originalEvent?.isComposing) return;
          event.preventDefault();
          applyEditedURL();
        });
      $(window)
        .on("pagehide", () => {
          // Invalidate asynchronous work while leaving the document, including before bfcache storage.
          urlGeneration++;
        })
        .on("pageshow", generateURL);
      generateURL();
      revealFields(jqForm);
    } catch (error) {
      console.error("Error loading configurator:", error);
      $("body").text("Unable to load the tool. Check your internet connection and keep its local files together, then reload.");
    }
  };

  document.addEventListener("DOMContentLoaded", async () => {
    // Resource handlers may still be decoding compressed settings when DOMContentLoaded reaches us.
    await byStream.ready;
    const parameters = global.byStreamResource?.urlParameters;
    parameterError = parameters?.error || "";
    compressedFields = location.search ? parameters?.compressedFields || new Set() : new Set();
    byConfigurator.init();
  });

  byConfigurator.initialized = true;
})(window);
