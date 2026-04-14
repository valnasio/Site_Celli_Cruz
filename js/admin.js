/**
 * CELLI CRUZ - JavaScript Admin
 * Arquivo: js/admin.js
 * Gerencia: CRUD de imóveis, configurações, preview em tempo real
 *
 * NOTA: Este sistema usa JSON local para demonstração.
 * Para produção, implemente um backend (PHP/Node/Python) que
 * salve os dados no servidor/banco de dados.
 * Ver seção "INTEGRAÇÃO COM BACKEND" no final deste arquivo.
 */

// ============================================================
// ESTADO DA APLICAÇÃO
// ============================================================

let appData = { config: {}, imoveis: [], carousel: [], adminUsers: [] };
let editingId = null;
let carouselEditingId = null;
let userEditingId = null;

// ============================================================
// CARREGAR DADOS
// ============================================================

async function loadAdminData() {
  try {
    const res = await fetch('../data/imoveis.json?t=' + Date.now());
    appData = await res.json();
    appData.carousel = appData.carousel || [];
    appData.adminUsers = appData.adminUsers || [];
    renderDashboard();
    renderTable();
    renderCarouselTable();
    renderAdminUsersTable();
  } catch (e) {
    showAdminToast('Erro ao carregar dados. Verifique o arquivo JSON.', 'error');
  }
}

// ============================================================
// DASHBOARD - ESTATÍSTICAS
// ============================================================

function renderDashboard() {
  const total = appData.imoveis.length;
  const destaques = appData.imoveis.filter(i => i.destaque).length;
  const lancamentos = appData.imoveis.filter(i => i.status === 'Lançamento').length;
  const prontos = appData.imoveis.filter(i => i.status === 'Pronto para Morar').length;

  setEl('stat-total', total);
  setEl('stat-destaques', destaques);
  setEl('stat-lancamentos', lancamentos);
  setEl('stat-prontos', prontos);
}

