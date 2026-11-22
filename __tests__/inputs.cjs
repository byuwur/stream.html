/*
 * File: __tests__/inputs.cjs
 * Desc: Core physical input transitions and interrupted-hold cleanup.
 */
const assert = require("node:assert/strict");
const test = require("node:test");
const { runtimeAssets, launchBrowser, loadAssets, serve } = require("./browser.cjs");
const coreOnly = process.env.STREAM_CORE_ONLY === "1";

// ===== INPUT SOURCES AND NATIVE SNAPSHOTS =====
test("TBD input demos and same-document native snapshots", { timeout: 60000 }, async (t) => {
  const browser = await launchBrowser();
  t.after(() => browser.close());
  const page = await browser.newPage();
  page.setDefaultTimeout(5000);
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await serve(page, await loadAssets(runtimeAssets), true);
  async function open(path, selector) {
    await page.goto("https://stream.test/" + path);
    await page.locator(selector).first().waitFor({ state: "attached" });
  }
  const send = (channel, seq, state) => page.evaluate((packet) => byStream.receiveNative(packet), { version: 1, channel, seq, state });
  const key = (seq, ...keys) => send("keyboard", seq, { keys });
  const count = () => page.locator("output").textContent();

  await t.test("counter counts physical edges, preserves its number across disconnect and expiry", async () => {
    await open("counter/?layout=flip&animate=no&source=helper&start=-1&step=2&bounded=yes&minimum=-2&maximum=2&resetKey=KeyR", "output");
    await page.clock.install();
    await page.keyboard.press("F9");
    await key(0, "F9");
    await key(1, "F9");
    assert.equal(await count(), "-1");
    await key(2);
    assert.equal(await key(3, "F9", "F10"), true);
    assert.equal(await count(), "-1");
    await key(4);
    await key(5, "F9");
    assert.equal(await count(), "1");
    assert.equal(await key(4), false, "An old release cannot rearm the key");
    await send("reset");
    await key(0, "F9");
    assert.equal(await count(), "1");
    await key(1);
    await key(2, "F9");
    assert.equal(await count(), "2");
    await page.clock.fastForward(5100);
    await key(0, "F10");
    assert.equal(await count(), "2", "Recovery treats held keys as the baseline");
    await key(1);
    await key(2, "F10");
    assert.equal(await count(), "0");
    await key(3, "KeyR", "F9");
    assert.equal(await count(), "-1");
    await page.reload();
    assert.equal(await count(), "-1");

    await open("counter/?animate=no&source=helper&increase=Ctrl%2BShift%2BKeyK&decrease=F9&resetKey=KeyA%2BKeyB", "output");
    await key(0, "ControlRight", "ShiftLeft", "KeyK");
    await key(1, "ControlRight", "ShiftLeft");
    await key(2, "ControlRight", "ShiftLeft", "KeyK");
    await key(3, "ControlRight", "ShiftLeft", "KeyK");
    assert.equal(await count(), "1");
    await key(4, "KeyA");
    await key(5, "KeyA", "KeyB", "F9");
    assert.equal(await count(), "0");

    await open("counter/?start=3&resetKey=KeyR&animate=no", "output");
    await page.keyboard.down("F9");
    await page.keyboard.down("F9");
    await page.keyboard.up("F9");
    assert.equal(await count(), "4");
    await page.keyboard.press("Control+F9");
    assert.equal(await count(), "4");
    await page.evaluate(() => document.body.append(document.createElement("input")));
    await page.locator("input").focus();
    await page.keyboard.press("F9");
    assert.equal(await count(), "4");
    await page.locator("input").evaluate((node) => node.remove());
    await page.keyboard.press("KeyR");
    assert.equal(await count(), "3");
    await open("counter/?increase=KeyX&decrease=KeyX", "output");
    await page.keyboard.press("KeyX");
    assert.equal(await count(), "0");
  });

  await t.test("keyboard and mouse diff persistent states and ignore replayed wheel deltas", async () => {
    await open("keyboard/?source=helper&mode=both&showHistory=yes", '#keyboard-overlay[data-ready="yes"]');
    const w = page.locator('#keyboard [data-code="KeyW"].pressed');
    await page.keyboard.down("KeyW");
    assert.equal(await w.count(), 0);
    await page.keyboard.up("KeyW");
    await key(0, "KeyW");
    await page.evaluate(() => window.dispatchEvent(new Event("blur")));
    assert.equal(await w.count(), 1);
    const mouse = { buttons: [0], dx: 0, dy: 0, wheel: 0 };
    await send("mouse", 0, mouse);
    assert.equal(await page.locator('#mouse [data-code="Mouse0"].pressed').count(), 1);
    const scroll = { ...mouse, wheel: 1 };
    assert.equal(await send("mouse", 1, scroll), true);
    const log = await page.locator(".history-entry").allTextContents();
    assert.equal(await send("mouse", 1, scroll), false);
    assert.equal(await send("mouse", 2, { ...mouse, buttons: [9] }), false);
    await send("mouse", 2, mouse);
    await key(1, "KeyW");
    assert.deepEqual(await page.locator(".history-entry").allTextContents(), log);
    await send("reset");
    assert.equal(await page.locator("#keyboard .pressed, #mouse .pressed").count(), 0);
  });

  await t.test("controller snapshots share mapped pressure, keyboard player and release rendering", async () => {
    await page.addInitScript(() =>
      Object.defineProperty(navigator, "getGamepads", {
        value: () => {
          throw Error("Unexpected browser gamepad poll");
        }
      })
    );
    await open("controller/?player=1&source=helper&showHistory=yes", "#gamepads .controller svg");
    const pad = { index: 0, id: "Demo", buttons: [1, 0, 0, 0, 0, 0, 0.6], axes: [0.75, 0] };
    await send("controller", 0, { pads: [pad] });
    assert.equal(await page.locator("#gamepad-1.disconnected").count(), 0);
    const log = await page.locator(".history-entry").allTextContents();
    assert.ok(log.length);
    await page.evaluate(() => window.dispatchEvent(new Event("blur")));
    await send("controller", 1, { pads: [pad] });
    assert.deepEqual(await page.locator(".history-entry").allTextContents(), log);
    assert.equal(await send("controller", 2, { pads: [{ ...pad, axes: [2] }] }), false);
    await send("reset");
    assert.equal(await page.locator("#gamepad-1.disconnected").count(), 1);
    await open("controller/?player=9&source=helper&showHistory=yes", "#gamepad-9 svg");
    await key(0, "KeyJ");
    assert.ok(await page.locator(".history-entry").count());
    await page.clock.fastForward(5100);
    assert.equal(await page.locator("#gamepad-9.disconnected").count(), 1);
  });
  assert.deepEqual(errors, []);
});

