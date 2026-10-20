/** Credits Roll: validated URL settings and an native renderer with shared URL setup. */
document.addEventListener("DOMContentLoaded", async () => {
  // ==========
  // ==== RESOURCE DEFINITION ====
  // ==========

  /** Defaults, URL constraints, and the field metadata consumed by the optional editor. */
  const resource = {
    version: "1.0",
    title: "Credits Roll",
    description: "Give your people a proper send-off. Closing credits, made yours.",
    preview: [960, 540],
    urlRequired: ["entries"],
    presets: true,
    fields: {
      entries: {
        type: "entries",
        default: [
          { category: "Made possible by", name: "Our community" },
          { category: "Made possible by", name: "You, watching right now" },
          { category: "Special thanks", name: "The moderators" }
        ],
        label: "Credits",
        section: "Content & behavior",
        validate: parseEntries,
        maxlength: 8000,
        entries: {
          textFields: [
            ["category", "Category"],
            ["name", "Name"]
          ],
          newEntry: { category: "", name: "" },
          limit: 40
        },
        addLabel: "Add entry"
      },
      title: {
        type: "text",
        default: "THANK YOU",
        label: "Opening title",
        section: "Content & behavior",
        maxlength: 160
      },
      closing: {
        type: "text",
        default: "See you next time.",
        label: "Closing line",
        section: "Content & behavior",
        maxlength: 160
      },
      speed: {
        type: "number",
        default: 35,
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
      rollDirection: { type: "select", default: "normal", label: "Roll direction", section: "Content & behavior", options: { normal: "Up", reverse: "Down" }, styleSelector: "#overlay .credits-roll", styleProperty: "animation-direction" },
      rollDelay: {
        type: "number",
        default: "",
        optional: true,
        label: "Roll delay (s)",
        section: "Content & behavior",
        min: 0,
        max: 3600,
        step: "any",
        styleSelector: "#overlay .credits-roll",
        styleProperty: "animation-delay",
        styleUnit: "s"
      },
      fontFamily: {
        type: "font",
        default: "Courier New",
        label: "Font family",
        section: "Appearance",
        description: "Search Google Fonts or use an installed font. Online fonts need internet; system fonts provide a fallback.",
        maxlength: 100
      },
      fontSize: {
        type: "number",
        default: 42,
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
        default: "#FFFFFF",
        label: "Base text color",
        section: "Appearance",
        maxlength: 80
      },
      accentColor: {
        type: "color",
        default: "#D9D9D9",
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
        default: 800,
        label: "Maximum width (px)",
        section: "Size & placement",
        min: 100,
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
        default: 28,
        label: "Padding (px)",
        section: "Size & placement",
        min: 0,
        max: 100,
        step: "any"
      },
      edgePadding: { type: "number", default: "", optional: true, label: "Viewport edge padding (px)", section: "Size & placement", min: 0, max: 1000, step: "any", styleSelector: "#overlay", styleProperty: "padding", styleUnit: "px" },
      viewportHeight: {
        type: "number",
        default: "",
        optional: true,
        label: "Roll viewport height (px)",
        section: "Size & placement",
        min: 0,
        max: 10000,
        step: "any",
        styleSelector: "#overlay .credits-window",
        styleProperty: "height",
        styleUnit: "px"
      },
      ...byStream.placementFields("#overlay .panel"),
      spacing: {
        type: "number",
        default: 12,
        label: "Name spacing (px)",
        section: "Composition",
        min: 0,
        max: 100,
        step: "any"
      },
      categoryGap: {
        type: "number",
        default: 52,
        label: "Category spacing (px)",
        section: "Composition",
        min: 0,
        max: 200,
        step: "any"
      },
      titleGap: {
        type: "number",
        default: "",
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
        default: "",
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
  panel.style.maxWidth = `${settings.width}px`;
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
  element("h1", "credits-title", settings.title, roll);
  let category = null;
  for (const entry of settings.entries) {
    if (entry.category !== category) {
      category = entry.category;
      const heading = element("h2", "eyebrow credits-category", category, roll);
      heading.style.marginTop = `${settings.categoryGap}px`;
    }
    const name = element("p", "credit-name", entry.name, roll);
    name.style.marginBottom = `${settings.spacing}px`;
  }
  element("p", "secondary credits-closing", settings.closing, roll);
  const resize = () => {
    const distance = panel.clientHeight + roll.scrollHeight;
    roll.style.setProperty("--end", `${-roll.scrollHeight}px`);
    roll.style.setProperty("--start", `${panel.clientHeight}px`);
    roll.style.animationDuration = `${distance / settings.speed}s`;
    roll.style.animationIterationCount = settings.loop === "yes" ? "infinite" : "1";
  };
  const observer = new ResizeObserver(resize);
  observer.observe(panel);
  observer.observe(roll);
  document.fonts.ready.then(resize);
  window.addEventListener("pagehide", () => observer.disconnect());
  window.addEventListener("pageshow", () => {
    observer.observe(panel);
    observer.observe(roll);
  });
});
