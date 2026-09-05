(() => {
  const root = document.documentElement;
  const themeToggle = document.querySelector('[data-theme-toggle]');
  let storedTheme;
  try { storedTheme = localStorage.getItem('dz-theme'); } catch {}

  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const images = [...document.querySelectorAll('.app-page .showcase img')];
  if (images.length && typeof HTMLDialogElement !== 'undefined') {
    const gallery = document.createElement('dialog');
    gallery.className = 'image-gallery';
    gallery.setAttribute('aria-label', 'Скриншоты приложения');
    gallery.innerHTML = `<div class="gallery-toolbar"><span class="gallery-count" aria-live="polite"></span><button type="button" class="gallery-close" autofocus aria-label="Закрыть галерею">Закрыть ×</button></div><img class="gallery-image" alt=""><div class="gallery-controls"><button type="button" class="gallery-prev" aria-label="Предыдущий скриншот">←</button><p class="gallery-caption"></p><button type="button" class="gallery-next" aria-label="Следующий скриншот">→</button></div><a class="gallery-original" target="_blank" rel="noopener">Оригинал в новой вкладке ↗</a>`;
    document.body.append(gallery);
    const preview = gallery.querySelector('.gallery-image');
    let current = 0;
    let opener;
    const showImage = (index) => {
      current = (index + images.length) % images.length;
      preview.src = images[current].src;
      preview.alt = images[current].alt;
      gallery.querySelector('.gallery-caption').textContent = preview.alt;
      gallery.querySelector('.gallery-count').textContent = `${current + 1} / ${images.length}`;
      gallery.querySelector('.gallery-original').href = preview.src;
    };
    images.forEach((image, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'showcase-open';
      button.setAttribute('aria-label', `${image.alt} — увеличить`);
      button.setAttribute('aria-haspopup', 'dialog');
      image.replaceWith(button);
      button.append(image);
      button.addEventListener('click', () => {
        opener = button;
        showImage(index);
        gallery.showModal();
        root.classList.add('gallery-is-open');
      });
    });
    gallery.querySelector('.gallery-close').addEventListener('click', () => gallery.close());
    gallery.querySelector('.gallery-prev').addEventListener('click', () => showImage(current - 1));
    gallery.querySelector('.gallery-next').addEventListener('click', () => showImage(current + 1));
    gallery.querySelectorAll('.gallery-prev, .gallery-next').forEach((button) => { button.disabled = images.length < 2; });
    gallery.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        showImage(current + (event.key === 'ArrowRight' ? 1 : -1));
      }
    });
    gallery.addEventListener('click', (event) => {
      const bounds = gallery.getBoundingClientRect();
      if (event.target === gallery && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)) gallery.close();
    });
    gallery.addEventListener('close', () => {
      root.classList.remove('gallery-is-open');
      opener?.focus({ preventScroll: true });
    });
    let touchStart;
    preview.addEventListener('touchstart', (event) => {
      touchStart = event.touches.length === 1 ? { x: event.touches[0].clientX, y: event.touches[0].clientY } : null;
    }, { passive: true });
    preview.addEventListener('touchend', (event) => {
      if (!touchStart) return;
      const dx = event.changedTouches[0].clientX - touchStart.x;
      const dy = event.changedTouches[0].clientY - touchStart.y;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) showImage(current + (dx < 0 ? 1 : -1));
      touchStart = null;
    }, { passive: true });
    preview.addEventListener('touchcancel', () => { touchStart = null; });
  }

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(({ target, isIntersecting }) => {
        if (!isIntersecting) return;
        if (!reducedMotion.matches && target.animate) target.animate([
          { opacity: 0.5, transform: 'translateY(16px)' },
          { opacity: 1, transform: 'translateY(0)' }
        ], { duration: 450, easing: 'cubic-bezier(.2,.7,.2,1)' });
        observer.unobserve(target);
      });
    }, { threshold: 0.08 });
    document.querySelectorAll('.feature-grid section, .showcase, .home-app-card, .document-links').forEach((element) => observer.observe(element));
  }

  document.querySelectorAll('.home-app-card, .feature-grid section').forEach((card) => {
    card.classList.add('spotlight-card');
    card.addEventListener('pointermove', (event) => {
      if (event.pointerType !== 'mouse' || reducedMotion.matches) return;
      const bounds = card.getBoundingClientRect();
      card.style.setProperty('--pointer-x', `${event.clientX - bounds.left}px`);
      card.style.setProperty('--pointer-y', `${event.clientY - bounds.top}px`);
    });
  });

  const backTop = document.createElement('button');
  backTop.type = 'button';
  backTop.className = 'back-to-top';
  backTop.setAttribute('aria-label', 'Вернуться к началу страницы');
  backTop.innerHTML = '<span aria-hidden="true">↑</span>';
  backTop.hidden = true;
  document.body.append(backTop);
  let scrollFrame = false;
  const updateProgress = () => {
    const distance = root.scrollHeight - innerHeight;
    backTop.style.setProperty('--reading-progress', `${distance > 0 ? Math.min(100, Math.max(0, scrollY / distance * 100)) : 0}%`);
    backTop.hidden = scrollY < 500;
    scrollFrame = false;
  };
  const scheduleProgress = () => {
    if (!scrollFrame) { scrollFrame = true; requestAnimationFrame(updateProgress); }
  };
  addEventListener('scroll', scheduleProgress, { passive: true });
  addEventListener('resize', scheduleProgress);
  addEventListener('load', scheduleProgress);
  updateProgress();
  backTop.addEventListener('click', () => {
    const content = document.querySelector('main');
    if (content) {
      content.setAttribute('tabindex', '-1');
      content.focus({ preventScroll: true });
      content.addEventListener('blur', () => content.removeAttribute('tabindex'), { once: true });
    }
    scrollTo({ top: 0, behavior: reducedMotion.matches ? 'instant' : 'smooth' });
  });

  if (storedTheme === 'light') root.dataset.theme = 'light';

  const syncThemeIcon = () => {
    if (!themeToggle) return;
    const isLight = root.dataset.theme === 'light';
    themeToggle.querySelector('.material-symbols-rounded').textContent = isLight ? 'light_mode' : 'dark_mode';
    themeToggle.setAttribute('aria-label', isLight ? 'Включить тёмную тему' : 'Включить светлую тему');
  };

  themeToggle?.addEventListener('click', () => {
    root.dataset.theme = root.dataset.theme === 'light' ? 'dark' : 'light';
    try { localStorage.setItem('dz-theme', root.dataset.theme); } catch {}
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
