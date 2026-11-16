/*
 * File: __tests__/inputs.cjs
 * Desc: Real browser input, Kenney artwork, ephemeral history, and controller integration.
 */
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const test = require("node:test");
const { chromium } = require("playwright");
const { root, runtimeAssets, launchOptions, loadAssets, serve } = require("./browser.cjs");

let browser, assets;
test.before(async () => { assets = await loadAssets(runtimeAssets); browser = await chromium.launch(launchOptions); });
test.after(async () => { await browser?.close(); });

/** Open the actual standalone resource, retaining exceptions and unexpected input requests. */
async function open(query = "mode=both", name = "keyboard", prepare) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.errors = [];
  page.on("pageerror", (error) => page.errors.push(error.message));
  await serve(page, assets, true);
  await prepare?.(page);
  await page.goto(`https://stream.test/${name}/?${query}`);
  await page.waitForFunction(() => window.byStreamResource && window.byStreamOverlay);
  if (name === "keyboard") await page.locator('#keyboard-overlay[data-ready="yes"]').waitFor();
  else await page.locator(".controller.active").first().waitFor();
  return page;
}

/** Press and release real physical keys without an OS auto-repeat sequence. */
async function tap(page, code) {
  await page.keyboard.down(code);
  await page.keyboard.up(code);
}

test("keyboard presets use local SVGs, distinct physical slots, selected legends, and validated settings", async () => {
  const page = await open("mode=both&layout=full");
  try {
    assert.equal(await page.locator("#keyboard .input-key").count(), 104);
    assert.equal(await page.locator(".input-history").count(), 0);
    assert.equal(await page.evaluate(() => typeof byConfigurator), "undefined");
    assert.equal(await page.evaluate(() => getComputedStyle(document.body).backgroundColor), "rgba(0, 0, 0, 0)");
    const results = await page.evaluate(() => Object.keys(byKeyboardLayouts.presets).map((layout) => {
      const slots = byKeyboardLayouts.slots({ ...byStreamResource.settings, layout });
      return { layout, count: slots.length, unique: new Set(slots.map((slot) => slot.code)).size, valid: slots.every((slot) => byKeyboardLayouts.keys[slot.code] && slot.width > 0 && slot.height > 0) };
    }));
    assert.ok(results.length >= 23);
    for (const result of results) {
      assert.ok(result.valid, result.layout);
      assert.equal(result.count, result.unique, result.layout);
      assert.ok(result.count > 0, result.layout);
    }
    assert.ok(results.find((item) => item.layout === "all").count > results.find((item) => item.layout === "full").count);
    assert.deepEqual(await page.evaluate(() => ["windows", "mac", "ansi", "iso", "qwertz", "azerty"].filter((name) => Object.hasOwn(byKeyboardLayouts.presets, name))), []);
    assert.equal(await page.evaluate(() => {
      const settings = byStreamResource.settings;
      const full = new Map(byKeyboardLayouts.slots({ ...settings, layout: "full" }).map((slot) => [slot.code, slot]));
      for (const layout of ["wasd", "modifiers", "fps", "moba", "lol", "dota", "mmo", "racing", "fighting", "platformer", "rhythm", "speedrun", "custom"]) {
        const slots = byKeyboardLayouts.slots({ ...settings, layout });
        const anchor = slots[0], originalAnchor = full.get(anchor.code);
        for (const slot of slots) {
          const original = full.get(slot.code);
          if (slot.x - anchor.x !== original.x - originalAnchor.x || slot.y - anchor.y !== original.y - originalAnchor.y || slot.width !== original.width || slot.height !== original.height) return false;
        }
      }
      return true;
    }), true, "Every gaming preset retains the real keyboard's relative positions and key widths");
    const files = new Set(await fs.readdir(path.join(root, "keyboard/keys")));
    const names = await page.evaluate(() => [...new Set(Object.values(byKeyboardLayouts.keys).map((key) => `${key.asset}.svg`))]);
    for (const name of names) assert.ok(files.has(name), name);
    for (const preset of results) {
      await page.goto(`https://stream.test/keyboard/?mode=keyboard&layout=${preset.layout}`);
      await page.locator('#keyboard-overlay[data-ready="yes"]').waitFor();
      assert.equal(await page.locator("#keyboard .input-key").count(), preset.count, preset.layout);
      assert.equal(await page.locator("#keyboard .input-key use.key-surface").count(), preset.count, `${preset.layout} uses mounted Kenney paths`);
    }
    for (const [variant, code, label] of [["legends=qwertz", "KeyY", "Z"], ["legends=azerty", "KeyQ", "A"], ["platform=mac", "MetaLeft", "L Cmd"], ["standard=iso", "Enter", "Enter"]]) {
      await page.goto(`https://stream.test/keyboard/?mode=keyboard&layout=full&${variant}`);
      await page.locator('#keyboard-overlay[data-ready="yes"]').waitFor();
      assert.equal(await page.locator(`[data-code="${code}"]`).getAttribute("aria-label"), label);
      if (variant === "standard=iso") assert.ok(await page.locator('[data-code="IntlBackslash"]').count());
    }
    await page.goto("https://stream.test/keyboard/?mode=invalid&layout=invalid&keySize=-10&variant=invalid&keyLabels=%7B%22Unknown%22%3A%22bad%22%7D&shellColor=red");
    await page.locator('#keyboard-overlay[data-ready="yes"]').waitFor();
    assert.deepEqual(await page.evaluate(() => {
      const s = byStreamResource.settings;
      return [s.mode, s.layout, s.keySize, s.variant, s.keyLabels, s.shellColor];
    }), ["both", "full", 44, "bonyur", {}, "#111111"]);
    assert.deepEqual(page.errors, []);
  } finally { await page.close(); }
});

