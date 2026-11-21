/*
 * File: __tests__/resources.cjs
 * Desc: Offline public resource settings, initialization, and URL contracts.
 */
const assert = require("node:assert/strict");
const path = require("node:path");
const test = require("node:test");
const { runtimeAssets, launchBrowser, loadAssets, resourceNames, serve } = require("./browser.cjs");
const coreOnly = process.env.STREAM_CORE_ONLY === "1";

test("element spacing, legacy typography and entrances compose on a standalone overlay", async (t) => {
  const browser = await launchBrowser();
  t.after(() => browser.close());
  const page = await browser.newPage();
  await serve(page, await loadAssets(runtimeAssets), true);
  const params = new URLSearchParams({
    label: "Live",
    badgeTextFontSize: "28",
    "badgeText.fontSize": "32",
    "badgeText.marginLeft": "-6",
    "badgeText.paddingTop": "0",
    "badgeText.perspective": "760",
    "badgeText.rotateY": "24",
    "badgeText.skewX": "8",
    "badgeText.entrance": "fadeInRight",
    "badgeText.entranceDuration": "3000",
    "badgeText.entranceDelay": "250",
    "badgeText.entranceTravel": "50"
  });
  await page.goto("https://stream.test/badge/?" + params);
  await page.waitForFunction(() =>
    document
      .querySelector(".primary")
      ?.getAnimations()
      .some((animation) => animation.id === "stream-entrance")
  );
  const result = await page.locator(".primary").evaluate((node) => {
    const entrance = node.getAnimations().find((animation) => animation.id === "stream-entrance");
    const frames = entrance.effect.getKeyframes(),
      timing = entrance.effect.getTiming();
    entrance.finish();
    const style = getComputedStyle(node);
    return {
      size: style.fontSize,
      left: style.marginLeft,
      top: style.paddingTop,
      transform: style.transform,
      travel: frames[0].transform,
      duration: timing.duration,
      delay: timing.delay,
      url: byStream.settingsURL(byStreamResource, byStreamResource.settings).search
    };
  });
  assert.equal(result.size, "32px");
  assert.equal(result.left, "-6px");
  assert.equal(result.top, "0px");
  assert.match(result.transform, /matrix3d/);
  assert.match(result.travel, /50%/);
  assert.deepEqual([result.duration, result.delay], [3000, 250]);
  const saved = new URLSearchParams(result.url);
  assert.equal(saved.has("badgeTextFontSize"), false);
  assert.equal(saved.get("badgeText.fontSize"), "32");
  assert.equal(saved.get("badgeText.paddingTop"), "0");
  assert.equal(saved.has("badgeText.paddingLeft"), false);
  saved.set("animate", "no");
  await page.goto("https://stream.test/badge/?" + saved);
  await page.locator(".primary").waitFor();
  assert.deepEqual(await page.locator(".primary").evaluate((node) => node.getAnimations().map((animation) => animation.id)), ["stream-transform"]);
});

test("quote changes animate the quote and author while preserving the heading and panel", async (t) => {
  const browser = await launchBrowser();
  t.after(() => browser.close());
  const page = await browser.newPage();
  await serve(page, await loadAssets(runtimeAssets), true);
  await page.addInitScript(() => {
    window.slotTime = 0;
    Date.now = () => window.slotTime;
  });
  const query = new URLSearchParams({
    heading: "Quotes",
    entries: JSON.stringify({ First: "A", Second: "B", Third: "C" }),
    duration: "5",
    "overlay.entrance": "slideInRight",
    "overlay.matchExit": "no",
    "overlay.exit": "fadeOut",
    "overlay.exitDuration": "3000",
    "author.entrance": "zoomIn",
    "author.entranceDuration": "900"
  });
  await page.goto("https://stream.test/quotes/?" + query);
  await page.locator(".quote-text").waitFor();
  const result = await page.evaluate(async () => {
    const panel = document.querySelector(".panel"),
      heading = panel.querySelector(".eyebrow");
    const quote = panel.querySelector("blockquote"),
      author = panel.querySelector(".secondary");
    const timing = (node) =>
      node
        .getAnimations()
        .find((animation) => animation.id === "stream-entrance")
        ?.effect.getTiming().duration;
    const initial = [timing(quote), timing(author)];
    const tick = (time) => {
      window.slotTime = time;
      document.dispatchEvent(new Event("visibilitychange"));
    };
    tick(5000);
    const exits = [quote, author].map((node) => node.getAnimations().find((animation) => animation.id === "stream-exit"));
    tick(10000);
    const during = [quote.textContent, panel.getAnimations().length, heading.getAnimations().length];
    exits.forEach((animation) => animation.finish());
    await new Promise(requestAnimationFrame);
    return { initial, during, next: panel.querySelector("blockquote").textContent, sameHeading: heading === panel.querySelector(".eyebrow"), removed: !quote.isConnected };
  });
  assert.deepEqual(result, { initial: [300, 900], during: ["First", 0, 0], next: "Third", sameHeading: true, removed: true });
  await page.goto("https://stream.test/quotes/?transition=slide&playback.transitionDuration=800&playback.slideDistance=-35");
  await page.locator(".quote-text").waitFor();
  const saved = await page.evaluate(() => byStream.settingsURL(byStreamResource, byStreamResource.settings).search);
  const migrated = new URLSearchParams(saved);
  assert.equal(migrated.get("overlay.entrance"), "default");
  assert.equal(migrated.get("overlay.entranceDuration"), "400");
  assert.equal(migrated.get("overlay.entranceDistance"), "-35");
  assert.equal(migrated.has("transition"), false);
});

