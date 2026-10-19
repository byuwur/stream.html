/**
 * File: resource.js
 * @file Native resource fields, URL validation, styling, formatting, and overlay startup.
 * Dependencies: SPA.js _functions.js for compressed URLs; _fonts.js for font overrides.
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
 * @property {string} [description] Help text shown beside the control and in parameter help.
 * @property {string} [section] Top-level group; insertion order determines display order.
 * @property {string} [subsection] Nested control group inside the section.
 * @property {string} [id] Explicit HTML control identifier.
 * @property {string} [icon] Font Awesome icon class; overrides the shared icon rule.
 * @property {Object<string, string>} [options] Stored option IDs mapped to displayed labels.
 * @property {function(string): (ResourceValue|null)} [validate] Return accepted data or null to reject; no format migration is performed.
 * @property {boolean} [optional] Accept an empty string before numeric/color validation.
 * @property {number} [min] Minimum accepted numeric value.
 * @property {number} [max] Maximum accepted numeric value.
 * @property {number|string} [step] Numeric increment or "any".
 * @property {number} [maxlength] Maximum accepted text or serialized-content length.
 * @property {string} [checkedValue] Serialized value when a switch is on.
 * @property {string} [uncheckedValue] Serialized value when a switch is off.
 * @property {Array<string>} [when] Parent field and allowed values; a parent alone requires nonempty text. Inactive ancestors disable descendants and their overrides.
 * @property {Object} [entries] Row-editor choices, choiceKey, textFields, newEntry, limit, and addLabel; map selects a key/value representation.
 * @property {string} [styleSelector] Native elements affected by the override, including rows created later.
 * @property {string} [styleProperty] CSS property written by the override.
 * @property {string} [styleUnit] Unit appended to scalar settings, such as px, deg, or %.
 * @property {ResourceValue} [styleDefault] Neutral generated value that leaves authored CSS unchanged.
 * @property {function(ResourceSettings): string} [styleValue] Compound CSS writer; empty output keeps authored CSS.
 * @property {string} [styleParent] Container that needs flex layout when an order/layout override is applied.
 */

/** @typedef {Object<string, ResourceField>} ResourceFields */
/** @typedef {Object<string, ResourceValue>} ResourceSettings */

