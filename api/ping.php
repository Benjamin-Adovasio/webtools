<?php
declare(strict_types=1);
require __DIR__ . '/common.php';
$data = request_data();
[$host, $ip] = resolve_public_ipv4($data['host'] ?? null);
$command = '/usr/bin/timeout 9 /usr/bin/ping -n -c 3 -W 2 ' . escapeshellarg($ip) . ' 2>&1';
$output = shell_exec($command);
respond(['host' => $host, 'output' => substr((string)$output, 0, 4096)]);
