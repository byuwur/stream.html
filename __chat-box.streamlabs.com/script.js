document.addEventListener("onLoad", function () {
  $(
    /* HTML */ `<style id="newStyle">
      .shiftGlitch:after {
        animation: shift {glitchSpeed}s {repeatAmount} linear alternate-reverse;
      }
      .shiftGlitch:before {
        animation: shift-2 ${Number("{glitchSpeed}") * 3}s {repeatAmount} linear alternate-reverse;
      }
    </style>`
  ).appendTo("head");
});

document.addEventListener("onEventReceived", function () {
  const childrenCount = $("#log .line").length;
  if (childrenCount >= Number("{maxLines}") + 1) $("#log .line:first-child").remove();
});
