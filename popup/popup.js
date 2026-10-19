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
    preview: [1280,360],
    sectionIcons: {"Social accounts":"fa-solid fa-users","Animation":"fa-solid fa-wand-magic-sparkles","Appearance":"fa-solid fa-palette"},
    previewAllow: "autoplay; gamepad *",
    fields: {
      accounts: {
        type: "entries",
        default: [ { platform: "twitch", handle: "/byUwUr" }, { platform: "youtube", handle: "@byUwUr" }, { platform: "instagram", handle: "@byUwUr" } ],
        label: "Social accounts",
        section: "Social accounts",
        description: "Ordered account rows with platform and handle. Platforms may repeat; up to 100 rows, 160 characters per handle.",
        validate: byConfigurator.parseAccounts,
        maxlength: 20000,
        entries: { choices: "platforms", choiceKey: "platform", textFields: [["handle", "Handle or display text"]], newEntry: { platform: "twitch", handle: "" } },
        addLabel: "Add account"
      },
      mode: {
        type: "select",
        default: "right",
        label: "Direction",
        section: "Animation",
        description: "Side from which the social popups animate.",
        options: { right: "Right", left: "Left" },
        icon: "fa-clapperboard"
      },
      pauseTime: {
        type: "number",
        default: 5,
        label: "Seconds per account",
        section: "Animation",
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
        section: "Animation",
        description: "Seconds to wait between animation cycles.",
        min: 0,
        max: 3600,
        step: "any",
        icon: "fa-hourglass-half"
      },
      scale: {
        type: "number",
        default: 1,
        label: "Scale",
        section: "Animation",
        description: "Size multiplier anchored to the selected top corner.",
        min: 0.1,
        max: 5,
        step: "any",
        icon: "fa-up-right-and-down-left-from-center"
      },
      iconBoxColor: {
        type: "color",
        default: "#400000",
        label: "Icon box color",
        section: "Appearance",
        description: "CSS background color of the animated icon box.",
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
      iconColor: {
        type: "color",
        default: "#FFFFFF",
        label: "Icon color",
        section: "Appearance",
        description: "CSS color of the social icons.",
        maxlength: 160,
        icon: "fa-palette"
      },
      fontColor: {
        type: "color",
        default: "#400000",
        label: "Text color",
        section: "Appearance",
        description: "CSS color of the account names.",
        maxlength: 160,
        icon: "fa-palette"
      },
      primaryFont: {
        type: "font",
        default: "Courier New",
        label: "Font family",
        section: "Appearance",
        description: "Search Google Fonts or use an installed font. Online fonts need internet; Courier provides a fallback.",
        maxlength: 160,
        icon: "fa-font"
      },
      fontWeight: {
        type: "number",
        default: 700,
        label: "Font weight",
        section: "Appearance",
        description: "Font weight in steps of 100.",
        min: 100,
        max: 900,
        step: 100,
        icon: "fa-font"
      },
      fontSizeRem: {
        type: "number",
        default: 4.5,
        label: "Font size (rem)",
        section: "Appearance",
        description: "Account name size in rem.",
        min: 0.5,
        max: 6.25,
        step: "any",
        icon: "fa-font"
      },
      textYOffsetRem: {
        type: "number",
        default: 0,
        label: "Text vertical offset (rem)",
        section: "Appearance",
        description: "Vertical text adjustment in rem.",
        min: -6.25,
        max: 6.25,
        step: "any",
        icon: "fa-font"
      }
    },
  };

  /** Render safe text and play the elastic square, handle, and icon sequence. */
  async function renderPopup() {
    const { accounts, mode, scale } = settings;
    const popup = document.getElementById("socialHolder");
    if (!accounts.length) return popup.remove();
    const names = document.getElementById("nameHolder");
    const icons = document.getElementById("icons");
    popup.classList.add(mode);
    popup.style.transform = `scale(${scale})`;
    for (const name of ["iconBoxColor", "textBoxColor", "iconColor", "fontColor"]) popup.style.setProperty(`--${name}`, settings[name]);
    popup.style.setProperty("--font-family", byFont.family(settings.primaryFont || "Courier New", "Courier, monospace"));
    popup.style.setProperty("--font-size", `${settings.fontSizeRem}rem`);
    popup.style.setProperty("--font-weight", settings.fontWeight);
    popup.style.setProperty("--text-offset", `${settings.textYOffsetRem}rem`);
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
      .set(popup, { autoAlpha: 1 }, 0.3)
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
        .set(names, { y: `${-index * 6.25}rem` }, "-=0.1")
        .set(icons, { y: `${-index * 7.5}rem` }, "-=0.1")
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

    window.addEventListener("pagehide", () => timeline.pause());
    window.addEventListener("pageshow", (event) => {
      if (event.persisted) timeline.restart();
    });
  }

  const settings = await byConfigurator.initResource(resource);
  if (byStreamOverlay) renderPopup();
});
