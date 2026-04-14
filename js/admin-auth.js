const ADMIN_DATA_PATH = window.location.pathname.includes('/pages/') ? '../data/imoveis.json' : './data/imoveis.json';
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

function generateSalt(length = 16) {
  const array = new Uint8Array(length);
  window.crypto.getRandomValues(array);
  return Array.from(array).map(byte => byte.toString(16).padStart(2, '0')).join('').slice(0, length);
}

async function hashPassword(password, salt) {
  const encoder = new TextEncoder();
  const data = encoder.encode(salt + password);
  
  // ✅ Verifica se crypto.subtle está disponível
  if (!window.crypto || !window.crypto.subtle) {
    console.warn('crypto.subtle não disponível, usando fallback simples');
    // Fallback: hash simples (menos seguro mas funciona em qualquer ambiente)
    return simpleHash(salt + password);
  }
  
  try {
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(byte => byte.toString(16).padStart(2, '0')).join('');
  } catch (err) {
    console.warn('Erro ao usar crypto.subtle:', err);
    // Fallback se houver erro
    return simpleHash(salt + password);
  }
}

// ✅ Hash simples de fallback (não é tão seguro mas funciona em qualquer lugar)
function simpleHash(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
    hash = hash & hash; // Converter para 32-bit integer
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
    const session = JSON.parse(raw);
    if (!session.username || !session.token || !session.expires) return null;
    if (Date.now() > session.expires) {
      clearAdminSession();
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

function isAdminAuthenticated() {
  return !!getAdminSession();
}

function logoutAdmin() {
  clearAdminSession();
  const redirectPath = window.location.pathname.includes('/pages/') ? 'login.html' : 'pages/login.html';
  window.location.href = redirectPath;
}

async function loginAdmin(username, password) {
  if (!username || !password) {
    throw new Error('Usuário e senha são obrigatórios.');
  }

  const data = await fetchAdminData();
  const users = data.adminUsers || [];
  const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());
  if (!user) {
    throw new Error('Usuário ou senha inválidos.');
  }

  const hash = await hashPassword(password, user.salt);
  if (hash !== user.passwordHash) {
    throw new Error('Usuário ou senha inválidos.');
  }

  saveAdminSession(user.username);
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
  document.addEventListener('DOMContentLoaded', () => {
    if (isAdminAuthenticated()) {
      window.location.href = 'admin.html';
      return;
    }
    initLoginForm();
  });
}

if (window.location.pathname.endsWith('/admin.html')) {
  document.addEventListener('DOMContentLoaded', () => {
    if (!requireAdminLogin()) return;
    const username = getAuthenticatedAdminUsername();
    const userLabel = document.getElementById('admin-user-name');
    if (userLabel && username) userLabel.textContent = username;
  });
}
