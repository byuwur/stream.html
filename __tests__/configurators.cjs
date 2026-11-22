/*
 * File: __tests__/configurators.cjs
 * Desc: Small host smoke checks; standalone renderer contracts live in resources.cjs.
 */
const assert = require("node:assert/strict");
const test = require("node:test");
const { runtimeAssets, launchBrowser, loadAssets, serve } = require("./browser.cjs");
const coreOnly = process.env.STREAM_CORE_ONLY === "1";

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

// ===== CATALOG PRIVACY AND RESOURCE COUNTS =====
test("catalog links and filters work while deferred enhancements are still downloading", async (t) => {
  const browser = await launchBrowser();
  t.after(() => browser.close());
  const page = await browser.newPage();
  page.setDefaultTimeout(5000);
  const base = "https://stream.test/catalog/";
  await serve(page, await loadAssets(editorAssets), false, base);
  let resume;
  const paused = new Promise((resolve) => {
    resume = resolve;
  });
  await page.route("**/js/jquery.min.js", async (route) => {
    await paused;
    await route.fallback();
  });
  await page.goto(base, { waitUntil: "commit" });

  const card = page.locator(".home-tool[data-tool=controller]");
  await card.waitFor();
  assert.equal(await page.evaluate(() => typeof window.jQuery), "undefined");
  assert.equal(await card.getAttribute("href"), base + "controller/");
  await page.locator("#tool-category").selectOption("interaction");
  await page.locator("#tool-search").fill("Gamepad or keyboard input");
  assert.equal(await page.locator(".home-tool:visible").count(), 1);
  assert.ok(await card.isVisible());

  resume();
  await page.locator(".select2-selection").waitFor();
  assert.equal(await page.locator(".home-tool:visible").count(), 1);
  await page.locator("#tool-search").fill("");
  await page.locator(".select2-selection").click();
  await page.getByRole("option", { name: "All tools" }).click();
  assert.equal(await page.locator(".home-tool:visible").count(), await page.locator(".home-tool").count());
});

test("catalog activates privacy controls and counts each selected resource until rejection", async (t) => {
  const browser = await launchBrowser();
  t.after(() => browser.close());
  const page = await browser.newPage();
  page.setDefaultTimeout(8000);
  await serve(page, await loadAssets(editorAssets), false, "https://stream.byuwur.co/");
  // Exercise the host contract independently of the published SPA component.
  await page.route("**/_privacy.min.js", (route) =>
    route.fulfill({
      contentType: "text/javascript",
      body: `window.byCommon.initPrivacyControls = ({ onChoice }) => {
      const button = document.createElement("button");
      button.textContent = "Reject";
      button.onclick = () => onChoice("no");
      document.body.append(button);
      return { update(active, saved) { button.hidden = !active || !!saved; } };
    };`
    })
  );
  const visits = [];
  await page.route("https://byuwur.co/usage.php", (route) => {
    visits.push(route.request().postData());
    return route.fulfill({ status: 204, headers: { "Access-Control-Allow-Origin": "https://stream.byuwur.co" } });
  });
  await page.goto("https://stream.byuwur.co/");
  const reject = page.getByRole("button", { name: "Reject", exact: true });
  await reject.waitFor();
  const card = page.locator("a.home-tool[data-tool=timer]");
  // Keep the catalog open so both clicks exercise the same mounted component.
  await page.evaluate(() =>
    document.addEventListener("click", (event) => {
      if (event.target.closest("a.home-tool")) event.preventDefault();
    })
  );
  await Promise.all([page.waitForRequest((request) => request.postData() === "resource_selected|landing|timer"), card.click()]);
  await reject.click();
  await reject.waitFor({ state: "hidden" });
  await card.press("Enter");
  await Promise.all([page.waitForResponse((response) => response.request().postData() === "page_view|landing|catalog"), page.reload()]);
  await card.waitFor();
  assert.deepEqual(visits, ["page_view|landing|catalog", "resource_selected|landing|timer", "page_view|landing|catalog"]);
});

// ===== DEMO EXPORTS AND CONFIGURATION ROUND TRIPS =====
test("a dropdown label focuses its visible control without opening a picker", async (t) => {
  const browser = await launchBrowser();
  t.after(() => browser.close());
  const page = await browser.newPage();
  page.setDefaultTimeout(6000);
  await serve(page, await loadAssets(editorAssets));
  await page.goto("https://stream.test/now-playing/?layout=classic#configure");
  const caption = page.getByText("Appearance preset", { exact: true });
  const preset = page.locator("label").filter({ has: caption });
  const control = preset.getByRole("combobox");
  await preset.locator(".select2-selection").waitFor({ state: "attached" });
  assert.deepEqual(await preset.locator("option").allTextContents(), ["BONYUR", "Studio", "Minimal", "Light ink", "Custom..."]);
  assert.equal(await preset.locator("select").inputValue(), "bonyur");
  if (!(await caption.isVisible())) await page.getByRole("button", { name: "Appearance", exact: true }).click();
  await preset.locator("select").evaluate((node) => {
    node.addEventListener("click", () => {
      node.dataset.clicked = "yes";
    });
  });
  await caption.click();
  assert.equal(await preset.locator("select").getAttribute("data-clicked"), null);
  assert.equal(await control.evaluate((node) => node === document.activeElement), true);
  assert.equal(await control.getAttribute("aria-expanded"), "false");
  await page.keyboard.press("Enter");
  await page.getByRole("option", { name: "Studio", exact: true }).waitFor();
  await page.keyboard.press("Escape");
  await page.locator(".select2-dropdown").waitFor({ state: "detached" });
  await control.click();
  await page.getByRole("option", { name: "Studio", exact: true }).click();
  assert.equal(await preset.locator("select").inputValue(), "studio");
});

