// Stream Panels shares one layout across the ordered panel entries.
document.addEventListener("DOMContentLoaded", async () => {
  await byStream.assetsReady;
  const artwork = { none: "No artwork", image: "Custom image", icon: "Font Awesome class", ...byStream.platforms };
  const blank = { label: "", artwork: "none", icon: "", image: "", filename: "" };
  const limit = 24;
  const surface = ".stream-panel";
  const accent = ".panel-accent";
  const graphic = ".panel-art";
  const label = ".panel-label";

  // ============================================================
  // PANEL SETTINGS
  // ============================================================
  function pixels(title, value, max, section, min = 0, step = "any") {
    return { label: title + " (px)", type: "number", default: value, min, max, step, section };
  }

  function parsePanels(value) {
    if (value.length > 240000) return null;
    try {
      const rows = JSON.parse(value);
      if (!Array.isArray(rows) || rows.length > limit) return null;
      const result = [];
      for (const row of rows) {
        if (!row || typeof row.artwork !== "string" || !Object.hasOwn(artwork, row.artwork)) return null;
        const entry = { ...blank, artwork: row.artwork };
        for (const key of ["label", "filename", "icon", "image"]) {
          const text = row[key] ?? "";
          if (typeof text !== "string" || text.length > (key === "image" ? 65536 : 160)) return null;
          entry[key] = text;
        }
        if (!byStream.safeImage(entry.image) || (entry.artwork === "icon" && entry.icon && !/^(fa-(?:brands|solid|regular)) fa-[a-z0-9-]+$/.test(entry.icon))) return null;
        result.push(entry);
      }
      return result;
    } catch {
      return null;
    }
  }

  const resource = {
    title: "Stream Panels",
    version: "1.0",
    description: "Create a matching set of channel panels. Duplicate a panel to reuse its artwork and text.",
    preview: [960, 540],
    urlRequired: ["panels"],
    imageExport: { field: "panels", selector: ".panel-sheet" },
    sectionOrder: ["Panels", "Layout", "Panel", "Artwork block", "Artwork", "Text", "Appearance"],
    sectionIcons: { Panels: "fa-solid fa-table-cells-large" },
    elements: {
      panels: { label: "Panels", fields: ["panels"] },
      overlay: { label: "Layout", selector: ".panel-list", box: false, groups: ["Layout"] },
      panel: { label: "Panel", selector: surface, box: false },
      accent: { label: "Artwork block", selector: accent, box: false, fields: ["side", "blockWidth"] },
      artwork: { label: "Artwork", selector: graphic, box: false, groups: ["Artwork"], fields: ["artSize", "artX", "artY", "imageFit"] },
      label: { label: "Text", selector: label, box: false, groups: ["Text"] }
    },
    fields: {
      panels: {
        type: "entries",
        label: "Channel panels",
        section: "Panels",
        addLabel: "Add panel",
        default: [
          { ...blank, label: "byuwur.co", artwork: "image", icon: "fa-solid fa-briefcase", image: "https://byuwur.github.io/img/logo.png" },
          { ...blank, label: "Discord", artwork: "discord" },
          { ...blank, label: "/byuwur", artwork: "youtube" },
          { ...blank, label: "@byuwur", artwork: "instagram" },
          { ...blank, label: "Sponsor", artwork: "github" },
          { ...blank, label: "Subscribe", artwork: "twitch" },
          { ...blank, label: "Buy me a Pandebono", artwork: "ko-fi" },
          { ...blank, label: "Donate", artwork: "icon", icon: "fa-brands fa-paypal" },
          { ...blank, label: "Tips", artwork: "icon", icon: "fa-solid fa-hand-holding-heart" }
        ],
        maxlength: 240000,
        validate: parsePanels,
        entries: {
          choices: artwork,
          choiceKey: "artwork",
          choiceLabel: "Artwork",
          newEntry: blank,
          limit,
          duplicate: true,
          textFields: [
            ["label", "Panel text"],
            ["icon", "Font Awesome class (e.g. fa-solid fa-heart)", "text", "icon"],
            ["image", "Custom artwork", "image", "image"],
            ["filename", "Filename (defaults to panel text)"]
          ]
        }
      },
      panelWidth: pixels("Width", 360, 3840, "Layout", 1, 1),
      panelHeight: pixels("Height", 120, 2160, "Layout", 1, 1),
      inset: { ...pixels("Outer padding", 2, 200, "Layout"), description: "Space inside the image for the panel shadow." },
      side: { type: "select", label: "Artwork position", section: "Layout", default: "left", options: { left: "Left", right: "Right" } },
      blockWidth: pixels("Artwork block width", 120, 2160, "Layout"),
      artSize: pixels("Artwork size", 80, 2160, "Layout"),
      artX: pixels("Artwork horizontal offset", 0, 2160, "Layout", -2160),
      artY: pixels("Artwork vertical offset", 0, 2160, "Layout", -2160),
      imageFit: { type: "select", label: "Image fit", section: "Layout", default: "contain", options: { contain: "Contain", cover: "Cover" } },
      artColor: { type: "color", label: "Icon color", section: "Artwork", default: "#FFFFFF" },
      alignment: { type: "select", label: "Text alignment", section: "Text", default: "left", options: { left: "Left", center: "Center", right: "Right" } },
      textPadding: pixels("Text padding", 16, 400, "Text"),
      fontFamily: { type: "font", label: "Font family", section: "Text", default: "Google Sans Code", maxlength: 100 },
      fontWeight: { type: "select", label: "Font weight", section: "Text", default: "800", options: { 300: "Light", 400: "Regular", 500: "Medium", 600: "Semibold", 700: "Bold", 800: "Extra bold", 900: "Black" } },
      fontSize: pixels("Font size", 36, 400, "Text", 1),
      tracking: pixels("Letter spacing", 0, 100, "Text", -20),
      textCase: { type: "select", label: "Letter case", section: "Text", default: "uppercase", options: { none: "As written", uppercase: "Uppercase", lowercase: "Lowercase" } },
      textColor: { type: "color", label: "Text color", section: "Text", default: "#FFFFFF" },
      ...byStream.surfaceFields({ panel: ["Panel", surface, ["background", "border", "radius", "shadow"]], accent: ["Artwork block", accent, ["background"]] }),
      ...byStream.shadowFields("artShadow", "Artwork", graphic, "filter", "Artwork"),
      ...byStream.shadowFields("labelShadow", "Text", label, "text-shadow", "Text")
    },
    fieldDefaults: {
      panelBackground: "#001",
      panelRadius: 32,
      panelBorderWidth: 2,
      panelBorderColor: "#300",
      panelBorderStyle: "double",
      accentBackground: "#220000",
      artShadow: "yes",
      artShadowColor: "#000000",
      artShadowBlur: 0,
      artShadowX: -12,
      artShadowY: 12,
      labelShadow: "yes",
      labelShadowColor: "#000000",
      labelShadowBlur: 0,
      labelShadowX: 5,
      labelShadowY: 5
    }
  };
  const settings = await byStream.initResource(resource);
  if (!byStreamOverlay) return;

  // ============================================================
  // PANEL ARTWORK AND LABELS
  // ============================================================
  const list = document.querySelector(".panel-list");
  list.style.fontFamily = byFont.family(settings.fontFamily, '"Arial Narrow", sans-serif');
  for (const [key, value] of Object.entries({
    width: settings.panelWidth,
    height: settings.panelHeight,
    inset: settings.inset,
    block: settings.blockWidth,
    art: settings.artSize,
    x: settings.artX,
    y: settings.artY,
    gap: settings.textPadding,
    size: settings.fontSize,
    tracking: settings.tracking
  }))
    list.style.setProperty("--panel-" + key, value + "px");
  list.style.fontWeight = settings.fontWeight;
  list.style.color = settings.textColor;
  for (const entry of settings.panels) {
    const sheet = document.createElement("div");
    sheet.className = "panel-sheet";
    const card = document.createElement("div");
    card.className = "stream-panel";
    card.style.flexDirection = settings.side === "right" ? "row-reverse" : "row";
    if (entry.artwork !== "none") {
      const block = document.createElement("div");
      block.className = "panel-accent";
      block.style.color = settings.artColor;
      if (entry.artwork === "image") {
        if (entry.image) {
          const img = new Image();
          img.className = "panel-art";
          img.alt = "";
          img.src = entry.image;
          img.style.objectFit = settings.imageFit;
          block.append(img);
        }
      } else {
        const icon = document.createElement("i");
        icon.className = "panel-art " + (entry.artwork === "icon" ? entry.icon || "fa-solid fa-star" : "fa-brands fa-" + entry.artwork);
        icon.setAttribute("aria-hidden", "true");
        block.append(icon);
      }
      card.append(block);
    }
    const text = document.createElement("span");
    text.className = "panel-label";
    text.textContent = entry.label;
    text.style.textTransform = settings.textCase;
    text.style.textAlign = settings.alignment;
    card.append(text);
    sheet.append(card);
    list.append(sheet);
  }
});
