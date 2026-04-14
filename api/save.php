<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');

$data = file_get_contents('php://input');
json_decode($data); // valida JSON

if (json_last_error() === JSON_ERROR_NONE) {
  file_put_contents('../data/imoveis.json', $data);
  echo json_encode(['ok' => true]);
} else {
  http_response_code(400);
  echo json_encode(['error' => 'JSON inválido']);
}
?> 