test("appearance presets follow saved fields, imports and resets without a preset parameter", async (t) => {
  const browser = await launchBrowser();
  t.after(() => browser.close());
  const page = await browser.newPage();
  page.setDefaultTimeout(10000);
  await serve(page, await loadAssets(editorAssets));
  const preset = page.locator("label").filter({ hasText: "Appearance preset" }).locator("select");
  const value = (expected) => preset.locator(`option:checked[value="${expected}"]`).waitFor({ state: "attached" });
  await page.goto("https://stream.test/badge/?label=LIVE#configure");
  await value("bonyur");
  await preset.selectOption("studio", { force: true });
  await page.waitForFunction(() => new URL(document.getElementById("overlay-url").value).searchParams.has("backgroundColor"));
  const url = await page.locator("#overlay-url").inputValue();
  assert.deepEqual([...new URL(url).searchParams.keys()].sort(), ["accentColor", "backgroundColor", "label", "textColor"]);
  await page.goto(url + "#configure");
  await value("studio");
  await page.goto(url.replace("label=LIVE", "label=AWAY") + "#configure");
  await value("");
  await page.locator('[data-settings-view="json"]').click();
  await page.locator("#settings-json").fill('{"label":"LIVE"}');
  await value("bonyur");
  await page.locator("#settings-json").fill('{"label":"LIVE","textColor":"#f05"}');
  await value("");
  await page.locator('[data-settings-view="form"]').click();
  await page.getByRole("button", { name: "Reset", exact: true }).first().click();
  await page.waitForFunction((url) => document.getElementById("overlay-url").value === url, url.replace("label=LIVE", "label=AWAY"));
  await value("");

  for (const [resource, background] of [
    ["counter", "#0003"],
    ["hud", "#00000000"]
  ]) {
    await page.goto(`https://stream.test/${resource}/#configure`);
    await value("bonyur");
    const field = page.locator('form [name="backgroundColor"]');
    assert.equal((await field.inputValue()).toLowerCase(), background);
    await preset.selectOption("studio", { force: true });
    await page.waitForFunction(() => new URL(document.getElementById("overlay-url").value).searchParams.has("backgroundColor"));
    await preset.selectOption("bonyur", { force: true });
    await page.waitForFunction(() => !new URL(document.getElementById("overlay-url").value).searchParams.has("backgroundColor"));
    assert.equal((await field.inputValue()).toLowerCase(), background);
  }
});

test("selected ticker scrolls a fractionally clipped title in the live preview", async (t) => {
  const browser = await launchBrowser();
  t.after(() => browser.close());
  const page = await browser.newPage({ reducedMotion: "reduce" });
  page.setDefaultTimeout(15000);
  await serve(page, await loadAssets(editorAssets));
  await page.goto("https://stream.test/now-playing/?layout=classic&animate=no#configure");
  const track = page.frameLocator("#overlay-preview").locator(".track");
  await track.filter({ hasText: "Girl Like Me" }).waitFor();
  await page.locator('form [name="titleOverflow"]').selectOption("ticker", { force: true });
  await page.waitForFunction(() => document.getElementById("overlay-url").value.includes("title.overflow=ticker"));
  const line = track.locator(".stream-ticker-text:not(.stream-ticker-auto)");
  await line.waitFor();
  assert.equal(await line.textContent(), "Girl Like Me");
  const widths = await line.evaluate((node) => {
    const width = parseFloat(getComputedStyle(node).width);
    node.closest(".track").style.width = width - 1 / 64 + "px";
    return [node.offsetWidth, node.parentElement.clientWidth];
  });
  assert.equal(widths[0], widths[1]);
  const moving = track.locator("[data-repeat]");
  await moving.waitFor();
  const frame = await (await page.locator("#overlay-preview").elementHandle()).contentFrame();
  const start = await moving.evaluate((node) => node.getBoundingClientRect().left);
  await frame.waitForFunction((start) => document.querySelector(".track [data-repeat]").getBoundingClientRect().left < start - 1, start);
  await track.evaluate((node) => {
    node.style.width = "300px";
  });
  await moving.waitFor({ state: "detached" });
});

