const express = require('express');
const path = require('path');
const compression = require('compression');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 8000;

function requiredEnv(name) {
  return process.env[name] || '';
}

const SUPABASE_URL = requiredEnv('SUPABASE_URL');
const SUPABASE_ANON_KEY = requiredEnv('SUPABASE_ANON_KEY');
const SUPABASE_SERVICE_ROLE_KEY = requiredEnv('SUPABASE_SERVICE_ROLE_KEY');
const STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'uploads';

function getSupabaseOrigin() {
  if (!SUPABASE_URL) return null;
  try {
    return new URL(SUPABASE_URL).origin;
  } catch {
    return null;
  }
}

function getConnectSrc() {
  const connectSrc = ["'self'", 'https://formspree.io'];
  const supabaseOrigin = getSupabaseOrigin();
  if (supabaseOrigin) {
    connectSrc.push(supabaseOrigin);
    connectSrc.push(supabaseOrigin.replace(/^https:/i, 'wss:'));
  }
  return connectSrc;
}

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com', 'https://cdnjs.cloudflare.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com', 'https://cdnjs.cloudflare.com'],
      imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
      scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net', 'https://cdnjs.cloudflare.com'],
      scriptSrcElem: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net', 'https://cdnjs.cloudflare.com'],
      connectSrc: getConnectSrc(),
      frameSrc: ["'self'", 'https://www.google.com'],
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

app.use(compression({
  level: 6,
  threshold: 1024,
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
}));

app.use(express.json({ limit: '5mb' }));

app.use((req, res, next) => {
  if (req.url.match(/\.(css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot|webp)$/i)) {
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  } else if (req.url.match(/\.html$/i)) {
    res.setHeader('Cache-Control', 'public, max-age=3600');
  } else if (req.url.startsWith('/api/')) {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  }
  next();
});

function hasSupabaseRuntimeConfig() {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

function hasSupabaseAdminConfig() {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY && SUPABASE_SERVICE_ROLE_KEY);
}

function supabaseHeaders(token, useServiceRole = false) {
  const headers = {
    apikey: useServiceRole ? SUPABASE_SERVICE_ROLE_KEY : SUPABASE_ANON_KEY,
    Authorization: `Bearer ${useServiceRole ? SUPABASE_SERVICE_ROLE_KEY : token}`,
    'Content-Type': 'application/json',
  };
  return headers;
}

async function verifySupabaseUser(req) {
  if (!hasSupabaseRuntimeConfig()) {
    const error = new Error('Supabase runtime nao configurado no servidor.');
    error.status = 500;
    throw error;
  }

  const authorization = req.headers.authorization || '';
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    const error = new Error('Token JWT ausente.');
    error.status = 401;
    throw error;
  }

  const token = match[1];
  const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: supabaseHeaders(token, false),
  });

  if (!response.ok) {
    const payload = await response.text();
    const error = new Error(payload || 'Sessao invalida.');
    error.status = response.status || 401;
    throw error;
  }

  const user = await response.json();
  return { token, user };
}

async function supabaseAdminRequest(method, route, body) {
  if (!hasSupabaseAdminConfig()) {
    const error = new Error('SUPABASE_SERVICE_ROLE_KEY nao configurada.');
    error.status = 500;
    throw error;
  }

  const response = await fetch(`${SUPABASE_URL}${route}`, {
    method,
    headers: supabaseHeaders('', true),
    body: body ? JSON.stringify(body) : undefined,
  });

  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json')
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message = typeof payload === 'string'
      ? payload
      : payload?.msg || payload?.message || payload?.error_description || payload?.error || 'Erro na API do Supabase.';
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  return payload;
}

function mapAuthUser(user) {
  return {
    id: user.id,
    email: user.email || '',
    name: user.user_metadata?.name || '',
    createdAt: user.created_at || null,
    lastSignInAt: user.last_sign_in_at || null,
    emailConfirmedAt: user.email_confirmed_at || null,
  };
}

app.get('/api/runtime-config.js', (req, res) => {
  res.type('application/javascript');

  if (!hasSupabaseRuntimeConfig()) {
    res.status(500).send(
      "window.__SUPABASE_CONFIG_ERROR__ = 'SUPABASE_URL e SUPABASE_ANON_KEY precisam estar definidos no servidor.';"
    );
    return;
  }

  res.send(
    `window.__SUPABASE_CONFIG__ = ${JSON.stringify({
      url: SUPABASE_URL,
      anonKey: SUPABASE_ANON_KEY,
      storageBucket: STORAGE_BUCKET,
    })};`
  );
});

app.get('/api/admin/users', async (req, res) => {
  try {
    await verifySupabaseUser(req);
    const payload = await supabaseAdminRequest('GET', '/auth/v1/admin/users?page=1&per_page=1000');
    const users = Array.isArray(payload?.users) ? payload.users : [];
    users.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    res.json({ ok: true, users: users.map(mapAuthUser) });
  } catch (error) {
    res.status(error.status || 500).json({ ok: false, error: error.message });
  }
});

app.post('/api/admin/users', async (req, res) => {
  try {
    await verifySupabaseUser(req);

    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    const name = String(req.body?.name || '').trim();

    if (!email || !password) {
      return res.status(400).json({ ok: false, error: 'E-mail e senha sao obrigatorios.' });
    }

    const payload = await supabaseAdminRequest('POST', '/auth/v1/admin/users', {
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name,
      },
    });

    res.status(201).json({ ok: true, user: mapAuthUser(payload.user || payload) });
  } catch (error) {
    res.status(error.status || 500).json({ ok: false, error: error.message });
  }
});

app.patch('/api/admin/users/:id', async (req, res) => {
  try {
    await verifySupabaseUser(req);

    const update = {};
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    const name = String(req.body?.name || '').trim();

    if (email) update.email = email;
    if (password) update.password = password;
    update.user_metadata = { name };

    const payload = await supabaseAdminRequest('PUT', `/auth/v1/admin/users/${req.params.id}`, update);
    res.json({ ok: true, user: mapAuthUser(payload.user || payload) });
  } catch (error) {
    res.status(error.status || 500).json({ ok: false, error: error.message });
  }
});

app.delete('/api/admin/users/:id', async (req, res) => {
  try {
    const { user } = await verifySupabaseUser(req);
    if (user?.id === req.params.id) {
      return res.status(400).json({ ok: false, error: 'Nao e permitido excluir a propria conta logada.' });
    }

    await supabaseAdminRequest('DELETE', `/auth/v1/admin/users/${req.params.id}`);
    res.json({ ok: true });
  } catch (error) {
    res.status(error.status || 500).json({ ok: false, error: error.message });
  }
});

app.all(['/api/save', '/api/upload'], (req, res) => {
  res.status(410).json({
    ok: false,
    error: 'Os endpoints legados foram desativados. Use Supabase Auth, Database e Storage.',
  });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.use(express.static(__dirname));

app.listen(PORT, () => {
  console.log('');
  console.log('Celli Cruz server running');
  console.log(`Local:  http://localhost:${PORT}`);
  console.log(`Admin:  http://localhost:${PORT}/pages/admin.html`);
  console.log(`Config: ${hasSupabaseRuntimeConfig() ? 'Supabase runtime OK' : 'Supabase runtime missing'}`);
  console.log('');
});

process.on('unhandledRejection', (error) => {
  console.error('[unhandledRejection]', error);
});
