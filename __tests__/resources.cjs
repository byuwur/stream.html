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

  await t.test("invalid and unknown URL values cannot replace defaults", async () => {
    await page.goto("http://stream.test/core/?size=-1&layout=unknown&extra=untrusted");
    const result = await page.evaluate(async () => {
      const settings = await initialized;
      return { text: settings.text, size: settings.size, layout: settings.layout, extra: Object.hasOwn(settings, "extra") };
    });
    assert.deepEqual(result, { text: "default", size: 16, layout: "plain", extra: false });
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
