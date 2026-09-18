<?php
declare(strict_types=1);

const UPSTREAM_API_BASE = 'https://ais-pre-n4m7vz2ayebu74wch4aisl-926414202659.asia-southeast1.run.app';
const ALLOWED_ORIGIN = 'https://annaraksha.unbeatablefoods.com';

function send_cors_headers(): void
{
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if ($origin === ALLOWED_ORIGIN) {
        header('Access-Control-Allow-Origin: ' . ALLOWED_ORIGIN);
        header('Vary: Origin');
    }
    header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Accept');
    header('Access-Control-Max-Age: 86400');
}

function json_error(string $message, int $status = 500): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['status' => 'error', 'message' => $message], JSON_UNESCAPED_SLASHES);
    exit;
}

function proxy_upstream(string $endpoint): never
{
    send_cors_headers();
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(204);
        exit;
    }

    $url = UPSTREAM_API_BASE . '/api/' . ltrim($endpoint, '/');
    $query = $_SERVER['QUERY_STRING'] ?? '';
    if ($query !== '') {
        $url .= '?' . $query;
    }

    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    $body = file_get_contents('php://input');
    $headers = ['Accept: application/json'];
    if (!empty($_SERVER['CONTENT_TYPE'])) {
        $headers[] = 'Content-Type: ' . $_SERVER['CONTENT_TYPE'];
    }

    $curl = curl_init($url);
    if ($curl === false) {
        json_error('Unable to initialize the upstream connection');
    }
    curl_setopt_array($curl, [
        CURLOPT_CUSTOMREQUEST => $method,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => false,
        CURLOPT_CONNECTTIMEOUT => 10,
        CURLOPT_TIMEOUT => 45,
        CURLOPT_HTTPHEADER => $headers,
    ]);
    if ($method !== 'GET' && $method !== 'HEAD' && $body !== false && $body !== '') {
        curl_setopt($curl, CURLOPT_POSTFIELDS, $body);
    }

    $response = curl_exec($curl);
    $error = curl_error($curl);
    $status = (int) curl_getinfo($curl, CURLINFO_HTTP_CODE);
    curl_close($curl);

    if ($response === false) {
        json_error('Upstream API request failed: ' . ($error ?: 'unknown cURL error'), 502);
    }
    if ($status < 200 || $status >= 300) {
        http_response_code($status > 0 ? $status : 502);
    }
    header('Content-Type: application/json; charset=utf-8');
    echo $response;
    exit;
}
