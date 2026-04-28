/**
 * Main public-site runtime backed by Supabase.
 */

let cachedSiteData = null;
let cachedSiteDataPromise = null;

function sanitizeString(str) {
  if (typeof str !== 'string') return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function sanitizeHtml(html) {
  if (typeof html !== 'string') return '';
  const template = document.createElement('template');
  template.innerHTML = html;
  template.content.querySelectorAll('script, iframe, object, embed').forEach((node) => node.remove());
  template.content.querySelectorAll('*').forEach((node) => {
    Array.from(node.attributes).forEach((attribute) => {
      if (/^on/i.test(attribute.name)) {
        node.removeAttribute(attribute.name);
      }
      if ((attribute.name === 'href' || attribute.name === 'src') && /^javascript:/i.test(attribute.value)) {
        node.removeAttribute(attribute.name);
      }
    });
  });
  return template.innerHTML;
}

function isAbsoluteUrl(value) {
  return typeof value === 'string' && /^(https?:)?\/\//i.test(value);
}

function resolveMediaPath(src) {
  if (!src) return '';
  if (typeof window.resolveSupabaseAssetUrl === 'function') {
    return window.resolveSupabaseAssetUrl(src);
  }
  if (isAbsoluteUrl(src) || src.startsWith('data:') || src.startsWith('/')) {
    return src;
  }
  const isInPages = window.location.pathname.includes('/pages/');
  return `${isInPages ? '../' : './'}${src.replace(/^\.\//, '')}`;
}

async function loadData(options = {}) {
  if (cachedSiteData && !options.force) {
    return cachedSiteData;
  }

  if (cachedSiteDataPromise && !options.force) {
    return cachedSiteDataPromise;
  }

  if (typeof window.fetchSiteData !== 'function') {
    throw new Error('Supabase client nao inicializado.');
  }

  cachedSiteDataPromise = window.fetchSiteData({ force: options.force }).then((data) => {
    cachedSiteData = data;
    cachedSiteDataPromise = null;
    return data;
  }).catch((error) => {
    cachedSiteDataPromise = null;
    throw error;
  });

  return cachedSiteDataPromise;
}

function preloadCriticalResources() {
  ['assets/logo.png'].forEach((src) => {
    const img = new Image();
    img.src = resolveMediaPath(src);
  });
}

function optimizeImages() {
  document.querySelectorAll('img').forEach((img) => {
    if (!img.hasAttribute('loading')) img.setAttribute('loading', 'lazy');
    if (!img.hasAttribute('decoding')) img.setAttribute('decoding', 'async');
  });
}

function initLazyLoading() {
  const images = document.querySelectorAll('img[data-src]');
  if (!images.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const img = entry.target;
      img.src = img.dataset.src;
      img.removeAttribute('data-src');
      observer.unobserve(img);
    });
  }, { rootMargin: '80px 0px', threshold: 0.01 });

  images.forEach((img) => observer.observe(img));
}

function initScrollOptimization() {
  let ticking = false;
  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
    });
  }, { passive: true });
}

function initHeader() {
  const header = document.querySelector('.header');
  const menuToggle = document.querySelector('.menu-toggle');
  const nav = document.querySelector('.nav');
  if (!header) return;

  window.addEventListener('scroll', () => {
    header.classList.toggle('scrolled', window.scrollY > 20);
  }, { passive: true });

  if (menuToggle && nav) {
    menuToggle.addEventListener('click', () => nav.classList.toggle('open'));
  }

  const currentPath = window.location.pathname;
  document.querySelectorAll('.nav-link').forEach((link) => {
    const href = link.getAttribute('href');
    if (!href) return;
    if (currentPath.endsWith(href) || (currentPath.endsWith('/') && href === 'index.html')) {
      link.classList.add('active');
    }
  });
}

function initAnimations() {
  const elements = document.querySelectorAll('.fade-in-up, .reveal');
  if (!elements.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.05, rootMargin: '0px 0px -20px 0px' });

  elements.forEach((element, index) => {
    // Only apply staggered delay if not already set
    if (!element.classList.contains('full-section') && !element.style.transitionDelay) {
      element.style.transitionDelay = `${(index % 8) * 0.1}s`;
    }
    observer.observe(element);
  });
}

function showToast(message, type) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.className = `toast ${type || 'success'}`;
  toast.textContent = message;
  toast.classList.add('show');
  window.setTimeout(() => toast.classList.remove('show'), 3500);
}

