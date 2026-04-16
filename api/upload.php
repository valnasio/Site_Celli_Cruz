<?php
header('Content-Type: application/json');
http_response_code(410);
echo json_encode([
    'ok' => false,
    'error' => 'Endpoint legado desativado. Novos uploads devem ir para o Supabase Storage.',
]);
