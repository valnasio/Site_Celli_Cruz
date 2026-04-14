const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 7070;
const DATA_FILE = path.join(__dirname, 'data', 'imoveis.json');
const UPLOADS_DIR = path.join(__dirname, 'assets', 'uploads');

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (pathname === '/api/save' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, message: 'Dados salvos com sucesso' }));
      } catch (error) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: 'JSON inválido' }));
      }
    });
    return;
  }

  if (pathname === '/api/upload' && req.method === 'POST') {
    const boundary = req.headers['content-type'].split('boundary=')[1];
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString('binary');
    });
    req.on('end', () => {
      try {
        const parts = body.split('--' + boundary);
        for (let part of parts) {
          if (part.includes('filename=')) {
            const filenameMatch = part.match(/filename="([^"]+)"/);
            if (filenameMatch) {
              const filename = filenameMatch[1];
              const fileStart = part.indexOf('\r\n\r\n') + 4;
              const fileEnd = part.lastIndexOf('\r\n');
              const fileContent = part.substring(fileStart, fileEnd);
              const filePath = path.join(UPLOADS_DIR, filename);
              fs.writeFileSync(filePath, fileContent, 'binary');
              
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ 
                ok: true, 
                path: 'assets/uploads/' + filename 
              }));
              return;
            }
          }
        }
        throw new Error('Arquivo não encontrado');
      } catch (error) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: 'Erro no upload' }));
      }
    });
    return;
  }

  const filePath = path.join(__dirname, pathname === '/' ? 'index.html' : pathname);
  const ext = path.extname(filePath);

  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath);
    const contentType = {
      '.html': 'text/html',
      '.css': 'text/css',
      '.js': 'application/javascript',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml'
    }[ext] || 'application/octet-stream';

    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  } else {
    res.writeHead(404);
    res.end('Arquivo não encontrado');
  }
});

server.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
  console.log('Pressione Ctrl+C para parar');
});
