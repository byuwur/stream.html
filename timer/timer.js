// Timer / Countdown: validated URL settings and a native renderer with shared URL setup.
document.addEventListener("DOMContentLoaded", async () => {
  await byStream.assetsReady;
  // ===== RESOURCE DEFINITION =====

  // Defaults, URL constraints, and the field metadata consumed by the optional editor.
  const resource = {
    version: "1.4",
    title: "Timer / Countdown",
    description: "Countdown or elapsed timer with an optional fixed start.",
    preview: [960, 540],
    urlRequired: ["mode", "startTime", "endTime"],
    presets: true,
    fieldDefaults: { "overlay.children.entrance": "fadeInDown" },
    legacyFields: ["animation", "completionDuration"],
    normalizeParameters(values) {
      if (!["animation", "completionDuration", "completionPulses"].some((key) => values.has(key))) return;
      if (!values.has("digits.entrance") && !values.has("digits.exit")) {
        values.set("digits.entrance", values.get("animation") === "none" ? "none" : "default");
        if (!values.has("digits.entranceDuration")) values.set("digits.entranceDuration", String(Number(values.get("completionDuration") || 1) * 1000));
      }
      values.delete("animation");
      values.delete("completionDuration");
    },
    elements: {
      overlay: { label: "Appearance", selector: "#overlay .panel" },
      heading: { label: "Heading", selector: "#overlay .eyebrow", fields: ["label"] },
      digits: { label: "Timer digits", premade: "custom", selector: "#overlay .timer-digits", fields: ["completion", "format", "days", "milliseconds", "completionPulses"] },
      message: { label: "Message", selector: "#overlay .secondary", fields: ["elapsedLabel", "remainingLabel", "restartLabel"] },
      bar: { label: "Progress bar", selector: "#overlay progress", fields: ["progress", "progressColor", "trackColor"], when: ["progress", "yes"] }
    },
    fields: {
      mode: {
        type: "select",
        default: "duration",
        label: "Timer mode",
        section: "Content & behavior",
        description: "Duration counts down; Elapsed counts up. Restart resets on load.",
        options: { duration: "duration", deadline: "deadline", elapsed: "elapsed", restart: "restart" }
      },
      duration: {
        type: "number",
        default: 5,
        label: "Duration (seconds)",
        section: "Content & behavior",
        when: ["mode", "duration", "restart", "elapsed"],
        min: 1,
        max: 31536000,
        step: "any"
      },
      useStartTime: {
        type: "switch",
        default: "no",
        label: "Use fixed start time",
        section: "Content & behavior",
        when: ["mode", "duration", "deadline", "elapsed"],
        description: "Off starts on load; On keeps progress across reloads.",
        checkedValue: "yes",
        uncheckedValue: "no",
        options: { yes: "On", no: "Off" }
      },
      startTime: {
        type: "datetime",
        default: "2026-11-10T17:05:04.357Z",
        label: "Start timestamp",
        section: "Content & behavior",
        when: ["useStartTime", "yes"],
        description: "ISO timestamp with Z or UTC offset.",
        validate: byStream.parseTimestamp,
        maxlength: 160
      },
      endTime: {
        type: "datetime",
        default: "2026-11-10T17:10:04.357Z",
        label: "Deadline timestamp",
        section: "Content & behavior",
        when: ["mode", "deadline"],
        description: "Include Z or a UTC offset.",
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
        default: "LET'S GO",
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
      remainingLabel: { type: "text", default: "Up next", label: "Remaining message", section: "Content & behavior", when: ["mode", "duration", "deadline"], subsection: "Status labels", maxlength: 160 },
      restartLabel: { type: "text", default: "RESTARTS ON LOAD", label: "Restart message", section: "Content & behavior", when: ["mode", "restart"], subsection: "Status labels", maxlength: 160 },
      format: {
        type: "select",
        default: "stopwatch",
        label: "Duration format",
        section: "Date & time",
        options: byStream.durationFormats
      },
      days: {
        type: "switch",
        default: "no",
        label: "Show days",
        section: "Date & time",
        checkedValue: "yes",
        uncheckedValue: "no",
        options: { yes: "yes", no: "no" }
      },
      milliseconds: {
        type: "switch",
        default: "yes",
        label: "Show milliseconds",
        section: "Date & time",
        description: "Updates 20 times per second.",
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
        description: "Google or installed fonts; offline uses a system fallback.",
        maxlength: 100
      },
      fontSize: {
        type: "number",
        default: 48,
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
      accentColor: {
        type: "color",
        default: "#660000",
        label: "Accent color",
        section: "Appearance",
        maxlength: 80
      },
      backgroundColor: {
        type: "color",
        default: "#0006",
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
        default: 480,
        label: "Maximum width (px)",
        description: "0 removes the limit.",
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
        default: 16,
        label: "Padding (px)",
        section: "Size & placement",
        min: 0,
        max: 100,
        step: "any"
      },
      edgePadding: { type: "number", default: 16, optional: true, label: "Viewport edge padding (px)", section: "Size & placement", min: 0, max: 1000, step: "any", styleSelector: "#overlay", styleProperty: "padding", styleUnit: "px" },
      ...byStream.placementFields("#overlay .panel"),
      ...byStream.layoutFields(
        "#overlay .panel",
        { heading: ["Heading", "#overlay .eyebrow"], digits: ["Time", "#overlay .timer-digits"], message: ["Message", "#overlay .secondary"], progressIndicator: ["Progress bar", "#overlay progress"] },
        "content",
        { progressIndicator: ["progress", "yes"] }
      ),
      progressColor: {
        type: "color",
        default: "#660000",
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
        default: "#eee6",
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
        default: 8,
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
        default: 8,
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
        default: 16,
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
      completionPulses: {
        type: "number",
        default: 3,
        optional: true,
        label: "Completion pulse count",
        section: "Animation",
        when: (values) => values.animate === "yes" && (values["digits.entrance"] === "default" || (values["digits.matchExit"] === "no" && values["digits.exit"] === "default")),
        min: 0,
        max: 100,
        step: "any"
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

  // ===== FIELD DEFAULTS =====
  const fieldDefaults = {
    panelBorderWidth: 1,
    panelBorderStyle: "solid",
    panelBorderColor: "#EEEEEE1A",
    backdropFilterMode: "none",
    backdropFilterBlur: 12,
    headingFontSize: 24,
    headingTracking: 1.8,
    messageFontSize: 24,
    headingLineHeight: 27,
    digitsFontSize: 48,
    digitsLineHeight: 48,
    messageLineHeight: 27
  };
  for (const [name, value] of Object.entries(fieldDefaults)) {
    const field = resource.fields[name];
    field.default = value;
    delete field.styleDefault;
  }

  // ===== OVERLAY INITIALIZATION =====
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

  // ===== TIMER DISPLAY ELEMENTS =====
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
  const showDigits = byStream.changingText(display, settings, "digits", (node, phase, timing) => {
    if (node.textContent !== settings.completion) return;
    return node.animate([{ filter: "opacity(1)" }, { filter: "opacity(0.45)" }, { filter: "opacity(1)" }], { ...timing, iterations: settings.completionPulses });
  });
  const showMessage = byStream.changingText(message, settings, "message");
  const bar = element("progress", "");
  bar.max = 1;
  bar.hidden = settings.progress === "no";

  // ===== TIMER PROGRESS AND UPDATES =====
  const start = settings.useStartTime === "yes" ? Date.parse(settings.startTime) : Date.now();
  const end = settings.mode === "deadline" ? Date.parse(settings.endTime) : start + settings.duration * 1000;
  const zone = settings.timeZone ? { timeZone: settings.timeZone } : {};
  const startDate = byStream.dateTimeFormatter(settings.dateFormat, settings.locale, {
    ...zone,
    year: "numeric",
    month: "numeric",
    day: "numeric"
  });
  const startTime = byStream.dateTimeFormatter(settings.timeFormat, settings.locale, {
    ...zone,
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit"
  });
  // Paint continuous wall-clock progress without rebuilding the timer text on every frame.
  function paintProgress(now = Date.now()) {
    bar.value = settings.mode === "elapsed" ? Math.min(1, Math.max(0, now - start) / (settings.duration * 1000)) : Math.min(1, Math.max(0, (now - start) / Math.max(1, end - start)));
  }
  /**
   * Render elapsed or remaining time, rounding countdown seconds upward until completion.
   * @returns {boolean} False stops scheduled ticks; visibility or page restoration can refresh again.
   */
  function update() {
    const now = Date.now(),
      elapsed = settings.mode === "elapsed";
    const raw = elapsed ? Math.max(0, now - start) : Math.max(0, end - now);
    const total = elapsed || settings.milliseconds === "yes" ? Math.floor(raw / 1000) : Math.ceil(raw / 1000);
    const result = byStream.formatDuration(total, settings.format, settings.days === "yes", settings.milliseconds === "yes" ? Math.floor(raw % 1000) : null);
    const complete = !elapsed && now >= end;
    showDigits(complete ? settings.completion : result, complete);
    if (complete) {
      showMessage("");
    } else if (now < start) {
      const date = new Date(start);
      showMessage(`Starts at ${startDate.format(date)} ${startTime.format(date)}`);
    } else if (elapsed) {
      showMessage(settings.elapsedLabel);
    } else if (settings.mode === "restart") {
      showMessage(settings.restartLabel);
    } else {
      showMessage(settings.remainingLabel);
    }
    paintProgress(now);
    root.dataset.complete = String(complete);
    return !complete;
  }
  byStream.watch(update, settings.milliseconds === "yes" ? 50 : 1000, settings.animate === "yes" && settings.progress === "yes" ? paintProgress : undefined);
});
