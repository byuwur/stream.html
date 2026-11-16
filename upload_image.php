<?php

/**
 * File: upload_image.php
 * Standalone image uploads through developer-defined providers. Deploy on the HTTPS PHP host only.
 * cURL conventions adapted from spa.php make_http_request() (MIT, byUwUr).
 */

declare(strict_types=1);

ini_set('display_errors', '0');

const IMAGE_UPLOAD_DEFAULT_PROVIDER = 'catbox';
const IMAGE_UPLOAD_BYTES = 8388608;
const IMAGE_UPLOAD_PIXELS = 16000000;
const IMAGE_UPLOAD_WINDOW = 600;
const IMAGE_UPLOAD_REQUESTS = 10;

/** Send a public plain-text response; internal failures never enter the body. */
function image_upload_response(int $status, string $message): void
{
  http_response_code($status);
  header('Content-Type: text/plain; charset=utf-8');
  echo $message;
}

/**
 * Consume one attempt per REMOTE_ADDR, under an exclusive lock. No forwarded headers are trusted.
 * Expired clients are pruned on every attempt; at most 4096 active clients occupy one small file.
 * @return int Seconds to wait, or zero when allowed. Throws on unavailable private storage.
 */
function image_upload_rate_limit(string $address): int
{
  $directory = getenv('STREAM_UPLOAD_RATE_DIR') ?: sys_get_temp_dir() . '/stream-image-' . substr(hash('sha256', __DIR__), 0, 16);
  if (!is_dir($directory) && !@mkdir($directory, 0700, true) && !is_dir($directory))
    throw new RuntimeException('rate directory unavailable');
  $directory = realpath($directory);
  $document_root = realpath($_SERVER['DOCUMENT_ROOT'] ?? __DIR__);
  // Refuse public storage, including a symlink resolving into the served tree.
  if (!$directory || !$document_root || $directory === $document_root || str_starts_with(str_replace('\\', '/', $directory) . '/', str_replace('\\', '/', $document_root) . '/'))
    throw new RuntimeException('rate directory is public');
  $file = @fopen($directory . '/clients.json', 'c+b');
  if (!$file) throw new RuntimeException('rate file unavailable');
  try {
    if (!flock($file, LOCK_EX)) throw new RuntimeException('rate lock unavailable');
    @chmod($directory . '/clients.json', 0600);
    $json = stream_get_contents($file, 1048577);
    if ($json === false || strlen($json) > 1048576) throw new RuntimeException('rate file unreadable');
    $clients = $json === '' ? [] : json_decode($json, true, 8, JSON_THROW_ON_ERROR);
    if (!is_array($clients)) throw new RuntimeException('rate file invalid');
    $now = time();
    foreach ($clients as $key => $client) {
      if (!is_array($client) || !isset($client['until'], $client['count'])) throw new RuntimeException('rate entry invalid');
      if ($client['until'] <= $now) unset($clients[$key]);
    }
    $key = hash('sha256', $address);
    if (!isset($clients[$key])) {
      if (count($clients) >= 4096) return IMAGE_UPLOAD_WINDOW;
      $clients[$key] = ['until' => $now + IMAGE_UPLOAD_WINDOW, 'count' => 0];
    }
    if ($clients[$key]['count'] >= IMAGE_UPLOAD_REQUESTS) return max(1, $clients[$key]['until'] - $now);
    $clients[$key]['count']++;
    $json = json_encode($clients, JSON_THROW_ON_ERROR);
    rewind($file);
    if (!ftruncate($file, 0) || fwrite($file, $json) !== strlen($json) || !fflush($file))
      throw new RuntimeException('rate write failed');
    return 0;
  } finally {
    // Closing also releases the lock on rejection or failure.
    fclose($file);
  }
}

/**
 * Validate the actual upload bytes using Fileinfo, dimensions, and a bounded GD decode.
 * Returns a canonical MIME/extension pair, or throws with a public validation message.
 * Decoding checks the image without resizing, re-encoding, or changing animation bytes.
 */
