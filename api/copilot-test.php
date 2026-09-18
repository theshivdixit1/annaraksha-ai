<?php
declare(strict_types=1);
require __DIR__ . '/_proxy.php';

send_cors_headers();
if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
    http_response_code(204);
    exit;
}
if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'GET') {
    json_error('Only GET is supported.', 405);
}

$config = __DIR__ . '/config.php';
if (!is_file($config)) {
    json_error('Gemini configuration is missing. Create api/config.php from api/config.example.php.', 503);
}
require_once $config;
if (!defined('GEMINI_API_KEY') || GEMINI_API_KEY === '' || str_starts_with(GEMINI_API_KEY, 'replace-with-')) {
    json_error('Gemini API key is not configured on the server.', 503);
}

$started = microtime(true);
$request = json_encode([
    'contents' => [[
        'parts' => [['text' => 'Respond with exactly: Annaraksha AI Online. Monitored silos safe.']],
    ]],
    'generationConfig' => ['temperature' => 0.1, 'maxOutputTokens' => 50],
], JSON_UNESCAPED_UNICODE);
$curl = curl_init('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=' . rawurlencode(GEMINI_API_KEY));
if ($curl === false) {
    json_error('Unable to initialize Gemini connection.', 502);
}
curl_setopt_array($curl, [
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => $request,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_CONNECTTIMEOUT => 10,
    CURLOPT_TIMEOUT => 30,
    CURLOPT_HTTPHEADER => ['Content-Type: application/json', 'Accept: application/json'],
]);
$response = curl_exec($curl);
$error = curl_error($curl);
$status = (int) curl_getinfo($curl, CURLINFO_HTTP_CODE);
curl_close($curl);
if ($response === false) {
    json_error('Gemini request failed: ' . ($error ?: 'unknown cURL error'), 502);
}
$decoded = json_decode($response, true);
if ($status < 200 || $status >= 300) {
    json_error($decoded['error']['message'] ?? 'Gemini diagnostic request failed.', $status ?: 502);
}
header('Content-Type: application/json; charset=utf-8');
echo json_encode([
    'status' => 'healthy',
    'model' => 'gemini-3.6-flash',
    'latency_ms' => (int) round((microtime(true) - $started) * 1000),
    'response' => $decoded['candidates'][0]['content']['parts'][0]['text'] ?? '',
    'timestamp' => gmdate('c'),
], JSON_UNESCAPED_UNICODE);
