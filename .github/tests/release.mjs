import { unzipSync } from "fflate";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import * as fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";
import { Script } from "node:vm";
import { parse as parseYAML } from "yaml";
import { SPA_HOST, assertPinned, attr, config, dependencyReader, dist, downloadURL, expandAssets, formatHTML, localURL, nodes, parse, releaseChangelog, releaseNotes, resources, root, sha256, validateTag } from "../scripts/build.mjs";

const assetDir = path.join(dist, "assets");
const manifest = JSON.parse(await fs.readFile(path.join(assetDir, "manifest.json"), "utf8"));

/**
 * Create an isolated Git history outside the repository and remove it after the test.
 * @param {import("node:test").TestContext} t Test owning the temporary checkout.
 * @returns {Promise<Object>} Checkout directory and Git command helper.
 */
async function gitFixture(t) {
  const temporaryRoot = path.resolve(os.tmpdir());
  const directory = await fs.mkdtemp(path.join(temporaryRoot, "stream-release-history-"));
  t.after(async () => {
    assert.equal(path.dirname(directory), temporaryRoot);
    await fs.rm(directory, { recursive: true, force: true });
  });
  const git = (...args) => execFileSync("git", ["-c", "user.name=Release tests", "-c", "user.email=release-tests@example.invalid", ...args], { cwd: directory, encoding: "utf8" }).trim();
  git("init", "--quiet", "--initial-branch=main");
  return { directory, git };
}

test("changelogs cover first releases, legacy tags, tagged releases, and local previews", async (t) => {
  const { directory, git } = await gitFixture(t);
  git("commit", "--quiet", "--allow-empty", "-m", "Initial commit");
  const first = releaseChangelog("v1.0.0", directory);
  assert.equal(first.previousTag, null);
  assert.deepEqual(
    first.commits.map((commit) => commit.subject),
    ["Initial commit"]
  );
  git("tag", "v9");
  git("commit", "--quiet", "--allow-empty", "-m", "[Fix] Preserve [labels] & <markup> and `code`");
  git("tag", "v9.1");
  const tagged = releaseChangelog("v9.1", directory);
  assert.equal(tagged.previousTag, "v9");
  assert.equal(tagged.ref, "v9.1");
  assert.equal(tagged.commits.length, 1);
  const notes = releaseNotes({ tag: "v9.1", changelog: tagged, resources: [], assets: [] });
  assert.ok(notes.includes(`/compare/v9...v9.1)`));
  const subject = "\\[Fix\\] Preserve \\[labels\\] \\& \\<markup\\> and \\`code\\`";
  assert.ok(notes.includes(`- ([${tagged.commit.slice(0, 7)}](https://github.com/${config.repository}/commit/${tagged.commit})) ${subject}`));
  git("commit", "--quiet", "--allow-empty", "-m", "Preview changes");
  const preview = releaseChangelog("v0.0.0-local", directory);
  assert.equal(preview.previousTag, "v9.1");
  assert.equal(preview.ref, git("rev-parse", "HEAD"));
  assert.deepEqual(
    preview.commits.map((commit) => commit.subject),
    ["Preview changes"]
  );
  git("tag", "v10.0.0");
  assert.equal(releaseChangelog("v10.0.0", directory).previousTag, "v9.1");
});

