/*
 * File: __tests__/inputs.cjs
 * Desc: Core physical input transitions and interrupted-hold cleanup.
 */
const assert = require("node:assert/strict");
const test = require("node:test");
const { runtimeAssets, launchBrowser, loadAssets, serve } = require("./browser.cjs");

/** Read actual feedback styles without changing the controller's input state. */
function feedbackStyle(control) {
  return {
    fill: getComputedStyle(control.querySelector(".button-face, .gcn-face, .button-detail.stock-plastic")).fill,
    filter: getComputedStyle(control).filter,
    transform: getComputedStyle(control.querySelector(".press-visual")).transform
  };
}

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

test("Controller feedback presses immediately and releases smoothly in full and minimal layouts", { timeout: 60000 }, async (t) => {
  const assets = await loadAssets(runtimeAssets);
  const browser = await launchBrowser();
  t.after(() => browser.close());
  const page = await browser.newPage();
  page.setDefaultTimeout(5000);
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await serve(page, assets, true);
  for (const [skin, layout] of [
    ["xseries", "full"],
    ["xseries", "minimal"],
    ["fgc", "full"],
    ["gcn", "minimal"]
  ]) {
    for (const effect of ["invert", "fill", "depth", "glow"]) {
      await page.goto(`https://stream.test/controller/?player=9&skin=${skin}&layout=${layout}&pressEffect=${effect}&releaseDuration=500&shellAppearance=solid&tintControls=yes&controllerColor=70dd52`);
      const control = page.locator('.control[data-input="button:0"]');
      await control.waitFor({ state: "attached" });
      const original = await control.evaluate(feedbackStyle);
      await page.keyboard.down("KeyJ");
      await page.waitForFunction(() => document.querySelector('.control[data-input="button:0"]').classList.contains("pressed"));
      const pressed = await control.evaluate(feedbackStyle);
      if (effect === "invert") assert.equal(pressed.filter, "invert(1)");
      else assert.equal(pressed.fill, "rgb(153, 0, 0)", `${skin}/${layout}/${effect} overrides the optional control tint`);
      assert.equal(pressed.transform === "none", effect !== "depth");
      assert.equal(pressed.filter.includes("drop-shadow"), effect === "glow");
      await page.keyboard.up("KeyJ");
      await page.waitForFunction(() => !document.querySelector('.control[data-input="button:0"]').classList.contains("pressed"));
      const transitions = await control.evaluate(async (element) => {
        const animations = element.getAnimations({ subtree: true });
        const durations = animations.map((animation) => animation.effect.getTiming().duration);
        for (const animation of animations) animation.finish();
        await Promise.all(animations.map((animation) => animation.finished));
        return durations;
      });
      assert.ok(transitions.length > 0, `${skin}/${layout}/${effect} has a release transition`);
      assert.ok(transitions.every((duration) => duration === 500));
      assert.deepEqual(await control.evaluate(feedbackStyle), original, "Release restores the authored/tinted appearance");
    }
  }
  assert.deepEqual(errors, []);
});

test("Controller feedback preserves trigger pressure and stick transforms with Animate on or off", { timeout: 30000 }, async (t) => {
  const assets = await loadAssets(runtimeAssets);
  const browser = await launchBrowser();
  t.after(() => browser.close());
  const page = await browser.newPage();
  page.setDefaultTimeout(5000);
  await page.addInitScript(() => {
    window.testPad = { id: "Synthetic gamepad", index: 0, connected: true, buttons: Array.from({ length: 18 }, () => ({ value: 0, pressed: false })), axes: [0, 0, 0, 0] };
    Object.defineProperty(navigator, "getGamepads", { value: () => [window.testPad] });
  });
  await serve(page, assets, true);
  for (const layout of ["full", "minimal"]) {
    for (const animate of ["yes", "no"]) {
      await page.goto(`https://stream.test/controller/?player=1&layout=${layout}&pressEffect=depth&releaseDuration=500&curve=1&animate=${animate}`);
      const trigger = page.locator('.analog-trigger[data-input="button:6"]');
      const stick = page.locator('.stick[data-input="button:10"]');
      await trigger.waitFor({ state: "attached" });
      const base = await trigger
        .locator(".button-face")
        .first()
        .evaluate((element) => getComputedStyle(element).fill);
      await page.evaluate(() => {
        testPad.buttons[6] = { value: 0.5, pressed: true };
        testPad.buttons[10] = { value: 1, pressed: true };
        testPad.axes[0] = 0.75;
      });
      await page.waitForFunction(() => document.querySelector('.stick[data-input="button:10"]').classList.contains("pressed"));
      const pressure = await trigger.evaluate((element) => {
        const rect = element.querySelector(".trigger-fill-rect");
        const box = element.querySelector(".trigger-active").getBBox();
        return element.dataset.layout === "minimal" ? rect.width.baseVal.value / box.width : rect.height.baseVal.value / box.height;
      });
      assert.ok(pressure > 0.45 && pressure < 0.55, `${layout} retains half pressure`);
      assert.equal(
        await trigger
          .locator(".button-face")
          .first()
          .evaluate((element) => getComputedStyle(element).fill),
        base
      );
      const held = await stick.evaluate(feedbackStyle);
      assert.equal(held.fill, "rgb(153, 0, 0)");
      assert.equal(held.transform === "none", animate === "no");
      const position = await stick.evaluate((element) => ({ translate: element.style.translate, transform: element.style.transform }));
      assert.notEqual(position.translate, "0px 0px");
      assert.ok(position.transform.includes("rotateY"));
      await page.evaluate(() => {
        testPad.buttons[6] = testPad.buttons[10] = { value: 0, pressed: false };
      });
      await page.waitForFunction(() => !document.querySelector('.stick[data-input="button:10"]').classList.contains("pressed"));
      assert.deepEqual(await stick.evaluate((element) => ({ translate: element.style.translate, transform: element.style.transform })), position, "Click release keeps analog travel and curving");
      if (animate === "no") {
        assert.equal(await stick.evaluate((element) => element.getAnimations({ subtree: true }).length), 0);
        assert.equal(await trigger.evaluate((element) => element.querySelector(".trigger-fill-rect")[element.dataset.layout === "minimal" ? "width" : "height"].baseVal.value), 0);
      }
    }
  }
});
