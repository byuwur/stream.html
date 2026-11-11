// Lower Thirds: validated URL settings and an native renderer with shared URL setup.
document.addEventListener("DOMContentLoaded", async () => {
  // ==========
  // ==== RESOURCE DEFINITION ====
  // ==========

  // Defaults, URL constraints, and the field metadata consumed by the optional editor.
  const resource = {
    version: "1.0",
    title: "Lower Thirds",
    description: "Introduce a guest, a game, or a moment with a broadcast card.",
    preview: [960, 540],
    urlRequired: ["entries"],
    presets: true,
    fields: {
      entries: {
        type: "entries",
        default: [
          {
            name: "BONYUR",
            subtitle: "Good games. Better company.",
            icon: "✦",
            imageUrl: "https://byuwur.github.io/img/logo.png"
          },
          {
            name: "Mateus / byUwUr",
            subtitle: "Un ratito más.",
            icon: "↗",
            imageUrl: ""
          }
        ],
        label: "Ordered cards",
        section: "Content & behavior",
        validate: parseEntries,
        maxlength: 8000,
        entries: {
          textFields: [
            ["name", "Name"],
            ["subtitle", "Subtitle"],
            ["icon", "Unicode icon"],
            ["imageUrl", "Public image URL"]
          ],
          newEntry: { name: "", subtitle: "", icon: "", imageUrl: "" },
          limit: 40
        },
        addLabel: "Add entry"
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
      gap: {
        type: "number",
        default: 1,
        label: "Hidden gap (seconds)",
        section: "Content & behavior",
        min: 0,
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
        description: "0 = Auto (no fixed maximum).",
        section: "Size & placement",
        min: 0,
        max: 3840,
        step: "any"
      },
      placement: {
        type: "select",
        default: "left",
        label: "Horizontal placement",
        section: "Size & placement",
        options: { left: "left", center: "center", right: "right" }
      },
      position: {
        type: "select",
        default: "bottom",
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
        default: 8,
        label: "Padding (px)",
        section: "Size & placement",
        min: 0,
        max: 100,
        step: "any"
      },
      edgePadding: { type: "number", default: 16, optional: true, label: "Viewport edge padding (px)", section: "Size & placement", min: 0, max: 1000, step: "any", styleSelector: "#overlay", styleProperty: "padding", styleUnit: "px" },
      ...byStream.placementFields("#overlay .panel"),
      ...byStream.layoutFields("#overlay .lower-card", { image: ["Image", "#overlay .lower-image"], icon: ["Icon", "#overlay .lower-icon"], copy: ["Text", "#overlay .lower-copy"] }),
      ...byStream.layoutFields("#overlay .lower-copy", { name: ["Name", "#overlay .lower-copy .primary"], subtitle: ["Subtitle", "#overlay .lower-copy .secondary"] }, "copy"),
      imageSize: {
        type: "number",
        default: 51.2,
        optional: true,
        label: "Image size (px)",
        description: "0 = Auto (preserve the image proportions).",
        section: "Details",
        subsection: "Image",
        min: 0,
        max: 1000,
        step: "any",
        styleSelector: "#overlay .lower-image",
        styleProperty: "--image-size",
        styleValue: (settings) => (settings.imageSize === 0 ? "auto" : `${settings.imageSize}px`)
      },
      imageFit: {
        type: "select",
        default: "contain",
        label: "Image fit",
        section: "Details",
        subsection: "Image",
        options: { contain: "Contain", cover: "Cover", fill: "Stretch" },
        styleSelector: "#overlay .lower-image",
        styleProperty: "object-fit"
      },
      accentWidth: {
        type: "number",
        default: 4,
        optional: true,
        label: "Accent line width (px)",
        section: "Details",
        subsection: "Accent line",
        min: 0,
        max: 1000,
        step: "any",
        styleSelector: "#overlay .lower-card",
        styleProperty: "border-left-width",
        styleUnit: "px"
      },
      lineColor: { type: "color", default: "#FFFFFF", optional: true, label: "Accent line color", section: "Details", subsection: "Accent line", maxlength: 80, styleSelector: "#overlay .lower-card", styleProperty: "border-left-color" },
      ...byStream.transitionFields("transition"),
      ...byStream.textFields({
        name: ["Name", "#overlay .lower-copy .primary"],
        subtitle: ["Subtitle", "#overlay .lower-copy .secondary"],
        icon: ["Icon", "#overlay .lower-icon"]
      }),
      ...byStream.surfaceFields({ panel: ["Panel", "#overlay .panel", ["border", "shadow"]] }),
      ...byStream.surfaceFields({ image: ["Image", "#overlay .lower-image", ["border", "radius", "shadow"]] }),
      ...byStream.filterFields("panelFilter", "Panel", "#overlay .panel"),
      ...byStream.filterFields("backdropFilter", "Panel backdrop", "#overlay .panel", true)
    }
  };

  const fieldDefaults = {
    panelBorderWidth: 1,
    panelBorderStyle: "solid",
    panelBorderColor: "#EEEEEE66",
    panelShadow: "yes",
    panelShadowColor: "#00000066",
    panelShadowBlur: 16,
    panelShadowY: 4,
    backdropFilterMode: "none",
    backdropFilterBlur: 12,
    subtitleFontSize: 24,
    contentGap: 16,
    transitionDuration: 300,
    transitionEasing: "ease",
    slideDistance: 32,
    iconFontSize: 64,
    imageRadius: 16,
    nameFontSize: 32,
    nameLineHeight: 38.4,
    subtitleLineHeight: 27,
    iconLineHeight: 72
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
      const keys = ["name", "subtitle", "icon", "imageUrl"];
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
  root.style.justifyContent = { left: "flex-start", center: "center", right: "flex-end" }[settings.placement];
  /**
   * Show the current wall-clock card and its visible/gap phase without accumulating timer drift.
   * @returns {void}
   */
  function update() {
    const cycle = (settings.duration + settings.gap) * 1000,
      time = Date.now();
    const visible = time % cycle < settings.duration * 1000;
    if (!visible) {
      previous = -1;
      changeContent(null, false);
      return;
    }
    change(Math.floor(time / cycle) % settings.entries.length, (e) => {
      const card = element("div", "lower-card");
      if (e.imageUrl) {
        const img = element("img", "lower-image", undefined, card);
        img.src = e.imageUrl;
        img.alt = "";
        img.addEventListener("error", () => img.remove());
      } else if (e.icon) element("span", "lower-icon", e.icon, card);
      const copy = element("div", "lower-copy", undefined, card);
      element("p", "primary", e.name, copy);
      element("p", "secondary", e.subtitle, copy);
    });
  }
  byStream.watch(update);
});
