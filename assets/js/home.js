(() => {
  const root = document.documentElement;
  const themeToggle = document.querySelector('[data-theme-toggle]');
  const storedTheme = localStorage.getItem('dz-theme');

  if (storedTheme === 'light') root.dataset.theme = 'light';

  const syncThemeIcon = () => {
    if (!themeToggle) return;
    const isLight = root.dataset.theme === 'light';
    themeToggle.querySelector('.material-symbols-rounded').textContent = isLight ? 'light_mode' : 'dark_mode';
    themeToggle.setAttribute('aria-label', isLight ? 'Включить тёмную тему' : 'Включить светлую тему');
  };

  themeToggle?.addEventListener('click', () => {
    root.dataset.theme = root.dataset.theme === 'light' ? 'dark' : 'light';
    localStorage.setItem('dz-theme', root.dataset.theme);
    syncThemeIcon();
  });
  syncThemeIcon();

  const cards = [...document.querySelectorAll('[data-catalog-grid] .home-app-card')];
  const filters = [...document.querySelectorAll('[data-filter]')];
  const search = document.querySelector('[data-catalog-search]');
  const empty = document.querySelector('[data-catalog-empty]');
  let activeFilter = 'all';

  const applyCatalogFilter = () => {
    const query = search?.value.trim().toLocaleLowerCase('ru') || '';
    let visible = 0;
    cards.forEach((card) => {
      const platformMatches = activeFilter === 'all' || card.dataset.platform === activeFilter;
      const textMatches = !query || (card.dataset.name || '').toLocaleLowerCase('ru').includes(query);
      const show = platformMatches && textMatches;
      card.hidden = !show;
      if (show) visible += 1;
    });
    if (empty) empty.hidden = visible !== 0;
  };

  filters.forEach((button) => {
    button.addEventListener('click', () => {
      activeFilter = button.dataset.filter || 'all';
      filters.forEach((item) => {
        const selected = item === button;
        item.classList.toggle('is-active', selected);
        item.setAttribute('aria-pressed', String(selected));
      });
      applyCatalogFilter();
    });
  });

  search?.addEventListener('input', applyCatalogFilter);

  document.querySelectorAll('[data-header-filter]').forEach((link) => {
    link.addEventListener('click', () => {
      const target = filters.find((item) => item.dataset.filter === link.dataset.headerFilter);
      target?.click();
    });
  });
})();
