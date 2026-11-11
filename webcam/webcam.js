// Webcam Frame: validated URL settings and an native renderer with shared URL setup.
document.addEventListener("DOMContentLoaded", async () => {
  // ==========
  // ==== RESOURCE DEFINITION ====
  // ==========

  // Defaults, URL constraints, and the field metadata consumed by the optional editor.
  const resource = {
    version: "1.1",
    title: "Webcam Frame",
    description: "A clean, transparent frame to place above your camera in OBS.",
    preview: [960, 540],
    urlRequired: ["shape"],
    presets: true,
    fields: {
      shape: {
        type: "select",
        default: "rounded",
        label: "Frame style",
        section: "Content & behavior",
        options: { rectangle: "rectangle", rounded: "rounded", circle: "circle", decorative: "decorative" }
      },
      label: {
        type: "text",
        default: "BONYUR @byUwUr",
        label: "Camera label",
        section: "Content & behavior",
        maxlength: 160
      },
      accentColor: {
        type: "color",
        default: "#330000",
        label: "Accent color",
        section: "Appearance",
        maxlength: 80
      },
      border: {
        type: "number",
        default: 8,
        label: "Border thickness (px)",
        section: "Appearance",
        min: 1,
        max: 30,
        step: "any"
      },
      corner: {
        type: "number",
        default: 24,
        label: "Rounded corner radius (px)",
        section: "Appearance",
        when: ["shape", "rounded"],
        min: 0,
        max: 200,
        step: "any"
      },
      gradient: {
        type: "switch",
        default: "no",
        label: "Gradient border",
        section: "Appearance",
        checkedValue: "yes",
        uncheckedValue: "no",
        options: { yes: "yes", no: "no" }
      },
      secondColor: {
        type: "color",
        default: "#112233",
        label: "Second border color",
        section: "Appearance",
        when: ["gradient", "yes"],
        maxlength: 80
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
        default: "600",
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
      backgroundColor: {
        type: "color",
        default: "#11111133",
        label: "Label background",
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
      width: {
        contentSized: false,
        type: "number",
        default: 720,
        label: "Maximum width (px)",
        description: "0 = Auto (no fixed maximum).",
        section: "Size & placement",
        min: 0,
        max: 3840,
        step: "any"
      },
      height: {
        type: "number",
        default: 405,
        label: "Frame height (px)",
        section: "Size & placement",
        min: 100,
        max: 2160,
        step: "any"
      },
      horizontalPlacement: {
        type: "select",
        default: "flex-end",
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
      edgePadding: { type: "number", default: 16, optional: true, label: "Viewport edge padding (px)", section: "Size & placement", min: 0, max: 1000, step: "any", styleSelector: "#overlay", styleProperty: "padding", styleUnit: "px" },
      labelPosition: {
        type: "select",
        default: "bottom",
        label: "Label placement",
        section: "Size & placement",
        when: ["label"],
        options: { top: "top", bottom: "bottom" }
      },
      ...byStream.placementFields("#overlay .panel"),
      ...byStream.whenFields(["label"], byStream.offsetFields("labelOffset", "Label offset", "#overlay .camera-label")),
      gradientAngle: {
        type: "number",
        default: 0,
        optional: true,
        label: "Gradient angle (degrees)",
        section: "Details",
        when: ["gradient", "yes"],
        subsection: "Gradient border",
        min: -360,
        max: 360,
        step: "any",
        styleSelector: "#overlay .camera-frame",
        styleProperty: "--gradient-angle",
        styleUnit: "deg"
      },
      decorationWidth: {
        type: "number",
        default: 0,
        optional: true,
        label: "Decorative corner width (%)",
        section: "Details",
        when: ["shape", "decorative"],
        subsection: "Decorative corners",
        min: 0,
        max: 100,
        step: "any",
        styleSelector: "#overlay .corner",
        styleProperty: "width",
        styleUnit: "%"
      },
      decorationHeight: {
        type: "number",
        default: 0,
        optional: true,
        label: "Decorative corner height (%)",
        section: "Details",
        when: ["shape", "decorative"],
        subsection: "Decorative corners",
        min: 0,
        max: 100,
        step: "any",
        styleSelector: "#overlay .corner",
        styleProperty: "height",
        styleUnit: "%"
      },
      decorationThickness: {
        type: "number",
        default: 0,
        optional: true,
        label: "Decorative corner thickness (px)",
        section: "Details",
        when: ["shape", "decorative"],
        subsection: "Decorative corners",
        min: 0,
        max: 1000,
        step: "any",
        styleSelector: "#overlay .corner",
        styleProperty: "--decoration-thickness",
        styleUnit: "px"
      },
      decorationColor: {
        type: "color",
        default: "#FFFFFF",
        optional: true,
        label: "Decorative corner color",
        section: "Details",
        when: ["shape", "decorative"],
        subsection: "Decorative corners",
        maxlength: 80,
        styleSelector: "#overlay .corner",
        styleProperty: "border-color"
      },
      animation: {
        type: "select",
        default: "none",
        label: "Animated accents",
        section: "Animation",
        options: { none: "none", pulse: "pulse" }
      },
      animationDuration: {
        type: "number",
        default: 0.1,
        optional: true,
        label: "Frame pulse duration (s)",
        section: "Animation",
        when: ["animation", "pulse"],
        min: 0.1,
        max: 120,
        step: "any",
        styleSelector: "#overlay .animated::before",
        styleProperty: "animation-duration",
        styleUnit: "s"
      },
      ...byStream.textFields(
        {
          label: ["Camera label", "#overlay .camera-label"]
        },
        { label: ["label"] }
      ),
      ...byStream.surfaceFields({ panel: ["Panel", "#overlay .panel", ["border", "shadow"]] }),
      ...byStream.surfaceFields({ labelSurface: ["Label", "#overlay .camera-label"] }, { labelSurface: ["label"] }),
      ...byStream.whenFields(["label"], byStream.filterFields("labelBackdrop", "Label backdrop", "#overlay .camera-label", true)),
      ...byStream.filterFields("panelFilter", "Panel", "#overlay .panel"),
      ...byStream.filterFields("backdropFilter", "Panel backdrop", "#overlay .panel", true)
    },
    constants: {
      padding: 0,
      radius: 8
    }
  };

  const fieldDefaults = {
    panelShadow: "yes",
    panelShadowColor: "#00000066",
    panelShadowBlur: 16,
    panelShadowY: 8,
    labelSurfaceRadius: 16,
    labelSurfaceBorderWidth: 2,
    labelSurfaceBorderColor: "#ffffff66",
    labelSurfaceBorderStyle: "solid",
    labelSurfacePadding: 8,
    labelBackdropMode: "custom",
    labelBackdropBlur: 8,
    labelTextShadow: "yes",
    labelTextShadowColor: "#00000066",
    labelTextShadowBlur: 8,
    labelTextShadowY: 2,
    panelBorderWidth: 2,
    panelBorderColor: "#FFFFFF66",
    panelBorderStyle: "solid",
    labelFontSize: 24,
    labelLineHeight: 27
  };
  for (const [name, value] of Object.entries(fieldDefaults)) {
    const field = resource.fields[name];
    field.default = value;
    delete field.styleDefault;
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

  panel.className = "panel camera-frame";
  panel.style.width = settings.width === 0 ? "100%" : `${settings.width}px`;
  panel.style.height = `min(${settings.height}px, calc(100vh - 32px))`;
  root.dataset.shape = settings.shape;
  if (settings.shape === "circle") {
    panel.style.width = `min(${settings.width === 0 ? "100%" : `${settings.width}px`}, ${settings.height}px, calc(100vh - 80px))`;
    panel.style.height = "auto";
  }

  panel.style.setProperty("--border", `${settings.border}px`);
  panel.style.setProperty("--corner", `${settings.corner}px`);
  panel.style.setProperty("--second", settings.secondColor);
  panel.dataset.gradient = settings.gradient;
  panel.classList.toggle("animated", settings.animation === "pulse");
  const label = element("span", "camera-label", settings.label);
  label.dataset.position = settings.labelPosition;
  label.hidden = !settings.label;
  label.style.left = { left: "10%", center: "50%", right: "90%" }[settings.align];
  if (settings.shape === "decorative") for (let i = 0; i < 4; i++) element("i", `corner corner-${i}`);
});
