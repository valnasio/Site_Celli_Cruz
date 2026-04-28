require('dotenv').config();
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'uploads';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env');
  process.exit(1);
}

const ROOT_DIR = path.resolve(__dirname, '..');
const JSON_PATH = path.join(ROOT_DIR, 'data', 'imoveis.json');
const UPLOADS_DIR = path.join(ROOT_DIR, 'assets', 'uploads');

const MIME_BY_EXT = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
};

function log(step, message) {
  console.log(`[${step}] ${message}`);
}

function getMimeType(filePath) {
  return MIME_BY_EXT[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
}

async function restRequest(method, route, body, extraHeaders = {}) {
  const response = await fetch(`${SUPABASE_URL}${route}`, {
    method,
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      ...extraHeaders,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json')
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    throw new Error(typeof payload === 'string'
      ? payload
      : payload?.message || payload?.error_description || payload?.error || 'Erro na API REST do Supabase.');
  }

  return payload;
}

async function uploadFileToStorage(localPath, objectPath) {
  const fileBuffer = fs.readFileSync(localPath);
  const response = await fetch(`${SUPABASE_URL}/storage/v1/object/${STORAGE_BUCKET}/${objectPath}`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'x-upsert': 'true',
      'Content-Type': getMimeType(localPath),
    },
    body: fileBuffer,
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(text || `Falha ao enviar ${objectPath} para o Storage.`);
  }
}

function normalizeStorageObjectPath(value) {
  if (!value || typeof value !== 'string') return value;
  if (/^https?:\/\//i.test(value) && !/assets\/uploads\//i.test(value)) return value;
  if (value.startsWith('data:')) return value;

  const storageMatch = value.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)$/i);
  if (storageMatch) {
    return storageMatch[1];
  }

  const uploadsMatch = value.match(/assets\/uploads\/(.+)$/i);
  if (uploadsMatch) {
    return uploadsMatch[1].replace(/\\/g, '/');
  }

  return value;
}

async function migrateAssetReference(value, uploadCache) {
  const normalized = normalizeStorageObjectPath(value);
  if (!normalized || typeof normalized !== 'string') return normalized;

  if (/^https?:\/\//i.test(normalized) || normalized.startsWith('data:')) {
    return normalized;
  }

  if (!/^[^?]+\.[a-z0-9]+$/i.test(path.basename(normalized))) {
    return normalized;
  }

  const localPath = path.join(UPLOADS_DIR, path.basename(normalized));
  if (!fs.existsSync(localPath)) {
    log('warn', `Arquivo local nao encontrado para migracao: ${value}`);
    return normalized;
  }

  const objectPath = `legacy/${path.basename(normalized)}`;
  if (!uploadCache.has(objectPath)) {
    await uploadFileToStorage(localPath, objectPath);
    uploadCache.add(objectPath);
    log('storage', `Arquivo enviado: ${objectPath}`);
  }

  return objectPath;
}

async function transformSnapshot(raw) {
  const uploadCache = new Set();

  const config = raw.config || {};
  const about = raw.about || {};

  const transformedAbout = {
    ...about,
    missionGallery: await Promise.all((about.missionGallery || []).map((item) => migrateAssetReference(item, uploadCache))),
    missionCarousel: await Promise.all((about.missionCarousel || []).map(async (item) => ({
      ...item,
      imageDesktop: await migrateAssetReference(item.imageDesktop || item.image, uploadCache),
      image: await migrateAssetReference(item.image || item.imageDesktop, uploadCache),
      imageMobile: await migrateAssetReference(item.imageMobile, uploadCache),
    }))),
  };

  const transformedCarousel = await Promise.all((raw.carousel || []).map(async (item) => ({
    ...item,
    imageDesktop: await migrateAssetReference(item.imageDesktop || item.image, uploadCache),
    image: await migrateAssetReference(item.image || item.imageDesktop, uploadCache),
    imageMobile: await migrateAssetReference(item.imageMobile, uploadCache),
  })));

  const transformedImoveis = await Promise.all((raw.imoveis || []).map(async (imovel) => ({
    ...imovel,
    imagem: await migrateAssetReference(imovel.imagem, uploadCache),
    imagemGaleria: await Promise.all((imovel.imagemGaleria || []).map((item) => migrateAssetReference(item, uploadCache))),
    comodos: await Promise.all((imovel.comodos || []).map(async (comodo) => ({
      ...comodo,
      fotos: await Promise.all((comodo.fotos || []).map((item) => migrateAssetReference(item, uploadCache))),
    }))),
  })));

  return {
    config,
    about: transformedAbout,
    carousel: transformedCarousel,
    whatsappOptions: raw.whatsappOptions || [],
    imoveis: transformedImoveis,
    adminUsers: raw.adminUsers || [],
  };
}

async function clearTables() {
  const tables = [
    'imovel_comodos',
    'imovel_plantas',
    'imoveis',
    'carousel_items',
    'about_mission_carousel',
    'whatsapp_options',
  ];

  for (const table of tables) {
    await restRequest('DELETE', `/rest/v1/${table}?id=gt.0`);
    log('delete', `Tabela limpa: ${table}`);
  }
}

