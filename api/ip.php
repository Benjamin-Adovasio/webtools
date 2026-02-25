<?php
header('Content-Type: application/json');
header('Cache-Control: no-store');

function get_client_ip() {
    if (!empty($_SERVER['HTTP_CF_CONNECTING_IP'])) {
        return $_SERVER['HTTP_CF_CONNECTING_IP'];
    }
    if (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
        return explode(',', $_SERVER['HTTP_X_FORWARDED_FOR'])[0];
    }
    return $_SERVER['REMOTE_ADDR'];
}

echo json_encode([
    "ip" => get_client_ip(),
    "user_agent" => $_SERVER['HTTP_USER_AGENT'] ?? null,
    "method" => $_SERVER['REQUEST_METHOD'],
    "server_time" => gmdate("c")
]);