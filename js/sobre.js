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
  initCarouselAutoScroll(
    document.getElementById('mission-carousel-track'),
    document.getElementById('mission-carousel-indicators')
  );
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
  return text.trim()
    .split(/\n{2,}/g)
    .map(paragraph => `<p>${sanitizeString(paragraph.trim()).replace(/\n/g, '<br>')}</p>`)
    .join('');
}

function scrollMissionCarouselToIndex(index) {
  const track = document.getElementById('mission-carousel-track');
  if (!track) return;
  const slide = track.querySelectorAll('.carousel-slide')[index];
  if (!slide) return;
  track.scrollTo({ left: slide.offsetLeft, behavior: 'smooth' });
}

window.addEventListener('DOMContentLoaded', initSobrePage);
