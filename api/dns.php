<?php
header('Content-Type: application/json');
header('Cache-Control: no-store');

$data = json_decode(file_get_contents('php://input'), true);

$name = $data['name'] ?? null;
$type = strtoupper($data['type'] ?? 'A');

if (!$name) {
    http_response_code(400);
    echo json_encode(["error" => "Missing name"]);
    exit;
}

$valid_types = ['A','AAAA','MX','TXT','NS','SOA','CNAME'];
if (!in_array($type, $valid_types)) {
    http_response_code(400);
    echo json_encode(["error" => "Invalid type"]);
    exit;
}

$records = dns_get_record($name, constant("DNS_" . $type));

echo json_encode([
    "query" => $name,
    "type" => $type,
    "results" => $records
]);