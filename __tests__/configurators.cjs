/*
 * File: __tests__/configurators.cjs
 * Desc: Configurator forms, previews, URL editing, copy, and reset; resource-only checks live in resources.cjs.
 */

// --- DEPENDENCIES ---
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const test = require("node:test");
const { chromium } = require("playwright");
const { root, runtimeAssets, launchOptions, loadAssets, resourceNames, serve } = require("./browser.cjs");

const editorAssets = [
  ...runtimeAssets,
  "_transitions.css",
  "_transitions.min.css",
  "_transitions.min.js",
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
  "_common.min.css",
  "_fonts.css"
];

// Shared helpers are available in both modes; animation engines belong to renderer frames.
test("shared, renderer-only, and configurator-only imports stay in their modes", async () => {
  const assets = await loadAssets(editorAssets);
  const browser = await chromium.launch(launchOptions);
  try {
    for (const name of ["watermark", "main", "popup", "controller"]) {
      const page = await browser.newPage();
      try {
        const requests = [];
        page.on("request", (request) => requests.push(request.url()));
        const editorSource = "https://assets.test/editor-spa.js";
        const fixtures = new Map([...assets, ...[...assets].map(([url, body]) => [url.replace("https://cdn.jsdelivr.net/gh/byuwur/spa.js", editorSource), body])]);
        await serve(page, fixtures);
        if (name === "controller") {
          const html = (await fs.readFile(path.join(root, "controller/index.html"), "utf8")).replaceAll('data-load data-source="https://cdn.jsdelivr.net/gh/byuwur/spa.js"', `data-load data-source="${editorSource}"`);
          await page.route("https://stream.test/controller/", (route) => route.fulfill({ contentType: "text/html", body: html }));
        }
        await page.goto(`https://stream.test/${name}/?test=1`);
        await page.waitForFunction(() => window.byStreamResource && window.byStreamOverlay);
        assert.deepEqual(
          await page.evaluate(() => ({
            fonts: Boolean(window.byFont),
            urls: typeof compress_url_data === "function",
            animation: Boolean(window.gsap),
            morph: Boolean(window.MorphSVGPlugin),
            editor: Boolean(window.byConfigurator),
            jquery: Boolean(window.jQuery)
          })),
          { fonts: name !== "controller", urls: true, animation: ["main", "popup"].includes(name), morph: name === "popup", editor: false, jquery: false },
          name
        );
        assert.ok(!requests.some((url) => /\/(?:configurator\.(?:js|css)|mapping\.js)(?:[?#]|$)/.test(url)), "Overlay mode never requests editor files");
        await page.goto(`https://stream.test/${name}/#configure`);
        await page.locator("form[data-configurator] [name]").first().waitFor({ state: "attached" });
        assert.deepEqual(
          await page.evaluate(() => ({
            fonts: Boolean(window.byFont),
            urls: typeof compress_url_data === "function",
            animation: Boolean(window.gsap),
            morph: Boolean(window.MorphSVGPlugin),
            editor: Boolean(window.byConfigurator),
            jquery: Boolean(window.jQuery)
          })),
          { fonts: name !== "controller", urls: true, animation: false, morph: false, editor: true, jquery: true },
          name
        );
        if (name === "controller") {
          assert.ok(
            requests.some((url) => url.startsWith(`${editorSource}@`) && url.endsWith("/css/bootstrap.min.css")),
            "Styles use their declared source"
          );
          assert.ok(
            requests.some((url) => url.startsWith(`${editorSource}@`) && url.endsWith("/js/jquery.min.js")),
            "Scripts use their declared source"
          );
          assert.ok(requests.includes("https://stream.test/configurator.css"), "Local stylesheet stays document-relative");
          assert.ok(requests.includes("https://stream.test/controller/mapping.js"), "Local mapping editor loads after the shared configurator");
          assert.ok(!requests.includes("https://stream.test/controller/configurator.js"));
          assert.equal(await page.evaluate(() => typeof byConfigurator.configureResource), "function");
        }
        const preview = page.frameLocator("#overlay-preview");
        await preview.locator("html[data-overlay]").waitFor({ state: "attached" });
        assert.equal(await preview.locator("html").evaluate(() => Boolean(window.gsap)), ["main", "popup"].includes(name));
      } finally {
        await page.close();
      }
    }
  } finally {
    await browser.close();
  }
});

test("Select2 arrows commit grouped controller skins without closing or selecting on hover", async () => {
  const assets = await loadAssets(editorAssets);
  const browser = await chromium.launch(launchOptions);
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  try {
    await serve(page, assets);
    await page.goto("https://stream.test/controller/?skin=ds5&player=9#configure");
    await page.waitForFunction(() => document.getElementById("overlay-url")?.value);
    await page.locator("#skin-input + .select2 .select2-selection").click();
    for (const [key, skin, label] of [
      ["ArrowDown", "xbox", "Duke"],
      ["ArrowDown", "x360", "360"],
      ["ArrowUp", "xbox", "Duke"]
    ]) {
      await page.keyboard.press(key);
      await page.waitForFunction((skin) => document.getElementById("skin-input").value === skin && new URL(document.getElementById("overlay-url").value).searchParams.get("skin") === skin, skin);
      await page.frameLocator("#overlay-preview").locator(`svg[data-controller="${skin}"].controller-background`).waitFor();
      assert.equal(await page.locator("#select2-skin-input-container").textContent(), label);
      assert.equal(await page.evaluate(() => jQuery("#skin-input").data("select2").isOpen()), true);
    }
    await page
      .locator(".select2-results__option")
      .filter({ hasText: /^DualShock 4$/ })
      .hover();
    assert.equal(await page.locator("#skin-input").inputValue(), "xbox", "Hover only highlights a choice");
    assert.equal(new URL(await page.locator("#overlay-url").inputValue()).searchParams.get("skin"), "xbox");
    assert.deepEqual(errors, []);
  } finally {
    await page.close();
    await browser.close();
  }
});

test("bounded numbers pair sliders with exact inputs and small selects use synchronized choice buttons", async () => {
  const assets = await loadAssets(editorAssets);
  const browser = await chromium.launch(launchOptions);
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  try {
    await serve(page, assets);
    await page.goto("https://stream.test/keyboard/?mode=both&layout=wasd#configure");
    await page.waitForFunction(() => document.getElementById("overlay-url")?.value);
    await page.locator('[data-expand-sections="true"]').click();
    assert.equal(
      await page.evaluate(() =>
        Object.entries(byStreamResource.fields)
          .filter(([, rule]) => rule.type === "number" && Number.isFinite(rule.min) && Number.isFinite(rule.max))
          .every(([name]) => document.querySelectorAll(`[data-number-field="${name}"]`).length === 1)
      ),
      true
    );
    const opacity = page.locator('[name="opacity"]');
    const slider = page.locator('[data-number-field="opacity"]');
    assert.equal(await page.locator("[data-number-field]").evaluateAll((sliders) => sliders.every((slider) => slider.step === "1")), true);
    await slider.evaluate((node) => {
      node.value = "35";
      node.dispatchEvent(new Event("input", { bubbles: true }));
    });
    assert.equal(await opacity.inputValue(), "35");
    await page.waitForFunction(() => byStreamResource.settings.opacity === 35);
    await slider.focus();
    await slider.press("ArrowRight");
    await page.waitForFunction(() => byStreamResource.settings.opacity === 36);
    assert.equal(await opacity.inputValue(), "36");
    await opacity.fill("64.5");
    assert.equal(await slider.inputValue(), "65");
    await page.waitForFunction(() => byStreamResource.settings.opacity === 64.5);
    const acceptedURL = await page.locator("#overlay-url").inputValue();
    await opacity.fill("101");
    await page.waitForTimeout(320);
    assert.equal(await page.evaluate(() => document.getElementById("overlay-preview").contentWindow.location.href), acceptedURL, "Out-of-range numeric drafts preserve the accepted preview");
    assert.equal(await page.locator("#copy-url").isDisabled(), true);
    assert.equal(await slider.inputValue(), "65");
    await opacity.fill("0");
    await page.waitForFunction(() => byStreamResource.settings.opacity === 0);
    assert.equal(await slider.inputValue(), "0");
    const platforms = page.getByRole("group", { name: "Platform labels", exact: true });
    assert.equal(await platforms.getByRole("button").count(), 2);
    await platforms.getByRole("button", { name: "macOS", exact: true }).click();
    await page.waitForFunction(() => byStreamResource.settings.platform === "mac");
    assert.equal(await platforms.getByRole("button", { name: "macOS", exact: true }).getAttribute("aria-pressed"), "true");
    await platforms.getByRole("button", { name: "macOS", exact: true }).press("ArrowLeft");
    await page.waitForFunction(() => byStreamResource.settings.platform === "windows");
    assert.equal(await page.locator('[name="mode"]').getAttribute("data-choice-buttons"), null, "Four choices retain the dropdown");
    const promptButtons = page.locator('[name="historyStyle"]').locator("..").locator(".choice-buttons button");
    assert.equal(await promptButtons.first().isDisabled(), true);
    await page.locator('[data-settings-view="json"]').click();
    await page.locator("#settings-json").fill(JSON.stringify({ mode: "hidden", platform: "mac", showHistory: "yes", opacity: 25, historyOrientation: "horizontal" }));
    await page.locator("#settings-json").blur();
    await page.waitForFunction(() => byStreamResource.settings.mode === "hidden");
    await page.locator('[data-settings-view="form"]').click();
    assert.equal(await slider.inputValue(), "25");
    assert.equal(await platforms.getByRole("button", { name: "macOS", exact: true }).getAttribute("aria-pressed"), "true");
    await page.locator('button[type="reset"][form="overlay-form"]').click();
    await page.waitForFunction(() => byStreamResource.settings.opacity === 100 && byStreamResource.settings.mode === "both");
    assert.equal(await slider.inputValue(), "100");
    assert.equal(await platforms.getByRole("button", { name: "Windows", exact: true }).getAttribute("aria-pressed"), "true");
    assert.equal(await promptButtons.first().isDisabled(), true);
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
  }
});

test("field restore uses resource defaults while Reset retains opening values and history starts at zero", async () => {
  const assets = await loadAssets(editorAssets);
  const browser = await chromium.launch(launchOptions);
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  try {
    await serve(page, assets);
    for (const name of ["keyboard", "controller"]) {
      await page.goto(`https://stream.test/${name}/#configure`);
      await page.waitForFunction(() => document.getElementById("overlay-url")?.value);
      for (const dimension of ["historyWidth", "historyHeight"]) assert.equal(await page.locator(`[name="${dimension}"]`).inputValue(), "0", `${name} ${dimension} default`);
      await page.goto(`https://stream.test/${name}/?showHistory=yes&historyWidth=1280&historyHeight=220&opacity=42#configure`);
      await page.waitForFunction(() => document.getElementById("overlay-url")?.value);
      await page.locator('[data-expand-sections="true"]').click();
      for (const dimension of ["historyWidth", "historyHeight"]) {
        await page.locator(`[data-restore-field="${dimension}"]`).click();
        await page.waitForFunction((dimension) => byStreamResource.settings[dimension] === 0, dimension);
        assert.equal(await page.locator(`[name="${dimension}"]`).inputValue(), "0");
        assert.equal(await page.locator(`[data-number-field="${dimension}"]`).inputValue(), "0");
        assert.equal(new URL(await page.locator("#overlay-url").inputValue()).searchParams.has(dimension), false);
      }
      assert.equal(await page.locator('[name="opacity"]').inputValue(), "42", "Other fields retain their values");
      await page.locator('button[type="reset"][form="overlay-form"]').click();
      await page.waitForFunction(() => byStreamResource.settings.historyWidth === 1280 && byStreamResource.settings.historyHeight === 220);
      if (name === "controller")
        for (const field of ["guideScale", "outlineWidth"]) {
          assert.equal(await page.locator(`[name="${field}"]`).getAttribute("type"), "number");
          assert.equal(await page.locator(`[data-number-field="${field}"]`).count(), 1, "Shared controls create one slider and one exact input");
        }
    }
    await page.goto("https://stream.test/watermark/?text=Custom&fontFamily=Arial&textColor=112233&kind=logo&logoUrl=https%3A%2F%2Fmedia.test%2Fcustom.png#configure");
    await page.waitForFunction(() => document.getElementById("overlay-url")?.value);
    await page.locator('[data-expand-sections="true"]').click();
    for (const field of ["text", "fontFamily", "logoUrl", "textColor"]) {
      await page.locator(`[data-restore-field="${field}"]`).click();
      await page.waitForFunction((field) => byStreamResource.settings[field] === byStreamResource.fields[field].default, field);
      assert.equal(await page.locator(`[name="${field}"]`).inputValue(), await page.evaluate((field) => String(byStreamResource.fields[field].default), field));
    }
    assert.equal(await page.locator('[name="fontFamily"]').locator("..").locator(".select2-container").count(), 1);
    assert.equal(await page.locator('[name="logoUrl"]').locator("..").locator(".image-provider").count(), 1);
    assert.equal(
      await page
        .locator(".config-field")
        .first()
        .evaluate((node) => getComputedStyle(node).borderBottomWidth),
      "1px"
    );
    await page.goto("https://stream.test/clock/?timeZone=UTC&locale=es-CO#configure");
    await page.waitForFunction(() => document.getElementById("overlay-url")?.value);
    await page.locator('[data-expand-sections="true"]').click();
    for (const field of ["timeZone", "locale"]) {
      await page.locator(`[data-restore-field="${field}"]`).click();
      await page.waitForFunction((field) => byStreamResource.settings[field] === byStreamResource.fields[field].default, field);
      assert.equal(await page.locator(`[name="${field}"]`).locator("..").locator(".select2-container").count(), 1);
    }
    await page.goto("https://stream.test/timer/?mode=deadline&endTime=2030-01-01T00%3A00%3A00Z#configure");
    await page.waitForFunction(() => document.getElementById("overlay-url")?.value);
    await page.locator('[data-expand-sections="true"]').click();
    await page.locator('[data-restore-field="endTime"]').click();
    await page.waitForFunction(() => byStreamResource.settings.endTime === byStreamResource.fields.endTime.default);
    assert.equal(
      await page.locator('[name="endTime"]').locator("..").locator(".timestamp-picker").inputValue(),
      await page.evaluate(() => {
        const date = new Date(byStreamResource.fields.endTime.default);
        return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 19);
      })
    );
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
  }
});

test("keyboard editor keeps native URL/JSON/reset behavior, inactive drafts, and focused-preview input", async () => {
  const assets = await loadAssets(editorAssets);
  const browser = await chromium.launch(launchOptions);
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  try {
    await serve(page, assets);
    await page.goto("https://stream.test/keyboard/?mode=both&layout=wasd#configure");
    await page.waitForFunction(() => document.getElementById("overlay-url")?.value);
    const preview = page.frameLocator("#overlay-preview");
    await preview.locator('#keyboard-overlay[data-ready="yes"]').waitFor();
    assert.equal(await page.locator('[name="historyStyle"]').isDisabled(), true);
    assert.equal(await page.locator('[name="shellImage"]').isDisabled(), true);
    assert.equal(await page.locator('[name="shellImage"]').locator("..").locator(".image-provider").count(), 1);
    assert.equal(await page.locator('[name="showKeyboard"], [name="showMouse"]').count(), 0);
    assert.equal(await page.locator('[name="mode"] option[value="hidden"]').textContent(), "Hidden");
    /** Apply a native form value even inside a collapsed subsection. */
    async function change(name, value) {
      await page.locator(`[name="${name}"]`).evaluate((node, value) => {
        if (node.type === "checkbox") node.checked = value === "yes";
        else node.value = value;
        node.dispatchEvent(new Event("change", { bubbles: true }));
      }, value);
      await page.waitForTimeout(320);
    }
    await page.locator('[data-expand-sections="true"]').click();
    const keys = page.locator(".entry-editor").filter({ has: page.locator('[name="displayedKeys"]') });
    await keys.locator(".add-entry").click();
    assert.equal(await keys.locator(".entry-row input").count(), 0, "Physical keys use a select rather than a text input");
    const choice = keys.locator('select[aria-label="Physical key"]').first();
    assert.ok(await choice.locator('option[value="ShiftRight"]').count());
    await choice.selectOption("KeyA");
    await page.waitForFunction(() => document.querySelector('[name="displayedKeys"]').value === '["KeyA"]');
    const positions = await keys
      .locator(".entry-row")
      .first()
      .evaluate((row) => ({ select: row.querySelector(".select2-container").getBoundingClientRect().right, controls: row.querySelector(".btn-group").getBoundingClientRect().left }));
    assert.ok(positions.controls >= positions.select, "Row options sit to the right of the key selector");
    await keys.locator(".add-entry").click();
    await keys.locator('select[aria-label="Physical key"]').nth(1).selectOption("KeyD");
    await keys.locator('.entry-row [data-action="up"]').nth(1).click();
    await page.waitForFunction(() => document.querySelector('[name="displayedKeys"]').value === '["KeyD","KeyA"]');
    await keys.locator('select[aria-label="Physical key"]').nth(1).selectOption("KeyD");
    await page.waitForTimeout(320);
    assert.equal(await page.locator("#copy-url").isDisabled(), true, "Duplicate physical keys are rejected");
    await keys.locator('.entry-row [data-action="up"]').nth(1).click();
    await keys.locator('select[aria-label="Physical key"]').nth(1).selectOption("KeyA");
    await page.waitForFunction(() => !document.querySelector("#copy-url").disabled);
    assert.equal(await keys.locator("select").evaluateAll((selects) => selects.every((select) => select.validity.valid)), true, "Reordering and correcting duplicates clears stale row validity");
    await page.locator('button[type="reset"][form="overlay-form"]').click();
    await page.waitForFunction(() => document.querySelector('[name="displayedKeys"]').value === "[]");
    await change("showHistory", "yes");
    await change("historyStyle", "text");
    await preview.locator(".input-history").waitFor();
    await page.locator('[name="keySize"]').focus();
    await page.keyboard.press("KeyE");
    assert.equal(await preview.locator(".history-entry").count(), 0, "Editor input does not enter preview history");
    await change("keySize", "44");
    await preview.locator("body").click({ position: { x: 5, y: 5 } });
    await page.keyboard.press("KeyE");
    assert.match(await preview.locator(".history-entry").first().innerText(), /E/);
    await change("historySource", "mouse");
    await change("mode", "mouse");
    assert.equal(await page.locator('[name="layout"]').isDisabled(), true);
    assert.equal(await page.locator('[name="layout"]').inputValue(), "wasd");
    assert.equal(new URL(await page.locator("#overlay-url").inputValue()).searchParams.has("layout"), false);
    await change("mode", "both");
    assert.equal(await page.locator('[name="layout"]').inputValue(), "wasd");
    await change("historySource", "keyboard");
    await change("mode", "hidden");
    await preview.locator(".input-history").waitFor();
    assert.equal(await preview.locator("#keyboard").isVisible(), false);
    assert.equal(await preview.locator("#mouse").isVisible(), false);
    await page.locator('[data-settings-view="json"]').click();
    const json = JSON.parse(await page.locator("#settings-json").inputValue());
    assert.equal(json.showHistory, "yes");
    assert.equal(json.layout, "wasd");
    await page.locator("#settings-json").fill(JSON.stringify({ mode: "keyboard", layout: "arrows", showHistory: "yes", historyStyle: "text", historyOrientation: "horizontal" }));
    await page.locator("#settings-json").blur();
    await page.waitForFunction(() => new URL(document.getElementById("overlay-url").value).searchParams.get("layout") === "arrows");
    await preview.locator('[data-code="ArrowUp"]').waitFor();
    assert.equal(await preview.locator(".input-history").getAttribute("data-orientation"), "horizontal");
    await page.locator('button[type="reset"][form="overlay-form"]').click();
    await page.waitForFunction(() => new URL(document.getElementById("overlay-url").value).searchParams.get("layout") === "wasd");
    assert.equal(new URL(await page.locator("#overlay-url").inputValue()).searchParams.has("showHistory"), false);
    await preview.locator('#keyboard-overlay[data-ready="yes"]').waitFor();
    assert.equal(await preview.locator(".input-history").count(), 0);
    const overlayURL = await page.locator("#overlay-url").inputValue();
    await page.goto(overlayURL);
    await page.locator('#keyboard-overlay[data-ready="yes"]').waitFor();
    await page.keyboard.press("F2");
    await page.waitForFunction(() => document.getElementById("overlay-url")?.value);
    assert.equal(new URL(page.url()).hash, "#configure");
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
  }
});

// --- CONFIGURATOR INTEGRATION ---
test("configurator forms and previews initialize for every resource", async (t) => {
  const assets = await loadAssets(editorAssets);
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
          assert.equal(await page.evaluate(() => document.characterSet), "UTF-8");
          assert.equal(await page.evaluate(() => byStreamOverlay), false);
          assert.equal(await page.locator("form[data-configurator]").count(), 1);
          await page.evaluate(() => byConfigurator.init());
          assert.equal(await page.locator("form[data-configurator]").count(), 1, "Repeated initialization preserves the editor");
          assert.equal(await page.locator('[name="animate"]').isChecked(), true, name + " enables resource animation by default");
          if (["schedule", "info"].includes(name)) assert.equal(await page.locator('[name="widthMode"]').isChecked(), true, name + " fills width by default");
          const imageFields = { controller: ["guideImage", "shellImage"], keyboard: ["shellImage", "keyImage"], main: ["backgroundUrl", "logoUrl"], qr: ["logoUrl"], watermark: ["logoUrl"] }[name] || [];
          for (const field of imageFields) assert.equal(await page.locator(`[name="${field}"]`).locator("..").locator(".image-provider").count(), 1, `${name} enhances ${field}`);
          assert.equal(await page.locator(".image-input").count(), imageFields.length + (["lower-thirds", "sponsors"].includes(name) ? 2 : 0));
          const url = new URL(await page.locator("#overlay-url").inputValue());
          assert.equal(url.hash, "");
          assert.equal(url.pathname, `/${name}/`);
          assert.ok(url.search.length > 1);
          // Absolutely positioned overlays can leave the HTML root at zero height.
          await page.frameLocator("#overlay-preview").locator("html[data-overlay]").waitFor({ state: "attached" });
          const required = await page.evaluate(() => byStreamResource.urlRequired.filter((key) => byStream.fieldEnabled(byStreamResource.fields, byStreamResource.settings, key)));
          await page.locator('[data-settings-view="json"]').click();
          const compact = JSON.parse(await page.locator("#settings-json").inputValue());
          for (const key of required) {
            assert.ok(Object.hasOwn(compact, key), name + " compact JSON retains " + key);
            assert.ok(url.searchParams.has(key), name + " URL retains " + key);
          }
          await page.locator("#json-all-fields").check();
          const complete = JSON.parse(await page.locator("#settings-json").inputValue());
          const fieldNames = await page.evaluate(() => Object.keys(byStreamResource.fields));
          assert.deepEqual(Object.keys(complete), fieldNames, name + " complete JSON includes every field");
          if (fieldNames.includes("width")) assert.equal(fieldNames[fieldNames.indexOf("width") + 1], "widthMode", name + " places Fill width immediately after Width");
          for (const key of required) assert.deepEqual(complete[key], compact[key]);
          await page.locator("#json-all-fields").uncheck();
          assert.deepEqual(JSON.parse(await page.locator("#settings-json").inputValue()), compact);

          assert.deepEqual(errors, []);
        } finally {
          await page.close();
        }
      });
    }

    await t.test("F2 enters the hosted editor and returns to the edited overlay", async () => {
      const page = await browser.newPage();
      try {
        const errors = [];
        page.on("pageerror", (error) => errors.push(error.message));
        await serve(page, assets);
        await page.goto("https://stream.test/watermark/?text=Opening");
        await page.locator("#overlay .primary").filter({ hasText: "Opening" }).waitFor();
        assert.equal(await page.evaluate(() => typeof jQuery), "undefined");
        await page.keyboard.press("Shift+F2");
        assert.equal(new URL(page.url()).hash, "");
        await page.keyboard.press("F2");
        await page.locator('#overlay-form [name="text"]').waitFor();
        assert.equal(new URL(page.url()).hash, "#configure");
        const frame = page.frameLocator("#overlay-preview");
        await frame.locator("#overlay .primary").filter({ hasText: "Opening" }).waitFor();
        await frame.locator("body").evaluate((body) => {
          body.tabIndex = -1;
        });
        await frame.locator("body").press("F2");
        assert.equal(await frame.locator("form[data-configurator]").count(), 0);
        assert.equal(await frame.locator("#configurator-warning").count(), 0);
        const text = page.locator('#overlay-form [name="text"]');
        await text.fill("Edited");
        await text.dispatchEvent("change");
        await page.waitForFunction(() => new URL(document.getElementById("overlay-url").value).searchParams.get("text") === "Edited");
        await text.press("F2");
        await page.locator("#overlay .primary").filter({ hasText: "Edited" }).waitFor();
        assert.equal(new URL(page.url()).hash, "");
        assert.equal(await page.evaluate(() => typeof jQuery), "undefined");
        // Bare entry points still load the editor and restore its saved preferences.
        await page.goto("https://stream.test/watermark/");
        await page.waitForFunction(() => document.querySelector('#overlay-form [name="text"]')?.value === "Edited");
        assert.deepEqual(errors, []);
      } finally {
        await page.close();
      }
    });

    await t.test("controller folder IDs follow the requested order and SNES exposes its physical button names", async () => {
      const page = await browser.newPage();
      try {
        await serve(page, assets);
        await page.goto("https://stream.test/controller/?skin=snes&player=9#configure");
        await page.waitForFunction(() => document.getElementById("overlay-url")?.value);
        assert.equal(await page.locator("#skin-input").inputValue(), "snes");
        const choices = await page.locator("#skin-input option").evaluateAll((options) => options.map((option) => [option.value, option.textContent]));
        assert.equal(choices.length, 34);
        assert.ok(choices.every(([id]) => id !== "move"));
        for (const [id, name] of choices) assert.ok(!name.endsWith(`(${id})`), name);
        assert.deepEqual(await page.locator("#skin-input optgroup").evaluateAll((groups) => groups.map((group) => group.label)), ["Nintendo", "PlayStation", "Xbox", "Sega", "Steam", "Other"]);
        for (const id of ["ds3", "ds4", "ds5", "fgc", "fgc6", "fgc4", "gcn", "n64", "nes", "snes", "x360", "xone", "xseries"]) assert.ok(choices.some(([value]) => value === id));
        await page.frameLocator("#overlay-preview").locator('svg[data-controller="snes"].controller-background').waitFor();
        assert.equal(await page.locator("#preview-viewport").getAttribute("viewBox"), "0 0 1280 720");
        assert.deepEqual(
          await page
            .frameLocator("#overlay-preview")
            .locator("html")
            .evaluate(() => [innerWidth, innerHeight]),
          [1280, 720]
        );
        assert.equal(new URL(await page.locator("#overlay-url").inputValue()).searchParams.get("skin"), "snes");
        await page.keyboard.press("F1");
        await page.locator('[data-section="remap"]').click();
        await page.locator("#prepend-mapping").click();
        const outputs = await page
          .locator(".mapping-target")
          .first()
          .locator("option")
          .evaluateAll((options) => Object.fromEntries(options.map((option) => [option.value, option.textContent])));
        assert.deepEqual([outputs[0], outputs[1], outputs[2], outputs[3]], ["B", "A", "Y", "X"]);
        assert.deepEqual([outputs[4], outputs[5]], ["L", "R"]);
        await page.locator("#skin-input").selectOption("steamdeck");
        await page.waitForFunction(() => [...document.querySelectorAll(".mapping-target option")].some((option) => option.value === "6" && option.textContent === "L2"));
        assert.equal(await page.locator('.mapping-target option[value="25"]').count(), 0, "The standard overlay omits rear grip controls");
      } finally {
        await page.close();
      }
    });

    await t.test("controller custom appearance retains hidden values, eligibility, variants, and Reset", async () => {
      const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
      try {
        await serve(page, assets);
        await page.route("https://media.test/logo.svg", (route) => route.fulfill({ contentType: "image/svg+xml", body: '<svg xmlns="http://www.w3.org/2000/svg" width="8" height="4"><rect width="8" height="4" fill="#33bb77"/></svg>' }));
        const change = async (name, value) => {
          await page.locator(`[name="${name}"]`).evaluate((node, value) => {
            if (node.type === "checkbox") node.checked = value === "yes";
            else node.value = value;
            node.dispatchEvent(new Event("change", { bubbles: true }));
          }, value);
          await page.waitForFunction(({ name, value }) => String(byStreamResource.settings[name]).replace(/^#/, "") === value.replace(/^#/, ""), { name, value });
        };
        await page.goto("https://stream.test/controller/?skin=ds2&player=9#configure");
        await page.waitForFunction(() => document.getElementById("overlay-url")?.value);
        assert.equal(await page.locator('[name="customColors"]').isChecked(), false);
        assert.equal(await page.locator('[name="controllerColor"]').isDisabled(), true);
        assert.equal(new URL(await page.locator("#overlay-url").inputValue()).searchParams.has("customColors"), false);
        await page.locator('[data-settings-view="json"]').click();
        assert.equal(Object.hasOwn(JSON.parse(await page.locator("#settings-json").inputValue()), "customColors"), false, "Compact JSON omits the default Off switch");
        await page.locator("#json-all-fields").check();
        assert.equal(JSON.parse(await page.locator("#settings-json").inputValue()).customColors, "no", "Show all fields still exposes the default");
        await page.locator("#json-all-fields").uncheck();
        await page.locator('[data-settings-view="form"]').click();
        await change("variant", "silver");
        await page.frameLocator("#overlay-preview").locator('.controller-background[data-variant="silver"]').waitFor();
        await change("customColors", "yes");
        assert.equal(await page.locator('[name="controllerColor"]').isEnabled(), true);
        assert.equal(new URL(await page.locator("#overlay-url").inputValue()).searchParams.get("customColors"), "yes");
        assert.equal(await page.locator('[name="customGuide"]').isDisabled(), true, "DualShock 2 has no invented guide button");
        await change("controllerColor", "#2255cc");
        await change("tintControls", "yes");
        await change("customOutlineColor", "yes");
        await change("outlineColor", "#7799aa");
        await change("outlineWidth", "1.5");
        assert.equal(await page.locator('[name="outlineWidth"]').getAttribute("type"), "number");
        assert.equal(await page.locator('[data-number-field="outlineWidth"]').count(), 1);
        await change("tintOutlines", "yes");
        assert.equal(await page.locator('[name="outlineColor"]').isDisabled(), true);
        await change("tintOutlines", "no");
        assert.equal(await page.locator('[name="outlineColor"]').inputValue(), "#7799aa");
        await page.locator("#skin-input").selectOption("xone");
        await page.waitForFunction(() => !document.querySelector('[name="customGuide"]').disabled);
        await change("customGuide", "yes");
        await change("guideSource", "image");
        await change("guideImage", "https://media.test/logo.svg");
        await change("guideScale", "125");
        await change("guideOffsetX", "5");
        await change("guideOffsetY", "-5");
        await change("customColors", "no");
        await page.waitForFunction(() => !new URL(document.getElementById("overlay-url").value).searchParams.has("customColors"));
        const shared = new URL(await page.locator("#overlay-url").inputValue());
        assert.equal(shared.searchParams.has("controllerColor"), false);
        assert.equal(shared.searchParams.get("guideImage"), "https://media.test/logo.svg", "Guide customization is independent of Custom colors");
        assert.equal(shared.searchParams.get("outlineWidth"), "1.5", "Vector details remain independent");
        assert.equal(await page.locator('[name="customGuide"]').isEnabled(), true);
        assert.equal(await page.locator('[name="controllerColor"]').inputValue(), "#2255cc");
        assert.equal(await page.locator('[name="guideImage"]').inputValue(), "https://media.test/logo.svg");
        await page.goto("https://stream.test/controller/#configure");
        await page.waitForFunction(() => document.getElementById("overlay-url")?.value);
        assert.equal(await page.locator('[name="customColors"]').isChecked(), false);
        assert.equal(await page.locator('[name="controllerColor"]').inputValue(), "#2255cc", "Existing editor preferences retain disabled customization across reopening");
        assert.equal(await page.locator('[name="guideScale"]').inputValue(), "125");
        await change("customColors", "yes");
        await page.frameLocator("#overlay-preview").locator(".guide-logo-custom image").waitFor();
        await change("controllerColor", "#334455");
        await page.locator('button[type="reset"][form="overlay-form"]').click();
        await page.waitForFunction(() => !document.querySelector('[name="customColors"]').checked && !new URL(document.getElementById("overlay-url").value).searchParams.has("customColors"));
        assert.equal(await page.locator('[name="controllerColor"]').inputValue(), "#2255cc", "Reset restores the opening draft, including disabled values");
      } finally {
        await page.close();
      }
    });

    await t.test("shell controls share uploads, retain drafts, serialize, and reset independently", async () => {
      const page = await browser.newPage();
      try {
        await serve(page, assets);
        await page.goto("https://stream.test/controller/?player=9&skin=ds5#configure");
        await page.waitForFunction(() => document.getElementById("overlay-url")?.value);
        /** Apply through the real named form fields, including controls inside collapsed subsections. */
        async function change(name, value) {
          await page.locator(`[name="${name}"]`).evaluate((node, value) => {
            node.value = value;
            node.dispatchEvent(new Event("change", { bubbles: true }));
          }, value);
          await page.waitForFunction(({ name, value }) => String(byStreamResource.settings[name]).replace(/^#/, "") === value.replace(/^#/, ""), { name, value });
        }
        assert.equal(await page.locator('[name="shellImage"]').isDisabled(), true);
        assert.equal(await page.locator('[name="outlineWidth"]').isEnabled(), true);
        assert.equal(await page.locator('[name="customGuide"]').isEnabled(), true);
        await change("shellAppearance", "tint");
        assert.equal(await page.locator('[name="shellImage"]').locator("..").locator(".image-provider").isEnabled(), true);
        const uri = await page.evaluate(() => {
          const canvas = document.createElement("canvas");
          canvas.width = canvas.height = 2;
          return canvas.toDataURL();
        });
        await change("shellImage", uri);
        await change("shellPositionX", "15");
        await change("shellRotation", "30");
        await change("shellTintColor", "#44bb77");
        await change("shellTintStrength", "65");
        const shared = new URL(await page.locator("#overlay-url").inputValue());
        assert.equal(shared.searchParams.get("shellImage"), uri);
        assert.equal(shared.searchParams.get("shellTintStrength"), "65");
        await page.frameLocator("#overlay-preview").locator('[data-shell-texture="ready"]').waitFor();
        await change("layout", "minimal");
        assert.equal(await page.locator('[name="shellAppearance"]').isDisabled(), true);
        assert.equal(new URL(await page.locator("#overlay-url").inputValue()).searchParams.has("shellImage"), false);
        await change("layout", "full");
        assert.equal(await page.locator('[name="shellImage"]').inputValue(), uri);
        await page.locator('[name="skin"]').selectOption("fgc");
        await page.waitForFunction(() => document.querySelector('[name="shellAppearance"]').disabled);
        await page.locator('[name="skin"]').selectOption("ds5");
        await page.waitForFunction(() => !document.querySelector('[name="shellImage"]').disabled);
        await page.locator("#reset-shell-adjustments").evaluate((node) => node.click());
        await page.waitForFunction(() => byStreamResource.settings.shellPositionX === 0 && byStreamResource.settings.shellTintStrength === 0);
        assert.equal(await page.locator('[name="shellImage"]').inputValue(), uri);
        assert.equal(await page.locator('[name="shellRotation"]').inputValue(), "0");
        await page.locator('[data-settings-view="json"]').click();
        assert.equal(JSON.parse(await page.locator("#settings-json").inputValue()).shellImage, uri);
        await page.goto(`${shared.href}#configure`);
        await page.waitForFunction(() => document.getElementById("overlay-url")?.value);
        assert.equal(await page.locator('[name="shellPositionX"]').inputValue(), "15");
        assert.equal(await page.locator('[name="shellTintStrength"]').inputValue(), "65");
      } finally {
        await page.close();
      }
    });

    await t.test("controller variants reset named palettes, preserve Default and Sequential on Skin edits, and retain imports and Reset", async () => {
      const page = await browser.newPage();
      try {
        await serve(page, assets);
        await page.goto("https://stream.test/controller/?skin=ds2&variant=silver&player=9#configure");
        await page.waitForFunction(() => document.getElementById("overlay-url")?.value);
        const variant = page.locator('[name="variant"]');
        const palettes = [
          ["bonyur", "BONYUR"],
          ["arctic", "Arctic"],
          ["sakura", "Sakura"],
          ["lagoon", "Lagoon"],
          ["forest", "Forest"],
          ["sunset", "Sunset"],
          ["royal", "Royal"],
          ["sandstone", "Sandstone"],
          ["cyberpunk", "Cyberpunk"]
        ];
        const options = () => variant.locator("option").evaluateAll((nodes) => nodes.map((node) => [node.value, node.textContent]));
        const waitSettings = (skin, variant) => page.waitForFunction(([skin, variant]) => byStreamResource.settings.skin === skin && byStreamResource.settings.variant === variant, [skin, variant]);
        assert.deepEqual(await options(), [["original", "Default"], ["silver", "Silver"], ["white", "White"], ...palettes, ["sequential", "Sequential (all)"]]);
        assert.equal(await variant.inputValue(), "silver", "Opening links retain their explicit palette");
        await variant.selectOption("white");
        await waitSettings("ds2", "white");
        await page.locator("#skin-input").selectOption("xone");
        await waitSettings("xone", "original");
        assert.deepEqual(await options(), [["original", "Default"], ["white", "White"], ["red", "Red"], ...palettes, ["sequential", "Sequential (all)"]]);
        assert.equal(new URL(await page.locator("#overlay-url").inputValue()).searchParams.has("variant"), false, "Changing Skin resets even a palette supported by both models");

        const choices = await page.evaluate(() =>
          Object.entries(byControllerArtwork.skins).map(([id, skin]) => {
            jQuery("#skin-input").val(id).trigger("change");
            const select = document.querySelector('[name="variant"]');
            return { id, variants: skin.variants, options: [...select.options].map((node) => [node.value, node.textContent]), disabled: [...select.options].some((node) => node.disabled), value: select.value };
          })
        );
        for (const choice of choices) {
          assert.ok(Object.keys(choice.variants).length + 1 >= 9, `${choice.id} has at least nine palettes including Default`);
          if (choice.id.startsWith("fgc")) assert.equal(Object.hasOwn(choice.variants, "bonyur"), false, `${choice.id} uses Default for BONYUR`);
          assert.deepEqual(choice.options, [["original", "Default"], ...Object.entries(choice.variants), ...(Object.keys(choice.variants).length ? [["sequential", "Sequential (all)"]] : [])], choice.id);
          assert.equal(choice.disabled, false, `${choice.id} has no unavailable options`);
          assert.equal(choice.value, "original", `${choice.id} resets to Default`);
        }
        await page.locator("#skin-input").selectOption("nes");
        await variant.selectOption("sakura");
        await waitSettings("nes", "sakura");
        assert.equal(new URL(await page.locator("#overlay-url").inputValue()).searchParams.get("variant"), "sakura");
        await page.frameLocator("#overlay-preview").locator('.controller-background[data-controller="nes"][data-variant="sakura"]').waitFor();
        await page.locator("#skin-input").selectOption("gcn");
        await variant.selectOption("sequential");
        await waitSettings("gcn", "sequential");
        assert.equal(new URL(await page.locator("#overlay-url").inputValue()).searchParams.get("variant"), "sequential");
        await page.frameLocator("#overlay-preview").locator('.controller-background[data-variant="original"]').waitFor();
        await page.locator("#skin-input").selectOption("ds2");
        await waitSettings("ds2", "sequential");
        assert.equal(await variant.inputValue(), "sequential", "Skin edits preserve Sequential (all)");
        assert.equal(new URL(await page.locator("#overlay-url").inputValue()).searchParams.get("variant"), "sequential");
        await page.locator("#skin-input").selectOption("fgc6");
        await waitSettings("fgc6", "sequential");
        assert.equal(await variant.inputValue(), "sequential", "Fight Stick views also preserve Sequential (all)");
        await variant.selectOption("original");
        await waitSettings("fgc6", "original");
        await page.locator("#skin-input").selectOption("nes");
        await waitSettings("nes", "original");
        assert.equal(await variant.inputValue(), "original", "Skin edits preserve Default");
        assert.equal(new URL(await page.locator("#overlay-url").inputValue()).searchParams.has("variant"), false);

        await page.locator("#overlay-url").fill("https://stream.test/controller/?skin=gcn&variant=indigo&player=9");
        await page.locator("#overlay-url").press("Enter");
        await waitSettings("gcn", "indigo");
        assert.equal(await variant.inputValue(), "indigo", "URL imports can select palettes absent from the previous skin");
        await page.frameLocator("#overlay-preview").locator('.controller-background[data-controller="gcn"][data-variant="indigo"]').waitFor();
        // Release after Select2's deferred focus to expose the enclosing label's default action.
        await page.locator('label:has([name="variant"]) .select2-selection').click({ delay: 50 });
        assert.deepEqual(await page.locator('.select2-results__option[role="option"]').allTextContents(), ["Default", "Indigo", "Silver", "White", ...palettes.map(([, name]) => name), "Sequential (all)"]);
        assert.equal(await page.locator(".select2-results__option--disabled").count(), 0);
        assert.equal(await page.locator(".select2-container--open .select2-search__field").evaluate((node) => node === document.activeElement), true, "The dropdown retains keyboard focus after the label click");
        await page.keyboard.press("Escape");
        await page.locator(".select2-dropdown").waitFor({ state: "hidden" });

        await page.locator('[data-settings-view="json"]').click();
        await page.locator("#settings-json").fill(JSON.stringify({ skin: "joycon", variant: "neon", player: "9" }));
        await page.locator("#settings-json").press("Tab");
        await waitSettings("joycon", "neon");
        assert.deepEqual(await options(), [["original", "Default"], ["neon", "Neon"], ...palettes, ["sequential", "Sequential (all)"]]);
        assert.equal(await variant.inputValue(), "neon", "JSON imports retain explicit palettes");
        await page.locator('[data-settings-view="form"]').click();
        await page.locator('button[type="reset"][form="overlay-form"]').click();
        await waitSettings("ds2", "silver");
        assert.deepEqual(await options(), [["original", "Default"], ["silver", "Silver"], ["white", "White"], ...palettes, ["sequential", "Sequential (all)"]]);
        assert.equal(await variant.inputValue(), "silver", "Reset restores the opening palette after its option was removed");
        await page.goto("https://stream.test/controller/#configure");
        await page.waitForFunction(() => document.getElementById("overlay-url")?.value);
        assert.equal(await variant.inputValue(), "silver", "Saved settings retain their palette on reopening");
      } finally {
        await page.close();
      }
    });

    await t.test("controller editor selects all eight gamepads and previews their player LEDs", async () => {
      const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
      try {
        await page.addInitScript(() => {
          window.testPads = Array.from({ length: 8 }, (_, index) => ({ id: `Pad ${index}`, index, connected: true, buttons: Array.from({ length: 18 }, () => ({ value: 0 })), axes: [0, 0, 0, 0] }));
          Object.defineProperty(navigator, "getGamepads", { value: () => testPads });
        });
        await serve(page, assets);
        await page.goto("https://stream.test/controller/?player=all&skin=xseries#configure");
        await page.waitForFunction(() => document.getElementById("overlay-url")?.value);
        assert.deepEqual(await page.locator("#player-input option").evaluateAll((nodes) => nodes.map((node) => node.value)), ["1", "2", "3", "4", "5", "6", "7", "8", "9", "all-gamepads", "all-inputs", "gamepads", "all"]);
        assert.deepEqual(await page.locator("#player-input option").evaluateAll((nodes) => nodes.slice(-5).map((node) => node.textContent)), ["Keyboard", "All", "All + Keyboard", "All connected", "All connected + Keyboard"]);
        assert.deepEqual(await page.locator('[name="layout"] option').evaluateAll((nodes) => nodes.map((node) => node.textContent)), ["Full", "Minimal"]);
        await page.frameLocator("#overlay-preview").locator('#gamepads[data-gamepad-count="8"] #gamepad-9').waitFor({ state: "attached" });
        assert.equal(await page.frameLocator("#overlay-preview").locator(".controller.active").count(), 9);
        const indicators = page.locator('[name="showPlayerIndicators"]');
        assert.equal(await indicators.isChecked(), false);
        assert.equal(new URL(await page.locator("#overlay-url").inputValue()).searchParams.has("showPlayerIndicators"), false);
        assert.equal(await page.frameLocator("#overlay-preview").locator(".player-indicator:visible, .player-ring:visible").count(), 0);
        await indicators.evaluate((node) => {
          node.checked = true;
          node.dispatchEvent(new Event("change", { bubbles: true }));
        });
        await page.waitForFunction(() => document.querySelector("#overlay-preview").contentWindow.byStreamResource?.settings.showPlayerIndicators === "yes");
        await page.frameLocator("#overlay-preview").locator("#gamepad-9 .player-leds-layer").waitFor();
        await page.locator('[name="variant"]').selectOption("sequential");
        await page.waitForFunction(() => document.querySelector("#overlay-preview").contentWindow.document.querySelector("#gamepad-9 .controller-background")?.dataset.variant === "sunset");
        assert.deepEqual(
          await page
            .frameLocator("#overlay-preview")
            .locator(".controller-background")
            .evaluateAll((nodes) => nodes.map((node) => node.dataset.variant)),
          ["original", "white", "red", "bonyur", "arctic", "sakura", "lagoon", "forest", "sunset"]
        );
        assert.equal(new URL(await page.locator("#overlay-url").inputValue()).searchParams.get("variant"), "sequential");
        assert.equal(new URL(await page.locator("#overlay-url").inputValue()).searchParams.get("showPlayerIndicators"), "yes");
        await indicators.evaluate((node) => {
          node.checked = false;
          node.dispatchEvent(new Event("change", { bubbles: true }));
        });
        await page.waitForFunction(() => document.querySelector("#overlay-preview").contentWindow.byStreamResource?.settings.showPlayerIndicators === "no");
        assert.equal(await page.frameLocator("#overlay-preview").locator(".player-indicator:visible, .player-ring:visible").count(), 0);
        assert.equal(new URL(await page.locator("#overlay-url").inputValue()).searchParams.has("showPlayerIndicators"), false);
        await indicators.evaluate((node) => {
          node.checked = true;
          node.dispatchEvent(new Event("change", { bubbles: true }));
        });
        await page.waitForFunction(() => document.querySelector("#overlay-preview").contentWindow.byStreamResource?.settings.showPlayerIndicators === "yes");
        await page.frameLocator("#overlay-preview").locator("#gamepad-9 .player-leds-layer").waitFor();
        await page.locator("#player-input").selectOption("gamepads");
        await page.waitForFunction(() => new URL(document.getElementById("overlay-url").value).searchParams.get("player") === "gamepads");
        await page.waitForFunction(() => document.getElementById("overlay-preview").contentWindow.byStreamResource?.settings.player === "gamepads");
        await page.frameLocator("#overlay-preview").locator('#gamepads[data-gamepad-count="8"] #gamepad-8').waitFor();
        assert.equal(await page.frameLocator("#overlay-preview").locator(".controller.active").count(), 8);
        assert.equal(await page.frameLocator("#overlay-preview").locator("#gamepad-9").count(), 0);
        await page.keyboard.press("F1");
        await page.locator('[data-section="remap"]').click();
        assert.deepEqual(await page.locator("#player-base option").evaluateAll((nodes) => nodes.map((node) => node.value)), ["1", "2", "3", "4", "5", "6", "7", "8", "9"]);
        await page.locator("#player-base").selectOption("8");
        await page.waitForFunction(() => new URL(document.getElementById("overlay-url").value).searchParams.get("player") === "8");
        await page.frameLocator("#overlay-preview").locator("#gamepad-8:not(.disconnected)").waitFor();
        assert.equal(
          await page
            .frameLocator("#overlay-preview")
            .locator(".player-leds-layer [data-player]")
            .evaluateAll((nodes) => nodes.map((node) => (node.classList.contains("lit") ? "X" : "-")).join("")),
          "X-XX"
        );
        await page.evaluate(() => {
          testPads[7].connected = false;
        });
        await page.waitForFunction(() => !document.querySelector('#player-base option[value="8"]'));
        await page.evaluate(() => {
          testPads[7].connected = true;
        });
        await page.waitForFunction(() => !!document.querySelector('#player-base option[value="8"]'));
      } finally {
        await page.close();
      }
    });

    await t.test("controller All options preview every slot without connected gamepads", async () => {
      const page = await browser.newPage();
      try {
        await serve(page, assets);
        await page.addInitScript(() => {
          Object.defineProperty(navigator, "getGamepads", { value: () => [] });
        });
        await page.goto("https://stream.test/controller/?player=all-inputs&skin=xseries#configure");
        await page.waitForFunction(() => document.getElementById("overlay-url")?.value);
        for (const [mode, count, disconnected] of [
          ["all-inputs", 9, 8],
          ["all-gamepads", 8, 8],
          ["gamepads", 0, 0],
          ["all", 1, 0]
        ]) {
          await page.locator("#player-input").selectOption(mode);
          await page.waitForFunction((mode) => document.querySelector("#overlay-preview").contentWindow.byStreamResource?.settings.player === mode, mode);
          await page.frameLocator("#overlay-preview").locator('#gamepads[data-gamepad-count="0"]').waitFor({ state: "attached" });
          assert.equal(await page.frameLocator("#overlay-preview").locator(".controller.active").count(), count, mode);
          assert.equal(await page.frameLocator("#overlay-preview").locator(".controller.disconnected").count(), disconnected, mode);
          assert.equal(new URL(await page.locator("#overlay-url").inputValue()).searchParams.get("player"), mode);
        }
      } finally {
        await page.close();
      }
    });

    await t.test("controller mapping records raw input and preserves applied values until every row is valid", async () => {
      const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
      try {
        const errors = [];
        page.on("pageerror", (error) => errors.push(error.message));
        await page.addInitScript(() => {
          window.testPad = { id: "Mapping fixture", index: 0, buttons: Array.from({ length: 18 }, (_, id) => ({ value: id === 1 ? 1 : 0, pressed: id === 1 })), axes: [0, 0, 0, 0] };
          Object.defineProperty(navigator, "getGamepads", { value: () => [window.testPad] });
        });
        await serve(page, assets);
        await page.goto("https://stream.test/controller/#configure");
        await page.waitForFunction(() => document.getElementById("overlay-url")?.value);
        await page.keyboard.press("F1");
        await page.locator('[data-section="remap"]').click();
        await page.locator("#prepend-mapping").click();
        await page.locator('.mapping-record[data-slot="primary"]').first().click();
        await page.evaluate(() => {
          testPad.buttons[1].value = 0;
        });
        await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        assert.equal(await page.locator('.mapping-record[data-slot="primary"]').first().textContent(), "Listening...", "Releasing an already-held input is ignored");
        await page.evaluate(() => {
          testPad.buttons[1].value = 1;
        });
        await page.waitForFunction(() => document.querySelector('.mapping-record[data-slot="primary"]').textContent === "Button 1");
        await page.evaluate(() => {
          testPad.buttons[1].value = 0;
        });
        await page.locator("#apply-mapping").click();
        await page.waitForFunction(() => byStreamResource.settings.mapping.length === 1);
        const accepted = await page.locator("#overlay-url").inputValue();
        await page.locator("#prepend-mapping").click();
        await page.locator("#apply-mapping").click();
        assert.equal(await page.locator("#overlay-url").inputValue(), accepted, "An incomplete draft never replaces the applied mapping");
        await page.locator('.mapping-record[data-slot="primary"]').nth(1).click();
        await page.keyboard.press("Escape");
        assert.equal(await page.locator("#cancel-mapping-capture").isVisible(), false);
        assert.equal(await page.locator('[data-panel="remap"]').isVisible(), true, "Escape cancels capture before closing the mapping panel");
        await page.locator('.mapping-record[data-slot="primary"]').nth(1).click();
        await page.evaluate(() => {
          testPad.buttons[0].value = 1;
        });
        await page.waitForFunction(() => document.querySelectorAll('.mapping-record[data-slot="primary"]')[1].textContent === "Button 0");
        await page.evaluate(() => {
          testPad.buttons[0].value = 0;
        });
        await page.locator(".mapping-target").nth(1).selectOption("0", { force: true });
        await page.locator("#apply-mapping").click();
        assert.equal(await page.locator("#overlay-url").inputValue(), accepted, "Duplicate outputs never replace the applied mapping");
        assert.ok((await page.locator(".map-message").nth(1).textContent()).includes("already"));
        await page.locator(".mapping-remove").nth(1).click();
        await page.locator("#mapping-keyboard").click();
        await page.waitForFunction(() => document.querySelector("#player-base").value === "9");
        await page.locator('.mapping-record[data-slot="primary"]').first().click();
        await page.keyboard.down("b");
        await page.waitForFunction(() => document.querySelector('.mapping-record[data-slot="primary"]').textContent === "Key B");
        await page.keyboard.up("b");
        await page.locator("#apply-mapping").click();
        await page.waitForFunction(() => byStreamResource.settings.mapping[0].choiceType === "keys" && byStreamResource.settings.mapping[0].choice === "KeyB" && byStreamResource.settings.player === "9");
        const overlay = new URL(await page.locator("#overlay-url").inputValue());
        assert.equal(overlay.searchParams.get("player"), "9");
        await page.locator("form[data-configurator]").evaluate((form) => form.reset());
        await page.waitForFunction(() => byStreamResource.settings.mapping.length === 0 && document.querySelectorAll("#mappings .mapping-row").length === 0);
        assert.deepEqual(errors, []);
      } finally {
        await page.close();
      }
    });

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

    await t.test("cleared text stays empty, numeric defaults restore, and multiline rows serialize", async () => {
      const page = await browser.newPage();
      try {
        await serve(page, assets);
        await page.goto("https://stream.test/watermark/?text=Opening#configure");
        await page.waitForFunction(() => document.getElementById("overlay-url")?.value);
        const text = page.locator('#overlay-form [name="text"]');
        await text.fill("");
        await text.blur();
        await page.waitForFunction(() => {
          const query = new URL(document.getElementById("overlay-url").value).searchParams;
          return query.has("text") && query.get("text") === "";
        });
        assert.equal(await text.inputValue(), "");
        const number = page.locator('#overlay-form [name="fontSize"]');
        const fallback = await page.evaluate(() => String(byStreamResource.fields.fontSize.default));
        for (const value of ["", "0"]) {
          await number.fill(value);
          await number.blur();
          await page.waitForFunction((fallback) => document.querySelector('[name="fontSize"]').value === fallback, fallback);
        }
        await number.fill("99999");
        await number.blur();
        await page.waitForFunction(() => document.querySelector('[name="fontSize"]').classList.contains("is-invalid"));
        assert.equal(await number.getAttribute("aria-invalid"), "true");
        await number.fill(fallback);
        await number.blur();
        await page.waitForFunction(() => !document.querySelector('[name="fontSize"]').classList.contains("is-invalid"));
        const opacity = page.locator('#overlay-form [name="opacity"]');
        await opacity.fill("0");
        await opacity.blur();
        assert.equal(await opacity.inputValue(), "0");
        await page.goto("https://stream.test/clock/#configure");
        await page.waitForFunction(() => document.getElementById("overlay-url")?.value);
        assert.equal(await page.locator(".select2-selection__clear").count(), 0);
        assert.equal(await page.locator('[name="label"]').inputValue(), "");
        await page.locator('[name="label"]').fill("   ");
        await page.locator('[name="label"]').blur();
        assert.equal(await page.locator('[name="label"]').inputValue(), "");
        await page.goto("https://stream.test/credits/#configure");
        await page.waitForFunction(() => document.querySelector('.entry-row textarea[data-field="name"]'));
        await page.locator('.entry-row textarea[data-field="name"]').first().fill("First\nSecond");
        await page.waitForFunction(() => JSON.parse(document.querySelector('[name="entries"]').value)[0].name === "First\nSecond");
        assert.equal(await page.locator('[name="title"]').evaluate((node) => node.tagName), "TEXTAREA");
      } finally {
        await page.close();
      }
    });

    await t.test("numeric zero imports show concrete defaults and Fill width follows Width", async () => {
      const page = await browser.newPage();
      try {
        await serve(page, assets);
        await page.goto("https://stream.test/main/?countdownRight=0&countdownFontSize=0#configure");
        await page.waitForFunction(() => document.getElementById("overlay-url")?.value);
        assert.equal(await page.locator('[name="countdownRight"]').inputValue(), "80");
        assert.equal(await page.locator('[name="countdownFontSize"]').inputValue(), "48");
        await page.getByRole("button", { name: "Expand All", exact: true }).click();
        await page.locator('[name="countdownRight"]').fill("0");
        await page.locator('[name="countdownRight"]').blur();
        assert.equal(await page.locator('[name="countdownRight"]').inputValue(), "80");
        await page.locator('[data-settings-view="json"]').click();
        await page.locator("#settings-json").fill(JSON.stringify({ sceneTitle: "Test", countdownRight: 0, countdownFontSize: 0 }));
        await page.locator("#settings-json").blur();
        await page.waitForFunction(() => byStreamResource.settings.sceneTitle === "Test");
        assert.deepEqual(await page.evaluate(() => [byStreamResource.settings.countdownRight, byStreamResource.settings.countdownFontSize]), [80, 48]);
        await page.goto("https://stream.test/lower-thirds/?imageSize=0#configure");
        await page.waitForFunction(() => document.getElementById("overlay-url")?.value);
        assert.equal(await page.locator('[name="imageSize"]').inputValue(), "0");
        await page.goto("https://stream.test/watermark/?width=0#configure");
        await page.waitForFunction(() => document.getElementById("overlay-url")?.value);
        const fill = page.locator('[name="widthMode"]');
        assert.equal(await fill.isDisabled(), false);
        assert.equal(await fill.evaluate((node) => node.closest(".conditional-field").hidden), false);
        const width = page.locator('[name="width"]');
        await width.fill("320");
        await width.blur();
        await page.waitForFunction(() => document.querySelector('[name="widthMode"]').disabled && document.querySelector('[name="widthMode"]').closest(".conditional-field").hidden);
        await width.fill("0");
        await width.blur();
        await page.waitForFunction(() => !document.querySelector('[name="widthMode"]').disabled && !document.querySelector('[name="widthMode"]').closest(".conditional-field").hidden);
        await page.goto("https://stream.test/badge/#configure");
        await page.waitForFunction(() => document.getElementById("overlay-url")?.value);
        await page.getByRole("button", { name: "Expand All", exact: true }).click();
        await page.locator('[name="animate"]').uncheck();
        await page.waitForFunction(() => new URL(document.getElementById("overlay-url").value).searchParams.get("animate") === "no");
        await page.frameLocator("#overlay-preview").locator('html[data-animate="no"]').waitFor({ state: "attached" });
        assert.equal(await page.evaluate(() => document.documentElement.hasAttribute("data-animate")), false, "Resource Animate does not disable configurator motion");
        await page.locator('[name="animate"]').check();
        await page.waitForFunction(() => !new URL(document.getElementById("overlay-url").value).searchParams.has("animate"));
      } finally {
        await page.close();
      }
    });

    await t.test("restoring resource defaults replaces saved Schedule entries and Sponsor image URLs", async () => {
      const page = await browser.newPage();
      try {
        await serve(page, assets);
        await page.addInitScript(() => {
          const name = location.pathname.split("/")[1];
          if (sessionStorage.getItem(`seeded.${name}`)) return;
          const entries =
            name === "schedule"
              ? [
                  { title: "Warm-up", startTime: "2026-11-10T18:00:00Z", endTime: "2026-11-10T18:30:00Z" },
                  { title: "The main event", startTime: "2026-11-10T18:30:00Z", endTime: "2026-11-10T19:30:00Z" }
                ]
              : [{ name: "Old partner", text: "Saved card", imageUrl: "" }];
          localStorage.setItem(`stream.html.settings.${encodeURIComponent(location.pathname)}`, JSON.stringify({ query: new URLSearchParams({ entries: JSON.stringify(entries) }).toString() }));
          sessionStorage.setItem(`seeded.${name}`, "yes");
        });
        for (const [name, count] of [
          ["schedule", 3],
          ["sponsors", 2]
        ]) {
          await page.goto(`https://stream.test/${name}/#configure`);
          await page.waitForFunction(() => document.getElementById("overlay-url")?.value);
          assert.equal(await page.locator(".entry-row").count(), count - 1);
          await page.locator("#advanced-options").click();
          await Promise.all([page.waitForEvent("load"), page.locator("#restore-defaults").click()]);
          await page.waitForFunction((count) => window.byStreamResource?.settings.entries.length === count && document.getElementById("overlay-url")?.value, count);
          assert.equal(await page.locator(".entry-row").count(), count);
          assert.deepEqual(await page.evaluate(() => byStreamResource.settings.entries), await page.evaluate(() => byStreamResource.fields.entries.default));
          if (name === "schedule") assert.deepEqual(await page.evaluate(() => byStreamResource.settings.entries.map((entry) => entry.title)), ["Warm-up", "Announcement", "The main event"]);
          else assert.deepEqual(await page.locator('.entry-row [data-field="imageUrl"]').evaluateAll((nodes) => nodes.map((node) => node.value)), ["https://byuwur.github.io/img/logo.png", ""]);
        }
      } finally {
        await page.close();
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

test("universal image inputs", async (t) => {
  const assets = await loadAssets(editorAssets);
  const browser = await chromium.launch(launchOptions);
  try {
    async function open(tool = "qr", options = {}) {
      const page = await browser.newPage();
      await serve(page, assets);
      await page.addInitScript((options) => {
        window.byConfigurator = { imageOptions: options };
      }, options);
      const images = await page.evaluate(() => {
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = 2;
        canvas.getContext("2d").fillRect(0, 0, 2, 2);
        return Object.fromEntries(["png", "jpeg", "webp"].map((type) => [type, canvas.toDataURL(`image/${type}`).split(",")[1]]));
      });
      // Two GIF frames; exact byte comparison below ensures conversion keeps the animation.
      images.gif = Buffer.from("47494638396101000100800000000000ffffff21ff0b4e45545343415045322e30030100000021f904000a0000002c000000000100010000020244010021f904000a0000002c00000000010001000002024c01003b", "hex").toString("base64");
      const png = Buffer.from(images.png, "base64");
      const calls = [];
      let catbox = { status: 200, body: "https://files.catbox.moe/test.png" };
      await page.route("https://stream.byuwur.co/upload_image.php", (route) => {
        calls.push({ provider: "catbox", body: route.request().postDataBuffer().toString("latin1"), headers: route.request().headers() });
        return catbox.abort ? route.abort("failed") : route.fulfill({ ...catbox, contentType: "text/plain" });
      });
      await page.route(/https:\/\/files\.catbox\.moe\/.*/, (route) => route.fulfill({ body: png, contentType: "image/png" }));
      await page.goto(`https://stream.test/${tool}/?${tool === "main" ? "displayBackground=yes&" : ""}#configure`);
      await page.waitForFunction(() => document.getElementById("overlay-url")?.value);
      const input = page.locator(".image-url").first();
      const component = input.locator("..");
      return {
        page,
        images,
        calls,
        input,
        component,
        provider: component.locator(".image-provider"),
        picker: component.locator('input[type="file"]'),
        status: component.locator(".image-status"),
        file: (type = "png", buffer = Buffer.from(images[type], "base64")) => ({ name: `image.${type}`, mimeType: `image/${type}`, buffer }),
        catbox: (response) => {
          catbox = response;
        }
      };
    }
    async function drop(component, file) {
      await component.evaluate(
        (element, file) => {
          const dataTransfer = new DataTransfer();
          dataTransfer.items.add(new File([Uint8Array.from(atob(file.base64), (c) => c.charCodeAt(0))], file.name, { type: file.type }));
          const event = new DragEvent("drop", { bubbles: true, cancelable: true, dataTransfer });
          element.dispatchEvent(event);
          if (!event.defaultPrevented) throw new Error("Drop must prevent browser navigation");
        },
        { base64: file.buffer.toString("base64"), name: file.name, type: file.mimeType }
      );
    }
    async function success(fixture) {
      await fixture.page.waitForFunction(() => document.querySelector(".image-status.text-success:not([hidden])"));
    }
    async function failure(fixture, text) {
      await fixture.status.filter({ hasText: text }).and(fixture.page.locator(".text-danger")).waitFor({ state: "visible" });
      assert.equal(await fixture.status.getAttribute("role"), "alert");
    }

    await t.test("connected layout, keyboard browsing, cancellation, manual edits, and native updates", async () => {
      const f = await open();
      const { page } = f;
      try {
        await page.setViewportSize({ width: 360, height: 800 });
        const value = await f.input.inputValue();
        assert.equal(await f.provider.inputValue(), "manual");
        await f.provider.selectOption("base64");
        assert.equal(await f.input.inputValue(), value);
        assert.equal(await f.status.isVisible(), false);
        await f.input.focus();
        await page.keyboard.press("Tab");
        assert.equal(await f.provider.evaluate((element) => document.activeElement === element), true);
        await page.keyboard.press("Tab");
        const browse = f.component.locator(".image-browse");
        assert.equal(await browse.evaluate((element) => document.activeElement === element), true);
        const chooser = page.waitForEvent("filechooser");
        await browse.press("Enter");
        await (await chooser).setFiles([]);
        assert.equal(await f.provider.inputValue(), "base64");
        assert.equal(await f.input.inputValue(), value);
        await browse.focus();
        await page.waitForFunction(() => getComputedStyle(document.querySelector(".image-browse")).boxShadow !== "none");
        const layout = await f.component.evaluate((element) => {
          const input = element.querySelector(".image-url");
          const select = element.querySelector("select");
          const button = element.querySelector("button");
          const a = input.getBoundingClientRect(),
            b = select.getBoundingClientRect(),
            c = button.getBoundingClientRect();
          return {
            connected: Math.abs(a.bottom - b.top) < 1 && Math.abs(b.right - c.left) < 1,
            equal: Math.abs(b.width - c.width) < 1,
            overflow: element.scrollWidth > element.clientWidth,
            border: getComputedStyle(input).borderBottomWidth,
            focus: getComputedStyle(button).boxShadow,
            radius: getComputedStyle(input).borderTopLeftRadius
          };
        });
        assert.equal(layout.connected, true);
        assert.equal(layout.equal, true);
        assert.equal(layout.overflow, false);
        assert.equal(layout.border, "0px");
        assert.notEqual(layout.focus, "none");
        assert.notEqual(layout.radius, "0px");
        await f.provider.selectOption("manual");
        const chooser2 = page.waitForEvent("filechooser");
        await browse.click();
        await (await chooser2).setFiles(f.file());
        await success(f);
        assert.equal(await f.provider.inputValue(), "catbox");
        assert.equal(await f.input.inputValue(), "https://files.catbox.moe/test.png");
        assert.match(f.calls[0].body, /name="provider"\r\n\r\ncatbox/);
        assert.doesNotMatch(f.calls[0].body, /name="(?:reqtype|url|endpoint)"/);
        assert.match(f.calls[0].body, /name="fileToUpload"; filename="image.png"/);
        assert.ok(f.calls[0].body.includes(f.file().buffer.toString("latin1")), "Original file is uploaded unchanged");
        assert.equal(f.calls[0].headers.authorization, undefined);
        assert.equal(f.calls[0].headers.cookie, undefined);
        await page.waitForFunction(() => new URL(document.getElementById("overlay-url").value).searchParams.get("logoUrl") === "https://files.catbox.moe/test.png");
        await f.input.fill("https://example.com/manual.png");
        assert.equal(await f.provider.inputValue(), "manual");
        assert.equal(await f.status.isVisible(), false);
        await page.waitForFunction(() => new URL(document.getElementById("overlay-url").value).searchParams.get("logoUrl") === "https://example.com/manual.png");
        await f.provider.selectOption("base64");
        await f.input.evaluate((input, value) => {
          input.value = value;
          input.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertFromPaste" }));
        }, `data:image/png;base64,${f.images.png}`);
        assert.equal(await f.provider.inputValue(), "manual");
        assert.equal(await f.input.evaluate((input) => byStream.safeImage(input.value)), true);
      } finally {
        await page.close();
      }
    });

    await t.test("Base64 preserves PNG, JPEG, WebP and animated GIF bytes, round trips, JSON, compression and reset", async () => {
      const f = await open();
      const { page } = f;
      try {
        for (const type of ["png", "jpeg", "webp", "gif"]) {
          await f.provider.selectOption("base64");
          await drop(f.component, f.file(type));
          const uri = `data:image/${type};base64,${f.images[type]}`;
          await page.waitForFunction((uri) => document.querySelector(".image-url")?.value === uri, uri);
          await success(f);
          assert.equal(await f.input.inputValue(), uri);
          assert.equal(await f.provider.inputValue(), "base64");
          await page.waitForFunction((uri) => new URL(document.getElementById("overlay-url").value).searchParams.get("logoUrl") === uri, uri);
          await page.waitForFunction((uri) => document.getElementById("overlay-preview").contentDocument?.querySelector(".qr-logo")?.getAttribute("src") === uri, uri);
          assert.equal(await page.frameLocator("#overlay-preview").locator(".qr-logo").getAttribute("src"), uri);
        }
        assert.equal(f.calls.length, 0);
        await page.locator('[data-settings-view="json"]').click();
        const json = JSON.parse(await page.locator("#settings-json").inputValue());
        assert.equal(json.logoUrl, await f.input.inputValue());
        assert.equal(
          Object.keys(json).some((key) => /provider|upload/i.test(key)),
          false
        );
        json.logoUrl = `data:image/png;base64,${Buffer.concat([Buffer.from(f.images.png, "base64"), Buffer.alloc(1024)]).toString("base64")}`;
        await page.locator("#settings-json").fill(JSON.stringify(json));
        await page.waitForFunction((value) => document.querySelector(".image-url").value === value, json.logoUrl);
        await page.locator('[data-settings-view="form"]').click();
        assert.equal(await f.provider.isEnabled(), true);
        assert.equal(await f.component.locator(".image-actions").isHidden(), false);
        await page.locator("#advanced-options").click();
        await page.locator("#short-url").check();
        await page.locator('input[name="compression-scope"][value="all"]').check();
        await page.waitForFunction(() => !document.getElementById("copy-url").disabled && new URL(document.getElementById("overlay-url").value).searchParams.has("data"));
        const compressed = await page.locator("#overlay-url").inputValue();
        await page.keyboard.press("Escape");
        await page.goto(`${compressed}#configure`);
        await page.waitForFunction((uri) => document.querySelector(".image-url")?.value === uri, json.logoUrl);
        await page.locator(".image-url").fill("https://example.com/other.png");
        await page.locator('[type="reset"][form="overlay-form"]').click();
        await page.waitForFunction((uri) => document.querySelector(".image-url")?.value === uri, json.logoUrl);
        assert.equal(await page.locator(".image-status").isVisible(), false);
        await page.reload();
        await page.waitForFunction((uri) => document.querySelector(".image-url")?.value === uri, json.logoUrl);
      } finally {
        await page.close();
      }
    });

    await t.test("format and size limits preserve the existing value and report actual upload failures", async () => {
      const f = await open();
      try {
        const original = await f.input.inputValue();
        await f.provider.selectOption("base64");
        await f.picker.setInputFiles(f.file("png", Buffer.alloc(16385)));
        await failure(f, "Image is too large to embed. Try Catbox instead.");
        assert.equal(await f.input.inputValue(), original);
        for (const file of [{ name: "bad.svg", mimeType: "image/svg+xml", buffer: Buffer.from("<svg/>") }, { ...f.file(), mimeType: "video/mp4" }, f.file("png", Buffer.from("not an image"))]) {
          await f.picker.setInputFiles(file);
          await failure(f, "Unsupported image format");
          assert.equal(await f.input.inputValue(), original);
        }
        await f.provider.selectOption("catbox");
        for (const [response, reason] of [
          [{ status: 503, body: "<html>internal path secret</html>" }, "service unavailable"],
          [{ status: 413, body: "Too large" }, "8 MiB"],
          [{ abort: true }, "Network request failed"],
          [{ status: 200, body: "<html>bad response</html>" }, "Invalid server response"],
          [{ status: 200, body: "https://gofile.io/d/example" }, "Invalid server response"],
          [{ status: 200, body: "http://files.catbox.moe/image.png" }, "Invalid server response"]
        ]) {
          f.catbox(response);
          await f.picker.setInputFiles(f.file());
          await failure(f, reason);
          assert.equal(await f.input.inputValue(), original);
          assert.doesNotMatch(await f.status.textContent(), /internal path|secret|fallback/);
          assert.equal(await f.status.locator("html").count(), 0);
        }
        await f.input.fill(`data:image/png;base64,${Buffer.concat([f.file().buffer, Buffer.alloc(17000)]).toString("base64")}`);
        await f.page.waitForFunction(() => document.querySelector(".image-url").getAttribute("aria-invalid") === "true");
        assert.equal(await f.page.locator("#overlay-url").inputValue(), "");
        await f.input.fill(original);
        assert.deepEqual(await f.provider.locator("option").evaluateAll((nodes) => nodes.map((node) => node.value)), ["manual", "catbox", "base64"]);
      } finally {
        await f.page.close();
      }
    });

    await t.test("hosted limit, malformed files, timeouts, and disabled GoFile never retry", async () => {
      const f = await open("qr", { gofileUploadURL: "/image-upload" });
      try {
        const original = await f.input.inputValue();
        await f.picker.setInputFiles(f.file("png", Buffer.alloc(8388609)));
        await failure(f, "8 MiB");
        assert.equal(f.calls.length, 0);
        await f.picker.setInputFiles(f.file("png", f.file().buffer.subarray(0, 28)));
        await failure(f, "could not be loaded");
        assert.equal(f.calls.length, 0, "Malformed files never reach the hosted endpoint");
        const boundary = Buffer.concat([f.file().buffer, Buffer.alloc(8388608 - f.file().buffer.length)]);
        await f.picker.setInputFiles(f.file("png", boundary));
        await success(f);
        assert.ok(f.calls[0].body.includes(boundary.toString("latin1")), "Exactly 8 MiB is accepted unchanged");
        await f.input.fill(original);
        await f.provider.selectOption("catbox");
        for (const status of [429, 502, 504]) {
          f.catbox({ status, body: "<html>private backend details</html>" });
          const before = f.calls.length;
          await f.picker.setInputFiles(f.file());
          await failure(f, status === 429 ? "limit reached" : status === 502 ? "unavailable" : "timed out");
          assert.equal(f.calls.length, before + 1, "No fallback or retry after an ambiguous failure");
          assert.equal(await f.input.inputValue(), original);
          assert.doesNotMatch(await f.status.textContent(), /private backend/);
        }
        assert.equal(await f.provider.locator('option[value="gofile"]').count(), 0);
      } finally {
        await f.page.close();
      }
    });

    await t.test("progress, timed feedback, safe replacement, manual editing, provider changes and reset cancel stale work", async () => {
      const f = await open();
      const { page } = f;
      try {
        await page.clock.install();
        await page.clock.pauseAt(await page.evaluate(() => Date.now()));
        await f.provider.selectOption("base64");
        await f.picker.setInputFiles(f.file());
        await success(f);
        await page.clock.fastForward(4999);
        assert.equal(await f.status.isVisible(), true);
        await page.clock.fastForward(1);
        assert.equal(await f.status.isVisible(), false);
        await f.picker.setInputFiles(f.file("png", Buffer.alloc(16385)));
        await failure(f, "too large");
        await page.clock.fastForward(9999);
        assert.equal(await f.status.isVisible(), true);
        await page.clock.fastForward(1);
        assert.equal(await f.status.isVisible(), false);
        // This deliberately non-cooperating fetch resolves even after AbortController cancellation.
        await page.evaluate(() => {
          const native = window.fetch;
          window.releases = [];
          window.fetch = (url, options) => (url === "https://stream.byuwur.co/upload_image.php" ? new Promise((resolve) => window.releases.push((value) => resolve(new Response(value)))) : native(url, options));
        });
        await f.provider.selectOption("catbox");
        for (const action of ["manual", "provider", "restore", "reset", "replace"]) {
          const before = await f.input.inputValue();
          const count = await page.evaluate(() => releases.length);
          await f.provider.selectOption("catbox");
          await f.picker.setInputFiles(f.file());
          await page.waitForFunction((count) => releases.length > count, count);
          assert.match(await f.status.textContent(), /Uploading to Catbox/);
          assert.equal(await f.input.inputValue(), before);
          if (action === "manual") await f.input.fill("https://example.com/newer.png");
          if (action === "provider") await f.provider.selectOption("base64");
          if (action === "restore") await page.locator(`[data-restore-field="${await f.input.getAttribute("name")}"]`).click();
          if (action === "reset") await page.locator('[type="reset"][form="overlay-form"]').click();
          if (action === "replace") {
            await drop(f.component, f.file());
            await page.waitForFunction((count) => releases.length === count + 2, count);
            await page.evaluate((index) => releases[index]("https://files.catbox.moe/new.png"), count + 1);
            await success(f);
          }
          const expected = await f.input.inputValue();
          await page.evaluate((index) => releases[index]("https://files.catbox.moe/stale.png"), count);
          await page.evaluate(async () => {
            await Promise.resolve();
            await Promise.resolve();
          });
          assert.equal(await f.input.inputValue(), expected);
          assert.equal(await f.status.isVisible(), action === "replace");
        }
        await page.evaluate(() => {
          const native = window.fetch;
          window.fetch = (url, options) =>
            url === "https://stream.byuwur.co/upload_image.php"
              ? new Promise((resolve, reject) => {
                  window.waitingForUpload = true;
                  options.signal.addEventListener("abort", () => reject(new DOMException("Canceled", "AbortError")), { once: true });
                })
              : native(url, options);
        });
        const previous = await f.input.inputValue();
        await f.provider.selectOption("catbox");
        await f.picker.setInputFiles(f.file());
        await page.waitForFunction(() => window.waitingForUpload);
        await page.clock.fastForward(60000);
        await failure(f, "Request timed out");
        assert.equal(await f.input.inputValue(), previous);
      } finally {
        await page.close();
      }
    });

    await t.test("simultaneous row uploads follow their originating row through reorder and import", async () => {
      const f = await open("sponsors");
      try {
        await f.page.evaluate(() => {
          const native = window.fetch;
          window.pendingImages = [];
          window.fetch = (url, options) => (url === "https://stream.byuwur.co/upload_image.php" ? new Promise((resolve) => pendingImages.push((name) => resolve(new Response(`https://files.catbox.moe/${name}.png`)))) : native(url, options));
        });
        const rows = f.page.locator(".entry-row");
        await rows.nth(0).locator('[data-field="name"]').fill("First");
        await rows.nth(1).locator('[data-field="name"]').fill("Second");
        for (const index of [0, 1]) {
          await rows.nth(index).locator('input[type="file"]').setInputFiles(f.file());
          await f.page.waitForFunction((count) => pendingImages.length === count, index + 1);
        }
        await rows.nth(0).locator('[data-action="down"]').click();
        await f.page.evaluate(() => {
          pendingImages[1]("second");
          pendingImages[0]("first");
        });
        await f.page.waitForFunction(() => document.querySelectorAll(".image-status.text-success").length === 2);
        const entries = JSON.parse(await f.page.locator('[name="entries"]').inputValue());
        assert.deepEqual(
          entries.map(({ name, imageUrl }) => [name, imageUrl]),
          [
            ["Second", "https://files.catbox.moe/second.png"],
            ["First", "https://files.catbox.moe/first.png"]
          ]
        );
        await rows.nth(0).locator('input[type="file"]').setInputFiles(f.file());
        await f.page.waitForFunction(() => pendingImages.length === 3);
        await f.page.locator('[data-settings-view="json"]').click();
        await f.page.locator("#settings-json").fill(JSON.stringify({ entries: [{ name: "Imported", text: "", imageUrl: "../logo.png" }] }));
        await f.page.waitForFunction(() => JSON.parse(document.querySelector('[name="entries"]').value)[0]?.name === "Imported");
        await f.page.evaluate(() => pendingImages[2]("obsolete"));
        assert.equal(JSON.parse(await f.page.locator('[name="entries"]').inputValue())[0].imageUrl, "../logo.png");
      } finally {
        await f.page.close();
      }
    });

    await t.test("downloaded configurator keeps its absolute upload endpoint", async () => {
      const f = await open();
      try {
        await f.page.goto(`${pathToFileURL(path.join(root, "qr/index.html")).href}#configure`);
        await f.page.waitForFunction(() => document.getElementById("overlay-url")?.value);
        await f.page.locator('.image-input input[type="file"]').setInputFiles(f.file());
        await success(f);
        assert.equal(f.calls.length, 1);
        assert.equal(await f.page.locator('[name="logoUrl"]').inputValue(), "https://files.catbox.moe/test.png");
        assert.equal(new URL(await f.page.locator("#overlay-url").inputValue()).protocol, "file:");
      } finally {
        await f.page.close();
      }
    });

    await t.test("row images have independent feedback, serialize once, cancel on removal, and mixed video remains editable", async () => {
      const f = await open("sponsors");
      try {
        const rows = f.page.locator(".entry-row");
        assert.equal(await f.page.locator(".image-input").count(), 2);
        await rows.first().locator('[data-field="name"]').fill("data:display text");
        assert.equal(
          await rows
            .first()
            .locator('[data-field="name"]')
            .evaluate((input) => input.checkValidity()),
          true,
          "Image limits do not validate unrelated row text"
        );
        await f.provider.selectOption("base64");
        await f.picker.setInputFiles(f.file());
        await success(f);
        assert.equal(await rows.nth(1).locator(".image-status").isVisible(), false);
        await f.page.waitForFunction((uri) => JSON.parse(document.querySelector('[name="entries"]').value)[0].imageUrl === uri, `data:image/png;base64,${f.images.png}`);
        const values = JSON.parse(await f.page.locator('[name="entries"]').inputValue());
        assert.deepEqual(Object.keys(values[0]), ["name", "text", "imageUrl"]);
        await rows.nth(1).locator(".image-provider").selectOption("base64");
        await rows
          .nth(1)
          .locator('input[type="file"]')
          .setInputFiles(f.file("png", Buffer.alloc(16385)));
        assert.equal(await f.status.isVisible(), true);
        await rows.nth(1).locator(".image-status.text-danger").waitFor();
        await rows.first().locator('[data-action="remove"]').click();
        await f.page.waitForFunction(() => document.querySelectorAll(".entry-row").length === 1);
        assert.equal(await rows.first().locator(".image-status.text-danger").isVisible(), true);
        await f.page.locator('[type="reset"][form="overlay-form"]').click();
        await f.page.waitForFunction(() => document.querySelectorAll(".entry-row").length === 2);
        assert.equal(await f.page.locator(".image-status:not([hidden])").count(), 0);
        await f.page.locator('[data-settings-view="json"]').click();
        const imported = { entries: [{ name: "Image", text: "", imageUrl: `data:image/png;base64,${Buffer.concat([f.file().buffer, Buffer.alloc(17000)]).toString("base64")}` }] };
        await f.page.locator("#settings-json").fill(JSON.stringify(imported));
        await f.page.waitForFunction(() => document.querySelector('[name="entries"]').getAttribute("aria-invalid") === "true");
        assert.equal(await f.page.locator("#overlay-url").inputValue(), "");
        imported.entries[0].imageUrl = `data:image/png;base64,${f.images.png}`;
        await f.page.locator("#settings-json").fill(JSON.stringify(imported));
        await f.page.waitForFunction(() => document.getElementById("overlay-url").value);
        await f.page.locator('[data-settings-view="form"]').click();
        assert.equal(await f.page.locator(".image-provider").isEnabled(), true);
        await f.page.evaluate(() => {
          const native = window.fetch;
          window.fetch = (url, options) =>
            url === "https://stream.byuwur.co/upload_image.php"
              ? new Promise((resolve) => {
                  window.releaseRemovedImage = () => resolve(new Response("https://files.catbox.moe/removed.png"));
                })
              : native(url, options);
        });
        await f.page.locator(".image-provider").selectOption("catbox");
        await f.page.locator('.image-input input[type="file"]').setInputFiles(f.file());
        await f.page.waitForFunction(() => window.releaseRemovedImage);
        await rows.first().locator('[data-action="remove"]').click();
        await f.page.waitForFunction(() => document.querySelectorAll(".entry-row").length === 0);
        await f.page.evaluate(async () => {
          releaseRemovedImage();
          await Promise.resolve();
          await Promise.resolve();
        });
        assert.equal(await f.page.locator(".image-status:not([hidden])").count(), 0);
        assert.equal(await f.page.locator('[name="entries"]').inputValue(), "[]");
      } finally {
        await f.page.close();
      }
      const main = await open("main");
      try {
        const background = main.page.locator('[name="backgroundUrl"]').locator("..");
        assert.equal(await background.locator(".image-actions").isHidden(), false);
        await main.page.selectOption('[name="backgroundType"]', "video");
        assert.equal(await background.locator(".image-actions").isHidden(), true);
        await main.page.locator('[name="backgroundUrl"]').fill("https://example.com/video.webm");
        await main.page.waitForFunction(() => new URL(document.getElementById("overlay-url").value).searchParams.get("backgroundUrl") === "https://example.com/video.webm");
        await main.page.selectOption('[name="backgroundType"]', "image");
        assert.equal(await background.locator(".image-actions").isHidden(), false);
        assert.equal(await main.page.locator('[name="backgroundUrl"]').inputValue(), "https://example.com/video.webm");
      } finally {
        await main.page.close();
      }
    });
  } finally {
    await browser.close();
  }
});

test("platform assets and navigation follow both hosting roots", async (t) => {
  const assets = await loadAssets(editorAssets);
  const browser = await chromium.launch(launchOptions);
  try {
    for (const base of ["https://stream.byuwur.co/", "https://byuwur.github.io/stream.html/"]) {
      await t.test(base, async () => {
        const page = await browser.newPage();
        try {
          await serve(page, assets, false, base);
          const controller = new URL("controller/", base).href;
          let resumeCSS;
          const heldCSS = new Promise((resolve) => {
            resumeCSS = resolve;
          });
          const stylesheet = [...assets.keys()].find((url) => url.endsWith("/css/bootstrap.min.css"));
          const cssRequested = page.waitForRequest(stylesheet);
          await page.route(stylesheet, async (route) => {
            await heldCSS;
            await route.fallback();
          });
          let resumeJS;
          const heldJS = new Promise((resolve) => {
            resumeJS = resolve;
          });
          const script = [...assets.keys()].find((url) => url.endsWith("/js/jquery.min.js"));
          const jsRequested = page.waitForRequest(script);
          await page.route(script, async (route) => {
            await heldJS;
            await route.fallback();
          });
          const pageNavigation = page.goto(base);
          pageNavigation.catch(() => {});
          await cssRequested;
          await page.locator("body").waitFor({ state: "attached" });
          const visibilityBeforeStyles = await page.locator("body").evaluate((body) => getComputedStyle(body).visibility);
          const opacityBeforeStyles = await page.locator("html").evaluate((root) => getComputedStyle(root).opacity);
          resumeCSS();
          await jsRequested;
          assert.equal(await page.locator("body").evaluate((body) => getComputedStyle(body).visibility), "visible", "Styled landing content is visible before JavaScript finishes");
          resumeJS();
          await pageNavigation;
          assert.equal(visibilityBeforeStyles, "visible", "Landing content stays visible while stylesheets load");
          assert.equal(opacityBeforeStyles, "1", "Startup does not force page transparency");
          // DOMContentLoaded does not wait for dynamically loaded SPA styles and scripts.
          await page.evaluate(() => spaReady);
          assert.equal(await page.evaluate(() => document.characterSet), "UTF-8");
          assert.equal(await page.evaluate(() => byCommon.CTA_BONYUR_BANK.rare.messages.includes("Hágale pues")), true, "Shared CTA text preserves accented characters");
          const filtered = await page.evaluate(() => {
            const search = document.getElementById("tool-search");
            const gallery = document.querySelector(".home-tools");
            const original = gallery.firstElementChild;
            search.value = "clock";
            search.dispatchEvent(new Event("input", { bubbles: true }));
            return {
              animated: gallery.getAnimations().length > 0,
              visible: [...gallery.querySelectorAll(".home-tool:not([hidden])")].every((card) => card.textContent.toLocaleLowerCase().includes("clock")),
              preserved: gallery.firstElementChild === original
            };
          });
          assert.deepEqual(filtered, { animated: true, visible: true, preserved: true });
          await page.evaluate(() => {
            document.documentElement.classList.add("no-motion");
            const search = document.getElementById("tool-search");
            search.value = "";
            search.dispatchEvent(new Event("input", { bubbles: true }));
          });
          assert.equal(await page.locator(".home-tools").evaluate((gallery) => gallery.getAnimations().length), 0, "Disabling motion still updates the catalog immediately");
          await page.evaluate(() => document.documentElement.classList.remove("no-motion"));
          await page.locator('a[href="' + controller + '"]').click();
          await page.locator("form[data-configurator] [name]").first().waitFor();
          assert.equal(page.url(), controller);
          assert.equal(await page.locator('link[rel="icon"]').getAttribute("href"), "../stream.html.png");
          assert.equal(await page.locator('link[rel="canonical"]').getAttribute("href"), "https://stream.byuwur.co/controller/");
          const logo = page.locator(".home-link img");
          assert.equal(await logo.getAttribute("src"), new URL("stream.html.png", base).href);
          await logo.evaluate((image) => image.decode());
          assert.equal(await page.locator(".home-link").getAttribute("href"), base);
          assert.equal(new URL(await page.locator("#overlay-url").inputValue()).pathname, new URL(controller).pathname);
          await page.locator("#tool-picker").selectOption("clock");
          await page.waitForURL(new URL("clock/", base).href);
          await page.locator("form[data-configurator] [name]").first().waitFor();
          await page.locator(".home-link").click();
          await page.waitForURL(base);
          await page.locator('a[href="' + controller + '"]').waitFor();
        } finally {
          await page.close();
        }
      });
    }
  } finally {
    await browser.close();
  }
});