function image_upload_type(string $path): array
{
  $formats = ['image/png' => 'png', 'image/jpeg' => 'jpg', 'image/webp' => 'webp', 'image/gif' => 'gif'];
  $mime = (new finfo(FILEINFO_MIME_TYPE))->file($path);
  $size = @getimagesize($path);
  if (!isset($formats[$mime]) || !$size || ($size['mime'] ?? '') !== $mime || $size[0] < 1 || $size[1] < 1)
    throw new InvalidArgumentException('Unsupported or malformed image. Use PNG, JPEG, WebP, or GIF.');
  // Compressed bytes alone do not bound decoder memory. Limit decoded images to 16 megapixels.
  if ($size[0] * $size[1] > IMAGE_UPLOAD_PIXELS)
    throw new InvalidArgumentException('Image dimensions exceed 16 megapixels.');
  $limit = ini_parse_quantity(ini_get('memory_limit'));
  if ($limit > 0 && memory_get_usage(true) + filesize($path) + $size[0] * $size[1] * 8 + 16777216 > $limit)
    throw new InvalidArgumentException('Image dimensions exceed available upload capacity.');
  $decoded = @imagecreatefromstring(file_get_contents($path));
  if (!$decoded) throw new InvalidArgumentException('The image is malformed or incomplete.');
  unset($decoded);
  return [$mime, $formats[$mime]];
}

/**
 * Resolve an allowed provider ID to developer-owned endpoints, multipart fields, and parsing.
 * Add a match case and response parser for each additional provider; request URLs are never used.
 * @return array|null Endpoint, file field, fixed form fields, and a parser returning a safe URL or null.
 */
function image_upload_provider(string $provider): ?array
{
  return match ($provider) {
    'catbox' => [
      'endpoint' => 'https://catbox.moe/user/api.php',
      'file' => 'fileToUpload',
      'fields' => ['reqtype' => 'fileupload'],
      'parse' => 'image_upload_catbox_response'
    ],
    default => null
  };
}

/** Extract only canonical HTTPS raster URLs from Catbox's plain-text response. */
function image_upload_catbox_response(string $response): ?string
{
  $url = trim($response);
  return preg_match('~\Ahttps://files\.catbox\.moe/[a-zA-Z0-9_-]+\.(?:png|jpe?g|webp|gif)\z~i', $url) === 1 ? $url : null;
}

/**
 * Forward original bytes once using a resolved provider and the shared HTTPS transport.
 * @return array [HTTP status, public URL or safe error, optional safe diagnostic header].
 * Never returns upstream HTML, raw cURL errors, or server paths.
 */
function image_upload_forward(string $path, string $mime, string $extension, array $provider): array
{
  $request = curl_init($provider['endpoint']);
  if (!$request) throw new RuntimeException('curl initialization failed');
  $response = '';
  $fields = $provider['fields'];
  $fields[$provider['file']] = new CURLFile($path, $mime, 'image.' . $extension);
  curl_setopt_array($request, [
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => $fields,
    CURLOPT_CONNECTTIMEOUT => 10,
    CURLOPT_TIMEOUT => 40,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_SSL_VERIFYPEER => true,
    CURLOPT_SSL_VERIFYHOST => 2,
    CURLOPT_PROTOCOLS => CURLPROTO_HTTPS,
    CURLOPT_FOLLOWLOCATION => false,
    // Bound even an unexpected HTML response before it can exhaust shared-host memory.
    CURLOPT_WRITEFUNCTION => static function ($handle, string $chunk) use (&$response): int {
      if (strlen($response) + strlen($chunk) > 4096) return 0;
      $response .= $chunk;
      return strlen($chunk);
    }
  ]);
  // A transport error may follow a completed upload. Never automatically replay this POST.
  $completed = curl_exec($request);
  $error = curl_errno($request);
  $status = curl_getinfo($request, CURLINFO_RESPONSE_CODE);
  $diagnostic = 'transport=' . $error . '; upstream=' . $status;
  if ($completed === false || $error || $status < 200 || $status >= 300) {
    error_log('stream image upload: transport=' . $error . ' HTTP=' . $status);
    if ($error === CURLE_OPERATION_TIMEDOUT) return [504, 'Upload timed out. No automatic retry was made.', $diagnostic];
    return [502, 'Image host unavailable. No automatic retry was made.', $diagnostic];
  }
  $value = ($provider['parse'])($response);
  if ($value === null) {
    error_log('stream image upload: invalid provider response');
    return [502, 'Invalid image host response.', $diagnostic . '; response=invalid'];
  }
  return [200, $value, null];
}

