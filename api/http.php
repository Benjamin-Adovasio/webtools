<?php
header('Content-Type: application/json');
header('Cache-Control: no-store');

$data = json_decode(file_get_contents('php://input'), true);
$url = $data['url'] ?? null;

if (!$url || !filter_var($url, FILTER_VALIDATE_URL)) {
    http_response_code(400);
    echo json_encode(["error" => "Invalid URL"]);
    exit;
}

$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HEADER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 5);

$response = curl_exec($ch);
$info = curl_getinfo($ch);
curl_close($ch);

echo json_encode([
    "url" => $url,
    "status_code" => $info['http_code'],
    "total_time" => $info['total_time'],
    "content_type" => $info['content_type']
]);