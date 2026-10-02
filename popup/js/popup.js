// URL parameters and documentation
const parameterRules = {
  twitch: { type: "text", maxlength: "160", group: "values", description: "Twitch account name shown as plain text." },
  youtube: { type: "text", maxlength: "160", group: "values", description: "Youtube account name shown as plain text." },
  instagram: { type: "text", maxlength: "160", group: "values", description: "Instagram account name shown as plain text." },
  facebook: { type: "text", maxlength: "160", group: "values", description: "Facebook account name shown as plain text." },
  twitter: { type: "text", maxlength: "160", group: "values", description: "Twitter account name shown as plain text." },
  mode: { options: ["right", "left"], description: "Selects the scene preset or the side from which social popups animate." },
  socialsDisplayed: { type: "number", min: "1", max: "5", step: "1", group: "options", description: "Number of accounts to cycle through, starting from the first. Blank accounts still occupy a slot." },
  pauseTime: { type: "number", min: "0", max: "3600", step: "any", group: "options", description: "Seconds to display each account." },
  inbetweenPauseTime: { type: "number", min: "0", max: "3600", step: "any", group: "options", description: "Seconds to wait between animation cycles." },
  scale: { type: "number", min: "0.1", max: "5", step: "any", description: "Size multiplier anchored to the selected top corner." },
  iconBoxColor: { type: "text", maxlength: "160", group: "colors", description: "CSS background color of the animated icon box." },
  textBoxColor: { type: "text", maxlength: "160", group: "colors", description: "CSS background color behind the account name." },
  iconColor: { type: "text", maxlength: "160", group: "colors", description: "CSS color of the social icons." },
  fontColor: { type: "text", maxlength: "160", group: "colors", description: "CSS color of the account names." },
  primaryFont: { type: "text", maxlength: "160", group: "fonts", description: "Font family to use. It must be available on the viewing computer." },
  fontWeight: { type: "number", min: "100", max: "900", step: "100", group: "fonts", description: "Font weight in steps of 100." },
  fontSize: { type: "number", min: "8", max: "100", step: "any", group: "fonts", description: "Account name size in pixels." },
  textYOffset: { type: "number", min: "-100", max: "100", step: "any", group: "fonts", description: "Vertical text adjustment in pixels." }
};

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

function parameterValue(name, fallback) {
  if (parameterRules[name].type === "number") fallback = Number(fallback);
  if (!params.has(name)) return fallback;
  let value = params.get(name);
  if (["showBG", "hideCountdown"].includes(name)) value = ["true", "t", "1", "yes", "y"].includes(value) ? "true" : "false";
  if (!validParameter(name, value)) return fallback;
  return parameterRules[name].type === "number" ? Number(value) : value;
}

const networks = ["twitch", "youtube", "instagram", "facebook", "twitter"];
Object.entries(parameterRules).forEach(([name, rule]) => {
  if (rule.group === "values") values[networks.indexOf(name)] = parameterValue(name, values[networks.indexOf(name)]);
  else if (rule.group) settings[rule.group][name] = parameterValue(name, settings[rule.group][name]);
});
const overlayScale = parameterValue("scale", 1);

