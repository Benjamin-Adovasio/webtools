<?php
declare(strict_types=1);
require __DIR__ . '/common.php';
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') respond(['error' => 'GET required'], 405);
// Trust only the direct peer. WAF must be explicitly configured to overwrite/clear client-IP headers
// before its forwarded headers can be considered reliable.
respond([
    'ip' => $_SERVER['REMOTE_ADDR'] ?? null,
    'user_agent' => substr((string)($_SERVER['HTTP_USER_AGENT'] ?? ''), 0, 300),
    'method' => $_SERVER['REQUEST_METHOD'] ?? 'GET',
    'server_time' => gmdate('c'),
]);
