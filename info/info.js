/** Info Board: validated URL settings and an native renderer with shared URL setup. */
document.addEventListener("DOMContentLoaded", async () => {
  // ==========
  // ==== RESOURCE DEFINITION ====
  // ==========

  /** Defaults, URL constraints, and the field metadata consumed by the optional editor. */
  const resource = {
    version: "1.0",
    title: "Info Board",
    description: "Stream rules, game settings, commands, and the details worth keeping on screen.",
    preview: [960, 540],
    urlRequired: ["entries"],
    presets: true,
    fields: {
      entries: {
        type: "entries",
        default: { "THE PLAN": "Good games. No rush.", "CHAT RULES": "Be kind. Respect the people here.", COMMANDS: "!socials · !schedule · !help", "GAME SETTINGS": "Difficulty: one more try." },
        label: "Information",
        section: "Content & behavior",
        validate: parseEntries,
        maxlength: 8000,
        entries: {
          textFields: [
            ["heading", "Heading"],
            ["text", "Information"]
          ],
          newEntry: ["", ""],
          limit: 40
        },
        addLabel: "Add entry"
      },
      title: {
        type: "text",
        default: "GOOD TO KNOW",
        label: "Board title",
        section: "Content & behavior",
        maxlength: 160
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
        default: "#202020E6",
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
        default: 900,
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
      position: {
        type: "select",
        default: "center",
        label: "Vertical placement",
        section: "Size & placement",
        options: { top: "top", center: "center", bottom: "bottom" }
      },
      align: {
        type: "select",
        default: "left",
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
      boardHeight: {
        type: "number",
        default: "",
        optional: true,
        label: "Maximum board height (px)",
        section: "Size & placement",
        min: 0,
        max: 10000,
        step: "any",
        styleSelector: "#overlay .info-board",
        styleProperty: "max-height",
        styleUnit: "px"
      },
      ...byStream.placementFields("#overlay .panel"),
      layout: {
        type: "select",
        default: "grid",
        label: "Layout",
        section: "Composition",
        options: { grid: "grid", list: "list" }
      },
      columns: {
        type: "number",
        default: 2,
        label: "Grid columns",
        section: "Composition",
        when: ["layout", "grid"],
        min: 1,
        max: 4,
        step: 1
      },
      spacing: {
        type: "number",
        default: 18,
        label: "Card spacing (px)",
        section: "Composition",
        min: 0,
        max: 60,
        step: "any"
      },
      ...byStream.layoutFields("#overlay .panel", { heading: ["Title", "#overlay .eyebrow"], board: ["Cards", "#overlay .info-board"] }),
      ...byStream.layoutFields("#overlay .info-card", { cardHeading: ["Card heading", "#overlay .info-heading"], cardText: ["Card text", "#overlay .info-card .primary"] }, "card"),
      ...byStream.textFields({
        title: ["Title", "#overlay .eyebrow"],
        cardHeading: ["Card heading", "#overlay .info-heading"],
        cardText: ["Card text", "#overlay .info-card .primary"]
      }),
      ...byStream.surfaceFields({ panel: ["Panel", "#overlay .panel", ["border", "shadow"]] }),
      ...byStream.surfaceFields({ card: ["Info card", "#overlay .info-card"] }),
      ...byStream.filterFields("panelFilter", "Panel", "#overlay .panel"),
      ...byStream.filterFields("backdropFilter", "Panel backdrop", "#overlay .panel", true)
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
      const entries = JSON.parse(value);
      return entries && typeof entries === "object" && !Array.isArray(entries) && Object.keys(entries).length <= 40 && Object.entries(entries).every(([key, text]) => key.length <= 160 && typeof text === "string" && text.length <= 160)
        ? entries
        : null;
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

  element("h1", "eyebrow", settings.title);
  const board = element("div", "info-board");
  board.style.setProperty("--columns", settings.layout === "list" ? 1 : settings.columns);
  board.style.gap = `${settings.spacing}px`;
  for (const [heading, text] of Object.entries(settings.entries)) {
    const card = element("section", "info-card", undefined, board);
    element("h2", "info-heading", heading, card);
    element("p", "primary", text, card);
  }
});
