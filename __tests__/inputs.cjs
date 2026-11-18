/*
 * File: __tests__/inputs.cjs
 * Desc: Core physical input transitions and interrupted-hold cleanup.
 */
const assert = require("node:assert/strict");
const test = require("node:test");
const { runtimeAssets, launchBrowser, loadAssets, serve } = require("./browser.cjs");
const coreOnly = process.env.STREAM_CORE_ONLY === "1";

/** Read actual feedback styles without changing the controller's input state. */
function feedbackStyle(control) {
  return {
    fill: getComputedStyle(control.querySelector(".button-face, .gcn-face, .button-detail.stock-plastic")).fill,
    filter: getComputedStyle(control).filter,
    transform: getComputedStyle(control.querySelector(".press-visual")).transform
  };
}

test("focused input overlays cancel browser defaults while preserving controls and F2", { timeout: 30000 }, async (t) => {
  const assets = await loadAssets(runtimeAssets);
  const browser = await launchBrowser();
  t.after(() => browser.close());
  for (const path of ["keyboard/?mode=hidden", "controller/?player=1"]) {
    // F2 reloads the overlay. Give each resource its own page.
    const page = await browser.newPage();
    await serve(page, assets);
    await page.goto(`https://stream.test/${path}`);
    await page.locator('#keyboard-overlay[data-ready="yes"], #gamepads .controller').waitFor();
    const defaults = await page.evaluate(() => {
      const options = { bubbles: true, cancelable: true };
      const events = () => [
        new KeyboardEvent("keydown", { ...options, key: "F5", code: "F5" }),
        new KeyboardEvent("keydown", { ...options, key: "r", code: "KeyR", ctrlKey: true }),
        new KeyboardEvent("keydown", { ...options, key: "ArrowLeft", code: "ArrowLeft", altKey: true }),
        new KeyboardEvent("keyup", { ...options, key: "F5", code: "F5" }),
        ...["mousedown", "mouseup", "auxclick"].map((type) => new MouseEvent(type, { ...options, button: 3 })),
        new MouseEvent("contextmenu", { ...options, button: 2 }),
        new WheelEvent("wheel", { ...options, deltaY: 100 })
      ];
      const allowed = () =>
        events()
          .filter((event) => document.body.dispatchEvent(event))
          .map((event) => event.key || event.type);
      const focused = allowed();
      Object.defineProperty(document, "hasFocus", { configurable: true, value: () => false });
      const unfocused = allowed();
      delete document.hasFocus;
      return { focused, unfocused };
    });
    assert.deepEqual(defaults.focused, [], path);
    assert.deepEqual(defaults.unfocused, ["F5", "r", "ArrowLeft", "F5", "mousedown", "mouseup", "auxclick", "contextmenu", "wheel"], path);

    await page.evaluate(() => document.body.append(document.createElement("input")));
    const input = page.locator("body > input");
    await input.focus();
    await input.press("x");
    assert.equal(await input.inputValue(), "x");
    await input.evaluate((node) => node.remove());

    await page.keyboard.press("F2");
    await page.waitForURL((url) => url.hash === "#configure");
    await page.close();
  }
});

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
  // A host may deliver input to the window even when the document reports no focus.
  for (const focused of [true, false]) {
    const forwarded = await page.evaluate((focused) => {
      Object.defineProperty(document, "hasFocus", { configurable: true, value: () => focused });
      const key = (type) => new KeyboardEvent(type, { code: "KeyW", key: "w", cancelable: true });
      const mouse = (type) => new MouseEvent(type, { button: 0, cancelable: true });
      const allowed = [window.dispatchEvent(key("keydown")), window.dispatchEvent(mouse("mousedown"))];
      const pressed = document.querySelectorAll("#keyboard .pressed, #mouse .pressed").length;
      window.dispatchEvent(key("keyup"));
      window.dispatchEvent(mouse("mouseup"));
      const released = document.querySelectorAll("#keyboard .pressed, #mouse .pressed").length;
      delete document.hasFocus;
      return { allowed, pressed, released };
    }, focused);
    assert.deepEqual(forwarded, { allowed: [!focused, !focused], pressed: 2, released: 0 });
  }
  await page.keyboard.down("KeyW");
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  assert.equal(await page.locator("#keyboard .pressed, #mouse .pressed").count(), 0);
  assert.ok((await page.locator(".history-entry").count()) > 0);
  assert.deepEqual(errors, []);
});

