/**
 * File: main/main.js
 * @file Scene parameter validation and rendering for start, BRB, end, and intermission presets.
 * Deps: jQuery 4, GSAP, embedded settings, params and config globals.
 */
// URL parameters and documentation
const parameterRules = {
  mode: { options: ["start", "brb", "end", "inter"], description: "Selects the scene preset or the side from which social popups animate." },
  sceneTitle: { maxlength: "300", group: "options", description: "Main heading displayed on the scene. Line breaks are supported." },
  tagline: { type: "text", maxlength: "160", group: "options", description: "Subtitle displayed beneath the main heading." },
  countdownTime: { type: "number", min: "0", max: "1440", step: "any", group: "countdown", description: "Duration of the countdown in minutes." },
  displayCountdown: { group: "countdown", options: ["yes", "no"], description: "Shows or hides the countdown area." },
  countdownMessage: { type: "text", maxlength: "160", group: "countdown", description: "Message displayed while the timer runs." },
  countdownOverMessage: { type: "text", maxlength: "160", group: "countdown", description: "Message displayed when the timer finishes." },
  showBG: { options: ["false", "true"], description: "Adds a translucent dark background behind the scene." },
  hideCountdown: { options: ["false", "true"], description: "Forces the countdown area to be hidden." },
  primaryFont: { type: "text", maxlength: "160", group: "fonts", description: "Font family to use. It must be available on the viewing computer." },
  titleSize: { type: "number", min: "8", max: "200", step: "any", group: "fonts", description: "Main heading size in pixels." },
  subtitleSize: { type: "number", min: "8", max: "200", step: "any", group: "fonts", description: "Subtitle size in pixels." },
  primaryTextColor: { type: "text", maxlength: "160", group: "colors", description: "CSS color used for primary text." },
  subTextColor: { type: "text", maxlength: "160", group: "colors", description: "CSS color used for secondary text." },
  accentColor: { type: "text", maxlength: "160", group: "colors", description: "CSS color used for accents." },
  frameColor: { type: "text", maxlength: "160", group: "colors", description: "CSS color of the scene border." },
  frameWidth: { type: "number", min: "0", max: "100", step: "any", group: "options", description: "Scene border thickness in pixels." },
  displayBranding: { group: "options", options: ["yes", "no"], description: "Shows or hides the logo independently of the title." },
  logoUrl: { type: "text", maxlength: "160", group: "options", description: "Image URL or relative path. Empty keeps the bundled logo." },
  logoOpacity: { type: "number", min: "0", max: "1", step: "any", group: "options", description: "Logo opacity, from transparent to fully opaque." },
  logoScale: { type: "number", min: "0.1", max: "5", step: "any", group: "options", description: "Multiplier applied to the logo size." },
  backgroundType: { group: "options", options: ["video", "image"], description: "Selects image or video background media." },
  backgroundUrl: { type: "text", maxlength: "160", group: "options", description: "Public media URL or relative file path. Does not upload a file." },
  backgroundBlur: { type: "number", min: "0", max: "100", step: "any", group: "options", description: "Background blur radius in pixels." },
  backgroundOverlayOpacity: { type: "number", min: "0", max: "1", step: "any", group: "options", description: "Opacity of the tint over the background." },
  backgroundOverlay: { type: "text", maxlength: "160", group: "colors", description: "CSS color of the background tint." },
  displaySocial: { group: "social", options: ["yes", "no"], description: "Shows or hides the social account area." },
  twitch: { type: "text", maxlength: "160", group: "social", description: "Twitch account name shown as plain text." },
  twitchHeader: { type: "text", maxlength: "160", group: "social", description: "Heading displayed above this social account." },
  youtube: { type: "text", maxlength: "160", group: "social", description: "Youtube account name shown as plain text." },
  youtubeHeader: { type: "text", maxlength: "160", group: "social", description: "Heading displayed above this social account." },
  instagram: { type: "text", maxlength: "160", group: "social", description: "Instagram account name shown as plain text." },
  instagramHeader: { type: "text", maxlength: "160", group: "social", description: "Heading displayed above this social account." },
  displaySchedule: { group: "schedule", options: ["yes", "no"], description: "Shows or hides the weekly schedule." },
  monday: { type: "text", maxlength: "160", group: "schedule", description: "Schedule text displayed for Monday." },
  tuesday: { type: "text", maxlength: "160", group: "schedule", description: "Schedule text displayed for Tuesday." },
  wednesday: { type: "text", maxlength: "160", group: "schedule", description: "Schedule text displayed for Wednesday." },
  thursday: { type: "text", maxlength: "160", group: "schedule", description: "Schedule text displayed for Thursday." },
  friday: { type: "text", maxlength: "160", group: "schedule", description: "Schedule text displayed for Friday." },
  saturday: { type: "text", maxlength: "160", group: "schedule", description: "Schedule text displayed for Saturday." },
  sunday: { type: "text", maxlength: "160", group: "schedule", description: "Schedule text displayed for Sunday." }
};

