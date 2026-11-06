/*
 * File: tests/configurators.cjs
 * Desc: Configurator forms, previews, URL editing, copy, and reset; resource-only checks live in resources.cjs.
 */

// --- DEPENDENCIES ---
const assert = require("node:assert/strict");
const test = require("node:test");
const { chromium } = require("playwright");
const { runtimeAssets, launchOptions, loadAssets, resourceNames, serve } = require("./browser.cjs");

// --- CONFIGURATOR INTEGRATION ---
test("configurator forms and previews initialize for every resource", async (t) => {
  const assets = await loadAssets([
    ...runtimeAssets,
    "js/jquery.min.js",
    "js/select2.full.min.js",
    "js/popper.min.js",
    "js/bootstrap.min.js",
    "js/pickr.min.js",
    "_common.js",
    "css/bootstrap.min.css",
    "css/select2.min.css",
    "css/pickr.min.css",
    "css/animate.min.css",
    "_common.css"
  ]);
  const browser = await chromium.launch(launchOptions);
  try {
    // --- ALL RESOURCE EDITORS ---
    for (const name of await resourceNames()) {
      await t.test(name, async () => {
        const page = await browser.newPage();
        try {
          const errors = [];
          page.on("pageerror", (error) => errors.push(error.message));
          await serve(page, assets);
          await page.goto(`https://stream.test/${name}/#configure`);
          await page.waitForFunction(() => document.querySelector("form[data-configurator] [name]") && document.getElementById("overlay-url")?.value);
          assert.equal(await page.evaluate(() => byStreamOverlay), false);
          assert.equal(await page.locator("form[data-configurator]").count(), 1);
          await page.evaluate(() => byConfigurator.init());
          assert.equal(await page.locator("form[data-configurator]").count(), 1, "Repeated initialization preserves the editor");
          const url = new URL(await page.locator("#overlay-url").inputValue());
          assert.equal(url.hash, "");
          assert.equal(url.pathname, `/${name}/`);
          assert.ok(url.search.length > 1);
          // Absolutely positioned overlays can leave the HTML root at zero height.
          await page.frameLocator("#overlay-preview").locator("html[data-overlay]").waitFor({ state: "attached" });
          assert.deepEqual(errors, []);
        } finally {
          await page.close();
        }
      });
    }

    // --- EDIT, PREVIEW, COPY, AND RESET ---
    await t.test("edits update the URL and preview; copy and reset use the opening settings", async () => {
      const page = await browser.newPage();
      try {
        await serve(page, assets);
        await page.addInitScript(() =>
          Object.defineProperty(navigator, "clipboard", {
            configurable: true,
            value: {
              writeText: async (text) => {
                window.copiedURL = text;
              }
            }
          })
        );
        await page.goto("https://stream.test/watermark/?text=Opening#configure");
        await page.locator('#overlay-form [name="text"]').waitFor();
        const text = page.locator('#overlay-form [name="text"]');
        assert.equal(await text.inputValue(), "Opening");
        await text.fill("Edited watermark");
        await text.dispatchEvent("change");
        await page.waitForFunction(() => new URL(document.getElementById("overlay-url").value).searchParams.get("text") === "Edited watermark");
        await page.frameLocator("#overlay-preview").locator("#overlay .primary").filter({ hasText: "Edited watermark" }).waitFor();
        await page.locator("#copy-url").click();
        assert.equal(await page.evaluate(() => window.copiedURL), await page.locator("#overlay-url").inputValue());
        await page.locator('button[type="reset"][form="overlay-form"]').click();
        await page.waitForFunction(() => document.querySelector('#overlay-form [name="text"]').value === "Opening");
        assert.equal(new URL(await page.locator("#overlay-url").inputValue()).searchParams.get("text"), "Opening");
      } finally {
        await page.close();
      }
    });
  } finally {
    await browser.close();
  }
});