test("rotating overlays play both phases on the current item", { timeout: 30000 }, async (t) => {
  const browser = await launchBrowser();
  t.after(() => browser.close());
  const page = await browser.newPage();
  await serve(page, await loadAssets(runtimeAssets), true);
  await page.addInitScript(() => {
    window.slotTime = 0;
    Date.now = () => window.slotTime;
  });
  for (const [name, owner, selector, seconds, settings] of [
    ["sponsors", "overlay", ".primary,.secondary", 3, { duration: 3 }],
    ["reminder", "overlay", ".primary", 10, { interval: 10, duration: 10, "overlay.container.entrance": "none" }],
    ["randomizer", "result", ".primary,.secondary", 3, { mode: "automatic", duration: 3, showNumber: "yes" }],
    ["ticker", "message", ".ticker-message", 3, { mode: "rotate", duration: 3, "overlay.children.entrance": "none" }],
    ["watermark", "overlay", ".brand-text", 3, { fadeInterval: 10, visibleDuration: 3 }]
  ]) {
    await t.test(name, async () => {
      const params = new URLSearchParams({ ...settings, [owner + ".entrance"]: "fadeIn", [owner + ".entranceDuration"]: 5000 });
      await page.goto("https://stream.test/" + name + "/?" + params);
      await page.locator(selector).first().waitFor();
      const result = await page.evaluate(
        async ({ selector, seconds, hide }) => {
          const panel = document.querySelector(".panel"),
            heading = panel.querySelector(".eyebrow");
          const tick = (time) => {
            window.slotTime = time;
            document.dispatchEvent(new Event("visibilitychange"));
          };
          const nodes = [...panel.querySelectorAll(selector)],
            text = nodes.map((node) => node.textContent);
          const has = (node, phase) => node.getAnimations().some((animation) => animation.id === "stream-" + phase);
          const initial = nodes.every((node) => has(node, "entrance"));
          tick(seconds * 1000);
          const leaving = nodes.every((node) => has(node, "exit"));
          const stable = ![panel, heading].some((node) => node && (has(node, "entrance") || has(node, "exit"))) && !panel.hidden;
          for (const node of nodes) for (const motion of node.getAnimations()) if (motion.id === "stream-exit") motion.finish();
          await new Promise(requestAnimationFrame);
          const changed = hide ? panel.hidden : JSON.stringify([...panel.querySelectorAll(selector)].map((node) => node.textContent)) !== JSON.stringify(text);
          if (hide) tick(10000);
          while (panel.querySelector("[data-stream-await-size]")) await new Promise(requestAnimationFrame);
          return { initial, leaving, stable, changed, sameHeading: panel.querySelector(".eyebrow") === heading, next: [...panel.querySelectorAll(selector)].every((node) => has(node, "entrance")) };
        },
        { selector, seconds, hide: name === "watermark" }
      );
      assert.deepEqual(result, { initial: true, leaving: true, stable: true, changed: true, sameHeading: true, next: true });
    });
  }
  await page.goto("https://stream.test/ticker/?mode=fade&transitionDuration=1400");
  await page.locator(".ticker-message").waitFor();
  const saved = await page.evaluate(() => byStream.settingsURL(byStreamResource, byStreamResource.settings).search);
  assert.equal(new URLSearchParams(saved).get("message.entrance"), "fadeIn");
  assert.equal(new URLSearchParams(saved).get("message.entranceDuration"), "700");
});

test("lower thirds animate the painted panel and its configured children across swaps and gaps", async (t) => {
  const browser = await launchBrowser();
  t.after(() => browser.close());
  const page = await browser.newPage();
  await serve(page, await loadAssets(runtimeAssets), true);
  await page.addInitScript(() => {
    window.slotTime = 0;
    Date.now = () => window.slotTime;
  });
  for (const gap of [0, 1]) {
    const query = new URLSearchParams({ duration: 3, gap, resizeDuration: 0, "overlay.entrance": "fadeInUp", "overlay.entranceDuration": 3000, "name.entrance": "fadeIn", "name.entranceDuration": 5000 });
    await page.goto("https://stream.test/lower-thirds/?" + query);
    const result = await page.locator(".panel:has(.primary)").evaluate(async (panel, gap) => {
      const tick = (time) => {
        window.slotTime = time;
        document.dispatchEvent(new Event("visibilitychange"));
      };
      const motion = (node, phase) => node.getAnimations().find((animation) => animation.id === "stream-" + phase);
      const first = panel.querySelector(".primary");
      const entrance = motion(panel, "entrance");
      const panelFrames = entrance.effect.getKeyframes();
      const timings = [entrance, motion(first, "entrance")].map((entry) => entry.effect.getTiming().duration);
      tick(3000);
      motion(panel, "exit").finish();
      await new Promise(requestAnimationFrame);
      const waiting = !panel.hidden && first.isConnected && !!motion(first, "exit");
      for (const animation of panel.getAnimations({ subtree: true })) if (animation.id === "stream-exit") animation.finish();
      await new Promise(requestAnimationFrame);
      const hidden = panel.hidden;
      if (gap) tick(4000);
      await new Promise(requestAnimationFrame);
      return { timings, moves: panelFrames.some((frame) => frame.transform?.includes("10%")), waiting, hidden, replaced: panel.querySelector(".primary") !== first, next: !!motion(panel, "entrance") };
    }, gap);
    assert.deepEqual(result, { timings: [3000, 5000], moves: true, waiting: true, hidden: !!gap, replaced: true, next: true });
  }
});

