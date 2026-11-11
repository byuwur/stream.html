// Quote Display: validated URL settings and an native renderer with shared URL setup.
document.addEventListener("DOMContentLoaded", async () => {
  // ==========
  // ==== RESOURCE DEFINITION ====
  // ==========

  // Defaults, URL constraints, and the field metadata consumed by the optional editor.
  const resource = {
    version: "1.1",
    title: "Quote Display",
    description: "A thought, a tip, a little trivia. Keep the good words coming.",
    preview: [960, 540],
    urlRequired: ["entries"],
    presets: true,
    fields: {
      entries: {
        type: "entries",
        default: {
          "Simple is complicated enough.": "BONYUR",
          "Un ratito más.": "@byUwUr"
        },
        label: "Quotes and tips",
        section: "Content & behavior",
        validate: parseEntries,
        maxlength: 8000,
        entries: {
          textFields: [
            ["quote", "Quotation / tip"],
            ["author", "Author / attribution"]
          ],
          newEntry: ["", ""],
          limit: 40
        },
        addLabel: "Add entry"
      },
      heading: {
        type: "text",
        default: "A LITTLE PERSPECTIVE",
        label: "Heading",
        section: "Content & behavior",
        maxlength: 160
      },
      duration: {
        type: "number",
        default: 5,
        label: "Seconds per entry",
        section: "Content & behavior",
        min: 1,
        max: 3600,
        step: "any"
      },
      transition: {
        type: "select",
        default: "slide",
        label: "Transition",
        section: "Content & behavior",
        options: { fade: "fade", slide: "slide", none: "none" }
      },
      marks: {
        type: "switch",
        default: "yes",
        label: "Decorative quote marks",
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
      ...byStream.placementFields("#overlay .panel"),
      ...byStream.whenFields(["marks", "yes"], byStream.insetFields("quoteMarkInset", "Quote mark position", "#overlay .quote-text::before")),
      quoteIndent: {
        type: "number",
        default: 35.2,
        zeroIsDefault: true,
        optional: true,
        label: "Quote indent (px)",
        section: "Composition",
        when: ["marks", "yes"],
        min: 0,
        max: 1000,
        step: "any",
        styleSelector: "#overlay .quote-text",
        styleProperty: "padding-left",
        styleUnit: "px"
      },
      ...byStream.layoutFields("#overlay .panel", { heading: ["Heading", "#overlay .eyebrow"], quote: ["Quote", "#overlay .quote-text"], author: ["Author", "#overlay .secondary"] }),
      ...byStream.transitionFields("transition"),
      ...byStream.textFields(
        {
          heading: ["Heading", "#overlay .eyebrow"],
          quote: ["Quotation", "#overlay .quote-text"],
          author: ["Author", "#overlay .secondary"],
          quoteMark: ["Quotation mark", "#overlay .quote-text::before"]
        },
        { quoteMark: ["marks", "yes"] }
      ),
      ...byStream.surfaceFields({ panel: ["Panel", "#overlay .panel", ["border", "shadow"]] }),
      ...byStream.filterFields("panelFilter", "Panel", "#overlay .panel"),
      ...byStream.filterFields("backdropFilter", "Panel backdrop", "#overlay .panel", true)
    }
  };

  const fieldDefaults = {
    panelBorderWidth: 1,
    panelBorderStyle: "solid",
    panelBorderColor: "#EEEEEE1A",
    panelShadow: "yes",
    panelShadowColor: "#00000066",
    panelShadowBlur: 16,
    panelShadowY: 4,
    backdropFilterMode: "none",
    backdropFilterBlur: 12,
    headingFontSize: 16,
    headingTracking: 1.8,
    authorFontSize: 16,
    quoteMarkInsetTop: -24,
    quoteMarkInsetLeft: -4,
    transitionDuration: 500,
    transitionEasing: "ease",
    slideDistance: 32,
    quoteMarkFontSize: 64,
    headingLineHeight: 18,
    quoteFontSize: 32,
    quoteLineHeight: 41.6,
    authorLineHeight: 18,
    quoteMarkLineHeight: 83.2
  };
  for (const [name, value] of Object.entries(fieldDefaults)) {
    const field = resource.fields[name];
    field.default = value;
    delete field.styleDefault;
  }

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
  // One scheduler owns updates, stops while hidden, and restores correctly from the back/forward cache.
  const entries = Object.entries(settings.entries);
  if (!entries.length) {
    panel.hidden = true;
    return;
  }
  const changeContent = byStream.contentTransition(panel, settings);
  let previous = -1;
  /**
   * Display the next entry and apply the configured transition to the resource-owned elements.
   * @param {number} index Zero-based item index.
   * @param {unknown} render Render.
   * @returns {void}
   */
  function change(index, render) {
    if (index === previous) return;
    previous = index;
    changeContent(() => {
      panel.replaceChildren();
      render(entries[index]);
    });
  }
  root.dataset.marks = settings.marks;
  /**
   * Select the wall-clock quote slot; unchanged entries keep their existing DOM and animation.
   * @returns {void}
   */
  function update() {
    change(Math.floor(Date.now() / (settings.duration * 1000)) % entries.length, ([quote, author]) => {
      element("p", "eyebrow", settings.heading);
      element("blockquote", "quote-text", quote);
      element("p", "secondary", author);
    });
  }
  byStream.watch(update);
});
