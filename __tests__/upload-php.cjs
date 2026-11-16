/*
 * File: __tests__/upload-php.cjs
 * Desc: Real PHP multipart requests with deterministic cURL substitutes; never contacts Catbox.
 */
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const net = require("node:net");
const { spawn, execFileSync } = require("node:child_process");
const test = require("node:test");
const root = path.join(__dirname, "..");
const php = process.env.PHP_BINARY || "php";

/** Run PHP without Xdebug logging, preserving the owning installation's extensions. */
function runPHP(code, env = process.env) {
  return execFileSync(php, ["-d", "xdebug.mode=off", "-r", code], { env, encoding: "utf8" });
}

test("PHP upload validates multipart, limits abuse, and safely handles fixed Catbox forwarding", async (t) => {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), "stream-upload-php-"));
  const mode = path.join(temp, "mode.json");
  const capture = path.join(temp, "capture.json");
  const router = path.join(temp, "router.php");
  // Disabled built-ins can be substituted in PHP 8. The production endpoint has no mock URL or bypass.
  await fs.writeFile(router, `<?php
    function curl_init($url) { $GLOBALS['upstream'] = $url; return new stdClass(); }
    function curl_setopt_array($request, $options) { $GLOBALS['options'] = $options; return true; }
    function curl_exec($request) {
      $mode = json_decode(file_get_contents(getenv('STREAM_TEST_MODE')), true);
      $file = $GLOBALS['options'][CURLOPT_POSTFIELDS]['fileToUpload'];
      file_put_contents(getenv('STREAM_TEST_CAPTURE'), json_encode([
        'url' => $GLOBALS['upstream'], 'reqtype' => $GLOBALS['options'][CURLOPT_POSTFIELDS]['reqtype'],
        'mime' => $file->getMimeType(), 'name' => $file->getPostFilename(),
        'hash' => hash_file('sha256', $file->getFilename()),
        'verifyPeer' => $GLOBALS['options'][CURLOPT_SSL_VERIFYPEER], 'verifyHost' => $GLOBALS['options'][CURLOPT_SSL_VERIFYHOST],
        'redirects' => $GLOBALS['options'][CURLOPT_FOLLOWLOCATION], 'protocols' => $GLOBALS['options'][CURLOPT_PROTOCOLS],
        'connectTimeout' => $GLOBALS['options'][CURLOPT_CONNECTTIMEOUT], 'timeout' => $GLOBALS['options'][CURLOPT_TIMEOUT]
      ]));
      if (!isset($mode['body'])) return false;
      $body = $mode['body'];
      return $GLOBALS['options'][CURLOPT_WRITEFUNCTION]($request, $body) === strlen($body);
    }
    function curl_errno($request) { return json_decode(file_get_contents(getenv('STREAM_TEST_MODE')), true)['errno'] ?? 0; }
    function curl_getinfo($request, $option) { return json_decode(file_get_contents(getenv('STREAM_TEST_MODE')), true)['status'] ?? 200; }
    $_SERVER['SCRIPT_FILENAME'] = __FILE__;
    require ${JSON.stringify(path.join(root, "upload_image.php").replaceAll("\\", "/"))};
    $settings = json_decode(file_get_contents(getenv('STREAM_TEST_MODE')), true);
    putenv('STREAM_UPLOAD_PROVIDER=' . ($settings['defaultProvider'] ?? ''));
    upload_image();
  `);
  const socket = net.createServer();
  await new Promise((resolve) => socket.listen(0, "127.0.0.1", resolve));
  const port = socket.address().port;
  await new Promise((resolve) => socket.close(resolve));
  const env = { ...process.env, STREAM_UPLOAD_RATE_DIR: path.join(temp, "rate"), STREAM_TEST_MODE: mode, STREAM_TEST_CAPTURE: capture };
  const server = spawn(php, ["-d", "xdebug.mode=off", "-d", "display_errors=0", "-d", `upload_tmp_dir=${temp}`, "-d", "upload_max_filesize=9M", "-d", "post_max_size=10M", "-d", "memory_limit=256M", "-d", "disable_functions=curl_init,curl_setopt_array,curl_exec,curl_errno,curl_getinfo", "-S", `127.0.0.1:${port}`, "-t", root, router], { env, stdio: ["ignore", "ignore", "pipe"] });
  let logs = "";
  server.stderr.on("data", (data) => { logs += data; });
  const url = `http://127.0.0.1:${port}/upload_image.php`;
  /** Set a deterministic upstream response and clear only this external fixture's limiter. */
  async function reset(value = { body: "https://files.catbox.moe/image.png" }) {
    await fs.writeFile(mode, JSON.stringify(value));
    await fs.rm(capture, { force: true });
    await fs.mkdir(env.STREAM_UPLOAD_RATE_DIR, { recursive: true });
    await fs.writeFile(path.join(env.STREAM_UPLOAD_RATE_DIR, "clients.json"), "{}");
  }
  /** Send real multipart bytes through PHP's upload parser. */
  async function upload(buffer, type = "image/png", name = "image.png", extra = {}, fields = {}) {
    const body = new FormData();
    body.append("fileToUpload", new Blob([buffer], { type }), name);
    for (const [field, value] of Object.entries(fields)) body.append(field, value);
    // Client-controlled destinations and operation types must be ignored.
    body.append("reqtype", "urlupload"); body.append("url", "http://127.0.0.1/private");
    const response = await fetch(url, { method: "POST", body, ...extra });
    const text = await response.text();
    assert.equal(response.headers.get("access-control-allow-origin"), "*");
    assert.doesNotMatch(text, /Warning:|Fatal error:|router\.php|tmp_name|<html>|secret/i);
    return { response, text };
  }
  try {
    await reset();
    for (let attempt = 0; ; attempt++) {
      try { await fetch(url); break; } catch (error) {
        if (attempt >= 40 || server.exitCode !== null) throw new Error(`PHP fixture did not start: ${logs}`, { cause: error });
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
    }
    const images = JSON.parse(runPHP(`$image=imagecreatetruecolor(2,2); $result=[]; foreach(['png','jpeg','webp','gif'] as $type) { ob_start(); ('image'.$type)($image); $result[$type]=base64_encode(ob_get_clean()); } echo json_encode($result);`));
    const png = Buffer.from(images.png, "base64");
    await t.test("methods, preflight, missing uploads, and malformed multipart", async () => {
      const get = await fetch(url);
      assert.equal(get.status, 405); assert.equal(get.headers.get("allow"), "POST, OPTIONS");
      const preflight = await fetch(url, { method: "OPTIONS", headers: { Origin: "null", "Access-Control-Request-Method": "POST" } });
      assert.equal(preflight.status, 204); assert.equal(preflight.headers.get("access-control-allow-origin"), "*");
      assert.equal(preflight.headers.get("access-control-allow-credentials"), null);
      assert.equal((await fetch(url, { method: "POST" })).status, 400);
      assert.equal((await fetch(url, { method: "POST", body: new FormData() })).status, 400);
      assert.equal((await fetch(url, { method: "POST", body: "broken", headers: { "Content-Type": "multipart/form-data; boundary=absent" } })).status, 400);
      const nested = new FormData();
      nested.append("fileToUpload[]", new Blob([png], { type: "image/png" }), "image.png");
      assert.equal((await fetch(url, { method: "POST", body: nested })).status, 400);
    });
    await t.test("four formats and animated GIF forward original bytes under canonical names", async () => {
      const animated = Buffer.from("47494638396101000100800000000000ffffff21ff0b4e45545343415045322e30030100000021f904000a0000002c000000000100010000020244010021f904000a0000002c00000000010001000002024c01003b", "hex");
      for (const [type, buffer] of [...Object.entries(images).map(([type, value]) => [type, Buffer.from(value, "base64")]), ["gif", animated]]) {
        await reset();
        const { response, text } = await upload(buffer, `image/${type}`, "untrusted.php");
        assert.equal(response.status, 200, `${type}: ${text}`);
        assert.equal(text, "https://files.catbox.moe/image.png");
        const forwarded = JSON.parse(await fs.readFile(capture));
        assert.equal(forwarded.hash, require("node:crypto").createHash("sha256").update(buffer).digest("hex"));
        assert.equal(forwarded.url, "https://catbox.moe/user/api.php"); assert.equal(forwarded.reqtype, "fileupload");
        assert.equal(forwarded.mime, `image/${type}`); assert.equal(forwarded.name, `image.${type === "jpeg" ? "jpg" : type}`);
        assert.equal(forwarded.verifyPeer, true); assert.equal(forwarded.verifyHost, 2); assert.equal(forwarded.redirects, false);
        assert.ok(forwarded.connectTimeout > 0 && forwarded.timeout <= 40);
      }
    });
    await t.test("provider IDs use developer endpoints and explicit choices override server defaults", async () => {
      await reset({ defaultProvider: "catbox", body: "https://files.catbox.moe/image.png" });
      assert.equal((await upload(png)).response.status, 200);
      assert.equal(JSON.parse(await fs.readFile(capture)).url, "https://catbox.moe/user/api.php");
      for (const defaultProvider of ["not-configured", "0"]) {
        await reset({ defaultProvider, body: "https://files.catbox.moe/image.png" });
        assert.equal((await upload(png)).response.status, 503, "An unavailable server default fails closed");
        await assert.rejects(fs.access(capture), { code: "ENOENT" });
      }
      const selected = await upload(png, "image/png", "image.png", {}, { provider: "catbox", endpoint: "http://127.0.0.1/private" });
      assert.equal(selected.response.status, 200, selected.text);
      const forwarded = JSON.parse(await fs.readFile(capture));
      assert.equal(forwarded.url, "https://catbox.moe/user/api.php");
      assert.equal(forwarded.reqtype, "fileupload");
      for (const fields of [{ provider: "gofile" }, { provider: "https://catbox.moe/user/api.php" }, { provider: "" }, { "provider[]": "catbox" }]) {
        await reset();
        const rejected = await upload(png, "image/png", "image.png", {}, fields);
        assert.equal(rejected.response.status, 400);
        assert.equal(rejected.text, "Unsupported image provider.");
        await assert.rejects(fs.access(capture), { code: "ENOENT" });
      }
    });
    await t.test("empty, unsupported, signature-mismatched, truncated, and oversized files", async () => {
      for (const [buffer, mime, status] of [[Buffer.alloc(0), "image/png", 400], [Buffer.from("<svg/>"), "image/svg+xml", 415], [Buffer.from("not a PNG"), "image/png", 415], [png.subarray(0, 28), "image/png", 415], [Buffer.alloc(8388609), "image/png", 413]]) {
        await reset(); assert.equal((await upload(buffer, mime)).response.status, status);
      }
      await reset();
      const boundary = Buffer.concat([png, Buffer.alloc(8388608 - png.length)]);
      assert.equal((await upload(boundary)).response.status, 200, "Exactly 8 MiB is allowed");
      // A valid header with impractical decoded dimensions is rejected before GD allocates pixels.
      const huge = Buffer.from(png);
      huge.writeUInt32BE(20000, 16); huge.writeUInt32BE(20000, 20);
      await reset();
      const dimensions = await upload(huge);
      assert.equal(dimensions.response.status, 415);
      assert.match(dimensions.text, /16 megapixels/);
    });
    await t.test("upstream HTTP, transport, timeout, redirects, and suspicious URLs remain safe", async () => {
      for (const [value, status] of [
        [{ status: 500, body: "<html>secret path</html>" }, 502], [{ errno: 7 }, 502], [{ errno: 28 }, 504],
        [{ status: 302, body: "https://files.catbox.moe/image.png" }, 502],
        ...["<html>secret</html>", "x".repeat(4097), "http://files.catbox.moe/image.png", "https://files.catbox.moe.evil.test/image.png", "https://files.catbox.moe/image.svg", "https://files.catbox.moe/image.png?token=x", "https://user@files.catbox.moe/image.png", "https://files.catbox.moe:8443/image.png", "https://files.catbox.moe/a/../image.png"].map((body) => [{ body }, 502])
      ]) {
        await reset(value); assert.equal((await upload(png)).response.status, status);
      }
    });
    await t.test("per-client limiter ignores forwarded IPs, expires, and fails closed on corruption", async () => {
      await reset();
      for (let attempt = 0; attempt < 10; attempt++) assert.equal((await upload(png, "image/png", "image.png", { headers: { "X-Forwarded-For": `192.0.2.${attempt}` } })).response.status, 200);
      const limited = await upload(png);
      assert.equal(limited.response.status, 429); assert.ok(Number(limited.response.headers.get("retry-after")) > 0);
      await fs.writeFile(path.join(env.STREAM_UPLOAD_RATE_DIR, "clients.json"), JSON.stringify({ expired: { until: 1, count: 10 } }));
      assert.equal((await upload(png)).response.status, 200);
      await fs.writeFile(path.join(env.STREAM_UPLOAD_RATE_DIR, "clients.json"), "corrupted");
      assert.equal((await upload(png)).response.status, 503);
    });
    await t.test("concurrent processes share one atomic rate limit", async () => {
      await reset();
      const endpoint = JSON.stringify(path.join(root, "upload_image.php").replaceAll("\\", "/"));
      const code = `require ${endpoint}; echo image_upload_rate_limit('parallel-client');`;
      const results = await Promise.all(Array.from({ length: 20 }, () => new Promise((resolve, reject) => {
        const child = spawn(php, ["-d", "xdebug.mode=off", "-r", code], { env });
        let output = ""; child.stdout.on("data", (data) => { output += data; });
        child.on("error", reject); child.on("exit", (code) => code === 0 ? resolve(Number(output)) : reject(new Error(`PHP exited ${code}`)));
      })));
      assert.equal(results.filter((value) => value === 0).length, 10);
      assert.equal(results.filter((value) => value > 0).length, 10);
    });
  } finally {
    server.kill();
    if (server.exitCode === null) await new Promise((resolve) => server.once("exit", resolve));
    await fs.rm(temp, { recursive: true, force: true });
  }
});