test("Randomizer finishes the old draw, resizes with the new text hidden, then enters with a short slide", async (t) => {
  const browser = await launchBrowser();
  t.after(() => browser.close());
  const page = await browser.newPage();
  page.setDefaultTimeout(5000);
  await serve(page, await loadAssets(runtimeAssets), true);
  const params = new URLSearchParams({ mode: "manual", entries: JSON.stringify(["Try a new character!", "One more round?"]), seed: 1, round: 0, resizeDuration: 3000, "result.entrance": "slideInRight", "result.entranceDuration": 4000 });
  await page.goto("https://stream.test/randomizer/?" + params);
  const result = page.locator(".primary");
  const button = page.locator(".draw-button");
  await result.waitFor();
  const heading = page.locator(".panel .eyebrow");
  function glyphs(node) {
    const range = document.createRange();
    range.selectNodeContents(node);
    const word = range.getBoundingClientRect();
    range.setEnd(node.firstChild, 1);
    const first = range.getBoundingClientRect();
    range.setStart(node.firstChild, 1);
    range.setEnd(node.firstChild, 2);
    return [word.width, word.height, first.width, range.getBoundingClientRect().x - first.x, word.x + word.width / 2, word.y];
  }
  const before = await heading.evaluate(glyphs);
  await button.click();
  assert.equal(await result.textContent(), "Try a new character!");
  const outgoing = await result.evaluate((node) => {
    const motion = node.getAnimations().find((item) => item.id === "stream-exit");
    const last = motion.effect.getKeyframes().at(-1);
    motion.finish();
    return [last.transform, last.filter, getComputedStyle(node.closest(".panel")).overflowX];
  });
  assert.match(outgoing[0], /10%/);
  assert.match(outgoing[1], /opacity\(0\)/);
  assert.equal(outgoing[2], "clip");
  await page.waitForFunction(() =>
    document
      .querySelector(".panel")
      .getAnimations()
      .some((animation) => animation.id === "stream-resize")
  );
  assert.equal(await result.textContent(), "One more round?");
  assert.ok(await result.isHidden());
  const panel = page.locator(".panel");
  const widths = [];
  for (const time of [0, 750, 1500, 2250]) {
    widths.push(
      await panel.evaluate((node, time) => {
        const resize = node.getAnimations().find((motion) => motion.id === "stream-resize");
        resize.pause();
        resize.currentTime = time;
        return node.getBoundingClientRect().width;
      }, time)
    );
    const sample = await heading.evaluate(glyphs);
    // Some engines snap individual glyph ranges to whole pixels even at the same text width.
    assert.ok(
      sample.every((size, i) => Math.abs(size - before[i]) <= (i < 2 ? 0.1 : 1)),
      JSON.stringify({ time, before, sample })
    );
  }
  assert.ok(
    widths.every((width, i) => !i || width < widths[i - 1]),
    JSON.stringify(widths)
  );
  await panel.evaluate((node) =>
    node
      .getAnimations()
      .find((motion) => motion.id === "stream-resize")
      .finish()
  );
  await result.waitFor();
  const incoming = await result.evaluate((node) => {
    const frame = node
      .getAnimations()
      .find((motion) => motion.id === "stream-entrance")
      .effect.getKeyframes()[0];
    return [frame.transform, frame.filter];
  });
  assert.match(incoming[0], /10%/);
  assert.match(incoming[1], /opacity\(0\)/);
  await button.click();
  await result.evaluate((node) =>
    node
      .getAnimations()
      .find((item) => item.id === "stream-exit")
      .finish()
  );
  await result.waitFor({ state: "hidden" });
  await button.evaluate((node) => {
    node.click();
    node.click();
  });
  await result.waitFor();
  assert.equal(await result.textContent(), "One more round?");
});

test("the sponsor heading follows the panel edge as the logo disappears and returns", async (t) => {
  const browser = await launchBrowser();
  t.after(() => browser.close());
  const page = await browser.newPage();
  await serve(page, await loadAssets(runtimeAssets), true);
  await page.route("https://byuwur.github.io/img/logo.png", (route) =>
    route.fulfill({
      contentType: "image/svg+xml",
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="120"></svg>'
    })
  );
  await page.addInitScript(() => {
    window.slotTime = 0;
    Date.now = () => window.slotTime;
  });
  await page.goto("https://stream.test/sponsors/?resizeDuration=3000&resizeEasing=linear");
  await page.locator(".sponsor-image").waitFor();
  await page.locator(".sponsor-image").evaluate((image) => image.decode());
  const swaps = await page.locator(".eyebrow").evaluate(async (heading) => {
    const panel = heading.parentElement,
      range = new Range();
    range.selectNodeContents(heading);
    const frames = async () => {
      await new Promise(requestAnimationFrame);
      await new Promise(requestAnimationFrame);
    };
    function sample() {
      const box = panel.getBoundingClientRect(),
        text = range.getBoundingClientRect();
      return { y: text.y, inset: text.y - box.y, width: text.width };
    }
    await frames();
    for (const motion of document.getAnimations()) if (motion.id === "stream-resize") motion.finish();
    await frames();
    const swaps = [];
    for (const time of [3000, 6000]) {
      const samples = [sample()];
      window.slotTime = time;
      document.dispatchEvent(new Event("visibilitychange"));
      for (const motion of document.getAnimations()) if (motion.id === "stream-exit") motion.finish();
      await new Promise(requestAnimationFrame);
      await panel.querySelector("img")?.decode();
      await frames();
      const motions = document.getAnimations().filter((a) => a.id === "stream-resize" || a.id === "stream-position");
      for (const time of [0, 1500, 2999]) {
        for (const motion of motions) {
          motion.pause();
          motion.currentTime = time;
        }
        samples.push(sample());
      }
      for (const motion of motions) motion.finish();
      await frames();
      samples.push(sample());
      swaps.push(samples);
    }
    return swaps;
  });
  for (const [i, [before, start, mid, end, after]] of swaps.entries()) {
    assert.ok(Math.abs(start.y - before.y) <= 1 && Math.abs(end.y - after.y) <= 1, JSON.stringify(swaps[i]));
    assert.ok(i ? start.y > mid.y && mid.y > end.y : start.y < mid.y && mid.y < end.y);
    assert.ok([start, mid, end, after].every((s) => Math.abs(s.inset - before.inset) <= 1 && Math.abs(s.width - before.width) < 0.1));
  }
});

