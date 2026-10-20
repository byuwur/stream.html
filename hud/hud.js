/** Camera HUD: validated URL settings and an native renderer with shared URL setup. */
document.addEventListener("DOMContentLoaded", async () => {
  // ==========
  // ==== RESOURCE DEFINITION ====
  // ==========

  /** Defaults, URL constraints, and the field metadata consumed by the optional editor. */
  const resource = {
    version: "1.0",
    title: "Camera HUD",
    description: "REC, timecode, and a little nostalgia for your camera view.",
    preview: [1280, 720],
    urlRequired: ["style"],
    presets: true,
    fields: {
      style: {
        type: "select",
        default: "camcorder",
        label: "Viewfinder style",
        section: "Content & behavior",
        options: { camcorder: "camcorder", vhs: "vhs", viewfinder: "viewfinder" }
      },
      label: {
        type: "text",
        default: "CAM 01",
        label: "Camera label",
        section: "Content & behavior",
        maxlength: 160
      },
      rec: {
        type: "switch",
        default: "yes",
        label: "Recording indicator",
        section: "Content & behavior",
        checkedValue: "yes",
        uncheckedValue: "no",
        options: { yes: "yes", no: "no" }
      },
      timestamp: {
        type: "switch",
        default: "yes",
        label: "Live timestamp",
        section: "Content & behavior",
        checkedValue: "yes",
        uncheckedValue: "no",
        options: { yes: "yes", no: "no" }
      },
      showBattery: { type: "switch", default: "yes", label: "Show battery", section: "Content & behavior", checkedValue: "yes", uncheckedValue: "no", options: { yes: "Yes", no: "No" } },
      showCrosshair: { type: "switch", default: "yes", label: "Show crosshair", section: "Content & behavior", checkedValue: "yes", uncheckedValue: "no", options: { yes: "Yes", no: "No" } },
      recordingText: { type: "text", default: "● REC", label: "Recording text", section: "Content & behavior", when: ["rec", "yes"], subsection: "Indicator text", maxlength: 160 },
      standbyText: { type: "text", default: "STANDBY", label: "Standby text", section: "Content & behavior", when: ["rec", "no"], subsection: "Indicator text", maxlength: 160 },
      batteryText: { type: "text", default: "▰ ▰ ▰", label: "Battery symbol / text", section: "Content & behavior", when: ["showBattery", "yes"], subsection: "Indicator text", maxlength: 160 },
      crosshairText: { type: "text", default: "+", label: "Crosshair symbol", section: "Content & behavior", when: ["showCrosshair", "yes"], subsection: "Indicator text", maxlength: 160 },
      timeZone: {
        type: "timezone",
        default: "",
        label: "Timestamp time zone",
        section: "Date & time",
        when: ["timestamp", "yes"],
        description: "Search by IANA name or current UTC offset. Empty uses OBS computer zone.",
        validate: byStream.parseZone,
        maxlength: 160
      },
      ...byStream.whenFields(["timestamp", "yes"], byStream.dateTimeFields({ locale: true })),
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
        default: 28,
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
      width: {
        type: "number",
        default: 1920,
        label: "Maximum width (px)",
        section: "Size & placement",
        min: 100,
        max: 3840,
        step: "any"
      },
      inset: {
        type: "number",
        default: 32,
        label: "Viewfinder inset (px)",
        section: "Size & placement",
        min: -100,
        max: 100,
        step: "any"
      },
      ...byStream.placementFields("#overlay .panel"),
      ...byStream.insetFields("statusInset", "Status position", "#overlay .hud-rec"),
      ...byStream.insetFields("cameraLabelInset", "Camera label position", "#overlay .hud-label"),
      ...byStream.whenFields(["timestamp", "yes"], byStream.insetFields("timestampInset", "Timestamp position", "#overlay .hud-time")),
      ...byStream.whenFields(["showBattery", "yes"], byStream.insetFields("batteryInset", "Battery position", "#overlay .battery")),
      ...byStream.whenFields(["showCrosshair", "yes"], byStream.insetFields("crosshairInset", "Crosshair position", "#overlay .crosshair")),
      scanlines: {
        type: "number",
        default: 0,
        label: "Scanline opacity (%)",
        section: "Details",
        subsection: "Texture",
        min: 0,
        max: 100,
        step: "any"
      },
      grain: {
        type: "number",
        default: 0,
        label: "Noise opacity (%)",
        section: "Details",
        subsection: "Texture",
        min: 0,
        max: 100,
        step: "any"
      },
      frameColor: { type: "color", default: "", optional: true, label: "Corner color", section: "Details", subsection: "Viewfinder corners", maxlength: 80, styleSelector: "#overlay .hud::before", styleProperty: "border-color" },
      frameThickness: {
        type: "number",
        default: "",
        optional: true,
        label: "Corner thickness (px)",
        section: "Details",
        subsection: "Viewfinder corners",
        min: 0,
        max: 1000,
        step: "any",
        styleSelector: "#overlay .hud::before",
        styleProperty: "--frame-thickness",
        styleUnit: "px"
      },
      cornerLength: {
        type: "number",
        default: "",
        optional: true,
        label: "Corner length (%)",
        section: "Details",
        subsection: "Viewfinder corners",
        min: 0,
        max: 100,
        step: "any",
        styleSelector: "#overlay .hud::before",
        styleProperty: "--corner-length",
        styleUnit: "%"
      },
      blink: {
        type: "switch",
        default: "no",
        label: "Blink REC",
        section: "Animation",
        when: ["rec", "yes"],
        checkedValue: "yes",
        uncheckedValue: "no",
        options: { yes: "yes", no: "no" }
      },
      blinkDuration: {
        type: "number",
        default: "",
        optional: true,
        label: "Recording blink duration (s)",
        section: "Animation",
        when: ["blink", "yes"],
        min: 0.1,
        max: 120,
        step: "any",
        styleSelector: "#overlay .hud-rec",
        styleProperty: "animation-duration",
        styleUnit: "s"
      },
      ...byStream.textFields(
        {
          status: ["Recording status", "#overlay .hud-rec"],
          label: ["Camera label", "#overlay .hud-label"],
          time: ["Timestamp", "#overlay .hud-time"],
          battery: ["Battery indicator", "#overlay .battery"],
          crosshair: ["Crosshair", "#overlay .crosshair"]
        },
        { time: ["timestamp", "yes"], battery: ["showBattery", "yes"], crosshair: ["showCrosshair", "yes"] }
      ),
      ...byStream.surfaceFields({ panel: ["Panel", "#overlay .panel", ["border", "shadow"]] }),
      ...byStream.filterFields("panelFilter", "Panel", "#overlay .panel"),
      ...byStream.filterFields("backdropFilter", "Panel backdrop", "#overlay .panel", true)
    },
    constants: {
      padding: 0,
      align: "center",
      position: "center",
      radius: 0
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
  panel.className = "panel hud";
  root.dataset.style = settings.style;
  panel.style.setProperty("--inset", `${settings.inset}px`);
  panel.style.setProperty("--scanlines", settings.scanlines / 100);
  panel.style.setProperty("--grain", settings.grain / 100);
  const rec = element("p", "hud-rec", settings.rec === "yes" ? settings.recordingText : settings.standbyText);
  rec.classList.toggle("blink", settings.blink === "yes" && settings.rec === "yes");
  element("p", "hud-label", settings.label);
  const stamp = element("p", "hud-time");
  stamp.hidden = settings.timestamp === "no";
  element("span", "crosshair", settings.crosshairText).hidden = settings.showCrosshair === "no";
  element("span", "battery", settings.batteryText).hidden = settings.showBattery === "no";
  element("div", "hud-noise");
  panel.style.setProperty("--hud-font", byFont.family(settings.fontFamily, "monospace"));
  if (settings.timestamp === "yes") {
    const zone = settings.timeZone ? { timeZone: settings.timeZone } : {};
    const date = byStream.dateTimeFormatter(settings.dateFormat, settings.locale, { ...zone, year: "numeric", month: "2-digit", day: "2-digit" });
    const time = byStream.dateTimeFormatter(settings.timeFormat, settings.locale, { ...zone, hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" });
    byStream.watch(() => {
      const now = new Date();
      stamp.textContent = `${date.format(now)} ${time.format(now)}`;
    });
  }
});
