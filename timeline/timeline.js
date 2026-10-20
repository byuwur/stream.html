/** Progress Timeline: validated URL settings and an native renderer with shared URL setup. */
document.addEventListener("DOMContentLoaded", async () => {
  // ==========
  // ==== RESOURCE DEFINITION ====
  // ==========

  /** Defaults, URL constraints, and the field metadata consumed by the optional editor. */
  const resource = {
    version: "1.0",
    title: "Progress Timeline",
    description: "From a beginning to an ending. Show where you are, and what remains.",
    preview: [960, 540],
    urlRequired: ["startTime", "endTime"],
    presets: true,
    fields: {
      startTime: {
        type: "datetime",
        default: new Date().toISOString(),
        label: "Start timestamp",
        section: "Content & behavior",
        description: "ISO timestamp with Z or UTC offset.",
        validate: byStream.parseTimestamp,
        maxlength: 160
      },
      endTime: {
        type: "datetime",
        default: new Date(Date.now() + 3600000).toISOString(),
        label: "End timestamp",
        section: "Content & behavior",
        description: "Must follow start; an invalid range displays a clear message.",
        validate: byStream.parseTimestamp,
        maxlength: 160
      },
      label: {
        type: "text",
        default: "THE JOURNEY",
        label: "Heading",
        section: "Content & behavior",
        maxlength: 160
      },
      style: {
        type: "select",
        default: "bar",
        label: "Progress style",
        section: "Content & behavior",
        options: { bar: "bar", ring: "ring", steps: "steps" }
      },
      showPercent: {
        type: "switch",
        default: "yes",
        label: "Show percentage",
        section: "Content & behavior",
        checkedValue: "yes",
        uncheckedValue: "no",
        options: { yes: "yes", no: "no" }
      },
      showRemaining: {
        type: "switch",
        default: "yes",
        label: "Show remaining duration",
        section: "Content & behavior",
        checkedValue: "yes",
        uncheckedValue: "no",
        options: { yes: "yes", no: "no" }
      },
      steps: {
        type: "number",
        default: 5,
        label: "Milestone count",
        section: "Content & behavior",
        when: ["style", "steps"],
        min: 2,
        max: 20,
        step: 1
      },
      completion: {
        type: "text",
        default: "COMPLETE",
        label: "Completion message",
        section: "Content & behavior",
        maxlength: 160
      },
      remainingFormat: { type: "select", default: "units", label: "Remaining duration format", section: "Date & time", when: ["showRemaining", "yes"], options: byStream.durationFormats },
      ...byStream.dateTimeFields({ locale: true, timeZone: true }),
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
        default: 56,
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
        {
          heading: ["Heading", "#overlay .eyebrow"],
          percent: ["Progress text", "#overlay .primary"],
          remaining: ["Remaining time", "#overlay .secondary"],
          progressIndicator: ["Progress indicator", "#overlay progress, #overlay .timeline-ring, #overlay .timeline-steps"]
        },
        "content",
        { percent: ["showPercent", "yes"], remaining: ["showRemaining", "yes"] }
      ),
      trackColor: {
        type: "color",
        default: "",
        optional: true,
        label: "Progress track color",
        section: "Details",
        when: ["style", "bar"],
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
        when: ["style", "bar"],
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
        when: ["style", "bar"],
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
        when: ["style", "bar"],
        subsection: "Progress bar",
        min: -1000,
        max: 1000,
        step: "any",
        styleSelector: "#overlay progress",
        styleProperty: "margin-top",
        styleUnit: "px"
      },
      ringSize: {
        type: "number",
        default: "",
        optional: true,
        label: "Progress ring diameter (px)",
        section: "Details",
        when: ["style", "ring"],
        subsection: "Progress ring",
        min: 0,
        max: 1000,
        step: "any",
        styleSelector: "#overlay .timeline-ring",
        styleProperty: "width",
        styleUnit: "px"
      },
      ringThickness: {
        type: "number",
        default: "",
        optional: true,
        label: "Progress ring thickness (px)",
        section: "Details",
        when: ["style", "ring"],
        subsection: "Progress ring",
        min: 0.1,
        max: 16,
        step: "any",
        styleSelector: "#overlay .timeline-ring circle",
        styleProperty: "stroke-width",
        styleUnit: "px"
      },
      ringCap: {
        type: "select",
        default: "round",
        label: "Progress ring line cap",
        section: "Details",
        when: ["style", "ring"],
        subsection: "Progress ring",
        options: { round: "Round", butt: "Flat", square: "Square" },
        styleSelector: "#overlay .ring-value",
        styleProperty: "stroke-linecap"
      },
      stepGap: {
        type: "number",
        default: "",
        optional: true,
        label: "Step gap (px)",
        section: "Details",
        when: ["style", "steps"],
        subsection: "Milestones",
        min: 0,
        max: 1000,
        step: "any",
        styleSelector: "#overlay .timeline-steps",
        styleProperty: "gap",
        styleUnit: "px"
      },
      stepRadius: {
        type: "number",
        default: "",
        optional: true,
        label: "Step corner radius (px)",
        section: "Details",
        when: ["style", "steps"],
        subsection: "Milestones",
        min: 0,
        max: 1000,
        step: "any",
        styleSelector: "#overlay .step",
        styleProperty: "border-radius",
        styleUnit: "px"
      },
      ...byStream.textFields(
        {
          heading: ["Heading", "#overlay .eyebrow"],
          progress: ["Progress text", "#overlay .primary"],
          remaining: ["Remaining time", "#overlay .secondary"]
        },
        { remaining: ["showRemaining", "yes"], progress: ["showPercent", "yes"] }
      ),
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
  const percent = element("p", "primary");
  const remaining = element("p", "secondary");
  const bar = element("progress", "");
  bar.max = 1;
  bar.hidden = settings.style !== "bar";
  let ring, steps;
  if (settings.style === "ring") {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.classList.add("timeline-ring");
    svg.setAttribute("viewBox", "0 0 120 120");
    panel.append(svg);
    for (const className of ["ring-track", "ring-value"]) {
      const circle = document.createElementNS(svg.namespaceURI, "circle");
      for (const [name, value] of Object.entries({ cx: 60, cy: 60, r: 52, fill: "none", "stroke-width": 6 })) circle.setAttribute(name, value);
      circle.setAttribute("class", className);
      svg.append(circle);
      if (className === "ring-value") ring = circle;
    }
  }
  if (settings.style === "steps") {
    steps = element("div", "timeline-steps");
    for (let i = 0; i < settings.steps; i++) element("i", "step", "", steps);
  }
  const start = Date.parse(settings.startTime),
    end = Date.parse(settings.endTime);
  const zone = settings.timeZone ? { timeZone: settings.timeZone } : {};
  const startDate = byStream.dateTimeFormatter(settings.dateFormat, settings.locale, { ...zone, year: "numeric", month: "numeric", day: "numeric" });
  const startTime = byStream.dateTimeFormatter(settings.timeFormat, settings.locale, { ...zone, hour: "numeric", minute: "2-digit", second: "2-digit" });
  /**
   * Update.
   * @returns {boolean}
   */
  function update() {
    if (end <= start) {
      percent.textContent = "Check your time range";
      remaining.textContent = "End must follow start.";
      bar.hidden = true;
      return false;
    }
    const now = Date.now(),
      progress = Math.max(0, Math.min(1, (now - start) / (end - start))),
      done = now >= end;
    root.dataset.complete = String(done);
    root.dataset.progress = String(progress);
    percent.hidden = settings.showPercent === "no" && !done;
    percent.textContent = done ? settings.completion : `${Math.floor(progress * 100)}%`;
    remaining.hidden = settings.showRemaining === "no" || done;
    const seconds = Math.max(0, Math.ceil((end - now) / 1000));
    remaining.textContent = now < start ? `Starts ${startDate.format(new Date(start))} ${startTime.format(new Date(start))}` : `${byStream.formatDuration(seconds, settings.remainingFormat, false)} remaining`;
    bar.value = progress;
    if (ring) {
      ring.style.strokeDasharray = String(2 * Math.PI * 52);
      ring.style.strokeDashoffset = String(2 * Math.PI * 52 * (1 - progress));
    }
    if (steps) Array.from(steps.children).forEach((node, i) => node.classList.toggle("reached", progress >= (i + 1) / settings.steps));
    return !done;
  }
  byStream.watch(update);
});
