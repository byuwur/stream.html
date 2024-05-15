// Display Options
function removeHtml(setting, div) {
	if (!setting || setting == "no" || setting == "") $(div).remove();
}
// Set Font Sizes
function setFontSize(target, settingVar) {
	$(target).css("font-size", settingVar + "px");
}
function setVerticalOffset(target, settingVar) {
	$(target).css("transform", "translateY(" + settingVar + "px)");
}
function getNames() {
	$.get("../TextFiles/" + settings.labels.labelOnePath + ".txt", function (data) {
		$("#followName").text(data);
	});
	$.get("../TextFiles/" + settings.labels.labelTwoPath + ".txt", function (data) {
		$("#tipName").text(data);
	});
	$.get("../TextFiles/" + settings.labels.labelThreePath + ".txt", function (data) {
		$("#bigTipName").text(data);
	});
	$.get("../TextFiles/" + settings.labels.labelFourPath + ".txt", function (data) {
		$("#subName").text(data);
	});
}
getNames();
// BGV
if (settings.options.backgroundType == "video") $("#image").remove();
else $("#video").remove();
// Entire areas
removeHtml(settings.options.displayBranding, "#brandImg");
removeHtml(settings.labels.displayLabels, "#list");
removeHtml(settings.schedule.displaySchedule, "#schedule");
removeHtml(settings.countdown.displayCountdown, "#countdown");
removeHtml(settings.social.displaySocial, "#social");
// Individual Social Networks
removeHtml(settings.social.twitter, "#tw");
removeHtml(settings.social.facebook, "#fb");
removeHtml(settings.social.instagram, "#in");
removeHtml(settings.social.youtube, "#yt");
// Individual Labels
removeHtml(settings.labels.labelOne, "#one");
removeHtml(settings.labels.labelTwoHeading, "#two");
removeHtml(settings.labels.labelThreeHeading, "#three");
removeHtml(settings.labels.labelFourHeading, "#four");
// Set colors
$("#overlay").css("background", settings.colors.backgroundOverlay);
$(".bg-accent").css("border-color", settings.colors.frameColor);
$(".primaryFont").css("color", settings.colors.primaryTextColor);
$(".secondaryFont").css("color", settings.colors.subTextColor);
$("#endMessage").css("color", settings.colors.subTextColor);
$(".borderTop").css("background", settings.colors.accentColor);
$(".borderRight").css("background", settings.colors.accentColor);
$(".borderLeft").css("background", settings.colors.accentColor);
$(".network").css("background", settings.colors.contentBackgrounds);
$(".event").css("background", settings.colors.contentBackgrounds);
$(".icon").css("color", settings.colors.accentColor);
$("#week .day").css("background", settings.colors.contentBackgrounds);
// Set Text
$("#title").html(settings.options.sceneTitle);
$("#subtitle").html(settings.options.tagline);
// Set Fonts
$(".primaryFont").css("font-family", settings.fonts.primaryFont);
$(".secondaryFont").css("font-family", settings.fonts.subFont);
setFontSize("#title", settings.fonts.titleSize);
setVerticalOffset("#title", settings.fonts.titleVerticalOffset);
setFontSize("#subtitle", settings.fonts.subtitleSize);
setVerticalOffset("#subtitle", settings.fonts.subtitleVerticalOffset);
setFontSize("#list .name", settings.fonts.labelNameSize);
setVerticalOffset("#list .name", settings.fonts.labelNameVerticalOffset);
$("#list .name").css("line-height", settings.fonts.labelNameSize + "px");
setFontSize("#list .type", settings.fonts.labelHeaderSize);
setVerticalOffset("#list .type", settings.fonts.labelHeaderVerticalOffset);
$("#list .type").css("line-height", settings.fonts.labelHeaderSize + "px");
setFontSize("#time", settings.fonts.countdownTimeSize);
setVerticalOffset("#time", settings.fonts.countdownTimeVerticalOffset);
setFontSize("#message", settings.fonts.countdownMessageSize);
setVerticalOffset("#message", settings.fonts.countdownMessageVerticalOffset);
setFontSize("#endMessage", settings.fonts.countdownEndMessageSize);
setVerticalOffset("#endMessage", settings.fonts.countdownEndMessageVerticalOffset);
// Social
$("#displaySocial").html(settings.social.displaySocial);
$("#twitch").html(settings.social.twitch);
$("#twitterHeader").html(settings.social.twitterHeader);
$("#twitter").html(settings.social.twitter);
$("#facebookHeader").html(settings.social.facebookHeader);
$("#facebook").html(settings.social.facebook);
$("#instagramHeader").html(settings.social.instagramHeader);
$("#instagram").html(settings.social.instagram);
$("#youtubeHeader").html(settings.social.youtubeHeader);
$("#youtube").html(settings.social.youtube);
// Branding
$("#brandImg").css("opacity", Number(settings.options.logoOpacity));
$("#brandImg").css("transform", "scale(" + Number(settings.options.logoScale) + ")");
// Schedule
$("#mon").html(settings.schedule.monday);
$("#tue").html(settings.schedule.tuesday);
$("#wed").html(settings.schedule.wednesday);
$("#thu").html(settings.schedule.thursday);
$("#fri").html(settings.schedule.friday);
$("#sat").html(settings.schedule.saturday);
$("#sun").html(settings.schedule.sunday);
// Misc
$("#frame").css("border-width", Number(settings.options.frameWidth) + "px");
$("#overlay").css("opacity", Number(settings.options.backgroundOverlayOpacity));
$("#video video").css("filter", "blur(" + Number(settings.options.backgroundBlur) + "px)");
$("#image img").css("filter", "blur(" + Number(settings.options.backgroundBlur) + "px)");
$("#video video").css("transform", "scale(" + Number(settings.options.backgroundScale) + ")");
$("#image img").css("transform", "scale(" + Number(settings.options.backgroundScale) + ")");
//  Labels
$("#followLine").html(settings.labels.labelOneHeading);
$("#tipLine").html(settings.labels.labelTwoHeading);
$("#bigTipLine").html(settings.labels.labelThreeHeading);
$("#subLine").html(settings.labels.labelFourHeading);
// Countdown
let minutes = settings.countdown.countdownTime;
$("#message").html(settings.countdown.countdownMessage);
// Scaling
$("#social").css("transform", "scale(" + Number(settings.scaling.socialMediaScale) + ")");
$("#list").css("transform", "scale(" + Number(settings.scaling.labelsScale) + ")");
$("#schedule").css("transform", "scale(" + Number(settings.scaling.scheduleScale) + ")");
$("#countdown").css("transform", "scale(" + Number(settings.scaling.countdownScale) + ")");
window.setInterval(getNames, 3000);
// Add Animations
$(document).ready(function () {
	function addAnimated(identifier) {
		$(identifier).addClass("animated");
	}
	function rmvAnimated(identifier) {
		$(identifier).removeClass("animated");
	}
	tl = new TimelineMax({ repeat: -1 });
	$(".item").each(function () {
		tl.to(this, 0, { onComplete: addAnimated, onCompleteParams: [this], delay: 1 });
		tl.to(this, 14.2, { onComplete: rmvAnimated, onCompleteParams: [this] });
	});
});