/**
 * Validates a known parameter against its bounds, options, color, and URL restrictions.
 * @param {string} name Key in parameterRules.
 * @param {string} value Candidate URL or form value.
 * @returns {boolean} Whether the value is accepted.
 */
function validParameter(name, value) {
  const rule = parameterRules[name];
  if (rule.options && !rule.options.includes(value)) return false;
  if (rule.maxlength && value.length > Number(rule.maxlength)) return false;
  if (rule.type === "number") {
    const number = Number(value);
    if (!value.trim() || !Number.isFinite(number) || number < Number(rule.min) || number > Number(rule.max)) return false;
    if (rule.step !== "any" && Math.abs((number - Number(rule.min)) / Number(rule.step) - Math.round((number - Number(rule.min)) / Number(rule.step))) > 1e-8) return false;
  }
  if (rule.group === "colors" && !CSS.supports("color", value)) return false;
  if (name.endsWith("Url") && value) {
    try {
      const url = new URL(value, location.href);
      if (!["http:", "https:", "file:"].includes(url.protocol) || (url.protocol === "file:" && location.protocol !== "file:") || url.username || url.password) return false;
    } catch (error) {
      return false;
    }
  }
  return true;
}

/**
 * Reads a validated URL override, otherwise retaining the configured fallback.
 * @param {string} name Key in parameterRules.
 * @param {string|number} fallback Configured default.
 * @returns {string|number} Valid override or fallback; numeric rules return numbers.
 */
function parameterValue(name, fallback) {
  if (parameterRules[name].type === "number") fallback = Number(fallback);
  if (!params.has(name)) return fallback;
  let value = params.get(name);
  if (["showBG", "hideCountdown"].includes(name)) value = ["true", "t", "1", "yes", "y"].includes(value) ? "true" : "false";
  if (!validParameter(name, value)) return fallback;
  return parameterRules[name].type === "number" ? Number(value) : value;
}

const presetText = { sceneTitle: settings.options.sceneTitle.replace(/<br\s*\/?\s*>/gi, "\n"), tagline: settings.options.tagline };
settings.options.sceneTitle = presetText.sceneTitle;
Object.entries(parameterRules).forEach(([name, rule]) => {
  if (rule.group) settings[rule.group][name] = parameterValue(name, settings[rule.group][name] ?? "");
});

