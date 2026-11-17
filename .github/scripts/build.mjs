/**
 * @file Build portable resource HTML, Controller/Keyboard ZIPs, manifests, checksums, and release notes.
 * Run from the repository root with node .github/scripts/build.mjs --tag <version>.
 * Every build includes the embedded Controller marked [EXPERIMENTAL].
 * --update-dependencies refreshes pinned dependency hashes for review.
 * --check validates a pushed tag. --publish uploads the tested inventory and publishes its verified draft.
 * Build outputs live in dist/assets. Size and performance diagnostics live in dist/experimental.
 */
import { build, transform } from "esbuild";
import { zipSync } from "fflate";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import * as fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import { parse, serialize } from "parse5";
import { format } from "prettier";

export const root = fileURLToPath(new URL("../../", import.meta.url));
export const SPA_VERSION = (await fs.readFile(path.join(root, "resource.js"), "utf8")).match(/byStream\.SPA_VERSION = "([^"]+)"/)[1];
export const SPA_HOST = `https://cdn.jsdelivr.net/gh/byuwur/spa.js@${SPA_VERSION}`;
export const config = {
  repository: "byuwur/stream.html",
  branch: "main",
  // 32x32 PNG derived from stream.html.png for portable distributions.
  favicon:
    "data:image/png;base64,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",
  externalStyles: [`${SPA_HOST}/css/fontawesome.min.css`],
  dynamicDependencies: {
    "controller/controller.js": {
      directory: "controller/controllers",
      extension: ".svg",
      baseExpression: "document.currentScript.src"
    },
    "keyboard/keyboard.js": {
      directory: "keyboard/keys",
      extension: ".svg",
      baseExpression: "document.currentScript.src"
    }
  },
  optionalContent: ["Google Fonts selected through SPA.js _fonts.min.js", "User-configured images, logos, video, and QR link destinations"]
};
// export const hosted = `https://${config.repository.split("/")[0]}.github.io/${config.repository.split("/")[1]}/`;
export const hosted = "https://stream.byuwur.co/";
export const dist = path.join(root, "dist");
/**
 * @param {string|Buffer} body Content to hash.
 * @returns {string} Lowercase SHA-256 digest.
 */
export const sha256 = (body) => createHash("sha256").update(body).digest("hex");

/**
 * Validate the version used in release filenames and download URLs.
 * @param {string} tag SemVer version with a v prefix, including optional prerelease/build identifiers.
 * @returns {string} Accepted tag.
 * @throws {Error} Rejects malformed versions and whitespace.
 */
export function validateTag(tag) {
  // SemVer numeric prerelease identifiers cannot have leading zeroes.
  const number = "(?:0|[1-9][0-9]*)";
  const identifier = `(?:${number}|[0-9]*[A-Za-z-][0-9A-Za-z-]*)`;
  assert.ok(!/\s/.test(tag) && new RegExp(`^v${number}\\.${number}\\.${number}(?:-${identifier}(?:\\.${identifier})*)?(?:\\+[0-9A-Za-z-]+(?:\\.[0-9A-Za-z-]+)*)?$`).test(tag), `Invalid release tag: ${tag}`);
  return tag;
}

/**
 * @param {Object} tree parse5 document or element.
 * @returns {Array<Object>} All nodes, including inert template contents.
 */
export function nodes(tree) {
  const result = [];
  /**
   * @param {Object} node Current subtree to append to the traversal.
   * @returns {void}
   */
  function visit(node) {
    result.push(node);
    for (const child of node.childNodes || []) visit(child);
    if (node.content) visit(node.content);
  }
  visit(tree);
  return result;
}

/**
 * @param {Object} node parse5 node.
 * @param {string} name Attribute name.
 * @returns {string|undefined} Attribute value.
 */
export const attr = (node, name) => node.attrs?.find((item) => item.name === name)?.value;
/**
 * @param {Object} node Element to update.
 * @param {string} name Attribute name.
 * @param {string|null} value Replacement value, or null to remove it.
 * @returns {void}
 */
export function setAttr(node, name, value) {
  node.attrs = (node.attrs || []).filter((item) => item.name !== name);
  if (value !== null) node.attrs.push({ name, value });
}
/**
 * @param {Object} node Attached parse5 node to detach from its parent.
 * @returns {void}
 */
export function remove(node) {
  node.parentNode.childNodes = node.parentNode.childNodes.filter((child) => child !== node);
}
/**
 * @param {Object} node Node whose children are replaced.
 * @param {string} text Raw text to serialize.
 * @returns {void}
 */
export function textContent(node, text) {
  node.childNodes = [{ nodeName: "#text", value: text, parentNode: node }];
}
export { parse, serialize };

/**
 * Format generated HTML while preserving script/style payloads, including multiline string whitespace.
 * @param {Object} tree Parsed HTML document whose embedded text is temporarily replaced with markers.
 * @returns {Promise<string>} Formatted HTML with the original embedded source restored.
 */
export async function formatHTML(tree) {
  const sources = new Map();
  const prefix = `stream-release-inline-${sha256(serialize(tree))}-`;
  for (const node of nodes(tree).filter((node) => ["script", "style", "link"].includes(node.tagName))) {
    if (node.childNodes.length) {
      const marker = `${prefix}${sources.size}`;
      sources.set(
        marker,
        node.childNodes
          .map((child) => child.value || "")
          .join("")
          .trim()
      );
      textContent(node, `\n${marker}\n`);
    }
    // Separate asset tags before formatting so whitespace-sensitive printing keeps complete closing tags.
    const parent = node.parentNode;
    let index = parent.childNodes.indexOf(node);
    if (!/\n[\t ]*$/.test(parent.childNodes[index - 1]?.value || "")) parent.childNodes.splice(index, 0, { nodeName: "#text", value: "\n", parentNode: parent });
    index = parent.childNodes.indexOf(node);
    if (!/^[\t ]*\n/.test(parent.childNodes[index + 1]?.value || "")) parent.childNodes.splice(index + 1, 0, { nodeName: "#text", value: "\n", parentNode: parent });
  }
  const html = await format(serialize(tree), {
    parser: "html",
    tabWidth: 2,
    useTabs: false,
    printWidth: 240,
    trailingComma: "none",
    proseWrap: "never",
    bracketSameLine: true,
    singleAttributePerLine: false,
    htmlWhitespaceSensitivity: "css",
    objectWrap: "preserve",
    embeddedLanguageFormatting: "off"
  });
  return html.replace(new RegExp(`${prefix}\\d+`, "g"), (marker) => sources.get(marker));
}

