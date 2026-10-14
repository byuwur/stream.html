/**
 * File: popup/popup.js
 * @file Popup parameter validation and animated social-account rendering.
 * Deps: GSAP, MorphSVGPlugin, and SPA.js/_fonts.js.
 */

document.addEventListener("DOMContentLoaded", () => {
  // ==========
  // ==== RESOURCE DEFINITION ====
  // ==========

  /** Defaults, URL constraints, and the field metadata consumed by the optional editor. */
  const resource = {
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
        description: "Ordered account JSON: up to 100 entries with a supported platform and a handle of up to 160 characters.",
        validate: parseAccounts,
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
        options: ["right", "left"],
        icon: "fa-clapperboard",
        labels: {"right":"Right","left":"Left"}
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

  // ==========
  // ==== URL SETTINGS AND PAGE MODE ====
  // ==========

  const params = new URLSearchParams(location.search);
  const settings = {
    ...resource.constants,
    ...Object.fromEntries(Object.entries(resource.fields).map(([name, field]) => [name, structuredClone(field.default)]))
  };
  const parameterRules = resource.fields;
  const isOverlay = location.search.length > 1 && !location.hash;
  window.byStreamOverlay = isOverlay;
  window.addEventListener("hashchange", () => {
    if (isOverlay !== (location.search.length > 1 && !location.hash)) location.reload();
  });
  if (isOverlay) {
    document.documentElement.setAttribute("data-overlay", "");
    document.body.append(document.getElementById("overlay-markup").content.cloneNode(true));
  }

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

  applyParameters(settings);
  window.byStreamResource = { ...resource, settings, parameterRules };
  if (isOverlay) renderPopup();
});