test("mounted controls update once per physical transition, clear interrupted holds, and exclude editable text", async () => {
  const page = await open("mode=keyboard&layout=modifiers&showHistory=yes&historyStyle=text");
  try {
    await page.keyboard.down("ShiftLeft");
    await page.keyboard.down("KeyW");
    assert.equal(await page.locator("#keyboard .pressed").count(), 2);
    assert.equal(await page.locator(".history-entry").count(), 1);
    assert.match(await page.locator(".history-entry").innerText(), /L Shift\s*\+\s*W/);
    const mounted = await page.locator('[data-code="KeyW"]').evaluate((node) => { node.dataset.mount = "original"; return node.childElementCount; });
    await page.keyboard.down("KeyW");
    assert.equal(await page.locator(".history-count").innerText(), "");
    await page.keyboard.up("KeyW");
    assert.equal(await page.locator("#keyboard .pressed").count(), 1);
    assert.equal(await page.locator('[data-code="KeyW"]').getAttribute("data-mount"), "original");
    assert.equal(await page.locator('[data-code="KeyW"]').evaluate((node) => node.childElementCount), mounted);
    await page.evaluate(() => window.dispatchEvent(new Event("blur")));
    assert.equal(await page.locator("#keyboard .pressed").count(), 0);
    await page.keyboard.up("ShiftLeft");
    await page.evaluate(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { code: "ControlRight", ctrlKey: true }));
      window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyE", ctrlKey: false }));
      window.dispatchEvent(new KeyboardEvent("keyup", { code: "KeyE" }));
    });
    assert.equal(await page.locator("#keyboard .pressed").count(), 0, "Modifier flags recover a missing release");
    await page.evaluate(() => {
      for (const html of ['<input type="password">', '<textarea></textarea>', '<div contenteditable="plaintext-only" tabindex="0"></div>', '<div contenteditable="true" tabindex="0"><span>Editable</span></div>']) document.body.insertAdjacentHTML("beforeend", html);
    });
    const count = await page.locator(".history-entry").count();
    for (const selector of ["input", "textarea", '[contenteditable="plaintext-only"]', '[contenteditable="true"]']) {
      await page.locator(selector).focus();
      await page.keyboard.type("secretE");
    }
    assert.equal(await page.locator(".history-entry").count(), count);
    assert.equal(await page.locator("#keyboard .pressed").count(), 0);
    assert.deepEqual(page.errors, []);
  } finally { await page.close(); }
});

