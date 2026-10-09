/**
 * File: main/main.js
 * @file Scene parameter validation, rendering, countdown, and rotating cards.
 * Deps: GSAP and shared page setup.
 */

document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(location.search);

  // URL defaults; the configurator edits this same object.
  const settings = {
    accounts: [
      { platform: "twitch", handle: "/byUwUr", heading: "Stream casi todos los días" },
      { platform: "youtube", handle: "[Mateus] @byUwUr", heading: "VODs todas las semanas" },
      { platform: "instagram", handle: "@byUwUr", heading: "Fotos de vez en cuando" }
    ],
    scheduleEntries: [
      { day: "monday", text: "" },
      { day: "tuesday", text: "" },
      { day: "wednesday", text: "" },
      { day: "thursday", text: "" },
      { day: "friday", text: "" },
      { day: "saturday", text: "" },
      { day: "sunday", text: "" }
    ],
    backgroundColor: "#00000000",
    backgroundType: "video",
    backgroundUrl: "",
    backgroundOverlayOpacity: 0,
    backgroundBlur: 0,
    backgroundScale: 1,
    displayBranding: "yes",
    logoUrl: "",
    logoOpacity: 0.05,
    logoScale: 1,
    frameWidth: 10,
    sceneTitle: "Ya estamos\nempezando",
    tagline: "[Mateus] byUwUr",
    backgroundOverlay: "#36353A",
    accentColor: "#400000",
    frameColor: "#400000",
    primaryTextColor: "#FFFFFF",
    subTextColor: "#C9C9C9",
    contentBackgrounds: "#FFFFFF1A",
    displayLabels: "no",
    labelOneHeading: "¡Suscriptor más reciente!",
    labelTwoHeading: "Más gastón:",
    labelThreeHeading: "Último gastón:",
    labelFourHeading: "Nuevo Yogurt:",
    displaySchedule: "no",
    socialMediaScale: 1.25,
    labelsScale: 1.25,
    scheduleScale: 1.25,
    countdownScale: 1.25,
    primaryFont: "Courier New",
    titleSize: 72,
    titleVerticalOffset: -8,
    subtitleSize: 48,
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
    countdownEndMessageVerticalOffset: 0,
    displayCountdown: "yes",
    countdownTime: 4,
    countdownMessage: "cuenta regresiva tramadora",
    countdownOverMessage: "Vamo' a vé'.",
    displaySocial: "yes"
  };

  // URL validation rules
  const parameterRules = {
    accounts: { validate: parseAccounts, maxlength: 20000 },
    scheduleEntries: { validate: parseScheduleEntries, maxlength: 4000 },
    sceneTitle: { maxlength: 300 },
    tagline: { type: "text", maxlength: 160 },
    countdownTime: { type: "number", min: 0, max: 1440, step: "any" },
    displayCountdown: { options: ["yes", "no"] },
    countdownMessage: { type: "text", maxlength: 160 },
    countdownOverMessage: { type: "text", maxlength: 160 },
    primaryFont: { type: "text", maxlength: 160 },
    titleSize: { type: "number", min: 8, max: 200, step: "any" },
    subtitleSize: { type: "number", min: 8, max: 200, step: "any" },
    primaryTextColor: { type: "color", maxlength: 160 },
    subTextColor: { type: "color", maxlength: 160 },
    accentColor: { type: "color", maxlength: 160 },
    frameColor: { type: "color", maxlength: 160 },
    frameWidth: { type: "number", min: 0, max: 100, step: "any" },
    displayBranding: { options: ["yes", "no"] },
    logoUrl: { type: "text", maxlength: 160 },
    logoOpacity: { type: "number", min: 0, max: 1, step: "any" },
    logoScale: { type: "number", min: 0.1, max: 5, step: "any" },
    backgroundColor: { type: "color", maxlength: 160 },
    backgroundType: { options: ["video", "image"] },
    backgroundUrl: { type: "text", maxlength: 160 },
    backgroundBlur: { type: "number", min: 0, max: 100, step: "any" },
    backgroundOverlayOpacity: { type: "number", min: 0, max: 1, step: "any" },
    backgroundOverlay: { type: "color", maxlength: 160 },
    displaySocial: { options: ["yes", "no"] },
    displaySchedule: { options: ["yes", "no"] }
  };

  const dayLabels = { monday: "Lunes", tuesday: "Martes", wednesday: "Miércoles", thursday: "Jueves", friday: "Viernes", saturday: "Sábado", sunday: "Domingo" };

  // Repeated in here and configurator.js so social overlays need no separate platform file. Keep the lists in sync.
  const platforms = {
    "500px": "500px",
    artstation: "ArtStation",
    bandcamp: "Bandcamp",
    behance: "Behance",
    bilibili: "Bilibili",
    bitbucket: "Bitbucket",
    blogger: "Blogger",
    bluesky: "Bluesky",
    codepen: "CodePen",
    dailymotion: "Dailymotion",
    deezer: "Deezer",
    delicious: "Delicious",
    dev: "DEV Community",
    deviantart: "DeviantArt",
    digg: "Digg",
    discord: "Discord",
    discourse: "Discourse",
    dribbble: "Dribbble",
    ello: "Ello",
    facebook: "Facebook",
    figma: "Figma",
    flickr: "Flickr",
    foursquare: "Foursquare",
    github: "GitHub",
    gitlab: "GitLab",
    goodreads: "Goodreads",
    "google-scholar": "Google Scholar",
    "google-plus": "Google+",
    guilded: "Guilded",
    "hacker-news": "Hacker News",
    hashnode: "Hashnode",
    houzz: "Houzz",
    instagram: "Instagram",
    itunes: "iTunes",
    keybase: "Keybase",
    "ko-fi": "Ko-fi",
    lastfm: "Last.fm",
    letterboxd: "Letterboxd",
    line: "LINE",
    linkedin: "LinkedIn",
    mastodon: "Mastodon",
    medium: "Medium",
    meetup: "Meetup",
    mixcloud: "Mixcloud",
    mixer: "Mixer",
    napster: "Napster",
    odnoklassniki: "Odnoklassniki",
    orcid: "ORCID",
    patreon: "Patreon",
    periscope: "Periscope",
    pinterest: "Pinterest",
    pixiv: "pixiv",
    "product-hunt": "Product Hunt",
    qq: "QQ",
    quora: "Quora",
    ravelry: "Ravelry",
    reddit: "Reddit",
    renren: "Renren",
    researchgate: "ResearchGate",
    "signal-messenger": "Signal",
    skype: "Skype",
    slack: "Slack",
    snapchat: "Snapchat",
    soundcloud: "SoundCloud",
    spotify: "Spotify",
    "stack-overflow": "Stack Overflow",
    steam: "Steam",
    strava: "Strava",
    stumbleupon: "StumbleUpon",
    telegram: "Telegram",
    "tencent-weibo": "Tencent Weibo",
    threads: "Threads",
    tiktok: "TikTok",
    tumblr: "Tumblr",
    twitch: "Twitch",
    twitter: "Twitter",
    unsplash: "Unsplash",
    viadeo: "Viadeo",
    viber: "Viber",
    vimeo: "Vimeo",
    vine: "Vine",
    vk: "VK",
    weixin: "WeChat",
    weibo: "Weibo",
    whatsapp: "WhatsApp",
    "x-twitter": "X",
    xing: "XING",
    yammer: "Yammer",
    yelp: "Yelp",
    youtube: "YouTube",
    zhihu: "Zhihu"
  };

  // URL validation is repeated in each resource and configurator.js to avoid extra files. Keep the copies in sync.
  function validParameter(name, value) {
    if (!Object.hasOwn(parameterRules, name)) return false;
    const rule = parameterRules[name];
    if (rule.validate) return rule.validate(value) !== null;
    if (rule.options && !rule.options.includes(value)) return false;
    if (rule.maxlength && value.length > Number(rule.maxlength)) return false;
    if (rule.type === "number") {
      const number = Number(value);
      if (!value.trim() || !Number.isFinite(number) || number < Number(rule.min) || number > Number(rule.max)) return false;
      if (rule.step && rule.step !== "any") {
        const steps = (number - Number(rule.min)) / Number(rule.step);
        if (Math.abs(steps - Math.round(steps)) > 1e-8) return false;
      }
    }
    if (rule.type === "color" && !CSS.supports("color", value)) return false;
    if (name.endsWith("Url") && value) {
      try {
        const url = new URL(value, location.href);
        if (!["http:", "https:", "file:"].includes(url.protocol) || (url.protocol === "file:" && location.protocol !== "file:") || url.username || url.password) return false;
      } catch {
        return false;
      }
    }
    return true;
  }

  /** Apply validated URL values to the declared settings object; invalid values leave it intact. */
  function applyParameters(settings, values = params) {
    for (const [name, value] of values) {
      if (!Object.hasOwn(parameterRules, name)) continue;
      const rule = parameterRules[name];
      let parsed;
      if (rule.validate) parsed = rule.validate(value);
      else {
        if (!validParameter(name, value)) continue;
        parsed = rule.type === "number" ? Number(value) : value;
      }
      if (parsed === null) continue;
      settings[name] = parsed;
    }
  }

  /** Parses only supported platforms and bounded display text; null keeps the defaults. */
  function parseAccounts(value) {
    if (value.length > 20000) return null;
    try {
      const entries = JSON.parse(value);
      if (!Array.isArray(entries) || entries.length > 100) return null;
      if (
        !entries.every(
          (entry) =>
            entry &&
            typeof entry.platform === "string" &&
            Object.hasOwn(platforms, entry.platform) &&
            typeof entry.handle === "string" &&
            entry.handle.length <= 160 &&
            (entry.heading === undefined || (typeof entry.heading === "string" && entry.heading.length <= 160))
        )
      )
        return null;
      return entries.map(({ platform, handle, heading = "" }) => ({ platform, handle, heading }));
    } catch (error) {
      return null;
    }
  }

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
      "font-family": `${settings.primaryFont || '"Courier New"'}, Courier, monospace`,
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
    for (const [name, value] of Object.entries(styles)) rootStyle.setProperty("--" + name, value);
    for (const [name, value] of Object.entries(settings)) {
      if (name.endsWith("Size") || name.endsWith("Offset")) rootStyle.setProperty("--" + name, `${value / 16}rem`);
    }
    for (const name of ["socialMediaScale", "labelsScale", "scheduleScale", "countdownScale"]) rootStyle.setProperty("--" + name, settings[name]);

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
      item.innerHTML = '<div class="network"><div class="borderTop"></div><div class="icon"><i aria-hidden="true"></i></div><div class="inner"><div class="socialHead"></div><div class="socialName"></div></div></div>';
      item.querySelector("i").className = "fa-brands fa-" + platform;
      item.querySelector(".socialHead").textContent = heading;
      item.querySelector(".socialName").textContent = handle;
      document.getElementById("social").append(item);
    }
    for (const { day, text } of scheduleEntries) {
      const entry = document.createElement("div");
      entry.className = "day";
      entry.innerHTML = '<div class="borderTop"></div><div class="scheduleHead"></div><div class="scheduleTime"></div>';
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

  applyParameters(settings);
  window.byStreamResource = { settings, parameterRules };
  if (byStreamOverlay) renderMain();
});
