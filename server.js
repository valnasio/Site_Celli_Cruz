const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 8000;

// Middleware
app.use(express.json());
app.use(express.static('.'));

// Configurar multer para upload de arquivos
const uploadsDir = path.join(__dirname, 'assets', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Sanitizar nome do arquivo
    let filename = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const ext = path.extname(filename);
    const baseName = path.basename(filename, ext);
    
    // Evitar sobrescrita de arquivos
    let targetPath = path.join(uploadsDir, filename);
    let counter = 1;
    while (fs.existsSync(targetPath)) {
      filename = `${baseName}-${counter}${ext}`;
      targetPath = path.join(uploadsDir, filename);
      counter++;
    }
    
    cb(null, filename);
  }
});

const upload = multer({ storage });

// ============================================================
// ENDPOINTS
// ============================================================

/**
 * POST /api/save
 * Recebe JSON e salva em data/imoveis.json
 */
app.post('/api/save', (req, res) => {
  try {
    console.log('[SAVE] Recebendo requisição de salvar dados...');
    
    const dataDir = path.join(__dirname, 'data');
    
    // Criar pasta data se não existir
    if (!fs.existsSync(dataDir)) {
      console.log('[SAVE] Criando diretório data...');
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    const filePath = path.join(dataDir, 'imoveis.json');
    
    // Validar que req.body não está vazio
    if (!req.body || Object.keys(req.body).length === 0) {
      console.error('[ERROR] req.body vazio ou inválido');
      return res.status(400).json({ ok: false, error: 'Dados vazio' });
    }
    
    const jsonData = JSON.stringify(req.body, null, 2);
    
    // Validar JSON
    try {
      JSON.parse(jsonData);
      console.log('[SAVE] JSON válido, tamanho:', jsonData.length, 'bytes');
    } catch (e) {
      console.error('[ERROR] JSON inválido:', e.message);
      return res.status(400).json({ ok: false, error: 'JSON inválido: ' + e.message });
    }
    
    // Salvar arquivo
    fs.writeFileSync(filePath, jsonData, 'utf8');
    
    // Verificar se arquivo foi salvo
    if (fs.existsSync(filePath)) {
      const fileSize = fs.statSync(filePath).size;
      console.log('<i class="fas fa-check"></i> Dados salvos em data/imoveis.json (', fileSize, 'bytes)');
      res.json({ ok: true, message: 'Dados salvos com sucesso' });
    } else {
      throw new Error('Arquivo não foi criado');
    }
  } catch (error) {
    console.error('[ERROR] Erro ao salvar:', error.message);
    res.status(500).json({ ok: false, error: 'Erro ao salvar: ' + error.message });
  }
});

/**
 * POST /api/upload
 * Endpoint para upload de arquivos
 */
app.post('/api/upload', upload.single('file'), (req, res) => {
  try {
    console.log('[UPLOAD] Recebendo arquivo...');
    
    if (!req.file) {
      console.error('[UPLOAD] Nenhum arquivo enviado');
      return res.status(400).json({ ok: false, error: 'Arquivo não enviado' });
    }
    
    console.log('[UPLOAD] Arquivo recebido:', {
      fieldname: req.file.fieldname,
      originalname: req.file.originalname,
      encoding: req.file.encoding,
      mimetype: req.file.mimetype,
      size: req.file.size,
      filename: req.file.filename
    });
    
    const relativePath = `assets/uploads/${req.file.filename}`;
    console.log('✅ Arquivo salvo em:', relativePath);
    
    res.json({ ok: true, path: relativePath });
  } catch (error) {
    console.error('[ERROR] Erro ao fazer upload:', error.message);
    res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * GET /
 * Serve a página index
 */
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

/**
 * GET /pages/admin.html
 * Serve a página admin
 */
app.get('/pages/admin.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'pages', 'admin.html'));
});

// ============================================================
// INICIAR SERVIDOR
// ============================================================

app.listen(PORT, () => {
  console.log('');
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║         🏠 Celli Cruz - Servidor Iniciado 🏠              ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`🌐 Local:     http://localhost:${PORT}`);
  console.log(`📋 Admin:     http://localhost:${PORT}/pages/admin.html`);
  console.log(`📂 Dados:     ./data/imoveis.json`);
  console.log(`📸 Uploads:   ./assets/uploads/`);
  console.log('');
  console.log('Pressione Ctrl+C para parar o servidor');
  console.log('');
});

// Tratamento de erros não capturados
process.on('unhandledRejection', (err) => {
  console.error('[ERROR] Erro não tratado:', err);
});