test("history combinations, consecutive repetition, and held keys share one policy", async () => {
  const page = await open("mode=keyboard&layout=wasd&showHistory=yes&historyStyle=text&historyHeight=500");
  try {
    await tap(page, "KeyE");
    await tap(page, "KeyE");
    await tap(page, "KeyE");
    assert.equal(await page.locator(".history-entry").count(), 1);
    assert.match(await page.locator(".history-entry").innerText(), /E\s*×3/);
    await tap(page, "KeyR");
    await tap(page, "KeyE");
    assert.equal(await page.locator(".history-entry").count(), 3);
    await page.keyboard.down("ControlLeft");
    await page.waitForTimeout(90);
    await tap(page, "KeyC");
    await tap(page, "KeyC");
    await page.keyboard.up("ControlLeft");
    assert.match(await page.locator(".history-entry").first().innerText(), /L Ctrl\s*\+\s*C\s*×2/);
    await page.keyboard.down("KeyW");
    for (let i = 0; i < 5; i++) await page.keyboard.down("KeyW");
    assert.ok(!/×/.test(await page.locator(".history-entry").first().innerText()));
    await page.keyboard.up("KeyW");
    assert.equal(await page.locator("#keyboard .pressed").count(), 0);
    assert.deepEqual(page.errors, []);
  } finally { await page.close(); }
});

