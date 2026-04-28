(function () {
  'use strict';

  function getAdminPath(page) {
    return window.location.pathname.includes('/pages/') ? page : `pages/${page}`;
  }

  function getUserLabel(user) {
    return user?.name || user?.username || 'Administrador';
  }

  async function loginAdmin(username, password) {
    const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });

    const result = await response.json();
    if (!result.ok) throw new Error(result.error || 'Falha ao autenticar.');

    localStorage.setItem('admin_session', JSON.stringify({ user: result.user }));
    return result;
  }

  async function isAdminAuthenticated() {
    return Boolean(localStorage.getItem('admin_session'));
  }

  async function getAuthenticatedAdminUser() {
    const session = localStorage.getItem('admin_session');
    if (!session) return null;
    return JSON.parse(session).user;
  }

  async function logoutAdmin() {
    localStorage.removeItem('admin_session');
    window.location.href = getAdminPath('login.html');
  }

  async function requireAdminLogin() {
    const authenticated = await isAdminAuthenticated();
    if (!authenticated) {
      window.location.href = getAdminPath('login.html');
      return false;
    }
    return true;
  }

  async function initLoginForm() {
    const form = document.getElementById('login-form');
    const errorEl = document.getElementById('login-error');
    if (!form || !errorEl) return;

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      errorEl.textContent = '';

      const button = form.querySelector('button[type="submit"]');
      const originalText = button?.textContent || '';

      if (button) {
        button.disabled = true;
        button.textContent = 'Entrando...';
      }

      try {
        const formData = new FormData(form);
        const username = String(formData.get('username') || '');
        const password = String(formData.get('password') || '');
        
        console.log('Tentando login com:', username);
        const result = await loginAdmin(username, password);
        console.log('Login bem-sucedido:', result);
        
        window.location.href = 'admin.html';
      } catch (error) {
        errorEl.textContent = error.message || 'Falha ao autenticar.';
      } finally {
        if (button) {
          button.disabled = false;
          button.textContent = originalText;
        }
      }
    });
  }

  document.addEventListener('DOMContentLoaded', async () => {
    const isLoginPage = window.location.pathname.endsWith('/login.html');
    const isAdminPage = window.location.pathname.endsWith('/admin.html');

    if (isLoginPage) {
      if (await isAdminAuthenticated()) {
        window.location.href = 'admin.html';
        return;
      }
      initLoginForm();
      return;
    }

    if (isAdminPage) {
      if (!await requireAdminLogin()) return;
      const user = await getAuthenticatedAdminUser();
      const userLabel = document.getElementById('admin-user-name');
      if (userLabel) userLabel.textContent = getUserLabel(user);
    }
  });

  window.loginAdmin = loginAdmin;
  window.isAdminAuthenticated = isAdminAuthenticated;
  window.getAuthenticatedAdminUser = getAuthenticatedAdminUser;
  window.requireAdminLogin = requireAdminLogin;
  window.logoutAdmin = logoutAdmin;
  
  // Mock para compatibilidade
  window.adminApiRequest = async (url, options = {}) => {
    const fetchOptions = { ...options };
    if (fetchOptions.body && typeof fetchOptions.body === 'object') {
      fetchOptions.headers = { ...fetchOptions.headers, 'Content-Type': 'application/json' };
      fetchOptions.body = JSON.stringify(fetchOptions.body);
    }
    const response = await fetch(url, fetchOptions);
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Erro na requisição.');
    return result;
  };
})();
