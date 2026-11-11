// Sponsor Carousel: validated URL settings and an native renderer with shared URL setup.
document.addEventListener("DOMContentLoaded", async () => {
  // ==========
  // ==== RESOURCE DEFINITION ====
  // ==========

  // Defaults, URL constraints, and the field metadata consumed by the optional editor.
  const resource = {
    version: "1.0",
    title: "Sponsor Carousel",
    description: "Spotlight public logos and messages, one partner at a time.",
    preview: [960, 540],
    urlRequired: ["entries"],
    presets: true,
    fields: {
      entries: {
        type: "entries",
        default: [
          {
            name: "BONYUR",
            text: "Good games. Better company.",
            imageUrl: "https://byuwur.github.io/img/logo.png"
          },
          {
            name: "YOUR PARTNER",
            text: "A little space for your people.",
            imageUrl: ""
          }
        ],
        label: "Partner cards",
        section: "Content & behavior",
        validate: parseEntries,
        maxlength: 8000,
        entries: {
          textFields: [
            ["name", "Name"],
            ["text", "Message"],
            ["imageUrl", "Public image URL"]
          ],
          newEntry: { name: "", text: "", imageUrl: "" },
          limit: 40
        },
        addLabel: "Add entry"
      },
      heading: {
        type: "text",
        default: "Brought to you by:",
        label: "Heading",
        section: "Content & behavior",
        maxlength: 160
      },
      duration: {
        type: "number",
        default: 3,
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
        default: 6,
        label: "Corner radius (px)",
        section: "Appearance",
        min: 0,
        max: 100,
        step: "any"
      },
      width: {
        type: "number",
        default: 600,
        label: "Maximum width (px)",
        description: "0 = Auto (no fixed maximum).",
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
        default: "center",
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
        default: 12,
        label: "Padding (px)",
        section: "Size & placement",
        min: 0,
        max: 100,
        step: "any"
      },
      edgePadding: { type: "number", default: 16, optional: true, label: "Viewport edge padding (px)", section: "Size & placement", min: 0, max: 1000, step: "any", styleSelector: "#overlay", styleProperty: "padding", styleUnit: "px" },
      ...byStream.placementFields("#overlay .panel"),
      imageGap: {
        type: "number",
        default: 0,
        optional: true,
        label: "Space below image (px)",
        section: "Composition",
        min: -1000,
        max: 1000,
        step: "any",
        styleSelector: "#overlay .sponsor-image",
        styleProperty: "margin-bottom",
        styleUnit: "px"
      },
      ...byStream.layoutFields("#overlay .panel", { heading: ["Heading", "#overlay .eyebrow"], image: ["Image", "#overlay .sponsor-image"], name: ["Name", "#overlay .primary"], message: ["Message", "#overlay .secondary"] }),
      imageHeight: {
        type: "number",
        default: 96,
        label: "Maximum logo height (px)",
        description: "0 = Auto (no fixed maximum).",
        section: "Details",
        subsection: "Sponsor image",
        min: 0,
        max: 400,
        step: "any"
      },
      imageWidth: {
        type: "number",
        default: 0,
        optional: true,
        label: "Image width (px)",
        description: "0 = Auto (preserve the image proportions).",
        section: "Details",
        subsection: "Sponsor image",
        min: 0,
        max: 1000,
        step: "any",
        styleSelector: "#overlay .sponsor-image",
        styleProperty: "width",
        styleValue: (settings) => (settings.imageWidth === 0 ? "auto" : `${settings.imageWidth}px`)
      },
      fit: {
        type: "select",
        default: "contain",
        label: "Image presentation",
        section: "Details",
        subsection: "Sponsor image",
        options: { contain: "contain", cover: "cover" }
      },
      imageOpacity: {
        type: "number",
        default: 100,
        optional: true,
        label: "Image opacity (%)",
        section: "Details",
        subsection: "Sponsor image",
        min: 0,
        max: 100,
        step: "any",
        styleSelector: "#overlay .sponsor-image",
        styleProperty: "opacity",
        styleUnit: "%"
      },
      ...byStream.transitionFields("transition"),
      ...byStream.textFields({
        heading: ["Heading", "#overlay .eyebrow"],
        name: ["Sponsor name", "#overlay .primary"],
        message: ["Message", "#overlay .secondary"]
      }),
      ...byStream.surfaceFields({ panel: ["Panel", "#overlay .panel", ["border", "shadow"]] }),
      ...byStream.surfaceFields({ image: ["Sponsor image", "#overlay .sponsor-image", ["border", "radius", "shadow"]] }),
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
    messageFontSize: 24,
    transitionDuration: 500,
    transitionEasing: "ease",
    slideDistance: 32,
    nameFontSize: 32,
    headingLineHeight: 18,
    nameLineHeight: 38.4,
    messageLineHeight: 27
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
      const keys = ["name", "text", "imageUrl"];
      if (!Array.isArray(entries) || entries.length > 40 || !entries.every((e) => e && keys.every((k) => typeof e[k] === "string" && e[k].length <= 160) && byStream.safeImage(e.imageUrl))) return null;
      return entries.map((e) => Object.fromEntries(keys.map((k) => [k, e[k]])));
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
  if (!settings.entries.length) {
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
      render(settings.entries[index]);
    });
  }
  /**
   * Select the wall-clock sponsor slot and render it only when the index changes.
   * @returns {void}
   */
  function update() {
    change(Math.floor(Date.now() / (settings.duration * 1000)) % settings.entries.length, (e) => {
      element("p", "eyebrow", settings.heading);
      if (e.imageUrl) {
        const image = element("img", "sponsor-image");
        image.src = e.imageUrl;
        image.alt = e.name;
        image.style.maxHeight = settings.imageHeight === 0 ? "none" : `${settings.imageHeight}px`;
        image.style.objectFit = settings.fit;
        image.addEventListener("error", () => image.remove());
      }
      element("h1", "primary", e.name);
      element("p", "secondary", e.text);
    });
  }
  byStream.watch(update);
});
