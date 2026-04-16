const ADMIN_LOGIN_KEY = 'cellicruzAdminSession';

function getBasePath() {
  return window.location.pathname.includes('/pages/') ? '../' : './';
}

function getAdminDataPath() {
  return getBasePath() + 'data/imoveis.json?t=' + Date.now();
}

async function fetchAdminData() {
  const res = await fetch(getAdminDataPath());
  if (!res.ok) throw new Error('Não foi possível carregar dados de admin.');
  return await res.json();
}

async function hashPassword(password, salt) {
  const encoder = new TextEncoder();
  const data = encoder.encode(salt + password);

  if (!window.crypto || !window.crypto.subtle) {
    return simpleHash(salt + password);
  }

  try {
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(byte => byte.toString(16).padStart(2, '0')).join('');
  } catch (err) {
    return simpleHash(salt + password);
  }
}

function simpleHash(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}

function createSessionToken() {
  const array = new Uint8Array(32);
  window.crypto.getRandomValues(array);
  return Array.from(array).map(byte => byte.toString(16).padStart(2, '0')).join('');
}

function saveAdminSession(username) {
  const session = {
    username,
    token: createSessionToken(),
    expires: Date.now() + 60 * 60 * 1000
  };
  sessionStorage.setItem(ADMIN_LOGIN_KEY, JSON.stringify(session));
}

function clearAdminSession() {
  sessionStorage.removeItem(ADMIN_LOGIN_KEY);
}

function getAdminSession() {
  try {
    const raw = sessionStorage.getItem(ADMIN_LOGIN_KEY);
    if (!raw) return null;

    let session = null;
    try {
      session = JSON.parse(raw);
    } catch (parseError) {
      console.warn('Admin session inválida, removendo valor antigo.', parseError);
      sessionStorage.removeItem(ADMIN_LOGIN_KEY);
      return null;
    }

    if (!session || !session.username || !session.token || !session.expires) {
      return null;
    }
    if (Date.now() > session.expires) {
      clearAdminSession();
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

async function verifyAdminCredentials(username, password) {
  const data = await fetchAdminData();
  const users = data.adminUsers || [];
  const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());
  if (!user) {
    throw new Error('Usuário ou senha inválidos.');
  }

  const hash = await hashPassword(password, user.salt || '');
  if (hash !== user.passwordHash) {
    throw new Error('Usuário ou senha inválidos.');
  }

  return user;
}

async function loginAdmin(username, password) {
  if (!username || !password) {
    throw new Error('Usuário e senha são obrigatórios.');
  }

  const user = await verifyAdminCredentials(username, password);
  saveAdminSession(user.username);
  return { ok: true, username: user.username };
}

function isAdminAuthenticated() {
  return !!getAdminSession();
}

function logoutAdmin() {
  clearAdminSession();
  const redirectPath = window.location.pathname.includes('/pages/') ? 'login.html' : 'pages/login.html';
  window.location.href = redirectPath;
}

async function initLoginForm() {
  const form = document.getElementById('login-form');
  const errorEl = document.getElementById('login-error');
  if (!form || !errorEl) return;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    errorEl.textContent = '';
    const username = form.username.value.trim();
    const password = form.password.value;

    try {
      await loginAdmin(username, password);
      window.location.href = 'admin.html';
    } catch (err) {
      errorEl.textContent = err.message;
    }
  });
}

function requireAdminLogin() {
  if (!isAdminAuthenticated()) {
    const redirectPath = window.location.pathname.includes('/pages/') ? 'login.html' : 'pages/login.html';
    window.location.href = redirectPath;
    return false;
  }
  return true;
}

function getAuthenticatedAdminUsername() {
  const session = getAdminSession();
  return session ? session.username : null;
}

if (window.location.pathname.endsWith('/login.html')) {
  document.addEventListener('DOMContentLoaded', async () => {
    if (isAdminAuthenticated()) {
      window.location.href = 'admin.html';
      return;
    }
    initLoginForm();
  });
}

if (window.location.pathname.endsWith('/admin.html')) {
  document.addEventListener('DOMContentLoaded', async () => {
    if (!requireAdminLogin()) return;
    const username = getAuthenticatedAdminUsername();
    const userLabel = document.getElementById('admin-user-name');
    if (userLabel && username) userLabel.textContent = username;
  });
}
