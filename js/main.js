/**
 * CELLI CRUZ - JavaScript Principal
 * Arquivo: js/main.js
 * Gerencia: carregamento de dados, interações globais, formulários, animações
 */

// ============================================================
// CONFIGURAÇÃO GLOBAL
// ============================================================

const CONFIG = {
  dataUrl: '../data/imoveis.json',
  whatsappMsg: encodeURIComponent('Olá! Tenho interesse em um imóvel da Celli Cruz. Podem me ajudar?')
};

// Detecta se está na raiz ou em /pages
const isInPages = window.location.pathname.includes('/pages/');
const dataPath = isInPages ? '../data/imoveis.json' : './data/imoveis.json';

function resolveMediaPath(src) {
  if (!src) return src;
  if (src.startsWith('http') || src.startsWith('data:') || src.startsWith('/')) return src;
  return (isInPages ? '../' : './') + src;
}

// ============================================================
// CARREGAMENTO DE DADOS
// ============================================================

async function loadData() {
  try {
    const res = await fetch(dataPath);
    if (!res.ok) throw new Error('Erro ao carregar dados');
    return await res.json();
  } catch (e) {
    console.warn('Não foi possível carregar dados do JSON. Usando dados de fallback.');
    return null;
  }
}

// ============================================================
// HEADER / NAVBAR
// ============================================================

function initHeader() {
  const header = document.querySelector('.header');
  const menuToggle = document.querySelector('.menu-toggle');
  const nav = document.querySelector('.nav');

  if (!header) return;

  // Scroll effect
  window.addEventListener('scroll', () => {
    header.classList.toggle('scrolled', window.scrollY > 20);
  }, { passive: true });

  // Mobile menu
  if (menuToggle && nav) {
    menuToggle.addEventListener('click', () => {
      nav.classList.toggle('open');
    });
  }

  // Active link por página
  const path = window.location.pathname;
  document.querySelectorAll('.nav-link').forEach(link => {
    const href = link.getAttribute('href');
    if (href && (path.endsWith(href) || (path.endsWith('/') && href === 'index.html'))) {
      link.classList.add('active');
    }
  });
}

// ============================================================
// ANIMAÇÃO FADE-IN-UP (Intersection Observer)
// ============================================================

function initAnimations() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('.fade-in-up').forEach((el, i) => {
    el.style.transitionDelay = `${i * 0.07}s`;
    observer.observe(el);
  });
}

// ============================================================
// WHATSAPP FLOAT
// ============================================================

function initWhatsApp() {
  // Modal de seleção de departamento é controlado via onclick no HTML
  // Gerenciado pelas funções openWhatsAppModal(), closeWhatsAppModal(), redirectWhatsApp()
}

// Abre o modal de seleção de departamento WhatsApp
function openWhatsAppModal() {
  const overlay = document.getElementById('whatsapp-modal-overlay');
  if (overlay) {
    overlay.classList.add('open');
  }
}

// Fecha o modal de seleção de departamento WhatsApp
function closeWhatsAppModal() {
  const overlay = document.getElementById('whatsapp-modal-overlay');
  if (overlay) {
    overlay.classList.remove('open');
  }
}

// Redireciona para WhatsApp do departamento especificado
async function redirectWhatsApp(departamento) {
  try {
    // Carrega dados para pegar números WhatsApp
    const dados = await loadData();
    if (!dados || !dados.config) return;

    const { config } = dados;
    
    let telefone;
    if (departamento === 'vendas') {
      telefone = config.whatsappVendas || config.whatsapp;
    } else if (departamento === 'atendimento') {
      telefone = config.whatsappAtendimento || config.whatsapp;
    } else {
      telefone = config.whatsapp;
    }

    if (!telefone) {
      console.error('Nenhum número WhatsApp configurado');
      return;
    }

    // Fecha o modal
    closeWhatsAppModal();

    // Redireciona para WhatsApp
    const msg = encodeURIComponent('Olá! Tenho interesse em conversar com o departamento de ' + departamento);
    window.open(`https://wa.me/${telefone}?text=${msg}`, '_blank');
  } catch (e) {
    console.error('Erro ao redirecionar WhatsApp:', e);
  }
}

// Fechar modal ao clicar fora dele
document.addEventListener('click', function(e) {
  const overlay = document.getElementById('whatsapp-modal-overlay');
  if (overlay && e.target === overlay) {
    closeWhatsAppModal();
  }
});

// ============================================================
// TOAST / NOTIFICAÇÕES
// ============================================================

function showToast(msg, type = 'success') {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.className = `toast ${type}`;
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3500);
}