/** Read actual feedback styles without changing the controller's input state. */
function feedbackStyle(control) {
  const face = control.querySelector(".button-face, .gcn-face, .button-detail.stock-plastic");
  const bounds = control.querySelector(".press-visual").getBoundingClientRect();
  return {
    width: bounds.width,
    height: bounds.height,
    fill: getComputedStyle(face).fill,
    stroke: getComputedStyle(face).stroke,
    faceFilter: getComputedStyle(face).filter,
    filter: getComputedStyle(control).filter,
    transform: getComputedStyle(control.querySelector(".press-visual")).transform
  };
}

// ===== KEYBOARD AND MOUSE INTERACTION =====
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

  const fighting = await layout("layout=fighting&standard=iso&layoutDensity=regular");
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

  const full = await layout("layout=full&layoutDensity=regular");
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

test("history groups buttons together and centers the repeat count underneath", { skip: coreOnly, timeout: 30000 }, async (t) => {
  const assets = await loadAssets(runtimeAssets);
  const browser = await launchBrowser();
  t.after(() => browser.close());
  const page = await browser.newPage();
  await serve(page, assets, true);
  for (const [tool, orientation, style, order] of [
    ["keyboard", "vertical", "svg", "first"],
    ["keyboard", "horizontal", "text", "last"],
    ["controller", "vertical", "svg", "last"],
    ["controller", "horizontal", "text", "first"]
  ]) {
    await page.goto(`https://stream.test/${tool}/?source=helper&player=1&mode=both&showHistory=yes&historyOrientation=${orientation}&historyStyle=${style}&historyOrder=${order}&historyPadding=8&animate=no`);
    await page
      .locator(tool === "keyboard" ? '#keyboard-overlay[data-ready="yes"]' : "#gamepad-1 svg")
      .first()
      .waitFor({ state: "attached" });
    const device = page.locator(tool === "keyboard" ? "#keyboard > svg" : "#gamepad-1 .controller-background");
    const deviceBefore = await device.boundingBox();
    await page.evaluate((tool) => {
      let seq = 0;
      function press(keys, buttons) {
        const state = tool === "keyboard" ? { keys } : { pads: [{ index: 0, id: "History", buttons, axes: [0, 0, 0, 0] }] };
        byStream.receiveNative({ version: 1, channel: tool, seq: seq++, state });
      }
      press(["ControlLeft", "ShiftLeft", "KeyW", "KeyE"], [1, 1, 0, 0, 1, 0, 1]);
      for (let i = 0; i < 13; i++) {
        press([], []);
        press(["KeyW"], [0, 1]);
      }
    }, tool);
    const combo = page.locator(".history-entry:has(.history-prompt ~ .history-prompt)");
    const prompts = combo.locator(".history-prompt");
    assert.equal(await prompts.count(), 4);
    const separators = combo.getByText("+", { exact: true });
    assert.equal(await separators.count(), tool === "keyboard" ? 3 : 0);
    const buttons = await prompts.evaluateAll((nodes) => nodes.map((node) => node.getBoundingClientRect().toJSON()));
    assert.ok(buttons.every((box, i) => Math.abs(box.y - buttons[0].y) < 2 && (!i || box.x >= buttons[i - 1].right)));
    const repeated = page.locator(".history-entry").filter({ hasText: "×13" });
    const symbol = await repeated.locator(".history-prompt").boundingBox();
    const count = await repeated.locator(".history-count").boundingBox();
    const tray = await page.locator(".input-history").boundingBox();
    assert.ok(count.y >= symbol.y + symbol.height - 1);
    assert.ok(Math.abs(count.x + count.width / 2 - symbol.x - symbol.width / 2) < 2);
    assert.ok(count.height < symbol.height && count.y + count.height <= tray.y + tray.height);
    const parent = await page.locator(".input-history-position").boundingBox();
    const axis = orientation === "horizontal" ? "width" : "height";
    const start = orientation === "horizontal" ? "x" : "y";
    const newest = await repeated.boundingBox();
    const oldest = await combo.boundingBox();
    if (order === "first") {
      assert.ok(newest[start] < oldest[start]);
      assert.ok(Math.abs(newest[start] - tray[start] - 8) <= 1, tool + " newest at start");
    } else {
      assert.ok(newest[start] > oldest[start]);
      assert.ok(Math.abs(tray[start] + tray[axis] - newest[start] - newest[axis] - 8) <= 1, tool + " newest at end");
    }
    assert.equal(tray[axis], parent[axis], tool + " " + orientation);
    assert.deepEqual(await device.boundingBox(), deviceBefore, tool + " stays anchored");
  }
});