function setEl(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function getAdminBasePath() {
  return window.location.pathname.includes('/pages/') ? '../' : './';
}

function getAdminApiPath(endpoint) {
  return getAdminBasePath() + 'api/' + endpoint;
}

function resolveAdminMediaPath(src) {
  if (!src) return src;
  if (/^(https?:)?\/\//i.test(src) || src.startsWith('data:') || src.startsWith('/')) return src;
  return '../' + src;
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function uploadImageFile(file) {
  const endpoint = '/api/upload';
  const formData = new FormData();
  formData.append('file', file);

  try {
    console.log('🔄 Iniciando upload de:', file.name, '(', (file.size / 1024).toFixed(2), 'KB)');
    console.log('📍 Acessando:', window.location.origin + endpoint);
    
    const res = await fetch(endpoint, {
      method: 'POST',
      body: formData
    });

    console.log('📡 Resposta do servidor:', res.status, res.statusText);

    if (!res.ok) {
      const errorBody = await res.text();
      console.error('❌ Erro no upload:', errorBody);
      
      // Se não estiver usando localhost:8000, informar
      const hint = window.location.port !== '8000' ? 
        '\n\n💡 Dica: Certifique-se de acessar http://localhost:8000/pages/admin.html (não 5500)' : '';
      
      throw new Error(`HTTP ${res.status}: ${res.statusText}${hint}`);
    }

    const json = await res.json();
    console.log('✅ Upload bem-sucedido:', json);
    
    if (json.ok && json.path) {
      return json.path;
    }

    throw new Error(json.error || 'Upload retornou erro desconhecido');
  } catch (error) {
    console.error('❌ Falha ao fazer upload:', error.message);
    showAdminToast(`<i class="fas fa-circle-exclamation"></i> Upload falhou: ${error.message}`, 'error');
    throw error;
  }
}

async function resolveImageFieldValue(form, fieldName) {
  const source = form.querySelector(`[name="${fieldName}Source"]:checked`)?.value || 'url';
  const existing = form.querySelector(`[name="${fieldName}Existing"]`)?.value.trim() || '';

  if (source === 'url') {
    const url = form.querySelector(`[name="${fieldName}Url"]`)?.value.trim();
    if (url) return { value: url, source };
    if (existing) return { value: existing, source };
    throw new Error('Informe a URL da imagem.');
  }

  const fileInput = form.querySelector(`[name="${fieldName}File"]`);
  if (!fileInput) throw new Error('Campo de upload não encontrado.');

  const file = fileInput.files[0];
  if (file) {
    const path = await uploadImageFile(file);
    return { value: path, source };
  }

  if (existing) return { value: existing, source };
  throw new Error('Selecione um arquivo de imagem ou mantenha a imagem atual.');
}

function updateImageSourceFields(form, fieldName) {
  const mode = form.querySelector(`[name="${fieldName}Source"]:checked`)?.value || 'url';
  const urlGroup = form.querySelector(`.image-${fieldName}-url`);
  const uploadGroup = form.querySelector(`.image-${fieldName}-upload`);
  if (urlGroup) urlGroup.style.display = mode === 'url' ? 'block' : 'none';
  if (uploadGroup) uploadGroup.style.display = mode === 'upload' ? 'block' : 'none';
}

function initImageSourceToggles() {
  const forms = [document.getElementById('form-imovel'), document.getElementById('form-carousel-item')];
  forms.forEach(form => {
    if (!form) return;
    ['imagem', 'image', 'imageMobile'].forEach(fieldName => {
      form.querySelectorAll(`[name="${fieldName}Source"]`).forEach(radio => {
        radio.addEventListener('change', () => updateImageSourceFields(form, fieldName));
      });
      updateImageSourceFields(form, fieldName);
    });
  });
}

// ============================================================
// TABELA DE IMÓVEIS
// ============================================================

function renderTable(filter = '') {
  const tbody = document.getElementById('imoveis-tbody');
  if (!tbody) return;

  let lista = appData.imoveis;
  if (filter) {
    const f = filter.toLowerCase();
    lista = lista.filter(i =>
      i.nome.toLowerCase().includes(f) ||
      i.bairro.toLowerCase().includes(f) ||
      i.status.toLowerCase().includes(f)
    );
  }

  if (lista.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 40px; color: var(--cinza-texto);">Nenhum imóvel encontrado.</td></tr>`;
    return;
  }

  tbody.innerHTML = lista.map(imovel => `
    <tr>
      <td>${imovel.id}</td>
      <td><img src="${resolveAdminMediaPath(imovel.imagem)}" class="imovel-thumb" alt="" onerror="this.src='https://via.placeholder.com/56x42?text=Sem+foto'"></td>
      <td>
        <strong>${imovel.nome}</strong><br>
        <span style="font-size: 12px; color: var(--cinza-texto)">${imovel.bairro}</span>
      </td>
      <td>${imovel.quartos} quartos · ${imovel.metragem} m²</td>
      <td><span class="badge ${badgeClass(imovel.status)}">${imovel.status}</span></td>
      <td>
        <span style="font-size: 18px">${imovel.destaque ? '⭐' : '—'}</span>
      </td>
      <td>
        <div class="action-btns">
          <button class="btn-icon btn-edit" title="Editar" onclick="openEdit(${imovel.id})"><i class="fas fa-pen"></i></button>
          <button class="btn-icon btn-delete" title="Excluir" onclick="confirmDelete(${imovel.id})"><i class="fas fa-trash-alt"></i></button>
        </div>
      </td>
    </tr>
  `).join('');
}

function renderCarouselTable(filter = '') {
  const tbody = document.getElementById('carousel-tbody');
  if (!tbody) return;

  let lista = appData.carousel || [];
  if (filter) {
    const f = filter.toLowerCase();
    lista = lista.filter(item =>
      item.title.toLowerCase().includes(f) ||
      (item.subtitle || '').toLowerCase().includes(f)
    );
  }

  if (lista.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 40px; color: var(--cinza-texto);">Nenhum slide encontrado.</td></tr>`;
    return;
  }

  tbody.innerHTML = lista.map(item => `
    <tr>
      <td>${item.id}</td>
      <td><img src="${resolveAdminMediaPath(item.image)}" class="imovel-thumb" alt="" onerror="this.src='https://via.placeholder.com/56x42?text=Sem+foto'"></td>
      <td>${item.title}</td>
      <td>${item.subtitle || ''}</td>
      <td>
        <div class="action-btns">
          <button class="btn-icon btn-edit" title="Editar" onclick="openCarouselModal(${item.id})"><i class="fas fa-pen"></i></button>
          <button class="btn-icon btn-delete" title="Excluir" onclick="confirmDeleteCarouselItem(${item.id})"><i class="fas fa-trash-alt"></i></button>
        </div>
      </td>
    </tr>
  `).join('');
}

function renderAdminUsersTable() {
  const tbody = document.getElementById('admin-users-tbody');
  if (!tbody) return;

  const lista = appData.adminUsers || [];
  if (lista.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding: 40px; color: var(--cinza-texto);">Nenhum usuário cadastrado.</td></tr>`;
    return;
  }

  tbody.innerHTML = lista.map(user => `
    <tr>
      <td>${user.id}</td>
      <td>${user.username}</td>
      <td>${user.name || '—'}</td>
      <td>
        <div class="action-btns">
          <button class="btn-icon btn-edit" title="Editar" onclick="openUserModal(${user.id})"><i class="fas fa-pen"></i></button>
          <button class="btn-icon btn-delete" title="Excluir" onclick="confirmDeleteUser(${user.id})"><i class="fas fa-trash-alt"></i></button>
        </div>
      </td>
    </tr>
  `).join('');
}

function badgeClass(status) {
  if (status === 'Lançamento') return 'badge-lancamento';
  if (status === 'Em Obras') return 'badge-obras';
  return 'badge-pronto';
}

// ============================================================
// BUSCA
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  const search = document.getElementById('search-imovel');
  if (search) {
    search.addEventListener('input', () => renderTable(search.value));
  }
  initImageSourceToggles();
});

// ============================================================
// MODAL - ABRIR/FECHAR
// ============================================================

function openModal(titulo, imovel = null) {
  editingId = imovel ? imovel.id : null;

  document.getElementById('modal-titulo').textContent = titulo;
  document.getElementById('modal-overlay').classList.add('open');

  // Preenche form
  const f = document.getElementById('form-imovel');
  if (imovel) {
    f.querySelector('[name="nome"]').value = imovel.nome || '';
    f.querySelector('[name="bairro"]').value = imovel.bairro || '';
    f.querySelector('[name="cidade"]').value = imovel.cidade || '';
    f.querySelector('[name="quartos"]').value = imovel.quartos || 2;
    f.querySelector('[name="metragem"]').value = imovel.metragem || '';
    f.querySelector('[name="descricao"]').value = imovel.descricao || '';
    f.querySelector('[name="tag"]').value = imovel.tag || 'Lançamento';
    f.querySelector('[name="status"]').value = imovel.status || 'Lançamento';
    const imageSource = imovel.imagemSource || (/^(https?:)?\/\//i.test(imovel.imagem) ? 'url' : 'upload');
    const imagemSourceInput = f.querySelector(`[name="imagemSource"][value="${imageSource}"]`);
    if (imagemSourceInput) imagemSourceInput.checked = true;
    f.querySelector('[name="imagemUrl"]').value = imageSource === 'url' ? (imovel.imagem || '') : '';
    f.querySelector('[name="imagemExisting"]').value = imovel.imagem || '';
    f.querySelector('[name="imagemFile"]').value = '';
    updateImageSourceFields(f, 'imagem');
    f.querySelector('[name="localizacao"]').value = imovel.localizacao || '';
    f.querySelector('[name="mapsLink"]').value = imovel.mapsLink || '';
    f.querySelector('[name="destaque"]').checked = imovel.destaque || false;
    f.querySelector('[name="diferenciais"]').value = (imovel.diferenciais || []).join(', ');
    
    // Carregar cômodos
    const comodosList = document.getElementById('comodos-list');
    if (comodosList) {
      comodosList.innerHTML = '';
      (imovel.comodos || []).forEach(comodo => {
        renderComodoForm(comodo);
      });
    }
  } else {
    f.reset();
    updateImageSourceFields(f, 'imagem');
    const comodosList = document.getElementById('comodos-list');
    if (comodosList) comodosList.innerHTML = '';
  }

  updatePreview();
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('open');
  editingId = null;
}

function openNovo() {
  openModal('Novo Imóvel');
}

function openEdit(id) {
  const imovel = appData.imoveis.find(i => i.id === id);
  if (imovel) openModal('Editar Imóvel', imovel);
}

function openCarouselModal(id = null) {
  carouselEditingId = id;
  const titulo = id ? 'Editar Slide' : 'Novo Slide';
  document.getElementById('modal-carousel-title').textContent = titulo;
  document.getElementById('modal-carousel-overlay').classList.add('open');

  const form = document.getElementById('form-carousel-item');
  if (!form) return;

  if (id) {
    const item = appData.carousel.find(c => c.id === id);
    if (item) {
      form.querySelector('[name="title"]').value = item.title || '';
      form.querySelector('[name="subtitle"]').value = item.subtitle || '';
      
      // Desktop image
      const imageDesktopOrImage = item.imageDesktop || item.image;
      const imageSource = item.imageSource || (/^(https?:)?\/\//i.test(imageDesktopOrImage) ? 'url' : 'upload');
      const imageSourceInput = form.querySelector(`[name="imageSource"][value="${imageSource}"]`);
      if (imageSourceInput) imageSourceInput.checked = true;
      form.querySelector('[name="imageUrl"]').value = imageSource === 'url' ? (imageDesktopOrImage || '') : '';
      form.querySelector('[name="imageExisting"]').value = imageDesktopOrImage || '';
      form.querySelector('[name="imageFile"]').value = '';
      updateImageSourceFields(form, 'image');
      
      // Mobile image
      const imageMobileSource = item.imageMobileSource || (/^(https?:)?\/\//i.test(item.imageMobile) ? 'url' : 'upload');
      const imageMobileSourceInput = form.querySelector(`[name="imageMobileSource"][value="${imageMobileSource}"]`);
      if (imageMobileSourceInput) imageMobileSourceInput.checked = true;
      form.querySelector('[name="imageMobileUrl"]').value = imageMobileSource === 'url' ? (item.imageMobile || '') : '';
      form.querySelector('[name="imageMobileExisting"]').value = item.imageMobile || '';
      form.querySelector('[name="imageMobileFile"]').value = '';
      updateImageSourceFields(form, 'imageMobile');
      
      form.querySelector('[name="link"]').value = item.link || '';
    }
  } else {
    form.reset();
    updateImageSourceFields(form, 'image');
    updateImageSourceFields(form, 'imageMobile');
  }
}

function closeCarouselModal() {
  document.getElementById('modal-carousel-overlay').classList.remove('open');
  carouselEditingId = null;
}

function openNewCarouselItem() {
  openCarouselModal(null);
}

function openUserModal(id = null) {
  userEditingId = id;
  const titulo = id ? 'Editar Usuário' : 'Novo Usuário';
  document.getElementById('modal-user-title').textContent = titulo;
  document.getElementById('modal-user-overlay').classList.add('open');

  const form = document.getElementById('form-user-item');
  if (!form) return;

  if (id) {
    const user = appData.adminUsers.find(u => u.id === id);
    if (user) {
      form.querySelector('[name="name"]').value = user.name || '';
      form.querySelector('[name="username"]').value = user.username || '';
      form.querySelector('[name="password"]').value = '';
      form.querySelector('[name="passwordConfirm"]').value = '';
    }
  } else {
    form.reset();
  }
}

function closeUserModal() {
  document.getElementById('modal-user-overlay').classList.remove('open');
  userEditingId = null;
}

async function saveCarouselItem() {
  const form = document.getElementById('form-carousel-item');
  if (!form) return;

  const title = form.querySelector('[name="title"]').value.trim();
  if (!title) { showAdminToast('<i class="fas fa-exclamation-triangle"></i> Título é obrigatório.', 'error'); return; }

  let imageDesktopResult;
  try {
    imageDesktopResult = await resolveImageFieldValue(form, 'image');
  } catch (error) {
    showAdminToast(error.message, 'error');
    return;
  }

  let imageMobileResult = { value: '', source: 'url' };
  try {
    const mobileImageInput = form.querySelector('[name="imageMobileFile"]');
    const mobileImageUrl = form.querySelector('[name="imageMobileUrl"]');
    const imageMobileSource = form.querySelector('[name="imageMobileSource"]:checked')?.value || 'url';
    
    if ((imageMobileSource === 'upload' && mobileImageInput?.files?.length) || 
        (imageMobileSource === 'url' && mobileImageUrl?.value?.trim())) {
      imageMobileResult = await resolveImageFieldValue(form, 'imageMobile');
    }
  } catch (error) {
    // Mobile image é opcional, então não mostra erro
  }

  const item = {
    id: carouselEditingId || (Math.max(0, ...(appData.carousel || []).map(c => c.id)) + 1),
    title,
    subtitle: form.querySelector('[name="subtitle"]').value.trim(),
    imageDesktop: imageDesktopResult.value,
    image: imageDesktopResult.value,
    imageSource: imageDesktopResult.source,
    imageMobile: imageMobileResult.value || undefined,
    imageMobileSource: imageMobileResult.source,
    link: form.querySelector('[name="link"]').value.trim()
  };

  if (carouselEditingId) {
    const index = appData.carousel.findIndex(c => c.id === carouselEditingId);
    if (index > -1) {
      appData.carousel[index] = { ...appData.carousel[index], ...item };
    }
  } else {
    appData.carousel = appData.carousel || [];
    appData.carousel.push(item);
  }

  saveData();
  renderCarouselTable();
  closeCarouselModal();
  showAdminToast(carouselEditingId ? '<i class="fas fa-check"></i> Slide atualizado com sucesso!' : '<i class="fas fa-check"></i> Slide criado com sucesso!');
}

async function saveUser() {
  const form = document.getElementById('form-user-item');
  if (!form) return;

  const name = form.querySelector('[name="name"]').value.trim();
  const username = form.querySelector('[name="username"]').value.trim();
  const password = form.querySelector('[name="password"]').value;
  const passwordConfirm = form.querySelector('[name="passwordConfirm"]').value;

  if (!name || !username) {
    showAdminToast('<i class="fas fa-exclamation-triangle"></i> Nome e usuário são obrigatórios.', 'error');
    return;
  }

  if (!userEditingId && !password) {
    showAdminToast('<i class="fas fa-exclamation-triangle"></i> Informe uma senha para o novo usuário.', 'error');
    return;
  }

  if (password && password !== passwordConfirm) {
    showAdminToast('<i class="fas fa-exclamation-triangle"></i> Senhas não conferem.', 'error');
    return;
  }

  const existing = appData.adminUsers.find(u => u.username.toLowerCase() === username.toLowerCase() && u.id !== userEditingId);
  if (existing) {
    showAdminToast('<i class="fas fa-exclamation-triangle"></i> Este usuário já existe.', 'error');
    return;
  }

  const id = userEditingId || (Math.max(0, ...(appData.adminUsers || []).map(u => u.id)) + 1);
  const user = {
    id,
    name,
    username
  };

  if (password) {
    const salt = generateSalt();
    const passwordHash = await hashPassword(password, salt);
    user.salt = salt;
    user.passwordHash = passwordHash;
  }

  if (userEditingId) {
    const index = appData.adminUsers.findIndex(u => u.id === userEditingId);
    if (index > -1) {
      appData.adminUsers[index] = {
        ...appData.adminUsers[index],
        ...user,
        salt: user.salt || appData.adminUsers[index].salt,
        passwordHash: user.passwordHash || appData.adminUsers[index].passwordHash
      };
    }
  } else {
    appData.adminUsers = appData.adminUsers || [];
    appData.adminUsers.push(user);
  }

  saveData();
  renderAdminUsersTable();
  closeUserModal();
  showAdminToast(userEditingId ? '<i class="fas fa-check"></i> Usuário atualizado com sucesso!' : '<i class="fas fa-check"></i> Usuário criado com sucesso!');
}

function confirmDeleteUser(id) {
  const user = appData.adminUsers.find(u => u.id === id);
  if (!user) return;

  if (confirm(`Tem certeza que deseja excluir o usuário "${user.username}"?`)) {
    appData.adminUsers = appData.adminUsers.filter(u => u.id !== id);
    saveData();
    renderAdminUsersTable();
    showAdminToast('<i class="fas fa-trash-alt"></i> Usuário excluído com sucesso.');
  }
}

function confirmDeleteCarouselItem(id) {
  const item = appData.carousel.find(c => c.id === id);
  if (!item) return;

  if (confirm(`Tem certeza que deseja excluir o slide "${item.title}"?`)) {
    appData.carousel = appData.carousel.filter(c => c.id !== id);
    saveData();
    renderCarouselTable();
    showAdminToast('<i class="fas fa-trash-alt"></i> Slide excluído com sucesso.');
  }
}

// Fechar ao clicar fora
document.addEventListener('DOMContentLoaded', () => {
  const overlay = document.getElementById('modal-overlay');
  if (overlay) {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal();
    });
  }

  const carouselOverlay = document.getElementById('modal-carousel-overlay');
  if (carouselOverlay) {
    carouselOverlay.addEventListener('click', (e) => {
      if (e.target === carouselOverlay) closeCarouselModal();
    });
  }
});

// ============================================================
// PREVIEW EM TEMPO REAL
// ============================================================

function updatePreview() {
  const f = document.getElementById('form-imovel');
  if (!f) return;

  const nome = f.querySelector('[name="nome"]').value || 'Nome do Imóvel';
  const bairro = f.querySelector('[name="bairro"]').value || 'Bairro';
  const quartos = f.querySelector('[name="quartos"]').value || '2';
  const metragem = f.querySelector('[name="metragem"]').value || '0';
  const imageSource = f.querySelector('[name="imagemSource"]:checked')?.value || 'url';
  let imagem = '';

  if (imageSource === 'upload') {
    const fileInput = f.querySelector('[name="imagemFile"]');
    const file = fileInput?.files[0];
    if (file) {
      imagem = URL.createObjectURL(file);
    } else {
      imagem = f.querySelector('[name="imagemExisting"]')?.value || '';
    }
  } else {
    imagem = f.querySelector('[name="imagemUrl"]')?.value || f.querySelector('[name="imagemExisting"]')?.value || '';
  }

  if (imagem && !/^(https?:)?\/\//i.test(imagem) && !imagem.startsWith('data:') && !imagem.startsWith('/')) {
    imagem = resolveAdminMediaPath(imagem);
  }

  if (!imagem) {
    imagem = 'https://via.placeholder.com/400x200?text=Sem+imagem';
  }

  const tag = f.querySelector('[name="tag"]').value || 'Lançamento';
  const descricao = f.querySelector('[name="descricao"]').value || '';
  const destaque = f.querySelector('[name="destaque"]').checked;

  const prev = document.getElementById('card-preview');
  if (!prev) return;

  prev.innerHTML = `
    <div style="border-radius: 10px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.1); background: white; max-width: 360px;">
      <div style="position: relative; height: 180px; overflow: hidden;">
        <img src="${imagem}" style="width:100%; height:100%; object-fit:cover;" 
          onerror="this.src='https://via.placeholder.com/400x200?text=URL+inválida'">
        <span style="position:absolute; top:10px; left:10px; background:#c0392b; color:white; font-size:11px; font-weight:700; padding:4px 10px; border-radius:20px; text-transform:uppercase;">${tag}</span>
        ${destaque ? '<span style="position:absolute; top:10px; right:10px; font-size:18px;">⭐</span>' : ''}
      </div>
      <div style="padding: 16px;">
        <p style="font-size:11px; color:#c0392b; font-weight:700; letter-spacing:1px; text-transform:uppercase; margin-bottom:4px;">Feira de Santana - Bahia</p>
        <h3 style="font-family: serif; font-size: 18px; color: #1a2a3a; margin-bottom: 10px;">${nome}</h3>
        <p style="font-size: 13px; color: #6b7280; margin-bottom: 12px; line-height: 1.5;">${descricao.slice(0, 100)}${descricao.length > 100 ? '...' : ''}</p>
        <div style="display:flex; gap:16px; padding:10px 0; border-top:1px solid #e5e8ec;">
          <span style="font-size:13px; color:#6b7280;"><i class="fas fa-bed"></i> ${quartos} Quartos</span>
          <span style="font-size:13px; color:#6b7280;"><i class="fas fa-ruler"></i> ${metragem} m²</span>
        </div>
        <p style="font-size:12px; color:#6b7280; margin-top:8px;"><i class="fas fa-map-pin"></i> ${bairro}</p>
      </div>
    </div>
  `;
}

// Atualiza preview ao digitar
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('form-imovel');
  if (form) {
    form.addEventListener('input', updatePreview);
    form.addEventListener('change', updatePreview);
  }
});