test("automatic panels wrap and animate both dimensions under a maximum width", async (t) => {
  const browser = await launchBrowser();
  t.after(() => browser.close());
  const page = await browser.newPage();
  await serve(page, await loadAssets(runtimeAssets), true);
  await page.addInitScript(() => {
    window.slotTime = 0;
    Date.now = () => window.slotTime;
  });
  const params = new URLSearchParams({ entries: JSON.stringify({ Short: "A", ["Long quotation ".repeat(8)]: "B" }), width: 320, duration: 5, heading: "", resizeDuration: 3000, "quote.entrance": "none", "author.entrance": "none" });
  for (const mode of ["content", "fill"]) {
    params.set("widthMode", mode);
    await page.goto("https://stream.test/quotes/?" + params);
    const result = await page.locator(".quote-text").evaluate(async (quote) => {
      const panel = quote.parentElement;
      const frames = async () => {
        await new Promise(requestAnimationFrame);
        await new Promise(requestAnimationFrame);
      };
      const box = () => [panel.offsetWidth, panel.offsetHeight];
      const tick = (time) => {
        window.slotTime = time;
        document.dispatchEvent(new Event("visibilitychange"));
      };
      await frames();
      const short = box();
      tick(5000);
      await frames();
      const grow = panel.getAnimations().find((item) => item.id === "stream-resize");
      const text = panel.querySelector(".quote-text");
      const lines = () => {
        const range = document.createRange();
        range.selectNodeContents(text);
        return [...range.getClientRects()].map(({ width, height }) => [width, height]);
      };
      grow.pause();
      grow.currentTime = 300;
      const early = lines();
      grow.currentTime = 1500;
      const middle = lines();
      grow.finish();
      await frames();
      const long = box(),
        finalLines = lines();
      tick(10000);
      await frames();
      const shrink = panel.getAnimations().filter((item) => item.id === "stream-resize");
      shrink.forEach((motion) => motion.finish());
      await frames();
      return { short, long, early, middle, finalLines, final: box(), grow: grow.effect.getTiming().easing, shrink: shrink.length };
    });
    assert.deepEqual(result.early, result.finalLines);
    assert.deepEqual(result.middle, result.finalLines);
    assert.equal(result.long[0], 320);
    assert.ok(mode === "content" ? result.short[0] < 320 : result.short[0] === 320);
    assert.ok(result.long[1] > result.short[1]);
    assert.deepEqual(result.final, result.short);
    assert.deepEqual([result.grow, result.shrink], ["ease", 1]);
  }
});

test("scrolling credits and ticker replay child effects on each pass in either direction", async (t) => {
  const browser = await launchBrowser();
  t.after(() => browser.close());
  const page = await browser.newPage();
  await serve(page, await loadAssets(runtimeAssets), true);
  for (const [name, horizontal, target] of [
    ["credits", false, ".credit-name"],
    ["ticker", true, ".ticker-message"]
  ]) {
    for (const reverse of [false, true]) {
      const params = new URLSearchParams(
        name === "credits" ? { loop: "yes", rollDirection: reverse ? "reverse" : "normal", "roll.entrance": "fadeIn" } : { mode: "scroll", scrollDirection: reverse ? "reverse" : "normal", "message.entrance": "fadeIn" }
      );
      await page.goto("https://stream.test/" + name + "/?" + params);
      await page.locator("[data-stream-scroll]").waitFor();
      const result = await page.evaluate(
        async ({ horizontal, target, reverse }) => {
          const viewport = document.querySelector("[data-stream-scroll]"),
            track = viewport.firstElementChild;
          const node = track.querySelector(target),
            axis = horizontal ? "left" : "top",
            size = horizontal ? "width" : "height";
          const frame = () => new Promise(requestAnimationFrame);
          await frame();
          await frame();
          track.style.animation = "none";
          const origin = node.getBoundingClientRect()[axis] - viewport.getBoundingClientRect()[axis];
          const extent = viewport.getBoundingClientRect()[size],
            length = node.getBoundingClientRect()[size];
          const move = async (start) => {
            track.style.transform = (horizontal ? "translateX(" : "translateY(") + (start - origin) + "px)";
            await frame();
            await frame();
            return node
              .getAnimations()
              .filter((animation) => animation.id.startsWith("stream-"))
              .map((animation) => animation.id);
          };
          const outside = reverse ? -length - 10 : extent + 10;
          const entering = reverse ? Math.min(0, extent - length) - 3 : extent - 3;
          const exiting = reverse ? extent - 3 : -length + 3;
          await move(outside);
          const first = await move(entering),
            out = await move(exiting);
          await move(outside);
          const repeat = await move(entering);
          return [first, out, repeat, track.getAnimations().length];
        },
        { horizontal, target, reverse }
      );
      assert.deepEqual(result, [["stream-entrance"], ["stream-exit"], ["stream-entrance"], 0], name + " reverse=" + reverse);
    }
  }
});

test("Schedule fits wrapped activity rows when auto columns and content width are selected", async (t) => {
  const browser = await launchBrowser();
  t.after(() => browser.close());
  const page = await browser.newPage();
  await serve(page, await loadAssets(runtimeAssets), true);
  await page.goto("https://stream.test/schedule/?widthMode=content");
  for (const [width, columns] of [
    [960, 2],
    [400, 1],
    [1500, 3],
    [960, 2]
  ]) {
    await page.setViewportSize({ width, height: 540 });
    await page.waitForFunction(
      (columns) => {
        const node = document.querySelector(".schedule-list");
        if (!node?.childElementCount || document.getAnimations().some((motion) => motion.id === "stream-resize")) return false;
        const cards = [...node.children].map((card) => card.getBoundingClientRect());
        const board = node.closest(".panel").getBoundingClientRect();
        const unused = node.getBoundingClientRect().right - Math.max(...cards.map((card) => card.right));
        return cards.filter((card) => card.top === cards[0].top).length === columns && Math.abs(unused) <= 2 && Math.abs((board.left + board.right) / 2 - innerWidth / 2) <= 1;
      },
      columns,
      { timeout: 5000 }
    );
  }
});

test("the progress ring fits its panel and paints elapsed time at automatic and custom sizes", async (t) => {
  const browser = await launchBrowser();
  t.after(() => browser.close());
  const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
  await serve(page, await loadAssets(runtimeAssets), true);
  await page.addInitScript(() => {
    window.slotTime = 0;
    Date.now = () => window.slotTime;
  });
  for (const [size, thickness] of [
    [0, 6],
    [100, 3]
  ]) {
    const query = new URLSearchParams({ style: "ring", duration: 10, animate: "no" });
    if (size) {
      query.set("ringSize", size);
      query.set("ringThickness", thickness);
    }
    await page.goto("https://stream.test/timeline/?" + query);
    const ring = await page.locator(".timeline-ring").evaluate((svg) => {
      window.slotTime = 5000;
      document.dispatchEvent(new Event("visibilitychange"));
      const value = svg.querySelector(".ring-value"),
        bounds = svg.getBoundingClientRect();
      const offset = (bounds.width * 52) / 120 / Math.sqrt(2);
      const x = bounds.left + bounds.width / 2,
        y = bounds.top + bounds.height / 2 - offset;
      return {
        width: bounds.width,
        height: bounds.height,
        stroke: getComputedStyle(value).strokeWidth,
        right: document.elementsFromPoint(x + offset, y).includes(value),
        left: document.elementsFromPoint(x - offset, y).includes(svg.querySelector(".ring-track")),
        progress: Math.round(100 * (1 - parseFloat(value.style.strokeDashoffset) / value.getTotalLength()))
      };
    });
    assert.deepEqual(ring, { width: size || 240, height: size || 240, stroke: thickness + "px", right: true, left: true, progress: 50 });
  }
});

