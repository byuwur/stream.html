// Utility Functions
function removeHtml(setting, div) {
	if (!setting || setting === "no" || setting === "") $(div).remove();
}

function setCssProperty(target, property, value) {
	$(target).css(property, value);
}

function updateText(selector, path) {
	$.get(`../txt/${path}.txt`, (data) => {
		$(selector).text(data);
	});
}

function applySettings() {
	const { backgroundType, displayBranding, sceneTitle, tagline, logoOpacity, logoScale, frameWidth, backgroundOverlayOpacity, backgroundBlur, backgroundScale } = settings.options;
	const { displayLabels, labelOne, labelTwoHeading, labelThreeHeading, labelFourHeading } = settings.labels;
	const { displaySchedule } = settings.schedule;
	const { displayCountdown, countdownMessage, countdownEndMessage, countdownTime } = settings.countdown;
	const { displaySocial, twitter, facebook, instagram, youtube, socialMediaScale } = settings.social;
	const { colors, fonts, scaling } = settings;
	// Background
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
	["twitter", "facebook", "instagram", "youtube"].forEach((network) => {
		removeHtml(settings.social[network], `#${network.slice(0, 2)}`);
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
	$("#title").html(sceneTitle);
	$("#subtitle").html(tagline);
	$("#message").html(countdownMessage);
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
	$("#displaySocial").html(displaySocial);
    // ["twitch", "twitter", "facebook", "instagram", "youtube"]
	["twitch", "instagram", "youtube"].forEach((network) => {
		$(`#${network}`).html(settings.social[network]);
		$(`#${network}Header`).html(settings.social[`${network}Header`]);
	});
	// Branding
	setCssProperty("#brandImg", "opacity", Number(logoOpacity));
	setCssProperty("#brandImg", "transform", `scale(${Number(logoScale)})`);
	// Schedule
	["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"].forEach((day) => {
		$(`#${day}`).html(settings.schedule[day]);
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
		$(`#${["followLine", "tipLine", "bigTipLine", "subLine"][index]}`).html(settings.labels[label]);
	});
	// Scaling
	["socialMediaScale", "labelsScale", "scheduleScale", "countdownScale"].forEach((scale, index) => {
		setCssProperty(`#${["social", "list", "schedule", "countdown"][index]}`, "transform", `scale(${Number(scaling[scale])})`);
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
	startTimer(60 * settings.countdown.countdownTime, $("#time"));
	// Add Animations
	const tl = new TimelineMax({ repeat: -1 });
	$(".item").each(function () {
		tl.to(this, 0, { onComplete: () => $(this).addClass("animated"), delay: 1 }).to(this, 10, { onComplete: () => $(this).removeClass("animated") });
	});
});
