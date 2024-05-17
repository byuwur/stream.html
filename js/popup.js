const config = new URLSearchParams(window.location.search).get("mode") || "right";
console.log("config=", config);
const elements = ["socialHolder", "holder", "iconBox"];
elements.forEach((id) => document.getElementById(id).classList.add(config));
values.forEach((value) => {
	$("#nameHolder").append(`<span class="name">${value}</span>`);
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
const tl = new TimelineMax({ repeat: -1 }).timeScale(1);
const square = document.getElementById("square");
const moveConfig = config === "right" ? ["+=20", "-=20", "+=30", "-=30", "+="] : ["-=20", "+=20", "-=30", "+=30", "-="];

tl.to("body", 0, { opacity: 1, delay: 0.3 })
	.fromTo("#iconBox", 0.6, { opacity: 0 }, { opacity: 1 })
	.to("#canvasHolder", 0.1, { x: moveConfig[0] })
	.to(square, 0.2, { morphSVG: config === "right" ? "#bigRight" : "#bigLeft" }, "-=.1")
	.to("#iconBox", 0.2, { x: moveConfig[4] + ($("#nameHolder").width() + 40) }, "-=.2")
	.to("#canvasHolder", 0.1, { x: moveConfig[1] })
	.to("#canvasHolder", 0.1, { x: moveConfig[1] })
	.to(square, 0.2, { morphSVG: config === "right" ? "#bigLeft" : "#bigRight" }, "-=.1")
	.to("#iconBox", 0.3, { x: config === "right" ? -30 : 30 }, "-=.2")
	.from("#nameHolder", 0.1, { opacity: 0, scaleX: 0, transformOrigin: config === "right" ? "right center" : "left center" }, "-=.2")
	.to("#canvasHolder", 0.1, { x: moveConfig[0] })
	.to(square, 0.2, { morphSVG: config === "right" ? "#littleRight" : "#littleLeft" }, "-=.1")
	.to("#iconBox", 0.2, { x: moveConfig[2] }, "-=.2")
	.to(square, 0.2, { morphSVG: "#square" });

for (let i = 0; i < values.length - 1; i++) {
	tl.to("#canvasHolder", 0.1, { y: "-=20", delay: settings.options.pauseTime })
		.to(square, 0.2, { morphSVG: "#bigUp" }, "-=.1")
		.to("#iconBox", 0.2, { y: "-=20" }, "-=.2")
		.to("#canvasHolder", 0.1, { y: "+=35" })
		.to(square, 0.2, { morphSVG: "#bigDown" }, "-=.1")
		.to("#iconBox", 0.2, { y: "+=40" }, "-=.2")
		.to(".name", 0, { y: "-=100" }, "-=.1")
		.to("#canvas", 0, { y: "-=120" }, "-=.1")
		.to("#holder", 0.2, { y: "+=8" }, "-=.1")
		.to("#holder", 0.2, { y: "-=8" }, "-=0")
		.to(square, 0.2, { morphSVG: "#square" }, "-=.1")
		.to("#iconBox", 0.2, { y: "-=20" }, "-=.2")
		.to("#canvasHolder", 0.1, { y: "-=15" }, "-=.2");
}

tl.to("#canvasHolder", 0.1, { x: moveConfig[1], delay: settings.options.pauseTime })
	.to(square, 0.2, { morphSVG: config === "right" ? "#littleLeft" : "#littleRight" }, "-=.1")
	.to("#iconBox", 0.2, { x: moveConfig[3] }, "-=.2")
	.to("#canvasHolder", 0.1, { x: moveConfig[0] })
	.to(square, 0.2, { morphSVG: config === "right" ? "#bigRight" : "#bigLeft" }, "-=.1")
	.to("#iconBox", 0.3, { x: moveConfig[4] + ($("#nameHolder").width() + 240) }, "-=.2")
	.to("#nameHolder", 0.2, { opacity: 0, scaleX: 0, transformOrigin: config === "right" ? "right center" : "left center" }, "-=.3")
	.to("body", 0, { opacity: 0, delay: settings.options.inbetweenPauseTime });
