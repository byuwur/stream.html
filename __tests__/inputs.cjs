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
  assert.ok((await page.locator(".history-entry").count()) > 0);
  assert.deepEqual(errors, []);
});

test("vertical histories keep combinations and repeat counts on one line", { timeout: 30000 }, async (t) => {
  const assets = await loadAssets(runtimeAssets);
  const browser = await launchBrowser();
  t.after(() => browser.close());
  const page = await browser.newPage();
  await serve(page, assets, true);
  await page.goto("https://stream.test/keyboard/?mode=hidden&showHistory=yes&historyOrientation=vertical&animate=no");
  await page.locator('#keyboard-overlay[data-ready="yes"]').waitFor();
  await page.keyboard.down("Control");
  await page.keyboard.press("KeyE");
  await page.keyboard.up("Control");
  const combo = page.locator(".history-entry").filter({ hasText: "+" }).first();
  await combo.waitFor();
  const prompts = await combo.locator(".history-prompt").all();
  assert.equal(prompts.length, 2);
  const [first, second] = await Promise.all(prompts.map((prompt) => prompt.boundingBox()));
  assert.ok(Math.abs(first.y + first.height / 2 - second.y - second.height / 2) < 2);
  assert.ok(second.x >= first.x + first.width);
  await page.keyboard.press("KeyW");
  await page.keyboard.press("KeyW");
  const repeated = page.locator(".history-entry").filter({ hasText: "×2" });
  await repeated.waitFor();
  const symbol = await repeated.locator(".history-prompt").boundingBox();
  const count = await repeated.locator(".history-count").boundingBox();
  assert.ok(count.x >= symbol.x + symbol.width);
  assert.ok(Math.abs(count.y + count.height / 2 - symbol.y - symbol.height / 2) < 2);
});

test("Controller history has no player label and stops when multiple players mount", { timeout: 30000 }, async (t) => {
  const assets = await loadAssets(runtimeAssets);
  const browser = await launchBrowser();
  t.after(() => browser.close());
  const page = await browser.newPage();
  page.setDefaultTimeout(5000);
  await page.addInitScript(() => {
    window.testPads = [];
    Object.defineProperty(navigator, "getGamepads", { value: () => window.testPads });
  });
  await serve(page, assets, true);
  await page.goto("https://stream.test/controller/?player=all&showHistory=yes&animate=no");
  await page.locator("#gamepads .controller").waitFor();
  await page.keyboard.down("KeyJ");
  await page.locator(".history-entry").waitFor();
  await page.keyboard.up("KeyJ");
  assert.equal(await page.locator(".history-entry small").count(), 0);
  assert.equal(await page.locator("#gamepads .controller").count(), 1);
  await page.evaluate(() => {
    window.testPads = [{ id: "Synthetic gamepad", index: 0, connected: true, buttons: Array.from({ length: 18 }, () => ({ value: 0, pressed: false })), axes: [0, 0, 0, 0] }];
  });
  await page.waitForFunction(() => document.querySelectorAll("#gamepads .controller").length === 2);
  assert.equal(await page.locator(".input-history").count(), 0);
  await page.keyboard.press("KeyJ");
  assert.equal(await page.locator(".history-entry").count(), 0);
  await page.evaluate(() => {
    window.testPads = [];
  });
  await page.waitForFunction(() => document.querySelectorAll("#gamepads .controller").length === 1);
  await page.locator(".input-history").waitFor();
  await page.keyboard.down("KeyJ");
  await page.locator(".history-entry").waitFor();
  await page.keyboard.up("KeyJ");
  await page.goto("https://stream.test/controller/?player=all-gamepads&showHistory=yes");
  await page.waitForFunction(() => document.querySelectorAll("#gamepads .controller").length === 8);
  assert.equal(await page.locator(".input-history").count(), 0);
});
