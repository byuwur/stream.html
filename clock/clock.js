/** Clock: validated URL settings and an native renderer with shared URL setup. */
document.addEventListener("DOMContentLoaded", async () => {
  // ==========
  // ==== RESOURCE DEFINITION ====
  // ==========

  /** Defaults, URL constraints, and the field metadata consumed by the optional editor. */
  const resource = {
    version: "1.0",
    title: "Clock",
    description: "Your time, anywhere. Digital, analog, split flap, or beautifully minimal.",
    preview: [960, 540],
    urlRequired: ["layout"],
    presets: true,
    fields: {
      layout: {
        type: "select",
        default: "digital",
        label: "Clock style",
        section: "Content & behavior",
        options: { digital: "digital", analog: "analog", flip: "flip", minimal: "minimal" }
      },
      label: {
        type: "text",
        default: "LOCAL TIME",
        label: "Heading",
        section: "Content & behavior",
        maxlength: 160
      },
      timeZone: {
        type: "timezone",
        default: "",
        label: "Time zone",
        section: "Date & time",
        description: "Search by IANA name or current UTC offset. Empty uses the OBS computer zone.",
        validate: byStream.parseZone,
        maxlength: 160
      },
      showExtraZones: { type: "switch", default: "no", label: "Additional clocks", section: "Date & time", checkedValue: "yes", uncheckedValue: "no", options: { yes: "On", no: "Off" } },
      extraZones: {
        type: "timezones",
        default: "UTC",
        label: "Additional time zones",
        when: ["showExtraZones", "yes"],
        section: "Date & time",
        description: "Choose up to three additional clocks, in display order. Offsets include current daylight saving time.",
        validate: byStream.parseZones,
        maxlength: 400
      },
      hourFormat: {
        type: "select",
        default: "24",
        label: "Hour format",
        section: "Date & time",
        when: ["timeFormat", "locale"],
        description: "Used when Time of day format is Localized time.",
        options: { 24: "24", 12: "12" }
      },
      seconds: {
        type: "switch",
        default: "yes",
        label: "Show seconds",
        section: "Date & time",
        when: ["timeFormat", "locale"],
        description: "Used when Time of day format is Localized time.",
        checkedValue: "yes",
        uncheckedValue: "no",
        options: { yes: "yes", no: "no" }
      },
      period: {
        type: "switch",
        default: "yes",
        label: "Show AM / PM",
        section: "Date & time",
        when: ["timeFormat", "locale"],
        description: "Used when Time of day format is Localized time.",
        checkedValue: "yes",
        uncheckedValue: "no",
        options: { yes: "yes", no: "no" }
      },
      date: {
        type: "switch",
        default: "yes",
        label: "Show date",
        section: "Date & time",
        checkedValue: "yes",
        uncheckedValue: "no",
        options: { yes: "yes", no: "no" }
      },
      weekday: {
        type: "switch",
        default: "yes",
        label: "Show weekday",
        section: "Date & time",
        when: ["date", "yes"],
        checkedValue: "yes",
        uncheckedValue: "no",
        options: { yes: "yes", no: "no" }
      },
      showZones: { type: "switch", default: "yes", label: "Show zone names", section: "Date & time", checkedValue: "yes", uncheckedValue: "no", options: { yes: "Yes", no: "No" } },
      locale: {
        type: "locale",
        default: "",
        label: "Locale",
        section: "Date & time",
        description: "Search by locale code, language, or region. Empty uses browser locale.",
        validate: byStream.parseLocale,
        maxlength: 160
      },
      ...byStream.dateTimeFields({ dateWhen: ["date", "yes"] }),
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
        default: 88,
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
      letterSpacing: {
        type: "number",
        default: 0,
        label: "Letter spacing (px)",
        section: "Appearance",
        subsection: "Typography details",
        min: -5,
        max: 20,
        step: "any"
      },
      width: {
        type: "number",
        default: 860,
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
      ...byStream.placementFields("#overlay .panel"),
      composition: {
        type: "select",
        default: "stacked",
        label: "Composition",
        section: "Composition",
        description: "Single line puts the heading, time, and date in one row and scales them to fit.",
        options: { stacked: "Stacked clocks", inline: "Side-by-side clocks", "single-line": "Single line" }
      },
      spacing: {
        type: "number",
        default: 18,
        label: "Clock spacing (px)",
        section: "Composition",
        min: 0,
        max: 100,
        step: "any"
      },
      ...byStream.layoutFields("#overlay .clock", { dial: ["Analog dial", "#overlay .dial"], time: ["Time", "#overlay .time"], date: ["Date", "#overlay .secondary"], zone: ["Zone", "#overlay .zone"] }, "content", {
        dial: ["layout", "analog"],
        date: ["date", "yes"],
        zone: ["showZones", "yes"]
      }),
      dialSize: {
        type: "number",
        default: "",
        optional: true,
        label: "Analog dial diameter (px)",
        section: "Details",
        when: ["layout", "analog"],
        subsection: "Analog dial",
        min: 0,
        max: 1000,
        step: "any",
        styleSelector: "#overlay .dial",
        styleProperty: "width",
        styleUnit: "px"
      },
      dialColor: { type: "color", default: "", optional: true, label: "Analog tick color", section: "Details", when: ["layout", "analog"], subsection: "Analog dial", maxlength: 80, styleSelector: "#overlay .dial", styleProperty: "color" },
      hourHandColor: {
        type: "color",
        default: "",
        optional: true,
        label: "Hour hand color",
        section: "Details",
        when: ["layout", "analog"],
        subsection: "Analog dial",
        maxlength: 80,
        styleSelector: "#overlay .hand.hour",
        styleProperty: "background-color"
      },
      minuteHandColor: {
        type: "color",
        default: "",
        optional: true,
        label: "Minute hand color",
        section: "Details",
        when: ["layout", "analog"],
        subsection: "Analog dial",
        maxlength: 80,
        styleSelector: "#overlay .hand.minute",
        styleProperty: "background-color"
      },
      secondHandColor: {
        type: "color",
        default: "",
        optional: true,
        label: "Second hand color",
        section: "Details",
        when: ["layout", "analog"],
        subsection: "Analog dial",
        maxlength: 80,
        styleSelector: "#overlay .hand.second, #overlay .dial::after",
        styleProperty: "background-color"
      },
      tickOpacity: {
        type: "number",
        default: "",
        optional: true,
        label: "Tick opacity (%)",
        section: "Details",
        when: ["layout", "analog"],
        subsection: "Analog dial",
        min: 0,
        max: 100,
        step: "any",
        styleSelector: "#overlay .tick",
        styleProperty: "opacity",
        styleUnit: "%"
      },
      flipDuration: { type: "number", default: 300, label: "Flip duration (ms)", section: "Animation", when: ["layout", "flip"], min: 0, max: 5000, step: "any" },
      ...byStream.textFields(
        {
          heading: ["Heading", "#overlay .eyebrow"],
          time: ["Time", "#overlay .time"],
          date: ["Date", "#overlay .secondary"],
          zone: ["Time zone label", "#overlay .zone"]
        },
        { date: ["date", "yes"], zone: ["showZones", "yes"] }
      ),
      ...byStream.surfaceFields({ panel: ["Panel", "#overlay .panel", ["border", "shadow"]] }),
      ...byStream.surfaceFields({ dial: ["Analog dial", "#overlay .dial", ["background", "border", "shadow"]], flap: ["Flip card", "#overlay .flap"] }, { dial: ["layout", "analog"] }),
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
  root.dataset.layout = settings.layout;
  root.dataset.composition = settings.composition;
  root.style.setProperty("--spacing", `${settings.spacing}px`);
  root.style.letterSpacing = `${settings.letterSpacing}px`;
  const content = settings.composition === "single-line" ? element("div", "clock-line") : panel;
  if (settings.label) element("p", "eyebrow", settings.label, content);
  const clocks = element("div", "clocks", undefined, content);
  clocks.dataset.composition = settings.composition;
  const zones = [settings.timeZone, ...(settings.showExtraZones === "yes" ? settings.extraZones.split("\n") : [])];
  const showSeconds = settings.timeFormat === "locale" ? settings.seconds === "yes" : settings.timeFormat.includes("ss");
  const views = zones.map((zone) => {
    const options = zone ? { timeZone: zone } : {};
    const locale = settings.locale || undefined;
    const timeFormat = byStream.dateTimeFormatter(settings.timeFormat, locale, {
      ...options,
      hourCycle: settings.hourFormat === "12" ? "h12" : "h23",
      hour: "2-digit",
      minute: "2-digit",
      ...(settings.seconds === "yes" ? { second: "2-digit" } : {})
    });
    const faceFormat = new Intl.DateTimeFormat("en-US", {
      ...options,
      hourCycle: "h23",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
    const dateFormat = byStream.dateTimeFormatter(settings.dateFormat, locale, {
      ...options,
      ...(settings.date === "yes" ? { year: "numeric", month: "short", day: "numeric" } : {}),
      ...(settings.weekday === "yes" ? { weekday: "long" } : {})
    });
    const weekdayFormat = new Intl.DateTimeFormat(locale, { ...options, weekday: "long" });
    const view = element("section", "clock", undefined, clocks);
    let dial;
    if (settings.layout === "analog") {
      dial = element("div", "dial", undefined, view);
      dial.setAttribute("aria-label", "Analog clock");
      for (let i = 0; i < 12; i++) {
        const tick = element("i", "tick", undefined, dial);
        tick.style.rotate = `${i * 30}deg`;
      }
      for (const hand of ["hour", "minute", "second"]) element("i", `hand ${hand}`, undefined, dial);
      dial.querySelector(".second").hidden = !showSeconds;
    }
    const display = element("div", "time", undefined, view);
    const date = element("p", "secondary", undefined, view);
    if (settings.showZones === "yes" && zones.length > 1) element("p", "zone", zone || Intl.DateTimeFormat().resolvedOptions().timeZone, view);
    return { timeFormat, faceFormat, dateFormat, weekdayFormat, dial, display, date };
  });
  function fitLine() {
    if (content === panel) return;
    const style = getComputedStyle(panel);
    const width = panel.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
    content.style.zoom = Math.min(1, width / content.offsetWidth);
  }
  if (content !== panel) {
    panel.style.justifyContent = settings.align;
    window.addEventListener("resize", fitLine);
    document.fonts.ready.then(fitLine);
    document.fonts.addEventListener("loadingdone", fitLine);
  }
  /**
   * Update.
   * @returns {void}
   */
  function update() {
    const now = new Date();
    for (const view of views) {
      const parts = view.timeFormat.formatToParts(now).filter((x) => settings.timeFormat !== "locale" || settings.period === "yes" || x.type !== "dayPeriod");
      const text = parts
        .map((x) => x.value)
        .join("")
        .trim();
      if (view.display.dataset.value !== text) {
        view.display.dataset.value = text;
        if (settings.layout === "flip") {
          const values = parts.filter((x) => ["hour", "minute", "second", "dayPeriod"].includes(x.type));
          values.forEach((part, index) => {
            let node = view.display.children[index];
            if (!node) {
              node = document.createElement("span");
              node.className = "flap";
              view.display.append(node);
            }
            if (node.textContent === part.value) return;
            node.textContent = part.value;
            node.animate([{ transform: "perspective(500px) rotateX(-25deg)" }, { transform: "perspective(500px) rotateX(0)" }], { duration: settings.flipDuration });
          });
        } else view.display.textContent = text;
      }
      view.date.hidden = settings.date === "no" && settings.weekday === "no";
      if (!view.date.hidden) {
        const date = settings.dateFormat === "locale" ? view.dateFormat.format(now) : [settings.weekday === "yes" ? view.weekdayFormat.format(now) : "", settings.date === "yes" ? view.dateFormat.format(now) : ""].filter(Boolean).join(", ");
        if (view.date.textContent !== date) view.date.textContent = date;
      }
      if (view.dial) {
        const p = Object.fromEntries(view.faceFormat.formatToParts(now).map((x) => [x.type, x.value]));
        view.dial.querySelector(".hour").style.rotate = `${(Number(p.hour) % 12) * 30 + Number(p.minute) * 0.5}deg`;
        view.dial.querySelector(".minute").style.rotate = `${Number(p.minute) * 6 + Number(p.second) * 0.1}deg`;
        view.dial.querySelector(".second").style.rotate = `${Number(p.second) * 6}deg`;
        view.dial.setAttribute("aria-label", text);
      }
    }
    fitLine();
  }
  byStream.watch(update, showSeconds ? 1000 : 60000);
});