test("mouse buttons, wheel, movement, separate modes, and history inclusion remain independent", async () => {
  const page = await open("mode=mouse&showHistory=yes&historyStyle=svg&historySource=mouse");
  try {
    assert.equal(await page.locator("#keyboard").isVisible(), false);
    assert.equal(await page.evaluate(() => window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyE", cancelable: true }))), true, "Mouse-only capture leaves keyboard events alone");
    await page.mouse.down({ button: "left" });
    assert.equal(await page.locator('#mouse [data-code="Mouse0"].pressed').count(), 1);
    await page.mouse.up({ button: "left" });
    assert.equal(await page.locator("#mouse .pressed").count(), 0);
    for (const button of ["middle", "right"]) { await page.mouse.down({ button }); await page.mouse.up({ button }); }
    for (const button of [3, 4]) await page.evaluate((button) => {
      window.dispatchEvent(new MouseEvent("mousedown", { button }));
      window.dispatchEvent(new MouseEvent("mouseup", { button }));
    }, button);
    assert.notDeepEqual(await page.locator('#mouse [data-code="Mouse3"]').boundingBox(), await page.locator('#mouse [data-code="Mouse4"]').boundingBox(), "Side buttons occupy distinct native regions");
    await page.evaluate(() => {
      window.dispatchEvent(new MouseEvent("mousedown", { button: 0 }));
      window.dispatchEvent(new MouseEvent("mousemove", { buttons: 0 }));
    });
    assert.equal(await page.locator('#mouse [data-code="Mouse0"].pressed').count(), 0, "Current button mask recovers a missing release");
    await page.mouse.wheel(0, -100);
    await page.locator('#mouse [data-code="WheelUp"].pressed').waitFor();
    await page.mouse.wheel(0, 100);
    await page.locator('#mouse [data-code="WheelDown"].pressed').waitFor();
    await page.waitForTimeout(180);
    assert.equal(await page.locator("#mouse .pressed").count(), 0);
    const before = await page.locator(".history-entry").count();
    for (let i = 0; i < 10; i++) await page.mouse.move(50 + i * 5, 40 + i * 2);
    await tap(page, "KeyE");
    assert.equal(await page.locator(".history-entry").count(), before, "Movement and excluded keyboard input add no entries");
    assert.ok(await page.locator(".history-prompt svg path").count());
    await page.goto("https://stream.test/keyboard/?mode=both&layout=wasd&showHistory=yes&historyStyle=text&historyInclusion=displayed");
    await page.locator('#keyboard-overlay[data-ready="yes"]').waitFor();
    await tap(page, "KeyE");
    assert.equal(await page.locator(".history-entry").count(), 0);
    await tap(page, "KeyW");
    assert.equal(await page.locator(".history-entry").count(), 1);
    await page.goto("https://stream.test/keyboard/?mode=hidden&showHistory=yes&historyStyle=text");
    await page.locator('#keyboard-overlay[data-ready="yes"]').waitFor();
    assert.equal(await page.locator("#keyboard").isVisible(), false);
    assert.equal(await page.locator("#mouse").isVisible(), false);
    await tap(page, "KeyE");
    await page.mouse.click(30, 30);
    assert.equal(await page.locator(".history-entry").count(), 2);
    assert.deepEqual(page.errors, []);
  } finally { await page.close(); }
});

test("automatic history sizing leaves one-key cross dimensions and reserves space beside the visualization", async () => {
  for (const name of ["keyboard", "controller"]) for (const orientation of ["horizontal", "vertical"]) {
    const query = name === "keyboard" ? "mode=both&layout=fighting" : "player=9&skin=xseries";
    const page = await open(`${query}&showHistory=yes&historyOrientation=${orientation}`, name);
    try {
      for (const [width, height] of [[1280, 720], [480, 320]]) {
        await page.setViewportSize({ width, height });
        await tap(page, name === "keyboard" ? "KeyE" : "KeyJ");
        await page.waitForTimeout(80);
        const boxes = await page.evaluate((name) => {
          const history = document.querySelector(".input-history").getBoundingClientRect();
          const main = document.querySelector(name === "keyboard" ? "#input-scene" : ".controller.active").getBoundingClientRect();
          return { history: { x: history.x, y: history.y, width: history.width, height: history.height }, main: { x: main.x, y: main.y, width: main.width, height: main.height }, overlap: Math.max(0, Math.min(history.right, main.right) - Math.max(history.left, main.left)) * Math.max(0, Math.min(history.bottom, main.bottom) - Math.max(history.top, main.top)) };
        }, name);
        assert.ok(boxes.history[orientation === "horizontal" ? "height" : "width"] < 100, JSON.stringify(boxes));
        assert.ok(boxes.overlap < 1, JSON.stringify(boxes));
        assert.ok(boxes.main.width > 0 && boxes.main.height > 0);
      }
      assert.deepEqual(page.errors, []);
    } finally { await page.close(); }
  }
  const page = await open("mode=hidden&showHistory=yes&historyWidth=0&historyWidthMode=fill&historyHeight=0&historyHeightMode=fill");
  try {
    assert.deepEqual(await page.locator(".input-history").evaluate((node) => [node.clientWidth, node.clientHeight]), [1248, 688]);
  } finally { await page.close(); }
});

test("history uses actual space in both orientations and orders, removing old DOM and keeping input ephemeral", async () => {
  for (const orientation of ["vertical", "horizontal"]) for (const order of ["first", "last"]) {
    const page = await open(`mode=keyboard&layout=wasd&showHistory=yes&historyStyle=text&historyWidth=240&historyHeight=160&historyOrientation=${orientation}&historyOrder=${order}&animate=no`);
    try {
      const traffic = [];
      page.on("request", (request) => traffic.push(request.url()));
      await page.evaluate(() => {
        window.inputWrites = [];
        for (const method of ["setItem", "removeItem"]) Storage.prototype[method] = () => { window.inputWrites.push(method); throw new Error("Input persisted"); };
        Object.defineProperty(document, "cookie", { set() { window.inputWrites.push("cookie"); } });
        for (let i = 0; i < 250; i++) for (const type of ["keydown", "keyup"]) window.dispatchEvent(new KeyboardEvent(type, { code: i % 2 ? "KeyE" : "KeyW" }));
      });
      await page.waitForTimeout(100);
      const geometry = await page.locator(".input-history").evaluate((node) => ({ count: node.children.length, width: node.clientWidth, height: node.clientHeight, scrollWidth: node.scrollWidth, scrollHeight: node.scrollHeight, texts: [...node.children].map((entry) => entry.textContent.trim()) }));
      assert.ok(geometry.count > 0 && geometry.count < 10, JSON.stringify(geometry));
      assert.ok(geometry.scrollWidth <= geometry.width + 1);
      assert.ok(geometry.scrollHeight <= geometry.height + 1);
      assert.equal(geometry.texts[order === "first" ? 0 : geometry.texts.length - 1], "E");
      assert.deepEqual(await page.evaluate(() => window.inputWrites), []);
      assert.deepEqual(traffic, []);
      assert.equal(await page.evaluate(() => byStream.settingsURL(byStreamResource, byStreamResource.settings).searchParams.has("historyEntries")), false);
      await page.setViewportSize({ width: 160, height: 140 });
      await page.waitForTimeout(100);
      assert.ok(await page.locator(".history-entry").count() <= geometry.count);
      assert.deepEqual(page.errors, []);
    } finally { await page.close(); }
  }
});

test("appearance, safe labels, missing artwork, image fallback, and small viewports keep input usable", async () => {
  const label = JSON.stringify({ KeyW: "<script>" });
  const page = await open(`mode=both&layout=wasd&customColors=yes&keyColor=123456&legendColor=fedcba&mouseIndependent=yes&mouseColor=778899&keyLabels=${encodeURIComponent(label)}&imageTarget=both&shellImage=missing.png&keyImage=missing.png`, "keyboard", async (page) => {
    await page.route("**/keys/w.svg", (route) => route.fulfill({ status: 404 }));
  });
  try {
    await page.waitForFunction(() => document.querySelector("#keyboard-overlay").dataset.imageError === "yes");
    assert.equal(await page.locator('[data-code="KeyW"] .key-text').textContent(), "<script>");
    assert.equal(await page.locator('[data-code="KeyW"] script').count(), 0);
    assert.ok(await page.locator('#kenney-any-surface').count());
    assert.equal(await page.locator('[data-code="KeyW"] .key-surface').evaluate((node) => getComputedStyle(node).fill), "rgb(18, 52, 86)");
    assert.equal(await page.locator(".mouse-shell").evaluate((node) => getComputedStyle(node).fill), "rgb(119, 136, 153)");
    await page.setViewportSize({ width: 320, height: 180 });
    await page.waitForFunction(() => document.querySelector("#input-scene").getBoundingClientRect().right <= innerWidth - 15);
    const box = await page.locator("#input-scene").boundingBox();
    assert.ok(box.x >= 15 && box.y >= 15 && box.x + box.width <= 305 && box.y + box.height <= 165, JSON.stringify(box));
    await tap(page, "KeyW");
    assert.equal(await page.locator("#keyboard .pressed").count(), 0);
    const image = "https://stream.test/texture.svg";
    await page.route(image, (route) => route.fulfill({ contentType: "image/svg+xml", body: '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="40"><path fill="#00ff00" d="M0 0h80v40H0z"/></svg>' }));
    await page.goto(`https://stream.test/keyboard/?mode=keyboard&layout=wasd&imageTarget=both&shellImage=${encodeURIComponent(image)}&keyImage=${encodeURIComponent(image)}&imageTint=chroma`);
    await page.locator('#keyboard-overlay[data-ready="yes"]').waitFor();
    await page.waitForFunction(() => document.querySelector("#keycap-image image")?.hasAttribute("href"));
    assert.equal(await page.locator("#keycap-image").getAttribute("viewBox"), "0 0 80 40");
    assert.equal(await page.locator("#keyboard .surface-image").count(), 5);
    await page.keyboard.down("KeyW");
    assert.equal(await page.locator('[data-code="KeyW"].pressed').count(), 1);
    const outlines = [];
    for (const width of [0.5, 1]) {
      await page.goto(`https://stream.test/keyboard/?mode=keyboard&layout=wasd&outlineWidth=${width}&animate=no`);
      await page.locator('#keyboard-overlay[data-ready="yes"]').waitFor();
      outlines.push(await page.locator('[data-code="KeyW"]').screenshot());
    }
    assert.notDeepEqual(outlines[0], outlines[1], "Fractional thickness adjusts the native outline without replacing its geometry");
    assert.deepEqual(page.errors, []);
  } finally { await page.close(); }
});

test("animated key images stay mounted through input and layout replacement clears held state", async () => {
  const gif = "data:image/gif;base64," + Buffer.from("47494638396101000100800000000000ffffff21ff0b4e45545343415045322e30030100000021f904000a0000002c000000000100010000020244010021f904000a0000002c00000000010001000002024c01003b", "hex").toString("base64");
  const page = await open(`mode=keyboard&layout=wasd&imageTarget=keys&keyImage=${encodeURIComponent(gif)}&animate=no`);
  try {
    await page.waitForFunction(() => document.querySelector("#keycap-image image")?.hasAttribute("href"));
    await page.locator("#keycap-image image").evaluate((node) => { node.dataset.mount = "original"; });
    const frames = new Set();
    for (let i = 0; i < 5; i++) {
      frames.add((await page.locator('[data-code="KeyW"]').screenshot()).toString("base64"));
      await page.waitForTimeout(70);
    }
    assert.ok(frames.size > 1, "GIF frames actually paint through the clipped shared image");
    await page.keyboard.down("KeyW");
    assert.equal(await page.locator('[data-code="KeyW"].pressed').count(), 1);
    assert.equal(await page.locator("#keycap-image image").getAttribute("data-mount"), "original");
    await page.goto("https://stream.test/keyboard/?mode=keyboard&layout=arrows&animate=no");
    await page.locator('#keyboard-overlay[data-ready="yes"]').waitFor();
    assert.equal(await page.locator(".input-key").count(), 4);
    assert.equal(await page.locator(".input-key.pressed").count(), 0);
    await page.keyboard.up("KeyW");
    assert.deepEqual(page.errors, []);
  } finally { await page.close(); }
});

test("history-only URLs retain selected platform labels and teardown removes capture and history", async () => {
  const page = await open("mode=hidden&platform=mac&showHistory=yes&historyStyle=text&historySource=keyboard");
  try {
    const url = await page.evaluate(() => byStream.settingsURL(byStreamResource, byStreamResource.settings).href);
    assert.equal(new URL(url).searchParams.get("platform"), "mac");
    await page.goto(url);
    await page.locator('#keyboard-overlay[data-ready="yes"]').waitFor();
    await tap(page, "MetaLeft");
    assert.match(await page.locator(".history-entry").innerText(), /L Cmd/);
    await page.keyboard.down("KeyW");
    await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent("pagehide", { persisted: true })));
    assert.equal(await page.locator(".history-entry").count(), 0);
    await page.keyboard.up("KeyW");
    await tap(page, "KeyE");
    assert.equal(await page.locator(".history-entry").count(), 1, "A cached page retains its capture lifetime");
    await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent("pagehide", { persisted: false })));
    assert.equal(await page.locator(".input-history").count(), 0);
    await tap(page, "KeyE");
    assert.equal(await page.locator(".input-history").count(), 0, "Disposed owners do not capture or remount history");
    assert.deepEqual(page.errors, []);
  } finally { await page.close(); }
});

