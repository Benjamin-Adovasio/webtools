<?php
declare(strict_types=1);
require __DIR__ . '/common.php';
$data = request_data();
$name = $data['name'] ?? null;
$type = strtoupper((string)($data['type'] ?? 'A'));
if (!is_string($name) || !valid_hostname(strtolower(rtrim($name, '.')))) respond(['error' => 'Invalid domain name'], 400);
$types = ['A' => DNS_A, 'AAAA' => DNS_AAAA, 'MX' => DNS_MX, 'TXT' => DNS_TXT, 'NS' => DNS_NS, 'SOA' => DNS_SOA, 'CNAME' => DNS_CNAME];
if (!isset($types[$type])) respond(['error' => 'Invalid record type'], 400);
$records = @dns_get_record($name, $types[$type]);
respond(['query' => $name, 'type' => $type, 'results' => $records ?: []]);
