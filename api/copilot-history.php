<?php
declare(strict_types=1);
require __DIR__ . '/_proxy.php';

function history_file(): string { return __DIR__ . '/copilot-history.json'; }
function history_data(): array {
    if (!is_file(history_file())) return [];
    $data = json_decode(file_get_contents(history_file()) ?: '', true);
    return is_array($data) ? $data : [];
}
function session_key(mixed $value): string {
    return substr((string) preg_replace('/[^a-zA-Z0-9_-]/', '', (string) $value), 0, 64);
}

send_cors_headers();
if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') { http_response_code(204); exit; }
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$payload = json_decode(file_get_contents('php://input') ?: '', true);
$sessionId = session_key($_GET['session_id'] ?? ($payload['session_id'] ?? ''));
$history = history_data();

if ($method === 'GET') {
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['status' => 'success', 'session_id' => $sessionId, 'messages' => array_slice($history[$sessionId] ?? [], -50)], JSON_UNESCAPED_UNICODE);
    exit;
}
if ($method === 'DELETE') {
    if ($sessionId !== '') {
        unset($history[$sessionId]);
        file_put_contents(history_file(), json_encode($history, JSON_UNESCAPED_UNICODE), LOCK_EX);
    }
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['status' => 'success', 'message' => 'Chat history cleared']);
    exit;
}
json_error('Only GET and DELETE are supported.', 405);