test("unit sliders step by one and number fields preserve typed fractions", { timeout: 30000 }, async (t) => {
  const browser = await launchBrowser();
  t.after(() => browser.close());
  const page = await browser.newPage();
  await serve(page, await loadAssets(editorAssets));
  await page.goto("https://stream.test/now-playing/?layout=classic#configure");
  for (const name of ["coverSize", "duration", "opacity", "tilt", "visualScale"]) {
    const number = page.locator(`form [name="${name}"]`);
    for (const toggle of await number.evaluate((field) => {
      const toggles = [];
      for (let parent = field.parentElement; parent; parent = parent.parentElement) {
        if (parent.matches(".collapse:not(.show)")) toggles.unshift(parent.getAttribute("aria-labelledby"));
      }
      return toggles;
    }))
      await page.locator("#" + toggle).click();
    const slider = page.locator(`[data-number-field="${name}"]`);
    assert.equal(await slider.getAttribute("step"), "1", name);
    await number.fill("32.25");
    await number.press("ArrowUp");
    assert.equal(await number.inputValue(), "33.25", name);
    await page.waitForFunction((key) => new URL(document.getElementById("overlay-url").value).searchParams.get(byStreamResource.fields[key].parameter || key) === "33.25", name);
    const previous = Number(await slider.inputValue());
    await slider.press("ArrowRight");
    assert.equal(Number(await number.inputValue()), previous + 1, name);
  }
  // A clamped slider thumb must not overwrite the number box's wider range.
  for (const [name, value, thumb] of [
    ["duration", "123.75", "60"],
    ["tilt", "-12.5", "0"]
  ]) {
    const input = page.locator(`form [name="${name}"]`);
    await input.fill(value);
    await input.press("Tab");
    await page.waitForFunction(([key, expected]) => new URL(document.getElementById("overlay-url").value).searchParams.get(byStreamResource.fields[key].parameter || key) === expected, [name, value]);
    assert.equal(await input.inputValue(), value);
    assert.equal(await page.locator(`[data-number-field="${name}"]`).inputValue(), thumb);
  }
});

test("TBD configurators export demos, restore conditional drafts and round-trip compressed edits", { timeout: 60000 }, async (t) => {
  const browser = await launchBrowser();
  t.after(() => browser.close());
  const assets = await loadAssets(editorAssets);
  const page = await browser.newPage();
  page.setDefaultTimeout(8000);
  await serve(page, assets);
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const url = page.locator("#overlay-url");
  for (const [id, layout] of [
    ["counter", "digital"],
    ["chat", "bubble"],
    ["now-playing", "classic"]
  ]) {
    await page.goto("https://stream.test/" + id + "/");
    await page.waitForFunction(() => !!document.getElementById("overlay-url")?.value);
    assert.equal(new URL(await url.inputValue()).searchParams.get("layout"), layout);
    assert.equal(await page.locator("h1 .resource-status").textContent(), "TBD");
    await page.frameLocator("#overlay-preview").locator("#overlay .panel").waitFor();
    if (id === "chat") {
      for (const name of ["Twitch", "YouTube", "Kick", "TikTok"]) assert.equal(await page.getByRole("button", { name: "Connect to " + name, exact: true }).isDisabled(), true);
      const rows = await page.locator("form [data-platform]").evaluateAll((nodes) =>
        nodes.map((node) => {
          const box = node.getBoundingClientRect();
          return { top: box.top, bottom: box.bottom, width: box.width, available: node.parentElement.getBoundingClientRect().width };
        })
      );
      assert.equal(rows.length, 4);
      assert.ok(rows.every((row, i) => row.width > 0 && Math.abs(row.width - row.available) < 1 && (!i || row.top >= rows[i - 1].bottom)));
      const first = page.locator('[data-field="text"]').first();
      await first.fill("Hello from the editor");
      await first.dispatchEvent("change");
      await page.frameLocator("#overlay-preview").getByText("Hello from the editor").waitFor();
      await page.locator('form [name="dockBg"]').selectOption("dark", { force: true });
      await page.waitForFunction(() => new URL(document.getElementById("overlay-url").value).searchParams.get("dockBg") === "dark");
      await page.waitForFunction(() => {
        const preview = document.getElementById("overlay-preview").contentWindow;
        return preview.document.body && preview.getComputedStyle(preview.document.body).backgroundColor === "rgb(34, 34, 34)";
      });
    } else if (id === "counter") {
      await page.locator('[name="start"]').fill("-7");
      await page.locator('[name="start"]').dispatchEvent("change");
      await page.frameLocator("#overlay-preview").locator("output", { hasText: "-7" }).waitFor();
      await page.goto(await url.inputValue());
      assert.equal(await page.locator("output").textContent(), "-7");
    }
  }

  const title = page.locator('form [name="title"]');
  const blurred = page.locator('form [name="coverBackground"]');
  assert.equal(await blurred.isChecked(), true);
  await blurred.uncheck();
  await page.waitForFunction(() => new URL(document.getElementById("overlay-url").value).searchParams.get("coverBackground") === "no");
  await blurred.check();
  await page.frameLocator("#overlay-preview").locator(".details .background-cover").waitFor();
  assert.equal(new URL(await url.inputValue()).searchParams.has("coverBackground"), false);
  await title.fill("Evening edit");
  await title.dispatchEvent("change");
  await page.frameLocator("#overlay-preview").getByText("Evening edit").waitFor();
  const source = page.locator('form [name="source"]');
  await source.selectOption("helper", { force: true });
  await page.waitForFunction(() => document.querySelector('form [name="title"]').disabled);
  await source.selectOption("demo", { force: true });
  assert.equal(await title.inputValue(), "Evening edit");
  await page.getByRole("button", { name: "Cover image", exact: true }).click();
  const cover = page.locator('form [name="cover"]');
  await cover.fill("../stream.html.png");
  await cover.dispatchEvent("change");
  await page.frameLocator("#overlay-preview").locator('img[src="../stream.html.png"]').waitFor();
  await page.getByRole("button", { name: "Reset", exact: true }).first().click();
  await page.frameLocator("#overlay-preview").getByText("Girl Like Me").waitFor();
  assert.equal(await cover.inputValue(), "https://upload.wikimedia.org/wikipedia/en/5/5b/PinkPantheress_-_Fancy_That.png");

  await page.locator('[data-settings-view="json"]').click();
  const long = "Echo ".repeat(60).trim();
  await page.locator("#settings-json").fill(JSON.stringify({ layout: "card", title: long }));
  await page.frameLocator("#overlay-preview").getByText(long).waitFor();
  await page.locator("#advanced-options").click();
  await page.locator("#short-url").check();
  await page.waitForFunction(() => new URL(document.getElementById("overlay-url").value).searchParams.has("data"));
  const compressed = await url.inputValue();
  await page.goto(compressed);
  await page.locator('[data-layout="card"] .track', { hasText: long }).waitFor();
  await page.goto(compressed + "#configure");
  assert.equal(await title.inputValue(), long);
  await url.fill("https://stream.test/now-playing/?layout=vinyl&title=FromURL");
  await url.press("Enter");
  await page.frameLocator("#overlay-preview").locator('[data-layout="vinyl"] .track', { hasText: "FromURL" }).waitFor();
  assert.deepEqual(errors, []);
});

