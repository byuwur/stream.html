import { unzipSync } from "fflate";
import assert from "node:assert/strict";
import * as fs from "node:fs/promises";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";
import { SPA_HOST, config, dependencyReader, dist, hosted, root } from "../scripts/build.mjs";

const assetDir = path.join(dist, "assets");
const manifest = JSON.parse(await fs.readFile(path.join(assetDir, "manifest.json"), "utf8"));
const dependencies = await dependencyReader();
const contentTypes = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg"
};
const options = {
  channel: process.env.BROWSER_CHANNEL || undefined,
  executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || undefined
};

test("generated distributions initialize with application networks blocked", { timeout: 300000 }, async (t) => {
  const packages = new Map();
  for (const asset of manifest.assets.filter((item) => item.resource === "controller" && item.file.endsWith(".zip"))) packages.set(asset.file, unzipSync(await fs.readFile(path.join(assetDir, asset.file))));
  const server = http.createServer(async (request, response) => {
    try {
      let pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
      if (pathname.endsWith("/")) pathname += "index.html";
      let body;
      if (pathname.startsWith("/packages/")) {
        const [, , archive, ...parts] = pathname.split("/");
        body = packages.get(archive)?.[parts.join("/")];
      } else {
        const file = path.resolve(assetDir, `.${pathname}`);
        if (path.dirname(file) === path.resolve(assetDir)) body = await fs.readFile(file);
      }
      response.writeHead(body ? 200 : 404, {
        "content-type": contentTypes[path.extname(pathname)] || "application/octet-stream"
      });
      response.end(body || "Not found");
    } catch {
      response.writeHead(404);
      response.end();
    }
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch(options);
  try {
    async function pageFor(format, id, context = browser) {
      const page = await context.newPage();
      page.setDefaultTimeout(15000);
      const errors = [],
        unexpected = [],
        svgRequests = [],
        warnings = [];
      page.on("pageerror", (error) => errors.push(error.message));
      page.on("console", (message) => {
        if (message.type() === "warning" && message.text().includes("configurator is not included")) warnings.push(message.text());
      });
      await page.route("**/*", async (route) => {
        const url = new URL(route.request().url());
        if (url.origin === origin || url.protocol === "file:") return route.continue();
        const cdn = `https://cdn.jsdelivr.net/gh/${config.repository}@${manifest.tag}/`;
        if (url.href.startsWith(cdn)) {
          const relative = decodeURIComponent(url.pathname.slice(new URL(cdn).pathname.length));
          if (Object.values(config.dynamicDependencies).some((entry) => relative.startsWith(`${entry.directory}/`) && relative.endsWith(entry.extension))) {
            svgRequests.push(url.href);
            return route.fulfill({
              body: await fs.readFile(path.join(root, relative)),
              contentType: "image/svg+xml"
            });
          }
          if (format === "online")
            return route.fulfill({
              body: await fs.readFile(path.join(root, relative)),
              contentType: contentTypes[path.extname(relative)]
            });
        }
        if (format === "online" && url.href.startsWith(`${SPA_HOST}/`) && !config.externalStyles.includes(url.href)) {
          return route.fulfill({
            body: await dependencies.read(url),
            contentType: contentTypes[path.extname(url.pathname)]
          });
        }
        if (["script", "stylesheet"].includes(route.request().resourceType()) && !config.externalStyles.includes(url.href) && url.hostname !== "fonts.googleapis.com") unexpected.push(url.href);
        return route.abort();
      });
      return { page, errors, unexpected, svgRequests, warnings };
    }

    async function ready(page, overlay) {
      await page.waitForFunction((expected) => !!window.byStreamResource && window.byStreamOverlay === expected, overlay);
      if (overlay) assert.ok(await page.locator("html[data-overlay]").count());
      else {
        await page.locator("form[data-configurator] [name]").first().waitFor({ state: "attached" });
        await page.waitForFunction(() => !!document.querySelector("#overlay-url")?.value);
        await page.frameLocator("#overlay-preview").locator("html[data-overlay]").waitFor({ state: "attached" });
        assert.ok(await page.evaluate(() => [...document.querySelectorAll("[data-editor-style]")].every((style) => style.media === "all")));
      }
    }

    for (const resource of manifest.resources) {
      for (const asset of manifest.assets.filter((item) => item.resource === resource.id && ["online", "standalone", "bundle", "embedded", "full-embedded"].includes(item.format))) {
        const format = asset.format;
        await t.test(`${resource.id}.${format}`, async () => {
          const { page, errors, unexpected, warnings, svgRequests } = await pageFor(format, resource.id);
          try {
            const file = `${origin}/${asset.file}`;
            // ===== BROWSER INTERACTIONS =====
            await page.goto(file);
            const standalone = ["standalone", "embedded"].includes(format);
            await ready(page, standalone);
            const url = standalone ? await page.evaluate(() => byStream.settingsURL(byStreamResource, byStreamResource.settings).href) : await page.locator("#overlay-url").inputValue();
            assert.equal(new URL(url).pathname, new URL(file).pathname);
            // Startup is checked for every artifact; shared editor/URL behavior needs one resource per format.
            if (resource.id === "clock") {
              const defaults = await page.evaluate(() => Object.fromEntries(byStream.settingsURL(byStreamResource, byStreamResource.settings).searchParams));
              await page.goto(url);
              await ready(page, true);
              assert.equal(await page.evaluate(() => typeof window.jQuery), "undefined", "Overlay mode must not initialize editor dependencies");
              assert.deepEqual(await page.evaluate(() => Object.fromEntries(byStream.settingsURL(byStreamResource, byStreamResource.settings).searchParams)), defaults);
              if (standalone) {
                const before = page.url();
                await Promise.all([
                  page.waitForEvent("console", {
                    predicate: (message) => message.type() === "warning" && message.text().includes("configurator is not included")
                  }),
                  page.keyboard.press("F2")
                ]);
                assert.equal(page.url(), before);
                assert.ok(warnings[0].includes(`Configure this resource online: ${hosted}`));
                assert.equal(await page.locator("#configurator, #configurator-assets, #configurator-warning").count(), 0);
              } else {
                await page.keyboard.press("F2");
                await ready(page, false);
                assert.equal(new URL(page.url()).hash, "#configure");
                await page.locator("body").click({ position: { x: 5, y: 5 } });
                await page.keyboard.press("F2");
                await ready(page, true);
              }
            }
            assert.deepEqual(unexpected, [], "Unexpected application library requests");
            assert.deepEqual(errors, []);
            if (["embedded", "full-embedded"].includes(format)) assert.deepEqual(svgRequests, [], "Embedded resources must use inline artwork");
          } finally {
            await page.close();
          }
        });
      }
    }

    await t.test("portable resources in one directory keep independent preferences", async () => {
      const context = await browser.newContext();
      const { page, errors, unexpected } = await pageFor("bundle", "clock", context);
      try {
        await page.goto(`${origin}/clock.bundle.html`);
        await ready(page, false);
        await page.locator('[name="animate"]').uncheck();
        await page.waitForFunction(() => new URL(document.getElementById("overlay-url").value).searchParams.get("animate") === "no");
        await page.goto(`${origin}/timer.bundle.html`);
        await ready(page, false);
        assert.equal(await page.locator('[name="animate"]').isChecked(), true);
        await page.goto(`${origin}/clock.bundle.html`);
        await ready(page, false);
        assert.equal(await page.locator('[name="animate"]').isChecked(), false);
        assert.deepEqual(errors, []);
        assert.deepEqual(unexpected, []);
      } finally {
        await context.close();
      }
    });

    for (const archive of packages.keys()) {
      await t.test(archive, async () => {
        const { page, errors, svgRequests, unexpected } = await pageFor("packaged", "controller");
        try {
          await page.goto(`${origin}/packages/${archive}/controller/index.html`);
          await ready(page, archive.includes("standalone"));
          const models = await page.evaluate(() => Object.keys(byControllerArtwork.skins));
          for (const file of (await fs.readdir(path.join(root, "controller/controllers"))).filter((file) => file.endsWith(".svg"))) assert.ok(models.includes(path.basename(file, ".svg")), `Missing model: ${file}`);
          await page.evaluate(() => {
            for (const id of Object.keys(byControllerArtwork.skins)) {
              const mount = document.createElement("div");
              mount.innerHTML = byControllerArtwork.render(id, "minimal", "letters", "original", "release-test").markup;
              if (!mount.querySelector("svg")) throw new Error(`Model did not render: ${id}`);
            }
          });
          for (const model of ["xseries", "ds5", "fgc", "fgc6", "fgc4", "steamdeck"]) {
            await page.goto(`${origin}/packages/${archive}/controller/index.html?player=1&skin=${model}&customColors=yes&controllerColor=123456`);
            await ready(page, true);
            await page.locator("#gamepads .controller svg").first().waitFor({ state: "attached" });
            assert.equal(await page.evaluate(() => byStreamResource.settings.skin), model);
            assert.equal(await page.evaluate(() => byStreamResource.settings.controllerColor), "#123456");
          }
          assert.deepEqual(svgRequests, [], "Packaged controller must not fetch CDN artwork");
          assert.deepEqual(unexpected, []);
          assert.deepEqual(errors, []);
        } finally {
          await page.close();
        }
      });
    }

    for (const asset of manifest.assets.filter((item) => item.file.endsWith(".zip"))) {
      await t.test(`extracted ${asset.file} opens directly from disk`, async () => {
        const directory = await fs.mkdtemp(path.join(os.tmpdir(), "stream-release-zip-file-"));
        const entries = unzipSync(await fs.readFile(path.join(assetDir, asset.file)));
        for (const [file, bytes] of Object.entries(entries)) {
          assert.ok(!path.isAbsolute(file) && !file.split("/").includes(".."));
          const target = path.join(directory, file);
          await fs.mkdir(path.dirname(target), { recursive: true });
          await fs.writeFile(target, bytes);
        }
        const { page, errors, unexpected } = await pageFor("packaged", asset.resource);
        const requests = [];
        page.on("request", (request) => {
          if (new URL(request.url()).pathname.endsWith(".svg")) requests.push(request.url());
        });
        try {
          const entry = pathToFileURL(path.join(directory, asset.resource, "index.html")).href;
          await page.goto(entry);
          await ready(page, asset.format === "standalone-zip");
          const url = await page.evaluate(() => byStream.settingsURL(byStreamResource, byStreamResource.settings).href);
          assert.equal(new URL(url).protocol, "file:");
          await page.goto(url);
          await ready(page, true);
          await page
            .locator(asset.resource === "controller" ? "#gamepads .controller svg" : "#keyboard svg path")
            .first()
            .waitFor({ state: "attached" });
          if (asset.format === "full-zip") {
            await page.keyboard.press("F2");
            await ready(page, false);
          }
          assert.deepEqual(requests, [], "Opening a ZIP locally must not fetch SVG files");
          assert.deepEqual(errors, []);
          assert.deepEqual(unexpected, []);
        } finally {
          await page.close();
          await fs.rm(directory, { recursive: true, force: true });
        }
      });
    }

    await t.test("downloaded full and standalone HTML retain file URLs and render offline", async () => {
      const directory = await fs.mkdtemp(path.join(os.tmpdir(), "stream-release-file-"));
      for (const asset of manifest.assets.filter((item) => (item.resource === "clock" && ["bundle", "standalone"].includes(item.format)) || ["embedded", "full-embedded"].includes(item.format))) {
        const target = path.join(directory, asset.file);
        await fs.copyFile(path.join(assetDir, asset.file), target);
        const { page, errors, unexpected, svgRequests } = await pageFor(asset.format, asset.resource);
        try {
          await page.goto(pathToFileURL(target).href);
          await ready(page, ["standalone", "embedded"].includes(asset.format));
          const url = await page.evaluate(() => byStream.settingsURL(byStreamResource, byStreamResource.settings).href);
          assert.ok(url.startsWith(pathToFileURL(target).href));
          await page.goto(url);
          await ready(page, true);
          assert.deepEqual(errors, []);
          assert.deepEqual(unexpected, []);
          if (["embedded", "full-embedded"].includes(asset.format)) {
            await page
              .locator(asset.resource === "controller" ? "#gamepads .controller svg" : "#keyboard svg path")
              .first()
              .waitFor({ state: "attached" });
            assert.deepEqual(svgRequests, [], "Downloaded embedded resources must use inline artwork");
            if (asset.format === "full-embedded") {
              await page.keyboard.press("F2");
              await ready(page, false);
            }
          }
        } finally {
          await page.close();
          await fs.unlink(target);
        }
      }
      await fs.rmdir(directory);
    });
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
});
