/**
 * @file Validate and measure the default [EXPERIMENTAL] embedded Controller release asset.
 * Run npm --prefix .github run release:experiment after the normal tagged/local build.
 * Compare packaged HTTP rendering with downloaded file:// rendering, including artwork and input.
 * Record warm-sample timing and JavaScript heap measurements in dist/experimental/report.json.
 * BROWSER_CHANNEL or CHROMIUM_EXECUTABLE_PATH selects the installed Chromium browser.
 */
import { unzipSync } from "fflate";
import assert from "node:assert/strict";
import * as fs from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";
import { dist } from "../scripts/build.mjs";

const candidate = path.join(dist, "assets", "controller.standalone.embedded.html");
const manifest = JSON.parse(await fs.readFile(path.join(dist, "assets", "manifest.json"), "utf8"));
const archive = manifest.assets.find((asset) => asset.resource === "controller" && asset.format === "standalone-zip");
const entries = unzipSync(await fs.readFile(path.join(dist, "assets", archive.file)));
const artwork = Object.entries(entries).filter(([file]) => file.endsWith(".svg"));
const sizes = { htmlBytes: (await fs.stat(candidate)).size, artworkBytes: artwork.reduce((sum, [, bytes]) => sum + bytes.length, 0), artworkCount: artwork.length };
const server = http.createServer((request, response) => {
  const pathname = new URL(request.url, "http://localhost").pathname.slice(1);
  const body = entries[pathname];
  response.writeHead(body ? 200 : 404, { "content-type": pathname.endsWith(".svg") ? "image/svg+xml" : "text/html" });
  response.end(body || "Not found");
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || undefined, executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || undefined });
const report = { browser: browser.version(), experimental: true, sizes, measurements: {} };
try {
  for (const mode of ["packaged", "embedded"]) {
    const samples = [];
    for (let iteration = 0; iteration < 4; iteration++) {
      const page = await browser.newPage();
      const errors = [],
        svgRequests = [];
      page.on("pageerror", (error) => errors.push(error.message));
      page.on("request", (request) => {
        if (request.url().endsWith(".svg")) svgRequests.push(request.url());
      });
      await page.route("https://**", (route) => route.abort());
      await page.addInitScript(() => {
        window.testPad = { id: "Release experiment", index: 0, buttons: Array.from({ length: 40 }, () => ({ value: 0 })), axes: [0, 0, 0, 0] };
        Object.defineProperty(navigator, "getGamepads", { value: () => [testPad] });
      });
      const url = mode === "embedded" ? pathToFileURL(candidate).href : `http://127.0.0.1:${server.address().port}/controller/index.html`;
      const session = await page.context().newCDPSession(page);
      await session.send("Performance.enable");
      const start = performance.now();
      await page.goto(url);
      await page.waitForFunction(() => !!window.byStreamResource && !!document.querySelector(".controller.active:not(.disconnected) svg"));
      const initializedMs = performance.now() - start;
      const switching = await page.evaluate(() => {
        const times = [];
        for (const id of Object.keys(byControllerArtwork.skins)) {
          const start = performance.now();
          const result = byControllerArtwork.render(id, "minimal", "letters", "original", "experiment");
          const mount = document.createElement("div");
          mount.innerHTML = result.markup;
          if (!mount.querySelector("svg")) throw new Error(`Missing artwork for ${id}`);
          times.push(performance.now() - start);
        }
        return times;
      });
      assert.ok(switching.length >= 32, "All controller models must be available");
      await page.evaluate(() => {
        testPad.buttons[0].value = 1;
      });
      await page.waitForFunction(() => !!document.querySelector(".control.pressed"));
      await page.evaluate(() => {
        testPad.buttons[0].value = 0;
      });
      await page.waitForFunction(() => !document.querySelector(".control.pressed"));
      const metrics = Object.fromEntries((await session.send("Performance.getMetrics")).metrics.map((item) => [item.name, item.value]));
      const parse = await page.evaluate(() => {
        const navigation = performance.getEntriesByType("navigation")[0];
        return { domContentLoadedMs: navigation.domContentLoadedEventEnd - navigation.startTime, domInteractiveMs: navigation.domInteractive - navigation.startTime };
      });
      if (iteration)
        samples.push({ initializedMs, ...parse, allModelsRenderMs: switching.reduce((sum, value) => sum + value, 0), maxModelRenderMs: Math.max(...switching), jsHeapBytes: metrics.JSHeapUsedSize, scriptSeconds: metrics.ScriptDuration });
      assert.deepEqual(errors, []);
      if (mode === "embedded") assert.deepEqual(svgRequests, [], "Embedded artwork must not fetch SVGs");
      await page.goto(`${url}?player=9&skin=fgc6&customColors=yes&controllerColor=123456`);
      await page.waitForFunction(() => window.byStreamResource?.settings.skin === "fgc6");
      assert.equal(await page.evaluate(() => byStreamResource.settings.controllerColor), "#123456");
      await page.keyboard.down("j");
      assert.equal(await page.evaluate(() => bySettingsKB.buttons[0]), 1);
      await page.keyboard.up("j");
      await page.close();
    }
    report.measurements[mode] = Object.fromEntries(Object.keys(samples[0]).map((key) => [key, samples.map((sample) => sample[key]).sort((a, b) => a - b)[1]]));
  }
  report.assessment =
    "Correctness passed in Chromium, including downloaded file:// embedded use, all model artwork, customization, synthetic gamepad input and keyboard input. Timings are medians of three warm samples after one warmup; model timings measure the existing artwork renderer, not end-user navigation. JS heap excludes browser-native SVG memory. OBS and other engines were not tested. The release download table marks this distribution [EXPERIMENTAL].";
  await fs.mkdir(path.join(dist, "experimental"), { recursive: true });
  await fs.writeFile(path.join(dist, "experimental", "sizes.json"), `${JSON.stringify(sizes, null, 2)}\n`);
  await fs.writeFile(path.join(dist, "experimental", "report.json"), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