// ===== CONTROLLER HISTORY AND FEEDBACK =====
test("input history plays animation in and out on each displaced row", async (t) => {
  const browser = await launchBrowser();
  t.after(() => browser.close());
  const page = await browser.newPage();
  page.setDefaultTimeout(5000);
  await serve(page, await loadAssets(runtimeAssets), true);
  for (const [tool, order] of [
    ["controller", "first"],
    ["keyboard", "last"]
  ]) {
    const query = new URLSearchParams({
      showHistory: "yes",
      historyOrder: order,
      historyStyle: "text",
      historyAggregate: "no",
      historyPadding: "0",
      historyWidth: "0",
      historyHeight: "64",
      historySize: "24",
      "history.entrance": "slideInRight",
      "history.entranceDuration": "1000",
      "history.matchExit": "no",
      "history.exit": "fadeOut",
      "history.exitDuration": "2000",
      "history.exitEasing": "ease-in"
    });
    if (tool === "controller") query.set("player", "9");
    else query.set("mode", "hidden");
    const ready = tool === "keyboard" ? '#keyboard-overlay[data-ready="yes"]' : "#gamepad-9 svg";
    await page.goto(`https://stream.test/${tool}/?${query}`);
    await page.locator(ready).first().waitFor({ state: "attached" });
    await page.locator(".input-history").waitFor({ state: "attached" });
    const firstKey = tool === "controller" ? "Escape" : "Backspace";
    await page.keyboard.down(firstKey);
    await page.locator(".history-entry").waitFor();
    await page.keyboard.up(firstKey);
    const previousWidth = await page.locator(".input-history").evaluate((list) => list.offsetWidth);
    await page.keyboard.down("KeyJ");
    const outgoing = page.locator(".history-entry[data-stream-exiting]");
    await outgoing.waitFor();
    await page.keyboard.up("KeyJ");
    const result = await outgoing.evaluate(async (old, previousWidth) => {
      const list = old.parentElement;
      const fresh = list.querySelector(".history-entry:not([data-stream-exiting])");
      const held = getComputedStyle(fresh).visibility === "hidden" && !fresh.getAnimations().some((animation) => animation.id === "stream-entrance");
      const exit = old.getAnimations().find((animation) => animation.id === "stream-exit");
      const visible = old.offsetTop >= 0 && old.offsetTop + old.offsetHeight <= list.clientHeight;
      const timing = exit.effect.getTiming();
      const stayed = list.offsetWidth === previousWidth;
      exit.finish();
      while (fresh.hasAttribute("data-stream-await-size")) await new Promise(requestAnimationFrame);
      const incoming = fresh.getAnimations().find((animation) => animation.id === "stream-entrance");
      const edgeGap = list.dataset.order === "first" ? fresh.offsetTop : list.clientHeight - fresh.offsetTop - fresh.offsetHeight;
      return [held, stayed, list.offsetWidth < previousWidth, incoming.effect.getTiming().duration, timing.duration, timing.easing, visible, edgeGap];
    }, previousWidth);
    assert.deepEqual(result, [true, true, true, 1000, 2000, "ease-in", true, 0], tool);
    await outgoing.waitFor({ state: "detached" });
    assert.equal(await page.locator(".history-entry").count(), 1);
    const legacy = tool === "controller" ? "slide" : "fade";
    await page.goto(`https://stream.test/${tool}/?showHistory=yes&player=9&mode=hidden&historyAnimation=${legacy}`);
    await page.locator(ready).first().waitFor({ state: "attached" });
    await page.locator(".input-history").waitFor({ state: "attached" });
    await page.keyboard.down("KeyJ");
    await page.waitForFunction(() =>
      document
        .querySelector(".history-entry")
        ?.getAnimations()
        .some((animation) => animation.id === "stream-entrance")
    );
    await page.keyboard.up("KeyJ");
    const saved = await page.evaluate(() => byStream.settingsURL(byStreamResource, byStreamResource.settings).search);
    assert.equal(new URLSearchParams(saved).get("history.entrance"), legacy === "slide" ? "default" : "fadeIn");
    assert.equal(new URLSearchParams(saved).has("historyAnimation"), false);
  }
});

