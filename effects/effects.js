// Screen Effects: validated URL settings and an native renderer with shared URL setup.
document.addEventListener("DOMContentLoaded", async () => {
  await byStream.assetsReady;
  // ===== RESOURCE DEFINITION =====

  // Defaults, URL constraints, and the field metadata consumed by the optional editor.
  const resource = {
    version: "1.3",
    title: "Screen Effects",
    description: "Rain, snow, confetti, and floating symbols.",
    preview: [960, 540],
    urlRequired: ["effect"],
    presets: true,
    sectionOrder: ["General", "Particles", "Appearance"],
    elements: {
      overlay: { label: "Appearance", selector: "#overlay .panel" },
      particle: {
        label: "Particles",
        selector: "#overlay .particle",
        fields: ["density", "speed", "motion", "wind", "motionDirection", "sizeVariation", "speedVariation", "minimumOpacity", "maximumOpacity", "spin", "rainWidth", "rainLength", "fontSize"]
      },
      symbol: { label: "Symbol", selector: '#overlay[data-effect="symbols"] .particle', parent: "particle", fields: ["symbol", "fontFamily"], when: ["effect", "symbols"] }
    },
    fields: {
      effect: {
        type: "select",
        default: "symbols",
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
        default: 128,
        label: "Particle count",
        section: "Content & behavior",
        min: 5,
        max: 200,
        step: 1
      },
      speed: {
        type: "number",
        default: 16,
        label: "Fall duration (seconds)",
        section: "Content & behavior",
        when: ["motion", "on"],
        min: 1,
        max: 60,
        step: "any"
      },
      motion: {
        type: "switch",
        default: "on",
        label: "Animation",
        section: "Content & behavior",
        description: "Off keeps the pattern static.",
        checkedValue: "on",
        uncheckedValue: "off",
        options: { on: "on", off: "off" }
      },
      wind: {
        type: "number",
        default: 256,
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
      speedVariation: { type: "number", default: 50, label: "Speed variation (%)", section: "Content & behavior", when: ["motion", "on"], subsection: "Pattern variation", min: 0, max: 100, step: "any" },
      minimumOpacity: { type: "number", default: 25, label: "Minimum particle opacity (%)", section: "Content & behavior", subsection: "Pattern variation", min: 0, max: 100, step: "any" },
      maximumOpacity: { type: "number", default: 75, label: "Maximum particle opacity (%)", section: "Content & behavior", subsection: "Pattern variation", min: 0, max: 100, step: "any" },
      performance: {
        type: "select",
        default: "standard",
        label: "Performance",
        section: "Content & behavior",
        subsection: "Pattern variation",
        description: "Low: up to 50 particles, no blur.",
        options: { standard: "standard", low: "low" }
      },
      seed: {
        type: "number",
        default: 1,
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
        min: 8,
        max: 200,
        step: "any"
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
      opacity: {
        type: "number",
        default: 50,
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
        default: 0,
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
        default: 0,
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
        default: 0.1,
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
        default: 1,
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
      backgroundColor: "#00000000",
      width: 800,
      padding: 28,
      align: "center",
      position: "center",
      radius: 8,
      shadow: 0
    }
  };

  // ===== FIELD DEFAULTS =====
  const fieldDefaults = {
    symbolFontSize: 10,
    symbolLineHeight: 11
  };
  for (const [name, value] of Object.entries(fieldDefaults)) resource.fields[name].default = value;

  // Particle variation scales from the displayed symbol size and line height.
  resource.fields.symbolFontSize.styleValue = () => "";
  resource.fields.symbolLineHeight.styleValue = () => "";

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
  root.dataset.performance = settings.performance;
  // A seeded generator keeps particle placement reproducible when the same overlay URL reloads.
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
    const baseSize = settings.effect === "symbols" ? settings.symbolFontSize : settings.fontSize;
    particle.style.fontSize = `${baseSize * (1 + (random() - 0.5) * sizeVariation)}px`;
    if (settings.effect === "symbols") particle.style.lineHeight = settings.symbolLineHeight / settings.symbolFontSize;
    particle.style.width = `${settings.fontSize * (0.55 + (random() - 0.5) * 0.5 * sizeVariation)}px`;
    particle.style.height = particle.style.width;
    particle.style.color = i % 2 ? settings.accentColor : settings.textColor;
    particle.style.backgroundColor = settings.effect === "symbols" ? "transparent" : particle.style.color;
    particle.style.opacity = (settings.minimumOpacity + random() * (settings.maximumOpacity - settings.minimumOpacity)) / 100;
  }
  // The overlay's Motion setting controls the broadcast, independent of the viewer's OS preference.
  panel.classList.toggle("still", settings.motion === "off");
  const parts = ["overlay.children", "particle", ...(settings.effect === "symbols" ? ["symbol"] : [])];
  const effects = parts.flatMap((id) => ["entrance", "exit"].map((phase) => byStream.elementMotion(settings, id, phase)));
  if (settings.motion === "off" || !effects.some((effect) => effect.frames?.length)) return;
  const exits = parts.map((id) => byStream.elementMotion(settings, id, "exit"));
  const exitTime = Math.max(0, ...exits.filter((effect) => effect.frames?.length).map(({ timing }) => timing.delay + timing.duration));
  const particles = [...panel.children].map((node) => ({ node, path: node.getAnimations().find((animation) => animation.animationName), phase: "" }));
  let width, height, travel;
  function measureParticles() {
    width = panel.clientWidth;
    height = panel.clientHeight;
    travel = innerHeight * 2.2;
    for (const item of particles) {
      const node = item.node;
      Object.assign(item, { left: node.offsetLeft, top: node.offsetTop, width: node.offsetWidth, height: node.offsetHeight });
    }
  }
  new ResizeObserver(measureParticles).observe(panel);

  // Follow the CSS flight path. A selected slide on the particle must not change its own visibility trigger.
  function paintParticles() {
    for (const item of particles) {
      const timing = item.path?.effect.getComputedTiming();
      if (timing?.progress == null) continue;
      const { node } = item;
      const reverse = settings.motionDirection === "reverse" || (settings.motionDirection === "alternate" && timing.currentIteration % 2 === 1);
      const y = item.top + (timing.progress - 0.5) * travel;
      const x = item.left + timing.progress * settings.wind;
      const visible = x < width && x + item.width > 0 && y < height && y + item.height > 0;
      const vertical = (reverse ? y + item.height : height - y) / travel;
      const drift = settings.wind * (reverse ? -1 : 1);
      const horizontal = drift ? (drift > 0 ? width - x : x + item.width) / Math.abs(drift) : Infinity;
      const phase = !visible ? "" : Math.min(vertical, horizontal) * timing.duration <= exitTime ? "exit" : "entrance";
      if (phase === item.phase) continue;
      item.phase = phase;
      if (phase === "entrance") window.byStreamResource.playEntrance?.(node);
      if (phase === "exit") window.byStreamResource.playExit?.(node);
    }
  }
  byStream.watch(measureParticles, 1000, paintParticles);
});
