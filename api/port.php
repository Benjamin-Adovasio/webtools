<?php
header('Content-Type: application/json');
header('Cache-Control: no-store');

$data = json_decode(file_get_contents('php://input'), true);
$host = $data['host'] ?? null;
$port = intval($data['port'] ?? 0);

if (!$host || $port < 1 || $port > 65535) {
    http_response_code(400);
    echo json_encode(["error" => "Invalid input"]);
    exit;
}

$ip = gethostbyname($host);
if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE) === false) {
    http_response_code(403);
    echo json_encode(["error" => "Private or reserved IPs not allowed"]);
    exit;
}

$connection = @fsockopen($host, $port, $errno, $errstr, 3);

echo json_encode([
    "host" => $host,
    "port" => $port,
    "open" => $connection ? true : false
]);

if ($connection) fclose($connection);