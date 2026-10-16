/**
 * File: configurator.js
 * @file Shared native resource setup and jQuery editor, preview, help, theme, and navigation.
 * Editor deps: jQuery 4, Bootstrap 5, Select2, Pickr, and resource parameter rules.
 */

/** Own shared editor setup and navigation. */
(function (global) {
  global.byConfigurator = global.byConfigurator || {};
  const byConfigurator = global.byConfigurator;
  if (byConfigurator.init) return;
  const root = new URL(".", document.currentScript.src);
  let resourceReady = Promise.resolve();
  let parameterError = "";
  let compressedFields = new Set();
  const preferencePath = new URL(".", location.href).pathname;
  const preferenceKey = `stream.html.settings.${encodeURIComponent(preferencePath)}`;
  let savedPreferences = { query: "", advanced: null, collapsed: [] };

  /** Local storage holds configurations that cannot fit in a cookie and takes precedence. */
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

  /** Readable parameters override compressed values before normal field validation. */
  async function readURLParameters(fields, search = location.search) {
    const explicit = new URLSearchParams(search);
    const selectedFields = new Set();
    let errorMessage = "";
    let values = explicit;
    if (explicit.has("data")) {
      try {
        const compressed = new URLSearchParams(await global.decompress_url_data(explicit.get("data")));
        values = new URLSearchParams([...compressed].filter(([name]) => !explicit.has(name)));
        for (const [name, value] of explicit) values.append(name, value);
      } catch (error) {
        errorMessage = "Unable to read the shorter URL. Defaults and readable parameters were loaded.";
        console.warn(errorMessage, error);
      }
    }
    const decoded = new URLSearchParams();
    for (const [name, value] of values) {
      if (!Object.hasOwn(fields, name)) continue;
      if (value.startsWith("raw:")) decoded.append(name, value.slice(4));
      else if (value.startsWith("dr:")) {
        try {
          const maxBytes = fields[name].maxlength ? Math.min(1048576, Number(fields[name].maxlength) * 4) : 1048576;
          decoded.append(name, await global.decompress_url_data(value.slice(3), maxBytes));
          selectedFields.add(name);
        } catch (error) {
          errorMessage = "Some compressed fields could not be read. Their defaults were retained.";
          console.warn(`Unable to read compressed parameter ${name}:`, error);
        }
      } else decoded.append(name, value);
    }
    return { values: decoded, compressedFields: selectedFields, error: errorMessage };
  }

  // Native helpers are shared with renderers; editor setup starts below.
  const platforms = {
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
      if (rule.type === "color") parsed = `#${String(parsed).replace(/^#/, "")}`;
      settings[name] = parsed;
    }
  }

  /** Publish decoded settings before widgets; only bare editors restore saved form values. */
  function initResource(resource, integrations = {}) {
    const overlay = location.search.length > 1 && !location.hash;
    if (!overlay) savedPreferences = readPreferences(resource.fields);
    const search = !overlay && !location.search ? savedPreferences.query : location.search;
    resourceReady = readURLParameters(resource.fields, search).then((parameters) => {
      parameterError = parameters.error;
      compressedFields = location.search ? parameters.compressedFields : new Set();
      const settings = {
        ...resource.constants,
        ...Object.fromEntries(Object.entries(resource.fields).map(([name, field]) => [name, structuredClone(field.default)]))
      };
      applyParameters(resource.fields, settings, parameters.values);
      global.byStreamOverlay = overlay;
      global.addEventListener("hashchange", () => {
        if (overlay !== (location.search.length > 1 && !location.hash)) location.reload();
      });
      if (overlay) {
        document.documentElement.setAttribute("data-overlay", "");
        document.body.append(document.getElementById("overlay-markup").content.cloneNode(true));
        global.addEventListener("keydown", (event) => {
          if (global !== global.top) return;
          if (event.key !== "F2" || event.repeat || event.defaultPrevented || event.ctrlKey || event.altKey || event.metaKey || event.shiftKey) return;
          if (event.target?.isContentEditable || event.target?.matches?.("input, textarea, select")) return;
          event.preventDefault();
          location.hash = "configure";
        });
      }
      global.byStreamResource = { ...resource, settings, parameterRules: resource.fields, ...integrations };
      return settings;
    });
    return resourceReady;
  }

  /** Main accepts headings; Popup keeps only the platform and display handle. */
  function parseAccounts(value, withHeading = false) {
    if (value.length > 20000) return null;
    try {
      const entries = JSON.parse(value);
      if (!Array.isArray(entries) || entries.length > 100) return null;
      if (
        !entries.every(
          (entry) =>
            entry &&
            typeof entry.platform === "string" &&
            Object.hasOwn(platforms, entry.platform) &&
            typeof entry.handle === "string" &&
            entry.handle.length <= 160 &&
            (!withHeading || entry.heading === undefined || (typeof entry.heading === "string" && entry.heading.length <= 160))
        )
      )
        return null;
      return entries.map(({ platform, handle, heading = "" }) => (withHeading ? { platform, handle, heading } : { platform, handle }));
    } catch {
      return null;
    }
  }

  function parseZone(value) {
    if (value.length > 100) return null;
    if (!value) return "";
    try {
      new Intl.DateTimeFormat("en", { timeZone: value }).format();
      return value;
    } catch {
      return null;
    }
  }

  function parseLocale(value) {
    if (value.length > 50) return null;
    if (!value) return "";
    try {
      return Intl.getCanonicalLocales(value)[0] || "";
    } catch {
      return null;
    }
  }

  function parseZones(value) {
    if (value.length > 400) return null;
    const zones = value
      .split("\n")
      .map((x) => x.trim())
      .filter(Boolean);
    return zones.length <= 3 && zones.every((x) => parseZone(x) !== null) ? zones.join("\n") : null;
  }

  function parseTimestamp(value) {
    if (value.length > 40 || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/.test(value)) return null;
    const [year, month, day, hour, minute, second = 0] = value
      .match(/^([0-9]{4})-([0-9]{2})-([0-9]{2})T([0-9]{2}):([0-9]{2})(?::([0-9]{2}))?/)
      .slice(1)
      .map(Number);
    if (month < 1 || month > 12 || day < 1 || day > new Date(Date.UTC(year, month, 0)).getUTCDate() || hour > 23 || minute > 59 || second > 59 || !Number.isFinite(Date.parse(value))) return null;
    return value;
  }

  function safeImage(value) {
    if (!value) return true;
    try {
      const url = new URL(value, location.href);
      return ["http:", "https:", "file:"].includes(url.protocol) && (url.protocol !== "file:" || location.protocol === "file:") && !url.username && !url.password;
    } catch {
      return false;
    }
  }

  /** Align updates with the clock and pause them while the page is hidden. */
  function watch(update, interval = 1000) {
    let pending;
    function resume() {
      clearTimeout(pending);
      const keepUpdating = update() !== false;
      if (keepUpdating && !document.hidden) pending = setTimeout(resume, interval - (Date.now() % interval));
    }
    document.addEventListener("visibilitychange", resume);
    global.addEventListener("pagehide", () => clearTimeout(pending));
    global.addEventListener("pageshow", resume);
    resume();
  }

  Object.assign(byConfigurator, {
    platforms,
    validParameter,
    applyParameters,
    initResource,
    parseAccounts,
    parseZone,
    parseLocale,
    parseZones,
    parseTimestamp,
    safeImage,
    watch
  });

  if (document.getElementById("configurator") && location.search.length > 1 && !location.hash) return;

  if (typeof global.jQuery !== "function") {
    console.error("Unable to load configurator dependencies: jQuery is unavailable.");
    document.body.textContent = "Unable to load the configurator. Check your internet connection, then reload.";
    return;
  }
  const $ = global.jQuery;

  // ==========
  // ==== SHARED TOOL CATALOG ====
  // ==========

  /** Shared card and navigation metadata; only ready: true tools are published. */
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
      return this.tools.filter((tool) => tool.ready === true);
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
    let urlGeneration = 0;
    let urlEdited = false;

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
                  <select id="tool-picker" class="form-select rounded-0" aria-label="Choose a tool" aria-keyshortcuts="Alt+Shift+M"></select>
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
            <aside class="settings-panel h-100 flex-shrink-0 col-12 col-md-4 bg-body-tertiary p-3 overflow-y-auto border-end" aria-label="Overlay parameters">
              <h1 class="h4 mb-1"><i class="fa-solid fa-sliders me-2" aria-hidden="true"></i>This is the form.</h1>
              <p class="setup-intro text-body-secondary">Your next overlay starts here. Edit a field and watch the demo preview change.</p>
              <form id="overlay-form" data-configurator="" class="accordion"></form>
            </aside>
            <!-- Scaled view of the actual overlay. -->
            <section class="preview-panel h-100 order-first order-md-last flex-shrink-0 col-12 col-md-8 bg-body p-3 d-flex flex-column gap-2" aria-label="Overlay preview">
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
            <nav class="footer-links text-center" aria-label="Page navigation"></nav>
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
          const collapsed = savedPreferences.collapsed.includes(section);
          const group = $(/* HTML */ `<fieldset class="accordion-item mb-3 border border-secondary-subtle bg-body p-2"></fieldset>`).appendTo(jqForm);
          const heading = $(/* HTML */ `<button class="accordion-button" type="button" data-bs-toggle="collapse" aria-expanded="true"></button>`)
            .attr({ id: `${id}-toggle`, "data-bs-target": `#${id}`, "aria-controls": id, "aria-expanded": String(!collapsed) })
            .toggleClass("collapsed", collapsed)
            .text(section);
          if (resource.sectionIcons?.[section]) heading.prepend($(/* HTML */ `<i></i>`).addClass(`${resource.sectionIcons[section]} me-2`).attr("aria-hidden", "true"));
          $(/* HTML */ `<legend class="float-start w-100 fs-6 fw-semibold border-bottom pb-2 mb-2 text-primary"></legend>`).append(heading).appendTo(group);
          groups.set(
            section,
            $(/* HTML */ `<div class="accordion-collapse collapse show"></div>`)
              .attr({ id, "aria-labelledby": `${id}-toggle`, "data-config-section": section })
              .toggleClass("show", !collapsed)
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
        if (field.type === "switch") caption.add(control).wrapAll(/* HTML */ `<span class="d-flex align-items-center justify-content-between gap-3"></span>`);
        if (field.description) $(/* HTML */ `<small class="text-body-secondary"></small>`).text(field.description).appendTo(label);
        if (field.type === "entries") {
          const editor = $(/* HTML */ `<div class="entry-editor mb-3"></div>`).appendTo(container);
          label.addClass("d-none").appendTo(editor);
          $(/* HTML */ `<div class="entry-list"></div>`).appendTo(editor);
          $(/* HTML */ `<button type="button" class="add-entry btn btn-sm btn-outline-primary w-100"></button>`)
            .text(field.addLabel || "Add entry")
            .prepend(/* HTML */ `<i class="fa-solid fa-plus me-2" aria-hidden="true"></i>`)
            .appendTo(editor);
        }
        if (field.type === "mapping") $(/* HTML */ `<a href="#remap"></a>`).text("Configure input mapping").appendTo(label);
      }
    }

    // ==========
    // ==== URL GENERATION AND PREVIEW ====
    // ==========
    /**
     * Validates the form and updates its overlay URL and preview.
     * @param {boolean} [keepURLDraft=false] Preserve the URL text during automatic application.
     * @returns {Promise<boolean>} Whether the latest URL was generated from valid fields.
     */
    async function generateURL(keepURLDraft = false) {
      const generation = ++urlGeneration;
      urlEdited = keepURLDraft === true;
      $("#overlay-url")[0].setCustomValidity("");
      const valid = fields.map(validField).every(Boolean);
      if (!valid) {
        $("#overlay-url").val("");
        $("#preview-url").removeAttr("href");
        $("#copy-url").prop("disabled", true);
        $("#url-summary").text("Fix the highlighted parameter to generate a URL.");
        updateOverlayPreview(null);
        return false;
      }
      const values = new FormData(form);
      jqForm.find(":checkbox").each(function () {
        const jqField = $(this);
        values.set(this.name, jqField.prop("checked") ? jqField.val() : jqField.attr("data-unchecked-value"));
      });
      byConfigurator.applyParameters(parameterRules, settings, values);
      const readableURL = settingsURL(settings);
      let url = readableURL;
      let summary = `${url.href.length.toLocaleString()} characters. Parameters remain readable.`;
      const scope = $('input[name="compression-scope"]:checked').val();
      const selected = $("[data-compress-field]:checked")
        .map((_, input) => input.value)
        .get();
      if ($("#short-url").prop("checked") && scope === "selected" && !selected.length) {
        summary = `${url.href.length.toLocaleString()} characters. Select at least one field to compress.`;
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
            summary += scope === "selected" ? ` ${selected.length} ${selected.length === 1 ? "field" : "fields"} compressed; other parameters stay readable.` : " All settings are included.";
          } else summary = `${url.href.length.toLocaleString()} characters. The readable URL is already shorter.`;
        } catch (error) {
          console.warn("Unable to shorten the overlay URL:", error);
          summary = `Shorter URLs are unavailable. Using the readable URL (${url.href.length.toLocaleString()} characters).`;
        }
      }
      if (generation !== urlGeneration) return false;
      savePreferences(url.search.slice(1));
      if (!urlEdited) $("#overlay-url").val(url.href);
      $("#url-summary").text(summary);
      $("#preview-url").attr("href", url.href);
      $("#copy-url .copy-label").text("Copy URL");
      $("#copy-status").text("");
      $("#copy-url").prop("disabled", false);
      updateOverlayPreview(url.href);
      return true;
    }

    // Editing is debounced before URL generation; keep the last valid preview on invalid input.
    function updateOverlayPreview(url) {
      $("#preview-status").text(url ? "Changes update automatically." : "Fix the highlighted parameter to update the preview.");
      if (url && $("#overlay-preview").attr("src") !== url) {
        $("#overlay-preview").attr("src", url);
      }
    }

    function readEditorURL() {
      const input = $("#overlay-url")[0];
      input.setCustomValidity("");
      try {
        const url = new URL(input.value);
        if (!byConfigurator.safeImage(url.href)) throw new Error("Invalid overlay URL");
        return url;
      } catch {
        input.setCustomValidity("Enter a complete HTTP(S) overlay URL, or a local file URL when using downloaded tools.");
        return null;
      }
    }

    function sameResourceURL(url) {
      const pathname = (path) => (location.protocol === "file:" ? path : path.replace(/\/index\.html$/, "/"));
      return url.origin === location.origin && pathname(url.pathname) === pathname(location.pathname);
    }

    async function applyEditedURL(automatic = false) {
      if (!urlEdited) return;
      const url = readEditorURL();
      if (!url) {
        if (!automatic) $("#overlay-url")[0].reportValidity();
        return;
      }
      if (!sameResourceURL(url)) {
        if (automatic) {
          $("#copy-status").text("Press Enter or leave the field to open another tool.");
          return;
        }
        url.hash = "configure";
        location.assign(url.href);
        return;
      }
      const generation = ++urlGeneration;
      const parameters = await readURLParameters(parameterRules, url.search || savedPreferences.query);
      if (generation !== urlGeneration) return;
      const loaded = {
        ...resource.constants,
        ...Object.fromEntries(Object.entries(parameterRules).map(([name, field]) => [name, structuredClone(field.default)]))
      };
      byConfigurator.applyParameters(parameterRules, loaded, parameters.values);
      // Keep this document and its widget lifetimes; only the preview loads a new overlay.
      Object.assign(settings, loaded);
      setFields(settings);
      // Synchronize widgets without bubbling a separate URL generation for every field.
      $(fields).each((_, field) => $(field).triggerHandler("change"));
      loadCompressionOptions(url.search, url.search ? parameters.compressedFields : new Set());
      $("#url-load-error").text(parameters.error).prop("hidden", !parameters.error);
      await generateURL(automatic);
    }

    async function currentOverlayURL() {
      if (!urlEdited && !(await generateURL())) {
        form.reportValidity();
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

    async function copyURL() {
      const url = await currentOverlayURL();
      if (!url) return;
      const jqOutput = $("#overlay-url");
      jqOutput.val(url.href);
      try {
        await navigator.clipboard.writeText(url.href);
        $("#copy-url .copy-label, #copy-status").text("Copied!");
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

    const platformIcons = new Map();
    function platformIcon(platform) {
      if (platformIcons.has(platform)) return platformIcons.get(platform);
      const jqIcon = $(/* HTML */ `<i></i>`)
        .addClass(Object.hasOwn(byConfigurator.platforms, platform) ? `fa-brands fa-${platform}` : "fa-solid fa-globe")
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
        jqSelect.val(entry[choiceKey]);
        textFields.forEach(([key, title, type = "text"]) => {
          $(/* HTML */ `<input />`, {
            type,
            step: type === "datetime-local" ? "1" : undefined,
            maxlength: 160,
            "data-field": key,
            "aria-label": title,
            placeholder: title,
            class: "form-control rounded-0 bg-body-secondary border-secondary-subtle mb-1"
          })
            .val(type === "datetime-local" ? localTimestamp(entry[key]) : entry[key])
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
              entry[jqInput.data("field")] = jqInput.is('[type="datetime-local"]') && value ? utcTimestamp(value) : value;
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
      function reset(entries = initial) {
        jqEditor.find("select").each(function () {
          if ($(this).data("select2")) $(this).select2("close").select2("destroy");
        });
        jqEditor.empty();
        entries.forEach(addRow);
        sync();
      }
      jqEditor.on("input change", "input, select", sync).on("click", "[data-action]", function () {
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
      jqOutput.on("change", () => reset(settings[name]));
      reset();
    }

    function utcTimestamp(value) {
      const date = new Date(value);
      return Number.isFinite(date.getTime()) ? date.toISOString() : "";
    }

    function localTimestamp(value) {
      const date = new Date(value);
      if (!Number.isFinite(date.getTime())) return "";
      return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 19);
    }

    /** Presets edit ordinary declared fields; the URL remains authoritative. */
    function initAppearancePresets() {
      const jqLabel = $(/* HTML */ `<label class="form-label w-100"></label>`).text("Appearance preset").prependTo(jqForm);
      const jqSelect = $(/* HTML */ `<select class="form-select rounded-0 bg-body-secondary border-secondary-subtle mb-3"></select>`).appendTo(jqLabel);
      for (const [value, title] of [
        ["", "Custom"],
        ["studio", "Studio"],
        ["minimal", "Minimal"],
        ["light", "Light ink"]
      ])
        $(/* HTML */ `<option></option>`).val(value).text(title).appendTo(jqSelect);
      const presets = {
        studio: { backgroundColor: "#15151BE6", textColor: "#FFFFFF", accentColor: "#FF626D", shadow: 0.35 },
        minimal: { backgroundColor: "#00000000", textColor: "#FFFFFF", accentColor: "#FF626D", shadow: 0.5 },
        light: { backgroundColor: "#FFFFFFE6", textColor: "#15151B", accentColor: "#B51F36", shadow: 0.1 }
      };
      jqSelect.on("change", () => {
        for (const [name, value] of Object.entries(presets[jqSelect.val()] || {})) {
          const field = form.elements[name];
          if (!field) continue;
          $(field).val(value).trigger("change");
        }
        generateURL();
      });
      jqForm.on("input", () => jqSelect.val("").trigger("change.select2"));
    }

    /** Native pickers use the editor computer's zone and serialize absolute UTC timestamps. */
    function initTimestampFields(names) {
      for (const name of names) {
        const jqField = $(form.elements[name]);
        if (!jqField.length) continue;
        const initial = jqField.val();
        const title = jqField.closest("label").find(".field-caption").text() || name;
        jqField.attr({ type: "hidden", "data-title": title });
        const jqPicker = $(/* HTML */ `<input type="datetime-local" step="1" required />`)
          .attr({ class: `${jqField.attr("class")} timestamp-picker`, "aria-label": title })
          .insertBefore(jqField);
        const jqNote = $(/* HTML */ `<small class="text-body-secondary"></small>`).text("Choose in this computer’s time zone. The URL stores an absolute time.").insertAfter(jqPicker);
        const jqNow = $(/* HTML */ `<button type="button" class="btn btn-sm btn-outline-primary align-self-start"></button>`).text("Use current time").attr("aria-label", `Use current time for ${title}`).insertAfter(jqNote);
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

    function initTimeZoneField(name) {
      const jqField = $(form.elements[name]);
      if (!jqField.length) return;
      const jqList = $(/* HTML */ `<datalist></datalist>`).attr("id", `${name}-zones`).insertAfter(jqField);
      const zones = Intl.supportedValuesOf?.("timeZone") || ["America/Bogota", "America/New_York", "Europe/London", "Asia/Tokyo"];
      for (const zone of new Set(["UTC", Intl.DateTimeFormat().resolvedOptions().timeZone, ...zones])) $(/* HTML */ `<option></option>`).val(zone).text(zone).appendTo(jqList);
      jqField.attr("list", jqList.attr("id"));
    }

    // ==========
    // ==== THEME, ACCESSIBILITY, AND COLORS ====
    // ==========

    /** Persist the editor preference; byCommon applies the theme and button state. */
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

    /** Keep Pickr, editable hex colors, and form Reset in sync without discarding alpha. */
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
          default: parameterRules[input.name].default,
          defaultRepresentation: "HEX",
          components: { preview: true, opacity: true, hue: true, interaction: { input: true, save: true } }
        });
        $(picker.getRoot().button).attr({ "aria-label": title, title });
        let syncing = false;
        // Pickr can emit change while applying a color or its format.
        function syncPicker() {
          const text = jqInput.val();
          const value = `#${text.replace(/^#/, "")}`;
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

    function savePreferences(query = savedPreferences.query) {
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

    function syncCompressionOptions() {
      $("#compression-options").prop("hidden", !$("#short-url").prop("checked"));
      $("#compression-selection").prop("hidden", $('input[name="compression-scope"]:checked').val() !== "selected");
    }

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

    /**
     * Builds the Bootstrap help modal and synchronizes its sections with URL hashes.
     * @param {function(HTMLElement, Object<string, string>, Function): void} [initResourceHelp] Adds extra help panels and sections.
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
              <header class="help-heading px-3 px-md-4 py-3 text-white flex-shrink-0"><h2 class="h2 m-0" id="help-title"></h2></header>
              <article class="modal-body p-3 p-md-4 overflow-y-auto">
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
                    <li>Adjust the parameters and check the live preview.</li>
                    <li>Click <strong>Copy URL</strong>.</li>
                    <li>In OBS, add a <strong>Browser</strong> source and paste the link into its <strong>URL</strong> field.</li>
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
                    <input id="short-url" class="form-check-input float-none m-0 flex-shrink-0" type="checkbox" role="switch" aria-describedby="short-url-help url-summary" />
                    <label class="form-check-label fw-semibold" for="short-url">Shorter URL</label>
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
                      <label class="d-flex align-items-center gap-2"><input class="form-check-input m-0" type="radio" name="compression-scope" value="all" />All settings</label>
                      <label class="d-flex align-items-center gap-2"><input class="form-check-input m-0" type="radio" name="compression-scope" value="selected" />Selected fields</label>
                    </div>
                    <div id="compression-selection" hidden>
                      <label class="form-label w-100" for="compression-search"
                        >Find a field
                        <input id="compression-search" type="search" class="form-control mt-1" placeholder="Search by label or parameter" />
                      </label>
                      <div id="compression-field-list" class="compression-fields border p-3"></div>
                      <p id="compression-empty" class="small mt-2 mb-0" hidden>No matching fields.</p>
                    </div>
                  </fieldset>
                  <p id="url-summary" class="fw-semibold mb-3" role="status" aria-live="polite"></p>
                  <aside class="p-3 bg-body-tertiary border-start border-3 border-primary" aria-label="Edit a saved overlay">
                    <p class="fw-semibold mb-1"><i class="fa-solid fa-keyboard me-2" aria-hidden="true"></i>Edit a saved overlay</p>
                    <p class="mb-0">Focus the overlay and press <kbd>F2</kbd>, or append <code>#configure</code> to its URL.</p>
                  </aside>
                  <p id="url-load-error" class="text-danger mt-3 mb-0" role="alert" hidden></p>
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
          .appendTo(label);
        $(/* HTML */ `<code class="d-block small"></code>`).text(name).appendTo(caption);
      });
      jqDialog.on("change", '#short-url, input[name="compression-scope"], [data-compress-field]', () => {
        syncCompressionOptions();
        savePreferences();
        generateURL();
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
      if (typeof global.Popper?.createPopper === "function") byCommon.initBootstrap({ tooltipsOnly: true, root: jqHost[0] });
      else $("#advanced-options").removeAttr("data-bs-toggle");
      const previewSize = $("#preview-viewport")[0].viewBox.baseVal;
      jqDialog.find(".help-dimensions").text(`The preview uses ${previewSize.width} x ${previewSize.height} pixels. Use those source dimensions as a starting point and adjust them to your layout.`);
      const jqParameters = jqDialog.find(".help-parameters");
      const acceptedTypes = {
        color: "Hex color: 3, 4, 6, or 8 digits; omit # in URLs",
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
          rule.type === "color" ? String(rule.default).replace(/^#/, "") : typeof rule.default === "object" ? JSON.stringify(rule.default) : (rule.default ?? "Empty"),
          rule.options?.join(", ") || (rule.min !== undefined ? `${rule.min} to ${rule.max}` : acceptedTypes[rule.type] || "Text"),
          rule.type === "color" ? String($(form.elements.namedItem(name)).val()).replace(/^#/, "") : ($(form.elements.namedItem(name)).val() ?? "")
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

      const titles = { info: "About", obs: "Use with OBS", params: "Parameters", advanced: "Advanced options" };
      initResourceHelp?.(jqDialog[0], titles, closeHelp);
      function showSection(section) {
        popover?.hide();
        if (!jqDialog.hasClass("show")) helpTrigger = document.activeElement;
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
            url.search = sameResourceURL(url) && savedPreferences.query ? savedPreferences.query : settingsURL(Object.fromEntries(Object.entries(parameterRules).map(([name, rule]) => [name, rule.default]))).search;
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
            if ($("#copy-url").prop("disabled")) return urlEdited ? $("#overlay-url")[0].reportValidity() : form.reportValidity();
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
      const sections = { params: "Parameter reference", obs: "Use with OBS", advanced: "Advanced", info: "About" };
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
        .map(([name, value]) => {
          let text = typeof value === "object" ? JSON.stringify(value) : String(value);
          if (parameterRules[name].type === "color") text = text.replace(/^#/, "");
          if (text.startsWith("dr:") || text.startsWith("raw:")) text = `raw:${text}`;
          return [name, text];
        });
      const url = new URL(location.href);
      if (url.protocol !== "file:") url.pathname = url.pathname.replace(/\/index\.html$/, "/");
      url.hash = "";
      url.search = new URLSearchParams(values).toString().replace(/=raw%3A/g, "=raw:");
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

    /** Reflect settings without replacing controls or changing the original Reset values. */
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
          if (!saveDefaults) return;
          if (jqField.is("select"))
            jqField.find("option").prop("defaultSelected", function () {
              return this.selected;
            });
          else jqField.prop("defaultValue", jqField.val());
        }
      });
    }

    // Resource scripts publish their definitions before this deferred editor runs.
    try {
      setFields(settings, true);

      const editor = {
        generateURL,
        initEntryEditor,
        initAppearancePresets,
        initTimestampFields,
        initTimeZoneField,
        platforms: byConfigurator.platforms,
        initSelect2
      };
      const { initResourceHelp } = byConfigurator.configureResource?.(resource, editor) || {};
      for (const [name, field] of Object.entries(resource.fields)) {
        if (field.entries)
          initEntryEditor(name, settings[name], {
            ...field.entries,
            choices: field.entries.choices === "platforms" ? byConfigurator.platforms : field.entries.choices
          });
        if (field.type === "timezone") initTimeZoneField(name);
      }
      if (resource.presets) initAppearancePresets();
      initTimestampFields(Object.keys(resource.fields).filter((name) => resource.fields[name].type === "datetime"));
      initTheme();
      initAccessibility();
      initTools();
      initFontPickers();
      initHelpDialog(initResourceHelp);
      initColorPickers();
      jqForm.find("select").each((_, select) => initSelect2(select));
      const generateURLDebounced = global.debounce((generation) => {
        if (generation === urlGeneration) generateURL();
      });
      const applyURLDebounced = global.debounce((generation) => {
        if (generation === urlGeneration) applyEditedURL(true);
      });
      jqForm
        .on("shown.bs.collapse hidden.bs.collapse", ".accordion-collapse", () => savePreferences())
        .on("input change", (event) => {
          urlEdited = false;
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
        .on("reset", () =>
          setTimeout(() => {
            jqForm.find("select").trigger("change.select2");
            $('#short-url, input[name="compression-scope"], [data-compress-field]').each(function () {
              this.checked = this.defaultChecked;
            });
            if ($("#short-url").prop("disabled")) $("#short-url").prop("checked", false);
            $("#compression-search").val("").trigger("input");
            $("#short-url").trigger("change");
          }, 0)
        );
      $("#copy-url")
        .on("click", copyURL)
        .on("mouseleave focusout", () => $("#copy-url .copy-label").text("Copy URL"));
      $("#overlay-url")
        .on("input", function (event) {
          urlEdited = true;
          urlGeneration++;
          const url = readEditorURL();
          if (url) url.hash = "";
          $("#preview-url").attr("href", url?.href || null);
          $("#copy-url").prop("disabled", !url);
          $("#copy-status").text(url ? "URL changes apply after typing pauses." : "Enter a complete overlay URL.");
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
          urlGeneration++;
        })
        .on("pageshow", generateURL);
      generateURL();
    } catch (error) {
      console.error("Error loading configurator:", error);
      $("body").text("Unable to load the tool. Check your internet connection and keep its local files together, then reload.");
    }
  };

  document.addEventListener("DOMContentLoaded", async () => {
    await resourceReady;
    byConfigurator.init();
  });
})(window);