// ============================================================
// SALVAR IMÓVEL (CRUD)
// ============================================================

async function salvarImovel() {
  const f = document.getElementById('form-imovel');
  if (!f) return;

  // Validação básica
  const nome = f.querySelector('[name="nome"]').value.trim();
  if (!nome) { showAdminToast('<i class="fas fa-exclamation-triangle"></i> O nome é obrigatório.', 'error'); return; }

  let imageResult;
  try {
    imageResult = await resolveImageFieldValue(f, 'imagem');
  } catch (error) {
    showAdminToast(error.message, 'error');
    return;
  }

  const novo = {
    id: editingId || (Math.max(0, ...appData.imoveis.map(i => i.id)) + 1),
    nome,
    bairro: f.querySelector('[name="bairro"]').value.trim(),
    cidade: f.querySelector('[name="cidade"]').value.trim() || 'Feira de Santana - Bahia',
    quartos: parseInt(f.querySelector('[name="quartos"]').value) || 2,
    metragem: f.querySelector('[name="metragem"]').value.trim(),
    descricao: f.querySelector('[name="descricao"]').value.trim(),
    tag: f.querySelector('[name="tag"]').value,
    status: f.querySelector('[name="status"]').value,
    imagem: imageResult.value,
    imagemSource: imageResult.source,
    imagemGaleria: [imageResult.value],
    localizacao: f.querySelector('[name="localizacao"]').value.trim(),
    mapsLink: f.querySelector('[name="mapsLink"]').value.trim(),
    destaque: f.querySelector('[name="destaque"]').checked,
    diferenciais: f.querySelector('[name="diferenciais"]').value.split(',').map(s => s.trim()).filter(Boolean),
    plantas: [],
    comodos: coletarComodos()
  };

  if (editingId) {
    const idx = appData.imoveis.findIndex(i => i.id === editingId);
    if (idx > -1) {
      // Preserva campos que não estão no form
      appData.imoveis[idx] = { ...appData.imoveis[idx], ...novo };
    }
  } else {
    appData.imoveis.push(novo);
  }

  // Salva (simulado - ver integração backend)
  saveData();
  closeModal();
  renderDashboard();
  renderTable();
  showAdminToast(editingId ? '<i class="fas fa-check"></i> Imóvel atualizado com sucesso!' : '<i class="fas fa-check"></i> Imóvel criado com sucesso!');
}

