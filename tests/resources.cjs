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
          fontSize: 24,
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

    // --- CONTINUING ANIMATION AND VIEWPORT CHANGES ---
    await t.test("watermark fading continues across visible and hidden intervals", async () => {
      const page = await browser.newPage();
      try {
        await page.clock.install({ time: new Date("2026-11-08T00:00:00Z") });
        await serve(page, assets, true);
        await page.goto("https://stream.test/watermark/?text=Fading&fadeInterval=2&visibleDuration=1");
        await page.waitForFunction(() => window.byStreamResource && document.querySelector("#overlay .primary"));
        assert.equal(await page.locator("#overlay .panel").evaluate((panel) => panel.hidden), false);
        await page.clock.fastForward(1100);
        assert.equal(await page.locator("#overlay .panel").evaluate((panel) => panel.hidden), true);
        await page.clock.fastForward(1000);
        assert.equal(await page.locator("#overlay .panel").evaluate((panel) => panel.hidden), false);
      } finally {
        await page.close();
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
