/*
 * File: __tests__/configurators.cjs
 * Desc: Small host smoke checks; standalone renderer contracts live in resources.cjs.
 */
const assert = require("node:assert/strict");
const test = require("node:test");
const { runtimeAssets, launchBrowser, loadAssets, serve } = require("./browser.cjs");

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

test("configurator smoke", { timeout: 60000 }, async (t) => {
  const assets = await loadAssets(editorAssets);
  const browser = await launchBrowser();
  t.after(() => browser.close());

  await t.test("editing text updates the preview and generated overlay", async () => {
    const page = await browser.newPage();
    page.setDefaultTimeout(5000);
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    try {
      await serve(page, assets);
      await page.goto("https://stream.test/watermark/?text=Opening#configure");
      const field = page.locator('form[data-configurator] [name="text"]');
      await field.fill("HOST_SMOKE");
      await field.dispatchEvent("change");
      await page.waitForFunction(() => new URL(document.getElementById("overlay-url").value).searchParams.get("text") === "HOST_SMOKE");
      await page.frameLocator("#overlay-preview").locator(".primary", { hasText: "HOST_SMOKE" }).waitFor();
      await page.goto(await page.locator("#overlay-url").inputValue());
      await page.locator("#overlay .primary", { hasText: "HOST_SMOKE" }).waitFor();
      assert.equal(await page.locator("form[data-configurator]").count(), 0);
      assert.deepEqual(errors, []);
    } finally {
      await page.close();
    }
  });

  await t.test("controller settings produce a working renderer URL", async () => {
    const page = await browser.newPage();
    page.setDefaultTimeout(5000);
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    try {
      await serve(page, assets);
      const parameters = new URLSearchParams({
        skin: "ds5",
        player: "9",
        customGuide: "yes",
        guideSource: "image",
        guideImage: "../stream.html.png",
        guideColorMode: "tint",
        guideTintColor: "#70dd52",
        guideTintStrength: "65",
        guideBlendMode: "soft-light",
        pressEffect: "depth",
        releaseDuration: "180"
      });
      await page.goto(`https://stream.test/controller/?${parameters}#configure`);
      await page.waitForFunction(() => !!document.getElementById("overlay-url")?.value);
      const effect = page.locator('[name="pressEffect"]');
      const release = page.locator('[name="releaseDuration"]');
      assert.deepEqual(await effect.locator("option").allTextContents(), ["Fill", "Invert", "Fill + depth", "Fill + glow"]);
      assert.equal(await effect.inputValue(), "depth");
      await page.locator('[name="animate"]').uncheck();
      await page.waitForFunction(() => document.querySelector('[name="releaseDuration"]').disabled);
      assert.equal(await release.inputValue(), "180");
      await page.locator('[name="animate"]').check();
      await page.waitForFunction(() => !document.querySelector('[name="releaseDuration"]').disabled);
      const mode = page.locator('form[data-configurator] [name="guideColorMode"]');
      const strength = page.locator('form[data-configurator] [name="guideTintStrength"]');
      assert.equal(await strength.isDisabled(), false, "Guide tint is independent of shell appearance");
      await mode.selectOption("original", { force: true });
      await page.waitForFunction(() => !new URL(document.getElementById("overlay-url").value).searchParams.has("guideTintStrength"));
      assert.equal(await strength.isDisabled(), true);
      await mode.selectOption("tint", { force: true });
      await page.waitForFunction(() => new URL(document.getElementById("overlay-url").value).searchParams.get("guideTintStrength") === "65");
      const url = await page.locator("#overlay-url").inputValue();
      assert.equal(new URL(url).searchParams.get("skin"), "ds5");
      assert.equal(new URL(url).searchParams.get("guideTintColor"), "70dd52");
      assert.equal(new URL(url).searchParams.get("guideBlendMode"), "soft-light");
      assert.equal(new URL(url).searchParams.get("pressEffect"), "depth");
      assert.equal(new URL(url).searchParams.get("releaseDuration"), "180");
      await page.frameLocator("#overlay-preview").locator('filter[id$="-logo-tint"]').waitFor({ state: "attached" });
      await page.goto(url);
      await page.locator("#gamepads .controller svg").first().waitFor({ state: "attached" });
      assert.equal(await page.evaluate(() => byStreamResource.settings.skin), "ds5");
      assert.equal(await page.locator(".controller").getAttribute("data-effect"), "depth");
      assert.equal(await page.locator(".controller").evaluate((element) => element.style.getPropertyValue("--release")), "180ms");
      await page.locator(".guide-logo-custom").waitFor();
      assert.equal(await page.locator('filter[id$="-logo-tint"] feBlend').getAttribute("mode"), "soft-light");
      assert.deepEqual(errors, []);
    } finally {
      await page.close();
    }
  });

  await t.test("decimal controls, rotation limits, color-field clicks, and short sliders share the canonical fields", async () => {
    const page = await browser.newPage();
    page.setDefaultTimeout(5000);
    try {
      await serve(page, assets);
      await page.goto("https://stream.test/controller/?player=9&shellAppearance=image&shellImage=../stream.html.png#configure");
      await page.waitForFunction(() => !!document.getElementById("overlay-url")?.value);
      const outline = page.locator('[name="outlineWidth"]');
      assert.equal(await page.locator('[name="customColors"]').count(), 0);
      assert.deepEqual(await page.locator('[name="shellAppearance"] option').allTextContents(), ["Off", "Solid color", "Image"]);
      const slider = page.locator('[data-number-field="outlineWidth"]');
      assert.equal(await outline.getAttribute("step"), "0.1");
      assert.equal(await slider.getAttribute("step"), "0.1");
      await outline.evaluate((input) => {
        for (const group of input.closest("form").querySelectorAll(".collapse")) group.classList.add("show");
      });
      await outline.fill("1");
      await outline.press("ArrowUp");
      assert.equal(await outline.inputValue(), "1.1");
      await slider.press("ArrowRight");
      assert.equal(await outline.inputValue(), "1.2");
      for (const name of ["rotation", "shellRotation"]) {
        const range = page.locator(`[data-number-field="${name}"]`);
        assert.equal(await range.getAttribute("min"), "0");
        assert.equal(await range.getAttribute("max"), "360");
      }
      const color = page.locator('[name="backgroundColor"]');
      await color.click();
      await page.locator(".pcr-app.visible").waitFor();
      await color.fill("#12345678");
      await page.waitForFunction(() => new URL(document.getElementById("overlay-url").value).searchParams.get("backgroundColor") === "12345678");

      await page.goto("https://stream.test/controller/?player=9&skin=gcn&highlightIntensity=10#configure");
      const shadows = page.locator('[data-number-field="shadowIntensity"]');
      await shadows.waitFor({ state: "attached" });
      await shadows.evaluate((input) => {
        for (const group of input.closest("form").querySelectorAll(".collapse")) group.classList.add("show");
      });
      assert.equal(await shadows.isVisible(), true);
      assert.equal(await shadows.isEnabled(), true);
      await shadows.press("End");
      await page.waitForFunction(() => new URL(document.getElementById("overlay-url").value).searchParams.get("shadowIntensity") === "100");
      const previewShadow = page.frameLocator("#overlay-preview").locator(".controller-background .shell-shadow");
      await previewShadow.waitFor({ state: "attached" });
      assert.equal(await previewShadow.evaluate((element) => getComputedStyle(element).opacity), "1");

      await page.goto("https://stream.test/popup/?pauseTime=3#configure");
      const seconds = page.locator('[name="pauseTime"]');
      const secondsRange = page.locator('[data-number-field="pauseTime"]');
      await seconds.waitFor({ state: "attached" });
      await seconds.evaluate((input) => {
        for (const group of input.closest("form").querySelectorAll(".collapse")) group.classList.add("show");
      });
      assert.equal(await secondsRange.getAttribute("max"), "60");
      assert.equal(await seconds.getAttribute("max"), "3600");
      await seconds.fill("240");
      await seconds.dispatchEvent("change");
      await page.waitForFunction(() => new URL(document.getElementById("overlay-url").value).searchParams.get("pauseTime") === "240");
      assert.equal(await seconds.inputValue(), "240");
      assert.equal(await secondsRange.inputValue(), "60");
      await seconds.fill("999999");
      await seconds.dispatchEvent("change");
      await page.waitForFunction(() => document.querySelector('[name="pauseTime"]').value === "3600");
      await seconds.fill("-1");
      await seconds.dispatchEvent("change");
      await page.waitForFunction(() => document.querySelector('[name="pauseTime"]').value === "0");
      await page.locator('[data-settings-view="json"]').click();
      const json = page.locator("#settings-json");
      await json.fill('{"pauseTime":999999}');
      await page.waitForFunction(() => new URL(document.getElementById("overlay-url").value).searchParams.get("pauseTime") === "3600");
      await json.fill('{"toString":1}');
      await page.locator("#json-error", { hasText: "Unknown setting: toString" }).waitFor();
    } finally {
      await page.close();
    }
  });

  await t.test("keyboard image choices and Main component fields stay in their owning groups", async () => {
    const page = await browser.newPage();
    page.setDefaultTimeout(5000);
    try {
      await serve(page, assets);
      await page.goto("https://stream.test/keyboard/?mode=keyboard&imageTarget=all#configure");
      const image = page.locator('[name="imageUrl"]');
      await image.waitFor({ state: "attached" });
      assert.equal(await page.locator('[name="shellImage"], [name="keyImage"]').count(), 0);
      const choices = page.locator('[name="imageTarget"] + .choice-buttons button');
      assert.deepEqual(await choices.allTextContents(), ["Off", "Shell", "Keys", "All"]);
      const density = page.locator('[name="layoutDensity"]');
      assert.equal(await density.inputValue(), "regular");
      assert.equal(await density.evaluate((input) => input.closest("[data-config-section]").dataset.configSection), "Appearance");
      const densityChoices = page.locator('[name="layoutDensity"] + .choice-buttons button');
      assert.deepEqual(await densityChoices.allTextContents(), ["Regular", "Compact"]);
      await densityChoices.filter({ hasText: "Compact" }).click();
      await page.waitForFunction(() => new URL(document.getElementById("overlay-url").value).searchParams.get("layoutDensity") === "compact");
      await page.locator('[data-settings-view="json"]').click();
      await page.locator("#settings-json").fill('{"mode":"keyboard","imageTarget":"both","shellImage":"../stream.html.png","imageTint":"monochrome"}');
      await page.waitForFunction(() => document.querySelector('[name="imageUrl"]').value === "../stream.html.png" && document.querySelector('[name="imageTarget"]').value === "all");
      assert.equal(await density.inputValue(), "regular");
      assert.equal(await page.locator('[name="imageBlendMode"]').inputValue(), "fill");
      await page.goto("https://stream.test/main/?displayCountdown=yes&displaySocial=yes&displaySchedule=yes&displayLabels=yes#configure");
      await page.locator('[name="socialPosition"]').waitFor({ state: "attached" });
      assert.equal(await page.locator('[name="countdownRight"], [name="updatesLeft"], [name="eventsBottom"]').count(), 0);
      assert.equal(await page.locator('[name="socialHeadingFontSize"]').evaluate((input) => input.closest("[data-config-section]").dataset.configSection), "Social accounts");
      assert.equal(await page.locator('[name="countdownFontSize"]').evaluate((input) => input.closest("[data-config-section]").dataset.configSection), "Countdown");
    } finally {
      await page.close();
    }
  });

  await t.test("Manual and Base64 browse and drop work locally with hosted uploads disabled", async () => {
    const page = await browser.newPage();
    page.setDefaultTimeout(5000);
    try {
      await serve(page, assets);
      let requests = 0;
      await page.route(/https:\/\/(?:stream\.byuwur\.co\/upload_image\.php|(?:[^/]+\.)?catbox\.moe\/)/, (route) => {
        requests++;
        return route.abort();
      });
      await page.goto("https://stream.test/watermark/?kind=logo#configure");
      const field = page.locator('form[data-configurator] [name="logoUrl"]');
      const component = field.locator("..");
      const provider = component.locator(".image-provider");
      const picker = component.locator('input[type="file"]');
      await picker.waitFor({ state: "attached" });
      assert.deepEqual(await provider.locator("option").evaluateAll((options) => options.map((option) => option.value)), ["manual", "base64"]);
      const encoded = await page.evaluate(() => {
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = 2;
        return canvas.toDataURL("image/png").split(",")[1];
      });
      const image = { name: "image.png", mimeType: "image/png", buffer: Buffer.from(encoded, "base64") };
      const value = `data:image/png;base64,${encoded}`;
      await picker.setInputFiles([]);
      assert.equal(await provider.inputValue(), "manual");
      await picker.setInputFiles(image);
      await page.waitForFunction((value) => document.querySelector('[name="logoUrl"]').value === value, value);
      assert.equal(await provider.inputValue(), "base64");
      await field.fill("manual.png");
      assert.equal(await provider.inputValue(), "manual");
      await component.evaluate((element, encoded) => {
        const transfer = new DataTransfer();
        transfer.items.add(new File([Uint8Array.from(atob(encoded), (character) => character.charCodeAt(0))], "image.png", { type: "image/png" }));
        element.dispatchEvent(new DragEvent("drop", { bubbles: true, cancelable: true, dataTransfer: transfer }));
      }, encoded);
      await page.waitForFunction((value) => document.querySelector('[name="logoUrl"]').value === value, value);
      await picker.setInputFiles({ ...image, buffer: Buffer.concat([image.buffer, Buffer.alloc(16384)]) });
      await component.locator(".image-status.text-danger").waitFor();
      assert.match(await component.locator(".image-status").textContent(), /smaller image or a manual URL/);
      assert.equal(await field.inputValue(), value);
      assert.equal(requests, 0, "Browse, drop, and conversion never send an upload request");
    } finally {
      await page.close();
    }
  });

  await t.test("configured image hosts log the endpoint status and full response and preserve the previous value on failure", async () => {
    const page = await browser.newPage();
    page.setDefaultTimeout(5000);
    try {
      await serve(page, assets);
      await page.addInitScript(() => {
        window.byConfigurator = { imageOptions: { providers: [{ id: "custom", name: "Custom host" }] } };
        window.uploadFailures = [];
        const report = console.error;
        console.error = (...args) => {
          if (args[0] === "Image upload failed:") window.uploadFailures.push({ message: args[1].message, details: args[2] });
          report(...args);
        };
      });
      await page.goto("https://stream.test/watermark/?kind=logo#configure");
      const field = page.locator('form[data-configurator] [name="logoUrl"]');
      const component = field.locator("..");
      const picker = component.locator('input[type="file"]');
      await picker.waitFor({ state: "attached" });
      await component.locator(".image-provider").selectOption("custom");
      const previous = await field.inputValue();
      const buffer = Buffer.from(
        await page.evaluate(() => {
          const canvas = document.createElement("canvas");
          canvas.width = canvas.height = 2;
          return canvas.toDataURL("image/png").split(",")[1];
        }),
        "base64"
      );
      const endpoint = "https://stream.byuwur.co/upload_image.php";
      const imageURL = "https://images.example.test/view?id=upload";
      let reply;
      let requests = 0;
      await page.route(endpoint, (route) => {
        requests++;
        assert.equal(route.request().method(), "POST");
        if (reply.networkError) return route.abort("failed");
        return route.fulfill({
          status: reply.status,
          body: reply.body,
          contentType: "text/plain; charset=utf-8",
          headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Expose-Headers": "X-Upload-Diagnostic", "X-Upload-Diagnostic": reply.diagnostic }
        });
      });
      await page.route(imageURL, (route) => route.fulfill({ body: buffer, contentType: "image/png" }));
      for (const failure of [
        { status: 412, body: "Invalid uploader.", diagnostic: "transport=0; upstream=412" },
        { status: 502, body: "Upload transport failed (cURL 56): Recv failure\nPartial provider response", diagnostic: "transport=56; upstream=0" },
        { status: 200, body: "<script>window.providerExecuted=true</script>" + "x".repeat(1000), diagnostic: "transport=0; upstream=200" },
        { status: 500, body: "", diagnostic: "transport=0; upstream=500" },
        { networkError: true }
      ]) {
        reply = failure;
        const count = requests + 1;
        await picker.setInputFiles({ name: "image.png", mimeType: "image/png", buffer });
        await page.waitForFunction((count) => window.uploadFailures.length === count, count);
        const logged = await page.evaluate(() => window.uploadFailures.at(-1));
        if (failure.networkError) {
          assert.ok(logged.message, "Transport errors include a diagnostic message");
          assert.equal(logged.details.endpoint, endpoint);
        } else {
          assert.equal(logged.details.endpoint, endpoint);
          assert.equal(logged.details.status, failure.status);
          assert.equal(logged.details.diagnostic, failure.diagnostic);
          assert.equal(logged.details.response, failure.body, "Console diagnostics keep the complete response");
          assert.match(await component.locator(".image-status").textContent(), new RegExp(`HTTP ${failure.status}`));
        }
        assert.equal(await field.inputValue(), previous);
        assert.equal(await page.evaluate(() => window.providerExecuted), undefined);
        assert.equal(await component.locator("script").count(), 0, "Provider markup is displayed as text");
        assert.equal(requests, count, "Failed uploads are never automatically replayed");
      }
      reply = { status: 200, body: imageURL, diagnostic: "" };
      await picker.setInputFiles({ name: "image.png", mimeType: "image/png", buffer });
      await page.waitForFunction((url) => document.querySelector('form[data-configurator] [name="logoUrl"]').value === url, imageURL);
      assert.equal(await page.evaluate(() => window.uploadFailures.length), 5, "Successful uploads do not emit errors");
      assert.match(await component.locator(".image-status").textContent(), /Image uploaded/);
      // Manual edits supersede a pending upload, including its eventual diagnostic logging.
      await page.unroute(endpoint);
      let finish;
      await page.route(endpoint, (route) => {
        finish = () => route.fulfill({ status: 412, body: "Invalid uploader.", headers: { "Access-Control-Allow-Origin": "*" } });
      });
      const pending = page.waitForRequest(endpoint);
      await picker.setInputFiles({ name: "image.png", mimeType: "image/png", buffer });
      await pending;
      await field.fill("manual.png");
      await finish();
      assert.equal(await field.inputValue(), "manual.png");
      assert.equal(await page.evaluate(() => window.uploadFailures.length), 5, "Superseded uploads do not report errors");
    } finally {
      await page.close();
    }
  });
});