test("controller history reuses mapped polling, keeps selected players, aggregates holds and clones actual artwork", async () => {
  const page = await open("player=1&skin=xseries&showHistory=yes&historyHeight=500", "controller", async (page) => {
    await page.addInitScript(() => {
      window.testPads = [0, 1].map((index) => ({ id: `Test pad ${index}`, index, connected: true, buttons: Array(40).fill(0), axes: [0, 0, 0, 0] }));
      window.pollCount = 0;
      Object.defineProperty(navigator, "getGamepads", { value: () => { window.pollCount++; return window.testPads; } });
    });
  });
  try {
    await page.evaluate(() => { window.pollStart = pollCount; window.inputFrames = 0; document.addEventListener("controller-input", () => window.inputFrames++); });
    await page.waitForTimeout(80);
    assert.equal(await page.evaluate(() => pollCount - pollStart - inputFrames), 0, "History adds no polling calls");
    await page.evaluate(() => { testPads[1].buttons[0] = 1; });
    await page.waitForTimeout(80);
    assert.equal(await page.locator(".history-entry").count(), 0, "Unselected player's input is excluded");
    await page.evaluate(() => { testPads[0].buttons[0] = 1; });
    await page.locator(".history-entry").waitFor();
    assert.ok(await page.locator(".history-prompt svg").count());
    assert.match(await page.locator(".history-entry").innerText(), /P1/);
    await page.waitForTimeout(100);
    assert.equal(await page.locator(".history-entry").count(), 1);
    assert.equal(await page.locator(".history-count").innerText(), "");
    await page.evaluate(() => { testPads[0].buttons[0] = 0; });
    await page.waitForTimeout(30);
    await page.evaluate(() => { testPads[0].buttons[0] = 1; });
    await page.waitForFunction(() => document.querySelector(".history-count").textContent === "×2");
    await page.evaluate(() => { testPads[0].buttons[0] = 0; });
    await page.waitForTimeout(30);
    await page.evaluate(() => { testPads[0].buttons[1] = testPads[0].buttons[3] = 1; });
    await page.waitForTimeout(50);
    assert.equal(await page.locator(".history-entry").first().locator(".history-prompt").count(), 2);
    await page.evaluate(() => { testPads[0].buttons.fill(0); });
    await page.waitForTimeout(30);
    await page.evaluate(() => { testPads[0].buttons[6] = 0.5; });
    await page.waitForTimeout(50);
    assert.equal(await page.locator(".history-entry").first().locator('[title="LT"]').count(), 1, "Analog trigger records one digital transition");
    const mapping = JSON.stringify([{ targetType: "buttons", target: 0, choiceType: "buttons", choice: 1 }]);
    await page.goto(`https://stream.test/controller/?player=1&skin=xseries&showHistory=yes&historyStyle=text&mapping=${encodeURIComponent(mapping)}`);
    await page.locator(".controller.active").first().waitFor();
    await page.evaluate(() => { testPads[0].buttons[1] = 1; });
    await page.waitForTimeout(60);
    assert.deepEqual(await page.evaluate(() => byStreamResource.settings.mapping), [{ targetType: "buttons", target: 0, choiceType: "buttons", choice: 1 }]);
    assert.match(await page.locator(".history-entry").first().innerText(), /A/);
    assert.deepEqual(page.errors, []);
  } finally { await page.close(); }
});

