/**
 * Admin runtime backed by Supabase.
 */

let appData = {
  config: {},
  about: {},
  imoveis: [],
  carousel: [],
  whatsappOptions: [],
  adminUsers: [],
};

let editingImovelId = null;
let editingCarouselId = null;
let editingUserId = null;
let whatsappEditingId = null;
let plantaDrafts = [];
let comodoDrafts = [];

window.appData = appData;

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

async function loadSiteSnapshot(force = false) {
  if (typeof window.fetchSiteData !== 'function') {
    throw new Error('Camada de dados do Supabase nao foi carregada.');
  }
  return window.fetchSiteData({ force });
}

function setAppData(nextData) {
  appData = nextData;
  window.appData = appData;
}

function getClient() {
  if (!window.supabaseClient) {
    throw new Error('Supabase client nao inicializado.');
  }
  return window.supabaseClient;
}

function resolveAdminMediaPath(src) {
  return typeof window.resolveSupabaseAssetUrl === 'function'
    ? window.resolveSupabaseAssetUrl(src)
    : src;
}

function escapeHtml(value) {
  if (typeof value !== 'string') return '';
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function showAdminToast(message, type = 'success') {
  let toast = document.getElementById('admin-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'admin-toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }

  toast.className = `toast ${type}`;
  toast.innerHTML = message;
  toast.classList.add('show');
  window.setTimeout(() => toast.classList.remove('show'), 4000);
}

async function loadAdminData() {
  const [siteSnapshot, usersPayload] = await Promise.all([
    loadSiteSnapshot(true),
    window.adminApiRequest('/api/admin/users'),
  ]);

  setAppData({
    ...siteSnapshot,
    adminUsers: usersPayload.users || [],
  });

  renderDashboard();
  renderTable(document.getElementById('search-imovel')?.value || '');
  renderCarouselTable();
  renderAdminUsersTable();
  renderWhatsAppOptionsList();
  loadConfigForm();
}

function setEl(id, value) {
  const element = document.getElementById(id);
  if (element) element.textContent = value;
}

function renderDashboard() {
  const total = appData.imoveis.length;
  const destaques = appData.imoveis.filter((item) => item.destaque).length;
  const lancamentos = appData.imoveis.filter((item) => normalizeText(item.status) === 'lancamento').length;
  const prontos = appData.imoveis.filter((item) => normalizeText(item.status) === 'pronto para morar').length;

  setEl('stat-total', total);
  setEl('stat-destaques', destaques);
  setEl('stat-lancamentos', lancamentos);
  setEl('stat-prontos', prontos);
}

function badgeClass(status) {
  const normalized = normalizeText(status);
  if (normalized === 'lancamento') return 'badge-lancamento';
  if (normalized === 'em obras') return 'badge-obras';
  return 'badge-pronto';
}

function renderTable(filter = '') {
  const tbody = document.getElementById('imoveis-tbody');
  if (!tbody) return;

  const search = String(filter || '').trim().toLowerCase();
  const rows = appData.imoveis.filter((item) => {
    if (!search) return true;
    return [item.nome, item.bairro, item.status]
      .filter(Boolean)
      .some((value) => value.toLowerCase().includes(search));
  });

  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 40px; color: var(--cinza-texto);">Nenhum imovel encontrado.</td></tr>';
    return;
  }

  tbody.innerHTML = rows.map((imovel) => `
    <tr>
      <td>${imovel.id}</td>
      <td><img src="${resolveAdminMediaPath(imovel.imagem)}" class="imovel-thumb" alt="${escapeHtml(imovel.nome || '')}"></td>
      <td>
        <strong>${escapeHtml(imovel.nome || '')}</strong><br>
        <span style="font-size: 12px; color: var(--cinza-texto)">${escapeHtml(imovel.bairro || '')}</span>
      </td>
      <td>${escapeHtml(String(imovel.quartos || ''))} quartos · ${escapeHtml(imovel.metragem || '-')} m2</td>
      <td><span class="badge ${badgeClass(imovel.status)}">${escapeHtml(imovel.status || '')}</span></td>
      <td>${imovel.destaque ? 'Sim' : 'Nao'}</td>
      <td>
        <div class="action-btns">
          <button class="btn-icon btn-edit" data-action="edit-imovel" data-id="${imovel.id}" title="Editar"><i class="fas fa-pen"></i></button>
          <button class="btn-icon btn-delete" data-action="delete-imovel" data-id="${imovel.id}" title="Excluir"><i class="fas fa-trash-alt"></i></button>
        </div>
      </td>
    </tr>
  `).join('');
}

function renderCarouselTable() {
  const tbody = document.getElementById('carousel-tbody');
  if (!tbody) return;

  if (!appData.carousel.length) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 40px; color: var(--cinza-texto);">Nenhum slide encontrado.</td></tr>';
    return;
  }

  tbody.innerHTML = appData.carousel.map((item) => `
    <tr>
      <td>${item.id}</td>
      <td><img src="${resolveAdminMediaPath(item.imageDesktop || item.image)}" class="imovel-thumb" alt="${escapeHtml(item.title || '')}"></td>
      <td>${escapeHtml(item.title || '')}</td>
      <td>${escapeHtml(item.subtitle || '')}</td>
      <td>
        <div class="action-btns">
          <button class="btn-icon btn-edit" data-action="edit-carousel" data-id="${item.id}" title="Editar"><i class="fas fa-pen"></i></button>
          <button class="btn-icon btn-delete" data-action="delete-carousel" data-id="${item.id}" title="Excluir"><i class="fas fa-trash-alt"></i></button>
        </div>
      </td>
    </tr>
  `).join('');
}

