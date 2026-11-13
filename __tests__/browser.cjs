/*
 * File: __tests__/browser.cjs
 * Desc: Browser fixtures shared by independent resource and configurator suites; no tests run on import.
 */

// --- DEPENDENCIES ---
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");

// --- PINNED DEPENDENCIES AND BROWSER OPTIONS ---
const root = path.join(__dirname, "..");
const spaBase = "https://cdn.jsdelivr.net/gh/byuwur/spa.js@v20.7/";
const runtimeAssets = ["_functions.min.js", "_fonts.min.js", "js/gsap.min.js", "js/morphSVGplugin.min.js"];
const launchOptions = { channel: process.env.BROWSER_CHANNEL || undefined, executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || undefined };

// --- CDN FIXTURES ---
// Load only the caller's dependencies before browser routing, keeping fetch failures inside its suite.
async function loadAssets(files) {
  return new Map(
    await Promise.all(
      files.map(async (file) => {
        const url = `${spaBase}${file}`;
        const response = await fetch(url);
        assert.ok(response.ok, `Unable to load ${url}: ${response.status}`);
        return [url, { body: await response.text(), contentType: file.endsWith(".css") ? "text/css" : "text/javascript" }];
      })
    )
  );
}

// --- RESOURCE DISCOVERY ---
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

// --- STANDALONE PAGE FIXTURE ---
// Remove the optional editor imports to exercise the supported renderer-only entry point.
function standaloneHTML(html) {
  const boundary = html.indexOf("<!-- ===== CONFIGURATOR ===== -->");
  assert.ok(boundary >= 0, "Resource must mark its optional configurator imports");
  return `${html.slice(0, boundary)}</body></html>`;
}

// --- REQUEST ROUTING ---
/**
 * Serve local sources and preloaded CDN assets; unrelated external requests are aborted.
 * @param {import("playwright").Page} page Page whose requests belong to this fixture.
 * @param {Map<string, Object>} assets CDN URLs mapped to Playwright fulfillment options.
 * @param {boolean} [standalone=false] Strip configurator imports from served resource pages.
 * @returns {Promise<void>} Resolves after the route handler is registered.
 */
async function serve(page, assets, standalone = false) {
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (assets.has(url.href)) return route.fulfill(assets.get(url.href));
    if (url.protocol === "file:") return route.continue();
    if (url.origin !== "https://stream.test") return route.abort();
    let file, body;
    try {
      const pathname = decodeURIComponent(url.pathname).replaceAll("\\", "/");
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
    const contentType = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg" }[path.extname(file)] || "application/octet-stream";
    return route.fulfill({ body, contentType });
  });
}

// --- SUITE FIXTURES ---
module.exports = { root, runtimeAssets, launchOptions, loadAssets, resourceNames, standaloneHTML, serve };