test("gaming layouts close empty rows and columns while retaining keyboard geometry", { skip: coreOnly, timeout: 30000 }, async (t) => {
  const assets = await loadAssets(runtimeAssets);
  const browser = await launchBrowser();
  t.after(() => browser.close());
  const page = await browser.newPage();
  await serve(page, assets, true);

  async function layout(query) {
    await page.goto(`https://stream.test/keyboard/?mode=keyboard&${query}`);
    await page.locator('#keyboard-overlay[data-ready="yes"]').waitFor();
    return page.locator("#keyboard > svg").evaluate((board) => {
      const keys = Object.fromEntries([...board.querySelectorAll("[data-code]")].map((key) => [key.dataset.code, Object.fromEntries(["x", "y", "width", "height"].map((name) => [name, Number(key.getAttribute(name))]))]));
      return { width: board.viewBox.baseVal.width, keys };
    });
  }

  const fps = await layout("layout=fps");
  const { ControlLeft, AltLeft, Space, KeyQ, KeyA } = fps.keys;
  assert.ok(AltLeft.x - (ControlLeft.x + ControlLeft.width) < KeyA.width / 2);
  assert.ok(Space.width > KeyA.width * 2 && Space.width < KeyA.width * 4);
  assert.ok(KeyQ.x < KeyA.x, "typing rows remain staggered");

  const moba = await layout("layout=moba");
  assert.equal(moba.keys.ShiftLeft.y, moba.keys.Space.y, "a lone Shift joins the modifier row");
  const league = await layout("layout=lol");
  assert.ok(league.keys.Space.y - league.keys.KeyA.y < league.keys.KeyA.height * 1.5, "no empty letter row");

  const platformer = await layout("layout=platformer");
  const arrows = platformer.keys;
  assert.ok(platformer.width < arrows.ArrowLeft.width * 9, "letter keys and arrows fit on one compact board");
  assert.equal(arrows.ArrowUp.x, arrows.ArrowDown.x);
  assert.equal(arrows.ArrowLeft.y, arrows.ArrowDown.y);
  assert.ok(arrows.ArrowUp.y < arrows.ArrowDown.y);

  const fighting = await layout("layout=fighting&standard=iso");
  assert.ok(fighting.width < fighting.keys.KeyA.width * 10);
  assert.ok(fighting.keys.Enter.height > fighting.keys.KeyA.height * 2);
  assert.ok(fighting.keys.Enter.x >= fighting.keys.KeyL.x + fighting.keys.KeyL.width);
  const denseFighting = await layout("layout=fighting&standard=iso&layoutDensity=compact");
  assert.ok(denseFighting.width < fighting.width);
  assert.ok(denseFighting.keys.Space.width < fighting.keys.Space.width);
  for (const { keys } of [fighting, denseFighting]) {
    for (const [upper, lower] of [
      ["KeyU", "KeyJ"],
      ["KeyI", "KeyK"],
      ["KeyO", "KeyL"]
    ]) {
      assert.equal(keys[upper].x, keys[lower].x);
      assert.ok(keys[upper].y < keys[lower].y);
    }
  }

  const full = await layout("layout=full");
  assert.ok(full.keys.Space.width > Space.width);
  assert.ok(full.keys.Numpad1.x > full.keys.ArrowRight.x);
  const denseFull = await layout("layout=full&layoutDensity=compact");
  assert.ok(denseFull.width < full.width);
  assert.deepEqual(Object.keys(denseFull.keys), Object.keys(full.keys));
  const letterGap = ({ keys }) => keys.KeyW.x - (keys.KeyQ.x + keys.KeyQ.width);
  assert.equal(letterGap(denseFull), letterGap(full) / 2);
  assert.equal(denseFull.keys.NumpadAdd.x, denseFull.keys.NumpadEnter.x);
  assert.equal(denseFull.keys.ArrowDown.x, denseFull.keys.ArrowUp.x);
  const sparse = await layout(`layout=full&layoutDensity=compact&displayedKeys=${encodeURIComponent('["Escape","KeyA","Numpad1"]')}`);
  assert.ok(sparse.width < sparse.keys.KeyA.width * 4);
  assert.ok(sparse.keys.Numpad1.y < sparse.keys.KeyA.height * 3);
});

test("vertical histories keep combinations and repeat counts on one line", { skip: coreOnly, timeout: 30000 }, async (t) => {
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

test("Controller feedback presses immediately and releases smoothly in full and minimal layouts", { skip: coreOnly, timeout: 60000 }, async (t) => {
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