function renderDiferenciais(container) {
  const diferenciais = [
    { icon: 'fas fa-swimmer', label: 'Piscina Adulto e Infantil' },
    { icon: 'fas fa-dumbbell', label: 'Academia Equipada' },
    { icon: 'fas fa-basketball-ball', label: 'Quadra Poliesportiva' },
    { icon: 'fas fa-child', label: 'Brinquedoteca' },
    { icon: 'fas fa-birthday-cake', label: 'Salao de Festas' },
    { icon: 'fas fa-gamepad', label: 'Salao de Jogos' },
    { icon: 'fas fa-utensils', label: 'Espaco Gourmet' },
    { icon: 'fas fa-shield-alt', label: 'Seguranca 24h' },
  ];

  if (!container) return;
  container.innerHTML = diferenciais.map((item) => `
    <div class="dif-card fade-in-up">
      <div class="dif-icon">
        <i class="${item.icon}"></i>
      </div>
      <h4>${item.label}</h4>
    </div>
  `).join('');
}

function verImovel(id) {
  const base = window.location.pathname.includes('/pages/') ? '' : 'pages/';
  window.location.href = `${base}imovel-detalhe.html?id=${id}`;
}

function criarCardImovel(imovel) {
  const isTerreno = String(imovel.tipo).toLowerCase() === 'terreno';
  const specLabel = isTerreno ? 'Loteamento' : `${sanitizeString(String(imovel.quartos || 0))} Quartos`;
  const metragemLabel = isTerreno ? `Lotes de ${sanitizeString(imovel.metragem || '-')} m2` : `A partir de ${sanitizeString(imovel.metragem || '-')} m2`;

  return `
    <div class="imovel-card fade-in-up" onclick="verImovel(${imovel.id})">
      <div class="imovel-card-img">
        <img src="${resolveMediaPath(imovel.imagem)}" alt="${sanitizeString(imovel.nome)}" loading="lazy">
        <span class="imovel-badge">${sanitizeString(imovel.tag || '')}</span>
      </div>
      <div class="imovel-card-body">
        <p class="imovel-cidade">${sanitizeString(imovel.cidade || '')}</p>
        <h3 class="imovel-nome">${sanitizeString(imovel.nome || '')}</h3>
        <div class="imovel-specs">
          <span class="spec">${specLabel}</span>
          <span class="spec">${metragemLabel}</span>
        </div>
        <div class="imovel-card-footer">
          <span class="imovel-bairro">${sanitizeString(imovel.bairro || '')}</span>
          <span class="btn btn-primary" style="padding: 8px 16px; font-size: 13px;">Ver mais</span>
        </div>
      </div>
    </div>
  `;
}

function renderImoveisDestaque(imoveis, container) {
  if (!container) return;
  const destaques = (imoveis || []).filter((item) => item.destaque).slice(0, 3);
  container.innerHTML = destaques.length
    ? destaques.map((item) => criarCardImovel(item)).join('')
    : '<div style="grid-column: 1/-1; text-align: center; padding: 48px; color: var(--cinza-texto);">Nenhum imovel em destaque cadastrado.</div>';
}

function renderHomeAbout(about) {
  if (!about) return;
  const titleEl = document.getElementById('home-about-title');
  const summaryEl = document.getElementById('home-about-summary');
  const summaryEl2 = document.getElementById('home-about-summary-2');
  const mosaic = document.getElementById('home-about-mosaic');

  if (titleEl) titleEl.textContent = about.aboutTitle || titleEl.textContent;
  if (summaryEl) summaryEl.textContent = about.aboutSummary || summaryEl.textContent;
  if (summaryEl2) summaryEl2.textContent = about.aboutMissionText || summaryEl2.textContent;

  if (mosaic && Array.isArray(about.missionGallery) && about.missionGallery.length) {
    mosaic.innerHTML = about.missionGallery.slice(0, 4).map((item, index) => `
      <div class="mission-mosaic-item">
        <img src="${resolveMediaPath(item)}" alt="Galeria missao ${index + 1}">
      </div>
    `).join('');
  }
}

function renderCarousel(container, items) {
  if (!container) return;
  const carouselItems = items || [];

  if (!carouselItems.length) {
    container.innerHTML = '<div class="carousel-empty" style="color: var(--cinza-texto); padding: 28px;">Nenhum destaque publicitario disponivel.</div>';
    renderCarouselIndicators([]);
    return;
  }

  container.innerHTML = carouselItems.map((item) => `
    <article class="carousel-slide">
      <picture class="carousel-picture">
        ${item.imageMobile ? `<source media="(max-width: 768px)" srcset="${resolveMediaPath(item.imageMobile)}">` : ''}
        <img src="${resolveMediaPath(item.imageDesktop || item.image)}" alt="${sanitizeString(item.title || '')}" class="carousel-slide-img">
      </picture>
      ${item.link ? `<a href="${sanitizeString(item.link)}" class="carousel-slide-link" aria-label="Abrir slide"></a>` : ''}
    </article>
  `).join('');

  renderCarouselIndicators(carouselItems);
}

