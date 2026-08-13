/* Shared icon system and responsive navigation for every static entry page. */
(function () {
  const icons = {
    start: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10.5V20h13v-9.5M9 20v-6h6v6"/>',
    visualize: '<path d="M4 19V9m5 10V5m5 14v-7m5 7V3"/><path d="M2 21h20"/>',
    writer: '<path d="M4 5h16M4 10h10M4 15h16M4 20h8"/>',
    tracer: '<path d="M8 4H4v4h4V4Zm12 12h-4v4h4v-4ZM6 8v4a4 4 0 0 0 4 4h6m0-10h-5m3-3 3 3-3 3"/>',
    problems: '<path d="M9 5h6M9 3h6v4H9z"/><path d="M7 5H5v16h14V5h-2M8 12h8m-8 4h6"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    play: '<path d="m8 5 11 7-11 7V5Z"/>',
    edit: '<path d="m4 20 4.5-1 10-10-3.5-3.5-10 10L4 20Z"/><path d="m13.5 6.5 3.5 3.5"/>',
    example: '<path d="M4 4h16v16H4zM8 8h8m-8 4h5m-5 4h7"/>',
    grammar: '<path d="M3 5.5A5.5 5.5 0 0 1 8.5 4H11v16H8.5A5.5 5.5 0 0 0 3 21V5.5Zm18 0A5.5 5.5 0 0 0 15.5 4H13v16h2.5a5.5 5.5 0 0 1 5.5 1V5.5Z"/>',
    modules: '<path d="M4 4h6v6H4zm10 0h6v6h-6zM4 14h6v6H4zm10 0h6v6h-6z"/>',
    problemsList: '<path d="M8 6h12M8 12h12M8 18h12"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/>',
    indent: '<path d="M3 6h8M3 10h8M3 14h8M3 18h8m11-10 4 4-4 4m-2-4h6"/>',
    outdent: '<path d="M13 6h8m-8 4h8m-8 4h8m-8 4h8M9 8l-4 4 4 4m-4-4h6"/>',
    arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
    back: '<path d="M19 12H5m5-5-5 5 5 5"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10h.01"/>',
    reset: '<path d="M4 4v6h6M5.5 15a7 7 0 1 0 .5-7"/>',
    grid: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>',
    code: '<path d="m8 9-3 3 3 3m8-3 3 3-3 3m-2-10-4 14"/>',
    terminal: '<path d="m4 7 4 4-4 4m7 0h7"/><rect x="2" y="3" width="20" height="18" rx="2"/>',
  };

  function svg(name) {
    const body = icons[name];
    return body ? `<svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${body}</svg>` : '';
  }
  window.BSITIcons = svg;
  window.ITCC47Icons = svg; // compatibility for the existing ITCC47 shells

  document.querySelectorAll('[data-icon]').forEach((element) => {
    if (element.querySelector('.ui-icon')) return;
    element.insertAdjacentHTML('afterbegin', svg(element.dataset.icon));
  });

  const nav = document.querySelector('.topbar-nav');
  if (!nav) return;
  const page = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  const requestedCourse = new URLSearchParams(location.search).get('course');
  const inferredCourse = requestedCourse === 'itcc45' || page.startsWith('itcc45-') || page === 'itcc45.html' ? 'itcc45' : 'itcc47';
  const courseId = typeof BSITLearningLab === 'undefined' ? inferredCourse : BSITLearningLab.resolveCourse(inferredCourse);
  document.body.dataset.course = courseId;

  if (typeof BSITLearningLab !== 'undefined') {
    const course = BSITLearningLab.getCourse(courseId);
    nav.innerHTML = course.nav.map((item) => `<a href="${item.href}" data-icon="${item.icon}">${item.label}</a>`).join('');
    if (page === 'visualizer.html' && courseId === 'itcc45') {
      const title = document.querySelector('.topbar-title');
      if (title) title.innerHTML = '<span class="topbar-code">ITCC45</span> Python Object Lab';
      document.title = 'ITCC45 Python Object Lab';
    }
    nav.querySelectorAll('[data-icon]').forEach((element) => element.insertAdjacentHTML('afterbegin', svg(element.dataset.icon)));
  }
  nav.id = nav.id || 'primary-navigation';
  nav.querySelectorAll('a').forEach((link) => {
    const href = (link.getAttribute('href') || '').split('?')[0].toLowerCase();
    const hrefParams = new URLSearchParams((link.getAttribute('href') || '').split('?')[1] || '');
    const active = href === page
      || (courseId === 'itcc47' && ['practice.html', 'problem-list.html'].includes(page) && href === 'problems.html')
      || (courseId === 'itcc45' && page === 'visualizer.html' && href === 'visualizer.html' && hrefParams.get('course') === 'itcc45');
    link.classList.toggle('active', active);
    if (active) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'nav-toggle';
  button.setAttribute('aria-controls', nav.id);
  button.setAttribute('aria-expanded', 'false');
  button.innerHTML = `${svg('menu')}<span class="nav-toggle-label">Menu</span>`;
  nav.parentNode.insertBefore(button, nav);

  function close(returnFocus) {
    nav.classList.remove('is-open');
    button.setAttribute('aria-expanded', 'false');
    if (returnFocus) button.focus();
  }

  button.addEventListener('click', () => {
    const open = !nav.classList.contains('is-open');
    nav.classList.toggle('is-open', open);
    button.setAttribute('aria-expanded', String(open));
    if (open) nav.querySelector('a')?.focus();
  });
  nav.addEventListener('click', (event) => { if (event.target.closest('a')) close(false); });
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && nav.classList.contains('is-open')) close(true); });
  window.addEventListener('resize', () => { if (window.innerWidth > 700) close(false); });
})();