test("Now Playing demo buttons cycle three tracks through the preview and optional standalone controls", async (t) => {
  const browser = await launchBrowser();
  t.after(() => browser.close());
  const page = await browser.newPage();
  await serve(page, await loadAssets(editorAssets));
  const heavenCover = "https://upload.wikimedia.org/wikipedia/en/2/20/PinkPantheress_-_Heaven_Knows.png";
  const hellCover = "https://upload.wikimedia.org/wikipedia/en/6/6c/PinkPantheress_-_To_Hell_with_It.png";
  for (const url of [heavenCover, hellCover]) {
    await page.route(url, (route) => route.fulfill({ path: require.resolve("../stream.html.png"), contentType: "image/png", headers: { "Access-Control-Allow-Origin": "*" } }));
  }
  await page.goto("https://stream.test/now-playing/?title=My%20song&overlay.entrance=fadeIn&overlay.entranceDuration=8000#configure");
  const preview = page.frameLocator("#overlay-preview");
  const next = page.getByRole("button", { name: "Next track" });
  const previous = page.getByRole("button", { name: "Previous track" });
  const title = preview.locator(".track");
  await preview.getByText("My song", { exact: true }).waitFor();
  const finishExit = () =>
    title.evaluate(async (node) => {
      const panel = node.closest(".panel");
      for (const motion of panel.getAnimations({ subtree: true })) if (motion.id === "stream-exit") motion.finish();
      await new Promise(requestAnimationFrame);
    });
  await next.click();
  assert.equal(await title.textContent(), "My song");
  assert.equal(await title.evaluate((node) => node.getAnimations()[0].id), "stream-exit");
  await next.click();
  await finishExit();
  assert.equal(await title.textContent(), "Break it off (Bonus)");
  assert.equal(await preview.locator(".artist").textContent(), "PinkPantheress");
  assert.equal(await preview.locator(".album").textContent(), "to hell with it");
  assert.equal(await preview.locator(".total").textContent(), "1:37");
  await preview.locator(`img.cover[src="${hellCover}"]`).waitFor();
  await previous.click();
  await finishExit();
  assert.equal(await title.textContent(), "Bury me (feat. Kelela)");
  assert.equal(await preview.locator(".artist").textContent(), "PinkPantheress");
  assert.equal(await preview.locator(".album").textContent(), "Heaven knows");
  assert.equal(await preview.locator(".total").textContent(), "2:05");
  await preview.locator(`img.cover[src="${heavenCover}"]`).waitFor();
  await previous.click();
  await finishExit();
  assert.equal(await title.textContent(), "My song");
  await previous.click();
  await finishExit();
  assert.equal(await title.textContent(), "Break it off (Bonus)");
  const url = new URL(await page.locator("#overlay-url").inputValue());
  assert.equal(url.searchParams.get("title"), "My song");
  await page.goto(url.href);
  await page.locator(".track").waitFor();
  assert.equal(await page.getByRole("button", { name: "Next track" }).count(), 0);
  url.searchParams.set("demoControls", "yes");
  url.searchParams.delete("overlay.entrance");
  url.searchParams.set("coverImage.entrance", "fadeIn");
  url.searchParams.set("coverImage.entranceDuration", "5000");
  await page.goto(url.href);
  const originalCover = page.locator("img.cover");
  await originalCover.waitFor();
  const original = await originalCover.getAttribute("src");
  await page.getByRole("button", { name: "Previous track" }).click();
  await page.locator(".track").filter({ hasText: "Break it off (Bonus)" }).waitFor();
  await page.waitForFunction(() =>
    document
      .querySelector("img.cover")
      .getAnimations()
      .some((motion) => motion.id === "stream-exit")
  );
  assert.equal(await originalCover.getAttribute("src"), original);
  await originalCover.evaluate((node) =>
    node
      .getAnimations()
      .find((motion) => motion.id === "stream-exit")
      .finish()
  );
  await page.waitForFunction((old) => document.querySelector("img.cover").getAttribute("src") !== old, original);
  url.searchParams.set("source", "helper");
  await page.goto(url.href);
  await page.locator(".panel[data-layout]").waitFor({ state: "attached" });
  assert.equal(await page.getByRole("button", { name: "Next track" }).count(), 0);
});

