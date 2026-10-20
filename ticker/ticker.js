/** Ticker: validated URL settings and an native renderer with shared URL setup. */
document.addEventListener("DOMContentLoaded", async () => {
  // ==========
  // ==== RESOURCE DEFINITION ====
  // ==========

  /** Defaults, URL constraints, and the field metadata consumed by the optional editor. */
  const resource = {
    version: "1.0",
    title: "Ticker",
    description: "News, commands, and reminders in a seamless scrolling strip.",
    preview: [960, 540],
    urlRequired: ["entries"],
    presets: true,
    fields: {
      entries: {
        type: "entries",
        default: [
          { text: "Welcome to the stream", prefix: "HELLO", icon: "✦" },
          { text: "Stay hydrated. Take a stretch break.", prefix: "REMINDER", icon: "☕" }
        ],
        label: "Messages",
        section: "Content & behavior",
        validate: parseEntries,
        maxlength: 8000,
        entries: {
          textFields: [
            ["text", "Message"],
            ["prefix", "Prefix"],
            ["icon", "Unicode icon"]
          ],
          newEntry: { text: "", prefix: "", icon: "" },
          limit: 40
        },
        addLabel: "Add entry"
      },
      mode: {
        type: "select",
        default: "scroll",
        label: "Motion",
        section: "Content & behavior",
        options: { scroll: "scroll", vertical: "vertical", fade: "fade", static: "static" }
      },
      duration: {
        type: "number",
        default: 6,
        label: "Seconds per message",
        section: "Content & behavior",
        when: ["mode", "vertical", "fade"],
        min: 1,
        max: 3600,
        step: "any"
      },
      speed: {
        type: "number",
        default: 70,
        label: "Scroll speed (px / second)",
        section: "Content & behavior",
        when: ["mode", "scroll"],
        min: 10,
        max: 400,
        step: "any"
      },
      scrollDirection: {
        type: "select",
        default: "normal",
        label: "Scroll direction",
        section: "Content & behavior",
        when: ["mode", "scroll"],
        options: { normal: "Left", reverse: "Right" },
        styleSelector: "#overlay .ticker-track",
        styleProperty: "animation-direction"
      },
      separator: {
        type: "text",
        default: "•",
        label: "Separator",
        section: "Content & behavior",
        when: ["mode", "scroll"],
        maxlength: 20
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
        default: 32,
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
        default: 1200,
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
        default: 18,
        label: "Padding (px)",
        section: "Size & placement",
        min: 0,
        max: 100,
        step: "any"
      },
      edgePadding: { type: "number", default: "", optional: true, label: "Viewport edge padding (px)", section: "Size & placement", min: 0, max: 1000, step: "any", styleSelector: "#overlay", styleProperty: "padding", styleUnit: "px" },
      ...byStream.placementFields("#overlay .panel"),
      gap: {
        type: "number",
        default: 64,
        label: "Message gap (px)",
        section: "Composition",
        when: ["mode", "scroll"],
        min: 10,
        max: 300,
        step: "any"
      },
      separatorPadding: {
        type: "number",
        default: "",
        optional: true,
        label: "Space after separator (px)",
        section: "Composition",
        when: ["mode", "scroll"],
        min: 0,
        max: 1000,
        step: "any",
        styleSelector: "#overlay .ticker-separator",
        styleProperty: "padding-right",
        styleUnit: "px"
      },
      ...byStream.layoutFields("#overlay .ticker-message", { icon: ["Icon", "#overlay .ticker-icon"], prefix: ["Prefix", "#overlay .ticker-prefix"], text: ["Message", "#overlay .ticker-text"] }),
      ...byStream.whenFields(["mode", "scroll"], byStream.fadeFields("edgeFade", "Ticker edge fade", "#overlay .ticker-viewport", "horizontal")),
      transitionDuration: { type: "number", default: 400, label: "Transition duration (ms)", section: "Animation", when: ["mode", "vertical", "fade"], min: 0, max: 10000, step: "any" },
      transitionEasing: {
        type: "select",
        default: "linear",
        label: "Transition easing",
        section: "Animation",
        when: ["mode", "vertical", "fade"],
        options: { linear: "Linear", ease: "Ease", "ease-in": "Ease in", "ease-out": "Ease out", "ease-in-out": "Ease in and out" }
      },
      ...byStream.textFields(
        {
          message: ["Message", "#overlay .ticker-message"],
          separator: ["Separator", "#overlay .ticker-separator"],
          prefix: ["Prefix", "#overlay .ticker-prefix"],
          icon: ["Icon", "#overlay .ticker-icon"]
        },
        { separator: ["mode", "scroll"] }
      ),
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
      const keys = ["text", "prefix", "icon"];
      if (!Array.isArray(entries) || entries.length > 40 || !entries.every((e) => e && keys.every((k) => typeof e[k] === "string" && e[k].length <= 160))) return null;
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
  const viewport = element("div", "ticker-viewport");
  function content(entry, parent) {
    for (const [name, value] of Object.entries({ icon: entry.icon, prefix: entry.prefix ? `${entry.prefix} ·` : "", text: entry.text })) {
      if (!value) continue;
      if (parent.childNodes.length) parent.append(" ");
      element("span", `ticker-${name}`, value, parent);
    }
  }
  if (settings.mode === "scroll") {
    const track = element("div", "ticker-track", undefined, viewport);
    const group = element("div", "ticker-group", undefined, track);
    for (const entry of settings.entries) {
      content(entry, element("span", "ticker-message", undefined, group));
      element("span", "ticker-separator", settings.separator, group);
    }
    group.style.gap = `${settings.gap}px`;
    let previous = 0;
    /**
     * Recalculate the resource layout from its current viewport and measured content.
     * @returns {void}
     */
    const resize = () => {
      const width = group.getBoundingClientRect().width;
      if (!width || width === previous) return;
      previous = width;
      track.querySelectorAll(".ticker-group:not(:first-child)").forEach((x) => x.remove());
      const copies = Math.max(2, Math.ceil(viewport.clientWidth / width) + 1);
      for (let i = 0; i < copies; i++) {
        const copy = group.cloneNode(true);
        copy.setAttribute("aria-hidden", "true");
        track.append(copy);
      }
      track.style.setProperty("--distance", `${-width}px`);
      track.style.animationDuration = `${width / settings.speed}s`;
    };
    const observer = new ResizeObserver(resize);
    observer.observe(group);
    observer.observe(viewport);
    window.addEventListener("pagehide", () => observer.disconnect());
    window.addEventListener("pageshow", () => {
      observer.observe(group);
      observer.observe(viewport);
    });
    document.fonts.ready.then(resize);
  } else {
    const display = element("div", "ticker-message", undefined, viewport);
    let previous = -1;
    /**
     * Update.
     * @returns {void}
     */
    function update() {
      const index = Math.floor(Date.now() / (settings.duration * 1000)) % settings.entries.length;
      if (index === previous) return;
      previous = index;
      display.replaceChildren();
      content(settings.entries[index], display);
      display.className = `ticker-message ${settings.mode}`;
      display.animate(
        settings.mode === "vertical"
          ? [
              { opacity: 0, transform: "translateY(100%)" },
              { opacity: 1, transform: "translateY(0)" }
            ]
          : [{ opacity: settings.mode === "static" ? 1 : 0 }, { opacity: 1 }],
        { duration: settings.transitionDuration, easing: settings.transitionEasing }
      );
    }
    byStream.watch(update);
  }
});
