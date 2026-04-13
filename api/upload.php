<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'Método não permitido']);
    exit;
}

if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Arquivo não enviado ou inválido']);
    exit;
}

$uploadsDir = __DIR__ . '/../assets/uploads';
if (!is_dir($uploadsDir) && !mkdir($uploadsDir, 0755, true)) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Não foi possível criar a pasta de uploads']);
    exit;
}

$filename = basename($_FILES['file']['name']);
$filename = preg_replace('/[^a-zA-Z0-9._-]/', '_', $filename);
$targetPath = $uploadsDir . '/' . $filename;
$baseName = pathinfo($filename, PATHINFO_FILENAME);
$extension = pathinfo($filename, PATHINFO_EXTENSION);
$counter = 1;
while (file_exists($targetPath)) {
    $targetPath = sprintf('%s/%s-%d.%s', $uploadsDir, $baseName, $counter, $extension);
    $counter++;
}

if (!move_uploaded_file($_FILES['file']['tmp_name'], $targetPath)) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Falha ao mover o arquivo enviado']);
    exit;
}

$relativePath = 'assets/uploads/' . basename($targetPath);
echo json_encode(['ok' => true, 'path' => $relativePath]);
