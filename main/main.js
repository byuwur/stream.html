/**
 * File: main/main.js
 * @file Scene parameter validation, rendering, countdown, and rotating cards.
 * Deps: resource.js, GSAP, and the declared SPA.js helpers/fonts.
 */

document.addEventListener("DOMContentLoaded", async () => {
  await byStream.assetsReady;
  // ===== RESOURCE DEFINITION =====

  // Defaults, URL constraints, and the field metadata consumed by the optional editor.
  const resource = {
    version: "1.4", // 2026-11-15
    title: "Main scene",
    description: "Starting, BRB, ending, and intermission scenes.",
    preview: [1920, 1080],
    urlRequired: ["sceneTitle"],
    fieldDefaults: {
      "overlay.children.entrance": "fadeInUp",
      "social.entrance": "default",
      "countdown.entrance": "fadeInUp",
      "countdownMessage.entrance": "fadeInUp",
      "countdownEnd.entrance": "fadeInUp",
      "countdownEnd.entranceDelay": 300
    },
    sectionIcons: { Scene: "fa-solid fa-clapperboard", "Social accounts": "fa-solid fa-users", Schedule: "fa-solid fa-calendar-days" },
    previewAllow: "autoplay; gamepad *",
    contrastLayers: [
      { surface: "#scene", layer: "#bg" },
      { surface: "#scene", layer: "#image img" },
      { surface: "#scene", layer: "#bg #overlay" }
    ],
    elements: {
      overlay: { label: "Appearance", selector: "#scene" },
      background: { label: "Background", selector: "#bg", fields: ["backgroundColor"] },
      media: { label: "Media", selector: "#bg :is(#image, #video)", parent: "background", fields: ["displayBackground", "backgroundType", "backgroundUrl", "backgroundBlur", "backgroundScale"], when: ["displayBackground", "yes"] },
      tint: { label: "Tint", selector: "#bg #overlay", parent: "background", fields: ["backgroundTint", "backgroundOverlay", "backgroundOverlayOpacity", "backgroundBlendMode"], when: ["backgroundTint", "yes"] },
      frame: { label: "Frame", selector: "#frame", fields: ["frameColor", "frameWidth", "frameInset"] },
      logo: { label: "Logo", selector: "#brandImg", fields: ["displayBranding", "logoUrl", "logoScale", "logoOpacity"], when: ["displayBranding", "yes"] },
      title: { label: "Title", selector: "#title", fields: ["sceneTitle", "titleSize", "titleVerticalOffset"] },
      subtitle: { label: "Subtitle", selector: "#subtitle", fields: ["tagline", "subtitleSize", "subtitleVerticalOffset"] },
      social: { label: "Social accounts", premade: "timeline", motionItem: "socialCard", selector: "#social", fields: ["displaySocial", "accounts", "animationSpeed", "socialPosition", "socialMediaScale"], when: ["displaySocial", "yes"] },
      socialCard: { label: "Account card", container: true, selector: "#social .network", parent: "social", fields: ["socialDirection", "socialGap", "socialWrap"] },
      socialHeading: { label: "Heading", selector: "#social .socialHead", parent: "social" },
      socialName: { label: "Account name", selector: "#social .socialName", parent: "social" },
      socialIcon: { label: "Icon", selector: "#social .icon", parent: "social", textOverflow: false },
      socialCopy: { label: "Account details", container: true, selector: "#social .inner", parent: "social" },
      schedule: {
        label: "Schedule",
        motionItem: "scheduleCard",
        selector: "#schedule",
        fields: ["displaySchedule", "scheduleEntries", "schedulePosition", "scheduleScale", "weekDirection", "weekGap", "weekWrap"],
        when: ["displaySchedule", "yes"]
      },
      scheduleCard: { label: "Day card", container: true, selector: "#schedule .day", gap: true, parent: "schedule" },
      scheduleDay: { label: "Day", selector: "#schedule .scheduleHead", parent: "schedule" },
      scheduleTime: { label: "Time", selector: "#schedule .scheduleTime", parent: "schedule" },
      events: { label: "Event labels", motionItem: "eventCard", selector: "#list", fields: ["displayLabels", "eventsPosition", "labelsScale"], when: ["displayLabels", "yes"] },
      eventCard: { label: "Event card", container: true, selector: "#list .event", parent: "events" },
      eventHeading: { label: "Heading", selector: "#list .type", parent: "events", fields: ["labelOneHeading", "labelTwoHeading", "labelThreeHeading", "labelFourHeading"] },
      eventName: { label: "Name", selector: "#list .name", parent: "events" },
      timerGroup: { label: "Countdown", selector: "#countdown", fields: ["displayCountdown", "countdownTime", "countdownFormat", "countdownScale", "countdownPosition"], when: ["displayCountdown", "yes"] },
      countdown: { label: "Time", selector: "#time", parent: "timerGroup" },
      countdownMessage: { label: "Message", selector: "#message", parent: "timerGroup", fields: ["countdownMessage"] },
      countdownEnd: { label: "Finished message", selector: "#endMessage", parent: "timerGroup", fields: ["countdownOverMessage"] }
    },
    fields: {
      sceneTitle: {
        type: "textarea",
        default: "Ya casito\nempezamos",
        label: "Title (line breaks supported)",
        section: "Scene",
        maxlength: 300,
        icon: "fa-heading",
        rows: 2
      },
      tagline: {
        type: "text",
        default: "@byUwUr",
        label: "Subtitle",
        section: "Scene",
        maxlength: 160,
        icon: "fa-quote-left"
      },
      displayCountdown: {
        type: "switch",
        default: "yes",
        label: "Countdown",
        section: "Countdown",
        checkedValue: "yes",
        uncheckedValue: "no",
        options: { yes: "Show", no: "Hide" },
        icon: "fa-list"
      },
      countdownTime: {
        type: "number",
        default: 1,
        label: "Countdown (minutes)",
        section: "Countdown",
        when: ["displayCountdown", "yes"],
        min: 0,
        max: 1440,
        step: "any",
        icon: "fa-hashtag"
      },
      countdownFormat: { type: "select", default: "stopwatch", label: "Countdown format", section: "Countdown", when: ["displayCountdown", "yes"], options: byStream.durationFormats },
      countdownMessage: {
        type: "text",
        default: "cuenta regresiva tramadora",
        label: "Countdown message",
        section: "Countdown",
        when: ["displayCountdown", "yes"],
        description: "Shown while the countdown runs.",
        maxlength: 160,
        icon: "fa-pen"
      },
      countdownOverMessage: {
        type: "text",
        default: "Vamo' a vé'.",
        label: "Finished message",
        section: "Countdown",
        when: ["displayCountdown", "yes"],
        description: "Shown when the countdown ends.",
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
        options: { video: "Video", image: "Image" },
        icon: "fa-list"
      },
      backgroundUrl: {
        image: (values) => values.backgroundType === "image",
        type: "text",
        default: "https://byuwur.github.io/img/logo.png",
        label: "Background URL or relative path",
        when: ["displayBackground", "yes"],
        section: "Background",
        description: "Image or video; uploads require Image mode.",
        maxlength: 65536,
        icon: "fa-pen"
      },
      backgroundColor: {
        type: "color",
        default: "#00000000",
        label: "Background color",
        section: "Background",
        description: "Behind the scene and media; transparent by default.",
        maxlength: 160,
        icon: "fa-palette"
      },
      backgroundScale: { type: "number", default: 100, label: "Background scale (%)", section: "Background", min: -500, max: 500, step: "any" },
      backgroundBlur: {
        type: "number",
        default: 64,
        label: "Background blur (px)",
        section: "Background",
        min: 0,
        max: 100,
        step: "any",
        icon: "fa-hashtag"
      },
      backgroundTint: { type: "switch", default: "yes", label: "Background tint", section: "Background", subsection: "Tint", checkedValue: "yes", uncheckedValue: "no", options: { yes: "On", no: "Off" } },
      backgroundOverlay: {
        type: "color",
        default: "#300",
        label: "Tint color",
        section: "Background",
        subsection: "Tint",
        when: ["backgroundTint", "yes"],
        maxlength: 160,
        icon: "fa-palette"
      },
      backgroundOverlayOpacity: {
        type: "number",
        default: 1,
        label: "Tint strength (%)",
        section: "Background",
        subsection: "Tint",
        when: ["backgroundTint", "yes"],
        description: "0% transparent; 100% opaque.",
        min: 0,
        max: 100,
        step: "any",
        icon: "fa-hashtag"
      },
      backgroundBlendMode: {
        type: "select",
        default: "fill",
        label: "Blend mode",
        section: "Background",
        subsection: "Tint",
        when: ["backgroundTint", "yes"],
        options: { multiply: "Multiply", overlay: "Overlay", "soft-light": "Soft-light", color: "Color", fill: "Fill" }
      },
      displayBranding: {
        type: "switch",
        default: "yes",
        label: "Logo",
        section: "Branding",
        description: "Off hides the logo, keeping the title visible.",
        checkedValue: "yes",
        uncheckedValue: "no",
        options: { yes: "Show", no: "Hide" },
        icon: "fa-list"
      },
      logoUrl: {
        image: true,
        type: "text",
        default: "https://byuwur.github.io/img/logo.png",
        label: "Logo URL or relative image path",
        section: "Branding",
        when: ["displayBranding", "yes"],
        description: "Blank restores the default logo.",
        maxlength: 65536,
        icon: "fa-pen"
      },
      logoScale: {
        type: "number",
        default: 50,
        label: "Logo scale (%)",
        section: "Branding",
        when: ["displayBranding", "yes"],
        description: "100% keeps size; negatives flip both axes.",
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
        description: "0% transparent; 100% opaque.",
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
        checkedValue: "yes",
        uncheckedValue: "no",
        options: { yes: "Show", no: "Hide" },
        icon: "fa-list"
      },
      accounts: {
        type: "entries",
        default: [
          {
            platform: "twitch",
            handle: "/byUwUr",
            heading: "Stream casi todos los días"
          },
          {
            platform: "youtube",
            handle: "[Mateus] @byUwUr",
            heading: "VODs casi todas las semanas"
          },
          {
            platform: "instagram",
            handle: "@byUwUr",
            heading: "Fotos de vez en cuando"
          }
        ],
        label: "Social accounts",
        section: "Social accounts",
        when: ["displaySocial", "yes"],
        description: "Up to 100 accounts, 160 characters per field; platforms may repeat.",
        validate: (value) => byStream.parseAccounts(value, true),
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
        checkedValue: "yes",
        uncheckedValue: "no",
        options: { yes: "Show", no: "Hide" },
        icon: "fa-list"
      },
      scheduleEntries: {
        type: "entries",
        default: {
          monday: "",
          tuesday: "",
          wednesday: "",
          thursday: "",
          friday: "",
          saturday: "",
          sunday: ""
        },
        label: "Schedule",
        section: "Schedule",
        when: ["displaySchedule", "yes"],
        description: "Up to 7 days, 160 characters per day.",
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
        description: "Google or installed fonts; offline uses a system fallback.",
        maxlength: 160,
        icon: "fa-font"
      },
      titleSize: {
        type: "number",
        default: 72,
        label: "Title size (px)",
        section: "Appearance",
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
        min: 8,
        max: 200,
        step: "any",
        icon: "fa-font"
      },
      primaryTextColor: {
        type: "color",
        default: "#EEEEEE",
        label: "Text color",
        section: "Appearance",
        maxlength: 160,
        icon: "fa-palette"
      },
      subTextColor: {
        type: "color",
        default: "#EEEEEE99",
        label: "Secondary text color",
        section: "Appearance",
        maxlength: 160,
        icon: "fa-palette"
      },
      accentColor: {
        type: "color",
        default: "#440000",
        label: "Accent color",
        section: "Appearance",
        maxlength: 160,
        icon: "fa-palette"
      },
      contentBackgrounds: { type: "color", default: "#11111133", label: "Card backgrounds", section: "Appearance", maxlength: 80 },
      frameColor: {
        type: "color",
        default: "#440000",
        label: "Frame color",
        section: "Appearance",
        maxlength: 160,
        icon: "fa-palette"
      },
      frameWidth: {
        type: "number",
        default: 8,
        label: "Frame width (px)",
        section: "Appearance",
        min: 0,
        max: 100,
        step: "any",
        icon: "fa-hashtag"
      },
      opacity: { type: "number", default: 100, optional: true, label: "Scene opacity (%)", section: "Appearance", min: 0, max: 100, step: "any", styleSelector: "#scene", styleProperty: "opacity", styleUnit: "%" },
      frameInset: { type: "number", default: 16, optional: true, label: "Frame inset (px)", section: "Size & placement", min: -1000, max: 1000, step: "any", styleSelector: "#frame", styleProperty: "inset", styleUnit: "px" },
      ...byStream.placementFields("#scene"),
      titleVerticalOffset: { type: "number", default: 0, label: "Title vertical offset (px)", section: "Size & placement", subsection: "Title and subtitle position", min: -1080, max: 1080, step: "any" },
      subtitleVerticalOffset: { type: "number", default: 64, label: "Subtitle vertical offset (px)", section: "Size & placement", subsection: "Title and subtitle position", min: -1080, max: 1080, step: "any" },
      countdownScale: { type: "number", default: 100, label: "Countdown scale (%)", section: "Size & placement", when: ["displayCountdown", "yes"], subsection: "Countdown position", min: -500, max: 500, step: "any" },
      socialMediaScale: { type: "number", default: 100, label: "Social scale (%)", section: "Size & placement", when: ["displaySocial", "yes"], subsection: "Social accounts position", min: -500, max: 500, step: "any" },
      scheduleScale: { type: "number", default: 125, label: "Schedule scale (%)", section: "Size & placement", when: ["displaySchedule", "yes"], subsection: "Schedule position", min: -500, max: 500, step: "any" },
      labelsScale: { type: "number", default: 125, label: "Event labels scale (%)", section: "Size & placement", when: ["displayLabels", "yes"], subsection: "Event labels position", min: -500, max: 500, step: "any" },
      ...byStream.whenFields(["displaySchedule", "yes"], byStream.layoutFields("#week", {}, "week")),
      ...byStream.whenFields(["displaySocial", "yes"], byStream.layoutFields("#social .network", { socialIcon: ["Social icon", "#social .icon"], socialCopy: ["Account text", "#social .inner"] }, "social")),
      animationSpeed: { type: "number", default: 100, label: "Social animation speed (%)", section: "Animation", when: ["displaySocial", "yes"], min: 0, max: 500, step: "any" },
      countdownPosition: {
        type: "select",
        default: "bottom-right",
        label: "Corner",
        section: "Countdown",
        subsection: "Placement",
        when: ["displayCountdown", "yes"],
        options: { "top-left": "Top left", "top-right": "Top right", "bottom-left": "Bottom left", "bottom-right": "Bottom right" }
      },
      socialPosition: {
        type: "select",
        default: "top-left",
        label: "Corner",
        section: "Social accounts",
        subsection: "Placement",
        when: ["displaySocial", "yes"],
        options: { "top-left": "Top left", "top-right": "Top right", "bottom-left": "Bottom left", "bottom-right": "Bottom right" }
      },
      schedulePosition: {
        type: "select",
        default: "top-left",
        label: "Corner",
        section: "Schedule",
        subsection: "Placement",
        when: ["displaySchedule", "yes"],
        options: { "top-left": "Top left", "top-right": "Top right", "bottom-left": "Bottom left", "bottom-right": "Bottom right" }
      },
      eventsPosition: {
        type: "select",
        default: "bottom-left",
        label: "Corner",
        section: "Event labels",
        subsection: "Placement",
        when: ["displayLabels", "yes"],
        options: { "top-left": "Top left", "top-right": "Top right", "bottom-left": "Bottom left", "bottom-right": "Bottom right" }
      },
      cornerInset: { type: "number", default: 80, label: "Corner inset (px)", section: "Size & placement", subsection: "Corner groups", min: 0, max: 960, step: "any" },
      cornerGap: { type: "number", default: 16, label: "Card spacing (px)", section: "Size & placement", subsection: "Corner groups", min: 0, max: 500, step: "any" },
      cornerLayout: { type: "select", default: "row", label: "Cards sharing a corner", section: "Size & placement", subsection: "Corner groups", options: { row: "Side by side", column: "Stacked" } },
      ...byStream.textFields(
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
      ...byStream.surfaceFields(
        {
          socialCard: ["Social card", "#social .network"],
          scheduleCard: ["Schedule card", "#schedule .day"],
          eventCard: ["Event card", "#list .event"],
          sceneFrame: ["Scene frame", "#frame", ["radius", "shadow"]]
        },
        { socialCard: ["displaySocial", "yes"], scheduleCard: ["displaySchedule", "yes"], eventCard: ["displayLabels", "yes"] }
      ),
      ...byStream.whenFields(["displaySocial", "yes"], byStream.filterFields("socialCardBackdrop", "Social card backdrop", "#social .network", true)),
      ...byStream.whenFields(["displaySchedule", "yes"], byStream.filterFields("scheduleCardBackdrop", "Schedule card backdrop", "#schedule .day", true)),
      ...byStream.whenFields(["displayLabels", "yes"], byStream.filterFields("eventCardBackdrop", "Event card backdrop", "#list .event", true)),
      ...byStream.filterFields("sceneFilter", "Scene", "#scene")
    },
    constants: {
      labelNameSize: 24,
      labelHeaderSize: 18,
      countdownTimeSize: 48,
      countdownMessageSize: 28,
      countdownEndMessageSize: 48
    }
  };

  // ===== FIELD DEFAULTS =====
  const fieldDefaults = {
    socialCardRadius: 4,
    socialCardBorderWidth: 0,
    socialCardBorderStyle: "solid",
    socialCardBorderColor: "#EEEEEE1A",
    scheduleCardRadius: 6,
    scheduleCardBorderWidth: 1,
    scheduleCardBorderStyle: "solid",
    scheduleCardBorderColor: "#EEEEEE1A",
    eventCardRadius: 6,
    eventCardBorderWidth: 1,
    eventCardBorderStyle: "solid",
    eventCardBorderColor: "#EEEEEE1A",
    sceneFrameRadius: 32,
    socialCardPadding: 12,
    socialCardBackdropMode: "none",
    socialCardBackdropBlur: 12,
    scheduleCardPadding: 8,
    scheduleCardBackdropMode: "custom",
    scheduleCardBackdropBlur: 12,
    eventCardPadding: 8,
    eventCardBackdropMode: "custom",
    eventCardBackdropBlur: 12,
    socialGap: 12,
    socialHeadingFontSize: 16,
    socialNameFontSize: 24,
    socialIconFontSize: 40,
    countdownFontSize: 48,
    countdownMessageFontSize: 24,
    countdownEndFontSize: 48,
    sceneFilterMode: "custom",
    countdownLineHeight: 54,
    countdownMessageLineHeight: 27,
    countdownEndLineHeight: 54,
    socialHeadingLineHeight: 18,
    socialNameLineHeight: 27,
    socialIconLineHeight: 40,
    eventNameFontSize: 24,
    eventNameLineHeight: 24,
    eventHeadingFontSize: 18,
    eventHeadingLineHeight: 18,
    weekGap: 24,
    scheduleDayFontSize: 16,
    scheduleDayLineHeight: 18,
    scheduleTimeFontSize: 16,
    scheduleTimeLineHeight: 18,
    titleLineHeight: 82,
    subtitleLineHeight: 54
  };
  for (const [name, value] of Object.entries(fieldDefaults)) {
    const field = resource.fields[name];
    field.default = value;
    delete field.styleDefault;
  }
  resource.fields.weekGap.zeroIsDefault = true;

  // ===== SCHEDULE ENTRIES =====
  const dayLabels = {
    monday: "Lunes",
    tuesday: "Martes",
    wednesday: "Miércoles",
    thursday: "Jueves",
    friday: "Viernes",
    saturday: "Sábado",
    sunday: "Domingo"
  };

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

  // ===== SCENE RENDERING =====
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
      "background-opacity": settings.backgroundTint === "yes" ? settings.backgroundOverlayOpacity / 100 : 0,
      "background-blend": settings.backgroundBlendMode === "fill" ? "normal" : settings.backgroundBlendMode,
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

    const corners = new Map();
    const cornerItems = [];
    const scene = document.getElementById("scene");
    scene.style.setProperty("--corner-inset", `${settings.cornerInset}px`);
    scene.style.setProperty("--corner-gap", `${settings.cornerGap}px`);
    /** Reserve scaled card dimensions so cards sharing a corner cannot overlap. */
    function fitCornerItems() {
      for (const { element, wrapper, scale } of cornerItems) {
        wrapper.style.width = `${element.offsetWidth * Math.abs(scale)}px`;
        wrapper.style.height = `${element.offsetHeight * Math.abs(scale)}px`;
      }
    }
    const cornerObserver = new ResizeObserver(fitCornerItems);
    for (const [id, position, scale] of [
      ["countdown", settings.countdownPosition, settings.countdownScale / 100],
      ["social", settings.socialPosition, settings.socialMediaScale / 100],
      ["schedule", settings.schedulePosition, settings.scheduleScale / 100],
      ["list", settings.eventsPosition, settings.labelsScale / 100]
    ]) {
      const element = document.getElementById(id);
      if (!element) continue;
      if (!corners.has(position)) {
        const corner = document.createElement("div");
        corner.className = "scene-corner";
        corner.dataset.corner = position;
        corner.dataset.layout = settings.cornerLayout;
        scene.append(corner);
        corners.set(position, corner);
      }
      const wrapper = document.createElement("div");
      wrapper.className = "corner-item";
      element.classList.add("corner-content");
      element.style.left = element.style.top = scale < 0 ? "100%" : "0";
      if (id === "countdown") element.style.textAlign = position.endsWith("right") ? "right" : "left";
      wrapper.append(element);
      corners.get(position).append(wrapper);
      cornerItems.push({ element, wrapper, scale });
      cornerObserver.observe(element);
    }
    document.getElementById("updates").remove();
    fitCornerItems();

    const time = document.getElementById("time");
    const deadline = Date.now() + settings.countdownTime * 60000;
    let countdownTimer;
    /**
     * Update countdown.
     * @returns {void}
     */
    function updateCountdown() {
      const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      time.textContent = byStream.formatDuration(remaining, settings.countdownFormat, false);
      if (remaining === 0) {
        clearInterval(countdownTimer);
        byStream.setElementVisible(time, false);
        byStream.setElementVisible(document.getElementById("message"), false);
        byStream.setElementVisible(document.getElementById("endMessage"), true);
      }
    }

    const items = [...document.querySelectorAll("#social .item")];
    const animation = items.length ? gsap.timeline({ repeat: -1, paused: true }) : null;
    const resizeSocial = byStream.timelineResize(animation);
    items.forEach((item, index) => {
      const border = item.querySelectorAll(".borderTop");
      const icon = item.querySelector(".icon");
      const details = item.querySelectorAll(".socialHead, .socialName, .scheduleHead, .scheduleTime");
      const card = gsap.timeline();
      const entrance = byStream.elementTimeline(resource, settings, item, "social", "entrance");
      const exit = byStream.elementTimeline(resource, settings, item, "social", "exit");
      const nativeIn = byStream.elementMotion(settings, "social", "entrance").name === "default";
      const nativeOut = byStream.elementMotion(settings, "social", "exit").name === "default";
      const end = Math.max(10, Math.max(entrance.duration(), nativeIn ? 1.3 : 0) + Math.max(exit.duration(), nativeOut ? 1.3 : 0));
      if (items.length > 1) card.set(items[(index + items.length - 1) % items.length], { display: "none" }, 0);
      card.set(item, { display: "block", autoAlpha: 1, clipPath: "none" }, 0);
      card.call(() => resizeSocial([item], nativeIn || nativeOut || entrance.duration() || exit.duration()), [], 0);
      if (nativeOut || nativeIn) {
        card.set(border, { clipPath: nativeIn ? "inset(0 100% 0 0)" : "inset(0)" }, 0).set(details, { x: nativeIn ? -60 : 0, opacity: nativeIn ? 0 : 1 }, 0);
        if (icon) card.set(icon, { x: nativeIn ? -40 : 0, opacity: nativeIn ? 0 : 1 }, 0);
      }
      if (nativeIn) {
        card
          .fromTo(item, { clipPath: "inset(-2px 100% 0 0)" }, { clipPath: "inset(-2px 0% 0 0)", duration: 0.6 }, 0)
          .fromTo(border, { clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: 0.5 }, 0)
          .fromTo(details, { x: "-60px", opacity: 0 }, { x: 0, opacity: 1, duration: 0.7, stagger: { amount: 0.2 } }, 0.4);
        if (icon) card.fromTo(icon, { x: "-40px", opacity: 0 }, { x: 0, opacity: 1, duration: 0.6 }, 0.4);
      }
      if (nativeOut) {
        card
          .to(details, { x: "-60px", opacity: 0, duration: 0.7, stagger: { amount: 0.2 } }, end - 1.3)
          .to(border, { clipPath: "inset(0 100% 0 0)", duration: 0.5 }, end - 0.5)
          .to(item, { clipPath: "inset(-2px 100% 0 0)", duration: 0.6 }, end - 0.6);
        if (icon) card.to(icon, { x: "-40px", opacity: 0, duration: 0.6 }, end - 1);
      }
      card
        .add(entrance, 0)
        .add(exit, end - exit.duration())
        .set(item, { autoAlpha: 0 }, end);
      animation.add(card, animation.duration() ? "+=1" : 0);
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
      cornerObserver.disconnect();
    });
    window.addEventListener("pageshow", (event) => {
      if (event.persisted) {
        for (const { element } of cornerItems) cornerObserver.observe(element);
        fitCornerItems();
        start();
      }
    });
    start();
  }

  // ===== OVERLAY INITIALIZATION =====
  const settings = await byStream.initResource(resource);
  if (byStreamOverlay) renderMain();
});