test("particle effects replay on successive flights in both directions", async (t) => {
  const browser = await launchBrowser();
  t.after(() => browser.close());
  const page = await browser.newPage();
  await serve(page, await loadAssets(runtimeAssets), true);
  for (const reverse of [false, true]) {
    const params = new URLSearchParams({ density: 1, wind: 0, speed: 10, speedVariation: 0, motionDirection: reverse ? "reverse" : "normal", "particle.entrance": "fadeIn", "particle.entranceDuration": 1200 });
    await page.goto("https://stream.test/effects/?" + params);
    const phases = await page
      .locator(".particle")
      .first()
      .evaluate(async (node, reverse) => {
        const flight = node.getAnimations().find((motion) => motion.animationName === "fall");
        flight.pause();
        const { delay, duration } = flight.effect.getTiming();
        const height = node.parentElement.clientHeight,
          travel = innerHeight * 2.2;
        const phases = [];
        for (const y of reverse ? [height * 0.65, 8, -node.offsetHeight - 2, height * 0.65] : [height * 0.35, height - 8, height + 2, height * 0.35]) {
          const progress = (y - node.offsetTop) / travel + 0.5;
          flight.currentTime = delay + duration * (1 + (reverse ? 1 - progress : progress));
          await new Promise(requestAnimationFrame);
          await new Promise(requestAnimationFrame);
          phases.push(
            node
              .getAnimations()
              .filter((motion) => motion.id.startsWith("stream-"))
              .map((motion) => motion.id)
          );
        }
        return phases;
      }, reverse);
    assert.ok(phases[0].includes("stream-entrance") && phases[1].includes("stream-exit") && phases[3].includes("stream-entrance"), JSON.stringify(phases));
  }
});

/** Sample premultiplied RGB and alpha at fractional positions in the element. */
async function renderedPixels(page, locator, points) {
  const screenshots = [];
  // Firefox cannot omit the screenshot background. Black gives premultiplied RGB;
  // the increase over white reveals how much of the background shows through.
  for (const background of ["#000", "#fff"]) {
    const png = await locator.screenshot({ style: `html { background: ${background} !important; }` });
    screenshots.push(png.toString("base64"));
  }
  return page.evaluate(
    async ({ screenshots, points }) => {
      const [black, white] = await Promise.all(
        screenshots.map(async (base64) => {
          const image = new Image();
          image.src = `data:image/png;base64,${base64}`;
          await image.decode();
          const canvas = document.createElement("canvas");
          canvas.width = image.width;
          canvas.height = image.height;
          const context = canvas.getContext("2d");
          context.drawImage(image, 0, 0);
          return points.map(([x, y]) => context.getImageData(Math.floor(image.width * x), Math.floor(image.height * y), 1, 1).data);
        })
      );
      return black.map(([r, g, b], i) => {
        const [wr, wg, wb] = white[i];
        return [r, g, b, 255 - Math.round((wr - r + wg - g + wb - b) / 3)];
      });
    },
    { screenshots, points }
  );
}

test("shared resource core", { timeout: 30000 }, async (t) => {
  const browser = await launchBrowser();
  t.after(() => browser.close());
  const page = await browser.newPage();
  page.setDefaultTimeout(5000);
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  // A minimal resource definition exercises the real public initializer without CDN imports.
  await page.route("**/*", (route) => {
    const url = new URL(route.request().url());
    if (url.origin !== "http://stream.test") return route.abort();
    if (url.pathname === "/resource.js") return route.fulfill({ path: path.join(__dirname, "../resource.js"), contentType: "text/javascript" });
    return route.fulfill({
      contentType: "text/html",
      body: `<!doctype html><meta charset="UTF-8"><body>
      <script src="/resource.js"></script>
      <template id="overlay-markup"><main id="overlay"></main></template>
      <script>
        window.definition = {
          title: "Core fixture", urlRequired: ["text"],
          fields: {
            text: { type: "text", default: "default", label: "Text", maxlength: 100 },
            size: { type: "number", default: 16, label: "Size", min: 1, max: 100 },
            layout: { type: "select", default: "plain", label: "Layout", options: { plain: "Plain", compact: "Compact" } }
          }
        };
        window.initialized = byStream.initResource(definition);
      </script>`
    });
  });

  await t.test("initialization publishes validated settings and mounts overlay markup once", async () => {
    await page.goto("http://stream.test/core/?text=hello&size=24&layout=compact");
    const result = await page.evaluate(async () => {
      const settings = await initialized;
      return { text: settings.text, size: settings.size, layout: settings.layout, overlay: byStreamOverlay, same: settings === byStreamResource.settings, editor: typeof byConfigurator };
    });
    assert.deepEqual(result, { text: "hello", size: 24, layout: "compact", overlay: true, same: true, editor: "undefined" });
    assert.equal(await page.locator("html[data-overlay] #overlay").count(), 1);
  });

  await t.test("finite numbers clamp to their limits while invalid choices and unknown keys retain defaults", async () => {
    await page.goto("http://stream.test/core/?size=-1&layout=unknown&extra=untrusted");
    const result = await page.evaluate(async () => {
      const settings = await initialized;
      return { text: settings.text, size: settings.size, layout: settings.layout, extra: Object.hasOwn(settings, "extra") };
    });
    assert.deepEqual(result, { text: "default", size: 1, layout: "plain", extra: false });
    await page.goto("http://stream.test/core/?size=1000000");
    assert.equal(await page.evaluate(async () => (await initialized).size), 100);
    await page.goto("http://stream.test/core/?size=not-a-number");
    assert.equal(await page.evaluate(async () => (await initialized).size), 16);
  });

  await t.test("generated URLs preserve reserved text and nondefault settings", async () => {
    await page.goto("http://stream.test/core/?text=hello&size=24");
    const url = await page.evaluate(async () => {
      const settings = await initialized;
      return byStream.settingsURL(byStreamResource, { ...settings, text: "dr:literal & text" }).href;
    });
    assert.equal(new URL(url).pathname, "/core/");
    assert.equal(new URL(url).searchParams.has("layout"), false, "Defaults stay out of generated URLs");
    await page.goto(url);
    const result = await page.evaluate(async () => {
      const settings = await initialized;
      return { text: settings.text, size: settings.size };
    });
    assert.deepEqual(result, { text: "dr:literal & text", size: 24 });
  });

  assert.deepEqual(errors, [], "No uncaught browser errors");
});

