// Keyboard Shortcut Sheet: validated URL settings and an native renderer with shared URL setup.
document.addEventListener("DOMContentLoaded", async () => {
  // ==========
  // ==== RESOURCE DEFINITION ====
  // ==========

  // Defaults, URL constraints, and the field metadata consumed by the optional editor.
  const resource = {
    version: "1.0",
    title: "Keyboard Shortcut Sheet",
    description: "Keep the controls in sight. An editable guide, without keyboard monitoring.",
    preview: [960, 540],
    urlRequired: ["entries"],
    presets: true,
    fields: {
      entries: {
        type: "entries",
        default: {
          "W + A + S + D": "Move",
          Space: "Jump",
          Shift: "Sprint",
          E: "Interact"
        },
        label: "Shortcuts",
        section: "Content & behavior",
        validate: parseEntries,
        maxlength: 8000,
        entries: {
          textFields: [
            ["keys", "Keys (separate with +)"],
            ["text", "Action"]
          ],
          newEntry: ["", ""],
          limit: 40
        },
        addLabel: "Add entry"
      },
      title: {
        type: "text",
        default: "A FEW GOOD BUTTONS",
        label: "Heading",
        section: "Content & behavior",
        maxlength: 160
      },
      keyboard: {
        type: "switch",
        default: "no",
        label: "Show visual keyboard",
        section: "Content & behavior",
        checkedValue: "yes",
        uncheckedValue: "no",
        options: { yes: "yes", no: "no" }
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
        default: 24,
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
        default: "#11111199",
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
        description: "0 = Auto (no fixed maximum).",
        section: "Size & placement",
        min: 0,
        max: 3840,
        step: "any"
      },
      horizontalPlacement: {
        type: "select",
        default: "flex-start",
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
        default: 16,
        label: "Padding (px)",
        section: "Size & placement",
        min: 0,
        max: 100,
        step: "any"
      },
      edgePadding: { type: "number", default: 16, optional: true, label: "Viewport edge padding (px)", section: "Size & placement", min: 0, max: 1000, step: "any", styleSelector: "#overlay", styleProperty: "padding", styleUnit: "px" },
      listHeight: {
        type: "number",
        default: 0,
        optional: true,
        label: "Maximum shortcut list height (px)",
        description: "0 = Auto (no fixed maximum).",
        section: "Size & placement",
        min: 0,
        max: 10000,
        step: "any",
        styleSelector: "#overlay .shortcut-list",
        styleProperty: "max-height",
        styleUnit: "px"
      },
      ...byStream.placementFields("#overlay .panel"),
      columns: { type: "number", default: 0, label: "Shortcut columns", description: "0 automatically fits columns to the shortcuts and available width.", section: "Composition", min: 0, max: 4, step: 1 },
      spacing: {
        type: "number",
        default: 16,
        label: "Row spacing (px)",
        section: "Composition",
        min: 0,
        max: 40,
        step: "any"
      },
      keyGap: {
        type: "number",
        default: 4,
        optional: true,
        label: "Key gap (px)",
        section: "Composition",
        min: 0,
        max: 1000,
        step: "any",
        styleSelector: "#overlay .shortcut-keys, #overlay .keyboard-row",
        styleProperty: "gap",
        styleUnit: "px"
      },
      keyboardGap: {
        type: "number",
        default: 0,
        optional: true,
        label: "Keyboard row gap (px)",
        section: "Composition",
        when: ["keyboard", "yes"],
        min: 0,
        max: 1000,
        step: "any",
        styleSelector: "#overlay .visual-keyboard",
        styleProperty: "gap",
        styleUnit: "px"
      },
      keyboardMargin: {
        type: "number",
        default: 0,
        optional: true,
        label: "Space above keyboard (px)",
        section: "Composition",
        when: ["keyboard", "yes"],
        min: -1000,
        max: 1000,
        step: "any",
        styleSelector: "#overlay .visual-keyboard",
        styleProperty: "margin-top",
        styleUnit: "px"
      },
      ...byStream.layoutFields("#overlay .shortcut-row", { keys: ["Keys", "#overlay .shortcut-keys"], description: ["Description", "#overlay .shortcut-description"] }),
      ...byStream.textFields(
        {
          title: ["Title", "#overlay .eyebrow"],
          key: ["Shortcut key", "#overlay .shortcut-key"],
          description: ["Description", "#overlay .shortcut-description"],
          keyboard: ["Keyboard key", "#overlay .keyboard-key:not(.bound)"],
          boundKey: ["Assigned keyboard key", "#overlay .keyboard-key.bound"]
        },
        { keyboard: ["keyboard", "yes"], boundKey: ["keyboard", "yes"] }
      ),
      ...byStream.surfaceFields({ panel: ["Panel", "#overlay .panel", ["border", "shadow"]] }),
      ...byStream.surfaceFields({
        key: ["Shortcut key", "#overlay .shortcut-key"],
        keyboardKey: ["Keyboard key", "#overlay .keyboard-key"],
        boundKey: ["Bound keyboard key", "#overlay .keyboard-key.bound", ["background", "border", "shadow"]]
      }),
      ...byStream.filterFields("panelFilter", "Panel", "#overlay .panel"),
      ...byStream.filterFields("backdropFilter", "Panel backdrop", "#overlay .panel", true)
    }
  };

  const fieldDefaults = {
    descriptionFontSize: 16,
    keyFontSize: 16,
    titleFontSize: 16,
    panelBorderWidth: 1,
    panelBorderStyle: "solid",
    panelBorderColor: "#EEEEEE11",
    panelShadow: "yes",
    panelShadowColor: "#00000066",
    panelShadowBlur: 16,
    panelShadowY: 4,
    backdropFilterMode: "none",
    backdropFilterBlur: 12,
    contentGap: 20,
    titleTracking: 1.92,
    titleLineHeight: 18,
    keyLineHeight: 18,
    descriptionLineHeight: 19.2,
    keyRadius: 5,
    keyboardFontSize: 12,
    keyboardLineHeight: 14,
    boundKeyFontSize: 12,
    boundKeyLineHeight: 14,
    keyboardKeyRadius: 5
  };
  for (const [name, value] of Object.entries(fieldDefaults)) {
    const field = resource.fields[name];
    field.default = value;
    delete field.styleDefault;
  }
  for (const name of ["contentGap", "titleTracking", "keyRadius", "keyboardKeyRadius"]) resource.fields[name].zeroIsDefault = true;

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

  element("h1", "eyebrow", settings.title);
  const list = element("div", "shortcut-list");
  list.style.gridTemplateColumns = settings.columns === 0 ? "repeat(auto-fit, minmax(min(100%, 240px), 1fr))" : `repeat(${settings.columns}, minmax(0, 1fr))`;
  list.style.gap = `${settings.spacing}px`;
  for (const [shortcut, text] of Object.entries(settings.entries)) {
    const row = element("div", "shortcut-row", undefined, list);
    const keys = element("div", "shortcut-keys", undefined, row);
    for (const key of shortcut.split("+").slice(0, 12)) element("kbd", "shortcut-key", key.trim(), keys);
    element("p", "primary shortcut-description", text, row);
  }
  if (settings.keyboard === "yes") {
    const keyboard = element("div", "visual-keyboard");
    const configured = new Set(Object.keys(settings.entries).flatMap((keys) => keys.split("+").map((key) => key.trim().toUpperCase())));
    for (const keys of [["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"], ["A", "S", "D", "F", "G", "H", "J", "K", "L"], ["SHIFT", "Z", "X", "C", "V", "B", "N", "M"], ["SPACE"]]) {
      const row = element("div", "keyboard-row", undefined, keyboard);
      for (const key of keys) {
        const node = element("kbd", "keyboard-key", key, row);
        node.classList.toggle("bound", configured.has(key));
      }
    }
  }
});