function renderAdminUsersTable() {
  const tbody = document.getElementById('admin-users-tbody');
  if (!tbody) return;

  if (!appData.adminUsers.length) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding: 40px; color: var(--cinza-texto);">Nenhum usuario administrador encontrado.</td></tr>';
    return;
  }

  tbody.innerHTML = appData.adminUsers.map((user) => `
    <tr>
      <td>${escapeHtml(user.id)}</td>
      <td>${escapeHtml(user.email || '')}</td>
      <td>${escapeHtml(user.name || '-')}</td>
      <td>
        <div class="action-btns">
          <button class="btn-icon btn-edit" data-action="edit-user" data-id="${escapeHtml(user.id)}" title="Editar"><i class="fas fa-pen"></i></button>
          <button class="btn-icon btn-delete" data-action="delete-user" data-id="${escapeHtml(user.id)}" title="Excluir"><i class="fas fa-trash-alt"></i></button>
        </div>
      </td>
    </tr>
  `).join('');
}

function loadConfigForm() {
  const form = document.getElementById('form-config');
  if (!form) return;

  const config = appData.config || {};
  const about = appData.about || {};

  [
    ['nomeEmpresa', config.nomeEmpresa],
    ['telefone', config.telefone],
    ['whatsapp', config.whatsapp],
    ['whatsappVendas', config.whatsappVendas],
    ['whatsappAtendimento', config.whatsappAtendimento],
    ['email', config.email],
    ['endereco', config.endereco],
    ['heroChamada', config.heroChamada],
    ['heroSubtitulo', config.heroSubtitulo],
    ['googleMapsEmbed', config.googleMapsEmbed],
    ['aboutTitle', about.aboutTitle],
    ['aboutSubtitle', about.aboutSubtitle],
    ['aboutDescription', about.aboutDescription],
    ['aboutSummary', about.aboutSummary],
    ['aboutMissionTitle', about.aboutMissionTitle],
    ['aboutMissionText', about.aboutMissionText],
  ].forEach(([name, value]) => {
    const input = form.querySelector(`[name="${name}"]`);
    if (input) input.value = value || '';
  });
}

function renderWhatsAppOptionsList() {
  const tbody = document.getElementById('whatsapp-options-tbody');
  if (!tbody) return;

  if (!appData.whatsappOptions.length) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding: 40px; color: var(--cinza-texto);">Nenhuma opcao cadastrada.</td></tr>';
    return;
  }

  tbody.innerHTML = appData.whatsappOptions.map((option) => `
    <tr>
      <td>${option.id}</td>
      <td>${escapeHtml(option.title || '')}</td>
      <td>${escapeHtml(option.whatsapp || '')}</td>
      <td style="white-space: nowrap;">
        <button type="button" class="btn btn-outline" data-action="edit-whatsapp" data-id="${option.id}">Editar</button>
        <button type="button" class="btn btn-outline" data-action="delete-whatsapp" data-id="${option.id}" style="border-color:#ef4444; color:#ef4444;">Excluir</button>
      </td>
    </tr>
  `).join('');
}

function openWhatsAppOptionEditor(option) {
  whatsappEditingId = option?.id || null;
  const form = document.getElementById('form-whatsapp-option');
  if (!form) return;

  form.querySelector('[name="id"]').value = option?.id || '';
  form.querySelector('[name="title"]').value = option?.title || '';
  form.querySelector('[name="description"]').value = option?.description || '';
  form.querySelector('[name="whatsapp"]').value = option?.whatsapp || '';
  document.getElementById('whatsapp-editor-title').textContent = option?.id ? 'Editar loteamento' : 'Novo loteamento';
}

function resetWhatsAppOptionEditor() {
  openWhatsAppOptionEditor(null);
}

function updateImageSourceFields(form, fieldName) {
  const selected = form.querySelector(`[name="${fieldName}Source"]:checked`)?.value || 'url';
  const urlGroup = form.querySelector(`.image-${fieldName}-url`);
  const uploadGroup = form.querySelector(`.image-${fieldName}-upload`);
  if (urlGroup) urlGroup.style.display = selected === 'url' ? 'block' : 'none';
  if (uploadGroup) uploadGroup.style.display = selected === 'upload' ? 'block' : 'none';
}

function initImageSourceToggles() {
  ['form-imovel', 'form-carousel-item'].forEach((formId) => {
    const form = document.getElementById(formId);
    if (!form) return;
    ['imagem', 'image', 'imageMobile'].forEach((fieldName) => {
      form.querySelectorAll(`[name="${fieldName}Source"]`).forEach((radio) => {
        radio.addEventListener('change', () => updateImageSourceFields(form, fieldName));
      });
      updateImageSourceFields(form, fieldName);
    });
  });
}

async function resolveImageFieldValue(form, fieldName, folder) {
  const mode = form.querySelector(`[name="${fieldName}Source"]:checked`)?.value || 'url';
  const existing = form.querySelector(`[name="${fieldName}Existing"]`)?.value.trim() || '';

  if (mode === 'url') {
    const url = form.querySelector(`[name="${fieldName}Url"]`)?.value.trim() || '';
    if (url) return { value: url, source: 'url' };
    if (existing) return { value: existing, source: existing.startsWith('http') ? 'url' : 'upload' };
    throw new Error('Informe a URL da imagem.');
  }

  const file = form.querySelector(`[name="${fieldName}File"]`)?.files?.[0];
  if (file) {
    const value = await window.uploadSupabaseFile(file, folder);
    return { value, source: 'upload' };
  }

  if (existing) return { value: existing, source: 'upload' };
  throw new Error('Selecione um arquivo de imagem.');
}

