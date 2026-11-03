<?php
declare(strict_types=1);

function respond(array $payload, int $status = 200): never {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    header('X-Content-Type-Options: nosniff');
    echo json_encode($payload, JSON_INVALID_UTF8_SUBSTITUTE | JSON_PARTIAL_OUTPUT_ON_ERROR);
    exit;
}

function request_data(): array {
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') respond(['error' => 'POST required'], 405);
    if (isset($_SERVER['CONTENT_LENGTH']) && (int)$_SERVER['CONTENT_LENGTH'] > 2048) respond(['error' => 'Request too large'], 413);
    $raw = file_get_contents('php://input', false, null, 0, 2049);
    if ($raw === false || strlen($raw) > 2048) respond(['error' => 'Request too large'], 413);
    $data = json_decode($raw, true);
    if (!is_array($data) || array_is_list($data)) respond(['error' => 'Invalid JSON object'], 400);
    return $data;
}

function valid_hostname(string $host): bool {
    if (strlen($host) > 253 || strlen($host) < 1 || str_contains($host, '..')) return false;
    if (filter_var($host, FILTER_VALIDATE_IP)) return filter_var($host, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4) !== false;
    if (!preg_match('/^(?=.{1,253}$)[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*\.?$/iD', $host)) return false;
    return str_contains($host, '.'); // require FQDN rather than internal short names
}

function ipv4_in_cidr(string $ip, string $cidr): bool {
    [$network, $prefix] = explode('/', $cidr);
    $a = ip2long($ip); $n = ip2long($network);
    if ($a === false || $n === false) return false;
    $mask = $prefix == 0 ? 0 : ((0xffffffff << (32 - (int)$prefix)) & 0xffffffff);
    return ($a & $mask) === ($n & $mask);
}

function public_ipv4(string $ip): bool {
    if (!filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4)) return false;
    // Default-deny exceptional allocations, private networks, and special-use addresses.
    $deny = [
        '0.0.0.0/8', '10.0.0.0/8', '100.64.0.0/10', '127.0.0.0/8',
        '169.254.0.0/16', '172.16.0.0/12', '192.0.0.0/24',
        '192.0.2.0/24', '192.88.99.0/24', '192.168.0.0/16',
        '198.18.0.0/15', '198.51.100.0/24', '203.0.113.0/24',
        '224.0.0.0/4', '240.0.0.0/4',
    ];
    foreach ($deny as $cidr) if (ipv4_in_cidr($ip, $cidr)) return false;
    return true;
}

function resolve_public_ipv4(mixed $value): array {
    if (!is_string($value)) respond(['error' => 'Invalid host'], 400);
    $host = strtolower(rtrim(trim($value), '.'));
    if (!valid_hostname($host)) respond(['error' => 'Invalid public hostname or IPv4 address'], 400);
    if (filter_var($host, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4)) $ips = [$host];
    else $ips = gethostbynamel($host) ?: [];
    $ips = array_values(array_unique($ips));
    if (!$ips) respond(['error' => 'No IPv4 address found'], 400);
    // Reject entire destination if even one IPv4 answer is unsafe.
    foreach ($ips as $ip) if (!public_ipv4($ip)) respond(['error' => 'Private or special-use destination not allowed'], 403);
    return [$host, $ips[0]];
}