test("shrinking Now Playing clears the previous card edge in the scaled preview", { timeout: 45000 }, async (t) => {
  const browser = await launchBrowser();
  t.after(() => browser.close());
  const page = await browser.newPage({ viewport: { width: 1693, height: 900 } });
  await serve(page, await loadAssets(editorAssets));
  await page.goto("https://stream.test/now-playing/?layout=classic&coverSize=70&resizeDuration=250&playback=paused#configure");
  const preview = page.frameLocator("#overlay-preview");
  await preview.locator(".background-cover").waitFor();
  const settled = async (title) => {
    const text = preview.getByText(title, { exact: true });
    await text.waitFor();
    await text.evaluate(async () => {
      // ResizeObserver schedules the animation on the following frame.
      do {
        await new Promise(requestAnimationFrame);
        await new Promise(requestAnimationFrame);
      } while (document.querySelector("[data-stream-resizing], [data-stream-await-size]"));
    });
  };
  await settled("Girl Like Me");
  // This strip is transparent beside the short title and inside the longer card.
  const clip = await page.locator("#overlay-preview").evaluate((frame) => {
    const card = frame.contentDocument.querySelector(".panel").getBoundingClientRect();
    const bounds = frame.getBoundingClientRect();
    const scale = bounds.width / frame.contentWindow.innerWidth;
    return { x: Math.ceil(bounds.left + card.right * scale) + 2, y: Math.ceil(bounds.top + card.top * scale) + 20, width: 32, height: 64 };
  });
  const empty = await page.screenshot({ clip });
  for (let i = 0; i < 3; i++) {
    await page.getByRole("button", { name: "Next track" }).click();
    await settled("Bury me (feat. Kelela)");
    assert.ok(!(await page.screenshot({ clip })).equals(empty), "the longer card covers the strip");
    await page.getByRole("button", { name: "Previous track" }).click();
    await settled("Girl Like Me");
    assert.ok((await page.screenshot({ clip })).equals(empty), "every pixel returns to the checkerboard");
  }
});

test("preview visibility fades the whole overlay and replays configured entrances on show", async (t) => {
  const browser = await launchBrowser();
  t.after(() => browser.close());
  const page = await browser.newPage();
  await serve(page, await loadAssets(editorAssets));
  for (const [url, selector] of [
    ["badge/?label=Live&overlay.entrance=slideInRight&overlay.entranceDuration=6000&overlay.children.entrance=zoomIn&overlay.children.entranceDuration=4000", ".panel"],
    ["counter/?animate=no", "output"]
  ]) {
    await page.goto("https://stream.test/" + url + "#configure");
    const preview = page.frameLocator("#overlay-preview");
    const content = preview.locator(selector);
    await content.waitFor();
    const frame = await (await page.locator("#overlay-preview").elementHandle()).contentFrame();
    for (const interrupt of [false, true]) {
      await page.getByRole("button", { name: "Hide overlay" }).click();
      const fade = await frame.waitForFunction(() => document.body.getAnimations().find((motion) => motion.id === "stream-overlay-hide"), null, { timeout: 3000 });
      const opacity = await fade.evaluate((motion) => {
        motion.pause();
        motion.currentTime = motion.effect.getTiming().duration / 2;
        return Number(getComputedStyle(document.body).opacity);
      });
      assert.ok(opacity > 0 && opacity < 1);
      assert.equal(await content.evaluate((node) => node.getAnimations({ subtree: true }).some((motion) => motion.id === "stream-exit")), false);
      if (!interrupt) {
        await fade.evaluate((motion) => motion.finish());
        await content.waitFor({ state: "hidden" });
      }
      await page.getByRole("button", { name: "Show overlay" }).click();
      const show = await frame.waitForFunction(() => document.body.getAnimations().find((motion) => motion.id === "stream-overlay-show"));
      const rising = await show.evaluate((motion) => {
        motion.pause();
        const duration = motion.effect.getTiming().duration;
        motion.currentTime = duration / 2;
        return [Number(motion.effect.getKeyframes()[0].opacity), Number(getComputedStyle(document.body).opacity), duration];
      });
      assert.ok(Math.abs(rising[0] - (interrupt ? opacity : 0)) < 0.01);
      assert.ok(rising[0] < rising[1] && rising[1] < 1);
      assert.equal(rising[2], 300);
      if (interrupt) {
        await page.getByRole("button", { name: "Hide overlay" }).click();
        const hideAgain = await frame.waitForFunction(() => document.body.getAnimations().find((motion) => motion.id === "stream-overlay-hide"));
        assert.ok(Math.abs((await hideAgain.evaluate((motion) => Number(motion.effect.getKeyframes()[0].opacity))) - rising[1]) < 0.01);
        await hideAgain.evaluate((motion) => motion.finish());
        await content.waitFor({ state: "hidden" });
        await page.getByRole("button", { name: "Show overlay" }).click();
      } else await show.evaluate((motion) => motion.finish());
      await frame.waitForFunction(() => !document.body.hidden && getComputedStyle(document.body).opacity === "1");
      await content.waitFor();
      if (selector === ".panel") {
        const durations = await content.evaluate((node) =>
          node
            .getAnimations({ subtree: true })
            .filter((motion) => motion.id === "stream-entrance")
            .map((motion) => motion.effect.getTiming().duration)
        );
        assert.deepEqual([...new Set(durations)].sort(), [4000, 6000]);
      }
    }
  }
});

