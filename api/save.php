<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  http_response_code(200);
  exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  http_response_code(405);
  echo json_encode(['ok' => false, 'error' => 'Método não permitido']);
  exit;
}

$data = file_get_contents('php://input');
if (empty($data)) {
  http_response_code(400);
  echo json_encode(['ok' => false, 'error' => 'Dados vazios']);
  exit;
}

json_decode($data);

if (json_last_error() !== JSON_ERROR_NONE) {
  http_response_code(400);
  echo json_encode(['ok' => false, 'error' => 'JSON inválido: ' . json_last_error_msg()]);
  exit;
}

$dataFile = __DIR__ . '/../data/imoveis.json';
if (!file_exists(dirname($dataFile))) {
  if (!mkdir(dirname($dataFile), 0755, true)) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Não foi possível criar a pasta data/']);
    exit;
  }
}

if (!is_writable(dirname($dataFile))) {
  http_response_code(500);
  echo json_encode(['ok' => false, 'error' => 'Pasta data/ não tem permissão de escrita']);
  exit;
}

if (file_put_contents($dataFile, $data, LOCK_EX) === false) {
  http_response_code(500);
  echo json_encode(['ok' => false, 'error' => 'Falha ao salvar arquivo']);
  exit;
}

echo json_encode(['ok' => true, 'message' => 'Dados salvos com sucesso']);
?> 