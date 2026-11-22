(function () {
  $.getScript("https://cdnjs.cloudflare.com/ajax/libs/gsap/1.20.3/TweenMax.min.js", function () {
    // ===== MESSAGE WIDTHS =====
    // Streamlabs substitutes field placeholders before this animation is created.
    const sameWidth = "{matchWidth}",
      mainWidth = $("#main").width(),
      altWidth = $(".alt:visible").width();

    if (sameWidth == "yes") {
      if (altWidth < mainWidth) $(".alt:visible").width(mainWidth);
      else $("#main").width(altWidth);
    } else if (mainWidth < altWidth) $("#main").width(altWidth);

    // ===== REVEAL ORIGIN =====
    const [horizontal, vertical] = "{mainTransform}".split(" ");
    const textOX = horizontal === "left" ? -100 : horizontal === "right" ? 100 : 0;
    const textOY = textOX ? 0 : vertical === "top" ? -100 : 100;
    const edges = {
      left: [0, 0],
      right: [100, 100],
      top: [0, 0],
      bottom: [100, 100],
      center: horizontal === vertical ? [50, 50] : [0, 100]
    };
    const [left, right] = edges[horizontal];
    const [top, bottom] = edges[vertical];
    const closed = `polygon(${left}% ${top}%, ${right}% ${top}%, ${right}% ${bottom}%, ${left}% ${bottom}%)`;
    const open = "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)";

    // ===== ALERT ANIMATION =====
    const timing = Number("{animationSpeed}") * 0.01,
      easingType = "Power1.easeIn",
      pauseTime = Number("{pauseTime}");

    const timeline = new TimelineMax();
    timeline.timeScale(timing);

    timeline
      .to("#alertHolder", 0, { opacity: 1, delay: 0.4 })
      .fromTo("#main", 0.6, { clipPath: closed }, { clipPath: open, ease: easingType })
      .from("#mainText", 0.3, { x: textOX, y: textOY, opacity: 0 }, "-=.1")
      .fromTo(".alt", 0.6, { clipPath: closed }, { clipPath: open, ease: easingType }, "-=.6")
      .from(".altText", 0.3, { x: textOX * 0.5, y: textOY * 0.5, opacity: 0 }, "-=.1")
      .from("#alert-user-message", 0.3, { x: textOX, y: textOY, opacity: 0 }, "-=.1")
      .to("#message", 0.3, { x: textOX, y: textOY, opacity: 0, delay: pauseTime })
      .to(".altText", 0.3, { x: textOX * 0.5, y: textOY * 0.5, opacity: 0 }, "-=.1")
      .to(".alt", 0.6, { clipPath: closed, ease: easingType }, "-=.3")
      .to("#mainText", 0.3, { x: textOX, y: textOY, opacity: 0 }, "-=.3")
      .to("#main", 0.6, { clipPath: closed, ease: easingType }, "-=.3")
      .to("#alert-user-message", 0.3, { x: textOX, y: textOY, opacity: 0 }, "-=.5")
      .to("#alertHolder", 0.2, { opacity: 1 });
  });
})();
