(function () {
  'use strict';

  function getAdminPath(page) {
    return window.location.pathname.includes('/pages/') ? page : `pages/${page}`;
  }

  function getClient() {
    if (!window.supabaseClient) {
      throw new Error('Supabase client nao inicializado.');
    }
    return window.supabaseClient;
  }

  function getUserLabel(user) {
    return user?.user_metadata?.name || user?.email || 'Administrador';
  }

  async function loginAdmin(email, password) {
    const client = getClient();
    const credentials = {
      email: String(email || '').trim().toLowerCase(),
      password: String(password || ''),
    };

    if (!credentials.email || !credentials.password) {
      throw new Error('Informe e-mail e senha.');
    }

    const { data, error } = await client.auth.signInWithPassword(credentials);
    if (error) throw error;
    return data;
  }

  async function getAdminSession() {
    const client = getClient();
    const { data, error } = await client.auth.getSession();
    if (error) throw error;
    return data?.session || null;
  }

  async function isAdminAuthenticated() {
    return Boolean(await getAdminSession());
  }

  async function getAuthenticatedAdminUser() {
    const client = getClient();
    const { data, error } = await client.auth.getUser();
    if (error) throw error;
    return data?.user || null;
  }

  async function logoutAdmin() {
    const client = getClient();
    await client.auth.signOut();
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
        const email = String(formData.get('email') || '');
        const password = String(formData.get('password') || '');
        await loginAdmin(email, password);
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
    const client = window.supabaseClient;

    if (!client) {
      console.error('Supabase client indisponivel nas paginas administrativas.');
      return;
    }

    client.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT' && isAdminPage) {
        window.location.href = 'login.html';
      }
    });

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
  window.getAdminSession = getAdminSession;
  window.getAuthenticatedAdminUser = getAuthenticatedAdminUser;
  window.requireAdminLogin = requireAdminLogin;
  window.logoutAdmin = logoutAdmin;
})();