/**
 * One resource owns its field defaults, accepted values, and renderer.
 * initResource() publishes its validated settings before either overlay rendering or editor setup.
 * @typedef {Object} ResourceDefinition
 * @property {string} version Resource version shown by the editor.
 * @property {string} title Resource title.
 * @property {string} description Resource purpose shown above its settings.
 * @property {Array<number>} preview Preview width and height in pixels.
 * @property {ResourceFields} fields Parameter definitions in display order.
 * @property {Array<string>} urlRequired Parameters retained even at defaults to enable overlay mode and preserve anchors/content.
 * @property {Object<string, ResourceValue>} [constants] Renderer-only defaults excluded from URL fields.
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
  // Resource handlers replace this before the optional editor's DOMContentLoaded handler awaits it.
  byStream.ready = Promise.resolve();

  /**
   * Decode URL transport markers; readable parameters override packed values.
   * Failed compressed values are omitted so resource defaults and valid neighbors survive.
   * data packs the whole query; dr: packs one field; raw: escapes a literal reserved prefix.
   * This only decodes transport. applyParameters() validates and assigns resource values later.
   * @param {ResourceFields} fields Declared resource fields and their validation metadata.
   * @param {string} [search=location.search] Encoded query string to decode.
   * @returns {Promise<{values: URLSearchParams, compressedFields: Set<string>, error: string}>} Decoded values, compressed field names, and a warning (empty on success).
   */
  async function readURLParameters(fields, search = location.search) {
    const explicit = new URLSearchParams(search);
    const selectedFields = new Set();
    let errorMessage = "";
    let values = explicit;
    // Expand the whole query first, then let readable parameters replace matching packed values.
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
    // Decode fields independently so one broken compressed value does not discard valid neighbors.
    for (const [name, value] of values) {
      if (!Object.hasOwn(fields, name)) continue;
      if (value.startsWith("raw:")) decoded.append(name, value.slice(4));
      else if (value.startsWith("dr:")) {
        try {
          // Decompression limits use UTF-8 bytes: allow up to four per declared character, capped at 1 MiB.
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

  // ==========
  // ==== FIELD VALIDATION AND DECLARATIONS ====
  // ==========

  /* Field metadata is the shared contract between resource scripts, native CSS, and the editor:
   * type/default/validate define accepted values; options maps stored IDs to displayed labels.
   * section/subsection and declaration order define form placement; when defines field availability.
   * styleSelector/styleProperty target a native CSS override, with styleUnit appended to scalar values.
   * styleDefault marks a neutral generated value; resource-specific defaults can override it.
   * styleValue(settings) builds compound CSS from several validated fields instead of appending a unit.
   * styleParent enables a flex container when a layout override is present.
   * Helpers below return ordinary field declarations; resource JS remains the owner of their defaults.
   */

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
    if (rule.optional && value === "") return true;
    if (rule.type === "color" && !CSS.supports("color", `#${value.replace(/^#/, "")}`)) return false;
    if (rule.styleProperty && rule.type === "text" && !CSS.supports(rule.styleProperty, value)) return false;
    if (rule.type === "number") {
      const number = Number(value);
      if (!value.trim() || !Number.isFinite(number) || number < Number(rule.min) || number > Number(rule.max)) return false;
      if (rule.step && rule.step !== "any") {
        const steps = (number - Number(rule.min)) / Number(rule.step);
        // Decimal increments can produce tiny rounding errors even at valid step boundaries.
        if (Math.abs(steps - Math.round(steps)) > 1e-8) return false;
      }
    }
    if (name.endsWith("Url") && !safeImage(value)) return false;
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
    if (!when) return true;
    const [parent, ...values] = when;
    const value = String(settings[parent]);
    // Matching the immediate parent is insufficient if an earlier ancestor is inactive.
    return (values.length ? values.includes(value) : value !== "") && fieldEnabled(fields, settings, parent);
  }

  /**
   * Apply valid declared values to the supplied settings object in place.
   * Callers seed defaults first; empty values restore declared defaults, while missing/invalid values leave that state intact.
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
      if (value === "") {
        // Structured defaults must not become mutable aliases of the field declaration.
        settings[name] = structuredClone(rule.default);
        continue;
      }
      let parsed;
      if (rule.validate) parsed = rule.validate(value);
      else {
        if (!validParameter(fields, name, value)) continue;
        parsed = rule.type === "number" && value !== "" ? Number(value) : value;
      }
      if (parsed === null) continue;
      if (rule.type === "color" && !(rule.optional && parsed === "")) parsed = `#${String(parsed).replace(/^#/, "")}`;
      settings[name] = parsed;
    }
    // Resolve availability after applying every parameter, regardless of its order in the URL.
    for (const [name, field] of Object.entries(fields)) {
      if (!fieldEnabled(fields, settings, name)) settings[name] = field.type === "switch" ? field.uncheckedValue : structuredClone(field.default);
    }
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
      if (properties.includes("size"))
        fields[`${name}FontSize`] = {
          type: "number",
          default: 0,
          label: `${label} size override (px)`,
          section,
          description: "Use 0 to turn off the size override and keep the base size.",
          min: 0,
          max: 400,
          step: "any",
          styleSelector: selector,
          styleProperty: "font-size",
          styleUnit: "px",
          styleDefault: 0
        };
      if (properties.includes("color"))
        fields[`${name}Color`] = {
          type: "color",
          default: "",
          label: `${label} color`,
          section,
          description: "Clearing the field restores its default color.",
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
          label: `${label} weight override`,
          section,
          options: { 300: "Light", 400: "Regular", 500: "Medium", 600: "Semibold", 700: "Bold", 800: "Extra bold", 900: "Black" },
          styleSelector: selector,
          styleProperty: "font-weight"
        },
        [`${name}Style`]: {
          type: "select",
          default: "",
          label: `${label} style override`,
          section,
          subsection: "Typography details",
          options: { normal: "Normal", italic: "Italic" },
          styleSelector: selector,
          styleProperty: "font-style"
        },
        [`${name}Case`]: {
          type: "select",
          default: "",
          label: `${label} case override`,
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
      Object.assign(result, whenFields(conditions[name], fields));
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
      if (properties.includes("background")) fields[`${name}Background`] = { ...shared, type: "color", label: `${label} background`, maxlength: 80, styleProperty: "background-color" };
      if (properties.includes("padding")) fields[`${name}Padding`] = { ...shared, type: "number", label: `${label} padding (px)`, min: 0, max: 300, step: "any", styleProperty: "padding", styleUnit: "px" };
      if (properties.includes("radius")) fields[`${name}Radius`] = { ...shared, type: "number", label: `${label} corner radius (px)`, min: 0, max: 1000, step: "any", styleProperty: "border-radius", styleUnit: "px" };
      if (properties.includes("border"))
        Object.assign(fields, {
          [`${name}BorderWidth`]: { ...shared, subsection: "Border", type: "number", label: `${label} border width (px)`, min: 0, max: 100, step: "any", styleProperty: "border-width", styleUnit: "px" },
          [`${name}BorderColor`]: { ...shared, subsection: "Border", type: "color", label: `${label} border color`, maxlength: 80, styleProperty: "border-color" },
          [`${name}BorderStyle`]: {
            ...shared,
            subsection: "Border",
            type: "select",
            label: `${label} border style override`,
            options: { none: "Off", hidden: "Hidden", solid: "Solid", dashed: "Dashed", dotted: "Dotted", double: "Double" },
            styleProperty: "border-style"
          }
        });
      if (properties.includes("shadow")) Object.assign(fields, shadowFields(`${name}Shadow`, label, selector, "box-shadow", shared.section));
      Object.assign(result, whenFields(conditions[name], fields));
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
    return initializeDefaults({
      visualScale: { ...shared, type: "number", label: "Visual scale (%)", description: "100% is the original size. Negative values flip both axes.", min: -500, max: 500, step: "any", styleProperty: "scale", styleUnit: "%" },
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
    });
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
    const shared = { section, subsection: "Shadow / glow" };
    const toggle = { type: "switch", default: "no", checkedValue: "yes", uncheckedValue: "no", options: { yes: "On", no: "Off" } };
    const fields = {};
    for (const [key, title, color] of [
      [name, "Shadow", "#00000080"],
      [`${name}Glow`, "Glow", "#FFFFFF80"]
    ]) {
      const active = { ...shared, when: [key, "yes"] };
      fields[key] = { ...shared, ...toggle, label: title, icon: key === name ? "fa-cloud" : "fa-wand-magic-sparkles" };
      Object.assign(fields, {
        [`${key}Color`]: { ...active, type: "color", default: color, label: `${title} color and transparency`, icon: "fa-palette", maxlength: 80 },
        [`${key}Blur`]: { ...active, type: "number", default: key === name ? 12 : 20, label: `${title} blur / softness (px)`, icon: "fa-cloud", min: 0, max: 300, step: "any" }
      });
      if (key === name)
        Object.assign(fields, {
          [`${key}X`]: { ...active, type: "number", default: 0, label: "Horizontal distance (px)", icon: "fa-arrows-left-right", min: -1000, max: 1000, step: "any" },
          [`${key}Y`]: { ...active, type: "number", default: 4, label: "Vertical distance (px)", icon: "fa-arrows-up-down", min: -1000, max: 1000, step: "any" }
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
    const shared = { section, subsection: backdrop ? "Backdrop filters" : "Color and blur" };
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
    for (const [key, { filter, unit, ...rule }] of Object.entries(adjustments)) fields[`${name}${key}`] = { ...shared, when: [`${name}Mode`, "custom"], type: "number", min: 0, step: "any", ...rule };
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
    return fields;
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
    const shared = { section, subsection: label };
    return initializeDefaults({
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
    });
  }

  /**
   * Declare signed pixel edge overrides; all zero preserves CSS, otherwise zero edges become auto.
   * @param {string} name Field or item identifier.
   * @param {string} label Human-readable label.
   * @param {string} selector CSS selector identifying the target elements.
   * @returns {ResourceFields} Fresh edge-position fields with one inset writer.
   */
  function insetFields(name, label, selector) {
    const shared = { section: "Size & placement", subsection: label };
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
        description: "Use 0 to keep the resource's edge placement."
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
    return initializeDefaults(fields);
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
    const shared = { section: "Details", subsection: label };
    const active = { ...shared, when: [`${name}Mode`, "custom"] };
    return {
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
    };
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
    const shared = { default: "", optional: true, section: "Composition", ...(prefix !== "content" ? { subsection: `${label} layout` } : {}), styleParent: selector };
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
        description: "Lower values appear first. Empty preserves the original order.",
        min: -100,
        max: 100,
        step: 1,
        styleSelector: child,
        styleProperty: "order"
      };
    return initializeDefaults(fields);
  }

  /**
   * Shared cycle timings; the named parent must offer fade/slide modes for conditional controls.
   * @param {string} [parent="transition"] Element that receives the created content.
   * @returns {ResourceFields} Fresh duration, delay, and easing fields controlled by the transition mode.
   */
  function transitionFields(parent = "transition") {
    return {
      transitionDuration: { type: "number", default: 450, label: "Transition duration (ms)", section: "Animation", when: [parent, "fade", "slide"], min: 0, max: 10000, step: "any" },
      transitionEasing: {
        type: "select",
        default: "linear",
        label: "Transition easing",
        section: "Animation",
        when: [parent, "fade", "slide"],
        options: { linear: "Linear", ease: "Ease", "ease-in": "Ease in", "ease-out": "Ease out", "ease-in-out": "Ease in and out" }
      },
      slideDistance: { type: "number", default: 24, label: "Slide distance (px)", section: "Animation", when: [parent, "slide"], min: -1000, max: 1000, step: "any" }
    };
  }

  // ==========
  // ==== DATE, TIME, AND DURATION FORMATS ====
  // ==========

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

  const durationFormats = { clock: "01:02:03 (hours:minutes:seconds)", stopwatch: "62:03 (minutes:seconds)", hours: "01:02 (hours:minutes)", units: "1h 2m 03s", seconds: "3723 (total seconds)" };

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
        description: "Patterns use Gregorian dates. Month names follow the selected locale.",
        options: dateFormats
      },
      timeFormat: {
        type: "select",
        default: timeFormat,
        label: "Time of day format",
        section: "Date & time",
        description: "Choose a 12- or 24-hour pattern, with or without seconds. Localized time uses the resource's locale and hour settings.",
        options: timeFormats
      }
    };
    if (locale) fields.locale = { type: "locale", default: "", label: "Locale", section: "Date & time", validate: parseLocale, maxlength: 50 };
    if (timeZone) fields.timeZone = { type: "timezone", default: "", label: "Time zone", section: "Date & time", validate: parseZone, maxlength: 100 };
    return initializeDefaults(fields);
  }

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
    const types = { yyyy: "year", MMMM: "month", MMM: "month", MM: "month", dd: "day", HH: "hour", hh: "hour", H: "hour", h: "hour", mm: "minute", ss: "second", a: "dayPeriod" };
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
   * @param {null} [milliseconds=null] Optional fractional milliseconds.
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

  // ==========
  // ==== RESOURCE URLS AND NATIVE LIFECYCLE ====
  // ==========

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
        // Required parameters keep default configurations in overlay mode even when nothing was edited.
        if (resource.urlRequired.includes(name)) return true;
        if (!fieldEnabled(parameterRules, settings, name)) return false;
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
        return [name, text];
      });
    const url = new URL(location.href);
    if (url.protocol !== "file:") url.pathname = url.pathname.replace(/\/index\.html$/, "/");
    url.hash = "";
    url.search = new URLSearchParams(values).toString().replace(/=raw%3A/g, "=raw:");
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
    initializeDefaults(resource.fields);
    const overlay = location.search.length > 1 && !location.hash;
    // Only an attached editor supplies saved preferences; standalone overlays use their URL alone.
    const search = overlay ? location.search : (byStream.prepareResource?.(resource) ?? location.search);
    byStream.ready = readURLParameters(resource.fields, search).then((parameters) => {
      // Resolve one settings object for both consumers before either the renderer or editor starts.
      const settings = { ...resource.constants, ...Object.fromEntries(Object.entries(resource.fields).map(([name, field]) => [name, structuredClone(field.default)])) };
      applyParameters(resource.fields, settings, parameters.values);
      global.byStreamOverlay = overlay;
      global.addEventListener("hashchange", () => {
        if (overlay !== (location.search.length > 1 && !location.hash)) location.reload();
      });
      if (overlay) {
        document.documentElement.setAttribute("data-overlay", "");
        document.body.append(document.getElementById("overlay-markup").content.cloneNode(true));
        // Metadata-driven CSS is emitted once; selectors also cover rows a renderer creates later.
        const overrides = [];
        for (const [name, field] of Object.entries(resource.fields)) {
          if (!field.styleSelector || !fieldEnabled(resource.fields, settings, name) || (!field.styleValue && settings[name] === field.styleDefault)) continue;
          const value = field.styleValue ? field.styleValue(settings) : field.type === "font" ? byFont.family(settings[name], '"Courier New", Courier, monospace') : `${settings[name]}${field.styleUnit || ""}`;
          if (value !== "") overrides.push([field, value]);
        }
        if (overrides.length) {
          const style = document.createElement("style");
          document.body.append(style);
          // Ordering needs a flex parent even when the resource's original layout did not use one.
          for (const parent of new Set(overrides.map(([field]) => field.styleParent).filter(Boolean))) {
            const index = style.sheet.insertRule(`:where(${parent}) {}`, style.sheet.cssRules.length);
            style.sheet.cssRules[index].style.setProperty("display", "flex", "important");
            style.sheet.cssRules[index].style.setProperty("flex-direction", "column");
          }
          for (const [field, value] of overrides) {
            const index = style.sheet.insertRule(`${field.styleSelector} {}`, style.sheet.cssRules.length);
            // Explicit overrides also apply to rotating rows and inline renderer styles.
            style.sheet.cssRules[index].style.setProperty(field.styleProperty, value, "important");
          }
        }
      }
      global.byStreamResource = { ...resource, settings, parameterRules: resource.fields, urlParameters: parameters, ...integrations };
      return settings;
    });
    return byStream.ready;
  }

  // ==========
  // ==== VALUE VALIDATORS AND CLOCK SERVICE ====
  // ==========

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
   * Allow empty, relative, or HTTP(S) media; file: is accepted only from a downloaded file: page.
   * @param {string} value Raw form or URL value to validate or format.
   * @returns {boolean} Whether the media value is empty or uses an allowed protocol and local-file boundary.
   */
  function safeImage(value) {
    if (!value) return true;
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
   * @returns {void} Registers one visibility-aware loop; it does not expose a cancellation handle.
   */
  function watch(update, interval = 1000) {
    let pending;
    function resume() {
      // Visibility and page events replace the pending tick rather than starting another loop.
      clearTimeout(pending);
      const keepUpdating = update() !== false;
      // Align the next tick to the clock boundary instead of adding a full interval after rendering.
      if (keepUpdating && !document.hidden) pending = setTimeout(resume, interval - (Date.now() % interval));
    }
    document.addEventListener("visibilitychange", resume);
    global.addEventListener("pagehide", () => clearTimeout(pending));
    global.addEventListener("pageshow", resume);
    resume();
  }

  // ==========
  // ==== PUBLIC RESOURCE HELPERS ====
  // ==========

  // Publish these before DOMContentLoaded so resource handlers can declare fields in either mode.
  Object.assign(byStream, {
    readURLParameters,
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
    transitionFields,
    dateTimeFields,
    dateTimeFormatter,
    durationFormats,
    formatDuration,
    initResource,
    parseAccounts,
    parseZone,
    parseLocale,
    parseZones,
    parseTimestamp,
    safeImage,
    watch
  });

  byStream.initialized = true;
})(window);
