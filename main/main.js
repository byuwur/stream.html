/**
 * File: main/main.js
 * @file Scene parameter validation, rendering, countdown, and rotating cards.
 * Deps: configurator.js, GSAP, and SPA.js/_fonts.js.
 */

document.addEventListener("DOMContentLoaded", async () => {
  // ==========
  // ==== RESOURCE DEFINITION ====
  // ==========

  /** Defaults, URL constraints, and the field metadata consumed by the optional editor. */
  const resource = {
    version: "1.0",
    title: "Main scene",
    description: "Set up your starting, BRB, ending, or intermission scene.",
    preview: [1920, 1080],
    urlRequired: ["sceneTitle"],
    sectionIcons: { Scene: "fa-solid fa-clapperboard", Appearance: "fa-solid fa-palette", "Social accounts": "fa-solid fa-users", Schedule: "fa-solid fa-calendar-days" },
    previewAllow: "autoplay; gamepad *",
    fields: {
      sceneTitle: {
        type: "textarea",
        default: "Ya estamos\nempezando",
        label: "Title (line breaks supported)",
        section: "Scene",
        description: "Main heading displayed on the scene. Line breaks are supported.",
        maxlength: 300,
        icon: "fa-heading",
        rows: 2
      },
      tagline: {
        type: "text",
        default: "[Mateus] byUwUr",
        label: "Subtitle",
        section: "Scene",
        description: "Subtitle displayed beneath the main heading.",
        maxlength: 160,
        icon: "fa-quote-left"
      },
      displayCountdown: {
        type: "switch",
        default: "yes",
        label: "Countdown",
        section: "Countdown",
        description: "Shows or hides the countdown area.",
        checkedValue: "yes",
        uncheckedValue: "no",
        options: { yes: "Show", no: "Hide" },
        icon: "fa-list"
      },
      countdownTime: {
        type: "number",
        default: 4,
        label: "Countdown (minutes)",
        section: "Countdown",
        when: ["displayCountdown", "yes"],
        description: "Duration of the countdown in minutes.",
        min: 0,
        max: 1440,
        step: "any",
        icon: "fa-hashtag"
      },
      countdownFormat: { type: "select", default: "stopwatch", label: "Countdown format", section: "Countdown", when: ["displayCountdown", "yes"], options: byConfigurator.durationFormats },
      countdownMessage: {
        type: "text",
        default: "cuenta regresiva tramadora",
        label: "Countdown message",
        section: "Countdown",
        when: ["displayCountdown", "yes"],
        description: "Message displayed while the timer runs.",
        maxlength: 160,
        icon: "fa-pen"
      },
      countdownOverMessage: {
        type: "text",
        default: "Vamo' a vé'.",
        label: "Finished message",
        section: "Countdown",
        when: ["displayCountdown", "yes"],
        description: "Message displayed when the timer finishes.",
        maxlength: 160,
        icon: "fa-pen"
      },
      displayBackground: { type: "switch", default: "no", label: "Background media", section: "Background", checkedValue: "yes", uncheckedValue: "no", options: { yes: "On", no: "Off" } },
      backgroundType: {
        type: "select",
        default: "image",
        label: "Background type",
        when: ["displayBackground", "yes"],
        section: "Background",
        description: "Selects image or video background media.",
        options: { video: "Video", image: "Image" },
        icon: "fa-list"
      },
      backgroundUrl: {
        type: "text",
        default: "https://byuwur.github.io/img/logo.png",
        label: "Background URL or relative path",
        when: ["displayBackground", "yes"],
        section: "Background",
        description: "Public media URL or relative file path. Does not upload a file.",
        maxlength: 160,
        icon: "fa-pen"
      },
      backgroundColor: {
        type: "color",
        default: "#00000000",
        label: "Background color",
        section: "Background",
        description: "Background color behind the scene and its media. Transparent by default.",
        maxlength: 160,
        icon: "fa-palette"
      },
      backgroundScale: { type: "number", default: 100, label: "Background scale (%)", section: "Background", min: -500, max: 500, step: "any" },
      backgroundBlur: {
        type: "number",
        default: 0,
        label: "Background blur (px)",
        section: "Background",
        description: "Background blur radius in pixels.",
        min: 0,
        max: 100,
        step: "any",
        icon: "fa-hashtag"
      },
      backgroundOverlay: {
        type: "color",
        default: "#36353A",
        label: "Background tint color",
        section: "Background",
        description: "Color of the background tint.",
        maxlength: 160,
        icon: "fa-palette"
      },
      backgroundOverlayOpacity: {
        type: "number",
        default: 0,
        label: "Background tint opacity (%)",
        section: "Background",
        description: "Opacity from 0% (transparent) to 100% (opaque).",
        min: 0,
        max: 100,
        step: "any",
        icon: "fa-hashtag"
      },
      displayBranding: {
        type: "switch",
        default: "yes",
        label: "Logo",
        section: "Branding",
        description: "Shows or hides the logo independently of the title.",
        checkedValue: "yes",
        uncheckedValue: "no",
        options: { yes: "Show", no: "Hide" },
        icon: "fa-list"
      },
      logoUrl: {
        type: "text",
        default: "https://byuwur.github.io/img/logo.png",
        label: "Logo URL or relative image path",
        section: "Branding",
        when: ["displayBranding", "yes"],
        description: "Image URL or relative path. Clearing restores the default logo URL.",
        maxlength: 160,
        icon: "fa-pen"
      },
      logoScale: {
        type: "number",
        default: 100,
        label: "Logo scale (%)",
        section: "Branding",
        when: ["displayBranding", "yes"],
        description: "100% is the original size. Negative values flip both axes.",
        min: -500,
        max: 500,
        step: "any",
        icon: "fa-hashtag"
      },
      logoOpacity: {
        type: "number",
        default: 5,
        label: "Logo opacity (%)",
        section: "Branding",
        when: ["displayBranding", "yes"],
        description: "Opacity from 0% (transparent) to 100% (opaque).",
        min: 0,
        max: 100,
        step: "any",
        icon: "fa-hashtag"
      },
      displaySocial: {
        type: "switch",
        default: "yes",
        label: "Social accounts",
        section: "Social accounts",
        description: "Shows or hides the social account area.",
        checkedValue: "yes",
        uncheckedValue: "no",
        options: { yes: "Show", no: "Hide" },
        icon: "fa-list"
      },
      accounts: {
        type: "entries",
        default: [
          { platform: "twitch", handle: "/byUwUr", heading: "Stream casi todos los días" },
          { platform: "youtube", handle: "[Mateus] @byUwUr", heading: "VODs todas las semanas" },
          { platform: "instagram", handle: "@byUwUr", heading: "Fotos de vez en cuando" }
        ],
        label: "Social accounts",
        section: "Social accounts",
        when: ["displaySocial", "yes"],
        description: "Ordered account rows with platform, handle, and heading. Platforms may repeat; up to 100 rows, 160 characters per text field.",
        validate: (value) => byConfigurator.parseAccounts(value, true),
        maxlength: 20000,
        entries: {
          choices: "platforms",
          choiceKey: "platform",
          textFields: [
            ["handle", "Handle or display text"],
            ["heading", "Heading"]
          ],
          newEntry: { platform: "twitch", handle: "", heading: "" }
        },
        addLabel: "Add account"
      },
      displaySchedule: {
        type: "switch",
        default: "no",
        label: "Schedule",
        section: "Schedule",
        description: "Shows or hides the weekly schedule.",
        checkedValue: "yes",
        uncheckedValue: "no",
        options: { yes: "Show", no: "Hide" },
        icon: "fa-list"
      },
      scheduleEntries: {
        type: "entries",
        default: { monday: "", tuesday: "", wednesday: "", thursday: "", friday: "", saturday: "", sunday: "" },
        label: "Schedule",
        section: "Schedule",
        when: ["displaySchedule", "yes"],
        description: "Weekday-to-text JSON map. Up to seven days, 160 characters per value.",
        validate: parseScheduleEntries,
        maxlength: 4000,
        entries: {
          choices: { monday: "Monday", tuesday: "Tuesday", wednesday: "Wednesday", thursday: "Thursday", friday: "Friday", saturday: "Saturday", sunday: "Sunday" },
          choiceKey: "day",
          textFields: [["text", "Schedule text"]],
          newEntry: ["monday", ""],
          limit: 7
        },
        addLabel: "Add day"
      },
      displayLabels: {
        type: "switch",
        default: "no",
        label: "Event labels",
        section: "Event labels",
        checkedValue: "yes",
        uncheckedValue: "no",
        options: { yes: "Show", no: "Hide" }
      },
      labelOneHeading: { type: "text", default: "¡Suscriptor más reciente!", label: "First event heading", section: "Event labels", when: ["displayLabels", "yes"], maxlength: 160 },
      labelTwoHeading: { type: "text", default: "Más gastón:", label: "Second event heading", section: "Event labels", when: ["displayLabels", "yes"], maxlength: 160 },
      labelThreeHeading: { type: "text", default: "Último gastón:", label: "Third event heading", section: "Event labels", when: ["displayLabels", "yes"], maxlength: 160 },
      labelFourHeading: { type: "text", default: "Nuevo Yogurt:", label: "Fourth event heading", section: "Event labels", when: ["displayLabels", "yes"], maxlength: 160 },
      primaryFont: {
        type: "font",
        default: "Courier New",
        label: "Font family",
        section: "Appearance",
        description: "Search Google Fonts or use an installed font. Online fonts need internet; system fonts provide a fallback.",
        maxlength: 160,
        icon: "fa-font"
      },
      titleSize: {
        type: "number",
        default: 72,
        label: "Title size (px)",
        section: "Appearance",
        description: "Main heading size in pixels.",
        min: 8,
        max: 200,
        step: "any",
        icon: "fa-font"
      },
      subtitleSize: {
        type: "number",
        default: 48,
        label: "Subtitle size (px)",
        section: "Appearance",
        description: "Subtitle size in pixels.",
        min: 8,
        max: 200,
        step: "any",
        icon: "fa-font"
      },
      primaryTextColor: {
        type: "color",
        default: "#FFFFFF",
        label: "Text color",
        section: "Appearance",
        description: "Color used for primary text.",
        maxlength: 160,
        icon: "fa-palette"
      },
      subTextColor: {
        type: "color",
        default: "#C9C9C9",
        label: "Secondary text color",
        section: "Appearance",
        description: "Color used for secondary text.",
        maxlength: 160,
        icon: "fa-palette"
      },
      accentColor: {
        type: "color",
        default: "#300",
        label: "Accent color",
        section: "Appearance",
        description: "Color used for accents.",
        maxlength: 160,
        icon: "fa-palette"
      },
      contentBackgrounds: { type: "color", default: "#FFFFFF1A", label: "Card backgrounds", section: "Appearance", maxlength: 80 },
      frameColor: {
        type: "color",
        default: "#300",
        label: "Frame color",
        section: "Appearance",
        description: "Color of the scene border.",
        maxlength: 160,
        icon: "fa-palette"
      },
      frameWidth: {
        type: "number",
        default: 2,
        label: "Frame width (px)",
        section: "Appearance",
        description: "Scene border thickness in pixels.",
        min: 0,
        max: 100,
        step: "any",
        icon: "fa-hashtag"
      },
      opacity: { type: "number", default: "", optional: true, label: "Scene opacity (%)", section: "Appearance", min: 0, max: 100, step: "any", styleSelector: "#scene", styleProperty: "opacity", styleUnit: "%" },
      frameInset: { type: "number", default: "", optional: true, label: "Frame inset (px)", section: "Size & placement", min: -1000, max: 1000, step: "any", styleSelector: "#frame", styleProperty: "inset", styleUnit: "px" },
      ...byConfigurator.placementFields("#scene"),
      titleVerticalOffset: { type: "number", default: -8, label: "Title vertical offset (px)", section: "Size & placement", subsection: "Title and subtitle position", min: -1080, max: 1080, step: "any" },
      subtitleVerticalOffset: { type: "number", default: 128, label: "Subtitle vertical offset (px)", section: "Size & placement", subsection: "Title and subtitle position", min: -1080, max: 1080, step: "any" },
      countdownScale: { type: "number", default: 125, label: "Countdown scale (%)", section: "Size & placement", when: ["displayCountdown", "yes"], subsection: "Countdown position", min: -500, max: 500, step: "any" },
      countdownRight: {
        type: "number",
        default: "",
        optional: true,
        label: "Countdown right (px)",
        section: "Size & placement",
        when: ["displayCountdown", "yes"],
        subsection: "Countdown position",
        min: -1000,
        max: 1000,
        step: "any",
        styleSelector: "#countdown",
        styleProperty: "right",
        styleUnit: "px"
      },
      countdownBottom: {
        type: "number",
        default: "",
        optional: true,
        label: "Countdown bottom (px)",
        section: "Size & placement",
        when: ["displayCountdown", "yes"],
        subsection: "Countdown position",
        min: -1000,
        max: 1000,
        step: "any",
        styleSelector: "#countdown",
        styleProperty: "bottom",
        styleUnit: "px"
      },
      countdownTimeVerticalOffset: {
        type: "number",
        default: 0,
        label: "Countdown vertical offset (px)",
        section: "Size & placement",
        when: ["displayCountdown", "yes"],
        subsection: "Countdown position",
        min: -1080,
        max: 1080,
        step: "any"
      },
      countdownMessageVerticalOffset: {
        type: "number",
        default: 0,
        label: "Countdown message vertical offset (px)",
        section: "Size & placement",
        when: ["displayCountdown", "yes"],
        subsection: "Countdown position",
        min: -1080,
        max: 1080,
        step: "any"
      },
      countdownEndMessageVerticalOffset: {
        type: "number",
        default: 0,
        label: "Completion message vertical offset (px)",
        section: "Size & placement",
        when: ["displayCountdown", "yes"],
        subsection: "Countdown position",
        min: -1080,
        max: 1080,
        step: "any"
      },
      socialMediaScale: { type: "number", default: 125, label: "Social scale (%)", section: "Size & placement", when: ["displaySocial", "yes"], subsection: "Social accounts position", min: -500, max: 500, step: "any" },
      updatesLeft: {
        type: "number",
        default: "",
        optional: true,
        label: "Updates left (px)",
        section: "Size & placement",
        when: ["displaySocial", "yes"],
        subsection: "Social accounts position",
        min: -1000,
        max: 1000,
        step: "any",
        styleSelector: "#updates",
        styleProperty: "left",
        styleUnit: "px"
      },
      updatesTop: {
        type: "number",
        default: "",
        optional: true,
        label: "Updates top (px)",
        section: "Size & placement",
        when: ["displaySocial", "yes"],
        subsection: "Social accounts position",
        min: -1000,
        max: 1000,
        step: "any",
        styleSelector: "#updates",
        styleProperty: "top",
        styleUnit: "px"
      },
      scheduleScale: { type: "number", default: 125, label: "Schedule scale (%)", section: "Size & placement", when: ["displaySchedule", "yes"], subsection: "Schedule position", min: -500, max: 500, step: "any" },
      labelsScale: { type: "number", default: 125, label: "Event labels scale (%)", section: "Size & placement", when: ["displayLabels", "yes"], subsection: "Event labels position", min: -500, max: 500, step: "any" },
      eventsLeft: {
        type: "number",
        default: "",
        optional: true,
        label: "Event labels left (px)",
        section: "Size & placement",
        when: ["displayLabels", "yes"],
        subsection: "Event labels position",
        min: -1000,
        max: 1000,
        step: "any",
        styleSelector: "#list",
        styleProperty: "left",
        styleUnit: "px"
      },
      eventsBottom: {
        type: "number",
        default: "",
        optional: true,
        label: "Event labels bottom (px)",
        section: "Size & placement",
        when: ["displayLabels", "yes"],
        subsection: "Event labels position",
        min: -1000,
        max: 1000,
        step: "any",
        styleSelector: "#list",
        styleProperty: "bottom",
        styleUnit: "px"
      },
      labelNameVerticalOffset: { type: "number", default: 0, label: "Event name vertical offset (px)", section: "Size & placement", when: ["displayLabels", "yes"], subsection: "Event labels position", min: -1080, max: 1080, step: "any" },
      labelHeaderVerticalOffset: {
        type: "number",
        default: 4,
        label: "Event heading vertical offset (px)",
        section: "Size & placement",
        when: ["displayLabels", "yes"],
        subsection: "Event labels position",
        min: -1080,
        max: 1080,
        step: "any"
      },
      ...byConfigurator.whenFields(["displaySchedule", "yes"], byConfigurator.layoutFields("#week", {}, "week")),
      ...byConfigurator.whenFields(["displaySocial", "yes"], byConfigurator.layoutFields("#social .network", { socialIcon: ["Social icon", "#social .icon"], socialCopy: ["Account text", "#social .inner"] }, "social")),
      animationSpeed: { type: "number", default: 100, label: "Social animation speed (%)", section: "Animation", when: ["displaySocial", "yes"], min: 0, max: 500, step: "any" },
      ...byConfigurator.textFields(
        {
          title: ["Title", "#title", ["color"]],
          subtitle: ["Subtitle", "#subtitle", ["color"]],
          socialHeading: ["Social heading", "#social .socialHead"],
          socialName: ["Social name", "#social .socialName"],
          socialIcon: ["Social icon", "#social .icon"],
          scheduleDay: ["Schedule day", "#schedule .scheduleHead"],
          scheduleTime: ["Schedule time", "#schedule .scheduleTime"],
          eventName: ["Event name", "#list .name"],
          eventHeading: ["Event heading", "#list .type"],
          countdown: ["Countdown", "#time"],
          countdownMessage: ["Countdown message", "#message"],
          countdownEnd: ["Finished message", "#endMessage"]
        },
        {
          countdown: ["displayCountdown", "yes"],
          countdownMessage: ["displayCountdown", "yes"],
          countdownEnd: ["displayCountdown", "yes"],
          socialHeading: ["displaySocial", "yes"],
          socialName: ["displaySocial", "yes"],
          socialIcon: ["displaySocial", "yes"],
          scheduleDay: ["displaySchedule", "yes"],
          scheduleTime: ["displaySchedule", "yes"],
          eventName: ["displayLabels", "yes"],
          eventHeading: ["displayLabels", "yes"]
        }
      ),
      ...byConfigurator.surfaceFields(
        {
          socialCard: ["Social card", "#social .network"],
          scheduleCard: ["Schedule card", "#schedule .day"],
          eventCard: ["Event card", "#list .event"],
          sceneFrame: ["Scene frame", "#frame", ["radius", "shadow"]]
        },
        { socialCard: ["displaySocial", "yes"], scheduleCard: ["displaySchedule", "yes"], eventCard: ["displayLabels", "yes"] }
      ),
      ...byConfigurator.filterFields("sceneFilter", "Scene", "#scene")
    },
    constants: {
      labelNameSize: 24,
      labelHeaderSize: 12,
      countdownTimeSize: 64,
      countdownMessageSize: 24,
      countdownEndMessageSize: 64
    }
  };

  const dayLabels = { monday: "Lunes", tuesday: "Martes", wednesday: "Miércoles", thursday: "Jueves", friday: "Viernes", saturday: "Sábado", sunday: "Domingo" };

  /**
   * An explicit empty schedule hides the section; invalid input retains defaults.
   * @param {unknown} value Value supplied by the caller.
   * @returns {unknown}
   */
  function parseScheduleEntries(value) {
    if (value.length > 4000) return null;
    try {
      const entries = JSON.parse(value);
      return entries &&
        typeof entries === "object" &&
        !Array.isArray(entries) &&
        Object.keys(entries).length <= 7 &&
        Object.entries(entries).every(([day, text]) => Object.hasOwn(dayLabels, day) && typeof text === "string" && text.length <= 160)
        ? entries
        : null;
    } catch {
      return null;
    }
  }

  /**
   * Apply scene settings, then run the countdown and rotate visible cards.
   * @returns {void}
   */
  function renderMain() {
    const { accounts, scheduleEntries } = settings;
    const rootStyle = document.documentElement.style;
    // CSS owns appearance; settings only provide its colors, sizes, and offsets.
    const styles = {
      "font-family": byFont.family(settings.primaryFont || "Courier New", '"Courier New", Courier, monospace'),
      "primary-color": settings.primaryTextColor,
      "secondary-color": settings.subTextColor,
      "accent-color": settings.accentColor,
      "frame-color": settings.frameColor,
      "content-background": settings.contentBackgrounds,
      "background-color": settings.backgroundColor,
      "background-tint": settings.backgroundOverlay,
      "frame-width": `${settings.frameWidth}px`,
      "logo-opacity": settings.logoOpacity / 100,
      "logo-scale": settings.logoScale / 100,
      "background-opacity": settings.backgroundOverlayOpacity / 100,
      "background-blur": `${settings.backgroundBlur}px`,
      "background-scale": settings.backgroundScale / 100
    };
    for (const [name, value] of Object.entries(styles)) rootStyle.setProperty(`--${name}`, value);
    for (const [name, value] of Object.entries(settings)) {
      if (name.endsWith("Size") || name.endsWith("Offset")) rootStyle.setProperty(`--${name}`, `${value}px`);
    }
    for (const name of ["socialMediaScale", "labelsScale", "scheduleScale", "countdownScale"]) rootStyle.setProperty(`--${name}`, settings[name] / 100);

    function setText(id, value) {
      document.getElementById(id).textContent = value ?? "";
    }
    setText("title", settings.sceneTitle);
    setText("subtitle", settings.tagline);
    setText("message", settings.countdownMessage);
    setText("endMessage", settings.countdownOverMessage);
    setText("followLine", settings.labelOneHeading);
    setText("tipLine", settings.labelTwoHeading);
    setText("bigTipLine", settings.labelThreeHeading);
    setText("subLine", settings.labelFourHeading);

    const brand = document.getElementById("brandImg");
    brand.style.backgroundImage = `url(${JSON.stringify(settings.logoUrl)})`;
    const background = document.querySelector(settings.backgroundType === "video" ? "#video video" : "#image img");
    document.getElementById(settings.backgroundType === "video" ? "image" : "video").remove();
    if (settings.displayBackground === "yes") background.src = settings.backgroundUrl;
    else background.parentElement.hidden = true;

    for (const { platform, handle, heading } of accounts) {
      if (!handle) continue;
      const item = document.createElement("div");
      item.className = "item";
      item.innerHTML = /* HTML */ `
        <div class="network">
          <div class="borderTop"></div>
          <div class="icon"><i aria-hidden="true"></i></div>
          <div class="inner">
            <div class="socialHead"></div>
            <div class="socialName"></div>
          </div>
        </div>
      `;
      item.querySelector("i").className = `fa-brands fa-${platform}`;
      item.querySelector(".socialHead").textContent = heading;
      item.querySelector(".socialName").textContent = handle;
      document.getElementById("social").append(item);
    }
    for (const [day, text] of Object.entries(scheduleEntries)) {
      const entry = document.createElement("div");
      entry.className = "day";
      entry.innerHTML = /* HTML */ `
        <div class="borderTop"></div>
        <div class="scheduleHead"></div>
        <div class="scheduleTime"></div>
      `;
      entry.querySelector(".scheduleHead").textContent = dayLabels[day];
      entry.querySelector(".scheduleTime").textContent = text;
      document.getElementById("week").append(entry);
    }
    const sections = {
      brandImg: settings.displayBranding === "yes",
      list: settings.displayLabels === "yes",
      schedule: settings.displaySchedule === "yes" && Object.keys(scheduleEntries).length > 0,
      countdown: settings.displayCountdown === "yes",
      social: settings.displaySocial === "yes" && accounts.some((entry) => entry.handle)
    };
    for (const [id, shown] of Object.entries(sections)) if (!shown) document.getElementById(id).remove();

    const time = document.getElementById("time");
    const deadline = Date.now() + settings.countdownTime * 60000;
    let countdownTimer;
    /**
     * Update countdown.
     * @returns {void}
     */
    function updateCountdown() {
      const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      time.textContent = byConfigurator.formatDuration(remaining, settings.countdownFormat, false);
      if (remaining === 0) {
        clearInterval(countdownTimer);
        time.hidden = true;
        document.getElementById("message").hidden = true;
        document.getElementById("endMessage").hidden = false;
      }
    }

    const items = [...document.querySelectorAll(".item")];
    const animation = items.length ? gsap.timeline({ repeat: -1, paused: true }) : null;
    items.forEach((item) => {
      const border = item.querySelectorAll(".borderTop");
      const icon = item.querySelector(".icon");
      const details = item.querySelectorAll(".socialHead, .socialName, .scheduleHead, .scheduleTime");
      const card = gsap.timeline();
      card
        .set(item, { autoAlpha: 1 })
        .fromTo(item, { clipPath: "inset(-2px 100% 0 0)" }, { clipPath: "inset(-2px 0% 0 0)", duration: 0.6 }, 0)
        .fromTo(border, { scaleX: 0, transformOrigin: "left center" }, { scaleX: 1, duration: 0.5 }, 0)
        .fromTo(details, { x: "-60px", opacity: 0 }, { x: 0, opacity: 1, duration: 0.7, stagger: { amount: 0.2 } }, 0.4)
        .to(details, { x: "-60px", opacity: 0, duration: 0.7, stagger: { amount: 0.2 } }, 8.7)
        .to(border, { scaleX: 0, duration: 0.5 }, 9.5)
        .to(item, { clipPath: "inset(-2px 100% 0 0)", duration: 0.6 }, 9.4)
        .set(item, { autoAlpha: 0 }, 10);
      if (icon) {
        card.fromTo(icon, { x: "-40px", opacity: 0 }, { x: 0, opacity: 1, duration: 0.6 }, 0.4).to(icon, { x: "-40px", opacity: 0, duration: 0.6 }, 9);
      }
      animation.add(card, "+=1");
    });
    animation?.timeScale(settings.animationSpeed / 100);
    function start() {
      if (time) {
        if (Date.now() < deadline) countdownTimer = setInterval(updateCountdown, 1000);
        updateCountdown();
      }
      animation?.restart();
    }
    window.addEventListener("pagehide", () => {
      clearInterval(countdownTimer);
      animation?.pause();
    });
    window.addEventListener("pageshow", (event) => {
      if (event.persisted) start();
    });
    start();
  }

  const settings = await byConfigurator.initResource(resource);
  if (byStreamOverlay) renderMain();
});