// ============================================================
// EXCLUIR IMÓVEL
// ============================================================

function confirmDelete(id) {
  const imovel = appData.imoveis.find(i => i.id === id);
  if (!imovel) return;

  if (confirm(`Tem certeza que deseja excluir "${imovel.nome}"?\n\nEsta ação não pode ser desfeita.`)) {
    appData.imoveis = appData.imoveis.filter(i => i.id !== id);
    saveData();
    renderDashboard();
    renderTable();
    showAdminToast('<i class="fas fa-trash-alt"></i> Imóvel excluído com sucesso.');
  }
}

// ============================================================
// SALVAR DADOS
// ============================================================

/**
 * saveData - Persiste os dados
 *
 * VERSÃO DEMO: Armazena no objeto em memória e mostra alerta
 * para o usuário copiar o JSON atualizado.
 *
 * PARA PRODUÇÃO - substituir por chamada ao backend:
 *
 * async function saveData() {
 *   const res = await fetch('/api/imoveis', {
 *     method: 'POST',
 *     headers: { 'Content-Type': 'application/json' },
 *     body: JSON.stringify(appData)
 *   });
 *   if (!res.ok) throw new Error('Erro ao salvar');
 * }
 *
 * Backend PHP simples (save.php):
 * <?php
 *   $data = file_get_contents('php://input');
 *   file_put_contents('../data/imoveis.json', $data);
 *   echo json_encode(['ok' => true]);
 * ?>
 */
