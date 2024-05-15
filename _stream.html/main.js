// Utility Functions
function removeHtml(setting, div) {
	if (!setting || setting === "no" || setting === "") $(div).remove();
}
function setCssProperty(target, property, value) {
	$(target).css(property, value);
}
function updateText(selector, path) {
	$.get(`../TextFiles/${path}.txt`, (data) => {
		$(selector).text(data);
	});
}
function applySettings() {
	// Background
	const { backgroundType } = settings.options;
	backgroundType === "video" ? $("#image").remove() : $("#video").remove();
	// Entire Areas
	[
		{ setting: settings.options.displayBranding, div: "#brandImg" },
		{ setting: settings.labels.displayLabels, div: "#list" },
		{ setting: settings.schedule.displaySchedule, div: "#schedule" },
		{ setting: settings.countdown.displayCountdown, div: "#countdown" },
		{ setting: settings.social.displaySocial, div: "#social" }
	].forEach(({ setting, div }) => removeHtml(setting, div));
	// Individual Social Networks
	["twitter", "facebook", "instagram", "youtube"].forEach((network) => {
		removeHtml(settings.social[network], `#${network.slice(0, 2)}`);
	});
	// Set Colors
	const { colors } = settings;
	setCssProperty("#overlay", "background", colors.backgroundOverlay);
	setCssProperty(".bg-accent", "border-color", colors.frameColor);
	setCssProperty(".primaryFont", "color", colors.primaryTextColor);
	setCssProperty(".secondaryFont", "color", colors.subTextColor);
	setCssProperty("#endMessage", "color", colors.subTextColor);
	setCssProperty(".borderTop, .borderRight, .borderLeft", "background", colors.accentColor);
	setCssProperty(".network, .event, #week .day", "background", colors.contentBackgrounds);
	// Set Text
	$("#title").html(settings.options.sceneTitle);
	$("#subtitle").html(settings.options.tagline);
	$("#message").html(settings.countdown.countdownMessage);
	// Set Fonts
	const { fonts } = settings;
	$(".primaryFont").css("font-family", fonts.primaryFont);
	$(".secondaryFont").css("font-family", fonts.subFont);
	[
		{ target: "#title", size: fonts.titleSize, offset: fonts.titleVerticalOffset },
		{ target: "#subtitle", size: fonts.subtitleSize, offset: fonts.subtitleVerticalOffset },
		{ target: "#list .name", size: fonts.labelNameSize, offset: fonts.labelNameVerticalOffset, lineHeight: fonts.labelNameSize },
		{ target: "#list .type", size: fonts.labelHeaderSize, offset: fonts.labelHeaderVerticalOffset, lineHeight: fonts.labelHeaderSize },
		{ target: "#time", size: fonts.countdownTimeSize, offset: fonts.countdownTimeVerticalOffset },
		{ target: "#message", size: fonts.countdownMessageSize, offset: fonts.countdownMessageVerticalOffset },
		{ target: "#endMessage", size: fonts.countdownEndMessageSize, offset: fonts.countdownEndMessageVerticalOffset }
	].forEach(({ target, size, offset, lineHeight }) => {
		setCssProperty(target, "font-size", `${size}px`);
		setCssProperty(target, "transform", `translateY(${offset}px)`);
		if (lineHeight) setCssProperty(target, "line-height", `${lineHeight}px`);
	});
	// Social
	$("#displaySocial").html(settings.social.displaySocial);
	["twitch", "twitter", "facebook", "instagram", "youtube"].forEach((network) => {
		$(`#${network}`).html(settings.social[network]);
		$(`#${network}Header`).html(settings.social[`${network}Header`]);
	});
	// Branding
	setCssProperty("#brandImg", "opacity", Number(settings.options.logoOpacity));
	setCssProperty("#brandImg", "transform", `scale(${Number(settings.options.logoScale)})`);
	// Schedule
	["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"].forEach((day) => {
		$(`#${day.slice(0, 3)}`).html(settings.schedule[day]);
	});
	// Misc
	setCssProperty("#frame", "border-width", `${Number(settings.options.frameWidth)}px`);
	setCssProperty("#overlay", "opacity", Number(settings.options.backgroundOverlayOpacity));
	["#video video", "#image img"].forEach((selector) => {
		setCssProperty(selector, "filter", `blur(${Number(settings.options.backgroundBlur)}px)`);
		setCssProperty(selector, "transform", `scale(${Number(settings.options.backgroundScale)})`);
	});
	// Labels
	["labelOne", "labelTwoHeading", "labelThreeHeading", "labelFourHeading"].forEach((label, index) => {
		$(`#${["followLine", "tipLine", "bigTipLine", "subLine"][index]}`).html(settings.labels[label]);
	});
	// Scaling
	["socialMediaScale", "labelsScale", "scheduleScale", "countdownScale"].forEach((scale, index) => {
		setCssProperty(`#${["social", "list", "schedule", "countdown"][index]}`, "transform", `scale(${Number(settings.scaling[scale])})`);
	});
}
function startTimer(duration, display) {
	let timer = duration,
		minutes,
		seconds;
	setInterval(() => {
		minutes = parseInt(timer / 60, 10);
		seconds = parseInt(timer % 60, 10);
		minutes = minutes < 10 ? "" + minutes : minutes;
		seconds = seconds < 10 ? "0" + seconds : seconds;
		display.text(`${minutes}:${seconds}`);
		if (--timer < 0) {
			timer = 0;
			$("#time").hide();
			$("#message").hide();
			$("#endMessage").html(settings.countdown.countdownOverMessage);
			$("#endMessage").css("display", "block");
		}
	}, 1000);
}
$("video").attr("loop", "loop");
// Initial Setup
$(document).ready(() => {
	applySettings();
	// Update names periodically
	/*setInterval(() => {
		updateText("#followName", settings.labels.labelOnePath);
		updateText("#tipName", settings.labels.labelTwoPath);
		updateText("#bigTipName", settings.labels.labelThreePath);
		updateText("#subName", settings.labels.labelFourPath);
	}, 3000);*/
	// Start timer
	const timeOfCountdown = 60 * settings.countdown.countdownTime;
	const display = $("#time");
	startTimer(timeOfCountdown, display);
	// Add Animations
	const tl = new TimelineMax({ repeat: -1 });
	$(".item").each(function () {
		tl.to(this, 0, { onComplete: () => $(this).addClass("animated"), delay: 1 }).to(this, 10, { onComplete: () => $(this).removeClass("animated") });
	});
});