function renderCardPreview() {
  const preview = document.getElementById('card-preview');
  const form = document.getElementById('form-imovel');
  if (!preview || !form) return;

  const nome = form.querySelector('[name="nome"]').value || 'Nome do imovel';
  const bairro = form.querySelector('[name="bairro"]').value || 'Bairro';
  const cidade = form.querySelector('[name="cidade"]').value || 'Cidade';
  const quartos = form.querySelector('[name="quartos"]').value || '2';
  const metragem = form.querySelector('[name="metragem"]').value || '--';
  const tag = form.querySelector('[name="tag"]').value || 'Lancamento';
  const imageUrl = form.querySelector('[name="imagemUrl"]').value || form.querySelector('[name="imagemExisting"]').value;

  preview.innerHTML = `
    <div class="imovel-card" style="max-width: 340px;">
      <div class="imovel-card-img">
        <img src="${resolveAdminMediaPath(imageUrl || 'assets/logo.png')}" alt="${escapeHtml(nome)}">
        <span class="imovel-badge">${escapeHtml(tag)}</span>
      </div>
      <div class="imovel-card-body">
        <p class="imovel-cidade">${escapeHtml(cidade)}</p>
        <h3 class="imovel-nome">${escapeHtml(nome)}</h3>
        <div class="imovel-specs">
          <span class="spec">${escapeHtml(String(quartos))} Quartos</span>
          <span class="spec">${escapeHtml(metragem)} m2</span>
        </div>
        <div class="imovel-card-footer">
          <span class="imovel-bairro">${escapeHtml(bairro)}</span>
        </div>
      </div>
    </div>
  `;
}

function syncDraftCollectionsFromDom() {
  plantaDrafts = Array.from(document.querySelectorAll('.planta-item')).map((element) => ({
    id: Number(element.dataset.id),
    nome: element.querySelector('[data-field="nome"]').value.trim(),
    descricao: element.querySelector('[data-field="descricao"]').value.trim(),
    unidades: element.querySelector('[data-field="unidades"]').value.trim() ? Number(element.querySelector('[data-field="unidades"]').value) : null,
  }));

  comodoDrafts = Array.from(document.querySelectorAll('.comodo-item')).map((element) => {
    const id = Number(element.dataset.id);
    const current = comodoDrafts.find((item) => item.id === id);
    return {
      id,
      nome: element.querySelector('[data-field="nome"]').value.trim(),
      fotos: current?.fotos || [],
    };
  });
}

function renderPlantasList() {
  const container = document.getElementById('plantas-list');
  if (!container) return;

  container.innerHTML = plantaDrafts.map((planta) => `
    <div class="planta-item" data-id="${planta.id}" style="background: white; border: 1px solid #e5e8ec; border-radius: 6px; padding: 12px; margin-bottom: 12px;">
      <div style="display:grid; grid-template-columns: 1.2fr 1fr 120px auto; gap: 12px; align-items:end;">
        <div class="form-group" style="margin:0;">
          <label>Nome</label>
          <input type="text" data-field="nome" value="${escapeHtml(planta.nome || '')}" placeholder="Ex: Planta tipo">
        </div>
        <div class="form-group" style="margin:0;">
          <label>Descricao</label>
          <input type="text" data-field="descricao" value="${escapeHtml(planta.descricao || '')}" placeholder="Ex: 40,08 m2">
        </div>
        <div class="form-group" style="margin:0;">
          <label>Unidades</label>
          <input type="number" data-field="unidades" value="${planta.unidades ?? ''}" placeholder="Opcional">
        </div>
        <button type="button" class="btn btn-outline" data-action="remove-planta" data-id="${planta.id}" style="height: 42px; color:#ef4444; border-color:#ef4444;">Remover</button>
      </div>
    </div>
  `).join('');
}

function renderComodosList() {
  const container = document.getElementById('comodos-list');
  if (!container) return;

  container.innerHTML = comodoDrafts.map((comodo) => `
    <div class="comodo-item" data-id="${comodo.id}" style="background: white; border: 1px solid #e5e8ec; border-radius: 6px; padding: 12px; margin-bottom: 12px;">
      <div style="display:flex; gap: 12px; align-items:start; justify-content:space-between;">
        <div style="flex:1;">
          <div class="form-group" style="margin-bottom: 12px;">
            <label>Nome do comodo</label>
            <input type="text" data-field="nome" value="${escapeHtml(comodo.nome || '')}" placeholder="Ex: Sala de estar">
          </div>
          <div style="display:flex; flex-wrap:wrap; gap: 10px; margin-bottom: 12px;">
            ${(comodo.fotos || []).map((foto, index) => `
              <div style="position:relative;">
                <img src="${resolveAdminMediaPath(foto)}" alt="Foto do comodo" style="width: 88px; height: 72px; object-fit: cover; border-radius: 6px; border: 1px solid #e5e8ec;">
                <button type="button" class="btn btn-outline" data-action="remove-comodo-photo" data-id="${comodo.id}" data-photo-index="${index}" style="position:absolute; top:4px; right:4px; padding:2px 6px; font-size:11px; color:#ef4444; border-color:#ef4444;">x</button>
              </div>
            `).join('')}
          </div>
          <button type="button" class="btn btn-outline" data-action="upload-comodo-photo" data-id="${comodo.id}">Adicionar foto</button>
        </div>
        <button type="button" class="btn btn-outline" data-action="remove-comodo" data-id="${comodo.id}" style="color:#ef4444; border-color:#ef4444;">Remover</button>
      </div>
    </div>
  `).join('');
}

