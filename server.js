require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const compression = require('compression');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 8000;
const DATA_PATH = path.join(__dirname, 'data', 'imoveis.json');

// Garantir que as pastas existam
const UPLOADS_DIR = path.join(__dirname, 'assets', 'uploads');
const DATA_DIR = path.join(__dirname, 'data');

[UPLOADS_DIR, DATA_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Configuração do Multer para uploads locais
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

function readData() {
  try {
    if (!fs.existsSync(DATA_PATH)) return {};
    return JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
  } catch (error) {
    console.error('Erro ao ler imoveis.json:', error);
    return {};
  }
}

function saveData(data) {
  try {
    fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Erro ao salvar imoveis.json:', error);
    return false;
  }
}

function hashPassword(password, salt) {
  return crypto.createHash('sha256').update(password + salt).digest('hex');
}

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      "img-src": ["'self'", "data:", "blob:", "https:", "https://images.unsplash.com", "https://www.eztec.com.br"],
      "script-src": ["'self'", "'unsafe-inline'", "https://maps.googleapis.com", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com"],
      "script-src-attr": ["'unsafe-inline'"],
      "connect-src": ["'self'", "https://formspree.io"],
      "frame-src": ["'self'", "https://www.google.com"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
}));

app.use(compression());
app.use(express.json({ limit: '10mb' }));

app.use((req, res, next) => {
  if (req.url.match(/\.(css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot|webp)$/i)) {
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  } else if (req.url.startsWith('/api/')) {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  }
  next();
});

function mapAuthUser(user) {
  return {
    id: user.id,
    username: user.username,
    name: user.name
  };
}

app.get('/api/site-data', (req, res) => {
  const data = readData();
  res.json(data);
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  console.log(`[login] Tentativa para: ${username}`);
  const data = readData();
  const user = (data.adminUsers || []).find(u => u.username === username);

  if (user) {
    const computedHash = hashPassword(password, user.salt);
    console.log(`[login] User encontrado. Hash esperado: ${user.passwordHash}, Recebido: ${computedHash}`);
    
    if (computedHash === user.passwordHash) {
      return res.json({ ok: true, user: { id: user.id, username: user.username, name: user.name } });
    }
  }

  console.log(`[login] Falha na autenticacao para: ${username}`);
  res.status(401).json({ ok: false, error: 'Credenciais invalidas.' });
});

app.post('/api/save', (req, res) => {
  // Nota: Em produção, verificar token/auth aqui
  if (saveData(req.body)) {
    res.json({ ok: true });
  } else {
    res.status(500).json({ ok: false, error: 'Erro ao salvar arquivo JSON.' });
  }
});

app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ ok: false, error: 'Nenhum arquivo enviado.' });
  }
  const relativePath = `assets/uploads/${req.file.filename}`;
  res.json({ ok: true, url: relativePath });
});

// User Management API
app.get('/api/admin/users', (req, res) => {
    const data = readData();
    res.json(data.adminUsers || []);
});

app.post('/api/admin/users', (req, res) => {
    const { name, username, email, password } = req.body;
    const data = readData();
    const salt = crypto.randomBytes(16).toString('hex');
    const passwordHash = hashPassword(password, salt);
    
    const newUser = {
        id: Date.now(),
        name,
        username: username || email,
        email,
        passwordHash,
        salt
    };
    
    data.adminUsers = data.adminUsers || [];
    data.adminUsers.push(newUser);
    saveData(data);
    res.json({ ok: true, user: mapAuthUser(newUser) });
});

app.patch('/api/admin/users/:id', (req, res) => {
    const { id } = req.params;
    const { name, username, email, password } = req.body;
    const data = readData();
    const index = data.adminUsers.findIndex(u => String(u.id) === String(id));
    
    if (index === -1) return res.status(404).json({ ok: false, error: 'User not found.' });
    
    if (name) data.adminUsers[index].name = name;
    if (username) data.adminUsers[index].username = username;
    if (email) data.adminUsers[index].email = email;
    if (password) {
        const salt = crypto.randomBytes(16).toString('hex');
        data.adminUsers[index].salt = salt;
        data.adminUsers[index].passwordHash = hashPassword(password, salt);
    }
    
    saveData(data);
    res.json({ ok: true });
});

app.delete('/api/admin/users/:id', (req, res) => {
    const { id } = req.params;
    const data = readData();
    data.adminUsers = (data.adminUsers || []).filter(u => String(u.id) === String(id));
    saveData(data);
    res.json({ ok: true });
});

app.get('/api/runtime-config.js', (req, res) => {
  res.type('application/javascript');
  res.send('window.__USE_JSON_DATA__ = true;');
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.use(express.static(__dirname));

app.listen(PORT, () => {
  console.log('');
  console.log('Celli Cruz server running (JSON Mode)');
  console.log(`Local:  http://localhost:${PORT}`);
  console.log(`Admin:  http://localhost:${PORT}/pages/admin.html`);
  console.log('');
});

process.on('unhandledRejection', (error) => {
  console.error('[unhandledRejection]', error);
});
