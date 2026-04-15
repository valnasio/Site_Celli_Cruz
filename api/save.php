<?php
/**
 * API segura para salvar dados JSON
 * Implementa validações e proteções contra ataques
 */

// Headers de segurança
header('Content-Type: application/json');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('X-XSS-Protection: 1; mode=block');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');

// Apenas POST é permitido
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    exit(json_encode(['error' => 'Método não permitido']));
}

// ============================================================
// VALIDAÇÕES DE SEGURANÇA
// ============================================================

// 1. Verificar token de autenticação
$expectedToken = getenv('ADMIN_TOKEN') ?: 'seu-token-admin-secreto';
$providedToken = $_SERVER['HTTP_AUTHORIZATION'] ?? '';

// Remove "Bearer " do início se presente
if (strpos($providedToken, 'Bearer ') === 0) {
    $providedToken = substr($providedToken, 7);
}

// Comparação segura usando hash_equals para prevenir timing attacks
if (empty($providedToken) || !hash_equals($expectedToken, $providedToken)) {
    http_response_code(401);
    exit(json_encode(['error' => 'Não autorizado']));
}

// 2. Validar Content-Type
$contentType = $_SERVER['CONTENT_TYPE'] ?? '';
if (strpos($contentType, 'application/json') === false) {
    http_response_code(400);
    exit(json_encode(['error' => 'Content-Type deve ser application/json']));
}

// 3. Limitar tamanho do corpo (5MB máximo)
$contentLength = $_SERVER['CONTENT_LENGTH'] ?? 0;
$maxSize = 5 * 1024 * 1024;
if ($contentLength > $maxSize) {
    http_response_code(413);
    exit(json_encode(['error' => 'Dados excdem tamanho máximo (5MB)']));
}

// 4. Ler e validar JSON
$data = file_get_contents('php://input');

if (empty($data)) {
    http_response_code(400);
    exit(json_encode(['error' => 'Corpo da requisição vazio']));
}

// Validar se é JSON válido
$decoded = json_decode($data, true);
if (json_last_error() !== JSON_ERROR_NONE) {
    http_response_code(400);
    exit(json_encode(['error' => 'JSON inválido: ' . json_last_error_msg()]));
}

// 5. Validar estrutura de dados esperada (exemplo básico)
if (!is_array($decoded)) {
    http_response_code(400);
    exit(json_encode(['error' => 'Dados devem ser um array JSON']));
}

// 6. Sanitizar dados (remover scripts maliciosos)
$data = sanitizeJson($data);

// 7. Caminho seguro do arquivo
$dataFile = realpath(__DIR__ . '/../data') . '/imoveis.json';
$expectedDir = realpath(__DIR__ . '/../data');

// Prevenir path traversal
if (!$dataFile || strpos($dataFile, $expectedDir) !== 0) {
    http_response_code(400);
    exit(json_encode(['error' => 'Caminho de arquivo inválido']));
}

// 8. Criar backup antes de sobrescrever
$backupFile = $dataFile . '.backup';
if (file_exists($dataFile)) {
    copy($dataFile, $backupFile);
}

// 9. Escrever arquivo de forma segura (atomic write)
$tempFile = $dataFile . '.tmp';
if (file_put_contents($tempFile, $data, LOCK_EX) === false) {
    http_response_code(500);
    exit(json_encode(['error' => 'Falha ao escrever arquivo temporário']));
}

// Renomear atomicamente
if (!rename($tempFile, $dataFile)) {
    unlink($tempFile);
    http_response_code(500);
    exit(json_encode(['error' => 'Falha ao salvar arquivo']));
}

// 10. Definir permissões seguras
chmod($dataFile, 0644);

// 11. Log da ação (opcional)
logAction('SAVE_DATA', $_SERVER['REMOTE_ADDR']);

// Resposta de sucesso
http_response_code(200);
exit(json_encode(['ok' => true, 'message' => 'Dados salvos com sucesso']));

/**
 * Sanitiza JSON para remover scripts maliciosos
 */
function sanitizeJson($data) {
    // Se for string JSON, decodificar primeiro
    $decoded = is_string($data) ? json_decode($data, true) : $data;
    
    if (!is_array($decoded)) {
        return json_encode($decoded);
    }

    // Recursivamente sanitizar arrays
    array_walk_recursive($decoded, function (&$value) {
        if (is_string($value)) {
            // Remover tags perigosas
            $value = strip_tags($value, '<b><i><u><em><strong><br><p><a><img>');
            
            // Remover atributos perigosos em tags
            $value = preg_replace('/<a[^>]*href=["\']javascript:[^"\']*["\'][^>]*>/i', '', $value);
            $value = preg_replace('/<img[^>]*on\w+=[^>]*>/i', '', $value);
            $value = preg_replace('/on\w+\s*=\s*["\']?[^"\'> ]*/i', '', $value);
            
            // Escapar HTML entities para segurança
            $value = htmlspecialchars($value, ENT_QUOTES, 'UTF-8');
        }
    });

    return json_encode($decoded);
}

/**
 * Registra ações importantes (log de auditoria)
 */
function logAction($action, $ip) {
    $logFile = __DIR__ . '/../logs/audit.log';
    
    // Criar pasta de logs se não existir
    if (!is_dir(dirname($logFile))) {
        mkdir(dirname($logFile), 0755, true);
    }

    $timestamp = date('Y-m-d H:i:s');
    $message = "[{$timestamp}] {$action} - IP: {$ip}\n";
    
    file_put_contents($logFile, $message, FILE_APPEND | LOCK_EX);
}
?>