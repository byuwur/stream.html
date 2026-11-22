/**
 * File: keyboard/keyboard.js
 * @file Browser-focused keyboard/mouse input and editable Kenney SVG composition.
 * Deps: resource.js, keys/*.svg (CC0).
 */
const keyboardResourceURL = document.currentScript.src;

document.addEventListener("DOMContentLoaded", () => {
  byStream.ready = initKeyboardResource();
});

/** Initialize the native resource and its overlay-owned artwork, input state, and listeners. */
async function initKeyboardResource() {
  await byStream.assetsReady;
  const layouts = byKeyboardLayouts;
  const keyOptions = Object.fromEntries(Object.entries(layouts.keys).map(([code, value]) => [code, `${code} · ${value.label}`]));
  // ===== KEYBOARD CONFIGURATION =====
  const toggle = {
    type: "switch",
    checkedValue: "yes",
    uncheckedValue: "no",
    options: { yes: "On", no: "Off" }
  };
  const keyboardFields = {
    section: "Input",
    when: (settings) => ["keyboard", "both"].includes(settings.mode),
    retainInactive: true
  };
  const labelFields = {
    section: "Input",
    when: (settings) => keyboardFields.when(settings) || (settings.showHistory === "yes" && settings.historySource !== "mouse"),
    retainInactive: true
  };
  const appearance = { section: "Appearance", retainInactive: true };
  // ===== RESOURCE CONFIGURATION =====
  const resource = {
    version: "1.2", // 2026-11-20
    title: "Keyboard & Mouse",
    description: "Live browser-focused keyboard, mouse, and optional ephemeral Input History. Use OBS Interact to receive input; this cannot capture other applications.",
    preview: [1280, 720],
    urlRequired: ["mode"],
    sectionOrder: ["General", "Keyboard", "Mouse", "Appearance", "Input History", "Whole overlay"],
    sectionIcons: { Mouse: "fa-solid fa-computer-mouse", "Input History": "fa-solid fa-clock-rotate-left" },
    legacyFields: ["historyAnimation", "shellImage", "keyImage"],
    legacyOffsets: {
      keyboardX: ["keyboard.translateX", 3840],
      keyboardY: ["keyboard.translateY", 2160],
      mouseX: ["mouse.translateX", 3840],
      mouseY: ["mouse.translateY", 2160]
    },
    /** Resolve the former surface-specific URLs and tint choices into the shared image controls. */
    normalizeParameters(values) {
      byStream.inputHistory.migrateAnimation(values);
      if (!values.has("imageUrl")) {
        const image = values.get(values.get("imageTarget") === "keys" ? "keyImage" : "shellImage") || values.get("keyImage");
        if (image) values.set("imageUrl", image);
      }
      if (values.get("imageTarget") === "both") values.set("imageTarget", "all");
      const tint = values.get("imageTint");
      if (tint === "none") values.set("imageTint", "no");
      if (["texture", "monochrome", "chroma"].includes(tint)) {
        values.set("imageTint", "yes");
        if (!values.has("imageTintStrength")) values.set("imageTintStrength", "100");
        if (!values.has("imageBlendMode")) values.set("imageBlendMode", tint === "texture" ? "multiply" : "fill");
      }
      values.delete("shellImage");
      values.delete("keyImage");
    },
    elements: {
      stage: { label: "Whole overlay", selector: "#keyboard-overlay", container: true },
      overlay: { label: "Appearance", selector: "#input-scene" },
      keyboard: {
        label: "Keyboard",
        selector: "#keyboard",
        fields: ["layout", "platform", "standard", "displayedKeys", "layoutDensity", "keySpacing", "keyboardScale"],
        groups: ["Key groups"],
        when: ["mode", "both", "keyboard"]
      },
      keys: { label: "Keys", selector: "#keyboard .input-key", parent: "keyboard", box: false, fields: ["keycapStyle", "variant", "keyColor", "pressedColor", "keySize", "keyProportion", "pressEffect", "releaseDuration"] },
      legend: { label: "Key legends", selector: "#keyboard :is(.key-text,.key-legend)", parent: "keys", box: false, fields: ["legends", "keyLabels", "legendColor", "pressedLegendColor"], textOverflow: ".key-label-text" },
      action: { label: "Key action", selector: "#keyboard .key-action", parent: "keys", box: false, fields: ["keyActions", "showActions"], textOverflow: ".key-action-text" },
      keyboardShell: { label: "Shell", selector: "#keyboard :is(.keyboard-shell,.shell-highlight)", parent: "keyboard", box: false, fields: ["shell", "shellColor"] },
      texture: { label: "Image background", selector: "#keyboard .keyboard-texture", parent: "keyboard", box: false, groups: ["Image background"] },
      mouse: { label: "Mouse", selector: "#mouse", groups: ["Mouse"], when: ["mode", "both", "mouse"] },
      mouseButtons: { label: "Buttons", selector: "#mouse .mouse-button", parent: "mouse", box: false, fields: ["mouseButtonColor", "mousePressedColor"] },
      movement: { label: "Movement indicator", selector: "#mouse .mouse-movement", parent: "mouse", box: false, fields: ["mouseMovement"] },
      history: { label: "Input History", selector: ".input-history", motionItem: "historyEntry", premade: true, groups: ["Input History"], when: ["showHistory", "yes"] },
      historyEntry: { label: "History entry", selector: ".history-entry", parent: "history" },
      historyPrompt: { label: "Input prompt", selector: ".history-prompt", parent: "historyEntry", textOverflow: ".history-prompt:not(:has(svg))" },
      historySourceLabel: { label: "Input source label", selector: ".history-prompts > small", parent: "historyEntry", textOverflow: true },
      historyCount: { label: "Press multiplier", selector: ".history-count", parent: "historyEntry", textOverflow: true }
    },
    fields: {
      source: { type: "select", default: "browser", label: "Input source", section: "Input", options: { browser: "Browser", helper: "OBS helper (TBD)" }, description: "Native snapshots require a future OBS helper." },
      mode: {
        type: "select",
        default: "both",
        label: "Input mode",
        section: "Input",
        description: "Hidden leaves only the optional Input History.",
        options: { keyboard: "Keyboard only", mouse: "Mouse only", both: "Keyboard + Mouse", hidden: "Hidden" }
      },
      layout: { ...labelFields, type: "select", default: "60", label: "Layout preset", options: layouts.presets },
      platform: { ...labelFields, type: "select", default: "windows", label: "Platform labels", options: { windows: "Windows", mac: "macOS" } },
      standard: { ...labelFields, type: "select", default: "ansi", label: "Physical layout", options: { ansi: "ANSI", iso: "ISO" } },
      legends: { ...labelFields, type: "select", default: "qwerty", label: "Legend layout", options: { qwerty: "QWERTY (US)", qwertz: "QWERTZ (German)", azerty: "AZERTY (French)" } },
      displayedKeys: {
        ...keyboardFields,
        type: "entries",
        default: [],
        label: "Selected physical keys",
        subsection: "Displayed controls",
        description: "Empty shows every slot in the preset. Choose physical keys from the list.",
        validate: parseKeys,
        maxlength: 8000,
        entries: { choices: keyOptions, choiceLabel: "Physical key", textFields: [], newEntry: "KeyW", limit: Object.keys(layouts.keys).length },
        addLabel: "Add key"
      },
      keyLabels: {
        ...labelFields,
        type: "entries",
        default: {},
        label: "Key labels",
        subsection: "Labels & actions",
        validate: parseLabels,
        maxlength: 16000,
        entries: { choices: keyOptions, choiceLabel: "Physical key", textFields: [["label", "Display label"]], newEntry: ["KeyE", "E"], limit: Object.keys(layouts.keys).length },
        addLabel: "Add label"
      },
      keyActions: {
        ...keyboardFields,
        type: "entries",
        default: {},
        label: "Action descriptions",
        subsection: "Labels & actions",
        description: "Gaming presets are configurable examples, not official game bindings.",
        validate: parseLabels,
        maxlength: 16000,
        entries: { choices: keyOptions, choiceLabel: "Physical key", textFields: [["action", "Action description"]], newEntry: ["KeyE", "Interact"], limit: Object.keys(layouts.keys).length },
        addLabel: "Add action"
      },
      showActions: { ...keyboardFields, ...toggle, default: "no", label: "Show action descriptions", subsection: "Labels & actions" },
      ...Object.fromEntries(
        Object.entries({
          letters: "Letters",
          numbers: "Number row",
          function: "Function keys",
          punctuation: "Punctuation",
          editing: "Editing keys",
          modifiers: "Modifiers",
          navigation: "Navigation",
          arrows: "Arrows",
          numpad: "Numpad",
          international: "International keys"
        }).map(([group, label]) => [`group${group}`, { ...keyboardFields, ...toggle, default: "yes", label, subsection: "Key groups" }])
      ),
      layoutDensity: { ...appearance, type: "select", default: "compact", label: "Layout", when: keyboardFields.when, options: { regular: "Regular", compact: "Compact" } },
      shell: {
        ...appearance,
        type: "select",
        default: "minimal",
        label: "Keyboard shell",
        when: keyboardFields.when,
        options: { full: "Complete shell", minimal: "Minimal shell", none: "Floating keys", outline: "Outline only", gaming: "Compact gaming" }
      },
      imageTarget: {
        ...appearance,
        type: "select",
        default: "none",
        label: "Image surfaces",
        subsection: "Image background",
        when: keyboardFields.when,
        choiceButtons: true,
        options: { none: "Off", shell: "Shell", keys: "Keys", all: "All" }
      },
      imageUrl: {
        ...appearance,
        type: "text",
        default: "",
        label: "Image URL",
        subsection: "Image background",
        image: true,
        maxlength: 65536,
        validate: imageValue,
        when: ["imageTarget", "shell", "keys", "all"]
      },
      imageFit: { ...appearance, type: "select", default: "cover", label: "Image fit", subsection: "Image background", when: ["imageTarget", "shell", "keys", "all"], options: { cover: "Cover", contain: "Contain", stretch: "Stretch" } },
      imageScale: { ...appearance, type: "number", default: 100, label: "Image scale (%)", subsection: "Image background", when: ["imageTarget", "shell", "keys", "all"], min: 25, max: 300 },
      imageOpacity: { ...appearance, type: "number", default: 100, label: "Image opacity (%)", subsection: "Image background", when: ["imageTarget", "shell", "keys", "all"], min: 0, max: 100 },
      imageTint: {
        ...appearance,
        ...toggle,
        default: "no",
        label: "Image tint",
        subsection: "Image background",
        when: ["imageTarget", "shell", "keys", "all"]
      },
      imageTintColor: { ...appearance, type: "color", default: "#ffffff", label: "Tint color", subsection: "Image background", maxlength: 9, when: ["imageTint", "yes"] },
      imageTintStrength: { ...appearance, type: "number", default: 0, label: "Tint strength (%)", subsection: "Image background", min: 0, max: 100, when: ["imageTint", "yes"] },
      imageBlendMode: {
        ...appearance,
        type: "select",
        default: "multiply",
        label: "Blend mode",
        subsection: "Image background",
        options: { multiply: "Multiply", overlay: "Overlay", "soft-light": "Soft-light", color: "Color", fill: "Fill" },
        when: ["imageTint", "yes"]
      },
      keycapStyle: { ...appearance, type: "select", default: "filled", label: "Keycap surface", when: keyboardFields.when, options: { filled: "Filled", outline: "Outline only" } },
      variant: {
        ...appearance,
        type: "select",
        default: "bonyur",
        label: "Color variant",
        options: { bonyur: "BONYUR", arctic: "Arctic", sakura: "Sakura", lagoon: "Lagoon", forest: "Forest", sunset: "Sunset", royal: "Royal", sandstone: "Sandstone", cyberpunk: "Cyberpunk" },
        when: ["customColors", "no"]
      },
      customColors: { ...appearance, ...toggle, default: "no", label: "Custom colors" },
      ...Object.fromEntries(
        Object.entries({
          shellColor: ["Shell", "#111111"],
          keyColor: ["Keycap background", "#282828"],
          outlineColor: ["Outlines", "#EEEEEE88"],
          legendColor: ["Legends / symbols", "#EEEEEE"],
          pressedColor: ["Pressed surface", "#990000"],
          pressedLegendColor: ["Pressed legends", "#FFFFFF"],
          highlightColor: ["Highlights", "#FFFFFF"],
          shadowColor: ["Shadows", "#000000"]
        }).map(([name, [label, value]]) => [name, { ...appearance, type: "color", default: value, label, maxlength: 9, subsection: "Custom colors", when: ["customColors", "yes"] }])
      ),
      outlineWidth: { ...appearance, type: "number", default: 1, label: "Outline thickness (×)", subsection: "Vector details", min: 0, max: 3, step: 0.1 },
      highlightIntensity: { ...appearance, type: "number", default: 12, label: "Highlights (%)", subsection: "Vector details", min: 0, max: 100 },
      shadowIntensity: { ...appearance, type: "number", default: 16, label: "Shadows (%)", subsection: "Vector details", min: 0, max: 100 },
      pressEffect: { ...appearance, type: "select", default: "fill", label: "Pressed effect", subsection: "Input feedback", options: { fill: "Fill", invert: "Invert", depth: "Fill + depth", glow: "Fill + glow" } },
      releaseDuration: { ...appearance, type: "number", default: 100, label: "Smooth release (ms)", subsection: "Input feedback", min: 0, max: 500, when: (settings) => settings.animate !== "no" },
      mouseIndependent: { ...appearance, ...toggle, default: "no", label: "Independent mouse colors", subsection: "Mouse", when: (settings) => ["mouse", "both"].includes(settings.mode) },
      mouseColor: { ...appearance, type: "color", default: "#111111", label: "Mouse surface", subsection: "Mouse", maxlength: 9, when: ["mouseIndependent", "yes"] },
      mouseButtonColor: { ...appearance, type: "color", default: "#282828", label: "Mouse buttons", subsection: "Mouse", maxlength: 9, when: ["mouseIndependent", "yes"] },
      mouseOutlineColor: { ...appearance, type: "color", default: "#EEEEEE88", label: "Mouse outlines", subsection: "Mouse", maxlength: 9, when: ["mouseIndependent", "yes"] },
      mousePressedColor: { ...appearance, type: "color", default: "#990000", label: "Pressed mouse buttons", subsection: "Mouse", maxlength: 9, when: ["mouseIndependent", "yes"] },
      mouseMovement: { ...appearance, ...toggle, default: "yes", label: "Movement indicator", when: (settings) => ["mouse", "both"].includes(settings.mode) },
      ...byStream.inputHistory.fields(),
      historySource: {
        type: "select",
        default: "both",
        label: "History inputs",
        section: "Input History",
        when: ["showHistory", "yes"],
        retainInactive: true,
        options: { keyboard: "Keyboard only", mouse: "Mouse only", both: "Keyboard + Mouse" }
      },
      historyInclusion: {
        type: "select",
        default: "all",
        label: "Record eligible inputs",
        section: "Input History",
        when: ["showHistory", "yes"],
        retainInactive: true,
        options: { all: "All received inputs", displayed: "Displayed controls only" },
        description: "All means physical gameplay inputs received by this browser. Editable fields and the configurator are excluded."
      },
      keySize: { type: "number", default: 44, label: "Key size (px)", section: "Size & placement", when: keyboardFields.when, retainInactive: true, min: 16, max: 160 },
      keySpacing: { type: "number", default: 5, label: "Key spacing (px)", description: "Compact layout uses half this spacing.", section: "Size & placement", when: keyboardFields.when, retainInactive: true, min: 0, max: 40 },
      keyProportion: { type: "number", default: 100, label: "Key height (%)", section: "Size & placement", when: keyboardFields.when, retainInactive: true, min: 50, max: 150 },
      componentGap: { type: "number", default: 24, label: "Keyboard / mouse gap (px)", section: "Size & placement", min: 0, max: 500, when: ["mode", "both"] },
      composition: { type: "select", default: "row", label: "Combined arrangement", section: "Size & placement", options: { row: "Side by side", column: "Stacked" }, when: ["mode", "both"] },
      fit: { ...toggle, default: "yes", label: "Fit to viewport", section: "Size & placement" },
      edgePadding: { type: "number", default: 16, label: "Viewport edge padding (px)", section: "Size & placement", min: 0, max: 1000 },
      opacity: { type: "number", default: 100, label: "Visualization opacity (%)", section: "Size & placement", min: 0, max: 100 },
      ...byStream.placementFields("#input-scene"),
      keyboardScale: { ...keyboardFields, type: "number", section: "Size & placement", default: 100, label: "Keyboard scale (%)", min: -500, max: 500, step: "any" },
      mouseScale: { type: "number", section: "Size & placement", subsection: "Mouse", default: 100, label: "Mouse scale (%)", min: -500, max: 500, step: "any", when: ["mode", "both", "mouse"], retainInactive: true },
      ...byStream.filterFields("artworkFilter", "Artwork", "#input-scene")
    }
  };

  /** Validate a bounded list of known physical codes; duplicates are invalid. */
  function parseKeys(value) {
    if (value.length > 8000) return null;
    try {
      const result = JSON.parse(value);
      return Array.isArray(result) && result.length <= Object.keys(layouts.keys).length && new Set(result).size === result.length && result.every((code) => Object.hasOwn(layouts.keys, code)) ? result : null;
    } catch {
      return null;
    }
  }

  /** Accept only predefined key slots and bounded plain text; never interpret user markup. */
  function parseLabels(value) {
    if (value.length > 16000) return null;
    try {
      const result = JSON.parse(value);
      return result && typeof result === "object" && !Array.isArray(result) && Object.entries(result).every(([code, label]) => Object.hasOwn(layouts.keys, code) && typeof label === "string" && label.length <= 80) ? result : null;
    } catch {
      return null;
    }
  }

  /** Accept the same safe image values used by the shared upload control. */
  function imageValue(value) {
    return value.length <= 65536 && (!value || byStream.safeImage(value)) ? value : null;
  }

  // ===== OVERLAY INITIALIZATION =====
  const settings = await byStream.initResource(resource);
  if (!byStreamOverlay) return;
  const root = document.getElementById("keyboard-overlay");
  const scene = root.querySelector("#input-scene");
  const keyboard = root.querySelector("#keyboard");
  const mouse = root.querySelector("#mouse");
  keyboard.hidden = !["keyboard", "both"].includes(settings.mode);
  mouse.hidden = !["mouse", "both"].includes(settings.mode);
  scene.style.flexDirection = settings.composition;
  scene.style.gap = `${settings.componentGap}px`;
  scene.style.opacity = settings.opacity / 100;
  root.style.padding = `${settings.edgePadding}px`;
  root.dataset.effect = settings.pressEffect;
  root.style.setProperty("--release", `${settings.releaseDuration}ms`);
  const history = byStream.inputHistory.create(settings, document.getElementById("keyboard-overlay"));
  const events = new AbortController();
  const requests = new AbortController();
  const pressed = new Set();
  const keyNodes = new Map();
  const mouseNodes = new Map();
  const assets = new Map();
  const timers = new Map();
  const imageLoaders = new Set();
  let movementFrame = 0;
  let disposed = false;
  window.addEventListener(
    "pagehide",
    (event) => {
      if (event.persisted) clearInput();
      else destroy();
    },
    { signal: events.signal }
  );
  const ns = "http://www.w3.org/2000/svg";

  // ===== SVG ARTWORK =====
  /** Create a native SVG element with trusted names/attributes; labels use textContent. */
  function svg(tag, attributes = {}, parent) {
    const node = document.createElementNS(ns, tag);
    for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, String(value));
    parent?.append(node);
    return node;
  }

  const definitions = svg("svg", { width: 0, height: 0, "aria-hidden": "true", class: "keyboard-definitions" }, root);
  const defs = svg("defs", {}, definitions);
  const measure = svg("g", {}, definitions);
  if (settings.outlineWidth > 0 && settings.outlineWidth < 1) {
    // Thin the original hollow ring from both edges; the default keeps its exact native contours.
    const filter = svg(
      "filter",
      {
        id: "keyboard-thin-outline",
        x: -4,
        y: -4,
        width: 72,
        height: 72,
        filterUnits: "userSpaceOnUse"
      },
      defs
    );
    svg("feMorphology", { operator: "erode", radius: (1 - settings.outlineWidth) * 1.5 }, filter);
    root.style.setProperty("--outline-filter", "url(#keyboard-thin-outline)");
  }
  applyPalette(root, settings);

  /**
   * Load each required local outline once. Separate its original contours by their native bounds.
   * The two largest contours are the key's outer silhouette and hollow interior; smaller paths are legends.
   * Geometry is never rewritten for colors, labels, or input transitions.
   */
  async function loadKey(asset) {
    if (assets.has(asset)) return assets.get(asset);
    const pending = (async () => {
      let source;
      try {
        const response = await fetch(new URL(`./keys/${asset}.svg`, keyboardResourceURL), {
          signal: requests.signal
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const document = new DOMParser().parseFromString(await response.text(), "image/svg+xml");
        if (document.querySelector("parsererror")) throw new Error("Invalid SVG");
        source = [...document.querySelectorAll("path")].map((path) => path.getAttribute("d")).join(" ");
        if (!source) throw new Error("Missing SVG paths");
      } catch (error) {
        if (requests.signal.aborted) return null;
        console.warn(`Keyboard artwork unavailable: ${asset}. Using the generic Kenney key.`, error.message);
        if (asset !== "any") return loadKey("any");
        return null;
      }
      if (disposed) return null;
      const parts = (source.match(/M[^M]+/gi) || [])
        .map((d) => {
          const path = svg("path", { d }, measure);
          const box = path.getBBox();
          path.remove();
          return { d, box, area: box.width * box.height };
        })
        .sort((a, b) => b.area - a.area);
      const outer = parts[0];
      if (!outer) return null;
      const inner = parts[1];
      const hollow = inner && inner.box.width >= outer.box.width * 0.65 && inner.box.height >= outer.box.height * 0.55;
      const id = `kenney-${asset}`;
      // Kenney's tall Return is bottom-wide; flip only its surface for the ISO top shoulder.
      const geometry = asset === "enter" ? { transform: `translate(0 ${outer.box.y * 2 + outer.box.height}) scale(1 -1)` } : {};
      svg("path", { id: `${id}-surface`, d: outer.d, ...geometry }, defs);
      svg("path", { id: `${id}-outline`, d: outer.d + (hollow ? inner.d : ""), ...geometry }, defs);
      svg(
        "path",
        {
          id: `${id}-legend`,
          d: parts
            .slice(hollow ? 2 : 1)
            .map((part) => part.d)
            .join(" ")
        },
        defs
      );
      return { id, box: outer.box, parts, source };
    })();
    assets.set(asset, pending);
    return pending;
  }

  function keyText(node, text, width, height, { action = false, fallback = false } = {}) {
    const baseSize = fallback ? 12 : height * (action ? 0.16 : 0.35);
    const className = action ? "key-text key-action" : "key-text";
    if (settings[action ? "actionOverflow" : "legendOverflow"] === "layout") {
      const label = svg(
        "text",
        {
          x: width / 2,
          y: height * (action ? 0.86 : 0.5),
          class: className,
          "text-anchor": "middle",
          ...(!action && { "dominant-baseline": "central" }),
          "font-size": fallback ? baseSize : Math.min(baseSize, (width / Math.max(2, text.length)) * (action ? 1.4 : 1.5))
        },
        node
      );
      label.textContent = text;
      return;
    }
    // HTML supplies wrapping and ellipsis inside the SVG key's own coordinate system.
    const box = svg("foreignObject", { x: 2, y: action ? height * 0.68 : 0, width: width - 4, height: action ? height * 0.3 : height, class: className }, node);
    const frame = document.createElement("div");
    frame.className = "key-text-frame";
    const label = document.createElement("div");
    label.className = action ? "key-action-text" : "key-label-text";
    label.style.fontSize = baseSize + "px";
    label.textContent = text;
    frame.append(label);
    box.append(frame);
  }

  /** Draw a mounted key from shared source contours; only its state class changes during input. */
  function keyArtwork(info, artwork, width, height, id = "") {
    const node = svg("svg", {
      viewBox: `-2 -2 ${width + 4} ${height + 4}`,
      width,
      height,
      class: "input-key",
      role: "img",
      "aria-label": `${info.label}${info.action ? `: ${info.action}` : ""}`
    });
    if (id) node.dataset.code = id;
    const title = svg("title", {}, node);
    title.textContent = info.action ? `${info.label} · ${info.action}` : info.label;
    if (!artwork) {
      // A missing pack remains usable and clearly identified; normal rendering always uses Kenney paths.
      svg("rect", { width, height, rx: 5, class: "key-surface" }, node);
      keyText(node, info.label, width, height, { fallback: true });
      return node;
    }
    const { box, id: assetId } = artwork;
    const transform = `scale(${width / box.width} ${height / box.height}) translate(${-box.x} ${-box.y})`;
    const cap = svg("g", { transform, class: "key-cap" }, node);
    svg("use", { href: `#${assetId}-surface`, class: "key-surface" }, cap);
    if (id) {
      svg("use", { href: `#${assetId}-surface`, class: "key-light" }, cap);
      svg("use", { href: `#${assetId}-surface`, class: "key-pressed-fill" }, cap);
    }
    svg("use", { href: `#${assetId}-outline`, class: "key-outline" }, cap);
    if (!info.customLabel) {
      const scale = Math.min(width / box.width, height / box.height);
      svg(
        "use",
        {
          href: `#${assetId}-legend`,
          transform: `translate(${width / 2} ${height / 2}) scale(${scale}) translate(${-box.x - box.width / 2} ${-box.y - box.height / 2})`,
          class: "key-legend"
        },
        node
      );
    } else {
      keyText(node, info.label, width, height);
    }
    if (settings.showActions === "yes" && info.action) {
      keyText(node, info.action, width, height, { action: true });
    }
    return node;
  }

  /** Put a configured image in shared SVG definitions; failure leaves vector surfaces visible. */
  function imageDefinition(id, value) {
    if (!value) return;
    const symbol = svg(
      "svg",
      {
        id,
        viewBox: "0 0 100 100",
        preserveAspectRatio: { cover: "xMidYMid slice", contain: "xMidYMid meet", stretch: "none" }[settings.imageFit]
      },
      defs
    );
    const image = svg("image", { width: 100, height: 100, preserveAspectRatio: "none" }, symbol);
    if (settings.imageTint === "yes" && settings.imageTintStrength > 0) image.setAttribute("filter", "url(#keyboard-image-tint)");
    const loader = new Image();
    imageLoaders.add(loader);
    loader.onload = () => {
      imageLoaders.delete(loader);
      if (disposed) return;
      const width = loader.naturalWidth || 100,
        height = loader.naturalHeight || 100;
      symbol.setAttribute("viewBox", `0 0 ${width} ${height}`);
      image.setAttribute("width", width);
      image.setAttribute("height", height);
      image.setAttribute("href", loader.src);
      root.dataset.imageReady = "yes";
    };
    loader.onerror = () => {
      imageLoaders.delete(loader);
      image.remove();
      root.dataset.imageError = "yes";
    };
    loader.src = new URL(value, location.href).href;
  }

  createImageTint(defs, settings, svg);
  if (!keyboard.hidden && settings.imageTarget !== "none") imageDefinition("keyboard-image", settings.imageUrl);
  const slots = keyboard.hidden ? [] : layouts.slots(settings);
  const required = new Set(slots.map((slot) => layouts.key(slot.code, settings).asset));
  // History's all-inputs mode also needs prompts for controls absent from a compact display.
  if (history && settings.historyStyle === "svg" && settings.historySource !== "mouse") for (const code of Object.keys(layouts.keys)) required.add(layouts.key(code, settings).asset);
  if (!mouse.hidden || (history && settings.historyStyle === "svg" && settings.historySource !== "keyboard")) for (const name of ["mouse", "lmb", "rmb", "wheel", "scrollup", "scrolldown", "mb4", "mb5"]) required.add(name);
  await Promise.all([...required].map(loadKey));
  if (disposed) return;
  const loaded = new Map();
  for (const [name, result] of assets) loaded.set(name, await result);
  const compactLayout = settings.layoutDensity === "compact";
  const keySpacing = compactLayout ? settings.keySpacing / 2 : settings.keySpacing;
  const unitX = settings.keySize + keySpacing;
  const unitY = (settings.keySize * settings.keyProportion) / 100 + keySpacing;
  const shellPadding = settings.shell === "full" ? 16 : settings.shell === "gaming" ? 10 : 6;
  const padding = compactLayout ? Math.min(shellPadding, 8) : shellPadding;
  if (!keyboard.hidden) {
    const width = Math.max(1, ...slots.map((slot) => (slot.x + slot.width) * unitX - keySpacing)) + padding * 2;
    const height = Math.max(1, ...slots.map((slot) => (slot.y + slot.height) * unitY - keySpacing)) + padding * 2;
    const board = svg(
      "svg",
      {
        viewBox: `0 0 ${width} ${height}`,
        width,
        height,
        role: "img",
        "aria-label": layouts.presets[settings.layout],
        "data-shell": settings.shell
      },
      keyboard
    );
    const clip = svg("clipPath", { id: "keyboard-shell-clip" }, defs);
    svg("rect", { width: width - 2, height: height - 2, x: 1, y: 1, rx: settings.shell === "full" ? 10 : 5 }, clip);
    svg(
      "rect",
      {
        x: 1,
        y: 1,
        width: width - 2,
        height: height - 2,
        rx: settings.shell === "full" ? 10 : 5,
        class: "keyboard-shell",
        "stroke-width": settings.outlineWidth * 1.5
      },
      board
    );
    const imageKeys = ["keys", "all"].includes(settings.imageTarget);
    const hasShell = !["none", "outline"].includes(settings.shell);
    board.dataset.imageKeys = String(imageKeys);
    let imageMask;
    if (settings.imageTarget !== "none" && settings.imageUrl) {
      // Mounted key contours form the mask, including holes beneath transparent keycaps.
      imageMask = svg(
        "mask",
        {
          id: "keyboard-image-mask",
          maskUnits: "userSpaceOnUse",
          x: 0,
          y: 0,
          width,
          height,
          "mask-type": "luminance"
        },
        defs
      );
      svg(
        "rect",
        {
          width,
          height,
          fill: hasShell && settings.imageTarget !== "keys" ? "white" : "black",
          "fill-opacity": settings.shell === "minimal" ? 0.5 : 1
        },
        imageMask
      );
      const clipped = svg(
        "g",
        {
          ...(hasShell ? { "clip-path": "url(#keyboard-shell-clip)" } : {}),
          mask: "url(#keyboard-image-mask)",
          class: "keyboard-texture"
        },
        board
      );
      const scale = settings.imageScale / 100;
      svg(
        "use",
        {
          href: "#keyboard-image",
          width: width * scale,
          height: height * scale,
          x: (width * (1 - scale)) / 2,
          y: (height * (1 - scale)) / 2,
          class: "surface-image"
        },
        clipped
      );
    }
    if (settings.shell === "full") svg("path", { d: `M12 4 H${Math.max(12, width - 12)}`, class: "shell-highlight" }, board);
    for (const slot of slots) {
      const info = layouts.key(slot.code, settings);
      const node = keyArtwork(info, loaded.get(info.asset), slot.width * unitX - keySpacing, slot.height * unitY - keySpacing, slot.code);
      node.setAttribute("x", slot.x * unitX + padding);
      node.setAttribute("y", slot.y * unitY + padding);
      board.append(node);
      keyNodes.set(slot.code, node);
      if (imageMask) {
        const stencil = node.cloneNode(false);
        stencil.removeAttribute("class");
        stencil.removeAttribute("data-code");
        stencil.removeAttribute("role");
        stencil.removeAttribute("aria-label");
        const cap = node.querySelector(".key-cap");
        const shape = node.querySelector(".key-surface").cloneNode(false);
        shape.removeAttribute("class");
        shape.setAttribute("fill", imageKeys ? "white" : "black");
        if (cap) {
          const geometry = cap.cloneNode(false);
          geometry.removeAttribute("class");
          geometry.append(shape);
          stencil.append(geometry);
        } else stencil.append(shape);
        imageMask.append(stencil);
      }
    }
  }
  if (!mouse.hidden) mountMouse();
  root.dataset.keycap = settings.keycapStyle;
  for (const [name, element] of [
    ["keyboard", keyboard],
    ["mouse", mouse]
  ]) {
    element.style.zoom = Math.abs(settings[`${name}Scale`]) / 100;
    if (settings[`${name}Scale`] < 0) element.style.scale = "-1";
  }
  if (settings.mouseIndependent === "yes") {
    for (const [name, value] of Object.entries({
      shell: settings.mouseColor,
      key: settings.mouseButtonColor,
      outline: settings.mouseOutlineColor,
      pressed: settings.mousePressedColor
    }))
      mouse.style.setProperty(`--${name}`, value);
  }

  const drawings = [...scene.querySelectorAll("#keyboard > svg, #mouse > svg")];

  /** Size the SVG viewports directly so key legends and mouse details rasterize at their displayed resolution. */
  function fit() {
    for (const drawing of drawings) {
      drawing.style.removeProperty("width");
      drawing.style.removeProperty("height");
    }
    scene.style.gap = settings.componentGap + "px";
    const width = scene.offsetWidth,
      height = scene.offsetHeight;
    const padding = settings.edgePadding;
    const scale = settings.fit === "yes" ? Math.max(0, Math.min(1, (innerWidth - padding * 2) / Math.max(1, width), (innerHeight - padding * 2) / Math.max(1, height))) : 1;
    for (const drawing of drawings) {
      drawing.style.width = drawing.width.baseVal.value * scale + "px";
      drawing.style.height = drawing.height.baseVal.value * scale + "px";
    }
    scene.style.gap = settings.componentGap * scale + "px";
    scene.style.left = Math.round((innerWidth - scene.offsetWidth) / 2) + "px";
    scene.style.top = Math.round((innerHeight - scene.offsetHeight) / 2) + "px";
  }
  fit();
  window.addEventListener("resize", fit, { signal: events.signal });

  // ===== MOUSE LAYOUT =====
  /** Draw the original Kenney mouse with independent button interiors and mounted direction prompts. */
  function mountMouse() {
    const artwork = loaded.get("mouse");
    const drawing = svg("svg", { viewBox: "0 0 64 64", width: 160, height: 160, role: "img", "aria-label": "Mouse input" }, mouse);
    if (!artwork) return;
    const native = artwork.source.match(/M[^M]+/gi);
    svg("path", { d: native[0], class: "mouse-shell" }, drawing);
    // These are the original hollow button regions in mouse.svg, not replacement drawings.
    for (const [code, path] of [
      ["Mouse0", native[1]],
      ["Mouse1", native[3]],
      ["Mouse2", native[4]]
    ]) {
      const node = svg("path", { d: path, class: "mouse-button", "data-code": code }, drawing);
      mouseNodes.set(code, node);
    }
    svg("path", { d: artwork.source, class: "mouse-outline" }, drawing);
    for (const [code, asset] of [
      ["Mouse3", "mb4"],
      ["Mouse4", "mb5"]
    ]) {
      const parts = loaded.get(asset)?.parts || [];
      const side = parts.filter((part) => part.box.x < 18 && part.box.width >= 7 && part.box.width < 10 && part.box.height >= 14).sort((a, b) => (code === "Mouse3" ? b.box.y - a.box.y : a.box.y - b.box.y))[0];
      if (!side) continue;
      const node = svg(
        "path",
        {
          d: side.d,
          class: "mouse-button mouse-side",
          "data-code": code,
          transform: "translate(-2 0)"
        },
        drawing
      );
      mouseNodes.set(code, node);
    }
    for (const [code, name] of [
      ["WheelUp", "scrollup"],
      ["WheelDown", "scrolldown"]
    ]) {
      const source = loaded.get(name);
      const arrow = source?.parts.filter((part) => part.box.width < 20 && part.box.height < 15 && part.box.width > 10)[0];
      if (arrow) mouseNodes.set(code, svg("path", { d: arrow.d, class: "mouse-wheel-direction", "data-code": code }, drawing));
    }
    if (settings.mouseMovement === "yes") {
      svg("circle", { cx: 32, cy: 43, r: 6, class: "mouse-movement-track" }, drawing);
      svg("circle", { cx: 32, cy: 43, r: 2, class: "mouse-movement" }, drawing);
    }
  }

  /** Build a source-owned history token from physical IDs, never KeyboardEvent.key or typed text. */
  function token(code) {
    const mouseCode = code.startsWith("Mouse") || code.startsWith("Wheel");
    if (!mouseCode) {
      const info = layouts.key(code, settings);
      if (!info) return null;
      return {
        id: code,
        source: "local",
        label: info.label,
        modifier: ["ControlLeft", "ControlRight", "AltLeft", "AltRight", "MetaLeft", "MetaRight", "ShiftLeft", "ShiftRight"].includes(code),
        prompt: () => keyArtwork(info, loaded.get(info.asset), 48, 48)
      };
    }
    const prompts = {
      Mouse0: ["LMB", "lmb"],
      Mouse1: ["MMB", "wheel"],
      Mouse2: ["RMB", "rmb"],
      Mouse3: ["MB4", "mb4"],
      Mouse4: ["MB5", "mb5"],
      WheelUp: ["Wheel up", "scrollup"],
      WheelDown: ["Wheel down", "scrolldown"]
    };
    const prompt = prompts[code];
    if (!prompt) return null;
    return {
      id: code,
      source: "local",
      label: prompt[0],
      prompt: () => {
        const artwork = loaded.get(prompt[1]);
        if (!artwork) return null;
        const id = artwork.id + "-prompt";
        if (!document.getElementById(id)) svg("path", { id, d: artwork.source }, defs);
        const drawing = svg("svg", { viewBox: "0 0 64 64" });
        svg("use", { href: "#" + id, fill: "currentColor" }, drawing);
        return drawing;
      }
    };
  }

  /** Exclude editable controls, composed input, and the runtime's reserved F2 navigation. */
  function eligible(event) {
    const navigation = event.code === "F2" && !event.ctrlKey && !event.altKey && !event.metaKey && !event.shiftKey;
    return !disposed && !event.isComposing && !event.defaultPrevented && !navigation && !event.target?.closest?.("input, textarea, select, button, a, [contenteditable]:not([contenteditable='false'])");
  }

  /** Select history inputs separately from the visible mode and optional displayed-control filter. */
  function include(code) {
    if (!history) return false;
    const mouseCode = code.startsWith("Mouse") || code.startsWith("Wheel");
    if (settings.historySource === (mouseCode ? "keyboard" : "mouse")) return false;
    return settings.historyInclusion === "all" || (mouseCode ? mouseNodes.has(code) : keyNodes.has(code));
  }

  // ===== INPUT EVENTS =====
  /** Update exactly one mounted control and the one authoritative live pressed set. */
  function setPressed(code, down, batch) {
    if (pressed.has(code) === down) return;
    if (down) pressed.add(code);
    else pressed.delete(code);
    const node = keyNodes.get(code) || mouseNodes.get(code);
    node?.classList.toggle("pressed", down);
    if (!down) history?.release(code);
    else if (include(code)) {
      const input = token(code);
      if (!input) return;
      if (batch) batch.push(input);
      else history.press(input);
    }
  }

  /** Process physical key transitions; OS auto-repeat never creates another transition. */
  function keyboardInput(event) {
    if (event.type === "keyup") return setPressed(event.code, false);
    if (!eligible(event) || !Object.hasOwn(layouts.keys, event.code)) return;
    // A later event's modifier flags recover releases swallowed by a browser/OS shortcut.
    for (const [flag, prefix] of [
      ["ctrlKey", "Control"],
      ["altKey", "Alt"],
      ["metaKey", "Meta"],
      ["shiftKey", "Shift"]
    ]) {
      if (event[flag] || event.code.startsWith(prefix)) continue;
      for (const side of ["Left", "Right"]) setPressed(`${prefix}${side}`, false);
    }
    if (event.repeat) return;
    setPressed(event.code, true);
  }

  /** Mouse button events share the same state transitions without capturing form interactions. */
  function mouseInput(event) {
    const code = `Mouse${event.button}`;
    if (event.type === "mouseup") return setPressed(code, false);
    if (eligible(event) && event.button <= 4) setPressed(code, true);
  }

  /** Briefly highlight scroll direction with one replaceable timer, never an accumulating queue. */
  function wheelInput(event) {
    if (eligible(event)) scroll(event.deltaY);
  }

  function scroll(delta) {
    if (!delta) return;
    const code = delta < 0 ? "WheelUp" : "WheelDown";
    mouseNodes.get(code)?.classList.add("pressed");
    clearTimeout(timers.get(code));
    timers.set(
      code,
      setTimeout(() => {
        mouseNodes.get(code)?.classList.remove("pressed");
        timers.delete(code);
      }, 120)
    );
    if (include(code)) history.pulse(token(code));
  }

  /** Coalesce movement painting; raw coordinates never enter history or another retained log. */
  function mouseMove(event) {
    if (!eligible(event)) return;
    // Reconcile missing mouse-up events using the browser's current button mask.
    for (const [button, bit] of [
      [0, 1],
      [1, 4],
      [2, 2],
      [3, 8],
      [4, 16]
    ])
      if (pressed.has(`Mouse${button}`) && !(event.buttons & bit)) setPressed(`Mouse${button}`, false);
    move(event.movementX, event.movementY);
  }

  function move(dx, dy) {
    if ((!dx && !dy) || mouse.hidden || settings.mouseMovement !== "yes" || movementFrame) return;
    const x = Math.max(-4, Math.min(4, dx));
    const y = Math.max(-4, Math.min(4, dy));
    movementFrame = requestAnimationFrame(() => {
      movementFrame = 0;
      mouse.style.setProperty("--move-x", `${x}px`);
      mouse.style.setProperty("--move-y", `${y}px`);
      mouse.classList.add("moving");
      clearTimeout(timers.get("movement"));
      timers.set(
        "movement",
        setTimeout(() => {
          mouse.classList.remove("moving");
          timers.delete("movement");
        }, 120)
      );
    });
  }

  /** Clear interrupted holds and transient visuals on blur, hiding, and teardown. */
  function clearInput() {
    for (const code of [...pressed]) setPressed(code, false);
    clearMouseEffects();
  }

  function clearMouseEffects() {
    for (const timer of timers.values()) clearTimeout(timer);
    timers.clear();
    cancelAnimationFrame(movementFrame);
    movementFrame = 0;
    for (const node of mouseNodes.values()) node.classList.remove("pressed");
    mouse.classList.remove("moving");
  }

  // ===== CLEANUP =====
  /** Dispose requests, input handlers, animation work, and ephemeral history together. */
  function destroy() {
    disposed = true;
    clearInput();
    events.abort();
    requests.abort();
    for (const loader of imageLoaders) {
      loader.onload = loader.onerror = null;
      loader.src = "";
    }
    imageLoaders.clear();
    history?.destroy();
  }

  const captureKeyboard = !keyboard.hidden || (history && settings.historySource !== "mouse" && settings.historyInclusion === "all");
  const captureMouse = !mouse.hidden || (history && settings.historySource !== "keyboard" && settings.historyInclusion === "all");
  if (settings.source === "helper") {
    const sync = (previous, next) => {
      const batch = [];
      for (const code of previous) if (!next.has(code)) setPressed(code, false);
      for (const code of next) setPressed(code, true, batch);
      if (batch.length) history.pressMany(batch);
    };
    if (captureKeyboard)
      byStream.subscribeNative(
        "keyboard",
        (state) => {
          const keys = new Set(state?.keys.filter((code) => Object.hasOwn(layouts.keys, code)));
          sync(
            [...pressed].filter((code) => !code.startsWith("Mouse")),
            keys
          );
        },
        events.signal
      );
    if (captureMouse)
      byStream.subscribeNative(
        "mouse",
        (state, first) => {
          const buttons = new Set(state?.buttons.map((id) => "Mouse" + id));
          sync(
            [...pressed].filter((code) => code.startsWith("Mouse")),
            buttons
          );
          if (!state) clearMouseEffects();
          else if (!first) {
            scroll(state.wheel);
            move(state.dx, state.dy);
          }
        },
        events.signal
      );
    root.dataset.ready = "yes";
    return;
  }
  if (captureKeyboard) {
    window.addEventListener("keydown", keyboardInput, { signal: events.signal });
    window.addEventListener("keyup", keyboardInput, { signal: events.signal });
  }
  if (captureMouse) {
    window.addEventListener("mousedown", mouseInput, { signal: events.signal });
    window.addEventListener("mouseup", mouseInput, { signal: events.signal });
    window.addEventListener("wheel", wheelInput, { signal: events.signal, passive: true });
    window.addEventListener("mousemove", mouseMove, { signal: events.signal });
  }
  byStream.preventOverlayInputDefaults(events.signal);
  window.addEventListener("blur", clearInput, { signal: events.signal });
  document.addEventListener(
    "visibilitychange",
    () => {
      if (document.hidden) clearInput();
    },
    { signal: events.signal }
  );
  root.dataset.ready = "yes";
}

/** Set coherent palette variables without coupling appearance to input state or SVG geometry. */
function applyPalette(root, settings) {
  const palettes = {
    bonyur: ["#111111", "#282828", "#EEEEEE88", "#EEEEEE", "#990000"],
    arctic: ["#DFE9EF", "#F6FAFF", "#496378", "#183447", "#47A9D1"],
    sakura: ["#3D263A", "#F1D2E0", "#9D6A89", "#462C42", "#DB739E"],
    lagoon: ["#123E43", "#22636A", "#8BE3D9", "#E8FFFB", "#1FB7A7"],
    forest: ["#1B3026", "#35513D", "#92AE7A", "#F2F1CF", "#8AAE4C"],
    sunset: ["#46283F", "#75405B", "#EF9B6A", "#FFF0D8", "#D95F59"],
    royal: ["#261E46", "#49366F", "#BEA6E9", "#F4EDFF", "#995DDD"],
    sandstone: ["#514432", "#D4C3A0", "#8F714E", "#362C20", "#B28049"],
    cyberpunk: ["#151429", "#25214B", "#F5E64B", "#F5E64B", "#C526B4"]
  };
  const palette = settings.customColors === "yes" ? [settings.shellColor, settings.keyColor, settings.outlineColor, settings.legendColor, settings.pressedColor] : palettes[settings.variant];
  for (const [name, value] of Object.entries({
    shell: palette[0],
    key: palette[1],
    outline: palette[2],
    legend: palette[3],
    pressed: palette[4],
    "pressed-legend": settings.customColors === "yes" ? settings.pressedLegendColor : "#FFFFFF",
    highlight: settings.highlightColor,
    shadow: settings.shadowColor,
    "highlight-opacity": settings.highlightIntensity / 100,
    "shadow-opacity": settings.shadowIntensity / 100,
    "outline-extra": Math.max(0, settings.outlineWidth - 1) * 1.5,
    "outline-opacity": settings.outlineWidth === 0 ? 0 : 1,
    "image-opacity": settings.imageOpacity / 100
  }))
    root.style.setProperty(`--${name}`, value);
}

/** Tint the shared image against an opaque copy, then restore its original alpha exactly once. */
function createImageTint(defs, settings, svg) {
  if (settings.imageTint !== "yes" || settings.imageTintStrength === 0) return;
  const filter = svg(
    "filter",
    {
      id: "keyboard-image-tint",
      "color-interpolation-filters": "sRGB",
      x: 0,
      y: 0,
      width: "100%",
      height: "100%"
    },
    defs
  );
  const opaque = svg("feComponentTransfer", { in: "SourceGraphic", result: "opaque-image" }, filter);
  svg("feFuncA", { type: "linear", slope: 0, intercept: 1 }, opaque);
  svg(
    "feFlood",
    {
      "flood-color": settings.imageTintColor,
      "flood-opacity": settings.imageTintStrength / 100,
      result: "tint"
    },
    filter
  );
  svg(
    "feBlend",
    {
      in: "tint",
      in2: "opaque-image",
      mode: settings.imageBlendMode === "fill" ? "normal" : settings.imageBlendMode
    },
    filter
  );
  svg("feComposite", { in2: "SourceAlpha", operator: "in" }, filter);
}

/** Embedded ephemeral input history; capture and teardown belong to this resource. */
(() => {
  /** Read the retired entry-only switch from saved URLs and JSON. */
  function migrateAnimation(values) {
    const legacy = values.get("historyAnimation");
    values.delete("historyAnimation");
    const effect = values.get("history.entrance");
    if (!["slide", "fade", "none"].includes(legacy) || (effect && effect !== "default")) return;
    values.set("history.entrance", { slide: "default", fade: "fadeIn", none: "none" }[legacy]);
    if (legacy === "fade") {
      if (!values.has("history.entranceDuration")) values.set("history.entranceDuration", "140");
      if (!values.has("history.entranceEasing")) values.set("history.entranceEasing", "ease-out");
    }
    if (!values.has("history.matchExit")) values.set("history.matchExit", "no");
  }

  /** Return ordinary resource fields; no input content enters the settings schema. */
  function fields() {
    const section = "Input History";
    const active = { section, when: ["showHistory", "yes"], retainInactive: true };
    const result = {
      showHistory: { type: "switch", default: "no", label: "Show Input History", section, checkedValue: "yes", uncheckedValue: "no", options: { yes: "On", no: "Off" } },
      historyStyle: { ...active, type: "select", default: "svg", label: "Prompts", options: { svg: "SVG artwork", text: "Plain text" } },
      historyOrientation: { ...active, type: "select", default: "vertical", label: "Orientation", options: { vertical: "Vertical", horizontal: "Horizontal" } },
      historyOrder: { ...active, type: "select", default: "first", label: "Newest entry", options: { first: "First (top / left)", last: "Last (bottom / right)" } },
      historyGroupWindow: { ...active, type: "number", default: 60, label: "Combination window (ms)", min: 0, max: 250, step: 1 },
      historyAggregate: { ...active, type: "switch", default: "yes", label: "Count consecutive presses", checkedValue: "yes", uncheckedValue: "no", options: { yes: "On", no: "Off" } },
      historyPosition: {
        ...active,
        type: "select",
        default: "bottom-left",
        label: "Position",
        subsection: "Size & placement",
        options: { "top-left": "Top left", "top-right": "Top right", "bottom-left": "Bottom left", "bottom-right": "Bottom right", center: "Center" }
      }
    };
    for (const [name, label, value, min, max] of [
      ["Width", "Width (px)", 0, 0, 3840],
      ["Height", "Height (px)", 0, 0, 2160],
      ["Size", "Prompt / text size (px)", 32, 12, 160],
      ["Scale", "Scale (%)", 100, -500, 500],
      ["X", "Viewport horizontal offset (px)", 0, -3840, 3840],
      ["Y", "Viewport vertical offset (px)", 0, -2160, 2160],
      ["Gap", "Entry spacing (px)", 6, 0, 100],
      ["Padding", "Padding (px)", 8, 0, 100],
      ["Opacity", "Opacity (%)", 100, 0, 100]
    ]) {
      const id = `history${name}`;
      result[id] = {
        ...active,
        type: "number",
        default: value,
        label,
        min,
        max,
        step: "any",
        subsection: "Size & placement"
      };
      if (name === "Width" || name === "Height") {
        const fillOrientation = name === "Width" ? "horizontal" : "vertical";
        result[id].description = `0 fills the parent in ${fillOrientation} history and otherwise fits the entries.`;
        result[`${id}Mode`] = {
          ...active,
          type: "switch",
          default: "auto",
          label: "Fill parent",
          subsection: "Size & placement",
          when: (s) => s.showHistory === "yes" && Number(s[id]) === 0 && s.historyOrientation !== fillOrientation,
          checkedValue: "fill",
          uncheckedValue: "auto",
          options: { fill: "Fill parent", auto: "Automatic" }
        };
      }
    }
    for (const [name, label, value] of [
      ["Color", "Text / symbols", "#EEEEEE"],
      ["Background", "Container background", "#11111166"],
      ["EntryColor", "Entry surface", "#111111CC"],
      ["BorderColor", "Entry outline", "#EEEEEE33"]
    ]) {
      result[`history${name}`] = {
        ...active,
        type: "color",
        default: value,
        label,
        maxlength: 9,
        subsection: "Colors"
      };
    }
    return result;
  }

  // ===== KEYBOARD LAYOUTS =====
  /**
   * Mount a history, or return null while disabled. Nothing is persisted or transmitted.
   * @param {Object} settings Validated resource settings.
   * @param {HTMLElement} [parent=document.body] Overlay-owned mount.
   * @returns {Object|null} press/pressMany/release/update/pulse/clear/destroy; destroy releases observers and frames.
   */
  function create(settings, parent = document.body) {
    if (settings.showHistory !== "yes") return null;
    const position = document.createElement("div");
    position.className = "input-history-position";
    position.dataset.position = settings.historyPosition;
    position.style.translate = `${settings.historyX}px ${settings.historyY}px`;
    const root = document.createElement("div");
    root.className = "input-history";
    root.setAttribute("role", "img");
    root.setAttribute("aria-label", "Recent inputs");
    root.dataset.orientation = settings.historyOrientation;
    root.dataset.order = settings.historyOrder;
    const horizontal = settings.historyOrientation === "horizontal";
    if (settings.historyWidth) root.style.width = settings.historyWidth + "px";
    else if (settings.historyWidthMode === "fill") root.style.width = "100%";
    if (settings.historyHeight) root.style.height = settings.historyHeight + "px";
    else if (settings.historyHeightMode === "fill") root.style.height = "100%";
    const scale = settings.historyScale / 100;
    root.style.maxWidth = `calc((100vw - 32px) / ${Math.abs(scale) || 1})`;
    root.style.maxHeight = `calc((100vh - 32px) / ${Math.abs(scale) || 1})`;
    if (scale !== 1) root.style.transform = `scale(${scale})`;
    root.style.transformOrigin = settings.historyPosition === "center" ? "center" : settings.historyPosition.replace("-", " ");
    root.style.opacity = settings.historyOpacity / 100;
    for (const [name, value] of Object.entries({
      size: `${settings.historySize}px`,
      gap: `${settings.historyGap}px`,
      padding: `${settings.historyPadding}px`,
      ink: settings.historyColor,
      background: settings.historyBackground,
      entry: settings.historyEntryColor,
      border: settings.historyBorderColor
    }))
      root.style.setProperty(`--history-${name}`, value);
    position.append(root);
    parent.append(position);
    // Only active controls and mounted rows are retained. The oldest row is always at rows[0].
    const held = new Map();
    const rows = [];
    const events = new AbortController();
    let frame = 0;
    let disposed = false;

    const animateOut = ["history", "historyEntry.children", "historyPrompt", "historyCount"].some((id) => byStream.elementMotion(settings, id, "exit").name !== "none");

    function playDefault(node, phase) {
      const offset = settings.historyOrder === "first" ? -10 : 10;
      const transform = horizontal ? `translateX(${offset}px)` : `translateY(${offset}px)`;
      return node.animate(
        [
          { filter: "opacity(0)", transform },
          { filter: "opacity(1)", transform: "none" }
        ],
        {
          id: "stream-" + phase,
          duration: 140,
          easing: "ease-out",
          composite: "add",
          direction: phase === "exit" ? "reverse" : "normal",
          fill: phase === "exit" ? "forwards" : "backwards"
        }
      );
    }

    /** Retire displaced rows at their last visible position while new rows take their place in the list. */
    function trim() {
      frame = 0;
      if (!rows.length) return;
      const horizontal = settings.historyOrientation === "horizontal";
      const limit = (horizontal ? root.clientWidth : root.clientHeight) - settings.historyPadding * 2;
      if (limit <= 0 || root.clientHeight <= 0 || root.clientWidth <= 0) return clear();
      const sizes = rows.map((row) => (horizontal ? row.node.offsetWidth : row.node.offsetHeight));
      let used = sizes.reduce((sum, size) => sum + size, 0) + Math.max(0, rows.length - 1) * settings.historyGap;
      while (rows.length > 1 && used > limit + 0.5) {
        used -= sizes.shift() + settings.historyGap;
        const oldest = rows.shift();
        if (oldest.slot) {
          Object.assign(oldest.node.style, oldest.slot, { position: "absolute", zIndex: 1 });
          byStream.removeWithMotion(oldest.node, settings, "history", rows.length, playDefault);
        } else oldest.node.remove();
      }
      if (animateOut) {
        for (const row of rows) {
          const node = row.node;
          row.slot = { left: node.offsetLeft + "px", top: node.offsetTop + "px", width: node.offsetWidth + "px", height: node.offsetHeight + "px" };
        }
      }
    }

    /** Coalesce capacity work rather than measuring on each physical input. */
    function scheduleTrim() {
      if (!frame && !disposed) frame = requestAnimationFrame(trim);
    }

    /** Extend the existing chord without replacing earlier prompts or restarting their animations. */
    function appendPrompts(row, tokens) {
      const prompts = document.createDocumentFragment();
      for (const token of tokens) {
        if (row.ids.has(token.id)) continue;
        if (row.ids.size) {
          const separator = document.createElement("span");
          separator.className = "history-separator";
          separator.setAttribute("aria-hidden", "true");
          separator.textContent = "+";
          prompts.append(separator);
        }
        row.ids.add(token.id);
        const prompt = settings.historyStyle === "svg" ? token.prompt?.() : null;
        const cap = document.createElement("span");
        cap.className = "history-prompt";
        cap.title = token.label;
        if (prompt) {
          prompt.setAttribute("aria-label", token.label);
          cap.append(prompt);
        } else cap.textContent = token.label;
        prompts.append(cap);
      }
      row.prompts.append(prompts);
      scheduleTrim();
    }

    /** Record the new presses from a single event or device snapshot as one chord. */
    function pressMany(pressed) {
      if (!pressed.length || disposed || document.hidden) return;
      const { source, sourceLabel } = pressed[0];
      const modifiers = [...held.values()].filter((input) => input.modifier && input.source === source);
      const tokens = [...modifiers, ...pressed];
      const now = performance.now();
      const last = rows.at(-1);
      const previous = last ? [...last.ids] : [];
      const overlap = previous.some((id) => held.has(id));
      // A long-held modifier joins the next action instead of leaving a redundant solo modifier row.
      const modifierRow = previous.every((id) => held.get(id)?.modifier);
      for (const token of pressed) held.set(token.id, token);
      if (last?.source === source && last.count === 1 && pressed.every((token) => !last.ids.has(token.id)) && ((overlap && now - last.time <= settings.historyGroupWindow) || modifierRow)) {
        appendPrompts(last, tokens);
        return;
      }
      if (settings.historyAggregate === "yes" && last?.source === source && last.ids.size === tokens.length && tokens.every((token) => last.ids.has(token.id))) {
        last.count++;
        last.time = now;
        const count = last.node.querySelector(".history-count");
        count.textContent = `×${last.count}`;
        scheduleTrim();
        return;
      }
      const node = document.createElement("div");
      node.className = "history-entry";
      const prompts = document.createElement("span");
      prompts.className = "history-prompts";
      if (sourceLabel) {
        const label = document.createElement("small");
        label.textContent = sourceLabel;
        prompts.append(label);
      }
      const count = document.createElement("b");
      count.className = "history-count";
      node.append(prompts, count);
      const row = { node, prompts, ids: new Set(), source, count: 1, time: now };
      appendPrompts(row, tokens);
      rows.push(row);
      if (settings.historyOrder === "first") root.prepend(node);
      else root.append(node);
      if (rows.length === 1) window.byStreamResource.playEntrance?.(root, false);
      byStream.enterListItem(node, settings, "history", animateOut && rows.length > 1, playDefault);
    }

    function press(token) {
      if (!held.has(token.id)) pressMany([token]);
    }

    /** Release one physical ID; no recorded text or release log is retained. */
    function release(id) {
      held.delete(id);
    }

    /** Diff a source's current digital state using the caller's existing polling loop. */
    function update(source, tokens) {
      const next = new Set(tokens.map((token) => token.id));
      for (const [id, token] of held) if (token.source === source && !next.has(id)) release(id);
      pressMany(tokens.filter((token) => !held.has(token.id)));
    }

    /** Record one instantaneous wheel/directional action. */
    function pulse(token) {
      press(token);
      release(token.id);
    }

    /** Remove all displayed and active input data, including pending layout work. */
    function clear() {
      cancelAnimationFrame(frame);
      frame = 0;
      held.clear();
      rows.length = 0;
      for (const animation of root.getAnimations({ subtree: true })) animation.cancel();
      root.replaceChildren();
    }

    /** End this overlay-owned history's lifetime; safe to call more than once. */
    function destroy() {
      if (disposed) return;
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      events.abort();
      held.clear();
      rows.length = 0;
      const exits = window.byStreamResource.playExit?.(root) || [];
      if (exits.length) Promise.allSettled(exits.map((motion) => motion.finished)).then(() => position.remove());
      else position.remove();
    }

    const observer = new ResizeObserver(scheduleTrim);
    observer.observe(root);
    if (settings.source !== "helper") {
      window.addEventListener("blur", () => held.clear(), { signal: events.signal });
      document.addEventListener(
        "visibilitychange",
        () => {
          if (document.hidden) held.clear();
        },
        { signal: events.signal }
      );
    }
    window.addEventListener(
      "pagehide",
      (event) => {
        if (event.persisted) clear();
        else destroy();
      },
      { signal: events.signal }
    );
    return { press, pressMany, release, update, pulse, clear, destroy };
  }

  byStream.inputHistory = { fields, create, migrateAnimation };
})();

/** Physical slots, Kenney artwork names, and preset geometry in key units.
 * Selected legends are authoritative; browser key text and OS detection are unused. */
(() => {
  const keys = {};
  for (const letter of ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z"])
    keys[`Key${letter}`] = { label: letter, asset: letter.toLowerCase(), group: "letters" };
  for (let number = 0; number <= 9; number++) {
    keys[`Digit${number}`] = { label: String(number), asset: String(number), group: "numbers" };
    keys[`Numpad${number}`] = { label: `Num ${number}`, asset: String(number), group: "numpad" };
  }
  for (let number = 1; number <= 24; number++)
    keys[`F${number}`] = {
      label: `F${number}`,
      asset: number <= 12 ? `f${number}` : "any",
      group: "function"
    };
  for (const [code, label, asset, group] of [
    ["Escape", "Esc", "escape", "function"],
    ["Backquote", "`", "tilde", "punctuation"],
    ["Minus", "-", "minus", "punctuation"],
    ["Equal", "=", "equals", "punctuation"],
    ["BracketLeft", "[", "lbracket", "punctuation"],
    ["BracketRight", "]", "rbracket", "punctuation"],
    ["Backslash", "\\", "backslash", "punctuation"],
    ["Semicolon", ";", "semicolon", "punctuation"],
    ["Quote", "'", "apostrophe", "punctuation"],
    ["Comma", ",", "comma", "punctuation"],
    ["Period", ".", "period", "punctuation"],
    ["Slash", "/", "slash", "punctuation"],
    ["Backspace", "Backspace", "backspace", "editing"],
    ["Tab", "Tab", "tab", "editing"],
    ["CapsLock", "Caps Lock", "capslock", "modifiers"],
    ["Enter", "Enter", "enter", "editing"],
    ["Space", "Space", "space", "editing"],
    ["ShiftLeft", "L Shift", "shift", "modifiers"],
    ["ShiftRight", "R Shift", "shift", "modifiers"],
    ["ControlLeft", "L Ctrl", "ctrl", "modifiers"],
    ["ControlRight", "R Ctrl", "ctrl", "modifiers"],
    ["AltLeft", "L Alt", "alt", "modifiers"],
    ["AltRight", "R Alt", "alt", "modifiers"],
    ["MetaLeft", "L Win", "win", "modifiers"],
    ["MetaRight", "R Win", "win", "modifiers"],
    ["ContextMenu", "Menu", "any", "modifiers"],
    ["Fn", "Fn", "fn", "modifiers"],
    ["PrintScreen", "Print Screen", "printscreen", "navigation"],
    ["ScrollLock", "Scroll Lock", "scrolllock", "navigation"],
    ["Pause", "Pause", "pausebreak", "navigation"],
    ["Insert", "Insert", "insert", "navigation"],
    ["Delete", "Delete", "delete", "navigation"],
    ["Home", "Home", "home", "navigation"],
    ["End", "End", "end", "navigation"],
    ["PageUp", "Page Up", "pageup", "navigation"],
    ["PageDown", "Page Down", "pagedown", "navigation"],
    ["ArrowUp", "Up", "up", "arrows"],
    ["ArrowDown", "Down", "down", "arrows"],
    ["ArrowLeft", "Left", "left", "arrows"],
    ["ArrowRight", "Right", "right", "arrows"],
    ["NumLock", "Num Lock", "numlock", "numpad"],
    ["NumpadDivide", "Num /", "slash", "numpad"],
    ["NumpadMultiply", "Num *", "asterisk", "numpad"],
    ["NumpadSubtract", "Num -", "minus", "numpad"],
    ["NumpadAdd", "Num +", "numplus", "numpad"],
    ["NumpadEnter", "Num Enter", "numenter", "numpad"],
    ["NumpadDecimal", "Num .", "period", "numpad"],
    ["NumpadEqual", "Num =", "equals", "numpad"],
    ["IntlBackslash", "< >", "less", "international"],
    ["IntlRo", "Ro", "backslash", "international"],
    ["IntlYen", "Yen", "backslash", "international"],
    ["Convert", "Convert", "any", "international"],
    ["NonConvert", "Nonconvert", "any", "international"],
    ["KanaMode", "Kana", "any", "international"],
    ["Lang1", "Lang 1", "any", "international"],
    ["Lang2", "Lang 2", "any", "international"]
  ])
    keys[code] = { label, asset, group };

  const presets = {
    full: "Full-size (100%)",
    tkl: "Tenkeyless (TKL)",
    75: "75%",
    65: "65%",
    60: "60%",
    compact: "Compact",
    numpad: "Numeric keypad",
    function: "Function-key row",
    arrows: "Arrow keys",
    wasd: "WASD",
    modifiers: "WASD + modifiers",
    all: "All physical keys",
    fps: "FPS / WASD",
    moba: "MOBA",
    lol: "League of Legends",
    dota: "Dota 2",
    mmo: "MMO / RPG",
    racing: "Racing",
    fighting: "Fighting games",
    platformer: "Platformer",
    rhythm: "Rhythm games",
    speedrun: "Speedrunning",
    custom: "Custom compact"
  };
  // Gaming presets select physical keys from the same ANSI/ISO layouts.
  const gamingKeys = {
    wasd: ["KeyW", "KeyA", "KeyS", "KeyD"],
    modifiers: ["Tab", "KeyQ", "KeyW", "KeyE", "KeyR", "CapsLock", "KeyA", "KeyS", "KeyD", "KeyF", "ShiftLeft", "KeyZ", "KeyX", "KeyC", "ControlLeft", "AltLeft", "Space"],
    fps: ["Digit1", "Digit2", "Digit3", "Digit4", "Digit5", "Tab", "KeyQ", "KeyW", "KeyE", "KeyR", "CapsLock", "KeyA", "KeyS", "KeyD", "KeyF", "ShiftLeft", "KeyZ", "KeyX", "KeyC", "KeyV", "ControlLeft", "AltLeft", "Space"],
    moba: ["Digit1", "Digit2", "Digit3", "Digit4", "Digit5", "Digit6", "Tab", "KeyQ", "KeyW", "KeyE", "KeyR", "KeyT", "KeyA", "KeyS", "KeyD", "KeyF", "KeyG", "ShiftLeft", "ControlLeft", "AltLeft", "Space"],
    lol: ["Digit1", "Digit2", "Digit3", "Digit4", "Digit5", "Digit6", "Digit7", "Tab", "KeyQ", "KeyW", "KeyE", "KeyR", "KeyD", "KeyF", "ControlLeft", "AltLeft", "KeyA", "KeyS", "Space"],
    dota: [
      "Digit1",
      "Digit2",
      "Digit3",
      "Digit4",
      "Digit5",
      "Digit6",
      "Tab",
      "KeyQ",
      "KeyW",
      "KeyE",
      "KeyR",
      "KeyT",
      "AltLeft",
      "KeyA",
      "KeyS",
      "KeyD",
      "KeyF",
      "KeyG",
      "ShiftLeft",
      "KeyZ",
      "KeyX",
      "KeyC",
      "KeyV",
      "KeyB",
      "ControlLeft",
      "Space"
    ],
    mmo: [
      "Digit1",
      "Digit2",
      "Digit3",
      "Digit4",
      "Digit5",
      "Digit6",
      "Digit7",
      "Digit8",
      "Digit9",
      "Digit0",
      "Tab",
      "KeyQ",
      "KeyW",
      "KeyE",
      "KeyR",
      "KeyT",
      "KeyY",
      "KeyU",
      "KeyI",
      "KeyO",
      "ShiftLeft",
      "KeyA",
      "KeyS",
      "KeyD",
      "KeyF",
      "KeyG",
      "KeyH",
      "KeyJ",
      "KeyK",
      "KeyL",
      "ControlLeft",
      "AltLeft",
      "Space"
    ],
    racing: ["Escape", "KeyQ", "KeyW", "KeyE", "ShiftLeft", "KeyA", "KeyS", "KeyD", "ControlLeft", "Space", "ArrowUp", "ArrowLeft", "ArrowDown", "ArrowRight"],
    fighting: ["KeyW", "KeyU", "KeyI", "KeyO", "KeyA", "KeyS", "KeyD", "KeyJ", "KeyK", "KeyL", "Space", "Enter"],
    platformer: ["ArrowUp", "ArrowLeft", "ArrowDown", "ArrowRight", "KeyZ", "KeyX", "Space"],
    rhythm: ["KeyD", "KeyF", "Space", "KeyJ", "KeyK", "ArrowLeft", "ArrowDown", "ArrowUp", "ArrowRight"],
    speedrun: ["Escape", "Tab", "KeyW", "KeyR", "ShiftLeft", "KeyA", "KeyS", "KeyD", "ControlLeft", "KeyZ", "KeyX", "KeyC", "Space", "Enter"],
    custom: ["Digit1", "Digit2", "Digit3", "Digit4", "Digit5", "Digit6", "Tab", "KeyQ", "KeyW", "KeyE", "KeyR", "KeyT", "ShiftLeft", "KeyA", "KeyS", "KeyD", "KeyF", "KeyG", "ControlLeft", "AltLeft", "Space"]
  };

  /** Return a physical key's predefined label/artwork, then apply safe user-authored labels. */
  function key(code, settings) {
    const original = keys[code];
    if (!original) return null;
    const result = { ...original, code };
    const variant = settings;
    const swaps =
      variant.legends === "qwertz"
        ? { KeyY: "KeyZ", KeyZ: "KeyY" }
        : variant.legends === "azerty"
          ? {
              KeyQ: "KeyA",
              KeyA: "KeyQ",
              KeyW: "KeyZ",
              KeyZ: "KeyW",
              KeyM: "Comma",
              Semicolon: "KeyM"
            }
          : {};
    if (swaps[code]) Object.assign(result, { label: keys[swaps[code]].label, asset: keys[swaps[code]].asset });
    const punctuation =
      variant.legends === "qwertz"
        ? { Minus: "ß", BracketLeft: "Ü", BracketRight: "+", Semicolon: "Ö", Quote: "Ä", Backslash: "#", Slash: "-", Equal: "´" }
        : variant.legends === "azerty"
          ? {
              Digit1: "&",
              Digit2: "é",
              Digit3: '"',
              Digit4: "'",
              Digit5: "(",
              Digit6: "-",
              Digit7: "è",
              Digit8: "_",
              Digit9: "ç",
              Digit0: "à",
              Minus: ")",
              Equal: "=",
              BracketLeft: "^",
              BracketRight: "$",
              Quote: "ù",
              Backslash: "*",
              Comma: ";",
              Period: ":",
              Slash: "!",
              Backquote: "²"
            }
          : {};
    if (Object.hasOwn(punctuation, code)) result.label = punctuation[code];
    if (variant.platform === "mac") {
      if (code.startsWith("Meta")) Object.assign(result, { label: code.endsWith("Left") ? "L Cmd" : "R Cmd", asset: "cmd" });
      if (code.startsWith("Alt"))
        Object.assign(result, {
          label: code.endsWith("Left") ? "L Option" : "R Option",
          asset: "option"
        });
      if (code === "Backspace") result.label = "Delete";
      if (code === "NumLock") result.label = "Clear";
      if (code === "ContextMenu") Object.assign(result, { label: "Fn", asset: "fn" });
    }
    if (code === "Enter" && variant.standard === "ansi") result.asset = "numenter";
    const label = settings.keyLabels?.[code];
    result.customLabel =
      label !== undefined ||
      Object.hasOwn(punctuation, code) ||
      (variant.platform === "mac" && code === "NumLock") ||
      (code.startsWith("F") && Number(code.slice(1)) > 12) ||
      ["ContextMenu", "IntlRo", "IntlYen", "Convert", "NonConvert", "KanaMode", "Lang1", "Lang2"].includes(code);
    if (label !== undefined) result.label = label;
    result.action = settings.keyActions?.[code] || "";
    return result;
  }

  /** Align the right-hand fighting keys by column, including when only some keys are visible. */
  function alignFightingKeys(slots, gap) {
    const byCode = new Map(slots.map((slot) => [slot.code, slot]));
    const columns = [
      ["KeyU", "KeyJ"],
      ["KeyI", "KeyK"],
      ["KeyO", "KeyL"]
    ]
      .map((pair) => pair.map((code) => byCode.get(code)).filter(Boolean))
      .filter((column) => column.length);
    if (!columns.length) return;

    const left = ["KeyW", "KeyA", "KeyS", "KeyD"].map((code) => byCode.get(code)).filter(Boolean);
    let x = left.length ? Math.max(...left.map((slot) => slot.x + slot.width)) + gap : 0;
    for (const column of columns) {
      for (const slot of column) slot.x = x;
      x += column[0].width;
    }
    const enter = byCode.get("Enter");
    if (enter) enter.x = x + gap;
  }

  /** Remove empty bands without splitting multi-unit keys or shifting aligned columns apart. */
  function closeGaps(slots, axis, span) {
    const ordered = [...slots].sort((a, b) => a[axis] - b[axis]);
    let edge = 0;
    let removed = 0;
    for (const slot of ordered) {
      const start = slot[axis];
      removed += Math.max(0, start - edge);
      edge = Math.max(edge, start + slot[span]);
      slot[axis] = start - removed;
    }
  }

  /** Close gaps in gaming layouts while keeping typing rows and the inverted-T arrow cluster. */
  function compactGamingSlots(slots, preset, tight) {
    const arrows = slots.filter((slot) => keys[slot.code].group === "arrows");
    const typing = slots.filter((slot) => keys[slot.code].group !== "arrows");
    if (!typing.length) return arrows;

    const left = Math.min(...typing.map((slot) => slot.x));
    // Keep both rows of tall keys such as ISO Enter when dropping unoccupied rows.
    const rowPositions = new Set();
    for (const slot of typing) for (let row = 0; row < slot.height; row++) rowPositions.add(slot.y + row);
    const rows = [...rowPositions].sort((a, b) => a - b).map((y) => typing.filter((slot) => slot.y === y).sort((a, b) => a.x - b.x));
    if (rows.length > 1 && rows[0].length === 1 && rows[0][0].code === "Escape") {
      const [escape] = rows.shift();
      rows[0].unshift(escape);
    }
    const bottom = rows.at(-1);
    const aboveBottom = rows.at(-2);
    if (aboveBottom?.length === 1 && aboveBottom[0].code === "ShiftLeft" && bottom.some((slot) => ["ControlLeft", "AltLeft", "Space"].includes(slot.code))) {
      const [shift] = rows.splice(-2, 1)[0];
      bottom.unshift(shift);
    }

    const gap = tight ? 0 : 0.25;
    const spaceWidth = tight ? 2.5 : 3.25;
    const result = [];
    const tall = [];
    let loneSpacebar;
    for (const [y, row] of rows.entries()) {
      let sourceRight = row[0]?.x ?? left;
      let x = Math.min(1.75, sourceRight - left);
      for (const slot of row) {
        if (slot.height > 1) {
          tall.push({ ...slot, y });
          continue;
        }
        x += Math.max(0, Math.min(gap, slot.x - sourceRight));
        const width = slot.code === "Space" ? spaceWidth : slot.width;
        const placed = { ...slot, x, y, width };
        result.push(placed);
        if (slot.code === "Space" && row.length === 1) loneSpacebar = placed;
        sourceRight = slot.x + slot.width;
        x += width;
      }
    }
    if (preset === "fighting") alignFightingKeys(result, gap);
    // Place ISO Enter to the right of both rows so its tall cap cannot overlap a shorter row.
    for (const slot of tall) {
      const right = Math.max(0, ...result.filter((key) => key.y >= slot.y && key.y < slot.y + slot.height).map((key) => key.x + key.width));
      result.push({ ...slot, x: right ? right + gap : 0 });
    }
    if (loneSpacebar) {
      const right = Math.max(0, ...result.filter((slot) => slot !== loneSpacebar).map((slot) => slot.x + slot.width));
      loneSpacebar.x = Math.max(0, (right - loneSpacebar.width) / 2);
    }

    if (arrows.length) {
      const arrowLeft = Math.min(...arrows.map((slot) => slot.x));
      const arrowTop = Math.min(...arrows.map((slot) => slot.y));
      const arrowHeight = Math.max(...arrows.map((slot) => slot.y + slot.height)) - arrowTop;
      const y = Math.max(0, rows.length - arrowHeight);
      const x = Math.max(...result.filter((slot) => slot.y + slot.height > y).map((slot) => slot.x + slot.width)) + gap;
      for (const slot of arrows) result.push({ ...slot, x: x + slot.x - arrowLeft, y: y + slot.y - arrowTop });
    }
    return result;
  }

  /**
   * Compose visible preset slots in key units, then apply the selected layout density.
   * @param {Object} settings Validated resource settings.
   * @returns {Array<Object>} code/x/y/width/height slots, without live input state.
   */
  function slots(settings) {
    const result = [];
    /** Add one row, allowing null gaps and [code,width,height] predefined spans. */
    function row(items, y, startX = 0) {
      let x = startX;
      for (const item of items) {
        const [code, width = 1, height = 1] = Array.isArray(item) ? item : [item];
        if (code) result.push({ code, x, y, width, height });
        x += width;
      }
    }
    const preset = settings.layout;
    const small = ["60", "65", "compact"].includes(preset);
    const compactArrows = ["65", "75"].includes(preset);
    const iso = settings.standard === "iso";
    const top = small ? 0 : 1.5;
    if (!small && preset !== "numpad") {
      row(["Escape"], 0);
      row(["F1", "F2", "F3", "F4"], 0, 2);
      row(["F5", "F6", "F7", "F8"], 0, 6.5);
      row(["F9", "F10", "F11", "F12"], 0, 11);
    }
    if (preset !== "numpad") {
      row(["Backquote", "Digit1", "Digit2", "Digit3", "Digit4", "Digit5", "Digit6", "Digit7", "Digit8", "Digit9", "Digit0", "Minus", "Equal", ["Backspace", 2]], top);
      row([["Tab", 1.5], "KeyQ", "KeyW", "KeyE", "KeyR", "KeyT", "KeyY", "KeyU", "KeyI", "KeyO", "KeyP", "BracketLeft", "BracketRight", ...(iso ? [] : [["Backslash", 1.5]])], top + 1);
      row([["CapsLock", 1.75], "KeyA", "KeyS", "KeyD", "KeyF", "KeyG", "KeyH", "KeyJ", "KeyK", "KeyL", "Semicolon", "Quote", iso ? "Backslash" : ["Enter", 2.25]], top + 2);
      if (iso) row([["Enter", 1.25, 2]], top + 1, 13.75);
      row([...(iso ? [["ShiftLeft", 1.25], "IntlBackslash"] : [["ShiftLeft", 2.25]]), "KeyZ", "KeyX", "KeyC", "KeyV", "KeyB", "KeyN", "KeyM", "Comma", "Period", "Slash", ["ShiftRight", compactArrows ? 1.75 : 2.75]], top + 3);
      const mac = settings.platform === "mac";
      const bottom = [
        ["ControlLeft", 1.25],
        [mac ? "AltLeft" : "MetaLeft", 1.25],
        [mac ? "MetaLeft" : "AltLeft", 1.25],
        ["Space", 6.25]
      ];
      row(
        [
          ...bottom,
          ...(compactArrows
            ? ["AltRight", "Fn", "ControlRight"]
            : [
                [mac ? "MetaRight" : "AltRight", 1.25],
                [mac ? "AltRight" : "MetaRight", 1.25],
                ["ContextMenu", 1.25],
                ["ControlRight", 1.25]
              ])
        ],
        top + 4
      );
      if (compactArrows) {
        if (preset === "75") row(["PrintScreen"], 0, 15.25);
        row(["Delete"], top, 15.25);
        row(["PageUp"], top + 1, 15.25);
        row(["PageDown"], top + 2, 15.25);
        row(["ArrowUp"], top + 3, 14.25);
        row(["ArrowLeft", "ArrowDown", "ArrowRight"], top + 4, 13.25);
      } else if (!small) {
        row(["PrintScreen", "ScrollLock", "Pause"], 0, 15.5);
        row(["Insert", "Home", "PageUp"], top, 15.5);
        row(["Delete", "End", "PageDown"], top + 1, 15.5);
        row(["ArrowUp"], top + 3, 16.5);
        row(["ArrowLeft", "ArrowDown", "ArrowRight"], top + 4, 15.5);
      }
    }
    if (!["tkl", "75", "65", "60", "compact"].includes(preset)) {
      const x = preset === "numpad" ? 0 : 19;
      const y = preset === "numpad" ? 0 : top;
      row(["NumLock", "NumpadDivide", "NumpadMultiply", "NumpadSubtract"], y, x);
      row(["Numpad7", "Numpad8", "Numpad9", ["NumpadAdd", 1, 2]], y + 1, x);
      row(["Numpad4", "Numpad5", "Numpad6"], y + 2, x);
      row(["Numpad1", "Numpad2", "Numpad3", ["NumpadEnter", 1, 2]], y + 3, x);
      row([["Numpad0", 2], "NumpadDecimal"], y + 4, x);
    }
    if (preset === "all") {
      const mounted = new Set(result.map((slot) => slot.code));
      Object.keys(keys)
        .filter((code) => !mounted.has(code))
        .forEach((code, index) => row([code], 7.75 + Math.floor(index / 16), index % 16));
    }
    const gaming = gamingKeys[preset] ? new Set(gamingKeys[preset]) : null;
    const selected = settings.displayedKeys?.length ? new Set(settings.displayedKeys) : null;
    const visible = result.filter((slot) => {
      if (gaming && !gaming.has(slot.code)) return false;
      if (preset === "arrows" && keys[slot.code].group !== "arrows") return false;
      if (preset === "function" && keys[slot.code].group !== "function") return false;
      if (preset === "compact" && slot.y === top) return false;
      return settings[`group${keys[slot.code].group}`] !== "no" && (!selected || selected.has(slot.code));
    });
    const tight = settings.layoutDensity === "compact";
    const placed = gaming ? compactGamingSlots(visible, preset, tight) : visible;
    if (tight) {
      closeGaps(placed, "x", "width");
      closeGaps(placed, "y", "height");
    }
    const left = Math.min(...placed.map((slot) => slot.x));
    const topEdge = Math.min(...placed.map((slot) => slot.y));
    return placed.map((slot) => ({ ...slot, x: slot.x - left, y: slot.y - topEdge }));
  }

  window.byKeyboardLayouts = { keys, presets, key, slots };
})();