test("CDN minification uses matching committed source, caches bytes, and falls back locally", async (t) => {
  const { directory, git } = await gitFixture(t);
  const source = Buffer.from("window.answer = 42;\n");
  const css = Buffer.from("body { color: red; }\n");
  await fs.writeFile(path.join(directory, "asset.js"), source);
  await fs.writeFile(path.join(directory, "missing.css"), css);
  await fs.writeFile(path.join(directory, "available.css"), css);
  git("add", ".");
  git("commit", "--quiet", "-m", path.basename(directory));
  const commit = git("rev-parse", "HEAD");
  const url = pathToFileURL(path.join(directory, "asset.js"));
  const remote = `https://cdn.jsdelivr.net/gh/${config.repository}@${commit}/asset.min.js`;
  const cacheFile = path.join(os.tmpdir(), "stream-html-release-cache", `${sha256(remote)}.min.json`);
  t.after(() => fs.rm(cacheFile, { force: true }));
  const minified = Buffer.from("window.answer=42;");
  let requests = 0;
  const request = async (requested) => {
    requests++;
    assert.equal(requested, remote);
    return new Response(minified, { headers: { "content-type": "application/javascript" } });
  };
  const reader = await dependencyReader();
  assert.deepEqual(await reader.minified(url, source, commit, { directory, request }), minified);
  assert.deepEqual(await reader.minified(url, source, commit, { directory, request }), minified);
  assert.equal(requests, 1);
  assert.equal(reader.used.get(remote).sha256, sha256(minified));
  assert.equal(await reader.minified(url, Buffer.from("window.answer=99;"), commit, { directory, request }), null);
  assert.equal(requests, 1);
  const missing = pathToFileURL(path.join(directory, "missing.css"));
  assert.equal(await reader.minified(missing, css, commit, { directory, request: async () => new Response("", { status: 404 }) }), null);
  const offline = await dependencyReader();
  const unavailable = async () => {
    throw new Error("Offline");
  };
  assert.equal(await offline.minified(missing, css, commit, { directory, request: unavailable }), null);
  assert.deepEqual(await offline.minified(url, source, commit, { directory, request: unavailable }), minified);
  const available = pathToFileURL(path.join(directory, "available.css"));
  const availableRemote = `https://cdn.jsdelivr.net/gh/${config.repository}@${commit}/available.min.css`;
  t.after(() => fs.rm(path.join(os.tmpdir(), "stream-html-release-cache", `${sha256(availableRemote)}.min.json`), { force: true }));
  assert.deepEqual(await offline.minified(available, css, commit, { directory, request: async () => new Response(css) }), css);
  await fs.writeFile(cacheFile, '{"sha256":');
  const retry = await dependencyReader();
  assert.deepEqual(await retry.minified(url, source, commit, { directory, request }), minified);
  assert.equal(requests, 2);
});

test("pinned SPA dependencies can fall back to matching local minified files", async (t) => {
  const url = new URL(`${SPA_HOST}/_functions.min.js`);
  const existing = await dependencyReader();
  const expected = await existing.read(url);
  const { directory } = await gitFixture(t);
  await fs.writeFile(path.join(directory, "_functions.min.js"), expected);
  const previousRoot = process.env.SPA_ASSETS_ROOT;
  process.env.SPA_ASSETS_ROOT = directory;
  t.after(() => {
    if (previousRoot === undefined) delete process.env.SPA_ASSETS_ROOT;
    else process.env.SPA_ASSETS_ROOT = previousRoot;
  });
  t.mock.method(os, "tmpdir", () => path.join(directory, "cache"));
  t.mock.method(globalThis, "fetch", async () => {
    throw new Error("Offline dependency request");
  });
  const reader = await dependencyReader();
  assert.deepEqual(await reader.read(url), expected);
  await fs.unlink(path.join(os.tmpdir(), "stream-html-release-cache", sha256(url.href)));
  await fs.writeFile(path.join(directory, "_functions.min.js"), "Wrong pinned version");
  const mismatched = await dependencyReader();
  await assert.rejects(mismatched.read(url), /Offline dependency request/);
});

test("release tags follow SemVer and reject malformed or unsafe input", () => {
  for (const tag of ["v0.0.0", "v1.2.3", "v1.2.3-alpha.1", "v2.0.0-rc.1+build.4"]) assert.equal(validateTag(tag), tag);
  for (const tag of ["", "1.2.3", "v01.2.3", "v1.02.3", "v1.2", "v1.2.3-01", "v1.2.3-", "v1.2.3/../../", "v1.2.3\n", "v1.2.3;exit"]) assert.throws(() => validateTag(tag));
});