async function upsertSingletons(snapshot) {
  await restRequest(
    'POST',
    '/rest/v1/site_config?on_conflict=id',
    [{
      id: 1,
      nome_empresa: snapshot.config.nomeEmpresa || null,
      telefone: snapshot.config.telefone || null,
      whatsapp: snapshot.config.whatsapp || null,
      whatsapp_vendas: snapshot.config.whatsappVendas || null,
      whatsapp_atendimento: snapshot.config.whatsappAtendimento || null,
      email: snapshot.config.email || null,
      endereco: snapshot.config.endereco || null,
      hero_chamada: snapshot.config.heroChamada || null,
      hero_subtitulo: snapshot.config.heroSubtitulo || null,
      google_maps_embed: snapshot.config.googleMapsEmbed || null,
    }],
    { Prefer: 'resolution=merge-duplicates,return=minimal' }
  );

  await restRequest(
    'POST',
    '/rest/v1/site_about?on_conflict=id',
    [{
      id: 1,
      about_title: snapshot.about.aboutTitle || null,
      about_subtitle: snapshot.about.aboutSubtitle || null,
      about_description: snapshot.about.aboutDescription || null,
      about_summary: snapshot.about.aboutSummary || null,
      about_mission_title: snapshot.about.aboutMissionTitle || null,
      about_mission_text: snapshot.about.aboutMissionText || null,
      mission_gallery: snapshot.about.missionGallery || [],
    }],
    { Prefer: 'resolution=merge-duplicates,return=minimal' }
  );
}

async function insertCollection(table, rows) {
  if (!rows.length) return;
  await restRequest(
    'POST',
    `/rest/v1/${table}`,
    rows,
    { Prefer: 'resolution=merge-duplicates,return=minimal' }
  );
  log('insert', `${rows.length} registro(s) em ${table}`);
}

async function importSnapshot(snapshot) {
  await upsertSingletons(snapshot);

  await insertCollection('about_mission_carousel', (snapshot.about.missionCarousel || []).map((item, index) => ({
    id: item.id,
    title: item.title || null,
    subtitle: item.subtitle || null,
    image_desktop: item.imageDesktop || item.image || null,
    image: item.image || item.imageDesktop || null,
    image_source: item.imageSource || null,
    image_mobile: item.imageMobile || null,
    image_mobile_source: item.imageMobileSource || null,
    sort_order: typeof item.id === 'number' ? item.id : index,
  })));

  await insertCollection('carousel_items', (snapshot.carousel || []).map((item, index) => ({
    id: item.id,
    title: item.title || null,
    subtitle: item.subtitle || null,
    image_desktop: item.imageDesktop || item.image || null,
    image: item.image || item.imageDesktop || null,
    image_source: item.imageSource || null,
    image_mobile: item.imageMobile || null,
    image_mobile_source: item.imageMobileSource || null,
    link: item.link || null,
    sort_order: typeof item.id === 'number' ? item.id : index,
  })));

  await insertCollection('whatsapp_options', (snapshot.whatsappOptions || []).map((item) => ({
    id: item.id,
    title: item.title || null,
    description: item.description || null,
    whatsapp: item.whatsapp || null,
  })));

  await insertCollection('imoveis', (snapshot.imoveis || []).map((imovel) => ({
    id: imovel.id,
    destaque: Boolean(imovel.destaque),
    nome: imovel.nome,
    bairro: imovel.bairro || null,
    cidade: imovel.cidade || null,
    quartos: imovel.quartos || null,
    metragem: imovel.metragem || null,
    descricao: imovel.descricao || null,
    tag: imovel.tag || null,
    imagem: imovel.imagem || null,
    imagem_source: imovel.imagemSource || null,
    imagem_galeria: imovel.imagemGaleria || [],
    diferenciais: imovel.diferenciais || [],
    localizacao: imovel.localizacao || null,
    maps_link: imovel.mapsLink || null,
    status: imovel.status || null,
  })));

  const plantas = [];
  const comodos = [];

  for (const imovel of snapshot.imoveis || []) {
    for (let index = 0; index < (imovel.plantas || []).length; index += 1) {
      const planta = imovel.plantas[index];
      plantas.push({
        nome: planta.nome || null,
        descricao: planta.descricao || null,
        unidades: planta.unidades || null,
        sort_order: index,
        imovel_id: imovel.id,
      });
    }

    for (const comodo of imovel.comodos || []) {
      comodos.push({
        nome: comodo.nome || null,
        fotos: comodo.fotos || [],
        imovel_id: imovel.id,
      });
    }
  }

  await insertCollection('imovel_plantas', plantas);
  await insertCollection('imovel_comodos', comodos);
  await restRequest('POST', '/rest/v1/rpc/sync_identity_sequences', {});
}

async function main() {
  if (!fs.existsSync(JSON_PATH)) {
    throw new Error('Arquivo data/imoveis.json nao encontrado.');
  }

  log('start', 'Lendo snapshot legado em data/imoveis.json');
  const raw = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));
  const snapshot = await transformSnapshot(raw);

  await clearTables();
  await importSnapshot(snapshot);

  if ((snapshot.adminUsers || []).length > 0) {
    log('auth', 'Usuarios do JSON nao foram importados para o Auth automaticamente.');
    log('auth', 'Use node scripts/create-admin-user.js <email> <senha> [nome] para cada administrador.');
  }

  log('done', 'Migracao concluida com sucesso.');
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
