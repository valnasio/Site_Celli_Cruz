$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

$envFile = Join-Path $scriptDir '.env'
if (-Not (Test-Path $envFile)) {
    Write-Error ".env não encontrado. Crie o arquivo .env na raiz do projeto com DOMAIN e CERTBOT_EMAIL."
    exit 1
}

$envValues = Get-Content $envFile | Where-Object { $_ -and -not $_.TrimStart().StartsWith('#') }
$vars = @{}
foreach ($line in $envValues) {
    if ($line -match '^(\s*([^=]+)\s*)=(.*)$') {
        $name = $matches[2].Trim()
        $value = $matches[3].Trim()
        $vars[$name] = $value
    }
}

if (-Not $vars.ContainsKey('DOMAIN') -or -Not $vars['DOMAIN']) {
    Write-Error 'DOMAIN não definido em .env'
    exit 1
}
if (-Not $vars.ContainsKey('CERTBOT_EMAIL') -or -Not $vars['CERTBOT_EMAIL']) {
    Write-Error 'CERTBOT_EMAIL não definido em .env'
    exit 1
}

$domain = $vars['DOMAIN']
$email = $vars['CERTBOT_EMAIL']

Write-Host "Usando domínio: $domain"
Write-Host "Usando e-mail: $email"

# Garantir pastas necessárias
$sslDir = Join-Path $scriptDir 'ssl'
New-Item -ItemType Directory -Path $sslDir -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $scriptDir 'letsencrypt') -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $scriptDir 'webroot') -Force | Out-Null

if (-Not (Test-Path (Join-Path $sslDir 'cert.pem')) -or -Not (Test-Path (Join-Path $sslDir 'key.pem'))) {
    Write-Host 'Gerando certificado temporário self-signed para permitir inicialização do nginx...'
    docker run --rm -v "${sslDir}:/ssl" alpine sh -c "apk add --no-cache openssl >/dev/null 2>&1 && openssl req -x509 -nodes -days 1 -newkey rsa:2048 -keyout /ssl/key.pem -out /ssl/cert.pem -subj '/CN=localhost'"
}

# Iniciar Nginx para servir o desafio ACME
Write-Host 'Iniciando nginx...'
docker compose up -d nginx

# Emitir certificado via Certbot
Write-Host 'Solicitando certificado com Certbot...'
docker compose run --rm certbot certonly --webroot -w /var/www/certbot -d $domain -m $email --agree-tos --no-eff-email

# Copiar os arquivos para ssl/
Write-Host 'Copiando certificado para ssl/cert.pem e ssl/key.pem...'
docker compose run --rm certbot sh -c "cp /etc/letsencrypt/live/$domain/fullchain.pem /etc/nginx/ssl/cert.pem && cp /etc/letsencrypt/live/$domain/privkey.pem /etc/nginx/ssl/key.pem"

Write-Host 'Reiniciando nginx com SSL habilitado...'
docker compose restart nginx

Write-Host 'SSL instalado com sucesso para o domínio:' $domain