function openModal(title, imovel) {
  const form = document.getElementById('form-imovel');
  if (!form) return;

  editingImovelId = imovel?.id || null;
  document.getElementById('modal-titulo').textContent = title;
  document.getElementById('modal-overlay').classList.add('open');

  form.reset();

  const imageValue = imovel?.imagem || '';
  const imageSource = imovel?.imagemSource || (imageValue && !imageValue.startsWith('http') ? 'upload' : 'url');
  const imageSourceInput = form.querySelector(`[name="imagemSource"][value="${imageSource}"]`);
  if (imageSourceInput) imageSourceInput.checked = true;

  [
    ['nome', imovel?.nome],
    ['bairro', imovel?.bairro],
    ['cidade', imovel?.cidade],
    ['quartos', imovel?.quartos || 2],
    ['metragem', imovel?.metragem],
    ['descricao', imovel?.descricao],
    ['tag', imovel?.tag || 'Lançamento'],
    ['status', imovel?.status || 'Lançamento'],
    ['localizacao', imovel?.localizacao],
    ['mapsLink', imovel?.mapsLink],
  ].forEach(([name, value]) => {
    const input = form.querySelector(`[name="${name}"]`);
    if (input) input.value = value || '';
  });

  form.querySelector('[name="imagemUrl"]').value = imageSource === 'url' ? imageValue : '';
  form.querySelector('[name="imagemExisting"]').value = imageValue;
  form.querySelector('[name="destaque"]').checked = Boolean(imovel?.destaque);
  form.querySelector('[name="diferenciais"]').value = (imovel?.diferenciais || []).join(', ');

  plantaDrafts = JSON.parse(JSON.stringify(imovel?.plantas || []));
  comodoDrafts = JSON.parse(JSON.stringify(imovel?.comodos || []));
  renderPlantasList();
  renderComodosList();
  updateImageSourceFields(form, 'imagem');
  renderCardPreview();
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('open');
  editingImovelId = null;
  plantaDrafts = [];
  comodoDrafts = [];
}

function openNovo() {
  openModal('Novo imovel', null);
}

function openEdit(id) {
  openModal('Editar imovel', appData.imoveis.find((item) => item.id === Number(id)));
}

function openCarouselModal(id) {
  const form = document.getElementById('form-carousel-item');
  if (!form) return;

  editingCarouselId = id || null;
  document.getElementById('modal-carousel-title').textContent = id ? 'Editar slide' : 'Novo slide';
  document.getElementById('modal-carousel-overlay').classList.add('open');
  form.reset();

  const item = appData.carousel.find((entry) => entry.id === Number(id));
  if (!item) {
    updateImageSourceFields(form, 'image');
    updateImageSourceFields(form, 'imageMobile');
    return;
  }

  form.querySelector('[name="title"]').value = item.title || '';
  form.querySelector('[name="subtitle"]').value = item.subtitle || '';
  form.querySelector('[name="link"]').value = item.link || '';
  form.querySelector('[name="imageExisting"]').value = item.imageDesktop || item.image || '';
  form.querySelector('[name="imageMobileExisting"]').value = item.imageMobile || '';

  const desktopSource = item.imageSource || ((item.imageDesktop || item.image || '').startsWith('http') ? 'url' : 'upload');
  const mobileSource = item.imageMobileSource || ((item.imageMobile || '').startsWith('http') ? 'url' : 'upload');

  const desktopInput = form.querySelector(`[name="imageSource"][value="${desktopSource}"]`);
  const mobileInput = form.querySelector(`[name="imageMobileSource"][value="${mobileSource}"]`);
  if (desktopInput) desktopInput.checked = true;
  if (mobileInput) mobileInput.checked = true;
  form.querySelector('[name="imageUrl"]').value = desktopSource === 'url' ? (item.imageDesktop || item.image || '') : '';
  form.querySelector('[name="imageMobileUrl"]').value = mobileSource === 'url' ? (item.imageMobile || '') : '';
  updateImageSourceFields(form, 'image');
  updateImageSourceFields(form, 'imageMobile');
}

function closeCarouselModal() {
  document.getElementById('modal-carousel-overlay').classList.remove('open');
  editingCarouselId = null;
}

function openUserModal(id) {
  editingUserId = id || null;
  const form = document.getElementById('form-user-item');
  if (!form) return;

  document.getElementById('modal-user-title').textContent = id ? 'Editar usuario' : 'Novo usuario';
  document.getElementById('modal-user-overlay').classList.add('open');
  form.reset();

  const user = appData.adminUsers.find((entry) => entry.id === id);
  if (!user) return;

  form.querySelector('[name="name"]').value = user.name || '';
  form.querySelector('[name="email"]').value = user.email || '';
}

function closeUserModal() {
  document.getElementById('modal-user-overlay').classList.remove('open');
  editingUserId = null;
}

function addPlanta() {
  syncDraftCollectionsFromDom();
  plantaDrafts.push({ id: Date.now(), nome: '', descricao: '', unidades: null });
  renderPlantasList();
}

function removePlanta(id) {
  syncDraftCollectionsFromDom();
  plantaDrafts = plantaDrafts.filter((item) => item.id !== Number(id));
  renderPlantasList();
}

function addComodo() {
  syncDraftCollectionsFromDom();
  comodoDrafts.push({ id: Date.now(), nome: '', fotos: [] });
  renderComodosList();
}

function removeComodo(id) {
  syncDraftCollectionsFromDom();
  comodoDrafts = comodoDrafts.filter((item) => item.id !== Number(id));
  renderComodosList();
}

async function addComodoPhoto(id) {
  syncDraftCollectionsFromDom();

  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.onchange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const objectPath = await window.uploadSupabaseFile(file, 'imoveis/comodos');
      const target = comodoDrafts.find((item) => item.id === Number(id));
      if (target) {
        target.fotos = [...(target.fotos || []), objectPath];
      }
      renderComodosList();
      showAdminToast('Foto enviada para o Supabase Storage.');
    } catch (error) {
      showAdminToast(error.message, 'error');
    }
  };
  input.click();
}

