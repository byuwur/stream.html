/**
 * File: popup/popup.js
 * @file Popup parameter validation and animated social-account rendering.
 * Deps: resource.js, GSAP, MorphSVGPlugin, and the declared SPA.js helpers/fonts.
 */

document.addEventListener("DOMContentLoaded", async () => {
  await byStream.assetsReady;
  // ===== RESOURCE DEFINITION =====

  // Defaults, URL constraints, and the field metadata consumed by the optional editor.
  const resource = {
    version: "1.4", // 2026-11-15
    title: "Social popup",
    description: "Animated social accounts from 90+ platforms.",
    preview: [1280, 360],
    urlRequired: ["accounts"],
    fieldDefaults: { "overlay.entrance": "default", "accountName.entrance": "fadeInDown", "icon.entrance": "fadeInUp" },
    legacyFields: ["accountNameFont", "accountNameWeight", "visualScale"],
    normalizeParameters(values) {
      // Former text overrides took precedence only when they differed from their neutral defaults.
      for (const [old, name, neutral] of [
        ["accountNameFont", "primaryFont", "Courier New"],
        ["accountNameWeight", "fontWeight", "400"]
      ]) {
        const value = values.get(old);
        if (value && value !== neutral && byStream.validParameter(resource.fields, name, value)) values.set(name, value);
        values.delete(old);
      }
      if (values.has("visualScale")) {
        const percent = (value) => (value === null || value === "" || !Number.isFinite(Number(value)) ? 100 : Math.max(-500, Math.min(500, Number(value))));
        values.set("scale", String((percent(values.get("scale")) * percent(values.get("visualScale"))) / 100));
        values.delete("visualScale");
      }
    },
    sectionOrder: ["Social accounts", "General", "Appearance"],
    sectionIcons: { "Social accounts": "fa-solid fa-users", Animation: "fa-solid fa-wand-magic-sparkles" },
    previewAllow: "autoplay; gamepad *",
    contrastLayers: [{ surface: "#iconBox", layer: "#square" }],
    elements: {
      overlay: { label: "Appearance", motionLabel: "social account", premade: "timeline", selector: "#socialHolder" },
      accountName: { label: "Account name", selector: "#nameHolder .name", fields: ["primaryFont", "fontSize", "fontWeight", "fontColor", "textYOffset", "textPadding"] },
      iconBox: { label: "Icon box", selector: "#iconBox", fields: ["iconBoxColor"] },
      icon: { label: "Social icon", selector: "#icons > i", parent: "iconBox", fields: ["iconColor"], textOverflow: false },
      textBox: { label: "Text box", container: true, selector: "#textBox", fields: ["textBoxColor"] },
      accounts: { label: "Social accounts", fields: ["accounts"] }
    },
    fields: {
      accounts: {
        type: "entries",
        default: [
          {
            platform: "twitch",
            handle: "/byUwUr"
          },
          {
            platform: "youtube",
            handle: "@byUwUr"
          }
        ],
        label: "Social accounts",
        section: "Social accounts",
        description: "Up to 100 accounts, 160 characters per handle; platforms may repeat.",
        validate: byStream.parseAccounts,
        maxlength: 20000,
        entries: { choices: "platforms", choiceKey: "platform", textFields: [["handle", "Handle or display text"]], newEntry: { platform: "twitch", handle: "" } },
        addLabel: "Add account"
      },
      pauseTime: {
        type: "number",
        default: 2,
        label: "Seconds per account",
        section: "Playback",
        min: 0,
        max: 3600,
        step: "any",
        icon: "fa-clock"
      },
      inbetweenPauseTime: {
        type: "number",
        default: 2,
        label: "Seconds between cycles",
        section: "Playback",
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
        description: "Side the popup enters from.",
        options: { right: "Right", left: "Left" },
        icon: "fa-clapperboard"
      },
      animationSpeed: { type: "number", default: 100, label: "Animation speed (%)", section: "Playback", min: 0, max: 500, step: "any" },
      primaryFont: {
        type: "font",
        default: "Courier New",
        label: "Font family",
        section: "Appearance",
        description: "Google or installed fonts; offline uses a system fallback.",
        maxlength: 160,
        icon: "fa-font"
      },
      fontSize: {
        type: "number",
        default: 72,
        label: "Font size (px)",
        section: "Appearance",
        description: "The larger of the account name and social icon sets the height of both tiles.",
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
        description: "Steps of 100.",
        min: 100,
        max: 900,
        step: 100,
        icon: "fa-font"
      },
      fontColor: {
        type: "color",
        default: "#111111",
        label: "Text color",
        section: "Appearance",
        maxlength: 160,
        icon: "fa-palette"
      },
      iconColor: {
        type: "color",
        default: "#EEEEEE",
        label: "Icon color",
        section: "Appearance",
        maxlength: 160,
        icon: "fa-palette"
      },
      textBoxColor: {
        type: "color",
        default: "#eeeeee",
        label: "Text box color",
        section: "Appearance",
        description: "Background behind the account name.",
        maxlength: 160,
        icon: "fa-palette"
      },
      iconBoxColor: {
        type: "color",
        default: "#330000",
        label: "Icon box color",
        section: "Appearance",
        description: "Icon box background.",
        maxlength: 160,
        icon: "fa-palette"
      },
      opacity: { type: "number", default: 100, optional: true, label: "Popup opacity (%)", section: "Appearance", min: 0, max: 100, step: "any" },
      scale: {
        type: "number",
        default: 100,
        label: "Scale (%)",
        section: "Size & placement",
        description: "100% keeps size; negatives flip both axes.",
        min: -2500,
        max: 2500,
        sliderMin: -500,
        sliderMax: 500,
        step: "any",
        icon: "fa-up-right-and-down-left-from-center"
      },
      cornerInset: {
        type: "number",
        default: 8,
        optional: true,
        label: "Corner inset (px)",
        section: "Size & placement",
        min: -1000,
        max: 1000,
        step: "any",
        styleSelector: "#socialHolder",
        styleProperty: "margin",
        styleUnit: "px"
      },
      textPadding: {
        type: "number",
        default: 16,
        optional: true,
        label: "Text horizontal padding (px)",
        section: "Size & placement",
        min: 16,
        max: 1000,
        step: "any",
        styleSelector: "#nameHolder",
        styleProperty: "padding-inline",
        styleUnit: "px"
      },
      textYOffset: {
        type: "number",
        default: 0,
        label: "Text vertical offset (px)",
        section: "Size & placement",
        min: -100,
        max: 100,
        step: "any",
        icon: "fa-font"
      },
      ...byStream.placementFields("#socialHolder"),
      ...byStream.textFields({ accountName: ["Account name", "#nameHolder .name", []] }),
      ...byStream.textFields({
        icon: ["Social icon", "#icons > i", ["size"]]
      }),
      ...byStream.surfaceFields({ textSurface: ["Text box", "#textBox", ["border", "radius", "shadow"]] }),
      ...byStream.filterFields("textBackdrop", "Text box backdrop", "#textBox", true),
      ...byStream.filterFields("popupFilter", "Popup", "#socialHolder")
    }
  };

  delete resource.fields.accountNameFont;
  delete resource.fields.accountNameWeight;
  delete resource.fields.visualScale;

  // ===== FIELD DEFAULTS =====
  const fieldDefaults = {
    iconColorMode: "auto",
    popupFilterShadow: "yes",
    popupFilterShadowColor: "#00000099",
    popupFilterShadowBlur: 4,
    popupFilterShadowX: 2,
    popupFilterShadowY: 2,
    textSurfaceRadius: 0,
    textSurfaceBorderWidth: 0,
    textSurfaceBorderStyle: "solid",
    textSurfaceBorderColor: "#00000010",
    textBackdropMode: "none",
    textBackdropBlur: 12,
    iconFontSize: 72,
    iconLineHeight: 100
  };
  for (const [name, value] of Object.entries(fieldDefaults)) {
    const field = resource.fields[name];
    field.default = value;
    delete field.styleDefault;
  }

  // ===== POPUP RENDERING =====
  /**
   * Render safe text and play the elastic square, handle, and icon sequence.
   * @returns {Promise<void>}
   */
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
    popup.style.setProperty("--icon-size", `${settings.iconFontSize}px`);
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
    const iconBox = document.getElementById("iconBox");
    const iconHolder = icons.parentElement;
    const contentSize = Math.max(settings.fontSize, settings.iconFontSize);
    const nudge = contentSize * 0.05;
    function iconNudge(axis) {
      const room = axis === "x" ? iconHolder.clientWidth - icons.offsetWidth : iconHolder.clientHeight - icons.offsetHeight;
      return Math.min(nudge, Math.max(0, room / 2));
    }
    const outgoing = mode === "right" ? "#bigRight" : "#bigLeft";
    const incoming = mode === "right" ? "#bigLeft" : "#bigRight";
    const littleOut = mode === "right" ? "#littleRight" : "#littleLeft";
    const littleIn = mode === "right" ? "#littleLeft" : "#littleRight";
    const textBox = document.getElementById("textBox");
    const textWidth = () => textBox.offsetWidth;
    const timeline = gsap.timeline({
      repeat: -1,
      repeatRefresh: true,
      repeatDelay: settings.inbetweenPauseTime
    });

    const resizeAccount = byStream.timelineResize(timeline);
    function accountMotion(index, phase) {
      return byStream.elementTimeline(resource, settings, [names.children[index], icons.children[index]], "overlay", phase);
    }
    const entrance = accountMotion(0, "entrance");
    const exit = accountMotion(accounts.length - 1, "exit");
    for (const [id, node] of [
      ["iconBox", iconBox],
      ["textBox", textBox]
    ]) {
      entrance.add(byStream.elementTimeline(resource, settings, node, id, "entrance", false), 0);
      exit.add(byStream.elementTimeline(resource, settings, node, id, "exit", false), 0);
    }
    const nativeIn = byStream.elementMotion(settings, "overlay", "entrance").name === "default";
    const nativeOut = byStream.elementMotion(settings, "overlay", "exit").name === "default";
    const closedText = mode === "left" ? "inset(0% 100% 0% 0%)" : "inset(0% 0% 0% 100%)";
    const openText = "inset(0% 0% 0% 0%)";
    function showAccount(sequence, index, at) {
      const previous = index ? index - 1 : accounts.length - 1;
      sequence
        .set([names.children[previous], icons.children[previous]], { display: "none" }, at)
        .set(names.children[index], { display: "block" }, at)
        .set(icons.children[index], { display: "flex" }, at)
        .call(() => resource.refreshContrast?.(), [], at);
    }
    showAccount(timeline, 0, 0);
    timeline
      .set("#holder", { y: 0 }, 0)
      .set([iconBox, icons], { x: 0, y: 0 }, 0)
      .set("#iconBox", { opacity: 1 }, 0)
      .set(textBox, { clipPath: nativeIn ? closedText : "none" }, 0)
      .set(square, { morphSVG: squarePath }, 0)
      .set(popup, { autoAlpha: settings.opacity === "" ? 1 : settings.opacity / 100 }, nativeIn ? 0.3 : 0);
    if (nativeIn) {
      timeline
        .fromTo("#iconBox", { opacity: 0 }, { duration: 0.6, opacity: 1 })
        .to(icons, { duration: 0.1, x: () => direction * iconNudge("x") })
        .to(square, { duration: 0.2, morphSVG: outgoing }, "-=0.1")
        .to("#iconBox", { duration: 0.2, x: () => direction * textWidth() }, "-=0.2")
        .to(icons, { duration: 0.1, x: 0 })
        .addLabel("reveal")
        .to(icons, { duration: 0.1, x: () => -direction * iconNudge("x") }, "reveal")
        .to(square, { duration: 0.2, morphSVG: incoming }, "reveal")
        .to("#iconBox", { duration: 0.35, x: 0, ease: "power2.out" }, "reveal")
        .to(textBox, { duration: 0.35, clipPath: openText, ease: "power2.out" }, "reveal")
        .set(textBox, { clipPath: "none" })
        .to(icons, { duration: 0.1, x: 0 }, "-=0.1")
        .to(square, { duration: 0.16, morphSVG: littleOut })
        .to(square, { duration: 0.2, morphSVG: squarePath });
    } else {
      timeline.call(() => resizeAccount([names.firstElementChild, icons.firstElementChild], nativeOut || entrance.duration() || exit.duration()), [], 0);
    }
    timeline.add(entrance, nativeIn ? 0.3 : 0);

    // Name and icon share a slot; finish the outgoing pair before revealing the next account.
    for (let index = 1; index < accounts.length; index++) {
      const leave = accountMotion(index - 1, "exit");
      const arrive = accountMotion(index, "entrance");
      const start = timeline.duration() + settings.pauseTime;
      if (!nativeIn) {
        timeline.add(leave, start);
        showAccount(timeline, index, timeline.duration());
        timeline.call(() => resizeAccount([names.children[index], icons.children[index]], nativeOut || arrive.duration() || leave.duration())).add(arrive);
        continue;
      }
      const bounce = gsap
        .timeline()
        .to(icons, { duration: 0.1, y: () => -iconNudge("y") })
        .to(square, { duration: 0.2, morphSVG: "#bigUp" }, "-=0.1")
        .to("#iconBox", { duration: 0.2, y: -nudge }, "-=0.2")
        .to(icons, { duration: 0.1, y: () => iconNudge("y") })
        .to(square, { duration: 0.2, morphSVG: "#bigDown" }, "-=0.1")
        .to("#iconBox", { duration: 0.2, y: contentSize * 0.08 }, "-=0.2");
      const swap = bounce.duration() - 0.1;
      showAccount(bounce, index, swap);
      bounce
        .to("#holder", { duration: 0.2, y: contentSize * 0.04 }, swap)
        .to("#holder", { duration: 0.2, y: 0 })
        .to(square, { duration: 0.2, morphSVG: squarePath }, "-=0.1")
        .to("#iconBox", { duration: 0.2, y: 0 }, "-=0.2")
        .to(icons, { duration: 0.1, y: 0 }, "-=0.2");
      const switchAt = start + Math.max(swap, leave.duration());
      // Keep the built-in bounce moving through the width change.
      timeline
        .add(bounce, switchAt - swap)
        .add(leave, switchAt - leave.duration())
        .add(arrive, switchAt);
    }

    const exitAt = timeline.duration() + settings.pauseTime;
    if (nativeOut) {
      timeline
        .to(icons, { duration: 0.1, x: () => -direction * iconNudge("x") }, exitAt)
        .to(square, { duration: 0.2, morphSVG: littleIn }, "-=0.1")
        .to(icons, { duration: 0.1, x: 0 })
        .addLabel("close")
        .set(textBox, { clipPath: openText }, "close")
        .to(square, { duration: 0.2, morphSVG: outgoing }, "close")
        .to("#iconBox", { duration: 0.32, x: () => direction * textWidth(), ease: "power2.in" }, "close")
        .to(textBox, { duration: 0.32, clipPath: closedText, ease: "power2.in" }, "close")
        .to("#iconBox", { duration: 0.2, x: () => direction * (textWidth() + iconBox.offsetWidth * 1.4 + Math.max(0, settings.cornerInset)), ease: "power1.in" });
    }
    timeline.add(exit, Math.max(exitAt, timeline.duration() - exit.duration())).set(popup, { autoAlpha: 0 });

    timeline.timeScale(settings.animationSpeed / 100);
    window.addEventListener("pagehide", () => timeline.pause());
    window.addEventListener("pageshow", (event) => {
      if (event.persisted) timeline.restart();
    });
  }

  // ===== OVERLAY INITIALIZATION =====
  const settings = await byStream.initResource(resource);
  if (byStreamOverlay) renderPopup();
});
