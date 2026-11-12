/*
 * File: tests/resources.cjs
 * Desc: Standalone resource rendering, URL validation, and local-file use without configurator imports.
 */

// --- DEPENDENCIES ---
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const test = require("node:test");
const { chromium, firefox, webkit } = require("playwright");
const { root, runtimeAssets, launchOptions, loadAssets, resourceNames, standaloneHTML, serve } = require("./browser.cjs");

// --- STANDALONE RESOURCE CONTRACTS ---
test("resources render and round-trip URLs without configurator assets", async (t) => {
  const assets = await loadAssets(runtimeAssets);
  const browser = await chromium.launch(launchOptions);
  try {
    // --- PER-RESOURCE RENDERING AND URL ROUND TRIPS ---
    for (const name of await resourceNames()) {
      await t.test(name, async () => {
        const page = await browser.newPage();
        try {
          const errors = [],
            editorRequests = [];
          page.on("pageerror", (error) => errors.push(error.message));
          page.on("request", (request) => {
            if (/configurator\.(js|css)|jquery|bootstrap|select2|pickr|_common\./.test(request.url())) editorRequests.push(request.url());
          });
          await serve(page, assets, true);
          await page.goto(`https://stream.test/${name}/?test=1`);
          await page.waitForFunction(() => window.byStreamResource && window.byStreamOverlay);
          await page.evaluate(() => {
            const resource = byStreamResource;
            if (resource.fields.edgePadding && resource.fields.edgePadding.default !== 16) throw new Error("Viewport edge padding must default to 16px");
            const checkText = (value) => {
              if (typeof value === "string" && value && !value.trim()) throw new Error("Whitespace-only default");
              if (value && typeof value === "object") Object.values(value).forEach(checkText);
            };
            Object.values(resource.fields).forEach((field) => checkText(field.default));
            const zeros = Object.entries(resource.fields).filter(([, field]) => field.zeroIsDefault);
            const settings = structuredClone(resource.settings);
            for (const [name, field] of zeros) {
              if (!(field.default > 0) || !byStream.validParameter(resource.fields, name, "0")) throw new Error(`Invalid zero fallback: ${name}`);
            }
            byStream.applyParameters(resource.fields, settings, new URLSearchParams(zeros.map(([name]) => [name, "0"])));
            for (const [name, field] of zeros) if (settings[name] !== field.default) throw new Error(`Zero did not restore ${name}`);
          });
          const { url, values } = await page.evaluate(() => {
            if (typeof byConfigurator !== "undefined" || typeof jQuery !== "undefined") throw new Error("Editor dependency loaded");
            if (!document.querySelector("body > :not(script, link, template, style)")) throw new Error("Overlay markup was not mounted");
            const resource = byStreamResource;
            const url = byStream.settingsURL(resource, resource.settings);
            if (!resource.urlRequired.length || resource.urlRequired.some((name) => byStream.fieldEnabled(resource.fields, resource.settings, name) && !url.searchParams.has(name))) throw new Error("Required URL settings missing");
            for (const name of url.searchParams.keys()) if (!Object.hasOwn(resource.fields, name)) throw new Error(`Unknown URL setting: ${name}`);
            return { url: url.href, values: Object.fromEntries([...url.searchParams].filter(([name]) => byStream.fieldEnabled(resource.fields, resource.settings, name))) };
          });
          await page.goto(url);
          await page.waitForFunction(() => window.byStreamResource && window.byStreamOverlay);
          // Inactive fields reset to defaults, including timestamps recreated during startup.
          const restored = await page.evaluate(() => {
            const resource = byStreamResource;
            return Object.fromEntries([...byStream.settingsURL(resource, resource.settings).searchParams].filter(([name]) => byStream.fieldEnabled(resource.fields, resource.settings, name)));
          });
          assert.deepEqual(restored, values);
          assert.deepEqual(editorRequests, []);
          assert.deepEqual(errors, []);
        } finally {
          await page.close();
        }
      });
    }

    // --- COMPLETE CONTROLLER DOCUMENTS AND INPUT STATES ---
    await t.test("integration SVGs render independently and own their geometry and painting order", async () => {
      const page = await browser.newPage();
      try {
        const dependencies = [];
        page.on("request", (request) => {
          if (!request.url().endsWith(".svg")) dependencies.push(request.url());
        });
        const files = (await fs.readdir(path.join(root, "controller", "controllers"))).filter((name) => name.endsWith(".svg"));
        assert.equal(files.length, 32);
        for (const file of files) {
          await page.goto(pathToFileURL(path.join(root, "controller", "controllers", file)).href);
          const result = await page.evaluate(() => {
            const svg = document.documentElement;
            const ids = [...svg.querySelectorAll("[id]")].map((node) => node.id);
            const references = [...svg.querySelectorAll("*")].flatMap((node) => [...node.attributes].flatMap((attribute) => [...attribute.value.matchAll(/url\(#([^)]*)\)/g)].map((match) => match[1])));
            const sticks = svg.querySelectorAll(".control[data-axes]").length;
            return {
              valid: svg.localName === "svg" && !svg.querySelector("parsererror"),
              unique: new Set(ids).size === ids.length,
              references: references.every((id) => ids.includes(id)),
              shell: [...svg.querySelectorAll(".shell-base")].every((node) => {
                const color = document.createElementNS(svg.namespaceURI, "circle");
                color.style.fill = node.getAttribute("fill");
                svg.append(color);
                const matches = getComputedStyle(color).fill === getComputedStyle(node).fill;
                color.remove();
                return matches;
              }),
              sockets: svg.dataset.controller === "fgc" || svg.querySelectorAll(".analog-socket").length === sticks,
              wordsHidden: [...svg.querySelectorAll(".word-label")].every((node) => getComputedStyle(node).display === "none"),
              vectorLabels: !svg.querySelector(".hardware-icon text"),
              uniformOutlines: [...svg.querySelectorAll(".vector-outline")]
                .filter((node) => !node.closest("defs, .marking, .hardware-icon, .guide-logo-original") && getComputedStyle(node).stroke !== "none")
                .every((node) => parseFloat(getComputedStyle(node).strokeWidth) === 3),
              triggerGeometry: [...svg.querySelectorAll(".analog-trigger")].every((control) => {
                const face = control.querySelector(".full-geometry .button-face"),
                  active = control.querySelector(".trigger-active .full-geometry .button-face"),
                  bounds = face.getBBox(),
                  pressure = control.dataset.pressureFullBounds.split(" ").map(Number);
                return (
                  [bounds.x, bounds.y, bounds.width, bounds.height].every((value, i) => Math.abs(value - pressure[i]) < 0.02) &&
                  face.getAttribute("d") === active.getAttribute("d") &&
                  getComputedStyle(face).strokeWidth === getComputedStyle(active).strokeWidth &&
                  getComputedStyle(face).strokeWidth === getComputedStyle(svg.querySelector("#shell .shell-base")).strokeWidth
                );
              }),
              rotatedLabelsAligned:
                svg.dataset.controller !== "steamdeck" ||
                [2, 3].every((slot) => {
                  const control = svg.querySelector(`[data-input="button:${slot}"]`);
                  const face = control.querySelector(".button-face").getBoundingClientRect();
                  const glyph = control.querySelector(".hardware-icon").getBoundingClientRect();
                  return glyph.x > face.x && glyph.y > face.y && glyph.x + glyph.width < face.x + face.width && glyph.y + glyph.height < face.y + face.height;
                }),
              selfContained: ![...document.childNodes].some((node) => node.nodeType === Node.PROCESSING_INSTRUCTION_NODE),
              compactStrokesScale: (() => {
                svg.dataset.layout = "minimal";
                const matches = [...svg.querySelectorAll(".vector-outline")].every((node) => getComputedStyle(node).vectorEffect === "none");
                svg.dataset.layout = "full";
                return matches;
              })()
            };
          });
          for (const [check, passed] of Object.entries(result)) assert.equal(passed, true, `${file}: ${check}`);
        }
        assert.deepEqual(dependencies, []);
        await page.goto(pathToFileURL(path.join(root, "controller", "controllers", "ds2.svg")).href);
        assert.equal(
          await page.evaluate(() => {
            const shell = document.getElementById("shell");
            const bumpers = [4, 5].map((slot) => document.getElementById(`input-${slot}`));
            const triggers = [6, 7].map((slot) => document.getElementById(`input-${slot}`));
            return (
              bumpers.every((node) => node.compareDocumentPosition(shell) & Node.DOCUMENT_POSITION_FOLLOWING) &&
              triggers.every((node, i) => {
                const trigger = node.querySelector(".full-geometry .button-face"),
                  bumper = bumpers[i].querySelector(".full-geometry .button-face"),
                  bounds = trigger.getBBox();
                for (let x = 0; x < 31; x++)
                  for (let y = 0; y < 31; y++) {
                    const point = new DOMPoint(bounds.x + (bounds.width * (x + 0.37)) / 31, bounds.y + (bounds.height * (y + 0.37)) / 31);
                    if (trigger.isPointInFill(point) && bumper.isPointInFill(point)) return false;
                  }
                return true;
              })
            );
          }),
          true,
          "DualShock 2 bumpers paint behind the shell and triggers have an authored gap"
        );
      } finally {
        await page.close();
      }
    });

    await t.test("Fight Stick skin choices share artwork and expose eight, six, or four face buttons", async () => {
      const page = await browser.newPage(),
        native = await browser.newPage();
      try {
        await serve(page, assets, true);
        await page.addInitScript(() => {
          window.testPad = { id: "Fight Stick variants", index: 0, buttons: Array.from({ length: 40 }, () => ({ value: 0 })), axes: [0, 0, 0, 0] };
          Object.defineProperty(navigator, "getGamepads", { value: () => [testPad] });
        });
        for (const [skin, slots] of [
          ["fgc", [0, 1, 2, 3, 4, 5, 6, 7]],
          ["fgc6", [0, 1, 2, 3, 5, 7]],
          ["fgc4", [0, 1, 2, 3]]
        ]) {
          await native.goto(`${pathToFileURL(path.join(root, "controller/controllers/fgc.svg"))}${skin === "fgc" ? "" : `#${skin}`}`);
          assert.deepEqual(
            await native.locator(".control[data-input]").evaluateAll((nodes) =>
              nodes
                .filter((node) => Number(node.dataset.input.split(":")[1]) < 8 && getComputedStyle(node).display !== "none")
                .map((node) => Number(node.dataset.input.split(":")[1]))
                .sort()
            ),
            slots,
            `${skin} renders independently`
          );
          for (const layout of ["full", "minimal"]) {
            await page.goto(`https://stream.test/controller/?player=1&skin=${skin}&layout=${layout}`);
            await page.waitForSelector(".controller.active:not(.disconnected)");
            const faceSlots = await page.locator(".control-layer[data-input]").evaluateAll((nodes) =>
              nodes
                .map((node) => Number(node.dataset.input.split(":")[1]))
                .filter((id) => id < 8)
                .sort()
            );
            assert.deepEqual(faceSlots, slots);
            assert.deepEqual(
              await page.evaluate(
                (skin) =>
                  byControllerArtwork.skins[skin].buttons
                    .filter((button) => button.id < 8)
                    .map((button) => button.id)
                    .sort(),
                skin
              ),
              slots,
              "Mapping choices match visible buttons"
            );
            assert.equal(await page.locator(".control-layer.stick").count(), 1);
            assert.equal(new URL(await page.evaluate(() => byStream.settingsURL(byStreamResource, byStreamResource.settings).href)).searchParams.get("skin"), skin);
            for (const slot of slots) {
              await page.evaluate((slot) => {
                testPad.buttons[slot].value = 1;
              }, slot);
              await page.waitForFunction((slot) => document.querySelector(`.control-layer[data-input="button:${slot}"]`).classList.contains("pressed"), slot);
              assert.equal(await page.locator(".control.pressed").count(), 1);
              await page.evaluate((slot) => {
                testPad.buttons[slot].value = 0;
              }, slot);
              await page.waitForFunction(() => !document.querySelector(".control.pressed"));
            }
          }
        }
      } finally {
        await page.close();
        await native.close();
      }
    });

    await t.test("native controller labels, contours, and shoulder spacing follow their hardware references", async () => {
      const page = await browser.newPage();
      try {
        for (const skin of ["nes", "n64", "snes", "superfamicom", "gcn", "wiinunchuk", "ps", "ds2", "ds3", "ds4", "ds5", "steam", "steam2", "steamdeck", "wiiupro", "x360", "xseries"]) {
          await page.goto(pathToFileURL(path.join(root, `controller/controllers/${skin}.svg`)).href);
          const result = await page.evaluate((skin) => {
            const root = document.documentElement,
              control = (slot) => root.querySelector(`[data-input="button:${slot}"]`),
              box = (node) => node.getBBox(),
              center = (b) => [b.x + b.width / 2, b.y + b.height / 2];
            if (skin === "nes")
              return [0, 1].every((slot) => {
                const b = box(control(slot).querySelector(".full-hardware path"));
                const face = box(control(slot).querySelector(".button-face"));
                return b.width > b.height && Math.abs(b.x + b.width / 2 - face.x - face.width / 2) < 0.02;
              });
            if (skin === "n64") {
              const z = control(6),
                shell = root.querySelector("#shell"),
                label = z.querySelector(".full-geometry .hardware-icon").getBoundingClientRect(),
                face = z.querySelector(".full-geometry .button-face").getBoundingClientRect(),
                body = shell.getBoundingClientRect();
              return Boolean(z.compareDocumentPosition(shell) & Node.DOCUMENT_POSITION_FOLLOWING) && face.top < body.top && face.bottom > body.top && label.bottom < body.top;
            }
            if (["snes", "superfamicom"].includes(skin))
              return [0, 1, 2, 3].every((slot) => {
                const g = control(slot),
                  face = center(box(g.querySelector(".button-face"))),
                  label = center(box(g.querySelector(".full-hardware path"))),
                  right = ["X", "A"].includes(g.dataset.label);
                return right ? label[0] > face[0] && label[1] < face[1] : label[0] < face[0] && label[1] > face[1];
              });
            if (skin === "gcn") return !root.querySelector(".shell-shadow") && root.querySelectorAll("#housing-shape use").length === 3 && [6, 7].every((slot) => box(control(slot).querySelector(".button-face")).height > 45);
            if (skin === "wiinunchuk") {
              const z = box(control(6).querySelector(".button-face")),
                c = box(control(4).querySelector(".button-face")),
                cap = box(control(10).querySelector(".button-face")),
                body = box(root.querySelector("#shell-surfaces > path"));
              return Math.abs(center(z)[0] - center(cap)[0]) < 0.01 && Math.abs(center(c)[0] - center(cap)[0]) < 0.01 && z.y + z.height < c.y && c.y + c.height < cap.y - 12 && body.width / body.height > 0.3;
            }
            if (["steam", "steam2", "steamdeck", "wiiupro", "x360", "xseries"].includes(skin)) {
              const solids = [...root.querySelectorAll("#shell .shell-base, #shell .shell-panel")].filter((node) => node.isPointInFill);
              const inside = (shape, x, y) => shape.isPointInFill(new DOMPoint(x, y).matrixTransform(root.getCTM().inverse().multiply(shape.getCTM()).inverse()));
              return [4, 5].every((slot) => {
                const g = control(slot),
                  face = g.querySelector(".full-geometry .button-face"),
                  label = box(g.querySelector(".full-geometry .hardware-icon")),
                  [cx, cy] = center(label);
                const bounds = box(face),
                  coveredBase = skin !== "steamdeck" || [0.01, 0.5, 0.99].every((ratio) => solids.some((shape) => inside(shape, bounds.x + bounds.width * ratio, bounds.y + bounds.height - 0.1)));
                return (
                  coveredBase && [-0.4, 0, 0.4].every((x) => [-0.4, 0, 0.4].every((y) => inside(face, cx + x * label.width, cy + y * label.height) && !solids.some((shape) => inside(shape, cx + x * label.width, cy + y * label.height))))
                );
              });
            }
            return [
              [6, 4],
              [7, 5]
            ].every(([trigger, bumper]) => {
              const t = box(control(trigger).querySelector(".button-face")),
                b = box(control(bumper).querySelector(".button-face"));
              const edge = (shape, x, upper) => {
                const bounds = box(shape),
                  step = bounds.height / 150,
                  inside = (y) => shape.isPointInFill(new DOMPoint(x, y));
                for (let i = 0; i <= 150; i++) {
                  const y = upper ? bounds.y + i * step : bounds.y + bounds.height - i * step;
                  if (!inside(y)) continue;
                  let lo = upper ? y - step : y,
                    hi = upper ? y : y + step;
                  for (let j = 0; j < 16; j++) {
                    const mid = (lo + hi) / 2;
                    if (inside(mid) === upper) hi = mid;
                    else lo = mid;
                  }
                  return (lo + hi) / 2;
                }
                return NaN;
              };
              return (
                Math.abs(t.width - b.width * 0.9) < 0.02 &&
                Math.abs(t.x + t.width / 2 - b.x - b.width / 2) < 0.02 &&
                [0.25, 0.5, 0.75].every((ratio) => {
                  const x = t.x + t.width * ratio,
                    gap = edge(control(bumper).querySelector(".button-face"), x, true) - edge(control(trigger).querySelector(".button-face"), x, false);
                  const outline = (parseFloat(getComputedStyle(control(trigger).querySelector(".button-face")).strokeWidth) + parseFloat(getComputedStyle(control(bumper).querySelector(".button-face")).strokeWidth)) / 2;
                  return gap - outline > t.height * 0.05 && gap - outline < t.height * 0.1;
                })
              );
            });
          }, skin);
          assert.equal(result, true, skin);
        }
      } finally {
        await page.close();
      }
    });

    await t.test("controller symmetry preserves paired artwork, concentric sockets, and proportional compact grids", async () => {
      const native = await browser.newPage(),
        page = await browser.newPage();
      try {
        await serve(page, assets, true);
        const models = (await fs.readdir(path.join(root, "controller/controllers"))).filter((name) => name.endsWith(".svg")).map((name) => name.slice(0, -4));
        for (const skin of models) {
          await native.goto(pathToFileURL(path.join(root, "controller/controllers/" + skin + ".svg")).href);
          const artwork = await native.evaluate((skin) => {
            const svg = document.documentElement,
              input = (slot) => svg.querySelector('[data-input="button:' + slot + '"]'),
              face = (g) => g.querySelector(".full-geometry .button-face"),
              rootMatrix = (n) => svg.getCTM().inverse().multiply(n.getCTM());
            const box = (n) => {
              const b = n.getBBox(),
                m = rootMatrix(n),
                a = new DOMPoint(b.x, b.y).matrixTransform(m),
                z = new DOMPoint(b.x + b.width, b.y + b.height).matrixTransform(m);
              return { x: Math.min(a.x, z.x), y: Math.min(a.y, z.y), w: Math.abs(z.x - a.x), h: Math.abs(z.y - a.y) };
            };
            const inside = (n, x, y) => n.isPointInFill(new DOMPoint(x, y).matrixTransform(rootMatrix(n).inverse()));
            const baseNodes = [...svg.querySelectorAll("#shell .shell-base")],
              bases = baseNodes.filter((n) => n.isPointInFill),
              boxes = baseNodes.map(box),
              minX = Math.min(...boxes.map((b) => b.x)),
              maxX = Math.max(...boxes.map((b) => b.x + b.w)),
              axis = (minX + maxX) / 2;
            let bodyErrors = 0;
            if (!["gcn", "fgc", "wiinunchuk"].includes(skin) && boxes.length) {
              const top = Math.min(...boxes.map((b) => b.y)),
                bottom = Math.max(...boxes.map((b) => b.y + b.h));
              for (let i = 0; i < 36; i++)
                for (let j = 0; j < 45; j++) {
                  const x = minX + ((axis - minX) * (i + 0.37)) / 36,
                    y = top + ((bottom - top) * (j + 0.37)) / 45;
                  if (bases.some((n) => inside(n, x, y)) !== bases.some((n) => inside(n, axis * 2 - x, y))) bodyErrors++;
                }
            }
            const pairs = [];
            if (!["fgc", "xbox", "nes", "famicom", "mastersystem", "genesis", "turbografx", "playdate", "wii", "wiinunchuk"].includes(skin)) pairs.push(skin === "wiiclassic" ? [6, 7] : [4, 5]);
            if (["ps", "ds2", "ds3", "ds4", "ds5", "xbox", "x360", "xone", "xseries", "gcn", "wiiupro", "wiiu", "joycon", "switchpro", "steam", "steam2", "steamdeck", "dreamcast", "wiiclassic"].includes(skin))
              pairs.push(skin === "wiiclassic" ? [4, 5] : [6, 7]);
            const paired = pairs
              .filter(([a, b]) => input(a) && input(b))
              .every(([a, b]) => {
                const left = face(input(a)),
                  right = face(input(b)),
                  l = box(left),
                  r = box(right);
                if (Math.abs(l.x + l.w / 2 + r.x + r.w / 2 - axis * 2) > 0.02 || Math.abs(l.y - r.y) > 0.02 || Math.abs(l.w - r.w) > 0.02 || Math.abs(l.h - r.h) > 0.02) return false;
                for (let i = 0; i < 21; i++)
                  for (let j = 0; j < 17; j++) {
                    const x = l.x + (l.w * (i + 0.31)) / 21,
                      y = l.y + (l.h * (j + 0.31)) / 17;
                    if (inside(left, x, y) !== inside(right, axis * 2 - x, y)) return false;
                  }
                return true;
              });
            const proportional = [...svg.querySelectorAll("[data-compact-transform]")].every((n) => {
              const m = n.dataset.compactTransform.match(/-?[\d.]+/g).map(Number);
              return Math.abs(m[0] - m[3]) < 0.00002 && m[1] === 0 && m[2] === 0;
            });
            return { bodyErrors, paired, proportional };
          }, skin);
          assert.equal(artwork.bodyErrors, 0, skin + " body silhouette is bilateral");
          assert.equal(artwork.paired, true, skin + " shoulders and triggers mirror their counterpart");
          assert.equal(artwork.proportional, true, skin + " never stretches controls for compact mode");
          for (const layout of ["full", "minimal"]) {
            await page.goto("https://stream.test/controller/?player=9&skin=" + skin + "&layout=" + layout);
            await page.waitForSelector(".controller.active:not(.disconnected)");
            const sticks = await page.locator(".control-layer.stick .press-visual .full-geometry").evaluateAll((nodes) =>
              nodes.map((n) => {
                const b = n.getBoundingClientRect();
                return { w: b.width, h: b.height };
              })
            );
            if (sticks.length === 2 && skin !== "gcn") assert.ok(Math.abs(sticks[0].w - sticks[1].w) < 0.15 && Math.abs(sticks[0].h - sticks[1].h) < 0.15, skin + "/" + layout + " has equal stick sizes");
            const sockets = await page.locator('.fixed-layer[data-for="button:10"] .layout-position, .fixed-layer[data-for="button:11"] .layout-position').evaluateAll((nodes) =>
              nodes.map((n) => {
                const b = n.getBoundingClientRect();
                return { w: b.width, h: b.height };
              })
            );
            if (sockets.length === 2 && skin !== "gcn") assert.ok(Math.abs(sockets[0].w - sockets[1].w) < 0.15 && Math.abs(sockets[0].h - sockets[1].h) < 0.15, skin + "/" + layout + " has equal socket sizes");
            if (skin === "xseries") {
              const centered = await page.evaluate(() => {
                const pad = document.querySelector('.control-layer[data-input="button:12"] .layout-position').getBoundingClientRect(),
                  dish = document.querySelector('.fixed-layer[data-for="button:12"] .layout-position circle').getBoundingClientRect();
                return Math.abs(pad.x + pad.width / 2 - dish.x - dish.width / 2) < 0.15 && Math.abs(pad.y + pad.height / 2 - dish.y - dish.height / 2) < 0.15;
              });
              assert.equal(centered, true, "Xbox Series D-pad remains centered in its dish in " + layout);
            }
            if (
              layout === "minimal" &&
              ["snes", "superfamicom", "ps", "ds2", "ds3", "ds4", "ds5", "x360", "xone", "xseries", "joycon", "switchpro", "wiiclassic", "wiiu", "wiiupro", "steam", "steam2", "steamdeck", "dreamcast"].includes(skin)
            ) {
              assert.equal(
                await page.evaluate(() => {
                  const nodes = [0, 1, 2, 3].map((slot) => document.querySelector('.control-layer[data-input="button:' + slot + '"] .full-geometry .button-face')),
                    boxes = nodes.map((node) => node.getBoundingClientRect()),
                    centers = boxes.map((b) => [b.x + b.width / 2, b.y + b.height / 2]),
                    strokes = nodes.map((node) => {
                      const m = node.getScreenCTM();
                      return parseFloat(getComputedStyle(node).strokeWidth) * Math.hypot(m.a, m.b);
                    });
                  return [
                    [0, 1],
                    [1, 3],
                    [3, 2],
                    [2, 0]
                  ].every(([a, b]) => {
                    const distance = Math.hypot(centers[a][0] - centers[b][0], centers[a][1] - centers[b][1]),
                      gap = distance - (boxes[a].width + boxes[b].width + strokes[a] + strokes[b]) / 2;
                    return distance < boxes[a].width * 1.5 && gap > boxes[a].width * 0.1;
                  });
                }),
                true,
                skin + " keeps the compact face cluster close"
              );
            }
          }
        }
      } finally {
        await native.close();
        await page.close();
      }
    });

    await t.test("compact grids retain gutters, horizontal shoulder bars, and simultaneous stick clearance", async () => {
      const page = await browser.newPage();
      try {
        await serve(page, assets, true);
        await page.addInitScript(() => {
          window.testPad = { id: "Compact clearance", index: 0, buttons: Array.from({ length: 40 }, () => ({ value: 0 })), axes: [0, 0, 0, 0] };
          Object.defineProperty(navigator, "getGamepads", { value: () => [testPad] });
        });
        const models = (await fs.readdir(path.join(root, "controller/controllers"))).filter((name) => name.endsWith(".svg")).map((name) => name.slice(0, -4));
        for (const skin of models) {
          await page.goto("https://stream.test/controller/?player=1&skin=" + skin + "&layout=minimal");
          await page.waitForSelector(".controller.active:not(.disconnected)");
          const spacing = await page.evaluate((skin) => {
            const box = (slot) => document.querySelector('.control-layer[data-input="button:' + slot + '"] .press-visual').getBoundingClientRect();
            const bars = [...document.querySelectorAll(".minimal-bar-base > rect")].map((node) => node.getBoundingClientRect()).sort((a, b) => a.x - b.x);
            const separated = bars.every((b, i) => b.width > b.height * 2.5 && (!i || b.x > bars[i - 1].right));
            const labels = [...document.querySelectorAll(".minimal-bar-base")].every((node) => {
              const bar = node.querySelector("rect").getBoundingClientRect(),
                label = node.querySelector(".minimal-bar-label").getBoundingClientRect();
              return label.width > 0 && label.height > 0 && label.x > bar.x && label.right < bar.right && label.y > bar.y && label.bottom < bar.bottom;
            });
            const belowFaces = ["nes", "famicom", "turbografx", "playdate"].includes(skin)
              ? [...document.querySelectorAll('.control-layer[data-input="button:8"], .control-layer[data-input="button:9"], .control-layer[data-input="button:16"]')].every(
                  (node) => node.querySelector(".press-visual").getBoundingClientRect().top > Math.max(box(0).bottom, box(1).bottom)
                )
              : true;
            const directions = skin === "joycon" ? [12, 13, 14, 15].map(box) : [];
            const dpadSeparated = directions.every((a, i) => directions.slice(i + 1).every((b) => a.right < b.left || b.right < a.left || a.bottom < b.top || b.bottom < a.top));
            return { separated, belowFaces, labels, dpadSeparated };
          }, skin);
          assert.equal(spacing.separated, true, skin + " keeps long shoulder bars separate");
          assert.equal(spacing.dpadSeparated, true, skin + " keeps all four D-pad directions visible and separate");
          assert.equal(spacing.labels, true, skin + " keeps each shoulder label inside its bar");
          assert.equal(spacing.belowFaces, true, skin + " puts auxiliary buttons below the face pair");
          for (const mode of ["letters", "none", "icons"]) {
            const shown = await page.evaluate((mode) => {
              for (const svg of document.querySelectorAll(".controller svg")) svg.dataset.labels = mode;
              return [...document.querySelectorAll(".minimal-bar-base .minimal-bar-label")].every((node) => node.getBoundingClientRect().width > 0 === (mode !== "none"));
            }, mode);
            assert.equal(shown, true, skin + " honors bar labels in " + mode + " mode");
          }
          if (skin === "fgc") assert.equal(await page.locator('.control-layer[data-input="button:8"], .control-layer[data-input="button:9"]').count(), 0);
          const axes = await page.locator(".control-layer.stick[data-axes]").evaluateAll((nodes) => nodes.map((node) => node.dataset.axes.split(" ").map(Number)));
          if (axes.length !== 2) continue;
          for (const layout of ["full", "minimal"]) {
            await page.evaluate((layout) => byControllerArtwork.setLayout(document.querySelector(".controller"), layout), layout);
            for (const vertical of [-1, 0, 1]) {
              await page.evaluate(
                async ({ axes, vertical }) => {
                  testPad.axes.fill(0);
                  testPad.axes[axes[0][0]] = 1;
                  testPad.axes[axes[0][1]] = vertical;
                  testPad.axes[axes[1][0]] = -1;
                  testPad.axes[axes[1][1]] = vertical;
                  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
                },
                { axes, vertical }
              );
              assert.equal(
                await page.locator(".control-layer.stick[data-axes]").evaluateAll((nodes) => {
                  const bounds = nodes.map((node) => node.querySelector(".press-visual").getBoundingClientRect());
                  return bounds[0].right < bounds[1].left || bounds[1].right < bounds[0].left || bounds[0].bottom < bounds[1].top || bounds[1].bottom < bounds[0].top;
                }),
                true,
                skin + "/" + layout + " sticks remain separate when both move inward"
              );
            }
          }
        }
      } finally {
        await page.close();
      }
    });

    await t.test("Wii Classic shoulders are digital, Saturn C and Z are distinct, and Steam lettering matches", async () => {
      const page = await browser.newPage();
      try {
        await serve(page, assets, true);
        await page.addInitScript(() => {
          window.testPad = { id: "Shoulder mappings", index: 0, buttons: Array.from({ length: 40 }, () => ({ value: 0 })), axes: [0, 0, 0, 0] };
          Object.defineProperty(navigator, "getGamepads", { value: () => [testPad] });
        });
        for (const layout of ["full", "minimal"]) {
          await page.goto(`https://stream.test/controller/?player=1&skin=wiiclassic&layout=${layout}`);
          await page.waitForSelector(".controller.active:not(.disconnected)");
          assert.equal(await page.locator(".analog-trigger, .trigger-active").count(), 0);
          await page.evaluate(() => {
            testPad.buttons[6].value = testPad.buttons[7].value = 0.25;
          });
          await page.waitForFunction(() => document.querySelectorAll(".control.pressed").length === 2);
          assert.deepEqual(await page.locator(".control.pressed").evaluateAll((nodes) => nodes.map((node) => node.dataset.label).sort()), ["L", "R"]);
          await page.goto(`https://stream.test/controller/?player=1&skin=saturn&layout=${layout}`);
          await page.waitForSelector(".controller.active:not(.disconnected)");
          for (const [slot, label] of [
            [6, "Z"],
            [7, "C"]
          ]) {
            await page.evaluate((slot) => {
              testPad.buttons[slot].value = 1;
            }, slot);
            await page.waitForFunction(() => document.querySelectorAll(".control.pressed").length === 1);
            assert.equal(await page.locator(".control.pressed").getAttribute("data-label"), label);
            await page.evaluate((slot) => {
              testPad.buttons[slot].value = 0;
            }, slot);
            await page.waitForFunction(() => !document.querySelector(".control.pressed"));
          }
          for (const skin of ["steam2", "steamdeck"]) {
            await page.goto(`https://stream.test/controller/?player=1&skin=${skin}&layout=${layout}`);
            await page.waitForSelector(".controller.active:not(.disconnected)");
            assert.equal(
              await page
                .locator(".control-layer[data-input] .hardware-icon path")
                .evaluateAll((nodes) => nodes.filter((node) => Number(node.closest(".control-layer").dataset.input.split(":")[1]) < 4).every((node) => getComputedStyle(node).fill !== "none" && getComputedStyle(node).stroke === "none")),
              true,
              `${skin}/${layout} uses filled hardware lettering throughout`
            );
          }
        }
      } finally {
        await page.close();
      }
    });

    await t.test("stock variants, proportional outlines, and animated guide images preserve input", async () => {
      const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
      try {
        const errors = [];
        page.on("pageerror", (error) => errors.push(error.message));
        await page.addInitScript(() => {
          window.testPad = { id: "Appearance fixture", index: 0, buttons: Array.from({ length: 40 }, () => ({ value: 0 })), axes: [0, 0, 0, 0] };
          Object.defineProperty(navigator, "getGamepads", { value: () => [testPad] });
        });
        await serve(page, assets, true);
        const open = async (values = {}) => {
          await page.goto(`https://stream.test/controller/?${new URLSearchParams({ player: "1", skin: "xone", ...values })}`);
          await page.waitForSelector(".controller.active:not(.disconnected)");
        };
        const shellColor = () =>
          page
            .locator(".controller-background .shell-base")
            .first()
            .evaluate((node) => getComputedStyle(node).fill);
        await open();
        const stock = await shellColor();
        assert.equal(await page.evaluate(() => byStreamResource.settings.customColors), "no");
        assert.equal(await page.locator(".controller").evaluate((node) => node.style.getPropertyValue("--controller-color")), "");
        const baseline = await page.locator(".vector-outline").evaluateAll((nodes) => nodes.filter((node) => !node.closest("defs, .marking, .hardware-icon, .guide-logo-original")).map((node) => getComputedStyle(node).strokeWidth));
        await open({ customColors: "yes", outlineWidth: "1.5" });
        const scaled = await page.locator(".vector-outline").evaluateAll((nodes) => nodes.filter((node) => !node.closest("defs, .marking, .hardware-icon, .guide-logo-original")).map((node) => getComputedStyle(node).strokeWidth));
        assert.deepEqual([...new Set(baseline)], ["3px"], "All structural outlines share the same authored width");
        assert.equal(scaled.length, baseline.length);
        // Computed SVG widths have limited decimal precision.
        assert.ok(scaled.every((width, i) => Math.abs(parseFloat(width) - parseFloat(baseline[i]) * 1.5) < 0.00001));
        await open({ controllerColor: "2255cc" });
        assert.equal(await shellColor(), "rgb(34, 85, 204)", "Legacy color URLs enable customization");
        await open({ customColors: "no", controllerColor: "2255cc", customGuide: "yes" });
        assert.equal(await shellColor(), stock, "Explicit Off restores native artwork despite retained custom values");
        assert.equal(await page.locator(".guide-logo-custom").count(), 0);
        await open({ controllerColor: "invalid" });
        assert.equal(await shellColor(), stock, "Invalid legacy colors retain the stock default");
        for (const [variant, color] of [
          ["silver", "rgb(174, 181, 191)"],
          ["white", "rgb(226, 228, 226)"]
        ]) {
          await open({ skin: "ds2", variant, customColors: "no" });
          assert.equal(await shellColor(), color);
        }
        await open({ customColors: "yes", controllerColor: "2255cc", tintOutlines: "yes", customOutlineColor: "yes", outlineColor: "ff00ff" });
        assert.equal(
          await page
            .locator(".controller-background .shell-base")
            .first()
            .evaluate((node) => getComputedStyle(node).stroke),
          "rgb(10, 24, 57)"
        );
        for (const guideSymbol of ["xbox", "playstation", "steam", "circle", "diamond", "star"]) {
          await open({ customColors: "yes", customGuide: "yes", guideSymbol });
          assert.equal(await page.locator(".guide-logo-custom").count(), 1, guideSymbol);
        }
        // Two independently encoded frames exercise actual SVG image animation, beyond the load event.
        const frame = (index) => {
          let value = 0,
            bits = 0;
          const bytes = [];
          for (const code of [4, index, 4, index, 4, index, 4, index, 5]) {
            value |= code << bits;
            bits += 3;
            while (bits >= 8) {
              bytes.push(value & 255);
              value >>= 8;
              bits -= 8;
            }
          }
          if (bits) bytes.push(value & 255);
          return Buffer.concat([Buffer.from("21f904000a0000002c00000000020002000002", "hex"), Buffer.from([bytes.length, ...bytes, 0])]);
        };
        const gif = Buffer.concat([Buffer.from("47494638396102000200800000ff00000000ff21ff0b4e45545343415045322e300301000000", "hex"), frame(0), frame(1), Buffer.from([0x3b])]);
        const images = await page.evaluate(() => {
          const canvas = document.createElement("canvas");
          canvas.width = 8;
          canvas.height = 4;
          const context = canvas.getContext("2d");
          context.fillStyle = "#33bb77";
          context.fillRect(0, 0, 8, 4);
          return Object.fromEntries(["png", "jpeg", "webp"].map((type) => [type, canvas.toDataURL(`image/${type}`).split(",")[1]]));
        });
        await page.route("https://media.test/**", (route) => {
          const type = new URL(route.request().url()).pathname.split(".").pop();
          if (type === "gif") return route.fulfill({ contentType: "image/gif", body: gif });
          if (type === "svg")
            return route.fulfill({ contentType: "image/svg+xml", body: '<svg xmlns="http://www.w3.org/2000/svg" width="8" height="4"><rect width="8" height="4" fill="#33bb77"/><script>parent.untrustedGuideExecuted=true</script></svg>' });
          if (images[type]) return route.fulfill({ contentType: `image/${type}`, body: Buffer.from(images[type], "base64") });
          return route.fulfill({ status: 404, body: "Missing image" });
        });
        for (const type of ["png", "jpeg", "webp", "svg"]) {
          await open({ customColors: "yes", customGuide: "yes", guideSource: "image", guideImage: `https://media.test/guide.${type}` });
          await page.waitForFunction(() => document.querySelector(".guide-logo-custom")?.style.visibility === "visible");
          assert.equal(await page.locator(".guide-logo-custom image").getAttribute("preserveAspectRatio"), "xMidYMid meet");
          assert.equal(await page.evaluate(() => window.untrustedGuideExecuted), undefined);
        }
        for (const layout of ["full", "minimal"]) {
          await open({ customColors: "yes", customGuide: "yes", guideSource: "image", guideImage: "https://media.test/guide.gif", layout });
          await page.waitForFunction(() => document.querySelector(".guide-logo-custom")?.style.visibility === "visible");
          const image = page.locator(".guide-logo-custom image"),
            bounds = await image.boundingBox(),
            colors = new Set();
          for (let i = 0; i < 8; i++) {
            await page.waitForTimeout(70);
            const png = await page.screenshot({ clip: { x: Math.floor(bounds.x + bounds.width / 2), y: Math.floor(bounds.y + bounds.height / 2), width: 1, height: 1 } });
            colors.add(
              await page.evaluate(async (data) => {
                const bitmap = await createImageBitmap(new Blob([Uint8Array.from(atob(data), (char) => char.charCodeAt(0))], { type: "image/png" }));
                const canvas = document.createElement("canvas");
                canvas.width = canvas.height = 1;
                const context = canvas.getContext("2d");
                context.drawImage(bitmap, 0, 0);
                return [...context.getImageData(0, 0, 1, 1).data].slice(0, 3).join(",");
              }, png.toString("base64"))
            );
          }
          assert.deepEqual([...colors].sort(), ["0,0,255", "255,0,0"], `${layout} renders both GIF frames`);
          await image.evaluate((node) => {
            window.originalGuideImage = node;
          });
          await page.evaluate(() => {
            testPad.buttons[16].value = 1;
            byControllerArtwork.setLayout(document.querySelector(".controller"), byStreamResource.settings.layout === "full" ? "minimal" : "full");
          });
          await page.waitForFunction(() => document.querySelector('.control[data-name="button-meta"]').classList.contains("pressed"));
          assert.equal(await image.evaluate((node) => node === originalGuideImage), true, "Input and layout updates keep the animated image mounted");
        }
        for (const guideImage of ["https://media.test/missing.invalid", "javascript:alert(1)", "data:image/svg+xml,<svg/>"]) {
          await open({ customColors: "yes", customGuide: "yes", guideSource: "image", guideImage });
          await page.waitForFunction(() => !document.querySelector(".guide-logo-custom"));
          assert.equal(await page.locator(".guide-logo-original").evaluate((node) => getComputedStyle(node).display !== "none"), true);
        }
        assert.deepEqual(errors, []);
      } finally {
        await page.close();
      }
    });

    await t.test("flat controller library preserves controls, hardware colors, and editable layouts", async () => {
      const page = await browser.newPage();
      try {
        const errors = [];
        page.on("pageerror", (error) => errors.push(error.message));
        await page.addInitScript(() => {
          window.testPad = { id: "Library fixture", index: 0, buttons: Array.from({ length: 40 }, () => ({ value: 0 })), axes: [0, 0, 0, 0] };
          Object.defineProperty(navigator, "getGamepads", { value: () => [testPad] });
        });
        await serve(page, assets, true);
        const files = (await fs.readdir(path.join(root, "controller", "controllers"))).filter((name) => name.endsWith(".svg"));
        assert.equal(files.length, 32);
        assert.ok(!files.includes("move.svg"));
        for (const file of files) {
          const family = path.basename(file, ".svg");
          const source = await fs.readFile(path.join(root, "controller", "controllers", file), "utf8");
          assert.match(source, new RegExp(`data-controller="${family}"`));
          assert.doesNotMatch(source, /data-label="[^"]*\?/, "Hardware labels retain their Unicode symbols");
          assert.doesNotMatch(source, /<script\b|<image\b|foreignObject|data:image/i);
          for (const layout of ["full", "minimal"]) {
            let colors;
            for (const color of ["111111", "ffffff", "205bba"]) {
              await page.goto(`https://stream.test/controller/?player=1&skin=${family}&layout=${layout}&controllerColor=${color}&curve=1`);
              await page.waitForSelector(".controller.active:not(.disconnected) .controller-background", { state: "attached" });
              assert.equal(await page.evaluate((family) => byControllerArtwork.sources[family], family), source);
              const fixed = await page.locator(".control-layer .button-face").evaluateAll((nodes) => nodes.map((node) => getComputedStyle(node).fill));
              if (!colors) {
                const fit = await page.locator(".controller.active").evaluate((node) => {
                  const bounds = node.getBoundingClientRect(),
                    margin = byStreamResource.settings.fitMargin;
                  return Math.abs(Math.max(bounds.width / (innerWidth - margin * 2), bounds.height / (innerHeight - margin * 2)) - 1) < 0.005;
                });
                assert.equal(fit, true, `${family}/${layout} fills the limiting viewport dimension`);
              }
              if (colors) assert.deepEqual(fixed, colors, `${family} preserves hardware colors`);
              colors = fixed;
              if (family === "fgc") assert.equal(await page.locator(".controller-background .shell-base").count(), 0, "Fight stick has no background panel");
              else if (layout === "full")
                assert.equal(
                  await page
                    .locator(".controller-background .shell-base")
                    .first()
                    .evaluate((node) => getComputedStyle(node).fill),
                  `rgb(${[0, 2, 4].map((i) => parseInt(color.slice(i, i + 2), 16)).join(", ")})`
                );
            }
            assert.equal(await page.locator(".controller.active [id]").evaluateAll((nodes) => new Set(nodes.map((node) => node.id)).size === nodes.length), true, `${family} has unique SVG IDs`);
            if (family === "gcn" && layout === "full") {
              assert.equal(
                await page
                  .locator(".physical-shoulder")
                  .evaluateAll((nodes) => nodes.every((node, index) => node.compareDocumentPosition(document.querySelector(`.control-layer[data-input="button:${index + 4}"]`)) & Node.DOCUMENT_POSITION_FOLLOWING)),
                true,
                "GameCube physical shoulders retain source paint order behind ZL/ZR"
              );
            }
            const controls = await page
              .locator(".control-layer")
              .evaluateAll((nodes) => nodes.map((node) => ({ slot: Number(node.dataset.input.split(":")[1]), name: node.dataset.name, analog: node.classList.contains("analog-trigger"), click: node.dataset.stickClick !== "no" })));
            assert.equal(new Set(controls.map((control) => control.name)).size, controls.length);
            for (const control of controls.filter((control) => !control.analog && control.click)) {
              await page.evaluate((slot) => {
                testPad.buttons[slot].value = 1;
              }, control.slot);
              await page.waitForFunction((name) => document.querySelector(`.control[data-name="${name}"]`).classList.contains("pressed"), control.name);
              assert.equal(await page.locator(".control.pressed").count(), 1, `${family}/${layout}/${control.name} is isolated`);
              assert.equal(await page.locator(".control.pressed").evaluate((node) => getComputedStyle(node).filter), "invert(1)");
              await page.evaluate((slot) => {
                testPad.buttons[slot].value = 0;
              }, control.slot);
              await page.waitForFunction(() => !document.querySelector(".control.pressed"));
            }
            if (controls.some((control) => control.name === "stick-1")) {
              await page.evaluate(() => {
                testPad.axes = [1, -1, 0, 0];
              });
              await page.waitForFunction(() => {
                const node = document.querySelector('.control[data-name="stick-1"]');
                const travel = 25 * Number(node.dataset.travelScale || 1) * (node.dataset.layout === "minimal" ? Number(node.dataset.compactScale) : 1);
                const [x, y] = node.style.translate.split(" ").map(parseFloat);
                return Math.abs(x - travel / Math.SQRT2) < 0.0001 && Math.abs(y + travel / Math.SQRT2) < 0.0001;
              });
              assert.equal(await page.locator('.control[data-name="stick-1"]').evaluate((node) => node.style.transform), "rotateX(25deg) rotateY(25deg)");
              if (family === "wiinunchuk" && layout === "full") {
                const cap = await page.locator('.control[data-name="stick-1"] .button-face').boundingBox();
                const z = await page.locator('.control[data-input="button:6"] .press-visual .button-face').boundingBox();
                assert.ok(cap.y > z.y + z.height, "Nunchuk Z clears the moving stick cap");
              }
              await page.evaluate(() => {
                testPad.axes = [0.01, 0.01, 0, 0];
              });
              await page.waitForFunction(() =>
                document
                  .querySelector('.control[data-name="stick-1"]')
                  .style.translate.match(/-?[\d.]+/g)
                  ?.every((value) => Number(value) === 0)
              );
              assert.equal(await page.locator('.control[data-name="stick-1"]').evaluate((node) => node.style.transform), "rotateX(0deg) rotateY(0deg)", "Curving respects the deadzone");
            }
            await page.evaluate(() => {
              window.originalControls = [...document.querySelectorAll(".control-layer")];
              byControllerArtwork.setLayout(document.querySelector(".controller"), byStreamResource.settings.layout === "full" ? "minimal" : "full");
            });
            assert.equal(await page.evaluate(() => originalControls.every((node, index) => node === document.querySelectorAll(".control-layer")[index])), true, "Layout changes reuse every control node");
            assert.equal(
              await page.locator(".control-layer.stick").evaluateAll((nodes) =>
                nodes.every((node) => {
                  const box = node.getBBox(),
                    [x, y] = node.style.transformOrigin.split(" ").map(parseFloat);
                  return Math.abs(x - box.x - box.width / 2 + node.viewBox.baseVal.x) < 0.001 && Math.abs(y - box.y - box.height / 2 + node.viewBox.baseVal.y) < 0.001;
                })
              ),
              true,
              "Curving stays centered after switching layouts"
            );
            await page.evaluate(() =>
              document.querySelectorAll(".controller svg").forEach((node) => {
                node.dataset.labels = "none";
              })
            );
            assert.equal(await page.locator(".marking").evaluateAll((nodes) => nodes.every((node) => getComputedStyle(node).display === "none")), true);
          }
        }
        assert.deepEqual(errors, []);
      } finally {
        await page.close();
      }
    });

    await t.test("optional control tint follows the shell without recoloring rubber or shoulders", async () => {
      const page = await browser.newPage();
      try {
        await serve(page, assets, true);
        const families = (await fs.readdir(path.join(root, "controller", "controllers"))).filter((name) => name.endsWith(".svg")).map((name) => path.basename(name, ".svg"));
        for (const family of families)
          for (const layout of ["full", "minimal"]) {
            const url = `https://stream.test/controller/?player=9&skin=${family}&layout=${layout}&controllerColor=ff9900`;
            await page.goto(url);
            await page.waitForSelector(".controller.active:not(.disconnected)");
            const surfaces = '.control-layer:not(.stick):not([data-name*="-shoulder-"]) .button-face, .control-layer:not(.stick):not([data-name*="-shoulder-"]) .gcn-face';
            const hardware = '.control-layer.stick [fill], .control-layer[data-name*="-shoulder-"] [fill]';
            const colors = await page.locator(surfaces).evaluateAll((nodes) => nodes.map((node) => getComputedStyle(node).fill));
            const fixed = await page.locator(hardware).evaluateAll((nodes) => nodes.map((node) => getComputedStyle(node).fill));
            await page.goto(url + "&tintControls=yes");
            await page.waitForSelector(".controller.active:not(.disconnected)");
            const tinted = await page.locator(surfaces).evaluateAll((nodes) => nodes.map((node) => getComputedStyle(node).fill));
            assert.equal(tinted.length, colors.length);
            assert.notDeepEqual(tinted, colors, `${family}/${layout} tints its button plastics`);
            assert.deepEqual(await page.locator(hardware).evaluateAll((nodes) => nodes.map((node) => getComputedStyle(node).fill)), fixed);
            await page.keyboard.down("j");
            await page.keyboard.down("k");
            await page.waitForFunction(() => document.querySelectorAll(".control.pressed").length === 2);
            assert.equal(await page.locator(".control.pressed").evaluateAll((nodes) => nodes.every((node) => getComputedStyle(node).filter === "invert(1)")), true);
            await page.keyboard.up("j");
            await page.keyboard.up("k");
            await page.waitForFunction(() => !document.querySelector(".control.pressed"));
            assert.deepEqual(await page.locator(surfaces).evaluateAll((nodes) => nodes.map((node) => getComputedStyle(node).fill)), tinted);
            if (family === "ds5" && layout === "full") await page.screenshot({ path: path.join(os.tmpdir(), "controller-ds5-tinted.png") });
          }
        await page.goto("https://stream.test/controller/?player=9&skin=ds5&tintControls=yes&controllerColor=2044dd");
        await page.waitForSelector(".controller.active:not(.disconnected)");
        const blue = await page.locator('.control[data-name="button-1"] .button-face').evaluate((node) => getComputedStyle(node).fill);
        await page.goto("https://stream.test/controller/?player=9&skin=ds5&tintControls=yes&controllerColor=ff9900");
        await page.waitForSelector(".controller.active:not(.disconnected)");
        assert.notEqual(await page.locator('.control[data-name="button-1"] .button-face').evaluate((node) => getComputedStyle(node).fill), blue);
      } finally {
        await page.close();
      }
    });

    await t.test("disconnected tint and opacity apply only until the selected pad reconnects", async () => {
      const page = await browser.newPage();
      try {
        await page.addInitScript(() => {
          window.testPads = [];
          Object.defineProperty(navigator, "getGamepads", { value: () => testPads });
        });
        await serve(page, assets, true);
        for (const layout of ["full", "minimal"]) {
          await page.goto(`https://stream.test/controller/?player=1&skin=xseries&layout=${layout}&opacity=75&disconnectedOpacity=35&disconnectedTint=00ff0080`);
          await page.waitForSelector(".controller.active.disconnected");
          assert.equal(await page.locator(".controller").evaluate((node) => getComputedStyle(node).opacity), "0.35");
          assert.match(await page.locator(".controller-layers").evaluate((node) => getComputedStyle(node).filter), /controller-disconnected-tint/);
          const fixed = await page.locator(".button-face").evaluateAll((nodes) => nodes.map((node) => getComputedStyle(node).fill));
          const tinted = await page.screenshot();
          const tintedURL = page.url();
          await page.goto(tintedURL.replace("disconnectedTint=00ff0080", "disconnectedTint=00000000"));
          await page.waitForSelector(".controller.active.disconnected");
          const untinted = await page.screenshot();
          assert.equal(tinted.equals(untinted), false, "Tint changes rendered pixels");
          await page.goto(tintedURL);
          await page.waitForSelector(".controller.active.disconnected");
          await page.evaluate(() => {
            testPads = [{ id: "Reconnect fixture", index: 0, buttons: Array.from({ length: 23 }, () => ({ value: 0 })), axes: [0, 0, 0, 0] }];
          });
          await page.waitForSelector(".controller.active:not(.disconnected)");
          assert.equal(await page.locator(".controller").evaluate((node) => getComputedStyle(node).opacity), "0.75");
          assert.equal(await page.locator(".controller-layers").evaluate((node) => getComputedStyle(node).filter), "none");
          assert.deepEqual(await page.locator(".button-face").evaluateAll((nodes) => nodes.map((node) => getComputedStyle(node).fill)), fixed);
          await page.evaluate(() => {
            testPads = [];
          });
          await page.waitForSelector(".controller.active.disconnected");
          assert.equal(await page.locator(".controller").evaluate((node) => getComputedStyle(node).opacity), "0.35");
        }
        for (const value of [0, 100]) {
          await page.goto(`https://stream.test/controller/?player=1&skin=xseries&disconnectedOpacity=${value}&disconnectedTint=00000000`);
          await page.waitForSelector(".controller.active", { state: "attached" });
          assert.equal(await page.locator(".controller").evaluate((node) => getComputedStyle(node).opacity), String(value / 100));
        }
      } finally {
        await page.close();
      }
    });

    await t.test("analog pressure fills preserve their base and release in both layouts", async () => {
      const page = await browser.newPage();
      try {
        await page.addInitScript(() => {
          window.testPad = { id: "Trigger fixture", index: 0, buttons: Array.from({ length: 40 }, () => ({ value: 0 })), axes: [0, 0, 0, 0] };
          Object.defineProperty(navigator, "getGamepads", { value: () => [testPad] });
        });
        await serve(page, assets, true);
        for (const skin of ["gcn", "ds5", "xone", "dreamcast", "steamdeck"]) {
          await page.goto(`https://stream.test/controller/?player=1&skin=${skin}`);
          await page.waitForSelector(".controller-background", { state: "attached" });
          for (const layout of ["full", "minimal"]) {
            await page.evaluate((layout) => byControllerArtwork.setLayout(document.querySelector(".controller"), layout), layout);
            for (const pressure of [0, 0.25, 0.5, 0.75, 1, 0]) {
              await page.evaluate((value) => {
                testPad.buttons[6].value = value;
                testPad.buttons[7].value = value;
              }, pressure);
              await page.waitForFunction(
                ({ pressure, layout }) =>
                  [...document.querySelectorAll(".analog-trigger")].every((node) => {
                    const id = node.querySelector(".trigger-active").getAttribute("clip-path").slice(5, -1);
                    const rect = node.querySelector(`[id="${id}"] rect`);
                    const horizontal = layout === "minimal";
                    const bounds = node.dataset.pressureFullBounds.split(" ").map(Number);
                    const inset = Math.min(parseFloat(getComputedStyle(node.querySelector(".full-geometry .vector-outline")).strokeWidth), bounds[2], bounds[3]);
                    const box = horizontal ? node.querySelector(".trigger-active").getBBox() : { height: bounds[3] - inset };
                    return Math.abs(Number(rect.getAttribute(horizontal ? "width" : "height")) / box[horizontal ? "width" : "height"] - pressure) < 0.000001;
                  }),
                { pressure, layout }
              );
              assert.equal(
                await page.locator(".analog-trigger").evaluateAll((nodes) => nodes.every((node) => getComputedStyle(node).filter === "none" && !node.style.clipPath && getComputedStyle(node).opacity === "1")),
                true,
                "Base and outline stay visible without whole-trigger inversion"
              );
            }
          }
        }
        await page.goto("https://stream.test/controller/?player=1&skin=xone&strength=0");
        await page.waitForSelector(".controller-background", { state: "attached" });
        await page.evaluate(() => {
          testPad.buttons[6].value = 0.5;
        });
        await page.waitForFunction(() => {
          const node = document.querySelector('.control[data-input="button:6"]');
          return (
            Math.abs(
              Number(node.querySelector(".trigger-fill-rect").getAttribute("height")) - Number(node.dataset.pressureFullBounds.split(" ")[3]) + parseFloat(getComputedStyle(node.querySelector(".full-geometry .vector-outline")).strokeWidth)
            ) < 0.00001
          );
        });
      } finally {
        await page.close();
      }
    });

    await t.test("screen openings have true alpha and vector appearance settings remain independent", async () => {
      const page = await browser.newPage();
      try {
        await serve(page, assets, true);
        for (const skin of ["steamdeck", "wiiu", "dreamcast", "playdate"]) {
          await page.goto(`https://stream.test/controller/?player=9&skin=${skin}&screenOpacity=0&customColors=yes&customOutlineColor=yes&outlineColor=ff00ff&outlineWidth=1.5&highlightIntensity=50&shadowIntensity=40`);
          await page.waitForSelector(".controller.active:not(.disconnected)");
          const box = await page.locator(".screen-surface").boundingBox();
          box.inset = await page.locator(".screen-surface").evaluate((node) => {
            const matrix = node.getScreenCTM();
            return Math.ceil((parseFloat(getComputedStyle(node.nextElementSibling).strokeWidth) * Math.hypot(matrix.a, matrix.b)) / 2) + 1;
          });
          const opaquePixels = await page.evaluate(
            async ({ x, image }) => {
              const bitmap = await createImageBitmap(new Blob([Uint8Array.from(atob(image), (c) => c.charCodeAt(0))], { type: "image/png" }));
              const canvas = document.createElement("canvas");
              canvas.width = bitmap.width;
              canvas.height = bitmap.height;
              const context = canvas.getContext("2d");
              context.drawImage(bitmap, 0, 0);
              const data = context.getImageData(0, 0, canvas.width, canvas.height).data;
              let opaque = 0;
              for (let py = Math.ceil(x.y) + x.inset; py < x.y + x.height - x.inset; py++) for (let px = Math.ceil(x.x) + x.inset; px < x.x + x.width - x.inset; px++) if (data[(py * canvas.width + px) * 4 + 3]) opaque++;
              return opaque;
            },
            { x: box, image: (await page.screenshot({ omitBackground: true })).toString("base64") }
          );
          assert.equal(opaquePixels, 0, `${skin} screen reveals the layer underneath`);
          assert.equal(
            await page
              .locator(".controller-background .shell-base")
              .first()
              .evaluate((node) => getComputedStyle(node).stroke),
            "rgb(255, 0, 255)"
          );
          assert.equal(
            await page
              .locator(".controller-background .shell-base")
              .first()
              .evaluate((node) => getComputedStyle(node).strokeWidth),
            "4.5px"
          );
          for (const opacity of [0, 50, 100]) {
            const setting = opacity ? `&screenOpacity=${opacity}` : "";
            await page.goto(`https://stream.test/controller/?player=9&skin=${skin}${setting}&controllerColor=${opacity === 50 ? "ffffff" : "111111"}&artworkFilterMode=custom&artworkFilterInvert=100`);
            await page.waitForSelector(".controller.active:not(.disconnected)");
            assert.equal(await page.evaluate(() => byStreamResource.settings.screenOpacity), opacity, "Screens default to a transparent opening");
            await page.evaluate(() => {
              const controller = document.querySelector(".controller");
              byControllerArtwork.setLayout(controller, "minimal");
              byControllerArtwork.setLayout(controller, "full");
            });
            const screen = await page.locator(".screen-surface").boundingBox();
            const sample = async () => {
              const png = await page.screenshot({ omitBackground: true, clip: { x: Math.floor(screen.x + screen.width / 2), y: Math.floor(screen.y + screen.height / 2), width: 1, height: 1 } });
              return page.evaluate(async (image) => {
                const bitmap = await createImageBitmap(new Blob([Uint8Array.from(atob(image), (c) => c.charCodeAt(0))], { type: "image/png" }));
                const canvas = document.createElement("canvas");
                canvas.width = canvas.height = 1;
                const context = canvas.getContext("2d");
                context.drawImage(bitmap, 0, 0);
                return [...context.getImageData(0, 0, 1, 1).data];
              }, png.toString("base64"));
            };
            assert.ok(Math.abs((await sample())[3] - (255 * opacity) / 100) <= 1, `${skin} keeps independent screen alpha through filters and layout changes`);
            if (!opacity) {
              await page.evaluate(() => {
                const backing = document.createElement("div");
                backing.style.cssText = "position:fixed;inset:0;background:#3377bb;z-index:-1";
                document.body.prepend(backing);
              });
              assert.deepEqual((await sample()).slice(0, 3), [51, 119, 187], "The backing color is visible through the screen");
            }
          }
        }
      } finally {
        await page.close();
      }
    });

    await t.test("model-specific controls, compact bounds, and keyboard inputs remain coherent", async () => {
      const page = await browser.newPage();
      try {
        await serve(page, assets, true);
        const families = (await fs.readdir(path.join(root, "controller", "controllers"))).filter((name) => name.endsWith(".svg")).map((name) => path.basename(name, ".svg"));
        for (const skin of families) {
          await page.goto(`https://stream.test/controller/?player=9&skin=${skin}&layout=minimal`);
          await page.waitForSelector(".controller.active:not(.disconnected) .controller-background", { state: "attached" });
          const dimensions = await page.locator(".controller-background").evaluate((node) => ({ full: node.dataset.fullViewbox.split(" ").map(Number), compact: node.dataset.compactViewbox.split(" ").map(Number) }));
          assert.ok(dimensions.compact[2] * dimensions.compact[3] < dimensions.full[2] * dimensions.full[3] * 0.4, `${skin} has its own compact canvas`);
          const overflow = await page.locator(".control-layer .button-face, .control-layer .gcn-face, .fixed-layer .vector-outline").evaluateAll((faces) =>
            faces.some((face) => {
              const box = face.getBoundingClientRect();
              if (!box.width || !box.height) return false;
              const viewport = face.closest("svg").getBoundingClientRect();
              return box.left < viewport.left - 2 || box.right > viewport.right + 2 || box.top < viewport.top - 2 || box.bottom > viewport.bottom + 2;
            })
          );
          assert.equal(overflow, false, `${skin} packs visible controls within the drawing`);
          assert.equal(
            await page.locator(".control-layer:not(.minimal-omit)").evaluateAll((controls) =>
              controls.every((control) =>
                [...control.querySelectorAll(".press-visual :is(path, rect, circle, ellipse, polygon, polyline)")].some((face) => {
                  if (face.closest(".word-label, .full-only-decoration")) return false;
                  const box = face.getBoundingClientRect();
                  return box.width > 0 && box.height > 0;
                })
              )
            ),
            true,
            `${skin} keeps every standard control visible`
          );
          await page.keyboard.down("j");
          await page.waitForFunction(() => document.querySelector('.control[data-name="button-1"]').classList.contains("pressed"));
          await page.keyboard.up("j");
          if (skin === "n64") {
            assert.equal(await page.locator('.control[data-name^="button-c-"]').count(), 4);
            await page.keyboard.down("h");
            await page.waitForFunction(() => document.querySelector('.control[data-name="button-c-right"]').classList.contains("pressed"));
            await page.keyboard.up("h");
          }
          if (skin === "fgc") {
            assert.equal(await page.locator('.control[data-name="stick-2"]').count(), 0);
            const base = await page.locator('.fixed-layer[data-for="button:10"] .vector-outline').boundingBox();
            const ball = await page.locator('.control[data-name="stick-1"] .button-face').boundingBox();
            assert.ok(Math.abs(ball.x + ball.width / 2 - base.x - base.width / 2) < 0.01 && Math.abs(ball.y + ball.height / 2 - base.y - base.height / 2) < 0.01, "The arcade ball rests at the center of its base");
            await page.keyboard.down("ArrowUp");
            await page.waitForFunction(() => parseFloat(document.querySelector('.control[data-name="stick-1"]').style.translate.split(" ")[1]) < 0);
            await page.keyboard.up("ArrowUp");
            await page.waitForFunction(() =>
              document
                .querySelector('.control[data-name="stick-1"]')
                .style.translate.split(" ")
                .every((value) => parseFloat(value) === 0)
            );
          }
        }
        for (const layout of ["full", "minimal"]) {
          await page.goto(`https://stream.test/controller/?player=9&skin=snes&layout=${layout}`);
          await page.waitForSelector(".controller-background", { state: "attached" });
          const controls = await page.evaluate(() =>
            Object.fromEntries(
              [0, 1, 2, 3].map((id) => {
                const node = document.querySelector(`.control[data-name="${byControllerArtwork.names[id]}"] .button-face`);
                return [byControllerArtwork.skins.snes.buttons.find((button) => button.id === id).letter, node.getBoundingClientRect().toJSON()];
              })
            )
          );
          assert.ok(controls.X.y < controls.A.y && controls.Y.x < controls.A.x && controls.B.y > controls.A.y);
        }
        for (const skin of ["xone", "ds4", "ds5", "xseries", "x360", "ds3"]) {
          await page.goto(`https://stream.test/controller/?player=9&skin=${skin}`);
          await page.waitForSelector(".controller-background", { state: "attached" });
          assert.equal(await page.locator('.control[data-name="touch-pad"]').count(), ["ds4", "ds5", "xseries"].includes(skin) ? 1 : 0);
        }
      } finally {
        await page.close();
      }
    });

    await t.test("arcade lever rests centered and reaches all eight directions without doubled travel", async () => {
      const page = await browser.newPage();
      try {
        await page.addInitScript(() => {
          window.testPad = { id: "Arcade motion fixture", index: 0, buttons: Array.from({ length: 40 }, () => ({ value: 0 })), axes: [0, 0, 0, 0] };
          Object.defineProperty(navigator, "getGamepads", { value: () => [testPad] });
        });
        await serve(page, assets, true);
        const directions = [
          [0, -1],
          [1, -1],
          [1, 0],
          [1, 1],
          [0, 1],
          [-1, 1],
          [-1, 0],
          [-1, -1]
        ];
        for (const layout of ["full", "minimal"]) {
          await page.goto(`https://stream.test/controller/?skin=fgc&player=1&layout=${layout}`);
          await page.waitForSelector(".controller.active:not(.disconnected)");
          const base = page.locator('.fixed-layer[data-for="button:10"] .vector-outline');
          let fixedBounds = await base.boundingBox();
          // Measure visible displacement relative to the ball radius, independent of viewport scaling.
          const expectPosition = async (x, y) => {
            await page.waitForFunction(
              ({ x, y }) => {
                const ball = document.querySelector('.control[data-name="stick-1"] .button-face').getBoundingClientRect();
                const base = document.querySelector('.fixed-layer[data-for="button:10"] .vector-outline').getBoundingClientRect();
                const dx = (ball.x + ball.width / 2 - base.x - base.width / 2) / (ball.width / 2);
                const dy = (ball.y + ball.height / 2 - base.y - base.height / 2) / (ball.height / 2);
                const magnitude = Math.max(1, Math.hypot(x, y));
                return Math.abs(dx - ((x / magnitude) * 40) / 53) < 0.005 && Math.abs(dy - ((y / magnitude) * 40) / 53) < 0.005;
              },
              { x, y }
            );
            assert.deepEqual(await base.boundingBox(), fixedBounds, "The socket stays fixed");
            assert.equal(
              await page.locator(".stick-shaft").evaluate((shaft) => {
                const matrix = shaft.getScreenCTM();
                const anchor = new DOMPoint(shaft.x1.baseVal.value, shaft.y1.baseVal.value).matrixTransform(matrix);
                const tip = new DOMPoint(shaft.x2.baseVal.value, shaft.y2.baseVal.value).matrixTransform(matrix);
                const socket = document.querySelector('.fixed-layer[data-for="button:10"] .vector-outline').getBoundingClientRect();
                const ball = document.querySelector('.control[data-name="stick-1"] .button-face').getBoundingClientRect();
                return (
                  Math.abs(anchor.x - socket.x - socket.width / 2) < 0.03 && Math.abs(anchor.y - socket.y - socket.height / 2) < 0.03 && Math.abs(tip.x - ball.x - ball.width / 2) < 0.03 && Math.abs(tip.y - ball.y - ball.height / 2) < 0.03
                );
              }),
              true,
              "The gray shaft joins the fixed socket center to the current ball position"
            );
          };
          await expectPosition(0, 0);
          for (const input of ["axes", "dpad", "pressed"])
            for (const [x, y] of directions) {
              await page.evaluate(
                ({ input, x, y }) => {
                  testPad.axes = input === "axes" ? [x, y, 0, 0] : [0, 0, 0, 0];
                  [12, 13, 14, 15].forEach((slot, i) => {
                    const pressed = [y < 0, y > 0, x < 0, x > 0][i];
                    testPad.buttons[slot] = input === "pressed" ? { pressed } : { value: input === "dpad" ? Number(pressed) : 0 };
                  });
                },
                { input, x, y }
              );
              await expectPosition(x, y);
              await page.evaluate(() => {
                testPad.axes = [0, 0, 0, 0];
                testPad.buttons.forEach((button) => {
                  button.value = 0;
                  button.pressed = false;
                });
              });
              await expectPosition(0, 0);
            }
          await page.evaluate(() => {
            testPad.axes = [-1, -1, 0, 0];
            testPad.buttons[12].value = testPad.buttons[14].value = 1;
          });
          await expectPosition(-1, -1);
          await page.evaluate(() => {
            testPad.axes = [0.5, 0, 0, 0];
            testPad.buttons[14].value = 0;
          });
          await expectPosition(0, -1);
          await page.evaluate(() => {
            testPad.buttons[12].value = 0;
          });
          await expectPosition(0.5, 0);
          await page.evaluate(() => {
            testPad.axes = [0.01, 0.01, 0, 0];
          });
          await expectPosition(0, 0);
          await page.evaluate(() => {
            testPad.buttons[12] = { value: 0, pressed: true };
          });
          await expectPosition(0, -1);
          await page.evaluate(() => {
            testPad.buttons[12].pressed = false;
          });
          await expectPosition(0, 0);
          const mapping = [{ targetType: "buttons", target: 12, choiceType: "buttons", choice: 20 }];
          await page.goto(`https://stream.test/controller/?${new URLSearchParams({ skin: "fgc", player: "1", layout, mapping: JSON.stringify(mapping) })}`);
          await page.waitForSelector(".controller.active:not(.disconnected)");
          fixedBounds = await base.boundingBox();
          await page.evaluate(() => {
            testPad.buttons[20] = { pressed: true };
          });
          await expectPosition(0, -1);
          await page.evaluate(() => {
            testPad.buttons[20].pressed = false;
          });
          await expectPosition(0, 0);
        }
      } finally {
        await page.close();
      }
    });

    await t.test("controller remaps original inputs, calibrates raw axes, and rejects invalid bindings", async () => {
      const page = await browser.newPage();
      try {
        await page.addInitScript(() => {
          window.testPad = { id: "Mapping fixture", index: 0, buttons: Array.from({ length: 23 }, () => ({ value: 0, pressed: false })), axes: [0, 0, -1, 0] };
          Object.defineProperty(navigator, "getGamepads", { value: () => [window.testPad] });
        });
        await serve(page, assets, true);
        const mapping = [
          { targetType: "buttons", target: 0, choiceType: "buttons", choice: 1 },
          { targetType: "buttons", target: 1, choiceType: "buttons", choice: 0 },
          { targetType: "buttons", target: 6, choiceType: "axes", choice: 2, choiceOperand: "+", axesConfig: { type: "trigger", lowValue: -1, highValue: 1 } },
          { targetType: "axes", target: 0, choiceType: "axes", choice: 3, axesConfig: { type: "stick", lowValue: 1, highValue: -1 } }
        ];
        const query = new URLSearchParams({ player: "1", offset: "20", mapping: JSON.stringify({ mapping }) });
        await page.goto(`https://stream.test/controller/?${query}`);
        await page.waitForFunction(() => document.querySelector(".controller.active:not(.disconnected)"));
        await page.evaluate(() => {
          testPad.buttons[1].value = 1;
        });
        await page.waitForFunction(() => document.querySelector('.controller.active [data-name="button-1"]').classList.contains("pressed"));
        assert.equal(await page.locator('.controller.active [data-name="button-2"]').evaluate((element) => element.classList.contains("pressed")), false);
        assert.equal(await page.evaluate(() => byStreamResource.gamepadSupport.gamepads[0].buttons[6].value), 0, "Calibrated triggers rest at zero even with a legacy half-axis marker");
        await page.evaluate(() => {
          testPad.axes[2] = 0;
          testPad.axes[3] = 0.75;
        });
        await page.waitForFunction(() => byStreamResource.gamepadSupport.gamepads[0].buttons[6].value === 0.5);
        await page.waitForFunction(() => {
          const stick = document.querySelector('.controller.active [data-name="stick-1"]');
          const [x, y = 0] = getComputedStyle(stick).translate.split(" ").map(parseFloat);
          return Math.abs(x + 15 * Number(stick.dataset.travelScale)) < 0.0001 && y === 0;
        });
        const hat = { targetType: "dpad", choiceType: "axes", choice: 3, choiceOperand: "+", positions: { up: -1, upright: -0.714, right: -0.428, downright: -0.142, down: 0.142, downleft: 0.428, left: 0.714, upleft: 1 } };
        await page.goto(`https://stream.test/controller/?${new URLSearchParams({ player: "1", mapping: JSON.stringify([hat]) })}`);
        await page.waitForFunction(() => document.querySelector(".controller.active:not(.disconnected)"));
        await page.evaluate(() => {
          testPad.axes[3] = -0.714;
        });
        await page.waitForFunction(
          () => document.querySelector('.controller.active [data-name="button-dpad-top"]').classList.contains("pressed") && document.querySelector('.controller.active [data-name="button-dpad-right"]').classList.contains("pressed")
        );
        const invalid = new URLSearchParams({ player: "1", mapping: JSON.stringify([mapping[0], { targetType: "buttons", target: "bad", choiceType: "buttons", choice: 0 }]) });
        await page.goto(`https://stream.test/controller/?${invalid}`);
        await page.waitForFunction(() => window.byStreamResource);
        assert.deepEqual(await page.evaluate(() => byStreamResource.settings.mapping), [], "Invalid arrays never apply a partial remap");
        const keyBinding = new URLSearchParams({ player: "9", mapping: JSON.stringify([{ targetType: "buttons", target: 0, choiceType: "keys", choice: "KeyB" }]) });
        await page.goto(`https://stream.test/controller/?${keyBinding}`);
        await page.waitForFunction(() => document.querySelector(".controller.active:not(.disconnected)"));
        await page.keyboard.down("b");
        await page.waitForFunction(() => document.querySelector('.controller.active [data-name="button-1"]').classList.contains("pressed"));
        await page.keyboard.up("b");
        await page.waitForFunction(() => !document.querySelector('.controller.active [data-name="button-1"]').classList.contains("pressed"));
        const disabled = new URLSearchParams({ player: "9", mapping: JSON.stringify([{ targetType: "buttons", target: 0, disabled: true }]) });
        await page.goto(`https://stream.test/controller/?${disabled}`);
        await page.waitForFunction(() => document.querySelector(".controller.active:not(.disconnected)"));
        await page.keyboard.down("j");
        await page.waitForFunction(() => byStreamResource.gamepadSupport.gamepadsRaw[9].buttons[0] === 1);
        assert.equal(await page.locator('.controller.active [data-name="button-1"]').evaluate((element) => element.classList.contains("pressed")), false);
        await page.keyboard.up("j");
        const rearGrip = new URLSearchParams({ player: "9", skin: "steamdeck", mapping: JSON.stringify([{ targetType: "buttons", target: 25, choiceType: "keys", choice: "KeyB" }]) });
        await page.goto(`https://stream.test/controller/?${rearGrip}`);
        await page.waitForSelector(".controller.active:not(.disconnected)");
        await page.keyboard.down("b");
        await page.waitForFunction(() => byStreamResource.gamepadSupport.gamepads[9].buttons[25].value === 1);
        assert.equal(await page.locator('[data-name="button-grip-left"]').count(), 0, "Legacy mappings remain valid without floating rear buttons");
        await page.keyboard.up("b");
        await page.waitForFunction(() => byStreamResource.gamepadSupport.gamepads[9].buttons[25].value === 0);
      } finally {
        await page.close();
      }
    });

    await t.test("empty text, automatic widths, multiline credits, and overlay layout fixes", async () => {
      const page = await browser.newPage();
      try {
        await serve(page, assets, true);
        await page.goto("https://stream.test/watermark/?text=&width=0&kind=text");
        await page.waitForFunction(() => window.byStreamResource && document.querySelector(".brand-text"));
        assert.equal(await page.evaluate(() => byStreamResource.settings.text), "");
        assert.equal(await page.locator(".panel").evaluate((node) => getComputedStyle(node).display), "none");
        assert.equal(new URL(await page.evaluate(() => byStream.settingsURL(byStreamResource, byStreamResource.settings).href)).searchParams.get("text"), "");
        await page.goto(`https://stream.test/watermark/?${new URLSearchParams({ text: " \t\n", kind: "text" })}`);
        await page.waitForFunction(() => window.byStreamResource && document.querySelector(".brand-text"));
        assert.equal(await page.evaluate(() => byStreamResource.settings.text), "");
        assert.equal(await page.locator(".panel").evaluate((node) => getComputedStyle(node).display), "none");
        await page.goto("https://stream.test/watermark/?text=Short&width=0&widthMode=content");
        await page.waitForSelector(".brand-text");
        const compact = await page.locator(".panel").evaluate((node) => node.getBoundingClientRect().width);
        await page.goto("https://stream.test/watermark/?text=Short&width=0&widthMode=fill");
        await page.waitForSelector(".brand-text");
        assert.ok((await page.locator(".panel").evaluate((node) => node.getBoundingClientRect().width)) > compact * 2);
        const credits = new URLSearchParams({ title: "Opening\nTitle", closing: "", entries: JSON.stringify([{ category: "Team\nFriends", name: "One\nTwo" }]) });
        await page.goto("https://stream.test/credits/?" + credits);
        await page.waitForFunction(() => document.querySelector(".credit-name"));
        assert.equal(await page.locator(".credits-group:not([aria-hidden]) .credit-name").textContent(), "One\nTwo");
        assert.equal(await page.locator(".credits-group:not([aria-hidden]) .credit-name").evaluate((node) => getComputedStyle(node).whiteSpace), "pre-wrap");
        assert.equal(await page.locator(".credits-group:not([aria-hidden]) .credits-closing").evaluate((node) => getComputedStyle(node).display), "none");
        await page.goto("https://stream.test/schedule/?columns=0&width=0&widthMode=fill");
        await page.waitForSelector(".schedule-list");
        assert.equal(await page.evaluate(() => byStreamResource.settings.columns), 0);
        assert.notEqual(await page.locator(".schedule-list").evaluate((node) => getComputedStyle(node).gridTemplateColumns), "none");
        await page.goto("https://stream.test/effects/?speed=1&fontSize=8&motion=on");
        await page.waitForFunction(() => window.byStreamResource);
        assert.deepEqual(await page.evaluate(() => [byStreamResource.settings.speed, byStreamResource.settings.fontSize]), [1, 8]);
        await page.goto("https://stream.test/badge/?dot=yes&animation=none");
        await page.waitForSelector(".status-dot");
        const badge = await page.locator(".panel").screenshot({ omitBackground: true });
        const centers = await page.evaluate(async (png) => {
          const image = await createImageBitmap(new Blob([Uint8Array.from(atob(png), (character) => character.charCodeAt(0))], { type: "image/png" }));
          const canvas = document.createElement("canvas");
          canvas.width = image.width;
          canvas.height = image.height;
          const context = canvas.getContext("2d");
          context.drawImage(image, 0, 0);
          const pixels = context.getImageData(0, 0, image.width, image.height).data;
          const dot = [],
            text = [];
          for (let y = 0; y < image.height; y++)
            for (let x = 0; x < image.width; x++) {
              const i = (y * image.width + x) * 4;
              if (pixels[i + 3] < 200) continue;
              if (pixels[i] > 40 && pixels[i + 1] < 10 && pixels[i + 2] < 10) dot.push(y);
              if (pixels[i] > 200 && pixels[i + 1] > 200 && pixels[i + 2] > 200) text.push(y);
            }
          return [dot, text].map((rows) => (Math.min(...rows) + Math.max(...rows)) / 2);
        }, badge.toString("base64"));
        assert.ok(Math.abs(centers[0] - centers[1]) <= 1, "Dot aligns with the visible label, excluding the font's descender space");
        assert.deepEqual(
          await page.locator(".status-dot").evaluate((node) => {
            const style = getComputedStyle(node);
            return [style.backgroundColor, style.borderRadius, node.getBoundingClientRect().width];
          }),
          ["rgb(102, 0, 0)", "6px", 12]
        );
        await page.goto("https://stream.test/badge/?dot=no");
        await page.waitForFunction(() => window.byStreamResource);
        assert.equal(await page.locator(".status-dot").count(), 0);
        const lower = new URLSearchParams({ gap: "0", entries: JSON.stringify([{ name: "Title", subtitle: "Subtitle", icon: "", imageUrl: "" }]) });
        await page.goto("https://stream.test/lower-thirds/?" + lower);
        await page.waitForSelector(".secondary");
        assert.equal(
          await page.locator(".secondary").evaluate((node) => {
            const style = getComputedStyle(node);
            return parseFloat(style.marginTop) < parseFloat(style.fontSize) * 0.25;
          }),
          true
        );
      } finally {
        await page.close();
      }
    });

    await t.test("inactive drafts remain validated while availability and legacy normalization govern shared URLs", async () => {
      const page = await browser.newPage();
      try {
        await serve(page, assets, true);
        await page.goto("https://stream.test/clock/?savedColor=aa33cc&savedSwitch=yes&transient=9&combined=8");
        await page.waitForFunction(() => window.byStreamResource);
        const result = await page.evaluate(async () => {
          const toggle = { type: "switch", checkedValue: "yes", uncheckedValue: "no", options: { yes: "On", no: "Off" } };
          const fields = {
            enabled: { ...toggle, default: "no" },
            available: { ...toggle, default: "yes" },
            savedColor: { type: "color", default: "#111111", when: ["enabled", "yes"], retainInactive: true },
            savedSwitch: { ...toggle, default: "no", when: ["enabled", "yes"], retainInactive: true },
            transient: { type: "number", default: 1, min: 0, max: 10, when: ["enabled", "yes"] },
            combined: { type: "number", default: 1, min: 0, max: 10, when: (settings) => settings.enabled === "yes" && settings.available === "yes", retainInactive: true }
          };
          let normalized = 0;
          const resource = {
            fields,
            urlRequired: [],
            normalizeParameters(values) {
              normalized++;
              values.set("savedColor", values.get("savedColor").toUpperCase());
            }
          };
          const settings = await byStream.initResource(resource);
          const inactive = { ...settings },
            hiddenURL = byStream.settingsURL(resource, settings).search;
          byStream.applyParameters(fields, settings, new URLSearchParams("savedColor=invalid&combined=99"));
          const invalid = { ...settings };
          settings.enabled = "yes";
          const activeURL = Object.fromEntries(byStream.settingsURL(resource, settings).searchParams);
          settings.available = "no";
          return { normalized, inactive, hiddenURL, invalid, activeURL, combinedEnabled: byStream.fieldEnabled(fields, settings, "combined"), unavailableURL: Object.fromEntries(byStream.settingsURL(resource, settings).searchParams) };
        });
        assert.equal(result.normalized, 1);
        assert.deepEqual(result.inactive, { enabled: "no", available: "yes", savedColor: "#AA33CC", savedSwitch: "yes", transient: 1, combined: 8, animate: "yes" });
        assert.equal(result.hiddenURL, "");
        assert.deepEqual(result.invalid, result.inactive, "Invalid inactive values cannot overwrite accepted drafts");
        assert.deepEqual(result.activeURL, { enabled: "yes", savedColor: "AA33CC", savedSwitch: "yes", combined: "8" });
        assert.equal(result.combinedEnabled, false);
        assert.equal(Object.hasOwn(result.unavailableURL, "combined"), false);
      } finally {
        await page.close();
      }
    });

    await t.test("invalid values retain defaults while zero and untrusted text survive", async () => {
      const page = await browser.newPage();
      try {
        await serve(page, assets, true);
        const text = '<img src=x onerror="window.injected=1">';
        await page.goto(`https://stream.test/watermark/?${new URLSearchParams({ text, fontSize: "invalid", kind: "invalid", opacity: "0", unknown: "ignored" })}`);
        await page.waitForFunction(() => window.byStreamResource && document.querySelector("#overlay .primary"));
        assert.deepEqual(await page.evaluate(() => ({ fontSize: byStreamResource.settings.fontSize, kind: byStreamResource.settings.kind, opacity: byStreamResource.settings.opacity, injected: window.injected })), {
          fontSize: 16,
          kind: "text",
          opacity: 0,
          injected: undefined
        });
        assert.equal(await page.locator("#overlay .primary").textContent(), text);
        assert.equal(await page.locator("#overlay img, #overlay script").count(), 0);
      } finally {
        await page.close();
      }
    });

    await t.test("resource appearance defaults allow neutral overrides without hiding base text", async () => {
      const page = await browser.newPage();
      try {
        await serve(page, assets, true);
        await page.goto("https://stream.test/clock/?test=1");
        await page.waitForFunction(() => document.querySelector(".time"));
        assert.equal(await page.locator(".panel").evaluate((panel) => getComputedStyle(panel).borderTopWidth), "0px");
        assert.equal(await page.evaluate(() => byStreamResource.fields.label.default), "");
        assert.equal(await page.locator(".eyebrow").count(), 0);
        await page.goto("https://stream.test/clock/?label=Heading&panelBorderWidth=0&headingTracking=0&headingFontSize=0&panelShadow=no&backdropFilterMode=none&radius=0");
        await page.waitForFunction(() => document.querySelector(".time"));
        const styles = await page.evaluate(() => {
          const panel = getComputedStyle(document.querySelector(".panel"));
          const heading = getComputedStyle(document.querySelector(".eyebrow"));
          return { border: panel.borderTopWidth, shadow: panel.boxShadow, blur: panel.backdropFilter, radius: panel.borderTopLeftRadius, tracking: heading.letterSpacing, headingSize: parseFloat(heading.fontSize) };
        });
        assert.equal(styles.headingSize, await page.evaluate(() => byStreamResource.fields.headingFontSize.default), "Size 0 restores the displayed default");
        delete styles.headingSize;
        assert.deepEqual(styles, { border: "0px", shadow: "none", blur: "none", radius: "0px", tracking: "normal" });
      } finally {
        await page.close();
      }
    });

    await t.test("Main insets and text sizes restore concrete defaults from legacy zeros", async () => {
      const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
      try {
        await serve(page, assets, true);
        await page.goto("https://stream.test/main/?displayLabels=yes&updatesLeft=0&updatesTop=0&eventsLeft=0&eventsBottom=0&countdownRight=0&countdownBottom=0&countdownFontSize=0&countdownLineHeight=0");
        await page.waitForSelector("#countdown");
        assert.deepEqual(
          await page.evaluate(() => {
            const updates = getComputedStyle(document.querySelector("#updates"));
            const events = getComputedStyle(document.querySelector("#list"));
            const countdown = getComputedStyle(document.querySelector("#countdown"));
            return [updates.left, updates.top, events.left, events.bottom, countdown.right, countdown.bottom];
          }),
          Array(6).fill("80px")
        );
        assert.deepEqual(await page.evaluate(() => [byStreamResource.settings.countdownFontSize, byStreamResource.settings.countdownLineHeight]), [48, 54]);
        const url = new URL(await page.evaluate(() => byStream.settingsURL(byStreamResource, byStreamResource.settings).href));
        assert.ok(url.searchParams.has("sceneTitle"));
        assert.equal(url.searchParams.has("countdownRight"), false);
        await page.goto("https://stream.test/effects/?effect=symbols&motion=off&symbolFontSize=20&symbolLineHeight=22&sizeVariation=50");
        await page.waitForSelector(".particle");
        const sizes = await page.locator(".particle").evaluateAll((nodes) => nodes.map((node) => parseFloat(getComputedStyle(node).fontSize)));
        assert.ok(Math.max(...sizes) > Math.min(...sizes), "Symbol size variation remains active");
        assert.ok(sizes.every((size) => size >= 15 && size <= 25));
      } finally {
        await page.close();
      }
    });

    await t.test("zero columns fit existing items and retain explicit column counts", async () => {
      const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
      try {
        await serve(page, assets, true);
        for (const [name, selector] of [
          ["schedule", ".schedule-list"],
          ["info", ".info-board"],
          ["shortcuts", ".shortcut-list"]
        ]) {
          await page.goto(`https://stream.test/${name}/?width=0&widthMode=fill`);
          await page.waitForSelector(selector);
          assert.equal(await page.evaluate(() => byStreamResource.fields.columns.default), 0, name);
          assert.equal(await page.evaluate(() => byStreamResource.settings.columns), 0, name);
          const tracks = await page.locator(selector).evaluate((node) =>
            getComputedStyle(node)
              .gridTemplateColumns.split(" ")
              .map(parseFloat)
              .filter((size) => size > 0)
          );
          assert.ok(tracks.length > 1 && tracks.length <= (await page.locator(selector).locator(":scope > *").count()), name);
          await page.goto(`https://stream.test/${name}/?columns=2&width=0&widthMode=fill`);
          await page.waitForSelector(selector);
          assert.equal(await page.locator(selector).evaluate((node) => getComputedStyle(node).gridTemplateColumns.split(" ").length), 2, name);
        }
      } finally {
        await page.close();
      }
    });

    await t.test("credits enter at the selected edge and loop without gaps", async () => {
      const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
      try {
        await serve(page, assets, true);
        for (const rollDirection of ["normal", "reverse"]) {
          for (const loop of ["no", "yes"]) {
            const query = new URLSearchParams({ rollDirection, loop, viewportHeight: "320", rollDelay: "2", padding: "12", edgeFadeMode: "none" });
            if (loop === "yes") {
              query.set("entries", "[]");
              query.set("closing", "");
              query.set("titleGap", "0");
            }
            await page.goto(`https://stream.test/credits/?${query}`);
            const roll = page.locator(".credits-roll");
            await page.waitForFunction(() => document.querySelector(".credits-roll")?.getAnimations().length);
            const result = await roll.evaluate((node) => {
              const animations = node.getAnimations();
              const [entry, repeat] = animations;
              const timing = entry.effect.getTiming();
              const bounds = node.parentElement.getBoundingClientRect();
              const original = node.querySelector(".credits-group:not([aria-hidden])");
              const rectAt = (time) => {
                animations.forEach((animation) => {
                  animation.pause();
                  animation.currentTime = time;
                });
                return original.getBoundingClientRect();
              };
              const waiting = rectAt(timing.delay / 2);
              const entering = rectAt(timing.delay + 1000);
              const finished = rectAt(timing.delay + timing.duration);
              const coverage = () => {
                const groups = [...node.children].map((group) => group.getBoundingClientRect());
                return groups[0].top <= bounds.top + 1 && groups.at(-1).bottom >= bounds.bottom - 1;
              };
              const fillsAtHandoff = repeat ? coverage() : null;
              if (repeat) rectAt(timing.delay + timing.duration + repeat.effect.getTiming().duration + 16);
              return {
                bounds,
                waiting,
                entering,
                finished,
                delay: timing.delay,
                fillsAtHandoff,
                fillsNextLoop: repeat ? coverage() : null,
                iteration: repeat?.effect.getComputedTiming().currentIteration
              };
            });
            assert.equal(result.bounds.height, 320);
            assert.equal(result.delay, 2000);
            if (rollDirection === "normal") {
              assert.ok(result.waiting.top >= result.bounds.bottom - 1);
              assert.ok(result.entering.top < result.bounds.bottom - 1);
              if (loop === "no") assert.ok(result.finished.bottom <= result.bounds.top + 1);
            } else {
              assert.ok(result.waiting.bottom <= result.bounds.top + 1);
              assert.ok(result.entering.bottom > result.bounds.top + 1);
              if (loop === "no") assert.ok(result.finished.top >= result.bounds.bottom - 1);
            }
            if (loop === "yes") {
              assert.equal(result.fillsAtHandoff, true);
              assert.equal(result.fillsNextLoop, true);
              assert.equal(result.iteration, 1);
            }
          }
        }
        await page.goto("https://stream.test/credits/?animate=no");
        const group = page.locator(".credits-group");
        await group.locator(".credit-name").first().waitFor();
        assert.deepEqual(await group.locator(".credit-name").allTextContents(), ["You, on the other side\nEverybody who made this possible", "Our moderators", "BONYUR / byUwUr"]);
        for (const selector of [".credits-title", ".credits-category", ".credit-name", ".credits-closing"]) {
          const shadow = await group
            .locator(selector)
            .first()
            .evaluate((node) => getComputedStyle(node).textShadow);
          assert.equal(shadow, "rgba(0, 0, 0, 0.8) 0px 2px 2px");
        }
      } finally {
        await page.close();
      }
    });

    await t.test("sponsor and lower-third images use intrinsic proportions at zero size", async () => {
      const page = await browser.newPage();
      try {
        await serve(page, assets, true);
        const logo = "https://byuwur.github.io/img/logo.png";
        await page.route(logo, (route) =>
          route.fulfill({
            contentType: "image/svg+xml",
            body: '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="24"><rect width="40" height="24"/></svg>'
          })
        );
        const dimensions = (selector) =>
          page.locator(selector).evaluate(async (image) => {
            await image.decode();
            const { width, height } = image.getBoundingClientRect();
            return [width, height];
          });
        await page.clock.install({ time: new Date(0) });
        await page.clock.pauseAt(new Date(1000));
        for (const imageWidth of [0, 80]) {
          await page.goto(`https://stream.test/sponsors/?transition=none&imageWidth=${imageWidth}`);
          assert.deepEqual(await dimensions(".sponsor-image"), imageWidth === 0 ? [40, 24] : [80, 48]);
        }
        await page.clock.fastForward(3000);
        assert.equal(await page.locator(".primary").textContent(), "YOUR PARTNER");
        assert.equal(await page.locator(".sponsor-image").count(), 0);
        const entries = JSON.stringify([{ name: "Partner", subtitle: "", icon: "", imageUrl: logo }]);
        for (const imageSize of [0, 80]) {
          const query = new URLSearchParams({ entries, transition: "none", gap: "0", imageSize });
          await page.goto(`https://stream.test/lower-thirds/?${query}`);
          assert.deepEqual(await dimensions(".lower-image"), imageSize === 0 ? [40, 24] : [80, 80]);
          assert.equal(await page.evaluate(() => byStream.settingsURL(byStreamResource, byStreamResource.settings).searchParams.get("imageSize")), String(imageSize));
        }
      } finally {
        await page.close();
      }
    });

    await t.test("decorative quote marks reserve space beside the quote", async () => {
      const page = await browser.newPage();
      try {
        await serve(page, assets, true);
        await page.goto("https://stream.test/quotes/?marks=yes&quoteIndent=0&transition=none");
        await page.waitForSelector(".quote-text");
        assert.equal(await page.evaluate(() => byStreamResource.settings.quoteIndent), 35.2);
        const styles = await page.locator(".quote-text").evaluate((node) => ({ indent: parseFloat(getComputedStyle(node).paddingLeft), markSize: parseFloat(getComputedStyle(node, "::before").fontSize) }));
        assert.equal(styles.indent, 35.2);
        assert.equal(styles.markSize, 64);
        await page.goto("https://stream.test/quotes/?marks=no&transition=none");
        await page.waitForSelector(".quote-text");
        assert.equal(await page.locator(".quote-text").evaluate((node) => getComputedStyle(node).paddingLeft), "0px");
      } finally {
        await page.close();
      }
    });

    await t.test("zero maximum dimensions remove caps while positive limits still apply", async () => {
      const page = await browser.newPage();
      try {
        await serve(page, assets, true);
        for (const name of await resourceNames()) {
          await page.goto(`https://stream.test/${name}/?width=0${name === "lower-thirds" ? "&gap=0" : ""}`);
          await page.waitForFunction(() => window.byStreamResource && window.byStreamOverlay);
          const width = await page.evaluate(() => {
            const resource = byStreamResource;
            if (!resource.fields.width) return null;
            const panel = document.querySelector("#overlay .panel");
            return { value: resource.settings.width, maximum: getComputedStyle(panel).maxWidth, rendered: panel.getBoundingClientRect().width, shared: byStream.settingsURL(resource, resource.settings).searchParams.get("width") };
          });
          if (!width) continue;
          assert.equal(width.value, 0, `${name} accepts zero width`);
          assert.equal(width.maximum, "none", `${name} removes the width cap`);
          assert.ok(width.rendered > 0, `${name} stays visible`);
          assert.equal(width.shared ?? "0", "0", `${name} preserves zero or its declared default in copied URLs`);
          await page.goto(`https://stream.test/${name}/?width=320${name === "lower-thirds" ? "&gap=0" : ""}`);
          await page.waitForFunction(() => window.byStreamResource && window.byStreamOverlay);
          assert.equal(await page.locator("#overlay .panel").evaluate((panel) => getComputedStyle(panel).maxWidth), "320px", `${name} retains positive limits`);
        }
        const logo = "../stream.html.png";
        const limits = [
          ["info", "boardHeight", ".info-board", "maxHeight", {}],
          ["schedule", "listHeight", ".schedule-list", "maxHeight", {}],
          ["shortcuts", "listHeight", ".shortcut-list", "maxHeight", {}],
          ["qr", "logoWidth", ".qr-logo", "maxWidth", { showLogo: "yes", logoUrl: logo }],
          ["qr", "logoHeight", ".qr-logo", "maxHeight", { showLogo: "yes", logoUrl: logo }],
          ["sponsors", "imageHeight", ".sponsor-image", "maxHeight", { entries: JSON.stringify([{ name: "Partner", text: "Message", imageUrl: logo }]) }],
          ["watermark", "imageHeight", ".brand-logo", "maxHeight", { kind: "logo", logoUrl: logo }]
        ];
        for (const [name, field, selector, property, settings] of limits) {
          for (const value of [0, 80]) {
            const query = new URLSearchParams({ ...settings, [field]: value });
            await page.goto(`https://stream.test/${name}/?${query}`);
            await page.waitForFunction(() => window.byStreamResource && window.byStreamOverlay);
            const actual = await page.locator(selector).evaluate((element, property) => getComputedStyle(element)[property], property);
            assert.equal(actual, value === 0 ? "none" : "80px", `${name} ${field}=${value}`);
          }
        }
      } finally {
        await page.close();
      }
    });

    await t.test("webcam backdrop blur stays on the label and can be disabled", async () => {
      const page = await browser.newPage();
      try {
        await serve(page, assets, true);
        await page.goto("https://stream.test/webcam/?test=1");
        await page.waitForFunction(() => document.querySelector(".camera-label"));
        const styles = await page.evaluate(() => ({
          camera: getComputedStyle(document.querySelector(".camera-frame")).backdropFilter,
          label: getComputedStyle(document.querySelector(".camera-label")).backdropFilter
        }));
        assert.equal(styles.camera, "none", "Camera content stays clear");
        assert.ok(styles.label.startsWith("blur(8px)"));
        await page.goto("https://stream.test/webcam/?labelBackdropMode=none&labelSurfacePadding=0");
        await page.waitForFunction(() => document.querySelector(".camera-label"));
        assert.deepEqual(await page.locator(".camera-label").evaluate((label) => ({ blur: getComputedStyle(label).backdropFilter, padding: getComputedStyle(label).padding })), { blur: "none", padding: "0px" });
      } finally {
        await page.close();
      }
    });

    // --- CONTINUING ANIMATION AND VIEWPORT CHANGES ---
    await t.test("timer and timeline interpolate progress between ticks and suspend while hidden", async () => {
      for (const [name, style] of [
        ["timer", ""],
        ["timeline", "bar"],
        ["timeline", "ring"]
      ]) {
        const page = await browser.newPage();
        try {
          await page.clock.install({ time: new Date("2026-11-10T00:00:00Z") });
          await page.clock.pauseAt(new Date("2026-11-10T00:00:00Z"));
          await serve(page, assets, true);
          const params = new URLSearchParams({ duration: "10", milliseconds: "no", progress: "yes", animate: "yes", ...(style ? { style } : {}) });
          await page.goto(`https://stream.test/${name}/?${params}`);
          await page.waitForFunction(() => window.byStreamResource && document.querySelector("progress"));
          await page.clock.runFor(500);
          const value = await page.locator("progress").evaluate((node) => node.value);
          assert.ok(value > 0.04 && value < 0.06, `${name}/${style} advances before the next one-second tick`);
          if (style === "ring") assert.ok(Math.abs((await page.locator(".ring-value").evaluate((node) => parseFloat(node.style.strokeDashoffset))) - 2 * Math.PI * 52 * (1 - value)) < 0.01);
          await page.evaluate(() => {
            window.testHidden = true;
            Object.defineProperty(document, "hidden", { configurable: true, get: () => testHidden });
            document.dispatchEvent(new Event("visibilitychange"));
          });
          const paused = await page.locator("progress").evaluate((node) => node.value);
          await page.clock.runFor(500);
          assert.equal(await page.locator("progress").evaluate((node) => node.value), paused);
          await page.evaluate(() => {
            testHidden = false;
            document.dispatchEvent(new Event("visibilitychange"));
          });
          assert.equal(await page.locator("progress").evaluate((node) => node.value), 0.1);
          params.set("animate", "no");
          await page.goto(`https://stream.test/${name}/?${params}`);
          await page.waitForFunction(() => window.byStreamResource && document.querySelector("progress"));
          await page.clock.runFor(500);
          assert.equal(await page.locator("progress").evaluate((node) => node.value), 0, "Animate Off retains instantaneous clock ticks");
          await page.clock.fastForward(11000);
          assert.equal(await page.locator("progress").evaluate((node) => node.value), 1, "Progress reaches the exact final value");
        } finally {
          await page.close();
        }
      }
    });

    await t.test("changing cards leave before replacement and resize smoothly to new content", async () => {
      const page = await browser.newPage();
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      try {
        await serve(page, assets, true);
        const entries = ["Short", "A much longer result\nwith another line"];
        await page.goto(
          `https://stream.test/randomizer/?${new URLSearchParams({ mode: "manual", entries: JSON.stringify(entries), seed: "1", round: "0", width: "0", resultMotion: "slide", transitionDuration: "5000", showNumber: "yes" })}`
        );
        await page.waitForSelector(".draw-button");
        await page.evaluate(() => document.getAnimations().forEach((animation) => animation.finish()));
        await page.waitForFunction(() => !document.querySelector(".panel").style.height);
        await page.locator(".primary").evaluate((node) => node.getAnimations().forEach((animation) => animation.finish()));
        const oldSize = await page.locator(".panel").evaluate((node) => [node.offsetWidth, node.offsetHeight]);
        assert.equal(await page.locator(".primary").textContent(), entries[0]);
        await page.locator(".draw-button").click();
        assert.equal(await page.locator(".primary").textContent(), entries[0], "Outgoing content remains during its exit");
        const exit = await page.locator(".primary").evaluate((node) =>
          node
            .getAnimations()[0]
            .effect.getKeyframes()
            .map((frame) => frame.opacity)
        );
        assert.deepEqual(exit, ["1", "0"]);
        await page.locator(".primary").evaluate((node) => node.getAnimations().forEach((animation) => animation.finish()));
        await page.waitForFunction((text) => document.querySelector(".primary").textContent === text, entries[1]);
        assert.equal(await page.locator(".primary").evaluate((node) => getComputedStyle(node).opacity), "0", "Incoming text stays invisible until resizing finishes");
        const resized = await page.locator(".panel").evaluate((node) => {
          const changes = node.getAnimations().filter((animation) => ["width", "height"].includes(animation.transitionProperty));
          changes.forEach((animation) => {
            animation.pause();
            animation.currentTime = animation.effect.getTiming().duration / 2;
          });
          return { count: changes.length, size: [node.offsetWidth, node.offsetHeight], targets: changes.map((animation) => [animation.transitionProperty, animation.effect.getKeyframes().at(-1)[animation.transitionProperty]]) };
        });
        assert.equal(resized.count, 2);
        assert.ok(resized.size[0] > oldSize[0] && resized.size[1] > oldSize[1], "Container passes through intermediate dimensions");
        await page.evaluate(() => document.getAnimations().forEach((animation) => animation.finish()));
        await page.waitForFunction(() => !document.querySelector(".panel").style.width && !document.querySelector(".panel").style.height);
        await page.locator(".draw-button").click({ clickCount: 3, delay: 10 });
        await page.evaluate(() => document.getAnimations().forEach((animation) => animation.finish()));
        await page.waitForFunction(() => document.querySelector(".secondary").textContent === "DRAW 5");
        assert.equal(await page.locator(".primary").textContent(), entries[1], "Only the latest rapid draw renders");
        assert.deepEqual(errors, []);
      } finally {
        await page.close();
      }
    });

    await t.test("Animate overrides reduced motion and Off removes resource motion", async () => {
      const page = await browser.newPage({ reducedMotion: "reduce" });
      try {
        await serve(page, assets, true);
        await page.goto("https://stream.test/badge/?label=LIVE");
        await page.waitForSelector(".status-dot");
        assert.equal(await page.evaluate(() => byStreamResource.settings.animate), "yes");
        assert.ok((await page.locator(".status-dot").evaluate((node) => node.getAnimations().length)) > 0);
        for (const name of await resourceNames()) {
          await page.goto(`https://stream.test/${name}/?animate=no`);
          await page.waitForFunction(() => window.byStreamResource && window.byStreamOverlay);
          assert.equal(await page.evaluate(() => document.documentElement.dataset.animate), "no", name);
          assert.equal(await page.evaluate(() => document.getAnimations().length), 0, name);
          if (["main", "popup"].includes(name)) assert.equal(await page.evaluate(() => gsap.globalTimeline.getChildren(true, true, false).filter((tween) => tween.duration() > 0).length), 0, name);
        }
        await page.goto("https://stream.test/ticker/?animate=no&mode=scroll");
        await page.waitForSelector(".ticker-message");
        assert.equal(await page.locator(".ticker-track").count(), 0, "Disabled scrolling uses readable cycling messages");
      } finally {
        await page.close();
      }
    });

    await t.test("all rotating card renderers keep multiline content inside the settled container", async () => {
      const long = "A longer incoming message\nwith a second line";
      const cases = [
        [
          "ticker",
          ".ticker-message",
          ".ticker-message",
          {
            mode: "fade",
            duration: "2",
            entries: JSON.stringify([
              { text: "Short", prefix: "", icon: "" },
              { text: long, prefix: "", icon: "" }
            ])
          }
        ],
        ["quotes", ".panel", ".quote-text", { duration: "2", marks: "no", entries: JSON.stringify({ Short: "Author", [long]: "Author" }) }],
        [
          "sponsors",
          ".panel",
          ".primary",
          {
            duration: "2",
            entries: JSON.stringify([
              { name: "Short", text: "", imageUrl: "" },
              { name: long, text: "", imageUrl: "" }
            ])
          }
        ],
        [
          "lower-thirds",
          ".panel",
          ".primary",
          {
            duration: "2",
            gap: "0",
            entries: JSON.stringify([
              { name: "Short", subtitle: "", icon: "", imageUrl: "" },
              { name: long, subtitle: "", icon: "", imageUrl: "" }
            ])
          }
        ],
        ["reminder", ".panel", ".primary", { interval: "10", duration: "10", delay: "0", entries: JSON.stringify(["Short", long]) }]
      ];
      for (const [name, target, text, values] of cases) {
        const page = await browser.newPage();
        try {
          await page.clock.install({ time: new Date("2026-11-10T00:00:00Z") });
          await page.clock.pauseAt(new Date("2026-11-10T00:00:00Z"));
          await serve(page, assets, true);
          await page.goto(`https://stream.test/${name}/?${new URLSearchParams({ ...values, width: "0", transition: "fade", transitionDuration: "1000" })}`);
          await page.waitForSelector(text);
          const finish = async () => {
            for (let phase = 0; phase < 4; phase++)
              await page.evaluate(() =>
                document
                  .getAnimations()
                  .filter((animation) => animation.effect.getTiming().iterations !== Infinity)
                  .forEach((animation) => animation.finish())
              );
          };
          await finish();
          const outgoing = await page.locator(text).textContent();
          await page.clock.fastForward(name === "reminder" ? 10100 : 2100);
          assert.equal(await page.locator(text).textContent(), outgoing, name + " retains outgoing text during exit");
          await page.locator(target).evaluate((node) => node.getAnimations().forEach((animation) => animation.finish()));
          await page.waitForFunction(({ text, long }) => document.querySelector(text)?.textContent === long, { text, long });
          assert.equal(await page.locator(target).evaluate((node) => getComputedStyle(node).opacity), "0", name + " hides incoming content during resizing");
          await finish();
          const bounds = await page.evaluate((text) => {
            const panel = document.querySelector(".panel"),
              node = document.querySelector(text);
            const outer = panel.getBoundingClientRect(),
              inner = node.getBoundingClientRect();
            return { fits: inner.top >= outer.top - 1 && inner.bottom <= outer.bottom + 1, height: panel.style.height, overflow: panel.style.overflow };
          }, text);
          assert.equal(bounds.fits, true, name);
          assert.equal(bounds.height, "", name + " releases temporary height");
          assert.equal(bounds.overflow, "", name + " releases temporary clipping");
        } finally {
          await page.close();
        }
      }
    });

    await t.test("watermark fading continues across visible and hidden intervals", async () => {
      const page = await browser.newPage();
      try {
        await page.clock.install({ time: new Date("2026-11-08T00:00:00Z") });
        await serve(page, assets, true);
        await page.goto("https://stream.test/watermark/?text=Fading&fadeInterval=2&visibleDuration=1");
        await page.waitForFunction(() => window.byStreamResource && document.querySelector("#overlay .primary"));
        assert.equal(await page.locator("#overlay .panel").evaluate((panel) => panel.hidden), false);
        await page.clock.fastForward(1100);
        assert.equal(await page.locator("#overlay .panel").evaluate((panel) => panel.hidden), false, "The watermark leaves before it is hidden");
        await page.locator("#overlay .panel").evaluate((panel) =>
          panel
            .getAnimations()
            .filter((animation) => animation.effect.getTiming().iterations !== Infinity)
            .forEach((animation) => animation.finish())
        );
        await page.waitForFunction(() => document.querySelector("#overlay .panel").hidden);
        assert.equal(await page.locator("#overlay .panel").evaluate((panel) => panel.hidden), true);
        await page.clock.fastForward(1000);
        assert.equal(await page.locator("#overlay .panel").evaluate((panel) => panel.hidden), false);
      } finally {
        await page.close();
      }
    });

    await t.test("scrolling ticker rebuilds copies when only the viewport grows", async () => {
      const page = await browser.newPage({ viewport: { width: 400, height: 400 }, deviceScaleFactor: 3 });
      try {
        await serve(page, assets, true);
        const entries = JSON.stringify([{ text: "Ticker", prefix: "", icon: "" }]);
        await page.goto(`https://stream.test/ticker/?${new URLSearchParams({ mode: "scroll", entries, width: "3840" })}`);
        await page.waitForFunction(() => document.querySelectorAll(".ticker-group").length > 1);
        // Hold content width and motion constant so only the viewport changes.
        await page.addStyleTag({ content: ".ticker-group { width: 256px; } .ticker-track { animation: none; }" });
        await page.evaluate(() => document.fonts.ready);
        await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        const originalWidth = await page
          .locator(".ticker-group")
          .first()
          .evaluate((group) => group.offsetWidth);
        await page.setViewportSize({ width: 1600, height: 400 });
        await page.waitForFunction(() => document.querySelector(".ticker-viewport").clientWidth > 1200);
        await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        const layout = await page.evaluate(() => ({
          viewport: document.querySelector(".ticker-viewport").clientWidth,
          width: document.querySelector(".ticker-group").offsetWidth,
          groups: document.querySelectorAll(".ticker-group").length
        }));
        assert.equal(layout.width, originalWidth, "the content itself did not change");
        assert.ok((layout.groups - 1) * layout.width >= layout.viewport, "copies cover the viewport through a full scroll cycle");
      } finally {
        await page.close();
      }
    });

    // --- PAGE-LOAD AND FIXED SCHEDULE ANCHORS ---
    await t.test("timed resources restart on load unless fixed start is enabled", async () => {
      const cases = [
        { name: "timer", values: { duration: "60", format: "seconds", milliseconds: "no" }, selector: ".timer-digits", initial: "60", advanced: "55", fixed: "55" },
        { name: "timeline", values: { duration: "60" }, selector: ".primary", initial: "0%", advanced: "8%", fixed: "8%" },
        { name: "randomizer", values: { duration: "2", showNumber: "yes" }, selector: ".secondary", initial: "DRAW 1", advanced: "DRAW 3", fixed: "DRAW 3" },
        { name: "reminder", values: { entries: '["First","Second"]', interval: "10", duration: "2", transition: "none" }, selector: ".primary", initial: "First", advanced: "hidden", fixed: "hidden" }
      ];
      for (const entry of cases) {
        const page = await browser.newPage();
        try {
          await page.clock.install({ time: new Date("2026-11-09T18:00:00Z") });
          await page.clock.pauseAt(new Date("2026-11-09T18:00:01Z"));
          await serve(page, assets, true);
          const read = () =>
            page.evaluate((selector) => {
              const panel = document.querySelector(".panel");
              return panel.hidden ? "hidden" : panel.querySelector(selector).textContent;
            }, entry.selector);
          // Clock assertions are independent of the separately tested visual transition phases.
          const parameters = new URLSearchParams({ ...entry.values, animate: "no", startTime: "2020-01-01T00:00:00Z", endTime: "2020-01-01T01:00:00Z" });
          await page.goto(`https://stream.test/${entry.name}/?${parameters}`);
          await page.waitForFunction(() => window.byStreamResource && document.querySelector(".primary"));
          assert.equal(await read(), entry.initial, `${entry.name} starts fresh despite inactive timestamps`);
          const generated = new URL(await page.evaluate(() => byStream.settingsURL(byStreamResource, byStreamResource.settings).href));
          assert.ok(generated.search.length > 1);
          assert.equal(generated.searchParams.has("startTime"), false);
          assert.equal(generated.searchParams.has("endTime"), false);
          await page.clock.fastForward(5000);
          assert.equal(await read(), entry.advanced, `${entry.name} advances from the captured load time`);
          await page.reload();
          await page.waitForFunction(() => window.byStreamResource && document.querySelector(".primary"));
          assert.equal(await read(), entry.initial, `${entry.name} resets on reload`);

          const now = await page.evaluate(() => Date.now());
          parameters.set("useStartTime", "yes");
          parameters.set("startTime", new Date(now - 5000).toISOString());
          parameters.set("endTime", new Date(now + 55000).toISOString());
          await page.goto(`https://stream.test/${entry.name}/?${parameters}`);
          await page.waitForFunction(() => window.byStreamResource && document.querySelector(".panel"));
          assert.equal(await read(), entry.fixed, `${entry.name} honors an enabled fixed start`);
          const anchored = await page.evaluate(() => byStream.settingsURL(byStreamResource, byStreamResource.settings).href);
          assert.equal(new URL(anchored).searchParams.get("startTime"), parameters.get("startTime"));
          await page.reload();
          await page.waitForFunction(() => window.byStreamResource && document.querySelector(".panel"));
          assert.equal(await read(), entry.fixed, `${entry.name} retains the fixed schedule on reload`);
        } finally {
          await page.close();
        }
      }
    });

    // --- LOCAL FILE SUPPORT ---
    await t.test("downloaded file URLs render without editor files", async () => {
      const directory = await fs.mkdtemp(path.join(os.tmpdir(), "stream-resource-"));
      const page = await browser.newPage();
      try {
        // The downloaded fixture contains renderer files only; no editor files are available.
        await fs.mkdir(path.join(directory, "watermark"));
        await fs.copyFile(path.join(root, "resource.js"), path.join(directory, "resource.js"));
        for (const file of ["watermark.js", "watermark.css"]) await fs.copyFile(path.join(root, "watermark", file), path.join(directory, "watermark", file));
        const html = standaloneHTML(await fs.readFile(path.join(root, "watermark/index.html"), "utf8"));
        const file = path.join(directory, "watermark/index.html");
        await fs.writeFile(file, html);
        await serve(page, assets, true);
        await page.goto(`${pathToFileURL(file).href}?text=Downloaded`);
        await page.waitForFunction(() => document.querySelector("#overlay .primary")?.textContent === "Downloaded");
        assert.equal(await page.evaluate(() => typeof byConfigurator), "undefined");
        assert.match(await page.evaluate(() => byStream.settingsURL(byStreamResource, byStreamResource.settings).href), /\/index\.html\?text=Downloaded$/);
        await fs.mkdir(path.join(directory, "controller"));
        for (const asset of ["controller.js", "controller.css"]) await fs.copyFile(path.join(root, "controller", asset), path.join(directory, "controller", asset));
        const controllerFile = path.join(directory, "controller/index.html");
        await fs.writeFile(controllerFile, standaloneHTML(await fs.readFile(path.join(root, "controller/index.html"), "utf8")));
        await page.goto(`${pathToFileURL(controllerFile).href}?player=9&skin=xone`);
        await page.waitForFunction(() => document.querySelector('[role="alert"]')?.textContent.includes("require HTTP/HTTPS"));
        assert.equal(await page.evaluate(() => typeof byConfigurator), "undefined");
      } finally {
        await page.close();
        assert.equal(path.dirname(directory), os.tmpdir());
        await fs.rm(directory, { recursive: true, force: true });
      }
    });
  } finally {
    await browser.close();
  }
});
test("default keyboard separates WASD, arrow D-pad, and Q/E shoulders", async () => {
  const assets = await loadAssets(["_functions.min.js"]);
  const browser = await chromium.launch(launchOptions);
  try {
    const page = await browser.newPage();
    await serve(page, assets, true);
    await page.goto("https://stream.test/controller/?player=9&skin=xseries");
    await page.waitForSelector(".controller.active:not(.disconnected)");
    const directions = [
      ["a", [-1, 0, 0, 0], []],
      ["d", [1, 0, 0, 0], []],
      ["w", [0, -1, 0, 0], []],
      ["s", [0, 1, 0, 0], []],
      ["ArrowUp", [0, 0, 0, 0], [12]],
      ["ArrowDown", [0, 0, 0, 0], [13]],
      ["ArrowLeft", [0, 0, 0, 0], [14]],
      ["ArrowRight", [0, 0, 0, 0], [15]],
      ["f", [0, 0, -1, 0], []],
      ["h", [0, 0, 1, 0], []],
      ["t", [0, 0, 0, -1], []],
      ["g", [0, 0, 0, 1], []]
    ];
    for (const [key, axes, buttons] of directions) {
      await page.keyboard.down(key);
      await page.waitForFunction(
        (axes) =>
          ["stick-1", "stick-2"].every((name, i) => {
            const translate = document.querySelector(`.control[data-name="${name}"]`).style.translate.split(" ").map(parseFloat);
            return translate.every((value, axis) => Math.sign(value) === axes[i * 2 + axis]);
          }),
        axes
      );
      assert.deepEqual(await page.evaluate(() => bySettingsKB.axes), axes, key);
      assert.deepEqual(await page.evaluate(() => bySettingsKB.buttons.flatMap((value, i) => (value ? [i] : []))), buttons, key);
      await page.keyboard.up(key);
    }
    for (const [slot, key] of [
      [0, "j"],
      [1, "k"],
      [2, "u"],
      [3, "i"],
      [4, "q"],
      [5, "o"],
      [6, "e"],
      [7, "l"],
      [8, "Tab"],
      [9, "Escape"],
      [10, "r"],
      [11, "y"],
      [16, "3"]
    ]) {
      await page.keyboard.down(key);
      assert.deepEqual(await page.evaluate(() => bySettingsKB.buttons.flatMap((value, i) => (value ? [i] : []))), [slot], key);
      assert.deepEqual(await page.evaluate(() => bySettingsKB.axes), [0, 0, 0, 0], key);
      await page.keyboard.up(key);
    }
    await page.goto("https://stream.test/controller/?player=9&skin=fgc&layout=minimal");
    await page.waitForSelector(".controller.active:not(.disconnected)");
    await page.keyboard.down("ArrowUp");
    await page.waitForFunction(() => parseFloat(document.querySelector('.control[data-name="stick-1"]').style.translate.split(" ")[1]) < 0);
    await page.keyboard.up("ArrowUp");
    await page.waitForFunction(() =>
      document
        .querySelector('.control[data-name="stick-1"]')
        .style.translate.split(" ")
        .every((value) => parseFloat(value) === 0)
    );
  } finally {
    await browser.close();
  }
});

test("eight gamepads keep independent players, LEDs, and keyboard through reconnections", async () => {
  const assets = await loadAssets(["_functions.min.js"]);
  const browser = await chromium.launch(launchOptions);
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await serve(page, assets, true);
    await page.addInitScript(() => {
      window.testPads = Array.from({ length: 8 }, (_, index) => ({ id: `Pad ${index}`, index, connected: true, buttons: Array.from({ length: 18 }, () => ({ value: 0 })), axes: [0, 0, 0, 0] }));
      Object.defineProperty(navigator, "getGamepads", { value: () => testPads });
    });
    await page.goto("https://stream.test/controller/?showPlayerIndicators=yes&player=all&skin=xseries");
    await page.waitForSelector('#gamepads[data-gamepad-count="8"] #gamepad-9');
    assert.equal(await page.locator(".controller.active:not(.disconnected)").count(), 9);
    const patterns = ["X---", "-X--", "--X-", "---X", "X--X", "-X-X", "--XX", "X-XX", "XXXX"];
    assert.deepEqual(
      await page.locator(".controller").evaluateAll((nodes) => nodes.map((node) => [...node.querySelectorAll(".player-leds-layer [data-player]")].map((led) => (led.classList.contains("lit") ? "X" : "-")).join(""))),
      patterns
    );
    assert.equal(await page.evaluate(() => new Set([...document.querySelectorAll("[id]")].map((node) => node.id)).size === document.querySelectorAll("[id]").length), true, "Instances have independent SVG IDs");

    for (let player = 1; player <= 8; player++) {
      await page.evaluate((player) => {
        testPads[player - 1].buttons[0].value = 1;
        testPads[player - 1].buttons[6].value = player / 8;
        testPads[player - 1].axes[0] = player / 8;
      }, player);
      await page.waitForFunction((player) => document.querySelectorAll('.control[data-name="button-1"].pressed').length === player, player);
      assert.equal(await page.locator(`#gamepad-${player} .control[data-name="button-1"]`).evaluate((node) => node.classList.contains("pressed")), true);
      assert.equal(await page.locator('#gamepad-9 .control[data-name="button-1"]').evaluate((node) => node.classList.contains("pressed")), false);
    }
    await page.keyboard.down("j");
    await page.waitForSelector('#gamepad-9 .control[data-name="button-1"].pressed');
    assert.equal(await page.evaluate(() => byStreamResource.gamepadSupport.gamepadsRaw[9] === bySettingsKB), true);
    assert.equal(await page.evaluate(() => byStreamResource.gamepadSupport.connectedCount), 8);
    await page.keyboard.up("j");
    await page.waitForFunction(() => !document.querySelector('#gamepad-9 .control[data-name="button-1"]').classList.contains("pressed"));
    assert.equal(await page.locator('.control[data-name="button-1"].pressed').count(), 8);
    assert.equal(
      await page.locator(".controller").evaluateAll((nodes) =>
        nodes.every((node, index) => {
          const box = node.getBoundingClientRect();
          return (
            box.width > 0 &&
            box.height > 0 &&
            box.left >= 0 &&
            box.top >= 0 &&
            box.right <= innerWidth &&
            box.bottom <= innerHeight &&
            nodes.slice(index + 1).every((other) => {
              const next = other.getBoundingClientRect();
              return box.right <= next.left || next.right <= box.left || box.bottom <= next.top || next.bottom <= box.top;
            })
          );
        })
      ),
      true,
      "All nine inputs fit without overlap"
    );

    await page.evaluate(() => {
      testPads[2] = null;
    });
    await page.waitForSelector('#gamepads[data-gamepad-count="7"]', { state: "attached" });
    assert.equal(await page.locator("#gamepad-3").count(), 0);
    assert.equal(await page.locator("#gamepad-8").count(), 1, "Other players retain their assignments");
    await page.evaluate(() => {
      testPads[2] = { id: "Reconnected pad", index: 9, connected: true, buttons: [{ value: 1 }], axes: [0, 0, 0, 0] };
    });
    await page.waitForSelector('#gamepads[data-gamepad-count="8"] #gamepad-3 .control[data-name="button-1"].pressed');
    assert.deepEqual(await page.evaluate(() => [byStreamResource.gamepadSupport.gamepadsRaw[2].index, byStreamResource.gamepadSupport.gamepadsRaw[9].id]), [9, "Keyboard"], "Browser index 9 never replaces keyboard P9");
    await page.evaluate(() => testPads.push({ id: "Overflow", index: 12, buttons: [], axes: [] }));
    await page.waitForTimeout(100);
    assert.equal(await page.evaluate(() => byStreamResource.gamepadSupport.connectedCount), 8);
    await page.evaluate(() => {
      testPads.fill(null);
    });
    await page.waitForSelector('#gamepads[data-gamepad-count="0"] #gamepad-9');
    assert.equal(await page.locator(".controller.active").count(), 1, "Keyboard remains available without connected gamepads");

    await page.goto("https://stream.test/controller/?showPlayerIndicators=yes&player=gamepads&skin=xseries");
    await page.waitForSelector('#gamepads[data-gamepad-count="8"] #gamepad-8');
    assert.equal(await page.locator(".controller.active").count(), 8);
    assert.equal(await page.locator("#gamepad-9").count(), 0, "All connected displays gamepads only");
    await page.keyboard.press("f");
    await page.waitForFunction(() => byStreamResource.gamepadSupport.kb);
    assert.equal(await page.locator("#gamepad-9").count(), 0, "Activating keyboard input does not add it to the gamepads-only view");
    await page.evaluate(() => {
      testPads.fill(null);
    });
    await page.waitForSelector('#gamepads[data-gamepad-count="0"]', { state: "attached" });
    assert.equal(await page.locator(".controller.active").count(), 0);
    await page.evaluate(() => {
      testPads[0] = { id: "Reconnected", index: 0, buttons: [], axes: [] };
    });
    await page.waitForSelector("#gamepad-1:not(.disconnected)");
    assert.equal(await page.locator(".controller.active").count(), 1);

    await page.goto("https://stream.test/controller/?showPlayerIndicators=yes&player=7&skin=ds3");
    await page.waitForSelector("#gamepad-7:not(.disconnected)");
    await page.evaluate(() => {
      testPads[6].buttons[0].value = 1;
    });
    await page.waitForSelector('#gamepad-7 .control[data-name="button-1"].pressed');
    assert.equal(await page.locator(".controller-background [data-player]").evaluateAll((leds) => leds.map((led) => (led.classList.contains("lit") ? "X" : "-")).join("")), "--XX");
    await page.evaluate(() => {
      testPads[6].connected = false;
    });
    await page.waitForSelector("#gamepad-7.disconnected");
    await page.waitForFunction(() => !document.querySelector('#gamepad-7 .control[data-name="button-1"]').classList.contains("pressed"));
    await page.evaluate(() => {
      testPads[6].connected = true;
    });
    await page.waitForSelector('#gamepad-7:not(.disconnected) .control[data-name="button-1"].pressed');
    for (const skin of ["xseries", "ds3"]) {
      await page.goto(`https://stream.test/controller/?showPlayerIndicators=yes&player=8&skin=${skin}&mirror=yes`);
      await page.waitForSelector("#gamepad-8:not(.disconnected)");
      assert.equal(
        await page.locator(".player-indicator[data-player]").evaluateAll((nodes) =>
          nodes
            .filter((node) => {
              const box = node.getBoundingClientRect();
              return box.width > 0 && getComputedStyle(node).visibility === "visible";
            })
            .sort((a, b) => a.getBoundingClientRect().left - b.getBoundingClientRect().left)
            .map((node) => (node.classList.contains("lit") ? "X" : "-"))
            .join("")
        ),
        "X-XX",
        `${skin} keeps the player pattern readable when mirrored`
      );
    }
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
  }
});

test("All player modes retain disconnected slots and keep keyboard input separate", async () => {
  const assets = await loadAssets(["_functions.min.js"]);
  const browser = await chromium.launch(launchOptions);
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await serve(page, assets, true);
    await page.addInitScript(() => {
      window.testPads = [];
      Object.defineProperty(navigator, "getGamepads", { value: () => testPads });
    });
    await page.goto("https://stream.test/controller/?player=all-gamepads&skin=gcn&variant=sequential");
    await page.waitForSelector('#gamepads[data-gamepad-count="0"] #gamepad-8');
    assert.equal(await page.locator(".controller.active").count(), 8);
    assert.equal(await page.locator(".controller.disconnected").count(), 8);
    assert.equal(await page.locator("#gamepad-9").count(), 0);
    const palettes = () => page.locator(".controller-background").evaluateAll((nodes) => nodes.map((node) => node.dataset.variant));
    const expected = ["original", "indigo", "silver", "white", "bonyur", "arctic", "sakura", "lagoon"];
    assert.deepEqual(await palettes(), expected);
    await page.evaluate(() => {
      window.originalSlot = document.getElementById("gamepad-6");
      testPads[5] = { id: "P6 fixture", index: 5, buttons: [{ value: 1 }], axes: [] };
    });
    await page.waitForSelector('#gamepads[data-gamepad-count="1"] #gamepad-6:not(.disconnected) .control[data-name="button-1"].pressed');
    assert.equal(await page.locator(".controller.active").count(), 8);
    assert.equal(await page.locator(".controller.disconnected").count(), 7);
    assert.deepEqual(await palettes(), expected, "Fixed slots retain their palette sequence on connection changes");
    await page.evaluate(() => {
      testPads[5] = null;
    });
    await page.waitForSelector('#gamepads[data-gamepad-count="0"] #gamepad-6.disconnected');
    await page.waitForFunction(() => !document.querySelector('#gamepad-6 .control[data-name="button-1"]').classList.contains("pressed"));
    assert.equal(await page.evaluate(() => originalSlot === document.getElementById("gamepad-6")), true, "Connection changes update existing fixed slots");
    await page.keyboard.press("f");
    await page.waitForFunction(() => byStreamResource.gamepadSupport.kb);
    assert.equal(await page.locator(".controller.active").count(), 8);
    assert.equal(await page.locator("#gamepad-9").count(), 0, "All excludes keyboard even after it is activated");

    await page.goto("https://stream.test/controller/?player=all-inputs&skin=xseries");
    await page.waitForSelector('#gamepads[data-gamepad-count="0"] #gamepad-9:not(.disconnected)');
    assert.equal(await page.locator(".controller.active").count(), 9);
    assert.equal(await page.locator(".controller.disconnected").count(), 8);
    assert.equal(await page.evaluate(() => byStreamResource.gamepadSupport.gamepadsRaw[9] === bySettingsKB), true);
    await page.keyboard.down("j");
    await page.waitForSelector('#gamepad-9 .control[data-name="button-1"].pressed');
    await page.evaluate(() => {
      testPads[0] = { id: "P1 fixture", index: 0, buttons: [{ value: 1 }], axes: [] };
    });
    await page.waitForSelector('#gamepads[data-gamepad-count="1"] #gamepad-1:not(.disconnected) .control[data-name="button-1"].pressed');
    assert.equal(await page.locator(".controller.active").count(), 9);
    assert.equal(await page.locator('.control[data-name="button-1"].pressed').count(), 2);
    await page.keyboard.up("j");
    await page.waitForFunction(() => !document.querySelector('#gamepad-9 .control[data-name="button-1"]').classList.contains("pressed"));
    assert.equal(await page.locator('#gamepad-1 .control[data-name="button-1"].pressed').count(), 1);
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
  }
});

test("sequential controller variants cycle visible palettes through layout and connection changes", async () => {
  const assets = await loadAssets(["_functions.min.js"]);
  const browser = await chromium.launch(launchOptions);
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await serve(page, assets, true);
    await page.addInitScript(() => {
      window.testPads = Array.from({ length: 8 }, (_, index) => ({ index, id: `Pad ${index}`, buttons: [], axes: [] }));
      Object.defineProperty(navigator, "getGamepads", { value: () => testPads });
    });
    const variants = () => page.locator(".controller-background").evaluateAll((nodes) => nodes.map((node) => node.dataset.variant));
    await page.goto("https://stream.test/controller/?player=all&skin=gcn&variant=sequential");
    await page.waitForSelector("#gamepad-9:not(.disconnected)");
    const expected = ["original", "indigo", "silver", "white", "bonyur", "arctic", "sakura", "lagoon", "forest"];
    assert.deepEqual(await variants(), expected);
    assert.equal(await page.locator(".controller-background .shell-base").evaluateAll((nodes) => new Set(nodes.map((node) => getComputedStyle(node).fill)).size), 9, "Nine visible players have distinct shell colors");
    for (const layout of ["minimal", "full"]) {
      await page.evaluate((layout) => document.querySelectorAll(".controller").forEach((node) => byControllerArtwork.setLayout(node, layout)), layout);
      assert.deepEqual(await variants(), expected, layout);
    }
    await page.evaluate(() => {
      testPads[0] = null;
    });
    await page.waitForSelector('#gamepads[data-gamepad-count="7"]', { state: "attached" });
    assert.equal(await page.locator("#gamepad-1").count(), 0);
    assert.deepEqual(await variants(), expected.slice(0, 8), "The sequence follows visible order despite gaps in player numbers");
    await page.evaluate(() => {
      testPads[0] = { index: 0, id: "Reconnected", buttons: [], axes: [] };
    });
    await page.waitForSelector('#gamepads[data-gamepad-count="8"] #gamepad-1');
    assert.deepEqual(await variants(), expected, "Reconnecting restores the visible sequence");

    await page.goto("https://stream.test/controller/?player=8&skin=gcn&variant=sequential");
    await page.waitForSelector("#gamepad-8:not(.disconnected)");
    assert.deepEqual(await variants(), ["original"], "A single controller uses Default");
    await page.goto("https://stream.test/controller/?player=gamepads&skin=nes&variant=sequential");
    await page.waitForSelector("#gamepad-8:not(.disconnected)");
    assert.deepEqual(await variants(), ["original", "bonyur", "arctic", "sakura", "lagoon", "forest", "sunset", "royal"], "Previously stock-only skins also sequence their palettes");
    await page.goto("https://stream.test/controller/?player=gamepads&skin=xseries&variant=red");
    await page.waitForSelector("#gamepad-8:not(.disconnected)");
    assert.deepEqual(await variants(), Array(8).fill("red"), "Explicit palettes still apply to every controller");
    await page.goto("https://stream.test/controller/?player=all&skin=gcn&variant=sequential&customColors=yes&controllerColor=2255cc");
    await page.waitForSelector("#gamepad-9:not(.disconnected)");
    assert.deepEqual(await variants(), Array(9).fill("original"), "Custom colors take precedence over stock sequencing");
    assert.equal(await page.locator(".controller-background .shell-base").evaluateAll((nodes) => nodes.every((node) => getComputedStyle(node).fill === "rgb(34, 85, 204)")), true);
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
  }
});

test("every controller skin paints at least nine distinct palettes in full and minimal layouts", async () => {
  const assets = await loadAssets(["_functions.min.js"]);
  const browser = await chromium.launch(launchOptions);
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await serve(page, assets, true);
    await page.goto("https://stream.test/controller/?player=9&skin=nes&variant=cyberpunk");
    await page.waitForSelector('#gamepad-9 .controller-background[data-variant="cyberpunk"]');
    assert.equal(await page.evaluate(() => byStream.settingsURL(byStreamResource, byStreamResource.settings).searchParams.get("variant")), "cyberpunk");
    await page.keyboard.down("j");
    await page.waitForSelector('.control[data-name="button-1"].pressed');
    await page.keyboard.up("j");
    const results = await page.evaluate(() => {
      const mount = document.createElement("div");
      mount.className = "controller active";
      document.body.append(mount);
      const results = [];
      for (const [id, skin] of Object.entries(byControllerArtwork.skins)) {
        const full = new Set(),
          minimal = new Set();
        let layered = true,
          contrast = true,
          transparent = true,
          uniformFaces = true,
          readableLabels = true;
        for (const variant of ["original", ...Object.keys(skin.variants)]) {
          mount.innerHTML = byControllerArtwork.render(id, "full", "icons", variant, "palette-test").markup;
          layered &&= [...mount.querySelectorAll("svg[data-controller]")].every((svg) => svg.dataset.variant === variant);
          const fill = (selector) => {
            const node = mount.querySelector(selector);
            return node ? getComputedStyle(node).fill : "";
          };
          const themed = ["bonyur", "arctic", "sakura", "lagoon", "forest", "sunset", "royal", "sandstone", "cyberpunk"].includes(variant);
          const matchingFaces = () => {
            if (["genesis", "saturn"].includes(id)) return new Set(["A", "B", "C"].map((label) => fill(`.control[data-label="${label}"] .button-face`))).size === 1;
            if (!themed) return true;
            if (!["PlayStation", "Xbox", "Steam"].includes(skin.platform) && id !== "dreamcast" && !id.startsWith("fgc")) return true;
            const faces = id.startsWith("fgc") ? [...mount.querySelectorAll(".control:not(.stick) .button-face")] : [1, 2, 3, 4].map((slot) => mount.querySelector(`.control[data-name="button-${slot}"] .button-face`));
            return faces.length >= 4 && faces.every(Boolean) && new Set(faces.map((node) => getComputedStyle(node).fill)).size === 1;
          };
          if (themed && skin.platform === "Xbox") {
            const luminance = (color) =>
              color
                .match(/[\d.]+/g)
                .slice(0, 3)
                .map(Number)
                .reduce((sum, channel, index) => {
                  channel /= 255;
                  return sum + (channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4) * [0.2126, 0.7152, 0.0722][index];
                }, 0);
            for (const slot of [1, 2, 3, 4]) {
              const control = mount.querySelector(`.control[data-name="button-${slot}"]`);
              const background = luminance(getComputedStyle(control.querySelector(".button-face")).fill);
              const glyphs = [...control.querySelectorAll(".hardware-icon path, path.hardware-icon, polygon.hardware-icon, .word-label text")];
              readableLabels &&=
                glyphs.length > 0 &&
                glyphs.every((node) => {
                  const style = getComputedStyle(node);
                  const ink = luminance(style.fill === "none" ? style.stroke : style.fill);
                  return (Math.max(background, ink) + 0.05) / (Math.min(background, ink) + 0.05) >= 4.5;
                });
            }
          }
          full.add(`${fill(".shell-base")}/${fill('.control[data-name="button-1"] .button-face')}`);
          uniformFaces &&= matchingFaces();
          for (const trigger of mount.querySelectorAll(".analog-trigger")) {
            const inactive = trigger.querySelector(".full-geometry .button-face");
            const active = trigger.querySelector(".trigger-active .button-face");
            if (inactive && active) contrast &&= getComputedStyle(inactive).fill !== getComputedStyle(active).fill;
          }
          transparent &&= [...mount.querySelectorAll(".screen-surface")].every((node) => getComputedStyle(node).opacity === "0");
          byControllerArtwork.setLayout(mount, "minimal");
          minimal.add(fill('.control[data-name="button-1"] .button-face'));
          uniformFaces &&= matchingFaces();
        }
        mount.innerHTML = byControllerArtwork.render(id, "full", "icons", "unknown-palette").markup;
        results.push({
          id,
          palettes: Object.keys(skin.variants).length + 1,
          full: full.size,
          minimal: minimal.size,
          layered,
          contrast,
          transparent,
          uniformFaces,
          readableLabels,
          fallback: mount.querySelector(".controller-background").dataset.variant
        });
      }
      mount.remove();
      return results;
    });
    assert.equal(results.length, 34, "Includes the three Fight Stick views");
    for (const result of results) {
      assert.ok(result.palettes >= 9 && result.full >= 9 && result.minimal >= 9, `${result.id} paints nine distinct palettes including Default in both layouts`);
      assert.equal(result.layered, true, `${result.id} retains its palette across independent SVG layers`);
      assert.equal(result.contrast, true, `${result.id} retains contrasting trigger pressure fills`);
      assert.equal(result.transparent, true, `${result.id} retains transparent screen interiors`);
      assert.equal(result.uniformFaces, true, `${result.id} keeps matching face-button fills in each palette and layout`);
      assert.equal(result.readableLabels, true, `${result.id} keeps Xbox theme labels at a contrast ratio of at least 4.5`);
      assert.equal(result.fallback, "original", `${result.id} falls back for unknown palettes`);
    }
    await page.goto("https://stream.test/controller/?player=9&skin=nes&variant=cyberpunk&customColors=yes&controllerColor=2255cc");
    await page.waitForSelector('#gamepad-9 .controller-background[data-variant="original"]');
    assert.equal(await page.locator(".controller-background .shell-base").evaluate((node) => getComputedStyle(node).fill), "rgb(34, 85, 204)");
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
  }
});

test("controller layouts preserve native lamps, use plain square LEDs, and keep Xbox 360 guide indicators", async () => {
  const assets = await loadAssets(["_functions.min.js"]);
  const browser = await chromium.launch(launchOptions);
  try {
    const page = await browser.newPage();
    await serve(page, assets, true);
    await page.goto("https://stream.test/controller/?showPlayerIndicators=yes&player=9&skin=xseries");
    await page.waitForSelector("#gamepad-9:not(.disconnected)");
    assert.equal(await page.evaluate(() => byStreamResource.settings.showPlayerIndicators), "yes");
    const skins = await page.evaluate(() => Object.keys(byControllerArtwork.skins));
    for (const skin of skins) {
      await page.goto(`https://stream.test/controller/?showPlayerIndicators=yes&player=9&skin=${skin}`);
      await page.waitForSelector("#gamepad-9:not(.disconnected)");
      assert.equal(await page.locator(".player-led-bezel").count(), 0, `${skin} has no LED bezel`);
      if (skin === "x360") {
        assert.equal(await page.locator(".player-leds-layer .player-indicator").count(), 4, "Xbox 360 has a row available for minimal mode");
      } else {
        assert.equal(
          await page
            .locator(".player-leds-layer .player-indicator")
            .evaluateAll((nodes) => nodes.length === 4 && nodes.every((node) => node.tagName === "rect" && node.getAttribute("width") === node.getAttribute("height") && !node.hasAttribute("rx"))),
          true,
          `${skin} uses four unrounded squares`
        );
        assert.equal(await page.locator(".controller-background .player-indicator[data-player]").count(), ["ds3", "wii", "wiinunchuk", "wiiupro"].includes(skin) ? 4 : 0, `${skin} retains only its native shell indicators`);
      }
      for (const layout of ["full", "minimal", "full"]) {
        await page.evaluate((layout) => byControllerArtwork.setLayout(document.querySelector(".controller"), layout), layout);
        const geometry = await page.locator(".player-leds-layer .player-indicator").evaluateAll((nodes) => nodes.map((node) => [Number(node.getAttribute("x")), Number(node.getAttribute("width")), Number(node.getAttribute("height"))]));
        assert.deepEqual(
          geometry,
          [0, 1, 2, 3].map((index) => (layout === "minimal" ? [index * 15, 5, 5] : [index * 8, 3, 3])),
          `${skin} preserves minimal sizes and uses smaller full-layout lamps`
        );
        if (skin === "x360") {
          const rings = await page.locator(".player-ring[data-player]").evaluateAll((nodes) =>
            nodes.map((node) => ({
              player: Number(node.dataset.player),
              lit: node.classList.contains("lit"),
              stroke: getComputedStyle(node).stroke,
              visible: node.getBoundingClientRect().width > 0 && getComputedStyle(node).visibility === "visible"
            }))
          );
          assert.deepEqual(
            rings.map((ring) => ring.player),
            [1, 2, 3, 4]
          );
          assert.ok(
            rings.every((ring) => ring.lit && ring.visible && ring.stroke === "rgb(101, 227, 116)"),
            `Xbox 360 ${layout} identifies keyboard with all four guide segments`
          );
          if (layout === "full") {
            assert.equal(await page.locator(".player-leds-layer").isVisible(), false, "Xbox 360 full mode uses its guide ring only");
            continue;
          }
        }
        const visible = await page.locator(".player-indicator[data-player]").evaluateAll((nodes) =>
          nodes
            .filter((node) => {
              const box = node.getBoundingClientRect();
              return box.width > 0 && box.height > 0 && getComputedStyle(node).visibility === "visible";
            })
            .map((node) => ({ player: Number(node.dataset.player), lit: node.classList.contains("lit"), fill: getComputedStyle(node).fill }))
        );
        assert.deepEqual(
          visible.map((led) => led.player),
          [1, 2, 3, 4],
          `${skin} ${layout} has exactly four visible lamps`
        );
        assert.ok(
          visible.every((led) => led.lit && led.fill === "rgb(101, 227, 116)"),
          `${skin} ${layout} shows keyboard XXXX`
        );
        if (layout === "full") {
          const overlap = await page.evaluate(() => {
            const visible = (node) => {
              const box = node.getBoundingClientRect();
              return box.width > 0 && box.height > 0 && getComputedStyle(node).visibility === "visible";
            };
            const lamps = [...document.querySelectorAll(".player-indicator")].filter(visible);
            const markings = [...document.querySelectorAll(".hardware-marking, .guide-logo-slot, .screen-surface")].filter(visible);
            return lamps.some((lamp) =>
              markings.some((marking) => {
                const a = lamp.getBoundingClientRect(),
                  b = marking.getBoundingClientRect();
                return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
              })
            );
          });
          assert.equal(overlap, false, `${skin} indicators clear logos and screens`);
        }
      }
    }
    await page.goto("https://stream.test/controller/?showPlayerIndicators=yes&player=8&skin=famicom");
    await page.waitForSelector("#gamepad-8");
    assert.equal(
      await page
        .locator('[data-player-number="8"].lit')
        .textContent()
        .then((value) => value.trim()),
      "8"
    );
    const patterns = ["X---", "-X--", "--X-", "---X", "X--X", "-X-X", "--XX", "X-XX", "XXXX"];
    for (let player = 1; player <= 9; player++) {
      await page.goto(`https://stream.test/controller/?showPlayerIndicators=yes&player=${player}&skin=x360`);
      await page.waitForSelector(".controller.active");
      for (const layout of ["full", "minimal"]) {
        await page.evaluate((layout) => byControllerArtwork.setLayout(document.querySelector(".controller"), layout), layout);
        assert.equal(await page.locator(".player-leds-layer").isVisible(), layout === "minimal");
        assert.equal(
          await page.locator(".player-ring[data-player]").evaluateAll((nodes) => nodes.map((node) => (node.classList.contains("lit") ? "X" : "-")).join("")),
          patterns[player - 1],
          `Xbox 360 P${player} ${layout} uses the assigned guide pattern`
        );
      }
    }
  } finally {
    await browser.close();
  }
});

test("player indicators default to hidden without hiding the guide or blocking input", async () => {
  const assets = await loadAssets(["_functions.min.js"]);
  const browser = await chromium.launch(launchOptions);
  try {
    const page = await browser.newPage();
    await serve(page, assets, true);
    for (const skin of ["xseries", "ds3", "wii", "wiiupro", "x360", "joycon"]) {
      for (const layout of ["full", "minimal"]) {
        await page.goto(`https://stream.test/controller/?player=9&skin=${skin}&layout=${layout}`);
        await page.waitForSelector("#gamepad-9:not(.disconnected)");
        assert.equal(await page.evaluate(() => byStreamResource.settings.showPlayerIndicators), "no");
        assert.equal(await page.locator(".player-indicator:visible, .player-ring:visible").count(), 0, `${skin} ${layout} hides all indicators`);
        const guide = page.locator(".guide-logo-slot");
        if (await guide.count()) assert.equal(await guide.isVisible(), true, `${skin} keeps its guide logo`);
        await page.keyboard.down("j");
        await page.waitForSelector('.control[data-name="button-1"].pressed');
        await page.keyboard.up("j");
      }
    }
    await page.goto("https://stream.test/controller/?player=8&skin=joycon&mirror=yes&showPlayerIndicators=yes");
    await page.waitForSelector("#gamepad-8");
    for (const layout of ["full", "minimal", "full"]) {
      await page.evaluate((layout) => byControllerArtwork.setLayout(document.querySelector(".controller"), layout), layout);
      const state = await page.locator(".player-leds-layer .player-indicator").evaluateAll(
        (nodes, layout) =>
          nodes
            .sort((a, b) => {
              const key = layout === "full" ? "top" : "left";
              return a.getBoundingClientRect()[key] - b.getBoundingClientRect()[key];
            })
            .map((node) => (node.classList.contains("lit") ? "X" : "-"))
            .join(""),
        layout
      );
      assert.equal(state, "X-XX", `Joy-Con ${layout} keeps the player order after mirroring and layout changes`);
      const box = await page.locator(".player-leds").boundingBox();
      assert.equal(box.height > box.width, layout === "full", "Joy-Con uses a vertical row only in full mode");
    }
  } finally {
    await browser.close();
  }
});

test("handheld D-pads paint the requested directions after artwork rotation", async () => {
  const assets = await loadAssets(runtimeAssets);
  const browser = await chromium.launch(launchOptions);
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    await serve(page, assets, true);
    await page.addInitScript(() => {
      window.testPad = { id: "Directional input", index: 0, buttons: Array.from({ length: 40 }, () => ({ value: 0 })), axes: [0, 0, 0, 0] };
      Object.defineProperty(navigator, "getGamepads", { value: () => [testPad] });
    });
    for (const skin of ["steamdeck", "wiiu"])
      for (const layout of ["full", "minimal"]) {
        await page.goto(`https://stream.test/controller/?player=1&skin=${skin}&layout=${layout}`);
        await page.waitForSelector(".controller.active:not(.disconnected)");
        const bounds = await page.locator('.control[data-input="button:12"] .press-visual').evaluate((node) => node.getBoundingClientRect().toJSON());
        const images = [];
        const states = [[], [12], [13], [14], [15], [12, 15], []];
        for (const pressed of states) {
          await page.evaluate((pressed) => {
            for (let slot = 12; slot <= 15; slot++) testPad.buttons[slot].value = Number(pressed.includes(slot));
          }, pressed);
          await page.waitForFunction((pressed) => [12, 13, 14, 15].every((slot) => document.querySelector(`.control[data-input="button:${slot}"]`).classList.contains("pressed") === pressed.includes(slot)), pressed);
          images.push((await page.screenshot({ clip: { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height } })).toString("base64"));
        }
        const samples = await page.evaluate(async (images) => {
          const samples = [];
          for (const data of images) {
            const bitmap = await createImageBitmap(new Blob([Uint8Array.from(atob(data), (c) => c.charCodeAt(0))], { type: "image/png" }));
            const canvas = document.createElement("canvas");
            canvas.width = bitmap.width;
            canvas.height = bitmap.height;
            const context = canvas.getContext("2d");
            context.drawImage(bitmap, 0, 0);
            samples.push(
              [
                [0.5, 0.18],
                [0.5, 0.82],
                [0.18, 0.5],
                [0.82, 0.5]
              ].map(([x, y]) => [...context.getImageData(Math.floor(x * canvas.width), Math.floor(y * canvas.height), 1, 1).data])
            );
            bitmap.close();
          }
          return samples;
        }, images);
        for (let state = 0; state < states.length; state++)
          for (let direction = 0; direction < 4; direction++) {
            const inverted = states[state].includes(direction + 12);
            assert.ok(
              samples[state][direction].slice(0, 3).every((channel, i) => Math.abs(channel - (inverted ? 255 - samples[0][direction][i] : samples[0][direction][i])) <= 1),
              `${skin}/${layout}: ${states[state]} paints direction ${direction + 12} correctly`
            );
          }
      }
  } finally {
    await browser.close();
  }
});

