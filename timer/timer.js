/** Timer / Countdown: validated URL settings and an native renderer with shared URL setup. */
document.addEventListener("DOMContentLoaded", async () => {
  // ==========
  // ==== RESOURCE DEFINITION ====
  // ==========

  /** Defaults, URL constraints, and the field metadata consumed by the optional editor. */
  const resource = {
    version: "1.0",
    title: "Timer / Countdown",
    description: "A reload-safe countdown or elapsed timer for your next run.",
    preview: [960, 540],
    urlRequired: ["startTime", "endTime"],
    presets: true,
    fields: {
      mode: {
        type: "select",
        default: "duration",
        label: "Timer mode",
        section: "Content & behavior",
        description: "Duration counts down from Start + duration. Restart begins again each time OBS loads it. Elapsed counts up from Start.",
        options: { duration: "duration", deadline: "deadline", elapsed: "elapsed", restart: "restart" }
      },
      duration: {
        type: "number",
        default: 300,
        label: "Duration (seconds)",
        section: "Content & behavior",
        when: ["mode", "duration", "restart", "elapsed"],
        min: 1,
        max: 31536000,
        step: "any"
      },
      startTime: {
        type: "datetime",
        default: new Date().toISOString(),
        label: "Start timestamp",
        section: "Content & behavior",
        when: ["mode", "duration", "deadline", "elapsed"],
        description: "ISO time with zone, e.g. 2026-10-10T18:00:00-05:00.",
        validate: byStream.parseTimestamp,
        maxlength: 160
      },
      endTime: {
        type: "datetime",
        default: new Date(Date.now() + 300000).toISOString(),
        label: "Deadline timestamp",
        section: "Content & behavior",
        when: ["mode", "deadline"],
        description: "Used in deadline mode; include Z or a UTC offset.",
        validate: byStream.parseTimestamp,
        maxlength: 160
      },
      label: {
        type: "text",
        default: "NEXT ROUND",
        label: "Heading",
        section: "Content & behavior",
        maxlength: 160
      },
      completion: {
        type: "text",
        default: "LET’S GO",
        label: "Completion message",
        section: "Content & behavior",
        maxlength: 160
      },
      progress: {
        type: "switch",
        default: "yes",
        label: "Show progress",
        section: "Content & behavior",
        checkedValue: "yes",
        uncheckedValue: "no",
        options: { yes: "yes", no: "no" }
      },
      elapsedLabel: { type: "text", default: "ELAPSED", label: "Elapsed message", section: "Content & behavior", when: ["mode", "elapsed"], subsection: "Status labels", maxlength: 160 },
      remainingLabel: { type: "text", default: "REMAINING", label: "Remaining message", section: "Content & behavior", when: ["mode", "duration", "deadline"], subsection: "Status labels", maxlength: 160 },
      restartLabel: { type: "text", default: "RESTARTS ON LOAD", label: "Restart message", section: "Content & behavior", when: ["mode", "restart"], subsection: "Status labels", maxlength: 160 },
      format: {
        type: "select",
        default: "clock",
        label: "Duration format",
        section: "Date & time",
        options: byStream.durationFormats
      },
      days: {
        type: "switch",
        default: "yes",
        label: "Show days",
        section: "Date & time",
        checkedValue: "yes",
        uncheckedValue: "no",
        options: { yes: "yes", no: "no" }
      },
      milliseconds: {
        type: "switch",
        default: "no",
        label: "Show milliseconds",
        section: "Date & time",
        description: "Refreshes at 20 Hz when enabled.",
        checkedValue: "yes",
        uncheckedValue: "no",
        options: { no: "no", yes: "yes" }
      },
      ...byStream.whenFields(["mode", "duration", "deadline", "elapsed"], byStream.dateTimeFields({ locale: true, timeZone: true })),
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
        default: "#202020E6",
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
      width: {
        type: "number",
        default: 800,
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
      ...byStream.layoutFields(
        "#overlay .panel",
        { heading: ["Heading", "#overlay .eyebrow"], digits: ["Time", "#overlay .timer-digits"], message: ["Message", "#overlay .secondary"], progressIndicator: ["Progress bar", "#overlay progress"] },
        "content",
        { progressIndicator: ["progress", "yes"] }
      ),
      progressColor: {
        type: "color",
        default: "",
        optional: true,
        label: "Progress color",
        section: "Details",
        when: ["progress", "yes"],
        subsection: "Progress bar",
        maxlength: 80,
        styleSelector: "#overlay",
        styleProperty: "--progress-color"
      },
      trackColor: {
        type: "color",
        default: "",
        optional: true,
        label: "Progress track color",
        section: "Details",
        when: ["progress", "yes"],
        subsection: "Progress bar",
        maxlength: 80,
        styleSelector: "#overlay",
        styleProperty: "--track-color"
      },
      barHeight: {
        type: "number",
        default: "",
        optional: true,
        label: "Progress bar height (px)",
        section: "Details",
        when: ["progress", "yes"],
        subsection: "Progress bar",
        min: 0,
        max: 1000,
        step: "any",
        styleSelector: "#overlay",
        styleProperty: "--bar-height",
        styleUnit: "px"
      },
      barRadius: {
        type: "number",
        default: "",
        optional: true,
        label: "Progress bar corner radius (px)",
        section: "Details",
        when: ["progress", "yes"],
        subsection: "Progress bar",
        min: 0,
        max: 1000,
        step: "any",
        styleSelector: "#overlay progress",
        styleProperty: "border-radius",
        styleUnit: "px"
      },
      barGap: {
        type: "number",
        default: "",
        optional: true,
        label: "Space above progress (px)",
        section: "Details",
        when: ["progress", "yes"],
        subsection: "Progress bar",
        min: -1000,
        max: 1000,
        step: "any",
        styleSelector: "#overlay progress",
        styleProperty: "margin-top",
        styleUnit: "px"
      },
      animation: {
        type: "select",
        default: "none",
        label: "Completion animation",
        section: "Animation",
        options: { none: "none", pulse: "pulse" }
      },
      completionDuration: {
        type: "number",
        default: "",
        optional: true,
        label: "Completion pulse duration (s)",
        section: "Animation",
        when: ["animation", "pulse"],
        min: 0.1,
        max: 120,
        step: "any",
        styleSelector: "#overlay .timer-digits.complete",
        styleProperty: "animation-duration",
        styleUnit: "s"
      },
      completionPulses: {
        type: "number",
        default: "",
        optional: true,
        label: "Completion pulse count",
        section: "Animation",
        when: ["animation", "pulse"],
        min: 0,
        max: 100,
        step: "any",
        styleSelector: "#overlay .timer-digits.complete",
        styleProperty: "animation-iteration-count"
      },
      ...byStream.textFields({
        heading: ["Heading", "#overlay .eyebrow"],
        digits: ["Timer", "#overlay .timer-digits"],
        message: ["Timer message", "#overlay .secondary"]
      }),
      ...byStream.surfaceFields({ panel: ["Panel", "#overlay .panel", ["border", "shadow"]] }),
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
  element("p", "eyebrow", settings.label);
  const display = element("div", "primary timer-digits");
  const message = element("p", "secondary");
  const bar = element("progress", "");
  bar.max = 1;
  bar.hidden = settings.progress === "no";
  const start = settings.mode === "restart" ? Date.now() : Date.parse(settings.startTime);
  const end = settings.mode === "deadline" ? Date.parse(settings.endTime) : start + settings.duration * 1000;
  const zone = settings.timeZone ? { timeZone: settings.timeZone } : {};
  const startDate = byStream.dateTimeFormatter(settings.dateFormat, settings.locale, { ...zone, year: "numeric", month: "numeric", day: "numeric" });
  const startTime = byStream.dateTimeFormatter(settings.timeFormat, settings.locale, { ...zone, hour: "numeric", minute: "2-digit", second: "2-digit" });
  /**
   * Update.
   * @returns {boolean}
   */
  function update() {
    const now = Date.now(),
      elapsed = settings.mode === "elapsed";
    const raw = elapsed ? Math.max(0, now - start) : Math.max(0, end - now);
    const total = elapsed || settings.milliseconds === "yes" ? Math.floor(raw / 1000) : Math.ceil(raw / 1000);
    const result = byStream.formatDuration(total, settings.format, settings.days === "yes", settings.milliseconds === "yes" ? Math.floor(raw % 1000) : null);
    const complete = !elapsed && now >= end;
    display.textContent = complete ? settings.completion : result;
    message.textContent = complete
      ? ""
      : now < start
        ? `Starts at ${startDate.format(new Date(start))} ${startTime.format(new Date(start))}`
        : elapsed
          ? settings.elapsedLabel
          : settings.mode === "restart"
            ? settings.restartLabel
            : settings.remainingLabel;
    bar.value = elapsed ? Math.min(1, raw / (settings.duration * 1000)) : Math.min(1, Math.max(0, (now - start) / Math.max(1, end - start)));
    display.classList.toggle("complete", complete && settings.animation === "pulse");
    root.dataset.complete = String(complete);
    return !complete;
  }
  byStream.watch(update, settings.milliseconds === "yes" ? 50 : 1000);
});
