/*
 * File: __tests__/resources.cjs
 * Desc: Offline public resource settings, initialization, and URL contracts.
 */
const assert = require("node:assert/strict");
const path = require("node:path");
const test = require("node:test");
const { runtimeAssets, launchBrowser, loadAssets, resourceNames, serve } = require("./browser.cjs");

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

  await t.test("GameCube shadows change rendered shell pixels independently of highlights", async () => {
    await open({ skin: "gcn", highlightIntensity: "10", shadowIntensity: "0" });
    const shadow = page.locator(".controller-background .shell-shadow");
    assert.equal(await shadow.evaluate((element) => getComputedStyle(element).opacity), "0");
    const unshaded = await page.locator(".controller-background").screenshot({ omitBackground: true });
    await open({ skin: "gcn", highlightIntensity: "10", shadowIntensity: "100" });
    assert.equal(await shadow.evaluate((element) => getComputedStyle(element).opacity), "1");
    assert.equal(await page.locator(".controller-background .shell-highlight").evaluate((element) => getComputedStyle(element).opacity), "0.1");
    const shaded = await page.locator(".controller-background").screenshot({ omitBackground: true });
    assert.notDeepEqual(shaded, unshaded, "Shadow intensity affects the rendered shell");
  });

  await t.test("all control surfaces receive a light tint while markings and input remain independent", async () => {
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

  /** Sample the real rendered logo against transparency, excluding the controller underneath. */
  async function logoPixels(parameters) {
    await open({ ...guide, ...parameters });
    await page.locator(".guide-logo-custom").waitFor();
    await page.addStyleTag({ content: ".controller-background, .guide-custom-housing { visibility: hidden !important; }" });
    const png = await page.locator(".guide-logo-custom").screenshot({ omitBackground: true });
    return page.evaluate(async (base64) => {
      const image = new Image();
      image.src = `data:image/png;base64,${base64}`;
      await image.decode();
      const canvas = document.createElement("canvas");
      canvas.width = image.width;
      canvas.height = image.height;
      const context = canvas.getContext("2d");
      context.drawImage(image, 0, 0);
      return [0.25, 0.75].map((x) => [...context.getImageData(Math.floor(image.width * x), Math.floor(image.height / 2), 1, 1).data]);
    }, png.toString("base64"));
  }

  await t.test("guide blend modes preserve translucent and opaque image pixels", async () => {
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
    for (let i = 0; i < fill.length; i++) {
      for (const [channel, expected] of [102, 153, 204].entries()) assert.ok(Math.abs(fill[i][channel] - expected) <= 2, "Fill replaces RGB while retaining source alpha");
      assert.ok(Math.abs(fill[i][3] - original[i][3]) <= 2);
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
