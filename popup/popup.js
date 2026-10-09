/**
 * File: popup/popup.js
 * @file Popup parameter validation and animated social-account rendering.
 * Deps: GSAP, MorphSVGPlugin, and shared page setup.
 */

document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(location.search);

  // URL defaults; the configurator edits this same object.
  const settings = {
    mode: "right",
    scale: 1,
    accounts: [
      { platform: "twitch", handle: "/byUwUr" },
      { platform: "youtube", handle: "@byUwUr" },
      { platform: "instagram", handle: "@byUwUr" }
    ],
    pauseTime: 5,
    inbetweenPauseTime: 5,
    iconBoxColor: "#400000",
    textBoxColor: "#FFFFFF",
    iconColor: "#FFFFFF",
    fontColor: "#400000",
    primaryFont: "Courier New",
    fontWeight: 700,
    fontSizeRem: 4.5,
    textYOffsetRem: 0
  };

  // URL validation rules
  const parameterRules = {
    accounts: { validate: parseAccounts, maxlength: 20000 },
    mode: { options: ["right", "left"] },
    pauseTime: { type: "number", min: 0, max: 3600, step: "any" },
    inbetweenPauseTime: { type: "number", min: 0, max: 3600, step: "any" },
    scale: { type: "number", min: 0.1, max: 5, step: "any" },
    iconBoxColor: { type: "color", maxlength: 160 },
    textBoxColor: { type: "color", maxlength: 160 },
    iconColor: { type: "color", maxlength: 160 },
    fontColor: { type: "color", maxlength: 160 },
    primaryFont: { type: "text", maxlength: 160 },
    fontWeight: { type: "number", min: 100, max: 900, step: 100 },
    fontSizeRem: { type: "number", min: 0.5, max: 6.25, step: "any" },
    textYOffsetRem: { type: "number", min: -6.25, max: 6.25, step: "any" }
  };

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
      if (!entries.every((entry) => entry && typeof entry.platform === "string" && Object.hasOwn(platforms, entry.platform) && typeof entry.handle === "string" && entry.handle.length <= 160)) return null;
      return entries.map(({ platform, handle }) => ({ platform, handle }));
    } catch (error) {
      return null;
    }
  }

  /** Render safe text and play the elastic square, handle, and icon sequence. */
  function renderPopup() {
    const { accounts, mode, scale } = settings;
    const popup = document.getElementById("socialHolder");
    if (!accounts.length) return popup.remove();
    const names = document.getElementById("nameHolder");
    const icons = document.getElementById("icons");
    popup.classList.add(mode);
    popup.style.transform = `scale(${scale})`;
    for (const name of ["iconBoxColor", "textBoxColor", "iconColor", "fontColor"]) popup.style.setProperty("--" + name, settings[name]);
    popup.style.setProperty("--font-family", `${settings.primaryFont || '"Courier New"'}, Courier, monospace`);
    popup.style.setProperty("--font-size", `${settings.fontSizeRem}rem`);
    popup.style.setProperty("--font-weight", settings.fontWeight);
    popup.style.setProperty("--text-offset", `${settings.textYOffsetRem}rem`);
    for (const { platform, handle } of accounts) {
      const name = document.createElement("span");
      name.className = "name";
      name.textContent = handle;
      names.append(name);
      const icon = document.createElement("i");
      icon.className = "fa-brands fa-" + platform;
      icon.setAttribute("aria-hidden", "true");
      icons.append(icon);
    }

    gsap.registerPlugin(MorphSVGPlugin);
    const square = document.getElementById("square");
    const squarePath = square.getAttribute("d");
    const direction = mode === "right" ? 1 : -1;
    const outgoing = mode === "right" ? "#bigRight" : "#bigLeft";
    const incoming = mode === "right" ? "#bigLeft" : "#bigRight";
    const littleOut = mode === "right" ? "#littleRight" : "#littleLeft";
    const littleIn = mode === "right" ? "#littleLeft" : "#littleRight";
    const textWidth = names.clientWidth;
    const timeline = gsap.timeline({ repeat: -1, repeatDelay: settings.inbetweenPauseTime });

    // Reveal the icon first, stretch its square across the text, then settle both.
    timeline
      .set(popup, { autoAlpha: 1 }, 0.3)
      .fromTo("#iconBox", { opacity: 0 }, { duration: 0.6, opacity: 1 })
      .to("#iconHolder", { duration: 0.1, x: direction * 20 })
      .to(square, { duration: 0.2, morphSVG: outgoing }, "-=0.1")
      .to("#iconBox", { duration: 0.2, x: direction * textWidth }, "-=0.2")
      .to("#iconHolder", { duration: 0.1, x: 0 })
      .to("#iconHolder", { duration: 0.1, x: -direction * 20 })
      .to(square, { duration: 0.2, morphSVG: incoming }, "-=0.1")
      .to("#iconBox", { duration: 0.3, x: -direction * 30 }, "-=0.2")
      .fromTo("#textBox", { opacity: 0, scaleX: 0 }, { duration: 0.1, opacity: 1, scaleX: 1, transformOrigin: mode + " center" }, "-=0.2")
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
        .set(names, { y: -index * 6.25 + "rem" }, "-=0.1")
        .set(icons, { y: -index * 7.5 + "rem" }, "-=0.1")
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
      .to("#iconBox", { duration: 0.3, x: direction * (textWidth + 240) }, "-=0.2")
      .to("#textBox", { duration: 0.2, opacity: 0, scaleX: 0, transformOrigin: mode + " center" }, "-=0.3")
      .set(popup, { autoAlpha: 0 });

    window.addEventListener("pagehide", () => timeline.pause());
    window.addEventListener("pageshow", (event) => {
      if (event.persisted) timeline.restart();
    });
  }

  applyParameters(settings);
  window.byStreamResource = { settings, parameterRules };
  if (byStreamOverlay) renderPopup();
});
