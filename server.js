const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const compression = require('compression');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 8000;

// Middleware de segurança - Helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      scriptSrcElem: ["'self'", "'unsafe-inline'"],
      scriptSrcAttr: ["'unsafe-hashes'", "'sha256-eKX7A+fUFrWNhE8J46bRSrDNEpxjvGdme8aXSEcy5DI='", "'sha256-7J8rS7p+xIZns10wNDg0+C6Sfdw6lG+7bJD9MvEsXSM='", "'sha256-vGG49zpAPQrNacwLUD4Tp5v15XLwnCW1YDSUmEkpQJI='", "'sha256-7EB8TgcGSMaF5Hvk9945xp1Mhm1Ypp8Vd3yskmquqM8='", "'sha256-c/6mw2bQEVPAHa1xzyDjcZVxLlseg9MmM9PM7ldR+kg='", "'sha256-ieoeWczDHkReVBsRBqaal5AFMlBtNjMzgwKvLqi/tSU='", "'sha256-4wx8zJdpeNQDuzCjQAyYOOMSXXVzP1Ut86hY+MgLqYY='"],
      connectSrc: ["'self'"],
      frameSrc: ["'self'", "https://www.google.com"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

// Middleware de compressão (deve ser primeiro após helmet)
app.use(compression({
  level: 6, // Nível de compressão otimizado
  threshold: 1024, // Comprimir apenas arquivos > 1KB
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  }
}));

// Middleware
app.use(express.json({ limit: '10mb' })); // Limit JSON payload size

// Middleware de cache
app.use((req, res, next) => {
  // Cache para assets estáticos
  if (req.url.match(/\.(css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/)) {
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable'); // 1 ano
  }
  // Cache curto para páginas HTML
  else if (req.url.match(/\.html$/)) {
    res.setHeader('Cache-Control', 'public, max-age=3600'); // 1 hora
  }
  // No cache para dados dinâmicos
  else if (req.url.includes('/api/') || req.url.includes('/data/')) {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  }

  next();
});

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

const upload = multer({ 
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Permitir apenas imagens
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Apenas arquivos de imagem são permitidos!'));
    }
  }
});

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
    
    // Limitar tamanho do JSON (10MB)
    const jsonData = JSON.stringify(req.body, null, 2);
    if (jsonData.length > 10 * 1024 * 1024) {
      return res.status(400).json({ ok: false, error: 'Dados muito grandes' });
    }
    
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

// ============================================================
// INICIAR SERVIDOR
// ============================================================

// Middleware para log de requests aos dados
app.use('/data', (req, res, next) => {
  console.log(`📊 Request to /data${req.path}`);
  next();
});

app.use(express.static('.'));

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