// Overlay rendering
if (document.documentElement.hasAttribute("data-overlay")) {
  // Utility Functions
  /**
   * Removes matched overlay elements when a setting is absent or disabled.
   * @param {string|boolean} setting Display setting.
   * @param {string} div Element selector.
   */
  function removeHtml(setting, div) {
    if (!setting || setting === "no" || setting === "") $(div).remove();
  }

  /**
   * Applies a CSS property to matched overlay elements.
   * @param {string} target Element selector.
   * @param {string} property CSS property name.
   * @param {string|number} value Property value.
   */
  function setCssProperty(target, property, value) {
    $(target).css(property, value);
  }

  /**
   * Loads a text file and replaces the matched elements' text content.
   * @param {string} selector Element selector.
   * @param {string} path Text file name relative to ../txt/, without its extension.
   */
  function updateText(selector, path) {
    $.get(`../txt/${path}.txt`, (data) => {
      $(selector).text(data);
    });
  }

  /**
   * Applies the active scene settings to branding, backgrounds, text, social accounts, and schedule.
   */
  function applySettings() {
    const { backgroundType, displayBranding, sceneTitle, tagline, logoOpacity, logoScale, frameWidth, backgroundOverlayOpacity, backgroundBlur, backgroundScale } = settings.options;
    const { displayLabels, labelOne, labelTwoHeading, labelThreeHeading, labelFourHeading } = settings.labels;
    const { displaySchedule } = settings.schedule;
    const { displayCountdown, countdownMessage, countdownEndMessage, countdownTime } = settings.countdown;
    const { displaySocial, twitter, facebook, instagram, youtube, socialMediaScale } = settings.social;
    const { colors, fonts, scaling } = settings;
    // Background
    if (settings.options.backgroundUrl) {
      if (backgroundType === "video") {
        $("#video video").attr("src", settings.options.backgroundUrl);
      } else {
        $("#image img").first().attr("src", settings.options.backgroundUrl).show();
      }
    }
    if (settings.options.logoUrl) $("#brandImg").css("background-image", `url(${JSON.stringify(settings.options.logoUrl)})`);
    $("body").css("font-family", fonts.primaryFont);
    $("#title, #time, .socialName, .scheduleTime, #list .name").css("color", colors.primaryTextColor);
    $("#subtitle, #message, .socialHead, .scheduleHead, #list .type").css("color", colors.subTextColor);
    if (["true", "t", "1", "yes", "y"].includes(params.get("showBG"))) $("#scene").css("background", "#0007");
    if (["true", "t", "1", "yes", "y"].includes(params.get("hideCountdown"))) $("#countdown").remove();
    backgroundType === "video" ? $("#image").remove() : $("#video").remove();
    // Entire Areas
    [
      { setting: displayBranding, div: "#brandImg" },
      { setting: displayLabels, div: "#list" },
      { setting: displaySchedule, div: "#schedule" },
      { setting: displayCountdown, div: "#countdown" },
      { setting: displaySocial, div: "#social" }
    ].forEach(({ setting, div }) => removeHtml(setting, div));
    // Individual Social Networks
    Object.entries({ twitch: "twi", instagram: "in", youtube: "yt" }).forEach(([network, id]) => {
      removeHtml(settings.social[network], `#${id}`);
    });
    // Set Colors
    const cssProperties = [
      { target: "#overlay", property: "background", value: colors.backgroundOverlay },
      { target: ".bg-accent", property: "border-color", value: colors.frameColor },
      { target: ".primaryFont", property: "color", value: colors.primaryTextColor },
      { target: ".secondaryFont", property: "color", value: colors.subTextColor },
      { target: "#endMessage", property: "color", value: colors.subTextColor },
      { target: ".borderTop, .borderRight, .borderLeft", property: "background", value: colors.accentColor },
      { target: ".network, .event, #week .day", property: "background", value: colors.contentBackgrounds }
    ];
    cssProperties.forEach(({ target, property, value }) => setCssProperty(target, property, value));
    // Set Text
    $("#title").text(sceneTitle).css("white-space", "pre-line");
    $("#subtitle").text(tagline);
    $("#message").text(countdownMessage);
    // Set Fonts
    const fontSettings = [
      { target: "#title", size: fonts.titleSize, offset: fonts.titleVerticalOffset },
      { target: "#subtitle", size: fonts.subtitleSize, offset: fonts.subtitleVerticalOffset },
      { target: "#list .name", size: fonts.labelNameSize, offset: fonts.labelNameVerticalOffset, lineHeight: fonts.labelNameSize },
      { target: "#list .type", size: fonts.labelHeaderSize, offset: fonts.labelHeaderVerticalOffset, lineHeight: fonts.labelHeaderSize },
      { target: "#time", size: fonts.countdownTimeSize, offset: fonts.countdownTimeVerticalOffset },
      { target: "#message", size: fonts.countdownMessageSize, offset: fonts.countdownMessageVerticalOffset },
      { target: "#endMessage", size: fonts.countdownEndMessageSize, offset: fonts.countdownEndMessageVerticalOffset }
    ];
    fontSettings.forEach(({ target, size, offset, lineHeight }) => {
      setCssProperty(target, "font-size", `${size}px`);
      setCssProperty(target, "transform", `translateY(${offset}px)`);
      if (lineHeight) setCssProperty(target, "line-height", `${lineHeight}px`);
    });
    // Social
    $("#displaySocial").text(displaySocial);
    // ["twitch", "twitter", "facebook", "instagram", "youtube"]
    ["twitch", "instagram", "youtube"].forEach((network) => {
      $(`#${network}`).text(settings.social[network]);
      $(`#${network}Header`).text(settings.social[`${network}Header`]);
    });
    // Branding
    setCssProperty("#brandImg", "opacity", Number(logoOpacity));
    setCssProperty("#brandImg", "transform", `scale(${Number(logoScale)})`);
    // Schedule
    ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"].forEach((day) => {
      $(`#${day}`).text(settings.schedule[day]);
    });
    // Misc
    setCssProperty("#frame", "border-width", `${Number(frameWidth)}px`);
    setCssProperty("#overlay", "opacity", Number(backgroundOverlayOpacity));
    ["#video video", "#image img"].forEach((selector) => {
      setCssProperty(selector, "filter", `blur(${Number(backgroundBlur)}px)`);
      setCssProperty(selector, "transform", `scale(${Number(backgroundScale)})`);
    });
    // Labels
    ["labelOne", "labelTwoHeading", "labelThreeHeading", "labelFourHeading"].forEach((label, index) => {
      $(`#${["followLine", "tipLine", "bigTipLine", "subLine"][index]}`).text(settings.labels[label]);
    });
    // Scaling
    ["socialMediaScale", "labelsScale", "scheduleScale", "countdownScale"].forEach((scale, index) => {
      setCssProperty(`#${["social", "list", "schedule", "countdown"][index]}`, "transform", `scale(${Number(scaling[scale])})`);
    });
  }

  /**
   * Updates a countdown once per second and clears its interval when the ending message appears.
   * @param {number} duration Duration in seconds.
   * @param {jQuery} display Countdown text element.
   */
  function startTimer(duration, display) {
    let timer = duration,
      minutes,
      seconds;
    const interval = setInterval(() => {
      minutes = parseInt(timer / 60, 10);
      seconds = parseInt(timer % 60, 10);
      minutes = minutes < 10 ? "" + minutes : minutes;
      seconds = seconds < 10 ? "0" + seconds : seconds;
      display.text(`${minutes}:${seconds}`);
      if (--timer < 0) {
        clearInterval(interval);
        $("#time").hide();
        $("#message").hide();
        $("#endMessage").text(settings.countdown.countdownOverMessage);
        $("#endMessage").css("display", "block");
      }
    }, 1000);
  }

  // Initial Setup
  $(document).ready(() => {
    applySettings();
    // Update names periodically (uncomment if needed)
    /* setInterval(() => {
			updateText("#followName", settings.labels.labelOnePath);
			updateText("#tipName", settings.labels.labelTwoPath);
			updateText("#bigTipName", settings.labels.labelThreePath);
			updateText("#subName", settings.labels.labelFourPath);
		}, 3000); */
    // Start timer
    if ($("#time").length) startTimer(60 * settings.countdown.countdownTime, $("#time"));
    // Add Animations
    const tl = gsap.timeline({ repeat: -1 });
    $(".item").each(function () {
      tl.to(this, { duration: 0, onComplete: () => $(this).addClass("animated"), delay: 1 }).to(this, { duration: 10, onComplete: () => $(this).removeClass("animated") });
    });
  });
}