function removeComodoPhoto(id, photoIndex) {
  syncDraftCollectionsFromDom();
  const target = comodoDrafts.find((item) => item.id === Number(id));
  if (!target) return;
  target.fotos = (target.fotos || []).filter((_, index) => index !== Number(photoIndex));
  renderComodosList();
}

async function upsertSingletonsFromState(nextConfig, nextAbout) {
  const client = getClient();

  const { error: configError } = await client.from('site_config').upsert({
    id: 1,
    nome_empresa: nextConfig.nomeEmpresa || null,
    telefone: nextConfig.telefone || null,
    whatsapp: nextConfig.whatsapp || null,
    whatsapp_vendas: nextConfig.whatsappVendas || null,
    whatsapp_atendimento: nextConfig.whatsappAtendimento || null,
    email: nextConfig.email || null,
    endereco: nextConfig.endereco || null,
    hero_chamada: nextConfig.heroChamada || null,
    hero_subtitulo: nextConfig.heroSubtitulo || null,
    google_maps_embed: nextConfig.googleMapsEmbed || null,
  }, { onConflict: 'id' });
  if (configError) throw configError;

  const { error: aboutError } = await client.from('site_about').upsert({
    id: 1,
    about_title: nextAbout.aboutTitle || null,
    about_subtitle: nextAbout.aboutSubtitle || null,
    about_description: nextAbout.aboutDescription || null,
    about_summary: nextAbout.aboutSummary || null,
    about_mission_title: nextAbout.aboutMissionTitle || null,
    about_mission_text: nextAbout.aboutMissionText || null,
    mission_gallery: nextAbout.missionGallery || [],
  }, { onConflict: 'id' });
  if (aboutError) throw aboutError;
}

async function syncSimpleCollection(table, rows) {
  const client = getClient();
  const { data: existingRows, error: fetchError } = await client.from(table).select('id');
  if (fetchError) throw fetchError;

  const existingIds = (existingRows || []).map((item) => item.id);
  const nextIds = rows.filter((item) => item.id).map((item) => item.id);
  const idsToDelete = existingIds.filter((id) => !nextIds.includes(id));

  if (idsToDelete.length) {
    const { error: deleteError } = await client.from(table).delete().in('id', idsToDelete);
    if (deleteError) throw deleteError;
  }

  if (rows.length) {
    const { error: upsertError } = await client.from(table).upsert(rows, { onConflict: 'id' });
    if (upsertError) throw upsertError;
  }
}

async function salvarConfig() {
  const form = document.getElementById('form-config');
  if (!form) return;

  const formData = Object.fromEntries(new FormData(form));
  const readField = (name, fallback = '') => Object.prototype.hasOwnProperty.call(formData, name) ? formData[name] : fallback;
  const nextConfig = {
    nomeEmpresa: readField('nomeEmpresa', appData.config.nomeEmpresa || ''),
    telefone: readField('telefone', appData.config.telefone || ''),
    whatsapp: readField('whatsapp', appData.config.whatsapp || ''),
    whatsappVendas: readField('whatsappVendas', appData.config.whatsappVendas || ''),
    whatsappAtendimento: readField('whatsappAtendimento', appData.config.whatsappAtendimento || ''),
    email: readField('email', appData.config.email || ''),
    endereco: readField('endereco', appData.config.endereco || ''),
    heroChamada: readField('heroChamada', appData.config.heroChamada || ''),
    heroSubtitulo: readField('heroSubtitulo', appData.config.heroSubtitulo || ''),
    googleMapsEmbed: readField('googleMapsEmbed', appData.config.googleMapsEmbed || ''),
  };

  const nextAbout = {
    ...appData.about,
    aboutTitle: readField('aboutTitle', appData.about.aboutTitle || ''),
    aboutSubtitle: readField('aboutSubtitle', appData.about.aboutSubtitle || ''),
    aboutDescription: readField('aboutDescription', appData.about.aboutDescription || ''),
    aboutSummary: readField('aboutSummary', appData.about.aboutSummary || ''),
    aboutMissionTitle: readField('aboutMissionTitle', appData.about.aboutMissionTitle || ''),
    aboutMissionText: readField('aboutMissionText', appData.about.aboutMissionText || ''),
  };

  try {
    await upsertSingletonsFromState(nextConfig, nextAbout);
    await loadAdminData();
    showAdminToast('Configuracoes salvas com sucesso.');
  } catch (error) {
    showAdminToast(error.message, 'error');
  }
}

async function salvarWhatsAppOption(event) {
  event.preventDefault();
  const form = document.getElementById('form-whatsapp-option');
  if (!form) return;

  const payload = {
    id: form.querySelector('[name="id"]').value ? Number(form.querySelector('[name="id"]').value) : undefined,
    title: form.querySelector('[name="title"]').value.trim(),
    description: form.querySelector('[name="description"]').value.trim(),
    whatsapp: form.querySelector('[name="whatsapp"]').value.replace(/\D/g, ''),
  };

  if (!payload.title || !payload.whatsapp) {
    showAdminToast('Informe titulo e WhatsApp validos.', 'error');
    return;
  }

  try {
    const client = getClient();
    const { error } = await client.from('whatsapp_options').upsert(payload, { onConflict: 'id' });
    if (error) throw error;
    await loadAdminData();
    resetWhatsAppOptionEditor();
    showAdminToast(whatsappEditingId ? 'Loteamento atualizado.' : 'Loteamento criado.');
  } catch (error) {
    showAdminToast(error.message, 'error');
  }
}

