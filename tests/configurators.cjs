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
    "_common.min.js",
    "css/bootstrap.min.css",
    "css/select2.min.css",
    "css/pickr.min.css",
    "css/animate.min.css",
    "_common.min.css"
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

    await t.test("fixed start toggles reveal timestamps and remove inactive anchors from URLs", async () => {
      for (const name of ["timer", "timeline", "reminder", "randomizer"]) {
        const page = await browser.newPage();
        try {
          await serve(page, assets);
          await page.goto(`https://stream.test/${name}/#configure`);
          await page.waitForFunction(() => document.querySelector('#overlay-form [name="useStartTime"]') && document.getElementById("overlay-url")?.value);
          const toggle = page.locator('#overlay-form [name="useStartTime"]');
          const start = page.locator('#overlay-form [name="startTime"]');
          assert.equal(await toggle.isChecked(), false, name);
          assert.equal(await start.isDisabled(), true, name);
          await page.waitForFunction(() => document.querySelector('[name="startTime"]').closest(".conditional-field").hidden);
          assert.equal(new URL(await page.locator("#overlay-url").inputValue()).searchParams.has("startTime"), false);

          // Set the native control directly because its resource subsection can be collapsed.
          await toggle.evaluate((input) => {
            input.checked = true;
            input.dispatchEvent(new Event("change", { bubbles: true }));
          });
          await page.waitForFunction(() => new URL(document.getElementById("overlay-url").value).searchParams.get("useStartTime") === "yes");
          assert.equal(await start.isDisabled(), false, name);
          assert.equal(await start.evaluate((input) => input.closest(".conditional-field").hidden), false);
          const fixed = new URL(await page.locator("#overlay-url").inputValue());
          assert.equal(fixed.searchParams.get("startTime"), await start.inputValue());
          assert.equal(JSON.parse(await page.locator("#settings-json").inputValue()).startTime, await start.inputValue(), name + " JSON retains the enabled time anchor");
          if (name === "timeline") {
            assert.ok(fixed.searchParams.has("endTime"));
            assert.equal(await page.locator('[name="duration"]').isDisabled(), true);
          }

          await toggle.evaluate((input) => {
            input.checked = false;
            input.dispatchEvent(new Event("change", { bubbles: true }));
          });
          await page.waitForFunction(() => !new URL(document.getElementById("overlay-url").value).searchParams.has("startTime"));
          await page.waitForFunction(() => document.querySelector('[name="startTime"]').closest(".conditional-field").hidden);
          assert.equal(await start.isDisabled(), true, name);
          assert.equal(new URL(await page.locator("#overlay-url").inputValue()).searchParams.has("endTime"), false);
        } finally {
          await page.close();
        }
      }
    });

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
        await page.waitForFunction(() => document.querySelector('#overlay-form [name="text"]').value === "Opening" && new URL(document.getElementById("overlay-url").value).searchParams.get("text") === "Opening");
        assert.equal(new URL(await page.locator("#overlay-url").inputValue()).searchParams.get("text"), "Opening");
      } finally {
        await page.close();
      }
    });
  } finally {
    await browser.close();
  }
});
