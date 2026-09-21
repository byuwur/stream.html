(function () {
	$.getScript("https://cdnjs.cloudflare.com/ajax/libs/gsap/1.20.3/TweenMax.min.js", function () {
		sameWidth = "{matchWidth}";

		const mainWidth = $("#main").width(),
			altWidth = $(".alt:visible").width();

		if (sameWidth == "yes") {
			if (altWidth < mainWidth) $(".alt:visible").width(mainWidth);
			else $("#main").width(altWidth);
		} else if (mainWidth < altWidth) $("#main").width(altWidth);

		let tOrigin = "{mainTransform}",
			scaleSizeX = 0,
			scaleSizeY = 0,
			textOX = 0,
			textOY = 0;

		switch (tOrigin) {
			case "left top":
				textOX = -100;
				break;
			case "center top":
				scaleSizeX = 1;
				textOY = -100;
				break;
			case "right top":
				textOX = 100;
				break;
			case "right center":
				textOX = 100;
				scaleSizeY = 1;
				break;
			case "right bottom":
				textOX = 100;
				break;
			case "center bottom":
				textOY = 100;
				scaleSizeX = 1;
				break;
			case "left bottom":
				textOX = -100;
				break;
			case "left center":
				textOX = -100;
				scaleSizeY = 1;
				break;
			case "center center":
				textOY = 100;
				break;
		}

		const timing = {animationSpeed} * 0.01,
			easingType = "Power1.easeIn",
			pauseTime = {pauseTime};

		let tl = new TimelineMax();
		tl.timeScale(timing);

		tl.to("#alertHolder", 0, { opacity: 1, delay: 0.4 })
			.from("#main", 0.6, { ease: easingType, scaleX: scaleSizeX, scaleY: scaleSizeY })
			.from("#mainText", 0.3, { x: textOX, y: textOY, opacity: 0 }, "-=.1")
			.from(".alt", 0.6, { ease: easingType, scaleX: scaleSizeX, scaleY: scaleSizeY }, "-=.6")
			.from(".altText", 0.3, { x: textOX * 0.5, y: textOY * 0.5, opacity: 0 }, "-=.1")
			.from("#alert-user-message", 0.3, { x: textOX, y: textOY, opacity: 0 }, "-=.1")
			.to("#message", 0.3, { x: textOX, y: textOY, opacity: 0, delay: pauseTime })
			.to(".altText", 0.3, { x: textOX * 0.5, y: textOY * 0.5, opacity: 0 }, "-=.1")
			.to(".alt", 0.6, { ease: easingType, scaleX: scaleSizeX, scaleY: scaleSizeY }, "-=.3")
			.to("#mainText", 0.3, { x: textOX, y: textOY, opacity: 0 }, "-=.3")
			.to("#main", 0.6, { ease: easingType, scaleX: scaleSizeX, scaleY: scaleSizeY }, "-=.3")
			.to("#alert-user-message", 0.3, { x: textOX, y: textOY, opacity: 0 }, "-=.5")
			.to("#alertHolder", 0.2, { opacity: 1 });
	});
})();
