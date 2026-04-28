document.addEventListener('DOMContentLoaded', async () => {
  try {
    const params = new URLSearchParams(window.location.search);
    const id = Number(params.get('id'));
    const data = await loadData();
    const imovel = (data.imoveis || []).find((item) => Number(item.id) === id);

    if (!imovel) {
      document.title = 'Imovel nao encontrado | Celli Cruz';
      document.getElementById('descricao').textContent = 'Este imovel nao foi encontrado.';
      return;
    }

    document.title = `${imovel.nome} | Celli Cruz`;
    document.getElementById('hero-img').src = resolveMediaPath(imovel.imagem);
    document.getElementById('hero-img').alt = imovel.nome || '';
    document.getElementById('hero-nome').textContent = imovel.nome || '';
    document.getElementById('hero-badge').textContent = imovel.tag || '';
    document.querySelector('#hero-local span').textContent = `${imovel.bairro || ''}, ${imovel.cidade || ''}`;
    document.getElementById('breadcrumb-nome').textContent = imovel.nome || '';
    document.getElementById('descricao').textContent = imovel.descricao || '';

    document.getElementById('sidebar-nome').textContent = imovel.nome || '';
    document.getElementById('sidebar-cidade').textContent = imovel.cidade || '';
    const isTerreno = String(imovel.tipo).toLowerCase() === 'terreno';
    const specQuartosEl = document.getElementById('spec-quartos');
    if (specQuartosEl) {
        if (isTerreno) {
            // Se for terreno, podemos esconder ou mudar o icone/texto
            specQuartosEl.parentElement.style.display = 'none'; 
        } else {
            specQuartosEl.parentElement.style.display = 'block';
            specQuartosEl.textContent = imovel.quartos || '-';
        }
    }
    
    const specMetroEl = document.getElementById('spec-metro');
    if (specMetroEl) {
        specMetroEl.textContent = imovel.metragem || '-';
        const label = specMetroEl.nextElementSibling;
        if (label) label.textContent = isTerreno ? 'm² total' : 'm² mínimo';
    }
    document.getElementById('form-imovel-nome').value = imovel.nome || '';

    const gallery = (imovel.imagemGaleria && imovel.imagemGaleria.length ? imovel.imagemGaleria : [imovel.imagem]).filter(Boolean);
    document.getElementById('galeria-grid').innerHTML = gallery.map((image) => {
      const resolved = resolveMediaPath(image);
      return `<img src="${resolved}" alt="${sanitizeString(imovel.nome || '')}" loading="lazy" onclick="window.open('${resolved}', '_blank')">`;
    }).join('');

    const iconsMap = {
      piscina: 'fa-water',
      academia: 'fa-dumbbell',
      quadra: 'fa-futbol',
      playground: 'fa-child',
      festa: 'fa-champagne-glasses',
      jogos: 'fa-dice',
      gourmet: 'fa-utensils',
      seguranca: 'fa-shield',
      verde: 'fa-leaf',
      garagem: 'fa-car',
      lazer: 'fa-sun',
      fechado: 'fa-lock',
    };

    const diferenciais = (imovel.diferenciais || []).map((item) => {
      let icon = 'fa-check';
      Object.keys(iconsMap).some((key) => {
        if (String(item).toLowerCase().includes(key)) {
          icon = iconsMap[key];
          return true;
        }
        return false;
      });
      return `<div class="diferencial-item"><i class="fas ${icon}"></i> ${sanitizeString(item)}</div>`;
    });
    document.getElementById('dif-lista').innerHTML = diferenciais.join('');

    if (imovel.comodos && imovel.comodos.length) {
      document.getElementById('comodos-section').style.display = 'block';
      document.getElementById('comodos-container').innerHTML = imovel.comodos.map((comodo) => `
        <div style="margin-bottom: 32px;">
          <h4 style="color: var(--azul-escuro); margin-bottom: 12px; font-size: 16px;">${sanitizeString(comodo.nome || '')}</h4>
          <div class="galeria-grid">
            ${(comodo.fotos || []).map((foto) => {
              const resolved = resolveMediaPath(foto);
              return `<img src="${resolved}" alt="${sanitizeString(comodo.nome || '')}" loading="lazy" onclick="window.open('${resolved}', '_blank')">`;
            }).join('')}
          </div>
        </div>
      `).join('');
    }

    const plantas = imovel.plantas || [];
    const tabsEl = document.getElementById('plantas-tabs');
    const infoEl = document.getElementById('planta-info');

    if (plantas.length) {
      tabsEl.innerHTML = plantas.map((planta, index) => `
        <button class="planta-tab ${index === 0 ? 'active' : ''}" data-index="${index}">${sanitizeString(planta.nome || `Planta ${index + 1}`)}</button>
      `).join('');

      function showPlanta(index) {
        tabsEl.querySelectorAll('.planta-tab').forEach((tab, tabIndex) => {
          tab.classList.toggle('active', tabIndex === index);
        });
        const planta = plantas[index];
        infoEl.innerHTML = `
          <h4 style="color:var(--azul-escuro);margin-bottom:12px;">${sanitizeString(planta.nome || '')}</h4>
          <div style="display:flex;gap:24px;flex-wrap:wrap;">
            <div>
              <span style="font-size:12px;color:var(--cinza-texto);display:block;">Descricao</span>
              <strong style="font-size:18px;color:var(--azul-escuro)">${sanitizeString(planta.descricao || '')}</strong>
            </div>
            ${planta.unidades ? `<div><span style="font-size:12px;color:var(--cinza-texto);display:block;">Unidades</span><strong style="font-size:18px;color:var(--azul-escuro)">${sanitizeString(String(planta.unidades))}</strong></div>` : ''}
          </div>
        `;
      }

      tabsEl.addEventListener('click', (event) => {
        const tab = event.target.closest('.planta-tab');
        if (!tab) return;
        showPlanta(Number(tab.dataset.index));
      });

      showPlanta(0);
    } else {
      document.getElementById('plantas-section').style.display = 'none';
    }

    document.getElementById('localizacao-texto').textContent = imovel.localizacao || '';
    document.getElementById('maps-link').href = imovel.mapsLink || '#';
    document.getElementById('mapa-frame').src = imovel.localizacao
      ? `https://maps.google.com/maps?q=${encodeURIComponent(imovel.localizacao)}&output=embed&z=15`
      : '';

    const outros = (data.imoveis || []).filter((item) => Number(item.id) !== id).slice(0, 3);
    document.getElementById('outros-imoveis').innerHTML = outros.map((item) => criarCardImovel(item)).join('');
    window.setTimeout(initAnimations, 80);
  } catch (error) {
    console.error(error);
  }
});
