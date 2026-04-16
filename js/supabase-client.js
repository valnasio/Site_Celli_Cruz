(function () {
  'use strict';

  const runtimeConfig = window.__SUPABASE_CONFIG__;
  const runtimeError = window.__SUPABASE_CONFIG_ERROR__;

  if (runtimeError) {
    console.error('[supabase-client]', runtimeError);
    return;
  }

  if (!runtimeConfig || !runtimeConfig.url || !runtimeConfig.anonKey) {
    console.error('[supabase-client] Configuracao de runtime do Supabase ausente.');
    return;
  }

  if (!window.supabase || typeof window.supabase.createClient !== 'function') {
    console.error('[supabase-client] Biblioteca @supabase/supabase-js nao foi carregada.');
    return;
  }

  const STORAGE_BUCKET = runtimeConfig.storageBucket || 'uploads';
  const client = window.supabase.createClient(runtimeConfig.url, runtimeConfig.anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  function isAbsoluteUrl(value) {
    return typeof value === 'string' && /^(https?:)?\/\//i.test(value);
  }

  function normalizeStorageKey(value) {
    if (!value || typeof value !== 'string') return value;

    if (value.startsWith('data:')) return value;

    const storageMatch = value.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)$/i);
    if (storageMatch) {
      return storageMatch[1];
    }

    const uploadsMatch = value.match(/assets\/uploads\/(.+)$/i);
    if (uploadsMatch) {
      return uploadsMatch[1].replace(/\\/g, '/');
    }

    const hostUploadMatch = value.match(/https?:\/\/[^/]+\/assets\/uploads\/(.+)$/i);
    if (hostUploadMatch) {
      return hostUploadMatch[1].replace(/\\/g, '/');
    }

    return value.replace(/\\/g, '/');
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

    const normalized = normalizeStorageKey(value);
    if (normalized && !normalized.startsWith('assets/')) {
      const { data } = client.storage.from(STORAGE_BUCKET).getPublicUrl(normalized);
      return data?.publicUrl || value;
    }

    return getRelativeAssetUrl(normalized);
  }

  async function querySingle(table) {
    const { data, error } = await client.from(table).select('*').limit(1).maybeSingle();
    if (error) throw error;
    return data;
  }

  async function queryMany(table, orderColumn) {
    let query = client.from(table).select('*').order(orderColumn, { ascending: true });
    if (orderColumn !== 'id') {
      query = query.order('id', { ascending: true });
    }
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  function mapConfig(row) {
    return {
      nomeEmpresa: row?.nome_empresa || '',
      telefone: row?.telefone || '',
      whatsapp: row?.whatsapp || '',
      whatsappVendas: row?.whatsapp_vendas || '',
      whatsappAtendimento: row?.whatsapp_atendimento || '',
      email: row?.email || '',
      endereco: row?.endereco || '',
      heroChamada: row?.hero_chamada || '',
      heroSubtitulo: row?.hero_subtitulo || '',
      googleMapsEmbed: row?.google_maps_embed || '',
    };
  }

  function mapAbout(row, missionCarousel) {
    return {
      aboutTitle: row?.about_title || '',
      aboutSubtitle: row?.about_subtitle || '',
      aboutDescription: row?.about_description || '',
      aboutSummary: row?.about_summary || '',
      aboutMissionTitle: row?.about_mission_title || '',
      aboutMissionText: row?.about_mission_text || '',
      missionGallery: row?.mission_gallery || [],
      missionCarousel,
    };
  }

  function mapCarousel(items) {
    return items.map((item) => ({
      id: item.id,
      title: item.title || '',
      subtitle: item.subtitle || '',
      imageDesktop: item.image_desktop || item.image || '',
      image: item.image || item.image_desktop || '',
      imageSource: item.image_source || '',
      imageMobile: item.image_mobile || '',
      imageMobileSource: item.image_mobile_source || '',
      link: item.link || '',
    }));
  }

  function mapImoveis(imoveis, plantas, comodos) {
    const plantasByImovel = plantas.reduce((acc, item) => {
      const list = acc[item.imovel_id] || [];
      list.push({
        id: item.id,
        nome: item.nome || '',
        descricao: item.descricao || '',
        unidades: item.unidades,
      });
      acc[item.imovel_id] = list;
      return acc;
    }, {});

    const comodosByImovel = comodos.reduce((acc, item) => {
      const list = acc[item.imovel_id] || [];
      list.push({
        id: item.id,
        nome: item.nome || '',
        fotos: item.fotos || [],
      });
      acc[item.imovel_id] = list;
      return acc;
    }, {});

    return imoveis.map((item) => ({
      id: item.id,
      destaque: Boolean(item.destaque),
      nome: item.nome || '',
      bairro: item.bairro || '',
      cidade: item.cidade || '',
      quartos: item.quartos || 0,
      metragem: item.metragem || '',
      descricao: item.descricao || '',
      tag: item.tag || '',
      imagem: item.imagem || '',
      imagemSource: item.imagem_source || '',
      imagemGaleria: item.imagem_galeria || [],
      diferenciais: item.diferenciais || [],
      localizacao: item.localizacao || '',
      mapsLink: item.maps_link || '',
      status: item.status || '',
      plantas: plantasByImovel[item.id] || [],
      comodos: comodosByImovel[item.id] || [],
    }));
  }

  let siteDataPromise = null;

  async function fetchSiteData(options = {}) {
    if (siteDataPromise && !options.force) {
      return siteDataPromise;
    }

    siteDataPromise = Promise.all([
      querySingle('site_config'),
      querySingle('site_about'),
      queryMany('about_mission_carousel', 'sort_order'),
      queryMany('carousel_items', 'sort_order'),
      queryMany('whatsapp_options', 'id'),
      queryMany('imoveis', 'id'),
      queryMany('imovel_plantas', 'sort_order'),
      queryMany('imovel_comodos', 'id'),
    ]).then(([configRow, aboutRow, missionCarouselRows, carouselRows, whatsappRows, imoveisRows, plantasRows, comodosRows]) => ({
      config: mapConfig(configRow),
      about: mapAbout(aboutRow, mapCarousel(missionCarouselRows)),
      carousel: mapCarousel(carouselRows),
      whatsappOptions: (whatsappRows || []).map((item) => ({
        id: item.id,
        title: item.title || '',
        description: item.description || '',
        whatsapp: item.whatsapp || '',
      })),
      imoveis: mapImoveis(imoveisRows || [], plantasRows || [], comodosRows || []),
      adminUsers: [],
    })).catch((error) => {
      siteDataPromise = null;
      throw error;
    }).finally(() => {
      if (options.force) siteDataPromise = null;
    });

    return siteDataPromise;
  }

  async function uploadSupabaseFile(file, folder) {
    const safeFolder = (folder || 'admin').replace(/[^a-z0-9/_-]/gi, '-');
    const cleanName = file.name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9._-]/g, '-')
      .replace(/-+/g, '-');
    const objectPath = `${safeFolder}/${Date.now()}-${cleanName}`;

    const { error } = await client.storage.from(STORAGE_BUCKET).upload(objectPath, file, {
      cacheControl: '3600',
      upsert: false,
    });

    if (error) throw error;
    return objectPath;
  }

  async function getAccessToken() {
    const { data, error } = await client.auth.getSession();
    if (error) throw error;
    return data?.session?.access_token || '';
  }

  async function adminApiRequest(path, options = {}) {
    const accessToken = await getAccessToken();
    const response = await fetch(path, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
        ...(options.headers || {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    const payload = await response.json();
    if (!response.ok || payload?.ok === false) {
      throw new Error(payload?.error || 'Falha na API administrativa.');
    }
    return payload;
  }

  window.supabaseClient = client;
  window.fetchSiteData = fetchSiteData;
  window.normalizeStorageKey = normalizeStorageKey;
  window.resolveSupabaseAssetUrl = resolveSupabaseAssetUrl;
  window.uploadSupabaseFile = uploadSupabaseFile;
  window.adminApiRequest = adminApiRequest;
})();