async function deleteWhatsAppOption(id) {
  if (!window.confirm('Excluir esta opcao de WhatsApp?')) return;
  try {
    const { error } = await getClient().from('whatsapp_options').delete().eq('id', Number(id));
    if (error) throw error;
    await loadAdminData();
    resetWhatsAppOptionEditor();
    showAdminToast('Opcao removida com sucesso.');
  } catch (error) {
    showAdminToast(error.message, 'error');
  }
}

async function salvarImovel() {
  const form = document.getElementById('form-imovel');
  if (!form) return;

  syncDraftCollectionsFromDom();

  try {
    const imagem = await resolveImageFieldValue(form, 'imagem', 'imoveis/capas');
    const existing = appData.imoveis.find((item) => item.id === editingImovelId) || {};
    const payload = {
      id: editingImovelId || undefined,
      destaque: form.querySelector('[name="destaque"]').checked,
      nome: form.querySelector('[name="nome"]').value.trim(),
      bairro: form.querySelector('[name="bairro"]').value.trim(),
      cidade: form.querySelector('[name="cidade"]').value.trim(),
      quartos: Number(form.querySelector('[name="quartos"]').value || 0),
      metragem: form.querySelector('[name="metragem"]').value.trim(),
      descricao: form.querySelector('[name="descricao"]').value.trim(),
      tag: form.querySelector('[name="tag"]').value.trim(),
      imagem: imagem.value,
      imagem_source: imagem.source,
      imagem_galeria: existing.imagemGaleria?.length ? existing.imagemGaleria : [imagem.value],
      diferenciais: form.querySelector('[name="diferenciais"]').value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
      localizacao: form.querySelector('[name="localizacao"]').value.trim(),
      maps_link: form.querySelector('[name="mapsLink"]').value.trim(),
      status: form.querySelector('[name="status"]').value.trim(),
    };

    if (!payload.nome) {
      throw new Error('O nome do imovel e obrigatorio.');
    }

    const client = getClient();
    const { data, error } = await client.from('imoveis').upsert(payload, {
      onConflict: 'id',
    }).select('id').single();
    if (error) throw error;

    const imovelId = data.id;

    await client.from('imovel_plantas').delete().eq('imovel_id', imovelId);
    await client.from('imovel_comodos').delete().eq('imovel_id', imovelId);

    if (plantaDrafts.length) {
      const { error: plantasError } = await client.from('imovel_plantas').insert(
        plantaDrafts
          .filter((item) => item.nome || item.descricao || item.unidades)
          .map((item, index) => ({
            imovel_id: imovelId,
            nome: item.nome || null,
            descricao: item.descricao || null,
            unidades: item.unidades || null,
            sort_order: index,
          }))
      );
      if (plantasError) throw plantasError;
    }

    if (comodoDrafts.length) {
      const { error: comodosError } = await client.from('imovel_comodos').insert(
        comodoDrafts
          .filter((item) => item.nome || (item.fotos || []).length)
          .map((item) => ({
            imovel_id: imovelId,
            nome: item.nome || null,
            fotos: item.fotos || [],
          }))
      );
      if (comodosError) throw comodosError;
    }

    await loadAdminData();
    closeModal();
    showAdminToast(editingImovelId ? 'Imovel atualizado.' : 'Imovel criado.');
  } catch (error) {
    showAdminToast(error.message, 'error');
  }
}

async function deleteImovel(id) {
  if (!window.confirm('Excluir este imovel?')) return;
  try {
    const { error } = await getClient().from('imoveis').delete().eq('id', Number(id));
    if (error) throw error;
    await loadAdminData();
    showAdminToast('Imovel removido com sucesso.');
  } catch (error) {
    showAdminToast(error.message, 'error');
  }
}

async function saveCarouselItem() {
  const form = document.getElementById('form-carousel-item');
  if (!form) return;

  try {
    const desktopImage = await resolveImageFieldValue(form, 'image', 'carousel/desktop');
    let mobileImage = { value: '', source: '' };

    const mobileMode = form.querySelector('[name="imageMobileSource"]:checked')?.value || 'url';
    if (
      form.querySelector('[name="imageMobileFile"]')?.files?.[0] ||
      form.querySelector('[name="imageMobileUrl"]')?.value.trim() ||
      form.querySelector('[name="imageMobileExisting"]')?.value.trim()
    ) {
      mobileImage = await resolveImageFieldValue(form, 'imageMobile', 'carousel/mobile');
    } else if (mobileMode === 'upload') {
      mobileImage = { value: '', source: 'upload' };
    }

    const payload = {
      id: editingCarouselId || undefined,
      title: form.querySelector('[name="title"]').value.trim(),
      subtitle: form.querySelector('[name="subtitle"]').value.trim(),
      image_desktop: desktopImage.value,
      image: desktopImage.value,
      image_source: desktopImage.source,
      image_mobile: mobileImage.value || null,
      image_mobile_source: mobileImage.source || null,
      link: form.querySelector('[name="link"]').value.trim() || null,
      sort_order: editingCarouselId || appData.carousel.length + 1,
    };

    if (!payload.title) throw new Error('Titulo do slide e obrigatorio.');

    const { error } = await getClient().from('carousel_items').upsert(payload, { onConflict: 'id' });
    if (error) throw error;

    await loadAdminData();
    closeCarouselModal();
    showAdminToast(editingCarouselId ? 'Slide atualizado.' : 'Slide criado.');
  } catch (error) {
    showAdminToast(error.message, 'error');
  }
}