test("Keyboard history appends browser presses and records whole helper chords", { timeout: 30000 }, async (t) => {
  const browser = await launchBrowser();
  t.after(() => browser.close());
  const page = await browser.newPage();
  await serve(page, await loadAssets(runtimeAssets), true);
  const url = "https://stream.test/keyboard/?mode=both&showHistory=yes&historyStyle=svg&historyOrder=last";
  await page.goto(url + "&historyGroupWindow=250");
  await page.locator('#keyboard-overlay[data-ready="yes"]').waitFor();
  const browserChord = await page.evaluate(() => {
    const keys = [..."ABCDEFGHIJKLMNO"].map((letter) => "Key" + letter);
    const key = (code, type) => document.body.dispatchEvent(new KeyboardEvent(type, { code, bubbles: true }));
    key(keys[0], "keydown");
    const first = document.querySelector(".history-prompt");
    for (const code of keys.slice(1)) key(code, "keydown");
    for (const code of keys) key(code, "keyup");
    return [
      first === document.querySelector(".history-prompt"),
      document.querySelectorAll(".history-entry").length,
      document.querySelectorAll(".history-prompt svg").length,
      document.querySelectorAll(".history-separator").length,
      document.querySelectorAll("#keyboard .pressed").length
    ];
  });
  assert.deepEqual(browserChord, [true, 1, 15, 14, 0]);

  await page.goto(url + "&source=helper&historyGroupWindow=0");
  await page.locator('#keyboard-overlay[data-ready="yes"]').waitFor();
  await page.evaluate(async () => {
    let seq = 0;
    const send = (keys) => byStream.receiveNative({ version: 1, channel: "keyboard", seq: seq++, state: { keys } });
    const letters = [..."ABCDEFGHIJKLMNO"].map((letter) => "Key" + letter);
    for (let i = 0; i < 30; i++) {
      const keys = ["ControlLeft", ...letters, i % 2 ? "KeyX" : "KeyY"];
      send(keys);
      send([]);
      await new Promise(requestAnimationFrame);
    }
    send(["KeyX", ...letters.toReversed(), "ControlLeft"]);
    send([]);
  });
  const rows = page.locator(".history-entry");
  assert.ok((await rows.count()) < 30, "the full tray evicts older chords");
  assert.equal(await rows.last().locator(".history-prompt svg").count(), 17);
  assert.equal(await rows.last().locator(".history-separator").count(), 16);
  assert.equal(await rows.last().locator(".history-count").textContent(), "×2");
  assert.equal(await page.locator("#keyboard .pressed").count(), 0);
});

