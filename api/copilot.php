<?php
declare(strict_types=1);
require __DIR__ . '/_proxy.php';

function copilot_config(): void
{
    $config = __DIR__ . '/config.php';
    if (!is_file($config)) {
        json_error('Gemini configuration is missing. Create api/config.php from api/config.example.php.', 503);
    }
    require_once $config;
    if (!defined('GEMINI_API_KEY') || GEMINI_API_KEY === '' || str_starts_with(GEMINI_API_KEY, 'replace-with-')) {
        json_error('Gemini API key is not configured on the server.', 503);
    }
}

function read_history(): array
{
    $file = __DIR__ . '/copilot-history.json';
    if (!is_file($file)) {
        return [];
    }
    $contents = file_get_contents($file);
    $history = $contents === false ? [] : json_decode($contents, true);
    return is_array($history) ? $history : [];
}

function write_history(array $history): void
{
    $file = __DIR__ . '/copilot-history.json';
    if (file_put_contents($file, json_encode($history, JSON_UNESCAPED_UNICODE), LOCK_EX) === false) {
        json_error('Unable to persist Copilot history.', 500);
    }
}

function clean_session(mixed $value): string
{
    return substr((string) preg_replace('/[^a-zA-Z0-9_-]/', '', (string) $value), 0, 64);
}

send_cors_headers();
if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
    http_response_code(204);
    exit;
}
if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
    json_error('Only POST is supported.', 405);
}

copilot_config();
$payload = json_decode(file_get_contents('php://input') ?: '', true);
if (!is_array($payload) || trim((string) ($payload['message'] ?? '')) === '') {
    json_error('A non-empty message is required.', 400);
}

$sessionId = clean_session($payload['session_id'] ?? 'default');
$message = trim((string) $payload['message']);
$mode = trim((string) ($payload['mode'] ?? $payload['task_mode'] ?? 'general'));
$history = read_history();
$conversation = $history[$sessionId] ?? [];
$conversation[] = ['role' => 'user', 'message' => $message];
$contents = [];
foreach (array_slice($conversation, -20) as $item) {
    $contents[] = [
        'role' => $item['role'] === 'model' ? 'model' : 'user',
        'parts' => [['text' => (string) $item['message']]],
    ];
}

$request = json_encode([
    'system_instruction' => ['parts' => [['text' => 'You are Annaraksha AI, an expert grain storage and food wastage prevention assistant. Give concise, practical, safety-conscious answers. Operating mode: ' . $mode . '.']]],
    'contents' => $contents,
    'generationConfig' => ['temperature' => 0.35, 'maxOutputTokens' => 1000],
], JSON_UNESCAPED_UNICODE);

$curl = curl_init('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' . rawurlencode(GEMINI_API_KEY));
if ($curl === false) {
    json_error('Unable to initialize Gemini connection.', 502);
}
curl_setopt_array($curl, [
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => $request,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_CONNECTTIMEOUT => 10,
    CURLOPT_TIMEOUT => 45,
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
$reply = $decoded['candidates'][0]['content']['parts'][0]['text'] ?? '';
if ($status < 200 || $status >= 300 || $reply === '') {
    $detail = $decoded['error']['message'] ?? 'Gemini returned no reply.';
    json_error($detail, $status >= 400 ? $status : 502);
}

$conversation[] = ['role' => 'model', 'message' => $reply, 'created_at' => gmdate('c')];
$history[$sessionId] = array_slice($conversation, -50);
write_history($history);
header('Content-Type: application/json; charset=utf-8');
echo json_encode([
    'status' => 'success',
    'session_id' => $sessionId,
    'reply' => $reply,
    'model_used' => 'gemini-2.0-flash',
], JSON_UNESCAPED_UNICODE);