test("standalone resources initialize without their configurators", { timeout: 60000 }, async (t) => {
  const assets = await loadAssets(runtimeAssets);
  const browser = await launchBrowser();
  t.after(() => browser.close());
  for (const name of await resourceNames()) {
    await t.test(name, async () => {
      const page = await browser.newPage();
      page.setDefaultTimeout(5000);
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      try {
        await serve(page, assets, true);
        await page.goto(`https://stream.test/${name}/?player=9`);
        await page.waitForFunction(() => window.byStreamResource && window.byStreamOverlay);
        await page.evaluate(() => byStream.ready);
        assert.equal(await page.locator("html[data-overlay]").count(), 1);
        assert.equal(await page.evaluate(() => typeof window.byConfigurator), "undefined");
        if (name === "controller") await page.locator("#gamepads .controller svg").first().waitFor({ state: "attached" });
        assert.deepEqual(errors, [], `${name}: no startup errors`);
      } finally {
        await page.close();
      }
    });
  }
});

test("controller guide tint and subtle control colors", { timeout: 60000 }, async (t) => {
  const assets = await loadAssets(runtimeAssets);
  const browser = await launchBrowser();
  t.after(() => browser.close());
  const page = await browser.newPage();
  page.setDefaultTimeout(5000);
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await serve(page, assets, true);

  /** Open the actual standalone renderer with optional appearance parameters. */
  async function open(parameters = {}) {
    const query = new URLSearchParams({ player: "9", skin: "ds5", disconnectedTint: "#00000000", disconnectedOpacity: "100", ...parameters });
    await page.goto(`https://stream.test/controller/?${query}`);
    await page.evaluate(() => byStream.ready);
    await page.locator("#gamepads .controller svg").first().waitFor({ state: "attached" });
  }

  /** Read actual surface and marking colors, including hidden compact/pressure geometry. */
  async function controlColors() {
    return page.locator(".control-layer").evaluateAll((controls) =>
      controls.map((control) => ({
        name: control.dataset.name,
        faces: [...control.querySelectorAll(".button-face, .button-detail.stock-plastic")].filter((node) => !node.closest("defs, .guide-logo-original")).map((node) => getComputedStyle(node).fill),
        markings: [...control.querySelectorAll(".marking, .marking [fill], .marking [stroke], .direction-marking")]
          .filter((node) => !node.closest("defs"))
          .map((node) => {
            const style = getComputedStyle(node);
            return [style.fill, style.stroke, style.fillOpacity];
          })
      }))
    );
  }

  await t.test("fixed skins request only their model and the selected guide symbol's source", async () => {
    const requests = [];
    const record = (request) => {
      const match = new URL(request.url()).pathname.match(/\/controllers\/([^/]+\.svg)$/);
      if (match) requests.push(match[1]);
    };
    page.on("request", record);
    try {
      await open({ skin: "fgc6" });
      assert.deepEqual(requests, ["fgc.svg"]);
      requests.length = 0;
      await open({ skin: "ds5", customGuide: "yes", guideSymbol: "playstation", guideScale: "90" });
      assert.deepEqual(requests, ["ds5.svg", "ds3.svg"]);
      assert.ok(await page.locator(".guide-logo-custom").count());
    } finally {
      page.off("request", record);
    }
  });

  await t.test("GameCube shadows change rendered shell pixels independently of highlights", { skip: coreOnly }, async () => {
    await open({ skin: "gcn", highlightIntensity: "10", shadowIntensity: "0" });
    const shadow = page.locator(".controller-background .shell-shadow");
    assert.equal(await shadow.evaluate((element) => getComputedStyle(element).opacity), "0");
    const unshaded = await page.locator(".controller-background").screenshot();
    await open({ skin: "gcn", highlightIntensity: "10", shadowIntensity: "100" });
    assert.equal(await shadow.evaluate((element) => getComputedStyle(element).opacity), "1");
    assert.equal(await page.locator(".controller-background .shell-highlight").evaluate((element) => getComputedStyle(element).opacity), "0.1");
    const shaded = await page.locator(".controller-background").screenshot();
    assert.notDeepEqual(shaded, unshaded, "Shadow intensity affects the rendered shell");
  });

  await t.test("all control surfaces receive a light tint while markings and input remain independent", { skip: coreOnly }, async () => {
    for (const [skin, layout] of [
      ["ds5", "full"],
      ["ds5", "minimal"],
      ["xseries", "full"],
      ["gcn", "full"]
    ]) {
      const parameters = { skin, layout, customColors: "yes", controllerColor: "#ab31e3" };
      await open(parameters);
      const original = await controlColors();
      await open({ ...parameters, tintControls: "yes" });
      const tinted = await controlColors();
      for (let i = 0; i < original.length; i++) {
        assert.deepEqual(tinted[i].markings, original[i].markings, `${skin}/${layout}/${original[i].name}: retain marking colors`);
        for (let j = 0; j < original[i].faces.length; j++) {
          const before = original[i].faces[j].match(/[\d.]+/g)?.map(Number);
          if (!before || before.length !== 3) continue;
          const after = tinted[i].faces[j].match(/[\d.]+/g).map(Number);
          assert.notDeepEqual(after, before, `${skin}/${layout}/${original[i].name}: surface is tinted`);
          const tint = [171, 49, 227];
          for (let channel = 0; channel < 3; channel++) {
            assert.ok(Math.abs(after[channel] - before[channel]) <= Math.abs(tint[channel] - before[channel]) * 0.25 + 1, "Tint preserves most of each hardware color");
          }
        }
      }
      if (skin === "ds5" && layout === "full") {
        await page.keyboard.down("KeyJ");
        await page.locator('.control-layer[data-input="button:0"].pressed').waitFor();
        await page.keyboard.up("KeyJ");
        await page.locator('.control-layer[data-input="button:0"].pressed').waitFor({ state: "detached" });
        await page.keyboard.down("KeyE");
        await page.waitForFunction(() => Number(document.querySelector('.analog-trigger[data-input="button:6"] .trigger-fill-rect').getAttribute("height")) > 0);
        assert.ok(await page.locator('.analog-trigger[data-input="button:6"] .trigger-active .button-face').count());
        await page.keyboard.up("KeyE");
        await page.waitForFunction(() => Number(document.querySelector('.analog-trigger[data-input="button:6"] .trigger-fill-rect').getAttribute("height")) === 0);
      }
    }
  });

  await open();
  const image = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 32;
    const context = canvas.getContext("2d");
    context.fillStyle = "#dcb47880";
    context.fillRect(0, 0, 16, 32);
    context.fillStyle = "#4696dc";
    context.fillRect(16, 0, 16, 32);
    return canvas.toDataURL();
  });
  const guide = { customGuide: "yes", guideSource: "image", guideImage: image };

  await t.test("shell appearance owns solid tint and migrates retired color and image settings", async () => {
    await open({ customColors: "no", controllerColor: "#ab31e3" });
    assert.equal(await page.evaluate(() => byStreamResource.settings.shellAppearance), "off");
    await open({ shellAppearance: "solid", controllerColor: "#ab31e3", shellTintStrength: "60", shellBlendMode: "fill" });
    assert.equal(await page.locator('.shell-texture-definitions feBlend[mode="normal"]').count(), 1);
    assert.equal(await page.locator(".custom-colors").count(), 0, "Solid tint preserves authored surface colors instead of the former flat replacement class");
    await open({ shellAppearance: "tint", shellImage: image, shellTintColor: "#123456", shellTintStrength: "35" });
    await page.locator('[data-shell-texture="ready"]').waitFor();
    const settings = await page.evaluate(() => ({
      mode: byStreamResource.settings.shellAppearance,
      color: byStreamResource.settings.controllerColor,
      tint: byStreamResource.settings.tintControls,
      url: byStream.settingsURL(byStreamResource, byStreamResource.settings).href
    }));
    assert.equal(settings.mode, "image");
    assert.equal(settings.color, "#123456");
    assert.equal(settings.tint, "yes");
    assert.equal(new URL(settings.url).searchParams.has("customColors"), false);
    assert.equal(new URL(settings.url).searchParams.has("shellTintColor"), false);
  });

  /** Sample the real rendered logo, excluding the controller underneath. */
  async function logoPixels(parameters) {
    await open({ ...guide, ...parameters });
    const logo = page.locator(".guide-logo-custom");
    await logo.waitFor();
    await page.addStyleTag({ content: ".controller-background, .guide-custom-housing { visibility: hidden !important; }" });
    return renderedPixels(page, logo, [
      [0.25, 0.5],
      [0.75, 0.5]
    ]);
  }

  await t.test("guide blend modes preserve translucent and opaque image pixels", { skip: coreOnly }, async () => {
    const original = await logoPixels({ guideColorMode: "original" });
    assert.ok(Math.abs(original[0][3] - 128) <= 2, "Fixture contains translucent pixels");
    assert.equal(original[1][3], 255);
    assert.deepEqual(await logoPixels({ guideColorMode: "tint", guideTintStrength: "0" }), original, "Zero strength preserves original pixels");
    for (const guideBlendMode of ["multiply", "overlay", "soft-light", "color", "fill"]) {
      const tinted = await logoPixels({ guideColorMode: "tint", guideTintColor: "#70dd52", guideTintStrength: "65", guideBlendMode });
      for (let i = 0; i < original.length; i++) {
        assert.ok(Math.abs(tinted[i][3] - original[i][3]) <= 2, `${guideBlendMode}: source alpha is preserved`);
        assert.notDeepEqual(tinted[i].slice(0, 3), original[i].slice(0, 3), `${guideBlendMode}: colors are blended`);
      }
    }
    const fill = await logoPixels({ guideColorMode: "tint", guideTintColor: "#6699cc", guideTintStrength: "100", guideBlendMode: "fill" });
    for (const [i, [r, g, b, alpha]] of fill.entries()) {
      assert.ok(Math.abs(alpha - original[i][3]) <= 2, "Fill retains source alpha");
      const expected = [102, 153, 204].map((channel) => Math.round((channel * alpha) / 255));
      for (const [channel, actual] of [r, g, b].entries()) {
        assert.ok(Math.abs(actual - expected[channel]) <= 1, `Fill replaces RGB: got ${[r, g, b]} at alpha ${alpha}, expected ${expected}`);
      }
    }
    const monochrome = await logoPixels({ guideColorMode: "custom", guideColor: "#6699cc" });
    for (const [channel, expected] of [102, 153, 204, 255].entries()) {
      assert.ok(Math.abs(monochrome[1][channel] - expected) <= 2, "Existing monochrome links retain their behavior");
    }
  });

  await t.test("tinted guide symbols survive layout changes and failed images retain the stock emblem", async () => {
    await open({ customGuide: "yes", guideSymbol: "playstation", guideColorMode: "tint", guideTintColor: "#70dd52", guideTintStrength: "65" });
    const logo = page.locator(".guide-logo-custom");
    await logo.waitFor();
    const filter = await logo.getAttribute("filter");
    await page.evaluate(() => byControllerArtwork.setLayout(document.querySelector(".controller"), "minimal"));
    assert.equal(await logo.getAttribute("filter"), filter);
    await page.evaluate(() => byControllerArtwork.setLayout(document.querySelector(".controller"), "full"));
    assert.equal(await logo.getAttribute("filter"), filter);
    await open({ ...guide, guideImage: "missing-image.png", guideColorMode: "tint", guideTintStrength: "65" });
    await page.waitForFunction(() => !document.querySelector(".guide-logo-custom"));
    assert.notEqual(await page.locator(".guide-logo-original").evaluate((node) => getComputedStyle(node).display), "none");
  });

  assert.deepEqual(errors, [], "No uncaught controller errors");
});

