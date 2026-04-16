document.addEventListener('DOMContentLoaded', async () => {
  try {
    const data = await loadData();
    const allImoveis = [...(data.imoveis || [])];
    let visibleImoveis = [...allImoveis];
    let currentFilter = 'todos';
    let currentRegion = '';

    const selectRegion = document.getElementById('filtro-regiao');
    const orderSelect = document.getElementById('ordenar');
    const countEl = document.getElementById('count-imoveis');
    const grid = document.getElementById('lista-imoveis');
    const emptyState = document.getElementById('empty-state');

    const regions = [...new Set(allImoveis.map((item) => item.bairro).filter(Boolean))].sort((a, b) => a.localeCompare(b));
    regions.forEach((region) => {
      const option = document.createElement('option');
      option.value = region;
      option.textContent = region;
      selectRegion.appendChild(option);
    });

    function normalizeValue(value) {
      return String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
    }

    function renderList() {
      const order = orderSelect.value;

      visibleImoveis.sort((left, right) => {
        if (order === 'nome') return String(left.nome || '').localeCompare(String(right.nome || ''));
        if (order === 'quartos') return Number(left.quartos || 0) - Number(right.quartos || 0);
        if (order === 'metragem') return Number(String(left.metragem || '0').replace(',', '.')) - Number(String(right.metragem || '0').replace(',', '.'));
        return 0;
      });

      countEl.textContent = visibleImoveis.length;

      if (!visibleImoveis.length) {
        grid.style.display = 'none';
        emptyState.style.display = 'block';
        return;
      }

      grid.style.display = 'grid';
      emptyState.style.display = 'none';
      grid.innerHTML = visibleImoveis.map((imovel) => criarCardImovel(imovel)).join('');
      window.setTimeout(initAnimations, 50);
    }

    function applyFilters() {
      visibleImoveis = allImoveis.filter((imovel) => {
        let matchesMainFilter = true;

        if (currentFilter !== 'todos') {
          if (currentFilter === '2') {
            matchesMainFilter = Number(imovel.quartos) === 2;
          } else if (currentFilter === '3') {
            matchesMainFilter = Number(imovel.quartos) >= 3;
          } else {
            matchesMainFilter = normalizeValue(imovel.status) === normalizeValue(currentFilter);
          }
        }

        const matchesRegion = currentRegion ? imovel.bairro === currentRegion : true;
        return matchesMainFilter && matchesRegion;
      });

      renderList();
    }

    document.querySelectorAll('.filtro-btn').forEach((button) => {
      button.addEventListener('click', () => {
        document.querySelectorAll('.filtro-btn').forEach((item) => item.classList.remove('active'));
        button.classList.add('active');
        currentFilter = button.dataset.filtro;
        applyFilters();
      });
    });

    selectRegion.addEventListener('change', (event) => {
      currentRegion = event.target.value;
      applyFilters();
    });

    orderSelect.addEventListener('change', renderList);
    renderList();
  } catch (error) {
    console.error(error);
    const grid = document.getElementById('lista-imoveis');
    if (grid) {
      grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 80px; color: var(--cinza-texto);">Nao foi possivel carregar os imoveis.</div>';
    }
  }
});