/** Handle the anonymous HTTP boundary; all responses include credential-free CORS headers. */
function upload_image(): void
{
  header('Access-Control-Allow-Origin: *');
  header('Access-Control-Allow-Methods: POST, OPTIONS');
  header('Access-Control-Allow-Headers: Content-Type');
  header('Access-Control-Expose-Headers: Retry-After, X-Upload-Diagnostic');
  header('Cache-Control: no-store');
  header('X-Content-Type-Options: nosniff');
  $method = $_SERVER['REQUEST_METHOD'] ?? '';
  if ($method === 'OPTIONS') {
    http_response_code(204);
    return;
  }
  if ($method !== 'POST') {
    header('Allow: POST, OPTIONS');
    image_upload_response(405, 'Use POST multipart/form-data.');
    return;
  }
  try {
    $retry = image_upload_rate_limit($_SERVER['REMOTE_ADDR'] ?? 'unknown');
    if ($retry) {
      header('Retry-After: ' . $retry);
      image_upload_response(429, 'Upload limit reached. Please wait before trying again.');
      return;
    }
    // Detect PHP-discarded POST bodies as well as our own file limit; allow multipart overhead.
    $length = (int) ($_SERVER['CONTENT_LENGTH'] ?? 0);
    $post_limit = ini_parse_quantity(ini_get('post_max_size'));
    if ($length > IMAGE_UPLOAD_BYTES + 65536 || ($post_limit > 0 && $length > $post_limit)) {
      image_upload_response(413, 'Image exceeds the 8 MiB upload limit.');
      return;
    }
    if (!str_starts_with(strtolower($_SERVER['CONTENT_TYPE'] ?? ''), 'multipart/form-data;')) {
      image_upload_response(400, 'Use multipart/form-data with fileToUpload.');
      return;
    }
    $default = getenv('STREAM_UPLOAD_PROVIDER');
    $name = $_POST['provider'] ?? ($default === false || $default === '' ? IMAGE_UPLOAD_DEFAULT_PROVIDER : $default);
    $provider = is_string($name) ? image_upload_provider($name) : null;
    if ($provider === null) {
      if (!array_key_exists('provider', $_POST)) throw new RuntimeException('configured provider unavailable');
      image_upload_response(400, 'Unsupported image provider.');
      return;
    }
    $file = $_FILES['fileToUpload'] ?? null;
    if (!$file || !is_array($file) || !isset($file['error']) || !is_int($file['error'])) {
      image_upload_response(400, 'Missing image file. Check the server upload limits.');
      return;
    }
    if (in_array($file['error'], [UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE], true)) {
      image_upload_response(413, 'Image exceeds the upload limit. Maximum 8 MiB.');
      return;
    }
    if (in_array($file['error'], [UPLOAD_ERR_NO_TMP_DIR, UPLOAD_ERR_CANT_WRITE, UPLOAD_ERR_EXTENSION], true)) {
      error_log('stream image upload: PHP upload processing failure code=' . $file['error']);
      image_upload_response(503, 'Image upload service unavailable.');
      return;
    }
    if ($file['error'] !== UPLOAD_ERR_OK) {
      image_upload_response(400, 'Image upload was incomplete or missing.');
      return;
    }
    $path = $file['tmp_name'] ?? null;
    if (!is_string($path) || !is_uploaded_file($path)) {
      image_upload_response(400, 'Invalid uploaded file.');
      return;
    }
    $bytes = filesize($path);
    if (!$bytes || $bytes > IMAGE_UPLOAD_BYTES) {
      image_upload_response($bytes ? 413 : 400, $bytes ? 'Image exceeds the 8 MiB upload limit.' : 'The image file is empty.');
      return;
    }
    if (!extension_loaded('curl') || !extension_loaded('fileinfo') || !function_exists('imagecreatefromstring'))
      throw new RuntimeException('required PHP extension unavailable');
    [$mime, $extension] = image_upload_type($path);
    [$status, $message, $diagnostic] = image_upload_forward($path, $mime, $extension, $provider);
    if ($diagnostic !== null) header('X-Upload-Diagnostic: ' . $diagnostic);
    image_upload_response($status, $message);
  } catch (InvalidArgumentException $error) {
    image_upload_response(415, $error->getMessage());
  } catch (Throwable $error) {
    error_log('stream image upload: service configuration or storage failure');
    image_upload_response(503, 'Image upload service unavailable.');
  }
}

if (realpath($_SERVER['SCRIPT_FILENAME'] ?? '') === __FILE__) upload_image();