test("color dependencies and dotted spacing round-trip through the editor", async (t) => {
  const browser = await launchBrowser();
  t.after(() => browser.close());
  const page = await browser.newPage();
  await serve(page, await loadAssets(editorAssets));
  await page.goto("https://stream.test/now-playing/?layout=classic&autoAccent=no&accentColor=abc123#configure");
  const auto = page.locator('form [name="autoAccent"]'),
    color = page.locator('form [name="accentColor"]');
  const layout = page.locator('form [name="layout"]'),
    discTilt = page.locator('form [name="disc.rotateY"]');
  await discTilt.waitFor({ state: "attached" });
  assert.equal(await discTilt.isDisabled(), true);
  await layout.selectOption("vinyl", { force: true });
  await page.waitForFunction(() => !document.querySelector('[name="disc.rotateY"]').disabled);
  await layout.selectOption("classic", { force: true });
  await page.waitForFunction(() => document.querySelector('[name="disc.rotateY"]').disabled);
  const margin = page.locator('form [name="coverImage.marginRight"]');
  assert.equal(await margin.evaluate((input) => !!input.closest(".spacing-grid") && !!input.closest(".config-field").querySelector(".fa-arrow-right")), true);
  await auto.check();
  await page.waitForFunction(() => document.querySelector('form [name="accentColor"]').disabled && !new URL(document.getElementById("overlay-url").value).searchParams.has("accentColor"));
  await color.waitFor({ state: "hidden" });
  await auto.uncheck();
  assert.equal((await color.inputValue()).toLowerCase(), "#abc123");
  assert.equal(await auto.evaluate((input) => !!(input.compareDocumentPosition(document.querySelector('form [name="accentColor"]')) & Node.DOCUMENT_POSITION_FOLLOWING)), true);
  await page.locator('[data-settings-view="json"]').click();
  await page.locator("#settings-json").fill(JSON.stringify({ layout: "classic", titleFontSize: 28, "album.overflow": "ellipsis", "coverImage.marginRight": -3, "title.paddingLeft": 0, "coverImage.rotateY": 15 }));
  await page.waitForFunction(() => new URL(document.getElementById("overlay-url").value).searchParams.get("coverImage.marginRight") === "-3");
  const url = new URL(await page.locator("#overlay-url").inputValue());
  assert.equal(url.searchParams.get("title.fontSize"), "28");
  assert.equal(url.searchParams.has("titleFontSize"), false);
  assert.equal(url.searchParams.get("title.paddingLeft"), "0");
  assert.equal(url.searchParams.get("album.overflow"), "ellipsis");
  await page.goto(url.href);
  await page.locator(".cover").waitFor({ state: "attached" });
  await page.waitForFunction(() => getComputedStyle(document.querySelector(".cover")).marginRight === "-3px");
  await page.waitForFunction(() => getComputedStyle(document.querySelector(".album")).textOverflow === "ellipsis");
});

