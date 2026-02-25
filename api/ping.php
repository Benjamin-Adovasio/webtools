<?php
header('Content-Type: application/json');
header('Cache-Control: no-store');

$data = json_decode(file_get_contents('php://input'), true);
$host = $data['host'] ?? null;

if (!$host) {
    http_response_code(400);
    echo json_encode(["error" => "Missing host"]);
    exit;
}

/* Block private IP ranges */
$ip = gethostbyname($host);
if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE) === false) {
    http_response_code(403);
    echo json_encode(["error" => "Private or reserved IPs not allowed"]);
    exit;
}

/* Limit to 3 pings max */
$output = shell_exec("ping -c 3 -W 2 " . escapeshellarg($host));

echo json_encode([
    "host" => $host,
    "output" => $output
]);