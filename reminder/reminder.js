/** Periodic Reminder: validated URL settings and an native renderer with shared URL setup. */
document.addEventListener("DOMContentLoaded", async () => {
  // ==========
  // ==== RESOURCE DEFINITION ====
  // ==========

  /** Defaults, URL constraints, and the field metadata consumed by the optional editor. */
  const resource = {
    version: "1.0",
    title: "Periodic Reminder",
    description: "Gentle automatic reminders, on your schedule.",
    preview: [960, 540],
    urlRequired: ["entries", "startTime"],
    presets: true,
    fields: {
      entries: {
        type: "entries",
        default: ["Stay hydrated. Your next great play can wait.", "Take a moment to stretch your hands."],
        label: "Reminder messages",
        section: "Content & behavior",
        validate: parseEntries,
        maxlength: 8000,
        entries: { textFields: [["text", "Reminder"]], newEntry: "", limit: 40 },
        addLabel: "Add entry"
      },
      label: { type: "text", default: "REMINDER", label: "Heading", section: "Content & behavior", maxlength: 160 },
      interval: {
        type: "number",
        default: 600,
        label: "Repeat interval (seconds)",
        section: "Content & behavior",
        min: 10,
        max: 86400,
        step: "any"
      },
      duration: {
        type: "number",
        default: 12,
        label: "Visible duration (seconds)",
        section: "Content & behavior",
        description: "Clamped to the repeat interval.",
        min: 1,
        max: 3600,
        step: "any"
      },
      transition: {
        type: "select",
        default: "fade",
        label: "Animation",
        section: "Content & behavior",
        options: { fade: "fade", slide: "slide", none: "none" }
      },
      delay: {
        type: "number",
        default: 0,
        label: "Initial delay (seconds)",
        section: "Content & behavior",
        subsection: "Scheduling",
        min: 0,
        max: 86400,
        step: "any"
      },
      startTime: {
        type: "datetime",
        default: new Date().toISOString(),
        label: "Schedule start",
        section: "Content & behavior",
        subsection: "Scheduling",
        description: "An ISO timestamp with Z or UTC offset. Reloads preserve this schedule.",
        validate: byStream.parseTimestamp,
        maxlength: 160
      },
      quietStart: {
        type: "text",
        default: "00:00",
        label: "Quiet period starts",
        section: "Content & behavior",
        subsection: "Scheduling",
        description: "HH:MM in the selected time zone. Matching start/end disables the quiet period.",
        validate: parseQuiet,
        maxlength: 160
      },
      quietEnd: {
        type: "text",
        default: "00:00",
        label: "Quiet period ends",
        section: "Content & behavior",
        subsection: "Scheduling",
        description: "Quiet periods may span midnight. Matching start/end disables the quiet period.",
        validate: parseQuiet,
        maxlength: 160
      },
      timeZone: {
        type: "timezone",
        default: "",
        label: "Quiet period time zone",
        section: "Content & behavior",
        subsection: "Scheduling",
        description: "Search by IANA name or current UTC offset. Empty uses OBS computer zone.",
        validate: byStream.parseZone,
        maxlength: 160
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
        default: 30,
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
        default: 600,
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
        default: 28,
        label: "Padding (px)",
        section: "Size & placement",
        min: 0,
        max: 100,
        step: "any"
      },
      edgePadding: { type: "number", default: "", optional: true, label: "Viewport edge padding (px)", section: "Size & placement", min: 0, max: 1000, step: "any", styleSelector: "#overlay", styleProperty: "padding", styleUnit: "px" },
      ...byStream.placementFields("#overlay .panel"),
      ...byStream.layoutFields("#overlay .panel", { heading: ["Heading", "#overlay .eyebrow"], message: ["Message", "#overlay .primary"] }),
      ...byStream.transitionFields("transition"),
      ...byStream.textFields({
        heading: ["Heading", "#overlay .eyebrow"],
        message: ["Message", "#overlay .primary"]
      }),
      ...byStream.surfaceFields({ panel: ["Panel", "#overlay .panel", ["border", "shadow"]] }),
      ...byStream.filterFields("panelFilter", "Panel", "#overlay .panel"),
      ...byStream.filterFields("backdropFilter", "Panel backdrop", "#overlay .panel", true)
    }
  };

  /**
   * Accept only this resource's declared content shape and limits; invalid input returns null.
   * @param {string} value Serialized content in this resource's declared format.
   * @returns {Array<unknown>|Object|null}
   */
  function parseEntries(value) {
    if (value.length > 8000) return null;
    try {
      const entries = JSON.parse(value);
      return Array.isArray(entries) && entries.length <= 40 && entries.every((text) => typeof text === "string" && text.length <= 160) ? entries : null;
    } catch {
      return null;
    }
  }
  function parseQuiet(value) {
    return value === "" || /^([01]\d|2[0-3]):[0-5]\d$/.test(value) ? value : null;
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
  if (!settings.entries.length) {
    panel.hidden = true;
    return;
  }
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
    panel.replaceChildren();
    render(settings.entries[index]);
    if (settings.transition !== "none")
      panel.animate(
        settings.transition === "slide"
          ? [
              { opacity: 0, transform: `translateX(${-settings.slideDistance}px)` },
              { opacity: 1, transform: "translateX(0)" }
            ]
          : [{ opacity: 0 }, { opacity: 1 }],
        { duration: settings.transitionDuration, easing: settings.transitionEasing }
      );
  }
  const quietFormat = new Intl.DateTimeFormat("en-US", {
    hourCycle: "h23",
    hour: "2-digit",
    minute: "2-digit",
    ...(settings.timeZone ? { timeZone: settings.timeZone } : {})
  });
  const start = Date.parse(settings.startTime) + settings.delay * 1000;
  /**
   * Update.
   * @returns {void}
   */
  function update() {
    const elapsed = Date.now() - start,
      interval = settings.interval * 1000;
    const local = quietFormat.format(new Date()),
      from = settings.quietStart,
      to = settings.quietEnd;
    const quiet = from && to && from !== to && (from < to ? local >= from && local < to : local >= from || local < to);
    const visible = elapsed >= 0 && !quiet && elapsed % interval < Math.min(settings.duration, settings.interval) * 1000;
    panel.hidden = !visible;
    if (visible)
      change(Math.floor(elapsed / interval) % settings.entries.length, (e) => {
        element("p", "eyebrow", settings.label);
        element("p", "primary", e);
      });
  }
  byStream.watch(update);
});
