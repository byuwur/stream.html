// Schedule: validated URL settings and an native renderer with shared URL setup.
document.addEventListener("DOMContentLoaded", async () => {
  // ==========
  // ==== RESOURCE DEFINITION ====
  // ==========

  // Defaults, URL constraints, and the field metadata consumed by the optional editor.
  const resource = {
    version: "1.1",
    title: "Schedule",
    description: "What’s on next? A dated run of show with automatic current-segment highlighting.",
    preview: [960, 540],
    urlRequired: ["entries"],
    presets: true,
    fields: {
      entries: {
        type: "entries",
        default: [
          {
            title: "Warm-up",
            startTime: "2026-11-09T15:30:00.000Z",
            endTime: "2026-11-09T15:45:00.000Z"
          },
          {
            title: "Announcement",
            startTime: "2026-11-10T15:45:00.000Z",
            endTime: "2099-11-10T16:30:00.000Z"
          },
          {
            title: "The main event",
            startTime: "2099-11-09T15:45:00.000Z",
            endTime: "2099-11-09T16:30:00.000Z"
          }
        ],
        label: "Activities",
        section: "Content & behavior",
        validate: parseEntries,
        maxlength: 8000,
        entries: {
          textFields: [
            ["title", "Activity"],
            ["startTime", "Start (computer time)", "datetime-local"],
            ["endTime", "End (computer time)", "datetime-local"]
          ],
          newEntry: { title: "New activity", startTime: new Date().toISOString(), endTime: new Date(Date.now() + 1800000).toISOString() },
          limit: 40
        },
        addLabel: "Add entry"
      },
      title: {
        type: "text",
        default: "TONIGHT, AT OUR PACE",
        label: "Heading",
        section: "Content & behavior",
        maxlength: 160
      },
      showEnded: {
        type: "switch",
        default: "yes",
        label: "Show completed activities",
        section: "Content & behavior",
        checkedValue: "yes",
        uncheckedValue: "no",
        options: { yes: "yes", no: "no" }
      },
      nowLabel: { type: "text", default: "NOW", label: "Current status text", section: "Content & behavior", subsection: "Status labels", maxlength: 160 },
      doneLabel: { type: "text", default: "DONE", label: "Ended status text", section: "Content & behavior", subsection: "Status labels", maxlength: 160 },
      nextLabel: { type: "text", default: "UP NEXT", label: "Upcoming status text", section: "Content & behavior", subsection: "Status labels", maxlength: 160 },
      emptyLabel: { type: "text", default: "No activities scheduled.", label: "Empty schedule text", section: "Content & behavior", subsection: "Status labels", maxlength: 160 },
      timeZone: {
        type: "timezone",
        default: "America/Bogota",
        label: "Display time zone",
        section: "Date & time",
        description: "Search by IANA name or current UTC offset. Entries keep their explicit UTC offsets.",
        validate: byStream.parseZone,
        maxlength: 160
      },
      locale: {
        type: "locale",
        default: "en-US",
        label: "Locale",
        section: "Date & time",
        description: "Search by locale code, language, or region. Empty uses browser locale.",
        validate: byStream.parseLocale,
        maxlength: 160
      },
      showDate: {
        type: "switch",
        default: "no",
        label: "Include dates",
        section: "Date & time",
        checkedValue: "yes",
        uncheckedValue: "no",
        options: { yes: "yes", no: "no" }
      },
      ...byStream.dateTimeFields({ dateWhen: ["showDate", "yes"] }),
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
        contentSized: false,
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
      listHeight: {
        type: "number",
        default: 0,
        optional: true,
        label: "Maximum list height (px)",
        description: "0 = Auto (no fixed maximum).",
        section: "Size & placement",
        min: 0,
        max: 10000,
        step: "any",
        styleSelector: "#overlay .schedule-list",
        styleProperty: "max-height",
        styleUnit: "px"
      },
      ...byStream.placementFields("#overlay .panel"),
      ...byStream.insetFields("statusInset", "Status position", "#overlay .schedule-state"),
      columns: { type: "number", default: 0, label: "Activity columns", description: "0 automatically fits columns to the activities and available width.", section: "Composition", min: 0, max: 6, step: 1 },
      spacing: { type: "number", default: 16, optional: true, label: "Activity gap (px)", section: "Composition", min: 0, max: 1000, step: "any", styleSelector: "#overlay .schedule-list", styleProperty: "gap", styleUnit: "px" },
      ...byStream.layoutFields("#overlay .panel", { heading: ["Heading", "#overlay .eyebrow"], list: ["Activities", "#overlay .schedule-list"] }),
      ...byStream.layoutFields("#overlay .schedule-entry", { activity: ["Activity", "#overlay .schedule-entry .primary"], time: ["Time", "#overlay .schedule-entry .secondary"] }, "activity"),
      currentBackground: {
        type: "color",
        default: "#440000",
        optional: true,
        label: "Current activity background",
        section: "Details",
        subsection: "Activity states",
        maxlength: 80,
        styleSelector: "#overlay .schedule-entry.current",
        styleProperty: "background-color"
      },
      currentBorderColor: {
        type: "color",
        default: "#660000",
        optional: true,
        label: "Current activity border",
        section: "Details",
        subsection: "Activity states",
        maxlength: 80,
        styleSelector: "#overlay .schedule-entry.current",
        styleProperty: "border-left-color"
      },
      endedOpacity: {
        type: "number",
        default: 50,
        optional: true,
        label: "Ended activity opacity (%)",
        section: "Details",
        subsection: "Activity states",
        min: 0,
        max: 100,
        step: "any",
        styleSelector: "#overlay .schedule-entry.ended",
        styleProperty: "opacity",
        styleUnit: "%"
      },
      ...byStream.textFields({
        heading: ["Heading", "#overlay .eyebrow"],
        activity: ["Activity title", "#overlay .schedule-entry .primary"],
        time: ["Activity time", "#overlay .schedule-entry .secondary"],
        status: ["Activity status", "#overlay .schedule-state"],
        emptyMessage: ["Empty schedule message", "#overlay .schedule-empty"]
      }),
      ...byStream.surfaceFields({ panel: ["Panel", "#overlay .panel", ["border", "shadow"]] }),
      ...byStream.surfaceFields({ entry: ["Activity card", "#overlay .schedule-entry"] }),
      ...byStream.filterFields("panelFilter", "Panel", "#overlay .panel"),
      ...byStream.filterFields("backdropFilter", "Panel backdrop", "#overlay .panel", true)
    }
  };

  const fieldDefaults = {
    statusFontSize: 16,
    timeFontSize: 18,
    panelBorderWidth: 1,
    panelBorderStyle: "solid",
    panelBorderColor: "#EEEEEE11",
    panelShadow: "yes",
    panelShadowColor: "#00000066",
    panelShadowBlur: 16,
    panelShadowY: 4,
    backdropFilterMode: "none",
    backdropFilterBlur: 12,
    headingFontSize: 24,
    headingTracking: 1.8,
    entryBackground: "#00000066",
    headingLineHeight: 27,
    activityFontSize: 24,
    activityLineHeight: 28.8,
    timeLineHeight: 20,
    statusTracking: 0.6,
    statusLineHeight: 18,
    entryRadius: 8,
    emptyMessageFontSize: 18,
    emptyMessageLineHeight: 20
  };
  for (const [name, value] of Object.entries(fieldDefaults)) {
    const field = resource.fields[name];
    field.default = value;
    delete field.styleDefault;
  }
  resource.fields.statusTracking.zeroIsDefault = true;
  resource.fields.entryRadius.zeroIsDefault = true;

  /**
   * Accept only this resource's declared content shape and limits; invalid input returns null.
   * @param {string} value Serialized content in this resource's declared format.
   * @returns {Array<unknown>|Object|null}
   */
  function parseEntries(value) {
    if (value.length > 8000) return null;
    try {
      const entries = JSON.parse(value);
      const keys = ["title", "startTime", "endTime"];
      if (
        !Array.isArray(entries) ||
        entries.length > 40 ||
        !entries.every(
          (e) => e && keys.every((k) => typeof e[k] === "string" && e[k].length <= 160) && byStream.parseTimestamp(e.startTime) !== null && byStream.parseTimestamp(e.endTime) !== null && Date.parse(e.endTime) > Date.parse(e.startTime)
        )
      )
        return null;
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
  element("h1", "eyebrow", settings.title);
  const formatter = new Intl.DateTimeFormat(settings.locale || undefined, {
    ...(settings.timeZone ? { timeZone: settings.timeZone } : {}),
    hour: "2-digit",
    minute: "2-digit",
    ...(settings.showDate === "yes" ? { month: "short", day: "numeric" } : {})
  });
  const zone = settings.timeZone ? { timeZone: settings.timeZone } : {};
  const date = byStream.dateTimeFormatter(settings.dateFormat, settings.locale, { ...zone, month: "short", day: "numeric" });
  const time = byStream.dateTimeFormatter(settings.timeFormat, settings.locale, { ...zone, hour: "2-digit", minute: "2-digit" });
  /**
   * Preserve the locale formatter when both patterns are default; otherwise compose the chosen date/time.
   * @param {Date} value Scheduled instant.
   * @returns {string} Localized schedule label.
   */
  function format(value) {
    if (settings.dateFormat === "locale" && settings.timeFormat === "locale") return formatter.format(value);
    return [settings.showDate === "yes" ? date.format(value) : "", time.format(value)].filter(Boolean).join(" ");
  }
  const list = element("div", "schedule-list");
  list.style.gridTemplateColumns = settings.columns === 0 ? "repeat(auto-fit, minmax(min(100%, 240px), 1fr))" : `repeat(${settings.columns}, minmax(0, 1fr))`;
  const rows = settings.entries.map((entry) => {
    const row = element("section", "schedule-entry", undefined, list);
    element("p", "primary", entry.title, row);
    element("p", "secondary", `${format(new Date(entry.startTime))} — ${format(new Date(entry.endTime))}`, row);
    const status = element("span", "schedule-state", "", row);
    return { row, status, start: Date.parse(entry.startTime), end: Date.parse(entry.endTime) };
  });
  if (!rows.length) element("p", "secondary schedule-empty", settings.emptyLabel);
  /**
   * Mark current and completed entries from their absolute start/end times.
   * @returns {void}
   */
  function update() {
    const now = Date.now();
    for (const entry of rows) {
      const current = now >= entry.start && now < entry.end,
        ended = now >= entry.end;
      entry.row.classList.toggle("current", current);
      entry.row.classList.toggle("ended", ended);
      entry.row.hidden = ended && settings.showEnded === "no";
      entry.status.textContent = current ? settings.nowLabel : ended ? settings.doneLabel : settings.nextLabel;
    }
  }
  byStream.watch(update);
});