test("keyboard image targets mask real key contours even when keycaps are transparent", { skip: coreOnly, timeout: 30000 }, async (t) => {
  const assets = await loadAssets(runtimeAssets);
  const browser = await launchBrowser();
  t.after(() => browser.close());
  const page = await browser.newPage();
  await serve(page, assets, true);
  const image = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 32;
    const context = canvas.getContext("2d");
    context.fillStyle = "#12c45b";
    context.fillRect(0, 0, 32, 32);
    return canvas.toDataURL();
  });
  for (const [imageTarget, shell, shellAlpha, keyAlpha] of [
    ["none", "full", 0, 0],
    ["shell", "full", 255, 0],
    ["keys", "full", 0, 255],
    ["all", "full", 255, 255],
    ["shell", "none", 0, 0],
    ["all", "none", 0, 255],
    ["keys", "outline", 0, 255],
    ["all", "minimal", 128, 255]
  ]) {
    const query = new URLSearchParams({
      mode: "keyboard",
      layout: "wasd",
      shell,
      customColors: "yes",
      shellColor: "#00000000",
      keyColor: "#00000000",
      outlineColor: "#00000000",
      legendColor: "#00000000",
      highlightIntensity: "0",
      shadowIntensity: "0",
      imageTarget,
      imageUrl: image,
      imageFit: "stretch"
    });
    await page.goto(`https://stream.test/keyboard/?${query}`);
    await page.locator('#keyboard-overlay[data-ready="yes"]').waitFor();
    if (imageTarget !== "none") await page.locator('#keyboard-overlay[data-image-ready="yes"]').waitFor();
    const board = page.locator("#keyboard > svg");
    const box = await board.boundingBox();
    // Nested SVG bounding boxes can include the board origin in Firefox.
    const key = await page.locator('#keyboard [data-code="KeyW"]').evaluate((svg) => {
      const board = svg.ownerSVGElement.viewBox.baseVal;
      return [(svg.x.baseVal.value + svg.width.baseVal.value * 0.3) / board.width, (svg.y.baseVal.value + svg.height.baseVal.value * 0.3) / board.height];
    });
    const pixels = await renderedPixels(page, board, [[0.5, 3 / box.height], key]);
    assert.ok(Math.abs(pixels[0][3] - shellAlpha) <= 2, `${imageTarget}/${shell}: shell image mask`);
    assert.ok(Math.abs(pixels[1][3] - keyAlpha) <= 2, `${imageTarget}/${shell}: transparent keycap image mask`);
  }
  await page.goto(`https://stream.test/keyboard/?${new URLSearchParams({ mode: "keyboard", layout: "wasd", imageTarget: "both", shellImage: image })}`);
  await page.locator('#keyboard-overlay[data-ready="yes"][data-image-ready="yes"]').waitFor();
  assert.equal(await page.evaluate(() => byStreamResource.settings.imageUrl), image);
  assert.equal(await page.evaluate(() => byStreamResource.settings.imageTarget), "all");
});