// ============================================================
// FORMULÁRIO DE CONTATO (Hero e CTA)
// ============================================================

function initForms() {
  document.querySelectorAll('.js-contact-form').forEach(form => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = form.querySelector('button[type="submit"]');
      const original = btn.textContent;
      btn.textContent = 'Enviando...';
      btn.disabled = true;

      // Coleta dados
      const data = Object.fromEntries(new FormData(form));

      // Simula envio (substitua pelo seu endpoint real, ex: Formspree, EmailJS, etc.)
      await simulateEmailSend(data);

      btn.textContent = original;
      btn.disabled = false;
      form.reset();
      showToast('✅ Mensagem enviada! Entraremos em contato em breve.', 'success');
    });
  });
}

/**
 * simulateEmailSend - Envia o formulário para o Formspree
 * Opções: Formspree (formspree.io), EmailJS, backend PHP/Node
 */
async function simulateEmailSend(data) {
  try {
    const res = await fetch('https://formspree.io/f/mzdybvyd', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(data)
    });

    if (!res.ok) {
      throw new Error(`Falha no envio: ${res.status}`);
    }

    return true;
  } catch (error) {
    console.error('Erro ao enviar formulário:', error);
    showToast('⚠️ Não foi possível enviar a mensagem. Tente novamente.', 'error');
    return false;
  }
}

// ============================================================
// RENDERIZAR CARDS DE IMÓVEIS (Home)
// ============================================================

function renderImoveisDestaque(imoveis, container) {
  if (!container) return;
  const destaques = imoveis.filter(i => i.destaque).slice(0, 3);
  container.innerHTML = destaques.map(imovel => criarCardImovel(imovel)).join('');
}

function criarCardImovel(imovel) {
  const badgeClass = imovel.status === 'Lançamento' ? 'badge-lancamento'
    : imovel.status === 'Em Obras' ? 'badge-obras' : 'badge-pronto';

  return `
    <div class="imovel-card fade-in-up" onclick="verImovel(${imovel.id})">
      <div class="imovel-card-img">
        <img src="${resolveMediaPath(imovel.imagem)}" alt="${imovel.nome}" loading="lazy">
        <span class="imovel-badge">${imovel.tag}</span>
      </div>
      <div class="imovel-card-body">
        <p class="imovel-cidade">${imovel.cidade}</p>
        <h3 class="imovel-nome">${imovel.nome}</h3>
        <div class="imovel-specs">
          <span class="spec">
            <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
            </svg>
            ${imovel.quartos} Quartos
          </span>
          <span class="spec">
            <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
            </svg>
            A partir de ${imovel.metragem} m²
          </span>
        </div>
        <div class="imovel-card-footer">
          <span class="imovel-bairro">
            <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
              <path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
            </svg>
            ${imovel.bairro}
          </span>
          <span class=\"btn btn-primary\" style=\"padding: 8px 16px; font-size: 13px;\">Ver mais <i class=\"fas fa-arrow-right\"></i></span>
        </div>
      </div>
    </div>
  `;
}

// Navega para a página do imóvel
function verImovel(id) {
  const isInPages = window.location.pathname.includes('/pages/');
  const base = isInPages ? '' : 'pages/';
  window.location.href = `${base}imovel-detalhe.html?id=${id}`;
}

// ============================================================
// DIFERENCIAIS DA HOME (dinâmico)
// ============================================================

const DIFERENCIAIS = [
  {  label: 'Piscina Adulto e Infantil' },
  {  label: 'Academia Equipada' },
  {  label: 'Quadra Poliesportiva' },
  {  label: 'Brinquedoteca' },
  {  label: 'Salão de Festas' },
  {  label: 'Salão de Jogos' },
  {  label: 'Espaço Gourmet' },
  {  label: 'Segurança 24h' },
];

function renderDiferenciais(container) {
  if (!container) return;
  container.innerHTML = DIFERENCIAIS.map(d => `
    <div class="dif-card fade-in-up">
      <h4>${d.label}</h4>
    </div>
  `).join('');
}

function renderCarousel(container, items) {
  if (!container) return;
  if (!items || items.length === 0) {
    container.innerHTML = '<div class="carousel-empty" style="color: var(--cinza-texto); padding: 28px;">Nenhum destaque publicitário disponível no momento.</div>';
    renderCarouselIndicators([]);
    return;
  }

  container.innerHTML = items.map(item => `
    <article class="carousel-slide">
      <div class="carousel-slide-images">
        <img src="${resolveMediaPath(item.image)}" alt="${item.title}" class="carousel-image carousel-image-desktop">
        ${item.imageMobile ? `<img src="${resolveMediaPath(item.imageMobile)}" alt="${item.title}" class="carousel-image carousel-image-mobile">` : ''}
      </div>
      ${item.link ? `<a href="${item.link}" class="carousel-slide-link" aria-label="Abrir ${item.title || 'slide'}"></a>` : ''}
    </article>
  `).join('');

  renderCarouselIndicators(items);
}