// Overlay rendering
if (document.documentElement.hasAttribute("data-overlay")) {
  gsap.registerPlugin(MorphSVGPlugin);
  const elements = ["socialHolder", "holder", "iconBox"];
  elements.forEach((id) => document.getElementById(id).classList.add(config));
  $("#socialHolder").css({ transform: `scale(${overlayScale})`, "transform-origin": `${config} top` });
  values.forEach((value) => {
    $("<span>").addClass("name").text(value).appendTo("#nameHolder");
  });

  // Initialize Canvas and Bind Events
  const ctx = document.getElementById("canvas").getContext("2d");
  // Draw Canvas Elements
  const badgeObject = new Image();
  badgeObject.src = "./img/popup.icons.png";
  badgeObject.onload = function () {
    ctx.canvas.width = 120;
    ctx.canvas.height = badgeObject.height;
    ctx.fillStyle = settings.colors.iconColor;
    ctx.fillRect(0, 0, 120, badgeObject.height);
    ctx.globalCompositeOperation = "destination-atop";
    ctx.drawImage(badgeObject, 0, 0);
  };
  // Appearance Settings
  $("#holder").css("font-family", settings.fonts.primaryFont ?? "Courier New");
  $("#svg").css("fill", settings.colors.iconBoxColor);
  $("#nameHolder").css("background", settings.colors.textBoxColor);
  $(".name").css({
    color: settings.colors.fontColor,
    "font-size": `${settings.fonts.fontSize}px`,
    top: `${settings.fonts.textYOffset}px`,
    "font-weight": settings.fonts.fontWeight
  });
  // Start Animation
  const tl = gsap.timeline({ repeat: -1 }).timeScale(1);
  const square = document.getElementById("square");
  const moveConfig = config === "right" ? ["+=20", "-=20", "+=30", "-=30", "+="] : ["-=20", "+=20", "-=30", "+=30", "-="];

  tl.to("body", { duration: 0, opacity: 1, delay: 0.3 })
    .fromTo("#iconBox", { opacity: 0 }, { duration: 0.6, opacity: 1 })
    .to("#canvasHolder", { duration: 0.1, x: moveConfig[0] })
    .to(square, { duration: 0.2, morphSVG: config === "right" ? "#bigRight" : "#bigLeft" }, "-=.1")
    .to("#iconBox", { duration: 0.2, x: moveConfig[4] + ($("#nameHolder").width() + 40) }, "-=.2")
    .to("#canvasHolder", { duration: 0.1, x: moveConfig[1] })
    .to("#canvasHolder", { duration: 0.1, x: moveConfig[1] })
    .to(square, { duration: 0.2, morphSVG: config === "right" ? "#bigLeft" : "#bigRight" }, "-=.1")
    .to("#iconBox", { duration: 0.3, x: config === "right" ? -30 : 30 }, "-=.2")
    .from("#nameHolder", { duration: 0.1, opacity: 0, scaleX: 0, transformOrigin: config === "right" ? "right center" : "left center" }, "-=.2")
    .to("#canvasHolder", { duration: 0.1, x: moveConfig[0] })
    .to(square, { duration: 0.2, morphSVG: config === "right" ? "#littleRight" : "#littleLeft" }, "-=.1")
    .to("#iconBox", { duration: 0.2, x: moveConfig[2] }, "-=.2")
    .to(square, { duration: 0.2, morphSVG: "#square" });

  for (let i = 0; i < settings.options.socialsDisplayed - 1; i++) {
    tl.to("#canvasHolder", { duration: 0.1, y: "-=20", delay: settings.options.pauseTime })
      .to(square, { duration: 0.2, morphSVG: "#bigUp" }, "-=.1")
      .to("#iconBox", { duration: 0.2, y: "-=20" }, "-=.2")
      .to("#canvasHolder", { duration: 0.1, y: "+=35" })
      .to(square, { duration: 0.2, morphSVG: "#bigDown" }, "-=.1")
      .to("#iconBox", { duration: 0.2, y: "+=40" }, "-=.2")
      .to(".name", { duration: 0, y: "-=100" }, "-=.1")
      .to("#canvas", { duration: 0, y: "-=120" }, "-=.1")
      .to("#holder", { duration: 0.2, y: "+=8" }, "-=.1")
      .to("#holder", { duration: 0.2, y: "-=8" }, "-=0")
      .to(square, { duration: 0.2, morphSVG: "#square" }, "-=.1")
      .to("#iconBox", { duration: 0.2, y: "-=20" }, "-=.2")
      .to("#canvasHolder", { duration: 0.1, y: "-=15" }, "-=.2");
  }

  tl.to("#canvasHolder", { duration: 0.1, x: moveConfig[1], delay: settings.options.pauseTime })
    .to(square, { duration: 0.2, morphSVG: config === "right" ? "#littleLeft" : "#littleRight" }, "-=.1")
    .to("#iconBox", { duration: 0.2, x: moveConfig[3] }, "-=.2")
    .to("#canvasHolder", { duration: 0.1, x: moveConfig[0] })
    .to(square, { duration: 0.2, morphSVG: config === "right" ? "#bigRight" : "#bigLeft" }, "-=.1")
    .to("#iconBox", { duration: 0.3, x: moveConfig[4] + ($("#nameHolder").width() + 240) }, "-=.2")
    .to("#nameHolder", { duration: 0.2, opacity: 0, scaleX: 0, transformOrigin: config === "right" ? "right center" : "left center" }, "-=.3")
    .to("body", { duration: 0, opacity: 0, delay: settings.options.inbetweenPauseTime });
}
