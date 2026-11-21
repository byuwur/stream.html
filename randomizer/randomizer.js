// Randomizer: validated URL settings and an native renderer with shared URL setup.
document.addEventListener("DOMContentLoaded", async () => {
  await byStream.assetsReady;
  // ===== RESOURCE DEFINITION =====

  // Defaults, URL constraints, and the field metadata consumed by the optional editor.
  const resource = {
    version: "1.4",
    title: "Randomizer",
    description: "Repeatable seeded draws for games, challenges, and choices.",
    preview: [960, 540],
    urlRequired: ["entries", "startTime"],
    presets: true,
    ...byStream.cycleParameters("result", "resultMotion", 500, 24),
    sectionOrder: ["General", "Result", "Appearance"],
    fieldDefaults: { "result.entrance": "fadeInLeft" },
    elements: {
      overlay: { label: "Appearance", selector: "#overlay .panel" },
      heading: { label: "Heading", selector: "#overlay .eyebrow", fields: ["label"] },
      result: { label: "Result", premade: "slide", selector: "#overlay .primary", fields: ["entries"] },
      counter: { label: "Draw counter", selector: "#overlay .secondary", fields: ["showNumber", "counterLabel"], when: ["showNumber", "yes"] },
      button: { label: "Draw button", selector: "#overlay .draw-button", fields: ["buttonLabel"], when: ["mode", "manual"] }
    },
    fields: {
      entries: {
        type: "entries",
        default: ["One more round?", "Try a new character!", "Let chat decide", "Take a breather..."],
        label: "Items",
        section: "Content & behavior",
        validate: parseEntries,
        maxlength: 8000,
        entries: { textFields: [["text", "Choice"]], newEntry: "", limit: 40 },
        addLabel: "Add entry"
      },
      label: {
        type: "text",
        default: "WHAT'S NEXT?",
        label: "Heading",
        section: "Content & behavior",
        maxlength: 160
      },
      mode: {
        type: "select",
        default: "automatic",
        label: "Draw mode",
        section: "Content & behavior",
        options: { automatic: "Timed draws", manual: "Manual draws" }
      },
      duration: {
        type: "number",
        default: 3,
        label: "Seconds per timed draw",
        section: "Content & behavior",
        when: ["mode", "automatic"],
        min: 1,
        max: 3600,
        step: "any"
      },
      showNumber: {
        type: "switch",
        default: "no",
        label: "Show draw number",
        section: "Content & behavior",
        checkedValue: "yes",
        uncheckedValue: "no",
        options: { yes: "yes", no: "no" }
      },
      useStartTime: {
        type: "switch",
        default: "no",
        label: "Use fixed start time",
        section: "Content & behavior",
        subsection: "Draw state",
        when: ["mode", "automatic"],
        description: "Off starts on load; On keeps progress across reloads.",
        checkedValue: "yes",
        uncheckedValue: "no",
        options: { yes: "On", no: "Off" }
      },
      startTime: {
        type: "datetime",
        default: "2026-11-10T17:33:30.927Z",
        label: "Draw schedule start",
        section: "Content & behavior",
        when: ["useStartTime", "yes"],
        subsection: "Draw state",
        description: "ISO timestamp with Z or UTC offset.",
        validate: byStream.parseTimestamp,
        maxlength: 160
      },
      seed: {
        type: "number",
        default: 1,
        label: "Random seed",
        section: "Content & behavior",
        subsection: "Draw state",
        min: 0,
        max: 4294967295,
        step: 1
      },
      round: {
        type: "number",
        default: 0,
        label: "Initial draw number",
        section: "Content & behavior",
        subsection: "Draw state",
        min: 0,
        max: 1000000,
        step: 1
      },
      buttonLabel: { type: "text", default: "Draw next", label: "Draw button text", section: "Content & behavior", when: ["mode", "manual"], subsection: "Labels", maxlength: 160 },
      counterLabel: { type: "text", default: "DRAW", label: "Draw counter prefix", section: "Content & behavior", when: ["showNumber", "yes"], subsection: "Labels", maxlength: 160 },
      fontFamily: {
        type: "font",
        default: "Courier New",
        label: "Font family",
        section: "Appearance",
        description: "Google or installed fonts; offline uses a system fallback.",
        maxlength: 100
      },
      fontSize: {
        type: "number",
        default: 32,
        label: "Base text size (px)",
        section: "Appearance",
        min: 10,
        max: 200,
        step: "any"
      },
      fontWeight: {
        type: "select",
        default: "700",
        label: "Font weight",
        section: "Appearance",
        options: { 300: "300", 400: "400", 500: "500", 600: "600", 700: "700", 800: "800", 900: "900" }
      },
      textColor: {
        type: "color",
        default: "#EEEEEE",
        label: "Base text color",
        section: "Appearance",
        maxlength: 80
      },
      accentColor: {
        type: "color",
        default: "#660000",
        label: "Accent color",
        section: "Appearance",
        maxlength: 80
      },
      backgroundColor: {
        type: "color",
        default: "#11111166",
        label: "Panel background",
        section: "Appearance",
        maxlength: 80
      },
      opacity: {
        type: "number",
        default: 100,
        label: "Opacity (%)",
        section: "Appearance",
        min: 0,
        max: 100,
        step: "any"
      },
      radius: {
        type: "number",
        default: 16,
        label: "Corner radius (px)",
        section: "Appearance",
        min: 0,
        max: 100,
        step: "any"
      },
      width: {
        type: "number",
        default: 0,
        label: "Maximum width (px)",
        description: "0 removes the limit.",
        section: "Size & placement",
        min: 0,
        max: 3840,
        step: "any"
      },
      horizontalPlacement: {
        type: "select",
        default: "center",
        label: "Horizontal placement",
        section: "Size & placement",
        options: { "flex-start": "Left", center: "Center", "flex-end": "Right" },
        styleSelector: "#overlay",
        styleProperty: "justify-content"
      },
      position: {
        type: "select",
        default: "top",
        label: "Vertical placement",
        section: "Size & placement",
        options: { top: "top", center: "center", bottom: "bottom" }
      },
      align: {
        type: "select",
        default: "center",
        label: "Text alignment",
        section: "Size & placement",
        options: { left: "left", center: "center", right: "right" }
      },
      padding: {
        type: "number",
        default: 16,
        label: "Padding (px)",
        section: "Size & placement",
        min: 0,
        max: 100,
        step: "any"
      },
      edgePadding: { type: "number", default: 16, optional: true, label: "Viewport edge padding (px)", section: "Size & placement", min: 0, max: 1000, step: "any", styleSelector: "#overlay", styleProperty: "padding", styleUnit: "px" },
      ...byStream.placementFields("#overlay .panel"),
      ...byStream.layoutFields("#overlay .panel", { heading: ["Heading", "#overlay .eyebrow"], result: ["Result", "#overlay .primary"], counter: ["Counter", "#overlay .secondary"], button: ["Button", "#overlay .draw-button"] }, "content", {
        counter: ["showNumber", "yes"],
        button: ["mode", "manual"]
      }),
      ...byStream.textFields(
        {
          heading: ["Heading", "#overlay .eyebrow"],
          result: ["Result", "#overlay .primary"],
          counter: ["Draw counter", "#overlay .secondary"],
          button: ["Draw button", "#overlay .draw-button"]
        },
        { button: ["mode", "manual"], counter: ["showNumber", "yes"] }
      ),
      ...byStream.surfaceFields({ panel: ["Panel", "#overlay .panel", ["border", "shadow"]] }),
      ...byStream.surfaceFields({ button: ["Draw button", "#overlay .draw-button"] }, { button: ["mode", "manual"] }),
      ...byStream.filterFields("panelFilter", "Panel", "#overlay .panel"),
      ...byStream.filterFields("backdropFilter", "Panel backdrop", "#overlay .panel", true)
    }
  };

  // ===== FIELD DEFAULTS =====
  const fieldDefaults = {
    panelBorderWidth: 1,
    panelBorderStyle: "solid",
    panelBorderColor: "#EEEEEE11",
    backdropFilterMode: "none",
    backdropFilterBlur: 12,
    headingFontSize: 16,
    headingTracking: 1.8,
    headingLineHeight: 18,
    resultFontSize: 32,
    resultLineHeight: 38.4,
    counterFontSize: 24,
    counterLineHeight: 27,
    buttonFontSize: 11.2,
    buttonLineHeight: 12,
    buttonRadius: 4,
    buttonBorderWidth: 1
  };
  for (const [name, value] of Object.entries(fieldDefaults)) {
    const field = resource.fields[name];
    field.default = value;
    delete field.styleDefault;
  }
  resource.fields.buttonRadius.zeroIsDefault = true;
  resource.fields.buttonBorderWidth.zeroIsDefault = true;

  /**
   * Accept only this resource's declared content shape and limits; invalid input returns null.
   * @param {string} value Serialized content in this resource's declared format.
   * @returns {Array<unknown>|Object|null}
   */
  function parseEntries(value) {
    if (value.length > 8000) return null;
    try {
      const entries = JSON.parse(value);
      return Array.isArray(entries) && entries.length <= 40 && entries.every((text) => typeof text === "string" && text.length <= 160) ? entries : null;
    } catch {
      return null;
    }
  }

  // ===== OVERLAY INITIALIZATION =====
  const settings = await byStream.initResource(resource);
  if (!byStreamOverlay) return;
  const root = document.getElementById("overlay");
  const panel = root.querySelector(".panel");
  root.style.fontFamily = byFont.family(settings.fontFamily, '"Courier New", Courier, monospace');
  root.style.fontWeight = settings.fontWeight;
  root.style.textAlign = settings.align;
  root.style.alignItems = { top: "flex-start", center: "center", bottom: "flex-end" }[settings.position];
  root.style.opacity = settings.opacity / 100;
  for (const [name, value] of Object.entries({
    text: settings.textColor,
    accent: settings.accentColor,
    background: settings.backgroundColor,
    radius: `${settings.radius}px`,
    padding: `${settings.padding}px`,
    "font-size": `${settings.fontSize}px`
  }))
    root.style.setProperty(`--${name}`, value);
  panel.style.maxWidth = settings.width === 0 ? "none" : `${settings.width}px`;
  /**
   * Create an element, assign its classes and text, and append it to the resource-owned parent.
   * @param {string} tag HTML tag to create.
   * @param {string} className CSS classes assigned to the created element.
   * @param {string|number} [content] Content to validate or display.
   * @param {HTMLElement} [parent=panel] Element that receives the created content.
   * @returns {HTMLElement} The created element, already appended to its parent.
   */
  function element(tag, className, content, parent = panel) {
    const node = document.createElement(tag);
    node.className = className;
    if (content !== undefined) node.textContent = content;
    parent.append(node);
    return node;
  }
  // One scheduler owns updates, stops while hidden, and restores correctly from the back/forward cache.
  if (!settings.entries.length) {
    panel.hidden = true;
    return;
  }
  element("p", "eyebrow", settings.label);
  const display = element("p", "primary");
  const number = element("p", "secondary");
  const changeContent = byStream.changeItems(panel, settings, "result", () => [display, number]);
  number.hidden = settings.showNumber === "no";
  const start = settings.useStartTime === "yes" ? Date.parse(settings.startTime) : Date.now();
  let round = settings.round,
    last = -1;
  /**
   * Derive the current seeded draw and update its label only when the draw number changes.
   * @returns {void}
   */
  function update() {
    const draw = settings.mode === "automatic" ? settings.round + Math.max(0, Math.floor((Date.now() - start) / (settings.duration * 1000))) : round;
    if (draw === last) return;
    last = draw;
    // Mix the seed with the draw number so reloads reproduce the same result without replaying earlier draws.
    let state = (settings.seed ^ Math.imul(draw + 1, 0x9e3779b1)) >>> 0;
    state = Math.imul(state ^ (state >>> 16), 0x85ebca6b);
    state = Math.imul(state ^ (state >>> 13), 0xc2b2ae35);
    state = (state ^ (state >>> 16)) >>> 0;
    changeContent(() => {
      display.textContent = settings.entries[state % settings.entries.length];
      number.textContent = `${settings.counterLabel} ${draw + 1}`;
    });
  }
  if (settings.mode === "manual") {
    const button = element("button", "draw-button", settings.buttonLabel);
    button.type = "button";
    const draw = () => {
      round = (round + 1) % 1000001;
      settings.round = round;
      history.replaceState(null, "", byStream.settingsURL(resource, settings));
      update();
    };
    button.addEventListener("click", draw);
    window.addEventListener("keydown", (event) => {
      if (event.code === "Space" && event.target !== button) {
        event.preventDefault();
        draw();
      }
    });
    update();
  } else byStream.watch(update);
});