test("HTML formatting preserves embedded minified source and multiline string whitespace", async () => {
  const javascript = "const label=`first\n  second`;window.label=label;";
  const css = '.label:before{content:"first  second"}';
  const html = await formatHTML(
    parse(`<!doctype html><html><head><style data-source="label.css">\n${css}\n</style><style data-source="other.css">\na{display:block}\n</style></head><body><script data-source="label.js">\n${javascript}\n</script></body></html>`)
  );
  const all = nodes(parse(html));
  assert.equal(all.find((node) => node.tagName === "script").childNodes[0].value.trim(), javascript);
  assert.equal(all.find((node) => node.tagName === "style").childNodes[0].value.trim(), css);
  assert.ok(html.includes('\n  <head>\n    <style data-source="label.css">\n'));
  assert.ok(html.includes('\n    </style>\n    <style data-source="other.css">\n'));
  assert.equal(await formatHTML(parse(html)), html);
});

test("release expansion honors external sources and preserves explicit local editor tags", async () => {
  const html = (await fs.readFile(path.join(root, "controller/index.html"), "utf8")).replaceAll('data-source="https://cdn.jsdelivr.net/gh/byuwur/spa.js"', 'data-source="https://assets.test/spa.js"');
  const host = SPA_HOST.replace("https://cdn.jsdelivr.net/gh/byuwur/spa.js", "https://assets.test/spa.js");
  const all = nodes(expandAssets(parse(html), "controller/index.html"));
  const sources = all.map((node) => attr(node, "src") || attr(node, "href")).filter(Boolean);
  assert.ok(sources.includes(`${host}/_load.min.js`));
  assert.ok(sources.includes(`${host}/js/jquery.min.js`));
  assert.ok(sources.includes("../configurator.css"));
  assert.ok(sources.includes("../configurator.js"));
  assert.ok(sources.includes("./mapping.js"));
  assert.ok(sources.indexOf("../configurator.css") > sources.indexOf(`${host}/_transitions.min.js`), "Local overrides follow the external import group");
  assert.ok(!all.some((node) => node.tagName === "script" && attr(node, "type") === "application/json"));
});

test("release CLI dispatches build, validation, and publishing without accepting invalid inputs", () => {
  for (const [args, message] of [
    [["--tag", "invalid"], "Invalid release tag"],
    [["--check"], "Release workflow must run in the owning repository"],
    [["--publish"], config.repository],
    [["--check", "--publish"], "Choose either --check or --publish"]
  ]) {
    const result = spawnSync(process.execPath, [path.join(root, ".github/scripts/build.mjs"), ...args], {
      cwd: root,
      env: { ...process.env, GITHUB_REPOSITORY: "", GH_TOKEN: "" },
      encoding: "utf8",
      timeout: 10000
    });
    assert.ifError(result.error);
    assert.equal(result.status, 1);
    assert.ok(result.stderr.includes(message), result.stderr);
  }
});

test("dependency resolution rejects floating URLs, outside files, missing files, and unregistered downloads", async () => {
  assert.doesNotThrow(() => assertPinned(new URL(`${SPA_HOST}/_functions.min.js`)));
  for (const url of ["http://cdn.jsdelivr.net/gh/a/b@v1.0.0/a.js", "https://cdn.jsdelivr.net/gh/a/b@latest/a.js", "https://cdn.jsdelivr.net/gh/a/b@next/a.js", "https://example.com/a.js"]) assert.throws(() => assertPinned(new URL(url)));
  const reader = await dependencyReader();
  await assert.rejects(reader.read(new URL("../../README.md", localURL("resource.js"))));
  await assert.rejects(reader.read(localURL(".git/config")), /Invalid source dependency/);
  await assert.rejects(reader.read(localURL("not-a-release-source.js")), /ENOENT/);
  await assert.rejects(reader.read(new URL(`${SPA_HOST}/not-in-the-lock.js`)), /Unregistered dependency/);
  await assert.rejects(reader.read(new URL(config.externalStyles[0])), /Font Awesome/);
});

