/**
 * File: resource.js
 * @file Native resource fields, URL validation, styling, formatting, and overlay startup.
 * Dependencies: declared shared/resource imports; configurator-only libraries stay optional.
 * Resources own defaults and rendering. No configurator, jQuery, or editor UI is required.
 *
 * File map: shared field types; URL decoding and validation; field factories;
 * date/time formatting; native initialization; validators and clock updates; public helpers.
 */

/**
 * @typedef {string|number|boolean|Array<unknown>|Object|null} ResourceValue
 */

/**
 * Field metadata is shared by URL validation, native styling, and the optional editor.
 * Resource scripts own defaults and order; widgets enhance this same contract.
 * @typedef {Object} ResourceField
 * @property {string} type Control/value kind: text, multiline, number, select, switch, color, font, entries, mapping, timestamp, locale, timezone, or timezones.
 * @property {ResourceValue} [default] Resource default; missing/empty scalars receive a neutral default before use.
 * @property {string} label Human-readable control label.
 * @property {boolean|function(ResourceSettings): boolean} [image] Image input; a predicate limits uploads in mixed media fields.
 * @property {string} [description] Help text shown beside the control and in parameter help.
 * @property {string} [section] Top-level group; insertion order determines display order.
 * @property {string|string[]} [subsection] Nested control group inside the section.
 * @property {string} [id] Explicit HTML control identifier.
 * @property {string} [legacyParameter] Former URL or JSON key accepted when the current key is absent.
 * @property {string} [icon] Font Awesome icon class; overrides the shared icon rule.
 * @property {Object<string, string>} [options] Stored option IDs mapped to displayed labels.
 * @property {function(string): (ResourceValue|null)} [validate] Return accepted data or null to reject; no format migration is performed.
 * @property {boolean} [optional] Accept an empty string before numeric/color validation.
 * @property {number} [min] Minimum accepted numeric value.
 * @property {number} [max] Maximum accepted numeric value.
 * @property {number|string} [step] Numeric increment or "any".
 * @property {number} [sliderMin] Optional slider travel minimum; numeric validation still uses min.
 * @property {number} [sliderMax] Optional slider travel maximum; numeric validation still uses max.
 * @property {boolean} [choiceButtons] Display all select options as one row of choice buttons.
 * @property {number} [maxlength] Maximum accepted text or serialized-content length.
 * @property {string} [checkedValue] Serialized value when a switch is on.
 * @property {string} [uncheckedValue] Serialized value when a switch is off.
 * @property {Array<string>|function(ResourceSettings): boolean} [when] Parent and allowed values, or a predicate for combined conditions. Inactive ancestors disable descendants and their overrides.
 * @property {boolean} [retainInactive] Keep accepted inactive values in settings and editor preferences; inactive values remain omitted from overlay URLs and styles.
 * @property {Object} [entries] Row-editor choices, choiceKey, textFields, newEntry, limit, and addLabel; map selects a key/value representation.
 * @property {string} [styleSelector] Native elements affected by the override, including rows created later.
 * @property {string} [overflowSelector] Rendered text nodes whose line behavior this field controls.
 * @property {string} [layoutOverflow] Text overflow mode supplied by the resource's layout default.
 * @property {string} [styleProperty] CSS property written by the override.
 * @property {string} [styleUnit] Unit appended to scalar settings, such as px, deg, or %.
 * @property {ResourceValue} [styleDefault] Neutral generated value that leaves authored CSS unchanged.
 * @property {boolean} [zeroIsDefault] Normalize numeric zero to the declared default instead of a literal zero.
 * @property {function(ResourceSettings): string} [styleValue] Compound CSS writer; empty output keeps authored CSS.
 * @property {string} [styleParent] Container that needs flex layout when an order/layout override is applied.
 */

// @typedef {Object<string, ResourceField>} ResourceFields
// @typedef {Object<string, ResourceValue>} ResourceSettings

/**
 * One resource owns its field defaults, accepted values, and renderer.
 * initResource() publishes its validated settings before either overlay rendering or editor setup.
 * @typedef {Object} ResourceDefinition
 * @property {string} version Resource version shown by the editor.
 * @property {string} title Resource title.
 * @property {string} description Resource purpose shown above its settings.
 * @property {Array<number>} preview Preview width and height in pixels.
 * @property {ResourceFields} fields Parameter definitions in display order.
 * @property {ResourceSettings} [fieldDefaults] Resource-specific defaults for generated fields, keyed by field name.
 * @property {Object<string, {label: string, selector?: string, parent?: string, fields?: string[], groups?: string[], box?: boolean, container?: boolean, gap?: boolean, textOverflow?: boolean|string, when?: string[]|Function, motionItem?: string, motionLabel?: string}>} [elements] Visual parts in display order. A collection's motionItem identifies the child that animates for each entry.
 * @property {Array<string>} urlRequired Active parameters retained even at defaults to enable overlay mode and preserve anchors/content.
 * @property {function(URLSearchParams): void} [normalizeParameters] Migrate decoded legacy parameters before validation, including editor imports.
 * @property {string[]} [legacyFields] Retired URL keys accepted only for normalizeParameters().
 * @property {Object<string, ResourceValue>} [constants] Renderer-only defaults excluded from URL fields.
 * @property {string[]} [sectionOrder] Leading editor sections. Remaining sections follow in their usual order.
 * @property {Object<string, string>} [sectionIcons] Explicit icons for top-level sections.
 * @property {boolean|Object} [presets] Whether the editor exposes shared or resource-specific appearance presets.
 * @property {string} [previewAllow] iframe permissions required by this resource.
 * @property {ResourceSettings} [settings] Validated settings published by initResource().
 * @property {ResourceFields} [parameterRules] Published alias of fields for editor integrations.
 * @property {Object} [urlParameters] Decoded URL values, compression choices, and transport warning.
 */

