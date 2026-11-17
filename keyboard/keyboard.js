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
  const toggle = { type: "switch", checkedValue: "yes", uncheckedValue: "no", options: { yes: "On", no: "Off" } };
  const keyboardFields = { section: "Input", when: (settings) => ["keyboard", "both"].includes(settings.mode), retainInactive: true };
  const labelFields = { section: "Input", when: (settings) => keyboardFields.when(settings) || (settings.showHistory === "yes" && settings.historySource !== "mouse"), retainInactive: true };
  const appearance = { section: "Appearance", retainInactive: true };
  const resource = {
    version: "1.1", // 2026-11-15
    title: "Keyboard & Mouse",
    description: "Live browser-focused keyboard, mouse, and optional ephemeral Input History. Use OBS Interact to receive input; this cannot capture other applications.",
    preview: [1280, 720],
    urlRequired: ["mode"],
    sectionIcons: { Input: "fa-solid fa-keyboard", "Input History": "fa-solid fa-clock-rotate-left" },
    fields: {
      mode: {
        type: "select",
        default: "both",
        label: "Input mode",
        section: "Input",
        description: "Hidden leaves only the optional Input History.",
        options: { keyboard: "Keyboard only", mouse: "Mouse only", both: "Keyboard + Mouse", hidden: "Hidden" }
      },
      layout: { ...labelFields, type: "select", default: "full", label: "Layout preset", options: layouts.presets },
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
      shell: {
        ...appearance,
        type: "select",
        default: "full",
        label: "Keyboard shell",
        when: keyboardFields.when,
        options: { full: "Complete shell", minimal: "Minimal shell", none: "Floating keys", outline: "Outline only", gaming: "Compact gaming" }
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
      imageTarget: { ...appearance, type: "select", default: "none", label: "Image surfaces", subsection: "Image backgrounds", when: keyboardFields.when, options: { none: "Off", shell: "Shell", keys: "Keycaps", both: "Shell + keycaps" } },
      shellImage: {
        ...appearance,
        type: "text",
        default: "",
        label: "Shell image URL",
        subsection: "Image backgrounds",
        image: true,
        maxlength: 65536,
        validate: imageValue,
        when: (settings) => keyboardFields.when(settings) && ["shell", "both"].includes(settings.imageTarget)
      },
      keyImage: {
        ...appearance,
        type: "text",
        default: "",
        label: "Keycap image URL",
        subsection: "Image backgrounds",
        image: true,
        maxlength: 65536,
        validate: imageValue,
        when: (settings) => keyboardFields.when(settings) && ["keys", "both"].includes(settings.imageTarget)
      },
      imageFit: { ...appearance, type: "select", default: "cover", label: "Image fit", subsection: "Image backgrounds", when: ["imageTarget", "shell", "keys", "both"], options: { cover: "Cover", contain: "Contain", stretch: "Stretch" } },
      imageScale: { ...appearance, type: "number", default: 100, label: "Image scale (%)", subsection: "Image backgrounds", when: ["imageTarget", "shell", "keys", "both"], min: 25, max: 300 },
      imageOpacity: { ...appearance, type: "number", default: 100, label: "Image opacity (%)", subsection: "Image backgrounds", when: ["imageTarget", "shell", "keys", "both"], min: 0, max: 100 },
      imageTint: {
        ...appearance,
        type: "select",
        default: "none",
        label: "Image tint",
        subsection: "Image backgrounds",
        when: ["imageTarget", "shell", "keys", "both"],
        options: { none: "Original colors", texture: "Tint with texture", monochrome: "Monochrome", chroma: "Replace green regions" }
      },
      imageTintColor: { ...appearance, type: "color", default: "#990000", label: "Tint color", subsection: "Image backgrounds", maxlength: 9, when: ["imageTint", "texture", "monochrome", "chroma"] },
      mouseIndependent: { ...appearance, ...toggle, default: "no", label: "Independent mouse colors", subsection: "Mouse", when: (settings) => ["mouse", "both"].includes(settings.mode) },
      mouseColor: { ...appearance, type: "color", default: "#111111", label: "Mouse surface", subsection: "Mouse", maxlength: 9, when: ["mouseIndependent", "yes"] },
      mouseButtonColor: { ...appearance, type: "color", default: "#282828", label: "Mouse buttons", subsection: "Mouse", maxlength: 9, when: ["mouseIndependent", "yes"] },
      mouseOutlineColor: { ...appearance, type: "color", default: "#EEEEEE88", label: "Mouse outlines", subsection: "Mouse", maxlength: 9, when: ["mouseIndependent", "yes"] },
      mousePressedColor: { ...appearance, type: "color", default: "#990000", label: "Pressed mouse buttons", subsection: "Mouse", maxlength: 9, when: ["mouseIndependent", "yes"] },
      mouseMovement: { ...appearance, ...toggle, default: "yes", label: "Movement indicator", subsection: "Mouse", when: (settings) => ["mouse", "both"].includes(settings.mode) },
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
      keySpacing: { type: "number", default: 5, label: "Key spacing (px)", section: "Size & placement", when: keyboardFields.when, retainInactive: true, min: 0, max: 40 },
      keyProportion: { type: "number", default: 100, label: "Key height (%)", section: "Size & placement", when: keyboardFields.when, retainInactive: true, min: 50, max: 150 },
      componentGap: { type: "number", default: 24, label: "Keyboard / mouse gap (px)", section: "Size & placement", min: 0, max: 500, when: ["mode", "both"] },
      composition: { type: "select", default: "row", label: "Combined arrangement", section: "Size & placement", options: { row: "Side by side", column: "Stacked" }, when: ["mode", "both"] },
      fit: { ...toggle, default: "yes", label: "Fit to viewport", section: "Size & placement" },
      edgePadding: { type: "number", default: 16, label: "Viewport edge padding (px)", section: "Size & placement", min: 0, max: 1000 },
      opacity: { type: "number", default: 100, label: "Visualization opacity (%)", section: "Size & placement", min: 0, max: 100 },
      ...byStream.placementFields("#input-scene"),
      ...componentFields("keyboard", "Keyboard", keyboardFields.when),
      ...componentFields("mouse", "Mouse", (settings) => ["mouse", "both"].includes(settings.mode)),
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

  /** Declare independent component placement without adding another configuration owner. */
  function componentFields(name, label, when) {
    const common = { type: "number", section: "Size & placement", subsection: label, when, retainInactive: true, step: "any" };
    return {
      [`${name}Scale`]: { ...common, default: 100, label: `${label} scale (%)`, min: -500, max: 500 },
      [`${name}X`]: { ...common, default: 0, label: `${label} horizontal offset (px)`, min: -3840, max: 3840 },
      [`${name}Y`]: { ...common, default: 0, label: `${label} vertical offset (px)`, min: -2160, max: 2160 }
    };
  }

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
  const history = byStream.inputHistory.create(settings);
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
    const filter = svg("filter", { id: "keyboard-thin-outline", x: -4, y: -4, width: 72, height: 72, filterUnits: "userSpaceOnUse" }, defs);
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
        const response = await fetch(new URL(`./keys/${asset}.svg`, keyboardResourceURL), { signal: requests.signal });
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
      const clip = svg("clipPath", { id: `${id}-clip`, clipPathUnits: "userSpaceOnUse" }, defs);
      svg("use", { href: `#${id}-surface` }, clip);
      return { id, box: outer.box, parts, source };
    })();
    assets.set(asset, pending);
    return pending;
  }

  /** Draw a mounted key from shared source contours; only its state class changes during input. */
  function keyArtwork(info, artwork, width, height, id = "") {
    const node = svg("svg", { viewBox: `-2 -2 ${width + 4} ${height + 4}`, width, height, class: "input-key", role: "img", "aria-label": `${info.label}${info.action ? `: ${info.action}` : ""}` });
    if (id) node.dataset.code = id;
    const title = svg("title", {}, node);
    title.textContent = info.action ? `${info.label} · ${info.action}` : info.label;
    if (!artwork) {
      // A missing pack remains usable and clearly identified; normal rendering always uses Kenney paths.
      svg("rect", { width, height, rx: 5, class: "key-surface" }, node);
      const label = svg("text", { x: width / 2, y: height / 2, class: "key-text", "text-anchor": "middle", "dominant-baseline": "central", "font-size": 12 }, node);
      label.textContent = info.label;
      return node;
    }
    const { box, id: assetId } = artwork;
    const transform = `scale(${width / box.width} ${height / box.height}) translate(${-box.x} ${-box.y})`;
    const cap = svg("g", { transform, class: "key-cap" }, node);
    svg("use", { href: `#${assetId}-surface`, class: "key-surface" }, cap);
    if (["keys", "both"].includes(settings.imageTarget) && settings.keyImage && settings.keycapStyle !== "outline") {
      const clip = svg("g", { "clip-path": `url(#${assetId}-clip)` }, cap);
      const size = settings.imageScale / 100;
      svg("use", { href: "#keycap-image", x: box.x + (box.width * (1 - size)) / 2, y: box.y + (box.height * (1 - size)) / 2, width: box.width * size, height: box.height * size, class: "surface-image" }, clip);
    }
    svg("use", { href: `#${assetId}-surface`, class: "key-light" }, cap);
    svg("use", { href: `#${assetId}-surface`, class: "key-pressed-fill" }, cap);
    svg("use", { href: `#${assetId}-outline`, class: "key-outline" }, cap);
    if (!info.customLabel) {
      const scale = Math.min(width / box.width, height / box.height);
      svg("use", { href: `#${assetId}-legend`, transform: `translate(${width / 2} ${height / 2}) scale(${scale}) translate(${-box.x - box.width / 2} ${-box.y - box.height / 2})`, class: "key-legend" }, node);
    } else {
      const label = svg("text", { x: width / 2, y: height / 2, "text-anchor": "middle", "dominant-baseline": "central", "font-size": Math.min(height * 0.35, (width / Math.max(2, info.label.length)) * 1.5), class: "key-text" }, node);
      label.textContent = info.label;
    }
    if (settings.showActions === "yes" && info.action) {
      const label = svg("text", { x: width / 2, y: height * 0.86, "text-anchor": "middle", "font-size": Math.min(height * 0.16, (width / Math.max(2, info.action.length)) * 1.4), class: "key-text key-action" }, node);
      label.textContent = info.action;
    }
    return node;
  }

  /** Put a configured image in shared SVG definitions; failure leaves vector surfaces visible. */
  function imageDefinition(id, value) {
    if (!value) return;
    const symbol = svg("svg", { id, viewBox: "0 0 100 100", preserveAspectRatio: { cover: "xMidYMid slice", contain: "xMidYMid meet", stretch: "none" }[settings.imageFit] }, defs);
    const image = svg("image", { width: 100, height: 100, preserveAspectRatio: "none" }, symbol);
    if (settings.imageTint !== "none") image.setAttribute("filter", "url(#keyboard-image-tint)");
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
    };
    loader.onerror = () => {
      imageLoaders.delete(loader);
      image.remove();
      root.dataset.imageError = "yes";
    };
    loader.src = new URL(value, location.href).href;
  }

  createImageTint(defs, settings, svg);
  if (!keyboard.hidden && ["keys", "both"].includes(settings.imageTarget)) imageDefinition("keycap-image", settings.keyImage);
  if (!keyboard.hidden && ["shell", "both"].includes(settings.imageTarget)) imageDefinition("shell-image", settings.shellImage);
  const slots = keyboard.hidden ? [] : layouts.slots(settings);
  const required = new Set(slots.map((slot) => layouts.key(slot.code, settings).asset));
  // History's all-inputs mode also needs prompts for controls absent from a compact display.
  if (history && settings.historyStyle === "svg" && settings.historySource !== "mouse") for (const code of Object.keys(layouts.keys)) required.add(layouts.key(code, settings).asset);
  if (!mouse.hidden || (history && settings.historyStyle === "svg" && settings.historySource !== "keyboard")) for (const name of ["mouse", "lmb", "rmb", "wheel", "scrollup", "scrolldown", "mb4", "mb5"]) required.add(name);
  await Promise.all([...required].map(loadKey));
  if (disposed) return;
  const loaded = new Map();
  for (const [name, result] of assets) loaded.set(name, await result);
  const unitX = settings.keySize + settings.keySpacing;
  const unitY = (settings.keySize * settings.keyProportion) / 100 + settings.keySpacing;
  const padding = settings.shell === "full" ? 16 : settings.shell === "gaming" ? 10 : 6;
  if (!keyboard.hidden) {
    const width = Math.max(1, ...slots.map((slot) => (slot.x + slot.width) * unitX - settings.keySpacing)) + padding * 2;
    const height = Math.max(1, ...slots.map((slot) => (slot.y + slot.height) * unitY - settings.keySpacing)) + padding * 2;
    const board = svg("svg", { viewBox: `0 0 ${width} ${height}`, width, height, role: "img", "aria-label": layouts.presets[settings.layout], "data-shell": settings.shell }, keyboard);
    const clip = svg("clipPath", { id: "keyboard-shell-clip" }, defs);
    svg("rect", { width: width - 2, height: height - 2, x: 1, y: 1, rx: settings.shell === "full" ? 10 : 5 }, clip);
    svg("rect", { x: 1, y: 1, width: width - 2, height: height - 2, rx: settings.shell === "full" ? 10 : 5, class: "keyboard-shell", "stroke-width": settings.outlineWidth * 1.5 }, board);
    if (["shell", "both"].includes(settings.imageTarget) && settings.shellImage) {
      const clipped = svg("g", { "clip-path": "url(#keyboard-shell-clip)", class: "shell-texture" }, board);
      const scale = settings.imageScale / 100;
      svg("use", { href: "#shell-image", width: width * scale, height: height * scale, x: (width * (1 - scale)) / 2, y: (height * (1 - scale)) / 2, class: "surface-image" }, clipped);
    }
    if (settings.shell === "full") svg("path", { d: `M12 4 H${Math.max(12, width - 12)}`, class: "shell-highlight" }, board);
    for (const slot of slots) {
      const info = layouts.key(slot.code, settings);
      const node = keyArtwork(info, loaded.get(info.asset), slot.width * unitX - settings.keySpacing, slot.height * unitY - settings.keySpacing, slot.code);
      node.setAttribute("x", slot.x * unitX + padding);
      node.setAttribute("y", slot.y * unitY + padding);
      board.append(node);
      keyNodes.set(slot.code, node);
    }
  }
  if (!mouse.hidden) mountMouse();
  root.dataset.keycap = settings.keycapStyle;
  for (const [name, element] of [
    ["keyboard", keyboard],
    ["mouse", mouse]
  ]) {
    element.style.transform = `translate(${settings[`${name}X`]}px, ${settings[`${name}Y`]}px)`;
    element.style.zoom = Math.abs(settings[`${name}Scale`]) / 100;
    if (settings[`${name}Scale`] < 0) element.style.scale = "-1";
  }
  if (settings.mouseIndependent === "yes") {
    for (const [name, value] of Object.entries({ shell: settings.mouseColor, key: settings.mouseButtonColor, outline: settings.mouseOutlineColor, pressed: settings.mousePressedColor })) mouse.style.setProperty(`--${name}`, value);
  }

  /** Fit the natural composition once on mount and when the viewport dimensions change. */
  function fit() {
    const width = scene.offsetWidth;
    const height = scene.offsetHeight;
    const padding = settings.edgePadding;
    const area = (width && height ? history?.available(width, height, padding) : null) || { x: padding, y: padding, width: Math.max(0, innerWidth - padding * 2), height: Math.max(0, innerHeight - padding * 2) };
    scene.style.left = `${area.x + area.width / 2}px`;
    scene.style.top = `${area.y + area.height / 2}px`;
    const scale = settings.fit === "yes" ? Math.max(0, Math.min(1, area.width / Math.max(1, width), area.height / Math.max(1, height))) : 1;
    scene.style.transform = `translate(-50%, -50%) scale(${scale})`;
  }
  history?.onResize(fit);
  fit();
  window.addEventListener("resize", fit, { signal: events.signal });

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
      const node = svg("path", { d: side.d, class: "mouse-button mouse-side", "data-code": code, transform: "translate(-2 0)" }, drawing);
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
    const prompts = { Mouse0: ["LMB", "lmb"], Mouse1: ["MMB", "wheel"], Mouse2: ["RMB", "rmb"], Mouse3: ["MB4", "mb4"], Mouse4: ["MB5", "mb5"], WheelUp: ["Wheel up", "scrollup"], WheelDown: ["Wheel down", "scrolldown"] };
    const prompt = prompts[code];
    if (!prompt) return null;
    return {
      id: code,
      source: "local",
      label: prompt[0],
      prompt: () => {
        const drawing = svg("svg", { viewBox: "0 0 64 64" });
        const artwork = loaded.get(prompt[1]);
        if (!artwork) return null;
        svg("path", { d: artwork.source, fill: "currentColor" }, drawing);
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

  /** Update exactly one mounted control and the one authoritative live pressed set. */
  function setPressed(code, down) {
    if (pressed.has(code) === down) return;
    if (down) pressed.add(code);
    else pressed.delete(code);
    const node = keyNodes.get(code) || mouseNodes.get(code);
    node?.classList.toggle("pressed", down);
    if (!down) history?.release(code);
    else if (include(code)) {
      const input = token(code);
      if (input) history.press(input);
    }
  }

  /** Process physical key transitions; OS auto-repeat never creates another transition. */
  function keyboardInput(event) {
    if (event.type === "keyup") return setPressed(event.code, false);
    if (!eligible(event) || !Object.hasOwn(layouts.keys, event.code)) return;
    event.preventDefault();
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
    if (!eligible(event) || !event.deltaY) return;
    const code = event.deltaY < 0 ? "WheelUp" : "WheelDown";
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
    if (mouse.hidden || settings.mouseMovement !== "yes") return;
    if (movementFrame) return;
    const x = Math.max(-4, Math.min(4, event.movementX));
    const y = Math.max(-4, Math.min(4, event.movementY));
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
    for (const timer of timers.values()) clearTimeout(timer);
    timers.clear();
    cancelAnimationFrame(movementFrame);
    movementFrame = 0;
    for (const node of mouseNodes.values()) node.classList.remove("pressed");
    mouse.classList.remove("moving");
  }

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
  if (captureKeyboard) {
    window.addEventListener("keydown", keyboardInput, { signal: events.signal });
    window.addEventListener("keyup", keyboardInput, { signal: events.signal });
  }
  if (captureMouse) {
    window.addEventListener("mousedown", mouseInput, { signal: events.signal });
    window.addEventListener("mouseup", mouseInput, { signal: events.signal });
    window.addEventListener("wheel", wheelInput, { signal: events.signal, passive: true });
    window.addEventListener("mousemove", mouseMove, { signal: events.signal });
    window.addEventListener(
      "contextmenu",
      (event) => {
        if (eligible(event)) event.preventDefault();
      },
      { signal: events.signal }
    );
  }
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

/** Build one reusable image filter; texture and green-region tinting preserve source alpha. */
function createImageTint(defs, settings, svg) {
  if (settings.imageTint === "none") return;
  const filter = svg("filter", { id: "keyboard-image-tint", "color-interpolation-filters": "sRGB", x: 0, y: 0, width: "100%", height: "100%" }, defs);
  let hex = settings.imageTintColor.slice(1);
  if (hex.length <= 4) hex = [...hex].map((digit) => digit + digit).join("");
  const rgb = [0, 2, 4].map((index) => parseInt(hex.slice(index, index + 2), 16) / 255);
  if (settings.imageTint === "texture") {
    const alpha = hex.length === 8 ? parseInt(hex.slice(6), 16) / 255 : 1;
    svg("feColorMatrix", { type: "matrix", values: `${rgb.map((channel) => [0.2126 * channel, 0.7152 * channel, 0.0722 * channel, 0, 0].join(" ")).join(" ")} 0 0 0 ${alpha} 0` }, filter);
  } else if (settings.imageTint === "monochrome") {
    svg("feFlood", { "flood-color": settings.imageTintColor }, filter);
    svg("feComposite", { in2: "SourceGraphic", operator: "in" }, filter);
  } else {
    svg("feColorMatrix", { in: "SourceGraphic", type: "matrix", values: "0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 -1 2 -1 0 0", result: "green" }, filter);
    svg("feComposite", { in: "green", in2: "SourceAlpha", operator: "in", result: "mask" }, filter);
    svg("feFlood", { "flood-color": settings.imageTintColor }, filter);
    svg("feComposite", { in2: "mask", operator: "in" }, filter);
    svg("feComposite", { in2: "SourceGraphic", operator: "over" }, filter);
  }
}

/** Embedded ephemeral input history; capture and teardown belong to this resource. */
(() => {
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
      historyAnimation: { ...active, type: "select", default: "slide", label: "Entry animation", options: { slide: "Slide", fade: "Fade", none: "Off" }, when: (settings) => settings.showHistory === "yes" && settings.animate !== "no" },
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
      ["X", "Horizontal offset (px)", 0, -3840, 3840],
      ["Y", "Vertical offset (px)", 0, -2160, 2160],
      ["Gap", "Entry spacing (px)", 6, 0, 100],
      ["Padding", "Padding (px)", 8, 0, 100],
      ["Opacity", "Opacity (%)", 100, 0, 100]
    ]) {
      const id = `history${name}`;
      result[id] = { ...active, type: "number", default: value, label, min, max, step: "any", subsection: "Size & placement" };
      if (name === "Width" || name === "Height") {
        result[id].description = "0 sizes automatically for the selected orientation.";
        result[`${id}Mode`] = {
          ...active,
          type: "switch",
          default: "auto",
          label: "Fill parent",
          subsection: "Size & placement",
          when: [id, "0"],
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
      result[`history${name}`] = { ...active, type: "color", default: value, label, maxlength: 9, subsection: "Colors" };
    }
    return result;
  }

  /**
   * Mount a history, or return null while disabled. Nothing is persisted or transmitted.
   * @param {Object} settings Validated resource settings.
   * @param {HTMLElement} [parent=document.body] Overlay-owned mount.
   * @returns {Object|null} press/release/update/pulse/clear/destroy; destroy releases observers and frames.
   */
  function create(settings, parent = document.body) {
    if (settings.showHistory !== "yes") return null;
    const style = document.createElement("style");
    style.textContent = `
.input-history-position {
  position: absolute;
  inset: 16px;
  display: flex;
  align-items: flex-end;
  justify-content: flex-start;
  pointer-events: none;
}
.input-history-position[data-position^="top"] { align-items: flex-start; }
.input-history-position[data-position$="right"] { justify-content: flex-end; }
.input-history-position[data-position="center"] { align-items: center; justify-content: center; }
.input-history {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--history-gap);
  padding: var(--history-padding);
  border-radius: 6px;
  overflow: hidden;
  background: var(--history-background);
  color: var(--history-ink);
  font: 600 var(--history-size)/1.2 "Courier New", monospace;
  contain: layout paint;
}
.input-history[data-orientation="horizontal"] { flex-direction: row; align-items: flex-start; }
.history-entry {
  box-sizing: border-box;
  display: flex;
  align-items: center;
  flex: 0 0 auto;
  gap: 0.2em;
  max-width: 100%;
  min-height: 1.5em;
  overflow: hidden;
  padding: 0.12em 0.25em;
  border: 1px solid var(--history-border);
  border-radius: 5px;
  background: var(--history-entry);
  white-space: nowrap;
}
.history-entry small { font-size: 0.45em; }
.history-prompt { display: inline-flex; min-width: 0; flex-shrink: 1; }
.history-prompt svg { display: block; width: 1.5em; height: 1.5em; overflow: hidden; }
.history-count { font: inherit; font-size: 0.65em; }
.history-count:empty { display: none; }
.input-history[data-compact="true"] .history-entry { flex-direction: column; align-items: center; width: 100%; }
.input-history[data-compact="true"] .history-prompt { max-width: 100%; white-space: normal; overflow-wrap: anywhere; text-align: center; }
`;
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
    const keyHeight = settings.historySize * (settings.historyStyle === "svg" ? 1.5 : 1.2);
    const entryHeight = Math.max(settings.historySize * 1.5, keyHeight + settings.historySize * 0.24 + 2);
    const narrow = !horizontal && settings.historyWidth === 0 && settings.historyWidthMode !== "fill";
    root.dataset.compact = String(narrow);
    root.style.width = settings.historyWidth ? `${settings.historyWidth}px` : !narrow ? "100%" : `${Math.ceil(settings.historySize * 2 + 2 + settings.historyPadding * 2)}px`;
    root.style.height = settings.historyHeight ? `${settings.historyHeight}px` : !horizontal || settings.historyHeightMode === "fill" ? "100%" : `${Math.ceil(entryHeight + settings.historyPadding * 2)}px`;
    const scale = settings.historyScale / 100;
    const maximumHeight = `calc((100vh - 32px) / ${Math.abs(scale) || 1})`;
    root.style.maxWidth = `calc((100vw - 32px) / ${Math.abs(scale) || 1})`;
    root.style.maxHeight = maximumHeight;
    root.style.transform = `scale(${scale})`;
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
    position.append(style, root);
    parent.append(position);
    // Only active controls and mounted rows are retained. The oldest row is always at rows[0].
    const held = new Map();
    const rows = [];
    const events = new AbortController();
    let frame = 0;
    let disposed = false;
    let layoutChanged;

    /** Subscribe the visualization's existing fit function to changes in the history's occupied area. */
    function onResize(callback) {
      layoutChanged = callback;
    }

    /**
     * Return the largest useful viewport rectangle outside this history, for the source's own fit function.
     * @param {number} width Natural visualization width in pixels.
     * @param {number} height Natural visualization height in pixels.
     * @param {number} [padding=16] Viewport inset in pixels.
     * @returns {Object} x/y/width/height rectangle; capture/render ownership stays with the resource.
     */
    function available(width, height, padding = 16) {
      const area = { x: padding, y: padding, width: Math.max(0, innerWidth - padding * 2), height: Math.max(0, innerHeight - padding * 2) };
      root.style.maxHeight = maximumHeight;
      let box = root.getBoundingClientRect();
      if (box.right <= area.x || box.left >= innerWidth - padding || box.bottom <= area.y || box.top >= innerHeight - padding || settings.historyScale === 0) return area;
      const gap = 12;
      // A fully filled history still leaves a usable band for the visualization.
      const maxHeight = Math.max(0, area.height - Math.min(height, area.height / 2) - gap);
      if (box.width > area.width / 2 && box.height > maxHeight) {
        root.style.maxHeight = `${maxHeight / (Math.abs(scale) || 1)}px`;
        box = root.getBoundingClientRect();
      }
      const candidates = [
        { ...area, height: Math.max(0, box.top - gap - area.y) },
        { ...area, y: Math.max(area.y, box.bottom + gap), height: Math.max(0, innerHeight - padding - box.bottom - gap) },
        { ...area, width: Math.max(0, box.left - gap - area.x) },
        { ...area, x: Math.max(area.x, box.right + gap), width: Math.max(0, innerWidth - padding - box.right - gap) }
      ];
      const score = (candidate) => Math.min(candidate.width / Math.max(1, width), candidate.height / Math.max(1, height));
      candidates.sort((a, b) => score(b) - score(a) || b.width * b.height - a.width * a.height);
      return candidates[0];
    }

    /** Measure once per input frame/resize and immediately remove displaced rows and their records. */
    function trim() {
      frame = 0;
      const horizontal = settings.historyOrientation === "horizontal";
      const limit = (horizontal ? root.clientWidth : root.clientHeight) - settings.historyPadding * 2;
      if (limit <= 0 || root.clientHeight <= 0 || root.clientWidth <= 0) return clear();
      const sizes = rows.map((row) => (horizontal ? row.node.offsetWidth : row.node.offsetHeight));
      let used = sizes.reduce((sum, size) => sum + size, 0) + Math.max(0, rows.length - 1) * settings.historyGap;
      while (rows.length > 1 && used > limit + 0.5) {
        used -= sizes.shift() + settings.historyGap;
        const oldest = rows.shift().node;
        for (const animation of oldest.getAnimations()) animation.cancel();
        oldest.remove();
      }
    }

    /** Coalesce capacity work rather than measuring on each physical input. */
    function scheduleTrim() {
      if (!frame && !disposed) frame = requestAnimationFrame(trim);
    }

    /** Paint a row's current combination using safe labels and source-owned SVG clones. */
    function paint(row) {
      const content = document.createDocumentFragment();
      if (row.sourceLabel) {
        const source = document.createElement("small");
        source.textContent = row.sourceLabel;
        content.append(source);
      }
      row.tokens.forEach((token, index) => {
        if (index) {
          const plus = document.createElement("span");
          plus.textContent = "+";
          content.append(plus);
        }
        const prompt = settings.historyStyle === "svg" ? token.prompt?.() : null;
        const cap = document.createElement("span");
        cap.className = "history-prompt";
        cap.title = token.label;
        if (prompt) {
          prompt.setAttribute("aria-label", token.label);
          cap.append(prompt);
        } else cap.textContent = token.label;
        content.append(cap);
      });
      const count = document.createElement("b");
      count.className = "history-count";
      count.textContent = row.count > 1 ? `×${row.count}` : "";
      content.append(count);
      row.node.replaceChildren(content);
      row.signature = row.tokens
        .map((token) => token.id)
        .sort()
        .join("|");
      scheduleTrim();
    }

    /**
     * Record a new physical press; repeat events and still-held inputs are ignored.
     * @param {Object} token Stable id, label, source, optional modifier/sourceLabel and SVG prompt factory.
     */
    function press(token) {
      if (disposed || document.hidden || held.has(token.id)) return;
      const modifiers = [...held.values()].filter((input) => input.modifier && input.source === token.source);
      const now = performance.now();
      let last = rows.at(-1);
      const overlap = last?.tokens.some((input) => held.has(input.id));
      held.set(token.id, token);
      // A long-held modifier joins the next action instead of leaving a redundant solo modifier row.
      const modifierRow = last && last.count === 1 && last.tokens.every((input) => input.modifier && held.has(input.id));
      if (last && last.source === token.source && last.count === 1 && !last.tokens.some((input) => input.id === token.id) && ((overlap && now - last.time <= settings.historyGroupWindow) || modifierRow)) {
        last.tokens = [...new Map([...last.tokens, ...modifiers, token].map((input) => [input.id, input])).values()];
        paint(last);
        return;
      }
      const tokens = [...modifiers, token];
      const signature = tokens
        .map((input) => input.id)
        .sort()
        .join("|");
      if (settings.historyAggregate === "yes" && last?.signature === signature) {
        last.count++;
        last.time = now;
        const count = last.node.querySelector(".history-count");
        count.textContent = `×${last.count}`;
        scheduleTrim();
        return;
      }
      const node = document.createElement("div");
      node.className = "history-entry";
      last = { node, tokens, source: token.source, sourceLabel: token.sourceLabel, count: 1, time: now };
      rows.push(last);
      if (settings.historyOrder === "first") root.prepend(node);
      else root.append(node);
      paint(last);
      if (settings.animate !== "no" && settings.historyAnimation !== "none") {
        const offset = settings.historyOrder === "first" ? -10 : 10;
        const transform = settings.historyOrientation === "horizontal" ? `translateX(${offset}px)` : `translateY(${offset}px)`;
        node.animate(
          [
            { opacity: 0, transform: settings.historyAnimation === "slide" ? transform : "none" },
            { opacity: 1, transform: "none" }
          ],
          { duration: 140, easing: "ease-out" }
        );
      }
    }

    /** Release one physical ID; no recorded text or release log is retained. */
    function release(id) {
      held.delete(id);
    }

    /** Diff a source's current digital state using the caller's existing polling loop. */
    function update(source, tokens) {
      const next = new Set(tokens.map((token) => token.id));
      for (const [id, token] of held) if (token.source === source && !next.has(id)) release(id);
      for (const token of tokens) press(token);
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
      disposed = true;
      layoutChanged = undefined;
      clear();
      observer.disconnect();
      events.abort();
      position.remove();
    }

    const observer = new ResizeObserver(() => {
      scheduleTrim();
      layoutChanged?.();
    });
    observer.observe(root);
    window.addEventListener("blur", () => held.clear(), { signal: events.signal });
    document.addEventListener(
      "visibilitychange",
      () => {
        if (document.hidden) held.clear();
      },
      { signal: events.signal }
    );
    window.addEventListener(
      "pagehide",
      (event) => {
        if (event.persisted) clear();
        else destroy();
      },
      { signal: events.signal }
    );
    return { press, release, update, pulse, clear, destroy, available, onResize };
  }

  byStream.inputHistory = { fields, create };
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
  for (let number = 1; number <= 24; number++) keys[`F${number}`] = { label: `F${number}`, asset: number <= 12 ? `f${number}` : "any", group: "function" };
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
  // Gaming presets select physical slots; they never pack or resize keys into fictional rows.
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
    const swaps = variant.legends === "qwertz" ? { KeyY: "KeyZ", KeyZ: "KeyY" } : variant.legends === "azerty" ? { KeyQ: "KeyA", KeyA: "KeyQ", KeyW: "KeyZ", KeyZ: "KeyW", KeyM: "Comma", Semicolon: "KeyM" } : {};
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
      if (code.startsWith("Alt")) Object.assign(result, { label: code.endsWith("Left") ? "L Option" : "R Option", asset: "option" });
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

  /**
   * Compose preset slots in key units; hidden controls keep the selected preset's geometry.
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
    // Crop empty outer rows/columns without changing the relative physical positions or key widths.
    const left = Math.min(...visible.map((slot) => slot.x));
    const topEdge = Math.min(...visible.map((slot) => slot.y));
    return visible.map((slot) => ({ ...slot, x: slot.x - left, y: slot.y - topEdge }));
  }

  window.byKeyboardLayouts = { keys, presets, key, slots };
})();