test("Controller records simultaneous gamepad buttons in one row and keeps polling after release", { timeout: 30000 }, async (t) => {
  const browser = await launchBrowser();
  t.after(() => browser.close());
  const page = await browser.newPage();
  page.setDefaultTimeout(5000);
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() => {
    window.testPad = { index: 0, id: "Gamepad", connected: true, axes: [0, 0, 0, 0], buttons: Array(17).fill({ value: 0, pressed: false }) };
    Object.defineProperty(navigator, "getGamepads", { value: () => [testPad] });
  });
  await serve(page, await loadAssets(runtimeAssets), true);
  await page.goto("https://stream.test/controller/?skin=ds5&player=1&showHistory=yes&historyOrder=last&historyGroupWindow=0");
  const controls = page.locator("#gamepad-1");
  const entries = page.locator(".history-entry");
  await controls.locator(".control").first().waitFor({ state: "attached" });
  await page.evaluate(() => testPad.buttons.fill({ value: 1, pressed: true }, 0, 8));
  await controls.locator(".pressed").first().waitFor();
  assert.equal(await entries.count(), 1);
  assert.equal(await entries.locator(".history-prompt svg").count(), 8);
  await page.evaluate(() => testPad.buttons.fill({ value: 0, pressed: false }));
  await controls.locator(".pressed").first().waitFor({ state: "detached" });
  await page.evaluate(() => {
    testPad.buttons[2] = { value: 1, pressed: true };
  });
  await controls.locator('.pressed[data-input="button:2"]').waitFor();
  assert.equal(await entries.count(), 2);
  assert.equal(await entries.last().locator(".history-prompt").count(), 1);
  const bursts = await page.evaluate(async () => {
    const frame = () => new Promise(requestAnimationFrame);
    for (let i = 0; i < 40; i++) {
      testPad.buttons.fill({ value: 0, pressed: false });
      await frame();
      testPad.buttons.fill({ value: 1, pressed: true }, i % 2, 12 + (i % 2));
      await frame();
    }
    await frame();
    const rows = document.querySelectorAll(".history-entry");
    return { rows: rows.length, newest: rows[rows.length - 1].querySelectorAll("svg").length, skinCopies: document.querySelectorAll(".input-history svg :is(style,mask)").length };
  });
  assert.ok(bursts.rows > 1 && bursts.rows < 40, "older chords were evicted from the full tray");
  assert.equal(bursts.newest, 12);
  assert.equal(bursts.skinCopies, 0, "adding prompts must not install additional skin stylesheets or shell masks");
  assert.deepEqual(errors, []);
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
    window.testPads = [
      {
        id: "Synthetic gamepad",
        index: 0,
        connected: true,
        buttons: Array.from({ length: 18 }, () => ({ value: 0, pressed: false })),
        axes: [0, 0, 0, 0]
      }
    ];
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
      if (effect === "invert") {
        const inverted = await control.evaluate((node) => {
          const face = node.querySelector(".invert-face");
          const ctx = document.createElement("canvas").getContext("2d");
          ctx.fillStyle = getComputedStyle(face).fill;
          ctx.fillRect(0, 0, 1, 1);
          return [...ctx.getImageData(0, 0, 1, 1).data].slice(0, 3);
        });
        assert.deepEqual(
          inverted,
          original.fill
            .match(/\d+/g)
            .slice(0, 3)
            .map((value) => 255 - Number(value))
        );
        assert.equal(pressed.filter, "none");
      } else assert.equal(pressed.fill, "rgb(153, 0, 0)", `${skin}/${layout}/${effect} overrides the optional control tint`);
      assert.deepEqual([pressed.transform, pressed.width, pressed.height], [original.transform, original.width, original.height], effect);
      if (effect === "depth") assert.equal(pressed.stroke, "rgb(72, 0, 0)");
      assert.equal(pressed.faceFilter.includes("drop-shadow"), effect === "glow");
      assert.ok(!pressed.filter.includes("drop-shadow"));
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
    window.testPad = {
      id: "Synthetic gamepad",
      index: 0,
      connected: true,
      buttons: Array.from({ length: 18 }, () => ({ value: 0, pressed: false })),
      axes: [0, 0, 0, 0]
    };
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
      assert.equal(held.transform, "none");
      const position = await stick.evaluate((element) => ({
        translate: element.style.translate,
        transform: element.style.transform
      }));
      assert.notEqual(position.translate, "0px 0px");
      assert.ok(position.transform.includes("rotateY"));
      await page.evaluate(() => {
        testPad.buttons[6] = testPad.buttons[10] = { value: 0, pressed: false };
      });
      await page.waitForFunction(() => !document.querySelector('.stick[data-input="button:10"]').classList.contains("pressed"));
      assert.deepEqual(
        await stick.evaluate((element) => ({
          translate: element.style.translate,
          transform: element.style.transform
        })),
        position,
        "Click release keeps analog travel and curving"
      );
      if (animate === "no") {
        assert.equal(await stick.evaluate((element) => element.getAnimations({ subtree: true }).length), 0);
        assert.equal(await trigger.evaluate((element) => element.querySelector(".trigger-fill-rect")[element.dataset.layout === "minimal" ? "width" : "height"].baseVal.value), 0);
      }
    }
  }
});