function renderCarouselIndicators(items) {
  const indicators = document.getElementById('carousel-indicators');
  if (!indicators) return;
  if (!items || items.length === 0) {
    indicators.innerHTML = '';
    return;
  }

  indicators.innerHTML = items.map((item, index) => `
    <button type="button" class="carousel-indicator${index === 0 ? ' active' : ''}" data-index="${index}" aria-label="Ir para slide ${index + 1}"></button>
  `).join('');

  indicators.querySelectorAll('.carousel-indicator').forEach(button => {
    button.addEventListener('click', () => {
      const index = Number(button.dataset.index);
      scrollCarouselToIndex(index);
    });
  });
}

function setActiveCarouselIndicator(index) {
  const indicators = document.querySelectorAll('.carousel-indicator');
  indicators.forEach((button, idx) => {
    button.classList.toggle('active', idx === index);
  });
}

function getActiveCarouselIndex(track) {
  const slides = Array.from(track.querySelectorAll('.carousel-slide'));
  if (!slides.length) return 0;

  const trackRect = track.getBoundingClientRect();
  const trackCenter = track.scrollLeft + track.clientWidth / 2;
  let closestIndex = 0;
  let minDistance = Infinity;

  slides.forEach((slide, index) => {
    const slideCenter = slide.offsetLeft + slide.offsetWidth / 2;
    const distance = Math.abs(trackCenter - slideCenter);
    if (distance < minDistance) {
      minDistance = distance;
      closestIndex = index;
    }
  });

  return closestIndex;
}

function scrollCarouselToIndex(index) {
  const track = document.getElementById('carousel-track');
  if (!track) return;
  const slide = track.querySelectorAll('.carousel-slide')[index];
  if (!slide) return;
  track.scrollTo({ left: slide.offsetLeft, behavior: 'smooth' });
}

function initCarouselAutoScroll() {
  const track = document.getElementById('carousel-track');
  if (!track || track.children.length <= 1) return;

  let paused = false;
  const slideGap = 22;
  const intervalMs = 5000;

  const updateIndicator = () => {
    const activeIndex = getActiveCarouselIndex(track);
    setActiveCarouselIndicator(activeIndex);
  };

  track.addEventListener('mouseenter', () => { paused = true; });
  track.addEventListener('mouseleave', () => { paused = false; });
  track.addEventListener('scroll', () => { requestAnimationFrame(updateIndicator); });

  setInterval(() => {
    if (paused) return;
    const maxScroll = track.scrollWidth - track.clientWidth;
    if (track.scrollLeft + 10 >= maxScroll) {
      track.scrollTo({ left: 0, behavior: 'smooth' });
      return;
    }

    const firstSlide = track.querySelector('.carousel-slide');
    const step = firstSlide ? firstSlide.offsetWidth + slideGap : track.clientWidth;
    track.scrollBy({ left: step, behavior: 'smooth' });
  }, intervalMs);
}

// ============================================================
// INIT GLOBAL
// ============================================================

document.addEventListener('DOMContentLoaded', async () => {
  initHeader();
  initWhatsApp();
  initForms();

  // Carrega dados
  const dados = await loadData();

  // Home - vitrine destaques
  const vitrineGrid = document.getElementById('vitrine-imoveis');
  if (vitrineGrid && dados) {
    renderImoveisDestaque(dados.imoveis, vitrineGrid);
  }

  // Carrossel de destaques publicitários
  const carouselTrack = document.getElementById('carousel-track');
  if (carouselTrack && dados) {
    renderCarousel(carouselTrack, dados.carousel);
    initCarouselAutoScroll();
  }

  // Diferenciais
  const difGrid = document.getElementById('dif-grid');
  if (difGrid) renderDiferenciais(difGrid);

  // Config dinâmica (WhatsApp, telefone, etc.)
  if (dados) {
    const { config } = dados;
    // Nota: O WhatsApp agora é controlado pelo modal, veja openWhatsAppModal() e redirectWhatsApp()
    document.querySelectorAll('.js-telefone').forEach(el => el.textContent = config.telefone);
    document.querySelectorAll('.js-email').forEach(el => el.textContent = config.email);
    document.querySelectorAll('.js-endereco').forEach(el => el.textContent = config.endereco);
  }

  // Inicia animações por último (após DOM pronto)
  setTimeout(initAnimations, 100);
});