/**
 * Expand declared asset arrays into ordered tags while preserving the lazy editor template.
 * @param {Object} tree Parsed resource document to update.
 * @param {string} entry Repository-relative source HTML path for local URL resolution.
 * @param {boolean} [includeLoader=true] Include the loader needed by editor distributions.
 * @returns {Object} Updated document.
 * @throws {Error} Rejects invalid groups, missing hosts, and unsupported dependency extensions.
 */
export function expandAssets(tree, entry, includeLoader = true) {
  for (const list of nodes(tree).filter((node) => node.tagName === "script" && attr(node, "type") === "application/json" && (["shared-assets", "resource-assets"].includes(attr(node, "id")) || attr(node, "data-load") !== undefined))) {
    const shared = attr(list, "id") === "shared-assets";
    const runtime = shared || attr(list, "id") === "resource-assets";
    const source = attr(list, "data-source");
    assert.ok(source, `Dependency source required in ${entry}`);
    const host = `${source}@${SPA_VERSION || attr(list, "data-spa-version")}`;
    const files = JSON.parse(list.childNodes.map((node) => node.value || "").join(""));
    assert.ok(Array.isArray(files), `Dependency array required in ${entry}`);
    if (shared && includeLoader) files.unshift({ path: "/_load.min.js", optional: false });
    const imports = files.map((file) => {
      const { path: filePath, attributes = {} } = typeof file === "string" ? { path: file } : file;
      const url = filePath.startsWith("/") ? new URL(`${host}${filePath}`) : new URL(filePath, localURL(entry));
      const stylesheet = url.pathname.endsWith(".css");
      assert.ok(stylesheet || url.pathname.endsWith(".js"), `Unsupported dependency in ${entry}: ${filePath}`);
      const node = nodes(parse(stylesheet ? '<link rel="stylesheet">' : "<script defer></script>")).find((item) => item.tagName === (stylesheet ? "link" : "script"));
      setAttr(node, stylesheet ? "href" : "src", url.href);
      if (file.optional || config.externalStyles.includes(url.href)) setAttr(node, "data-load-optional", "");
      if (stylesheet && !runtime) {
        setAttr(node, "data-editor-style", "");
        setAttr(node, "media", "not all");
      }
      for (const [name, value] of Object.entries(attributes)) setAttr(node, name, value);
      node.parentNode = list.parentNode;
      return node;
    });
    list.parentNode.childNodes.splice(list.parentNode.childNodes.indexOf(list), 1, ...imports);
  }
  return tree;
}

/**
 * Discover authored resource entry points from overlay-markup templates and matching data-tool IDs.
 * @returns {Promise<Array<{id: string, entry: string, name: string, source: Buffer}>>} Resources sorted by folder name.
 * @throws {Error} Rejects invalid identities, missing editor boundaries, and an empty resource inventory.
 */
export async function resources() {
  const result = [];
  for (const entry of (await fs.readdir(root, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name, "en"))) {
    if (!entry.isDirectory() || entry.name.startsWith(".")) continue;
    const file = path.join(root, entry.name, "index.html");
    let source;
    try {
      source = await fs.readFile(file);
    } catch (error) {
      if (error.code === "ENOENT") continue;
      throw error;
    }
    const tree = parse(source.toString());
    const all = nodes(tree);
    if (!all.some((node) => node.tagName === "template" && attr(node, "id") === "overlay-markup")) continue;
    assert.match(entry.name, /^[a-z][a-z0-9-]*$/, `Unsafe release resource ID: ${entry.name}`);
    assert.equal(
      attr(
        all.find((node) => node.tagName === "html"),
        "data-tool"
      ),
      entry.name,
      `Resource identity: ${file}`
    );
    assert.ok(
      all.some((node) => attr(node, "id") === "configurator-assets"),
      `Missing configurator dependency boundary: ${file}`
    );
    result.push({
      id: entry.name,
      entry: `${entry.name}/index.html`,
      name: all
        .find((node) => node.tagName === "title")
        .childNodes[0].value.replace(/ (?:for OBS|Overlay for OBS).*$/, "")
        .split(" | ")[0],
      source
    });
  }
  assert.ok(result.length, "No resource entry points found");
  return result;
}

/**
 * @param {string} relative Path relative to the repository root.
 * @returns {URL} Local file URL.
 */
export function localURL(relative) {
  return pathToFileURL(path.join(root, relative));
}

/**
 * Resolve symlinks before checking that a dependency belongs to the repository source tree.
 * @param {URL} url Local dependency URL.
 * @returns {Promise<string>} Resolved filesystem path.
 * @throws {Error} Rejects missing/outside files, dot directories, node_modules, and dist.
 */
export async function containedFile(url) {
  const file = await fs.realpath(fileURLToPath(url));
  const relative = path.relative(await fs.realpath(root), file);
  assert.ok(relative && !relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative), `Dependency outside repository: ${url}`);
  assert.ok(!relative.split(path.sep).some((part) => part.startsWith(".") || part === "node_modules" || part === "dist"), `Invalid source dependency: ${relative}`);
  return file;
}

/**
 * Require an HTTPS jsDelivr GitHub URL pinned to a version or full commit hash.
 * @param {URL} url Remote dependency URL.
 * @returns {void}
 * @throws {Error} Rejects floating, unversioned, or unsupported URLs.
 */