async function deleteCarouselItem(id) {
  if (!window.confirm('Excluir este slide?')) return;
  try {
    const { error } = await getClient().from('carousel_items').delete().eq('id', Number(id));
    if (error) throw error;
    await loadAdminData();
    showAdminToast('Slide removido.');
  } catch (error) {
    showAdminToast(error.message, 'error');
  }
}

async function saveUser() {
  const form = document.getElementById('form-user-item');
  if (!form) return;

  const payload = {
    name: form.querySelector('[name="name"]').value.trim(),
    email: form.querySelector('[name="email"]').value.trim().toLowerCase(),
    password: form.querySelector('[name="password"]').value,
  };

  const passwordConfirm = form.querySelector('[name="passwordConfirm"]').value;

  if (!payload.name || !payload.email) {
    showAdminToast('Nome e e-mail sao obrigatorios.', 'error');
    return;
  }

  if (!editingUserId && !payload.password) {
    showAdminToast('Informe uma senha para o novo administrador.', 'error');
    return;
  }

  if (payload.password && payload.password !== passwordConfirm) {
    showAdminToast('As senhas nao conferem.', 'error');
    return;
  }

  try {
    if (editingUserId) {
      await window.adminApiRequest(`/api/admin/users/${editingUserId}`, {
        method: 'PATCH',
        body: payload,
      });
    } else {
      await window.adminApiRequest('/api/admin/users', {
        method: 'POST',
        body: payload,
      });
    }

    await loadAdminData();
    closeUserModal();
    showAdminToast(editingUserId ? 'Usuario atualizado.' : 'Usuario criado.');
  } catch (error) {
    showAdminToast(error.message, 'error');
  }
}

async function deleteUser(id) {
  if (!window.confirm('Excluir este usuario administrador?')) return;
  try {
    await window.adminApiRequest(`/api/admin/users/${id}`, { method: 'DELETE' });
    await loadAdminData();
    showAdminToast('Usuario removido.');
  } catch (error) {
    showAdminToast(error.message, 'error');
  }
}

async function exportarJSON() {
  const snapshot = await loadSiteSnapshot(true);
  const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'cellicruz-supabase-export.json';
  anchor.click();
  URL.revokeObjectURL(url);
  showAdminToast('Snapshot exportado com sucesso.');
}