test("every resource and only the intended release files appear in the inventory", async () => {
  assert.equal(manifest.repository, config.repository);
  validateTag(manifest.tag);
  const source = await resources();
  assert.deepEqual(
    manifest.resources.map((item) => item.id),
    source.map((item) => item.id)
  );
  assert.equal(new Set(manifest.assets.map((item) => item.file)).size, manifest.assets.length);
  assert.deepEqual((await fs.readdir(assetDir)).sort(), [...manifest.assets.map((item) => item.file), "manifest.json", "SHA256SUMS"].sort());
  const sums = (await fs.readFile(path.join(assetDir, "SHA256SUMS"), "utf8")).trim().split("\n");
  assert.equal(sums.length, manifest.assets.length + 1);
  for (const line of sums) {
    const [hash, file] = line.split("  ");
    assert.equal(sha256(await fs.readFile(path.join(assetDir, file))), hash, file);
  }
  for (const asset of manifest.assets) {
    assert.equal(path.basename(asset.file), asset.file);
    const bytes = await fs.readFile(path.join(assetDir, asset.file));
    assert.equal(bytes.length, asset.bytes, asset.file);
    assert.equal(sha256(bytes), asset.sha256, asset.file);
  }
  for (const resource of source) {
    const formats = manifest.assets
      .filter((item) => item.resource === resource.id)
      .map((item) => item.format)
      .sort();
    const expected = ["original", "online", "bundle", "standalone"];
    if (config.dynamicDependencies[`${resource.id}/${resource.id}.js`]) expected.push("full-zip", "standalone-zip");
    if (resource.id === "controller") expected.push("embedded");
    assert.deepEqual(formats, expected.sort(), resource.id);
    assert.deepEqual(await fs.readFile(path.join(assetDir, `${resource.id}.html`)), resource.source, "Original HTML must be byte-identical");
  }
  assert.ok(manifest.dependencies.length);
  assert.ok(!manifest.dependencies.some((item) => /fontawesome|\/fa-[^/]*\.(?:woff2|svg)/i.test(item.source)), "Font Awesome was downloaded");
});

