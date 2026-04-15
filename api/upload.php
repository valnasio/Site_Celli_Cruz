<?php
/**
 * API segura de upload de arquivos
 * Implementa validações rigorosas para prevenir ataques
 */

// Headers de segurança
header('Content-Type: application/json');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('X-XSS-Protection: 1; mode=block');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Responde a requisições OPTIONS (CORS preflight)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Apenas POST é permitido
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    exit(json_encode(['ok' => false, 'error' => 'Método não permitido']));
}

// Valida se o arquivo foi enviado corretamente
if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
    http_response_code(400);
    exit(json_encode(['ok' => false, 'error' => 'Arquivo não enviado ou inválido']));
}

$file = $_FILES['file'];

// ============================================================
// VALIDAÇÕES DE SEGURANÇA
// ============================================================

// 1. Validar tamanho máximo (10MB)
$maxFileSize = 10 * 1024 * 1024;
if ($file['size'] > $maxFileSize) {
    http_response_code(413);
    exit(json_encode(['ok' => false, 'error' => 'Arquivo excede tamanho máximo (10MB)']));
}

// 2. Whitelist de extensões permitidas
$allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'pdf', 'txt'];
$fileExtension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));

if (!in_array($fileExtension, $allowedExtensions)) {
    http_response_code(400);
    exit(json_encode(['ok' => false, 'error' => 'Tipo de arquivo não permitido']));
}

// 3. Verificar MIME type
$finfo = finfo_open(FILEINFO_MIME_TYPE);
$mimeType = finfo_file($finfo, $file['tmp_name']);
finfo_close($finfo);

$allowedMimes = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
    'application/pdf', 'text/plain'
];

if (!in_array($mimeType, $allowedMimes)) {
    http_response_code(400);
    exit(json_encode(['ok' => false, 'error' => 'MIME type não permitido']));
}

// 4. Criar diretório de uploads se não existir
$uploadsDir = __DIR__ . '/../assets/uploads';
if (!is_dir($uploadsDir)) {
    if (!mkdir($uploadsDir, 0755, true)) {
        http_response_code(500);
        exit(json_encode(['ok' => false, 'error' => 'Não foi possível criar pasta de uploads']));
    }
}

// 5. Proteger diretório com .htaccess
$htaccessPath = $uploadsDir . '/.htaccess';
if (!file_exists($htaccessPath)) {
    $htaccessContent = "# Prevenir execução de scripts\n";
    $htaccessContent .= "php_flag engine off\n";
    $htaccessContent .= "AddType text/plain .php .phtml .php3 .php4 .php5 .phps\n";
    $htaccessContent .= "AddHandler cgi-script .php .phtml .php3 .php4 .php5 .phps\n";
    file_put_contents($htaccessPath, $htaccessContent);
}

// 6. Gerar nome de arquivo seguro (remover caracteres perigosos)
$baseName = pathinfo($file['name'], PATHINFO_FILENAME);
$baseName = preg_replace('/[^a-zA-Z0-9._-]/', '_', $baseName);
$baseName = preg_replace('/_{2,}/', '_', $baseName);
$baseName = trim($baseName, '._-');
$baseName = substr($baseName, 0, 50); // Limitar comprimento

// Gerar timestamp para evitar colisões
$timestamp = time();
$randomStr = bin2hex(random_bytes(4));
$newFilename = "{$baseName}_{$timestamp}_{$randomStr}.{$fileExtension}";
$targetPath = $uploadsDir . '/' . $newFilename;

// 7. Evitar path traversal
$realpath = realpath(dirname($targetPath));
if ($realpath !== realpath($uploadsDir)) {
    http_response_code(400);
    exit(json_encode(['ok' => false, 'error' => 'Caminho de arquivo inválido']));
}

// 8. Mover arquivo para local seguro
if (!move_uploaded_file($file['tmp_name'], $targetPath)) {
    http_response_code(500);
    exit(json_encode(['ok' => false, 'error' => 'Falha ao mover arquivo']));
}

// 9. Definir permissões seguras
chmod($targetPath, 0644);

// 10. Retornar resposta com sucesso
$relativePath = 'assets/uploads/' . $newFilename;
http_response_code(200);
exit(json_encode(['ok' => true, 'path' => $relativePath]));
?>
