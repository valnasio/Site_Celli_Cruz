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

  function resolveSupabaseAssetUrl(value) {
    if (!value || typeof value !== 'string') return '';
    if (value.startsWith('data:') || isAbsoluteUrl(value)) return value;
    return getRelativeAssetUrl(value);
  }

  let cachedData = null;

  async function fetchSiteData(options = {}) {
    if (cachedData && !options.force) return cachedData;
    
    const response = await fetch('/api/site-data');
    if (!response.ok) throw new Error('Falha ao carregar dados do servidor.');
    
    const data = await response.json();
    cachedData = data;
    return data;
  }

  async function uploadSupabaseFile(file, folder) {
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

  // Exportar funcoes globais para compatibilidade
  window.fetchSiteData = fetchSiteData;
  window.resolveSupabaseAssetUrl = resolveSupabaseAssetUrl;
  window.uploadSupabaseFile = uploadSupabaseFile;
  
  // Mock do client para evitar erros em scripts que ainda o chamam
  window.supabaseClient = {
    auth: {
        getSession: () => Promise.resolve({ data: { session: JSON.parse(localStorage.getItem('admin_session')) }, error: null }),
        getUser: () => Promise.resolve({ data: { user: JSON.parse(localStorage.getItem('admin_session'))?.user }, error: null }),
        signOut: () => {
            localStorage.removeItem('admin_session');
            return Promise.resolve({ error: null });
        },
        onAuthStateChange: (cb) => {
            // Mock simples
            return { data: { subscription: { unsubscribe: () => {} } } };
        }
    },
    from: () => ({
      select: () => ({
        order: () => Promise.resolve({ data: [], error: null }),
        limit: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) })
      }),
      upsert: () => Promise.resolve({ error: new Error('Use a API /api/save para salvar dados em modo JSON.') }),
      delete: () => Promise.resolve({ error: new Error('Use a API /api/save para salvar dados em modo JSON.') })
    })
  };
})();
