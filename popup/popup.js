/**
 * File: popup/popup.js
 * @file Popup parameter validation and animated social-account rendering.
 * Deps: configurator.js, GSAP, MorphSVGPlugin, and SPA.js/_fonts.js.
 */

document.addEventListener("DOMContentLoaded", async () => {
  // ==========
  // ==== RESOURCE DEFINITION ====
  // ==========

  /** Defaults, URL constraints, and the field metadata consumed by the optional editor. */
  const resource = {
    version: "1.0",
    title: "Social popup",
    description: "Your social accounts, one animated popup at a time.",
    preview: [1280, 360],
    urlRequired: ["accounts"],
    sectionIcons: { "Social accounts": "fa-solid fa-users", Animation: "fa-solid fa-wand-magic-sparkles", Appearance: "fa-solid fa-palette" },
    previewAllow: "autoplay; gamepad *",
    fields: {
      accounts: {
        type: "entries",
        default: [{ platform: "twitch", handle: "/byUwUr" }, { platform: "youtube", handle: "@byUwUr" }],
        label: "Social accounts",
        section: "Social accounts",
        description: "Ordered account rows with platform and handle. Platforms may repeat; up to 100 rows, 160 characters per handle.",
        validate: byConfigurator.parseAccounts,
        maxlength: 20000,
        entries: { choices: "platforms", choiceKey: "platform", textFields: [["handle", "Handle or display text"]], newEntry: { platform: "twitch", handle: "" } },
        addLabel: "Add account"
      },
      pauseTime: {
        type: "number",
        default: 5,
        label: "Seconds per account",
        section: "Playback",
        description: "Seconds to display each account.",
        min: 0,
        max: 3600,
        step: "any",
        icon: "fa-clock"
      },
      inbetweenPauseTime: {
        type: "number",
        default: 5,
        label: "Seconds between cycles",
        section: "Playback",
        description: "Seconds to wait between animation cycles.",
        min: 0,
        max: 3600,
        step: "any",
        icon: "fa-hourglass-half"
      },
      mode: {
        type: "select",
        default: "right",
        label: "Direction",
        section: "Playback",
        description: "Side from which the social popups animate.",
        options: { right: "Right", left: "Left" },
        icon: "fa-clapperboard"
      },
      animationSpeed: { type: "number", default: 100, label: "Animation speed (%)", section: "Playback", min: 0, max: 100, step: "any" },
      primaryFont: {
        type: "font",
        default: "Courier New",
        label: "Font family",
        section: "Appearance",
        description: "Search Google Fonts or use an installed font. Online fonts need internet; system fonts provide a fallback.",
        maxlength: 160,
        icon: "fa-font"
      },
      fontSize: {
        type: "number",
        default: 72,
        label: "Font size (px)",
        section: "Appearance",
        description: "Account name size in pixels.",
        min: 8,
        max: 100,
        step: "any",
        icon: "fa-font"
      },
      fontWeight: {
        type: "number",
        default: 600,
        label: "Font weight",
        section: "Appearance",
        description: "Font weight in steps of 100.",
        min: 100,
        max: 900,
        step: 100,
        icon: "fa-font"
      },
      fontColor: {
        type: "color",
        default: "#300",
        label: "Text color",
        section: "Appearance",
        description: "CSS color of the account names.",
        maxlength: 160,
        icon: "fa-palette"
      },
      iconColor: {
        type: "color",
        default: "#FFFFFF",
        label: "Icon color",
        section: "Appearance",
        description: "CSS color of the social icons.",
        maxlength: 160,
        icon: "fa-palette"
      },
      textBoxColor: {
        type: "color",
        default: "#FFFFFF",
        label: "Text box color",
        section: "Appearance",
        description: "CSS background color behind the account name.",
        maxlength: 160,
        icon: "fa-palette"
      },
      iconBoxColor: {
        type: "color",
        default: "#300",
        label: "Icon box color",
        section: "Appearance",
        description: "CSS background color of the animated icon box.",
        maxlength: 160,
        icon: "fa-palette"
      },
      opacity: { type: "number", default: "", optional: true, label: "Popup opacity (%)", section: "Appearance", min: 0, max: 100, step: "any" },
      scale: {
        type: "number",
        default: 100,
        label: "Scale (%)",
        section: "Size & placement",
        description: "100% is the original size. Negative values flip both axes.",
        min: -500,
        max: 500,
        step: "any",
        icon: "fa-up-right-and-down-left-from-center"
      },
      cornerInset: { type: "number", default: "", optional: true, label: "Corner inset (px)", section: "Size & placement", min: -1000, max: 1000, step: "any", styleSelector: "#socialHolder", styleProperty: "margin-inline", styleUnit: "px" },
      textPadding: { type: "number", default: "", optional: true, label: "Text horizontal padding (px)", section: "Size & placement", min: 0, max: 1000, step: "any", styleSelector: "#nameHolder", styleProperty: "padding-inline", styleUnit: "px" },
      textYOffset: {
        type: "number",
        default: 0,
        label: "Text vertical offset (px)",
        section: "Size & placement",
        description: "Vertical text adjustment in pixels.",
        min: -100,
        max: 100,
        step: "any",
        icon: "fa-font"
      },
      ...byConfigurator.placementFields("#socialHolder"),
      ...byConfigurator.textFields({ accountName: ["Account name", "#nameHolder .name", []] }),
      ...byConfigurator.textFields({
        icon: ["Social icon", "#icons > i", ["size"]]
      }),
      ...byConfigurator.surfaceFields({ textSurface: ["Text box", "#textBox", ["border", "radius", "shadow"]] }),
      ...byConfigurator.filterFields("popupFilter", "Popup", "#socialHolder"),
    }
  };

  /** Render safe text and play the elastic square, handle, and icon sequence. */
  async function renderPopup() {
    const { accounts, mode, scale } = settings;
    const popup = document.getElementById("socialHolder");
    if (!accounts.length) return popup.remove();
    const names = document.getElementById("nameHolder");
    const icons = document.getElementById("icons");
    popup.classList.add(mode);
    popup.style.transform = `scale(${scale / 100})`;
    for (const name of ["iconBoxColor", "textBoxColor", "iconColor", "fontColor"]) popup.style.setProperty(`--${name}`, settings[name]);
    popup.style.setProperty("--font-family", byFont.family(settings.primaryFont || "Courier New", '"Courier New", Courier, monospace'));
    popup.style.setProperty("--font-size", `${settings.fontSize}px`);
    popup.style.setProperty("--font-weight", settings.fontWeight);
    popup.style.setProperty("--text-offset", `${settings.textYOffset}px`);
    for (const { platform, handle } of accounts) {
      const name = document.createElement("span");
      name.className = "name";
      name.textContent = handle;
      names.append(name);
      const icon = document.createElement("i");
      icon.className = `fa-brands fa-${platform}`;
      icon.setAttribute("aria-hidden", "true");
      icons.append(icon);
    }

    await byFont.ready(settings.primaryFont, settings.fontWeight, names.textContent);
    gsap.registerPlugin(MorphSVGPlugin);
    const square = document.getElementById("square");
    const squarePath = square.getAttribute("d");
    const direction = mode === "right" ? 1 : -1;
    const outgoing = mode === "right" ? "#bigRight" : "#bigLeft";
    const incoming = mode === "right" ? "#bigLeft" : "#bigRight";
    const littleOut = mode === "right" ? "#littleRight" : "#littleLeft";
    const littleIn = mode === "right" ? "#littleLeft" : "#littleRight";
    const textWidth = () => names.clientWidth;
    const timeline = gsap.timeline({ repeat: -1, repeatRefresh: true, repeatDelay: settings.inbetweenPauseTime });

    // Keep the original loop positions when font-dependent measurements refresh.
    timeline
      .set([names, icons], { y: 0 }, 0)
      .set("#holder", { y: 0 }, 0)
      .set("#iconBox, #iconHolder", { x: 0, y: 0 }, 0)
      .set(popup, { autoAlpha: settings.opacity === "" ? 1 : settings.opacity / 100 }, 0.3)
      .fromTo("#iconBox", { opacity: 0 }, { duration: 0.6, opacity: 1 })
      .to("#iconHolder", { duration: 0.1, x: direction * 20 })
      .to(square, { duration: 0.2, morphSVG: outgoing }, "-=0.1")
      .to("#iconBox", { duration: 0.2, x: () => direction * textWidth() }, "-=0.2")
      .to("#iconHolder", { duration: 0.1, x: 0 })
      .to("#iconHolder", { duration: 0.1, x: -direction * 20 })
      .to(square, { duration: 0.2, morphSVG: incoming }, "-=0.1")
      .to("#iconBox", { duration: 0.3, x: -direction * 30 }, "-=0.2")
      .fromTo("#textBox", { opacity: 0, scaleX: 0 }, { duration: 0.1, opacity: 1, scaleX: 1, transformOrigin: `${mode} center` }, "-=0.2")
      .to("#iconHolder", { duration: 0.1, x: 0 })
      .to(square, { duration: 0.2, morphSVG: littleOut }, "-=0.1")
      .to("#iconBox", { duration: 0.2, x: 0 }, "-=0.2")
      .to(square, { duration: 0.2, morphSVG: squarePath });

    // Each vertical bounce switches the matching handle and brand glyph together.
    for (let index = 1; index < accounts.length; index++) {
      timeline
        .to("#iconHolder", { duration: 0.1, y: -20, delay: settings.pauseTime })
        .to(square, { duration: 0.2, morphSVG: "#bigUp" }, "-=0.1")
        .to("#iconBox", { duration: 0.2, y: -20 }, "-=0.2")
        .to("#iconHolder", { duration: 0.1, y: 15 })
        .to(square, { duration: 0.2, morphSVG: "#bigDown" }, "-=0.1")
        .to("#iconBox", { duration: 0.2, y: 20 }, "-=0.2")
        .set(names, { y: `${-index * 100}px` }, "-=0.1")
        .set(icons, { y: `${-index * 120}px` }, "-=0.1")
        .to("#holder", { duration: 0.2, y: 8 }, "-=0.1")
        .to("#holder", { duration: 0.2, y: 0 })
        .to(square, { duration: 0.2, morphSVG: squarePath }, "-=0.1")
        .to("#iconBox", { duration: 0.2, y: 0 }, "-=0.2")
        .to("#iconHolder", { duration: 0.1, y: 0 }, "-=0.2");
    }

    timeline
      .to("#iconHolder", { duration: 0.1, x: -direction * 20, delay: settings.pauseTime })
      .to(square, { duration: 0.2, morphSVG: littleIn }, "-=0.1")
      .to("#iconBox", { duration: 0.2, x: -direction * 30 }, "-=0.2")
      .to("#iconHolder", { duration: 0.1, x: 0 })
      .to(square, { duration: 0.2, morphSVG: outgoing }, "-=0.1")
      .to("#iconBox", { duration: 0.3, x: () => direction * (textWidth() + 240) }, "-=0.2")
      .to("#textBox", { duration: 0.2, opacity: 0, scaleX: 0, transformOrigin: `${mode} center` }, "-=0.3")
      .set(popup, { autoAlpha: 0 });

    timeline.timeScale(settings.animationSpeed / 100);
    window.addEventListener("pagehide", () => timeline.pause());
    window.addEventListener("pageshow", (event) => {
      if (event.persisted) timeline.restart();
    });
  }

  const settings = await byConfigurator.initResource(resource);
  if (byStreamOverlay) renderPopup();
});