async function saveData() {
  appData.carousel = appData.carousel || [];

  try {
    // Tenta salvar via API se disponível
    const res = await fetch('/api/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(appData)
    });
    if (res.ok) return true;
  } catch (e) {
    // API não disponível - modo offline
  }

  // Fallback: mostra JSON para copiar
  console.log('<i class="fas fa-folder"></i> Dados atualizados (copie para imoveis.json):');
  console.log(JSON.stringify(appData, null, 2));
  return false;
}

// ============================================================
// SALVAR PARA SERVIDOR
// ============================================================

async function salvarParaServidor() {
  const btn = event.target;
  const textoOriginal = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';

  try {
    appData.carousel = appData.carousel || [];
    const apiPath = '/api/save';
    
    console.log('Enviando dados para o servidor...', appData);
    
    const res = await fetch(apiPath, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(appData)
    });

    console.log('Resposta do servidor:', res.status, res.statusText);
    
    const responseText = await res.text();
    console.log('Corpo da resposta:', responseText);
    
    let json = {};
    if (responseText) {
      try {
        json = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Erro ao fazer parsing JSON:', parseError);
      }
    }

    if (res.ok && json.ok) {
      showAdminToast('<i class="fas fa-check"></i> Alterações salvas com sucesso!');
      btn.innerHTML = '<i class="fas fa-check"></i> Salvo com sucesso!';
      setTimeout(() => {
        btn.innerHTML = textoOriginal;
        btn.disabled = false;
      }, 3000);
      return;
    }
    
    // Erro com mensagem do servidor
    const errorMsg = json.error || res.statusText || 'Erro ao salvar';
    throw new Error(errorMsg);
  } catch (e) {
    console.error('Erro completo:', e);
    showAdminToast('<i class="fas fa-circle-exclamation"></i> Erro ao salvar no servidor: ' + e.message, 'error');
    btn.innerHTML = textoOriginal;
    btn.disabled = false;
  }
}

