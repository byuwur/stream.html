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

test("configurator smoke", { timeout: 30000 }, async (t) => {
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
      await page.goto("https://stream.test/controller/?skin=ds5&player=9#configure");
      await page.waitForFunction(() => !!document.getElementById("overlay-url")?.value);
      const url = await page.locator("#overlay-url").inputValue();
      assert.equal(new URL(url).searchParams.get("skin"), "ds5");
      await page.goto(url);
      await page.locator("#gamepads .controller svg").first().waitFor({ state: "attached" });
      assert.equal(await page.evaluate(() => byStreamResource.settings.skin), "ds5");
      assert.deepEqual(errors, []);
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