// ===== CONFIGURATOR CONTROLS AND PREVIEW =====
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

  await t.test("decimal controls, rotation limits, color-field clicks, and short sliders share the canonical fields", { skip: coreOnly }, async () => {
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
      assert.deepEqual((await page.locator("form > section > h2").allTextContents()).slice(0, 3), ["Social accounts", "General", "Appearance"]);
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

  await t.test("keyboard image choices and Main component fields stay in their owning groups", { skip: coreOnly }, async () => {
    const page = await browser.newPage();
    page.setDefaultTimeout(5000);
    try {
      await serve(page, assets);
      await page.goto("https://stream.test/keyboard/?mode=keyboard&imageTarget=all#configure");
      const image = page.locator('[name="imageUrl"]');
      await image.waitFor({ state: "attached" });
      assert.deepEqual(
        (await page.locator("form > section > h2").allTextContents()).map((title) => title.trim()),
        ["General", "Keyboard", "Mouse", "Appearance", "Input History", "Whole overlay", "Export image"]
      );
      assert.equal(await page.locator('[name="historyAnimation"], [name="historyEntry.entrance"], [name="historyEntry.exit"]').count(), 0);
      assert.equal(await page.locator('[name="shellImage"], [name="keyImage"]').count(), 0);
      const choices = page.locator('[name="imageTarget"] + .choice-buttons button');
      assert.deepEqual(await choices.allTextContents(), ["Off", "Shell", "Keys", "All"]);
      assert.deepEqual(
        await image.evaluate((input) => {
          const section = input.closest(".field-subsection");
          return [section.previousElementSibling, section].map((group) => group.querySelector("[data-config-subsection]").dataset.configSubsection);
        }),
        ["Shell", "Image background"]
      );
      const density = page.locator('[name="layoutDensity"]');
      assert.equal(await density.inputValue(), "compact");
      assert.equal(await density.evaluate((input) => input.closest("[data-config-section]").dataset.configSection), "Keyboard");
      const densityChoices = page.locator('[name="layoutDensity"] + .choice-buttons button');
      assert.deepEqual(await densityChoices.allTextContents(), ["Regular", "Compact"]);
      await densityChoices.filter({ hasText: "Regular" }).click();
      await page.waitForFunction(() => new URL(document.getElementById("overlay-url").value).searchParams.get("layoutDensity") === "regular");
      await page.locator('[data-settings-view="json"]').click();
      await page
        .locator("#settings-json")
        .fill(
          '{"mode":"keyboard","imageTarget":"both","shellImage":"../stream.html.png","imageTint":"monochrome","showHistory":"yes","history.entrance":"none","history.entranceDuration":300,"historyEntry.entrance":"zoomIn","historyEntry.entranceDuration":550}'
        );
      await page.waitForFunction(() => document.querySelector('[name="imageUrl"]').value === "../stream.html.png" && document.querySelector('[name="imageTarget"]').value === "all");
      assert.equal(await density.inputValue(), "compact");
      assert.equal(await page.locator('[name="imageBlendMode"]').inputValue(), "fill");
      await page.waitForFunction(() => new URL(document.getElementById("overlay-url").value).searchParams.get("history.entranceDuration") === "550");
      assert.equal(await page.locator('[name="history.entrance"]').inputValue(), "zoomIn");
      await page.goto("https://stream.test/main/?displayCountdown=yes&displaySocial=yes&displaySchedule=yes&displayLabels=yes#configure", { waitUntil: "commit" });
      await page.locator('[name="socialPosition"]').waitFor({ state: "attached", timeout: 15000 });
      assert.equal(await page.locator('[name="countdownRight"], [name="updatesLeft"], [name="eventsBottom"]').count(), 0);
      assert.equal(await page.locator('[name="socialHeadingFontSize"]').evaluate((input) => input.closest("[data-config-section]").dataset.configSection), "Social accounts");
      assert.equal(await page.locator('[name="countdownFontSize"]').evaluate((input) => input.closest("[data-config-section]").dataset.configSection), "Countdown");
      assert.deepEqual((await page.locator("[data-config-section]").evaluateAll((groups) => groups.map((group) => group.dataset.configSection))).slice(0, 2), ["General", "Appearance"]);
      const social = page.locator('[data-config-section="Social accounts"]');
      const heading = social.locator('[data-config-subsection="Heading"]');
      const typography = heading.locator('[data-config-subsection="Typography"]');
      assert.equal(await typography.locator('[name="socialHeadingFontSize"]').inputValue(), "16");
      assert.equal(await heading.locator('[data-config-subsection="Transforms"] [name="socialHeading.rotateY"]').count(), 1);
      assert.equal(await heading.locator('[data-config-subsection="Animation in"] [name="socialHeading.entrance"]').inputValue(), "none");
      const appearance = social.locator('[name="social.entrance"]');
      assert.equal(await social.locator('[name="socialCard.entrance"], [name="socialCard.exit"]').count(), 0);
      assert.equal(await appearance.getAttribute("data-title"), "Effect for each account card");
      assert.deepEqual((await appearance.locator("option").allTextContents()).slice(0, 2), ["Default", "Off"]);
      assert.equal(await appearance.inputValue(), "default");
      await appearance.selectOption("slideInLeft", { force: true });
      assert.equal(await social.locator('[name="social.entranceDuration"]').inputValue(), "300");
      assert.equal(await social.locator('[name="social.entranceEasing"]').inputValue(), "ease");
      const match = social.locator('[name="social.matchExit"]');
      const exit = social.locator('[name="social.exit"]');
      assert.equal(await match.isChecked(), true);
      assert.equal(await exit.isDisabled(), true);
      await match.evaluate((input) => input.click());
      await exit.selectOption("zoomOut", { force: true });
      await page.waitForFunction(() => {
        const query = new URL(document.getElementById("overlay-url").value).searchParams;
        return query.get("social.entrance") === "slideInLeft" && query.get("social.matchExit") === "no" && query.get("social.exit") === "zoomOut";
      });
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
        finish = () =>
          route.fulfill({
            status: 412,
            body: "Invalid uploader.",
            headers: { "Access-Control-Allow-Origin": "*" }
          });
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

test("panel downloads preserve artwork, duplicate names and the shared layout", { timeout: 60000 }, async (t) => {
  const browser = await launchBrowser();
  t.after(() => browser.close());
  const page = await browser.newPage();
  await serve(page, await loadAssets(editorAssets));
  await page.route("https://byuwur.github.io/img/logo.png", (route) => route.fulfill({ path: require.resolve("../stream.html.png"), contentType: "image/png", headers: { "Access-Control-Allow-Origin": "*" } }));
  await page.goto("https://stream.test/panels/?fontFamily=Arial#configure");
  const entries = page.locator(".entry-row");
  const row = entries.first();
  await row.locator("select").first().selectOption("image", { force: true });
  const image = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 8;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#00ff00";
    ctx.fillRect(0, 0, 8, 8);
    return canvas.toDataURL();
  });
  await row.locator('[data-field="image"]').fill(image);
  await row.locator('[data-field="filename"]').fill("My logo");
  await row.getByRole("button", { name: "Duplicate panel" }).click();
  assert.equal(await entries.count(), 4);
  await entries.nth(1).locator('[data-field="label"]').fill("Another logo");
  const form = page.locator("#overlay-form");
  assert.match(await form.locator(":scope > section").last().innerText(), /Export image/);
  const toggle = page.locator("#export-toggle");
  assert.equal(await toggle.getAttribute("aria-expanded"), "false");
  await toggle.click();
  const files = [];
  page.on("download", (download) => files.push(download));
  const finalDownload = page.waitForEvent("download", { predicate: (file) => file.suggestedFilename() === "portfolio.png" });
  await page.locator("#export-download").click();
  await finalDownload;
  await page.waitForFunction(() => document.querySelector("#export-status").textContent.includes("4 downloads requested"));
  assert.deepEqual(
    files.map((file) => file.suggestedFilename()),
    ["My logo.png", "My logo-2.png", "buy-me-a-pandebono.png", "portfolio.png"]
  );
  const file = await require("node:fs/promises").readFile(await files[0].path());
  assert.deepEqual([file.readUInt32BE(16), file.readUInt32BE(20)], [360, 120]);
  const pixels = await page.evaluate(async (bytes) => {
    const img = new Image();
    img.src = "data:image/png;base64," + bytes;
    await img.decode();
    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);
    return [
      [0, 0],
      [40, 40]
    ].map(([x, y]) => [...ctx.getImageData(x, y, 1, 1).data]);
  }, file.toString("base64"));
  assert.deepEqual(pixels[0], [0, 0, 0, 0]);
  const [red, green, blue, alpha] = pixels[1];
  assert.ok(red <= 2 && green >= 253 && blue <= 2 && alpha === 255, "Custom artwork must remain opaque green");

  await page.locator("#export-size").selectOption("720", { force: true });
  await page.locator("#export-format").selectOption("jpeg", { force: true });
  const waiting = page.waitForEvent("download");
  await entries.nth(1).locator("[data-export-row]").click();
  const single = await waiting;
  assert.equal(single.suggestedFilename(), "My logo-2.jpg");
  const jpg = await require("node:fs/promises").readFile(await single.path());
  assert.equal(jpg.readUInt16BE(), 0xffd8);
  assert.match(await page.locator("#export-status").textContent(), /1280 × 427/);
  const url = await page.locator("#overlay-url").inputValue();
  await page.goto(url);
  await page.locator(".panel-label").last().waitFor();
  assert.deepEqual(await page.locator(".panel-label").allTextContents(), ["Discord", "Another logo", "Buy me a Pandebono", "Portfolio"]);
  assert.equal(await page.locator("#export-toggle").count(), 0);
});

test("image export preserves the full frame, trims alpha and downloads whole QR modules", { timeout: 60000 }, async (t) => {
  const browser = await launchBrowser();
  t.after(() => browser.close());
  const page = await browser.newPage();
  await serve(page, await loadAssets(editorAssets));
  await page.goto("https://stream.test/qr/?content=Example&showLogo=no#configure");
  await page.locator("#export-toggle").click();
  const download = async () => {
    const waiting = page.waitForEvent("download", { timeout: 15000 });
    await page.locator("#export-download").click();
    const file = await waiting;
    assert.match(file.suggestedFilename(), /^qr_\d{4}-\d\d-\d\d \d\d-\d\d-\d\d-\d{3}\.png$/);
    const data = await require("node:fs/promises").readFile(await file.path());
    return [data.readUInt32BE(16), data.readUInt32BE(20)];
  };
  for (const height of [360, 480, 720, 1080, 1440, 2160]) {
    await page.locator("#export-size").selectOption(String(height), { force: true });
    assert.deepEqual(await download(), [height, height]);
  }
  await page.locator("#export-source").selectOption("frame", { force: true });
  await page.locator("#export-size").selectOption("360", { force: true });
  assert.deepEqual(await download(), [640, 360]);
  await page.locator("#export-crop").check();
  const [width, height] = await download();
  assert.ok(width > 0 && width < 640 && height > 0 && height < 360);
  await page.goto("https://stream.test/popup/?pauseTime=2#configure");
  await page.locator("#overlay-form").waitFor();
  assert.equal(await page.locator("#export-toggle").count(), 0);
});

test("keyboard image export keeps instance colors on shared SVG key shapes", { timeout: 30000 }, async (t) => {
  const browser = await launchBrowser();
  t.after(() => browser.close());
  const page = await browser.newPage();
  await serve(page, await loadAssets(editorAssets));
  await page.goto("https://stream.test/keyboard/?animate=no&customColors=yes&keyColor=00AA00&legendColor=FF00FF#configure");
  await page.frameLocator("#overlay-preview").locator("use.key-legend").first().waitFor({ state: "attached" });
  await page.locator("#export-toggle").click();
  const waiting = page.waitForEvent("download");
  await page.locator("#export-download").click();
  const file = await waiting;
  const bytes = await require("node:fs/promises").readFile(await file.path());
  const colors = await page.evaluate(async (data) => {
    const image = new Image();
    image.src = "data:image/png;base64," + data;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(image, 0, 0);
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let keys = 0,
      legends = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      if (pixels[i + 3] < 250) continue;
      if (pixels[i] < 40 && pixels[i + 1] > 140 && pixels[i + 2] < 40) keys++;
      if (pixels[i] > 200 && pixels[i + 1] < 50 && pixels[i + 2] > 200) legends++;
    }
    return { keys, legends };
  }, bytes.toString("base64"));
  assert.ok(colors.keys > 1000 && colors.legends > 100, JSON.stringify(colors));
});
