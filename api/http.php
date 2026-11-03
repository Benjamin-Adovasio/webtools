<?php
declare(strict_types=1);
require __DIR__ . '/common.php';
$data = request_data();
$url = $data['url'] ?? null;
if (!is_string($url) || strlen($url) > 1024 || !filter_var($url, FILTER_VALIDATE_URL)) respond(['error' => 'Invalid URL'], 400);
$parts = parse_url($url);
if ($parts === false || !isset($parts['scheme'], $parts['host']) || isset($parts['user']) || isset($parts['pass'])) respond(['error' => 'Invalid URL'], 400);
$scheme = strtolower($parts['scheme']);
if (!in_array($scheme, ['http', 'https'], true)) respond(['error' => 'Only HTTP and HTTPS are supported'], 400);
$port = $parts['port'] ?? ($scheme === 'https' ? 443 : 80);
if (!in_array($port, [80, 443], true)) respond(['error' => 'Only ports 80 and 443 are supported'], 403);
[$host, $ip] = resolve_public_ipv4($parts['host']);
$ch = curl_init();
if ($ch === false) respond(['error' => 'HTTP service unavailable'], 503);
curl_setopt_array($ch, [
    CURLOPT_URL => $url,
    CURLOPT_RETURNTRANSFER => false,
    CURLOPT_NOBODY => true,
    CURLOPT_FOLLOWLOCATION => false,
    CURLOPT_MAXREDIRS => 0,
    CURLOPT_CONNECTTIMEOUT => 3,
    CURLOPT_TIMEOUT => 6,
    CURLOPT_PROTOCOLS => CURLPROTO_HTTP | CURLPROTO_HTTPS,
    CURLOPT_PROXY => '',
    CURLOPT_NOPROXY => '*',
    CURLOPT_RESOLVE => ["{$host}:{$port}:{$ip}"],
    CURLOPT_USERAGENT => 'Adovasio-WebTools/1.0',
]);
$result = curl_exec($ch);
$status = curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
$total = curl_getinfo($ch, CURLINFO_TOTAL_TIME);
$type = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
$error = curl_error($ch);
curl_close($ch);
if ($result === false) respond(['error' => 'HTTP check failed: ' . $error], 502);
respond(['url' => $url, 'status_code' => $status, 'total_time' => $total, 'content_type' => $type]);
