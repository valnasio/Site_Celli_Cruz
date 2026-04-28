(function () {
  'use strict';

  function isAbsoluteUrl(value) {
    return typeof value === 'string' && /^(https?:)?\/\//i.test(value);
  }

  function getRelativeAssetUrl(value) {
    if (!value || typeof value !== 'string') return '';
    if (isAbsoluteUrl(value) || value.startsWith('data:') || value.startsWith('/')) return value;
    const inPages = window.location.pathname.includes('/pages/');
    return `${inPages ? '../' : './'}${value.replace(/^\.\//, '')}`;
  }

  /**
   * Resolves an asset URL for display.
   */
  function resolveAssetUrl(value) {
    if (!value || typeof value !== 'string') return '';
    if (value.startsWith('data:') || isAbsoluteUrl(value)) return value;
    return getRelativeAssetUrl(value);
  }

  let cachedData = null;

  /**
   * Fetches the site data from the local JSON API.
   */
  async function fetchSiteData(options = {}) {
    if (cachedData && !options.force) return cachedData;
    
    const response = await fetch('/api/site-data');
    if (!response.ok) throw new Error('Falha ao carregar dados do servidor.');
    
    const data = await response.json();
    cachedData = data;
    return data;
  }

  /**
   * Uploads a file to the local server.
   */
  async function uploadFile(file, folder) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);

    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData
    });

    const result = await response.json();
    if (!result.ok) throw new Error(result.error || 'Falha no upload.');
    return result.url;
  }

  // Export global functions
  window.fetchSiteData = fetchSiteData;
  window.resolveAssetUrl = resolveAssetUrl;
  window.resolveSupabaseAssetUrl = resolveAssetUrl; // Compatibility alias
  window.uploadFile = uploadFile;
  window.uploadSupabaseFile = uploadFile; // Compatibility alias
  
  // Mock client for compatibility with older scripts
  window.supabaseClient = {
    auth: {
        getSession: () => Promise.resolve({ data: { session: JSON.parse(localStorage.getItem('admin_session')) }, error: null }),
        getUser: () => Promise.resolve({ data: { user: JSON.parse(localStorage.getItem('admin_session'))?.user }, error: null }),
        signOut: () => {
            localStorage.removeItem('admin_session');
            return Promise.resolve({ error: null });
        },
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } })
    },
    from: () => ({
      select: () => ({
        order: () => Promise.resolve({ data: [], error: null }),
        limit: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) })
      }),
      upsert: () => Promise.resolve({ error: new Error('Use a API /api/save para salvar dados.') }),
      delete: () => Promise.resolve({ error: new Error('Use a API /api/save para excluir dados.') })
    })
  };
})();
