/** Watermark: validated URL settings and an native renderer with shared URL setup. */
document.addEventListener("DOMContentLoaded", async () => {
  // ==========
  // ==== RESOURCE DEFINITION ====
  // ==========

  /** Defaults, URL constraints, and the field metadata consumed by the optional editor. */
  const resource = {
    version: "1.0",
    title: "Watermark",
    description: "A signature for your stream. Text, monogram, or your own logo.",
    preview: [960, 540],
    urlRequired: ["text"],
    presets: true,
    fields: {
      kind: {
        type: "select",
        default: "text",
        label: "Branding",
        section: "Content & behavior",
        options: { text: "text", monogram: "monogram", logo: "logo" }
      },
      text: {
        type: "text",
        default: "YOUR CHANNEL",
        label: "Brand text",
        section: "Content & behavior",
        maxlength: 160
      },
      logoUrl: {
        type: "url",
        default: "https://byuwur.github.io/img/logo.png",
        label: "Logo URL",
        section: "Content & behavior",
        when: ["kind", "logo"],
        description: "Public HTTP(S) image, relative path, or downloaded file URL. No uploads.",
        maxlength: 1000
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
        default: 45,
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
        default: 320,
        label: "Maximum width (px)",
        section: "Size & placement",
        min: 100,
        max: 3840,
        step: "any"
      },
      placement: {
        type: "select",
        default: "right",
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
      edgePadding: { type: "number", default: "", optional: true, label: "Viewport edge padding (px)", section: "Size & placement", min: 0, max: 1000, step: "any", styleSelector: "#overlay", styleProperty: "padding", styleUnit: "px" },
      imageHeight: {
        type: "number",
        default: 100,
        label: "Maximum logo height (px)",
        section: "Size & placement",
        when: ["kind", "logo"],
        min: 20,
        max: 500,
        step: "any"
      },
      ...byStream.placementFields("#overlay .panel"),
      underlineWidth: {
        type: "number",
        default: "",
        optional: true,
        label: "Underline width (px)",
        section: "Details",
        subsection: "Underline",
        min: 0,
        max: 1000,
        step: "any",
        styleSelector: "#overlay .brand-text",
        styleProperty: "border-bottom-width",
        styleUnit: "px"
      },
      underlineColor: { type: "color", default: "", optional: true, label: "Underline color", section: "Details", subsection: "Underline", maxlength: 80, styleSelector: "#overlay .brand-text", styleProperty: "border-bottom-color" },
      underlineGap: {
        type: "number",
        default: "",
        optional: true,
        label: "Underline gap (px)",
        section: "Details",
        subsection: "Underline",
        min: 0,
        max: 1000,
        step: "any",
        styleSelector: "#overlay .brand-text",
        styleProperty: "padding-bottom",
        styleUnit: "px"
      },
      logoFit: {
        type: "select",
        default: "contain",
        label: "Logo fit",
        section: "Details",
        when: ["kind", "logo"],
        subsection: "Logo",
        options: { contain: "Contain", cover: "Cover", fill: "Stretch" },
        styleSelector: "#overlay .brand-logo",
        styleProperty: "object-fit"
      },
      motion: {
        type: "select",
        default: "none",
        label: "Motion",
        section: "Animation",
        options: { none: "none", float: "float" }
      },
      fadeInterval: {
        type: "number",
        default: 0,
        label: "Fade cycle (seconds; 0 disables)",
        section: "Animation",
        min: 0,
        max: 3600,
        step: "any"
      },
      visibleDuration: {
        type: "number",
        default: 20,
        label: "Visible time per cycle (seconds)",
        section: "Animation",
        min: 1,
        max: 3600,
        step: "any"
      },
      floatDuration: {
        type: "number",
        default: "",
        optional: true,
        label: "Float duration (s)",
        section: "Animation",
        when: ["motion", "float"],
        min: 0.1,
        max: 120,
        step: "any",
        styleSelector: "#overlay .floating",
        styleProperty: "animation-duration",
        styleUnit: "s"
      },
      floatDistance: {
        type: "number",
        default: "",
        optional: true,
        label: "Float vertical distance (px)",
        section: "Animation",
        when: ["motion", "float"],
        min: -500,
        max: 500,
        step: "any",
        styleSelector: "#overlay .floating",
        styleProperty: "--float-distance",
        styleUnit: "px"
      },
      ...byStream.textFields({
        watermarkText: ["Watermark text", "#overlay .primary"]
      }),
      ...byStream.surfaceFields({ panel: ["Panel", "#overlay .panel", ["border", "shadow"]] }),
      ...byStream.surfaceFields({ logo: ["Logo", "#overlay .brand-logo", ["border", "radius", "shadow"]] }, { logo: ["kind", "logo"] }),
      ...byStream.filterFields("panelFilter", "Panel", "#overlay .panel"),
      ...byStream.filterFields("backdropFilter", "Panel backdrop", "#overlay .panel", true)
    }
  };

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
  // One scheduler owns updates, stops while hidden, and restores correctly from the back/forward cache.
  root.style.justifyContent = { left: "flex-start", center: "center", right: "flex-end" }[settings.placement];
  panel.classList.toggle("floating", settings.motion === "float");
  if (settings.kind === "logo" && settings.logoUrl) {
    const img = element("img", "brand-logo");
    img.src = settings.logoUrl;
    img.alt = settings.text;
    img.style.maxHeight = `${settings.imageHeight}px`;
    img.addEventListener("error", () => {
      img.remove();
      element("p", "primary", settings.text);
    });
  } else {
    const content =
      settings.kind === "monogram"
        ? settings.text
            .trim()
            .split(/\s+/)
            .map((x) => Array.from(x)[0])
            .slice(0, 3)
            .join("")
        : settings.text;
    element("p", "primary brand-text", content);
  }
  if (settings.fadeInterval > 0) byStream.watch(() => (panel.hidden = Date.now() % (settings.fadeInterval * 1000) >= Math.min(settings.visibleDuration, settings.fadeInterval) * 1000));
});