async function replaceSnapshot(snapshot) {
  const client = getClient();

  await upsertSingletonsFromState(snapshot.config || {}, {
    ...appData.about,
    ...(snapshot.about || {}),
  });

  await syncSimpleCollection('about_mission_carousel', (snapshot.about?.missionCarousel || []).map((item, index) => ({
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

  await syncSimpleCollection('carousel_items', (snapshot.carousel || []).map((item, index) => ({
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

  await syncSimpleCollection('whatsapp_options', (snapshot.whatsappOptions || []).map((item) => ({
    id: item.id,
    title: item.title || null,
    description: item.description || null,
    whatsapp: item.whatsapp || null,
  })));

  const existingImoveis = await client.from('imoveis').select('id');
  if (existingImoveis.error) throw existingImoveis.error;
  const existingIds = (existingImoveis.data || []).map((item) => item.id);
  const nextIds = (snapshot.imoveis || []).map((item) => item.id).filter(Boolean);
  const idsToDelete = existingIds.filter((id) => !nextIds.includes(id));

  if (idsToDelete.length) {
    const { error: deleteImoveisError } = await client.from('imoveis').delete().in('id', idsToDelete);
    if (deleteImoveisError) throw deleteImoveisError;
  }

  if (snapshot.imoveis?.length) {
    const { error: upsertImoveisError } = await client.from('imoveis').upsert(snapshot.imoveis.map((item) => ({
      id: item.id,
      destaque: Boolean(item.destaque),
      nome: item.nome,
      bairro: item.bairro || null,
      cidade: item.cidade || null,
      quartos: item.quartos || null,
      metragem: item.metragem || null,
      descricao: item.descricao || null,
      tag: item.tag || null,
      imagem: item.imagem || null,
      imagem_source: item.imagemSource || null,
      imagem_galeria: item.imagemGaleria || [],
      diferenciais: item.diferenciais || [],
      localizacao: item.localizacao || null,
      maps_link: item.mapsLink || null,
      status: item.status || null,
    })), { onConflict: 'id' });
    if (upsertImoveisError) throw upsertImoveisError;
  }

  const { error: deletePlantasError } = await client.from('imovel_plantas').delete().gt('id', 0);
  if (deletePlantasError) throw deletePlantasError;
  const { error: deleteComodosError } = await client.from('imovel_comodos').delete().gt('id', 0);
  if (deleteComodosError) throw deleteComodosError;

  const plantas = [];
  const comodos = [];

  (snapshot.imoveis || []).forEach((imovel) => {
    (imovel.plantas || []).forEach((planta, index) => {
      plantas.push({
        imovel_id: imovel.id,
        nome: planta.nome || null,
        descricao: planta.descricao || null,
        unidades: planta.unidades || null,
        sort_order: index,
      });
    });

    (imovel.comodos || []).forEach((comodo) => {
      comodos.push({
        imovel_id: imovel.id,
        nome: comodo.nome || null,
        fotos: comodo.fotos || [],
      });
    });
  });

  if (plantas.length) {
    const { error: plantasError } = await client.from('imovel_plantas').insert(plantas);
    if (plantasError) throw plantasError;
  }

  if (comodos.length) {
    const { error: comodosError } = await client.from('imovel_comodos').insert(comodos);
    if (comodosError) throw comodosError;
  }
}

function importarJSON() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json,application/json';
  input.onchange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const snapshot = JSON.parse(text);
      await replaceSnapshot(snapshot);
      await loadAdminData();
      showAdminToast('Snapshot importado para o Supabase.');
    } catch (error) {
      showAdminToast(error.message || 'Arquivo invalido.', 'error');
    }
  };
  input.click();
}

function mostrarJSON() {
  const preview = document.getElementById('json-preview');
  if (preview) {
    preview.textContent = JSON.stringify(appData, null, 2);
  }
}

function showSection(sectionId) {
  document.querySelectorAll('.admin-section').forEach((section) => {
    section.style.display = 'none';
  });
  document.getElementById(`section-${sectionId}`)?.style.setProperty('display', 'block');

  document.querySelectorAll('.sidebar-link').forEach((link) => link.classList.remove('active'));
  document.querySelector(`[data-section="${sectionId}"]`)?.classList.add('active');

  if (sectionId === 'config') loadConfigForm();
  if (sectionId === 'whatsapp') renderWhatsAppOptionsList();
}

function handleTableClicks(event) {
  const button = event.target.closest('[data-action]');
  if (!button) return;

  const id = button.dataset.id;
  switch (button.dataset.action) {
    case 'edit-imovel':
      openEdit(id);
      break;
    case 'delete-imovel':
      deleteImovel(id);
      break;
    case 'edit-carousel':
      openCarouselModal(Number(id));
      break;
    case 'delete-carousel':
      deleteCarouselItem(id);
      break;
    case 'edit-user':
      openUserModal(id);
      break;
    case 'delete-user':
      deleteUser(id);
      break;
    case 'edit-whatsapp':
      openWhatsAppOptionEditor(appData.whatsappOptions.find((item) => String(item.id) === String(id)));
      break;
    case 'delete-whatsapp':
      deleteWhatsAppOption(id);
      break;
    case 'remove-planta':
      removePlanta(id);
      break;
    case 'remove-comodo':
      removeComodo(id);
      break;
    case 'upload-comodo-photo':
      addComodoPhoto(id);
      break;
    case 'remove-comodo-photo':
      removeComodoPhoto(id, button.dataset.photoIndex);
      break;
    default:
      break;
  }
}

function setupEventListeners() {
  document.querySelectorAll('[data-section]').forEach((link) => {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      showSection(link.dataset.section);
    });
  });

  document.getElementById('btn-logout')?.addEventListener('click', logoutAdmin);
  document.getElementById('search-imovel')?.addEventListener('input', (event) => renderTable(event.target.value));
  document.getElementById('btn-new-imovel')?.addEventListener('click', openNovo);
  document.getElementById('btn-save-imovel')?.addEventListener('click', salvarImovel);
  document.getElementById('btn-save-config')?.addEventListener('click', salvarConfig);
  document.getElementById('btn-new-whatsapp-option')?.addEventListener('click', resetWhatsAppOptionEditor);
  document.getElementById('form-whatsapp-option')?.addEventListener('submit', salvarWhatsAppOption);
  document.getElementById('btn-cancel-whatsapp-option')?.addEventListener('click', resetWhatsAppOptionEditor);
  document.getElementById('btn-new-carousel')?.addEventListener('click', () => openCarouselModal(null));
  document.getElementById('btn-save-carousel')?.addEventListener('click', saveCarouselItem);
  document.getElementById('btn-new-user')?.addEventListener('click', () => openUserModal(null));
  document.getElementById('btn-save-user')?.addEventListener('click', saveUser);
  document.getElementById('btn-save-server')?.addEventListener('click', async () => {
    try {
      await loadAdminData();
      showAdminToast('Painel recarregado a partir do Supabase.');
    } catch (error) {
      showAdminToast(error.message, 'error');
    }
  });
  document.getElementById('btn-export-json')?.addEventListener('click', exportarJSON);
  document.getElementById('btn-import-json')?.addEventListener('click', importarJSON);
  document.getElementById('btn-show-json')?.addEventListener('click', mostrarJSON);
  document.getElementById('btn-add-comodo')?.addEventListener('click', addComodo);
  document.getElementById('btn-add-planta')?.addEventListener('click', addPlanta);
  document.querySelector('.btn-cancel-imovel')?.addEventListener('click', closeModal);
  document.querySelector('.btn-close-modal-imovel')?.addEventListener('click', closeModal);
  document.querySelector('.btn-cancel-carousel')?.addEventListener('click', closeCarouselModal);
  document.querySelector('.btn-close-modal-carousel')?.addEventListener('click', closeCarouselModal);
  document.querySelector('.btn-cancel-user')?.addEventListener('click', closeUserModal);
  document.querySelector('.btn-close-modal-user')?.addEventListener('click', closeUserModal);

  document.getElementById('imoveis-tbody')?.addEventListener('click', handleTableClicks);
  document.getElementById('carousel-tbody')?.addEventListener('click', handleTableClicks);
  document.getElementById('admin-users-tbody')?.addEventListener('click', handleTableClicks);
  document.getElementById('whatsapp-options-tbody')?.addEventListener('click', handleTableClicks);
  document.getElementById('comodos-list')?.addEventListener('click', handleTableClicks);
  document.getElementById('plantas-list')?.addEventListener('click', handleTableClicks);

  document.getElementById('form-imovel')?.addEventListener('input', renderCardPreview);
  document.getElementById('form-imovel')?.addEventListener('change', renderCardPreview);
}

document.addEventListener('DOMContentLoaded', async () => {
  if (!await requireAdminLogin()) return;
  initImageSourceToggles();
  setupEventListeners();
  showSection('imoveis');

  try {
    await loadAdminData();
  } catch (error) {
    showAdminToast(error.message || 'Falha ao carregar dados do admin.', 'error');
  }
});

window.showSection = showSection;
window.mostrarJSON = mostrarJSON;