// ============================================================
// CONFIGURAÇÕES DO SITE
// ============================================================

function loadConfigForm() {
  const f = document.getElementById('form-config');
  if (!f || !appData.config) return;
  const c = appData.config;
  Object.keys(c).forEach(key => {
    const el = f.querySelector(`[name="${key}"]`);
    if (el) el.value = c[key];
  });
}

function salvarConfig() {
  const f = document.getElementById('form-config');
  if (!f) return;

  const inputs = f.querySelectorAll('input, textarea');
  inputs.forEach(input => {
    appData.config[input.name] = input.value;
  });

  saveData();
  showAdminToast('<i class="fas fa-check"></i> Configurações salvas!');
}

// ============================================================
// EXPORTAR JSON
// ============================================================

function exportarJSON() {
  const blob = new Blob([JSON.stringify(appData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'imoveis.json';
  a.click();
  URL.revokeObjectURL(url);
  showAdminToast('<i class="fas fa-download"></i> JSON exportado! Substitua o arquivo data/imoveis.json');
}

// ============================================================
// IMPORTAR JSON
// ============================================================

function importarJSON() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        appData = data;
        renderDashboard();
        renderTable();
        loadConfigForm();
        showAdminToast('<i class="fas fa-check"></i> JSON importado com sucesso!');
      } catch {
        showAdminToast('<i class="fas fa-circle-exclamation"></i> Arquivo JSON inválido.', 'error');
      }
    };
    reader.readAsText(file);
  };
  input.click();
}

