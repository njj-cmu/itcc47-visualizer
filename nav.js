/* Shared responsive navigation for every static entry page. */
(function () {
  const nav = document.querySelector('.topbar-nav');
  if (!nav) return;
  nav.id = nav.id || 'primary-navigation';
  nav.querySelectorAll('a.active').forEach((link) => link.setAttribute('aria-current', 'page'));

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'nav-toggle';
  button.setAttribute('aria-controls', nav.id);
  button.setAttribute('aria-expanded', 'false');
  button.innerHTML = '<span aria-hidden="true">☰</span><span class="nav-toggle-label">Menu</span>';
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
