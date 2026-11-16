/*
 * File: __tests__/inputs.cjs
 * Desc: Core physical input transitions and interrupted-hold cleanup.
 */
const assert = require("node:assert/strict");
const test = require("node:test");
const { runtimeAssets, launchBrowser, loadAssets, serve } = require("./browser.cjs");

test("keyboard and mouse reflect presses, releases, and interrupted holds", { timeout: 30000 }, async (t) => {
  const assets = await loadAssets(runtimeAssets);
  const browser = await launchBrowser();
  t.after(() => browser.close());
  const page = await browser.newPage();
  page.setDefaultTimeout(5000);
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await serve(page, assets, true);
  await page.goto("https://stream.test/keyboard/?mode=both&showHistory=yes");
  await page.locator('#keyboard-overlay[data-ready="yes"]').waitFor();
  await page.keyboard.down("KeyW");
  assert.equal(await page.locator('#keyboard [data-code="KeyW"].pressed').count(), 1);
  await page.keyboard.up("KeyW");
  assert.equal(await page.locator("#keyboard .pressed").count(), 0);
  await page.mouse.down({ button: "left" });
  assert.equal(await page.locator('#mouse [data-code="Mouse0"].pressed').count(), 1);
  await page.mouse.up({ button: "left" });
  assert.equal(await page.locator("#mouse .pressed").count(), 0);
  await page.keyboard.down("KeyW");
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  assert.equal(await page.locator("#keyboard .pressed, #mouse .pressed").count(), 0);
  assert.ok(await page.locator(".history-entry").count() > 0);
  assert.deepEqual(errors, []);
});