// ============================================================
// NAVEGAÇÃO SIDEBAR
// ============================================================

function showSection(sectionId) {
  document.querySelectorAll('.admin-section').forEach(s => s.style.display = 'none');
  const section = document.getElementById(`section-${sectionId}`);
  if (section) section.style.display = 'block';

  document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
  const activeLink = document.querySelector(`[data-section="${sectionId}"]`);
  if (activeLink) activeLink.classList.add('active');

  if (sectionId === 'config') loadConfigForm();
}

// ============================================================
// TOAST ADMIN
// ============================================================
// GERENCIAR CÔMODOS (ROOM PHOTOS)
// ============================================================

let comodoEditando = {};

function adicionarComodo() {
  comodoEditando = { id: Date.now(), nome: '', fotos: [] };
  renderComodoForm(comodoEditando);
}

function renderComodoForm(comodo) {
  const form = document.getElementById('form-imovel');
  if (!form) return;
  
  let lista = form.querySelector('#comodos-list');
  const exists = lista.querySelector(`[data-comodo-id="${comodo.id}"]`);
  
  if (!exists) {
    const div = document.createElement('div');
    div.setAttribute('data-comodo-id', comodo.id);
    div.style.cssText = 'background: white; border: 1px solid #e5e8ec; border-radius: 6px; padding: 12px; margin-bottom: 12px;';
    
    div.innerHTML = `
      <div style="display: flex; gap: 12px; align-items: flex-start;">
        <div style="flex: 1;">
          <input type="text" class="comodo-nome" placeholder="Ex: Sala de Estar" value="${comodo.nome}" style="width: 100%; padding: 8px; border: 1px solid #d0d0d0; border-radius: 4px; margin-bottom: 8px;" required>
          <div class="comodo-fotos" style="margin-bottom: 8px;">
            <!-- Fotos serão listadas aqui -->
          </div>
          <button type="button" class="btn btn-outline" style="font-size: 12px; padding: 6px 10px;" onclick="adicionarFotoComodo(${comodo.id})">
            <i class="fas fa-plus"></i> Adicionar Foto
          </button>
        </div>
        <button type="button" class="btn btn-sm" style="background: #fee; color: #c00; border: 1px solid #fcc; padding: 6px 10px;" onclick="removerComodo(${comodo.id})">
          <i class="fas fa-trash-alt"></i>
        </button>
      </div>
    `;
    lista.appendChild(div);
  }
  
  renderFotosComodo(comodo.id, comodo.fotos || []);
}

