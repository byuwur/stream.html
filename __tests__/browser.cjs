/*
 * File: __tests__/browser.cjs
 * Desc: Browser fixtures shared by independent resource and configurator suites; no tests run on import.
 */

// ===== DEPENDENCIES =====
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const { readFileSync } = require("node:fs");
const { chromium, firefox, webkit } = require("playwright");

// ===== PINNED DEPENDENCIES AND BROWSER OPTIONS =====
const root = path.join(__dirname, "..");
const spaVersion = readFileSync(path.join(root, "resource.js"), "utf8").match(/byStream\.SPA_VERSION = "([^"]+)"/)[1];
const spaBase = `https://cdn.jsdelivr.net/gh/byuwur/spa.js@${spaVersion}/`;
const runtimeAssets = ["css/animate.min.css", "_load.min.js", "_functions.min.js", "_fonts.min.js", "js/gsap.min.js", "js/morphSVGplugin.min.js"];
const engine = process.env.BROWSER_ENGINE || "chromium";
assert.ok(["chromium", "firefox", "webkit"].includes(engine), "Unsupported BROWSER_ENGINE");

/**
 * Launch the selected engine with bounded startup; executable/channel overrides belong to Chromium.
 * @returns {Promise<import("playwright").Browser>} Browser owned and closed by the calling suite.
 */
function launchBrowser() {
  return { chromium, firefox, webkit }[engine].launch({
    timeout: 10000,
    ...(engine === "chromium"
      ? {
          channel: process.env.BROWSER_CHANNEL,
          executablePath: process.env.CHROMIUM_EXECUTABLE_PATH
        }
      : {})
  });
}

// ===== LOCAL DEPENDENCY FIXTURES =====
/**
 * Read real SPA.js assets from its local checkout behind the resource's declared URLs.
 * @param {string[]} files Relative SPA.js asset paths required by this suite.
 * @returns {Promise<Map<string, Object>>} Browser fulfillment bodies; missing files fail setup.
 */
async function loadAssets(files) {
  const directory = process.env.SPA_ASSETS_ROOT || path.join(root, "../spa.js");
  const assets = new Map();
  for (const file of new Set(["_load.min.js", ...files])) {
    let body;
    try {
      body = await fs.readFile(path.join(directory, file));
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
      body = await fs.readFile(path.join(directory, file.replace(/\.min(?=\.(?:css|js)$)/, "")));
    }
    assets.set(`${spaBase}${file}`, {
      body,
      contentType: file.endsWith(".css") ? "text/css" : "text/javascript"
    });
  }
  return assets;
}

// ===== RESOURCE DISCOVERY =====
// Discover resource pages by their template so missing renderer scripts still fail their checks.
async function resourceNames() {
  const folders = await fs.readdir(root, { withFileTypes: true });
  const names = [];
  for (const folder of folders.filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))) {
    try {
      const html = await fs.readFile(path.join(root, folder.name, "index.html"), "utf8");
      if (html.includes('id="overlay-markup"')) names.push(folder.name);
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
  assert.ok(names.length > 0, "No resources found");
  return names;
}

// ===== STANDALONE PAGE FIXTURE =====
// Remove the optional editor imports to exercise the supported renderer-only entry point.
function standaloneHTML(html) {
  const boundary = html.indexOf("<!-- ===== CONFIGURATOR ===== -->");
  assert.ok(boundary >= 0, "Resource must mark its optional configurator imports");
  return html.replace(/<template id="configurator-assets">[\s\S]*?<\/template>/, "").replace(/<div id="configurator"><\/div>/, "");
}

// ===== REQUEST ROUTING =====
/**
 * Serve local sources and preloaded CDN assets; unrelated external requests are aborted.
 * @param {import("playwright").Page} page Page whose requests belong to this fixture.
 * @param {Map<string, Object>} assets CDN URLs mapped to Playwright fulfillment options.
 * @param {boolean} [standalone=false] Strip configurator imports from served resource pages.
 * @param {string} [baseURL="https://stream.test/"] Hosted project root, including its optional path prefix.
 * @returns {Promise<void>} Resolves after the route handler is registered.
 */
async function serve(page, assets, standalone = false, baseURL = "https://stream.test/") {
  const base = new URL(baseURL);
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (assets.has(url.href)) return route.fulfill(assets.get(url.href));
    // Keep browser-owned local reads native; WebKit also routes upload preview blob URLs.
    if (["file:", "blob:", "data:"].includes(url.protocol)) return route.continue();
    if (url.origin !== base.origin) return route.abort();
    if (!url.pathname.startsWith(base.pathname)) return route.fulfill({ status: 404, body: "Not found" });
    let file, body;
    try {
      const pathname = decodeURIComponent(url.pathname.slice(base.pathname.length - 1)).replaceAll("\\", "/");
      if (pathname.includes("\0")) return route.fulfill({ status: 400, body: "Invalid path" });
      file = path.resolve(root, `.${pathname}`, pathname.endsWith("/") ? "index.html" : "");
      const relative = path.relative(root, file);
      if (relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) return route.fulfill({ status: 403, body: "Forbidden" });
      // Resolve symlinks as well as dot segments before opening a repository fixture.
      file = await fs.realpath(file);
      const resolved = path.relative(await fs.realpath(root), file);
      if (resolved === ".." || resolved.startsWith(`..${path.sep}`) || path.isAbsolute(resolved)) return route.fulfill({ status: 403, body: "Forbidden" });
      body = await fs.readFile(file);
    } catch (error) {
      if (error instanceof URIError) return route.fulfill({ status: 400, body: "Invalid path" });
      if (["ENOENT", "ENOTDIR", "EISDIR", "EINVAL"].includes(error.code)) return route.fulfill({ status: 404, body: "Not found" });
      throw error;
    }
    if (standalone && file.endsWith(".html")) body = standaloneHTML(body.toString());
    const contentType =
      {
        ".html": "text/html",
        ".js": "text/javascript",
        ".css": "text/css",
        ".svg": "image/svg+xml",
        ".png": "image/png",
        ".jpg": "image/jpeg"
      }[path.extname(file)] || "application/octet-stream";
    return route.fulfill({ body, contentType });
  });
}

// ===== SUITE FIXTURES =====
module.exports = { root, runtimeAssets, launchBrowser, loadAssets, resourceNames, standaloneHTML, serve };
