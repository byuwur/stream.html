// Credits Roll: validated URL settings and an native renderer with shared URL setup.
document.addEventListener("DOMContentLoaded", async () => {
  await byStream.assetsReady;
  // ===== RESOURCE DEFINITION =====

  // Defaults, URL constraints, and the field metadata consumed by the optional editor.
  const resource = {
    version: "1.4",
    title: "Credits Roll",
    description: "Scrolling credits for your community.",
    preview: [960, 540],
    urlRequired: ["entries"],
    presets: true,
    sectionOrder: ["General", "Credits roll", "Appearance"],
    sectionIcons: { "Credits roll": "fa-solid fa-scroll" },
    elements: {
      overlay: { label: "Appearance", selector: "#overlay .panel" },
      roll: { label: "Credits roll", motionLabel: "credit line", selector: "#overlay .credits-roll", gap: true, fields: ["speed", "loop", "rollDirection", "rollDelay"] },
      title: { label: "Opening title", selector: "#overlay .credits-title", parent: "roll" },
      category: { label: "Category", selector: "#overlay .credits-category", parent: "roll", fields: ["categoryGap"] },
      name: { label: "Name", selector: "#overlay .credit-name", parent: "roll" },
      closing: { label: "Closing line", selector: "#overlay .credits-closing", parent: "roll" }
    },
    fields: {
      entries: {
        type: "entries",
        default: [
          {
            category: "Good company",
            name: "You, on the other side\nEverybody who made this possible"
          },
          {
            category: "Keeping it kind",
            name: "Our moderators"
          },
          {
            category: "Made with love",
            name: "BONYUR / byUwUr"
          }
        ],
        label: "Credits",
        section: "Content & behavior",
        validate: parseEntries,
        maxlength: 8000,
        entries: {
          textFields: [
            ["category", "Category", "textarea"],
            ["name", "Name", "textarea"]
          ],
          newEntry: { category: "", name: "" },
          limit: 40
        },
        addLabel: "Add entry"
      },
      title: {
        type: "textarea",
        default: "GRACIAS POR ESTAR",
        label: "Opening title",
        section: "Content & behavior",
        maxlength: 160
      },
      closing: {
        type: "textarea",
        default: "Simple is complicated enough.",
        label: "Closing line",
        section: "Content & behavior",
        maxlength: 160
      },
      speed: {
        type: "number",
        default: 16,
        label: "Scroll speed (px / second)",
        section: "Content & behavior",
        min: 5,
        max: 150,
        step: "any"
      },
      loop: {
        type: "switch",
        default: "yes",
        label: "Loop",
        section: "Content & behavior",
        checkedValue: "yes",
        uncheckedValue: "no",
        options: { yes: "yes", no: "no" }
      },
      rollDirection: { type: "select", default: "normal", label: "Roll direction", section: "Content & behavior", options: { normal: "Up", reverse: "Down" } },
      rollDelay: {
        type: "number",
        default: 0,
        optional: true,
        label: "Roll delay (s)",
        section: "Content & behavior",
        min: 0,
        max: 3600,
        step: "any"
      },
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
        default: "400",
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
        default: "#00000000",
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
        default: 8,
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
      align: {
        type: "select",
        default: "center",
        label: "Text alignment",
        section: "Size & placement",
        options: { left: "left", center: "center", right: "right" }
      },
      padding: {
        type: "number",
        default: 0,
        label: "Padding (px)",
        section: "Size & placement",
        min: 0,
        max: 100,
        step: "any"
      },
      edgePadding: { type: "number", default: 16, optional: true, label: "Viewport edge padding (px)", section: "Size & placement", min: 0, max: 1000, step: "any", styleSelector: "#overlay", styleProperty: "padding", styleUnit: "px" },
      viewportHeight: {
        type: "number",
        default: 0,
        optional: true,
        label: "Roll viewport height (px)",
        description: "0 fills the available height.",
        section: "Size & placement",
        min: 0,
        max: 10000,
        step: "any",
        styleSelector: "#overlay .credits-window",
        styleProperty: "height",
        styleValue: (settings) => (settings.viewportHeight === 0 ? "100%" : `${settings.viewportHeight}px`)
      },
      ...byStream.placementFields("#overlay .panel"),
      spacing: {
        type: "number",
        default: 16,
        label: "Name spacing (px)",
        section: "Composition",
        min: 0,
        max: 100,
        step: "any"
      },
      categoryGap: {
        type: "number",
        default: 64,
        label: "Category spacing (px)",
        section: "Composition",
        min: 0,
        max: 200,
        step: "any"
      },
      titleGap: {
        type: "number",
        default: 128,
        optional: true,
        label: "Space below title (px)",
        section: "Composition",
        min: -1000,
        max: 1000,
        step: "any",
        styleSelector: "#overlay .credits-title",
        styleProperty: "margin-bottom",
        styleUnit: "px"
      },
      closingGap: {
        type: "number",
        default: 128,
        optional: true,
        label: "Space above closing (px)",
        section: "Composition",
        min: -1000,
        max: 1000,
        step: "any",
        styleSelector: "#overlay .credits-closing",
        styleProperty: "margin-top",
        styleUnit: "px"
      },
      ...byStream.fadeFields("edgeFade", "Roll edge fade", "#overlay .credits-window", "vertical"),
      ...byStream.textFields({
        title: ["Title", "#overlay .credits-title"],
        category: ["Category", "#overlay .credits-category"],
        name: ["Name", "#overlay .credit-name"],
        closing: ["Closing message", "#overlay .credits-closing"]
      }),
      ...byStream.surfaceFields({ panel: ["Panel", "#overlay .panel", ["border", "shadow"]] }),
      ...byStream.filterFields("panelFilter", "Panel", "#overlay .panel"),
      ...byStream.filterFields("backdropFilter", "Panel backdrop", "#overlay .panel", true)
    },
    constants: {
      position: "center"
    }
  };

  // ===== FIELD DEFAULTS =====
  const fieldDefaults = {
    titleFontSize: 32,
    categoryFontSize: 16,
    nameFontSize: 24,
    closingFontSize: 24,
    edgeFadeMode: "custom",
    edgeFadeStart: 25,
    edgeFadeEnd: 25,
    titleTracking: 2.72,
    titleLineHeight: 37,
    categoryTracking: 0.72,
    categoryLineHeight: 18,
    nameLineHeight: 27,
    closingLineHeight: 27
  };
  for (const [name, value] of Object.entries(fieldDefaults)) {
    const field = resource.fields[name];
    field.default = value;
    delete field.styleDefault;
  }
  resource.fields.titleTracking.zeroIsDefault = true;
  resource.fields.categoryTracking.zeroIsDefault = true;

  /**
   * Accept only this resource's declared content shape and limits; invalid input returns null.
   * @param {string} value Serialized content in this resource's declared format.
   * @returns {Array<unknown>|Object|null}
   */
  function parseEntries(value) {
    if (value.length > 8000) return null;
    try {
      const keys = ["category", "name"];
      const entries = JSON.parse(value);
      if (!Array.isArray(entries) || entries.length > 40 || !entries.every((e) => e && keys.every((k) => typeof e[k] === "string" && e[k].length <= 160))) return null;
      return entries;
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

  panel.classList.add("credits-window");
  const roll = element("div", "credits-roll");
  const group = element("div", "credits-group", undefined, roll);
  element("h1", "credits-title", settings.title, group);
  let category = null;
  for (const entry of settings.entries) {
    if (entry.category !== category) {
      category = entry.category;
      const heading = element("h2", "eyebrow credits-category", category, group);
      heading.style.marginTop = `${settings.categoryGap}px`;
    }
    const name = element("p", "credit-name", entry.name, group);
    name.style.marginBottom = `${settings.spacing}px`;
  }
  element("p", "secondary credits-closing", settings.closing, group);
  if (settings.animate !== "yes") return;
  const loop = settings.loop === "yes";
  const down = settings.rollDirection === "reverse";
  roll.classList.toggle("credits-loop", loop);
  roll.style.setProperty("--roll-delay", `${settings.rollDelay}s`);

  const measureItems = byStream.scrollItems(panel, roll, settings, "roll", false, down);
  // Keep speed in pixels per second when font loading or the viewport changes the roll distance.
  const resize = () => {
    roll.querySelectorAll(".credits-group[aria-hidden]").forEach((copy) => copy.remove());
    const height = parseFloat(getComputedStyle(group).height);
    if (!height) return;
    const viewportHeight = panel.clientHeight;
    if (loop) {
      roll.style.setProperty("--group-height", height + "px");
      const copies = Math.ceil(viewportHeight / height);
      for (let i = 0; i < copies; i++) {
        const copy = group.cloneNode(true);
        copy.setAttribute("aria-hidden", "true");
        copy.style.setProperty("--copy", (i + 1) * (down ? -1 : 1));
        if (down) roll.prepend(copy);
        else roll.append(copy);
      }
    }
    const top = roll.offsetTop + group.offsetTop;
    const above = -height - top;
    const below = viewportHeight - top;
    const entry = down ? above : below;
    const exit = down ? below : above;
    // The first pass fills the viewport before the repeating segment starts.
    const start = loop ? exit + (down ? -height : height) : entry;
    roll.style.setProperty("--start", `${start}px`);
    roll.style.setProperty("--end", `${exit}px`);
    roll.style.setProperty("--roll-duration", `${(loop ? height : viewportHeight + height) / settings.speed}s`);
    if (loop) {
      const entryDuration = viewportHeight / settings.speed;
      roll.style.setProperty("--entry", `${entry}px`);
      roll.style.setProperty("--entry-duration", `${entryDuration}s`);
      roll.style.setProperty("--loop-delay", `${settings.rollDelay + entryDuration}s`);
    }
    measureItems();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(panel);
  observer.observe(group);
  document.fonts.ready.then(resize);
  window.addEventListener("pagehide", () => observer.disconnect());
  window.addEventListener("pageshow", () => {
    observer.observe(panel);
    observer.observe(group);
  });
});