function renderFotosComodo(comodoId, fotos) {
  const fotosDiv = document.querySelector(`[data-comodo-id="${comodoId}"] .comodo-fotos`);
  if (!fotosDiv) return;
  
  fotosDiv.innerHTML = fotos.map((foto, idx) => {
    const caminhoResolvido = resolveAdminMediaPath(foto);
    return `
    <div style="display: flex; gap: 8px; align-items: center; margin-bottom: 6px; padding: 6px; background: #f5f5f5; border-radius: 4px;">
      <img src="${caminhoResolvido}" style="width: 40px; height: 40px; object-fit: cover; border-radius: 3px;" alt="Foto do cômodo"
        onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%22100%22%3E%3Crect fill=%22%23ccc%22 width=%22100%22 height=%22100%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 font-family=%22Arial%22 font-size=%2212%22 fill=%22%23999%22%3EErro ao carregar%3C/text%3E%3C/svg%3E';">
      <span style="flex: 1; font-size: 12px; color: #666; word-break: break-all;" title="${foto}">${foto.substring(0, 30)}...</span>
      <button type="button" class="btn btn-sm" style="background: #fee; color: #c00; border: none; padding: 4px 8px; font-size: 12px;" onclick="removerFotoComodo(${comodoId}, ${idx})">
        <i class="fas fa-times"></i>
      </button>
    </div>
  `}).join('');
}

function adicionarFotoComodo(comodoId) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    try {
      const path = await uploadImageFile(file);
      
      const comodosDiv = document.querySelector(`[data-comodo-id="${comodoId}"]`);
      if (!comodosDiv) return;
      
      const nomeInput = comodosDiv.querySelector('.comodo-nome');
      const nome = nomeInput.value.trim() || 'Cômodo';
      
      // Armazena temporariamente no comodoEditando
      if (!comodoEditando.fotos) comodoEditando.fotos = [];
      if (comodoEditando.id === comodoId) {
        comodoEditando.fotos.push(path);
        renderFotosComodo(comodoId, comodoEditando.fotos);
        showAdminToast(`<i class="fas fa-image"></i> Foto de ${nome} adicionada!`);
      }
    } catch (error) {
      console.error('Erro ao adicionar foto:', error);
      // Toast já foi exibido no uploadImageFile
    }
  };
  input.click();
}

function removerFotoComodo(comodoId, fotoIdx) {
  if (comodoEditando.id === comodoId && comodoEditando.fotos) {
    comodoEditando.fotos.splice(fotoIdx, 1);
    renderFotosComodo(comodoId, comodoEditando.fotos);
  }
}

function removerComodo(comodoId) {
  const div = document.querySelector(`[data-comodo-id="${comodoId}"]`);
  if (div) div.remove();
  if (comodoEditando.id === comodoId) {
    comodoEditando = {};
  }
}

function coletarComodos() {
  const lista = document.querySelectorAll('#comodos-list > div[data-comodo-id]');
  const comodos = [];
  lista.forEach(div => {
    const comodoId = div.getAttribute('data-comodo-id');
    const nome = div.querySelector('.comodo-nome').value.trim();
    const fotos = [];
    div.querySelectorAll('.comodo-fotos img').forEach(img => {
      fotos.push(img.src);
    });
    if (nome || fotos.length > 0) {
      comodos.push({ id: parseInt(comodoId), nome: nome || 'Cômodo', fotos });
    }
  });
  return comodos;
}

// ============================================================

function showAdminToast(msg, type = 'success') {
  let toast = document.getElementById('admin-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'admin-toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.className = `toast ${type}`;
  // Use innerHTML para renderizar ícones, mas limpar primeiro
  const msgWithoutHTML = msg.replace(/<[^>]*>/g, '');
  toast.innerHTML = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 4000);
}

// ============================================================
// INIT ADMIN
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  loadAdminData();
  showSection('imoveis');
});