// Pixel checks exercise the browser's actual SVG filter painting, not just computed CSS.
test("controller inversion paints and releases consistently across browser engines", async (t) => {
  for (const [engine, type, options] of [
    ["Chromium", chromium, launchOptions],
    ["Firefox", firefox, {}],
    ["WebKit", webkit, {}]
  ]) {
    let installed = true;
    if (engine !== "Chromium") {
      try {
        await fs.access(type.executablePath());
      } catch {
        installed = false;
      }
    }
    await t.test(engine, { skip: installed ? false : "Install this Playwright browser to run pixel checks" }, async () => {
      const browser = await type.launch(options);
      try {
        // Handheld buttons need an OBS-sized canvas; thumbnail filters can rasterize their edges differently.
        const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
        await serve(page, new Map());
        await page.route("**/controller/pixels.html", (route) => route.fulfill({ contentType: "text/html", body: "<style>body{margin:0;background:#808080}</style>" }));
        await page.goto("https://stream.test/controller/pixels.html");
        await page.addStyleTag({ content: await fs.readFile(path.join(root, "controller", "controller.css"), "utf8") });
        await page.addScriptTag({ url: "https://stream.test/controller/controller.js" });
        await page.evaluate(async () => {
          window.byControllerArtwork = await loadControllerArtwork();
        });
        const ids = await page.evaluate(() => Object.keys(byControllerArtwork.skins));
        for (const id of ids) {
          await page.evaluate((id) => {
            const artwork = byControllerArtwork.render(id, "full", "icons");
            document.body.innerHTML = `<div class="controller active" style="position:relative;top:0;left:0;width:1280px;height:720px;--controller-color:#485368">${artwork.markup}</div>`;
          }, id);
          for (const layout of ["full", "minimal"]) {
            await page.evaluate((layout) => {
              const controller = document.querySelector(".controller");
              byControllerArtwork.setLayout(controller, layout);
              controller.style.width = "1280px";
              controller.style.height = "720px";
            }, layout);
            const control = page.locator('.control[data-name="button-1"]');
            assert.equal(await control.evaluate((node) => node.tagName), "svg", "Control owns a root SVG for WebKit filter painting");
            const bounds = await control.evaluate((node) => {
              const visual = node.querySelector(".press-visual");
              const bounds = visual.getBoundingClientRect().toJSON();
              // Native stock strokes can extend beyond SVG's fill-only client rectangle.
              const stroke = Math.max(
                0,
                ...[...visual.querySelectorAll("path, circle, ellipse, rect, polygon")].map((shape) => {
                  const style = getComputedStyle(shape),
                    matrix = shape.getScreenCTM();
                  if (style.stroke === "none") return 0;
                  return (parseFloat(style.strokeWidth) / 2) * (style.vectorEffect === "non-scaling-stroke" ? 1 : Math.max(Math.hypot(matrix.a, matrix.b), Math.hypot(matrix.c, matrix.d)));
                })
              );
              return { x: bounds.x - stroke, y: bounds.y - stroke, width: bounds.width + stroke * 2, height: bounds.height + stroke * 2 };
            });
            await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
            const images = [await page.screenshot()];
            await control.evaluate((node) => node.classList.add("pressed"));
            await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
            images.push(await page.screenshot());
            await control.evaluate((node) => node.classList.remove("pressed"));
            await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
            images.push(await page.screenshot());
            const result = await page.evaluate(
              async ({ images, bounds }) => {
                const pixels = [];
                let width;
                for (const data of images) {
                  const image = await createImageBitmap(new Blob([Uint8Array.from(atob(data), (character) => character.charCodeAt(0))], { type: "image/png" }));
                  const canvas = document.createElement("canvas");
                  canvas.width = image.width;
                  canvas.height = image.height;
                  width = image.width;
                  const context = canvas.getContext("2d");
                  context.drawImage(image, 0, 0);
                  pixels.push(context.getImageData(0, 0, canvas.width, canvas.height).data);
                }
                let changed = 0,
                  inverted = 0,
                  unrelated = 0,
                  released = true;
                const neighbors = [-width - 1, -width, -width + 1, -1, 1, width - 1, width, width + 1];
                for (let i = 0; i < pixels[0].length; i += 4) {
                  const releaseChanged = [0, 1, 2, 3].some((channel) => Math.abs(pixels[0][i + channel] - pixels[2][i + channel]) > 1);
                  const pressChanged = [0, 1, 2].some((channel) => Math.abs(pixels[0][i + channel] - pixels[1][i + channel]) > 5);
                  if (!releaseChanged && !pressChanged) continue;
                  // Filter compositing can rasterize SVG edges differently; protect flat interiors in both states.
                  const flat = neighbors.every((offset) => [0, 1, 2].every((channel) => Math.abs(pixels[0][i + offset * 4 + channel] - pixels[0][i + channel]) <= 1));
                  if (releaseChanged && flat) released = false;
                  if (pressChanged) {
                    const x = (i / 4) % width,
                      y = Math.floor(i / 4 / width);
                    if (x < bounds.x - 4 || x > bounds.x + bounds.width + 4 || y < bounds.y - 4 || y > bounds.y + bounds.height + 4) {
                      if (flat) unrelated++;
                    } else {
                      changed++;
                      if ([0, 1, 2].every((channel) => Math.abs(pixels[0][i + channel] + pixels[1][i + channel] - 255) < 4)) inverted++;
                    }
                  }
                }
                return { changed, ratio: inverted / Math.max(1, changed), unrelated, released };
              },
              { images: images.map((image) => image.toString("base64")), bounds }
            );
            assert.ok(result.changed > 0 && result.ratio > 0.8, `${engine}/${id}/${layout} paints inverted colors`);
            assert.equal(result.unrelated, 0, `${engine}/${id}/${layout} preserves unrelated colors`);
            assert.equal(result.released, true, `${engine}/${id}/${layout} restores its idle pixels`);
          }
        }
        const pressureModels =
          engine === "Chromium"
            ? await page.evaluate(() =>
                Object.values(byControllerArtwork.skins)
                  .filter((skin) => skin.buttons.some((button) => button.analog))
                  .map((skin) => skin.id)
              )
            : ["gcn", "ds5", "steamdeck"];
        for (const id of pressureModels)
          for (const outline of engine === "Chromium" ? [0.5, 2] : [1])
            for (const input of await page.evaluate((id) => byControllerArtwork.skins[id].buttons.filter((button) => button.analog).map((button) => button.id), id))
              for (const layout of ["full", "minimal"]) {
                await page.evaluate(
                  ({ id, layout, outline }) => {
                    const artwork = byControllerArtwork.render(id, layout, "icons");
                    document.body.innerHTML = `<div class="controller active" style="position:relative;top:0;left:0;width:1280px;height:720px">${artwork.markup}</div>`;
                    customizeControllerAppearance(document.querySelector(".controller"), {
                      customColors: "yes",
                      controllerColor: "#485368",
                      outlineWidth: outline,
                      customOutlineColor: "no",
                      tintOutlines: "no",
                      highlightIntensity: 12,
                      shadowIntensity: 16,
                      tintControls: "no",
                      customGuide: "no"
                    });
                  },
                  { id, layout, outline }
                );
                const images = [];
                for (const pressure of [0, 0.25, 0.5, 0.75, 1, 0]) {
                  await page.locator(`.analog-trigger[data-input="button:${input}"]`).evaluate((node, pressure) => {
                    const id = node.querySelector(".trigger-active").getAttribute("clip-path").slice(5, -1);
                    const rect = node.querySelector(`[id="${id}"] rect`);
                    const horizontal = node.dataset.layout === "minimal";
                    const [x, y, width, height] = node.dataset.pressureFullBounds.split(" ").map(Number);
                    const inset = Math.min(parseFloat(getComputedStyle(node.querySelector(".full-geometry .vector-outline")).strokeWidth) / 2, width / 2, height / 2);
                    const box = horizontal ? node.querySelector(".trigger-active").getBBox() : { x: x + inset, y: y + inset, width: width - inset * 2, height: height - inset * 2 };
                    rect.setAttribute("x", String(box.x));
                    rect.setAttribute("y", String(horizontal ? box.y : box.y + box.height * (1 - pressure)));
                    rect.setAttribute("width", String(horizontal ? box.width * pressure : box.width));
                    rect.setAttribute("height", String(horizontal ? box.height : box.height * pressure));
                  }, pressure);
                  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
                  images.push((await page.screenshot()).toString("base64"));
                }
                const changed = await page.evaluate(async (images) => {
                  let initial;
                  const changes = [];
                  for (const image of images) {
                    const bitmap = await createImageBitmap(new Blob([Uint8Array.from(atob(image), (c) => c.charCodeAt(0))], { type: "image/png" }));
                    const canvas = document.createElement("canvas");
                    canvas.width = bitmap.width;
                    canvas.height = bitmap.height;
                    const context = canvas.getContext("2d");
                    context.drawImage(bitmap, 0, 0);
                    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
                    initial ||= pixels;
                    const neighbors = [-canvas.width - 1, -canvas.width, -canvas.width + 1, -1, 1, canvas.width - 1, canvas.width, canvas.width + 1];
                    let count = 0;
                    for (let i = 0; i < pixels.length; i += 4) {
                      if (![0, 1, 2].some((channel) => Math.abs(initial[i + channel] - pixels[i + channel]) > 5)) continue;
                      // Count pressure changes in flat interiors, excluding SVG edge rasterization.
                      const flat = neighbors.every((offset) => [0, 1, 2].every((channel) => Math.abs(initial[i + offset * 4 + channel] - initial[i + channel]) <= 1));
                      if (flat) count++;
                    }
                    changes.push(count);
                  }
                  return changes;
                }, images);
                assert.equal(changed[0], 0);
                assert.equal(changed[5], 0, `${engine}/${id}/${input}/${layout}/${outline} releases its pressure fill`);
                for (let i = 1; i <= 4; i++) assert.ok(changed[i] > changed[i - 1], `${engine}/${id}/${input}/${layout}/${outline} progressively paints pressure ${i * 25}%`);
              }
      } finally {
        await browser.close();
      }
    });
  }
});
