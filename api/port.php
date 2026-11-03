<?php
declare(strict_types=1);
require __DIR__ . '/common.php';
$data = request_data();
$port = $data['port'] ?? null;
if (!is_int($port) || $port < 1 || $port > 65535) respond(['error' => 'Invalid port'], 400);
[$host, $ip] = resolve_public_ipv4($data['host'] ?? null);
$stream = @stream_socket_client("tcp://{$ip}:{$port}", $errno, $errstr, 3, STREAM_CLIENT_CONNECT);
$open = is_resource($stream);
if ($open) fclose($stream);
respond(['host' => $host, 'port' => $port, 'open' => $open]);
