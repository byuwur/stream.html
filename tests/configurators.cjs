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
          assert.equal(await page.locator('[name="animate"]').isChecked(), true, name + " enables resource animation by default");
          if (["schedule", "info"].includes(name)) assert.equal(await page.locator('[name="widthMode"]').isChecked(), true, name + " fills width by default");
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
        assert.equal(await page.locator('[name="outlineWidth"]').getAttribute("type"), "range");
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
        assert.equal(shared.searchParams.has("guideImage"), false);
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

    await t.test("controller variants list supported palettes, reset on Skin edits, and preserve imports and Reset", async () => {
      const page = await browser.newPage();
      try {
        await serve(page, assets);
        await page.goto("https://stream.test/controller/?skin=ds2&variant=silver&player=9#configure");
        await page.waitForFunction(() => document.getElementById("overlay-url")?.value);
        const variant = page.locator('[name="variant"]');
        const options = () => variant.locator("option").evaluateAll((nodes) => nodes.map((node) => [node.value, node.textContent]));
        const waitSettings = (skin, variant) => page.waitForFunction(([skin, variant]) => byStreamResource.settings.skin === skin && byStreamResource.settings.variant === variant, [skin, variant]);
        assert.deepEqual(await options(), [
          ["original", "Default"],
          ["silver", "Silver"],
          ["white", "White"]
        ]);
        assert.equal(await variant.inputValue(), "silver", "Opening links retain their explicit palette");
        await variant.selectOption("white");
        await waitSettings("ds2", "white");
        await page.locator("#skin-input").selectOption("xone");
        await waitSettings("xone", "original");
        assert.deepEqual(await options(), [
          ["original", "Default"],
          ["white", "White"],
          ["red", "Red"]
        ]);
        assert.equal(new URL(await page.locator("#overlay-url").inputValue()).searchParams.has("variant"), false, "Changing Skin resets even a palette supported by both models");

        const choices = await page.evaluate(() =>
          Object.entries(byControllerArtwork.skins).map(([id, skin]) => {
            jQuery("#skin-input").val(id).trigger("change");
            const select = document.querySelector('[name="variant"]');
            return { id, variants: skin.variants, options: [...select.options].map((node) => [node.value, node.textContent]), disabled: [...select.options].some((node) => node.disabled), value: select.value };
          })
        );
        for (const choice of choices) {
          assert.deepEqual(choice.options, [["original", "Default"], ...Object.entries(choice.variants)], choice.id);
          assert.equal(choice.disabled, false, `${choice.id} has no unavailable options`);
          assert.equal(choice.value, "original", `${choice.id} resets to Default`);
        }

        await page.locator("#overlay-url").fill("https://stream.test/controller/?skin=gcn&variant=indigo&player=9");
        await page.locator("#overlay-url").press("Enter");
        await waitSettings("gcn", "indigo");
        assert.equal(await variant.inputValue(), "indigo", "URL imports can select palettes absent from the previous skin");
        await page.frameLocator("#overlay-preview").locator('.controller-background[data-controller="gcn"][data-variant="indigo"]').waitFor();
        await page.locator('label:has([name="variant"]) .select2-selection').click();
        assert.deepEqual(await page.locator('.select2-results__option[role="option"]').allTextContents(), ["Default", "Indigo", "Silver", "White"]);
        assert.equal(await page.locator(".select2-results__option--disabled").count(), 0);
        await page.keyboard.press("Escape");

        await page.locator('[data-settings-view="json"]').click();
        await page.locator("#settings-json").fill(JSON.stringify({ skin: "joycon", variant: "neon", player: "9" }));
        await page.locator("#settings-json").press("Tab");
        await waitSettings("joycon", "neon");
        assert.deepEqual(await options(), [
          ["original", "Default"],
          ["neon", "Neon"]
        ]);
        assert.equal(await variant.inputValue(), "neon", "JSON imports retain explicit palettes");
        await page.locator('[data-settings-view="form"]').click();
        await page.locator('button[type="reset"][form="overlay-form"]').click();
        await waitSettings("ds2", "silver");
        assert.deepEqual(await options(), [
          ["original", "Default"],
          ["silver", "Silver"],
          ["white", "White"]
        ]);
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
        assert.deepEqual(await page.locator("#player-input option").evaluateAll((nodes) => nodes.map((node) => node.value)), ["1", "2", "3", "4", "5", "6", "7", "8", "9", "gamepads", "all"]);
        assert.deepEqual(await page.locator("#player-input option").evaluateAll((nodes) => nodes.slice(-3).map((node) => node.textContent)), ["Keyboard", "All connected", "All connected + Keyboard"]);
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
        assert.equal(await page.locator('.mapping-record[data-slot="primary"]').first().textContent(), "Listening\u2026", "Releasing an already-held input is ignored");
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