test("fight-stick history follows its existing digital lever override without duplicate axis entries", async () => {
  const page = await open("player=1&skin=fgc&showHistory=yes&historyStyle=text&animate=no", "controller", async (page) => {
    await page.addInitScript(() => {
      window.pad = { id: "Fight stick", index: 0, connected: true, buttons: Array(40).fill(0), axes: [0, 0, 0, 0] };
      Object.defineProperty(navigator, "getGamepads", { value: () => [window.pad] });
    });
  });
  try {
    await page.evaluate(() => { pad.buttons[12] = 1; pad.axes[1] = -1; });
    await page.waitForFunction(() => document.querySelector(".history-entry")?.textContent.includes("Up"));
    assert.equal(await page.locator(".history-prompt").count(), 1, "Digital D-pad works with analog history disabled");
    await page.goto("https://stream.test/controller/?player=1&skin=fgc&showHistory=yes&historyStyle=text&historySticks=yes&animate=no");
    await page.locator(".controller.active").waitFor();
    await page.evaluate(() => { pad.buttons[15] = 1; pad.axes[0] = -1; });
    await page.waitForFunction(() => document.querySelector(".history-entry")?.textContent.includes("Right"));
    assert.equal(await page.locator(".history-prompt").count(), 1, "The button override and raw axis describe one lever action");
    assert.ok(await page.locator('.control-layer[data-name="stick-1"]').evaluate((node) => parseFloat(node.style.translate) > 0), "Painting uses the same digital override");
    await page.waitForTimeout(80);
    assert.equal(await page.locator(".history-entry").count(), 1);
    assert.deepEqual(page.errors, []);
  } finally { await page.close(); }
});