function renderCarouselIndicators(items) {
  const indicators = document.getElementById('carousel-indicators');
  if (!indicators) return;
  indicators.innerHTML = (items || []).map((_, index) => `
    <button type="button" class="carousel-indicator${index === 0 ? ' active' : ''}" data-index="${index}" aria-label="Ir para slide ${index + 1}"></button>
  `).join('');

  indicators.querySelectorAll('.carousel-indicator').forEach((button) => {
    button.addEventListener('click', () => {
      scrollCarouselToIndex(Number(button.dataset.index));
    });
  });
}

function setActiveCarouselIndicator(index) {
  document.querySelectorAll('.carousel-indicator').forEach((button, buttonIndex) => {
    button.classList.toggle('active', buttonIndex === index);
  });
}

function getActiveCarouselIndex(track) {
  const slides = Array.from(track.querySelectorAll('.carousel-slide'));
  if (!slides.length) return 0;

  const trackCenter = track.scrollLeft + (track.clientWidth / 2);
  let closestIndex = 0;
  let smallestDistance = Number.POSITIVE_INFINITY;

  slides.forEach((slide, index) => {
    const slideCenter = slide.offsetLeft + (slide.offsetWidth / 2);
    const distance = Math.abs(trackCenter - slideCenter);
    if (distance < smallestDistance) {
      smallestDistance = distance;
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
  let scrolling = false;

  const updateIndicator = () => {
    setActiveCarouselIndicator(getActiveCarouselIndex(track));
  };

  const goToNextSlide = () => {
    if (scrolling) return;
    const slides = Array.from(track.querySelectorAll('.carousel-slide'));
    if (!slides.length) return;

    const slideWidth = slides[0].offsetWidth;
    const next = track.scrollLeft + slideWidth + 22;
    const max = track.scrollWidth - track.clientWidth;

    scrolling = true;
    track.scrollTo({
      left: next >= max - 5 ? 0 : next,
      behavior: 'smooth',
    });

    window.setTimeout(() => {
      scrolling = false;
    }, 500);
  };

  track.addEventListener('mouseenter', () => { paused = true; });
  track.addEventListener('mouseleave', () => { paused = false; });
  track.addEventListener('scroll', () => requestAnimationFrame(updateIndicator), { passive: true });

  window.setInterval(() => {
    if (!paused && !scrolling) {
      goToNextSlide();
    }
  }, 5000);
}

function getWhatsAppOptionsFromData(data) {
  const options = Array.isArray(data?.whatsappOptions) ? data.whatsappOptions : [];
  const config = data?.config || {};

  if (options.length) {
    return options.map((item) => ({
      id: item.id,
      title: item.title || 'Loteamento',
      description: item.description || 'Conversar no WhatsApp',
      whatsapp: String(item.whatsapp || '').replace(/\D/g, ''),
    })).filter((item) => item.whatsapp);
  }

  if (config.whatsapp) {
    return [{
      id: 'default',
      title: 'Atendimento',
      description: 'Conversar com a equipe.',
      whatsapp: String(config.whatsapp).replace(/\D/g, ''),
    }];
  }

  return [];
}

async function renderWhatsAppOptions() {
  const body = document.getElementById('whatsapp-modal-body');
  if (!body) return;

  body.innerHTML = '<div class="whatsapp-modal-placeholder">Carregando opcoes...</div>';

  try {
    const data = await loadData();
    const options = getWhatsAppOptionsFromData(data);

    if (!options.length) {
      body.innerHTML = '<div class="whatsapp-modal-placeholder">Nenhuma opcao de WhatsApp cadastrada.</div>';
      return;
    }

    body.innerHTML = options.map((option) => `
      <button type="button" class="whatsapp-option" data-whatsapp-id="${sanitizeString(String(option.id))}">
        <div class="whatsapp-option-icon"><i class="fas fa-map-pin"></i></div>
        <div class="whatsapp-option-text">
          <strong>${sanitizeString(option.title)}</strong>
          <p>${sanitizeString(option.description)}</p>
        </div>
      </button>
    `).join('');
  } catch (error) {
    console.error(error);
    body.innerHTML = '<div class="whatsapp-modal-placeholder">Nao foi possivel carregar as opcoes agora.</div>';
  }
}

function closeWhatsAppModal() {
  document.getElementById('whatsapp-modal-overlay')?.classList.remove('open');
}

async function openWhatsAppModal() {
  await renderWhatsAppOptions();
  document.getElementById('whatsapp-modal-overlay')?.classList.add('open');
}

async function redirectWhatsApp(optionId) {
  const data = await loadData();
  const options = getWhatsAppOptionsFromData(data);
  const option = options.find((item) => String(item.id) === String(optionId)) || options[0];
  if (!option?.whatsapp) return;

  closeWhatsAppModal();
  const message = encodeURIComponent(`Ola! Tenho interesse no loteamento ${option.title}.`);
  window.open(`https://wa.me/${option.whatsapp}?text=${message}`, '_blank');
}

function initWhatsApp() {
  document.querySelectorAll('.js-whatsapp').forEach((element) => {
    element.addEventListener('click', (event) => {
      event.preventDefault();
      openWhatsAppModal();
    });
  });

  document.getElementById('whatsapp-modal-close')?.addEventListener('click', closeWhatsAppModal);
  document.getElementById('whatsapp-modal-body')?.addEventListener('click', (event) => {
    const option = event.target.closest('[data-whatsapp-id]');
    if (!option) return;
    redirectWhatsApp(option.dataset.whatsappId);
  });

  document.addEventListener('click', (event) => {
    const overlay = document.getElementById('whatsapp-modal-overlay');
    if (overlay && event.target === overlay) {
      closeWhatsAppModal();
    }
  });
}

async function simulateEmailSend(data) {
  const response = await fetch('https://formspree.io/f/mzdybvyd', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(`Falha no envio: ${response.status}`);
  }
}

function initForms() {
  document.querySelectorAll('.js-contact-form').forEach((form) => {
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const button = form.querySelector('button[type="submit"]');
      const originalText = button?.textContent || '';

      if (button) {
        button.textContent = 'Enviando...';
        button.disabled = true;
      }

      try {
        await simulateEmailSend(Object.fromEntries(new FormData(form)));
        form.reset();
        showToast('Mensagem enviada com sucesso.', 'success');
      } catch (error) {
        console.error(error);
        showToast('Nao foi possivel enviar a mensagem.', 'error');
      } finally {
        if (button) {
          button.textContent = originalText;
          button.disabled = false;
        }
      }
    });
  });
}

function applyDynamicConfig(config) {
  if (!config) return;

  document.querySelectorAll('.js-telefone').forEach((element) => {
    element.textContent = config.telefone || element.textContent;
    if (element.tagName === 'A' && config.telefone) {
      element.setAttribute('href', `tel:${String(config.telefone).replace(/\D/g, '')}`);
    }
  });

  document.querySelectorAll('.js-email').forEach((element) => {
    element.textContent = config.email || element.textContent;
    if (element.tagName === 'A' && config.email) {
      element.setAttribute('href', `mailto:${config.email}`);
    }
  });

  document.querySelectorAll('.js-endereco').forEach((element) => {
    element.textContent = config.endereco || element.textContent;
  });

  const heroTitle = document.querySelector('.hero-title');
  if (heroTitle && config.heroChamada) {
    heroTitle.innerHTML = sanitizeHtml(config.heroChamada.replace(/\n/g, '<br>'));
  }

  const heroSubtitle = document.querySelector('.hero-sub');
  if (heroSubtitle && config.heroSubtitulo) {
    heroSubtitle.textContent = config.heroSubtitulo;
  }

  const mapFrame = document.querySelector('.map-embed iframe');
  if (mapFrame && config.googleMapsEmbed) {
    mapFrame.src = config.googleMapsEmbed;
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  preloadCriticalResources();
  optimizeImages();
  initScrollOptimization();
  initLazyLoading();
  initHeader();
  initWhatsApp();
  initForms();

  try {
    const data = await loadData();
    applyDynamicConfig(data.config || {});

    renderImoveisDestaque(data.imoveis || [], document.getElementById('vitrine-imoveis'));
    renderCarousel(document.getElementById('carousel-track'), data.carousel || []);
    renderDiferenciais(document.getElementById('dif-grid'));
    renderHomeAbout(data.about || {});
    initCarouselAutoScroll();
    
    // Inicializa animações após o conteúdo dinâmico ser renderizado
    window.requestAnimationFrame(() => initAnimations());
  } catch (error) {
    console.error('[main] Falha ao carregar dados do Supabase', error);
    const homeGrid = document.getElementById('vitrine-imoveis');
    if (homeGrid) {
      homeGrid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 48px; color: var(--cinza-texto);">Nao foi possivel carregar os imoveis agora.</div>';
    }
    // Tenta inicializar mesmo em caso de erro para animar o que estiver estático
    initAnimations();
  }
});
