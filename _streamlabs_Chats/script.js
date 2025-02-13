document.addEventListener("onLoad", function (obj) {
	$('<style id="newStyle">.shiftGlitch:after {animation: shift ' + { glitchSpeed } + "s " + { repeatAmount } + " linear alternate-reverse;}.shiftGlitch:before{animation: shift-2 " + { glitchSpeed } * 3 + "s " + { repeatAmount } + " linear alternate-reverse;}</style>").appendTo("head");
});

document.addEventListener("onEventReceived", function (obj) {
	const childrenCount = $("#log .line").length;
	if (childrenCount >= { maxLines } + 1) $("#log .line:first-child").remove();
});