(function (global) {
  global.byStream = global.byStream || {};
  const byStream = global.byStream;
  if (byStream.initialized) return;
  byStream.SPA_VERSION = "v20.17";
  const sharedImports = document.getElementById("shared-assets");
  const editorImports = document.getElementById("configurator-assets");
  const resourceImports = document.getElementById("resource-assets");
  // ===== ASSET LOADING =====
  /**
   * Resolve an external asset group's source; the shared SPA version overrides its HTML fallback.
   * @param {HTMLScriptElement} list JSON import group with data-source and data-spa-version.
   * @returns {string} Versioned dependency host.
   */
  function assetHost(list) {
    return `${list.dataset.source}@${byStream.SPA_VERSION || list.dataset.spaVersion}`;
  }
  async function loadResourceAssets() {
    if (!sharedImports && !resourceImports) return;
    if (typeof global.byLoad !== "function") {
      await new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = `${assetHost(sharedImports || resourceImports)}/_load.min.js`;
        script.charset = "UTF-8";
        script.async = false;
        script.defer = true;
        script.onload = resolve;
        script.onerror = () => reject(new Error(`Unable to load dependency loader: ${script.src}`));
        document.head.append(script);
      });
    }
    if (sharedImports)
      await global.byLoad(JSON.parse(sharedImports.textContent), {
        host: assetHost(sharedImports)
      });
    const overlay = !editorImports || (location.search.length > 1 && !location.hash);
    if (overlay && resourceImports)
      await global.byLoad(JSON.parse(resourceImports.textContent), {
        host: assetHost(resourceImports)
      });
  }
  // Browsers can abort imports before pagehide. Keep the outgoing renderer from starting.
  byStream.assetsReady = new Promise((resolve, reject) => {
    let leaving = false;
    function markLeaving() {
      leaving = true;
    }
    global.addEventListener("beforeunload", markLeaving, { once: true });
    loadResourceAssets()
      .then(resolve, (error) => {
        if (!leaving) reject(error);
      })
      .finally(() => global.removeEventListener("beforeunload", markLeaving));
  });
  // Resource handlers replace this before the optional editor's DOMContentLoaded handler awaits it.
  byStream.ready = byStream.assetsReady;
  const editorReady = (async () => {
    await byStream.assetsReady;
    if (location.search.length > 1 && !location.hash) return;
    try {
      await loadConfigurator();
    } catch (error) {
      console.warn(error);
      warnMissingConfigurator();
    }
  })();

  /**
   * Load the optional editor's external groups, local tags, and inline scripts in declared order.
   * Styles remain disabled until configure mode activates them; overlays never load this template.
   * @returns {Promise<void>} Resolves after required editor dependencies load; failures reject.
   */
  async function loadConfigurator() {
    if (!editorImports) return;
    for (const source of editorImports.content.children) {
      if (source.matches('script[type="application/json"][data-load]')) {
        const host = assetHost(source);
        const files = [];
        for (const file of JSON.parse(source.textContent)) {
          const entry = typeof file === "string" ? { path: file, optional: /\/fontawesome\.min\.css(?:[?#]|$)/i.test(file) } : file;
          files.push({ ...entry, path: entry.path.startsWith("/") ? `${host}${entry.path}` : entry.path });
        }
        for (const file of files) {
          if (/\.css(?:[?#]|$)/i.test(file.path)) file.attributes = { ...file.attributes, "data-editor-style": "", media: "not all" };
        }
        await global.byLoad(files);
        continue;
      }
      if (source.tagName === "SCRIPT" && !source.hasAttribute("src")) {
        // Inline scripts need a fresh task after DOMContentLoaded so resource handlers set ready first.
        await global.byLoad([]);
        await new Promise((resolve) => setTimeout(resolve, 0));
        const script = document.createElement("script");
        for (const attribute of source.attributes) script.setAttribute(attribute.name, attribute.value);
        script.textContent = source.textContent;
        document.head.append(script);
        continue;
      }
      if (source.tagName !== "SCRIPT" && source.tagName !== "LINK") {
        document.head.append(source.cloneNode(true));
        continue;
      }
      const attributes = Object.fromEntries([...source.attributes].filter((attr) => !["src", "href", "rel"].includes(attr.name)).map((attr) => [attr.name, attr.value]));
      if (source.tagName === "LINK") Object.assign(attributes, { "data-editor-style": "", media: "not all" });
      await global.byLoad([
        {
          path: source.getAttribute(source.tagName === "LINK" ? "href" : "src"),
          attributes,
          optional: source.hasAttribute("data-load-optional")
        }
      ]);
    }
  }

  let configuratorWarning = false;
  function warnMissingConfigurator() {
    if (global !== global.top || configuratorWarning) return;
    configuratorWarning = true;
    // console.warn("stream.HTML: The configurator is not included in this distribution. Configure this resource online: https://byuwur.github.io/stream.html/ - Repository: https://github.com/byuwur/stream.html");
    console.warn("stream.HTML: The configurator is not included in this distribution. Configure this resource online: https://stream.byuwur.co/ - Repository: https://github.com/byuwur/stream.html");
    /*
    const warning = document.createElement("aside");
    warning.id = "configurator-warning";
    warning.setAttribute("role", "alert");
    warning.style.cssText = "position:fixed;inset:16px 16px auto;z-index:2147483647;padding:16px;background:#111;color:#eee;border:1px solid #eee;font:16px/1.5 sans-serif";
    warning.textContent = "The configurator is not included in this standalone resource. Edit these settings in the ";
    const editor = document.createElement("a");
    const tool = document.documentElement.dataset.tool;
    const url = new URL(tool === "template" ? "configurator.html" : `${tool}/`, "https://byuwur.github.io/stream.html/");
    url.search = location.search;
    url.hash = "configure";
    editor.href = url.href;
    editor.textContent = "official hosted editor";
    const repository = document.createElement("a");
    repository.href = "https://github.com/byuwur/stream.html";
    repository.textContent = "repository";
    for (const link of [editor, repository]) link.style.color = "#eee";
    warning.append(editor, " or download the editor files from the ", repository, ".");
    document.body.append(warning);
    */
  }

  global.addEventListener("keydown", (event) => {
    if (global !== global.top || !global.byStreamOverlay) return;
    if (event.key !== "F2" || event.repeat || event.defaultPrevented || event.isComposing || event.ctrlKey || event.altKey || event.metaKey || event.shiftKey) return;
    if (event.target?.isContentEditable || event.target?.matches?.("input, textarea, select")) return;
    event.preventDefault();
    if (editorImports) location.hash = "configure";
    else warnMissingConfigurator();
  });

  // ===== OVERLAY INPUT =====
  /** Install after window input handlers that skip canceled events. */
  function preventOverlayInputDefaults(signal) {
    function preventDefault(event) {
      if (!document.hasFocus() || event.isComposing || event.target?.isContentEditable || event.target?.closest?.("input, textarea, select, button, a")) return;
      event.preventDefault();
    }
    for (const type of ["keydown", "keyup", "mousedown", "mouseup", "click", "auxclick", "contextmenu", "wheel"]) {
      global.addEventListener(type, preventDefault, { signal, passive: false });
    }
  }

  // ===== URL PARAMETERS =====
  /** Resolve published dotted keys to the stable IDs used by renderers, including older saved settings. */
  function internalParameters(fields, values) {
    const result = new URLSearchParams(values);
    for (const [name, field] of Object.entries(fields)) {
      if (field.legacyParameter && result.has(field.legacyParameter)) {
        if (!result.has(name)) result.set(name, result.get(field.legacyParameter));
        result.delete(field.legacyParameter);
      }
      if (!field.parameter || !result.has(field.parameter)) continue;
      result.delete(name);
      for (const value of result.getAll(field.parameter)) result.append(name, value);
      result.delete(field.parameter);
    }
    return result;
  }

  /**
   * Decode URL transport markers; readable parameters override packed values.
   * Failed compressed values are omitted so resource defaults and valid neighbors survive.
   * data packs the whole query; dr: packs one field; raw: escapes a literal reserved prefix.
   * This only decodes transport. applyParameters() validates and assigns resource values later.
   * @param {ResourceFields} fields Declared resource fields and their validation metadata.
   * @param {string} [search=location.search] Encoded query string to decode.
   * @param {string[]} [legacyFields=[]] Retired keys to decode for the resource's migration hook.
   * @returns {Promise<{values: URLSearchParams, compressedFields: Set<string>, error: string}>} Decoded values, compressed field names, and a warning (empty on success).
   */
  async function readURLParameters(fields, search = location.search, legacyFields = []) {
    const explicit = internalParameters(fields, search);
    const selectedFields = new Set();
    let errorMessage = "";
    let values = explicit;
    // Expand the whole query first, then let readable parameters replace matching packed values.
    if (explicit.has("data")) {
      try {
        const compressed = internalParameters(fields, await global.decompress_url_data(explicit.get("data")));
        values = new URLSearchParams([...compressed].filter(([name]) => !explicit.has(name)));
        for (const [name, value] of explicit) values.append(name, value);
      } catch (error) {
        errorMessage = "Unable to read the shorter URL. Defaults and readable parameters were loaded.";
        console.warn(errorMessage, error);
      }
    }
    const decoded = new URLSearchParams();
    // Decode fields independently so one broken compressed value does not discard valid neighbors.
    for (const [name, value] of values) {
      if (!Object.hasOwn(fields, name) && !legacyFields.includes(name)) continue;
      if (value.startsWith("raw:")) decoded.append(name, value.slice(4));
      else if (value.startsWith("dr:")) {
        try {
          // Decompression limits use UTF-8 bytes: allow up to four per declared character, capped at 1 MiB.
          const maxBytes = fields[name]?.maxlength ? Math.min(1048576, Number(fields[name].maxlength) * 4) : 1048576;
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

  // Stored platform IDs stay separate from display names and Font Awesome icon lookup.
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

  // ===== FIELD VALIDATION AND DECLARATIONS =====

  /* Field metadata is the shared contract between resource scripts, native CSS, and the editor:
   * type/default/validate define accepted values; options maps stored IDs to displayed labels.
   * section/subsection and declaration order define form placement; when defines field availability.
   * styleSelector/styleProperty target a native CSS override, with styleUnit appended to scalar values.
   * styleDefault marks a neutral generated value; resource-specific defaults can override it.
   * Numeric max-width/max-height overrides use 0 to remove their authored CSS cap.
   * styleValue(settings) builds compound CSS from several validated fields instead of appending a unit.
   * styleParent enables a flex container when a layout override is present.
   * Helpers below return ordinary field declarations; resource JS remains the owner of their defaults.
   */

  // ===== PARAMETER VALIDATION =====
  /**
   * Validate a raw form/URL string without changing settings.
   * Custom validators accept by returning parsed data, including empty strings, or reject with null.
   * options keys are wire values; optional empty values bypass numeric/color checks.
   * @param {ResourceFields} fields Declared resource fields and their validation metadata.
   * @param {string} name Field or item identifier.
   * @param {string} value Raw form or URL value to validate or format.
   * @returns {boolean} Whether the raw value satisfies its declared field constraints.
   */
  function validParameter(fields, name, value) {
    if (!Object.hasOwn(fields, name)) return false;
    const rule = fields[name];
    // A resource validator owns acceptance for its custom format, including structured list values.
    if (rule.validate) return rule.validate(value) !== null;
    if (rule.options && !Object.hasOwn(rule.options, value)) return false;
    if (rule.maxlength && value.length > Number(rule.maxlength)) return false;
    if (value === "" && (rule.optional || (["text", "textarea"].includes(rule.type) && !rule.styleProperty && !rule.validate))) return true;
    if (rule.type === "color" && !CSS.supports("color", `#${value.replace(/^#/, "")}`)) return false;
    if (rule.styleProperty && rule.type === "text" && !CSS.supports(rule.styleProperty, value)) return false;
    if (rule.type === "number") {
      const number = Number(value);
      if (!value.trim() || !Number.isFinite(number)) return false;
      if (number === 0 && rule.zeroIsDefault) return true;
      if (number < Number(rule.min) || number > Number(rule.max)) return false;
      if (rule.step && rule.step !== "any") {
        const steps = (number - Number(rule.min)) / Number(rule.step);
        // Decimal increments can produce tiny rounding errors even at valid step boundaries.
        if (Math.abs(steps - Math.round(steps)) > 1e-8) return false;
      }
    }
    if ((rule.image || name.endsWith("Url")) && !safeImage(value)) return false;
    return true;
  }

  /**
   * Resolve a field's when chain for both the editor and native overlays.
   * Conditions reference existing fields and must not form cycles.
   * @param {ResourceFields} fields Declared resource fields.
   * @param {ResourceSettings} settings Current form or validated resource values.
   * @param {string} name Field whose availability is checked.
   * @returns {boolean} Whether the field and all its ancestors are active.
   */
  function fieldEnabled(fields, settings, name) {
    const when = fields[name].when;
    return !when || matchesCondition(fields, settings, when);
  }

  function matchesCondition(fields, settings, when) {
    if (typeof when === "function") return Boolean(when(settings));
    const [parent, ...values] = when;
    const value = String(settings[parent]);
    // Matching the immediate parent is insufficient if an earlier ancestor is inactive.
    return (values.length ? values.includes(value) : value !== "") && fieldEnabled(fields, settings, parent);
  }

  /**
   * Apply valid declared values to the supplied settings object in place.
   * Callers seed defaults first; blank display text becomes empty, while other empty values restore defaults. Missing/invalid values leave seeded state intact.
   * Numbers and custom data are parsed here, and accepted colors regain their leading #.
   * Inactive switches use their Off value; other inactive settings fall back to declared defaults.
   * @param {ResourceFields} fields Declared resource fields and their validation metadata.
   * @param {ResourceSettings} settings Validated resource values; helpers may read or update this shared object.
   * @param {URLSearchParams} [values=new URLSearchParams(location.search)] Values to validate and apply.
   * @returns {void} Updates accepted values and resets inactive settings in place.
   */
  function applyParameters(fields, settings, values = new URLSearchParams(location.search)) {
    for (const [name, value] of values) {
      if (!Object.hasOwn(fields, name)) continue;
      const rule = fields[name];
      if ((value === "" && !(["text", "textarea"].includes(rule.type) && !rule.styleProperty && !rule.validate)) || (rule.zeroIsDefault && Number(value) === 0)) {
        // Structured defaults must not become mutable aliases of the field declaration.
        settings[name] = structuredClone(rule.default);
        continue;
      }
      let parsed;
      // Custom validators also parse; calling validParameter() first would run them twice.
      if (rule.validate) parsed = rule.validate(value);
      else {
        const normalized = rule.type === "number" && value.trim() && Number.isFinite(Number(value)) ? String(Math.max(rule.min ?? -Infinity, Math.min(rule.max ?? Infinity, Number(value)))) : value;
        if (!validParameter(fields, name, normalized)) continue;
        parsed = rule.type === "number" ? Number(normalized) : normalized;
        if (["text", "textarea"].includes(rule.type) && !rule.styleProperty && !value.trim()) parsed = "";
      }
      if (parsed === null) continue;
      if (rule.type === "color" && !(rule.optional && parsed === "")) parsed = `#${String(parsed).replace(/^#/, "")}`;
      settings[name] = parsed;
    }
    // Resolve availability after applying every parameter, regardless of its order in the URL.
    for (const [name, field] of Object.entries(fields)) {
      if (!field.retainInactive && !fieldEnabled(fields, settings, name)) settings[name] = field.type === "switch" ? field.uncheckedValue : structuredClone(field.default);
    }
  }

  // ===== FIELD DEFINITIONS =====
  function generatedFields(prefix, fields, scope = prefix) {
    for (const [name, field] of Object.entries(fields)) {
      const property = name.slice(prefix.length);
      field.parameter = scope + "." + (property ? property[0].toLowerCase() + property.slice(1) : "enabled");
    }
    return fields;
  }

  /**
   * Attach a shared availability condition to fields that do not already have one.
   * Nested controls retain their own parent, such as blur -> shadow -> visible element.
   * fieldEnabled() follows that chain; groups must include the nested parent control.
   * @param {Array<string>} when Parent field followed by allowed values; parent alone means nonempty.
   * @param {Object} fields Fresh field declarations to update and return.
   * @returns {ResourceFields} The same fields object after adding conditions only where they were absent.
   */
  function whenFields(when, fields) {
    if (when) for (const field of Object.values(fields)) field.when ||= when;
    return fields;
  }

  function textOverflowField(label, selector) {
    return {
      type: "select",
      default: "layout",
      label: "Text overflow",
      section: label + " text",
      elementSelector: selector,
      overflowSelector: selector,
      options: { layout: "Layout default", wrap: "Wrap", nowrap: "No wrap (clip)", ellipsis: "Ellipsis", ticker: "Ticker scroll" }
    };
  }

  /**
   * Declare per-element typography while retaining the resource's base appearance by default.
   * Elements map IDs to [label, selector, optional size/color list]; other typography is always added.
   * Size 0 and neutral generated defaults preserve authored styles. Lengths use pixels, opacity uses %.
   * @param {Object<string, Array>} elements Element IDs also prefix the generated URL field names.
   * @param {Object<string, Array<string>>} [conditions={}] Optional when condition for each element ID.
   * @returns {ResourceFields} Fresh typography fields keyed by their URL parameter names.
   * @example textFields({ heading: ["Heading", ".heading"] }, { heading: ["showHeading", "yes"] })
   */
  function textFields(elements, conditions = {}) {
    const result = {};
    // Prefix each element's controls with its ID so reusable field groups keep independent values.
    for (const [name, [label, selector, properties = ["size", "color"]]] of Object.entries(elements)) {
      const fields = {};
      const section = `${label} text`;
      if (!selector.includes("::")) fields[name + "Overflow"] = textOverflowField(label, selector);
      fields[name + "ColorMode"] = {
        type: "select",
        default: "appearance",
        label: "Text color mode",
        section,
        elementSelector: selector,
        contrastSelector: selector,
        options: { appearance: "Use appearance setting", auto: "Automatic contrast", manual: "Manual color" }
      };
      if (properties.includes("size"))
        fields[`${name}FontSize`] = {
          type: "number",
          default: 0,
          label: `${label} size (px)`,
          section,
          description: "0 keeps the base size.",
          min: 0,
          max: 400,
          step: "any",
          styleSelector: selector,
          styleProperty: "font-size",
          styleUnit: "px",
          styleValue: (settings) => (settings[`${name}FontSize`] === 0 ? "" : `${settings[`${name}FontSize`]}px`)
        };
      if (properties.includes("color"))
        fields[`${name}Color`] = {
          type: "color",
          default: "",
          label: `${label} color`,
          section,
          description: "Blank restores the default color.",
          maxlength: 80,
          optional: true,
          styleSelector: selector,
          styleProperty: "color"
        };
      Object.assign(fields, {
        [`${name}Font`]: { type: "font", default: "", optional: true, label: `${label} font`, section, maxlength: 100, styleSelector: selector, styleProperty: "font-family" },
        [`${name}Weight`]: {
          type: "select",
          default: "",
          label: `${label} weight`,
          section,
          options: { 300: "Light", 400: "Regular", 500: "Medium", 600: "Semibold", 700: "Bold", 800: "Extra bold", 900: "Black" },
          styleSelector: selector,
          styleProperty: "font-weight"
        },
        [`${name}Style`]: {
          type: "select",
          default: "",
          label: `${label} style`,
          section,
          subsection: "Typography details",
          options: { normal: "Normal", italic: "Italic" },
          styleSelector: selector,
          styleProperty: "font-style"
        },
        [`${name}Case`]: {
          type: "select",
          default: "",
          label: `${label} case`,
          section,
          subsection: "Typography details",
          options: { none: "As written", uppercase: "UPPERCASE", lowercase: "lowercase", capitalize: "Capitalize" },
          styleSelector: selector,
          styleProperty: "text-transform"
        },
        [`${name}Tracking`]: {
          type: "number",
          default: "",
          optional: true,
          label: `${label} letter spacing (px)`,
          section,
          subsection: "Typography details",
          min: -20,
          max: 100,
          step: "any",
          styleSelector: selector,
          styleProperty: "letter-spacing",
          styleUnit: "px"
        },
        [`${name}LineHeight`]: {
          type: "number",
          default: "",
          optional: true,
          label: `${label} line height (px)`,
          section,
          subsection: "Typography details",
          min: 0,
          max: 1000,
          step: "any",
          styleSelector: selector,
          styleProperty: "line-height",
          styleUnit: "px"
        },
        [`${name}Opacity`]: {
          type: "number",
          default: "",
          optional: true,
          label: `${label} opacity (%)`,
          section,
          subsection: "Typography details",
          min: 0,
          max: 100,
          step: "any",
          styleSelector: selector,
          styleProperty: "opacity",
          styleUnit: "%"
        }
      });
      Object.assign(fields, shadowFields(`${name}TextShadow`, label, selector, "text-shadow", section));
      // Keep each effect's own toggle condition; only top-level controls inherit the element condition.
      Object.assign(result, whenFields(conditions[name], generatedFields(name, fields)));
    }
    return initializeDefaults(result);
  }

  /**
   * Declare optional surface controls and independent shadow/glow layers.
   * Elements map IDs to [label, selector, optional property list]. Neutral defaults preserve CSS.
   * @param {Object<string, Array>} elements Properties: background, border, radius, padding, shadow.
   * @param {Object<string, Array<string>>} [conditions={}] Visibility conditions keyed by element ID.
   * @returns {ResourceFields} Fresh background, border, padding, radius, and effect field definitions.
   */
  function surfaceFields(elements, conditions = {}) {
    const result = {};
    for (const [name, [label, selector, properties = ["background", "border", "radius", "padding", "shadow"]]] of Object.entries(elements)) {
      const fields = {};
      // Every generated override targets the same element, but only requested properties get controls.
      const shared = { default: "", optional: true, section: `${label} surface`, styleSelector: selector };
      if (properties.includes("background"))
        fields[`${name}Background`] = {
          ...shared,
          type: "color",
          label: `${label} background`,
          maxlength: 80,
          styleProperty: "background-color"
        };
      if (properties.includes("padding"))
        fields[`${name}Padding`] = {
          ...shared,
          type: "number",
          label: `${label} padding (px)`,
          min: 0,
          max: 300,
          step: "any",
          styleProperty: "padding",
          styleUnit: "px"
        };
      if (properties.includes("radius"))
        fields[`${name}Radius`] = {
          ...shared,
          type: "number",
          label: `${label} corner radius (px)`,
          min: 0,
          max: 1000,
          step: "any",
          styleProperty: "border-radius",
          styleUnit: "px"
        };
      if (properties.includes("border"))
        Object.assign(fields, {
          [`${name}BorderWidth`]: { ...shared, subsection: "Border", type: "number", label: `${label} border width (px)`, min: 0, max: 100, step: "any", styleProperty: "border-width", styleUnit: "px" },
          [`${name}BorderColor`]: { ...shared, subsection: "Border", type: "color", label: `${label} border color`, maxlength: 80, styleProperty: "border-color" },
          [`${name}BorderStyle`]: {
            ...shared,
            subsection: "Border",
            type: "select",
            label: `${label} border style`,
            options: { none: "Off", hidden: "Hidden", solid: "Solid", dashed: "Dashed", dotted: "Dotted", double: "Double" },
            styleProperty: "border-style"
          }
        });
      if (properties.includes("shadow")) Object.assign(fields, shadowFields(`${name}Shadow`, label, selector, "box-shadow", shared.section));
      Object.assign(result, whenFields(conditions[name], generatedFields(name, fields)));
    }
    return initializeDefaults(result);
  }

  /**
   * Declare signed pixel offsets/origins, percentage scale, and rotation in degrees.
   * @param {string} selector CSS selector identifying the target elements.
   * @returns {ResourceFields} Fresh scale, rotation, origin, and signed pixel-offset fields.
   */
  function placementFields(selector) {
    const shared = { default: "", optional: true, section: "Size & placement", styleSelector: selector };
    return generatedFields(
      "",
      initializeDefaults({
        visualScale: { ...shared, type: "number", label: "Visual scale (%)", description: "100% keeps size; negatives flip both axes.", min: -500, max: 500, step: "any", styleProperty: "scale", styleUnit: "%" },
        tilt: { ...shared, type: "number", label: "Tilt (degrees)", min: -360, max: 360, step: "any", styleProperty: "rotate", styleUnit: "deg" },
        ...offsetFields("visualOffset", "Visual offset", selector),
        transformOrigin: {
          ...shared,
          subsection: "Scale / tilt origin",
          type: "select",
          label: "Scale / tilt origin override",
          options: {
            none: "Off",
            center: "Center",
            "top left": "Top left",
            top: "Top",
            "top right": "Top right",
            left: "Left",
            right: "Right",
            "bottom left": "Bottom left",
            bottom: "Bottom",
            "bottom right": "Bottom right",
            custom: "Custom coordinates"
          },
          styleProperty: "transform-origin",
          styleValue: (settings) => (settings.transformOrigin === "none" ? "" : settings.transformOrigin === "custom" ? `${settings.originX}px ${settings.originY}px` : settings.transformOrigin)
        },
        originX: {
          section: shared.section,
          subsection: "Scale / tilt origin",
          when: ["transformOrigin", "custom"],
          type: "number",
          default: 50,
          label: "Horizontal origin (px)",
          icon: "fa-arrows-left-right",
          min: -2000,
          max: 2000,
          step: "any"
        },
        originY: { section: shared.section, subsection: "Scale / tilt origin", when: ["transformOrigin", "custom"], type: "number", default: 50, label: "Vertical origin (px)", icon: "fa-arrows-up-down", min: -2000, max: 2000, step: "any" }
      }),
      "overlay"
    );
  }

  /**
   * Declare two independent layers, both Off by default, using ordinary validated URL fields.
   * The first shadow field owns styleValue(), which reads every layer's settings and builds one CSS value.
   * Box/text shadows use comma-separated layers; filter shadows use repeated drop-shadow() functions.
   * @param {string} name Field or item identifier.
   * @param {string} label Human-readable label.
   * @param {string} selector CSS selector identifying the target elements.
   * @param {string} property box-shadow, text-shadow, or filter; only box-shadow supports spread/inset.
   * @param {string} [section=`${label} effects`] Section identifier or label.
   * @returns {ResourceFields} Fresh independent shadow and glow fields with their compound CSS writer.
   */
  function shadowFields(name, label, selector, property = "box-shadow", section = `${label} effects`) {
    const shared = { section, elementSelector: selector, subsection: "Shadow / glow" };
    const toggle = {
      type: "switch",
      default: "no",
      checkedValue: "yes",
      uncheckedValue: "no",
      options: { yes: "On", no: "Off" }
    };
    const fields = {};
    const isText = property === "text-shadow";
    const isFilter = property === "filter";
    for (const [key, title, color, blur] of [
      [name, "Shadow", isFilter ? "#00000080" : "#00000066", isText ? 1 : isFilter ? 12 : 16],
      [`${name}Glow`, "Glow", isFilter ? "#FFFFFF80" : "#FFFFFF", isFilter ? 20 : 16]
    ]) {
      const active = { ...shared, when: [key, "yes"] };
      fields[key] = {
        ...shared,
        ...toggle,
        label: title,
        icon: key === name ? "fa-cloud" : "fa-wand-magic-sparkles"
      };
      Object.assign(fields, {
        [`${key}Color`]: { ...active, type: "color", default: color, label: `${title} color and transparency`, icon: "fa-palette", maxlength: 80 },
        [`${key}Blur`]: { ...active, type: "number", default: blur, label: `${title} blur / softness (px)`, icon: "fa-cloud", min: 0, max: 300, step: "any" }
      });
      if (key === name)
        Object.assign(fields, {
          [`${key}X`]: { ...active, type: "number", default: isText ? 1 : 0, label: "Horizontal distance (px)", icon: "fa-arrows-left-right", min: -1000, max: 1000, step: "any" },
          [`${key}Y`]: { ...active, type: "number", default: isText ? 1 : 4, label: "Vertical distance (px)", icon: "fa-arrows-up-down", min: -1000, max: 1000, step: "any" }
        });
      if (property === "box-shadow")
        Object.assign(fields, {
          [`${key}Spread`]: { ...active, type: "number", default: 0, label: `${title} spread (px)`, icon: "fa-expand", min: -300, max: 300, step: "any" },
          [`${key}Inset`]: { ...active, ...toggle, label: `Inner ${title.toLowerCase()}`, icon: "fa-compress" }
        });
    }
    Object.assign(fields[name], {
      styleSelector: selector,
      styleProperty: property,
      styleValue: (settings) => {
        // One writer combines both enabled layers; separate CSS rules would replace each other.
        const layers = [];
        for (const [key, x, y] of [
          [name, settings[`${name}X`], settings[`${name}Y`]],
          [`${name}Glow`, 0, 0]
        ]) {
          if (settings[key] !== "yes") continue;
          const spread = property === "box-shadow" ? ` ${settings[`${key}Spread`]}px` : "";
          let value = `${x}px ${y}px ${settings[`${key}Blur`]}px${spread} ${settings[`${key}Color`]}`;
          if (property === "box-shadow" && settings[`${key}Inset`] === "yes") value = `inset ${value}`;
          layers.push(property === "filter" ? `drop-shadow(${value})` : value);
        }
        // Filter functions use spaces; text-shadow and box-shadow lists use commas.
        return layers.join(property === "filter" ? " " : ", ") || "none";
      }
    });
    return fields;
  }

  /**
   * Declare numeric filter adjustments, optionally targeting the backdrop instead of the element.
   * Normal filters combine adjustments and shadow/glow into one property so neither overwrites the other.
   * @param {string} name Field or item identifier.
   * @param {string} label Human-readable label.
   * @param {string} selector CSS selector identifying the target elements.
   * @param {boolean} [backdrop=false] Apply filters to the backdrop instead of the element.
   * @returns {ResourceFields} Fresh filter fields with one compound CSS writer.
   */
  function filterFields(name, label, selector, backdrop = false) {
    const section = `${label} effects`;
    const shared = { section, elementSelector: selector, subsection: backdrop ? "Backdrop filters" : "Color and blur" };
    const fields = {
      [`${name}Mode`]: {
        ...shared,
        type: "select",
        default: "none",
        label: "Filters",
        icon: "fa-sliders",
        options: { none: "Off", custom: "Custom" },
        styleSelector: selector,
        styleProperty: backdrop ? "backdrop-filter" : "filter"
      }
    };
    const adjustments = {
      Blur: { label: "Blur (px)", filter: "blur", default: 0, max: 100, unit: "px", icon: "fa-cloud" },
      Brightness: { label: "Brightness (%)", filter: "brightness", default: 100, max: 500, unit: "%", icon: "fa-sun" },
      Contrast: { label: "Contrast (%)", filter: "contrast", default: 100, max: 500, unit: "%", icon: "fa-circle-half-stroke" },
      Saturation: { label: "Saturation (%)", filter: "saturate", default: 100, max: 500, unit: "%", icon: "fa-droplet" },
      Grayscale: { label: "Grayscale (%)", filter: "grayscale", default: 0, max: 100, unit: "%", icon: "fa-circle-half-stroke" },
      Sepia: { label: "Sepia (%)", filter: "sepia", default: 0, max: 100, unit: "%", icon: "fa-image" },
      Invert: { label: "Invert (%)", filter: "invert", default: 0, max: 100, unit: "%", icon: "fa-circle-half-stroke" },
      Hue: { label: "Hue rotation (degrees)", filter: "hue-rotate", default: 0, min: -360, max: 360, unit: "deg", icon: "fa-palette" }
    };
    for (const [key, { filter, unit, ...rule }] of Object.entries(adjustments))
      fields[`${name}${key}`] = {
        ...shared,
        when: [`${name}Mode`, "custom"],
        type: "number",
        min: 0,
        step: "any",
        ...rule
      };
    let shadow;
    if (!backdrop) {
      const shadows = shadowFields(`${name}Shadow`, label, selector, "filter", section);
      shadow = shadows[`${name}Shadow`].styleValue;
      // The mode field below writes the combined filter; avoid a second shadow-only CSS rule.
      delete shadows[`${name}Shadow`].styleSelector;
      Object.assign(fields, shadows);
    }
    fields[`${name}Mode`].styleValue = (settings) => {
      const mode = settings[`${name}Mode`];
      const dropShadow = shadow?.(settings) || "";
      const values = mode === "custom" ? Object.entries(adjustments).map(([key, { filter, unit }]) => `${filter}(${settings[`${name}${key}`]}${unit})`) : [];
      // Shadow/glow toggles remain usable even when the color and blur adjustments are Off.
      if (dropShadow && dropShadow !== "none") values.push(dropShadow);
      return values.join(" ") || (mode || dropShadow ? "none" : "");
    };
    return generatedFields(name, fields);
  }

  /**
   * Declare signed pixel offsets; zero on both axes preserves the resource's base placement.
   * @param {string} name Field or item identifier.
   * @param {string} label Human-readable label.
   * @param {string} selector CSS selector identifying the target elements.
   * @param {string} [section="Size & placement"] Section identifier or label.
   * @returns {ResourceFields} Fresh signed horizontal and vertical pixel-offset fields.
   */
  function offsetFields(name, label, selector, section = "Size & placement") {
    const shared = { section, elementSelector: selector, subsection: label };
    return generatedFields(
      name,
      initializeDefaults({
        [`${name}X`]: {
          ...shared,
          type: "number",
          default: "",
          optional: true,
          label: "Horizontal offset (px)",
          icon: "fa-arrows-left-right",
          min: -2000,
          max: 2000,
          step: "any",
          styleSelector: selector,
          styleProperty: "translate",
          styleValue: (settings) => (!settings[`${name}X`] && !settings[`${name}Y`] ? "" : `${settings[`${name}X`]}px ${settings[`${name}Y`]}px`)
        },
        [`${name}Y`]: { ...shared, type: "number", default: "", optional: true, label: "Vertical offset (px)", icon: "fa-arrows-up-down", min: -2000, max: 2000, step: "any" }
      })
    );
  }

  /**
   * Declare signed pixel edge overrides; all zero preserves CSS, otherwise zero edges become auto.
   * @param {string} name Field or item identifier.
   * @param {string} label Human-readable label.
   * @param {string} selector CSS selector identifying the target elements.
   * @returns {ResourceFields} Fresh edge-position fields with one inset writer.
   */
  function insetFields(name, label, selector) {
    const shared = { section: "Size & placement", elementSelector: selector, subsection: label };
    const fields = {};
    for (const side of ["Top", "Right", "Bottom", "Left"])
      fields[`${name}${side}`] = {
        ...shared,
        type: "number",
        default: "",
        optional: true,
        label: `${side} distance (px)`,
        icon: ["Top", "Bottom"].includes(side) ? "fa-arrows-up-down" : "fa-arrows-left-right",
        min: -2000,
        max: 2000,
        step: "any",
        description: "0 keeps the original edge placement."
      };
    Object.assign(fields[`${name}Top`], {
      styleSelector: selector,
      styleProperty: "inset",
      styleValue: (settings) => {
        const values = ["Top", "Right", "Bottom", "Left"].map((side) => settings[`${name}${side}`]);
        // Keep base CSS when all edges are neutral; a partial override releases the other edges to auto.
        return values.every((value) => value === 0) ? "" : values.map((value) => (value === 0 ? "auto" : `${value}px`)).join(" ");
      }
    });
    return generatedFields(name, initializeDefaults(fields));
  }

  /**
   * Declare an optional edge mask from percentage stops; only Custom exposes its controls.
   * @param {string} name Field or item identifier.
   * @param {string} label Human-readable label.
   * @param {string} selector CSS selector identifying the target elements.
   * @param {string} [direction="horizontal"] Direction used by the layout or effect.
   * @returns {ResourceFields} Fresh edge-fade mode and percentage-stop fields.
   */
  function fadeFields(name, label, selector, direction = "horizontal") {
    const shared = { section: "Details", elementSelector: selector, subsection: label };
    const active = { ...shared, when: [`${name}Mode`, "custom"] };
    return generatedFields(name, {
      [`${name}Mode`]: {
        ...shared,
        type: "select",
        default: "none",
        label: "Edge fade",
        icon: "fa-droplet",
        options: { none: "Off", custom: "Custom" },
        styleSelector: selector,
        styleProperty: "mask-image",
        styleValue: (settings) => {
          const mode = settings[`${name}Mode`];
          if (!mode) return "";
          if (mode === "none") return "none";
          const edge = settings[`${name}Direction`] === "vertical" ? "to bottom" : "to right";
          return `linear-gradient(${edge}, transparent, #000 ${settings[`${name}Start`]}%, #000 ${100 - settings[`${name}End`]}%, transparent)`;
        }
      },
      [`${name}Direction`]: { ...active, type: "select", default: direction, label: "Fade direction", icon: "fa-up-down-left-right", options: { horizontal: "Left and right", vertical: "Top and bottom" } },
      [`${name}Start`]: { ...active, type: "number", default: 10, label: "Start fade (%)", icon: "fa-arrow-right-to-bracket", min: 0, max: 100, step: "any" },
      [`${name}End`]: { ...active, type: "number", default: 10, label: "End fade (%)", icon: "fa-arrow-right-from-bracket", min: 0, max: 100, step: "any" }
    });
  }

  /**
   * Declare flex arrangement, spacing/wrapping, and child order without changing content data order.
   * styleParent tells initResource() to enable flex only when an explicit layout override is applied.
   * @param {string} selector Container selector for the composition overrides.
   * @param {Object<string, Array<string>>} elements Child IDs mapped to [label, selector].
   * @param {string} [prefix="content"] Separates fields and subsections for multiple layouts in one resource.
   * @param {Object<string, Array<string>>} [conditions={}] Optional conditions for individual child order controls.
   * @returns {ResourceFields} Fresh composition and per-element order/placement fields.
   */
  function layoutFields(selector, elements, prefix = "content", conditions = {}) {
    const label = `${prefix[0].toUpperCase()}${prefix.slice(1)}`;
    const shared = {
      default: "",
      optional: true,
      section: "Composition",
      ...(prefix !== "content" ? { subsection: `${label} layout` } : {}),
      styleParent: selector
    };
    const fields = {
      [`${prefix}Direction`]: {
        ...shared,
        type: "select",
        label: `${label} arrangement override`,
        options: { none: "Off", column: "Stacked", row: "Single row", "column-reverse": "Stacked, reversed", "row-reverse": "Single row, reversed" },
        styleSelector: selector,
        styleProperty: "flex-direction"
      },
      [`${prefix}Gap`]: { ...shared, type: "number", label: `${label} gap (px)`, min: 0, max: 300, step: "any", styleSelector: selector, styleProperty: "gap", styleUnit: "px" },
      [`${prefix}Wrap`]: { ...shared, type: "select", label: `${label} wrapping override`, options: { none: "Off", nowrap: "Single line", wrap: "Wrap to fit" }, styleSelector: selector, styleProperty: "flex-wrap" }
    };
    for (const [name, [elementLabel, child]] of Object.entries(elements))
      fields[`${name}Order`] = {
        ...shared,
        subsection: `${label} element order`,
        ...(conditions[name] ? { when: conditions[name] } : {}),
        type: "number",
        label: `${elementLabel} order`,
        description: "Lower values come first; blank keeps the original order.",
        min: -100,
        max: 100,
        step: 1,
        styleSelector: child,
        styleProperty: "order"
      };
    for (const [name, field] of Object.entries(fields)) {
      const owner = name.endsWith("Order") ? name.slice(0, -5) : prefix;
      generatedFields(owner, { [name]: field });
    }
    return initializeDefaults(fields);
  }

  /** Declare a timing preset and its optional CSS cubic Bézier control. */
  function curveFields(name, label, group) {
    const options = { linear: "Linear", ease: "Ease", "ease-in": "Ease in", "ease-out": "Ease out", "ease-in-out": "Ease in and out", custom: "Custom cubic Bézier" };
    return {
      [name]: { ...group, type: "select", label, default: "ease", options },
      [name + "Bezier"]: {
        ...group,
        type: "text",
        label: label + " · cubic Bézier",
        default: "cubic-bezier(0.25, 0.1, 0.25, 1)",
        maxlength: 100,
        when: [name, "custom"],
        description: "Use cubic-bezier(x1, y1, x2, y2). Both x values must be between 0 and 1.",
        validate(value) {
          const curve = String(value).trim();
          return curve.length <= 100 && /^cubic-bezier\([+\-\d.eE,\s]+\)$/.test(curve) && CSS.supports("animation-timing-function", curve) ? curve : null;
        }
      }
    };
  }

  /** Import the former whole-panel transitions into the item's two animation settings. */
  function cycleParameters(id = "overlay", modeKey = "transition", duration = 500, distance = 32) {
    const timing = ["transitionDuration", "transitionEasing", "slideDistance"];
    const legacyFields = [modeKey, ...timing, ...timing.map((key) => "playback." + key)];
    return {
      legacyFields,
      normalizeParameters(values) {
        if (!legacyFields.some((name) => values.has(name))) return;
        const mode = values.get(modeKey) || "slide";
        const read = (key, fallback) => values.get("playback." + key) ?? values.get(key) ?? fallback;
        if (["slide", "fade", "none"].includes(mode)) {
          for (const phase of ["entrance", "exit"]) {
            const key = id + "." + phase;
            if (values.has(key) && values.get(key) !== "default") continue;
            if (phase === "exit" && values.get(id + ".matchExit") !== "no") continue;
            values.set(key, mode === "slide" ? "default" : mode === "none" ? "none" : phase === "entrance" ? "fadeIn" : "fadeOut");
            if (!values.has(key + "Duration")) values.set(key + "Duration", String(Number(read("transitionDuration", duration)) / 2));
            if (!values.has(key + "Easing")) values.set(key + "Easing", read("transitionEasing", "ease"));
            if (mode === "slide" && !values.has(key + "Distance")) values.set(key + "Distance", read("slideDistance", distance));
          }
        }
        for (const name of legacyFields) values.delete(name);
      }
    };
  }

  // ===== DATE, TIME, AND DURATION FORMATS =====

  // Keys are stored patterns; labels are examples for the editor and parameter reference.
  const dateFormats = {
    locale: "Localized date",
    "yyyy-MM-dd": "2026-10-18 (yyyy-MM-dd)",
    "yyyy/MM/dd": "2026/10/18 (yyyy/MM/dd)",
    "dd/MM/yyyy": "18/10/2026 (dd/MM/yyyy)",
    "MM/dd/yyyy": "10/18/2026 (MM/dd/yyyy)",
    "dd.MM.yyyy": "18.10.2026 (dd.MM.yyyy)",
    "dd-MM-yyyy": "18-10-2026 (dd-MM-yyyy)",
    "dd MMM yyyy": "18 Oct 2026 (dd MMM yyyy)",
    "MMM dd, yyyy": "Oct 18, 2026 (MMM dd, yyyy)",
    "MMMM dd, yyyy": "October 18, 2026 (MMMM dd, yyyy)"
  };

  const timeFormats = {
    locale: "Localized time",
    "HH:mm:ss": "23:45:06 (HH:mm:ss)",
    "HH:mm": "23:45 (HH:mm)",
    "H:mm": "3:45 (H:mm)",
    "hh:mm:ss a": "11:45:06 PM (hh:mm:ss a)",
    "hh:mm a": "11:45 PM (hh:mm a)",
    "h:mm a": "3:45 PM (h:mm a)"
  };

  const durationFormats = {
    clock: "01:02:03 (hours:minutes:seconds)",
    stopwatch: "62:03 (minutes:seconds)",
    hours: "01:02 (hours:minutes)",
    units: "1h 2m 03s",
    seconds: "3723 (total seconds)"
  };

  /**
   * Declare display formats, optional regional choices, and an optional date visibility condition.
   * @param {Object} [options={}] Options that configure this operation.
   * @param {boolean} [options.locale=false] Include a locale selector.
   * @param {boolean} [options.timeZone=false] Include a time-zone selector.
   * @param {string} [options.dateFormat="locale"] Default date pattern.
   * @param {string} [options.timeFormat="locale"] Default time-of-day pattern.
   * @param {unknown} options.dateWhen Visibility condition for date-related controls.
   * @returns {ResourceFields} Fresh locale, time-zone, and date/time format fields.
   */
  function dateTimeFields({ locale = false, timeZone = false, dateFormat = "locale", timeFormat = "locale", dateWhen } = {}) {
    const fields = {
      dateFormat: {
        type: "select",
        default: dateFormat,
        label: "Date format",
        section: "Date & time",
        ...(dateWhen ? { when: dateWhen } : {}),
        description: "Gregorian dates; month names use the selected locale.",
        options: dateFormats
      },
      timeFormat: {
        type: "select",
        default: timeFormat,
        label: "Time of day format",
        section: "Date & time",
        description: "Localized time follows the locale and hour settings.",
        options: timeFormats
      }
    };
    if (locale)
      fields.locale = {
        type: "locale",
        default: "",
        label: "Locale",
        section: "Date & time",
        validate: parseLocale,
        maxlength: 50
      };
    if (timeZone)
      fields.timeZone = {
        type: "timezone",
        default: "",
        label: "Time zone",
        section: "Date & time",
        validate: parseZone,
        maxlength: 100
      };
    return initializeDefaults(fields);
  }

  // ===== DATE AND DURATION FORMATTING =====
  /**
   * Return the format()/formatToParts() interface used by resource renderers.
   * Locale default delegates to Intl; explicit patterns keep Gregorian/Latin digits and chosen separators.
   * Callers supply Intl options, such as timeZone and the locale-default date/time parts.
   * @param {string} pattern Selected date/time pattern.
   * @param {string} locale Locale tag, or whether to declare the locale field.
   * @param {Intl.DateTimeFormatOptions} options Intl options used by the locale-default formatter.
   * @returns {Intl.DateTimeFormat|Object} An Intl-compatible formatter exposing format() and formatToParts().
   */
  function dateTimeFormatter(pattern, locale, options) {
    if (pattern === "locale") return new Intl.DateTimeFormat(locale || undefined, options);
    // Intl supplies localized parts; the selected pattern controls their order and literal separators.
    const types = {
      yyyy: "year",
      MMMM: "month",
      MMM: "month",
      MM: "month",
      dd: "day",
      HH: "hour",
      hh: "hour",
      H: "hour",
      h: "hour",
      mm: "minute",
      ss: "second",
      a: "dayPeriod"
    };
    const tokens = pattern.split(/(yyyy|MMMM|MMM|MM|dd|HH|hh|H|h|mm|ss|a)/).filter(Boolean);
    const formatter = new Intl.DateTimeFormat(locale || undefined, {
      ...options,
      calendar: "gregory",
      numberingSystem: "latn",
      ...(pattern.includes("yyyy") ? { year: "numeric", month: pattern.includes("MMMM") ? "long" : pattern.includes("MMM") ? "short" : "2-digit", day: "2-digit" } : {}),
      ...(/[Hh]/.test(pattern) ? { hour: /HH|hh/.test(pattern) ? "2-digit" : "numeric", minute: "2-digit", second: pattern.includes("ss") ? "2-digit" : undefined, hourCycle: pattern.includes("h") ? "h12" : "h23" } : {})
    });
    /**
     * Return the locale-formatted parts used to assemble the selected date/time pattern.
     * @param {Date|number} value Date or timestamp to format.
     * @returns {Array<unknown>}
     */
    function formatToParts(value) {
      const parts = Object.fromEntries(formatter.formatToParts(value).map(({ type, value }) => [type, value]));
      return tokens.map((token) => {
        const type = types[token] || "literal";
        let value = types[token] ? parts[type] : token;
        if (["yyyy", "MM", "dd", "HH", "hh", "mm", "ss"].includes(token)) value = value.padStart(token === "yyyy" ? 4 : 2, "0");
        if (token === "H" || token === "h") value = String(Number(value));
        return { type, value };
      });
    }
    return {
      formatToParts,
      format: (value) =>
        formatToParts(value)
          .map((part) => part.value)
          .join("")
    };
  }

  /**
   * Format elapsed seconds, not a calendar time: total-minute/second modes do not wrap at midnight.
   * Callers supply whole seconds and an optional 0-999 millisecond fraction; null hides the fraction.
   * @param {number} total Total seconds to format.
   * @param {string} [format="clock"] Selected display format.
   * @param {boolean} [showDays=true] Include whole days in formats that support them.
   * @param {number|null} [milliseconds=null] Optional fractional milliseconds.
   * @returns {string} Formatted duration; total-minute and total-second modes do not wrap at midnight.
   */
  function formatDuration(total, format = "clock", showDays = true, milliseconds = null) {
    // With days hidden, hours keep accumulating instead of wrapping at 24.
    const days = showDays ? Math.floor(total / 86400) : 0;
    const hours = showDays ? Math.floor(total / 3600) % 24 : Math.floor(total / 3600);
    const minutes = Math.floor(total / 60) % 60,
      seconds = total % 60;
    const pad = (value) => String(value).padStart(2, "0"),
      prefix = days ? `${days}d ` : "";
    const fraction = milliseconds === null ? "" : `.${String(milliseconds).padStart(3, "0")}`;
    if (format === "seconds") return `${total}${fraction}`;
    if (format === "stopwatch") return `${Math.floor(total / 60)}:${pad(seconds)}${fraction}`;
    if (format === "hours") return `${prefix}${pad(hours)}:${pad(minutes)}`;
    if (format === "units") return `${prefix}${hours ? `${hours}h ` : ""}${minutes}m ${pad(seconds)}${fraction}s`;
    return `${prefix}${pad(hours)}:${pad(minutes)}:${pad(seconds)}${fraction}`;
  }

  // ===== RESOURCE URLS AND NATIVE LIFECYCLE =====

  const itemEffects = new WeakMap();
  const resizeBoxes = new WeakMap();
  const layoutHolds = new WeakMap();

  function layoutPath(items) {
    const boxes = new Set();
    for (const item of items) {
      for (let node = item; node && !boxes.has(node); node = node.parentElement) boxes.add(node);
    }
    return [...boxes].filter((node) => resizeBoxes.has(node));
  }

  function changingSize(node) {
    const box = resizeBoxes.get(node);
    return (
      box?.width &&
      box.height &&
      node.offsetWidth &&
      node.offsetHeight &&
      (Math.round(box.width) !== node.offsetWidth || Math.round(box.height) !== node.offsetHeight || (box.animation && box.animation.playState !== "finished" && box.animation.playState !== "idle"))
    );
  }

  const departures = new WeakMap();
  function trackDeparture(node, motions) {
    departures.set(node, motions);
    return Promise.allSettled(motions.map((motion) => motion.finished)).then(() => {
      const current = departures.get(node) === motions;
      if (current) departures.delete(node);
      return current;
    });
  }
  function siblingExits(node) {
    return Array.from(node.parentElement?.children || [])
      .flatMap((sibling) => (sibling === node ? [] : departures.get(sibling) || []))
      .filter((motion) => motion.playState !== "finished" && motion.playState !== "idle");
  }

  // Keep incoming content in layout for measurement. Nested owners can release their holds independently.
  function afterLayout(items, boxes, reveal, pending = () => []) {
    let active = true;
    let released = false;
    for (const node of items) {
      layoutHolds.set(node, (layoutHolds.get(node) || 0) + 1);
      node.setAttribute("data-stream-await-size", "");
    }
    function release() {
      if (released) return;
      released = true;
      for (const node of items) {
        const count = layoutHolds.get(node) - 1;
        if (count) layoutHolds.set(node, count);
        else {
          layoutHolds.delete(node);
          node.removeAttribute("data-stream-await-size");
        }
      }
    }
    async function settle() {
      // ResizeObserver and list trimming run after layout and may replace a running box animation.
      while (active) {
        await new Promise(requestAnimationFrame);
        await new Promise(requestAnimationFrame);
        if (!active) return;
        const motions = boxes
          .map((node) => resizeBoxes.get(node)?.animation)
          .concat(pending())
          .filter((motion) => motion && motion.playState !== "finished" && motion.playState !== "idle");
        if (!motions.length) break;
        await Promise.allSettled(motions.map((motion) => motion.finished));
      }
      release();
      while (active && items.some((node) => node.closest("[data-stream-await-size]"))) await new Promise(requestAnimationFrame);
      if (active) reveal();
    }
    settle();
    return () => {
      active = false;
      release();
    };
  }

  function registerItem(node, entrance, exit, playDefault) {
    if (!entrance.frames?.length && !exit.frames?.length && !playDefault) return;
    itemEffects.set(node, { entrance, exit, playDefault });
    node.setAttribute("data-stream-item", "");
  }

  // A child can choose its own effect. Apply the collection effect once to each remaining item.
  function playItems(roots, items, phase, motion, playDefault) {
    const resource = global.byStreamResource;
    const visible = items.filter((node) => node.getClientRects().length && (phase !== "entrance" || !node.closest("[data-stream-await-size]")));
    for (const node of visible) {
      for (const active of node.getAnimations()) if (active.id === "stream-entrance" || active.id === "stream-exit") active.cancel();
    }
    const animations = roots.flatMap((node) => (phase === "entrance" ? resource.playEntrance?.(node) : resource.playExit?.(node)) || []);
    for (const node of visible) {
      if (animations.some((animation) => animation.effect.target === node && !animation.effect.pseudoElement)) continue;
      let animation;
      if (motion?.name === "default" && playDefault) animation = playDefault(node, phase, motion.timing);
      else if (motion?.frames?.length) animation = node.animate(motion.frames, motion.timing);
      if (animation) animations.push(animation);
    }
    return animations;
  }

  /**
   * Replace a displayed item after its children finish animating out. Requests during an exit
   * share that exit and commit only the latest render. With effects off the update is synchronous.
   * getItems selects the changing nodes, leaving surrounding headings, controls and panels in place.
   */
  function changeItems(surface, settings, id, getItems = () => [surface], playDefault, container = surface) {
    const { premade: preset } = global.byStreamResource.elements[id];
    const incoming = elementMotion(settings, id, "entrance", preset);
    const outgoing = elementMotion(settings, id, "exit", preset);
    let shown = false;
    let requested;
    let nextRender;
    let entering = [];
    let leaving;
    let held;

    function play(phase, wholeSurface) {
      const motion = phase === "entrance" ? incoming : outgoing;
      const items = Array.from(getItems());
      for (const node of items) registerItem(node, incoming, outgoing, playDefault);
      const animations = playItems(wholeSurface ? [surface] : items, items, phase, motion, playDefault);
      if ((!wholeSurface && !items.includes(surface)) || container !== surface) {
        const play = phase === "entrance" ? global.byStreamResource.playEntrance : global.byStreamResource.playExit;
        const parents = new Set();
        for (const item of items) {
          for (let parent = item.parentElement; parent && container.contains(parent); parent = parent.parentElement) {
            if (!wholeSurface || !surface.contains(parent)) parents.add(parent);
          }
        }
        for (const parent of parents) animations.push(...(play?.(parent, false) || []));
      }
      return animations;
    }

    function commit(wasHiding = false, animatedExit = false) {
      const appear = !shown || wasHiding;
      const interrupted = !!held;
      held?.();
      held = null;
      shown = requested;
      if (surface.hidden === shown) surface.hidden = !shown;
      nextRender?.();
      nextRender = null;
      if (!shown) return;
      const items = Array.from(getItems());
      const boxes = layoutPath([container, ...items]);
      const resource = global.byStreamResource;
      if (boxes.some(changingSize) && (animatedExit || interrupted || incoming.name !== "none" || items.some((node) => resource.hasEntrance?.(node)) || boxes.some((node) => resource.hasEntrance?.(node, false)))) {
        const contents = resource.hasEntrance?.(surface, false) && !items.includes(surface) ? [...new Set([...items, ...surface.children])] : items;
        held = afterLayout(contents, boxes, () => {
          held = null;
          entering = play("entrance", appear);
        });
        return;
      }
      entering = play("entrance", appear);
    }

    return (render, show = true) => {
      if (!render && requested === show) return leaving;
      requested = show;
      nextRender = render;
      if (leaving) return leaving;
      if (held) return commit();
      for (const animation of entering) animation.cancel();
      entering = [];
      const animations = shown ? play("exit", !show) : [];
      const previous = !shown && show ? siblingExits(surface) : [];
      if (!animations.length && !previous.length) return commit();
      const done = !show && animations.length ? trackDeparture(surface, animations) : Promise.allSettled([...animations, ...previous].map((animation) => animation.finished));
      leaving = done.then(() => {
        for (const animation of animations) animation.cancel();
        leaving = null;
        return commit(!show, true);
      });
      return leaving;
    };
  }

  // A stable display can tick within a state while its previous label finishes leaving.
  function changingText(node, settings, id, playDefault) {
    const change = changeItems(node, settings, id, undefined, playDefault);
    let requested, displayed, latest;
    return (value, key = value) => {
      latest = value;
      if (requested === key) {
        if (displayed === key && node.textContent !== value) node.textContent = value;
        return;
      }
      requested = key;
      change(() => {
        displayed = key;
        node.textContent = latest;
      }, value !== "");
    };
  }

  // Scroll positions come from the unanimated layout so a child's own slide cannot retrigger it.
  function scrollItems(viewport, track, settings, collection, horizontal, reverse) {
    const resource = global.byStreamResource;
    const elements = Object.entries(resource.elements);
    const modes = new Map();
    for (const [id, part] of elements) {
      if (id === "overlay") continue;
      const entrance = elementMotion(settings, id, "entrance", part.premade);
      const exit = elementMotion(settings, id, "exit", part.premade);
      if (entrance.frames?.length || exit.frames?.length) modes.set(id, { entrance, exit });
    }
    if (!modes.size && !elements.some(([id]) => ["entrance", "exit"].some((phase) => elementMotion(settings, id + ".children", phase).frames?.length))) return () => {};
    viewport.setAttribute("data-stream-scroll", "");
    const start = horizontal ? "left" : "top";
    const size = horizontal ? "width" : "height";
    const offset = horizontal ? "offsetLeft" : "offsetTop";
    const length = horizontal ? "offsetWidth" : "offsetHeight";
    const phases = new WeakMap();
    let groups = [];
    let extent = 0;
    function paint() {
      if (!groups.length) return;
      const edge = viewport.getBoundingClientRect()[start];
      for (const group of groups) {
        const origin = group.node.getBoundingClientRect()[start] - edge;
        const visible = origin < extent && origin + group.length > 0;
        if (!visible && !group.visible) continue;
        group.visible = visible;
        for (const item of group.items) {
          const near = origin + item.offset,
            far = near + item.length;
          const inside = visible && far > 0 && near < extent;
          // Begin leaving while the item is still readable, including items wider than the viewport.
          const leaving = reverse ? near >= Math.max(0, extent - item.length) : far <= Math.min(extent, item.length);
          const phase = !inside ? "" : leaving ? "exit" : "entrance";
          if (phases.get(item.node) === phase) continue;
          phases.set(item.node, phase);
          if (phase) {
            const own = item.motion?.[phase];
            playItems([item.node], [item.node], phase, own?.frames?.length ? own : modes.get(collection)?.[phase]);
          }
        }
      }
    }
    watch(() => true, 1000, paint);
    return () => {
      extent = viewport.getBoundingClientRect()[size];
      groups = Array.from(track.children, (group) => {
        return {
          node: group,
          length: group[length],
          items: Array.from(group.children, (node) => {
            const id = elements.find(([, part]) => part.selector && node.matches(part.selector))?.[0];
            return { node, offset: node[offset], length: node[length], motion: modes.get(id) };
          })
        };
      });
      paint();
    };
  }

  // ===== SETTINGS URLS =====
  /**
   * Build the readable overlay URL shared by editor actions and native resource interactions.
   * Only declared fields are emitted. urlRequired keeps overlay mode/timestamp anchors even at defaults.
   * Inactive optional fields and defaults are omitted; CSS normalizes equivalent colors, and JSON comparison preserves data order.
   * Compression is applied later by generateURL(), after this canonical readable query exists.
   * @param {ResourceDefinition} resource Resource metadata, field definitions, defaults, and current settings.
   * @param {ResourceSettings} settings Validated resource values; helpers may read or update this shared object.
   * @returns {URL} Readable overlay URL containing required fields and nondefault values.
   */
  function settingsURL(resource, settings) {
    const parameterRules = resource.fields;
    const color = document.createElement("span").style;
    const values = Object.entries(settings)
      .filter(([name, value]) => {
        if (!Object.hasOwn(parameterRules, name)) return false;
        if (!fieldEnabled(parameterRules, settings, name)) return false;
        // Active required parameters preserve content and optional time anchors, even at defaults.
        if (resource.urlRequired.includes(name)) return true;
        const rule = parameterRules[name];
        if (rule.type === "font" && value === "") return false;
        if (rule.type === "color") {
          // Let CSS equate short/long hex spellings before deciding whether this is a real override.
          color.color = value;
          const current = color.color;
          color.color = rule.default;
          return current !== color.color;
        }
        return JSON.stringify(value) !== JSON.stringify(rule.default);
      })
      .map(([name, value]) => {
        let text = typeof value === "object" ? JSON.stringify(value) : String(value);
        if (parameterRules[name].type === "color") text = text.replace(/^#/, "");
        // Escape reserved prefixes so literal text survives the URL decoder.
        if (text.startsWith("dr:") || text.startsWith("raw:")) text = `raw:${text}`;
        return [parameterRules[name].parameter || name, text];
      });
    const url = new URL(location.href);
    // Downloaded overlays need their filename; directory URLs depend on an HTTP index document.
    if (url.protocol !== "file:") url.pathname = url.pathname.replace(/\/index\.html$/, "/");
    url.hash = "";
    url.search = new URLSearchParams(values).toString().replaceAll("=raw%3A", "=raw:");
    return url;
  }

  /**
   * Fill missing scalar defaults before URL validation and form construction.
   * Resource values, including zero and false, take precedence over these neutral fallbacks.
   * @param {ResourceFields} fields Resource-owned field definitions, updated in place.
   * @returns {ResourceFields} The same definitions, with concrete defaults assigned.
   */
  function initializeDefaults(fields) {
    for (const [name, field] of Object.entries(fields)) {
      if (["text", "textarea"].includes(field.type) && !field.styleProperty && !field.validate && typeof field.default === "string" && !field.default.trim()) {
        field.default = "";
        continue;
      }
      // Explicit zero, false, and structured values belong to the resource and must survive unchanged.
      if (field.default !== "" && field.default !== undefined && field.default !== null) continue;
      if (field.type === "number") {
        // Percent scale/opacity use 100 as neutral; clamp other zero fallbacks to the field's range.
        const value = /(?:Opacity|Scale)$|^(?:opacity|scale)$/.test(name) ? 100 : 0;
        field.default = Math.max(Number(field.min ?? 0), Math.min(Number(field.max ?? Infinity), value));
      } else if (field.type === "color") field.default = /background/i.test(name) || field.styleProperty === "background-color" ? "#00000000" : "#FFFFFF";
      else if (field.type === "font") field.default = "Courier New";
      else if (field.type === "timezone") field.default = Intl.DateTimeFormat().resolvedOptions().timeZone;
      else if (field.type === "timezones") field.default = "UTC";
      else if (field.type === "locale") field.default = navigator.language;
      else if (field.type === "datetime") field.default = new Date().toISOString();
      else if (["entries", "mapping"].includes(field.type)) field.default = [];
      else if (field.type === "url") field.default = "https://byuwur.github.io/img/logo.png";
      else if (field.options) field.default = field.styleProperty === "font-weight" ? "400" : Object.hasOwn(field.options, "none") ? "none" : Object.keys(field.options)[0];
      else field.default = "byUwUr";
      // Retain the neutral CSS baseline if a resource later replaces a generated field's default.
      if (field.styleSelector && !field.styleValue) field.styleDefault = field.default;
    }
    return fields;
  }

  // ==================================================
  // ELEMENT CONTROLS
  // ==================================================

  const entranceNames = [
    "fadeIn",
    "fadeInDown",
    "fadeInUp",
    "fadeInLeft",
    "fadeInRight",
    "fadeInDownBig",
    "fadeInUpBig",
    "fadeInLeftBig",
    "fadeInRightBig",
    "fadeInTopLeft",
    "fadeInTopRight",
    "fadeInBottomLeft",
    "fadeInBottomRight",
    "slideInDown",
    "slideInUp",
    "slideInLeft",
    "slideInRight",
    "bounceIn",
    "bounceInDown",
    "bounceInUp",
    "bounceInLeft",
    "bounceInRight",
    "backInDown",
    "backInUp",
    "backInLeft",
    "backInRight",
    "zoomIn",
    "zoomInDown",
    "zoomInUp",
    "zoomInLeft",
    "zoomInRight",
    "rotateIn",
    "rotateInDownLeft",
    "rotateInDownRight",
    "rotateInUpLeft",
    "rotateInUpRight",
    "flipInX",
    "flipInY",
    "lightSpeedInLeft",
    "lightSpeedInRight",
    "rollIn",
    "jackInTheBox"
  ];
  const exitNames = [...entranceNames.filter((name) => name !== "jackInTheBox").map((name) => name.replace("In", "Out")), "hinge"];
  function effectOptions(names) {
    return { none: "Off", ...Object.fromEntries(names.map((name) => [name, name[0].toUpperCase() + name.slice(1).replace(/[A-Z]/g, (letter) => " " + letter)])) };
  }
  const entranceOptions = effectOptions(entranceNames);
  const exitOptions = effectOptions(exitNames);

  /** Group fields by the part they control. Explicit ownership covers renderer settings without a CSS selector. */
  function organizeElements(resource) {
    const { fields, elements } = resource;
    const owners = new Map();
    const selectors = new Map();
    const groupOwners = new Map();
    const paths = new Map();
    const availability = new Map();
    const sections = [...new Set([...(resource.sectionOrder || []), "General", "Appearance"])];
    const sideFields = new Map(
      Object.values(fields)
        .filter((field) => field.styleSelector)
        .map((field) => [field.styleSelector + ":" + field.styleProperty, field])
    );
    for (const [id, element] of Object.entries(elements)) {
      if (element.selector) selectors.set(element.selector, id);
      if (element.textOverflow === false) delete fields[id + "Overflow"];
      else if (element.textOverflow) {
        const field = textOverflowField(element.label, element.selector);
        if (typeof element.textOverflow === "string") field.overflowSelector = element.textOverflow;
        Object.assign(fields, generatedFields(id, { [id + "Overflow"]: field }));
      }
      for (const group of element.groups || []) groupOwners.set(group, id);
      for (const name of element.fields || []) owners.set(name, id);
      if (Array.isArray(element.when) && fields[element.when[0]]) fields[element.when[0]].controlsElement = true;
      paths.set(id, [...(paths.get(element.parent) || []), element.label]);
      const parentWhen = availability.get(element.parent);
      const when = element.when;
      availability.set(id, parentWhen && when ? (values) => matchesCondition(fields, values, parentWhen) && matchesCondition(fields, values, when) : when || parentWhen);
      if (!element.parent && !sections.includes(element.label)) sections.push(element.label);
    }
    const textModes = Object.entries(fields).filter(([, field]) => field.contrastSelector);
    if (textModes.length) {
      fields.textContrast = {
        type: "select",
        default: "manual",
        label: "Text color mode",
        section: "Appearance",
        options: { manual: "Manual colors", auto: "Automatic contrast" },
        description: "Choose black or white from the overlay background. Transparent areas keep their usual text color."
      };
      for (const name of ["textColor", "primaryTextColor", "subTextColor"]) {
        const color = fields[name];
        if (!color || color.when) continue;
        color.when = ["textContrast", "manual"];
        color.retainInactive = true;
      }
      for (const [mode, rule] of textModes) {
        const owner = selectors.get(rule.contrastSelector);
        const ownedColors = (elements[owner]?.fields || []).filter((name) => fields[name]?.type === "color" && /(?:font|text|name|icon)color$/i.test(name));
        for (const name of [...ownedColors, mode.slice(0, -4)]) {
          const color = fields[name];
          if (!color || color.type !== "color") continue;
          const condition = color.when;
          color.retainInactive = true;
          color.when = (values) => (!condition || matchesCondition(fields, values, condition)) && (values[mode] === "manual" || (values[mode] === "appearance" && values.textContrast !== "auto"));
        }
      }
    }
    resource.sectionOrder = sections;
    for (const [name, field] of Object.entries(fields)) {
      const section = field.section;
      const id = owners.get(name) || selectors.get(field.elementSelector || field.styleSelector) || groupOwners.get(field.subsection) || groupOwners.get(section);
      const groups = [];
      if (section?.endsWith(" text")) groups.push("Typography");
      else if (section?.endsWith(" surface")) groups.push("Surface");
      else if (section?.endsWith(" effects")) groups.push("Effects");
      else if (["Size & placement", "Composition"].includes(section)) groups.push(section === "Composition" ? "Layout" : "Placement");
      else if (section === "Animation" && name !== "animate") groups.push("Playback");
      else if (section === "Appearance" && id && (field.type === "font" || /^(?:fontSize|fontWeight|fontColor|titleSize|subtitleSize)$/.test(name))) groups.push("Typography");
      else if (section === "Date & time" || section === "Key bindings") groups.push(section);
      const original = field.subsection;
      const appearance = ["Appearance", "Size & placement", "Details", "Composition"].includes(section) || section?.endsWith(" effects") || section?.endsWith(" surface");
      const [top, ...nested] = paths.get(id) || [appearance ? "Appearance" : "General"];
      if (original && !["Typography details", elements[id]?.label, section].includes(original) && !groups.includes(original)) groups.push(original);
      if (["visualScale", "tilt", "visualOffsetX", "visualOffsetY", "transformOrigin", "originX", "originY"].includes(name)) groups.splice(0, groups.length, "Transforms");
      const available = availability.get(id);
      if (field.parameter && available && available !== field.when) {
        const own = field.when;
        field.when = own ? (values) => matchesCondition(fields, values, available) && matchesCondition(fields, values, own) : available;
      }
      field.section = top;
      field.subsection = [...nested, ...groups];
    }

    for (const [id, element] of Object.entries(elements)) {
      if (!element.selector) continue;
      const [section, ...nested] = paths.get(id);
      const rootPlacement = id === "overlay" && !!fields.tilt;
      const when = availability.get(id);
      const shared = { section, subsection: [...nested, "Transforms"], ...(when ? { when } : {}) };
      const container = id === "overlay" || element.container || element.box === false || element.motionItem || element.motionLabel || Object.values(elements).some((child) => child.parent === id);
      if (container && element.box !== false && !element.selector.includes("::") && id !== "history") {
        for (const axis of ["width", "height"]) {
          if (id === "overlay" && fields[axis]) continue;
          const key = id + "." + axis + "Mode";
          fields[key] = {
            ...shared,
            subsection: [...nested, "Size & placement"],
            type: "select",
            label: axis === "width" ? "Width sizing" : "Height sizing",
            default: "auto",
            options: { auto: "Resource layout", content: "Fit content", fill: "Fill parent" },
            styleSelector: element.selector,
            styleProperty: axis,
            styleValue: (values) => ({ content: "fit-content", fill: "100%" })[values[key]] || ""
          };
        }
      }
      if (element.box !== false) {
        const spacing = { ...shared, subsection: [...nested, "Spacing"], compact: true };
        if (element.gap || sideFields.has(element.selector + ":gap")) {
          for (const [suffix, property, icon] of [
            ["rowGap", "row-gap", "fa-arrows-up-down"],
            ["columnGap", "column-gap", "fa-arrows-left-right"]
          ]) {
            fields[id + "." + suffix] = {
              ...spacing,
              type: "number",
              default: "",
              optional: true,
              placeholder: "Default",
              label: suffix === "rowGap" ? "Row gap (px)" : "Column gap (px)",
              icon,
              min: 0,
              max: 2000,
              step: "any",
              styleSelector: element.selector,
              styleProperty: property,
              styleUnit: "px",
              styleDefault: ""
            };
          }
        }
        for (const property of ["margin", "padding"]) {
          for (const [side, arrow] of [
            ["Top", "up"],
            ["Bottom", "down"],
            ["Left", "left"],
            ["Right", "right"]
          ]) {
            const css = property + "-" + side.toLowerCase();
            const existing = sideFields.get(element.selector + ":" + css);
            const label = property[0].toUpperCase() + property.slice(1) + " " + side.toLowerCase() + " (px)";
            if (existing) {
              Object.assign(existing, { section, subsection: spacing.subsection, compact: true, label, icon: "fa-arrow-" + arrow });
              continue;
            }
            fields[id + "." + property + side] = {
              ...spacing,
              type: "number",
              default: "",
              optional: true,
              placeholder: "Default",
              label,
              icon: "fa-arrow-" + arrow,
              min: property === "padding" ? 0 : -2000,
              max: 2000,
              step: "any",
              styleSelector: element.selector,
              styleProperty: css,
              styleUnit: "px",
              styleDefault: ""
            };
          }
        }
      }
      const number = (label, unit, min, max, value = 0) => ({ ...shared, type: "number", default: value, ...(unit === "degrees" ? { sliderMin: min } : {}), label: `${label} (${unit})`, min, max, step: "any" });
      fields[id + ".perspective"] = number("Perspective", "px", 0, 10000);
      if (!rootPlacement) {
        fields[id + ".translateX"] = number("Move horizontally", "px", -5000, 5000);
        fields[id + ".translateY"] = number("Move vertically", "px", -5000, 5000);
        fields[id + ".rotateZ"] = number("Rotate", "degrees", -360, 360);
        fields[id + ".origin"] = {
          ...shared,
          type: "text",
          label: "Transform origin",
          default: "",
          optional: true,
          placeholder: "Resource default",
          maxlength: 80,
          description: "CSS position, for example top left or 50% 50% 20px.",
          styleSelector: element.selector,
          styleProperty: "transform-origin",
          styleDefault: ""
        };
      }
      fields[id + ".translateZ"] = number("Move in depth", "px", -5000, 5000);
      fields[id + ".rotateX"] = number("Tilt on X axis", "degrees", -360, 360);
      fields[id + ".rotateY"] = number("Tilt on Y axis", "degrees", -360, 360);
      fields[id + ".skewX"] = number("Skew horizontally", "degrees", -85, 85);
      fields[id + ".skewY"] = number("Skew vertically", "degrees", -85, 85);
      fields[id + ".scaleX"] = number("Horizontal scale", "%", -500, 500, 100);
      fields[id + ".scaleY"] = number("Vertical scale", "%", -500, 500, 100);
      const enabled = (values) => values.animate === "yes" && fieldEnabled(fields, values, id + ".perspective");
      if (container && !element.motionItem && !element.motionLabel && !element.selector.includes("::")) {
        Object.assign(fields, animationFields(id + ".children", section, [...nested, "Child elements"], enabled, "Effect for each child"));
      }
      // Repeated items use the controls on their collection.
      if (elements[element.parent]?.motionItem === id) continue;
      const itemLabel = element.motionLabel || elements[element.motionItem]?.label.toLowerCase();
      const motionFields = animationFields(id, section, nested, enabled, itemLabel ? "Effect for each " + itemLabel : "Effect", element.premade, element.slideDistance);
      if (element.motionItem) {
        for (const [name, field] of Object.entries(motionFields)) field.legacyParameter = element.motionItem + name.slice(id.length);
      }
      Object.assign(fields, motionFields);
      if (itemLabel) Object.assign(fields, animationFields(id + ".container", section, [...nested, "Container"], enabled, "Effect for the whole container"));
    }
  }

  function animationFields(scope, section, path, enabled, effectLabel, preset, slideDistance) {
    const fields = {};
    const match = scope + ".matchExit";
    for (const [phase, label, names, options] of [
      ["entrance", "Animation in", entranceNames, entranceOptions],
      ["exit", "Animation out", exitNames, exitOptions]
    ]) {
      const key = scope + "." + phase;
      const group = { section, subsection: [...path, label] };
      if (phase === "exit")
        fields[match] = {
          ...group,
          type: "switch",
          default: "yes",
          label: "Match animation in and out",
          checkedValue: "yes",
          uncheckedValue: "no",
          options: { yes: "On", no: "Off" },
          when: enabled,
          description: "Use the matching exit effect with the same duration, delay, curve and travel distance."
        };
      fields[key] = {
        ...group,
        type: "select",
        label: effectLabel,
        default: "none",
        options: preset ? { default: "Default", ...options } : options,
        ...(preset ? { description: "Default uses the built-in animation." } : {}),
        when: phase === "entrance" ? enabled : [match, "no"]
      };
      const when = [key, ...names];
      if (["slide", "vertical", "fade", "flip", "custom"].includes(preset)) when.push("default");
      const timing = { ...group, type: "number", min: 0, max: 60000, step: "any", when };
      fields[key + "Duration"] = { ...timing, default: 300, label: "Duration (ms)" };
      fields[key + "Delay"] = { ...timing, default: 0, label: "Delay (ms)" };
      Object.assign(fields, curveFields(key + "Easing", "Curve", { ...group, when }));
      const travelling = names.filter((name) => /(?:Left|Right|Up|Down)|^roll/.test(name) && !name.startsWith("rotate"));
      fields[key + "Travel"] = { ...timing, default: 10, max: 500, label: "Travel distance (%)", when: [key, ...travelling] };
      if (["slide", "vertical"].includes(preset)) fields[key + "Distance"] = { ...timing, default: slideDistance ?? 24, min: -1000, max: 1000, label: "Slide distance (px)", when: [key, "default"] };
    }
    return fields;
  }

  /** Compose user transforms after the renderer's placement, SVG transforms, and live input animation. */
  function elementTransform(settings, id) {
    const value = (suffix) => settings[id + "." + suffix[0].toLowerCase() + suffix.slice(1)] || 0;
    const transforms = [];
    if (value("Perspective")) transforms.push(`perspective(${value("Perspective")}px)`);
    if (value("TranslateX") || value("TranslateY") || value("TranslateZ")) transforms.push(`translate3d(${value("TranslateX")}px, ${value("TranslateY")}px, ${value("TranslateZ")}px)`);
    for (const axis of ["X", "Y", "Z"]) {
      if (value("Rotate" + axis)) transforms.push(`rotate${axis}(${value("Rotate" + axis)}deg)`);
    }
    if (value("SkewX") || value("SkewY")) transforms.push(`skew(${value("SkewX")}deg, ${value("SkewY")}deg)`);
    if (value("ScaleX") !== 100 || value("ScaleY") !== 100) transforms.push(`scale(${value("ScaleX") / 100}, ${value("ScaleY") / 100})`);
    return transforms.join(" ");
  }

  /**
   * Read the loaded Animate.css keyframes through a CSS animation. This also works with cross-origin
   * stylesheets and release builds that inline the library. Each effect gets its own animation so
   * applying an entrance never cancels a ticker scroll, controller movement, or a GSAP timeline.
   */
  function motionFrames(name, travel) {
    const probe = document.createElement("i");
    probe.className = "animate__animated animate__" + name;
    probe.style.cssText = "position:fixed;left:-10000px;pointer-events:none;animation-play-state:paused";
    document.body.append(probe);
    const animation = probe.getAnimations().find((item) => item.animationName === name);
    const frames = animation?.effect.getKeyframes() || [];
    probe.remove();
    for (const frame of frames) {
      // A selected overall curve replaces the preset's per-keyframe timing as well.
      frame.easing = "linear";
      // Filter composition multiplies the entrance alpha by the element's own current opacity.
      if (frame.opacity !== undefined) {
        frame.filter = `opacity(${frame.opacity})`;
        delete frame.opacity;
      }
      if (travel !== 100 && frame.transform) {
        frame.transform = frame.transform.replace(/translate(?:3d|[XYZ])?\([^)]+\)/gi, (translate) => translate.replace(/(-?[\d.]+)(px|%)/g, (_, distance, unit) => (Number(distance) * travel) / 100 + unit));
      }
      // The stock slide presets force visibility. The renderer owns hidden and inactive states.
      delete frame.visibility;
    }
    // Short slides stay inside the container. Fade their endpoints so both phases reach full invisibility.
    if (name.startsWith("slide") && frames.length && !frames.some((frame) => frame.filter)) {
      const entering = name.startsWith("slideIn");
      frames[0].filter = entering ? "opacity(0)" : "opacity(1)";
      frames.at(-1).filter = entering ? "opacity(1)" : "opacity(0)";
    }
    return frames;
  }

  // Cache only the keyframes. Each element and direction keeps its own timing.
  const frameCache = new Map();
  function elementMotion(settings, id, phase, preset) {
    const matched = phase === "exit" && settings[id + ".matchExit"] === "yes";
    const key = id + "." + (matched ? "entrance" : phase);
    const name = settings.animate === "no" ? "none" : settings[key] || "none";
    if (name === "none" || (name === "default" && !["fade", "slide", "vertical", "flip", "custom"].includes(preset))) return { name };
    const reverse = matched && name === "jackInTheBox";
    const effect = matched && !reverse ? name.replace("In", "Out") : name;
    const travel = settings[key + "Travel"];
    const cacheKey = effect + ":" + travel;
    let frames;
    if (name === "default" && preset !== "custom") {
      const away = { filter: "opacity(0)" },
        rest = { filter: "opacity(1)" };
      if (preset === "flip") {
        if (settings.layout === "flip") {
          away.transform = "perspective(500px) rotateX(-25deg)";
          rest.transform = "perspective(500px) rotateX(0deg)";
        } else away.filter = "opacity(0.6)";
      } else if (preset !== "fade") {
        const axis = preset === "vertical" ? "Y" : "X";
        const distance = settings[key + "Distance"] * (phase === "entrance" ? -1 : 1);
        away.transform = `translate${axis}(${distance}px)`;
        rest.transform = `translate${axis}(0)`;
      }
      frames = phase === "entrance" ? [away, rest] : [rest, away];
    } else if (name !== "default") {
      if (!frameCache.has(cacheKey)) frameCache.set(cacheKey, motionFrames(effect, travel));
      frames = frameCache.get(cacheKey);
    }
    const curve = settings[key + "Easing"];
    return {
      name: effect,
      frames,
      timing: {
        id: "stream-" + phase,
        duration: settings[key + "Duration"],
        delay: settings[key + "Delay"],
        easing: curve === "custom" ? settings[key + "EasingBezier"] : curve,
        direction: reverse ? "reverse" : "normal",
        composite: "add",
        fill: phase === "exit" ? "forwards" : "backwards"
      }
    };
  }

  function playRowMotions(node, settings, id, phase, playDefault) {
    const preset = global.byStreamResource.elements[id].premade;
    const entrance = elementMotion(settings, id, "entrance", preset);
    const exit = elementMotion(settings, id, "exit", preset);
    registerItem(node, entrance, exit, (entrance.name === "default" || exit.name === "default") && playDefault);
    const motion = phase === "entrance" ? entrance : exit;
    return playItems([node], [node], phase, motion, playDefault);
  }

  function playElementMotion(node, settings, id, phase, playDefault) {
    return playRowMotions(node, settings, id, phase, playDefault).find((animation) => animation.effect.target === node && !animation.effect.pseudoElement) || null;
  }

  const arrivingRows = new WeakMap();
  function enterListItem(node, settings, id, mayDisplace, playDefault) {
    const list = node.parentElement;
    const resource = global.byStreamResource;
    const reveal = () => {
      arrivingRows.delete(node);
      if (node.isConnected) playElementMotion(node, settings, id, "entrance", playDefault);
    };
    const boxes = layoutPath([list]);
    const exits = () => [...siblingExits(list), ...siblingExits(node)];
    const leaving = exits();
    if (leaving.length && !mayDisplace) {
      // A queued replacement must not enlarge the list while its predecessor is still visible.
      node.hidden = true;
      const cancel = () => arrivingRows.delete(node);
      arrivingRows.set(node, cancel);
      Promise.allSettled(leaving.map((motion) => motion.finished)).then(() => {
        if (arrivingRows.get(node) !== cancel || !node.isConnected) return;
        node.hidden = false;
        arrivingRows.set(node, afterLayout([node], boxes, reveal, exits));
      });
      return;
    }
    const hasEffect = elementMotion(settings, id, "entrance").name !== "none" || resource.hasEntrance?.(node);
    if (mayDisplace || (hasEffect && boxes.some(changingSize))) {
      arrivingRows.set(node, afterLayout([node], boxes, reveal, exits));
    } else reveal();
  }

  function removeWithMotion(node, settings, id, limit, playDefault, container) {
    const cancelArrival = arrivingRows.get(node);
    if (cancelArrival) {
      cancelArrival();
      arrivingRows.delete(node);
      return node.remove();
    }
    const animations = playRowMotions(node, settings, id, "exit", playDefault);
    if (container) animations.push(...(global.byStreamResource.playExit?.(container, false) || []));
    if (!animations.length) return node.remove();
    const list = node.parentElement;
    // History pins a displaced row at its previous position. Keep its tray at the previous size too.
    const box = node.style.position === "absolute" && resizeBoxes.get(list);
    if (box && !list.hasAttribute("data-stream-hold-box")) {
      list.style.setProperty("--stream-held-width", box.width + "px");
      list.style.setProperty("--stream-held-height", box.height + "px");
      list.setAttribute("data-stream-hold-box", "");
    }
    // Bursts of new rows must stay bounded even with a long disappearance duration.
    const leaving = list.querySelectorAll(":scope > [data-stream-exiting]");
    for (let i = 0; i <= leaving.length - limit; i++) {
      for (const animation of leaving[i].getAnimations({ subtree: true })) animation.cancel();
      leaving[i].remove();
    }
    node.setAttribute("data-stream-exiting", "");
    node.inert = true;
    if (container) trackDeparture(container, animations);
    trackDeparture(node, animations).then(() => {
      node.remove();
      if (box && !list.querySelector(":scope > [data-stream-exiting]")) {
        list.removeAttribute("data-stream-hold-box");
        list.style.removeProperty("--stream-held-width");
        list.style.removeProperty("--stream-held-height");
      }
    });
  }

  // The preview toolbar fades the canvas independently of each resource's own effects.
  let previewFade;
  function setPreviewVisible(visible) {
    const body = document.body;
    const id = visible ? "stream-overlay-show" : "stream-overlay-hide";
    if (previewFade?.id === id || (!previewFade && body.hidden === !visible)) return;
    const from = body.hidden ? 0 : getComputedStyle(body).opacity;
    previewFade?.cancel();
    body.hidden = false;
    const to = visible ? getComputedStyle(body).opacity : 0;
    const fade = body.animate([{ opacity: from }, { opacity: to }], { id, duration: 300, easing: "ease", fill: "both" });
    previewFade = fade;
    if (visible) global.byStreamResource?.playEntrance?.(body);
    fade.onfinish = () => {
      if (previewFade !== fade) return;
      body.hidden = !visible;
      previewFade = null;
      fade.cancel();
    };
  }

  // A show request during an exit cancels that exit before it can hide the element.
  const pendingShows = new WeakMap();
  function setElementVisible(node, visible) {
    if (node === document.body) return setPreviewVisible(visible);
    if (!visible && pendingShows.has(node)) {
      pendingShows.get(node)();
      pendingShows.delete(node);
      node.hidden = true;
      return;
    }
    if (pendingShows.has(node)) return;
    const leaving = departures.get(node);
    if (leaving) {
      if (!visible) return;
      departures.delete(node);
      leaving.forEach((motion) => motion.cancel());
    } else if (node.hidden === !visible) return;
    const resource = global.byStreamResource;
    if (!visible) {
      const motions = resource?.playExit?.(node);
      if (!motions?.length) {
        node.hidden = true;
        return;
      }
      trackDeparture(node, motions).then((current) => {
        if (current) node.hidden = true;
        motions.forEach((motion) => motion.cancel());
      });
      return;
    }
    const reveal = () => {
      pendingShows.delete(node);
      resource?.playEntrance?.(node);
    };
    const show = () => {
      node.hidden = false;
      const boxes = layoutPath([node]);
      if (resource?.hasEntrance?.(node) && boxes.some(changingSize)) pendingShows.set(node, afterLayout([node], boxes, reveal));
      else reveal();
    };
    const previous = siblingExits(node);
    if (!previous.length) return show();
    let current = true;
    pendingShows.set(node, () => {
      current = false;
    });
    Promise.allSettled(previous.map((motion) => motion.finished)).then(() => {
      if (current) show();
    });
  }

  // Let the resource timeline own pause, speed, repeats and the final visibility change.
  const resizingTimelines = new WeakSet();
  function timelineResize(timeline) {
    let previous;
    let cancel;
    return (items, animated) => {
      cancel?.();
      cancel = null;
      const replacing = previous && previous !== items[0];
      previous = items[0];
      if (!replacing || !animated) return;
      const boxes = layoutPath(items);
      if (!boxes.some(changingSize)) return;
      const speed = timeline.timeScale();
      timeline.timeScale(0);
      resizingTimelines.add(timeline);
      const resume = () => {
        resizingTimelines.delete(timeline);
        timeline.timeScale(speed);
        cancel = null;
      };
      const release = afterLayout(items, boxes, resume);
      cancel = () => {
        release();
        resume();
      };
    };
  }

  function addTimelineMotion(timeline, node, motion, exiting) {
    if (!motion.frames?.length) return;
    const length = motion.timing.duration + motion.timing.delay;
    if (!length) return;
    const animation = new Animation(new KeyframeEffect(node, motion.frames, motion.timing), document.timeline);
    animation.id = motion.timing.id;
    const cursor = { time: 0 };
    timeline.fromTo(
      cursor,
      { time: 0 },
      {
        time: length,
        duration: length / 1000,
        ease: "none",
        immediateRender: false,
        onUpdate: () => {
          for (let owner = timeline; owner; owner = owner.parent) if (resizingTimelines.has(owner)) return;
          animation.currentTime = cursor.time;
        },
        onComplete: () => {
          if (!exiting) animation.cancel();
        },
        onReverseComplete: () => animation.cancel()
      },
      0
    );
    return animation;
  }

  function elementTimeline(resource, settings, root, owner, phase, descendants = true) {
    const timeline = global.gsap.timeline();
    const roots = Array.isArray(root) ? root : [root];
    const motions = new Map();
    const container = roots[0].closest(resource.elements[owner].selector);
    const whole = elementMotion(settings, owner + ".container", phase);
    if (container && whole.frames?.length) motions.set(container, whole);
    const collection = elementMotion(settings, owner, phase);
    if (collection.frames?.length) for (const part of roots) motions.set(part, collection);
    const children = new Map();
    for (const [id, element] of Object.entries(resource.elements)) {
      if (!element.selector || !fieldEnabled(resource.fields, settings, id + ".perspective")) continue;
      const scope = element.motionItem || element.motionLabel ? id + ".container" : id;
      const motion = elementMotion(settings, scope, phase);
      const childMotion = elementMotion(settings, id + ".children", phase);
      for (const [selector, effect, targets] of [
        [element.selector, motion, motions],
        [directChildren(element.selector), childMotion, children]
      ]) {
        if (!effect.frames?.length) continue;
        for (const part of roots) {
          if (part.matches(selector)) targets.set(part, effect);
          if (descendants) for (const node of part.querySelectorAll(selector)) targets.set(node, effect);
        }
      }
    }
    for (const [node, motion] of children) if (!motions.has(node)) motions.set(node, motion);
    const exits = [];
    for (const [node, motion] of motions) {
      const animation = addTimelineMotion(timeline, node, motion, phase === "exit");
      if (animation && phase === "exit") exits.push(animation);
    }
    if (exits.length) timeline.call(() => exits.forEach((animation) => animation.cancel()));
    return timeline;
  }

  // Keep the original text in the accessibility tree. Only the moving line gets a visual repeat.
  function mountTextOverflow(resource, settings) {
    const rules = Object.entries(resource.fields).filter(([name, field]) => field.overflowSelector && (settings[name] !== "layout" || field.layoutOverflow) && fieldEnabled(resource.fields, settings, name));
    if (!rules.length) return;
    const selectors = rules.map(([, field]) => field.overflowSelector).join(",");
    const lineClass = "stream-ticker-text";
    function measure(view) {
      const line = view.firstElementChild;
      if (!line?.classList.contains(lineClass)) return;
      // Both boxes can round to the same integer while the last glyph is already clipped.
      const available = parseFloat(getComputedStyle(view).width);
      const width = parseFloat(getComputedStyle(line).width);
      if (available > 0 && width > available) {
        line.dataset.repeat = line.textContent;
        line.style.setProperty("--stream-scroll-duration", (width + 32) / 40 + "s");
      } else delete line.dataset.repeat;
    }
    const observer = new ResizeObserver((entries) => {
      for (const { target } of entries) {
        const view = target.classList.contains(lineClass) ? target.parentElement : target;
        if (view?.isConnected) measure(view);
      }
    });
    function apply(node) {
      const rule = rules.find(([, field]) => node.matches(field.overflowSelector));
      if (!rule) return;
      const selected = settings[rule[0]];
      const mode = selected === "layout" ? rule[1].layoutOverflow : selected;
      if (node.dataset.streamOverflow !== mode) node.dataset.streamOverflow = mode;
      let view = node.firstElementChild;
      if (!view && node.textContent) {
        view = document.createElement("span");
        view.className = "stream-text-window";
        if (mode === "ticker" && (selected === "ticker" || settings.animate === "yes")) {
          const line = document.createElement("span");
          line.className = lineClass;
          if (selected === "layout") line.classList.add("stream-ticker-auto");
          line.append(...node.childNodes);
          view.append(line);
        } else view.append(...node.childNodes);
        node.append(view);
      }
      // Scrolling resources can clone a prepared line for their next pass.
      if (view?.firstElementChild?.classList.contains(lineClass)) {
        observer.observe(view);
        observer.observe(view.firstElementChild);
        measure(view);
      }
    }
    function discover(node) {
      if (!(node instanceof Element)) return;
      if (node.matches(selectors)) apply(node);
      node.querySelectorAll(selectors).forEach(apply);
    }
    discover(document.body);
    new MutationObserver((records) => {
      const changed = new Set();
      for (const { target, addedNodes, removedNodes } of records) {
        const parent = target.nodeType === Node.TEXT_NODE ? target.parentElement : target;
        if (parent?.matches(selectors)) changed.add(parent);
        else if (parent?.classList.contains(lineClass) && parent.parentElement) measure(parent.parentElement);
        for (const node of addedNodes) if (node.isConnected) discover(node);
        for (const node of removedNodes)
          if (node instanceof Element && !node.isConnected) {
            observer.unobserve(node);
            node.querySelectorAll(".stream-text-window, ." + lineClass).forEach((part) => observer.unobserve(part));
          }
      }
      for (const node of changed) if (node.isConnected) apply(node);
    }).observe(document.body, { childList: true, characterData: true, subtree: true });
  }

  // Measure intrinsic layout before applying the animated border boxes. Each box changes dimensions
  // while its children retain their measured sizes and their own transforms.
  function mountContainerResize(settings) {
    if (settings.animate !== "yes" || !settings.resizeDuration) return;
    const easing = settings.resizeEasing === "custom" ? settings.resizeEasingBezier : settings.resizeEasing;
    const running = new Map();
    const slots = new WeakMap();
    const observed = new Set();
    const positions = new Map();
    const inlineMoves = new Map();
    const containers = "article,aside,blockquote,div,footer,h1,h2,h3,h4,h5,h6,header,main,nav,p,section,span";
    let scheduled = 0;

    // The slot keeps the renderer DOM and its direct-child selectors intact. At rest it has no box.
    function contentSlot(node) {
      if (slots.has(node)) return slots.get(node);
      const slot = document.createElement("slot");
      node.attachShadow({ mode: "open" }).append(slot);
      slots.set(node, slot);
      return slot;
    }

    function clear(node, state) {
      if (running.get(node) !== state) return;
      running.delete(node);
      state.slot.style.display = "contents";
      node.removeAttribute("data-stream-resizing");
      state.animation.cancel();
    }

    // Offset coordinates exclude authored transforms. Use the DOM parent as the reference
    // so a moving panel carries its children without applying its translation twice.
    function origin(node, cache) {
      if (!node) return { x: 0, y: 0 };
      if (!cache.has(node)) {
        const parent = node.offsetParent;
        const point = origin(parent, cache);
        cache.set(node, { x: point.x + (parent?.clientLeft || 0) + node.offsetLeft, y: point.y + (parent?.clientTop || 0) + node.offsetTop });
      }
      return cache.get(node);
    }

    function textAnchor(style) {
      if (style.textAlign === "center") return 0.5;
      return Number(style.textAlign === "right" || (style.textAlign === "end" && style.direction === "ltr") || (style.textAlign === "start" && style.direction === "rtl"));
    }

    function position(node, cache) {
      const point = origin(node, cache),
        parent = origin(node.parentElement, cache);
      const text = (!node.childElementCount && node.firstChild?.nodeType === Node.TEXT_NODE) || node.firstElementChild?.classList.contains("stream-text-window");
      return { x: point.x - parent.x + (text ? node.offsetWidth * textAnchor(getComputedStyle(node)) : 0), y: point.y - parent.y };
    }

    function measure() {
      scheduled = 0;
      // Relative insets move inline text but are included in offsetLeft/Top. Measure its
      // natural position with those effects temporarily detached, all within this frame.
      for (const motion of inlineMoves.keys()) motion.effect.target = null;
      const current = new Map();
      for (const node of running.keys()) current.set(node, { width: node.offsetWidth, height: node.offsetHeight });
      const root = document.documentElement;
      if (running.size) root.setAttribute("data-stream-measuring", "");
      for (const state of running.values()) state.slot.style.display = "contents";
      const changes = [];
      for (const node of observed) {
        const old = resizeBoxes.get(node);
        const width = node.offsetWidth,
          height = node.offsetHeight;
        if (old?.width === width && old.height === height) continue;
        const box = { width, height };
        resizeBoxes.set(node, box);
        if (!old || !width || !height || !old.width || !old.height) {
          if (running.has(node)) clear(node, running.get(node));
          continue;
        }
        const style = getComputedStyle(node);
        // Inline fragments take their dimensions from the line containing them.
        if (style.display === "inline" || style.display === "contents") continue;
        const layout = { display: style.display, boxSizing: "border-box", gridArea: "1 / 1", flex: "none" };
        for (const property of [
          "paddingTop",
          "paddingRight",
          "paddingBottom",
          "paddingLeft",
          "flexDirection",
          "flexWrap",
          "alignContent",
          "alignItems",
          "justifyContent",
          "justifyItems",
          "rowGap",
          "columnGap",
          "gridTemplateColumns",
          "gridTemplateRows",
          "gridTemplateAreas",
          "gridAutoColumns",
          "gridAutoRows",
          "gridAutoFlow"
        ]) {
          layout[property] = style[property];
        }
        // Keep the same containing block for positioned content while the outer box changes size.
        layout.position = style.position !== "static" || style.transform !== "none" ? "relative" : "static";
        const start = current.get(node) || old;
        const from = {},
          to = {};
        for (const [axis, a, b] of [
          ["width", "Left", "Right"],
          ["height", "Top", "Bottom"]
        ]) {
          const key = "--stream-resize-" + axis;
          const border = parseFloat(style["border" + a + "Width"]) + parseFloat(style["border" + b + "Width"]);
          const padding = parseFloat(style["padding" + a]) + parseFloat(style["padding" + b]);
          // offsetWidth rounds to whole pixels. Preserve fractional space so lines still fit.
          const size = parseFloat(style[axis]) + (style.boxSizing === "border-box" ? 0 : padding + border);
          const target = Number.isFinite(size) ? size : box[axis];
          from[key] = start[axis] + "px";
          to[key] = target + "px";
          layout[axis] = target - border + "px";
        }
        // Keep lines aligned inside the moving edges. Vertical flow starts at the top.
        layout.marginLeft = `calc((var(--stream-resize-width) - ${to["--stream-resize-width"]}) * ${textAnchor(style)})`;
        changes.push({ node, box, layout, from, to });
      }
      const origins = new Map(),
        moves = [];
      const resized = new Set(changes.map(({ node }) => node));
      for (const [node, previous] of positions) {
        if ((!node.offsetWidth && !node.offsetHeight) || node.closest("[data-stream-await-size], [data-stream-exiting]")) {
          previous?.motion?.cancel();
          positions.set(node, null);
          continue;
        }
        const next = position(node, origins);
        if (previous?.x === next.x && previous.y === next.y && !resized.has(node.parentElement) && !resized.has(node)) continue;
        positions.set(node, next);
        if (previous) {
          const progress = previous.clock?.effect.getComputedTiming().progress ?? 1;
          next.fromX = previous.x + ((previous.fromX ?? previous.x) - previous.x) * (1 - progress);
          next.fromY = previous.y + ((previous.fromY ?? previous.y) - previous.y) * (1 - progress);
          moves.push({ node, previous, next });
        }
      }
      root.removeAttribute("data-stream-measuring");
      for (const state of running.values()) state.slot.style.display = state.display;
      for (const { node, box, layout, from, to } of changes) {
        if (running.has(node)) clear(node, running.get(node));
        const slot = contentSlot(node);
        Object.assign(slot.style, layout);
        slot.style.setProperty("--stream-resize-width", "inherit");
        slot.style.setProperty("--stream-resize-height", "inherit");
        node.setAttribute("data-stream-resizing", "");
        const animation = node.animate([from, to], { id: "stream-resize", duration: settings.resizeDuration, easing, fill: "both" });
        const state = { animation, slot, display: layout.display };
        box.animation = animation;
        running.set(node, state);
        animation.finished.then(
          () => clear(node, state),
          () => clear(node, state)
        );
      }
      // Resizing a centered or end-aligned box can already move it into place. Interpolate
      // only the remaining displacement, starting at the visible point if a move is interrupted.
      origins.clear();
      for (const move of moves) move.start = running.size ? position(move.node, origins) : move.next;
      for (const [motion, node] of inlineMoves) motion.effect.target = node;
      for (const { node, previous, next, start } of moves) {
        const dx = next.fromX - start.x,
          dy = next.fromY - start.y;
        previous.motion?.cancel();
        next.clock = running.get(node)?.animation || running.get(node.parentElement)?.animation;
        if (Math.abs(dx) <= 1 && Math.abs(dy) <= 1) continue;
        if (node.getAnimations().some((a) => a.playState === "running" && (a.id === "stream-entrance" || a.id === "stream-exit"))) continue;
        const inline = getComputedStyle(node).display === "inline";
        const frames = inline
          ? [
              { position: "relative", left: dx + "px", top: dy + "px" },
              { position: "relative", left: "0px", top: "0px" }
            ]
          : [{ translate: dx + "px " + dy + "px" }, { translate: "0px 0px" }];
        next.motion = next.clock = node.animate(frames, { id: "stream-position", composite: "add", duration: settings.resizeDuration, easing });
        if (inline) {
          const motion = next.motion;
          inlineMoves.set(motion, node);
          motion.finished.then(
            () => inlineMoves.delete(motion),
            () => inlineMoves.delete(motion)
          );
        }
      }
    }
    function schedule() {
      if (!scheduled) scheduled = requestAnimationFrame(measure);
    }
    const observer = new ResizeObserver((entries) => {
      // Write on the next frame so resizing a parent cannot restart this observation cycle.
      if (entries.some(({ target }) => !running.has(target))) schedule();
    });
    function observe(node) {
      // Native controls and SVG keep their own rendering. Their enclosing HTML box owns resizing.
      if (!(node instanceof HTMLElement) || node.closest("svg, template, script, link, style, .stream-text-window") || node.parentElement?.closest("[data-stream-viewport]")) return;
      if (!positions.has(node)) {
        positions.set(node, null);
        observer.observe(node, { box: "border-box" });
      }
      if (
        (!node.shadowRoot || slots.has(node)) &&
        !observed.has(node) &&
        node.childElementCount &&
        node.matches(containers) &&
        !node.firstElementChild.matches(".stream-text-window,.stream-ticker-text") &&
        !node.closest("[aria-hidden=true], [data-stream-viewport]")
      ) {
        observed.add(node);
      }
    }
    function visit(root, action) {
      if (!(root instanceof HTMLElement)) return;
      action(root);
      root.querySelectorAll(":not(svg *)").forEach(action);
    }
    for (const node of document.body.children) visit(node, observe);
    new MutationObserver((records) => {
      for (const { target, addedNodes, removedNodes } of records) {
        if (target !== document.body) observe(target);
        for (const node of addedNodes) if (node.isConnected) visit(node, observe);
        for (const node of removedNodes)
          if (!node.isConnected)
            visit(node, (part) => {
              observer.unobserve(part);
              positions.get(part)?.motion?.cancel();
              positions.delete(part);
              observed.delete(part);
              if (running.has(part)) clear(part, running.get(part));
              resizeBoxes.delete(part);
            });
      }
      if (records.some(({ type, target }) => type !== "attributes" || positions.has(target))) schedule();
    }).observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true });
    window.addEventListener("resize", schedule);
    document.addEventListener(
      "load",
      () => {
        if (running.size) schedule();
      },
      true
    );
    document.fonts?.addEventListener("loadingdone", schedule);
  }

  function directChildren(selector) {
    return `:is(${selector}) > :not(defs, style, script, title, desc, template, clipPath, mask, filter, linearGradient, radialGradient, symbol)`;
  }

  function mountElementMotion(resource, settings) {
    const targets = [];
    const timelineRoots = Object.values(resource.elements)
      .filter((element) => element.premade === "timeline")
      .map((element) => element.selector)
      .join(",");
    for (const [id, element] of Object.entries(resource.elements)) {
      if (!element.selector || !fieldEnabled(resource.fields, settings, id + ".perspective")) continue;
      if (resource.fields[id + ".children.entrance"]) {
        const entrance = elementMotion(settings, id + ".children", "entrance");
        const exit = elementMotion(settings, id + ".children", "exit");
        if (entrance.frames?.length || exit.frames?.length) targets.push({ selector: directChildren(element.selector), inherited: true, entrance, exit });
      }
      const transform = elementTransform(settings, id);
      const owner = resource.elements[element.parent]?.motionItem === id ? element.parent : id;
      const premade = resource.elements[owner].premade;
      const scope = element.motionItem || element.motionLabel ? id + ".container" : owner;
      const entrance = elementMotion(settings, scope, "entrance", premade);
      const exit = elementMotion(settings, scope, "exit", premade);
      const spaced = ["margin", "padding"].some((property) => ["Top", "Bottom", "Left", "Right"].some((side) => typeof settings[id + "." + property + side] === "number"));
      if (!transform && !entrance?.frames?.length && !exit?.frames?.length && !spaced) continue;
      const [selector, pseudo] = element.selector.split("::");
      targets.push({ selector, spaced, pseudoElement: pseudo ? "::" + pseudo : null, transform, entrance, exit });
    }
    const managedItems = Object.keys(settings).some((key) => (key.endsWith(".entrance") || key.endsWith(".exit")) && settings[key] !== "none");
    if (!targets.length && !managedItems) return;
    const selector = [...targets.map((target) => target.selector), "[data-stream-item]"].join(",");
    const mounted = new WeakMap();
    const entered = new WeakSet();
    const automatic = (node) => {
      const scroll = node.closest("[data-stream-scroll]");
      return !entered.has(node) && !node.closest("[data-stream-exiting], [data-stream-await-size]") && (!scroll || scroll === node || scroll === node.parentElement) && !(timelineRoots && node.closest(timelineRoots));
    };
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting || !entry.target.isConnected || !automatic(entry.target)) continue;
        play(entry.target, "entrance");
      }
    });
    function play(node, phase) {
      if (phase === "entrance" && node.closest("[data-stream-await-size]")) return [];
      observer.unobserve(node);
      if (phase === "entrance") entered.add(node);
      for (const active of node.getAnimations()) if (active.id === "stream-entrance" || active.id === "stream-exit") active.cancel();
      const animations = [];
      const matches = mounted.get(node) || [];
      for (const target of matches) {
        if (target.inherited && matches.some((own) => !own.inherited && !own.pseudoElement && own[phase]?.frames?.length)) continue;
        const motion = target[phase];
        if (motion?.frames?.length) animations.push(node.animate(motion.frames, { ...motion.timing, pseudoElement: target.pseudoElement || null }));
      }
      const item = itemEffects.get(node);
      if (item && !animations.some((animation) => !animation.effect.pseudoElement)) {
        const motion = item[phase];
        const animation = motion.name === "default" && item.playDefault ? item.playDefault(node, phase, motion.timing) : motion.frames?.length && node.animate(motion.frames, motion.timing);
        if (animation) animations.push(animation);
      }
      return animations;
    }

    function mount(node) {
      if (mounted.has(node)) return;
      const matches = targets.filter((target) => node.matches(target.selector));
      mounted.set(node, matches);
      if (
        matches.some((target) => !target.pseudoElement && (target.spaced || target.transform || [target.entrance, target.exit].some((motion) => motion?.frames?.some((frame) => frame.transform)))) &&
        getComputedStyle(node).display === "inline"
      )
        node.setAttribute("data-stream-box", "");
      for (const target of matches) {
        if (target.transform) {
          const frame = { transform: target.transform };
          node.animate([frame, frame], { id: "stream-transform", duration: 1, fill: "forwards", composite: "add", pseudoElement: target.pseudoElement || null });
        }
      }
      if (matches.some((target) => target.entrance?.frames?.length) && automatic(node)) observer.observe(node);
    }
    function visit(root, action, descendants = true) {
      if (root.nodeType !== Node.ELEMENT_NODE) return;
      if (root.matches(selector)) action(root);
      if (descendants) root.querySelectorAll(selector).forEach(action);
    }
    function playTree(root, phase, descendants) {
      const animations = [];
      visit(
        root,
        (node) => {
          mount(node);
          if (node.getClientRects().length) animations.push(...play(node, phase));
        },
        descendants
      );
      return animations;
    }
    resource.hasEntrance = (root, descendants = true) => targets.some(({ selector, entrance }) => entrance?.frames?.length && (root.matches(selector) || (descendants && root.querySelector(selector))));
    resource.playEntrance = (root, descendants) => playTree(root, "entrance", descendants);
    resource.playExit = (root, descendants) => playTree(root, "exit", descendants);
    document.querySelectorAll(selector).forEach(mount);
    new MutationObserver((records) => {
      for (const { target, type, addedNodes, removedNodes } of records) {
        if (type === "attributes")
          visit(target, (child) => {
            if (target.hidden) entered.delete(child);
            else if (mounted.get(child)?.some((part) => part.entrance?.frames?.length) && automatic(child)) observer.observe(child);
          });
        for (const node of addedNodes) if (node.isConnected) visit(node, mount);
        for (const node of removedNodes) {
          if (!node.isConnected)
            visit(node, (child) => {
              observer.unobserve(child);
              mounted.delete(child);
              entered.delete(child);
              for (const animation of child.getAnimations()) if (animation.id === "stream-transform" || animation.id === "stream-entrance" || animation.id === "stream-exit") animation.cancel();
            });
        }
      }
    }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["hidden"] });
  }

  /**
   * Choose black or white from the colors painted behind each text box. Resource layers describe
   * artwork or tints painted behind siblings, which cannot be inferred from CSS ancestry alone.
   */
  function mountTextContrast(resource, settings) {
    const roles = Object.entries(resource.fields).filter(
      ([name, field]) => field.contrastSelector && fieldEnabled(resource.fields, settings, name) && (settings[name] === "auto" || (settings[name] === "appearance" && settings.textContrast === "auto"))
    );
    if (!roles.length) return;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 8;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    const samples = new WeakMap();
    let frame;
    function schedule() {
      if (!frame) frame = requestAnimationFrame(paint);
    }
    function imageSample(node) {
      const url = node.currentSrc || node.src;
      if (!url) return;
      if (samples.get(node)?.url === url) return samples.get(node).image;
      const sample = { url };
      samples.set(node, sample);
      const image = new Image();
      image.crossOrigin = "anonymous";
      image.onload = () => {
        if (samples.get(node) !== sample) return;
        sample.image = image;
        schedule();
      };
      image.src = url;
    }
    function layer(node, bounds) {
      if (!node || node.hidden) return;
      const style = getComputedStyle(node);
      if (style.display === "none" || style.visibility === "hidden") return;
      ctx.save();
      ctx.globalAlpha = Number(style.opacity);
      if (style.mixBlendMode !== "normal") ctx.globalCompositeOperation = style.mixBlendMode;
      const rect = node.getBoundingClientRect();
      const x = ((rect.left - bounds.left) * 8) / bounds.width;
      const y = ((rect.top - bounds.top) * 8) / bounds.height;
      const w = (rect.width * 8) / bounds.width;
      const h = (rect.height * 8) / bounds.height;
      ctx.fillStyle = node instanceof SVGGeometryElement && CSS.supports("color", style.fill) ? style.fill : style.backgroundColor;
      ctx.fillRect(x, y, w, h);
      if (node instanceof HTMLImageElement && w && h) {
        const image = imageSample(node);
        if (image) {
          const scale = Math.max(rect.width / image.naturalWidth, rect.height / image.naturalHeight);
          const sw = rect.width / scale,
            sh = rect.height / scale;
          ctx.drawImage(image, (image.naturalWidth - sw) / 2, (image.naturalHeight - sh) / 2, sw, sh, x, y, w, h);
        }
      }
      ctx.restore();
    }
    function linear(byte) {
      const channel = byte / 255;
      return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
    }
    function paint() {
      frame = 0;
      for (const [, role] of roles) {
        const [selector, pseudo] = role.contrastSelector.split("::");
        for (const node of document.querySelectorAll(selector)) {
          const bounds = node.getBoundingClientRect();
          if (!bounds.width || !bounds.height) continue;
          ctx.clearRect(0, 0, 8, 8);
          const parents = [];
          for (let parent = node; parent; parent = parent.parentElement) parents.unshift(parent);
          for (const parent of parents) {
            layer(parent, bounds);
            for (const item of resource.contrastLayers || []) {
              if (parent.matches(item.surface)) layer(parent.querySelector(item.layer), bounds);
            }
          }
          const pixels = ctx.getImageData(0, 0, 8, 8).data;
          let luminance = 0,
            alpha = 0;
          for (let i = 0; i < pixels.length; i += 4) {
            luminance += pixels[i + 3] * (0.2126 * linear(pixels[i]) + 0.7152 * linear(pixels[i + 1]) + 0.0722 * linear(pixels[i + 2]));
            alpha += pixels[i + 3];
          }
          // An unknown transparent OBS backdrop cannot supply a contrast measurement.
          let ink = "";
          if (alpha >= 8 * 8 * 128) {
            const light = luminance / alpha;
            ink = (light + 0.05) / 0.05 >= 1.05 / (light + 0.05) ? "#000" : "#fff";
          }
          const property = pseudo ? "--stream-ink-" + pseudo : "--stream-ink";
          if (node.style.getPropertyValue(property) !== ink) node.style.setProperty(property, ink);
          node.toggleAttribute(pseudo ? "data-contrast-" + pseudo : "data-contrast", !!ink);
        }
      }
    }
    const style = document.createElement("style");
    style.textContent = roles
      .map(([, role]) => {
        const [selector, pseudo] = role.contrastSelector.split("::");
        return pseudo ? `${selector}[data-contrast-${pseudo}]::${pseudo}{color:var(--stream-ink-${pseudo})!important}` : `${selector}[data-contrast]{color:var(--stream-ink)!important}`;
      })
      .join("\n");
    document.head.append(style);
    new MutationObserver((records) => {
      if (records.some((r) => r.type === "attributes" || [...r.addedNodes, ...r.removedNodes].some((n) => n.nodeType === Node.ELEMENT_NODE))) schedule();
    }).observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ["hidden", "src", "class"] });
    document.addEventListener("load", schedule, true);
    window.addEventListener("resize", schedule);
    resource.refreshContrast = schedule;
    schedule();
  }

  // ===== RESOURCE INITIALIZATION =====
  /**
   * Resolve settings and mount markup in overlay mode; callers must await this before rendering.
   * Overlays use their URL only; an optional prepareResource(resource) hook supplies the editor query.
   * Clone field defaults, apply accepted URL values, then publish settings and integrations together.
   * byStream.ready and the returned promise share this initialization; published urlParameters retains transport state.
   * @param {ResourceDefinition} resource Declared fields, optional constants, and renderer metadata.
   * @param {Object} [integrations={}] Resource-specific hooks exposed to the editor.
   * @returns {Promise<ResourceSettings>} Validated settings, also published through window.byStreamResource.
   */
  function initResource(resource, integrations = {}) {
    resource.fields.animate = {
      type: "switch",
      default: "yes",
      label: "Animate",
      section: "Animation",
      description: "Animate even when the system prefers reduced motion.",
      checkedValue: "yes",
      uncheckedValue: "no",
      options: { yes: "On", no: "Off" }
    };
    const resizeGroup = { section: "Appearance", subsection: "Container resizing", when: ["animate", "yes"] };
    resource.fields.resizeDuration = {
      ...resizeGroup,
      type: "number",
      label: "Resize duration (ms)",
      default: 300,
      min: 0,
      max: 60000,
      step: "any",
      description: "Controls how panels resize and visible elements move when content changes. Set to 0 for instant layout changes."
    };
    Object.assign(resource.fields, curveFields("resizeEasing", "Resize curve", resizeGroup));
    if (resource.fields.width) {
      const { contentSized = true } = resource.fields.width;
      const fixedWidth = resource.fields.width.styleProperty === "width";
      if (fixedWidth) resource.fields.width.description = "0 fits the content or uses the selected Fill width setting.";
      const widthMode = {
        type: "switch",
        default: contentSized ? "content" : "fill",
        label: "Fill width",
        section: resource.fields.width.section,
        ...(fixedWidth ? { when: ["width", "0"] } : {}),
        checkedValue: "fill",
        uncheckedValue: "content",
        options: { fill: "Fill available space", content: "Fit content" },
        styleSelector: "#overlay .panel",
        styleProperty: "width",
        styleValue: (settings) => (settings.widthMode === "fill" ? (contentSized ? "100%" : "") : "fit-content")
      };
      const fields = Object.entries(resource.fields);
      fields.splice(fields.findIndex(([name]) => name === "width") + 1, 0, ["widthMode", widthMode]);
      resource.fields = Object.fromEntries(fields);
    }
    initializeDefaults(resource.fields);
    if (resource.elements) organizeElements(resource);
    for (const [name, value] of Object.entries(resource.fieldDefaults || {})) resource.fields[name].default = value;
    for (const field of Object.values(resource.fields)) {
      if (field.type === "number" && ["font-size", "line-height"].includes(field.styleProperty) && field.default > 0) field.zeroIsDefault = true;
      if (!field.zeroIsDefault) continue;
      field.description = `0 or blank restores ${field.default}${field.styleUnit || ""}.`;
    }
    const overlay = (!editorImports && !global.byConfigurator) || (location.search.length > 1 && !location.hash);
    // Only an attached editor supplies saved preferences; standalone overlays use their URL alone.
    byStream.ready = editorReady
      .then(() => {
        const search = overlay ? location.search : (byStream.prepareResource?.(resource) ?? location.search);
        return readURLParameters(resource.fields, search, resource.legacyFields);
      })
      .then((parameters) => {
        resource.normalizeParameters?.(parameters.values);
        // Resolve one settings object for both consumers before either the renderer or editor starts.
        const settings = {
          ...resource.constants,
          ...Object.fromEntries(Object.entries(resource.fields).map(([name, field]) => [name, structuredClone(field.default)]))
        };
        applyParameters(resource.fields, settings, parameters.values);
        global.byStreamOverlay = overlay;
        if (!editorImports && !global.byConfigurator && location.hash) warnMissingConfigurator();
        global.addEventListener("hashchange", () => {
          if (!editorImports && !global.byConfigurator) {
            if (location.hash) warnMissingConfigurator();
            return;
          }
          if (overlay !== (location.search.length > 1 && !location.hash)) location.reload();
        });
        if (overlay) {
          document.documentElement.setAttribute("data-overlay", "");
          document.documentElement.dataset.animate = settings.animate;
          document.body.append(document.getElementById("overlay-markup").content.cloneNode(true));
          // Metadata-driven CSS is emitted once; selectors also cover rows a renderer creates later.
          const style = document.createElement("style");
          document.body.append(style);
          // WebKit suspends CSS animations while a new font stylesheet is loading.
          // Read selected Animate.css keyframes before font overrides start those requests.
          for (const [id, element] of Object.entries(resource.elements || {})) {
            for (const phase of ["entrance", "exit"]) {
              elementMotion(settings, id, phase);
              if (element.motionItem || element.motionLabel) elementMotion(settings, id + ".container", phase);
              else if (resource.fields[id + ".children.entrance"]) elementMotion(settings, id + ".children", phase);
            }
          }
          const overrides = [];
          for (const [name, field] of Object.entries(resource.fields)) {
            // A zero maximum removes authored CSS caps; other neutral values preserve their base styles.
            const unlimited = (field.styleProperty === "max-width" || field.styleProperty === "max-height") && settings[name] === 0;
            if (!field.styleSelector || !fieldEnabled(resource.fields, settings, name) || (!unlimited && !field.styleValue && settings[name] === field.styleDefault && field.default === field.styleDefault)) continue;
            const value = unlimited ? "none" : field.styleValue ? field.styleValue(settings) : field.type === "font" ? byFont.family(settings[name], '"Courier New", Courier, monospace') : `${settings[name]}${field.styleUnit || ""}`;
            if (value !== "") overrides.push([field, value]);
          }
          if (overrides.length) {
            // Ordering needs a flex parent even when the resource's original layout did not use one.
            for (const parent of new Set(overrides.map(([field]) => field.styleParent).filter(Boolean))) {
              const index = style.sheet.insertRule(`:where(${parent}) {}`, style.sheet.cssRules.length);
              style.sheet.cssRules[index].style.setProperty("display", "flex", "important");
              style.sheet.cssRules[index].style.setProperty("flex-direction", "column");
            }
            for (const [field, value] of overrides) {
              const index = style.sheet.insertRule(`${field.styleSelector} {}`, style.sheet.cssRules.length);
              // Explicit overrides also apply to rotating rows and inline renderer styles.
              // A normal filter declaration lets the entrance multiply its alpha by the configured filter.
              style.sheet.cssRules[index].style.setProperty(field.styleProperty, value, field.styleProperty === "filter" ? "" : "important");
            }
          }
          if (window.parent !== window)
            window.addEventListener("message", (event) => {
              if (event.source === window.parent && event.origin === location.origin && event.data?.type === "stream-preview-visibility" && typeof event.data.visible === "boolean") {
                setElementVisible(document.body, event.data.visible);
              }
            });
          if (resource.elements) {
            mountTextOverflow(resource, settings);
            mountElementMotion(resource, settings);
            mountContainerResize(settings);
            mountTextContrast(resource, settings);
          }
        }
        global.byStreamResource = {
          ...resource,
          settings,
          parameterRules: resource.fields,
          urlParameters: parameters,
          ...integrations
        };
        return settings;
      });
    return byStream.ready;
  }

  // ===== VALUE VALIDATORS AND CLOCK SERVICE =====

  /**
   * Validate ordered account rows without changing their order or deduplicating platforms.
   * Main requires a heading on each row; Popup uses platform and handle only. Invalid data returns null.
   * @param {string} value Raw form or URL value to validate or format.
   * @param {boolean} [withHeading=false] Require a heading string on each Main scene account row.
   * @returns {Array<Object>|null} Accepted account rows; null rejects unsupported data without converting it.
   */
  function parseAccounts(value, withHeading = false) {
    if (value.length > 20000) return null;
    try {
      const entries = JSON.parse(value);
      return Array.isArray(entries) &&
        entries.length <= 100 &&
        entries.every(
          (entry) =>
            entry &&
            typeof entry.platform === "string" &&
            Object.hasOwn(platforms, entry.platform) &&
            typeof entry.handle === "string" &&
            entry.handle.length <= 160 &&
            (!withHeading || (typeof entry.heading === "string" && entry.heading.length <= 160))
        )
        ? entries
        : null;
    } catch {
      return null;
    }
  }

  /**
   * Accept an Intl-supported time zone or empty for the OBS computer's zone; null rejects it.
   * @param {string} value Raw form or URL value to validate or format.
   * @returns {string|null} The accepted zone or empty automatic value; null rejects unsupported input.
   */
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

  /**
   * Canonicalize a valid BCP 47 tag; empty follows the browser locale and null rejects invalid input.
   * @param {string} value Raw form or URL value to validate or format.
   * @returns {string|null} The canonical locale or empty automatic value; null rejects invalid input.
   */
  function parseLocale(value) {
    if (value.length > 50) return null;
    if (!value) return "";
    try {
      return Intl.getCanonicalLocales(value)[0] || "";
    } catch {
      return null;
    }
  }

  /**
   * Validate the newline-backed, ordered list used by the additional-zone multi-select.
   * @param {string} value Raw form or URL value to validate or format.
   * @returns {string|null} Up to three accepted zones in their original order, separated by newlines; null rejects invalid input.
   */
  function parseZones(value) {
    if (value.length > 400) return null;
    const zones = value
      .split("\n")
      .map((x) => x.trim())
      .filter(Boolean);
    return zones.length <= 3 && zones.every((x) => parseZone(x) !== null) ? zones.join("\n") : null;
  }

  /**
   * Require a real ISO date/time with Z or an explicit offset; return its original string or null.
   * @param {string} value Raw form or URL value to validate or format.
   * @returns {string|null} The accepted ISO timestamp with an explicit offset; null rejects impossible or unsupported input.
   */
  function parseTimestamp(value) {
    if (value.length > 40 || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/.test(value)) return null;
    // Date.parse can normalize impossible days; check the written calendar values before accepting it.
    const [year, month, day, hour, minute, second = 0] = value
      .match(/^([0-9]{4})-([0-9]{2})-([0-9]{2})T([0-9]{2}):([0-9]{2})(?::([0-9]{2}))?/)
      .slice(1)
      .map(Number);
    if (month < 1 || month > 12 || day < 1 || day > new Date(Date.UTC(year, month, 0)).getUTCDate() || hour > 23 || minute > 59 || second > 59 || !Number.isFinite(Date.parse(value))) return null;
    return value;
  }

  /**
   * Identify supported raster signatures without decoding or changing the image bytes.
   * @param {Uint8Array} bytes The first twelve or more bytes of a file.
   * @returns {string} Supported MIME type, or empty for an unknown format.
   */
  function imageType(bytes) {
    if ([137, 80, 78, 71, 13, 10, 26, 10].every((byte, i) => bytes[i] === byte)) return "image/png";
    if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return "image/jpeg";
    const text = String.fromCharCode(...bytes.slice(0, 12));
    if (text.startsWith("GIF87a") || text.startsWith("GIF89a")) return "image/gif";
    if (text.startsWith("RIFF") && text.slice(8, 12) === "WEBP") return "image/webp";
    return "";
  }

  /**
   * Allow relative/HTTP(S) media and bounded, signature-checked raster Base64 data URIs.
   * file: is accepted only from a downloaded file: page. No SVG, video data, or raw Base64.
   * @param {string} value Raw form or URL value to validate or format.
   * @returns {boolean} Whether the media value is empty or uses an allowed protocol and local-file boundary.
   */
  function safeImage(value) {
    if (!value) return true;
    if (/^data:/i.test(value)) {
      // Bound decoding independently of editor limits and the URL transport's 1 MiB cap.
      if (value.length > 65536) return false;
      const match = /^data:(image\/(?:png|jpeg|webp|gif));base64,([A-Za-z0-9+/]+={0,2})$/i.exec(value);
      if (!match || match[2].length % 4 !== 0) return false;
      try {
        const bytes = Uint8Array.from(atob(match[2]), (character) => character.charCodeAt(0));
        return imageType(bytes) === match[1].toLowerCase();
      } catch {
        return false;
      }
    }
    try {
      // Resolve relative paths against the resource page and reject local files from hosted pages.
      const url = new URL(value, location.href);
      return ["http:", "https:", "file:"].includes(url.protocol) && (url.protocol !== "file:" || location.protocol === "file:") && !url.username && !url.password;
    } catch {
      return false;
    }
  }

  /**
   * Run one clock-aligned update loop and suspend scheduled ticks while the document is hidden.
   * Visibility/pageshow events refresh immediately. Returning false stops scheduling until a later resume.
   * @param {function(): (boolean|void)} update Refresh callback; false pauses scheduling until a later visibility/pageshow event.
   * @param {number} [interval=1000] Update interval in milliseconds.
   * @param {function(): void} [interpolate] Optional lightweight visual update between clock ticks.
   * @returns {void} Registers one visibility-aware loop; it does not expose a cancellation handle.
   */
  function watch(update, interval = 1000, interpolate) {
    let pending, frame;
    function stop() {
      clearTimeout(pending);
      cancelAnimationFrame(frame);
    }
    function paint() {
      interpolate();
      frame = requestAnimationFrame(paint);
    }
    function resume() {
      // Visibility and page events replace the pending tick rather than starting another loop.
      stop();
      const keepUpdating = update() !== false;
      // Align the next tick to the clock boundary instead of adding a full interval after rendering.
      if (keepUpdating && !document.hidden) {
        pending = setTimeout(resume, interval - (Date.now() % interval));
        if (interpolate) frame = requestAnimationFrame(paint);
      }
    }
    document.addEventListener("visibilitychange", resume);
    global.addEventListener("pagehide", stop);
    global.addEventListener("pageshow", resume);
    resume();
  }

  // ===== NATIVE OBS INPUT (DRAFT, SAME DOCUMENT ONLY) =====
  // Each renderer subscribes after mounting. Nothing buffers input before that point.
  const nativeChannels = new Map();
  const finite = (value, low, high) => Number.isFinite(value) && value >= low && value <= high;
  const boundedText = (value, limit) => typeof value === "string" && value.length <= limit;
  const list = (value, limit, valid) => Array.isArray(value) && value.length <= limit && Array.from(value).every(valid);
  const unique = (values) => new Set(values).size === values.length;

  /** Copy only the bounded fields consumed by this channel. Null rejects the entire packet. */
  function nativeSnapshot(channel, state) {
    if (!state || typeof state !== "object" || Array.isArray(state)) return null;
    if (channel === "keyboard" && list(state.keys, 256, (key) => typeof key === "string" && /^[A-Za-z][A-Za-z0-9]{0,39}$/.test(key)) && unique(state.keys)) {
      return { keys: [...state.keys] };
    }
    if (channel === "mouse" && list(state.buttons, 5, (button) => Number.isInteger(button) && finite(button, 0, 4)) && unique(state.buttons) && [state.dx, state.dy, state.wheel].every((n) => finite(n, -4096, 4096))) {
      return { buttons: [...state.buttons], dx: state.dx, dy: state.dy, wheel: state.wheel };
    }
    if (channel === "controller") {
      const validPad = (pad) => pad && Number.isInteger(pad.index) && finite(pad.index, 0, 7) && boundedText(pad.id, 128) && pad.id.length > 0 && list(pad.buttons, 64, (n) => finite(n, 0, 1)) && list(pad.axes, 32, (n) => finite(n, -1, 1));
      if (!list(state.pads, 8, validPad) || !unique(state.pads.map((pad) => pad.index))) return null;
      return {
        pads: state.pads.map(({ index, id, buttons, axes }) => ({
          index,
          id,
          buttons: [...buttons],
          axes: [...axes]
        }))
      };
    }
    if (channel === "media") {
      if (state.available === false) return { available: false };
      const { available, title, artist, album, cover, duration, position, playback } = state;
      if (
        available !== true ||
        ![title, artist, album].every((s) => boundedText(s, 512)) ||
        !boundedText(cover, 65536) ||
        !safeImage(cover) ||
        !finite(duration, 0, 604800) ||
        !finite(position, 0, 604800) ||
        !["playing", "paused", "stopped"].includes(playback)
      )
        return null;
      return {
        available,
        title,
        artist,
        album,
        cover,
        duration,
        position: duration ? Math.min(duration, position) : position,
        playback
      };
    }
    return null;
  }

  /**
   * Register the overlay's sole consumer of a native channel. Abort on renderer teardown.
   * @param {string} channel Keyboard, mouse, controller or media channel ID.
   * @param {Function} render Receives (snapshot, first), or null to release held input.
   * @param {AbortSignal} signal Lifetime of the mounted renderer.
   */
  function subscribeNative(channel, render, signal) {
    if (signal.aborted) return;
    if (nativeChannels.has(channel)) throw new Error("Native channel already subscribed: " + channel);
    const staleAfter = 5000;
    let timer,
      deadline = 0,
      sequence = -1;
    function release() {
      clearTimeout(timer);
      deadline = 0;
      sequence = -1;
      render(null);
    }
    function receive(packet) {
      if (packet.channel === "reset") {
        release();
        return true;
      }
      if (!Number.isSafeInteger(packet.seq) || packet.seq < 0) return false;
      const state = nativeSnapshot(channel, packet.state);
      if (!state) return false;
      if (deadline && performance.now() >= deadline) release();
      if (packet.seq <= sequence) return false;
      const first = sequence === -1;
      sequence = packet.seq;
      clearTimeout(timer);
      deadline = performance.now() + staleAfter;
      timer = setTimeout(release, staleAfter);
      render(state, first);
      return true;
    }
    nativeChannels.set(channel, receive);
    global.addEventListener("pagehide", release, { signal });
    signal.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        nativeChannels.delete(channel);
      },
      { once: true }
    );
  }

  /**
   * Deliver a version 1 packet in the renderer's own document.
   * @param {Object} packet A reset or a sequenced complete channel snapshot.
   * @returns {boolean} Whether a mounted renderer accepted the packet.
   */
  function receiveNative(packet) {
    if (!packet || packet.version !== 1) return false;
    if (packet.channel === "reset") {
      for (const receive of nativeChannels.values()) receive(packet);
      return nativeChannels.size > 0;
    }
    return nativeChannels.get(packet.channel)?.(packet) ?? false;
  }

  // ===== PUBLIC RESOURCE HELPERS =====

  // Publish these before DOMContentLoaded so resource handlers can declare fields in either mode.
  Object.assign(byStream, {
    readURLParameters,
    internalParameters,
    fieldEnabled,
    platforms,
    validParameter,
    applyParameters,
    settingsURL,
    whenFields,
    textFields,
    surfaceFields,
    placementFields,
    shadowFields,
    filterFields,
    offsetFields,
    insetFields,
    fadeFields,
    layoutFields,
    cycleParameters,
    elementMotion,
    elementTimeline,
    playElementMotion,
    enterListItem,
    timelineResize,
    removeWithMotion,
    setElementVisible,
    changeItems,
    changingText,
    scrollItems,
    dateTimeFields,
    dateTimeFormatter,
    durationFormats,
    formatDuration,
    initResource,
    preventOverlayInputDefaults,
    subscribeNative,
    receiveNative,
    parseAccounts,
    parseZone,
    parseLocale,
    parseZones,
    parseTimestamp,
    safeImage,
    imageType,
    watch
  });

  byStream.initialized = true;
})(window);
