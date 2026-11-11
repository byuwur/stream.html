// Stream Badge: validated URL settings and an native renderer with shared URL setup.
document.addEventListener("DOMContentLoaded", async () => {
  // ==========
  // ==== RESOURCE DEFINITION ====
  // ==========

  // Defaults, URL constraints, and the field metadata consumed by the optional editor.
  const resource = {
    version: "1.0",
    title: "Stream Badge",
    description: "LIVE. AFK. RECORDING. Give the moment a name.",
    preview: [960, 540],
    urlRequired: ["label"],
    presets: true,
    fields: {
      label: {
        type: "text",
        default: "LIVE",
        label: "Badge text",
        section: "Content & behavior",
        maxlength: 80
      },
      style: {
        type: "select",
        default: "pill",
        label: "Badge style",
        section: "Content & behavior",
        options: { pill: "pill", square: "square", outline: "outline" }
      },
      showIcon: { type: "switch", default: "no", label: "Icon", section: "Content & behavior", checkedValue: "yes", uncheckedValue: "no", options: { yes: "On", no: "Off" } },
      icon: {
        type: "text",
        default: "★",
        label: "Unicode icon",
        when: ["showIcon", "yes"],
        section: "Content & behavior",
        maxlength: 12
      },
      dot: {
        type: "switch",
        default: "yes",
        label: "Status dot",
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
        default: 20,
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
      width: {
        type: "number",
        default: 128,
        label: "Maximum width (px)",
        description: "0 = Auto (no fixed maximum).",
        section: "Size & placement",
        min: 0,
        max: 3840,
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
        default: 8,
        label: "Padding (px)",
        section: "Size & placement",
        min: 0,
        max: 100,
        step: "any"
      },
      edgePadding: { type: "number", default: 16, optional: true, label: "Viewport edge padding (px)", section: "Size & placement", min: 0, max: 1000, step: "any", styleSelector: "#overlay", styleProperty: "padding", styleUnit: "px" },
      ...byStream.placementFields("#overlay .panel"),
      ...byStream.layoutFields("#overlay .badge-content", { dot: ["Status dot", "#overlay .status-dot"], icon: ["Icon", "#overlay .badge-icon"], text: ["Text", "#overlay .primary"] }, "content", {
        dot: ["dot", "yes"],
        icon: ["icon"]
      }),
      dotColor: {
        type: "color",
        default: "#660000",
        optional: true,
        label: "Status dot color",
        section: "Details",
        when: ["dot", "yes"],
        subsection: "Status dot",
        maxlength: 80,
        styleSelector: "#overlay .status-dot",
        styleProperty: "background-color"
      },
      dotSize: {
        type: "number",
        default: 12,
        optional: true,
        label: "Status dot size (px)",
        section: "Details",
        when: ["dot", "yes"],
        subsection: "Status dot",
        min: 0,
        max: 1000,
        step: "any",
        styleSelector: "#overlay .status-dot",
        styleProperty: "--dot-size",
        styleUnit: "px"
      },
      dotRadius: {
        type: "number",
        default: 6,
        optional: true,
        label: "Status dot corner radius (px)",
        section: "Details",
        when: ["dot", "yes"],
        subsection: "Status dot",
        min: 0,
        max: 1000,
        step: "any",
        styleSelector: "#overlay .status-dot",
        styleProperty: "border-radius",
        styleUnit: "px"
      },
      animation: {
        type: "select",
        default: "pulse",
        label: "Accent motion",
        section: "Animation",
        options: { none: "none", pulse: "pulse", glow: "glow" }
      },
      animationDuration: {
        type: "number",
        default: 1,
        optional: true,
        label: "Accent animation duration (s)",
        section: "Animation",
        when: ["animation", "pulse", "glow"],
        min: 0.1,
        max: 120,
        step: "any",
        styleSelector: "#overlay .status-dot, #overlay .stream-badge",
        styleProperty: "animation-duration",
        styleUnit: "s"
      },
      ...byStream.textFields(
        {
          badgeText: ["Badge text", "#overlay .primary"],
          badgeIcon: ["Badge icon", "#overlay .badge-icon"]
        },
        { badgeIcon: ["icon"] }
      ),
      ...byStream.surfaceFields({ panel: ["Panel", "#overlay .panel", ["border", "radius", "shadow"]] }),
      ...byStream.filterFields("panelFilter", "Panel", "#overlay .panel"),
      ...byStream.filterFields("backdropFilter", "Panel backdrop", "#overlay .panel", true)
    },
    constants: {
      radius: 8
    }
  };

  const fieldDefaults = {
    panelBorderWidth: 0,
    panelBorderStyle: "solid",
    panelBorderColor: "#EEEEEE66",
    panelShadow: "yes",
    panelShadowColor: "#00000066",
    panelShadowBlur: 16,
    panelShadowY: 4,
    backdropFilterMode: "none",
    backdropFilterBlur: 12,
    badgeTextTracking: 2,
    panelRadius: 6,
    badgeTextFontSize: 16,
    contentGap: 10,
    badgeTextLineHeight: 19.2,
    badgeIconFontSize: 20,
    badgeIconLineHeight: 23
  };
  for (const [name, value] of Object.entries(fieldDefaults)) {
    const field = resource.fields[name];
    field.default = value;
    delete field.styleDefault;
  }
  resource.fields.contentGap.zeroIsDefault = true;

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

  panel.classList.add("stream-badge");
  root.dataset.style = settings.style;
  root.dataset.animation = settings.animation;
  const content = element("div", "badge-content");
  content.style.justifyContent = { left: "flex-start", center: "center", right: "flex-end" }[settings.align];
  const dot = settings.dot === "yes" ? element("i", "status-dot", "", content) : null;
  if (settings.showIcon === "yes") element("span", "badge-icon", settings.icon, content);
  const label = element("span", "primary", settings.label, content);
  if (dot) dot.style.font = getComputedStyle(label).font;
});
