const config = new URLSearchParams(window.location.search).get("mode") || "right";
console.log("config=", config);
document.getElementById("socialHolder").classList.add(config);
document.getElementById("holder").classList.add(config);
document.getElementById("iconBox").classList.add(config);

// Appearence values ============

let badgeObject,
	imageLoaded = false;

let canvas,
	canvasWidth = 120,
	canvasHeight,
	ctx;

for (let i = 0; i < values.length; i++) {
	$("#nameHolder").append('<span class="name">' + values[i] + "</span>");
}

let boxTime = 0.4;

let tl = new TimelineMax({ repeat: -1 });
tl.timeScale(1);
let square = document.getElementById("square");

// Get and set widths
let nameHolderW, fullWidth;

function animate() {
	tl.to("body", 0, { opacity: 1, delay: 0.3 });
	// // fade in the box
	tl.fromTo("#iconBox", 0.6, { opacity: 0 }, { opacity: 1 });

	// // move right and left
	tl.to("#canvasHolder", 0.1, { x: config === "right" ? "+=20" : "-=20" });
	tl.to(square, 0.2, { morphSVG: config === "right" ? "#bigRight" : "#bigLeft" }, "-=.1");
	tl.to("#iconBox", 0.2, { x: config === "right" ? "+=" + nameHolderW : "-=" + nameHolderW }, "-=.2");

	tl.to("#canvasHolder", 0.1, { x: config === "right" ? "-=40" : "+=40" });
	tl.to(square, 0.2, { morphSVG: config === "right" ? "#bigLeft" : "#bigRight" }, "-=.1");
	tl.to("#iconBox", 0.3, { x: config === "right" ? -30 : 30 }, "-=.2");
	tl.from(
		"#nameHolder",
		0.1,
		{
			opacity: 0,
			scaleX: 0,
			transformOrigin: config === "right" ? "right center" : "left center"
		},
		"-=.2"
	);

	tl.to("#canvasHolder", 0.1, { x: config === "right" ? "+=20" : "-=20" });
	tl.to(square, 0.2, { morphSVG: config === "right" ? "#littleRight" : "#littleLeft" }, "-=.1");
	tl.to("#iconBox", 0.2, { x: config === "right" ? "+=30" : "-=30" }, "-=.2");

	tl.to(square, 0.2, { morphSVG: "#square" });

	// Move Up and Down
	for (let i = 0; i < values.length - 1; i++) {
		tl.to("#canvasHolder", 0.1, { y: "-=20", delay: settings.options.pauseTime });
		tl.to(square, 0.2, { morphSVG: "#bigUp" }, "-=.1");
		tl.to("#iconBox", 0.2, { y: "-=20" }, "-=.2");

		tl.to("#canvasHolder", 0.1, { y: "+=35" });
		tl.to(square, 0.2, { morphSVG: "#bigDown" }, "-=.1");
		tl.to("#iconBox", 0.2, { y: "+=40" }, "-=.2");
		tl.to(".name", 0, { y: "-=100" }, "-=.1");
		tl.to("#canvas", 0, { y: "-=120" }, "-=.1");
		tl.to("#holder", 0.2, { y: "+=8" }, "-=.1");

		tl.to("#holder", 0.2, { y: "-=8" }, "-=0");

		tl.to(square, 0.2, { morphSVG: "#square" }, "-=.1");
		tl.to("#iconBox", 0.2, { y: "-=20" }, "-=.2");
		tl.to("#canvasHolder", 0.1, { y: "-=15" }, "-=.2");
	}

	tl.to("#canvasHolder", 0.1, { x: config === "right" ? "-=10" : "+=10", delay: settings.options.pauseTime });
	tl.to(square, 0.2, { morphSVG: config === "right" ? "#littleLeft" : "#littleRight" }, "-=.1");
	tl.to("#iconBox", 0.2, { x: config === "right" ? "-=30" : "+=30" }, "-=.2");
	tl.to("#canvasHolder", 0.1, { x: config === "right" ? "+=20" : "-=20" });
	tl.to(square, 0.2, { morphSVG: config === "right" ? "#bigRight" : "#bigLeft" }, "-=.1");
	tl.to("#iconBox", 0.3, { x: config === "right" ? "+=" + fullWidth : "-=" + fullWidth }, "-=.2");
	tl.to(
		"#nameHolder",
		0.2,
		{
			opacity: 0,
			scaleX: 0,
			transformOrigin: config === "right" ? "right center" : "left center"
		},
		"-=.3"
	);
	tl.to("body", 0, { opacity: 0, delay: settings.options.inbetweenPauseTime });
}

// Initialize Canvas and Bind Events for canvas ======================

function init() {
	canvas = document.getElementById("canvas");
	ctx = canvas.getContext("2d");
} // end of init

function changeBadge() {
	imageURL = "popup.icons.png";

	// Create image
	badgeObject = new Image();

	// When image loads, draw it
	badgeObject.onload = function () {
		imageLoaded = true;
		draw();
	};

	// Load it
	badgeObject.src = imageURL;
}
changeBadge();

// Draw Canvas Elements
function draw() {
	canvasHeight = badgeObject.height;
	ctx.canvas.width = canvasWidth;
	ctx.canvas.height = canvasHeight;

	ctx.fillStyle = settings.colors.iconColor;
	ctx.fillRect(0, 0, canvasWidth, canvasHeight);
	ctx.globalCompositeOperation = "destination-atop";
	ctx.drawImage(badgeObject, 0, 0);
}

if (settings.fonts.primaryFont == "") {
	settings.fonts.primaryFont = "Montserrat";
}

$("#holder").css("font-family", settings.fonts.primaryFont);
nameHolderW = $("#nameHolder").width() + 80;
fullWidth = nameHolderW + 240;
$("#holder").width(nameHolderW);
animate();

// Launch on load
window.onload = init();

// Set Appearence ======================

$("#svg").css("fill", settings.colors.iconBoxColor);
$("#nameHolder").css("background", settings.colors.textBoxColor);
$(".name").css("color", settings.colors.fontColor);
$(".name").css("font-size", settings.fonts.fontSize + "px");
$(".name").css("top", settings.fonts.textYOffset + "px");
$(".name").css("font-weight", settings.fonts.fontWeight);
