/** Screen Effects: validated URL settings and an native renderer with shared URL setup. */
document.addEventListener("DOMContentLoaded", async () => {
  // ==========
  // ==== RESOURCE DEFINITION ====
  // ==========

  /** Defaults, URL constraints, and the field metadata consumed by the optional editor. */
  const resource = {
    version: "1.0",
    title: "Screen Effects",
    description: "A little atmosphere. Rain, snow, confetti, and floating symbols.",
    preview: [960, 540],
    urlRequired: ["effect"],
    presets: true,
    fields: {
      effect: {
        type: "select",
        default: "snow",
        label: "Effect",
        section: "Content & behavior",
        options: { rain: "rain", snow: "snow", particles: "particles", confetti: "confetti", symbols: "symbols" }
      },
      symbol: {
        type: "text",
        default: "✦",
        label: "Floating symbol",
        section: "Content & behavior",
        when: ["effect", "symbols"],
        maxlength: 12
      },
      density: {
        type: "number",
        default: 45,
        label: "Particle count",
        section: "Content & behavior",
        min: 5,
        max: 200,
        step: 1
      },
      speed: {
        type: "number",
        default: 12,
        label: "Fall duration (seconds)",
        section: "Content & behavior",
        when: ["motion", "on"],
        min: 2,
        max: 60,
        step: "any"
      },
      motion: {
        type: "switch",
        default: "on",
        label: "Animation",
        section: "Content & behavior",
        description: "Choose off for a static pattern.",
        checkedValue: "on",
        uncheckedValue: "off",
        options: { on: "on", off: "off" }
      },
      wind: {
        type: "number",
        default: 60,
        label: "Horizontal drift (px)",
        section: "Content & behavior",
        when: ["motion", "on"],
        min: -600,
        max: 600,
        step: "any"
      },
      motionDirection: {
        type: "select",
        default: "normal",
        label: "Motion direction",
        section: "Content & behavior",
        when: ["motion", "on"],
        options: { normal: "Forward", reverse: "Reverse", alternate: "Alternate" },
        styleSelector: "#overlay .particle",
        styleProperty: "animation-direction"
      },
      sizeVariation: { type: "number", default: 100, label: "Size variation (%)", section: "Content & behavior", subsection: "Pattern variation", min: 0, max: 100, step: "any" },
      speedVariation: { type: "number", default: 30, label: "Speed variation (%)", section: "Content & behavior", when: ["motion", "on"], subsection: "Pattern variation", min: 0, max: 100, step: "any" },
      minimumOpacity: { type: "number", default: 20, label: "Minimum particle opacity (%)", section: "Content & behavior", subsection: "Pattern variation", min: 0, max: 100, step: "any" },
      maximumOpacity: { type: "number", default: 100, label: "Maximum particle opacity (%)", section: "Content & behavior", subsection: "Pattern variation", min: 0, max: 100, step: "any" },
      performance: {
        type: "select",
        default: "standard",
        label: "Performance",
        section: "Content & behavior",
        subsection: "Pattern variation",
        description: "Low caps particles at 50 and removes blur.",
        options: { standard: "standard", low: "low" }
      },
      seed: {
        type: "number",
        default: 17,
        label: "Pattern seed",
        section: "Content & behavior",
        subsection: "Pattern variation",
        min: 1,
        max: 999999,
        step: 1
      },
      fontFamily: { type: "font", default: "Courier New", label: "Symbol font", section: "Appearance", maxlength: 100 },
      fontSize: {
        type: "number",
        default: 10,
        label: "Base text size (px)",
        section: "Appearance",
        min: 10,
        max: 200,
        step: "any"
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
      opacity: {
        type: "number",
        default: 65,
        label: "Opacity (%)",
        section: "Appearance",
        min: 0,
        max: 100,
        step: "any"
      },
      blendMode: {
        type: "select",
        default: "normal",
        label: "Particle blend mode",
        section: "Appearance",
        options: { normal: "Normal", screen: "Screen", lighten: "Lighten", overlay: "Overlay", multiply: "Multiply" },
        styleSelector: "#overlay .effects-field",
        styleProperty: "mix-blend-mode"
      },
      ...byStream.placementFields("#overlay .panel"),
      particleRadius: {
        type: "number",
        default: "",
        optional: true,
        label: "Particle corner radius (px)",
        section: "Details",
        subsection: "Particles",
        min: 0,
        max: 1000,
        step: "any",
        styleSelector: "#overlay .particle",
        styleProperty: "border-radius",
        styleUnit: "px"
      },
      spin: {
        type: "number",
        default: "",
        optional: true,
        label: "Confetti rotation (degrees)",
        section: "Details",
        when: ["effect", "confetti"],
        subsection: "Particles",
        min: -3600,
        max: 3600,
        step: "any",
        styleSelector: "#overlay .particle",
        styleProperty: "--spin",
        styleUnit: "deg"
      },
      rainWidth: {
        type: "number",
        default: "",
        optional: true,
        label: "Rain width (px)",
        section: "Details",
        when: ["effect", "rain"],
        subsection: "Rain",
        min: 0.1,
        max: 100,
        step: "any",
        styleSelector: '#overlay[data-effect="rain"] .particle',
        styleProperty: "width",
        styleUnit: "px"
      },
      rainLength: {
        type: "number",
        default: "",
        optional: true,
        label: "Rain length (px)",
        section: "Details",
        when: ["effect", "rain"],
        subsection: "Rain",
        min: 1,
        max: 1000,
        step: "any",
        styleSelector: '#overlay[data-effect="rain"] .particle',
        styleProperty: "height",
        styleUnit: "px"
      },
      ...byStream.textFields(
        {
          symbol: ["Symbol", '#overlay[data-effect="symbols"] .particle']
        },
        { symbol: ["effect", "symbols"] }
      ),
      ...byStream.filterFields("particleFilter", "Particle", "#overlay .particle")
    },
    constants: {
      fontWeight: "400",
      backgroundColor: "#202020E6",
      width: 800,
      padding: 28,
      align: "center",
      position: "center",
      radius: 8,
      shadow: 0
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

  panel.className = "panel effects-field";
  panel.style.maxWidth = "none";
  root.style.padding = 0;
  root.dataset.effect = settings.effect;
  let state = settings.seed;
  const random = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
  const sizeVariation = settings.sizeVariation / 100;
  const speedVariation = settings.speedVariation / 100;
  const count = settings.performance === "low" ? Math.min(settings.density, 50) : settings.density;
  for (let i = 0; i < count; i++) {
    const particle = element("i", "particle", settings.effect === "symbols" ? settings.symbol : "");
    particle.style.left = `${random() * 100}%`;
    particle.style.top = `${random() * 100}%`;
    particle.style.setProperty("--drift", `${settings.wind}px`);
    particle.style.animationDuration = `${settings.speed * (1 - speedVariation + random() * speedVariation * 2)}s`;
    particle.style.animationDelay = `${-random() * settings.speed}s`;
    particle.style.fontSize = `${settings.fontSize * (1 + (random() - 0.5) * sizeVariation)}px`;
    particle.style.width = `${settings.fontSize * (0.55 + (random() - 0.5) * 0.5 * sizeVariation)}px`;
    particle.style.height = particle.style.width;
    particle.style.color = i % 2 ? settings.accentColor : settings.textColor;
    particle.style.backgroundColor = settings.effect === "symbols" ? "transparent" : particle.style.color;
    particle.style.opacity = (settings.minimumOpacity + random() * (settings.maximumOpacity - settings.minimumOpacity)) / 100;
    if (settings.performance === "standard" && settings.effect === "particles") particle.style.filter = "blur(1px)";
  }
  // The overlay's Motion setting controls the broadcast, independent of the viewer's OS preference.
  panel.classList.toggle("still", settings.motion === "off");
});
