/*
 * File: tests/resources.cjs
 * Desc: Standalone resource rendering, URL validation, and local-file use without configurator imports.
 */

// --- DEPENDENCIES ---
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const test = require("node:test");
const { chromium } = require("playwright");
const { root, runtimeAssets, launchOptions, loadAssets, resourceNames, standaloneHTML, serve } = require("./browser.cjs");

// --- STANDALONE RESOURCE CONTRACTS ---
test("resources render and round-trip URLs without configurator assets", async (t) => {
  const assets = await loadAssets(runtimeAssets);
  const browser = await chromium.launch(launchOptions);
  try {
    // --- PER-RESOURCE RENDERING AND URL ROUND TRIPS ---
    for (const name of await resourceNames()) {
      await t.test(name, async () => {
        const page = await browser.newPage();
        try {
          const errors = [],
            editorRequests = [];
          page.on("pageerror", (error) => errors.push(error.message));
          page.on("request", (request) => {
            if (/configurator\.(js|css)|jquery|bootstrap|select2|pickr|_common\./.test(request.url())) editorRequests.push(request.url());
          });
          await serve(page, assets, true);
          await page.goto(`https://stream.test/${name}/?test=1`);
          await page.waitForFunction(() => window.byStreamResource && window.byStreamOverlay);
          const { url, values } = await page.evaluate(() => {
            if (typeof byConfigurator !== "undefined" || typeof jQuery !== "undefined") throw new Error("Editor dependency loaded");
            if (!document.querySelector("body > :not(script, link, template, style)")) throw new Error("Overlay markup was not mounted");
            const resource = byStreamResource;
            const url = byStream.settingsURL(resource, resource.settings);
            if (!resource.urlRequired.length || resource.urlRequired.some((name) => !url.searchParams.has(name))) throw new Error("Required URL settings missing");
            for (const name of url.searchParams.keys()) if (!Object.hasOwn(resource.fields, name)) throw new Error(`Unknown URL setting: ${name}`);
            return { url: url.href, values: Object.fromEntries([...url.searchParams].filter(([name]) => byStream.fieldEnabled(resource.fields, resource.settings, name))) };
          });
          await page.goto(url);
          await page.waitForFunction(() => window.byStreamResource && window.byStreamOverlay);
          // Inactive fields reset to defaults, including timestamps recreated during startup.
          const restored = await page.evaluate(() => {
            const resource = byStreamResource;
            return Object.fromEntries([...byStream.settingsURL(resource, resource.settings).searchParams].filter(([name]) => byStream.fieldEnabled(resource.fields, resource.settings, name)));
          });
          assert.deepEqual(restored, values);
          assert.deepEqual(editorRequests, []);
          assert.deepEqual(errors, []);
        } finally {
          await page.close();
        }
      });
    }

    // --- URL VALIDATION AND SAFE TEXT ---
    await t.test("invalid values retain defaults while zero and untrusted text survive", async () => {
      const page = await browser.newPage();
      try {
        await serve(page, assets, true);
        const text = '<img src=x onerror="window.injected=1">';
        await page.goto(`https://stream.test/watermark/?${new URLSearchParams({ text, fontSize: "invalid", kind: "invalid", opacity: "0", unknown: "ignored" })}`);
        await page.waitForFunction(() => window.byStreamResource && document.querySelector("#overlay .primary"));
        assert.deepEqual(await page.evaluate(() => ({ fontSize: byStreamResource.settings.fontSize, kind: byStreamResource.settings.kind, opacity: byStreamResource.settings.opacity, injected: window.injected })), {
          fontSize: 16,
          kind: "text",
          opacity: 0,
          injected: undefined
        });
        assert.equal(await page.locator("#overlay .primary").textContent(), text);
        assert.equal(await page.locator("#overlay img, #overlay script").count(), 0);
      } finally {
        await page.close();
      }
    });

    await t.test("resource appearance defaults allow neutral overrides without hiding base text", async () => {
      const page = await browser.newPage();
      try {
        await serve(page, assets, true);
        await page.goto("https://stream.test/clock/?test=1");
        await page.waitForFunction(() => document.querySelector(".time"));
        assert.equal(await page.locator(".panel").evaluate((panel) => getComputedStyle(panel).borderTopWidth), "0px");
        assert.equal(await page.evaluate(() => byStreamResource.fields.label.default), "");
        assert.equal(await page.locator(".eyebrow").count(), 0);
        await page.goto("https://stream.test/clock/?label=Heading&panelBorderWidth=0&headingTracking=0&headingFontSize=0&panelShadow=no&backdropFilterMode=none&radius=0");
        await page.waitForFunction(() => document.querySelector(".time"));
        const styles = await page.evaluate(() => {
          const panel = getComputedStyle(document.querySelector(".panel"));
          const heading = getComputedStyle(document.querySelector(".eyebrow"));
          return { border: panel.borderTopWidth, shadow: panel.boxShadow, blur: panel.backdropFilter, radius: panel.borderTopLeftRadius, tracking: heading.letterSpacing, headingSize: parseFloat(heading.fontSize) };
        });
        assert.equal(styles.headingSize, await page.evaluate(() => byStreamResource.fields.headingFontSize.default), "Size 0 restores the displayed default");
        delete styles.headingSize;
        assert.deepEqual(styles, { border: "0px", shadow: "none", blur: "none", radius: "0px", tracking: "normal" });
      } finally {
        await page.close();
      }
    });

    await t.test("Main insets and text sizes restore concrete defaults from legacy zeros", async () => {
      const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
      try {
        await serve(page, assets, true);
        await page.goto("https://stream.test/main/?displayLabels=yes&updatesLeft=0&updatesTop=0&eventsLeft=0&eventsBottom=0&countdownRight=0&countdownBottom=0&countdownFontSize=0&countdownLineHeight=0");
        await page.waitForSelector("#countdown");
        assert.deepEqual(
          await page.evaluate(() => {
            const updates = getComputedStyle(document.querySelector("#updates"));
            const events = getComputedStyle(document.querySelector("#list"));
            const countdown = getComputedStyle(document.querySelector("#countdown"));
            return [updates.left, updates.top, events.left, events.bottom, countdown.right, countdown.bottom];
          }),
          Array(6).fill("80px")
        );
        assert.deepEqual(await page.evaluate(() => [byStreamResource.settings.countdownFontSize, byStreamResource.settings.countdownLineHeight]), [48, 54]);
        const url = new URL(await page.evaluate(() => byStream.settingsURL(byStreamResource, byStreamResource.settings).href));
        assert.ok(url.searchParams.has("sceneTitle"));
        assert.equal(url.searchParams.has("countdownRight"), false);
        await page.goto("https://stream.test/effects/?effect=symbols&motion=off&symbolFontSize=20&symbolLineHeight=22&sizeVariation=50");
        await page.waitForSelector(".particle");
        const sizes = await page.locator(".particle").evaluateAll((nodes) => nodes.map((node) => parseFloat(getComputedStyle(node).fontSize)));
        assert.ok(Math.max(...sizes) > Math.min(...sizes), "Symbol size variation remains active");
        assert.ok(sizes.every((size) => size >= 15 && size <= 25));
      } finally {
        await page.close();
      }
    });

    await t.test("zero columns fit existing items and retain explicit column counts", async () => {
      const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
      try {
        await serve(page, assets, true);
        for (const [name, selector] of [
          ["schedule", ".schedule-list"],
          ["info", ".info-board"],
          ["shortcuts", ".shortcut-list"]
        ]) {
          await page.goto(`https://stream.test/${name}/?width=0&widthMode=fill`);
          await page.waitForSelector(selector);
          assert.equal(await page.evaluate(() => byStreamResource.fields.columns.default), 0, name);
          assert.equal(await page.evaluate(() => byStreamResource.settings.columns), 0, name);
          const tracks = await page.locator(selector).evaluate((node) =>
            getComputedStyle(node)
              .gridTemplateColumns.split(" ")
              .map(parseFloat)
              .filter((size) => size > 0)
          );
          assert.ok(tracks.length > 1 && tracks.length <= (await page.locator(selector).locator(":scope > *").count()), name);
          await page.goto(`https://stream.test/${name}/?columns=2&width=0&widthMode=fill`);
          await page.waitForSelector(selector);
          assert.equal(await page.locator(selector).evaluate((node) => getComputedStyle(node).gridTemplateColumns.split(" ").length), 2, name);
        }
      } finally {
        await page.close();
      }
    });

    await t.test("sponsor and lower-third images use intrinsic proportions at zero size", async () => {
      const page = await browser.newPage();
      try {
        await serve(page, assets, true);
        const logo = "https://byuwur.github.io/img/logo.png";
        await page.route(logo, (route) =>
          route.fulfill({
            contentType: "image/svg+xml",
            body: '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="24"><rect width="40" height="24"/></svg>'
          })
        );
        const dimensions = (selector) =>
          page.locator(selector).evaluate(async (image) => {
            await image.decode();
            const { width, height } = image.getBoundingClientRect();
            return [width, height];
          });
        await page.clock.install({ time: new Date(0) });
        await page.clock.pauseAt(new Date(1000));
        for (const imageWidth of [0, 80]) {
          await page.goto(`https://stream.test/sponsors/?transition=none&imageWidth=${imageWidth}`);
          assert.deepEqual(await dimensions(".sponsor-image"), imageWidth === 0 ? [40, 24] : [80, 48]);
        }
        await page.clock.fastForward(3000);
        assert.equal(await page.locator(".primary").textContent(), "YOUR PARTNER");
        assert.equal(await page.locator(".sponsor-image").count(), 0);
        const entries = JSON.stringify([{ name: "Partner", subtitle: "", icon: "", imageUrl: logo }]);
        for (const imageSize of [0, 80]) {
          const query = new URLSearchParams({ entries, transition: "none", gap: "0", imageSize });
          await page.goto(`https://stream.test/lower-thirds/?${query}`);
          assert.deepEqual(await dimensions(".lower-image"), imageSize === 0 ? [40, 24] : [80, 80]);
          assert.equal(await page.evaluate(() => byStream.settingsURL(byStreamResource, byStreamResource.settings).searchParams.get("imageSize")), String(imageSize));
        }
      } finally {
        await page.close();
      }
    });

    await t.test("decorative quote marks reserve space beside the quote", async () => {
      const page = await browser.newPage();
      try {
        await serve(page, assets, true);
        await page.goto("https://stream.test/quotes/?marks=yes&quoteIndent=0&transition=none");
        await page.waitForSelector(".quote-text");
        assert.equal(await page.evaluate(() => byStreamResource.settings.quoteIndent), 35.2);
        const styles = await page.locator(".quote-text").evaluate((node) => ({ indent: parseFloat(getComputedStyle(node).paddingLeft), markSize: parseFloat(getComputedStyle(node, "::before").fontSize) }));
        assert.equal(styles.indent, 35.2);
        assert.equal(styles.markSize, 64);
        await page.goto("https://stream.test/quotes/?marks=no&transition=none");
        await page.waitForSelector(".quote-text");
        assert.equal(await page.locator(".quote-text").evaluate((node) => getComputedStyle(node).paddingLeft), "0px");
      } finally {
        await page.close();
      }
    });

    await t.test("webcam backdrop blur stays on the label and can be disabled", async () => {
      const page = await browser.newPage();
      try {
        await serve(page, assets, true);
        await page.goto("https://stream.test/webcam/?test=1");
        await page.waitForFunction(() => document.querySelector(".camera-label"));
        const styles = await page.evaluate(() => ({
          camera: getComputedStyle(document.querySelector(".camera-frame")).backdropFilter,
          label: getComputedStyle(document.querySelector(".camera-label")).backdropFilter
        }));
        assert.equal(styles.camera, "none", "Camera content stays clear");
        assert.ok(styles.label.startsWith("blur(8px)"));
        await page.goto("https://stream.test/webcam/?labelBackdropMode=none&labelSurfacePadding=0");
        await page.waitForFunction(() => document.querySelector(".camera-label"));
        assert.deepEqual(await page.locator(".camera-label").evaluate((label) => ({ blur: getComputedStyle(label).backdropFilter, padding: getComputedStyle(label).padding })), { blur: "none", padding: "0px" });
      } finally {
        await page.close();
      }
    });

    // --- CONTINUING ANIMATION AND VIEWPORT CHANGES ---
    await t.test("timer and timeline interpolate progress between ticks and suspend while hidden", async () => {
      for (const [name, style] of [
        ["timer", ""],
        ["timeline", "bar"],
        ["timeline", "ring"]
      ]) {
        const page = await browser.newPage();
        try {
          await page.clock.install({ time: new Date("2026-11-10T00:00:00Z") });
          await page.clock.pauseAt(new Date("2026-11-10T00:00:00Z"));
          await serve(page, assets, true);
          const params = new URLSearchParams({ duration: "10", milliseconds: "no", progress: "yes", animate: "yes", ...(style ? { style } : {}) });
          await page.goto(`https://stream.test/${name}/?${params}`);
          await page.waitForFunction(() => window.byStreamResource && document.querySelector("progress"));
          await page.clock.runFor(500);
          const value = await page.locator("progress").evaluate((node) => node.value);
          assert.ok(value > 0.04 && value < 0.06, `${name}/${style} advances before the next one-second tick`);
          if (style === "ring") assert.ok(Math.abs((await page.locator(".ring-value").evaluate((node) => parseFloat(node.style.strokeDashoffset))) - 2 * Math.PI * 52 * (1 - value)) < 0.01);
          await page.evaluate(() => {
            window.testHidden = true;
            Object.defineProperty(document, "hidden", { configurable: true, get: () => testHidden });
            document.dispatchEvent(new Event("visibilitychange"));
          });
          const paused = await page.locator("progress").evaluate((node) => node.value);
          await page.clock.runFor(500);
          assert.equal(await page.locator("progress").evaluate((node) => node.value), paused);
          await page.evaluate(() => {
            testHidden = false;
            document.dispatchEvent(new Event("visibilitychange"));
          });
          assert.equal(await page.locator("progress").evaluate((node) => node.value), 0.1);
          params.set("animate", "no");
          await page.goto(`https://stream.test/${name}/?${params}`);
          await page.waitForFunction(() => window.byStreamResource && document.querySelector("progress"));
          await page.clock.runFor(500);
          assert.equal(await page.locator("progress").evaluate((node) => node.value), 0, "Animate Off retains instantaneous clock ticks");
          await page.clock.fastForward(11000);
          assert.equal(await page.locator("progress").evaluate((node) => node.value), 1, "Progress reaches the exact final value");
        } finally {
          await page.close();
        }
      }
    });

    await t.test("changing cards leave before replacement and resize smoothly to new content", async () => {
      const page = await browser.newPage();
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      try {
        await serve(page, assets, true);
        const entries = ["Short", "A much longer result\nwith another line"];
        await page.goto(
          `https://stream.test/randomizer/?${new URLSearchParams({ mode: "manual", entries: JSON.stringify(entries), seed: "1", round: "0", width: "0", resultMotion: "slide", transitionDuration: "5000", showNumber: "yes" })}`
        );
        await page.waitForSelector(".draw-button");
        await page.evaluate(() => document.getAnimations().forEach((animation) => animation.finish()));
        await page.waitForFunction(() => !document.querySelector(".panel").style.height);
        await page.locator(".primary").evaluate((node) => node.getAnimations().forEach((animation) => animation.finish()));
        const oldSize = await page.locator(".panel").evaluate((node) => [node.offsetWidth, node.offsetHeight]);
        assert.equal(await page.locator(".primary").textContent(), entries[0]);
        await page.locator(".draw-button").click();
        assert.equal(await page.locator(".primary").textContent(), entries[0], "Outgoing content remains during its exit");
        const exit = await page.locator(".primary").evaluate((node) =>
          node
            .getAnimations()[0]
            .effect.getKeyframes()
            .map((frame) => frame.opacity)
        );
        assert.deepEqual(exit, ["1", "0"]);
        await page.locator(".primary").evaluate((node) => node.getAnimations().forEach((animation) => animation.finish()));
        await page.waitForFunction((text) => document.querySelector(".primary").textContent === text, entries[1]);
        assert.equal(await page.locator(".primary").evaluate((node) => getComputedStyle(node).opacity), "0", "Incoming text stays invisible until resizing finishes");
        const resized = await page.locator(".panel").evaluate((node) => {
          const changes = node.getAnimations().filter((animation) => ["width", "height"].includes(animation.transitionProperty));
          changes.forEach((animation) => {
            animation.pause();
            animation.currentTime = animation.effect.getTiming().duration / 2;
          });
          return { count: changes.length, size: [node.offsetWidth, node.offsetHeight], targets: changes.map((animation) => [animation.transitionProperty, animation.effect.getKeyframes().at(-1)[animation.transitionProperty]]) };
        });
        assert.equal(resized.count, 2);
        assert.ok(resized.size[0] > oldSize[0] && resized.size[1] > oldSize[1], "Container passes through intermediate dimensions");
        await page.evaluate(() => document.getAnimations().forEach((animation) => animation.finish()));
        await page.waitForFunction(() => !document.querySelector(".panel").style.width && !document.querySelector(".panel").style.height);
        await page.locator(".draw-button").click({ clickCount: 3, delay: 10 });
        await page.evaluate(() => document.getAnimations().forEach((animation) => animation.finish()));
        await page.waitForFunction(() => document.querySelector(".secondary").textContent === "DRAW 5");
        assert.equal(await page.locator(".primary").textContent(), entries[1], "Only the latest rapid draw renders");
        assert.deepEqual(errors, []);
      } finally {
        await page.close();
      }
    });

    await t.test("all rotating card renderers keep multiline content inside the settled container", async () => {
      const long = "A longer incoming message\nwith a second line";
      const cases = [
        [
          "ticker",
          ".ticker-message",
          ".ticker-message",
          {
            mode: "fade",
            duration: "2",
            entries: JSON.stringify([
              { text: "Short", prefix: "", icon: "" },
              { text: long, prefix: "", icon: "" }
            ])
          }
        ],
        ["quotes", ".panel", ".quote-text", { duration: "2", marks: "no", entries: JSON.stringify({ Short: "Author", [long]: "Author" }) }],
        [
          "sponsors",
          ".panel",
          ".primary",
          {
            duration: "2",
            entries: JSON.stringify([
              { name: "Short", text: "", imageUrl: "" },
              { name: long, text: "", imageUrl: "" }
            ])
          }
        ],
        [
          "lower-thirds",
          ".panel",
          ".primary",
          {
            duration: "2",
            gap: "0",
            entries: JSON.stringify([
              { name: "Short", subtitle: "", icon: "", imageUrl: "" },
              { name: long, subtitle: "", icon: "", imageUrl: "" }
            ])
          }
        ],
        ["reminder", ".panel", ".primary", { interval: "10", duration: "10", delay: "0", entries: JSON.stringify(["Short", long]) }]
      ];
      for (const [name, target, text, values] of cases) {
        const page = await browser.newPage();
        try {
          await page.clock.install({ time: new Date("2026-11-10T00:00:00Z") });
          await page.clock.pauseAt(new Date("2026-11-10T00:00:00Z"));
          await serve(page, assets, true);
          await page.goto(`https://stream.test/${name}/?${new URLSearchParams({ ...values, width: "0", transition: "fade", transitionDuration: "1000" })}`);
          await page.waitForSelector(text);
          const finish = async () => {
            for (let phase = 0; phase < 4; phase++)
              await page.evaluate(() =>
                document
                  .getAnimations()
                  .filter((animation) => animation.effect.getTiming().iterations !== Infinity)
                  .forEach((animation) => animation.finish())
              );
          };
          await finish();
          const outgoing = await page.locator(text).textContent();
          await page.clock.fastForward(name === "reminder" ? 10100 : 2100);
          assert.equal(await page.locator(text).textContent(), outgoing, name + " retains outgoing text during exit");
          await page.locator(target).evaluate((node) => node.getAnimations().forEach((animation) => animation.finish()));
          await page.waitForFunction(({ text, long }) => document.querySelector(text)?.textContent === long, { text, long });
          assert.equal(await page.locator(target).evaluate((node) => getComputedStyle(node).opacity), "0", name + " hides incoming content during resizing");
          await finish();
          const bounds = await page.evaluate((text) => {
            const panel = document.querySelector(".panel"),
              node = document.querySelector(text);
            const outer = panel.getBoundingClientRect(),
              inner = node.getBoundingClientRect();
            return { fits: inner.top >= outer.top - 1 && inner.bottom <= outer.bottom + 1, height: panel.style.height, overflow: panel.style.overflow };
          }, text);
          assert.equal(bounds.fits, true, name);
          assert.equal(bounds.height, "", name + " releases temporary height");
          assert.equal(bounds.overflow, "", name + " releases temporary clipping");
        } finally {
          await page.close();
        }
      }
    });

    await t.test("watermark fading continues across visible and hidden intervals", async () => {
      const page = await browser.newPage();
      try {
        await page.clock.install({ time: new Date("2026-11-08T00:00:00Z") });
        await serve(page, assets, true);
        await page.goto("https://stream.test/watermark/?text=Fading&fadeInterval=2&visibleDuration=1");
        await page.waitForFunction(() => window.byStreamResource && document.querySelector("#overlay .primary"));
        assert.equal(await page.locator("#overlay .panel").evaluate((panel) => panel.hidden), false);
        await page.clock.fastForward(1100);
        assert.equal(await page.locator("#overlay .panel").evaluate((panel) => panel.hidden), false, "The watermark leaves before it is hidden");
        await page.locator("#overlay .panel").evaluate((panel) =>
          panel
            .getAnimations()
            .filter((animation) => animation.effect.getTiming().iterations !== Infinity)
            .forEach((animation) => animation.finish())
        );
        await page.waitForFunction(() => document.querySelector("#overlay .panel").hidden);
        assert.equal(await page.locator("#overlay .panel").evaluate((panel) => panel.hidden), true);
        await page.clock.fastForward(1000);
        assert.equal(await page.locator("#overlay .panel").evaluate((panel) => panel.hidden), false);
      } finally {
        await page.close();
      }
    });

    await t.test("scrolling ticker rebuilds copies when only the viewport grows", async () => {
      const page = await browser.newPage({ viewport: { width: 400, height: 400 } });
      try {
        await serve(page, assets, true);
        const entries = JSON.stringify([{ text: "Ticker", prefix: "", icon: "" }]);
        await page.goto(`https://stream.test/ticker/?${new URLSearchParams({ mode: "scroll", entries, width: "3840" })}`);
        await page.waitForFunction(() => document.querySelectorAll(".ticker-group").length > 1);
        // Hold content width and motion constant so only the viewport changes.
        await page.addStyleTag({ content: ".ticker-group { width: 256px; } .ticker-track { animation: none; }" });
        await page.evaluate(() => document.fonts.ready);
        await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        const originalWidth = await page
          .locator(".ticker-group")
          .first()
          .evaluate((group) => group.offsetWidth);
        await page.setViewportSize({ width: 1600, height: 400 });
        await page.waitForFunction(() => document.querySelector(".ticker-viewport").clientWidth > 1200);
        await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        const layout = await page.evaluate(() => ({
          viewport: document.querySelector(".ticker-viewport").clientWidth,
          width: document.querySelector(".ticker-group").offsetWidth,
          groups: document.querySelectorAll(".ticker-group").length
        }));
        assert.equal(layout.width, originalWidth, "the content itself did not change");
        assert.ok((layout.groups - 1) * layout.width >= layout.viewport, "copies cover the viewport through a full scroll cycle");
      } finally {
        await page.close();
      }
    });

    // --- PAGE-LOAD AND FIXED SCHEDULE ANCHORS ---
    await t.test("timed resources restart on load unless fixed start is enabled", async () => {
      const cases = [
        { name: "timer", values: { duration: "60", format: "seconds", milliseconds: "no" }, selector: ".timer-digits", initial: "60", advanced: "55", fixed: "55" },
        { name: "timeline", values: { duration: "60" }, selector: ".primary", initial: "0%", advanced: "8%", fixed: "8%" },
        { name: "randomizer", values: { duration: "2", showNumber: "yes" }, selector: ".secondary", initial: "DRAW 1", advanced: "DRAW 3", fixed: "DRAW 3" },
        { name: "reminder", values: { entries: '["First","Second"]', interval: "10", duration: "2", transition: "none" }, selector: ".primary", initial: "First", advanced: "hidden", fixed: "hidden" }
      ];
      for (const entry of cases) {
        const page = await browser.newPage();
        try {
          await page.clock.install({ time: new Date("2026-11-09T18:00:00Z") });
          await page.clock.pauseAt(new Date("2026-11-09T18:00:01Z"));
          await serve(page, assets, true);
          const read = () =>
            page.evaluate((selector) => {
              const panel = document.querySelector(".panel");
              return panel.hidden ? "hidden" : panel.querySelector(selector).textContent;
            }, entry.selector);
          // Clock assertions are independent of the separately tested visual transition phases.
          const parameters = new URLSearchParams({ ...entry.values, animate: "no", startTime: "2020-01-01T00:00:00Z", endTime: "2020-01-01T01:00:00Z" });
          await page.goto(`https://stream.test/${entry.name}/?${parameters}`);
          await page.waitForFunction(() => window.byStreamResource && document.querySelector(".primary"));
          assert.equal(await read(), entry.initial, `${entry.name} starts fresh despite inactive timestamps`);
          const generated = new URL(await page.evaluate(() => byStream.settingsURL(byStreamResource, byStreamResource.settings).href));
          assert.ok(generated.search.length > 1);
          assert.equal(generated.searchParams.has("startTime"), false);
          assert.equal(generated.searchParams.has("endTime"), false);
          await page.clock.fastForward(5000);
          assert.equal(await read(), entry.advanced, `${entry.name} advances from the captured load time`);
          await page.reload();
          await page.waitForFunction(() => window.byStreamResource && document.querySelector(".primary"));
          assert.equal(await read(), entry.initial, `${entry.name} resets on reload`);

          const now = await page.evaluate(() => Date.now());
          parameters.set("useStartTime", "yes");
          parameters.set("startTime", new Date(now - 5000).toISOString());
          parameters.set("endTime", new Date(now + 55000).toISOString());
          await page.goto(`https://stream.test/${entry.name}/?${parameters}`);
          await page.waitForFunction(() => window.byStreamResource && document.querySelector(".panel"));
          assert.equal(await read(), entry.fixed, `${entry.name} honors an enabled fixed start`);
          const anchored = await page.evaluate(() => byStream.settingsURL(byStreamResource, byStreamResource.settings).href);
          assert.equal(new URL(anchored).searchParams.get("startTime"), parameters.get("startTime"));
          await page.reload();
          await page.waitForFunction(() => window.byStreamResource && document.querySelector(".panel"));
          assert.equal(await read(), entry.fixed, `${entry.name} retains the fixed schedule on reload`);
        } finally {
          await page.close();
        }
      }
    });

    // --- LOCAL FILE SUPPORT ---
    await t.test("downloaded file URLs render without editor files", async () => {
      const directory = await fs.mkdtemp(path.join(os.tmpdir(), "stream-resource-"));
      const page = await browser.newPage();
      try {
        // The downloaded fixture contains renderer files only; no editor files are available.
        await fs.mkdir(path.join(directory, "watermark"));
        await fs.copyFile(path.join(root, "resource.js"), path.join(directory, "resource.js"));
        for (const file of ["watermark.js", "watermark.css"]) await fs.copyFile(path.join(root, "watermark", file), path.join(directory, "watermark", file));
        const html = standaloneHTML(await fs.readFile(path.join(root, "watermark/index.html"), "utf8"));
        const file = path.join(directory, "watermark/index.html");
        await fs.writeFile(file, html);
        await serve(page, assets, true);
        await page.goto(`${pathToFileURL(file).href}?text=Downloaded`);
        await page.waitForFunction(() => document.querySelector("#overlay .primary")?.textContent === "Downloaded");
        assert.equal(await page.evaluate(() => typeof byConfigurator), "undefined");
        assert.match(await page.evaluate(() => byStream.settingsURL(byStreamResource, byStreamResource.settings).href), /\/index\.html\?text=Downloaded$/);
      } finally {
        await page.close();
        assert.equal(path.dirname(directory), os.tmpdir());
        await fs.rm(directory, { recursive: true, force: true });
      }
    });
  } finally {
    await browser.close();
  }
});
