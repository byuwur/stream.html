document.addEventListener("DOMContentLoaded", async () => {
  await byStream.assetsReady;
  const binding = {
    type: "text",
    section: "Key bindings",
    maxlength: 40,
    description: "Use a physical key code or Off. F1 and F2 are reserved. Opposing actions cancel and reset takes priority.",
    validate: (value) => (/^[A-Za-z][A-Za-z0-9]{0,39}$/.test(value) && !["F1", "F2"].includes(value) ? value : null)
  };
  // ===== RESOURCE CONFIGURATION =====
  const resource = {
    version: "1.1",
    title: "Counter",
    description: "Count focused key presses with configurable steps and bounds. Native OBS input is TBD.",
    preview: [960, 540],
    urlRequired: ["layout"],
    presets: true,
    legacyFields: ["headingColor"],
    normalizeParameters(values) {
      const color = values.get("headingColor");
      if (color && color.replace(/^#/, "").toLowerCase() !== "ffffff" && byStream.validParameter(resource.fields, "accentColor", color)) values.set("accentColor", color);
      values.delete("headingColor");
    },
    elements: {
      overlay: { label: "Appearance", selector: "#overlay .panel" },
      heading: { label: "Heading", selector: "#overlay .heading", fields: ["heading"] },
      reading: { label: "Counter reading", selector: "#overlay .reading", container: true },
      value: { label: "Number", premade: "flip", selector: "#overlay output" },
      prefix: { label: "Prefix", selector: "#overlay .prefix", fields: ["prefix"] },
      suffix: { label: "Suffix", selector: "#overlay .suffix", fields: ["suffix"] }
    },
    fields: {
      source: {
        type: "select",
        label: "Input source",
        default: "browser",
        section: "Content & behavior",
        options: { browser: "Focused browser demo", helper: "OBS helper (TBD)" },
        description: "Open the overlay and focus it, or use OBS Interact. Native input is TBD."
      },
      layout: { type: "select", label: "Counter style", default: "digital", section: "Content & behavior", options: { digital: "Digital", minimal: "Minimal", flip: "Flip card" } },
      start: { type: "number", label: "Starting value", default: 0, section: "Content & behavior", min: -1000000000, max: 1000000000, step: 1 },
      step: { type: "number", label: "Step", default: 1, section: "Content & behavior", min: 1, max: 1000000000, step: 1 },
      bounded: { type: "switch", label: "Limit range", default: "no", section: "Content & behavior", checkedValue: "yes", uncheckedValue: "no", options: { yes: "On", no: "Off" } },
      minimum: {
        type: "number",
        label: "Lower bound",
        default: 0,
        section: "Content & behavior",
        min: -1000000000,
        max: 1000000000,
        step: 1,
        when: ["bounded", "yes"],
        description: "Reversed endpoints are sorted."
      },
      maximum: {
        type: "number",
        label: "Upper bound",
        default: 100,
        section: "Content & behavior",
        min: -1000000000,
        max: 1000000000,
        step: 1,
        when: ["bounded", "yes"],
        description: "Reversed endpoints are sorted."
      },
      increase: { ...binding, label: "Increase key", default: "F9" },
      decrease: { ...binding, label: "Decrease key", default: "F10" },
      resetKey: { ...binding, label: "Reset key", default: "Off" },
      heading: { type: "text", label: "Heading", default: "Deaths?", section: "Content & behavior", maxlength: 128 },
      prefix: { type: "text", label: "Prefix", default: "", section: "Content & behavior", maxlength: 128 },
      suffix: { type: "text", label: "Suffix", default: "", section: "Content & behavior", maxlength: 128 },
      horizontal: {
        type: "select",
        label: "Horizontal placement",
        default: "flex-start",
        section: "Size & placement",
        options: { "flex-start": "Left", center: "Center", "flex-end": "Right" },
        styleSelector: "#overlay",
        styleProperty: "justify-content"
      },
      vertical: {
        type: "select",
        label: "Vertical placement",
        default: "flex-start",
        section: "Size & placement",
        options: { "flex-start": "Top", center: "Center", "flex-end": "Bottom" },
        styleSelector: "#overlay",
        styleProperty: "align-items"
      },
      align: {
        type: "select",
        label: "Text alignment",
        default: "left",
        section: "Size & placement",
        options: { left: "Left", center: "Center", right: "Right" },
        styleSelector: "#overlay .panel",
        styleProperty: "text-align"
      },
      opacity: {
        type: "number",
        label: "Opacity (%)",
        default: 100,
        section: "Size & placement",
        min: 0,
        max: 100,
        styleSelector: "#overlay",
        styleProperty: "opacity",
        styleUnit: "%"
      },
      width: {
        type: "number",
        label: "Width (px)",
        default: 0,
        section: "Size & placement",
        min: 0,
        max: 3840,
        step: "any",
        styleSelector: "#overlay .panel",
        styleProperty: "width",
        styleValue: (settings) => (settings.width ? `${settings.width}px` : "")
      },
      textColor: { type: "color", default: "#eee", label: "Text color", section: "Appearance", styleSelector: "#overlay", styleProperty: "color" },
      fontFamily: { type: "font", default: "Courier New", label: "Base font", section: "Appearance", maxlength: 100, styleSelector: "#overlay", styleProperty: "font-family" },
      backgroundColor: {
        type: "color",
        default: "#0003",
        label: "Panel background",
        section: "Appearance",
        styleSelector: "#overlay .panel",
        styleProperty: "background-color",
        styleValue: (s) => (s.layout === "minimal" && s.backgroundColor === resource.fields.backgroundColor.default ? "transparent" : s.backgroundColor)
      },
      accentColor: { type: "color", default: "#990000", label: "Heading color", section: "Appearance", styleSelector: "#overlay .heading", styleProperty: "color" },
      ...byStream.placementFields("#overlay .panel"),
      ...byStream.textFields({
        heading: ["Heading", "#overlay .heading", ["size"]],
        value: ["Number", "#overlay output"],
        prefix: ["Prefix", "#overlay .prefix"],
        suffix: ["Suffix", "#overlay .suffix"]
      }),
      ...byStream.surfaceFields({
        panel: ["Panel", "#overlay .panel", ["padding", "radius", "border", "shadow"]],
        card: ["Number card", "#overlay output", ["background", "border", "radius", "shadow"]]
      }),
      ...byStream.filterFields("panelFilter", "Panel", "#overlay .panel"),
      ...byStream.filterFields("backdropFilter", "Panel backdrop", "#overlay .panel", true)
    },
    fieldDefaults: {
      headingFontSize: 14,
      panelRadius: 16,
      panelPadding: 8,
      panelFilterShadow: "yes",
      panelFilterShadowColor: "#00000099",
      panelFilterShadowBlur: 0,
      panelFilterShadowX: 1,
      panelFilterShadowY: 1,
      "overlay.children.entrance": "fadeInLeft",
      "overlay.children.entranceDuration": 100,
      "heading.skewX": -25,
      "heading.skewY": -5
    }
  };
  // ===== OVERLAY INITIALIZATION =====
  const settings = await byStream.initResource(resource);
  if (!byStreamOverlay) return;
  const root = document.querySelector("#overlay");
  const output = root.querySelector("output");
  root.dataset.layout = settings.layout;
  for (const name of ["heading", "prefix", "suffix"]) root.querySelector("." + name).textContent = settings[name];
  const lower = settings.bounded === "yes" ? Math.min(settings.minimum, settings.maximum) : Number.MIN_SAFE_INTEGER;
  const upper = settings.bounded === "yes" ? Math.max(settings.minimum, settings.maximum) : Number.MAX_SAFE_INTEGER;
  const clamp = (value) => Math.min(upper, Math.max(lower, value));
  const start = clamp(settings.start);
  let count = start;
  let held = new Set();
  const change = byStream.changeItems(root.querySelector(".panel"), settings, "value", () => [output]);
  const showCount = (value) =>
    change(() => {
      output.textContent = value;
    });
  showCount(String(count));

  function applyPress(keys) {
    const delta = Number(keys.has(settings.increase)) - Number(keys.has(settings.decrease));
    const value = keys.has(settings.resetKey) ? start : clamp(count + delta * settings.step);
    if (count === value) return;
    count = value;
    showCount(String(count));
  }

  const events = new AbortController();
  const { signal } = events;
  if (settings.source === "helper") {
    byStream.subscribeNative(
      "keyboard",
      (state, first) => {
        const next = new Set(state?.keys.filter((key) => key !== "Off"));
        if (state && !first) applyPress(new Set([...next].filter((key) => !held.has(key))));
        held = next;
      },
      signal
    );
  } else {
    const bindings = new Set([settings.increase, settings.decrease, settings.resetKey]);
    bindings.delete("Off");
    window.addEventListener(
      "keydown",
      (event) => {
        if (
          !bindings.has(event.code) ||
          event.repeat ||
          held.has(event.code) ||
          event.isComposing ||
          event.defaultPrevented ||
          event.ctrlKey ||
          event.altKey ||
          event.metaKey ||
          event.shiftKey ||
          event.target?.closest?.("input, textarea, select, button, a, [contenteditable]:not([contenteditable='false'])")
        )
          return;
        event.preventDefault();
        held.add(event.code);
        applyPress(new Set([event.code]));
      },
      { signal }
    );
    window.addEventListener("keyup", (event) => held.delete(event.code), { signal });
    window.addEventListener("blur", () => held.clear(), { signal });
    document.addEventListener(
      "visibilitychange",
      () => {
        if (document.hidden) held.clear();
      },
      { signal }
    );
  }
  window.addEventListener(
    "pagehide",
    (event) => {
      held.clear();
      if (!event.persisted) events.abort();
    },
    { signal }
  );
});
