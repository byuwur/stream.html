/**
 * File: main/main.js
 * @file Scene parameter validation, rendering, countdown, and rotating cards.
 * Deps: configurator.js, GSAP, and SPA.js/_fonts.js.
 */

document.addEventListener("DOMContentLoaded", () => {
  // ==========
  // ==== RESOURCE DEFINITION ====
  // ==========

  /** Defaults, URL constraints, and the field metadata consumed by the optional editor. */
  const resource = {
    title: "Main scene",
    description: "Set up your starting, BRB, ending, or intermission scene.",
    preview: [1920,1080],
    sectionIcons: {"Scene":"fa-solid fa-clapperboard","Appearance":"fa-solid fa-palette","Social accounts":"fa-solid fa-users","Schedule":"fa-solid fa-calendar-days"},
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
      countdownTime: {
        type: "number",
        default: 4,
        label: "Countdown (minutes)",
        section: "Scene",
        description: "Duration of the countdown in minutes.",
        min: 0,
        max: 1440,
        step: "any",
        icon: "fa-hashtag"
      },
      displayCountdown: {
        type: "select",
        default: "yes",
        label: "Countdown",
        section: "Scene",
        description: "Shows or hides the countdown area.",
        options: ["yes", "no"],
        icon: "fa-list",
        labels: {"yes":"Show","no":"Hide"}
      },
      countdownMessage: {
        type: "text",
        default: "cuenta regresiva tramadora",
        label: "Countdown message",
        section: "Scene",
        description: "Message displayed while the timer runs.",
        maxlength: 160,
        icon: "fa-pen"
      },
      countdownOverMessage: {
        type: "text",
        default: "Vamo' a vé'.",
        label: "Finished message",
        section: "Scene",
        description: "Message displayed when the timer finishes.",
        maxlength: 160,
        icon: "fa-pen"
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
        label: "Text color (CSS color)",
        section: "Appearance",
        description: "CSS color used for primary text.",
        maxlength: 160,
        icon: "fa-palette"
      },
      subTextColor: {
        type: "color",
        default: "#C9C9C9",
        label: "Secondary text color",
        section: "Appearance",
        description: "CSS color used for secondary text.",
        maxlength: 160,
        icon: "fa-palette"
      },
      accentColor: {
        type: "color",
        default: "#400000",
        label: "Accent color",
        section: "Appearance",
        description: "CSS color used for accents.",
        maxlength: 160,
        icon: "fa-palette"
      },
      frameColor: {
        type: "color",
        default: "#400000",
        label: "Frame color",
        section: "Appearance",
        description: "CSS color of the scene border.",
        maxlength: 160,
        icon: "fa-palette"
      },
      frameWidth: {
        type: "number",
        default: 10,
        label: "Frame width (px)",
        section: "Appearance",
        description: "Scene border thickness in pixels.",
        min: 0,
        max: 100,
        step: "any",
        icon: "fa-hashtag"
      },
      displayBranding: {
        type: "select",
        default: "yes",
        label: "Logo",
        section: "Appearance",
        description: "Shows or hides the logo independently of the title.",
        options: ["yes", "no"],
        icon: "fa-list",
        labels: {"yes":"Show","no":"Hide"}
      },
      logoUrl: {
        type: "text",
        default: "",
        label: "Logo URL or relative image path",
        section: "Appearance",
        description: "Image URL or relative path. Empty keeps the bundled logo.",
        maxlength: 160,
        icon: "fa-pen"
      },
      logoOpacity: {
        type: "number",
        default: 0.05,
        label: "Logo opacity",
        section: "Appearance",
        description: "Logo opacity, from transparent to fully opaque.",
        min: 0,
        max: 1,
        step: "any",
        icon: "fa-hashtag"
      },
      logoScale: {
        type: "number",
        default: 1,
        label: "Logo scale",
        section: "Appearance",
        description: "Multiplier applied to the logo size.",
        min: 0.1,
        max: 5,
        step: "any",
        icon: "fa-hashtag"
      },
      backgroundColor: {
        type: "color",
        default: "#00000000",
        label: "Background color",
        section: "Appearance",
        description: "CSS background color behind the scene and its media. Transparent by default.",
        maxlength: 160,
        icon: "fa-palette"
      },
      backgroundType: {
        type: "select",
        default: "video",
        label: "Background type",
        section: "Appearance",
        description: "Selects image or video background media.",
        options: ["video", "image"],
        icon: "fa-list",
        labels: {"video":"Video","image":"Image"}
      },
      backgroundUrl: {
        type: "text",
        default: "",
        label: "Background URL or relative path",
        section: "Appearance",
        description: "Public media URL or relative file path. Does not upload a file.",
        maxlength: 160,
        icon: "fa-pen"
      },
      backgroundBlur: {
        type: "number",
        default: 0,
        label: "Background blur (px)",
        section: "Appearance",
        description: "Background blur radius in pixels.",
        min: 0,
        max: 100,
        step: "any",
        icon: "fa-hashtag"
      },
      backgroundOverlayOpacity: {
        type: "number",
        default: 0,
        label: "Background tint opacity",
        section: "Appearance",
        description: "Opacity of the tint over the background.",
        min: 0,
        max: 1,
        step: "any",
        icon: "fa-hashtag"
      },
      backgroundOverlay: {
        type: "color",
        default: "#36353A",
        label: "Background tint color",
        section: "Appearance",
        description: "CSS color of the background tint.",
        maxlength: 160,
        icon: "fa-palette"
      },
      displaySocial: {
        type: "select",
        default: "yes",
        label: "Social accounts",
        section: "Social accounts",
        description: "Shows or hides the social account area.",
        options: ["yes", "no"],
        icon: "fa-list",
        labels: {"yes":"Show","no":"Hide"}
      },
      accounts: {
        type: "entries",
        default: [ { platform: "twitch", handle: "/byUwUr", heading: "Stream casi todos los días" }, { platform: "youtube", handle: "[Mateus] @byUwUr", heading: "VODs todas las semanas" }, { platform: "instagram", handle: "@byUwUr", heading: "Fotos de vez en cuando" } ],
        label: "Social accounts",
        section: "Social accounts",
        description: "Ordered account JSON: up to 100 entries with a supported platform, handle, and optional heading of up to 160 characters each.",
        validate: (value) => byConfigurator.parseAccounts(value, true),
        maxlength: 20000,
        entries: { choices: "platforms", choiceKey: "platform", textFields: [["handle", "Handle or display text"], ["heading", "Heading"]], newEntry: { platform: "twitch", handle: "", heading: "" } },
        addLabel: "Add account"
      },
      displaySchedule: {
        type: "select",
        default: "no",
        label: "Schedule",
        section: "Schedule",
        description: "Shows or hides the weekly schedule.",
        options: ["yes", "no"],
        icon: "fa-list",
        labels: {"yes":"Show","no":"Hide"}
      },
      scheduleEntries: {
        type: "entries",
        default: [ { day: "monday", text: "" }, { day: "tuesday", text: "" }, { day: "wednesday", text: "" }, { day: "thursday", text: "" }, { day: "friday", text: "" }, { day: "saturday", text: "" }, { day: "sunday", text: "" } ],
        label: "Schedule",
        section: "Schedule",
        description: "Ordered schedule JSON: up to 7 entries with a weekday and schedule text of up to 160 characters.",
        validate: parseScheduleEntries,
        maxlength: 4000,
        entries: { choices: { monday: "Monday", tuesday: "Tuesday", wednesday: "Wednesday", thursday: "Thursday", friday: "Friday", saturday: "Saturday", sunday: "Sunday" }, choiceKey: "day", textFields: [["text", "Schedule text"]], newEntry: { day: "monday", text: "" }, limit: 7 },
        addLabel: "Add day"
      }
    },
    constants: {
      backgroundScale: 1,
      contentBackgrounds: "#FFFFFF1A",
      displayLabels: "no",
      labelOneHeading: "¡Suscriptor más reciente!",
      labelTwoHeading: "Más gastón:",
      labelThreeHeading: "Último gastón:",
      labelFourHeading: "Nuevo Yogurt:",
      socialMediaScale: 1.25,
      labelsScale: 1.25,
      scheduleScale: 1.25,
      countdownScale: 1.25,
      titleVerticalOffset: -8,
      subtitleVerticalOffset: 128,
      labelNameSize: 24,
      labelNameVerticalOffset: 0,
      labelHeaderSize: 12,
      labelHeaderVerticalOffset: 4,
      countdownTimeSize: 64,
      countdownTimeVerticalOffset: 0,
      countdownMessageSize: 24,
      countdownMessageVerticalOffset: 0,
      countdownEndMessageSize: 64,
      countdownEndMessageVerticalOffset: 0
    },
  };

  const dayLabels = { monday: "Lunes", tuesday: "Martes", wednesday: "Miércoles", thursday: "Jueves", friday: "Viernes", saturday: "Sábado", sunday: "Domingo" };

  /** An explicit empty schedule hides the section; invalid input retains defaults. */
  function parseScheduleEntries(value) {
    if (value.length > 4000) return null;
    try {
      const entries = JSON.parse(value);
      if (!Array.isArray(entries) || entries.length > 7) return null;
      if (!entries.every((entry) => entry && typeof entry.day === "string" && Object.hasOwn(dayLabels, entry.day) && typeof entry.text === "string" && entry.text.length <= 160)) return null;
      return entries.map(({ day, text }) => ({ day, text }));
    } catch (error) {
      return null;
    }
  }

  /** Apply scene settings, then run the countdown and rotate visible cards. */
  function renderMain() {
    const { accounts, scheduleEntries } = settings;
    const rootStyle = document.documentElement.style;
    // CSS owns appearance; settings only provide its colors, sizes, and offsets.
    const styles = {
      "font-family": byFont.family(settings.primaryFont || "Courier New", "Courier, monospace"),
      "primary-color": settings.primaryTextColor,
      "secondary-color": settings.subTextColor,
      "accent-color": settings.accentColor,
      "frame-color": settings.frameColor,
      "content-background": settings.contentBackgrounds,
      "background-color": settings.backgroundColor,
      "background-tint": settings.backgroundOverlay,
      "frame-width": `${settings.frameWidth / 16}rem`,
      "logo-opacity": settings.logoOpacity,
      "logo-scale": settings.logoScale,
      "background-opacity": settings.backgroundOverlayOpacity,
      "background-blur": `${settings.backgroundBlur / 16}rem`,
      "background-scale": settings.backgroundScale
    };
    for (const [name, value] of Object.entries(styles)) rootStyle.setProperty(`--${name}`, value);
    for (const [name, value] of Object.entries(settings)) {
      if (name.endsWith("Size") || name.endsWith("Offset")) rootStyle.setProperty(`--${name}`, `${value / 16}rem`);
    }
    for (const name of ["socialMediaScale", "labelsScale", "scheduleScale", "countdownScale"]) rootStyle.setProperty(`--${name}`, settings[name]);

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
    if (settings.logoUrl) brand.style.backgroundImage = `url(${JSON.stringify(settings.logoUrl)})`;
    const background = document.querySelector(settings.backgroundType === "video" ? "#video video" : "#image img");
    document.getElementById(settings.backgroundType === "video" ? "image" : "video").remove();
    if (settings.backgroundUrl) background.src = settings.backgroundUrl;

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
    for (const { day, text } of scheduleEntries) {
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
      schedule: settings.displaySchedule === "yes" && scheduleEntries.length > 0,
      countdown: settings.displayCountdown === "yes",
      social: settings.displaySocial === "yes" && accounts.some((entry) => entry.handle)
    };
    for (const [id, shown] of Object.entries(sections)) if (!shown) document.getElementById(id).remove();

    const time = document.getElementById("time");
    const deadline = Date.now() + settings.countdownTime * 60000;
    let countdownTimer;
    function updateCountdown() {
      const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      time.textContent = `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}`;
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
        .fromTo(item, { clipPath: "inset(-0.125rem 100% 0 0)" }, { clipPath: "inset(-0.125rem 0% 0 0)", duration: 0.6 }, 0)
        .fromTo(border, { scaleX: 0, transformOrigin: "left center" }, { scaleX: 1, duration: 0.5 }, 0)
        .fromTo(details, { x: "-3.75rem", opacity: 0 }, { x: 0, opacity: 1, duration: 0.7, stagger: { amount: 0.2 } }, 0.4)
        .to(details, { x: "-3.75rem", opacity: 0, duration: 0.7, stagger: { amount: 0.2 } }, 8.7)
        .to(border, { scaleX: 0, duration: 0.5 }, 9.5)
        .to(item, { clipPath: "inset(-0.125rem 100% 0 0)", duration: 0.6 }, 9.4)
        .set(item, { autoAlpha: 0 }, 10);
      if (icon) {
        card.fromTo(icon, { x: "-2.5rem", opacity: 0 }, { x: 0, opacity: 1, duration: 0.6 }, 0.4).to(icon, { x: "-2.5rem", opacity: 0, duration: 0.6 }, 9);
      }
      animation.add(card, "+=1");
    });
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

  const settings = byConfigurator.initResource(resource);
  if (byStreamOverlay) renderMain();
});