test("Main corners reserve scaled card space and background tint supports Fill", { skip: coreOnly, timeout: 30000 }, async (t) => {
  const assets = await loadAssets(runtimeAssets);
  const browser = await launchBrowser();
  t.after(() => browser.close());
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await serve(page, assets, true);
  for (const position of ["top-left", "top-right", "bottom-left", "bottom-right"]) {
    const query = new URLSearchParams({
      displayCountdown: "yes",
      displaySocial: "yes",
      displaySchedule: "yes",
      displayLabels: "yes",
      countdownPosition: position,
      socialPosition: position,
      schedulePosition: position,
      eventsPosition: position,
      accounts: JSON.stringify([{ platform: "twitch", handle: "test", heading: "Social" }]),
      scheduleEntries: JSON.stringify({ monday: "18:00" }),
      animate: "no"
    });
    await page.goto(`https://stream.test/main/?${query}`);
    const corner = page.locator(`.scene-corner[data-corner="${position}"]`);
    await page.waitForFunction(() => document.querySelectorAll(".corner-item").length === 4 && [...document.querySelectorAll(".corner-item")].every((item) => item.offsetWidth > 0));
    assert.equal(await corner.locator(".corner-item").count(), 4);
    assert.equal(
      await page
        .locator("#social .item")
        .first()
        .evaluate((item) => getComputedStyle(item).visibility),
      "visible",
      "Animate Off displays the first account immediately"
    );
    const boxes = await corner.locator(".corner-item").evaluateAll((items) =>
      items.map((item) => {
        const box = item.getBoundingClientRect();
        return { x: box.x, y: box.y, right: box.right, bottom: box.bottom };
      })
    );
    for (let i = 0; i < boxes.length; i++) {
      assert.ok(boxes[i].x >= 79 && boxes[i].right <= 1841 && boxes[i].y >= 79 && boxes[i].bottom <= 1001, `${position}: cards stay inside the inset`);
      for (let j = i + 1; j < boxes.length; j++)
        assert.ok(boxes[i].right <= boxes[j].x + 1 || boxes[j].right <= boxes[i].x + 1 || boxes[i].bottom <= boxes[j].y + 1 || boxes[j].bottom <= boxes[i].y + 1, `${position}: shared cards do not overlap`);
    }
    query.set("cornerLayout", "column");
    await page.goto(`https://stream.test/main/?${query}`);
    await page.waitForFunction(() => document.querySelectorAll(".corner-item").length === 4 && [...document.querySelectorAll(".corner-item")].every((item) => item.offsetHeight > 0));
    const stacked = await page.locator(".corner-item").evaluateAll((items) =>
      items.map((item) => {
        const box = item.getBoundingClientRect();
        return { top: box.top, bottom: box.bottom };
      })
    );
    for (let i = 1; i < stacked.length; i++) assert.ok(stacked[i].top >= stacked[i - 1].bottom + 15, "Stacked cards retain their spacing");
  }
  await page.goto("https://stream.test/main/?backgroundTint=yes&backgroundOverlay=ff0000&backgroundOverlayOpacity=50&backgroundBlendMode=fill");
  const tint = page.locator("#overlay");
  await tint.waitFor();
  assert.equal(await tint.evaluate((element) => getComputedStyle(element).mixBlendMode), "normal");
  assert.equal(await tint.evaluate((element) => getComputedStyle(element).opacity), "0.5");
});