test("keyboard-as-controller and optional stick directions do not flood history", async () => {
  const page = await open("player=9&skin=xseries&showHistory=yes&historyStyle=text&historySticks=yes", "controller");
  try {
    await page.keyboard.down("j");
    await page.waitForFunction(() => document.querySelector(".history-entry"));
    assert.match(await page.locator(".history-entry").innerText(), /KB\s*A/);
    await page.keyboard.down("j");
    await page.waitForTimeout(50);
    assert.equal(await page.locator(".history-entry").count(), 1);
    await page.keyboard.up("j");
    await page.keyboard.down("w");
    await page.waitForTimeout(120);
    const count = await page.locator(".history-entry").count();
    await page.waitForTimeout(80);
    assert.equal(await page.locator(".history-entry").count(), count);
    assert.match(await page.locator(".history-entry").first().innerText(), /LS Up/);
    await page.keyboard.up("w");
    await page.evaluate(() => { const editable = document.createElement("div"); editable.contentEditable = "plaintext-only"; editable.tabIndex = 0; document.body.append(editable); editable.focus(); });
    const entries = await page.locator(".history-entry").count();
    await page.keyboard.type("jjww");
    await page.waitForTimeout(60);
    assert.equal(await page.locator(".history-entry").count(), entries, "Keyboard-as-controller excludes ordinary editable text");
    assert.deepEqual(page.errors, []);
  } finally { await page.close(); }
});