function validateHTML(html, format, id) {
  const standalone = ["standalone", "embedded"].includes(format);
  const errors = [];
  const all = nodes(parse(html, { onParseError: (error) => errors.push(error.code) }));
  assert.deepEqual(errors, [], `${id}: HTML parse errors`);
  const favicon = all.find((node) => node.tagName === "link" && attr(node, "rel") === "icon");
  const faviconURL = attr(favicon, "href");
  assert.match(faviconURL, /^data:image\/png;base64,/, `${id}: favicon must be embedded`);
  const faviconBytes = Buffer.from(faviconURL.split(",")[1], "base64");
  assert.deepEqual([faviconBytes.readUInt32BE(16), faviconBytes.readUInt32BE(20)], [32, 32], `${id}: favicon dimensions`);
  const scripts = all.filter((node) => node.tagName === "script" && (!attr(node, "type") || attr(node, "type") === "text/javascript"));
  const styles = all.filter((node) => node.tagName === "style" || (node.tagName === "link" && attr(node, "rel") === "stylesheet"));
  assert.ok(scripts.length && styles.length, id);
  for (const script of scripts) {
    const src = attr(script, "src");
    if (format === "online" && src !== undefined) {
      assert.match(src, /^https:\/\/cdn\.jsdelivr\.net\/gh\//);
      if (src.includes(`/${config.repository}@`)) assert.ok(src.startsWith(`https://cdn.jsdelivr.net/gh/${config.repository}@${manifest.tag}/`));
    } else if (format !== "online") {
      assert.equal(src, undefined, `${id}: JavaScript must be embedded as inline source`);
      assert.equal(attr(script, "defer"), undefined, `${id}: inline scripts cannot defer`);
      assert.ok(attr(script, "data-source"), `${id}: embedded JavaScript must identify its source`);
      const code = script.childNodes.map((node) => node.value || "").join("");
      assert.match(code, /^\n[\s\S]*\n[\t ]*$/, `${id}: script tags must surround the code on separate lines`);
      assert.doesNotThrow(() => new Script(code), `${id}: invalid embedded JavaScript`);
      assert.ok(!/sourceMappingURL/.test(code), "Unresolved source map");
      if (standalone) assert.ok(!/global\.byConfigurator\s*=|jQuery JavaScript Library|Bootstrap v|Pickr v/.test(code), `${id}: editor dependency included`);
    }
  }
  for (const style of styles.filter((node) => node.tagName === "link")) {
    const href = attr(style, "href");
    if (format !== "online") assert.ok(config.externalStyles.includes(href), `${id}: external CSS ${href}`);
    assert.ok(!href.includes("@latest"));
  }
  for (const style of styles.filter((node) => node.tagName === "style")) {
    const css = style.childNodes.map((node) => node.value || "").join("");
    if (format !== "online") {
      assert.ok(attr(style, "data-source"), `${id}: embedded CSS must identify its source`);
      assert.match(css, /^\n[\s\S]*\n[\t ]*$/, `${id}: style tags must surround the code on separate lines`);
    }
    assert.ok(!/@import\s/i.test(css), `${id}: unresolved CSS import`);
    for (const match of css.matchAll(/url\(([^)]*)\)/gi)) {
      const value = match[1].trim().replace(/^["']|["']$/g, "");
      assert.match(value, /^(?:data:|#)/, `${id}: unresolved CSS asset`);
    }
    assert.ok(!css.includes("Font Awesome"), `${id}: Font Awesome embedded`);
  }
  if (format !== "online") {
    for (const block of all.filter((node) => ["script", "style"].includes(node.tagName) && node.childNodes.length)) {
      const siblings = block.parentNode.childNodes;
      const index = siblings.indexOf(block);
      assert.match(siblings[index - 1]?.value || "", /\n[\t ]*$/, `${id}: opening block tag must start on its own line`);
      assert.match(siblings[index + 1]?.value || "", /^[\t ]*\n/, `${id}: closing block tag must end on its own line`);
    }
  }
  if (standalone) {
    assert.ok(!all.some((node) => ["configurator", "configurator-assets"].includes(attr(node, "id"))));
    assert.ok(!all.some((node) => attr(node, "data-editor-style") !== undefined));
  } else {
    assert.ok(all.some((node) => attr(node, "id") === "configurator"));
    assert.ok(all.some((node) => attr(node, "data-editor-style") !== undefined && attr(node, "media") === "not all"));
  }
}

test("online, bundled, and packaged HTML has a complete dependency graph", async (t) => {
  for (const asset of manifest.assets.filter((item) => ["online", "bundle", "standalone", "embedded"].includes(item.format))) {
    await t.test(asset.file, async () => validateHTML(await fs.readFile(path.join(assetDir, asset.file), "utf8"), asset.format, asset.file));
  }
  for (const asset of manifest.assets.filter((item) => item.file.endsWith(".zip"))) {
    assert.equal(asset.file, `${config.repository.split("/")[1]}.${manifest.tag}.${asset.resource}.${asset.format.replace(/-zip$/, "")}.zip`);
    const entries = unzipSync(await fs.readFile(path.join(assetDir, asset.file)));
    const registration = config.dynamicDependencies[`${asset.resource}/${asset.resource}.js`];
    const artwork = (await fs.readdir(path.join(root, registration.directory))).filter((file) => file.endsWith(registration.extension)).sort();
    const entry = `${asset.resource}/index.html`;
    assert.deepEqual(Object.keys(entries).sort(), [entry, ...artwork.map((file) => `${registration.directory}/${file}`)].sort());
    for (const file of artwork) assert.deepEqual(Buffer.from(entries[`${registration.directory}/${file}`]), await fs.readFile(path.join(root, registration.directory, file)));
    validateHTML(Buffer.from(entries[entry]).toString(), asset.format === "full-zip" ? "bundle" : "standalone", asset.file);
  }
  const embedded = manifest.assets.find((item) => item.format === "embedded");
  const all = nodes(parse(await fs.readFile(path.join(assetDir, embedded.file), "utf8")));
  const artwork = JSON.parse(all.find((node) => attr(node, "id") === "controller-artwork").childNodes[0].value);
  const artworkDirectory = path.join(root, config.dynamicDependencies["controller/controller.js"].directory);
  const files = (await fs.readdir(artworkDirectory)).filter((file) => file.endsWith(".svg")).sort();
  assert.deepEqual(
    Object.keys(artwork).sort(),
    files.map((file) => path.basename(file, ".svg"))
  );
  for (const file of files) assert.equal(artwork[path.basename(file, ".svg")], await fs.readFile(path.join(artworkDirectory, file), "utf8"));
});

test("release descriptions link to the generated inventory", async () => {
  const notes = await fs.readFile(path.join(assetDir, "RELEASE_NOTES.md"), "utf8");
  const links = [...notes.matchAll(/\]\((https:\/\/github\.com\/[^)]+\/releases\/download\/[^)]+)\)/g)].map((match) => match[1]);
  assert.deepEqual(new Set(links), new Set([...manifest.assets.filter((item) => item.resource).map((item) => downloadURL(manifest.tag, item.file)), downloadURL(manifest.tag, "manifest.json"), downloadURL(manifest.tag, "SHA256SUMS")]));
  assert.equal(notes, releaseNotes(manifest));
  assert.ok(notes.includes("## Changes"));
  assert.ok(notes.includes("| Embedded [EXPERIMENTAL] |"));
  assert.ok(notes.includes("## [EXPERIMENTAL] Embedded Controller"));
  for (const commit of manifest.changelog.commits) assert.ok(notes.includes(`https://github.com/${config.repository}/commit/${commit.sha}`));
  assert.match(notes, /file:\/\//);
  assert.match(notes, /Font Awesome/);
  assert.match(notes, /HTTP\(S\)/);
});

test("publication is restricted to tags and gated by successful mandatory checks", async () => {
  const release = parseYAML(await fs.readFile(path.join(root, ".github/workflows/release.yml"), "utf8"));
  const ci = release.jobs.distributions;
  const source = parseYAML(await fs.readFile(path.join(root, ".github/workflows/tests.yml"), "utf8"));
  assert.deepEqual(release.on.push, { branches: [config.branch], tags: ["v*"] });
  assert.ok(release.on.pull_request !== undefined);
  assert.ok(release.on.workflow_dispatch !== undefined);
  assert.equal(release.jobs.validate.if, "github.event_name == 'push' && github.ref_type == 'tag'");
  assert.equal(release.jobs.publish.if, release.jobs.validate.if);
  assert.equal(ci.if, "github.event_name != 'push' || github.ref_type != 'tag'");
  assert.equal(release.permissions.contents, "read");
  assert.equal(release.concurrency["cancel-in-progress"], false);
  assert.equal(release.jobs.publish.permissions.contents, "write");
  assert.deepEqual(release.jobs.publish.needs, ["validate", "source_checks", "build"]);
  assert.ok(release.jobs.build.needs.includes("validate"));
  assert.ok(release.jobs.build.needs.includes("source_checks"));
  assert.equal(release.jobs.source_checks.uses, "./.github/workflows/tests.yml");
  assert.equal(ci.needs, "source_checks");
  assert.equal(release.jobs.distributions.steps[0].with["fetch-depth"], 0);
  assert.equal(release.jobs.build.steps[0].with["fetch-depth"], 0);
  for (const job of [release.jobs.distributions, release.jobs.build]) {
    assert.equal(job.env.SPA_ASSETS_ROOT, "${{ github.workspace }}/spa.js");
    const dependency = job.steps.find((step) => step.with?.repository === "byuwur/spa.js");
    assert.equal(dependency.with.path, "spa.js");
    assert.equal(dependency.with.ref, SPA_HOST.split("@").at(-1));
  }
  const sourceCheck = release.jobs.build.steps.find((step) => step.run === "npm --prefix .github test");
  assert.equal(sourceCheck.env.NODE_PATH, "${{ github.workspace }}/.github/node_modules");
  assert.ok(release.jobs.build.steps.some((step) => step.run === "npm --prefix .github run release:test"));
  assert.ok(!release.jobs.build.steps.some((step) => step["continue-on-error"]));
  assert.deepEqual(source.on.push.branches, [config.branch], "Tag releases run source checks in the release workflow");
  assert.ok(!JSON.stringify(ci).includes("--publish"));
  assert.ok(!JSON.stringify(ci).includes('contents":"write'));
  for (const job of Object.values(release.jobs)) {
    for (const step of job.steps || []) {
      if (step.with?.cache === "npm") {
        assert.equal(step.with["cache-dependency-path"], ".github/package-lock.json");
        await fs.access(path.join(root, step.with["cache-dependency-path"]));
      }
      if (step.run?.startsWith("node ")) await fs.access(path.join(root, step.run.split(" ")[1]));
    }
  }
});
