/**
 * JavaScript para a página Sobre
 * Carrega conteúdo dinâmico e renderiza o carrossel da missão.
 */

async function initSobrePage() {
  const data = await loadData();
  if (!data) return;

  const about = data.about || {};
  const title = about.aboutTitle || 'Quem somos';
  const subtitle = about.aboutSubtitle || 'A Celli Cruz conecta sua família ao melhor imóvel.';
  const description = about.aboutDescription || 'A Celli Cruz Assessoria Imobiliária atua em Feira de Santana com foco em transparência, atendimento personalizado e soluções completas para compra e venda de imóveis.';
  const missionTitle = about.aboutMissionTitle || 'Nossa missão';
  const missionText = about.aboutMissionText || 'Promover oportunidades de moradia com segurança, qualidade e compromisso com o cliente.';

  document.getElementById('sobre-hero-title').textContent = title;
  document.getElementById('sobre-hero-subtitle').textContent = subtitle;
  document.getElementById('sobre-title').textContent = title;
  document.getElementById('sobre-subtitle').textContent = subtitle;
  document.getElementById('sobre-description').innerHTML = formatTextToHtml(description);
  document.getElementById('mission-title').textContent = missionTitle;
  document.getElementById('mission-text').textContent = missionText;

  const missionItems = (about.missionCarousel && about.missionCarousel.length > 0)
    ? about.missionCarousel
    : data.carousel || [];

  renderMissionCarousel(missionItems);
  initMissionCarouselAutoScroll();
}

function renderMissionCarousel(items) {
  const track = document.getElementById('mission-carousel-track');
  const indicators = document.getElementById('mission-carousel-indicators');
  if (!track || !indicators) return;

  if (!items || items.length === 0) {
    track.innerHTML = '<div class="carousel-empty" style="color: var(--cinza-texto); padding: 28px;">Nenhuma imagem disponível para a missão.</div>';
    indicators.innerHTML = '';
    return;
  }

  track.innerHTML = items.map(item => `
    <article class="carousel-slide">
      <picture class="carousel-picture">
        ${item.imageMobile ? `<source media="(max-width: 768px)" srcset="${resolveMediaPath(item.imageMobile)}">` : ''}
        <img src="${resolveMediaPath(item.imageDesktop || item.image)}" alt="${sanitizeString(item.title || item.subtitle || 'Missão')}" class="carousel-slide-img">
      </picture>
      ${item.title ? `<div class="carousel-slide-copy"><h3>${sanitizeString(item.title)}</h3><p>${sanitizeString(item.subtitle || '')}</p></div>` : ''}
    </article>
  `).join('');

  indicators.innerHTML = items.map((item, index) => `
    <button type="button" class="carousel-indicator${index === 0 ? ' active' : ''}" data-index="${index}" aria-label="Ir para slide ${index + 1}"></button>
  `).join('');

  indicators.querySelectorAll('.carousel-indicator').forEach(button => {
    button.addEventListener('click', () => {
      const index = Number(button.dataset.index);
      scrollMissionCarouselToIndex(index);
    });
  });
}

function formatTextToHtml(text) {
  if (!text) return '';
  return sanitizeHtml(text.trim()
    .split(/\n{2,}/g)
    .map(paragraph => `<p>${sanitizeHtml(paragraph.trim()).replace(/\n/g, '<br>')}</p>`)
    .join(''));
}

function getActiveMissionCarouselIndex(track) {
  const slides = Array.from(track.querySelectorAll('.carousel-slide'));
  if (!slides.length) return 0;

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

function setActiveMissionCarouselIndicator(index) {
  document.querySelectorAll('#mission-carousel-indicators .carousel-indicator').forEach((button, idx) => {
    button.classList.toggle('active', idx === index);
  });
}

function scrollMissionCarouselToIndex(index) {
  const track = document.getElementById('mission-carousel-track');
  if (!track) return;
  const slide = track.querySelectorAll('.carousel-slide')[index];
  if (!slide) return;
  track.scrollTo({ left: slide.offsetLeft, behavior: 'smooth' });
}

function initMissionCarouselAutoScroll() {
  const track = document.getElementById('mission-carousel-track');
  if (!track || track.children.length <= 1) return;

  let paused = false;
  let isScrolling = false;
  const slideGap = 22;
  const intervalMs = 5000;

  const updateIndicator = () => {
    const activeIndex = getActiveMissionCarouselIndex(track);
    setActiveMissionCarouselIndicator(activeIndex);
  };

  const scrollToNextSlide = () => {
    if (isScrolling) return;

    const slides = Array.from(track.querySelectorAll('.carousel-slide'));
    if (slides.length === 0) return;

    const slideWidth = slides[0].offsetWidth;
    const maxScroll = track.scrollWidth - track.clientWidth;
    const currentScroll = track.scrollLeft;
    let nextScroll = currentScroll + slideWidth + slideGap;

    if (nextScroll >= maxScroll - 5) {
      nextScroll = 0;
    }

    isScrolling = true;
    track.scrollTo({ left: nextScroll, behavior: 'smooth' });
    setTimeout(() => { isScrolling = false; }, 500);
  };

  track.addEventListener('mouseenter', () => { paused = true; });
  track.addEventListener('mouseleave', () => { paused = false; });
  track.addEventListener('scroll', () => { requestAnimationFrame(updateIndicator); }, { passive: true });

  setInterval(() => {
    if (!paused && !isScrolling) {
      scrollToNextSlide();
    }
  }, intervalMs);
}

window.addEventListener('DOMContentLoaded', initSobrePage);