export function assertPinned(url) {
  assert.equal(url.protocol, "https:", `Dependencies must use HTTPS: ${url}`);
  assert.ok(!/@(?:latest|main|master)(?:[/?#]|$)/i.test(url.href), `Floating dependency: ${url}`);
  assert.ok(url.hostname === "cdn.jsdelivr.net" && /^\/gh\/[^/]+\/[^/@]+@[^/]+\//.test(url.pathname), `Unregistered or unversioned dependency: ${url}`);
  const ref = decodeURIComponent(url.pathname.match(/@([^/]+)\//)[1]);
  assert.match(ref, /^(?:v?\d+\.\d+(?:\.\d+)?(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?|[0-9a-f]{40})$/, `Dependency must name a version or full commit: ${url}`);
}

/**
 * Resolve dependencies for one build with pinned hashes, cached downloads, and local fallback.
 * @param {boolean} [updateLock=false] Refresh remote digests for an intentional dependency update.
 * @returns {Promise<Object>} Reader with read(), minified(), used inventory, and saveLock().
 */
export async function dependencyReader(updateLock = false) {
  const lockFile = fileURLToPath(new URL("./release-dependencies.json", import.meta.url));
  const lock = updateLock ? {} : JSON.parse(await fs.readFile(lockFile, "utf8"));
  const used = new Map();
  const pending = new Map();
  const cache = path.join(os.tmpdir(), "stream-html-release-cache");
  await fs.mkdir(cache, { recursive: true });
  /**
   * Read source or a locked remote asset and record its digest in the build inventory.
   * @param {URL|string} url Dependency location. Remote responses are bounded to 20 MiB.
   * @returns {Promise<Buffer>} Source bytes. Matching cached requests share their result.
   * @throws {Error} Rejects unavailable required dependencies and mismatched pinned hashes.
   */
  async function read(url) {
    url = new URL(url);
    url.hash = "";
    if (config.externalStyles.includes(url.href) || /font-?awesome|\/fa-(?:solid|regular|brands|v4compatibility)[^/]*\.(?:woff2?|ttf|svg)/i.test(url.pathname)) throw new Error(`Font Awesome must never be downloaded or embedded: ${url}`);
    if (pending.has(url.href)) return pending.get(url.href);
    const request = (async () => {
      let body;
      if (url.protocol === "file:") body = await fs.readFile(await containedFile(url));
      else {
        assertPinned(url);
        assert.ok(updateLock || lock[url.href], `Unregistered dependency ${url}; review and run node .github/scripts/build.mjs --tag <tag> --update-dependencies`);
        const cacheFile = path.join(cache, sha256(url.href));
        try {
          body = await fs.readFile(cacheFile);
        } catch (error) {
          if (error.code !== "ENOENT") throw error;
        }
        if (body && !updateLock && sha256(body) !== lock[url.href]) body = undefined;
        if (!body) {
          try {
            const response = await fetch(url, { signal: AbortSignal.timeout(30000), redirect: "error" });
            assert.ok(response.ok, `Unable to resolve ${url}: HTTP ${response.status}`);
            body = Buffer.from(await response.arrayBuffer());
            assert.ok(body.length && body.length <= 20 * 1024 * 1024, `Invalid dependency size: ${url}`);
            assert.ok(!/text\/html/i.test(response.headers.get("content-type") || ""), `Expected dependency, received HTML: ${url}`);
          } catch (error) {
            // A local SPA checkout is usable only when its bytes match the pinned dependency lock.
            if (!url.href.startsWith(`${SPA_HOST}/`) || !lock[url.href]) throw error;
            try {
              const directory = process.env.SPA_ASSETS_ROOT || path.join(root, "../spa.js");
              body = await fs.readFile(path.join(directory, decodeURIComponent(url.pathname.slice(new URL(SPA_HOST).pathname.length + 1))));
              assert.equal(sha256(body), lock[url.href]);
            } catch {
              throw error;
            }
          }
          await fs.writeFile(cacheFile, body);
        }
        if (updateLock) lock[url.href] = sha256(body);
        assert.equal(sha256(body), lock[url.href], `Dependency content changed: ${url}`);
      }
      used.set(url.href, { source: url.protocol === "file:" ? path.relative(root, fileURLToPath(url)).split(path.sep).join("/") : url.href, sha256: sha256(body), bytes: body.length });
      return body;
    })();
    pending.set(url.href, request);
    return request;
  }
  return {
    read,
    used,
    /**
     * Prefer jsDelivr's minified copy when this local source matches the requested commit.
     * @param {URL} url Authored project JS/CSS file.
     * @param {Buffer} source Source bytes already read by this dependency reader.
     * @param {string} commit Exact source commit.
     * @param {Object} [options={}] Checkout and HTTP overrides for local validation.
     * @param {string} [options.directory=root] Checkout used to compare source with Git.
     * @param {Function} [options.request=fetch] HTTP implementation for the optional CDN request.
     * @returns {Promise<Buffer|null>} CDN bytes, or null to use the existing local pipeline.
     * @throws {Error} Rejects invalid commit hashes and cache filesystem failures.
     */
    async minified(url, source, commit, { directory = root, request = fetch } = {}) {
      url = new URL(url);
      if (url.protocol !== "file:" || !/\.(?:js|css)$/.test(url.pathname) || /\.min\.(?:js|css)$/.test(url.pathname)) return null;
      assert.match(commit, /^[0-9a-f]{40}$/);
      const relative = path.relative(directory, fileURLToPath(url)).split(path.sep).join("/");
      if (relative.startsWith("../") || path.isAbsolute(relative)) return null;
      const remote = `https://cdn.jsdelivr.net/gh/${config.repository}@${commit}/${relative.replace(/\.(js|css)$/, ".min.$1")}`;
      const key = `minified:${remote}:${sha256(source)}`;
      if (pending.has(key)) return pending.get(key);
      const result = (async () => {
        try {
          const committed = execFileSync("git", ["show", `${commit}:${relative}`], { cwd: directory, maxBuffer: 20 * 1024 * 1024, stdio: ["ignore", "pipe", "ignore"] });
          // Edited and untracked files must use their current local contents.
          if (committed.toString().replaceAll("\r\n", "\n") !== source.toString().replaceAll("\r\n", "\n")) return null;
        } catch {
          return null;
        }
        const cacheFile = path.join(cache, `${sha256(remote)}.min.json`);
        let body;
        try {
          const cached = JSON.parse(await fs.readFile(cacheFile, "utf8"));
          const bytes = Buffer.from(cached.body, "base64");
          if (sha256(bytes) === cached.sha256) body = bytes;
        } catch (error) {
          if (error.code !== "ENOENT" && !(error instanceof SyntaxError)) throw error;
        }
        if (!body) {
          let response;
          try {
            response = await request(remote, { signal: AbortSignal.timeout(10000), redirect: "error" });
            if (!response.ok || /text\/html/i.test(response.headers.get("content-type") || "")) return null;
            body = Buffer.from(await response.arrayBuffer());
          } catch {
            return null;
          }
          if (!body.length || body.length > 20 * 1024 * 1024) return null;
          await fs.writeFile(cacheFile, JSON.stringify({ sha256: sha256(body), body: body.toString("base64") }));
        }
        used.set(remote, { source: remote, sha256: sha256(body), bytes: body.length });
        return body;
      })();
      pending.set(key, result);
      return result;
    },
    /** @returns {Promise<void>} Persist refreshed dependency hashes when updates are enabled. */
    async saveLock() {
      if (updateLock) await fs.writeFile(lockFile, `${JSON.stringify(Object.fromEntries(Object.entries(lock).sort()), null, 2)}\n`);
    }
  };
}

/**
 * @param {string} tag Release version.
 * @param {string} filename Asset basename.
 * @returns {string} GitHub Release download URL.
 */
export function downloadURL(tag, filename) {
  return `https://github.com/${config.repository}/releases/download/${encodeURIComponent(tag)}/${filename}`;
}

/**
 * Read committed changes since the nearest reachable version tag, excluding the release being built.
 * @param {string} tag Current release or preview tag.
 * @param {string} [directory=root] Git checkout whose HEAD supplies the built source.
 * @returns {{previousTag: string|null, commit: string, ref: string, commits: Array<{sha: string, subject: string}>}} Commit range and original subjects.
 * @throws {Error} Rejects unreadable Git history or a checkout without HEAD.
 */
export function releaseChangelog(tag, directory = root) {
  /**
   * @param {...string} args Git arguments.
   * @returns {string} Trimmed UTF-8 command output.
   */
  const git = (...args) => execFileSync("git", args, { cwd: directory, encoding: "utf8" }).trim();
  const commit = git("rev-parse", "HEAD");
  const previous = git("describe", "--tags", "--abbrev=0", "--always", "--match", "v[0-9]*", `--exclude=${tag}`, commit);
  const previousTag = previous.startsWith("v") ? previous : null;
  const ref = git("tag", "--points-at", commit).split("\n").includes(tag) ? tag : commit;
  const log = git("log", "--format=%H%x00%s", previousTag ? `${previousTag}..${commit}` : commit);
  const commits = log
    ? log.split("\n").map((line) => {
        const [sha, subject] = line.split("\0");
        return { sha, subject };
      })
    : [];
  return { previousTag, commit, ref, commits };
}

/**
 * Render linked commit hashes with plain subjects, the download table, format guidance, and experimental labels.
 * @param {Object} manifest Release inventory with resources, assets, and optional changelog data.
 * @returns {string} Markdown used by RELEASE_NOTES.md and the GitHub Release description.
 */
export function releaseNotes(manifest) {
  const formats = ["original", "online", "bundle", "standalone", "full-zip", "standalone-zip", "embedded"];
  const lines = [`# stream.html ${manifest.tag}`, "", "Configurable browser overlays for OBS, generated from the tagged source."];
  if (manifest.changelog) {
    const { previousTag, ref, commits } = manifest.changelog;
    const repository = `https://github.com/${config.repository}`;
    lines.push("", "## Changes", "");
    for (const commit of commits) {
      const subject = commit.subject.replace(/[\\`*_\[\]<>&]/g, "\\$&");
      lines.push(`- ([${commit.sha.slice(0, 7)}](${repository}/commit/${commit.sha})) ${subject}`);
    }
    if (!commits.length) lines.push("There are no new commits in this range.");
    const range = previousTag ? `${previousTag}...${ref}` : ref;
    const url = previousTag ? `${repository}/compare/${encodeURIComponent(previousTag)}...${encodeURIComponent(ref)}` : `${repository}/commits/${encodeURIComponent(ref)}`;
    lines.push("", `[Full changelog (${range})](${url})`);
  }
  lines.push(
    "",
    "## Download tiers",
    "",
    "| Tier | Contents | Requires |",
    "| --- | --- | --- |",
    "| Original | Authored HTML. | Repository files and dependencies. |",
    "| Online | Editor and overlay; CDN assets. | Published tag and internet. |",
    "| Bundle | Editor and overlay; embedded JS/CSS. | CDN artwork for Controller/Keyboard. |",
    "| Standalone | Renderer; embedded JS/CSS. | URL settings; CDN artwork for Controller/Keyboard. |",
    "| Full ZIP | Editor, overlay, and SVG artwork. | Extract and serve over HTTP(S). |",
    "| Standalone ZIP | Renderer and SVG artwork. | URL settings; serve over HTTP(S). |",
    "| Embedded [EXPERIMENTAL] | Controller renderer and all SVG artwork. | URL settings; supports file://. |",
    "",
    "Original, Online, Bundle, and Full ZIP include the configurator and support F2 switching between the editor and overlay. Standalone, Standalone ZIP, and Embedded contain the renderer only. Use the configurator's generated query string to apply settings to an overlay file.",
    "",
    "Font Awesome icons, optional Google Fonts, and remote media load from their original hosts and require internet. Editor and renderer initialization tolerates missing icons.",
    "",
    "## Downloads",
    "",
    "| Resource | Original | Online | Bundle | Standalone | Full ZIP | Standalone ZIP | Embedded [EXPERIMENTAL] |",
    "| --- | --- | --- | --- | --- | --- | --- | --- |"
  );
  for (const resource of manifest.resources) {
    const cells = formats.map((format) => {
      const asset = manifest.assets.find((item) => item.resource === resource.id && item.format === format);
      return asset ? `[Download](${downloadURL(manifest.tag, asset.file)})` : "-";
    });
    lines.push(`| ${resource.name.replaceAll("|", "\\|")} | ${cells.join(" | ")} |`);
  }
  lines.push("", "Use a current Chromium-based browser. Paste the configured HTML URL into an OBS Browser Source and use Interact for keyboard controls. OBS and multi-hour endurance require separate manual validation.");
  const experiment = manifest.assets.find((item) => item.format === "embedded");
  if (experiment) lines.push("", "## [EXPERIMENTAL] Embedded Controller", "", `Single-file Controller overlay with original SVG artwork embedded for downloaded file:// use. [Download](${downloadURL(manifest.tag, experiment.file)})`);
  lines.push("", `Integrity and dependency inventory: [manifest.json](${downloadURL(manifest.tag, "manifest.json")}); verify downloads with [SHA256SUMS](${downloadURL(manifest.tag, "SHA256SUMS")}).`, "");
  return lines.join("\n");
}

/**
 * Build all distributions in a staging directory and replace the previous owned asset inventory.
 * @param {string} tag Validated release or local preview version.
 * @param {Object} options CLI switches, including the optional dependency-lock refresh.
 * @returns {Promise<void>} Writes dist/assets, its manifest copy, and experimental size diagnostics.
 * @throws {Error} Rejects invalid sources, failed required dependencies, and unexpected existing output.
 */
async function buildRelease(tag, options) {
  const cdn = `https://cdn.jsdelivr.net/gh/${config.repository}@${tag}/`;
  const dependencies = await dependencyReader(options["update-dependencies"]);
  const projectLicense = await fs.readFile(path.join(root, "LICENSE.md"), "utf8");
  const cssCache = new Map();
  const jsCache = new Map();
  const finalAssets = path.join(dist, "assets");
  let previousFiles = [];

  // Refuse to erase or reuse an arbitrary directory. Only this builder's known output is replaceable.
  try {
    const previous = JSON.parse(await fs.readFile(path.join(dist, "manifest.json"), "utf8"));
    assert.equal(previous.generator, "stream.html release builder");
    assert.equal(previous.repository, config.repository);
    for (const asset of previous.assets) {
      assert.equal(path.basename(asset.file), asset.file);
    }
    previousFiles = [...previous.assets.map((asset) => asset.file), "manifest.json", "SHA256SUMS"];
    assert.deepEqual((await fs.readdir(finalAssets)).sort(), [...previousFiles].sort(), "Unexpected files in dist/assets; move them before building");
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  await fs.mkdir(dist, { recursive: true });
  if (!previousFiles.length) {
    try {
      assert.deepEqual(await fs.readdir(finalAssets), [], "Unowned dist/assets; move it before building");
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
  const assetDir = await fs.mkdtemp(path.join(dist, ".release-"));
  try {
    /**
     * @param {URL} url Source asset URL.
     * @returns {string} Tag-pinned CDN URL for local files, or the remote URL.
     */
    function publicURL(url) {
      return url.protocol === "file:" ? `${cdn}${path.relative(root, fileURLToPath(url)).split(path.sep).join("/")}${url.search}${url.hash}` : url.href;
    }

    /**
     * Bundle a stylesheet, embed its URL assets, and escape closing-style sequences for HTML.
     * @param {URL} url Stylesheet location.
     * @returns {Promise<string>} Cached minified CSS.
     * @throws {Error} Rejects missing imports, required assets, and invalid CSS builds.
     */
    async function stylesheet(url) {
      if (cssCache.has(url.href)) return cssCache.get(url.href);
      const result = build({
        entryPoints: [url.href],
        bundle: true,
        write: false,
        minify: true,
        legalComments: "inline",
        logLevel: "silent",
        plugins: [
          {
            name: "release-css-dependencies",
            /**
             * @param {Object} builder esbuild plugin API.
             * @returns {void} Register source and CSS asset loaders.
             */
            setup(builder) {
              builder.onResolve({ filter: /.*/ }, (args) => {
                if (args.path.startsWith("data:") || args.path.startsWith("#")) return { path: args.path, external: true };
                return { path: new URL(args.path, args.importer || url).href, namespace: "release-asset" };
              });
              builder.onLoad({ filter: /.*/, namespace: "release-asset" }, async (args) => {
                const location = new URL(args.path);
                let bytes = await dependencies.read(location);
                if (location.pathname.endsWith(".css")) bytes = (await dependencies.minified(location, bytes, manifest.changelog.commit)) || bytes;
                return { contents: bytes, loader: location.pathname.endsWith(".css") ? "css" : "dataurl" };
              });
            }
          }
        ]
      }).then((output) => output.outputFiles[0].text.replace(/<\/style/gi, "\\3c /style"));
      cssCache.set(url.href, result);
      return result;
    }

    /**
     * Prepare one classic script with CDN-first minification and the selected artwork base/fetch transform.
     * @param {URL} url JavaScript source location.
     * @param {string} artworkMode remote, packaged, or embedded artwork resolution.
     * @returns {Promise<string>} Cached minified JavaScript safe to place inside an HTML script element.
     * @throws {Error} Rejects missing dependencies and authored artwork expressions that no longer match.
     */
    async function javascript(url, artworkMode) {
      const key = `${url.href}:${artworkMode}`;
      if (jsCache.has(key)) return jsCache.get(key);
      const result = (async () => {
        const bytes = await dependencies.read(url);
        // The embedded-artwork experiment rewrites an authored fetch expression before minification.
        let preferred = artworkMode === "embedded" ? null : await dependencies.minified(url, bytes, manifest.changelog.commit);
        let source = (preferred || bytes).toString();
        const relative = url.protocol === "file:" ? path.relative(root, fileURLToPath(url)).split(path.sep).join("/") : "";
        const dynamic = config.dynamicDependencies[relative];
        if (dynamic) {
          if (!source.includes(dynamic.baseExpression)) {
            source = bytes.toString();
            preferred = null;
          }
          assert.ok(source.includes(dynamic.baseExpression), `Asset base changed in ${relative}; review the build transform`);
          const base = artworkMode === "packaged" ? "document.baseURI" : JSON.stringify(`${cdn}${relative}`);
          source = source.replace(dynamic.baseExpression, base);
          if (artworkMode === "embedded") {
            const request = "await fetch(new URL(`./controllers/${id}.svg`, controllerResourceURL))";
            assert.equal(source.split(request).length, 2, "Controller artwork request changed; review the embedded experiment");
            source = `const controllerEmbeddedArtwork = JSON.parse(document.getElementById("controller-artwork").textContent);\n${source.replace(request, "new Response(controllerEmbeddedArtwork[id])")}`;
          }
        }
        if (preferred || /\.min\.js$/.test(url.pathname)) {
          return source.replace(/\r?\n\/\/[#@]\s*sourceMappingURL=[^\r\n]*\s*$/, "").replace(/<\/script/gi, "<\\/script");
        }
        // Transform each fallback classic script independently: global names and execution boundaries survive.
        const output = await transform(source, { loader: "js", minify: true, target: "es2022", legalComments: "inline", sourcefile: relative || url.href });
        return output.code.replace(/<\/script/gi, "<\\/script");
      })();
      jsCache.set(key, result);
      return result;
    }

    /**
     * Read original artwork for resources registered in config.dynamicDependencies.
     * @param {Object} resource Resource identity from resources().
     * @returns {Promise<Array<{file: string, body: Buffer}>>} Original SVG files, or an empty list for other resources.
     */
    async function artwork(resource) {
      const registration = config.dynamicDependencies[`${resource.id}/${resource.id}.js`];
      if (!registration) return [];
      const files = (await fs.readdir(path.join(root, registration.directory))).filter((file) => file.endsWith(registration.extension)).sort();
      assert.ok(files.length, `No artwork for ${resource.id}`);
      return Promise.all(files.map(async (file) => ({ file, body: await dependencies.read(localURL(`${registration.directory}/${file}`)) })));
    }

    /**
     * Generate portable HTML while retaining source markup, script ordering, and lazy editor ownership.
     * @param {Object} resource Authored resource entry and source bytes.
     * @param {string} format online, bundle, or standalone output.
     * @param {string} [artworkMode="remote"] remote, packaged, or embedded artwork resolution.
     * @param {Array<{file: string, body: Buffer}>} [images=[]] Original SVG files for embedded artwork.
     * @returns {Promise<Buffer>} Formatted HTML with the configured favicon and preserved minified payloads.
     */
    async function generate(resource, format, artworkMode = "remote", images = []) {
      const tree = expandAssets(parse(resource.source.toString()), resource.entry, format !== "standalone");
      const all = nodes(tree);
      const entryURL = localURL(resource.entry);
      const body = all.find((node) => node.tagName === "body");
      const editor = all.find((node) => attr(node, "id") === "configurator-assets");
      const editorNodes = new Set(editor ? nodes(editor) : []);
      if (format !== "online") {
        const head = all.find((node) => node.tagName === "head");
        head.childNodes.push({ nodeName: "#comment", data: `\n${projectLicense}\nThird-party notices remain in their embedded assets.\n`, parentNode: head });
      }
      if (format === "standalone") {
        for (const node of all.filter((node) => ["configurator-assets", "configurator"].includes(attr(node, "id")))) remove(node);
      }
      if (artworkMode === "embedded") {
        const script = nodes(parse('<script type="application/json" id="controller-artwork"></script>')).find((node) => node.tagName === "script");
        textContent(script, `\n${JSON.stringify(Object.fromEntries(images.map((image) => [path.basename(image.file, ".svg"), image.body.toString()]))).replaceAll("<", "\\u003c")}\n`);
        script.parentNode = body;
        body.childNodes.unshift(script);
      }
      for (const node of nodes(tree)) {
        if (node.tagName === "script" && attr(node, "src") !== undefined) {
          const url = new URL(attr(node, "src"), entryURL);
          assert.ok(!attr(node, "type") || attr(node, "type") === "text/javascript", `Unsupported module/script type in ${resource.entry}; register its import graph before bundling`);
          if (url.pathname.endsWith("/configurator.js")) {
            setAttr(node, "data-root", hosted);
            setAttr(node, "data-preference-resource", resource.id);
          }
          if (format === "online") setAttr(node, "src", publicURL(url));
          else {
            setAttr(node, "data-source", attr(node, "src"));
            for (const name of ["src", "defer", "integrity", "crossorigin"]) setAttr(node, name, null);
            textContent(node, `\n${(await javascript(url, artworkMode)).trimEnd()}\n`);
            // Inline classic scripts run immediately. Put runtime imports after the page markup,
            // retaining dependency order and the editor template's lazy execution boundary.
            if (!editorNodes.has(node)) {
              remove(node);
              node.parentNode = body;
              body.childNodes.push(node);
            }
          }
        } else if (node.tagName === "script" && format !== "online" && (!attr(node, "type") || attr(node, "type") === "text/javascript")) {
          const source = node.childNodes.map((child) => child.value || "").join("");
          const output = await transform(source, { loader: "js", minify: true, target: "es2022", legalComments: "inline" });
          setAttr(node, "data-source", resource.entry);
          textContent(node, `\n${output.code.replace(/<\/script/gi, "<\\/script").trimEnd()}\n`);
        } else if (node.tagName === "link" && attr(node, "rel") === "icon") {
          setAttr(node, "href", config.favicon);
          setAttr(node, "type", "image/png");
          setAttr(node, "sizes", "32x32");
        } else if (node.tagName === "link" && attr(node, "rel") === "stylesheet") {
          const url = new URL(attr(node, "href"), entryURL);
          if (format === "online" || config.externalStyles.includes(url.href)) setAttr(node, "href", publicURL(url));
          else {
            const css = await stylesheet(url);
            setAttr(node, "data-source", attr(node, "href"));
            node.nodeName = node.tagName = "style";
            for (const key of ["href", "rel", "integrity", "crossorigin"]) setAttr(node, key, null);
            textContent(node, `\n${css.trimEnd()}\n`);
          }
        } else if (node.attrs) {
          for (const key of ["src", "poster", "href"]) {
            const value = attr(node, key);
            if (!value || /^(?:[a-z]+:|#|\/\/)/i.test(value)) continue;
            const url = new URL(value, entryURL);
            // Metadata is not an application dependency. Required static images are embedded in bundles.
            if (format === "online" || node.tagName === "a") setAttr(node, key, publicURL(url));
            else if (["img", "source", "video", "image"].includes(node.tagName)) {
              const bytes = await dependencies.read(url);
              const mime = { ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".webp": "image/webp" }[path.extname(url.pathname)];
              assert.ok(mime, `Unsupported embedded asset: ${url}`);
              setAttr(node, key, `data:${mime};base64,${bytes.toString("base64")}`);
            }
          }
        }
      }
      // Keep separate script elements so each dependency retains its own classic-script directives.
      return Buffer.from(await formatHTML(tree));
    }

    const manifest = {
      generator: "stream.html release builder",
      repository: config.repository,
      tag,
      changelog: releaseChangelog(tag),
      resources: [],
      assets: [],
      optionalContent: config.optionalContent,
      externalStyles: config.externalStyles
    };
    /**
     * Write a staged release asset and register its size and checksum for testing and publication.
     * @param {string} file Generated asset basename.
     * @param {Buffer} body Artifact bytes.
     * @param {string|null} resource Resource ID, or null for shared release documentation.
     * @param {string} format Distribution format stored in the manifest.
     * @returns {Promise<void>}
     */
    async function save(file, body, resource, format) {
      await fs.writeFile(path.join(assetDir, file), body);
      manifest.assets.push({ file, resource, format, bytes: body.length, sha256: sha256(body) });
    }

    for (const resource of await resources()) {
      try {
        const imports = nodes(expandAssets(parse(resource.source.toString()), resource.entry)).filter((node) => (node.tagName === "script" && attr(node, "src")) || (node.tagName === "link" && attr(node, "rel") === "stylesheet"));
        manifest.resources.push({
          id: resource.id,
          name: resource.name,
          entry: resource.entry,
          imports: imports.map((node) => attr(node, "src") || attr(node, "href")),
          dynamicDependencies: config.dynamicDependencies[`${resource.id}/${resource.id}.js`] || null
        });
        const images = await artwork(resource);
        await save(`${resource.id}.html`, resource.source, resource.id, "original");
        for (const format of ["online", "bundle", "standalone"]) await save(`${resource.id}.${format}.html`, await generate(resource, format), resource.id, format);
        if (images.length) {
          for (const format of ["bundle", "standalone"]) {
            const entries = { [`${resource.id}/index.html`]: await generate(resource, format, "packaged") };
            const artworkDirectory = path.basename(config.dynamicDependencies[`${resource.id}/${resource.id}.js`].directory);
            for (const image of images) entries[`${resource.id}/${artworkDirectory}/${image.file}`] = image.body;
            const archive = zipSync(Object.fromEntries(Object.entries(entries).map(([name, body]) => [name, [new Uint8Array(body), { mtime: new Date(1980, 0, 1) }]])), { level: 9 });
            await save(`${config.repository.split("/")[1]}.${tag}.${resource.id}.${format === "bundle" ? "full" : format}.zip`, Buffer.from(archive), resource.id, `${format === "bundle" ? "full" : format}-zip`);
          }
          if (resource.id === "controller") {
            const candidate = await generate(resource, "standalone", "embedded", images);
            await save(`${resource.id}.standalone.embedded.html`, candidate, resource.id, "embedded");
            await fs.mkdir(path.join(dist, "experimental"), { recursive: true });
            await fs.writeFile(
              path.join(dist, "experimental", "sizes.json"),
              `${JSON.stringify({ htmlBytes: candidate.length, artworkBytes: images.reduce((sum, image) => sum + image.body.length, 0), artworkCount: images.length }, null, 2)}\n`
            );
          }
        }
        console.log(`Built ${resource.id}`);
      } catch (error) {
        throw new Error(`Unable to build ${resource.id}: ${error.message}`, { cause: error });
      }
    }
    manifest.dependencies = [...dependencies.used.values()].sort((a, b) => a.source.localeCompare(b.source, "en"));
    await dependencies.saveLock();
    await save("RELEASE_NOTES.md", Buffer.from(releaseNotes(manifest)), null, "documentation");
    await fs.writeFile(path.join(assetDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
    const checksums = [...manifest.assets, { file: "manifest.json", sha256: sha256(await fs.readFile(path.join(assetDir, "manifest.json"))) }].sort((a, b) => a.file.localeCompare(b.file, "en"));
    await fs.writeFile(path.join(assetDir, "SHA256SUMS"), `${checksums.map((asset) => `${asset.sha256}  ${asset.file}`).join("\n")}\n`);
    for (const file of previousFiles) await fs.unlink(path.join(finalAssets, file));
    try {
      await fs.rmdir(finalAssets);
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
    await fs.rename(assetDir, finalAssets);
    await fs.copyFile(path.join(finalAssets, "manifest.json"), path.join(dist, "manifest.json"));
    // The embedded HTML now has one release-owned location beside the other distributions.
    await fs.rm(path.join(dist, "experimental", "controller.standalone.embedded.html"), { force: true });
    console.log(`Generated ${manifest.assets.length - 1} distributions for ${manifest.resources.length} resources in dist/assets`);
  } finally {
    assert.equal(path.dirname(assetDir), dist);
    await fs.rm(assetDir, { recursive: true, force: true });
  }
}

/**
 * Validate the Actions repository, exact tagged commit, main ancestry, and existing release state.
 * Uses the GITHUB_* environment and GH_TOKEN supplied by the tag-validation job.
 * @returns {Promise<void>}
 * @throws {Error} Rejects invalid tags, mismatched commits, GitHub failures, and conflicting releases.
 */
async function checkRelease() {
  assert.equal(process.env.GITHUB_REPOSITORY, config.repository, "Release workflow must run in the owning repository");
  assert.equal(process.env.GITHUB_REF_TYPE, "tag", "Only pushed tags can publish");
  const tag = validateTag(process.env.GITHUB_REF_NAME || "");
  /**
   * @param {...string} args Git arguments.
   * @returns {string} Trimmed UTF-8 command output.
   */
  const git = (...args) => execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
  const commit = git("rev-parse", `${tag}^{commit}`);
  assert.equal(git("rev-parse", "HEAD"), commit, "Checkout must match the exact tagged commit");
  execFileSync("git", ["merge-base", "--is-ancestor", commit, `refs/remotes/origin/${config.branch}`], { cwd: root });
  const response = await fetch(`https://api.github.com/repos/${config.repository}/releases/tags/${encodeURIComponent(tag)}`, {
    headers: { Authorization: `Bearer ${process.env.GH_TOKEN}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" },
    signal: AbortSignal.timeout(30000)
  });
  if (response.status !== 404) {
    assert.ok(response.ok, `Unable to verify existing release: HTTP ${response.status}`);
    const release = await response.json();
    assert.ok(release.draft, `Release ${tag} is already published; it will not be overwritten`);
    assert.ok(release.body?.includes(`<!-- stream.html release builder ${tag} ${commit} `), "Existing draft belongs to another publication; leave it untouched");
  }
  console.log(`Validated ${tag} at ${commit} on ${config.branch}`);
}

/**
 * Upload the tested inventory into a matching draft, verify remote asset digests, and publish it.
 * Only the tag-publishing job supplies live GitHub access. Tests inject a mock HTTP implementation.
 * @param {Object} [options={}] Publication context.
 * @param {Function} [options.request=fetch] HTTP implementation.
 * @param {Object} [options.environment=process.env] GITHUB_* release identity and GH_TOKEN.
 * @param {string} [options.directory] Tested dist/assets directory.
 * @returns {Promise<void>} Creates or resumes a draft and publishes after complete verification.
 * @throws {Error} Rejects modified artifacts, conflicting release state, failed uploads, and digest mismatches.
 */
export async function publishRelease({ request = fetch, environment = process.env, directory = path.join(dist, "assets") } = {}) {
  assert.equal(environment.GITHUB_REPOSITORY, config.repository);
  assert.equal(environment.GITHUB_REF_TYPE, "tag");
  const tag = validateTag(environment.GITHUB_REF_NAME || "");
  assert.match(environment.GITHUB_SHA || "", /^[0-9a-f]{40}$/);
  assert.ok(environment.GH_TOKEN, "A GitHub token is required");
  const rawManifest = await fs.readFile(path.join(directory, "manifest.json"));
  const manifest = JSON.parse(rawManifest);
  assert.equal(manifest.repository, config.repository);
  assert.equal(manifest.tag, tag);
  const files = [...manifest.assets.map((asset) => asset.file), "manifest.json", "SHA256SUMS"].sort();
  assert.deepEqual((await fs.readdir(directory)).sort(), files, "Refusing to upload unexpected files");
  const bodies = new Map();
  for (const file of files) {
    assert.equal(path.basename(file), file);
    const body = await fs.readFile(path.join(directory, file));
    const asset = manifest.assets.find((item) => item.file === file);
    if (asset) assert.equal(sha256(body), asset.sha256, `Changed tested artifact: ${file}`);
    bodies.set(file, body);
  }
  for (const line of bodies.get("SHA256SUMS").toString().trim().split("\n")) {
    const [hash, file] = line.split("  ");
    assert.ok(bodies.has(file), `Unknown checksum file: ${file}`);
    assert.equal(sha256(bodies.get(file)), hash, `Checksum mismatch: ${file}`);
  }
  const marker = `<!-- stream.html release builder ${tag} ${environment.GITHUB_SHA} ${sha256(rawManifest)} -->`;
  const body = `${bodies.get("RELEASE_NOTES.md").toString()}\n${marker}\n`;
  const base = `https://api.github.com/repos/${config.repository}`;
  const headers = { Authorization: `Bearer ${environment.GH_TOKEN}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" };
  /**
   * Send an authenticated GitHub JSON request for this publication.
   * @param {string} url API endpoint.
   * @param {string} [method="GET"] HTTP method.
   * @param {Object} [data] JSON request body.
   * @returns {Promise<Object|Array|null>} Parsed response, or null for HTTP 204.
   * @throws {Error} Rejects HTTP failures and invalid JSON responses.
   */
  async function api(url, method = "GET", data) {
    const response = await request(url, { method, headers: { ...headers, "content-type": "application/json" }, body: data === undefined ? undefined : JSON.stringify(data), signal: AbortSignal.timeout(30000) });
    if (!response.ok) throw new Error(`${method} ${url}: HTTP ${response.status} ${(await response.text()).slice(0, 500)}`);
    return response.status === 204 ? null : response.json();
  }
  const lookup = await request(`${base}/releases/tags/${encodeURIComponent(tag)}`, { headers, signal: AbortSignal.timeout(30000) });
  let release;
  if (lookup.status === 404) {
    release = await api(`${base}/releases`, "POST", { tag_name: tag, target_commitish: environment.GITHUB_SHA, name: tag, body, draft: true, prerelease: tag.split("+")[0].includes("-") });
  } else {
    assert.ok(lookup.ok, `Release lookup failed: HTTP ${lookup.status}`);
    release = await lookup.json();
    assert.ok(release.draft, "An already published release will never be overwritten");
    assert.ok(release.body?.includes(marker), "Existing draft has different provenance or artifacts; leave it untouched");
  }
  assert.ok(release.draft, "Assets may only be uploaded to a draft");
  /** @returns {Promise<Array<Object>>} Every draft asset across GitHub's paginated inventory. */
  async function listAssets() {
    const result = [];
    for (let page = 1; ; page++) {
      const chunk = await api(`${base}/releases/${release.id}/assets?per_page=100&page=${page}`);
      result.push(...chunk);
      if (chunk.length < 100) return result;
    }
  }
  let uploaded = await listAssets();
  assert.ok(
    uploaded.every((asset) => files.includes(asset.name)),
    "Existing draft contains unrelated assets"
  );
  for (const file of files) {
    const bytes = bodies.get(file);
    let existing = uploaded.find((asset) => asset.name === file);
    // GitHub can leave an empty starter placeholder after an interrupted upload.
    // Only remove that placeholder from an identical automation-owned draft.
    if (existing?.state === "starter" && existing.size === 0) {
      await api(`${base}/releases/assets/${existing.id}`, "DELETE");
      existing = undefined;
    }
    if (existing) {
      assert.equal(existing.size, bytes.length, `Conflicting draft asset: ${file}`);
      assert.equal(existing.digest, `sha256:${sha256(bytes)}`, `Conflicting draft asset: ${file}`);
      continue;
    }
    const response = await request(`https://uploads.github.com/repos/${config.repository}/releases/${release.id}/assets?name=${encodeURIComponent(file)}`, {
      method: "POST",
      headers: { ...headers, "content-type": "application/octet-stream" },
      body: bytes,
      signal: AbortSignal.timeout(120000)
    });
    assert.ok(response.ok, `Upload ${file}: HTTP ${response.status}; the release remains a draft and can be rerun`);
  }
  uploaded = await listAssets();
  assert.deepEqual(uploaded.map((asset) => asset.name).sort(), files, "Incomplete draft; publication stopped");
  for (const asset of uploaded) {
    assert.equal(asset.size, bodies.get(asset.name).length);
    assert.equal(asset.digest, `sha256:${sha256(bodies.get(asset.name))}`, `Uploaded integrity mismatch: ${asset.name}`);
  }
  await api(`${base}/releases/${release.id}`, "PATCH", { name: tag, draft: false });
  console.log(`Published ${config.repository} ${tag} with ${files.length} verified assets`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  // Accept --embedded-controller from earlier commands; every build includes the embedded artifact.
  const { values } = parseArgs({ options: { tag: { type: "string" }, "update-dependencies": { type: "boolean" }, "embedded-controller": { type: "boolean" }, check: { type: "boolean" }, publish: { type: "boolean" } } });
  assert.ok(!(values.check && values.publish), "Choose either --check or --publish");
  if (values.check) await checkRelease();
  else if (values.publish) await publishRelease();
  else await buildRelease(validateTag(values.tag || process.env.RELEASE_TAG || ""), values);
}
